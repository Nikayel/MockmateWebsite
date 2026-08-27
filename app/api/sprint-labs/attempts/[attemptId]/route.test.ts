/**
 * Route-level tests for GET /api/sprint-labs/attempts/[attemptId] (the finalized attempt, keyed by
 * ticket key — see route.ts's own header for the naming note). Same mock style as the sibling
 * `../route.test.ts`/`../complete/route.test.ts`: everything mocked except the real
 * `requireTierForSprint` (its dependency `requireTierForUser` is mocked).
 *
 * The "never leak referenceDiff/correct pre-finalization" invariant itself is unit-tested directly
 * and exhaustively against the pure gate in
 * `lib/sprint-labs/grading/__tests__/finalized-attempt-projection.test.ts` (no Firestore, no
 * mocked service) — testing it again here with the SERVICE mocked would only prove "the route
 * relays whatever the mock returns," which is a different, narrower claim. What these tests cover
 * instead: auth/flag/tier gating, the ownership/not-found error mapping this route shares with its
 * siblings, the 404-when-nothing-finalized-yet contract, and that a successful response is exactly
 * what the (mocked) service returned — no route-level enrichment or stripping.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NextRequest } from "next/server"

const mocks = vi.hoisted(() => ({
  verifyAuth: vi.fn(),
  getFlagAsync: vi.fn(),
  apiRateLimit: vi.fn(),
  requireTierForUser: vi.fn(),
  loggerError: vi.fn(),
  getSprintLabRun: vi.fn(),
  getFinalizedSprintLabAttempt: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({ verifyAuth: mocks.verifyAuth }))
vi.mock("@/lib/feature-flags", () => ({ getFlagAsync: mocks.getFlagAsync }))
vi.mock("@/lib/rate-limit", () => ({ apiRateLimit: mocks.apiRateLimit }))
vi.mock("@/lib/quota-enforcement", () => ({ requireTierForUser: mocks.requireTierForUser }))
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.loggerError } }))
vi.mock("@/lib/sprint-labs/runs", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/sprint-labs/runs")>("@/lib/sprint-labs/runs")
  return { ...actual, getSprintLabRun: mocks.getSprintLabRun }
})

vi.mock("@/lib/sprint-labs/grading/attempts-service", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sprint-labs/grading/attempts-service")>(
    "@/lib/sprint-labs/grading/attempts-service"
  )
  return { ...actual, getFinalizedSprintLabAttempt: mocks.getFinalizedSprintLabAttempt }
})

function createRequest(url: string): NextRequest {
  return {
    url,
    headers: { get: (name: string) => (name === "Authorization" ? "Bearer valid-token" : null) },
  } as unknown as NextRequest
}

type StubResponse = { status: number; data?: Record<string, unknown> }

const USER = "user-1"
const URL = "https://example.com/api/sprint-labs/attempts/MER-201?runId=run1"
const PARAMS = { params: Promise.resolve({ attemptId: "MER-201" }) }

const FULL_RESULT = {
  attemptId: "a1",
  outcome: {
    attempt: {
      ticketKey: "MER-201",
      aiPolicy: "unassisted",
      variantId: "v0",
      finalized: true,
      gateResults: [],
      escapedDefects: [],
      scores: {
        understanding: 80,
        problemSolving: 80,
        codeQuality: 80,
        communication: null,
        verification: 80,
        overall: 80,
      },
      submittedAt: "2026-01-01T00:00:00.000Z",
    },
    submissionsRemaining: 4,
    referenceDiff: "diff --git a/x b/x",
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.verifyAuth.mockResolvedValue({ authenticated: true, userId: USER })
  mocks.getFlagAsync.mockResolvedValue(true)
  mocks.apiRateLimit.mockResolvedValue(null)
  mocks.requireTierForUser.mockResolvedValue({ allowed: true })
  mocks.getSprintLabRun.mockResolvedValue(null)
})

describe("GET /api/sprint-labs/attempts/[attemptId]", () => {
  it("returns 401 when unauthenticated", async () => {
    mocks.verifyAuth.mockResolvedValue({ authenticated: false })
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(401)
    expect(mocks.getFinalizedSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("returns 404 (not 403) when the flag is off — an unlaunched surface reads as absent", async () => {
    mocks.getFlagAsync.mockResolvedValue(false)
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(404)
  })

  it("is rate limited before auth even runs", async () => {
    mocks.apiRateLimit.mockResolvedValue({ status: 429, data: { error: "Too many requests" } })
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(429)
    expect(mocks.verifyAuth).not.toHaveBeenCalled()
  })

  it("returns 400 when runId is missing", async () => {
    const { GET } = await import("./route")
    const response = (await GET(
      createRequest("https://example.com/api/sprint-labs/attempts/MER-201"),
      PARAMS
    )) as unknown as StubResponse
    expect(response.status).toBe(400)
    expect(mocks.getFinalizedSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("gates on Pro when the resolved run is already at sprint >= 2", async () => {
    mocks.getSprintLabRun.mockResolvedValue({ id: "run1", currentSprint: 3, userId: USER })
    mocks.requireTierForUser.mockResolvedValue({
      allowed: false,
      response: { status: 403, data: { error: "Pro feature required" } },
    })
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(403)
    expect(mocks.getFinalizedSprintLabAttempt).not.toHaveBeenCalled()
  })

  it("returns 404 when no finalized attempt exists yet for this ticket", async () => {
    mocks.getFinalizedSprintLabAttempt.mockResolvedValue(null)
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(404)
  })

  it("delegates to the service (runId, ticketKey from the path segment) and relays its result verbatim on success", async () => {
    mocks.getFinalizedSprintLabAttempt.mockResolvedValue(FULL_RESULT)
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(200)
    expect(response.data).toEqual(FULL_RESULT)
    expect(mocks.getFinalizedSprintLabAttempt).toHaveBeenCalledWith(USER, {
      runId: "run1",
      ticketKey: "MER-201",
    })
  })

  it("never adds referenceDiff/reviewCorrectness the service itself withheld", async () => {
    mocks.getFinalizedSprintLabAttempt.mockResolvedValue({
      attemptId: "a1",
      outcome: {
        attempt: { ...FULL_RESULT.outcome.attempt, finalized: false },
        submissionsRemaining: 4,
      },
    })
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(200)
    expect(response.data?.outcome).not.toHaveProperty("referenceDiff")
    expect(response.data).not.toHaveProperty("reviewCorrectness")
  })

  it("maps an UNKNOWN_TICKET service error to 400", async () => {
    mocks.getFinalizedSprintLabAttempt.mockRejectedValue(new Error("UNKNOWN_TICKET"))
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(400)
  })

  it("maps a run-ownership error from requireOwnedActiveRun (runs.ts's own vocabulary) to 403, not a bare 500", async () => {
    mocks.getFinalizedSprintLabAttempt.mockRejectedValue(new Error("UNAUTHORIZED"))
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(403)
    expect(mocks.loggerError).not.toHaveBeenCalled()
  })

  it("maps a NOT_FOUND run-ownership error to 404", async () => {
    mocks.getFinalizedSprintLabAttempt.mockRejectedValue(new Error("NOT_FOUND"))
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(404)
  })

  it("maps an unrecognized error to a logged 500", async () => {
    mocks.getFinalizedSprintLabAttempt.mockRejectedValue(new Error("boom"))
    const { GET } = await import("./route")
    const response = (await GET(createRequest(URL), PARAMS)) as unknown as StubResponse
    expect(response.status).toBe(500)
    expect(mocks.loggerError).toHaveBeenCalledTimes(1)
  })
})
