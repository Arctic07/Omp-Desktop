<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { useChipSelectionHighlight } from '../composables/useChipSelectionHighlight'
import { useAppSettings } from '../stores/appSettings'
import { writeComposerClipboard } from '../utils/composerClipboard'
import type { ConversationFeedEntry, ConversationSubmitRequest } from '../utils/conversationTypes'
import SourceConversationComposer from './SourceConversationComposer.vue'
import SourceConversationFeed from './SourceConversationFeed.vue'
import SourceConversationHeader from './SourceConversationHeader.vue'
import SourceTrajectory from './SourceTrajectory.vue'

const props = defineProps<{
  sessionId: string | null
  sessionTitle: string
  workspacePath: string | null
  workspaceError: string
  entries: readonly ConversationFeedEntry[]
  rightPanelOpen: boolean
}>()

const emit = defineEmits<{
  'request-workspace': []
  'toggle-right-panel': []
  submit: [request: ConversationSubmitRequest]
}>()

const conversationRoot = ref<HTMLElement | null>(null)
const conversationScroll = ref<HTMLElement | null>(null)
const { copy } = useAppSettings()

useChipSelectionHighlight(conversationRoot)

type ConversationTab = 'conversation' | 'trajectory'

const activeTab = ref<ConversationTab>('conversation')
const conversationScrollTop = ref(0)
let rootResizeObserver: ResizeObserver | null = null
let scrollRestoreToken = 0

function invalidateScheduledScrollRestore(): void {
  scrollRestoreToken += 1
}

function scheduleScrollRestore(top: number): void {
  const token = ++scrollRestoreToken
  void nextTick(() => {
    if (token !== scrollRestoreToken || activeTab.value !== 'conversation') {
      return
    }

    const element = conversationScroll.value
    if (element === null) {
      return
    }
    element.scrollTo({ top, behavior: 'auto' })
  })
}

/** Copy events bubble; owning them here covers both the feed and the composer. */
function handleAttachmentCopy(event: ClipboardEvent): void {
  writeComposerClipboard(event, conversationRoot.value)
}

function selectTab(nextTab: ConversationTab): void {
  if (nextTab === activeTab.value) {
    return
  }

  if (activeTab.value === 'conversation') {
    conversationScrollTop.value = conversationScroll.value?.scrollTop ?? 0
  }

  invalidateScheduledScrollRestore()
  if (nextTab === 'trajectory') {
    conversationScroll.value?.scrollTo({ top: 0, behavior: 'auto' })
  }

  activeTab.value = nextTab
  if (nextTab === 'conversation') {
    scheduleScrollRestore(conversationScrollTop.value)
  }
}

watch(() => props.sessionId, () => {
  activeTab.value = 'conversation'
  conversationScrollTop.value = 0
  scheduleScrollRestore(0)
})

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
  invalidateScheduledScrollRestore()
  rootResizeObserver?.disconnect()
  rootResizeObserver = null
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
      :active-tab="activeTab"
      :workspace-path="props.workspacePath"
      :right-panel-open="props.rightPanelOpen"
      @update:active-tab="selectTab"
      @request-workspace="emit('request-workspace')"
      @toggle-right-panel="emit('toggle-right-panel')"
    />
    <div class="omp-conversation-body">
      <div
        ref="conversationScroll"
        class="omp-conversation-scroll-body"
        :class="{
          'omp-conversation-scroll-body-empty': props.sessionId === null,
          'omp-conversation-scroll-body-session': props.sessionId !== null,
        }"
      >
        <div
          v-if="props.sessionId !== null"
          id="omp-conversation-panel"
          class="omp-conversation-view"
          :class="{ 'omp-conversation-view-trajectory': activeTab === 'trajectory' }"
          role="tabpanel"
          :aria-labelledby="activeTab === 'trajectory' ? 'omp-trajectory-tab' : 'omp-conversation-tab'"
        >
          <div
            class="omp-conversation-tab-pane omp-conversation-tab-pane-conversation"
            :class="{ 'omp-conversation-tab-pane-inactive': activeTab !== 'conversation' }"
            :aria-hidden="activeTab !== 'conversation'"
          >
            <SourceConversationFeed
              :scroll-element="conversationScroll"
              :entries="props.entries"
            />
          </div>
          <div
            class="omp-conversation-tab-pane omp-conversation-tab-pane-trajectory"
            :class="{ 'omp-conversation-tab-pane-inactive': activeTab !== 'trajectory' }"
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
    </div>
  </section>
</template>
