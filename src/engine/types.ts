import type { Item } from '../types'

export type Contribution = {
  term: 'colourHarmony' | 'valueContrast' | 'formalityFit' | 'patternFit' | 'seasonFit' | 'learned'
  points: number
  label: string
}

export type PairScore = {
  score: number
  contributions: Contribution[]
  /** Short "why", built from the two strongest contributions. */
  reason: string
}

export type OutfitScore = {
  score: number
  pairScores: { a: string; b: string; score: number; reason: string }[]
  weakPairs: number
}

/**
 * Everything the learned term needs, precomputed from stored data. Built by
 * `buildLearning` so the scorer itself stays a pure function of its inputs.
 */
export type Learning = {
  /** pair key → explicit verdict the user set by hand. */
  explicit: Map<string, 'good' | 'bad'>
  /** pair key → number of outfits marked `works` containing that pair. */
  works: Map<string, number>
  /** pair key → number of outfits marked `no` containing that pair. */
  rejected: Map<string, number>
  /** Colour-family pairings with at least three `works` outfits behind them. */
  familyPrecedent: Set<string>
  /** Below the spec's cold-start thresholds (§9): under ~20 items, ~10 rated outfits. */
  coldStart: boolean
  itemCount: number
  ratedOutfitCount: number
}

export type ScoreInput = { a: Item; b: Item; learning: Learning }
