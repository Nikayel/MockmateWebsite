/**
 * Server-side analytics helper for API routes
 * Writes events directly to Firestore
 */

import { db } from "./firebase"
import { collection, addDoc } from "firebase/firestore"

/**
 * Track event server-side (for API routes)
 */
export async function trackEventServer(
  eventName: string,
  params: Record<string, any>
) {
  try {
    await addDoc(collection(db, "analytics_events"), {
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
}) {
  await trackEventServer("ai_chat", params)
}

/**
 * Track API error
 */
export async function trackAPIErrorServer(params: {
  endpoint: string
  errorType: string
  errorMessage: string
  userId?: string
  statusCode?: number
}) {
  await trackEventServer("api_error", params)
}

/**
 * Track feedback generation
 */
export async function trackFeedbackGenerationServer(params: {
  sessionId: string
  userId?: string
  scenarioType: string
  performanceScore: number
  durationMinutes: number
}) {
  await trackEventServer("feedback_generated", params)
}
