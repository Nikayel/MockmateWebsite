import { beforeEach, describe, expect, it, vi } from "vitest"
import type { GeneratedHint } from "../types"

vi.mock("../llm-generator", () => ({
  generateLLMHint: vi.fn(),
}))

vi.mock("@/lib/rag/context-builder", () => ({
  getContextBuilder: vi.fn(() => ({
    buildHintContext: vi.fn(() => Promise.resolve({ retrievedDocs: [] })),
  })),
}))

vi.mock("@/lib/rag/user-performance-rag", () => ({
  getUserPerformanceRAG: vi.fn(() => ({
    getPerformanceProfile: vi.fn(() => Promise.resolve(null)),
  })),
}))

const baseRequest = {
  userId: "user-1",
  problemId: "two-sum",
  problemTitle: "Two Sum",
  problemText: "Given an array of integers, return indices of the two numbers that add up.",
  problemPattern: "arrays-hashing" as const,
  difficulty: "easy" as const,
  userCode: "function twoSum(nums, target) { return [] }",
  language: "javascript",
  struggleMetrics: {
    timeSpentMinutes: 0,
    codeChanges: 0,
    testsRun: 0,
    testsFailed: 0,
    hintsRevealed: 0,
    lastCodeChangeMinutesAgo: 0,
    errorCount: 0,
  },
}

describe("consolidated hint agent", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { generateLLMHint } = await import("../llm-generator")
    vi.mocked(generateLLMHint).mockResolvedValue(null)
  })

  it("keeps the legacy hint-agent import as a facade over the consolidated module", async () => {
    const consolidated = await import("../index")
    const legacy = await import("../../hint-agent")

    expect(legacy.generateHints).toBe(consolidated.generateHints)
    expect(legacy.getNextHint).toBe(consolidated.getNextHint)
    expect(legacy.getHintAgent).toBe(consolidated.getHintAgent)
    expect(legacy.calculateStruggleLevel).toBe(consolidated.calculateStruggleLevel)
    expect(legacy.getRecommendedRevealLevel).toBe(consolidated.getRecommendedRevealLevel)
  })

  it("still returns pattern fallback hints when LLM and RAG context are unavailable", async () => {
    const { generateHints } = await import("../index")

    const response = await generateHints(baseRequest)

    expect(response.struggleLevel).toBe("none")
    expect(response.recommendedRevealLevel).toBe(1)
    expect(response.metadata.patternKnowledgeUsed).toBe(true)
    expect(response.metadata.ragContextUsed).toBe(false)
    expect(response.metadata.userHistoryUsed).toBe(false)
    expect(response.hints).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 1,
          category: "conceptual",
          title: "Pattern Recognition",
          source: "pattern-knowledge",
        }),
      ])
    )
  })

  it("generates progressive LLM hints up to the recommended reveal level", async () => {
    const { generateLLMHint } = await import("../llm-generator")
    const { generateHints } = await import("../index")

    vi.mocked(generateLLMHint).mockImplementation(async ({ level, category }) => {
      const hint: GeneratedHint = {
        id: `llm-${level}`,
        level,
        category,
        title: `LLM Hint ${level}`,
        content: `Content for level ${level}`,
        isBlurred: true,
        source: "ai",
        relevanceScore: 0.9,
      }

      return hint
    })

    const response = await generateHints({
      ...baseRequest,
      trigger: "test_failed",
      struggleMetrics: {
        ...baseRequest.struggleMetrics,
        timeSpentMinutes: 35,
        testsRun: 5,
        testsFailed: 5,
        lastCodeChangeMinutesAgo: 6,
      },
    })

    expect(response.struggleLevel).toBe("high")
    expect(response.recommendedRevealLevel).toBe(3)
    expect(generateLLMHint).toHaveBeenCalledTimes(4)
    expect(response.hints.map((hint) => hint.id)).toEqual(
      expect.arrayContaining(["llm-1", "llm-2", "llm-3", "llm-4"])
    )
    expect(response.hints.find((hint) => hint.id === "llm-3")?.category).toBe("debugging")
  })

  it("keeps the singleton compatibility API delegating to the consolidated generator", async () => {
    const { getHintAgent } = await import("../index")
    const firstAgent = getHintAgent()
    const secondAgent = getHintAgent()

    expect(firstAgent).toBe(secondAgent)

    const response = await firstAgent.generate(baseRequest)

    expect(response.hints.length).toBeGreaterThan(0)
    expect(response.hints[0]).toEqual(
      expect.objectContaining({
        title: "Pattern Recognition",
        source: "pattern-knowledge",
      })
    )
  })
})
