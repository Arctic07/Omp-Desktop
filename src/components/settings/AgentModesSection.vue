<script setup lang="ts">
import { computed } from 'vue'

import type { SourceSettingsAgentModesCopy } from '../../i18n'
import { useAppSettings } from '../../stores/appSettings'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsAgentModesCopy
}>()

const { settings, setDefaultAgentMode, setEnabledAgentModes } = useAppSettings()
const defaultMode = computed<string>({
  get: () => settings.defaultAgentMode,
  set: setDefaultAgentMode,
})
const enabledModes = computed<Set<string>>(() => new Set(settings.enabledAgentModes))

function toggleMode(modeId: string): void {
  const nextModes = new Set(enabledModes.value)
  if (nextModes.has(modeId)) {
    nextModes.delete(modeId)
  } else {
    nextModes.add(modeId)
  }
  setEnabledAgentModes([...nextModes])
}
</script>

<template>
  <div class="omp-settings-stack">
    <section class="omp-settings-group" :aria-labelledby="'omp-settings-agent-default'">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-agent-default">{{ props.copy.defaultTitle }}</h3>
        <p>{{ props.copy.defaultDescription }}</p>
      </div>
      <div class="omp-settings-card">
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.defaultTitle }}</strong>
            <span>{{ props.copy.defaultDescription }}</span>
          </div>
          <label class="omp-settings-select-wrap">
            <span class="omp-settings-visually-hidden">{{ props.copy.defaultTitle }}</span>
            <select v-model="defaultMode" class="omp-settings-select" :aria-label="props.copy.defaultTitle">
              <option v-for="mode in props.copy.modes" :key="mode.id" :value="mode.id">
                {{ mode.name }}
              </option>
            </select>
            <AppIcon name="chevron-down" :size="14" />
          </label>
        </div>
      </div>
    </section>

    <section class="omp-settings-group" :aria-labelledby="'omp-settings-agent-modes'">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-agent-modes">{{ props.copy.modeTitle }}</h3>
        <p>{{ props.copy.modeDescription }}</p>
      </div>
      <div class="omp-settings-card omp-settings-list-card">
        <div v-for="mode in props.copy.modes" :key="mode.id" class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="bot" :size="16" /></span>
            <span>
              <strong>{{ mode.name }}</strong>
              <span>{{ mode.description }}</span>
            </span>
          </div>
          <button
            class="omp-settings-switch"
            :class="{ 'omp-settings-switch-off': !enabledModes.has(mode.id) }"
            type="button"
            :aria-label="`${mode.name}: ${enabledModes.has(mode.id) ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="enabledModes.has(mode.id)"
            @click="toggleMode(mode.id)"
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
