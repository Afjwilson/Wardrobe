import { useState } from 'react'
import { OutfitCard } from '../components/OutfitCard'
import { Chip, Empty, TopBar } from '../components/ui'
import { allItems } from '../db/items'
import { allOutfits } from '../db/outfits'
import { useAsync } from '../hooks/useAsync'
import { navigate } from '../router'

export function Outfits() {
  const [occasion, setOccasion] = useState<string | null>(null)
  const { value, loading } = useAsync(
    async () => ({ outfits: await allOutfits(), items: await allItems(true) }),
    [],
  )

  const outfits = value?.outfits ?? []
  const byId = new Map((value?.items ?? []).map((item) => [item.id, item]))
  const occasions = [...new Set(outfits.flatMap((o) => o.occasions))].sort()
  const visible = occasion ? outfits.filter((o) => o.occasions.includes(occasion)) : outfits

  return (
    <>
      <TopBar title="Outfits" />

      {occasions.length > 0 && (
        <div className="flex gap-2 overflow-x-auto px-3 py-3">
          <Chip active={!occasion} onClick={() => setOccasion(null)}>
            all
          </Chip>
          {occasions.map((tag) => (
            <Chip key={tag} active={occasion === tag} onClick={() => setOccasion(tag)}>
              {tag}
            </Chip>
          ))}
        </div>
      )}

      {loading ? (
        <Empty>Loading…</Empty>
      ) : visible.length === 0 ? (
        <Empty>
          {outfits.length
            ? 'No outfits with that tag.'
            : 'No outfits yet. Build one and mark whether it works.'}
        </Empty>
      ) : (
        <ul className="space-y-3 px-3 pb-4">
          {visible.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              items={outfit.itemIds.map((id) => byId.get(id)).filter((i) => i !== undefined)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => navigate('/build')}
        aria-label="Build outfit"
        className="bg-accent text-ink fixed right-5 bottom-24 z-20 h-14 w-14 rounded-full text-3xl leading-none shadow-lg"
      >
        +
      </button>
    </>
  )
}
