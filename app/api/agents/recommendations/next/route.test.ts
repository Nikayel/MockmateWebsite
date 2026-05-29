import { beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "./route"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  getNextProblemRecommendation: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: mocks.verifyAuth,
}))

vi.mock("@/lib/agents/recommendations", () => ({
  getNextProblemRecommendation: mocks.getNextProblemRecommendation,
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}))

function createRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
  } as NextRequest
}

describe("next recommendation route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "auth-user" })
    mocks.getNextProblemRecommendation.mockResolvedValue({
      id: "valid-palindrome",
      title: "Valid Palindrome",
      pattern: "two-pointers",
      difficulty: "easy",
    })
  })

  it("requires authentication", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })

    const response = await POST(createRequest({}))

    expect(response.status).toBe(401)
    expect(response.data).toEqual({ error: "Authentication required" })
  })

  it("validates the required next-problem fields", async () => {
    const response = await POST(
      createRequest({
        currentProblemId: "two-sum-ii",
        currentPattern: "two-pointers",
        catalog: [],
      })
    )

    expect(response.status).toBe(400)
    expect(response.data).toEqual({
      error: "currentProblemId, currentPattern, and wasSuccessful are required",
    })
  })

  it("uses the authenticated user id when requesting the next recommendation", async () => {
    const catalog = [
      {
        id: "valid-palindrome",
        title: "Valid Palindrome",
        pattern: "two-pointers",
        difficulty: "easy",
      },
    ]

    const response = await POST(
      createRequest({
        userId: "spoofed-user",
        currentProblemId: "two-sum-ii",
        currentPattern: "two-pointers",
        wasSuccessful: false,
        catalog,
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.getNextProblemRecommendation).toHaveBeenCalledWith(
      "auth-user",
      "two-sum-ii",
      "two-pointers",
      false,
      catalog
    )
    expect(response.data).toEqual({
      recommendation: {
        id: "valid-palindrome",
        title: "Valid Palindrome",
        pattern: "two-pointers",
        difficulty: "easy",
      },
      message: "Keep practicing! Here's a similar problem to reinforce your skills.",
    })
  })
})
