import { getDB } from './schema'

export type MetaKey =
  | 'lastExportAt'
  | 'dirtySinceExport'
  | 'exportBannerDismissedAt'
  | 'lastBackupHandle'
  | 'persistGranted'
  | 'firstLaunchAt'

export async function getMeta<T>(key: MetaKey): Promise<T | undefined> {
  return (await (await getDB()).get('meta', key)) as T | undefined
}

export async function setMeta(key: MetaKey, value: unknown): Promise<void> {
  await (await getDB()).put('meta', value, key)
}

/** Called by every mutating wrapper so the export reminder knows there is new data. */
export async function markDirty(): Promise<void> {
  await setMeta('dirtySinceExport', true)
}

export async function markExported(at = Date.now()): Promise<void> {
  await setMeta('lastExportAt', at)
  await setMeta('dirtySinceExport', false)
}
