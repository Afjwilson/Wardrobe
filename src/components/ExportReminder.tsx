import { useState } from 'react'
import { runQuickExport } from '../backup/exporter'
import { getMeta, setMeta } from '../db/meta'
import { useAsync } from '../hooks/useAsync'
import { shouldRemindExport } from '../lib/reminder'

/** One dismissible banner on the Wardrobe screen. Nothing more aggressive. */
export function ExportReminder() {
  const [hidden, setHidden] = useState(false)
  const { value: due, reload } = useAsync(async () => {
    const [dirty, lastExportAt, dismissedAt, firstLaunchAt] = await Promise.all([
      getMeta<boolean>('dirtySinceExport'),
      getMeta<number>('lastExportAt'),
      getMeta<number>('exportBannerDismissedAt'),
      getMeta<number>('firstLaunchAt'),
    ])
    return shouldRemindExport({
      dirty: dirty === true,
      lastExportAt,
      dismissedAt,
      firstLaunchAt,
    })
  }, [])

  if (!due || hidden) return null

  async function dismiss() {
    await setMeta('exportBannerDismissedAt', Date.now())
    setHidden(true)
  }

  return (
    <div className="border-accent/40 bg-surface mx-3 mb-3 space-y-2 rounded-xl border p-3">
      <p className="text-sm">
        It has been a while since you backed up. Everything here lives on this phone only.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            await runQuickExport()
            setHidden(true)
            reload()
          }}
          className="bg-accent text-ink min-h-10 flex-1 rounded-lg px-3 text-sm font-semibold"
        >
          Export now
        </button>
        <button
          type="button"
          onClick={() => void dismiss()}
          className="text-muted min-h-10 px-3 text-sm"
        >
          Later
        </button>
      </div>
    </div>
  )
}
