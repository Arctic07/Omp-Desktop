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

export interface SourceTrajectorySystemRecord {
  kind: 'system'
  icon: AppIconName
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

export const SOURCE_TRAJECTORY_SYSTEM_RECORD: SourceTrajectorySystemRecord = {
  kind: 'system',
  icon: 'settings',
}

export const SOURCE_TRAJECTORY_TURNS: readonly SourceTrajectoryTurn[] = [
  {
    turn: 1,
    groups: [
      {
        id: 'message-1',
        kind: 'message',
        description: '1 user request',
        records: [
          {
            index: 1,
            id: 'user-request',
            kind: 'user',
            icon: 'user-round',
            text: '检查首页 Composer 的布局，并把模型选择和工具输出展示得更清晰。',
            time: '0.0s',
            state: 'done',
          },
        ],
      },
      {
        id: 'step-1',
        kind: 'step',
        step: 1,
        description: '2.4s · 2 calls',
        records: [
          {
            index: 2,
            id: 'assistant-step-1',
            kind: 'message',
            icon: 'brain',
            text: '拆分检查范围，准备读取 Web 客户端目录。',
            input: '1.8K',
            output: '284',
            think: '620',
            time: '1.8s',
            state: 'done',
          },
          {
            index: 3,
            id: 'context-injection',
            kind: 'tool',
            icon: 'cloud-download',
            text: '上下文注入 · @deepseek-ai/omp-system-prompt',
            result: 'System prompt loaded',
            time: '0.2s',
            state: 'done',
          },
          {
            index: 4,
            id: 'pwsh-locate-web',
            kind: 'tool',
            icon: 'terminal',
            text: 'Pwsh · 定位 Web source 和 build 目录',
            result: 'apps/web/src · apps/web/dist',
            time: '0.6s',
            state: 'done',
          },
        ],
      },
      {
        id: 'step-2',
        kind: 'step',
        step: 2,
        description: '1.7s · 2 calls',
        records: [
          {
            index: 5,
            id: 'assistant-step-2',
            kind: 'message',
            icon: 'brain',
            text: '确认前端入口与依赖版本。',
            input: '2.1K',
            output: '146',
            think: '310',
            time: '0.9s',
            state: 'done',
          },
          {
            index: 6,
            id: 'read-web-package',
            kind: 'tool',
            icon: 'file-text',
            text: '读取 · workspace/deepseek-harness/apps/web/package.json',
            result: '@deepseek-ai/omp-web-frontend',
            time: '0.3s',
            state: 'done',
          },
          {
            index: 7,
            id: 'read-client-error',
            kind: 'tool',
            icon: 'file-text',
            text: '读取 · workspace/client/package.json',
            result: 'not found',
            time: '0.2s',
            state: 'error',
          },
        ],
      },
      {
        id: 'step-3',
        kind: 'step',
        step: 3,
        description: '2.8s · 3 calls',
        records: [
          {
            index: 8,
            id: 'assistant-step-3',
            kind: 'message',
            icon: 'brain',
            text: '生成 Composer 状态模型并检查类型。',
            input: '2.6K',
            output: '318',
            think: '740',
            time: '1.2s',
            state: 'done',
          },
          {
            index: 9,
            id: 'glob-app-packages',
            kind: 'tool',
            icon: 'search',
            text: 'Glob · apps/*/package.json',
            result: '3 个应用 package.json',
            time: '0.2s',
            state: 'done',
          },
          {
            index: 10,
            id: 'run-code-composer',
            kind: 'tool',
            icon: 'code-2',
            text: 'run_code · 生成 Composer 状态模型',
            result: 'toolRows = 15',
            time: '0.7s',
            state: 'done',
          },
          {
            index: 11,
            id: 'bash-typecheck',
            kind: 'tool',
            icon: 'terminal',
            text: 'bash · 检查界面构建状态',
            result: 'No errors found.',
            time: '0.8s',
            state: 'done',
          },
        ],
      },
      {
        id: 'step-4',
        kind: 'step',
        step: 4,
        description: '2.1s · 2 calls',
        records: [
          {
            index: 12,
            id: 'assistant-step-4',
            kind: 'message',
            icon: 'brain',
            text: '同步消息、代码输出和工具卡片的展示状态。',
            input: '2.4K',
            output: '412',
            think: '1.1K',
            time: '2.7s',
            state: 'done',
          },
          {
            index: 13,
            id: 'edit-composer-error',
            kind: 'tool',
            icon: 'file-diff',
            text: 'edit · 同步消息与工具卡片样式',
            result: 'preview needs a workspace selection',
            time: '0.4s',
            state: 'error',
          },
          {
            index: 14,
            id: 'typecheck-running',
            kind: 'tool',
            icon: 'terminal',
            text: 'pnpm typecheck · 检查 TypeScript 类型',
            result: 'Checking project files…',
            time: '—',
            state: 'running',
          },
          {
            index: 15,
            id: 'assistant-summary',
            kind: 'message',
            icon: 'brain',
            text: '输入区、消息正文、代码输出和工具调用使用同一套字号、行高和对齐轴。',
            input: '2.4K',
            output: '412',
            think: '1.1K',
            time: '2.7s',
            state: 'done',
          },
        ],
      },
    ],
  },
]

export const SOURCE_TRAJECTORY_TIMELINE: readonly SourceTrajectoryTimelineSpan[] = [
  { id: 'user-request', index: 1, lane: 'input', kind: 'user', start: 3, width: 8, state: 'done' },
  { id: 'assistant-step-1', index: 2, lane: 'model', kind: 'message', start: 13, width: 12, state: 'done' },
  { id: 'context-injection', index: 3, lane: 'tools', kind: 'tool', start: 21, width: 3, state: 'done' },
  { id: 'pwsh-locate-web', index: 4, lane: 'tools', kind: 'tool', start: 25, width: 5, state: 'done' },
  { id: 'assistant-step-2', index: 5, lane: 'model', kind: 'message', start: 31, width: 9, state: 'done' },
  { id: 'read-web-package', index: 6, lane: 'tools', kind: 'tool', start: 39, width: 4, state: 'done' },
  { id: 'read-client-error', index: 7, lane: 'tools', kind: 'tool', start: 44, width: 3, state: 'error' },
  { id: 'assistant-step-3', index: 8, lane: 'model', kind: 'message', start: 48, width: 12, state: 'done' },
  { id: 'glob-app-packages', index: 9, lane: 'tools', kind: 'tool', start: 56, width: 3, state: 'done' },
  { id: 'run-code-composer', index: 10, lane: 'tools', kind: 'tool', start: 60, width: 4, state: 'done' },
  { id: 'bash-typecheck', index: 11, lane: 'tools', kind: 'tool', start: 65, width: 4, state: 'done' },
  { id: 'assistant-step-4', index: 12, lane: 'model', kind: 'message', start: 72, width: 10, state: 'done' },
  { id: 'edit-composer-error', index: 13, lane: 'tools', kind: 'tool', start: 79, width: 4, state: 'error' },
  { id: 'typecheck-running', index: 14, lane: 'tools', kind: 'tool', start: 84, width: 4, state: 'running' },
  { id: 'assistant-summary', index: 15, lane: 'model', kind: 'message', start: 89, width: 8, state: 'done' },
]
