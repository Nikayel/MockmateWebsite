import { describe, it, expect } from "vitest"
import { parseWidgetSpec } from "../schema"

const frame = (note: string, extra: object = {}) => ({
  note,
  rows: [{ label: "segment 1", cells: [{ text: "k1=3" }, { text: "k2=7", state: "active" }] }],
  ...extra,
})

const valid = {
  type: "steps",
  title: "Log compaction",
  frames: [frame("Two live keys."), frame("k1 rewritten.", {})],
}

describe("steps family schema", () => {
  it("accepts a minimal two-frame spec and defaults cell state", () => {
    const result = parseWidgetSpec(JSON.stringify(valid))
    expect(result.ok).toBe(true)
    if (result.ok && result.spec.type === "steps") {
      expect(result.spec.frames[0].rows[0].cells[0].state).toBe("normal")
      expect(result.spec.frames[0].rows[0].cells[1].state).toBe("active")
    }
  })

  it("rejects a single frame", () => {
    const result = parseWidgetSpec(JSON.stringify({ ...valid, frames: [frame("only one")] }))
    expect(result.ok).toBe(false)
  })

  it("rejects a predict gate on the first frame (it would never show)", () => {
    const gated = {
      ...valid,
      frames: [frame("start", { predict: { question: "q", options: ["a", "b"] } }), frame("end")],
    }
    const result = parseWidgetSpec(JSON.stringify(gated))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("first frame")
  })

  it("rejects more than 2 predict gates", () => {
    const p = { question: "q", options: ["a", "b"] }
    const gated = {
      ...valid,
      frames: [
        frame("f0"),
        frame("f1", { predict: p }),
        frame("f2", { predict: p }),
        frame("f3", { predict: p }),
      ],
    }
    const result = parseWidgetSpec(JSON.stringify(gated))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("predict gates")
  })

  it("rejects a frame over the 48-cell cognitive-load cap", () => {
    const wide = {
      ...valid,
      frames: [
        frame("ok"),
        {
          note: "too many",
          rows: Array.from({ length: 5 }, () => ({
            cells: Array.from({ length: 10 }, (_, i) => ({ text: `c${i}` })),
          })),
        },
      ],
    }
    const result = parseWidgetSpec(JSON.stringify(wide))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("48")
  })

  it("rejects cell text over 40 chars (cells are chips, not paragraphs)", () => {
    const long = {
      ...valid,
      frames: [frame("ok"), { note: "n", rows: [{ cells: [{ text: "x".repeat(41) }] }] }],
    }
    expect(parseWidgetSpec(JSON.stringify(long)).ok).toBe(false)
  })
})
