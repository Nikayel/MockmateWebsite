"use client"

import { useEffect, useRef, useState } from "react"

/**
 * A `useState` whose value survives reloads via `localStorage`. Hydrates from storage *after* mount
 * (never during render) so server and first client render agree — no hydration mismatch. Best-effort:
 * a disabled/full/blocked storage simply degrades to in-memory state. Used by the Python Executor to
 * keep the editor code, the pasted problem, and the scratchpad across reloads (HANDOFF §4).
 */
export function usePersistentState(
  key: string,
  initialValue: string
): [string, (value: string) => void] {
  const [value, setValue] = useState(initialValue)
  // Skip the first storage write: it would just echo the default before hydration runs.
  const hydrated = useRef(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored !== null) setValue(stored)
    } catch {
      // Storage unavailable — stay with the in-memory default.
    }
    hydrated.current = true
  }, [key])

  useEffect(() => {
    if (!hydrated.current) return
    try {
      window.localStorage.setItem(key, value)
    } catch {
      // Storage full/blocked — the value still works in memory this session.
    }
  }, [key, value])

  return [value, setValue]
}
