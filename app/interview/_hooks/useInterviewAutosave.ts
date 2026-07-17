import { useEffect, useRef } from "react"
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

  // Auto-save session data every 30 seconds (localStorage + Firestore/API)
  useEffect(() => {
    // Allow auto-save for both authenticated users and guests
    if (!opts.isInterviewStarted || !opts.selectedScenario) return
    if (!opts.firebaseUser && !opts.isGuestMode) return

    const autoSaveInterval = setInterval(async () => {
      const opts = optsRef.current
      const selectedScenario = opts.selectedScenario
      if (!selectedScenario) return
      try {
        const sessionData = {
          scenarioId: selectedScenario.id,
          code: opts.code,
          chatMessages: opts.chatMessages,
          interviewerMessages: opts.interviewerMessages,
          selectedLanguage: opts.selectedLanguage,
          elapsedTime: opts.elapsedTime,
          testResults: opts.testResults,
          testSummary: opts.testSummary,
          workspaceContext: opts.workspaceContext,
          activeWorkspacePath: opts.activeWorkspacePath,
          consoleLogs: opts.consoleLogs,
          bugfixEvidenceEvents: opts.bugfixEvidenceEvents,
          isPostInterviewDiscussion: opts.showPostInterviewDiscussion,
          timestamp: Date.now(),
        }

        if (opts.firebaseUser) {
          // Authenticated user - save to localStorage with user-specific key
          const storageKey = `interview_autosave_${opts.firebaseUser.uid}_${selectedScenario.id}`
          localStorage.setItem(storageKey, JSON.stringify(sessionData))

          // Also save to Firestore if we have a session ID (for cross-device recovery)
          if (opts.currentSessionId) {
            await saveSessionState(opts.currentSessionId, {
              code: opts.code,
              selectedLanguage: opts.selectedLanguage,
              elapsedTime: opts.elapsedTime,
              chatMessages: opts.chatMessages,
              interviewerMessages: opts.interviewerMessages,
              testResults: opts.testResults,
              testSummary: opts.testSummary,
              workspaceContext: opts.workspaceContext,
              activeWorkspacePath: opts.activeWorkspacePath,
              consoleLogs: opts.consoleLogs,
              bugfixEvidenceEvents: opts.bugfixEvidenceEvents,
              isPostInterviewDiscussion: opts.showPostInterviewDiscussion,
              realInterviewMode: opts.realInterviewMode,
              strictTimeLimit: opts.strictTimeLimit,
            })
          }
        } else if (opts.isGuestMode && opts.guestId) {
          // Guest user - save to localStorage with guest-specific key
          const storageKey = `interview_autosave_guest_${selectedScenario.id}`
          localStorage.setItem(storageKey, JSON.stringify(sessionData))

          // Also save state to Firestore via API (for session recovery)
          if (opts.currentSessionId) {
            await fetch("/api/guest-session", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sessionId: opts.currentSessionId,
                guestId: opts.guestId,
                sessionState: {
                  code: opts.code,
                  language: opts.selectedLanguage,
                  elapsedTime: opts.elapsedTime,
                  chatMessages: opts.chatMessages.slice(-20), // Limit messages
                  interviewerMessages: opts.interviewerMessages.slice(-20),
                  testResults: opts.testResults.slice(-10),
                  testSummary: opts.testSummary,
                  workspaceContext: opts.workspaceContext,
                  activeWorkspacePath: opts.activeWorkspacePath,
                  consoleLogs: opts.consoleLogs,
                  bugfixEvidenceEvents: opts.bugfixEvidenceEvents,
                  isPostInterviewDiscussion: opts.showPostInterviewDiscussion,
                  realInterviewMode: opts.realInterviewMode,
                  strictTimeLimit: opts.strictTimeLimit,
                },
              }),
            })
          }
        }
      } catch (error) {
        console.error("Auto-save failed:", error)
      }
    }, 30000) // 30 seconds

    // Cleanup on unmount
    return () => {
      clearInterval(autoSaveInterval)
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
}
