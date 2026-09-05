import { deltaE } from './colour'

/**
 * A small wardrobe vocabulary. Explanations read "navy + rust", not
 * "#1b2a4a + #9b4a28", and clothing colours have names people actually use.
 * Nearest match by CIELAB ΔE.
 */
const NAMED: [string, string][] = [
  ['black', '#12121a'],
  ['charcoal', '#3a3a42'],
  ['grey', '#8b8b93'],
  ['light grey', '#c4c4cb'],
  ['white', '#f4f3ef'],
  ['cream', '#e9e0cc'],
  ['stone', '#c9c0ae'],
  ['tan', '#c8a26a'],
  ['camel', '#b08d57'],
  ['brown', '#6b4a32'],
  ['rust', '#9b4a28'],
  ['orange', '#d4712a'],
  ['mustard', '#c9a227'],
  ['yellow', '#e3c34a'],
  ['olive', '#6b6b3a'],
  ['forest', '#2f4f34'],
  ['green', '#4a8a52'],
  ['sage', '#9aae94'],
  ['teal', '#2f6f6f'],
  ['navy', '#1b2a4a'],
  ['denim', '#4a6b8a'],
  ['blue', '#3a63b8'],
  ['sky', '#8fb4d9'],
  ['purple', '#6b4a8a'],
  ['lilac', '#b4a3cc'],
  ['burgundy', '#5e2330'],
  ['red', '#b3372f'],
  ['pink', '#d99aa4'],
]

export function colourName(hex: string): string {
  let best = NAMED[0]
  let bestDistance = Infinity
  for (const entry of NAMED) {
    const distance = deltaE(hex, entry[1])
    if (distance < bestDistance) {
      bestDistance = distance
      best = entry
    }
  }
  return best[0]
}
