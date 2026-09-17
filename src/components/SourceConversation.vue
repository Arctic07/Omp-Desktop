<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'
import FishLogo from './FishLogo.vue'
import SourceComposer from './SourceComposer.vue'
import SourceConversationFeed from './SourceConversationFeed.vue'
import SourceConversationHeader from './SourceConversationHeader.vue'

const props = defineProps<{
  sessionId: string | null
}>()

const conversationRoot = ref<HTMLElement | null>(null)
const conversationScroll = ref<HTMLElement | null>(null)
const { copy } = useAppSettings()
const workspacePath = ref<string | null>(null)
let rootResizeObserver: ResizeObserver | null = null

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

onUnmounted(() => {
  rootResizeObserver?.disconnect()
  rootResizeObserver = null
})

onMounted(() => {
  void loadWorkspacePath()
  if (typeof ResizeObserver === 'undefined' || conversationRoot.value === null) return

  rootResizeObserver = new ResizeObserver(([entry]) => {
    const width = entry?.contentRect.width
    if (width === undefined) return
    conversationRoot.value?.style.setProperty('--dsh-conversation-column-width', `${width}px`)
  })
  rootResizeObserver.observe(conversationRoot.value)
  window.setTimeout(() => {
    conversationScroll.value?.scrollTo({ top: 0, behavior: 'auto' })
  }, 80)
})
</script>

<template>
  <section ref="conversationRoot" class="dsh-conversation-root" :data-phase="props.sessionId === null ? 'hero' : 'active'" aria-label="Conversation">
    <SourceConversationHeader v-if="props.sessionId !== null" :session-id="props.sessionId" />
    <div class="dsh-conversation-body">
      <div ref="conversationScroll" class="dsh-conversation-scroll-body" :class="{ 'dsh-conversation-scroll-body-empty': props.sessionId === null, 'dsh-conversation-scroll-body-session': props.sessionId !== null }">
        <div v-if="props.sessionId !== null" class="dsh-conversation-view">
          <SourceConversationFeed :scroll-element="conversationScroll" />
        </div>
        <div class="dsh-composer-seat" :class="{ 'dsh-composer-hero': props.sessionId === null, 'dsh-composer-seat-session': props.sessionId !== null }">
          <div class="dsh-hero-shell">
            <div class="dsh-hero-stack">
              <div v-if="props.sessionId === null" class="dsh-hero-headline">
                <span class="dsh-hero-fish-hitbox">
                  <FishLogo class="dsh-hero-fish" :size="34" />
                </span>
                <span class="dsh-hero-title-group">
                  <span>{{ copy.heroHeadline }}</span>
                  <span class="dsh-hero-preview">{{ copy.preview }}</span>
                </span>
              </div>

              <div v-if="props.sessionId === null" class="dsh-hero-workspace-row">
                <button
                  class="dsh-hero-workspace"
                  type="button"
                  :aria-label="workspacePath ?? copy.chooseWorkspace"
                  aria-haspopup="dialog"
                  :title="workspacePath ?? copy.chooseWorkspace"
                  @click="chooseWorkspace"
                >
                  <AppIcon name="folder" class="dsh-hero-workspace-folder" :size="16" />
                  <span class="dsh-hero-workspace-path">{{ workspacePath ?? copy.chooseWorkspace }}</span>
                  <AppIcon name="chevron-down" class="dsh-hero-workspace-chevron" :size="12" />
                </button>
              </div>

              <SourceComposer
                :disabled="props.sessionId === null && workspacePath === null"
                :workspace-trigger="props.sessionId === null && workspacePath === null"
                @request-workspace="chooseWorkspace"
              />

              <div v-if="props.sessionId !== null" class="dsh-composer-stats" aria-label="Conversation statistics">
                <span>3 轮 4 步 · 57 tok/s</span>
                <span>◷ 用时 9 秒</span>
                <span>28.1K tok · 缓存命中 65%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

