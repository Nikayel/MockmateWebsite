import { describe, expect, it } from "vitest"
import { SCORING } from "@/lib/constants"
import {
  calculateInstantScores,
  calculateSystemDesignScores,
  type ScoreSignals,
} from "../score-accumulator"

/**
 * Guards DUP-1: the instant overall score must use the SAME canonical weights
 * as the final AI-validated score (SCORING.*_WEIGHTS). If someone reintroduces
 * inline weight literals in score-accumulator that diverge from lib/constants,
 * these assertions fail so the instant and final numbers cannot silently drift.
 *
 * Strategy: craft signals whose subscores land on integers inside [0,100] so
 * the returned (rounded/clamped) subscores equal the internal values the
 * overall is computed from. The overall must then equal the canonical-weighted
 * sum of those subscores. medium difficulty avoids the +/-5 hard/easy tweak.
 */

// Base signals engineered so every subscore is a clean integer in range and no
// difficulty adjustment applies. See the trace in the assertions below.
const baseSignals: ScoreSignals = {
  testsPassed: 8,
  testsTotal: 10, // passRate = 80
  efficiencyScore: 60,
  codeLength: 500,
  hasActualLogic: true, // not incomplete
  approachExplained: true,
  complexityDiscussed: false,
  complexityCorrect: false,
  edgeCasesMentioned: 0,
  questionsAnswered: 0,
  questionsAsked: 0,
  candidateMessageCount: 5,
  hintsUsed: 0,
  hintsTotal: 5,
  aiSuggestionsCopiedBlindly: false,
  testsRanBeforeSubmit: true,
  submittedFromPhase: "testing",
  scenarioType: "dsa",
  difficulty: "medium",
}

function weightedOverall(
  scores: { understanding: number; problemSolving: number; codeQuality: number; communication: number },
  weights: {
    UNDERSTANDING: number
    PROBLEM_SOLVING: number
    CODE_QUALITY: number
    COMMUNICATION: number
  }
): number {
  return Math.round(
    scores.understanding * weights.UNDERSTANDING +
      scores.problemSolving * weights.PROBLEM_SOLVING +
      scores.codeQuality * weights.CODE_QUALITY +
      scores.communication * weights.COMMUNICATION
  )
}

describe("score accumulator uses canonical scoring weights (DUP-1)", () => {
  it("produces the crafted clean-integer subscores (clamp/round are no-ops)", () => {
    const result = calculateInstantScores(baseSignals)
    // If these drift, the weight assertions below are no longer valid because
    // the returned subscores would differ from the internal pre-clamp values.
    expect(result.understanding).toBe(70)
    expect(result.problemSolving).toBe(68)
    expect(result.codeQuality).toBe(64)
    expect(result.communication).toBe(90)
  })

  it("DSA overall matches SCORING.PERFORMANCE_WEIGHTS", () => {
    const result = calculateInstantScores({ ...baseSignals, scenarioType: "dsa" })
    expect(result.signalsUsed).toContain("weights:dsa")
    expect(result.overall).toBe(weightedOverall(result, SCORING.PERFORMANCE_WEIGHTS))
  })

  it("bugfix overall matches SCORING.BUG_FIX_WEIGHTS", () => {
    const result = calculateInstantScores({ ...baseSignals, scenarioType: "bugfix" })
    expect(result.signalsUsed).toContain("weights:bugfix")
    expect(result.overall).toBe(weightedOverall(result, SCORING.BUG_FIX_WEIGHTS))
  })

  it("system-design overall matches SCORING.SYSTEM_DESIGN_WEIGHTS", () => {
    const result = calculateInstantScores({ ...baseSignals, scenarioType: "system-design" })
    expect(result.signalsUsed).toContain("weights:sysdesign")
    expect(result.overall).toBe(weightedOverall(result, SCORING.SYSTEM_DESIGN_WEIGHTS))
  })

  it("calculateSystemDesignScores overall matches SCORING.SYSTEM_DESIGN_WEIGHTS", () => {
    const result = calculateSystemDesignScores({
      hasDesignNotes: true,
      designNotesLength: 300,
      candidateMessageCount: 5,
      approachExplained: true,
      requirementsGathered: true,
      tradeoffsDiscussed: true,
      scalabilityMentioned: true,
      questionsAnswered: 2,
      questionsAsked: 4,
    })
    // requirements -> understanding, architecture -> problemSolving,
    // scalability -> codeQuality (see the mapping in calculateSystemDesignScores).
    expect(result.understanding).toBe(90)
    expect(result.problemSolving).toBe(100)
    expect(result.codeQuality).toBe(90)
    expect(result.communication).toBe(65)
    expect(result.overall).toBe(weightedOverall(result, SCORING.SYSTEM_DESIGN_WEIGHTS))
  })
})
