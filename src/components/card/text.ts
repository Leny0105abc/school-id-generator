import { idLabel } from '@/lib/ids'
import { formatName } from '@/lib/names'
import { gradeLabel } from '@/lib/schemas'
import type { PersonInput, Settings } from '@/lib/types'

/** All the words a card shows, worked out once for every design. */
export function cardText(person: PersonInput, settings: Settings) {
  const isLearner = person.type === 'learner'
  const header = settings.headerLines
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  return {
    isLearner,
    header,
    schoolName: settings.schoolName || 'Your School Name',
    name: formatName(person, settings.nameFormat) || 'FIRST M. LASTNAME',
    idLabel: idLabel(person.type),
    idNumber: person.idNumber || (isLearner ? '000000000000' : '0000000'),
    detail: isLearner
      ? gradeLabel(person) || 'Grade & Section'
      : person.position || 'Position',
    subDetail: isLearner ? '' : person.department,
    role: (isLearner ? settings.learnerLabel : settings.teacherLabel) || (isLearner ? 'LEARNER' : 'TEACHER'),
    accent: isLearner ? settings.learnerColor : settings.teacherColor,
    schoolYear: settings.schoolYear ? `S.Y. ${settings.schoolYear}` : '',
    birthDate: formatBirthDate(person.birthDate),
  }
}

export function formatBirthDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

export function schoolContactLine(settings: Settings): string {
  return [settings.schoolAddress, settings.schoolContact].filter(Boolean).join(' · ')
}
