<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

import { useChipSelectionHighlight } from '../composables/useChipSelectionHighlight'
import { useAppSettings } from '../stores/appSettings'
import { writeComposerClipboard } from '../utils/composerClipboard'
import type { ConversationFeedEntry, ConversationSubmitRequest } from '../utils/conversationTypes'
import type { SessionScrollMemory } from '../utils/sessionPanes'
import SourceConversationComposer from './SourceConversationComposer.vue'
import SourceConversationHeader from './SourceConversationHeader.vue'
import SourceConversationPane from './SourceConversationPane.vue'
import SourceTrajectory from './SourceTrajectory.vue'

type ConversationTab = 'conversation' | 'trajectory'

/** Stable empty slice, so a session with no entries keeps a constant prop identity. */
const NO_ENTRIES: readonly ConversationFeedEntry[] = []

const props = defineProps<{
  sessionId: string | null
  sessionTitle: string
  retainedSessionIds: readonly string[]
  entriesBySession: Record<string, readonly ConversationFeedEntry[]>
  /**
   * Shell-owned memory of where each session was left, in pixels. Panes are
   * bounded, so this is what survives an eviction; the surface only forwards it.
   */
  sessionScrollMemory: Map<string, SessionScrollMemory>
  workspacePath: string | null
  workspaceError: string
  rightPanelOpen: boolean
}>()

const emit = defineEmits<{
  'request-workspace': []
  'toggle-right-panel': []
  submit: [request: ConversationSubmitRequest]
}>()

const conversationRoot = ref<HTMLElement | null>(null)
const activeTab = ref<ConversationTab>('conversation')
const { copy } = useAppSettings()

useChipSelectionHighlight(conversationRoot)

let rootResizeObserver: ResizeObserver | null = null

/** Copy events bubble; owning them here covers both the panes and the composer. */
function handleAttachmentCopy(event: ClipboardEvent): void {
  writeComposerClipboard(event, conversationRoot.value)
}

onMounted((): void => {
  if (typeof ResizeObserver === 'undefined' || conversationRoot.value === null) {
    return
  }

  rootResizeObserver = new ResizeObserver(([entry]) => {
    const width = entry?.contentRect.width
    if (width === undefined) {
      return
    }
    conversationRoot.value?.style.setProperty('--omp-conversation-column-width', `${width}px`)
  })
  rootResizeObserver.observe(conversationRoot.value)
})

onUnmounted((): void => {
  rootResizeObserver?.disconnect()
  rootResizeObserver = null
})

/**
 * The tab belongs to the surface, not to a pane: a session change returns to the
 * conversation view, while every pane keeps its own scroll position either way.
 */
watch(() => props.sessionId, () => {
  activeTab.value = 'conversation'
})
</script>

<template>
  <section
    ref="conversationRoot"
    class="omp-conversation-root"
    :data-phase="props.sessionId === null ? 'hero' : 'active'"
    :aria-label="copy.conversationTab"
    @copy="handleAttachmentCopy"
  >
    <SourceConversationHeader
      v-if="props.sessionId !== null"
      :title="props.sessionTitle"
      v-model:active-tab="activeTab"
      :workspace-path="props.workspacePath"
      :right-panel-open="props.rightPanelOpen"
      @request-workspace="emit('request-workspace')"
      @toggle-right-panel="emit('toggle-right-panel')"
    />
    <div
      class="omp-conversation-body"
      :class="{ 'omp-conversation-body-hero': props.sessionId === null }"
    >
      <div
        v-if="props.retainedSessionIds.length > 0"
        id="omp-conversation-panel"
        class="omp-conversation-stage"
        :class="{ 'omp-conversation-kept-hidden': props.sessionId === null }"
        role="tabpanel"
        :aria-hidden="props.sessionId === null ? true : undefined"
        :inert="props.sessionId === null"
        :aria-labelledby="activeTab === 'trajectory' ? 'omp-trajectory-tab' : 'omp-conversation-tab'"
      >
        <div
          class="omp-conversation-panes"
          :class="{ 'omp-conversation-kept-hidden': activeTab !== 'conversation' }"
          :aria-hidden="activeTab !== 'conversation'"
        >
          <!--
            Rendered in the order panes were first opened and never rearranged:
            moving a pane's DOM node resets the scroll position it exists to
            keep. Panes stay mounted through the hero phase too (the stage is
            hidden, not unmounted), so starting a new session does not cost a
            retained position. The active session always has a pane here, so
            visibility never depends on the order.
          -->
          <SourceConversationPane
            v-for="retainedId in props.retainedSessionIds"
            :key="retainedId"
            :session-id="retainedId"
            :visible="retainedId === props.sessionId"
            :entries="props.entriesBySession[retainedId] ?? NO_ENTRIES"
            :session-scroll-memory="props.sessionScrollMemory"
          />
        </div>
        <div
          class="omp-conversation-trajectory"
          :class="{ 'omp-conversation-kept-hidden': activeTab !== 'trajectory' }"
          :aria-hidden="activeTab !== 'trajectory'"
        >
          <SourceTrajectory />
        </div>
      </div>
      <SourceConversationComposer
        :session-id="props.sessionId"
        :workspace-path="props.workspacePath"
        :workspace-error="props.workspaceError"
        @request-workspace="emit('request-workspace')"
        @submit="emit('submit', $event)"
      />
    </div>
  </section>
</template>
