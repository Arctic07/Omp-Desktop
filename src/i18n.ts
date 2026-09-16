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
  settingsSections: readonly string[]
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
  settingsSections: ['General', 'Models', 'Agent modes', 'Skills', 'Plugins', 'Sessions', 'Appearance', 'About'],
  settingsDescription: 'Configure the local Harness client. Changes are saved automatically.',
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
  settingsSections: ['常规', '模型', '智能体模式', '技能', '插件', '会话', '外观', '关于'],
  settingsDescription: '配置本地 Harness 客户端。更改会自动保存。',
  settingsTitle: '设置',
  systemTheme: '使用系统主题',
  language: '语言',
  english: '简体中文',
  fontSize: '字号',
  fourteenPixels: '14px',
}

export function getSourceCopy(): SourceCopy {
  return typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh') ? zh : en
}
