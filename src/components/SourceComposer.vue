<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import type { SourceThinkingLevel } from '../i18n'
import { useDesktopFileDrop, type DesktopDropPath } from '../composables/useDesktopFileDrop'
import { useAppSettings } from '../stores/appSettings'
import type { ConversationSubmitRequest } from '../utils/conversationTypes'
import { chooseFiles as chooseFilesFromDialog } from '../utils/desktopApi'
import { AppIcon } from './icons'

interface SourceModel {
  id: string
  name: string
  provider: string
}

interface SourceModelGroup {
  provider: string
  models: readonly SourceModel[]
}

const modelGroups: readonly SourceModelGroup[] = [
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
]

const modelOptions: readonly SourceModel[] = modelGroups.flatMap((group) => group.models)
type ModelId = string
type ModelMenuPane = 'root' | 'model' | 'thinking'

interface ComposerAttachment {
  path: string
  name: string
}

const props = defineProps<{
  disabled?: boolean
  workspaceTrigger?: boolean
}>()

const emit = defineEmits<{
  'request-workspace': []
  submit: [request: ConversationSubmitRequest]
}>()

const { copy } = useAppSettings()
const draft = ref('')
const focused = ref(false)
const modelMenuOpen = ref(false)
const modelMenuPane = ref<ModelMenuPane>('root')
const selectedModelId = ref<ModelId>('gpt-5.6-luna')
const selectedThinkingId = ref<SourceThinkingLevel>('high')
const attachments = ref<ComposerAttachment[]>([])
const dropNotice = ref('')
const composerCard = ref<HTMLDivElement | null>(null)
const composerInput = ref<HTMLDivElement | null>(null)
const canSend = computed<boolean>(() => (
  (draft.value.trim().length > 0 || attachments.value.length > 0) && props.disabled !== true
))
const selectedModel = computed<SourceModel>(() => (
  modelOptions.find((model) => model.id === selectedModelId.value) ?? modelOptions[0]!
))
const attachmentLabel = computed<string>(() => (
  copy.value.attachedFiles.replace('{count}', String(attachments.value.length))
))
const selectedThinking = computed(() => (
  copy.value.thinkingOptions.find((option) => option.value === selectedThinkingId.value) ?? copy.value.thinkingOptions[0]
))

function attachmentKey(path: string): string {
  return path.replaceAll('\\', '/').replace(/\/+$/, '').toLocaleLowerCase()
}

function attachmentName(path: string): string {
  const normalized = path.replaceAll('\\', '/')
  return normalized.slice(normalized.lastIndexOf('/') + 1) || normalized
}

function isDirectoryPath(path: string): boolean {
  const trimmed = path.trim()
  return trimmed === '.' || trimmed === '..' || trimmed.endsWith('/') || trimmed.endsWith('\\')
}

function requestWorkspace(): void {
  if (props.workspaceTrigger === true) {
    emit('request-workspace')
  }
}

function updateDraft(event: Event): void {
  const target = event.currentTarget
  if (target instanceof HTMLElement) {
    draft.value = target.innerText
  }
}

function openModelMenu(): void {
  modelMenuOpen.value = true
  modelMenuPane.value = 'root'
}

function closeModelMenu(): void {
  modelMenuOpen.value = false
  modelMenuPane.value = 'root'
}

function toggleModelMenu(): void {
  if (modelMenuOpen.value) {
    closeModelMenu()
  } else {
    openModelMenu()
  }
}

function enterModelPane(pane: Exclude<ModelMenuPane, 'root'>): void {
  modelMenuPane.value = pane
}

function selectModel(id: ModelId): void {
  const model = modelOptions.find((option) => option.id === id)
  if (model !== undefined) {
    selectedModelId.value = model.id
  }
  closeModelMenu()
}

function selectThinking(id: SourceThinkingLevel): void {
  const option = copy.value.thinkingOptions.find((choice) => choice.value === id)
  if (option !== undefined) {
    selectedThinkingId.value = option.value
  }
  closeModelMenu()
}

function removeAttachment(path: string): void {
  const key = attachmentKey(path)
  attachments.value = attachments.value.filter((attachment) => attachmentKey(attachment.path) !== key)
}

function addAttachmentPaths(paths: readonly DesktopDropPath[]): void {
  if (props.disabled === true) {
    return
  }

  const nextAttachments = [...attachments.value]
  const seen = new Set(nextAttachments.map((attachment) => attachmentKey(attachment.path)))
  let skippedDirectory = false
  for (const item of paths) {
    const path = item.path.trim()
    if (path.length === 0) {
      continue
    }
    if (item.kind === 'directory' || isDirectoryPath(path)) {
      skippedDirectory = true
      continue
    }
    const key = attachmentKey(path)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    nextAttachments.push({ path, name: attachmentName(path) })
  }
  attachments.value = nextAttachments
  dropNotice.value = skippedDirectory ? copy.value.droppedDirectory : ''
}

function handleDesktopDragOver(event: DragEvent): void {
  if (props.disabled !== true) {
    handleDragOver(event)
  }
}

function handleDesktopDrop(event: DragEvent): void {
  if (props.disabled !== true) {
    handleDrop(event)
  }
}

function handleDroppedPaths(paths: readonly DesktopDropPath[]): void {
  addAttachmentPaths(paths)
}

const { dragging, handleDragOver, handleDrop, handleDragLeave } = useDesktopFileDrop(composerCard, handleDroppedPaths)

async function selectFiles(): Promise<void> {
  if (props.disabled === true) {
    return
  }
  try {
    const selectedPaths = await chooseFilesFromDialog(copy.value.chooseFiles)
    addAttachmentPaths(selectedPaths.map((path) => ({ path, kind: 'file' })))
  } catch {
    return
  }
}

function clearComposerInput(): void {
  if (composerInput.value !== null) {
    composerInput.value.textContent = ''
  }
  draft.value = ''
  attachments.value = []
  dropNotice.value = ''
}

function submit(): void {
  if (!canSend.value) {
    return
  }
  emit('submit', {
    text: draft.value.trim(),
    paths: attachments.value.map((attachment) => attachment.path),
    modelId: selectedModelId.value,
    thinkingLevel: selectedThinkingId.value,
  })
  clearComposerInput()
  void nextTick(() => composerInput.value?.focus())
}
</script>

<template>
  <div
    ref="composerCard"
    class="omp-composer"
    :class="{
      'omp-composer-disabled': props.disabled,
      'omp-composer-trigger': props.workspaceTrigger,
      'omp-composer-drop-active': dragging,
    }"
    data-composer-card
    @click="requestWorkspace"
    @dragover="handleDesktopDragOver"
    @drop="handleDesktopDrop"
    @dragleave="handleDragLeave"
  >
    <div v-if="dragging" class="omp-composer-drop-overlay" aria-live="polite">{{ copy.dropFilesHere }}</div>
    <div class="omp-composer-scroll">
      <div v-if="attachments.length > 0" class="omp-composer-attachments" role="list" :aria-label="attachmentLabel">
        <div v-for="attachment in attachments" :key="attachmentKey(attachment.path)" class="omp-composer-attachment" role="listitem">
          <AppIcon name="file-text" :size="15" aria-hidden="true" />
          <span class="omp-composer-attachment-copy" :title="attachment.path">{{ attachment.name }}</span>
          <button
            class="omp-composer-attachment-remove"
            type="button"
            :aria-label="`${copy.removeAttachment}: ${attachment.name}`"
            @click.stop="removeAttachment(attachment.path)"
          >
            <AppIcon name="x" :size="13" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p v-if="dropNotice" class="omp-composer-drop-notice" role="status">{{ dropNotice }}</p>
      <div
        ref="composerInput"
        class="omp-composer-input"
        :class="{ 'omp-composer-input-disabled': props.disabled, 'omp-composer-input-focused': focused }"
        :contenteditable="props.disabled !== true"
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
        <span v-if="draft.length === 0" class="omp-composer-placeholder">
          {{ props.workspaceTrigger ? copy.composerPlaceholder : copy.messagePlaceholder }}
        </span>
      </div>
    </div>
    <div class="omp-composer-row">
      <div class="omp-composer-tools">
        <button class="omp-composer-add" type="button" :aria-label="copy.addFiles" :disabled="props.disabled" @click.stop="selectFiles">
          <AppIcon name="plus" :size="14" aria-hidden="true" />
        </button>
        <span v-if="attachments.length > 0" class="omp-composer-attachment-count" aria-hidden="true">{{ attachments.length }}</span>
      </div>
      <div class="omp-composer-trailing">
        <div v-if="props.disabled !== true" class="omp-composer-model-picker">
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
            <AppIcon name="chevron-down" :class="{ 'omp-composer-model-chevron-open': modelMenuOpen }" :size="12" aria-hidden="true" />
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
              <button class="omp-composer-model-menu-cell" type="button" role="menuitem" :aria-label="`${copy.modelLabel}: ${selectedModel.name}`" @click="enterModelPane('model')">
                <span class="omp-composer-model-menu-cell-copy"><strong>{{ copy.modelLabel }}</strong><span>{{ selectedModel.name }}</span></span>
                <AppIcon name="chevron-right" :size="14" aria-hidden="true" />
              </button>
              <button class="omp-composer-model-menu-cell" type="button" role="menuitem" :aria-label="`${copy.thinkingLabel}: ${selectedThinking.label}`" @click="enterModelPane('thinking')">
                <span class="omp-composer-model-menu-cell-copy"><strong>{{ copy.thinkingLabel }}</strong><span>{{ selectedThinking.label }}</span></span>
                <AppIcon name="chevron-right" :size="14" aria-hidden="true" />
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
                  <span class="omp-composer-model-option-copy"><strong>{{ model.name }}</strong></span>
                  <AppIcon v-if="model.id === selectedModelId" name="check" :size="14" aria-hidden="true" />
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
                <span class="omp-composer-model-option-copy"><strong>{{ option.label }}</strong></span>
                <AppIcon v-if="option.value === selectedThinkingId" name="check" :size="14" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
        <button class="omp-composer-send" type="button" :aria-label="copy.sendMessage" :disabled="!canSend" @click.stop="submit">
          <AppIcon name="send" :size="16" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
