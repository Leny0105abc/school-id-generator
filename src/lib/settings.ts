import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  schoolName: '',
  headerLines: 'Republic of the Philippines\nDepartment of Education',
  schoolId: '',
  schoolAddress: '',
  schoolContact: '',
  schoolYear: defaultSchoolYear(),
  design: 'classic',
  primaryColor: '#14532d',
  learnerColor: '#1d4ed8',
  teacherColor: '#b91c1c',
  nameFormat: 'first-last',
  learnerLabel: 'LEARNER',
  teacherLabel: 'TEACHER',
  principalName: '',
  principalTitle: 'School Principal',
  backNote:
    'This card is non-transferable. If found, please return to the school address below.',
  showQr: true,
  paper: 'a4',
  pageOrder: 'interleaved',
  includeBacks: true,
  cutMarks: true,
  backOffsetX: 0,
  backOffsetY: 0,
  lastBackupAt: null,
}

/** Philippine school years start in June–August: before June, use last year's S.Y. */
export function defaultSchoolYear(now = new Date()): string {
  const y = now.getFullYear()
  const start = now.getMonth() < 5 ? y - 1 : y
  return `${start}–${start + 1}`
}

/** Fill in any settings missing from older saved data. */
export function withDefaults(saved: Partial<Settings> | undefined): Settings {
  return { ...DEFAULT_SETTINGS, ...saved, id: 'settings' }
}
