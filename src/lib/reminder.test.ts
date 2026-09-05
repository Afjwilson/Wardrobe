import { describe, expect, it } from 'vitest'
import { REMIND_AFTER_DAYS, shouldRemindExport } from './reminder'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 0, 30)
const daysAgo = (days: number) => NOW - days * DAY

describe('shouldRemindExport', () => {
  it('stays quiet while nothing has changed since the last export', () => {
    expect(
      shouldRemindExport({ dirty: false, lastExportAt: daysAgo(90) }, NOW),
    ).toBe(false)
  })

  it('reminds once the data is stale and changed', () => {
    expect(
      shouldRemindExport({ dirty: true, lastExportAt: daysAgo(REMIND_AFTER_DAYS + 1) }, NOW),
    ).toBe(true)
  })

  it('stays quiet inside the window', () => {
    expect(
      shouldRemindExport({ dirty: true, lastExportAt: daysAgo(REMIND_AFTER_DAYS - 1) }, NOW),
    ).toBe(false)
  })

  it('treats a dismissal as resetting the timer', () => {
    expect(
      shouldRemindExport(
        { dirty: true, lastExportAt: daysAgo(60), dismissedAt: daysAgo(2) },
        NOW,
      ),
    ).toBe(false)
  })

  it('falls back to first launch when nothing has ever been exported', () => {
    expect(shouldRemindExport({ dirty: true, firstLaunchAt: daysAgo(30) }, NOW)).toBe(true)
    expect(shouldRemindExport({ dirty: true, firstLaunchAt: daysAgo(3) }, NOW)).toBe(false)
  })

  it('says nothing on a device with no history at all', () => {
    expect(shouldRemindExport({ dirty: true }, NOW)).toBe(false)
  })
})
