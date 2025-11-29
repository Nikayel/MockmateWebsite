/**
 * Firebase Analytics helper functions
 *
 * Tracks key user events for product analytics and insights
 * Respects user cookie consent preferences (GDPR/CCPA compliant)
 */

import { analytics } from "./firebase"
import { logEvent as firebaseLogEvent } from "firebase/analytics"
import { hasAnalyticsConsent } from "@/components/CookieConsent"

/**
 * Check if analytics tracking is allowed based on user consent
 */
function isAnalyticsAllowed(): boolean {
  // Always check consent before tracking
  return hasAnalyticsConsent()
}

/**
 * Track a custom event (only if user has consented)
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  if (!analytics) {
    // Analytics not available (SSR or disabled)
    return
  }

  // Check user consent before tracking
  if (!isAnalyticsAllowed()) {
    return
  }

  try {
    firebaseLogEvent(analytics, eventName, params)
  } catch (error) {
    console.error("Analytics error:", error)
  }
}

/**
 * Track page view
 */
export function trackPageView(pageName: string, params?: Record<string, any>) {
  trackEvent("page_view", {
    page_name: pageName,
    ...params,
  })
}

/**
 * Track user signup
 */
export function trackSignup(method: string, userId: string) {
  trackEvent("sign_up", {
    method,
    user_id: userId,
  })
}

/**
 * Track user login
 */
export function trackLogin(method: string, userId: string) {
  trackEvent("login", {
    method,
    user_id: userId,
  })
}

/**
 * Track session start
 */
export function trackSessionStart(params: {
  sessionId: string
  scenarioId: string
  scenarioType: string
  difficulty: string
  language: string
}) {
  trackEvent("session_start", params)
}

/**
 * Track session completion
 */
export function trackSessionComplete(params: {
  sessionId: string
  scenarioId: string
  scenarioType: string
  difficulty: string
  language: string
  performanceScore?: number
  durationMinutes: number
}) {
  trackEvent("session_complete", params)
}

/**
 * Track code execution
 */
export function trackCodeExecution(params: {
  sessionId: string
  language: string
  passed: boolean
  executionTimeMs: number
}) {
  trackEvent("code_execution", params)
}

/**
 * Track hint usage
 */
export function trackHintUsage(params: {
  sessionId: string
  hintIndex: number
  timeToFirstHintSeconds?: number
}) {
  trackEvent("hint_used", params)
}

/**
 * Track AI interaction
 */
export function trackAIInteraction(params: {
  sessionId: string
  interactionType: "partner" | "interviewer"
  messageCount: number
}) {
  trackEvent("ai_interaction", params)
}

/**
 * Track subscription purchase
 */
export function trackPurchase(params: {
  userId: string
  tier: string
  value: number
  currency: string
  platform: string
}) {
  trackEvent("purchase", params)
}

/**
 * Track subscription cancellation
 */
export function trackCancellation(params: {
  userId: string
  tier: string
  reason?: string
}) {
  trackEvent("subscription_cancel", params)
}

/**
 * Track error
 */
export function trackError(params: {
  errorType: string
  errorMessage: string
  page?: string
  userId?: string
}) {
  trackEvent("error", params)
}

/**
 * Track feedback generation
 */
export function trackFeedbackGeneration(params: {
  sessionId: string
  scenarioType: string
  performanceScore: number
  durationMinutes: number
}) {
  trackEvent("feedback_generated", params)
}

/**
 * Track user upgrade flow
 */
export function trackUpgradeFlow(params: {
  userId: string
  step: "view_pricing" | "click_upgrade" | "start_checkout" | "complete_checkout"
  tier?: string
}) {
  trackEvent("upgrade_flow", params)
}
