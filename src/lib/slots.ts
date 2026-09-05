import type { Category, Item } from '../types'

export type Slot = 'full' | 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory'

export const SLOTS: Slot[] = ['full', 'top', 'bottom', 'outerwear', 'shoes', 'accessory']

/** Accessories are the only slot that holds more than one item. */
export const MULTI_SLOTS = new Set<Slot>(['accessory'])

export const SLOT_LABELS: Record<Slot, string> = {
  full: 'One-piece',
  top: 'Top',
  bottom: 'Bottom',
  outerwear: 'Outerwear',
  shoes: 'Shoes',
  accessory: 'Accessories',
}

export type SlotState = Record<Slot, string[]>

export function emptySlots(): SlotState {
  return { full: [], top: [], bottom: [], outerwear: [], shoes: [], accessory: [] }
}

export function slotForCategory(category: Category): Slot {
  return category
}

/** A one-piece stands in for top and bottom, so those slots are closed while it is filled. */
export function isSlotBlocked(slots: SlotState, slot: Slot): boolean {
  if (slot === 'full') return slots.top.length > 0 || slots.bottom.length > 0
  if (slot === 'top' || slot === 'bottom') return slots.full.length > 0
  return false
}

export function setSlot(slots: SlotState, slot: Slot, itemId: string): SlotState {
  const current = slots[slot]
  if (MULTI_SLOTS.has(slot)) {
    return {
      ...slots,
      [slot]: current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId],
    }
  }
  return { ...slots, [slot]: current[0] === itemId ? [] : [itemId] }
}

export function clearSlot(slots: SlotState, slot: Slot): SlotState {
  return { ...slots, [slot]: [] }
}

export function slotItemIds(slots: SlotState): string[] {
  return SLOTS.flatMap((slot) => slots[slot])
}

export function slotsFromItems(items: Item[]): SlotState {
  const slots = emptySlots()
  for (const item of items) {
    const slot = slotForCategory(item.category)
    if (MULTI_SLOTS.has(slot)) slots[slot].push(item.id)
    else if (slots[slot].length === 0) slots[slot] = [item.id]
    else slots.accessory.push(item.id)
  }
  return slots
}
