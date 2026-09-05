import { useState } from 'react'
import { ItemGrid } from '../components/ItemGrid'
import { Chip, Empty, TopBar } from '../components/ui'
import { allItems } from '../db/items'
import { useAsync } from '../hooks/useAsync'
import { navigate } from '../router'
import { CATEGORIES, SEASONS, type Category, type Season } from '../types'

export function Wardrobe() {
  const [category, setCategory] = useState<Category | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const { value: items, loading } = useAsync(() => allItems(), [])

  const visible = (items ?? []).filter(
    (item) =>
      (!category || item.category === category) &&
      (!season || item.seasons.includes(season)),
  )

  return (
    <>
      <TopBar title="Wardrobe" />

      <div className="space-y-2 py-3">
        <div className="flex gap-2 overflow-x-auto px-3">
          <Chip active={!category} onClick={() => setCategory(null)}>
            all
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto px-3">
          <Chip active={!season} onClick={() => setSeason(null)}>
            any season
          </Chip>
          {SEASONS.map((s) => (
            <Chip key={s} active={season === s} onClick={() => setSeason(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </div>

      {loading ? (
        <Empty>Loading…</Empty>
      ) : visible.length === 0 ? (
        <Empty>
          {items?.length
            ? 'Nothing matches those filters.'
            : 'No items yet. Tap + to photograph the first one.'}
        </Empty>
      ) : (
        <ItemGrid items={visible} />
      )}

      <button
        type="button"
        onClick={() => navigate('/add')}
        aria-label="Add item"
        className="bg-accent text-ink fixed right-5 bottom-24 z-20 h-14 w-14 rounded-full text-3xl leading-none shadow-lg"
      >
        +
      </button>
    </>
  )
}
