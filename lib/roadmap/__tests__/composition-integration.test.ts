/**
 * Integration + backward-compat tests for roadmap category composition.
 *
 * Proves the "roadmap is only DSA" regression is gone (full mix now schedules
 * bug-fix and feature-building nodes) and that legacy DSA-only roadmap docs
 * still deserialize without a migration.
 */

import { describe, it, expect } from "vitest"
import { scenarios } from "@/lib/scenarios"
import { generatePersonalizedRoadmap, recalculateRoadmap } from "../prioritization-algorithm"
import { getCompanyById } from "@/lib/data/company-questions"
import { getBugfixCompanyProfile } from "@/lib/scenarios/company-alignment"
import { resolveCategoryMix } from "../category-weights"
import { serializeRoadmapDocument, isRoadmapQuestionStatus } from "../roadmap-serialization"
import type { UserRoadmapAssessment } from "@/lib/data/company-questions/types"

function makeAssessment(overrides: Partial<UserRoadmapAssessment> = {}): UserRoadmapAssessment {
  return {
    targetCompany: "google",
    interviewDate: new Date(Date.UTC(2026, 8, 1)),
    daysRemaining: 30,
    experienceLevel: "intermediate",
    targetTrack: "swe",
    problemsSolvedEstimate: 100,
    patternFamiliarity: [],
    hoursPerDay: 3,
    preferredDifficulty: "mixed",
    targetScore: 80,
    ...overrides,
  }
}

describe("generatePersonalizedRoadmap composition", () => {
  it.each(["google", "meta", "stripe", "palantir", "amazon"] as const)(
    "schedules matching-company debugging before Generic practice for %s",
    (targetCompany) => {
      const roadmap = generatePersonalizedRoadmap(
        scenarios,
        makeAssessment({ targetCompany, hoursPerDay: 2 }),
        "test-user"
      )!
      const nodes = roadmap.dailyPlans.flatMap((p) => p.questions)
      const debugging = nodes.filter((q) => q.scenarioType === "bugfix")
      const company = getCompanyById(targetCompany)!
      const expectedAligned = scenarios.filter(
        (s) =>
          s.type === "bugfix" &&
          getBugfixCompanyProfile(s.companyAlignment)?.company === company.name
      )
      expect(debugging.length).toBeGreaterThan(0)
      expect(debugging.length).toBeGreaterThanOrEqual(
        nodes.filter((q) => q.scenarioType === "dsa").length
      )
      expect(
        new Set(debugging.filter((q) => q.companyAlignment !== "generic").map((q) => q.scenarioId))
      ).toEqual(new Set(expectedAligned.map((s) => s.id)))
      let reachedGeneric = false
      for (const node of debugging) {
        expect(node.companyAlignment).toBeDefined()
        const profile = getBugfixCompanyProfile(node.companyAlignment!)
        if (!profile) reachedGeneric = true
        else {
          expect(profile.company).toBe(company.name)
          expect(reachedGeneric).toBe(false)
        }
      }
      const familyIds = debugging
        .map((q) => scenarios.find((s) => s.id === q.scenarioId)!)
        .map((s) => s.variantGroup ?? s.id)
      expect(new Set(familyIds).size).toBe(familyIds.length)
    }
  )

  it("does not bring back another language of an already-completed task on recalculation", () => {
    const roadmap = generatePersonalizedRoadmap(
      scenarios,
      makeAssessment({
        interviewDate: new Date("2027-01-01"),
        categoryMix: resolveCategoryMix({
          mixMode: "custom",
          selectedCategories: ["bugfix"],
          experienceLevel: "intermediate",
          companyId: "google",
        }),
      }),
      "test-user"
    )!
    const variant = roadmap.dailyPlans
      .flatMap((p) => p.questions)
      .find((q) => q.scenarioId === "bugfix-rate-limiter-error-handling")!
    expect(variant).toBeDefined()
    variant.status = "completed"
    const replanned = recalculateRoadmap(roadmap, scenarios)
    expect(
      replanned.dailyPlans
        .flatMap((p) => p.questions)
        .some((q) => q.scenarioId.startsWith("bugfix-rate-limiter-error-handling"))
    ).toBe(false)
  })
  it.each([1, 7, 30, 90])(
    "keeps the recommended balance in the actual %i-day schedule",
    (daysRemaining) => {
      const roadmap = generatePersonalizedRoadmap(
        scenarios,
        makeAssessment({ daysRemaining, hoursPerDay: 2 }),
        "test-user"
      )!
      const nodes = roadmap.dailyPlans.flatMap((p) => p.questions)
      const debugging = nodes.filter((q) => q.scenarioType === "bugfix")
      const algorithms = nodes.filter((q) => q.scenarioType === "dsa")
      expect(roadmap.categoryMix?.mode).toBe("balanced")
      expect(debugging.length).toBeGreaterThan(0)
      expect(debugging.length).toBeGreaterThanOrEqual(algorithms.length)
      expect(debugging.length - algorithms.length).toBeLessThanOrEqual(1)
      expect(nodes[0].scenarioType).toBe("bugfix")
      expect(debugging.length + algorithms.length).toBe(nodes.length)
      expect(new Set(nodes.map((q) => q.scenarioId)).size).toBe(nodes.length)
    }
  )

  it("keeps debugging first when only one task fits in a day", () => {
    const roadmap = generatePersonalizedRoadmap(
      scenarios,
      makeAssessment({ daysRemaining: 1, hoursPerDay: 0.25 }),
      "test-user"
    )!
    expect(roadmap.dailyPlans.flatMap((p) => p.questions).map((q) => q.scenarioType)).toEqual([
      "bugfix",
    ])
  })

  it("honors a debugging-only custom plan", () => {
    const assessment = makeAssessment({
      categoryMix: resolveCategoryMix({
        mixMode: "custom",
        selectedCategories: ["bugfix"],
        experienceLevel: "intermediate",
        companyId: "google",
      }),
    })
    const nodes = generatePersonalizedRoadmap(
      scenarios,
      assessment,
      "test-user"
    )!.dailyPlans.flatMap((p) => p.questions)
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes.every((q) => q.scenarioType === "bugfix")).toBe(true)
  })

  it("does not silently return a DSA plan if the balanced pool has no debugging", () => {
    const roadmap = generatePersonalizedRoadmap(
      scenarios.filter((s) => s.type === "dsa"),
      makeAssessment(),
      "test-user"
    )!
    expect(roadmap.dailyPlans.flatMap((p) => p.questions)).toEqual([])
  })
  it("full mix schedules bug-fix AND feature-building nodes, not just DSA", () => {
    const assessment = makeAssessment({
      categoryMix: resolveCategoryMix({
        mixMode: "full",
        experienceLevel: "intermediate",
        targetTrack: "swe",
        companyId: "google",
      }),
    })

    const roadmap = generatePersonalizedRoadmap(scenarios, assessment, "test-user")
    expect(roadmap).not.toBeNull()

    const nodes = roadmap!.dailyPlans.flatMap((p) => p.questions)
    const categories = new Set(nodes.map((n) => n.category))
    expect(categories.has("bugfix")).toBe(true)
    expect(categories.has("decomposition")).toBe(true)
    expect(categories.has("dsa")).toBe(true)

    // Roadmap tracks the resolved mix and category coverage.
    expect(roadmap!.categoryMix?.mode).toBe("full")
    expect(roadmap!.categoryCoverage?.some((c) => c.category === "bugfix")).toBe(true)
  })

  it("dsa-only produces no non-DSA nodes", () => {
    const assessment = makeAssessment({
      categoryMix: resolveCategoryMix({
        mixMode: "dsa-only",
        experienceLevel: "intermediate",
        targetTrack: "swe",
        companyId: "google",
      }),
    })

    const roadmap = generatePersonalizedRoadmap(scenarios, assessment, "test-user")
    const nodes = roadmap!.dailyPlans.flatMap((p) => p.questions)
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes.some((n) => n.category === "bugfix" || n.category === "decomposition")).toBe(false)
  })

  it("non-DSA nodes never carry a DSA pattern (avoids the FocusQuestionCard crash)", () => {
    const assessment = makeAssessment({
      categoryMix: resolveCategoryMix({
        mixMode: "full",
        experienceLevel: "intermediate",
        targetTrack: "swe",
        companyId: "google",
      }),
    })
    const roadmap = generatePersonalizedRoadmap(scenarios, assessment, "test-user")
    const nonDsaNodes = roadmap!.dailyPlans
      .flatMap((p) => p.questions)
      .filter((n) => n.category !== "dsa")
    expect(nonDsaNodes.length).toBeGreaterThan(0)
    for (const node of nonDsaNodes) {
      expect(node.pattern).toBeUndefined()
      expect(node.topic).toBeTruthy()
    }
  })
})

describe("legacy roadmap backward compatibility", () => {
  it("defaults category/scenarioType to dsa when deserializing a legacy doc", () => {
    const legacyDoc = {
      id: "legacy-1",
      data: () => ({
        userId: "u1",
        interviewDate: "2026-09-01T00:00:00.000Z",
        dailyPlans: [
          {
            date: "2026-08-01T00:00:00.000Z",
            dayNumber: 1,
            targetMinutes: 60,
            theme: "Arrays Day",
            focusPatterns: ["arrays-hashing"],
            questions: [
              {
                scenarioId: "dsa-two-sum",
                title: "Two Sum",
                pattern: "arrays-hashing",
                difficulty: "easy",
                estimatedMinutes: 30,
                status: "pending",
              },
            ],
          },
        ],
        milestones: [],
      }),
    }

    const record = serializeRoadmapDocument(legacyDoc)
    const node = record.dailyPlans[0].questions![0]
    expect(node.category).toBe("dsa")
    expect(node.scenarioType).toBe("dsa")
    expect(node.pattern).toBe("arrays-hashing")
  })

  it("isRoadmapQuestionStatus still accepts the known statuses and rejects unknown", () => {
    expect(isRoadmapQuestionStatus("pending")).toBe(true)
    expect(isRoadmapQuestionStatus("completed")).toBe(true)
    expect(isRoadmapQuestionStatus("deferred")).toBe(false) // move-based defer added no status
    expect(isRoadmapQuestionStatus("garbage")).toBe(false)
  })
})
