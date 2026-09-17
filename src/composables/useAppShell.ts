import { computed, onMounted, onUnmounted, ref, type ComputedRef, type Ref } from 'vue'

import { useAppSettings } from '../stores/appSettings'
import type { ConversationFeedEntry, ConversationSubmitRequest } from '../utils/conversationTypes'
import { createConversationAttachment } from '../utils/conversationTypes'
import {
  chooseWorkspace,
  currentWorkingDirectory,
  formatDesktopError,
  type ReviewDiffTarget,
} from '../utils/desktopApi'
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
  conversationEntries: Ref<readonly ConversationFeedEntry[]>
  rightPanelOpen: Ref<boolean>
  rightPanelTab: Ref<WorkPanelTab>
  requestedFile: Ref<RequestedFile | null>
  requestedDiff: Ref<ReviewDiffTarget | null>
  refreshToken: Ref<number>
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
  const conversationEntriesBySession = ref<Record<string, readonly ConversationFeedEntry[]>>({})
  const conversationEntries = ref<readonly ConversationFeedEntry[]>([])
  const rightPanelOpen = ref(false)
  const rightPanelTab = ref<WorkPanelTab>('files')
  const requestedFile = ref<RequestedFile | null>(null)
  const requestedDiff = ref<ReviewDiffTarget | null>(null)
  const refreshToken = ref(0)

  let compactMediaQuery: MediaQueryList | null = null
  let workspaceRequestToken = 0
  let requestSequence = 0
  let localSessionSequence = 0

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
    conversationEntries.value = []
    rightPanelOpen.value = false
    requestedFile.value = null
    requestedDiff.value = null
    settingsOpen.value = false
  }

  function selectSession(sessionId: string): void {
    activeSessionId.value = sessionId
    conversationEntries.value = conversationEntriesBySession.value[sessionId] ?? []
    settingsOpen.value = false
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
    if (text.length === 0) {
      return
    }

    let sessionId = activeSessionId.value
    if (sessionId === null) {
      localSessionSequence += 1
      sessionId = `session-local-${Date.now()}-${localSessionSequence}`
      activeSessionId.value = sessionId
      const project = workspaceProjects.value[0]
      if (project !== undefined) {
        workspaceProjects.value = [{
          ...project,
          sessions: [...project.sessions, {
            id: sessionId,
            title: text.slice(0, 48),
            time: copy.value.justNow,
          }],
        }]
      }
    }

    const attachments = request.paths.map(createConversationAttachment)
    const entry: ConversationFeedEntry = {
      id: `${sessionId}-message-${conversationEntries.value.length + 1}`,
      role: 'user',
      text,
      ...(attachments.length > 0 ? { attachments } : {}),
    }
    const nextEntries = [
      ...(conversationEntriesBySession.value[sessionId] ?? []),
      entry,
    ]
    conversationEntriesBySession.value = {
      ...conversationEntriesBySession.value,
      [sessionId]: nextEntries,
    }
    conversationEntries.value = nextEntries
  }

  function setWorkspacePath(path: string): void {
    workspacePath.value = path
    workspaceProjects.value = [createWorkspaceProject(path)]
    activeSessionId.value = null
    conversationEntriesBySession.value = {}
    conversationEntries.value = []
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
    conversationEntries,
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
