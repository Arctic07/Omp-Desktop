<script setup lang="ts">
import { onUnmounted, ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import { copyText } from '../utils/clipboard'
import type {
  ConversationAssistantEntry,
  ConversationAttachment,
  ConversationFeedEntry,
} from '../utils/conversationTypes'
import { AppIcon } from './icons'
import SourceCodeBlock from './SourceCodeBlock.vue'
import SourceTerminalBlock from './SourceTerminalBlock.vue'

const props = defineProps<{
  entry: ConversationFeedEntry
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [open: boolean]
  'open-file': [path: string]
}>()

const { copy } = useAppSettings()
const copied = ref(false)
const copyError = ref(false)
let copyTimer: number | null = null

function clearCopyTimer(): void {
  if (copyTimer === null) {
    return
  }
  window.clearTimeout(copyTimer)
  copyTimer = null
}

async function copyAssistant(entry: ConversationAssistantEntry): Promise<void> {
  clearCopyTimer()
  copied.value = false
  copyError.value = false

  const succeeded = await copyText(entry.text)
  if (!succeeded) {
    copyError.value = true
    return
  }

  copied.value = true
  copyTimer = window.setTimeout(() => {
    copied.value = false
    copyTimer = null
  }, 1600)
}

function updateToolOpenState(event: Event): void {
  const details = event.currentTarget
  if (!(details instanceof HTMLDetailsElement)) {
    return
  }
  emit('update:open', details.open)
}

function openAttachment(attachment: ConversationAttachment): void {
  emit('open-file', attachment.path)
}

function toolStateLabel(state: 'success' | 'running' | 'error'): string {
  if (state === 'running') {
    return copy.value.toolRunning
  }
  if (state === 'error') {
    return copy.value.toolFailed
  }
  return copy.value.toolDone
}

onUnmounted(() => {
  clearCopyTimer()
})
</script>

<template>
  <article
    v-if="props.entry.role === 'user'"
    class="omp-feed-message omp-feed-message-user"
  >
    <div class="omp-feed-user-stack">
      <div
        v-for="attachment in props.entry.attachments"
        :key="attachment.path"
        class="omp-feed-attachment-card"
      >
        <AppIcon name="file-text" :size="18" aria-hidden="true" />
        <span class="omp-feed-attachment-copy">
          <strong :title="attachment.path">{{ attachment.name }}</strong>
          <small>{{ attachment.meta }}</small>
        </span>
        <button
          class="omp-feed-attachment-action"
          type="button"
          :aria-label="`${copy.reviewOpenFile}: ${attachment.name}`"
          @click="openAttachment(attachment)"
        >
          {{ copy.reviewOpenFile }}
        </button>
      </div>
      <div class="omp-feed-message-bubble">{{ props.entry.text }}</div>
      <div class="omp-feed-message-meta">
        <span>{{ copy.justNow }}</span>
      </div>
    </div>
  </article>

  <article
    v-else-if="props.entry.role === 'assistant'"
    class="omp-feed-message omp-feed-message-assistant"
  >
    <div class="omp-feed-message-copy">
      <p>{{ props.entry.text }}</p>
    </div>
    <div class="omp-feed-message-meta omp-feed-assistant-meta">
      <button
        class="omp-feed-assistant-copy"
        type="button"
        :aria-label="copied ? copy.toolCopied : copy.toolCopy"
        :title="copied ? copy.toolCopied : copy.toolCopy"
        @click="copyAssistant(props.entry)"
      >
        <AppIcon :name="copied ? 'check' : 'copy'" :size="14" aria-hidden="true" />
      </button>
      <span>{{ copy.duration }} {{ props.entry.stats.durationSeconds }}s</span>
      <span>{{ props.entry.stats.tokensPerSecond }} {{ copy.tokensPerSecond }}</span>
      <span>{{ props.entry.stats.rounds }} {{ copy.trajectory.turn }} {{ props.entry.stats.steps }} {{ copy.trajectory.step }}</span>
      <span v-if="copyError" class="omp-feed-copy-error" role="alert">{{ copy.copyFailed }}</span>
    </div>
  </article>

  <section
    v-else-if="props.entry.role === 'tool-group'"
    class="omp-feed-tool-group"
  >
    <AppIcon name="chevron-down" :size="14" aria-hidden="true" />
    <span class="omp-feed-tool-group-label">{{ props.entry.count }} {{ copy.toolCalls }}</span>
    <span class="omp-feed-tool-group-line" aria-hidden="true" />
  </section>

  <details
    v-else
    class="omp-feed-tool"
    :class="{ 'omp-feed-tool-running': props.entry.state === 'running', 'omp-feed-tool-error': props.entry.state === 'error' }"
    :open="props.open"
    @toggle="updateToolOpenState"
  >
    <summary>
      <span class="omp-feed-tool-leading" aria-hidden="true">
        <AppIcon name="chevron-right" class="omp-feed-tool-chevron" :size="14" aria-hidden="true" />
        <AppIcon :name="props.entry.icon" class="omp-feed-tool-icon" :size="14" aria-hidden="true" />
      </span>
      <strong>{{ props.entry.title }}</strong>
      <span class="omp-feed-tool-separator" aria-hidden="true" />
      <span class="omp-feed-tool-summary">{{ props.entry.summary }}</span>
      <span class="omp-feed-tool-state">{{ toolStateLabel(props.entry.state) }}</span>
    </summary>
    <SourceCodeBlock
      v-if="props.entry.kind === 'code'"
      :code="props.entry.body"
      :language="props.entry.language"
      :copy-label="copy.toolCopy"
      :copied-label="copy.toolCopied"
      :copy-failed-label="copy.copyFailed"
    />
    <SourceTerminalBlock
      v-else
      :command="props.entry.command ?? props.entry.title"
      :cwd="props.entry.cwd"
      :output="props.entry.body"
      :status="props.entry.state"
      :copy-label="copy.toolCopy"
      :copied-label="copy.toolCopied"
      :copy-failed-label="copy.copyFailed"
    />
  </details>
</template>
