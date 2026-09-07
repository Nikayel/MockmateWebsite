import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  apiRateLimit: vi.fn(),
  verifyAuth: vi.fn(),
  hasCompletedLabOnboarding: vi.fn(),
  completeLabOnboarding: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/rate-limiting", () => ({ apiRateLimit: mocks.apiRateLimit }))
vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.verifyAuth }))
vi.mock("@/lib/labs/onboarding/service", () => ({
  hasCompletedLabOnboarding: mocks.hasCompletedLabOnboarding,
  completeLabOnboarding: mocks.completeLabOnboarding,
}))
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.loggerError } }))

import { GET, POST } from "./route"

type StubResponse = { status: number; data?: Record<string, unknown> }

function createRequest(
  options: {
    onboardingId?: string | null
    body?: unknown
    invalidJson?: boolean
  } = {}
): NextRequest {
  return {
    nextUrl: {
      searchParams: new URLSearchParams(
        options.onboardingId === undefined || options.onboardingId === null
          ? undefined
          : { onboardingId: options.onboardingId }
      ),
    },
    json: () =>
      options.invalidJson
        ? Promise.reject(new Error("invalid JSON"))
        : Promise.resolve(options.body),
  } as unknown as NextRequest
}

describe("/api/labs/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiRateLimit.mockResolvedValue(null)
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
  })

  it("returns only the authenticated user's completion state", async () => {
    mocks.hasCompletedLabOnboarding.mockResolvedValue(false)

    const response = (await GET(
      createRequest({ onboardingId: "meridian" })
    )) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(response.data).toEqual({ onboardingId: "meridian", completed: false })
    expect(mocks.hasCompletedLabOnboarding).toHaveBeenCalledWith("user-1", "meridian")
  })

  it("rejects missing or unsafe onboarding identifiers", async () => {
    const missing = (await GET(createRequest())) as unknown as StubResponse
    const unsafe = (await GET(
      createRequest({ onboardingId: "../profiles/another-user" })
    )) as unknown as StubResponse

    expect(missing.status).toBe(400)
    expect(unsafe.status).toBe(400)
    expect(mocks.hasCompletedLabOnboarding).not.toHaveBeenCalled()
  })

  it("records completion for the authenticated user, never a user supplied by the client", async () => {
    mocks.completeLabOnboarding.mockResolvedValue({
      onboardingId: "meridian",
      version: "lab-onboarding-v1",
      completedAt: "2026-09-07T12:00:00.000Z",
    })

    const response = (await POST(
      createRequest({ body: { onboardingId: "meridian", userId: "another-user" } })
    )) as unknown as StubResponse

    expect(response.status).toBe(200)
    expect(mocks.completeLabOnboarding).toHaveBeenCalledWith("user-1", "meridian")
  })

  it("rejects unauthenticated requests before querying or writing Firestore", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false, error: "Missing token" })

    const response = (await POST(
      createRequest({ body: { onboardingId: "meridian" } })
    )) as unknown as StubResponse

    expect(response.status).toBe(401)
    expect(mocks.completeLabOnboarding).not.toHaveBeenCalled()
  })

  it("returns 500 when the completion write fails", async () => {
    mocks.completeLabOnboarding.mockRejectedValue(new Error("Firestore unavailable"))

    const response = (await POST(
      createRequest({ body: { onboardingId: "meridian" } })
    )) as unknown as StubResponse

    expect(response.status).toBe(500)
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})
