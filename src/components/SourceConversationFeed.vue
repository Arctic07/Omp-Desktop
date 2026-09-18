<script setup lang="ts">
import { computed, ref, type VNodeRef } from 'vue'

import { useVirtualizer } from '@tanstack/vue-virtual'

import { useAppSettings } from '../stores/appSettings'
import type { ConversationFeedEntry } from '../utils/conversationTypes'
import SourceConversationEntry from './SourceConversationEntry.vue'

const props = defineProps<{
  scrollElement: HTMLElement | null
  entries: readonly ConversationFeedEntry[]
}>()

const emit = defineEmits<{
  'open-file': [path: string]
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
    const lineCount = Math.max(1, Math.ceil(entry.text.length / 72))
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
              @open-file="emit('open-file', $event)"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
