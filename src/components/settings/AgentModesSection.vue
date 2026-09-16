<script setup lang="ts">
import { ref } from 'vue'

import type { SourceSettingsAgentModesCopy } from '../../i18n'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsAgentModesCopy
}>()

const defaultMode = ref(props.copy.modes[0]?.id ?? '')
const enabledModes = ref(new Set(props.copy.modes.map((mode) => mode.id)))

function toggleMode(modeId: string) {
  const nextModes = new Set(enabledModes.value)
  if (nextModes.has(modeId)) {
    nextModes.delete(modeId)
  } else {
    nextModes.add(modeId)
  }
  enabledModes.value = nextModes
}
</script>

<template>
  <div class="dsh-settings-stack">
    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-agent-default'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-agent-default">{{ props.copy.defaultTitle }}</h3>
        <p>{{ props.copy.defaultDescription }}</p>
      </div>
      <div class="dsh-settings-card">
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.defaultTitle }}</strong>
            <span>{{ props.copy.defaultDescription }}</span>
          </div>
          <label class="dsh-settings-select-wrap">
            <span class="dsh-settings-visually-hidden">{{ props.copy.defaultTitle }}</span>
            <select v-model="defaultMode" class="dsh-settings-select" :aria-label="props.copy.defaultTitle">
              <option v-for="mode in props.copy.modes" :key="mode.id" :value="mode.id">
                {{ mode.name }}
              </option>
            </select>
            <AppIcon name="chevron-down" :size="14" />
          </label>
        </div>
      </div>
    </section>

    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-agent-modes'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-agent-modes">{{ props.copy.modeTitle }}</h3>
        <p>{{ props.copy.modeDescription }}</p>
      </div>
      <div class="dsh-settings-card dsh-settings-list-card">
        <div v-for="mode in props.copy.modes" :key="mode.id" class="dsh-settings-row">
          <div class="dsh-settings-row-copy dsh-settings-row-copy-with-icon">
            <span class="dsh-settings-row-icon" aria-hidden="true"><AppIcon name="bot" :size="16" /></span>
            <span>
              <strong>{{ mode.name }}</strong>
              <span>{{ mode.description }}</span>
            </span>
          </div>
          <button
            class="dsh-settings-switch"
            :class="{ 'dsh-settings-switch-off': !enabledModes.has(mode.id) }"
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
