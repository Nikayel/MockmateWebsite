import type { NextRequest } from "next/server"
import { beforeEach, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn(), limit: vi.fn(), record: vi.fn() }))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.auth }))
vi.mock("@/lib/rate-limiting", () => ({ enforceRateLimitPolicy: mocks.limit }))
vi.mock("@/lib/agents/recommendations/decision-interactions.server", () => ({
  recordRecommendationInteraction: mocks.record,
}))
import { POST } from "./route"
const body = { decisionId: "a".repeat(64), stage: "viewed", returnSource: "feedback" }
const request = (input: unknown = body) => ({ json: async () => input }) as NextRequest
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ authenticated: true, userId: "verified-owner" })
  mocks.limit.mockResolvedValue(null)
  mocks.record.mockResolvedValue(true)
})
it("authenticates before writing and uses the verified owner", async () => {
  expect((await POST(request())).status).toBe(200)
  expect(mocks.record).toHaveBeenCalledWith("verified-owner", body)
  mocks.auth.mockResolvedValue({ authenticated: false })
  mocks.record.mockClear()
  expect((await POST(request())).status).toBe(401)
  expect(mocks.record).not.toHaveBeenCalled()
})
it.each([
  { ...body, stage: "started" },
  { ...body, decisionId: "../foreign" },
  { ...body, userId: "forged-owner" },
])("rejects untrusted contract %j", async (input) => {
  expect((await POST(request(input))).status).toBe(400)
  expect(mocks.record).not.toHaveBeenCalled()
})
it("keeps foreign and missing decisions indistinguishable and reports outages honestly", async () => {
  mocks.record.mockResolvedValue(false)
  expect((await POST(request())).status).toBe(404)
  mocks.record.mockRejectedValue(new Error("offline"))
  expect((await POST(request())).status).toBe(503)
})
it("honors rate limiting", async () => {
  mocks.limit.mockResolvedValue({ status: 429 })
  expect((await POST(request())).status).toBe(429)
  expect(mocks.record).not.toHaveBeenCalled()
})
