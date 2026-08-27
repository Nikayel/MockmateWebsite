import { describe, expect, it } from "vitest"
import { parseClaimPayload } from "../../../src/http/claims-parser"

describe("parseClaimPayload", () => {
  it("accepts a well-formed claim payload", () => {
    const result = parseClaimPayload({ tenantId: "northwind", amount: 412.19 })
    expect(result.ok).toBe(true)
  })

  it("rejects a payload missing tenantId", () => {
    const result = parseClaimPayload({ amount: 412.19 })
    expect(result.ok).toBe(false)
  })
})
