import { domToJpeg } from 'modern-screenshot'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { IdCard } from '@/components/card/IdCard'
import { CARD_WIDTH_PX, type CardImages, type CardSide } from '@/components/card/types'
import { db } from '../db'
import { blobToDataUrl } from '../photos/image'
import type { Person, Settings } from '../types'
import { cardFontCss, loadCardFonts } from './card-fonts'

/** 300 dots per inch, the usual resolution of ID card printers. */
export const PRINT_DPI = 300

export interface CardRenderer {
  /** Renders one side of a card to a JPEG data URL. */
  render(person: Person, side: CardSide): Promise<string>
  dispose(): void
}

async function waitForImages(root: HTMLElement) {
  await Promise.all(
    [...root.querySelectorAll('img')].map((img) => (img.complete && img.naturalWidth ? Promise.resolve() : img.decode().catch(() => {}))),
  )
}

/**
 * Draws cards off screen with the same React components used for the preview,
 * then turns each one into an image. Images are data URLs so nothing is fetched.
 */
export async function createCardRenderer(settings: Settings): Promise<CardRenderer> {
  const [fontCss] = await Promise.all([cardFontCss(), loadCardFonts()])

  const assetImages: CardImages = {}
  for (const asset of await db.assets.toArray()) {
    assetImages[asset.id] = await blobToDataUrl(asset.blob)
  }

  // Off screen but still laid out; display:none or visibility:hidden would end up in the image.
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  Object.assign(host.style, {
    position: 'fixed',
    left: '-10000px',
    top: '0',
    width: `${CARD_WIDTH_PX}px`,
    pointerEvents: 'none',
  })
  document.body.appendChild(host)
  const root = createRoot(host)

  let currentPhoto: { id: string; url: string } | null = null
  async function photoFor(person: Person): Promise<string | undefined> {
    if (!person.photoId) return undefined
    if (currentPhoto?.id === person.photoId) return currentPhoto.url
    const record = await db.photos.get(person.photoId)
    if (!record) return undefined
    currentPhoto = { id: person.photoId, url: await blobToDataUrl(record.cropped) }
    return currentPhoto.url
  }

  return {
    async render(person, side) {
      const images = { ...assetImages, photo: await photoFor(person) }
      flushSync(() => root.render(<IdCard side={side} person={person} settings={settings} images={images} />))
      const card = host.firstElementChild as HTMLElement
      await waitForImages(card)
      return domToJpeg(card, {
        scale: PRINT_DPI / 96,
        quality: 0.92,
        backgroundColor: '#ffffff',
        font: { cssText: fontCss },
        timeout: 20000,
      })
    },
    dispose() {
      root.unmount()
      host.remove()
    },
  }
}
