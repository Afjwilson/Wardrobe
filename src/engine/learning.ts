import { family } from '../lib/colour'
import type { Item, Outfit, PairVerdict } from '../types'
import type { Learning } from './types'

export const COLD_START_ITEMS = 20
export const COLD_START_OUTFITS = 10

export function key(x: string, y: string): string {
  return x < y ? `${x}|${y}` : `${y}|${x}`
}

export function familyKey(x: string, y: string): string {
  return x < y ? `${x}|${y}` : `${y}|${x}`
}

function pairsOf(ids: string[]): [string, string][] {
  const out: [string, string][] = []
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) out.push([ids[i], ids[j]])
  }
  return out
}

function bump(map: Map<string, number>, k: string): void {
  map.set(k, (map.get(k) ?? 0) + 1)
}

function dominantFamily(item: Item): string | undefined {
  const swatch = item.colours.find((c) => c.role === 'dominant') ?? item.colours[0]
  return swatch ? family(swatch.hex) : undefined
}

/**
 * Fold stored verdicts and outfits into the counts the learned term needs.
 * Only explicit `PairVerdict`s are read from the pairs store: the derived ones
 * mirror outfit data that is counted here directly, and counting both would
 * double-weight the same evidence.
 */
export function buildLearning(
  items: Item[],
  outfits: Outfit[],
  pairs: PairVerdict[],
): Learning {
  const explicit = new Map<string, 'good' | 'bad'>()
  for (const pair of pairs) {
    if (pair.source === 'explicit') explicit.set(key(pair.a, pair.b), pair.verdict)
  }

  const works = new Map<string, number>()
  const rejected = new Map<string, number>()
  const familyCounts = new Map<string, number>()
  const byId = new Map(items.map((item) => [item.id, item]))

  for (const outfit of outfits) {
    for (const [x, y] of pairsOf(outfit.itemIds)) {
      bump(outfit.verdict === 'works' ? works : rejected, key(x, y))
      if (outfit.verdict !== 'works') continue
      const fx = byId.get(x) && dominantFamily(byId.get(x)!)
      const fy = byId.get(y) && dominantFamily(byId.get(y)!)
      if (fx && fy) bump(familyCounts, familyKey(fx, fy))
    }
  }

  const familyPrecedent = new Set(
    [...familyCounts.entries()].filter(([, count]) => count >= 3).map(([k]) => k),
  )

  const ratedOutfitCount = outfits.length
  return {
    explicit,
    works,
    rejected,
    familyPrecedent,
    itemCount: items.length,
    ratedOutfitCount,
    coldStart: items.length < COLD_START_ITEMS || ratedOutfitCount < COLD_START_OUTFITS,
  }
}

export const EMPTY_LEARNING: Learning = {
  explicit: new Map(),
  works: new Map(),
  rejected: new Map(),
  familyPrecedent: new Set(),
  itemCount: 0,
  ratedOutfitCount: 0,
  coldStart: true,
}
