import { useEffect, type Dispatch, type SetStateAction } from "react"
import type { User as FirebaseUser } from "firebase/auth"
import type { ReadonlyURLSearchParams } from "next/navigation"
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime"
import { toast } from "sonner"
import type { User } from "@/lib/types"
import { trackEvent } from "@/lib/analytics"
import { useInterviewStore, type InterviewTargetCompany } from "@/lib/stores"
import { getScenarioById } from "@/lib/scenarios/index"
import type { Scenario } from "@/lib/scenarios/types"
import { getSessionState, findLatestSubmittedSession } from "@/lib/firestore-helpers"
import { createBugfixEvidenceEvent, type BugfixEvidenceEvent } from "@/lib/bugfix"
import { getBugfixScenarioLanguage, type EditorLanguage } from "../_utils/language"
import {
  isWorkspaceScenario,
  toWorkspaceContextFiles,
  toWorkspaceScenarioFiles,
} from "../_utils/workspace"
import { getInitialInterviewerMessage } from "../_utils/interview-messages"
import type {
  ChatMessage,
  ConsoleLogEntry,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../_types"

export interface UseSessionReopenOptions {
  // Navigation + auth + entitlement (dep-array values)
  router: AppRouterInstance
  searchParams: ReadonlyURLSearchParams | null
  firebaseUser: FirebaseUser | null
  authLoading: boolean
  initialized: boolean
  authCheckComplete: boolean

  // Page state reads (not in dep array)
  user: User | null
  selectedLanguage: EditorLanguage
  consoleLogs: ConsoleLogEntry[]

  // Guest-quota callbacks (injected)
  canStartGuestTrial: () => boolean
  enterGuestMode: () => string
  exitGuestMode: () => void
  refreshUsageLimit: (uid: string) => Promise<void>

  // Session-start callback (plain value, not memoized)
  startInterview: (
    scenarioOverride?: Scenario,
    companyOverride?: InterviewTargetCompany
  ) => void | Promise<void>

  /**
   * True when this tab is already displaying the given session's submitted
   * state (feedback view or the guest lock panel). Read through a stable
   * getter, not a dep-array value: it exists for the moment a guest signs in
   * from the post-trial prompt — firebaseUser flips, this effect re-runs, and
   * without the check it would reload the completed session and redirect to
   * /sessions/{id} mid-handoff, off the very results the sign-in unlocks.
   */
  isShowingCompletedSession: (sessionId: string) => boolean

  // Bugfix reset callback
  resetBugfixSessionState: () => void

  // Page state setters
  setIsLoading: Dispatch<SetStateAction<boolean>>
  setSelectedScenario: Dispatch<SetStateAction<Scenario | null>>
  setShowOptimalApproach: Dispatch<SetStateAction<boolean>>
  setCurrentSessionId: Dispatch<SetStateAction<string | null>>
  setShowScenarioBrowser: Dispatch<SetStateAction<boolean>>
  setIsInterviewStarted: Dispatch<SetStateAction<boolean>>
  setStartTime: (value: number | null) => void
  setSelectedLanguage: Dispatch<SetStateAction<EditorLanguage>>
  setWorkspaceContext: Dispatch<SetStateAction<WorkspaceContextFile[]>>
  setActiveWorkspacePath: Dispatch<SetStateAction<string | null>>
  setCode: Dispatch<SetStateAction<string>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setElapsedTime: (value: number) => void
  setTestResults: Dispatch<SetStateAction<TestResult[]>>
  setTestSummary: Dispatch<SetStateAction<TestSummary>>
  setConsoleLogs: Dispatch<SetStateAction<ConsoleLogEntry[]>>
  setBugfixEvidenceEvents: Dispatch<SetStateAction<BugfixEvidenceEvent[]>>
  setShowPostInterviewDiscussion: Dispatch<SetStateAction<boolean>>

  // Refs
  recordedBugfixEditPathsRef: { current: Set<string> }
}

/**
 * Owns the auth-check + session-reopen effect: gates guest entry, redirects
 * consumed/evaluating sessions to results, and rehydrates a reopened session
 * or starts a fresh roadmap/practice run. Extracted verbatim from page.tsx;
 * all state/refs stay in the page and are injected via `opts`.
 */
export function useSessionReopen(opts: UseSessionReopenOptions) {
  // Check authentication and usage limit, handle session reopening
  useEffect(() => {
    const checkAuth = async () => {
      if (opts.authLoading || !opts.initialized || !opts.authCheckComplete) return

      if (!opts.firebaseUser) {
        // Check if guest can start free trial
        const canTrial = opts.canStartGuestTrial()
        if (canTrial) {
          // Allow guest mode
          const guestId = opts.enterGuestMode()

          // The page writes ?session&scenario into the URL for guests too, so
          // a mid-trial refresh arrives here carrying both. Returning without
          // honoring them left ScenarioBrowser's resume notice spinning
          // forever while the guest's work sat saved on the server. The
          // signed-in reopen below cannot serve them (its Firestore read is
          // permission-denied for guest-owned docs), so guests rehydrate from
          // their own API here.
          const guestSessionId = opts.searchParams?.get("session")
          const guestScenarioId = opts.searchParams?.get("scenario")
          if (guestSessionId && guestScenarioId) {
            if (opts.isShowingCompletedSession(guestSessionId)) {
              opts.setIsLoading(false)
              return
            }

            const scenario = await getScenarioById(guestScenarioId)
            let sessionState: Record<string, any> | null = null
            let completedAt: string | null = null
            try {
              const response = await fetch(
                `/api/guest-session?sessionId=${encodeURIComponent(guestSessionId)}&guestId=${encodeURIComponent(guestId)}`
              )
              if (response.ok) {
                const data = await response.json()
                sessionState = data.session?.session_state ?? null
                completedAt = data.session?.completed_at ?? null
              }
            } catch {
              // Offline or API down: fall through to a fresh start below.
            }

            if (!scenario || completedAt) {
              // Unknown scenario, or a trial that was already submitted (a
              // guest cannot view /sessions): drop the stale params so the
              // browser's resume notice cannot key off them forever.
              opts.router.replace("/interview")
              opts.setIsLoading(false)
              return
            }

            opts.setSelectedScenario(scenario)
            opts.setShowOptimalApproach(false)
            opts.setCurrentSessionId(guestSessionId)
            opts.setShowScenarioBrowser(false)
            opts.setIsInterviewStarted(true)
            opts.setStartTime(Date.now())

            // Guests only reach the DSA and Debugging tracks, so the code
            // init covers bugfix and default starter code; workspace and
            // system-design scenarios never start as guest trials.
            let initialCode: string
            if (scenario.type === "bugfix") {
              const scenarioLanguage = getBugfixScenarioLanguage(scenario, opts.selectedLanguage)
              if (scenarioLanguage !== opts.selectedLanguage) {
                opts.setSelectedLanguage(scenarioLanguage)
              }
              initialCode =
                (scenario as any).buggyCode?.[scenarioLanguage] ||
                `// Bug fix code not available for ${scenarioLanguage}`
              const codebaseFiles = (scenario as any).codebaseFiles?.[scenarioLanguage] || []
              if (codebaseFiles.length > 0) {
                opts.setWorkspaceContext(toWorkspaceContextFiles(codebaseFiles))
              }
            } else {
              initialCode =
                (scenario as any).starterCode?.[opts.selectedLanguage] ||
                `function solution() {
  // Write your solution here

}`
            }

            const problemType =
              scenario.type === "bugfix"
                ? "BUG FIX"
                : scenario.type === "add-functionality"
                  ? "ADD FUNCTIONALITY"
                  : scenario.type.toUpperCase()
            const freshInterviewerMessage = {
              type: "ai" as const,
              message: getInitialInterviewerMessage(
                scenario.title,
                scenario.difficulty,
                problemType
              ),
            }

            if (sessionState) {
              opts.setCode(sessionState.code || initialCode)
              if (sessionState.language) {
                opts.setSelectedLanguage(sessionState.language as EditorLanguage)
              }
              opts.setInterviewerMessages(
                sessionState.interviewer_messages?.length
                  ? (sessionState.interviewer_messages as ChatMessage[])
                  : [freshInterviewerMessage]
              )
              opts.setChatMessages(
                sessionState.chat_messages?.length
                  ? (sessionState.chat_messages as ChatMessage[])
                  : []
              )
              if (sessionState.elapsed_time) {
                opts.setElapsedTime(sessionState.elapsed_time)
              }
              if (sessionState.test_results?.length) {
                opts.setTestResults(sessionState.test_results as TestResult[])
              }
              toast.success("Session resumed")
            } else {
              opts.setCode(initialCode)
              opts.setInterviewerMessages([freshInterviewerMessage])
              opts.setChatMessages([])
            }
          }

          opts.setIsLoading(false)
          return
        } else {
          // Free trial already used, require signup
          trackEvent("guest_trial_exhausted")
          opts.router.push("/login?redirect=interview&message=trial-used")
          return
        }
      }

      // Authenticated user - disable guest mode if it was set
      opts.exitGuestMode()

      // Check usage limit
      await opts.refreshUsageLimit(opts.firebaseUser.uid)

      // Check if we're reopening a session or starting from roadmap
      const sessionId = opts.searchParams?.get("session")
      const scenarioId = opts.searchParams?.get("scenario")
      const fromRoadmap = opts.searchParams?.get("roadmap") === "true"
      const fromPractice = opts.searchParams?.get("practice") === "true"
      const isPostInterviewResume = opts.searchParams?.get("postInterview") === "true"

      // Case 1: Reopening an existing session
      if (sessionId && scenarioId) {
        // Not a reopen at all: this tab already has the session's terminal
        // state on screen (see the option's doc). Signing in mid-page is the
        // one path that gets here — leave the page exactly as it is.
        if (opts.isShowingCompletedSession(sessionId)) {
          opts.setIsLoading(false)
          return
        }

        // Load the scenario and reopen the session
        const scenario = await getScenarioById(scenarioId)
        if (scenario) {
          opts.setSelectedScenario(scenario)
          opts.setShowOptimalApproach(false) // Reset optimal approach visibility
          opts.setCurrentSessionId(sessionId)
          opts.setShowScenarioBrowser(false)

          // Check if there's saved session state FIRST before starting interview
          const savedState = await getSessionState(sessionId)

          // Restore Real Interview Mode and strict time limit settings EARLY
          // This needs to happen before rendering so the UI shows the correct problem statement
          if (savedState?.realInterviewMode !== undefined) {
            useInterviewStore.getState().setRealInterviewMode(savedState.realInterviewMode)
          }
          if (savedState?.strictTimeLimit !== undefined) {
            useInterviewStore.getState().setStrictTimeLimit(savedState.strictTimeLimit)
          }

          // Now start the interview with restored state
          opts.setIsInterviewStarted(true)
          opts.setStartTime(Date.now())

          // CRITICAL: If session is completed or evaluating, redirect to results page
          // This prevents users from being put back into interview mode
          if (savedState?.completedAt || savedState?.feedbackStatus === "pending") {
            toast.info(
              savedState?.feedbackStatus === "pending"
                ? "Session is being evaluated"
                : "Session already submitted",
              { description: "Redirecting to your results..." }
            )
            opts.router.push(`/sessions/${sessionId}`)
            return
          }

          const hasExistingProgress =
            savedState &&
            ((savedState.interviewerMessages && savedState.interviewerMessages.length > 1) ||
              (savedState.chatMessages && savedState.chatMessages.length > 1) ||
              (savedState.elapsedTime && savedState.elapsedTime > 60))

          // Initialize code based on scenario type
          let initialCode: string
          if (isWorkspaceScenario(scenario)) {
            const scenarioLanguage = scenario.workspace.language
            // SQL workspace lessons are tutorial-only and never enter the interview editor.
            if (scenarioLanguage !== "sql" && scenarioLanguage !== opts.selectedLanguage) {
              opts.setSelectedLanguage(scenarioLanguage)
            }
            const contextFiles =
              hasExistingProgress && savedState?.workspaceContext?.length
                ? (savedState.workspaceContext as WorkspaceContextFile[])
                : toWorkspaceScenarioFiles(scenario)
            const activePath =
              savedState?.activeWorkspacePath ||
              scenario.workspace.primaryFilePath ||
              contextFiles[0]?.path
            const activeFile =
              contextFiles.find((file) => file.path === activePath) ||
              contextFiles.find((file) => file.path === scenario.workspace.primaryFilePath) ||
              contextFiles[0]

            initialCode = activeFile?.content || ""
            opts.setWorkspaceContext(contextFiles)
            opts.setActiveWorkspacePath(activeFile?.path || scenario.workspace.primaryFilePath)
          } else if (scenario.type === "bugfix") {
            const scenarioLanguage = getBugfixScenarioLanguage(scenario, opts.selectedLanguage)
            if (scenarioLanguage !== opts.selectedLanguage) {
              opts.setSelectedLanguage(scenarioLanguage)
            }
            initialCode =
              (scenario as any).buggyCode?.[scenarioLanguage] ||
              `// Bug fix code not available for ${scenarioLanguage}`
            const codebaseFiles = (scenario as any).codebaseFiles?.[scenarioLanguage] || []
            if (codebaseFiles.length > 0) {
              opts.setWorkspaceContext(toWorkspaceContextFiles(codebaseFiles))
            }
          } else if (scenario.type === "system-design") {
            // For system design, provide a design notes template
            initialCode = `// DESIGN NOTES: ${scenario.title}
// Use this space to document your design decisions

/* ============================================
   1. REQUIREMENTS CLARIFICATION
   ============================================ */
// Functional:
// -
//
// Non-Functional:
// - Scale:
// - Latency:
// - Availability:

/* ============================================
   2. HIGH-LEVEL ARCHITECTURE
   ============================================ */
// Key Components:
// 1.
// 2.
// 3.

/* ============================================
   3. DATA MODEL
   ============================================ */
// Tables/Collections:
//

/* ============================================
   4. API DESIGN
   ============================================ */
// Endpoints:
// POST /api/...
// GET /api/...

/* ============================================
   5. SCALING & TRADE-OFFS
   ============================================ */
// -
`
          } else {
            initialCode =
              (scenario as any).starterCode?.[opts.selectedLanguage] ||
              `function solution() {
  // Write your solution here

}`
          }

          // If there's saved code, use it; otherwise use starter code
          if (hasExistingProgress && savedState?.code) {
            opts.setCode(savedState.code)
            if (savedState.language) {
              opts.setSelectedLanguage(savedState.language as any)
            }
          } else {
            opts.setCode(initialCode)
          }

          // Initialize interviewer with appropriate message based on progress
          const problemType =
            scenario.type === "bugfix"
              ? "BUG FIX"
              : scenario.type === "add-functionality"
                ? "ADD FUNCTIONALITY"
                : scenario.type.toUpperCase()

          let initialMessage: string
          if (hasExistingProgress) {
            // True resume - user has made progress
            initialMessage = `Welcome back! I'm Sable, your interviewer. You're continuing your practice on **${scenario.title}** - a ${scenario.difficulty} ${problemType} problem.

You can continue where you left off. Feel free to:
- Ask me clarifying questions about the requirements
- Discuss your approach before coding
- Ask for hints if you get stuck

Let's continue!`

            // Restore previous messages if available
            if (savedState?.interviewerMessages && savedState.interviewerMessages.length > 0) {
              opts.setInterviewerMessages(
                savedState.interviewerMessages as Array<{ type: "ai" | "user"; message: string }>
              )
            } else {
              opts.setInterviewerMessages([{ type: "ai", message: initialMessage }])
            }
            if (savedState?.chatMessages && savedState.chatMessages.length > 0) {
              opts.setChatMessages(
                savedState.chatMessages as Array<{ type: "ai" | "user"; message: string }>
              )
            } else {
              opts.setChatMessages([
                {
                  type: "ai",
                  message: `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${scenario.title}. Just ask!`,
                },
              ])
            }
            // Restore elapsed time and test results
            if (savedState?.elapsedTime) {
              opts.setElapsedTime(savedState.elapsedTime)
            }
            if (savedState?.testResults && savedState.testResults.length > 0) {
              opts.setTestResults(savedState.testResults)
            }
            if (savedState?.testSummary) {
              opts.setTestSummary(savedState.testSummary)
            }
            if (savedState?.consoleLogs) {
              opts.setConsoleLogs(savedState.consoleLogs as typeof opts.consoleLogs)
            }
            if (scenario.type === "bugfix") {
              opts.setBugfixEvidenceEvents(
                (savedState.bugfixEvidenceEvents as unknown as BugfixEvidenceEvent[]) || []
              )
              opts.recordedBugfixEditPathsRef.current = new Set(
                ((savedState.bugfixEvidenceEvents as unknown as BugfixEvidenceEvent[]) || [])
                  .filter((event) => event.type === "file_edited" && event.filePath)
                  .map((event) => event.filePath as string)
              )
            }

            // If resuming post-interview discussion, show that view directly
            if (isPostInterviewResume && savedState?.isPostInterviewDiscussion) {
              opts.setShowPostInterviewDiscussion(true)
              // Restore test summary if available
              if (savedState.testSummary) {
                opts.setTestSummary(savedState.testSummary)
              }
              toast.success("Resuming post-interview discussion")
            } else {
              toast.success("Session resumed")
            }
          } else {
            // Fresh start - no previous progress
            const isDSAScenario = scenario.type === "dsa"
            initialMessage = getInitialInterviewerMessage(
              scenario.title,
              scenario.difficulty,
              problemType
            )

            if (scenario.type === "bugfix") {
              opts.resetBugfixSessionState()
              opts.setBugfixEvidenceEvents([
                createBugfixEvidenceEvent({ type: "session_started", timestamp: Date.now() }),
                createBugfixEvidenceEvent({ type: "incident_read", timestamp: Date.now() + 1 }),
              ])
            }

            opts.setInterviewerMessages([{ type: "ai", message: initialMessage }])
            if (!isDSAScenario) {
              opts.setChatMessages([
                {
                  type: "ai",
                  message: `Hi! I'm your AI coding partner. I can help with algorithms, debugging, and hints for ${scenario.title}. Just ask!`,
                },
              ])
            } else {
              opts.setChatMessages([]) // No AI partner for DSA
            }
          }
        } else {
          toast.error("Scenario not found")
        }
      }
      // Case 2: Starting fresh from roadmap or practice (scenario only, no session)
      else if (scenarioId && !sessionId && (fromRoadmap || fromPractice)) {
        const scenario = await getScenarioById(scenarioId)
        if (scenario) {
          // Check if there's already an evaluating session for this scenario
          // Only redirect if evaluating - otherwise let user start a new session
          if (opts.user?.id && !fromPractice) {
            const existingSession = await findLatestSubmittedSession(opts.user.id, scenarioId)
            if (existingSession?.isEvaluating) {
              toast.info("Session is being evaluated", {
                description: "Redirecting to your results...",
              })
              opts.router.push(`/sessions/${existingSession.sessionId}`)
              return
            }
            // If session was completed but not evaluating, allow user to start fresh
          }

          // Select the scenario and hide browser to show the problem view
          opts.setSelectedScenario(scenario)
          opts.setShowOptimalApproach(false) // Reset optimal approach visibility
          opts.setShowScenarioBrowser(false)

          // If from roadmap, call startInterview to trigger proper initialization
          // This will handle company selection, Real Interview Mode, etc.
          if (fromRoadmap) {
            // Small delay to ensure state is set before calling startInterview
            setTimeout(() => {
              opts.startInterview(scenario)
            }, 100)
          }
        } else {
          toast.error("Scenario not found")
          opts.setShowScenarioBrowser(true)
        }
      }

      opts.setIsLoading(false)
    }
    checkAuth()
  }, [
    opts.router,
    opts.searchParams,
    opts.firebaseUser,
    opts.authLoading,
    opts.initialized,
    opts.authCheckComplete,
  ])
}
