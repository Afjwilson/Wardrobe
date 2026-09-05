import { classify, dominant, family, hueDiff, oklchOf } from '../lib/colour'
import { colourName } from '../lib/colourName'
import type { Item } from '../types'
import { familyKey, key } from './learning'
import type { Contribution, Learning, PairScore } from './types'

const BASE = 40

const FORMALITY_WORDS: Record<number, string> = {
  1: 'gym-level',
  2: 'casual',
  3: 'smart-casual',
  4: 'smart',
  5: 'formal',
}

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value))
}

function dominantHex(item: Item): string | undefined {
  return dominant(item.colours)?.hex
}

export function colourHarmony(a: Item, b: Item): Contribution {
  const hexA = dominantHex(a)
  const hexB = dominantHex(b)
  const make = (points: number, label: string): Contribution => ({
    term: 'colourHarmony',
    points: clamp(points, -25, 25),
    label,
  })
  if (!hexA || !hexB) return make(0, 'no colour recorded')

  const classA = classify(hexA)
  const classB = classify(hexB)
  const neutralA = classA === 'neutral'
  const neutralB = classB === 'neutral'
  if (neutralA && neutralB) return make(12, 'all-neutral, low risk')
  if (neutralA || neutralB) return make(18, 'neutral anchor')

  const lchA = oklchOf(hexA)
  const lchB = oklchOf(hexB)
  const diff = hueDiff(lchA.h, lchB.h)

  if (diff < 25) {
    return Math.abs(lchA.l - lchB.l) > 0.25
      ? make(14, 'tonal — same hue, different depth')
      : make(15, 'analogous')
  }
  if (diff >= 150) {
    return classA === 'muted' || classB === 'muted'
      ? make(20, 'complementary, one muted')
      : make(-5, 'complementary but loud')
  }
  if (diff < 70) return make(-20, 'clash zone')
  if (diff >= 100 && diff <= 140) return make(5, 'triadic-ish, needs a neutral third')
  return make(0, 'no strong colour relationship')
}

export function valueContrast(a: Item, b: Item): Contribution {
  const hexA = dominantHex(a)
  const hexB = dominantHex(b)
  const make = (points: number, label: string): Contribution => ({
    term: 'valueContrast',
    points: clamp(points, -10, 15),
    label,
  })
  if (!hexA || !hexB) return make(0, 'no colour recorded')

  const lchA = oklchOf(hexA)
  const lchB = oklchOf(hexB)
  const delta = Math.abs(lchA.l - lchB.l)

  if (delta >= 0.18 && delta <= 0.55) return make(15, 'clear light/dark contrast')
  if (delta < 0.08) {
    return hueDiff(lchA.h, lchB.h) < 25
      ? make(0, 'deliberate tonal look')
      : make(-10, 'reads flat')
  }
  return make(0, delta > 0.55 ? 'very high contrast' : 'mild contrast')
}

export function formalityFit(a: Item, b: Item): Contribution {
  const gap = Math.abs(a.formality - b.formality)
  const make = (points: number, label: string): Contribution => ({
    term: 'formalityFit',
    points,
    label,
  })
  if (gap === 0) return make(10, `both ${FORMALITY_WORDS[a.formality]}`)
  if (gap === 1) return make(4, 'close in formality')
  if (gap === 2) return make(-8, 'formality mismatch')
  return make(-30, 'very different formality')
}

export function patternFit(a: Item, b: Item): Contribution {
  const make = (points: number, label: string): Contribution => ({
    term: 'patternFit',
    points,
    label,
  })
  const solidA = a.pattern === 'solid'
  const solidB = b.pattern === 'solid'
  if (solidA && solidB) return make(0, 'both solid')
  if (!solidA && !solidB) {
    return a.pattern === 'texture' || b.pattern === 'texture'
      ? make(0, 'pattern against texture')
      : make(-15, 'two patterns fight')
  }
  return make(5, 'solid grounds the pattern')
}

export function seasonFit(a: Item, b: Item): Contribution {
  const make = (points: number, label: string): Contribution => ({
    term: 'seasonFit',
    points,
    label,
  })
  if (a.seasons.length === 0 || b.seasons.length === 0) return make(0, 'any season')
  const shared = a.seasons.filter((season) => b.seasons.includes(season))
  return shared.length > 0
    ? make(5, `both ${shared[0]}`)
    : make(-10, 'different seasons')
}

/** The term the spec weights above all the colour theory. */
export function learned(a: Item, b: Item, learning: Learning): Contribution {
  const make = (points: number, label: string): Contribution => ({
    term: 'learned',
    points: clamp(points, -40, 40),
    label,
  })

  const pairKey = key(a.id, b.id)
  const verdict = learning.explicit.get(pairKey)
  if (verdict) {
    return verdict === 'good'
      ? make(40, 'you marked this pair good')
      : make(-40, 'you marked this pair bad')
  }

  const works = learning.works.get(pairKey) ?? 0
  const rejected = learning.rejected.get(pairKey) ?? 0
  let points = 0
  const labels: string[] = []

  if (works >= 2) {
    points += 25
    labels.push(`worn together in ${works} outfits that worked`)
  }
  if (rejected > 0) {
    points -= 25
    labels.push('in an outfit you rejected')
  }
  if (works === 0 && rejected === 0) {
    const hexA = dominantHex(a)
    const hexB = dominantHex(b)
    if (
      hexA &&
      hexB &&
      learning.familyPrecedent.has(familyKey(family(hexA), family(hexB)))
    ) {
      points += 10
      labels.push('colours you often pair')
    }
  }

  return make(points, labels.join(', ') || 'nothing learned yet')
}

function explain(a: Item, b: Item, contributions: Contribution[]): string {
  const hexA = dominantHex(a)
  const hexB = dominantHex(b)
  const names = hexA && hexB ? `${colourName(hexA)} + ${colourName(hexB)}` : 'this pair'
  const top = contributions
    .filter((c) => c.points !== 0)
    .sort((x, y) => Math.abs(y.points) - Math.abs(x.points))
    .slice(0, 2)
    .map((c) => c.label)
  return top.length > 0 ? `${names} — ${top.join('; ')}` : `${names} — nothing strong either way`
}

export function scorePair(a: Item, b: Item, learning: Learning): PairScore {
  const contributions = [
    colourHarmony(a, b),
    valueContrast(a, b),
    formalityFit(a, b),
    patternFit(a, b),
    seasonFit(a, b),
    learned(a, b, learning),
  ]
  const raw = contributions.reduce((sum, c) => sum + c.points, BASE)
  return {
    score: Math.round(clamp(raw, 0, 100)),
    contributions,
    reason: explain(a, b, contributions),
  }
}
