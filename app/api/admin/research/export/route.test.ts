/**
 * The comparison export is the copy of the A/B result that outlives the
 * dashboard: it lands in a spreadsheet, an email, a pitch deck. It used to end
 * with `confidence_level`, a number computed as `Math.min(95, 60 + wins * 7)`
 * from a count of which cohort averages one arm led on.
 *
 * These tests run the REAL statistics end to end. Nothing here mocks the
 * analyzer, the t-test or the p-value: only Firestore is stubbed, so the
 * numbers asserted below are produced by the same code path the founder reads.
 *
 * Two branches matter:
 *  - a sample that supports a test writes a real p-value, an interval, n per
 *    arm and the sample ratio check, and no fabricated confidence,
 *  - a sample that does not writes EMPTY cells and says not_enough_data.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { NextRequest } from "next/server"
import type { AlgorithmResearchEvent } from "@/lib/types"

/**
 * The global setup stubs NextResponse with a `json` helper only. The CSV branch
 * constructs `new NextResponse(body, init)`, so this file supplies a
 * constructible stub that records the body it was handed.
 */
vi.mock("next/server", () => {
  class MockNextResponse {
    body: string
    headers: Map<string, string>
    status = 200
    constructor(body: string, init?: { headers?: Record<string, string> }) {
      this.body = body
      this.headers = new Map(Object.entries(init?.headers ?? {}))
    }
    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return {
        data,
        status: init?.status ?? 200,
        headers: new Map(Object.entries(init?.headers ?? {})),
      }
    }
  }
  return { NextResponse: MockNextResponse, NextRequest: class {} }
})

/** One user's worth of review events, with a retention rate we control exactly. */
function userEvents(
  userId: string,
  algorithm: "sm2" | "fsrs",
  reviews: number,
  correct: number,
  score: number
): AlgorithmResearchEvent[] {
  return Array.from({ length: reviews }, (_, index) => ({
    id: `${userId}-${index}`,
    user_id: userId,
    algorithm,
    timestamp: `2026-08-0${(index % 7) + 1}T10:00:00.000Z`,
    score,
    actual_retention: index < correct,
    retention_as_predicted: index % 2 === 0,
    pre_review: { predicted_retention: 70 },
  })) as unknown as AlgorithmResearchEvent[]
}

/**
 * A cohort where each user's retention rate is one of five fixed values, so
 * both arms have a real spread rather than a single constant. FSRS is shifted
 * up by one step: a difference big enough to detect at this sample size, and
 * small enough that the p-value stays a number rather than underflowing to
 * zero.
 */
function cohort(algorithm: "sm2" | "fsrs", users: number, correctBase: number) {
  const events: AlgorithmResearchEvent[] = []
  for (let i = 0; i < users; i++) {
    const correct = correctBase + (i % 5)
    events.push(...userEvents(`${algorithm}-user-${i}`, algorithm, 20, correct, 70 + (i % 5)))
  }
  return events
}

const h = vi.hoisted(() => ({
  requirePermission: vi.fn(),
  logAdminAction: vi.fn(() => Promise.resolve()),
  // Mutable so each test can size its own experiment.
  state: {
    events: [] as unknown[],
    assignedSm2: 0,
    assignedFsrs: 0,
    aggregateExists: true,
  },
}))

const cohortStats = (algorithm: "sm2" | "fsrs") => ({
  algorithm,
  total_users: 40,
  active_users_7d: 30,
  active_users_30d: 40,
  users_with_overrides: 0,
  average_retention_rate: 50,
  median_retention_rate: 50,
  average_score: 70,
  median_score: 70,
  total_problems_mastered: 10,
  average_problems_mastered_per_user: 1,
  average_time_to_mastery_days: 5,
  average_streak_days: 2,
  average_daily_reviews: 3,
  average_session_length_minutes: 12,
  churn_rate_7d: 10,
  churn_rate_30d: 20,
  score_distribution: {},
  average_lapse_rate: 5,
  users_with_zero_lapses: 3,
  average_interval_days: 7,
  interval_accuracy: 50,
  weekly_trends: [],
  first_review_at: "2026-07-01T00:00:00.000Z",
  last_review_at: "2026-08-08T00:00:00.000Z",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-08-08T00:00:00.000Z",
})

const aggregateDoc = () => ({
  last_updated: "2026-08-08T00:00:00.000Z",
  data_range: { start_date: "2026-07-09T00:00:00.000Z", end_date: "2026-08-08T00:00:00.000Z" },
  sm2: cohortStats("sm2"),
  fsrs: cohortStats("fsrs"),
  comparison: {
    retention_rate_difference: 5,
    average_score_difference: 0,
    time_to_mastery_difference_days: 0,
    engagement_difference: 0,
    interval_efficiency_difference: 0,
    sufficient_sample_size: true,
    fsrs_wins_count: 3,
    sm2_wins_count: 2,
  },
})

vi.mock("@/lib/firebase-admin", () => {
  const snapshotOf = (docs: unknown[]) => ({
    docs: docs.map((data, index) => ({ id: String(index), data: () => data })),
    size: docs.length,
    empty: docs.length === 0,
  })

  const chainable = (docs: () => unknown[]) => {
    const query: Record<string, unknown> = {
      get: () => Promise.resolve(snapshotOf(docs())),
      count: () => ({ get: () => Promise.resolve({ data: () => ({ count: docs().length }) }) }),
    }
    query.where = () => query
    query.orderBy = () => query
    query.limit = () => query
    return query
  }

  const adminDb = {
    collection: (name: string) => {
      if (name === "algorithm_research_events") return chainable(() => h.state.events)
      if (name === "profiles") {
        // `.count()` on the bare collection is the total; `.where(...)` narrows
        // to one arm. Returning per-arm counts is what the SRM check reads.
        const total = h.state.assignedSm2 + h.state.assignedFsrs
        const base: Record<string, unknown> = {
          get: () => Promise.resolve({ docs: [], size: total, empty: total === 0 }),
          count: () => ({ get: () => Promise.resolve({ data: () => ({ count: total }) }) }),
        }
        base.where = (_field: string, _op: string, value: string) => ({
          count: () => ({
            get: () =>
              Promise.resolve({
                data: () => ({
                  count: value === "sm2" ? h.state.assignedSm2 : h.state.assignedFsrs,
                }),
              }),
          }),
        })
        return base
      }
      return {
        ...chainable(() => []),
        doc: () => ({
          get: () =>
            Promise.resolve({
              exists: h.state.aggregateExists,
              data: () => (h.state.aggregateExists ? aggregateDoc() : null),
            }),
        }),
      }
    },
    collectionGroup: () => chainable(() => []),
  }

  return { adminDb, adminAuth: { verifyIdToken: vi.fn() } }
})

vi.mock("@/lib/admin/middleware", () => ({ requirePermission: h.requirePermission }))
vi.mock("@/lib/admin/rbac", () => ({ PERMISSIONS: { EXPORT_DATA: "export_data" } }))
vi.mock("@/lib/admin/audit", () => ({ logAdminAction: h.logAdminAction, AUDIT_ACTIONS: {} }))

import { GET } from "./route"

const exportRequest = (query: string) =>
  ({ url: `https://app.test/api/admin/research/export?${query}` }) as unknown as NextRequest

type JsonStub = { data: Record<string, unknown>; status: number }
type CsvStub = { body: string }

beforeEach(() => {
  h.requirePermission.mockReset()
  h.requirePermission.mockResolvedValue({
    authorized: true,
    context: { userId: "admin-1", role: "owner" },
  })
  h.logAdminAction.mockClear()
  h.state.aggregateExists = true
})

describe("comparison export: a sample that supports a test", () => {
  beforeEach(() => {
    // 40 users per arm. SM-2 retention rates run 0.40 to 0.60, FSRS 0.45 to
    // 0.65: the same spread, shifted by one step.
    h.state.events = [...cohort("sm2", 40, 8), ...cohort("fsrs", 40, 9)]
    h.state.assignedSm2 = 50
    h.state.assignedFsrs = 50
  })

  it("writes a p-value produced by a test, not a confidence produced by a win count", async () => {
    const res = (await GET(exportRequest("type=comparison&format=json"))) as unknown as JsonStub
    const row = res.data

    // The fabricated columns are gone, under every name they ever had.
    expect(row).not.toHaveProperty("confidence_level")
    expect(row).not.toHaveProperty("overall_winner")
    expect(JSON.stringify(row)).not.toMatch(/confidence_level|overall_winner/)

    // And a real one is present.
    const p = row.primary_p_value as number
    expect(typeof p).toBe("number")
    expect(p).toBeGreaterThan(0)
    expect(p).toBeLessThan(0.05)

    // A p-value from `60 + wins * 7` could only ever take six values. This one
    // tracks the data: shifting the arms apart must move it.
    expect(Number.isInteger(p * 100)).toBe(false)
  })

  it("reports the effect with its interval, n per arm, and the correction applied", async () => {
    const res = (await GET(exportRequest("type=comparison&format=json"))) as unknown as JsonStub
    const row = res.data

    expect(row.primary_metric).toBe("retention")
    expect(row.primary_n_users_sm2).toBe(40)
    expect(row.primary_n_users_fsrs).toBe(40)

    // FSRS is the treatment arm, so a positive difference means FSRS is higher.
    expect(row.primary_mean_difference_fsrs_minus_sm2).toBeCloseTo(0.05, 3)

    const lower = row.primary_difference_ci95_lower as number
    const upper = row.primary_difference_ci95_upper as number
    expect(lower).toBeLessThan(row.primary_mean_difference_fsrs_minus_sm2 as number)
    expect(upper).toBeGreaterThan(row.primary_mean_difference_fsrs_minus_sm2 as number)
    // The result is significant, so the interval must exclude zero. An interval
    // spanning zero beside a significant p-value is the classic sign of a
    // pooled/unpooled mix-up.
    expect(lower).toBeGreaterThan(0)

    const d = row.primary_effect_size_cohens_d as number
    expect(d).toBeGreaterThan(0)
    expect(row.primary_effect_size_ci95_lower).toBeLessThan(d)
    expect(row.primary_effect_size_ci95_upper).toBeGreaterThan(d)
    expect(["negligible", "small", "medium", "large"]).toContain(row.primary_effect_size_label)

    // Three metrics are tested together, so the adjusted p-value must be worse
    // than the raw one.
    expect(row.multiple_comparison_correction).toBe("holm-bonferroni")
    expect(row.primary_p_value_holm_adjusted).toBeGreaterThan(row.primary_p_value as number)
    expect(row.primary_significant_after_correction).toBe(true)
    expect(row.experiment_verdict).toBe("fsrs_better")
  })

  it("carries the sample ratio mismatch result, which can invalidate everything else", async () => {
    const res = (await GET(exportRequest("type=comparison&format=json"))) as unknown as JsonStub
    const row = res.data

    expect(row.srm_assigned_users_sm2).toBe(50)
    expect(row.srm_assigned_users_fsrs).toBe(50)
    expect(row.srm_expected_sm2_share).toBe(0.5)
    expect(row.srm_observed_sm2_share).toBe(0.5)
    expect(row.srm_chi_square).toBe(0)
    expect(row.srm_p_value).toBe(1)
    expect(row.srm_mismatch).toBe(false)
  })

  it("reports the mismatch, and refuses the result, when assignment is lopsided", async () => {
    h.state.assignedSm2 = 900
    h.state.assignedFsrs = 100

    const res = (await GET(exportRequest("type=comparison&format=json"))) as unknown as JsonStub
    const row = res.data

    expect(row.srm_mismatch).toBe(true)
    expect(row.experiment_verdict).toBe("invalid_split")
    // The test still ran, but the verdict outranks it: a broken split makes the
    // comparison a comparison of two different populations.
    expect(row.primary_p_value).toBeLessThan(0.05)
  })

  it("analyses one observation per user, not one per review event", async () => {
    const res = (await GET(exportRequest("type=comparison&format=json"))) as unknown as JsonStub
    const row = res.data

    // 80 users contributed 1600 events. n must be the users.
    expect(row.analysis_events_analyzed).toBe(1600)
    expect(row.primary_n_users_sm2).toBe(40)
    expect(row.primary_n_users_fsrs).toBe(40)
    // Welch on 40 vs 40 tops out at 78 degrees of freedom (equal variances
    // land exactly there, up to floating point). An event-level t-test would
    // report roughly 1598 and drive the p-value toward zero.
    expect(row.primary_degrees_of_freedom).toBeCloseTo(78, 6)
  })
})

describe("comparison export: a sample that cannot support a test", () => {
  beforeEach(() => {
    // Five users per arm, well under the declared 30 per arm.
    h.state.events = [...cohort("sm2", 5, 8), ...cohort("fsrs", 5, 9)]
    h.state.assignedSm2 = 6
    h.state.assignedFsrs = 6
  })

  it("says not enough data and prints no number at all", async () => {
    const res = (await GET(exportRequest("type=comparison&format=json"))) as unknown as JsonStub
    const row = res.data

    expect(row.experiment_verdict).toBe("not_enough_data")
    expect(row.experiment_headline).toBe("Not enough data yet to say which algorithm is better")

    // Absent, not zero. A zero in a p-value column reads as "no effect".
    expect(row.primary_p_value).toBeNull()
    expect(row.primary_p_value_holm_adjusted).toBeNull()
    expect(row.primary_effect_size_cohens_d).toBeNull()
    expect(row.primary_difference_ci95_lower).toBeNull()
    expect(row.primary_difference_ci95_upper).toBeNull()
    expect(row.primary_significant_after_correction).toBeNull()

    // The n behind the refusal is still reported, so the reader knows how far
    // off the bar the sample is.
    expect(row.primary_n_users_sm2).toBe(5)
    expect(row.primary_n_users_fsrs).toBe(5)
    expect(row.primary_unavailable_reason).toContain("30 users per arm")
    expect(row).not.toHaveProperty("confidence_level")
  })

  it("leaves the CSV cells empty rather than writing the string null", async () => {
    const res = (await GET(exportRequest("type=comparison&format=csv"))) as unknown as CsvStub
    const lines = res.body.split("\n")

    expect(lines[0]).toBe("metric,value")
    expect(lines).toContain("primary_p_value,")
    expect(lines).toContain("primary_effect_size_cohens_d,")
    expect(res.body).not.toMatch(/,"null"/)
    expect(res.body).not.toMatch(/,"undefined"/)
    expect(res.body).not.toMatch(/confidence_level/)
    expect(res.body).toMatch(/experiment_verdict,"not_enough_data"/)
  })
})

describe("comparison export: no stored aggregate", () => {
  it("still reports the tested readout instead of an empty file", async () => {
    h.state.events = []
    h.state.assignedSm2 = 0
    h.state.assignedFsrs = 0
    h.state.aggregateExists = false

    const res = (await GET(exportRequest("type=comparison&format=json"))) as unknown as JsonStub

    expect(res.data.message).toBe("No comparison data available")
    expect(res.data.experiment_verdict).toBe("not_enough_data")
    expect(res.data.primary_p_value).toBeNull()
  })
})
