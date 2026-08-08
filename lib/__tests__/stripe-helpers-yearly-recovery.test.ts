import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * Yearly is the DEFAULT plan and is bought as a one-time payment, so it creates no Stripe
 * subscription and every subscription-shaped safety net misses it. These cover the recovery path
 * that grants Pro straight from the checkout session, and — just as important — the guards that stop
 * it from being used to mint free years.
 */

const profileGet = vi.fn()
const profileSet = vi.fn()
const quotaGet = vi.fn()
const quotaAdd = vi.fn()

const sessionRetrieve = vi.fn()
const sessionList = vi.fn()

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

function profileSnapshot(data: Record<string, unknown> | null) {
  return {
    exists: data !== null,
    data: () => data,
    get: (field: string) => (data as Record<string, unknown> | null)?.[field],
  }
}

async function importHelper() {
  vi.resetModules()
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_123")

  profileGet.mockReset()
  profileSet.mockReset().mockResolvedValue(undefined)
  quotaGet.mockReset().mockResolvedValue({ docs: [] })
  quotaAdd.mockReset().mockResolvedValue({ id: "quota_1" })
  sessionRetrieve.mockReset()
  sessionList.mockReset()

  const stripeInstance = {
    subscriptions: { retrieve: vi.fn(), list: vi.fn() },
    customers: { list: vi.fn() },
    checkout: { sessions: { retrieve: sessionRetrieve, list: sessionList } },
  }
  vi.doMock("stripe", () => ({ default: vi.fn(() => stripeInstance) }))
  vi.doMock("@/lib/firebase-admin", () => ({ adminDb: buildAdminDb() }))
  vi.doMock("@/lib/firestore-helpers", () => ({
    calculateBillingPeriod: vi.fn(() => ({
      periodStart: new Date("2026-01-01T00:00:00.000Z"),
      periodEnd: new Date("2026-02-01T00:00:00.000Z"),
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

const DAY_MS = 24 * 60 * 60 * 1000

function paidYearlySession(overrides: Record<string, unknown> = {}) {
  return {
    id: "cs_test_1",
    mode: "payment",
    payment_status: "paid",
    created: Math.floor((Date.now() - DAY_MS) / 1000),
    customer: "cus_1",
    client_reference_id: "user_1",
    metadata: { userId: "user_1", planType: "yearly", platform: "website" },
    ...overrides,
  }
}

function grantedPayload() {
  return profileSet.mock.calls.find(
    ([payload]) => (payload as { subscription_tier?: string })?.subscription_tier === "pro"
  )?.[0] as Record<string, unknown> | undefined
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe("recoverYearlyProFromSessionId", () => {
  it("grants a year of Pro from a paid yearly checkout session", async () => {
    const { recoverYearlyProFromSessionId } = await importHelper()
    profileGet.mockResolvedValue(
      profileSnapshot({ subscription_tier: "free", created_at: "2026-01-01T00:00:00.000Z" })
    )
    const session = paidYearlySession()
    sessionRetrieve.mockResolvedValue(session)

    const outcome = await recoverYearlyProFromSessionId("user_1", "cs_test_1")

    expect(outcome.status).toBe("granted")
    const payload = grantedPayload()
    expect(payload?.subscription_type).toBe("yearly")
    expect(payload?.yearly_grant_session_id).toBe("cs_test_1")
    // The term runs from the PURCHASE, not from the moment of recovery, so a late rescue cannot
    // hand out more than the year that was paid for.
    const purchasedAt = new Date(session.created * 1000)
    const expectedEnd = new Date(purchasedAt)
    expectedEnd.setFullYear(expectedEnd.getFullYear() + 1)
    expect(payload?.subscription_current_period_end).toBe(expectedEnd.toISOString())
  })

  it("refuses a session that belongs to a different user", async () => {
    const { recoverYearlyProFromSessionId } = await importHelper()
    profileGet.mockResolvedValue(profileSnapshot({ subscription_tier: "free" }))
    sessionRetrieve.mockResolvedValue(
      paidYearlySession({
        metadata: { userId: "someone_else", planType: "yearly" },
        client_reference_id: "someone_else",
      })
    )

    const outcome = await recoverYearlyProFromSessionId("user_1", "cs_test_1")

    expect(outcome.status).toBe("not_eligible")
    expect(grantedPayload()).toBeUndefined()
  })

  it("refuses a session that was never paid", async () => {
    const { recoverYearlyProFromSessionId } = await importHelper()
    profileGet.mockResolvedValue(profileSnapshot({ subscription_tier: "free" }))
    sessionRetrieve.mockResolvedValue(paidYearlySession({ payment_status: "unpaid" }))

    const outcome = await recoverYearlyProFromSessionId("user_1", "cs_test_1")

    expect(outcome.status).toBe("not_eligible")
    expect(grantedPayload()).toBeUndefined()
  })

  it("refuses an old session, so last year's id cannot buy another year", async () => {
    const { recoverYearlyProFromSessionId } = await importHelper()
    profileGet.mockResolvedValue(profileSnapshot({ subscription_tier: "free" }))
    sessionRetrieve.mockResolvedValue(
      paidYearlySession({ created: Math.floor((Date.now() - 400 * DAY_MS) / 1000) })
    )

    const outcome = await recoverYearlyProFromSessionId("user_1", "cs_test_1")

    expect(outcome.status).toBe("not_eligible")
    expect(grantedPayload()).toBeUndefined()
  })

  it("is a no-op when this session was already redeemed", async () => {
    const { recoverYearlyProFromSessionId } = await importHelper()
    profileGet.mockResolvedValue(
      profileSnapshot({ subscription_tier: "free", yearly_grant_session_id: "cs_test_1" })
    )
    sessionRetrieve.mockResolvedValue(paidYearlySession())

    const outcome = await recoverYearlyProFromSessionId("user_1", "cs_test_1")

    expect(outcome.status).toBe("already_active")
    expect(profileSet).not.toHaveBeenCalled()
  })

  it("does not extend a term the webhook already granted", async () => {
    const { recoverYearlyProFromSessionId } = await importHelper()
    profileGet.mockResolvedValue(
      profileSnapshot({
        subscription_tier: "pro",
        subscription_current_period_end: new Date(Date.now() + 300 * DAY_MS).toISOString(),
      })
    )
    sessionRetrieve.mockResolvedValue(paidYearlySession())

    const outcome = await recoverYearlyProFromSessionId("user_1", "cs_test_1")

    expect(outcome.status).toBe("already_active")
    expect(profileSet).not.toHaveBeenCalled()
  })
})

describe("recoverYearlyProFromRecentCheckout", () => {
  it("finds the paid yearly session behind a Free profile and grants it", async () => {
    const { recoverYearlyProFromRecentCheckout } = await importHelper()
    profileGet.mockResolvedValue(
      profileSnapshot({
        subscription_tier: "free",
        stripe_customer_id: "cus_1",
        created_at: "2026-01-01T00:00:00.000Z",
      })
    )
    sessionList.mockResolvedValue({
      data: [
        { id: "cs_old", mode: "subscription", payment_status: "paid", metadata: {} },
        paidYearlySession(),
      ],
    })

    const outcome = await recoverYearlyProFromRecentCheckout("user_1")

    expect(outcome.status).toBe("granted")
    expect(sessionList).toHaveBeenCalledWith({ customer: "cus_1", limit: 20 })
    expect(grantedPayload()?.subscription_type).toBe("yearly")
  })

  it("never touches a profile that is not on the Free tier", async () => {
    const { recoverYearlyProFromRecentCheckout } = await importHelper()
    profileGet.mockResolvedValue(
      profileSnapshot({ subscription_tier: "pro", stripe_customer_id: "cus_1" })
    )

    const outcome = await recoverYearlyProFromRecentCheckout("user_1")

    expect(outcome.status).toBe("already_active")
    expect(sessionList).not.toHaveBeenCalled()
    expect(profileSet).not.toHaveBeenCalled()
  })

  it("cannot act on a profile with no Stripe customer id", async () => {
    const { recoverYearlyProFromRecentCheckout } = await importHelper()
    profileGet.mockResolvedValue(profileSnapshot({ subscription_tier: "free" }))

    const outcome = await recoverYearlyProFromRecentCheckout("user_1")

    expect(outcome.status).toBe("not_eligible")
    expect(sessionList).not.toHaveBeenCalled()
  })
})
