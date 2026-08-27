import { describe, expect, it } from "vitest"
import { buildTestApp } from "../support/build-app"

describe("POST /claims", () => {
  it("creates a claim and returns 201 with the stored claim", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-1001",
        amount: 500,
        claimantName: "Jordan Rivera",
        lossDate: "2026-01-15",
      },
    })

    expect(response.statusCode).toBe(201)
    const body = response.json<{ externalRef: string; status: string; currency: string }>()
    expect(body).toMatchObject({
      externalRef: "NW-1001",
      status: "submitted",
      currency: "USD",
    })
  })

  it("assigns a generated id scoped to the requesting tenant", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-1002",
        amount: 250,
        claimantName: "Priya Shah",
        lossDate: "2026-01-16",
      },
    })

    const body = response.json<{ id: string; tenantId: string }>()
    expect(body.id).toContain("clm_")
    expect(body.tenantId).toBe("ten_northwind")
  })

  it("returns 400 when a required field is missing", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: { amount: 250 },
    })

    expect(response.statusCode).toBe(400)
  })
})
