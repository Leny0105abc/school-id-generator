export type PersonType = 'learner' | 'teacher'

/** Editable fields of a learner or teacher. */
export interface PersonInput {
  type: PersonType
  /** LRN for learners, employee number for teachers. */
  idNumber: string
  lastName: string
  firstName: string
  middleName: string
  /** Name extension: Jr., Sr., III … */
  suffix: string
  /** Learners only: 7–12. */
  gradeLevel: number | null
  section: string
  /** Senior High only (Grades 11–12). */
  strand: string
  /** Teachers only. */
  position: string
  department: string
  /** ISO date (yyyy-mm-dd) or empty. */
  birthDate: string
  bloodType: string
  address: string
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
}

export interface Person extends PersonInput {
  id: string
  /** Key into the `photos` table; a new id is used every time the photo changes. */
  photoId: string | null
  createdAt: number
  updatedAt: number
}

/** Crop rectangle in pixels of the stored original image. */
export interface CropArea {
  x: number
  y: number
  width: number
  height: number
}

export interface PhotoRecord {
  id: string
  /** Original photo, scaled down to at most 1600 px on the long side. */
  original: Blob
  /** Square crop used on the card (600 × 600 JPEG). */
  cropped: Blob
  crop: CropArea
}

export type AssetKey = 'logoLeft' | 'logoRight' | 'signature'

export interface AssetRecord {
  id: AssetKey
  blob: Blob
  updatedAt: number
}

export type CardDesign = 'classic' | 'modern'
export type NameFormat = 'first-last' | 'last-first'
export type PaperSizeId = 'a4' | 'letter' | 'legal' | 'folio'
export type PageOrder = 'interleaved' | 'fronts-then-backs'

export interface Settings {
  id: 'settings'
  // School
  schoolName: string
  /** Lines above the school name, one per line (e.g. "Republic of the Philippines"). */
  headerLines: string
  schoolId: string
  schoolAddress: string
  schoolContact: string
  schoolYear: string
  // Look
  design: CardDesign
  primaryColor: string
  learnerColor: string
  teacherColor: string
  nameFormat: NameFormat
  learnerLabel: string
  teacherLabel: string
  // Back of card
  principalName: string
  principalTitle: string
  backNote: string
  showQr: boolean
  // Printing
  paper: PaperSizeId
  pageOrder: PageOrder
  includeBacks: boolean
  cutMarks: boolean
  backOffsetX: number
  backOffsetY: number
  // Housekeeping
  lastBackupAt: number | null
}
