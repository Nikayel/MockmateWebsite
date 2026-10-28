import { beforeEach, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
import { POST } from "./route"
const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  next: vi.fn(),
  similar: vi.fn(),
  register: vi.fn(),
}))
vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: async () => ({ authenticated: true, userId: "owner" }),
}))
vi.mock("@/lib/rate-limiting", () => ({ hintRateLimit: async () => null }))
vi.mock("@/lib/global-spend-guard", () => ({ isGlobalCeilingExceeded: async () => false }))
vi.mock("@/lib/agents/hints", () => ({ generateHints: mocks.generate, getNextHint: mocks.next }))
vi.mock("@/lib/rag", () => ({
  getSimilarHintsFromRAG: mocks.similar,
  embedAndStoreHint: async () => {},
}))
vi.mock("@/lib/ai-response-feedback/hints", () => ({ registerHintResponses: mocks.register }))
vi.mock("@/lib/rag/utils", () => ({
  validateProblemText: (text: string) => ({ valid: true, sanitized: text }),
  validateUserCode: (text: string) => ({ valid: true, sanitized: text }),
  withTimeout: (operation: Promise<unknown>) => operation,
  TimeoutError: class extends Error {},
}))
const hint = { id: "hint-one", content: "Check the boundary", level: 1, source: "ai" }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.similar.mockResolvedValue([])
  mocks.generate.mockResolvedValue({
    hints: [hint],
    metadata: {},
    struggleLevel: "mild",
    recommendedRevealLevel: 1,
  })
  mocks.next.mockResolvedValue(hint)
  mocks.register.mockImplementation(async (hints, context) =>
    hints.map((entry: object) => ({ ...entry, generationId: context.generationId }))
  )
})
function request(action: string) {
  const req = new NextRequest("https://app.test/api/agents/hints")
  req.json = async () => ({
    action,
    userId: "forged",
    generationId: "forged",
    problemId: "scenario",
    sessionId: "session",
    problemTitle: "Boundary",
    problemText: "Check array bounds",
    previousHintIds: [],
  })
  return req
}
it.each(["generate", "get-next"])(
  "joins %s outputs and provider request to one server-issued identity",
  async (action) => {
    const response = (await POST(request(action))) as unknown as {
      status: number
      data: { hints?: Array<{ generationId: string }>; hint?: { generationId: string } }
    }
    expect(response.status).toBe(200)
    const providerRequest = (action === "generate" ? mocks.generate : mocks.next).mock.calls[0][0]
    expect(providerRequest.generationId).not.toBe("forged")
    expect(providerRequest.userId).toBe("owner")
    expect(providerRequest.sessionId).toBe("session")
    expect(mocks.register).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({
        userId: "owner",
        generationId: providerRequest.generationId,
        sessionId: "session",
        scenarioId: "scenario",
      })
    )
    expect((response.data.hint ?? response.data.hints?.[0])?.generationId).toBe(
      providerRequest.generationId
    )
  }
)
it("also registers a retrieved get-next hint, with no model call", async () => {
  mocks.similar.mockResolvedValue([
    { id: "stored", problemTitle: "Other task", content: "Inspect the invariant", similarity: 0.9 },
  ])
  const response = (await POST(request("get-next"))) as unknown as {
    data: { hint: { generationId: string; id: string } }
  }
  expect(response.data.hint.id).toBe("rag_stored")
  expect(response.data.hint.generationId).toMatch(/^[a-f0-9-]{36}$/)
  expect(mocks.next).not.toHaveBeenCalled()
  expect(mocks.register).toHaveBeenCalledOnce()
})
