import { describe, expect, it } from "vitest"
import {
  MAX_FEEDBACK_CODE_LENGTH,
  MAX_FEEDBACK_TRANSCRIPT_LENGTH,
  sanitizeEfficiencyScore,
  sanitizeTestCount,
  validateFeedbackRequestBody,
} from "../request-schema"

describe("validateFeedbackRequestBody", () => {
  it("requires code and scenario title", () => {
    expect(validateFeedbackRequestBody({ code: "return []" })).toEqual({
      success: false,
      error: "Code and scenario title are required",
      status: 400,
    })

    expect(validateFeedbackRequestBody({ scenarioTitle: "Two Sum" })).toEqual({
      success: false,
      error: "Code and scenario title are required",
      status: 400,
    })
  })

  it("rejects oversized code", () => {
    const result = validateFeedbackRequestBody({
      code: "x".repeat(MAX_FEEDBACK_CODE_LENGTH + 1),
      scenarioTitle: "Two Sum",
    })

    expect(result).toEqual({
      success: false,
      error: `Code exceeds maximum length of ${MAX_FEEDBACK_CODE_LENGTH} characters`,
      status: 400,
      logContext: { codeLength: MAX_FEEDBACK_CODE_LENGTH + 1 },
    })
  })

  it("rejects oversized string transcripts", () => {
    const result = validateFeedbackRequestBody({
      code: "return []",
      scenarioTitle: "Two Sum",
      conversationTranscript: "x".repeat(MAX_FEEDBACK_TRANSCRIPT_LENGTH + 1),
    })

    expect(result).toEqual({
      success: false,
      error: "Conversation transcript exceeds maximum length",
      status: 400,
      logContext: { transcriptLength: MAX_FEEDBACK_TRANSCRIPT_LENGTH + 1 },
    })
  })

  it("accepts legacy nested metrics and transcript arrays", () => {
    const result = validateFeedbackRequestBody({
      code: "return []",
      scenarioTitle: "Two Sum",
      scenarioType: "dsa",
      aiCollaborationMetrics: { partnerMessagesSent: 1 },
      interactionMetrics: { interviewerQuestionsAnswered: 2 },
      efficiencyMetrics: { estimatedTimeComplexity: "O(n)" },
      conversationTranscript: [{ type: "user", message: "I will use a map" }],
      unknownFutureField: { ok: true },
    })

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          code: "return []",
          scenarioTitle: "Two Sum",
          unknownFutureField: { ok: true },
        }),
      })
    )
  })
})

describe("sanitizeTestCount", () => {
  it("passes through valid counts and floors decimals", () => {
    expect(sanitizeTestCount(5)).toBe(5)
    expect(sanitizeTestCount(4.9)).toBe(4)
    expect(sanitizeTestCount(0)).toBe(0)
  })

  it("coerces numeric strings", () => {
    expect(sanitizeTestCount("7")).toBe(7)
  })

  it("returns 0 for garbage, negatives, and non-finite input", () => {
    expect(sanitizeTestCount("abc")).toBe(0)
    expect(sanitizeTestCount(-3)).toBe(0)
    expect(sanitizeTestCount(NaN)).toBe(0)
    expect(sanitizeTestCount(Infinity)).toBe(0)
    expect(sanitizeTestCount(null)).toBe(0)
    expect(sanitizeTestCount(undefined)).toBe(0)
    expect(sanitizeTestCount("")).toBe(0)
    expect(sanitizeTestCount({})).toBe(0)
  })
})

describe("sanitizeEfficiencyScore", () => {
  it("clamps into 0-100", () => {
    expect(sanitizeEfficiencyScore(85)).toBe(85)
    expect(sanitizeEfficiencyScore(150)).toBe(100)
    expect(sanitizeEfficiencyScore(-10)).toBe(0)
    expect(sanitizeEfficiencyScore(0)).toBe(0)
  })

  it("defaults to neutral 50 when missing or non-numeric", () => {
    expect(sanitizeEfficiencyScore(undefined)).toBe(50)
    expect(sanitizeEfficiencyScore(null)).toBe(50)
    expect(sanitizeEfficiencyScore("garbage")).toBe(50)
    expect(sanitizeEfficiencyScore(NaN)).toBe(50)
    expect(sanitizeEfficiencyScore("")).toBe(50)
  })
})
