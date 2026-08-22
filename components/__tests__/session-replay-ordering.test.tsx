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
 * An earlier version of this file asserted six-entry sequences beginning with a
 * "pre-consent pass" of `config:disable_recording=true, optOut, stop`, on the
 * reasoning that the effect legitimately runs twice on mount because
 * `hasConsent` is seeded `false` and only becomes true once an effect has read
 * localStorage. That pass was not legitimate, and pinning it here kept a real
 * bug alive: `opt_out_capturing()` clears persistence, so every page load wiped
 * the device and minted a new distinct_id, which fragmented identity and left
 * session replay with a new session id and orphan fragments on every load.
 * Consent is now tri-state and nothing is pushed to PostHog until it is known,
 * so a mount produces ONE pass, not two.
 *
 * An even earlier version compared `invocationCallOrder[0]` of two different
 * spies, which silently compared the first run against the second and passed
 * against a deliberately broken build. Assert whole sequences here, not
 * first-call indices.
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
  return render(<ConsentAnalytics />)
}

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

    expect(calls).toEqual(["config:disable_recording=true", "optIn:captureEventName=false", "stop"])
    expect(calls).not.toContain("start")
  })

  it("clears the flag first, then records, on an allowed route", async () => {
    pathname = "/why-codesparring"

    await mount()

    expect(calls).toEqual([
      "config:disable_recording=false",
      "optIn:captureEventName=false",
      "start",
    ])
  })

  it("stays off entirely without consent, on an otherwise allowed route", async () => {
    consented = false
    pathname = "/"

    await mount()

    expect(calls).toEqual(["config:disable_recording=true", "optOut", "stop"])
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

  /**
   * The bug this file previously pinned as correct. `opt_out_capturing()` does
   * not merely stop capture, it clears persistence, so issuing it against a
   * consented visitor discards their distinct_id and the session id replay is
   * stitching onto. Doing that on every page load is what produced 17 sessions
   * across 12 device ids in a single day and left replay with zero recordings.
   */
  it("NEVER opts out a visitor who has already consented", async () => {
    consented = true
    pathname = "/pricing"

    await mount()

    expect(calls).not.toContain("optOut")
    expect(calls).toContain("start")
  })

  it("does not re-apply an unchanged consent decision on navigation", async () => {
    consented = true
    pathname = "/pricing"

    const { rerender } = await mount()
    const { ConsentAnalytics } = await import("@/components/ConsentAnalytics")

    pathname = "/careers"
    rerender(<ConsentAnalytics />)

    // One opt-in for the mount, and none for the navigation: re-applying it
    // would clear persistence again and mint a new distinct_id per route.
    expect(calls.filter((c) => c.startsWith("optIn"))).toHaveLength(1)
    expect(calls).not.toContain("optOut")
  })
})
