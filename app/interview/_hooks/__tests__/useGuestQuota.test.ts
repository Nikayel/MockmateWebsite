import { describe, expect, it } from "vitest"
import { isUsageBlocked, type UsageLimit } from "../useGuestQuota"

// The hook wires React state + Firestore/guest-session calls, which can't run
// in the node test env. The entitlement-sensitive decision is the pure gate,
// which is covered exhaustively here.
const exhausted: UsageLimit = { used: 5, limit: 5, allowed: false }
const available: UsageLimit = { used: 2, limit: 5, allowed: true }

describe("isUsageBlocked", () => {
  it("blocks a signed-in user who has exhausted a non-DSA allowance", () => {
    expect(isUsageBlocked(true, exhausted, "bugfix")).toBe(true)
    expect(isUsageBlocked(true, exhausted, "system-design")).toBe(true)
  })

  it("never blocks DSA scenarios, even when exhausted", () => {
    expect(isUsageBlocked(true, exhausted, "dsa")).toBe(false)
  })

  it("does not block when the allowance still permits a session", () => {
    expect(isUsageBlocked(true, available, "bugfix")).toBe(false)
  })

  it("never blocks guests (no signed-in user)", () => {
    expect(isUsageBlocked(false, exhausted, "bugfix")).toBe(false)
  })

  it("does not block before a usage limit has loaded", () => {
    expect(isUsageBlocked(true, null, "bugfix")).toBe(false)
  })
})
