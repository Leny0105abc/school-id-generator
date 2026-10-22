import type { CropArea, PhotoRecord } from '../types'

export const MAX_ORIGINAL_SIDE = 1600
export const CROPPED_SIZE = 600
export const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp'

export class ImageError extends Error {}

export async function decodeImage(blob: Blob): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { imageOrientation: 'from-image' })
  } catch {
    const hint = /hei[cf]/i.test(blob.type) ? ' iPhone HEIC photos are not supported.' : ''
    throw new ImageError(`This image could not be opened.${hint} Use a JPG, PNG or WebP file.`)
  }
}

// toDataURL is synchronous. canvas.toBlob's callback can be delayed by seconds when
// the tab is in the background, which made bulk photo work crawl.
async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  const dataUrl = canvas.toDataURL(type, quality)
  if (!dataUrl.startsWith(`data:${type}`)) throw new ImageError('Could not save image')
  return dataUrlToBlob(dataUrl)
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',')
  const mime = /^data:([^;,]+)/.exec(dataUrl)?.[1] ?? 'application/octet-stream'
  const binary = atob(dataUrl.slice(comma + 1))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

function makeCanvas(width: number, height: number, background?: string) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, width, height)
  }
  return { canvas, ctx }
}

/** Size that fits inside maxSide while keeping the aspect ratio (never enlarges). */
export function fitInside(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

/**
 * Largest centered square. In tall photos the face is usually in the upper part,
 * so the square sits 30% of the way down instead of exactly in the middle.
 */
export function defaultSquareCrop(width: number, height: number): CropArea {
  const side = Math.min(width, height)
  const x = Math.round((width - side) / 2)
  const y = height > width ? Math.round((height - side) * 0.3) : Math.round((height - side) / 2)
  return { x, y, width: side, height: side }
}

export async function cropToSquare(source: Blob, area: CropArea, size = CROPPED_SIZE): Promise<Blob> {
  const bitmap = await decodeImage(source)
  try {
    const { canvas, ctx } = makeCanvas(size, size, '#ffffff')
    ctx.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, size, size)
    return await canvasToBlob(canvas, 'image/jpeg', 0.9)
  } finally {
    bitmap.close()
  }
}

/** Scales a photo down, then makes the default square crop. */
export async function preparePhoto(file: Blob): Promise<Omit<PhotoRecord, 'id'>> {
  const bitmap = await decodeImage(file)
  try {
    const { width, height } = fitInside(bitmap.width, bitmap.height, MAX_ORIGINAL_SIDE)
    const { canvas, ctx } = makeCanvas(width, height, '#ffffff')
    ctx.drawImage(bitmap, 0, 0, width, height)
    const original = await canvasToBlob(canvas, 'image/jpeg', 0.9)
    const crop = defaultSquareCrop(width, height)
    const cropped = await cropToSquare(original, crop)
    return { original, cropped, crop }
  } finally {
    bitmap.close()
  }
}

/** Logos and signatures: keep transparency (PNG), scale down to maxSide. */
export async function prepareAsset(file: Blob, maxSide = 1000): Promise<Blob> {
  const bitmap = await decodeImage(file)
  try {
    const { width, height } = fitInside(bitmap.width, bitmap.height, maxSide)
    const { canvas, ctx } = makeCanvas(width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)
    return await canvasToBlob(canvas, 'image/png')
  } finally {
    bitmap.close()
  }
}

/**
 * Turns the paper around a scanned or photographed signature transparent:
 * near-white pixels fade out, ink stays.
 */
export async function whiteToTransparent(file: Blob, maxSide = 1000): Promise<Blob> {
  const bitmap = await decodeImage(file)
  try {
    const { width, height } = fitInside(bitmap.width, bitmap.height, maxSide)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(bitmap, 0, 0, width, height)
    const image = ctx.getImageData(0, 0, width, height)
    const px = image.data
    for (let i = 0; i < px.length; i += 4) {
      const light = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]
      // Fully clear above 225, fully kept below 165, soft edge in between.
      const keep = Math.min(1, Math.max(0, (225 - light) / 60))
      px[i + 3] = Math.round(px[i + 3] * keep)
    }
    ctx.putImageData(image, 0, 0)
    return await canvasToBlob(canvas, 'image/png')
  } finally {
    bitmap.close()
  }
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/** Draws an image (e.g. a generated SVG) onto a canvas and returns it as a Blob. */
export async function renderToBlob(
  draw: (ctx: CanvasRenderingContext2D) => void,
  width: number,
  height: number,
  type = 'image/png',
): Promise<Blob> {
  const { canvas, ctx } = makeCanvas(width, height, type === 'image/jpeg' ? '#ffffff' : undefined)
  draw(ctx)
  return canvasToBlob(canvas, type, 0.9)
}
