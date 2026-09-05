import { zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { SCHEMA_VERSION } from '../db/schema'
import { ImportError } from './format'
import { readBackupZip } from './zip'

function archive(files: Record<string, Uint8Array>): Blob {
  return new Blob([zipSync(files) as BlobPart], { type: 'application/zip' })
}

const payload = {
  app: 'wardrobe',
  schemaVersion: SCHEMA_VERSION,
  exportedAt: 0,
  items: [],
  outfits: [],
  pairs: [],
}

const encode = (value: unknown) => new TextEncoder().encode(JSON.stringify(value))

describe('readBackupZip', () => {
  it('reads data.json and the photos beside it', async () => {
    const file = archive({
      'data.json': encode(payload),
      'photos/p_abc.webp': new Uint8Array([1, 2, 3]),
      'thumbs/t_abc.webp': new Uint8Array([4, 5]),
    })

    const contents = await readBackupZip(file)

    expect(contents.payload.schemaVersion).toBe(SCHEMA_VERSION)
    expect([...contents.photos.keys()].sort()).toEqual(['p_abc', 't_abc'])
    expect(await contents.photos.get('p_abc')!.arrayBuffer()).toEqual(
      new Uint8Array([1, 2, 3]).buffer,
    )
  })

  it('refuses an archive with no data.json', async () => {
    const file = archive({ 'photos/p_abc.webp': new Uint8Array([1]) })
    await expect(readBackupZip(file)).rejects.toBeInstanceOf(ImportError)
  })

  it('refuses a backup from a newer schema', async () => {
    const file = archive({
      'data.json': encode({ ...payload, schemaVersion: SCHEMA_VERSION + 1 }),
    })
    await expect(readBackupZip(file)).rejects.toThrow(/newer version/)
  })

  it('refuses something that is not a zip', async () => {
    await expect(readBackupZip(new Blob(['not a zip']))).rejects.toBeInstanceOf(ImportError)
  })
})
