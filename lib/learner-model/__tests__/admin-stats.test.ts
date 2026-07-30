/**
 * Tests for the learner-model admin aggregation.
 *
 * The properties that make the dashboard trustworthy:
 * - dispute accuracy divides by RESOLVED verifications, never by all challenges
 *   (a pending review must not read as a failed one);
 * - accuracy is null rather than 0 before any verification resolves, so an empty
 *   study does not display as "0% of learners were right";
 * - a failing event aggregate degrades to 0 instead of taking the page down;
 * - hitting the scan ceiling sets `truncated` rather than silently reporting a
 *   partial history as complete.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const h = vi.hoisted(() => ({
  challengeDocs: [] as unknown[],
  countImpl: null as null | ((collection: string, field: string, value: string) => number),
}))

vi.mock("../../firebase-admin", () => {
  const makeCountQuery = (collection: string, field: string, value: string) => ({
    count: () => ({
      get: async () => {
        if (!h.countImpl) throw new Error("count unavailable")
        return { data: () => ({ count: h.countImpl(collection, field, value) }) }
      },
    }),
  })

  return {
    adminDb: {
      collection: (collection: string) => ({
        orderBy: () => ({
          limit: () => ({
            get: async () => ({
              docs: h.challengeDocs.map((data) => ({ data: () => data })),
            }),
          }),
        }),
        where: (field: string, _op: string, value: string) =>
          makeCountQuery(collection, field, value),
      }),
    },
  }
})

import { getLearnerModelAdminStats, MAX_CHALLENGES_SCANNED } from "../admin-stats"

interface ChallengeFixture {
  user?: string
  reason?: "typo" | "rushed" | "learned_elsewhere"
  status?: "pending_verification" | "verified"
  passed?: boolean
  score?: number
  source?: "event_snapshot" | "field_fallback" | "none"
}

function challenge(fixture: ChallengeFixture = {}) {
  const {
    user = "u1",
    reason = "typo",
    status = "pending_verification",
    passed = true,
    score = 70,
    source = "event_snapshot",
  } = fixture
  return {
    id: `${user}-${reason}-${Math.abs(score)}-${status}`,
    user_id: user,
    problem_id: "p1",
    scenario_id: "p1",
    title: "Two Sum",
    pattern: "arrays-hashing",
    reason,
    created_at: "2026-07-29T10:00:00.000Z",
    condition: "open",
    belief_snapshot: { retrievability: 41, stability: 3.2 },
    correction: {
      type: "rerate",
      amendment_source: source,
      before: { stability: 3.2, next_review_at: "x", lapses: 1 },
      after: { stability: 9.1, next_review_at: "y", lapses: 0 },
      verification_due_at: "z",
    },
    status,
    verification:
      status === "verified"
        ? {
            reviewed_at: "2026-07-30T09:00:00.000Z",
            mastery_score: score,
            passed,
            research_event_id: null,
          }
        : null,
  }
}

beforeEach(() => {
  h.challengeDocs = []
  h.countImpl = () => 0
})

describe("getLearnerModelAdminStats", () => {
  it("reports an empty study without inventing zeros for accuracy", async () => {
    const stats = await getLearnerModelAdminStats()

    expect(stats.challenges.total).toBe(0)
    expect(stats.challenges.accuracy_pct).toBeNull()
    expect(stats.challenges.mean_verification_score).toBeNull()
    expect(stats.truncated).toBe(false)
  })

  it("divides dispute accuracy by resolved verifications, not by all challenges", async () => {
    h.challengeDocs = [
      challenge({ status: "verified", passed: true }),
      challenge({ status: "verified", passed: false }),
      // Three still pending — these must not count as failures.
      challenge(),
      challenge(),
      challenge(),
    ]

    const stats = await getLearnerModelAdminStats()

    expect(stats.challenges.total).toBe(5)
    expect(stats.challenges.pending).toBe(3)
    expect(stats.challenges.verified).toBe(2)
    expect(stats.challenges.passed).toBe(1)
    expect(stats.challenges.failed).toBe(1)
    expect(stats.challenges.accuracy_pct).toBe(50)
  })

  it("leaves accuracy null while every challenge is still pending", async () => {
    h.challengeDocs = [challenge(), challenge()]

    const stats = await getLearnerModelAdminStats()

    expect(stats.challenges.pending).toBe(2)
    expect(stats.challenges.accuracy_pct).toBeNull()
  })

  it("breaks disputes down by stated reason independently", async () => {
    h.challengeDocs = [
      challenge({ reason: "typo", status: "verified", passed: true }),
      challenge({ reason: "typo", status: "verified", passed: true }),
      challenge({ reason: "rushed", status: "verified", passed: false }),
      challenge({ reason: "learned_elsewhere" }),
    ]

    const stats = await getLearnerModelAdminStats()

    expect(stats.challenges.by_reason.typo.accuracy_pct).toBe(100)
    expect(stats.challenges.by_reason.rushed.accuracy_pct).toBe(0)
    expect(stats.challenges.by_reason.learned_elsewhere.total).toBe(1)
    expect(stats.challenges.by_reason.learned_elsewhere.accuracy_pct).toBeNull()
  })

  it("counts distinct challengers, not challenges", async () => {
    h.challengeDocs = [
      challenge({ user: "a" }),
      challenge({ user: "a", reason: "rushed" }),
      challenge({ user: "b" }),
    ]

    const stats = await getLearnerModelAdminStats()

    expect(stats.challenges.total).toBe(3)
    expect(stats.challenges.distinct_challengers).toBe(2)
  })

  it("tallies which amendment path the Correct layer reached", async () => {
    h.challengeDocs = [
      challenge({ source: "event_snapshot" }),
      challenge({ source: "event_snapshot" }),
      challenge({ source: "field_fallback" }),
      challenge({ source: "none" }),
    ]

    const stats = await getLearnerModelAdminStats()

    expect(stats.challenges.by_amendment_source).toEqual({
      event_snapshot: 2,
      field_fallback: 1,
      none: 1,
    })
  })

  it("averages only resolved verification scores", async () => {
    h.challengeDocs = [
      challenge({ status: "verified", passed: true, score: 80 }),
      challenge({ status: "verified", passed: false, score: 40 }),
      challenge(), // pending, contributes no score
    ]

    const stats = await getLearnerModelAdminStats()

    expect(stats.challenges.mean_verification_score).toBe(60)
  })

  it("splits event volume by type and by study condition", async () => {
    h.countImpl = (_collection, field, value) => {
      if (field === "event_type") return value === "olm_model_viewed" ? 12 : 1
      if (field === "condition") return value === "open" ? 30 : 10
      return 0
    }

    const stats = await getLearnerModelAdminStats()

    expect(stats.events_by_type.olm_model_viewed).toBe(12)
    expect(stats.events_by_condition.open).toBe(30)
    expect(stats.events_by_condition.black_box).toBe(10)
    expect(stats.events_total).toBe(40)
  })

  // A missing index on the events collection must not blank the challenge history,
  // which is the part that actually answers the study's question.
  it("still returns challenge stats when the event aggregates fail", async () => {
    h.countImpl = null // every count() throws
    h.challengeDocs = [challenge({ status: "verified", passed: true })]

    const stats = await getLearnerModelAdminStats()

    expect(stats.challenges.accuracy_pct).toBe(100)
    expect(stats.events_total).toBe(0)
    expect(stats.events_by_type.olm_model_viewed).toBe(0)
  })

  it("flags truncation instead of reporting a partial history as complete", async () => {
    h.challengeDocs = Array.from({ length: MAX_CHALLENGES_SCANNED }, (_, i) =>
      challenge({ user: `u${i}` })
    )

    const stats = await getLearnerModelAdminStats()

    expect(stats.truncated).toBe(true)
    expect(stats.challenges.distinct_challengers).toBe(MAX_CHALLENGES_SCANNED)
  })

  it("caps the recent table well below the scan ceiling", async () => {
    h.challengeDocs = Array.from({ length: 100 }, (_, i) => challenge({ user: `u${i}` }))

    const stats = await getLearnerModelAdminStats()

    expect(stats.recent).toHaveLength(25)
    expect(stats.recent[0].believed_retrievability).toBe(41)
    expect(stats.recent[0].stability_before).toBe(3.2)
    expect(stats.recent[0].stability_after).toBe(9.1)
  })
})
