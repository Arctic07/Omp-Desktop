<script setup lang="ts">
import { computed, ref, watch, type VNodeRef } from 'vue'

import { useVirtualizer } from '@tanstack/vue-virtual'

import { useAppSettings } from '../stores/appSettings'
import type { ConversationFeedEntry } from '../utils/conversationTypes'
import SourceConversationEntry from './SourceConversationEntry.vue'

const props = defineProps<{
  scrollElement: HTMLElement | null
  entries: readonly ConversationFeedEntry[]
}>()

const emit = defineEmits<{
  /**
   * Measured extent of the mounted rows. A pane that follows the newest entry
   * re-anchors from this, so an estimate that resolves into a taller row cannot
   * leave the viewport short of the bottom.
   */
  'total-size-change': [size: number]
}>()

const { copy } = useAppSettings()
const openToolIds = ref<Set<string>>(new Set())

function updateToolOpenState(id: string, open: boolean): void {
  const nextOpenToolIds = new Set(openToolIds.value)
  if (open) {
    nextOpenToolIds.add(id)
  } else {
    nextOpenToolIds.delete(id)
  }
  openToolIds.value = nextOpenToolIds
}

function estimateEntrySize(index: number): number {
  const entry = props.entries[index]
  if (entry === undefined) {
    return 48
  }

  const rowGap = index === props.entries.length - 1 ? 0 : 16
  if (entry.role === 'tool-group') {
    return 32 + rowGap
  }
  if (entry.role === 'assistant') {
    const lineCount = Math.max(1, Math.ceil(entry.text.length / 72))
    return 24 + lineCount * 24 + 8 + 24 + rowGap
  }
  if (entry.role === 'user') {
    // Each attachment token is one character but paints as its full leaf name.
    const visualLength = entry.attachments?.reduce(
      (total, attachment) => total + attachment.name.length - 1,
      entry.text.length,
    ) ?? entry.text.length
    const lineCount = Math.max(1, Math.ceil(visualLength / 72))
    return 92 + lineCount * 22 + rowGap
  }
  if (!openToolIds.value.has(entry.id)) {
    return 28 + rowGap
  }

  const bodyLineCount = Math.max(1, entry.body.split('\n').length)
  const bodyHeight = Math.min(224, 32 + bodyLineCount * 19)
  return (entry.kind === 'code' ? 60 : 52) + bodyHeight + rowGap
}

function getEntryKey(index: number): string {
  return props.entries[index]?.id ?? String(index)
}

const virtualizer = useVirtualizer<HTMLElement, HTMLElement>(computed(() => ({
  count: props.entries.length,
  getScrollElement: () => props.scrollElement,
  getItemKey: getEntryKey,
  estimateSize: estimateEntrySize,
  initialRect: { width: 1024, height: 720 },
  overscan: 7,
  useAnimationFrameWithResizeObserver: true,
  scrollEndThreshold: 96,
})))

const virtualRows = computed(() => virtualizer.value.getVirtualItems().flatMap((virtualRow) => {
  const entry = props.entries[virtualRow.index]
  return entry === undefined ? [] : [{ ...virtualRow, entry }]
}))
const totalSize = computed<number>(() => virtualizer.value.getTotalSize())

watch(totalSize, (size) => emit('total-size-change', size))

/**
 * Anchors the newest entry against the bottom of the viewport.
 *
 * `scrollToEnd` targets the scroller's own maximum for the last item, so an
 * estimate that has not resolved yet cannot leave the viewport short of the
 * bottom. It also writes through the virtualizer, which keeps its internal
 * offset in step; a direct `scrollTop` write would leave that bookkeeping a
 * frame behind, and the virtualizer's own measurement corrections would then
 * move the viewport.
 */
function scrollToBottom(): void {
  virtualizer.value.scrollToEnd({ behavior: 'auto' })
}

/** The entry at the top of the viewport, read from the DOM offset rather than
 * the virtualizer's own (which lags a scroll event by one listener turn). */
function topVisibleEntryId(): string | null {
  const element = props.scrollElement
  if (element === null) {
    return null
  }
  const scrollTop = element.scrollTop
  const row = virtualizer.value
    .getVirtualItems()
    .find((item) => item.start + item.size > scrollTop + 1)
  return row === undefined ? null : (props.entries[row.index]?.id ?? null)
}

/**
 * Returns the viewport to the entry a session was left on, falling back to a
 * pixel offset when that entry no longer exists.
 *
 * Restoring by index rather than by offset is what makes this hold: the rows
 * above are still estimated at this point, so the virtualizer's first-measure
 * corrections move the offset to keep the *entry* at the top — exactly the
 * behaviour a pixel value from a measured layout would defeat.
 */
function restoreAnchor(entryId: string | null, fallbackTop: number): void {
  const index =
    entryId === null
      ? -1
      : props.entries.findIndex((entry) => entry.id === entryId)
  if (index < 0) {
    virtualizer.value.scrollToOffset(fallbackTop, { behavior: 'auto' })
    return
  }
  virtualizer.value.scrollToIndex(index, { align: 'start', behavior: 'auto' })
}

defineExpose({ scrollToBottom, topVisibleEntryId, restoreAnchor })

const measureVirtualRow: VNodeRef = (node) => {
  if (node === null) {
    virtualizer.value.measureElement(null)
  } else if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
    virtualizer.value.measureElement(node)
  }
}
</script>

<template>
  <section class="omp-conversation-feed" :aria-label="copy.conversationTab">
    <div class="omp-conversation-feed-list">
      <p v-if="props.entries.length === 0" class="omp-conversation-feed-empty">{{ copy.noMessages }}</p>
      <div
        v-else
        class="omp-conversation-feed-spacer"
        :style="{ '--omp-feed-total-size': `${totalSize}px` }"
      >
        <div
          v-for="virtualRow in virtualRows"
          :key="String(virtualRow.key)"
          class="omp-conversation-feed-row"
          :class="{ 'omp-conversation-feed-row-last': virtualRow.index === props.entries.length - 1 }"
          :data-index="virtualRow.index"
          :style="{
            '--omp-feed-row-offset': `${virtualRow.start}px`,
            '--omp-feed-row-height': `${virtualRow.size}px`,
          }"
        >
          <div :ref="measureVirtualRow" :data-index="virtualRow.index">
            <SourceConversationEntry
              :entry="virtualRow.entry"
              :open="openToolIds.has(virtualRow.entry.id)"
              @update:open="updateToolOpenState(virtualRow.entry.id, $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
