import { describe, it, expect } from "vitest"
import { PROVIDER_COSTS } from "../usage-tracking"
import { AI_PROVIDER_COSTS, AI_BUDGET_CAPS } from "../pricing"
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
    for (const key of Object.keys(AI_PROVIDER_COSTS) as Array<keyof typeof AI_PROVIDER_COSTS>) {
      expect(PROVIDER_COSTS[key as keyof typeof PROVIDER_COSTS]).toBe(AI_PROVIDER_COSTS[key])
    }
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
