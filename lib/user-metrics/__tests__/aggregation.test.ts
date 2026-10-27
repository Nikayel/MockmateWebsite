import { describe, expect, it } from "vitest"
import { normalizeMetricSession, score } from "../normalize"
import { aggregateMetricSessions } from "../aggregate"
import { metricsResponse } from "../response"
import { formatMetricScore } from "../display"

const now = Date.parse("2026-10-25T12:00:00.000Z")
const base = {
  completed_at: "2026-10-25T11:00:00.000Z",
  started_at: "2026-10-25T10:30:00.000Z",
  feedback_status: "complete",
  type: "bugfix",
  performance_score: 81,
}
const session = (id: string, extra = {}) => normalizeMetricSession(id, { ...base, ...extra }, now)!

describe("canonical session normalization", () => {
  it.each([undefined, null, "81", NaN, Infinity, -1, 101])(
    "rejects an invalid score: %s",
    (value) => expect(score(value)).toBeNull()
  )
  it("preserves observed zero scores and evidence counts", () => {
    const value = session("zero", {
      performance_score: 0,
      technical_score: 0,
      bugfix_evidence_summary: { visibleTestsRun: 0, inspectedFiles: [] },
    })
    expect(value.performanceScore).toBe(0)
    expect(value.technicalScore).toBe(0)
    expect(value.evidence?.visibleTestsRun).toBe(0)
    expect(formatMetricScore(0)).toBe("0%")
    expect(formatMetricScore(null)).toBe("—")
  })
  it.each(["pending", "processing", "failed"])(
    "excludes %s even with a provisional score",
    (feedback_status) => {
      expect(normalizeMetricSession("unfinished", { ...base, feedback_status }, now)).toBeNull()
    }
  )
  it("requires valid completion time and excludes future completions", () => {
    for (const completed_at of [undefined, "bad", "2027-01-01T00:00:00Z"])
      expect(normalizeMetricSession("bad", { ...base, completed_at }, now)).toBeNull()
  })
  it.each(["queued", "failed"])(
    "includes a frozen score with %s written feedback",
    (feedback_status) => {
      expect(
        session("frozen", { feedback_status, feedback_score_frozen: true }).performanceScore
      ).toBe(81)
      expect(normalizeMetricSession("provisional", { ...base, feedback_status }, now)).toBeNull()
    }
  )
  it("supports legacy finalized sessions without a feedback status", () => {
    expect(session("legacy", { feedback_status: undefined }).performanceScore).toBe(81)
  })
  it("recognizes old BookClub sessions and recovers their preserved lab mastery", () => {
    const value = session("old-lab", {
      scenario_id: "bugfix-bookclub-reading-streak-workspace",
      performance_score: 35,
      mastery_score: 81,
      guided_lab_mastery: { masteryScore: 100 },
    })
    expect(value.kind).toBe("guided_lab")
    expect(value.performanceScore).toBe(100)
    expect(value.technicalScore).toBeNull()
  })
  it("does not invent evidence or technical scores when fields are missing", () => {
    const value = session("missing")
    expect(value.evidence).toBeNull()
    expect(value.technicalScore).toBeNull()
    expect(value.scoreBreakdown).toBeNull()
  })
  it("uses saved technical score first, then mastery, then a complete historical breakdown", () => {
    expect(session("priority", { technical_score: 0, mastery_score: 90 }).technicalScore).toBe(0)
    expect(session("mastery", { technical_score: null, mastery_score: 70 }).technicalScore).toBe(70)
    expect(
      session("breakdown", {
        score_breakdown: { understandingScore: 0, problemSolvingScore: 0, codeQualityScore: 0 },
      }).technicalScore
    ).toBe(0)
    expect(
      session("partial", { score_breakdown: { understandingScore: 100 } }).technicalScore
    ).toBeNull()
  })
})

describe("one consistent aggregation", () => {
  it("uses final feedback everywhere instead of a separate interaction estimate", () => {
    const result = metricsResponse(aggregateMetricSessions([session("one")], now), 7, now)
    expect(result.overview.averageScore).toBe(81)
    expect(result.trends.weeklyAverage).toBe(81)
    expect(result.recentAverage).toBe(81)
    expect(result.recentSessions[0].performanceScore).toBe(81)
  })
  it("counts one persisted session once and keeps guided practice out of interview scores", () => {
    const interview = session("one", { performance_score: 80 })
    const result = aggregateMetricSessions(
      [interview, interview, session("lab", { is_guided_lab: true, mastery_score: 20 })],
      now
    )
    expect(result.overview.totalSessions).toBe(1)
    expect(result.weeklyAverage).toBe(80)
    expect(result.guidedLabs).toMatchObject({ sessions: 1, averageMastery: 20 })
    expect(result.bugfix.readiness).toBe(80)
    expect(result.scoreBreakdown).toBeNull()
  })
  it("finds bugfix history beyond newer DSA sessions and sorts by completion time", () => {
    const newerDsa = Array.from({ length: 30 }, (_, index) =>
      session(`dsa-${index}`, { type: "dsa", completed_at: "2026-10-25T11:59:00Z" })
    )
    const result = aggregateMetricSessions([...newerDsa, session("older-bug")], now)
    expect(result.recentSessions).toHaveLength(10)
    expect(result.bugfix).toMatchObject({ readiness: 81, sessions: 1, latest: { id: "older-bug" } })
  })
  it("uses actual denominators for missing technical/category observations", () => {
    const result = aggregateMetricSessions(
      [
        session("unknown"),
        session("known", { technical_score: 0, score_breakdown: { codeQualityScore: 0 } }),
      ],
      now
    )
    expect(result.overview.averageTechnicalScore).toBe(0)
    expect(result.scoreBreakdown?.codeQuality).toBe(0)
    expect(result.scoreBreakdown?.communication).toBeNull()
  })
  it("keeps history but compares only the latest measurement version", () => {
    const result = aggregateMetricSessions(
      [
        session("new", { measurement_version: 2, performance_score: 60 }),
        session("old", { performance_score: 100, completed_at: "2026-10-24T11:00:00Z" }),
      ],
      now
    )
    expect(result.overview.totalSessions).toBe(2)
    expect(result.overview.averageScore).toBe(80)
    expect(result.recentAverage).toBe(60)
    expect(result.weeklyAverage).toBe(60)
    expect(result.bugfix.readiness).toBe(60)
    expect(result.daily).toHaveLength(2)
    expect(result.trendDaily).toHaveLength(1)
  })
  it("distinguishes no scored interviews from a zero average", () => {
    const result = aggregateMetricSessions([], now)
    expect(result.overview.averageScore).toBeNull()
    expect(result.weeklyAverage).toBeNull()
    expect(result.bugfix.readiness).toBeNull()
  })
  it("bounds weekly scores to seven days while keeping all-time history", () => {
    const result = aggregateMetricSessions(
      [
        session("old", { performance_score: 0, completed_at: "2026-01-01T00:00:00Z" }),
        session("now", { performance_score: 100 }),
      ],
      now
    )
    expect(result.overview.averageScore).toBe(50)
    expect(result.weeklyAverage).toBe(100)
    expect(result.daily).toHaveLength(1)
  })
})
