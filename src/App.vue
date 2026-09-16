<script setup lang="ts">
import { ref } from 'vue'

import SourceConversation from './components/SourceConversation.vue'
import SourceSettings from './components/SourceSettings.vue'
import SourceSidebar from './components/SourceSidebar.vue'

const sidebarCollapsed = ref(false)
const settingsOpen = ref(false)
</script>

<template>
  <div class="dsh-frame" :class="{ 'dsh-frame-sidebar-collapsed': sidebarCollapsed }">
    <div class="dsh-sidebar-column">
      <SourceSidebar
        :collapsed="sidebarCollapsed"
        @new-session="settingsOpen = false"
        @toggle="sidebarCollapsed = !sidebarCollapsed"
        @open-settings="settingsOpen = true"
      />
    </div>
    <main class="dsh-center-column">
      <SourceConversation v-if="!settingsOpen" />
    </main>
    <SourceSettings v-if="settingsOpen" @close="settingsOpen = false" />
  </div>
</template>
