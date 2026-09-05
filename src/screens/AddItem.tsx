import { useState } from 'react'
import { ColourPicker } from '../components/ColourPicker'
import { EMPTY_ITEM_FORM, ItemForm, type ItemFormValues } from '../components/ItemForm'
import { PhotoCapture } from '../components/PhotoCapture'
import { Button, TopBar } from '../components/ui'
import { putBlob } from '../db/blobs'
import { putItem } from '../db/items'
import { newId } from '../lib/id'
import type { ProcessedPhoto } from '../lib/image'
import { navigate } from '../router'
import type { ColourSwatch, Item } from '../types'

type Step = 'capture' | 'colours' | 'details'

export function AddItem() {
  const [step, setStep] = useState<Step>('capture')
  const [photo, setPhoto] = useState<ProcessedPhoto>()
  const [colours, setColours] = useState<ColourSwatch[]>([])
  const [values, setValues] = useState<ItemFormValues>(EMPTY_ITEM_FORM)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!photo) return
    setSaving(true)
    const id = newId('i_')
    const photoKey = `p_${id}`
    const thumbKey = `t_${id}`
    const item: Item = {
      id,
      photoKey,
      thumbKey,
      category: values.category,
      subcategory: values.subcategory.trim() || undefined,
      colours,
      pattern: values.pattern,
      formality: values.formality,
      warmth: values.warmth,
      seasons: values.seasons,
      notes: values.notes.trim() || undefined,
      retired: false,
      createdAt: Date.now(),
    }
    await putBlob(photoKey, photo.photo)
    await putBlob(thumbKey, photo.thumb)
    await putItem(item)
    URL.revokeObjectURL(photo.previewUrl)
    navigate(`/item/${id}`, { replace: true })
  }

  return (
    <>
      <TopBar
        title="Add item"
        showBack
        onBack={() => (step === 'capture' ? navigate('/') : setStep('capture'))}
      />

      {step === 'capture' && (
        <PhotoCapture
          onPhoto={(result) => {
            setPhoto(result)
            setStep('colours')
          }}
        />
      )}

      {step === 'colours' && photo && (
        <div className="space-y-4 px-4 py-4">
          <ColourPicker
            imageUrl={photo.previewUrl}
            swatches={colours}
            onChange={setColours}
          />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={() => setStep('capture')}>
              Retake
            </Button>
            <Button onClick={() => setStep('details')} disabled={colours.length === 0}>
              Next
            </Button>
          </div>
        </div>
      )}

      {step === 'details' && photo && (
        <div className="space-y-5 px-4 py-4">
          <ItemForm values={values} onChange={setValues} />
          <div className="grid grid-cols-2 gap-3">
            <Button variant="ghost" onClick={() => setStep('colours')}>
              Colours
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? 'Saving…' : 'Save item'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
