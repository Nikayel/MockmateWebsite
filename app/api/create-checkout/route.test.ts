import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
vi.unmock("next/server")

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  limit: vi.fn(),
  profile: vi.fn(),
  create: vi.fn(),
}))
vi.mock("stripe", () => ({
  default: class {
    checkout = { sessions: { create: mocks.create } }
    customers = { retrieve: async () => ({ id: "cus_owner" }) }
  },
}))
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({ doc: () => ({ get: mocks.profile }) }),
  },
}))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.auth }))
vi.mock("@/lib/rate-limiting", () => ({ sensitiveOperationRateLimit: mocks.limit }))
vi.mock("@/lib/site-url", () => ({ getAppBaseUrl: () => "https://www.codesparring.dev" }))

import { POST } from "./route"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("STRIPE_PRICE_ID_WEBSITE", "price_monthly_test")
  vi.stubEnv("STRIPE_PRICE_ID_WEBSITE_YEARLY", "price_yearly_test")
  mocks.auth.mockResolvedValue({ userId: "owner" })
  mocks.limit.mockResolvedValue(null)
  mocks.profile.mockResolvedValue({
    exists: true,
    data: () => ({
      email: "synthetic@example.invalid",
      subscription_tier: "free",
      stripe_customer_id: "cus_owner",
    }),
  })
  mocks.create.mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.com/test-only" })
})

const request = (source: unknown, planType = "monthly") =>
  new NextRequest("https://www.codesparring.dev/api/create-checkout", {
    method: "POST",
    body: JSON.stringify({ platform: "website", source, planType, userId: "injected" }),
  })

describe("checkout origin attribution", () => {
  it.each(["monthly", "yearly"])(
    "keeps %s prices and verified ownership while preserving roadmap entry",
    async (plan) => {
      expect((await POST(request("roadmap", plan))).status).toBe(200)
      const params = mocks.create.mock.calls[0][0]
      expect(params.metadata).toMatchObject({
        userId: "owner",
        upgradeSource: "roadmap",
        planType: plan,
      })
      expect(params.client_reference_id).toBe("owner")
      expect(params.mode).toBe(plan === "monthly" ? "subscription" : "payment")
      expect(params.line_items[0].price).toBe(`price_${plan}_test`)
      expect(params.success_url).toContain("session_id={CHECKOUT_SESSION_ID}")
      for (const path of [params.success_url, params.cancel_url]) {
        const url = new URL(path)
        expect(url.origin).toBe("https://www.codesparring.dev")
        expect(url.searchParams.get("source")).toBe("roadmap")
        expect(url.searchParams.get("billing")).toBe(plan)
      }
    }
  )

  it("does not put arbitrary input into Stripe metadata or return URLs", async () => {
    expect((await POST(request("https://evil.example/private-goals"))).status).toBe(200)
    const params = mocks.create.mock.calls[0][0]
    expect(params.metadata.upgradeSource).toBe("direct")
    expect(params.success_url).not.toContain("evil")
    expect(params.cancel_url).not.toContain("evil")
  })

  it("does no billing work without verified authentication", async () => {
    mocks.auth.mockResolvedValue({ userId: null })
    expect((await POST(request("roadmap"))).status).toBe(401)
    expect(mocks.create).not.toHaveBeenCalled()
    expect(mocks.profile).not.toHaveBeenCalled()
  })
})
