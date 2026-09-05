import { getMeta, setMeta } from '../db/meta'

export type StorageStatus = {
  persisted: boolean
  usageBytes?: number
  quotaBytes?: number
}

/**
 * Asks the browser not to evict this origin. Called once on first launch; a
 * refusal is recorded for Settings to mention but never blocks the app.
 */
export async function ensurePersisted(): Promise<boolean> {
  if (!navigator.storage?.persist) {
    await setMeta('persistGranted', false)
    return false
  }
  try {
    const already = (await navigator.storage.persisted?.()) ?? false
    const granted = already || (await navigator.storage.persist())
    await setMeta('persistGranted', granted)
    return granted
  } catch {
    await setMeta('persistGranted', false)
    return false
  }
}

export async function storageStatus(): Promise<StorageStatus> {
  const persisted =
    (await navigator.storage?.persisted?.()) ??
    (await getMeta<boolean>('persistGranted')) ??
    false
  try {
    const estimate = (await navigator.storage?.estimate?.()) ?? {}
    return { persisted, usageBytes: estimate.usage, quotaBytes: estimate.quota }
  } catch {
    return { persisted }
  }
}

export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`
}
