<script setup lang="ts">
import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'
import {
  type SourceTrajectoryGroup,
  type SourceTrajectoryLedgerRow,
  type SourceTrajectoryRecord,
  type SourceTrajectoryRecordKind,
  type SourceTrajectoryRecordState,
} from './sourceTrajectoryData'

const props = defineProps<{
  row: SourceTrajectoryLedgerRow
}>()

const { copy } = useAppSettings()

function kindLabel(kind: SourceTrajectoryRecordKind): string {
  if (kind === 'user') return copy.value.trajectory.user
  if (kind === 'message') return copy.value.trajectory.message
  return copy.value.trajectory.tool
}

function groupLabel(group: SourceTrajectoryGroup): string {
  if (group.kind === 'message') return copy.value.trajectory.message
  return `${copy.value.trajectory.step} ${group.step}`
}

function turnLabel(turn: number): string {
  return `${copy.value.trajectory.turn} ${turn}`
}

function stateLabel(state: SourceTrajectoryRecordState | undefined): string {
  if (state === 'running') return copy.value.toolRunning
  if (state === 'error') return copy.value.toolFailed
  return copy.value.toolDone
}

function recordLabel(record: SourceTrajectoryRecord): string {
  const result = record.result === undefined ? '' : ` → ${record.result}`
  return `#${record.index} ${kindLabel(record.kind)} ${record.text}${result}`
}
</script>

<template>
  <div
    v-if="props.row.type === 'system'"
    class="omp-trajectory-system-record"
    :aria-label="`${copy.trajectory.system} ${copy.trajectory.initialPrompt}`"
  >
    <span class="omp-trajectory-record-event">
      <span class="omp-trajectory-record-index">—</span>
      <span class="omp-trajectory-kind-tag omp-trajectory-kind-tag-system">
        <AppIcon name="settings" :size="12" aria-hidden="true" />
        {{ copy.trajectory.system }}
      </span>
    </span>
    <span class="omp-trajectory-record-content">
      {{ copy.trajectory.initialPrompt }}
    </span>
  </div>

  <div v-else-if="props.row.type === 'turn'" class="omp-trajectory-turn-header">
    <strong>{{ turnLabel(props.row.turn.turn) }}</strong>
    <div class="omp-trajectory-turn-columns" aria-hidden="true">
      <span>{{ copy.trajectory.input }}</span>
      <span>{{ copy.trajectory.output }}</span>
      <span>{{ copy.trajectory.think }}</span>
      <span>{{ copy.trajectory.time }}</span>
    </div>
  </div>

  <div v-else-if="props.row.type === 'group'" class="omp-trajectory-group-header">
    <strong>{{ groupLabel(props.row.group) }}</strong>
    <span>{{ props.row.group.description }}</span>
  </div>

  <div
    v-else
    class="omp-trajectory-record"
    :class="`omp-trajectory-record-${props.row.record.kind}`"
    :data-kind="props.row.record.kind"
    :data-state="props.row.record.state"
    :aria-label="recordLabel(props.row.record)"
    :title="recordLabel(props.row.record)"
  >
    <span class="omp-trajectory-record-event">
      <span class="omp-trajectory-record-index">#{{ props.row.record.index }}</span>
      <span class="omp-trajectory-kind-tag" :class="`omp-trajectory-kind-tag-${props.row.record.kind}`">
        <AppIcon :name="props.row.record.icon" :size="12" aria-hidden="true" />
        {{ kindLabel(props.row.record.kind) }}
      </span>
    </span>
    <span class="omp-trajectory-record-content">
      <span class="omp-trajectory-record-text">{{ props.row.record.text }}</span>
      <span v-if="props.row.record.result !== undefined" class="omp-trajectory-record-result">
        <span aria-hidden="true">→</span>
        {{ props.row.record.result }}
      </span>
      <span v-if="props.row.record.kind === 'tool'" class="omp-trajectory-record-status">
        {{ stateLabel(props.row.record.state) }}
      </span>
    </span>
    <span class="omp-trajectory-record-metric">{{ props.row.record.input ?? '—' }}</span>
    <span class="omp-trajectory-record-metric">{{ props.row.record.output ?? '—' }}</span>
    <span class="omp-trajectory-record-metric">{{ props.row.record.think ?? '—' }}</span>
    <span class="omp-trajectory-record-metric">{{ props.row.record.time }}</span>
  </div>
</template>
