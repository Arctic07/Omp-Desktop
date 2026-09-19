import { invoke } from '@tauri-apps/api/core'
import { getCurrentWebview, type DragDropEvent } from '@tauri-apps/api/webview'
import { open } from '@tauri-apps/plugin-dialog'

import type { ComposerAttachmentKind } from './composerAttachments'
import type { ModelEditorModel } from './modelSettings'

export interface DesktopApiError {
  code: string
  message: string
}

export interface ModelCatalogResponse {
  models: ModelEditorModel[]
}

export type FileEntryKind = 'dir' | 'file'

export interface FileEntry {
  name: string
  kind: FileEntryKind
  size: number
}

export type FileReadKind = 'text' | 'image' | 'binary' | 'tooLarge'

export interface FileReadResult {
  kind: FileReadKind
  content?: string
  dataUrl?: string
  size: number
}

export type ReviewLineType = 'add' | 'del' | 'context'

export interface ReviewLine {
  type: ReviewLineType
  text: string
}

export interface ReviewHunk {
  header: string
  lines: ReviewLine[]
}

export type ReviewFileStatus = 'added' | 'modified' | 'deleted' | 'renamed' | 'untracked'

export interface ReviewFile {
  path: string
  oldPath?: string
  status: ReviewFileStatus
  additions: number
  deletions: number
  binary: boolean
  tooLarge: boolean
  hunks: ReviewHunk[]
}

export interface WorkspaceReview {
  repo: boolean
  clean: boolean
  stagedFiles: ReviewFile[]
  unstagedFiles: ReviewFile[]
  truncated: boolean
  error?: string
}

export interface WorkspaceReviewDelta {
  stagedFiles: ReviewFile[]
  unstagedFiles: ReviewFile[]
}

export type ReviewDiffTarget = {
  section: 'staged' | 'unstaged'
  file: ReviewFile
}

export interface WorkspaceSearchMatch {
  kind: 'path' | 'content'
  path: string
  line?: number
  column?: number
  snippet?: string
}

export interface WorkspaceSearchResult {
  matches: WorkspaceSearchMatch[]
  truncated: boolean
  scannedFiles: number
}

export interface RevealWorkspaceFileResult {
  ok: boolean
}

export interface ComposerAttachmentRecord {
  path: string
  name: string
  kind: ComposerAttachmentKind
  mimeType: string
  size: number
}

export interface ComposerPasteFile {
  name: string
  mimeType: string
  data: string
}

export interface ImportComposerFilesResult {
  files: ComposerAttachmentRecord[]
  skippedDirectories: number
}

export type DesktopDragDropEvent = DragDropEvent

export interface DesktopApi {
  currentWorkingDirectory: () => Promise<string>
  chooseWorkspace: (title: string) => Promise<string | null>
  chooseFiles: (title: string) => Promise<string[]>
  currentWindowScaleFactor: () => Promise<number>
  listenDesktopDragDrop: (handler: (event: DesktopDragDropEvent) => void) => Promise<() => void>
  fetchModelCatalog: (endpoint: string, apiKey: string) => Promise<ModelCatalogResponse>
  listWorkspaceEntries: (root: string, path: string) => Promise<FileEntry[]>
  readWorkspaceFile: (root: string, path: string) => Promise<FileReadResult>
  revealWorkspaceFile: (root: string, path: string) => Promise<RevealWorkspaceFileResult>
  getWorkspaceReview: (root: string) => Promise<WorkspaceReview>
  stageWorkspaceFiles: (root: string, paths: string[]) => Promise<WorkspaceReviewDelta>
  unstageWorkspaceFiles: (root: string, paths: string[]) => Promise<WorkspaceReviewDelta>
  writeWorkspaceFile: (root: string, path: string, content: string) => Promise<void>
  commitWorkspace: (root: string, message: string) => Promise<void>
  pullWorkspace: (root: string) => Promise<void>
  searchWorkspaceFiles: (root: string, query: string, maxResults?: number) => Promise<WorkspaceSearchResult>
  saveComposerPaste: (sessionId: string, files: ComposerPasteFile[]) => Promise<ComposerAttachmentRecord[]>
  importComposerFiles: (sessionId: string, paths: string[]) => Promise<ImportComposerFilesResult>
}

export function isDesktopApiError(value: unknown): value is DesktopApiError {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return typeof candidate.code === 'string' && typeof candidate.message === 'string'
}

export function formatDesktopError(error: unknown, fallback: string): string {
  if (isDesktopApiError(error)) {
    return error.message
  }
  if (typeof error === 'string' && error.trim()) {
    return error
  }
  return fallback
}

export async function currentWorkingDirectory(): Promise<string> {
  return invoke<string>('current_working_directory')
}

export async function chooseWorkspace(title: string): Promise<string | null> {
  const selectedPath = await open({ directory: true, multiple: false, title })
  return typeof selectedPath === 'string' ? selectedPath : null
}

export async function chooseFiles(title: string): Promise<string[]> {
  const selectedPaths = await open({ directory: false, multiple: true, title })
  return Array.isArray(selectedPaths) ? selectedPaths : selectedPaths === null ? [] : [selectedPaths]
}

export async function currentWindowScaleFactor(): Promise<number> {
  const scaleFactor = await getCurrentWebview().window.scaleFactor()
  return scaleFactor > 0 ? scaleFactor : 1
}

export async function listenDesktopDragDrop(
  handler: (event: DesktopDragDropEvent) => void,
): Promise<() => void> {
  return getCurrentWebview().onDragDropEvent((event) => handler(event.payload))
}

export async function fetchModelCatalog(endpoint: string, apiKey: string): Promise<ModelCatalogResponse> {
  return invoke<ModelCatalogResponse>('fetch_model_candidates', { endpoint, api_key: apiKey })
}

export async function listWorkspaceEntries(root: string, path: string): Promise<FileEntry[]> {
  const result = await invoke<{ entries: FileEntry[] }>('list_workspace_entries', { root, path })
  return result.entries
}

export async function readWorkspaceFile(root: string, path: string): Promise<FileReadResult> {
  return invoke<FileReadResult>('read_workspace_file', { root, path })
}

export async function revealWorkspaceFile(root: string, path: string): Promise<RevealWorkspaceFileResult> {
  return invoke<RevealWorkspaceFileResult>('reveal_workspace_file', { root, path })
}

export async function getWorkspaceReview(root: string): Promise<WorkspaceReview> {
  return invoke<WorkspaceReview>('get_workspace_review', { root })
}

export async function stageWorkspaceFiles(root: string, paths: string[]): Promise<WorkspaceReviewDelta> {
  return invoke<WorkspaceReviewDelta>('stage_workspace_files', { root, paths })
}

export async function unstageWorkspaceFiles(root: string, paths: string[]): Promise<WorkspaceReviewDelta> {
  return invoke<WorkspaceReviewDelta>('unstage_workspace_files', { root, paths })
}

export async function writeWorkspaceFile(root: string, path: string, content: string): Promise<void> {
  await invoke<void>('write_workspace_file', { root, path, content })
}

export async function commitWorkspace(root: string, message: string): Promise<void> {
  await invoke<void>('commit_workspace', { root, message })
}

export async function pullWorkspace(root: string): Promise<void> {
  await invoke<void>('pull_workspace', { root })
}

export async function searchWorkspaceFiles(
  root: string,
  query: string,
  maxResults = 200,
): Promise<WorkspaceSearchResult> {
  return invoke<WorkspaceSearchResult>('search_workspace_files', {
    root,
    query,
    max_results: maxResults,
  })
}

export async function saveComposerPaste(
  sessionId: string,
  files: ComposerPasteFile[],
): Promise<ComposerAttachmentRecord[]> {
  return invoke<ComposerAttachmentRecord[]>('save_composer_paste', { sessionId, files })
}

export async function importComposerFiles(
  sessionId: string,
  paths: string[],
): Promise<ImportComposerFilesResult> {
  return invoke<ImportComposerFilesResult>('import_composer_files', { sessionId, paths })
}

export const desktopApi: DesktopApi = {
  currentWorkingDirectory,
  chooseWorkspace,
  chooseFiles,
  currentWindowScaleFactor,
  listenDesktopDragDrop,
  fetchModelCatalog,
  listWorkspaceEntries,
  readWorkspaceFile,
  revealWorkspaceFile,
  getWorkspaceReview,
  stageWorkspaceFiles,
  unstageWorkspaceFiles,
  writeWorkspaceFile,
  commitWorkspace,
  pullWorkspace,
  searchWorkspaceFiles,
  saveComposerPaste,
  importComposerFiles,
}
