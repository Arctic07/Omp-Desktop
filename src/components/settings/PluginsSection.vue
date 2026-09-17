<script setup lang="ts">
import { computed, ref } from 'vue'

import type { SourceSettingsPluginsCopy } from '../../i18n'
import { useAppSettings } from '../../stores/appSettings'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsPluginsCopy
}>()

const { settings, setEnabledPlugins, setPluginAlias } = useAppSettings()
const enabledPlugins = computed<Set<string>>(() => new Set(settings.enabledPlugins))
const configurationPlugin = ref('')
const workspaceAlias = ref('')
const savedPlugin = ref('')

function togglePlugin(pluginId: string): void {
  const nextPlugins = new Set(enabledPlugins.value)
  if (nextPlugins.has(pluginId)) {
    nextPlugins.delete(pluginId)
  } else {
    nextPlugins.add(pluginId)
  }
  setEnabledPlugins([...nextPlugins])
}

function toggleConfiguration(pluginId: string): void {
  configurationPlugin.value = configurationPlugin.value === pluginId ? '' : pluginId
  workspaceAlias.value = settings.pluginAliases[pluginId] ?? ''
  savedPlugin.value = ''
}

function saveConfiguration(pluginId: string): void {
  setPluginAlias(pluginId, workspaceAlias.value.trim())
  savedPlugin.value = pluginId
}
</script>

<template>
  <div class="omp-settings-stack">
    <section class="omp-settings-group" aria-labelledby="omp-settings-plugins-list">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-plugins-list">{{ props.copy.title }}</h3>
        <p>{{ props.copy.description }}</p>
      </div>
      <div class="omp-settings-card omp-settings-list-card">
        <div v-for="plugin in props.copy.plugins" :key="plugin.id" class="omp-settings-list-item">
          <div class="omp-settings-list-item-button omp-settings-list-item-static">
            <span class="omp-settings-list-item-icon" aria-hidden="true"><AppIcon name="plug" :size="17" /></span>
            <span class="omp-settings-row-copy">
              <strong>{{ plugin.name }}</strong>
              <span>{{ plugin.description }}</span>
            </span>
          </div>
          <div class="omp-settings-list-item-actions">
            <button
              class="omp-settings-switch"
              :class="{ 'omp-settings-switch-off': !enabledPlugins.has(plugin.id) }"
              type="button"
              :aria-label="`${plugin.name}: ${enabledPlugins.has(plugin.id) ? props.copy.enabledLabel : props.copy.disabledLabel}`"
              :aria-pressed="enabledPlugins.has(plugin.id)"
              @click="togglePlugin(plugin.id)"
            >
              <span />
            </button>
            <button
              class="omp-settings-button omp-settings-button-small"
              type="button"
              :aria-expanded="configurationPlugin === plugin.id"
              @click="toggleConfiguration(plugin.id)"
            >
              {{ props.copy.configure }}
            </button>
          </div>
          <div v-if="configurationPlugin === plugin.id" class="omp-settings-inline-config">
            <div class="omp-settings-group-heading omp-settings-inline-heading">
              <h4>{{ props.copy.pluginSettingsTitle }}</h4>
              <p>{{ props.copy.pluginSettingsDescription }}</p>
            </div>
            <label class="omp-settings-input-label" :for="`omp-settings-plugin-alias-${plugin.id}`">
              {{ props.copy.pluginInputLabel }}
            </label>
            <div class="omp-settings-input-row">
              <input
                :id="`omp-settings-plugin-alias-${plugin.id}`"
                v-model="workspaceAlias"
                class="omp-settings-input"
                type="text"
                :placeholder="props.copy.pluginInputPlaceholder"
              />
              <button class="omp-settings-button omp-settings-button-primary" type="button" @click="saveConfiguration(plugin.id)">
                {{ props.copy.save }}
              </button>
            </div>
            <span v-if="savedPlugin === plugin.id" class="omp-settings-inline-note">{{ props.copy.configured }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
