import { useLiveQuery } from 'dexie-react-hooks'
import {
  DownloadIcon,
  ExternalLinkIcon,
  FileTextIcon,
  PrinterIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { Field, PageHeader } from '@/components/common/Field'
import { SheetDiagram } from '@/components/print/SheetDiagram'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { db, useSettings } from '@/lib/db'
import { sortableName } from '@/lib/names'
import { comparePeople } from '@/lib/people'
import { computeLayout, PAPER_SIZES } from '@/lib/print/layout'
import { generatePdfs, type PdfFile, type PdfProgress } from '@/lib/print/pdf'
import { GRADE_LEVELS } from '@/lib/schemas'
import { useSelection } from '@/lib/selection'
import type { PageOrder, PaperSizeId, Person, Settings } from '@/lib/types'
import { useSettingsDraft } from '@/lib/useSettingsDraft'

type Source = 'selection' | 'all' | 'learners' | 'teachers' | 'class'
const ANY = 'any'

export default function PrintPage() {
  const saved = useSettings()
  const people = useLiveQuery(async () => (await db.people.toArray()).sort(comparePeople), [])
  if (!saved || !people) return <p className="text-sm text-muted-foreground">Loading…</p>
  return <PrintEditor saved={saved} people={people} />
}

interface FileLink extends PdfFile {
  url: string
}

function PrintEditor({ saved, people }: { saved: Settings; people: Person[] }) {
  const [settings, update] = useSettingsDraft(saved)
  const [params] = useSearchParams()
  const selected = useSelection()
  const [source, setSource] = useState<Source>(() =>
    params.get('from') === 'selection' && selected.size > 0 ? 'selection' : 'all',
  )
  const [grade, setGrade] = useState(ANY)
  const [section, setSection] = useState(ANY)
  const [progress, setProgress] = useState<PdfProgress | null>(null)
  const [eta, setEta] = useState<string | null>(null)
  const [files, setFiles] = useState<FileLink[]>([])
  const controller = useRef<AbortController | null>(null)
  const uid = useId()

  // Free the PDF memory when leaving the page.
  const filesRef = useRef(files)
  useEffect(() => {
    filesRef.current = files
  }, [files])
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), [])

  const sections = useMemo(() => {
    const set = new Set<string>()
    people.forEach((p) => {
      if (p.type === 'learner' && p.section && (grade === ANY || String(p.gradeLevel) === grade)) set.add(p.section)
    })
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [people, grade])

  const chosen = useMemo(() => {
    switch (source) {
      case 'selection':
        return people.filter((p) => selected.has(p.id))
      case 'learners':
        return people.filter((p) => p.type === 'learner')
      case 'teachers':
        return people.filter((p) => p.type === 'teacher')
      case 'class':
        return people.filter(
          (p) =>
            p.type === 'learner' &&
            (grade === ANY || String(p.gradeLevel) === grade) &&
            (section === ANY || p.section === section),
        )
      default:
        return people
    }
  }, [source, people, selected, grade, section])

  const label =
    source === 'class'
      ? [grade !== ANY && `grade ${grade}`, section !== ANY && section].filter(Boolean).join(' ') || 'learners'
      : { selection: 'selected', all: 'everyone', learners: 'learners', teachers: 'teachers' }[source]

  const paper = PAPER_SIZES[settings.paper] ?? PAPER_SIZES.a4
  const layout = computeLayout(paper)
  const sheets = Math.ceil(chosen.length / layout.perPage)
  const pages = sheets * (settings.includeBacks ? 2 : 1)
  const noPhoto = chosen.filter((p) => !p.photoId)
  const badLrn = chosen.filter((p) => p.type === 'learner' && !/^\d{12}$/.test(p.idNumber))
  const busy = progress != null

  async function generate() {
    const abort = new AbortController()
    controller.current = abort
    files.forEach((f) => URL.revokeObjectURL(f.url))
    setFiles([])
    const startedAt = Date.now()
    setEta(null)
    setProgress({ done: 0, total: chosen.length * (settings.includeBacks ? 2 : 1), part: 1, parts: 1 })
    try {
      const result = await generatePdfs({
        people: chosen,
        settings,
        label,
        signal: abort.signal,
        onProgress: (p) => {
          setProgress(p)
          setEta(timeLeft(p, startedAt))
        },
      })
      const links = result.map((f) => ({ ...f, url: URL.createObjectURL(f.blob) }))
      setFiles(links)
      if (links.length === 1) downloadFile(links[0])
      toast.success(links.length === 1 ? 'PDF ready' : `${links.length} PDF files ready`)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') toast.info('Cancelled')
      else {
        console.error(err)
        toast.error('Could not make the PDF. Try again, or try fewer cards at a time.')
      }
    } finally {
      setProgress(null)
      controller.current = null
    }
  }


  const id = (n: string) => `${uid}-${n}`

  return (
    <>
      <PageHeader title="Print" description="Make a PDF of ID cards, ready to print and cut." />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Who to print</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <RadioGroup value={source} onValueChange={(v) => setSource(v as Source)} className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    ['selection', `Selected on the People page (${selected.size})`, selected.size === 0],
                    ['all', `Everyone (${people.length})`, false],
                    ['learners', `All learners (${people.filter((p) => p.type === 'learner').length})`, false],
                    ['teachers', `All teachers (${people.filter((p) => p.type === 'teacher').length})`, false],
                    ['class', 'A grade or section', false],
                  ] as const
                ).map(([value, text, disabled]) => (
                  <Label key={value} className="flex items-center gap-2 font-normal data-[disabled=true]:opacity-50" data-disabled={disabled}>
                    <RadioGroupItem value={value} disabled={disabled} /> {text}
                  </Label>
                ))}
              </RadioGroup>
              {source === 'class' && (
                <div className="flex flex-wrap gap-3">
                  <Select
                    value={grade}
                    onValueChange={(v) => {
                      setGrade(v)
                      setSection(ANY)
                    }}
                  >
                    <SelectTrigger className="w-40" aria-label="Grade level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>All grades</SelectItem>
                      {GRADE_LEVELS.map((g) => (
                        <SelectItem key={g} value={String(g)}>
                          Grade {g}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={section} onValueChange={setSection}>
                    <SelectTrigger className="w-44" aria-label="Section">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ANY}>All sections</SelectItem>
                      {sections.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {source === 'selection' && selected.size === 0 && (
                <p className="text-sm text-muted-foreground">
                  Tick people on the <Link to="/" className="underline">People page</Link> first.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paper and printing</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Paper size">
                  <Select value={settings.paper} onValueChange={(v) => update({ paper: v as PaperSizeId })}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAPER_SIZES).map(([key, p]) => (
                        <SelectItem key={key} value={key}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid content-start gap-3 pt-6">
                  <Label className="flex items-center gap-3 font-normal">
                    <Switch checked={settings.includeBacks} onCheckedChange={(v) => update({ includeBacks: v })} />
                    Print the back of the cards
                  </Label>
                  <Label className="flex items-center gap-3 font-normal">
                    <Switch checked={settings.cutMarks} onCheckedChange={(v) => update({ cutMarks: v })} />
                    Cut marks
                  </Label>
                </div>
              </div>

              {settings.includeBacks && (
                <>
                  <div className="grid gap-2">
                    <Label>Page order</Label>
                    <RadioGroup
                      value={settings.pageOrder}
                      onValueChange={(v) => update({ pageOrder: v as PageOrder })}
                      className="grid gap-2"
                    >
                      <Label className="flex items-start gap-2 font-normal">
                        <RadioGroupItem value="interleaved" className="mt-0.5" />
                        <span>
                          Front, back, front, back…
                          <span className="block text-xs text-muted-foreground">
                            For printers that print both sides. Choose "flip on long edge".
                          </span>
                        </span>
                      </Label>
                      <Label className="flex items-start gap-2 font-normal">
                        <RadioGroupItem value="fronts-then-backs" className="mt-0.5" />
                        <span>
                          All fronts, then all backs
                          <span className="block text-xs text-muted-foreground">
                            Print the fronts, put the printed stack back in the tray, then print the backs.
                          </span>
                        </span>
                      </Label>
                    </RadioGroup>
                  </div>
                  <div className="grid gap-2">
                    <Label>Back side adjustment</Label>
                    <p className="text-xs text-muted-foreground">
                      If the backs come out shifted, move them here (in millimetres). Positive values move
                      right and down.
                    </p>
                    <div className="flex flex-wrap gap-3">
                      <Field label="Left/right (mm)" htmlFor={id('ox')} className="w-36">
                        <Input
                          id={id('ox')}
                          type="number"
                          step={0.5}
                          min={-10}
                          max={10}
                          value={settings.backOffsetX}
                          onChange={(e) => update({ backOffsetX: clampOffset(e.target.valueAsNumber) })}
                        />
                      </Field>
                      <Field label="Up/down (mm)" htmlFor={id('oy')} className="w-36">
                        <Input
                          id={id('oy')}
                          type="number"
                          step={0.5}
                          min={-10}
                          max={10}
                          value={settings.backOffsetY}
                          onChange={(e) => update({ backOffsetY: clampOffset(e.target.valueAsNumber) })}
                        />
                      </Field>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

        </div>

        <div className="grid gap-4 lg:sticky lg:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>
                {chosen.length} {chosen.length === 1 ? 'card' : 'cards'} · {layout.perPage} per sheet ·{' '}
                {sheets} {sheets === 1 ? 'sheet' : 'sheets'} ({pages} {pages === 1 ? 'page' : 'pages'})
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <SheetDiagram paper={paper} includeBacks={settings.includeBacks} />

              {(noPhoto.length > 0 || badLrn.length > 0 || !settings.schoolName) && (
                <Alert>
                  <TriangleAlertIcon />
                  <AlertTitle>Check before printing</AlertTitle>
                  <AlertDescription>
                    <ul className="grid gap-1">
                      {!settings.schoolName && (
                        <li>
                          The school name is not set. <Link to="/design" className="underline">Open Design</Link>
                        </li>
                      )}
                      {noPhoto.length > 0 && (
                        <li>
                          {noPhoto.length} without a photo ({noPhoto.slice(0, 3).map(sortableName).join('; ')}
                          {noPhoto.length > 3 ? '…' : ''}). <Link to="/photos" className="underline">Add photos</Link>
                        </li>
                      )}
                      {badLrn.length > 0 && <li>{badLrn.length} with an LRN that is not 12 digits.</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {busy ? (
                <div className="grid gap-2">
                  <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      Drawing card {Math.min(progress.done + 1, progress.total)} of {progress.total}
                      {progress.parts > 1 && ` (file ${progress.part} of ${progress.parts})`}
                      {eta && ` · ${eta}`}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => controller.current?.abort()}>
                      <XIcon /> Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="lg" onClick={generate} disabled={chosen.length === 0}>
                  <PrinterIcon /> Make PDF
                </Button>
              )}

              {files.length > 0 && (
                <ul className="grid gap-2">
                  {files.map((f) => (
                    <li key={f.url} className="flex flex-wrap items-center gap-2 rounded-lg border p-2 text-sm">
                      <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate" title={f.name}>
                        {f.name}
                        <span className="block text-xs text-muted-foreground">
                          {f.cards} cards · {f.pages} pages · {(f.blob.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </span>
                      <Button size="sm" variant="outline" asChild>
                        <a href={f.url} target="_blank" rel="noreferrer">
                          <ExternalLinkIcon /> Open
                        </a>
                      </Button>
                      <Button size="sm" onClick={() => downloadFile(f)}>
                        <DownloadIcon /> Download
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Printing tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid list-disc gap-1.5 pl-5 text-sm text-muted-foreground">
                <li>
                  In the print dialog choose <strong className="text-foreground">Actual size</strong> (or Scale
                  100%), not "Fit to page".
                </li>
                <li>Measure the 50 mm line at the bottom of the first page. If it's not 50 mm, the printer scaled the page.</li>
                <li>
                  For two-sided printing choose <strong className="text-foreground">Flip on long edge</strong>.
                </li>
                <li>Print one test sheet first and hold it up to a light to check the backs line up.</li>
                <li>Thick paper (200–250 gsm) or ID card sheets work best; laminate or use ID jackets.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

function timeLeft(progress: PdfProgress, startedAt: number): string | null {
  if (progress.done < 3) return null
  const perCard = (Date.now() - startedAt) / progress.done
  const seconds = Math.round(((progress.total - progress.done) * perCard) / 1000)
  return seconds < 60 ? `about ${Math.max(seconds, 1)} s left` : `about ${Math.round(seconds / 60)} min left`
}

function clampOffset(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(-10, Math.min(10, Math.round(value * 10) / 10))
}

function downloadFile(file: FileLink) {
  const a = document.createElement('a')
  a.href = file.url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
}
