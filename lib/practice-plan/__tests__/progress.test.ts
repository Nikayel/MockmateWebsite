import { describe, expect, it } from "vitest"
import type { InterviewSession } from "@/lib/types"
import { practiceObservations } from "../progress"
const session = (fields: Partial<InterviewSession>): InterviewSession => ({
  id: "s",
  user_id: "u",
  started_at: "2026-10-10",
  difficulty: "easy",
  topic: "test",
  type: "bugfix",
  ...fields,
})
describe("practice observations", () => {
  it("reports only explicit false-to-true behavior changes", () => {
    expect(
      practiceObservations(
        session({
          bugfix_evidence_summary: {
            reproducedBeforeEditing: false,
            rootCauseAssessment: { status: "observed", score: 40, evidence: "The order is wrong." },
          },
        }),
        session({
          bugfix_evidence_summary: {
            reproducedBeforeEditing: true,
            rootCauseAssessment: {
              status: "observed",
              score: 90,
              evidence: "Removing the entry shifts the next index.",
            },
          },
        })
      )
    ).toHaveLength(2)
  })
  it("does not infer an improvement from absent evidence", () => {
    expect(
      practiceObservations(
        session({}),
        session({ bugfix_evidence_summary: { reproducedBeforeEditing: true } })
      )
    ).toEqual([])
  })
  it("does not compare different interview tracks", () => {
    expect(
      practiceObservations(
        session({ score_breakdown: { understandingScore: 40 } }),
        session({ type: "dsa", score_breakdown: { understandingScore: 80 } })
      )
    ).toEqual([])
  })
  it("does not call a scoring-version change learner progress", () => {
    expect(
      practiceObservations(
        session({ score_breakdown: { communicationScore: 40 } }),
        session({ measurement_version: 2, score_breakdown: { communicationScore: 80 } })
      )
    ).toEqual([])
  })
  it("labels score pairs as different exercises, even when the newer score is lower", () => {
    const result = practiceObservations(
      session({ score_breakdown: { communicationScore: 60 } }),
      session({ score_breakdown: { communicationScore: 40 } })
    )
    expect(result[0]).toContain("60 / 100")
    expect(result[0]).toContain("40 / 100")
    expect(result[0]).toContain("different exercises")
  })
  it.each([NaN, Infinity, -1, 101])("ignores invalid scores %s", (score) => {
    expect(
      practiceObservations(
        session({ score_breakdown: { communicationScore: score } }),
        session({ score_breakdown: { communicationScore: 80 } })
      )
    ).toEqual([])
  })
})
