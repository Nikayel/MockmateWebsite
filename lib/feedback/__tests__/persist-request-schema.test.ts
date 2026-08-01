import { describe, it, expect } from "vitest"
import { validatePersistRequestBody } from "../persist-request-schema"

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: "session-1",
    userId: "user-1",
    scores: {
      understanding: 70,
      problemSolving: 65,
      codeQuality: 80,
      communication: 60,
      overall: 68,
    },
    feedback: {
      raw: "Solid session.",
      tldr: "Good work",
      whatWorked: ["Clear approach"],
      fixNext: ["Edge cases"],
      actionPlan: ["Practice more"],
    },
    testsPassed: 4,
    testsTotal: 5,
    timeSpentMinutes: 25,
    hintsUsed: 1,
    difficulty: "medium",
    scenarioType: "dsa",
    scenarioTitle: "Two Sum",
    ...overrides,
  }
}

describe("validatePersistRequestBody", () => {
  it("accepts a well-formed body unchanged", () => {
    const result = validatePersistRequestBody(validBody())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.scores.overall).toBe(68)
      expect(result.data.testsPassed).toBe(4)
    }
  })

  it("rejects missing scores", () => {
    const body = validBody()
    delete (body as Record<string, unknown>).scores
    expect(validatePersistRequestBody(body).success).toBe(false)
  })

  it("rejects non-numeric scores", () => {
    const result = validatePersistRequestBody(
      validBody({ scores: { understanding: "high", problemSolving: 65, codeQuality: 80, communication: 60, overall: 68 } })
    )
    expect(result.success).toBe(false)
  })

  it("rejects NaN/Infinity scores", () => {
    const result = validatePersistRequestBody(
      validBody({ scores: { understanding: Infinity, problemSolving: 65, codeQuality: 80, communication: 60, overall: 68 } })
    )
    expect(result.success).toBe(false)
  })

  it("clamps out-of-range scores into 0-100", () => {
    const result = validatePersistRequestBody(
      validBody({ scores: { understanding: 999, problemSolving: -50, codeQuality: 80, communication: 60, overall: 250 } })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.scores.understanding).toBe(100)
      expect(result.data.scores.problemSolving).toBe(0)
      expect(result.data.scores.overall).toBe(100)
    }
  })

  it("preserves a legitimate zero score", () => {
    const result = validatePersistRequestBody(
      validBody({ scores: { understanding: 40, problemSolving: 40, codeQuality: 40, communication: 0, overall: 30 } })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.scores.communication).toBe(0)
    }
  })

  it("caps testsPassed at testsTotal", () => {
    const result = validatePersistRequestBody(validBody({ testsPassed: 12, testsTotal: 5 }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.testsPassed).toBe(5)
    }
  })

  it("coerces invalid test counts to 0 instead of rejecting", () => {
    const result = validatePersistRequestBody(validBody({ testsPassed: "abc", testsTotal: -3 }))
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.testsPassed).toBe(0)
      expect(result.data.testsTotal).toBe(0)
    }
  })

  it("falls back to defaults for unknown difficulty and scenarioType", () => {
    const result = validatePersistRequestBody(
      validBody({ difficulty: "impossible", scenarioType: "karaoke" })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.difficulty).toBe("medium")
      expect(result.data.scenarioType).toBe("dsa")
    }
  })

  it("drops malformed silent notes but keeps valid ones", () => {
    const result = validatePersistRequestBody(
      validBody({
        silentNotes: [
          { type: "wrong_complexity", userSaid: "O(1)", correct: "O(n)" },
          { type: 42 },
          "not a note",
        ],
      })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.silentNotes).toHaveLength(1)
      expect(result.data.silentNotes?.[0].type).toBe("wrong_complexity")
    }
  })

  it("rejects a missing feedback.raw", () => {
    const result = validatePersistRequestBody(validBody({ feedback: { tldr: "x" } }))
    expect(result.success).toBe(false)
  })

  // REGRESSION: the streaming client sends explicit null for the bugfix fields
  // on every non-bugfix session (stream route emits `?? null` and JSON keeps
  // nulls). A schema built with .optional() alone rejects that body and 400s
  // the persist, silently dropping scores/mastery/history for the main DSA
  // flow. This replicates the real client body from use-streaming-feedback.
  it("accepts the real non-bugfix streaming body with explicit nulls", () => {
    const result = validatePersistRequestBody(
      validBody({
        bugfixEvidenceSummary: null,
        bugfixScoreBreakdown: null,
        bugfixPostSessionReport: null,
        silentNotes: [
          { type: "wrong_complexity", userSaid: "O(1)", correct: "O(n)", timestamp: 1722400000 },
        ],
      })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.silentNotes).toHaveLength(1)
      expect(result.data.silentNotes?.[0].timestamp).toBe(1722400000)
    }
  })

  it("accepts null silentNotes, transcript, and guidedLabMastery", () => {
    const result = validatePersistRequestBody(
      validBody({ silentNotes: null, conversationTranscript: null, guidedLabMastery: null })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.silentNotes).toBeUndefined()
      expect(result.data.conversationTranscript).toBeUndefined()
      expect(result.data.guidedLabMastery).toBeUndefined()
    }
  })

  it("preserves silent-note timestamps through validation", () => {
    const result = validatePersistRequestBody(
      validBody({ silentNotes: [{ type: "missed_edge_case", userSaid: "", timestamp: 42 }] })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.silentNotes?.[0].timestamp).toBe(42)
    }
  })

  it("clamps bugfixScoreBreakdown numeric fields (dashboard averages breakdown.overall)", () => {
    const result = validatePersistRequestBody(
      validBody({
        scenarioType: "bugfix",
        bugfixScoreBreakdown: {
          reproductionDiscipline: 80,
          overall: 99999,
          communication: -50,
          hypothesisText: "kept as-is",
        },
      })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      const breakdown = result.data.bugfixScoreBreakdown as Record<string, unknown>
      expect(breakdown.overall).toBe(100)
      expect(breakdown.communication).toBe(0)
      expect(breakdown.reproductionDiscipline).toBe(80)
      expect(breakdown.hypothesisText).toBe("kept as-is")
    }
  })

  it("drops a bugfixScoreBreakdown whose overall is non-numeric", () => {
    const result = validatePersistRequestBody(
      validBody({
        scenarioType: "bugfix",
        bugfixScoreBreakdown: { overall: "great", communication: 70 },
      })
    )
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bugfixScoreBreakdown).toBeNull()
    }
  })

  it("drops breakdowns whose overall merely coerces to a number", () => {
    // Number("68")/Number("")/Number(null)/Number(true) all coerce, but only
    // a real number type is a legit server-produced breakdown.
    for (const overall of ["68", "", null, true]) {
      const result = validatePersistRequestBody(
        validBody({ scenarioType: "bugfix", bugfixScoreBreakdown: { overall } })
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.bugfixScoreBreakdown).toBeNull()
      }
    }
  })

  it("passes null and absent bugfixScoreBreakdown through untouched", () => {
    const withNull = validatePersistRequestBody(validBody({ bugfixScoreBreakdown: null }))
    expect(withNull.success).toBe(true)
    if (withNull.success) expect(withNull.data.bugfixScoreBreakdown).toBeNull()

    const absent = validatePersistRequestBody(validBody())
    expect(absent.success).toBe(true)
    if (absent.success) expect(absent.data.bugfixScoreBreakdown).toBeUndefined()
  })
})
