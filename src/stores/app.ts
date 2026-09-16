import { computed, ref, type ComputedRef, type Ref } from 'vue'

export type AppPage = 'chat' | 'projects' | 'pulls' | 'scheduled' | 'settings'
export type SettingsTab =
  | 'general'
  | 'ai'
  | 'shortcuts'
  | 'instructions'
  | 'agent'
  | 'skills'
  | 'mcp'
  | 'subagents'
  | 'import'
  | 'projects'
  | 'about'
export type Theme = 'dark' | 'light' | 'system'
export type Language = 'zh-CN' | 'en-US'
export type FontSize = 'small' | 'medium' | 'large'
export type PermissionMode = 'ask' | 'accept-edits' | 'auto'
export type SessionStatus = 'idle' | 'running' | 'completed' | 'error'
export type ChatMessageRole = 'user' | 'assistant' | 'system'
export type WorkPanelTab = 'files' | 'review' | 'terminal'

export interface SessionRecord {
  id: string
  title: string
  projectPath: string | null
  updatedAt: string
  status: SessionStatus
  pinned?: boolean
}

export interface ChatMessage {
  id: string
  role: ChatMessageRole
  content: string
  createdAt: string
}

export interface ProjectRecord {
  id: string
  name: string
  path: string
  sessionCount: number
  updatedAt: string
  pinned?: boolean
  archived?: boolean
}

export interface AppSettings {
  theme: Theme
  language: Language
  fontSize: FontSize
  defaultPermissionMode: PermissionMode
  commandShell: string
  largePasteThreshold: number
}

export type Settings = AppSettings

export const DEFAULT_SETTINGS: Readonly<AppSettings> = {
  theme: 'system',
  language: 'zh-CN',
  fontSize: 'medium',
  defaultPermissionMode: 'ask',
  commandShell: '',
  largePasteThreshold: 10000,
}

export const APP_PREFERENCES_STORAGE_KEY = 'omp-desktop:v1:preferences'

type StoredPreferences = {
  theme?: Theme
  language?: Language
  fontSize?: FontSize
  defaultPermissionMode?: PermissionMode
  commandShell?: string
  largePasteThreshold?: number
  sidebarCollapsed?: boolean
  workPanelOpen?: boolean
  workPanelTab?: WorkPanelTab
  settingsTab?: SettingsTab
}

type StoredPreferencesInput = {
  theme?: unknown
  language?: unknown
  fontSize?: unknown
  defaultPermissionMode?: unknown
  commandShell?: unknown
  largePasteThreshold?: unknown
  sidebarCollapsed?: unknown
  workPanelOpen?: unknown
  workPanelTab?: unknown
  settingsTab?: unknown
}

const isTheme = (value: unknown): value is Theme =>
  value === 'dark' || value === 'light' || value === 'system'

const isLanguage = (value: unknown): value is Language =>
  value === 'zh-CN' || value === 'en-US'

const isFontSize = (value: unknown): value is FontSize =>
  value === 'small' || value === 'medium' || value === 'large'

const isPermissionMode = (value: unknown): value is PermissionMode =>
  value === 'ask' || value === 'accept-edits' || value === 'auto'

const isWorkPanelTab = (value: unknown): value is WorkPanelTab =>
  value === 'files' || value === 'review' || value === 'terminal'

const isSettingsTab = (value: unknown): value is SettingsTab =>
  value === 'general' ||
  value === 'ai' ||
  value === 'shortcuts' ||
  value === 'instructions' ||
  value === 'agent' ||
  value === 'skills' ||
  value === 'mcp' ||
  value === 'subagents' ||
  value === 'import' ||
  value === 'projects' ||
  value === 'about'

function readStoredPreferences(): StoredPreferences {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(APP_PREFERENCES_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return {}
    }
    const input = parsed as StoredPreferencesInput

    const preferences: StoredPreferences = {}
    if (isTheme(input.theme)) {
      preferences.theme = input.theme
    }
    if (isLanguage(input.language)) {
      preferences.language = input.language
    }
    if (isFontSize(input.fontSize)) {
      preferences.fontSize = input.fontSize
    }
    if (isPermissionMode(input.defaultPermissionMode)) {
      preferences.defaultPermissionMode = input.defaultPermissionMode
    }
    if (typeof input.commandShell === 'string') {
      preferences.commandShell = input.commandShell
    }
    if (
      typeof input.largePasteThreshold === 'number' &&
      Number.isFinite(input.largePasteThreshold) &&
      input.largePasteThreshold > 0
    ) {
      preferences.largePasteThreshold = input.largePasteThreshold
    }
    if (typeof input.sidebarCollapsed === 'boolean') {
      preferences.sidebarCollapsed = input.sidebarCollapsed
    }
    if (typeof input.workPanelOpen === 'boolean') {
      preferences.workPanelOpen = input.workPanelOpen
    }
    if (isWorkPanelTab(input.workPanelTab)) {
      preferences.workPanelTab = input.workPanelTab
    }
    if (isSettingsTab(input.settingsTab)) {
      preferences.settingsTab = input.settingsTab
    }

    return preferences
  } catch {
    return {}
  }
}

const storedPreferences = readStoredPreferences()

const sessions = ref<SessionRecord[]>([])
const activeSessionId = ref<string | null>(null)
const messages = ref<ChatMessage[]>([])
const workspace = ref<ProjectRecord | null>(null)
const projects = ref<ProjectRecord[]>([])
const sidebarCollapsed = ref(storedPreferences.sidebarCollapsed ?? false)
const workPanelOpen = ref(storedPreferences.workPanelOpen ?? false)
const workPanelTab = ref<WorkPanelTab>(storedPreferences.workPanelTab ?? 'files')
const settingsTab = ref<SettingsTab>(storedPreferences.settingsTab ?? 'general')
const settings = ref<AppSettings>({
  theme: storedPreferences.theme ?? DEFAULT_SETTINGS.theme,
  language: storedPreferences.language ?? DEFAULT_SETTINGS.language,
  fontSize: storedPreferences.fontSize ?? DEFAULT_SETTINGS.fontSize,
  defaultPermissionMode:
    storedPreferences.defaultPermissionMode ??
    DEFAULT_SETTINGS.defaultPermissionMode,
  commandShell:
    storedPreferences.commandShell ?? DEFAULT_SETTINGS.commandShell,
  largePasteThreshold:
    storedPreferences.largePasteThreshold ??
    DEFAULT_SETTINGS.largePasteThreshold,
})

const activeSession = computed<SessionRecord | null>(
  () =>
    sessions.value.find((session) => session.id === activeSessionId.value) ??
    null,
)
const currentMessages = computed<ChatMessage[]>(() => messages.value)

const messagesBySession = new Map<string, ChatMessage[]>()
let generatedId = 0

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  generatedId += 1
  return `${prefix}-${Date.now().toString(36)}-${generatedId.toString(36)}`
}

function now(): string {
  return new Date().toISOString()
}

function applyTheme(theme: Theme): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.theme = theme
  }
}

function persistPreferences(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const preferences: StoredPreferences = {
      theme: settings.value.theme,
      language: settings.value.language,
      fontSize: settings.value.fontSize,
      defaultPermissionMode: settings.value.defaultPermissionMode,
      commandShell: settings.value.commandShell,
      largePasteThreshold: settings.value.largePasteThreshold,
      sidebarCollapsed: sidebarCollapsed.value,
      workPanelOpen: workPanelOpen.value,
      workPanelTab: workPanelTab.value,
      settingsTab: settingsTab.value,
    }
    window.localStorage.setItem(
      APP_PREFERENCES_STORAGE_KEY,
      JSON.stringify(preferences),
    )
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }
}

function projectNameFromPath(path: string): string {
  const withoutTrailingSeparators = path.replace(/[\\/]+$/, '')
  const segments = withoutTrailingSeparators.split(/[\\/]/)
  return segments.at(-1) || withoutTrailingSeparators || 'Workspace'
}

function ensureProject(path: string): ProjectRecord {
  const existingProject = projects.value.find((project) => project.path === path)
  if (existingProject) {
    return existingProject
  }

  const project: ProjectRecord = {
    id: createId('project'),
    name: projectNameFromPath(path),
    path,
    sessionCount: 0,
    updatedAt: now(),
  }
  projects.value.push(project)
  return project
}

function messagesForSession(id: string): ChatMessage[] {
  const existingMessages = messagesBySession.get(id)
  if (existingMessages) {
    return existingMessages
  }

  const sessionMessages: ChatMessage[] = []
  messagesBySession.set(id, sessionMessages)
  return sessionMessages
}

function syncWorkspace(projectPath: string | null): void {
  const project = projectPath
    ? projects.value.find((candidate) => candidate.path === projectPath) ?? null
    : null
  workspace.value = project
}

function toggleSidebar(): void {
  sidebarCollapsed.value = !sidebarCollapsed.value
  persistPreferences()
}

function selectSession(id: string): boolean {
  const session = sessions.value.find((candidate) => candidate.id === id)
  if (!session) {
    return false
  }

  activeSessionId.value = session.id
  messages.value = [...messagesForSession(session.id)]
  syncWorkspace(session.projectPath)
  return true
}

function createSession(projectPath?: string): SessionRecord {
  const normalizedProjectPath = projectPath?.trim() || null
  const project = normalizedProjectPath
    ? ensureProject(normalizedProjectPath)
    : null
  const timestamp = now()
  const session: SessionRecord = {
    id: createId('session'),
    title: 'New session',
    projectPath: normalizedProjectPath,
    updatedAt: timestamp,
    status: 'idle',
  }

  sessions.value.push(session)
  messagesBySession.set(session.id, [])
  messages.value = [...messagesForSession(session.id)]
  syncWorkspace(normalizedProjectPath)

  if (project) {
    project.sessionCount += 1
    project.updatedAt = timestamp
  }

  return session
}

function sendMessage(content: string): ChatMessage | null {
  const normalizedContent = content.trim()
  if (!normalizedContent) {
    return null
  }

  const session = activeSession.value ?? createSession()
  const sessionMessages = messagesForSession(session.id)
  const message: ChatMessage = {
    id: createId('message'),
    role: 'user',
    content: normalizedContent,
    createdAt: now(),
  }

  sessionMessages.push(message)
  messages.value = [...sessionMessages]
  session.updatedAt = message.createdAt
  const hasPreviousUserMessage = sessionMessages.some(
    (item) => item.role === 'user' && item.id !== message.id,
  )
  if (!hasPreviousUserMessage) {
    session.title = normalizedContent.split(/\r?\n/u, 1)[0] || 'New session'
  }

  return message
}

function setWorkPanelOpen(value: boolean): void {
  workPanelOpen.value = value
  persistPreferences()
}

function setWorkPanelTab(tab: WorkPanelTab): void {
  if (!isWorkPanelTab(tab)) {
    return
  }
  workPanelTab.value = tab
  persistPreferences()
}

function setSettingsTab(tab: SettingsTab): void {
  if (!isSettingsTab(tab)) {
    return
  }
  settingsTab.value = tab
  persistPreferences()
}

function setTheme(theme: Theme): void {
  if (!isTheme(theme)) {
    return
  }
  settings.value.theme = theme
  applyTheme(theme)
  persistPreferences()
}

function setLanguage(language: Language): void {
  if (!isLanguage(language)) {
    return
  }
  settings.value.language = language
  persistPreferences()
}

function renameSession(id: string, title: string): boolean {
  const normalizedTitle = title.trim()
  if (!normalizedTitle) {
    return false
  }

  const session = sessions.value.find((candidate) => candidate.id === id)
  if (!session) {
    return false
  }

  session.title = normalizedTitle
  session.updatedAt = now()
  return true
}

applyTheme(settings.value.theme)

export interface AppStore {
  sessions: Ref<SessionRecord[]>
  activeSessionId: Ref<string | null>
  messages: Ref<ChatMessage[]>
  workspace: Ref<ProjectRecord | null>
  projects: Ref<ProjectRecord[]>
  sidebarCollapsed: Ref<boolean>
  workPanelOpen: Ref<boolean>
  workPanelTab: Ref<WorkPanelTab>
  settingsTab: Ref<SettingsTab>
  settings: Ref<AppSettings>
  activeSession: ComputedRef<SessionRecord | null>
  currentMessages: ComputedRef<ChatMessage[]>
  toggleSidebar: () => void
  selectSession: (id: string) => boolean
  createSession: (projectPath?: string) => SessionRecord
  sendMessage: (content: string) => ChatMessage | null
  setWorkPanelOpen: (value: boolean) => void
  setWorkPanelTab: (tab: WorkPanelTab) => void
  setSettingsTab: (tab: SettingsTab) => void
  setTheme: (theme: Theme) => void
  setLanguage: (language: Language) => void
  renameSession: (id: string, title: string) => boolean
}

const appStore: AppStore = {
  sessions,
  activeSessionId,
  messages,
  workspace,
  projects,
  sidebarCollapsed,
  workPanelOpen,
  workPanelTab,
  settingsTab,
  settings,
  activeSession,
  currentMessages,
  toggleSidebar,
  selectSession,
  createSession,
  sendMessage,
  setWorkPanelOpen,
  setWorkPanelTab,
  setSettingsTab,
  setTheme,
  setLanguage,
  renameSession,
}

export function useAppStore(): AppStore {
  return appStore
}
