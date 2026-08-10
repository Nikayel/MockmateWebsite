import { describe, expect, it } from "vitest"
import { buildTimeContextNote } from "../time-context-note"

describe("buildTimeContextNote", () => {
  it("returns empty when the clock has not started", () => {
    expect(buildTimeContextNote(null, 25)).toBe("")
    expect(buildTimeContextNote(undefined, 25)).toBe("")
  })

  it("stays silent inside the first minute", () => {
    expect(buildTimeContextNote(0, 25)).toBe("")
    expect(buildTimeContextNote(59, 25)).toBe("")
  })

  it("emits elapsed and expected minutes from the first full minute", () => {
    expect(buildTimeContextNote(60, 25)).toBe("\n\n[TIME: 1 min elapsed of ~25 min expected]")
    expect(buildTimeContextNote(90, 25)).toBe("\n\n[TIME: 1 min elapsed of ~25 min expected]")
  })

  it("reports an overrun session accurately (the 26-of-15 case)", () => {
    expect(buildTimeContextNote(26 * 60, 15)).toBe("\n\n[TIME: 26 min elapsed of ~15 min expected]")
  })

  it("omits the expectation clause when the scenario has no estimate", () => {
    expect(buildTimeContextNote(300, undefined)).toBe("\n\n[TIME: 5 min elapsed]")
    expect(buildTimeContextNote(300, null)).toBe("\n\n[TIME: 5 min elapsed]")
    expect(buildTimeContextNote(300, 0)).toBe("\n\n[TIME: 5 min elapsed]")
  })
})
