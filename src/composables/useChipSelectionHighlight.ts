import { onUnmounted, type Ref } from 'vue'

const CHIP_SELECTOR = '[data-omp-attachment-path]'
const SELECTED_ATTRIBUTE = 'data-selected'

/**
 * Chrome never paints `::selection` over a `contenteditable=false` chip, so mark
 * every chip the current selection touches with `data-selected="true"`.
 */
export function useChipSelectionHighlight(root: Ref<HTMLElement | null>): void {
  /** Chips carrying `data-selected="true"` after the last write, so writes stay diffed. */
  let marked = new Set<Element>()
  let frameHandle = 0

  /** Drops every mark, including ones left behind by chips the root no longer owns. */
  function clearMarks(): void {
    const rootElement = root.value
    if (rootElement !== null) {
      for (const element of rootElement.querySelectorAll(`[${SELECTED_ATTRIBUTE}="true"]`)) {
        element.removeAttribute(SELECTED_ATTRIBUTE)
      }
    } else {
      // Past unmount the root is detached, so only the cached chips remain reachable.
      for (const element of marked) {
        element.removeAttribute(SELECTED_ATTRIBUTE)
      }
    }
    marked = new Set<Element>()
  }

  /** Touches the DOM only for the chips whose marked state actually changed. */
  function applyMarks(next: Set<Element>): void {
    const previous = marked
    for (const element of previous) {
      if (!next.has(element)) {
        element.removeAttribute(SELECTED_ATTRIBUTE)
      }
    }
    for (const element of next) {
      if (!previous.has(element)) {
        element.setAttribute(SELECTED_ATTRIBUTE, 'true')
      }
    }
    marked = next
  }

  function computeMarks(): void {
    const rootElement = root.value
    const selection = document.getSelection()
    if (rootElement === null || selection === null || selection.rangeCount === 0 || selection.isCollapsed) {
      clearMarks()
      return
    }

    const next = new Set<Element>()
    let rangeTouchesRoot = false
    for (let index = 0; index < selection.rangeCount; index += 1) {
      const range = selection.getRangeAt(index)
      const ancestor = range.commonAncestorContainer
      const ancestorElement = ancestor instanceof Element ? ancestor : ancestor.parentElement
      if (ancestorElement === null || !rootElement.contains(ancestorElement)) {
        continue
      }
      rangeTouchesRoot = true
      for (const element of rootElement.querySelectorAll(CHIP_SELECTOR)) {
        // `intersectsNode` throws on nodes detached from the document, which a
        // re-rendering feed can leave behind between frames.
        if (rootElement.contains(element) && range.intersectsNode(element)) {
          next.add(element)
        }
      }
    }

    if (!rangeTouchesRoot) {
      clearMarks()
      return
    }
    applyMarks(next)
  }

  function scheduleCompute(): void {
    if (frameHandle !== 0) {
      return
    }
    frameHandle = requestAnimationFrame(() => {
      frameHandle = 0
      computeMarks()
    })
  }

  document.addEventListener('selectionchange', scheduleCompute)

  onUnmounted((): void => {
    document.removeEventListener('selectionchange', scheduleCompute)
    if (frameHandle !== 0) {
      cancelAnimationFrame(frameHandle)
      frameHandle = 0
    }
    clearMarks()
  })
}