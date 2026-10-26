import { useCallback, useEffect, useRef, useState } from "react"
import { createLocalCheckpoint, type LocalCheckpoint } from "./snapshot"
import type { UseInterviewAutosaveOptions } from "./types"
import { useGuidedLabStore } from "@/lib/stores/guided-lab-store"

/** Frequent device recovery copies; no Firestore writes, no clock-driven serialization. */
export function useLocalCheckpoint(opts: UseInterviewAutosaveOptions) {
  const latest = useRef(opts)
  latest.current = opts
  const [localSaveFailed, setLocalSaveFailed] = useState(false)
  const guidedProgress = useGuidedLabStore((state) =>
    state.scenarioId === opts.selectedScenario?.id &&
    state.progress?.evidence?.attemptId === opts.currentSessionId
      ? state.progress
      : null
  )
  const maxWait = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const saveLocal = useCallback(
    (snapshot: LocalCheckpoint | null = createLocalCheckpoint(latest.current)) => {
      const current = latest.current
      if (!snapshot || current.canCheckpoint === false) return false
      try {
        const key = current.firebaseUser
          ? `interview_autosave_${current.firebaseUser.uid}_${snapshot.scenarioId}`
          : `interview_autosave_guest_${snapshot.scenarioId}`
        localStorage.setItem(key, JSON.stringify(snapshot))
        setLocalSaveFailed(false)
        return true
      } catch {
        setLocalSaveFailed(true)
        return false
      }
    },
    []
  )
  const enabled =
    opts.isInterviewStarted &&
    !!opts.currentSessionId &&
    !!opts.selectedScenario &&
    opts.canCheckpoint !== false &&
    (!!opts.firebaseUser || (opts.isGuestMode && !!opts.guestId))

  useEffect(() => {
    if (!enabled) return
    const flush = () => {
      clearTimeout(maxWait.current)
      maxWait.current = undefined
      saveLocal()
    }
    const debounce = setTimeout(flush, 500)
    // Continuous typing must not postpone recovery indefinitely.
    maxWait.current ??= setTimeout(flush, 2000)
    return () => clearTimeout(debounce)
  }, [
    enabled,
    saveLocal,
    opts.code,
    opts.chatMessages,
    opts.interviewerMessages,
    opts.selectedLanguage,
    opts.testResults,
    opts.testSummary,
    opts.workspaceContext,
    opts.activeWorkspacePath,
    opts.consoleLogs,
    opts.bugfixEvidenceEvents,
    opts.showPostInterviewDiscussion,
    opts.realInterviewMode,
    opts.strictTimeLimit,
    opts.strictDeadlineAt,
    opts.paused,
    opts.interviewerInput,
    opts.chatInput,
    opts.testRunRevision,
    opts.ownerId,
    opts.currentSessionId,
    opts.selectedScenario?.id,
    opts.firebaseUser?.uid,
    opts.guestId,
    guidedProgress,
  ])

  useEffect(
    () => () => {
      clearTimeout(maxWait.current)
      maxWait.current = undefined
    },
    [
      enabled,
      opts.currentSessionId,
      opts.selectedScenario?.id,
      opts.firebaseUser?.uid,
      opts.guestId,
    ]
  )
  return { saveLocal, localSaveFailed }
}
