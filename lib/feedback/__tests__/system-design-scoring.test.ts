import { describe, it, expect } from "vitest"
import { calculateSystemDesignScores } from "../scoring/system-design-scoring"
import { SCORING } from "@/lib/constants"
import type { ConversationValidation, PreScreenResult } from "../types"

// Three substantive non-comment lines, over 100 chars total, so
// isBlankDesignTemplate treats it as real user content.
const FILLED_DESIGN_NOTES = [
  "We shard the user table by user_id across 8 Postgres nodes.",
  "A Redis cache fronts hot reads with a 5 minute TTL to protect the primary.",
  "Kafka carries the write fanout to the feed service for async delivery.",
].join("\n")

function validation(overrides: Partial<ConversationValidation> = {}): ConversationValidation {
  return {
    isCoherent: true,
    responsesRelevant: true,
    approachExplained: true,
    approachQuality: "good",
    complexityDiscussed: false,
    complexityAccurate: false,
    statedComplexity: null,
    questionsAsked: 2,
    questionsAnswered: 2,
    edgeCasesConsidered: true,
    alternativesDiscussed: true,
    communicationScore: 70,
    ...overrides,
  }
}

function preScreen(overrides: Partial<PreScreenResult> = {}): PreScreenResult {
  return {
    hasContent: true,
    candidateMessageCount: 10,
    avgMessageLength: 100,
    hasKeywords: { complexity: false, approach: true, alternatives: true, edgeCases: true },
    suspiciousPatterns: { tooShort: false, possibleGibberish: false, keywordStuffing: false },
    ...overrides,
  }
}

describe("calculateSystemDesignScores", () => {
  it("no conversation and blank design input returns all 5s", () => {
    const result = calculateSystemDesignScores(
      preScreen({ hasContent: false, candidateMessageCount: 0, avgMessageLength: 0 }),
      validation(),
      undefined
    )
    expect(result).toEqual({
      understanding: 5,
      problemSolving: 5,
      codeQuality: 5,
      communication: 5,
      overall: 5,
    })
  })

  it("blank design notes with minimal conversation returns the 10/11 tier", () => {
    const result = calculateSystemDesignScores(
      preScreen({ candidateMessageCount: 2 }),
      validation(),
      undefined
    )
    expect(result).toEqual({
      understanding: 10,
      problemSolving: 10,
      codeQuality: 10,
      communication: 15,
      overall: 11,
    })
  })

  it("blank design notes with real conversation caps everything at 20", () => {
    const result = calculateSystemDesignScores(
      preScreen({ candidateMessageCount: 6, avgMessageLength: 80 }),
      validation(),
      undefined
    )
    expect(result).toEqual({
      understanding: 18,
      problemSolving: 18,
      codeQuality: 10,
      communication: 20,
      overall: 13,
    })
  })

  it("blank-notes overall tracks ungranted flags instead of assuming 18s", () => {
    const result = calculateSystemDesignScores(
      preScreen({ candidateMessageCount: 6, avgMessageLength: 80 }),
      validation({ approachExplained: false, alternativesDiscussed: false }),
      undefined
    )
    expect(result.understanding).toBe(12)
    expect(result.problemSolving).toBe(12)
    // (12 + 12 + 10 + 20) / 5 = 11. The old branch hardcoded the 18s and
    // reported 13, crediting flags this session never earned.
    expect(result.overall).toBe(11)
  })

  it("filled design notes with zero conversation returns the fixed 22-overall tier", () => {
    const result = calculateSystemDesignScores(
      preScreen({ hasContent: false, candidateMessageCount: 0, avgMessageLength: 0 }),
      validation(),
      FILLED_DESIGN_NOTES
    )
    expect(result).toEqual({
      understanding: 25,
      problemSolving: 25,
      codeQuality: 30,
      communication: 10,
      overall: 22,
    })
  })

  it("normal discussion session with good approach and alternatives", () => {
    const result = calculateSystemDesignScores(preScreen(), validation(), FILLED_DESIGN_NOTES)
    expect(result).toEqual({
      understanding: 65,
      problemSolving: 85,
      codeQuality: 70,
      communication: 80,
      overall: 77,
    })
  })

  it("overall composes the subscores with SYSTEM_DESIGN_WEIGHTS", () => {
    const result = calculateSystemDesignScores(preScreen(), validation(), FILLED_DESIGN_NOTES)
    const w = SCORING.SYSTEM_DESIGN_WEIGHTS
    const expected = Math.round(
      result.understanding * w.UNDERSTANDING +
        result.problemSolving * w.PROBLEM_SOLVING +
        result.codeQuality * w.CODE_QUALITY +
        result.communication * w.COMMUNICATION
    )
    expect(result.overall).toBe(expected)
  })

  it("fewer than 3 messages caps communication at 40 even with a high AI score", () => {
    const result = calculateSystemDesignScores(
      preScreen({ candidateMessageCount: 2 }),
      validation({ communicationScore: 90, questionsAsked: 0, questionsAnswered: 0 }),
      FILLED_DESIGN_NOTES
    )
    expect(result.communication).toBe(40)
  })

  it("incoherent session drops every subscore to its penalty floor", () => {
    const result = calculateSystemDesignScores(
      preScreen({ candidateMessageCount: 6 }),
      validation({
        isCoherent: false,
        alternativesDiscussed: false,
        edgeCasesConsidered: false,
        questionsAsked: 0,
        questionsAnswered: 0,
      }),
      FILLED_DESIGN_NOTES
    )
    expect(result).toEqual({
      understanding: 15,
      problemSolving: 15,
      codeQuality: 15,
      communication: 25,
      overall: 18,
    })
  })

  it("relevance cap survives a perfect answer rate", () => {
    const result = calculateSystemDesignScores(
      preScreen({ candidateMessageCount: 8 }),
      validation({
        responsesRelevant: false,
        communicationScore: 90,
        questionsAsked: 3,
        questionsAnswered: 3,
      }),
      FILLED_DESIGN_NOTES
    )
    // Answering every question off-topic previously bought +10 back on the 35 cap.
    expect(result.communication).toBe(35)
  })

  it("irrelevant responses take the penalty path while coherence bonuses still apply", () => {
    const result = calculateSystemDesignScores(
      preScreen({ candidateMessageCount: 8 }),
      validation({
        responsesRelevant: false,
        alternativesDiscussed: false,
        edgeCasesConsidered: false,
        questionsAsked: 0,
        questionsAnswered: 0,
      }),
      FILLED_DESIGN_NOTES
    )
    expect(result).toEqual({
      understanding: 40,
      problemSolving: 15,
      codeQuality: 60,
      communication: 35,
      overall: 35,
    })
  })
})
