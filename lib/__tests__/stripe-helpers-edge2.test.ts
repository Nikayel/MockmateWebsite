import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// EDGE-2 regression: a transient Stripe error (timeout/429) during
// syncSubscriptionFromStripe must NOT auto-downgrade an active Pro user to Free.
// A genuine canceled subscription must still downgrade.

const profileGet = vi.fn()
const profileSet = vi.fn()
const quotaGet = vi.fn()
const quotaAdd = vi.fn()

const subRetrieve = vi.fn()
const subList = vi.fn()
const custList = vi.fn()

function buildAdminDb() {
  const profileRef = { get: profileGet, set: profileSet }
  const quotaQuery: Record<string, unknown> = {}
  quotaQuery.where = vi.fn(() => quotaQuery)
  quotaQuery.orderBy = vi.fn(() => quotaQuery)
  quotaQuery.limit = vi.fn(() => quotaQuery)
  quotaQuery.get = quotaGet
  quotaQuery.add = quotaAdd
  return {
    collection: vi.fn((name: string) => {
      if (name === "profiles") return { doc: vi.fn(() => profileRef) }
      return quotaQuery
    }),
  }
}

async function importHelper() {
  vi.resetModules()
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123")

  const stripeInstance = {
    subscriptions: { retrieve: subRetrieve, list: subList },
    customers: { list: custList },
  }
  vi.doMock("stripe", () => ({ default: vi.fn(() => stripeInstance) }))
  vi.doMock("@/lib/firebase-admin", () => ({ adminDb: buildAdminDb() }))
  vi.doMock("@/lib/firestore-helpers", () => ({
    calculateBillingPeriod: vi.fn(() => ({
      periodStart: new Date("2025-01-01T00:00:00.000Z"),
      periodEnd: new Date("2025-02-01T00:00:00.000Z"),
    })),
  }))
  vi.doMock("@/lib/logger", () => ({
    logger: {
      child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), payment: vi.fn() }),
      payment: vi.fn(),
    },
  }))

  return import("@/lib/stripe-helpers")
}

function downgradedToFree() {
  return profileSet.mock.calls.some(
    ([payload]) => payload && (payload as { subscription_tier?: string }).subscription_tier === "free"
  )
}

describe("syncSubscriptionFromStripe — EDGE-2", () => {
  beforeEach(() => {
    profileGet.mockReset()
    profileSet.mockReset().mockResolvedValue(undefined)
    quotaGet.mockReset().mockResolvedValue({ docs: [] })
    quotaAdd.mockReset().mockResolvedValue(undefined)
    subRetrieve.mockReset()
    subList.mockReset().mockResolvedValue({ data: [] })
    custList.mockReset().mockResolvedValue({ data: [] })
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("does NOT downgrade an active Pro user when the Stripe lookup throws", async () => {
    const proProfile = {
      subscription_tier: "pro",
      subscription_type: "monthly",
      stripe_subscription_id: "sub_123",
      created_at: "2025-01-01T00:00:00.000Z",
      // no email / customer id → only the retrieve lookup runs, which throws
    }
    profileGet.mockResolvedValue({ exists: true, data: () => proProfile })
    subRetrieve.mockRejectedValue(new Error("stripe timeout"))

    const { syncSubscriptionFromStripe } = await importHelper()
    await syncSubscriptionFromStripe("user_1")

    expect(subRetrieve).toHaveBeenCalledTimes(1)
    expect(downgradedToFree()).toBe(false)
  })

  it("still downgrades when Stripe reports the subscription is canceled", async () => {
    const proProfile = {
      subscription_tier: "pro",
      subscription_type: "monthly",
      stripe_subscription_id: "sub_123",
      created_at: "2025-01-01T00:00:00.000Z",
    }
    profileGet.mockResolvedValue({ exists: true, data: () => proProfile })
    subRetrieve.mockResolvedValue({
      id: "sub_123",
      status: "canceled",
      customer: "cus_1",
      items: { data: [{ current_period_end: 1_800_000_000 }] },
    })

    const { syncSubscriptionFromStripe } = await importHelper()
    await syncSubscriptionFromStripe("user_1")

    expect(downgradedToFree()).toBe(true)
  })
})
