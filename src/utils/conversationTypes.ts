import type { SourceThinkingLevel } from '../i18n'
import type { AppIconName } from '../components/icons'
import type { ComposerAttachment } from './composerAttachments'

export interface ConversationUserEntry {
  id: string
  role: 'user'
  /** Draft text; private-use tokens mark where each attachment sits inline. */
  text: string
  attachments?: readonly ComposerAttachment[]
}

export interface ConversationAssistantStats {
  rounds: number
  steps: number
  tokensPerSecond: number
  durationSeconds: number
}

export interface ConversationAssistantEntry {
  id: string
  role: 'assistant'
  text: string
  stats: ConversationAssistantStats
}

export interface ConversationToolGroupEntry {
  id: string
  role: 'tool-group'
  count: number
}

export interface ConversationToolEntry {
  id: string
  role: 'tool'
  icon: AppIconName
  title: string
  summary: string
  state: 'success' | 'running' | 'error'
  kind: 'terminal' | 'code'
  body: string
  language?: string
  command?: string
  cwd?: string
}

export type ConversationFeedEntry =
  | ConversationUserEntry
  | ConversationAssistantEntry
  | ConversationToolGroupEntry
  | ConversationToolEntry

export interface ConversationSubmitRequest {
  text: string
  attachments: readonly ComposerAttachment[]
  modelId: string
  thinkingLevel: SourceThinkingLevel
}
