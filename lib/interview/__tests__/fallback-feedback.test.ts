import { describe, expect, it } from "vitest"
import {
  summarizeBugfixEvidence,
  calculateBugfixEvidenceScore,
  type BugfixEvidenceEvent,
} from "@/lib/bugfix"
import { calculateUserScore, type InteractionMetrics } from "@/lib/scoring"
import { computeFallbackScores } from "../fallback-feedback"

describe("computeFallbackScores", () => {
  it("scores bugfix scenarios from collected evidence", () => {
    const events: BugfixEvidenceEvent[] = []
    const expectedTouchedFiles = ["src/rate-limiter.ts"]

    const result = computeFallbackScores({
      scenarioType: "bugfix",
      bugfixEvidenceEvents: events,
      bugfixExpectedTouchedFiles: expectedTouchedFiles,
    })

    const expected = calculateBugfixEvidenceScore(
      summarizeBugfixEvidence({ events, expectedTouchedFiles })
    )

    expect(result.performanceScore).toBe(expected.overall)
    expect(result.scoreBreakdown).toEqual({
      understandingScore: expected.rootCauseUnderstanding,
      problemSolvingScore: expected.evidenceGathering,
      codeQualityScore: expected.minimalFixQuality,
      communicationScore: expected.communication,
    })
  })

  it("scores non-bugfix scenarios from interaction metrics", () => {
    const result = computeFallbackScores({
      scenarioType: "dsa",
      scenarioDifficulty: "medium",
      hintsUsed: 2,
      elapsedTimeSeconds: 600,
      testsPassed: 3,
      testsTotal: 5,
    })

    const expected = calculateUserScore({
      hintsUsed: 2,
      timeSpent: 600,
      testCasesPassed: 3,
      testCasesTotal: 5,
      problemDifficulty: "medium",
      problemType: "dsa",
    } as unknown as InteractionMetrics)

    expect(result.performanceScore).toBe(expected.overallScore)
    expect(result.scoreBreakdown).toEqual({
      understandingScore: expected.understandingScore,
      problemSolvingScore: expected.problemSolvingScore,
      codeQualityScore: expected.codeQualityScore,
      communicationScore: expected.communicationScore,
    })
  })

  it("applies defaults for missing optional fields", () => {
    const result = computeFallbackScores({ scenarioType: "dsa" })
    expect(typeof result.performanceScore).toBe("number")
    expect(Object.keys(result.scoreBreakdown).sort()).toEqual([
      "codeQualityScore",
      "communicationScore",
      "problemSolvingScore",
      "understandingScore",
    ])
  })
})
