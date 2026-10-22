import { useLiveQuery } from 'dexie-react-hooks'
import { useId, useState, type ComponentProps, type ReactNode } from 'react'
import { PageHeader, Field } from '@/components/common/Field'
import { CardPreview } from '@/components/card/IdCard'
import { useCardImages } from '@/components/card/useCardImages'
import { AssetTile } from '@/components/design/AssetTile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAssetUrls } from '@/lib/blob-urls'
import { db, useSettings } from '@/lib/db'
import { comparePeople } from '@/lib/people'
import { SAMPLE_LEARNER, SAMPLE_TEACHER } from '@/lib/sample'
import type { CardDesign, NameFormat, PersonType, Settings } from '@/lib/types'
import { useSettingsDraft } from '@/lib/useSettingsDraft'
import { cn } from '@/lib/utils'

export default function DesignPage() {
  const saved = useSettings()
  if (!saved) return <p className="text-sm text-muted-foreground">Loading…</p>
  return <DesignEditor saved={saved} />
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId()
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-12 cursor-pointer rounded-md border bg-background p-0.5"
        />
        <span className="font-mono text-xs text-muted-foreground uppercase">{value}</span>
      </div>
    </div>
  )
}

function DesignEditor({ saved }: { saved: Settings }) {
  const [s, update] = useSettingsDraft(saved)
  const assets = useAssetUrls()
  const uid = useId()
  const id = (name: string) => `${uid}-${name}`
  const text = (key: keyof Settings, props?: ComponentProps<typeof Input>) => (
    <Input id={id(key)} value={String(s[key] ?? '')} onChange={(e) => update({ [key]: e.target.value })} {...props} />
  )

  return (
    <>
      <PageHeader
        title="Card design"
        description="School details, logos and colors used on every card. Changes are saved automatically."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,500px)]">
        <div className="grid gap-6">
          <Section title="School">
            <Field label="School name" htmlFor={id('schoolName')}>
              {text('schoolName', { placeholder: 'e.g. Sample National High School' })}
            </Field>
            <Field
              label="Header lines"
              htmlFor={id('headerLines')}
              hint="Shown above the school name, one per line (e.g. region and division)."
            >
              <Textarea
                id={id('headerLines')}
                value={s.headerLines}
                onChange={(e) => update({ headerLines: e.target.value })}
                rows={4}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="School ID" htmlFor={id('schoolId')}>
                {text('schoolId', { inputMode: 'numeric' })}
              </Field>
              <Field label="School year" htmlFor={id('schoolYear')} hint="e.g. 2026–2027">
                {text('schoolYear')}
              </Field>
            </div>
            <Field label="School address" htmlFor={id('schoolAddress')}>
              {text('schoolAddress')}
            </Field>
            <Field label="Contact number or email" htmlFor={id('schoolContact')}>
              {text('schoolContact')}
            </Field>
          </Section>

          <Section
            title="Logos and signature"
            description="PNG with a transparent background looks best. Images are kept in this browser only."
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <AssetTile id="logoLeft" label="School logo" hint="Left side of the header." url={assets?.logoLeft} />
              <AssetTile
                id="logoRight"
                label="Second logo"
                hint="Right side (e.g. division or DepEd seal)."
                url={assets?.logoRight}
              />
              <AssetTile
                id="signature"
                label="Principal's signature"
                hint="Sign on white paper and take a photo; the white is removed."
                url={assets?.signature}
              />
            </div>
          </Section>

          <Section title="Look">
            <div className="grid gap-2">
              <Label>Design</Label>
              <RadioGroup
                value={s.design}
                onValueChange={(v) => update({ design: v as CardDesign })}
                className="grid grid-cols-2 gap-3"
              >
                {(['classic', 'modern'] as const).map((d) => (
                  <Label
                    key={d}
                    htmlFor={id(`design-${d}`)}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-lg border p-3 font-normal',
                      s.design === d && 'border-primary ring-1 ring-primary',
                    )}
                  >
                    <RadioGroupItem id={id(`design-${d}`)} value={d} />
                    <span className="grid">
                      <span className="font-medium capitalize">{d}</span>
                      <span className="text-xs text-muted-foreground">
                        {d === 'classic' ? 'Header band, square photo' : 'Slanted block, rounded photo'}
                      </span>
                    </span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <ColorField label="School color" value={s.primaryColor} onChange={(v) => update({ primaryColor: v })} />
              <ColorField label="Learner color" value={s.learnerColor} onChange={(v) => update({ learnerColor: v })} />
              <ColorField label="Teacher color" value={s.teacherColor} onChange={(v) => update({ teacherColor: v })} />
            </div>
            <div className="grid gap-2">
              <Label>Name format</Label>
              <RadioGroup
                value={s.nameFormat}
                onValueChange={(v) => update({ nameFormat: v as NameFormat })}
                className="flex flex-wrap gap-4"
              >
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="first-last" /> JUAN P. DELA CRUZ
                </Label>
                <Label className="flex items-center gap-2 font-normal">
                  <RadioGroupItem value="last-first" /> DELA CRUZ, JUAN P.
                </Label>
              </RadioGroup>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Learner label" htmlFor={id('learnerLabel')} hint="e.g. LEARNER or STUDENT">
                {text('learnerLabel')}
              </Field>
              <Field label="Teacher label" htmlFor={id('teacherLabel')} hint="e.g. TEACHER or FACULTY">
                {text('teacherLabel')}
              </Field>
            </div>
          </Section>

          <Section title="Back of card">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Principal's name" htmlFor={id('principalName')}>
                {text('principalName')}
              </Field>
              <Field label="Principal's title" htmlFor={id('principalTitle')}>
                {text('principalTitle')}
              </Field>
            </div>
            <Field label="Note" htmlFor={id('backNote')} hint="Small text near the bottom of the back.">
              <Textarea
                id={id('backNote')}
                value={s.backNote}
                onChange={(e) => update({ backNote: e.target.value })}
                rows={2}
              />
            </Field>
            <Label className="flex items-center gap-3 font-normal">
              <Switch checked={s.showQr} onCheckedChange={(v) => update({ showQr: v })} />
              Show a QR code with the LRN / employee number
            </Label>
          </Section>
        </div>

        <div className="lg:sticky lg:top-20">
          <PreviewPanel settings={s} />
        </div>
      </div>
    </>
  )
}

function PreviewPanel({ settings }: { settings: Settings }) {
  const [type, setType] = useState<PersonType>('learner')
  const person = useLiveQuery(async () => {
    const people = await db.people.where('type').equals(type).toArray()
    return people.sort(comparePeople)[0] ?? null
  }, [type])
  const sample = type === 'learner' ? SAMPLE_LEARNER : SAMPLE_TEACHER
  const shown = person ?? sample
  const images = useCardImages(person?.photoId)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle>Preview</CardTitle>
        <Tabs value={type} onValueChange={(v) => setType(v as PersonType)}>
          <TabsList>
            <TabsTrigger value="learner">Learner</TabsTrigger>
            <TabsTrigger value="teacher">Teacher</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap justify-center gap-4 rounded-lg bg-muted/60 p-4">
          <figure className="grid justify-items-center gap-2">
            <CardPreview side="front" person={shown} settings={settings} images={images} width={210} />
            <figcaption className="text-xs text-muted-foreground">Front</figcaption>
          </figure>
          <figure className="grid justify-items-center gap-2">
            <CardPreview side="back" person={shown} settings={settings} images={images} width={210} />
            <figcaption className="text-xs text-muted-foreground">Back</figcaption>
          </figure>
        </div>
        <p className="text-xs text-muted-foreground">
          {person ? 'Showing the first saved ' : 'Showing a sample '}
          {type}. Printed size: 54 × 86 mm (standard ID card).
        </p>
      </CardContent>
    </Card>
  )
}
