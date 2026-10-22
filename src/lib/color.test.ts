import { describe, expect, it } from 'vitest'
import { parseHex, shade, textOn, tint } from './color'

describe('color', () => {
  it('parses hex colors', () => {
    expect(parseHex('#14532d')).toEqual([20, 83, 45])
    expect(parseHex('#fff')).toEqual([255, 255, 255])
    expect(parseHex('nope')).toEqual([0, 0, 0])
  })

  it('picks readable text', () => {
    expect(textOn('#14532d')).toBe('#ffffff')
    expect(textOn('#1d4ed8')).toBe('#ffffff')
    expect(textOn('#facc15')).toBe('#111827')
    expect(textOn('#ffffff')).toBe('#111827')
  })

  it('tints and shades', () => {
    expect(tint('#000000', 1)).toBe('#ffffff')
    expect(tint('#000000', 0.5)).toBe('#808080')
    expect(shade('#ffffff', 1)).toBe('#000000')
  })
})
