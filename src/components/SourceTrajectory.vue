<script setup lang="ts">
import { computed, ref, type CSSProperties, type VNodeRef } from 'vue'

import { useVirtualizer } from '@tanstack/vue-virtual'

import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'
import SourceTrajectoryRow from './SourceTrajectoryRow.vue'
import {
  SOURCE_TRAJECTORY_TIMELINE,
  SOURCE_TRAJECTORY_TURNS,
  type SourceTrajectoryLedgerRow,
  type SourceTrajectoryTimelineSpan,
} from './sourceTrajectoryData'

const { copy } = useAppSettings()
const ledgerScroll = ref<HTMLElement | null>(null)

const ledgerRows = computed<readonly SourceTrajectoryLedgerRow[]>(() => {
  const rows: SourceTrajectoryLedgerRow[] = [{ key: 'system', type: 'system' }]
  for (const turn of SOURCE_TRAJECTORY_TURNS) {
    rows.push({ key: `turn-${turn.turn}`, type: 'turn', turn })
    for (const group of turn.groups) {
      rows.push({ key: `group-${turn.turn}-${group.id}`, type: 'group', group })
      for (const record of group.records) {
        rows.push({ key: `record-${record.id}`, type: 'record', record })
      }
    }
  }
  return rows
})

const recordStats = computed(() => {
  let records = 0
  let calls = 0
  for (const row of ledgerRows.value) {
    if (row.type !== 'record') continue
    records += 1
    if (row.record.kind === 'tool') calls += 1
  }
  return { records, calls }
})

function estimateLedgerRowSize(index: number): number {
  const row = ledgerRows.value[index]
  if (row === undefined) return 34
  if (row.type === 'system') return 36
  if (row.type === 'turn') return 40
  if (row.type === 'group') return 32
  return 34
}

function getLedgerRowKey(index: number): string {
  return ledgerRows.value[index]?.key ?? String(index)
}

const virtualizer = useVirtualizer<HTMLElement, HTMLElement>(computed(() => ({
  count: ledgerRows.value.length,
  getScrollElement: () => ledgerScroll.value,
  getItemKey: getLedgerRowKey,
  estimateSize: estimateLedgerRowSize,
  initialRect: { width: 1024, height: 720 },
  overscan: 12,
  useAnimationFrameWithResizeObserver: true,
  scrollEndThreshold: 96,
})))
const measureTrajectoryElement: VNodeRef = (node) => {
  if (node instanceof HTMLElement) virtualizer.value.measureElement(node)
}

const virtualRows = computed(() => virtualizer.value.getVirtualItems().flatMap((virtualRow) => {
  const row = ledgerRows.value[virtualRow.index]
  return row === undefined ? [] : [{ ...virtualRow, row }]
}))
const totalSize = computed(() => virtualizer.value.getTotalSize())

const timelineLanes = computed(() => [
  {
    key: 'input',
    label: copy.value.trajectory.input,
    spans: SOURCE_TRAJECTORY_TIMELINE.filter(span => span.lane === 'input'),
  },
  {
    key: 'model',
    label: copy.value.trajectory.model,
    spans: SOURCE_TRAJECTORY_TIMELINE.filter(span => span.lane === 'model'),
  },
  {
    key: 'tools',
    label: copy.value.trajectory.tools,
    spans: SOURCE_TRAJECTORY_TIMELINE.filter(span => span.lane === 'tools'),
  },
])

type TrajectorySpanStyle = CSSProperties & {
  '--omp-trajectory-span-left': string
  '--omp-trajectory-span-width': string
}

function spanStyle(span: SourceTrajectoryTimelineSpan): TrajectorySpanStyle {
  return {
    '--omp-trajectory-span-left': `${span.start}%`,
    '--omp-trajectory-span-width': `${span.width}%`,
  }
}

type TrajectoryRowStyle = CSSProperties & {
  '--omp-trajectory-row-offset': string
  '--omp-trajectory-row-height': string
}

function rowStyle(row: { start: number; size: number }): TrajectoryRowStyle {
  return {
    '--omp-trajectory-row-offset': `${row.start}px`,
    '--omp-trajectory-row-height': `${row.size}px`,
  }
}
</script>

<template>
  <section class="omp-trajectory" :aria-label="copy.trajectoryTab">
    <div class="omp-trajectory-toolbar" role="toolbar" :aria-label="copy.trajectory.overview">
      <div class="omp-trajectory-toolbar-title">
        <AppIcon name="activity" :size="14" aria-hidden="true" />
        <strong>{{ copy.trajectory.overview }}</strong>
      </div>
      <div class="omp-trajectory-toolbar-summary">
        <span><strong>{{ SOURCE_TRAJECTORY_TURNS.length }}</strong> {{ copy.trajectory.turn }}</span>
        <span><strong>{{ recordStats.records }}</strong> {{ copy.trajectory.records }}</span>
        <span><strong>{{ recordStats.calls }}</strong> {{ copy.trajectory.calls }}</span>
        <span><strong>28.1K</strong> {{ copy.trajectory.tokens }}</span>
      </div>
    </div>

    <section class="omp-trajectory-overview" :aria-label="copy.trajectory.overviewAria">
      <div class="omp-trajectory-overview-plot">
        <div class="omp-trajectory-overview-labels" aria-hidden="true">
          <span v-for="lane in timelineLanes" :key="lane.key">{{ lane.label }}</span>
        </div>
        <div class="omp-trajectory-overview-track" aria-hidden="true">
          <div
            v-for="lane in timelineLanes"
            :key="lane.key"
            class="omp-trajectory-overview-lane"
            :data-lane="lane.key"
          >
            <span
              v-for="span in lane.spans"
              :key="span.id"
              class="omp-trajectory-overview-span"
              :class="`omp-trajectory-overview-span-${span.kind}`"
              :data-state="span.state"
              :style="spanStyle(span)"
            />
          </div>
        </div>
      </div>
      <div class="omp-trajectory-overview-scale" aria-hidden="true">
        <span>0s</span>
        <span>3s</span>
        <span>6s</span>
        <span>9s</span>
      </div>
    </section>

    <div class="omp-trajectory-ledger">
      <div class="omp-trajectory-ledger-head" aria-hidden="true">
        <span>{{ copy.trajectory.event }}</span>
        <span>{{ copy.trajectory.content }}</span>
      </div>
      <div ref="ledgerScroll" class="omp-trajectory-ledger-scroll">
        <div
          class="omp-trajectory-ledger-spacer"
          :style="{ '--omp-trajectory-total-size': `${totalSize}px` }"
        >
          <div
            v-for="virtualRow in virtualRows"
            :key="getLedgerRowKey(virtualRow.index)"
            class="omp-trajectory-virtual-row"
            :data-row-type="virtualRow.row.type"
            :style="rowStyle(virtualRow)"
            :ref="measureTrajectoryElement"
          >
            <SourceTrajectoryRow :row="virtualRow.row" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
