<script setup lang="ts">
import type { ConversationSubmitRequest } from '../utils/conversationTypes'
import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'
import FishLogo from './FishLogo.vue'
import SourceComposer from './SourceComposer.vue'

const props = defineProps<{
  sessionId: string | null
  workspacePath: string | null
  workspaceError: string
}>()

const emit = defineEmits<{
  'request-workspace': []
  submit: [request: ConversationSubmitRequest]
}>()

const { copy } = useAppSettings()
</script>

<template>
  <div
    class="omp-composer-seat"
    :class="{
      'omp-composer-hero': props.sessionId === null,
      'omp-composer-seat-session': props.sessionId !== null,
    }"
  >
    <div class="omp-hero-shell">
      <div class="omp-hero-stack">
        <div v-if="props.sessionId === null" class="omp-hero-headline">
          <span class="omp-hero-fish-hitbox">
            <FishLogo class="omp-hero-fish" :size="34" />
          </span>
          <span class="omp-hero-title-group">
            <span>{{ copy.heroHeadline }}</span>
            <span class="omp-hero-preview">{{ copy.preview }}</span>
          </span>
        </div>

        <div v-if="props.sessionId === null" class="omp-hero-workspace-row">
          <button
            class="omp-hero-workspace"
            type="button"
            :aria-label="props.workspacePath ?? copy.chooseWorkspace"
            aria-haspopup="dialog"
            :title="props.workspacePath ?? copy.chooseWorkspace"
            @click="emit('request-workspace')"
          >
            <AppIcon name="folder" class="omp-hero-workspace-folder" :size="16" aria-hidden="true" />
            <span class="omp-hero-workspace-path">{{ props.workspacePath ?? copy.chooseWorkspace }}</span>
            <AppIcon name="chevron-down" class="omp-hero-workspace-chevron" :size="12" aria-hidden="true" />
          </button>
          <p v-if="props.workspaceError" class="omp-conversation-workspace-error" role="alert">
            {{ props.workspaceError }}
          </p>
        </div>

        <SourceComposer
          :disabled="props.sessionId === null && props.workspacePath === null"
          :workspace-trigger="props.sessionId === null && props.workspacePath === null"
          :session-id="props.sessionId"
          @request-workspace="emit('request-workspace')"
          @submit="emit('submit', $event)"
        />
        <div
          v-if="props.sessionId !== null"
          class="omp-composer-stats"
          :aria-label="copy.conversationStats"
        >
          <span>3 轮 4 步 · 57 tok/s</span>
          <span>28.1K tok · 缓存命中 65%</span>
        </div>
      </div>
    </div>
  </div>
</template>
