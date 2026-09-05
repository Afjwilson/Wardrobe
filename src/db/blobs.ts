import { getDB } from './schema'

export async function putBlob(key: string, blob: Blob): Promise<void> {
  await (await getDB()).put('blobs', blob, key)
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  return (await getDB()).get('blobs', key)
}

export async function deleteBlob(key: string): Promise<void> {
  await (await getDB()).delete('blobs', key)
}

export async function allBlobKeys(): Promise<string[]> {
  return (await getDB()).getAllKeys('blobs')
}

const urlCache = new Map<string, string>()

/**
 * Object URLs are cached for the life of the page: thumbnails are re-rendered
 * constantly as the grid filters, and revoking per render makes images flicker.
 */
export async function blobUrl(key: string): Promise<string | undefined> {
  const cached = urlCache.get(key)
  if (cached) return cached
  const blob = await getBlob(key)
  if (!blob) return undefined
  const url = URL.createObjectURL(blob)
  urlCache.set(key, url)
  return url
}

export function forgetBlobUrl(key: string): void {
  const url = urlCache.get(key)
  if (url) {
    URL.revokeObjectURL(url)
    urlCache.delete(key)
  }
}
