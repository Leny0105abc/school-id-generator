import { usePhotoUrl } from '@/lib/blob-urls'
import { cn } from '@/lib/utils'
import type { Person } from '@/lib/types'

export function PersonAvatar({
  person,
  src,
  className,
}: {
  person: Pick<Person, 'firstName' | 'lastName' | 'photoId'>
  /** Overrides the stored photo (e.g. an unsaved upload). */
  src?: string
  className?: string
}) {
  const stored = usePhotoUrl(src ? null : person.photoId)
  const url = src ?? stored
  const initials = `${person.firstName[0] ?? ''}${person.lastName[0] ?? ''}`.toUpperCase()
  return (
    <div
      className={cn(
        'grid size-9 shrink-0 place-items-center overflow-hidden rounded-md bg-muted text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      {url ? <img src={url} alt="" className="size-full object-cover" /> : initials || '?'}
    </div>
  )
}
