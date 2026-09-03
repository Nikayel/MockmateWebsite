/**
 * @vitest-environment jsdom
 *
 * Regression test for the Firebase Analytics (GA4) offline guard.
 *
 * The bug this locks down: `getAnalytics(app)` looks synchronous, but it starts
 * a Firebase Installations registration in the background. While the browser is
 * offline that request rejects a promise the `startAnalytics()` try/catch can
 * never see — the SDK settles it one IndexedDB turn later — so it escapes as an
 * unhandled "installations/app-offline" error and posthog-js autocapture files
 * it as a site defect.
 *
 * The contract now: `startAnalytics()` must not start GA4 while the browser is
 * offline. GA4 stays inert and the next tracked event after the connection
 * returns starts it cleanly.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// vitest.setup.ts replaces ./lib/firebase with a stub for every test file. This
// suite exercises the real module, so opt out of that global mock here.
vi.unmock("@/lib/firebase")

const getAnalytics = vi.fn(() => ({ app: "fake-ga4" }))

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ options: {} })),
  getApps: vi.fn(() => []),
}))

vi.mock("firebase/auth", () => ({ getAuth: vi.fn(() => ({})) }))

vi.mock("firebase/firestore", () => ({ getFirestore: vi.fn(() => ({})) }))

vi.mock("firebase/analytics", () => ({
  getAnalytics: (...args: unknown[]) => getAnalytics(...args),
  setAnalyticsCollectionEnabled: vi.fn(),
}))

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => value,
  })
}

describe("startAnalytics offline guard", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID", "G-TEST123")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("does not start GA4 while the browser is offline", async () => {
    setOnline(false)
    const { startAnalytics } = await import("@/lib/firebase")

    expect(startAnalytics()).toBeNull()
    expect(getAnalytics).not.toHaveBeenCalled()
  })

  it("starts GA4 once the browser is online", async () => {
    setOnline(true)
    const { startAnalytics } = await import("@/lib/firebase")

    const instance = startAnalytics()

    expect(getAnalytics).toHaveBeenCalledTimes(1)
    expect(instance).not.toBeNull()
  })
})
