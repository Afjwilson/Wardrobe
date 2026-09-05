import {
  COLD_START_ITEMS,
  COLD_START_OUTFITS,
  scoreOutfit,
  type Learning,
} from '../engine'
import type { Item } from '../types'
import { ScoreBadge } from './ScoreBadge'

/** Live score for the outfit being built, with the reason for its worst pair. */
export function OutfitScoreHeader({
  items,
  learning,
}: {
  items: Item[]
  learning: Learning | undefined
}) {
  if (!learning || items.length < 2) return null

  const result = scoreOutfit(items, learning)
  const worst = result.pairScores.reduce(
    (low, pair) => (pair.score < low.score ? pair : low),
    result.pairScores[0],
  )

  return (
    <div className="bg-surface border-line space-y-1 rounded-xl border p-3">
      <div className="flex items-center gap-3">
        <ScoreBadge score={result.score} size="lg" />
        <p className="text-muted flex-1 text-xs">
          {result.weakPairs > 0
            ? `${result.weakPairs} weak pair${result.weakPairs === 1 ? '' : 's'} dragging this down`
            : 'No weak pairs'}
        </p>
      </div>
      <p className="text-muted text-xs">{worst.reason}</p>
      {learning.coldStart && (
        <p className="text-muted text-xs">
          Generic for now — under {COLD_START_ITEMS} items or {COLD_START_OUTFITS} rated outfits,
          nothing is learned yet.
        </p>
      )}
    </div>
  )
}
