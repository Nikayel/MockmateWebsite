import { describe, expect, it } from "vitest"
import {
  getSessionsLimitForTier,
  isPaidTier,
  PRO_AI_LIMIT_MULTIPLIER,
  RATE_LIMITS,
} from "@/lib/pricing"
import { PRICING_CONFIG } from "@/lib/config"

// DUP-2: one source of truth for the tier -> session-limit rule, so the server
// quota gate and the client gate never disagree and enterprise never falls
// through to the free limit.
describe("getSessionsLimitForTier (DUP-2)", () => {
  it("returns the free limit for free", () => {
    expect(getSessionsLimitForTier("free")).toBe(PRICING_CONFIG.free.sessionsPerMonth)
  })
  it("returns the pro limit for pro", () => {
    expect(getSessionsLimitForTier("pro")).toBe(PRICING_CONFIG.pro.sessionsPerMonth)
  })
  it("returns 999 for enterprise, never the free limit", () => {
    expect(getSessionsLimitForTier("enterprise")).toBe(999)
    expect(getSessionsLimitForTier("enterprise")).not.toBe(PRICING_CONFIG.free.sessionsPerMonth)
  })
})

describe("isPaidTier (DUP-2)", () => {
  it("treats pro and enterprise as paid, free as not", () => {
    expect(isPaidTier("pro")).toBe(true)
    expect(isPaidTier("enterprise")).toBe(true)
    expect(isPaidTier("free")).toBe(false)
  })
})

// The pricing page advertises Pro's AI limits as a multiple of Free's, derived
// from RATE_LIMITS so the number cannot overstate the limiter. What derivation
// cannot guard is the claim becoming hollow: if the tiers are ever flattened,
// "Nx higher" stops being a reason to upgrade and the copy needs rewriting,
// not recomputing. This fails the build at that moment.
describe("advertised Pro AI limit multiplier", () => {
  it("is a genuine multiple on both per-minute dimensions", () => {
    expect(PRO_AI_LIMIT_MULTIPLIER).toBeGreaterThanOrEqual(2)
    expect(RATE_LIMITS.pro.requestsPerMinute).toBeGreaterThanOrEqual(
      RATE_LIMITS.free.requestsPerMinute * PRO_AI_LIMIT_MULTIPLIER
    )
    expect(RATE_LIMITS.pro.tokensPerMinute).toBeGreaterThanOrEqual(
      RATE_LIMITS.free.tokensPerMinute * PRO_AI_LIMIT_MULTIPLIER
    )
  })
})
