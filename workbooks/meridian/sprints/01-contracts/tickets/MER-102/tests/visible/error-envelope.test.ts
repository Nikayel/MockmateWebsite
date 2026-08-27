import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"

describe("error envelope", () => {
  it("gives an unmatched route the same envelope shape as a validation error", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({ method: "GET", url: "/no-such-route" })

    expect(response.statusCode).toBe(404)
    const body = response.json<{
      error: { code: string; message: string; correlationId: string }
    }>()
    expect(body.error.code).toBe("NOT_FOUND")
    expect(typeof body.error.correlationId).toBe("string")
    expect(body.error.correlationId.length).toBeGreaterThan(0)
  })

  it("gives a validation failure a stable VALIDATION_ERROR code", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: { amount: 250 },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ error: { code: string } }>()
    expect(body.error.code).toBe("VALIDATION_ERROR")
  })

  it("echoes a caller-supplied correlation id back on the error response", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind", "x-correlation-id": "corr_from_caller" },
      payload: { amount: 250 },
    })

    const body = response.json<{ error: { correlationId: string } }>()
    expect(body.error.correlationId).toBe("corr_from_caller")
  })

  it("rejects a request missing the tenant header with 400, not a generic 500", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      payload: {
        externalRef: "NW-1",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })

    expect(response.statusCode).toBe(400)
    const body = response.json<{ error: { code: string } }>()
    expect(body.error.code).toBe("MISSING_TENANT")
  })
})
