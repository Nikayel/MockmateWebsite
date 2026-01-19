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
import { getUserProfile, updateInterviewSession } from "@/lib/firestore-helpers"
import { toast } from "sonner"

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
      // Prepare conversation transcript for content-based evaluation
      const conversationTranscript = prepareConversationTranscript(
        chatMessages,
        interviewerMessages
      )

      const feedbackResponse = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
        calculatedPerformanceScore = feedbackData.performanceScore || calculatedPerformanceScore
        constitutionalAICritique = feedbackData.constitutionalAICritique || null
      }
    } catch (feedbackError) {
      console.error("Error generating feedback:", feedbackError)
      toast.warning("Feedback generation delayed", {
        description: "Using basic feedback. Full analysis may be available shortly.",
      })
    }
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
      // Prepare conversation transcript for content-based evaluation
      const conversationTranscript = prepareConversationTranscript(
        chatMessages,
        interviewerMessages
      )

      const feedbackResponse = await fetch("/api/generate-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        comprehensiveFeedback = feedbackData.feedback || comprehensiveFeedback
        calculatedPerformanceScore = feedbackData.scores?.overall || 0
      }
    } catch (error) {
      console.error("Error generating system design feedback:", error)
      toast.error("Failed to generate feedback", {
        description: "There was a problem generating your feedback. Please try again.",
      })
    }
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

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
