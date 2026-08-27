import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { createConnectionPool } from "../../src/db/tenant-context"
import { findClaimByExternalRef } from "../../src/db/repositories/claims"
import { runReconciliation } from "../../src/jobs/reconcile"
import { seedContinentalAndBekins } from "../../test/fixtures/tenants"

describe("SUP-2291: reconciliation never crosses tenants", () => {
  it("does not return Bekins' claim when Continental reconciles the same external ref", async () => {
    const { meridian } = buildTestApp()
    await seedContinentalAndBekins(meridian.db)

    await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_bekins" },
      payload: {
        externalRef: "SHARED-REF-1",
        amount: 900,
        claimantName: "Bekins Claimant",
        lossDate: "2026-01-19",
      },
    })

    const pool = createConnectionPool(meridian.db, 4)
    const results = await runReconciliation(pool, "ten_continental", ["SHARED-REF-1"])

    expect(results["SHARED-REF-1"]).toBeNull()
  })

  it("still finds a claim that really does belong to the requesting tenant", async () => {
    const { meridian } = buildTestApp()
    await seedContinentalAndBekins(meridian.db)

    await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_continental" },
      payload: {
        externalRef: "CONT-1",
        amount: 400,
        claimantName: "Continental Claimant",
        lossDate: "2026-01-11",
      },
    })

    const pool = createConnectionPool(meridian.db, 4)
    const results = await runReconciliation(pool, "ten_continental", ["CONT-1"])

    expect(results["CONT-1"]).not.toBeNull()
    expect(results["CONT-1"]?.tenantId).toBe("ten_continental")
  })

  it("resolves two tenants reusing the exact same external ref to two different claims", async () => {
    const { meridian } = buildTestApp()
    await seedContinentalAndBekins(meridian.db)

    await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_continental" },
      payload: {
        externalRef: "DUP-100",
        amount: 100,
        claimantName: "Continental Claimant",
        lossDate: "2026-01-12",
      },
    })
    await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_bekins" },
      payload: {
        externalRef: "DUP-100",
        amount: 200,
        claimantName: "Bekins Claimant",
        lossDate: "2026-01-12",
      },
    })

    const pool = createConnectionPool(meridian.db, 4)
    const continentalResult = await runReconciliation(pool, "ten_continental", ["DUP-100"])
    const bekinsResult = await runReconciliation(pool, "ten_bekins", ["DUP-100"])

    expect(continentalResult["DUP-100"]?.tenantId).toBe("ten_continental")
    expect(bekinsResult["DUP-100"]?.tenantId).toBe("ten_bekins")
    expect(continentalResult["DUP-100"]?.id).not.toBe(bekinsResult["DUP-100"]?.id)
  })

  it("findClaimByExternalRef itself reads the tenant off the connection, not a separate argument", async () => {
    const { meridian } = buildTestApp()
    await seedContinentalAndBekins(meridian.db)

    await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_bekins" },
      payload: {
        externalRef: "REPO-DIRECT-1",
        amount: 150,
        claimantName: "Bekins Claimant",
        lossDate: "2026-01-13",
      },
    })

    const pool = createConnectionPool(meridian.db, 4)
    const connection = pool.acquire("ten_continental")
    const result = await findClaimByExternalRef(connection, "REPO-DIRECT-1")
    pool.release(connection)

    expect(result).toBeNull()
  })

  it("returns null, not an error, for an external ref nobody has filed", async () => {
    const { meridian } = buildTestApp()
    await seedContinentalAndBekins(meridian.db)

    const pool = createConnectionPool(meridian.db, 4)
    const results = await runReconciliation(pool, "ten_continental", ["NEVER-FILED"])

    expect(results["NEVER-FILED"]).toBeNull()
  })
})
