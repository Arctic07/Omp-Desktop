<script setup lang='ts'>
import { computed, ref, watch } from 'vue'

import type { SourceSettingsModelsCopy, SourceSettingsModel } from '../../i18n'
import { AppIcon } from '../icons'

export interface ModelPickerCandidate extends SourceSettingsModel {}

const props = defineProps<{
  copy: SourceSettingsModelsCopy['picker']
  open: boolean
  candidates: readonly ModelPickerCandidate[]
  existingIds: readonly string[]
}>()

const emit = defineEmits<{
  close: []
  add: [models: ModelPickerCandidate[]]
}>()

const searchQuery = ref('')
const selectedIds = ref<Set<string>>(new Set())

const filteredCandidates = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase()
  if (!query) {
    return props.candidates
  }
  return props.candidates.filter((candidate) => `${candidate.id} ${candidate.name ?? ''}`.toLocaleLowerCase().includes(query))
})

const allVisibleSelected = computed(() => {
  const visible = filteredCandidates.value
  return visible.length > 0 && visible.every((candidate) => selectedIds.value.has(candidate.id))
})

function resetSelection() {
  searchQuery.value = ''
  const existingIds = new Set(props.existingIds)
  selectedIds.value = new Set(props.candidates.filter((candidate) => !existingIds.has(candidate.id)).map((candidate) => candidate.id))
}

watch(
  [() => props.open, () => props.candidates, () => props.existingIds],
  ([open]) => {
    if (open) {
      resetSelection()
    }
  },
  { deep: true },
)

function toggleCandidate(candidateId: string) {
  const next = new Set(selectedIds.value)
  if (next.has(candidateId)) {
    next.delete(candidateId)
  } else {
    next.add(candidateId)
  }
  selectedIds.value = next
}

function toggleVisibleCandidates() {
  const next = new Set(selectedIds.value)
  if (allVisibleSelected.value) {
    filteredCandidates.value.forEach((candidate) => next.delete(candidate.id))
  } else {
    filteredCandidates.value.forEach((candidate) => next.add(candidate.id))
  }
  selectedIds.value = next
}

function addSelectedModels() {
  emit('add', props.candidates.filter((candidate) => selectedIds.value.has(candidate.id)))
}
</script>

<template>
  <div v-if='props.open' class='dsh-model-picker-layer' @keydown.esc='emit("close")'>
    <section
      class='dsh-model-picker-dialog'
      role='dialog'
      aria-modal='true'
      aria-labelledby='dsh-model-picker-title'
    >
      <header class='dsh-model-picker-header'>
        <div>
          <h3 id='dsh-model-picker-title'>{{ props.copy.title }}</h3>
          <p>{{ props.copy.description }}</p>
        </div>
        <button
          class='dsh-model-picker-close'
          type='button'
          :aria-label='props.copy.close'
          @click='emit("close")'
        >
          <AppIcon name='x' :size='18' />
        </button>
      </header>

      <div class='dsh-model-picker-toolbar'>
        <label class='dsh-model-picker-search'>
          <AppIcon name='search' :size='16' aria-hidden='true' />
          <span class='dsh-settings-visually-hidden'>{{ props.copy.searchLabel }}</span>
          <input
            v-model='searchQuery'
            type='search'
            role='searchbox'
            :placeholder='props.copy.searchPlaceholder'
            :aria-label='props.copy.searchLabel'
          />
        </label>
        <button
          class='dsh-settings-button dsh-settings-button-small'
          type='button'
          :aria-pressed='allVisibleSelected'
          :disabled='filteredCandidates.length === 0'
          @click='toggleVisibleCandidates'
        >
          {{ allVisibleSelected ? props.copy.clearAll : props.copy.selectAll }}
        </button>
      </div>

      <div class='dsh-model-picker-list' role='group' :aria-label='props.copy.listLabel'>
        <label v-for='candidate in filteredCandidates' :key='candidate.id' class='dsh-model-picker-option'>
          <input
            type='checkbox'
            :checked='selectedIds.has(candidate.id)'
            :aria-label='candidate.name ? `${candidate.name} (${candidate.id})` : candidate.id'
            @change='toggleCandidate(candidate.id)'
          />
          <span class='dsh-model-picker-option-copy'>
            <strong>{{ candidate.name || candidate.id }}</strong>
            <small v-if='candidate.name'>{{ candidate.id }}</small>
          </span>
        </label>
        <p v-if='filteredCandidates.length === 0' class='dsh-model-picker-empty'>{{ props.copy.noMatches }}</p>
      </div>

      <footer class='dsh-model-picker-actions'>
        <button class='dsh-settings-button' type='button' @click='emit("close")'>{{ props.copy.cancel }}</button>
        <button
          class='dsh-settings-button dsh-settings-button-primary'
          type='button'
          :disabled='selectedIds.size === 0'
          @click='addSelectedModels'
        >
          {{ props.copy.addSelected }}
        </button>
      </footer>
    </section>
  </div>
</template>
