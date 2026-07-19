import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

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

describe("ai-providers-edge Gemini -> DeepSeek fallback", () => {
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

  it("returns the Gemini response without touching DeepSeek when Gemini succeeds", async () => {
    mocks.generateContent.mockResolvedValue({ response: { text: () => "gemini says hi" } })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    const result = await generateAIResponseEdge("sys", "user")

    expect(result.text).toBe("gemini says hi")
    expect(result.provider).toBe("gemini")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("falls back to DeepSeek when Gemini throws (outage / model retirement)", async () => {
    mocks.generateContent.mockRejectedValue(new Error("model retired"))
    ;(fetch as unknown as FetchMock).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "deepseek here" } }] }),
    })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    const result = await generateAIResponseEdge("sys prompt", "user msg")

    expect(result.provider).toBe("deepseek")
    expect(result.text).toBe("deepseek here")
    const [url, init] = (fetch as unknown as FetchMock).mock.calls[0] as [
      string,
      { body: string; headers: Record<string, string> },
    ]
    expect(url).toContain("api.deepseek.com")
    const body = JSON.parse(init.body)
    expect(body.model).toBe("deepseek-chat")
    expect(body.messages[0]).toEqual({ role: "system", content: "sys prompt" })
    expect(body.messages[1]).toEqual({ role: "user", content: "user msg" })
    expect(init.headers.Authorization).toBe("Bearer deepseek-test-key")
  })

  it("rethrows the original Gemini error when no DeepSeek key is configured", async () => {
    vi.stubEnv("DEEPSEEK_API_KEY", "")
    mocks.generateContent.mockRejectedValue(new Error("model retired"))
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    await expect(generateAIResponseEdge("sys", "user")).rejects.toThrow("model retired")
    expect(fetch).not.toHaveBeenCalled()
  })

  it("surfaces a DeepSeek failure when both vendors are down", async () => {
    mocks.generateContent.mockRejectedValue(new Error("model retired"))
    ;(fetch as unknown as FetchMock).mockResolvedValue({ ok: false, status: 500 })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    await expect(generateAIResponseEdge("sys", "user")).rejects.toThrow(
      "DeepSeek fallback failed: 500"
    )
  })

  it("uses DeepSeek directly when Gemini is not configured at all", async () => {
    vi.stubEnv("GEMINI_API_KEY", "")
    ;(fetch as unknown as FetchMock).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "deepseek only" } }] }),
    })
    const { generateAIResponseEdge } = await import("../ai-providers-edge")

    const result = await generateAIResponseEdge("sys", "user")

    expect(result.provider).toBe("deepseek")
    expect(mocks.generateContent).not.toHaveBeenCalled()
  })
})
