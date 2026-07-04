/**
 * Integration + backward-compat tests for roadmap category composition.
 *
 * Proves the "roadmap is only DSA" regression is gone (full mix now schedules
 * bug-fix and feature-building nodes) and that legacy DSA-only roadmap docs
 * still deserialize without a migration.
 */

import { describe, it, expect } from "vitest"
import { scenarios } from "@/lib/scenarios"
import { generatePersonalizedRoadmap } from "../prioritization-algorithm"
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
