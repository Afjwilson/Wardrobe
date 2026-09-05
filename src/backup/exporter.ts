import { allItems } from '../db/items'
import { markExported } from '../db/meta'
import { allOutfits } from '../db/outfits'
import { allPairs } from '../db/pairs'
import { saveFile, type SaveOutcome } from '../lib/saveFile'
import { buildExport, exportFilename, type WardrobeExport } from './format'

export async function collectExport(): Promise<WardrobeExport> {
  const [items, outfits, pairs] = await Promise.all([
    allItems(true),
    allOutfits(),
    allPairs(),
  ])
  return buildExport(items, outfits, pairs)
}

export async function quickExportBlob(): Promise<Blob> {
  const data = await collectExport()
  return new Blob([JSON.stringify(data)], { type: 'application/json' })
}

/** Metadata only, no photos — small enough to fire off casually. */
export async function runQuickExport(): Promise<SaveOutcome> {
  const blob = await quickExportBlob()
  const outcome = await saveFile(blob, exportFilename('json'), 'application/json')
  if (outcome !== 'cancelled') await markExported()
  return outcome
}
