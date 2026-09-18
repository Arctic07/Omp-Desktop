<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from 'vue'
import { useAppShell } from './composables/useAppShell'
import SourceConversation from './components/SourceConversation.vue'
import SourceSettings from './components/SourceSettings.vue'
import SourceSidebar from './components/SourceSidebar.vue'
import SourceWorkPanel from './components/SourceWorkPanel.vue'

const RIGHT_PANEL_WIDTH_MIN = 294
const RIGHT_PANEL_WIDTH_MAX = 640
const RIGHT_PANEL_WIDTH_DEFAULT = 448

type AppFrameStyle = CSSProperties & {
  '--omp-work-panel-width': string
}

const {
  sidebarCollapsed,
  settingsOpen,
  activeSessionId,
  activeSessionTitle,
  workspacePath,
  workspaceError,
  workspaceProjects,
  conversationEntries,
  rightPanelOpen,
  rightPanelTab,
  requestedFile,
  requestedDiff,
  refreshToken,
  startNewSession,
  selectSession,
  openSettings,
  toggleSidebar,
  toggleRightPanel,
  selectRightPanelTab,
  closeRightPanel,
  openRequestedFile,
  openRequestedDiff,
  closeRequestedDiff,
  refreshWorkspacePanels,
  handleMessageSubmit,
  selectWorkspace,
} = useAppShell()

const rightPanelWidth = ref(RIGHT_PANEL_WIDTH_DEFAULT)
const rightPanelResizing = ref(false)
const frameStyle = computed<AppFrameStyle>(() => ({
  '--omp-work-panel-width': `${rightPanelWidth.value}px`,
}))

function clampRightPanelWidth(width: number): number {
  if (!Number.isFinite(width)) return RIGHT_PANEL_WIDTH_DEFAULT
  return Math.min(RIGHT_PANEL_WIDTH_MAX, Math.max(RIGHT_PANEL_WIDTH_MIN, Math.round(width)))
}

function handleRightPanelResize(width: number): void {
  rightPanelWidth.value = clampRightPanelWidth(width)
}

function handleRightPanelResizeStart(): void {
  rightPanelResizing.value = true
}

function handleRightPanelResizeEnd(): void {
  rightPanelResizing.value = false
}

watch(rightPanelOpen, (isOpen) => {
  if (!isOpen) rightPanelResizing.value = false
})
</script>
<template>
  <div
    class="omp-frame"
    :class="{
      'omp-frame-sidebar-collapsed': sidebarCollapsed,
      'omp-frame-right-panel-open': rightPanelOpen,
      'omp-frame-right-panel-resizing': rightPanelResizing,
    }"
    :style="frameStyle"
  >
    <div class="omp-sidebar-column">
      <SourceSidebar
        :collapsed="sidebarCollapsed"
        :active-session-id="activeSessionId"
        :projects="workspaceProjects"
        @new-session="startNewSession"
        @select-session="selectSession"
        @toggle="toggleSidebar"
        @open-settings="openSettings"
        @add-workspace="selectWorkspace"
      />
    </div>
    <main class="omp-center-column">
      <SourceConversation
        v-if="!settingsOpen"
        :session-id="activeSessionId"
        :session-title="activeSessionTitle"
        :workspace-path="workspacePath"
        :workspace-error="workspaceError"
        :entries="conversationEntries"
        :right-panel-open="rightPanelOpen"
        @request-workspace="selectWorkspace"
        @toggle-right-panel="toggleRightPanel"
        @open-file="openRequestedFile"
        @submit="handleMessageSubmit"
      />
    </main>
    <SourceWorkPanel
      v-if="rightPanelOpen"
      :width="rightPanelWidth"
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
      @resize="handleRightPanelResize"
      @resize-start="handleRightPanelResizeStart"
      @resize-end="handleRightPanelResizeEnd"
    />
    <SourceSettings v-if="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>
