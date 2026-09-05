import { useEffect, useState } from 'react'
import { ItemPicker } from '../components/ItemPicker'
import { EMPTY_OUTFIT_META, OutfitMeta, type OutfitMetaValues } from '../components/OutfitMeta'
import { OutfitScoreHeader } from '../components/OutfitScoreHeader'
import { SlotList } from '../components/SlotList'
import { Button, Empty, TopBar } from '../components/ui'
import { allItems } from '../db/items'
import { getOutfit, putOutfit } from '../db/outfits'
import { derivePairsFromOutfit } from '../db/pairs'
import { rankAgainst } from '../engine'
import { useAsync } from '../hooks/useAsync'
import { useLearning } from '../hooks/useLearning'
import { newId } from '../lib/id'
import {
  clearSlot,
  emptySlots,
  setSlot,
  SLOT_LABELS,
  slotItemIds,
  slotsFromItems,
  type Slot,
  type SlotState,
} from '../lib/slots'
import { navigate } from '../router'
import type { Outfit, Verdict } from '../types'

export function OutfitBuilder({
  outfitId,
  presetItemIds,
}: {
  outfitId?: string
  /** Comma-separated ids from a suggestion opened in the builder. A string,
   * not an array, so the prefill effect does not re-run on every render. */
  presetItemIds?: string
}) {
  const [slots, setSlots] = useState<SlotState>(emptySlots)
  const [meta, setMeta] = useState<OutfitMetaValues>(EMPTY_OUTFIT_META)
  const [open, setOpen] = useState<Slot>()
  const [saving, setSaving] = useState(false)

  const { value: items, loading } = useAsync(() => allItems(), [])
  const { value: learning } = useLearning([])
  const { value: existing } = useAsync(
    async () => (outfitId ? await getOutfit(outfitId) : undefined),
    [outfitId],
  )

  useEffect(() => {
    if (!items) return
    if (existing) {
      const chosen = existing.itemIds
        .map((id) => items.find((i) => i.id === id))
        .filter((item) => item !== undefined)
      setSlots(slotsFromItems(chosen))
      setMeta({
        occasions: existing.occasions,
        rating: existing.rating,
        notes: existing.notes ?? '',
      })
      return
    }
    if (presetItemIds) {
      const chosen = presetItemIds
        .split(',')
        .map((id) => items.find((i) => i.id === id))
        .filter((item) => item !== undefined)
      setSlots(slotsFromItems(chosen))
    }
  }, [existing, items, presetItemIds])

  const byId = new Map((items ?? []).map((item) => [item.id, item]))
  const chosenIds = slotItemIds(slots)
  const chosenItems = chosenIds.map((id) => byId.get(id)).filter((i) => i !== undefined)

  // The picker for a slot is ranked against whatever is already in the outfit.
  const ranked =
    open && learning
      ? rankAgainst(
          chosenItems.filter((i) => !slots[open].includes(i.id)),
          (items ?? []).filter((item) => item.category === open),
          learning,
        )
      : undefined

  async function save(verdict: Verdict) {
    if (chosenIds.length < 2) return
    setSaving(true)
    const outfit: Outfit = {
      id: existing?.id ?? newId('o_'),
      itemIds: chosenIds,
      verdict,
      rating: meta.rating,
      occasions: meta.occasions,
      notes: meta.notes.trim() || undefined,
      photoKey: existing?.photoKey,
      wornDates: existing?.wornDates ?? [],
      createdAt: existing?.createdAt ?? Date.now(),
    }
    await putOutfit(outfit)
    await derivePairsFromOutfit(outfit)
    navigate('/outfits', { replace: true })
  }

  if (loading) return <Empty>Loading…</Empty>

  return (
    <>
      <TopBar title={existing ? 'Edit outfit' : 'Build outfit'} showBack />

      <div className="space-y-5 px-4 py-4">
        <OutfitScoreHeader items={chosenItems} learning={learning} />

        <SlotList
          slots={slots}
          byId={byId}
          onOpen={setOpen}
          onClear={(slot) => setSlots(clearSlot(slots, slot))}
        />

        <OutfitMeta values={meta} onChange={setMeta} />

        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={() => void save('no')} disabled={saving || chosenIds.length < 2}>
            Doesn't work
          </Button>
          <Button onClick={() => void save('works')} disabled={saving || chosenIds.length < 2}>
            Works
          </Button>
        </div>
        {chosenIds.length < 2 && (
          <p className="text-muted text-xs">Pick at least two items to save a verdict.</p>
        )}
      </div>

      {open && (
        <ItemPicker
          title={SLOT_LABELS[open]}
          items={
            ranked?.map((entry) => entry.item) ??
            (items ?? []).filter((item) => item.category === open)
          }
          selectedIds={slots[open]}
          annotations={
            chosenItems.length > 0 && ranked
              ? new Map(ranked.map((e) => [e.item.id, { score: e.score, reason: e.reason }]))
              : undefined
          }
          onPick={(item) => setSlots(setSlot(slots, open, item.id))}
          onClose={() => setOpen(undefined)}
        />
      )}
    </>
  )
}
