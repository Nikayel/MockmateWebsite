/**
 * Tests for resolvePatternForScenario — the fix for System Design cards being
 * silently bucketed under "arrays-hashing".
 */

import { describe, it, expect } from "vitest"
import { resolvePatternForScenario } from "../pattern-resolution"

describe("resolvePatternForScenario", () => {
  it("keeps a DSA scenario's real pattern", () => {
    expect(resolvePatternForScenario({ type: "dsa", pattern: "two-pointers" })).toBe("two-pointers")
  })

  it("buckets system-design scenarios under case-lab", () => {
    expect(resolvePatternForScenario({ type: "system-design" })).toBe("case-lab")
  })

  it("buckets bugfix scenarios under case-lab", () => {
    expect(resolvePatternForScenario({ type: "bugfix" })).toBe("case-lab")
  })

  it("keeps the legacy arrays-hashing default for DSA scenarios missing a pattern", () => {
    expect(resolvePatternForScenario({ type: "dsa" })).toBe("arrays-hashing")
  })

  it("rejects unknown pattern strings instead of storing junk", () => {
    expect(resolvePatternForScenario({ type: "system-design", pattern: "not-a-pattern" })).toBe(
      "case-lab"
    )
  })
})
