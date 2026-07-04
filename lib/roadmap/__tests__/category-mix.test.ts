/**
 * Tests for the category allocator and non-DSA prioritizer.
 */

import { describe, it, expect } from "vitest"
import { allocateCategoryCounts, emptyCounts, type CategoryCounts } from "../category-mix"

function counts(partial: Partial<CategoryCounts>): CategoryCounts {
  return { ...emptyCounts(), ...partial }
}

describe("allocateCategoryCounts", () => {
  it("splits slots by weight when inventory is plentiful", () => {
    const { targetCounts, gaps } = allocateCategoryCounts(
      counts({ dsa: 60, bugfix: 20, decomposition: 20 }),
      20,
      counts({ dsa: 500, bugfix: 50, decomposition: 50 })
    )
    expect(targetCounts.dsa).toBe(12)
    expect(targetCounts.bugfix).toBe(4)
    expect(targetCounts.decomposition).toBe(4)
    expect(gaps).toHaveLength(0)
  })

  it("caps a thin category at its inventory and records a gap", () => {
    const { targetCounts, gaps } = allocateCategoryCounts(
      counts({ dsa: 40, bugfix: 30, decomposition: 30 }),
      20,
      counts({ dsa: 500, bugfix: 2, decomposition: 500 })
    )
    // bugfix wanted 6 but only 2 exist.
    expect(targetCounts.bugfix).toBe(2)
    expect(gaps).toEqual([{ category: "bugfix", wanted: 6, available: 2 }])
  })

  it("redistributes the shortfall to categories with headroom", () => {
    const { targetCounts } = allocateCategoryCounts(
      counts({ dsa: 40, bugfix: 30, decomposition: 30 }),
      20,
      counts({ dsa: 500, bugfix: 2, decomposition: 500 })
    )
    // Total scheduled should still reach the 20 slots despite the bugfix shortfall.
    const total = targetCounts.dsa + targetCounts.bugfix + targetCounts.decomposition
    expect(total).toBe(20)
    // The 4 unfillable bugfix slots move to decomposition/dsa (which have room).
    expect(targetCounts.decomposition).toBeGreaterThanOrEqual(6)
  })

  it("never schedules a category the user excluded (weight 0)", () => {
    const { targetCounts } = allocateCategoryCounts(
      counts({ dsa: 100 }),
      10,
      counts({ dsa: 500, bugfix: 50, decomposition: 50 })
    )
    expect(targetCounts.bugfix).toBe(0)
    expect(targetCounts.decomposition).toBe(0)
    expect(targetCounts.dsa).toBe(10)
  })
})
