<script setup lang="ts">
import { computed } from 'vue'

import { useAppStore, type ChatMessage } from '../stores/app'

const props = withDefaults(
  defineProps<{
    sessionId?: string | null
    visible?: boolean
  }>(),
  {
    sessionId: null,
    visible: true,
  },
)

const store = useAppStore()
const messages = store.messages
const activeSessionId = store.activeSessionId
const workspace = store.workspace

const visibleMessages = computed<ChatMessage[]>(() =>
  messages.value.filter((message) => message.content.trim().length > 0),
)
const hasMessages = computed(() => visibleMessages.value.length > 0)
const paneId = computed(() => props.sessionId ?? activeSessionId.value ?? 'current')
const workspaceName = computed(() => {
  const project = workspace.value
  if (!project) return ''
  if (project.name.trim()) return project.name.trim()
  const pathParts = project.path.split(/[\\/]/).filter(Boolean)
  return pathParts.at(-1) ?? project.path
})
const emptyTitle = computed(() =>
  workspaceName.value ? `在 ${workspaceName.value} 中开始工作` : '开始一个新的对话',
)

function messageRowClass(message: ChatMessage): string {
  return `message-row ${message.role}`
}

function messageAriaLabel(message: ChatMessage): string {
  if (message.role === 'user') return '用户消息'
  if (message.role === 'assistant') return '助手消息'
  return '系统消息'
}
</script>

<template>
  <section
    class="session-pane"
    :data-session-pane="paneId"
    :data-visible="visible ? 'true' : 'false'"
    :aria-hidden="visible ? undefined : 'true'"
  >
    <div v-if="hasMessages" class="thread-wrap">
      <div class="thread-scroll" role="log" aria-live="polite">
        <div class="thread-content">
          <article
            v-for="message in visibleMessages"
            :key="message.id"
            :class="messageRowClass(message)"
            :data-message-id="message.id"
            :data-row-role="message.role"
            :aria-label="messageAriaLabel(message)"
          >
            <div class="message-col">
              <div class="message-bubble">
                <pre class="message-text selectable">{{ message.content }}</pre>
              </div>
            </div>
          </article>
        </div>
      </div>
    </div>

    <div v-else class="home-stack-inner">
      <div class="empty-hero">
        <div class="empty-hero-icon" data-testid="home-icon" aria-hidden="true">
          <span class="home-mascot-logo" data-testid="home-mascot-logo">
            <svg viewBox="0 0 100 100" role="presentation" focusable="false">
              <circle cx="50" cy="50" r="44" fill="currentColor" opacity="0.12" />
              <path
                d="M27 54c0-16 10-27 23-27s23 11 23 27v11c0 8-6 14-14 14H41c-8 0-14-6-14-14V54Z"
                fill="currentColor"
                opacity="0.72"
              />
              <circle cx="42" cy="53" r="4" fill="var(--ds-bg-primary)" />
              <circle cx="58" cy="53" r="4" fill="var(--ds-bg-primary)" />
              <path
                d="M43 65c5 4 9 4 14 0"
                fill="none"
                stroke="var(--ds-bg-primary)"
                stroke-linecap="round"
                stroke-width="3"
              />
            </svg>
          </span>
        </div>
        <h1>
          <template v-if="workspaceName">
            在 <span class="project-underline">{{ workspaceName }}</span> 中开始工作
          </template>
          <template v-else>{{ emptyTitle }}</template>
        </h1>
        <p class="empty-hero-subtitle">
          描述你想完成的任务，OMP 会在当前工作区中协助你推进。
        </p>
      </div>

      <section class="home-onboarding-checklist" data-testid="onboarding-checklist" aria-labelledby="onboarding-title">
        <div class="onboarding-heading">
          <h2 id="onboarding-title">快速开始</h2>
          <span class="onboarding-count">3 个步骤</span>
        </div>
        <ol class="onboarding-steps">
          <li class="onboarding-step">
            <span class="onboarding-step-marker" aria-hidden="true">1</span>
            <span>确认当前项目或工作区</span>
          </li>
          <li class="onboarding-step">
            <span class="onboarding-step-marker" aria-hidden="true">2</span>
            <span>输入你希望完成的任务</span>
          </li>
          <li class="onboarding-step">
            <span class="onboarding-step-marker" aria-hidden="true">3</span>
            <span>在对话中查看进度与结果</span>
          </li>
        </ol>
      </section>
    </div>
  </section>
</template>
