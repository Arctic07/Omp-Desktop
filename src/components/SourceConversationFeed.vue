<script setup lang="ts">
import { computed, ref } from 'vue'

import { useVirtualizer } from '@tanstack/vue-virtual'

interface UserEntry {
  id: string
  role: 'user'
  text: string
}

interface AssistantEntry {
  id: string
  role: 'assistant'
  text: string
}

interface ToolEntry {
  id: string
  role: 'tool'
  title: string
  summary: string
  state: 'success' | 'running'
  kind: 'terminal' | 'code'
  body: string
}

type FeedEntry = UserEntry | AssistantEntry | ToolEntry

const props = defineProps<{
  scrollElement: HTMLElement | null
}>()

const entries: readonly FeedEntry[] = [
  {
    id: 'user-request',
    role: 'user',
    text: '检查首页 Composer 的布局，并把模型选择和工具输出展示得更清晰。',
  },
  {
    id: 'assistant-plan',
    role: 'assistant',
    text: '我会先查看输入区、侧栏和对话渲染结构，再按现有设计令牌整理界面。',
  },
  {
    id: 'tool-read',
    role: 'tool',
    title: 'read',
    summary: '读取 src/components 与参考界面结构',
    state: 'success',
    kind: 'terminal',
    body: 'src/components/SourceComposer.vue\nsrc/components/SourceSidebar.vue\nsrc/components/SourceConversation.vue\n\n3 files inspected',
  },
  {
    id: 'tool-code',
    role: 'tool',
    title: 'run_code',
    summary: '生成 Composer 状态模型',
    state: 'success',
    kind: 'code',
    body: "const selectedModel = 'GPT-5.6 Luna Default'\nconst planEnabled = true\nconst workspace = 'C:\\project\\Omp-Desktop'",
  },
  {
    id: 'tool-check',
    role: 'tool',
    title: 'pnpm typecheck',
    summary: '检查 TypeScript 类型',
    state: 'running',
    kind: 'terminal',
    body: '> omp-tauri-desktop@0.1.0 typecheck\n> vue-tsc --noEmit\n\nChecking project files…',
  },
  {
    id: 'assistant-summary',
    role: 'assistant',
    text: '输入区已改为左对齐布局，Plan 与模型选择可交互，工具调用和代码输出也有独立的可折叠信息层。',
  },
]

const feedList = ref<HTMLElement | null>(null)
const openToolIds = ref(new Set(['tool-read', 'tool-code']))

function updateToolOpenState(id: string, event: Event): void {
  const details = event.currentTarget
  if (!(details instanceof HTMLDetailsElement)) return

  const nextOpenToolIds = new Set(openToolIds.value)
  if (details.open) nextOpenToolIds.add(id)
  else nextOpenToolIds.delete(id)
  openToolIds.value = nextOpenToolIds
}

function estimateEntrySize(index: number): number {
  const entry = entries[index]
  if (entry === undefined) return 48

  const rowGap = index === entries.length - 1 ? 0 : 18
  if (entry.role === 'assistant') {
    const lineCount = Math.max(1, Math.ceil(entry.text.length / 72))
    return 46 + lineCount * 24 + rowGap
  }

  if (entry.role === 'user') {
    const lineCount = Math.max(1, Math.ceil(entry.text.length / 72))
    return 42 + lineCount * 22 + rowGap
  }

  const bodyLineCount = Math.max(1, entry.body.split('\n').length)
  const bodySize = entry.id === 'tool-read' || entry.id === 'tool-code'
    ? Math.min(220, 24 + bodyLineCount * 18)
    : 0
  return 28 + bodySize + rowGap
}

function getEntryKey(index: number): string {
  return entries[index].id
}

const virtualizer = useVirtualizer<HTMLElement, HTMLElement>(computed(() => ({
  count: entries.length,
  getScrollElement: () => props.scrollElement,
  getItemKey: getEntryKey,
  estimateSize: estimateEntrySize,
  initialRect: { width: 1024, height: 720 },
  overscan: 7,
  useAnimationFrameWithResizeObserver: true,
  anchorTo: 'end' as const,
  followOnAppend: 'auto' as const,
  scrollEndThreshold: 96,
})))

const virtualRows = computed(() => virtualizer.value.getVirtualItems().map((virtualRow) => ({
  ...virtualRow,
  entry: entries[virtualRow.index],
})))
const totalSize = computed(() => virtualizer.value.getTotalSize())
</script>

<template>
  <section class="dsh-conversation-feed" aria-label="Conversation stream">
    <div ref="feedList" class="dsh-conversation-feed-list">
      <div
        class="dsh-conversation-feed-spacer"
        :style="{ '--dsh-feed-total-size': `${totalSize}px` }"
      >
        <div
          v-for="virtualRow in virtualRows"
          :key="virtualRow.key"
          class="dsh-conversation-feed-row"
          :class="{ 'dsh-conversation-feed-row-last': virtualRow.index === entries.length - 1 }"
          :data-index="virtualRow.index"
          :style="{
            '--dsh-feed-row-offset': `${virtualRow.start}px`,
            '--dsh-feed-row-height': `${virtualRow.size}px`,
          }"
        >
          <article
            v-if="virtualRow.entry.role === 'user'"
            class="dsh-feed-message dsh-feed-message-user"
            :data-index="virtualRow.index"
            :ref="virtualizer.measureElement"
          >
            <div class="dsh-feed-message-bubble">{{ virtualRow.entry.text }}</div>
            <span class="dsh-feed-message-time">刚刚</span>
          </article>
          <article
            v-else-if="virtualRow.entry.role === 'assistant'"
            class="dsh-feed-message dsh-feed-message-assistant"
            :data-index="virtualRow.index"
            :ref="virtualizer.measureElement"
          >
            <div class="dsh-feed-avatar" aria-hidden="true">O</div>
            <div class="dsh-feed-message-copy">
              <strong>Omp Desktop</strong>
              <p>{{ virtualRow.entry.text }}</p>
            </div>
          </article>
          <details
            v-else
            class="dsh-feed-tool"
            :data-index="virtualRow.index"
            :ref="virtualizer.measureElement"
            :class="{ 'dsh-feed-tool-running': virtualRow.entry.state === 'running' }"
            :open="openToolIds.has(virtualRow.entry.id)"
            @toggle="updateToolOpenState(virtualRow.entry.id, $event)"
          >
            <summary>
              <span class="dsh-feed-tool-leading" aria-hidden="true">
                <span class="dsh-feed-tool-dot" />
                <span class="dsh-feed-tool-chevron">›</span>
              </span>
              <strong>{{ virtualRow.entry.title }}</strong>
              <span class="dsh-feed-tool-separator" aria-hidden="true" />
              <span class="dsh-feed-tool-summary">{{ virtualRow.entry.summary }}</span>
              <span class="dsh-feed-tool-state">{{ virtualRow.entry.state === 'running' ? 'Running' : 'Done' }}</span>
            </summary>
            <pre :class="{ 'dsh-feed-code-block': virtualRow.entry.kind === 'code' }"><code>{{ virtualRow.entry.body }}</code></pre>
          </details>
        </div>
      </div>
    </div>
  </section>
</template>
