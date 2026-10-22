import type { PageOrder, PaperSizeId } from '../types'

export interface PaperSize {
  label: string
  width: number
  height: number
}

/** Paper sizes in mm. "Long" (8.5 × 13 in) is the common Philippine long bond paper. */
export const PAPER_SIZES: Record<PaperSizeId, PaperSize> = {
  a4: { label: 'A4 (210 × 297 mm)', width: 210, height: 297 },
  letter: { label: 'Short / Letter (8.5 × 11 in)', width: 215.9, height: 279.4 },
  folio: { label: 'Long / Folio (8.5 × 13 in)', width: 215.9, height: 330.2 },
  legal: { label: 'Legal (8.5 × 14 in)', width: 215.9, height: 355.6 },
}

export interface LayoutOptions {
  cardWidth: number
  cardHeight: number
  /** Space between cards, for cutting. */
  gap: number
  /** Smallest margin to keep clear of the printer's unprintable edge. */
  minMargin: number
}

export const DEFAULT_LAYOUT: LayoutOptions = { cardWidth: 53.98, cardHeight: 85.6, gap: 3, minMargin: 6 }

/** Space wanted below the grid for the 50 mm scale line and page label. */
const FOOTER_SPACE = 9

export interface SheetLayout extends LayoutOptions {
  pageWidth: number
  pageHeight: number
  cols: number
  rows: number
  perPage: number
  /** Top-left corner of the first card. */
  originX: number
  originY: number
  gridWidth: number
  gridHeight: number
}

export function computeLayout(paper: Pick<PaperSize, 'width' | 'height'>, options: LayoutOptions = DEFAULT_LAYOUT): SheetLayout {
  const { cardWidth, cardHeight, gap, minMargin } = options
  const fit = (space: number, size: number) => Math.max(0, Math.floor((space - 2 * minMargin + gap) / (size + gap)))
  const cols = fit(paper.width, cardWidth)
  const rows = fit(paper.height, cardHeight)
  const gridWidth = cols * cardWidth + Math.max(0, cols - 1) * gap
  const gridHeight = rows * cardHeight + Math.max(0, rows - 1) * gap
  const spareHeight = paper.height - gridHeight
  // Center the grid; if that leaves too little room for the footer, move it up.
  let originY = spareHeight / 2
  if (originY < FOOTER_SPACE && spareHeight - minMargin >= FOOTER_SPACE) originY = minMargin
  return {
    ...options,
    pageWidth: paper.width,
    pageHeight: paper.height,
    cols,
    rows,
    perPage: cols * rows,
    originX: (paper.width - gridWidth) / 2,
    originY,
    gridWidth,
    gridHeight,
  }
}

export type Side = 'front' | 'back'

/**
 * Where a card goes on the page. Backs are mirrored left-to-right so that,
 * printed on the reverse with "flip on long edge", each back lands behind its front.
 */
export function slotPosition(
  layout: SheetLayout,
  slot: number,
  side: Side,
  backOffset: { x: number; y: number } = { x: 0, y: 0 },
): { x: number; y: number } {
  const row = Math.floor(slot / layout.cols)
  const col = slot % layout.cols
  const shownCol = side === 'back' ? layout.cols - 1 - col : col
  const x = layout.originX + shownCol * (layout.cardWidth + layout.gap)
  const y = layout.originY + row * (layout.cardHeight + layout.gap)
  return side === 'back' ? { x: x + backOffset.x, y: y + backOffset.y } : { x, y }
}

export interface PageSpec {
  side: Side
  /** 0-based sheet of paper this page belongs to. */
  sheet: number
  /** Indexes into the list of people, one per slot. */
  cards: number[]
}

/**
 * Pages in print order.
 * interleaved: front 1, back 1, front 2, back 2 … (duplex printers)
 * fronts-then-backs: all fronts, then all backs (print fronts, turn the stack over, print backs)
 */
export function buildPages(count: number, perPage: number, order: PageOrder, includeBacks: boolean): PageSpec[] {
  if (count <= 0 || perPage <= 0) return []
  const sheets: number[][] = []
  for (let start = 0; start < count; start += perPage) {
    sheets.push(Array.from({ length: Math.min(perPage, count - start) }, (_, i) => start + i))
  }
  const fronts = sheets.map((cards, sheet) => ({ side: 'front' as const, sheet, cards }))
  if (!includeBacks) return fronts
  const backs = sheets.map((cards, sheet) => ({ side: 'back' as const, sheet, cards }))
  if (order === 'fronts-then-backs') return [...fronts, ...backs]
  return fronts.flatMap((front, i) => [front, backs[i]])
}

export type Line = [x1: number, y1: number, x2: number, y2: number]

/** Short cut lines in the margins, lined up with every card edge. */
export function cutMarks(layout: SheetLayout, length = 4, clearance = 1.5): Line[] {
  const lines: Line[] = []
  const xs = new Set<number>()
  const ys = new Set<number>()
  for (let c = 0; c < layout.cols; c++) {
    const left = layout.originX + c * (layout.cardWidth + layout.gap)
    xs.add(left).add(left + layout.cardWidth)
  }
  for (let r = 0; r < layout.rows; r++) {
    const top = layout.originY + r * (layout.cardHeight + layout.gap)
    ys.add(top).add(top + layout.cardHeight)
  }
  const top = layout.originY
  const bottom = layout.originY + layout.gridHeight
  const left = layout.originX
  const right = layout.originX + layout.gridWidth
  const room = (space: number) => Math.min(length, space - clearance - 1)
  const above = room(top)
  const below = room(layout.pageHeight - bottom)
  const before = room(left)
  const after = room(layout.pageWidth - right)
  for (const x of xs) {
    if (above > 0.5) lines.push([x, top - clearance - above, x, top - clearance])
    if (below > 0.5) lines.push([x, bottom + clearance, x, bottom + clearance + below])
  }
  for (const y of ys) {
    if (before > 0.5) lines.push([left - clearance - before, y, left - clearance, y])
    if (after > 0.5) lines.push([right + clearance, y, right + clearance + after, y])
  }
  return lines
}

/** Splits a long list into PDF files of at most `max` cards (a whole number of sheets). */
export function splitIntoParts<T>(items: T[], perPage: number, maxCards = 180): T[][] {
  const size = Math.max(perPage, Math.floor(maxCards / perPage) * perPage)
  const parts: T[][] = []
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size))
  return parts
}
