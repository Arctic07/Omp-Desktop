export interface WorkspaceSession {
  id: string
  title: string
  time: string
}

export interface WorkspaceProject {
  id: string
  name: string
  path: string
  sessions: readonly WorkspaceSession[]
}

export function createWorkspaceProject(path: string): WorkspaceProject {
  const normalizedPath = path.replace(/[\\/]+$/, '')
  const segments = normalizedPath.split(/[\\/]/)
  const name = segments.at(-1) || normalizedPath
  return {
    id: path,
    name,
    path,
    sessions: [],
  }
}
