<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'
import { useAppSettings } from '../stores/appSettings'
import type { ReviewDiffTarget } from '../utils/desktopApi'
import { AppIcon } from './icons'
import SourceDiffPanel from './SourceDiffPanel.vue'
import SourceFilePanel from './SourceFilePanel.vue'
import SourceReviewPanel from './SourceReviewPanel.vue'

type WorkPanelTab = 'files' | 'review'

const WORK_PANEL_WIDTH_MIN = 294
const WORK_PANEL_WIDTH_MAX = 640
const RESIZE_KEYBOARD_STEP = 16

const props = defineProps<{
  width: number
  workspacePath: string | null
  activeTab: WorkPanelTab
  requestedFile: { path: string; seq: number } | null
  requestedDiff: ReviewDiffTarget | null
  refreshToken: number
}>()

const emit = defineEmits<{
  'update:active-tab': [tab: WorkPanelTab]
  close: []
  'open-file': [path: string]
  'open-diff': [target: ReviewDiffTarget]
  'refresh-workspace': []
  'close-diff': []
  resize: [width: number]
  'resize-start': []
  'resize-end': []
}>()

const { copy } = useAppSettings()
const resizeHandle = ref<HTMLDivElement | null>(null)
const resizing = ref(false)
const currentWidth = computed(() => clampWidth(props.width))
let activePointerId: number | null = null
let resizeStartX = 0
let resizeStartWidth = WORK_PANEL_WIDTH_MIN

function clampWidth(width: number): number {
  if (!Number.isFinite(width)) return WORK_PANEL_WIDTH_MIN
  return Math.min(WORK_PANEL_WIDTH_MAX, Math.max(WORK_PANEL_WIDTH_MIN, Math.round(width)))
}

function selectTab(tab: WorkPanelTab): void {
  if (tab === props.activeTab) return
  emit('update:active-tab', tab)
}

function closeDiff(): void {
  emit('close-diff')
  emit('update:active-tab', 'review')
}

function emitResize(width: number): void {
  emit('resize', clampWidth(width))
}

function startPointerResize(event: PointerEvent): void {
  if (event.button !== 0 || resizing.value) return
  const handle = resizeHandle.value
  if (handle === null) return

  activePointerId = event.pointerId
  resizeStartX = event.clientX
  resizeStartWidth = currentWidth.value
  resizing.value = true
  emit('resize-start')
  event.preventDefault()

  try {
    handle.setPointerCapture(event.pointerId)
  } catch {
    endPointerResize()
  }
}

function movePointerResize(event: PointerEvent): void {
  if (!resizing.value || activePointerId !== event.pointerId) return
  event.preventDefault()
  emitResize(resizeStartWidth + resizeStartX - event.clientX)
}

function endPointerResize(event?: PointerEvent): void {
  if (!resizing.value) return
  if (event !== undefined && activePointerId !== event.pointerId) return

  const pointerId = activePointerId
  const handle = resizeHandle.value
  activePointerId = null
  resizing.value = false

  if (pointerId !== null && handle !== null) {
    try {
      if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId)
    } catch {
      // Pointer capture may already be released by the browser.
    }
  }
  emit('resize-end')
}

function handleResizeKeydown(event: KeyboardEvent): void {
  let nextWidth: number | null = null
  if (event.key === 'ArrowLeft') nextWidth = currentWidth.value + RESIZE_KEYBOARD_STEP
  if (event.key === 'ArrowRight') nextWidth = currentWidth.value - RESIZE_KEYBOARD_STEP
  if (event.key === 'Home') nextWidth = WORK_PANEL_WIDTH_MIN
  if (event.key === 'End') nextWidth = WORK_PANEL_WIDTH_MAX
  if (nextWidth === null) return

  event.preventDefault()
  emitResize(nextWidth)
}

onUnmounted(() => {
  if (!resizing.value) return
  activePointerId = null
  resizing.value = false
  emit('resize-end')
})
</script>

<template>
  <aside id="omp-work-panel" class="omp-work-panel" :aria-label="copy.panelTitle">
    <div
      ref="resizeHandle"
      class="omp-work-panel-resize-handle"
      role="separator"
      aria-orientation="vertical"
      :aria-valuemin="WORK_PANEL_WIDTH_MIN"
      :aria-valuemax="WORK_PANEL_WIDTH_MAX"
      :aria-valuenow="currentWidth"
      :aria-label="copy.panelResize"
      tabindex="0"
      @keydown="handleResizeKeydown"
      @pointerdown="startPointerResize"
      @pointermove="movePointerResize"
      @pointerup="endPointerResize"
      @pointercancel="endPointerResize"
      @lostpointercapture="endPointerResize"
    ></div>
    <header class="omp-work-panel-header">
      <div class="omp-work-panel-heading">
        <h2>{{ copy.panelTitle }}</h2>
        <span v-if="props.workspacePath" class="omp-work-panel-path" :title="props.workspacePath">{{ props.workspacePath }}</span>
      </div>
      <button class="omp-work-panel-close" type="button" :aria-label="copy.closePanel" @click="emit('close')">
        <AppIcon name="x" :size="16" aria-hidden="true" />
      </button>
    </header>

    <nav v-if="props.requestedDiff === null" class="omp-work-panel-tabs" role="tablist" :aria-label="copy.panelTitle">
      <button
        id="omp-work-panel-files-tab"
        class="omp-work-panel-tab"
        :class="{ 'omp-work-panel-tab-active': props.activeTab === 'files' }"
        type="button"
        role="tab"
        aria-controls="omp-work-panel-files"
        :aria-selected="props.activeTab === 'files'"
        @click="selectTab('files')"
      >
        <AppIcon name="folder" :size="14" aria-hidden="true" />
        <span>{{ copy.filesTab }}</span>
      </button>
      <button
        id="omp-work-panel-review-tab"
        class="omp-work-panel-tab"
        :class="{ 'omp-work-panel-tab-active': props.activeTab === 'review' }"
        type="button"
        role="tab"
        aria-controls="omp-work-panel-review"
        :aria-selected="props.activeTab === 'review'"
        @click="selectTab('review')"
      >
        <AppIcon name="file-diff" :size="14" aria-hidden="true" />
        <span>{{ copy.reviewTab }}</span>
      </button>
    </nav>

    <div v-if="props.requestedDiff !== null" id="omp-work-panel-diff" role="tabpanel" class="omp-work-panel-pane">
      <SourceDiffPanel :workspace-path="props.workspacePath" :target="props.requestedDiff" @close="closeDiff" @open-file="emit('open-file', $event)" />
    </div>
    <div v-else-if="props.activeTab === 'files'" id="omp-work-panel-files" role="tabpanel" aria-labelledby="omp-work-panel-files-tab" class="omp-work-panel-pane">
      <SourceFilePanel :workspace-path="props.workspacePath" :requested-file="props.requestedFile" :refresh-token="props.refreshToken" />
    </div>
    <div v-else id="omp-work-panel-review" role="tabpanel" aria-labelledby="omp-work-panel-review-tab" class="omp-work-panel-pane">
      <SourceReviewPanel :workspace-path="props.workspacePath" @open-diff="emit('open-diff', $event)" @refresh-workspace="emit('refresh-workspace')" />
    </div>
  </aside>
</template>

<style scoped>
.omp-work-panel {
  position: relative;
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
  border-left: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
}
.omp-work-panel-resize-handle {
  position: absolute;
  z-index: 1;
  top: 0;
  bottom: 0;
  left: 0;
  width: 8px;
  cursor: col-resize;
  touch-action: none;
}

.omp-work-panel-resize-handle:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.omp-work-panel-resize-handle:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: -2px;
}

.omp-work-panel-header {
  display: flex;
  flex: none;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-height: 58px;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.omp-work-panel-heading {
  display: flex;
  min-width: 0;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
}

.omp-work-panel-heading h2 {
  margin: 0;
  color: var(--dsw-alias-label-primary);
  font-size: 14px;
  font-weight: 600;
  line-height: 20px;
}

.omp-work-panel-path {
  overflow: hidden;
  color: var(--dsw-alias-label-caption);
  font-size: 11px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omp-work-panel-close {
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}

.omp-work-panel-close:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.omp-work-panel-tabs {
  display: flex;
  flex: none;
  gap: 4px;
  padding: 8px 12px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.omp-work-panel-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 34px;
  padding: 0 8px 8px;
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-tertiary);
  font-size: 12px;
  line-height: 18px;
  cursor: pointer;
}

.omp-work-panel-tab::after {
  position: absolute;
  right: 6px;
  bottom: -1px;
  left: 6px;
  height: 2px;
  border-radius: 2px;
  background: transparent;
  content: '';
}

.omp-work-panel-tab:hover,
.omp-work-panel-tab-active {
  color: var(--dsw-alias-state-business-primary);
}

.omp-work-panel-tab-active::after {
  background: var(--dsw-alias-state-business-primary);
}

.omp-work-panel-content {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
}

.omp-work-panel-pane {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
}

.omp-work-panel-pane :deep(> *) {
  min-height: 0;
  flex: 1 1 auto;
}

@media (max-width: 680px) {
  .omp-work-panel-header {
    padding-right: 12px;
    padding-left: 12px;
  }

  .omp-work-panel-tabs {
    padding-right: 8px;
    padding-left: 8px;
  }
}
</style>
