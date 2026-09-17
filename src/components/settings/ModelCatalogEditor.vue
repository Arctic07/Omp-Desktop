<script setup lang='ts'>
import { ref } from 'vue'

import type { SourceSettingsModelsCopy } from '../../i18n'
import { AppIcon } from '../icons'

export interface ModelEditorModel {
  id: string
  name?: string
  capacity?: string
}

const props = defineProps<{
  copy: SourceSettingsModelsCopy
  models: readonly ModelEditorModel[]
  defaultModels: readonly ModelEditorModel[]
  fetching: boolean
  fetchError: string
  validationError: string
}>()

const emit = defineEmits<{
  'update:models': [models: ModelEditorModel[]]
  restoreDefaults: []
  fetch: []
  add: []
}>()

const expandedRows = ref<Set<number>>(new Set())

function inputValue(event: Event) {
  return (event.target as HTMLInputElement).value
}

function updateModel(index: number, field: 'id' | 'name' | 'capacity', value: string) {
  const models = props.models.map((model, modelIndex) => {
    if (modelIndex !== index) {
      return { ...model }
    }
    const next = { ...model }
    if (field === 'id') {
      next.id = value
    } else if (field === 'name') {
      next.name = value
    } else {
      next.capacity = value
    }
    return next
  })
  emit('update:models', models)
}

function removeModel(index: number) {
  emit('update:models', props.models.filter((_, modelIndex) => modelIndex !== index).map((model) => ({ ...model })))
  const nextExpanded = new Set<number>()
  expandedRows.value.forEach((row) => {
    if (row < index) {
      nextExpanded.add(row)
    } else if (row > index) {
      nextExpanded.add(row - 1)
    }
  })
  expandedRows.value = nextExpanded
}

function toggleExpanded(index: number) {
  const nextExpanded = new Set(expandedRows.value)
  if (nextExpanded.has(index)) {
    nextExpanded.delete(index)
  } else {
    nextExpanded.add(index)
  }
  expandedRows.value = nextExpanded
}
</script>

<template>
  <div class='omp-model-catalog'>
  <div class='omp-model-catalog-heading'>
    <div>
      <h4>{{ props.copy.modelCatalogTitle }}</h4>
      <p>{{ props.copy.modelCatalogDescription }}</p>
    </div>
    <div class='omp-model-catalog-heading-actions'>
      <button
        class='omp-settings-button omp-settings-button-small'
        type='button'
        :disabled='props.fetching'
        @click='emit("restoreDefaults")'
      >
        <AppIcon name='rotate-cw' :size='14' aria-hidden='true' />
        {{ props.copy.restoreDefaultModels }}
      </button>
      <button
        class='omp-settings-button omp-settings-button-small omp-settings-button-primary'
        type='button'
        :disabled='props.fetching'
        @click='emit("fetch")'
      >
        <AppIcon name='refresh-cw' :size='14' aria-hidden='true' />
        {{ props.fetching ? props.copy.fetchingModels : props.copy.fetchModels }}
      </button>
    </div>
  </div>

    <p v-if='props.fetchError' class='omp-model-catalog-feedback omp-model-catalog-feedback-error' role='alert'>
      {{ props.fetchError }}
    </p>
    <p v-if='props.validationError' class='omp-model-catalog-feedback omp-model-catalog-feedback-error' role='alert'>
      {{ props.validationError }}
    </p>

    <div v-if='props.models.length > 0' class='omp-model-catalog-list'>
      <article v-for='(model, index) in props.models' :key='`${index}-${model.id}`' class='omp-model-row'>
        <div class='omp-model-row-main'>
          <label class='omp-model-field'>
            <span>{{ props.copy.modelIdLabel }}</span>
            <input
              class='omp-settings-input'
              type='text'
              :value='model.id'
              :placeholder='props.copy.manualModelIdPlaceholder'
              autocomplete='off'
              @input='updateModel(index, "id", inputValue($event))'
            />
          </label>
          <label class='omp-model-field'>
            <span>{{ props.copy.modelNameLabel }}</span>
            <input
              class='omp-settings-input'
              type='text'
              :value='model.name ?? ""'
              :placeholder='props.copy.manualModelNamePlaceholder'
              autocomplete='off'
              @input='updateModel(index, "name", inputValue($event))'
            />
          </label>
          <div class='omp-model-row-actions'>
            <button
              class='omp-model-expand-button'
              type='button'
              :aria-expanded='expandedRows.has(index)'
              :aria-label='expandedRows.has(index) ? props.copy.collapseModel : props.copy.expandModel'
              @click='toggleExpanded(index)'
            >
              <AppIcon name='chevron-down' :size='16' aria-hidden='true' />
            </button>
            <button
              class='omp-model-remove-button'
              type='button'
              :aria-label='props.copy.removeModel'
              @click='removeModel(index)'
            >
              <AppIcon name='trash-2' :size='16' aria-hidden='true' />
            </button>
          </div>
        </div>
        <div v-if='expandedRows.has(index)' class='omp-model-row-details'>
          <label class='omp-model-field omp-model-field-capacity'>
            <span>{{ props.copy.modelCapacityLabel }}</span>
            <input
              class='omp-settings-input'
              type='text'
              :value='model.capacity ?? ""'
              :placeholder='props.copy.modelCapacityPlaceholder'
              autocomplete='off'
              @input='updateModel(index, "capacity", inputValue($event))'
            />
          </label>
        </div>
      </article>
    </div>
    <p v-else class='omp-model-catalog-empty'>{{ props.copy.modelsEmpty }}</p>

    <button class='omp-model-add-button' type='button' @click='emit("add")'>
      <AppIcon name='plus' :size='15' aria-hidden='true' />
      {{ props.copy.addModel }}
    </button>
  </div>
</template>
