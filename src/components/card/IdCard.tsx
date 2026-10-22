import type { CSSProperties } from 'react'
import { ClassicBack, ClassicFront } from './designs/classic'
import { ModernBack, ModernFront } from './designs/modern'
import { CARD_HEIGHT_PX, CARD_WIDTH_PX, type CardProps, type CardSide } from './types'

const DESIGNS = {
  classic: { front: ClassicFront, back: ClassicBack },
  modern: { front: ModernFront, back: ModernBack },
}

/** One side of an ID card at real size (53.98 × 85.6 mm). */
export function IdCard({ side, ...props }: CardProps & { side: CardSide }) {
  const design = DESIGNS[props.settings.design] ?? DESIGNS.classic
  const Face = design[side]
  return <Face {...props} />
}

/** A card scaled to a given on-screen width, with rounded corners and a shadow. */
export function CardPreview({
  width = 240,
  className,
  style,
  ...props
}: CardProps & { side: CardSide; width?: number; className?: string; style?: CSSProperties }) {
  const scale = width / CARD_WIDTH_PX
  return (
    <div
      className={className}
      style={{
        width,
        height: CARD_HEIGHT_PX * scale,
        borderRadius: 10 * scale,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgb(0 0 0 / 0.08), 0 8px 24px rgb(0 0 0 / 0.12)',
        flexShrink: 0,
        ...style,
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CARD_WIDTH_PX }}>
        <IdCard {...props} />
      </div>
    </div>
  )
}
