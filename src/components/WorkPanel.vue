<script setup lang="ts">
import { computed } from 'vue'
import { AppIcon, type AppIconName } from './icons'

import { useAppStore } from '../stores/app'

type WorkPanelTab = 'files' | 'review' | 'terminal'
type WorkPanelTabOption = {
  id: WorkPanelTab
  label: string
  icon: AppIconName
  emptyTitle: string
  emptyBody: string
}

const tabs: readonly WorkPanelTabOption[] = [
  {
    id: 'files',
    label: 'Files',
    icon: 'file-text',
    emptyTitle: '暂无文件预览',
    emptyBody: '打开文件或从对话中选择文件后，内容会显示在这里。',
  },
  {
    id: 'review',
    label: 'Review',
    icon: 'git-pull-request-arrow',
    emptyTitle: '暂无待审查变更',
    emptyBody: '当前对话还没有可查看的审查内容。',
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: 'terminal',
    emptyTitle: '终端尚未连接',
    emptyBody: '连接工作区终端后，命令输出会显示在这里。',
  },
]

const emit = defineEmits<{
  closed: []
  tabChanged: [tab: WorkPanelTab]
}>()

const store = useAppStore()
const workPanelOpen = store.workPanelOpen
const workPanelTab = store.workPanelTab
const workspace = store.workspace

const activeTab = computed<WorkPanelTabOption>(() =>
  tabs.find((tab) => tab.id === workPanelTab.value) ?? tabs[0],
)
const activeTabId = computed(() => `work-panel-tab-${activeTab.value.id}`)
const activeSurfaceId = computed(() => `work-panel-surface-${activeTab.value.id}`)
const projectName = computed(() => {
  const project = workspace.value
  if (!project) return ''
  if (project.name.trim()) return project.name.trim()
  const pathParts = project.path.split(/[\\/]/).filter(Boolean)
  return pathParts.at(-1) ?? project.path
})
const showingFiles = computed(() => activeTab.value.id === 'files')
const showingReview = computed(() => activeTab.value.id === 'review')
const showingTerminal = computed(() => activeTab.value.id === 'terminal')
const tabPaneStyle = {
  contentVisibility: 'auto',
  containIntrinsicSize: '320px',
} as const

function isActiveTab(tab: WorkPanelTabOption): boolean {
  return tab.id === activeTab.value.id
}

function selectTab(tab: WorkPanelTab) {
  store.setWorkPanelTab(tab)
  emit('tabChanged', tab)
}

function closePanel() {
  store.setWorkPanelOpen(false)
  emit('closed')
}
</script>

<template>
  <aside
    v-if="workPanelOpen"
    id="work-panel"
    class="work-panel"
    aria-label="工作面板"
  >
    <div class="work-panel-main">
      <header class="work-panel-header">
        <div class="work-panel-tab-strip-wrap">
          <div class="work-panel-tab-strip" role="tablist" aria-label="工作面板标签">
            <div
              v-for="tab in tabs"
              :key="tab.id"
              class="work-panel-tab"
              :class="{ active: isActiveTab(tab) }"
            >
              <button
                type="button"
                role="tab"
                class="work-panel-tab-button"
                :id="`work-panel-tab-${tab.id}`"
                :aria-controls="`work-panel-surface-${tab.id}`"
                :aria-selected="isActiveTab(tab)"
                @click="selectTab(tab.id)"
              >
                <span class="work-panel-tab-icon" aria-hidden="true"><AppIcon :name="tab.icon" :size="15" /></span>
                <span class="work-panel-tab-label">{{ tab.label }}</span>
              </button>
            </div>
          </div>
        </div>
        <div class="work-panel-actions">
          <button type="button" class="work-panel-close" aria-label="关闭工作面板" @click="closePanel">
            <AppIcon name="x" :size="16" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div class="work-panel-body">
        <section
          class="work-panel-tabpane"
          role="tabpanel"
          :id="activeSurfaceId"
          :aria-labelledby="activeTabId"
          :style="tabPaneStyle"
        >
          <div class="work-panel-empty" data-empty-state="true">
            <span class="work-panel-empty-icon" aria-hidden="true"><AppIcon :name="activeTab.icon" :size="24" /></span>
            <h2>{{ activeTab.emptyTitle }}</h2>
            <p>{{ activeTab.emptyBody }}</p>
            <p v-if="showingFiles && projectName" class="work-panel-empty-context">
              当前工作区：{{ projectName }}
            </p>
            <p v-else-if="showingReview" class="work-panel-empty-context">
              审查面板会在产生变更后可用。
            </p>
            <p v-else-if="showingTerminal" class="work-panel-empty-context">
              当前仅展示面板入口，不会伪造终端输出。
            </p>
          </div>
        </section>
      </div>
    </div>
  </aside>
</template>
