import { computeLayout, slotPosition, type PaperSize } from '@/lib/print/layout'

/**
 * Small drawing of one sheet: fronts on the left page, backs on the right.
 * The numbers show which back prints behind which front.
 */
export function SheetDiagram({ paper, includeBacks }: { paper: PaperSize; includeBacks: boolean }) {
  const layout = computeLayout(paper)
  const scale = 0.62
  const w = paper.width * scale
  const h = paper.height * scale
  const gap = 18
  const sides = includeBacks ? (['front', 'back'] as const) : (['front'] as const)
  const totalW = sides.length * w + (sides.length - 1) * gap

  return (
    <svg
      viewBox={`0 0 ${totalW} ${h + 16}`}
      className="h-auto w-full max-w-sm"
      role="img"
      aria-label={includeBacks ? 'Front page and mirrored back page layout' : 'Front page layout'}
    >
      {sides.map((side, i) => {
        const ox = i * (w + gap)
        return (
          <g key={side} transform={`translate(${ox} 0)`}>
            <rect x={0.5} y={0.5} width={w - 1} height={h - 1} rx={2} fill="var(--background)" stroke="var(--border)" />
            {Array.from({ length: layout.perPage }, (_, slot) => {
              const { x, y } = slotPosition(layout, slot, side)
              return (
                <g key={slot}>
                  <rect
                    x={x * scale}
                    y={y * scale}
                    width={layout.cardWidth * scale}
                    height={layout.cardHeight * scale}
                    rx={1.5}
                    fill={side === 'front' ? 'var(--primary)' : 'var(--muted)'}
                    fillOpacity={side === 'front' ? 0.14 : 1}
                    stroke="var(--primary)"
                    strokeOpacity={0.5}
                    strokeWidth={0.6}
                  />
                  <text
                    x={(x + layout.cardWidth / 2) * scale}
                    y={(y + layout.cardHeight / 2) * scale + 3}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={600}
                    fill="var(--foreground)"
                  >
                    {slot + 1}
                  </text>
                </g>
              )
            })}
            <text x={w / 2} y={h + 12} textAnchor="middle" fontSize={9} fill="var(--muted-foreground)">
              {side === 'front' ? 'Front page' : 'Back page (mirrored)'}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
