import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { UserPerformanceProfile } from "@/lib/rag/user-performance-rag"
import type { CatalogProblem } from "../types"

const getPerformanceProfile = vi.fn()

vi.mock("@/lib/rag/user-performance-rag", () => ({
  getUserPerformanceRAG: vi.fn(() => ({
    getPerformanceProfile,
  })),
}))

function createProfile(overrides: Partial<UserPerformanceProfile> = {}): UserPerformanceProfile {
  return {
    userId: "user-1",
    lastUpdated: new Date("2026-05-01T00:00:00.000Z"),
    totalSessions: 12,
    completedSessions: 10,
    averageScore: 65,
    totalPracticeHours: 8,
    patternProficiency: [
      {
        pattern: "arrays-hashing",
        problemsAttempted: 5,
        problemsSolved: 4,
        averageScore: 80,
        lastPracticed: new Date("2026-05-25T00:00:00.000Z"),
        proficiencyLevel: "practicing",
        improvementTrend: "stable",
      },
      {
        pattern: "two-pointers",
        problemsAttempted: 3,
        problemsSolved: 1,
        averageScore: 45,
        lastPracticed: new Date("2026-05-10T00:00:00.000Z"),
        proficiencyLevel: "learning",
        improvementTrend: "stable",
      },
    ],
    difficultyPerformance: {
      easy: { attempted: 6, avgScore: 78 },
      medium: { attempted: 4, avgScore: 61 },
      hard: { attempted: 1, avgScore: 30 },
    },
    recentTrend: "improving",
    weeklyProgress: [50, 58, 62, 70],
    strengths: ["arrays-hashing"],
    weaknesses: ["two-pointers"],
    focusAreas: ["two-pointers"],
    preferredSessionLength: 45,
    bestPerformanceTime: "evening",
    learningPace: "moderate",
    ...overrides,
  }
}

const catalog: CatalogProblem[] = [
  {
    id: "contains-duplicate",
    title: "Contains Duplicate",
    pattern: "arrays-hashing",
    difficulty: "easy",
    company: "Meta",
    frequency: 80,
  },
  {
    id: "valid-palindrome",
    title: "Valid Palindrome",
    pattern: "two-pointers",
    difficulty: "medium",
    company: "Google",
    frequency: 90,
  },
  {
    id: "longest-substring",
    title: "Longest Substring Without Repeating Characters",
    pattern: "sliding-window",
    difficulty: "medium",
    company: "Google",
    frequency: 70,
  },
  {
    id: "edit-distance",
    title: "Edit Distance",
    pattern: "dp-2d",
    difficulty: "hard",
    company: "Google",
    frequency: 95,
  },
]

describe("recommendation agent", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"))
    getPerformanceProfile.mockResolvedValue(createProfile())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("keeps the legacy recommendation-agent import as a facade over the consolidated module", async () => {
    const consolidated = await import("../index")
    const legacy = await import("../../recommendation-agent")

    expect(legacy.generateRecommendations).toBe(consolidated.generateRecommendations)
    expect(legacy.getNextProblemRecommendation).toBe(consolidated.getNextProblemRecommendation)
    expect(legacy.getRecommendationAgent).toBe(consolidated.getRecommendationAgent)
  })

  it("scores, filters, prioritizes, and explains personalized recommendations", async () => {
    const { generateRecommendations } = await import("../index")

    const response = await generateRecommendations(
      {
        userId: "user-1",
        targetCompany: "Google",
        targetPatterns: ["two-pointers"],
        preferredDifficulty: "adaptive",
        sessionGoal: "practice",
        availableTimeMinutes: 30,
        excludeProblemIds: ["contains-duplicate"],
        limit: 2,
      },
      catalog
    )

    expect(getPerformanceProfile).toHaveBeenCalledWith("user-1")
    expect(response.metadata.personalizationLevel).toBe("full")
    expect(response.metadata.totalProblemsScored).toBe(2)
    expect(response.sessionPlan).toBeUndefined()
    expect(response.userProfile).toEqual({
      level: "intermediate",
      strengths: ["arrays-hashing"],
      weaknesses: ["two-pointers"],
      recentTrend: "improving",
    })

    expect(response.recommendations.map((problem) => problem.id)).toEqual([
      "valid-palindrome",
      "longest-substring",
    ])
    expect(response.recommendations[0]).toEqual(
      expect.objectContaining({
        priority: "critical",
        reason: "weakness-practice",
        reasonText:
          "Your two-pointers skills need work. This medium problem is a good practice opportunity.",
        estimatedTimeMinutes: 30,
        prerequisites: ["arrays-hashing"],
        userReadiness: 70,
      })
    )
    expect(response.recommendations[0].score).toEqual({
      overall: 90,
      relevance: 110,
      lexicalRelevance: 100,
      difficulty: 60,
      freshness: 100,
      patternValue: 90,
      progression: 80,
    })
  })

  it("uses lexical relevance for exact company and pattern matches without replacing profile fit", async () => {
    const { scoreCatalogLexicalRelevance } = await import("../scoring")
    const profile = createProfile()

    const scores = scoreCatalogLexicalRelevance(
      catalog,
      {
        userId: "user-1",
        targetCompany: "Google",
        targetPatterns: ["two-pointers"],
        sessionGoal: "practice",
      },
      profile
    )

    expect(scores.get("valid-palindrome")).toBe(100)
    expect(scores.get("contains-duplicate") || 0).toBeLessThan(scores.get("valid-palindrome") || 0)
  })

  it("falls back to a default profile when performance loading fails", async () => {
    getPerformanceProfile.mockRejectedValue(new Error("profile unavailable"))
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
    const { generateRecommendations } = await import("../index")

    const response = await generateRecommendations(
      {
        userId: "new-user",
        preferredDifficulty: "easy",
        sessionGoal: "learn-new",
        limit: 1,
      },
      catalog
    )

    expect(response.metadata.personalizationLevel).toBe("none")
    expect(response.userProfile).toEqual({
      level: "beginner",
      strengths: [],
      weaknesses: [],
      recentTrend: "stable",
    })
    expect(response.recommendations[0]).toEqual(
      expect.objectContaining({
        reason: "new-pattern",
        reasonText: "You haven't practiced arrays-hashing yet. This is a good introduction.",
      })
    )

    consoleError.mockRestore()
  })

  it("builds a next-problem recommendation that stays on the same pattern after an unsuccessful attempt", async () => {
    const { getNextProblemRecommendation } = await import("../index")

    const recommendation = await getNextProblemRecommendation(
      "user-1",
      "two-sum-ii",
      "two-pointers",
      false,
      [
        {
          id: "two-sum-ii",
          title: "Two Sum II",
          pattern: "two-pointers",
          difficulty: "easy",
        },
        {
          id: "valid-palindrome",
          title: "Valid Palindrome",
          pattern: "two-pointers",
          difficulty: "easy",
        },
        {
          id: "contains-duplicate",
          title: "Contains Duplicate",
          pattern: "arrays-hashing",
          difficulty: "easy",
        },
      ]
    )

    expect(recommendation).toEqual(
      expect.objectContaining({
        id: "valid-palindrome",
        pattern: "two-pointers",
        reason: "weakness-practice",
      })
    )
  })

  it("keeps the singleton compatibility API delegating to the consolidated service", async () => {
    const { getRecommendationAgent } = await import("../index")
    const firstAgent = getRecommendationAgent()
    const secondAgent = getRecommendationAgent()

    expect(firstAgent).toBe(secondAgent)

    const response = await firstAgent.recommend(
      {
        userId: "user-1",
        preferredDifficulty: "adaptive",
        limit: 1,
      },
      catalog
    )

    expect(response.recommendations).toHaveLength(1)
  })
})
