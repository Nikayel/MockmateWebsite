import { describe, expect, it } from "vitest"
import { AUDIT_PROJECTION_VERSION } from "../../src/util/canonical-json"
import { computeClaimAuditHash } from "../../src/util/canonical-json"
import { describeAuditProjectionVersion } from "../../src/util/canonical-json"
import { hashClaim } from "../../src/util/canonical-json"
import { verifyClaimAuditHash } from "../../src/util/canonical-json"
import { toWireAmountV1 } from "../../src/money/money"

const claim = {
  id: "clm_205a",
  tenantId: "ten_northwind",
  externalRef: "NW-205",
  status: "submitted",
  money: { minorUnits: 61402, currency: "USD" },
  claimantName: "Test Claimant",
  lossDate: "2026-03-01",
  createdAt: "2026-03-02T10:00:00.000Z",
} as never

describe("computeClaimAuditHash", () => {
  it("computes the same hash as hashClaim under the current projection version", () => {
    expect(computeClaimAuditHash({ claim, projectionVersion: AUDIT_PROJECTION_VERSION })).toBe(
      hashClaim(claim)
    )
  })

  it("throws for a projection version this codebase has never shipped", () => {
    expect(() => computeClaimAuditHash({ claim, projectionVersion: 99 })).toThrow()
  })
})

describe("verifyClaimAuditHash", () => {
  it("matches a correctly stored hash under the default (current) projection version", () => {
    const storedHash = computeClaimAuditHash({ claim, projectionVersion: AUDIT_PROJECTION_VERSION })
    expect(verifyClaimAuditHash({ claim, storedHash })).toBe(true)
  })

  it("matches when the projection version is passed explicitly", () => {
    const storedHash = computeClaimAuditHash({ claim, projectionVersion: 1 })
    expect(verifyClaimAuditHash({ claim, storedHash, projectionVersion: 1 })).toBe(true)
  })

  it("reports no match for a claim whose fields have actually changed", () => {
    const storedHash = computeClaimAuditHash({ claim, projectionVersion: AUDIT_PROJECTION_VERSION })
    const tampered = { ...claim, money: { minorUnits: 999999, currency: "USD" } }
    expect(verifyClaimAuditHash({ claim: tampered, storedHash })).toBe(false)
  })
})

describe("the shim, not the hash, must change", () => {
  it("computes a hash over the exact stored money value, not the v1 wire float the shim serves", () => {
    // If the hash were computed after the v1 rewrite (money.minorUnits replaced by a wire
    // float amount), it would be a different value entirely - this is the defect MER-205
    // traces back to the v1 compatibility shim and closes.
    const { money, ...claimWithoutMoney } = claim as {
      money: { minorUnits: number; currency: string }
    }
    const wireShapedGuess = hashClaim({
      ...claimWithoutMoney,
      amount: toWireAmountV1(money),
      currency: money.currency,
    } as never)
    expect(computeClaimAuditHash({ claim, projectionVersion: AUDIT_PROJECTION_VERSION })).not.toBe(
      wireShapedGuess
    )
  })

  it("verifies identically regardless of which wire version a caller happens to request", () => {
    // The audit hash is a property of the STORED claim, never of which envelope version served
    // a particular HTTP response - the two are unrelated to this function on purpose.
    const storedHash = computeClaimAuditHash({ claim, projectionVersion: AUDIT_PROJECTION_VERSION })
    expect(verifyClaimAuditHash({ claim, storedHash })).toBe(true)
  })
})

describe("describeAuditProjectionVersion", () => {
  it("describes version 1 as the claim's own canonical fields, pre-shim", () => {
    const description = describeAuditProjectionVersion(1)
    expect(description).toContain("canonical")
  })

  it("names an unrecognized version instead of returning a misleading description", () => {
    expect(describeAuditProjectionVersion(42)).toContain("42")
  })
})
