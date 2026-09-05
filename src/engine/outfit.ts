import type { Item } from '../types'
import { scorePair } from './score'
import type { Learning, OutfitScore, PairScore } from './types'

export const WEAK_PAIR_THRESHOLD = 30
const WEAK_PAIR_PENALTY = 15

export function unorderedPairs<T>(xs: T[]): [T, T][] {
  const out: [T, T][] = []
  for (let i = 0; i < xs.length; i++) {
    for (let j = i + 1; j < xs.length; j++) out.push([xs[i], xs[j]])
  }
  return out
}

/**
 * Mean of the pair scores, minus a flat penalty per weak pair: one bad pair
 * spoils an outfit even when the average looks fine.
 */
export function scoreOutfit(items: Item[], learning: Learning): OutfitScore {
  const pairs = unorderedPairs(items)
  if (pairs.length === 0) return { score: 0, pairScores: [], weakPairs: 0 }

  const scored = pairs.map(([a, b]) => {
    const result = scorePair(a, b, learning)
    return { a: a.id, b: b.id, score: result.score, reason: result.reason }
  })
  const mean = scored.reduce((sum, p) => sum + p.score, 0) / scored.length
  const weakPairs = scored.filter((p) => p.score < WEAK_PAIR_THRESHOLD).length

  return {
    score: Math.round(Math.max(0, Math.min(100, mean - WEAK_PAIR_PENALTY * weakPairs))),
    pairScores: scored,
    weakPairs,
  }
}

/** Ranks candidates against a fixed set of already-chosen items. */
export function rankAgainst(
  chosen: Item[],
  candidates: Item[],
  learning: Learning,
): { item: Item; score: number; reason: string }[] {
  return candidates
    .map((candidate) => {
      const scores: PairScore[] = chosen
        .filter((item) => item.id !== candidate.id)
        .map((item) => scorePair(item, candidate, learning))
      if (scores.length === 0) return { item: candidate, score: 50, reason: 'nothing to compare yet' }
      const mean = scores.reduce((sum, s) => sum + s.score, 0) / scores.length
      const worst = scores.reduce((low, s) => (s.score < low.score ? s : low), scores[0])
      return { item: candidate, score: Math.round(mean), reason: worst.reason }
    })
    .sort((x, y) => y.score - x.score)
}
