"use client"

/**
 * useCaseLabRunSync — load + autosave the active Case Lab run.
 *
 * On mount (or when `caseLabId` changes) it loads any in-progress run so the
 * user resumes where they left off. While a run is active it debounce-saves
 * changes to the answers/status/navigation back to Firebase. Saving is
 * best-effort: a failure sets a soft error but never blocks the UI.
 */

import { useEffect, useRef } from "react"
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

  // Load the in-progress run once per lab.
  const loadedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!caseLabId || loadedFor.current === caseLabId) return
    loadedFor.current = caseLabId
    let cancelled = false
    setLoading(true)
    fetchActiveCaseLabRun(caseLabId)
      .then((run) => {
        if (!cancelled && run) setActiveRun(run)
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your saved progress.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [caseLabId, setActiveRun, setLoading, setError])

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
}
