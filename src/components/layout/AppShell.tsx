import { NavLink, Outlet } from 'react-router'
import {
  ArchiveIcon,
  CameraIcon,
  FileSpreadsheetIcon,
  IdCardIcon,
  LockIcon,
  PaletteIcon,
  PrinterIcon,
  UsersIcon,
} from 'lucide-react'
import { Suspense } from 'react'
import { cn } from '@/lib/utils'
import { BackupReminder } from './BackupReminder'

const NAV = [
  { to: '/', label: 'People', icon: UsersIcon },
  { to: '/import', label: 'Import', icon: FileSpreadsheetIcon },
  { to: '/photos', label: 'Photos', icon: CameraIcon },
  { to: '/design', label: 'Design', icon: PaletteIcon },
  { to: '/print', label: 'Print', icon: PrinterIcon },
  { to: '/backup', label: 'Backup', icon: ArchiveIcon },
]

export function AppShell() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2">
          <NavLink to="/" className="flex shrink-0 items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
              <IdCardIcon className="size-5" />
            </span>
            <span className="hidden sm:inline">School ID Generator</span>
          </NavLink>
          <nav className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    isActive && 'bg-muted text-foreground',
                  )
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <BackupReminder />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
          <LockIcon className="size-3.5 shrink-0" />
          <span>
            Your data stays in this browser. Nothing is uploaded — records, photos and signatures
            are saved on this computer only. Back up regularly.
          </span>
        </div>
      </footer>
    </div>
  )
}
