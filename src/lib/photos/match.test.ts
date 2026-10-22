import { describe, expect, it } from 'vitest'
import { defaultSquareCrop, fitInside } from './image'
import { indexPeople, matchFileName } from './match'

const index = indexPeople([
  { id: 'juan', idNumber: '301234250001' },
  { id: 'ana', idNumber: '301234250002' },
  { id: 'teacher', idNumber: 'T-0045' },
  { id: 'dup1', idNumber: '999999' },
  { id: 'dup2', idNumber: '999999' },
])

describe('matchFileName', () => {
  it('matches the exact ID number', () => {
    expect(matchFileName('301234250001.jpg', index)).toEqual({ personId: 'juan', status: 'matched' })
    expect(matchFileName('folder/301234250002.JPEG', index)).toEqual({ personId: 'ana', status: 'matched' })
  })

  it('ignores spaces, dashes and case', () => {
    expect(matchFileName('t 0045.png', index).personId).toBe('teacher')
    expect(matchFileName('3012-3425-0001.jpg', index).personId).toBe('juan')
  })

  it('uses the first word or a long number inside the name', () => {
    expect(matchFileName('301234250001_Juan Dela Cruz.jpg', index).personId).toBe('juan')
    expect(matchFileName('301234250001 (1).jpg', index).personId).toBe('juan')
    expect(matchFileName('IMG 301234250002 copy.jpg', index).personId).toBe('ana')
  })

  it('reports unmatched and ambiguous files', () => {
    expect(matchFileName('selfie.jpg', index)).toEqual({ personId: null, status: 'unmatched' })
    expect(matchFileName('999999.jpg', index)).toEqual({ personId: null, status: 'ambiguous' })
  })
})

describe('image geometry', () => {
  it('fits inside a maximum side without enlarging', () => {
    expect(fitInside(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 })
    expect(fitInside(800, 600, 1600)).toEqual({ width: 800, height: 600 })
  })

  it('makes a square crop biased toward the top of tall photos', () => {
    expect(defaultSquareCrop(1000, 1000)).toEqual({ x: 0, y: 0, width: 1000, height: 1000 })
    expect(defaultSquareCrop(1200, 800)).toEqual({ x: 200, y: 0, width: 800, height: 800 })
    expect(defaultSquareCrop(800, 1200)).toEqual({ x: 0, y: 120, width: 800, height: 800 })
  })
})
