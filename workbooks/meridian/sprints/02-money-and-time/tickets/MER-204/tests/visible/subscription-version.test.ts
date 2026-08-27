import { describe, expect, it } from "vitest"
import { requestedVersion, resolveEnvelopeVersion } from "../../src/http/subscription-version"

describe("requestedVersion", () => {
  it("reads v2 from the version header", () => {
    expect(requestedVersion({ "x-api-version": "2" })).toBe("v2")
  })

  it("reads v1 from the version header", () => {
    expect(requestedVersion({ "x-api-version": "1" })).toBe("v1")
  })

  it("returns null when no version header is present at all", () => {
    expect(requestedVersion({})).toBeNull()
  })

  it("returns null for a value it does not recognize, rather than guessing", () => {
    expect(requestedVersion({ "x-api-version": "3" })).toBeNull()
  })
})

describe("resolveEnvelopeVersion", () => {
  it("uses the explicitly requested version when one is given", () => {
    expect(resolveEnvelopeVersion("v2", "v1")).toBe("v2")
  })

  it("falls back to the subscription's pinned version when none is requested", () => {
    expect(resolveEnvelopeVersion(null, "v2")).toBe("v2")
  })

  it("defaults to v1 when nothing is requested and nothing is pinned", () => {
    expect(resolveEnvelopeVersion(null, null)).toBe("v1")
  })

  it("prefers an explicit request over a different pinned version", () => {
    expect(resolveEnvelopeVersion("v1", "v2")).toBe("v1")
  })
})
