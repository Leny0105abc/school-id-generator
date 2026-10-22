import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

const PT_TO_PX = 96 / 72

/** Re-renders when web fonts finish loading, so text can be measured again. */
function useFontsVersion(): number {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    const fonts = document.fonts
    if (!fonts) return
    const bump = () => setVersion((v) => v + 1)
    void fonts.ready.then(bump)
    fonts.addEventListener('loadingdone', bump)
    return () => fonts.removeEventListener('loadingdone', bump)
  }, [])
  return version
}

interface FitTextProps {
  text: string
  /** Largest font size in points. */
  maxPt: number
  /** Smallest font size in points. */
  minPt?: number
  maxLines?: number
  lineHeight?: number
  style?: CSSProperties
  className?: string
}

/**
 * Shrinks text until it fits its box: no word wider than the box and no more
 * than `maxLines` lines. Used for names and school names of any length.
 */
export function FitText({
  text,
  maxPt,
  minPt = maxPt * 0.55,
  maxLines = 1,
  lineHeight = 1.15,
  style,
  className,
}: FitTextProps) {
  const ref = useRef<HTMLDivElement>(null)
  const fontsVersion = useFontsVersion()

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    let size = maxPt
    const fits = () =>
      el.scrollWidth <= el.clientWidth + 0.5 &&
      el.scrollHeight <= maxLines * lineHeight * size * PT_TO_PX + 1
    el.style.fontSize = `${size}pt`
    while (size > minPt && !fits()) {
      size = Math.max(minPt, size - 0.25)
      el.style.fontSize = `${size}pt`
    }
  }, [text, maxPt, minPt, maxLines, lineHeight, fontsVersion])

  return (
    <div
      ref={ref}
      className={className}
      style={{
        lineHeight,
        overflow: 'hidden',
        overflowWrap: 'normal',
        wordBreak: 'normal',
        maxHeight: `${maxLines * lineHeight * maxPt}pt`,
        ...style,
      }}
    >
      {text}
    </div>
  )
}
