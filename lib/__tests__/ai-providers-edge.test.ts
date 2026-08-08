import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

/**
 * The Edge chain: OpenAI -> DeepSeek -> Gemini.
 *
 * This runtime has no other fallback path, so the properties worth pinning are
 * the ORDER, that an unconfigured vendor is skipped rather than treated as a
 * failure, and that a total outage reports every vendor's reason rather than
 * only the last one.
 *
 * The order must match FALLBACK_ORDER.complex in lib/ai-providers.ts. Both
 * serve feedback generation, and if they disagree the same user action is
 * scored by a different model depending on which runtime happened to serve it.
 */

const mocks = vi.hoisted(() => ({
  generateContent: vi.fn(),
}))

vi.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return { generateContent: mocks.generateContent }
    }
  },
}))

type FetchMock = ReturnType<typeof vi.fn>

/** Route a mocked fetch by host so a test can fail one vendor and pass another. */
function mockFetchByHost(handlers: { openai?: () => unknown; deepseek?: () => unknown }) {
  ;(fetch as unknown as FetchMock).mockImplementation(async (url: string) => {
    if (url.includes("api.openai.com")) {
      if (!handlers.openai) throw new Error("unexpected OpenAI call")
      return handlers.openai()
    }
    if (url.includes("api.deepseek.com")) {
      if (!handlers.deepseek) throw new Error("unexpected DeepSeek call")
      return handlers.deepseek()
    }
    throw new Error(`unexpected host: ${url}`)
  })
}

const okBody = (content: string) => ({
  ok: true,
  json: async () => ({ choices: [{ message: { content } }] }),
})

describe("ai-providers-edge OpenAI -> DeepSeek -> Gemini chain", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv("OPENAI_API_KEY", "openai-test-key")
    vi.stubEnv("GEMINI_API_KEY", "gemini-test-key")
    vi.stubEnv("DEEPSEEK_API_KEY", "deepseek-test-key")
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("uses OpenAI first and touches nothing else when it succeeds", async () => {
    mockFetchByHost({ openai: () => okBody("luna says hi") })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    const result = await generateAIResponseEdge("sys", "user")

    expect(result.provider).toBe("openai")
    expect(result.text).toBe("luna says hi")
    expect(mocks.generateContent).not.toHaveBeenCalled()
    expect((fetch as unknown as FetchMock).mock.calls).toHaveLength(1)
  })

  it("sends an explicit reasoning_effort, because the API default is medium", async () => {
    // Omitting the parameter would silently pick `medium`, a different model
    // behaviour than the Node path chose for this same capability.
    mockFetchByHost({ openai: () => okBody("ok") })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    await generateAIResponseEdge("sys prompt", "user msg")

    const [url, init] = (fetch as unknown as FetchMock).mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string> },
    ]
    expect(url).toContain("api.openai.com")
    const body = JSON.parse(init.body)
    expect(body.reasoning_effort).toBe("high")
    expect(body.model).toBe("gpt-5.6-luna")
    expect(body.messages[0]).toEqual({ role: "system", content: "sys prompt" })
    expect(body.messages[1]).toEqual({ role: "user", content: "user msg" })
    expect(init.headers.Authorization).toBe("Bearer openai-test-key")
  })

  it("falls back to DeepSeek V4 Pro when OpenAI fails", async () => {
    mockFetchByHost({
      openai: () => ({ ok: false, status: 503 }),
      deepseek: () => okBody("deepseek here"),
    })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    const result = await generateAIResponseEdge("sys", "user")

    expect(result.provider).toBe("deepseek")
    expect(result.text).toBe("deepseek here")
    const [, init] = (fetch as unknown as FetchMock).mock.calls[1] as [string, { body: string }]
    // The retired `deepseek-chat` pin is what silently killed this rung before.
    expect(JSON.parse(init.body).model).toBe("deepseek-v4-pro")
    expect(mocks.generateContent).not.toHaveBeenCalled()
  })

  it("falls back to Gemini only after both OpenAI and DeepSeek fail", async () => {
    mockFetchByHost({
      openai: () => ({ ok: false, status: 503 }),
      deepseek: () => ({ ok: false, status: 500 }),
    })
    mocks.generateContent.mockResolvedValue({ response: { text: () => "gemini last resort" } })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    const result = await generateAIResponseEdge("sys", "user")

    expect(result.provider).toBe("gemini")
    expect(result.text).toBe("gemini last resort")
  })

  it("skips an unconfigured vendor instead of counting it as a failure", async () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    mockFetchByHost({ deepseek: () => okBody("deepseek only") })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    const result = await generateAIResponseEdge("sys", "user")

    expect(result.provider).toBe("deepseek")
    // One call, to DeepSeek. A missing key must not spend a request finding out.
    expect((fetch as unknown as FetchMock).mock.calls).toHaveLength(1)
  })

  it("names every vendor's failure, not just the last rung's", async () => {
    // Reporting only the final error would blame Gemini for an outage whose
    // cause was OpenAI. The last rung is the least interesting vendor by
    // construction, so it is the worst possible single thing to report.
    mockFetchByHost({
      openai: () => ({ ok: false, status: 503 }),
      deepseek: () => ({ ok: false, status: 500 }),
    })
    mocks.generateContent.mockRejectedValue(new Error("model retired"))
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    const error = await generateAIResponseEdge("sys", "user").catch((e: Error) => e)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain("openai: OpenAI failed: 503")
    expect((error as Error).message).toContain("deepseek: DeepSeek fallback failed: 500")
    expect((error as Error).message).toContain("gemini: model retired")
  })

  it("reports a configuration problem distinctly from a vendor outage", async () => {
    vi.stubEnv("OPENAI_API_KEY", "")
    vi.stubEnv("DEEPSEEK_API_KEY", "")
    vi.stubEnv("GEMINI_API_KEY", "")
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    await expect(generateAIResponseEdge("sys", "user")).rejects.toThrow("No AI provider configured")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("treats an empty high-effort completion as a failure, not as content", async () => {
    // A high-effort call can burn its whole budget on reasoning and return an
    // empty message with finish_reason "length". Streaming that to the user
    // would render an empty feedback body rather than degrading to the next
    // vendor.
    mockFetchByHost({
      openai: () => ({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "" }, finish_reason: "length" }] }),
      }),
      deepseek: () => okBody("deepseek rescued it"),
    })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    const result = await generateAIResponseEdge("sys", "user")

    expect(result.provider).toBe("deepseek")
    expect(result.text).toBe("deepseek rescued it")
  })
})

/**
 * Four of the five LLM calls behind /api/feedback/stream reported no usage at
 * all, so their spend was invisible to the cost ledger, the per-user budget cap
 * and the daily kill-switch simultaneously. Every one of them funnels through
 * generateAIResponseEdge, so the reporting hook lives there.
 */
describe("edge usage sink", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv("OPENAI_API_KEY", "openai-test-key")
    vi.stubEnv("GEMINI_API_KEY", "gemini-test-key")
    vi.stubEnv("DEEPSEEK_API_KEY", "deepseek-test-key")
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("reports one record per successful call, with the full prompt", async () => {
    mockFetchByHost({ openai: () => okBody("the answer") })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")
    const onUsage = vi.fn()

    await generateAIResponseEdge("sys prompt", "user message", { onUsage })

    expect(onUsage).toHaveBeenCalledTimes(1)
    const record = onUsage.mock.calls[0][0]
    expect(record.provider).toBe("openai")
    expect(record.responseText).toBe("the answer")
    // Both halves of the prompt, or input tokens are under-estimated and the
    // call is under-billed.
    expect(record.promptText).toContain("sys prompt")
    expect(record.promptText).toContain("user message")
    expect(typeof record.latencyMs).toBe("number")
  })

  it("attributes spend to the provider that ANSWERED, not the one it started on", async () => {
    // Pricing is per provider. After a fallback, billing the first rung would
    // charge OpenAI's rate for a DeepSeek call.
    mockFetchByHost({
      openai: () => ({ ok: false, status: 500 }),
      deepseek: () => okBody("deepseek answered"),
    })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")
    const onUsage = vi.fn()

    await generateAIResponseEdge("sys", "user", { onUsage })

    expect(onUsage).toHaveBeenCalledTimes(1)
    expect(onUsage.mock.calls[0][0].provider).toBe("deepseek")
  })

  it("does not report a call that never succeeded", async () => {
    mockFetchByHost({
      openai: () => ({ ok: false, status: 500 }),
      deepseek: () => ({ ok: false, status: 500 }),
    })
    mocks.generateContent.mockRejectedValue(new Error("gemini down"))
    const { generateAIResponseEdge } = await import("../ai-providers-edge")
    const onUsage = vi.fn()

    await expect(generateAIResponseEdge("sys", "user", { onUsage })).rejects.toThrow()
    expect(onUsage).not.toHaveBeenCalled()
  })

  it("never lets a broken sink turn a paid call into a fallback", async () => {
    // The call has already been billed by the vendor. If a throwing sink
    // propagated, the chain would degrade to the next rung and the user would
    // be charged twice for one answer.
    mockFetchByHost({ openai: () => okBody("the answer") })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")
    const onUsage = vi.fn(() => {
      throw new Error("reporting exploded")
    })

    const result = await generateAIResponseEdge("sys", "user", { onUsage })

    expect(result.provider).toBe("openai")
    expect(result.text).toBe("the answer")
  })
})
