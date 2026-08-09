/**
 * Server-side analytics helper for API routes
 * Writes events directly to Firestore via the Admin SDK.
 *
 * NOTE: this runs in API routes where there is no client auth context, so it
 * must use the Admin SDK. The previous client-SDK path (`db` from ./firebase)
 * was denied by Firestore rules on every call and silently dropped all events.
 */

import { adminDb } from "./firebase-admin"

/**
 * Track event server-side (for API routes)
 */
export async function trackEventServer(eventName: string, params: Record<string, any>) {
  try {
    await adminDb.collection("analytics_events").add({
      event_name: eventName,
      properties: params,
      timestamp: new Date().toISOString(),
      source: "server",
    })
  } catch (error) {
    console.error("Server analytics error:", error)
    // Don't throw - analytics should never break the main flow
  }
}

/**
 * Track code execution
 */
export async function trackCodeExecutionServer(params: {
  sessionId?: string
  userId?: string
  language: string
  scenarioId: string
  scenarioType: string
  passed: boolean
  totalTests: number
  passedTests: number
  executionTimeMs: number
}) {
  await trackEventServer("code_execution", params)
}

/**
 * Track AI chat interaction
 */
export async function trackAIChatServer(params: {
  sessionId?: string
  userId?: string
  interactionType: "partner" | "interviewer"
  messageLength: number
  responseTimeMs?: number
  provider?: string // Track which AI provider was used
  /** Provider-REPORTED token usage. Omitted from the event when unavailable — never estimated. */
  tokensIn?: number
  tokensOut?: number
}) {
  const { tokensIn, tokensOut, ...rest } = params
  await trackEventServer("ai_chat", {
    ...rest,
    // Firestore rejects undefined values, and absent usage must stay absent
    // (measured-margin reporting must not see guessed zeros) — attach the
    // token fields only when the provider actually reported them.
    ...(tokensIn !== undefined ? { tokensIn } : {}),
    ...(tokensOut !== undefined ? { tokensOut } : {}),
  })
}
/**
 * Track feedback generation
 */
export async function trackFeedbackGenerationServer(params: {
  sessionId: string
  userId?: string
  scenarioType: string
  performanceScore: number
  /**
   * Wall-clock time the feedback request itself took, in MILLISECONDS.
   *
   * Previously `durationMinutes`, which read as the length of the interview
   * session but was measured from route-handler entry. Feedback generation
   * finishes well inside a minute, so rounding it to minutes reported 0 on
   * essentially every event.
   */
  generationDurationMs: number
  /** Provider-REPORTED token usage of the narrative feedback call. Omitted when unavailable — never estimated. */
  tokensIn?: number
  tokensOut?: number
}) {
  const { tokensIn, tokensOut, ...rest } = params
  await trackEventServer("feedback_generated", {
    ...rest,
    // Same contract as ai_chat: only measured counts, never guessed values.
    ...(tokensIn !== undefined ? { tokensIn } : {}),
    ...(tokensOut !== undefined ? { tokensOut } : {}),
  })
}
