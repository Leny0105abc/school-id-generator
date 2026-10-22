import { ImageUpIcon, Loader2Icon, TrashIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { db } from '@/lib/db'
import { ACCEPTED_IMAGES, ImageError, prepareAsset, whiteToTransparent } from '@/lib/photos/image'
import type { AssetKey } from '@/lib/types'

interface AssetTileProps {
  id: AssetKey
  label: string
  hint: string
  url?: string
}

/** Upload / replace / remove one school image (logo or signature). */
export function AssetTile({ id, label, hint, url }: AssetTileProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const isSignature = id === 'signature'

  async function onFile(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      const blob = isSignature ? await whiteToTransparent(file) : await prepareAsset(file)
      await db.assets.put({ id, blob, updatedAt: Date.now() })
      toast.success(`${label} saved`)
    } catch (err) {
      toast.error(err instanceof ImageError ? err.message : `Could not use that image`)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <div className="text-sm font-medium">{label}</div>
      <div
        className="grid h-24 place-items-center rounded-md bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-size-[16px_16px]"
        aria-hidden
      >
        {url ? (
          <img src={url} alt="" className="max-h-20 max-w-[90%] object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGES}
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? <Loader2Icon className="animate-spin" /> : <ImageUpIcon />}
          {url ? 'Replace' : 'Upload'}
        </Button>
        {url && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => db.assets.delete(id)}
            disabled={busy}
            aria-label={`Remove ${label}`}
          >
            <TrashIcon /> Remove
          </Button>
        )}
      </div>
    </div>
  )
}
