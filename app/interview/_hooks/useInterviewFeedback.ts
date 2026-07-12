import { useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import { toast } from "sonner"
import type { User } from "@/lib/types"
import { markSessionEvaluating, updateInterviewSession } from "@/lib/firestore-helpers"
import { markFreeTrialUsed, saveGuestSessionData } from "@/lib/guest-session"
import { analyzeCodeEfficiency } from "@/lib/interview"
import type { Scenario } from "@/lib/scenarios"
import type { BugFixScenario } from "@/lib/scenarios/types"
import type { ConversationTracker } from "@/lib/interview/interview-phases"
import type { useStreamingFeedback } from "@/lib/hooks/use-streaming-feedback"
import type { BugfixEvidenceEvent } from "@/lib/bugfix"
import type {
  ChatMessage,
  ConsoleLogEntry,
  TestResult,
  TestSummary,
  WorkspaceContextFile,
} from "../_types"
import type { TrackSessionCompletionParams } from "./useInterviewMetrics"

type ScoreBreakdown = {
  understandingScore?: number
  problemSolvingScore?: number
  codeQualityScore?: number
  communicationScore?: number
} | null

type StructuredFeedback = {
  whatWorked?: string[]
  fixNext?: string[]
  actionPlan?: string[]
  tldr?: string
} | null

type StreamingFeedbackController = ReturnType<typeof useStreamingFeedback>

interface RoadmapWithId {
  id: string
}

export interface UseInterviewFeedbackOptions {
  // Auth / entitlement
  user: User | null
  isGuestMode: boolean
  guestId: string | null

  // Page state reads
  selectedScenario: Scenario | null
  code: string
  selectedLanguage: string
  elapsedTime: number
  chatMessages: ChatMessage[]
  interviewerMessages: ChatMessage[]
  testResults: TestResult[]
  testSummary: TestSummary
  workspaceContext: WorkspaceContextFile[]
  activeWorkspacePath: string | null
  consoleLogs: ConsoleLogEntry[]
  bugfixHypothesis: string
  bugfixRootCause: string
  bugfixPrevention: string
  conversationTracker: ConversationTracker
  revealedHints: number
  revealedHintIndices: Set<number>
  revealedAIHintIndices: Set<number>
  isFromRoadmap: boolean
  activeRoadmap: RoadmapWithId | null
  currentSessionId: string | null

  // Streaming feedback (injected — do not import the hook at runtime)
  streamingFeedback: StreamingFeedbackController

  // Page state setters
  setScoreBreakdown: Dispatch<SetStateAction<ScoreBreakdown>>
  setPerformanceScore: Dispatch<SetStateAction<number | null>>
  setTechnicalScore: Dispatch<SetStateAction<number | null>>
  setComprehensiveFeedback: Dispatch<SetStateAction<string>>
  setStructuredFeedback: Dispatch<SetStateAction<StructuredFeedback>>
  setIsGeneratingFeedback: Dispatch<SetStateAction<boolean>>
  setShowFeedback: Dispatch<SetStateAction<boolean>>
  setShowPostInterviewDiscussion: Dispatch<SetStateAction<boolean>>
  setShowSignupPrompt: Dispatch<SetStateAction<boolean>>

  // Injected cross-cutting effects / helpers
  buildBugfixEvidencePayload: () => BugfixEvidenceEvent[]
  getBugfixExpectedTouchedFiles: (scenario?: Scenario | null) => string[]
  getCurrentInterviewPhase: () => string
  trackSessionCompletion: (params: TrackSessionCompletionParams) => Promise<void>
  markQuestionCompleted: (scenarioId: string, score?: number, timeSpentMinutes?: number) => void
  addActualTime: (minutes: number) => void

  // Streaming-feedback plumbing (injected from useFeedbackStreaming)
  applyFallbackFeedback: (request: any) => Promise<void>
  lastFeedbackRequestRef: React.MutableRefObject<any>
}

export interface UseInterviewFeedbackResult {
  proceedToFinalFeedback: () => Promise<void>
}

/**
 * Owns the deferred final-feedback submission (`proceedToFinalFeedback`) lifted
 * verbatim from `app/interview/page.tsx`. All request/contract literals
 * (markSessionEvaluating args, the feedbackRequest object, every fetch body,
 * updateInterviewSession args, guest-session payloads) are preserved byte-identical.
 * The streaming-feedback effect + fallback-scoring path live in `useFeedbackStreaming`
 * (`applyFallbackFeedback` + `lastFeedbackRequestRef` injected via opts); the
 * post-interview discussion kickoff lives in `usePostInterviewDiscussion`.
 * Widely-shared state stays in the page (injected setters); `streamingFeedback`,
 * metrics trackers, and tracker helpers are injected via opts.
 */
export function useInterviewFeedback(
  opts: UseInterviewFeedbackOptions
): UseInterviewFeedbackResult {
  // Guards proceedToFinalFeedback against re-entrant invocations (a double-click
  // on "See Full Interview Score" or a click through a stacked session-complete
  // toast) so the one-time completion writes fire exactly once. Reset in the
  // finally below so a retry after a genuine failure still works.
  const isGeneratingFeedbackRef = useRef(false)

  const proceedToFinalFeedback = async () => {
    const bugfixEvidencePayload = opts.buildBugfixEvidencePayload()
    const bugfixExpectedTouchedFiles = opts.getBugfixExpectedTouchedFiles()

    // Re-entrancy guard: bail if a submission is already in flight so
    // markSessionEvaluating / updateInterviewSession / trackSessionCompletion /
    // addActualTime never run twice (double completion write + double-counted
    // roadmap time). Set before the first await; cleared in the finally.
    if (isGeneratingFeedbackRef.current) return
    isGeneratingFeedbackRef.current = true

    opts.setShowPostInterviewDiscussion(false)
    opts.setIsGeneratingFeedback(true)
    opts.setShowFeedback(true)

    // CRITICAL: Mark session as evaluating FIRST, before generating feedback
    // This ensures if user navigates away, the session shows as "evaluating" not "in progress"
    if (opts.currentSessionId && opts.user) {
      try {
        await markSessionEvaluating(opts.currentSessionId, {
          code: opts.code,
          language: opts.selectedLanguage,
          elapsedTime: opts.elapsedTime,
          chatMessages: opts.chatMessages,
          interviewerMessages: opts.interviewerMessages,
          testResults: opts.testResults,
          testSummary: opts.testSummary,
          isPostInterviewDiscussion: true,
          workspaceContext: opts.workspaceContext,
          activeWorkspacePath: opts.activeWorkspacePath,
          consoleLogs: opts.consoleLogs,
          bugfixEvidenceEvents: bugfixEvidencePayload,
          bugfixHypothesis: opts.bugfixHypothesis,
          bugfixRootCause: opts.bugfixRootCause,
          bugfixPrevention: opts.bugfixPrevention,
        })
      } catch (markError) {
        console.error("Failed to mark session as evaluating:", markError)
        // Continue anyway - feedback generation should still proceed
      }
    }

    // Now generate feedback - includes ALL conversation including post-interview discussion
    try {
      if (!opts.selectedScenario) {
        opts.setIsGeneratingFeedback(false)
        return
      }

      const partnerMessagesSent = opts.chatMessages.filter((msg) => msg.type === "user").length
      const partnerMessagesReceived = opts.chatMessages.filter((msg) => msg.type === "ai").length
      const interviewerUserMessages = opts.interviewerMessages.filter((msg) => msg.type === "user")
      const interviewerQuestionsAnswered = interviewerUserMessages.length
      const interviewerClarificationsRequested = interviewerUserMessages.filter((msg) =>
        msg.message.includes("?")
      ).length
      const interviewerFeedbackAcknowledged = interviewerUserMessages.filter((msg) =>
        /thanks|got it|understand|cool|okay|ok/i.test(msg.message)
      ).length
      const proactiveInteractions =
        interviewerQuestionsAnswered > 0 || partnerMessagesSent > 0 ? 1 : 0

      const aiCollaborationMetrics = {
        partnerMessagesSent,
        partnerMessagesReceived,
        partnerHintsRequested: opts.revealedHints,
      }

      const interactionMetrics = {
        interviewerQuestionsAnswered,
        interviewerClarificationsRequested,
        interviewerFeedbackAcknowledged,
        proactiveInteractions,
        problemDifficulty: opts.selectedScenario?.difficulty,
        problemType: opts.selectedScenario?.type,
        skillsDemonstrated: opts.selectedScenario?.tags || [],
      }

      const feedbackText = `Completed ${opts.selectedScenario?.title} with ${opts.testSummary.passed}/${opts.testSummary.total} tests passing`
      let calculatedPerformanceScore = opts.testSummary.passRate
      const localTechnicalScore: number | undefined = undefined
      let scoreBreakdownData: {
        understanding?: number
        problemSolving?: number
        codeQuality?: number
        communication?: number
      } | null = null
      let aiFeedbackSucceeded = false
      const localConstitutionalAICritique: Record<string, unknown> | null = null
      const localClarifyingQuestionsAssessment: {
        score: number
        totalExpected: number
        totalAsked: number
        requiredAsked: number
        requiredTotal: number
        results: Array<{
          question: string
          required: boolean
          asked: boolean
          matchedPhrase?: string
        }>
      } | null = null

      const efficiencyData = analyzeCodeEfficiency(
        opts.code,
        (opts.selectedScenario as any)?.optimalComplexity
      )

      if (opts.currentSessionId && opts.user && opts.code.trim()) {
        try {
          // Prepare conversation transcript - NOW includes ALL messages including post-interview discussion
          const conversationTranscript = [
            ...opts.interviewerMessages.map((m) => ({
              role: m.type === "user" ? "candidate" : "interviewer",
              content: m.message,
              timestamp: m.timestamp,
            })),
            ...opts.chatMessages.map((m) => ({
              role: m.type === "user" ? "candidate" : "ai_partner",
              content: m.message,
              timestamp: m.timestamp,
            })),
          ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

          // Build phase tracking info for scoring
          const phaseTracking = {
            submittedFromPhase: opts.getCurrentInterviewPhase(),
            testsRanBeforeSubmit: opts.testResults.length > 0,
            hadDiscussionPhase: opts.conversationTracker.approachExplained,
            conversationTracker: {
              approachExplained: opts.conversationTracker.approachExplained,
              approachType: opts.conversationTracker.approachType,
              timeComplexityMentioned: opts.conversationTracker.timeComplexityMentioned,
              spaceComplexityMentioned: opts.conversationTracker.spaceComplexityMentioned,
              complexityExplanationGiven: opts.conversationTracker.complexityExplanationGiven,
              edgeCasesMentioned: opts.conversationTracker.edgeCasesMentioned,
              hintsGiven: opts.conversationTracker.hintsGiven,
            },
          }

          // ================================================================
          // TWO-PHASE FEEDBACK: Get instant scores, then poll for rich feedback
          // Phase 1: Instant algorithmic scores (< 3 seconds)
          // Phase 2: Rich AI-generated narrative (background, polled)
          // ================================================================
          // ================================================================
          // STREAMING FEEDBACK: Edge function with NO TIMEOUT
          // Scores stream in immediately, then rich feedback follows
          // ================================================================
          const hintsUsedCount = opts.revealedHintIndices.size + opts.revealedAIHintIndices.size
          const feedbackRequest = {
            sessionId: opts.currentSessionId,
            userId: opts.user.id,
            code: opts.code,
            language: opts.selectedLanguage,
            testsPassed: opts.testSummary.passed,
            testsTotal: opts.testSummary.total,
            scenarioType: opts.selectedScenario?.type,
            scenarioTitle: opts.selectedScenario?.title,
            scenarioId: opts.selectedScenario?.id,
            scenarioDifficulty: opts.selectedScenario?.difficulty,
            scenarioPattern: (opts.selectedScenario as any)?.pattern,
            conversationTranscript,
            partnerMessages: opts.chatMessages.filter((m) => m.type === "ai").map((m) => m.message),
            phaseTracking,
            silentNotes: opts.conversationTracker.silentNotes || [],
            efficiencyMetrics: efficiencyData,
            submittedFromPhase: opts.getCurrentInterviewPhase(),
            testsRanBeforeSubmit: opts.testResults.length > 0,
            // For mastery score calculation in persist endpoint
            hintsUsed: hintsUsedCount,
            elapsedTimeSeconds: opts.elapsedTime,
            bugfixEvidenceEvents: bugfixEvidencePayload,
            bugfixExpectedTouchedFiles,
            bugfixHypothesis: opts.bugfixHypothesis,
            bugfixRootCause: opts.bugfixRootCause,
            bugfixPrevention: opts.bugfixPrevention,
            bugfixRootCauseRubric:
              opts.selectedScenario?.type === "bugfix"
                ? (opts.selectedScenario as BugFixScenario).rootCauseRubric
                : [],
            bugfixGroundTruth:
              opts.selectedScenario?.type === "bugfix"
                ? (opts.selectedScenario as BugFixScenario).bugDescription
                : "",
          }

          // Start streaming feedback - scores come first, then rich feedback
          // The useEffect above handles updating state as events stream in
          opts.lastFeedbackRequestRef.current = feedbackRequest
          opts.streamingFeedback.startStreaming(feedbackRequest)

          // Set initial values while streaming
          aiFeedbackSucceeded = true
          calculatedPerformanceScore = opts.testSummary.passRate // Will be updated by stream
          scoreBreakdownData = {
            understanding: 50,
            problemSolving: 50,
            codeQuality: 50,
            communication: 50,
          }
        } catch (feedbackError) {
          console.error("Error generating feedback:", feedbackError)
          toast.error("Feedback generation failed", {
            description: "Applying automated fallback scoring.",
          })
          if (opts.lastFeedbackRequestRef.current) {
            opts.applyFallbackFeedback(opts.lastFeedbackRequestRef.current)
          }
        }
      }

      // Don't set placeholder feedback - wait for streaming to complete
      // The useEffect watching streamingFeedback.state will update these
      // Only set initial performance score based on test results (will be updated by streaming)
      opts.setPerformanceScore(calculatedPerformanceScore)

      // Save basic session completion data (code, test results, etc.)
      // NOTE: The persist endpoint will handle saving the AI-generated feedback and scores
      // We only save basic data here with feedbackStatus: "processing"
      if (opts.currentSessionId && opts.user) {
        try {
          // Save basic session data - feedback and scores will be updated by /api/feedback/persist
          await updateInterviewSession(opts.currentSessionId, undefined, undefined, {
            code: opts.code,
            language: opts.selectedLanguage,
            testResults: opts.testResults,
            timeComplexity: efficiencyData?.estimatedTimeComplexity,
            spaceComplexity: efficiencyData?.estimatedSpaceComplexity,
            efficiencyScore: efficiencyData?.efficiencyScore,
            // Mark as processing - persist endpoint will update to "complete"
            feedbackStatus: "processing",
            bugfixEvidenceEvents: bugfixEvidencePayload,
            bugfixHypothesis: opts.bugfixHypothesis,
            bugfixRootCause: opts.bugfixRootCause,
            bugfixPrevention: opts.bugfixPrevention,
          })

          opts
            .trackSessionCompletion({
              sessionId: opts.currentSessionId,
              finalCode: opts.code,
              language: opts.selectedLanguage,
              testsPassed: opts.testSummary.passed,
              testsTotal: opts.testSummary.total,
              efficiencyScore: efficiencyData?.efficiencyScore || 50,
            })
            .catch((err) => console.error("Session metrics tracking failed:", err))

          // Note: Spaced repetition update will be triggered by persist endpoint
          // after mastery score is properly calculated

          if (opts.isFromRoadmap && opts.selectedScenario && opts.activeRoadmap) {
            opts.markQuestionCompleted(opts.selectedScenario.id, calculatedPerformanceScore)
            const minutesSpent = Math.round(opts.elapsedTime / 60)
            if (minutesSpent > 0) {
              opts.addActualTime(minutesSpent)
            }
            sessionStorage.setItem(
              "roadmap-question-just-completed",
              JSON.stringify({
                scenarioId: opts.selectedScenario.id,
                roadmapId: opts.activeRoadmap.id,
                timestamp: Date.now(),
              })
            )
            toast.success("Progress saved to your roadmap!")
          }

          const isSystemDesign = opts.selectedScenario?.type === "system-design"
          const shouldStore = opts.selectedScenario?.id && (opts.code.trim() || isSystemDesign)

          if (shouldStore) {
            fetch("/api/rag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "store-solution",
                userId: opts.user.id,
                problemId: opts.selectedScenario.id,
                problemTitle: opts.selectedScenario.title,
                solutionCode:
                  opts.code || (isSystemDesign ? "// Design discussion completed via chat" : ""),
                language: opts.selectedLanguage,
                passed: isSystemDesign ? true : opts.testSummary.passed === opts.testSummary.total,
                score: calculatedPerformanceScore,
                problemType: opts.selectedScenario.type,
              }),
            }).catch((err) => console.error("Solution storage error:", err))
          }

          fetch("/api/vectorize-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: opts.user.id,
              sessionId: opts.currentSessionId,
              scenarioId: opts.selectedScenario?.id,
              scenarioTitle: opts.selectedScenario?.title,
              language: opts.selectedLanguage,
              code: opts.code,
              testResults: opts.testResults,
              timeSpent: opts.elapsedTime,
              aiCollaborationMetrics,
              interactionMetrics,
              efficiencyMetrics: efficiencyData,
              scores: {
                correctness:
                  opts.testResults.length > 0
                    ? (opts.testResults.filter((t: TestResult) => t.passed).length /
                        opts.testResults.length) *
                      100
                    : 0,
                efficiency: efficiencyData.efficiencyScore,
                codeQuality: 70,
                reasoningExplanation: aiCollaborationMetrics.partnerMessagesSent > 0 ? 50 : 0,
                aiCollaboration: aiCollaborationMetrics.partnerMessagesSent > 0 ? 50 : 0,
                overall: calculatedPerformanceScore,
              },
            }),
          }).catch((err) => console.error("Vectorization error:", err))
        } catch (error) {
          console.error("Error updating session on completion:", error)
          toast.warning("Session progress may not be fully saved", {
            description:
              "Your feedback is still available, but progress tracking may be incomplete.",
          })
        }
      } else if (opts.currentSessionId && opts.isGuestMode && opts.guestId) {
        try {
          await fetch("/api/guest-session", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: opts.currentSessionId,
              guestId: opts.guestId,
              performanceScore: calculatedPerformanceScore,
              feedback: feedbackText,
              finalCode: opts.code,
              language: opts.selectedLanguage,
              testResults: opts.testResults,
              timeComplexity: efficiencyData?.estimatedTimeComplexity,
              spaceComplexity: efficiencyData?.estimatedSpaceComplexity,
              efficiencyScore: efficiencyData?.efficiencyScore,
            }),
          })
        } catch (error) {
          console.error("Error saving guest session completion:", error)
        }
      }

      // Show signup prompt for guest users
      if (opts.isGuestMode && opts.guestId) {
        setTimeout(() => opts.setShowSignupPrompt(true), 2000)
        markFreeTrialUsed()
        if (opts.currentSessionId && opts.selectedScenario) {
          saveGuestSessionData({
            sessionId: opts.currentSessionId,
            scenarioId: opts.selectedScenario.id,
            scenarioTitle: opts.selectedScenario.title,
            startedAt: new Date().toISOString(),
            feedback: {
              score: calculatedPerformanceScore || 0,
              summary: feedbackText,
              feedbackData: null,
            },
          })
        }
      }
    } catch (error) {
      console.error("Error generating final feedback:", error)
      toast.error("Failed to generate feedback")
    } finally {
      isGeneratingFeedbackRef.current = false
      opts.setIsGeneratingFeedback(false)
    }
  }

  return { proceedToFinalFeedback }
}
