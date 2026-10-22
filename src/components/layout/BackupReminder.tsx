import { useLiveQuery } from 'dexie-react-hooks'
import { TriangleAlertIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { db, useSettings } from '@/lib/db'

const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000

/** Shows a banner when there are changes that are not in a backup file yet. */
export function BackupReminder() {
  const settings = useSettings()
  const location = useLocation()
  const latest = useLiveQuery(async () => {
    const count = await db.people.count()
    const newest = await db.people.orderBy('updatedAt').last()
    return { count, newestChange: newest?.updatedAt ?? 0 }
  }, [])

  if (!settings || !latest || latest.count === 0 || location.pathname === '/backup') return null

  const last = settings.lastBackupAt
  const changedSinceBackup = last == null || latest.newestChange > last
  const isOld = last == null || Date.now() - last > REMIND_AFTER_MS
  if (!changedSinceBackup || !isOld) return null

  return (
    <div className="border-b border-amber-200 bg-amber-50 text-amber-900">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
        <TriangleAlertIcon className="size-4 shrink-0" />
        <span>
          {latest.count} {latest.count === 1 ? 'record is' : 'records are'} saved only in this
          browser.{' '}
          {last == null
            ? 'You have not made a backup yet.'
            : `Last backup: ${new Date(last).toLocaleDateString()}.`}
        </span>
        <Link to="/backup" className="font-medium underline underline-offset-2">
          Back up now
        </Link>
      </div>
    </div>
  )
}
