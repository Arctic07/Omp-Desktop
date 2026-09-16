<script setup lang="ts">
import { AppIcon } from './icons'

defineProps<{
  title: string
  description?: string
  compact?: boolean
}>()
</script>

<template>
  <section class="page-card page-empty" :class="{ 'page-empty-compact': compact }" :aria-label="title">
    <div class="page-empty-icon" aria-hidden="true">
      <slot name="icon">
        <AppIcon name="info" :size="20" aria-hidden="true" />
      </slot>
    </div>
    <h2 class="page-empty-title">{{ title }}</h2>
    <p v-if="description" class="page-empty-description">{{ description }}</p>
    <div v-if="$slots.action" class="page-empty-action">
      <slot name="action" />
    </div>
  </section>
</template>
