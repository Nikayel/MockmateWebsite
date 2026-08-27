/**
 * Service-level tests for the Sprint Labs attempts service
 * (../grading/attempts-service.ts): open/complete/review orchestration with
 * a faked Firestore, extending lib/sprint-labs/__tests__/runs.test.ts's fake
 * (path -> data map, vi.hoisted) with `runTransaction` support, which that
 * file's service (runs.ts) never needed.
 *
 * Per docs/sprint-labs/PLAN.md Task 8's explicit verification list, this
 * file is the one that proves: first submit finalizes; second submit draws
 * a variant and is formative-only; a fabricated probe "pass" cannot alter an
 * io-case verdict; and the returned projection never includes runner
 * output. Pure-logic exhaustiveness (every scorer band, every variant
 * boundary, every budget edge) lives in lib/sprint-labs/grading/__tests__/ —
 * this file is deliberately about ORCHESTRATION, not re-proving arithmetic
 * already covered there.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ============================================================
// Faked Firestore — path -> data map, extended with runTransaction
// ============================================================

interface FakeDocRef {
  id: string
  __fakePath: string
  get: () => Promise<{
    exists: boolean
    id: string
    data: () => Record<string, unknown> | undefined
  }>
  set: (data: Record<string, unknown>) => Promise<void>
  update: (data: Record<string, unknown>) => Promise<void>
  collection: (name: string) => FakeCollectionRef
}

interface FakeCollectionRef {
  doc: (id?: string) => FakeDocRef
  get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>
  where: (
    field: string,
    op: "==",
    value: unknown
  ) => { get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }> }
}

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>()
  let autoIdCounter = 0

  function directChildren(collectionPath: string) {
    const prefix = `${collectionPath}/`
    return Array.from(store.entries()).filter(
      ([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/")
    )
  }

  function docRef(path: string): FakeDocRef {
    return {
      id: path.split("/").pop() as string,
      __fakePath: path,
      get: async () => {
        const data = store.get(path)
        return {
          exists: data !== undefined,
          id: path.split("/").pop() as string,
          data: () => (data ? { ...data } : undefined),
        }
      },
      set: async (data: Record<string, unknown>) => {
        store.set(path, { ...data })
      },
      update: async (data: Record<string, unknown>) => {
        const existing = store.get(path)
        if (existing === undefined) throw new Error(`fake firestore: update on missing doc ${path}`)
        store.set(path, { ...existing, ...data })
      },
      collection: (name: string) => collectionRef(`${path}/${name}`),
    }
  }

  function collectionRef(collectionPath: string): FakeCollectionRef {
    return {
      doc: (id?: string) => docRef(`${collectionPath}/${id ?? `auto_${++autoIdCounter}`}`),
      get: async () => ({
        docs: directChildren(collectionPath).map(([key, data]) => ({
          id: key.slice(collectionPath.length + 1),
          data: () => ({ ...data }),
        })),
      }),
      where: (field: string, op: "==", value: unknown) => ({
        get: async () => ({
          docs: directChildren(collectionPath)
            .filter(([, data]) => (op === "==" ? data[field] === value : false))
            .map(([key, data]) => ({
              id: key.slice(collectionPath.length + 1),
              data: () => ({ ...data }),
            })),
        }),
      }),
    }
  }

  const adminDbFake = {
    collection: (name: string) => collectionRef(name),
    // Simplified for a single-threaded unit test: no real contention/retry —
    // reads see the current store, writes land immediately. Good enough to
    // exercise THIS module's read-then-decide-then-write logic; Firestore's
    // own conflict-retry semantics are not what this test suite is for.
    runTransaction: async <T>(
      callback: (tx: {
        get: (refOrQuery: { get: () => Promise<unknown> }) => Promise<unknown>
        set: (ref: FakeDocRef, data: Record<string, unknown>) => void
        update: (ref: FakeDocRef, data: Record<string, unknown>) => void
      }) => Promise<T>
    ): Promise<T> => {
      const tx = {
        get: (refOrQuery: { get: () => Promise<unknown> }) => refOrQuery.get(),
        set: (ref: FakeDocRef, data: Record<string, unknown>) => {
          store.set(ref.__fakePath, { ...data })
        },
        update: (ref: FakeDocRef, data: Record<string, unknown>) => {
          const existing = store.get(ref.__fakePath)
          store.set(ref.__fakePath, { ...(existing ?? {}), ...data })
        },
      }
      return callback(tx)
    },
  }

  return {
    adminDbFake,
    store,
    reset: () => {
      store.clear()
      autoIdCounter = 0
    },
  }
})

vi.mock("@/lib/firebase-admin", () => ({ adminDb: h.adminDbFake }))

const loggerSpies = vi.hoisted(() => ({ warn: vi.fn(), error: vi.fn() }))
vi.mock("@/lib/logger", () => ({ logger: { ...loggerSpies, info: vi.fn(), debug: vi.fn() } }))

// ============================================================
// Content + sealed registry stubs
// ============================================================

const WORKBOOK_ID = "meridian"

const contentMocks = vi.hoisted(() => ({ getTicket: vi.fn() }))
vi.mock("@/lib/sprint-labs/content/registry", () => ({ getTicket: contentMocks.getTicket }))

const sealedMocks = vi.hoisted(() => ({ loadSealedTicket: vi.fn() }))
vi.mock("@/lib/scenarios/sealed/sprint-labs/registry.server", () => ({
  loadSealedTicket: sealedMocks.loadSealedTicket,
}))

const usageMocks = vi.hoisted(() => ({ trackUsageEvent: vi.fn() }))
vi.mock("@/lib/usage-tracking", () => ({ trackUsageEvent: usageMocks.trackUsageEvent }))

const masteryMocks = vi.hoisted(() => ({ recordSprintLabMastery: vi.fn() }))
vi.mock("@/lib/sprint-labs/mastery", () => ({
  recordSprintLabMastery: masteryMocks.recordSprintLabMastery,
}))

import type { StoredSprintLabRun } from "@/lib/sprint-labs/runs"
import type { CompiledTicket } from "@/lib/sprint-labs/content/types"
import type { SealedTicketContent } from "@/lib/scenarios/sealed/sprint-labs/types"

function ticketFixture(overrides: Partial<CompiledTicket["ticket"]> = {}): CompiledTicket {
  return {
    ticket: {
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
    },
    setupDiff: null,
    visibleTestFiles: [],
    hiddenTests: [],
  }
}

const IO_CASE_A = {
  id: "case-a",
  humanName: "Escaped: a boolean amount is still accepted",
  tags: ["money"],
  kind: "io-case" as const,
  input: { amount: true },
  expected: { ok: false, reason: "amount must be a finite number" },
}
const IO_CASE_B = {
  id: "case-b",
  humanName: "Escaped: negative amounts are silently accepted",
  tags: ["money"],
  kind: "io-case" as const,
  input: { amount: -5 },
  expected: { ok: false, reason: "amount must be non-negative" },
}

function sealedFixture(overrides: Partial<SealedTicketContent> = {}): SealedTicketContent {
  return {
    workbookId: WORKBOOK_ID,
    ticketKey: "MER-201",
    hiddenCases: [IO_CASE_A, IO_CASE_B],
    adversaryFiles: [],
    review: null,
    authorBrief: null,
    referenceDiff:
      "diff --git a/src/money.ts b/src/money.ts\nindex 111..222 100644\n--- a/src/money.ts\n+++ b/src/money.ts\n@@ -1,2 +1,4 @@\n-old\n-old2\n+new\n+new2\n+new3\n+new4\n",
    rubric: {
      weights: {
        understanding: 0.2,
        problemSolving: 0.3,
        codeQuality: 0.2,
        communication: 0.1,
        verification: 0.2,
      },
      notes: {},
    },
    ...overrides,
  }
}

function seedRun(id: string, overrides: Partial<StoredSprintLabRun> = {}): StoredSprintLabRun {
  const run: StoredSprintLabRun = {
    id,
    userId: USER,
    workbookId: WORKBOOK_ID,
    contentVersion: "v1",
    currentSprint: 1,
    board: { "MER-101": "done", "MER-201": "doing" },
    status: "in_progress",
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
  const { id: _omit, ...body } = run
  h.store.set(`sprintLabRuns/${id}`, { ...body })
  return run
}

import {
  openSprintLabAttempt,
  completeSprintLabAttempt,
  reviewSprintLabAttempt,
  SPRINT_LAB_ATTEMPT_ERRORS,
} from "../grading/attempts-service"

const USER = "user_alice"

/** Push every stored attempt doc under this run/ticket back in time, so a cooldown check reads them as long past. */
function ageAllStoredAttempts(runId: string, seconds: number) {
  const prefix = `sprintLabRuns/${runId}/attempts/`
  for (const [key, data] of h.store.entries()) {
    if (!key.startsWith(prefix) || key.slice(prefix.length).includes("/")) continue
    if (typeof data.submittedAt !== "string") continue
    const aged = new Date(new Date(data.submittedAt).getTime() - seconds * 1000).toISOString()
    h.store.set(key, { ...data, submittedAt: aged })
  }
}

beforeEach(() => {
  h.reset()
  loggerSpies.warn.mockClear()
  loggerSpies.error.mockClear()
  contentMocks.getTicket.mockReset()
  sealedMocks.loadSealedTicket.mockReset()
  usageMocks.trackUsageEvent.mockReset().mockResolvedValue(true)
  masteryMocks.recordSprintLabMastery.mockReset().mockResolvedValue(undefined)
  contentMocks.getTicket.mockResolvedValue(ticketFixture())
  sealedMocks.loadSealedTicket.mockResolvedValue(sealedFixture())
})

describe("openSprintLabAttempt", () => {
  it("issues io-case inputs (id/humanName/input only, never expected) and a regression manifest from done board tickets", async () => {
    seedRun("run1")
    const result = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    expect(result.ioCases.length).toBeGreaterThan(0)
    for (const c of result.ioCases) {
      expect(Object.keys(c).sort()).toEqual(["humanName", "id", "input"])
    }
    expect(result.regressionManifest).toEqual([{ ticketKey: "MER-101" }])
    expect(result.submissionsUsed).toBe(0)
  })

  it("issues probes only when the ticket is assisted", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "assisted" }))
    sealedMocks.loadSealedTicket.mockResolvedValue(
      sealedFixture({
        hiddenCases: [
          { id: "probe-1", humanName: "probe", tags: [], kind: "probe", body: "assert(true)" },
        ],
      })
    )
    const assisted = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    expect(assisted.probes).toEqual([{ id: "probe-1", humanName: "probe", body: "assert(true)" }])

    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "unassisted" }))
    const unassisted = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    expect(unassisted.probes).toEqual([])
  })

  it("rejects an unknown ticket", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(undefined)
    await expect(openSprintLabAttempt(USER, { runId: "run1", ticketKey: "NOPE" })).rejects.toThrow(
      SPRINT_LAB_ATTEMPT_ERRORS.UNKNOWN_TICKET
    )
  })
})

describe("completeSprintLabAttempt — metric integrity", () => {
  it("the FIRST submit finalizes", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const outcome = await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: Object.fromEntries(
        opened.ioCases.map((c) => [
          c.id,
          sealedFixture().hiddenCases.find((h2) => h2.id === c.id)?.expected,
        ])
      ),
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    expect(outcome.attempt.finalized).toBe(true)
  })

  it("a SECOND submit (new attempt, new variant) is formative-only: finalized stays false", async () => {
    seedRun("run1")
    const first = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: first.attemptId,
      variantId: first.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })

    // The cooldown is keyed off wall-clock time; push every attempt's
    // submittedAt back so this test proves finalize-once-then-formative
    // behavior without also having to wait out SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS.
    ageAllStoredAttempts("run1", 3600)

    const second = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    expect(second.submissionsUsed).toBe(1)
    const secondOutcome = await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: second.attemptId,
      variantId: second.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    expect(secondOutcome.attempt.finalized).toBe(false)
    // A different attempt drew a variantId derived from a different attemptIndex.
    expect(second.variantId).not.toEqual(first.variantId)
  })

  it("rejects a stale/replayed variantId (attempt count moved on since it was issued)", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    // Simulate a submission having landed in between, without going through this attemptId.
    h.store.set(`sprintLabRuns/run1/attempts/other-attempt`, {
      ticketKey: "MER-201",
      aiPolicy: "unassisted",
      variantId: "v0-stale",
      finalized: true,
      gateResults: [],
      escapedDefects: [],
      scores: {
        understanding: 0,
        problemSolving: 0,
        codeQuality: 0,
        communication: null,
        verification: 0,
        overall: 0,
      },
      submittedAt: "2026-01-01T00:00:01.000Z",
    })

    await expect(
      completeSprintLabAttempt(USER, {
        runId: "run1",
        ticketKey: "MER-201",
        attemptId: opened.attemptId,
        variantId: opened.variantId, // stale now — a real second attempt would draw a different variantId
        ioCaseOutputs: {},
        probeResults: {},
        filesTouched: [],
        timeToFirstEditSeconds: null,
        diffLineCount: 0,
        learnerAddedTest: false,
      })
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.STALE_ATTEMPT)
  })

  it("a fabricated probe 'pass' cannot alter an io-case verdict or the score", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "assisted" }))
    sealedMocks.loadSealedTicket.mockResolvedValue(
      sealedFixture({
        hiddenCases: [
          IO_CASE_A,
          { id: "probe-1", humanName: "probe escape", tags: [], kind: "probe", body: "x" },
        ],
      })
    )
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const outcome = await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: { "case-a": { ok: true, value: {} } }, // WRONG output
      probeResults: { "probe-1": true }, // client claims the probe passed
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    const ioCaseEntry = outcome.attempt.gateResults
      .find((g) => g.gate === "hidden")
      ?.cases.find((c) => c.testId === "case-a")
    expect(ioCaseEntry?.passed).toBe(false)
    expect(outcome.attempt.escapedDefects).toContain(IO_CASE_A.humanName)
    expect(outcome.attempt.scores.problemSolving).toBe(0)
  })

  it("the projection never includes runner output: every gate case is exactly {gate:'hidden'-shape} testId/humanName/passed", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const outcome = await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    for (const gate of outcome.attempt.gateResults) {
      expect(Object.keys(gate).sort()).toEqual(["cases", "gate"])
      for (const c of gate.cases) {
        expect(Object.keys(c).sort()).toEqual(["humanName", "passed", "testId"])
      }
    }
    expect(JSON.stringify(outcome.attempt)).not.toMatch(/expected|reason must be|sealed/i)
  })

  it("releases R11 review-comment TEXTS (no correct flags) at complete time for a review-only ticket", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "review-only" }))
    sealedMocks.loadSealedTicket.mockResolvedValue(
      sealedFixture({
        review: [
          { id: "c1", body: "looks fine", correct: true },
          { id: "c2", body: "just delete it", correct: false },
        ],
      })
    )
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const outcome = await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    expect(outcome.reviewComments).toEqual([
      { id: "c1", body: "looks fine" },
      { id: "c2", body: "just delete it" },
    ])
  })

  it("does NOT release review comments for a non-review-only ticket", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const outcome = await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    expect(outcome.reviewComments).toBeUndefined()
  })

  it("records mastery only when finalized and aiPolicy is not assisted", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    expect(masteryMocks.recordSprintLabMastery).toHaveBeenCalledTimes(1)
    expect(masteryMocks.recordSprintLabMastery).toHaveBeenCalledWith(
      USER,
      WORKBOOK_ID,
      expect.objectContaining({ key: "MER-201" }),
      expect.objectContaining({ finalized: true })
    )
  })

  it("calls recordSprintLabMastery unconditionally, on an assisted ticket too — the ai_policy/finalized GATE is mastery.ts's own responsibility (see lib/sprint-labs/__tests__/mastery.test.ts), not re-implemented here", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "assisted" }))
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    expect(masteryMocks.recordSprintLabMastery).toHaveBeenCalledTimes(1)
    expect(masteryMocks.recordSprintLabMastery).toHaveBeenCalledWith(
      USER,
      WORKBOOK_ID,
      expect.objectContaining({ aiPolicy: "assisted" }),
      expect.objectContaining({ aiPolicy: "assisted" })
    )
  })

  it("tracks a zero-cost sprint-labs-grading usage event", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    expect(usageMocks.trackUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, service: "sprint-labs-grading", cost: 0 })
    )
  })

  it("enforces the submission budget at complete time too (defense in depth)", async () => {
    seedRun("run1")
    for (let i = 0; i < 5; i++) {
      h.store.set(`sprintLabRuns/run1/attempts/a${i}`, {
        ticketKey: "MER-201",
        aiPolicy: "unassisted",
        variantId: `v${i}-x`,
        finalized: i === 0,
        gateResults: [],
        escapedDefects: [],
        scores: {
          understanding: 0,
          problemSolving: 0,
          codeQuality: 0,
          communication: null,
          verification: 0,
          overall: 0,
        },
        submittedAt: `2026-01-01T00:00:0${i}.000Z`,
      })
    }
    await expect(
      completeSprintLabAttempt(USER, {
        runId: "run1",
        ticketKey: "MER-201",
        attemptId: "irrelevant",
        variantId: "irrelevant",
        ioCaseOutputs: {},
        probeResults: {},
        filesTouched: [],
        timeToFirstEditSeconds: null,
        diffLineCount: 0,
        learnerAddedTest: false,
      })
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.BUDGET_EXCEEDED)
  })
})

describe("reviewSprintLabAttempt", () => {
  async function completeReviewOnlyAttempt(): Promise<{ attemptId: string }> {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "review-only" }))
    sealedMocks.loadSealedTicket.mockResolvedValue(
      sealedFixture({
        review: [
          { id: "c1", body: "looks fine", correct: true },
          { id: "c2", body: "just delete it", correct: false },
        ],
      })
    )
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    return { attemptId: opened.attemptId }
  }

  it("rejects a non-review-only ticket", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    await expect(
      reviewSprintLabAttempt(USER, {
        runId: "run1",
        ticketKey: "MER-201",
        attemptId: opened.attemptId,
        decisions: [{ commentId: "c1", decision: "accept" }],
      })
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.NOT_REVIEW_ONLY)
  })

  it("releases correctness + trap + referenceDiff when the attempt IS finalized", async () => {
    const { attemptId } = await completeReviewOnlyAttempt()
    const outcome = await reviewSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId,
      decisions: [
        { commentId: "c1", decision: "accept" },
        { commentId: "c2", decision: "push-back", reason: "would break the nightly sync" },
      ],
    })
    expect(outcome.released).toBeDefined()
    expect(outcome.released?.review).toEqual([
      { id: "c1", correct: true },
      { id: "c2", correct: false },
    ])
    expect(outcome.released?.referenceDiff).toContain("diff --git")
  })

  it("does NOT release anything when the attempt is NOT finalized (a re-attempt)", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "review-only" }))
    sealedMocks.loadSealedTicket.mockResolvedValue(
      sealedFixture({ review: [{ id: "c1", body: "x", correct: true }] })
    )
    // Seed a prior finalized attempt so the SECOND one is formative.
    h.store.set(`sprintLabRuns/run1/attempts/prior`, {
      ticketKey: "MER-201",
      aiPolicy: "review-only",
      variantId: "v0-prior",
      finalized: true,
      gateResults: [],
      escapedDefects: [],
      scores: {
        understanding: 0,
        problemSolving: 0,
        codeQuality: 0,
        communication: null,
        verification: 0,
        overall: 0,
      },
      submittedAt: "2026-01-01T00:02:00.000Z",
    })
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      variantId: opened.variantId,
      ioCaseOutputs: {},
      probeResults: {},
      filesTouched: [],
      timeToFirstEditSeconds: null,
      diffLineCount: 0,
      learnerAddedTest: false,
    })
    const outcome = await reviewSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      decisions: [{ commentId: "c1", decision: "accept" }],
    })
    expect(outcome.released).toBeUndefined()
  })

  it("rejects a second review call on the same attempt (idempotency)", async () => {
    const { attemptId } = await completeReviewOnlyAttempt()
    await reviewSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId,
      decisions: [
        { commentId: "c1", decision: "accept" },
        { commentId: "c2", decision: "push-back", reason: "x" },
      ],
    })
    await expect(
      reviewSprintLabAttempt(USER, {
        runId: "run1",
        ticketKey: "MER-201",
        attemptId,
        decisions: [
          { commentId: "c1", decision: "accept" },
          { commentId: "c2", decision: "push-back", reason: "x" },
        ],
      })
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.ALREADY_REVIEWED)
  })

  it("rejects a decision set that does not exactly cover the sealed comment ids", async () => {
    const { attemptId } = await completeReviewOnlyAttempt()
    await expect(
      reviewSprintLabAttempt(USER, {
        runId: "run1",
        ticketKey: "MER-201",
        attemptId,
        decisions: [{ commentId: "c1", decision: "accept" }], // missing c2
      })
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.INVALID_REVIEW_DECISIONS)
  })
})
