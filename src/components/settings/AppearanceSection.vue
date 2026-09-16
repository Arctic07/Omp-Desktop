<script setup lang="ts">
import { ref } from 'vue'

import type { SourceSettingsAppearanceCopy } from '../../i18n'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsAppearanceCopy
}>()

const accent = ref('blue')
const density = ref('standard')
const reduceMotion = ref(false)
const highContrast = ref(false)

function toggleReduceMotion() {
  reduceMotion.value = !reduceMotion.value
}

function toggleHighContrast() {
  highContrast.value = !highContrast.value
}
</script>

<template>
  <div class="dsh-settings-stack">
    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-appearance-accent'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-appearance-accent">{{ props.copy.accentTitle }}</h3>
        <p>{{ props.copy.accentDescription }}</p>
      </div>
      <div class="dsh-settings-card">
        <div class="dsh-settings-row dsh-settings-row-stack">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.accentTitle }}</strong>
            <span>{{ props.copy.accentDescription }}</span>
          </div>
          <div class="dsh-settings-choice-group dsh-settings-accent-group" role="group" :aria-label="props.copy.accentTitle">
            <button
              v-for="option in props.copy.accentOptions"
              :key="option.value"
              class="dsh-settings-choice dsh-settings-accent-choice"
              :class="[
                `dsh-settings-accent-${option.value}`,
                { 'dsh-settings-choice-active': accent === option.value },
              ]"
              type="button"
              :aria-pressed="accent === option.value"
              @click="accent = option.value"
            >
              <span class="dsh-settings-accent-dot" aria-hidden="true" />
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="dsh-settings-row dsh-settings-row-stack">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.densityTitle }}</strong>
            <span>{{ props.copy.densityDescription }}</span>
          </div>
          <div class="dsh-settings-choice-group" role="group" :aria-label="props.copy.densityTitle">
            <button
              v-for="option in props.copy.densityOptions"
              :key="option.value"
              class="dsh-settings-choice"
              :class="{ 'dsh-settings-choice-active': density === option.value }"
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

    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-appearance-accessibility'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-appearance-accessibility">{{ props.copy.motionTitle }}</h3>
        <p>{{ props.copy.motionDescription }}</p>
      </div>
      <div class="dsh-settings-card">
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy dsh-settings-row-copy-with-icon">
            <span class="dsh-settings-row-icon" aria-hidden="true"><AppIcon name="sliders-horizontal" :size="16" /></span>
            <span>
              <strong>{{ props.copy.motionTitle }}</strong>
              <span>{{ props.copy.motionDescription }}</span>
            </span>
          </div>
          <button
            class="dsh-settings-switch"
            :class="{ 'dsh-settings-switch-off': !reduceMotion }"
            type="button"
            :aria-label="`${props.copy.motionTitle}: ${reduceMotion ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="reduceMotion"
            @click="toggleReduceMotion"
          >
            <span />
          </button>
        </div>
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy dsh-settings-row-copy-with-icon">
            <span class="dsh-settings-row-icon" aria-hidden="true"><AppIcon name="circle-dot" :size="16" /></span>
            <span>
              <strong>{{ props.copy.contrastTitle }}</strong>
              <span>{{ props.copy.contrastDescription }}</span>
            </span>
          </div>
          <button
            class="dsh-settings-switch"
            :class="{ 'dsh-settings-switch-off': !highContrast }"
            type="button"
            :aria-label="`${props.copy.contrastTitle}: ${highContrast ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="highContrast"
            @click="toggleHighContrast"
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
