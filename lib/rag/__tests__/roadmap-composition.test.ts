import { beforeEach, describe, expect, it, vi } from "vitest"
import { scenarios } from "@/lib/scenarios"
import { resolveCategoryMix } from "@/lib/roadmap/category-weights"
import type { UserRoadmapAssessment } from "@/lib/data/company-questions/types"

vi.mock("../retrieval/advanced-retrieval", () => ({ getAdvancedRetriever: () => ({}) }))
vi.mock("../context-builder", () => ({ buildRoadmapContext: vi.fn() }))
import { buildRoadmapContext } from "../context-builder"
import { RAGRoadmapGenerator } from "../roadmap-rag"

const assessment: UserRoadmapAssessment = {
  targetCompany: "stripe",
  interviewDate: new Date("2027-01-01"),
  daysRemaining: 30,
  experienceLevel: "intermediate",
  problemsSolvedEstimate: 50,
  patternFamiliarity: [],
  hoursPerDay: 2,
  preferredDifficulty: "mixed",
  targetScore: 80,
}
beforeEach(() => vi.clearAllMocks())

describe("company debugging in the optional enrichment path", () => {
  it("returns a debugging-only plan without requesting DSA advice", async () => {
    const categoryMix = resolveCategoryMix({
      mixMode: "custom",
      selectedCategories: ["bugfix"],
      companyId: "stripe",
      experienceLevel: "intermediate",
    })
    const result = await new RAGRoadmapGenerator().generateEnhancedRoadmap({
      userId: "test-user",
      scenarios,
      assessment: { ...assessment, categoryMix },
      enableRAG: true,
    })
    expect(buildRoadmapContext).not.toHaveBeenCalled()
    expect(result?.ragEnhancements.enabled).toBe(false)
    const nodes = result!.dailyPlans.flatMap((p) => p.questions)
    expect(nodes.length).toBeGreaterThan(0)
    expect(nodes.every((q) => q.scenarioType === "bugfix")).toBe(true)
    expect(nodes[0].companyAlignment).toBe("stripe-library-debugging")
  })

  it("preserves the balanced company selection when enrichment is unavailable", async () => {
    vi.mocked(buildRoadmapContext).mockRejectedValueOnce(new Error("Enrichment unavailable"))
    const result = await new RAGRoadmapGenerator().generateEnhancedRoadmap({
      userId: "test-user",
      scenarios,
      assessment,
      enableRAG: true,
    })
    expect(buildRoadmapContext).toHaveBeenCalledOnce()
    const nodes = result!.dailyPlans.flatMap((p) => p.questions)
    const debugging = nodes.filter((q) => q.scenarioType === "bugfix")
    expect(debugging.length).toBe(nodes.filter((q) => q.scenarioType === "dsa").length)
    expect(debugging[0].companyAlignment).toBe("stripe-library-debugging")
    expect(
      debugging.every(
        (q) => q.companyAlignment === "generic" || q.companyAlignment === "stripe-library-debugging"
      )
    ).toBe(true)
  })
})
