import { describe, it, expect } from "vitest"
import { buildSessionDetailSections, sessionDetailHeadline } from "../session-detail-view"
import { toSessionDetail } from "../session-rows"

const NOW = new Date("2026-08-08T12:00:00.000Z")

const SCORED = toSessionDetail(
  "sess_1",
  {
    user_id: "user_abc",
    topic: "Merge Intervals",
    type: "dsa",
    pattern: "intervals",
    scenario_id: "merge-intervals",
    difficulty: "medium",
    target_company: "stripe",
    created_at: "2026-08-08T10:00:00.000Z",
    completed_at: "2026-08-08T10:42:00.000Z",
    feedback_status: "complete",
    performance_score: 78,
    technical_score: 81,
    score_breakdown: { understandingScore: 80, overallScore: 78 },
    structured_feedback: {
      tldr: "Solid sweep-line solution, thin on edge cases.",
      rawFeedback: "...the entire model output...",
    },
    silent_notes: ["hesitated on the sort key"],
  },
  "dev@example.com",
  NOW
)

/** A round that was started and never finished: the sparse case the panel must survive. */
const OPEN = toSessionDetail("sess_2", { created_at: "2026-08-08T11:40:00.000Z" }, null, NOW)

function fieldsOf(detail: Parameters<typeof buildSessionDetailSections>[0]) {
  return buildSessionDetailSections(detail).flatMap((section) =>
    section.fields.map((field) => [field.label, field.value] as const)
  )
}

function valueOf(detail: Parameters<typeof buildSessionDetailSections>[0], label: string) {
  return fieldsOf(detail).find(([fieldLabel]) => fieldLabel === label)?.[1]
}

describe("buildSessionDetailSections", () => {
  it("groups the round, the user, the timing, the scores and the feedback", () => {
    expect(buildSessionDetailSections(SCORED).map((section) => section.title)).toEqual([
      "Round",
      "Who",
      "Timing",
      "Scores",
      "Score breakdown",
      "Feedback",
    ])
  })

  it("omits the breakdown section when the round never produced one", () => {
    expect(buildSessionDetailSections(OPEN).map((section) => section.title)).not.toContain(
      "Score breakdown"
    )
  })

  it("reports the private material without reproducing it", () => {
    const rendered = JSON.stringify(buildSessionDetailSections(SCORED))
    expect(rendered).toContain("Yes, held server side")
    expect(rendered).toContain("1 recorded")
    // The point of the count: it says the notes exist and stops there.
    expect(rendered).not.toContain("hesitated on the sort key")
    expect(rendered).not.toContain("the entire model output")
  })

  it("says a value is missing instead of leaving a blank an admin has to interpret", () => {
    expect(valueOf(OPEN, "Pattern")).toBe("None recorded")
    expect(valueOf(OPEN, "Target company")).toBe("None chosen")
    expect(valueOf(OPEN, "Completed")).toBe("Not recorded")
    expect(valueOf(OPEN, "Feedback state")).toBe("Never generated")
    expect(valueOf(OPEN, "Silent notes")).toBe("None")
  })

  it("greys an absent value rather than styling it like real data", () => {
    const round = buildSessionDetailSections(OPEN).find((section) => section.title === "Round")
    const pattern = round?.fields.find((field) => field.label === "Pattern")
    expect(pattern?.tone).toBe("absent")
  })

  it("shows an open round as open rather than as a zero-length one", () => {
    expect(valueOf(OPEN, "Duration")).toBe("Still open")
    expect(valueOf(OPEN, "Status")).toBe("In progress")
    expect(valueOf(OPEN, "Performance")).toBe("Not scored")
  })

  it("renders the scores a finished round has", () => {
    expect(valueOf(SCORED, "Performance")).toBe("78%")
    expect(valueOf(SCORED, "Technical")).toBe("81%")
    // Never persisted for this round, and said so rather than shown as 0%.
    expect(valueOf(SCORED, "Efficiency")).toBe("Not scored")
    expect(valueOf(SCORED, "Understanding")).toBe("80%")
    expect(valueOf(SCORED, "Duration")).toBe("42 min")
  })

  it("flags a guided lab, and stays quiet about it otherwise", () => {
    expect(valueOf(SCORED, "Guided lab")).toBeUndefined()
    const lab = toSessionDetail(
      "sess_3",
      { created_at: "2026-08-08T10:00:00.000Z", is_guided_lab: true },
      null,
      NOW
    )
    expect(valueOf(lab, "Guided lab")).toBe("Yes")
  })

  it("uses no em dashes in the labels an admin reads", () => {
    for (const [label, value] of fieldsOf(SCORED)) {
      expect(label).not.toContain("—")
      expect(value).not.toContain("—")
    }
  })
})

describe("sessionDetailHeadline", () => {
  it("surfaces the one-line summary when there is one", () => {
    expect(sessionDetailHeadline(SCORED)).toBe("Solid sweep-line solution, thin on edge cases.")
  })

  it("is null for a round with no feedback", () => {
    expect(sessionDetailHeadline(OPEN)).toBeNull()
  })
})
