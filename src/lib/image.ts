const PHOTO_MAX_EDGE = 1400
const THUMB_MAX_EDGE = 300

export type ProcessedPhoto = {
  photo: Blob
  thumb: Blob
  /** Object URL of the full photo, for the swatch-confirm step. */
  previewUrl: string
}

async function loadBitmap(file: Blob): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' })
}

function fit(width: number, height: number, maxEdge: number): [number, number] {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return [Math.round(width * scale), Math.round(height * scale)]
}

function draw(bitmap: ImageBitmap, maxEdge: number): HTMLCanvasElement {
  const [w, h] = fit(bitmap.width, bitmap.height, maxEdge)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D unavailable')
  ctx.drawImage(bitmap, 0, 0, w, h)
  return canvas
}

async function encode(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', quality),
  )
  if (blob) return blob
  // Safari < 14 and a few Android browsers refuse WebP encoding.
  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!jpeg) throw new Error('Could not encode image')
  return jpeg
}

export async function processPhoto(file: Blob): Promise<ProcessedPhoto> {
  const bitmap = await loadBitmap(file)
  try {
    const photo = await encode(draw(bitmap, PHOTO_MAX_EDGE), 0.82)
    const thumb = await encode(draw(bitmap, THUMB_MAX_EDGE), 0.75)
    return { photo, thumb, previewUrl: URL.createObjectURL(photo) }
  } finally {
    bitmap.close()
  }
}

export type PixelGrid = {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** Downscaled pixels for colour extraction (§4 step 1). */
export async function pixelsForExtraction(
  source: Blob,
  maxEdge = 120,
): Promise<PixelGrid> {
  const bitmap = await loadBitmap(source)
  try {
    const canvas = draw(bitmap, maxEdge)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return { data: image.data, width: canvas.width, height: canvas.height }
  } finally {
    bitmap.close()
  }
}
