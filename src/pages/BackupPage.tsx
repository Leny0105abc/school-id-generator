import { useLiveQuery } from 'dexie-react-hooks'
import {
  ArchiveRestoreIcon,
  DownloadIcon,
  HardDriveIcon,
  Loader2Icon,
  ShieldCheckIcon,
  TrashIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/common/Field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  BackupError,
  collectBackup,
  decodeBackup,
  encodeBackup,
  restoreBackup,
  type BackupData,
  type RestoreMode,
} from '@/lib/backup'
import { clearAllData, db, saveSettings, useSettings } from '@/lib/db'
import { selection } from '@/lib/selection'
import { formatBytes, getStorageInfo, requestPersistentStorage, type StorageInfo } from '@/lib/storage'

function dateStamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function saveFile(bytes: Uint8Array<ArrayBuffer>, name: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export default function BackupPage() {
  const settings = useSettings()
  const counts = useLiveQuery(async () => ({
    learners: await db.people.where('type').equals('learner').count(),
    teachers: await db.people.where('type').equals('teacher').count(),
    photos: await db.photos.count(),
  }), [])
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [exporting, setExporting] = useState(false)
  const [pending, setPending] = useState<{ name: string; data: BackupData } | null>(null)
  const [mode, setMode] = useState<RestoreMode>('merge')
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const refreshStorage = () => void getStorageInfo().then(setStorage)
  useEffect(refreshStorage, [counts])

  async function onExport() {
    setExporting(true)
    try {
      const data = await collectBackup()
      const zip = (await encodeBackup(data)) as Uint8Array<ArrayBuffer>
      saveFile(zip, `id-generator-backup-${dateStamp()}.zip`)
      await saveSettings({ lastBackupAt: Date.now() })
      toast.success('Backup saved. Keep the file somewhere safe.')
    } catch (err) {
      console.error(err)
      toast.error('Could not make the backup')
    } finally {
      setExporting(false)
    }
  }

  async function onPickBackup(file: File | undefined) {
    if (!file) return
    try {
      const data = decodeBackup(new Uint8Array(await file.arrayBuffer()))
      setPending({ name: file.name, data })
      setMode('merge')
    } catch (err) {
      toast.error(err instanceof BackupError ? err.message : 'Could not read that file')
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  async function onRestore() {
    if (!pending) return
    setRestoring(true)
    try {
      const result = await restoreBackup(pending.data, mode)
      if (mode === 'replace') selection.clear()
      toast.success(
        mode === 'replace'
          ? `Restored ${result.added} people`
          : `Restored: ${result.added} added, ${result.updated} updated`,
      )
      setPending(null)
    } catch (err) {
      console.error(err)
      toast.error('Restore failed. Nothing was changed.')
    } finally {
      setRestoring(false)
      setConfirmRestore(false)
    }
  }

  async function onClear() {
    await clearAllData()
    selection.clear()
    setConfirmClear(false)
    toast.success('All data was removed from this browser')
  }

  const lastBackup = settings?.lastBackupAt
  const learnersIn = pending?.data.people.filter((p) => p.type === 'learner').length ?? 0

  return (
    <>
      <PageHeader
        title="Backup"
        description="Everything is stored in this browser only. A backup file lets you move to another computer or recover if the browser data is cleared."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DownloadIcon className="size-4" /> Make a backup
            </CardTitle>
            <CardDescription>
              One .zip file with all people, photos, logos and settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                ['Learners', counts?.learners],
                ['Teachers', counts?.teachers],
                ['Photos', counts?.photos],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-lg bg-muted/60 p-3">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-xl font-semibold">{value ?? '…'}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-muted-foreground">
              Last backup: {lastBackup ? new Date(lastBackup).toLocaleString() : 'never'}
            </p>
            <Button onClick={onExport} disabled={exporting}>
              {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />} Download backup
            </Button>
            <p className="text-xs text-muted-foreground">
              The file contains learners' personal data. Store it like other school records — for
              example on the school's drive — and don't share it publicly.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArchiveRestoreIcon className="size-4" /> Restore a backup
            </CardTitle>
            <CardDescription>Open a backup .zip made by this app.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <input
              ref={input}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => void onPickBackup(e.target.files?.[0])}
            />
            {!pending ? (
              <Button variant="outline" onClick={() => input.current?.click()}>
                <ArchiveRestoreIcon /> Choose backup file
              </Button>
            ) : (
              <div className="grid gap-4">
                <div className="rounded-lg border p-3 text-sm">
                  <div className="font-medium">{pending.name}</div>
                  <div className="text-muted-foreground">
                    Made {new Date(pending.data.exportedAt).toLocaleString()} · {learnersIn} learners ·{' '}
                    {pending.data.people.length - learnersIn} teachers · {pending.data.photos.length} photos
                  </div>
                </div>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as RestoreMode)} className="grid gap-2">
                  <Label className="flex items-start gap-2 font-normal">
                    <RadioGroupItem value="merge" className="mt-0.5" />
                    <span>
                      Add to what's here
                      <span className="block text-xs text-muted-foreground">
                        People with the same ID number are updated. Your school settings stay.
                      </span>
                    </span>
                  </Label>
                  <Label className="flex items-start gap-2 font-normal">
                    <RadioGroupItem value="replace" className="mt-0.5" />
                    <span>
                      Replace everything
                      <span className="block text-xs text-muted-foreground">
                        Everything in this browser is removed and replaced by the backup.
                      </span>
                    </span>
                  </Label>
                </RadioGroup>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setPending(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => (mode === 'replace' ? setConfirmRestore(true) : void onRestore())}
                    disabled={restoring}
                  >
                    {restoring && <Loader2Icon className="animate-spin" />} Restore
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDriveIcon className="size-4" /> Storage in this browser
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm">
            <p>
              Using {formatBytes(storage?.usage ?? null)}
              {storage?.quota ? ` of about ${formatBytes(storage.quota)} available` : ''}.
            </p>
            {storage?.persisted ? (
              <p className="flex items-center gap-2 text-emerald-700">
                <ShieldCheckIcon className="size-4" /> The browser will keep this data even when the disk is low.
              </p>
            ) : (
              <div className="grid gap-2">
                <p className="text-muted-foreground">
                  The browser may delete this data if the computer runs low on space. Bookmarking the
                  site helps the browser allow permanent storage.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  onClick={async () => {
                    const ok = await requestPersistentStorage()
                    refreshStorage()
                    toast[ok ? 'success' : 'info'](ok ? 'Storage is now permanent' : 'The browser did not allow it yet')
                  }}
                >
                  Ask to keep data permanently
                </Button>
              </div>
            )}
            <Alert>
              <TriangleAlertIcon />
              <AlertTitle>Data is lost when browser data is cleared</AlertTitle>
              <AlertDescription>
                Clearing history or "site data", using a private window, or switching browsers or
                computers starts with an empty app. Make a backup after every big change.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <TrashIcon className="size-4" /> Remove all data
            </CardTitle>
            <CardDescription>
              Deletes every person, photo, logo and setting from this browser — for example before
              handing the computer to someone else.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setConfirmClear(true)}>
              <TrashIcon /> Remove all data
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmRestore} onOpenChange={setConfirmRestore}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace everything?</AlertDialogTitle>
            <AlertDialogDescription>
              All people, photos, logos and settings in this browser will be removed and replaced by
              the backup. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onRestore}>
              Replace everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove all data from this browser?</AlertDialogTitle>
            <AlertDialogDescription>
              {counts ? `${counts.learners + counts.teachers} people and ${counts.photos} photos` : 'Everything'} will be
              deleted. Make a backup first if you may need them again. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onClear}>
              Remove all data
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
