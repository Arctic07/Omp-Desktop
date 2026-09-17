<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

import { open } from '@tauri-apps/plugin-dialog'

import { currentWorkingDirectory, type ReviewDiffTarget } from './utils/desktopApi'
import { useAppSettings } from './stores/appSettings'
import SourceConversation from './components/SourceConversation.vue'
import SourceSettings from './components/SourceSettings.vue'
import SourceSidebar from './components/SourceSidebar.vue'
import SourceWorkPanel from './components/SourceWorkPanel.vue'

const COMPACT_MEDIA_QUERY = '(max-width: 1023px)'

type WorkPanelTab = 'files' | 'review'

const desktopSidebarCollapsed = ref(false)
const compactSidebarExpanded = ref(false)
const isCompactViewport = ref(readCompactViewport())
const settingsOpen = ref(false)
const activeSessionId = ref<string | null>('session-codex-source')
const workspacePath = ref<string | null>(null)
const rightPanelOpen = ref(false)
const rightPanelTab = ref<WorkPanelTab>('files')
const requestedFile = ref<{ path: string; seq: number } | null>(null)
const requestedDiff = ref<ReviewDiffTarget | null>(null)
const refreshToken = ref(0)
let workspaceLoadToken = 0
let requestSequence = 0

let compactMediaQuery: MediaQueryList | null = null

const { copy } = useAppSettings()

const sidebarCollapsed = computed<boolean>(() => (
  isCompactViewport.value ? !compactSidebarExpanded.value : desktopSidebarCollapsed.value
))

function readCompactViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(COMPACT_MEDIA_QUERY).matches
}

function handleCompactViewportChange(event: MediaQueryListEvent): void {
  isCompactViewport.value = event.matches
  if (event.matches) compactSidebarExpanded.value = false
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

function openSettings(): void {
  settingsOpen.value = true
  rightPanelOpen.value = false
}

function toggleRightPanel(): void {
  if (settingsOpen.value) settingsOpen.value = false
  rightPanelOpen.value = !rightPanelOpen.value
}

function selectRightPanelTab(tab: WorkPanelTab): void {
  rightPanelTab.value = tab
}

function closeRightPanel(): void {
  rightPanelOpen.value = false
  requestedDiff.value = null
}

function openRequestedFile(path: string): void {
  requestSequence += 1
  requestedDiff.value = null
  requestedFile.value = { path, seq: requestSequence }
  rightPanelTab.value = 'files'
  rightPanelOpen.value = true
}

function openRequestedDiff(target: ReviewDiffTarget): void {
  requestedDiff.value = target
  rightPanelTab.value = 'review'
  rightPanelOpen.value = true
}

function refreshWorkspacePanels(): void {
  refreshToken.value += 1
}

function closeRequestedDiff(): void {
  requestedDiff.value = null
  rightPanelTab.value = 'review'
}

async function loadWorkspacePath(): Promise<void> {
  const token = workspaceLoadToken
  try {
    const currentPath = await currentWorkingDirectory()
    if (token !== workspaceLoadToken || workspacePath.value !== null) return
    workspacePath.value = currentPath
  } catch {
    if (token === workspaceLoadToken && workspacePath.value === null) workspacePath.value = null
  }
}

async function chooseWorkspace(): Promise<void> {
  try {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: copy.value.chooseWorkspace,
    })
    if (typeof selectedPath === 'string') {
      if (selectedPath !== workspacePath.value) {
        workspacePath.value = selectedPath
        requestedFile.value = null
        requestedDiff.value = null
      }
    }
  } catch {
    return
  }
}

onMounted((): void => {
  void loadWorkspacePath()
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

  compactMediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY)
  isCompactViewport.value = compactMediaQuery.matches
  if (typeof compactMediaQuery.addEventListener === 'function') {
    compactMediaQuery.addEventListener('change', handleCompactViewportChange)
  } else if (typeof compactMediaQuery.addListener === 'function') {
    compactMediaQuery.addListener(handleCompactViewportChange)
  }
})

onUnmounted((): void => {
  if (compactMediaQuery === null) return
  if (typeof compactMediaQuery.removeEventListener === 'function') {
    compactMediaQuery.removeEventListener('change', handleCompactViewportChange)
  } else if (typeof compactMediaQuery.removeListener === 'function') {
    compactMediaQuery.removeListener(handleCompactViewportChange)
  }
  compactMediaQuery = null
})
</script>

<template>
  <div class="omp-frame" :class="{ 'omp-frame-sidebar-collapsed': sidebarCollapsed, 'omp-frame-right-panel-open': rightPanelOpen }">
    <div class="omp-sidebar-column">
      <SourceSidebar
        :collapsed="sidebarCollapsed"
        :active-session-id="activeSessionId"
        @new-session="startNewSession"
        @select-session="selectSession"
        @toggle="toggleSidebar"
        @open-settings="openSettings"
        @add-workspace="chooseWorkspace"
      />
    </div>
    <main class="omp-center-column">
      <SourceConversation
        v-if="!settingsOpen"
        :session-id="activeSessionId"
        :workspace-path="workspacePath"
        :right-panel-open="rightPanelOpen"
        @request-workspace="chooseWorkspace"
        @toggle-right-panel="toggleRightPanel"
        @open-file="openRequestedFile"
      />
    </main>
    <SourceWorkPanel
      v-if="rightPanelOpen"
      :workspace-path="workspacePath"
      :active-tab="rightPanelTab"
      :requested-file="requestedFile"
      :requested-diff="requestedDiff"
      :refresh-token="refreshToken"
      @update:active-tab="selectRightPanelTab"
      @close="closeRightPanel"
      @open-file="openRequestedFile"
      @open-diff="openRequestedDiff"
      @close-diff="closeRequestedDiff"
      @refresh-workspace="refreshWorkspacePanels"
    />
    <SourceSettings v-if="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>
