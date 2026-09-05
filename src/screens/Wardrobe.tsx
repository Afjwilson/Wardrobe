import { useState } from 'react'
import { ExportReminder } from '../components/ExportReminder'
import { ItemGrid } from '../components/ItemGrid'
import { Chip, Empty, TopBar } from '../components/ui'
import { allItems } from '../db/items'
import { useAsync } from '../hooks/useAsync'
import { COLOUR_FAMILIES, family, type ColourFamily } from '../lib/colour'
import { navigate } from '../router'
import {
  CATEGORIES,
  SEASONS,
  type Category,
  type Scale5,
  type Season,
} from '../types'

/** The 1–5 scale from the data model, named so the chips mean something. */
const FORMALITY_CHIPS: [Scale5, string][] = [
  [1, 'gym'],
  [2, 'casual'],
  [3, 'smart casual'],
  [4, 'smart'],
  [5, 'formal'],
]

export function Wardrobe() {
  const [category, setCategory] = useState<Category | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [colour, setColour] = useState<ColourFamily | null>(null)
  const [formality, setFormality] = useState<Scale5 | null>(null)
  const { value: items, loading } = useAsync(() => allItems(), [])

  const visible = (items ?? []).filter(
    (item) =>
      (!category || item.category === category) &&
      (!season || item.seasons.includes(season)) &&
      (!colour || item.colours.some((swatch) => family(swatch.hex) === colour)) &&
      (!formality || item.formality === formality),
  )

  return (
    <>
      <TopBar title="Wardrobe" />
      <div className="pt-3">
        <ExportReminder />
      </div>

      <div className="space-y-2 pb-3">
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
        <div className="flex gap-2 overflow-x-auto px-3">
          <Chip active={!colour} onClick={() => setColour(null)}>
            any colour
          </Chip>
          {COLOUR_FAMILIES.map((f) => (
            <Chip key={f} active={colour === f} onClick={() => setColour(f)}>
              {f}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto px-3">
          <Chip active={!formality} onClick={() => setFormality(null)}>
            any formality
          </Chip>
          {FORMALITY_CHIPS.map(([value, label]) => (
            <Chip
              key={value}
              active={formality === value}
              onClick={() => setFormality(value)}
            >
              {label}
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
