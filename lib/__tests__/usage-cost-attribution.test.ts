/**
 * calculateCost is the only live pricing function on the platform: the Node AI
 * path (lib/ai-providers.ts) and the Edge ingest (/api/internal/usage) both
 * route through it, and its output feeds the per-user budget cap, the global
 * daily kill-switch and every cost dashboard.
 *
 * A provider missing from PROVIDER_COSTS used to fall through to the gemini rate
 * without a word, which is how every OpenAI-served Edge generation came to be
 * booked at 6.4x its real cost. These tests pin both halves of that fix: the
 * missing key exists, and an unknown key is loud.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const { errorSpy } = vi.hoisted(() => ({ errorSpy: vi.fn() }))

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: errorSpy },
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: errorSpy },
}))

describe("calculateCost provider attribution", () => {
  beforeEach(() => {
    errorSpy.mockClear()
  })

  it("prices the bare 'openai' provider the Edge runtime reports", async () => {
    const { calculateCost, PROVIDER_COSTS } = await import("../usage-tracking")

    // lib/ai-providers-edge.ts returns provider: "openai" verbatim.
    expect(PROVIDER_COSTS).toHaveProperty("openai")
    expect(PROVIDER_COSTS.openai).toBe(PROVIDER_COSTS["openai-high"])

    // 1000 in + 1000 out = 2k tokens at the Luna blended rate.
    expect(calculateCost(1000, 1000, "openai")).toBeCloseTo(2 * 0.0007, 10)
    // Not the gemini rate it used to silently inherit.
    expect(calculateCost(1000, 1000, "openai")).not.toBeCloseTo(2 * 0.0045, 10)
  })

  it("does not log when the provider has a real cost row", async () => {
    const { calculateCost } = await import("../usage-tracking")
    calculateCost(100, 100, "openai")
    calculateCost(100, 100, "gemini")
    calculateCost(100, 100, "deepseek")
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it("logs at error and over-books when the provider is unknown", async () => {
    const { calculateCost, PROVIDER_COSTS } = await import("../usage-tracking")

    const cost = calculateCost(1000, 1000, "some-new-vendor")

    // Fallback stays deliberately expensive so an unpriced provider trips the
    // caps sooner rather than sliding under them.
    expect(cost).toBeCloseTo(2 * PROVIDER_COSTS.gemini, 10)
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy.mock.calls[0][0]).toContain("Unknown AI provider")
    expect(errorSpy.mock.calls[0][1]).toMatchObject({ provider: "some-new-vendor" })
  })

  it("covers every provider the Edge chain can return", async () => {
    const { PROVIDER_COSTS } = await import("../usage-tracking")
    // EdgeAIResponse["provider"] in lib/ai-providers-edge.ts.
    for (const provider of ["openai", "gemini", "deepseek"]) {
      expect(PROVIDER_COSTS).toHaveProperty(provider)
    }
  })
})
