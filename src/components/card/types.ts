import type { PersonInput, Settings } from '@/lib/types'

/** CR80 card, portrait. */
export const CARD_WIDTH_MM = 53.98
export const CARD_HEIGHT_MM = 85.6
const MM_TO_PX = 96 / 25.4
export const CARD_WIDTH_PX = CARD_WIDTH_MM * MM_TO_PX
export const CARD_HEIGHT_PX = CARD_HEIGHT_MM * MM_TO_PX

export type CardSide = 'front' | 'back'

export interface CardImages {
  photo?: string
  logoLeft?: string
  logoRight?: string
  signature?: string
}

export interface CardProps {
  person: PersonInput
  settings: Settings
  images: CardImages
}

export const mm = (n: number) => `${n}mm`
export const pt = (n: number) => `${n}pt`
