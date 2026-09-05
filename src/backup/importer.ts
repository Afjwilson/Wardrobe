import { putBlob } from '../db/blobs'
import { allItems, putItems } from '../db/items'
import { allOutfits, putOutfits } from '../db/outfits'
import { allPairs, putPairs } from '../db/pairs'
import { getDB } from '../db/schema'
import type { PairVerdict } from '../types'
import { ImportError, parseExport, type WardrobeExport } from './format'

export type ImportMode = 'merge' | 'replace'

export type ImportPlan = {
  payload: WardrobeExport
  photos: Map<string, Blob>
  itemsTotal: number
  itemsNew: number
  itemsColliding: number
  outfitsTotal: number
  outfitsNew: number
  outfitsColliding: number
  pairsTotal: number
}

async function readJsonFile(file: Blob): Promise<WardrobeExport> {
  let raw: unknown
  try {
    raw = JSON.parse(await file.text())
  } catch {
    throw new ImportError('That file is not valid JSON.')
  }
  return parseExport(raw)
}

/**
 * Parse and summarise without touching the database. Import is never silently
 * destructive: the caller shows this summary and asks before applying anything.
 */
export async function planImport(file: File): Promise<ImportPlan> {
  const name = file.name.toLowerCase()
  let payload: WardrobeExport
  const photos = new Map<string, Blob>()

  if (name.endsWith('.zip')) {
    throw new ImportError('Full ZIP backups are not supported by this build yet.')
  } else if (name.endsWith('.json')) {
    payload = await readJsonFile(file)
  } else {
    throw new ImportError('Choose a .json quick export or a .zip full backup.')
  }

  const [existingItems, existingOutfits] = await Promise.all([
    allItems(true),
    allOutfits(),
  ])
  const itemIds = new Set(existingItems.map((i) => i.id))
  const outfitIds = new Set(existingOutfits.map((o) => o.id))

  const itemsColliding = payload.items.filter((i) => itemIds.has(i.id)).length
  const outfitsColliding = payload.outfits.filter((o) => outfitIds.has(o.id)).length

  return {
    payload,
    photos,
    itemsTotal: payload.items.length,
    itemsNew: payload.items.length - itemsColliding,
    itemsColliding,
    outfitsTotal: payload.outfits.length,
    outfitsNew: payload.outfits.length - outfitsColliding,
    outfitsColliding,
    pairsTotal: payload.pairs.length,
  }
}

async function wipe(): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(['items', 'outfits', 'pairs', 'blobs'], 'readwrite')
  await Promise.all([
    tx.objectStore('items').clear(),
    tx.objectStore('outfits').clear(),
    tx.objectStore('pairs').clear(),
    tx.objectStore('blobs').clear(),
  ])
  await tx.done
}

/** Merge leaves the verdicts already on this device untouched. */
async function onlyUnknownPairs(incoming: PairVerdict[]): Promise<PairVerdict[]> {
  const existing = await allPairs()
  const seen = new Set(existing.map((p) => `${p.a}|${p.b}`))
  return incoming.filter((p) => !seen.has(`${p.a}|${p.b}`))
}

export async function applyImport(plan: ImportPlan, mode: ImportMode): Promise<void> {
  if (mode === 'replace') await wipe()

  const [existingItems, existingOutfits] = await Promise.all([
    allItems(true),
    allOutfits(),
  ])
  const itemIds = new Set(existingItems.map((i) => i.id))
  const outfitIds = new Set(existingOutfits.map((o) => o.id))

  const items =
    mode === 'merge'
      ? plan.payload.items.filter((i) => !itemIds.has(i.id))
      : plan.payload.items
  const outfits =
    mode === 'merge'
      ? plan.payload.outfits.filter((o) => !outfitIds.has(o.id))
      : plan.payload.outfits

  const pairs =
    mode === 'merge'
      ? await onlyUnknownPairs(plan.payload.pairs)
      : plan.payload.pairs

  await putItems(items)
  await putOutfits(outfits)
  await putPairs(pairs)

  for (const [key, blob] of plan.photos) {
    await putBlob(key, blob)
  }
}
