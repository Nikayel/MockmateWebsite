import { describe, it, expect } from "vitest"
import { sortRows, compareRowValues } from "../table-sort"

/**
 * Admin tables previously did not sort at all: DataTable flipped the header
 * arrow and re-rendered the same row order. These cover the comparator that
 * replaced it, against the value shapes admin rows genuinely hold.
 */

describe("sortRows", () => {
  it("orders numbers numerically rather than as text", () => {
    const rows = [{ n: 9 }, { n: 100 }, { n: 25 }]
    expect(sortRows(rows, "n", "asc").map((r) => r.n)).toEqual([9, 25, 100])
    expect(sortRows(rows, "n", "desc").map((r) => r.n)).toEqual([100, 25, 9])
  })

  it("orders numeric strings numerically", () => {
    // Counts arrive as strings from some admin routes; "100" must not precede "9".
    const rows = [{ n: "9" }, { n: "100" }, { n: "25" }]
    expect(sortRows(rows, "n", "asc").map((r) => r.n)).toEqual(["9", "25", "100"])
  })

  it("orders ISO date strings as time", () => {
    const rows = [{ d: "2026-03-01" }, { d: "2026-01-15" }, { d: "2026-02-20" }]
    expect(sortRows(rows, "d", "asc").map((r) => r.d)).toEqual([
      "2026-01-15",
      "2026-02-20",
      "2026-03-01",
    ])
  })

  it("orders serialized Firestore timestamps as time", () => {
    // Firestore Timestamps cross the wire as { seconds } or { _seconds }.
    const rows = [{ t: { seconds: 300 } }, { t: { _seconds: 100 } }, { t: { seconds: 200 } }]
    expect(sortRows(rows, "t", "asc").map((r) => r.t)).toEqual([
      { _seconds: 100 },
      { seconds: 200 },
      { seconds: 300 },
    ])
  })

  it("sinks blanks to the bottom in both directions", () => {
    // A user who never ran a session has no lastSeen. Flipping the column must
    // not bury every populated row under the blanks.
    const rows = [{ v: 5 }, { v: null }, { v: 1 }, { v: undefined }, { v: "" }]
    expect(
      sortRows(rows, "v", "asc")
        .slice(0, 2)
        .map((r) => r.v)
    ).toEqual([1, 5])
    expect(
      sortRows(rows, "v", "desc")
        .slice(0, 2)
        .map((r) => r.v)
    ).toEqual([5, 1])
    expect(
      sortRows(rows, "v", "desc")
        .slice(2)
        .every((r) => !r.v)
    ).toBe(true)
  })

  it("compares strings case-insensitively", () => {
    const rows = [{ e: "Zoe@x.com" }, { e: "adam@x.com" }, { e: "Mia@x.com" }]
    expect(sortRows(rows, "e", "asc").map((r) => r.e)).toEqual([
      "adam@x.com",
      "Mia@x.com",
      "Zoe@x.com",
    ])
  })

  it("does not mutate the array it was given", () => {
    // The caller passes a React prop straight in.
    const rows = [{ n: 3 }, { n: 1 }]
    const sorted = sortRows(rows, "n", "asc")
    expect(rows.map((r) => r.n)).toEqual([3, 1])
    expect(sorted).not.toBe(rows)
  })

  it("returns the original array when no column is selected", () => {
    const rows = [{ n: 3 }, { n: 1 }]
    expect(sortRows(rows, null, "asc")).toBe(rows)
  })

  it("treats a missing column key as blank rather than throwing", () => {
    const rows = [{ n: 1 }, { n: 2 }]
    expect(() => sortRows(rows, "nope", "asc")).not.toThrow()
  })
})

describe("compareRowValues", () => {
  it("orders booleans with false first ascending", () => {
    expect(compareRowValues(false, true, "asc")).toBeLessThan(0)
    expect(compareRowValues(false, true, "desc")).toBeGreaterThan(0)
  })

  it("treats NaN and Infinity as blank rather than poisoning the order", () => {
    expect(compareRowValues(NaN, 5, "asc")).toBeGreaterThan(0)
    expect(compareRowValues(Infinity, 5, "asc")).toBeGreaterThan(0)
  })

  it("reports equality for two blanks", () => {
    expect(compareRowValues(null, undefined, "asc")).toBe(0)
  })
})
