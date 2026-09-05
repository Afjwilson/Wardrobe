import type { Category, Item } from '../types'
import { markDirty } from './meta'
import { deleteOutfit, outfitsWithItem, putOutfit } from './outfits'
import { clearPair, pairsForItem } from './pairs'
import { fromRow, getDB, toRow } from './schema'

export async function getItem(id: string): Promise<Item | undefined> {
  const row = await (await getDB()).get('items', id)
  return row ? fromRow(row) : undefined
}

export async function getItems(ids: string[]): Promise<Item[]> {
  const db = await getDB()
  const tx = db.transaction('items')
  const rows = await Promise.all(ids.map((id) => tx.store.get(id)))
  await tx.done
  return rows.filter((r) => r !== undefined).map(fromRow)
}

export async function allItems(includeRetired = false): Promise<Item[]> {
  const rows = await (await getDB()).getAll('items')
  const items = rows.map(fromRow)
  const visible = includeRetired ? items : items.filter((i) => !i.retired)
  return visible.sort((a, b) => b.createdAt - a.createdAt)
}

export async function itemsByCategory(category: Category): Promise<Item[]> {
  const rows = await (await getDB()).getAllFromIndex('items', 'category', category)
  return rows.map(fromRow).filter((i) => !i.retired)
}

export async function putItem(item: Item): Promise<void> {
  await (await getDB()).put('items', toRow(item))
  await markDirty()
}

/** Bulk write used by import; does not touch the dirty flag per record. */
export async function putItems(items: Item[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('items', 'readwrite')
  await Promise.all(items.map((i) => tx.store.put(toRow(i))))
  await tx.done
  await markDirty()
}

export async function setRetired(id: string, retired: boolean): Promise<void> {
  const item = await getItem(id)
  if (!item) return
  await putItem({ ...item, retired })
}

export async function deleteItem(id: string): Promise<void> {
  await (await getDB()).delete('items', id)
  await markDirty()
}

/**
 * Deleting an item also drops the records that referenced it: its pair
 * verdicts, and its place in any outfit. An outfit left with fewer than two
 * items is no longer a combination, so it goes too.
 */
export async function deleteItemCascade(id: string): Promise<void> {
  for (const pair of await pairsForItem(id)) {
    await clearPair(pair.a, pair.b)
  }
  for (const outfit of await outfitsWithItem(id)) {
    const itemIds = outfit.itemIds.filter((itemId) => itemId !== id)
    if (itemIds.length < 2) await deleteOutfit(outfit.id)
    else await putOutfit({ ...outfit, itemIds })
  }
  await deleteItem(id)
}
