import { describe, it, expect } from "vitest"
import { normalizeRegistry, nextSweepState } from "./experiment-registry"
import { EXPERIMENT_DESIGN } from "./experiment-readout"

describe("normalizeRegistry", () => {
  it("treats a missing document as a running experiment with an unknown start", () => {
    const registry = normalizeRegistry(null)
    expect(registry.status).toBe("running")
    expect(registry.startedAt).toBeNull()
    expect(registry.endedAt).toBeNull()
    expect(registry.sweep.inProgress).toBe(false)
    expect(registry.sweep.cursor).toBeNull()
  })

  it("carries the declared design with the lifecycle", () => {
    const registry = normalizeRegistry(null)
    expect(registry.design.primaryMetric).toBe(EXPERIMENT_DESIGN.primaryMetric)
    expect(registry.design.minUsersPerArm).toBe(EXPERIMENT_DESIGN.minUsersPerArm)
    expect(registry.design.stoppingRule).toContain("Fixed horizon")
  })

  it("keeps a stored lifecycle and resume cursor", () => {
    const registry = normalizeRegistry({
      status: "sweeping",
      startedAt: "2026-06-01T00:00:00.000Z",
      sweep: { inProgress: true, cursor: "u-500", pagesCompleted: 5, usersFlipped: 480 },
    })

    expect(registry.status).toBe("sweeping")
    expect(registry.startedAt).toBe("2026-06-01T00:00:00.000Z")
    expect(registry.sweep.cursor).toBe("u-500")
    expect(registry.sweep.pagesCompleted).toBe(5)
    expect(registry.sweep.usersFlipped).toBe(480)
  })

  it("rejects an unrecognised status rather than passing it through", () => {
    expect(normalizeRegistry({ status: "banana" }).status).toBe("running")
  })
})

describe("nextSweepState", () => {
  const start = {
    inProgress: false,
    cursor: null,
    pagesCompleted: 0,
    usersFlipped: 0,
    cardsConverted: 0,
    startedAt: null,
    updatedAt: null,
    lastError: null,
  }
  const now = "2026-08-08T12:00:00.000Z"

  it("stores the cursor so an interrupted sweep can resume", () => {
    const state = nextSweepState(
      start,
      { dryRun: false, nextCursor: "u-100", usersFlipped: 40, cardsConverted: 300, errorCount: 0 },
      now
    )

    expect(state.inProgress).toBe(true)
    expect(state.cursor).toBe("u-100")
    expect(state.pagesCompleted).toBe(1)
    expect(state.startedAt).toBe(now)
  })

  it("accumulates across pages", () => {
    const first = nextSweepState(
      start,
      { dryRun: false, nextCursor: "u-100", usersFlipped: 40, cardsConverted: 300, errorCount: 0 },
      now
    )
    const second = nextSweepState(
      first,
      { dryRun: false, nextCursor: "u-200", usersFlipped: 35, cardsConverted: 250, errorCount: 0 },
      now
    )

    expect(second.pagesCompleted).toBe(2)
    expect(second.usersFlipped).toBe(75)
    expect(second.cardsConverted).toBe(550)
    expect(second.startedAt).toBe(now)
  })

  it("closes the sweep when the last page reports no cursor", () => {
    const state = nextSweepState(
      { ...start, inProgress: true, cursor: "u-900", pagesCompleted: 9 },
      { dryRun: false, nextCursor: null, usersFlipped: 5, cardsConverted: 12, errorCount: 0 },
      now
    )

    expect(state.inProgress).toBe(false)
    expect(state.cursor).toBeNull()
    expect(state.pagesCompleted).toBe(10)
  })

  it("records errors without losing the resume point", () => {
    const state = nextSweepState(
      start,
      { dryRun: false, nextCursor: "u-100", usersFlipped: 10, cardsConverted: 5, errorCount: 3 },
      now
    )

    expect(state.lastError).toContain("3 users errored")
    expect(state.cursor).toBe("u-100")
  })

  it("leaves the resume state untouched for a dry run", () => {
    // A dry run converts nothing, so adopting its cursor would skip users a
    // real sweep still has to visit.
    const live = nextSweepState(
      start,
      { dryRun: false, nextCursor: "u-100", usersFlipped: 40, cardsConverted: 300, errorCount: 0 },
      now
    )
    const afterDryRun = nextSweepState(
      live,
      { dryRun: true, nextCursor: "u-900", usersFlipped: 400, cardsConverted: 3000, errorCount: 0 },
      now
    )

    expect(afterDryRun).toEqual(live)
  })
})
