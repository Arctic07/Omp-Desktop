<script setup lang="ts">
import { computed, ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'

const { copy } = useAppSettings()

const modelOptions = [
  { id: 'gpt-5.6-luna', name: 'GPT-5.6 Luna Default', provider: 'OpenAI' },
  { id: 'deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'DeepSeek' },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic' },
] as const

type ModelId = typeof modelOptions[number]['id']

const props = defineProps<{
  disabled?: boolean
  workspaceTrigger?: boolean
}>()

const emit = defineEmits<{
  requestWorkspace: []
}>()

const draft = ref('')
const focused = ref(false)
const planActive = ref(false)
const modelMenuOpen = ref(false)
const selectedModelId = ref<ModelId>(modelOptions[0].id)
const canSend = computed(() => draft.value.trim().length > 0 && !props.disabled)
const selectedModel = computed(() => modelOptions.find((model) => model.id === selectedModelId.value) ?? modelOptions[0])

function requestWorkspace() {
  if (props.workspaceTrigger) emit('requestWorkspace')
}

function updateDraft(event: Event) {
  const target = event.currentTarget
  if (target instanceof HTMLElement) draft.value = target.innerText
}

function selectModel(id: string) {
  const model = modelOptions.find((option) => option.id === id)
  if (model !== undefined) selectedModelId.value = model.id
  modelMenuOpen.value = false
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
        <span v-if="draft.length === 0" class="dsh-composer-placeholder">{{ props.workspaceTrigger ? copy.composerPlaceholder : copy.messagePlaceholder }}</span>
      </div>
    </div>
    <div class="dsh-composer-row">
      <div class="dsh-composer-tools">
        <button class="dsh-composer-add" type="button" :aria-label="copy.addFiles" :disabled="props.disabled" @click.stop>
          <AppIcon name="plus" :size="14" />
        </button>
        <div v-if="!props.disabled" class="dsh-composer-modes">
          <button
            class="dsh-composer-select dsh-composer-plan"
            :class="{ 'dsh-composer-select-active': planActive }"
            type="button"
            :aria-pressed="planActive"
            @click.stop="planActive = !planActive"
          >
            {{ copy.planMode }}
          </button>
        </div>
      </div>
      <div class="dsh-composer-trailing">
        <div v-if="!props.disabled" class="dsh-composer-model-picker">
          <button
            class="dsh-composer-select dsh-composer-model"
            type="button"
            aria-haspopup="listbox"
            :aria-expanded="modelMenuOpen"
            :aria-label="copy.modelLabel"
            @click.stop="modelMenuOpen = !modelMenuOpen"
            @keydown.esc="modelMenuOpen = false"
          >
            <span class="dsh-composer-model-name">{{ selectedModel.name }}</span>
            <AppIcon name="chevron-down" :size="12" />
          </button>
          <div v-if="modelMenuOpen" class="dsh-composer-model-menu" role="listbox" :aria-label="copy.modelLabel" @click.stop>
            <button
              v-for="model in modelOptions"
              :key="model.id"
              class="dsh-composer-model-option"
              :class="{ 'dsh-composer-model-option-active': model.id === selectedModelId }"
              type="button"
              role="option"
              :aria-selected="model.id === selectedModelId"
              @click="selectModel(model.id)"
            >
              <span class="dsh-composer-model-option-copy">
                <strong>{{ model.name }}</strong>
                <small>{{ model.provider }}</small>
              </span>
              <AppIcon v-if="model.id === selectedModelId" name="check" :size="14" />
            </button>
          </div>
        </div>
        <button class="dsh-composer-send" type="button" :aria-label="copy.sendMessage" :disabled="!canSend" @click.stop="submit">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 2.10714 6.51277 1.85793 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
