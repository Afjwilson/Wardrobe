export const REMIND_AFTER_DAYS = 14
const DAY = 24 * 60 * 60 * 1000

export type ReminderState = {
  dirty: boolean
  lastExportAt?: number
  dismissedAt?: number
  firstLaunchAt?: number
}

/**
 * One dismissible banner, and nothing more aggressive: shown only when data has
 * changed since the last export and 14 days have passed since the last export
 * or dismissal, whichever is later.
 */
export function shouldRemindExport(state: ReminderState, now = Date.now()): boolean {
  if (!state.dirty) return false
  const since = Math.max(
    state.lastExportAt ?? 0,
    state.dismissedAt ?? 0,
    state.firstLaunchAt ?? 0,
  )
  if (since === 0) return false
  return now - since > REMIND_AFTER_DAYS * DAY
}
