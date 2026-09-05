import { getMeta, setMeta } from '../db/meta'

/**
 * Minimal shape of the File System Access API. It is Chromium-only, so the DOM
 * lib cannot be relied on for it and nothing here may assume it exists.
 */
type FilePickerWindow = Window & {
  showSaveFilePicker(options: {
    suggestedName: string
    types: { description: string; accept: Record<string, string[]> }[]
  }): Promise<FileSystemFileHandle>
}

type PermissionCapableHandle = FileSystemFileHandle & {
  queryPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
  requestPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>
}

export type SaveOutcome = 'shared' | 'picker' | 'download' | 'cancelled'

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

async function writeHandle(handle: FileSystemFileHandle, blob: Blob): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(blob)
  await writable.close()
}

/**
 * Three paths, feature-detected at call time and tried in order: share sheet,
 * save picker, anchor download. Must be called from a user gesture.
 */
export async function saveFile(
  blob: Blob,
  filename: string,
  mimeType: string,
): Promise<SaveOutcome> {
  const file = new File([blob], filename, { type: mimeType })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename })
      return 'shared'
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
      // Any other share failure falls through to the next path.
    }
  }

  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as FilePickerWindow).showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: filename.endsWith('.zip') ? 'Zip archive' : 'JSON file',
            accept: { [mimeType]: [filename.slice(filename.lastIndexOf('.'))] },
          },
        ],
      })
      await writeHandle(handle, blob)
      await setMeta('lastBackupHandle', handle)
      return 'picker'
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
    }
  }

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'download'
}

export async function lastBackupHandle(): Promise<PermissionCapableHandle | undefined> {
  return getMeta<PermissionCapableHandle>('lastBackupHandle')
}

export async function canSaveOverLastBackup(): Promise<boolean> {
  const handle = await lastBackupHandle()
  if (!handle?.queryPermission) return false
  return (await handle.queryPermission({ mode: 'readwrite' })) !== 'denied'
}

/** One-tap re-write of the previous backup file. Returns false if unavailable. */
export async function saveOverLastBackup(blob: Blob): Promise<boolean> {
  const handle = await lastBackupHandle()
  if (!handle) return false
  try {
    const state =
      (await handle.queryPermission?.({ mode: 'readwrite' })) ?? 'granted'
    if (state !== 'granted') {
      const asked =
        (await handle.requestPermission?.({ mode: 'readwrite' })) ?? 'denied'
      if (asked !== 'granted') return false
    }
    await writeHandle(handle, blob)
    return true
  } catch (error) {
    if (isAbort(error)) return false
    return false
  }
}

export function stamp(date = new Date()): string {
  return date.toISOString().slice(0, 10)
}
