import { describe, expect, it } from "vitest"
import { buildTestApp } from "../../test/support/build-app"
import { getStoredClaimAuditInfo } from "../../src/db/repositories/claims"
import { AUDIT_PROJECTION_VERSION } from "../../src/util/canonical-json"
import { computeClaimAuditHash } from "../../src/util/canonical-json"
import { verifyClaimAuditHash } from "../../src/util/canonical-json"

describe("stored audit hash", () => {
  it("stamps every newly written claim with the current projection version", async () => {
    const { meridian } = buildTestApp()
    const created = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9601",
        amount: 88.5,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })
    const { id } = created.json<{ id: string }>()

    const stored = await getStoredClaimAuditInfo(meridian.db, "ten_northwind", id)
    expect(stored?.projectionVersion).toBe(AUDIT_PROJECTION_VERSION)
  })

  it("stores a hash that verifies correctly against the claim it was computed from", async () => {
    const { meridian } = buildTestApp()
    const created = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9602",
        amount: 634.02,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })
    const { id } = created.json<{ id: string }>()

    const stored = await getStoredClaimAuditInfo(meridian.db, "ten_northwind", id)
    if (!stored) throw new Error("expected a stored claim")
    expect(
      verifyClaimAuditHash({
        claim: stored.claim,
        storedHash: stored.storedHash,
        projectionVersion: stored.projectionVersion,
      })
    ).toBe(true)
  })

  it("stores the hash over the exact minor-unit value, not the v1 wire float", async () => {
    const { meridian } = buildTestApp()
    const created = await meridian.app.inject({
      method: "POST",
      url: "/claims",
      headers: { "x-tenant-id": "ten_northwind" },
      payload: {
        externalRef: "NW-9603",
        amount: 412.19,
        claimantName: "Test Claimant",
        lossDate: "2026-01-01",
      },
    })
    const { id } = created.json<{ id: string }>()

    const stored = await getStoredClaimAuditInfo(meridian.db, "ten_northwind", id)
    if (!stored) throw new Error("expected a stored claim")
    expect(stored.storedHash).toBe(
      computeClaimAuditHash({ claim: stored.claim, projectionVersion: stored.projectionVersion })
    )
  })

  it("still verifies a claim that predates this ticket, hashed under projection version 1, unchanged by the v1 shim's existence", () => {
    // Simulates a claim written before MER-205 shipped: its stored hash was already computed
    // over the claim's canonical fields (MER-203 got that part right), pinned to version 1.
    // The v1 compatibility shim (MER-204) exists and would serialize this claim differently on
    // the wire, but that must never affect whether the STORED hash still verifies.
    const oldClaim = {
      id: "clm_pre_204",
      tenantId: "ten_cascade",
      externalRef: "CAS-OLD-1",
      status: "paid",
      money: { minorUnits: 250000, currency: "USD" },
      claimantName: "Jordan Rivera",
      lossDate: "2025-11-02",
      createdAt: "2025-11-03T09:00:00.000Z",
    } as never
    const hashComputedBeforeMer204Existed = computeClaimAuditHash({
      claim: oldClaim,
      projectionVersion: 1,
    })

    expect(
      verifyClaimAuditHash({
        claim: oldClaim,
        storedHash: hashComputedBeforeMer204Existed,
        projectionVersion: 1,
      })
    ).toBe(true)
  })
})
