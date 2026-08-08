import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * This route is the only self-service path back from a failed checkout webhook, and after the yearly
 * fix it also grants entitlement from a client-supplied checkout session id. That makes its auth
 * boundary worth pinning: the session id may choose WHICH session to look at, never WHOSE it is.
 */

const verifyAuth = vi.fn()
const syncSubscriptionFromStripe = vi.fn()
const recoverYearlyProFromSessionId = vi.fn()

async function importRoute() {
  vi.resetModules()
  verifyAuth.mockReset()
  syncSubscriptionFromStripe.mockReset().mockResolvedValue({
    subscription_tier: "pro",
    subscription_status: "active",
    subscription_type: "yearly",
  })
  recoverYearlyProFromSessionId.mockReset().mockResolvedValue({ status: "already_active" })

  vi.doMock("@/lib/auth-helpers", () => ({ verifyAuth }))
  vi.doMock("@/lib/stripe-helpers", () => ({
    syncSubscriptionFromStripe,
    recoverYearlyProFromSessionId,
  }))
  vi.doMock("@/lib/logger", () => ({
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  }))

  return import("./route")
}

function request(body: Record<string, unknown>) {
  return { json: async () => body } as never
}

function response(res: unknown) {
  return res as { status: number; data: Record<string, any> }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("/api/sync-subscription", () => {
  it("rejects an unauthenticated caller", async () => {
    const { POST } = await importRoute()
    verifyAuth.mockResolvedValue({ userId: null })

    const res = response(await POST(request({ sessionId: "cs_test_1" })))

    expect(res.status).toBe(401)
    expect(recoverYearlyProFromSessionId).not.toHaveBeenCalled()
  })

  it("refuses to sync somebody else's account", async () => {
    const { POST } = await importRoute()
    verifyAuth.mockResolvedValue({ userId: "user_1" })

    const res = response(await POST(request({ userId: "victim", sessionId: "cs_test_1" })))

    expect(res.status).toBe(403)
    expect(recoverYearlyProFromSessionId).not.toHaveBeenCalled()
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })

  it("redeems the checkout session against the VERIFIED uid", async () => {
    const { POST } = await importRoute()
    verifyAuth.mockResolvedValue({ userId: "user_1" })
    recoverYearlyProFromSessionId.mockResolvedValue({
      status: "granted",
      periodEnd: "2027-01-01T00:00:00.000Z",
    })

    const res = response(await POST(request({ userId: "user_1", sessionId: "cs_test_1" })))

    expect(recoverYearlyProFromSessionId).toHaveBeenCalledWith("user_1", "cs_test_1")
    expect(res.data.yearlyRecovery).toBe("granted")
    // The regular sync still runs, so a monthly subscriber is unaffected by this path.
    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith("user_1")
  })

  it("skips recovery entirely when no session id is supplied", async () => {
    const { POST } = await importRoute()
    verifyAuth.mockResolvedValue({ userId: "user_1" })

    const res = response(await POST(request({ userId: "user_1" })))

    expect(recoverYearlyProFromSessionId).not.toHaveBeenCalled()
    expect(res.data.success).toBe(true)
  })

  it("ignores a non-string session id instead of handing it to Stripe", async () => {
    const { POST } = await importRoute()
    verifyAuth.mockResolvedValue({ userId: "user_1" })

    await POST(request({ userId: "user_1", sessionId: { evil: true } }))

    expect(recoverYearlyProFromSessionId).not.toHaveBeenCalled()
  })

  it("returns subscription_type so the success page can value the conversion", async () => {
    const { POST } = await importRoute()
    verifyAuth.mockResolvedValue({ userId: "user_1" })

    const res = response(await POST(request({ userId: "user_1" })))

    expect(res.data.profile.subscription_type).toBe("yearly")
  })

  it("still syncs when the session turns out not to be redeemable", async () => {
    const { POST } = await importRoute()
    verifyAuth.mockResolvedValue({ userId: "user_1" })
    recoverYearlyProFromSessionId.mockResolvedValue({
      status: "not_eligible",
      reason: "session belongs to a different user",
    })

    const res = response(await POST(request({ userId: "user_1", sessionId: "cs_stolen" })))

    expect(res.status).toBe(200)
    expect(syncSubscriptionFromStripe).toHaveBeenCalledWith("user_1")
  })
})
