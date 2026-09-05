import { isSlotBlocked, SLOTS, type Slot, type SlotState } from '../lib/slots'
import type { Item } from '../types'
import { SlotRow } from './SlotRow'

export function SlotList({
  slots,
  byId,
  onOpen,
  onClear,
}: {
  slots: SlotState
  byId: Map<string, Item>
  onOpen: (slot: Slot) => void
  onClear: (slot: Slot) => void
}) {
  return (
    <div className="space-y-2">
      {SLOTS.map((slot) => (
        <SlotRow
          key={slot}
          slot={slot}
          items={slots[slot].map((id) => byId.get(id)).filter((item) => item !== undefined)}
          blocked={isSlotBlocked(slots, slot)}
          onOpen={() => onOpen(slot)}
          onClear={() => onClear(slot)}
        />
      ))}
    </div>
  )
}
