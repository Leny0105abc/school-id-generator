import type { PersonType } from './types'

/** Removes spaces and dashes that people type into ID numbers. */
export function normalizeIdNumber(value: unknown): string {
  if (value == null) return ''
  // Excel stores long numbers as numbers; print them without exponent.
  const text =
    typeof value === 'number' && Number.isFinite(value)
      ? value.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 0 })
      : String(value)
  return text.replace(/[\s -]+/g, '').trim()
}

/** A Learner Reference Number has exactly 12 digits. */
export function isValidLrn(lrn: string): boolean {
  return /^\d{12}$/.test(lrn)
}

export function idLabel(type: PersonType): string {
  return type === 'learner' ? 'LRN' : 'Employee No.'
}

/** Returns a warning for an unusual ID number, or null when it looks fine. */
export function idNumberWarning(type: PersonType, idNumber: string): string | null {
  if (!idNumber) return null
  if (type === 'learner' && !isValidLrn(idNumber)) return 'LRN should have exactly 12 digits'
  return null
}
