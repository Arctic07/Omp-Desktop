<script setup lang="ts">
import { computed, ref } from 'vue'

import { type SourceSettingsSectionId } from '../i18n'
import { useAppSettings } from '../stores/appSettings'
import AboutSection from './settings/AboutSection.vue'
import AgentModesSection from './settings/AgentModesSection.vue'
import AppearanceSection from './settings/AppearanceSection.vue'
import GeneralSection from './settings/GeneralSection.vue'
import ModelsSection from './settings/ModelsSection.vue'
import PluginsSection from './settings/PluginsSection.vue'
import SessionsSection from './settings/SessionsSection.vue'
import SkillsSection from './settings/SkillsSection.vue'
import { AppIcon } from './icons'

const { copy } = useAppSettings()
const navigation = computed(() => copy.value.settingsNavigation)
const activeSection = ref<SourceSettingsSectionId>(navigation.value[0]?.id ?? 'general')
const activeNavigationItem = computed(
  () => navigation.value.find((item) => item.id === activeSection.value) ?? navigation.value[0],
)

const emit = defineEmits<{
  close: []
}>()
</script>

<template>
  <section class="omp-settings" :aria-label="copy.settingsTitle">
    <aside class="omp-settings-nav">
      <div class="omp-settings-heading-row">
        <h1>{{ copy.settingsTitle }}</h1>
        <button class="omp-settings-close" type="button" :aria-label="copy.closeSettings" @click="emit('close')">
          <AppIcon name="x" :size="18" />
        </button>
      </div>
      <nav :aria-label="copy.settingsTitle">
        <button
          v-for="section in navigation"
          :key="section.id"
          class="omp-settings-nav-item"
          :class="{ 'omp-settings-nav-item-active': activeSection === section.id }"
          type="button"
          :aria-current="activeSection === section.id ? 'page' : undefined"
          @click="activeSection = section.id"
        >
          {{ section.label }}
        </button>
      </nav>
    </aside>
    <div class="omp-settings-content">
      <div class="omp-settings-content-inner">
        <p class="omp-settings-kicker">{{ copy.settingsTitle }}</p>
        <template v-if="activeNavigationItem">
          <h2>{{ activeNavigationItem.label }}</h2>
          <p class="omp-settings-description">
            {{ copy.settingsPage.sectionDescriptions[activeSection] }}
          </p>
        </template>

        <GeneralSection v-show="activeSection === 'general'" :copy="copy.settingsPage.general" />
        <ModelsSection v-show="activeSection === 'models'" :copy="copy.settingsPage.models" />
        <AgentModesSection v-show="activeSection === 'agent-modes'" :copy="copy.settingsPage.agentModes" />
        <SkillsSection v-show="activeSection === 'skills'" :copy="copy.settingsPage.skills" />
        <PluginsSection v-show="activeSection === 'plugins'" :copy="copy.settingsPage.plugins" />
        <SessionsSection v-show="activeSection === 'sessions'" :copy="copy.settingsPage.sessions" />
        <AppearanceSection v-show="activeSection === 'appearance'" :copy="copy.settingsPage.appearance" />
        <AboutSection v-show="activeSection === 'about'" :copy="copy.settingsPage.about" />
      </div>
    </div>
  </section>
</template>
