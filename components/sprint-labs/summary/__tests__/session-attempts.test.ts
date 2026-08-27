/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  cacheCompletedOutcome,
  type CachedAttempt,
} from "@/components/sprint-labs/submit/attempt-client"
import { isGraded, readSessionAttempts, toEscapedRatePoints } from "../session-attempts"

function attempt(overrides: Partial<CachedAttempt["outcome"]["attempt"]> = {}): CachedAttempt {
  return {
    attemptId: "a1",
    outcome: {
      attempt: {
        ticketKey: overrides.ticketKey ?? "MER-303",
        aiPolicy: "unassisted",
        variantId: "v1",
        finalized: true,
        gateResults: [{ gate: "hidden", cases: [] }],
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
        ...overrides,
      },
      submissionsRemaining: 4,
    },
  }
}

afterEach(() => {
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe("readSessionAttempts", () => {
  it("reads every finalized attempt cached for a run, oldest first", () => {
    cacheCompletedOutcome(
      "run1",
      "MER-304",
      attempt({ ticketKey: "MER-304", submittedAt: "2026-01-02T00:00:00.000Z" })
    )
    cacheCompletedOutcome(
      "run1",
      "MER-303",
      attempt({ ticketKey: "MER-303", submittedAt: "2026-01-01T00:00:00.000Z" })
    )
    const result = readSessionAttempts("run1")
    expect(result.map((a) => a.ticketKey)).toEqual(["MER-303", "MER-304"])
  })

  it("skips a non-finalized (practice-only) cached attempt", () => {
    cacheCompletedOutcome("run1", "MER-303", attempt({ ticketKey: "MER-303", finalized: false }))
    expect(readSessionAttempts("run1")).toEqual([])
  })

  it("scopes strictly to the given run — another run's cached keys are ignored", () => {
    cacheCompletedOutcome("run1", "MER-303", attempt({ ticketKey: "MER-303" }))
    cacheCompletedOutcome("run2", "MER-500", attempt({ ticketKey: "MER-500" }))
    expect(readSessionAttempts("run1").map((a) => a.ticketKey)).toEqual(["MER-303"])
  })

  it("reads the hidden gate's issued-case count as the denominator", () => {
    cacheCompletedOutcome(
      "run1",
      "MER-303",
      attempt({
        ticketKey: "MER-303",
        gateResults: [
          {
            gate: "hidden",
            cases: [
              { testId: "h1", humanName: "n1", passed: false },
              { testId: "h2", humanName: "n2", passed: true },
            ],
          },
        ],
        escapedDefects: ["n1"],
      })
    )
    const [result] = readSessionAttempts("run1")
    expect(result.hiddenTotal).toBe(2)
    expect(result.escapedCount).toBe(1)
  })
})

describe("isGraded", () => {
  it("is graded for unassisted and review-only, not for assisted", () => {
    expect(
      isGraded({
        ticketKey: "x",
        aiPolicy: "unassisted",
        escapedCount: 0,
        hiddenTotal: 0,
        submittedAt: "",
      })
    ).toBe(true)
    expect(
      isGraded({
        ticketKey: "x",
        aiPolicy: "review-only",
        escapedCount: 0,
        hiddenTotal: 0,
        submittedAt: "",
      })
    ).toBe(true)
    expect(
      isGraded({
        ticketKey: "x",
        aiPolicy: "assisted",
        escapedCount: 0,
        hiddenTotal: 0,
        submittedAt: "",
      })
    ).toBe(false)
  })
})

describe("toEscapedRatePoints", () => {
  it("computes a rate only when the hidden gate actually issued cases", () => {
    const points = toEscapedRatePoints([
      { ticketKey: "a", aiPolicy: "unassisted", escapedCount: 1, hiddenTotal: 4, submittedAt: "" },
      { ticketKey: "b", aiPolicy: "assisted", escapedCount: 0, hiddenTotal: 0, submittedAt: "" },
    ])
    expect(points[0]).toEqual({ ticketKey: "a", rate: 0.25, graded: true })
    expect(points[1]).toEqual({ ticketKey: "b", rate: null, graded: false })
  })
})
