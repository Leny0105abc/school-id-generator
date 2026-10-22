import { describe, expect, it } from 'vitest'
import { formatName, middleInitial, normalizeSuffix, sortableName } from './names'
import { idNumberWarning, isValidLrn, normalizeIdNumber } from './ids'

const juan = { firstName: 'Juan', middleName: 'Pascual', lastName: 'dela Cruz', suffix: 'jr' }

describe('names', () => {
  it('gets the middle initial', () => {
    expect(middleInitial('Pascual')).toBe('P.')
    expect(middleInitial('  dela Peña ')).toBe('D.')
    expect(middleInitial('')).toBe('')
  })

  it('normalizes suffixes', () => {
    expect(normalizeSuffix('jr')).toBe('Jr.')
    expect(normalizeSuffix('SR.')).toBe('Sr.')
    expect(normalizeSuffix('iii')).toBe('III')
    expect(normalizeSuffix('')).toBe('')
  })

  it('formats first-last and last-first', () => {
    expect(formatName(juan, 'first-last')).toBe('JUAN P. DELA CRUZ JR.')
    expect(formatName(juan, 'last-first')).toBe('DELA CRUZ, JUAN JR. P.')
  })

  it('keeps Ñ and handles missing parts', () => {
    expect(formatName({ firstName: 'Niño', middleName: '', lastName: 'Peña', suffix: '' }, 'first-last')).toBe(
      'NIÑO PEÑA',
    )
    expect(formatName({ firstName: 'Ana', middleName: '', lastName: '', suffix: '' }, 'last-first')).toBe('ANA')
  })

  it('builds a sortable name', () => {
    expect(sortableName(juan)).toBe('dela Cruz, Juan Jr. P.')
  })
})

describe('ID numbers', () => {
  it('normalizes typed and Excel values', () => {
    expect(normalizeIdNumber(' 1234 5678-9012 ')).toBe('123456789012')
    expect(normalizeIdNumber(123456789012)).toBe('123456789012')
    expect(normalizeIdNumber(null)).toBe('')
  })

  it('checks LRNs', () => {
    expect(isValidLrn('123456789012')).toBe(true)
    expect(isValidLrn('12345678901')).toBe(false)
    expect(idNumberWarning('learner', '123')).toMatch(/12 digits/)
    expect(idNumberWarning('teacher', '123')).toBeNull()
  })
})
