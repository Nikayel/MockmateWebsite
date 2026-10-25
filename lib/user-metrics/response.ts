import type { MetricsSnapshot } from "./types"
import { metricTrends } from "./trends"

function formatPatternName(pattern: string): string {
  const names: Record<string, string> = {
    "arrays-hashing": "Arrays & Hashing",
    "two-pointers": "Two Pointers",
    "sliding-window": "Sliding Window",
    "binary-search": "Binary Search",
    "linked-list": "Linked List",
    "dp-1d": "1D Dynamic Programming",
    "dp-2d": "2D Dynamic Programming",
    heap: "Heap / Priority Queue",
  }
  return (
    names[pattern] ??
    pattern
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  )
}

function proficiency(
  score: number | null
): "novice" | "learning" | "practicing" | "proficient" | "expert" | "unobserved" {
  if (score === null) return "unobserved"
  if (score >= 90) return "expert"
  if (score >= 75) return "proficient"
  if (score >= 55) return "practicing"
  return score >= 35 ? "learning" : "novice"
}

export function metricsResponse(snapshot: MetricsSnapshot, days: number, now = Date.now()) {
  return {
    overview: snapshot.overview,
    patterns: Object.entries(snapshot.patternStats)
      .map(([pattern, group]) => ({
        pattern,
        displayName: formatPatternName(pattern),
        ...group,
        proficiency: proficiency(group.averageTechnicalScore),
      }))
      .sort((a, b) => b.sessions - a.sessions || a.pattern.localeCompare(b.pattern)),
    difficulty: Object.entries(snapshot.difficultyStats).map(([difficulty, group]) => ({
      difficulty,
      ...group,
    })),
    trends: metricTrends(snapshot, days, now),
    activity: snapshot.daily,
    recentSessions: snapshot.recentSessions.map((session) => ({
      ...session,
      feedback: "complete",
    })),
    scoreBreakdown: snapshot.scoreBreakdown,
    bugfix: snapshot.bugfix,
    guidedLabs: snapshot.guidedLabs,
    recentAverage: snapshot.recentAverage,
    recentAverageCount: snapshot.recentAverageCount,
    averages: {
      overall: snapshot.overview.averageScore,
      technical: snapshot.overview.averageTechnicalScore,
      mastery: snapshot.overview.averageTechnicalScore,
    },
  }
}

export type CanonicalMetricsData = ReturnType<typeof metricsResponse>
