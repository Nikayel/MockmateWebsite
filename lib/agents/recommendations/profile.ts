import { getUserPerformanceRAG, type UserPerformanceProfile } from "@/lib/rag/user-performance-rag"

export function createDefaultPerformanceProfile(userId: string): UserPerformanceProfile {
  return {
    userId,
    lastUpdated: new Date(),
    totalSessions: 0,
    completedSessions: 0,
    averageScore: 0,
    totalPracticeHours: 0,
    patternProficiency: [],
    difficultyPerformance: {
      easy: { attempted: 0, avgScore: 0 },
      medium: { attempted: 0, avgScore: 0 },
      hard: { attempted: 0, avgScore: 0 },
    },
    recentTrend: "stable",
    weeklyProgress: [0, 0, 0, 0],
    strengths: [],
    weaknesses: [],
    focusAreas: [],
    preferredSessionLength: 45,
    bestPerformanceTime: "any",
    learningPace: "moderate",
  }
}

export function getUserLevel(
  profile: UserPerformanceProfile
): "beginner" | "intermediate" | "advanced" {
  if (profile.totalSessions < 10 || profile.averageScore < 50) {
    return "beginner"
  }
  if (profile.totalSessions < 50 || profile.averageScore < 70) {
    return "intermediate"
  }
  return "advanced"
}

export async function getRecommendationProfile(userId: string): Promise<{
  profile: UserPerformanceProfile
  personalizationLevel: "full" | "partial" | "none"
}> {
  const performanceRAG = getUserPerformanceRAG()

  try {
    const profile = await performanceRAG.getPerformanceProfile(userId)

    return {
      profile,
      personalizationLevel: profile.totalSessions > 5 ? "full" : "partial",
    }
  } catch (error) {
    console.error("[RecommendationAgent] Error getting profile:", error)

    return {
      profile: createDefaultPerformanceProfile(userId),
      personalizationLevel: "none",
    }
  }
}
