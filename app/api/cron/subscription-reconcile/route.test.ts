import { afterEach, describe, expect, it, vi } from "vitest"

const mockGet = vi.fn()
const syncSubscriptionFromStripe = vi.fn()

type FakeProfileDoc = { id: string }

async function importRoute(cronSecret: string | undefined, docs: FakeProfileDoc[]) {
  vi.resetModules()
  vi.unstubAllEnvs()
  if (cronSecret) vi.stubEnv("CRON_SECRET", cronSecret)

  mockGet.mockReset().mockResolvedValue({ size: docs.length, docs })
  syncSubscriptionFromStripe.mockReset()

  const query: Record<string, unknown> = {}
  query.where = vi.fn(() => query)
  query.limit = vi.fn(() => query)
  query.get = mockGet

  vi.doMock("@/lib/firebase-admin", () => ({
    adminDb: { collection: vi.fn(() => query) },
  }))
  vi.doMock("@/lib/stripe-helpers", () => ({ syncSubscriptionFromStripe }))
  vi.doMock("@/lib/logger", () => ({
    logger: { child: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }) },
  }))

  return import("./route")
}

function post(dryRun = false) {
  const url = `http://localhost/api/cron/subscription-reconcile${dryRun ? "?dryRun=true" : ""}`
  return new Request(url, { method: "POST", headers: { authorization: "Bearer secret" } }) as never
}

describe("/api/cron/subscription-reconcile", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("rejects requests without the cron secret", async () => {
    const { POST } = await importRoute("secret", [{ id: "u1" }])
    const res = await POST(new Request("http://localhost/api/cron/subscription-reconcile") as never)
    expect(res.status).toBe(401)
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })

  it("returns a server error when CRON_SECRET is missing", async () => {
    const { POST } = await importRoute(undefined, [])
    const res = await POST(new Request("http://localhost/api/cron/subscription-reconcile") as never)
    expect(res.status).toBe(500)
  })

  it("recovers stuck-on-Free users whose Stripe subscription is active", async () => {
    const { POST } = await importRoute("secret", [{ id: "u1" }, { id: "u2" }])
    // Set return values AFTER importRoute (which resets the mock).
    syncSubscriptionFromStripe
      .mockResolvedValueOnce({ subscription_tier: "pro" }) // recovered
      .mockResolvedValueOnce({ subscription_tier: "free" }) // genuinely free, no change
    const res = await POST(post())
    const data = (res as { data: { checked: number; recovered: number } }).data
    expect(res.status).toBe(200)
    expect(data.checked).toBe(2)
    expect(data.recovered).toBe(1)
    expect(syncSubscriptionFromStripe).toHaveBeenCalledTimes(2)
  })

  it("does not abort the batch when one user's sync throws", async () => {
    const { POST } = await importRoute("secret", [{ id: "u1" }, { id: "u2" }])
    syncSubscriptionFromStripe
      .mockRejectedValueOnce(new Error("stripe blip"))
      .mockResolvedValueOnce({ subscription_tier: "pro" })
    const res = await POST(post())
    const data = (res as { data: { recovered: number } }).data
    expect(data.recovered).toBe(1)
    expect(syncSubscriptionFromStripe).toHaveBeenCalledTimes(2)
  })

  it("dryRun counts candidates without syncing", async () => {
    const { POST } = await importRoute("secret", [{ id: "u1" }, { id: "u2" }])
    const res = await POST(post(true))
    const data = (res as { data: { recovered: number; wouldCheck: number } }).data
    expect(data.recovered).toBe(0)
    expect(data.wouldCheck).toBe(2)
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })
})
