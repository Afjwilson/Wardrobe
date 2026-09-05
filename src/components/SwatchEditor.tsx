import { hexFromOklch, oklchOf, onColour } from '../lib/colour'
import type { ColourSwatch } from '../types'

/** Small hue/lightness nudge for a swatch the camera got slightly wrong. */
export function SwatchEditor({
  swatch,
  onChange,
  onRemove,
  onPromote,
}: {
  swatch: ColourSwatch
  onChange: (hex: string) => void
  onRemove: () => void
  onPromote: () => void
}) {
  const { l, c, h } = oklchOf(swatch.hex)

  return (
    <div className="bg-surface border-line space-y-3 rounded-xl border p-3">
      <div className="flex items-center gap-3">
        <span
          className="border-line grid h-10 w-10 place-items-center rounded-lg border text-[10px]"
          style={{ background: swatch.hex, color: onColour(swatch.hex) }}
        >
          {swatch.role === 'dominant' ? '★' : ''}
        </span>
        <div className="flex-1">
          <p className="text-sm capitalize">{swatch.role}</p>
          <p className="text-muted font-mono text-xs">{swatch.hex}</p>
        </div>
        {swatch.role !== 'dominant' && (
          <button type="button" onClick={onPromote} className="text-muted min-h-10 px-2 text-xs">
            make dominant
          </button>
        )}
        <button type="button" onClick={onRemove} className="text-bad min-h-10 px-2 text-xs">
          remove
        </button>
      </div>

      <label className="block">
        <span className="text-muted text-[10px] tracking-wide uppercase">hue</span>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={Math.round(h)}
          onChange={(e) => onChange(hexFromOklch(l, c, Number(e.target.value)))}
          className="accent-accent w-full"
        />
      </label>
      <label className="block">
        <span className="text-muted text-[10px] tracking-wide uppercase">lightness</span>
        <input
          type="range"
          min={2}
          max={98}
          step={1}
          value={Math.round(l * 100)}
          onChange={(e) => onChange(hexFromOklch(Number(e.target.value) / 100, c, h))}
          className="accent-accent w-full"
        />
      </label>
    </div>
  )
}
