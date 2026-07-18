/**
 * Regression test for completeSessionWithMastery (lib/learning-state.ts).
 *
 * This is the ONLY spaced-repetition write path that a finished DSA/coding
 * interview hits (app/api/generate-feedback -> completeSessionWithMastery).
 *
 * The bug: the repeat-review branch hardcoded SM-2 (`calculateNextInterval`) and
 * ignored the user's assigned algorithm. So an FSRS-assigned user was scheduled
 * with FSRS only on a problem's FIRST attempt (via initializeProblemMasteryFromSession)
 * and silently fell back to SM-2 on every later review, stranding the stored FSRS
 * card. This test locks in that repeat reviews now route through the algorithm
 * router and persist the FSRS card.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

const h = vi.hoisted(() => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
  return {
    daysAgo,
    getUserAlgorithm: vi.fn(() => Promise.resolve("fsrs")),
    calculateNextReview: vi.fn(),
    recordReviewEvent: vi.fn(() => Promise.resolve()),
    updateProblemMastery: vi.fn(),
    initializeProblemMasteryFromSession: vi.fn(),
    invalidateBehavioralProfileCache: vi.fn(() => Promise.resolve()),
    // The stored mastery for an FSRS user whose problem is overdue (a legitimate
    // review, not massed/early practice): last reviewed 8 days ago, due 2 days ago.
    mastery: {
      problem_id: "dsa-two-sum",
      scenario_id: "dsa-two-sum",
      title: "Two Sum",
      pattern: "arrays-hashing",
      difficulty: "medium",
      ease_factor: 2.5,
      interval_days: 6,
      review_count: 2,
      next_review_at: daysAgo(2),
      fsrs_difficulty: 6.2,
      fsrs_stability: 9.4,
      fsrs_lapses: 1,
      fsrs_state: JSON.stringify({
        difficulty: 6.2,
        stability: 9.4,
        state: "review",
        reps: 2,
        lapses: 1,
        scheduledDays: 6,
        elapsedDays: 8,
        learningSteps: 0,
        lastReview: daysAgo(8),
        nextReview: daysAgo(2),
      }),
      last_score: 78,
      average_score: 75,
      best_score: 88,
      scores_history: [70, 80],
      first_seen_at: daysAgo(30),
      last_reviewed_at: daysAgo(8),
      time_spent_minutes: 40,
      hints_used_total: 2,
      mastery_level: "reviewing",
      confidence: 0.7,
    } as Record<string, unknown>,
  }
})

// Path-aware adminDb mock. The leaf `get()` returns a doc keyed by the ROOT
// collection so the same-module helpers (updateLearningStateAfterSession,
// getUserLearningState, updateLongestStreak, getUserTimezone) and the direct
// problem_mastery read all resolve without hitting Firestore.
function docFor(root: string) {
  if (root === "problem_mastery/problems") {
    return { exists: true, data: () => h.mastery }
  }
  if (root === "user_learning_state") {
    return {
      exists: true,
      data: () => ({
        streak_days: 3,
        last_session_at: h.daysAgo(1),
        topics: {},
        updated_at: h.daysAgo(1),
      }),
    }
  }
  if (root === "profiles") {
    return {
      exists: true,
      data: () => ({
        notification_preferences: { timezone: "UTC" },
        spaced_repetition_algorithm: "fsrs",
      }),
    }
  }
  return { exists: false, data: () => undefined }
}

function makeDocRef(root: string) {
  const ref: Record<string, unknown> = {
    get: () => Promise.resolve(docFor(root)),
    update: () => Promise.resolve(),
    set: () => Promise.resolve(),
    collection: (sub: string) => ({
      doc: () =>
        makeDocRef(root === "problem_mastery" ? "problem_mastery/problems" : `${root}/${sub}`),
    }),
  }
  return ref
}

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) => ({ doc: () => makeDocRef(name) }),
    runTransaction: (cb: (t: unknown) => unknown) =>
      Promise.resolve(
        cb({
          get: (r: { get: () => unknown }) => r.get(),
          update: () => undefined,
          set: () => undefined,
        })
      ),
  },
  FieldValue: {
    increment: (n: number) => ({ __increment: n }),
    serverTimestamp: () => "server-ts",
  },
}))

vi.mock("@/lib/rag/behavioral-analysis", () => ({
  invalidateBehavioralProfileCache: h.invalidateBehavioralProfileCache,
}))

// Fully mock the SR index (spy the algorithm choice + router; deterministic fakes
// for the pure state helpers). Loading the real index pulls in the heavy RAG/
// research module graph, which made this test slow and flaky under full-suite load.
vi.mock("@/lib/spaced-repetition", () => ({
  getUserAlgorithm: h.getUserAlgorithm,
  calculateNextReview: h.calculateNextReview,
  recordReviewEvent: h.recordReviewEvent,
  estimateRetentionForAlgorithm: () => 85,
  reconstructState: (algorithm: string, data: Record<string, number | string | undefined>) => ({
    algorithm,
    interval_days: data.interval_days,
    next_review_at: data.next_review_at,
    review_count: data.review_count,
    mastery_level: data.mastery_level,
    confidence: data.confidence,
    ease_factor: data.ease_factor ?? 2.5,
    fsrs_state:
      data.fsrs_stability != null
        ? {
            stability: data.fsrs_stability,
            difficulty: data.fsrs_difficulty ?? 5,
            lapses: data.fsrs_lapses ?? 0,
          }
        : undefined,
  }),
  prepareStateForStorage: (state: Record<string, any>) => {
    const base = {
      interval_days: state.interval_days,
      next_review_at: state.next_review_at,
      review_count: state.review_count,
      mastery_level: state.mastery_level,
      confidence: state.confidence,
    }
    if (state.algorithm === "fsrs") {
      const fsrs = state.fsrs_state
      return {
        ...base,
        ease_factor: 2.5,
        fsrs_difficulty: fsrs?.difficulty,
        fsrs_stability: fsrs?.stability,
        fsrs_state: fsrs ? JSON.stringify(fsrs) : undefined,
        fsrs_lapses: fsrs?.lapses,
      }
    }
    return { ...base, ease_factor: state.ease_factor ?? 2.5 }
  },
}))

vi.mock("@/lib/spaced-repetition/scheduler", () => ({
  updateProblemMastery: h.updateProblemMastery,
  initializeProblemMasteryFromSession: h.initializeProblemMasteryFromSession,
}))

import { completeSessionWithMastery } from "../learning-state"

describe("completeSessionWithMastery — repeat review uses the assigned algorithm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    h.getUserAlgorithm.mockResolvedValue("fsrs")
    h.invalidateBehavioralProfileCache.mockResolvedValue(undefined)

    // Router returns an FSRS schedule (an FSRS-assigned user must get this, not SM-2).
    const nextReviewAt = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    h.calculateNextReview.mockResolvedValue({
      algorithm: "fsrs",
      next_interval_days: 15,
      next_review_at: nextReviewAt,
      mastery_level: "reviewing",
      confidence: 0.82,
      quality_rating: 3,
      retention_estimate: 0.9,
      fsrs_state: {
        difficulty: 6.0,
        stability: 15.3,
        state: "review",
        lastReview: new Date().toISOString(),
        nextReview: nextReviewAt,
        reps: 3,
        lapses: 1,
        learningSteps: 0,
        elapsedDays: 8,
        scheduledDays: 15,
      },
    })

    // updateProblemMastery is pure persistence; echo the schedule fields back.
    h.updateProblemMastery.mockImplementation(
      (_uid: string, _pid: string, update: Record<string, unknown>) =>
        Promise.resolve({
          ...h.mastery,
          interval_days: update.interval_days ?? 15,
          next_review_at: update.next_review_at,
          mastery_level: update.mastery_level ?? "reviewing",
        })
    )
  })

  it("routes an FSRS user's repeat review through calculateNextReview with the reconstructed card", async () => {
    await completeSessionWithMastery("user-1", {
      scenarioId: "dsa-two-sum",
      title: "Two Sum",
      pattern: "arrays-hashing",
      difficulty: "medium",
      performanceScore: 82,
      masteryScore: 85,
      timeSpentMinutes: 18,
      hintsUsed: 0,
    })

    expect(h.getUserAlgorithm).toHaveBeenCalledWith("user-1")
    expect(h.calculateNextReview).toHaveBeenCalledTimes(1)

    // The reconstructed state passed to the router must carry the STORED FSRS card
    // (stability 9.4), not a default rebuilt one — otherwise FSRS learns nothing.
    const [, currentState] = h.calculateNextReview.mock.calls[0]
    expect(currentState.algorithm).toBe("fsrs")
    expect(currentState.fsrs_state?.stability).toBeCloseTo(9.4)
  })

  it("persists the FSRS card the router produced (not an SM-2 ease-factor-only update)", async () => {
    await completeSessionWithMastery("user-1", {
      scenarioId: "dsa-two-sum",
      title: "Two Sum",
      pattern: "arrays-hashing",
      difficulty: "medium",
      performanceScore: 82,
      masteryScore: 85,
    })

    expect(h.updateProblemMastery).toHaveBeenCalledTimes(1)
    const update = h.updateProblemMastery.mock.calls[0][2] as Record<string, unknown>

    // FSRS output persisted: serialized card + stability present, review_count
    // incremented atomically (mirrors the /complete route).
    expect(update.increment_review_count).toBe(true)
    expect(update.fsrs_stability).toBeCloseTo(15.3)
    expect(typeof update.fsrs_state).toBe("string")
    const persistedCard = JSON.parse(update.fsrs_state as string)
    expect(persistedCard.stability).toBeCloseTo(15.3)
  })

  it("records the research event with the algorithm's real post-review state", async () => {
    await completeSessionWithMastery("user-1", {
      scenarioId: "dsa-two-sum",
      title: "Two Sum",
      pattern: "arrays-hashing",
      difficulty: "medium",
      performanceScore: 82,
      masteryScore: 85,
    })

    expect(h.recordReviewEvent).toHaveBeenCalledTimes(1)
    const event = h.recordReviewEvent.mock.calls[0][0] as {
      qualityRating: number
      postReviewState: { newIntervalDays: number; newStability?: number }
    }
    expect(event.qualityRating).toBe(3)
    expect(event.postReviewState.newIntervalDays).toBe(15)
    expect(event.postReviewState.newStability).toBeCloseTo(15.3)
  })
})
