import { SCHEMA_VERSION } from '../db/schema'
import type { Item, Outfit, PairVerdict } from '../types'

export type WardrobeExport = {
  app: 'wardrobe'
  schemaVersion: number
  exportedAt: number
  items: Item[]
  outfits: Outfit[]
  pairs: PairVerdict[]
}

export class ImportError extends Error {}

/**
 * Forward migrations, keyed by the version they upgrade *from*. Each returns a
 * payload one version newer. Nothing to do yet at schemaVersion 1, but the
 * chain is here so an older file never has to be special-cased at the call site.
 */
const migrations: Record<number, (data: WardrobeExport) => WardrobeExport> = {}

export function buildExport(
  items: Item[],
  outfits: Outfit[],
  pairs: PairVerdict[],
): WardrobeExport {
  return {
    app: 'wardrobe',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: Date.now(),
    items,
    outfits,
    pairs,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function parseExport(raw: unknown): WardrobeExport {
  if (!isRecord(raw)) throw new ImportError('That file is not wardrobe data.')

  const version = raw.schemaVersion
  if (typeof version !== 'number') {
    throw new ImportError('That file has no schemaVersion — it is not a wardrobe export.')
  }
  if (version > SCHEMA_VERSION) {
    throw new ImportError(
      `That backup was made by a newer version of Wardrobe (schema ${version}, this app reads ${SCHEMA_VERSION}). Update the app first.`,
    )
  }
  if (!Array.isArray(raw.items) || !Array.isArray(raw.outfits)) {
    throw new ImportError('That file is missing its items or outfits.')
  }

  let data: WardrobeExport = {
    app: 'wardrobe',
    schemaVersion: version,
    exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : Date.now(),
    items: raw.items as Item[],
    outfits: raw.outfits as Outfit[],
    pairs: Array.isArray(raw.pairs) ? (raw.pairs as PairVerdict[]) : [],
  }

  while (data.schemaVersion < SCHEMA_VERSION) {
    const migrate = migrations[data.schemaVersion]
    if (!migrate) {
      throw new ImportError(
        `No migration from schema ${data.schemaVersion} to ${SCHEMA_VERSION}.`,
      )
    }
    data = migrate(data)
  }

  return data
}

export function exportFilename(extension: 'json' | 'zip', date = new Date()): string {
  return `wardrobe-${date.toISOString().slice(0, 10)}.${extension}`
}
