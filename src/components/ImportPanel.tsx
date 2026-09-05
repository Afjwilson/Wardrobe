import { useRef, useState } from 'react'
import { applyImport, planImport, type ImportPlan } from '../backup/importer'
import { Button } from './ui'

export function ImportPanel({ onImported }: { onImported: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [plan, setPlan] = useState<ImportPlan>()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)

  async function choose(file: File | undefined) {
    if (!file) return
    setError(undefined)
    setPlan(undefined)
    try {
      setPlan(await planImport(file))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read that file.')
    }
  }

  async function run(mode: 'merge' | 'replace') {
    if (!plan) return
    if (
      mode === 'replace' &&
      !window.confirm(
        'Replace wipes every item, outfit and photo on this device before restoring. Continue?',
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await applyImport(plan, mode)
      setPlan(undefined)
      if (inputRef.current) inputRef.current.value = ''
      onImported()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".json,.zip"
        onChange={(e) => void choose(e.target.files?.[0])}
        className="text-muted w-full text-sm"
      />

      {error && <p className="text-bad text-sm">{error}</p>}

      {plan && (
        <div className="bg-surface border-line space-y-3 rounded-xl border p-3 text-sm">
          <p>
            {plan.itemsTotal} items ({plan.itemsNew} new, {plan.itemsColliding} already here),{' '}
            {plan.outfitsTotal} outfits ({plan.outfitsNew} new, {plan.outfitsColliding} already
            here), {plan.pairsTotal} pair verdicts
            {plan.photos.size > 0 && `, ${plan.photos.size} photos`}.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={() => void run('merge')} disabled={busy}>
              Merge
            </Button>
            <Button variant="danger" onClick={() => void run('replace')} disabled={busy}>
              Replace
            </Button>
          </div>
          <p className="text-muted text-xs">
            Merge adds only the records this device does not have. Replace wipes first.
          </p>
        </div>
      )}
    </div>
  )
}
