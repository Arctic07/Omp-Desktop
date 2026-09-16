<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'
import FishLogo from './FishLogo.vue'

interface DemoSession {
  id: string
  title: string
  time: string
}

interface DemoProject {
  id: string
  name: string
  path: string
  sessions: readonly DemoSession[]
}

const { copy } = useAppSettings()

const props = defineProps<{
  collapsed: boolean
  activeSessionId: string | null
}>()

const emit = defineEmits<{
  newSession: []
  selectSession: [sessionId: string]
  toggle: []
  openSettings: []
  addWorkspace: []
}>()

const demoProjects: readonly DemoProject[] = [
  {
    id: 'omp-desktop',
    name: 'Omp Desktop',
    path: 'C:\\project\\Omp-Desktop',
    sessions: [
      { id: 'session-omp-build', title: '首页 Composer 优化', time: '现在' },
      { id: 'session-omp-settings', title: '常规设置功能', time: '12 分钟' },
    ],
  },
  {
    id: 'deepseek-harness',
    name: 'deepseek-harness',
    path: 'C:\\project\\deepseek-harness',
    sessions: [
      { id: 'session-harness-ui', title: '检查 UI 信息流', time: '昨天' },
      { id: 'session-harness-tools', title: '工具调用输出', time: '周一' },
    ],
  },
  {
    id: 'scratch',
    name: '实验项目',
    path: 'D:\\workspace\\scratch',
    sessions: [
      { id: 'session-scratch', title: '整理实验代码', time: '上周' },
    ],
  },
]

const searchExpanded = ref(false)
const query = ref('')
const workspaceMenuOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)
const expandedProjectIds = ref(demoProjects.map((project) => project.id))

const visibleProjects = computed(() => {
  const term = query.value.trim().toLowerCase()
  if (term.length === 0) return demoProjects

  return demoProjects
    .map((project) => {
      const projectMatches = project.name.toLowerCase().includes(term)
      return {
        ...project,
        sessions: projectMatches
          ? project.sessions
          : project.sessions.filter((session) => session.title.toLowerCase().includes(term)),
      }
    })
    .filter((project) => project.name.toLowerCase().includes(term) || project.sessions.length > 0)
})

const hasVisibleSessions = computed(() => visibleProjects.value.length > 0)

function startSession() {
  workspaceMenuOpen.value = false
  emit('newSession')
}

function selectSession(sessionId: string) {
  emit('selectSession', sessionId)
}

function toggleProject(projectId: string) {
  expandedProjectIds.value = expandedProjectIds.value.includes(projectId)
    ? expandedProjectIds.value.filter((id) => id !== projectId)
    : [...expandedProjectIds.value, projectId]
}

function isProjectExpanded(projectId: string) {
  return expandedProjectIds.value.includes(projectId)
}

async function expandSearch() {
  workspaceMenuOpen.value = false
  searchExpanded.value = true
  await nextTick()
  searchInput.value?.focus()
}

function closeSearch() {
  query.value = ''
  searchExpanded.value = false
}

function addWorkspace() {
  workspaceMenuOpen.value = false
  emit('addWorkspace')
}
</script>

<template>
  <aside class="dsh-sidebar" :class="{ 'dsh-sidebar-collapsed': props.collapsed }">
    <div class="dsh-sidebar-logo-row">
      <button
        v-if="!props.collapsed"
        class="dsh-sidebar-brand"
        type="button"
        :aria-label="copy.newSessionLabel"
        @click="startSession"
      >
        <span class="dsh-sidebar-brand-identity" aria-hidden="true">
          <FishLogo class="dsh-sidebar-brand-mark" :size="24" />
          <span class="dsh-sidebar-brand-name">{{ copy.brand }}</span>
        </span>
      </button>
      <button
        class="dsh-sidebar-icon-button dsh-sidebar-toggle"
        type="button"
        :aria-label="props.collapsed ? copy.openSidebar : copy.collapseSidebar"
        @click="emit('toggle')"
      >
        <FishLogo v-if="props.collapsed" class="dsh-sidebar-rail-mark" :size="24" />
        <AppIcon v-else name="panel-left" :size="16" />
      </button>
    </div>

    <button class="dsh-sidebar-new-session" type="button" @click="startSession">
      <AppIcon name="plus" :size="props.collapsed ? 18 : 14" />
      <span v-if="!props.collapsed">{{ copy.newSession }}</span>
    </button>

    <div class="dsh-sidebar-region">
      <section class="dsh-workspace-browser" :class="{ 'dsh-workspace-browser-rail': props.collapsed }">
        <div v-if="!props.collapsed" class="dsh-workspace-header">
          <span v-if="!searchExpanded" class="dsh-workspace-section-label">{{ copy.workspaces }}</span>
          <div class="dsh-workspace-search-slot" :class="{ 'dsh-workspace-search-slot-expanded': searchExpanded }">
            <div class="dsh-workspace-search" :class="{ 'dsh-workspace-search-expanded': searchExpanded }">
              <button
                class="dsh-workspace-search-button"
                type="button"
                :aria-label="copy.searchSessions"
                :aria-expanded="searchExpanded"
                @click="expandSearch"
              >
                <AppIcon name="search" :size="searchExpanded ? 11 : 14" />
              </button>
              <input
                v-if="searchExpanded"
                ref="searchInput"
                v-model="query"
                class="dsh-workspace-search-input"
                type="search"
                :placeholder="`${copy.searchSessions}...`"
                :aria-label="copy.searchSessions"
                @keydown.esc="closeSearch"
              />
              <button
                v-if="searchExpanded"
                class="dsh-workspace-search-clear"
                type="button"
                :aria-label="copy.clearSearch"
                @click="closeSearch"
              >
                <AppIcon name="x" :size="14" />
              </button>
            </div>
          </div>
          <div class="dsh-workspace-header-actions" :class="{ 'dsh-workspace-header-actions-hidden': searchExpanded }">
            <button class="dsh-workspace-icon-button" type="button" :aria-label="copy.viewOptions">
              <AppIcon name="sliders-horizontal" :size="16" />
            </button>
            <button class="dsh-workspace-icon-button" type="button" :aria-label="copy.addWorkspace" @click="workspaceMenuOpen = !workspaceMenuOpen">
              <AppIcon name="folder-plus" :size="16" />
            </button>
          </div>
          <div v-if="workspaceMenuOpen" class="dsh-workspace-menu" role="menu">
            <button type="button" role="menuitem" @click="addWorkspace">{{ copy.addWorkspaceMenu }}</button>
          </div>
        </div>

        <div v-else class="dsh-workspace-rail-search">
          <button class="dsh-workspace-search-button" type="button" :aria-label="copy.searchSessions" @click="expandSearch">
            <AppIcon name="search" :size="18" />
          </button>
        </div>

        <div class="dsh-workspace-list" :class="{ 'dsh-workspace-list-quiet': !hasVisibleSessions }">
          <template v-if="hasVisibleSessions">
            <section v-for="project in visibleProjects" :key="project.id" class="dsh-workspace-project">
              <button
                class="dsh-workspace-project-row"
                type="button"
                :aria-expanded="isProjectExpanded(project.id)"
                :title="project.path"
                @click="toggleProject(project.id)"
              >
                <AppIcon name="folder" :size="15" />
                <span class="dsh-workspace-project-name">{{ project.name }}</span>
                <AppIcon
                  name="chevron-right"
                  :size="13"
                  class="dsh-workspace-project-chevron"
                  :class="{ 'dsh-workspace-project-chevron-open': isProjectExpanded(project.id) }"
                />
              </button>
              <div v-if="isProjectExpanded(project.id)" class="dsh-workspace-session-list">
                <button
                  v-for="session in project.sessions"
                  :key="session.id"
                  class="dsh-workspace-session-row"
                  :class="{ 'dsh-workspace-session-row-active': props.activeSessionId === session.id }"
                  type="button"
                  :aria-current="props.activeSessionId === session.id ? 'page' : undefined"
                  @click="selectSession(session.id)"
                >
                  <span class="dsh-workspace-session-dot" aria-hidden="true" />
                  <span class="dsh-workspace-session-title">{{ session.title }}</span>
                  <span class="dsh-workspace-session-time">{{ session.time }}</span>
                </button>
              </div>
            </section>
          </template>
          <div v-else class="dsh-workspace-empty">{{ copy.noMatches }}</div>
        </div>
      </section>
    </div>

    <div class="dsh-sidebar-footer">
      <button class="dsh-sidebar-settings" type="button" :aria-label="copy.settings" @click="emit('openSettings')">
        <AppIcon name="settings" :size="16" />
        <span v-if="!props.collapsed">{{ copy.settings }}</span>
      </button>
    </div>
  </aside>
</template>
