import type { Person, PersonType } from '../types'
import { columnsFor, type ColumnDef } from './columns'
import type { Cell } from './parse'

// SheetJS is large, so it is loaded only when a spreadsheet is read or written.
const loadXlsx = () => import('xlsx')

export interface SheetRows {
  name: string
  rows: Cell[][]
}

/** CSV files saved by Excel on Windows are often not UTF-8; fall back to Windows-1252. */
function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^﻿/, '')
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

export async function readSpreadsheet(file: File): Promise<SheetRows[]> {
  const XLSX = await loadXlsx()
  const buffer = await file.arrayBuffer()
  const isText = /\.(csv|tsv|txt)$/i.test(file.name) || file.type === 'text/csv'
  // raw: true keeps CSV values as text, so leading zeros in ID numbers survive.
  const workbook = isText
    ? XLSX.read(decodeText(buffer), { type: 'string', raw: true })
    : XLSX.read(buffer, { type: 'array', cellDates: false })
  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json<Cell[]>(workbook.Sheets[name], {
      header: 1,
      raw: true,
      defval: '',
      blankrows: true,
      range: 0, // start at A1 so row numbers match Excel
    }),
  }))
}

const TEXT_ROWS = 1000

type XLSXModule = Awaited<ReturnType<typeof loadXlsx>>

/** A sheet with headers, column widths, and the ID column formatted as text. */
function buildSheet(XLSX: XLSXModule, columns: ColumnDef[], data: string[][]) {
  const sheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...data])
  sheet['!cols'] = columns.map((c) => ({ wch: c.width }))
  // Text format stops Excel from turning 12-digit LRNs into 3.01234E+11.
  const textColumns = columns.flatMap((c, i) => (['idNumber', 'emergencyPhone'].includes(c.key) ? [i] : []))
  const lastRow = Math.max(TEXT_ROWS, data.length)
  for (let r = 1; r <= lastRow; r++) {
    for (const c of textColumns) {
      const ref = XLSX.utils.encode_cell({ r, c })
      const cell = sheet[ref] ?? { t: 's', v: '' }
      cell.t = 's'
      cell.z = '@'
      sheet[ref] = cell
    }
  }
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: columns.length - 1 } })
  return sheet
}

const INSTRUCTIONS = [
  ['School ID Generator — import template'],
  [''],
  ['1. Fill in the "Learners" and "Teachers" sheets. Keep the first row (the headers).'],
  ['2. Required: LRN or Employee No., Last Name, First Name, and Grade Level for learners.'],
  ['3. LRN must have 12 digits. The LRN column is formatted as text so Excel keeps every digit.'],
  ['4. Grade Level: 7 to 12. Strand is used only for Grades 11 and 12 (e.g. STEM, ABM, HUMSS, TVL-ICT).'],
  ['5. Birth Date: use an Excel date, or type it as 2010-05-14 or 05/14/2010 (month/day/year).'],
  ['6. Save the file, then open the Import page and choose it. You can check every row before importing.'],
  [''],
  ['Photos: name each photo file with the LRN or employee number, e.g. 301234250001.jpg,'],
  ['then add them all at once on the Photos page.'],
  [''],
  ['Your data never leaves your computer. The app reads this file inside your browser.'],
]

function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function buildTemplateWorkbook() {
  const XLSX = await loadXlsx()
  const workbook = XLSX.utils.book_new()
  const info = XLSX.utils.aoa_to_sheet(INSTRUCTIONS)
  info['!cols'] = [{ wch: 100 }]
  XLSX.utils.book_append_sheet(workbook, info, 'Instructions')
  XLSX.utils.book_append_sheet(workbook, buildSheet(XLSX, columnsFor('learner'), []), 'Learners')
  XLSX.utils.book_append_sheet(workbook, buildSheet(XLSX, columnsFor('teacher'), []), 'Teachers')
  return workbook
}

export async function downloadTemplate(): Promise<void> {
  const XLSX = await loadXlsx()
  XLSX.writeFile(await buildTemplateWorkbook(), 'school-id-import-template.xlsx')
}

function rowFor(person: Person, columns: ColumnDef[]): string[] {
  return columns.map((c) => {
    if (c.key === 'fullName') return ''
    const value = person[c.key]
    return value == null ? '' : String(value)
  })
}

/** Saves everyone to an Excel file in the same layout as the template, for editing and re-importing. */
export async function buildPeopleWorkbook(people: Person[]) {
  const XLSX = await loadXlsx()
  const workbook = XLSX.utils.book_new()
  for (const type of ['learner', 'teacher'] as PersonType[]) {
    const columns = columnsFor(type)
    const data = people.filter((p) => p.type === type).map((p) => rowFor(p, columns))
    XLSX.utils.book_append_sheet(workbook, buildSheet(XLSX, columns, data), type === 'learner' ? 'Learners' : 'Teachers')
  }
  return workbook
}

export async function exportPeople(people: Person[]): Promise<void> {
  const XLSX = await loadXlsx()
  XLSX.writeFile(await buildPeopleWorkbook(people), `school-id-people-${today()}.xlsx`)
}
