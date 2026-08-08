/**
 * The internal usage ingest is the ONLY way Edge AI spend reaches any of the
 * cost controls. It wrote the usage_event (so per-user budgets saw the spend)
 * but never incremented the global daily counter, so the busiest AI path on the
 * platform contributed nothing to the $250/day kill-switch.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  trackUsageEvent: vi.fn(async () => true),
  calculateCost: vi.fn(() => 0.42),
  recordGlobalSpend: vi.fn(async () => undefined),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/usage-tracking", () => ({
  trackUsageEvent: mocks.trackUsageEvent,
  calculateCost: mocks.calculateCost,
}))

vi.mock("@/lib/global-spend-guard", () => ({
  recordGlobalSpend: mocks.recordGlobalSpend,
}))

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: mocks.loggerError },
}))

const SECRET = "cron-secret-for-tests"

function makeRequest(body: unknown, authorization = `Bearer ${SECRET}`): NextRequest {
  return {
    headers: new Headers({ authorization }),
    json: async () => body,
  } as unknown as NextRequest
}

const VALID_BODY = {
  userId: "user-1",
  eventType: "feedback_generation",
  provider: "openai",
  inputTokens: 4000,
  outputTokens: 9000,
  latencyMs: 3200,
  sessionId: "session-1",
  estimatedTokens: false,
}

describe("POST /api/internal/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("CRON_SECRET", SECRET)
    mocks.trackUsageEvent.mockResolvedValue(true)
    mocks.calculateCost.mockReturnValue(0.42)
  })

  it("increments the global daily spend counter with the computed cost", async () => {
    const { POST } = await import("./route")

    const response = await POST(makeRequest(VALID_BODY))

    expect(response.status).toBe(200)
    expect(mocks.calculateCost).toHaveBeenCalledWith(4000, 9000, "openai")
    // The kill-switch counter must see the same dollars the ledger booked.
    expect(mocks.recordGlobalSpend).toHaveBeenCalledWith(0.42)
  })

  it("rejects an unauthorised caller without recording anything", async () => {
    const { POST } = await import("./route")

    const response = await POST(makeRequest(VALID_BODY, "Bearer wrong-secret-value"))

    expect(response.status).toBe(401)
    expect(mocks.trackUsageEvent).not.toHaveBeenCalled()
    expect(mocks.recordGlobalSpend).not.toHaveBeenCalled()
  })

  it("rejects a malformed body without recording anything", async () => {
    const { POST } = await import("./route")

    const response = await POST(makeRequest({ ...VALID_BODY, eventType: "code_execution" }))

    expect(response.status).toBe(400)
    expect(mocks.recordGlobalSpend).not.toHaveBeenCalled()
  })
})
