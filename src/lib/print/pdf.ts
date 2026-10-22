import { jsPDF } from 'jspdf'
import type { Person, Settings } from '../types'
import {
  buildPages,
  computeLayout,
  cutMarks,
  PAPER_SIZES,
  slotPosition,
  splitIntoParts,
  type PageSpec,
  type SheetLayout,
} from './layout'
import { createCardRenderer } from './rasterize'

export interface PdfFile {
  name: string
  blob: Blob
  cards: number
  pages: number
}

export interface PdfProgress {
  done: number
  total: number
  part: number
  parts: number
}

export interface PdfJob {
  people: Person[]
  settings: Settings
  /** Used in file names, e.g. "grade-7-sampaguita". */
  label: string
  onProgress?: (p: PdfProgress) => void
  signal?: AbortSignal
}

/** At most 20 sheets per file keeps each PDF a manageable size (about 20 MB). */
export const MAX_CARDS_PER_FILE = 180

const SCALE_LINE_MM = 50

function slug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'cards'
  )
}

function dateStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function drawFooter(doc: jsPDF, layout: SheetLayout, page: PageSpec, sheets: number, isFront: boolean) {
  const bottom = layout.originY + layout.gridHeight
  const space = layout.pageHeight - bottom
  if (space < 7) return
  const y = bottom + Math.min(space / 2 + 1, 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(110)
  const side = isFront ? 'Front' : 'Back'
  const where = isFront
    ? `Sheet ${page.sheet + 1} of ${sheets}`
    : `Sheet ${page.sheet + 1} of ${sheets} — print on the reverse of the front (flip on long edge)`
  doc.text(`${side} · ${where}`, layout.originX + layout.gridWidth, y, { align: 'right' })

  if (isFront) {
    // A line of known length: if it doesn't measure 50 mm, the printer scaled the page.
    const x = layout.originX
    doc.setDrawColor(60)
    doc.setLineWidth(0.25)
    doc.line(x, y - 1, x + SCALE_LINE_MM, y - 1)
    doc.line(x, y - 2.2, x, y + 0.2)
    doc.line(x + SCALE_LINE_MM, y - 2.2, x + SCALE_LINE_MM, y + 0.2)
    doc.text('50 mm — check with a ruler', x + SCALE_LINE_MM + 2, y)
  }
}

/**
 * Builds the print-ready PDF(s). Each card side is rendered to a 300 DPI image
 * and placed at its exact size. Large batches are split into several files.
 */
export async function generatePdfs(job: PdfJob): Promise<PdfFile[]> {
  const { people, settings, signal } = job
  const paper = PAPER_SIZES[settings.paper] ?? PAPER_SIZES.a4
  const layout = computeLayout(paper)
  const parts = splitIntoParts(people, layout.perPage, MAX_CARDS_PER_FILE)
  const sidesPerCard = settings.includeBacks ? 2 : 1
  const total = people.length * sidesPerCard
  const backOffset = { x: settings.backOffsetX, y: settings.backOffsetY }
  let done = 0

  const renderer = await createCardRenderer(settings)
  const files: PdfFile[] = []
  try {
    for (const [partIndex, group] of parts.entries()) {
      const doc = new jsPDF({ unit: 'mm', format: [paper.width, paper.height], orientation: 'portrait', compress: true })
      doc.setProperties({ title: `ID cards — ${job.label}`, creator: 'School ID Generator' })
      const pages = buildPages(group.length, layout.perPage, settings.pageOrder, settings.includeBacks)
      const sheets = Math.ceil(group.length / layout.perPage)

      for (const [pageIndex, page] of pages.entries()) {
        if (pageIndex > 0) doc.addPage([paper.width, paper.height], 'portrait')
        const isFront = page.side === 'front'
        for (const [slot, cardIndex] of page.cards.entries()) {
          if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError')
          const person = group[cardIndex]
          const image = await renderer.render(person, page.side)
          const { x, y } = slotPosition(layout, slot, page.side, backOffset)
          doc.addImage(image, 'JPEG', x, y, layout.cardWidth, layout.cardHeight, `${partIndex}-${cardIndex}-${page.side}`, 'NONE')
          done++
          job.onProgress?.({ done, total, part: partIndex + 1, parts: parts.length })
          // Let the page repaint the progress bar between cards.
          await new Promise((r) => setTimeout(r, 0))
        }
        if (isFront && settings.cutMarks) {
          doc.setDrawColor(0)
          doc.setLineWidth(0.15)
          for (const [x1, y1, x2, y2] of cutMarks(layout)) doc.line(x1, y1, x2, y2)
        }
        drawFooter(doc, layout, page, sheets, isFront)
      }

      const suffix = parts.length > 1 ? `-part-${partIndex + 1}-of-${parts.length}` : ''
      files.push({
        name: `id-cards-${slug(job.label)}-${dateStamp()}${suffix}.pdf`,
        blob: doc.output('blob'),
        cards: group.length,
        pages: pages.length,
      })
    }
  } finally {
    renderer.dispose()
  }
  return files
}
