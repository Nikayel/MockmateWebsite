/**
 * calculateCost is the only live pricing function on the platform: the Node AI
 * path (lib/ai-providers.ts) and the Edge ingest (/api/internal/usage) both
 * route through it, and its output feeds the per-user budget cap, the global
 * daily kill-switch and every cost dashboard.
 *
 * Two separate defects are pinned here.
 *
 * 1. A provider missing from the rate table used to fall through to the gemini
 *    rate without a word, which is how every OpenAI-served Edge generation came
 *    to be booked at 6.4x its real cost. The missing key exists, and an unknown
 *    key is loud.
 *
 * 2. Pricing summed the two token counts and applied one blended rate. EVERY
 *    assertion below uses an ASYMMETRIC token split, because a 50/50 split is
 *    the single ratio at which blending and per-direction pricing return the
 *    same number. This file used to assert calculateCost(1000, 1000, ...) and
 *    therefore went green against both the broken and the fixed implementation
 *    — a test that certifies the bug rather than catching it.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import { AI_PROVIDER_RATES } from "../pricing"

const { errorSpy } = vi.hoisted(() => ({ errorSpy: vi.fn() }))

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: errorSpy },
  default: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: errorSpy },
}))

/**
 * A realistic interview turn: a large system prompt plus history against a
 * short reply. Nothing on the platform generates a 50/50 call.
 */
const INPUT_HEAVY = { inputTokens: 8000, outputTokens: 300 }

/** What the deleted implementation would have charged. */
function blendedCost(inputTokens: number, outputTokens: number, provider: string): number {
  const rate = AI_PROVIDER_RATES[provider as keyof typeof AI_PROVIDER_RATES]
  const blendedPer1k = (rate.inputPer1M + rate.outputPer1M) / 2 / 1000
  return ((inputTokens + outputTokens) / 1000) * blendedPer1k
}

/** What the vendor actually charges. */
function perDirectionCost(inputTokens: number, outputTokens: number, provider: string): number {
  const rate = AI_PROVIDER_RATES[provider as keyof typeof AI_PROVIDER_RATES]
  return (inputTokens * rate.inputPer1M + outputTokens * rate.outputPer1M) / 1_000_000
}

describe("calculateCost prices per direction, not blended", () => {
  beforeEach(() => {
    errorSpy.mockClear()
  })

  it("charges a Gemini interview turn its real cost, not the blended one", async () => {
    const { calculateCost } = await import("../usage-tracking")
    const { inputTokens, outputTokens } = INPUT_HEAVY

    // 8000 x $1.50/1M + 300 x $7.50/1M = $0.014250
    const cost = calculateCost(inputTokens, outputTokens, "gemini")
    expect(cost).toBeCloseTo(0.01425, 10)

    // Blending would charge 8.3k x $0.0045/1k = $0.037350, a 2.62x overcharge.
    // This is the assertion the old 1000/1000 split could not make.
    expect(cost).not.toBeCloseTo(0.03735, 10)
    expect(blendedCost(inputTokens, outputTokens, "gemini") / cost).toBeCloseTo(2.62, 1)
  })

  it("prices every routed provider per direction on an asymmetric split", async () => {
    const { calculateCost } = await import("../usage-tracking")
    const { inputTokens, outputTokens } = INPUT_HEAVY

    // Every provider the two fallback chains can select. For each, the blended
    // answer and the correct answer genuinely differ at this split, so each
    // assertion can actually fail against the old implementation.
    for (const provider of [
      "openai",
      "openai-high",
      "gemini",
      "gemini-lite",
      "deepseek",
      "deepseek-chat",
      "claude",
    ]) {
      const cost = calculateCost(inputTokens, outputTokens, provider)
      expect(cost).toBeCloseTo(perDirectionCost(inputTokens, outputTokens, provider), 10)
      expect(cost).not.toBeCloseTo(blendedCost(inputTokens, outputTokens, provider), 10)
    }
  })

  it("makes an input-heavy call cheaper than blending claimed", async () => {
    const { calculateCost } = await import("../usage-tracking")

    // Output is dearer than input at every routed provider, so a call dominated
    // by input must come in UNDER the blended figure. This is the direction of
    // the error: the platform was overcharging itself.
    for (const provider of ["openai", "gemini", "gemini-lite", "deepseek", "claude"]) {
      const cost = calculateCost(8000, 300, provider)
      expect(cost).toBeLessThan(blendedCost(8000, 300, provider))
    }
  })

  it("makes an output-heavy call dearer than blending claimed", async () => {
    const { calculateCost } = await import("../usage-tracking")

    // The error is not a uniform discount. A reasoning call that returns far
    // more tokens than it was given was being UNDER-charged by the same broken
    // formula, which is the direction that matters for the kill-switch.
    for (const provider of ["openai", "gemini", "gemini-lite", "deepseek", "claude"]) {
      const cost = calculateCost(300, 8000, provider)
      expect(cost).toBeGreaterThan(blendedCost(300, 8000, provider))
    }
  })

  /**
   * A cached-input test used to live here, asserting that DeepSeek cache hits
   * bill at 1/50th of a miss. It passed while no production caller ever supplied
   * a hit count, so it certified a discount the platform never took. The option
   * it exercised has been removed; see calculateAICost in lib/pricing.ts for
   * where the count would have to come from to restore it.
   */
})

describe("calculateCost provider attribution", () => {
  beforeEach(() => {
    errorSpy.mockClear()
  })

  it("prices the bare 'openai' provider the Edge runtime reports", async () => {
    const { calculateCost, PROVIDER_COSTS } = await import("../usage-tracking")

    // lib/ai-providers-edge.ts returns provider: "openai" verbatim.
    expect(PROVIDER_COSTS).toHaveProperty("openai")
    expect(PROVIDER_COSTS.openai).toBe(PROVIDER_COSTS["openai-high"])

    // 8000 x $0.20/1M + 300 x $1.20/1M = $0.001960
    expect(calculateCost(8000, 300, "openai")).toBeCloseTo(0.00196, 10)
    // Not the gemini rate it used to silently inherit ($0.014250 here).
    expect(calculateCost(8000, 300, "openai")).not.toBeCloseTo(0.01425, 10)
  })

  it("does not log when the provider has a real cost row", async () => {
    const { calculateCost } = await import("../usage-tracking")
    calculateCost(8000, 300, "openai")
    calculateCost(8000, 300, "gemini")
    calculateCost(8000, 300, "deepseek")
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it("logs at error and over-books when the provider is unknown", async () => {
    const { calculateCost } = await import("../usage-tracking")

    const cost = calculateCost(8000, 300, "some-new-vendor")

    // Fallback stays deliberately expensive so an unpriced provider trips the
    // caps sooner rather than sliding under them — and is now priced per
    // direction at the gemini rate rather than blended at it.
    expect(cost).toBeCloseTo(perDirectionCost(8000, 300, "gemini"), 10)
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
