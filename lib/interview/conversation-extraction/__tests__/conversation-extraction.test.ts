import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ConversationTracker } from "@/lib/interview/interview-phases"

const mocks = vi.hoisted(() => ({
  generateAIResponse: vi.fn(),
}))

vi.mock("@/lib/ai-providers", () => ({
  generateAIResponse: mocks.generateAIResponse,
}))

function createTracker(overrides: Partial<ConversationTracker> = {}): ConversationTracker {
  return {
    approachExplained: false,
    approachType: "none",
    timeComplexityMentioned: false,
    timeComplexityValue: null,
    spaceComplexityMentioned: false,
    spaceComplexityValue: null,
    complexityExplanationGiven: false,
    edgeCasesMentioned: [],
    edgeCasesAskedByInterviewer: [],
    hasStartedCoding: false,
    hasRunTests: false,
    wasAskedToOptimize: false,
    didOptimize: false,
    bugsMade: 0,
    bugsSelfCorrected: 0,
    hintsGiven: 0,
    silentNotes: [],
    ...overrides,
  }
}

const validExtraction = {
  approachExplained: true,
  approachType: "optimized",
  approachQuality: "specific",
  timeComplexityMentioned: true,
  timeComplexityValue: "O(n)",
  dominantComplexity: "O(n)",
  spaceComplexityMentioned: true,
  spaceComplexityValue: "O(n)",
  complexityExplanationGiven: true,
  complexityIsAccurate: true,
  edgeCasesMentioned: ["empty array"],
  clarifyingQuestionsAsked: true,
  answeredInterviewerQuestions: 2,
}

describe("conversation extraction", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses repaired structured JSON instead of silently falling back", async () => {
    mocks.generateAIResponse
      .mockResolvedValueOnce({
        text: "The candidate explained a hash map approach.",
        provider: "gemini",
        latencyMs: 10,
        tokensUsed: 20,
      })
      .mockResolvedValueOnce({
        text: JSON.stringify(validExtraction),
        provider: "gemini",
        latencyMs: 12,
        tokensUsed: 25,
      })

    const { extractConversationState } = await import("../index")

    const updates = await extractConversationState(
      [
        {
          role: "candidate",
          content: "I would use a hash map and scan once. That gives O(n) time and O(n) space.",
        },
      ],
      createTracker()
    )

    expect(updates).toEqual(
      expect.objectContaining({
        approachExplained: true,
        approachType: "optimized",
        approachQuality: "specific",
        timeComplexityMentioned: true,
        timeComplexityValue: "O(n)",
        edgeCasesMentioned: ["empty array"],
      })
    )
    expect(mocks.generateAIResponse).toHaveBeenCalledTimes(2)
  })

  it("can correct deterministic false positives by mapping explicit false values", async () => {
    const { mapExtractionToTrackerUpdates } = await import("../index")

    const updates = mapExtractionToTrackerUpdates(
      {
        ...validExtraction,
        approachExplained: false,
        approachType: "none",
        approachQuality: "none",
        timeComplexityMentioned: false,
        timeComplexityValue: null,
        dominantComplexity: null,
        spaceComplexityMentioned: false,
        spaceComplexityValue: null,
        complexityExplanationGiven: false,
        complexityIsAccurate: null,
        edgeCasesMentioned: [],
        clarifyingQuestionsAsked: false,
        answeredInterviewerQuestions: 0,
      },
      createTracker({
        approachExplained: true,
        approachType: "optimized",
        timeComplexityMentioned: true,
        timeComplexityValue: "O(n)",
      })
    )

    expect(updates).toEqual(
      expect.objectContaining({
        approachExplained: false,
        approachType: "none",
        timeComplexityMentioned: false,
        timeComplexityValue: null,
      })
    )
  })

  it("adds silent notes when the candidate claims impossible complexity", async () => {
    const { mapExtractionToTrackerUpdates } = await import("../index")

    const updates = mapExtractionToTrackerUpdates(
      {
        ...validExtraction,
        timeComplexityValue: "O(1)",
        dominantComplexity: "O(1)",
        complexityIsAccurate: false,
      },
      createTracker(),
      {
        optimalTimeComplexity: "O(n)",
        optimalSpaceComplexity: "O(n)",
      }
    )

    expect(updates.silentNotes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "wrong_complexity",
          context: "time complexity",
          correct: "Time complexity is O(n)",
        }),
      ])
    )
  })

  it("schedules extraction on key semantic signals or periodic message intervals", async () => {
    const { shouldRunExtraction } = await import("../index")

    expect(shouldRunExtraction(2, 0, "I think this is linear time")).toBe(true)
    expect(shouldRunExtraction(2, 0, "ok")).toBe(false)
    expect(shouldRunExtraction(3, 0, "ok")).toBe(true)
    expect(shouldRunExtraction(5, 0, "ok")).toBe(true)
  })
})
