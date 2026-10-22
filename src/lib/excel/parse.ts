import { idNumberWarning, normalizeIdNumber } from '../ids'
import { cleanSpaces } from '../names'
import { emptyPersonInput, isIsoDate, validatePerson } from '../schemas'
import type { Person, PersonInput, PersonType } from '../types'
import { columnsFor, matchHeader, normalizeHeader, type ColumnKey } from './columns'

export type Cell = string | number | boolean | Date | null | undefined

export interface ImportDefaults {
  gradeLevel?: number | null
  section?: string
}

export interface ParsedRow {
  sheet: string
  /** Row number as shown in Excel (1-based). */
  rowNumber: number
  input: PersonInput
  errors: string[]
  warnings: string[]
}

export interface ParsedSheet {
  sheet: string
  type: PersonType | null
  rows: ParsedRow[]
  /** Headers that were not recognized and will be ignored. */
  ignoredHeaders: string[]
  /** Set when the sheet could not be read as learners or teachers. */
  problem?: string
  /** Grade found in the sheet name or title rows, used for rows without one. */
  inferredGrade?: number
}

const FIELD_LABELS: Partial<Record<keyof PersonInput, string>> = {
  idNumber: 'ID number',
  lastName: 'Last name',
  firstName: 'First name',
  middleName: 'Middle name',
  gradeLevel: 'Grade level',
  birthDate: 'Birth date',
  bloodType: 'Blood type',
  emergencyPhone: 'Contact number',
}

/** Works out whether a sheet holds learners or teachers. */
export function detectType(sheetName: string, headers: Cell[]): PersonType | null {
  const name = sheetName.toLowerCase()
  if (/teacher|faculty|employee|staff|personnel/.test(name)) return 'teacher'
  if (/learner|student|pupil|class|section|grade/.test(name)) return 'learner'
  const learnerHits = headers.filter((h) => matchHeader(h, columnsFor('learner')) === 'idNumber').length
  const teacherHits = headers.filter((h) => matchHeader(h, columnsFor('teacher')) === 'idNumber').length
  if (learnerHits && !teacherHits) return 'learner'
  if (teacherHits && !learnerHits) return 'teacher'
  return null
}

/** Excel stores dates as days since 1899-12-30. */
export function excelSerialToIso(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400 * 1000)
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * Reads the date formats people type in the Philippines: 2010-05-14, 05/14/2010
 * (month first), 14/05/2010 (when the first number can't be a month),
 * "May 14, 2010", "14 May 2010", or an Excel date number.
 */
export function parseDate(value: Cell): string | null {
  if (value == null || value === '') return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (y: number, m: number, d: number) => {
    const s = `${y}-${pad(m)}-${pad(d)}`
    return isIsoDate(s) ? s : null
  }
  if (value instanceof Date) return iso(value.getFullYear(), value.getMonth() + 1, value.getDate())
  if (typeof value === 'number') return value > 0 && value < 80000 ? excelSerialToIso(value) : null
  const text = String(value).trim().toLowerCase()
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text)
  if (m) return iso(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(text)
  if (m) {
    let year = +m[3]
    if (year < 100) year += year > 30 ? 1900 : 2000
    const [a, b] = [+m[1], +m[2]]
    return a > 12 ? iso(year, b, a) : iso(year, a, b)
  }
  m = /^([a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/.exec(text)
  if (m) {
    const month = MONTHS.indexOf(m[1].slice(0, 3)) + 1
    return month ? iso(+m[3], month, +m[2]) : null
  }
  m = /^(\d{1,2})\s+([a-z]+)\.?,?\s+(\d{4})$/.exec(text)
  if (m) {
    const month = MONTHS.indexOf(m[2].slice(0, 3)) + 1
    return month ? iso(+m[3], month, +m[1]) : null
  }
  if (/^\d+(\.\d+)?$/.test(text)) return parseDate(Number(text))
  return null
}

const ROMAN: Record<string, number> = { vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12 }

/** "Grade 7", "G7", "7", "VII" → 7. */
export function parseGrade(value: Cell): number | null | 'invalid' {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isInteger(value) ? value : 'invalid'
  const text = String(value).trim().toLowerCase().replace(/^(grade|gr|g)\.?\s*/, '')
  if (/^\d{1,2}$/.test(text)) return Number(text)
  return ROMAN[text] ?? 'invalid'
}

/**
 * Splits a single name column. Supports DepEd's "Last, First, Middle" and
 * "Last, First, Extension, Middle" orders, and plain "Last, First".
 */
export function splitFullName(value: string): Pick<PersonInput, 'lastName' | 'firstName' | 'middleName' | 'suffix'> {
  const parts = value.split(',').map(cleanSpaces).filter(Boolean)
  const empty = { lastName: '', firstName: '', middleName: '', suffix: '' }
  if (parts.length === 0) return empty
  if (parts.length === 1) {
    const words = parts[0].split(' ')
    return { ...empty, lastName: words.pop() ?? '', firstName: words.join(' ') }
  }
  if (parts.length === 2) return { ...empty, lastName: parts[0], firstName: parts[1] }
  if (parts.length === 3) return { ...empty, lastName: parts[0], firstName: parts[1], middleName: parts[2] }
  return { lastName: parts[0], firstName: parts[1], suffix: parts[2], middleName: parts.slice(3).join(' ') }
}

/** Finds "Grade 9" in a sheet name or title text. */
export function findGrade(texts: string[]): number | undefined {
  for (const t of texts) {
    const m = /\bgrade\s*[-:]?\s*(1[0-2]|[7-9])\b/i.exec(t)
    if (m) return Number(m[1])
  }
  return undefined
}

function text(value: Cell): string {
  if (value == null) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return cleanSpaces(String(value))
}

function isEmptyRow(row: Cell[]): boolean {
  return row.every((c) => c == null || String(c).trim() === '')
}

/** Finds the header row: the first of the top 15 rows with at least two known headers. */
function findHeaderRow(rows: Cell[][], type: PersonType): number {
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const hits = rows[i].filter((c) => matchHeader(c, columnsFor(type))).length
    if (hits >= 2) return i
  }
  return -1
}

export function parseSheet(
  sheet: string,
  rows: Cell[][],
  options: { type?: PersonType | null; defaults?: ImportDefaults } = {},
): ParsedSheet {
  const firstRows = rows.slice(0, 15).flat()
  const type = options.type ?? detectType(sheet, firstRows)
  if (!type) {
    return {
      sheet,
      type: null,
      rows: [],
      ignoredHeaders: [],
      problem: 'Could not tell if this sheet has learners or teachers. Add an "LRN" or "Employee No." column.',
    }
  }
  const headerIndex = findHeaderRow(rows, type)
  if (headerIndex < 0) {
    return { sheet, type, rows: [], ignoredHeaders: [], problem: 'No header row found (e.g. "LRN", "Last Name", "First Name").' }
  }

  const header = rows[headerIndex]
  const titleText = rows.slice(0, headerIndex).flat().map((c) => String(c ?? ''))
  const inferredGrade = type === 'learner' ? findGrade([sheet, ...titleText]) : undefined
  const columnOf = new Map<ColumnKey, number>()
  const ignoredHeaders: string[] = []
  header.forEach((h, i) => {
    const key = matchHeader(h, columnsFor(type))
    if (key && !columnOf.has(key)) columnOf.set(key, i)
    else if (normalizeHeader(h)) ignoredHeaders.push(String(h))
  })
  if (!columnOf.has('idNumber')) {
    return {
      sheet,
      type,
      rows: [],
      ignoredHeaders,
      problem: `Missing the ${type === 'learner' ? '"LRN"' : '"Employee No."'} column.`,
    }
  }

  const parsed: ParsedRow[] = []
  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r]
    if (!row || isEmptyRow(row)) continue
    const get = (key: ColumnKey): Cell => {
      const i = columnOf.get(key)
      return i == null ? undefined : row[i]
    }
    const errors: string[] = []
    const warnings: string[] = []
    const input: PersonInput = emptyPersonInput(type)

    input.idNumber = normalizeIdNumber(get('idNumber'))
    if (columnOf.has('lastName') || columnOf.has('firstName')) {
      input.lastName = text(get('lastName'))
      input.firstName = text(get('firstName'))
      input.middleName = text(get('middleName'))
    } else if (columnOf.has('fullName')) {
      Object.assign(input, splitFullName(text(get('fullName'))))
    }
    input.suffix = text(get('suffix')) || input.suffix
    input.bloodType = text(get('bloodType')).toUpperCase()
    input.address = text(get('address'))
    input.emergencyName = text(get('emergencyName'))
    input.emergencyRelationship = text(get('emergencyRelationship'))
    input.emergencyPhone = text(get('emergencyPhone'))

    const birth = parseDate(get('birthDate'))
    if (birth == null) warnings.push(`Birth date "${text(get('birthDate'))}" not understood; left blank`)
    else input.birthDate = birth

    if (type === 'learner') {
      const grade = parseGrade(get('gradeLevel'))
      if (grade === 'invalid') errors.push(`Grade level "${text(get('gradeLevel'))}" should be 7–12`)
      else input.gradeLevel = grade ?? options.defaults?.gradeLevel ?? inferredGrade ?? null
      input.section = text(get('section')) || options.defaults?.section || ''
      input.strand = text(get('strand'))
      if (input.strand && input.gradeLevel != null && input.gradeLevel < 11) {
        warnings.push('Strand is only used for Grades 11–12')
      }
    } else {
      input.position = text(get('position'))
      input.department = text(get('department'))
    }

    const result = validatePerson(input)
    if (!result.ok) {
      for (const [field, message] of Object.entries(result.errors)) {
        const label = FIELD_LABELS[field as keyof PersonInput] ?? field
        const msg = `${label}: ${message}`
        if (!errors.some((e) => e.startsWith(label))) errors.push(msg)
      }
    }
    const idWarning = idNumberWarning(type, input.idNumber)
    if (idWarning) warnings.push(idWarning)

    parsed.push({
      sheet,
      rowNumber: r + 1,
      input: result.ok ? result.data : input,
      errors,
      warnings,
    })
  }

  return { sheet, type, rows: parsed, ignoredHeaders, inferredGrade }
}

export type PlanStatus = 'new' | 'update' | 'error' | 'duplicate'

export interface PlannedRow extends ParsedRow {
  status: PlanStatus
  existingId?: string
}

/** Decides what happens to each row: add, update an existing person, or skip. */
export function planImport(rows: ParsedRow[], existing: Pick<Person, 'id' | 'type' | 'idNumber'>[]): PlannedRow[] {
  const saved = new Map(existing.map((p) => [`${p.type}:${p.idNumber}`, p.id]))
  const seen = new Map<string, string>()
  return rows.map((row) => {
    if (row.errors.length) return { ...row, status: 'error' as const }
    const key = `${row.input.type}:${row.input.idNumber}`
    const firstRow = seen.get(key)
    if (firstRow != null) {
      return { ...row, status: 'duplicate' as const, errors: [`Same ID number as ${firstRow}`] }
    }
    seen.set(key, `${row.sheet} row ${row.rowNumber}`)
    const existingId = saved.get(key)
    return existingId ? { ...row, status: 'update' as const, existingId } : { ...row, status: 'new' as const }
  })
}
