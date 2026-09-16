<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'

import { AppIcon } from './icons'
import { useAppStore } from '../stores/app'

type ComposerVariant = 'home' | 'docked'
type MenuName = 'mode' | 'permission' | 'model' | 'context'
type MenuOption = {
  id: string
  label: string
  hint: string
}

type ComposerProps = {
  variant?: ComposerVariant
  disabled?: boolean
}

const props = withDefaults(defineProps<ComposerProps>(), {
  variant: 'docked',
  disabled: false,
})

const emit = defineEmits<{
  submitted: [content: string]
}>()

const store = useAppStore()
const sendMessage = store.sendMessage
const editorRef = ref<HTMLDivElement | null>(null)
const draft = ref('')
const composing = ref(false)
const sending = ref(false)
const sendFailed = ref(false)
const attachmentNotice = ref(false)
const enhancementNotice = ref(false)
const activeMenu = ref<MenuName | null>(null)
const modeLabel = ref('Agent')
const permissionLabel = ref('Ask')
const modelLabel = ref('Auto')
const contextLabel = ref('Context')
let measureFrame: number | null = null

const menuOptions: Record<MenuName, readonly MenuOption[]> = {
  mode: [
    { id: 'agent', label: 'Agent', hint: '完整协作模式' },
    { id: 'plan', label: 'Plan', hint: '先整理执行计划' },
  ],
  permission: [
    { id: 'ask', label: 'Ask', hint: '需要时请求确认' },
    { id: 'accept-edits', label: 'Accept edits', hint: '自动接受文件编辑' },
    { id: 'auto', label: 'Auto', hint: '自动处理安全操作' },
  ],
  model: [
    { id: 'auto', label: 'Auto', hint: '使用当前默认模型' },
    { id: 'fast', label: 'Fast', hint: '更快的短任务响应' },
  ],
  context: [
    { id: 'workspace', label: 'Workspace', hint: '参考当前工作区' },
    { id: 'conversation', label: 'Conversation', hint: '仅参考当前对话' },
  ],
}

const inputDisabled = computed(() => props.disabled || sending.value)
const hasDraft = computed(() => draft.value.trim().length > 0)
const dockClass = computed(() =>
  props.variant === 'home'
    ? 'composer-dock composer-dock-home'
    : 'composer-dock composer-dock-docked',
)
const dockDataAttribute = computed(() => (props.variant === 'home' ? 'home' : 'docked'))
const activeMenuOptions = computed<readonly MenuOption[]>(() =>
  activeMenu.value ? menuOptions[activeMenu.value] : [],
)
const activeMenuTitle = computed(() => {
  if (activeMenu.value === 'mode') return '工作模式'
  if (activeMenu.value === 'permission') return '权限模式'
  if (activeMenu.value === 'model') return '模型'
  if (activeMenu.value === 'context') return '上下文'
  return ''
})
const selectedMenuId = computed(() => {
  if (activeMenu.value === 'mode') return modeLabel.value.toLowerCase()
  if (activeMenu.value === 'permission') return permissionLabel.value.toLowerCase().replace(/\s+/gu, '-')
  if (activeMenu.value === 'model') return modelLabel.value.toLowerCase()
  if (activeMenu.value === 'context') return contextLabel.value.toLowerCase()
  return ''
})
const attachmentButtonLabel = computed(() =>
  attachmentNotice.value ? '关闭附件提示' : '添加附件',
)
const menuButtonLabels = computed(() => ({
  mode: `模式：${modeLabel.value}`,
  permission: `权限模式：${permissionLabel.value}`,
  model: `模型：${modelLabel.value}`,
  context: `上下文：${contextLabel.value}`,
}))
const helpTextId = `composer-help-text-${props.variant}`
const inputAriaDescription = computed(() =>
  inputDisabled.value ? '输入暂时不可用' : '按 Ctrl 或 Command 加 Enter 发送，Enter 换行',
)

function scheduleInputMeasure(): void {
  if (measureFrame !== null) return
  measureFrame = window.requestAnimationFrame(() => {
    measureFrame = null
    const element = editorRef.value
    if (!element) return
    const maxHeight = Number.parseFloat(window.getComputedStyle(element).maxHeight)
    element.style.overflowY = Number.isFinite(maxHeight) && element.scrollHeight > maxHeight ? 'auto' : 'hidden'
  })
}

function readEditorValue(element: HTMLElement): string {
  const hasBlockMarkup = element.querySelector('br,div,p,li') !== null
  const source = hasBlockMarkup ? element.innerText : element.textContent ?? ''
  return source.replace(/\r\n?/gu, '\n').replace(/\u00a0/gu, ' ')
}

function syncDraftFromEditor(): void {
  const element = editorRef.value
  if (!element) return
  const nextDraft = readEditorValue(element)
  if (draft.value !== nextDraft) draft.value = nextDraft
  scheduleInputMeasure()
}

function placeCaretAtEnd(element: HTMLElement): void {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

function insertTextAtSelection(text: string): void {
  const element = editorRef.value
  if (!element || inputDisabled.value) return
  element.focus()
  const selection = window.getSelection()
  if (!selection) return
  if (selection.rangeCount === 0 || !element.contains(selection.anchorNode)) {
    placeCaretAtEnd(element)
  }
  if (selection.rangeCount === 0) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const textNode = document.createTextNode(text)
  range.insertNode(textNode)
  range.setStartAfter(textNode)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  syncDraftFromEditor()
}

function setEditorValue(value: string): void {
  const element = editorRef.value
  if (!element) return
  element.textContent = value
  if (value.length === 0) placeCaretAtEnd(element)
  scheduleInputMeasure()
}

function handleBeforeInput(event: InputEvent): void {
  if (composing.value || inputDisabled.value) return
  if (event.inputType !== 'insertParagraph' && event.inputType !== 'insertLineBreak') return
  event.preventDefault()
  insertTextAtSelection('\n')
}

function handleInput(): void {
  if (!composing.value) syncDraftFromEditor()
}

function handleCompositionStart(): void {
  composing.value = true
}

function handleCompositionEnd(): void {
  composing.value = false
  syncDraftFromEditor()
}

function handlePaste(event: ClipboardEvent): void {
  const plainText = event.clipboardData?.getData('text/plain') ?? ''
  if (!plainText) return
  event.preventDefault()
  insertTextAtSelection(plainText.replace(/\r\n?/gu, '\n'))
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.isComposing || event.keyCode === 229) return
  if (event.key === 'Escape' && activeMenu.value) {
    event.preventDefault()
    activeMenu.value = null
    return
  }
  if (event.key !== 'Enter') return
  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    void submitDraft()
  }
}

async function submitDraft(): Promise<void> {
  const content = draft.value.trim()
  if (!content || inputDisabled.value) return
  sendFailed.value = false
  enhancementNotice.value = false
  activeMenu.value = null
  sending.value = true
  try {
    await Promise.resolve(sendMessage(content))
    draft.value = ''
    setEditorValue('')
    emit('submitted', content)
  } catch {
    sendFailed.value = true
  } finally {
    sending.value = false
    await nextTick()
    scheduleInputMeasure()
  }
}

function handleStop(): void {
  sending.value = false
}

function handleSubmitClick(): void {
  void submitDraft()
}

function toggleMenu(name: MenuName): void {
  activeMenu.value = activeMenu.value === name ? null : name
  attachmentNotice.value = false
  enhancementNotice.value = false
}

function selectMenuOption(option: MenuOption): void {
  if (activeMenu.value === 'mode') modeLabel.value = option.label
  if (activeMenu.value === 'permission') permissionLabel.value = option.label
  if (activeMenu.value === 'model') modelLabel.value = option.label
  if (activeMenu.value === 'context') contextLabel.value = option.label
  activeMenu.value = null
}

function toggleAttachmentNotice(): void {
  attachmentNotice.value = !attachmentNotice.value
  enhancementNotice.value = false
  activeMenu.value = null
}

function showEnhancementNotice(): void {
  if (!hasDraft.value || inputDisabled.value) return
  enhancementNotice.value = true
  attachmentNotice.value = false
  activeMenu.value = null
}

onMounted(() => {
  setEditorValue(draft.value)
  scheduleInputMeasure()
})
</script>

<template>
  <div :class="dockClass" :data-composer-dock="dockDataAttribute">
    <div class="composer-stack">
      <div class="composer-shell" :class="{ 'is-disabled': inputDisabled }">
        <div class="composer-input-wrap">
          <div class="composer-input-stage">
            <div
              ref="editorRef"
              class="composer-input selectable"
              role="textbox"
              aria-label="消息输入"
              aria-multiline="true"
              :aria-describedby="helpTextId"
              :aria-disabled="inputDisabled ? 'true' : 'false'"
              :aria-readonly="inputDisabled ? 'true' : 'false'"
              :aria-busy="sending ? 'true' : 'false'"
              :aria-placeholder="'描述你想完成的任务…'"
              :contenteditable="!inputDisabled"
              :tabindex="inputDisabled ? -1 : 0"
              autocorrect="off"
              autocapitalize="off"
              translate="no"
              @beforeinput="handleBeforeInput"
              @input="handleInput"
              @keydown="handleKeydown"
              @compositionstart="handleCompositionStart"
              @compositionend="handleCompositionEnd"
              @paste="handlePaste"
            />
            <span v-if="draft.length === 0" class="composer-placeholder" aria-hidden="true">
              描述你想完成的任务…
            </span>
          </div>
          <span :id="helpTextId" class="sr-only">{{ inputAriaDescription }}</span>
        </div>

        <div class="composer-toolbar">
          <div class="composer-left">
            <div class="composer-plus">
              <button
                type="button"
                class="icon-btn composer-plus-button"
                :aria-label="attachmentButtonLabel"
                :aria-expanded="attachmentNotice"
                :disabled="inputDisabled"
                title="添加附件"
                @click="toggleAttachmentNotice"
              >
                <AppIcon name="plus" :size="15" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              class="icon-btn mode-chip composer-mode-chip"
              :class="{ active: activeMenu === 'mode' }"
              :data-mode="modeLabel.toLowerCase()"
              :aria-label="menuButtonLabels.mode"
              aria-haspopup="menu"
              :aria-expanded="activeMenu === 'mode'"
              :disabled="inputDisabled"
              title="工作模式"
              @click="toggleMenu('mode')"
            >
              <span class="composer-mode-chip-face">
                <AppIcon name="sparkles" :size="15" aria-hidden="true" />
                <span class="composer-mode-chip-label">{{ modeLabel }}</span>
              </span>
            </button>
            <div class="composer-permission">
              <button
                type="button"
                class="icon-btn mode-chip composer-permission-trigger"
                :class="{ active: activeMenu === 'permission' }"
                :aria-label="menuButtonLabels.permission"
                aria-haspopup="menu"
                :aria-expanded="activeMenu === 'permission'"
                :disabled="inputDisabled"
                title="权限模式"
                @click="toggleMenu('permission')"
              >
                <span>{{ permissionLabel }}</span>
                <AppIcon name="chevron-down" :size="12" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div class="composer-right">
            <div class="context-inspector">
              <button
                type="button"
                class="icon-btn context-inspector-trigger"
                :class="{ active: activeMenu === 'context' }"
                :aria-label="menuButtonLabels.context"
                aria-haspopup="menu"
                :aria-expanded="activeMenu === 'context'"
                :disabled="inputDisabled"
                title="上下文"
                @click="toggleMenu('context')"
              >
                <AppIcon name="circle-help" :size="15" aria-hidden="true" />
                <span>{{ contextLabel }}</span>
                <AppIcon name="chevron-down" :size="12" aria-hidden="true" />
              </button>
            </div>
            <div class="composer-model-thinking">
              <button
                type="button"
                class="icon-btn composer-model-chip composer-model-thinking-chip"
                :class="{ active: activeMenu === 'model' }"
                :aria-label="menuButtonLabels.model"
                aria-haspopup="menu"
                :aria-expanded="activeMenu === 'model'"
                :disabled="inputDisabled"
                title="模型"
                @click="toggleMenu('model')"
              >
                <AppIcon name="bot" :size="14" aria-hidden="true" />
                <span class="composer-model-thinking-model">{{ modelLabel }}</span>
                <AppIcon name="chevron-down" :size="12" aria-hidden="true" />
              </button>
            </div>
            <button
              type="button"
              class="icon-btn composer-enhance-btn"
              :disabled="!hasDraft || inputDisabled"
              aria-label="优化提示词"
              title="优化提示词"
              @click="showEnhancementNotice"
            >
              <AppIcon name="sparkles" :size="15" aria-hidden="true" />
            </button>
            <button
              v-if="sending"
              type="button"
              class="stop-btn"
              aria-label="停止生成"
              title="停止生成"
              @click="handleStop"
            >
              <AppIcon name="square" :size="14" aria-hidden="true" />
            </button>
            <button
              v-else
              type="button"
              class="send-btn"
              :disabled="!hasDraft || inputDisabled"
              aria-label="发送消息"
              title="发送消息"
              @click="handleSubmitClick"
            >
              <AppIcon name="arrow-up" :size="15" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div
          v-if="activeMenu"
          class="composer-menu"
          :class="[
            `composer-menu-${activeMenu}`,
            { 'composer-model-menu composer-model-thinking-menu': activeMenu === 'model' },
          ]"
          role="menu"
          :aria-label="activeMenuTitle"
        >
          <div class="composer-menu-title">{{ activeMenuTitle }}</div>
          <button
            v-for="option in activeMenuOptions"
            :key="option.id"
            type="button"
            class="composer-menu-option composer-plus-item"
            :class="{ active: selectedMenuId === option.id }"
            role="menuitemradio"
            :aria-checked="selectedMenuId === option.id"
            @click="selectMenuOption(option)"
          >
            <span class="composer-menu-option-copy">
              <strong>{{ option.label }}</strong>
              <small>{{ option.hint }}</small>
            </span>
            <AppIcon v-if="selectedMenuId === option.id" name="check" :size="13" aria-hidden="true" />
          </button>
        </div>

        <div v-if="attachmentNotice" class="composer-attachment-note" role="status">
          可直接粘贴文本或路径；附件连接能力将在工作区接入后启用。
        </div>
        <div v-if="enhancementNotice" class="composer-attachment-note" role="status">
          提示词优化需要后端模型连接；当前保持本地输入不变。
        </div>
      </div>
      <p v-if="sendFailed" class="composer-status composer-status-error" role="alert">
        消息未发送，请保留草稿后重试。
      </p>
    </div>
  </div>
</template>
