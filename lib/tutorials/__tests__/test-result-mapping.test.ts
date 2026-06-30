/**
 * The hidden-test masking contract (HANDOFF §C): hidden workspace tests execute, but their source,
 * suite/name, and assertion text must never reach the UI — only pass/fail, behind a generic label.
 */
import { describe, it, expect } from "vitest"
import { mapResultRow } from "../test-result-mapping"

describe("mapResultRow", () => {
  it("maps a visible single-file row through unchanged", () => {
    const row = mapResultRow({
      description: "to_fahrenheit(100) == 212",
      passed: true,
      input: { c: 100 },
      expected: 212,
      actual: 212,
      error: null,
    })
    expect(row.description).toBe("to_fahrenheit(100) == 212")
    expect(row.passed).toBe(true)
    expect(row.expected).toBe(212)
  })

  it("derives a description from suite + name for workspace rows", () => {
    const row = mapResultRow({
      suite: "test_pricing",
      name: "test_apply_discount",
      passed: true,
      error: null,
    })
    expect(row.description).toBe("test_pricing: test_apply_discount")
  })

  it("masks a FAILED hidden row — no suite/name, no assertion text", () => {
    const row = mapResultRow({
      suite: "hidden_edge_cases",
      name: "test_negative_balance_raises",
      passed: false,
      error: "AssertionError: expected ValueError for balance < 0, got None",
      isHidden: true,
    })
    expect(row.description).toBe("Hidden test")
    expect(row.passed).toBe(false)
    // None of the revealing fields may appear anywhere in the mapped row.
    const serialized = JSON.stringify(row)
    expect(serialized).not.toContain("hidden_edge_cases")
    expect(serialized).not.toContain("test_negative_balance_raises")
    expect(serialized).not.toContain("ValueError")
    expect(serialized).not.toContain("AssertionError")
    expect(row.error).toBeTruthy() // a generic, non-revealing failure note
  })

  it("masks a PASSED hidden row to a clean pass with no detail", () => {
    const row = mapResultRow({
      suite: "hidden_edge_cases",
      name: "test_secret",
      passed: true,
      error: null,
      isHidden: true,
    })
    expect(row.description).toBe("Hidden test")
    expect(row.passed).toBe(true)
    expect(row.error).toBeNull()
    expect(JSON.stringify(row)).not.toContain("test_secret")
  })
})
