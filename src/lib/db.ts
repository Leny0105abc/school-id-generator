import Dexie, { type EntityTable } from 'dexie'
import { useLiveQuery } from 'dexie-react-hooks'
import { withDefaults } from './settings'
import type { AssetRecord, Person, PhotoRecord, Settings } from './types'

export type IdDatabase = Dexie & {
  people: EntityTable<Person, 'id'>
  photos: EntityTable<PhotoRecord, 'id'>
  assets: EntityTable<AssetRecord, 'id'>
  settings: EntityTable<Settings, 'id'>
}

/** Everything is stored in this browser's IndexedDB. Nothing is sent anywhere. */
export const db = new Dexie('school-id-generator') as IdDatabase

db.version(1).stores({
  people: 'id, type, [type+idNumber], gradeLevel, section, lastName, updatedAt',
  photos: 'id',
  assets: 'id',
  settings: 'id',
})

export async function getSettings(): Promise<Settings> {
  return withDefaults(await db.settings.get('settings'))
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const current = await getSettings()
  await db.settings.put({ ...current, ...patch, id: 'settings' })
}

/** Settings with defaults filled in. `undefined` while loading. */
export function useSettings(): Settings | undefined {
  return useLiveQuery(getSettings, [])
}

export function newId(): string {
  return crypto.randomUUID()
}

/** Deletes people and their photos. */
export async function deletePeople(ids: string[]): Promise<void> {
  await db.transaction('rw', db.people, db.photos, async () => {
    const people = await db.people.bulkGet(ids)
    const photoIds = people.flatMap((p) => (p?.photoId ? [p.photoId] : []))
    await db.photos.bulkDelete(photoIds)
    await db.people.bulkDelete(ids)
  })
}

/** Replaces a person's photo, deleting the old one. */
export async function setPersonPhoto(personId: string, photo: Omit<PhotoRecord, 'id'>) {
  const photoId = newId()
  await db.transaction('rw', db.people, db.photos, async () => {
    const person = await db.people.get(personId)
    if (!person) throw new Error('Person not found')
    if (person.photoId) await db.photos.delete(person.photoId)
    await db.photos.add({ ...photo, id: photoId })
    await db.people.update(personId, { photoId, updatedAt: Date.now() })
  })
  return photoId
}

export async function removePersonPhoto(personId: string) {
  await db.transaction('rw', db.people, db.photos, async () => {
    const person = await db.people.get(personId)
    if (!person?.photoId) return
    await db.photos.delete(person.photoId)
    await db.people.update(personId, { photoId: null, updatedAt: Date.now() })
  })
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [db.people, db.photos, db.assets, db.settings], async () => {
    await Promise.all([db.people.clear(), db.photos.clear(), db.assets.clear(), db.settings.clear()])
  })
}
