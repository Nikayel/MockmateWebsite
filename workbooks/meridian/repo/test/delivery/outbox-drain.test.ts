import { describe, expect, it } from "vitest"
import { buildTestApp } from "../support/build-app"
import { seedTenant } from "../support/fixtures"
import { listDeliveriesForClaim } from "../../src/db/repositories/webhook-deliveries"
import { signPayload } from "../../src/delivery/signature"

const WEBHOOK_URL = "https://northwind.example.com/webhooks/meridian"
const WEBHOOK_SECRET = "shh-secret"

describe("outbox drain -> webhook delivery", () => {
  it("enqueues an outbox entry when a claim is created", async () => {
    const { meridian } = buildTestApp()
    await seedTenant(meridian.db, {
      id: "ten_a",
      webhookUrl: WEBHOOK_URL,
      webhookSecret: WEBHOOK_SECRET,
    })

    await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_a" },
      payload: {
        externalRef: "A-1",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })

    expect(meridian.outbox.pendingCount()).toBe(1)
  })

  it("drains the outbox and calls the http client for each entry", async () => {
    const { meridian, httpClient } = buildTestApp()
    await seedTenant(meridian.db, {
      id: "ten_a",
      webhookUrl: WEBHOOK_URL,
      webhookSecret: WEBHOOK_SECRET,
    })
    const created = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_a" },
      payload: {
        externalRef: "A-2",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })
    const { id: claimId } = created.json<{ id: string }>()

    const drainedCount = await meridian.drainOutbox()

    expect(drainedCount).toBe(1)
    expect(httpClient.calls).toHaveLength(1)
    expect(httpClient.calls[0].url).toBe(WEBHOOK_URL)

    const deliveries = await listDeliveriesForClaim(meridian.db, claimId)
    expect(deliveries).toHaveLength(1)
    expect(deliveries[0].status).toBe("delivered")
  })

  it("signs the delivered payload with the tenant's webhook secret", async () => {
    const { meridian, httpClient } = buildTestApp()
    await seedTenant(meridian.db, {
      id: "ten_a",
      webhookUrl: WEBHOOK_URL,
      webhookSecret: WEBHOOK_SECRET,
    })
    await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_a" },
      payload: {
        externalRef: "A-3",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })

    await meridian.drainOutbox()

    const call = httpClient.calls[0]
    const expectedSignature = signPayload(call.body, WEBHOOK_SECRET)
    expect(call.headers["x-meridian-signature"]).toBe(expectedSignature)
  })
})
