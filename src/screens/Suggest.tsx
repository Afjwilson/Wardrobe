import { useState } from 'react'
import { ItemPicker } from '../components/ItemPicker'
import { ScoreBadge } from '../components/ScoreBadge'
import { Thumb } from '../components/Thumb'
import { Button, Empty, TopBar } from '../components/ui'
import { allItems } from '../db/items'
import { suggestOutfits } from '../engine/suggest'
import { useAsync } from '../hooks/useAsync'
import { useLearning } from '../hooks/useLearning'
import { navigate } from '../router'

export function Suggest() {
  const [seedId, setSeedId] = useState<string>()
  const [picking, setPicking] = useState(false)
  const { value: items } = useAsync(() => allItems(), [])
  const { value: learning } = useLearning([])

  const seed = items?.find((item) => item.id === seedId)
  const suggestions =
    seed && items && learning ? suggestOutfits(seed, items, learning) : []

  return (
    <>
      <TopBar title="Suggest" />

      <div className="space-y-4 px-4 py-4">
        <Button variant="ghost" onClick={() => setPicking(true)}>
          {seed ? `Around: ${seed.subcategory || seed.category}` : 'Pick an item you are holding'}
        </Button>

        {learning?.coldStart && seed && (
          <p className="text-muted bg-surface border-line rounded-xl border p-3 text-xs">
            Early days: with {learning.itemCount} items and {learning.ratedOutfitCount} rated
            outfits these are generic. Record a few verdicts and they get specific.
          </p>
        )}

        {seed && suggestions.length === 0 && (
          <Empty>Not enough other items to build a complete outfit yet.</Empty>
        )}

        <ul className="space-y-3">
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.items.map((i) => i.id).join('|')}
              className="bg-surface border-line space-y-2 rounded-xl border p-3"
            >
              <div className="flex items-center gap-2">
                <ScoreBadge score={suggestion.score} size="lg" />
                <p className="text-muted flex-1 text-xs">{suggestion.reason}</p>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {suggestion.items.map((item) => (
                  <Thumb
                    key={item.id}
                    blobKey={item.thumbKey}
                    alt={item.subcategory ?? item.category}
                    className="h-16 w-16 shrink-0 rounded-lg"
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  navigate(`/build?items=${suggestion.items.map((i) => i.id).join(',')}`)
                }
                className="text-accent min-h-10 text-sm"
              >
                Open in builder →
              </button>
            </li>
          ))}
        </ul>

        {!seed && <Empty>Pick the item you are holding and get eight outfits around it.</Empty>}
      </div>

      {picking && items && (
        <ItemPicker
          title="Build around"
          items={items}
          selectedIds={seed ? [seed.id] : []}
          onPick={(item) => {
            setSeedId(item.id)
            setPicking(false)
          }}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  )
}
