import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import { z } from 'zod'
import { db, newId } from './db'
import { DEFAULT_SETTINGS } from './settings'
import type { AssetRecord, Person, PhotoRecord, Settings } from './types'

export const BACKUP_APP = 'school-id-generator'
export const BACKUP_VERSION = 1
/** Refuse absurdly large files instead of running out of memory. */
const MAX_BACKUP_BYTES = 1024 * 1024 * 1024

export interface BackupData {
  exportedAt: number
  people: Person[]
  photos: PhotoRecord[]
  assets: AssetRecord[]
  settings: Settings | null
}

export class BackupError extends Error {}

const manifestSchema = z.object({
  app: z.literal(BACKUP_APP),
  version: z.number().int().min(1),
  exportedAt: z.number(),
})

const personSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(['learner', 'teacher']),
  idNumber: z.string().max(100),
  lastName: z.string().max(200),
  firstName: z.string().max(200),
  middleName: z.string().max(200),
  suffix: z.string().max(50),
  gradeLevel: z.number().int().nullable(),
  section: z.string().max(200),
  strand: z.string().max(200),
  position: z.string().max(200),
  department: z.string().max(200),
  birthDate: z.string().max(20),
  bloodType: z.string().max(10),
  address: z.string().max(500),
  emergencyName: z.string().max(200),
  emergencyRelationship: z.string().max(100),
  emergencyPhone: z.string().max(100),
  photoId: z.string().max(100).nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})

const cropSchema = z.object({ x: z.number(), y: z.number(), width: z.number(), height: z.number() })
const photoMetaSchema = z.object({ id: z.string().min(1).max(100).regex(/^[\w-]+$/), crop: cropSchema })
const assetMetaSchema = z.object({ id: z.enum(['logoLeft', 'logoRight', 'signature']), updatedAt: z.number() })

/** Keeps only known settings with the right types, so an odd file can't break the app. */
export function sanitizeSettings(raw: unknown): Settings | null {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const clean: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const [key, fallback] of Object.entries(DEFAULT_SETTINGS)) {
    const value = source[key]
    if (key === 'lastBackupAt') clean[key] = typeof value === 'number' ? value : null
    else if (typeof value === typeof fallback) clean[key] = value
  }
  clean.id = 'settings'
  return clean as unknown as Settings
}

const json = (value: unknown) => strToU8(JSON.stringify(value, null, 1))
const STORE: { level: 0 } = { level: 0 }

export async function encodeBackup(data: BackupData): Promise<Uint8Array> {
  const files: Zippable = {
    'manifest.json': json({ app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: data.exportedAt }),
    'people.json': json(data.people),
    'settings.json': json(data.settings),
    'photos.json': json(data.photos.map((p) => ({ id: p.id, crop: p.crop }))),
    'assets.json': json(data.assets.map((a) => ({ id: a.id, updatedAt: a.updatedAt }))),
    'README.txt': strToU8(
      'Backup from School ID Generator. It contains personal data of learners and teachers.\n' +
        'Keep it somewhere safe. To restore, open the app, go to Backup, and choose this file.\n',
    ),
  }
  for (const p of data.photos) {
    files[`photos/${p.id}-original.jpg`] = [new Uint8Array(await p.original.arrayBuffer()), STORE]
    files[`photos/${p.id}-cropped.jpg`] = [new Uint8Array(await p.cropped.arrayBuffer()), STORE]
  }
  for (const a of data.assets) {
    files[`assets/${a.id}.png`] = [new Uint8Array(await a.blob.arrayBuffer()), STORE]
  }
  return zipSync(files, { level: 6 })
}

export function decodeBackup(bytes: Uint8Array): BackupData {
  if (bytes.byteLength > MAX_BACKUP_BYTES) throw new BackupError('This file is too large to be a backup.')
  let files: Record<string, Uint8Array>
  try {
    files = unzipSync(bytes)
  } catch {
    throw new BackupError('This is not a backup file (it could not be opened as a .zip).')
  }
  const readJson = (name: string): unknown => {
    const file = files[name]
    if (!file) throw new BackupError(`The backup is missing ${name}.`)
    try {
      return JSON.parse(strFromU8(file))
    } catch {
      throw new BackupError(`${name} in the backup is damaged.`)
    }
  }

  const manifest = manifestSchema.safeParse(readJson('manifest.json'))
  if (!manifest.success) throw new BackupError('This is not a School ID Generator backup.')
  if (manifest.data.version > BACKUP_VERSION) {
    throw new BackupError('This backup was made by a newer version of the app. Reload the page and try again.')
  }

  const people = z.array(personSchema).safeParse(readJson('people.json'))
  const photosMeta = z.array(photoMetaSchema).safeParse(readJson('photos.json'))
  const assetsMeta = z.array(assetMetaSchema).safeParse(readJson('assets.json'))
  if (!people.success || !photosMeta.success || !assetsMeta.success) {
    throw new BackupError('The backup has data in an unexpected format.')
  }

  const photos: PhotoRecord[] = []
  for (const meta of photosMeta.data) {
    const original = files[`photos/${meta.id}-original.jpg`]
    const cropped = files[`photos/${meta.id}-cropped.jpg`]
    if (!original || !cropped) continue
    photos.push({
      id: meta.id,
      crop: meta.crop,
      original: new Blob([original as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
      cropped: new Blob([cropped as Uint8Array<ArrayBuffer>], { type: 'image/jpeg' }),
    })
  }
  const assets: AssetRecord[] = []
  for (const meta of assetsMeta.data) {
    const file = files[`assets/${meta.id}.png`]
    if (file) assets.push({ id: meta.id, updatedAt: meta.updatedAt, blob: new Blob([file as Uint8Array<ArrayBuffer>], { type: 'image/png' }) })
  }

  // Drop links to photos that are not in the file.
  const photoIds = new Set(photos.map((p) => p.id))
  const cleanPeople = people.data.map((p) => (p.photoId && !photoIds.has(p.photoId) ? { ...p, photoId: null } : p))

  return {
    exportedAt: manifest.data.exportedAt,
    people: cleanPeople,
    photos,
    assets,
    settings: sanitizeSettings(readJson('settings.json')),
  }
}

export async function collectBackup(): Promise<BackupData> {
  return db.transaction('r', [db.people, db.photos, db.assets, db.settings], async () => ({
    exportedAt: Date.now(),
    people: await db.people.toArray(),
    photos: await db.photos.toArray(),
    assets: await db.assets.toArray(),
    settings: (await db.settings.get('settings')) ?? null,
  }))
}

export type RestoreMode = 'replace' | 'merge'

/**
 * replace: everything in this browser is swapped for the backup.
 * merge: people from the backup are added, or update the person with the same
 * ID number; school settings and logos here are kept (missing logos are filled in).
 */
export async function restoreBackup(data: BackupData, mode: RestoreMode): Promise<{ added: number; updated: number }> {
  const photoById = new Map(data.photos.map((p) => [p.id, p]))
  return db.transaction('rw', [db.people, db.photos, db.assets, db.settings], async () => {
    if (mode === 'replace') {
      await Promise.all([db.people.clear(), db.photos.clear(), db.assets.clear(), db.settings.clear()])
      await db.photos.bulkAdd(data.photos)
      await db.people.bulkAdd(data.people)
      await db.assets.bulkAdd(data.assets)
      if (data.settings) await db.settings.put(data.settings)
      return { added: data.people.length, updated: 0 }
    }

    const existing = await db.people.toArray()
    const byKey = new Map(existing.map((p) => [`${p.type}:${p.idNumber}`, p]))
    const existingIds = new Set(existing.map((p) => p.id))
    let added = 0
    let updated = 0
    for (const incoming of data.people) {
      const photo = incoming.photoId ? photoById.get(incoming.photoId) : undefined
      const photoId = photo ? newId() : null
      if (photo) await db.photos.add({ ...photo, id: photoId! })
      const match = byKey.get(`${incoming.type}:${incoming.idNumber}`)
      if (match) {
        if (photoId && match.photoId) await db.photos.delete(match.photoId)
        await db.people.put({ ...incoming, id: match.id, photoId: photoId ?? match.photoId, createdAt: match.createdAt })
        updated++
      } else {
        const id = existingIds.has(incoming.id) ? newId() : incoming.id
        await db.people.add({ ...incoming, id, photoId })
        added++
      }
    }
    for (const asset of data.assets) {
      if (!(await db.assets.get(asset.id))) await db.assets.add(asset)
    }
    // A fresh browser has no school details yet: take them from the backup.
    const local = await db.settings.get('settings')
    if (data.settings && !local?.schoolName) {
      await db.settings.put({ ...data.settings, lastBackupAt: local?.lastBackupAt ?? null })
    }
    return { added, updated }
  })
}
