import { useCallback, useEffect, useRef } from "react"
import { registerReloadCheckpoint } from "@/lib/interview/session-lifecycle/reload-checkpoint"
import { createLocalCheckpoint } from "./autosave/snapshot"
import { persistCloudCheckpoint } from "./autosave/cloud-checkpoint"
import { useLocalCheckpoint } from "./autosave/useLocalCheckpoint"
import type { UseInterviewAutosaveOptions } from "./autosave/types"
export type { UseInterviewAutosaveOptions } from "./autosave/types"

/** Device checkpoints are frequent; dirty cloud writes stay on the 30-second cadence. */
export function useInterviewAutosave(opts: UseInterviewAutosaveOptions) {
  const latest = useRef(opts)
  latest.current = opts
  const { saveLocal, localSaveFailed } = useLocalCheckpoint(opts)
  const lastRemoteSave = useRef<string | null>(null)
  const pendingSave = useRef<Promise<unknown>>(Promise.resolve())

  const checkpoint = useCallback(
    (force = true) => {
      const current = latest.current
      const snapshot = createLocalCheckpoint(current)
      if (!snapshot || current.canCheckpoint === false)
        return { localSaved: false, cloudSaved: Promise.resolve(false) }
      const localSaved = saveLocal(snapshot)
      const fingerprint = JSON.stringify({
        ...snapshot,
        elapsedTime: undefined,
        timestamp: undefined,
      })
      const persist = async () => {
        if (!force && lastRemoteSave.current === fingerprint) return true
        try {
          const saved = await persistCloudCheckpoint(current, snapshot)
          if (saved) lastRemoteSave.current = fingerprint
          return saved
        } catch (error) {
          console.error("Auto-save failed:", error)
          return false
        }
      }
      // Check dirtiness inside the queue: overlapping identical requests write only once.
      const cloudSaved = pendingSave.current.then(persist, persist)
      pendingSave.current = cloudSaved
      return { localSaved, cloudSaved }
    },
    [saveLocal]
  )

  const saveNow = useCallback(
    (force = true) => {
      const result = checkpoint(force)
      let timeout: ReturnType<typeof setTimeout>
      const deadline = new Promise<boolean>((resolve) => {
        timeout = setTimeout(() => resolve(false), 8000)
      })
      return Promise.race([result.cloudSaved, deadline])
        .then((cloudSaved) => ({ localSaved: result.localSaved, cloudSaved }))
        .finally(() => clearTimeout(timeout))
    },
    [checkpoint]
  )

  const scenarioId = opts.selectedScenario?.id
  const userId = opts.firebaseUser?.uid
  const { isInterviewStarted, currentSessionId, isGuestMode, guestId } = opts
  useEffect(() => {
    if (!isInterviewStarted || !scenarioId || !currentSessionId) return
    if (!userId && !(isGuestMode && guestId)) return
    const unregister = registerReloadCheckpoint(() => checkpoint(false))
    const autoSaveInterval = setInterval(() => {
      void saveNow(false)
    }, 30000)
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") void saveNow(false)
    }
    const saveOnPageHide = () => {
      void saveNow(false)
    }
    document.addEventListener("visibilitychange", saveWhenHidden)
    window.addEventListener("pagehide", saveOnPageHide)
    const identity = {
      sessionId: currentSessionId,
      scenarioId,
      userId,
      guestId,
    }
    return () => {
      clearInterval(autoSaveInterval)
      document.removeEventListener("visibilitychange", saveWhenHidden)
      window.removeEventListener("pagehide", saveOnPageHide)
      const current = latest.current
      if (
        current.isInterviewStarted &&
        current.currentSessionId === identity.sessionId &&
        current.selectedScenario?.id === identity.scenarioId &&
        current.firebaseUser?.uid === identity.userId &&
        current.guestId === identity.guestId
      )
        unregister(checkpoint(false))
      else unregister()
    }
  }, [
    isInterviewStarted,
    scenarioId,
    currentSessionId,
    userId,
    isGuestMode,
    guestId,
    checkpoint,
    saveNow,
  ])
  return { saveNow, localSaveFailed }
}
