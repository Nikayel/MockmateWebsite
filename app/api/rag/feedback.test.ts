import { expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"
const mocks = vi.hoisted(() => ({
  record: vi.fn(async () => ({ status: 200 })),
  ceiling: vi.fn(async () => true),
}))
vi.mock("@/lib/rag/actions", () => ({
  handleRecordFeedback: mocks.record,
  handleGetHints: vi.fn(),
  handleGetLearningPath: vi.fn(),
  handleGetNextProblems: vi.fn(),
  handleGetRecommendations: vi.fn(),
  handleGetSimilarProblems: vi.fn(),
  handleGetSimilarSolutions: vi.fn(),
  handleStoreOnboarding: vi.fn(),
  handleStoreSolution: vi.fn(),
}))
vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: async () => ({ authenticated: true, userId: "owner" }),
}))
vi.mock("@/lib/rate-limiting", () => ({
  ragRateLimit: async () => null,
  ragStorageRateLimit: async () => null,
}))
vi.mock("@/lib/global-spend-guard", () => ({ isGlobalCeilingExceeded: mocks.ceiling }))
it("keeps the hint-feedback action authenticated and available during an AI spend pause", async () => {
  const request = new NextRequest("https://app.test/api/rag")
  const generationId = "a136081b-2732-48b4-953b-acf8b2658703"
  request.json = async () => ({
    action: "record-feedback",
    generationId,
    hintId: "hint-one",
    userId: "forged",
    feedbackType: "helpful",
  })
  expect((await POST(request)).status).toBe(200)
  expect(mocks.ceiling).not.toHaveBeenCalled()
  expect(mocks.record).toHaveBeenCalledWith(
    { generationId, responseId: "hint-one", feedbackType: "helpful" },
    "owner"
  )
})
