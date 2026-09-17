import { computed, reactive, type ComputedRef } from 'vue'

import {
  getSourceCopy,
  type SourceAccentColor,
  type SourceBusyBehavior,
  type SourceConversationDensity,
  type SourceCopy,
  type SourceInterfaceDensity,
  type SourceLanguage,
  type SourcePermissionMode,
  type SourceSessionRetention,
  type SourceTheme,
} from '../i18n'
import { readStoredAppSettings, writeStoredAppSettings } from '../utils/appSettingsStorage'

export interface AppSettings {
  language: SourceLanguage
  theme: SourceTheme
  fontSize: number
  conversationDensity: SourceConversationDensity
  busyBehavior: SourceBusyBehavior
  permissionMode: SourcePermissionMode
  defaultAgentMode: string
  enabledAgentModes: string[]
  enabledSkills: string[]
  enabledPlugins: string[]
  pluginAliases: Record<string, string>
  autoArchive: boolean
  confirmDelete: boolean
  restoreLastSession: boolean
  sessionRetention: SourceSessionRetention
  accent: SourceAccentColor
  interfaceDensity: SourceInterfaceDensity
  reduceMotion: boolean
  highContrast: boolean
}
export const APP_FONT_SIZE_MIN = 12
export const APP_FONT_SIZE_MAX = 17

const DEFAULT_FONT_SIZE = 14
const DEFAULT_THEME: SourceTheme = 'system'
const DEFAULT_CONVERSATION_DENSITY: SourceConversationDensity = 'comfortable'
const DEFAULT_BUSY_BEHAVIOR: SourceBusyBehavior = 'queue'
const DEFAULT_PERMISSION_MODE: SourcePermissionMode = 'ask'
const DEFAULT_SESSION_RETENTION: SourceSessionRetention = 'never'
const DEFAULT_ACCENT: SourceAccentColor = 'blue'
const DEFAULT_INTERFACE_DENSITY: SourceInterfaceDensity = 'standard'
const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'


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
    permissionMode: DEFAULT_PERMISSION_MODE,
    defaultAgentMode: 'build',
    enabledAgentModes: ['build', 'ask', 'review'],
    enabledSkills: ['terminal', 'browser'],
    enabledPlugins: ['git', 'github', 'linear'],
    pluginAliases: {},
    autoArchive: true,
    confirmDelete: true,
    restoreLastSession: true,
    sessionRetention: DEFAULT_SESSION_RETENTION,
    accent: DEFAULT_ACCENT,
    interfaceDensity: DEFAULT_INTERFACE_DENSITY,
    reduceMotion: false,
    highContrast: false,
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
function normalizePermissionMode(value: unknown, fallback: SourcePermissionMode): SourcePermissionMode {
  return value === 'ask' || value === 'allow' || value === 'restricted' ? value : fallback
}

function normalizeSessionRetention(value: unknown, fallback: SourceSessionRetention): SourceSessionRetention {
  return value === 'never' || value === '30-days' || value === '90-days' ? value : fallback
}

function normalizeAccent(value: unknown, fallback: SourceAccentColor): SourceAccentColor {
  return value === 'blue' || value === 'violet' || value === 'green' || value === 'orange' ? value : fallback
}

function normalizeInterfaceDensity(value: unknown, fallback: SourceInterfaceDensity): SourceInterfaceDensity {
  return value === 'cozy' || value === 'standard' || value === 'dense' ? value : fallback
}

function normalizeStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback]
  }
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
}

function normalizeStringMap(value: unknown, fallback: Record<string, string>): Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { ...fallback }
  }

  const normalized: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string' && entry.trim().length > 0) {
      normalized[key] = entry.trim()
    }
  }
  return normalized
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
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
  const persisted = readStoredAppSettings()
  if (persisted === null) {
    return defaults
  }

  return {
    language: normalizeLanguage(persisted.language, defaults.language),
    theme: normalizeTheme(persisted.theme, defaults.theme),
    fontSize: normalizeFontSize(persisted.fontSize, defaults.fontSize),
    conversationDensity: normalizeConversationDensity(persisted.conversationDensity, defaults.conversationDensity),
    busyBehavior: normalizeBusyBehavior(persisted.busyBehavior, defaults.busyBehavior),
    permissionMode: normalizePermissionMode(persisted.permissionMode, defaults.permissionMode),
    defaultAgentMode: typeof persisted.defaultAgentMode === 'string' ? persisted.defaultAgentMode : defaults.defaultAgentMode,
    enabledAgentModes: normalizeStringList(persisted.enabledAgentModes, defaults.enabledAgentModes),
    enabledSkills: normalizeStringList(persisted.enabledSkills, defaults.enabledSkills),
    enabledPlugins: normalizeStringList(persisted.enabledPlugins, defaults.enabledPlugins),
    pluginAliases: normalizeStringMap(persisted.pluginAliases, defaults.pluginAliases),
    autoArchive: normalizeBoolean(persisted.autoArchive, defaults.autoArchive),
    confirmDelete: normalizeBoolean(persisted.confirmDelete, defaults.confirmDelete),
    restoreLastSession: normalizeBoolean(persisted.restoreLastSession, defaults.restoreLastSession),
    sessionRetention: normalizeSessionRetention(persisted.sessionRetention, defaults.sessionRetention),
    accent: normalizeAccent(persisted.accent, defaults.accent),
    interfaceDensity: normalizeInterfaceDensity(persisted.interfaceDensity, defaults.interfaceDensity),
    reduceMotion: normalizeBoolean(persisted.reduceMotion, defaults.reduceMotion),
    highContrast: normalizeBoolean(persisted.highContrast, defaults.highContrast),
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
  body.dataset.ompAccent = settings.accent
  body.dataset.ompInterfaceDensity = settings.interfaceDensity
  body.dataset.ompReduceMotion = String(settings.reduceMotion)
  body.dataset.ompHighContrast = String(settings.highContrast)
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
  writeStoredAppSettings({
    language: settings.language,
    theme: settings.theme,
    fontSize: settings.fontSize,
    conversationDensity: settings.conversationDensity,
    busyBehavior: settings.busyBehavior,
    permissionMode: settings.permissionMode,
    defaultAgentMode: settings.defaultAgentMode,
    enabledAgentModes: settings.enabledAgentModes,
    enabledSkills: settings.enabledSkills,
    enabledPlugins: settings.enabledPlugins,
    pluginAliases: settings.pluginAliases,
    autoArchive: settings.autoArchive,
    confirmDelete: settings.confirmDelete,
    restoreLastSession: settings.restoreLastSession,
    sessionRetention: settings.sessionRetention,
    accent: settings.accent,
    interfaceDensity: settings.interfaceDensity,
    reduceMotion: settings.reduceMotion,
    highContrast: settings.highContrast,
  })
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
  setPermissionMode(value: SourcePermissionMode): void
  setDefaultAgentMode(value: string): void
  setEnabledAgentModes(value: string[]): void
  setEnabledSkills(value: string[]): void
  setEnabledPlugins(value: string[]): void
  setPluginAlias(pluginId: string, alias: string): void
  setSessionOptions(update: Partial<Pick<AppSettings, 'autoArchive' | 'confirmDelete' | 'restoreLastSession' | 'sessionRetention'>>): void
  setAppearanceOptions(update: Partial<Pick<AppSettings, 'accent' | 'interfaceDensity' | 'reduceMotion' | 'highContrast'>>): void
} {
  return {
    settings,
    copy,
    setLanguage,
    setTheme,
    setFontSize,
    setConversationDensity,
    setBusyBehavior,
    setPermissionMode: (value) => updateSettings({ permissionMode: normalizePermissionMode(value, DEFAULT_PERMISSION_MODE) }),
    setDefaultAgentMode: (value) => updateSettings({ defaultAgentMode: value }),
    setEnabledAgentModes: (value) => updateSettings({ enabledAgentModes: [...value] }),
    setEnabledSkills: (value) => updateSettings({ enabledSkills: [...value] }),
    setEnabledPlugins: (value) => updateSettings({ enabledPlugins: [...value] }),
    setPluginAlias: (pluginId, alias) => updateSettings({ pluginAliases: { ...settings.pluginAliases, [pluginId]: alias } }),
    setSessionOptions: (update) => updateSettings(update),
    setAppearanceOptions: (update) => updateSettings(update),
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
