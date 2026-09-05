import { useState } from 'react'
import type { Scale5 } from '../types'
import { Chip, Field, ScalePicker } from './ui'

export type OutfitMetaValues = {
  occasions: string[]
  rating: Scale5 | undefined
  notes: string
}

export const EMPTY_OUTFIT_META: OutfitMetaValues = {
  occasions: [],
  rating: undefined,
  notes: '',
}

const SUGGESTED = ['work', 'pub', 'school run', 'weekend', 'dinner']

export function OutfitMeta({
  values,
  onChange,
}: {
  values: OutfitMetaValues
  onChange: (values: OutfitMetaValues) => void
}) {
  const [draft, setDraft] = useState('')

  const toggle = (tag: string) =>
    onChange({
      ...values,
      occasions: values.occasions.includes(tag)
        ? values.occasions.filter((t) => t !== tag)
        : [...values.occasions, tag],
    })

  function commitDraft() {
    const tag = draft.trim().toLowerCase()
    if (tag && !values.occasions.includes(tag)) {
      onChange({ ...values, occasions: [...values.occasions, tag] })
    }
    setDraft('')
  }

  const tags = [...new Set([...SUGGESTED, ...values.occasions])]

  return (
    <div className="space-y-5">
      <Field label="Occasions">
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Chip key={tag} active={values.occasions.includes(tag)} onClick={() => toggle(tag)}>
              {tag}
            </Chip>
          ))}
        </div>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commitDraft()
            }
          }}
          placeholder="add a tag"
          className="bg-surface border-line min-h-12 w-full rounded-xl border px-3"
        />
      </Field>

      <Field label="Rating (optional)">
        <ScalePicker
          value={values.rating ?? 0}
          onChange={(rating) =>
            onChange({ ...values, rating: values.rating === rating ? undefined : rating })
          }
        />
      </Field>

      <Field label="Notes">
        <textarea
          value={values.notes}
          onChange={(e) => onChange({ ...values, notes: e.target.value })}
          rows={2}
          className="bg-surface border-line w-full rounded-xl border px-3 py-2"
        />
      </Field>
    </div>
  )
}
