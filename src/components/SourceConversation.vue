<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'
import FishLogo from './FishLogo.vue'
import SourceComposer from './SourceComposer.vue'
import SourceConversationFeed from './SourceConversationFeed.vue'
import SourceConversationHeader from './SourceConversationHeader.vue'
import SourceTrajectory from './SourceTrajectory.vue'

const props = defineProps<{
  sessionId: string | null
}>()

const conversationRoot = ref<HTMLElement | null>(null)
const conversationScroll = ref<HTMLElement | null>(null)
const { copy } = useAppSettings()
const workspacePath = ref<string | null>(null)
type ConversationTab = 'conversation' | 'trajectory'

const activeTab = ref<ConversationTab>('conversation')
const conversationScrollTop = ref(0)
let rootResizeObserver: ResizeObserver | null = null
let scrollRestoreToken = 0

async function loadWorkspacePath(): Promise<void> {
  try {
    const currentWorkingDirectory = await invoke<string>('current_working_directory')
    workspacePath.value = currentWorkingDirectory
  } catch {
    workspacePath.value = null
  }
}

async function chooseWorkspace(): Promise<void> {
  try {
    const selectedPath = await open({
      directory: true,
      multiple: false,
      title: copy.value.chooseWorkspace,
    })

    if (typeof selectedPath === 'string') workspacePath.value = selectedPath
  } catch {
    // Keep the current workspace when the native dialog cannot open.
  }
}

function invalidateScheduledScrollRestore(): void {
  scrollRestoreToken += 1
}

function scheduleScrollRestore(top: number): void {
  const token = ++scrollRestoreToken
  void nextTick(() => {
    if (token !== scrollRestoreToken || activeTab.value !== 'conversation') return

    const element = conversationScroll.value
    if (element === null) return
    element.scrollTo({ top, behavior: 'auto' })
  })
}

function selectTab(nextTab: ConversationTab): void {
  if (nextTab === activeTab.value) return

  if (activeTab.value === 'conversation') {
    conversationScrollTop.value = conversationScroll.value?.scrollTop ?? 0
  }

  invalidateScheduledScrollRestore()
  if (nextTab === 'trajectory') {
    conversationScroll.value?.scrollTo({ top: 0, behavior: 'auto' })
  }

  activeTab.value = nextTab
  if (nextTab === 'conversation') scheduleScrollRestore(conversationScrollTop.value)
}

watch(() => props.sessionId, () => {
  activeTab.value = 'conversation'
  conversationScrollTop.value = 0
  scheduleScrollRestore(0)
})

onUnmounted(() => {
  invalidateScheduledScrollRestore()
  rootResizeObserver?.disconnect()
  rootResizeObserver = null
})

onMounted(() => {
  void loadWorkspacePath()
  if (typeof ResizeObserver === 'undefined' || conversationRoot.value === null) return

  rootResizeObserver = new ResizeObserver(([entry]) => {
    const width = entry?.contentRect.width
    if (width === undefined) return
    conversationRoot.value?.style.setProperty('--omp-conversation-column-width', `${width}px`)
  })
  rootResizeObserver.observe(conversationRoot.value)
})
</script>

<template>
  <section ref="conversationRoot" class="omp-conversation-root" :data-phase="props.sessionId === null ? 'hero' : 'active'" aria-label="Conversation">
    <SourceConversationHeader
      v-if="props.sessionId !== null"
      :session-id="props.sessionId"
      :active-tab="activeTab"
      @update:active-tab="selectTab"
    />
    <div class="omp-conversation-body">
      <div ref="conversationScroll" class="omp-conversation-scroll-body" :class="{ 'omp-conversation-scroll-body-empty': props.sessionId === null, 'omp-conversation-scroll-body-session': props.sessionId !== null }">
        <div
          v-if="props.sessionId !== null"
          id="omp-conversation-panel"
          class="omp-conversation-view"
          :class="{ 'omp-conversation-view-trajectory': activeTab === 'trajectory' }"
          role="tabpanel"
          :aria-labelledby="activeTab === 'trajectory' ? 'omp-trajectory-tab' : 'omp-conversation-tab'"
        >
          <div
            class="omp-conversation-tab-pane omp-conversation-tab-pane-conversation"
            :class="{ 'omp-conversation-tab-pane-inactive': activeTab !== 'conversation' }"
            :aria-hidden="activeTab !== 'conversation'"
          >
            <SourceConversationFeed :scroll-element="conversationScroll" />
          </div>
          <div
            class="omp-conversation-tab-pane omp-conversation-tab-pane-trajectory"
            :class="{ 'omp-conversation-tab-pane-inactive': activeTab !== 'trajectory' }"
            :aria-hidden="activeTab !== 'trajectory'"
          >
            <SourceTrajectory />
          </div>
        </div>
        <div class="omp-composer-seat" :class="{ 'omp-composer-hero': props.sessionId === null, 'omp-composer-seat-session': props.sessionId !== null }">
          <div class="omp-hero-shell">
            <div class="omp-hero-stack">
              <div v-if="props.sessionId === null" class="omp-hero-headline">
                <span class="omp-hero-fish-hitbox">
                  <FishLogo class="omp-hero-fish" :size="34" />
                </span>
                <span class="omp-hero-title-group">
                  <span>{{ copy.heroHeadline }}</span>
                  <span class="omp-hero-preview">{{ copy.preview }}</span>
                </span>
              </div>

              <div v-if="props.sessionId === null" class="omp-hero-workspace-row">
                <button
                  class="omp-hero-workspace"
                  type="button"
                  :aria-label="workspacePath ?? copy.chooseWorkspace"
                  aria-haspopup="dialog"
                  :title="workspacePath ?? copy.chooseWorkspace"
                  @click="chooseWorkspace"
                >
                  <AppIcon name="folder" class="omp-hero-workspace-folder" :size="16" />
                  <span class="omp-hero-workspace-path">{{ workspacePath ?? copy.chooseWorkspace }}</span>
                  <AppIcon name="chevron-down" class="omp-hero-workspace-chevron" :size="12" />
                </button>
              </div>

              <SourceComposer
                :disabled="props.sessionId === null && workspacePath === null"
                :workspace-trigger="props.sessionId === null && workspacePath === null"
                @request-workspace="chooseWorkspace"
              />

              <div v-if="props.sessionId !== null" class="omp-composer-stats" aria-label="Conversation statistics">
                <span>3 轮 4 步 · 57 tok/s</span>
                <span>28.1K tok · 缓存命中 65%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
