import { invoke } from '@tauri-apps/api/core'

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

export interface DesktopApi {
  currentWorkingDirectory: () => Promise<string>
  listWorkspaceEntries: (root: string, path: string) => Promise<FileEntry[]>
  readWorkspaceFile: (root: string, path: string) => Promise<FileReadResult>
  revealWorkspaceFile: (root: string, path: string) => Promise<RevealWorkspaceFileResult>
  getWorkspaceReview: (root: string) => Promise<WorkspaceReview>
  stageWorkspaceFile: (root: string, path: string) => Promise<void>
  unstageWorkspaceFile: (root: string, path: string) => Promise<void>
  writeWorkspaceFile: (root: string, path: string, content: string) => Promise<void>
  commitWorkspace: (root: string, message: string) => Promise<void>
  pullWorkspace: (root: string) => Promise<void>
  searchWorkspaceFiles: (root: string, query: string, maxResults?: number) => Promise<WorkspaceSearchResult>
}

export async function currentWorkingDirectory(): Promise<string> {
  return invoke<string>('current_working_directory')
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

export async function stageWorkspaceFile(root: string, path: string): Promise<void> {
  await invoke<void>('stage_workspace_file', { root, path })
}

export async function unstageWorkspaceFile(root: string, path: string): Promise<void> {
  await invoke<void>('unstage_workspace_file', { root, path })
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

export const desktopApi: DesktopApi = {
  currentWorkingDirectory,
  listWorkspaceEntries,
  readWorkspaceFile,
  revealWorkspaceFile,
  getWorkspaceReview,
  stageWorkspaceFile,
  unstageWorkspaceFile,
  writeWorkspaceFile,
  commitWorkspace,
  pullWorkspace,
  searchWorkspaceFiles,
}
