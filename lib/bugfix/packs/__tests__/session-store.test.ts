import { describe, expect, it } from "vitest"
import { initPackProgress } from "../machine"
import { normalizePackProgress } from "../session-store"

describe("normalizePackProgress", () => {
  it("accepts a well-formed progress and clamps hint level", () => {
    const stored = { version: 1, state: "FIX", hintLevel: 9, nonAdvancingTurns: 3, history: [] }
    const normalized = normalizePackProgress(stored)
    expect(normalized).not.toBeNull()
    expect(normalized?.state).toBe("FIX")
    expect(normalized?.hintLevel).toBe(3)
    expect(normalized?.nonAdvancingTurns).toBe(3)
  })

  it("round-trips a fresh init", () => {
    expect(normalizePackProgress(initPackProgress())).toEqual(initPackProgress())
  })

  it("rejects an unknown version", () => {
    expect(normalizePackProgress({ version: 2, state: "OPENING" })).toBeNull()
  })

  it("rejects an unknown state", () => {
    expect(normalizePackProgress({ version: 1, state: "NOT_A_STATE" })).toBeNull()
  })

  it("rejects non-objects", () => {
    expect(normalizePackProgress(null)).toBeNull()
    expect(normalizePackProgress("OPENING")).toBeNull()
    expect(normalizePackProgress(42)).toBeNull()
  })

  it("defaults missing counters and history", () => {
    const normalized = normalizePackProgress({ version: 1, state: "SCOPE" })
    expect(normalized).toEqual({
      version: 1,
      state: "SCOPE",
      hintLevel: 0,
      nonAdvancingTurns: 0,
      history: [],
    })
  })
})
