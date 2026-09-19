import { computed, ref, type ComputedRef, type Ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import {
  MAX_ATTACHMENT_FILE_BYTES,
  MAX_ATTACHMENT_TOTAL_BYTES,
  attachmentFileName,
  attachmentMimeType,
  createChipToken,
  isDirectoryPath,
  pruneComposerAttachments,
  readFileBase64,
  type ComposerAttachment,
} from '../utils/composerAttachments'
import {
  formatDesktopError,
  importComposerFiles,
  saveComposerPaste,
  type ComposerAttachmentRecord,
  type ComposerPasteFile,
} from '../utils/desktopApi'

export interface ComposerAttachmentOptions {
  /** Durable session id, or null while the composer is still a workspace draft. */
  sessionId: () => string | null
  /** Disables every import while the composer is locked or already importing. */
  blocked: () => boolean
}

export interface ComposerAttachmentsState {
  attachments: Ref<readonly ComposerAttachment[]>
  busy: Ref<boolean>
  notice: Ref<string>
  attachmentCount: ComputedRef<number>
  removeLabelFor: (name: string) => string
  addClipboardFiles: (files: readonly File[]) => Promise<readonly ComposerAttachment[]>
  addPaths: (paths: readonly string[], allowDuplicates?: boolean) => Promise<readonly ComposerAttachment[]>
  removeAttachment: (token: string) => void
  /** Re-label a token in place so a pasted chip keeps the copied file name. */
  renameAttachment: (token: string, name: string) => void
  /** Drop metadata for attachments whose token left the draft. */
  syncDraft: (text: string) => void
  reset: () => void
}

/** Scratch scope: a real session owns its files, an unsent draft shares one. */
const DRAFT_SCOPE = 'draft'

export function useComposerAttachments(options: ComposerAttachmentOptions): ComposerAttachmentsState {
  const { copy } = useAppSettings()
  const attachments = ref<readonly ComposerAttachment[]>([])
  const busy = ref(false)
  const notice = ref('')
  /** Native source paths already copied into scratch; a re-drop must not recopy. */
  const importedSources = new Set<string>()

  const attachmentCount = computed<number>(() => attachments.value.length)
  const scope = (): string => options.sessionId() ?? DRAFT_SCOPE
  const blocked = (): boolean => options.blocked() || busy.value

  function removeLabelFor(name: string): string {
    return `${copy.value.removeAttachment}: ${name}`
  }

  function store(records: readonly ComposerAttachmentRecord[]): readonly ComposerAttachment[] {
    const added = records.map((record) => ({
      token: createChipToken(),
      path: record.path,
      name: record.name,
      kind: record.kind,
      mimeType: record.mimeType,
      size: record.size,
    }))
    attachments.value = [...attachments.value, ...added]
    return added
  }

  async function addClipboardFiles(files: readonly File[]): Promise<readonly ComposerAttachment[]> {
    if (blocked() || files.length === 0) {
      return []
    }

    const oversized = files.find((file) => file.size > MAX_ATTACHMENT_FILE_BYTES)
    if (oversized !== undefined) {
      notice.value = copy.value.attachmentTooLarge.replace('{name}', attachmentFileName(oversized, 0))
      return []
    }

    notice.value = ''
    busy.value = true
    try {
      // Read one file at a time: the byte budget is the only memory bound now
      // that attachment count is unlimited, so never load the whole batch.
      const payload: ComposerPasteFile[] = []
      let totalBytes = 0
      for (const [index, file] of files.entries()) {
        totalBytes += file.size
        if (totalBytes > MAX_ATTACHMENT_TOTAL_BYTES) {
          notice.value = copy.value.attachmentTooLarge.replace('{name}', attachmentFileName(file, index))
          break
        }
        payload.push({
          name: attachmentFileName(file, index),
          mimeType: attachmentMimeType(file),
          data: await readFileBase64(file),
        })
      }
      if (payload.length === 0) {
        return []
      }
      return store(await saveComposerPaste(scope(), payload))
    } catch (error: unknown) {
      notice.value = formatDesktopError(error, copy.value.attachFailed)
      return []
    } finally {
      busy.value = false
    }
  }

  async function addPaths(
    paths: readonly string[],
    allowDuplicates = false,
  ): Promise<readonly ComposerAttachment[]> {
    if (blocked() || paths.length === 0) {
      return []
    }

    const accepted: string[] = []
    let directories = 0
    for (const raw of paths) {
      const path = raw.trim()
      if (path.length === 0 || (!allowDuplicates && importedSources.has(path))) {
        continue
      }
      if (isDirectoryPath(path)) {
        directories += 1
        continue
      }
      accepted.push(path)
    }

    if (accepted.length === 0) {
      if (directories > 0) {
        notice.value = copy.value.droppedDirectory
      }
      return []
    }

    for (const path of accepted) {
      importedSources.add(path)
    }
    notice.value = ''
    busy.value = true
    try {
      const result = await importComposerFiles(scope(), accepted)
      const added = store(result.files)
      if (notice.value.length === 0 && directories + result.skippedDirectories > 0) {
        notice.value = copy.value.droppedDirectory
      }
      return added
    } catch (error: unknown) {
      for (const path of accepted) {
        importedSources.delete(path)
      }
      notice.value = formatDesktopError(error, copy.value.attachFailed)
      return []
    } finally {
      busy.value = false
    }
  }

  function removeAttachment(token: string): void {
    attachments.value = attachments.value.filter((attachment) => attachment.token !== token)
  }

  /** Re-label one token in place; a blank name or unknown token leaves the list untouched. */
  function renameAttachment(token: string, name: string): void {
    const trimmed = name.trim()
    if (trimmed.length === 0) {
      return
    }
    let matched = false
    const renamed = attachments.value.map((attachment) => {
      if (attachment.token !== token) {
        return attachment
      }
      matched = true
      return { ...attachment, name: trimmed }
    })
    if (matched) {
      attachments.value = renamed
    }
  }

  /** Draft edits can delete chips; drop metadata whose token left the draft. */
  function syncDraft(text: string): void {
    const next = pruneComposerAttachments(text, attachments.value)
    if (next !== attachments.value) {
      attachments.value = next
    }
  }

  function reset(): void {
    attachments.value = []
    importedSources.clear()
    notice.value = ''
  }

  return {
    attachments,
    busy,
    notice,
    attachmentCount,
    removeLabelFor,
    addClipboardFiles,
    addPaths,
    removeAttachment,
    renameAttachment,
    syncDraft,
    reset,
  }
}