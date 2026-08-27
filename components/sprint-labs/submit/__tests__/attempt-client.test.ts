/**
 * @vitest-environment jsdom
 *
 * The session cache and board-walk halves of attempt-client.ts (the pure, no-network parts).
 * `openAttempt`/`completeAttempt`/`reviewAttempt` are exercised indirectly through
 * `useSubmitScreenController`'s behavior; this file covers the cache and the board walk directly.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mockMove = vi.hoisted(() => vi.fn())
vi.mock("@/lib/sprint-labs/runs-client", () => ({ moveSprintLabRunTicket: mockMove }))

const mockGetCurrentUserToken = vi.hoisted(() => vi.fn())
vi.mock("@/lib/firebase-lazy", () => ({ getCurrentUserToken: mockGetCurrentUserToken }))

import {
  cacheCompletedOutcome,
  ensureBoardAtLeast,
  fetchFinalizedAttempt,
  getCachedCompletedOutcome,
  type CachedAttempt,
} from "../attempt-client"

const CACHED: CachedAttempt = {
  attemptId: "attempt-1",
  outcome: {
    attempt: {
      ticketKey: "MER-305",
      aiPolicy: "assisted",
      variantId: "v1",
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
  },
}

afterEach(() => {
  window.sessionStorage.clear()
  vi.clearAllMocks()
})

describe("attempt-client session cache", () => {
  it("round-trips a completed outcome (with its attemptId) scoped by (runId, ticketKey)", () => {
    expect(getCachedCompletedOutcome("run1", "MER-305")).toBeNull()
    cacheCompletedOutcome("run1", "MER-305", CACHED)
    expect(getCachedCompletedOutcome("run1", "MER-305")).toEqual(CACHED)
  })

  it("scopes the cache per run — a different runId is a miss even for the same ticket", () => {
    cacheCompletedOutcome("run1", "MER-305", CACHED)
    expect(getCachedCompletedOutcome("run2", "MER-305")).toBeNull()
  })

  it("is write-once once finalized — a later practice (non-finalized) outcome never overwrites it", () => {
    cacheCompletedOutcome("run1", "MER-305", CACHED)
    const practiceRun: CachedAttempt = {
      attemptId: "attempt-2",
      outcome: {
        ...CACHED.outcome,
        attempt: { ...CACHED.outcome.attempt, finalized: false, escapedDefects: ["something new"] },
      },
    }
    cacheCompletedOutcome("run1", "MER-305", practiceRun)
    expect(getCachedCompletedOutcome("run1", "MER-305")).toEqual(CACHED)
  })

  it("still writes normally before anything is finalized", () => {
    const first: CachedAttempt = {
      attemptId: "attempt-1",
      outcome: { ...CACHED.outcome, attempt: { ...CACHED.outcome.attempt, finalized: false } },
    }
    cacheCompletedOutcome("run1", "MER-305", first)
    expect(getCachedCompletedOutcome("run1", "MER-305")).toEqual(first)
  })
})

describe("ensureBoardAtLeast", () => {
  beforeEach(() => {
    mockMove.mockImplementation(async ({ ticketKey, to }: { ticketKey: string; to: string }) => ({
      id: "run1",
      board: { [ticketKey]: to },
    }))
  })

  it("walks todo -> doing -> review one legal step at a time", async () => {
    const result = await ensureBoardAtLeast("run1", "todo", "MER-305", "review")
    expect(result).toBe("review")
    expect(mockMove).toHaveBeenNthCalledWith(1, {
      runId: "run1",
      ticketKey: "MER-305",
      to: "doing",
    })
    expect(mockMove).toHaveBeenNthCalledWith(2, {
      runId: "run1",
      ticketKey: "MER-305",
      to: "review",
    })
  })

  it("does nothing when already at or past the target", async () => {
    const result = await ensureBoardAtLeast("run1", "review", "MER-305", "review")
    expect(result).toBe("review")
    expect(mockMove).not.toHaveBeenCalled()
  })

  it("stops and returns the furthest reached status when a step fails", async () => {
    mockMove
      .mockResolvedValueOnce({ id: "run1", board: { "MER-305": "doing" } })
      .mockResolvedValueOnce(null)
    const result = await ensureBoardAtLeast("run1", "todo", "MER-305", "done")
    expect(result).toBe("doing")
    expect(mockMove).toHaveBeenCalledTimes(2)
  })
})

describe("fetchFinalizedAttempt", () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    mockGetCurrentUserToken.mockResolvedValue("a-token")
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it("short-circuits on a session-cache hit, never calling fetch", async () => {
    cacheCompletedOutcome("run1", "MER-305", CACHED)
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    const result = await fetchFinalizedAttempt("run1", "MER-305")

    expect(result).toEqual(CACHED)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("calls the ticket-keyed GET on a cache miss and caches a hit for next time", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ attemptId: "attempt-9", outcome: CACHED.outcome }),
    })
    global.fetch = fetchSpy as unknown as typeof fetch

    const result = await fetchFinalizedAttempt("run1", "MER-305")

    expect(result).toEqual({ attemptId: "attempt-9", outcome: CACHED.outcome })
    const [url] = fetchSpy.mock.calls[0]
    expect(url).toBe("/api/sprint-labs/attempts/MER-305?runId=run1")
    // Second read is now a cache hit -- no second network call.
    fetchSpy.mockClear()
    const second = await fetchFinalizedAttempt("run1", "MER-305")
    expect(second).toEqual({ attemptId: "attempt-9", outcome: CACHED.outcome })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("returns null on a 404 (nothing finalized yet) without throwing", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }) as unknown as typeof fetch

    const result = await fetchFinalizedAttempt("run1", "MER-305")
    expect(result).toBeNull()
  })

  it("returns null (never throws) on a network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down")) as unknown as typeof fetch

    const result = await fetchFinalizedAttempt("run1", "MER-305")
    expect(result).toBeNull()
  })

  it("returns null when signed out (no token), never calling fetch", async () => {
    mockGetCurrentUserToken.mockResolvedValue(null)
    const fetchSpy = vi.fn()
    global.fetch = fetchSpy as unknown as typeof fetch

    const result = await fetchFinalizedAttempt("run1", "MER-305")
    expect(result).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
