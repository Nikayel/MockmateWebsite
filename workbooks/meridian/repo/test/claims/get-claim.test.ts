import { describe, expect, it } from "vitest"
import { buildTestApp } from "../support/build-app"

describe("GET /claims/:id", () => {
  it("returns a single claim by id", async () => {
    const { meridian } = buildTestApp()
    const created = await meridian.app.inject({
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
    const { id } = created.json<{ id: string }>()

    const response = await meridian.app.inject({
      method: "GET",
      url: `/claims/${id}`,
      headers: { "x-tenant-id": "ten_a" },
    })

    expect(response.statusCode).toBe(200)
    expect(response.json<{ id: string }>().id).toBe(id)
  })

  it("returns 404 when the claim does not exist", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims/does-not-exist",
      headers: { "x-tenant-id": "ten_a" },
    })

    expect(response.statusCode).toBe(404)
  })
})
