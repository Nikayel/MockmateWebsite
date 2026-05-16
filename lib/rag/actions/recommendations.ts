import { NextResponse } from "next/server"
import { getRecommendedScenarios, getUserPerformanceProfile } from "@/lib/rag"

export async function handleGetRecommendations(params: {
  userId: string
  availableScenarios: Array<{ id: string; type: string; difficulty: string; title: string }>
}) {
  const { userId, availableScenarios } = params

  if (!userId || !availableScenarios) {
    return NextResponse.json(
      { error: "userId and availableScenarios are required" },
      { status: 400 }
    )
  }

  const profile = await getUserPerformanceProfile(userId)
  const recommendations = await getRecommendedScenarios(userId, availableScenarios)

  return NextResponse.json({
    recommendations: recommendations.map((r) => ({
      ...r,
      scenario: availableScenarios.find((s) => s.id === r.id),
    })),
    profile: profile
      ? {
          totalSessions: profile.totalSessions,
          averageScore: Math.round(profile.averageScore),
          strengthAreas: profile.strengthAreas,
          weaknessAreas: profile.weaknessAreas,
          recentTrend: profile.recentTrend,
        }
      : null,
  })
}
