import { describe, expect, it } from 'vitest'
import { WARDROBE as W } from './fixtures'
import { EMPTY_LEARNING } from './learning'
import { scoreOutfit } from './outfit'
import { suggestOutfits } from './suggest'

const WARDROBE = Object.values(W)

describe('suggestOutfits', () => {
  it('builds complete outfits around the seed', () => {
    const suggestions = suggestOutfits(W.navyOxford, WARDROBE, EMPTY_LEARNING)

    expect(suggestions.length).toBeGreaterThan(0)
    for (const suggestion of suggestions) {
      const categories = suggestion.items.map((item) => item.category)
      expect(suggestion.items).toContain(W.navyOxford)
      expect(categories).toContain('bottom')
      expect(categories).toContain('shoes')
    }
  })

  it('returns distinct outfits, ranked best first', () => {
    const suggestions = suggestOutfits(W.navyOxford, WARDROBE, EMPTY_LEARNING)
    const signatures = suggestions.map((s) => s.items.map((i) => i.id).sort().join('|'))

    expect(new Set(signatures).size).toBe(signatures.length)
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].score).toBeGreaterThanOrEqual(suggestions[i].score)
    }
  })

  it('never returns an outfit the swap pass could have improved by one swap', () => {
    const [best] = suggestOutfits(W.navyOxford, WARDROBE, EMPTY_LEARNING)
    const pools = WARDROBE.filter((item) => !best.items.includes(item))

    for (const [index, occupant] of best.items.entries()) {
      if (occupant.id === W.navyOxford.id) continue
      for (const alternative of pools.filter((i) => i.category === occupant.category)) {
        const swapped = best.items.map((item, i) => (i === index ? alternative : item))
        expect(scoreOutfit(swapped, EMPTY_LEARNING).score).toBeLessThanOrEqual(best.score)
      }
    }
  })

  it('pairs a one-piece with shoes rather than a top and bottom', () => {
    const dress = { ...W.tealKnit, id: 'dress', category: 'full' as const }
    const suggestions = suggestOutfits(dress, [...WARDROBE, dress], EMPTY_LEARNING)

    expect(suggestions.length).toBeGreaterThan(0)
    for (const suggestion of suggestions) {
      const categories = suggestion.items.map((item) => item.category)
      expect(categories).toContain('shoes')
      expect(categories).not.toContain('top')
      expect(categories).not.toContain('bottom')
    }
  })

  it('returns nothing when there is nothing to build with', () => {
    expect(suggestOutfits(W.navyOxford, [W.navyOxford], EMPTY_LEARNING)).toEqual([])
  })

  it('carries a reason for every suggestion', () => {
    for (const suggestion of suggestOutfits(W.navyOxford, WARDROBE, EMPTY_LEARNING)) {
      expect(suggestion.reason).toMatch(/ — /)
    }
  })
})
