import { allItems } from '../db/items'
import { getPair, setExplicitPair, clearPair } from '../db/pairs'
import { scorePair } from '../engine'
import { useAsync } from '../hooks/useAsync'
import { useLearning } from '../hooks/useLearning'
import { navigate } from '../router'
import type { Item } from '../types'
import { ScoreBadge } from './ScoreBadge'
import { Thumb } from './Thumb'

const SHOWN = 8

export function GoesWith({ item }: { item: Item }) {
  const { value: items } = useAsync(() => allItems(), [item.id])
  const { value: learning, reload } = useLearning([item.id])
  const { value: verdicts, reload: reloadVerdicts } = useAsync(async () => {
    const others = (await allItems()).filter((other) => other.id !== item.id)
    const entries = await Promise.all(
      others.map(async (other) => {
        const stored = await getPair(item.id, other.id)
        // Only a verdict the user set by hand lights the buttons up.
        return [other.id, stored?.source === 'explicit' ? stored.verdict : undefined] as const
      }),
    )
    return new Map(entries)
  }, [item.id])

  if (!items || !learning) return null

  const ranked = items
    .filter((other) => other.id !== item.id && other.category !== item.category)
    .map((other) => ({ other, ...scorePair(item, other, learning) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, SHOWN)

  if (ranked.length === 0) return null

  async function mark(otherId: string, verdict: 'good' | 'bad') {
    const stored = await getPair(item.id, otherId)
    if (stored?.source === 'explicit' && stored.verdict === verdict) {
      await clearPair(item.id, otherId)
    } else {
      await setExplicitPair(item.id, otherId, verdict)
    }
    reload()
    reloadVerdicts()
  }

  return (
    <section className="space-y-3">
      <h2 className="text-muted text-xs tracking-wide uppercase">Goes with</h2>
      {learning.coldStart && (
        <p className="text-muted bg-surface border-line rounded-xl border p-3 text-xs">
          Early days: with {learning.itemCount} items and {learning.ratedOutfitCount} rated
          outfits, these are generic colour and formality suggestions. They sharpen as you record
          verdicts.
        </p>
      )}
      <ul className="bg-surface border-line divide-line divide-y rounded-xl border">
        {ranked.map(({ other, score, reason }) => (
          <li key={other.id} className="flex items-center gap-3 p-2">
            <button
              type="button"
              onClick={() => navigate(`/item/${other.id}`)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <Thumb
                blobKey={other.thumbKey}
                alt={other.subcategory ?? other.category}
                className="h-12 w-12 shrink-0 rounded-lg"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm capitalize">
                  {other.subcategory || other.category}
                </span>
                <span className="text-muted block truncate text-xs">{reason}</span>
              </span>
              <ScoreBadge score={score} />
            </button>
            <span className="flex shrink-0 gap-1">
              <button
                type="button"
                aria-label={`Mark good with ${other.subcategory ?? other.category}`}
                onClick={() => void mark(other.id, 'good')}
                className={`min-h-10 px-1.5 ${
                  verdicts?.get(other.id) === 'good' ? 'text-good' : 'text-muted'
                }`}
              >
                ✓
              </button>
              <button
                type="button"
                aria-label={`Mark bad with ${other.subcategory ?? other.category}`}
                onClick={() => void mark(other.id, 'bad')}
                className={`min-h-10 px-1.5 ${
                  verdicts?.get(other.id) === 'bad' ? 'text-bad' : 'text-muted'
                }`}
              >
                ✕
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
