<script setup lang="ts">
import { computed } from 'vue'

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
  sessionId: string
}>()

const sessionTitles: Record<string, string> = {
  'session-omp-build': '首页 Composer 优化',
  'session-omp-settings': '常规设置功能',
  'session-harness-ui': '检查 UI 信息流',
  'session-harness-tools': '工具调用输出',
  'session-scratch': '整理实验代码',
}

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

const title = computed(() => sessionTitles[props.sessionId] ?? '本地开发会话')
</script>

<template>
  <section class="dsh-conversation-feed" aria-label="Conversation stream">
    <header class="dsh-conversation-feed-header">
      <div>
        <p class="dsh-conversation-feed-kicker">Omp Desktop</p>
        <h1>{{ title }}</h1>
      </div>
      <span class="dsh-conversation-feed-status"><span aria-hidden="true" /> Active</span>
    </header>

    <div class="dsh-conversation-feed-list">
      <template v-for="entry in entries" :key="entry.id">
        <article v-if="entry.role === 'user'" class="dsh-feed-message dsh-feed-message-user">
          <div class="dsh-feed-message-bubble">{{ entry.text }}</div>
          <span class="dsh-feed-message-time">刚刚</span>
        </article>
        <article v-else-if="entry.role === 'assistant'" class="dsh-feed-message dsh-feed-message-assistant">
          <div class="dsh-feed-avatar" aria-hidden="true">O</div>
          <div class="dsh-feed-message-copy">
            <strong>Omp Desktop</strong>
            <p>{{ entry.text }}</p>
          </div>
        </article>
        <details
          v-else
          class="dsh-feed-tool"
          :class="{ 'dsh-feed-tool-running': entry.state === 'running' }"
          :open="entry.id === 'tool-read' || entry.id === 'tool-code'"
        >
          <summary>
            <span class="dsh-feed-tool-leading" aria-hidden="true">
              <span class="dsh-feed-tool-dot" />
              <span class="dsh-feed-tool-chevron">›</span>
            </span>
            <strong>{{ entry.title }}</strong>
            <span class="dsh-feed-tool-separator" aria-hidden="true" />
            <span class="dsh-feed-tool-summary">{{ entry.summary }}</span>
            <span class="dsh-feed-tool-state">{{ entry.state === 'running' ? 'Running' : 'Done' }}</span>
          </summary>
          <pre :class="{ 'dsh-feed-code-block': entry.kind === 'code' }"><code>{{ entry.body }}</code></pre>
        </details>
      </template>
    </div>
  </section>
</template>
