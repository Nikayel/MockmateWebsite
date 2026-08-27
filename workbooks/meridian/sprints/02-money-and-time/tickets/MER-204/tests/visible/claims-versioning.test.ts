import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { seedTenant } from "../../test/support/fixtures"

async function createClaim(
  meridian: ReturnType<typeof buildTestApp>["meridian"],
  tenantId: string,
  headers: Record<string, string> = {}
) {
  return meridian.app.inject({
    method: "POST",
    url: "/claims",
    headers: { "x-tenant-id": tenantId, ...headers },
    payload: {
      externalRef: "NW-9501",
      amount: 100,
      claimantName: "Test Claimant",
      lossDate: "2026-01-01",
    },
  })
}

describe("claim response versioning", () => {
  it("gives a request with no version information the exact v1 shape it always got", async () => {
    const { meridian } = buildTestApp()
    const response = await createClaim(meridian, "ten_northwind")
    const body = response.json<{ amount: number; currency: string; money?: unknown }>()
    expect(body.amount).toBe(100)
    expect(body.currency).toBe("USD")
    expect(body.money).toBeUndefined()
  })

  it("gives an explicit v2 request the nested money shape instead of a flat amount", async () => {
    const { meridian } = buildTestApp()
    const response = await createClaim(meridian, "ten_northwind", { "x-api-version": "2" })
    const body = response.json<{
      amount?: number
      money?: { minorUnits: number; currency: string }
    }>()
    expect(body.amount).toBeUndefined()
    expect(body.money).toEqual({ minorUnits: 10000, currency: "USD" })
  })

  it("stamps Deprecation and Sunset for a v1 caller still using offset", async () => {
    const { meridian } = buildTestApp()
    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims?offset=0",
      headers: { "x-tenant-id": "ten_northwind" },
    })
    expect(response.headers.deprecation).toBe("true")
    expect(typeof response.headers.sunset).toBe("string")
  })

  it("stamps nothing for a v2 caller sending offset, since v2 never had it", async () => {
    const { meridian } = buildTestApp()
    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims?offset=0",
      headers: { "x-tenant-id": "ten_northwind", "x-api-version": "2" },
    })
    expect(response.headers.deprecation).toBeUndefined()
    expect(response.headers.sunset).toBeUndefined()
  })

  it("pins a subscription's version on the request that first sets it, and honors it on the next request with no header at all", async () => {
    const { meridian } = buildTestApp()
    await seedTenant(meridian.db, { id: "ten_northwind" })

    await createClaim(meridian, "ten_northwind", { "x-api-version": "2" })
    const second = await createClaim(meridian, "ten_northwind")

    const body = second.json<{ amount?: number; money?: unknown }>()
    expect(body.amount).toBeUndefined()
    expect(body.money).toBeDefined()
  })

  it("lets a later explicit v1 request re-pin a subscription back down from v2", async () => {
    const { meridian } = buildTestApp()
    await seedTenant(meridian.db, { id: "ten_northwind" })

    await createClaim(meridian, "ten_northwind", { "x-api-version": "2" })
    await createClaim(meridian, "ten_northwind", { "x-api-version": "1" })
    const third = await createClaim(meridian, "ten_northwind")

    const body = third.json<{ amount?: number; money?: unknown }>()
    expect(body.amount).toBe(100)
    expect(body.money).toBeUndefined()
  })

  it("keeps two tenants' pinned versions independent of each other", async () => {
    const { meridian } = buildTestApp()
    await seedTenant(meridian.db, { id: "ten_a" })
    await seedTenant(meridian.db, { id: "ten_b" })

    await createClaim(meridian, "ten_a", { "x-api-version": "2" })
    const bResponse = await createClaim(meridian, "ten_b")

    const body = bResponse.json<{ amount?: number; money?: unknown }>()
    expect(body.amount).toBe(100)
    expect(body.money).toBeUndefined()
  })

  it("carries the v2 pin from a GET onto a later GET with no header", async () => {
    const { meridian } = buildTestApp()
    await seedTenant(meridian.db, { id: "ten_northwind" })
    await createClaim(meridian, "ten_northwind")

    await meridian.app.inject({
      method: "GET",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind", "x-api-version": "2" },
    })
    const listResponse = await meridian.app.inject({
      method: "GET",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
    })

    const body = listResponse.json<{ claims: Array<{ amount?: number; money?: unknown }> }>()
    expect(body.claims[0].amount).toBeUndefined()
    expect(body.claims[0].money).toBeDefined()
  })
})
