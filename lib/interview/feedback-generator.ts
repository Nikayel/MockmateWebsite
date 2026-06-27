/**
 * Feedback Generator Service
 *
 * Handles AI-powered feedback generation:
 * - Comprehensive feedback generation from test results
 * - System design feedback generation
 * - Post-interview discussion triggers
 * - Conversation transcript analysis
 * - Session completion tracking
 */

import { User as FirebaseUser } from "firebase/auth"
import { Scenario } from "@/lib/scenarios"
import { getCurrentUserToken } from "@/lib/firebase-lazy"
import { getUserProfile, updateInterviewSession } from "@/lib/firestore-helpers"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

export interface ChatMessage {
  type: "user" | "ai"
  message: string
  timestamp?: number
}

export interface TestResult {
  description: string
  passed: boolean
  input: any
  expected: any
  actual: any
  error: string | null
}

export interface EfficiencyMetrics {
  linesOfCode: number
  complexity: string
  estimatedTimeComplexity: string
  estimatedSpaceComplexity: string
  optimalTimeComplexity: string
  optimalSpaceComplexity: string
  efficiencyScore: number
}

export interface GenerateFeedbackOptions {
  code: string
  scenario: Scenario
  testResults: TestResult[]
  selectedLanguage: string
  elapsedTime: number
  chatMessages: ChatMessage[]
  interviewerMessages: ChatMessage[]
  revealedHints: number
  efficiencyMetrics: EfficiencyMetrics | null
  sessionId: string | null
  userId?: string
  // NEW: Silent notes from conversation tracker (things interviewer noticed but didn't correct)
  silentNotes?: Array<{
    type: string
    userSaid: string
    correct?: string
    context?: string
  }>
}

export interface FeedbackResult {
  feedback: string
  performanceScore: number
  constitutionalAICritique?: any
}

/**
 * Calculate interaction metrics from messages
 */
export function calculateInteractionMetrics(
  chatMessages: ChatMessage[],
  interviewerMessages: ChatMessage[],
  revealedHints: number,
  scenario: Scenario
) {
  const partnerMessagesSent = chatMessages.filter((msg) => msg.type === "user").length
  const partnerMessagesReceived = chatMessages.filter((msg) => msg.type === "ai").length
  const interviewerUserMessages = interviewerMessages.filter((msg) => msg.type === "user")
  const interviewerQuestionsAnswered = interviewerUserMessages.length
  const interviewerClarificationsRequested = interviewerUserMessages.filter((msg) =>
    msg.message.includes("?")
  ).length
  const interviewerFeedbackAcknowledged = interviewerUserMessages.filter((msg) =>
    /thanks|got it|understand|cool|okay|ok/i.test(msg.message)
  ).length
  const proactiveInteractions = interviewerQuestionsAnswered > 0 || partnerMessagesSent > 0 ? 1 : 0

  const aiCollaborationMetrics = {
    partnerMessagesSent,
    partnerMessagesReceived,
    partnerHintsRequested: revealedHints,
  }

  const interactionMetrics = {
    interviewerQuestionsAnswered,
    interviewerClarificationsRequested,
    interviewerFeedbackAcknowledged,
    proactiveInteractions,
    problemDifficulty: scenario.difficulty,
    problemType: scenario.type,
    skillsDemonstrated: scenario.tags || [],
  }

  return { aiCollaborationMetrics, interactionMetrics }
}

/**
 * Prepare conversation transcript for AI analysis
 */
export function prepareConversationTranscript(
  chatMessages: ChatMessage[],
  interviewerMessages: ChatMessage[]
) {
  return [
    ...interviewerMessages.map((m) => ({
      role: m.type === "user" ? "candidate" : "interviewer",
      content: m.message,
      timestamp: m.timestamp,
    })),
    ...chatMessages.map((m) => ({
      role: m.type === "user" ? "candidate" : "ai_partner",
      content: m.message,
      timestamp: m.timestamp,
    })),
  ].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))
}

/**
 * Generate comprehensive feedback from coding session
 */
export async function generateFeedback({
  code,
  scenario,
  testResults,
  selectedLanguage,
  elapsedTime,
  chatMessages,
  interviewerMessages,
  revealedHints,
  efficiencyMetrics,
  sessionId,
  userId,
  silentNotes,
}: GenerateFeedbackOptions): Promise<FeedbackResult> {
  const { aiCollaborationMetrics, interactionMetrics } = calculateInteractionMetrics(
    chatMessages,
    interviewerMessages,
    revealedHints,
    scenario
  )

  // Calculate test summary
  const testSummary = {
    passed: testResults.filter((t) => t.passed).length,
    total: testResults.length,
    passRate:
      testResults.length > 0
        ? Math.round((testResults.filter((t) => t.passed).length / testResults.length) * 100)
        : 0,
  }

  // Default feedback
  let comprehensiveFeedback = `Completed ${scenario.title} with ${testSummary.passed}/${testSummary.total} tests passing`
  let calculatedPerformanceScore = testSummary.passRate
  let constitutionalAICritique = null

  if (sessionId && userId && code.trim()) {
    try {
      logger.info("[FeedbackGenerator] Starting feedback generation", {
        sessionId,
        userId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        testsPassed: testSummary.passed,
        testsTotal: testSummary.total,
        codeLength: code.length,
        interviewerMessagesCount: interviewerMessages.length,
        chatMessagesCount: chatMessages.length,
      })

      // Prepare conversation transcript for content-based evaluation
      const conversationTranscript = prepareConversationTranscript(
        chatMessages,
        interviewerMessages
      )

      const token = await getCurrentUserToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`
      const feedbackResponse = await fetch("/api/generate-feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code,
          scenarioTitle: scenario.title,
          scenarioType: scenario.type,
          scenarioId: scenario.id,
          scenarioDifficulty: scenario.difficulty,
          scenarioPattern: (scenario as any)?.pattern,
          testResults: testResults,
          language: selectedLanguage,
          timeSpent: elapsedTime,
          aiCollaborationMetrics,
          interactionMetrics,
          efficiencyMetrics,
          conversationTranscript,
          sessionId,
          userId,
          // Silent notes: things the interviewer noticed but didn't correct (shown as "What You Missed")
          silentNotes: silentNotes || [],
        }),
      })

      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json()

        logger.info("[FeedbackGenerator] API response received", {
          sessionId,
          hasRawFeedback: !!feedbackData.feedback,
          feedbackLength: feedbackData.feedback?.length || 0,
          performanceScore: feedbackData.performanceScore,
          technicalScore: feedbackData.technicalScore,
          hasStructured: !!feedbackData.structured,
          hasTldr: !!feedbackData.structured?.tldr,
          whatWorkedCount: feedbackData.structured?.whatWorked?.length || 0,
          fixNextCount: feedbackData.structured?.fixNext?.length || 0,
          provider: feedbackData.provider,
          latencyMs: feedbackData.latencyMs,
        })

        // Check if feedback is missing or suspiciously short
        if (!feedbackData.feedback || feedbackData.feedback.length < 100) {
          logger.warn("[FeedbackGenerator] Feedback missing or too short", {
            sessionId,
            feedbackLength: feedbackData.feedback?.length || 0,
            feedbackPreview: feedbackData.feedback?.substring(0, 200) || "EMPTY",
            usingFallback: true,
          })
        }

        comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
        calculatedPerformanceScore = feedbackData.performanceScore || calculatedPerformanceScore
        constitutionalAICritique = feedbackData.constitutionalAICritique || null
      } else {
        const errorText = await feedbackResponse.text()
        logger.error("[FeedbackGenerator] API returned error status", {
          sessionId,
          status: feedbackResponse.status,
          statusText: feedbackResponse.statusText,
          errorBody: errorText.substring(0, 500),
        })
      }
    } catch (feedbackError) {
      logger.error("[FeedbackGenerator] Exception during feedback generation", {
        sessionId,
        error: feedbackError instanceof Error ? feedbackError.message : String(feedbackError),
        stack: feedbackError instanceof Error ? feedbackError.stack : undefined,
      })
      toast.warning("Feedback generation delayed", {
        description: "Using basic feedback. Full analysis may be available shortly.",
      })
    }
  } else {
    logger.warn("[FeedbackGenerator] Skipping API call - missing required fields", {
      hasSessionId: !!sessionId,
      hasUserId: !!userId,
      hasCode: !!code.trim(),
      codeLength: code.length,
    })
  }

  return {
    feedback: comprehensiveFeedback,
    performanceScore: calculatedPerformanceScore,
    constitutionalAICritique,
  }
}

/**
 * Generate feedback for system design interviews
 */
export async function generateSystemDesignFeedback({
  code,
  scenario,
  selectedLanguage,
  elapsedTime,
  chatMessages,
  interviewerMessages,
  revealedHints,
  sessionId,
  userId,
}: Omit<GenerateFeedbackOptions, "testResults" | "efficiencyMetrics">): Promise<FeedbackResult> {
  const { aiCollaborationMetrics, interactionMetrics } = calculateInteractionMetrics(
    chatMessages,
    interviewerMessages,
    revealedHints,
    scenario
  )

  // Default feedback
  let comprehensiveFeedback = `Completed system design interview: ${scenario.title}`
  let calculatedPerformanceScore = 0

  if (sessionId && userId) {
    try {
      logger.info("[FeedbackGenerator] Starting system design feedback generation", {
        sessionId,
        userId,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        codeLength: code?.length || 0,
        interviewerMessagesCount: interviewerMessages.length,
        chatMessagesCount: chatMessages.length,
      })

      // Prepare conversation transcript for content-based evaluation
      const conversationTranscript = prepareConversationTranscript(
        chatMessages,
        interviewerMessages
      )

      const token = await getCurrentUserToken()
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (token) headers.Authorization = `Bearer ${token}`
      const feedbackResponse = await fetch("/api/generate-feedback", {
        method: "POST",
        headers,
        body: JSON.stringify({
          code: code || "// Design notes completed via discussion",
          scenarioTitle: scenario.title,
          scenarioType: scenario.type,
          scenarioId: scenario.id,
          scenarioDifficulty: scenario.difficulty,
          scenarioPattern: (scenario as any)?.pattern,
          testResults: [], // No tests for system design
          language: selectedLanguage || "notes",
          timeSpent: elapsedTime,
          aiCollaborationMetrics,
          interactionMetrics,
          efficiencyMetrics: null, // No code efficiency for system design
          conversationTranscript,
          sessionId,
          userId,
        }),
      })

      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json()

        logger.info("[FeedbackGenerator] System design API response received", {
          sessionId,
          hasRawFeedback: !!feedbackData.feedback,
          feedbackLength: feedbackData.feedback?.length || 0,
          overallScore: feedbackData.scores?.overall,
          hasStructured: !!feedbackData.structured,
          provider: feedbackData.provider,
          latencyMs: feedbackData.latencyMs,
        })

        comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
        calculatedPerformanceScore = feedbackData.scores?.overall || 0
      } else {
        const errorText = await feedbackResponse.text()
        logger.error("[FeedbackGenerator] System design API returned error", {
          sessionId,
          status: feedbackResponse.status,
          statusText: feedbackResponse.statusText,
          errorBody: errorText.substring(0, 500),
        })
      }
    } catch (error) {
      logger.error("[FeedbackGenerator] Exception during system design feedback", {
        sessionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      toast.error("Failed to generate feedback", {
        description: "There was a problem generating your feedback. Please try again.",
      })
    }
  } else {
    logger.warn("[FeedbackGenerator] Skipping system design API call - missing required fields", {
      hasSessionId: !!sessionId,
      hasUserId: !!userId,
    })
  }

  return {
    feedback: comprehensiveFeedback,
    performanceScore: calculatedPerformanceScore,
  }
}

/**
 * Trigger post-interview discussion with interviewer AI
 */
export async function triggerPostInterviewDiscussion({
  scenario,
  testSummary,
  elapsedTime,
  code,
  efficiencyMetrics,
  interviewerMessages,
  workspaceContext,
  user,
  usageLimit,
}: {
  scenario: Scenario
  testSummary: { passed: number; total: number; passRate: number }
  elapsedTime: number
  code: string
  efficiencyMetrics: EfficiencyMetrics
  interviewerMessages: ChatMessage[]
  workspaceContext: any[]
  user: any
  usageLimit: any
}): Promise<string | null> {
  try {
    const userProfile = user ? await getUserProfile(user.id) : null

    const discussionPrompt = `[POST-INTERVIEW DISCUSSION - CONTINUE CONVERSATION] This is a continuation of our interview conversation. The candidate has just completed their coding solution.

TEST RESULTS: ${testSummary.passed}/${testSummary.total} tests passed (${testSummary.passRate}% pass rate)
TIME SPENT: ${Math.floor(elapsedTime / 60)} minutes ${elapsedTime % 60} seconds
EFFICIENCY METRICS:
- Time Complexity: ${efficiencyMetrics.estimatedTimeComplexity} (Optimal: ${efficiencyMetrics.optimalTimeComplexity})
- Space Complexity: ${efficiencyMetrics.estimatedSpaceComplexity} (Optimal: ${efficiencyMetrics.optimalSpaceComplexity})
- Efficiency Score: ${efficiencyMetrics.efficiencyScore}/100
- Code Complexity: ${efficiencyMetrics.complexity}
- Lines of Code: ${efficiencyMetrics.linesOfCode}

IMPORTANT: This is a POST-INTERVIEW DISCUSSION phase. You should:
1. Continue the conversation naturally - reference previous discussion points if relevant
2. Discuss the results and solution quality
3. Ask if they have questions about the solution, complexity, or optimizations
4. Be conversational - this is a debrief, not a restart

Do NOT reintroduce yourself. Continue as if we're in the middle of a discussion about their completed solution.

Be conversational and thorough - like a real interviewer debriefing after a coding interview.`

    const token = await getCurrentUserToken()
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (token) headers.Authorization = `Bearer ${token}`
    const response = await fetch("/api/chat", {
      method: "POST",
      headers,
      body: JSON.stringify({
        message: discussionPrompt,
        context: interviewerMessages,
        role: "interviewer",
        userContext: userProfile
          ? {
              email: user?.email,
              subscription_tier: userProfile.subscription_tier,
              sessions_used: usageLimit?.used || 0,
            }
          : undefined,
        workspaceContext: workspaceContext,
        currentCode: code,
        scenarioTitle: scenario.title,
        scenarioType: scenario.type,
        isProactive: false,
      }),
    })

    const data = await response.json()

    if (data.reply) {
      return data.reply
    }

    return null
  } catch (error) {
    console.error("Error in post-interview discussion:", error)
    toast.error("Failed to start discussion")
    return null
  }
}

/**
 * Track session completion metrics
 */
export async function trackSessionCompletion(
  firebaseUser: FirebaseUser | null,
  params: {
    sessionId: string
    finalCode: string
    language: string
    testsPassed: number
    testsTotal: number
    efficiencyScore: number
    communicationScore?: number
  }
): Promise<void> {
  try {
    const token = await firebaseUser?.getIdToken()
    if (!token) return

    await fetch("/api/session/metrics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event: "session_complete",
        sessionId: params.sessionId,
        data: {
          finalCode: params.finalCode,
          language: params.language,
          testsPassed: params.testsPassed,
          testsTotal: params.testsTotal,
          efficiencyScore: params.efficiencyScore,
          communicationScore: params.communicationScore,
        },
      }),
    })
  } catch (error) {
    console.error("[Session Metrics] Failed to track completion:", error)
  }
}
