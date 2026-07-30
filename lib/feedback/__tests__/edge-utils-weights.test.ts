import { describe, expect, it } from "vitest"
import { SCORING } from "@/lib/constants"
import type { ConversationValidation, PreScreenResult } from "../types"
import { calculateValidatedScores } from "../edge-utils"

/**
 * Edge counterpart to score-accumulator-weights.test.ts (DUP-1).
 *
 * edge-utils is the Edge-runtime scorer behind /api/feedback/stream. It used to
 * hard-code its own weight vectors, and all three had silently drifted from
 * SCORING in lib/constants.ts: DSA transposed CODE_QUALITY/COMMUNICATION,
 * bugfix transposed UNDERSTANDING/PROBLEM_SOLVING, and system-design used
 * 0.2/0.2/0.1/0.5 against a canonical 0.2/0.3/0.2/0.3. The same user's session
 * therefore scored differently depending on which route rendered the feedback.
 *
 * These assertions pin the Edge overall to the canonical weights so it cannot
 * drift from the Node scorers again.
 *
 * Strategy (same as the accumulator guard): craft inputs whose subscores land on
 * clean integers inside [0,100] so the returned rounded/clamped subscores equal
 * the internal values the overall is computed from. approachExplained keeps the
 * communication-evidence level at "adequate", making both gate caps no-ops.
 */

const preScreen: PreScreenResult = {
  hasContent: true,
  candidateMessageCount: 8,
  avgMessageLength: 80,
  hasKeywords: { complexity: true, approach: true, alternatives: false, edgeCases: true },
  suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: false },
}

const aiValidation: ConversationValidation = {
  isCoherent: true,
  responsesRelevant: true,
  approachExplained: true, // -> evidence level "adequate", caps are no-ops
  approachQuality: "good",
  complexityDiscussed: true,
  complexityAccurate: true,
  statedComplexity: "O(n)",
  questionsAsked: 2,
  questionsAnswered: 2,
  edgeCasesConsidered: true,
  alternativesDiscussed: false,
  communicationScore: 75,
}

// passRate 80 / efficiency 60 keeps every subscore an integer and dodges the
// clean-solution bonus (which needs passRate >= 90).
const PASS_RATE = 80
const efficiencyMetrics = { efficiencyScore: 60 }

function score(scenarioType: string) {
  return calculateValidatedScores(
    PASS_RATE,
    efficiencyMetrics,
    preScreen,
    aiValidation,
    scenarioType,
    "function solve() { return 1 }"
  )
}

function weightedOverall(
  scores: {
    understanding: number
    problemSolving: number
    codeQuality: number
    communication: number
  },
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

describe("edge-utils uses canonical scoring weights", () => {
  it("produces the crafted clean-integer subscores (round/clamp/gate are no-ops)", () => {
    const result = score("dsa")
    // understanding  = 80*0.4 + 60*0.3 = 50, +20 approach, +10 accurate complexity
    expect(result.understanding).toBe(80)
    // problemSolving = 80*0.5 + 60*0.3 = 58, +10 edge cases
    expect(result.problemSolving).toBe(68)
    // codeQuality    = 80*0.5 + 60*0.4 = 64 (no clean-solution bonus at passRate 80)
    expect(result.codeQuality).toBe(64)
    // communication  = 30 base, +30 approach, +20 accurate complexity, +10 edge cases
    expect(result.communication).toBe(90)
  })

  it("DSA overall matches SCORING.PERFORMANCE_WEIGHTS", () => {
    const result = score("dsa")
    expect(result.overall).toBe(weightedOverall(result, SCORING.PERFORMANCE_WEIGHTS))
  })

  it("bugfix overall matches SCORING.BUG_FIX_WEIGHTS", () => {
    const result = score("bugfix")
    expect(result.overall).toBe(weightedOverall(result, SCORING.BUG_FIX_WEIGHTS))
  })

  it("system-design overall matches SCORING.SYSTEM_DESIGN_WEIGHTS", () => {
    const result = score("system-design")
    expect(result.overall).toBe(weightedOverall(result, SCORING.SYSTEM_DESIGN_WEIGHTS))
  })

  // No "all three overalls differ" assertion: with these subscores bugfix (75.8)
  // and system-design (76.2) both round to 76, which is a property of the fixture
  // rather than of the weights. A refactor that collapsed the three branches onto
  // one table is already caught above, since two of the three per-type assertions
  // would then compare against the wrong vector.
})
