import type { PersonInput, PersonType } from '../types'

export type ColumnKey = keyof Omit<PersonInput, 'type'> | 'fullName'

export interface ColumnDef {
  key: ColumnKey
  header: string
  /** Other header names accepted on import (compared after normalizing). */
  aliases: string[]
  width: number
}

const shared = {
  name: [
    { key: 'lastName', header: 'Last Name', aliases: ['lastname', 'surname', 'family name'], width: 16 },
    { key: 'firstName', header: 'First Name', aliases: ['firstname', 'given name'], width: 18 },
    { key: 'middleName', header: 'Middle Name', aliases: ['middlename'], width: 16 },
    { key: 'suffix', header: 'Suffix', aliases: ['extension', 'name extension', 'ext', 'ext name'], width: 8 },
  ],
  personal: [
    { key: 'birthDate', header: 'Birth Date', aliases: ['birthdate', 'date of birth', 'birthday', 'dob'], width: 13 },
    { key: 'bloodType', header: 'Blood Type', aliases: ['blood group'], width: 10 },
    { key: 'address', header: 'Address', aliases: ['home address', 'complete address'], width: 36 },
    {
      key: 'emergencyName',
      header: 'Emergency Contact Name',
      aliases: ['emergency contact', 'contact person', 'guardian', 'guardian name', 'parent/guardian', 'parent or guardian', "parent's name", 'parent name'],
      width: 24,
    },
    { key: 'emergencyRelationship', header: 'Relationship', aliases: ['relation', 'emergency contact relationship', 'relationship to learner'], width: 13 },
    {
      key: 'emergencyPhone',
      header: 'Emergency Contact Number',
      aliases: ['contact number', 'contact no', 'emergency contact no', 'mobile number', 'mobile no', 'phone', 'phone number', 'cellphone number', 'guardian contact number', 'parent/guardian contact number'],
      width: 18,
    },
  ],
  fullName: {
    key: 'fullName',
    header: 'Full Name',
    aliases: ['name', 'complete name', "learner's name", 'learner name', "student's name", 'student name', "teacher's name", 'employee name'],
    width: 30,
  },
} satisfies Record<string, ColumnDef[] | ColumnDef>

export const LEARNER_COLUMNS: ColumnDef[] = [
  { key: 'idNumber', header: 'LRN', aliases: ['learner reference number', 'learner reference no', 'lrn no', 'lrn number'], width: 15 },
  ...shared.name,
  { key: 'gradeLevel', header: 'Grade Level', aliases: ['grade', 'year level', 'grade lvl'], width: 11 },
  { key: 'section', header: 'Section', aliases: ['class', 'section name'], width: 14 },
  { key: 'strand', header: 'Strand', aliases: ['track', 'strand/track', 'track/strand', 'track and strand'], width: 12 },
  ...shared.personal,
]

export const TEACHER_COLUMNS: ColumnDef[] = [
  { key: 'idNumber', header: 'Employee No.', aliases: ['employee no', 'employee number', 'employee id', 'emp no', 'id number', 'id no'], width: 14 },
  ...shared.name,
  { key: 'position', header: 'Position', aliases: ['designation', 'position title', 'plantilla position'], width: 18 },
  { key: 'department', header: 'Department', aliases: ['subject area', 'subject', 'dept', 'department/subject area'], width: 16 },
  ...shared.personal,
]

/** Accepted on import only, when there are no separate name columns. */
export const FULL_NAME_COLUMN: ColumnDef = shared.fullName

export function columnsFor(type: PersonType): ColumnDef[] {
  return type === 'learner' ? LEARNER_COLUMNS : TEACHER_COLUMNS
}

/** "Contact No.:" → "contact no" */
export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/[.:#*]/g, '')
    .replace(/[_\s]+/g, ' ')
    .trim()
}

/** Finds which column a header belongs to. Ignores a trailing "(…)" note like "Birth Date (mm/dd/yyyy)". */
export function matchHeader(header: unknown, columns: ColumnDef[]): ColumnKey | null {
  const h = normalizeHeader(header)
  if (!h) return null
  const base = h.replace(/\s*\(.*\)\s*$/, '').trim()
  for (const c of [...columns, FULL_NAME_COLUMN]) {
    const names = [normalizeHeader(c.header), ...c.aliases.map(normalizeHeader)]
    if (names.includes(h) || names.includes(base)) return c.key
  }
  return null
}
