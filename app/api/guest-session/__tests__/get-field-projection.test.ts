/**
 * GET /api/guest-session returned the WHOLE session document to anyone
 * holding guestId+sessionId, including performance_score, feedback, and
 * test_results, which since the score lock are exactly what sign-in is
 * traded for: a guest could paste this URL and read their withheld score
 * without ever creating an account. The response is now projected down to
 * the fields its two consumers (useSessionReopen, useSessionRestore)
 * actually read, and GET sits behind the same write-bucket rate limit PUT
 * already uses.
 */
import { beforeEach, describe, expect, it, vi } from "vitest"

const GUEST_ID = "guest-12345678-1234-1234-1234-123456789abc"
const SESSION_ID = "sess-1"

const state = vi.hoisted(() => {
  const s = {
    docData: null as Record<string, unknown> | null,
    guestApiRateLimit: vi.fn(async (): Promise<unknown> => null),
    docGet: vi.fn(async () => ({
      exists: s.docData !== null,
      data: () => s.docData,
    })),
  }
  return s
})

vi.mock("@/lib/rate-limit", () => ({
  guestSessionRateLimit: vi.fn(async () => null),
  guestApiRateLimit: state.guestApiRateLimit,
}))

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => ({
      doc: () => ({ get: state.docGet }),
    }),
  },
}))

import { GET } from "../route"

function get(sessionId: string, guestId: string) {
  return new Request(
    `http://localhost/api/guest-session?sessionId=${encodeURIComponent(sessionId)}&guestId=${encodeURIComponent(guestId)}`
  ) as never
}

type MockResponse = { status: number; data: Record<string, any> }

beforeEach(() => {
  state.docData = null
  state.guestApiRateLimit.mockReset().mockResolvedValue(null)
  state.docGet.mockClear()
})

describe("GET /api/guest-session field projection", () => {
  it("omits the withheld score fields but keeps what the reopen/restore hooks read", async () => {
    state.docData = {
      user_id: GUEST_ID,
      is_guest: true,
      session_state: { code: "wip", language: "javascript" },
      completed_at: "2026-08-25T12:00:00.000Z",
      feedback_status: "complete",
      performance_score: 97,
      feedback: "Great job, here is the full breakdown of your interview.",
      test_results: [{ passed: true, description: "case 1" }],
    }

    const response = (await GET(get(SESSION_ID, GUEST_ID))) as MockResponse

    expect(response.status).toBe(200)
    expect(response.data.session).not.toHaveProperty("performance_score")
    expect(response.data.session).not.toHaveProperty("feedback")
    expect(response.data.session).not.toHaveProperty("test_results")
    expect(response.data.session.session_state).toEqual({
      code: "wip",
      language: "javascript",
    })
    expect(response.data.session.completed_at).toBe("2026-08-25T12:00:00.000Z")
    expect(response.data.session.feedback_status).toBe("complete")
  })
})

describe("GET /api/guest-session rate limiting", () => {
  it("is gated by the same write-bucket limiter PUT uses", async () => {
    state.docData = { user_id: GUEST_ID, is_guest: true, session_state: null }
    state.guestApiRateLimit.mockResolvedValue({ status: 429, data: { error: "rate limited" } })

    const response = (await GET(get(SESSION_ID, GUEST_ID))) as MockResponse

    expect(state.guestApiRateLimit).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(429)
    expect(state.docGet).not.toHaveBeenCalled()
  })
})
