import { describe, expect, it } from "vitest"
import { buildTestApp } from "../support/build-app"
import type { MeridianApp } from "../../src/app"

function createClaim(meridian: MeridianApp, tenantId: string, externalRef: string) {
  return meridian.app.inject({
    method: "POST",
    url: "/claims",
    headers: { "x-tenant-id": tenantId },
    payload: {
      externalRef,
      amount: 100,
      claimantName: "Test Claimant",
      lossDate: "2026-01-01",
    },
  })
}

describe("GET /claims", () => {
  it("lists claims scoped to the requesting tenant", async () => {
    const { meridian } = buildTestApp()
    await createClaim(meridian, "ten_a", "A-1")
    await createClaim(meridian, "ten_b", "B-1")

    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims",
      headers: { "x-tenant-id": "ten_a" },
    })

    const body = response.json<{ claims: Array<{ externalRef: string }> }>()
    expect(body.claims).toHaveLength(1)
    expect(body.claims[0].externalRef).toBe("A-1")
  })

  it("applies limit and offset", async () => {
    const { meridian } = buildTestApp()
    await createClaim(meridian, "ten_a", "A-1")
    await createClaim(meridian, "ten_a", "A-2")
    await createClaim(meridian, "ten_a", "A-3")

    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims?limit=1&offset=1",
      headers: { "x-tenant-id": "ten_a" },
    })

    const body = response.json<{ claims: Array<{ externalRef: string }> }>()
    expect(body.claims).toHaveLength(1)
    expect(body.claims[0].externalRef).toBe("A-2")
  })
})
