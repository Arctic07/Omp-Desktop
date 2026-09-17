<script setup lang="ts">
import { computed } from 'vue'

import { APP_FONT_SIZE_MAX, APP_FONT_SIZE_MIN, useAppSettings } from '../../stores/appSettings'
import type { SourcePermissionMode, SourceSettingsGeneralCopy } from '../../i18n'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsGeneralCopy
}>()

const {
  settings,
  setLanguage,
  setTheme,
  setFontSize,
  setConversationDensity,
  setBusyBehavior,
  setPermissionMode,
} = useAppSettings()
const permissionMode = computed<SourcePermissionMode>({
  get: () => settings.permissionMode,
  set: setPermissionMode,
})

function handleLanguageChange(event: Event): void {
  const target = event.currentTarget
  if (!(target instanceof HTMLSelectElement)) {
    return
  }
  const value = target.value
  if (value === 'en' || value === 'zh') {
    setLanguage(value)
  }
}

function decreaseFontSize(): void {
  setFontSize(settings.fontSize - 1)
}

function increaseFontSize(): void {
  setFontSize(settings.fontSize + 1)
}
</script>

<template>
  <div class="omp-settings-stack">
    <section class="omp-settings-group" :aria-labelledby="'omp-settings-general-permission'">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-general-permission">{{ props.copy.permissionTitle }}</h3>
        <p>{{ props.copy.permissionDescription }}</p>
      </div>
      <div class="omp-settings-card">
        <div class="omp-settings-row omp-settings-row-stack">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.permissionTitle }}</strong>
            <span>{{ props.copy.permissionDescription }}</span>
          </div>
          <div class="omp-settings-choice-group" role="group" :aria-label="props.copy.permissionTitle">
            <button
              v-for="option in props.copy.permissionOptions"
              :key="option.value"
              class="omp-settings-choice"
              :class="{ 'omp-settings-choice-active': permissionMode === option.value }"
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

    <section class="omp-settings-group" :aria-labelledby="'omp-settings-general-preferences'">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-general-preferences">{{ props.copy.title }}</h3>
        <p>{{ props.copy.description }}</p>
      </div>
      <div class="omp-settings-card">
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.languageTitle }}</strong>
            <span>{{ props.copy.languageDescription }}</span>
          </div>
          <label class="omp-settings-select-wrap">
            <span class="omp-settings-visually-hidden">{{ props.copy.languageTitle }}</span>
            <select :value="settings.language" class="omp-settings-select" :aria-label="props.copy.languageTitle" @change="handleLanguageChange">
              <option v-for="option in props.copy.languageOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <AppIcon name="chevron-down" :size="14" />
          </label>
        </div>

        <div class="omp-settings-row omp-settings-row-stack">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.themeTitle }}</strong>
            <span>{{ props.copy.themeDescription }}</span>
          </div>
          <div class="omp-settings-choice-group" role="group" :aria-label="props.copy.themeTitle">
            <button
              v-for="option in props.copy.themeOptions"
              :key="option.value"
              class="omp-settings-choice"
              :class="{ 'omp-settings-choice-active': settings.theme === option.value }"
              type="button"
              :aria-pressed="settings.theme === option.value"
              @click="setTheme(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="omp-settings-row">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.fontSizeTitle }}</strong>
            <span>{{ props.copy.fontSizeDescription }}</span>
          </div>
          <div class="omp-settings-stepper" :aria-label="props.copy.fontSizeTitle">
            <button
              type="button"
              :aria-label="props.copy.decreaseFontSize"
              :disabled="settings.fontSize <= APP_FONT_SIZE_MIN"
              @click="decreaseFontSize"
            >
              <AppIcon name="minus" :size="14" />
            </button>
            <output :aria-label="props.copy.fontSizeTitle">{{ settings.fontSize }}px</output>
            <button
              type="button"
              :aria-label="props.copy.increaseFontSize"
              :disabled="settings.fontSize >= APP_FONT_SIZE_MAX"
              @click="increaseFontSize"
            >
              <AppIcon name="plus" :size="14" />
            </button>
          </div>
        </div>

        <div class="omp-settings-row omp-settings-row-stack">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.conversationTitle }}</strong>
            <span>{{ props.copy.conversationDescription }}</span>
          </div>
          <div class="omp-settings-choice-group" role="group" :aria-label="props.copy.conversationTitle">
            <button
              v-for="option in props.copy.conversationOptions"
              :key="option.value"
              class="omp-settings-choice"
              :class="{ 'omp-settings-choice-active': settings.conversationDensity === option.value }"
              type="button"
              :aria-pressed="settings.conversationDensity === option.value"
              @click="setConversationDensity(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div class="omp-settings-row omp-settings-row-stack">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.busyTitle }}</strong>
            <span>{{ props.copy.busyDescription }}</span>
          </div>
          <div class="omp-settings-choice-group" role="group" :aria-label="props.copy.busyTitle">
            <button
              v-for="option in props.copy.busyOptions"
              :key="option.value"
              class="omp-settings-choice"
              :class="{ 'omp-settings-choice-active': settings.busyBehavior === option.value }"
              type="button"
              :aria-pressed="settings.busyBehavior === option.value"
              @click="setBusyBehavior(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
