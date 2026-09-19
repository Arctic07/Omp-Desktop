/**
 * Clipboard bridge for composer attachment chips. A copied chip travels as an
 * inline `<span data-omp-attachment-path="…">` so pasting back into this app
 * re-imports the file, while a plain-text paste elsewhere yields the path.
 */

/** Attribute carrying an attachment's file path on rendered chips and inside clipboard HTML. */
export const CHIP_PATH_ATTRIBUTE = 'data-omp-attachment-path'

/** Attribute carrying an attachment's display name so a pasted chip keeps the copied name. */
export const CHIP_NAME_ATTRIBUTE = 'data-omp-attachment-name'

/** Custom clipboard flavor carrying the exact segment list, so in-app paste never depends on HTML fidelity. */
export const CHIP_CLIPBOARD_TYPE = 'application/omp-attachment-chips'

/** One ordered piece of a copied or pasted selection; non-null `path` means an attachment chip. */
export interface ComposerClipboardSegment {
  text: string
  path: string | null
  name: string | null
}

export interface ComposerClipboardPayload {
  text: string
  html: string
}

function chipPathOf(node: Node): string | null {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }
  const path = (node as HTMLElement).getAttribute(CHIP_PATH_ATTRIBUTE) ?? ''
  return path.length > 0 ? path : null
}

/**
 * Walk a subtree the way `readComposerDraft` walks the editable: chips stand
 * for their path, `<br>` and (when `blockBoundaries`) block wrappers stand for
 * newlines, everything else is text. Adjacent text collapses into one segment;
 * each chip gets its own.
 */
function collectSegments(container: Node, blockBoundaries: boolean): ComposerClipboardSegment[] {
  const segments: ComposerClipboardSegment[] = []
  let buffer = ''

  const flush = (): void => {
    if (buffer.length > 0) {
      segments.push({ text: buffer, path: null, name: null })
      buffer = ''
    }
  }

  const walk = (parent: Node, blockStart: boolean): void => {
    for (const child of Array.from(parent.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        buffer += child.nodeValue ?? ''
        continue
      }
      if (child.nodeType !== Node.ELEMENT_NODE) {
        continue
      }
      const path = chipPathOf(child)
      if (path !== null) {
        // A chip owns its whole subtree: the icon and remove button are chrome.
        flush()
        const name = ((child as HTMLElement).getAttribute(CHIP_NAME_ATTRIBUTE) ?? '').trim()
        segments.push({ text: '', path, name: name.length > 0 ? name : null })
        continue
      }
      const element = child as HTMLElement
      if (element.tagName === 'BR') {
        buffer += '\n'
        continue
      }
      if (element.tagName === 'DIV' || element.tagName === 'P') {
        // Native undo can reintroduce block wrappers; keep each one a newline.
        // Clipboard HTML is normalized by the OS (block wrapping, `<br>` → block
        // edge, padding newlines), so only the selection walk trusts block edges.
        if (blockBoundaries && !blockStart && buffer.length > 0 && !buffer.endsWith('\n')) {
          buffer += '\n'
        }
        walk(element, buffer.length === 0)
        continue
      }
      walk(element, blockStart && buffer.length === 0)
    }
  }

  walk(container, true)
  flush()
  return segments
}

/** Trim newlines off each text segment's edges and drop the ones that empty out; chips keep position and order. */
function normalizeSegments(
  segments: readonly ComposerClipboardSegment[],
): ComposerClipboardSegment[] {
  const normalized: ComposerClipboardSegment[] = []
  for (const segment of segments) {
    if (segment.path !== null) {
      normalized.push(segment)
      continue
    }
    const text = segment.text.replace(/^\n+/, '').replace(/\n+$/, '')
    if (text.length > 0) {
      normalized.push({ text, path: null, name: null })
    }
  }
  return normalized
}

/** Strictly read the custom flavor's segment list; null when the payload is absent, malformed, or holds no chip. */
function parseChipSegments(json: string): ComposerClipboardSegment[] | null {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    return null
  }
  if (!Array.isArray(value)) {
    return null
  }
  const items: unknown[] = value
  const segments: ComposerClipboardSegment[] = []
  let holdsChip = false
  for (const item of items) {
    if (typeof item !== 'object' || item === null) {
      return null
    }
    const record = item as Record<string, unknown>
    const { text, path, name } = record
    // `undefined` (missing key) fails every branch below, so it is invalid too.
    if (typeof text !== 'string') {
      return null
    }
    if (path !== null && typeof path !== 'string') {
      return null
    }
    if (name !== null && typeof name !== 'string') {
      return null
    }
    if (path !== null) {
      holdsChip = true
    }
    segments.push({ text, path: path as string | null, name: name as string | null })
  }
  return holdsChip ? segments : null
}

/** Ordered segments of the current window selection inside `root`; null when empty, outside `root`, or holding no chip. */
export function composerClipboardSelectionSegments(
  root: HTMLElement,
): readonly ComposerClipboardSegment[] | null {
  const selection = window.getSelection()
  if (selection === null || selection.rangeCount === 0) {
    return null
  }
  const range = selection.getRangeAt(0)
  if (range.collapsed || !root.contains(range.commonAncestorContainer)) {
    return null
  }
  // Mirrors `readComposerDraft`: native undo can wrap runs in blocks, so the
  // selection keeps their edges.
  const segments = normalizeSegments(collectSegments(range.cloneContents(), true))
  return segments.some((segment) => segment.path !== null) ? segments : null
}

/** Ordered segments parsed from clipboard HTML; empty when it holds no chip. */
export function composerClipboardSegmentsFromHtml(html: string): readonly ComposerClipboardSegment[] {
  const document = new DOMParser().parseFromString(html, 'text/html')
  // Foreign clipboards normalize HTML (block wrapping, padded newlines), so
  // only `<br>` may mean a line break here.
  const segments = normalizeSegments(collectSegments(document.body, false))
  return segments.some((segment) => segment.path !== null) ? segments : []
}

/** Segments from a paste transfer: exact custom flavor first, HTML marker second; null when neither holds a chip. */
export function composerClipboardSegmentsFromTransfer(
  data: DataTransfer,
): readonly ComposerClipboardSegment[] | null {
  const exact = data.getData(CHIP_CLIPBOARD_TYPE)
  if (exact.length > 0) {
    const parsed = parseChipSegments(exact)
    if (parsed !== null) {
      return normalizeSegments(parsed)
    }
  }
  const html = data.getData('text/html')
  if (!html.includes(CHIP_PATH_ATTRIBUTE)) {
    return null
  }
  const segments = composerClipboardSegmentsFromHtml(html)
  return segments.length > 0 ? segments : null
}

/** Escape the HTML-significant characters; callers add attribute or line-break handling. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Plain flavor carries attachment paths; HTML flavor carries chip markup this app parses back. */
export function composerClipboardPayload(
  segments: readonly ComposerClipboardSegment[],
): ComposerClipboardPayload {
  let text = ''
  let html = ''
  for (const segment of segments) {
    if (segment.path !== null) {
      text += segment.path
      const path = escapeHtml(segment.path).replace(/"/g, '&quot;')
      const nameAttribute = segment.name === null
        ? ''
        : ` ${CHIP_NAME_ATTRIBUTE}="${escapeHtml(segment.name).replace(/"/g, '&quot;')}"`
      html += `<span ${CHIP_PATH_ATTRIBUTE}="${path}"${nameAttribute}>${escapeHtml(segment.path)}</span>`
    } else {
      text += segment.text
      html += escapeHtml(segment.text).replace(/\n/g, '<br>')
    }
  }
  return { text, html }
}

/** Own the clipboard payload for the current selection; false when the selection holds no chip (leave the event alone). */
export function writeComposerClipboard(event: ClipboardEvent, root: HTMLElement | null): boolean {
  if (event.clipboardData === null || root === null) {
    return false
  }
  const segments = composerClipboardSelectionSegments(root)
  if (segments === null) {
    return false
  }
  const payload = composerClipboardPayload(segments)
  event.clipboardData.setData(CHIP_CLIPBOARD_TYPE, JSON.stringify(segments))
  event.clipboardData.setData('text/plain', payload.text)
  event.clipboardData.setData('text/html', payload.html)
  event.preventDefault()
  return true
}
