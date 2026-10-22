import { useLiveQuery } from 'dexie-react-hooks'
import {
  CircleAlertIcon,
  DownloadIcon,
  FileSpreadsheetIcon,
  FileUpIcon,
  Loader2Icon,
  TriangleAlertIcon,
  UploadIcon,
} from 'lucide-react'
import { useMemo, useRef, useState, type DragEvent } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/Field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { db } from '@/lib/db'
import { parseSheet, planImport, type ImportDefaults, type PlannedRow, type PlanStatus } from '@/lib/excel/parse'
import { downloadTemplate, exportPeople, readSpreadsheet, type SheetRows } from '@/lib/excel/workbook'
import { sortableName } from '@/lib/names'
import { applyImport } from '@/lib/people'
import { gradeLabel, GRADE_LEVELS } from '@/lib/schemas'
import type { PersonType } from '@/lib/types'
import { cn } from '@/lib/utils'

type SheetChoice = PersonType | 'skip' | 'auto'
type Filter = 'all' | 'ok' | 'problems'

const SHOW_ROWS = 300
const NONE = 'none'

const STATUS: Record<PlanStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  update: { label: 'Update', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  error: { label: 'Fix needed', className: 'bg-red-50 text-red-700 border-red-200' },
  duplicate: { label: 'Duplicate', className: 'bg-amber-50 text-amber-800 border-amber-200' },
}

export default function ImportPage() {
  const existing = useLiveQuery(() => db.people.toArray(), [])
  const [fileName, setFileName] = useState<string | null>(null)
  const [sheets, setSheets] = useState<SheetRows[] | null>(null)
  const [choices, setChoices] = useState<Record<string, SheetChoice>>({})
  const [defaults, setDefaults] = useState<ImportDefaults>({})
  const [updateExisting, setUpdateExisting] = useState(true)
  const [filter, setFilter] = useState<Filter>('all')
  const [reading, setReading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ added: number; updated: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  async function onFile(file: File | undefined) {
    if (!file) return
    setReading(true)
    setResult(null)
    try {
      const read = await readSpreadsheet(file)
      setSheets(read)
      setFileName(file.name)
      setChoices(Object.fromEntries(read.map((s) => [s.name, /instruction|readme|guide/i.test(s.name) ? 'skip' : 'auto'])))
      setFilter('all')
    } catch (err) {
      console.error(err)
      toast.error('Could not read that file. Use an Excel (.xlsx) or CSV file.')
    } finally {
      setReading(false)
      if (input.current) input.current.value = ''
    }
  }

  const parsed = useMemo(() => {
    if (!sheets) return []
    return sheets
      .flatMap((s) => {
        const choice = choices[s.name] ?? 'auto'
        if (choice === 'skip') return []
        return [parseSheet(s.name, s.rows, { type: choice === 'auto' ? null : choice, defaults })]
      })
  }, [sheets, choices, defaults])

  const plan: PlannedRow[] = useMemo(
    () => (existing ? planImport(parsed.flatMap((s) => s.rows), existing) : []),
    [parsed, existing],
  )

  const counts = useMemo(() => {
    const c = { new: 0, update: 0, error: 0, duplicate: 0, warnings: 0 }
    plan.forEach((r) => {
      c[r.status]++
      if (r.warnings.length) c.warnings++
    })
    return c
  }, [plan])

  const hasLearners = parsed.some((s) => s.type === 'learner' && s.rows.length > 0)
  const toImport = counts.new + (updateExisting ? counts.update : 0)
  const shown = plan.filter((r) =>
    filter === 'all' ? true : filter === 'ok' ? r.status === 'new' || r.status === 'update' : r.status === 'error' || r.status === 'duplicate' || r.warnings.length > 0,
  )

  async function onImport() {
    setImporting(true)
    try {
      const res = await applyImport(plan, updateExisting)
      setResult(res)
      setSheets(null)
      setFileName(null)
      toast.success(`Imported: ${res.added} added, ${res.updated} updated`)
    } catch (err) {
      console.error(err)
      toast.error('Import failed. Nothing was changed.')
    } finally {
      setImporting(false)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    void onFile(e.dataTransfer.files[0])
  }

  return (
    <>
      <PageHeader
        title="Import from Excel"
        description="Bring in learners and teachers from an Excel or CSV file. The file is read inside your browser and never uploaded."
        actions={
          <Button variant="outline" onClick={() => existing && exportPeople(existing)} disabled={!existing?.length}>
            <DownloadIcon /> Export everyone to Excel
          </Button>
        }
      />

      <div className="grid gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>1. Get the template</CardTitle>
              <CardDescription>
                It has a sheet for learners and one for teachers, with the LRN column already set to
                keep all 12 digits. You can also use your own file — common headers such as "LRN",
                "Last Name" and "Birth Date" are recognized.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => void downloadTemplate()}>
                <FileSpreadsheetIcon /> Download template (.xlsx)
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Choose your file</CardTitle>
              <CardDescription>Excel (.xlsx, .xls) or CSV. You can check every row before anything is saved.</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'flex flex-wrap items-center gap-3 rounded-lg border-2 border-dashed p-4',
                  dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
                )}
              >
                <Button onClick={() => input.current?.click()} disabled={reading}>
                  {reading ? <Loader2Icon className="animate-spin" /> : <FileUpIcon />} Choose file
                </Button>
                <span className="text-sm text-muted-foreground">{fileName ?? 'or drop it here'}</span>
                <input
                  ref={input}
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => void onFile(e.target.files?.[0])}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {result && (
          <Alert>
            <AlertTitle>Import finished</AlertTitle>
            <AlertDescription>
              <p>
                {result.added} added and {result.updated} updated.{' '}
                <Link to="/" className="font-medium underline underline-offset-2">
                  See everyone
                </Link>{' '}
                or{' '}
                <Link to="/photos" className="font-medium underline underline-offset-2">
                  add photos
                </Link>
                .
              </p>
            </AlertDescription>
          </Alert>
        )}

        {sheets && (
          <Card>
            <CardHeader>
              <CardTitle>3. Check and import</CardTitle>
              <CardDescription>{fileName}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <Label>Sheets</Label>
                <ul className="grid gap-2">
                  {sheets.map((s) => {
                    const p = parsed.find((x) => x.sheet === s.name)
                    return (
                      <li key={s.name} className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                        <span className="min-w-32 font-medium">{s.name}</span>
                        <Select
                          value={choices[s.name] ?? 'auto'}
                          onValueChange={(v) => setChoices((c) => ({ ...c, [s.name]: v as SheetChoice }))}
                        >
                          <SelectTrigger className="w-44" size="sm" aria-label={`What sheet ${s.name} contains`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Detect automatically</SelectItem>
                            <SelectItem value="learner">Learners</SelectItem>
                            <SelectItem value="teacher">Teachers</SelectItem>
                            <SelectItem value="skip">Skip this sheet</SelectItem>
                          </SelectContent>
                        </Select>
                        {choices[s.name] === 'skip' ? (
                          <span className="text-muted-foreground">Skipped</span>
                        ) : p?.problem ? (
                          <span className="flex items-center gap-1 text-amber-700">
                            <TriangleAlertIcon className="size-4" /> {p.problem}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            {p?.rows.length ?? 0} {p?.type === 'teacher' ? 'teacher' : 'learner'}
                            {p?.rows.length === 1 ? '' : 's'}
                            {p?.inferredGrade ? ` · Grade ${p.inferredGrade} taken from the title` : ''}
                            {p?.ignoredHeaders.length ? ` · ignoring columns: ${p.ignoredHeaders.join(', ')}` : ''}
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>

              {hasLearners && (
                <div className="grid gap-2 rounded-lg bg-muted/50 p-3">
                  <Label>For learners with no grade or section in the file</Label>
                  <p className="text-xs text-muted-foreground">
                    Handy for a class list where the grade and section are only in the title.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Select
                      value={defaults.gradeLevel ? String(defaults.gradeLevel) : NONE}
                      onValueChange={(v) => setDefaults((d) => ({ ...d, gradeLevel: v === NONE ? null : Number(v) }))}
                    >
                      <SelectTrigger className="w-40" aria-label="Default grade level">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No default grade</SelectItem>
                        {GRADE_LEVELS.map((g) => (
                          <SelectItem key={g} value={String(g)}>
                            Grade {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="w-48"
                      placeholder="Default section"
                      value={defaults.section ?? ''}
                      onChange={(e) => setDefaults((d) => ({ ...d, section: e.target.value }))}
                      aria-label="Default section"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline" className={STATUS.new.className}>{counts.new} new</Badge>
                <Badge variant="outline" className={STATUS.update.className}>{counts.update} already saved</Badge>
                {counts.error + counts.duplicate > 0 && (
                  <Badge variant="outline" className={STATUS.error.className}>
                    {counts.error + counts.duplicate} will be skipped
                  </Badge>
                )}
                {counts.warnings > 0 && (
                  <Badge variant="outline" className={STATUS.duplicate.className}>{counts.warnings} with warnings</Badge>
                )}
              </div>

              {counts.update > 0 && (
                <Label className="flex items-center gap-3 font-normal">
                  <Switch checked={updateExisting} onCheckedChange={setUpdateExisting} />
                  Update the {counts.update} people who are already saved (empty cells and photos are kept)
                </Label>
              )}

              {plan.length > 0 && (
                <>
                  <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                    <TabsList>
                      <TabsTrigger value="all">All rows ({plan.length})</TabsTrigger>
                      <TabsTrigger value="ok">Ready ({counts.new + counts.update})</TabsTrigger>
                      <TabsTrigger value="problems">Needs attention ({plan.filter((r) => r.errors.length || r.warnings.length).length})</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="max-h-[32rem] overflow-auto rounded-lg border">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-background">
                        <TableRow>
                          <TableHead className="w-28">Row</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>ID number</TableHead>
                          <TableHead className="hidden md:table-cell">Grade / position</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shown.slice(0, SHOW_ROWS).map((r) => (
                          <TableRow key={`${r.sheet}:${r.rowNumber}`}>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.sheet} #{r.rowNumber}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{sortableName(r.input) || '—'}</div>
                              {[...r.errors].map((e) => (
                                <div key={e} className="flex items-start gap-1 text-xs text-destructive">
                                  <CircleAlertIcon className="mt-0.5 size-3 shrink-0" /> {e}
                                </div>
                              ))}
                              {r.warnings.map((w) => (
                                <div key={w} className="flex items-start gap-1 text-xs text-amber-700">
                                  <TriangleAlertIcon className="mt-0.5 size-3 shrink-0" /> {w}
                                </div>
                              ))}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{r.input.idNumber || '—'}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              {r.input.type === 'learner' ? gradeLabel(r.input) : r.input.position}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS[r.status].className}>
                                {r.status === 'update' && !updateExisting ? 'Skip' : STATUS[r.status].label}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {shown.length > SHOW_ROWS && (
                    <p className="text-xs text-muted-foreground">
                      Showing the first {SHOW_ROWS} of {shown.length} rows. All rows will be imported.
                    </p>
                  )}
                </>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSheets(null)
                    setFileName(null)
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={onImport} disabled={toImport === 0 || importing}>
                  {importing ? <Loader2Icon className="animate-spin" /> : <UploadIcon />}
                  Import {toImport} {toImport === 1 ? 'person' : 'people'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
