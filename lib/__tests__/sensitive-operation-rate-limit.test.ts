import { describe, expect, it } from "vitest"
import { RATE_LIMIT_POLICIES, sensitivePolicyForPath } from "@/lib/rate-limiting"

describe("sensitive operation policies", () => {
  it("gives checkout and the customer portal independent buckets", () => {
    expect(sensitivePolicyForPath("/api/create-checkout")).toBe("checkout")
    expect(sensitivePolicyForPath("/api/customer-portal")).toBe("customerPortal")
    expect(RATE_LIMIT_POLICIES.checkout.prefix).not.toBe(RATE_LIMIT_POLICIES.customerPortal.prefix)
  })

  it("fails unknown sensitive paths toward the strict deletion policy", () => {
    expect(sensitivePolicyForPath("/api/delete-account")).toBe("accountDeletion")
    expect(sensitivePolicyForPath("/api/future-sensitive-action")).toBe("accountDeletion")
  })

  it("keeps account deletion stricter than payment navigation", () => {
    const deletion = RATE_LIMIT_POLICIES.accountDeletion.algorithm
    const checkout = RATE_LIMIT_POLICIES.checkout.algorithm
    expect(deletion.kind).toBe("sliding-window")
    expect(checkout.kind).toBe("sliding-window")
    if (deletion.kind !== "sliding-window" || checkout.kind !== "sliding-window") return
    expect(deletion.limit).toBeLessThan(checkout.limit)
  })
})
