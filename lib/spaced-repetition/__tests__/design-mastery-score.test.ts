import { describe, expect, it } from "vitest"
import { calculateDesignMasteryScore } from "../mastery-score"
import { calculateTechnicalScoreFromBreakdown } from "../../constants"

/**
 * DUP-11 regression: the system-design feedback hook used to compute its own
 * unsourced 0.3/0.4/0.3 mastery formula before feeding spaced repetition. Mastery
 * from an AI breakdown must instead flow through the single canonical helper
 * (code quality 60%, problem solving 25%, understanding 15%).
 */
describe("calculateDesignMasteryScore", () => {
  it("uses the canonical breakdown weights (60/25/15), not the old 0.3/0.4/0.3 formula", () => {
    const breakdown = { understanding: 80, problemSolving: 60, codeQuality: 90 }

    // Canonical: 90*0.6 + 60*0.25 + 80*0.15 = 54 + 15 + 12 = 81
    expect(calculateDesignMasteryScore(breakdown)).toBe(81)

    // The retired inline formula would have produced 75 - guard against regression.
    const retiredFormula = Math.round(80 * 0.3 + 60 * 0.4 + 90 * 0.3)
    expect(calculateDesignMasteryScore(breakdown)).not.toBe(retiredFormula)
  })

  it("delegates to the single canonical breakdown-to-mastery source of truth", () => {
    const breakdown = { understanding: 70, problemSolving: 55, codeQuality: 85 }
    expect(calculateDesignMasteryScore(breakdown)).toBe(
      calculateTechnicalScoreFromBreakdown({
        codeQualityScore: 85,
        problemSolvingScore: 55,
        understandingScore: 70,
      })
    )
  })

  it("excludes communication from mastery", () => {
    const base = { understanding: 80, problemSolving: 60, codeQuality: 90 }
    expect(calculateDesignMasteryScore({ ...base, communication: 10 })).toBe(
      calculateDesignMasteryScore({ ...base, communication: 95 })
    )
  })

  it("defaults missing dimensions to 0 (matching the prior inline behavior)", () => {
    // Only code quality present: 100*0.6 = 60
    expect(calculateDesignMasteryScore({ codeQuality: 100 })).toBe(60)
    // Empty breakdown scores 0
    expect(calculateDesignMasteryScore({})).toBe(0)
  })

  it("clamps out-of-range inputs to 0-100", () => {
    // Each dimension is clamped individually before weighting.
    expect(
      calculateDesignMasteryScore({ understanding: 500, problemSolving: 500, codeQuality: 500 })
    ).toBe(100)
    expect(
      calculateDesignMasteryScore({ understanding: -20, problemSolving: -20, codeQuality: -20 })
    ).toBe(0)
  })
})
