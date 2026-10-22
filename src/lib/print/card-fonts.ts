import latin500 from '@fontsource/montserrat/files/montserrat-latin-500-normal.woff2?url'
import latin600 from '@fontsource/montserrat/files/montserrat-latin-600-normal.woff2?url'
import latin700 from '@fontsource/montserrat/files/montserrat-latin-700-normal.woff2?url'
import latin800 from '@fontsource/montserrat/files/montserrat-latin-800-normal.woff2?url'
import ext500 from '@fontsource/montserrat/files/montserrat-latin-ext-500-normal.woff2?url'
import ext600 from '@fontsource/montserrat/files/montserrat-latin-ext-600-normal.woff2?url'
import ext700 from '@fontsource/montserrat/files/montserrat-latin-ext-700-normal.woff2?url'
import ext800 from '@fontsource/montserrat/files/montserrat-latin-ext-800-normal.woff2?url'
import { blobToDataUrl } from '../photos/image'

const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'

const FILES: [weight: number, url: string, range: string][] = [
  [500, latin500, LATIN],
  [600, latin600, LATIN],
  [700, latin700, LATIN],
  [800, latin800, LATIN],
  [500, ext500, LATIN_EXT],
  [600, ext600, LATIN_EXT],
  [700, ext700, LATIN_EXT],
  [800, ext800, LATIN_EXT],
]

let cached: Promise<string> | null = null

/**
 * @font-face rules for the card font with the files inlined, so every card
 * image is drawn with the real font. Built once and reused for all cards.
 */
export function cardFontCss(): Promise<string> {
  cached ??= (async () => {
    const rules = await Promise.all(
      FILES.map(async ([weight, url, range]) => {
        const data = await blobToDataUrl(await (await fetch(url)).blob())
        return `@font-face{font-family:'Montserrat';font-style:normal;font-weight:${weight};font-display:block;src:url(${data}) format('woff2');unicode-range:${range};}`
      }),
    )
    return rules.join('\n')
  })()
  cached.catch(() => (cached = null))
  return cached
}

/** Makes sure the browser has the card font loaded before measuring text. */
export async function loadCardFonts(): Promise<void> {
  const sample = 'ABCÑabcñ0123'
  await Promise.all([500, 600, 700, 800].map((w) => document.fonts.load(`${w} 12px Montserrat`, sample)))
}
