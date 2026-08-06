import { describe, it, expect } from "vitest"
import { describeCoverage, anyTruncated, USAGE_EVENT_SCAN_LIMIT } from "../scan-limits"

/**
 * Regression guard: every admin usage aggregate reads a capped page of
 * documents, and a scan that hit its cap used to be presented as a complete
 * total. A month with 10,001 events reported the newest 10,000 as if that were
 * everything.
 */

describe("describeCoverage", () => {
  it("reports a partial read as complete", () => {
    expect(describeCoverage(120, USAGE_EVENT_SCAN_LIMIT)).toEqual({
      scanned: 120,
      limit: USAGE_EVENT_SCAN_LIMIT,
      truncated: false,
    })
  })

  it("flags a read that hit its cap", () => {
    expect(describeCoverage(USAGE_EVENT_SCAN_LIMIT, USAGE_EVENT_SCAN_LIMIT).truncated).toBe(true)
  })

  it("flags a read that somehow exceeded its cap", () => {
    expect(describeCoverage(USAGE_EVENT_SCAN_LIMIT + 1, USAGE_EVENT_SCAN_LIMIT).truncated).toBe(
      true
    )
  })

  it("does not flag an empty read", () => {
    expect(describeCoverage(0, USAGE_EVENT_SCAN_LIMIT).truncated).toBe(false)
  })
})

describe("anyTruncated", () => {
  it("is true when any input scan was truncated", () => {
    expect(anyTruncated(describeCoverage(5, 100), describeCoverage(100, 100))).toBe(true)
  })

  it("is false when every scan was complete", () => {
    expect(anyTruncated(describeCoverage(5, 100), describeCoverage(7, 100))).toBe(false)
  })

  it("tolerates absent coverage", () => {
    expect(anyTruncated(undefined, undefined)).toBe(false)
    expect(anyTruncated(undefined, describeCoverage(100, 100))).toBe(true)
  })
})
