import { navigate } from '../router'
import type { Item } from '../types'
import { SwatchDots } from './Swatches'
import { Thumb } from './Thumb'

export function ItemGrid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-3 pb-4">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => navigate(`/item/${item.id}`)}
          className="bg-surface border-line overflow-hidden rounded-xl border text-left"
        >
          <Thumb
            blobKey={item.thumbKey}
            alt={item.subcategory ?? item.category}
            className="aspect-square w-full"
          />
          <div className="space-y-1 p-1.5">
            <p className="truncate text-[11px] capitalize">
              {item.subcategory || item.category}
            </p>
            <SwatchDots colours={item.colours} />
          </div>
        </button>
      ))}
    </div>
  )
}
