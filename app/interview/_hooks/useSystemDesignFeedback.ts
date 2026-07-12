import { toast } from "sonner"
import type { Dispatch, SetStateAction } from "react"
import type { User } from "@/lib/types"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { markSessionEvaluating, updateInterviewSession } from "@/lib/firestore-helpers"
import { calculateDesignMasteryScore } from "@/lib/spaced-repetition/mastery-score"
import type { Scenario } from "@/lib/scenarios"
import type { ConversationTracker } from "@/lib/interview/interview-phases"
import type { InterviewTargetCompany } from "@/lib/stores"
import type { ChatMessage, ConsoleLogEntry, TestResult } from "../_types"
import type {
  TrackSessionCompletionParams,
  UpdateSpacedRepetitionParams,
} from "./useInterviewMetrics"

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

interface RoadmapWithId {
  id: string
}

interface SearchParamsLike {
  get: (key: string) => string | null
}

export interface UseSystemDesignFeedbackOptions {
  // Auth / entitlement
  user: User | null
  isGuestMode: boolean
  guestId: string | null
  experienceLevel: string

  // Routing / roadmap
  searchParams: SearchParamsLike
  activeRoadmap: RoadmapWithId | null

  // Page state reads
  selectedScenario: Scenario | null
  code: string
  elapsedTime: number
  chatMessages: ChatMessage[]
  interviewerMessages: ChatMessage[]
  testResults: TestResult[]
  consoleLogs: ConsoleLogEntry[]
  conversationTracker: ConversationTracker
  recentNudgeTopics: string[]
  revealedHints: number
  revealedHintIndices: Set<number>
  revealedAIHintIndices: Set<number>
  targetCompany: InterviewTargetCompany
  realInterviewMode: boolean
  currentSessionId: string | null

  // Page state setters
  setIsGeneratingDiscussion: Dispatch<SetStateAction<boolean>>
  setStructuredFeedback: Dispatch<SetStateAction<StructuredFeedback>>
  setTechnicalScore: Dispatch<SetStateAction<number | null>>
  setScoreBreakdown: Dispatch<SetStateAction<ScoreBreakdown>>
  setComprehensiveFeedback: Dispatch<SetStateAction<string>>
  setPerformanceScore: Dispatch<SetStateAction<number | null>>
  setShowPostInterviewDiscussion: Dispatch<SetStateAction<boolean>>
  setInterviewerMessages: Dispatch<SetStateAction<ChatMessage[]>>

  // Injected cross-cutting effects / helpers
  markQuestionCompleted: (scenarioId: string, score?: number, timeSpentMinutes?: number) => void
  addActualTime: (minutes: number) => void
  trackSessionCompletion: (params: TrackSessionCompletionParams) => Promise<void>
  updateSpacedRepetition: (params: UpdateSpacedRepetitionParams) => Promise<void>
  getEdgeCasesForInterviewer: () => { description: string; input: unknown }[]
  updateTrackerOnMessage: (message: string, role: "user" | "interviewer") => void
}

export interface UseSystemDesignFeedbackResult {
  triggerSystemDesignFeedback: () => Promise<void>
}

/**
 * Owns the system-design feedback generation (`triggerSystemDesignFeedback`) lifted
 * verbatim from `app/interview/page.tsx`: markSessionEvaluating, `/api/generate-feedback`,
 * session persistence, spaced repetition, RAG storage, and the `/api/chat` debrief.
 * All request/contract literals — including the field-specific sentinel-default code
 * strings — are preserved byte-identical. The submission entry point
 * (`submitSystemDesign`) lives in `useSystemDesignSubmit`, which injects this hook's
 * `triggerSystemDesignFeedback`.
 */
export function useSystemDesignFeedback(
  opts: UseSystemDesignFeedbackOptions
): UseSystemDesignFeedbackResult {
  const triggerSystemDesignFeedback = async () => {
    opts.setIsGeneratingDiscussion(true)

    try {
      if (!opts.selectedScenario || opts.selectedScenario.type !== "system-design") {
        return
      }

      // Firebase ID token for authenticated API calls (null for guests)
      const authToken = await getCurrentUserToken()

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

      // For system design, generate feedback based on conversation and design notes
      // Create a mock summary for system design (no tests, but we need the structure)
      const mockSummary = {
        passed: 0,
        failed: 0,
        total: 0,
        passRate: 0, // Will be calculated by feedback system based on conversation
      }

      // Generate comprehensive feedback
      let comprehensiveFeedback = `Completed system design interview: ${opts.selectedScenario?.title}`
      let calculatedPerformanceScore = 0

      // Mark session as evaluating BEFORE feedback generation starts
      // This prevents the session from being reopened if user refreshes
      if (opts.currentSessionId && opts.user) {
        try {
          await markSessionEvaluating(opts.currentSessionId, {
            code: opts.code || "// Design notes completed via discussion",
            language: "notes",
            elapsedTime: opts.elapsedTime,
            chatMessages: opts.chatMessages,
            interviewerMessages: opts.interviewerMessages,
            testResults: [],
            testSummary: mockSummary,
            isPostInterviewDiscussion: true,
          })
        } catch (markError) {
          console.error("Failed to mark session as evaluating:", markError)
          // Continue anyway - this is non-critical
        }
      }

      // Prepare conversation transcript for content-based evaluation
      // This allows the AI to evaluate WHAT was said, not just message counts
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

      // Generate feedback using the feedback API
      const feedbackHeaders: Record<string, string> = { "Content-Type": "application/json" }
      if (authToken) feedbackHeaders.Authorization = `Bearer ${authToken}`
      const feedbackResponse = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: feedbackHeaders,
        body: JSON.stringify({
          code: opts.code || "// Design notes completed via discussion",
          scenarioTitle: opts.selectedScenario.title,
          scenarioType: opts.selectedScenario.type,
          scenarioId: opts.selectedScenario.id,
          scenarioDifficulty: opts.selectedScenario.difficulty,
          scenarioPattern: (opts.selectedScenario as any)?.pattern,
          scenarioCompany: opts.targetCompany, // Target company for company-specific feedback
          testResults: [], // No tests for system design
          language: "notes",
          timeSpent: opts.elapsedTime,
          aiCollaborationMetrics,
          interactionMetrics,
          efficiencyMetrics: null, // No code efficiency for system design
          conversationTranscript, // Pass actual conversation for AI analysis
          sessionId: opts.currentSessionId,
          userId: opts.user?.id,
          // Real Interview Mode (clarifying questions)
          scenarioClarifyingQuestions: (opts.selectedScenario as any)?.clarifyingQuestions,
          realInterviewMode: opts.realInterviewMode,
          // Pass silent notes from real-time tracking (systemic fix)
          silentNotes: opts.conversationTracker.silentNotes || [],
        }),
      })

      let systemDesignScoreBreakdown: {
        understanding?: number
        problemSolving?: number
        codeQuality?: number
        communication?: number
      } | null = null
      let systemDesignTechnicalScore: number | undefined = undefined
      let systemDesignStructuredFeedback:
        | {
            scores?: Record<string, number>
            tldr?: string
            whatWorked?: string[]
            fixNext?: string[]
            actionPlan?: string[]
            rawFeedback?: string
          }
        | undefined
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json()
        comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
        calculatedPerformanceScore = feedbackData.scores?.overall || 0
        if (feedbackData.structured) {
          systemDesignStructuredFeedback = feedbackData.structured
          opts.setStructuredFeedback({
            whatWorked: feedbackData.structured.whatWorked || [],
            fixNext: feedbackData.structured.fixNext || [],
            actionPlan: feedbackData.structured.actionPlan || [],
            tldr: feedbackData.structured.tldr || "",
          })
        }
        // Store technical score (mastery-based) for Overall/Technical toggle
        if (feedbackData.technicalScore !== undefined) {
          systemDesignTechnicalScore = feedbackData.technicalScore
          opts.setTechnicalScore(feedbackData.technicalScore)
        }
        // Store score breakdown for technical score calculations and display
        if (feedbackData.scores) {
          systemDesignScoreBreakdown = feedbackData.scores
          // Also set state for PracticeFeedback component
          // Ensure all scores are defined numbers before setting state
          if (feedbackData.scores) {
            const scores = feedbackData.scores
            opts.setScoreBreakdown({
              understandingScore:
                scores.understanding !== undefined && scores.understanding !== null
                  ? scores.understanding
                  : undefined,
              problemSolvingScore:
                scores.problemSolving !== undefined && scores.problemSolving !== null
                  ? scores.problemSolving
                  : undefined,
              codeQualityScore:
                scores.codeQuality !== undefined && scores.codeQuality !== null
                  ? scores.codeQuality
                  : undefined,
              communicationScore:
                scores.communication !== undefined && scores.communication !== null
                  ? scores.communication
                  : undefined,
            })
          }
        }
      }

      opts.setComprehensiveFeedback(comprehensiveFeedback)
      opts.setPerformanceScore(calculatedPerformanceScore)

      // Update session with completion data
      if (opts.currentSessionId && opts.user) {
        try {
          await updateInterviewSession(
            opts.currentSessionId,
            calculatedPerformanceScore,
            comprehensiveFeedback,
            {
              code: opts.code || "// Design notes",
              language: "notes",
              testResults: [],
              feedbackStatus: "complete", // Feedback generation is done
              // Pass pre-calculated technical score from API for consistency
              technicalScore: systemDesignTechnicalScore,
              scoreBreakdown: systemDesignScoreBreakdown || undefined,
              structuredFeedback: systemDesignStructuredFeedback,
            }
          )

          // Track session completion for user stats (async, non-blocking)
          opts
            .trackSessionCompletion({
              sessionId: opts.currentSessionId,
              finalCode: opts.code || "// Design notes",
              language: "notes",
              testsPassed: 1, // System design counts as passed
              testsTotal: 1,
              efficiencyScore: 50, // Not applicable for system design
              communicationScore: calculatedPerformanceScore,
            })
            .catch((err) => console.error("Session metrics tracking failed:", err))

          // Update spaced repetition state (due dates and streak)
          if (opts.selectedScenario) {
            const hintsUsedCount = opts.revealedHintIndices.size + opts.revealedAIHintIndices.size
            opts
              .updateSpacedRepetition({
                problemId: opts.selectedScenario.id,
                performanceScore: calculatedPerformanceScore,
                masteryScore: systemDesignScoreBreakdown
                  ? calculateDesignMasteryScore(systemDesignScoreBreakdown)
                  : undefined,
                timeSpentMinutes: Math.round(opts.elapsedTime / 60),
                hintsUsed: hintsUsedCount,
                testCasesPassed: 1, // System design counts as passed
                testCasesTotal: 1,
              })
              .catch((err) => console.error("Spaced repetition update failed:", err))
          }

          // Mark question complete in roadmap if user came from roadmap
          // Note: Check both param patterns for compatibility
          const isFromRoadmapHere =
            opts.searchParams.get("from") === "roadmap" ||
            opts.searchParams.get("roadmap") === "true"
          if (isFromRoadmapHere && opts.selectedScenario && opts.activeRoadmap) {
            opts.markQuestionCompleted(opts.selectedScenario.id, calculatedPerformanceScore)
            const minutesSpent = Math.round(opts.elapsedTime / 60)
            if (minutesSpent > 0) {
              opts.addActualTime(minutesSpent)
            }
            // Signal to roadmap page that a question was just completed (for day completion modal)
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

          // Store solution for RAG (async, non-blocking)
          if (opts.selectedScenario?.id) {
            fetch("/api/rag", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "store-solution",
                userId: opts.user.id,
                problemId: opts.selectedScenario.id,
                problemTitle: opts.selectedScenario.title,
                solutionCode: opts.code.trim() || "// Design discussion completed",
                language: "notes",
                passed: true,
                score: calculatedPerformanceScore,
                problemType: "system-design",
              }),
            }).catch((err) => {
              console.error("Solution storage error (non-blocking):", err)
            })
          }
        } catch (error) {
          console.error("Error updating session:", error)
        }
      } else if (opts.currentSessionId && opts.isGuestMode && opts.guestId) {
        // Guest user - save completion data via API
        try {
          await fetch("/api/guest-session", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: opts.currentSessionId,
              guestId: opts.guestId,
              performanceScore: calculatedPerformanceScore,
              feedback: comprehensiveFeedback,
              finalCode: opts.code || "// Design notes",
              language: "notes",
              testResults: [],
            }),
          })
        } catch (error) {
          console.error("Error saving guest session completion:", error)
        }
      }

      // Start post-interview discussion phase
      opts.setShowPostInterviewDiscussion(true)

      // Trigger interviewer to provide final feedback
      const finalMessage = `The candidate has submitted their design. Please provide a brief summary of their performance, highlighting strengths and areas for improvement. Keep it concise (2-3 sentences).`

      const chatHeaders: Record<string, string> = { "Content-Type": "application/json" }
      if (authToken) chatHeaders.Authorization = `Bearer ${authToken}`
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: chatHeaders,
        body: JSON.stringify({
          message: finalMessage,
          context: opts.interviewerMessages,
          role: "interviewer",
          userContext: opts.user
            ? {
                email: opts.user.email,
                full_name:
                  opts.user.user_metadata?.full_name || opts.user.email?.split("@")[0] || "",
                skill_level: opts.experienceLevel,
              }
            : { skill_level: opts.experienceLevel },
          currentCode: opts.code,
          scenarioTitle: opts.selectedScenario?.title,
          scenarioType: opts.selectedScenario?.type,
          scenarioCompany: opts.targetCompany, // Target company for RAG context
          isProactive: false,
          isPostInterview: true,
          isEndingSession: false,
          edgeCases: opts.getEdgeCasesForInterviewer(),
          // Pass recent topics to prevent repetitive questions
          recentNudgeTopics: opts.recentNudgeTopics,
          // Pass test results and console logs for interviewer awareness
          testResults: opts.testResults,
          consoleLogs: opts.consoleLogs,
          // Phase-aware interview tracking
          // NOTE: Explicitly set phase params because React state may not have updated yet
          interviewPhase: "post_interview" as const,
          conversationTracker: opts.conversationTracker,
          hasSubmitted: true,
          solutionComplexity: null, // System design doesn't have complexity metrics
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        console.warn("[API] Request failed:", response.status, response.url, data)
      }
      if (data.reply) {
        opts.setInterviewerMessages((prev) => [...prev, { type: "ai", message: data.reply }])
        // Track interviewer response for conversation context
        opts.updateTrackerOnMessage(data.reply, "interviewer")
      }
    } catch (error) {
      console.error("Error generating system design feedback:", error)
      toast.error("Failed to generate feedback", {
        description: "There was a problem generating your feedback. Please try again.",
      })
    } finally {
      opts.setIsGeneratingDiscussion(false)
    }
  }

  return { triggerSystemDesignFeedback }
}
