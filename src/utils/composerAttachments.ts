import type { AppIconName } from '../components/icons'

export type ComposerAttachmentKind = 'image' | 'file'

/**
 * One attachment owned by the composer. `token` is the single private-use code
 * point that stands for this file inside the draft string, so text and files
 * share one inline editing surface.
 */
export interface ComposerAttachment {
  token: string
  path: string
  name: string
  kind: ComposerAttachmentKind
  mimeType: string
  size: number
}

/** A draft string split into plain text and the attachments sitting inside it. */
export interface ComposerDraftSegment {
  text: string
  attachment: ComposerAttachment | null
}

/** Mirrors MAX_FILE_BYTES / MAX_TOTAL_BYTES in src-tauri/src/services/attachments.rs. */
export const MAX_ATTACHMENT_FILE_BYTES = 24 * 1024 * 1024
export const MAX_ATTACHMENT_TOTAL_BYTES = 48 * 1024 * 1024

const CHIP_TOKEN_FIRST = 0xe000
const CHIP_TOKEN_LAST = 0xf8ff

let chipTokenSequence = 0

/** Hand out the next private-use code point used as an inline attachment token. */
export function createChipToken(): string {
  const span = CHIP_TOKEN_LAST - CHIP_TOKEN_FIRST + 1
  chipTokenSequence = (chipTokenSequence % span) + 1
  return String.fromCharCode(CHIP_TOKEN_FIRST + chipTokenSequence - 1)
}

export function isChipToken(value: string): boolean {
  if (value.length !== 1) {
    return false
  }
  const code = value.charCodeAt(0)
  return code >= CHIP_TOKEN_FIRST && code <= CHIP_TOKEN_LAST
}

export function attachmentIconName(attachment: ComposerAttachment): AppIconName {
  return attachment.kind === 'image' ? 'image' : 'file-text'
}

/**
 * Split a draft into ordered segments. Code points without an attachment behind
 * them stay verbatim text, so pasted private-use glyphs survive editing.
 */
export function splitComposerDraft(
  text: string,
  attachments: readonly ComposerAttachment[],
): ComposerDraftSegment[] {
  const byToken = new Map(attachments.map((attachment) => [attachment.token, attachment]))
  const segments: ComposerDraftSegment[] = []
  let buffer = ''

  const flush = (): void => {
    if (buffer.length > 0) {
      segments.push({ text: buffer, attachment: null })
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
    segments.push({ text: '', attachment })
  }
  flush()
  return segments
}

/** Tokens that no longer appear in the draft must not survive as attachments. */
export function pruneComposerAttachments(
  text: string,
  attachments: readonly ComposerAttachment[],
): readonly ComposerAttachment[] {
  if (attachments.length === 0) {
    return attachments
  }
  const live = new Set<string>()
  for (const char of text) {
    if (isChipToken(char)) {
      live.add(char)
    }
  }
  const next = attachments.filter((attachment) => live.has(attachment.token))
  return next.length === attachments.length ? attachments : next
}

function attachmentLeafName(path: string): string {
  const normalized = path.replaceAll('\\', '/').replace(/\/+$/, '')
  const leaf = normalized.slice(normalized.lastIndexOf('/') + 1)
  return leaf.length > 0 ? leaf : normalized
}

export function isDirectoryPath(path: string): boolean {
  const trimmed = path.trim()
  return trimmed === '.' || trimmed === '..' || trimmed.endsWith('/') || trimmed.endsWith('\\')
}

/** Native drop handlers can fall back to a bare file name; only copy real paths. */
export function isAbsolutePath(path: string): boolean {
  return path.startsWith('/') || path.startsWith('\\\\') || /^[A-Za-z]:[\\/]/.test(path)
}

/** Clipboard payload as files, falling back to file-kind items when needed. */
export function clipboardAttachmentFiles(data: DataTransfer): File[] {
  const files = Array.from(data.files)
  if (files.length === 0) {
    for (const item of Array.from(data.items)) {
      if (item.kind !== 'file') {
        continue
      }
      const file = item.getAsFile()
      if (file !== null) {
        files.push(file)
      }
    }
  }
  return files
}

/**
 * Word and browsers can copy text plus a synthesized image of that selection.
 * Keep the editable text in that case; only real files and image-only pastes
 * become attachments.
 */
export function preferClipboardText(text: string, files: readonly File[]): boolean {
  return (
    text.trim().length > 0 &&
    files.length > 0 &&
    files.every((file) => file.type.toLowerCase().startsWith('image/'))
  )
}

export function attachmentMimeType(file: File): string {
  const mimeType = file.type.trim().toLowerCase()
  return mimeType.length > 0 ? mimeType : 'application/octet-stream'
}

const CHIP_LABEL_HEAD = 16
const CHIP_LABEL_TAIL = 10

/**
 * Elide long attachment names in JS. CSS `text-overflow: ellipsis` needs
 * `overflow: hidden`, and CSS 2.1 §10.8.1 redefines the baseline of an
 * inline-block with non-visible overflow as its bottom margin edge — that
 * hoists the chip's text off the shared baseline and leaves the icon and the
 * remove button hanging below it.
 */
export function attachmentChipLabel(name: string): string {
  if (name.length <= CHIP_LABEL_HEAD + CHIP_LABEL_TAIL + 1) {
    return name
  }
  return `${name.slice(0, CHIP_LABEL_HEAD)}…${name.slice(-CHIP_LABEL_TAIL)}`
}

export function attachmentFileName(file: File, index: number): string {
  const leaf = attachmentLeafName(file.name.trim())
  return leaf.length > 0 && leaf !== '.' ? leaf : `pasted-file-${index + 1}`
}

/** Read a clipboard file as bare base64 for the Rust attachment command. */
export function readFileBase64(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error(`Could not read ${file.name}`))
        return
      }
      const separator = result.indexOf(',')
      resolve(separator < 0 ? '' : result.slice(separator + 1))
    }
    reader.readAsDataURL(file)
  })
}
