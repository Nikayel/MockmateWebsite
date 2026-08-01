import { describe, it, expect } from "vitest"
import { calculateBugFixScores } from "../scoring/bugfix-scoring"
import { COMMUNICATION_GATE_CAPS } from "../scoring/communication-gate"
import { SCORING } from "@/lib/constants"
import type { ConversationValidation, PreScreenResult } from "../types"

function validation(overrides: Partial<ConversationValidation> = {}): ConversationValidation {
  return {
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: false,
    approachQuality: "none",
    complexityDiscussed: false,
    complexityAccurate: false,
    statedComplexity: null,
    questionsAsked: 0,
    questionsAnswered: 0,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 30,
    ...overrides,
  }
}

function preScreen(overrides: Partial<PreScreenResult> = {}): PreScreenResult {
  return {
    hasContent: true,
    candidateMessageCount: 8,
    avgMessageLength: 80,
    hasKeywords: { complexity: false, approach: false, alternatives: false, edgeCases: false },
    suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: false },
    ...overrides,
  }
}

describe("calculateBugFixScores", () => {
  it("degenerate session: all tests failed, quiet candidate", () => {
    const result = calculateBugFixScores(0, preScreen(), validation())
    expect(result).toEqual({
      understanding: 20,
      problemSolving: 15,
      codeQuality: 20,
      communication: 30,
      overall: 21,
    })
  })

  it("rich 100% session composes with BUG_FIX_WEIGHTS", () => {
    const result = calculateBugFixScores(
      100,
      preScreen(),
      validation({
        approachExplained: true,
        approachQuality: "good",
        edgeCasesConsidered: true,
        alternativesDiscussed: true,
        questionsAsked: 3,
        questionsAnswered: 3,
        communicationScore: 70,
      })
    )
    expect(result).toEqual({
      understanding: 95,
      problemSolving: 95,
      codeQuality: 100,
      communication: 75,
      overall: 92,
    })
    const w = SCORING.BUG_FIX_WEIGHTS
    const expected = Math.round(
      result.understanding * w.UNDERSTANDING +
        result.problemSolving * w.PROBLEM_SOLVING +
        result.codeQuality * w.CODE_QUALITY +
        result.communication * w.COMMUNICATION
    )
    expect(result.overall).toBe(expected)
  })

  it("silent perfect fix is gate-capped at the none level, codeQuality earned", () => {
    const result = calculateBugFixScores(
      100,
      preScreen({ hasContent: false, candidateMessageCount: 0, avgMessageLength: 0 }),
      validation({ communicationScore: 10 })
    )
    expect(result.understanding).toBe(COMMUNICATION_GATE_CAPS.none.understanding)
    expect(result.problemSolving).toBe(COMMUNICATION_GATE_CAPS.none.problemSolving)
    expect(result.codeQuality).toBe(100)
    expect(result.overall).toBe(47)
    expect(result.overall).toBeLessThanOrEqual(COMMUNICATION_GATE_CAPS.none.overall)
  })

  it("3 throwaway messages hit the minimal gate caps", () => {
    const result = calculateBugFixScores(
      100,
      preScreen({ candidateMessageCount: 3 }),
      validation({ communicationScore: 10 })
    )
    expect(result.understanding).toBe(COMMUNICATION_GATE_CAPS.minimal.understanding)
    expect(result.problemSolving).toBe(COMMUNICATION_GATE_CAPS.minimal.problemSolving)
    expect(result.overall).toBe(56)
    expect(result.overall).toBeLessThanOrEqual(COMMUNICATION_GATE_CAPS.minimal.overall)
  })

  it("incoherent conversation caps communication at 25", () => {
    const result = calculateBugFixScores(
      50,
      preScreen(),
      validation({ isCoherent: false, communicationScore: 60 })
    )
    expect(result.communication).toBe(25)
  })

  it("answer rate >= 0.7 grants the +5 communication bonus", () => {
    const base = validation({ communicationScore: 70, questionsAsked: 3 })
    const withBonus = calculateBugFixScores(80, preScreen(), { ...base, questionsAnswered: 3 })
    const withoutBonus = calculateBugFixScores(80, preScreen(), { ...base, questionsAnswered: 2 })
    expect(withBonus.communication).toBe(75)
    expect(withoutBonus.communication).toBe(70)
  })

  it("understanding maps pass-rate bands: +10 mid band, +15 floor band, capped 85 top band", () => {
    expect(calculateBugFixScores(60, preScreen(), validation()).understanding).toBe(70)
    expect(calculateBugFixScores(30, preScreen(), validation()).understanding).toBe(45)
    expect(calculateBugFixScores(85, preScreen(), validation()).understanding).toBe(85)
  })

  it("codeQuality is passRate * 0.8 + 20, capped at 100", () => {
    expect(calculateBugFixScores(50, preScreen(), validation()).codeQuality).toBe(60)
    expect(calculateBugFixScores(100, preScreen(), validation()).codeQuality).toBe(100)
  })
})
