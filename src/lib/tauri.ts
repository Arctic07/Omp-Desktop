type TauriRuntimeGlobal = typeof globalThis & {
  __TAURI_INTERNALS__?: unknown
}

export type WindowApi = {
  minimize: () => Promise<boolean>
  maximize: () => Promise<boolean>
  close: () => Promise<boolean>
}

export function isTauriRuntime(): boolean {
  const runtimeGlobal = globalThis as TauriRuntimeGlobal
  return Boolean(runtimeGlobal.__TAURI_INTERNALS__)
}

async function runWindowAction(
  action: 'minimize' | 'maximize' | 'close',
): Promise<boolean> {
  if (!isTauriRuntime()) {
    return false
  }

  try {
    // Load the Tauri window module only after runtime detection for browser safety.
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const currentWindow = getCurrentWindow()

    if (action === 'minimize') {
      await currentWindow.minimize()
    } else if (action === 'maximize') {
      await currentWindow.maximize()
    } else {
      await currentWindow.close()
    }

    return true
  } catch {
    return false
  }
}

export const windowApi: WindowApi = {
  minimize: () => runWindowAction('minimize'),
  maximize: () => runWindowAction('maximize'),
  close: () => runWindowAction('close'),
}
