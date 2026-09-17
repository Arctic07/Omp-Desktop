<script setup lang="ts">
import { useAppShell } from './composables/useAppShell'
import SourceConversation from './components/SourceConversation.vue'
import SourceSettings from './components/SourceSettings.vue'
import SourceSidebar from './components/SourceSidebar.vue'
import SourceWorkPanel from './components/SourceWorkPanel.vue'

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
</script>

<template>
  <div class="omp-frame" :class="{ 'omp-frame-sidebar-collapsed': sidebarCollapsed, 'omp-frame-right-panel-open': rightPanelOpen }">
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
