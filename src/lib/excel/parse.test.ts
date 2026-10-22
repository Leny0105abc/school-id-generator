import { describe, expect, it } from 'vitest'
import { matchHeader, LEARNER_COLUMNS } from './columns'
import { detectType, excelSerialToIso, parseDate, parseGrade, parseSheet, planImport, splitFullName } from './parse'

describe('headers', () => {
  it('matches common header spellings', () => {
    expect(matchHeader('LRN', LEARNER_COLUMNS)).toBe('idNumber')
    expect(matchHeader('Learner Reference Number', LEARNER_COLUMNS)).toBe('idNumber')
    expect(matchHeader(' Last  Name: ', LEARNER_COLUMNS)).toBe('lastName')
    expect(matchHeader('Birth Date (mm/dd/yyyy)', LEARNER_COLUMNS)).toBe('birthDate')
    expect(matchHeader('Contact No.', LEARNER_COLUMNS)).toBe('emergencyPhone')
    expect(matchHeader("LEARNER'S NAME (Last Name, First Name, Middle Name)", LEARNER_COLUMNS)).toBe('fullName')
    expect(matchHeader('Sex', LEARNER_COLUMNS)).toBeNull()
  })

  it('detects learners and teachers', () => {
    expect(detectType('Teachers', [])).toBe('teacher')
    expect(detectType('Grade 7 - Sampaguita', [])).toBe('learner')
    expect(detectType('Sheet1', ['LRN', 'Last Name'])).toBe('learner')
    expect(detectType('Sheet1', ['Employee No.', 'Last Name'])).toBe('teacher')
    expect(detectType('Sheet1', ['Last Name'])).toBeNull()
  })
})

describe('values', () => {
  it('parses dates', () => {
    expect(excelSerialToIso(40312)).toBe('2010-05-14')
    expect(parseDate(40312)).toBe('2010-05-14')
    expect(parseDate('2010-05-14')).toBe('2010-05-14')
    expect(parseDate('05/14/2010')).toBe('2010-05-14')
    expect(parseDate('14/05/2010')).toBe('2010-05-14')
    expect(parseDate('May 14, 2010')).toBe('2010-05-14')
    expect(parseDate('14 May 2010')).toBe('2010-05-14')
    expect(parseDate('')).toBe('')
    expect(parseDate('sometime')).toBeNull()
    expect(parseDate('02/30/2010')).toBeNull()
  })

  it('parses grades', () => {
    expect(parseGrade(7)).toBe(7)
    expect(parseGrade('Grade 11')).toBe(11)
    expect(parseGrade('G8')).toBe(8)
    expect(parseGrade('XII')).toBe(12)
    expect(parseGrade('')).toBeNull()
    expect(parseGrade('seven')).toBe('invalid')
  })

  it('splits full names', () => {
    expect(splitFullName('DELA CRUZ, JUAN, PASCUAL')).toEqual({
      lastName: 'DELA CRUZ',
      firstName: 'JUAN',
      middleName: 'PASCUAL',
      suffix: '',
    })
    expect(splitFullName('Dela Cruz, Juan, Jr., Pascual')).toEqual({
      lastName: 'Dela Cruz',
      firstName: 'Juan',
      suffix: 'Jr.',
      middleName: 'Pascual',
    })
    expect(splitFullName('Reyes, Maria Clara').firstName).toBe('Maria Clara')
  })
})

describe('parseSheet', () => {
  const rows = [
    ['School ID Generator import'],
    [],
    ['LRN', 'Last Name', 'First Name', 'Middle Name', 'Grade Level', 'Section', 'Strand', 'Birth Date', 'Sex'],
    [301234250001, 'Dela Cruz', 'Juan', 'Pascual', 7, 'Sampaguita', '', 40312, 'M'],
    ['301234250002', 'Reyes', 'Maria', '', 'Grade 11', 'Einstein', 'STEM', '06/01/2009', 'F'],
    ['', '', '', '', '', '', '', '', ''],
    ['12345', 'Peña', '', '', 'Grade 13', '', '', 'later', ''],
  ]

  it('reads rows, skipping the title and blank lines', () => {
    const sheet = parseSheet('Learners', rows)
    expect(sheet.type).toBe('learner')
    expect(sheet.ignoredHeaders).toEqual(['Sex'])
    expect(sheet.rows).toHaveLength(3)
    const [juan, maria, bad] = sheet.rows
    expect(juan.rowNumber).toBe(4)
    expect(juan.input).toMatchObject({ idNumber: '301234250001', gradeLevel: 7, birthDate: '2010-05-14', strand: '' })
    expect(juan.errors).toEqual([])
    expect(maria.input).toMatchObject({ gradeLevel: 11, strand: 'STEM', birthDate: '2009-06-01' })
    expect(bad.errors.join(' ')).toMatch(/Grade level/)
    expect(bad.errors.join(' ')).toMatch(/First name/)
    expect(bad.warnings.join(' ')).toMatch(/12 digits/)
    expect(bad.warnings.join(' ')).toMatch(/Birth date/)
  })

  it('fills in a default grade and section', () => {
    const sheet = parseSheet('Sheet1', [['LRN', 'Last Name', 'First Name'], ['301234250003', 'Santos', 'Ana']], {
      defaults: { gradeLevel: 8, section: 'Narra' },
    })
    expect(sheet.rows[0].input).toMatchObject({ gradeLevel: 8, section: 'Narra' })
    expect(sheet.rows[0].errors).toEqual([])
  })

  it('takes the grade from the sheet name or title rows', () => {
    const fromName = parseSheet('Grade 9 Rizal', [['LRN', 'Last Name', 'First Name'], ['301234250003', 'Santos', 'Ana']])
    expect(fromName.inferredGrade).toBe(9)
    expect(fromName.rows[0].input.gradeLevel).toBe(9)
    const fromTitle = parseSheet('Sheet1', [['School Register'], ['GRADE 12 - ABM'], ['LRN', 'Last Name', 'First Name'], ['301234250003', 'Santos', 'Ana']])
    expect(fromTitle.rows[0].input.gradeLevel).toBe(12)
  })

  it('reports sheets it cannot read', () => {
    expect(parseSheet('Sheet1', [['Hello']]).problem).toMatch(/learners or teachers/)
    expect(parseSheet('Teachers', [['Name', 'Position'], ['A', 'B']]).problem).toMatch(/header row|Employee/)
  })

  it('plans new, updated and duplicate rows', () => {
    const sheet = parseSheet('Learners', [
      ['LRN', 'Last Name', 'First Name', 'Grade Level'],
      ['301234250001', 'Dela Cruz', 'Juan', 7],
      ['301234250002', 'Reyes', 'Maria', 7],
      ['301234250002', 'Reyes', 'Maria', 7],
      ['301234250003', 'Santos', '', 7],
    ])
    const plan = planImport(sheet.rows, [{ id: 'x', type: 'learner', idNumber: '301234250001' }])
    expect(plan.map((p) => p.status)).toEqual(['update', 'new', 'duplicate', 'error'])
    expect(plan[0].existingId).toBe('x')
  })
})
