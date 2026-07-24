/**
 * Trust-boundary tests for calc specs: expressions must parse and resolve at spec
 * time, the pedagogy ramp fields are mandatory, and the one-sparkline cap holds.
 */
import { describe, it, expect } from "vitest"
import { parseWidgetSpec } from "../schema"

const qpsCalc = {
  type: "calc",
  title: "From DAU to peak QPS",
  predictPrompt: {
    question: "1M DAU, 10 actions each. Roughly what average QPS is that?",
    options: ["About 100", "About 1,000", "About 100,000"],
  },
  workedExample:
    "At the initial values: 1M users x 10 actions / 86,400 seconds is about 116 QPS average, and 3x peak is about 350.",
  inputs: [
    {
      kind: "slider",
      id: "dau",
      label: "Daily active users",
      min: 10000,
      max: 100000000,
      scale: "log",
      initial: 1000000,
      unit: "users",
    },
    {
      kind: "slider",
      id: "actions",
      label: "Actions per user per day",
      min: 1,
      max: 100,
      step: 1,
      initial: 10,
    },
    {
      kind: "select",
      id: "peak",
      label: "Peak multiplier",
      options: [
        { label: "x2", value: 2 },
        { label: "x3", value: 3 },
      ],
      initial: 1,
    },
  ],
  outputs: [
    {
      id: "avgQps",
      label: "Average QPS",
      expr: "dau * actions / 86400",
      format: "compact",
      sparkline: { over: "dau" },
    },
    { id: "peakQps", label: "Peak QPS", expr: "avgQps * peak", format: "compact" },
  ],
}

describe("calc schema", () => {
  it("parses a valid calc spec", () => {
    const result = parseWidgetSpec(JSON.stringify(qpsCalc))
    if (!result.ok) throw new Error(result.error)
    expect(result.spec.type).toBe("calc")
  })

  it("rejects an output expression that fails the mini-grammar", () => {
    const bad = { ...qpsCalc, outputs: [{ id: "x", label: "X", expr: "dau ** 2" }] }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
  })

  it("rejects an unknown identifier at spec time", () => {
    const bad = { ...qpsCalc, outputs: [{ id: "x", label: "X", expr: "dau * ghosts" }] }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("ghosts")
  })

  it("allows outputs to reference PRIOR outputs only", () => {
    const bad = {
      ...qpsCalc,
      outputs: [
        { id: "a", label: "A", expr: "b + 1" },
        { id: "b", label: "B", expr: "dau" },
      ],
    }
    expect(parseWidgetSpec(JSON.stringify(bad)).ok).toBe(false)
  })

  it("rejects a second sparkline", () => {
    const bad = {
      ...qpsCalc,
      outputs: qpsCalc.outputs.map((o) => ({ ...o, sparkline: { over: "dau" } })),
    }
    const result = parseWidgetSpec(JSON.stringify(bad))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain("one sparkline")
  })

  it("rejects a sparkline over a select input", () => {
    const bad = {
      ...qpsCalc,
      outputs: [{ ...qpsCalc.outputs[0], sparkline: { over: "peak" } }],
    }
    expect(parseWidgetSpec(JSON.stringify(bad)).ok).toBe(false)
  })

  it("rejects a log slider with min = 0", () => {
    const bad = {
      ...qpsCalc,
      inputs: [
        { kind: "slider", id: "dau", label: "DAU", min: 0, max: 100, scale: "log", initial: 10 },
      ],
      outputs: [{ id: "x", label: "X", expr: "dau" }],
    }
    expect(parseWidgetSpec(JSON.stringify(bad)).ok).toBe(false)
  })

  it("rejects a missing predictPrompt (the ramp is mandatory)", () => {
    const rest = { ...qpsCalc } as Record<string, unknown>
    delete rest.predictPrompt
    expect(parseWidgetSpec(JSON.stringify(rest)).ok).toBe(false)
  })

  it("rejects duplicate ids across inputs and outputs", () => {
    const bad = { ...qpsCalc, outputs: [{ id: "dau", label: "X", expr: "1 + 1" }] }
    expect(parseWidgetSpec(JSON.stringify(bad)).ok).toBe(false)
  })

  it("rejects an initial outside the slider range", () => {
    const bad = {
      ...qpsCalc,
      inputs: [{ kind: "slider", id: "dau", label: "DAU", min: 1, max: 10, initial: 50 }],
      outputs: [{ id: "x", label: "X", expr: "dau" }],
    }
    expect(parseWidgetSpec(JSON.stringify(bad)).ok).toBe(false)
  })
})
