import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { seedClaim } from "../../test/fixtures/claims"
import { listClaimsByTenantKeyset } from "../../src/db/repositories/claims"

describe("GET /claims pagination", () => {
  it("never returns the same claim twice across two pages", async () => {
    const { meridian } = buildTestApp()
    await seedClaim(meridian.db, { id: "clm_1", createdAt: "2026-01-04T09:12:00.000Z" })
    await seedClaim(meridian.db, { id: "clm_2", createdAt: "2026-01-04T09:12:01.000Z" })
    await seedClaim(meridian.db, { id: "clm_3", createdAt: "2026-01-04T09:12:02.000Z" })

    const page1 = await meridian.app.inject({
      method: "GET",
      url: "/claims?limit=2",
      headers: { "x-tenant-id": "ten_northwind" },
    })
    const body1 = page1.json<{ claims: Array<{ id: string }>; nextCursor: string | null }>()
    expect(body1.nextCursor).not.toBeNull()

    const page2 = await meridian.app.inject({
      method: "GET",
      url: `/claims?limit=2&cursor=${encodeURIComponent(body1.nextCursor as string)}`,
      headers: { "x-tenant-id": "ten_northwind" },
    })
    const body2 = page2.json<{ claims: Array<{ id: string }> }>()

    const seenTwice = body2.claims.filter((claim) =>
      body1.claims.some((earlier) => earlier.id === claim.id)
    )
    expect(seenTwice).toHaveLength(0)
    expect(body2.claims.map((claim) => claim.id)).toEqual(["clm_3"])
  })

  it("sorts two claims filed in the same millisecond deterministically by id", async () => {
    const { meridian } = buildTestApp()
    await seedClaim(meridian.db, { id: "clm_z", createdAt: "2026-01-04T09:12:00.000Z" })
    await seedClaim(meridian.db, { id: "clm_a", createdAt: "2026-01-04T09:12:00.000Z" })

    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
    })

    const body = response.json<{ claims: Array<{ id: string }> }>()
    expect(body.claims.map((claim) => claim.id)).toEqual(["clm_a", "clm_z"])
  })

  it("rejects an absurd page size instead of silently truncating it", async () => {
    const { meridian } = buildTestApp()

    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims?limit=500",
      headers: { "x-tenant-id": "ten_northwind" },
    })

    expect(response.statusCode).toBe(400)
  })

  it("still returns a bounded default page with no limit given", async () => {
    const { meridian } = buildTestApp()
    await seedClaim(meridian.db, { id: "clm_only", createdAt: "2026-01-04T09:12:00.000Z" })

    const response = await meridian.app.inject({
      method: "GET",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
    })

    expect(response.statusCode).toBe(200)
    const body = response.json<{ claims: unknown[]; nextCursor: string | null }>()
    expect(body.claims).toHaveLength(1)
    expect(body.nextCursor).toBeNull()
  })
})
