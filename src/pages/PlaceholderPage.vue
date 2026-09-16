<script setup lang="ts">
import { Card, Empty } from '@arco-design/web-vue'

defineProps<{
  title: string
  description: string
}>()
</script>

<template>
  <section class="page-shell placeholder-page" :aria-labelledby="`${title}-title`">
    <Card class="placeholder-card" :bordered="false">
      <h1 :id="`${title}-title`" class="page-title">{{ title }}</h1>
      <p class="page-description">{{ description }}</p>
      <Empty description="功能占位中" />
    </Card>
  </section>
</template>
