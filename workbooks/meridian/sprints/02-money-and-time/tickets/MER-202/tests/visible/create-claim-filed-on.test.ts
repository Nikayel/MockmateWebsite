import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { seedTenant } from "../../test/support/fixtures"
import { filedOnDate } from "../../src/domain/claim"

describe("POST /claims filedOn", () => {
  it("reports a filedOn date derived from the tenant's own zone", async () => {
    const { meridian } = buildTestApp()
    await seedTenant(meridian.db, { id: "ten_northwind", timeZone: "America/Chicago" })

    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9301",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })

    const body = response.json<{ createdAt: string; filedOn: string }>()
    expect(body.filedOn).toBe(
      filedOnDate({ createdAt: body.createdAt, timeZone: "America/Chicago" })
    )
    expect(body.filedOn.length).toBe(10)
  })

  it("still returns a valid filedOn for a tenant that predates the time zone column", async () => {
    const { meridian } = buildTestApp()
    // Deliberately not seeded - the same "tenant sends a header, no row exists" shape every
    // sprint-1 claims test already relies on.
    const response = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_unseeded" },
      payload: {
        externalRef: "NW-9302",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })

    const body = response.json<{ createdAt: string; filedOn: string }>()
    expect(body.filedOn).toBe(filedOnDate({ createdAt: body.createdAt, timeZone: "UTC" }))
  })

  it("keeps filedOn on GET /claims/:id consistent with the value returned at creation", async () => {
    const { meridian } = buildTestApp()
    await seedTenant(meridian.db, { id: "ten_northwind", timeZone: "America/St_Johns" })

    const created = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9303",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })
    const { id, filedOn: filedOnAtCreation } = created.json<{ id: string; filedOn: string }>()

    const fetched = await meridian.app.inject({
      method: "GET",
      url: `/claims/${id}`,
      headers: { "x-tenant-id": "ten_northwind" },
    })

    expect(fetched.json<{ filedOn: string }>().filedOn).toBe(filedOnAtCreation)
  })

  it("gives every claim on a list response the same tenant-zone filedOn convention", async () => {
    const { meridian } = buildTestApp()
    await seedTenant(meridian.db, { id: "ten_northwind", timeZone: "America/Chicago" })
    await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9304",
        amount: 100,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })

    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
    })

    const body = response.json<{ claims: Array<{ createdAt: string; filedOn: string }> }>()
    for (const claim of body.claims) {
      expect(claim.filedOn).toBe(
        filedOnDate({ createdAt: claim.createdAt, timeZone: "America/Chicago" })
      )
    }
  })
})
