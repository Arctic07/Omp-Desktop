<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'

import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'
import FishLogo from './FishLogo.vue'
import SourceComposer from './SourceComposer.vue'
import SourceConversationFeed from './SourceConversationFeed.vue'

const props = defineProps<{
  sessionId: string | null
}>()

const { copy } = useAppSettings()
const workspacePath = ref<string | null>(null)

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

onMounted(() => {
  void loadWorkspacePath()
})
</script>

<template>
  <section class="dsh-conversation-root" data-phase="hero" aria-label="Conversation">
    <div class="dsh-conversation-body">
      <div class="dsh-conversation-scroll-body" :class="{ 'dsh-conversation-scroll-body-session': props.sessionId !== null }">
        <SourceConversationFeed v-if="props.sessionId !== null" :session-id="props.sessionId" />
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

              <div class="dsh-hero-workspace-row">
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
                :disabled="workspacePath === null"
                :workspace-trigger="workspacePath === null"
                @request-workspace="chooseWorkspace"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

