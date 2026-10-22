import { z } from 'zod'
import type { PersonInput, PersonType } from './types'

const text = (max: number) => z.string().trim().max(max, `Keep this under ${max} characters`)
const required = (max: number) => text(max).min(1, 'Required')

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

export const personInputSchema = z
  .object({
    type: z.enum(['learner', 'teacher']),
    idNumber: required(30),
    lastName: required(60),
    firstName: required(80),
    middleName: text(60),
    suffix: text(10),
    gradeLevel: z.number().int().min(7, 'Grade 7–12 only').max(12, 'Grade 7–12 only').nullable(),
    section: text(40),
    strand: text(40),
    position: text(60),
    department: text(60),
    birthDate: z
      .string()
      .trim()
      .refine((v) => v === '' || isIsoDate(v), 'Use a valid date'),
    bloodType: text(5),
    address: text(160),
    emergencyName: text(80),
    emergencyRelationship: text(30),
    emergencyPhone: text(30),
  })
  .superRefine((value, ctx) => {
    if (value.type === 'learner' && value.gradeLevel == null) {
      ctx.addIssue({ code: 'custom', path: ['gradeLevel'], message: 'Choose a grade level' })
    }
  })

export type FieldErrors = Partial<Record<keyof PersonInput, string>>

export function validatePerson(
  input: PersonInput,
): { ok: true; data: PersonInput } | { ok: false; errors: FieldErrors } {
  const result = personInputSchema.safeParse(input)
  if (result.success) return { ok: true, data: cleanForType(result.data) }
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = issue.path[0] as keyof PersonInput
    errors[key] ??= issue.message
  }
  return { ok: false, errors }
}

/** Clears fields that do not apply to the person's type. */
function cleanForType(p: PersonInput): PersonInput {
  if (p.type === 'learner') {
    const shs = p.gradeLevel != null && p.gradeLevel >= 11
    return { ...p, position: '', department: '', strand: shs ? p.strand : '' }
  }
  return { ...p, gradeLevel: null, section: '', strand: '' }
}

export function emptyPersonInput(type: PersonType): PersonInput {
  return {
    type,
    idNumber: '',
    lastName: '',
    firstName: '',
    middleName: '',
    suffix: '',
    gradeLevel: null,
    section: '',
    strand: '',
    position: '',
    department: '',
    birthDate: '',
    bloodType: '',
    address: '',
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',
  }
}

export const GRADE_LEVELS = [7, 8, 9, 10, 11, 12] as const

export const STRAND_SUGGESTIONS = [
  'STEM',
  'ABM',
  'HUMSS',
  'GAS',
  'TVL-ICT',
  'TVL-HE',
  'TVL-IA',
  'TVL-AFA',
  'Arts and Design',
  'Sports',
  'Academic',
  'TechPro',
]

export const POSITION_SUGGESTIONS = [
  'Teacher I',
  'Teacher II',
  'Teacher III',
  'Master Teacher I',
  'Master Teacher II',
  'Head Teacher',
  'School Principal',
  'Assistant Principal',
  'Guidance Counselor',
  'Librarian',
  'Administrative Officer',
]

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export function gradeLabel(p: Pick<PersonInput, 'gradeLevel' | 'section' | 'strand'>): string {
  if (p.gradeLevel == null) return ''
  const parts = [`Grade ${p.gradeLevel}`]
  if (p.strand && p.gradeLevel >= 11) parts.push(p.strand)
  if (p.section) parts.push(p.section)
  return parts.join(' – ')
}
