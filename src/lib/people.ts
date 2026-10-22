import { db, newId } from './db'
import { idLabel } from './ids'
import { sortableName } from './names'
import { validatePerson, type FieldErrors } from './schemas'
import type { Person, PersonInput, PersonType } from './types'

export async function findByIdNumber(type: PersonType, idNumber: string): Promise<Person | undefined> {
  return db.people.where('[type+idNumber]').equals([type, idNumber]).first()
}

/** Validates and saves a person. Returns field errors instead of throwing. */
export async function savePerson(
  input: PersonInput,
  existingId?: string,
): Promise<{ ok: true; id: string } | { ok: false; errors: FieldErrors }> {
  const result = validatePerson(input)
  if (!result.ok) return result
  const data = result.data

  const clash = await findByIdNumber(data.type, data.idNumber)
  if (clash && clash.id !== existingId) {
    return {
      ok: false,
      errors: { idNumber: `${sortableName(clash)} already has this ${idLabel(data.type)}` },
    }
  }

  const now = Date.now()
  if (existingId) {
    await db.people.update(existingId, { ...data, updatedAt: now })
    return { ok: true, id: existingId }
  }
  const id = newId()
  await db.people.add({ ...data, id, photoId: null, createdAt: now, updatedAt: now })
  return { ok: true, id }
}

/** Learners by grade, section, then name; teachers by name. */
export function comparePeople(a: Person, b: Person): number {
  if (a.type !== b.type) return a.type === 'learner' ? -1 : 1
  if (a.type === 'learner') {
    const g = (a.gradeLevel ?? 99) - (b.gradeLevel ?? 99)
    if (g !== 0) return g
    const s = a.section.localeCompare(b.section, undefined, { numeric: true })
    if (s !== 0) return s
  }
  return sortableName(a).localeCompare(sortableName(b))
}

/** Lower-case, accent-free text for searching ("Peña" matches "pena"). */
export function searchKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function matchesSearch(p: Person, query: string): boolean {
  const q = searchKey(query.trim())
  if (!q) return true
  const haystack = searchKey(
    [p.firstName, p.middleName, p.lastName, p.suffix, p.idNumber, p.section, p.strand, p.position].join(' '),
  )
  return q.split(/\s+/).every((word) => haystack.includes(word))
}

/** Short problems that would make a weak ID card. */
export function personIssues(p: Person): string[] {
  const issues: string[] = []
  if (!p.photoId) issues.push('No photo')
  if (p.type === 'learner' && !/^\d{12}$/.test(p.idNumber)) issues.push('LRN is not 12 digits')
  if (!p.emergencyName && !p.emergencyPhone) issues.push('No emergency contact')
  return issues
}
