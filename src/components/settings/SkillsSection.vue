<script setup lang="ts">
import { computed } from 'vue'

import type { SourceSettingsSkillsCopy } from '../../i18n'
import { useAppSettings } from '../../stores/appSettings'
import { AppIcon } from '../icons'

const props = defineProps<{
  copy: SourceSettingsSkillsCopy
}>()

const { settings, setEnabledSkills } = useAppSettings()
const enabledSkills = computed<Set<string>>(() => new Set(settings.enabledSkills))

function toggleSkill(skillId: string): void {
  const nextSkills = new Set(enabledSkills.value)
  if (nextSkills.has(skillId)) {
    nextSkills.delete(skillId)
  } else {
    nextSkills.add(skillId)
  }
  setEnabledSkills([...nextSkills])
}
</script>

<template>
  <div class="omp-settings-stack">
    <section class="omp-settings-group" :aria-labelledby="'omp-settings-skills-list'">
      <div class="omp-settings-group-heading">
        <h3 id="omp-settings-skills-list">{{ props.copy.title }}</h3>
        <p>{{ props.copy.description }}</p>
      </div>
      <div class="omp-settings-card omp-settings-list-card">
        <div v-for="skill in props.copy.skills" :key="skill.id" class="omp-settings-row">
          <div class="omp-settings-row-copy omp-settings-row-copy-with-icon">
            <span class="omp-settings-row-icon" aria-hidden="true"><AppIcon name="sparkles" :size="16" /></span>
            <span>
              <strong>{{ skill.name }}</strong>
              <span>{{ skill.description }}</span>
            </span>
          </div>
          <button
            class="omp-settings-switch"
            :class="{ 'omp-settings-switch-off': !enabledSkills.has(skill.id) }"
            type="button"
            :aria-label="`${skill.name}: ${enabledSkills.has(skill.id) ? props.copy.enabledLabel : props.copy.disabledLabel}`"
            :aria-pressed="enabledSkills.has(skill.id)"
            @click="toggleSkill(skill.id)"
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
