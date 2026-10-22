import { useSyncExternalStore } from 'react'

// People picked on the People page for printing. Kept in memory only.
let selected: ReadonlySet<string> = new Set()
const listeners = new Set<() => void>()

function emit(next: ReadonlySet<string>) {
  selected = next
  listeners.forEach((l) => l())
}

export const selection = {
  get: () => selected,
  set: (ids: Iterable<string>) => emit(new Set(ids)),
  toggle(id: string, on?: boolean) {
    const next = new Set(selected)
    if (on ?? !next.has(id)) next.add(id)
    else next.delete(id)
    emit(next)
  },
  setMany(ids: string[], on: boolean) {
    const next = new Set(selected)
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
    emit(next)
  },
  clear: () => emit(new Set()),
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export function useSelection(): ReadonlySet<string> {
  return useSyncExternalStore(selection.subscribe, selection.get)
}
