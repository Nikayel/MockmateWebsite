import { beforeEach, describe, expect, it, vi } from "vitest"
import type { Profile } from "@/lib/types"

const mocks = vi.hoisted(() => ({
  profileGet: vi.fn(),
  getUserQuota: vi.fn(),
  syncSubscriptionFromStripe: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ get: mocks.profileGet })),
    })),
  },
}))

vi.mock("@/lib/quota-enforcement", () => ({
  getUserQuota: mocks.getUserQuota,
}))

vi.mock("@/lib/stripe-helpers", () => ({
  syncSubscriptionFromStripe: mocks.syncSubscriptionFromStripe,
}))

vi.mock("@/lib/logger", () => ({
  logger: { error: mocks.loggerError },
}))

function profile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: "user-1",
    email: "developer@example.com",
    subscription_tier: "free",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

describe("getAccountOverview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.profileGet.mockResolvedValue({ exists: true, data: () => profile() })
    mocks.getUserQuota.mockResolvedValue({
      sessionsUsed: 2,
      sessionsLimit: 100,
      freeOpensRemaining: 0,
      periodEnd: "2026-10-01T00:00:00.000Z",
    })
  })

  it("reconciles a linked stale Free profile before resolving its quota", async () => {
    const staleProfile = profile({ stripe_customer_id: "cus_123" })
    const reconciledProfile = profile({
      subscription_tier: "pro",
      subscription_status: "active",
      stripe_customer_id: "cus_123",
    })
    mocks.profileGet.mockResolvedValue({ exists: true, data: () => staleProfile })
    mocks.syncSubscriptionFromStripe.mockResolvedValue(reconciledProfile)
    const { getAccountOverview } = await import("./overview.server")

    const result = await getAccountOverview("user-1")

    expect(mocks.syncSubscriptionFromStripe).toHaveBeenCalledWith("user-1")
    expect(mocks.getUserQuota).toHaveBeenCalledWith("user-1", reconciledProfile)
    expect(result).toMatchObject({
      status: "ready",
      overview: { profile: { subscription_tier: "pro" }, usage: { used: 2, limit: 100 } },
    })
  })

  it("returns a missing-profile state instead of manufacturing a Free entitlement", async () => {
    mocks.profileGet.mockResolvedValue({ exists: false })
    const { getAccountOverview } = await import("./overview.server")

    const result = await getAccountOverview("user-1")

    expect(result.status).toBe("missing_profile")
    expect(mocks.getUserQuota).not.toHaveBeenCalled()
  })

  it("returns an unavailable state when the quota cannot be resolved", async () => {
    mocks.getUserQuota.mockResolvedValue(null)
    const { getAccountOverview } = await import("./overview.server")

    const result = await getAccountOverview("user-1")

    expect(result.status).toBe("unavailable")
    expect(mocks.loggerError).toHaveBeenCalledWith(
      "Account overview quota lookup failed",
      expect.objectContaining({ userId: "user-1" })
    )
  })
})
