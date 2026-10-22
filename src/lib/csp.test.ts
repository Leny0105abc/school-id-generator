import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SECURITY_HEADERS } from './csp'

interface VercelConfig {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}

describe('security headers', () => {
  it('vercel.json matches src/lib/csp.ts', () => {
    const config = JSON.parse(readFileSync('vercel.json', 'utf8')) as VercelConfig
    const all = config.headers.find((h) => h.source === '/(.*)')
    expect(all).toBeDefined()
    const fromVercel = Object.fromEntries(all!.headers.map((h) => [h.key, h.value]))
    expect(fromVercel).toEqual(SECURITY_HEADERS)
  })

  it('allows no external origins', () => {
    for (const value of Object.values(SECURITY_HEADERS)) {
      expect(value).not.toMatch(/https?:/)
    }
  })
})
