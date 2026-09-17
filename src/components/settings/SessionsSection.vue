<script setup lang="ts">
import { computed } from 'vue'

import type { SourceSessionRetention, SourceSettingsSessionsCopy } from '../../i18n'
import { useAppSettings } from '../../stores/appSettings'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsSessionsCopy
}>()

const { settings, setSessionOptions } = useAppSettings()
const autoArchive = computed<boolean>({
  get: () => settings.autoArchive,
  set: (value) => setSessionOptions({ autoArchive: value }),
})
const confirmDelete = computed<boolean>({
  get: () => settings.confirmDelete,
  set: (value) => setSessionOptions({ confirmDelete: value }),
})
const restoreLast = computed<boolean>({
  get: () => settings.restoreLastSession,
  set: (value) => setSessionOptions({ restoreLastSession: value }),
})
const retention = computed<SourceSessionRetention>({
  get: () => settings.sessionRetention,
  set: (value) => setSessionOptions({ sessionRetention: value }),
})
</script>

<template>
  <div class="omp-settings-stack">
    <section class="omp-settings-group" aria-labelledby="omp-settings-sessions-behavior">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-sessions-behavior">{{ props.copy.behaviorTitle }}</h3>
        <p>{{ props.copy.behaviorDescription }}</p>
      </div>
      <div class="omp-settings-card">
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="archive" :size="16" /></span>
            <span>
              <strong>{{ props.copy.autoArchiveTitle }}</strong>
              <span>{{ props.copy.autoArchiveDescription }}</span>
            </span>
          </div>
          <button
            class="omp-settings-switch"
            :class="{ 'omp-settings-switch-off': !autoArchive }"
            type="button"
            :aria-label="`${props.copy.autoArchiveTitle}: ${autoArchive ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="autoArchive"
            @click="autoArchive = !autoArchive"
          >
            <span />
          </button>
        </div>
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="shield" :size="16" /></span>
            <span>
              <strong>{{ props.copy.confirmDeleteTitle }}</strong>
              <span>{{ props.copy.confirmDeleteDescription }}</span>
            </span>
          </div>
          <button
            class="omp-settings-switch"
            :class="{ 'omp-settings-switch-off': !confirmDelete }"
            type="button"
            :aria-label="`${props.copy.confirmDeleteTitle}: ${confirmDelete ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="confirmDelete"
            @click="confirmDelete = !confirmDelete"
          >
            <span />
          </button>
        </div>
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="rotate-cw" :size="16" /></span>
            <span>
              <strong>{{ props.copy.restoreTitle }}</strong>
              <span>{{ props.copy.restoreDescription }}</span>
            </span>
          </div>
          <button
            class="omp-settings-switch"
            :class="{ 'omp-settings-switch-off': !restoreLast }"
            type="button"
            :aria-label="`${props.copy.restoreTitle}: ${restoreLast ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="restoreLast"
            @click="restoreLast = !restoreLast"
          >
            <span />
          </button>
        </div>
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="clock" :size="16" /></span>
            <span>
              <strong>{{ props.copy.retentionTitle }}</strong>
              <span>{{ props.copy.retentionDescription }}</span>
            </span>
          </div>
          <label class="omp-settings-select-wrap">
            <span class="omp-settings-visually-hidden">{{ props.copy.retentionTitle }}</span>
            <select v-model="retention" class="omp-settings-select" :aria-label="props.copy.retentionTitle">
              <option v-for="option in props.copy.retentionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <AppIcon name="chevron-down" :size="14" aria-hidden="true" />
          </label>
        </div>
      </div>
    </section>
  </div>
</template>
