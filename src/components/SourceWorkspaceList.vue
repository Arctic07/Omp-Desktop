<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import type { WorkspaceProject } from '../utils/workspaceTypes'
import SourceWorkspaceProject from './SourceWorkspaceProject.vue'
import { AppIcon } from './icons'

const props = defineProps<{
  collapsed: boolean
  activeSessionId: string | null
  projects: readonly WorkspaceProject[]
}>()

const emit = defineEmits<{
  newSession: []
  selectSession: [sessionId: string]
  addWorkspace: []
}>()

const { copy } = useAppSettings()
const searchExpanded = ref(false)
const query = ref('')
const workspaceMenuOpen = ref(false)
const expandedProjectIds = ref<Set<string>>(new Set(props.projects.map((project) => project.id)))
const expandedSessionProjectIds = ref<Set<string>>(new Set())
const searchInput = ref<HTMLInputElement | null>(null)

const visibleProjects = computed<readonly WorkspaceProject[]>(() => {
  const term = query.value.trim().toLocaleLowerCase()
  if (term.length === 0) {
    return props.projects
  }

  return props.projects
    .map((project) => {
      const projectMatches = project.name.toLocaleLowerCase().includes(term)
      const sessions = projectMatches
        ? project.sessions
        : project.sessions.filter((session) => session.title.toLocaleLowerCase().includes(term))
      return { ...project, sessions }
    })
    .filter((project) => project.name.toLocaleLowerCase().includes(term) || project.sessions.length > 0)
})

const hasVisibleProjects = computed<boolean>(() => visibleProjects.value.length > 0)


function toggleProject(projectId: string): void {
  const nextExpanded = new Set(expandedProjectIds.value)
  if (nextExpanded.has(projectId)) {
    nextExpanded.delete(projectId)
  } else {
    nextExpanded.add(projectId)
  }
  expandedProjectIds.value = nextExpanded
}

function toggleSessionOverflow(projectId: string): void {
  const nextExpanded = new Set(expandedSessionProjectIds.value)
  if (nextExpanded.has(projectId)) {
    nextExpanded.delete(projectId)
  } else {
    nextExpanded.add(projectId)
  }
  expandedSessionProjectIds.value = nextExpanded
}

async function expandSearch(): Promise<void> {
  workspaceMenuOpen.value = false
  searchExpanded.value = true
  await nextTick()
  searchInput.value?.focus()
}

function closeSearch(): void {
  query.value = ''
  searchExpanded.value = false
}

function addWorkspace(): void {
  workspaceMenuOpen.value = false
  emit('addWorkspace')
}
</script>

<template>
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
            <AppIcon name="search" :size="searchExpanded ? 11 : 14" aria-hidden="true" />
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
            <AppIcon name="x" :size="14" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div class="omp-workspace-header-actions" :class="{ 'omp-workspace-header-actions-hidden': searchExpanded }">
        <button
          class="omp-workspace-icon-button"
          type="button"
          :aria-label="copy.addWorkspace"
          @click="workspaceMenuOpen = !workspaceMenuOpen"
        >
          <AppIcon name="folder-plus" :size="16" aria-hidden="true" />
        </button>
      </div>
      <div v-if="workspaceMenuOpen" class="omp-workspace-menu" role="menu">
        <button type="button" role="menuitem" @click="addWorkspace">{{ copy.addWorkspaceMenu }}</button>
      </div>
    </div>

    <div v-else class="omp-workspace-rail-search">
      <button class="omp-workspace-search-button" type="button" :aria-label="copy.searchSessions" @click="expandSearch">
        <AppIcon name="search" :size="18" aria-hidden="true" />
      </button>
    </div>

    <div class="omp-workspace-list" :class="{ 'omp-workspace-list-quiet': !hasVisibleProjects }">
      <template v-if="hasVisibleProjects">
        <SourceWorkspaceProject
          v-for="project in visibleProjects"
          :key="project.id"
          :project="project"
          :active-session-id="props.activeSessionId"
          :expanded="expandedProjectIds.has(project.id)"
          :session-overflow-expanded="expandedSessionProjectIds.has(project.id)"
          @toggle="toggleProject(project.id)"
          @new-session="emit('newSession')"
          @select-session="emit('selectSession', $event)"
          @toggle-session-overflow="toggleSessionOverflow(project.id)"
        />
      </template>
      <div v-else class="omp-workspace-empty">{{ props.projects.length === 0 ? copy.noWorkspaces : copy.noMatches }}</div>
    </div>
  </section>
</template>
