<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import { getSourceCopy } from '../i18n'
import { AppIcon } from './icons'
import FishLogo from './FishLogo.vue'

const copy = getSourceCopy()

const props = defineProps<{
  collapsed: boolean
}>()

const emit = defineEmits<{
  newSession: []
  toggle: []
  openSettings: []
  addWorkspace: []
}>()

const searchExpanded = ref(false)
const query = ref('')
const workspaceMenuOpen = ref(false)
const searchInput = ref<HTMLInputElement | null>(null)

const hasSearchResults = computed(() => query.value.trim().length > 0)

function startSession() {
  workspaceMenuOpen.value = false
  emit('newSession')
}

async function expandSearch() {
  workspaceMenuOpen.value = false
  searchExpanded.value = true
  await nextTick()
  searchInput.value?.focus()
}

function closeSearch() {
  query.value = ''
  searchExpanded.value = false
}


function addWorkspace() {
  workspaceMenuOpen.value = false
  emit('addWorkspace')
}
</script>

<template>
  <aside class="dsh-sidebar" :class="{ 'dsh-sidebar-collapsed': props.collapsed }">
    <div class="dsh-sidebar-logo-row">
      <button
        v-if="!props.collapsed"
        class="dsh-sidebar-brand"
        type="button"
        :aria-label="copy.newSessionLabel"
        @click="startSession"
      >
        <span class="dsh-sidebar-brand-identity" aria-hidden="true">
          <FishLogo class="dsh-sidebar-brand-mark" :size="24" />
          <span class="dsh-sidebar-brand-name">{{ copy.brand }}</span>
        </span>
      </button>
      <button
        class="dsh-sidebar-icon-button dsh-sidebar-toggle"
        type="button"
        :aria-label="props.collapsed ? copy.openSidebar : copy.collapseSidebar"
        @click="emit('toggle')"
      >
        <FishLogo v-if="props.collapsed" class="dsh-sidebar-rail-mark" :size="24" />
        <AppIcon v-else name="panel-left" :size="16" />
      </button>
    </div>

    <button class="dsh-sidebar-new-session" type="button" @click="startSession">
      <AppIcon name="plus" :size="props.collapsed ? 18 : 14" />
      <span v-if="!props.collapsed">{{ copy.newSession }}</span>
    </button>

    <div class="dsh-sidebar-region">
      <section class="dsh-workspace-browser" :class="{ 'dsh-workspace-browser-rail': props.collapsed }">
        <div v-if="!props.collapsed" class="dsh-workspace-header">
          <span v-if="!searchExpanded" class="dsh-workspace-section-label">{{ copy.workspaces }}</span>
          <div class="dsh-workspace-search-slot" :class="{ 'dsh-workspace-search-slot-expanded': searchExpanded }">
            <div class="dsh-workspace-search" :class="{ 'dsh-workspace-search-expanded': searchExpanded }">
              <button
                class="dsh-workspace-search-button"
                type="button"
                :aria-label="copy.searchSessions"
                :aria-expanded="searchExpanded"
                @click="expandSearch"
              >
                <AppIcon name="search" :size="searchExpanded ? 11 : 14" />
              </button>
              <input
                v-if="searchExpanded"
                ref="searchInput"
                v-model="query"
                class="dsh-workspace-search-input"
                type="search"
                :placeholder="`${copy.searchSessions}...`"
                :aria-label="copy.searchSessions"
                @keydown.esc="closeSearch"
              />
              <button
                v-if="searchExpanded"
                class="dsh-workspace-search-clear"
                type="button"
                :aria-label="copy.clearSearch"
                @click="closeSearch"
              >
                <AppIcon name="x" :size="14" />
              </button>
            </div>
          </div>
          <div class="dsh-workspace-header-actions" :class="{ 'dsh-workspace-header-actions-hidden': searchExpanded }">
            <button class="dsh-workspace-icon-button" type="button" :aria-label="copy.viewOptions">
              <AppIcon name="sliders-horizontal" :size="16" />
            </button>
            <button class="dsh-workspace-icon-button" type="button" :aria-label="copy.addWorkspace" @click="workspaceMenuOpen = !workspaceMenuOpen">
              <AppIcon name="folder-plus" :size="16" />
            </button>
          </div>
          <div v-if="workspaceMenuOpen" class="dsh-workspace-menu" role="menu">
            <button type="button" role="menuitem" @click="addWorkspace">{{ copy.addWorkspaceMenu }}</button>
          </div>
        </div>

        <div v-else class="dsh-workspace-rail-search">
          <button class="dsh-workspace-search-button" type="button" :aria-label="copy.searchSessions" @click="expandSearch">
            <AppIcon name="search" :size="18" />
          </button>
        </div>

        <div class="dsh-workspace-list" :class="{ 'dsh-workspace-list-quiet': !hasSearchResults }">
          <div v-if="hasSearchResults" class="dsh-workspace-empty">{{ copy.noMatches }}</div>
          <div v-else class="dsh-workspace-empty">{{ copy.noSessions }}</div>
        </div>
      </section>
    </div>

    <div class="dsh-sidebar-footer">
      <button class="dsh-sidebar-settings" type="button" :aria-label="copy.settings" @click="emit('openSettings')">
        <AppIcon name="settings" :size="16" />
        <span v-if="!props.collapsed">{{ copy.settings }}</span>
      </button>
    </div>
  </aside>
</template>
