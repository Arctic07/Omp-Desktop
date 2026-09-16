<script setup lang="ts">
import { computed, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import ConversationTopbar from '../components/ConversationTopbar.vue'
import Sidebar from '../components/Sidebar.vue'
import WorkPanel from '../components/WorkPanel.vue'
import { useAppStore } from '../stores/app'

const route = useRoute()
const router = useRouter()
const {
  sidebarCollapsed,
  workPanelOpen,
  settings,
  setWorkPanelOpen,
  toggleSidebar,
  createSession,
} = useAppStore()

const isSettingsPage = computed(() => route.name === 'settings')
const effectiveTheme = computed(() =>
  settings.value.theme === 'system' ? 'dark' : settings.value.theme,
)

watch(
  () => settings.value.fontSize,
  (fontSize) => {
    document.documentElement.dataset.fontSize = fontSize
  },
  { immediate: true },
)

function handleNewTask() {
  createSession()
  void router.push({ name: 'home' })
}

function handleSearch() {
  document.querySelector<HTMLElement>('.composer-input')?.focus()
}

function handleToggleSidebar() {
  toggleSidebar()
}

function handleToggleWorkPanel() {
  setWorkPanelOpen(!workPanelOpen.value)
}
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'sidebar-collapsed': sidebarCollapsed, 'settings-mode': isSettingsPage }"
    :data-theme="effectiveTheme"
    data-platform="win32"
  >
    <Sidebar v-if="!isSettingsPage && !sidebarCollapsed" />
    <main class="main-pane">
      <ConversationTopbar
        v-if="route.name === 'home'"
        @toggle-sidebar="handleToggleSidebar"
        @new-task="handleNewTask"
        @search="handleSearch"
        @toggle-work-panel="handleToggleWorkPanel"
      />
      <div v-else-if="!isSettingsPage" class="main-titlebar" aria-hidden="true" />
      <div
        class="router-view-shell"
        :class="{
          'settings-view-shell': isSettingsPage,
          'route-page-shell': !isSettingsPage && route.name !== 'home',
        }"
      >
        <RouterView />
      </div>
    </main>
    <WorkPanel v-if="!isSettingsPage && workPanelOpen" />
  </div>
</template>
