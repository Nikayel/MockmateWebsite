import { describe, expect, it } from "vitest"
import type { SprintLabObjective } from "@/lib/sprint-labs/types"
import { buildObjectiveDeltas } from "../objective-deltas"

const OBJECTIVES: SprintLabObjective[] = [
  { id: "obj-1", label: "Tenant-scoped uniqueness", canDo: "I can enforce tenant isolation." },
  {
    id: "obj-2",
    label: "READ COMMITTED interleavings",
    canDo: "I can reason about read anomalies.",
  },
]

describe("buildObjectiveDeltas", () => {
  it("always starts 'before' at not_started (no real prior-state read exists)", () => {
    const deltas = buildObjectiveDeltas(OBJECTIVES, true)
    expect(deltas.every((d) => d.before === "not_started")).toBe(true)
  })

  it("marks every objective demonstrated on a finalized, clean (zero-escaped) run", () => {
    const deltas = buildObjectiveDeltas(OBJECTIVES, true)
    expect(deltas.map((d) => d.after)).toEqual(["demonstrated", "demonstrated"])
  })

  it("marks every objective practicing (never 'escaped') when anything escaped", () => {
    const deltas = buildObjectiveDeltas(OBJECTIVES, false)
    expect(deltas.map((d) => d.after)).toEqual(["practicing", "practicing"])
    expect(deltas.some((d) => d.after === "escaped")).toBe(false)
  })

  it("preserves label and sentence from the source objective", () => {
    const [first] = buildObjectiveDeltas(OBJECTIVES, true)
    expect(first.label).toBe("Tenant-scoped uniqueness")
    expect(first.sentence).toBe("I can enforce tenant isolation.")
  })

  it("returns an empty list for a ticket with no objectives", () => {
    expect(buildObjectiveDeltas([], true)).toEqual([])
  })
})
