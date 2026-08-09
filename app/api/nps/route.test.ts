import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  apiRateLimit: vi.fn(),
  verifyAuth: vi.fn(),
  recordNPSResponse: vi.fn(),
  shouldShowNPSSurvey: vi.fn(),
  sessionCount: { value: 3 },
}))

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: mocks.apiRateLimit,
}))

vi.mock("@/lib/auth-helpers", () => ({
  verifyAuth: mocks.verifyAuth,
}))

vi.mock("@/lib/nps", () => ({
  recordNPSResponse: mocks.recordNPSResponse,
  shouldShowNPSSurvey: mocks.shouldShowNPSSurvey,
}))

// The route only touches Firestore through a count() aggregate (sessions) and a
// single user doc read; both scans were replaced by this bounded shape.
vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: (name: string) =>
      name === "profiles"
        ? {
            doc: () => ({
              get: () => Promise.resolve({ data: () => ({ subscription_tier: "pro" }) }),
            }),
          }
        : {
            where: () => ({
              where: () => ({
                count: () => ({
                  get: () => Promise.resolve({ data: () => ({ count: mocks.sessionCount.value }) }),
                }),
              }),
            }),
          },
  },
}))

function createRequest(body?: unknown): NextRequest {
  return {
    headers: { get: () => null },
    json: () => Promise.resolve(body ?? {}),
  } as unknown as NextRequest
}

// The global vitest setup stubs NextResponse.json as a plain { data, status } object.
type StubResponse = { status: number; data?: Record<string, unknown> }

describe("/api/nps", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiRateLimit.mockResolvedValue(null) // allowed
    mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: "user-1" })
    mocks.shouldShowNPSSurvey.mockResolvedValue(true)
    mocks.recordNPSResponse.mockResolvedValue("nps-doc-1")
    mocks.sessionCount.value = 3
  })

  describe("GET", () => {
    it("returns { shouldShow, completedSessions } from the bounded count aggregate", async () => {
      const { GET } = await import("./route")

      const response = (await GET(createRequest())) as unknown as StubResponse

      expect(response.status).toBe(200)
      expect(response.data).toEqual({ shouldShow: true, completedSessions: 3 })
      expect(mocks.shouldShowNPSSurvey).toHaveBeenCalledWith("user-1", 3)
    })

    it("returns shouldShow false for unauthenticated users", async () => {
      mocks.verifyAuth.mockResolvedValue({ authenticated: false })
      const { GET } = await import("./route")

      const response = (await GET(createRequest())) as unknown as StubResponse

      expect(response.status).toBe(200)
      expect(response.data).toEqual({ shouldShow: false })
    })

    it("short-circuits when the rate limiter blocks the request", async () => {
      const limited = new Response(null, { status: 429 })
      mocks.apiRateLimit.mockResolvedValue(limited)
      const { GET } = await import("./route")

      const response = await GET(createRequest())

      expect(response.status).toBe(429)
      expect(mocks.verifyAuth).not.toHaveBeenCalled()
    })
  })

  describe("POST", () => {
    it("records a valid survey payload (score + optional feedback)", async () => {
      const { POST } = await import("./route")

      const response = (await POST(
        createRequest({ score: 9, feedback: "Great product" })
      )) as unknown as StubResponse

      expect(response.status).toBe(200)
      expect(response.data?.success).toBe(true)
      expect(mocks.recordNPSResponse).toHaveBeenCalledWith({
        userId: "user-1",
        score: 9,
        feedback: "Great product",
        triggerContext: "session_complete",
        sessionCount: 3,
        subscriptionTier: "pro",
      })
    })

    it("accepts a score-only payload (feedback omitted)", async () => {
      const { POST } = await import("./route")

      const response = (await POST(createRequest({ score: 0 }))) as unknown as StubResponse

      expect(response.status).toBe(200)
      expect(mocks.recordNPSResponse).toHaveBeenCalledWith(
        expect.objectContaining({ score: 0, feedback: undefined })
      )
    })

    it("rejects out-of-range scores with 400", async () => {
      const { POST } = await import("./route")

      for (const score of [-1, 11, 9999]) {
        const response = (await POST(createRequest({ score }))) as unknown as StubResponse
        expect(response.status).toBe(400)
        expect(response.data?.error).toBe("Score must be a number between 0 and 10")
      }
      expect(mocks.recordNPSResponse).not.toHaveBeenCalled()
    })

    it("rejects non-numeric scores with 400", async () => {
      const { POST } = await import("./route")

      const response = (await POST(createRequest({ score: "9" }))) as unknown as StubResponse

      expect(response.status).toBe(400)
      expect(mocks.recordNPSResponse).not.toHaveBeenCalled()
    })

    it("rejects oversized feedback with 400", async () => {
      const { POST } = await import("./route")

      const response = (await POST(
        createRequest({ score: 9, feedback: "x".repeat(2001) })
      )) as unknown as StubResponse

      expect(response.status).toBe(400)
      expect(response.data?.error).toBe("Feedback must be at most 2000 characters")
      expect(mocks.recordNPSResponse).not.toHaveBeenCalled()
    })

    it("returns 401 for unauthenticated requests", async () => {
      mocks.verifyAuth.mockResolvedValue({ authenticated: false })
      const { POST } = await import("./route")

      const response = (await POST(createRequest({ score: 9 }))) as unknown as StubResponse

      expect(response.status).toBe(401)
      expect(mocks.recordNPSResponse).not.toHaveBeenCalled()
    })

    it("short-circuits when the rate limiter blocks the request", async () => {
      const limited = new Response(null, { status: 429 })
      mocks.apiRateLimit.mockResolvedValue(limited)
      const { POST } = await import("./route")

      const response = await POST(createRequest({ score: 9 }))

      expect(response.status).toBe(429)
      expect(mocks.verifyAuth).not.toHaveBeenCalled()
    })
  })
})
