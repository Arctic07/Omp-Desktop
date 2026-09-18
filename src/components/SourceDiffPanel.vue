<script setup lang="ts">
import { computed, nextTick, ref, type VNodeRef, watch } from 'vue'

import { useVirtualizer } from '@tanstack/vue-virtual'

import { useAppSettings } from '../stores/appSettings'
import type { ReviewDiffTarget, ReviewFile, ReviewHunk, ReviewLine } from '../utils/desktopApi'
import { AppIcon } from './icons'

interface SourceDiffPanelProps {
  workspacePath: string | null
  target: ReviewDiffTarget
}

interface DiffRow {
  oldText: string | null
  newText: string | null
  oldNumber: number | null
  newNumber: number | null
  oldType: ReviewLine['type'] | null
  newType: ReviewLine['type'] | null
}

interface DiffHunkView {
  hunk: ReviewHunk
  rows: DiffRow[]
  oldStart: number | null
  newStart: number | null
}

interface DiffHunkRenderRow {
  key: string
  kind: 'hunk'
  hunk: DiffHunkView
  lastInHunk: boolean
}

interface DiffLineRenderRow {
  key: string
  kind: 'line'
  hunk: DiffHunkView
  row: DiffRow
  lastInHunk: boolean
}

type DiffRenderRow = DiffHunkRenderRow | DiffLineRenderRow

const props = defineProps<SourceDiffPanelProps>()
const emit = defineEmits<{
  close: []
  'open-file': [path: string]
}>()
const { copy } = useAppSettings()
const file = computed<ReviewFile>(() => props.target.file)

const diffError = computed(() => (Array.isArray(file.value.hunks) ? '' : copy.value.reviewDiffError))

const fileName = computed(() => {
  const path = file.value.path.replaceAll('\\', '/')
  const segments = path.split('/')
  return segments[segments.length - 1] || path
})
const statusLabel = computed(() => {
  const labels: Record<ReviewFile['status'], string> = {
    added: 'A',
    modified: 'M',
    deleted: 'D',
    renamed: 'R',
    untracked: 'U',
  }
  return labels[file.value.status]
})
const isUnavailable = computed(() => file.value.binary || file.value.tooLarge)

function parseHunkStart(header: string): { oldStart: number; newStart: number } | null {
  const match = header.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/)
  if (match === null) return null
  return { oldStart: Number(match[1]), newStart: Number(match[2]) }
}

function lineRows(lines: ReviewLine[], oldStart: number, newStart: number): DiffRow[] {
  const rows: DiffRow[] = []
  let oldNumber = oldStart
  let newNumber = newStart
  let index = 0

  while (index < lines.length) {
    const line = lines[index]
    if (line.type === 'context') {
      rows.push({
        oldText: line.text,
        newText: line.text,
        oldNumber,
        newNumber,
        oldType: 'context',
        newType: 'context',
      })
      oldNumber += 1
      newNumber += 1
      index += 1
      continue
    }

    const deleted: ReviewLine[] = []
    const added: ReviewLine[] = []
    while (index < lines.length && lines[index].type !== 'context') {
      const change = lines[index]
      if (change.type === 'del') deleted.push(change)
      else added.push(change)
      index += 1
    }

    const count = Math.max(deleted.length, added.length)
    for (let pairIndex = 0; pairIndex < count; pairIndex += 1) {
      const oldLine = deleted[pairIndex]
      const newLine = added[pairIndex]
      rows.push({
        oldText: oldLine?.text ?? null,
        newText: newLine?.text ?? null,
        oldNumber: oldLine === undefined ? null : oldNumber,
        newNumber: newLine === undefined ? null : newNumber,
        oldType: oldLine?.type ?? null,
        newType: newLine?.type ?? null,
      })
      if (oldLine !== undefined) oldNumber += 1
      if (newLine !== undefined) newNumber += 1
    }
  }

  return rows
}

function hunkView(hunk: ReviewHunk): DiffHunkView {
  const starts = parseHunkStart(hunk.header)
  if (starts === null) return { hunk, rows: [], oldStart: null, newStart: null }
  return {
    hunk,
    rows: lineRows(hunk.lines, starts.oldStart, starts.newStart),
    oldStart: starts.oldStart,
    newStart: starts.newStart,
  }
}

const diffHunks = computed<DiffHunkView[]>(() => (Array.isArray(file.value.hunks) ? file.value.hunks.map(hunkView) : []))
const hasRows = computed(() => diffHunks.value.some((hunk) => hunk.rows.length > 0))
const diffTargetKey = computed(() => `${props.target.section}:${file.value.path}`)
const renderRows = computed<DiffRenderRow[]>(() => {
  const rows: DiffRenderRow[] = []
  diffHunks.value.forEach((hunk, hunkIndex) => {
    const hunkKey = `${diffTargetKey.value}:${hunkIndex}`
    rows.push({
      key: `${hunkKey}:hunk`,
      kind: 'hunk',
      hunk,
      lastInHunk: hunk.rows.length === 0,
    })
    hunk.rows.forEach((row, rowIndex) => {
      rows.push({
        key: `${hunkKey}:line:${rowIndex}`,
        kind: 'line',
        hunk,
        row,
        lastInHunk: rowIndex === hunk.rows.length - 1,
      })
    })
  })
  return rows
})

function lineClass(type: ReviewLine['type'] | null): string {
  return type === null ? 'omp-source-diff-line-empty' : `omp-source-diff-line-${type}`
}

function lineMarker(type: ReviewLine['type'] | null): string {
  if (type === 'del') return '-'
  if (type === 'add') return '+'
  return type === 'context' ? ' ' : ''
}

function fileOpenLabel(): string {
  return `${copy.value.reviewDiffOpenFile}: ${file.value.path}`
}

function close(): void {
  emit('close')
}

function openFile(): void {
  emit('open-file', file.value.path)
}

const diffScroll = ref<HTMLElement | null>(null)

function estimateDiffRowSize(index: number): number {
  const renderRow = renderRows.value[index]
  if (renderRow === undefined || renderRow.kind === 'hunk') {
    return 28
  }

  const textLength = Math.max(renderRow.row.oldText?.length ?? 0, renderRow.row.newText?.length ?? 0)
  return Math.max(1, Math.ceil(textLength / 48)) * 22
}

function getDiffRowKey(index: number): string {
  return renderRows.value[index]?.key ?? String(index)
}

const virtualizer = useVirtualizer<HTMLElement, HTMLElement>(computed(() => ({
  count: renderRows.value.length,
  getScrollElement: () => diffScroll.value,
  getItemKey: getDiffRowKey,
  estimateSize: estimateDiffRowSize,
  initialRect: { width: 1024, height: 720 },
  overscan: 8,
  useAnimationFrameWithResizeObserver: true,
  scrollEndThreshold: 96,
})))

const virtualRows = computed(() => virtualizer.value.getVirtualItems().flatMap((virtualRow) => {
  const row = renderRows.value[virtualRow.index]
  return row === undefined ? [] : [{ ...virtualRow, row }]
}))
const totalSize = computed<number>(() => virtualizer.value.getTotalSize())
const measureVirtualRow: VNodeRef = (node) => {
  if (typeof HTMLElement !== 'undefined' && node instanceof HTMLElement) {
    virtualizer.value.measureElement(node)
  }
}

let renderSequence = 0
function resetDiffScroll(): void {
  const sequence = ++renderSequence
  diffScroll.value?.scrollTo({ top: 0, left: 0 })
  void nextTick(() => {
    if (sequence !== renderSequence) return
    const scrollElement = diffScroll.value
    if (scrollElement === null) return
    virtualizer.value.measure()
    scrollElement.scrollTo({ top: 0, left: 0 })
    virtualizer.value.scrollToOffset(0)
  })
}

watch(() => props.target, resetDiffScroll, { immediate: true })
</script>

<template>
  <section class="omp-source-diff-panel" :aria-label="`${copy.reviewDiffNew}: ${file.path}`">
    <header class="omp-source-diff-toolbar">
      <div class="omp-source-diff-heading">
        <button class="omp-source-diff-back" type="button" :aria-label="copy.reviewDiffBack" :title="copy.reviewDiffBack" @click="close">
          <AppIcon name="chevron-left" :size="16" aria-hidden="true" />
          <span>{{ copy.reviewDiffBack }}</span>
        </button>
        <div class="omp-source-diff-title-copy">
          <strong :title="file.path">{{ fileName }}</strong>
          <span :title="file.path">{{ file.path }}</span>
        </div>
      </div>
      <button class="omp-source-diff-close" type="button" :aria-label="copy.closePanel" :title="copy.closePanel" @click="close">
        <AppIcon name="x" :size="16" aria-hidden="true" />
      </button>
    </header>

    <div class="omp-source-diff-meta">
      <span class="omp-source-diff-status" :class="`omp-source-diff-status-${file.status}`" :aria-label="`${copy.reviewDiffStatus}: ${statusLabel}`">{{ statusLabel }}</span>
      <span class="omp-source-diff-meta-path" :title="file.oldPath ?? file.path">
        <span v-if="file.oldPath">{{ file.oldPath }} → </span>{{ file.path }}
      </span>
      <span class="omp-source-diff-stats" :aria-label="copy.reviewDiffStats">
        <span class="omp-source-diff-add">+{{ file.additions }}</span>
        <span class="omp-source-diff-del">−{{ file.deletions }}</span>
      </span>
      <button class="omp-source-diff-open-file" type="button" :aria-label="fileOpenLabel()" :title="fileOpenLabel()" @click="openFile">
        <AppIcon name="file-text" :size="13" aria-hidden="true" />
        <span>{{ copy.reviewDiffOpenFile }}</span>
      </button>
    </div>

    <div v-if="props.workspacePath === null" class="omp-source-diff-state" role="status" :aria-label="copy.fileNoWorkspace">
      <AppIcon name="folder-open" :size="22" aria-hidden="true" />
      <strong>{{ copy.fileNoWorkspace }}</strong>
    </div>
    <div v-else-if="diffError" class="omp-source-diff-state omp-source-diff-state-error" role="alert" :aria-label="diffError">
      <AppIcon name="circle-alert" :size="22" aria-hidden="true" />
      <strong>{{ diffError }}</strong>
    </div>
    <div v-else-if="isUnavailable && file.binary" class="omp-source-diff-state" role="status" :aria-label="copy.reviewDiffBinary">
      <AppIcon name="file-diff" :size="22" aria-hidden="true" />
      <strong>{{ copy.reviewDiffBinary }}</strong>
    </div>
    <div v-else-if="isUnavailable && file.tooLarge" class="omp-source-diff-state" role="status" :aria-label="copy.reviewDiffTooLarge">
      <AppIcon name="file-diff" :size="22" aria-hidden="true" />
      <strong>{{ copy.reviewDiffTooLarge }}</strong>
    </div>
    <div v-else-if="!hasRows" class="omp-source-diff-state" role="status" :aria-label="copy.reviewDiffEmpty">
      <AppIcon name="file-diff" :size="22" aria-hidden="true" />
      <strong>{{ copy.reviewDiffEmpty }}</strong>
    </div>
    <div v-else ref="diffScroll" class="omp-source-diff-scroll" role="region" :aria-label="`${copy.reviewDiffOld} / ${copy.reviewDiffNew}`">
      <div class="omp-source-diff-column-headings" aria-hidden="true">
        <span>{{ copy.reviewDiffOld }}</span>
        <span>{{ copy.reviewDiffNew }}</span>
      </div>
      <div class="omp-source-diff-virtual-spacer" :style="{ '--omp-source-diff-total-size': `${totalSize}px` }">
        <div
          v-for="virtualRow in virtualRows"
          :key="String(virtualRow.key)"
          class="omp-source-diff-virtual-row"
          :data-row-kind="virtualRow.row.kind"
          :style="{
            '--omp-source-diff-row-offset': `${virtualRow.start}px`,
            '--omp-source-diff-row-height': `${virtualRow.size}px`,
          }"
        >
          <div
            :ref="measureVirtualRow"
            class="omp-source-diff-virtual-row-content"
            :class="{ 'omp-source-diff-virtual-row-end': virtualRow.row.lastInHunk }"
          >
            <h2 v-if="virtualRow.row.kind === 'hunk'" class="omp-source-diff-hunk-header">{{ virtualRow.row.hunk.hunk.header }}</h2>
            <div v-else class="omp-source-diff-columns">
              <div class="omp-source-diff-column" role="region" :aria-label="`${copy.reviewDiffOld}: ${virtualRow.row.hunk.hunk.header}`">
                <div class="omp-source-diff-line" :class="lineClass(virtualRow.row.row.oldType)">
                  <span class="omp-source-diff-number">{{ virtualRow.row.row.oldNumber ?? '' }}</span>
                  <span class="omp-source-diff-marker" aria-hidden="true">{{ lineMarker(virtualRow.row.row.oldType) }}</span>
                  <code>{{ virtualRow.row.row.oldText ?? '' }}</code>
                </div>
              </div>
              <div class="omp-source-diff-column" role="region" :aria-label="`${copy.reviewDiffNew}: ${virtualRow.row.hunk.hunk.header}`">
                <div class="omp-source-diff-line" :class="lineClass(virtualRow.row.row.newType)">
                  <span class="omp-source-diff-number">{{ virtualRow.row.row.newNumber ?? '' }}</span>
                  <span class="omp-source-diff-marker" aria-hidden="true">{{ lineMarker(virtualRow.row.row.newType) }}</span>
                  <code>{{ virtualRow.row.row.newText ?? '' }}</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.omp-source-diff-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: hidden;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-primary);
}

.omp-source-diff-toolbar,
.omp-source-diff-heading,
.omp-source-diff-back,
.omp-source-diff-meta,
.omp-source-diff-column-headings {
  display: flex;
  align-items: center;
}

.omp-source-diff-toolbar {
  flex: none;
  justify-content: space-between;
  gap: 10px;
  min-height: 48px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-diff-heading {
  min-width: 0;
  gap: 8px;
}

.omp-source-diff-back,
.omp-source-diff-close,
.omp-source-diff-open-file {
  border: 0;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}

.omp-source-diff-back {
  flex: none;
  gap: 3px;
  min-height: 28px;
  padding: 0 4px 0 0;
  font-size: 11px;
}

.omp-source-diff-back:hover,
.omp-source-diff-close:hover,
.omp-source-diff-open-file:hover {
  color: var(--dsw-alias-state-business-primary);
}

.omp-source-diff-close {
  display: grid;
  flex: none;
  width: 28px;
  height: 28px;
  place-items: center;
  border-radius: 5px;
}

.omp-source-diff-title-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.omp-source-diff-title-copy strong,
.omp-source-diff-title-copy span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omp-source-diff-title-copy strong {
  font-size: 12px;
  line-height: 17px;
}

.omp-source-diff-title-copy span {
  color: var(--dsw-alias-label-tertiary);
  font: 10px/14px var(--ds-font-family-code);
}

.omp-source-diff-meta {
  flex: none;
  gap: 7px;
  min-width: 0;
  min-height: 36px;
  padding: 5px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  font: 10px/15px var(--ds-font-family-code);
}

.omp-source-diff-status {
  display: grid;
  flex: none;
  width: 18px;
  height: 18px;
  place-items: center;
  border-radius: 3px;
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-secondary);
  font-weight: 600;
}

.omp-source-diff-status-added,
.omp-source-diff-status-modified,
.omp-source-diff-status-untracked {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 15%, transparent);
  color: var(--dsw-alias-state-business-primary);
}

.omp-source-diff-status-deleted {
  background: color-mix(in srgb, var(--dsw-static-red-400) 15%, transparent);
  color: var(--dsw-static-red-600);
}

.omp-source-diff-status-renamed {
  background: color-mix(in srgb, var(--omp-source-status-renamed) 16%, transparent);
  color: var(--omp-source-status-renamed-label);
}

.omp-source-diff-meta-path {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.omp-source-diff-stats {
  display: flex;
  flex: none;
  gap: 5px;
}

.omp-source-diff-add {
  color: var(--dsw-alias-state-business-primary);
}

.omp-source-diff-del {
  color: var(--ds-static-red-600, var(--dsw-static-red-600));
}

.omp-source-diff-open-file {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  min-height: 24px;
  padding: 0 5px;
  font: 10px/15px var(--ds-font-family-code);
}

.omp-source-diff-scroll {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-color: var(--omp-scrollbar-thumb) transparent;
  scrollbar-width: thin;
}

.omp-source-diff-column-headings {
  position: sticky;
  z-index: 1;
  top: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-width: 0;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 26px;
  text-transform: uppercase;
}

.omp-source-diff-column-headings span {
  min-width: 0;
  padding: 0 10px;
}

.omp-source-diff-column-headings span + span {
  border-left: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-diff-virtual-spacer {
  position: relative;
  width: 100%;
  min-width: 0;
  height: var(--omp-source-diff-total-size);
}

.omp-source-diff-virtual-row {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  min-width: 0;
  height: var(--omp-source-diff-row-height);
  transform: translateY(var(--omp-source-diff-row-offset));
}

.omp-source-diff-virtual-row-content {
  min-width: 0;
}

.omp-source-diff-virtual-row-end {
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-diff-hunk-header {
  min-width: 0;
  margin: 0;
  padding: 6px 10px;
  background: var(--dsw-alias-markdown-code-block-banner);
  color: var(--dsw-alias-label-secondary);
  font: 10px/15px var(--ds-font-family-code);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.omp-source-diff-columns {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
}

.omp-source-diff-column {
  min-width: 0;
}

.omp-source-diff-column + .omp-source-diff-column {
  border-left: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-diff-line {
  display: grid;
  grid-template-columns: 42px 18px minmax(0, 1fr);
  min-width: 0;
  min-height: 22px;
  padding-right: 8px;
  font: var(--dsw-font-markdown-code-block);
  line-height: 22px;
}

.omp-source-diff-line code {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.omp-source-diff-number {
  padding-right: 7px;
  color: var(--dsw-alias-label-caption);
  text-align: right;
  user-select: none;
}

.omp-source-diff-marker {
  color: var(--dsw-alias-label-caption);
  text-align: center;
  user-select: none;
}

.omp-source-diff-line-add {
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 11%, transparent);
}

.omp-source-diff-line-add .omp-source-diff-marker {
  color: var(--dsw-alias-state-business-primary);
}

.omp-source-diff-line-del {
  background: color-mix(in srgb, var(--ds-static-red-400, var(--dsw-static-red-400)) 11%, transparent);
}

.omp-source-diff-line-del .omp-source-diff-marker {
  color: var(--dsw-static-red-600);
}

.omp-source-diff-line-empty {
  background: color-mix(in srgb, var(--dsw-alias-label-caption) 4%, transparent);
}

.omp-source-diff-state {
  display: flex;
  min-height: 150px;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 7px;
  padding: 28px 18px;
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 18px;
  text-align: center;
}
.omp-source-diff-state-error strong {
  color: var(--dsw-static-red-600);
}

.omp-source-diff-state strong {
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
}

.omp-source-diff-back:focus-visible,
.omp-source-diff-close:focus-visible,
.omp-source-diff-open-file:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary);
  outline-offset: 1px;
}

@media (max-width: 560px) {
  .omp-source-diff-back span,
  .omp-source-diff-open-file span {
    display: none;
  }
}
</style>
