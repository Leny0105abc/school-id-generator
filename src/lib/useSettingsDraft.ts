import { useCallback, useEffect, useRef, useState } from 'react'
import { saveSettings } from './db'
import type { Settings } from './types'

/**
 * Local copy of the settings for form inputs. Changes show at once and are saved
 * to IndexedDB shortly after typing stops (and when the page closes).
 */
export function useSettingsDraft(saved: Settings) {
  const [draft, setDraft] = useState(saved)
  const pending = useRef<Partial<Settings>>({})
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    const patch = pending.current
    pending.current = {}
    if (Object.keys(patch).length > 0) void saveSettings(patch)
  }, [])

  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  const update = useCallback(
    (patch: Partial<Settings>) => {
      setDraft((d) => ({ ...d, ...patch }))
      pending.current = { ...pending.current, ...patch }
      clearTimeout(timer.current)
      timer.current = setTimeout(flush, 400)
    },
    [flush],
  )

  return [draft, update] as const
}
