import type { Person } from '../types'

/** Upper case without spaces, dashes, dots or underscores. */
export function normalizeKey(value: string): string {
  return value.toUpperCase().replace(/[\s._-]+/g, '')
}

export function fileStem(fileName: string): string {
  return fileName.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '')
}

export type MatchStatus = 'matched' | 'unmatched' | 'ambiguous'

export interface MatchResult {
  personId: string | null
  status: MatchStatus
}

export type PeopleIndex = Map<string, string[]>

export function indexPeople(people: Pick<Person, 'id' | 'idNumber'>[]): PeopleIndex {
  const index: PeopleIndex = new Map()
  for (const p of people) {
    const key = normalizeKey(p.idNumber)
    if (!key) continue
    index.set(key, [...(index.get(key) ?? []), p.id])
  }
  return index
}

/**
 * Finds the person a photo belongs to from its file name. Tries, in order:
 * the whole name ("301234250001.jpg"), the first word ("301234250001_Juan.jpg",
 * "301234250001 (1).jpg"), then any long number in the name ("IMG 301234250001.jpg").
 */
export function matchFileName(fileName: string, index: PeopleIndex): MatchResult {
  const stem = fileStem(fileName)
  const candidates = [
    normalizeKey(stem),
    normalizeKey(stem.split(/[\s_(]+/)[0] ?? ''),
    ...(stem.match(/\d{6,}/g) ?? []),
  ]
  for (const key of candidates) {
    const ids = key ? index.get(key) : undefined
    if (!ids) continue
    return ids.length === 1 ? { personId: ids[0], status: 'matched' } : { personId: null, status: 'ambiguous' }
  }
  return { personId: null, status: 'unmatched' }
}
