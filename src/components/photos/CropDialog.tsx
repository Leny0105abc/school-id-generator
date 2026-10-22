import { Loader2Icon, ZoomInIcon, ZoomOutIcon } from 'lucide-react'
import { useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { useObjectUrl } from '@/lib/blob-urls'
import { cropToSquare } from '@/lib/photos/image'
import type { CropArea } from '@/lib/types'

export interface CropSource {
  original: Blob
  crop: CropArea
}

interface CropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  source: CropSource | null
  onSave: (result: { crop: CropArea; cropped: Blob }) => Promise<void> | void
}

/** Square crop of a stored photo. Drag to move, scroll or use the slider to zoom. */
export function CropDialog({ open, onOpenChange, title = 'Adjust photo', source, onSave }: CropDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Drag to move the photo. Keep the face centered with a little space above the head.</DialogDescription>
        </DialogHeader>
        {source && <CropEditor key={source.original.size + ':' + source.crop.x} source={source} onSave={onSave} onCancel={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function CropEditor({
  source,
  onSave,
  onCancel,
}: {
  source: CropSource
  onSave: CropDialogProps['onSave']
  onCancel: () => void
}) {
  const url = useObjectUrl(source.original)
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area>(source.crop)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      const rounded: CropArea = {
        x: Math.round(area.x),
        y: Math.round(area.y),
        width: Math.round(area.width),
        height: Math.round(area.height),
      }
      const cropped = await cropToSquare(source.original, rounded)
      await onSave({ crop: rounded, cropped })
      onCancel()
    } catch (err) {
      console.error(err)
      toast.error('Could not save the crop')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="relative mx-auto aspect-square w-full max-w-[min(100%,55svh)] overflow-hidden rounded-lg bg-neutral-900">
        {url && <Cropper
          image={url}
          crop={crop}
          zoom={zoom}
          aspect={1}
          minZoom={1}
          maxZoom={4}
          showGrid
          roundCropAreaPixels
          initialCroppedAreaPixels={source.crop}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => setArea(pixels)}
        />}
      </div>
      <div className="flex items-center gap-3">
        <ZoomOutIcon className="size-4 text-muted-foreground" aria-hidden />
        <Slider
          value={[zoom]}
          min={1}
          max={4}
          step={0.01}
          onValueChange={([v]) => setZoom(v)}
          aria-label="Zoom"
        />
        <ZoomInIcon className="size-4 text-muted-foreground" aria-hidden />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2Icon className="animate-spin" />}
          Save crop
        </Button>
      </DialogFooter>
    </>
  )
}
