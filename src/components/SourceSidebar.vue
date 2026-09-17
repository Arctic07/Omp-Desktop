<script setup lang="ts">
import { useAppSettings } from '../stores/appSettings'
import type { WorkspaceProject } from '../utils/workspaceTypes'
import { AppIcon } from './icons'
import FishLogo from './FishLogo.vue'
import SourceWorkspaceList from './SourceWorkspaceList.vue'

const props = defineProps<{
  collapsed: boolean
  activeSessionId: string | null
  projects: readonly WorkspaceProject[]
}>()

const emit = defineEmits<{
  'new-session': []
  'select-session': [sessionId: string]
  toggle: []
  'open-settings': []
  'add-workspace': []
}>()

const { copy } = useAppSettings()

</script>

<template>
  <aside class="omp-sidebar" :class="{ 'omp-sidebar-collapsed': props.collapsed }">
    <div class="omp-sidebar-logo-row">
      <button
        v-if="!props.collapsed"
        class="omp-sidebar-brand"
        type="button"
        :aria-label="copy.newSessionLabel"
        @click="emit('new-session')"
      >
        <span class="omp-sidebar-brand-identity" aria-hidden="true">
          <FishLogo class="omp-sidebar-brand-mark" :size="24" />
          <span class="omp-sidebar-brand-name">{{ copy.brand }}</span>
        </span>
      </button>
      <button
        class="omp-sidebar-icon-button omp-sidebar-toggle"
        type="button"
        :aria-label="props.collapsed ? copy.openSidebar : copy.collapseSidebar"
        @click="emit('toggle')"
      >
        <FishLogo v-if="props.collapsed" class="omp-sidebar-rail-mark" :size="24" />
        <AppIcon v-else name="panel-left" :size="16" aria-hidden="true" />
      </button>
    </div>

    <button class="omp-sidebar-new-session" type="button" @click="emit('new-session')">
      <AppIcon name="plus" :size="props.collapsed ? 18 : 14" aria-hidden="true" />
      <span v-if="!props.collapsed">{{ copy.newSession }}</span>
    </button>

    <div class="omp-sidebar-region">
      <SourceWorkspaceList
        :collapsed="props.collapsed"
        :active-session-id="props.activeSessionId"
        :projects="props.projects"
        @new-session="emit('new-session')"
        @select-session="emit('select-session', $event)"
        @add-workspace="emit('add-workspace')"
      />
    </div>

    <div class="omp-sidebar-footer">
      <button class="omp-sidebar-settings" type="button" :aria-label="copy.settings" @click="emit('open-settings')">
        <AppIcon name="settings" :size="16" aria-hidden="true" />
        <span v-if="!props.collapsed">{{ copy.settings }}</span>
      </button>
    </div>
  </aside>
</template>
