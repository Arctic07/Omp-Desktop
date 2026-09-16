<script setup lang="ts">
import { ref } from 'vue'

import { getSourceCopy } from '../i18n'
import { AppIcon } from './icons'
import FishLogo from './FishLogo.vue'
import SourceComposer from './SourceComposer.vue'

const copy = getSourceCopy()

const workspaceMenuOpen = ref(false)

</script>

<template>
  <section class="dsh-conversation-root" data-phase="hero" aria-label="Conversation">
    <div class="dsh-conversation-body">
      <div class="dsh-conversation-scroll-body">
        <div class="dsh-composer-seat dsh-composer-hero">
          <div class="dsh-hero-shell">
            <div class="dsh-hero-stack">
              <div class="dsh-hero-headline">
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
                  :aria-label="copy.chooseWorkspace"
                  aria-haspopup="menu"
                  :aria-expanded="workspaceMenuOpen"
                  @click="workspaceMenuOpen = !workspaceMenuOpen"
                >
                  <AppIcon name="folder" class="dsh-hero-workspace-folder" :size="16" />
                  <span>{{ copy.chooseWorkspace }}</span>
                  <AppIcon name="chevron-down" class="dsh-hero-workspace-chevron" :size="12" />
                </button>
                <div v-if="workspaceMenuOpen" class="dsh-hero-workspace-menu" role="menu">
                  <button type="button" role="menuitem" @click="workspaceMenuOpen = false">{{ copy.addWorkspaceMenu }}</button>
                </div>
              </div>

              <SourceComposer :disabled="true" :workspace-trigger="true" @request-workspace="workspaceMenuOpen = true" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
