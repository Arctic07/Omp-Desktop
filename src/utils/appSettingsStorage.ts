export interface StoredAppSettings {
  language?: unknown
  theme?: unknown
  fontSize?: unknown
  conversationDensity?: unknown
  busyBehavior?: unknown
  permissionMode?: unknown
  defaultAgentMode?: unknown
  enabledAgentModes?: unknown
  enabledSkills?: unknown
  enabledPlugins?: unknown
  pluginAliases?: unknown
  autoArchive?: unknown
  confirmDelete?: unknown
  restoreLastSession?: unknown
  sessionRetention?: unknown
  accent?: unknown
  interfaceDensity?: unknown
  reduceMotion?: unknown
  highContrast?: unknown
}

const APP_SETTINGS_STORAGE_KEY = 'omp-desktop.settings'

export function readStoredAppSettings(): StoredAppSettings | null {
  if (typeof window === 'undefined') {
    return null
  }

  let serialized: string | null
  try {
    serialized = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY)
  } catch {
    return null
  }

  if (serialized === null) {
    return null
  }

  try {
    const parsed: unknown = JSON.parse(serialized)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }
    return parsed as StoredAppSettings
  } catch {
    return null
  }
}

export function writeStoredAppSettings(settings: StoredAppSettings): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}
