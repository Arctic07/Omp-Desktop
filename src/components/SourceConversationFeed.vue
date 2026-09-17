<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'

import { useVirtualizer } from '@tanstack/vue-virtual'

import { useAppSettings } from '../stores/appSettings'
import { AppIcon, type AppIconName } from './icons'
import SourceCodeBlock from './SourceCodeBlock.vue'
import SourceTerminalBlock from './SourceTerminalBlock.vue'

interface UserEntry {
  id: string
  role: 'user'
  text: string
  attachment?: {
    name: string
    meta: string
  }
}

interface AssistantEntryStats {
  rounds: number
  steps: number
  tokensPerSecond: number
  durationSeconds: number
}

interface AssistantEntry {
  id: string
  role: 'assistant'
  text: string
  stats: AssistantEntryStats
}

interface ToolGroupEntry {
  id: string
  role: 'tool-group'
  label: string
}

interface ToolEntry {
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

type FeedEntry = UserEntry | AssistantEntry | ToolGroupEntry | ToolEntry

const props = defineProps<{
  scrollElement: HTMLElement | null
}>()

const { copy } = useAppSettings()

const entries: readonly FeedEntry[] = [
  {
    id: 'user-request',
    role: 'user',
    text: '检查首页 Composer 的布局，并把模型选择和工具输出展示得更清晰。',
    attachment: { name: 'tsconfig.node.json', meta: 'JSON 334B' },
  },
  {
    id: 'tool-group',
    role: 'tool-group',
    label: '15 次工具调用',
  },
  {
    id: 'tool-context',
    role: 'tool',
    icon: 'cloud-download',
    title: '上下文注入',
    summary: '@deepseek-ai/omp-system-prompt',
    state: 'success',
    kind: 'terminal',
    body: 'System prompt loaded',
    command: 'load system prompt',
    cwd: 'Codex',
  },
  {
    id: 'tool-pwsh',
    role: 'tool',
    icon: 'terminal',
    title: 'Pwsh',
    summary: 'Locate Web source and build directories',
    state: 'success',
    kind: 'terminal',
    command: 'Get-ChildItem -Recurse -Directory workspace/deepseek-harness/apps/web | Select-Object Name',
    cwd: 'Codex',
    body: 'FullName\n--------\nworkspace/deepseek-harness/apps/web/dist\nworkspace/deepseek-harness/apps/web/lib\nworkspace/deepseek-harness/apps/web/src\nworkspace/deepseek-harness/apps/web/lib/types/src',
  },
  {
    id: 'tool-read',
    role: 'tool',
    icon: 'file-text',
    title: '读取',
    summary: 'workspace/deepseek-harness/apps/web/package.json',
    state: 'success',
    kind: 'code',
    language: 'json',
    body: '{\n  "name": "@deepseek-ai/omp-web-frontend",\n  "scripts": {\n    "dev": "vite",\n    "build": "vite build"\n  }\n}',
  },
  {
    id: 'tool-read-error',
    role: 'tool',
    icon: 'file-text',
    title: '读取',
    summary: 'Error: cannot read workspace/client/package.json: not found',
    state: 'error',
    kind: 'terminal',
    command: 'read workspace/client/package.json',
    cwd: 'Codex',
    body: 'Error: cannot read workspace/client/package.json: not found',
  },
  {
    id: 'tool-glob',
    role: 'tool',
    icon: 'search',
    title: 'Glob',
    summary: 'apps/*/package.json',
    state: 'success',
    kind: 'terminal',
    command: 'glob apps/*/package.json',
    cwd: 'Codex',
    body: 'apps/web/package.json\napps/cli/package.json\napps/desktop/package.json',
  },
  {
    id: 'tool-code',
    role: 'tool',
    icon: 'code-2',
    title: 'run_code',
    summary: '生成 Composer 状态模型',
    state: 'success',
    kind: 'code',
    language: 'typescript',
    body: "const selectedModel = 'gpt-5.6-luna'\nconst workspace = 'workspace/omp-tauri-des'\nconst toolRows = 15",
  },
  {
    id: 'tool-bash',
    role: 'tool',
    icon: 'terminal',
    title: 'bash',
    summary: '检查界面构建状态',
    state: 'success',
    kind: 'terminal',
    command: 'pnpm typecheck',
    cwd: 'Codex',
    body: '> omp-tauri-desktop@0.1.0 typecheck\n> vue-tsc --noEmit\n\nNo errors found.',
  },
  {
    id: 'tool-edit',
    role: 'tool',
    icon: 'file-diff',
    title: 'edit',
    summary: '同步消息与工具卡片样式',
    state: 'error',
    kind: 'terminal',
    command: 'apply patch src/components',
    cwd: 'Codex',
    body: '2 files changed\nError: preview needs a workspace selection',
  },
  {
    id: 'tool-check',
    role: 'tool',
    icon: 'terminal',
    title: 'pnpm typecheck',
    summary: '检查 TypeScript 类型',
    state: 'running',
    kind: 'terminal',
    command: 'pnpm typecheck',
    cwd: 'Codex',
    body: 'Checking project files…',
  },
  {
    id: 'assistant-summary',
    role: 'assistant',
    text: '输入区、消息正文、代码输出和工具调用现在使用同一套字号、行高和对齐轴；工具卡片支持展开查看输入、输出与代码内容。',
    stats: {
      rounds: 3,
      steps: 4,
      tokensPerSecond: 57,
      durationSeconds: 9,
    },
  },
]

const openToolIds = ref(new Set(['tool-pwsh', 'tool-read']))
const copiedAssistantId = ref<string | null>(null)
let copiedAssistantTimer: number | null = null

function clearCopiedAssistantTimer(): void {
  if (copiedAssistantTimer === null) return
  window.clearTimeout(copiedAssistantTimer)
  copiedAssistantTimer = null
}

async function copyAssistant(entry: AssistantEntry): Promise<void> {
  clearCopiedAssistantTimer()
  copiedAssistantId.value = null
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.writeText !== 'function') return

  try {
    await navigator.clipboard.writeText(entry.text)
  } catch {
    return
  }

  copiedAssistantId.value = entry.id
  copiedAssistantTimer = window.setTimeout(() => {
    copiedAssistantId.value = null
    copiedAssistantTimer = null
  }, 1600)
}

function updateToolOpenState(id: string, event: Event): void {
  const details = event.currentTarget
  if (!(details instanceof HTMLDetailsElement)) return

  const nextOpenToolIds = new Set(openToolIds.value)
  if (details.open) nextOpenToolIds.add(id)
  else nextOpenToolIds.delete(id)
  openToolIds.value = nextOpenToolIds
}

function toolStateLabel(state: ToolEntry['state']): string {
  if (state === 'running') return copy.value.toolRunning
  if (state === 'error') return copy.value.toolFailed
  return copy.value.toolDone
}

function estimateEntrySize(index: number): number {
  const entry = entries[index]
  if (entry === undefined) return 48

  const rowGap = index === entries.length - 1 ? 0 : 16
  if (entry.role === 'tool-group') return 32 + rowGap
  if (entry.role === 'assistant') {
    const lineCount = Math.max(1, Math.ceil(entry.text.length / 72))
    const messageHeight = lineCount * 24
    const metaHeight = 24
    return 24 + messageHeight + 8 + metaHeight + rowGap
  }

  if (entry.role === 'user') {
    const lineCount = Math.max(1, Math.ceil(entry.text.length / 72))
    return 92 + lineCount * 22 + rowGap
  }

  if (!openToolIds.value.has(entry.id)) return 28 + rowGap
  const bodyLineCount = Math.max(1, entry.body.split('\n').length)
  if (entry.kind === 'code') return 60 + Math.min(220, 32 + bodyLineCount * 19) + rowGap
  return 52 + Math.min(224, 32 + bodyLineCount * 19) + rowGap
}

function getEntryKey(index: number): string {
  return entries[index]?.id ?? String(index)
}

const virtualizer = useVirtualizer<HTMLElement, HTMLElement>(computed(() => ({
  count: entries.length,
  getScrollElement: () => props.scrollElement,
  getItemKey: getEntryKey,
  estimateSize: estimateEntrySize,
  initialRect: { width: 1024, height: 720 },
  overscan: 7,
  useAnimationFrameWithResizeObserver: true,
  scrollEndThreshold: 96,
})))

const virtualRows = computed(() => virtualizer.value.getVirtualItems().map((virtualRow) => ({
  ...virtualRow,
  entry: entries[virtualRow.index],
})))
const totalSize = computed(() => virtualizer.value.getTotalSize())

let initialScrollTimer: number | null = null

watch([totalSize, () => props.scrollElement], ([, element]) => {
  if (element === null) return
  if (initialScrollTimer !== null) window.clearTimeout(initialScrollTimer)
  initialScrollTimer = window.setTimeout(() => {
    element.scrollTo({ top: 0, behavior: 'auto' })
    initialScrollTimer = null
  }, 800)
}, { flush: 'post', immediate: true })

onUnmounted(() => {
  clearCopiedAssistantTimer()
  if (initialScrollTimer !== null) window.clearTimeout(initialScrollTimer)
})

watch(() => props.scrollElement, (element) => {
  if (element === null) return
  window.requestAnimationFrame(() => {
    element.scrollTop = 0
  })
}, { flush: 'post' })
</script>

<template>
  <section class="omp-conversation-feed" aria-label="Conversation stream">
    <div class="omp-conversation-feed-list">
      <div
        class="omp-conversation-feed-spacer"
        :style="{ '--omp-feed-total-size': `${totalSize}px` }"
      >
        <div
          v-for="virtualRow in virtualRows"
          :key="virtualRow.key"
          class="omp-conversation-feed-row"
          :class="{ 'omp-conversation-feed-row-last': virtualRow.index === entries.length - 1 }"
          :data-index="virtualRow.index"
          :style="{
            '--omp-feed-row-offset': `${virtualRow.start}px`,
            '--omp-feed-row-height': `${virtualRow.size}px`,
          }"
        >
          <article
            v-if="virtualRow.entry.role === 'user'"
            class="omp-feed-message omp-feed-message-user"
            :data-index="virtualRow.index"
            :ref="virtualizer.measureElement"
          >
            <div class="omp-feed-user-stack">
              <div v-if="virtualRow.entry.attachment" class="omp-feed-attachment-card">
                <AppIcon name="file-text" :size="18" />
                <span class="omp-feed-attachment-copy">
                  <strong>{{ virtualRow.entry.attachment.name }}</strong>
                  <small>{{ virtualRow.entry.attachment.meta }}</small>
                </span>
              </div>
              <button v-if="virtualRow.entry.attachment" class="omp-feed-attachment-action" type="button">查看文件</button>
              <div class="omp-feed-message-bubble">{{ virtualRow.entry.text }}</div>
              <div class="omp-feed-message-meta">
                <span>刚刚</span>
                <AppIcon name="copy" :size="14" />
              </div>
            </div>
          </article>
          <article
            v-else-if="virtualRow.entry.role === 'assistant'"
            class="omp-feed-message omp-feed-message-assistant"
            :data-index="virtualRow.index"
            :ref="virtualizer.measureElement"
          >
            <div class="omp-feed-message-copy">
              <p>{{ virtualRow.entry.text }}</p>
            </div>
            <div class="omp-feed-message-meta omp-feed-assistant-meta">
              <button
                class="omp-feed-assistant-copy"
                type="button"
                :aria-label="copiedAssistantId === virtualRow.entry.id ? copy.toolCopied : copy.toolCopy"
                :title="copiedAssistantId === virtualRow.entry.id ? copy.toolCopied : copy.toolCopy"
                @click="copyAssistant(virtualRow.entry)"
              >
                <AppIcon :name="copiedAssistantId === virtualRow.entry.id ? 'check' : 'copy'" :size="14" aria-hidden="true" />
              </button>
              <span>用时 {{ virtualRow.entry.stats.durationSeconds }} 秒</span>
              <span>{{ virtualRow.entry.stats.tokensPerSecond }} tok/s</span>
              <span>{{ virtualRow.entry.stats.rounds }} 轮 {{ virtualRow.entry.stats.steps }} 步</span>
            </div>
          </article>
          <section
            v-else-if="virtualRow.entry.role === 'tool-group'"
            class="omp-feed-tool-group"
            :data-index="virtualRow.index"
            :ref="virtualizer.measureElement"
          >
            <AppIcon name="chevron-down" :size="14" aria-hidden="true" />
            <span class="omp-feed-tool-group-label">{{ virtualRow.entry.label }}</span>
            <span class="omp-feed-tool-group-line" aria-hidden="true" />
          </section>
          <details
            v-else
            class="omp-feed-tool"
            :data-index="virtualRow.index"
            :class="{ 'omp-feed-tool-running': virtualRow.entry.state === 'running', 'omp-feed-tool-error': virtualRow.entry.state === 'error' }"
            :open="openToolIds.has(virtualRow.entry.id)"
            @toggle="updateToolOpenState(virtualRow.entry.id, $event)"
            :ref="virtualizer.measureElement"
          >
            <summary>
              <span class="omp-feed-tool-leading" aria-hidden="true">
                <AppIcon name="chevron-right" class="omp-feed-tool-chevron" :size="14" aria-hidden="true" />
                <AppIcon :name="virtualRow.entry.icon" class="omp-feed-tool-icon" :size="14" />
              </span>
              <strong>{{ virtualRow.entry.title }}</strong>
              <span class="omp-feed-tool-separator" aria-hidden="true" />
              <span class="omp-feed-tool-summary">{{ virtualRow.entry.summary }}</span>
              <span class="omp-feed-tool-state">{{ toolStateLabel(virtualRow.entry.state) }}</span>
            </summary>
            <SourceCodeBlock
              v-if="virtualRow.entry.kind === 'code'"
              :code="virtualRow.entry.body"
              :language="virtualRow.entry.language"
              :copy-label="copy.toolCopy"
              :copied-label="copy.toolCopied"
            />
            <SourceTerminalBlock
              v-else
              :command="virtualRow.entry.command ?? virtualRow.entry.title"
              :cwd="virtualRow.entry.cwd"
              :output="virtualRow.entry.body"
              :status="virtualRow.entry.state"
              :copy-label="copy.toolCopy"
              :copied-label="copy.toolCopied"
            />
          </details>
        </div>
      </div>
    </div>
  </section>
</template>

