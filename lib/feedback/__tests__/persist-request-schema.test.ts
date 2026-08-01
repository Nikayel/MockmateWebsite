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
})
