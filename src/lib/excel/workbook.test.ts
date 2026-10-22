import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { SAMPLE_LEARNER, SAMPLE_TEACHER } from '../sample'
import type { Person } from '../types'
import { LEARNER_COLUMNS } from './columns'
import { parseSheet } from './parse'
import { buildPeopleWorkbook, buildTemplateWorkbook, readSpreadsheet } from './workbook'

function toFile(workbook: XLSX.WorkBook, name: string): File {
  const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
  return new File([bytes], name)
}

const people: Person[] = [
  { ...SAMPLE_LEARNER, lastName: 'Peña', id: 'a', photoId: null, createdAt: 0, updatedAt: 0 },
  { ...SAMPLE_TEACHER, idNumber: '0045123', id: 'b', photoId: null, createdAt: 0, updatedAt: 0 },
]

describe('workbooks', () => {
  it('builds a template with text-formatted ID cells', async () => {
    const wb = await buildTemplateWorkbook()
    expect(wb.SheetNames).toEqual(['Instructions', 'Learners', 'Teachers'])
    const learners = wb.Sheets.Learners
    expect(learners.A1.v).toBe('LRN')
    expect(learners.A2.z).toBe('@')
    expect(learners[XLSX.utils.encode_cell({ r: 0, c: LEARNER_COLUMNS.length - 1 })].v).toBe('Emergency Contact Number')
  })

  it('exports people and reads them back unchanged', async () => {
    const sheets = await readSpreadsheet(toFile(await buildPeopleWorkbook(people), 'export.xlsx'))
    const learners = parseSheet('Learners', sheets.find((s) => s.name === 'Learners')!.rows)
    const teachers = parseSheet('Teachers', sheets.find((s) => s.name === 'Teachers')!.rows)
    expect(learners.rows).toHaveLength(1)
    expect(learners.rows[0].errors).toEqual([])
    expect(learners.rows[0].input).toEqual({ ...SAMPLE_LEARNER, lastName: 'Peña' })
    expect(teachers.rows[0].input).toEqual({ ...SAMPLE_TEACHER, idNumber: '0045123' })
  })

  it('reads Windows-1252 CSV files and keeps leading zeros', async () => {
    const csv = 'Employee No.,Last Name,First Name\r\n0045123,Pe\xf1a,Ana\r\n'
    const bytes = Uint8Array.from(csv, (c) => c.charCodeAt(0))
    const [sheet] = await readSpreadsheet(new File([bytes], 'teachers.csv', { type: 'text/csv' }))
    const parsed = parseSheet('teachers', sheet.rows)
    expect(parsed.rows[0].input).toMatchObject({ idNumber: '0045123', lastName: 'Peña', type: 'teacher' })
  })
})
