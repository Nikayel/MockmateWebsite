import type { InterviewSession } from "@/lib/types"

export interface MetricSession {
  id: string
  scenarioId: string
  title: string
  type: string
  pattern: string
  difficulty: string
  completedAt: string
  durationMinutes: number
  kind: "interview" | "guided_lab"
  measurementVersion: number
  performanceScore: number
  technicalScore: number | null
  debuggingScore: number
  scoreBreakdown: Record<
    "understanding" | "problemSolving" | "codeQuality" | "communication",
    number | null
  > | null
  evidence: InterviewSession["bugfix_evidence_summary"] | null
}

export interface ScoreGroup {
  sessions: number
  averageScore: number
  averageTechnicalScore: number | null
  bestScore: number
}

export interface MetricsSnapshot {
  totals: { score: number; technicalScore: number; technicalSessions: number }
  overview: {
    totalSessions: number
    totalPracticeMinutes: number
    totalPracticeHours: number
    averageScore: number | null
    averageTechnicalScore: number | null
    lastSessionAt: string | null
  }
  patternStats: Record<string, ScoreGroup>
  difficultyStats: Record<string, ScoreGroup>
  daily: Array<{ date: string; score: number; sessions: number }>
  trendDaily: MetricsSnapshot["daily"]
  weeklyAverage: number | null
  recentSessions: MetricSession[]
  recentAverage: number | null
  recentAverageCount: number
  scoreBreakdown: MetricSession["scoreBreakdown"]
  bugfix: { readiness: number | null; sessions: number; latest: MetricSession | null }
  guidedLabs: {
    sessions: number
    averageMastery: number | null
    practiceMinutes: number
    latest: MetricSession | null
  }
}
