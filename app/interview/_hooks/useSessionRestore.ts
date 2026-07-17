import { useEffect, type Dispatch, type SetStateAction } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import type { ReadonlyURLSearchParams } from "next/navigation"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { toast } from "sonner"
import type { Scenario } from "@/lib/scenarios"
import { getSessionState, findLatestSubmittedSession } from "@/lib/firestore-helpers"
import type { BugfixEvidenceEvent } from "@/lib/bugfix"
import { isWorkspaceScenario } from "../_utils/workspace"
import type { EditorLanguage } from "../_utils/language"
import type {
  ChatMessage,
  ConsoleLogEntry,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../_types"

export interface UseSessionRestoreOptions {
  // Identity / gating (dep-array values)
  firebaseUser: FirebaseUser | null
  isGuestMode: boolean
  guestId: string | null
  selectedScenario: Scenario | null
  searchParams: ReadonlyURLSearchParams | null
  isInterviewStarted: boolean
  router: AppRouterInstance

  // Page state reads (not in dep array)
  selectedLanguage: EditorLanguage

  // Page state setters
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>
  setCode: Dispatch<SetStateAction<string>>
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setSelectedLanguage: Dispatch<SetStateAction<EditorLanguage>>
  setTestResults: Dispatch<SetStateAction<TestResult[]>>
  setWorkspaceContext: Dispatch<SetStateAction<WorkspaceContextFile[]>>
  setActiveWorkspacePath: Dispatch<SetStateAction<string | null>>
  setConsoleLogs: Dispatch<SetStateAction<ConsoleLogEntry[]>>
  setBugfixEvidenceEvents: Dispatch<SetStateAction<BugfixEvidenceEvent[]>>
  setElapsedTime: (value: number) => void
  setTestSummary: Dispatch<SetStateAction<TestSummary>>
  setShowPostInterviewDiscussion: Dispatch<SetStateAction<boolean>>
  setIsInterviewStarted: Dispatch<SetStateAction<boolean>>
  setShowScenarioBrowser: Dispatch<SetStateAction<boolean>>

  // Refs
  recordedBugfixEditPathsRef: { current: Set<string> }
}

/**
 * Owns the on-mount restore effect: redirects consumed/evaluating sessions to
 * results, then rehydrates the most recent save (remote Firestore/guest-API vs
 * local autosave). The two rehydration blocks differ intentionally (remote
 * casts + reads `language`; local reads `selectedLanguage` + has a
 * primaryFilePath fallback) and are kept inline verbatim from page.tsx.
 */
export function useSessionRestore(opts: UseSessionRestoreOptions) {
  // Restore auto-saved session on mount (check both localStorage and Firestore/API)
  useEffect(() => {
    // Allow restoration for both authenticated users and guests
    if (!opts.selectedScenario || opts.isInterviewStarted) return
    if (!opts.firebaseUser && !opts.isGuestMode) return

    const selectedScenario = opts.selectedScenario

    const restoreSession = async () => {
      try {
        const sessionIdFromUrl = opts.searchParams?.get("session")

        // Check if there's already a completed session for this scenario
        // This prevents old chat history from bleeding into new sessions
        if (opts.firebaseUser && !sessionIdFromUrl) {
          const existingSession = await findLatestSubmittedSession(
            opts.firebaseUser.uid,
            selectedScenario.id
          )
          if (existingSession) {
            // There's an existing session - handle based on state
            if (existingSession.isEvaluating) {
              // Session is being evaluated - redirect to results
              toast.info("Session is being evaluated", {
                description: "Redirecting to your results...",
              })
              opts.router.push(`/sessions/${existingSession.sessionId}`)
              return
            }
            // Session is completed - clear old autosave and start fresh
            // This is critical: when a user opens a problem they've already completed,
            // we must NOT restore old chat messages from the previous session
            const storageKey = `interview_autosave_${opts.firebaseUser.uid}_${selectedScenario.id}`
            localStorage.removeItem(storageKey)
            // Don't restore anything - let user start fresh
            return
          }
        }

        let localData = null
        let localTimestamp = 0
        let remoteData = null
        let remoteTimestamp = 0

        if (opts.firebaseUser) {
          // Authenticated user - check localStorage with user-specific key
          const storageKey = `interview_autosave_${opts.firebaseUser.uid}_${selectedScenario.id}`
          const savedData = localStorage.getItem(storageKey)

          if (savedData) {
            const parsed = JSON.parse(savedData)
            const timeSinceLastSave = Date.now() - parsed.timestamp
            if (timeSinceLastSave < 24 * 60 * 60 * 1000) {
              localData = parsed
              localTimestamp = parsed.timestamp
            } else {
              localStorage.removeItem(storageKey)
            }
          }

          // Check Firestore if we have a session ID in URL
          if (sessionIdFromUrl) {
            const firestoreState = await getSessionState(sessionIdFromUrl)

            // If session was already submitted, redirect to results page
            if (firestoreState?.completedAt) {
              toast.info("Session already submitted", {
                description: "Redirecting to your results...",
              })
              opts.router.push(`/sessions/${sessionIdFromUrl}`)
              return
            }

            // If session is being evaluated (submitted but feedback pending), redirect to session page
            // This prevents users from being put back into interview mode during evaluation
            if (firestoreState?.feedbackStatus === "pending") {
              toast.info("Session is being evaluated", {
                description: "Redirecting to your results page...",
              })
              opts.router.push(`/sessions/${sessionIdFromUrl}`)
              return
            }

            if (firestoreState?.savedAt) {
              remoteData = firestoreState
              remoteTimestamp = new Date(firestoreState.savedAt).getTime()
              opts.setCurrentSessionId(sessionIdFromUrl)
            }
          }
        } else if (opts.isGuestMode && opts.guestId) {
          // Guest user - check localStorage with guest-specific key
          const storageKey = `interview_autosave_guest_${selectedScenario.id}`
          const savedData = localStorage.getItem(storageKey)

          if (savedData) {
            const parsed = JSON.parse(savedData)
            const timeSinceLastSave = Date.now() - parsed.timestamp
            // Guest sessions expire after 24 hours
            if (timeSinceLastSave < 24 * 60 * 60 * 1000) {
              localData = parsed
              localTimestamp = parsed.timestamp
            } else {
              localStorage.removeItem(storageKey)
            }
          }

          // Check API for saved session state (guest sessions)
          if (sessionIdFromUrl) {
            try {
              const response = await fetch(
                `/api/guest-session?sessionId=${sessionIdFromUrl}&guestId=${opts.guestId}`
              )
              if (response.ok) {
                const data = await response.json()

                // If session was already submitted, redirect to results page
                if (data.session?.completed_at) {
                  toast.info("Session already submitted", {
                    description: "Redirecting to your results...",
                  })
                  opts.router.push(`/sessions/${sessionIdFromUrl}`)
                  return
                }

                // If session is being evaluated, redirect to session page
                if (data.session?.feedback_status === "pending") {
                  toast.info("Session is being evaluated", {
                    description: "Redirecting to your results page...",
                  })
                  opts.router.push(`/sessions/${sessionIdFromUrl}`)
                  return
                }

                if (data.session?.session_state) {
                  remoteData = {
                    code: data.session.session_state.code,
                    chatMessages: data.session.session_state.chat_messages,
                    interviewerMessages: data.session.session_state.interviewer_messages,
                    language: data.session.session_state.language,
                    elapsedTime: data.session.session_state.elapsed_time,
                    testResults: data.session.session_state.test_results,
                    testSummary: data.session.session_state.test_summary,
                    workspaceContext: data.session.session_state.workspace_context,
                    activeWorkspacePath: data.session.session_state.active_workspace_path,
                    consoleLogs: data.session.session_state.console_logs,
                    bugfixEvidenceEvents: data.session.session_state.bugfix_evidence_events,
                    isPostInterviewDiscussion:
                      data.session.session_state.is_post_interview_discussion,
                    savedAt: data.session.session_state.saved_at,
                  }
                  remoteTimestamp = new Date(data.session.session_state.saved_at).getTime()
                  opts.setCurrentSessionId(sessionIdFromUrl)
                }
              }
            } catch (err) {
              console.error("Failed to fetch guest session state:", err)
            }
          }
        }

        // Use the most recent save (prefer remote if same time for cross-device)
        const useRemote = remoteData && (!localData || remoteTimestamp >= localTimestamp)

        if (useRemote && remoteData) {
          opts.setCode(remoteData.code || "")
          opts.setChatMessages((remoteData.chatMessages as ChatMessage[]) || [])
          opts.setInterviewerMessages((remoteData.interviewerMessages as ChatMessage[]) || [])
          opts.setSelectedLanguage(
            (remoteData.language as typeof opts.selectedLanguage) || "javascript"
          )
          opts.setTestResults(remoteData.testResults || [])
          opts.setWorkspaceContext(remoteData.workspaceContext || [])
          if (remoteData.workspaceContext?.length) {
            opts.setActiveWorkspacePath(
              remoteData.activeWorkspacePath || remoteData.workspaceContext[0].path
            )
          }
          opts.setConsoleLogs(remoteData.consoleLogs || [])
          opts.setBugfixEvidenceEvents(
            (remoteData.bugfixEvidenceEvents as BugfixEvidenceEvent[]) || []
          )
          opts.recordedBugfixEditPathsRef.current = new Set(
            ((remoteData.bugfixEvidenceEvents as BugfixEvidenceEvent[]) || [])
              .filter((event) => event.type === "file_edited" && event.filePath)
              .map((event) => event.filePath as string)
          )
          if (remoteData.elapsedTime) {
            opts.setElapsedTime(remoteData.elapsedTime)
          }
          // Restore test summary if available
          if (remoteData.testSummary) {
            opts.setTestSummary(remoteData.testSummary)
          }
          // Restore post-interview discussion state
          if (remoteData.isPostInterviewDiscussion) {
            opts.setShowPostInterviewDiscussion(true)
            opts.setIsInterviewStarted(true)
            opts.setShowScenarioBrowser(false)
            toast.info("Post-interview discussion restored", {
              description: "Continue your discussion with the interviewer.",
            })
          } else {
            toast.info("Session restored from cloud backup", {
              description: "Your progress was saved. Continue where you left off!",
            })
          }
        } else if (localData) {
          opts.setCode(localData.code || "")
          opts.setChatMessages(localData.chatMessages || [])
          opts.setInterviewerMessages(localData.interviewerMessages || [])
          opts.setSelectedLanguage(localData.selectedLanguage || "javascript")
          opts.setTestResults(localData.testResults || [])
          opts.setWorkspaceContext(localData.workspaceContext || [])
          if (localData.workspaceContext?.length) {
            const restoredPrimary =
              isWorkspaceScenario(selectedScenario) &&
              localData.workspaceContext.find(
                (file: WorkspaceContextFile) =>
                  file.path === selectedScenario.workspace.primaryFilePath
              )
            opts.setActiveWorkspacePath(
              localData.activeWorkspacePath ||
                restoredPrimary?.path ||
                localData.workspaceContext[0].path
            )
          }
          opts.setConsoleLogs(localData.consoleLogs || [])
          opts.setBugfixEvidenceEvents(localData.bugfixEvidenceEvents || [])
          opts.recordedBugfixEditPathsRef.current = new Set(
            (localData.bugfixEvidenceEvents || [])
              .filter(
                (event: BugfixEvidenceEvent) => event.type === "file_edited" && event.filePath
              )
              .map((event: BugfixEvidenceEvent) => event.filePath as string)
          )
          if (localData.elapsedTime) {
            opts.setElapsedTime(localData.elapsedTime)
          }
          // Restore test summary if available
          if (localData.testSummary) {
            opts.setTestSummary(localData.testSummary)
          }
          // Restore post-interview discussion state
          if (localData.isPostInterviewDiscussion) {
            opts.setShowPostInterviewDiscussion(true)
            opts.setIsInterviewStarted(true)
            opts.setShowScenarioBrowser(false)
            toast.info("Post-interview discussion restored", {
              description: "Continue your discussion with the interviewer.",
            })
          } else {
            toast.info("Session restored from auto-save", {
              description: "Your local progress was recovered.",
            })
          }
        }
      } catch (error) {
        console.error("Failed to restore auto-saved session:", error)
        toast.error("Could not restore session", {
          description: "Starting fresh. Previous progress may be lost.",
        })
      }
    }

    restoreSession()
  }, [
    opts.firebaseUser,
    opts.isGuestMode,
    opts.guestId,
    opts.selectedScenario,
    opts.searchParams,
    opts.isInterviewStarted,
    opts.router,
  ])
}
