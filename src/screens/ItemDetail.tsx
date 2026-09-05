import { SwatchBar } from '../components/Swatches'
import { Thumb } from '../components/Thumb'
import { Button, Empty, TopBar } from '../components/ui'
import { deleteBlob, forgetBlobUrl } from '../db/blobs'
import { deleteItem, getItem, setRetired } from '../db/items'
import { useAsync } from '../hooks/useAsync'
import { navigate } from '../router'
import type { Item } from '../types'

function Attributes({ item }: { item: Item }) {
  const rows: [string, string][] = [
    ['Category', item.category],
    ['Formality', `${item.formality} / 5`],
    ['Warmth', `${item.warmth} / 5`],
    ['Pattern', item.pattern],
    ['Seasons', item.seasons.join(', ') || 'any'],
  ]
  return (
    <dl className="bg-surface border-line divide-line divide-y rounded-xl border text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between px-3 py-2.5">
          <dt className="text-muted">{label}</dt>
          <dd className="capitalize">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ItemDetail({ id }: { id: string }) {
  const { value: item, loading, reload } = useAsync(() => getItem(id), [id])

  async function remove() {
    if (!item) return
    if (!window.confirm('Delete this item and its photo? This cannot be undone.')) return
    await Promise.all([deleteBlob(item.photoKey), deleteBlob(item.thumbKey)])
    forgetBlobUrl(item.photoKey)
    forgetBlobUrl(item.thumbKey)
    await deleteItem(item.id)
    navigate('/', { replace: true })
  }

  if (loading) return <Empty>Loading…</Empty>
  if (!item) return <Empty>That item is gone.</Empty>

  return (
    <>
      <TopBar title={item.subcategory || item.category} showBack />
      <div className="space-y-5 px-4 py-4">
        <Thumb
          blobKey={item.photoKey}
          alt={item.subcategory ?? item.category}
          className="bg-surface max-h-96 w-full rounded-xl"
        />

        <SwatchBar colours={item.colours} />
        <Attributes item={item} />

        {item.notes && <p className="text-muted text-sm">{item.notes}</p>}
        {item.retired && (
          <p className="text-muted bg-surface border-line rounded-xl border p-3 text-sm">
            Retired — hidden from the wardrobe grid and from suggestions.
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="ghost"
            onClick={async () => {
              await setRetired(item.id, !item.retired)
              reload()
            }}
          >
            {item.retired ? 'Un-retire' : 'Retire'}
          </Button>
          <Button variant="danger" onClick={() => void remove()}>
            Delete
          </Button>
        </div>
      </div>
    </>
  )
}
