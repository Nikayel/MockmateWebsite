import { describe, it, expect } from "vitest"
import { sessionTitle, sessionType, sessionStatus } from "../session-fields"

/**
 * Regression guard: the admin AI-usage tables rendered "Unknown" for every
 * problem because the route read `scenario_title` / `scenario_type` / `status`,
 * none of which any writer produces. These tests pin the readers to the shape
 * the writers actually persist.
 */

/** Mirrors createInterviewSession in lib/firestore-helpers.ts. */
const writtenByCreateInterviewSession = {
  id: "abc123",
  user_id: "user-1",
  topic: "Two Sum",
  type: "dsa",
  pattern: "arrays-hashing",
  difficulty: "easy",
  scenario_id: "two-sum",
  started_at: "2026-08-01T00:00:00.000Z",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
}

describe("sessionTitle", () => {
  it("reads the title a real session document carries", () => {
    expect(sessionTitle(writtenByCreateInterviewSession)).toBe("Two Sum")
  })

  it("does not return Unknown for a session written by the guest path", () => {
    // app/api/guest-session/route.ts writes the same `topic` field.
    const guestSession = { topic: "Valid Anagram", type: "dsa", scenario_id: "valid-anagram" }
    expect(sessionTitle(guestSession)).toBe("Valid Anagram")
  })

  it("prefers topic over the legacy scenario_title", () => {
    expect(sessionTitle({ topic: "Two Sum", scenario_title: "stale" })).toBe("Two Sum")
  })

  it("falls back to the legacy scenario_title on older documents", () => {
    expect(sessionTitle({ scenario_title: "Merge Intervals" })).toBe("Merge Intervals")
  })

  it("falls back to the scenario id when no title was stored", () => {
    expect(sessionTitle({ scenario_id: "binary-search" })).toBe("binary-search")
  })

  it("returns Unknown only when the document truly has no identifier", () => {
    expect(sessionTitle({})).toBe("Unknown")
  })

  it("treats blank and non-string values as absent", () => {
    expect(sessionTitle({ topic: "   ", scenario_id: "two-sum" })).toBe("two-sum")
    expect(sessionTitle({ topic: 42, scenario_id: "two-sum" })).toBe("two-sum")
  })
})

describe("sessionType", () => {
  it("reads the type a real session document carries", () => {
    expect(sessionType(writtenByCreateInterviewSession)).toBe("dsa")
  })

  it("reads a non-dsa scenario kind rather than defaulting", () => {
    expect(sessionType({ type: "bugfix" })).toBe("bugfix")
    expect(sessionType({ type: "system-design" })).toBe("system-design")
  })

  it("falls back to the legacy scenario_type, then to dsa", () => {
    expect(sessionType({ scenario_type: "bugfix" })).toBe("bugfix")
    expect(sessionType({})).toBe("dsa")
  })
})

describe("sessionStatus", () => {
  it("reports in_progress while completed_at is unset", () => {
    expect(sessionStatus(writtenByCreateInterviewSession)).toBe("in_progress")
  })

  it("surfaces the feedback_status stamped at completion", () => {
    // completeInterviewSession writes completed_at + feedback_status together.
    expect(
      sessionStatus({ completed_at: "2026-08-01T01:00:00.000Z", feedback_status: "pending" })
    ).toBe("pending")
    expect(
      sessionStatus({ completed_at: "2026-08-01T01:00:00.000Z", feedback_status: "completed" })
    ).toBe("completed")
  })

  it("reports completed when completed_at exists without a feedback status", () => {
    expect(sessionStatus({ completed_at: "2026-08-01T01:00:00.000Z" })).toBe("completed")
  })
})
