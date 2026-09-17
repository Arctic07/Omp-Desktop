import type { SourceSettingsModel, SourceSettingsModelsCopy } from '../i18n'

export interface ModelEditorModel {
  id: string
  name?: string
  capacity?: string
}

export type ModelProviderStatus = 'configured' | 'available' | 'unavailable'

export interface ModelProviderState {
  id: string
  name: string
  description: string
  model: string
  initialStatus: ModelProviderStatus
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

const DEFAULT_ENDPOINTS: Readonly<Record<string, string>> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  ollama: 'http://localhost:11434/v1',
}

export function cloneModel(model: SourceSettingsModel | ModelEditorModel): ModelEditorModel {
  return {
    id: model.id,
    ...(model.name ? { name: model.name } : {}),
    ...(model.capacity ? { capacity: model.capacity } : {}),
  }
}

export function getDefaultEndpoint(providerId: string): string {
  return DEFAULT_ENDPOINTS[providerId] ?? ''
}

export function normalizeModels(models: readonly ModelEditorModel[]): ModelEditorModel[] {
  return models.map((model) => ({
    id: model.id.trim(),
    ...(model.name?.trim() ? { name: model.name.trim() } : {}),
    ...(model.capacity?.trim() ? { capacity: model.capacity.trim() } : {}),
  }))
}

export function validateModels(
  models: readonly ModelEditorModel[],
  copy: SourceSettingsModelsCopy,
): string {
  const ids = new Set<string>()
  for (const model of models) {
    const id = model.id.trim()
    if (!id) {
      return copy.modelIdRequired
    }
    if (ids.has(id)) {
      return copy.duplicateModelId
    }
    ids.add(id)
  }
  return ''
}
