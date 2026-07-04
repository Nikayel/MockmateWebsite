/**
 * Tests for research-driven category weighting and the user mix-choice resolver.
 */

import { describe, it, expect } from "vitest"
import { resolveResearchMix, resolveCategoryMix, SYSTEM_DESIGN_ENABLED } from "../category-weights"

function sum(weights: Record<string, number>): number {
  return Object.values(weights).reduce((a, b) => a + b, 0)
}

describe("resolveResearchMix", () => {
  it("always sums to 100", () => {
    expect(sum(resolveResearchMix("intern", undefined, "google"))).toBe(100)
    expect(sum(resolveResearchMix("intermediate", "swe", "google"))).toBe(100)
    expect(sum(resolveResearchMix("beginner", "fdse", "stripe"))).toBe(100)
  })

  it("excludes system design in v1 (not yet schedulable)", () => {
    expect(SYSTEM_DESIGN_ENABLED).toBe(false)
    expect(resolveResearchMix("advanced", "swe", "google")["system-design"]).toBe(0)
  })

  it("keeps interns algorithms-forward but not algorithms-only", () => {
    const mix = resolveResearchMix("intern", undefined, "google")
    expect(mix.dsa).toBeGreaterThan(mix.bugfix)
    expect(mix.dsa).toBeGreaterThan(mix.decomposition)
    expect(mix.bugfix).toBeGreaterThan(0)
    expect(mix.decomposition).toBeGreaterThan(0)
  })

  it("tilts practical shops (topTech) away from pure algorithms", () => {
    const google = resolveResearchMix("beginner", "swe", "google") // faang
    const stripe = resolveResearchMix("beginner", "swe", "stripe") // topTech
    // Stripe should lean less on DSA and more on debugging + feature building.
    expect(stripe.dsa).toBeLessThan(google.dsa)
    expect(stripe.bugfix + stripe.decomposition).toBeGreaterThan(
      google.bugfix + google.decomposition
    )
  })
})

describe("resolveCategoryMix", () => {
  const base = {
    experienceLevel: "beginner" as const,
    targetTrack: "swe" as const,
    companyId: "google" as const,
  }

  it("dsa-only yields 100% algorithms", () => {
    const mix = resolveCategoryMix({ ...base, mixMode: "dsa-only" })
    expect(mix.weights).toEqual({ dsa: 100, bugfix: 0, decomposition: 0, "system-design": 0 })
    expect(mix.mode).toBe("dsa-only")
  })

  it("full uses the research mix", () => {
    const mix = resolveCategoryMix({ ...base, mixMode: "full" })
    expect(mix.mode).toBe("full")
    expect(mix.weights).toEqual(resolveResearchMix("beginner", "swe", "google"))
  })

  it("custom renormalizes over only the selected categories", () => {
    const mix = resolveCategoryMix({
      ...base,
      mixMode: "custom",
      selectedCategories: ["dsa", "bugfix"],
    })
    expect(sum(mix.weights)).toBe(100)
    expect(mix.weights.decomposition).toBe(0)
    expect(mix.weights["system-design"]).toBe(0)
    expect(mix.weights.dsa).toBeGreaterThan(0)
    expect(mix.weights.bugfix).toBeGreaterThan(0)
  })

  it("drops system-design from custom selection in v1", () => {
    const mix = resolveCategoryMix({
      ...base,
      mixMode: "custom",
      selectedCategories: ["bugfix", "system-design"],
    })
    expect(mix.weights["system-design"]).toBe(0)
    expect(mix.weights.bugfix).toBe(100)
  })

  it("falls back to full when custom has no valid categories", () => {
    const mix = resolveCategoryMix({ ...base, mixMode: "custom", selectedCategories: [] })
    expect(mix.mode).toBe("full")
  })
})
