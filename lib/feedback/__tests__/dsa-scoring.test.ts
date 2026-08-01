import { describe, it, expect } from "vitest"
import { calculateValidatedScores } from "../scoring/dsa-scoring"
import { COMMUNICATION_GATE_CAPS } from "../scoring/communication-gate"
import type { ExtractedEvidence } from "../structured-extraction"
import type { ConversationValidation, PreScreenResult } from "../types"

// Evidence that a stuffed transcript could plausibly produce: real quotes for
// approach and complexity, which is what trips the evidence floor.
function evidence(): ExtractedEvidence {
  return {
    approach: {
      explained: true,
      type: "optimized",
      quote: "I will use a hash map for lookups",
      messageIndex: 1,
    },
    timeComplexity: {
      mentioned: true,
      value: "O(n)",
      explanationGiven: true,
      quote: "that gives O(n) time",
      messageIndex: 2,
      isCorrect: true,
    },
    spaceComplexity: {
      mentioned: false,
      value: null,
      quote: null,
      messageIndex: null,
      isCorrect: null,
    },
    edgeCases: { mentionedByCandidate: [], mentionedAfterPrompt: [], missedCritical: [] },
    progression: {
      startedWithBruteForce: false,
      improvedAfterPrompt: false,
      selfCorrectedBugs: false,
      bugQuotes: [],
    },
    interviewerQuestions: [],
    communication: {
      explainedWhileCoding: true,
      askedClarifyingQuestions: false,
      respondedToFeedback: false,
      quotes: ["I will use a hash map for lookups"],
    },
    hints: { totalGiven: 0, usedEffectively: false, copiedBlindly: false },
  }
}

// Real logic (for-in loop) so completeness analysis never flags it.
const WORKING_CODE =
  "def solve(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total"

// Base case plus `pass`: stub pattern, no algorithm logic.
const STUB_CODE = "def solve(root):\n    if root is None:\n        return None\n    pass"

function validation(overrides: Partial<ConversationValidation> = {}): ConversationValidation {
  return {
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: true,
    approachQuality: "good",
    complexityDiscussed: true,
    complexityAccurate: true,
    statedComplexity: "O(n)",
    questionsAsked: 2,
    questionsAnswered: 2,
    edgeCasesConsidered: false,
    alternativesDiscussed: false,
    communicationScore: 70,
    ...overrides,
  }
}

function silentValidation(communicationScore = 10): ConversationValidation {
  return validation({
    approachExplained: false,
    approachQuality: "none",
    complexityDiscussed: false,
    complexityAccurate: false,
    questionsAsked: 0,
    questionsAnswered: 0,
    communicationScore,
  })
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

describe("calculateValidatedScores (DSA)", () => {
  it("0% pass rate lands at the floor tier", () => {
    // Chatty enough to stay at the adequate gate level, but no approach or
    // complexity talk, so communication collapses to the 10-point else branch.
    const result = calculateValidatedScores(
      0,
      undefined,
      preScreen(),
      silentValidation(30),
      "dsa",
      WORKING_CODE
    )
    expect(result).toEqual({
      understanding: 20,
      problemSolving: 20,
      codeQuality: 25,
      communication: 10,
      overall: 18,
    })
  })

  it("100% pass with rich communication scores high across the board", () => {
    const result = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      preScreen(),
      validation(),
      "dsa",
      WORKING_CODE
    )
    expect(result).toEqual({
      understanding: 98,
      problemSolving: 96,
      codeQuality: 87,
      communication: 87,
      overall: 92,
    })
  })

  it("100% pass silent session is gate-capped, codeQuality stays earned", () => {
    const result = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      preScreen({ hasContent: false, candidateMessageCount: 0, avgMessageLength: 0 }),
      silentValidation(10),
      "dsa",
      WORKING_CODE
    )
    expect(result.understanding).toBe(COMMUNICATION_GATE_CAPS.none.understanding)
    expect(result.problemSolving).toBe(COMMUNICATION_GATE_CAPS.none.problemSolving)
    expect(result.codeQuality).toBe(87)
    expect(result.communication).toBe(10)
    expect(result.overall).toBe(42)
    expect(result.overall).toBeLessThanOrEqual(COMMUNICATION_GATE_CAPS.none.overall)
  })

  it("a genuine communicationScore of 0 flows through, not rewritten to 10", () => {
    const result = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      preScreen(),
      silentValidation(0),
      "dsa",
      WORKING_CODE
    )
    expect(result.communication).toBe(0)
  })

  it("only non-finite communicationScore gets the default of 10", () => {
    const result = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      preScreen(),
      silentValidation(Number.NaN),
      "dsa",
      WORKING_CODE
    )
    expect(result.communication).toBe(10)
  })

  it("incomplete stub solution caps subscores at 25 and overall at 28", () => {
    const result = calculateValidatedScores(
      20,
      undefined,
      preScreen(),
      validation({ complexityDiscussed: false, complexityAccurate: false, questionsAsked: 0, questionsAnswered: 0 }),
      "dsa",
      STUB_CODE
    )
    expect(result.understanding).toBe(25)
    expect(result.problemSolving).toBe(25)
    expect(result.codeQuality).toBe(25)
    expect(result.communication).toBe(70)
    expect(result.overall).toBe(28)
  })

  it("whitespace-only code counts as incomplete", () => {
    const result = calculateValidatedScores(
      0,
      undefined,
      preScreen(),
      validation({ complexityDiscussed: false, complexityAccurate: false, questionsAsked: 0, questionsAnswered: 0 }),
      "dsa",
      "   "
    )
    expect(result.understanding).toBeLessThanOrEqual(25)
    expect(result.problemSolving).toBeLessThanOrEqual(25)
    expect(result.codeQuality).toBeLessThanOrEqual(25)
    expect(result.overall).toBe(28)
  })

  it("empty-string and undefined code count as incomplete even with a perfect pass rate", () => {
    for (const code of ["", undefined] as const) {
      const result = calculateValidatedScores(
        100,
        { efficiencyScore: 90 },
        preScreen(),
        validation(),
        "dsa",
        code
      )
      expect(result.understanding).toBeLessThanOrEqual(25)
      expect(result.problemSolving).toBeLessThanOrEqual(25)
      expect(result.codeQuality).toBeLessThanOrEqual(25)
      expect(result.overall).toBeLessThanOrEqual(28)
    }
  })

  it("answer rate >= 0.8 grants the +5 communication bonus", () => {
    const base = validation({
      complexityDiscussed: false,
      complexityAccurate: false,
      communicationScore: 60,
      questionsAsked: 5,
    })
    const withBonus = calculateValidatedScores(
      100,
      undefined,
      preScreen(),
      { ...base, questionsAnswered: 4 },
      "dsa",
      WORKING_CODE
    )
    const withoutBonus = calculateValidatedScores(
      100,
      undefined,
      preScreen(),
      { ...base, questionsAnswered: 1 },
      "dsa",
      WORKING_CODE
    )
    expect(withBonus.communication).toBe(77)
    expect(withoutBonus.communication).toBe(72)
  })

  it("keywordStuffing does not affect the score at all", () => {
    // The detector requires under 30 words across the whole transcript, so it
    // fires on concise honest candidates and never on the long keyword-salad
    // transcripts it is named for. It is no longer consulted here: a flagged
    // session must score identically to an unflagged one.
    const val = validation({
      approachExplained: true,
      approachQuality: "good",
      communicationScore: 80,
      questionsAsked: 0,
      questionsAnswered: 0,
    })
    const stuffedFlag = preScreen({
      suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: true },
    })
    const flagged = calculateValidatedScores(100, undefined, stuffedFlag, val, "dsa", WORKING_CODE)
    const unflagged = calculateValidatedScores(100, undefined, preScreen(), val, "dsa", WORKING_CODE)
    expect(flagged).toEqual(unflagged)
  })

  it("keywordStuffing does not affect the score with extracted evidence either", () => {
    const val = validation({
      approachExplained: false,
      approachQuality: "none",
      communicationScore: 80,
      questionsAsked: 0,
      questionsAnswered: 0,
    })
    const flagged = calculateValidatedScores(
      100,
      undefined,
      preScreen({
        suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: true },
      }),
      val,
      "dsa",
      WORKING_CODE,
      evidence()
    )
    const unflagged = calculateValidatedScores(
      100,
      undefined,
      preScreen(),
      val,
      "dsa",
      WORKING_CODE,
      evidence()
    )
    expect(flagged).toEqual(unflagged)
  })

  it("relevance cap holds against the approach-bonus lift path", () => {
    // The approach-quality bonus runs after the if/else chain and breached
    // the 45 cap from inside this function (45 + 12 = 57).
    const result = calculateValidatedScores(
      100,
      { efficiencyScore: 90 },
      preScreen(),
      validation({
        responsesRelevant: false,
        approachExplained: true,
        approachQuality: "good",
        communicationScore: 80,
      }),
      "dsa",
      WORKING_CODE
    )
    expect(result.communication).toBeLessThanOrEqual(45)
  })

  it("incoherent session caps communication at 25", () => {
    const result = calculateValidatedScores(
      50,
      undefined,
      preScreen(),
      validation({ isCoherent: false }),
      "dsa",
      WORKING_CODE
    )
    expect(result.communication).toBe(25)
  })
})
