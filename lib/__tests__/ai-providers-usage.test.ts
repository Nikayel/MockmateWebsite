import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * generateAIResponse must surface provider-REPORTED token usage as
 * tokensIn/tokensOut (Gemini usageMetadata, OpenAI-compatible usage) and OMIT
 * both fields when the provider returns none — downstream analytics events
 * treat these as measured values, never estimates. tokensUsed keeps the legacy
 * 4-chars-per-token estimate for the cost pipeline.
 */

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
}))

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { startChat: () => ({ sendMessage: mocks.sendMessage }) }
    }
  },
}))

vi.mock("../ai-cache", () => ({
  generateCacheKey: vi.fn(() => "cache-key"),
  getCachedResponse: vi.fn(async () => ({ hit: false })),
  setCachedResponse: vi.fn(async () => undefined),
}))

vi.mock("../usage-tracking", () => ({
  trackUsageEvent: vi.fn(async () => undefined),
  calculateCost: vi.fn(() => 0),
  PROVIDER_COSTS: {},
}))

vi.mock("../global-spend-guard", () => ({
  recordGlobalSpend: vi.fn(async () => undefined),
}))

vi.mock("../cost-anomaly-detection", () => ({
  checkRequestCostAnomaly: vi.fn(async () => undefined),
}))

vi.mock("../rate-limiter", () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: true })),
  recordRequestStart: vi.fn(),
  recordRequestEnd: vi.fn(),
  updateTokenCount: vi.fn(),
}))

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type FetchMock = ReturnType<typeof vi.fn>

describe("generateAIResponse provider-reported token usage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv("GEMINI_API_KEY", "gemini-test-key")
    vi.stubEnv("DEEPSEEK_API_KEY", "deepseek-test-key")
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("surfaces Gemini usageMetadata as tokensIn/tokensOut", async () => {
    mocks.sendMessage.mockResolvedValue({
      response: {
        text: () => "gemini reply",
        usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 45, totalTokenCount: 165 },
      },
    })
    const { generateAIResponse } = await import("../ai-providers")

    const result = await generateAIResponse("system prompt", "user message")

    expect(result.provider).toBe("gemini")
    expect(result.text).toBe("gemini reply")
    expect(result.tokensIn).toBe(120)
    expect(result.tokensOut).toBe(45)
    // Legacy estimate is untouched by the measured fields.
    expect(result.tokensUsed).toBeGreaterThan(0)
  })

  it("omits tokensIn/tokensOut entirely when Gemini returns no usageMetadata", async () => {
    mocks.sendMessage.mockResolvedValue({
      response: { text: () => "no usage attached" },
    })
    const { generateAIResponse } = await import("../ai-providers")

    const result = await generateAIResponse("system prompt", "user message")

    expect(result.text).toBe("no usage attached")
    expect("tokensIn" in result).toBe(false)
    expect("tokensOut" in result).toBe(false)
  })

  it("surfaces OpenAI-compatible usage from the DeepSeek fallback", async () => {
    // Non-retryable, non-quota Gemini failure -> immediate provider fallback.
    mocks.sendMessage.mockRejectedValue({ status: 400, message: "bad request" })
    ;(fetch as unknown as FetchMock).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "deepseek reply" } }],
        usage: { prompt_tokens: 300, completion_tokens: 80, total_tokens: 380 },
      }),
    })
    const { generateAIResponse } = await import("../ai-providers")

    const result = await generateAIResponse("system prompt", "user message")

    expect(result.provider).toBe("deepseek-chat")
    expect(result.text).toBe("deepseek reply")
    expect(result.tokensIn).toBe(300)
    expect(result.tokensOut).toBe(80)
  })
})
