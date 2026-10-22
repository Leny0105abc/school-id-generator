import { describe, expect, it } from 'vitest'
import { buildPages, computeLayout, cutMarks, PAPER_SIZES, slotPosition, splitIntoParts } from './layout'

describe('computeLayout', () => {
  it('fits 9 portrait cards on every paper size', () => {
    for (const paper of Object.values(PAPER_SIZES)) {
      const layout = computeLayout(paper)
      expect(layout.cols).toBe(3)
      expect(layout.rows).toBe(3)
      expect(layout.perPage).toBe(9)
      // Never closer than the minimum margin to any edge.
      expect(layout.originX).toBeGreaterThanOrEqual(6)
      expect(layout.originY).toBeGreaterThanOrEqual(6)
      expect(layout.pageWidth - layout.originX - layout.gridWidth).toBeGreaterThanOrEqual(6)
      expect(layout.pageHeight - layout.originY - layout.gridHeight).toBeGreaterThanOrEqual(6)
    }
  })

  it('centers the grid on A4', () => {
    const a4 = computeLayout(PAPER_SIZES.a4)
    expect(a4.gridWidth).toBeCloseTo(167.94, 2)
    expect(a4.originX).toBeCloseTo((210 - 167.94) / 2, 2)
    expect(a4.originY).toBeCloseTo((297 - 262.8) / 2, 2)
  })

  it('moves the grid up on Letter to leave room for the footer', () => {
    const letter = computeLayout(PAPER_SIZES.letter)
    expect(letter.originY).toBe(6)
    expect(letter.pageHeight - letter.originY - letter.gridHeight).toBeGreaterThanOrEqual(9)
  })
})

describe('slotPosition', () => {
  const a4 = computeLayout(PAPER_SIZES.a4)

  it('places fronts left to right, top to bottom', () => {
    expect(slotPosition(a4, 0, 'front')).toEqual({ x: a4.originX, y: a4.originY })
    const third = slotPosition(a4, 2, 'front')
    expect(third.x).toBeCloseTo(a4.originX + 2 * (53.98 + 3))
    expect(slotPosition(a4, 3, 'front').y).toBeCloseTo(a4.originY + 85.6 + 3)
  })

  it('mirrors backs so they line up after a long-edge flip', () => {
    for (let slot = 0; slot < 9; slot++) {
      const front = slotPosition(a4, slot, 'front')
      const back = slotPosition(a4, slot, 'back')
      // Flipping the sheet: x → pageWidth − x − cardWidth.
      expect(back.x).toBeCloseTo(a4.pageWidth - front.x - a4.cardWidth, 6)
      expect(back.y).toBeCloseTo(front.y, 6)
    }
  })

  it('applies the back offset only to backs', () => {
    const offset = { x: 1.5, y: -1 }
    expect(slotPosition(a4, 0, 'front', offset)).toEqual(slotPosition(a4, 0, 'front'))
    const plain = slotPosition(a4, 0, 'back')
    const moved = slotPosition(a4, 0, 'back', offset)
    expect(moved.x - plain.x).toBeCloseTo(1.5)
    expect(moved.y - plain.y).toBeCloseTo(-1)
  })
})

describe('buildPages', () => {
  it('interleaves fronts and backs', () => {
    const pages = buildPages(12, 9, 'interleaved', true)
    expect(pages.map((p) => `${p.side}${p.sheet}`)).toEqual(['front0', 'back0', 'front1', 'back1'])
    expect(pages[2].cards).toEqual([9, 10, 11])
  })

  it('can print all fronts first, or fronts only', () => {
    expect(buildPages(12, 9, 'fronts-then-backs', true).map((p) => p.side)).toEqual(['front', 'front', 'back', 'back'])
    expect(buildPages(12, 9, 'interleaved', false)).toHaveLength(2)
    expect(buildPages(0, 9, 'interleaved', true)).toEqual([])
  })
})

describe('cutMarks', () => {
  it('draws marks in the margins for every card edge', () => {
    const a4 = computeLayout(PAPER_SIZES.a4)
    const lines = cutMarks(a4)
    // 6 vertical edges × top and bottom + 6 horizontal edges × left and right
    expect(lines).toHaveLength(24)
    for (const [x1, y1, x2, y2] of lines) {
      const insideGrid =
        Math.min(x1, x2) > a4.originX && Math.max(x1, x2) < a4.originX + a4.gridWidth &&
        Math.min(y1, y2) > a4.originY && Math.max(y1, y2) < a4.originY + a4.gridHeight
      expect(insideGrid).toBe(false)
    }
  })
})

describe('splitIntoParts', () => {
  it('splits into whole sheets', () => {
    const items = Array.from({ length: 400 }, (_, i) => i)
    const parts = splitIntoParts(items, 9, 180)
    expect(parts.map((p) => p.length)).toEqual([180, 180, 40])
    expect(splitIntoParts([1, 2], 9)).toEqual([[1, 2]])
  })
})
