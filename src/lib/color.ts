/** Parses #rgb or #rrggbb. Falls back to black for anything else. */
export function parseHex(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '')
  if (h.length === 3) h = h.replace(/./g, (c) => c + c)
  if (!/^[0-9a-f]{6}$/i.test(h)) return [0, 0, 0]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number]
}

function toHex(rgb: number[]): string {
  return `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** White or near-black, whichever reads better on the given background. */
export function textOn(background: string): string {
  const l = luminance(background)
  const contrastWhite = 1.05 / (l + 0.05)
  const contrastDark = (l + 0.05) / (luminance('#111827') + 0.05)
  return contrastWhite >= contrastDark ? '#ffffff' : '#111827'
}

/** Mixes a color with white; amount 0 = original, 1 = white. */
export function tint(hex: string, amount: number): string {
  return toHex(parseHex(hex).map((v) => v + (255 - v) * amount))
}

/** Mixes a color with black; amount 0 = original, 1 = black. */
export function shade(hex: string, amount: number): string {
  return toHex(parseHex(hex).map((v) => v * (1 - amount)))
}
