// @vitest-environment jsdom
import type { ReactNode } from "react"
import { cleanup, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  push: vi.fn(),
  fetch: vi.fn(),
  flow: vi.fn(),
  purchase: vi.fn(),
  params: new URLSearchParams(),
}))
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, push: mocks.push }),
  useSearchParams: () => mocks.params,
}))
vi.mock("@/lib/auth-context", () => {
  const firebaseUser = { uid: "owner", getIdToken: async () => "test-token" }
  const user = { id: "owner" }
  return { useAuth: () => ({ user, firebaseUser, loading: false, initialized: true }) }
})
vi.mock("@/lib/firestore-helpers", () => ({
  getUserProfile: async () => ({ subscription_tier: "free" }),
}))
vi.mock("@/lib/analytics", () => ({ trackUpgradeFlow: mocks.flow, trackPurchase: mocks.purchase }))
vi.mock("@/lib/metrics/funnel-client", () => ({ reportFunnelEvent: vi.fn() }))
vi.mock("@/components/header", () => ({ Header: () => null }))
vi.mock("@/components/footer", () => ({ Footer: () => null }))
vi.mock("@/components/error-boundary", () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }))

import UpgradePage from "./page"

beforeEach(() => {
  vi.clearAllMocks()
  mocks.params = new URLSearchParams()
  mocks.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ profile: { subscription_tier: "pro", subscription_type: "monthly" } }),
  })
  vi.stubGlobal("fetch", mocks.fetch)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("upgrade handoff", () => {
  it("returns a verified roadmap buyer to the saved assessment", async () => {
    mocks.params = new URLSearchParams(
      "success=true&session_id=cs_test&source=roadmap&billing=monthly"
    )
    render(<UpgradePage />)
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/roadmap/new"))
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/api/sync-subscription",
      expect.objectContaining({
        body: JSON.stringify({ userId: "owner", sessionId: "cs_test" }),
      })
    )
    expect(mocks.purchase).toHaveBeenCalledWith(
      expect.objectContaining({ source: "roadmap", value: 25 })
    )
  })
  it("does not resume or report payment from an unverified success URL", async () => {
    mocks.params = new URLSearchParams("success=true&source=roadmap")
    render(<UpgradePage />)
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/account"))
    expect(mocks.purchase).not.toHaveBeenCalled()
  })
  it("keeps canceled monthly checkout on the same source and billing period", async () => {
    mocks.params = new URLSearchParams("canceled=true&source=roadmap&billing=monthly")
    render(<UpgradePage />)
    await waitFor(() =>
      expect(mocks.replace).toHaveBeenCalledWith("/upgrade?source=roadmap&billing=monthly")
    )
    expect(mocks.purchase).not.toHaveBeenCalled()
  })
  it("does not expose arbitrary source text in analytics", async () => {
    mocks.params = new URLSearchParams("source=untrusted-private-answer")
    render(<UpgradePage />)
    await waitFor(() =>
      expect(mocks.flow).toHaveBeenCalledWith({
        userId: "owner",
        step: "view_pricing",
        source: "direct",
      })
    )
  })
})
