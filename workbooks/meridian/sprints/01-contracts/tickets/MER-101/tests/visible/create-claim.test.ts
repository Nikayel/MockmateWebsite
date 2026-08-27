import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"

describe("POST /claims", () => {
  it("still accepts a well-formed claim exactly as before", async () => {
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
    const body = response.json<{ externalRef: string; amount: number; status: string }>()
    expect(body).toMatchObject({ externalRef: "NW-1001", amount: 500, status: "submitted" })
  })

  it("rejects a missing required field with 400, not 500", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: { amount: 250 },
    })

    expect(response.statusCode).toBe(400)
  })

  it("rejects a numeric-looking string amount with 400 instead of crashing - CLM-77102", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-77102",
        amount: "1500.00",
        claimantName: "Alex Chen",
        lossDate: "2026-01-20",
      },
    })

    expect(response.statusCode).toBe(400)
  })

  it("rejects a boolean amount with 400, never a 500", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-77043",
        amount: true,
        claimantName: "Morgan Blake",
        lossDate: "2026-01-20",
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
