<script setup lang="ts">
import { ref } from 'vue'

import SourceConversation from './components/SourceConversation.vue'
import SourceSettings from './components/SourceSettings.vue'
import SourceSidebar from './components/SourceSidebar.vue'

const sidebarCollapsed = ref(false)
const settingsOpen = ref(false)
const activeSessionId = ref<string | null>('session-omp-build')

function startNewSession() {
  activeSessionId.value = null
  settingsOpen.value = false
}

function selectSession(sessionId: string) {
  activeSessionId.value = sessionId
  settingsOpen.value = false
}
</script>

<template>
  <div class="dsh-frame" :class="{ 'dsh-frame-sidebar-collapsed': sidebarCollapsed }">
    <div class="dsh-sidebar-column">
      <SourceSidebar
        :collapsed="sidebarCollapsed"
        :active-session-id="activeSessionId"
        @new-session="startNewSession"
        @select-session="selectSession"
        @toggle="sidebarCollapsed = !sidebarCollapsed"
        @open-settings="settingsOpen = true"
      />
    </div>
    <main class="dsh-center-column">
      <SourceConversation v-if="!settingsOpen" :session-id="activeSessionId" />
    </main>
    <SourceSettings v-if="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>
