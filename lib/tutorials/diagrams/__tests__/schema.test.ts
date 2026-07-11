/**
 * Diagram spec parser — the trust boundary between authored fence content and the
 * renderer. These guard that (a) every valid diagram type round-trips, and (b) any
 * malformed spec fails SOFTLY (readable error, never a throw) so a typo in one
 * lesson can never crash the lesson player.
 */
import { describe, it, expect } from "vitest"
import { parseDiagramSpec } from "../schema"

const valid: Record<string, unknown> = {
  pipeline: { type: "pipeline", preset: "sql-select", caption: "order of operations" },
  join: {
    type: "join",
    kind: "left",
    left: { name: "users", columns: ["id", "name"], rows: [[1, "Ada"]] },
    right: { name: "orders", columns: ["user_id", "total"], rows: [[1, 50]] },
    on: ["id", "user_id"],
  },
  "window-frame": {
    type: "window-frame",
    fn: "SUM",
    frame: "running",
    rows: [
      { label: "Jan", value: 100 },
      { label: "Feb", value: 200 },
    ],
  },
  "group-by": {
    type: "group-by",
    agg: "SUM",
    by: "dept",
    rows: [
      { group: "Eng", value: 100 },
      { group: "Sales", value: 80 },
    ],
  },
  er: {
    type: "er",
    tables: [{ name: "users", columns: [{ name: "id", key: "pk" }] }],
    relations: [{ from: "orders", to: "users", kind: "n-1" }],
  },
  "python-memory": {
    type: "python-memory",
    steps: [
      { code: "a = [1]", names: { a: "L1" }, objects: { L1: { kind: "list", value: "[1]" } } },
    ],
  },
  "call-stack": {
    type: "call-stack",
    title: "factorial(2)",
    steps: [{ stack: ["factorial(2)"] }, { stack: ["factorial(2)"], returning: "2" }],
  },
  comprehension: {
    type: "comprehension",
    loop: ["out = []", "for n in nums:", "    out.append(n)"],
    comp: "[n for n in nums]",
  },
  table: { type: "table", columns: ["a", "b"], rows: [[1, 2]], highlightCols: ["b"] },
}

describe("parseDiagramSpec", () => {
  it.each(Object.keys(valid))("accepts a valid %s spec", (key) => {
    const result = parseDiagramSpec(JSON.stringify(valid[key]))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.spec.type).toBe(key)
  })

  it("applies defaults (window-frame fn defaults to SUM)", () => {
    const result = parseDiagramSpec(
      JSON.stringify({
        type: "window-frame",
        frame: "running",
        rows: [
          { label: "x", value: 1 },
          { label: "y", value: 2 },
        ],
      })
    )
    expect(result.ok).toBe(true)
    if (result.ok && result.spec.type === "window-frame") expect(result.spec.fn).toBe("SUM")
  })

  it("returns a soft error (never throws) on malformed JSON", () => {
    const result = parseDiagramSpec("{ not json ")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/did not parse/i)
  })

  it("rejects an unknown diagram type with a readable error", () => {
    const result = parseDiagramSpec(JSON.stringify({ type: "hologram" }))
    expect(result.ok).toBe(false)
  })

  it("reports the field path on an invalid spec", () => {
    const result = parseDiagramSpec(JSON.stringify({ type: "join", kind: "sideways" }))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/invalid diagram spec/i)
  })

  it("rejects a moving frame that is not moving-N", () => {
    const result = parseDiagramSpec(
      JSON.stringify({
        type: "window-frame",
        frame: "moving",
        rows: [
          { label: "x", value: 1 },
          { label: "y", value: 2 },
        ],
      })
    )
    expect(result.ok).toBe(false)
  })
})
