import { describe, expect, it } from "vitest"
import { allocateRoundedTotal, roundHalfEven } from "../../src/money/round-half-up"

describe("roundHalfEven", () => {
  it("leaves a whole minor-unit count unchanged", () => {
    expect(roundHalfEven(2000)).toBe(2000)
  })

  it("rounds down when the fraction is below one half", () => {
    expect(roundHalfEven(10.12)).toBe(10)
  })

  it("rounds up when the fraction is above one half", () => {
    expect(roundHalfEven(10.87)).toBe(11)
  })

  it("rounds an exact tie down to an even neighbor", () => {
    expect(roundHalfEven(2.5)).toBe(2)
  })

  it("rounds an exact tie up to an even neighbor", () => {
    expect(roundHalfEven(3.5)).toBe(4)
  })

  it("rounds a negative-leaning tie to the even neighbor the same way", () => {
    expect(roundHalfEven(4.5)).toBe(4)
    expect(roundHalfEven(5.5)).toBe(6)
  })
})

describe("allocateRoundedTotal", () => {
  it("splits a total that divides evenly with nothing left to place", () => {
    const shares = allocateRoundedTotal({ total: { minorUnits: 300, currency: "USD" }, count: 3 })
    expect(shares).toEqual([
      { minorUnits: 100, currency: "USD" },
      { minorUnits: 100, currency: "USD" },
      { minorUnits: 100, currency: "USD" },
    ])
  })

  it("sums back to exactly the original total when the split leaves a remainder", () => {
    const shares = allocateRoundedTotal({ total: { minorUnits: 100, currency: "USD" }, count: 3 })
    const sum = shares.reduce((total, share) => total + share.minorUnits, 0)
    expect(sum).toBe(100)
  })

  it("front-loads the leftover minor units onto the first line items", () => {
    const shares = allocateRoundedTotal({ total: { minorUnits: 100, currency: "USD" }, count: 3 })
    expect(shares.map((share) => share.minorUnits)).toEqual([34, 33, 33])
  })

  it("carries the same currency onto every line item", () => {
    const shares = allocateRoundedTotal({ total: { minorUnits: 10001, currency: "EUR" }, count: 2 })
    expect(shares.every((share) => share.currency === "EUR")).toBe(true)
  })

  it("places a single leftover minor unit on the first item for a two-way split", () => {
    const shares = allocateRoundedTotal({ total: { minorUnits: 10001, currency: "USD" }, count: 2 })
    expect(shares.map((share) => share.minorUnits)).toEqual([5001, 5000])
  })

  it("gives every line item the same share when the total is already even", () => {
    const shares = allocateRoundedTotal({ total: { minorUnits: 10000, currency: "USD" }, count: 2 })
    expect(shares.map((share) => share.minorUnits)).toEqual([5000, 5000])
  })

  it("returns no shares for a zero count", () => {
    expect(allocateRoundedTotal({ total: { minorUnits: 100, currency: "USD" }, count: 0 })).toEqual(
      []
    )
  })

  it("puts the entire total on one line item for a count of one", () => {
    expect(
      allocateRoundedTotal({ total: { minorUnits: 41219, currency: "USD" }, count: 1 })
    ).toEqual([{ minorUnits: 41219, currency: "USD" }])
  })

  it("still sums exactly when the total is smaller than the number of line items", () => {
    const shares = allocateRoundedTotal({ total: { minorUnits: 1, currency: "USD" }, count: 3 })
    const sum = shares.reduce((total, share) => total + share.minorUnits, 0)
    expect(sum).toBe(1)
  })
})
