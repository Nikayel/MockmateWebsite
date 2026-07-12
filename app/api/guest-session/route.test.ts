import { afterEach, describe, expect, it, vi } from "vitest"

// A guestId that satisfies isValidGuestId's UUID-shaped regex.
const VALID_GUEST_ID = "guest-12345678-1234-1234-1234-123456789abc"
const SESSION_ID = "session-abc"

const docGet = vi.fn()
const docUpdate = vi.fn()

/**
 * Import the route with the Admin SDK, logger, and rate limiter mocked so the
 * ownership check passes and the handler reaches (or is stopped before) the
 * Firestore write. Mirrors the harness in guest-session-cleanup/route.test.ts.
 */
async function importRoute() {
  vi.resetModules()

  docGet.mockReset().mockResolvedValue({
    exists: true,
    data: () => ({ user_id: VALID_GUEST_ID, is_guest: true }),
  })
  docUpdate.mockReset().mockResolvedValue(undefined)

  vi.doMock("@/lib/firebase-admin", () => ({
    adminDb: {
      collection: vi.fn(() => ({
        doc: vi.fn(() => ({ get: docGet, update: docUpdate })),
      })),
    },
  }))
  vi.doMock("@/lib/logger", () => ({
    logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  }))
  vi.doMock("@/lib/rate-limit", () => ({
    guestSessionRateLimit: vi.fn(() => Promise.resolve(null)),
  }))

  return import("./route")
}

function put(body: unknown) {
  return new Request("http://localhost/api/guest-session", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never
}

type MockResponse = { status: number; data: Record<string, unknown> }

describe("PUT /api/guest-session validation (API-3)", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects a performanceScore above 100 without touching Firestore", async () => {
    const { PUT } = await importRoute()
    const res = (await PUT(
      put({ sessionId: SESSION_ID, guestId: VALID_GUEST_ID, performanceScore: 150 })
    )) as MockResponse
    expect(res.status).toBe(400)
    expect(res.data.error).toBe("Validation failed")
    expect(docGet).not.toHaveBeenCalled()
    expect(docUpdate).not.toHaveBeenCalled()
  })

  it("rejects a negative efficiencyScore", async () => {
    const { PUT } = await importRoute()
    const res = (await PUT(
      put({ sessionId: SESSION_ID, guestId: VALID_GUEST_ID, efficiencyScore: -1 })
    )) as MockResponse
    expect(res.status).toBe(400)
    expect(docUpdate).not.toHaveBeenCalled()
  })

  it("rejects an oversized finalCode payload", async () => {
    const { PUT } = await importRoute()
    const res = (await PUT(
      put({ sessionId: SESSION_ID, guestId: VALID_GUEST_ID, finalCode: "x".repeat(50001) })
    )) as MockResponse
    expect(res.status).toBe(400)
    expect(docUpdate).not.toHaveBeenCalled()
  })

  it("rejects too many test results", async () => {
    const { PUT } = await importRoute()
    const testResults = Array.from({ length: 101 }, () => ({ passed: true }))
    const res = (await PUT(
      put({ sessionId: SESSION_ID, guestId: VALID_GUEST_ID, testResults })
    )) as MockResponse
    expect(res.status).toBe(400)
    expect(docUpdate).not.toHaveBeenCalled()
  })

  it("accepts an in-range completion and preserves full test-result fields", async () => {
    const { PUT } = await importRoute()
    const res = (await PUT(
      put({
        sessionId: SESSION_ID,
        guestId: VALID_GUEST_ID,
        performanceScore: 85,
        efficiencyScore: 90,
        feedback: "Great job",
        finalCode: "function solve() {}",
        language: "javascript",
        testResults: [
          {
            description: "case 1",
            passed: true,
            input: [1, 2],
            expected: 3,
            actual: 3,
            error: null,
          },
          {
            description: "case 2",
            passed: false,
            input: [4, 5],
            expected: 9,
            actual: 8,
            error: "wrong",
          },
        ],
      })
    )) as MockResponse

    expect(res.status).toBe(200)
    expect(docUpdate).toHaveBeenCalledTimes(1)
    const written = docUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(written.performance_score).toBe(85)
    expect(written.efficiency_score).toBe(90)
    expect(written.tests_passed).toBe(1)
    expect(written.tests_total).toBe(2)
    // passthrough must keep input/error so the review panel can re-render them
    const storedResults = written.test_results as Array<Record<string, unknown>>
    expect(storedResults[1]).toMatchObject({ input: [4, 5], error: "wrong" })
  })

  it("accepts a resume-only partial update (sessionState only) so merges still work", async () => {
    const { PUT } = await importRoute()
    const res = (await PUT(
      put({
        sessionId: SESSION_ID,
        guestId: VALID_GUEST_ID,
        sessionState: { code: "wip", language: "python", elapsedTime: 42 },
      })
    )) as MockResponse

    expect(res.status).toBe(200)
    expect(docUpdate).toHaveBeenCalledTimes(1)
    const written = docUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(written.session_state).toMatchObject({ code: "wip", language: "python" })
    expect(written.performance_score).toBeUndefined()
    expect(written.completed_at).toBeUndefined()
  })
})
