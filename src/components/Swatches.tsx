import type { ColourSwatch } from '../types'

export function SwatchDots({
  colours,
  size = 'sm',
}: {
  colours: ColourSwatch[]
  size?: 'sm' | 'lg'
}) {
  const dot = size === 'lg' ? 'h-6 w-6' : 'h-3 w-3'
  return (
    <div className="flex gap-1">
      {colours.map((c) => (
        <span
          key={`${c.hex}-${c.role}`}
          className={`${dot} border-line rounded-full border`}
          style={{ background: c.hex }}
          title={`${c.hex} (${c.role})`}
        />
      ))}
    </div>
  )
}

export function SwatchBar({ colours }: { colours: ColourSwatch[] }) {
  const total = colours.reduce((sum, c) => sum + c.proportion, 0) || 1
  return (
    <div className="border-line flex h-2 overflow-hidden rounded-full border">
      {colours.map((c) => (
        <span
          key={`${c.hex}-${c.role}`}
          style={{ background: c.hex, width: `${(c.proportion / total) * 100}%` }}
        />
      ))}
    </div>
  )
}
