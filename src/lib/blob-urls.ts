import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from './db'
import type { AssetKey } from './types'

// Object URLs are cached by a key that changes whenever the image changes
// (photo ids are new on every change; assets use their updatedAt).
const MAX_CACHED = 400
const cache = new Map<string, string>()

export function cachedObjectUrl(key: string, blob: Blob): string {
  const hit = cache.get(key)
  if (hit) {
    cache.delete(key)
    cache.set(key, hit) // mark as recently used
    return hit
  }
  const url = URL.createObjectURL(blob)
  cache.set(key, url)
  if (cache.size > MAX_CACHED) {
    const [oldestKey, oldestUrl] = cache.entries().next().value!
    cache.delete(oldestKey)
    URL.revokeObjectURL(oldestUrl)
  }
  return url
}

/** URL of a person's cropped photo, or undefined. */
export function usePhotoUrl(photoId: string | null | undefined): string | undefined {
  const key = photoId ? `photo:${photoId}` : null
  const [, rerender] = useState(0)

  useEffect(() => {
    if (!photoId || !key || cache.has(key)) return
    let cancelled = false
    void db.photos.get(photoId).then((rec) => {
      if (cancelled || !rec) return
      cachedObjectUrl(key, rec.cropped)
      rerender((n) => n + 1)
    })
    return () => {
      cancelled = true
    }
  }, [photoId, key])

  return key ? cache.get(key) : undefined
}

export type AssetUrls = Partial<Record<AssetKey, string>>

/** URLs of the school logos and the principal's signature. */
export function useAssetUrls(): AssetUrls | undefined {
  const assets = useLiveQuery(() => db.assets.toArray(), [])
  if (!assets) return undefined
  const urls: AssetUrls = {}
  for (const a of assets) urls[a.id] = cachedObjectUrl(`asset:${a.id}:${a.updatedAt}`, a.blob)
  return urls
}
