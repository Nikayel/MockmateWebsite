import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

vi.unmock("next/server")
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  stats: vi.fn(),
  record: vi.fn(),
  limit: vi.fn(),
}))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.auth }))
vi.mock("@/lib/referrals", () => ({
  getUserReferralCode: vi.fn(),
  getUserReferralStats: mocks.stats,
  recordReferral: mocks.record,
}))
vi.mock("@/lib/rate-limiting", () => ({ promoCodeRateLimit: mocks.limit }))

import { GET, POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.auth.mockResolvedValue({ authenticated: true, userId: "owner" })
  mocks.limit.mockResolvedValue(null)
  mocks.stats.mockResolvedValue({ referralCode: "OLD-CODE" })
  mocks.record.mockResolvedValue(true)
})

describe("retired user referral API", () => {
  const handlers = [
    ["GET", GET],
    ["POST", POST],
  ] as const
  it.each([GET, POST])("preserves authentication", async (handler) => {
    mocks.auth.mockResolvedValue({ authenticated: false })
    const response = await handler(new NextRequest("https://example.com/api/referral"))
    expect(response.status).toBe(401)
    expect(mocks.stats).not.toHaveBeenCalled()
    expect(mocks.record).not.toHaveBeenCalled()
  })

  it.each(handlers)(
    "%s is unavailable without reading or creating referrals",
    async (method, handler) => {
      const request = new NextRequest("https://example.com/api/referral", {
        method,
        ...(method === "POST" ? { body: JSON.stringify({ referralCode: "OLD-CODE" }) } : {}),
      })
      const response = await handler(request)
      expect(response.status).toBe(410)
      expect(await response.json()).toEqual({
        error: "The referral program is currently unavailable.",
        code: "REFERRAL_PROGRAM_UNAVAILABLE",
      })
      expect(response.headers.get("Cache-Control")).toBe("no-store")
      expect(mocks.stats).not.toHaveBeenCalled()
      expect(mocks.record).not.toHaveBeenCalled()
      expect(mocks.limit).not.toHaveBeenCalled()
    }
  )

  it("does not parse retired signup payloads", async () => {
    const response = await POST(
      new NextRequest("https://example.com/api/referral", { method: "POST", body: "{" })
    )
    expect(response.status).toBe(410)
    expect(mocks.record).not.toHaveBeenCalled()
  })
})
