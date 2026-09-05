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

/** The export reminder counts from here on a device that has never exported. */
export async function recordFirstLaunch(): Promise<void> {
  if ((await getMeta<number>('firstLaunchAt')) === undefined) {
    await setMeta('firstLaunchAt', Date.now())
  }
}

export async function markExported(at = Date.now()): Promise<void> {
  await setMeta('lastExportAt', at)
  await setMeta('dirtySinceExport', false)
}
