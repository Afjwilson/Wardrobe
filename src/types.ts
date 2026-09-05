export type Category =
  | 'top'
  | 'bottom'
  | 'outerwear'
  | 'shoes'
  | 'accessory'
  | 'full'

export const CATEGORIES: Category[] = [
  'top',
  'bottom',
  'outerwear',
  'shoes',
  'accessory',
  'full',
]

export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter']

export type Pattern = 'solid' | 'stripe' | 'check' | 'print' | 'texture'

export const PATTERNS: Pattern[] = [
  'solid',
  'stripe',
  'check',
  'print',
  'texture',
]

export type Scale5 = 1 | 2 | 3 | 4 | 5

export type ColourSwatch = {
  hex: string
  /** 0–1, share of garment pixels */
  proportion: number
  role: 'dominant' | 'secondary' | 'accent'
}

export type Item = {
  id: string
  photoKey: string
  /** 300px WebP, for grid rendering */
  thumbKey: string
  category: Category
  subcategory?: string
  /** 1–3, user-confirmed */
  colours: ColourSwatch[]
  pattern: Pattern
  /** 1 = gym, 3 = smart casual, 5 = suit */
  formality: Scale5
  warmth: Scale5
  seasons: Season[]
  notes?: string
  retired: boolean
  createdAt: number
}

export type Verdict = 'works' | 'no'

export type Outfit = {
  id: string
  itemIds: string[]
  verdict: Verdict
  rating?: Scale5
  /** free-text tags: 'work', 'pub', 'school run' */
  occasions: string[]
  notes?: string
  photoKey?: string
  wornDates: number[]
  createdAt: number
}

export type PairVerdict = {
  /** item ids, stored with a < b */
  a: string
  b: string
  verdict: 'good' | 'bad'
  /** derived = inferred from an Outfit */
  source: 'explicit' | 'derived'
}
