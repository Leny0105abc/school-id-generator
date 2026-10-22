import { useAssetUrls, usePhotoUrl } from '@/lib/blob-urls'
import type { CardImages } from './types'

/** Image URLs a card needs: the person's photo plus the school logos and signature. */
export function useCardImages(photoId: string | null | undefined, photoOverride?: string): CardImages {
  const photo = usePhotoUrl(photoOverride ? null : photoId)
  const assets = useAssetUrls()
  return { photo: photoOverride ?? photo, ...assets }
}
