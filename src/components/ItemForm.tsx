import { Chip, Field, ScalePicker } from './ui'
import {
  CATEGORIES,
  PATTERNS,
  SEASONS,
  type Category,
  type Pattern,
  type Scale5,
  type Season,
} from '../types'

export type ItemFormValues = {
  category: Category
  subcategory: string
  formality: Scale5
  warmth: Scale5
  pattern: Pattern
  seasons: Season[]
  notes: string
}

export const EMPTY_ITEM_FORM: ItemFormValues = {
  category: 'top',
  subcategory: '',
  formality: 3,
  warmth: 3,
  pattern: 'solid',
  seasons: [],
  notes: '',
}

const FORMALITY_LABELS = { 1: 'gym', 3: 'smart cas.', 5: 'suit' }
const WARMTH_LABELS = { 1: 'cool', 5: 'warm' }

export function ItemForm({
  values,
  onChange,
}: {
  values: ItemFormValues
  onChange: (values: ItemFormValues) => void
}) {
  const set = <K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) =>
    onChange({ ...values, [key]: value })

  const toggleSeason = (season: Season) =>
    set(
      'seasons',
      values.seasons.includes(season)
        ? values.seasons.filter((s) => s !== season)
        : [...values.seasons, season],
    )

  return (
    <div className="space-y-5">
      <Field label="Category">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c} active={values.category === c} onClick={() => set('category', c)}>
              {c}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="What is it">
        <input
          type="text"
          value={values.subcategory}
          onChange={(e) => set('subcategory', e.target.value)}
          placeholder="oxford shirt, chinos, chelsea boots"
          className="bg-surface border-line min-h-12 w-full rounded-xl border px-3"
        />
      </Field>

      <Field label="Formality">
        <ScalePicker
          value={values.formality}
          onChange={(v) => set('formality', v)}
          labels={FORMALITY_LABELS}
        />
      </Field>

      <Field label="Warmth">
        <ScalePicker
          value={values.warmth}
          onChange={(v) => set('warmth', v)}
          labels={WARMTH_LABELS}
        />
      </Field>

      <Field label="Pattern">
        <div className="flex flex-wrap gap-2">
          {PATTERNS.map((p) => (
            <Chip key={p} active={values.pattern === p} onClick={() => set('pattern', p)}>
              {p}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Seasons">
        <div className="flex flex-wrap gap-2">
          {SEASONS.map((s) => (
            <Chip key={s} active={values.seasons.includes(s)} onClick={() => toggleSeason(s)}>
              {s}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Notes">
        <textarea
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          className="bg-surface border-line w-full rounded-xl border px-3 py-2"
        />
      </Field>
    </div>
  )
}
