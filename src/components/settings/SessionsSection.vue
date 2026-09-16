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
  <div class="dsh-settings-stack">
    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-sessions-behavior'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-sessions-behavior">{{ props.copy.behaviorTitle }}</h3>
        <p>{{ props.copy.behaviorDescription }}</p>
      </div>
      <div class="dsh-settings-card">
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy dsh-settings-row-copy-with-icon">
            <span class="dsh-settings-row-icon" aria-hidden="true"><AppIcon name="archive" :size="16" /></span>
            <span>
              <strong>{{ props.copy.autoArchiveTitle }}</strong>
              <span>{{ props.copy.autoArchiveDescription }}</span>
            </span>
          </div>
          <button
            class="dsh-settings-switch"
            :class="{ 'dsh-settings-switch-off': !autoArchive }"
            type="button"
            :aria-label="`${props.copy.autoArchiveTitle}: ${autoArchive ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="autoArchive"
            @click="toggleAutoArchive"
          >
            <span />
          </button>
        </div>
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy dsh-settings-row-copy-with-icon">
            <span class="dsh-settings-row-icon" aria-hidden="true"><AppIcon name="trash-2" :size="16" /></span>
            <span>
              <strong>{{ props.copy.confirmDeleteTitle }}</strong>
              <span>{{ props.copy.confirmDeleteDescription }}</span>
            </span>
          </div>
          <button
            class="dsh-settings-switch"
            :class="{ 'dsh-settings-switch-off': !confirmDelete }"
            type="button"
            :aria-label="`${props.copy.confirmDeleteTitle}: ${confirmDelete ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="confirmDelete"
            @click="toggleConfirmDelete"
          >
            <span />
          </button>
        </div>
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy dsh-settings-row-copy-with-icon">
            <span class="dsh-settings-row-icon" aria-hidden="true"><AppIcon name="rotate-cw" :size="16" /></span>
            <span>
              <strong>{{ props.copy.restoreTitle }}</strong>
              <span>{{ props.copy.restoreDescription }}</span>
            </span>
          </div>
          <button
            class="dsh-settings-switch"
            :class="{ 'dsh-settings-switch-off': !restoreLast }"
            type="button"
            :aria-label="`${props.copy.restoreTitle}: ${restoreLast ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="restoreLast"
            @click="toggleRestoreLast"
          >
            <span />
          </button>
        </div>
        <div class="dsh-settings-row">
          <div class="dsh-settings-row-copy">
            <strong>{{ props.copy.retentionTitle }}</strong>
            <span>{{ props.copy.retentionDescription }}</span>
          </div>
          <label class="dsh-settings-select-wrap">
            <span class="dsh-settings-visually-hidden">{{ props.copy.retentionTitle }}</span>
            <select v-model="retention" class="dsh-settings-select" :aria-label="props.copy.retentionTitle">
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
