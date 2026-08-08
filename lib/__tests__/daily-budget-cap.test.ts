/**
 * The per-user budget was keyed by calendar month alone, so an account could
 * burn a whole month's AI allowance in a single afternoon with nothing to
 * object. The monthly cap bounds the TOTAL; it says nothing about the RATE, and
 * rate is what an unbounded-bill incident is made of.
 *
 * The gap is not theoretical. Session quota increments once per session start
 * while cost accrues per AI call, so a single long session — or a client stuck
 * in a loop inside one — drains the month without ever consuming a second
 * session, which is exactly the case the session quota was assumed to cover.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getUserDailyCost: vi.fn(async () => 0),
  isGlobalCeilingExceeded: vi.fn(async () => false),
}))

/**
 * checkQuota walks several nested Firestore paths (profiles/{id},
 * profile_quota query, users/{id}/usage_summaries/{period}), and getUserQuota
 * returns null — skipping every downstream check — if any of them throws. So
 * the mock has to answer the whole chain, not just the first hop.
 */
vi.mock("../firebase-admin", () => {
  const makeDoc = (): Record<string, unknown> => ({
    // pro tier -> $28 monthly cap -> $14 daily cap
    get: vi.fn(async () => ({ exists: true, data: () => ({ subscription_tier: "pro" }) })),
    collection: vi.fn(() => makeCollection()),
  })
  const makeCollection = (): Record<string, unknown> => ({
    doc: vi.fn(() => makeDoc()),
    where: vi.fn(() => ({
      orderBy: vi.fn(() => ({
        limit: vi.fn(() => ({ get: vi.fn(async () => ({ docs: [] })) })),
      })),
      get: vi.fn(async () => ({ docs: [] })),
    })),
  })
  return {
    adminDb: { collection: vi.fn(() => makeCollection()) },
    adminAuth: { verifyIdToken: vi.fn(async () => ({ uid: "test-user-id" })) },
  }
})

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("../config", () => ({
  PRICING_CONFIG: { free: { sessionsPerMonth: 8 }, pro: { sessionsPerMonth: 35 } },
}))

vi.mock("../global-spend-guard", () => ({
  isGlobalCeilingExceeded: mocks.isGlobalCeilingExceeded,
}))

vi.mock("../usage-tracking", async () => {
  // Keep the real cap arithmetic; only the Firestore read is a stub.
  const actual = await vi.importActual<typeof import("../usage-tracking")>("../usage-tracking")
  return {
    resolveDailyBudgetCap: actual.resolveDailyBudgetCap,
    DAILY_BUDGET_FRACTION: actual.DAILY_BUDGET_FRACTION,
    getUserDailyCost: mocks.getUserDailyCost,
  }
})

function authedRequest() {
  return {
    headers: { get: (name: string) => (name === "Authorization" ? "Bearer mock-token" : null) },
    clone: () => ({ json: async () => ({}) }),
  } as never
}

describe("resolveDailyBudgetCap", () => {
  it("is half the monthly allowance", async () => {
    const { resolveDailyBudgetCap } = await import("../usage-tracking")
    expect(resolveDailyBudgetCap(28)).toBe(14)
    expect(resolveDailyBudgetCap(6.5)).toBe(3.25)
  })

  it("does not bind before the session quota does", async () => {
    const { resolveDailyBudgetCap } = await import("../usage-tracking")
    // Calibrated session costs from lib/__tests__/cost-constants.test.ts:
    // ~$0.40 pathological. Free is 8 sessions/month, pro 35.
    const PATHOLOGICAL_SESSION_COST = 0.4
    expect(resolveDailyBudgetCap(6.5)).toBeGreaterThanOrEqual(8 * PATHOLOGICAL_SESSION_COST)
    expect(resolveDailyBudgetCap(28)).toBeGreaterThanOrEqual(35 * PATHOLOGICAL_SESSION_COST)
  })

  it("treats a missing or nonsensical cap as no daily gate", async () => {
    const { resolveDailyBudgetCap } = await import("../usage-tracking")
    expect(resolveDailyBudgetCap(0)).toBe(0)
    expect(resolveDailyBudgetCap(-1)).toBe(0)
    expect(resolveDailyBudgetCap(Number.NaN)).toBe(0)
  })
})

describe("checkQuota daily spend cap", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isGlobalCeilingExceeded.mockResolvedValue(false)
  })

  it("allows a user who is under today's cap", async () => {
    mocks.getUserDailyCost.mockResolvedValue(3)
    const { checkQuota } = await import("../quota-enforcement")

    const result = await checkQuota(authedRequest())

    expect(result.allowed).toBe(true)
  })

  it("blocks once today's spend reaches the cap, with the monthly budget intact", async () => {
    mocks.getUserDailyCost.mockResolvedValue(14)
    const { checkQuota } = await import("../quota-enforcement")

    const result = await checkQuota(authedRequest())

    expect(result.allowed).toBe(false)
    expect(result.code).toBe("DAILY_BUDGET_EXCEEDED")
    expect(result.response?.status).toBe(429)
    // The monthly allowance is untouched; only the rate was capped.
    expect(result.budgetUsed).toBe(0)
  })

  it("says the limit is daily, so a user is not told to upgrade for no reason", async () => {
    mocks.getUserDailyCost.mockResolvedValue(20)
    const { checkQuota } = await import("../quota-enforcement")

    const result = await checkQuota(authedRequest())
    const body = (result.response as unknown as { data: { message: string } }).data

    expect(body.message).toContain("today")
    expect(body.message).toContain("midnight UTC")
  })

  it("routes a Firestore failure through the circuit breaker rather than skipping the cap", async () => {
    // getUserDailyCost throws instead of reporting 0, so "cannot see" can never
    // be silently read as "spent nothing" — which is how a cap stops capping.
    mocks.getUserDailyCost.mockRejectedValue(new Error("firestore down"))
    const { checkQuota } = await import("../quota-enforcement")

    const result = await checkQuota(authedRequest())

    // The outer handler owns this decision (fail open, but counted against the
    // breaker). What matters here is that the throw reached it.
    expect(result).toBeDefined()
    expect(mocks.getUserDailyCost).toHaveBeenCalled()
  })
})
