import { describe, it, expect } from "vitest"
import { calculateUnitEconomics } from "../usage-health"

/**
 * The old overview divided total AI spend by every account ever registered,
 * including everyone who never ran a session, so cost per user read far below
 * the real figure. Unit economics decide whether the pricing works, so the
 * denominator has to be the users who actually spent something.
 */

describe("calculateUnitEconomics", () => {
  it("divides spend by the users who actually spent, not by every account", () => {
    const economics = calculateUnitEconomics({
      totalCost: 12,
      activeUsers: 4,
      sessionsCounted: 40,
    })
    expect(economics.costPerActiveUser).toBe(3)
    expect(economics.costPerSession).toBe(0.3)
  })

  it("reports the denominators alongside the figures", () => {
    // A bare "cost per session" is unreadable without knowing how many
    // sessions the bounded scan actually covered.
    const economics = calculateUnitEconomics({
      totalCost: 5,
      activeUsers: 2,
      sessionsCounted: 10,
    })
    expect(economics.activeUsers).toBe(2)
    expect(economics.sessionsCounted).toBe(10)
  })

  it("returns null rather than dividing by zero on an empty platform", () => {
    const economics = calculateUnitEconomics({
      totalCost: 0,
      activeUsers: 0,
      sessionsCounted: 0,
    })
    expect(economics.costPerSession).toBeNull()
    expect(economics.costPerActiveUser).toBeNull()
  })

  it("returns null for a denominator of zero even when cost is not zero", () => {
    // Spend with no attributed sessions is possible (untracked callers), and
    // Infinity would render as "$Infinity" on the dashboard.
    const economics = calculateUnitEconomics({
      totalCost: 9,
      activeUsers: 0,
      sessionsCounted: 0,
    })
    expect(economics.costPerSession).toBeNull()
    expect(economics.costPerActiveUser).toBeNull()
  })
})
