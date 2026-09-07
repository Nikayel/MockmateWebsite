import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  enforceQuota: vi.fn(),
  enforceChatRateLimit: vi.fn(),
  enforceAiFeedbackRateLimit: vi.fn(),
}))

vi.mock("@/lib/quota-enforcement", () => ({
  enforceQuota: mocks.enforceQuota,
}))

vi.mock("@/lib/usage/services", () => ({
  SYSTEM_USER_ID: "system",
}))

vi.mock("@/lib/rate-limiting", () => ({
  enforceChatRateLimit: mocks.enforceChatRateLimit,
  enforceAiFeedbackRateLimit: mocks.enforceAiFeedbackRateLimit,
}))

import { enforceMeteredAiRequest } from "./metered-request"

const request = {} as NextRequest

describe("enforceMeteredAiRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.enforceQuota.mockResolvedValue({ allowed: true, userId: "user-1", tier: "free" })
    mocks.enforceChatRateLimit.mockResolvedValue(null)
    mocks.enforceAiFeedbackRateLimit.mockResolvedValue(null)
  })

  it("returns an auth or quota response before charging a request", async () => {
    const response = new Response(null, { status: 401 })
    mocks.enforceQuota.mockResolvedValue({ allowed: false, response })

    await expect(enforceMeteredAiRequest(request, { policy: "chat" })).resolves.toEqual({
      response,
    })
    expect(mocks.enforceChatRateLimit).not.toHaveBeenCalled()
    expect(mocks.enforceAiFeedbackRateLimit).not.toHaveBeenCalled()
  })

  it("charges one tiered chat token per submitted action", async () => {
    mocks.enforceQuota.mockResolvedValue({ allowed: true, userId: "user-1", tier: "pro" })

    await expect(enforceMeteredAiRequest(request, { policy: "chat" })).resolves.toEqual({
      response: null,
      userId: "user-1",
      tier: "pro",
    })
    expect(mocks.enforceChatRateLimit).toHaveBeenCalledOnce()
    expect(mocks.enforceChatRateLimit).toHaveBeenCalledWith("user-1", "pro")
    expect(mocks.enforceAiFeedbackRateLimit).not.toHaveBeenCalled()
  })

  it("uses the feedback policy without consuming a chat token", async () => {
    await enforceMeteredAiRequest(request, { policy: "feedback" })

    expect(mocks.enforceAiFeedbackRateLimit).toHaveBeenCalledOnce()
    expect(mocks.enforceAiFeedbackRateLimit).toHaveBeenCalledWith("user-1")
    expect(mocks.enforceChatRateLimit).not.toHaveBeenCalled()
  })

  it("returns the limiter response and does not proceed", async () => {
    const response = new Response(null, { status: 429 })
    mocks.enforceChatRateLimit.mockResolvedValue(response)

    await expect(enforceMeteredAiRequest(request, { policy: "chat" })).resolves.toEqual({
      response,
    })
  })
})
