<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { AppIcon } from './icons'

import { useAppStore } from '../stores/app'
const emit = defineEmits<{
  (event: 'toggle-sidebar'): void
  (event: 'new-task'): void
  (event: 'search'): void
  (event: 'toggle-work-panel'): void
}>()

const route = useRoute()
const { activeSessionId, sessions, sidebarCollapsed, workPanelOpen } = useAppStore()

const activeSession = computed(() =>
  sessions.value.find((session) => session.id === activeSessionId.value),
)

const title = computed(() => {
  if (route.name === 'home' && activeSession.value?.title) {
    return activeSession.value.title
  }
  return typeof route.meta.title === 'string' ? route.meta.title : '工作台'
})

const subtitle = computed(() => activeSession.value?.projectPath ?? 'Local workspace')
</script>

<template>
  <header class="conversation-topbar">
    <div class="topbar-leading">
      <button
        class="topbar-button topbar-sidebar-button"
        type="button"
        :aria-label="sidebarCollapsed ? '展开侧栏' : '收起侧栏'"
        :aria-expanded="!sidebarCollapsed"
        aria-controls="app-sidebar"
        title="切换侧栏"
        @click="emit('toggle-sidebar')"
      >
        <AppIcon name="panel-left" :size="16" aria-hidden="true" />
      </button>
      <div class="conversation-heading">
        <h1 class="conversation-title">{{ title }}</h1>
        <span v-if="subtitle" class="conversation-subtitle">{{ subtitle }}</span>
      </div>
    </div>

    <div class="topbar-actions">
      <button
        class="topbar-button topbar-button-primary"
        type="button"
        aria-label="新建任务"
        title="新建任务"
        @click="emit('new-task')"
      >
        <AppIcon name="message-square-plus" :size="16" aria-hidden="true" />
        <span class="topbar-button-label">新建任务</span>
      </button>
      <button
        class="topbar-button"
        type="button"
        aria-label="搜索"
        title="搜索（Ctrl K）"
        @click="emit('search')"
      >
        <AppIcon name="search" :size="16" aria-hidden="true" />
        <span class="topbar-button-label">搜索</span>
        <kbd>Ctrl K</kbd>
      </button>
      <button
        class="topbar-button"
        :class="{ 'is-active': workPanelOpen }"
        type="button"
        :aria-pressed="workPanelOpen"
        aria-label="切换工作面板"
        title="切换工作面板"
        @click="emit('toggle-work-panel')"
      >
        <AppIcon name="panel-right" :size="16" aria-hidden="true" />
        <span class="topbar-button-label">工作面板</span>
      </button>
    </div>
  </header>
</template>
