import { useLiveQuery } from 'dexie-react-hooks'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  FileSpreadsheetIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
  SearchIcon,
  SparklesIcon,
  TrashIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/Field'
import { PersonAvatar } from '@/components/people/PersonAvatar'
import { PersonDialog } from '@/components/people/PersonDialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { db, deletePeople } from '@/lib/db'
import { loadDemoData } from '@/lib/demo'
import { idLabel } from '@/lib/ids'
import { sortableName } from '@/lib/names'
import { comparePeople, matchesSearch, personIssues } from '@/lib/people'
import { gradeLabel, GRADE_LEVELS } from '@/lib/schemas'
import { selection, useSelection } from '@/lib/selection'
import type { Person, PersonType } from '@/lib/types'

const PAGE_SIZE = 50
const ALL = 'all'

export default function PeoplePage() {
  const navigate = useNavigate()
  const people = useLiveQuery(() => db.people.toArray(), [])
  const selected = useSelection()
  const [tab, setTab] = useState<PersonType>('learner')
  const [search, setSearch] = useState('')
  const [grade, setGrade] = useState(ALL)
  const [section, setSection] = useState(ALL)
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<{ type: PersonType; person?: Person } | null>(null)
  const [toDelete, setToDelete] = useState<string[] | null>(null)
  const [loadingDemo, setLoadingDemo] = useState(false)

  const counts = useMemo(() => {
    const c = { learner: 0, teacher: 0 }
    people?.forEach((p) => c[p.type]++)
    return c
  }, [people])

  const sections = useMemo(() => {
    const set = new Set<string>()
    people?.forEach((p) => {
      if (p.type === 'learner' && p.section && (grade === ALL || String(p.gradeLevel) === grade)) set.add(p.section)
    })
    return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [people, grade])

  const filtered = useMemo(() => {
    if (!people) return []
    return people
      .filter(
        (p) =>
          p.type === tab &&
          (tab === 'teacher' || grade === ALL || String(p.gradeLevel) === grade) &&
          (tab === 'teacher' || section === ALL || p.section === section) &&
          matchesSearch(p, search),
      )
      .sort(comparePeople)
  }, [people, tab, grade, section, search])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const filteredIds = filtered.map((p) => p.id)
  const selectedHere = filteredIds.filter((id) => selected.has(id)).length
  const allChecked = filtered.length > 0 && selectedHere === filtered.length

  function resetPaging<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setPage(0)
    }
  }

  async function onLoadDemo() {
    setLoadingDemo(true)
    try {
      const added = await loadDemoData()
      toast.success(added ? `Added ${added} sample people` : 'Sample people are already loaded')
    } catch (err) {
      console.error(err)
      toast.error('Could not load the sample data')
    } finally {
      setLoadingDemo(false)
    }
  }

  async function onConfirmDelete() {
    if (!toDelete) return
    await deletePeople(toDelete)
    selection.setMany(toDelete, false)
    toast.success(toDelete.length === 1 ? 'Deleted' : `Deleted ${toDelete.length} people`)
    setToDelete(null)
  }

  if (!people) return <p className="text-sm text-muted-foreground">Loading…</p>

  const isEmpty = people.length === 0

  return (
    <>
      <PageHeader
        title="People"
        description="Learners and teachers who will get an ID card."
        actions={
          !isEmpty && (
            <>
              <Button variant="outline" asChild>
                <Link to="/import">
                  <FileSpreadsheetIcon /> Import
                </Link>
              </Button>
              <Button onClick={() => setEditing({ type: tab })}>
                <PlusIcon /> Add {tab}
              </Button>
            </>
          )
        }
      />

      {isEmpty ? (
        <Card>
          <CardContent className="grid justify-items-center gap-4 py-12 text-center">
            <div className="grid max-w-md gap-1">
              <h2 className="text-lg font-semibold">No learners or teachers yet</h2>
              <p className="text-sm text-muted-foreground">
                Import a class list from Excel, add people one at a time, or load sample data to see
                how the cards look.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/import">
                  <FileSpreadsheetIcon /> Import from Excel
                </Link>
              </Button>
              <Button variant="outline" onClick={() => setEditing({ type: 'learner' })}>
                <PlusIcon /> Add learner
              </Button>
              <Button variant="outline" onClick={() => setEditing({ type: 'teacher' })}>
                <PlusIcon /> Add teacher
              </Button>
              <Button variant="ghost" onClick={onLoadDemo} disabled={loadingDemo}>
                {loadingDemo ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />} Load sample data
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v as PersonType)
                setPage(0)
              }}
            >
              <TabsList>
                <TabsTrigger value="learner">Learners ({counts.learner})</TabsTrigger>
                <TabsTrigger value="teacher">Teachers ({counts.teacher})</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative min-w-48 flex-1 sm:max-w-xs">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => resetPaging(setSearch)(e.target.value)}
                placeholder={`Search name or ${idLabel(tab)}`}
                className="pl-8"
                aria-label="Search"
              />
            </div>
            {tab === 'learner' && (
              <>
                <Select
                  value={grade}
                  onValueChange={(v) => {
                    setGrade(v)
                    setSection(ALL)
                    setPage(0)
                  }}
                >
                  <SelectTrigger className="w-36" aria-label="Grade level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All grades</SelectItem>
                    {GRADE_LEVELS.map((g) => (
                      <SelectItem key={g} value={String(g)}>
                        Grade {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={section} onValueChange={resetPaging(setSection)}>
                  <SelectTrigger className="w-40" aria-label="Section">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All sections</SelectItem>
                    {sections.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
              <span className="font-medium">{selected.size} selected</span>
              <Button size="sm" onClick={() => navigate('/print?from=selection')}>
                <PrinterIcon /> Print selected
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setToDelete([...selected])}>
                <TrashIcon /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => selection.clear()}>
                <XIcon /> Clear selection
              </Button>
            </div>
          )}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allChecked ? true : selectedHere > 0 ? 'indeterminate' : false}
                      onCheckedChange={(v) => selection.setMany(filteredIds, v === true)}
                      aria-label="Select all shown"
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>{idLabel(tab)}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {tab === 'learner' ? 'Grade & section' : 'Position'}
                  </TableHead>
                  <TableHead className="w-12">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No {tab === 'learner' ? 'learners' : 'teachers'} match.
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((p) => (
                    <PersonRow
                      key={p.id}
                      person={p}
                      checked={selected.has(p.id)}
                      onEdit={() => setEditing({ type: p.type, person: p })}
                      onDelete={() => setToDelete([p.id])}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
            <span>
              {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
              {selectedHere > 0 && ` · ${selectedHere} selected`}
            </span>
            {pageCount > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => setPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                >
                  <ChevronLeftIcon />
                </Button>
                <span>
                  Page {currentPage + 1} of {pageCount}
                </span>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={() => setPage(currentPage + 1)}
                  disabled={currentPage >= pageCount - 1}
                  aria-label="Next page"
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <PersonDialog
        open={editing != null}
        onOpenChange={(open) => !open && setEditing(null)}
        type={editing?.type ?? tab}
        person={editing?.person}
      />

      <AlertDialog open={toDelete != null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {toDelete?.length === 1 ? 'this person' : `${toDelete?.length} people`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their details and photos will be removed from this browser. This can't be undone
              unless you have a backup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function PersonRow({
  person: p,
  checked,
  onEdit,
  onDelete,
}: {
  person: Person
  checked: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const issues = personIssues(p)
  return (
    <TableRow data-state={checked ? 'selected' : undefined}>
      <TableCell>
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => selection.toggle(p.id, v === true)}
          aria-label={`Select ${sortableName(p)}`}
        />
      </TableCell>
      <TableCell>
        <button type="button" onClick={onEdit} className="flex items-center gap-3 text-left">
          <PersonAvatar person={p} />
          <span className="grid">
            <span className="font-medium">{sortableName(p)}</span>
            <span className="text-xs text-muted-foreground md:hidden">
              {p.type === 'learner' ? gradeLabel(p) : p.position}
            </span>
          </span>
          {issues.length > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700">
                  <TriangleAlertIcon className="size-3" />
                  {issues.length}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{issues.join(' · ')}</TooltipContent>
            </Tooltip>
          )}
        </button>
      </TableCell>
      <TableCell className="font-mono text-xs">{p.idNumber}</TableCell>
      <TableCell className="hidden md:table-cell">
        {p.type === 'learner' ? gradeLabel(p) : [p.position, p.department].filter(Boolean).join(' · ')}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-sm" variant="ghost" aria-label={`Actions for ${sortableName(p)}`}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEdit}>
              <PencilIcon /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={onDelete}>
              <TrashIcon /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
