/**
 * Tests for the learner-model builder: card beliefs, concept rollups, the
 * systems split, ordering, and black-box masking.
 */

import { describe, it, expect, vi } from "vitest"

const h = vi.hoisted(() => ({
  problems: [] as Record<string, unknown>[],
}))

vi.mock("@/lib/firebase-admin", () => ({ adminDb: {} }))
vi.mock("../../spaced-repetition/scheduler", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../spaced-repetition/scheduler")>()
  return {
    ...original,
    getAllUserProblems: vi.fn(() => Promise.resolve(h.problems)),
  }
})

import { buildLearnerModel, buildCardBelief, maskForBlackBox } from "../model-builder"
import type { ProblemMastery } from "../../spaced-repetition"

const NOW = new Date("2026-07-29T12:00:00.000Z")

const fsrsCard = (stability: number, lastReviewedDaysAgo: number) =>
  JSON.stringify({
    difficulty: 5,
    stability,
    state: "review",
    lastReview: new Date(NOW.getTime() - lastReviewedDaysAgo * 86400_000).toISOString(),
    nextReview: new Date(NOW.getTime() + 3 * 86400_000).toISOString(),
    reps: 4,
    lapses: 1,
    learningSteps: 0,
    elapsedDays: lastReviewedDaysAgo,
    scheduledDays: Math.round(stability),
  })

const problem = (overrides: Partial<ProblemMastery> & Record<string, unknown> = {}) =>
  ({
    problem_id: "two-sum",
    scenario_id: "two-sum",
    title: "Two Sum",
    pattern: "arrays-hashing",
    difficulty: "easy",
    ease_factor: 2.5,
    interval_days: 10,
    review_count: 4,
    next_review_at: new Date(NOW.getTime() + 3 * 86400_000).toISOString(),
    fsrs_state: fsrsCard(10, 2),
    fsrs_stability: 10,
    fsrs_difficulty: 5,
    fsrs_lapses: 1,
    last_score: 80,
    average_score: 75,
    best_score: 90,
    scores_history: [70, 75, 80],
    first_seen_at: "2026-07-01T00:00:00.000Z",
    last_reviewed_at: new Date(NOW.getTime() - 2 * 86400_000).toISOString(),
    time_spent_minutes: 42,
    hints_used_total: 1,
    mastery_level: "reviewing",
    confidence: 0.7,
    ...overrides,
  }) as unknown as ProblemMastery

describe("buildCardBelief", () => {
  it("derives retrievability, memory chip, forecast, and belief text", () => {
    const belief = buildCardBelief(problem(), NOW)

    expect(belief.retrievability).toBeGreaterThan(50)
    expect(belief.retrievability).toBeLessThanOrEqual(100)
    expect(belief.stability_days).toBe(10)
    expect(belief.fsrs_difficulty).toBe(5)
    expect(belief.lapses).toBe(1)
    expect(belief.memory?.urgency).toBeDefined()
    expect(belief.belief_text).toContain("%")
    expect(belief.days_until_forgetting).not.toBeNull()
    expect(belief.scores_history).toEqual([70, 75, 80])
  })

  it("reports no-evidence for never-reviewed cards instead of faking a number", () => {
    const belief = buildCardBelief(
      problem({ review_count: 0, scores_history: [], fsrs_state: undefined }),
      NOW
    )
    expect(belief.retrievability).toBeNull()
    expect(belief.belief_text).toContain("No reviews yet")
  })
})

describe("buildLearnerModel", () => {
  it("groups by pattern, splits systems, and orders concepts most-at-risk first", async () => {
    h.problems = [
      // Healthy arrays card
      problem({ problem_id: "a1", pattern: "arrays-hashing", fsrs_state: fsrsCard(60, 1) }),
      // Decayed graphs card (low stability, long elapsed)
      problem({
        problem_id: "g1",
        pattern: "graphs",
        fsrs_state: fsrsCard(2, 10),
        last_reviewed_at: new Date(NOW.getTime() - 10 * 86400_000).toISOString(),
      }),
      // System design card in the case-lab bucket
      problem({ problem_id: "sd1", pattern: "case-lab" }),
    ]

    const model = await buildLearnerModel("u1")

    expect(model.total_cards).toBe(3)
    expect(model.concepts.map((c) => c.pattern)).toEqual(["graphs", "arrays-hashing"])
    expect(model.systems.map((c) => c.pattern)).toEqual(["case-lab"])
    expect(model.condition).toBe("open")
    expect(model.challenges_enabled).toBe(true)

    const graphs = model.concepts[0]
    expect(graphs.card_count).toBe(1)
    expect(graphs.mean_retrievability).toBeLessThan(model.concepts[1].mean_retrievability ?? 0)
    expect(graphs.belief_text).toContain("Graph")
    expect(graphs.forgetting_soonest?.problem_id).toBe("g1")
  })

  it("counts mastery levels per concept", async () => {
    h.problems = [
      problem({ problem_id: "a1", mastery_level: "mastered" }),
      problem({ problem_id: "a2", mastery_level: "learning" }),
      problem({ problem_id: "a3", mastery_level: "new", review_count: 0 }),
    ]

    const model = await buildLearnerModel("u1")
    const concept = model.concepts[0]
    expect(concept.mastered).toBe(1)
    expect(concept.learning).toBe(1)
    expect(concept.new_count).toBe(1)
  })
})

describe("maskForBlackBox", () => {
  it("keeps structure but nulls every numeric belief and disables challenges", async () => {
    h.problems = [problem(), problem({ problem_id: "sd1", pattern: "case-lab" })]
    const masked = maskForBlackBox(await buildLearnerModel("u1"))

    expect(masked.condition).toBe("black_box")
    expect(masked.challenges_enabled).toBe(false)
    // Concepts and titles remain listed (control group still has a page).
    expect(masked.concepts).toHaveLength(1)
    expect(masked.systems).toHaveLength(1)
    expect(masked.concepts[0].cards[0].title).toBe("Two Sum")

    // Every belief field is withheld.
    const concept = masked.concepts[0]
    expect(concept.mean_retrievability).toBeNull()
    expect(concept.min_retrievability).toBeNull()
    expect(concept.belief_text).toBeNull()
    expect(concept.forgetting_soonest).toBeNull()

    const card = concept.cards[0]
    const numericKeys = [
      "retrievability",
      "stability_days",
      "fsrs_difficulty",
      "lapses",
      "memory",
      "belief_text",
      "days_until_forgetting",
      "interval_days",
      "review_count",
      "last_score",
      "average_score",
      "best_score",
      "scores_history",
      "hints_used_total",
      "time_spent_minutes",
      "mastery_level",
      "confidence",
    ] as const
    for (const key of numericKeys) {
      expect(card[key], key).toBeNull()
    }
  })
})
