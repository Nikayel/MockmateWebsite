/**
 * Tests for the category allocator and non-DSA prioritizer.
 */

import { describe, it, expect } from "vitest"
import {
  allocateCategoryCounts,
  allocateBalancedCategoryCounts,
  emptyCounts,
  prioritizeNonDsaQuestions,
  type CategoryCounts,
} from "../category-mix"
import { scenarios } from "@/lib/scenarios"
import { getCompanyById } from "@/lib/data/company-questions"
import type { UserRoadmapAssessment } from "@/lib/data/company-questions/types"

function counts(partial: Partial<CategoryCounts>): CategoryCounts {
  return { ...emptyCounts(), ...partial }
}

const assessment: UserRoadmapAssessment = {
  targetCompany: "meta",
  interviewDate: new Date("2027-01-01"),
  daysRemaining: 30,
  experienceLevel: "intern",
  problemsSolvedEstimate: 0,
  patternFamiliarity: [],
  hoursPerDay: 2,
  preferredDifficulty: "mixed",
  targetScore: 80,
}

describe("company debugging selection", () => {
  it("puts Meta's reported pattern before an easier generic must-know", () => {
    const company = getCompanyById("meta")!
    const generic = scenarios.find((s) => s.id === "bugfix-onboarding")!
    const ranked = prioritizeNonDsaQuestions(scenarios, assessment, {
      ...company,
      mustKnowQuestions: [
        ...company.mustKnowQuestions,
        { ...company.mustKnowQuestions[0], scenarioId: generic.id },
      ],
    }).filter((q) => q.scenarioType === "bugfix")
    expect(ranked[0].scenarioId).toBe("bugfix-maze-navigation")
    expect(ranked.some((q) => q.scenarioId === generic.id)).toBe(true)
    expect(
      ranked.every((q) => q.companyAlignment === "generic" || q.companyAlignment === "meta-maze")
    ).toBe(true)
  })

  it("keeps only one executable entry per language-variant group", () => {
    const ranked = prioritizeNonDsaQuestions(scenarios, assessment, getCompanyById("meta")!)
    expect(
      ranked.filter((q) => q.scenarioId.startsWith("bugfix-rate-limiter-error-handling"))
    ).toHaveLength(1)
    const pythonOnly = scenarios.filter((s) => s.id !== "bugfix-rate-limiter-error-handling")
    expect(
      prioritizeNonDsaQuestions(pythonOnly, assessment, getCompanyById("meta")!).some(
        (q) => q.scenarioId === "bugfix-rate-limiter-error-handling-python"
      )
    ).toBe(true)
  })
})

describe("allocateCategoryCounts", () => {
  it("never fills an exhausted debugging-only selection with algorithms", () => {
    const { targetCounts } = allocateCategoryCounts(
      counts({ bugfix: 100 }),
      20,
      counts({ bugfix: 2, dsa: 100 })
    )
    expect(targetCounts).toEqual(counts({ bugfix: 2 }))
  })
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

describe("balanced recommendation allocation", () => {
  it("caps both categories at the thinner inventory instead of diluting debugging", () => {
    expect(allocateBalancedCategoryCounts(200, counts({ dsa: 200, bugfix: 28 }))).toEqual(
      counts({ dsa: 28, bugfix: 28 })
    )
  })

  it("gives an odd remaining slot to debugging", () => {
    expect(allocateBalancedCategoryCounts(5, counts({ dsa: 10, bugfix: 10 }))).toEqual(
      counts({ dsa: 2, bugfix: 3 })
    )
    expect(allocateBalancedCategoryCounts(1, counts({ dsa: 10, bugfix: 10 }))).toEqual(
      counts({ bugfix: 1 })
    )
  })
})
