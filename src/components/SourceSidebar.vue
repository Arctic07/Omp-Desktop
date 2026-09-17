<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref } from 'vue'

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
    name: 'omp-tauri-des',
    path: 'C:\\project\\omp-tauri-des',
    sessions: [
      { id: 'session-omp-build', title: '评估OMPSDK项目集成可...', time: '1小时' },
    ],
  },
  {
    id: 'codex',
    name: 'Codex',
    path: 'C:\\Users\\Administrator\\Documents\\Codex',
    sessions: [
      { id: 'session-codex-source', title: '查找项目源码与前端位置', time: '1小时' },
      { id: 'session-codex-fun', title: '你好彩票娱乐', time: '1小时' },
      { id: 'session-codex-thinking', title: '询问AI的思考等级', time: '14天' },
      { id: 'session-codex-chinese', title: '中文问候你好', time: '14天' },
      { id: 'session-codex-hello', title: '你好', time: '14天' },
      { id: 'session-codex-layout', title: '检查前端界面布局', time: '14天' },
      { id: 'session-codex-files', title: '整理项目文件', time: '14天' },
    ],
  },
]

const searchExpanded = ref(false)
const query = ref('')
const workspaceMenuOpen = ref(false)
const projectMenuOpenId = ref<string | null>(null)
const projectHoverId = ref<string | null>(null)
const projectHoverTop = ref(0)
const projectHoverTimer = ref<number | null>(null)
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

const expandedSessionProjectIds = ref<string[]>([])

function visibleSessions(project: DemoProject): readonly DemoSession[] {
  return expandedSessionProjectIds.value.includes(project.id) ? project.sessions : project.sessions.slice(0, 5)
}

function hiddenSessionCount(project: DemoProject): number {
  return Math.max(0, project.sessions.length - 5)
}

function sessionOverflowLabel(project: DemoProject): string {
  return expandedSessionProjectIds.value.includes(project.id)
    ? copy.value.collapseSessions
    : copy.value.expandSessions.replace('{count}', String(hiddenSessionCount(project)))
}

function toggleSessionOverflow(projectId: string): void {
  expandedSessionProjectIds.value = expandedSessionProjectIds.value.includes(projectId)
    ? expandedSessionProjectIds.value.filter((id) => id !== projectId)
    : [...expandedSessionProjectIds.value, projectId]
}

function isProjectActive(project: DemoProject): boolean {
  if (props.activeSessionId === null) return project.id === 'codex'
  return project.sessions.some((session) => session.id === props.activeSessionId)
}

function startSession() {
  workspaceMenuOpen.value = false
  projectMenuOpenId.value = null
  emit('newSession')
}

function selectSession(sessionId: string) {
  emit('selectSession', sessionId)
}

function toggleProject(projectId: string) {
  projectMenuOpenId.value = null
  expandedProjectIds.value = expandedProjectIds.value.includes(projectId)
    ? expandedProjectIds.value.filter((id) => id !== projectId)
    : [...expandedProjectIds.value, projectId]
}

function toggleProjectMenu(projectId: string) {
  workspaceMenuOpen.value = false
  projectMenuOpenId.value = projectMenuOpenId.value === projectId ? null : projectId
}

function closeProjectMenu() {
  projectMenuOpenId.value = null
}

function clearProjectHoverTimer(): void {
  if (projectHoverTimer.value === null) return
  window.clearTimeout(projectHoverTimer.value)
  projectHoverTimer.value = null
}

function showProjectHover(projectId: string, event: MouseEvent): void {
  if (props.collapsed) return
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  clearProjectHoverTimer()
  projectHoverTimer.value = window.setTimeout(() => {
    projectHoverId.value = projectId
    projectHoverTop.value = target.getBoundingClientRect().top
    projectHoverTimer.value = null
  }, 1000)
}

function hideProjectHover(): void {
  clearProjectHoverTimer()
  projectHoverId.value = null
}

onUnmounted(() => {
  clearProjectHoverTimer()
})

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
  <aside class="omp-sidebar" :class="{ 'omp-sidebar-collapsed': props.collapsed }">
    <div class="omp-sidebar-logo-row">
      <button
        v-if="!props.collapsed"
        class="omp-sidebar-brand"
        type="button"
        :aria-label="copy.newSessionLabel"
        @click="startSession"
      >
        <span class="omp-sidebar-brand-identity" aria-hidden="true">
          <FishLogo class="omp-sidebar-brand-mark" :size="24" />
          <span class="omp-sidebar-brand-name">{{ copy.brand }}</span>
        </span>
      </button>
      <button
        class="omp-sidebar-icon-button omp-sidebar-toggle"
        type="button"
        :aria-label="props.collapsed ? copy.openSidebar : copy.collapseSidebar"
        @click="emit('toggle')"
      >
        <FishLogo v-if="props.collapsed" class="omp-sidebar-rail-mark" :size="24" />
        <AppIcon v-else name="panel-left" :size="16" />
      </button>
    </div>

    <button class="omp-sidebar-new-session" type="button" @click="startSession">
      <AppIcon name="plus" :size="props.collapsed ? 18 : 14" />
      <span v-if="!props.collapsed">{{ copy.newSession }}</span>
    </button>

    <div class="omp-sidebar-region">
      <section class="omp-workspace-browser" :class="{ 'omp-workspace-browser-rail': props.collapsed }">
        <div v-if="!props.collapsed" class="omp-workspace-header">
          <span v-if="!searchExpanded" class="omp-workspace-section-label">{{ copy.workspaces }}</span>
          <div class="omp-workspace-search-slot" :class="{ 'omp-workspace-search-slot-expanded': searchExpanded }">
            <div class="omp-workspace-search" :class="{ 'omp-workspace-search-expanded': searchExpanded }">
              <button
                class="omp-workspace-search-button"
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
                class="omp-workspace-search-input"
                type="search"
                :placeholder="`${copy.searchSessions}...`"
                :aria-label="copy.searchSessions"
                @keydown.esc="closeSearch"
              />
              <button
                v-if="searchExpanded"
                class="omp-workspace-search-clear"
                type="button"
                :aria-label="copy.clearSearch"
                @click="closeSearch"
              >
                <AppIcon name="x" :size="14" />
              </button>
            </div>
          </div>
          <div class="omp-workspace-header-actions" :class="{ 'omp-workspace-header-actions-hidden': searchExpanded }">
            <button class="omp-workspace-icon-button" type="button" :aria-label="copy.viewOptions">
              <AppIcon name="sliders-horizontal" :size="16" />
            </button>
            <button class="omp-workspace-icon-button" type="button" :aria-label="copy.addWorkspace" @click="workspaceMenuOpen = !workspaceMenuOpen">
              <AppIcon name="folder-plus" :size="16" />
            </button>
          </div>
          <div v-if="workspaceMenuOpen" class="omp-workspace-menu" role="menu">
            <button type="button" role="menuitem" @click="addWorkspace">{{ copy.addWorkspaceMenu }}</button>
          </div>
        </div>

        <div v-else class="omp-workspace-rail-search">
          <button class="omp-workspace-search-button" type="button" :aria-label="copy.searchSessions" @click="expandSearch">
            <AppIcon name="search" :size="18" />
          </button>
        </div>

        <div class="omp-workspace-list" :class="{ 'omp-workspace-list-quiet': !hasVisibleSessions }">
          <template v-if="hasVisibleSessions">
            <section
              v-for="project in visibleProjects"
              :key="project.id"
              class="omp-workspace-project"
            >
              <div
                class="omp-workspace-project-row"
                :class="{ 'omp-workspace-project-row-menu-open': projectMenuOpenId === project.id, 'omp-workspace-project-row-active': isProjectActive(project) }"
                role="treeitem"
                :aria-expanded="isProjectExpanded(project.id)"
                @mouseenter="showProjectHover(project.id, $event)"
                @mouseleave="hideProjectHover"
                @click="toggleProject(project.id)"
              >
                <button
                  class="omp-workspace-project-toggle"
                  type="button"
                  :aria-expanded="isProjectExpanded(project.id)"
                  @click.stop="toggleProject(project.id)"
                >
                  <span class="omp-workspace-project-leading" aria-hidden="true">
                    <AppIcon :name="isProjectExpanded(project.id) ? 'folder-open' : 'folder'" class="omp-workspace-project-folder" :size="15" />
                    <AppIcon
                      name="chevron-right"
                      :size="13"
                      class="omp-workspace-project-chevron"
                      :class="{ 'omp-workspace-project-chevron-open': isProjectExpanded(project.id) }"
                    />
                  </span>
                  <span class="omp-workspace-project-name">{{ project.name }}</span>
                </button>
                <div class="omp-workspace-project-actions">
                  <button
                    class="omp-workspace-project-action"
                    type="button"
                    :aria-label="`${copy.openMoreActions}: ${project.name}`"
                    @click.stop="toggleProjectMenu(project.id)"
                  >
                    <AppIcon name="more-horizontal" :size="15" />
                  </button>
                  <button
                    class="omp-workspace-project-action"
                    type="button"
                    :aria-label="`${copy.newSessionLabel}: ${project.name}`"
                    @click.stop="startSession"
                  >
                    <AppIcon name="plus" :size="15" />
                  </button>
                </div>
                <div v-if="projectMenuOpenId === project.id" class="omp-workspace-project-menu" role="menu" @click.stop>
                  <button type="button" role="menuitem" @click="closeProjectMenu">{{ copy.viewOptions }}</button>
                </div>
              </div>
              <Teleport to="body">
                <div
                  v-if="projectHoverId === project.id && !props.collapsed"
                  class="omp-workspace-hover-card"
                  role="tooltip"
                  :style="{ top: `${projectHoverTop}px` }"
                >
                  <strong>{{ project.name }}</strong>
                  <span>{{ project.path }}</span>
                  <span>创建于 2026年9月3日 08:57</span>
                </div>
              </Teleport>
              <div v-if="isProjectExpanded(project.id)" class="omp-workspace-session-list">
                <button
                  v-if="props.activeSessionId === null && project.id === 'codex'"
                  class="omp-workspace-session-row omp-workspace-session-row-active omp-workspace-session-row-new"
                  type="button"
                  aria-current="page"
                  @click="startSession"
                >
                  <span class="omp-workspace-session-title">{{ copy.newSession }}</span>
                </button>
                <button
                  v-for="session in visibleSessions(project)"
                  :key="session.id"
                  class="omp-workspace-session-row"
                  :class="{ 'omp-workspace-session-row-active': props.activeSessionId === session.id }"
                  type="button"
                  :aria-current="props.activeSessionId === session.id ? 'page' : undefined"
                  @click="selectSession(session.id)"
                >
                  <span class="omp-workspace-session-title">{{ session.title }}</span>
                  <span class="omp-workspace-session-time">{{ session.time }}</span>
                </button>
                <button
                  v-if="project.sessions.length > 5"
                  class="omp-workspace-session-overflow"
                  type="button"
                  @click="toggleSessionOverflow(project.id)"
                >
                  {{ sessionOverflowLabel(project) }}
                </button>
              </div>
            </section>
          </template>
          <div v-else class="omp-workspace-empty">{{ copy.noMatches }}</div>
        </div>
      </section>
    </div>

    <div class="omp-sidebar-footer">
      <button class="omp-sidebar-settings" type="button" :aria-label="copy.settings" @click="emit('openSettings')">
        <AppIcon name="settings" :size="16" />
        <span v-if="!props.collapsed">{{ copy.settings }}</span>
      </button>
    </div>
  </aside>
</template>
