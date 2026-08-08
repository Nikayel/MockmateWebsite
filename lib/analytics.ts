/**
 * Firebase Analytics helper functions
 *
 * Tracks key user events for product analytics and insights
 * Respects user cookie consent preferences (GDPR/CCPA compliant)
 */

import { setAnalyticsEnabled, startAnalytics } from "./firebase"
import { logEvent as firebaseLogEvent } from "firebase/analytics"
import { hasAnalyticsConsent } from "@/components/CookieConsent"
import { getAttributionParams } from "./attribution"

/**
 * Check if analytics tracking is allowed based on user consent
 */
function isAnalyticsAllowed(): boolean {
  // Always check consent before tracking
  return hasAnalyticsConsent()
}

/**
 * Brings GA4 into line with the visitor's current cookie choice and returns the
 * live instance, or null when analytics must not run.
 *
 * This is the single consent gate for Firebase Analytics. `startAnalytics()` is
 * what loads gtag.js and sets the `_ga` cookies, so it is reached only on the
 * consented branch. On the declining branch we also push the "off" switch, which
 * matters when consent is withdrawn part-way through a session: gtag.js is
 * already in the page by then and cannot be taken back out, so disabling
 * collection is the only way to actually stop.
 */
export function syncAnalyticsConsent(): ReturnType<typeof startAnalytics> {
  if (typeof window === "undefined") return null

  if (!isAnalyticsAllowed()) {
    setAnalyticsEnabled(false)
    return null
  }

  const instance = startAnalytics()
  if (instance) setAnalyticsEnabled(true)
  return instance
}

/**
 * Track a custom event (only if user has consented)
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  // Starts GA4 on the first consented event and returns null otherwise, so an
  // unconsented visitor never loads gtag.js at all.
  const analytics = syncAnalyticsConsent()
  if (!analytics) {
    // Analytics not available (SSR, not configured, or consent not given)
    return
  }

  try {
    // Attach first-touch channel attribution so every conversion event is
    // traceable back to the channel (content / community / paid) that drove it.
    firebaseLogEvent(analytics, eventName, { ...getAttributionParams(), ...params })
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
export function trackCancellation(params: { userId: string; tier: string; reason?: string }) {
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
 * Track user upgrade flow
 */
export function trackUpgradeFlow(params: {
  userId: string
  step: "view_pricing" | "click_upgrade" | "start_checkout" | "complete_checkout"
  tier?: string
}) {
  trackEvent("upgrade_flow", params)
}
