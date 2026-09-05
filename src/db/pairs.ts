import type { Outfit, PairVerdict } from '../types'
import { markDirty } from './meta'
import { getDB } from './schema'

/** Pairs are stored with a < b so a lookup never has to try both orders. */
export function pairKey(x: string, y: string): [string, string] {
  return x < y ? [x, y] : [y, x]
}

export async function getPair(
  x: string,
  y: string,
): Promise<PairVerdict | undefined> {
  return (await getDB()).get('pairs', pairKey(x, y))
}

export async function allPairs(): Promise<PairVerdict[]> {
  return (await getDB()).getAll('pairs')
}

export async function pairsForItem(itemId: string): Promise<PairVerdict[]> {
  const db = await getDB()
  const [asA, asB] = await Promise.all([
    db.getAllFromIndex('pairs', 'a', itemId),
    db.getAllFromIndex('pairs', 'b', itemId),
  ])
  return [...asA, ...asB]
}

export async function setExplicitPair(
  x: string,
  y: string,
  verdict: 'good' | 'bad',
): Promise<void> {
  const [a, b] = pairKey(x, y)
  await (await getDB()).put('pairs', { a, b, verdict, source: 'explicit' })
  await markDirty()
}

export async function clearPair(x: string, y: string): Promise<void> {
  await (await getDB()).delete('pairs', pairKey(x, y))
  await markDirty()
}

export async function putPairs(pairs: PairVerdict[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('pairs', 'readwrite')
  await Promise.all(pairs.map((p) => tx.store.put(p)))
  await tx.done
  await markDirty()
}

export function unorderedPairs<T>(xs: T[]): [T, T][] {
  const out: [T, T][] = []
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j < xs.length; j++) out.push([xs[i], xs[j]])
  }
  return out
}

/**
 * Materialise the pairs implied by a saved outfit. An explicit verdict the user
 * set by hand always wins, so derived records never overwrite one.
 */
export async function derivePairsFromOutfit(outfit: Outfit): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('pairs', 'readwrite')
  const verdict = outfit.verdict === 'works' ? 'good' : 'bad'
  for (const [x, y] of unorderedPairs(outfit.itemIds)) {
    const [a, b] = pairKey(x, y)
    const existing = await tx.store.get([a, b])
    if (existing?.source === 'explicit') continue
    await tx.store.put({ a, b, verdict, source: 'derived' })
  }
  await tx.done
  await markDirty()
}
