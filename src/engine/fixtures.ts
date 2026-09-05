import type { Category, Item, Pattern, Scale5, Season } from '../types'

/** Hand-built wardrobe used by the scorer tests. Colours are real garment hexes. */
export function item(
  id: string,
  category: Category,
  hex: string,
  formality: Scale5,
  options: {
    pattern?: Pattern
    seasons?: Season[]
    warmth?: Scale5
    second?: string
  } = {},
): Item {
  const colours = [
    { hex, proportion: options.second ? 0.75 : 1, role: 'dominant' as const },
    ...(options.second
      ? [{ hex: options.second, proportion: 0.25, role: 'secondary' as const }]
      : []),
  ]
  return {
    id,
    photoKey: `p_${id}`,
    thumbKey: `t_${id}`,
    category,
    subcategory: id.replace(/_/g, ' '),
    colours,
    pattern: options.pattern ?? 'solid',
    formality,
    warmth: options.warmth ?? 3,
    seasons: options.seasons ?? [],
    retired: false,
    createdAt: 0,
  }
}

export const WARDROBE = {
  navyOxford: item('navy_oxford', 'top', '#1b2a4a', 4),
  whiteTee: item('white_tee', 'top', '#f4f3ef', 2),
  rustOvershirt: item('rust_overshirt', 'outerwear', '#9b4a28', 3),
  stoneChinos: item('stone_chinos', 'bottom', '#c9c0ae', 3),
  charcoalTrousers: item('charcoal_trousers', 'bottom', '#3a3a42', 5),
  greySweatshirt: item('grey_sweatshirt', 'top', '#8b8b93', 2, { pattern: 'texture' }),
  oliveJacket: item('olive_jacket', 'outerwear', '#6b6b3a', 3, { seasons: ['autumn'] }),
  redShorts: item('red_shorts', 'bottom', '#b3372f', 1, { seasons: ['summer'] }),
  blueStripeShirt: item('blue_stripe_shirt', 'top', '#3a63b8', 4, { pattern: 'stripe' }),
  checkFlannel: item('check_flannel', 'top', '#7a4a4a', 2, { pattern: 'check' }),
  brownBoots: item('brown_boots', 'shoes', '#6b4a32', 4, { seasons: ['autumn', 'winter'] }),
  whiteTrainers: item('white_trainers', 'shoes', '#f4f3ef', 2),
  blackJeans: item('black_jeans', 'bottom', '#2a2a30', 3),
  tealKnit: item('teal_knit', 'top', '#2f6f6f', 3, { seasons: ['winter'] }),
  mustardScarf: item('mustard_scarf', 'accessory', '#c9a227', 3, { seasons: ['autumn'] }),
  pinkOxford: item('pink_oxford', 'top', '#d99aa4', 4),
  floralShirt: item('floral_shirt', 'top', '#4a8a52', 3, { pattern: 'print' }),
  camelCoat: item('camel_coat', 'outerwear', '#b08d57', 4, { seasons: ['autumn', 'winter'] }),
} satisfies Record<string, Item>
