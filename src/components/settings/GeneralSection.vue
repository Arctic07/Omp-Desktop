<script setup lang="ts">
import { ref } from 'vue'

import type {
  SourceBusyBehavior,
  SourceConversationDensity,
  SourceLanguage,
  SourcePermissionMode,
  SourceSettingsGeneralCopy,
  SourceTheme,
} from '../../i18n'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsGeneralCopy
}>()

const defaultLanguage: SourceLanguage = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
const permissionMode = ref<SourcePermissionMode>('ask')
const language = ref<SourceLanguage>(defaultLanguage)
const theme = ref<SourceTheme>('system')
const fontSize = ref(14)
const conversationDensity = ref<SourceConversationDensity>('comfortable')
const busyBehavior = ref<SourceBusyBehavior>('queue')

function decreaseFontSize() {
  fontSize.value = Math.max(12, fontSize.value - 1)
}

function increaseFontSize() {
  fontSize.value = Math.min(20, fontSize.value + 1)
}
</script>

<template>
  <div class="dsh-settings-stack">
    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-general-permission'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-general-permission">{{ props.copy.permissionTitle }}</h3>
        <p>{{ props.copy.permissionDescription }}</p>
      </div>
      <div class="dsh-settings-card">
        <div class="dsh-settings-row dsh-settings-row-stack">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.permissionTitle }}</strong>
            <span>{{ props.copy.permissionDescription }}</span>
          </div>
          <div class="dsh-settings-choice-group" role="group" :aria-label="props.copy.permissionTitle">
            <button
              v-for="option in props.copy.permissionOptions"
              :key="option.value"
              class="dsh-settings-choice"
              :class="{ 'dsh-settings-choice-active': permissionMode === option.value }"
              type="button"
              :aria-pressed="permissionMode === option.value"
              @click="permissionMode = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-general-preferences'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-general-preferences">{{ props.copy.title }}</h3>
        <p>{{ props.copy.description }}</p>
      </div>
      <div class="dsh-settings-card">
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.languageTitle }}</strong>
            <span>{{ props.copy.languageDescription }}</span>
          </div>
          <label class="dsh-settings-select-wrap">
            <span class="dsh-settings-visually-hidden">{{ props.copy.languageTitle }}</span>
            <select v-model="language" class="dsh-settings-select" :aria-label="props.copy.languageTitle">
              <option v-for="option in props.copy.languageOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <AppIcon name="chevron-down" :size="14" />
          </label>
        </div>

        <div class="dsh-settings-row dsh-settings-row-stack">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.themeTitle }}</strong>
            <span>{{ props.copy.themeDescription }}</span>
          </div>
          <div class="dsh-settings-choice-group" role="group" :aria-label="props.copy.themeTitle">
            <button
              v-for="option in props.copy.themeOptions"
              :key="option.value"
              class="dsh-settings-choice"
              :class="{ 'dsh-settings-choice-active': theme === option.value }"
              type="button"
              :aria-pressed="theme === option.value"
              @click="theme = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.fontSizeTitle }}</strong>
            <span>{{ props.copy.fontSizeDescription }}</span>
          </div>
          <div class="dsh-settings-stepper" :aria-label="props.copy.fontSizeTitle">
            <button
              type="button"
              :aria-label="props.copy.decreaseFontSize"
              :disabled="fontSize <= 12"
              @click="decreaseFontSize"
            >
              <AppIcon name="minus" :size="14" />
            </button>
            <output :aria-label="props.copy.fontSizeTitle">{{ fontSize }}px</output>
            <button
              type="button"
              :aria-label="props.copy.increaseFontSize"
              :disabled="fontSize >= 20"
              @click="increaseFontSize"
            >
              <AppIcon name="plus" :size="14" />
            </button>
          </div>
        </div>

        <div class="dsh-settings-row dsh-settings-row-stack">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.conversationTitle }}</strong>
            <span>{{ props.copy.conversationDescription }}</span>
          </div>
          <div class="dsh-settings-choice-group" role="group" :aria-label="props.copy.conversationTitle">
            <button
              v-for="option in props.copy.conversationOptions"
              :key="option.value"
              class="dsh-settings-choice"
              :class="{ 'dsh-settings-choice-active': conversationDensity === option.value }"
              type="button"
              :aria-pressed="conversationDensity === option.value"
              @click="conversationDensity = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="dsh-settings-row dsh-settings-row-stack">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.busyTitle }}</strong>
            <span>{{ props.copy.busyDescription }}</span>
          </div>
          <div class="dsh-settings-choice-group" role="group" :aria-label="props.copy.busyTitle">
            <button
              v-for="option in props.copy.busyOptions"
              :key="option.value"
              class="dsh-settings-choice"
              :class="{ 'dsh-settings-choice-active': busyBehavior === option.value }"
              type="button"
              :aria-pressed="busyBehavior === option.value"
              @click="busyBehavior = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
