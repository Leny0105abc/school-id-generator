import type { PersonInput } from './types'

// Shown on the Design page when there is nobody saved yet.
export const SAMPLE_LEARNER: PersonInput = {
  type: 'learner',
  idNumber: '301234250001',
  lastName: 'Dela Cruz',
  firstName: 'Juan',
  middleName: 'Pascual',
  suffix: '',
  gradeLevel: 11,
  section: 'Einstein',
  strand: 'STEM',
  position: '',
  department: '',
  birthDate: '2009-06-12',
  bloodType: 'O+',
  address: 'Purok 3, Brgy. San Isidro, Sample City',
  emergencyName: 'Elena Dela Cruz',
  emergencyRelationship: 'Mother',
  emergencyPhone: '0917 555 0100',
}

export const SAMPLE_TEACHER: PersonInput = {
  type: 'teacher',
  idNumber: '4510234',
  lastName: 'Villanueva',
  firstName: 'Rosario',
  middleName: 'Manalo',
  suffix: '',
  gradeLevel: null,
  section: '',
  strand: '',
  position: 'Master Teacher I',
  department: 'Mathematics',
  birthDate: '1980-03-10',
  bloodType: 'A+',
  address: '12 Mabini St., Brgy. Poblacion, Sample City',
  emergencyName: 'Antonio Villanueva',
  emergencyRelationship: 'Spouse',
  emergencyPhone: '0918 555 0200',
}
