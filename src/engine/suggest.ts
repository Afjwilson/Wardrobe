import type { Category, Item } from '../types'
import { rankAgainst, scoreOutfit } from './outfit'
import type { Learning } from './types'

export type Suggestion = {
  items: Item[]
  score: number
  reason: string
  weakPairs: number
}

/** A complete outfit is a one-piece or a top and bottom, plus shoes. */
function requiredCategories(seed: Category): Category[] {
  const core: Category[] = seed === 'full' ? ['full', 'shoes'] : ['top', 'bottom', 'shoes']
  return core.filter((category) => category !== seed)
}

function signature(items: Item[]): string {
  return items
    .map((item) => item.id)
    .sort()
    .join('|')
}

function bestFor(
  chosen: Item[],
  pool: Item[],
  learning: Learning,
): Item | undefined {
  const ranked = rankAgainst(chosen, pool, learning)
  return ranked[0]?.item
}

/**
 * Greedy fill followed by one swap pass, per §7.6. The full combinatorial space
 * is not searched: with a few hundred items it is far too large, and the greedy
 * result is what the swap pass is there to clean up.
 */
export function suggestOutfits(
  seed: Item,
  wardrobe: Item[],
  learning: Learning,
  limit = 8,
): Suggestion[] {
  const candidates = wardrobe.filter((item) => item.id !== seed.id && !item.retired)
  const pools = new Map<Category, Item[]>()
  for (const category of requiredCategories(seed.category)) {
    const pool = candidates.filter((item) => item.category === category)
    if (pool.length > 0) pools.set(category, pool)
  }
  if (pools.size === 0) return []

  const [, firstPool] = [...pools.entries()][0]
  const restCategories = [...pools.keys()].slice(1)
  const openings = rankAgainst([seed], firstPool, learning).slice(0, limit)

  const suggestions = new Map<string, Suggestion>()

  for (const opening of openings) {
    let chosen = [seed, opening.item]

    for (const category of restCategories) {
      const next = bestFor(chosen, pools.get(category) ?? [], learning)
      if (next) chosen = [...chosen, next]
    }

    chosen = swapPass(chosen, seed, pools, learning)

    const result = scoreOutfit(chosen, learning)
    const worst = result.pairScores.reduce(
      (low, pair) => (pair.score < low.score ? pair : low),
      result.pairScores[0],
    )
    suggestions.set(signature(chosen), {
      items: chosen,
      score: result.score,
      reason: worst?.reason ?? '',
      weakPairs: result.weakPairs,
    })
  }

  return [...suggestions.values()].sort((x, y) => y.score - x.score).slice(0, limit)
}

/** One pass: try every alternative for each non-seed slot, keep what improves the total. */
function swapPass(
  chosen: Item[],
  seed: Item,
  pools: Map<Category, Item[]>,
  learning: Learning,
): Item[] {
  let current = chosen
  let best = scoreOutfit(current, learning).score

  for (let index = 0; index < current.length; index++) {
    const occupant = current[index]
    if (occupant.id === seed.id) continue
    for (const alternative of pools.get(occupant.category) ?? []) {
      if (alternative.id === occupant.id) continue
      const swapped = current.map((item, i) => (i === index ? alternative : item))
      const score = scoreOutfit(swapped, learning).score
      if (score > best) {
        best = score
        current = swapped
      }
    }
  }

  return current
}
