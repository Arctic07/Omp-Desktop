<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import AppIcon, { type AppIconName } from '../components/icons'
import EmptyState from '../components/EmptyState.vue'
import ProjectsPage from './ProjectsPage.vue'
import SettingsMenuSelect, { type SettingsMenuSelectOption } from '../components/SettingsMenuSelect.vue'
import SettingsRow from '../components/SettingsRow.vue'
import { useAppStore, type SettingsTab } from '../stores/app'

type Theme = 'dark' | 'light' | 'system'
type Language = 'zh-CN' | 'en-US'
type FontSize = 'small' | 'medium' | 'large'
type PermissionMode = 'ask' | 'accept-edits' | 'auto'
type AgentProvider = 'none' | 'openai-compatible' | 'anthropic'
type McpServer = { id: number; name: string; endpoint: string }
type NavItem = { id: SettingsTab; label: string; group: string; keywords: string[]; name: AppIconName }
type SettingsShape = { theme: Theme; language: Language; fontSize: FontSize; defaultPermissionMode: PermissionMode; commandShell: string; largePasteThreshold: number }

const router = useRouter()
const store = useAppStore()
const query = ref('')
const instructionDraft = ref('')
const savedInstructions = ref('')
const skillsDirectory = ref('')
const skillsDirectorySaved = ref('')
const agentProvider = ref<AgentProvider>('none')
const agentModel = ref('')
const mcpServerName = ref('')
const mcpServerEndpoint = ref('')
const mcpServers = ref<McpServer[]>([])
const mcpFormMessage = ref('')
const importFileName = ref('')
const importFileInput = ref<HTMLInputElement | null>(null)
let nextMcpServerId = 0

const themeOptions = [
  { id: 'dark', label: '深色' },
  { id: 'light', label: '浅色' },
  { id: 'system', label: '跟随系统' },
] as const satisfies readonly SettingsMenuSelectOption[]
const languageOptions = [
  { id: 'zh-CN', label: '简体中文' },
  { id: 'en-US', label: 'English' },
] as const satisfies readonly SettingsMenuSelectOption[]
const fontSizeOptions = [
  { id: 'small', label: '小' },
  { id: 'medium', label: '中' },
  { id: 'large', label: '大' },
] as const satisfies readonly SettingsMenuSelectOption[]
const permissionOptions = [
  { id: 'ask', label: '每次询问' },
  { id: 'accept-edits', label: '接受编辑' },
  { id: 'auto', label: '自动' },
] as const satisfies readonly SettingsMenuSelectOption[]
const agentProviderOptions = [
  { id: 'none', label: '未选择' },
  { id: 'openai-compatible', label: 'OpenAI 兼容' },
  { id: 'anthropic', label: 'Anthropic' },
] as const satisfies readonly SettingsMenuSelectOption[]

const navItems: NavItem[] = [
  { id: 'general', label: '常规', group: '偏好设置', keywords: ['主题', '语言', '字体'], name: 'sliders-horizontal' },
  { id: 'ai', label: 'AI', group: '偏好设置', keywords: ['权限', '终端', '粘贴'], name: 'sparkles' },
  { id: 'shortcuts', label: '快捷键', group: '偏好设置', keywords: ['键盘', '快捷操作'], name: 'keyboard' },
  { id: 'instructions', label: '指令说明', group: '工作区', keywords: ['说明', '提示'], name: 'file-text' },
  { id: 'agent', label: 'Agent', group: '工作区', keywords: ['代理', '模型', '提供方', 'provider'], name: 'bot' },
  { id: 'projects', label: '项目', group: '工作区', keywords: ['项目', '工作区'], name: 'archive' },
  { id: 'skills', label: 'Agent Skills', group: 'Agent 资源', keywords: ['技能', 'skill', '资源目录'], name: 'book-open' },
  { id: 'mcp', label: 'MCP 服务器', group: 'Agent 资源', keywords: ['mcp', '服务器', '端点'], name: 'server' },
  { id: 'subagents', label: '子代理', group: 'Agent 资源', keywords: ['subagent', '子代理', '并行'], name: 'bot' },
  { id: 'import', label: '导入会话', group: '数据', keywords: ['导入', '会话', '文件', 'import'], name: 'download' },
  { id: 'about', label: '关于', group: '应用', keywords: ['版本', '信息'], name: 'info' },
]
const activeTab = computed<SettingsTab>({ get: () => store.settingsTab.value, set: (value) => store.setSettingsTab(value) })
const settings = computed(() => store.settings.value)
const filteredItems = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  if (!needle) return navItems
  return navItems.filter((item) => [item.label, ...item.keywords].some((value) => value.toLocaleLowerCase().includes(needle)))
})
const groupedItems = computed(() => {
  const groups = new Map<string, NavItem[]>()
  for (const item of filteredItems.value) groups.set(item.group, [...(groups.get(item.group) ?? []), item])
  return [...groups.entries()].map(([label, items]) => ({ label, items }))
})
const activeTitle = computed(() => navItems.find((item) => item.id === activeTab.value)?.label ?? '设置')
const themeValue = computed<Theme>({ get: () => settings.value.theme, set: (value) => store.setTheme(value) })
const languageValue = computed<Language>({ get: () => settings.value.language, set: (value) => store.setLanguage(value) })
const agentHasProvider = computed(() => agentProvider.value !== 'none')
const agentProviderLabel = computed(() => {
  if (agentProvider.value === 'openai-compatible') return 'OpenAI 兼容提供方'
  if (agentProvider.value === 'anthropic') return 'Anthropic'
  return '未选择提供方'
})
const permissionLabel = computed(() => {
  if (settings.value.defaultPermissionMode === 'accept-edits') return '接受编辑后继续'
  if (settings.value.defaultPermissionMode === 'auto') return '自动执行'
  return '每次操作前询问'
})

function updateSetting<K extends keyof SettingsShape>(key: K, value: SettingsShape[K]) {
  store.settings.value = { ...store.settings.value, [key]: value }
}
function eventValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}
function updateTheme(value: string) {
  if (value === 'dark' || value === 'light' || value === 'system') store.setTheme(value)
}
function updateLanguage(value: string) {
  if (value === 'zh-CN' || value === 'en-US') store.setLanguage(value)
}
function updateFontSize(value: string) {
  updateSetting('fontSize', value as FontSize)
}
function updatePermissionMode(value: string) {
  updateSetting('defaultPermissionMode', value as PermissionMode)
}
function updateAgentProvider(value: string) {
  if (value === 'none' || value === 'openai-compatible' || value === 'anthropic') agentProvider.value = value
}
function updateCommandShell(event: Event) {
  updateSetting('commandShell', eventValue(event))
}
function updateLargePasteThreshold(event: Event) {
  updateSetting('largePasteThreshold', Number(eventValue(event)))
}
function saveInstructions() {
  savedInstructions.value = instructionDraft.value.trim()
}
function saveSkillsDirectory() {
  const normalizedDirectory = skillsDirectory.value.trim()
  if (!normalizedDirectory) return
  skillsDirectory.value = normalizedDirectory
  skillsDirectorySaved.value = normalizedDirectory
}
function addMcpServer() {
  const name = mcpServerName.value.trim()
  const endpoint = mcpServerEndpoint.value.trim()
  if (!name || !endpoint) {
    mcpFormMessage.value = '请填写服务器名称和端点。'
    return
  }
  mcpServers.value = [...mcpServers.value, { id: nextMcpServerId, name, endpoint }]
  nextMcpServerId += 1
  mcpServerName.value = ''
  mcpServerEndpoint.value = ''
  mcpFormMessage.value = '已添加到当前窗口，尚未连接服务器。'
}
function removeMcpServer(id: number) {
  mcpServers.value = mcpServers.value.filter((server) => server.id !== id)
}
function handleImportFile(event: Event) {
  const input = event.target as HTMLInputElement | null
  importFileName.value = input?.files?.[0]?.name ?? ''
}
function clearImportFile() {
  importFileName.value = ''
  if (importFileInput.value) importFileInput.value.value = ''
}
</script>

<template>
  <section class="settings-shell settings-shell-full" aria-label="设置">
    <div class="settings-titlebar" aria-hidden="true" />
    <aside class="settings-nav" aria-label="设置导航">
      <div class="settings-nav-top">
        <label class="settings-search-wrap">
          <AppIcon name="search" :size="14" aria-hidden="true" />
          <input v-model="query" class="settings-search" type="search" placeholder="搜索设置" aria-label="搜索设置" />
        </label>
      </div>
      <div class="settings-nav-scroll">
        <div v-if="groupedItems.length === 0" class="settings-nav-empty">没有匹配的设置</div>
        <div v-for="group in groupedItems" v-else :key="group.label" class="settings-nav-group">
          <div class="settings-nav-group-label">{{ group.label }}</div>
          <button v-for="item in group.items" :key="item.id" class="settings-nav-item" :class="{ active: activeTab === item.id }" type="button" @click="activeTab = item.id">
            <span class="settings-nav-icon"><AppIcon :name="item.name" :size="14" aria-hidden="true" /></span><span class="settings-nav-label">{{ item.label }}</span>
          </button>
        </div>
      </div>
      <div class="settings-nav-footer"><button class="settings-back" type="button" @click="void router.push('/')">返回工作台</button></div>
    </aside>

    <main class="settings-content">
      <div class="settings-content-inner">
        <h1 class="settings-section-title">{{ activeTitle }}</h1>

        <div v-if="activeTab === 'general'" class="settings-stack">
          <section class="settings-card-block settings-panel"><h2 class="settings-card-heading">外观</h2>
            <SettingsRow title="主题" description="选择工作台的颜色主题。"><SettingsMenuSelect :model-value="themeValue" :options="themeOptions" label="主题" @update:model-value="updateTheme" /></SettingsRow>
            <SettingsRow title="语言" description="选择界面显示语言。"><SettingsMenuSelect :model-value="languageValue" :options="languageOptions" label="语言" @update:model-value="updateLanguage" /></SettingsRow>
            <SettingsRow title="字体大小" description="调整消息和设置文字的基础大小。"><SettingsMenuSelect :model-value="settings.fontSize" :options="fontSizeOptions" label="字体大小" @update:model-value="updateFontSize" /></SettingsRow>
          </section>
        </div>

        <div v-else-if="activeTab === 'ai'" class="settings-stack">
          <section class="settings-card-block settings-panel"><h2 class="settings-card-heading">会话默认值</h2>
            <SettingsRow title="默认权限" description="控制会话执行操作前的确认策略。"><SettingsMenuSelect :model-value="settings.defaultPermissionMode" :options="permissionOptions" label="默认权限" @update:model-value="updatePermissionMode" /></SettingsRow>
            <SettingsRow title="命令 Shell" description="记录新会话使用的命令解释器。"><input :value="settings.commandShell" class="field-input settings-inline-input" aria-label="命令 Shell" @change="updateCommandShell" /></SettingsRow>
            <SettingsRow title="大段粘贴阈值" description="超过此字符数的粘贴内容会提示确认。"><input :value="settings.largePasteThreshold" class="field-input settings-number-control" type="number" min="0" step="100" aria-label="大段粘贴阈值" @change="updateLargePasteThreshold" /></SettingsRow>
          </section>
        </div>

        <div v-else-if="activeTab === 'shortcuts'" class="settings-stack">
          <section class="settings-card-block settings-panel"><h2 class="settings-card-heading">快捷操作</h2>
            <SettingsRow title="新建会话" description="快速打开一个新的工作会话。"><kbd class="settings-key">Ctrl / ⌘ + N</kbd></SettingsRow>
            <SettingsRow title="切换侧栏" description="显示或隐藏项目和会话列表。"><kbd class="settings-key">Ctrl / ⌘ + B</kbd></SettingsRow>
            <SettingsRow title="发送消息" description="在聊天输入框中提交当前消息。"><kbd class="settings-key">Enter</kbd></SettingsRow>
          </section>
        </div>

        <div v-else-if="activeTab === 'instructions'" class="settings-stack">
          <section class="settings-card-block settings-panel"><h2 class="settings-card-heading">工作指令</h2><p class="settings-card-description">这些说明会帮助你在每次工作会话中保持一致的上下文。</p><textarea v-model="instructionDraft" class="field-textarea settings-instruction-editor" rows="9" aria-label="工作指令" placeholder="写下你希望助手遵循的工作方式" /><div class="settings-panel-actions"><button class="btn btn-primary" type="button" @click="saveInstructions">保存说明</button><span v-if="savedInstructions" class="settings-save-note" role="status">已保存当前窗口说明</span></div></section>
        </div>

        <div v-else-if="activeTab === 'agent'" class="settings-stack">
          <section class="settings-card-block settings-panel">
            <h2 class="settings-card-heading">模型提供方</h2>
            <p class="settings-card-description">选择仅用于当前窗口的模型上下文；此页面不会连接或保存外部提供方配置。</p>
            <SettingsRow title="提供方" description="当前没有后端提供方目录，选择不会发起网络请求。">
              <SettingsMenuSelect :model-value="agentProvider" :options="agentProviderOptions" label="Agent 模型提供方" @update:model-value="updateAgentProvider" />
            </SettingsRow>
            <SettingsRow title="模型" description="填写要在当前窗口中标记的模型名称。">
              <input v-model="agentModel" class="field-input settings-inline-input" type="text" :disabled="!agentHasProvider" aria-label="Agent 模型名称" />
            </SettingsRow>
            <SettingsRow title="当前选择" description="这只是渲染器状态，不代表提供方已经可用。">
              <span class="settings-about-meta">{{ agentProviderLabel }}<span v-if="agentModel"> · {{ agentModel }}</span></span>
            </SettingsRow>
          </section>
          <section class="settings-card-block settings-panel">
            <h2 class="settings-card-heading">权限摘要</h2>
            <SettingsRow title="默认权限" description="新会话会沿用 AI 设置中的确认策略。"><span class="settings-about-meta">{{ permissionLabel }}</span></SettingsRow>
            <SettingsRow title="资源边界" description="没有提供方或后端资源时，Agent 不会执行模型请求。"><span class="settings-about-meta">仅当前窗口状态</span></SettingsRow>
          </section>
          <EmptyState v-if="!agentHasProvider" title="尚无可用模型提供方" description="选择提供方只会更新当前窗口的显示状态；连接和凭据管理需要尚未提供的后端能力。">
            <template #icon><AppIcon name="bot" :size="16" aria-hidden="true" /></template>
          </EmptyState>
        </div>

        <div v-else-if="activeTab === 'skills'" class="settings-stack">
          <section class="settings-card-block settings-panel">
            <h2 class="settings-card-heading">Agent Skills 资源目录</h2>
            <p class="settings-card-description">填写资源目录用于记录工作区约定；当前页面不会读取目录或生成 Skills 记录。</p>
            <SettingsRow title="资源目录" description="目录路径仅保存在当前窗口状态中。">
              <input v-model="skillsDirectory" class="field-input settings-inline-input" type="text" aria-label="Agent Skills 资源目录" />
            </SettingsRow>
            <div class="settings-panel-actions">
              <button class="btn btn-primary" type="button" :disabled="!skillsDirectory.trim()" @click="saveSkillsDirectory">保存目录</button>
              <span v-if="skillsDirectorySaved" class="settings-save-note" role="status">当前窗口目录：{{ skillsDirectorySaved }}</span>
            </div>
          </section>
          <section class="settings-card-block settings-panel">
            <h2 class="settings-card-heading">可用 Skills</h2>
            <EmptyState compact title="尚无可用 Agent Skills" description="当前没有可读取的资源目录或 Skills 后端索引。">
              <template #icon><AppIcon name="book-open" :size="16" aria-hidden="true" /></template>
            </EmptyState>
          </section>
        </div>

        <div v-else-if="activeTab === 'mcp'" class="settings-stack">
          <section class="settings-card-block settings-panel">
            <h2 class="settings-card-heading">添加 MCP 服务器</h2>
            <p class="settings-card-description">服务器行只在当前窗口维护，不会连接、探测或写入 MCP 配置。</p>
            <SettingsRow title="名称" description="为当前窗口中的服务器行设置一个可识别名称。">
              <input v-model="mcpServerName" class="field-input settings-inline-input" type="text" aria-label="MCP 服务器名称" />
            </SettingsRow>
            <SettingsRow title="端点" description="记录服务器端点文本；不会验证或请求此地址。">
              <input v-model="mcpServerEndpoint" class="field-input settings-inline-input" type="url" aria-label="MCP 服务器端点" />
            </SettingsRow>
            <div class="settings-panel-actions">
              <button class="btn btn-primary" type="button" :disabled="!mcpServerName.trim() || !mcpServerEndpoint.trim()" @click="addMcpServer">添加到当前窗口</button>
              <span v-if="mcpFormMessage" class="settings-save-note" role="status">{{ mcpFormMessage }}</span>
            </div>
          </section>
          <section class="settings-card-block settings-panel">
            <h2 class="settings-card-heading">当前窗口服务器</h2>
            <EmptyState v-if="mcpServers.length === 0" compact title="尚未添加 MCP 服务器" description="添加的行不会代表真实连接，页面也不会伪造服务器状态。">
              <template #icon><AppIcon name="settings" :size="16" aria-hidden="true" /></template>
            </EmptyState>
            <div v-else>
              <div v-for="server in mcpServers" :key="server.id" class="settings-row">
                <div class="settings-row-copy">
                  <div class="settings-row-title">{{ server.name }}</div>
                  <div class="settings-row-description">{{ server.endpoint }}</div>
                </div>
                <button class="btn btn-ghost" type="button" :aria-label="`移除 ${server.name}`" @click="removeMcpServer(server.id)">移除</button>
              </div>
            </div>
          </section>
        </div>

        <div v-else-if="activeTab === 'subagents'" class="settings-stack">
          <section class="settings-card-block settings-panel">
            <EmptyState title="尚无可用子代理" description="当前应用没有子代理清单或调度后端，页面不会虚构可运行的子代理。">
              <template #icon><AppIcon name="bot" :size="16" aria-hidden="true" /></template>
            </EmptyState>
          </section>
          <section class="settings-card-block settings-panel">
            <h2 class="settings-card-heading">子代理说明</h2>
            <p class="settings-card-description">子代理需要由后端提供角色、模型和生命周期管理。当前窗口只展示能力边界，不会创建任务或读取远程配置。</p>
            <SettingsRow title="当前状态" description="没有可执行的子代理资源。"><span class="settings-about-meta">未启用</span></SettingsRow>
          </section>
        </div>

        <div v-else-if="activeTab === 'import'" class="settings-stack">
          <section class="settings-card-block settings-panel">
            <h2 class="settings-card-heading">导入会话</h2>
            <p class="settings-card-description">选择一个会话文件以确认导入入口；当前页面只显示文件名，不读取内容或调用导入 API。</p>
            <div class="settings-row">
              <div class="settings-row-copy">
                <label class="settings-row-title" for="settings-import-file">会话文件</label>
                <div class="settings-row-description">支持 JSON 或 JSONL 文件选择。</div>
              </div>
              <input id="settings-import-file" ref="importFileInput" class="field-input settings-inline-input" type="file" accept=".json,.jsonl" aria-label="选择会话文件" @change="handleImportFile" />
            </div>
            <div v-if="importFileName" class="settings-panel-actions">
              <span class="settings-about-meta" role="status">已选择：{{ importFileName }}</span>
              <button class="btn btn-secondary" type="button" @click="clearImportFile">清除选择</button>
            </div>
            <EmptyState v-else compact title="尚未选择会话文件" description="选择文件后仍不会读取或导入内容，直到后端能力可用。">
              <template #icon><AppIcon name="file-text" :size="16" aria-hidden="true" /></template>
            </EmptyState>
          </section>
          <section class="settings-card-block settings-panel">
            <h2 class="settings-card-heading">导入边界</h2>
            <p class="settings-card-description">会话导入需要文件解析、校验和存储接口。当前应用只提供安全的文件选择入口，不会伪造导入结果。</p>
          </section>
        </div>

        <ProjectsPage v-else-if="activeTab === 'projects'" embedded />
        <div v-else class="settings-stack">
          <section class="settings-card-block settings-panel"><h2 class="settings-card-heading">OMP Desktop</h2><SettingsRow title="应用说明" description="这是当前 Vue 3 + Tauri 工作台的设置区域。"><span class="settings-about-meta">桌面工作台</span></SettingsRow><SettingsRow title="数据来源" description="项目与会话内容由当前窗口状态提供，不会伪造远程结果。"><span class="settings-about-meta">本地状态</span></SettingsRow></section>
        </div>
      </div>
    </main>
  </section>
</template>
