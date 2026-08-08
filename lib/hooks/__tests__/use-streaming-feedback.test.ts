/**
 * Tests for the post-interview feedback refusal mapping.
 *
 * The bug: /api/feedback/stream returns meaningful 401, 429, and 503 bodies, and
 * the entitlement layer behind it adds quota and budget blocks on top. The hook
 * threw the response away (`throw new Error("Stream failed: " + status)`) and
 * rendered every one of them as "Something went wrong generating feedback.
 * Please try again."
 *
 * That fires at the single most expensive moment in the product: the user has
 * just finished a 20 to 45 minute interview. A designed, temporary refusal read
 * as a broken product, and the copy invited the immediate retry that makes a
 * rate limit or a spend ceiling worse.
 */

import { describe, expect, it } from "vitest"

import { buildFeedbackRefusal } from "../use-streaming-feedback"

describe("buildFeedbackRefusal", () => {
  it("surfaces the platform capacity pause instead of a generic failure", () => {
    const refusal = buildFeedbackRefusal(503, {
      error: "AI feedback is paused for everyone right now",
      message:
        "AI feedback is paused for everyone right now because the platform hit its daily usage limit. Nothing is wrong with your session and it is saved. Please try again in an hour.",
      code: "GLOBAL_CAPACITY_LIMIT",
    })

    expect(refusal?.code).toBe("GLOBAL_CAPACITY_LIMIT")
    expect(refusal?.title).toBe("We're at capacity right now")
    expect(refusal?.message).toContain("saved")
    expect(refusal?.message).not.toContain("Something went wrong")
  })

  it("surfaces a rate limit as a rate limit", () => {
    const refusal = buildFeedbackRefusal(429, {
      message: "You have asked for feedback several times in a row. Your session is saved.",
      code: "RATE_LIMITED",
    })

    expect(refusal?.title).toBe("Too many requests")
    expect(refusal?.message).toContain("saved")
  })

  it("surfaces a daily budget block with its reset time", () => {
    const refusal = buildFeedbackRefusal(429, {
      message:
        "You've used today's AI allowance ($0.25). It resets at midnight UTC, and your monthly allowance is unaffected.",
      code: "DAILY_BUDGET_EXCEEDED",
    })

    expect(refusal?.title).toBe("You've used today's AI allowance")
    expect(refusal?.message).toContain("midnight UTC")
  })

  it("keeps the four refusals distinguishable, which is the whole point", () => {
    const codes = [
      "RATE_LIMITED",
      "QUOTA_EXCEEDED",
      "DAILY_BUDGET_EXCEEDED",
      "GLOBAL_CAPACITY_LIMIT",
    ]
    const titles = codes.map(
      (code) => buildFeedbackRefusal(429, { code, message: "Blocked." })?.title
    )

    expect(new Set(titles).size).toBe(codes.length)
    expect(titles).not.toContain(undefined)
  })

  it("still says something specific when the body carries no code", () => {
    // Older deployments, and any proxy that rewrites the body, leave only the
    // status. Three statuses, three different remedies: none of them is "retry".
    expect(buildFeedbackRefusal(401, null)?.code).toBe("AUTH_REQUIRED")
    expect(buildFeedbackRefusal(429, null)?.code).toBe("RATE_LIMITED")
    expect(buildFeedbackRefusal(503, null)?.code).toBe("SERVICE_UNAVAILABLE")
  })

  it("never leaves a labelled refusal without something to do next", () => {
    for (const code of ["AUTH_REQUIRED", "RATE_LIMITED", "SERVICE_UNAVAILABLE"]) {
      const refusal = buildFeedbackRefusal(500, { code })

      expect(refusal?.message.length).toBeGreaterThan(0)
      // Never blame the user, and never imply the interview was lost.
      expect(refusal?.message).toContain("saved")
    }
  })

  it("leaves a genuine crash to the existing generic handling", () => {
    // A 500 is not a refusal. Dressing it up as one would be a different lie,
    // and the caller's fallback scoring path still needs to run.
    expect(buildFeedbackRefusal(500, { error: "Internal error" })).toBeNull()
    expect(buildFeedbackRefusal(502, null)).toBeNull()
    expect(buildFeedbackRefusal(400, undefined)).toBeNull()
  })

  it("ignores non-string code and message values rather than rendering [object Object]", () => {
    const refusal = buildFeedbackRefusal(429, {
      code: { nested: true },
      message: ["array"],
      error: "Too many feedback requests.",
    })

    expect(refusal?.code).toBe("RATE_LIMITED")
    expect(refusal?.message).toBe("Too many feedback requests.")
  })
})
