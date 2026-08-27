/**
 * Tests for the Sprint Lab -> spaced-repetition mastery mapping
 * (docs/sprint-labs/PLAN.md Task 8, mirroring lib/labs/case-lab-mastery.ts).
 *
 * `buildSprintLabMasterySession`/`difficultyForPoints` are pure and tested
 * directly, matching lib/labs/__tests__/case-lab-mastery.test.ts's own
 * scope. `recordSprintLabMastery` additionally gets a mocked-dependency test
 * because its ai_policy/finalized GATING is the metric-integrity rule this
 * task cares most about (WORKBOOK-SPEC.md §5 rule 1): only unassisted and
 * review-only, and only once finalized, may ever reach mastery.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TicketAttempt, TicketPublic } from "../types"

const mocks = vi.hoisted(() => ({
  completeSessionWithMastery: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("@/lib/learning-state", () => ({
  completeSessionWithMastery: mocks.completeSessionWithMastery,
}))
vi.mock("@/lib/logger", () => ({ logger: { error: mocks.loggerError } }))

import {
  buildSprintLabMasterySession,
  difficultyForPoints,
  recordSprintLabMastery,
} from "../mastery"

function ticket(overrides: Partial<TicketPublic> = {}): TicketPublic {
  return {
    key: "MER-201",
    title: "Reconciliation is out by $412.19",
    points: 5,
    labels: ["money"],
    aiPolicy: "unassisted",
    objectives: [],
    bodyMd: "body",
    acceptanceCriteria: [],
    adversaryPresent: false,
    ...overrides,
  }
}

function attempt(overrides: Partial<TicketAttempt> = {}): TicketAttempt {
  return {
    ticketKey: "MER-201",
    aiPolicy: "unassisted",
    variantId: "v0-abc",
    finalized: true,
    gateResults: [],
    escapedDefects: [],
    scores: {
      understanding: 80,
      problemSolving: 90,
      codeQuality: 70,
      communication: null,
      verification: 85,
    },
    submittedAt: "2026-08-26T12:00:00.000Z",
    ...overrides,
  }
}

describe("difficultyForPoints", () => {
  it.each([
    [1, "easy"],
    [3, "easy"],
    [4, "medium"],
    [6, "medium"],
    [7, "hard"],
    [13, "hard"],
  ])("points=%d -> %s", (points, expected) => {
    expect(difficultyForPoints(points)).toBe(expected)
  })
})

describe("buildSprintLabMasterySession", () => {
  it("maps the workbook+ticket key into a stable scenarioId", () => {
    const session = buildSprintLabMasterySession("meridian", ticket(), attempt())
    expect(session.scenarioId).toBe("sprint-labs:meridian:MER-201")
  })

  it("records under the non-DSA sprint-lab bucket, never a real DSA pattern", () => {
    const session = buildSprintLabMasterySession("meridian", ticket(), attempt())
    expect(session.pattern).toBe("sprint-lab")
    expect(session.pattern).not.toBe("arrays-hashing")
  })

  it("uses overall as performanceScore and problemSolving as masteryScore (code-correctness proxy)", () => {
    const session = buildSprintLabMasterySession(
      "meridian",
      ticket(),
      attempt({
        scores: {
          understanding: 1,
          problemSolving: 77,
          codeQuality: 1,
          communication: null,
          verification: 1,
        },
      })
    )
    expect(session.masteryScore).toBe(77)
  })

  it("derives difficulty from the ticket's points", () => {
    const session = buildSprintLabMasterySession("meridian", ticket({ points: 2 }), attempt())
    expect(session.difficulty).toBe("easy")
  })

  it("carries the attempt's submittedAt through as completedAt", () => {
    const session = buildSprintLabMasterySession(
      "meridian",
      ticket(),
      attempt({ submittedAt: "2026-01-02T03:04:05.000Z" })
    )
    expect(session.completedAt).toBe("2026-01-02T03:04:05.000Z")
  })
})

describe("recordSprintLabMastery", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("records a finalized unassisted attempt", async () => {
    await recordSprintLabMastery(
      "user-1",
      "meridian",
      ticket({ aiPolicy: "unassisted" }),
      attempt({ aiPolicy: "unassisted", finalized: true })
    )
    expect(mocks.completeSessionWithMastery).toHaveBeenCalledTimes(1)
    expect(mocks.completeSessionWithMastery).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({ scenarioId: "sprint-labs:meridian:MER-201" })
    )
  })

  it("records a finalized review-only attempt", async () => {
    await recordSprintLabMastery(
      "user-1",
      "meridian",
      ticket({ aiPolicy: "review-only" }),
      attempt({ aiPolicy: "review-only", finalized: true })
    )
    expect(mocks.completeSessionWithMastery).toHaveBeenCalledTimes(1)
  })

  it("NEVER records an assisted attempt, even when finalized", async () => {
    await recordSprintLabMastery(
      "user-1",
      "meridian",
      ticket({ aiPolicy: "assisted" }),
      attempt({ aiPolicy: "assisted", finalized: true })
    )
    expect(mocks.completeSessionWithMastery).not.toHaveBeenCalled()
  })

  it("never records a non-finalized attempt, even when unassisted", async () => {
    await recordSprintLabMastery(
      "user-1",
      "meridian",
      ticket({ aiPolicy: "unassisted" }),
      attempt({ aiPolicy: "unassisted", finalized: false })
    )
    expect(mocks.completeSessionWithMastery).not.toHaveBeenCalled()
  })

  it("is best-effort: swallows a thrown error and logs instead of propagating", async () => {
    mocks.completeSessionWithMastery.mockRejectedValueOnce(new Error("firestore down"))
    await expect(
      recordSprintLabMastery(
        "user-1",
        "meridian",
        ticket({ aiPolicy: "unassisted" }),
        attempt({ finalized: true })
      )
    ).resolves.toBeUndefined()
    expect(mocks.loggerError).toHaveBeenCalledTimes(1)
  })
})
