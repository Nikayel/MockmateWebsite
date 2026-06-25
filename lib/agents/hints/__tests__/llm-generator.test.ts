import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/ai-providers", () => ({
  generateAIResponse: vi.fn(),
}))

vi.mock("../code-analyzer", () => ({
  generateHintId: vi.fn(),
}))

const baseBatchRequest = {
  problemTitle: "Two Sum",
  problemText: "Given nums and target, return indices of the two values that add up.",
  problemPattern: "arrays-hashing" as const,
  difficulty: "easy" as const,
  userCode: "function twoSum(nums, target) { return [] }",
  language: "javascript",
  trigger: "manual" as const,
  struggleLevel: "moderate" as const,
  userId: "user-1",
}

describe("LLM hint generation", () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { generateAIResponse } = await import("@/lib/ai-providers")
    const { generateHintId } = await import("../code-analyzer")

    vi.mocked(generateAIResponse).mockResolvedValue({
      text: JSON.stringify({ hints: [] }),
      provider: "gemini-lite",
      latencyMs: 1,
    })
    vi.mocked(generateHintId).mockImplementation(() => "hint-id")
  })

  it("generates requested progressive hints with one AI call", async () => {
    const { generateAIResponse } = await import("@/lib/ai-providers")
    const { generateHintId } = await import("../code-analyzer")
    const { generateLLMHintsForLevels } = await import("../llm-generator")

    vi.mocked(generateHintId)
      .mockReturnValueOnce("hint-1")
      .mockReturnValueOnce("hint-2")
      .mockReturnValueOnce("hint-3")

    vi.mocked(generateAIResponse).mockResolvedValue({
      text: `\`\`\`json
{
  "hints": [
    { "level": 1, "title": "Look Back", "content": "What value would complete nums[i]?" },
    { "level": 2, "title": "Use Hashing", "content": "A map can store complements." },
    { "level": 3, "title": "Trace Failure", "content": "Your return [] path means no pair is ever returned." }
  ]
}
\`\`\``,
      provider: "gemini-lite",
      latencyMs: 1,
    })

    const hints = await generateLLMHintsForLevels({
      ...baseBatchRequest,
      levels: [
        { level: 1, category: "conceptual" },
        { level: 2, category: "conceptual" },
        { level: 3, category: "debugging" },
      ],
    })

    expect(generateAIResponse).toHaveBeenCalledTimes(1)
    expect(generateAIResponse).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("BATCH REQUEST"),
      [],
      expect.objectContaining({
        complexity: "simple",
        eventType: "hint_request",
        userId: "user-1",
      })
    )
    expect(hints).toEqual([
      expect.objectContaining({
        id: "hint-1",
        level: 1,
        category: "conceptual",
        title: "Look Back",
        source: "ai",
      }),
      expect.objectContaining({
        id: "hint-2",
        level: 2,
        category: "conceptual",
        title: "Use Hashing",
      }),
      expect.objectContaining({
        id: "hint-3",
        level: 3,
        category: "debugging",
        title: "Trace Failure",
      }),
    ])
  })

  it("drops unrequested or malformed hints from a batch response", async () => {
    const { generateAIResponse } = await import("@/lib/ai-providers")
    const { generateLLMHintsForLevels } = await import("../llm-generator")

    vi.mocked(generateAIResponse).mockResolvedValue({
      text: JSON.stringify({
        hints: [
          { level: 1, title: "Valid", content: "Valid hint" },
          { level: 4, title: "Too Far", content: "Not requested" },
          { level: 2, title: "Missing content" },
        ],
      }),
      provider: "gemini-lite",
      latencyMs: 1,
    })

    const hints = await generateLLMHintsForLevels({
      ...baseBatchRequest,
      levels: [{ level: 1, category: "conceptual" }],
    })

    expect(hints).toHaveLength(1)
    expect(hints[0]).toEqual(
      expect.objectContaining({
        level: 1,
        title: "Valid",
        content: "Valid hint",
      })
    )
  })

  it("returns no hints when the batch response is not parseable", async () => {
    const { generateAIResponse } = await import("@/lib/ai-providers")
    const { generateLLMHintsForLevels } = await import("../llm-generator")

    vi.mocked(generateAIResponse).mockResolvedValue({
      text: "Here are some hints, but not JSON.",
      provider: "gemini-lite",
      latencyMs: 1,
    })

    const hints = await generateLLMHintsForLevels({
      ...baseBatchRequest,
      levels: [{ level: 1, category: "conceptual" }],
    })

    expect(hints).toEqual([])
  })

  it("keeps the legacy multi-hint API on the batch path", async () => {
    const { generateAIResponse } = await import("@/lib/ai-providers")
    const { generateLLMHints } = await import("../llm-generator")

    vi.mocked(generateAIResponse).mockResolvedValue({
      text: JSON.stringify({
        hints: [
          { level: 1, title: "One", content: "First" },
          { level: 2, title: "Two", content: "Second" },
        ],
      }),
      provider: "gemini-lite",
      latencyMs: 1,
    })

    const hints = await generateLLMHints(
      {
        ...baseBatchRequest,
        category: "approach",
      },
      2
    )

    expect(generateAIResponse).toHaveBeenCalledTimes(1)
    expect(vi.mocked(generateAIResponse).mock.calls[0][1]).toContain("- Level 1: approach")
    expect(vi.mocked(generateAIResponse).mock.calls[0][1]).toContain("- Level 2: approach")
    expect(hints.map((hint) => hint.level)).toEqual([1, 2])
  })
})
