import { describe, it, expect } from "vitest"
import { PROVIDER_COSTS } from "../usage-tracking"
import { AI_PROVIDER_COSTS, AI_PROVIDER_RATES, AI_BUDGET_CAPS } from "../pricing"
import { COST_PROTECTION } from "../constants"
import { GEMINI_MODELS } from "../ai/model-ids"

/**
 * These constants feed real enforcement, not just reporting: per-user budget
 * blocks, the global daily kill-switch, and cost-anomaly detection. They were
 * calibrated for a retired model and understated spend ~23x, which silently
 * turned a $50/day brake into a ~$1,150/day one.
 *
 * Values are asserted as LITERALS on purpose. Importing the constant into both
 * sides of the assertion (as lib/__tests__/global-spend-guard.test.ts does)
 * pins nothing.
 */
describe("AI cost constants", () => {
  it("bills Gemini at the live 3.6-flash blended rate", () => {
    // $1.50 in + $7.50 out per 1M, averaged, per 1k tokens.
    expect(PROVIDER_COSTS.gemini).toBe(0.0045)
    expect(AI_PROVIDER_COSTS.gemini).toBe(0.0045)
  })

  it("bills flash-lite at its own rate rather than falling back to flash", () => {
    // $0.30 in + $2.50 out per 1M, averaged. Without this key the lookup falls
    // back to the gemini rate and overcharges lite traffic 3.2x.
    expect(PROVIDER_COSTS["gemini-lite"]).toBe(0.0014)
    expect(AI_PROVIDER_COSTS["gemini-lite"]).toBe(0.0014)
  })

  it("keeps the two cost tables in agreement", () => {
    // PROVIDER_COSTS is now a re-export of AI_PROVIDER_COSTS rather than a
    // second literal table, so agreement is structural. Assert the KEY SETS
    // match as well as the values: this test only ever iterated one table's
    // keys, which is how the bare "openai" row came to exist in one table and
    // not the other without anything noticing.
    expect(Object.keys(PROVIDER_COSTS).sort()).toEqual(Object.keys(AI_PROVIDER_COSTS).sort())
    for (const key of Object.keys(AI_PROVIDER_COSTS) as Array<keyof typeof AI_PROVIDER_COSTS>) {
      expect(PROVIDER_COSTS[key as keyof typeof PROVIDER_COSTS]).toBe(AI_PROVIDER_COSTS[key])
    }
  })

  // The blended figures above are DISPLAY ONLY. These are the numbers that
  // actually charge money, and until now nothing pinned them: cost-constants
  // asserted only the averaged values, so either side of a direction could have
  // moved without a single test objecting as long as the average held.
  it("pins the per-direction rates that price every live call", () => {
    const expected: Record<string, { inputPer1M: number; outputPer1M: number }> = {
      // GPT-5.6 Luna. Identical across every effort key and the bare Edge key:
      // effort changes how many output tokens come back, not their price.
      "openai-none": { inputPer1M: 0.2, outputPer1M: 1.2 },
      "openai-low": { inputPer1M: 0.2, outputPer1M: 1.2 },
      "openai-high": { inputPer1M: 0.2, outputPer1M: 1.2 },
      "openai-xhigh": { inputPer1M: 0.2, outputPer1M: 1.2 },
      openai: { inputPer1M: 0.2, outputPer1M: 1.2 },
      gemini: { inputPer1M: 1.5, outputPer1M: 7.5 },
      "gemini-lite": { inputPer1M: 0.3, outputPer1M: 2.5 },
      deepseek: { inputPer1M: 0.435, outputPer1M: 0.87 },
      "deepseek-chat": { inputPer1M: 0.14, outputPer1M: 0.28 },
      claude: { inputPer1M: 1.0, outputPer1M: 5.0 },
    }

    for (const [provider, rate] of Object.entries(expected)) {
      const actual = AI_PROVIDER_RATES[provider as keyof typeof AI_PROVIDER_RATES]
      expect(actual, `missing rate row for ${provider}`).toBeDefined()
      expect(actual.inputPer1M, `${provider} input rate`).toBe(rate.inputPer1M)
      expect(actual.outputPer1M, `${provider} output rate`).toBe(rate.outputPer1M)
    }
  })

  it("prices output at or above input on every routed provider", () => {
    // Not a vendor fact but a structural one: if these ever invert, the
    // direction of every over/under-charge in the pricing tests flips, and the
    // reasoning-call undercount that the kill-switch cares about changes sign.
    for (const provider of ["openai", "gemini", "gemini-lite", "deepseek", "deepseek-chat"]) {
      const rate = AI_PROVIDER_RATES[provider as keyof typeof AI_PROVIDER_RATES]
      expect(rate.outputPer1M, `${provider}`).toBeGreaterThan(rate.inputPer1M)
    }
  })

  it("covers the bare 'openai' key the Edge runtime stamps on its responses", () => {
    // lib/ai-providers-edge.ts returns provider: "openai" with no effort
    // suffix. Missing from the RATE table it would fall back to gemini and
    // overbook the platform's most expensive call by 6.4x.
    expect(AI_PROVIDER_RATES).toHaveProperty("openai")
    expect(AI_PROVIDER_RATES.openai).toEqual(AI_PROVIDER_RATES["openai-high"])
  })

  it("covers every provider the fallback chains can select", () => {
    // A provider missing here is billed at the gemini rate, silently.
    for (const provider of ["gemini", "gemini-lite", "deepseek-chat", "claude"]) {
      expect(PROVIDER_COSTS).toHaveProperty(provider)
    }
  })

  it("tracks the model pins it claims to price", () => {
    expect(GEMINI_MODELS.flash).toBe("gemini-3.6-flash")
    expect(GEMINI_MODELS.flashLite).toBe("gemini-3.5-flash-lite")
  })
})

describe("budget caps stay above the session quota", () => {
  // A session costs roughly $0.40 pathological / $0.15 typical at the
  // corrected rates. The server-authoritative session quota is the real
  // limit; these caps are the runaway backstop and must not bind first.
  const PATHOLOGICAL_SESSION_COST = 0.4
  const FREE_QUOTA = 8
  const PRO_QUOTA = 35

  it("free tier covers its full quota with headroom", () => {
    expect(AI_BUDGET_CAPS.free).toBe(6.5)
    expect(AI_BUDGET_CAPS.free).toBeGreaterThan(FREE_QUOTA * PATHOLOGICAL_SESSION_COST)
  })

  it("pro tier covers its full quota with headroom", () => {
    expect(AI_BUDGET_CAPS.pro).toBe(28)
    expect(AI_BUDGET_CAPS.pro).toBeGreaterThan(PRO_QUOTA * PATHOLOGICAL_SESSION_COST)
  })

  it("global daily ceiling is a real dollar figure", () => {
    expect(COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD).toBe(250)
    // Must clear a single pro user exhausting their month in one day, or a
    // legitimate power user trips the platform-wide kill-switch.
    expect(COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD).toBeGreaterThan(AI_BUDGET_CAPS.pro)
  })
})
