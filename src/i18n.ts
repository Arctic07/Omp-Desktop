import { en, zh } from './i18nCopies'

export type SourceSettingsSectionId =
  | 'general'
  | 'models'
  | 'agent-modes'
  | 'skills'
  | 'plugins'
  | 'sessions'
  | 'appearance'
  | 'about'

export type SourcePermissionMode = 'ask' | 'allow' | 'restricted'
export type SourceAccentColor = 'blue' | 'violet' | 'green' | 'orange'
export type SourceInterfaceDensity = 'cozy' | 'standard' | 'dense'
export type SourceSessionRetention = 'never' | '30-days' | '90-days'
export type SourceLanguage = 'en' | 'zh'
export type SourceTheme = 'light' | 'dark' | 'system'
export type SourceConversationDensity = 'comfortable' | 'compact'
export type SourceBusyBehavior = 'queue' | 'interrupt'
export type SourceThinkingLevel = 'off' | 'low' | 'high' | 'max'

export interface SourceSettingChoice<Value extends string = string> {
  value: Value
  label: string
}

export interface SourceSettingsNavigationItem {
  id: SourceSettingsSectionId
  label: string
}

export interface SourceSettingsGeneralCopy {
  title: string
  description: string
  permissionTitle: string
  permissionDescription: string
  permissionOptions: readonly SourceSettingChoice<SourcePermissionMode>[]
  languageTitle: string
  languageDescription: string
  languageOptions: readonly SourceSettingChoice<SourceLanguage>[]
  themeTitle: string
  themeDescription: string
  themeOptions: readonly SourceSettingChoice<SourceTheme>[]
  fontSizeTitle: string
  fontSizeDescription: string
  decreaseFontSize: string
  increaseFontSize: string
  conversationTitle: string
  conversationDescription: string
  conversationOptions: readonly SourceSettingChoice<SourceConversationDensity>[]
  busyTitle: string
  busyDescription: string
  busyOptions: readonly SourceSettingChoice<SourceBusyBehavior>[]
}

export interface SourceSettingsModel {
  id: string
  name?: string
  capacity?: string
}

export interface SourceSettingsModelsCopy {
  title: string
  description: string
  providerTitle: string
  providerDescription: string
  activeLabel: string
  configuredLabel: string
  availableLabel: string
  unavailableLabel: string
  configure: string
  edit: string
  hideConfiguration: string
  deleteProvider: string
  apiKeyLabel: string
  apiKeyPlaceholder: string
  apiKeyConfiguredPlaceholder: string
  customSettings: string
  customSettingsDescription: string
  endpointLabel: string
  endpointPlaceholder: string
  modelCatalogTitle: string
  modelCatalogDescription: string
  restoreDefaultModels: string
  fetchModels: string
  fetchingModels: string
  modelIdLabel: string
  modelNameLabel: string
  modelCapacityLabel: string
  modelCapacityPlaceholder: string
  manualModelIdPlaceholder: string
  manualModelNamePlaceholder: string
  addModel: string
  removeModel: string
  expandModel: string
  collapseModel: string
  modelsEmpty: string
  invalidEndpoint: string
  fetchFailed: string
  fetchEmpty: string
  modelIdRequired: string
  duplicateModelId: string
  save: string
  cancel: string
  saved: string
  providers: readonly {
    id: string
    name: string
    description: string
    model: string
    status: 'configured' | 'available' | 'unavailable'
    endpoint?: string
    models?: readonly SourceSettingsModel[]
  }[]
  picker: {
    title: string
    description: string
    close: string
    searchLabel: string
    searchPlaceholder: string
    selectAll: string
    clearAll: string
    listLabel: string
    noMatches: string
    cancel: string
    addSelected: string
  }
}

export interface SourceSettingsAgentModesCopy {
  title: string
  description: string
  defaultTitle: string
  defaultDescription: string
  modeTitle: string
  modeDescription: string
  enabledLabel: string
  disabledLabel: string
  modes: readonly {
    id: string
    name: string
    description: string
  }[]
}

export interface SourceSettingsSkillsCopy {
  title: string
  description: string
  enabledLabel: string
  disabledLabel: string
  skills: readonly {
    id: string
    name: string
    description: string
  }[]
}

export interface SourceSettingsPluginsCopy {
  title: string
  description: string
  enabledLabel: string
  disabledLabel: string
  configure: string
  configured: string
  pluginSettingsTitle: string
  pluginSettingsDescription: string
  pluginInputLabel: string
  pluginInputPlaceholder: string
  save: string
  plugins: readonly {
    id: string
    name: string
    description: string
  }[]
}

export interface SourceSettingsSessionsCopy {
  title: string
  description: string
  behaviorTitle: string
  behaviorDescription: string
  autoArchiveTitle: string
  autoArchiveDescription: string
  confirmDeleteTitle: string
  confirmDeleteDescription: string
  restoreTitle: string
  restoreDescription: string
  enabledLabel: string
  disabledLabel: string
  retentionOptions: readonly SourceSettingChoice<SourceSessionRetention>[]
  retentionTitle: string
  retentionDescription: string
}

export interface SourceSettingsAppearanceCopy {
  title: string
  description: string
  accentTitle: string
  accentDescription: string
  accentOptions: readonly SourceSettingChoice<SourceAccentColor>[]
  densityTitle: string
  densityDescription: string
  densityOptions: readonly SourceSettingChoice<SourceInterfaceDensity>[]
  motionTitle: string
  motionDescription: string
  contrastTitle: string
  contrastDescription: string
  enabledLabel: string
  disabledLabel: string
}

export interface SourceSettingsAboutCopy {
  title: string
  description: string
  versionTitle: string
  versionValue: string
  buildTitle: string
  buildValue: string
  linksTitle: string
  linksDescription: string
  documentation: string
  sourceCode: string
  reportIssue: string
  resources: readonly {
    id: string
    label: string
    href: string
  }[]
  statusTitle: string
  statusDescription: string
  localOnly: string
}

export interface SourceSettingsCopy {
  sectionDescriptions: Record<SourceSettingsSectionId, string>
  general: SourceSettingsGeneralCopy
  models: SourceSettingsModelsCopy
  agentModes: SourceSettingsAgentModesCopy
  skills: SourceSettingsSkillsCopy
  plugins: SourceSettingsPluginsCopy
  sessions: SourceSettingsSessionsCopy
  appearance: SourceSettingsAppearanceCopy
  about: SourceSettingsAboutCopy
}

interface SourceTrajectoryCopy {
  overview: string
  overviewAria: string
  empty: string
  event: string
  content: string
  input: string
  output: string
  think: string
  time: string
  model: string
  tools: string
  turn: string
  step: string
  system: string
  user: string
  message: string
  tool: string
  initialPrompt: string
  records: string
  calls: string
  tokens: string
}

export interface SourceCopy {
  brand: string
  newSession: string
  newSessionLabel: string
  openSidebar: string
  collapseSidebar: string
  settings: string
  workspaces: string
  searchSessions: string
  clearSearch: string
  viewOptions: string
  addWorkspace: string
  noWorkspaces: string
  noSessions: string
  noMatches: string
  expandSessions: string
  collapseSessions: string
  addWorkspaceMenu: string
  expandWorkspace: string
  collapseWorkspace: string
  heroHeadline: string
  preview: string
  chooseWorkspace: string
  workspaceLoadFailed: string
  workspaceSelectionFailed: string
  composerPlaceholder: string
  messagePlaceholder: string
  addFiles: string
  sendMessage: string
  conversationMode: string
  conversationTab: string
  trajectoryTab: string
  trajectory: SourceTrajectoryCopy
  openWorkspace: string
  openMoreActions: string
  openRightPanel: string
  closeRightPanel: string
  panelTitle: string
  closePanel: string
  filesTab: string
  reviewTab: string
  panelLoading: string
  panelEmpty: string
  panelError: string
  panelRefresh: string
  panelResize: string
  fileExplorerTitle: string
  fileCollapseAll: string
  reviewStagedChanges: string
  reviewChanges: string
  reviewStage: string
  reviewUnstage: string
  reviewStageAll: string
  reviewUnstageAll: string
  reviewActionLoading: string
  reviewActionError: string
  reviewExpandFile: string
  reviewCollapseFile: string
  reviewTruncated: string
  fileBack: string
  fileReveal: string
  fileCopy: string
  fileCopied: string
  fileEdit: string
  fileSave: string
  fileCancel: string
  fileSaving: string
  fileSaved: string
  fileSaveError: string
  fileBinary: string
  fileTooLarge: string
  fileNoWorkspace: string
  fileNoWorkspaceHint: string
  fileEmpty: string
  fileLoading: string
  fileError: string
  fileSearchPlaceholder: string
  fileSearchClear: string
  fileSearchLoading: string
  fileSearchNoMatches: string
  fileSearchResultPath: string
  fileSearchResultContent: string
  fileSearchMore: string
  fileNoSelection: string
  fileNoSelectionHint: string
  reviewNoChanges: string
  reviewNoRepository: string
  reviewClean: string
  reviewLoading: string
  reviewError: string
  reviewRefresh: string
  reviewFilesChanged: string
  reviewOpenFile: string
  reviewBinary: string
  reviewTooLarge: string
  reviewNoLineDetails: string
  reviewCommitMessage: string
  reviewCommitPlaceholder: string
  reviewCommit: string
  reviewCommitLoading: string
  reviewCommitSuccess: string
  reviewPull: string
  reviewPullLoading: string
  reviewPullSuccess: string
  reviewOperationError: string
  reviewDiffBack: string
  reviewDiffOld: string
  reviewDiffNew: string
  reviewDiffLoading: string
  reviewDiffError: string
  reviewDiffEmpty: string
  reviewDiffBinary: string
  reviewDiffTooLarge: string
  reviewDiffOpenFile: string
  reviewDiffStatus: string
  reviewDiffStats: string
  dropFilesHere: string
  droppedDirectory: string
  removeAttachment: string
  attachedFiles: string
  chooseFiles: string
  toolDone: string
  toolRunning: string
  toolFailed: string
  toolInput: string
  toolOutput: string
  toolCopy: string
  toolCopied: string
  copyFailed: string
  toolCalls: string
  noMessages: string
  justNow: string
  duration: string
  tokensPerSecond: string
  conversationStats: string
  localSessionTitle: string
  modelLabel: string
  thinkingLabel: string
  thinkingOptions: readonly SourceSettingChoice<SourceThinkingLevel>[]
  settingsTitle: string
  closeSettings: string
  settingsSections: readonly string[]
  settingsNavigation: readonly SourceSettingsNavigationItem[]
  settingsDescription: string
  settingsPage: SourceSettingsCopy
  systemTheme: string
  language: string
  english: string
  fontSize: string
  fourteenPixels: string
}

export function getSourceCopy(language?: SourceLanguage): SourceCopy {
  const selectedLanguage = language ?? (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en')
  return selectedLanguage === 'zh' ? zh : en
}
