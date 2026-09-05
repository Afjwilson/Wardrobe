import { SwatchDots } from './Swatches'
import { Thumb } from './Thumb'
import type { Item } from '../types'

/** Full-screen sheet; no modal that needs a back gesture to escape. */
export function ItemPicker({
  title,
  items,
  selectedIds,
  onPick,
  onClose,
}: {
  title: string
  items: Item[]
  selectedIds: string[]
  onPick: (item: Item) => void
  onClose: () => void
}) {
  return (
    <div className="bg-ink fixed inset-0 z-30 flex flex-col">
      <header className="border-line safe-top flex items-center gap-3 border-b px-4 pb-3">
        <h2 className="flex-1 text-lg font-semibold">{title}</h2>
        <button type="button" onClick={onClose} className="text-accent min-h-10 px-2">
          Done
        </button>
      </header>

      {items.length === 0 ? (
        <p className="text-muted px-6 py-16 text-center text-sm">
          Nothing in the wardrobe for this slot yet.
        </p>
      ) : (
        <ul className="divide-line flex-1 divide-y overflow-y-auto">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id)
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left ${
                    selected ? 'bg-surface-2' : ''
                  }`}
                >
                  <Thumb
                    blobKey={item.thumbKey}
                    alt={item.subcategory ?? item.category}
                    className="h-14 w-14 shrink-0 rounded-lg"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm capitalize">
                      {item.subcategory || item.category}
                    </span>
                    <span className="text-muted block text-xs">
                      formality {item.formality} · {item.pattern}
                    </span>
                  </span>
                  <SwatchDots colours={item.colours} />
                  {selected && <span className="text-accent">✓</span>}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
