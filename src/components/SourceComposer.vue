<script setup lang="ts">
import { computed, ref } from 'vue'

import type { SourceThinkingLevel } from '../i18n'
import { useAppSettings } from '../stores/appSettings'
import { AppIcon } from './icons'

const { copy } = useAppSettings()

const modelGroups = [
  {
    provider: 'DeepSeek',
    models: [
      { id: 'deepseek-v41-flash', name: 'DeepSeek-V41-Flash', provider: 'DeepSeek' },
      { id: 'deepseek-v4-flash', name: 'DeepSeek-V4-Flash', provider: 'DeepSeek' },
      { id: 'deepseek-v4-pro', name: 'DeepSeek-V4-Pro', provider: 'DeepSeek' },
      { id: 'deepseek-v4-flash-vision-exp', name: 'DeepSeek-V4-Flash-Vision-Exp', provider: 'DeepSeek' },
    ],
  },
  {
    provider: 'command',
    models: [
      { id: 'gpt-5.6-luna', name: 'gpt-5.6-luna', provider: 'command' },
      { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'command' },
      { id: 'claude-sonnet-4.6', name: 'Claude Sonnet 4.6', provider: 'command' },
      { id: 'claude-fable-5', name: 'Claude Fable 5', provider: 'command' },
    ],
  },
] as const

const modelOptions = modelGroups.flatMap((group) => group.models)
type ModelId = typeof modelGroups[number]['models'][number]['id']
type ModelMenuPane = 'root' | 'model' | 'thinking'

const props = defineProps<{
  disabled?: boolean
  workspaceTrigger?: boolean
}>()

const emit = defineEmits<{
  requestWorkspace: []
}>()

const draft = ref('')
const focused = ref(false)
const modelMenuOpen = ref(false)
const modelMenuPane = ref<ModelMenuPane>('root')
const selectedModelId = ref<ModelId>('gpt-5.6-luna')
const selectedThinkingId = ref<SourceThinkingLevel>('high')
const canSend = computed(() => draft.value.trim().length > 0 && !props.disabled)
const selectedModel = computed(() => modelOptions.find((model) => model.id === selectedModelId.value) ?? modelOptions[0])
const selectedThinking = computed(() =>
  copy.value.thinkingOptions.find((option) => option.value === selectedThinkingId.value) ?? copy.value.thinkingOptions[0],
)

function requestWorkspace() {
  if (props.workspaceTrigger) emit('requestWorkspace')
}

function updateDraft(event: Event) {
  const target = event.currentTarget
  if (target instanceof HTMLElement) draft.value = target.innerText
}

function openModelMenu() {
  modelMenuOpen.value = true
  modelMenuPane.value = 'root'
}

function closeModelMenu() {
  modelMenuOpen.value = false
  modelMenuPane.value = 'root'
}

function toggleModelMenu() {
  if (modelMenuOpen.value) closeModelMenu()
  else openModelMenu()
}

function enterModelPane(pane: Exclude<ModelMenuPane, 'root'>) {
  modelMenuPane.value = pane
}

function selectModel(id: ModelId) {
  const model = modelOptions.find((option) => option.id === id)
  if (model !== undefined) selectedModelId.value = model.id
  closeModelMenu()
}

function selectThinking(id: SourceThinkingLevel) {
  const option = copy.value.thinkingOptions.find((choice) => choice.value === id)
  if (option !== undefined) selectedThinkingId.value = option.value
  closeModelMenu()
}

function submit() {
  if (!canSend.value) return
  draft.value = ''
}
</script>

<template>
  <div class="omp-composer" :class="{ 'omp-composer-disabled': props.disabled, 'omp-composer-trigger': props.workspaceTrigger }" data-composer-card @click="requestWorkspace">
    <div class="omp-composer-scroll">
      <div
        class="omp-composer-input"
        :class="{ 'omp-composer-input-disabled': props.disabled, 'omp-composer-input-focused': focused }"
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
        <span v-if="draft.length === 0" class="omp-composer-placeholder">{{ props.workspaceTrigger ? copy.composerPlaceholder : copy.messagePlaceholder }}</span>
      </div>
    </div>
    <div class="omp-composer-row">
      <div class="omp-composer-tools">
        <button class="omp-composer-add" type="button" :aria-label="copy.addFiles" :disabled="props.disabled" @click.stop>
          <AppIcon name="plus" :size="14" />
        </button>
      </div>
      <div class="omp-composer-trailing">
        <div v-if="!props.disabled" class="omp-composer-model-picker">
          <button
            class="omp-composer-select omp-composer-model"
            type="button"
            aria-haspopup="menu"
            :aria-expanded="modelMenuOpen"
            :aria-label="selectedModel.name"
            :title="selectedModel.name"
            @click.stop="toggleModelMenu"
            @keydown.esc.stop="closeModelMenu"
          >
            <span class="omp-composer-model-name">{{ selectedModel.name }}</span>
            <AppIcon name="chevron-down" :class="{ 'omp-composer-model-chevron-open': modelMenuOpen }" :size="12" />
          </button>
          <div
            v-if="modelMenuOpen"
            class="omp-composer-model-menu"
            role="menu"
            :aria-label="modelMenuPane === 'thinking' ? copy.thinkingLabel : copy.modelLabel"
            @click.stop
            @keydown.esc.stop="closeModelMenu"
          >
            <div v-if="modelMenuPane === 'root'" class="omp-composer-model-menu-root">
              <button
                class="omp-composer-model-menu-cell"
                type="button"
                role="menuitem"
                :aria-label="`${copy.modelLabel}: ${selectedModel.name}`"
                @click="enterModelPane('model')"
              >
                <span class="omp-composer-model-menu-cell-copy">
                  <strong>{{ copy.modelLabel }}</strong>
                  <span>{{ selectedModel.name }}</span>
                </span>
                <AppIcon name="chevron-right" :size="14" />
              </button>
              <button
                class="omp-composer-model-menu-cell"
                type="button"
                role="menuitem"
                :aria-label="`${copy.thinkingLabel}: ${selectedThinking.label}`"
                @click="enterModelPane('thinking')"
              >
                <span class="omp-composer-model-menu-cell-copy">
                  <strong>{{ copy.thinkingLabel }}</strong>
                  <span>{{ selectedThinking.label }}</span>
                </span>
                <AppIcon name="chevron-right" :size="14" />
              </button>
            </div>
            <div v-else-if="modelMenuPane === 'model'" class="omp-composer-model-menu-groups" :aria-label="copy.modelLabel">
              <div v-for="group in modelGroups" :key="group.provider" class="omp-composer-model-menu-group" role="group" :aria-label="group.provider">
                <div class="omp-composer-model-menu-group-title">{{ group.provider }}</div>
                <button
                  v-for="model in group.models"
                  :key="model.id"
                  class="omp-composer-model-option"
                  :class="{ 'omp-composer-model-option-active': model.id === selectedModelId }"
                  type="button"
                  role="menuitemradio"
                  :aria-checked="model.id === selectedModelId"
                  @click="selectModel(model.id)"
                >
                  <span class="omp-composer-model-option-copy">
                    <strong>{{ model.name }}</strong>
                  </span>
                  <AppIcon v-if="model.id === selectedModelId" name="check" :size="14" />
                </button>
              </div>
            </div>
            <div v-else class="omp-composer-model-menu-thinking" role="group" :aria-label="copy.thinkingLabel">
              <button
                v-for="option in copy.thinkingOptions"
                :key="option.value"
                class="omp-composer-model-option"
                :class="{ 'omp-composer-model-option-active': option.value === selectedThinkingId }"
                type="button"
                role="menuitemradio"
                :aria-checked="option.value === selectedThinkingId"
                @click="selectThinking(option.value)"
              >
                <span class="omp-composer-model-option-copy">
                  <strong>{{ option.label }}</strong>
                </span>
                <AppIcon v-if="option.value === selectedThinkingId" name="check" :size="14" />
              </button>
            </div>
          </div>
        </div>
        <button class="omp-composer-send" type="button" :aria-label="copy.sendMessage" :disabled="!canSend" @click.stop="submit">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <path d="M8.3125 0.980183C8.66767 1.0531 8.97902 1.20418 9.2627 1.43233C9.48724 1.61297 9.73029 1.85793 9.97949 2.10714L14.707 6.83468L13.293 8.24874L9 3.95577V15.0417H7V3.95577L2.70703 8.24874L1.29297 6.83468L6.02051 2.10714C6.26971 2.10714 6.51277 1.85793 6.7373 1.43233C6.97662 1.23986 7.28445 1.04402 7.6875 0.980183C7.8973 0.947006 8.1031 0.95516 8.3125 0.980183Z" fill="currentColor" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
