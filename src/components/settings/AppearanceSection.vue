<script setup lang="ts">
import { computed } from 'vue'

import type { SourceSettingsAppearanceCopy, SourceAccentColor, SourceInterfaceDensity } from '../../i18n'
import { useAppSettings } from '../../stores/appSettings'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsAppearanceCopy
}>()

const { settings, setAppearanceOptions } = useAppSettings()
const accent = computed<SourceAccentColor>({
  get: () => settings.accent,
  set: (value) => setAppearanceOptions({ accent: value }),
})
const density = computed<SourceInterfaceDensity>({
  get: () => settings.interfaceDensity,
  set: (value) => setAppearanceOptions({ interfaceDensity: value }),
})
const reduceMotion = computed<boolean>({
  get: () => settings.reduceMotion,
  set: (value) => setAppearanceOptions({ reduceMotion: value }),
})
const highContrast = computed<boolean>({
  get: () => settings.highContrast,
  set: (value) => setAppearanceOptions({ highContrast: value }),
})
</script>

<template>
  <div class="omp-settings-stack">
    <section class="omp-settings-group" aria-labelledby="omp-settings-appearance-accent">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-appearance-accent">{{ props.copy.accentTitle }}</h3>
        <p>{{ props.copy.accentDescription }}</p>
      </div>
      <div class="omp-settings-card">
        <div class="omp-settings-row omp-settings-row-stack">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.accentTitle }}</strong>
            <span>{{ props.copy.accentDescription }}</span>
          </div>
          <div class="omp-settings-choice-group omp-settings-accent-group" role="group" :aria-label="props.copy.accentTitle">
            <button
              v-for="option in props.copy.accentOptions"
              :key="option.value"
              class="omp-settings-choice omp-settings-accent-choice"
              :class="[
                `omp-settings-accent-${option.value}`,
                { 'omp-settings-choice-active': accent === option.value },
              ]"
              type="button"
              :aria-pressed="accent === option.value"
              @click="accent = option.value"
            >
              <span class="omp-settings-accent-dot" aria-hidden="true" />
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="omp-settings-row omp-settings-row-stack">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.densityTitle }}</strong>
            <span>{{ props.copy.densityDescription }}</span>
          </div>
          <div class="omp-settings-choice-group" role="group" :aria-label="props.copy.densityTitle">
            <button
              v-for="option in props.copy.densityOptions"
              :key="option.value"
              class="omp-settings-choice"
              :class="{ 'omp-settings-choice-active': density === option.value }"
              type="button"
              :aria-pressed="density === option.value"
              @click="density = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="omp-settings-group" aria-labelledby="omp-settings-appearance-accessibility">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-appearance-accessibility">{{ props.copy.motionTitle }}</h3>
        <p>{{ props.copy.motionDescription }}</p>
      </div>
      <div class="omp-settings-card">
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="sliders-horizontal" :size="16" /></span>
            <span>
              <strong>{{ props.copy.motionTitle }}</strong>
              <span>{{ props.copy.motionDescription }}</span>
            </span>
          </div>
          <button
            class="omp-settings-switch"
            :class="{ 'omp-settings-switch-off': !reduceMotion }"
            type="button"
            :aria-label="`${props.copy.motionTitle}: ${reduceMotion ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="reduceMotion"
            @click="reduceMotion = !reduceMotion"
          >
            <span />
          </button>
        </div>
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="circle-dot" :size="16" /></span>
            <span>
              <strong>{{ props.copy.contrastTitle }}</strong>
              <span>{{ props.copy.contrastDescription }}</span>
            </span>
          </div>
          <button
            class="omp-settings-switch"
            :class="{ 'omp-settings-switch-off': !highContrast }"
            type="button"
            :aria-label="`${props.copy.contrastTitle}: ${highContrast ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="highContrast"
            @click="highContrast = !highContrast"
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
