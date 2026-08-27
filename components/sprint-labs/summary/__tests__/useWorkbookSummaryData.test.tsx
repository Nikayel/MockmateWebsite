/**
 * @vitest-environment jsdom
 */
import { cleanup, renderHook, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  cacheCompletedOutcome,
  type CachedAttempt,
} from "@/components/sprint-labs/submit/attempt-client"

const registry = vi.hoisted(() => ({ getTicket: vi.fn() }))
vi.mock("@/lib/sprint-labs/content/registry", () => registry)

import { useWorkbookSummaryData } from "../useWorkbookSummaryData"

function attempt(overrides: Partial<CachedAttempt["outcome"]["attempt"]> = {}): CachedAttempt {
  return {
    attemptId: "a1",
    outcome: {
      attempt: {
        ticketKey: "MER-303",
        aiPolicy: "unassisted",
        variantId: "v1",
        finalized: true,
        gateResults: [
          {
            gate: "hidden",
            cases: [
              { testId: "h1", humanName: "n1", passed: true },
              { testId: "h2", humanName: "n2", passed: true },
            ],
          },
        ],
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
        modelId: "claude-x-y",
        ...overrides,
      },
      submissionsRemaining: 4,
    },
  }
}

function ticket(key: string, points: number, objectiveIds: string[] = []) {
  return {
    ticket: {
      key,
      title: key,
      points,
      labels: [],
      aiPolicy: "unassisted" as const,
      objectives: objectiveIds.map((id) => ({ id, label: id, canDo: `I can ${id}.` })),
      bodyMd: "body",
      acceptanceCriteria: [],
      adversaryPresent: false,
    },
    setupDiff: null,
    visibleTestFiles: [],
    hiddenTests: [],
  }
}

afterEach(() => {
  cleanup()
  window.sessionStorage.clear()
  vi.clearAllMocks()
})

describe("useWorkbookSummaryData", () => {
  it("is 'empty' when nothing has been finalized this session", async () => {
    const { result } = renderHook(() => useWorkbookSummaryData("meridian", "run1"))
    await waitFor(() => expect(result.current.phase).toBe("empty"))
    expect(result.current.ticketsShipped).toBe(0)
  })

  it("sums points across finalized tickets and derives the graded escaped rate", async () => {
    cacheCompletedOutcome("run1", "MER-303", attempt({ ticketKey: "MER-303" }))
    registry.getTicket.mockResolvedValue(ticket("MER-303", 5, ["obj-1"]))

    const { result } = renderHook(() => useWorkbookSummaryData("meridian", "run1"))
    await waitFor(() => expect(result.current.phase).toBe("ready"))
    expect(result.current.ticketsShipped).toBe(1)
    expect(result.current.pointsShipped).toBe(5)
    expect(result.current.gradedEscapedRatePercent).toBe(0)
    expect(result.current.modelId).toBe("claude-x-y")
  })

  it("splits graded (unassisted/review-only) from assisted, never mixing their escaped rates", async () => {
    cacheCompletedOutcome(
      "run1",
      "MER-303",
      attempt({
        ticketKey: "MER-303",
        aiPolicy: "unassisted",
        gateResults: [
          { gate: "hidden", cases: [{ testId: "h1", humanName: "n1", passed: false }] },
        ],
        escapedDefects: ["n1"],
      })
    )
    cacheCompletedOutcome(
      "run1",
      "MER-304",
      attempt({
        ticketKey: "MER-304",
        aiPolicy: "assisted",
        gateResults: [
          {
            gate: "hidden",
            cases: [
              { testId: "h1", humanName: "n1", passed: false },
              { testId: "h2", humanName: "n2", passed: false },
            ],
          },
        ],
        escapedDefects: ["n1", "n2"],
      })
    )
    registry.getTicket.mockImplementation(async (_wb: string, key: string) => ticket(key, 3))

    const { result } = renderHook(() => useWorkbookSummaryData("meridian", "run1"))
    await waitFor(() => expect(result.current.phase).toBe("ready"))
    expect(result.current.gradedCount).toBe(1)
    expect(result.current.assistedCount).toBe(1)
    // 1 escaped of 1 issued on the GRADED ticket only — the assisted ticket's 2/2 escapes never enter this number.
    expect(result.current.gradedEscapedRatePercent).toBe(100)
  })

  it("keeps a demonstrated objective demonstrated even if touched again on a ticket with escapes", async () => {
    cacheCompletedOutcome(
      "run1",
      "MER-303",
      attempt({
        ticketKey: "MER-303",
        escapedDefects: [],
        gateResults: [{ gate: "hidden", cases: [] }],
      })
    )
    cacheCompletedOutcome(
      "run1",
      "MER-304",
      attempt({
        ticketKey: "MER-304",
        gateResults: [
          { gate: "hidden", cases: [{ testId: "h1", humanName: "n1", passed: false }] },
        ],
        escapedDefects: ["n1"],
      })
    )
    registry.getTicket.mockImplementation(async (_wb: string, key: string) =>
      ticket(key, 3, ["obj-1"])
    )

    const { result } = renderHook(() => useWorkbookSummaryData("meridian", "run1"))
    await waitFor(() => expect(result.current.phase).toBe("ready"))
    expect(result.current.objectives).toHaveLength(1)
    expect(result.current.objectives[0].state).toBe("demonstrated")
  })
})
