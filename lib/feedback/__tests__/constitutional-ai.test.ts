/**
 * Tests for Constitutional AI critique functions.
 *
 * critiqueScores' AI call is mocked; these pin the untrusted-JSON handling:
 * component coercion/clamping, discard-on-garbage, and the rule that the
 * model's `overall` is never trusted — it is always recomputed from the
 * components with scenario-correct weights.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/ai-providers", () => ({
  generateAIResponse: vi.fn(),
}))
vi.mock("@/lib/scoring/analytics-persistence", () => ({
  persistConstitutionalAIIntervention: vi.fn().mockResolvedValue(undefined),
}))

import { critiqueScores } from "../constitutional-ai"
import { generateAIResponse } from "@/lib/ai-providers"
import { SCORING } from "@/lib/constants"
import type { ExtractedEvidence } from "../structured-extraction"
import type { ConversationValidation, ScoreResult } from "../types"

const mockGenerateAIResponse = vi.mocked(generateAIResponse)

function aiValidation(overrides: Partial<ConversationValidation> = {}): ConversationValidation {
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

const originalScores: ScoreResult = {
  understanding: 60,
  problemSolving: 60,
  codeQuality: 60,
  communication: 60,
  overall: 60,
}

function mockCritiqueResponse(payload: Record<string, unknown>) {
  mockGenerateAIResponse.mockResolvedValue({
    text: JSON.stringify(payload),
  } as Awaited<ReturnType<typeof generateAIResponse>>)
}

function critiqueContext(scenarioType = "dsa") {
  return {
    passRate: 80,
    scenarioType,
    aiValidation: aiValidation(),
  }
}

describe("critiqueScores adjustedScores handling", () => {
  beforeEach(() => {
    mockGenerateAIResponse.mockReset()
  })

  it("keeps an adjustment whose overall is missing, recomputing it from components", async () => {
    mockCritiqueResponse({
      critiques: [],
      adjustedScores: { understanding: 80, problemSolving: 70, codeQuality: 75, communication: 65 },
      reasoning: "test",
      madeChanges: true,
    })
    const result = await critiqueScores(originalScores, critiqueContext("dsa"))
    expect(result.madeChanges).toBe(true)
    const w = SCORING.PERFORMANCE_WEIGHTS
    const expected = Math.round(
      80 * w.UNDERSTANDING + 70 * w.PROBLEM_SOLVING + 75 * w.CODE_QUALITY + 65 * w.COMMUNICATION
    )
    expect(result.adjustedScores?.overall).toBe(expected)
  })

  it("never trusts the model's overall, even when present", async () => {
    mockCritiqueResponse({
      critiques: [],
      adjustedScores: {
        understanding: 60,
        problemSolving: 60,
        codeQuality: 60,
        communication: 60,
        overall: 100,
      },
      reasoning: "test",
      madeChanges: true,
    })
    const result = await critiqueScores(originalScores, critiqueContext("dsa"))
    expect(result.adjustedScores?.overall).toBe(60)
  })

  it("recomputes overall with scenario weights for bugfix sessions", async () => {
    mockCritiqueResponse({
      critiques: [],
      adjustedScores: {
        understanding: 90,
        problemSolving: 70,
        codeQuality: 95,
        communication: 40,
      },
      reasoning: "test",
      madeChanges: true,
    })
    const result = await critiqueScores(originalScores, critiqueContext("bugfix"))
    // U90/PS70/CQ95/C40 with BUG_FIX_WEIGHTS is 76; DSA weights would give 71.
    expect(result.adjustedScores?.overall).toBe(76)
  })

  it("clamps out-of-range components and coerces numeric strings", async () => {
    mockCritiqueResponse({
      critiques: [],
      adjustedScores: {
        understanding: 150,
        problemSolving: -20,
        codeQuality: "85",
        communication: 70,
        overall: 999,
      },
      reasoning: "test",
      madeChanges: true,
    })
    const result = await critiqueScores(originalScores, critiqueContext("dsa"))
    expect(result.adjustedScores?.understanding).toBe(100)
    expect(result.adjustedScores?.problemSolving).toBe(0)
    expect(result.adjustedScores?.codeQuality).toBe(85)
    expect(result.adjustedScores?.overall).toBeLessThanOrEqual(100)
  })

  it("discards the whole adjustment when a component is non-numeric", async () => {
    mockCritiqueResponse({
      critiques: [],
      adjustedScores: {
        understanding: "excellent",
        problemSolving: 70,
        codeQuality: 75,
        communication: 65,
        overall: 80,
      },
      reasoning: "test",
      madeChanges: true,
    })
    const result = await critiqueScores(originalScores, critiqueContext("dsa"))
    expect(result.madeChanges).toBe(false)
    expect(result.adjustedScores).toBeUndefined()
  })

  it("returns no changes when the AI call fails", async () => {
    mockGenerateAIResponse.mockRejectedValue(new Error("provider down"))
    const result = await critiqueScores(originalScores, critiqueContext("dsa"))
    expect(result.madeChanges).toBe(false)
    expect(result.adjustedScores).toBeUndefined()
  })
})


/**
 * The evidence floor hard-sets communication to 50-80 whenever the transcript
 * yields any communication / approach / complexity quote. A keyword-stuffed or
 * incoherent transcript produces exactly those quotes, so it must be withheld
 * when an integrity signal fires. This was the one live-in-production fix of
 * the wave and shipped without a test.
 */
function evidenceWithQuotes(): ExtractedEvidence {
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

// A low starting communication so the floor has something to lift.
const LOW_COMM_SCORES: ScoreResult = { ...originalScores, communication: 20 }

describe("critiqueScores evidence floor integrity guard", () => {
  beforeEach(() => {
    mockGenerateAIResponse.mockReset()
    // No adjustment from the model: isolate the evidence-floor path.
    mockCritiqueResponse({ critiques: [], reasoning: "fine", madeChanges: false })
  })

  function contextWith(
    overrides: Partial<ConversationValidation>,
    keywordStuffing = false
  ) {
    return {
      passRate: 100,
      scenarioType: "dsa",
      aiValidation: aiValidation(overrides),
      keywordStuffing,
      extractedEvidence: evidenceWithQuotes(),
    }
  }

  it("applies the floor for a clean session with quotes", () => {
    return critiqueScores(LOW_COMM_SCORES, contextWith({})).then((result) => {
      expect(result.madeChanges).toBe(true)
      expect(result.adjustedScores?.communication).toBeGreaterThanOrEqual(50)
    })
  })

  it("withholds the floor when the transcript is incoherent", async () => {
    const result = await critiqueScores(LOW_COMM_SCORES, contextWith({ isCoherent: false }))
    expect(result.adjustedScores?.communication).toBeUndefined()
    expect(result.madeChanges).toBe(false)
  })

  it("withholds the floor when responses are irrelevant", async () => {
    const result = await critiqueScores(LOW_COMM_SCORES, contextWith({ responsesRelevant: false }))
    expect(result.adjustedScores?.communication).toBeUndefined()
    expect(result.madeChanges).toBe(false)
  })

  it("keyword stuffing no longer withholds the floor", async () => {
    // The brevity detector no longer reaches scoring, so a flagged-but-clean
    // session keeps the floor it earned.
    const result = await critiqueScores(LOW_COMM_SCORES, contextWith({}, true))
    expect(result.adjustedScores?.communication).toBeGreaterThanOrEqual(50)
  })
})

describe("Feedback Text Critique", () => {
  it.todo("should detect harsh tone")
  it.todo("should detect factual errors")
  it.todo("should detect vague guidance")
  it.todo("should suggest revisions when needed")
})
