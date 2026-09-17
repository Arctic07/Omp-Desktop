<script setup lang="ts">
import { computed } from 'vue'

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

const title = computed(() => sessionTitles[props.sessionId] ?? '本地开发会话')
</script>

<template>
  <header class="dsh-conversation-header dsh-conversation-feed-header">
    <div>
      <p class="dsh-conversation-feed-kicker">Omp Desktop</p>
      <h1>{{ title }}</h1>
    </div>
    <span class="dsh-conversation-feed-status"><span aria-hidden="true" /> Active</span>
  </header>
</template>
