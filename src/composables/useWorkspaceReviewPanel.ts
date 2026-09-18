import { computed, ref, toValue, watch, type ComputedRef, type MaybeRefOrGetter, type Ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import {
  commitWorkspace,
  getWorkspaceReview,
  pullWorkspace,
  stageWorkspaceFiles,
  unstageWorkspaceFiles,
  type ReviewDiffTarget,
  type ReviewFile,
  type ReviewHunk,
  type WorkspaceReview,
  type WorkspaceReviewDelta,
} from '../utils/desktopApi'
import type { SourceCopy } from '../i18n'

export type ReviewLineType = ReviewHunk['lines'][number]['type']
export type ReviewSection = 'staged' | 'unstaged'

export interface ReviewSectionView {
  id: ReviewSection
  label: string
  files: ReviewFile[]
  additions: number
  deletions: number
  actionLabel: string
  actionIcon: 'plus' | 'minus'
}

export interface WorkspaceReviewPanelOptions {
  onOpenDiff(target: ReviewDiffTarget): void
  onRefreshWorkspace(): void
}

export interface WorkspaceReviewPanelState {
  copy: ComputedRef<SourceCopy>
  review: Ref<WorkspaceReview | null>
  loading: Ref<boolean>
  reviewFailure: ComputedRef<string>
  actionError: Ref<string>
  reviewSections: ComputedRef<ReviewSectionView[]>
  changedFilesCount: ComputedRef<number>
  changedLabel: ComputedRef<string>
  totalAdditions: ComputedRef<number>
  totalDeletions: ComputedRef<number>
  gitOperationBusy: ComputedRef<boolean>
  canCommit: ComputedRef<boolean>
  workspaceLabel: ComputedRef<string>
  pullLoading: Ref<boolean>
  commitMessage: Ref<string>
  commitLoading: Ref<boolean>
  operationNotice: Ref<string>
  operationStatus: ComputedRef<string>
  refreshReview(clearActionError?: boolean): Promise<void>
  pullChanges(): Promise<void>
  commitChanges(): Promise<void>
  isSectionExpanded(section: ReviewSection): boolean
  toggleSection(section: ReviewSection): void
  isActionActive(key: string): boolean
  sectionActionKey(section: ReviewSection): string
  runSectionAction(section: ReviewSection): Promise<void>
  fileKey(section: ReviewSection, file: ReviewFile): string
  fileDetailsId(section: ReviewSection, index: number): string
  fileActionKey(section: ReviewSection, file: ReviewFile): string
  isFileExpanded(section: ReviewSection, file: ReviewFile): boolean
  toggleFile(section: ReviewSection, file: ReviewFile): void
  fileToggleLabel(section: ReviewSection, file: ReviewFile): string
  fileOpenLabel(file: ReviewFile): string
  hunkKey(section: ReviewSection, file: ReviewFile, hunk: ReviewHunk, index: number): string
  linePrefix(type: ReviewLineType): string
  statusLetter(file: ReviewFile): string
  openFile(section: ReviewSection, file: ReviewFile): void
  runFileAction(section: ReviewSection, file: ReviewFile): Promise<void>
}

export function useWorkspaceReviewPanel(
  workspacePath: MaybeRefOrGetter<string | null>,
  options: WorkspaceReviewPanelOptions,
): WorkspaceReviewPanelState {
  const { copy } = useAppSettings()
  const workspacePathValue = computed(() => toValue(workspacePath))
  const review = ref<WorkspaceReview | null>(null)
  const loading = ref(false)
  const requestError = ref('')
  const actionError = ref('')
  const expandedSections = ref<Record<ReviewSection, boolean>>({ staged: true, unstaged: true })
  const expandedFiles = ref<Set<string>>(new Set())
  const activeActionKey = ref<string | null>(null)
  const commitMessage = ref('')
  const commitLoading = ref(false)
  const pullLoading = ref(false)
  const operationNotice = ref('')
  let requestToken = 0
  let actionToken = 0

  const statusLetters: Record<ReviewFile['status'], string> = {
    added: 'A',
    modified: 'M',
    deleted: 'D',
    renamed: 'R',
    untracked: 'U',
  }

  const reviewFailure = computed(() => requestError.value || review.value?.error || '')

  function summarizeFiles(files: ReviewFile[]): { additions: number; deletions: number } {
    let additions = 0
    let deletions = 0
    for (const file of files) {
      additions += file.additions
      deletions += file.deletions
    }
    return { additions, deletions }
  }

  const reviewSections = computed<ReviewSectionView[]>(() => {
    const stagedFiles = review.value?.stagedFiles ?? []
    const unstagedFiles = review.value?.unstagedFiles ?? []
    return [
      {
        id: 'staged',
        label: copy.value.reviewStagedChanges,
        files: stagedFiles,
        ...summarizeFiles(stagedFiles),
        actionLabel: copy.value.reviewUnstageAll,
        actionIcon: 'minus',
      },
      {
        id: 'unstaged',
        label: copy.value.reviewChanges,
        files: unstagedFiles,
        ...summarizeFiles(unstagedFiles),
        actionLabel: copy.value.reviewStageAll,
        actionIcon: 'plus',
      },
    ]
  })
  const changedFilesCount = computed(() => reviewSections.value.reduce((count, section) => count + section.files.length, 0))
  const changedLabel = computed(() => copy.value.reviewFilesChanged.replace('{count}', String(changedFilesCount.value)))
  const totalAdditions = computed(() => reviewSections.value.reduce((total, section) => total + section.additions, 0))
  const totalDeletions = computed(() => reviewSections.value.reduce((total, section) => total + section.deletions, 0))
  const stagedFilesCount = computed(() => review.value?.stagedFiles.length ?? 0)
  const gitOperationBusy = computed(() => activeActionKey.value !== null || commitLoading.value || pullLoading.value)
  const operationStatus = computed(() => {
    if (commitLoading.value) return copy.value.reviewCommitLoading
    if (pullLoading.value) return copy.value.reviewPullLoading
    if (activeActionKey.value !== null) return copy.value.reviewActionLoading
    return ''
  })
  const canCommit = computed(() => workspacePathValue.value !== null && stagedFilesCount.value > 0 && commitMessage.value.trim().length > 0 && !gitOperationBusy.value)
  const workspaceLabel = computed(() => {
    const root = workspacePathValue.value
    if (root === null) return ''
    const normalizedPath = root.replaceAll('\\', '/').replace(/\/+$/, '')
    const segments = normalizedPath.split('/')
    return segments[segments.length - 1] || normalizedPath
  })

  function fileKey(section: ReviewSection, file: ReviewFile): string {
    return `${section}:${file.status}:${file.path}:${file.oldPath ?? ''}`
  }

  function fileDetailsId(section: ReviewSection, index: number): string {
    return `omp-source-review-${section}-details-${index}`
  }

  function sectionActionKey(section: ReviewSection): string {
    return `${section}:all`
  }

  function fileActionKey(section: ReviewSection, file: ReviewFile): string {
    return `${section}:${fileKey(section, file)}`
  }

  function sectionFiles(section: ReviewSection): ReviewFile[] {
    return section === 'staged' ? (review.value?.stagedFiles ?? []) : (review.value?.unstagedFiles ?? [])
  }

  function sortReviewFiles(files: ReviewFile[]): ReviewFile[] {
    return files.slice().sort((left, right) => {
      if (left.path < right.path) return -1
      if (left.path > right.path) return 1
      return 0
    })
  }

  function applyReviewDelta(paths: string[], delta: WorkspaceReviewDelta): void {
    const currentReview = review.value
    if (currentReview === null) return

    const requestedPaths = new Set(paths)
    const stagedFiles = currentReview.stagedFiles.filter(
      (file) => !requestedPaths.has(file.path) && (file.oldPath === undefined || !requestedPaths.has(file.oldPath)),
    )
    const unstagedFiles = currentReview.unstagedFiles.filter(
      (file) => !requestedPaths.has(file.path) && (file.oldPath === undefined || !requestedPaths.has(file.oldPath)),
    )
    const nextStagedFiles = stagedFiles.concat(sortReviewFiles(delta.stagedFiles))
    const nextUnstagedFiles = unstagedFiles.concat(sortReviewFiles(delta.unstagedFiles))
    const nextReview: WorkspaceReview = {
      ...currentReview,
      stagedFiles: nextStagedFiles,
      unstagedFiles: nextUnstagedFiles,
      clean: currentReview.truncated ? false : nextStagedFiles.length === 0 && nextUnstagedFiles.length === 0,
    }

    review.value = nextReview

    const visibleFileKeys = new Set([
      ...nextStagedFiles.map((file) => fileKey('staged', file)),
      ...nextUnstagedFiles.map((file) => fileKey('unstaged', file)),
    ])
    const nextExpandedFiles = new Set([...expandedFiles.value].filter((key) => visibleFileKeys.has(key)))
    if (nextExpandedFiles.size !== expandedFiles.value.size) {
      expandedFiles.value = nextExpandedFiles
    }
  }

  function isSectionExpanded(section: ReviewSection): boolean {
    return expandedSections.value[section]
  }

  function toggleSection(section: ReviewSection): void {
    expandedSections.value = {
      ...expandedSections.value,
      [section]: !expandedSections.value[section],
    }
  }

  function isFileExpanded(section: ReviewSection, file: ReviewFile): boolean {
    return expandedFiles.value.has(fileKey(section, file))
  }

  function toggleFile(section: ReviewSection, file: ReviewFile): void {
    const key = fileKey(section, file)
    const next = new Set(expandedFiles.value)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
    }
    expandedFiles.value = next
  }

  function fileToggleLabel(section: ReviewSection, file: ReviewFile): string {
    const label = isFileExpanded(section, file) ? copy.value.reviewCollapseFile : copy.value.reviewExpandFile
    return `${label}: ${file.path}`
  }

  function fileOpenLabel(file: ReviewFile): string {
    return `${copy.value.reviewDiffOpenFile}: ${file.path} (${statusLetters[file.status]})`
  }

  function hunkKey(section: ReviewSection, file: ReviewFile, hunk: ReviewHunk, index: number): string {
    return `${fileKey(section, file)}:${index}:${hunk.header}`
  }

  function linePrefix(type: ReviewLineType): string {
    if (type === 'add') return '+'
    if (type === 'del') return '-'
    return ' '
  }

  function requestErrorText(reason: unknown): string {
    if (reason instanceof Error && reason.message.length > 0) {
      return `${copy.value.reviewError}: ${reason.message}`
    }
    if (typeof reason === 'string' && reason.length > 0) {
      return `${copy.value.reviewError}: ${reason}`
    }
    return copy.value.reviewError
  }

  function statusLetter(file: ReviewFile): string {
    return statusLetters[file.status]
  }

  function openFile(section: ReviewSection, file: ReviewFile): void {
    options.onOpenDiff({ section, file })
  }

  function errorText(reason: unknown): string {
    if (reason instanceof Error && reason.message.length > 0) {
      return `${copy.value.reviewActionError}: ${reason.message}`
    }
    if (typeof reason === 'string' && reason.length > 0) {
      return `${copy.value.reviewActionError}: ${reason}`
    }
    return copy.value.reviewActionError
  }

  function isActionActive(key: string): boolean {
    return activeActionKey.value === key
  }

  async function refreshReview(clearActionError = true): Promise<void> {
    const token = ++requestToken
    const root = workspacePathValue.value
    requestError.value = ''
    if (clearActionError) {
      actionError.value = ''
      operationNotice.value = ''
    }

    if (root === null) {
      review.value = null
      loading.value = false
      return
    }

    loading.value = true
    review.value = null

    try {
      const result = await getWorkspaceReview(root)
      if (token !== requestToken) return
      review.value = result
      loading.value = false
    } catch (reason: unknown) {
      if (token !== requestToken) return
      review.value = null
      requestError.value = requestErrorText(reason)
      loading.value = false
    }
  }

  async function runFileAction(section: ReviewSection, file: ReviewFile): Promise<void> {
    const root = workspacePathValue.value
    const key = fileActionKey(section, file)
    if (root === null || activeActionKey.value !== null || commitLoading.value || pullLoading.value) return
    const token = ++actionToken
    const paths = [...new Set([file.path, ...(file.oldPath === undefined ? [] : [file.oldPath])])]
    activeActionKey.value = key
    operationNotice.value = ''
    actionError.value = ''
    const update = section === 'staged' ? unstageWorkspaceFiles : stageWorkspaceFiles

    try {
      const delta = await update(root, paths)
      if (token !== actionToken || workspacePathValue.value !== root) return
      applyReviewDelta(paths, delta)
    } catch (reason: unknown) {
      if (token === actionToken && workspacePathValue.value === root) {
        actionError.value = errorText(reason)
        activeActionKey.value = null
      }
      return
    }

    if (token !== actionToken || workspacePathValue.value !== root) return
    activeActionKey.value = null
  }

  async function runSectionAction(section: ReviewSection): Promise<void> {
    const root = workspacePathValue.value
    const files = sectionFiles(section)
    const key = sectionActionKey(section)
    if (root === null || files.length === 0 || activeActionKey.value !== null || commitLoading.value || pullLoading.value) return

    const token = ++actionToken
    const paths = [...new Set(files.flatMap((file) => [file.path, ...(file.oldPath === undefined ? [] : [file.oldPath])]))]
    const update = section === 'staged' ? unstageWorkspaceFiles : stageWorkspaceFiles
    activeActionKey.value = key
    operationNotice.value = ''
    actionError.value = ''

    try {
      const delta = await update(root, paths)
      if (token !== actionToken || workspacePathValue.value !== root) return
      applyReviewDelta(paths, delta)
    } catch (reason: unknown) {
      if (token === actionToken && workspacePathValue.value === root) {
        actionError.value = errorText(reason)
        activeActionKey.value = null
      }
      return
    }

    if (token !== actionToken || workspacePathValue.value !== root) return
    activeActionKey.value = null
  }

  function operationErrorText(reason: unknown): string {
    if (reason instanceof Error && reason.message.length > 0) {
      return `${copy.value.reviewOperationError}: ${reason.message}`
    }
    if (typeof reason === 'string' && reason.length > 0) {
      return `${copy.value.reviewOperationError}: ${reason}`
    }
    if (typeof reason === 'object' && reason !== null && 'message' in reason) {
      const message = reason.message
      if (typeof message === 'string' && message.length > 0) {
        return `${copy.value.reviewOperationError}: ${message}`
      }
    }
    return copy.value.reviewOperationError
  }

  async function commitChanges(): Promise<void> {
    const root = workspacePathValue.value
    const message = commitMessage.value.trim()
    if (root === null || message.length === 0 || !canCommit.value) return

    const token = ++actionToken
    commitLoading.value = true
    actionError.value = ''
    operationNotice.value = ''
    try {
      await commitWorkspace(root, message)
    } catch (reason: unknown) {
      if (token === actionToken && workspacePathValue.value === root) {
        actionError.value = operationErrorText(reason)
        commitLoading.value = false
      }
      return
    }

    if (token !== actionToken || workspacePathValue.value !== root) return
    await refreshReview(false)
    if (token !== actionToken || workspacePathValue.value !== root) return
    commitMessage.value = ''
    commitLoading.value = false
    operationNotice.value = copy.value.reviewCommitSuccess
    options.onRefreshWorkspace()
  }

  async function pullChanges(): Promise<void> {
    const root = workspacePathValue.value
    if (root === null || gitOperationBusy.value || review.value?.repo !== true) return

    const token = ++actionToken
    pullLoading.value = true
    actionError.value = ''
    operationNotice.value = ''
    try {
      await pullWorkspace(root)
    } catch (reason: unknown) {
      if (token === actionToken && workspacePathValue.value === root) {
        actionError.value = operationErrorText(reason)
        pullLoading.value = false
      }
      return
    }

    if (token !== actionToken || workspacePathValue.value !== root) return
    await refreshReview(false)
    if (token !== actionToken || workspacePathValue.value !== root) return
    pullLoading.value = false
    operationNotice.value = copy.value.reviewPullSuccess
    options.onRefreshWorkspace()
  }

  watch(
    workspacePathValue,
    () => {
      actionToken += 1
      activeActionKey.value = null
      commitLoading.value = false
      pullLoading.value = false
      commitMessage.value = ''
      operationNotice.value = ''
      actionError.value = ''
      expandedFiles.value = new Set()
      void refreshReview()
    },
    { immediate: true },
  )

  return {
    copy,
    review,
    loading,
    reviewFailure,
    actionError,
    reviewSections,
    changedFilesCount,
    changedLabel,
    totalAdditions,
    totalDeletions,
    gitOperationBusy,
    canCommit,
    workspaceLabel,
    pullLoading,
    commitMessage,
    commitLoading,
    operationNotice,
    operationStatus,
    refreshReview,
    pullChanges,
    commitChanges,
    isSectionExpanded,
    toggleSection,
    isActionActive,
    sectionActionKey,
    runSectionAction,
    fileKey,
    fileDetailsId,
    fileActionKey,
    isFileExpanded,
    toggleFile,
    fileToggleLabel,
    fileOpenLabel,
    hunkKey,
    linePrefix,
    statusLetter,
    openFile,
    runFileAction,
  }
}
