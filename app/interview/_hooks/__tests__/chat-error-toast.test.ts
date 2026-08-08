/**
 * Tests for the chat error toast mapping.
 *
 * The bug: lib/quota-enforcement.ts returns a 429 carrying
 * `code: "QUOTA_EXCEEDED"` and a message written for a human, and the chat hook
 * discarded `data.code` and rendered every failure as a red toast titled
 * "Rate limit reached" with no link. A user who had just run out of sessions was
 * told they were being throttled, at the exact moment they were most willing to
 * pay. The 403 entitlement codes produced no toast at all, because the toast was
 * gated on status === 429.
 */

import { describe, expect, it } from "vitest"

import { buildChatErrorToast } from "../useInterviewChat"

describe("buildChatErrorToast", () => {
  it("surfaces the quota message and offers the upgrade path", () => {
    const result = buildChatErrorToast(429, {
      error: "Session limit exceeded",
      message:
        "You've used all 8 free sessions for this month. Upgrade to Pro for 35 sessions per month, a personalized roadmap, and spaced repetition.",
      code: "QUOTA_EXCEEDED",
    })

    expect(result).not.toBeNull()
    expect(result?.title).toBe("You've used this month's sessions")
    expect(result?.description).toContain("Upgrade to Pro")
    expect(result?.showUpgradeAction).toBe(true)
    // The old copy is what made this a dead end.
    expect(result?.title).not.toBe("Rate limit reached")
  })

  it("offers the upgrade path for a budget block too", () => {
    const result = buildChatErrorToast(429, {
      message: "You've hit this month's free AI usage limit.",
      code: "BUDGET_EXCEEDED",
    })

    expect(result?.showUpgradeAction).toBe(true)
  })

  it.each(["FREE_TRIAL_EXHAUSTED", "SUBSCRIPTION_INACTIVE", "PRO_REQUIRED"])(
    "still toasts %s, which arrives as a 403 and previously showed nothing",
    (code) => {
      const result = buildChatErrorToast(403, { code, message: "Upgrade to keep going." })

      expect(result).not.toBeNull()
      expect(result?.showUpgradeAction).toBe(true)
    }
  )

  it.each(["GLOBAL_CAPACITY_LIMIT", "SERVICE_UNAVAILABLE"])(
    "does not try to sell a plan for %s, which upgrading cannot fix",
    (code) => {
      const result = buildChatErrorToast(503, { code, message: "Please try again shortly." })

      expect(result).not.toBeNull()
      expect(result?.showUpgradeAction).toBe(false)
    }
  )

  it("does not offer an upgrade for an auth problem", () => {
    const result = buildChatErrorToast(401, {
      code: "AUTH_REQUIRED",
      message: "Please sign in to continue.",
    })

    expect(result?.showUpgradeAction).toBe(false)
  })

  it("treats an unlabelled 429 as ordinary throttling", () => {
    const result = buildChatErrorToast(429, { error: "Too many requests" })

    expect(result?.title).toBe("Too many requests")
    expect(result?.showUpgradeAction).toBe(false)
  })

  it("stays silent for ordinary server errors, which land in the transcript", () => {
    expect(buildChatErrorToast(500, { error: "Internal error" })).toBeNull()
    expect(buildChatErrorToast(400, null)).toBeNull()
    expect(buildChatErrorToast(502, undefined)).toBeNull()
  })

  it("falls back to a neutral title for a code it has never seen", () => {
    const result = buildChatErrorToast(429, { code: "SOMETHING_NEW", message: "Nope." })

    // Unlabelled code, non-upgrade: handled by the plain 429 branch.
    expect(result?.title).toBe("Too many requests")
    expect(result?.showUpgradeAction).toBe(false)
  })

  it("ignores non-string code and message values rather than rendering [object Object]", () => {
    const result = buildChatErrorToast(429, {
      code: { nested: true },
      message: ["array"],
      error: "Too many requests",
    })

    expect(result?.title).toBe("Too many requests")
    expect(result?.description).toBe("Too many requests")
  })
})
