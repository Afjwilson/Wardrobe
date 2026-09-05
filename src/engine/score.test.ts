import { describe, expect, it } from 'vitest'
import type { Outfit, PairVerdict } from '../types'
import { item, WARDROBE as W } from './fixtures'
import { buildLearning, EMPTY_LEARNING } from './learning'
import { scoreOutfit } from './outfit'
import { scorePair } from './score'
import type { Item } from '../types'

type Label = 'good' | 'ok' | 'bad'

/** Twenty hand-labelled pairs. `good` should rank well, `bad` should not. */
const PAIRS: [string, Item, Item, Label][] = [
  ['navy shirt + stone chinos', W.navyOxford, W.stoneChinos, 'good'],
  ['navy shirt + brown boots', W.navyOxford, W.brownBoots, 'good'],
  ['rust overshirt + stone chinos', W.rustOvershirt, W.stoneChinos, 'good'],
  ['olive jacket + stone chinos', W.oliveJacket, W.stoneChinos, 'good'],
  ['teal knit + rust overshirt', W.tealKnit, W.rustOvershirt, 'good'],
  ['grey sweatshirt + black jeans', W.greySweatshirt, W.blackJeans, 'good'],
  ['camel coat + navy shirt', W.camelCoat, W.navyOxford, 'good'],
  ['white tee + black jeans', W.whiteTee, W.blackJeans, 'good'],
  ['mustard scarf + navy shirt', W.mustardScarf, W.navyOxford, 'good'],
  ['blue stripe shirt + charcoal trousers', W.blueStripeShirt, W.charcoalTrousers, 'good'],
  ['pink oxford + navy shirt', W.pinkOxford, W.navyOxford, 'good'],
  ['floral shirt + stone chinos', W.floralShirt, W.stoneChinos, 'good'],
  ['white trainers + white tee', W.whiteTrainers, W.whiteTee, 'ok'],
  ['rust overshirt + mustard scarf', W.rustOvershirt, W.mustardScarf, 'ok'],
  ['charcoal trousers + white trainers', W.charcoalTrousers, W.whiteTrainers, 'bad'],
  ['red shorts + navy shirt', W.redShorts, W.navyOxford, 'bad'],
  ['red shorts + brown boots', W.redShorts, W.brownBoots, 'bad'],
  ['blue stripe shirt + check flannel', W.blueStripeShirt, W.checkFlannel, 'bad'],
  ['floral shirt + check flannel', W.floralShirt, W.checkFlannel, 'bad'],
  ['charcoal trousers + white tee', W.charcoalTrousers, W.whiteTee, 'bad'],
]

/*
 * The bands are deliberately loose and overlapping. The spec's weights leave a
 * pair with wrong formality but pleasant colour in the mid-40s, and an
 * all-neutral pair with very high value contrast in the mid-50s, so exact
 * thresholds would encode arithmetic rather than judgement. The assertion that
 * carries the weight is the ordering test below: no bad pair may outrank a
 * good one.
 */
const BANDS: Record<Label, [number, number]> = {
  good: [55, 100],
  ok: [36, 74],
  bad: [0, 48],
}

describe('scorePair against hand-labelled pairs', () => {
  for (const [name, a, b, label] of PAIRS) {
    it(`${label}: ${name}`, () => {
      const { score, reason } = scorePair(a, b, EMPTY_LEARNING)
      const [low, high] = BANDS[label]
      expect(
        score,
        `${name} scored ${score} (${reason})`,
      ).toBeGreaterThanOrEqual(low)
      expect(score, `${name} scored ${score} (${reason})`).toBeLessThanOrEqual(high)
    })
  }

  it('ranks every good pair above every bad pair', () => {
    const scoreOf = (label: Label) =>
      PAIRS.filter(([, , , l]) => l === label).map(([, a, b]) => scorePair(a, b, EMPTY_LEARNING).score)
    expect(Math.min(...scoreOf('good'))).toBeGreaterThan(Math.max(...scoreOf('bad')))
  })
})

describe('explanations', () => {
  it('names both colours and the two strongest reasons', () => {
    const { reason } = scorePair(W.navyOxford, W.stoneChinos, EMPTY_LEARNING)
    expect(reason).toMatch(/^navy \+ stone — /)
    expect(reason.split(';')).toHaveLength(2)
  })

  it('leads with the learned verdict once one exists', () => {
    const pairs: PairVerdict[] = [
      { a: W.redShorts.id, b: W.navyOxford.id, verdict: 'good', source: 'explicit' },
    ]
    const learning = buildLearning([W.redShorts, W.navyOxford], [], pairs)
    const { score, reason } = scorePair(W.redShorts, W.navyOxford, learning)
    expect(reason).toContain('you marked this pair good')
    expect(score).toBeGreaterThan(scorePair(W.redShorts, W.navyOxford, EMPTY_LEARNING).score)
  })
})

function outfit(id: string, itemIds: string[], verdict: 'works' | 'no'): Outfit {
  return { id, itemIds, verdict, occasions: [], wornDates: [], createdAt: 0 }
}

describe('learned term', () => {
  it('rewards a pair worn in two outfits that worked', () => {
    const items = [W.floralShirt, W.checkFlannel]
    const ids = items.map((i) => i.id)
    const learning = buildLearning(items, [outfit('o1', ids, 'works'), outfit('o2', ids, 'works')], [])
    const before = scorePair(W.floralShirt, W.checkFlannel, EMPTY_LEARNING).score
    const after = scorePair(W.floralShirt, W.checkFlannel, learning).score
    expect(after - before).toBe(25)
  })

  it('penalises a pair that appeared in a rejected outfit', () => {
    const items = [W.navyOxford, W.stoneChinos]
    const learning = buildLearning(items, [outfit('o1', items.map((i) => i.id), 'no')], [])
    const before = scorePair(W.navyOxford, W.stoneChinos, EMPTY_LEARNING).score
    expect(scorePair(W.navyOxford, W.stoneChinos, learning).score).toBe(before - 25)
  })

  it('gives unseen pairs credit for a colour family the user keeps pairing', () => {
    // Three works outfits pairing an orange with a green, then a different
    // orange and green the user has never worn together.
    const wornOrange = item('worn_orange', 'top', '#9b4a28', 3)
    const wornGreen = item('worn_green', 'bottom', '#4a8a52', 3)
    const otherOrange = item('other_orange', 'top', '#a55230', 3)
    const otherGreen = item('other_green', 'bottom', '#3f7d48', 3)
    const worn = [wornOrange.id, wornGreen.id]
    const learning = buildLearning(
      [wornOrange, wornGreen, otherOrange, otherGreen],
      [outfit('o1', worn, 'works'), outfit('o2', worn, 'works'), outfit('o3', worn, 'works')],
      [],
    )

    const unseen = scorePair(otherOrange, otherGreen, learning).score
    const baseline = scorePair(otherOrange, otherGreen, EMPTY_LEARNING).score
    expect(unseen - baseline).toBe(10)
  })

  it('reports cold start below the spec thresholds', () => {
    expect(buildLearning([W.navyOxford], [], []).coldStart).toBe(true)
  })
})

describe('scoreOutfit', () => {
  it('penalises each weak pair on top of the mean', () => {
    const good = scoreOutfit([W.navyOxford, W.stoneChinos, W.brownBoots], EMPTY_LEARNING)
    expect(good.weakPairs).toBe(0)

    // Charcoal suit trousers with white trainers is the weak pair here.
    const spoiled = scoreOutfit(
      [W.navyOxford, W.charcoalTrousers, W.whiteTrainers],
      EMPTY_LEARNING,
    )
    expect(spoiled.weakPairs).toBeGreaterThan(0)
    expect(spoiled.score).toBeLessThan(good.score)
  })

  it('scores nothing for fewer than two items', () => {
    expect(scoreOutfit([W.navyOxford], EMPTY_LEARNING).score).toBe(0)
  })
})
