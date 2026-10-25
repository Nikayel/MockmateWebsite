import { loadUserMetrics } from "./repository"
import { metricsResponse } from "./response"
import { getUserUsageSummary } from "@/lib/usage-tracking"
import { getMasteryStatistics } from "@/lib/scoring/score-persistence"

export async function getUserMetricsResponse(userId: string, days: number) {
  const [snapshot, usage, mastery] = await Promise.all([
    loadUserMetrics(userId),
    getUserUsageSummary(userId).catch(() => null),
    getMasteryStatistics(userId).catch(() => null),
  ])
  return {
    ...metricsResponse(snapshot, days),
    usage: usage
      ? {
          totalCost: usage.totalCost,
          totalRequests: usage.totalRequests,
          budgetUsedPercent: usage.budgetUsedPercent,
          budgetRemaining: usage.budgetRemaining,
        }
      : null,
    mastery: mastery
      ? {
          ...mastery,
          masteryRate: mastery.total > 0 ? Math.round((mastery.mastered / mastery.total) * 100) : 0,
        }
      : null,
  }
}

export type UserMetricsData = Awaited<ReturnType<typeof getUserMetricsResponse>>
