<script setup lang="ts">
import { computed, ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'

const props = defineProps<{
  sessionId: string
}>()

const { copy } = useAppSettings()
const activeTab = ref<'conversation' | 'trajectory'>('conversation')

const sessionTitles: Record<string, string> = {
  'session-omp-build': '首页 Composer 优化',
  'session-omp-settings': '常规设置功能',
  'session-harness-ui': '检查 UI 信息流',
  'session-harness-tools': '工具调用输出',
  'session-scratch': '整理实验代码',
  'session-codex-source': '查找项目源码与前端位置',
  'session-codex-fun': '你好彩票娱乐',
  'session-codex-thinking': '询问AI的思考等级',
  'session-codex-chinese': '中文问候你好',
  'session-codex-hello': '你好',
  'session-codex-layout': '检查前端界面布局',
  'session-codex-files': '整理项目文件',
}

const title = computed(() => sessionTitles[props.sessionId] ?? '本地开发会话')
</script>
<template>
  <header class="omp-conversation-header">
    <div class="omp-conversation-header-main">
      <div class="omp-conversation-header-title-row">
        <button class="omp-conversation-header-title" type="button" disabled>{{ title }}</button>
        <span class="omp-conversation-header-mode">{{ copy.conversationMode }}</span>
      </div>
      <div class="omp-conversation-header-tabs" role="tablist">
        <button
          class="omp-conversation-header-tab"
          :class="{ 'omp-conversation-header-tab-active': activeTab === 'conversation' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'conversation'"
          @click="activeTab = 'conversation'"
        >
          {{ copy.conversationTab }}
        </button>
        <button
          class="omp-conversation-header-tab"
          :class="{ 'omp-conversation-header-tab-active': activeTab === 'trajectory' }"
          type="button"
          role="tab"
          :aria-selected="activeTab === 'trajectory'"
          @click="activeTab = 'trajectory'"
        >
          {{ copy.trajectoryTab }}
        </button>
      </div>
    </div>
    <div class="omp-conversation-header-actions">
      <button class="omp-conversation-header-action omp-conversation-header-workspace" type="button" :aria-label="copy.openWorkspace">
        <AppIcon name="folder" :size="15" />
        <AppIcon name="chevron-down" :size="12" />
      </button>
      <button class="omp-conversation-header-action" type="button" :aria-label="copy.openMoreActions">
        <AppIcon name="more-horizontal" :size="16" />
      </button>
      <button class="omp-conversation-header-action" type="button" :aria-label="copy.openRightPanel">
        <AppIcon name="panel-right" :size="16" />
      </button>
    </div>
  </header>
</template>
