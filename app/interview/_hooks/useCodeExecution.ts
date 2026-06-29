import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"
import { analyzeCodeEfficiency } from "@/lib/interview"
import { isExecutionServiceError } from "@/lib/piston"
import { saveSessionState } from "@/lib/firestore-helpers"
import type { Scenario } from "@/lib/scenarios"
import type { BugfixEvidenceEvent } from "@/lib/bugfix"
import type {
  ChatMessage,
  ConsoleLogEntry,
  EditorLanguage,
  EfficiencyMetrics,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../_types"
import { applyExecutionApiError, executeScenario } from "./code-execution-helpers"
import { useGuidedLabStore } from "@/lib/stores/guided-lab-store"

/**
 * Feed workspace test results into the guided-lab gating store. For workspace
 * scenarios the execute API encodes each result's suite as `input`, so we map
 * that to {suite, passed}. No-op unless a guided lab is active.
 */
function applyGuidedLabGating(scenarioId: string | undefined, results: TestResult[]): void {
  const store = useGuidedLabStore.getState()
  if (!store.config || !scenarioId || store.scenarioId !== scenarioId) return
  store.applyTestResults(
    results.map((result) => ({ suite: String(result.input ?? ""), passed: result.passed }))
  )
}

/**
 * Inputs/dependencies for {@link useCodeExecution}. The interview page owns the
 * test/console/summary/efficiency state (it is read + written by restore,
 * reset, persistence, and system-design paths that live outside this hook), so
 * the setters are injected here. Cross-cutting effects owned by other slices
 * (chat messages, sounds, phase tracker, bugfix evidence, hint sync, session
 * persistence, post-interview discussion) are injected as callbacks so the run
 * / submit flow stays byte-identical to the previous inline implementation.
 */
export interface UseCodeExecutionOptions {
  // ---- live inputs read inside run / submit ----
  selectedScenario: Scenario | null
  code: string
  selectedLanguage: EditorLanguage
  workspaceContext: WorkspaceContextFile[]
  activeWorkspacePath: string | null
  elapsedTime: number
  chatMessages: ChatMessage[]
  interviewerMessages: ChatMessage[]
  consoleLogs: ConsoleLogEntry[]
  bugfixHypothesis: string
  bugfixRootCause: string
  bugfixPrevention: string
  realInterviewMode: boolean
  strictTimeLimit: number | null
  currentSessionId: string | null
  user: unknown | null
  firebaseUser: { uid: string } | null
  isGuestMode: boolean
  isFromRoadmap: boolean
  activeRoadmap: unknown | null

  // ---- state setters (page owns the state) ----
  setTestResults: Dispatch<SetStateAction<TestResult[]>>
  setConsoleLogs: Dispatch<SetStateAction<ConsoleLogEntry[]>>
  setIsRunningTests: Dispatch<SetStateAction<boolean>>
  setTestSummary: Dispatch<SetStateAction<TestSummary>>
  setEfficiencyMetrics: Dispatch<SetStateAction<EfficiencyMetrics | null>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>
  setShowPostInterviewDiscussion: Dispatch<SetStateAction<boolean>>

  // ---- injected cross-cutting effects (other slices) ----
  playSound: (type: "hint" | "success" | "fail" | "milestone") => void
  updateTrackerOnTestsRun: () => void
  recordBugfixEvidence: (
    event: Omit<BugfixEvidenceEvent, "timestamp"> & { timestamp?: number }
  ) => void
  buildBugfixEvidencePayload: () => BugfixEvidenceEvent[]
  syncHintAgentWithTestOutcome: (
    summary: { passed: number; total: number; failed: number },
    results: TestResult[] | undefined
  ) => void
  triggerPostInterviewDiscussion: (testResults: TestResult[], summary: any) => Promise<void> | void
  markQuestionEvaluating: (scenarioId: string) => void
}

export interface UseCodeExecutionReturn {
  runCode: () => Promise<void>
  submitCode: () => Promise<void>
}

/**
 * Owns the interview's code-execution flow: running tests (`runCode`) and
 * submitting (`submitCode`), each going through `executeScenario` (browser
 * sandbox first, then `POST /api/execute`). Lifted verbatim from the inline
 * implementation in `app/interview/page.tsx`; behavior — including every state
 * write, side-effect order, error branch, and the `submitCode`-only persistence
 * + post-interview handoff — is preserved exactly. The shared `/api/execute`
 * call and its failure handler live in `./code-execution-helpers`.
 */
export function useCodeExecution(opts: UseCodeExecutionOptions): UseCodeExecutionReturn {
  const {
    selectedScenario,
    code,
    selectedLanguage,
    workspaceContext,
    activeWorkspacePath,
    elapsedTime,
    chatMessages,
    interviewerMessages,
    consoleLogs,
    bugfixHypothesis,
    bugfixRootCause,
    bugfixPrevention,
    realInterviewMode,
    strictTimeLimit,
    currentSessionId,
    user,
    firebaseUser,
    isGuestMode,
    isFromRoadmap,
    activeRoadmap,
    setTestResults,
    setConsoleLogs,
    setIsRunningTests,
    setTestSummary,
    setEfficiencyMetrics,
    setInterviewerMessages,
    setShowPostInterviewDiscussion,
    playSound,
    updateTrackerOnTestsRun,
    recordBugfixEvidence,
    buildBugfixEvidencePayload,
    syncHintAgentWithTestOutcome,
    triggerPostInterviewDiscussion,
    markQuestionEvaluating,
  } = opts

  const runCode = async () => {
    if (!selectedScenario) return

    setIsRunningTests(true)
    setTestResults([])
    setConsoleLogs([]) // Clear previous console logs

    // Analyze code efficiency
    const metrics = analyzeCodeEfficiency(code, (selectedScenario as any)?.optimalComplexity)
    setEfficiencyMetrics(metrics)

    try {
      const execution = await executeScenario({
        selectedScenario,
        code,
        selectedLanguage,
        workspaceContext,
      })
      const data = execution.data

      // Handle API errors (scenario not found, execution timeout, etc.)
      if (!execution.ok || data.error) {
        applyExecutionApiError(execution, {
          setConsoleLogs,
          setTestResults,
          setInterviewerMessages,
          setIsRunningTests,
          playSound,
        })
        return
      }

      if (data.results) {
        setTestResults(data.results)
        setTestSummary(data.summary)
        applyGuidedLabGating(selectedScenario.id, data.results)
        updateTrackerOnTestsRun()
        if (selectedScenario.type === "bugfix") {
          recordBugfixEvidence({
            type: "test_run",
            testSummary: data.summary,
          })
          if (data.summary.failed > 0) {
            recordBugfixEvidence({
              type: "visible_failure_seen",
              testSummary: data.summary,
            })
          }
        }

        syncHintAgentWithTestOutcome(data.summary, data.results)

        // Store console logs from execution
        if (data.consoleLogs && data.consoleLogs.length > 0) {
          setConsoleLogs(data.consoleLogs)
        }

        // Check for syntax/compilation errors vs service unavailability
        const errorResults = data.results.filter((r: TestResult) => r.error)
        const allFailed = data.summary.passRate === 0

        if (allFailed && errorResults.length > 0) {
          const firstError = errorResults[0].error
          const isServiceDown = isExecutionServiceError(firstError)

          if (isServiceDown) {
            toast.error("Code execution unavailable", {
              description:
                "Our code runner is temporarily unavailable. Please try again in a few minutes.",
              duration: 8000,
            })
            playSound("fail")
            setIsRunningTests(false)
            return
          }

          const isSyntaxError =
            firstError &&
            (firstError.includes("SyntaxError") ||
              firstError.includes("Compilation error") ||
              firstError.includes("Unexpected token") ||
              firstError.includes("unexpected token") ||
              firstError.includes("Parse error") ||
              firstError.includes("IndentationError") ||
              firstError.includes("invalid syntax"))

          playSound("fail")
          setIsRunningTests(false)

          const errorMsgText = `I see there's ${isSyntaxError ? "a syntax error" : "an error"} in your code. Check the console below the editor - it shows exactly what went wrong. Let me know if you'd like help understanding the error.`
          setInterviewerMessages((prev) => {
            const recentMessages = prev.slice(-2)
            const hasRecentErrorMsg = recentMessages.some(
              (msg) => msg.type === "ai" && msg.message.includes("error in your code")
            )
            if (hasRecentErrorMsg) return prev
            return [...prev, { type: "ai", message: errorMsgText }]
          })

          return
        }

        // Play sound based on results
        if (data.summary.passRate === 100) {
          playSound("success")
        } else if (data.summary.passRate >= 50) {
          playSound("milestone")
        } else {
          playSound("fail")
        }

        // Just show results - don't auto-trigger submission
        // User must explicitly click Submit to proceed to feedback
        setIsRunningTests(false)
      }
    } catch (error) {
      console.error("Code execution error:", error)
      toast.error("Failed to run tests", {
        description: "There was a problem executing your code. Please try again.",
        duration: 6000,
        action: {
          label: "Retry",
          onClick: () => runCode(),
        },
      })
    } finally {
      setIsRunningTests(false)
    }
  }

  // Submit code - runs tests and triggers post-interview discussion/feedback
  const submitCode = async () => {
    if (!selectedScenario) return

    setIsRunningTests(true)
    setTestResults([])
    setConsoleLogs([])

    // Analyze code efficiency
    const metrics = analyzeCodeEfficiency(code, (selectedScenario as any)?.optimalComplexity)
    setEfficiencyMetrics(metrics)

    try {
      const execution = await executeScenario({
        selectedScenario,
        code,
        selectedLanguage,
        workspaceContext,
      })
      const data = execution.data

      // Handle API errors (scenario not found, execution timeout, etc.)
      if (!execution.ok || data.error) {
        applyExecutionApiError(execution, {
          setConsoleLogs,
          setTestResults,
          setInterviewerMessages,
          setIsRunningTests,
          playSound,
        })
        return
      }

      if (data.results) {
        setTestResults(data.results)
        setTestSummary(data.summary)
        applyGuidedLabGating(selectedScenario.id, data.results)
        updateTrackerOnTestsRun()
        if (selectedScenario.type === "bugfix") {
          recordBugfixEvidence({
            type: "test_run",
            testSummary: data.summary,
          })
          if (data.summary.failed > 0) {
            recordBugfixEvidence({
              type: "visible_failure_seen",
              testSummary: data.summary,
            })
          }
          if (data.summary.failed === 0) {
            recordBugfixEvidence({
              type: "hidden_result_received",
              testSummary: data.summary,
            })
          }
        }

        syncHintAgentWithTestOutcome(data.summary, data.results)

        // Store console logs from execution
        if (data.consoleLogs && data.consoleLogs.length > 0) {
          setConsoleLogs(data.consoleLogs)
        }

        // Check for syntax/compilation errors vs service unavailability
        const errorResults = data.results.filter((r: TestResult) => r.error)
        const allFailed = data.summary.passRate === 0

        if (allFailed && errorResults.length > 0) {
          const firstError = errorResults[0].error
          const isServiceDown = isExecutionServiceError(firstError)

          if (isServiceDown) {
            playSound("fail")
            setIsRunningTests(false)
            toast.error("Code execution unavailable", {
              description:
                "Our code runner is temporarily unavailable. Please try again in a few minutes.",
              duration: 8000,
            })
            return
          }

          const isSyntaxError =
            firstError &&
            (firstError.includes("SyntaxError") ||
              firstError.includes("Compilation error") ||
              firstError.includes("Unexpected token") ||
              firstError.includes("unexpected token") ||
              firstError.includes("Parse error") ||
              firstError.includes("IndentationError") ||
              firstError.includes("invalid syntax"))

          playSound("fail")
          setIsRunningTests(false)
          toast.error("Fix errors before submitting", {
            description: isSyntaxError
              ? "There's a syntax error in your code."
              : "Your code has errors that need to be fixed.",
          })
          return
        }

        // Play sound based on results
        if (data.summary.passRate === 100) {
          playSound("success")
        } else if (data.summary.passRate >= 50) {
          playSound("milestone")
        } else {
          playSound("fail")
        }

        // Mark question as evaluating in roadmap (if from roadmap)
        if (isFromRoadmap && selectedScenario && activeRoadmap) {
          markQuestionEvaluating(selectedScenario.id)
        }

        // Save session state for post-interview discussion (but don't mark as evaluating yet)
        // User will click "View Detailed Feedback" to start evaluation after wrap-up conversation
        // IMPORTANT: Save to Firestore BEFORE clearing localStorage to prevent data loss on refresh
        if (currentSessionId && user) {
          try {
            await saveSessionState(currentSessionId, {
              code,
              selectedLanguage,
              elapsedTime,
              chatMessages: chatMessages.slice(-50),
              interviewerMessages: interviewerMessages.slice(-50),
              testResults: data.results.slice(0, 20).map((r: any) => ({
                description: r.description || "",
                passed: r.passed || false,
                expected:
                  typeof r.expected === "object"
                    ? JSON.stringify(r.expected)
                    : String(r.expected ?? ""),
                actual:
                  typeof r.actual === "object" ? JSON.stringify(r.actual) : String(r.actual ?? ""),
              })),
              testSummary: data.summary,
              workspaceContext,
              activeWorkspacePath,
              consoleLogs,
              bugfixEvidenceEvents: buildBugfixEvidencePayload(),
              bugfixHypothesis,
              bugfixRootCause,
              bugfixPrevention,
              isPostInterviewDiscussion: true,
              realInterviewMode,
              strictTimeLimit,
            })

            // Only clear localStorage AFTER Firestore save succeeds
            // This ensures we always have a backup until the cloud save is confirmed
            if (firebaseUser && selectedScenario) {
              const storageKey = `interview_autosave_${firebaseUser.uid}_${selectedScenario.id}`
              try {
                localStorage.removeItem(storageKey)
              } catch (e) {
                // Silent failure - localStorage might be unavailable
              }
            }
          } catch (saveError) {
            console.error("Failed to save session state:", saveError)
            // Don't clear localStorage if Firestore save failed - keep the backup
          }
        } else if (isGuestMode && selectedScenario) {
          // For guests, clear localStorage only after we know we're transitioning to wrap-up
          // The guest session state will be saved via API during auto-save
          const storageKey = `interview_autosave_guest_${selectedScenario.id}`
          try {
            localStorage.removeItem(storageKey)
          } catch (e) {
            // Silent failure
          }
        }

        // Proceed to post-interview discussion
        setIsRunningTests(false)
        setShowPostInterviewDiscussion(true)
        triggerPostInterviewDiscussion(data.results, data.summary)
      }
    } catch (error) {
      console.error("Code submission error:", error)
      toast.error("Failed to submit", {
        description: "There was a problem submitting your code. Please try again.",
      })
    } finally {
      setIsRunningTests(false)
    }
  }

  return { runCode, submitCode }
}
