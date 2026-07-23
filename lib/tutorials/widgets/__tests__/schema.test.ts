/**
 * Unit tests for the cswidget spec schema — the trust boundary between authored lesson
 * content and the widget renderers. Every rejection here is an error a renderer would
 * otherwise hit at runtime (no correct option to reveal, an item pointing at a bucket
 * that has no column, prose-facing JSON typos).
 */
import { describe, it, expect } from "vitest"
import { parseWidgetSpec } from "../schema"

const predict = {
  type: "check",
  kind: "predict",
  prompt: "A timeout fires on a call to service B. What does A know?",
  options: [
    {
      label: "B failed",
      feedback: "Tempting, but a timeout is ambiguous: B may be slow or the response was lost.",
    },
    {
      label: "Nothing about what B did",
      correct: true,
      feedback:
        "Right: lost request, lost response, slow peer, and dead peer are indistinguishable from A.",
    },
  ],
}

const classify = {
  type: "check",
  kind: "classify",
  prompt: "Sort each system by its behavior during a partition.",
  buckets: ["CP", "AP"],
  items: [
    { label: "etcd", bucket: "CP" },
    {
      label: "Cassandra (CL=ONE)",
      bucket: "AP",
      feedback: "Both sides accept writes and reconcile later.",
    },
  ],
  reveal:
    "Real systems are rarely globally CP or AP; consistency is usually tunable per operation.",
}

describe("check: predict", () => {
  it("parses a valid predict check", () => {
    const result = parseWidgetSpec(JSON.stringify(predict))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.spec.type).toBe("check")
  })

  it("rejects zero correct options", () => {
    const bad = { ...predict, options: predict.options.map((o) => ({ ...o, correct: false })) }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("exactly one correct")
  })

  it("rejects two correct options", () => {
    const bad = { ...predict, options: predict.options.map((o) => ({ ...o, correct: true })) }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
  })

  it("rejects a missing per-option feedback", () => {
    const bad = {
      ...predict,
      options: [{ label: "B failed" }, { label: "Nothing", correct: true, feedback: "ok" }],
    }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
  })

  it("rejects a single option (no real choice)", () => {
    const bad = { ...predict, options: [predict.options[1]] }
    expect(parseWidgetSpec(JSON.stringify(bad)).ok).toBe(false)
  })

  it("rejects classify fields on a predict check", () => {
    const bad = { ...predict, buckets: ["A", "B"] }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("must not define buckets")
  })
})

describe("check: classify", () => {
  it("parses a valid classify check", () => {
    expect(parseWidgetSpec(JSON.stringify(classify)).ok).toBe(true)
  })

  it("rejects an item whose bucket is not declared", () => {
    const bad = { ...classify, items: [...classify.items, { label: "ZooKeeper", bucket: "CA" }] }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("CA")
  })

  it("rejects duplicate bucket names", () => {
    const bad = { ...classify, buckets: ["CP", "CP"] }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("unique")
  })

  it("rejects a classify check without items", () => {
    const bad = { type: "check", kind: "classify", prompt: "Sort.", buckets: ["CP", "AP"] }
    expect(parseWidgetSpec(JSON.stringify(bad)).ok).toBe(false)
  })

  it("rejects predict options on a classify check", () => {
    const bad = { ...classify, options: predict.options }
    expect(parseWidgetSpec(JSON.stringify(bad)).ok).toBe(false)
  })
})

describe("parse boundary", () => {
  it("soft-fails invalid JSON with a readable error", () => {
    const result = parseWidgetSpec("{ not json")
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("did not parse")
  })

  it("soft-fails an unknown widget type", () => {
    const result = parseWidgetSpec(JSON.stringify({ type: "teleporter" }))
    expect(result.ok).toBe(false)
  })

  it("never throws on hostile input", () => {
    for (const source of ["", "null", "[]", '"check"', "42"]) {
      expect(() => parseWidgetSpec(source)).not.toThrow()
      expect(parseWidgetSpec(source).ok).toBe(false)
    }
  })
})
