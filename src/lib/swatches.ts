import type { ColourSwatch } from '../types'

const ROLES = ['dominant', 'secondary', 'accent'] as const

export const MAX_SWATCHES = 3

/**
 * Roles follow order: first swatch is the dominant one. Proportions are kept if
 * they came from extraction and evened out if the user sampled by hand.
 */
export function normalise(swatches: ColourSwatch[]): ColourSwatch[] {
  const kept = swatches.slice(0, MAX_SWATCHES)
  const total = kept.reduce((sum, s) => sum + (s.proportion || 0), 0)
  return kept.map((s, index) => ({
    hex: s.hex,
    role: ROLES[index] ?? 'accent',
    proportion: total > 0 ? s.proportion / total : 1 / kept.length,
  }))
}

export function addSwatch(swatches: ColourSwatch[], hex: string): ColourSwatch[] {
  if (swatches.some((s) => s.hex === hex)) return swatches
  const next = [...swatches, { hex, proportion: 1 / (swatches.length + 1), role: 'accent' as const }]
  return normalise(next)
}

export function removeSwatch(swatches: ColourSwatch[], index: number): ColourSwatch[] {
  return normalise(swatches.filter((_, i) => i !== index))
}

export function promoteSwatch(swatches: ColourSwatch[], index: number): ColourSwatch[] {
  const picked = swatches[index]
  if (!picked) return swatches
  return normalise([picked, ...swatches.filter((_, i) => i !== index)])
}

export function replaceSwatch(
  swatches: ColourSwatch[],
  index: number,
  hex: string,
): ColourSwatch[] {
  return normalise(swatches.map((s, i) => (i === index ? { ...s, hex } : s)))
}
