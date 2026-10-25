import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { aggregateMetricSessions } from "../user-metrics/aggregate"
import { normalizeMetricSession } from "../user-metrics/normalize"
import { metricTrends } from "../user-metrics/trends"

function trendsFor(rows: Array<Record<string, unknown>>, days: number) {
  const sessions = rows.flatMap((row, index) => {
    const session = normalizeMetricSession(String(index), row)
    return session ? [session] : []
  })
  return metricTrends(aggregateMetricSessions(sessions), days)
}
function session(
  completed_at: string,
  performance_score: number | null,
  feedback_status = "complete"
) {
  return { completed_at, performance_score, feedback_status }
}
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-09-24T12:00:00.000Z"))
})
afterEach(() => vi.useRealTimers())

describe("canonical performance trends", () => {
  it("uses final completed-session scores for the weekly average", () => {
    const result = trendsFor(
      [
        session("2026-09-24T10:00:00.000Z", 83),
        session("2026-09-24T09:00:00.000Z", 39, "processing"),
        session("2026-09-23T10:00:00.000Z", 70),
        session("2026-09-22T10:00:00.000Z", null),
        session("2026-09-02T10:00:00.000Z", 20),
      ],
      30
    )
    expect(result.weeklyAverage).toBe(77)
    expect(result.daily).toEqual([
      { date: "2026-09-02", score: 20, sessions: 1 },
      { date: "2026-09-23", score: 70, sessions: 1 },
      { date: "2026-09-24", score: 83, sessions: 1 },
    ])
  })
  it("averages the full seven-day window independently of the chart range, including zero", () => {
    const result = trendsFor(
      [
        session("2026-09-24T10:00:00.000Z", 0),
        session("2026-09-22T10:00:00.000Z", 100),
        session("2026-09-22T09:00:00.000Z", 100),
      ],
      1
    )
    expect(result.weeklyAverage).toBe(67)
    expect(result.daily).toEqual([{ date: "2026-09-24", score: 0, sessions: 1 }])
  })
})
