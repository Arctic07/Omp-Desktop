<script setup lang="ts">
import logoUrl from '../../src-tauri/icons/logo.svg'

withDefaults(
  defineProps<{
    size?: number
  }>(),
  { size: 24 },
)
</script>

<template>
  <img
    class="dsh-fish-logo"
    :src="logoUrl"
    :width="size"
    :height="size"
    alt=""
    aria-hidden="true"
  />
</template>

