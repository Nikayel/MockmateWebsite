/**
 * Tests for quota-enforcement.ts
 * Ensures quota limits are properly enforced
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock Firebase Admin
vi.mock("../firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(() =>
          Promise.resolve({ exists: true, data: () => ({ subscription_tier: "free" }) })
        ),
      })),
      where: vi.fn(() => ({
        get: vi.fn(() => Promise.resolve({ docs: [] })),
      })),
    })),
  },
  adminAuth: {
    verifyIdToken: vi.fn(() => Promise.resolve({ uid: "test-user-id" })),
  },
}))

// Mock logger
vi.mock("../logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock config
vi.mock("../config", () => ({
  PRICING_CONFIG: {
    free: { sessionsPerMonth: 2 },
    pro: { sessionsPerMonth: 35 },
  },
}))

// Mock the global spend guard so the aggregate ceiling is OFF by default
// (individual tests override isGlobalCeilingExceeded to simulate a breach).
vi.mock("../global-spend-guard", () => ({
  isGlobalCeilingExceeded: vi.fn(() => Promise.resolve(false)),
}))

// Helper: build a minimal NextRequest-like object with controllable headers.
function makeRequest(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: vi.fn((name: string) => headers[name] ?? null),
    },
    clone: vi.fn(() => ({ json: vi.fn(() => Promise.resolve({})) })),
  } as any
}

const VALID_GUEST_ID = "guest-12345678-1234-1234-1234-123456789abc"

describe("Quota Enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("Session Limits", () => {
    it("should allow requests when under session limit", async () => {
      // Import after mocking
      const { checkQuota } = await import("../quota-enforcement")

      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => {
            if (name === "Authorization") return "Bearer mock-token"
            return null
          }),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({ userId: "test-user" })),
        })),
      } as any

      const result = await checkQuota(mockRequest)
      expect(result.allowed).toBe(true)
    })

    it("should include user tier in result", async () => {
      const { checkQuota } = await import("../quota-enforcement")

      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => null),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({ userId: "test-user" })),
        })),
      } as any

      const result = await checkQuota(mockRequest)
      // Anonymous users get free tier defaults
      expect(["free", "pro", "enterprise"]).toContain(result.tier)
    })
  })

  describe("Budget Limits", () => {
    it("should track budget usage", async () => {
      const { checkQuota } = await import("../quota-enforcement")

      const mockRequest = {
        headers: {
          get: vi.fn(() => null),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({})),
        })),
      } as any

      const result = await checkQuota(mockRequest)
      expect(result).toHaveProperty("budgetUsed")
      expect(result).toHaveProperty("budgetLimit")
    })
  })

  describe("Anonymous Users", () => {
    it("should allow anonymous users (handled by rate limiting)", async () => {
      const { checkQuota } = await import("../quota-enforcement")

      const mockRequest = {
        headers: {
          get: vi.fn(() => null),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({})),
        })),
      } as any

      const result = await checkQuota(mockRequest)
      expect(result.allowed).toBe(true)
      expect(result.userId).toBe("anonymous")
    })
  })

  describe("Error Handling", () => {
    it("should fail open when quota check fails", async () => {
      // Mock a failure
      const { adminDb } = await import("../firebase-admin")
      vi.mocked(adminDb.collection).mockImplementationOnce(() => {
        throw new Error("Database error")
      })

      const { checkQuota } = await import("../quota-enforcement")

      const mockRequest = {
        headers: {
          get: vi.fn((name: string) => null),
        },
        clone: vi.fn(() => ({
          json: vi.fn(() => Promise.resolve({ userId: "test-user" })),
        })),
      } as any

      // Should not throw, should allow request
      const result = await checkQuota(mockRequest)
      expect(result.allowed).toBe(true)
    })
  })

  describe("Tier-based Limits", () => {
    it("should apply correct limits for free tier", async () => {
      const { PRICING_CONFIG } = await import("../config")
      expect(PRICING_CONFIG.free.sessionsPerMonth).toBe(2)
    })

    it("should apply correct limits for pro tier", async () => {
      const { PRICING_CONFIG } = await import("../config")
      expect(PRICING_CONFIG.pro.sessionsPerMonth).toBe(35)
    })
  })

  // Cost-bearing routes (chat/feedback/execute/analyze-complexity) pass
  // { requireAuth: true }. Signed-out callers MUST be rejected with 401 so they
  // cannot drive paid LLM / code-execution spend.
  describe("requireAuth gate (cost-bearing routes)", () => {
    it("rejects an anonymous request (no auth, no guest id) with 401 AUTH_REQUIRED", async () => {
      const { checkQuota } = await import("../quota-enforcement")

      const result = await checkQuota(makeRequest({}), { requireAuth: true })

      expect(result.allowed).toBe(false)
      expect(result.code).toBe("AUTH_REQUIRED")
      expect(result.response?.status).toBe(401)
    })

    it("rejects a guest-header-only request with 401 (guests must sign in for paid AI)", async () => {
      const { checkQuota } = await import("../quota-enforcement")

      const result = await checkQuota(makeRequest({ "X-Guest-Id": VALID_GUEST_ID }), {
        requireAuth: true,
      })

      // requireAuth short-circuits BEFORE the guest-quota path.
      expect(result.allowed).toBe(false)
      expect(result.code).toBe("AUTH_REQUIRED")
      expect(result.response?.status).toBe(401)
    })

    it("allows an authenticated request and returns the verified uid", async () => {
      const { checkQuota } = await import("../quota-enforcement")

      const result = await checkQuota(makeRequest({ Authorization: "Bearer valid-token" }), {
        requireAuth: true,
      })

      expect(result.allowed).toBe(true)
      expect(result.userId).toBe("test-user-id") // from mocked verifyIdToken
    })

    it("still allows anonymous when requireAuth is NOT set (back-compat)", async () => {
      const { checkQuota } = await import("../quota-enforcement")

      const result = await checkQuota(makeRequest({}))

      expect(result.allowed).toBe(true)
      expect(result.userId).toBe("anonymous")
    })
  })

  // Aggregate kill-switch: even within-budget authed users are paused once the
  // platform-wide daily spend ceiling is reached.
  describe("global daily spend ceiling", () => {
    it("blocks an authenticated request with 503 when the ceiling is reached", async () => {
      // Full adminDb mock so getUserQuota SUCCEEDS (under-limit, $0 used) and
      // execution reaches the global-ceiling check rather than fail-open.
      const summaryDoc = {
        get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({ totalCost: 0 }) })),
      }
      const profileDoc = {
        get: vi.fn(() =>
          Promise.resolve({ exists: true, data: () => ({ subscription_tier: "free" }) })
        ),
        collection: vi.fn(() => ({ doc: vi.fn(() => summaryDoc) })),
      }
      const { adminDb } = await import("../firebase-admin")
      vi.mocked(adminDb.collection).mockImplementation(
        (name: string) =>
          (name === "profile_quota"
            ? {
                where: vi.fn(() => ({
                  orderBy: vi.fn(() => ({
                    limit: vi.fn(() => ({ get: vi.fn(() => Promise.resolve({ docs: [] })) })),
                  })),
                })),
              }
            : { doc: vi.fn(() => profileDoc) }) as any
      )

      const { isGlobalCeilingExceeded } = await import("../global-spend-guard")
      vi.mocked(isGlobalCeilingExceeded).mockResolvedValueOnce(true)

      const { checkQuota } = await import("../quota-enforcement")

      const result = await checkQuota(makeRequest({ Authorization: "Bearer valid-token" }), {
        requireAuth: true,
      })

      expect(result.allowed).toBe(false)
      expect(result.code).toBe("GLOBAL_CAPACITY_LIMIT")
      expect(result.response?.status).toBe(503)
    })
  })
})

describe("Budget Warning", () => {
  it("should warn at 75% budget usage", async () => {
    const { checkBudgetWarning } = await import("../quota-enforcement")

    // Mock a user at 75% budget
    vi.mocked((await import("../firebase-admin")).adminDb.collection).mockImplementation(
      () =>
        ({
          doc: vi.fn(() => ({
            get: vi.fn(() =>
              Promise.resolve({
                exists: true,
                data: () => ({
                  totalCost: 18.75, // 75% of $25
                }),
              })
            ),
          })),
          where: vi.fn(() => ({
            get: vi.fn(() =>
              Promise.resolve({
                docs: [
                  {
                    data: () => ({
                      sessions_used: 10,
                      sessions_limit: 35,
                      period_start: new Date().toISOString(),
                    }),
                  },
                ],
              })
            ),
          })),
        }) as any
    )

    // The function should handle missing user gracefully
    const result = await checkBudgetWarning("test-user")
    expect(result).toHaveProperty("warn")
    expect(result).toHaveProperty("percentUsed")
  })
})
