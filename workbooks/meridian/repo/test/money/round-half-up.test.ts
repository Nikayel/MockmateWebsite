import { describe, expect, it } from "vitest"
import { roundHalfUp } from "../../src/money/round-half-up"

describe("roundHalfUp", () => {
  it("leaves an amount that is already two decimal places unchanged", () => {
    expect(roundHalfUp(20)).toBe(20)
  })

  it("rounds down when the third decimal is below five", () => {
    expect(roundHalfUp(10.123)).toBe(10.12)
  })

  it("rounds up when the third decimal is five or above", () => {
    expect(roundHalfUp(10.127)).toBe(10.13)
  })
})
