import { ICON_DEFINITIONS, type AppIconName } from '../components/icons'
import {
  attachmentChipLabel,
  attachmentIconName,
  isChipToken,
  type ComposerAttachment,
} from './composerAttachments'
import { CHIP_NAME_ATTRIBUTE, CHIP_PATH_ATTRIBUTE } from './composerClipboard'

export interface ComposerChipActions {
  removeLabelFor: (name: string) => string
  onRemove: (token: string) => void
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const CHIP_TOKEN_ATTRIBUTE = 'data-chip-token'

function createIconElement(name: AppIconName, size: number): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('width', String(size))
  svg.setAttribute('height', String(size))
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.75')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('focusable', 'false')
  for (const [tag, attributes] of ICON_DEFINITIONS[name]) {
    const node = document.createElementNS(SVG_NAMESPACE, tag)
    for (const [key, value] of Object.entries(attributes)) {
      node.setAttribute(key, value)
    }
    svg.appendChild(node)
  }
  return svg
}

function chipTokenOf(node: Node): string | null {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }
  const token = (node as HTMLElement).getAttribute(CHIP_TOKEN_ATTRIBUTE) ?? ''
  return isChipToken(token) ? token : null
}

function createChip(attachment: ComposerAttachment, actions: ComposerChipActions): HTMLElement {
  const chip = document.createElement('span')
  chip.className = 'omp-composer-chip'
  chip.contentEditable = 'false'
  chip.setAttribute(CHIP_TOKEN_ATTRIBUTE, attachment.token)
  chip.setAttribute(CHIP_PATH_ATTRIBUTE, attachment.path)
  chip.setAttribute(CHIP_NAME_ATTRIBUTE, attachment.name)
  chip.setAttribute('role', 'listitem')
  chip.title = attachment.path
  chip.setAttribute('aria-label', `${attachment.name} — ${attachment.path}`)

  const icon = document.createElement('span')
  icon.className = 'omp-composer-chip-icon'
  icon.dataset.chipIcon = attachment.kind
  icon.appendChild(createIconElement(attachmentIconName(attachment), 13))

  // The label is a bare text node: a wrapping inline-block would need
  // `overflow: hidden` for the ellipsis, which moves its baseline to its bottom
  // margin edge and pushes the chip's text off the shared baseline.
  const label = document.createTextNode(attachmentChipLabel(attachment.name))

  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'omp-composer-chip-remove'
  const removeLabel = actions.removeLabelFor(attachment.name)
  remove.title = removeLabel
  remove.setAttribute('aria-label', removeLabel)
  remove.appendChild(createIconElement('x', 11))
  // Swallow the mousedown so removing a chip never drops the editable caret.
  remove.addEventListener('mousedown', (event) => event.preventDefault())
  remove.addEventListener('click', (event) => {
    event.stopPropagation()
    actions.onRemove(attachment.token)
  })

  chip.append(icon, label, remove)
  return chip
}

/** Read the editable back into the draft string; every chip counts as one char. */
export function readComposerDraft(root: HTMLElement): string {
  let draft = ''

  const walk = (parent: Node, blockStart: boolean): void => {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        draft += child.nodeValue ?? ''
        continue
      }
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue
      }
      const token = chipTokenOf(child)
      if (token !== null) {
        draft += token
        continue
      }
      const element = child as HTMLElement
      if (element.tagName === 'BR') {
        draft += '\n'
        continue
      }
      if (element !== root && (element.tagName === 'DIV' || element.tagName === 'P')) {
        // Native undo can reintroduce block wrappers; keep each one a newline.
        if (!blockStart && draft.length > 0 && !draft.endsWith('\n')) {
          draft += '\n'
        }
        walk(element, draft.length === 0)
        continue
      }
      walk(element, blockStart && draft.length === 0)
    }
  }

  walk(root, true)
  return draft
}

function draftLengthOfNode(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.nodeValue ?? '').length
  }
  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) {
    return 0
  }
  if (node.nodeType === Node.ELEMENT_NODE) {
    if (chipTokenOf(node) !== null) {
      return 1
    }
    if ((node as HTMLElement).tagName === 'BR') {
      return 1
    }
  }
  let total = 0
  for (const child of Array.from(node.childNodes)) {
    total += draftLengthOfNode(child)
  }
  return total
}

function draftIndexAt(root: HTMLElement, node: Node, offset: number): number | null {
  if (!root.contains(node)) {
    return null
  }
  const range = document.createRange()
  range.selectNodeContents(root)
  try {
    range.setEnd(node, offset)
  } catch {
    return null
  }
  return draftLengthOfNode(range.cloneContents())
}

/** Caret or selection in draft coordinates; null when the selection is outside. */
export function composerSelectionRange(root: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount === 0) {
    return null
  }
  const range = selection.getRangeAt(0)
  const start = draftIndexAt(root, range.startContainer, range.startOffset)
  const end = draftIndexAt(root, range.endContainer, range.endOffset)
  if (start === null || end === null) {
    return null
  }
  return { start: Math.min(start, end), end: Math.max(start, end) }
}

/** Draft index under a viewport point; null when the point misses the editable. */
export function composerIndexAtPoint(root: HTMLElement, x: number, y: number): number | null {
  if (typeof document.caretRangeFromPoint !== 'function') {
    return null
  }
  const range = document.caretRangeFromPoint(x, y)
  if (range === null) {
    return null
  }
  return draftIndexAt(root, range.startContainer, range.startOffset)
}

function draftCaretPoint(root: HTMLElement, target: number): { node: Node; offset: number } {
  let remaining = target
  let point: { node: Node; offset: number } | null = null

  const descend = (parent: Node): boolean => {
    const children = Array.from(parent.childNodes)
    for (let index = 0; index < children.length; index += 1) {
      const child = children[index]
      if (child === undefined) {
        continue
      }
      const length = draftLengthOfNode(child)
      if (child.nodeType === Node.TEXT_NODE) {
        if (point === null && remaining <= length) {
          point = { node: child, offset: remaining }
          return true
        }
        remaining -= length
        continue
      }
      if (chipTokenOf(child) !== null || (child as HTMLElement).tagName === 'BR') {
        if (point === null && remaining <= 1) {
          point = { node: parent, offset: remaining === 0 ? index : index + 1 }
          return true
        }
        remaining -= 1
        continue
      }
      if (child.nodeType === Node.ELEMENT_NODE && descend(child)) {
        return true
      }
    }
    return false
  }

  descend(root)
  return point ?? { node: root, offset: root.childNodes.length }
}

export function placeComposerCaret(root: HTMLElement, index: number): void {
  const point = draftCaretPoint(root, Math.max(0, index))
  const selection = window.getSelection()
  if (selection === null) {
    return
  }
  const limit = point.node.nodeType === Node.TEXT_NODE
    ? (point.node.nodeValue ?? '').length
    : point.node.childNodes.length
  const range = document.createRange()
  range.setStart(point.node, Math.min(point.offset, limit))
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * Render the draft string into the editable, rebuilding every chip. The caller
 * repositions the caret afterwards; a full repaint keeps text, chips and the
 * attachment list exactly consistent with the draft.
 */
export function paintComposerContent(
  root: HTMLElement,
  text: string,
  attachments: readonly ComposerAttachment[],
  actions: ComposerChipActions,
): void {
  const byToken = new Map(attachments.map((attachment) => [attachment.token, attachment]))
  const content = document.createDocumentFragment()
  let buffer = ''

  const flush = (): void => {
    if (buffer.length > 0) {
      content.appendChild(document.createTextNode(buffer))
      buffer = ''
    }
  }

  for (const char of text) {
    const attachment = isChipToken(char) ? byToken.get(char) : undefined
    if (attachment === undefined) {
      buffer += char
      continue
    }
    flush()
    content.appendChild(createChip(attachment, actions))
  }
  flush()
  if (content.childNodes.length === 0) {
    // Chromium needs at least one node for a reliable caret.
    content.appendChild(document.createTextNode(''))
  }
  root.replaceChildren(content)
}