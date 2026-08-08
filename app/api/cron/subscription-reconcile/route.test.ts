import { afterEach, describe, expect, it, vi } from "vitest"

const syncSubscriptionFromStripe = vi.fn()
const recoverYearlyProFromRecentCheckout = vi.fn()

type FakeProfileDoc = { id: string; fields?: Record<string, unknown> }

/**
 * Candidate sets for the cron's three passes, keyed the way the route filters for them.
 *  - monthly: Free profiles carrying a stripe_subscription_id
 *  - labelledYearly: Free profiles the webhook already labelled subscription_type = "yearly"
 *  - customerScan: every profile with a stripe_customer_id (the route narrows these in memory)
 */
interface CandidateSets {
  monthly?: FakeProfileDoc[]
  labelledYearly?: FakeProfileDoc[]
  customerScan?: FakeProfileDoc[]
  /** Passes whose query should reject, standing in for an undeployed composite index. */
  failing?: Array<"monthly" | "labelledYearly" | "customerScan">
}

function makeDoc(doc: FakeProfileDoc) {
  return {
    id: doc.id,
    get: (field: string) => doc.fields?.[field],
    data: () => doc.fields ?? {},
  }
}

function buildProfilesCollection(sets: CandidateSets) {
  const build = (filters: Array<[string, string, unknown]>) => ({
    where(field: string, op: string, value: unknown) {
      return build([...filters, [field, op, value]])
    },
    limit() {
      return this
    },
    async get() {
      const has = (field: string) => filters.some(([f]) => f === field)
      const pass = has("stripe_subscription_id")
        ? "monthly"
        : has("subscription_type")
          ? "labelledYearly"
          : "customerScan"
      if (sets.failing?.includes(pass)) {
        throw new Error(`FAILED_PRECONDITION: The query requires an index (${pass})`)
      }
      const docs = (sets[pass] ?? []).map(makeDoc)
      return { size: docs.length, docs }
    },
  })
  return build([])
}

async function importRoute(cronSecret: string | undefined, sets: CandidateSets) {
  vi.resetModules()
  vi.unstubAllEnvs()
  if (cronSecret) vi.stubEnv("CRON_SECRET", cronSecret)

  syncSubscriptionFromStripe.mockReset()
  recoverYearlyProFromRecentCheckout.mockReset().mockResolvedValue({ status: "not_eligible" })

  vi.doMock("@/lib/firebase-admin", () => ({
    adminDb: { collection: vi.fn(() => buildProfilesCollection(sets)) },
  }))
  vi.doMock("@/lib/stripe-helpers", () => ({
    syncSubscriptionFromStripe,
    recoverYearlyProFromRecentCheckout,
  }))
  vi.doMock("@/lib/logger", () => ({
    logger: { child: () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }) },
  }))

  return import("./route")
}

function post(dryRun = false) {
  const url = `http://localhost/api/cron/subscription-reconcile${dryRun ? "?dryRun=true" : ""}`
  return new Request(url, { method: "POST", headers: { authorization: "Bearer secret" } }) as never
}

function body(res: unknown) {
  return (res as { data: Record<string, number> }).data
}

describe("/api/cron/subscription-reconcile", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it("rejects requests without the cron secret", async () => {
    const { POST } = await importRoute("secret", { monthly: [{ id: "u1" }] })
    const res = await POST(new Request("http://localhost/api/cron/subscription-reconcile") as never)
    expect(res.status).toBe(401)
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })

  it("returns a server error when CRON_SECRET is missing", async () => {
    const { POST } = await importRoute(undefined, {})
    const res = await POST(new Request("http://localhost/api/cron/subscription-reconcile") as never)
    expect(res.status).toBe(500)
  })

  it("recovers stuck-on-Free users whose Stripe subscription is active", async () => {
    const { POST } = await importRoute("secret", { monthly: [{ id: "u1" }, { id: "u2" }] })
    // Set return values AFTER importRoute (which resets the mock).
    syncSubscriptionFromStripe
      .mockResolvedValueOnce({ subscription_tier: "pro" }) // recovered
      .mockResolvedValueOnce({ subscription_tier: "free" }) // genuinely free, no change
    const res = await POST(post())
    expect(res.status).toBe(200)
    expect(body(res).checked).toBe(2)
    expect(body(res).recovered).toBe(1)
    expect(syncSubscriptionFromStripe).toHaveBeenCalledTimes(2)
  })

  it("does not abort the batch when one user's sync throws", async () => {
    const { POST } = await importRoute("secret", { monthly: [{ id: "u1" }, { id: "u2" }] })
    syncSubscriptionFromStripe
      .mockRejectedValueOnce(new Error("stripe blip"))
      .mockResolvedValueOnce({ subscription_tier: "pro" })
    const res = await POST(post())
    expect(body(res).recovered).toBe(1)
    expect(syncSubscriptionFromStripe).toHaveBeenCalledTimes(2)
  })

  it("dryRun counts candidates without syncing", async () => {
    const { POST } = await importRoute("secret", { monthly: [{ id: "u1" }, { id: "u2" }] })
    const res = await POST(post(true))
    expect(body(res).recovered).toBe(0)
    expect(body(res).wouldCheck).toBe(2)
    expect(syncSubscriptionFromStripe).not.toHaveBeenCalled()
  })

  it("recovers a yearly buyer who has only a Stripe customer id to their name", async () => {
    // The stranded-yearly case: no subscription id, no subscription_type, because the webhook that
    // would have written both never ran. The customer id is the only remaining link to the payment.
    const { POST } = await importRoute("secret", {
      customerScan: [
        { id: "yearly_user", fields: { subscription_tier: "free" } },
        { id: "churned_pro", fields: { subscription_tier: "pro" } },
      ],
    })
    recoverYearlyProFromRecentCheckout.mockResolvedValue({
      status: "granted",
      periodEnd: "2027-01-01T00:00:00.000Z",
    })

    const res = await POST(post())

    expect(recoverYearlyProFromRecentCheckout).toHaveBeenCalledTimes(1)
    expect(recoverYearlyProFromRecentCheckout).toHaveBeenCalledWith("yearly_user")
    expect(body(res).recovered).toBe(1)
  })

  it("leaves monthly candidates to the subscription sync rather than the yearly scan", async () => {
    const { POST } = await importRoute("secret", {
      monthly: [{ id: "u1" }],
      customerScan: [{ id: "u1", fields: { subscription_tier: "free" } }],
    })
    syncSubscriptionFromStripe.mockResolvedValue({ subscription_tier: "pro" })

    const res = await POST(post())

    expect(recoverYearlyProFromRecentCheckout).not.toHaveBeenCalled()
    expect(body(res).checked).toBe(1)
  })

  it("keeps sweeping when one candidate query fails", async () => {
    // A failing pass (an undeployed composite index, say) must not take the others down with it:
    // this job is the last thing standing between a charged customer and a permanent Free account.
    const { POST } = await importRoute("secret", {
      failing: ["monthly"],
      customerScan: [{ id: "yearly_user", fields: { subscription_tier: "free" } }],
    })
    recoverYearlyProFromRecentCheckout.mockResolvedValue({
      status: "granted",
      periodEnd: "2027-01-01T00:00:00.000Z",
    })

    const res = await POST(post())

    expect(res.status).toBe(200)
    expect(body(res).recovered).toBe(1)
  })
})
