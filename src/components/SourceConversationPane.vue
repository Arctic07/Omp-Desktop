<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

import type { ConversationFeedEntry } from '../utils/conversationTypes'
import type { SessionScrollMemory } from '../utils/sessionPanes'
import SourceConversationFeed from './SourceConversationFeed.vue'

/**
 * One retained conversation pane.
 *
 * The surface mounts one of these per recently visited session and keys it on
 * the session id, so a pane's scroller belongs to that session for the pane's
 * whole lifetime. Hidden panes keep their layout box (`visibility`, never
 * `display`), which is what holds `scrollTop`: coming back is a visibility swap
 * with nothing to restore, and no other session can move this one's offset.
 */
const props = defineProps<{
  sessionId: string
  visible: boolean
  entries: readonly ConversationFeedEntry[]
  /**
   * Shell-owned memory of where each session was left. Read once, when this pane
   * is created — creation happens exactly on open, so that read is the memory of
   * the previous visit — and rewritten on every scroll. It outlives the pane, so
   * a session whose pane was evicted still returns to its own line.
   */
  sessionScrollMemory: Map<string, SessionScrollMemory>
}>()

/** Sub-pixel slack: fractional device pixel ratios leave a scroller a fraction short. */
const BOTTOM_TOLERANCE_PX = 2
/** Layout and programmatic scrolls emit the same event; only real input opens this window. */
const GESTURE_WINDOW_MS = 200
/** Inputs that can move this scroller; they separate a user scroll from layout noise. */
const GESTURE_EVENTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const

const scrollElement = ref<HTMLElement | null>(null)
const feed = ref<InstanceType<typeof SourceConversationFeed> | null>(null)
/** Where this session was left, or undefined on a first visit. */
const remembered = props.sessionScrollMemory.get(props.sessionId)
/** A pane with no memory opens on the newest entry, and follows it. */
const pinnedToBottom = ref(remembered?.following ?? true)
/**
 * A pane that re-opens scrolled up has to win the last word over the rows it
 * lays out: every row it measures corrects the offset, and the first pass works
 * from estimates. The anchor is therefore re-asserted on each content signal
 * until the reader's own input ends the claim.
 */
let pendingAnchor =
  remembered === undefined || remembered.following ? null : remembered
let lastGestureAt = Number.NEGATIVE_INFINITY
let scrollObserver: ResizeObserver | null = null

function markUserGesture(): void {
  pendingAnchor = null
  lastGestureAt = performance.now()
}

/**
 * Records where the reader is, and lets only their own scrolling change whether
 * this pane follows the newest entry.
 *
 * A resize, a clamped offset, a measurement correction and our own re-anchoring
 * all emit `scroll` too. Reading those as reader intent would either pin a pane
 * they scrolled up in or unpin one they left at the bottom, so follow mode moves
 * exclusively inside the window opened by real input on this scroller.
 */
function handleScroll(): void {
  const element = scrollElement.value
  if (element === null || element.clientHeight === 0) {
    return
  }
  const maxScrollTop = element.scrollHeight - element.clientHeight
  if (
    maxScrollTop > 0 &&
    performance.now() - lastGestureAt <= GESTURE_WINDOW_MS
  ) {
    pinnedToBottom.value = maxScrollTop - element.scrollTop <= BOTTOM_TOLERANCE_PX
  }
  // While a restore is still being asserted the position is ours, not the
  // reader's, so it must not be recorded as where they were.
  if (pendingAnchor !== null) {
    return
  }
  props.sessionScrollMemory.set(props.sessionId, {
    anchorId: feed.value?.topVisibleEntryId() ?? null,
    top: element.scrollTop,
    following: pinnedToBottom.value,
  })
}

/**
 * Content or viewport changed. A pane with a pending restore re-asserts its
 * anchor; one that follows the newest entry re-anchors to the bottom; a pane the
 * reader scrolled up in is left exactly where it is.
 */
function handleContentOrViewportChange(): void {
  if (!props.visible) {
    return
  }
  const anchor = pendingAnchor
  if (anchor !== null) {
    feed.value?.restoreAnchor(anchor.anchorId, anchor.top)
    return
  }
  if (pinnedToBottom.value) {
    feed.value?.scrollToBottom()
  }
}

watch(
  () => props.visible,
  (visible, wasVisible) => {
    if (!visible || wasVisible === true) {
      return
    }
    handleContentOrViewportChange()
  },
  { flush: 'post' },
)

onMounted((): void => {
  const element = scrollElement.value
  if (element === null) {
    return
  }
  for (const type of GESTURE_EVENTS) {
    element.addEventListener(type, markUserGesture, { capture: true, passive: true })
  }
  // Row heights resolve after the first paint, and the scroller's own box is
  // only known once it has been measured, so both feed the same anchor.
  scrollObserver = new ResizeObserver(handleContentOrViewportChange)
  scrollObserver.observe(element)
  // The anchor is asserted by `handleContentOrViewportChange`, which this class
  // of pane keeps re-running as its rows are measured.
  handleContentOrViewportChange()
})

onUnmounted((): void => {
  scrollObserver?.disconnect()
  scrollObserver = null
  const element = scrollElement.value
  if (element === null) {
    return
  }
  for (const type of GESTURE_EVENTS) {
    element.removeEventListener(type, markUserGesture, { capture: true })
  }
})
</script>

<template>
  <div
    class="omp-conversation-pane"
    :data-visible="props.visible ? 'true' : 'false'"
    :data-session-id="props.sessionId"
    :aria-hidden="props.visible ? undefined : true"
    :inert="!props.visible"
  >
    <div
      ref="scrollElement"
      class="omp-conversation-scroll-body"
      @scroll="handleScroll"
    >
      <SourceConversationFeed
        ref="feed"
        :scroll-element="scrollElement"
        :entries="props.entries"
        @total-size-change="handleContentOrViewportChange"
      />
    </div>
  </div>
</template>
