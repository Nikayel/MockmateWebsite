import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  apiRateLimit: vi.fn(),
  csrfProtection: vi.fn(),
  verifyAuth: vi.fn(),
  requireTierForUser: vi.fn(),
  getScenarioById: vi.fn(),
  getAllUserProblems: vi.fn(),
  initializeProblemMasteryFromSession: vi.fn(),
  updateProblemMastery: vi.fn(),
  updateUserLearningStateSummary: vi.fn(),
  getDailyGoalProgress: vi.fn(),
  getUserAlgorithm: vi.fn(),
  calculateNextReview: vi.fn(),
  reconstructState: vi.fn(),
  prepareStateForStorage: vi.fn(),
  estimateRetentionForAlgorithm: vi.fn(),
  recordReviewEvent: vi.fn(),
  quickMasteryScore: vi.fn(),
  mapScoreToQuality: vi.fn(),
  mapPerformanceToFSRSRating: vi.fn(),
  updateLearningStateAfterSession: vi.fn(),
  triggerSessionNotifications: vi.fn(),
  loggerInfo: vi.fn(),
  loggerWarn: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: mocks.apiRateLimit,
}))

vi.mock("@/lib/csrf", () => ({
  csrfProtection: mocks.csrfProtection,
}))

vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: mocks.verifyAuth,
}))

vi.mock("@/lib/quota-enforcement", () => ({
  requireTierForUser: mocks.requireTierForUser,
}))

vi.mock("@/lib/scenarios", () => ({
  getScenarioById: mocks.getScenarioById,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    info: mocks.loggerInfo,
    warn: mocks.loggerWarn,
    error: mocks.loggerError,
  },
}))

vi.mock("@/lib/spaced-repetition", () => ({
  updateProblemMastery: mocks.updateProblemMastery,
  initializeProblemMasteryFromSession: mocks.initializeProblemMasteryFromSession,
  getAllUserProblems: mocks.getAllUserProblems,
  updateUserLearningStateSummary: mocks.updateUserLearningStateSummary,
  getDailyGoalProgress: mocks.getDailyGoalProgress,
  getUserAlgorithm: mocks.getUserAlgorithm,
  calculateNextReview: mocks.calculateNextReview,
  reconstructState: mocks.reconstructState,
  prepareStateForStorage: mocks.prepareStateForStorage,
  estimateRetentionForAlgorithm: mocks.estimateRetentionForAlgorithm,
  recordReviewEvent: mocks.recordReviewEvent,
  quickMasteryScore: mocks.quickMasteryScore,
  mapScoreToQuality: mocks.mapScoreToQuality,
  mapPerformanceToFSRSRating: mocks.mapPerformanceToFSRSRating,
}))

vi.mock("@/lib/learning-state", () => ({
  updateLearningStateAfterSession: mocks.updateLearningStateAfterSession,
}))

vi.mock("@/lib/services/session-notifications", () => ({
  triggerSessionNotifications: mocks.triggerSessionNotifications,
}))

// Covers both dynamic-import usages: the streak read (user_learning_state doc)
// and the problems count() aggregate.
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: true, data: () => ({ streak_days: 2 }) }),
        collection: () => ({
          count: () => ({
            get: () => Promise.resolve({ data: () => ({ count: 5 }) }),
          }),
        }),
      }),
    }),
  },
}))

function createRequest(body: unknown): NextRequest {
  return {
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest
}

// The global vitest setup stubs NextResponse.json as a plain { data, status } object.
type StubResponse = { status: number; data?: Record<string, unknown> }

// Exactly what useInterviewMetrics sends after a session.
const validPayload = {
  problem_id: "two-sum",
  performance_score: 82,
  mastery_score: 78.5,
  time_spent_minutes: 24.5,
  hints_used: 1,
  test_cases_passed: 9,
  test_cases_total: 10,
}

const existingMastery = {
  problem_id: "two-sum",
  title: "Two Sum",
  pattern: "arrays-hashing",
  difficulty: "easy",
  interval_days: 1,
  review_count: 2,
  mastery_level: "learning",
  confidence: 0.4,
  ease_factor: 2.5,
  last_reviewed_at: "2026-07-10T00:00:00.000Z",
  next_review_at: "2026-07-12T00:00:00.000Z",
  scores_history: [70, 75],
}

describe("/api/spaced-repetition/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiRateLimit.mockResolvedValue(null) // allowed
    mocks.csrfProtection.mockReturnValue(null) // passed
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
    mocks.requireTierForUser.mockResolvedValue({ response: null })
    mocks.getScenarioById.mockReturnValue({
      id: "two-sum",
      title: "Two Sum",
      difficulty: "easy",
      pattern: "arrays-hashing",
    })
    mocks.getAllUserProblems.mockResolvedValue([])
    mocks.getUserAlgorithm.mockResolvedValue("sm2")
    mocks.quickMasteryScore.mockReturnValue(80)
    mocks.mapScoreToQuality.mockReturnValue(4)
    mocks.mapPerformanceToFSRSRating.mockReturnValue(3)
    mocks.initializeProblemMasteryFromSession.mockResolvedValue({
      problem_id: "two-sum",
      next_review_at: "2026-07-20T00:00:00.000Z",
      interval_days: 1,
      mastery_level: "learning",
      confidence: 0.3,
      ease_factor: 2.5,
      review_count: 1,
    })
    mocks.reconstructState.mockReturnValue({ fsrs_state: undefined })
    mocks.estimateRetentionForAlgorithm.mockReturnValue(0.8)
    mocks.calculateNextReview.mockResolvedValue({
      algorithm: "sm2",
      next_interval_days: 3,
      next_review_at: "2026-07-22T00:00:00.000Z",
      mastery_level: "learning",
      confidence: 0.5,
      ease_factor: 2.6,
      quality_rating: 4,
    })
    mocks.prepareStateForStorage.mockReturnValue({
      algorithm: "sm2",
      interval_days: 3,
      next_review_at: "2026-07-22T00:00:00.000Z",
      review_count: 3,
      mastery_level: "learning",
      confidence: 0.5,
      ease_factor: 2.6,
    })
    mocks.updateProblemMastery.mockResolvedValue({
      problem_id: "two-sum",
      next_review_at: "2026-07-22T00:00:00.000Z",
      interval_days: 3,
      mastery_level: "learning",
      confidence: 0.5,
      review_count: 3,
    })
    mocks.recordReviewEvent.mockResolvedValue(undefined)
    mocks.updateLearningStateAfterSession.mockResolvedValue(undefined)
    mocks.updateUserLearningStateSummary.mockResolvedValue(undefined)
    mocks.getDailyGoalProgress.mockResolvedValue({ daily_progress: 1, daily_goal: 3 })
    mocks.triggerSessionNotifications.mockResolvedValue(undefined)
  })

  it("accepts the interview hook's exact payload for a new problem", async () => {
    const { POST } = await import("./route")

    const response = (await POST(createRequest(validPayload))) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(response.data?.success).toBe(true)
    expect(response.data?.next_review_at).toBe("2026-07-20T00:00:00.000Z")
    expect(mocks.initializeProblemMasteryFromSession).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ performance_score: 82, mastery_score: 78.5 })
    )
    expect(mocks.updateProblemMastery).not.toHaveBeenCalled()
  })

  it("still succeeds on the repeat-review path for an existing problem", async () => {
    mocks.getAllUserProblems.mockResolvedValue([existingMastery])
    const { POST } = await import("./route")

    const response = (await POST(createRequest(validPayload))) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(response.data?.success).toBe(true)
    expect(mocks.updateProblemMastery).toHaveBeenCalledWith(
      "user-1",
      "two-sum",
      expect.objectContaining({ performance_score: 82 })
    )
    expect(mocks.initializeProblemMasteryFromSession).not.toHaveBeenCalled()
  })

  it.each([
    ["mastery_score above 100", { ...validPayload, mastery_score: 500 }],
    ["performance_score above 100", { ...validPayload, performance_score: 101 }],
    ["negative performance_score", { ...validPayload, performance_score: -5 }],
    ["negative time_spent_minutes", { ...validPayload, time_spent_minutes: -1 }],
    ["absurd time_spent_minutes", { ...validPayload, time_spent_minutes: 1_000_000 }],
    ["non-integer hints_used", { ...validPayload, hints_used: 2.5 }],
    ["absurd test_cases_passed", { ...validPayload, test_cases_passed: 99999 }],
    ["non-numeric performance_score", { ...validPayload, performance_score: "82" }],
    ["missing problem_id", { performance_score: 82 }],
    ["non-ISO completed_at", { ...validPayload, completed_at: "yesterday" }],
  ])("rejects %s with 400 before any write", async (_label, payload) => {
    const { POST } = await import("./route")

    const response = (await POST(createRequest(payload))) as unknown as StubResponse

    expect(response.status).toBe(400)
    expect(response.data?.error).toBe("Bad Request")
    expect(mocks.initializeProblemMasteryFromSession).not.toHaveBeenCalled()
    expect(mocks.updateProblemMastery).not.toHaveBeenCalled()
  })

  it("returns 401 for unauthenticated requests", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { POST } = await import("./route")

    const response = (await POST(createRequest(validPayload))) as unknown as StubResponse

    expect(response.status).toBe(401)
    expect(mocks.getAllUserProblems).not.toHaveBeenCalled()
  })

  it("short-circuits when the rate limiter blocks the request", async () => {
    const limited = new Response(null, { status: 429 })
    mocks.apiRateLimit.mockResolvedValue(limited)
    const { POST } = await import("./route")

    const response = await POST(createRequest(validPayload))

    expect(response.status).toBe(429)
    expect(mocks.csrfProtection).not.toHaveBeenCalled()
    expect(mocks.verifyAuth).not.toHaveBeenCalled()
  })
})
