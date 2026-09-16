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
export type SourceLanguage = 'en' | 'zh'
export type SourceTheme = 'light' | 'dark' | 'system'
export type SourceConversationDensity = 'comfortable' | 'compact'
export type SourceBusyBehavior = 'queue' | 'interrupt'

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

export interface SourceSettingsModelsCopy {
  title: string
  description: string
  providerTitle: string
  providerDescription: string
  activeLabel: string
  configuredLabel: string
  unavailableLabel: string
  configure: string
  hideConfiguration: string
  endpointLabel: string
  endpointPlaceholder: string
  save: string
  saved: string
  providers: readonly {
    id: string
    name: string
    description: string
    model: string
    status: 'configured' | 'available' | 'unavailable'
  }[]
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
  retentionOptions: readonly SourceSettingChoice<string>[]
  retentionTitle: string
  retentionDescription: string
}

export interface SourceSettingsAppearanceCopy {
  title: string
  description: string
  accentTitle: string
  accentDescription: string
  accentOptions: readonly SourceSettingChoice<string>[]
  densityTitle: string
  densityDescription: string
  densityOptions: readonly SourceSettingChoice<string>[]
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
  noSessions: string
  noMatches: string
  addWorkspaceMenu: string
  heroHeadline: string
  preview: string
  chooseWorkspace: string
  composerPlaceholder: string
  messagePlaceholder: string
  addFiles: string
  sendMessage: string
  settingsTitle: string
  closeSettings: string
  settingsSections: readonly string[]
  settingsNavigation: readonly SourceSettingsNavigationItem[]
  settingsDescription: string
  systemTheme: string
  language: string
  english: string
  fontSize: string
  fourteenPixels: string
}

const en: SourceCopy = {
  brand: 'DSH Local Build',
  newSession: 'New Session',
  newSessionLabel: 'New session',
  openSidebar: 'Open sidebar',
  collapseSidebar: 'Collapse sidebar',
  settings: 'Settings',
  workspaces: 'Workspaces',
  searchSessions: 'Search sessions',
  clearSearch: 'Clear search',
  viewOptions: 'View options',
  addWorkspace: 'Add workspace',
  noSessions: 'No sessions yet',
  noMatches: 'No matching sessions',
  addWorkspaceMenu: 'Add workspace…',
  heroHeadline: 'Into the Unknown',
  preview: 'Preview',
  chooseWorkspace: 'Choose workspace',
  composerPlaceholder: 'Choose a workspace to start',
  messagePlaceholder: 'Message or run a task',
  addFiles: 'Add files or run commands',
  sendMessage: 'Send message',
  settingsTitle: 'Settings',
  closeSettings: 'Close settings',
  settingsSections: ['General', 'Models', 'Agent modes', 'Skills', 'Plugins', 'Sessions', 'Appearance', 'About'],
  settingsNavigation: [
    { id: 'general', label: 'General' },
    { id: 'models', label: 'Models' },
    { id: 'agent-modes', label: 'Agent modes' },
    { id: 'skills', label: 'Skills' },
    { id: 'plugins', label: 'Plugins' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'appearance', label: 'Appearance' },
    { id: 'about', label: 'About' },
  ],
  settingsDescription: 'Configure the local Harness client. Changes are saved automatically.',
  settingsPage: {
    sectionDescriptions: {
      general: 'Control permissions, language, and how conversations behave.',
      models: 'Connect local and remote providers for your conversations.',
      'agent-modes': 'Choose the tools and defaults used by each agent mode.',
      skills: 'Enable focused capabilities when you need them.',
      plugins: 'Manage extensions that add integrations to the workspace.',
      sessions: 'Decide how sessions are displayed, retained, and archived.',
      appearance: 'Tune the visual language of the desktop client.',
      about: 'Build information, resources, and local runtime status.',
    },
    general: {
      title: 'General',
      description: 'Set the defaults used when you start a new conversation.',
      permissionTitle: 'Permission mode',
      permissionDescription: 'Choose when actions can run without asking.',
      permissionOptions: [
        { value: 'ask', label: 'Ask each time' },
        { value: 'allow', label: 'Allow in workspace' },
        { value: 'restricted', label: 'Restricted' },
      ],
      languageTitle: 'Language',
      languageDescription: 'Choose the language used across the interface.',
      languageOptions: [
        { value: 'en', label: 'English' },
        { value: 'zh', label: '简体中文' },
      ],
      themeTitle: 'Theme',
      themeDescription: 'Use a light, dark, or system-aware appearance.',
      themeOptions: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'System' },
      ],
      fontSizeTitle: 'Font size',
      fontSizeDescription: 'Adjust the reading size for messages and controls.',
      decreaseFontSize: 'Decrease font size',
      increaseFontSize: 'Increase font size',
      conversationTitle: 'Conversation display',
      conversationDescription: 'Choose the amount of space between messages.',
      conversationOptions: [
        { value: 'comfortable', label: 'Comfortable' },
        { value: 'compact', label: 'Compact' },
      ],
      busyTitle: 'While the assistant is busy',
      busyDescription: 'Choose what happens when you send another message.',
      busyOptions: [
        { value: 'queue', label: 'Queue message' },
        { value: 'interrupt', label: 'Ask before sending' },
      ],
    },
    models: {
      title: 'Models',
      description: 'Choose a provider and keep its endpoint details close at hand.',
      providerTitle: 'Model providers',
      providerDescription: 'The selected provider is used for new conversations.',
      activeLabel: 'Active',
      configuredLabel: 'Configured',
      unavailableLabel: 'Unavailable',
      configure: 'Configure',
      hideConfiguration: 'Hide configuration',
      endpointLabel: 'Endpoint',
      endpointPlaceholder: 'https://api.example.com/v1',
      save: 'Save endpoint',
      saved: 'Endpoint saved for this session',
      providers: [
        { id: 'deepseek', name: 'DeepSeek', description: 'Hosted reasoning and chat models.', model: 'DeepSeek Chat', status: 'configured' },
        { id: 'ollama', name: 'Ollama', description: 'Run models on this device.', model: 'Local models', status: 'available' },
        { id: 'openai-compatible', name: 'OpenAI compatible', description: 'Connect any compatible gateway.', model: 'Custom endpoint', status: 'available' },
      ],
    },
    agentModes: {
      title: 'Agent modes',
      description: 'Pick a default workflow and keep other modes ready for the next task.',
      defaultTitle: 'Default mode',
      defaultDescription: 'New conversations start with this mode.',
      modeTitle: 'Available modes',
      modeDescription: 'Disabled modes will not appear in the composer.',
      enabledLabel: 'Enabled',
      disabledLabel: 'Disabled',
      modes: [
        { id: 'build', name: 'Build', description: 'Plan and implement changes in a workspace.' },
        { id: 'ask', name: 'Ask', description: 'Explain code and answer questions without editing.' },
        { id: 'review', name: 'Review', description: 'Inspect changes and call out risks.' },
      ],
    },
    skills: {
      title: 'Skills',
      description: 'Turn on focused capabilities so the assistant can use them in context.',
      enabledLabel: 'Enabled',
      disabledLabel: 'Disabled',
      skills: [
        { id: 'terminal', name: 'Terminal', description: 'Run commands and inspect their output.' },
        { id: 'browser', name: 'Browser', description: 'Navigate and inspect web pages.' },
        { id: 'documents', name: 'Documents', description: 'Read and work with project documents.' },
        { id: 'image', name: 'Image understanding', description: 'Describe and reason about visual files.' },
      ],
    },
    plugins: {
      title: 'Plugins',
      description: 'Keep integrations focused and configure them only when needed.',
      enabledLabel: 'Enabled',
      disabledLabel: 'Disabled',
      configure: 'Configure',
      configured: 'Configuration saved for this session',
      pluginSettingsTitle: 'Plugin configuration',
      pluginSettingsDescription: 'This value stays in the page until the settings view closes.',
      pluginInputLabel: 'Workspace alias',
      pluginInputPlaceholder: 'Optional alias',
      save: 'Save configuration',
      plugins: [
        { id: 'git', name: 'Git integration', description: 'Show branches and change summaries.' },
        { id: 'github', name: 'GitHub', description: 'Link pull requests and issue context.' },
        { id: 'linear', name: 'Linear', description: 'Bring project tasks into the workspace.' },
      ],
    },
    sessions: {
      title: 'Sessions',
      description: 'Shape the local session list and its cleanup behavior.',
      behaviorTitle: 'Session behavior',
      behaviorDescription: 'These choices affect the local conversation list.',
      autoArchiveTitle: 'Archive completed sessions',
      autoArchiveDescription: 'Move finished sessions out of the active list.',
      confirmDeleteTitle: 'Confirm session deletion',
      confirmDeleteDescription: 'Ask before removing a session from this device.',
      restoreTitle: 'Restore last open session',
      restoreDescription: 'Reopen the most recent conversation on launch.',
      enabledLabel: 'On',
      disabledLabel: 'Off',
      retentionOptions: [
        { value: 'never', label: 'Keep forever' },
        { value: '30-days', label: 'After 30 days' },
        { value: '90-days', label: 'After 90 days' },
      ],
      retentionTitle: 'Archive retention',
      retentionDescription: 'Automatically remove archived sessions after this period.',
    },
    appearance: {
      title: 'Appearance',
      description: 'Adjust the visual details that make the workspace feel like yours.',
      accentTitle: 'Accent color',
      accentDescription: 'Choose the highlight color for controls and active states.',
      accentOptions: [
        { value: 'blue', label: 'Blue' },
        { value: 'violet', label: 'Violet' },
        { value: 'green', label: 'Green' },
        { value: 'orange', label: 'Orange' },
      ],
      densityTitle: 'Interface density',
      densityDescription: 'Choose how much information fits in each panel.',
      densityOptions: [
        { value: 'cozy', label: 'Cozy' },
        { value: 'standard', label: 'Standard' },
        { value: 'dense', label: 'Dense' },
      ],
      motionTitle: 'Reduce motion',
      motionDescription: 'Use shorter transitions and fewer animated effects.',
      contrastTitle: 'Increase contrast',
      contrastDescription: 'Make borders and secondary labels easier to distinguish.',
      enabledLabel: 'On',
      disabledLabel: 'Off',
    },
    about: {
      title: 'About',
      description: 'A quick look at this local DSH desktop build.',
      versionTitle: 'Version',
      versionValue: '0.1.0',
      buildTitle: 'Build',
      buildValue: 'Desktop preview',
      linksTitle: 'Resources',
      linksDescription: 'Open project resources in your default browser.',
      documentation: 'Documentation',
      sourceCode: 'Source code',
      reportIssue: 'Report an issue',
      resources: [
        { id: 'documentation', label: 'Documentation', href: 'https://deepseek-harness.github.io/deepseek-harness/' },
        { id: 'source-code', label: 'Source code', href: 'https://github.com/deepseek-ai/deepseek-harness' },
        { id: 'report-issue', label: 'Report an issue', href: 'https://github.com/deepseek-ai/deepseek-harness/discussions' },
      ],
      statusTitle: 'Runtime status',
      statusDescription: 'This prototype keeps settings local to the open page.',
      localOnly: 'Local only',
    },
  },
  systemTheme: 'Use the system theme',
  language: 'Language',
  english: 'English',
  fontSize: 'Font size',
  fourteenPixels: '14px',
}

const zh: SourceCopy = {
  brand: 'DSH 本地构建',
  newSession: '新会话',
  newSessionLabel: '新建会话',
  openSidebar: '打开侧边栏',
  collapseSidebar: '收起侧边栏',
  settings: '设置',
  workspaces: '工作区',
  searchSessions: '搜索会话',
  clearSearch: '清除搜索',
  viewOptions: '视图选项',
  addWorkspace: '添加工作区',
  noSessions: '暂无会话',
  noMatches: '无匹配会话',
  addWorkspaceMenu: '添加工作区…',
  heroHeadline: '探索未至之境',
  preview: '预览版',
  chooseWorkspace: '选择工作区',
  composerPlaceholder: '选择一个工作区开始',
  addFiles: '添加文件或调用指令',
  sendMessage: '发送消息',
  messagePlaceholder: '发消息或创建任务',
  settingsTitle: '设置',
  closeSettings: '关闭设置',
  settingsSections: ['常规', '模型', '智能体模式', '技能', '插件', '会话', '外观', '关于'],
  settingsNavigation: [
    { id: 'general', label: '常规' },
    { id: 'models', label: '模型' },
    { id: 'agent-modes', label: '智能体模式' },
    { id: 'skills', label: '技能' },
    { id: 'plugins', label: '插件' },
    { id: 'sessions', label: '会话' },
    { id: 'appearance', label: '外观' },
    { id: 'about', label: '关于' },
  ],
  settingsDescription: '配置本地 Harness 客户端。更改会自动保存。',
  settingsPage: {
    sectionDescriptions: {
      general: '设置权限、语言以及对话的工作方式。',
      models: '连接本地或远程模型供应商。',
      'agent-modes': '选择每种智能体模式使用的工具和默认值。',
      skills: '按需启用专注的工作能力。',
      plugins: '管理为工作区添加集成能力的扩展。',
      sessions: '决定会话的显示、保留和归档方式。',
      appearance: '微调桌面客户端的视觉风格。',
      about: '版本信息、资源链接和本地运行状态。',
    },
    general: {
      title: '常规',
      description: '设置新建对话时使用的默认选项。',
      permissionTitle: '权限模式',
      permissionDescription: '选择执行操作前是否需要确认。',
      permissionOptions: [
        { value: 'ask', label: '每次询问' },
        { value: 'allow', label: '允许工作区操作' },
        { value: 'restricted', label: '受限模式' },
      ],
      languageTitle: '语言',
      languageDescription: '选择界面使用的语言。',
      languageOptions: [
        { value: 'en', label: 'English' },
        { value: 'zh', label: '简体中文' },
      ],
      themeTitle: '外观主题',
      themeDescription: '使用浅色、深色或跟随系统。',
      themeOptions: [
        { value: 'light', label: '浅色' },
        { value: 'dark', label: '深色' },
        { value: 'system', label: '跟随系统' },
      ],
      fontSizeTitle: '字号',
      fontSizeDescription: '调整消息和控件的阅读字号。',
      decreaseFontSize: '减小字号',
      increaseFontSize: '增大字号',
      conversationTitle: '对话显示',
      conversationDescription: '选择消息之间的留白大小。',
      conversationOptions: [
        { value: 'comfortable', label: '舒适' },
        { value: 'compact', label: '紧凑' },
      ],
      busyTitle: '智能体忙碌时',
      busyDescription: '发送下一条消息时选择对应行为。',
      busyOptions: [
        { value: 'queue', label: '排队发送' },
        { value: 'interrupt', label: '发送前询问' },
      ],
    },
    models: {
      title: '模型',
      description: '选择供应商，并在需要时配置连接地址。',
      providerTitle: '模型供应商',
      providerDescription: '新建对话会使用当前选中的供应商。',
      activeLabel: '当前使用',
      configuredLabel: '已配置',
      unavailableLabel: '不可用',
      configure: '配置',
      hideConfiguration: '收起配置',
      endpointLabel: '接口地址',
      endpointPlaceholder: 'https://api.example.com/v1',
      save: '保存地址',
      saved: '本次设置中已保存接口地址',
      providers: [
        { id: 'deepseek', name: 'DeepSeek', description: '托管推理和对话模型。', model: 'DeepSeek Chat', status: 'configured' },
        { id: 'ollama', name: 'Ollama', description: '在当前设备运行模型。', model: '本地模型', status: 'available' },
        { id: 'openai-compatible', name: 'OpenAI 兼容', description: '连接兼容的模型网关。', model: '自定义接口', status: 'available' },
      ],
    },
    agentModes: {
      title: '智能体模式',
      description: '选择默认工作流，并为下一项任务保留其他模式。',
      defaultTitle: '默认模式',
      defaultDescription: '新建对话时会使用此模式。',
      modeTitle: '可用模式',
      modeDescription: '停用的模式不会出现在输入框中。',
      enabledLabel: '已启用',
      disabledLabel: '已停用',
      modes: [
        { id: 'build', name: '构建', description: '在工作区中规划并实现改动。' },
        { id: 'ask', name: '问答', description: '解释代码并回答问题，不直接编辑。' },
        { id: 'review', name: '审查', description: '检查改动并提示风险。' },
      ],
    },
    skills: {
      title: '技能',
      description: '启用专注的能力，让智能体在合适的场景使用它们。',
      enabledLabel: '已启用',
      disabledLabel: '已停用',
      skills: [
        { id: 'terminal', name: '终端', description: '运行指令并查看输出。' },
        { id: 'browser', name: '浏览器', description: '打开并检查网页。' },
        { id: 'documents', name: '文档', description: '读取和处理项目文档。' },
        { id: 'image', name: '图像理解', description: '描述并分析视觉文件。' },
      ],
    },
    plugins: {
      title: '插件',
      description: '集中管理集成，仅在需要时配置它们。',
      enabledLabel: '已启用',
      disabledLabel: '已停用',
      configure: '配置',
      configured: '本次设置中已保存配置',
      pluginSettingsTitle: '插件配置',
      pluginSettingsDescription: '关闭设置页后，此值将留在当前页面中。',
      pluginInputLabel: '工作区别名',
      pluginInputPlaceholder: '可选别名',
      save: '保存配置',
      plugins: [
        { id: 'git', name: 'Git 集成', description: '显示分支和改动摘要。' },
        { id: 'github', name: 'GitHub', description: '关联拉取请求和 issue 上下文。' },
        { id: 'linear', name: 'Linear', description: '将项目任务带入工作区。' },
      ],
    },
    sessions: {
      title: '会话',
      description: '调整本地会话列表及其清理行为。',
      behaviorTitle: '会话行为',
      behaviorDescription: '这些选项会影响本地对话列表。',
      autoArchiveTitle: '自动归档已完成会话',
      autoArchiveDescription: '将已结束的会话移出当前列表。',
      confirmDeleteTitle: '确认删除会话',
      confirmDeleteDescription: '从此设备移除会话前先进行确认。',
      restoreTitle: '恢复上次打开的会话',
      restoreDescription: '启动时重新打开最近的对话。',
      enabledLabel: '开启',
      disabledLabel: '关闭',
      retentionOptions: [
        { value: 'never', label: '永久保留' },
        { value: '30-days', label: '30 天后' },
        { value: '90-days', label: '90 天后' },
      ],
      retentionTitle: '归档保留时间',
      retentionDescription: '超过此时间后自动移除归档会话。',
    },
    appearance: {
      title: '外观',
      description: '调整细节，让工作区更符合你的习惯。',
      accentTitle: '强调色',
      accentDescription: '选择控件和活动状态使用的高亮颜色。',
      accentOptions: [
        { value: 'blue', label: '蓝色' },
        { value: 'violet', label: '紫色' },
        { value: 'green', label: '绿色' },
        { value: 'orange', label: '橙色' },
      ],
      densityTitle: '界面密度',
      densityDescription: '选择每个面板中显示的信息密度。',
      densityOptions: [
        { value: 'cozy', label: '宽松' },
        { value: 'standard', label: '标准' },
        { value: 'dense', label: '紧凑' },
      ],
      motionTitle: '减少动效',
      motionDescription: '缩短过渡并减少动画效果。',
      contrastTitle: '提高对比度',
      contrastDescription: '让边框和次要标签更容易区分。',
      enabledLabel: '开启',
      disabledLabel: '关闭',
    },
    about: {
      title: '关于',
      description: '查看这个本地 DSH 桌面构建的信息。',
      versionTitle: '版本',
      versionValue: '0.1.0',
      buildTitle: '构建类型',
      buildValue: '桌面预览版',
      linksTitle: '资源',
      linksDescription: '在默认浏览器中打开项目资源。',
      documentation: '文档',
      sourceCode: '源代码',
      reportIssue: '报告问题',
      resources: [
        { id: 'documentation', label: '文档', href: 'https://deepseek-harness.github.io/deepseek-harness/' },
        { id: 'source-code', label: '源代码', href: 'https://github.com/deepseek-ai/deepseek-harness' },
        { id: 'report-issue', label: '报告问题', href: 'https://github.com/deepseek-ai/deepseek-harness/discussions' },
      ],
      statusTitle: '运行状态',
      statusDescription: '此原型会将设置保留在当前打开的页面中。',
      localOnly: '仅限本地',
    },
  },
  systemTheme: '使用系统主题',
  language: '语言',
  english: '简体中文',
  fontSize: '字号',
  fourteenPixels: '14px',
}

export function getSourceCopy(): SourceCopy {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh') ? zh : en
}
