import { computed, onUnmounted, reactive, ref, type ComputedRef, type Ref } from 'vue'

import type { SourceSettingsModelsCopy } from '../i18n'
import { fetchModelCandidates } from '../utils/modelCatalogApi'
import {
  cloneModel,
  getDefaultEndpoint,
  normalizeModels,
  type ModelEditorModel,
  type ModelProviderState,
  validateModels,
} from '../utils/modelSettings'

export interface ModelSettingsState {
  providers: ModelProviderState[]
  activeProvider: Ref<string>
  editingProvider: Ref<string>
  customSettingsProvider: Ref<string>
  savedProvider: Ref<string>
  fetchingProvider: Ref<string>
  pickerProvider: Ref<string>
  pickerCandidates: Ref<ModelEditorModel[]>
  pickerProviderState: ComputedRef<ModelProviderState | undefined>
  pickerExistingIds: ComputedRef<string[]>
  toggleEditor(provider: ModelProviderState): void
  deleteProvider(providerId: string): void
  toggleCustomSettings(providerId: string): void
  updateModels(provider: ModelProviderState, models: ModelEditorModel[]): void
  updateApiKey(provider: ModelProviderState, value: string): void
  updateEndpoint(provider: ModelProviderState, value: string): void
  addModel(provider: ModelProviderState): void
  saveProvider(provider: ModelProviderState): void
  cancelProvider(provider: ModelProviderState): void
  fetchModels(provider: ModelProviderState): Promise<void>
  restoreDefaultModels(provider: ModelProviderState): void
  addSelectedModels(models: ModelEditorModel[]): void
}

function createProviderState(provider: SourceSettingsModelsCopy['providers'][number]): ModelProviderState {
  const defaultModels = (provider.models ?? []).map(cloneModel)
  const endpoint = provider.endpoint ?? getDefaultEndpoint(provider.id)
  const apiKeyConfigured = provider.status === 'configured'
  return {
    id: provider.id,
    name: provider.name,
    description: provider.description,
    model: provider.model,
    initialStatus: provider.status,
    endpoint,
    apiKey: '',
    apiKeyConfigured,
    committedEndpoint: endpoint,
    committedModels: defaultModels.map(cloneModel),
    committedApiKeyConfigured: apiKeyConfigured,
    models: defaultModels.map(cloneModel),
    defaultModels,
    fetchError: '',
    validationError: '',
  }
}

export function useModelSettings(copy: Ref<SourceSettingsModelsCopy>): ModelSettingsState {
  const activeProvider = ref(copy.value.providers[0]?.id ?? '')
  const editingProvider = ref(copy.value.providers[0]?.id ?? '')
  const customSettingsProvider = ref(copy.value.providers[0]?.id ?? '')
  const savedProvider = ref('')
  const fetchingProvider = ref('')
  const pickerProvider = ref('')
  const pickerCandidates = ref<ModelEditorModel[]>([])
  const providers = reactive<ModelProviderState[]>(copy.value.providers.map(createProviderState))
  const pickerProviderState = computed<ModelProviderState | undefined>(() => (
    providers.find((provider) => provider.id === pickerProvider.value)
  ))
  const pickerExistingIds = computed<string[]>(() => (
    pickerProviderState.value?.models.map((model) => model.id) ?? []
  ))

  let fetchController: AbortController | null = null
  let fetchSequence = 0

  function resetDraft(provider: ModelProviderState): void {
    provider.endpoint = provider.committedEndpoint
    provider.models = provider.committedModels.map(cloneModel)
    provider.apiKey = ''
    provider.apiKeyConfigured = provider.committedApiKeyConfigured
    provider.fetchError = ''
    provider.validationError = ''
  }

  function toggleEditor(provider: ModelProviderState): void {
    if (editingProvider.value === provider.id) {
      editingProvider.value = ''
      savedProvider.value = ''
      return
    }

    if (editingProvider.value) {
      const previous = providers.find((item) => item.id === editingProvider.value)
      if (previous !== undefined) {
        resetDraft(previous)
      }
    }
    resetDraft(provider)
    activeProvider.value = provider.id
    editingProvider.value = provider.id
    customSettingsProvider.value = provider.id
    savedProvider.value = ''
  }

  function deleteProvider(providerId: string): void {
    const index = providers.findIndex((provider) => provider.id === providerId)
    if (index < 0) {
      return
    }
    providers.splice(index, 1)
    if (activeProvider.value === providerId) {
      activeProvider.value = providers[0]?.id ?? ''
    }
    if (editingProvider.value === providerId) {
      editingProvider.value = ''
    }
    if (customSettingsProvider.value === providerId) {
      customSettingsProvider.value = ''
    }
    if (pickerProvider.value === providerId) {
      pickerProvider.value = ''
    }
  }

  function toggleCustomSettings(providerId: string): void {
    customSettingsProvider.value = customSettingsProvider.value === providerId ? '' : providerId
  }

  function updateModels(provider: ModelProviderState, models: ModelEditorModel[]): void {
    provider.models = models
    provider.validationError = ''
  }

  function updateApiKey(provider: ModelProviderState, value: string): void {
    provider.apiKey = value
  }

  function updateEndpoint(provider: ModelProviderState, value: string): void {
    provider.endpoint = value
    provider.fetchError = ''
  }

  function restoreDefaultModels(provider: ModelProviderState): void {
    provider.models = provider.defaultModels.map(cloneModel)
    provider.validationError = ''
  }

  function addModel(provider: ModelProviderState): void {
    provider.models = [...provider.models, { id: '', name: '' }]
    provider.validationError = ''
  }

  function saveProvider(provider: ModelProviderState): void {
    const validationError = validateModels(provider.models, copy.value)
    if (validationError) {
      provider.validationError = validationError
      return
    }

    const models = normalizeModels(provider.models)
    provider.endpoint = provider.endpoint.trim()
    provider.models = models
    provider.committedEndpoint = provider.endpoint
    provider.committedModels = models.map(cloneModel)
    if (provider.apiKey.trim()) {
      provider.apiKeyConfigured = true
      provider.committedApiKeyConfigured = true
    }
    provider.apiKey = ''
    provider.fetchError = ''
    provider.validationError = ''
    savedProvider.value = provider.id
  }

  function cancelProvider(provider: ModelProviderState): void {
    resetDraft(provider)
    editingProvider.value = ''
    customSettingsProvider.value = ''
    savedProvider.value = ''
  }

  function fetchFailureLabel(reason: 'invalid-endpoint' | 'request-failed' | 'empty' | 'cancelled'): string {
    if (reason === 'invalid-endpoint') {
      return copy.value.invalidEndpoint
    }
    if (reason === 'empty') {
      return copy.value.fetchEmpty
    }
    return copy.value.fetchFailed
  }

  async function fetchModels(provider: ModelProviderState): Promise<void> {
    provider.fetchError = ''
    provider.validationError = ''
    fetchSequence += 1
    const sequence = fetchSequence
    fetchController?.abort()
    const controller = new AbortController()
    fetchController = controller
    fetchingProvider.value = provider.id

    try {
      const result = await fetchModelCandidates(provider.endpoint, provider.apiKey, controller.signal)
      if (sequence !== fetchSequence || controller.signal.aborted) {
        return
      }
      if (!result.ok) {
        if (result.reason !== 'cancelled') {
          provider.fetchError = fetchFailureLabel(result.reason)
        }
        return
      }
      pickerCandidates.value = result.models
      pickerProvider.value = provider.id
    } finally {
      if (sequence === fetchSequence) {
        fetchingProvider.value = ''
        fetchController = null
      }
    }
  }

  function addSelectedModels(models: ModelEditorModel[]): void {
    const provider = pickerProviderState.value
    if (provider === undefined) {
      return
    }

    const ids = new Set(provider.models.map((model) => model.id))
    const nextModels = [...provider.models]
    for (const model of models) {
      const id = model.id.trim()
      if (!id || ids.has(id)) {
        continue
      }
      ids.add(id)
      nextModels.push({ id, ...(model.name ? { name: model.name } : {}) })
    }
    provider.models = nextModels
    provider.validationError = ''
    pickerProvider.value = ''
  }

  onUnmounted(() => {
    fetchSequence += 1
    fetchController?.abort()
    fetchController = null
  })

  return {
    providers,
    activeProvider,
    editingProvider,
    customSettingsProvider,
    savedProvider,
    fetchingProvider,
    pickerProvider,
    pickerCandidates,
    pickerProviderState,
    pickerExistingIds,
    toggleEditor,
    deleteProvider,
    toggleCustomSettings,
    updateModels,
    updateApiKey,
    updateEndpoint,
    restoreDefaultModels,
    addModel,
    saveProvider,
    cancelProvider,
    fetchModels,
    addSelectedModels,
  }
}
