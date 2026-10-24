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
  calculateCost: vi.fn(() => 0),
  trackUsageEvent: vi.fn(async () => undefined),
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
  trackUsageEvent: mocks.trackUsageEvent,
  calculateCost: mocks.calculateCost,
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
  startRequestTracking: vi.fn(async () => undefined),
  endRequestTracking: vi.fn(async () => undefined),
  updateTokenCount: vi.fn(),
}))

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

type FetchMock = ReturnType<typeof vi.fn>

describe("generateAIResponse provider-reported token usage", () => {
  it("records OpenAI prompt-cache hits from measured usage", async () => {
    vi.stubEnv("OPENAI_API_KEY", "openai-test-key")
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "reply" } }],
          usage: {
            prompt_tokens: 1000,
            completion_tokens: 20,
            prompt_tokens_details: { cached_tokens: 800 },
          },
        }),
      }))
    )
    const { generateAIResponse } = await import("../ai-providers")
    await generateAIResponse("system", "question", [], {
      service: "interview-chat",
      preferredProvider: "openai-none",
      maxRetries: 1,
    })
    expect(mocks.calculateCost).toHaveBeenCalledWith(
      1000,
      20,
      "openai-none",
      expect.objectContaining({ cachedInputTokens: 800 })
    )
  })

  it("does not retry or fall back after the session aborts a provider request", async () => {
    vi.stubEnv("OPENAI_API_KEY", "openai-test-key")
    const controller = new AbortController()
    const request = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Paused", "AbortError"))
          )
        })
    )
    vi.stubGlobal("fetch", request)
    const { generateAIResponse } = await import("../ai-providers")
    const result = generateAIResponse("system", "question", [], {
      service: "interview-chat",
      preferredProvider: "openai-none",
      abortSignal: controller.signal,
    })
    const rejected = expect(result).rejects.toMatchObject({ name: "AbortError" })
    await vi.waitFor(() => expect(request).toHaveBeenCalledOnce())
    controller.abort()
    await rejected
    expect(mocks.sendMessage).not.toHaveBeenCalled()
    expect(request).toHaveBeenCalledOnce()
  })
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

    const result = await generateAIResponse("system prompt", "user message", [], {
      service: "interview-chat",
    })

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

    const result = await generateAIResponse("system prompt", "user message", [], {
      service: "interview-chat",
    })

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
        usage: {
          prompt_tokens: 300,
          completion_tokens: 80,
          total_tokens: 380,
          prompt_cache_hit_tokens: 240,
        },
      }),
    })
    const { generateAIResponse } = await import("../ai-providers")

    const result = await generateAIResponse("system prompt", "user message", [], {
      service: "interview-chat",
    })

    expect(result.provider).toBe("deepseek-chat")
    expect(result.text).toBe("deepseek reply")
    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(JSON.parse(init?.body as string)).toMatchObject({
      model: "deepseek-flash",
      messages: [
        { role: "system", content: "system prompt" },
        { role: "user", content: "user message" },
      ],
    })
    expect(result.tokensIn).toBe(300)
    expect(result.tokensOut).toBe(80)
    expect(mocks.calculateCost).toHaveBeenCalledWith(
      300,
      80,
      "deepseek-chat",
      expect.objectContaining({ at: expect.any(Date), cachedInputTokens: 240 })
    )
    expect(mocks.trackUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { cachedInputTokens: 240 } })
    )
  })
})

describe("native handoff provider requests", () => {
  const tools = [
    {
      type: "function" as const,
      function: {
        name: "open_sparra",
        description: "Open Sparra",
        parameters: { type: "object", properties: {}, additionalProperties: false },
      },
    },
  ]
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv("OPENAI_API_KEY", "test-openai")
    vi.stubEnv("DEEPSEEK_API_KEY", "test-deepseek")
    vi.stubEnv("GEMINI_API_KEY", "test-gemini")
    vi.stubEnv("ANTHROPIC_API_KEY", "test-anthropic")
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })
  it.each(["openai-none", "deepseek-chat"] as const)(
    "accepts tool-only %s replies and meters their measured tokens",
    async (preferredProvider) => {
      const request = vi.fn(async () => ({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: null,
                tool_calls: [{ function: { name: "open_sparra", arguments: "{}" } }],
              },
            },
          ],
          usage: { prompt_tokens: 80, completion_tokens: 15 },
        }),
      }))
      vi.stubGlobal("fetch", request)
      const { generateAIResponse } = await import("../ai-providers")
      const result = await generateAIResponse("system", "walk through code", [], {
        service: "interview-chat",
        preferredProvider,
        tools,
        maxRetries: 1,
      })
      expect(result.toolCalls).toEqual([{ name: "open_sparra", args: {} }])
      expect(result.tokensIn).toBe(80)
      expect(result.tokensOut).toBe(15)
      expect(mocks.trackUsageEvent).toHaveBeenCalledWith(
        expect.objectContaining({ inputTokens: 80, outputTokens: 15, service: "interview-chat" })
      )
      expect(
        JSON.parse((request.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
      ).toMatchObject({ tools, tool_choice: "auto" })
      expect(request).toHaveBeenCalledOnce()
    }
  )
  it("reads a Gemini function call without requiring text", async () => {
    mocks.sendMessage.mockResolvedValue({
      response: {
        text: () => "",
        functionCalls: () => [{ name: "open_sparra", args: {} }],
        usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 10 },
      },
    })
    const { generateAIResponse } = await import("../ai-providers")
    const result = await generateAIResponse("system", "walk through code", [], {
      service: "interview-chat",
      preferredProvider: "gemini",
      tools,
      maxRetries: 1,
    })
    expect(result.toolCalls).toEqual([{ name: "open_sparra", args: {} }])
    expect(mocks.sendMessage).toHaveBeenCalledOnce()
  })
  it("reads Anthropic tool use after a text block", async () => {
    const request = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        content: [
          { type: "text", text: "Let me open Sparra." },
          { type: "tool_use", name: "open_sparra", input: {} },
        ],
        usage: { input_tokens: 80, output_tokens: 15 },
      }),
    }))
    vi.stubGlobal("fetch", request)
    const { generateAIResponse } = await import("../ai-providers")
    const result = await generateAIResponse("system", "walk through code", [], {
      service: "interview-chat",
      preferredProvider: "claude",
      tools,
      maxRetries: 1,
    })
    expect(result.text).toBe("Let me open Sparra.")
    expect(result.toolCalls).toEqual([{ name: "open_sparra", args: {} }])
    expect(
      JSON.parse((request.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
        .tools[0].input_schema
    ).toEqual(tools[0].function.parameters)
  })
})
