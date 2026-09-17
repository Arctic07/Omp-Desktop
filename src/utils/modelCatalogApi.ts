import type { ModelEditorModel } from './modelSettings'
import { fetchModelCatalog, isDesktopApiError } from './desktopApi'

export type ModelCatalogFetchFailure = 'invalid-endpoint' | 'request-failed' | 'empty' | 'cancelled'

export type ModelCatalogFetchResult =
  | { ok: true; models: ModelEditorModel[] }
  | { ok: false; reason: ModelCatalogFetchFailure }

export async function fetchModelCandidates(
  endpoint: string,
  apiKey: string,
  requestSignal?: AbortSignal,
): Promise<ModelCatalogFetchResult> {
  if (requestSignal?.aborted) {
    return { ok: false, reason: 'cancelled' }
  }

  try {
    const response = await fetchModelCatalog(endpoint, apiKey)
    if (requestSignal?.aborted) {
      return { ok: false, reason: 'cancelled' }
    }
    if (response.models.length === 0) {
      return { ok: false, reason: 'empty' }
    }
    return { ok: true, models: response.models }
  } catch (error: unknown) {
    if (requestSignal?.aborted) {
      return { ok: false, reason: 'cancelled' }
    }
    if (isDesktopApiError(error) && error.code === 'MODEL_ENDPOINT_INVALID') {
      return { ok: false, reason: 'invalid-endpoint' }
    }
    if (isDesktopApiError(error) && error.code === 'MODEL_RESPONSE_EMPTY') {
      return { ok: false, reason: 'empty' }
    }
    return { ok: false, reason: 'request-failed' }
  }
}
