import { allItems } from '../db/items'
import { allOutfits } from '../db/outfits'
import { allPairs } from '../db/pairs'
import { buildLearning } from '../engine'
import type { Learning } from '../engine'
import { useAsync, type AsyncState } from './useAsync'

/** Loads the stored verdicts the scorer learns from. Re-run with `reload()`. */
export function useLearning(deps: readonly unknown[] = []): AsyncState<Learning> {
  return useAsync(
    async () => buildLearning(await allItems(true), await allOutfits(), await allPairs()),
    deps,
  )
}
