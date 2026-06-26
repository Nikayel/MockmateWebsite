import { describe, expect, it } from "vitest"
import { computeElapsedSeconds } from "../useInterviewTimer"

// The hook itself is a thin wrapper around a setInterval effect; the test
// environment is node (no DOM / React renderer), so we cover the only piece of
// real logic — the elapsed-seconds computation that drives every tick.
describe("computeElapsedSeconds", () => {
  it("is zero at the start instant", () => {
    const start = 1_000_000
    expect(computeElapsedSeconds(start, start)).toBe(0)
  })

  it("counts whole seconds elapsed, flooring partials", () => {
    const start = 1_000_000
    expect(computeElapsedSeconds(start, start + 1000)).toBe(1)
    expect(computeElapsedSeconds(start, start + 1999)).toBe(1)
    expect(computeElapsedSeconds(start, start + 5000)).toBe(5)
    expect(computeElapsedSeconds(start, start + 65_000)).toBe(65)
  })
})
