import { describe, expect, it } from "vitest"
import { calculateMarginProjections, costPerSession } from "./calculator"

describe("subscription unit economics", () => {
  it("calculates the requested 5, 10, and 20-session gross margins", () => {
    const projections = calculateMarginProjections({
      revenuePerSubscriber: 25,
      paymentProcessingCost: 1.4,
      perSessionCosts: [0.011, 0.004, 0, 0],
    })

    expect(projections.map((projection) => projection.sessionsPerMonth)).toEqual([5, 10, 20])
    expect(projections[0].variableSessionCost).toBeCloseTo(0.075)
    expect(projections[0].totalCost).toBeCloseTo(1.475)
    expect(projections[0].grossProfit).toBeCloseTo(23.525)
    expect(projections[0].grossMarginPercent).toBeCloseTo(94.1)
    expect(projections[2].grossMarginPercent).toBeCloseTo(93.2)
  })

  it("does not invent a per-session cost without measured sessions", () => {
    expect(costPerSession(4, 0)).toBeNull()
    const projections = calculateMarginProjections({
      revenuePerSubscriber: 25,
      paymentProcessingCost: 1.03,
      perSessionCosts: [null, null, 0, null],
    })
    expect(projections.every((projection) => projection.grossMarginPercent === null)).toBe(true)
  })
})
