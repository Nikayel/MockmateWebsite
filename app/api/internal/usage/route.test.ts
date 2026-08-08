import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const trackUsageEvent = vi.fn(() => Promise.resolve(true))
const recordGlobalSpend = vi.fn(() => Promise.resolve())
const isGlobalCeilingExceeded = vi.fn(() => Promise.resolve(false))
const getGlobalDailySpend = vi.fn(() => Promise.resolve(12.5))
const getGlobalDailyCeiling = vi.fn(() => 250)

vi.mock("@/lib/usage-tracking", () => ({
  trackUsageEvent: (...args: unknown[]) => trackUsageEvent(...(args as [])),
  // Deliberately a real-shaped calculation rather than a stub returning 0, so a
  // test asserting the cost is not accepted from the caller means something.
  calculateCost: (input: number, output: number) => ((input + output) / 1000) * 0.002,
}))

vi.mock("@/lib/global-spend-guard", () => ({
  recordGlobalSpend: (...args: unknown[]) => recordGlobalSpend(...(args as [])),
  isGlobalCeilingExceeded: () => isGlobalCeilingExceeded(),
  getGlobalDailySpend: () => getGlobalDailySpend(),
  getGlobalDailyCeiling: () => getGlobalDailyCeiling(),
}))

import { GET, POST } from "./route"

const SECRET = "test-cron-secret"

/**
 * The global next/server mock in vitest.setup.ts drops headers and stubs json()
 * to {}, so route tests in this repo stub the request shape directly. Matches
 * the pattern in app/api/client-error/route.test.ts.
 */
function makeRequest(body: unknown, authorization?: string): NextRequest {
  const invalidJson = typeof body === "string"
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? (authorization ?? null) : null,
    },
    json: () =>
      invalidJson ? Promise.reject(new SyntaxError("Unexpected token")) : Promise.resolve(body),
  } as unknown as NextRequest
}

const validBody = {
  userId: "user-1",
  eventType: "feedback_generation",
  provider: "gemini",
  inputTokens: 1000,
  outputTokens: 500,
  sessionId: "session-1",
  scenarioId: "two-sum",
}

describe("POST /api/internal/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.CRON_SECRET = SECRET
    trackUsageEvent.mockResolvedValue(true)
  })

  describe("authorization", () => {
    it("rejects a request with no bearer", async () => {
      const response = await POST(makeRequest(validBody))
      expect(response.status).toBe(401)
      expect(trackUsageEvent).not.toHaveBeenCalled()
    })

    it("rejects a wrong bearer", async () => {
      const response = await POST(makeRequest(validBody, "Bearer wrong-secret-value"))
      expect(response.status).toBe(401)
      expect(trackUsageEvent).not.toHaveBeenCalled()
    })

    it("fails closed when the secret is not configured", async () => {
      // Without this the endpoint would accept anything on a deployment that
      // forgot the env var, and it writes to the ledger budget enforcement reads.
      delete process.env.CRON_SECRET
      const response = await POST(makeRequest(validBody, `Bearer ${SECRET}`))
      expect(response.status).toBe(500)
      expect(trackUsageEvent).not.toHaveBeenCalled()
    })

    it("accepts the configured bearer", async () => {
      const response = await POST(makeRequest(validBody, `Bearer ${SECRET}`))
      expect(response.status).toBe(200)
      expect(trackUsageEvent).toHaveBeenCalledTimes(1)
    })
  })

  describe("validation", () => {
    const authorized = (body: unknown) => POST(makeRequest(body, `Bearer ${SECRET}`))

    it("rejects a non-JSON body", async () => {
      expect((await authorized("not json at all")).status).toBe(400)
    })

    it("rejects a missing userId", async () => {
      const { userId, ...withoutUser } = validBody
      void userId
      expect((await authorized(withoutUser)).status).toBe(400)
    })

    it("rejects an event type the Edge path may not report", async () => {
      // voice_transcription and embedding_generation have their own writers;
      // accepting them here would let one path double-count the other's spend.
      expect((await authorized({ ...validBody, eventType: "voice_transcription" })).status).toBe(
        400
      )
      expect((await authorized({ ...validBody, eventType: "nonsense" })).status).toBe(400)
    })

    it("rejects a missing provider", async () => {
      const { provider, ...withoutProvider } = validBody
      void provider
      expect((await authorized(withoutProvider)).status).toBe(400)
    })
  })

  describe("recording", () => {
    it("records the reported tokens against the user", async () => {
      await POST(makeRequest(validBody, `Bearer ${SECRET}`))
      expect(trackUsageEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          eventType: "feedback_generation",
          provider: "gemini",
          inputTokens: 1000,
          outputTokens: 500,
          totalTokens: 1500,
          sessionId: "session-1",
          scenarioId: "two-sum",
        })
      )
    })

    it("computes cost itself rather than accepting it from the caller", async () => {
      // The caller is the Edge runtime, but this endpoint must stay the
      // authority on rates: a caller-supplied cost would let the pricing table
      // be bypassed for the numbers budget enforcement reads.
      await POST(makeRequest({ ...validBody, cost: 999 }, `Bearer ${SECRET}`))
      const recorded = trackUsageEvent.mock.calls[0][0] as { cost: number }
      expect(recorded.cost).toBeCloseTo(0.003)
    })

    it("clamps an implausible token count instead of writing it", async () => {
      await POST(
        makeRequest({ ...validBody, inputTokens: 999_999_999, outputTokens: 0 }, `Bearer ${SECRET}`)
      )
      const recorded = trackUsageEvent.mock.calls[0][0] as { inputTokens: number }
      expect(recorded.inputTokens).toBe(2_000_000)
    })

    it("treats a negative or non-numeric token count as zero", async () => {
      await POST(
        makeRequest({ ...validBody, inputTokens: -50, outputTokens: "many" }, `Bearer ${SECRET}`)
      )
      const recorded = trackUsageEvent.mock.calls[0][0] as {
        inputTokens: number
        outputTokens: number
      }
      expect(recorded.inputTokens).toBe(0)
      expect(recorded.outputTokens).toBe(0)
    })

    it("marks estimated token counts as inexact", async () => {
      await POST(makeRequest({ ...validBody, estimatedTokens: true }, `Bearer ${SECRET}`))
      const recorded = trackUsageEvent.mock.calls[0][0] as { isExactTokenCount: boolean }
      expect(recorded.isExactTokenCount).toBe(false)
    })

    it("tags the record as coming from the Edge path", async () => {
      // Lets a reconciliation tell Edge-estimated spend from Node-measured spend.
      await POST(makeRequest(validBody, `Bearer ${SECRET}`))
      const recorded = trackUsageEvent.mock.calls[0][0] as { metadata: { source: string } }
      expect(recorded.metadata.source).toBe("edge")
    })
  })

  describe("global daily kill-switch", () => {
    it("increments the aggregate counter with the cost it just computed", async () => {
      // recordGlobalSpend's only caller was the Node path, so Edge spend — every
      // scenario type except system design — never reached the $250/day ceiling.
      await POST(makeRequest(validBody, `Bearer ${SECRET}`))
      const recorded = trackUsageEvent.mock.calls[0][0] as { cost: number }
      expect(recordGlobalSpend).toHaveBeenCalledTimes(1)
      // The ceiling counter must see exactly the dollars the ledger booked.
      expect(recordGlobalSpend).toHaveBeenCalledWith(recorded.cost)
    })

    it("does not record spend for an unauthorised caller", async () => {
      await POST(makeRequest(validBody, "Bearer wrong-secret-value"))
      expect(recordGlobalSpend).not.toHaveBeenCalled()
    })

    it("does not record spend for a rejected body", async () => {
      await POST(makeRequest({ ...validBody, provider: undefined }, `Bearer ${SECRET}`))
      expect(recordGlobalSpend).not.toHaveBeenCalled()
    })
  })

  describe("reporting a failed write", () => {
    it("returns 500 rather than claiming success when the ledger write failed", async () => {
      // The Edge reporter only logs on a non-OK response, so a 200 over a failed
      // write is how the whole Edge runtime could go unmetered while every
      // signal read healthy.
      trackUsageEvent.mockResolvedValue(false)

      const response = await POST(makeRequest(validBody, `Bearer ${SECRET}`))

      expect(response.status).toBe(500)
    })

    it("survives a throw from usage tracking instead of 500ing unhandled", async () => {
      trackUsageEvent.mockRejectedValue(new Error("firestore exploded"))

      const response = await POST(makeRequest(validBody, `Bearer ${SECRET}`))

      expect(response.status).toBe(500)
      expect(response.data).toMatchObject({ error: "Failed to record usage" })
    })

    it("does not credit the kill-switch counter for spend that was not recorded", async () => {
      trackUsageEvent.mockResolvedValue(false)

      await POST(makeRequest(validBody, `Bearer ${SECRET}`))

      expect(recordGlobalSpend).not.toHaveBeenCalled()
    })
  })

  describe("ceiling probe (GET)", () => {
    it("is the same auth boundary as the ingest", async () => {
      // The answer gates spending, so it must not be reachable with a user token.
      expect((await GET(makeRequest(null))).status).toBe(401)
      expect((await GET(makeRequest(null, "Bearer wrong-secret-value"))).status).toBe(401)
      expect(isGlobalCeilingExceeded).not.toHaveBeenCalled()
    })

    it("reports the ceiling verdict with the numbers behind it", async () => {
      isGlobalCeilingExceeded.mockResolvedValueOnce(true)
      const response = await GET(makeRequest(null, `Bearer ${SECRET}`))

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({
        ceilingExceeded: true,
        spendToday: 12.5,
        ceiling: 250,
      })
    })

    it("keeps a definite verdict when the detail read fails", async () => {
      // isGlobalCeilingExceeded fails CLOSED, and that verdict must survive a
      // secondary failure rather than being downgraded to an error response.
      isGlobalCeilingExceeded.mockResolvedValueOnce(true)
      getGlobalDailySpend.mockRejectedValueOnce(new Error("firestore down"))

      const response = await GET(makeRequest(null, `Bearer ${SECRET}`))

      expect(response.status).toBe(200)
      expect(response.data).toMatchObject({ ceilingExceeded: true, spendToday: null })
    })
  })
})
