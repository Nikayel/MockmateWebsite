import { describe, expect, it } from "vitest"
import { domesticCardFee, summarizeMatchingFees } from "./payment-fees"

describe("payment-processing costs", () => {
  it("calculates Stripe's domestic-card baseline", () => {
    expect(domesticCardFee(25)).toBeCloseTo(1.025)
  })

  it("uses only matching USD charges when averaging actual fees", () => {
    expect(
      summarizeMatchingFees(
        [
          { amount: 2500, fee: 140, currency: "usd" },
          { amount: 2500, fee: 110, currency: "usd" },
          { amount: 22500, fee: 700, currency: "usd" },
          { amount: 2500, fee: 120, currency: "cad" },
        ],
        25
      )
    ).toEqual({ averageFee: 1.25, sampleSize: 2 })
  })
})
