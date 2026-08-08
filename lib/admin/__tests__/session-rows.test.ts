import { describe, it, expect } from "vitest"
import {
  toSessionListRow,
  toSessionDetail,
  deriveSessionStatus,
  sessionDurationMinutes,
  sessionUserLabel,
  sessionStartedAt,
} from "../session-rows"

const NOW = new Date("2026-08-08T12:00:00.000Z")

/**
 * A document carrying every field a real session accumulates, plus fields that
 * must never reach the browser. Anything the projection does not name should be
 * absent from its output.
 */
const FULL_SESSION = {
  id: "sess_1",
  user_id: "user_abc",
  topic: "Merge Intervals",
  type: "dsa",
  pattern: "intervals",
  scenario_id: "merge-intervals",
  difficulty: "medium",
  target_company: "stripe",
  created_at: "2026-08-08T10:00:00.000Z",
  started_at: "2026-08-08T10:00:00.000Z",
  updated_at: "2026-08-08T10:45:00.000Z",
  completed_at: "2026-08-08T10:42:00.000Z",
  feedback_status: "complete",
  feedback_persisted_at: "2026-08-08T10:45:00.000Z",
  performance_score: 78,
  technical_score: 81,
  efficiency_score: 66,
  mastery_score: 72,
  score_breakdown: {
    understandingScore: 80,
    problemSolvingScore: 75,
    codeQualityScore: 70,
    communicationScore: 85,
    overallScore: 78,
  },
  structured_feedback: {
    tldr: "Solid sweep-line solution, thin on edge cases.",
    rawFeedback: "...the entire model output, thousands of tokens...",
    actionPlan: ["practise interval merging"],
  },
  silent_notes: ["hesitated on the sort key", "never mentioned complexity"],
  mastery_breakdown: { masteryScore: 72, components: {} },
  is_guided_lab: false,
  // Fields that exist on neighbouring documents and must never be echoed back.
  stripe_customer_id: "cus_leaky",
  expires_at: "2026-09-01T00:00:00.000Z",
}

describe("toSessionListRow: projection", () => {
  const row = toSessionListRow("sess_1", FULL_SESSION, "dev@example.com", NOW)

  it("renders exactly the columns the table has, and nothing else", () => {
    expect(Object.keys(row).sort()).toEqual(
      [
        "completedAt",
        "difficulty",
        "durationMinutes",
        "isGuest",
        "performanceScore",
        "scenarioTitle",
        "sessionId",
        "sessionType",
        "startedAt",
        "status",
        "userId",
        "userLabel",
      ].sort()
    )
  })

  it("never ships the model output, the private notes, or a neighbouring PII field", () => {
    const serialised = JSON.stringify(row)
    expect(serialised).not.toContain("cus_leaky")
    expect(serialised).not.toContain("rawFeedback")
    expect(serialised).not.toContain("the entire model output")
    expect(serialised).not.toContain("hesitated on the sort key")
    expect(serialised).not.toContain("expires_at")
    expect(serialised).not.toContain("mastery_breakdown")
  })

  it("reads the fields the writers actually populate", () => {
    // topic/type, not the scenario_title/scenario_type the old usage route guessed at.
    expect(row.scenarioTitle).toBe("Merge Intervals")
    expect(row.sessionType).toBe("dsa")
    expect(row.difficulty).toBe("medium")
    expect(row.performanceScore).toBe(78)
    expect(row.startedAt).toBe("2026-08-08T10:00:00.000Z")
    expect(row.durationMinutes).toBe(42)
  })

  it("falls back to the legacy scenario_* names when they are all a document has", () => {
    const legacy = toSessionListRow(
      "sess_2",
      { scenario_title: "Old Title", scenario_type: "bugfix" },
      null,
      NOW
    )
    expect(legacy.scenarioTitle).toBe("Old Title")
    expect(legacy.sessionType).toBe("bugfix")
  })

  it("reports absent fields as null instead of inventing a value", () => {
    const sparse = toSessionListRow("sess_3", { created_at: "2026-08-08T11:30:00.000Z" }, null, NOW)
    expect(sparse.performanceScore).toBeNull()
    expect(sparse.completedAt).toBeNull()
    expect(sparse.durationMinutes).toBeNull()
    expect(sparse.userId).toBeNull()
    expect(sparse.scenarioTitle).toBe("Unknown")
  })
})

describe("toSessionDetail: projection", () => {
  const detail = toSessionDetail("sess_1", FULL_SESSION, "dev@example.com", NOW)

  it("adds the drill-in fields on top of the row fields", () => {
    expect(detail.scenarioId).toBe("merge-intervals")
    expect(detail.pattern).toBe("intervals")
    expect(detail.targetCompany).toBe("stripe")
    expect(detail.feedbackStatus).toBe("complete")
    expect(detail.technicalScore).toBe(81)
    expect(detail.masteryScore).toBe(72)
    expect(detail.scoreBreakdown).toEqual({
      understanding: 80,
      problemSolving: 75,
      codeQuality: 70,
      communication: 85,
      overall: 78,
    })
  })

  it("summarises the private material without shipping it", () => {
    expect(detail.feedbackSummary).toBe("Solid sweep-line solution, thin on edge cases.")
    expect(detail.silentNoteCount).toBe(2)
    expect(detail.hasStoredFeedback).toBe(true)
    const serialised = JSON.stringify(detail)
    expect(serialised).not.toContain("the entire model output")
    expect(serialised).not.toContain("hesitated on the sort key")
    expect(serialised).not.toContain("cus_leaky")
  })

  it("holds no field the drill-in does not render", () => {
    expect(Object.keys(detail)).not.toContain("stripe_customer_id")
    expect(Object.keys(detail)).not.toContain("silent_notes")
    expect(Object.keys(detail)).not.toContain("structured_feedback")
    expect(Object.keys(detail)).not.toContain("mastery_breakdown")
  })

  it("survives a document with no feedback at all", () => {
    const open = toSessionDetail("sess_4", { created_at: "2026-08-08T11:50:00.000Z" }, null, NOW)
    expect(open.scoreBreakdown).toBeNull()
    expect(open.feedbackSummary).toBeNull()
    expect(open.silentNoteCount).toBe(0)
    expect(open.hasStoredFeedback).toBe(false)
  })
})

describe("deriveSessionStatus", () => {
  it("labels a finished, scored round completed", () => {
    expect(
      deriveSessionStatus(
        { completed_at: "2026-08-08T10:00:00.000Z", feedback_status: "complete" },
        NOW
      )
    ).toBe("completed")
  })

  it("labels a round whose feedback is still running as scoring", () => {
    for (const feedback_status of ["pending", "processing"]) {
      expect(deriveSessionStatus({ completed_at: "x", feedback_status }, NOW)).toBe("scoring")
    }
  })

  it("labels a failed scoring run failed", () => {
    expect(deriveSessionStatus({ completed_at: "x", feedback_status: "failed" }, NOW)).toBe(
      "failed"
    )
  })

  it("treats a pre-feedback_status document with completed_at as completed", () => {
    expect(deriveSessionStatus({ completed_at: "2026-01-01T00:00:00.000Z" }, NOW)).toBe("completed")
  })

  it("splits open rounds by age, matching the created_at window the filter uses", () => {
    // Started an hour ago: plausibly still live.
    expect(deriveSessionStatus({ created_at: "2026-08-08T11:00:00.000Z" }, NOW)).toBe("in_progress")
    // Started yesterday and never finished: nobody is coming back to it.
    expect(deriveSessionStatus({ created_at: "2026-08-07T09:00:00.000Z" }, NOW)).toBe("abandoned")
  })

  it("does not call a session abandoned when it has no start time to judge by", () => {
    expect(deriveSessionStatus({}, NOW)).toBe("in_progress")
  })
})

describe("sessionDurationMinutes", () => {
  it("measures start to completion", () => {
    expect(
      sessionDurationMinutes({
        created_at: "2026-08-08T10:00:00.000Z",
        completed_at: "2026-08-08T10:30:00.000Z",
      })
    ).toBe(30)
  })

  it("is null while a round is still open", () => {
    expect(sessionDurationMinutes({ created_at: "2026-08-08T10:00:00.000Z" })).toBeNull()
  })

  it("refuses to report a negative duration from an inverted pair of stamps", () => {
    expect(
      sessionDurationMinutes({
        created_at: "2026-08-08T10:30:00.000Z",
        completed_at: "2026-08-08T10:00:00.000Z",
      })
    ).toBeNull()
  })
})

describe("timestamp and label readers", () => {
  it("accepts the Firestore Timestamp shape that feedback writes", () => {
    const asTimestamp = { toDate: () => new Date("2026-08-08T10:45:00.000Z") }
    const detail = toSessionDetail("sess_5", { updated_at: asTimestamp }, null, NOW)
    expect(detail.updatedAt).toBe("2026-08-08T10:45:00.000Z")
  })

  it("drops an unparseable timestamp rather than emitting Invalid Date", () => {
    expect(sessionStartedAt({ created_at: "not a date" })).toBeNull()
    expect(sessionStartedAt({ created_at: 1723118400000 })).toBeNull()
  })

  it("labels a guest without pretending the profile lookup failed", () => {
    expect(sessionUserLabel({ is_guest: true, user_id: "guest_9" }, null)).toBe("Guest")
  })

  it("prefers the email, then the id", () => {
    expect(sessionUserLabel({ user_id: "u1" }, "dev@example.com")).toBe("dev@example.com")
    expect(sessionUserLabel({ user_id: "u1" }, null)).toBe("u1")
    expect(sessionUserLabel({}, null)).toBe("Unknown")
  })
})
