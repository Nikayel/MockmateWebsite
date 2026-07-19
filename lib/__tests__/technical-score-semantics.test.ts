import { describe, expect, it } from "vitest"
import { calculateTechnicalScoreFromBreakdown } from "@/lib/constants"

/**
 * Pins the single technical_score semantic (Technical = Mastery unification):
 *  - the LIVE write path persists the mastery score directly (app/api/feedback/persist);
 *  - calculateTechnicalScoreFromBreakdown is ONLY the read-time fallback for legacy documents,
 *    using the fixed 60/25/15 (codeQuality/problemSolving/understanding) weights.
 * If the fallback weights drift, two code paths would disagree on what technical_score means.
 */
describe("technical_score fallback (calculateTechnicalScoreFromBreakdown)", () => {
  it("uses the fixed 60/25/15 codeQuality/problemSolving/understanding weights", () => {
    // 60% * 100 + 25% * 0 + 15% * 0 = 60
    expect(
      calculateTechnicalScoreFromBreakdown({
        codeQualityScore: 100,
        problemSolvingScore: 0,
        understandingScore: 0,
      })
    ).toBe(60)
    // 25% * 100 = 25
    expect(
      calculateTechnicalScoreFromBreakdown({
        codeQualityScore: 0,
        problemSolvingScore: 100,
        understandingScore: 0,
      })
    ).toBe(25)
    // 15% * 100 = 15
    expect(
      calculateTechnicalScoreFromBreakdown({
        codeQualityScore: 0,
        problemSolvingScore: 0,
        understandingScore: 100,
      })
    ).toBe(15)
  })

  it("is not the flat (u + ps + cq) / 3 average the persist route used to compute", () => {
    // A breakdown where the flat average (33) and the weighted fallback differ, proving the
    // live path (mastery) and the legacy fallback are distinct definitions.
    const flatAverage = Math.round((0 + 0 + 100) / 3) // 33
    const fallback = calculateTechnicalScoreFromBreakdown({
      codeQualityScore: 0,
      problemSolvingScore: 0,
      understandingScore: 100,
    })
    expect(fallback).not.toBe(flatAverage)
  })
})
