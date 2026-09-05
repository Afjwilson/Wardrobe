import type { Outfit } from '../types'
import { markDirty } from './meta'
import { getDB } from './schema'

export async function getOutfit(id: string): Promise<Outfit | undefined> {
  return (await getDB()).get('outfits', id)
}

export async function allOutfits(): Promise<Outfit[]> {
  const outfits = await (await getDB()).getAll('outfits')
  return outfits.sort((a, b) => b.createdAt - a.createdAt)
}

export async function outfitsWithItem(itemId: string): Promise<Outfit[]> {
  const outfits = await allOutfits()
  return outfits.filter((o) => o.itemIds.includes(itemId))
}

export async function putOutfit(outfit: Outfit): Promise<void> {
  await (await getDB()).put('outfits', outfit)
  await markDirty()
}

export async function putOutfits(outfits: Outfit[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('outfits', 'readwrite')
  await Promise.all(outfits.map((o) => tx.store.put(o)))
  await tx.done
  await markDirty()
}

export async function deleteOutfit(id: string): Promise<void> {
  await (await getDB()).delete('outfits', id)
  await markDirty()
}

export async function wearToday(id: string): Promise<Outfit | undefined> {
  const outfit = await getOutfit(id)
  if (!outfit) return undefined
  const updated = { ...outfit, wornDates: [...outfit.wornDates, Date.now()] }
  await putOutfit(updated)
  return updated
}
