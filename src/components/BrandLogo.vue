<script setup lang='ts'>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import brandLogoDarkUrl from '../assets/brand/logo-dark.png'
import brandLogoLightUrl from '../assets/brand/logo-light.png'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    size?: number | string
  }>(),
  {
    size: 16,
  },
)

const isDark = ref(false)
const logoUrl = computed(() => (isDark.value ? brandLogoDarkUrl : brandLogoLightUrl))
let themeObserver: MutationObserver | undefined

function updateTheme() {
  isDark.value = document.documentElement.dataset.theme !== 'light'
}

onMounted(() => {
  updateTheme()
  themeObserver = new MutationObserver(updateTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
})

onBeforeUnmount(() => {
  themeObserver?.disconnect()
})
</script>

<template>
  <img
    v-bind='$attrs'
    class='brand-logo'
    :src='logoUrl'
    alt=''
    aria-hidden='true'
    :width='props.size'
    :height='props.size'
    draggable='false'
  />
</template>
