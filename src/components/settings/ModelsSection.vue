<script setup lang="ts">
import { ref } from 'vue'

import type { SourceSettingsModelsCopy } from '../../i18n'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsModelsCopy
}>()

const activeProvider = ref(props.copy.providers[0]?.id ?? '')
const configurationProvider = ref('')
const endpoint = ref('')
const savedProvider = ref('')

function toggleConfiguration(providerId: string) {
  configurationProvider.value = configurationProvider.value === providerId ? '' : providerId
  savedProvider.value = ''
}

function saveEndpoint(providerId: string) {
  savedProvider.value = providerId
}
</script>

<template>
  <div class="dsh-settings-stack">
    <section class="dsh-settings-group" :aria-labelledby="'dsh-settings-models-providers'">
      <div class="dsh-settings-group-heading">
        <h3 id="dsh-settings-models-providers">{{ props.copy.providerTitle }}</h3>
        <p>{{ props.copy.providerDescription }}</p>
      </div>
      <div class="dsh-settings-card dsh-settings-list-card">
        <div
          v-for="provider in props.copy.providers"
          :key="provider.id"
          class="dsh-settings-list-item"
          :class="{ 'dsh-settings-list-item-active': activeProvider === provider.id }"
        >
          <button
            class="dsh-settings-list-item-button"
            type="button"
            :aria-pressed="activeProvider === provider.id"
            @click="activeProvider = provider.id"
          >
            <span class="dsh-settings-list-item-icon" aria-hidden="true">
              <AppIcon name="bot" :size="17" />
            </span>
            <span class="dsh-settings-row-copy">
              <strong>{{ provider.name }}</strong>
              <span>{{ provider.description }}</span>
              <small>{{ provider.model }}</small>
            </span>
          </button>
          <div class="dsh-settings-list-item-actions">
            <span v-if="activeProvider === provider.id" class="dsh-settings-status dsh-settings-status-active">
              {{ props.copy.activeLabel }}
            </span>
            <span v-else-if="provider.status === 'configured'" class="dsh-settings-status">
              {{ props.copy.configuredLabel }}
            </span>
            <span v-else-if="provider.status === 'unavailable'" class="dsh-settings-status">
              {{ props.copy.unavailableLabel }}
            </span>
            <button
              class="dsh-settings-button dsh-settings-button-small"
              type="button"
              :aria-expanded="configurationProvider === provider.id"
              @click.stop="toggleConfiguration(provider.id)"
            >
              {{ configurationProvider === provider.id ? props.copy.hideConfiguration : props.copy.configure }}
            </button>
          </div>

          <div v-if="configurationProvider === provider.id" class="dsh-settings-inline-config">
            <label class="dsh-settings-input-label" :for="`dsh-settings-endpoint-${provider.id}`">
              {{ props.copy.endpointLabel }}
            </label>
            <div class="dsh-settings-input-row">
              <input
                :id="`dsh-settings-endpoint-${provider.id}`"
                v-model="endpoint"
                class="dsh-settings-input"
                type="url"
                :placeholder="props.copy.endpointPlaceholder"
              />
              <button class="dsh-settings-button dsh-settings-button-primary" type="button" @click="saveEndpoint(provider.id)">
                {{ props.copy.save }}
              </button>
            </div>
            <span v-if="savedProvider === provider.id" class="dsh-settings-inline-note">{{ props.copy.saved }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
