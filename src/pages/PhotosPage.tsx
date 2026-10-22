import { useLiveQuery } from 'dexie-react-hooks'
import {
  CheckCircle2Icon,
  CropIcon,
  FolderOpenIcon,
  ImagePlusIcon,
  ImageUpIcon,
  Loader2Icon,
  SearchIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/Field'
import { PersonAvatar } from '@/components/people/PersonAvatar'
import { CropDialog, type CropSource } from '@/components/photos/CropDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { db, setPersonPhoto } from '@/lib/db'
import { idLabel } from '@/lib/ids'
import { sortableName } from '@/lib/names'
import { comparePeople, matchesSearch } from '@/lib/people'
import { ACCEPTED_IMAGES, ImageError, preparePhoto } from '@/lib/photos/image'
import { indexPeople, matchFileName, type MatchStatus } from '@/lib/photos/match'
import { gradeLabel } from '@/lib/schemas'
import type { Person } from '@/lib/types'
import { cn } from '@/lib/utils'

interface StagedPhoto {
  key: string
  file: File
  url: string
  personId: string | null
  status: MatchStatus
}

const IMAGE_FILE = /\.(jpe?g|png|webp|heic|heif)$/i
const PAGE = 60

export default function PhotosPage() {
  const people = useLiveQuery(async () => (await db.people.toArray()).sort(comparePeople), [])
  const [staged, setStaged] = useState<StagedPhoto[]>([])
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const filesInput = useRef<HTMLInputElement>(null)
  const folderInput = useRef<HTMLInputElement>(null)

  // Free the preview URLs when files are cleared or the page closes.
  const stagedRef = useRef(staged)
  useEffect(() => {
    stagedRef.current = staged
  }, [staged])
  useEffect(() => () => stagedRef.current.forEach((s) => URL.revokeObjectURL(s.url)), [])

  const byId = useMemo(() => new Map(people?.map((p) => [p.id, p])), [people])

  function addFiles(list: FileList | File[] | null) {
    if (!list || !people) return
    const files = [...list].filter((f) => f.type.startsWith('image/') || IMAGE_FILE.test(f.name))
    if (files.length === 0) {
      toast.error('No photos found. Use JPG, PNG or WebP files.')
      return
    }
    const index = indexPeople(people)
    const added = files.map((file, i) => ({
      key: `${Date.now()}-${i}-${file.name}`,
      file,
      url: URL.createObjectURL(file),
      ...matchFileName(file.name, index),
    }))
    setStaged((s) => [...s, ...added])
    const matched = added.filter((a) => a.personId).length
    toast.info(`${matched} of ${added.length} photos matched by file name`)
  }

  function clearStaged() {
    staged.forEach((s) => URL.revokeObjectURL(s.url))
    setStaged([])
  }

  function assign(key: string, personId: string | null) {
    setStaged((list) =>
      list.map((s) => (s.key === key ? { ...s, personId, status: personId ? 'matched' : 'unmatched' } : s)),
    )
  }

  function remove(key: string) {
    setStaged((list) => {
      const item = list.find((s) => s.key === key)
      if (item) URL.revokeObjectURL(item.url)
      return list.filter((s) => s.key !== key)
    })
  }

  async function saveAll() {
    const ready = staged.filter((s) => s.personId)
    if (ready.length === 0) return
    setProgress({ done: 0, total: ready.length })
    const failed: StagedPhoto[] = []
    for (const [i, item] of ready.entries()) {
      try {
        await setPersonPhoto(item.personId!, await preparePhoto(item.file))
      } catch (err) {
        failed.push(item)
        if (!(err instanceof ImageError)) console.error(err)
      }
      setProgress({ done: i + 1, total: ready.length })
    }
    const savedKeys = new Set(ready.filter((r) => !failed.includes(r)).map((r) => r.key))
    staged.filter((s) => savedKeys.has(s.key)).forEach((s) => URL.revokeObjectURL(s.url))
    setStaged((list) => list.filter((s) => !savedKeys.has(s.key)))
    setProgress(null)
    if (failed.length) toast.error(`${failed.length} photos could not be opened (HEIC or damaged files?)`)
    toast.success(`Saved ${savedKeys.size} photos`)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  if (!people) return <p className="text-sm text-muted-foreground">Loading…</p>

  const assignedCount = staged.filter((s) => s.personId).length
  const personUseCount = new Map<string, number>()
  staged.forEach((s) => s.personId && personUseCount.set(s.personId, (personUseCount.get(s.personId) ?? 0) + 1))

  return (
    <>
      <PageHeader
        title="Photos"
        description="Add photos in bulk or one at a time. Each photo is cropped to a square for the card."
      />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add photos in bulk</CardTitle>
            <CardDescription>
              Name each file with the person's LRN or employee number, for example{' '}
              <code className="rounded bg-muted px-1">301234250001.jpg</code>. Matching files are
              assigned automatically; you can assign the rest by hand.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'grid justify-items-center gap-3 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
                dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
              )}
            >
              <ImagePlusIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Drop photos here, or</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="outline" onClick={() => filesInput.current?.click()} disabled={!!progress}>
                  <ImageUpIcon /> Choose photos
                </Button>
                <Button variant="outline" onClick={() => folderInput.current?.click()} disabled={!!progress}>
                  <FolderOpenIcon /> Choose a folder
                </Button>
              </div>
              <input
                ref={filesInput}
                type="file"
                multiple
                accept={ACCEPTED_IMAGES}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <input
                ref={folderInput}
                type="file"
                multiple
                className="sr-only"
                tabIndex={-1}
                {...{ webkitdirectory: '' }}
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </div>

            {staged.length > 0 && (
              <div className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    <strong>{assignedCount}</strong> of {staged.length} photos assigned
                  </span>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={clearStaged} disabled={!!progress}>
                      Clear
                    </Button>
                    <Button onClick={saveAll} disabled={assignedCount === 0 || !!progress}>
                      {progress ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon />}
                      Save {assignedCount} {assignedCount === 1 ? 'photo' : 'photos'}
                    </Button>
                  </div>
                </div>
                {progress && (
                  <div className="grid gap-1">
                    <Progress value={(progress.done / progress.total) * 100} />
                    <span className="text-xs text-muted-foreground">
                      Saving {progress.done} of {progress.total}…
                    </span>
                  </div>
                )}
                <ul className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
                  {staged.map((s) => {
                    const person = s.personId ? byId.get(s.personId) : undefined
                    const duplicate = s.personId && (personUseCount.get(s.personId) ?? 0) > 1
                    return (
                      <li key={s.key} className="flex flex-wrap items-center gap-3 rounded-lg border p-2">
                        <img src={s.url} alt="" className="size-12 rounded-md object-cover" />
                        <div className="grid min-w-40 flex-1">
                          <span className="truncate text-sm font-medium" title={s.file.name}>
                            {s.file.name}
                          </span>
                          <span className="text-xs">
                            {s.status === 'matched' && person?.photoId && (
                              <span className="text-amber-700">Replaces current photo</span>
                            )}
                            {s.status === 'unmatched' && <span className="text-muted-foreground">No match — choose a person</span>}
                            {s.status === 'ambiguous' && <span className="text-amber-700">Several people share this number</span>}
                            {duplicate && <span className="text-amber-700"> · Another file goes to the same person</span>}
                          </span>
                        </div>
                        <select
                          value={s.personId ?? ''}
                          onChange={(e) => assign(s.key, e.target.value || null)}
                          className="h-8 max-w-72 min-w-48 flex-1 rounded-md border bg-background px-2 text-sm"
                          aria-label={`Person for ${s.file.name}`}
                        >
                          <option value="">— Not assigned —</option>
                          <optgroup label="Learners">
                            {people.filter((p) => p.type === 'learner').map((p) => (
                              <option key={p.id} value={p.id}>
                                {sortableName(p)} · {p.idNumber}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Teachers">
                            {people.filter((p) => p.type === 'teacher').map((p) => (
                              <option key={p.id} value={p.id}>
                                {sortableName(p)} · {p.idNumber}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        {s.personId ? (
                          <Badge variant="secondary">Assigned</Badge>
                        ) : (
                          <Badge variant="outline">Skip</Badge>
                        )}
                        <Button size="icon-sm" variant="ghost" onClick={() => remove(s.key)} aria-label={`Remove ${s.file.name}`}>
                          <XIcon />
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <PeoplePhotos people={people} />
      </div>
    </>
  )
}

function PeoplePhotos({ people }: { people: Person[] }) {
  const [tab, setTab] = useState<'missing' | 'has'>('missing')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [uploadFor, setUploadFor] = useState<Person | null>(null)
  const [cropFor, setCropFor] = useState<{ person: Person; source: CropSource } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  const missing = people.filter((p) => !p.photoId)
  const list = (tab === 'missing' ? missing : people.filter((p) => p.photoId)).filter((p) => matchesSearch(p, search))

  function pickFor(person: Person) {
    setUploadFor(person)
    input.current?.click()
  }

  async function onFile(file: File | undefined) {
    const person = uploadFor
    if (!file || !person) return
    setBusyId(person.id)
    try {
      await setPersonPhoto(person.id, await preparePhoto(file))
      toast.success(`Photo saved for ${person.firstName}`)
    } catch (err) {
      toast.error(err instanceof ImageError ? err.message : 'Could not use that photo')
    } finally {
      setBusyId(null)
      if (input.current) input.current.value = ''
    }
  }

  async function openCrop(person: Person) {
    if (!person.photoId) return
    const record = await db.photos.get(person.photoId)
    if (record) setCropFor({ person, source: { original: record.original, crop: record.crop } })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle>Everyone's photos</CardTitle>
          <CardDescription>Click a photo to adjust its crop.</CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as 'missing' | 'has'); setLimit(PAGE) }}>
            <TabsList>
              <TabsTrigger value="missing">No photo ({missing.length})</TabsTrigger>
              <TabsTrigger value="has">With photo ({people.length - missing.length})</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-56">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-8" aria-label="Search people" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <input
          ref={input}
          type="file"
          accept={ACCEPTED_IMAGES}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        {list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {tab === 'missing' ? 'Everyone has a photo.' : 'No photos yet.'}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-3">
            {list.slice(0, limit).map((p) => (
              <li key={p.id} className="grid gap-2 rounded-lg border p-2">
                <button
                  type="button"
                  onClick={() => (p.photoId ? openCrop(p) : pickFor(p))}
                  className="group relative"
                  aria-label={p.photoId ? `Adjust crop for ${sortableName(p)}` : `Upload photo for ${sortableName(p)}`}
                >
                  <PersonAvatar person={p} className="aspect-square size-auto w-full rounded-md text-2xl" />
                  <span className="absolute inset-0 grid place-items-center rounded-md bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {busyId === p.id ? <Loader2Icon className="animate-spin" /> : p.photoId ? <CropIcon /> : <ImageUpIcon />}
                  </span>
                </button>
                <div className="grid min-w-0">
                  <span className="truncate text-sm font-medium" title={sortableName(p)}>
                    {sortableName(p)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {p.type === 'learner' ? gradeLabel(p) : p.position || idLabel(p.type) + ' ' + p.idNumber}
                  </span>
                </div>
                <Button size="xs" variant="outline" onClick={() => pickFor(p)} disabled={busyId === p.id}>
                  <ImageUpIcon /> {p.photoId ? 'Replace' : 'Upload'}
                </Button>
              </li>
            ))}
          </ul>
        )}
        {list.length > limit && (
          <div className="mt-4 text-center">
            <Button variant="outline" onClick={() => setLimit((l) => l + PAGE)}>
              Show more ({list.length - limit} left)
            </Button>
          </div>
        )}
      </CardContent>

      <CropDialog
        open={cropFor != null}
        onOpenChange={(open) => !open && setCropFor(null)}
        title={cropFor ? `Adjust photo — ${sortableName(cropFor.person)}` : undefined}
        source={cropFor?.source ?? null}
        onSave={async ({ crop, cropped }) => {
          if (!cropFor) return
          await setPersonPhoto(cropFor.person.id, { original: cropFor.source.original, cropped, crop })
          toast.success('Crop saved')
        }}
      />
    </Card>
  )
}
