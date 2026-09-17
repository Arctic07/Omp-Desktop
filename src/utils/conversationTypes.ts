import type { SourceThinkingLevel } from '../i18n'
import type { AppIconName } from '../components/icons'

export interface ConversationAttachment {
  path: string
  name: string
  meta: string
}

export function createConversationAttachment(path: string): ConversationAttachment {
  const normalizedPath = path.trim()
  const normalizedSeparators = normalizedPath.replaceAll('\\', '/')
  const name = normalizedSeparators.split('/').at(-1) || normalizedPath
  return { path: normalizedPath, name, meta: normalizedPath }
}

export interface ConversationUserEntry {
  id: string
  role: 'user'
  text: string
  attachments?: readonly ConversationAttachment[]
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
  paths: readonly string[]
  modelId: string
  thinkingLevel: SourceThinkingLevel
}
