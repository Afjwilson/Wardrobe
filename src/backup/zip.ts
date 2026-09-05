import { unzip, zip, type Unzipped, type Zippable } from 'fflate'
import { getBlob } from '../db/blobs'
import { markExported } from '../db/meta'
import { saveFile, type SaveOutcome } from '../lib/saveFile'
import { collectExport } from './exporter'
import { exportFilename, ImportError, parseExport, type WardrobeExport } from './format'

const PHOTO_DIR = 'photos/'
const THUMB_DIR = 'thumbs/'
const DATA_FILE = 'data.json'

function zipAsync(files: Zippable): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    zip(files, { level: 6 }, (error, data) => (error ? reject(error) : resolve(data)))
  })
}

function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => {
    unzip(data, (error, result) => (error ? reject(error) : resolve(result)))
  })
}

async function bytes(key: string): Promise<Uint8Array | undefined> {
  const blob = await getBlob(key)
  return blob ? new Uint8Array(await blob.arrayBuffer()) : undefined
}

/**
 * data.json plus the photos, so this file restores everything. Photos are
 * stored as files rather than base64 in the JSON: base64 inflates them by about
 * a third and produces something too big to move around comfortably.
 */
export async function fullBackupBlob(): Promise<Blob> {
  const payload = await collectExport()
  const files: Zippable = {
    [DATA_FILE]: new TextEncoder().encode(JSON.stringify(payload)),
  }

  for (const item of payload.items) {
    const photo = await bytes(item.photoKey)
    if (photo) files[`${PHOTO_DIR}${item.photoKey}.webp`] = photo
    const thumb = await bytes(item.thumbKey)
    if (thumb) files[`${THUMB_DIR}${item.thumbKey}.webp`] = thumb
  }
  for (const outfit of payload.outfits) {
    if (!outfit.photoKey) continue
    const photo = await bytes(outfit.photoKey)
    if (photo) files[`${PHOTO_DIR}${outfit.photoKey}.webp`] = photo
  }

  // Photos are already compressed; the archive is a container, not a squeezer.
  const archive = await zipAsync(files)
  return new Blob([archive as BlobPart], { type: 'application/zip' })
}

export async function runFullBackup(): Promise<SaveOutcome> {
  const blob = await fullBackupBlob()
  const outcome = await saveFile(blob, exportFilename('zip'), 'application/zip')
  if (outcome !== 'cancelled') await markExported()
  return outcome
}

export type BackupContents = {
  payload: WardrobeExport
  photos: Map<string, Blob>
}

export async function readBackupZip(file: Blob): Promise<BackupContents> {
  let entries: Unzipped
  try {
    entries = await unzipAsync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new ImportError('That ZIP could not be read.')
  }

  const data = entries[DATA_FILE]
  if (!data) throw new ImportError('That ZIP has no data.json — it is not a wardrobe backup.')

  const payload = parseExport(JSON.parse(new TextDecoder().decode(data)))

  const photos = new Map<string, Blob>()
  for (const [path, content] of Object.entries(entries)) {
    if (path === DATA_FILE) continue
    if (!path.startsWith(PHOTO_DIR) && !path.startsWith(THUMB_DIR)) continue
    const key = path.slice(path.indexOf('/') + 1).replace(/\.webp$/, '')
    photos.set(key, new Blob([content as BlobPart], { type: 'image/webp' }))
  }

  return { payload, photos }
}
