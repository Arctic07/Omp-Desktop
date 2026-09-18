import { computed, onUnmounted, ref, watch, type ComputedRef, type Ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import { copyText } from '../utils/clipboard'
import {
  listWorkspaceEntries,
  readWorkspaceFile,
  revealWorkspaceFile,
  searchWorkspaceFiles,
  writeWorkspaceFile,
  type FileEntry,
  type FileReadResult,
  type WorkspaceSearchMatch,
  type WorkspaceSearchResult,
} from '../utils/desktopApi'
import { highlightSourceCode, resolveSourceSyntaxLanguage } from '../utils/sourceSyntaxHighlighter'
import type { SourceHighlightedLines } from '../utils/sourceSyntaxHighlighter'
import type { SourceCopy } from '../i18n'
import type { AppIconName } from '../components/icons'

export interface WorkspaceFilePanelRequestedFile {
  path: string
  seq: number
}

export interface WorkspaceFilePanelOptions {
  workspacePath: Readonly<Ref<string | null>>
  requestedFile: Readonly<Ref<WorkspaceFilePanelRequestedFile | null | undefined>>
  refreshToken: Readonly<Ref<number | undefined>>
}

interface TreeRow {
  path: string
  entry: FileEntry
  depth: number
}

type FileTypeClassName =
  | 'omp-source-file-type-plain'
  | 'omp-source-file-type-typescript'
  | 'omp-source-file-type-javascript'
  | 'omp-source-file-type-json'
  | 'omp-source-file-type-css'
  | 'omp-source-file-type-html'
  | 'omp-source-file-type-markdown'
  | 'omp-source-file-type-rust'
  | 'omp-source-file-type-python'
  | 'omp-source-file-type-go'
  | 'omp-source-file-type-shell'
  | 'omp-source-file-type-config'
  | 'omp-source-file-type-sql'
  | 'omp-source-file-type-swift'
  | 'omp-source-file-type-kotlin'
  | 'omp-source-file-type-java'
  | 'omp-source-file-type-c'
  | 'omp-source-file-type-image'
  | 'omp-source-file-type-directory'

interface FileTypeMeta {
  icon: AppIconName
  className: FileTypeClassName
  label: string
}

interface SearchCacheEntry {
  expiresAt: number
  result: WorkspaceSearchResult
}

export interface WorkspaceFilePanelState {
  copy: ComputedRef<SourceCopy>
  workspaceLabel: ComputedRef<string>
  rootLoading: ComputedRef<boolean>
  rootError: ComputedRef<string | null>
  hasRootEntries: ComputedRef<boolean>
  expandedDirectories: Ref<Set<string>>
  collapseAllDirectories(): void
  searchQuery: Ref<string>
  clearFileSearch(): void
  searchActive: ComputedRef<boolean>
  searchLoading: Ref<boolean>
  searchError: Ref<string | null>
  searchResults: Ref<WorkspaceSearchMatch[]>
  searchMatchAriaLabel(match: WorkspaceSearchMatch): string
  getFileTypeMeta(path: string, isDirectory?: boolean): FileTypeMeta
  fileNameForPath(path: string): string
  searchMatchLocation(match: WorkspaceSearchMatch): string
  searchMatchKindLabel(match: WorkspaceSearchMatch): string
  searchTruncated: Ref<boolean>
  retrySearch(): void
  visibleTreeRows: ComputedRef<TreeRow[]>
  isDirectoryExpanded(path: string): boolean
  isDirectoryLoading(path: string): boolean
  getDirectoryError(path: string): string | null
  retryDirectory(path: string): void
  openTreeRow(row: TreeRow): void
  openFile(path: string): Promise<void>
  refreshWorkspace(): Promise<void>
  selectedPath: Ref<string | null>
  DEFAULT_FILE_TYPE: FileTypeMeta
  selectedFileType: ComputedRef<FileTypeMeta>
  backToTree(): void
  selectedFileName: ComputedRef<string>
  revealSelectedFile(): Promise<void>
  fileResult: Ref<FileReadResult | null>
  editing: Ref<boolean>
  copied: Ref<boolean>
  copySelectedFile(): Promise<void>
  canEditSelectedFile: ComputedRef<boolean>
  startEditing(): void
  saveLoading: Ref<boolean>
  saveSelectedFile(): Promise<void>
  cancelEditing(): void
  saveError: Ref<string | null>
  saveSuccess: Ref<boolean>
  revealError: Ref<string | null>
  copyError: Ref<string | null>
  fileLoading: Ref<boolean>
  fileError: Ref<string | null>
  retrySelectedFile(): void
  selectedFileSize: ComputedRef<number | null>
  formatBytes(value: number): string
  highlightError: Ref<string | null>
  draftContent: Ref<string>
  highlightedLines: Ref<SourceHighlightedLines>
}
const SEARCH_DEBOUNCE_MS = 180
const SEARCH_RESULT_LIMIT = 200
const SEARCH_CACHE_TTL_MS = 30_000
const SEARCH_CACHE_MAX_ENTRIES = 24

export function useWorkspaceFilePanel(options: WorkspaceFilePanelOptions): WorkspaceFilePanelState {
  const { copy, settings } = useAppSettings()

  const directoryEntries = ref<Record<string, FileEntry[]>>({})
  const directoryErrors = ref<Record<string, string>>({})
  const loadingDirectories = ref<Set<string>>(new Set())
  const expandedDirectories = ref<Set<string>>(new Set())
  const selectedPath = ref<string | null>(null)
  const fileResult = ref<FileReadResult | null>(null)
  const fileLoading = ref(false)
  const fileError = ref<string | null>(null)
  const revealError = ref<string | null>(null)
  const copyError = ref<string | null>(null)
  const copied = ref(false)
  const highlightedLines = ref<SourceHighlightedLines>([])
  const highlightError = ref<string | null>(null)
  const searchQuery = ref('')
  const searchResults = ref<WorkspaceSearchMatch[]>([])
  const searchLoading = ref(false)
  const searchError = ref<string | null>(null)
  const searchTruncated = ref(false)
  const searchScannedFiles = ref(0)
  const editing = ref(false)
  const draftContent = ref('')
  const saveLoading = ref(false)
  const saveError = ref<string | null>(null)
  const saveSuccess = ref(false)

  let workspaceGeneration = 0
  let directoryRequestSequence = 0
  let fileRequestSequence = 0
  let highlightRequestSequence = 0
  let searchRequestSequence = 0
  let saveRequestSequence = 0
  let copyResetTimer: number | null = null
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
  const currentDirectoryRequests = new Map<string, number>()
  const searchCache = new Map<string, SearchCacheEntry>()
const themeName = computed<'github-dark' | 'github-light'>(() => {
  if (settings.theme === 'dark') return 'github-dark'
  if (settings.theme === 'light') return 'github-light'
  if (typeof document !== 'undefined' && document.body.hasAttribute('data-ds-dark-theme')) {
    return 'github-dark'
  }
  return 'github-light'
})

const rootEntries = computed<FileEntry[]>(() => directoryEntries.value[''] ?? [])
const rootLoading = computed<boolean>(() => loadingDirectories.value.has(''))
const rootError = computed<string | null>(() => directoryErrors.value[''] ?? null)
const hasRootEntries = computed<boolean>(() => rootEntries.value.length > 0)
const workspaceLabel = computed<string>(() => {
  const workspacePath = options.workspacePath.value
  if (workspacePath === null) return ''
  const normalizedPath = workspacePath.replaceAll('\\', '/').replace(/\/+$/, '')
  const segments = normalizedPath.split('/')
  return segments[segments.length - 1] || normalizedPath
})
const selectedFileName = computed<string>(() => fileNameForPath(selectedPath.value ?? ''))
const selectedFileSize = computed<number | null>(() => fileResult.value?.size ?? null)
const selectedFileType = computed<FileTypeMeta>(() => getFileTypeMeta(selectedPath.value ?? ''))
const canEditSelectedFile = computed<boolean>(() => selectedPath.value !== null && fileResult.value?.kind === 'text' && !fileLoading.value)
const trimmedSearchQuery = computed<string>(() => searchQuery.value.trim())
const searchActive = computed<boolean>(() => trimmedSearchQuery.value.length > 0)

const visibleTreeRows = computed<TreeRow[]>(() => {
  const rows: TreeRow[] = []

  function appendRows(directoryPath: string, depth: number): void {
    const entries = directoryEntries.value[directoryPath] ?? []
    for (const entry of entries) {
      const path = directoryPath.length > 0 ? `${directoryPath}/${entry.name}` : entry.name
      rows.push({ path, entry, depth })
      if (entry.kind === 'dir' && expandedDirectories.value.has(path)) {
        appendRows(path, depth + 1)
      }
    }
  }

  appendRows('', 0)
  return rows
})

function createFileType(icon: AppIconName, className: FileTypeClassName, label: string): FileTypeMeta {
  return { icon, className, label }
}

const DEFAULT_FILE_TYPE = createFileType('file-text', 'omp-source-file-type-plain', 'text')
const DIRECTORY_FILE_TYPE = createFileType('folder', 'omp-source-file-type-directory', 'folder')
const FILE_TYPE_BY_EXTENSION: Readonly<Record<string, FileTypeMeta>> = {
  ts: createFileType('code-2', 'omp-source-file-type-typescript', 'TypeScript'),
  tsx: createFileType('code-2', 'omp-source-file-type-typescript', 'TypeScript JSX'),
  js: createFileType('code', 'omp-source-file-type-javascript', 'JavaScript'),
  jsx: createFileType('code', 'omp-source-file-type-javascript', 'JavaScript JSX'),
  json: createFileType('file-spreadsheet', 'omp-source-file-type-json', 'JSON'),
  css: createFileType('palette', 'omp-source-file-type-css', 'CSS'),
  html: createFileType('globe-2', 'omp-source-file-type-html', 'HTML'),
  md: createFileType('book-open', 'omp-source-file-type-markdown', 'Markdown'),
  rs: createFileType('wrench', 'omp-source-file-type-rust', 'Rust'),
  py: createFileType('code-2', 'omp-source-file-type-python', 'Python'),
  go: createFileType('workflow', 'omp-source-file-type-go', 'Go'),
  sh: createFileType('terminal', 'omp-source-file-type-shell', 'Shell'),
  zsh: createFileType('terminal', 'omp-source-file-type-shell', 'Shell'),
  bash: createFileType('terminal', 'omp-source-file-type-shell', 'Shell'),
  yml: createFileType('sliders-horizontal', 'omp-source-file-type-config', 'YAML'),
  yaml: createFileType('sliders-horizontal', 'omp-source-file-type-config', 'YAML'),
  toml: createFileType('sliders-horizontal', 'omp-source-file-type-config', 'TOML'),
  sql: createFileType('database', 'omp-source-file-type-sql', 'SQL'),
  swift: createFileType('sparkles', 'omp-source-file-type-swift', 'Swift'),
  kt: createFileType('code', 'omp-source-file-type-kotlin', 'Kotlin'),
  java: createFileType('server', 'omp-source-file-type-java', 'Java'),
  c: createFileType('code-2', 'omp-source-file-type-c', 'C'),
  h: createFileType('code-2', 'omp-source-file-type-c', 'C Header'),
  cpp: createFileType('code-2', 'omp-source-file-type-c', 'C++'),
  hpp: createFileType('code-2', 'omp-source-file-type-c', 'C++ Header'),
  png: createFileType('image', 'omp-source-file-type-image', 'Image'),
  jpg: createFileType('image', 'omp-source-file-type-image', 'Image'),
  jpeg: createFileType('image', 'omp-source-file-type-image', 'Image'),
  gif: createFileType('image', 'omp-source-file-type-image', 'Image'),
  webp: createFileType('image', 'omp-source-file-type-image', 'Image'),
  svg: createFileType('image', 'omp-source-file-type-image', 'Image'),
  bmp: createFileType('image', 'omp-source-file-type-image', 'Image'),
  ico: createFileType('image', 'omp-source-file-type-image', 'Image'),
  avif: createFileType('image', 'omp-source-file-type-image', 'Image'),
}
const FILE_TYPE_BY_BASENAME: Readonly<Record<string, FileTypeMeta>> = {
  '.gitignore': createFileType('git-fork', 'omp-source-file-type-config', 'Git Ignore'),
  '.gitattributes': createFileType('git-fork', 'omp-source-file-type-config', 'Git Attributes'),
  dockerfile: createFileType('sliders-horizontal', 'omp-source-file-type-config', 'Dockerfile'),
  'compose.yml': createFileType('sliders-horizontal', 'omp-source-file-type-config', 'Compose YAML'),
  'compose.yaml': createFileType('sliders-horizontal', 'omp-source-file-type-config', 'Compose YAML'),
  'start-web.sh': createFileType('terminal', 'omp-source-file-type-shell', 'Shell'),
}

function normalizeRequestedPath(path: string, workspacePath: string | null = options.workspacePath.value): string {
  const normalizedPath = path.trim().replaceAll('\\', '/').replace(/^\.\/+/, '').replace(/\/{2,}/g, '/')
  if (normalizedPath.length === 0 || workspacePath === null) return normalizedPath

  const normalizedRoot = workspacePath.trim().replaceAll('\\', '/').replace(/\/{2,}/g, '/').replace(/\/+$/, '')
  if (normalizedRoot.length === 0) return normalizedPath

  const comparablePath = normalizedPath.toLocaleLowerCase()
  const comparableRoot = normalizedRoot.toLocaleLowerCase()
  if (comparablePath === comparableRoot) return ''
  const rootPrefix = `${comparableRoot}/`
  if (comparablePath.startsWith(rootPrefix)) {
    return normalizedPath.slice(normalizedRoot.length + 1)
  }

  const workspaceName = fileNameForPath(normalizedRoot)
  const workspacePrefix = `${workspaceName.toLocaleLowerCase()}/`
  if (comparablePath.startsWith(workspacePrefix)) {
    return normalizedPath.slice(workspaceName.length + 1)
  }
  return normalizedPath
}
function fileNameForPath(path: string): string {
  const normalizedPath = path.replaceAll('\\', '/')
  const segments = normalizedPath.split('/')
  return segments[segments.length - 1] || normalizedPath
}

function extensionForPath(path: string): string {
  const fileName = fileNameForPath(path)
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === fileName.length - 1) return ''
  return fileName.slice(dotIndex + 1).toLowerCase()
}

function getFileTypeMeta(path: string, isDirectory = false): FileTypeMeta {
  if (isDirectory) return DIRECTORY_FILE_TYPE
  const fileName = fileNameForPath(path).toLowerCase()
  return FILE_TYPE_BY_BASENAME[fileName] ?? FILE_TYPE_BY_EXTENSION[extensionForPath(path)] ?? DEFAULT_FILE_TYPE
}

function sortDirectoryEntries(entries: FileEntry[]): FileEntry[] {
  return [...entries].sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'dir' ? -1 : 1
    return left.name.localeCompare(right.name, undefined, { sensitivity: 'base' })
  })
}

function describeError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) return error.message
  if (typeof error === 'string' && error.trim().length > 0) return error
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message
    if (typeof message === 'string' && message.trim().length > 0) return message
  }
  return fallback
}

function setDirectoryLoading(path: string, loading: boolean): void {
  const next = new Set(loadingDirectories.value)
  if (loading) next.add(path)
  else next.delete(path)
  loadingDirectories.value = next
}

function clearDirectoryError(path: string): void {
  if (directoryErrors.value[path] === undefined) return
  const next = { ...directoryErrors.value }
  delete next[path]
  directoryErrors.value = next
}

function isDirectoryLoading(path: string): boolean {
  return loadingDirectories.value.has(path)
}

function getDirectoryError(path: string): string | null {
  return directoryErrors.value[path] ?? null
}

function isDirectoryExpanded(path: string): boolean {
  return expandedDirectories.value.has(path)
}

async function loadDirectory(path: string, force = false): Promise<void> {
  const root = options.workspacePath.value
  if (root === null) return
  if (!force && directoryEntries.value[path] !== undefined) return

  const generation = workspaceGeneration
  const request = ++directoryRequestSequence
  currentDirectoryRequests.set(path, request)
  setDirectoryLoading(path, true)
  clearDirectoryError(path)

  try {
    const entries = await listWorkspaceEntries(root, path)
    if (generation !== workspaceGeneration || currentDirectoryRequests.get(path) !== request) return
    directoryEntries.value = {
      ...directoryEntries.value,
      [path]: sortDirectoryEntries(entries),
    }
  } catch (error) {
    if (generation !== workspaceGeneration || currentDirectoryRequests.get(path) !== request) return
    directoryErrors.value = {
      ...directoryErrors.value,
      [path]: describeError(error, copy.value.panelError),
    }
  } finally {
    if (currentDirectoryRequests.get(path) === request) {
      currentDirectoryRequests.delete(path)
      setDirectoryLoading(path, false)
    }
  }
}

function toggleDirectory(path: string): void {
  const next = new Set(expandedDirectories.value)
  if (next.has(path)) {
    next.delete(path)
    expandedDirectories.value = next
    return
  }

  next.add(path)
  expandedDirectories.value = next
  if (directoryEntries.value[path] === undefined && !isDirectoryLoading(path)) {
    void loadDirectory(path)
  }
}

function collapseAllDirectories(): void {
  if (expandedDirectories.value.size === 0) return
  expandedDirectories.value = new Set()
}

function openTreeRow(row: TreeRow): void {
  if (row.entry.kind === 'dir') {
    toggleDirectory(row.path)
    return
  }
  void openFile(row.path)
}

function isCurrentFileRequest(request: number, generation: number): boolean {
  return request === fileRequestSequence && generation === workspaceGeneration
}

async function renderTextHighlight(
  content: string,
  path: string,
  fileRequest: number,
  generation: number,
): Promise<void> {
  const language = resolveSourceSyntaxLanguage(extensionForPath(path))
  const request = ++highlightRequestSequence
  highlightedLines.value = []
  highlightError.value = null
  if (language === null) return

  try {
    const highlighted = await highlightSourceCode(content, language, themeName.value)
    if (!isCurrentFileRequest(fileRequest, generation) || request !== highlightRequestSequence) return
    highlightedLines.value = highlighted
  } catch (error) {
    if (!isCurrentFileRequest(fileRequest, generation) || request !== highlightRequestSequence) return
    highlightError.value = describeError(error, 'Syntax highlighting is unavailable; showing plain text.')
  }
}
async function openFile(path: string): Promise<void> {
  const normalizedPath = normalizeRequestedPath(path, options.workspacePath.value)
  if (normalizedPath.length === 0) return

  const request = ++fileRequestSequence
  const generation = workspaceGeneration
  saveRequestSequence += 1
  editing.value = false
  draftContent.value = ''
  saveLoading.value = false
  saveError.value = null
  saveSuccess.value = false
  selectedPath.value = normalizedPath
  fileResult.value = null
  fileLoading.value = true
  fileError.value = null
  revealError.value = null
  copyError.value = null
  copied.value = false
  highlightedLines.value = []
  highlightError.value = null
  highlightRequestSequence += 1

  const root = options.workspacePath.value
  if (root === null) {
    fileLoading.value = false
    fileError.value = copy.value.fileNoWorkspace
    return
  }

  try {
    const result = await readWorkspaceFile(root, normalizedPath)
    if (!isCurrentFileRequest(request, generation)) return
    fileResult.value = result
    fileLoading.value = false
    if (result.kind === 'text') {
      draftContent.value = result.content ?? ''
      void renderTextHighlight(result.content ?? '', normalizedPath, request, generation)
    }
  } catch (error) {
    if (!isCurrentFileRequest(request, generation)) return
    fileLoading.value = false
    fileError.value = describeError(error, copy.value.fileError)
  }
}

function startEditing(): void {
  const result = fileResult.value
  if (!canEditSelectedFile.value || result?.kind !== 'text') return
  draftContent.value = result.content ?? ''
  editing.value = true
  saveError.value = null
  saveSuccess.value = false
}

function cancelEditing(): void {
  if (saveLoading.value) return
  const result = fileResult.value
  if (result?.kind === 'text') draftContent.value = result.content ?? ''
  editing.value = false
  saveError.value = null
  saveSuccess.value = false
}

async function saveSelectedFile(): Promise<void> {
  const root = options.workspacePath.value
  const path = selectedPath.value
  const result = fileResult.value
  if (root === null || path === null || result?.kind !== 'text' || saveLoading.value) return

  const content = draftContent.value
  const request = fileRequestSequence
  const generation = workspaceGeneration
  const saveRequest = ++saveRequestSequence
  saveLoading.value = true
  saveError.value = null
  saveSuccess.value = false

  try {
    await writeWorkspaceFile(root, path, content)
    if (saveRequest !== saveRequestSequence || !isCurrentFileRequest(request, generation) || selectedPath.value !== path) return
    const currentResult = fileResult.value
    if (currentResult?.kind !== 'text') return
    fileResult.value = { ...currentResult, content }
    editing.value = false
    saveLoading.value = false
    saveSuccess.value = true
    void renderTextHighlight(content, path, request, generation)
  } catch (error) {
    if (saveRequest !== saveRequestSequence || !isCurrentFileRequest(request, generation) || selectedPath.value !== path) return
    saveLoading.value = false
    saveError.value = describeError(error, copy.value.fileSaveError)
  }
}

function resetEditorState(): void {
  saveRequestSequence += 1
  editing.value = false
  draftContent.value = ''
  saveLoading.value = false
  saveError.value = null
  saveSuccess.value = false
}

function backToTree(): void {
  fileRequestSequence += 1
  highlightRequestSequence += 1
  resetEditorState()
  selectedPath.value = null
  fileResult.value = null
  fileLoading.value = false
  fileError.value = null
  revealError.value = null
  copyError.value = null
  copied.value = false
  highlightedLines.value = []
  highlightError.value = null
}

function clearSearchDebounce(): void {
  if (searchDebounceTimer === null) return
  clearTimeout(searchDebounceTimer)
  searchDebounceTimer = null
}

function clearSearchState(): void {
  searchRequestSequence += 1
  clearSearchDebounce()
  searchLoading.value = false
  searchError.value = null
  searchResults.value = []
  searchTruncated.value = false
  searchScannedFiles.value = 0
}

function searchCacheKey(root: string, query: string): string {
  return `${root}\u0000${query.toLocaleLowerCase()}`
}

function getCachedSearchResult(root: string, query: string): WorkspaceSearchResult | null {
  const key = searchCacheKey(root, query)
  const cached = searchCache.get(key)
  if (cached === undefined) return null
  if (cached.expiresAt <= Date.now()) {
    searchCache.delete(key)
    return null
  }
  return cached.result
}

function cacheSearchResult(root: string, query: string, result: WorkspaceSearchResult): void {
  const key = searchCacheKey(root, query)
  if (searchCache.size >= SEARCH_CACHE_MAX_ENTRIES && !searchCache.has(key)) {
    const oldestKey = searchCache.keys().next().value
    if (typeof oldestKey === 'string') searchCache.delete(oldestKey)
  }
  searchCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, result })
}

function isCurrentSearch(request: number, root: string, query: string): boolean {
  return request === searchRequestSequence && options.workspacePath.value === root && trimmedSearchQuery.value === query
}

function applySearchResult(request: number, root: string, query: string, result: WorkspaceSearchResult): boolean {
  if (!isCurrentSearch(request, root, query)) return false
  searchResults.value = result.matches
  searchTruncated.value = result.truncated
  searchScannedFiles.value = result.scannedFiles
  searchError.value = null
  searchLoading.value = false
  return true
}

async function runWorkspaceSearch(root: string, query: string, request: number): Promise<void> {
  const cached = getCachedSearchResult(root, query)
  if (cached !== null) {
    applySearchResult(request, root, query, cached)
    return
  }
  if (!isCurrentSearch(request, root, query)) return

  searchLoading.value = true
  try {
    const result = await searchWorkspaceFiles(root, query, SEARCH_RESULT_LIMIT)
    if (!isCurrentSearch(request, root, query)) return
    cacheSearchResult(root, query, result)
    applySearchResult(request, root, query, result)
  } catch (error) {
    if (!isCurrentSearch(request, root, query)) return
    searchLoading.value = false
    searchError.value = describeError(error, copy.value.panelError)
  } finally {
    if (isCurrentSearch(request, root, query)) searchLoading.value = false
  }
}

function queueWorkspaceSearch(root: string, query: string, request: number): void {
  clearSearchDebounce()
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null
    void runWorkspaceSearch(root, query, request)
  }, SEARCH_DEBOUNCE_MS)
}

function retrySearch(): void {
  const root = options.workspacePath.value
  const query = trimmedSearchQuery.value
  if (root === null || query.length === 0) return
  clearSearchDebounce()
  const request = ++searchRequestSequence
  searchError.value = null
  searchLoading.value = true
  void runWorkspaceSearch(root, query, request)
}

function clearFileSearch(): void {
  searchQuery.value = ''
}

async function refreshWorkspace(): Promise<void> {
  const root = options.workspacePath.value
  if (root === null) return
  const directoriesToRefresh = [...expandedDirectories.value]
  const fileToRefresh = selectedPath.value
  workspaceGeneration += 1
  fileRequestSequence += 1
  highlightRequestSequence += 1
  resetEditorState()
  searchCache.clear()
  directoryEntries.value = {}
  directoryErrors.value = {}
  loadingDirectories.value = new Set()
  currentDirectoryRequests.clear()
  await loadDirectory('', true)
  for (const path of directoriesToRefresh) {
    void loadDirectory(path, true)
  }
  if (fileToRefresh !== null) {
    void openFile(fileToRefresh)
  }
  if (trimmedSearchQuery.value.length > 0) retrySearch()
}

function retryDirectory(path: string): void {
  void loadDirectory(path, true)
}

function retrySelectedFile(): void {
  const path = selectedPath.value
  if (path !== null) void openFile(path)
}

async function revealSelectedFile(): Promise<void> {
  const root = options.workspacePath.value
  const path = selectedPath.value
  if (root === null || path === null) return

  const generation = workspaceGeneration
  const request = fileRequestSequence
  revealError.value = null
  try {
    const result = await revealWorkspaceFile(root, path)
    if (!isCurrentFileRequest(request, generation) || selectedPath.value !== path) return
    if (!result.ok) revealError.value = copy.value.fileRevealError
  } catch (error) {
    if (isCurrentFileRequest(request, generation) && selectedPath.value === path) {
      revealError.value = describeError(error, copy.value.fileRevealError)
    }
  }
}

async function copySelectedFile(): Promise<void> {
  const result = fileResult.value
  if (result?.kind !== 'text') {
    return
  }

  const request = fileRequestSequence
  copyError.value = null
  const copiedSuccessfully = await copyText(result.content ?? '')
  if (!isCurrentFileRequest(request, workspaceGeneration)) {
    return
  }
  if (!copiedSuccessfully) {
    copyError.value = copy.value.fileError
    return
  }

  copied.value = true
  if (copyResetTimer !== null) {
    window.clearTimeout(copyResetTimer)
  }
  copyResetTimer = window.setTimeout(() => {
    copied.value = false
    copyResetTimer = null
  }, 1600)
}

function searchMatchKindLabel(match: WorkspaceSearchMatch): string {
  return match.kind === 'path' ? copy.value.fileSearchResultPath : copy.value.fileSearchResultContent
}

function searchMatchLocation(match: WorkspaceSearchMatch): string {
  if (!Number.isInteger(match.line) || (match.line ?? 0) < 1) return ''
  if (!Number.isInteger(match.column) || (match.column ?? 0) < 1) return `${match.line}`
  return `${match.line}:${match.column}`
}

function searchMatchAriaLabel(match: WorkspaceSearchMatch): string {
  const location = searchMatchLocation(match)
  const kind = searchMatchKindLabel(match)
  return location.length > 0 ? `${fileNameForPath(match.path)} — ${kind}, ${location}` : `${fileNameForPath(match.path)} — ${kind}`
}

watch(
  [() => options.workspacePath.value, () => options.requestedFile.value, () => options.refreshToken.value],
  ([workspacePath, requestedFile, refreshToken], previousValues) => {
    const previousWorkspacePath = previousValues?.[0]
    const previousRequestedFile = previousValues?.[1]
    const previousRefreshToken = previousValues?.[2]
    const workspaceChanged = workspacePath !== previousWorkspacePath
    const refreshRequested = !workspaceChanged && refreshToken !== previousRefreshToken
    if (workspaceChanged) {
      workspaceGeneration += 1
      currentDirectoryRequests.clear()
      directoryEntries.value = {}
      directoryErrors.value = {}
      loadingDirectories.value = new Set()
      expandedDirectories.value = new Set()
      fileRequestSequence += 1
      highlightRequestSequence += 1
      selectedPath.value = null
      fileResult.value = null
      fileLoading.value = false
      fileError.value = null
      revealError.value = null
      copyError.value = null
      copied.value = false
      highlightedLines.value = []
      highlightError.value = null
      resetEditorState()
      searchCache.clear()
      searchQuery.value = ''
      clearSearchState()
      if (workspacePath !== null) void loadDirectory('')
    } else if (refreshRequested && workspacePath !== null) {
      void refreshWorkspace()
    }

    if (requestedFile !== undefined && requestedFile !== null && (workspaceChanged || requestedFile !== previousRequestedFile)) {
      void openFile(requestedFile.path)
    }
  },
  { immediate: true },
)

watch(
  [() => options.workspacePath.value, searchQuery],
  ([workspacePath, query]) => {
    clearSearchDebounce()
    searchRequestSequence += 1
    searchResults.value = []
    searchError.value = null
    searchTruncated.value = false
    searchScannedFiles.value = 0
    const normalizedQuery = query.trim()
    if (workspacePath === null || normalizedQuery.length === 0) {
      searchLoading.value = false
      return
    }
    searchLoading.value = true
    queueWorkspaceSearch(workspacePath, normalizedQuery, searchRequestSequence)
  },
  { immediate: true },
)

watch(
  () => settings.theme,
  () => {
    const path = selectedPath.value
    const result = fileResult.value
    if (path !== null && result?.kind === 'text' && !fileLoading.value) {
      void renderTextHighlight(result.content ?? '', path, fileRequestSequence, workspaceGeneration)
    }
  },
)

onUnmounted(() => {
  workspaceGeneration += 1
  fileRequestSequence += 1
  highlightRequestSequence += 1
  saveRequestSequence += 1
  searchRequestSequence += 1
  clearSearchDebounce()
  searchCache.clear()
  if (copyResetTimer !== null && typeof window !== 'undefined') {
    window.clearTimeout(copyResetTimer)
    copyResetTimer = null
  }
})

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '—'
  if (value < 1024) return `${Math.round(value)} B`
  const units = ['KiB', 'MiB', 'GiB', 'TiB']
  let amount = value / 1024
  let unitIndex = 0
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024
    unitIndex += 1
  }
  return `${amount.toFixed(amount >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

  return {
    copy,
    workspaceLabel,
    rootLoading,
    rootError,
    hasRootEntries,
    expandedDirectories,
    collapseAllDirectories,
    searchQuery,
    clearFileSearch,
    searchActive,
    searchLoading,
    searchError,
    searchResults,
    searchMatchAriaLabel,
    getFileTypeMeta,
    fileNameForPath,
    searchMatchLocation,
    searchMatchKindLabel,
    searchTruncated,
    retrySearch,
    visibleTreeRows,
    isDirectoryExpanded,
    isDirectoryLoading,
    getDirectoryError,
    retryDirectory,
    openTreeRow,
    openFile,
    refreshWorkspace,
    selectedPath,
    DEFAULT_FILE_TYPE,
    selectedFileType,
    backToTree,
    selectedFileName,
    revealSelectedFile,
    fileResult,
    editing,
    copied,
    copySelectedFile,
    canEditSelectedFile,
    startEditing,
    saveLoading,
    saveSelectedFile,
    cancelEditing,
    saveError,
    saveSuccess,
    revealError,
    copyError,
    fileLoading,
    fileError,
    retrySelectedFile,
    selectedFileSize,
    formatBytes,
    highlightError,
    draftContent,
    highlightedLines,
  }
}