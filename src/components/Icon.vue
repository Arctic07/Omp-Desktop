<script setup lang='ts'>
import { computed, useAttrs } from 'vue'

import { ICON_DEFINITIONS, scaledIconSize, type AppIconProps } from './icons'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<AppIconProps>(), {
  size: 16,
  strokeWidth: 1.75,
})
const attrs = useAttrs()

const definition = computed(() => ICON_DEFINITIONS[props.name])
const scaledSize = computed(() => scaledIconSize(props.size))
const numericSize = computed(() => (typeof props.size === 'number' && Number.isFinite(props.size) ? props.size : 16))
const fillColor = computed(() => props.fill ?? 'none')
const strokeColor = computed(() => props.stroke ?? 'currentColor')
const ariaHidden = computed<boolean | undefined>(() => {
  const explicit = attrs['aria-hidden']
  if (explicit === true || explicit === 'true') return true
  if (explicit === false || explicit === 'false') return false
  return props.title ? undefined : true
})
const ariaLabel = computed<string | undefined>(() => {
  const explicit = attrs['aria-label']
  return typeof explicit === 'string' ? explicit : props.title
})
const role = computed<string | undefined>(() => {
  const explicit = attrs.role
  return typeof explicit === 'string' ? explicit : props.title ? 'img' : undefined
})
</script>

<template>
  <svg
    v-bind='$attrs'
    :width='numericSize'
    :height='numericSize'
    :style='{ width: scaledSize, height: scaledSize }'
    viewBox='0 0 24 24'
    :fill='fillColor'
    :stroke='strokeColor'
    :stroke-width='props.strokeWidth'
    stroke-linecap='round'
    stroke-linejoin='round'
    xmlns='http://www.w3.org/2000/svg'
    focusable='false'
    :aria-hidden='ariaHidden'
    :aria-label='ariaLabel'
    :role='role'
  >
    <title v-if='props.title'>{{ props.title }}</title>
    <component
      :is='node[0]'
      v-for='(node, index) in definition'
      :key='`${node[0]}-${index}`'
      v-bind='node[1]'
    />
  </svg>
</template>
