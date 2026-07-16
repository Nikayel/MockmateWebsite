import { describe, expect, it } from "vitest"
import { sanitizeTestResultsForFirestore } from "../firestore-helpers"

/**
 * Firestore rejects `undefined` field values outright — the client is not built
 * with `ignoreUndefinedProperties`, so ONE undefined fails the ENTIRE document
 * write, not just that field. Every session write funnels through this function,
 * so a regression here silently kills autosave and loses roadmap progress on
 * submit. It had no coverage, which is how it broke.
 */
describe("sanitizeTestResultsForFirestore", () => {
  /** The invariant: no value Firestore refuses may survive sanitization. */
  function expectFirestoreSafe(rows: Array<Record<string, unknown>>) {
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        expect(value, `field "${key}" is undefined and would fail the write`).not.toBeUndefined()
      }
    }
  }

  it("maps an absent expected/actual pair to null, never undefined", () => {
    // Workspace suites and packs have no expected/actual — their signal is `error`.
    const rows = sanitizeTestResultsForFirestore([
      {
        description: "tests: rollup totals",
        passed: false,
        input: "tests",
        expected: undefined,
        actual: undefined,
        error: "assert 2 == 1",
      },
    ])

    expectFirestoreSafe(rows)
    expect(rows[0].expected).toBeNull()
    expect(rows[0].actual).toBeNull()
    expect(rows[0].error).toBe("assert 2 == 1")
  })

  it("still stringifies real DSA values", () => {
    const rows = sanitizeTestResultsForFirestore([
      {
        description: "two sum",
        passed: false,
        input: { nums: [2, 7], target: 9 },
        expected: [0, 1],
        actual: [1, 0],
        error: null,
      },
    ])

    expectFirestoreSafe(rows)
    expect(rows[0].input).toBe('{"nums":[2,7],"target":9}')
    expect(rows[0].expected).toBe("[0,1]")
    expect(rows[0].actual).toBe("[1,0]")
    expect(rows[0].error).toBeNull()
  })

  it("keeps falsy-but-real values distinct from absent ones", () => {
    const rows = sanitizeTestResultsForFirestore([
      { description: "d", passed: true, input: 0, expected: false, actual: null, error: null },
    ])

    expectFirestoreSafe(rows)
    expect(rows[0].input).toBe("0")
    expect(rows[0].expected).toBe("false")
    // null is a real value and must round-trip as the string "null", not become null.
    expect(rows[0].actual).toBe("null")
  })

  it("survives a row missing every optional field", () => {
    expectFirestoreSafe(sanitizeTestResultsForFirestore([{ description: "x", passed: true }]))
  })

  it("handles an empty result set", () => {
    expect(sanitizeTestResultsForFirestore([])).toEqual([])
  })
})
