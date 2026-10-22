import 'fake-indexeddb/auto'
import { strToU8, zipSync } from 'fflate'
import { beforeEach, describe, expect, it } from 'vitest'
import { BackupError, collectBackup, decodeBackup, encodeBackup, restoreBackup, sanitizeSettings } from './backup'
import { clearAllData, db, getSettings, saveSettings } from './db'
import { SAMPLE_LEARNER, SAMPLE_TEACHER } from './sample'
import type { Person } from './types'

const jpeg = (n: number) => new Blob([new Uint8Array([0xff, 0xd8, n, 0xff, 0xd9])], { type: 'image/jpeg' })

function person(base: typeof SAMPLE_LEARNER, id: string, idNumber: string, photoId: string | null): Person {
  return { ...base, id, idNumber, photoId, createdAt: 1, updatedAt: 2 }
}

async function seed() {
  await db.photos.add({ id: 'ph1', original: jpeg(1), cropped: jpeg(2), crop: { x: 0, y: 10, width: 100, height: 100 } })
  await db.people.bulkAdd([
    person(SAMPLE_LEARNER, 'p1', '301234250001', 'ph1'),
    person(SAMPLE_TEACHER, 'p2', '4510234', null),
  ])
  await db.assets.add({ id: 'logoLeft', blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), updatedAt: 5 })
  await saveSettings({ schoolName: 'Sample National High School', primaryColor: '#123456' })
}

async function bytesOf(blob: Blob) {
  return [...new Uint8Array(await blob.arrayBuffer())]
}

describe('backup', () => {
  beforeEach(async () => {
    await clearAllData()
  })

  it('round-trips everything through a zip file', async () => {
    await seed()
    const zip = await encodeBackup(await collectBackup())
    await clearAllData()
    expect(await db.people.count()).toBe(0)

    const data = decodeBackup(zip)
    await restoreBackup(data, 'replace')

    const people = await db.people.toArray()
    expect(people.map((p) => p.idNumber).sort()).toEqual(['301234250001', '4510234'])
    const learner = people.find((p) => p.type === 'learner')!
    const photo = await db.photos.get(learner.photoId!)
    expect(photo?.crop).toEqual({ x: 0, y: 10, width: 100, height: 100 })
    expect(await bytesOf(photo!.cropped)).toEqual([0xff, 0xd8, 2, 0xff, 0xd9])
    expect(await bytesOf((await db.assets.get('logoLeft'))!.blob)).toEqual([1, 2, 3])
    expect((await getSettings()).schoolName).toBe('Sample National High School')
  })

  it('merges by ID number and keeps local settings', async () => {
    await seed()
    const zip = await encodeBackup(await collectBackup())
    await clearAllData()
    await db.people.add({ ...person(SAMPLE_LEARNER, 'local', '301234250001', null), section: 'Old section' })
    await saveSettings({ schoolName: 'Local School' })

    const result = await restoreBackup(decodeBackup(zip), 'merge')
    expect(result).toEqual({ added: 1, updated: 1 })
    const learner = await db.people.get('local')
    expect(learner?.section).toBe(SAMPLE_LEARNER.section)
    expect(learner?.photoId).toBeTruthy()
    expect(await db.people.count()).toBe(2)
    expect((await getSettings()).schoolName).toBe('Local School')
  })

  it('rejects files that are not backups', () => {
    expect(() => decodeBackup(new Uint8Array([1, 2, 3]))).toThrow(BackupError)
    const other = zipSync({ 'manifest.json': strToU8(JSON.stringify({ app: 'something-else', version: 1, exportedAt: 0 })) })
    expect(() => decodeBackup(other)).toThrow(/not a School ID Generator backup/)
    const newer = zipSync({ 'manifest.json': strToU8(JSON.stringify({ app: 'school-id-generator', version: 99, exportedAt: 0 })) })
    expect(() => decodeBackup(newer)).toThrow(/newer version/)
  })

  it('keeps only known settings with the right types', () => {
    const s = sanitizeSettings({ schoolName: 'X', showQr: 'yes', evil: '<script>', lastBackupAt: 'soon' })!
    expect(s.schoolName).toBe('X')
    expect(s.showQr).toBe(true)
    expect(s.lastBackupAt).toBeNull()
    expect('evil' in s).toBe(false)
  })
})
