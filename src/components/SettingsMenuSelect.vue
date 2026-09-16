<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './icons'

export type SettingsMenuSelectOption = {
  id: string
  label: string
  disabled?: boolean
}

type MenuPosition = {
  top: number
  left: number
}

const props = defineProps<{
  modelValue: string
  options: readonly SettingsMenuSelectOption[]
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const optionRefs = new Map<string, HTMLButtonElement>()
const open = ref(false)
const activeId = ref(props.modelValue)
const position = ref<MenuPosition | null>(null)
let positionFrame: number | null = null

const current = computed(() => props.options.find((option) => option.id === props.modelValue))
const selectable = computed(() => props.options.filter((option) => !option.disabled))
const menuStyle = computed(() => {
  if (!position.value) return undefined
  return {
    top: `${position.value.top}px`,
    left: `${position.value.left}px`,
  }
})

function setOptionRef(id: string, element: unknown) {
  if (element instanceof HTMLButtonElement) optionRefs.set(id, element)
  else optionRefs.delete(id)
}

function focusOption(id: string) {
  activeId.value = id
  nextTick(() => {
    optionRefs.get(id)?.focus()
    optionRefs.get(id)?.scrollIntoView({ block: 'nearest' })
  })
}

function focusInitialOption() {
  const selected = selectable.value.find((option) => option.id === props.modelValue)
  const first = selected ?? selectable.value[0]
  if (first) focusOption(first.id)
}

function updatePosition() {
  const trigger = triggerRef.value
  const menu = menuRef.value
  if (!trigger || !menu) return

  const triggerRect = trigger.getBoundingClientRect()
  if (triggerRect.bottom <= 0 || triggerRect.top >= window.innerHeight) {
    close(false)
    return
  }

  const menuRect = menu.getBoundingClientRect()
  const margin = 8
  const gap = 6
  const maxLeft = Math.max(margin, window.innerWidth - menuRect.width - margin)
  const preferredLeft = triggerRect.right - menuRect.width
  const left = Math.min(Math.max(margin, preferredLeft), maxLeft)
  const below = triggerRect.bottom + gap
  const above = triggerRect.top - menuRect.height - gap
  const maxTop = Math.max(margin, window.innerHeight - menuRect.height - margin)
  const preferredFits = below >= margin && below <= maxTop
  const fallbackFits = above >= margin && above <= maxTop
  const top = preferredFits
    ? below
    : fallbackFits
      ? above
      : Math.min(Math.max(margin, below), maxTop)

  const previous = position.value
  if (!previous || previous.top !== top || previous.left !== left) {
    position.value = { top, left }
  }
}

function schedulePositionUpdate() {
  if (positionFrame !== null) window.cancelAnimationFrame(positionFrame)
  positionFrame = window.requestAnimationFrame(() => {
    positionFrame = null
    updatePosition()
  })
}

function openMenu() {
  if (open.value) return
  activeId.value = props.modelValue
  open.value = true
  nextTick(() => {
    updatePosition()
    schedulePositionUpdate()
    window.requestAnimationFrame(() => {
      if (open.value && position.value) focusInitialOption()
    })
  })
}

function close(restoreFocus = true) {
  if (!open.value) return
  open.value = false
  position.value = null
  if (restoreFocus) nextTick(() => triggerRef.value?.focus())
}

function toggleMenu() {
  if (open.value) close()
  else openMenu()
}

function choose(option: SettingsMenuSelectOption) {
  if (option.disabled) return
  close()
  if (option.id !== props.modelValue) emit('update:modelValue', option.id)
}

function moveActive(delta: number) {
  if (selectable.value.length === 0) return
  const index = selectable.value.findIndex((option) => option.id === activeId.value)
  const nextIndex = index === -1
    ? delta > 0 ? 0 : selectable.value.length - 1
    : (index + delta + selectable.value.length) % selectable.value.length
  const option = selectable.value[nextIndex]
  if (option) focusOption(option.id)
}

function moveToEdge(end: boolean) {
  const option = end ? selectable.value[selectable.value.length - 1] : selectable.value[0]
  if (option) focusOption(option.id)
}

function handleTriggerKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
  event.preventDefault()
  if (!open.value) openMenu()
}

function handleMenuKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(event.key === 'ArrowDown' ? 1 : -1)
    return
  }
  if (event.key === 'Home' || event.key === 'End') {
    event.preventDefault()
    moveToEdge(event.key === 'End')
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    const option = props.options.find((entry) => entry.id === activeId.value)
    if (option) choose(option)
  }
}

watch(
  () => props.modelValue,
  (value) => {
    if (!open.value) activeId.value = value
  },
)

watch(
  open,
  (isOpen, _wasOpen, onCleanup) => {
    if (!isOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (rootRef.value?.contains(target) || menuRef.value?.contains(target)) return
      close(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      close()
    }
    const onViewportChange = (event: Event) => {
      const target = event.target
      if (target instanceof Node && menuRef.value?.contains(target)) return
      schedulePositionUpdate()
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    onCleanup(() => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    })

  },
)

onBeforeUnmount(() => {
  if (positionFrame !== null) window.cancelAnimationFrame(positionFrame)
})
</script>

<template>
  <div ref="rootRef" class="settings-menu-select-anchor">
    <button
      ref="triggerRef"
      type="button"
      class="settings-menu-select-trigger"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-label="label"
      @click="toggleMenu"
      @keydown="handleTriggerKeydown"
    >
      <span class="settings-menu-select-trigger-label">{{ current?.label ?? modelValue }}</span>
      <AppIcon name="chevron-down" :size="14" aria-hidden="true" />
    </button>

    <Teleport to="body">
      <div
        v-if="open"
        ref="menuRef"
        class="settings-menu-select-menu"
        :class="{ 'is-open': position }"
        :style="menuStyle"
        role="listbox"
        :aria-label="label"
        @keydown="handleMenuKeydown"
      >
        <div class="settings-menu-select-results">
          <ul class="settings-menu-select-list">
            <li v-for="option in options" :key="option.id">
              <button
                :ref="(element) => setOptionRef(option.id, element)"
                type="button"
                role="option"
                :tabindex="-1"
                :aria-selected="option.id === modelValue"
                :disabled="option.disabled"
                class="settings-menu-select-option"
                :class="{ 'is-current': option.id === modelValue, 'is-active': option.id === activeId }"
                @mouseenter="activeId = option.id"
                @focus="activeId = option.id"
                @click="choose(option)"
              >
                <span class="settings-menu-select-option-label">{{ option.label }}</span>
                <AppIcon v-if="option.id === modelValue" name="check" :size="14" class="settings-menu-select-check" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </div>
      </div>
    </Teleport>
  </div>
</template>
