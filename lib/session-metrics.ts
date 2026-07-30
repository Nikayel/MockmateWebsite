/**
 * Session Metrics Tracking System
 *
 * Comprehensive tracking of user interactions during interview sessions.
 * Collects data for:
 * - Performance analysis and scoring
 * - RAG personalization
 * - Algorithm research (SM-2 vs FSRS)
 * - User insights and recommendations
 */

import { adminDb } from "./firebase-admin"
import { FieldValue, Timestamp } from "firebase-admin/firestore"
import { trackUsageEvent } from "./usage-tracking"
import type { InteractionMetrics, ScoreBreakdown } from "./scoring"
import { calculateUserScore, getPerformanceFeedback } from "./scoring"
import {
  calculateMasteryScore,
  fromInteractionMetrics,
  type MasteryScoreResult,
} from "./spaced-repetition/mastery-score"
import { analyzeMessage } from "./scoring/keyword-detection"
import { getTodayInTimezone, DEFAULT_TIMEZONE } from "./email/timezone"
import { learningStateMeta } from "./learning-state"
import { advanceStreak } from "./spaced-repetition/streak"
import { clampPracticeMinutes } from "./session-duration"
import type { Profile } from "./types"
import {
  calculateInstantScores,
  buildSignalsFromMetrics,
  type AccumulatedScores,
} from "./feedback/score-accumulator"

// =============================================================================
// TYPES
// =============================================================================

export interface SessionMetricsState {
  sessionId: string
  userId: string
  scenarioId: string
  scenarioTitle: string
  pattern: string
  difficulty: "easy" | "medium" | "hard"
  scenarioType: "dsa" | "bugfix" | "system-design"

  // Timestamps
  startedAt: string
  lastActivityAt: string
  completedAt?: string

  // Chat tracking
  chatMessages: ChatMetric[]
  interviewerMessages: ChatMetric[]
  totalChatMessages: number
  totalInterviewerMessages: number

  // AI collaboration
  aiQuestionsAsked: number
  aiSuggestionsReceived: number
  aiSuggestionsApplied: number
  aiSuggestionsCopiedBlindly: number

  // Hints
  hintsViewed: number[]
  hintsTotal: number
  timeToFirstHint?: number // seconds from start

  // Code execution
  codeExecutions: CodeExecutionMetric[]
  totalExecutions: number
  successfulExecutions: number

  // Problem solving signals
  approachExplained: boolean
  complexityDiscussed: boolean
  edgeCasesIdentified: string[]
  debuggingAttempts: number
  optimizationAttempts: number

  // Workspace (for bugfix/system-design)
  filesViewed: string[]
  workspaceContextUsed: boolean

  // Communication quality (updated by AI analysis)
  communicationScore?: number
  thoughtProcessShared?: number

  // Final state
  finalCode?: string
  language?: string
  testsPassed?: number
  testsTotal?: number
  efficiencyScore?: number
  performanceScore?: number

  // Pre-computed scores (updated in real-time for instant feedback)
  accumulatedScores?: AccumulatedScores
  testsRanBeforeSubmit?: boolean
  submittedFromPhase?: string
  hasActualLogic?: boolean
  codeLength?: number
}

export interface ChatMetric {
  timestamp: string
  type: "user" | "ai"
  messageLength: number
  containsCode: boolean
  containsQuestion: boolean
  responseTimeMs?: number // time since last message
}

export interface CodeExecutionMetric {
  timestamp: string
  passed: number
  total: number
  hasErrors: boolean
  executionTimeMs: number
}

export interface SessionSummary {
  sessionId: string
  userId: string
  scenarioId: string
  pattern: string
  difficulty: "easy" | "medium" | "hard"
  durationMinutes: number
  performanceScore: number // Interview score (includes communication)
  masteryScore: number // Code-focused score for SR algorithm
  masteryScoreDetails: MasteryScoreResult // Breakdown for analytics
  scoreBreakdown: ScoreBreakdown
  feedback: ReturnType<typeof getPerformanceFeedback>
  interactionMetrics: InteractionMetrics
  completedAt: string
  isReconstructedSession?: boolean // True if session was reconstructed from fallback (incomplete metrics data)
}

// =============================================================================
// IN-MEMORY SESSION TRACKING (for active sessions)
// =============================================================================

// Store active sessions in memory for fast updates
const activeSessions = new Map<string, SessionMetricsState>()

/**
 * Initialize metrics tracking for a new session
 */
export async function initSessionMetrics(params: {
  sessionId: string
  userId: string
  scenarioId: string
  scenarioTitle: string
  pattern: string
  difficulty: "easy" | "medium" | "hard"
  scenarioType: "dsa" | "bugfix" | "system-design"
  hintsTotal: number
}): Promise<SessionMetricsState> {
  const now = new Date().toISOString()

  const state: SessionMetricsState = {
    sessionId: params.sessionId,
    userId: params.userId,
    scenarioId: params.scenarioId,
    scenarioTitle: params.scenarioTitle,
    pattern: params.pattern,
    difficulty: params.difficulty,
    scenarioType: params.scenarioType,
    startedAt: now,
    lastActivityAt: now,
    chatMessages: [],
    interviewerMessages: [],
    totalChatMessages: 0,
    totalInterviewerMessages: 0,
    aiQuestionsAsked: 0,
    aiSuggestionsReceived: 0,
    aiSuggestionsApplied: 0,
    aiSuggestionsCopiedBlindly: 0,
    hintsViewed: [],
    hintsTotal: params.hintsTotal,
    codeExecutions: [],
    totalExecutions: 0,
    successfulExecutions: 0,
    approachExplained: false,
    complexityDiscussed: false,
    edgeCasesIdentified: [],
    debuggingAttempts: 0,
    optimizationAttempts: 0,
    filesViewed: [],
    workspaceContextUsed: false,
  }

  // Store in memory
  activeSessions.set(params.sessionId, state)

  // Track session start event
  await trackUsageEvent({
    userId: params.userId,
    eventType: "session_start",
    sessionId: params.sessionId,
    scenarioId: params.scenarioId,
    metadata: {
      pattern: params.pattern,
      difficulty: params.difficulty,
      scenarioType: params.scenarioType,
    },
  })

  return state
}

/**
 * Get current session metrics state
 */
export function getSessionMetrics(sessionId: string): SessionMetricsState | null {
  return activeSessions.get(sessionId) || null
}

/**
 * Confirm a session belongs to the authenticated user before any metrics event mutates or
 * reads it. Without this, the metrics route authenticates the caller but then trusts the
 * client-supplied sessionId, letting any signed-in user corrupt or read another user's
 * session (an IDOR). Checks the in-memory state first (the common case, free), then falls
 * back to the persisted interview_sessions doc for sessions not resident on this instance.
 * Returns "not_found" when neither exists — there is no data to protect in that case.
 */
export async function verifySessionOwnership(
  sessionId: string,
  userId: string
): Promise<"ok" | "forbidden" | "not_found"> {
  const state = activeSessions.get(sessionId)
  if (state) return state.userId === userId ? "ok" : "forbidden"
  try {
    const doc = await adminDb.collection("interview_sessions").doc(sessionId).get()
    if (!doc.exists) return "not_found"
    return doc.data()?.user_id === userId ? "ok" : "forbidden"
  } catch {
    return "not_found"
  }
}

/**
 * Recalculate accumulated scores based on current session state
 * Called automatically after significant events (test run, message, hint)
 */
function recalculateAccumulatedScores(state: SessionMetricsState): void {
  const signals = buildSignalsFromMetrics({
    testsPassed: state.testsPassed,
    testsTotal: state.testsTotal,
    efficiencyScore: state.efficiencyScore ?? 50,
    codeLength: state.codeLength ?? 0,
    hasActualLogic: state.hasActualLogic ?? true,
    approachExplained: state.approachExplained,
    complexityDiscussed: state.complexityDiscussed,
    complexityCorrect: false, // We don't know this yet without AI
    edgeCasesIdentified: state.edgeCasesIdentified,
    hintsViewed: state.hintsViewed,
    totalInterviewerMessages: state.totalInterviewerMessages,
    totalChatMessages: state.totalChatMessages,
    aiSuggestionsCopiedBlindly: state.aiSuggestionsCopiedBlindly,
    testsRanBeforeSubmit: state.testsRanBeforeSubmit,
    submittedFromPhase: state.submittedFromPhase,
    scenarioType: state.scenarioType,
    difficulty: state.difficulty,
  })

  state.accumulatedScores = calculateInstantScores(signals)
}

/**
 * Get instant scores for a session (for two-phase feedback)
 * Returns pre-computed scores without any AI calls
 */
export function getInstantScores(sessionId: string): AccumulatedScores | null {
  const state = activeSessions.get(sessionId)
  if (!state) return null

  // Recalculate to ensure latest state
  recalculateAccumulatedScores(state)
  return state.accumulatedScores || null
}

/**
 * Update code analysis data for score calculation
 */
export function updateCodeAnalysis(
  sessionId: string,
  data: {
    codeLength: number
    hasActualLogic: boolean
    efficiencyScore?: number
  }
): void {
  const state = activeSessions.get(sessionId)
  if (!state) return

  state.codeLength = data.codeLength
  state.hasActualLogic = data.hasActualLogic
  if (data.efficiencyScore !== undefined) {
    state.efficiencyScore = data.efficiencyScore
  }

  recalculateAccumulatedScores(state)
}

/**
 * Mark that tests were run (for phase tracking)
 */
export function markTestsRan(sessionId: string): void {
  const state = activeSessions.get(sessionId)
  if (!state) return

  state.testsRanBeforeSubmit = true
  recalculateAccumulatedScores(state)
}

/**
 * Set the phase from which user submitted
 */
export function setSubmittedFromPhase(sessionId: string, phase: string): void {
  const state = activeSessions.get(sessionId)
  if (!state) return

  state.submittedFromPhase = phase
  recalculateAccumulatedScores(state)
}

/**
 * Track a chat message
 */
export async function trackChatMessage(params: {
  sessionId: string
  type: "user" | "ai"
  message: string
  chatType: "partner" | "interviewer"
}): Promise<void> {
  const state = activeSessions.get(params.sessionId)
  if (!state) return

  const now = new Date().toISOString()
  const lastMessage =
    params.chatType === "partner"
      ? state.chatMessages[state.chatMessages.length - 1]
      : state.interviewerMessages[state.interviewerMessages.length - 1]

  const metric: ChatMetric = {
    timestamp: now,
    type: params.type,
    messageLength: params.message.length,
    containsCode: /```|function|const |let |var |def |class /.test(params.message),
    containsQuestion: /\?/.test(params.message),
    responseTimeMs: lastMessage
      ? new Date(now).getTime() - new Date(lastMessage.timestamp).getTime()
      : undefined,
  }

  if (params.chatType === "partner") {
    state.chatMessages.push(metric)
    state.totalChatMessages++

    // Track AI interactions
    if (params.type === "user" && metric.containsQuestion) {
      state.aiQuestionsAsked++
    }
    if (params.type === "ai") {
      state.aiSuggestionsReceived++
    }

    // Also analyze partner chat for signals (users may explain approach to AI partner)
    if (params.type === "user") {
      const analysis = analyzeMessage(params.message)
      if (analysis.detection.approachExplained) {
        state.approachExplained = true
      }
      if (analysis.detection.complexityDiscussed) {
        state.complexityDiscussed = true
      }
      for (const edgeCase of analysis.detection.edgeCasesMentioned) {
        if (!state.edgeCasesIdentified.includes(edgeCase)) {
          state.edgeCasesIdentified.push(edgeCase)
        }
      }
    }
  } else {
    state.interviewerMessages.push(metric)
    state.totalInterviewerMessages++

    // Analyze user messages for scoring signals using improved keyword detection
    if (params.type === "user") {
      const analysis = analyzeMessage(params.message)

      // Update state based on detected signals
      if (analysis.detection.approachExplained) {
        state.approachExplained = true
      }
      if (analysis.detection.complexityDiscussed) {
        state.complexityDiscussed = true
      }
      if (analysis.detection.optimizationMentioned) {
        state.optimizationAttempts++
      }
      if (analysis.detection.debuggingMentioned) {
        state.debuggingAttempts++
      }

      // Track edge cases
      for (const edgeCase of analysis.detection.edgeCasesMentioned) {
        if (!state.edgeCasesIdentified.includes(edgeCase)) {
          state.edgeCasesIdentified.push(edgeCase)
        }
      }

      // Track clarifying questions
      if (analysis.detection.clarifyingQuestion) {
        // This will be counted in InteractionMetrics
      }
    }
  }

  state.lastActivityAt = now

  // Recalculate scores after message (communication signals updated)
  recalculateAccumulatedScores(state)

  // Track chat message usage (fire and forget)
  trackUsageEvent({
    userId: state.userId,
    eventType: "chat_message",
    sessionId: params.sessionId,
    metadata: {
      chatType: params.chatType,
      messageType: params.type,
      messageLength: params.message.length,
    },
  }).catch(() => {}) // Don't fail on tracking errors
}

/**
 * Track hint reveal
 */
export async function trackHintReveal(params: {
  sessionId: string
  hintIndex: number
}): Promise<void> {
  const state = activeSessions.get(params.sessionId)
  if (!state) return

  const now = new Date().toISOString()

  if (!state.hintsViewed.includes(params.hintIndex)) {
    state.hintsViewed.push(params.hintIndex)

    // Track time to first hint
    if (state.hintsViewed.length === 1) {
      const startTime = new Date(state.startedAt).getTime()
      const hintTime = new Date(now).getTime()
      state.timeToFirstHint = Math.round((hintTime - startTime) / 1000)
    }
  }

  state.lastActivityAt = now

  // Track hint usage event
  await trackUsageEvent({
    userId: state.userId,
    eventType: "hint_request",
    sessionId: params.sessionId,
    metadata: {
      hintIndex: params.hintIndex,
      hintsRevealed: state.hintsViewed.length,
      hintsTotal: state.hintsTotal,
      timeToFirstHint: state.timeToFirstHint,
    },
  })
}

/**
 * Track code execution
 */
export async function trackCodeExecution(params: {
  sessionId: string
  passed: number
  total: number
  hasErrors: boolean
  executionTimeMs: number
}): Promise<void> {
  const state = activeSessions.get(params.sessionId)
  if (!state) return

  const now = new Date().toISOString()

  const metric: CodeExecutionMetric = {
    timestamp: now,
    passed: params.passed,
    total: params.total,
    hasErrors: params.hasErrors,
    executionTimeMs: params.executionTimeMs,
  }

  state.codeExecutions.push(metric)
  state.totalExecutions++

  // Update test results for instant scoring
  state.testsPassed = params.passed
  state.testsTotal = params.total
  state.testsRanBeforeSubmit = true

  if (params.passed === params.total && !params.hasErrors) {
    state.successfulExecutions++
  }

  // Track debugging attempts (failed executions followed by changes)
  if (params.passed < params.total || params.hasErrors) {
    state.debuggingAttempts++
  }

  state.lastActivityAt = now

  // Recalculate scores after test execution (important signal)
  recalculateAccumulatedScores(state)
}

/**
 * Track file view (for bugfix/system-design)
 */
export function trackFileView(sessionId: string, fileName: string): void {
  const state = activeSessions.get(sessionId)
  if (!state) return

  if (!state.filesViewed.includes(fileName)) {
    state.filesViewed.push(fileName)
    state.workspaceContextUsed = true
  }

  state.lastActivityAt = new Date().toISOString()
}

/**
 * Track optimization attempt
 */
export function trackOptimizationAttempt(sessionId: string): void {
  const state = activeSessions.get(sessionId)
  if (!state) return

  state.optimizationAttempts++
  state.lastActivityAt = new Date().toISOString()
}

/**
 * Track AI suggestion application
 */
export function trackAISuggestionApplied(sessionId: string, wasUnderstood: boolean): void {
  const state = activeSessions.get(sessionId)
  if (!state) return

  if (wasUnderstood) {
    state.aiSuggestionsApplied++
  } else {
    state.aiSuggestionsCopiedBlindly++
  }

  state.lastActivityAt = new Date().toISOString()
}

/**
 * Complete session and calculate final metrics
 */
export async function completeSessionMetrics(params: {
  sessionId: string
  finalCode: string
  language: string
  testsPassed: number
  testsTotal: number
  efficiencyScore: number
  communicationScore?: number
  thoughtProcessShared?: number
}): Promise<SessionSummary | null> {
  let state = activeSessions.get(params.sessionId)
  let isReconstructedSession = false

  // Fallback: If session not in memory (server restart, edge function cold start, etc.)
  // try to reconstruct minimal state from interview_sessions collection
  if (!state) {
    console.warn(
      `[Session Metrics] Session ${params.sessionId} not in memory, attempting fallback...`
    )
    isReconstructedSession = true // Mark as reconstructed - we have incomplete metrics data
    try {
      const sessionDoc = await adminDb.collection("interview_sessions").doc(params.sessionId).get()
      if (sessionDoc.exists) {
        const data = sessionDoc.data()!
        // Reconstruct minimal state for scoring
        state = {
          sessionId: params.sessionId,
          userId: data.user_id,
          scenarioId: data.scenario_id || params.sessionId,
          scenarioTitle: data.topic || "Unknown",
          pattern: data.pattern || data.type || "unknown",
          difficulty: data.difficulty || "medium",
          scenarioType: data.type || "dsa",
          startedAt: data.started_at || data.created_at || new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
          chatMessages: [],
          interviewerMessages: [],
          totalChatMessages: 0,
          totalInterviewerMessages: 0,
          aiQuestionsAsked: 0,
          aiSuggestionsReceived: 0,
          aiSuggestionsApplied: 0,
          aiSuggestionsCopiedBlindly: 0,
          hintsViewed: [],
          hintsTotal: 3,
          codeExecutions: [],
          totalExecutions: 0,
          successfulExecutions: params.testsPassed > 0 ? 1 : 0,
          approachExplained: false,
          complexityDiscussed: false,
          edgeCasesIdentified: [],
          debuggingAttempts: 0,
          optimizationAttempts: 0,
          filesViewed: [],
          workspaceContextUsed: false,
        }
        console.log(
          `[Session Metrics] Reconstructed session from interview_sessions: ${params.sessionId}`
        )
      } else {
        console.error(
          `[Session Metrics] No active session found and no fallback available: ${params.sessionId}`
        )
        return null
      }
    } catch (fallbackError) {
      console.error(
        `[Session Metrics] Fallback failed for session ${params.sessionId}:`,
        fallbackError
      )
      return null
    }
  }

  const now = new Date().toISOString()
  // Clamped, not raw wall clock: `startedAt` is stamped when the workspace loads, so a
  // tab left open overnight or a session resumed from autosave days later would
  // otherwise book its whole idle gap as practice (and, via `timeSpent` below, zero out
  // the time-efficiency component of the mastery score). See lib/session-duration.ts.
  const durationMinutes = clampPracticeMinutes(state.startedAt, now)

  // Update final state
  state.completedAt = now
  state.finalCode = params.finalCode
  state.language = params.language
  state.testsPassed = params.testsPassed
  state.testsTotal = params.testsTotal
  state.efficiencyScore = params.efficiencyScore
  state.communicationScore = params.communicationScore
  state.thoughtProcessShared = params.thoughtProcessShared

  // Build InteractionMetrics for scoring
  const interactionMetrics: InteractionMetrics = {
    // Code Understanding
    codeExplanationQuality: state.communicationScore || 50,
    approachExplanationGiven: state.approachExplained,
    complexityAnalysisProvided: state.complexityDiscussed,
    edgeCasesIdentified: state.edgeCasesIdentified.length,

    // Debugging
    debuggingAttempts: state.debuggingAttempts,
    testDrivenApproach: state.totalExecutions > 2,
    systematicDebugging: state.debuggingAttempts > 0 && state.successfulExecutions > 0,

    // Code Quality
    testCasesPassed: params.testsPassed,
    testCasesTotal: params.testsTotal,
    codeEfficiencyScore: params.efficiencyScore,
    codeQualityScore: params.efficiencyScore, // Can be enhanced with linting
    codeReadability: 60, // Default - could be analyzed

    // Problem-Solving
    brokeDownProblem: state.approachExplained,
    consideredAlternatives: state.optimizationAttempts > 0,
    optimizationAttempted: state.optimizationAttempts > 0,

    // AI Collaboration
    aiQuestionsAsked: state.aiQuestionsAsked,
    aiSuggestionsUnderstood: state.aiSuggestionsApplied,
    aiSuggestionsMisunderstood: state.aiSuggestionsCopiedBlindly,
    aiUsedStrategically: state.aiQuestionsAsked > 0 && state.aiSuggestionsCopiedBlindly === 0,

    // Communication
    interviewerQuestionsAnswered: state.interviewerMessages.filter((m) => m.type === "user").length,
    clarifyingQuestionsAsked: state.interviewerMessages.filter(
      (m) => m.type === "user" && m.containsQuestion
    ).length,
    thoughtProcessShared: state.thoughtProcessShared || 50,

    // Problem Context
    problemDifficulty: state.difficulty,
    problemType: state.scenarioType,
    skillsDemonstrated: [state.pattern],

    // Time & Hints
    timeSpent: durationMinutes * 60,
    hintsRevealed: state.hintsViewed.length,
    hintsTotal: state.hintsTotal,

    // Workspace
    workspaceFilesViewed: state.filesViewed.length,
    workspaceFilesTotal: state.scenarioType !== "dsa" ? 5 : 0, // Approximate
    workspaceContextUsed: state.workspaceContextUsed,
  }

  // Calculate score using the scoring system
  const scoreBreakdown = calculateUserScore(interactionMetrics)
  const feedback = getPerformanceFeedback(scoreBreakdown)

  // Calculate mastery score for spaced repetition (code-focused, excludes communication)
  // This is what the SR algorithm uses to determine review intervals
  const masteryInput = fromInteractionMetrics(interactionMetrics)
  const masteryScoreDetails = calculateMasteryScore(masteryInput)

  state.performanceScore = scoreBreakdown.overallScore

  // Log the score separation for analytics
  console.log("[Session Metrics] Score breakdown:", {
    sessionId: state.sessionId,
    performanceScore: scoreBreakdown.overallScore, // Interview score (with communication)
    masteryScore: masteryScoreDetails.masteryScore, // Code-focused score (for SR)
    difference: scoreBreakdown.overallScore - masteryScoreDetails.masteryScore,
    components: masteryScoreDetails.components,
  })

  // Create summary
  const summary: SessionSummary = {
    sessionId: state.sessionId,
    userId: state.userId,
    scenarioId: state.scenarioId,
    pattern: state.pattern,
    difficulty: state.difficulty,
    durationMinutes,
    performanceScore: scoreBreakdown.overallScore,
    masteryScore: masteryScoreDetails.masteryScore,
    masteryScoreDetails,
    scoreBreakdown,
    feedback,
    interactionMetrics,
    completedAt: now,
    isReconstructedSession, // Track if this was reconstructed from fallback (incomplete metrics)
  }

  // Track session end event
  await trackUsageEvent({
    userId: state.userId,
    eventType: "session_end",
    sessionId: params.sessionId,
    metadata: {
      durationMinutes,
      performanceScore: scoreBreakdown.overallScore,
      masteryScore: masteryScoreDetails.masteryScore,
      testsPassed: params.testsPassed,
      testsTotal: params.testsTotal,
    },
  })

  // Store session summary for RAG and analytics
  await storeSessionSummary(summary)

  // Clean up memory
  activeSessions.delete(params.sessionId)

  return summary
}

// =============================================================================
// PERSISTENCE
// =============================================================================

/**
 * Store session summary for analytics and RAG
 */
async function storeSessionSummary(summary: SessionSummary): Promise<void> {
  try {
    // Technical score is now the same as mastery score (objective metrics)
    const technicalScore = summary.masteryScore

    // Store in user's session history
    await adminDb
      .collection("users")
      .doc(summary.userId)
      .collection("session_summaries")
      .doc(summary.sessionId)
      .set({
        ...summary,
        createdAt: FieldValue.serverTimestamp(),
      })

    // Sync performance_score to interview_sessions for dashboard consistency
    // This ensures "Recent Avg" shows the same score as "This Week"
    // IMPORTANT: Pass isReconstructedSession to prevent overwriting authoritative scores
    await syncScoreToInterviewSession(
      summary.sessionId,
      summary.performanceScore,
      technicalScore,
      summary.scoreBreakdown,
      summary.isReconstructedSession ?? false
    )

    // Update all user learning data in parallel
    await Promise.all([
      updateUserAggregateStats(summary),
      updateUserLearningState(summary),
      updateUserProblemMastery(summary),
    ])
  } catch (error) {
    console.error("[Session Metrics] Failed to store summary:", error)
  }
}

/**
 * Sync score to interview_sessions collection
 * Ensures dashboard "Recent Avg" matches "This Week" percentage
 *
 * IMPORTANT: Only syncs if no authoritative score exists from generate-feedback API.
 * This prevents race conditions where metrics tracking (with incomplete data) overwrites
 * the proper AI-calculated score from the feedback generation.
 */
async function syncScoreToInterviewSession(
  sessionId: string,
  performanceScore: number,
  technicalScore: number,
  scoreBreakdown: ScoreBreakdown,
  isReconstructedSession: boolean = false
): Promise<void> {
  try {
    // ALWAYS check if authoritative score already exists from generate-feedback API
    // The feedback API calculates scores with full AI validation - those are the source of truth
    // Our locally-calculated scores from interaction metrics are less accurate
    const sessionDoc = await adminDb.collection("interview_sessions").doc(sessionId).get()
    const existingData = sessionDoc.data()

    // If feedback_status is 'complete' and we have a score_breakdown, the generate-feedback API
    // already set the authoritative scores - don't overwrite them with our estimated scores
    if (
      existingData?.feedback_status === "complete" &&
      existingData?.score_breakdown &&
      typeof existingData.score_breakdown.understandingScore === "number"
    ) {
      console.log(
        `[Session Metrics] Skipping score sync for ${sessionId} - authoritative score_breakdown exists from generate-feedback`
      )
      return
    }

    // Only sync scores if no authoritative scores exist (fallback case)
    await adminDb
      .collection("interview_sessions")
      .doc(sessionId)
      .set(
        {
          performance_score: performanceScore,
          technical_score: technicalScore,
          score_breakdown: {
            understandingScore: scoreBreakdown.understandingScore,
            problemSolvingScore: scoreBreakdown.problemSolvingScore,
            codeQualityScore: scoreBreakdown.codeQualityScore,
            communicationScore: scoreBreakdown.communicationScore,
            overallScore: scoreBreakdown.overallScore,
          },
          scores_synced_at: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
  } catch (error) {
    // Non-blocking - don't fail if sync fails
    console.error("[Session Metrics] Failed to sync score to interview_sessions:", error)
  }
}

/**
 * Update user's aggregate statistics
 */
async function updateUserAggregateStats(summary: SessionSummary): Promise<void> {
  const userStatsRef = adminDb.collection("user_stats").doc(summary.userId)

  // Technical score is now the same as mastery score (objective metrics)
  const technicalScore = summary.masteryScore

  await adminDb.runTransaction(async (transaction) => {
    const doc = await transaction.get(userStatsRef)

    if (!doc.exists) {
      // Create new stats document
      transaction.set(userStatsRef, {
        userId: summary.userId,
        totalSessions: 1,
        totalPracticeMinutes: summary.durationMinutes,
        totalScore: summary.performanceScore,
        totalTechnicalScore: technicalScore,
        averageScore: summary.performanceScore,
        averageTechnicalScore: technicalScore,
        patternStats: {
          [summary.pattern]: {
            sessions: 1,
            totalScore: summary.performanceScore,
            totalTechnicalScore: technicalScore,
            averageScore: summary.performanceScore,
            averageTechnicalScore: technicalScore,
            bestScore: summary.performanceScore,
            bestTechnicalScore: technicalScore,
          },
        },
        difficultyStats: {
          [summary.difficulty]: {
            sessions: 1,
            totalScore: summary.performanceScore,
            totalTechnicalScore: technicalScore,
            averageScore: summary.performanceScore,
            averageTechnicalScore: technicalScore,
          },
        },
        lastSessionAt: summary.completedAt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      const data = doc.data()!
      const totalSessions = (data.totalSessions || 0) + 1
      const totalScore = (data.totalScore || 0) + summary.performanceScore
      const totalTechnicalScore = (data.totalTechnicalScore || 0) + technicalScore

      // Update pattern stats
      const patternStats = data.patternStats || {}
      const patternData = patternStats[summary.pattern] || {
        sessions: 0,
        totalScore: 0,
        totalTechnicalScore: 0,
        averageScore: 0,
        averageTechnicalScore: 0,
        bestScore: 0,
        bestTechnicalScore: 0,
      }
      patternData.sessions++
      patternData.totalScore += summary.performanceScore
      patternData.totalTechnicalScore = (patternData.totalTechnicalScore || 0) + technicalScore
      patternData.averageScore = Math.round(patternData.totalScore / patternData.sessions)
      patternData.averageTechnicalScore = Math.round(
        patternData.totalTechnicalScore / patternData.sessions
      )
      patternData.bestScore = Math.max(patternData.bestScore, summary.performanceScore)
      patternData.bestTechnicalScore = Math.max(patternData.bestTechnicalScore || 0, technicalScore)
      patternStats[summary.pattern] = patternData

      // Update difficulty stats
      const difficultyStats = data.difficultyStats || {}
      const diffData = difficultyStats[summary.difficulty] || {
        sessions: 0,
        totalScore: 0,
        totalTechnicalScore: 0,
        averageScore: 0,
        averageTechnicalScore: 0,
      }
      diffData.sessions++
      diffData.totalScore += summary.performanceScore
      diffData.totalTechnicalScore = (diffData.totalTechnicalScore || 0) + technicalScore
      diffData.averageScore = Math.round(diffData.totalScore / diffData.sessions)
      diffData.averageTechnicalScore = Math.round(diffData.totalTechnicalScore / diffData.sessions)
      difficultyStats[summary.difficulty] = diffData

      transaction.update(userStatsRef, {
        totalSessions,
        totalPracticeMinutes: FieldValue.increment(summary.durationMinutes),
        totalScore,
        totalTechnicalScore,
        averageScore: Math.round(totalScore / totalSessions),
        averageTechnicalScore: Math.round(totalTechnicalScore / totalSessions),
        patternStats,
        difficultyStats,
        lastSessionAt: summary.completedAt,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }
  })
}

/**
 * Update user's learning state (streak, topics, last active)
 * This powers the Learning Progress display in admin dashboard
 *
 * IMPORTANT: Uses timezone-aware date calculation to properly track streaks.
 * A user practicing at 11 PM in their timezone should count as practicing
 * "today" even if it's already tomorrow in UTC.
 */
async function updateUserLearningState(summary: SessionSummary): Promise<void> {
  try {
    const learningStateRef = adminDb.collection("user_learning_state").doc(summary.userId)

    // Fetch user's timezone BEFORE the transaction to avoid nested reads
    let userTimezone = DEFAULT_TIMEZONE
    try {
      const profileDoc = await adminDb.collection("profiles").doc(summary.userId).get()
      if (profileDoc.exists) {
        const profile = profileDoc.data() as Profile
        userTimezone = profile.notification_preferences?.timezone || DEFAULT_TIMEZONE
      }
    } catch {
      // Use default timezone if profile fetch fails
    }

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(learningStateRef)
      const now = new Date(summary.completedAt)
      // Use timezone-aware "today" calculation
      const today = getTodayInTimezone(userTimezone)

      if (!doc.exists) {
        // Create new learning state document.
        // Identity/timestamp fields go through learningStateMeta so this writer
        // emits the canonical snake_case shape (user_id/created_at/updated_at)
        // instead of the legacy camelCase spellings.
        transaction.set(learningStateRef, {
          streak_days: 1,
          last_session_at: summary.completedAt,
          last_session_date: today,
          topics: {
            [summary.scenarioId]: {
              pattern: summary.pattern,
              last_practiced_at: summary.completedAt,
              performance_score: summary.performanceScore,
              interval_days: 1,
              ease_factor: 2.5,
            },
          },
          total_sessions: 1,
          ...learningStateMeta(summary.userId, { isNew: true, now }),
        })
      } else {
        const data = doc.data()!

        // Advance the streak via the shared write-side helper (single source of
        // truth in spaced-repetition/streak.ts). It compares calendar days in
        // the user's timezone and is idempotent for same-day / repeat writes, so
        // this writer and the topic-level writer can both fire for one session
        // without double-incrementing.
        const streakDays = advanceStreak(data.streak_days, data.last_session_at, userTimezone, now)

        // Update topics
        const topics = data.topics || {}
        topics[summary.scenarioId] = {
          pattern: summary.pattern,
          last_practiced_at: summary.completedAt,
          performance_score: summary.performanceScore,
          interval_days: topics[summary.scenarioId]?.interval_days || 1,
          ease_factor: topics[summary.scenarioId]?.ease_factor || 2.5,
        }

        transaction.update(learningStateRef, {
          streak_days: streakDays,
          last_session_at: summary.completedAt,
          last_session_date: today,
          topics,
          total_sessions: FieldValue.increment(1),
          // Canonical snake_case meta; also backfills user_id on legacy docs.
          ...learningStateMeta(summary.userId, { isNew: false, now }),
        })
      }
    })
  } catch (error) {
    console.error("[Session Metrics] Failed to update learning state:", error)
  }
}

/**
 * Update user's problem mastery (tracks mastery level per problem)
 * This powers the detailed Learning Progress stats
 *
 * NOTE: Uses unified `problem_mastery` collection (consolidates with spaced repetition)
 *
 * OWNERSHIP: the spaced-repetition schedulers own `mastery_level` and
 * `review_count` on docs that carry scheduling state (`next_review_at`).
 * This writer used to race them with its own heuristic on every session
 * completion, clobbering scheduler output; it now only writes those fields
 * on docs the SR system has never scheduled. Exported for tests.
 */
export async function updateUserProblemMastery(summary: SessionSummary): Promise<void> {
  try {
    // Use problem_mastery (unified collection) instead of user_problem_mastery
    const masteryRef = adminDb
      .collection("problem_mastery")
      .doc(summary.userId)
      .collection("problems")
      .doc(summary.scenarioId)

    await adminDb.runTransaction(async (transaction) => {
      const doc = await transaction.get(masteryRef)

      // Calculate mastery level for spaced repetition
      // Uses canonical MasteryLevel: "new" | "learning" | "reviewing" | "mastered"
      // (defined in lib/scoring/types.ts - must match for getMasteryStatistics to work)
      type MasteryLevel = "new" | "learning" | "reviewing" | "mastered"
      const getMasteryLevel = (score: number, practiceCount: number): MasteryLevel => {
        if (practiceCount < 2) return "new"
        if (score >= 85 && practiceCount >= 5) return "mastered"
        if (score >= 70 && practiceCount >= 3) return "reviewing"
        if (score >= 50) return "learning"
        return "new"
      }

      if (!doc.exists) {
        transaction.set(masteryRef, {
          userId: summary.userId,
          problemId: summary.scenarioId,
          pattern: summary.pattern,
          difficulty: summary.difficulty,
          mastery_level: getMasteryLevel(summary.performanceScore, 1),
          last_score: summary.performanceScore,
          best_score: summary.performanceScore,
          review_count: 1,
          total_score: summary.performanceScore,
          average_score: summary.performanceScore,
          first_review_at: summary.completedAt,
          last_review_at: summary.completedAt,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
      } else {
        const data = doc.data()!
        const reviewCount = (data.review_count || data.practice_count || 0) + 1
        const totalScore = (data.total_score || 0) + summary.performanceScore
        const averageScore = Math.round(totalScore / reviewCount)
        const bestScore = Math.max(data.best_score || 0, summary.performanceScore)

        // Scheduler-owned doc: never overwrite mastery_level/review_count —
        // the SR write paths compute both from actual scheduling state.
        const isSchedulerOwned = typeof data.next_review_at === "string"

        transaction.update(masteryRef, {
          last_score: summary.performanceScore,
          best_score: bestScore,
          total_score: totalScore,
          average_score: averageScore,
          last_review_at: summary.completedAt,
          updatedAt: FieldValue.serverTimestamp(),
          ...(isSchedulerOwned
            ? {}
            : {
                mastery_level: getMasteryLevel(averageScore, reviewCount),
                review_count: reviewCount,
              }),
        })
      }
    })
  } catch (error) {
    console.error("[Session Metrics] Failed to update problem mastery:", error)
  }
}

// =============================================================================
// RETRIEVAL
// =============================================================================

/**
 * Get user's aggregate stats
 */
export async function getUserStats(userId: string): Promise<{
  totalSessions: number
  totalPracticeMinutes: number
  averageScore: number
  averageTechnicalScore?: number
  patternStats: Record<
    string,
    {
      sessions: number
      averageScore: number
      averageTechnicalScore?: number
      bestScore: number
      bestTechnicalScore?: number
    }
  >
  difficultyStats: Record<
    string,
    {
      sessions: number
      averageScore: number
      averageTechnicalScore?: number
    }
  >
  lastSessionAt?: string
} | null> {
  try {
    const doc = await adminDb.collection("user_stats").doc(userId).get()
    if (!doc.exists) return null

    const data = doc.data()!
    return {
      totalSessions: data.totalSessions || 0,
      totalPracticeMinutes: data.totalPracticeMinutes || 0,
      averageScore: data.averageScore || 0,
      averageTechnicalScore: data.averageTechnicalScore,
      patternStats: data.patternStats || {},
      difficultyStats: data.difficultyStats || {},
      lastSessionAt: data.lastSessionAt,
    }
  } catch (error) {
    console.error("[Session Metrics] Failed to get user stats:", error)
    return null
  }
}

/**
 * Get user's recent session summaries
 */
export async function getRecentSessions(
  userId: string,
  limit: number = 10
): Promise<SessionSummary[]> {
  try {
    const snapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("session_summaries")
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get()

    return snapshot.docs.map((doc) => doc.data() as SessionSummary)
  } catch (error) {
    console.error("[Session Metrics] Failed to get recent sessions:", error)
    return []
  }
}

/**
 * Get user's performance trends
 */
export async function getPerformanceTrends(
  userId: string,
  days: number = 30
): Promise<{
  daily: Array<{ date: string; score: number; sessions: number }>
  weeklyAverage: number
  trend: "improving" | "stable" | "declining"
}> {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const snapshot = await adminDb
      .collection("users")
      .doc(userId)
      .collection("session_summaries")
      .where("completedAt", ">=", startDate.toISOString())
      .orderBy("completedAt", "asc")
      .get()

    // Group by date
    const dailyMap = new Map<string, { total: number; count: number }>()

    snapshot.docs.forEach((doc) => {
      const data = doc.data()
      // Skip sessions without a valid performance score
      const score = data.performanceScore ?? data.performance_score
      if (score === undefined || score === null || score === 0) return

      const date = data.completedAt.split("T")[0]
      const existing = dailyMap.get(date) || { total: 0, count: 0 }
      existing.total += score
      existing.count++
      dailyMap.set(date, existing)
    })

    const daily = Array.from(dailyMap.entries()).map(([date, { total, count }]) => ({
      date,
      score: Math.round(total / count),
      sessions: count,
    }))

    // Calculate weekly average (last 7 days)
    const lastWeek = daily.slice(-7)
    const weeklyAverage =
      lastWeek.length > 0
        ? Math.round(lastWeek.reduce((sum, d) => sum + d.score, 0) / lastWeek.length)
        : 0

    // Calculate trend
    let trend: "improving" | "stable" | "declining" = "stable"
    if (daily.length >= 4) {
      const firstHalf = daily.slice(0, Math.floor(daily.length / 2))
      const secondHalf = daily.slice(Math.floor(daily.length / 2))

      const firstAvg = firstHalf.reduce((s, d) => s + d.score, 0) / firstHalf.length
      const secondAvg = secondHalf.reduce((s, d) => s + d.score, 0) / secondHalf.length

      if (secondAvg - firstAvg > 5) trend = "improving"
      else if (firstAvg - secondAvg > 5) trend = "declining"
    }

    return { daily, weeklyAverage, trend }
  } catch (error) {
    console.error("[Session Metrics] Failed to get trends:", error)
    return { daily: [], weeklyAverage: 0, trend: "stable" }
  }
}
