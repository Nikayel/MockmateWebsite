"use client"

/**
 * useCaseLabRunSync — load + autosave the active Case Lab run.
 *
 * On mount (or when `caseLabId` changes) it loads any in-progress run so the
 * user resumes where they left off. While a run is active it debounce-saves
 * changes to the answers/status/navigation back to Firebase. Saving is
 * best-effort: a failure sets a soft error but never blocks the UI.
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { useCaseLabStore } from "@/lib/stores/case-lab-store"
import { fetchActiveCaseLabRun, saveCaseLabRun } from "@/lib/labs/case-lab-runs-client"

const SAVE_DEBOUNCE_MS = 1000

/** Fields whose changes should trigger a save (excludes server-managed timestamps). */
function savableSnapshot(run: {
  status: string
  mode: string
  currentMilestone: string
  answers: unknown
  milestoneStatus: unknown
}): string {
  return JSON.stringify({
    status: run.status,
    mode: run.mode,
    currentMilestone: run.currentMilestone,
    answers: run.answers,
    milestoneStatus: run.milestoneStatus,
  })
}

export function useCaseLabRunSync(caseLabId: string | null) {
  const activeRun = useCaseLabStore((s) => s.activeRun)
  const setActiveRun = useCaseLabStore((s) => s.setActiveRun)
  const setLoading = useCaseLabStore((s) => s.setLoading)
  const setError = useCaseLabStore((s) => s.setError)

  // Bumping this re-runs the load effect for the same lab — that's how a manual
  // Retry recovers from a timed-out / failed resume without a full remount.
  const [reloadNonce, setReloadNonce] = useState(0)
  const reload = useCallback(() => setReloadNonce((n) => n + 1), [])

  // Load the in-progress run once per (lab, retry). The ref guards against the
  // double-invoke React does in dev StrictMode, keyed so a Retry still fires.
  //
  // Staleness is gated on `loadedKey.current` (a persistent ref) rather than a
  // per-invocation `cancelled` closure. The StrictMode remount runs cleanup on
  // the first effect *before* its fetch settles; a closure flag would mark that
  // in-flight load cancelled while the remount's early-return skips re-fetching,
  // stranding `isLoading` at `true` forever. Comparing the still-current key
  // instead lets the original load apply its result and clear loading, while a
  // genuine lab/retry change (which advances the key) correctly ignores it.
  const loadedKey = useRef<string | null>(null)
  useEffect(() => {
    if (!caseLabId) return
    const key = `${caseLabId}:${reloadNonce}`
    if (loadedKey.current === key) return
    loadedKey.current = key

    setError(null)
    setLoading(true)
    fetchActiveCaseLabRun(caseLabId)
      .then((run) => {
        if (loadedKey.current === key && run) setActiveRun(run)
      })
      .catch(() => {
        if (loadedKey.current === key) setError("Couldn't load your saved progress.")
      })
      .finally(() => {
        if (loadedKey.current === key) setLoading(false)
      })
  }, [caseLabId, reloadNonce, setActiveRun, setLoading, setError])

  // Debounced autosave on meaningful run changes.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>("")
  useEffect(() => {
    if (!activeRun) return
    const snapshot = savableSnapshot(activeRun)
    if (snapshot === lastSaved.current) return

    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      lastSaved.current = snapshot
      saveCaseLabRun(activeRun)
        .then((saved) => {
          // Adopt a server-assigned id (first save) without clobbering edits
          // the user may have made during the in-flight request.
          if (saved && saved.id !== activeRun.id) {
            const current = useCaseLabStore.getState().activeRun
            if (current) setActiveRun({ ...current, id: saved.id })
          }
        })
        .catch(() => setError("Couldn't save your latest changes."))
    }, SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [activeRun, setActiveRun, setError])

  return { reload }
}
