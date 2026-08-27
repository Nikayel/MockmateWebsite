import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"

describe("PR #412 - claimed fix", () => {
  it("no longer 500s on the exact CLM-77102-shaped payload", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-77102",
        amount: 1500,
        claimantName: "Alex Chen",
        lossDate: "2026-01-20",
      },
    })

    expect(response.statusCode).toBe(201)
  })
})

describe("PR #412 - the defect its own tests do not cover", () => {
  it("still rejects a non-numeric amount with 400, not silently accept it", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9999",
        amount: "not-a-number",
        claimantName: "Jordan Rivera",
        lossDate: "2026-01-20",
      },
    })

    expect(response.statusCode).toBe(400)
  })
})
