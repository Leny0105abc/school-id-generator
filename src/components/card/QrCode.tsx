import { useMemo } from 'react'
import { qrPath } from '@/lib/qr'

/** QR code drawn as vector SVG, sized in mm. Includes a 1-module quiet zone. */
export function QrCode({ value, sizeMm, color = '#000000' }: { value: string; sizeMm: number; color?: string }) {
  const { path, size } = useMemo(() => qrPath(value), [value])
  const view = size + 2
  return (
    <svg
      viewBox={`-1 -1 ${view} ${view}`}
      width={`${sizeMm}mm`}
      height={`${sizeMm}mm`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code: ${value}`}
      style={{ display: 'block', background: '#ffffff' }}
    >
      <path d={path} fill={color} />
    </svg>
  )
}
