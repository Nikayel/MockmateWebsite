import { describe, expect, it } from "vitest"
import { effectiveQueryParameters } from "../../src/http/compatibility-descriptor"
import { findOperationCompatibility } from "../../src/http/compatibility-descriptor"

describe("effectiveQueryParameters", () => {
  it("keeps offset in the v1 parameter list", () => {
    const operation = findOperationCompatibility({ method: "GET", path: "/claims" })
    if (!operation) throw new Error("expected GET /claims to be documented")
    const names = effectiveQueryParameters(operation, "v1").map((parameter) => parameter.name)
    expect(names).toContain("offset")
  })

  it("drops offset entirely from the v2 parameter list", () => {
    const operation = findOperationCompatibility({ method: "GET", path: "/claims" })
    if (!operation) throw new Error("expected GET /claims to be documented")
    const names = effectiveQueryParameters(operation, "v2").map((parameter) => parameter.name)
    expect(names).not.toContain("offset")
  })

  it("still lists cursor and limit for v2 - only offset is version-specific", () => {
    const operation = findOperationCompatibility({ method: "GET", path: "/claims" })
    if (!operation) throw new Error("expected GET /claims to be documented")
    const names = effectiveQueryParameters(operation, "v2").map((parameter) => parameter.name)
    expect(names).toContain("cursor")
    expect(names).toContain("limit")
  })

  it("falls back to the v1 list for an operation with no version-specific entry at all", () => {
    const operation = findOperationCompatibility({ method: "POST", path: "/claims" })
    if (!operation) throw new Error("expected POST /claims to be documented")
    expect(effectiveQueryParameters(operation, "v2")).toEqual(operation.queryParameters)
  })
})
