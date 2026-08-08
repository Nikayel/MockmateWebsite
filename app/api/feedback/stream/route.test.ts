/**
 * /api/feedback/stream was gated by verifyAuthEdge alone — no rate limit, no
 * quota check, no budget check — while making up to five AI calls per request
 * at high reasoning effort, on the path that serves every scenario type except
 * system design.
 *
 * These tests pin the two bounds that close it: a request rate limit, and caps
 * on the caller-controlled text that reaches those AI calls.
 */

import { beforeEach, afterEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuthEdge: vi.fn(),
  generateFeedbackResponseEdge: vi.fn(),
  validateConversationEdge: vi.fn(),
  extractConversationEvidenceEdge: vi.fn(),
  analyzeTranscriptForMistakesEdge: vi.fn(),
  reportEdgeUsageInBackground: vi.fn(),
  loggerWarn: vi.fn(),
}))

vi.mock("@/lib/auth-edge", () => ({ verifyAuthEdge: mocks.verifyAuthEdge }))

vi.mock("@/lib/ai-providers-edge", () => ({
  generateFeedbackResponseEdge: mocks.generateFeedbackResponseEdge,
  validateConversationEdge: mocks.validateConversationEdge,
  extractConversationEvidenceEdge: mocks.extractConversationEvidenceEdge,
}))

vi.mock("@/lib/feedback/transcript-analysis-edge", () => ({
  analyzeTranscriptForMistakesEdge: mocks.analyzeTranscriptForMistakesEdge,
}))

vi.mock("@/lib/usage/edge-reporter", () => ({
  reportEdgeUsageInBackground: mocks.reportEdgeUsageInBackground,
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: mocks.loggerWarn, error: vi.fn() },
}))

const USER_ID = "user-under-test"

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return {
    headers: new Headers({ authorization: "Bearer token" }),
    json: async () => ({ userId: USER_ID, scenarioType: "dsa", ...body }),
  } as unknown as NextRequest
}

/** Drain an SSE response so background processing settles before assertions. */
async function drain(response: Response): Promise<string> {
  if (!response.body) return ""
  return await new Response(response.body).text()
}

describe("/api/feedback/stream cost bounds", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    // No Upstash in tests: the limiter falls back to its per-isolate counter,
    // which is the degraded path worth exercising anyway.
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "")

    mocks.verifyAuthEdge.mockResolvedValue({ authenticated: true, userId: USER_ID })
    mocks.validateConversationEdge.mockResolvedValue({
      isCoherent: true,
      responsesRelevant: true,
      approachExplained: false,
      approachQuality: "none",
      complexityDiscussed: false,
      complexityAccurate: false,
      statedComplexity: null,
      questionsAsked: 0,
      questionsAnswered: 0,
      edgeCasesConsidered: false,
      alternativesDiscussed: false,
      communicationScore: 30,
    })
    mocks.extractConversationEvidenceEdge.mockResolvedValue(null)
    mocks.analyzeTranscriptForMistakesEdge.mockResolvedValue({
      silentNotes: [],
      analysisMetadata: null,
    })
    mocks.generateFeedbackResponseEdge.mockResolvedValue({
      text: "**TL;DR** fine.",
      provider: "openai",
      latencyMs: 10,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe("authentication", () => {
    it("refuses an unauthenticated caller before any AI call", async () => {
      mocks.verifyAuthEdge.mockResolvedValue({ authenticated: false })
      const { POST } = await import("./route")

      const response = await POST(makeRequest())

      expect(response.status).toBe(401)
      expect(mocks.generateFeedbackResponseEdge).not.toHaveBeenCalled()
    })
  })

  describe("rate limiting", () => {
    it("rejects the fourth request in a minute with 429 and Retry-After", async () => {
      const { POST } = await import("./route")

      for (let i = 0; i < 3; i++) {
        const ok = await POST(makeRequest())
        expect(ok.status).toBe(200)
        await drain(ok)
      }

      const blocked = await POST(makeRequest())

      expect(blocked.status).toBe(429)
      expect(blocked.headers.get("Retry-After")).toBe("60")
      const body = (await blocked.json()) as { retryAfter: number }
      expect(body.retryAfter).toBe(60)
    })

    it("spends nothing on a rate-limited request", async () => {
      const { POST } = await import("./route")

      for (let i = 0; i < 3; i++) await drain(await POST(makeRequest()))
      const callsBefore = mocks.generateFeedbackResponseEdge.mock.calls.length

      await POST(makeRequest())

      // The refusal must happen before the stream opens, so no AI runs and no
      // usage is reported for it.
      expect(mocks.generateFeedbackResponseEdge.mock.calls.length).toBe(callsBefore)
    })

    it("limits per account, so one user cannot exhaust another", async () => {
      const { POST } = await import("./route")

      for (let i = 0; i < 3; i++) await drain(await POST(makeRequest()))
      expect((await POST(makeRequest())).status).toBe(429)

      mocks.verifyAuthEdge.mockResolvedValue({ authenticated: true, userId: "someone-else" })
      const other = await POST(makeRequest({ userId: "someone-else" }))
      expect(other.status).toBe(200)
      await drain(other)
    })
  })

  describe("input bounds", () => {
    it("caps the number of transcript messages reaching the AI calls", async () => {
      const { POST } = await import("./route")

      const huge = Array.from({ length: 5_000 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "interviewer",
        content: `message ${i}`,
      }))

      await drain(await POST(makeRequest({ conversationTranscript: huge })))

      const [transcriptSeen] = mocks.validateConversationEdge.mock.calls[0] as [
        Array<{ content: string }>,
      ]
      expect(transcriptSeen.length).toBe(400)
      // Head AND tail survive: the approach is stated first, the complexity
      // discussion last, and both are scored.
      expect(transcriptSeen[0].content).toBe("message 0")
      expect(transcriptSeen[transcriptSeen.length - 1].content).toBe("message 4999")
      expect(mocks.loggerWarn).toHaveBeenCalledWith(
        expect.stringContaining("Transcript exceeded"),
        expect.objectContaining({ received: 5_000, cap: 400 })
      )
    })

    it("caps the length of a single transcript message", async () => {
      const { POST } = await import("./route")

      await drain(
        await POST(
          makeRequest({
            conversationTranscript: [{ role: "user", content: "x".repeat(500_000) }],
          })
        )
      )

      const [transcriptSeen] = mocks.validateConversationEdge.mock.calls[0] as [
        Array<{ content: string }>,
      ]
      expect(transcriptSeen[0].content.length).toBe(4_000)
    })

    it("caps submitted code", async () => {
      const { POST } = await import("./route")

      await drain(
        await POST(
          makeRequest({
            code: "y".repeat(400_000),
            conversationTranscript: [
              { role: "user", content: "I will iterate with a hash map for O(n) time." },
            ],
          })
        )
      )

      const codeSeen = mocks.validateConversationEdge.mock.calls[0][1] as string
      expect(codeSeen.length).toBe(30_000)
    })

    it("leaves a normal-sized session untouched", async () => {
      const { POST } = await import("./route")

      const normal = Array.from({ length: 40 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "interviewer",
        content: `turn ${i}`,
      }))

      await drain(await POST(makeRequest({ conversationTranscript: normal, code: "return 1" })))

      const [transcriptSeen, codeSeen] = mocks.validateConversationEdge.mock.calls[0] as [
        Array<{ content: string }>,
        string,
      ]
      expect(transcriptSeen.length).toBe(40)
      expect(codeSeen).toBe("return 1")
      expect(mocks.loggerWarn).not.toHaveBeenCalledWith(
        expect.stringContaining("Transcript exceeded"),
        expect.anything()
      )
    })
  })
})
