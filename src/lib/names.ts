import type { NameFormat, PersonInput } from './types'

type NameParts = Pick<PersonInput, 'firstName' | 'middleName' | 'lastName' | 'suffix'>

/** Collapses repeated spaces and trims. */
export function cleanSpaces(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/** "Santos" → "S.", "dela Cruz" → "D.", "" → "". */
export function middleInitial(middleName: string): string {
  const name = cleanSpaces(middleName).replace(/\.$/, '')
  if (!name) return ''
  return `${name[0].toUpperCase()}.`
}

/** Normalizes suffixes such as "jr" → "Jr.", "iii" → "III". */
export function normalizeSuffix(suffix: string): string {
  const s = cleanSpaces(suffix).replace(/\.$/, '')
  if (!s) return ''
  if (/^(i{1,3}|iv|v|vi{0,3})$/i.test(s)) return s.toUpperCase()
  if (/^(jr|sr)$/i.test(s)) return `${s[0].toUpperCase()}${s.slice(1).toLowerCase()}.`
  return s
}

/**
 * Formats a name for the card, in upper case.
 * first-last: "JUAN P. DELA CRUZ JR."
 * last-first: "DELA CRUZ, JUAN JR. P."
 */
export function formatName(p: NameParts, format: NameFormat): string {
  const first = cleanSpaces(p.firstName)
  const last = cleanSpaces(p.lastName)
  const mi = middleInitial(p.middleName)
  const suffix = normalizeSuffix(p.suffix)
  const parts =
    format === 'last-first'
      ? [last ? `${last},` : '', first, suffix, mi]
      : [first, mi, last, suffix]
  return parts.filter(Boolean).join(' ').replace(/,$/, '').toUpperCase()
}

/** Name for lists: "Dela Cruz, Juan P." */
export function sortableName(p: NameParts): string {
  const rest = [cleanSpaces(p.firstName), normalizeSuffix(p.suffix), middleInitial(p.middleName)]
    .filter(Boolean)
    .join(' ')
  const last = cleanSpaces(p.lastName)
  return last && rest ? `${last}, ${rest}` : last || rest
}
