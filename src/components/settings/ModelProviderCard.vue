<script setup lang="ts">
import { computed } from 'vue'

import type { SourceSettingsModelsCopy } from '../../i18n'
import type { ModelEditorModel, ModelProviderState, ModelProviderStatus } from '../../utils/modelSettings'
import { AppIcon } from '../icons'
import ModelCatalogEditor from './ModelCatalogEditor.vue'

const props = defineProps<{
  copy: SourceSettingsModelsCopy
  provider: ModelProviderState
  active: boolean
  editing: boolean
  customSettingsOpen: boolean
  fetching: boolean
  saved: boolean
}>()

const emit = defineEmits<{
  select: []
  toggleEditor: []
  delete: []
  toggleCustomSettings: []
  'update:models': [models: ModelEditorModel[]]
  'update:api-key': [value: string]
  'update:endpoint': [value: string]
  restoreDefaults: []
  fetch: []
  add: []
  cancel: []
  save: []
}>()

function inputValue(event: Event): string {
  const target = event.currentTarget
  return target instanceof HTMLInputElement ? target.value : ''
}

const providerStatus = computed<ModelProviderStatus>(() => {
  if (props.provider.committedApiKeyConfigured || props.provider.initialStatus === 'configured') {
    return 'configured'
  }
  if (props.provider.endpoint.trim()) {
    return 'available'
  }
  return props.provider.initialStatus
})

const statusLabel = computed<string>(() => {
  if (providerStatus.value === 'configured') {
    return props.copy.configuredLabel
  }
  if (providerStatus.value === 'unavailable') {
    return props.copy.unavailableLabel
  }
  return props.copy.availableLabel
})
</script>

<template>
  <article
    class="omp-settings-card omp-model-provider-card"
    :class="{ 'omp-model-provider-card-active': props.active }"
  >
    <header class="omp-model-provider-header">
      <button
        class="omp-model-provider-select"
        type="button"
        :aria-pressed="props.active"
        @click="emit('select')"
      >
        <span class="omp-settings-list-item-icon" aria-hidden="true">
          <AppIcon name="bot" :size="17" />
        </span>
        <span class="omp-settings-row-copy">
          <strong>{{ props.provider.name }}</strong>
          <span>{{ props.provider.description }}</span>
          <small>{{ props.provider.model }}</small>
        </span>
      </button>
      <div class="omp-model-provider-actions">
        <span class="omp-model-provider-status" :class="`omp-model-provider-status-${providerStatus}`">
          <span class="omp-model-provider-status-dot" aria-hidden="true" />
          {{ statusLabel }}
        </span>
        <button
          class="omp-settings-button omp-settings-button-small"
          type="button"
          :aria-expanded="props.editing"
          @click="emit('toggleEditor')"
        >
          <AppIcon name="pencil-line" :size="14" aria-hidden="true" />
          {{ props.editing ? props.copy.hideConfiguration : props.copy.edit }}
        </button>
        <button
          class="omp-model-provider-delete"
          type="button"
          :aria-label="`${props.copy.deleteProvider}: ${props.provider.name}`"
          @click="emit('delete')"
        >
          <AppIcon name="trash-2" :size="16" aria-hidden="true" />
        </button>
      </div>
    </header>

    <div v-if="props.editing" class="omp-model-provider-editor">
      <label class="omp-model-api-key">
        <span class="omp-settings-input-label">{{ props.copy.apiKeyLabel }}</span>
        <input
          :value="props.provider.apiKey"
          class="omp-settings-input"
          type="password"
          autocomplete="new-password"
          :placeholder="props.provider.apiKeyConfigured ? props.copy.apiKeyConfiguredPlaceholder : props.copy.apiKeyPlaceholder"
          @input="emit('update:api-key', inputValue($event))"
        />
      </label>

      <button
        class="omp-model-custom-settings-toggle"
        type="button"
        :aria-expanded="props.customSettingsOpen"
        @click="emit('toggleCustomSettings')"
      >
        <span>
          <strong>{{ props.copy.customSettings }}</strong>
          <small>{{ props.copy.customSettingsDescription }}</small>
        </span>
        <AppIcon name="chevron-down" :size="16" aria-hidden="true" />
      </button>

      <div v-if="props.customSettingsOpen" class="omp-model-custom-settings">
        <label class="omp-model-api-address">
          <span class="omp-settings-input-label">{{ props.copy.endpointLabel }}</span>
          <input
            :value="props.provider.endpoint"
            class="omp-settings-input"
            type="url"
            autocomplete="url"
            :placeholder="props.copy.endpointPlaceholder"
            @input="emit('update:endpoint', inputValue($event))"
          />
        </label>
        <ModelCatalogEditor
          :copy="props.copy"
          :fetching="props.fetching"
          :fetch-error="props.provider.fetchError"
          :validation-error="props.provider.validationError"
          @update:models="emit('update:models', $event)"
          @restore-defaults="emit('restoreDefaults')"
          @fetch="emit('fetch')"
          @add="emit('add')"
        />
      </div>

      <p v-if="props.saved" class="omp-settings-inline-note">{{ props.copy.saved }}</p>
      <div class="omp-model-provider-footer">
        <button class="omp-settings-button" type="button" @click="emit('cancel')">{{ props.copy.cancel }}</button>
        <button class="omp-settings-button omp-settings-button-primary" type="button" @click="emit('save')">
          {{ props.copy.save }}
        </button>
      </div>
    </div>
  </article>
</template>
