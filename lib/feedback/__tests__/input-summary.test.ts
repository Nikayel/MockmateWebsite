import { describe, expect, it } from "vitest"
import {
  buildFeedbackEfficiencyInfo,
  buildFeedbackTestResultsSummary,
  buildFeedbackTimeInfo,
  normalizeFeedbackTranscriptMessages,
  normalizeTranscriptForCritique,
} from "../input-summary"

describe("feedback input summary helpers", () => {
  it("builds test summaries with service-error exclusions", () => {
    expect(
      buildFeedbackTestResultsSummary({
        testResults: [{ passed: true }, { passed: false }],
        testsPassed: 1,
        testsTotal: 2,
        serviceErrorCount: 1,
      })
    ).toContain("Note: 1 test(s) excluded due to service errors")
  })

  it("formats time spent in minutes and seconds", () => {
    expect(buildFeedbackTimeInfo(125)).toBe("TIME SPENT: 2 minutes 5 seconds")
    expect(buildFeedbackTimeInfo()).toBe("")
  })

  it("builds efficiency summaries and fallback text", () => {
    expect(
      buildFeedbackEfficiencyInfo({
        linesOfCode: 12,
        complexity: "simple",
        estimatedTimeComplexity: "O(n)",
        optimalTimeComplexity: "O(n)",
        estimatedSpaceComplexity: "O(n)",
        optimalSpaceComplexity: "O(1)",
        efficiencyScore: 80,
      })
    ).toContain("Time complexity match: YES - Optimal")

    expect(buildFeedbackEfficiencyInfo()).toContain("No efficiency data available")
  })

  it("normalizes transcript messages for extraction and critique", () => {
    const transcript = [
      { type: "user", role: "candidate", message: "I would use a map", content: "" },
      { type: "assistant", role: "interviewer", message: "", content: "Why?" },
    ]

    expect(normalizeFeedbackTranscriptMessages(transcript)).toEqual([
      { role: "user", content: "I would use a map" },
      { role: "interviewer", content: "Why?" },
    ])

    expect(normalizeTranscriptForCritique(transcript)).toEqual([
      { role: "candidate", content: "I would use a map" },
      { role: "interviewer", content: "Why?" },
    ])
  })
})
