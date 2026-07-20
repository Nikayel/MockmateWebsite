/**
 * Communication-evidence gate: a session with no (or barely any) verbal signal
 * cannot earn Understanding / Problem-Solving from pass rate alone, on ANY of the
 * scoring paths a user can hit (instant accumulator, Edge validated + floors,
 * Node DSA, Node bugfix + floors).
 *
 * Repro this pins (user report 2026-07-19): a 5/5 DSA run with ZERO chat messages
 * scored U70 / PS80 / CQ100 / Comm30 = 74 overall (B-). Silence must gate it.
 */
import { describe, expect, it } from "vitest"
import {
  assessCommunicationEvidence,
  COMMUNICATION_GATE_CAPS,
} from "../scoring/communication-gate"
import { calculateInstantScores, type ScoreSignals } from "../score-accumulator"
import {
  calculateValidatedScores as calculateValidatedScoresEdge,
  applyScoreFloors as applyScoreFloorsEdge,
  getDefaultValidation as getDefaultValidationEdge,
} from "../edge-utils"
import { calculateValidatedScores as calculateValidatedScoresNode } from "../scoring/dsa-scoring"
import { calculateBugFixScores } from "../scoring/bugfix-scoring"
import { applyScoreFloors as applyScoreFloorsNode } from "../scoring/score-floors"
import { getDefaultValidation } from "../validation-defaults"
import type { PreScreenResult } from "../types"

function silentPreScreen(candidateMessageCount = 0): PreScreenResult {
  return {
    hasContent: candidateMessageCount > 0,
    candidateMessageCount,
    avgMessageLength: candidateMessageCount > 0 ? 20 : 0,
    hasKeywords: { complexity: false, approach: false, alternatives: false, edgeCases: false },
    suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: false },
  }
}

const silentPerfectSignals: ScoreSignals = {
  testsPassed: 5,
  testsTotal: 5,
  efficiencyScore: 100,
  codeLength: 400,
  hasActualLogic: true,
  approachExplained: false,
  complexityDiscussed: false,
  complexityCorrect: false,
  edgeCasesMentioned: 0,
  questionsAnswered: 0,
  questionsAsked: 0,
  candidateMessageCount: 0,
  hintsUsed: 0,
  hintsTotal: 5,
  aiSuggestionsCopiedBlindly: false,
  testsRanBeforeSubmit: false,
  submittedFromPhase: "testing",
  scenarioType: "dsa",
  difficulty: "medium",
}

describe("assessCommunicationEvidence", () => {
  it("zero messages with nothing explained is none", () => {
    expect(
      assessCommunicationEvidence({
        candidateMessageCount: 0,
        approachExplained: false,
        complexityDiscussed: false,
      })
    ).toBe("none")
  })

  it("a couple of messages without substance is minimal", () => {
    expect(
      assessCommunicationEvidence({
        candidateMessageCount: 3,
        approachExplained: false,
        complexityDiscussed: false,
      })
    ).toBe("minimal")
  })

  it("an explained approach counts as adequate even with few messages", () => {
    expect(
      assessCommunicationEvidence({
        candidateMessageCount: 1,
        approachExplained: true,
        complexityDiscussed: false,
      })
    ).toBe("adequate")
  })

  it("sustained conversation is adequate even without a formal approach statement", () => {
    expect(
      assessCommunicationEvidence({
        candidateMessageCount: 8,
        approachExplained: false,
        complexityDiscussed: false,
      })
    ).toBe("adequate")
  })
})

describe("instant accumulator gates silent sessions", () => {
  it("caps the user-reported silent 5/5 run (was U70/PS80/overall 74)", () => {
    const result = calculateInstantScores(silentPerfectSignals)
    const caps = COMMUNICATION_GATE_CAPS.none
    expect(result.understanding).toBeLessThanOrEqual(caps.understanding)
    expect(result.problemSolving).toBeLessThanOrEqual(caps.problemSolving)
    expect(result.overall).toBeLessThanOrEqual(caps.overall)
    // The code itself stays earned.
    expect(result.codeQuality).toBe(100)
    expect(result.signalsUsed).toContain("commGate:none")
  })

  it("applies the softer minimal caps for a barely-engaged session", () => {
    const result = calculateInstantScores({ ...silentPerfectSignals, candidateMessageCount: 3 })
    const caps = COMMUNICATION_GATE_CAPS.minimal
    expect(result.understanding).toBeLessThanOrEqual(caps.understanding)
    expect(result.problemSolving).toBeLessThanOrEqual(caps.problemSolving)
    expect(result.overall).toBeLessThanOrEqual(caps.overall)
    expect(result.signalsUsed).toContain("commGate:minimal")
  })

  it("leaves communicative sessions ungated", () => {
    const result = calculateInstantScores({
      ...silentPerfectSignals,
      approachExplained: true,
      complexityDiscussed: true,
      complexityCorrect: true,
      candidateMessageCount: 6,
    })
    expect(result.signalsUsed.some((s) => s.startsWith("commGate:"))).toBe(false)
    expect(result.understanding).toBeGreaterThan(COMMUNICATION_GATE_CAPS.none.understanding)
    expect(result.overall).toBeGreaterThan(COMMUNICATION_GATE_CAPS.none.overall)
  })
})

describe("Edge validated path gates silent sessions", () => {
  it("caps a silent perfect solution and floors cannot re-raise it", () => {
    const validation = getDefaultValidationEdge()
    const scores = calculateValidatedScoresEdge(
      100,
      { efficiencyScore: 100 },
      silentPreScreen(0),
      validation,
      "dsa",
      "def solve(): pass"
    )
    const floored = applyScoreFloorsEdge(scores, 100, 100, validation)
    const caps = COMMUNICATION_GATE_CAPS.none
    expect(floored.understanding).toBeLessThanOrEqual(caps.understanding)
    expect(floored.problemSolving).toBeLessThanOrEqual(caps.problemSolving)
    expect(floored.overall).toBeLessThanOrEqual(caps.overall)
    expect(floored.codeQuality).toBeGreaterThanOrEqual(75)
    expect(floored.silentSolution).toBe(true)
  })

  it("keeps the perfect-solution floors when the approach WAS explained", () => {
    const validation = { ...getDefaultValidationEdge(), approachExplained: true }
    const scores = calculateValidatedScoresEdge(
      100,
      { efficiencyScore: 100 },
      silentPreScreen(6),
      validation,
      "dsa",
      "def solve(): pass"
    )
    const floored = applyScoreFloorsEdge(scores, 100, 100, validation)
    expect(floored.overall).toBeGreaterThanOrEqual(70)
    expect(floored.problemSolving).toBeGreaterThanOrEqual(70)
  })
})

describe("Node DSA path gates silent sessions", () => {
  it("caps a silent perfect solution through scoring AND floors", () => {
    const validation = getDefaultValidation()
    const scores = calculateValidatedScoresNode(
      100,
      { efficiencyScore: 100 },
      silentPreScreen(0),
      validation,
      "dsa",
      "def solve(nums):\n    seen = {}\n    for i, n in enumerate(nums):\n        if n in seen:\n            return [seen[n], i]\n        seen[n] = i\n    return []"
    )
    const floored = applyScoreFloorsNode(scores, 100, 100, validation)
    const caps = COMMUNICATION_GATE_CAPS.none
    expect(floored.understanding).toBeLessThanOrEqual(caps.understanding)
    expect(floored.problemSolving).toBeLessThanOrEqual(caps.problemSolving)
    expect(floored.overall).toBeLessThanOrEqual(caps.overall)
    expect(floored.silentSolution).toBe(true)
  })

  it("keeps interview credit when the approach was explained well", () => {
    const validation = {
      ...getDefaultValidation(),
      approachExplained: true,
      approachQuality: "good" as const,
      communicationScore: 70,
    }
    const preScreen: PreScreenResult = {
      ...silentPreScreen(6),
      hasContent: true,
      avgMessageLength: 80,
      hasKeywords: { complexity: true, approach: true, alternatives: false, edgeCases: false },
    }
    const scores = calculateValidatedScoresNode(
      100,
      { efficiencyScore: 100 },
      preScreen,
      validation,
      "dsa",
      "def solve(nums):\n    seen = {}\n    for i, n in enumerate(nums):\n        if n in seen:\n            return [seen[n], i]\n        seen[n] = i\n    return []"
    )
    const floored = applyScoreFloorsNode(scores, 100, 100, validation)
    expect(floored.understanding).toBeGreaterThanOrEqual(70)
    expect(floored.problemSolving).toBeGreaterThanOrEqual(75)
    expect(floored.overall).toBeGreaterThanOrEqual(78)
  })
})

describe("Node bugfix fallback path gates silent sessions", () => {
  it("caps a silent all-tests-passing bugfix run", () => {
    const scores = calculateBugFixScores(100, silentPreScreen(0), getDefaultValidation())
    const caps = COMMUNICATION_GATE_CAPS.none
    expect(scores.understanding).toBeLessThanOrEqual(caps.understanding)
    expect(scores.problemSolving).toBeLessThanOrEqual(caps.problemSolving)
    expect(scores.overall).toBeLessThanOrEqual(caps.overall)
  })
})
