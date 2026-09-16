<script setup lang="ts">
import { computed, ref } from 'vue'

import { getSourceCopy } from '../i18n'

const copy = getSourceCopy()

const props = defineProps<{
  disabled?: boolean
  workspaceTrigger?: boolean
}>()

const emit = defineEmits<{
  requestWorkspace: []
}>()

const draft = ref('')
const focused = ref(false)
const canSend = computed(() => draft.value.trim().length > 0 && !props.disabled)

function requestWorkspace() {
  if (props.workspaceTrigger) emit('requestWorkspace')
}

function updateDraft(event: Event) {
  const target = event.currentTarget
  if (target instanceof HTMLElement) draft.value = target.innerText
}

function submit() {
  if (!canSend.value) return
  draft.value = ''
}

</script>

<template>
  <div class="dsh-composer" :class="{ 'dsh-composer-disabled': props.disabled, 'dsh-composer-trigger': props.workspaceTrigger }" data-composer-card @click="requestWorkspace">
    <div class="dsh-composer-scroll">
      <div
        class="dsh-composer-input"
        :class="{ 'dsh-composer-input-disabled': props.disabled, 'dsh-composer-input-focused': focused }"
        :contenteditable="!props.disabled"
        role="textbox"
        aria-multiline="true"
        :aria-label="props.workspaceTrigger ? copy.chooseWorkspace : copy.messagePlaceholder"
        :aria-disabled="props.disabled"
        @focus="focused = true"
        @blur="focused = false"
        @input="updateDraft"
        @keydown.enter.exact.prevent="submit"
        @click.stop
      >
        <span v-if="draft.length === 0" class="dsh-composer-placeholder">{{ copy.composerPlaceholder }}</span>
      </div>
    </div>
    <div class="dsh-composer-row">
      <div class="dsh-composer-tools">
        <button class="dsh-composer-add" type="button" :aria-label="copy.addFiles" :disabled="props.disabled" @click.stop>
          <AppIcon name="plus" :size="14" />
        </button>
        <div v-if="!props.disabled" class="dsh-composer-modes">
          <button class="dsh-composer-select" type="button" disabled>Plan</button>
          <button class="dsh-composer-select" type="button" disabled>Read-only</button>
        </div>
      </div>
      <div class="dsh-composer-trailing">
        <button v-if="!props.disabled" class="dsh-composer-select dsh-composer-model" type="button" disabled>Model</button>
        <button class="dsh-composer-send" type="button" :aria-label="copy.sendMessage" :disabled="!canSend" @click.stop="submit">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 2.10714 6.51277 1.85793 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
