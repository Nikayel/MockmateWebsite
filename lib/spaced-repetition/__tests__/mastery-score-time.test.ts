import { describe, expect, it } from "vitest"
import { calculateMasteryScore, type MasteryScoreInput } from "../mastery-score"

/**
 * Communication-time discount regression (session 2Iz2oYpGQxs6UNo6s7Hd).
 *
 * The feedback persist path never passed message counts, so a 26-minute
 * session where the interviewer itself burned ~6 minutes re-asking one
 * question was charged the full wall clock against the 15-minute "pure
 * coding" budget: timeEfficiencyScore 51. With the counts supplied, the
 * overhead is discounted per COMMUNICATION_OVERHEAD.
 */
const SESSION: MasteryScoreInput = {
  testCasesPassed: 4,
  testCasesTotal: 4,
  timeSpentMinutes: 26,
  hintsUsed: 0,
  hintsTotal: 5,
  problemDifficulty: "medium",
}

describe("mastery time analysis communication discount", () => {
  it("charges the full wall clock when no message counts are provided", () => {
    const result = calculateMasteryScore(SESSION)
    expect(result.timeAnalysis.estimatedCommunicationMinutes).toBe(0)
    expect(result.timeAnalysis.adjustedTimeMinutes).toBe(26)
    expect(result.timeAnalysis.timeRatio).toBe(1.73)
    expect(result.components.timeEfficiencyScore).toBe(51)
  })

  it("discounts interviewer exchanges at 0.5 min each", () => {
    const result = calculateMasteryScore({ ...SESSION, interviewerMessagesCount: 12 })
    expect(result.timeAnalysis.estimatedCommunicationMinutes).toBe(6)
    expect(result.timeAnalysis.adjustedTimeMinutes).toBe(20)
    expect(result.timeAnalysis.timeRatio).toBe(1.33)
    expect(result.components.timeEfficiencyScore).toBe(67)
  })

  it("discounts AI partner messages at their own 0.3 min rate", () => {
    const result = calculateMasteryScore({ ...SESSION, aiMessagesCount: 10 })
    expect(result.timeAnalysis.estimatedCommunicationMinutes).toBe(3)
    expect(result.timeAnalysis.adjustedTimeMinutes).toBe(23)
    expect(result.components.timeEfficiencyScore).toBe(59)
  })

  it("never discounts adjusted time below the one-minute floor", () => {
    const result = calculateMasteryScore({
      ...SESSION,
      timeSpentMinutes: 2,
      interviewerMessagesCount: 10,
    })
    expect(result.timeAnalysis.adjustedTimeMinutes).toBe(1)
    expect(result.components.timeEfficiencyScore).toBe(100)
  })
})
