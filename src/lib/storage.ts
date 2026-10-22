/**
 * Browsers may delete website data when the disk is low. Asking for persistent
 * storage tells the browser not to do that without asking the user.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export interface StorageInfo {
  persisted: boolean
  usage: number | null
  quota: number | null
}

export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    const [persisted, estimate] = await Promise.all([
      navigator.storage?.persisted?.() ?? Promise.resolve(false),
      navigator.storage?.estimate?.() ?? Promise.resolve(undefined),
    ])
    return { persisted, usage: estimate?.usage ?? null, quota: estimate?.quota ?? null }
  } catch {
    return { persisted: false, usage: null, quota: null }
  }
}

export function formatBytes(bytes: number | null): string {
  if (bytes == null) return 'unknown'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`
}
