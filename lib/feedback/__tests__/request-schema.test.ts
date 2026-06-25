import { describe, expect, it } from "vitest"
import {
  MAX_FEEDBACK_CODE_LENGTH,
  MAX_FEEDBACK_TRANSCRIPT_LENGTH,
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
