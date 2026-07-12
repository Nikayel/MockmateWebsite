import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  apiRateLimit: vi.fn(),
  verifyIdToken: vi.fn(),
  trackVoiceUsage: vi.fn(),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/rate-limit", () => ({
  apiRateLimit: mocks.apiRateLimit,
}))

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken: mocks.verifyIdToken }),
}))

// Side-effect import in the route; keep it inert in tests.
vi.mock("@/lib/firebase-admin", () => ({}))

vi.mock("@/lib/usage-tracking", () => ({
  trackVoiceUsage: mocks.trackVoiceUsage,
  DEEPGRAM_COSTS: {
    "nova-2": 0.0043,
    nova: 0.0041,
    enhanced: 0.0145,
    base: 0.0125,
  },
}))

vi.mock("@/lib/logger", () => ({
  logger: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  },
}))

function createRequest(body: unknown, authHeader: string | null = "Bearer valid-token"): NextRequest {
  return {
    headers: {
      get: (name: string) => (name === "Authorization" ? authHeader : null),
    },
    json: () => Promise.resolve(body),
  } as unknown as NextRequest
}

const validBody = {
  sessionId: "session-1",
  durationSeconds: 120,
  model: "nova-2",
  transcriptLength: 42,
}

describe("/api/usage/voice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.apiRateLimit.mockResolvedValue(null) // allowed
    mocks.verifyIdToken.mockResolvedValue({ uid: "user-1" })
    mocks.trackVoiceUsage.mockResolvedValue(undefined)
  })

  it("tracks usage for a valid in-range payload", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest(validBody))

    expect(response.status).toBe(200)
    expect(mocks.trackVoiceUsage).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", durationSeconds: 120, model: "nova-2" })
    )
  })

  it("rejects durationSeconds above the 3600s ceiling without tracking", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest({ ...validBody, durationSeconds: 5000 }))

    expect(response.status).toBe(400)
    expect(mocks.trackVoiceUsage).not.toHaveBeenCalled()
  })

  it("rejects non-positive durationSeconds without tracking", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest({ ...validBody, durationSeconds: 0 }))

    expect(response.status).toBe(400)
    expect(mocks.trackVoiceUsage).not.toHaveBeenCalled()
  })

  it("rejects a model outside the Deepgram cost whitelist", async () => {
    const { POST } = await import("./route")

    const response = await POST(createRequest({ ...validBody, model: "gpt-voice" }))

    expect(response.status).toBe(400)
    expect(mocks.trackVoiceUsage).not.toHaveBeenCalled()
  })

  it("short-circuits when the rate limiter blocks the request", async () => {
    const blocked = { status: 429 } as unknown as ReturnType<typeof mocks.apiRateLimit>
    mocks.apiRateLimit.mockResolvedValue(blocked)
    const { POST } = await import("./route")

    const response = await POST(createRequest(validBody))

    expect(response).toBe(blocked)
    expect(mocks.verifyIdToken).not.toHaveBeenCalled()
    expect(mocks.trackVoiceUsage).not.toHaveBeenCalled()
  })
})
