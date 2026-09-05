import { SLOT_LABELS, type Slot } from '../lib/slots'
import type { Item } from '../types'
import { Thumb } from './Thumb'

export function SlotRow({
  slot,
  items,
  blocked,
  onOpen,
  onClear,
}: {
  slot: Slot
  items: Item[]
  blocked: boolean
  onOpen: () => void
  onClear: () => void
}) {
  return (
    <div
      className={`bg-surface border-line flex items-center gap-3 rounded-xl border p-2 ${
        blocked ? 'opacity-40' : ''
      }`}
    >
      <button
        type="button"
        disabled={blocked}
        onClick={onOpen}
        className="flex min-h-16 flex-1 items-center gap-3 text-left"
      >
        {items.length === 0 ? (
          <>
            <span className="bg-surface-2 text-muted grid h-14 w-14 shrink-0 place-items-center rounded-lg text-2xl">
              +
            </span>
            <span className="text-muted text-sm">{SLOT_LABELS[slot]}</span>
          </>
        ) : (
          <>
            <span className="flex shrink-0 -space-x-3">
              {items.slice(0, 3).map((item) => (
                <Thumb
                  key={item.id}
                  blobKey={item.thumbKey}
                  alt={item.subcategory ?? item.category}
                  className="border-ink h-14 w-14 rounded-lg border-2"
                />
              ))}
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-muted block text-[10px] tracking-wide uppercase">
                {SLOT_LABELS[slot]}
              </span>
              <span className="block truncate text-sm capitalize">
                {items.map((i) => i.subcategory || i.category).join(', ')}
              </span>
            </span>
          </>
        )}
      </button>

      {items.length > 0 && (
        <button type="button" onClick={onClear} className="text-muted min-h-10 px-2 text-xs">
          clear
        </button>
      )}
    </div>
  )
}
