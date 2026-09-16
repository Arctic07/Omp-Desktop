<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <div class="settings-row">
    <div class="settings-row-copy">
      <div class="settings-row-title">{{ title }}</div>
      <p v-if="description" class="settings-row-desc settings-row-description">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.default" class="settings-row-control">
      <slot />
    </div>
  </div>
</template>
