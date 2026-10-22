import { ImageUpIcon, Loader2Icon, TrashIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState, type ComponentProps, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Field } from '@/components/common/Field'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { removePersonPhoto, setPersonPhoto } from '@/lib/db'
import { idLabel, idNumberWarning, normalizeIdNumber } from '@/lib/ids'
import { savePerson } from '@/lib/people'
import { ACCEPTED_IMAGES, ImageError, preparePhoto } from '@/lib/photos/image'
import {
  BLOOD_TYPES,
  emptyPersonInput,
  GRADE_LEVELS,
  POSITION_SUGGESTIONS,
  STRAND_SUGGESTIONS,
  type FieldErrors,
} from '@/lib/schemas'
import type { Person, PersonInput, PersonType, PhotoRecord } from '@/lib/types'
import { PersonAvatar } from './PersonAvatar'

type PendingPhoto = Omit<PhotoRecord, 'id'> | 'remove' | null

interface PersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: PersonType
  person?: Person
}

function toInput(person: Person | undefined, type: PersonType): PersonInput {
  if (!person) return emptyPersonInput(type)
  const { id: _id, photoId: _p, createdAt: _c, updatedAt: _u, ...input } = person
  return input
}

export function PersonDialog({ open, onOpenChange, type, person }: PersonDialogProps) {
  const [form, setForm] = useState<PersonInput>(() => toInput(person, type))
  const [errors, setErrors] = useState<FieldErrors>({})
  const [pendingPhoto, setPendingPhoto] = useState<PendingPhoto>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const uid = useId()

  // Reset when the dialog opens for a different person.
  useEffect(() => {
    if (open) {
      setForm(toInput(person, type))
      setErrors({})
      setPendingPhoto(null)
    }
  }, [open, person, type])

  const pendingUrl = useMemo(
    () => (pendingPhoto && pendingPhoto !== 'remove' ? URL.createObjectURL(pendingPhoto.cropped) : undefined),
    [pendingPhoto],
  )
  useEffect(() => () => void (pendingUrl && URL.revokeObjectURL(pendingUrl)), [pendingUrl])

  const set = <K extends keyof PersonInput>(key: K, value: PersonInput[K]) => {
    setForm((f) => ({ ...f, [key]: value }))
    setErrors((e) => ({ ...e, [key]: undefined }))
  }

  const isLearner = form.type === 'learner'
  const isShs = isLearner && (form.gradeLevel ?? 0) >= 11
  const hasPhoto = pendingPhoto === 'remove' ? false : Boolean(pendingPhoto || person?.photoId)
  const label = isLearner ? 'learner' : 'teacher'

  async function onPickPhoto(file: File | undefined) {
    if (!file) return
    setBusy(true)
    try {
      setPendingPhoto(await preparePhoto(file))
    } catch (err) {
      toast.error(err instanceof ImageError ? err.message : 'Could not read that photo')
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      const result = await savePerson({ ...form, idNumber: normalizeIdNumber(form.idNumber) }, person?.id)
      if (!result.ok) {
        setErrors(result.errors)
        toast.error('Please check the highlighted fields')
        return
      }
      if (pendingPhoto === 'remove') await removePersonPhoto(result.id)
      else if (pendingPhoto) await setPersonPhoto(result.id, pendingPhoto)
      toast.success(person ? 'Changes saved' : `${form.firstName} added`)
      onOpenChange(false)
    } finally {
      setBusy(false)
    }
  }

  const id = (name: string) => `${uid}-${name}`
  const text = (key: keyof PersonInput, extra?: ComponentProps<typeof Input>) => (
    <Input
      id={id(key)}
      value={(form[key] as string) ?? ''}
      onChange={(e) => set(key, e.target.value as never)}
      aria-invalid={Boolean(errors[key])}
      {...extra}
    />
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={onSubmit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{person ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
            <DialogDescription>Fields marked * are required.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[1fr_180px]">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label={`${idLabel(form.type)} *`}
                  htmlFor={id('idNumber')}
                  error={errors.idNumber}
                  warning={idNumberWarning(form.type, normalizeIdNumber(form.idNumber))}
                >
                  {text('idNumber', { inputMode: isLearner ? 'numeric' : undefined, autoFocus: !person })}
                </Field>
                {isLearner ? (
                  <Field label="Grade level *" error={errors.gradeLevel}>
                    <Select
                      value={form.gradeLevel?.toString() ?? ''}
                      onValueChange={(v) => set('gradeLevel', Number(v))}
                    >
                      <SelectTrigger className="w-full" aria-invalid={Boolean(errors.gradeLevel)}>
                        <SelectValue placeholder="Choose grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {GRADE_LEVELS.map((g) => (
                          <SelectItem key={g} value={String(g)}>
                            Grade {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                ) : (
                  <Field label="Position" htmlFor={id('position')} error={errors.position}>
                    {text('position', { list: id('positions'), placeholder: 'e.g. Teacher III' })}
                    <datalist id={id('positions')}>
                      {POSITION_SUGGESTIONS.map((p) => (
                        <option key={p} value={p} />
                      ))}
                    </datalist>
                  </Field>
                )}
              </div>

              {isLearner ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Section" htmlFor={id('section')} error={errors.section}>
                    {text('section')}
                  </Field>
                  {isShs && (
                    <Field label="Strand / track" htmlFor={id('strand')} error={errors.strand}>
                      {text('strand', { list: id('strands'), placeholder: 'e.g. STEM' })}
                      <datalist id={id('strands')}>
                        {STRAND_SUGGESTIONS.map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </Field>
                  )}
                </div>
              ) : (
                <Field label="Department / subject area" htmlFor={id('department')} error={errors.department}>
                  {text('department')}
                </Field>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Last name *" htmlFor={id('lastName')} error={errors.lastName}>
                  {text('lastName', { autoComplete: 'off' })}
                </Field>
                <Field label="First name *" htmlFor={id('firstName')} error={errors.firstName}>
                  {text('firstName', { autoComplete: 'off' })}
                </Field>
                <Field label="Middle name" htmlFor={id('middleName')} error={errors.middleName}>
                  {text('middleName', { autoComplete: 'off' })}
                </Field>
                <Field label="Suffix" htmlFor={id('suffix')} error={errors.suffix} hint="Jr., Sr., III">
                  {text('suffix', { autoComplete: 'off' })}
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Birth date" htmlFor={id('birthDate')} error={errors.birthDate}>
                  {text('birthDate', { type: 'date' })}
                </Field>
                <Field label="Blood type" htmlFor={id('bloodType')} error={errors.bloodType}>
                  {text('bloodType', { list: id('blood'), placeholder: 'e.g. O+' })}
                  <datalist id={id('blood')}>
                    {BLOOD_TYPES.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </Field>
              </div>

              <Field label="Address" htmlFor={id('address')} error={errors.address}>
                {text('address')}
              </Field>

              <fieldset className="grid gap-3 rounded-lg border p-3">
                <legend className="px-1 text-sm font-medium">In case of emergency</legend>
                <Field label="Contact person" htmlFor={id('emergencyName')} error={errors.emergencyName}>
                  {text('emergencyName')}
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Relationship"
                    htmlFor={id('emergencyRelationship')}
                    error={errors.emergencyRelationship}
                  >
                    {text('emergencyRelationship', { placeholder: 'e.g. Mother' })}
                  </Field>
                  <Field label="Contact number" htmlFor={id('emergencyPhone')} error={errors.emergencyPhone}>
                    {text('emergencyPhone', { type: 'tel', inputMode: 'tel' })}
                  </Field>
                </div>
              </fieldset>
            </div>

            <div className="grid content-start gap-3">
              <span className="text-sm font-medium">Photo</span>
              <PersonAvatar
                person={{ ...form, photoId: pendingPhoto === 'remove' ? null : (person?.photoId ?? null) }}
                src={pendingUrl}
                className="size-[180px] rounded-lg text-3xl"
              />
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_IMAGES}
                className="sr-only"
                onChange={(e) => onPickPhoto(e.target.files?.[0])}
                tabIndex={-1}
              />
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                <ImageUpIcon /> {hasPhoto ? 'Change photo' : 'Upload photo'}
              </Button>
              {hasPhoto && (
                <Button type="button" variant="ghost" onClick={() => setPendingPhoto('remove')} disabled={busy}>
                  <TrashIcon /> Remove photo
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                The photo is cropped to a square. You can adjust the crop on the Photos page.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2Icon className="animate-spin" />}
              {person ? 'Save changes' : `Add ${label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
