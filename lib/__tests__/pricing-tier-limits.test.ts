import { describe, expect, it } from "vitest"
import { getSessionsLimitForTier, isPaidTier } from "@/lib/pricing"
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
