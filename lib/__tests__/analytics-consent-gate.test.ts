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
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

const hasAnalyticsConsent = vi.fn<() => boolean>()
const startAnalytics = vi.fn()
const setAnalyticsEnabled = vi.fn()
const logEvent = vi.fn()

vi.mock("@/components/CookieConsent", () => ({
  hasAnalyticsConsent: () => hasAnalyticsConsent(),
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
