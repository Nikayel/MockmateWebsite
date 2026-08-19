/**
 * The single client-side product-event funnel.
 *
 * Every named event the browser reports goes through `trackEvent` here, and
 * from there to BOTH vendors: Firebase Analytics (GA4) and PostHog. Keeping one
 * entry point is what lets 35 call sites stay ignorant of which vendors exist.
 *
 * The two vendors are gated differently on purpose, and that asymmetry is the
 * whole reason this file is worth reading before editing it. See `trackEvent`.
 */

import { setAnalyticsEnabled, startAnalytics } from "./firebase"
import { logEvent as firebaseLogEvent } from "firebase/analytics"
import posthog from "posthog-js"
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
 * Send a named product event to PostHog.
 *
 * `posthog.__loaded` is the guard that matters: instrumentation-client.ts only
 * calls `posthog.init` when NEXT_PUBLIC_POSTHOG_KEY is set, so on a build
 * without the key this module must stay silent rather than throw into every
 * caller. Capture failures are swallowed for the same reason the GA4 path
 * swallows them: analytics must never break the flow it is measuring.
 */
function capturePostHogEvent(eventName: string, properties: Record<string, unknown>) {
  if (typeof window === "undefined") return
  if (!posthog.__loaded) return

  try {
    posthog.capture(eventName, properties)
  } catch (error) {
    console.error("PostHog analytics error:", error)
  }
}

/**
 * Track a custom event.
 *
 * Fans out to both vendors, and they are gated differently ON PURPOSE:
 *
 *  - GA4 is gated on `hasAnalyticsConsent()`, because starting it means loading
 *    gtag.js and writing `_ga` cookies to the device. That needs consent.
 *  - PostHog is NOT gated here, because instrumentation-client.ts already runs
 *    it cookieless until consent: nothing is written to the device, so there is
 *    nothing to ask permission for. Its own consent switch lives there.
 *
 * Putting the PostHog call inside the GA4 gate would look tidier and would be a
 * real bug. Only 2 of the first 41 sessions on this site ever clicked "Accept
 * All", so a consent-gated PostHog would have recorded roughly 5% of product
 * events and silently reported that as the truth. The gate you inherit is not
 * automatically the gate the next vendor needs.
 */
export function trackEvent(eventName: string, params?: Record<string, any>) {
  // Attach first-touch channel attribution so every conversion event is
  // traceable back to the channel (content / community / paid) that drove it.
  const properties = { ...getAttributionParams(), ...params }

  capturePostHogEvent(eventName, properties)

  // Starts GA4 on the first consented event and returns null otherwise, so an
  // unconsented visitor never loads gtag.js at all.
  const analytics = syncAnalyticsConsent()
  if (!analytics) {
    // GA4 not available (SSR, not configured, or consent not given). PostHog
    // above has already recorded the event.
    return
  }

  try {
    firebaseLogEvent(analytics, eventName, properties)
  } catch (error) {
    console.error("Analytics error:", error)
  }
}

/**
 * `trackPageView` used to live here with no call sites. GA4 fires its own
 * page_view when analytics starts (see components/ConsentAnalytics), so the
 * helper was not a gap waiting to be filled, it was a second way to send an
 * event the platform already sends.
 */

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
 * Deleted from here: `trackCodeExecution`, `trackHintUsage` and
 * `trackAIInteraction`.
 *
 * All three had zero call sites, and the first was actively misleading: the
 * route that looks like its caller (app/api/session/metrics) imports a
 * different `trackCodeExecution` from lib/session-metrics. Code execution, hint
 * reveals and AI turns are all already recorded, server-side and per session, by
 * lib/session-metrics and lib/analytics-server. A client-side duplicate that
 * nobody called was not instrumentation, it was the appearance of it.
 */

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
 * Deleted from here: `trackCancellation` and `trackError`, both uncalled.
 *
 * Cancellation is a webhook event, not a browser event: Stripe tells us, and
 * app/api/webhook/stripe is where that is recorded. Errors reach Sentry through
 * lib/logger and app/api/client-error. `trackError` in particular was worse than
 * absent, because the admin System Health page counted analytics_events rows
 * with event_name "error" and this was the only thing that would ever have
 * written one, so the error count was structurally always zero.
 */

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
