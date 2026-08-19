/**
 * @vitest-environment jsdom
 *
 * Regression tests for WHEN the replay exclusion is applied, as opposed to what
 * it decides. `session-replay-exclusions.test.tsx` already pins the predicate,
 * and the predicate was never wrong. Production still recorded excluded routes:
 * of the first 18 recordings this project captured, 15 began on /admin, /labs or
 * /learn, which is the opposite of what /legal tells users.
 *
 * The mechanism was ordering. `posthog.set_config()` and the consent calls both
 * make posthog-js re-evaluate recorder state internally, so a
 * `stopSessionRecording()` issued afterwards is a race rather than a guarantee.
 * The fix is to set the hard `disable_session_recording` flag FIRST, because
 * that is a flag the library checks before it can start anything.
 *
 * These tests assert on the exact ORDERED SEQUENCE of calls, not on which calls
 * happened, because "we called stop at some point" is a property the broken
 * version also satisfied.
 *
 * The sequences below have six entries because the effect legitimately runs
 * twice on mount: `hasConsent` is seeded `false` by useState and only becomes
 * true after the first effect reads localStorage. An earlier version of this
 * file compared `invocationCallOrder[0]` of two different spies, which silently
 * compared the first run against the second and passed against a deliberately
 * broken build. Assert whole sequences here, not first-call indices.
 */

import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

/** Every posthog call this component makes, in the order it made them. */
let calls: string[] = []

let pathname = "/"
let consented = true

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
}))

vi.mock("posthog-js", () => ({
  default: {
    __loaded: true,
    set_config: (c: { disable_session_recording?: boolean }) =>
      calls.push(`config:disable_recording=${c.disable_session_recording}`),
    startSessionRecording: () => calls.push("start"),
    stopSessionRecording: () => calls.push("stop"),
    opt_in_capturing: (o: { captureEventName?: unknown }) =>
      calls.push(`optIn:captureEventName=${String(o?.captureEventName)}`),
    opt_out_capturing: () => calls.push("optOut"),
  },
}))

vi.mock("@/components/CookieConsent", () => ({
  hasAnalyticsConsent: () => consented,
}))

vi.mock("@/lib/analytics", () => ({
  syncAnalyticsConsent: () => null,
}))

vi.mock("@vercel/analytics/next", () => ({ Analytics: () => null }))
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => null }))

async function mount() {
  const { ConsentAnalytics } = await import("@/components/ConsentAnalytics")
  render(<ConsentAnalytics />)
}

/** The pre-consent pass every mount performs before localStorage is read. */
const PRE_CONSENT_PASS = ["config:disable_recording=true", "optOut", "stop"]

describe("session replay start/stop ordering", () => {
  beforeEach(() => {
    calls = []
    pathname = "/"
    consented = true
  })

  it("locks the route down BEFORE touching consent, on an excluded route", async () => {
    pathname = "/admin"

    await mount()

    expect(calls).toEqual([
      ...PRE_CONSENT_PASS,
      // The hard flag lands first, so nothing posthog-js re-evaluates during
      // the consent call can start the recorder on /admin.
      "config:disable_recording=true",
      "optIn:captureEventName=false",
      "stop",
    ])
  })

  it("locks the route down BEFORE touching consent, inside the labs subtree", async () => {
    pathname = "/labs/palantir-ontology-learning"

    await mount()

    expect(calls).toEqual([
      ...PRE_CONSENT_PASS,
      "config:disable_recording=true",
      "optIn:captureEventName=false",
      "stop",
    ])
    expect(calls).not.toContain("start")
  })

  it("clears the flag first, then records, on an allowed route", async () => {
    pathname = "/why-codesparring"

    await mount()

    expect(calls).toEqual([
      ...PRE_CONSENT_PASS,
      "config:disable_recording=false",
      "optIn:captureEventName=false",
      "start",
    ])
  })

  it("stays off entirely without consent, on an otherwise allowed route", async () => {
    consented = false
    pathname = "/"

    await mount()

    expect(calls).toEqual(PRE_CONSENT_PASS)
    expect(calls).not.toContain("start")
  })

  it("puts a visitor who has not answered the banner into cookieless mode", async () => {
    consented = false

    await mount()

    expect(calls).toContain("optOut")
    expect(calls.some((c) => c.startsWith("optIn"))).toBe(false)
  })

  it("opts in WITHOUT manufacturing an $opt_in event on every page load", async () => {
    consented = true

    await mount()

    expect(calls).toContain("optIn:captureEventName=false")
  })
})
