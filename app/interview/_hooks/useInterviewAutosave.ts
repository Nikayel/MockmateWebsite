import { useCallback, useEffect, useRef } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import type { Scenario } from "@/lib/scenarios"
import { saveSessionState } from "@/lib/firestore-helpers"
import type { BugfixEvidenceEvent } from "@/lib/bugfix"
import type { EditorLanguage } from "../_utils/language"
import type {
  ChatMessage,
  ConsoleLogEntry,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../_types"

export interface UseInterviewAutosaveOptions {
  // Gating / identity
  isInterviewStarted: boolean
  selectedScenario: Scenario | null
  firebaseUser: FirebaseUser | null
  isGuestMode: boolean
  guestId: string | null
  currentSessionId: string | null

  // Session payload reads
  code: string
  chatMessages: ChatMessage[]
  interviewerMessages: ChatMessage[]
  selectedLanguage: EditorLanguage
  elapsedTime: number
  testResults: TestResult[]
  testSummary: TestSummary
  workspaceContext: WorkspaceContextFile[]
  activeWorkspacePath: string | null
  consoleLogs: ConsoleLogEntry[]
  bugfixEvidenceEvents: BugfixEvidenceEvent[]
  showPostInterviewDiscussion: boolean

  // Read-but-omitted from deps (see dep array below)
  realInterviewMode: boolean
  strictTimeLimit: number | null
  interviewerInput?: string
  chatInput?: string
  canCheckpoint?: boolean
  ownerId?: string
  testRunRevision?: string | null
  strictDeadlineAt?: number | null
  paused?: boolean
}

/**
 * Owns the 30s autosave effect: persists the in-progress session to
 * localStorage and, when a session id exists, to Firestore (authed) or the
 * guest-session API. Extracted verbatim from page.tsx; the session-state
 * contract literals are kept inline so the payload-contract scanner sees them.
 */
export function useInterviewAutosave(opts: UseInterviewAutosaveOptions) {
  // Keep the latest options in a ref so the 30s interval reads fresh values
  // without the effect being torn down on every render. The interview clock
  // ticks `elapsedTime` every second; the deps array used to include it (and
  // every other payload field), so the 30s timer was cleared and recreated each
  // tick and never fired — no autosave ever ran (EDGE-1). The effect now keys
  // only on session identity and the callback reads `optsRef.current`.
  const optsRef = useRef(opts)
  optsRef.current = opts

  // Fingerprint of the last payload written remotely, keyed by session id.
  // Without it every 30s tick rewrote the full session document (chat, console
  // logs, workspace, test results) whether or not anything changed — 120 large
  // Firestore writes per hour-long interview spent idle or thinking.
  const lastRemoteSaveRef = useRef<{ sessionId: string; fingerprint: string } | null>(null)

  const pendingSaveRef = useRef<Promise<unknown>>(Promise.resolve())
  const saveNow = useCallback((force = true) => {
    const opts = optsRef.current
    const selectedScenario = opts.selectedScenario
    if (!selectedScenario || opts.canCheckpoint === false)
      return Promise.resolve({ localSaved: false, cloudSaved: false })
    let localSaved = false
    // Everything the remote save persists except the clock. elapsedTime
    // advances every second, so including it would defeat the dirty check;
    // it is only worth a remote write when real content changed with it.
    const remoteFingerprint = JSON.stringify({
      scenarioId: selectedScenario.id,
      code: opts.code,
      chatMessages: opts.chatMessages.filter((message) => !message.isStreaming),
      interviewerMessages: opts.interviewerMessages.filter((message) => !message.isStreaming),
      selectedLanguage: opts.selectedLanguage,
      testResults: opts.testResults,
      testSummary: opts.testSummary,
      workspaceContext: opts.workspaceContext,
      activeWorkspacePath: opts.activeWorkspacePath,
      consoleLogs: opts.consoleLogs,
      bugfixEvidenceEvents: opts.bugfixEvidenceEvents,
      isPostInterviewDiscussion: opts.showPostInterviewDiscussion,
      testRunRevision: opts.testRunRevision ?? null,
      realInterviewMode: opts.realInterviewMode,
      strictTimeLimit: opts.strictTimeLimit,
      strictDeadlineAt: opts.strictDeadlineAt,
      paused: opts.paused ?? false,
      interviewerInput: opts.interviewerInput ?? "",
      chatInput: opts.chatInput ?? "",
    })
    const remoteDirty =
      force ||
      !opts.currentSessionId ||
      lastRemoteSaveRef.current?.sessionId !== opts.currentSessionId ||
      lastRemoteSaveRef.current?.fingerprint !== remoteFingerprint
    const sessionData = {
      sessionId: opts.currentSessionId,
      ownerId: opts.ownerId,
      scenarioId: selectedScenario.id,
      code: opts.code,
      chatMessages: opts.chatMessages.filter((message) => !message.isStreaming),
      interviewerMessages: opts.interviewerMessages.filter((message) => !message.isStreaming),
      selectedLanguage: opts.selectedLanguage,
      elapsedTime: opts.elapsedTime,
      testResults: opts.testResults,
      testSummary: opts.testSummary,
      workspaceContext: opts.workspaceContext,
      activeWorkspacePath: opts.activeWorkspacePath,
      consoleLogs: opts.consoleLogs,
      bugfixEvidenceEvents: opts.bugfixEvidenceEvents,
      isPostInterviewDiscussion: opts.showPostInterviewDiscussion,
      testRunRevision: opts.testRunRevision ?? null,
      realInterviewMode: opts.realInterviewMode,
      strictTimeLimit: opts.strictTimeLimit,
      strictDeadlineAt: opts.strictDeadlineAt,
      paused: opts.paused ?? false,
      interviewerInput: opts.interviewerInput ?? "",
      chatInput: opts.chatInput ?? "",
      timestamp: Date.now(),
    }
    try {
      const storageKey = opts.firebaseUser
        ? `interview_autosave_${opts.firebaseUser.uid}_${selectedScenario.id}`
        : `interview_autosave_guest_${selectedScenario.id}`
      localStorage.setItem(storageKey, JSON.stringify(sessionData))
      localSaved = true
    } catch {
      /* Remote persistence can still succeed when storage is unavailable. */
    }
    const persist = async () => {
      try {
        if (opts.firebaseUser) {
          // Authenticated user - save to localStorage with user-specific key

          // Also save to Firestore if we have a session ID (for cross-device
          // recovery) - but only when something other than the clock changed.
          // localStorage above still saves every tick, so elapsedTime recovery
          // on the same device stays fresh.
          if (opts.currentSessionId && remoteDirty) {
            await saveSessionState(opts.currentSessionId, {
              code: opts.code,
              selectedLanguage: opts.selectedLanguage,
              elapsedTime: opts.elapsedTime,
              chatMessages: opts.chatMessages.filter((message) => !message.isStreaming),
              interviewerMessages: opts.interviewerMessages.filter(
                (message) => !message.isStreaming
              ),
              testResults: opts.testResults,
              testSummary: opts.testSummary,
              workspaceContext: opts.workspaceContext,
              activeWorkspacePath: opts.activeWorkspacePath,
              consoleLogs: opts.consoleLogs,
              bugfixEvidenceEvents: opts.bugfixEvidenceEvents,
              isPostInterviewDiscussion: opts.showPostInterviewDiscussion,
              realInterviewMode: opts.realInterviewMode,
              strictTimeLimit: opts.strictTimeLimit,
              ownerId: opts.ownerId,
              testRunRevision: opts.testRunRevision,
              strictDeadlineAt: opts.strictDeadlineAt,
              paused: opts.paused,
              interviewerInput: opts.interviewerInput,
              chatInput: opts.chatInput,
            })
          }
        } else if (opts.isGuestMode && opts.guestId) {
          // Guest user - save to localStorage with guest-specific key

          // Also save state to Firestore via API (for session recovery)
          if (opts.currentSessionId && remoteDirty) {
            const response = await fetch("/api/guest-session", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: opts.currentSessionId,
                guestId: opts.guestId,
                sessionState: {
                  code: opts.code,
                  language: opts.selectedLanguage,
                  elapsedTime: opts.elapsedTime,
                  chatMessages: opts.chatMessages.filter((message) => !message.isStreaming),
                  interviewerMessages: opts.interviewerMessages.filter(
                    (message) => !message.isStreaming
                  ),
                  testResults: opts.testResults.slice(-10),
                  testSummary: opts.testSummary,
                  workspaceContext: opts.workspaceContext,
                  activeWorkspacePath: opts.activeWorkspacePath,
                  consoleLogs: opts.consoleLogs,
                  bugfixEvidenceEvents: opts.bugfixEvidenceEvents,
                  isPostInterviewDiscussion: opts.showPostInterviewDiscussion,
                  realInterviewMode: opts.realInterviewMode,
                  strictTimeLimit: opts.strictTimeLimit,
                  testRunRevision: opts.testRunRevision,
                  strictDeadlineAt: opts.strictDeadlineAt,
                  paused: opts.paused,
                  interviewerInput: opts.interviewerInput,
                  chatInput: opts.chatInput,
                },
              }),
            })
            if (!response.ok) throw new Error("Session backup failed")
          }
        }

        if (opts.currentSessionId && remoteDirty) {
          lastRemoteSaveRef.current = {
            sessionId: opts.currentSessionId,
            fingerprint: remoteFingerprint,
          }
        }
        return { localSaved, cloudSaved: !!opts.currentSessionId }
      } catch (error) {
        console.error("Auto-save failed:", error)
        return { localSaved, cloudSaved: false }
      }
    }
    // Serialize writes so a slow older snapshot cannot overwrite a newer checkpoint.
    const pending = pendingSaveRef.current.then(persist, persist)
    pendingSaveRef.current = pending
    let timeout: ReturnType<typeof setTimeout>
    const deadline = new Promise<{ localSaved: boolean; cloudSaved: boolean }>((resolve) => {
      timeout = setTimeout(() => resolve({ localSaved, cloudSaved: false }), 8000)
    })
    return Promise.race([pending, deadline]).finally(() => clearTimeout(timeout))
  }, [])

  useEffect(() => {
    if (!opts.isInterviewStarted || !opts.selectedScenario) return
    if (!opts.firebaseUser && !opts.isGuestMode) return
    const autoSaveInterval = setInterval(() => {
      void saveNow(false)
    }, 30000)
    const saveWhenHidden = () => {
      if (document.visibilityState === "hidden") void saveNow()
    }
    document.addEventListener("visibilitychange", saveWhenHidden)

    const identity = {
      sessionId: opts.currentSessionId,
      scenarioId: opts.selectedScenario.id,
      userId: opts.firebaseUser?.uid,
    }
    // Navigation inside the app does not fire visibilitychange. Flush the live attempt,
    // while avoiding a cleared reset or a different attempt that replaced this effect.
    return () => {
      clearInterval(autoSaveInterval)
      document.removeEventListener("visibilitychange", saveWhenHidden)
      const current = optsRef.current
      if (
        current.isInterviewStarted &&
        current.currentSessionId === identity.sessionId &&
        current.selectedScenario?.id === identity.scenarioId &&
        current.firebaseUser?.uid === identity.userId
      )
        void saveNow(false)
    }
    // Interval keyed ONLY on session identity — payload fields are read from
    // optsRef.current inside the callback so a value change (e.g. the 1s clock)
    // never tears down the 30s timer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    opts.isInterviewStarted,
    opts.selectedScenario?.id,
    opts.currentSessionId,
    opts.firebaseUser?.uid,
    opts.isGuestMode,
    opts.guestId,
  ])
  return { saveNow }
}
