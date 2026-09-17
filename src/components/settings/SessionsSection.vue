<script setup lang="ts">
import { ref } from 'vue'

import type { SourceSettingsSessionsCopy } from '../../i18n'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsSessionsCopy
}>()

const autoArchive = ref(true)
const confirmDelete = ref(true)
const restoreLast = ref(true)
const retention = ref('never')

function toggleAutoArchive() {
  autoArchive.value = !autoArchive.value
}

function toggleConfirmDelete() {
  confirmDelete.value = !confirmDelete.value
}

function toggleRestoreLast() {
  restoreLast.value = !restoreLast.value
}
</script>

<template>
  <div class="omp-settings-stack">
    <section class="omp-settings-group" :aria-labelledby="'omp-settings-sessions-behavior'">
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
            @click="toggleAutoArchive"
          >
            <span />
          </button>
        </div>
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="trash-2" :size="16" /></span>
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
            @click="toggleConfirmDelete"
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
            @click="toggleRestoreLast"
          >
            <span />
          </button>
        </div>
        <div class="omp-settings-row">
          <div class="omp-settings-row-copy">
            <strong>{{ props.copy.retentionTitle }}</strong>
            <span>{{ props.copy.retentionDescription }}</span>
          </div>
          <label class="omp-settings-select-wrap">
            <span class="omp-settings-visually-hidden">{{ props.copy.retentionTitle }}</span>
            <select v-model="retention" class="omp-settings-select" :aria-label="props.copy.retentionTitle">
              <option v-for="option in props.copy.retentionOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <AppIcon name="chevron-down" :size="14" />
          </label>
        </div>
      </div>
    </section>
  </div>
</template>
