import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("Edge semantic transcript evaluation", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv("GEMINI_API_KEY", "")
    vi.stubEnv("OPENAI_API_KEY", "test-openai-key")
    vi.stubEnv("DEEPSEEK_API_KEY", "")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("uses another configured provider when Gemini is unavailable", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  approachExplained: true,
                  approachQuality: "good",
                  complexityDiscussed: true,
                  complexityAccurate: true,
                  edgeCasesConsidered: false,
                  statedComplexity: "O(n log n)",
                }),
              },
            },
          ],
          usage: { prompt_tokens: 100, completion_tokens: 30 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    )
    vi.stubGlobal("fetch", fetchMock)

    const { validateConversationEdge } = await import("../../ai-providers-edge")
    const result = await validateConversationEdge(
      [
        {
          role: "user",
          content:
            "I will sort, scan, and merge overlaps. That is O(n log n) time and O(n) output space.",
        },
      ],
      "def merge(intervals): return intervals",
      { time: "O(n log n)", space: "O(n)" }
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(result.approachExplained).toBe(true)
    expect(result.complexityDiscussed).toBe(true)
    expect(result.statedComplexity).toBe("O(n log n)")
  })
})
