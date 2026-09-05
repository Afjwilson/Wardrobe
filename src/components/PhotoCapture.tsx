import { useRef, useState } from 'react'
import { processPhoto, type ProcessedPhoto } from '../lib/image'

export function PhotoCapture({ onPhoto }: { onPhoto: (photo: ProcessedPhoto) => void }) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function handle(file: File | undefined) {
    if (!file) return
    setBusy(true)
    setError(undefined)
    try {
      onPhoto(await processPhoto(file))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not read that photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4 px-4 py-6">
      <p className="text-muted bg-surface border-line rounded-xl border p-3 text-sm">
        Shoot flat on a plain surface in daylight, in the same spot each time, so colours stay
        comparable.
      </p>

      <button
        type="button"
        disabled={busy}
        onClick={() => cameraRef.current?.click()}
        className="bg-accent text-ink min-h-16 w-full rounded-xl font-semibold disabled:opacity-40"
      >
        {busy ? 'Processing…' : 'Take photo'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => libraryRef.current?.click()}
        className="bg-surface-2 border-line min-h-16 w-full rounded-xl border disabled:opacity-40"
      >
        Choose from library
      </button>

      {error && <p className="text-bad text-sm">{error}</p>}

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => void handle(e.target.files?.[0])}
      />
      <input
        ref={libraryRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => void handle(e.target.files?.[0])}
      />
    </div>
  )
}
