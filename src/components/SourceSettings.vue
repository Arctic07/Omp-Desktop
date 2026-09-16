<script setup lang="ts">
import { ref } from 'vue'

import { getSourceCopy } from '../i18n'
import { AppIcon } from './icons'

const copy = getSourceCopy()

const emit = defineEmits<{
  close: []
}>()

const activeSection = ref(copy.settingsSections[0] ?? copy.settingsTitle)
const sections = copy.settingsSections
</script>

<template>
  <section class="dsh-settings" :aria-label="copy.settingsTitle">
    <aside class="dsh-settings-nav">
      <div class="dsh-settings-heading-row">
        <h1>{{ copy.settingsTitle }}</h1>
        <button class="dsh-settings-close" type="button" :aria-label="copy.settingsTitle" @click="emit('close')">
          <AppIcon name="x" :size="18" />
        </button>
      </div>
      <nav :aria-label="copy.settingsTitle">
        <button
          v-for="section in sections"
          :key="section"
          class="dsh-settings-nav-item"
          :class="{ 'dsh-settings-nav-item-active': activeSection === section }"
          type="button"
          @click="activeSection = section"
        >
          {{ section }}
        </button>
      </nav>
    </aside>
    <div class="dsh-settings-content">
      <div class="dsh-settings-content-inner">
        <p class="dsh-settings-kicker">{{ copy.settingsTitle }}</p>
        <h2>{{ activeSection }}</h2>
        <p class="dsh-settings-description">
          {{ copy.settingsDescription }}
        </p>
        <div class="dsh-settings-card">
          <div class="dsh-settings-row">
            <div>
              <strong>{{ copy.settingsSections[6] }}</strong>
              <span>{{ copy.systemTheme }}</span>
            </div>
            <button class="dsh-settings-switch" type="button" :aria-label="copy.systemTheme" aria-pressed="true">
              <span />
            </button>
          </div>
          <div class="dsh-settings-row">
            <div>
              <strong>{{ copy.language }}</strong>
              <span>{{ copy.english }}</span>
            </div>
            <AppIcon name="chevron-down" :size="16" />
          </div>
          <div class="dsh-settings-row">
            <div>
              <strong>{{ copy.fontSize }}</strong>
              <span>{{ copy.fourteenPixels }}</span>
            </div>
            <AppIcon name="chevron-down" :size="16" />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
