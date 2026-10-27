import type { MetricSession, MetricsSnapshot, ScoreGroup } from "./types"

export function average(values: Array<number | null>): number | null {
  const observed = values.filter((value): value is number => value !== null)
  return observed.length
    ? Math.round(observed.reduce((sum, value) => sum + value, 0) / observed.length)
    : null
}

function groups(
  sessions: MetricSession[],
  key: "pattern" | "difficulty"
): Record<string, ScoreGroup> {
  const buckets = new Map<string, MetricSession[]>()
  for (const session of sessions) {
    const bucket = buckets.get(session[key]) ?? []
    bucket.push(session)
    buckets.set(session[key], bucket)
  }
  return Object.fromEntries(
    [...buckets].map(([name, rows]) => [
      name,
      {
        sessions: rows.length,
        averageScore: average(rows.map((s) => s.performanceScore))!,
        averageTechnicalScore: average(rows.map((s) => s.technicalScore)),
        bestScore: rows.reduce((best, s) => Math.max(best, s.performanceScore), 0),
      },
    ])
  )
}

function dailyScores(sessions: MetricSession[], now: number): MetricsSnapshot["daily"] {
  const daily = new Map<string, number[]>()
  const oldestDay = new Date(now - 90 * 86400000).toISOString().slice(0, 10)
  for (const session of sessions) {
    const day = session.completedAt.slice(0, 10)
    if (day < oldestDay) continue
    const values = daily.get(day) ?? []
    values.push(session.performanceScore)
    daily.set(day, values)
  }
  return [...daily]
    .map(([date, scores]) => ({ date, score: average(scores)!, sessions: scores.length }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** One contribution per persisted session ID, regardless of completion retries. */
export function aggregateMetricSessions(input: MetricSession[], now = Date.now()): MetricsSnapshot {
  const unique = [...new Map(input.map((session) => [session.id, session])).values()].sort(
    (a, b) => b.completedAt.localeCompare(a.completedAt) || a.id.localeCompare(b.id)
  )
  const interviews = unique.filter((s) => s.kind === "interview")
  const labs = unique.filter((s) => s.kind === "guided_lab")
  const bugs = interviews.filter((s) => s.type === "bugfix")
  // Compare scores only under the latest scoring rules; retain historical totals.
  const comparable = interviews.filter(
    (s) => s.measurementVersion === interviews[0]?.measurementVersion
  )
  const recent = comparable.slice(0, 5)
  const breakdown = {
    codeQuality: average(interviews.map((s) => s.scoreBreakdown?.codeQuality ?? null)),
    problemSolving: average(interviews.map((s) => s.scoreBreakdown?.problemSolving ?? null)),
    understanding: average(interviews.map((s) => s.scoreBreakdown?.understanding ?? null)),
    communication: average(interviews.map((s) => s.scoreBreakdown?.communication ?? null)),
  }
  const totalPracticeMinutes = interviews.reduce((sum, s) => sum + s.durationMinutes, 0)
  return {
    totals: {
      score: interviews.reduce((sum, s) => sum + s.performanceScore, 0),
      technicalScore: interviews.reduce((sum, s) => sum + (s.technicalScore ?? 0), 0),
      technicalSessions: interviews.filter((s) => s.technicalScore !== null).length,
    },
    overview: {
      totalSessions: interviews.length,
      totalPracticeMinutes,
      totalPracticeHours: Math.round(totalPracticeMinutes / 6) / 10,
      averageScore: average(interviews.map((s) => s.performanceScore)),
      averageTechnicalScore: average(interviews.map((s) => s.technicalScore)),
      lastSessionAt: interviews[0]?.completedAt ?? null,
    },
    patternStats: groups(interviews, "pattern"),
    difficultyStats: groups(interviews, "difficulty"),
    daily: dailyScores(interviews, now),
    trendDaily: dailyScores(comparable, now),
    weeklyAverage: average(
      comparable
        .filter((s) => Date.parse(s.completedAt) >= now - 7 * 86400000)
        .map((s) => s.performanceScore)
    ),
    recentSessions: interviews.slice(0, 10),
    recentAverage: average(recent.map((s) => s.performanceScore)),
    recentAverageCount: recent.length,
    scoreBreakdown: Object.values(breakdown).every((v) => v === null) ? null : breakdown,
    bugfix: {
      readiness: average(
        bugs
          .filter((s) => s.measurementVersion === bugs[0]?.measurementVersion)
          .slice(0, 5)
          .map((s) => s.debuggingScore)
      ),
      sessions: bugs.length,
      latest: bugs[0] ?? null,
    },
    guidedLabs: {
      sessions: labs.length,
      averageMastery: average(labs.map((s) => s.performanceScore)),
      practiceMinutes: labs.reduce((sum, s) => sum + s.durationMinutes, 0),
      latest: labs[0] ?? null,
    },
  }
}
