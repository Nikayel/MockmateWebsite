import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  apiRateLimit: vi.fn(),
  csrfProtection: vi.fn(),
  verifyAuth: vi.fn(),
  requireTierForUser: vi.fn(),
  getScenarioById: vi.fn(),
  getAllUserProblems: vi.fn(),
  updateProblemMastery: vi.fn(),
  updateUserLearningStateSummary: vi.fn(),
  getUserAlgorithm: vi.fn(),
  calculateNextReview: vi.fn(),
  reconstructState: vi.fn(),
  prepareStateForStorage: vi.fn(),
  estimateRetentionForAlgorithm: vi.fn(),
  recordReviewEvent: vi.fn(),
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
  scenarios: [],
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
  getAllUserProblems: mocks.getAllUserProblems,
  updateUserLearningStateSummary: mocks.updateUserLearningStateSummary,
  getUserAlgorithm: mocks.getUserAlgorithm,
  calculateNextReview: mocks.calculateNextReview,
  reconstructState: mocks.reconstructState,
  prepareStateForStorage: mocks.prepareStateForStorage,
  estimateRetentionForAlgorithm: mocks.estimateRetentionForAlgorithm,
  recordReviewEvent: mocks.recordReviewEvent,
}))

function createRequest(body: unknown): NextRequest {
  return {
    headers: { get: () => null },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest
}

// The global vitest setup stubs NextResponse.json as a plain { data, status } object.
type StubResponse = { status: number; data?: Record<string, unknown> }

// Exactly what the practice page sends when marking a problem reviewed.
const validPayload = { problem_id: "two-sum", scenario_id: "two-sum" }

const existingMastery = {
  problem_id: "two-sum",
  title: "Two Sum",
  pattern: "arrays-hashing",
  difficulty: "easy",
  interval_days: 1,
  review_count: 1,
  mastery_level: "learning",
  confidence: 0.3,
  ease_factor: 2.5,
  last_reviewed_at: "2026-07-10T00:00:00.000Z",
  next_review_at: "2026-07-11T00:00:00.000Z",
  scores_history: [70],
}

describe("/api/spaced-repetition/mark-reviewed", () => {
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
    })
    mocks.getAllUserProblems.mockResolvedValue([existingMastery])
    mocks.getUserAlgorithm.mockResolvedValue("sm2")
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
      review_count: 2,
      mastery_level: "learning",
      confidence: 0.5,
      ease_factor: 2.6,
    })
    mocks.updateProblemMastery.mockResolvedValue({
      problem_id: "two-sum",
      next_review_at: "2026-07-22T00:00:00.000Z",
      interval_days: 3,
      mastery_level: "learning",
      review_count: 2,
    })
    mocks.recordReviewEvent.mockResolvedValue(undefined)
    mocks.updateUserLearningStateSummary.mockResolvedValue(undefined)
  })

  it("accepts the practice page's exact payload and reschedules the problem", async () => {
    const { POST } = await import("./route")

    const response = (await POST(createRequest(validPayload))) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(response.data?.success).toBe(true)
    const data = response.data?.data as Record<string, unknown>
    expect(data.problem_id).toBe("two-sum")
    expect(data.next_review_at).toBe("2026-07-22T00:00:00.000Z")
    expect(mocks.updateProblemMastery).toHaveBeenCalledWith(
      "user-1",
      "two-sum",
      expect.objectContaining({ increment_review_count: true })
    )
  })

  it.each([
    ["missing problem_id", { scenario_id: "two-sum" }],
    ["empty problem_id", { problem_id: "", scenario_id: "two-sum" }],
    ["non-string problem_id", { problem_id: 123, scenario_id: "two-sum" }],
    ["oversized problem_id", { problem_id: "x".repeat(300), scenario_id: "two-sum" }],
    ["non-string scenario_id", { problem_id: "two-sum", scenario_id: { nested: true } }],
  ])("rejects %s with 400 before any write", async (_label, payload) => {
    const { POST } = await import("./route")

    const response = (await POST(createRequest(payload))) as unknown as StubResponse

    expect(response.status).toBe(400)
    expect(response.data?.error).toBe("Bad Request")
    expect(mocks.updateProblemMastery).not.toHaveBeenCalled()
  })

  it("returns 404 when the problem has no mastery record yet", async () => {
    mocks.getAllUserProblems.mockResolvedValue([])
    const { POST } = await import("./route")

    const response = (await POST(createRequest(validPayload))) as unknown as StubResponse

    expect(response.status).toBe(404)
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
