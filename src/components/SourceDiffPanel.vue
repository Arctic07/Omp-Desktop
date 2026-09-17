<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'

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

const props = defineProps<SourceDiffPanelProps>()
const emit = defineEmits<{
  close: []
  'open-file': [path: string]
}>()
const { copy } = useAppSettings()
const file = computed<ReviewFile>(() => props.target.file)

const diffLoading = ref(false)
const diffError = ref('')
let renderSequence = 0

function queueDiffRender(): void {
  const sequence = ++renderSequence
  diffLoading.value = true
  diffError.value = ''
  void nextTick(() => {
    if (sequence !== renderSequence) return
    if (!Array.isArray(file.value.hunks)) diffError.value = copy.value.reviewDiffError
    diffLoading.value = false
  })
}

watch(() => props.target, queueDiffRender, { immediate: true })

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
const hasRows = computed(() => diffHunks.value.some((hunk) => hunk.rows.length > 0))

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
    <div v-else-if="diffLoading" class="omp-source-diff-state" role="status" aria-live="polite" :aria-label="copy.reviewDiffLoading">
      <AppIcon name="refresh-cw" class="omp-source-diff-spin" :size="19" aria-hidden="true" />
      <strong>{{ copy.reviewDiffLoading }}</strong>
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
    <div v-else class="omp-source-diff-scroll" role="region" :aria-label="`${copy.reviewDiffOld} / ${copy.reviewDiffNew}`">
      <div class="omp-source-diff-column-headings" aria-hidden="true">
        <span>{{ copy.reviewDiffOld }}</span>
        <span>{{ copy.reviewDiffNew }}</span>
      </div>
      <section v-for="(hunk, hunkIndex) in diffHunks" :key="`${hunk.hunk.header}:${hunkIndex}`" class="omp-source-diff-hunk">
        <h2 class="omp-source-diff-hunk-header">{{ hunk.hunk.header }}</h2>
        <div class="omp-source-diff-columns">
          <div class="omp-source-diff-column" role="region" :aria-label="`${copy.reviewDiffOld}: ${hunk.hunk.header}`">
            <div v-for="(row, rowIndex) in hunk.rows" :key="`old:${rowIndex}`" class="omp-source-diff-line" :class="lineClass(row.oldType)">
              <span class="omp-source-diff-number">{{ row.oldNumber ?? '' }}</span>
              <span class="omp-source-diff-marker" aria-hidden="true">{{ lineMarker(row.oldType) }}</span>
              <code>{{ row.oldText ?? '' }}</code>
            </div>
          </div>
          <div class="omp-source-diff-column" role="region" :aria-label="`${copy.reviewDiffNew}: ${hunk.hunk.header}`">
            <div v-for="(row, rowIndex) in hunk.rows" :key="`new:${rowIndex}`" class="omp-source-diff-line" :class="lineClass(row.newType)">
              <span class="omp-source-diff-number">{{ row.newNumber ?? '' }}</span>
              <span class="omp-source-diff-marker" aria-hidden="true">{{ lineMarker(row.newType) }}</span>
              <code>{{ row.newText ?? '' }}</code>
            </div>
          </div>
        </div>
      </section>
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
  overflow: auto;
  scrollbar-color: var(--omp-scrollbar-thumb) transparent;
  scrollbar-width: thin;
}

.omp-source-diff-column-headings {
  position: sticky;
  z-index: 1;
  top: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-width: 640px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  line-height: 26px;
  text-transform: uppercase;
}

.omp-source-diff-column-headings span {
  padding: 0 10px;
}

.omp-source-diff-column-headings span + span {
  border-left: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-diff-hunk {
  min-width: 640px;
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}

.omp-source-diff-hunk-header {
  margin: 0;
  padding: 6px 10px;
  background: var(--dsw-alias-markdown-code-block-banner);
  color: var(--dsw-alias-label-secondary);
  font: 10px/15px var(--ds-font-family-code);
  white-space: pre-wrap;
}

.omp-source-diff-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
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
  min-width: max-content;
  min-height: 22px;
  padding-right: 8px;
  font: var(--dsw-font-markdown-code-block);
  line-height: 22px;
}

.omp-source-diff-line code {
  min-width: 0;
  color: var(--dsw-alias-label-primary);
  white-space: pre;
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

.omp-source-diff-spin {
  animation: omp-source-diff-spin 700ms linear infinite;
}

@keyframes omp-source-diff-spin {
  to {
    transform: rotate(360deg);
  }
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
