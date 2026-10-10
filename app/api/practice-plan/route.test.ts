import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"
vi.unmock("next/server")
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  limit: vi.fn(),
  save: vi.fn(),
  read: vi.fn(),
  remove: vi.fn(),
}))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.auth }))
vi.mock("@/lib/rate-limiting", () => ({ enforceRateLimitPolicy: mocks.limit }))
vi.mock("@/lib/practice-plan/service", () => ({
  savePracticePlan: mocks.save,
  getSavedPractice: mocks.read,
  removePracticePlan: mocks.remove,
}))
import { GET, POST, DELETE } from "./route"
import { PracticePlanError } from "@/lib/practice-plan/schema"
const request = (body?: unknown) =>
  new NextRequest(
    "https://example.com/api/practice-plan",
    body
      ? {
          method: "POST",
          body: JSON.stringify(body),
          headers: { "Content-Type": "application/json" },
        }
      : undefined
  )
const valid = { sourceSessionId: "source", scenarioId: "next", reminderAt: null, timezone: "UTC" }
beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ authenticated: true, userId: "owner" })
  mocks.limit.mockResolvedValue(null)
  mocks.save.mockResolvedValue({ status: "ready" })
  mocks.read.mockResolvedValue({ status: "empty" })
})
describe("practice plan API", () => {
  it.each([GET, POST, DELETE])("authenticates before accessing plans", async (handler) => {
    mocks.auth.mockResolvedValue({ authenticated: false })
    const response = await handler(request(valid))
    expect(response.status).toBe(401)
    expect(response.headers.get("Cache-Control")).toContain("no-store")
    expect(mocks.limit).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it("uses verified identity for writes", async () => {
    expect((await POST(request(valid))).status).toBe(200)
    expect(mocks.save).toHaveBeenCalledWith("owner", valid)
  })
  it("rejects injected identity and malformed JSON", async () => {
    expect((await POST(request({ ...valid, userId: "other" }))).status).toBe(400)
    expect(
      (
        await POST(
          new NextRequest("https://example.com/api/practice-plan", { method: "POST", body: "{" })
        )
      ).status
    ).toBe(400)
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it("honors rate limits without saving", async () => {
    mocks.limit.mockResolvedValue(NextResponse.json({}, { status: 429 }))
    expect((await POST(request(valid))).status).toBe(429)
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it("keeps conflicts actionable and unexpected failures private", async () => {
    mocks.save.mockRejectedValue(new PracticePlanError("Refresh this card"))
    expect((await POST(request(valid))).status).toBe(409)
    mocks.save.mockRejectedValue(new Error("private database credentials"))
    const response = await POST(request(valid))
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain("credentials")
  })
  it("requires the current revision to remove a saved task", async () => {
    const revision = "11111111-1111-4111-8111-111111111111"
    expect((await DELETE(request({ revision }))).status).toBe(200)
    expect(mocks.remove).toHaveBeenCalledWith("owner", revision)
    expect((await DELETE(request({ revision: "invalid" }))).status).toBe(400)
  })
})
