import { useState } from 'react'
import { runQuickExport } from '../backup/exporter'
import { fullBackupBlob, runFullBackup } from '../backup/zip'
import { ImportPanel } from '../components/ImportPanel'
import { Button, Empty, TopBar } from '../components/ui'
import { allItems, setRetired } from '../db/items'
import { getMeta, markExported } from '../db/meta'
import { useAsync } from '../hooks/useAsync'
import { canSaveOverLastBackup, saveOverLastBackup } from '../lib/saveFile'
import { formatBytes, storageStatus } from '../lib/storage'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-muted text-xs tracking-wide uppercase">{title}</h2>
      {children}
    </section>
  )
}

export function Settings() {
  const [status, setStatus] = useState<string>()
  const [busy, setBusy] = useState(false)
  const storage = useAsync(() => storageStatus(), [])
  const canOverwrite = useAsync(() => canSaveOverLastBackup(), [])
  const lastExport = useAsync(() => getMeta<number>('lastExportAt'), [status])
  const retired = useAsync(async () => (await allItems(true)).filter((i) => i.retired), [status])

  async function quickExport() {
    const outcome = await runQuickExport()
    setStatus(
      outcome === 'cancelled' ? 'Export cancelled.' : 'Quick export saved (metadata only).',
    )
  }

  async function fullBackup() {
    setBusy(true)
    try {
      const outcome = await runFullBackup()
      setStatus(
        outcome === 'cancelled' ? 'Backup cancelled.' : 'Full backup saved, photos included.',
      )
      canOverwrite.reload()
    } finally {
      setBusy(false)
    }
  }

  async function overwrite() {
    setBusy(true)
    try {
      const written = await saveOverLastBackup(await fullBackupBlob())
      setStatus(
        written
          ? 'Wrote over the last backup file.'
          : 'Could not reach that file — save a new backup instead.',
      )
      if (written) await markExported()
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar title="Settings" />
      <div className="space-y-8 px-4 py-4">
        <Section title="Backup">
          <div className="grid gap-3">
            <Button onClick={() => void quickExport()}>Quick export (JSON, no photos)</Button>
            <Button variant="ghost" onClick={() => void fullBackup()} disabled={busy}>
              {busy ? 'Zipping photos…' : 'Full backup (ZIP, with photos)'}
            </Button>
            {canOverwrite.value && (
              <Button variant="ghost" onClick={() => void overwrite()} disabled={busy}>
                Save over last backup
              </Button>
            )}
          </div>
          <p className="text-muted text-xs">
            {lastExport.value
              ? `Last export ${new Date(lastExport.value).toLocaleDateString()}.`
              : 'Never exported. Photos are only on this device.'}
          </p>
          {status && <p className="text-sm">{status}</p>}
        </Section>

        <Section title="Import">
          <ImportPanel onImported={() => setStatus('Import complete.')} />
        </Section>

        <Section title="Storage">
          <div className="bg-surface border-line rounded-xl border p-3 text-sm">
            <p>
              {formatBytes(storage.value?.usageBytes)} used
              {storage.value?.quotaBytes
                ? ` of about ${formatBytes(storage.value.quotaBytes)}`
                : ''}
              .
            </p>
            <p className="text-muted mt-1 text-xs">
              {storage.value?.persisted
                ? 'Storage is persistent — the browser has agreed not to evict this data.'
                : 'The browser did not grant persistent storage, so data could be evicted under storage pressure. Export more often.'}
            </p>
          </div>
        </Section>

        <Section title={`Retired items (${retired.value?.length ?? 0})`}>
          {retired.value?.length ? (
            <ul className="bg-surface border-line divide-line divide-y rounded-xl border text-sm">
              {retired.value.map((item) => (
                <li key={item.id} className="flex items-center justify-between px-3 py-2.5">
                  <span className="capitalize">{item.subcategory || item.category}</span>
                  <button
                    type="button"
                    className="text-accent min-h-10 px-2 text-xs"
                    onClick={async () => {
                      await setRetired(item.id, false)
                      setStatus(`Un-retired ${item.subcategory || item.category}.`)
                    }}
                  >
                    un-retire
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing retired.</Empty>
          )}
        </Section>
      </div>
    </>
  )
}
