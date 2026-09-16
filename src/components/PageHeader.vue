<script setup lang="ts">
import { computed } from 'vue'

type PageHeaderProps = {
  title: string
  description?: string
  headingId?: string
}

const props = defineProps<PageHeaderProps>()
const titleId = computed(() => props.headingId ?? 'page-title')
</script>

<template>
  <header class="page-header" :aria-labelledby="titleId">
    <div class="page-header-copy">
      <h1 :id="titleId" class="page-title">{{ title }}</h1>
      <p v-if="description" class="page-description">
        {{ description }}
      </p>
    </div>
    <div v-if="$slots.default" class="page-header-actions">
      <slot />
    </div>
  </header>
</template>
