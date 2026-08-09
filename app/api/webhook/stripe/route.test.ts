/**
 * Focused tests for the money-path behaviors of the Stripe webhook.
 *
 * This route is the only thing that turns a payment into an entitlement, and it had no tests. These
 * cover the failures that cost money silently: an event deduplicating itself out of existence, a
 * first declined card revoking access, and a refund that downgrades but keeps charging.
 */

import { afterEach, describe, expect, it, vi } from "vitest"

// ---------------------------------------------------------------------------
// Minimal in-memory Firestore, sufficient for the paths under test.
// ---------------------------------------------------------------------------

type DocData = Record<string, any>

let store: Map<string, DocData>
let autoIdCounter = 0

function docSnapshot(path: string, id: string) {
  const data = store.get(path)
  return {
    exists: data !== undefined,
    id,
    ref: makeDoc(path, id),
    data: () => data,
    get: (field: string) => data?.[field],
  }
}

function makeDoc(path: string, id: string) {
  return {
    id,
    get ref() {
      return this
    },
    async get() {
      return docSnapshot(path, id)
    },
    async set(data: DocData, options?: { merge?: boolean }) {
      const previous = options?.merge ? (store.get(path) ?? {}) : {}
      store.set(path, { ...previous, ...data })
    },
    async create(data: DocData) {
      if (store.has(path)) {
        const error = new Error("ALREADY_EXISTS: entity already exists")
        throw error
      }
      store.set(path, { ...data })
    },
    async update(data: DocData) {
      store.set(path, { ...(store.get(path) ?? {}), ...data })
    },
    async delete() {
      store.delete(path)
    },
  }
}

function makeCollection(name: string, filters: Array<[string, string, unknown]> = []) {
  return {
    doc(id?: string) {
      const key = id ?? `auto-${autoIdCounter++}`
      return makeDoc(`${name}/${key}`, key)
    },
    where(field: string, op: string, value: unknown) {
      return makeCollection(name, [...filters, [field, op, value]])
    },
    limit() {
      return this
    },
    async add(data: DocData) {
      const key = `auto-${autoIdCounter++}`
      store.set(`${name}/${key}`, data)
      return makeDoc(`${name}/${key}`, key)
    },
    async get() {
      const docs = [...store.entries()]
        .filter(([key]) => key.startsWith(`${name}/`))
        .filter(([, value]) =>
          filters.every(([field, op, expected]) =>
            op === "==" ? value[field] === expected : value[field] !== expected
          )
        )
        .map(([key, value]) => {
          const id = key.slice(name.length + 1)
          return {
            id,
            ref: makeDoc(key, id),
            data: () => value,
            get: (field: string) => value[field],
          }
        })
      return { empty: docs.length === 0, size: docs.length, docs }
    },
  }
}

// ---------------------------------------------------------------------------
// Stripe mock
// ---------------------------------------------------------------------------

const stripeMock = {
  webhooks: { constructEvent: vi.fn() },
  subscriptions: { retrieve: vi.fn(), cancel: vi.fn() },
  customers: { retrieve: vi.fn(), list: vi.fn(), create: vi.fn() },
  charges: { retrieve: vi.fn() },
  paymentIntents: { retrieve: vi.fn() },
}

const updateQuotaForSubscriptionTierAdmin = vi.fn()
const sendPaymentFailedEmail = vi.fn()

async function importRoute() {
  vi.resetModules()
  store = new Map()
  autoIdCounter = 0

  for (const group of Object.values(stripeMock)) {
    for (const fn of Object.values(group)) fn.mockReset()
  }
  updateQuotaForSubscriptionTierAdmin.mockReset().mockResolvedValue(undefined)
  sendPaymentFailedEmail.mockReset().mockResolvedValue(undefined)

  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_mock")
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_mock")

  vi.doMock("stripe", () => ({
    default: class {
      webhooks = stripeMock.webhooks
      subscriptions = stripeMock.subscriptions
      customers = stripeMock.customers
      charges = stripeMock.charges
      paymentIntents = stripeMock.paymentIntents
    },
  }))
  vi.doMock("@/lib/firebase-admin", () => ({
    adminDb: {
      collection: (name: string) => makeCollection(name),
      runTransaction: async (fn: (t: unknown) => Promise<unknown>) => fn({}),
    },
  }))
  vi.doMock("@/lib/stripe-helpers", () => ({ updateQuotaForSubscriptionTierAdmin }))
  vi.doMock("@/lib/email", () => ({
    sendPaymentFailedEmail,
    sendSubscriptionConfirmationEmail: vi.fn(),
    sendSubscriptionCancellationEmail: vi.fn(),
    sendTrialEndingEmail: vi.fn(),
  }))
  vi.doMock("@/lib/analytics-server", () => ({ trackEventServer: vi.fn() }))
  vi.doMock("@/lib/referrals", () => ({
    markReferralConverted: vi.fn(),
    voidReferralRewards: vi.fn(),
    voidReferrerConversionRewards: vi.fn(),
  }))
  vi.doMock("@/lib/logger", () => {
    const child = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    return {
      logger: {
        child: () => child,
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        payment: vi.fn(),
      },
    }
  })

  return import("./route")
}

function webhookRequest() {
  return {
    text: async () => "{}",
    headers: { get: (name: string) => (name === "stripe-signature" ? "sig" : null) },
  } as never
}

function stripeEvent(type: string, object: DocData, id = "evt_1", createdAgoSeconds = 0) {
  return {
    id,
    type,
    created: Math.floor(Date.now() / 1000) - createdAgoSeconds,
    request: { idempotency_key: null },
    data: { object },
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

/**
 * Stripe retries a failing webhook with exponential backoff for up to three days, and every retry
 * carries the ORIGINAL `event.created`. A route that rejects old `created` values therefore accepts
 * the first delivery and refuses every recovery attempt, turning one transient Firestore blip into
 * a customer who paid and never received Pro.
 *
 * The old tests could not have caught this: `stripeEvent` hardcoded `created` to now, so no test
 * ever presented a retry. These pin the retry window that actually matters.
 */
describe("stripe webhook retries", () => {
  const RETRY_AGES_SECONDS = [
    ["10 minutes", 10 * 60],
    ["1 hour", 60 * 60],
    ["1 day", 24 * 60 * 60],
    ["3 days, Stripe's last attempt", 3 * 24 * 60 * 60],
  ] as const

  it.each(RETRY_AGES_SECONDS)("processes a retry delivered %s after the event", async (_l, age) => {
    const { POST } = await importRoute()
    stripeMock.webhooks.constructEvent.mockReturnValue(
      stripeEvent("customer.subscription.created", { id: "sub_1", customer: "cus_1" }, "evt_1", age)
    )

    const res = (await POST(webhookRequest())) as unknown as { data: DocData }

    expect(res.data).toEqual({ received: true })
    expect(store.get("webhook_events/evt_1")?.status).toBe("completed")
  })

  it("leaves replay protection to constructEvent, which sees a per-delivery timestamp", async () => {
    const { POST } = await importRoute()
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
      throw new Error("Timestamp outside the tolerance zone")
    })

    const res = (await POST(webhookRequest())) as unknown as { status: number }

    expect(res.status).toBe(400)
    expect(store.get("webhook_events/evt_1")).toBeUndefined()
  })
})

describe("stripe webhook idempotency", () => {
  const event = () =>
    stripeEvent("customer.subscription.created", { id: "sub_1", customer: "cus_1" })

  it("claims the event, processes it, and closes the claim as completed", async () => {
    const { POST } = await importRoute()
    stripeMock.webhooks.constructEvent.mockReturnValue(event())

    const res = (await POST(webhookRequest())) as unknown as { data: DocData }

    expect(res.data).toEqual({ received: true })
    expect(store.get("webhook_events/evt_1")?.status).toBe("completed")
  })

  it("skips a second delivery of an event it already completed", async () => {
    const { POST } = await importRoute()
    stripeMock.webhooks.constructEvent.mockReturnValue(event())

    await POST(webhookRequest())
    const res = (await POST(webhookRequest())) as unknown as { data: DocData }

    expect(res.data).toEqual({ received: true, skipped: true })
  })

  it("skips a duplicate that arrives while the first delivery is still in flight", async () => {
    const { POST } = await importRoute()
    stripeMock.webhooks.constructEvent.mockReturnValue(event())
    store.set("webhook_events/evt_1", {
      status: "processing",
      claimed_at: new Date().toISOString(),
    })

    const res = (await POST(webhookRequest())) as unknown as { data: DocData }

    expect(res.data).toEqual({ received: true, skipped: true })
  })

  it("re-runs an event whose claim went stale, so a timed-out delivery is not lost forever", async () => {
    // This is the regression: the old marker was written before handling and never removed on a
    // hard kill, so Stripe's retry was permanently skipped and the customer was never upgraded.
    const { POST } = await importRoute()
    stripeMock.webhooks.constructEvent.mockReturnValue(event())
    store.set("webhook_events/evt_1", {
      status: "processing",
      claimed_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    })

    const res = (await POST(webhookRequest())) as unknown as { data: DocData }

    expect(res.data).toEqual({ received: true })
    expect(store.get("webhook_events/evt_1")?.status).toBe("completed")
    expect(store.get("webhook_events/evt_1")?.takeover_count).toBe(1)
  })

  it("treats a legacy marker with no status as already processed", async () => {
    const { POST } = await importRoute()
    stripeMock.webhooks.constructEvent.mockReturnValue(event())
    store.set("webhook_events/evt_1", { processed_at: new Date().toISOString() })

    const res = (await POST(webhookRequest())) as unknown as { data: DocData }

    expect(res.data).toEqual({ received: true, skipped: true })
  })
})

describe("stripe webhook invoice.payment_failed", () => {
  function seedProProfile() {
    store.set("profiles/user_1", {
      email: "u@example.com",
      subscription_tier: "pro",
      subscription_status: "active",
      stripe_customer_id: "cus_1",
    })
  }

  it("does not revoke Pro while Stripe still has a retry scheduled", async () => {
    const { POST } = await importRoute()
    seedProProfile()
    stripeMock.webhooks.constructEvent.mockReturnValue(
      stripeEvent("invoice.payment_failed", {
        id: "in_1",
        customer: "cus_1",
        attempt_count: 1,
        next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
      })
    )

    await POST(webhookRequest())

    const profile = store.get("profiles/user_1")
    expect(profile?.subscription_status).toBe("active")
    expect(profile?.payment_failed_at).toBeTruthy()
    expect(profile?.payment_attempt_count).toBe(1)
    // The customer still needs to know their card failed.
    expect(sendPaymentFailedEmail).toHaveBeenCalledTimes(1)
  })

  it("marks past_due once Stripe stops retrying", async () => {
    const { POST } = await importRoute()
    seedProProfile()
    stripeMock.webhooks.constructEvent.mockReturnValue(
      stripeEvent("invoice.payment_failed", {
        id: "in_1",
        customer: "cus_1",
        attempt_count: 4,
        next_payment_attempt: null,
      })
    )

    await POST(webhookRequest())

    expect(store.get("profiles/user_1")?.subscription_status).toBe("past_due")
  })
})

describe("stripe webhook charge.refunded", () => {
  it("cancels the subscription so a refunded monthly customer stops being billed", async () => {
    const { POST } = await importRoute()
    store.set("profiles/user_1", {
      email: "u@example.com",
      subscription_tier: "pro",
      stripe_customer_id: "cus_1",
      stripe_subscription_id: "sub_1",
      subscription_type: "monthly",
    })
    stripeMock.subscriptions.cancel.mockResolvedValue({ id: "sub_1", status: "canceled" })
    stripeMock.webhooks.constructEvent.mockReturnValue(
      stripeEvent("charge.refunded", {
        id: "ch_1",
        customer: "cus_1",
        currency: "usd",
        amount_refunded: 2900,
        refunded: true,
        payment_intent: "pi_1",
      })
    )

    await POST(webhookRequest())

    expect(store.get("profiles/user_1")?.subscription_tier).toBe("free")
    expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith("sub_1")
  })

  it("dead-letters a refund it cannot attribute instead of passing silently", async () => {
    const { POST } = await importRoute()
    stripeMock.customers.retrieve.mockResolvedValue({ id: "cus_unknown", metadata: {} })
    stripeMock.webhooks.constructEvent.mockReturnValue(
      stripeEvent("charge.refunded", {
        id: "ch_1",
        customer: "cus_unknown",
        currency: "usd",
        amount_refunded: 2900,
        refunded: true,
      })
    )

    await POST(webhookRequest())

    expect(store.get("webhook_failures/evt_1")?.stage).toBe("charge.refunded:unresolved-user")
  })

  it("recovers the user from Stripe customer metadata when the profile link is missing", async () => {
    const { POST } = await importRoute()
    store.set("profiles/user_1", {
      email: "u@example.com",
      subscription_tier: "pro",
      subscription_type: "yearly",
    })
    stripeMock.customers.retrieve.mockResolvedValue({
      id: "cus_1",
      metadata: { userId: "user_1" },
    })
    stripeMock.webhooks.constructEvent.mockReturnValue(
      stripeEvent("charge.refunded", {
        id: "ch_1",
        customer: "cus_1",
        currency: "usd",
        amount_refunded: 9900,
        refunded: true,
      })
    )

    await POST(webhookRequest())

    const profile = store.get("profiles/user_1")
    expect(profile?.subscription_tier).toBe("free")
    // The missing link is backfilled so later events take the cheap query path.
    expect(profile?.stripe_customer_id).toBe("cus_1")
    // Yearly is a one-time payment: nothing to cancel.
    expect(stripeMock.subscriptions.cancel).not.toHaveBeenCalled()
  })
})
