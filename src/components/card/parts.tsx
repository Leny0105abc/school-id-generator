import type { CSSProperties, ReactNode } from 'react'
import { CARD_HEIGHT_MM, CARD_WIDTH_MM, mm } from './types'

export const CARD_FONT = "'Montserrat', 'Arial', sans-serif"

/** The card's outer box: exact CR80 size, white, card font. */
export function CardSurface({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      data-card-surface=""
      style={{
        position: 'relative',
        width: mm(CARD_WIDTH_MM),
        height: mm(CARD_HEIGHT_MM),
        overflow: 'hidden',
        background: '#ffffff',
        color: '#111827',
        fontFamily: CARD_FONT,
        fontKerning: 'normal',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Logo({ src, sizeMm }: { src?: string; sizeMm: number }) {
  return (
    <div style={{ width: mm(sizeMm), height: mm(sizeMm), flexShrink: 0 }}>
      {src && (
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      )}
    </div>
  )
}

export function Silhouette({ color = '#9ca3af' }: { color?: string }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
      <rect width="100" height="100" fill="#e5e7eb" />
      <circle cx="50" cy="38" r="19" fill={color} />
      <path d="M10 104c4-26 20-38 40-38s36 12 40 38z" fill={color} />
    </svg>
  )
}

export function Photo({ src, style }: { src?: string; style?: CSSProperties }) {
  return (
    <div style={{ overflow: 'hidden', background: '#e5e7eb', boxSizing: 'border-box', ...style }}>
      {src ? (
        <img
          src={src}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <Silhouette />
      )}
    </div>
  )
}

/** Small uppercase caption above a value. */
export function Caption({ children, color = '#6b7280', style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: '4.3pt',
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color,
        lineHeight: 1.2,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
