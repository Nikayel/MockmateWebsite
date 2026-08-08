import { describe, it, expect } from "vitest"
import { parseBoundedInt, clampInt } from "../query-params"

/**
 * These bounds are the only thing standing between `?hours=1000000` and a
 * full-collection Firestore scan, so the interesting cases are the hostile ones.
 */
describe("parseBoundedInt", () => {
  const options = { min: 1, max: 168, fallback: 24 }

  it("falls back when the param is absent or empty", () => {
    expect(parseBoundedInt(null, options)).toEqual({ ok: true, value: 24 })
    expect(parseBoundedInt(undefined, options)).toEqual({ ok: true, value: 24 })
    expect(parseBoundedInt("   ", options)).toEqual({ ok: true, value: 24 })
  })

  it("accepts an in-range integer unchanged", () => {
    expect(parseBoundedInt("72", options)).toEqual({ ok: true, value: 72 })
  })

  it("clamps a value above the ceiling instead of running the query", () => {
    expect(parseBoundedInt("1000000", options)).toEqual({ ok: true, value: 168 })
  })

  it("clamps a value below the floor", () => {
    expect(parseBoundedInt("-5", options)).toEqual({ ok: true, value: 1 })
    expect(parseBoundedInt("0", options)).toEqual({ ok: true, value: 1 })
  })

  it("rejects non-numeric input rather than letting NaN reach the query", () => {
    for (const bad of ["abc", "12abc", "1e9", "0x10", "3.5", "Infinity", "NaN"]) {
      expect(parseBoundedInt(bad, options).ok, bad).toBe(false)
    }
  })

  it("rejects integers too large to be safe", () => {
    expect(parseBoundedInt("99999999999999999999", options).ok).toBe(false)
  })
})

describe("clampInt", () => {
  const options = { min: 1, max: 100, fallback: 50 }

  it("returns the fallback for garbage instead of throwing", () => {
    expect(clampInt("abc", options)).toBe(50)
  })

  it("still clamps a hostile number", () => {
    expect(clampInt("500000", options)).toBe(100)
  })
})
