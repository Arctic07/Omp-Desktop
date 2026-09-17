<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import SourceConversation from './components/SourceConversation.vue'
import SourceSettings from './components/SourceSettings.vue'
import SourceSidebar from './components/SourceSidebar.vue'

const COMPACT_MEDIA_QUERY = '(max-width: 1023px)'

const desktopSidebarCollapsed = ref(false)
const compactSidebarExpanded = ref(false)
const isCompactViewport = ref(readCompactViewport())
const settingsOpen = ref(false)
const activeSessionId = ref<string | null>('session-codex-source')

let compactMediaQuery: MediaQueryList | null = null

const sidebarCollapsed = computed<boolean>(() => (
  isCompactViewport.value ? !compactSidebarExpanded.value : desktopSidebarCollapsed.value
))

function readCompactViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }

  return window.matchMedia(COMPACT_MEDIA_QUERY).matches
}

function handleCompactViewportChange(event: MediaQueryListEvent): void {
  isCompactViewport.value = event.matches

  if (event.matches) {
    compactSidebarExpanded.value = false
  }
}

function toggleSidebar(): void {
  if (isCompactViewport.value) {
    compactSidebarExpanded.value = !compactSidebarExpanded.value
    return
  }

  desktopSidebarCollapsed.value = !desktopSidebarCollapsed.value
}

function startNewSession(): void {
  activeSessionId.value = null
  settingsOpen.value = false
}

function selectSession(sessionId: string): void {
  activeSessionId.value = sessionId
  settingsOpen.value = false
}

onMounted((): void => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return
  }

  compactMediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY)
  isCompactViewport.value = compactMediaQuery.matches
  if (typeof compactMediaQuery.addEventListener === 'function') {
    compactMediaQuery.addEventListener('change', handleCompactViewportChange)
  } else if (typeof compactMediaQuery.addListener === 'function') {
    compactMediaQuery.addListener(handleCompactViewportChange)
  }
})

onUnmounted((): void => {
  if (compactMediaQuery === null) {
    return
  }

  if (typeof compactMediaQuery.removeEventListener === 'function') {
    compactMediaQuery.removeEventListener('change', handleCompactViewportChange)
  } else if (typeof compactMediaQuery.removeListener === 'function') {
    compactMediaQuery.removeListener(handleCompactViewportChange)
  }
  compactMediaQuery = null
})
</script>

<template>
  <div class="omp-frame" :class="{ 'omp-frame-sidebar-collapsed': sidebarCollapsed }">
    <div class="omp-sidebar-column">
      <SourceSidebar
        :collapsed="sidebarCollapsed"
        :active-session-id="activeSessionId"
        @new-session="startNewSession"
        @select-session="selectSession"
        @toggle="toggleSidebar"
        @open-settings="settingsOpen = true"
      />
    </div>
    <main class="omp-center-column">
      <SourceConversation v-if="!settingsOpen" :session-id="activeSessionId" />
    </main>
    <SourceSettings v-if="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>
