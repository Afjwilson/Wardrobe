import { useRef, type MouseEvent } from 'react'
import { hexFromRgb255 } from '../lib/colour'
import {
  addSwatch,
  MAX_SWATCHES,
  promoteSwatch,
  removeSwatch,
  replaceSwatch,
} from '../lib/swatches'
import type { ColourSwatch } from '../types'
import { SwatchEditor } from './SwatchEditor'

/** Average a 5x5 block so a single noisy pixel does not decide the colour. */
function sampleAt(image: HTMLImageElement, x: number, y: number): string | undefined {
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return undefined
  ctx.drawImage(image, 0, 0)
  const half = 2
  const left = Math.max(0, Math.min(canvas.width - 1, Math.round(x)) - half)
  const top = Math.max(0, Math.min(canvas.height - 1, Math.round(y)) - half)
  const { data } = ctx.getImageData(left, top, 5, 5)
  let r = 0
  let g = 0
  let b = 0
  const count = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  return hexFromRgb255(r / count, g / count, b / count)
}

export function ColourPicker({
  imageUrl,
  swatches,
  onChange,
}: {
  imageUrl: string
  swatches: ColourSwatch[]
  onChange: (swatches: ColourSwatch[]) => void
}) {
  const imageRef = useRef<HTMLImageElement>(null)

  function onPhotoTap(event: MouseEvent<HTMLImageElement>) {
    const image = imageRef.current
    if (!image) return
    const rect = image.getBoundingClientRect()
    const scaleX = image.naturalWidth / rect.width
    const scaleY = image.naturalHeight / rect.height
    const hex = sampleAt(
      image,
      (event.clientX - rect.left) * scaleX,
      (event.clientY - rect.top) * scaleY,
    )
    if (!hex) return
    onChange(
      swatches.length >= MAX_SWATCHES
        ? replaceSwatch(swatches, swatches.length - 1, hex)
        : addSwatch(swatches, hex),
    )
  }

  return (
    <div className="space-y-3">
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Item"
        onClick={onPhotoTap}
        className="bg-surface max-h-72 w-full rounded-xl object-contain"
      />
      <p className="text-muted text-xs">
        Tap the photo to sample a colour.{' '}
        {swatches.length >= MAX_SWATCHES && 'The last swatch is replaced once you have three.'}
      </p>

      {swatches.length === 0 ? (
        <p className="text-muted bg-surface border-line rounded-xl border p-3 text-sm">
          No colours yet — tap the garment in the photo.
        </p>
      ) : (
        <div className="space-y-2">
          {swatches.map((swatch, index) => (
            <SwatchEditor
              key={`${swatch.role}-${index}`}
              swatch={swatch}
              onChange={(hex) => onChange(replaceSwatch(swatches, index, hex))}
              onRemove={() => onChange(removeSwatch(swatches, index))}
              onPromote={() => onChange(promoteSwatch(swatches, index))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
