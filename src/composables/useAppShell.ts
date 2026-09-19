import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import type { ConversationFeedEntry, ConversationSubmitRequest } from '../utils/conversationTypes'
import {
  chooseWorkspace,
  currentWorkingDirectory,
  formatDesktopError,
  type ReviewDiffTarget,
} from '../utils/desktopApi'
import { retainSessionPane, type SessionScrollMemory } from '../utils/sessionPanes'
import { createWorkspaceProject, type WorkspaceProject } from '../utils/workspaceTypes'

const COMPACT_MEDIA_QUERY = '(max-width: 1023px)'

export type WorkPanelTab = 'files' | 'review'

export interface RequestedFile {
  path: string
  seq: number
}

export interface AppShellState {
  sidebarCollapsed: ComputedRef<boolean>
  settingsOpen: Ref<boolean>
  activeSessionId: Ref<string | null>
  activeSessionTitle: ComputedRef<string>
  workspacePath: Ref<string | null>
  workspaceError: Ref<string>
  workspaceProjects: Ref<readonly WorkspaceProject[]>
  retainedSessionIds: Ref<readonly string[]>
  conversationEntriesBySession: Ref<Record<string, readonly ConversationFeedEntry[]>>
  sessionScrollMemory: Map<string, SessionScrollMemory>
  rightPanelOpen: Ref<boolean>
  rightPanelTab: Ref<WorkPanelTab>
  requestedFile: Ref<RequestedFile | null>
  requestedDiff: Ref<ReviewDiffTarget | null>
  refreshToken: Ref<number>
  startNewSession(): void
  toggleSidebar(): void
  selectSession(sessionId: string): void
  openSettings(): void
  toggleRightPanel(): void
  selectRightPanelTab(tab: WorkPanelTab): void
  closeRightPanel(): void
  openRequestedFile(path: string): void
  openRequestedDiff(target: ReviewDiffTarget): void
  closeRequestedDiff(): void
  refreshWorkspacePanels(): void
  handleMessageSubmit(request: ConversationSubmitRequest): void
  selectWorkspace(): Promise<void>
}

function readCompactViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(COMPACT_MEDIA_QUERY).matches
}

export function useAppShell(): AppShellState {
  const desktopSidebarCollapsed = ref(false)
  const compactSidebarExpanded = ref(false)
  const isCompactViewport = ref(readCompactViewport())
  const settingsOpen = ref(false)
  const activeSessionId = ref<string | null>(null)
  const workspacePath = ref<string | null>(null)
  const workspaceError = ref('')
  const workspaceProjects = ref<readonly WorkspaceProject[]>([])
  const retainedSessionIds = ref<readonly string[]>([])
  const conversationEntriesBySession = ref<Record<string, readonly ConversationFeedEntry[]>>({})
  const rightPanelOpen = ref(false)
  const rightPanelTab = ref<WorkPanelTab>('files')
  const requestedFile = ref<RequestedFile | null>(null)
  const requestedDiff = ref<ReviewDiffTarget | null>(null)
  const refreshToken = ref(0)

  let compactMediaQuery: MediaQueryList | null = null
  let workspaceRequestToken = 0
  let requestSequence = 0
  let localSessionSequence = 0
  /**
   * Monotonic per-session entry numbering; row identity must not follow array
   * length. A Map because session ids are inserted at runtime from IPC and are
   * arbitrary strings (an object key would collide with prototype names).
   */
  const entrySequences = new Map<string, number>()
  /**
   * Last visit per session, consulted only to pick the least recently used pane
   * to evict. Pane order itself stays append-only (see `sessionPanes`), because
   * reordering the DOM would reset the scroll positions panes exist to keep.
   */
  const sessionVisits = new Map<string, number>()
  let visitSequence = 0

  /**
   * Where each session was left, so a returning pane lands on the same line.
   *
   * Mounted panes are bounded, so an evicted session loses its scroller — and
   * with it the only copy of the reader's position and follow state. This
   * outlives the pane. Deliberately not reactive: it is written on every scroll
   * event and read once when a pane is created, so reactivity would only
   * re-render panes.
   */
  const sessionScrollMemory = new Map<string, SessionScrollMemory>()

  const { copy } = useAppSettings()
  const sidebarCollapsed = computed<boolean>(() => (
    isCompactViewport.value ? !compactSidebarExpanded.value : desktopSidebarCollapsed.value
  ))
  const activeSessionTitle = computed<string>(() => {
    for (const project of workspaceProjects.value) {
      const session = project.sessions.find((candidate) => candidate.id === activeSessionId.value)
      if (session !== undefined) {
        return session.title
      }
    }
    return copy.value.localSessionTitle
  })

  function handleCompactViewportChange(event: MediaQueryListEvent): void {
    isCompactViewport.value = event.matches
    if (event.matches) {
      compactSidebarExpanded.value = false
    }
  }

  function toggleSidebar(): void {
    if (isCompactViewport.value) {
      compactSidebarExpanded.value = !compactSidebarExpanded.value
      return
    }
    desktopSidebarCollapsed.value = !desktopSidebarCollapsed.value
  }

  function startNewSession(): void {
    activeSessionId.value = null
    // Retained panes stay mounted, hidden: the hero owns the surface, and
    // returning to a session from here must still land where it was left.
    rightPanelOpen.value = false
    requestedFile.value = null
    requestedDiff.value = null
    settingsOpen.value = false
  }

  function selectSession(sessionId: string): void {
    activeSessionId.value = sessionId
    retainSession(sessionId)
    settingsOpen.value = false
  }

  /** Records the visit and mounts a pane for the session if it has none yet. */
  function retainSession(sessionId: string): void {
    visitSequence += 1
    sessionVisits.set(sessionId, visitSequence)
    retainedSessionIds.value = retainSessionPane(
      retainedSessionIds.value,
      sessionVisits,
      sessionId,
    )
  }

  function openSettings(): void {
    settingsOpen.value = true
    rightPanelOpen.value = false
  }

  function toggleRightPanel(): void {
    settingsOpen.value = false
    rightPanelOpen.value = !rightPanelOpen.value
  }

  function selectRightPanelTab(tab: WorkPanelTab): void {
    rightPanelTab.value = tab
    requestedDiff.value = null
  }

  function closeRightPanel(): void {
    rightPanelOpen.value = false
    requestedDiff.value = null
  }

  function openRequestedFile(path: string): void {
    requestSequence += 1
    requestedFile.value = { path, seq: requestSequence }
    requestedDiff.value = null
    rightPanelTab.value = 'files'
    rightPanelOpen.value = true
  }

  function openRequestedDiff(target: ReviewDiffTarget): void {
    requestedDiff.value = target
    rightPanelTab.value = 'review'
    rightPanelOpen.value = true
  }

  function closeRequestedDiff(): void {
    requestedDiff.value = null
    rightPanelTab.value = 'review'
  }

  function refreshWorkspacePanels(): void {
    refreshToken.value += 1
  }

  function handleMessageSubmit(request: ConversationSubmitRequest): void {
    const text = request.text.trim()
    if (text.length === 0 && request.attachments.length === 0) {
      return
    }

    let sessionId = activeSessionId.value
    if (sessionId === null) {
      localSessionSequence += 1
      sessionId = `session-local-${Date.now()}-${localSessionSequence}`
      activeSessionId.value = sessionId
      retainSession(sessionId)
      const project = workspaceProjects.value[0]
      if (project !== undefined) {
        workspaceProjects.value = [{
          ...project,
          sessions: [...project.sessions, {
            id: sessionId,
            title: request.attachments.length > 0 && text.length === 0
              ? request.attachments[0]!.name
              : text.slice(0, 48),
            time: copy.value.justNow,
          }],
        }]
      }
    }

    const sequence = (entrySequences.get(sessionId) ?? 0) + 1
    entrySequences.set(sessionId, sequence)
    const entry: ConversationFeedEntry = {
      id: `${sessionId}-message-${sequence}`,
      role: 'user',
      text,
      ...(request.attachments.length > 0 ? { attachments: request.attachments } : {}),
    }
    conversationEntriesBySession.value = {
      ...conversationEntriesBySession.value,
      [sessionId]: [
        ...(conversationEntriesBySession.value[sessionId] ?? []),
        entry,
      ],
    }
  }

  function setWorkspacePath(path: string): void {
    workspacePath.value = path
    workspaceProjects.value = [createWorkspaceProject(path)]
    activeSessionId.value = null
    retainedSessionIds.value = []
    conversationEntriesBySession.value = {}
    entrySequences.clear()
    sessionVisits.clear()
    sessionScrollMemory.clear()
    requestedFile.value = null
    requestedDiff.value = null
    refreshToken.value += 1
    workspaceError.value = ''
  }

  async function loadWorkspacePath(): Promise<void> {
    const token = ++workspaceRequestToken
    try {
      const currentPath = await currentWorkingDirectory()
      if (token !== workspaceRequestToken || workspacePath.value !== null) {
        return
      }
      setWorkspacePath(currentPath)
    } catch (error: unknown) {
      if (token === workspaceRequestToken) {
        workspaceError.value = formatDesktopError(error, copy.value.workspaceLoadFailed)
      }
    }
  }

  async function selectWorkspace(): Promise<void> {
    const token = ++workspaceRequestToken
    try {
      const selectedPath = await chooseWorkspace(copy.value.chooseWorkspace)
      if (token !== workspaceRequestToken || selectedPath === null) {
        return
      }
      setWorkspacePath(selectedPath)
    } catch (error: unknown) {
      if (token === workspaceRequestToken) {
        workspaceError.value = formatDesktopError(error, copy.value.workspaceSelectionFailed)
      }
    }
  }

  onMounted((): void => {
    void loadWorkspacePath()
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    compactMediaQuery = window.matchMedia(COMPACT_MEDIA_QUERY)
    isCompactViewport.value = compactMediaQuery.matches
    if (typeof compactMediaQuery.addEventListener === 'function') {
      compactMediaQuery.addEventListener('change', handleCompactViewportChange)
    } else if (typeof compactMediaQuery.addListener === 'function') {
      compactMediaQuery.addListener(handleCompactViewportChange)
    }
  })

  onUnmounted((): void => {
    workspaceRequestToken += 1
    if (compactMediaQuery === null) {
      return
    }
    if (typeof compactMediaQuery.removeEventListener === 'function') {
      compactMediaQuery.removeEventListener('change', handleCompactViewportChange)
    } else if (typeof compactMediaQuery.removeListener === 'function') {
      compactMediaQuery.removeListener(handleCompactViewportChange)
    }
    compactMediaQuery = null
  })

  return {
    sidebarCollapsed,
    settingsOpen,
    activeSessionId,
    activeSessionTitle,
    workspacePath,
    workspaceError,
    workspaceProjects,
    retainedSessionIds,
    conversationEntriesBySession,
    sessionScrollMemory,
    rightPanelOpen,
    rightPanelTab,
    requestedFile,
    requestedDiff,
    refreshToken,
    startNewSession,
    selectSession,
    openSettings,
    toggleRightPanel,
    selectRightPanelTab,
    closeRightPanel,
    openRequestedFile,
    openRequestedDiff,
    closeRequestedDiff,
    refreshWorkspacePanels,
    handleMessageSubmit,
    selectWorkspace,
    toggleSidebar,
  }
}
