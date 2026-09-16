<script setup lang='ts'>
import { computed, reactive, ref } from 'vue'

import type { SourceSettingsModel, SourceSettingsModelsCopy } from '../../i18n'
import { AppIcon } from '../icons'
import ModelCatalogEditor, { type ModelEditorModel } from './ModelCatalogEditor.vue'
import ModelPickerDialog, { type ModelPickerCandidate } from './ModelPickerDialog.vue'

const props = defineProps<{
  copy: SourceSettingsModelsCopy
}>()

type ProviderStatus = 'configured' | 'available' | 'unavailable'

interface ProviderState {
  id: string
  name: string
  description: string
  model: string
  initialStatus: ProviderStatus
  endpoint: string
  apiKey: string
  apiKeyConfigured: boolean
  committedEndpoint: string
  committedModels: ModelEditorModel[]
  committedApiKeyConfigured: boolean
  models: ModelEditorModel[]
  defaultModels: ModelEditorModel[]
  fetchError: string
  validationError: string
}

const activeProvider = ref(props.copy.providers[0]?.id ?? '')
const editingProvider = ref(props.copy.providers[0]?.id ?? '')
const customSettingsProvider = ref(props.copy.providers[0]?.id ?? '')
const savedProvider = ref('')
const fetchingProvider = ref('')
const pickerProvider = ref('')
const pickerCandidates = ref<ModelPickerCandidate[]>([])

function cloneModel(model: SourceSettingsModel | ModelEditorModel): ModelEditorModel {
  return {
    id: model.id,
    ...(model.name ? { name: model.name } : {}),
    ...(model.capacity ? { capacity: model.capacity } : {}),
  }
}

function defaultEndpoint(providerId: string) {
  if (providerId === 'openai') {
    return 'https://api.openai.com/v1'
  }
  if (providerId === 'deepseek') {
    return 'https://api.deepseek.com/v1'
  }
  if (providerId === 'ollama') {
    return 'http://localhost:11434/v1'
  }
  return ''
}

const providers = reactive<ProviderState[]>(
  props.copy.providers.map((provider) => {
    const defaultModels = (provider.models ?? []).map(cloneModel)
    const endpoint = provider.endpoint ?? defaultEndpoint(provider.id)
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
  }),
)

const pickerProviderState = computed(() => providers.find((provider) => provider.id === pickerProvider.value))
const pickerExistingIds = computed(() => pickerProviderState.value?.models.map((model) => model.id) ?? [])

function providerStatus(provider: ProviderState): ProviderStatus {
  if (provider.committedApiKeyConfigured || provider.initialStatus === 'configured') {
    return 'configured'
  }
  if (provider.endpoint.trim()) {
    return 'available'
  }
  return provider.initialStatus
}

function statusLabel(provider: ProviderState) {
  const status = providerStatus(provider)
  if (status === 'configured') {
    return props.copy.configuredLabel
  }
  if (status === 'unavailable') {
    return props.copy.unavailableLabel
  }
  return props.copy.availableLabel
}

function resetDraft(provider: ProviderState) {
  provider.endpoint = provider.committedEndpoint
  provider.models = provider.committedModels.map(cloneModel)
  provider.apiKey = ''
  provider.apiKeyConfigured = provider.committedApiKeyConfigured
  provider.fetchError = ''
  provider.validationError = ''
}

function toggleEditor(provider: ProviderState) {
  if (editingProvider.value === provider.id) {
    editingProvider.value = ''
    savedProvider.value = ''
    return
  }
  if (editingProvider.value) {
    const previous = providers.find((item) => item.id === editingProvider.value)
    if (previous) {
      resetDraft(previous)
    }
  }
  resetDraft(provider)
  activeProvider.value = provider.id
  editingProvider.value = provider.id
  customSettingsProvider.value = provider.id
  savedProvider.value = ''
}

function deleteProvider(providerId: string) {
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

function toggleCustomSettings(providerId: string) {
  customSettingsProvider.value = customSettingsProvider.value === providerId ? '' : providerId
}

function updateModels(provider: ProviderState, models: ModelEditorModel[]) {
  provider.models = models
  provider.validationError = ''
}

function restoreDefaultModels(provider: ProviderState) {
  provider.models = provider.defaultModels.map(cloneModel)
  provider.validationError = ''
}

function addModel(provider: ProviderState) {
  provider.models = [...provider.models, { id: '', name: '' }]
  provider.validationError = ''
}

function normalizedModels(models: readonly ModelEditorModel[]) {
  return models.map((model) => ({
    id: model.id.trim(),
    ...(model.name?.trim() ? { name: model.name.trim() } : {}),
    ...(model.capacity?.trim() ? { capacity: model.capacity.trim() } : {}),
  }))
}

function validateModels(models: readonly ModelEditorModel[]) {
  const ids = new Set<string>()
  for (const model of models) {
    const id = model.id.trim()
    if (!id) {
      return props.copy.modelIdRequired
    }
    if (ids.has(id)) {
      return props.copy.duplicateModelId
    }
    ids.add(id)
  }
  return ''
}

function saveProvider(provider: ProviderState) {
  const validationError = validateModels(provider.models)
  if (validationError) {
    provider.validationError = validationError
    return
  }
  const models = normalizedModels(provider.models)
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

function cancelProvider(provider: ProviderState) {
  resetDraft(provider)
  editingProvider.value = ''
  customSettingsProvider.value = ''
  savedProvider.value = ''
}

function normalizeModelsUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    const pathname = url.pathname.replace(/\/+$/, '')
    if (!pathname.toLocaleLowerCase().endsWith('/models')) {
      url.pathname = `${pathname}/models` || '/models'
    } else {
      url.pathname = pathname || '/models'
    }
    return url.toString()
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function modelCandidates(payload: unknown) {
  let entries: unknown[] = []
  if (Array.isArray(payload)) {
    entries = payload
  } else if (isRecord(payload)) {
    if (Array.isArray(payload.data)) {
      entries = payload.data
    } else if (Array.isArray(payload.models)) {
      entries = payload.models
    }
  }

  const seenIds = new Set<string>()
  const candidates: ModelPickerCandidate[] = []
  entries.forEach((entry) => {
    if (!isRecord(entry) || typeof entry.id !== 'string') {
      return
    }
    const id = entry.id.trim()
    if (!id || seenIds.has(id)) {
      return
    }
    seenIds.add(id)
    const name = typeof entry.name === 'string' ? entry.name.trim() : ''
    candidates.push({ id, ...(name ? { name } : {}) })
  })
  return candidates
}

async function fetchModels(provider: ProviderState) {
  provider.fetchError = ''
  provider.validationError = ''
  const modelsUrl = normalizeModelsUrl(provider.endpoint)
  if (!modelsUrl) {
    provider.fetchError = props.copy.invalidEndpoint
    return
  }

  fetchingProvider.value = provider.id
  try {
    const headers: Record<string, string> = { Accept: 'application/json' }
    const apiKey = provider.apiKey.trim()
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`
    }
    const response = await fetch(modelsUrl, { method: 'GET', headers })
    if (!response.ok) {
      provider.fetchError = props.copy.fetchFailed
      return
    }
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      provider.fetchError = props.copy.fetchFailed
      return
    }
    const candidates = modelCandidates(payload)
    if (candidates.length === 0) {
      provider.fetchError = props.copy.fetchEmpty
      return
    }
    pickerCandidates.value = candidates
    pickerProvider.value = provider.id
  } catch {
    provider.fetchError = props.copy.fetchFailed
  } finally {
    if (fetchingProvider.value === provider.id) {
      fetchingProvider.value = ''
    }
  }
}

function addSelectedModels(models: ModelPickerCandidate[]) {
  const provider = pickerProviderState.value
  if (!provider) {
    return
  }
  const ids = new Set(provider.models.map((model) => model.id))
  const nextModels = [...provider.models]
  models.forEach((model) => {
    const id = model.id.trim()
    if (!id || ids.has(id)) {
      return
    }
    ids.add(id)
    nextModels.push({ id, ...(model.name ? { name: model.name } : {}) })
  })
  provider.models = nextModels
  provider.validationError = ''
  pickerProvider.value = ''
}
</script>

<template>
  <div class='dsh-settings-stack'>
    <section class='dsh-settings-group' :aria-labelledby="'dsh-settings-models-providers'">
      <div class='dsh-settings-group-heading'>
        <h3 id='dsh-settings-models-providers'>{{ props.copy.providerTitle }}</h3>
        <p>{{ props.copy.providerDescription }}</p>
      </div>

      <div class='dsh-model-provider-list'>
        <article
          v-for='provider in providers'
          :key='provider.id'
          class='dsh-settings-card dsh-model-provider-card'
          :class='{ "dsh-model-provider-card-active": activeProvider === provider.id }'
        >
          <header class='dsh-model-provider-header'>
            <button
              class='dsh-model-provider-select'
              type='button'
              :aria-pressed='activeProvider === provider.id'
              @click='activeProvider = provider.id'
            >
              <span class='dsh-settings-list-item-icon' aria-hidden='true'>
                <AppIcon name='bot' :size='17' />
              </span>
              <span class='dsh-settings-row-copy'>
                <strong>{{ provider.name }}</strong>
                <span>{{ provider.description }}</span>
                <small>{{ provider.model }}</small>
              </span>
            </button>
            <div class='dsh-model-provider-actions'>
              <span class='dsh-model-provider-status' :class='`dsh-model-provider-status-${providerStatus(provider)}`'>
                <span class='dsh-model-provider-status-dot' aria-hidden='true'></span>
                {{ statusLabel(provider) }}
              </span>
              <button
                class='dsh-settings-button dsh-settings-button-small'
                type='button'
                :aria-expanded='editingProvider === provider.id'
                @click='toggleEditor(provider)'
              >
                <AppIcon name='pencil-line' :size='14' aria-hidden='true' />
                {{ editingProvider === provider.id ? props.copy.hideConfiguration : props.copy.edit }}
              </button>
              <button
                class='dsh-model-provider-delete'
                type='button'
                :aria-label='`${props.copy.deleteProvider}: ${provider.name}`'
                @click='deleteProvider(provider.id)'
              >
                <AppIcon name='trash-2' :size='16' aria-hidden='true' />
              </button>
            </div>
          </header>

          <div v-if='editingProvider === provider.id' class='dsh-model-provider-editor'>
            <label class='dsh-model-api-key'>
              <span class='dsh-settings-input-label'>{{ props.copy.apiKeyLabel }}</span>
              <input
                v-model='provider.apiKey'
                class='dsh-settings-input'
                type='password'
                autocomplete='new-password'
                :placeholder='provider.apiKeyConfigured ? props.copy.apiKeyConfiguredPlaceholder : props.copy.apiKeyPlaceholder'
              />
            </label>

            <button
              class='dsh-model-custom-settings-toggle'
              type='button'
              :aria-expanded='customSettingsProvider === provider.id'
              @click='toggleCustomSettings(provider.id)'
            >
              <span>
                <strong>{{ props.copy.customSettings }}</strong>
                <small>{{ props.copy.customSettingsDescription }}</small>
              </span>
              <AppIcon name='chevron-down' :size='16' aria-hidden='true' />
            </button>

            <div v-if='customSettingsProvider === provider.id' class='dsh-model-custom-settings'>
              <label class='dsh-model-api-address'>
                <span class='dsh-settings-input-label'>{{ props.copy.endpointLabel }}</span>
                <input
                  v-model='provider.endpoint'
                  class='dsh-settings-input'
                  type='url'
                  autocomplete='url'
                  :placeholder='props.copy.endpointPlaceholder'
                />
              </label>
              <ModelCatalogEditor
                :copy='props.copy'
                :models='provider.models'
                :default-models='provider.defaultModels'
                :fetching='fetchingProvider === provider.id'
                :fetch-error='provider.fetchError'
                :validation-error='provider.validationError'
                @update:models='updateModels(provider, $event)'
                @restore-defaults='restoreDefaultModels(provider)'
                @fetch='fetchModels(provider)'
                @add='addModel(provider)'
              />
            </div>

            <p v-if='savedProvider === provider.id' class='dsh-settings-inline-note'>{{ props.copy.saved }}</p>
            <div class='dsh-model-provider-footer'>
              <button class='dsh-settings-button' type='button' @click='cancelProvider(provider)'>{{ props.copy.cancel }}</button>
              <button class='dsh-settings-button dsh-settings-button-primary' type='button' @click='saveProvider(provider)'>
                {{ props.copy.save }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </section>

    <ModelPickerDialog
      :open='pickerProvider !== ""'
      :copy='props.copy.picker'
      :candidates='pickerCandidates'
      :existing-ids='pickerExistingIds'
      @close='pickerProvider = ""'
      @add='addSelectedModels'
    />
  </div>
</template>
