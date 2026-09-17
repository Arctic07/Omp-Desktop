<script setup lang="ts">
import { computed } from 'vue'

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
  newSession: []
  selectSession: [sessionId: string]
  toggleSessionOverflow: []
}>()

const { copy } = useAppSettings()

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

</script>

<template>
  <section class="omp-workspace-project" :class="{ 'omp-workspace-project-active': activeProject }">
    <div
      class="omp-workspace-project-row"
      :class="{ 'omp-workspace-project-row-active': activeProject }"
    >
      <button
        class="omp-workspace-project-toggle"
        type="button"
        :aria-label="`${props.expanded ? copy.collapseWorkspace : copy.expandWorkspace}: ${props.project.name}`"
        :title="props.project.path"
        @click="emit('toggle')"
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
      <button
        class="omp-workspace-project-action"
        type="button"
        :aria-label="`${copy.newSessionLabel}: ${props.project.name}`"
        :title="copy.newSessionLabel"
        @click="emit('newSession')"
      >
        <AppIcon name="plus" :size="15" aria-hidden="true" />
      </button>
    </div>

    <div v-if="props.expanded" class="omp-workspace-session-list">
      <button
        v-if="props.activeSessionId === null && props.project.id === 'codex'"
        class="omp-workspace-session-row omp-workspace-session-row-active omp-workspace-session-row-new"
        type="button"
        aria-current="page"
        @click="emit('newSession')"
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
        @click="emit('selectSession', session.id)"
      >
        <span class="omp-workspace-session-title">{{ session.title }}</span>
        <span class="omp-workspace-session-time">{{ session.time }}</span>
      </button>
      <button
        v-if="hiddenSessionCount > 0"
        class="omp-workspace-session-overflow"
        type="button"
        @click="emit('toggleSessionOverflow')"
      >
        {{ overflowLabel }}
      </button>
    </div>
  </section>
</template>
