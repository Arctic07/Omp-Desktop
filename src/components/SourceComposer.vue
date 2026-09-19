<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  type CSSProperties,
} from 'vue'

import type { SourceThinkingLevel } from '../i18n'
import { useComposerAttachments } from '../composables/useComposerAttachments'
import {
  useDesktopFileDrop,
  type DesktopDropPath,
  type DesktopDropPoint,
} from '../composables/useDesktopFileDrop'
import { useAppSettings } from '../stores/appSettings'
import {
  clipboardAttachmentFiles,
  isAbsolutePath,
  preferClipboardText,
  type ComposerAttachment,
} from '../utils/composerAttachments'
import {
  composerIndexAtPoint,
  composerSelectionRange,
  paintComposerContent,
  placeComposerCaret,
  readComposerDraft,
  type ComposerChipActions,
} from '../utils/composerEditor'
import type { ConversationSubmitRequest } from '../utils/conversationTypes'
import {
  composerClipboardSegmentsFromTransfer,
  writeComposerClipboard,
  type ComposerClipboardSegment,
} from '../utils/composerClipboard'
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

interface PendingInsert {
  start: number
  end: number
}

const props = defineProps<{
  disabled?: boolean
  workspaceTrigger?: boolean
  sessionId?: string | null
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
const composerCard = ref<HTMLDivElement | null>(null)
const composerInput = ref<HTMLDivElement | null>(null)
const attachmentsState = useComposerAttachments({
  sessionId: () => props.sessionId ?? null,
  blocked: () => props.disabled === true,
})
const {
  attachments,
  busy: attaching,
  notice,
  attachmentCount,
  removeLabelFor,
  addClipboardFiles,
  addPaths,
  removeAttachment,
  syncDraft,
  reset: resetAttachments,
} = attachmentsState

let pendingInsert: PendingInsert | null = null
/** Last caret seen inside the editable; a native drop carries no selection. */
let rememberedCaret = 0

const chipActions: ComposerChipActions = { removeLabelFor, onRemove: handleChipRemove }
const canSend = computed<boolean>(() => (
  (draft.value.trim().length > 0 || attachments.value.length > 0)
  && props.disabled !== true
  && !attaching.value
))
const selectedModel = computed<SourceModel>(() => (
  modelOptions.find((model) => model.id === selectedModelId.value) ?? modelOptions[0]!
))
const attachmentLabel = computed<string>(() => (
  copy.value.attachedFiles.replace('{count}', String(attachmentCount.value))
))
const selectedThinking = computed(() => (
  copy.value.thinkingOptions.find((option) => option.value === selectedThinkingId.value) ?? copy.value.thinkingOptions[0]
))
const contextUsagePercent = ref<number>(0)
const contextRingRadius = 8
const contextRingCircumference = 2 * Math.PI * contextRingRadius
const contextRingValueStyle = computed<CSSProperties>(() => ({
  strokeDasharray: `${contextRingCircumference}`,
  strokeDashoffset: `${contextRingCircumference * (1 - contextUsagePercent.value / 100)}`,
}))

function requestWorkspace(): void {
  if (props.workspaceTrigger === true) {
    emit('request-workspace')
  }
}

function currentDraft(): string {
  const input = composerInput.value
  return input === null ? draft.value : readComposerDraft(input)
}

/** Repaint the editable from a draft string and drop metadata that left it. */
function renderDraft(text: string, caret: number | null): void {
  const input = composerInput.value
  draft.value = text
  syncDraft(text)
  if (input === null) {
    return
  }
  paintComposerContent(input, text, attachments.value, chipActions)
  if (caret !== null) {
    placeComposerCaret(input, caret)
  }
}

function syncFromEditor(): void {
  const input = composerInput.value
  if (input === null) {
    return
  }
  const text = readComposerDraft(input)
  draft.value = text
  syncDraft(text)
  rememberCaret()
}

function handleFocus(): void {
  focused.value = true
  rememberCaret()
}

function rememberCaret(): void {
  const input = composerInput.value
  if (input === null) {
    return
  }
  const selection = composerSelectionRange(input)
  if (selection !== null) {
    rememberedCaret = selection.end
  }
}

function captureInsertIndex(point: DesktopDropPoint | null = null): void {
  const input = composerInput.value
  const text = currentDraft()
  const dropped = point === null || input === null
    ? null
    : composerIndexAtPoint(input, point.x, point.y)
  const selection = dropped === null && input !== null ? composerSelectionRange(input) : null
  const fallback = Math.min(rememberedCaret, text.length)
  // A drop picks its own spot; a paste follows the caret, which may sit stale
  // after a native drop the webview never forwards as a DOM event.
  const start = dropped ?? selection?.start ?? fallback
  const end = dropped ?? selection?.end ?? fallback
  pendingInsert = { start, end }
  rememberedCaret = end
}

/** Write a freshly built fragment at the caret captured before the import. */
function insertFragment(fragment: string): void {
  const pending = pendingInsert
  pendingInsert = null
  const input = composerInput.value
  if (fragment.length === 0 || input === null) {
    return
  }
  const text = currentDraft()
  const start = Math.min(pending?.start ?? text.length, text.length)
  const end = Math.max(start, Math.min(pending?.end ?? text.length, text.length))
  const caret = start + fragment.length
  renderDraft(`${text.slice(0, start)}${fragment}${text.slice(end)}`, caret)
  rememberedCaret = caret
  input.focus()
}

/** Write freshly imported attachments at the caret captured before the import. */
function insertAttachments(added: readonly ComposerAttachment[]): void {
  insertFragment(added.map((attachment) => attachment.token).join(''))
}

function handleChipRemove(token: string): void {
  const text = currentDraft()
  const index = text.indexOf(token)
  if (index < 0) {
    return
  }
  removeAttachment(token)
  renderDraft(`${text.slice(0, index)}${text.slice(index + 1)}`, index)
  rememberedCaret = index
  void nextTick(() => composerInput.value?.focus())
}

/** Re-import every chip in a pasted selection; text between them stays verbatim. */
async function insertClipboardSegments(segments: readonly ComposerClipboardSegment[]): Promise<void> {
  const paths: string[] = []
  for (const segment of segments) {
    if (segment.path !== null && isAbsolutePath(segment.path)) {
      paths.push(segment.path)
    }
  }
  const added = await addPaths(paths, true)
  let cursor = 0
  let fragment = ''
  for (const segment of segments) {
    if (segment.path === null) {
      fragment += segment.text
      continue
    }
    if (!isAbsolutePath(segment.path)) {
      fragment += segment.path
      continue
    }
    const record = added[cursor]
    cursor += 1
    if (record !== undefined) {
      if (segment.name !== null) {
        attachmentsState.renameAttachment(record.token, segment.name)
      }
      fragment += record.token
    }
  }
  insertFragment(fragment)
}

async function handlePaste(event: ClipboardEvent): Promise<void> {
  const data = event.clipboardData
  if (data === null || props.disabled === true) {
    return
  }
  const segments = composerClipboardSegmentsFromTransfer(data)
  if (segments !== null && segments.some((segment) => segment.path !== null)) {
    event.preventDefault()
    captureInsertIndex()
    void insertClipboardSegments(segments)
    return
  }
  const files = clipboardAttachmentFiles(data)
  if (files.length === 0 || preferClipboardText(data.getData('text/plain'), files)) {
    return
  }
  event.preventDefault()
  captureInsertIndex()
  insertAttachments(await addClipboardFiles(files))
}

/** A chip selection must leave the clipboard and the draft in agreement. */
function handleClipboardCut(event: ClipboardEvent): void {
  const input = composerInput.value
  if (!writeComposerClipboard(event, input) || input === null) {
    return
  }
  const selection = composerSelectionRange(input)
  if (selection === null || selection.start === selection.end) {
    return
  }
  const text = currentDraft()
  renderDraft(`${text.slice(0, selection.start)}${text.slice(selection.end)}`, selection.start)
  rememberedCaret = selection.start
}

function handleDroppedPaths(paths: readonly DesktopDropPath[], point: DesktopDropPoint | null): void {
  if (props.disabled === true) {
    return
  }
  const files = paths.filter((item) => item.kind !== 'directory' && isAbsolutePath(item.path))
  if (files.length === 0) {
    if (paths.length > 0) {
      notice.value = copy.value.droppedDirectory
    }
    return
  }
  captureInsertIndex(point)
  void addPaths(files.map((item) => item.path)).then(insertAttachments)
}

const { dragging, handleDragOver, handleDrop, handleDragLeave } = useDesktopFileDrop(composerCard, handleDroppedPaths)

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

async function selectFiles(): Promise<void> {
  if (props.disabled === true || attaching.value) {
    return
  }
  let selectedPaths: readonly string[] = []
  try {
    selectedPaths = await chooseFilesFromDialog(copy.value.chooseFiles)
  } catch {
    return
  }
  if (selectedPaths.length === 0) {
    return
  }
  captureInsertIndex()
  insertAttachments(await addPaths(selectedPaths))
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

function clearComposerInput(): void {
  draft.value = ''
  pendingInsert = null
  rememberedCaret = 0
  resetAttachments()
  const input = composerInput.value
  if (input !== null) {
    paintComposerContent(input, '', [], chipActions)
  }
}

function submit(): void {
  if (!canSend.value) {
    return
  }
  emit('submit', {
    text: currentDraft(),
    attachments: attachments.value,
    modelId: selectedModelId.value,
    thinkingLevel: selectedThinkingId.value,
  })
  clearComposerInput()
  void nextTick(() => composerInput.value?.focus())
}

function submitFromKey(event: KeyboardEvent): void {
  if (event.target !== composerInput.value) {
    return
  }
  event.preventDefault()
  submit()
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
      <p v-if="notice" class="omp-composer-drop-notice" role="status">{{ notice }}</p>
      <div
        ref="composerInput"
        class="omp-composer-input"
        :class="{ 'omp-composer-input-disabled': props.disabled, 'omp-composer-input-focused': focused }"
        :contenteditable="props.disabled !== true"
        role="textbox"
        aria-multiline="true"
        :aria-busy="attaching"
        :aria-label="props.workspaceTrigger ? copy.chooseWorkspace : copy.messagePlaceholder"
        :data-placeholder="draft.length === 0 ? (props.workspaceTrigger ? copy.composerPlaceholder : copy.messagePlaceholder) : ''"
        :aria-disabled="props.disabled"
        @focus="handleFocus"
        @blur="focused = false"
        @input="syncFromEditor"
        @keyup="rememberCaret"
        @mouseup="rememberCaret"
        @paste="handlePaste"
        @cut="handleClipboardCut"
        @keydown.enter.exact="submitFromKey"
        @click.stop
      ></div>
    </div>
    <div class="omp-composer-row">
      <div class="omp-composer-tools">
        <button class="omp-composer-add" type="button" :aria-label="copy.addFiles" :disabled="props.disabled" @click.stop="selectFiles">
          <AppIcon name="plus" :size="14" aria-hidden="true" />
        </button>
        <span v-if="attachmentCount > 0" class="omp-composer-attachment-count" :aria-label="attachmentLabel">{{ attachmentCount }}</span>
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
            <span class="omp-composer-model-thinking">{{ selectedThinking.label }}</span>
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
        <span class="omp-composer-context-meter" :title="copy.contextUsage" :aria-label="copy.contextUsage">
          <svg class="omp-composer-context-ring" viewBox="0 0 20 20" aria-hidden="true">
            <circle class="omp-composer-context-ring-track" cx="10" cy="10" r="8" />
            <circle
              class="omp-composer-context-ring-value"
              cx="10"
              cy="10"
              r="8"
              :style="contextRingValueStyle"
            />
          </svg>
        </span>
        <button class="omp-composer-send" type="button" :aria-label="copy.sendMessage" :disabled="!canSend" @click.stop="submit">
          <AppIcon name="arrow-up" :size="16" aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>
</template>
