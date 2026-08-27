/**
 * @vitest-environment jsdom
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  fetchFinalizedAttempt: vi.fn(),
}))
vi.mock("@/components/sprint-labs/submit/attempt-client", () => mocks)

const registry = vi.hoisted(() => ({ getTicket: vi.fn() }))
vi.mock("@/lib/sprint-labs/content/registry", () => registry)

import { useTicketRetro } from "../useTicketRetro"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const TICKET = {
  ticket: {
    key: "MER-305",
    title: "CX-88431 was extracted and billed twice",
    points: 5,
    labels: [],
    aiPolicy: "assisted" as const,
    objectives: [{ id: "obj-1", label: "Idempotency", canDo: "I can dedupe a retry." }],
    bodyMd: "body",
    acceptanceCriteria: [],
    adversaryPresent: true,
  },
  setupDiff: null,
  visibleTestFiles: [],
  hiddenTests: [],
}

const FINALIZED_CACHED = {
  attemptId: "a1",
  outcome: {
    attempt: {
      ticketKey: "MER-305",
      aiPolicy: "assisted" as const,
      variantId: "v1",
      finalized: true,
      gateResults: [],
      escapedDefects: ["a retry inside the window bills twice"],
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
    referenceDiff: "diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n",
  },
}

describe("useTicketRetro", () => {
  it("is 'not-available' when nothing is cached (never a submission attempt of its own)", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue(null)
    registry.getTicket.mockResolvedValue(TICKET)

    const { result } = renderHook(() =>
      useTicketRetro({ workbookId: "meridian", ticketKey: "MER-305", runId: "run1", board: {} })
    )
    await waitFor(() => expect(result.current.phase).toBe("not-available"))
  })

  it("is 'not-available' when the cached attempt exists but is not finalized (a practice-only cache)", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue({
      ...FINALIZED_CACHED,
      outcome: {
        ...FINALIZED_CACHED.outcome,
        attempt: { ...FINALIZED_CACHED.outcome.attempt, finalized: false },
      },
    })
    registry.getTicket.mockResolvedValue(TICKET)

    const { result } = renderHook(() =>
      useTicketRetro({ workbookId: "meridian", ticketKey: "MER-305", runId: "run1", board: {} })
    )
    await waitFor(() => expect(result.current.phase).toBe("not-available"))
  })

  it("is 'ready' once a finalized outcome is cached and the ticket loads, carrying escaped defects and the reference diff", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue(FINALIZED_CACHED)
    registry.getTicket.mockResolvedValue(TICKET)

    const { result } = renderHook(() =>
      useTicketRetro({ workbookId: "meridian", ticketKey: "MER-305", runId: "run1", board: {} })
    )
    await waitFor(() => expect(result.current.phase).toBe("ready"))
    expect(result.current.cached?.outcome.attempt.escapedDefects).toEqual([
      "a retry inside the window bills twice",
    ])
    expect(result.current.cached?.outcome.referenceDiff).toContain("diff --git")
    expect(result.current.objectiveDeltas).toHaveLength(1)
    expect(result.current.objectiveDeltas[0].after).toBe("practicing") // escaped.length > 0
  })

  it("finds the next not-done ticket on the board, sorted, after the current one", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue(FINALIZED_CACHED)
    registry.getTicket.mockResolvedValue(TICKET)

    const { result } = renderHook(() =>
      useTicketRetro({
        workbookId: "meridian",
        ticketKey: "MER-303",
        runId: "run1",
        board: { "MER-303": "done", "MER-304": "done", "MER-305": "todo" },
      })
    )
    await waitFor(() => expect(result.current.nextTicketKey).toBe("MER-305"))
  })

  it("has no next ticket when every later board entry is already done", async () => {
    mocks.fetchFinalizedAttempt.mockResolvedValue(FINALIZED_CACHED)
    registry.getTicket.mockResolvedValue(TICKET)

    const { result } = renderHook(() =>
      useTicketRetro({
        workbookId: "meridian",
        ticketKey: "MER-303",
        runId: "run1",
        board: { "MER-303": "done", "MER-304": "done" },
      })
    )
    await waitFor(() => expect(result.current.phase).toBe("ready"))
    expect(result.current.nextTicketKey).toBeNull()
  })
})
