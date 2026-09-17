<script setup lang="ts">
import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'

type ConversationTab = 'conversation' | 'trajectory'

const props = defineProps<{
  title: string
  activeTab: ConversationTab
  workspacePath: string | null
  rightPanelOpen: boolean
}>()

const emit = defineEmits<{
  'update:active-tab': [tab: ConversationTab]
  'request-workspace': []
  'toggle-right-panel': []
}>()

const { copy } = useAppSettings()
</script>

<template>
  <header class="omp-conversation-header">
    <div class="omp-conversation-header-main">
      <div class="omp-conversation-header-title-row">
        <h1 class="omp-conversation-header-title" :title="props.title">{{ props.title }}</h1>
        <span class="omp-conversation-header-mode">{{ copy.conversationMode }}</span>
      </div>
      <div class="omp-conversation-header-tabs" role="tablist" :aria-label="copy.conversationTab">
        <button
          id="omp-conversation-tab"
          class="omp-conversation-header-tab"
          :class="{ 'omp-conversation-header-tab-active': props.activeTab === 'conversation' }"
          type="button"
          role="tab"
          aria-controls="omp-conversation-panel"
          :aria-selected="props.activeTab === 'conversation'"
          @click="emit('update:active-tab', 'conversation')"
        >
          {{ copy.conversationTab }}
        </button>
        <button
          id="omp-trajectory-tab"
          class="omp-conversation-header-tab"
          :class="{ 'omp-conversation-header-tab-active': props.activeTab === 'trajectory' }"
          type="button"
          role="tab"
          aria-controls="omp-conversation-panel"
          :aria-selected="props.activeTab === 'trajectory'"
          @click="emit('update:active-tab', 'trajectory')"
        >
          {{ copy.trajectoryTab }}
        </button>
      </div>
    </div>
    <div class="omp-conversation-header-actions">
      <button
        class="omp-conversation-header-action omp-conversation-header-workspace"
        type="button"
        :aria-label="props.workspacePath ?? copy.openWorkspace"
        :title="props.workspacePath ?? copy.openWorkspace"
        aria-haspopup="dialog"
        @click="emit('request-workspace')"
      >
        <AppIcon name="folder" :size="15" aria-hidden="true" />
        <AppIcon name="chevron-down" :size="12" aria-hidden="true" />
      </button>
      <button
        class="omp-conversation-header-action"
        :class="{ 'omp-conversation-header-action-active': props.rightPanelOpen }"
        type="button"
        :aria-label="props.rightPanelOpen ? copy.closeRightPanel : copy.openRightPanel"
        aria-controls="omp-work-panel"
        :aria-expanded="props.rightPanelOpen"
        @click="emit('toggle-right-panel')"
      >
        <AppIcon :name="props.rightPanelOpen ? 'panel-right-open' : 'panel-right'" :size="16" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>
