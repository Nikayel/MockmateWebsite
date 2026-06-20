import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.mock("@/lib/rate-limit", () => ({
  chatRateLimit: vi.fn(),
}))

vi.mock("@/lib/quota-enforcement", () => ({
  enforceQuota: vi.fn(),
}))

vi.mock("@/lib/rate-limiter", () => ({
  checkRateLimit: vi.fn(),
  startRequestTracking: vi.fn(),
  endRequestTracking: vi.fn(),
  buildRateLimitResponse: vi.fn((result: { retryAfter?: number }) => ({
    data: { error: "Rate limited", retryAfter: result.retryAfter },
    status: 429,
    headers: new Map(),
  })),
}))

vi.mock("@/lib/ai-providers", () => ({
  generateAIResponse: vi.fn(),
  validateResponseRelevance: vi.fn(),
}))

vi.mock("@/lib/analytics-server", () => ({
  trackAIChatServer: vi.fn(),
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock("@/lib/feature-flags", () => ({
  getFlag: vi.fn(),
}))

vi.mock("@/lib/interview/chat-rag-context", () => ({
  buildRAGContext: vi.fn(),
}))

vi.mock("@/lib/interview/response-validation", () => ({
  validateWithRetry: vi.fn(),
}))

function createRequest(body: unknown) {
  const request = new NextRequest("http://localhost/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  })
  request.json = async () => body
  return request
}

async function setupMocks() {
  const { chatRateLimit } = await import("@/lib/rate-limit")
  const { enforceQuota } = await import("@/lib/quota-enforcement")
  const { checkRateLimit, startRequestTracking, endRequestTracking } =
    await import("@/lib/rate-limiter")
  const { generateAIResponse, validateResponseRelevance } = await import("@/lib/ai-providers")
  const { trackAIChatServer } = await import("@/lib/analytics-server")
  const { getFlag } = await import("@/lib/feature-flags")
  const { buildRAGContext } = await import("@/lib/interview/chat-rag-context")
  const { validateWithRetry } = await import("@/lib/interview/response-validation")

  vi.mocked(chatRateLimit).mockResolvedValue(null)
  vi.mocked(enforceQuota).mockResolvedValue({
    allowed: true,
    tier: "free",
    userId: "user-1",
  })
  vi.mocked(checkRateLimit).mockResolvedValue({
    allowed: true,
    remaining: 9,
    limit: 10,
    resetTime: Date.now() + 60_000,
  })
  vi.mocked(startRequestTracking).mockResolvedValue(undefined)
  vi.mocked(endRequestTracking).mockResolvedValue(undefined)
  vi.mocked(generateAIResponse).mockResolvedValue({
    text: "Mocked assistant reply",
    provider: "gemini-lite",
    latencyMs: 12,
    tokensUsed: 42,
  })
  vi.mocked(validateResponseRelevance).mockReturnValue({ valid: true, issues: [] })
  vi.mocked(trackAIChatServer).mockResolvedValue(undefined)
  vi.mocked(getFlag).mockReturnValue(false)
  vi.mocked(buildRAGContext).mockResolvedValue("")
  vi.mocked(validateWithRetry).mockImplementation(async (context) => ({
    response: context.response,
    violations: [],
    retries: 0,
  }))

  return {
    generateAIResponse,
    trackAIChatServer,
    buildRAGContext,
    endRequestTracking,
  }
}

describe("/api/chat route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 for invalid request bodies", async () => {
    await setupMocks()
    const { POST } = await import("./route")

    const response = await POST(createRequest({ role: "narrator", message: "hello" }))

    expect(response.status).toBe(400)
    expect(response.data).toEqual(
      expect.objectContaining({
        error: "Invalid request body",
      })
    )
  })

  it("requires a message unless the request is proactive", async () => {
    const { generateAIResponse } = await setupMocks()
    const { POST } = await import("./route")

    const response = await POST(createRequest({ role: "partner" }))

    expect(response.status).toBe(400)
    expect(response.data).toEqual({ error: "Message is required" })
    expect(generateAIResponse).not.toHaveBeenCalled()
  })

  it("skips proactive interviewer checks when there is little code and little silence", async () => {
    const { generateAIResponse } = await setupMocks()
    const { POST } = await import("./route")

    const response = await POST(
      createRequest({
        role: "interviewer",
        isProactive: true,
        currentCode: "let i = 0",
        timeSinceLastMessage: 30,
      })
    )

    expect(response.status).toBe(200)
    expect(response.data).toEqual({
      reply: null,
      skipped: true,
      reason: "Not enough code to comment on yet and not silent long enough",
    })
    expect(generateAIResponse).not.toHaveBeenCalled()
  })

  it("stays silent after the interviewer already ended the session", async () => {
    const { generateAIResponse } = await setupMocks()
    const { POST } = await import("./route")

    const response = await POST(
      createRequest({
        role: "interviewer",
        message: "one more thing",
        context: [{ type: "assistant", message: "Good luck with your interview. Take care." }],
      })
    )

    expect(response.status).toBe(200)
    expect(response.data).toEqual({
      reply: null,
      conversationEnded: true,
      endMessage:
        "The interview session has ended. Click 'See Full Interview Score' to see your score breakdown and detailed analysis.",
    })
    expect(generateAIResponse).not.toHaveBeenCalled()
  })

  it("returns the provider response and debug phase metadata for a normal partner message", async () => {
    const { generateAIResponse, trackAIChatServer, buildRAGContext, endRequestTracking } =
      await setupMocks()
    const { POST } = await import("./route")

    const response = await POST(
      createRequest({
        role: "partner",
        message: "Can you explain my bug?",
        context: [{ type: "user", message: "I am stuck" }],
        currentCode: "function twoSum(nums, target) { return [] }",
        scenarioTitle: "Two Sum",
        scenarioType: "dsa",
        scenarioPattern: "arrays-hashing",
        sessionId: "session-1",
        userId: "user-1",
      })
    )

    expect(response.status).toBe(200)
    expect(response.data).toEqual(
      expect.objectContaining({
        reply: "Mocked assistant reply",
        provider: "gemini-lite",
        latencyMs: 12,
        _debug: expect.objectContaining({
          phase: expect.any(String),
          messageCount: 1,
        }),
      })
    )
    expect(generateAIResponse).toHaveBeenCalledTimes(1)
    expect(buildRAGContext).toHaveBeenCalledWith(
      expect.objectContaining({
        scenarioTitle: "Two Sum",
        userMessage: "Can you explain my bug?",
      })
    )
    expect(trackAIChatServer).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: "session-1",
        userId: "user-1",
        interactionType: "partner",
        provider: "gemini-lite",
      })
    )
    expect(endRequestTracking).toHaveBeenCalledWith("user-1")
  })
})
