import { navigate } from '../router'
import type { Item, Outfit } from '../types'
import { Thumb } from './Thumb'

export function OutfitCard({
  outfit,
  items,
  footer,
}: {
  outfit: Outfit
  items: Item[]
  footer?: React.ReactNode
}) {
  return (
    <li className="bg-surface border-line space-y-2 rounded-xl border p-3">
      <button
        type="button"
        onClick={() => navigate(`/build?id=${outfit.id}`)}
        className="w-full space-y-2 text-left"
      >
        <div className="flex gap-2 overflow-x-auto">
          {items.map((item) => (
            <Thumb
              key={item.id}
              blobKey={item.thumbKey}
              alt={item.subcategory ?? item.category}
              className="h-16 w-16 shrink-0 rounded-lg"
            />
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={outfit.verdict === 'works' ? 'text-good' : 'text-bad'}>
            {outfit.verdict === 'works' ? 'works' : "doesn't work"}
          </span>
          {outfit.rating && <span className="text-muted">{outfit.rating}/5</span>}
          {outfit.occasions.length > 0 && (
            <span className="text-muted truncate">{outfit.occasions.join(' · ')}</span>
          )}
          {outfit.wornDates.length > 0 && (
            <span className="text-muted">worn {outfit.wornDates.length}×</span>
          )}
        </div>
      </button>
      {footer}
    </li>
  )
}
