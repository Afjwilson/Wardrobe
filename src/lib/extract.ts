import type { ColourSwatch } from '../types'
import { deltaE, hexFromRgb255, oklabDistance, type Oklab } from './colour'
import type { PixelGrid } from './image'
import { normalise } from './swatches'
import { converter } from 'culori'

const toOklab = converter('oklab')

const BACKGROUND_CUT = 0.12 // Euclidean distance in OKLab from the corner average
const BLOWOUT_L = 0.95
const CRUSH_L = 0.06
const K = 4
const MERGE_DELTA_E = 8 // CIELAB ΔE76
const MIN_CLUSTER_SHARE = 0.08
const ITERATIONS = 12

type Sample = { lab: Oklab; rgb: [number, number, number] }

function labOf(r: number, g: number, b: number): Oklab {
  const c = toOklab({ mode: 'rgb', r: r / 255, g: g / 255, b: b / 255 })
  return { l: c?.l ?? 0, a: c?.a ?? 0, b: c?.b ?? 0 }
}

function readSamples({ data }: PixelGrid): Sample[] {
  const samples: Sample[] = []
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const rgb: [number, number, number] = [data[i], data[i + 1], data[i + 2]]
    samples.push({ rgb, lab: labOf(rgb[0], rgb[1], rgb[2]) })
  }
  return samples
}

function cornerAverage({ data, width, height }: PixelGrid): Oklab {
  const corners = [
    0,
    (width - 1) * 4,
    (height - 1) * width * 4,
    ((height - 1) * width + width - 1) * 4,
  ]
  const labs = corners.map((o) => labOf(data[o], data[o + 1], data[o + 2]))
  return {
    l: labs.reduce((s, c) => s + c.l, 0) / labs.length,
    a: labs.reduce((s, c) => s + c.a, 0) / labs.length,
    b: labs.reduce((s, c) => s + c.b, 0) / labs.length,
  }
}

/** Deterministic seeding keeps extraction reproducible for the same photo. */
function seedCentroids(samples: Sample[]): Oklab[] {
  const sorted = [...samples].sort((x, y) => x.lab.l - y.lab.l)
  return Array.from({ length: K }, (_, i) => {
    const index = Math.floor(((i + 0.5) / K) * (sorted.length - 1))
    return sorted[index].lab
  })
}

type Cluster = { lab: Oklab; rgb: [number, number, number]; count: number }

function kmeans(samples: Sample[]): Cluster[] {
  let centroids = seedCentroids(samples)
  let assignment = new Array<number>(samples.length).fill(0)

  for (let iteration = 0; iteration < ITERATIONS; iteration++) {
    let moved = false
    assignment = samples.map((sample, index) => {
      let best = 0
      let bestDistance = Infinity
      for (let c = 0; c < centroids.length; c++) {
        const d = oklabDistance(sample.lab, centroids[c])
        if (d < bestDistance) {
          bestDistance = d
          best = c
        }
      }
      if (best !== assignment[index]) moved = true
      return best
    })

    const sums = centroids.map(() => ({ l: 0, a: 0, b: 0, n: 0 }))
    samples.forEach((sample, index) => {
      const acc = sums[assignment[index]]
      acc.l += sample.lab.l
      acc.a += sample.lab.a
      acc.b += sample.lab.b
      acc.n++
    })
    centroids = centroids.map((current, c) => {
      const acc = sums[c]
      return acc.n === 0
        ? current
        : { l: acc.l / acc.n, a: acc.a / acc.n, b: acc.b / acc.n }
    })
    if (!moved && iteration > 0) break
  }

  // Average the source RGB per cluster: converting a centroid back out of OKLab
  // can land outside sRGB, and the real pixels never do.
  const rgbSums = centroids.map(() => [0, 0, 0, 0])
  samples.forEach((sample, index) => {
    const acc = rgbSums[assignment[index]]
    acc[0] += sample.rgb[0]
    acc[1] += sample.rgb[1]
    acc[2] += sample.rgb[2]
    acc[3]++
  })

  return centroids
    .map((lab, c) => {
      const [r, g, b, n] = rgbSums[c]
      return {
        lab,
        rgb: [r / n, g / n, b / n] as [number, number, number],
        count: n,
      }
    })
    .filter((cluster) => cluster.count > 0)
}

function mergeClose(clusters: Cluster[]): Cluster[] {
  const merged: Cluster[] = []
  for (const cluster of [...clusters].sort((x, y) => y.count - x.count)) {
    const near = merged.find(
      (other) =>
        deltaE(
          hexFromRgb255(...other.rgb),
          hexFromRgb255(...cluster.rgb),
        ) < MERGE_DELTA_E,
    )
    if (!near) {
      merged.push({ ...cluster })
      continue
    }
    const total = near.count + cluster.count
    near.rgb = [0, 1, 2].map(
      (i) => (near.rgb[i] * near.count + cluster.rgb[i] * cluster.count) / total,
    ) as [number, number, number]
    near.count = total
  }
  return merged
}

/**
 * §4: drop the background and the blown-out/crushed extremes, cluster what is
 * left in OKLab, and offer the top three as suggestions. Everything here is a
 * suggestion — the user confirms in the picker.
 */
export function extractSwatches(grid: PixelGrid): ColourSwatch[] {
  const all = readSamples(grid)
  if (all.length === 0) return []

  const corner = cornerAverage(grid)
  const inRange = all.filter(
    (s) => s.lab.l <= BLOWOUT_L && s.lab.l >= CRUSH_L,
  )
  const foreground = inRange.filter(
    (s) => oklabDistance(s.lab, corner) > BACKGROUND_CUT,
  )

  // A flat-lay of a garment that fills the frame can look entirely like its own
  // background; fall back rather than returning nothing.
  const samples =
    foreground.length >= Math.max(20, all.length * 0.05) ? foreground : inRange
  if (samples.length === 0) return []

  const clusters = mergeClose(kmeans(samples)).filter(
    (cluster) => cluster.count >= samples.length * MIN_CLUSTER_SHARE,
  )
  if (clusters.length === 0) return []

  const top = clusters.sort((x, y) => y.count - x.count).slice(0, 3)
  const total = top.reduce((sum, cluster) => sum + cluster.count, 0)

  return normalise(
    top.map((cluster) => ({
      hex: hexFromRgb255(...cluster.rgb),
      proportion: cluster.count / total,
      role: 'accent' as const,
    })),
  )
}
