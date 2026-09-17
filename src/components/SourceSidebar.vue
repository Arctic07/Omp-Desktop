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
            <section
              v-for="project in visibleProjects"
              :key="project.id"
              class="dsh-workspace-project"
            >
              <div
                class="dsh-workspace-project-row"
                :class="{ 'dsh-workspace-project-row-menu-open': projectMenuOpenId === project.id, 'dsh-workspace-project-row-active': isProjectActive(project) }"
                role="treeitem"
                :aria-expanded="isProjectExpanded(project.id)"
                @mouseenter="showProjectHover(project.id, $event)"
                @mouseleave="hideProjectHover"
                @click="toggleProject(project.id)"
              >
                <button
                  class="dsh-workspace-project-toggle"
                  type="button"
                  :aria-expanded="isProjectExpanded(project.id)"
                  @click.stop="toggleProject(project.id)"
                >
                  <span class="dsh-workspace-project-leading" aria-hidden="true">
                    <AppIcon :name="isProjectExpanded(project.id) ? 'folder-open' : 'folder'" class="dsh-workspace-project-folder" :size="15" />
                    <AppIcon
                      name="chevron-right"
                      :size="13"
                      class="dsh-workspace-project-chevron"
                      :class="{ 'dsh-workspace-project-chevron-open': isProjectExpanded(project.id) }"
                    />
                  </span>
                  <span class="dsh-workspace-project-name">{{ project.name }}</span>
                </button>
                <div class="dsh-workspace-project-actions">
                  <button
                    class="dsh-workspace-project-action"
                    type="button"
                    :aria-label="`${copy.openMoreActions}: ${project.name}`"
                    @click.stop="toggleProjectMenu(project.id)"
                  >
                    <AppIcon name="more-horizontal" :size="15" />
                  </button>
                  <button
                    class="dsh-workspace-project-action"
                    type="button"
                    :aria-label="`${copy.newSessionLabel}: ${project.name}`"
                    @click.stop="startSession"
                  >
                    <AppIcon name="plus" :size="15" />
                  </button>
                </div>
                <div v-if="projectMenuOpenId === project.id" class="dsh-workspace-project-menu" role="menu" @click.stop>
                  <button type="button" role="menuitem" @click="closeProjectMenu">{{ copy.viewOptions }}</button>
                </div>
              </div>
              <Teleport to="body">
                <div
                  v-if="projectHoverId === project.id && !props.collapsed"
                  class="dsh-workspace-hover-card"
                  role="tooltip"
                  :style="{ top: `${projectHoverTop}px` }"
                >
                  <strong>{{ project.name }}</strong>
                  <span>{{ project.path }}</span>
                  <span>创建于 2026年9月3日 08:57</span>
                </div>
              </Teleport>
              <div v-if="isProjectExpanded(project.id)" class="dsh-workspace-session-list">
                <button
                  v-if="props.activeSessionId === null && project.id === 'codex'"
                  class="dsh-workspace-session-row dsh-workspace-session-row-active dsh-workspace-session-row-new"
                  type="button"
                  aria-current="page"
                  @click="startSession"
                >
                  <span class="dsh-workspace-session-title">{{ copy.newSession }}</span>
                </button>
                <button
                  v-for="session in visibleSessions(project)"
                  :key="session.id"
                  class="dsh-workspace-session-row"
                  :class="{ 'dsh-workspace-session-row-active': props.activeSessionId === session.id }"
                  type="button"
                  :aria-current="props.activeSessionId === session.id ? 'page' : undefined"
                  @click="selectSession(session.id)"
                >
                  <span class="dsh-workspace-session-title">{{ session.title }}</span>
                  <span class="dsh-workspace-session-time">{{ session.time }}</span>
                </button>
                <button
                  v-if="project.sessions.length > 5"
                  class="dsh-workspace-session-overflow"
                  type="button"
                  @click="toggleSessionOverflow(project.id)"
                >
                  {{ sessionOverflowLabel(project) }}
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
