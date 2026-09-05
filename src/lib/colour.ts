import { converter, formatHex, type Oklch } from 'culori'

const toOklch = converter('oklch')
const toOklab = converter('oklab')
const toLab = converter('lab')
const toRgb = converter('rgb')

export type Oklab = { l: number; a: number; b: number }
export type Lch = { l: number; c: number; h: number }

export type ColourClass = 'neutral' | 'muted' | 'saturated'

export function oklchOf(hex: string): Lch {
  const c = toOklch(hex) as Oklch | undefined
  if (!c) return { l: 0, c: 0, h: 0 }
  return { l: c.l, c: c.c, h: c.h ?? 0 }
}

export function oklabOf(hex: string): Oklab {
  const c = toOklab(hex)
  if (!c) return { l: 0, a: 0, b: 0 }
  return { l: c.l, a: c.a, b: c.b }
}

export function rgb255(hex: string): [number, number, number] {
  const c = toRgb(hex)
  if (!c) return [0, 0, 0]
  return [
    Math.round(c.r * 255),
    Math.round(c.g * 255),
    Math.round(c.b * 255),
  ]
}

export function hexFromOklch(l: number, c: number, h: number): string {
  return formatHex({ mode: 'oklch', l, c, h }) ?? '#000000'
}

export function hexFromRgb255(r: number, g: number, b: number): string {
  return formatHex({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 }) ?? '#000000'
}

/** Euclidean distance in OKLab; the units the spec's 12% background cut uses. */
export function oklabDistance(x: Oklab, y: Oklab): number {
  return Math.hypot(x.l - y.l, x.a - y.a, x.b - y.b)
}

/**
 * CIELAB ΔE76. The spec's cluster-merge threshold of 8 is on the CIELAB scale
 * (0–100), not the OKLab one, which is why both spaces are in play.
 */
export function deltaE(hexA: string, hexB: string): number {
  const a = toLab(hexA)
  const b = toLab(hexB)
  if (!a || !b) return Infinity
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b)
}

/** Smallest angle between two hues, 0–180. */
export function hueDiff(h1: number, h2: number): number {
  const d = Math.abs(((h1 - h2) % 360) + 360) % 360
  return d > 180 ? 360 - d : d
}

function isNavyish({ l, c, h }: Lch): boolean {
  const navy = h >= 250 && h <= 280 && l < 0.35 && c < 0.12
  // Denim: the same blue corner, lighter and washed out.
  const denim = h >= 230 && h <= 290 && l < 0.6 && c < 0.075
  return navy || denim
}

export function classify(hex: string): ColourClass {
  const lch = oklchOf(hex)
  if (lch.c < 0.04 || lch.l > 0.92 || lch.l < 0.12) return 'neutral'
  if (isNavyish(lch)) return 'neutral'
  if (lch.c < 0.1) return 'muted'
  return 'saturated'
}

export type ColourFamily =
  | 'neutral'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'blue'
  | 'purple'
  | 'pink'

export const COLOUR_FAMILIES: ColourFamily[] = [
  'neutral',
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
]

/** Coarse hue bucket used for filtering and for the colour-family precedent term. */
export function family(hex: string): ColourFamily {
  if (classify(hex) === 'neutral') return 'neutral'
  const { h } = oklchOf(hex)
  if (h < 20 || h >= 350) return 'red'
  if (h < 65) return 'orange'
  if (h < 105) return 'yellow'
  if (h < 165) return 'green'
  if (h < 215) return 'teal'
  if (h < 285) return 'blue'
  if (h < 325) return 'purple'
  return 'pink'
}

/** Readable text colour for a swatch chip. */
export function onColour(hex: string): string {
  return oklchOf(hex).l > 0.62 ? '#0b0b0e' : '#f5f5f7'
}

export function dominant<T extends { hex: string; role: string }>(
  swatches: T[],
): T | undefined {
  return swatches.find((s) => s.role === 'dominant') ?? swatches[0]
}
