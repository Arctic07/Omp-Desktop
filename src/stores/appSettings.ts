import { computed, reactive, type ComputedRef } from 'vue'

import {
  getSourceCopy,
  type SourceBusyBehavior,
  type SourceConversationDensity,
  type SourceCopy,
  type SourceLanguage,
  type SourceTheme,
} from '../i18n'

export interface AppSettings {
  language: SourceLanguage
  theme: SourceTheme
  fontSize: number
  conversationDensity: SourceConversationDensity
  busyBehavior: SourceBusyBehavior
}

export const APP_FONT_SIZE_MIN = 12
export const APP_FONT_SIZE_MAX = 17

const APP_SETTINGS_STORAGE_KEY = 'omp-desktop.settings'
const DEFAULT_FONT_SIZE = 14
const DEFAULT_THEME: SourceTheme = 'system'
const DEFAULT_CONVERSATION_DENSITY: SourceConversationDensity = 'comfortable'
const DEFAULT_BUSY_BEHAVIOR: SourceBusyBehavior = 'queue'
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

interface PersistedSettings {
  language?: unknown
  theme?: unknown
  fontSize?: unknown
  conversationDensity?: unknown
  busyBehavior?: unknown
}

function getBrowserLanguage(): SourceLanguage {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

function createDefaultSettings(): AppSettings {
  return {
    language: getBrowserLanguage(),
    theme: DEFAULT_THEME,
    fontSize: DEFAULT_FONT_SIZE,
    conversationDensity: DEFAULT_CONVERSATION_DENSITY,
    busyBehavior: DEFAULT_BUSY_BEHAVIOR,
  }
}

function normalizeLanguage(value: unknown, fallback: SourceLanguage): SourceLanguage {
  return value === 'en' || value === 'zh' ? value : fallback
}

function normalizeTheme(value: unknown, fallback: SourceTheme): SourceTheme {
  return value === 'light' || value === 'dark' || value === 'system' ? value : fallback
}

function normalizeConversationDensity(
  value: unknown,
  fallback: SourceConversationDensity,
): SourceConversationDensity {
  return value === 'comfortable' || value === 'compact' ? value : fallback
}

function normalizeBusyBehavior(value: unknown, fallback: SourceBusyBehavior): SourceBusyBehavior {
  return value === 'queue' || value === 'interrupt' ? value : fallback
}

function normalizeFontSize(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(APP_FONT_SIZE_MAX, Math.max(APP_FONT_SIZE_MIN, Math.round(value)))
}

function readStoredSettings(): AppSettings {
  const defaults = createDefaultSettings()

  if (typeof window === 'undefined') {
    return defaults
  }

  let serialized: string | null
  try {
    serialized = window.localStorage.getItem(APP_SETTINGS_STORAGE_KEY)
  } catch {
    return defaults
  }

  if (serialized === null) {
    return defaults
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch {
    return defaults
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return defaults
  }

  const persisted = parsed as PersistedSettings

  return {
    language: normalizeLanguage(persisted.language, defaults.language),
    theme: normalizeTheme(persisted.theme, defaults.theme),
    fontSize: normalizeFontSize(persisted.fontSize, defaults.fontSize),
    conversationDensity: normalizeConversationDensity(persisted.conversationDensity, defaults.conversationDensity),
    busyBehavior: normalizeBusyBehavior(persisted.busyBehavior, defaults.busyBehavior),
  }
}

const settings = reactive<AppSettings>(createDefaultSettings())
const copy = computed<SourceCopy>(() => getSourceCopy(settings.language))

let systemThemeQuery: MediaQueryList | null = null
let initialized = false

function applyDomState(systemThemeMatches?: boolean): void {
  if (typeof document === 'undefined') {
    return
  }

  const { body, documentElement } = document
  if (!body || !documentElement) {
    return
  }

  const isSystemDark = systemThemeMatches ?? systemThemeQuery?.matches === true
  const isDark = settings.theme === 'dark' || (settings.theme === 'system' && isSystemDark)
  body.toggleAttribute('data-ds-dark-theme', isDark)
  body.dataset.ompConversationDensity = settings.conversationDensity
  body.dataset.ompBusyBehavior = settings.busyBehavior
  documentElement.lang = settings.language
  documentElement.style.setProperty('--omp-content-font-size', `${settings.fontSize}px`)
}

function onSystemThemeChange(event?: MediaQueryListEvent): void {
  if (settings.theme === 'system') {
    applyDomState(event?.matches)
  }
}

function ensureSystemThemeListener(): void {
  if (systemThemeQuery || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return
  }

  systemThemeQuery = window.matchMedia(SYSTEM_THEME_QUERY)
  if (typeof systemThemeQuery.addEventListener === 'function') {
    systemThemeQuery.addEventListener('change', onSystemThemeChange)
  } else if (typeof systemThemeQuery.addListener === 'function') {
    systemThemeQuery.addListener(onSystemThemeChange)
  }
}

function persistSettings(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        language: settings.language,
        theme: settings.theme,
        fontSize: settings.fontSize,
        conversationDensity: settings.conversationDensity,
        busyBehavior: settings.busyBehavior,
      }),
    )
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

function updateSettings(update: Partial<AppSettings>): void {
  Object.assign(settings, update)
  ensureSystemThemeListener()
  persistSettings()
  applyDomState()
}

function setLanguage(value: SourceLanguage): void {
  updateSettings({ language: normalizeLanguage(value, getBrowserLanguage()) })
}

function setTheme(value: SourceTheme): void {
  updateSettings({ theme: normalizeTheme(value, DEFAULT_THEME) })
}

function setFontSize(value: number): void {
  updateSettings({ fontSize: normalizeFontSize(value, DEFAULT_FONT_SIZE) })
}

function setConversationDensity(value: SourceConversationDensity): void {
  updateSettings({ conversationDensity: normalizeConversationDensity(value, DEFAULT_CONVERSATION_DENSITY) })
}

function setBusyBehavior(value: SourceBusyBehavior): void {
  updateSettings({ busyBehavior: normalizeBusyBehavior(value, DEFAULT_BUSY_BEHAVIOR) })
}

export function useAppSettings(): {
  settings: AppSettings
  copy: ComputedRef<SourceCopy>
  setLanguage(value: SourceLanguage): void
  setTheme(value: SourceTheme): void
  setFontSize(value: number): void
  setConversationDensity(value: SourceConversationDensity): void
  setBusyBehavior(value: SourceBusyBehavior): void
} {
  return {
    settings,
    copy,
    setLanguage,
    setTheme,
    setFontSize,
    setConversationDensity,
    setBusyBehavior,
  }
}

export function initializeAppSettings(): void {
  if (initialized) {
    ensureSystemThemeListener()
    applyDomState()
    return
  }

  Object.assign(settings, readStoredSettings())
  initialized = true
  ensureSystemThemeListener()
  applyDomState()
}
