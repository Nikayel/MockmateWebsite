/**
 * The cost ledger must be driven by MEASURED provider usage, not by dividing
 * the returned text by four.
 *
 * Reasoning tokens bill as output tokens and produce no returned text, so on
 * every rung of the primary chain (Luna at explicit effort, Gemini 3.x with a
 * thinking budget) the character estimate can be a small fraction of what we
 * were actually charged. The same number feeds the usage_events row, the
 * per-user budget cap, the $250/day global kill-switch and the single-request
 * anomaly detector, so an undercount disarms all four at once.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { calculateAICost } from "../pricing"

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  // A SPY over the real pricer, not a stub. This used to be
  // `vi.fn(() => 0.25)`, and the test then asserted that recordGlobalSpend was
  // called with 0.25 — which asserts the mock, not the behaviour. It would have
  // passed against any pricing formula whatsoever, including the blended one
  // that overcharged the platform by up to 3.3x.
  calculateCost: vi.fn((inputTokens: number, outputTokens: number, provider: string) =>
    calculateAICost(inputTokens, outputTokens, provider)
  ),
  trackUsageEvent: vi.fn(async () => undefined),
  recordGlobalSpend: vi.fn(async () => undefined),
  checkRequestCostAnomaly: vi.fn(async () => undefined),
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
  recordGlobalSpend: mocks.recordGlobalSpend,
}))

vi.mock("../cost-anomaly-detection", () => ({
  checkRequestCostAnomaly: mocks.checkRequestCostAnomaly,
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

describe("cost ledger uses measured provider usage", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv("GEMINI_API_KEY", "gemini-test-key")
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it("prices the call from usageMetadata, not from the length of the reply", async () => {
    // A reasoning call: 8000 measured output tokens behind a 12-character reply.
    // The old estimate would have booked Math.ceil(12 / 4) = 3 output tokens.
    mocks.sendMessage.mockResolvedValue({
      response: {
        text: () => "short reply.",
        usageMetadata: { promptTokenCount: 1500, candidatesTokenCount: 8000 },
      },
    })
    const { generateAIResponse } = await import("../ai-providers")

    const result = await generateAIResponse("system", "message", [], { userId: "user-1" })

    expect(mocks.calculateCost).toHaveBeenCalledWith(1500, 8000, "gemini")
    expect(result.tokensUsed).toBe(9500)

    const tracked = mocks.trackUsageEvent.mock.calls[0][0] as Record<string, unknown>
    expect(tracked.inputTokens).toBe(1500)
    expect(tracked.outputTokens).toBe(8000)
    expect(tracked.totalTokens).toBe(9500)
    expect(tracked.isExactTokenCount).toBe(true)

    // The kill-switch and the anomaly detector see the same measured figure,
    // priced PER DIRECTION and asserted as a literal dollar amount.
    //
    // 1500 x $1.50/1M + 8000 x $7.50/1M = $0.062250. The blended formula this
    // replaced would have booked 9.5k x $0.0045/1k = $0.042750 — a 31%
    // UNDERCOUNT, because this is an output-heavy reasoning call. The blended
    // error is not a uniform overcharge, and it ran the wrong way on exactly
    // the calls the $250/day kill-switch exists to catch.
    expect(mocks.recordGlobalSpend).toHaveBeenCalledWith(0.06225)
    expect(mocks.recordGlobalSpend).not.toHaveBeenCalledWith(0.04275)

    const anomaly = mocks.checkRequestCostAnomaly.mock.calls[0][0] as Record<string, unknown>
    expect(anomaly.tokens).toBe(9500)
    expect(anomaly.cost).toBe(0.06225)
  })

  it("falls back to the character estimate when the provider reports nothing", async () => {
    mocks.sendMessage.mockResolvedValue({
      response: { text: () => "abcdefgh" }, // 8 chars -> 2 estimated output tokens
    })
    const { generateAIResponse } = await import("../ai-providers")

    await generateAIResponse("sys", "msg", [], { userId: "user-1" })

    const [inputTokens, outputTokens] = mocks.calculateCost.mock.calls[0] as unknown as number[]
    expect(outputTokens).toBe(2)
    expect(inputTokens).toBe(Math.ceil(("sys".length + "msg".length) / 4))

    const tracked = mocks.trackUsageEvent.mock.calls[0][0] as Record<string, unknown>
    expect(tracked.isExactTokenCount).toBe(false)
  })

  it("rejects a malformed usage payload rather than poisoning the ledger with NaN", async () => {
    // NaN >= ceiling is false, so a malformed report would quietly disarm the
    // global spend kill-switch rather than trip it.
    mocks.sendMessage.mockResolvedValue({
      response: {
        text: () => "abcdefgh",
        usageMetadata: { promptTokenCount: "lots", candidatesTokenCount: -5 },
      },
    })
    const { generateAIResponse } = await import("../ai-providers")

    const result = await generateAIResponse("sys", "msg", [], { userId: "user-1" })

    const [inputTokens, outputTokens] = mocks.calculateCost.mock.calls[0] as unknown as number[]
    expect(Number.isFinite(inputTokens)).toBe(true)
    expect(Number.isFinite(outputTokens)).toBe(true)
    expect(outputTokens).toBe(2)
    expect("tokensIn" in result).toBe(false)
  })
})
