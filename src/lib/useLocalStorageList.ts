import { useCallback, useState } from 'react'

function load(key: string, limit: number): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === 'string').slice(0, limit)
  } catch {
    // Corrupt data, storage disabled (private browsing), or quota issues -
    // fail quietly and just start with an empty list.
    return []
  }
}

function save(key: string, list: string[]): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, JSON.stringify(list))
  } catch {
    // Storage full or unavailable - the in-memory state still works for
    // this session, it just won't persist.
  }
}

/**
 * A small "most-recent, de-duplicated, capped" string list persisted to
 * localStorage - used for per-tool calculation history. Each tool that uses
 * this should pass its own unique storage key so histories don't collide.
 *
 * This is deliberately simple (free-tier scope) - the roadmap's Pro tier
 * ("unlimited history" + offline PWA) is the point where this would
 * graduate to IndexedDB.
 */
export function useLocalStorageList(key: string, limit = 20) {
  const [list, setList] = useState<string[]>(() => load(key, limit))

  const add = useCallback(
    (value: string) => {
      const trimmed = value.trim()
      if (!trimmed) return
      setList((prev) => {
        const next = [trimmed, ...prev.filter((item) => item !== trimmed)].slice(0, limit)
        save(key, next)
        return next
      })
    },
    [key, limit],
  )

  const clear = useCallback(() => {
    setList([])
    if (typeof window === 'undefined') return
    try {
      window.localStorage.removeItem(key)
    } catch {
      // ignore
    }
  }, [key])

  return { list, add, clear }
}
