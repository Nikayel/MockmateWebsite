import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { buildWebhookPayload } from "../../src/delivery/webhook-payload"

describe("buildWebhookPayload money shape", () => {
  it("mirrors the same v1 float shape webhook subscribers already depend on", () => {
    const payload = buildWebhookPayload({
      id: "clm_1",
      tenantId: "ten_northwind",
      externalRef: "NW-1",
      status: "submitted",
      money: { minorUnits: 41219, currency: "USD" },
      claimantName: "Test Claimant",
      lossDate: "2026-01-01",
      createdAt: "2026-01-01T00:00:00.000Z",
    })
    expect(payload.amount).toBe(412.19)
    expect(payload.currency).toBe("USD")
  })
})

describe("POST /claims money", () => {
  it("accepts an exact-cent amount and echoes it back unchanged", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9101",
        amount: 412.19,
        claimantName: "Robin Alvarez",
        lossDate: "2026-01-18",
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json<{ amount: number; currency: string }>()
    expect(body.amount).toBe(412.19)
    expect(body.currency).toBe("USD")
  })

  it("still accepts a whole-dollar amount exactly as before", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9102",
        amount: 500,
        claimantName: "Jordan Rivera",
        lossDate: "2026-01-18",
      },
    })

    expect(response.statusCode).toBe(201)
    expect(response.json<{ amount: number }>().amount).toBe(500)
  })

  it("rejects an amount that cannot be represented exactly in cents", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9103",
        amount: 412.995,
        claimantName: "Sam Okafor",
        lossDate: "2026-01-18",
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it("never truncates a too-precise amount down to something the caller did not send", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9104",
        amount: 10.001,
        claimantName: "Morgan Blake",
        lossDate: "2026-01-18",
      },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ error: { code: string } }>()
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("stores and returns money as an exact figure, never drifting across a create-then-read round trip", async () => {
    const { meridian } = buildTestApp()

    const created = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9105",
        amount: 1204.5,
        claimantName: "Priya Shah",
        lossDate: "2026-01-18",
      },
    })
    const { id } = created.json<{ id: string }>()

    const fetched = await meridian.app.inject({
      method: "GET",
      url: `/claims/${id}`,
      headers: { "x-tenant-id": "ten_northwind" },
    })

    expect(fetched.json<{ amount: number }>().amount).toBe(1204.5)
  })
})
