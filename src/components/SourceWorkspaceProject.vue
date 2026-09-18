<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import type { WorkspaceProject, WorkspaceSession } from '../utils/workspaceTypes'
import { AppIcon } from './icons'

const props = defineProps<{
  project: WorkspaceProject
  activeSessionId: string | null
  expanded: boolean
  sessionOverflowExpanded: boolean
}>()

const emit = defineEmits<{
  toggle: []
  'new-session': []
  'select-session': [sessionId: string]
  'toggle-session-overflow': []
}>()

const { copy } = useAppSettings()
const projectMenuOpen = ref(false)
const projectHoverVisible = ref(false)
const projectHoverTop = ref(0)
const projectHoverTimer = ref<number | null>(null)
const visibleSessions = computed<readonly WorkspaceSession[]>(() => (
  props.sessionOverflowExpanded ? props.project.sessions : props.project.sessions.slice(0, 5)
))
const hiddenSessionCount = computed<number>(() => Math.max(0, props.project.sessions.length - 5))
const overflowLabel = computed<string>(() => (
  props.sessionOverflowExpanded
    ? copy.value.collapseSessions
    : copy.value.expandSessions.replace('{count}', String(hiddenSessionCount.value))
))
const activeProject = computed<boolean>(() => {
  if (props.activeSessionId === null) {
    return props.project.id === 'codex'
  }
  return props.project.sessions.some((session) => session.id === props.activeSessionId)
})

function clearProjectHoverTimer(): void {
  if (projectHoverTimer.value === null) return
  window.clearTimeout(projectHoverTimer.value)
  projectHoverTimer.value = null
}

function showProjectHover(event: MouseEvent | FocusEvent): void {
  if (projectMenuOpen.value) return
  const target = event.currentTarget
  if (!(target instanceof HTMLElement)) return
  clearProjectHoverTimer()
  projectHoverTimer.value = window.setTimeout(() => {
    projectHoverVisible.value = true
    projectHoverTop.value = target.getBoundingClientRect().top
    projectHoverTimer.value = null
  }, 1000)
}

function hideProjectHover(): void {
  clearProjectHoverTimer()
  projectHoverVisible.value = false
}

function toggleProject(): void {
  projectMenuOpen.value = false
  emit('toggle')
}
function startSession(): void {
  projectMenuOpen.value = false
  emit('new-session')
}

function toggleProjectMenu(): void {
  projectMenuOpen.value = !projectMenuOpen.value
  if (projectMenuOpen.value) hideProjectHover()
}

function closeProjectMenu(): void {
  projectMenuOpen.value = false
}

onUnmounted(() => {
  clearProjectHoverTimer()
})
</script>

<template>
  <section class="omp-workspace-project" :class="{ 'omp-workspace-project-active': activeProject }">
    <div
      class="omp-workspace-project-row"
      :class="{ 'omp-workspace-project-row-active': activeProject, 'omp-workspace-project-row-menu-open': projectMenuOpen }"
      @mouseenter="showProjectHover"
      @mouseleave="hideProjectHover"
      @focusin="showProjectHover"
      @focusout="hideProjectHover"
    >
      <button
        class="omp-workspace-project-toggle"
        type="button"
        :aria-expanded="props.expanded"
        :aria-label="`${props.expanded ? copy.collapseWorkspace : copy.expandWorkspace}: ${props.project.name}`"
        :title="props.project.path"
        @click="toggleProject"
      >
        <span class="omp-workspace-project-leading" aria-hidden="true">
          <AppIcon :name="props.expanded ? 'folder-open' : 'folder'" class="omp-workspace-project-folder" :size="15" />
          <AppIcon
            name="chevron-right"
            :size="13"
            class="omp-workspace-project-chevron"
            :class="{ 'omp-workspace-project-chevron-open': props.expanded }"
          />
        </span>
        <span class="omp-workspace-project-name">{{ props.project.name }}</span>
      </button>
      <div class="omp-workspace-project-actions">
        <button
          class="omp-workspace-project-action"
          type="button"
          :aria-label="`${copy.openMoreActions}: ${props.project.name}`"
          :aria-expanded="projectMenuOpen"
          aria-haspopup="menu"
          :title="copy.openMoreActions"
          @click.stop="toggleProjectMenu"
        >
          <AppIcon name="more-horizontal" :size="15" aria-hidden="true" />
        </button>
        <button
          class="omp-workspace-project-action"
          type="button"
          :aria-label="`${copy.newSessionLabel}: ${props.project.name}`"
          :title="copy.newSessionLabel"
          @click.stop="startSession"
        >
          <AppIcon name="plus" :size="15" aria-hidden="true" />
        </button>
      </div>
      <div v-if="projectMenuOpen" class="omp-workspace-project-menu" role="menu" @click.stop>
        <button type="button" role="menuitem" @click="closeProjectMenu">{{ copy.viewOptions }}</button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="projectHoverVisible && !projectMenuOpen"
        class="omp-workspace-hover-card"
        role="tooltip"
        :style="{ top: `${projectHoverTop}px` }"
      >
        <strong>{{ props.project.name }}</strong>
        <span>{{ props.project.path }}</span>
      </div>
    </Teleport>

    <div v-if="props.expanded" class="omp-workspace-session-list">
      <button
        v-if="props.activeSessionId === null && props.project.id === 'codex'"
        class="omp-workspace-session-row omp-workspace-session-row-active omp-workspace-session-row-new"
        type="button"
        aria-current="page"
        @click="startSession"
      >
        <span class="omp-workspace-session-title">{{ copy.newSession }}</span>
      </button>
      <button
        v-for="session in visibleSessions"
        :key="session.id"
        class="omp-workspace-session-row"
        :class="{ 'omp-workspace-session-row-active': props.activeSessionId === session.id }"
        type="button"
        :aria-current="props.activeSessionId === session.id ? 'page' : undefined"
        @click="emit('select-session', session.id)"
      >
        <span class="omp-workspace-session-title">{{ session.title }}</span>
        <span class="omp-workspace-session-time">{{ session.time }}</span>
      </button>
      <button
        v-if="hiddenSessionCount > 0"
        class="omp-workspace-session-overflow"
        type="button"
        @click="emit('toggle-session-overflow')"
      >
        {{ overflowLabel }}
      </button>
    </div>
  </section>
</template>
