import { allItems } from '../db/items'
import { outfitsWithItem } from '../db/outfits'
import { useAsync } from '../hooks/useAsync'
import { OutfitCard } from './OutfitCard'

export function ItemOutfits({ itemId }: { itemId: string }) {
  const { value } = useAsync(
    async () => ({
      outfits: await outfitsWithItem(itemId),
      items: await allItems(true),
    }),
    [itemId],
  )

  const outfits = value?.outfits ?? []
  if (outfits.length === 0) return null

  const byId = new Map((value?.items ?? []).map((item) => [item.id, item]))

  return (
    <section className="space-y-3">
      <h2 className="text-muted text-xs tracking-wide uppercase">
        In {outfits.length} outfit{outfits.length === 1 ? '' : 's'}
      </h2>
      <ul className="space-y-3">
        {outfits.map((outfit) => (
          <OutfitCard
            key={outfit.id}
            outfit={outfit}
            items={outfit.itemIds.map((id) => byId.get(id)).filter((i) => i !== undefined)}
          />
        ))}
      </ul>
    </section>
  )
}
