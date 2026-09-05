import { describe, expect, it } from 'vitest'
import { deltaE } from './colour'
import { extractSwatches } from './extract'
import type { PixelGrid } from './image'

type Rgb = [number, number, number]

/** A garment rectangle on a plain background, the layout the spec assumes. */
function flatLay(
  body: Rgb,
  background: Rgb,
  accent?: Rgb,
  size = 60,
): PixelGrid {
  const data = new Uint8ClampedArray(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const inBody = x > size * 0.2 && x < size * 0.8 && y > size * 0.15 && y < size * 0.85
      const inAccent = accent && inBody && y > size * 0.6 && y < size * 0.72
      const [r, g, b] = inAccent ? accent : inBody ? body : background
      const i = (y * size + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  return { data, width: size, height: size }
}

const hex = (r: number, g: number, b: number) =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`

describe('extractSwatches', () => {
  it('finds the garment colour and drops the background', () => {
    const swatches = extractSwatches(flatLay([0x9b, 0x4a, 0x28], [0xe8, 0xe6, 0xe0]))

    expect(swatches.length).toBeGreaterThan(0)
    expect(swatches[0].role).toBe('dominant')
    expect(deltaE(swatches[0].hex, hex(0x9b, 0x4a, 0x28))).toBeLessThan(8)
    for (const swatch of swatches) {
      expect(deltaE(swatch.hex, hex(0xe8, 0xe6, 0xe0))).toBeGreaterThan(8)
    }
  })

  it('reports a secondary colour when the garment has one', () => {
    const swatches = extractSwatches(
      flatLay([0x2c, 0x36, 0x5a], [0xe8, 0xe6, 0xe0], [0xc8, 0xa2, 0x6a]),
    )

    expect(swatches.length).toBe(2)
    expect(deltaE(swatches[0].hex, hex(0x2c, 0x36, 0x5a))).toBeLessThan(8)
    expect(deltaE(swatches[1].hex, hex(0xc8, 0xa2, 0x6a))).toBeLessThan(8)
    expect(swatches[0].proportion).toBeGreaterThan(swatches[1].proportion)
  })

  it('merges near-identical clusters rather than reporting them twice', () => {
    // Two greys three ΔE apart: one swatch, not two.
    const swatches = extractSwatches(
      flatLay([0x6a, 0x6a, 0x6e], [0xe8, 0xe6, 0xe0], [0x6d, 0x6d, 0x71]),
    )

    expect(swatches.length).toBe(1)
    expect(swatches[0].proportion).toBeCloseTo(1)
  })

  it('still suggests something when the garment fills the frame', () => {
    const size = 40
    const data = new Uint8ClampedArray(size * size * 4)
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0x3f
      data[i + 1] = 0x5d
      data[i + 2] = 0x3a
      data[i + 3] = 255
    }
    const swatches = extractSwatches({ data, width: size, height: size })

    expect(swatches.length).toBe(1)
    expect(deltaE(swatches[0].hex, hex(0x3f, 0x5d, 0x3a))).toBeLessThan(5)
  })

  it('returns nothing for an empty grid', () => {
    expect(extractSwatches({ data: new Uint8ClampedArray(0), width: 0, height: 0 })).toEqual([])
  })
})
