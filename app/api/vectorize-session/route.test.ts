import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  vectorizeSessionMetrics: vi.fn(),
  extractCodeFeatures: vi.fn(),
  vectorizeCodeFeatures: vi.fn(),
  storeSessionVector: vi.fn(),
  updateUserPerformanceProfile: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: mocks.verifyAuth,
}))

vi.mock("@/lib/rag", () => ({
  vectorizeSessionMetrics: mocks.vectorizeSessionMetrics,
  extractCodeFeatures: mocks.extractCodeFeatures,
  vectorizeCodeFeatures: mocks.vectorizeCodeFeatures,
  storeSessionVector: mocks.storeSessionVector,
  updateUserPerformanceProfile: mocks.updateUserPerformanceProfile,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mocks.loggerError,
  },
}))

function createRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
  } as NextRequest
}

describe("/api/vectorize-session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
    mocks.vectorizeSessionMetrics.mockReturnValue([0.1, 0.2])
    mocks.extractCodeFeatures.mockReturnValue({})
    mocks.vectorizeCodeFeatures.mockReturnValue([0.3, 0.4])
    mocks.storeSessionVector.mockResolvedValue("vector-1")
    mocks.updateUserPerformanceProfile.mockResolvedValue(undefined)
  })

  it("does not create NaN correctness scores when no tests are provided", async () => {
    const { POST } = await import("./route")

    const response = await POST(
      createRequest({
        sessionId: "session-1",
        scenarioId: "two-sum",
        code: "function twoSum() {}",
        testResults: [],
        scores: {},
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.vectorizeSessionMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        correctnessScore: 0,
      })
    )
    expect(mocks.storeSessionVector).toHaveBeenCalledWith(
      expect.objectContaining({
        scores: expect.objectContaining({
          correctness: 0,
        }),
      })
    )
  })
})
