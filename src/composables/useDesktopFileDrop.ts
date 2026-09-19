import { onMounted, onUnmounted, ref, type Ref } from 'vue'

import {
  currentWindowScaleFactor,
  listenDesktopDragDrop,
  type DesktopDragDropEvent,
} from '../utils/desktopApi'

export type DesktopDropPathKind = 'file' | 'directory' | 'unknown'

export interface DesktopDropPath {
  path: string
  kind: DesktopDropPathKind
}

/** Drop point in CSS pixels, matching client coordinates inside the window. */
export interface DesktopDropPoint {
  x: number
  y: number
}

export type DesktopDropHandler = (
  paths: readonly DesktopDropPath[],
  point: DesktopDropPoint | null,
) => void

interface FileWithPath extends File {
  path?: string
}

interface FileSystemDropEntry {
  name?: string
  isDirectory: boolean
  isFile: boolean
}

interface DataTransferItemWithEntry {
  getAsFile(): File | null
  webkitGetAsEntry?: () => FileSystemDropEntry | null
}

interface DataTransferWithItems extends DataTransfer {
  items: DataTransferItemList
}

export interface DesktopFileDropState {
  dragging: Ref<boolean>
  handleDragOver: (event: DragEvent) => void
  handleDrop: (event: DragEvent) => void
  handleDragLeave: (event: DragEvent) => void
}

function isInsideElement(element: HTMLElement | null, x: number, y: number): boolean {
  if (element === null) {
    return false
  }
  const rect = element.getBoundingClientRect()
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function decodeFileUrl(value: string): string | null {
  const trimmed = value.trim()
  if (trimmed.length === 0 || trimmed.startsWith('#') || !trimmed.toLowerCase().startsWith('file://')) {
    return null
  }

  try {
    const url = new URL(trimmed)
    const decodedPath = decodeURIComponent(url.pathname)
    if (url.hostname.length > 0 && url.hostname !== 'localhost') {
      return `\\\\${url.hostname}${decodedPath.replaceAll('/', '\\')}`
    }
    return decodedPath.replace(/^\/([A-Za-z]:)/, '$1').replaceAll('/', '\\')
  } catch {
    return null
  }
}

function pathFromFile(file: File | null, fallbackToName = false): string | null {
  if (file === null) {
    return null
  }
  const candidate = file as FileWithPath
  if (typeof candidate.path === 'string' && candidate.path.trim().length > 0) {
    return candidate.path
  }
  return fallbackToName && file.name.trim().length > 0 ? file.name : null
}

function pathsFromDomDrop(event: DragEvent): DesktopDropPath[] {
  const transfer = event.dataTransfer
  if (transfer === null) {
    return []
  }

  const paths: DesktopDropPath[] = []
  const seen = new Set<string>()
  const addPath = (path: string | null, kind: DesktopDropPathKind): void => {
    if (path === null || path.trim().length === 0) {
      return
    }
    const normalized = path.trim()
    const key = normalized.replaceAll('\\', '/').toLocaleLowerCase()
    if (seen.has(key)) {
      return
    }
    seen.add(key)
    paths.push({ path: normalized, kind })
  }

  const items = (transfer as DataTransferWithItems).items
  for (const item of Array.from(items)) {
    const entry = (item as DataTransferItemWithEntry).webkitGetAsEntry?.() ?? null
    const file = item.getAsFile()
    if (entry?.isDirectory === true) {
      addPath(pathFromFile(file, true) ?? entry.name ?? null, 'directory')
    } else if (entry?.isFile === true) {
      addPath(pathFromFile(file, true), 'file')
    }
  }

  for (const file of Array.from(transfer.files)) {
    addPath(pathFromFile(file, true), 'file')
  }
  for (const value of transfer.getData('text/uri-list').split('\n')) {
    addPath(decodeFileUrl(value), 'file')
  }
  return paths
}

function isDragTransfer(event: DragEvent): boolean {
  const transfer = event.dataTransfer
  if (transfer === null) {
    return false
  }
  const types = transfer.types
  return transfer.files.length > 0 || (types !== undefined && (types.includes('Files') || types.includes('text/uri-list')))
}

function isInsideDesktopDrop(element: HTMLElement | null, event: DesktopDragDropEvent, scaleFactor: number): boolean {
  if (event.type === 'leave') {
    return false
  }
  return isInsideElement(element, event.position.x / scaleFactor, event.position.y / scaleFactor)
}

export function useDesktopFileDrop(target: Ref<HTMLElement | null>, onDrop: DesktopDropHandler): DesktopFileDropState {
  const dragging = ref(false)
  let desktopUnlisten: (() => void) | null = null
  let disposed = false
  let scaleFactor = 1

  function updateDraggingFromDesktopEvent(event: DesktopDragDropEvent): void {
    const inside = isInsideDesktopDrop(target.value, event, scaleFactor)
    if (event.type === 'enter' || event.type === 'over') {
      dragging.value = inside
      return
    }
    if (event.type === 'leave') {
      dragging.value = false
      return
    }
    dragging.value = false
    if (inside && event.paths.length > 0) {
      onDrop(
        event.paths.map((path) => ({ path, kind: 'unknown' })),
        { x: event.position.x / scaleFactor, y: event.position.y / scaleFactor },
      )
    }
  }

  function handleDragOver(event: DragEvent): void {
    if (!isDragTransfer(event) || !isInsideElement(target.value, event.clientX, event.clientY)) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = 'copy'
    }
    dragging.value = true
  }

  function handleDrop(event: DragEvent): void {
    if (!isDragTransfer(event) || !isInsideElement(target.value, event.clientX, event.clientY)) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    dragging.value = false
    onDrop(pathsFromDomDrop(event), { x: event.clientX, y: event.clientY })
  }

  function handleDragLeave(event: DragEvent): void {
    const relatedTarget = event.relatedTarget
    if (relatedTarget instanceof Node && target.value?.contains(relatedTarget)) {
      return
    }
    dragging.value = false
  }

  onMounted(() => {
    void currentWindowScaleFactor().then((factor) => {
      scaleFactor = factor
    }).catch(() => {
      scaleFactor = 1
    })

    void listenDesktopDragDrop(updateDraggingFromDesktopEvent).then((unlisten) => {
      if (disposed) {
        unlisten()
      } else {
        desktopUnlisten = unlisten
      }
    }).catch(() => {
      desktopUnlisten = null
    })
  })

  onUnmounted(() => {
    disposed = true
    dragging.value = false
    desktopUnlisten?.()
    desktopUnlisten = null
  })

  return { dragging, handleDragOver, handleDrop, handleDragLeave }
}
