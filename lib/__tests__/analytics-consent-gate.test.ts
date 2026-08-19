/**
 * @vitest-environment jsdom
 *
 * Regression tests for the Firebase Analytics (GA4) consent gate.
 *
 * The bug these lock down: `lib/firebase.ts` used to run `getAnalytics(app)` as
 * a module-level side effect. That call is what injects gtag.js, writes the
 * `_ga` cookies, and fires an automatic `page_view`, so GA4 was live on every
 * page before the consent banner had even rendered, and declining did nothing.
 * Meanwhile /legal stated Firebase Analytics is "only active with your consent".
 *
 * The contract now: nothing may call `startAnalytics()` unless
 * `hasAnalyticsConsent()` is true, and withdrawing consent must push the
 * collection switch off (gtag.js cannot be unloaded once it is in the page).
 *
 * The second contract, added when PostHog joined the fan-out, is the INVERSE
 * and is easy to break by tidying: PostHog must keep capturing when the visitor
 * has NOT consented. It runs cookieless until consent (see
 * instrumentation-client.ts), writing nothing to the device, so the GA4 gate
 * does not apply to it. Only 2 of the first 41 sessions on this site ever
 * accepted cookies, so a PostHog call moved inside the GA4 gate would quietly
 * drop ~95% of product events while still looking like working instrumentation.
 * That is the failure this file exists to make loud.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const hasAnalyticsConsent = vi.fn<() => boolean>()
const startAnalytics = vi.fn()
const setAnalyticsEnabled = vi.fn()
const logEvent = vi.fn()
const posthogCapture = vi.fn()
let posthogLoaded = true

vi.mock("@/components/CookieConsent", () => ({
  hasAnalyticsConsent: () => hasAnalyticsConsent(),
}))

vi.mock("posthog-js", () => ({
  default: {
    get __loaded() {
      return posthogLoaded
    },
    capture: (...args: unknown[]) => posthogCapture(...args),
  },
}))

vi.mock("@/lib/firebase", () => ({
  startAnalytics: () => startAnalytics(),
  setAnalyticsEnabled: (enabled: boolean) => setAnalyticsEnabled(enabled),
}))

vi.mock("firebase/analytics", () => ({
  logEvent: (...args: unknown[]) => logEvent(...args),
}))

vi.mock("@/lib/attribution", () => ({
  getAttributionParams: () => ({ channel: "direct" }),
}))

const FAKE_GA4 = { app: "fake" }

describe("Firebase Analytics consent gate", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    posthogLoaded = true
    startAnalytics.mockReturnValue(FAKE_GA4)
  })

  describe("when the visitor has NOT consented", () => {
    beforeEach(() => {
      hasAnalyticsConsent.mockReturnValue(false)
    })

    it("never starts GA4, so gtag.js and the _ga cookies never load", async () => {
      const { syncAnalyticsConsent } = await import("@/lib/analytics")

      syncAnalyticsConsent()

      expect(startAnalytics).not.toHaveBeenCalled()
    })

    it("pushes the collection switch off in case GA4 was already started", async () => {
      const { syncAnalyticsConsent } = await import("@/lib/analytics")

      syncAnalyticsConsent()

      expect(setAnalyticsEnabled).toHaveBeenCalledWith(false)
    })

    it("drops tracked events instead of starting GA4 to deliver them", async () => {
      const { trackEvent } = await import("@/lib/analytics")

      trackEvent("sign_up", { method: "github" })

      expect(startAnalytics).not.toHaveBeenCalled()
      expect(logEvent).not.toHaveBeenCalled()
    })

    it("STILL sends the event to PostHog, which is cookieless until consent", async () => {
      const { trackEvent } = await import("@/lib/analytics")

      trackEvent("guest_trial_started", { scenario_id: "dsa-3sum" })

      expect(posthogCapture).toHaveBeenCalledWith("guest_trial_started", {
        channel: "direct",
        scenario_id: "dsa-3sum",
      })
    })

    it("sends to PostHog even when GA4 is not configured at all", async () => {
      startAnalytics.mockReturnValue(null)
      const { trackEvent } = await import("@/lib/analytics")

      trackEvent("signup_prompt_shown", { score: 72 })

      expect(logEvent).not.toHaveBeenCalled()
      expect(posthogCapture).toHaveBeenCalledTimes(1)
    })
  })

  describe("when the visitor HAS consented", () => {
    beforeEach(() => {
      hasAnalyticsConsent.mockReturnValue(true)
    })

    it("starts GA4 and enables collection", async () => {
      const { syncAnalyticsConsent } = await import("@/lib/analytics")

      const instance = syncAnalyticsConsent()

      expect(startAnalytics).toHaveBeenCalledTimes(1)
      expect(setAnalyticsEnabled).toHaveBeenCalledWith(true)
      expect(instance).toBe(FAKE_GA4)
    })

    it("logs the event against the started instance, with attribution attached", async () => {
      const { trackEvent } = await import("@/lib/analytics")

      trackEvent("session_start", { difficulty: "medium" })

      expect(logEvent).toHaveBeenCalledWith(FAKE_GA4, "session_start", {
        channel: "direct",
        difficulty: "medium",
      })
    })

    it("does not log when GA4 could not start (no measurement id configured)", async () => {
      startAnalytics.mockReturnValue(null)
      const { trackEvent } = await import("@/lib/analytics")

      trackEvent("login", { method: "google" })

      expect(logEvent).not.toHaveBeenCalled()
    })
  })

  describe("PostHog fan-out", () => {
    it("captures on BOTH sides of the consent switch, unlike GA4", async () => {
      const { trackEvent } = await import("@/lib/analytics")

      hasAnalyticsConsent.mockReturnValue(false)
      trackEvent("cta_click", { location: "hero_primary" })

      hasAnalyticsConsent.mockReturnValue(true)
      trackEvent("cta_click", { location: "hero_primary" })

      // GA4 saw one of the two. PostHog must see both, or the funnel is built
      // on the ~5% of visitors who accept cookies.
      expect(logEvent).toHaveBeenCalledTimes(1)
      expect(posthogCapture).toHaveBeenCalledTimes(2)
    })

    it("stays silent when posthog.init never ran (no NEXT_PUBLIC_POSTHOG_KEY)", async () => {
      posthogLoaded = false
      hasAnalyticsConsent.mockReturnValue(true)
      const { trackEvent } = await import("@/lib/analytics")

      expect(() => trackEvent("purchase", { tier: "pro" })).not.toThrow()
      expect(posthogCapture).not.toHaveBeenCalled()
      // The GA4 leg is unaffected by PostHog being absent.
      expect(logEvent).toHaveBeenCalledTimes(1)
    })
  })

  it("follows consent WITHDRAWAL within a single session", async () => {
    const { syncAnalyticsConsent } = await import("@/lib/analytics")

    hasAnalyticsConsent.mockReturnValue(true)
    syncAnalyticsConsent()
    expect(setAnalyticsEnabled).toHaveBeenLastCalledWith(true)

    hasAnalyticsConsent.mockReturnValue(false)
    syncAnalyticsConsent()
    expect(setAnalyticsEnabled).toHaveBeenLastCalledWith(false)
  })
})
