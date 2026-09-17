import type { AppIconName } from './icons'

export type SourceTrajectoryRecordKind = 'user' | 'message' | 'tool'
export type SourceTrajectoryRecordState = 'done' | 'running' | 'error'

export interface SourceTrajectoryRecord {
  id: string
  index: number
  kind: SourceTrajectoryRecordKind
  icon: AppIconName
  text: string
  result?: string
  input?: string
  output?: string
  think?: string
  time: string
  state?: SourceTrajectoryRecordState
}

export type SourceTrajectoryGroup =
  | {
    id: string
    kind: 'message'
    description: string
    records: readonly SourceTrajectoryRecord[]
  }
  | {
    id: string
    kind: 'step'
    step: number
    description: string
    records: readonly SourceTrajectoryRecord[]
  }

export interface SourceTrajectoryTurn {
  turn: number
  groups: readonly SourceTrajectoryGroup[]
}

export type SourceTrajectoryLedgerRow =
  | { key: string; type: 'system' }
  | { key: string; type: 'turn'; turn: SourceTrajectoryTurn }
  | { key: string; type: 'group'; group: SourceTrajectoryGroup }
  | { key: string; type: 'record'; record: SourceTrajectoryRecord }

export interface SourceTrajectoryTimelineSpan {
  id: string
  index: number
  lane: 'input' | 'model' | 'tools'
  kind: 'user' | 'message' | 'tool'
  start: number
  width: number
  state?: SourceTrajectoryRecordState
}

export function createTrajectoryLedgerRows(
  turns: readonly SourceTrajectoryTurn[],
): SourceTrajectoryLedgerRow[] {
  const rows: SourceTrajectoryLedgerRow[] = [{ key: 'system', type: 'system' }]
  for (const turn of turns) {
    rows.push({ key: `turn-${turn.turn}`, type: 'turn', turn })
    for (const group of turn.groups) {
      rows.push({ key: `group-${turn.turn}-${group.id}`, type: 'group', group })
      for (const record of group.records) {
        rows.push({ key: `record-${record.id}`, type: 'record', record })
      }
    }
  }
  return rows
}
