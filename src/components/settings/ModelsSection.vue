<script setup lang="ts">
import { toRef } from 'vue'

import type { SourceSettingsModelsCopy } from '../../i18n'
import { useModelSettings } from '../../composables/useModelSettings'
import ModelPickerDialog from './ModelPickerDialog.vue'
import ModelProviderCard from './ModelProviderCard.vue'

const props = defineProps<{
  copy: SourceSettingsModelsCopy
}>()

const copy = toRef(props, 'copy')
const {
  providers,
  activeProvider,
  editingProvider,
  customSettingsProvider,
  savedProvider,
  fetchingProvider,
  pickerProvider,
  pickerCandidates,
  pickerExistingIds,
  toggleEditor,
  deleteProvider,
  toggleCustomSettings,
  updateModels,
  updateApiKey,
  updateEndpoint,
  restoreDefaultModels,
  addModel,
  saveProvider,
  cancelProvider,
  fetchModels,
  addSelectedModels,
} = useModelSettings(copy)
</script>

<template>
  <div class="omp-settings-stack">
    <section class="omp-settings-group" aria-labelledby="omp-settings-models-providers">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-models-providers">{{ props.copy.providerTitle }}</h3>
        <p>{{ props.copy.providerDescription }}</p>
      </div>

      <div class="omp-model-provider-list">
        <ModelProviderCard
          v-for="provider in providers"
          :key="provider.id"
          :copy="props.copy"
          :provider="provider"
          :active="activeProvider === provider.id"
          :editing="editingProvider === provider.id"
          :custom-settings-open="customSettingsProvider === provider.id"
          :fetching="fetchingProvider === provider.id"
          :saved="savedProvider === provider.id"
          @select="activeProvider = provider.id"
          @toggle-editor="toggleEditor(provider)"
          @delete="deleteProvider(provider.id)"
          @toggle-custom-settings="toggleCustomSettings(provider.id)"
          @update:models="updateModels(provider, $event)"
          @update:api-key="updateApiKey(provider, $event)"
          @update:endpoint="updateEndpoint(provider, $event)"
          @restore-defaults="restoreDefaultModels(provider)"
          @fetch="fetchModels(provider)"
          @add="addModel(provider)"
          @cancel="cancelProvider(provider)"
          @save="saveProvider(provider)"
        />
      </div>
    </section>

    <ModelPickerDialog
      :open="pickerProvider !== ''"
      :copy="props.copy.picker"
      :candidates="pickerCandidates"
      :existing-ids="pickerExistingIds"
      @close="pickerProvider = ''"
      @add="addSelectedModels"
    />
  </div>
</template>
