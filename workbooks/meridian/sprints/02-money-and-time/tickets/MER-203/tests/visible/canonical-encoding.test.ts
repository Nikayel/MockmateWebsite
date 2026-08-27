import { describe, expect, it } from "vitest"
import { canonicalJson } from "../../src/util/canonical-json"
import { hashCanonical } from "../../src/util/canonical-json"
import { hashClaim } from "../../src/util/canonical-json"
import { verifyClaimAuditHash } from "../../src/util/canonical-json"

const claimA = {
  id: "clm_1",
  tenantId: "ten_northwind",
  externalRef: "NW-1",
  status: "submitted",
  money: { minorUnits: 41219, currency: "USD" },
  claimantName: "Robin Alvarez",
  lossDate: "2026-01-18",
  createdAt: "2026-01-18T09:00:00.000Z",
}

// The exact same logical claim, built with every key in a different order - the shape a
// database round trip, or a second code path constructing the same values, is free to produce.
const claimAReordered = {
  createdAt: "2026-01-18T09:00:00.000Z",
  lossDate: "2026-01-18",
  claimantName: "Robin Alvarez",
  money: { currency: "USD", minorUnits: 41219 },
  status: "submitted",
  externalRef: "NW-1",
  tenantId: "ten_northwind",
  id: "clm_1",
}

describe("canonicalJson", () => {
  it("sorts object keys regardless of insertion order", () => {
    expect(canonicalJson(claimA as never)).toBe(canonicalJson(claimAReordered as never))
  })

  it("proves the bug PR #418 shipped: JSON.stringify does not agree on the same two objects", () => {
    expect(JSON.stringify(claimA)).not.toBe(JSON.stringify(claimAReordered))
  })

  it("formats a number with no locale-dependent thousands separator", () => {
    expect(canonicalJson(12345.67)).toBe("12345.67")
  })

  it("encodes a nested object's keys in sorted order too, not just the top level", () => {
    expect(canonicalJson({ b: { z: 1, a: 2 }, a: 1 })).toBe('{"a":1,"b":{"a":2,"z":1}}')
  })

  it("encodes an array in its original order - arrays are never re-sorted", () => {
    expect(canonicalJson([3, 1, 2])).toBe("[3,1,2]")
  })

  it("encodes null and booleans as their literal JSON tokens", () => {
    expect(canonicalJson(null)).toBe("null")
    expect(canonicalJson(true)).toBe("true")
    expect(canonicalJson(false)).toBe("false")
  })
})

describe("hashCanonical", () => {
  it("hashes two differently-ordered encodings of the same value identically", () => {
    expect(hashCanonical(claimA as never)).toBe(hashCanonical(claimAReordered as never))
  })

  it("hashes two genuinely different values differently", () => {
    expect(hashCanonical({ a: 1 })).not.toBe(hashCanonical({ a: 2 }))
  })
})

describe("hashClaim", () => {
  it("hashes the same logical claim identically no matter which key order built it", () => {
    expect(hashClaim(claimA as never)).toBe(hashClaim(claimAReordered as never))
  })

  it("hashes two claims with different amounts differently", () => {
    const claimB = { ...claimA, money: { minorUnits: 50000, currency: "USD" } }
    expect(hashClaim(claimA as never)).not.toBe(hashClaim(claimB as never))
  })
})

describe("verifyClaimAuditHash", () => {
  it("reports a match when the stored hash was computed the same canonical way", () => {
    const storedHash = hashClaim(claimA as never)
    expect(verifyClaimAuditHash({ claim: claimA as never, storedHash })).toBe(true)
  })

  it("reports no match when the claim's fields have actually changed", () => {
    const storedHash = hashClaim(claimA as never)
    const tampered = { ...claimA, money: { minorUnits: 99999, currency: "USD" } }
    expect(verifyClaimAuditHash({ claim: tampered as never, storedHash })).toBe(false)
  })

  it("still reports a match for a claim reconstructed with a different key order", () => {
    const storedHash = hashClaim(claimA as never)
    expect(verifyClaimAuditHash({ claim: claimAReordered as never, storedHash })).toBe(true)
  })
})
