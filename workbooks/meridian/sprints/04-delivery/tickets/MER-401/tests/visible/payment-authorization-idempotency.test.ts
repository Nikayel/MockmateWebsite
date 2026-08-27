import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { fingerprintIdempotentRequest } from "../../src/http/idempotency"

/** Creates a claim and drains the outbox entry claim creation itself enqueues, so a test's own
 * `pendingCount()` assertions are only ever about the payment-authorization calls it makes
 * afterward, not conflated with claim intake's own unrelated event. */
async function createClaim(
  meridian: ReturnType<typeof buildTestApp>["meridian"],
  tenantId: string,
  externalRef: string
) {
  const created = await meridian.app.inject({
    method: "POST",
    url: "/claims",
    headers: { "x-tenant-id": tenantId },
    payload: {
      externalRef,
      amount: 8842,
      claimantName: "Jordan Rivera",
      lossDate: "2026-01-15",
    },
  })
  await meridian.drainOutbox()
  return created.json<{ id: string }>().id
}

describe("POST /claims/:id/payment-authorizations", () => {
  it("authorizes a payment and enqueues exactly one outbox entry", async () => {
    const { meridian } = buildTestApp()
    const claimId = await createClaim(meridian, "ten_northwind", "NW-8842")

    const response = await meridian.app.inject({
      method: "POST",
      url: `/claims/${claimId}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "key-8842-a" },
      payload: { approvedBy: "adjuster_griffin" },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json<{ claimId: string; approvedBy: string }>()
    expect(body.claimId).toBe(claimId)
    expect(body.approvedBy).toBe("adjuster_griffin")
    // one authorization must enqueue exactly one delivery, never two
    expect(meridian.outbox.pendingCount()).toBe(1)
  })

  it("replays the original response verbatim for a retried request with the same key and same body", async () => {
    const { meridian } = buildTestApp()
    const claimId = await createClaim(meridian, "ten_northwind", "NW-8843")
    const request = {
      method: "POST",
      url: `/claims/${claimId}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "key-8843-a" },
      payload: { approvedBy: "adjuster_griffin", memo: "Approved after review" },
    } as const

    const first = await meridian.app.inject(request)
    const retry = await meridian.app.inject(request)

    expect(retry.statusCode).toBe(first.statusCode)
    expect(retry.json()).toEqual(first.json())
    // Northwind's own complaint: identical amounts sent twice. The retry must never enqueue
    // a second delivery.
    expect(meridian.outbox.pendingCount()).toBe(1)
  })

  it("returns 409 IDEMPOTENCY_KEY_CONFLICT when the same key arrives with a different body", async () => {
    const { meridian } = buildTestApp()
    const claimId = await createClaim(meridian, "ten_northwind", "NW-8844")

    await meridian.app.inject({
      method: "POST",
      url: `/claims/${claimId}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "key-8844-a" },
      payload: { approvedBy: "adjuster_griffin" },
    })
    const conflicting = await meridian.app.inject({
      method: "POST",
      url: `/claims/${claimId}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "key-8844-a" },
      payload: { approvedBy: "adjuster_okafor" },
    })

    expect(conflicting.statusCode).toBe(409)
    const body = conflicting.json<{ error: { code: string } }>()
    expect(body.error.code).toBe("IDEMPOTENCY_KEY_CONFLICT")
    // the conflicting retry must not have been processed either - still exactly one delivery
    expect(meridian.outbox.pendingCount()).toBe(1)
  })

  it("requires an Idempotency-Key header", async () => {
    const { meridian } = buildTestApp()
    const claimId = await createClaim(meridian, "ten_northwind", "NW-8845")

    const response = await meridian.app.inject({
      method: "POST",
      url: `/claims/${claimId}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind" },
      payload: { approvedBy: "adjuster_griffin" },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ error: { code: string } }>()
    expect(body.error.code).toBe("IDEMPOTENCY_KEY_REQUIRED")
  })

  it("404s when the claim does not exist, before touching idempotency state", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims/clm_does_not_exist/payment-authorizations",
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "key-missing" },
      payload: { approvedBy: "adjuster_griffin" },
    })

    expect(response.statusCode).toBe(404)
  })

  it("rejects a request with no approvedBy", async () => {
    const { meridian } = buildTestApp()
    const claimId = await createClaim(meridian, "ten_northwind", "NW-8846")

    const response = await meridian.app.inject({
      method: "POST",
      url: `/claims/${claimId}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "key-8846-a" },
      payload: {},
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ error: { code: string } }>()
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("scopes an idempotency key to the tenant that issued it: two tenants reusing the same key value both succeed independently", async () => {
    const { meridian } = buildTestApp()
    const northwindClaim = await createClaim(meridian, "ten_northwind", "NW-9001")
    const bekinsClaim = await createClaim(meridian, "ten_bekins", "BK-9001")

    const first = await meridian.app.inject({
      method: "POST",
      url: `/claims/${northwindClaim}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "shared-key" },
      payload: { approvedBy: "adjuster_griffin" },
    })
    const second = await meridian.app.inject({
      method: "POST",
      url: `/claims/${bekinsClaim}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_bekins", "idempotency-key": "shared-key" },
      payload: { approvedBy: "adjuster_diaz" },
    })

    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(201)
    expect(meridian.outbox.pendingCount()).toBe(2)
  })

  it("fingerprints a reordered-but-identical body the same way, regardless of key order", () => {
    const inOrder = fingerprintIdempotentRequest({
      method: "POST",
      path: "/claims/clm_8842/payment-authorizations",
      body: { approvedBy: "adjuster_griffin", memo: "Approved after review" },
    })
    const reordered = fingerprintIdempotentRequest({
      method: "POST",
      path: "/claims/clm_8842/payment-authorizations",
      body: { memo: "Approved after review", approvedBy: "adjuster_griffin" },
    })

    expect(reordered).toBe(inOrder)
  })

  it("treats a retry whose client serialized the same body with keys in a different order as a replay, not a conflict", async () => {
    const { meridian } = buildTestApp()
    const claimId = await createClaim(meridian, "ten_northwind", "NW-8847")

    const first = await meridian.app.inject({
      method: "POST",
      url: `/claims/${claimId}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "key-8847-a" },
      payload: { approvedBy: "adjuster_griffin", memo: "Approved after review" },
    })
    const reorderedRetry = await meridian.app.inject({
      method: "POST",
      url: `/claims/${claimId}/payment-authorizations`,
      headers: { "x-tenant-id": "ten_northwind", "idempotency-key": "key-8847-a" },
      payload: { memo: "Approved after review", approvedBy: "adjuster_griffin" },
    })

    expect(reorderedRetry.statusCode).toBe(201)
    expect(reorderedRetry.json()).toEqual(first.json())
    expect(meridian.outbox.pendingCount()).toBe(1)
  })
})
