import { describe, expect, it } from "vitest"
import type { GateResult } from "@/lib/sprint-labs/types"
import { buildGateCards, buildHeadline, GATE_ORDER } from "../gate-view-model"

const FULL_RESULTS: GateResult[] = [
  {
    gate: "visible",
    cases: [{ testId: "visible-summary", humanName: "10/10 visible tests passed", passed: true }],
  },
  {
    gate: "hidden",
    cases: [
      {
        testId: "h1",
        humanName: "two concurrent submits both create an extraction",
        passed: false,
      },
      { testId: "h2", humanName: "a retry inside the window bills twice", passed: false },
      { testId: "h3", humanName: "a normal single submit", passed: true },
    ],
  },
  {
    gate: "regression",
    cases: [
      { testId: "regression-summary", humanName: "128/128 regression tests passed", passed: true },
    ],
  },
  { gate: "adversary", cases: [] },
]

describe("buildGateCards", () => {
  it("renders every gate as pending before any reveal", () => {
    const cards = buildGateCards(FULL_RESULTS, 0)
    expect(cards).toHaveLength(4)
    expect(cards.every((c) => c.status === "pending")).toBe(true)
    expect(cards.map((c) => c.id)).toEqual(GATE_ORDER)
  })

  it("reveals gates strictly in the fixed order visible -> hidden -> regression -> adversary", () => {
    const oneRevealed = buildGateCards(FULL_RESULTS, 1)
    expect(oneRevealed[0].status).not.toBe("pending")
    expect(oneRevealed[1].status).toBe("pending")
    expect(oneRevealed[2].status).toBe("pending")
    expect(oneRevealed[3].status).toBe("pending")

    const threeRevealed = buildGateCards(FULL_RESULTS, 3)
    expect(threeRevealed[0].status).not.toBe("pending")
    expect(threeRevealed[1].status).not.toBe("pending")
    expect(threeRevealed[2].status).not.toBe("pending")
    expect(threeRevealed[3].status).toBe("pending")
  })

  it("projects the hidden gate's failed cases as humanName-only escaped strings, nothing else", () => {
    const cards = buildGateCards(FULL_RESULTS, 4)
    const hidden = cards.find((c) => c.id === "hidden")!
    expect(hidden.status).toBe("failed")
    expect(hidden.passed).toBe(1)
    expect(hidden.total).toBe(3)
    expect(hidden.escaped).toEqual([
      "two concurrent submits both create an extraction",
      "a retry inside the window bills twice",
    ])
    // Every key on the hidden card is one of these — no room for a stack, a diff, or raw output.
    // (summaryLine is the aggregate-gate field and is never even assigned on a hidden card.)
    expect(Object.keys(hidden).sort()).toEqual(
      ["definition", "escaped", "id", "name", "passed", "status", "total"].sort()
    )
  })

  it("never attaches a per-defect name to visible/regression/adversary — only the one aggregate summary line", () => {
    const cards = buildGateCards(FULL_RESULTS, 4)
    const visible = cards.find((c) => c.id === "visible")!
    const regression = cards.find((c) => c.id === "regression")!
    expect(visible.escaped).toEqual([])
    expect(visible.summaryLine).toBe("10/10 visible tests passed")
    expect(regression.escaped).toEqual([])
    expect(regression.summaryLine).toBe("128/128 regression tests passed")
  })

  it("renders an empty aggregate gate (no counts posted) as errored, never as a failure", () => {
    const cards = buildGateCards(FULL_RESULTS, 4)
    const adversary = cards.find((c) => c.id === "adversary")!
    expect(adversary.status).toBe("errored")
    expect(adversary.escaped).toEqual([])
  })

  it("treats a zero-case hidden result as errored rather than a false 0-of-0 pass", () => {
    const cards = buildGateCards(
      [
        { gate: "visible", cases: [] },
        { gate: "hidden", cases: [] },
        { gate: "regression", cases: [] },
        { gate: "adversary", cases: [] },
      ],
      4
    )
    expect(cards.find((c) => c.id === "hidden")!.status).toBe("errored")
  })
})

describe("buildHeadline", () => {
  it("reads as a clean pass with zero escaped defects", () => {
    expect(buildHeadline("MER-305", [])).toEqual({
      text: "Nothing escaped on MER-305.",
      tone: "success",
    })
  })

  it("singularizes exactly one escaped defect", () => {
    expect(buildHeadline("MER-305", ["a retry bills twice"]).text).toBe(
      "1 escaped defect on MER-305."
    )
  })

  it("counts multiple escaped defects without naming them in the headline itself", () => {
    const headline = buildHeadline("MER-305", ["a", "b", "c"])
    expect(headline.text).toBe("3 escaped defects on MER-305.")
    expect(headline.tone).toBe("neutral")
  })
})
