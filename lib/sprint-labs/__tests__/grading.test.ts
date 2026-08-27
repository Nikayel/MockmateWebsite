/**
 * Service-level tests for the Sprint Labs attempts service
 * (../grading/attempts-service.ts): open/complete/review orchestration with
 * a faked Firestore, extending lib/sprint-labs/__tests__/runs.test.ts's fake
 * (path -> data map, vi.hoisted) with `runTransaction`/`tx.create` support,
 * which that file's service (runs.ts) never needed.
 *
 * Fix round 1 rewrote this file for: C1 (the attempt stub lifecycle —
 * open/create, complete/require-open-and-transition, the two regression
 * exploits the reviewer proved), I3/I4 (budget and finalize-once folded
 * into their write transactions), I5 (review-only mastery deferred to the
 * review round), I6 (zero io-cases collapses to 0 and renormalizes,
 * never inflates to 100), and RULING R21 (no scoring dimension consumes a
 * client-posted judgment — filesTouched/diffLineCount/learnerAddedTest are
 * now asserted to come from the run's OWN file store, never the request).
 *
 * Pure-logic exhaustiveness (every scorer band, every variant boundary,
 * every budget edge, every workspace-signal derivation) lives in
 * lib/sprint-labs/grading/__tests__/ — this file is deliberately about
 * ORCHESTRATION, not re-proving arithmetic already covered there.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

// ============================================================
// Faked Firestore — path -> data map, extended with runTransaction + tx.create
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
    // reads see the current store, writes land immediately. `tx.create`
    // enforces the one invariant this test suite actually needs: it throws
    // if the target path already has data, mirroring real Firestore.
    runTransaction: async <T>(
      callback: (tx: {
        get: (refOrQuery: { get: () => Promise<unknown> }) => Promise<unknown>
        set: (ref: FakeDocRef, data: Record<string, unknown>) => void
        create: (ref: FakeDocRef, data: Record<string, unknown>) => void
        update: (ref: FakeDocRef, data: Record<string, unknown>) => void
      }) => Promise<T>
    ): Promise<T> => {
      const tx = {
        get: (refOrQuery: { get: () => Promise<unknown> }) => refOrQuery.get(),
        set: (ref: FakeDocRef, data: Record<string, unknown>) => {
          store.set(ref.__fakePath, { ...data })
        },
        create: (ref: FakeDocRef, data: Record<string, unknown>) => {
          if (store.has(ref.__fakePath)) {
            throw new Error(`fake firestore: create on existing doc ${ref.__fakePath}`)
          }
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
import { encodeWorkspaceFilePathId } from "@/lib/sprint-labs/workspace-files"
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

/** Seeds a `sprintLabRuns/{runId}/files/{encodedPath}` doc, matching runs.ts's own storage shape. */
function seedWorkspaceFile(
  runId: string,
  path: string,
  content: string,
  updatedAt = "2026-01-01T00:00:00.000Z"
) {
  h.store.set(`sprintLabRuns/${runId}/files/${encodeWorkspaceFilePathId(path)}`, {
    path,
    content,
    updatedAt,
    revision: 1,
  })
}

/** Push every stored attempt doc under this run back in time, so a cooldown check reads them as long past. */
function ageAllStoredAttempts(runId: string, seconds: number) {
  const prefix = `sprintLabRuns/${runId}/attempts/`
  for (const [key, data] of h.store.entries()) {
    if (!key.startsWith(prefix) || key.slice(prefix.length).includes("/")) continue
    if (typeof data.submittedAt !== "string") continue
    const aged = new Date(new Date(data.submittedAt).getTime() - seconds * 1000).toISOString()
    h.store.set(key, { ...data, submittedAt: aged })
  }
}

import {
  openSprintLabAttempt,
  completeSprintLabAttempt,
  reviewSprintLabAttempt,
  SPRINT_LAB_ATTEMPT_ERRORS,
} from "../grading/attempts-service"

const USER = "user_alice"

function completeInput(overrides: Record<string, unknown> = {}) {
  return {
    runId: "run1",
    ticketKey: "MER-201",
    ioCaseOutputs: {},
    probeResults: {},
    ...overrides,
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
  it("persists a stub doc at open (C1) and issues io-case inputs (id/humanName/input only, never expected)", async () => {
    seedRun("run1")
    const result = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    expect(result.ioCases.length).toBeGreaterThan(0)
    for (const c of result.ioCases) {
      expect(Object.keys(c).sort()).toEqual(["humanName", "id", "input"])
    }
    expect(result.regressionManifest).toEqual([{ ticketKey: "MER-101" }])
    expect(result.submissionsUsed).toBe(0)

    const stub = h.store.get(`sprintLabRuns/run1/attempts/${result.attemptId}`)
    expect(stub).toMatchObject({
      ticketKey: "MER-201",
      status: "open",
      variantId: result.variantId,
    })
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

  it("enforces the submission budget: the 6th open for one ticket is rejected", async () => {
    seedRun("run1")
    for (let i = 0; i < 5; i++) {
      h.store.set(`sprintLabRuns/run1/attempts/a${i}`, {
        ticketKey: "MER-201",
        variantId: `v${i}`,
        attemptIndex: i,
        aiPolicy: "unassisted",
        openedAt: "2020-01-01T00:00:00.000Z",
        status: "completed",
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
        submittedAt: "2020-01-01T00:00:00.000Z",
      })
    }
    await expect(
      openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.BUDGET_EXCEEDED)
  })
})

describe("completeSprintLabAttempt — metric integrity", () => {
  it("the FIRST submit finalizes", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const outcome = await completeSprintLabAttempt(
      USER,
      completeInput({
        attemptId: opened.attemptId,
        ioCaseOutputs: Object.fromEntries(
          opened.ioCases.map((c) => [
            c.id,
            sealedFixture().hiddenCases.find((h2) => h2.id === c.id)?.expected,
          ])
        ),
      })
    )
    expect(outcome.attempt.finalized).toBe(true)
    expect(outcome.referenceDiff).toContain("diff --git") // M7: released for every policy once finalized

    // I4: the finalize-once sentinel doc now exists, pointing at this attempt.
    const sentinel = h.store.get("sprintLabRuns/run1/attemptsMeta/MER-201")
    expect(sentinel).toMatchObject({ finalizedByAttemptId: opened.attemptId })
  })

  it("a SECOND submit (new attempt, new variant) is formative-only: finalized stays false", async () => {
    seedRun("run1")
    const first = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, completeInput({ attemptId: first.attemptId }))

    // The cooldown is keyed off wall-clock time; push the completed attempt's
    // submittedAt back so this test proves finalize-once-then-formative
    // behavior without also waiting out SPRINT_LAB_SUBMISSION_COOLDOWN_SECONDS.
    ageAllStoredAttempts("run1", 3600)

    const second = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    expect(second.submissionsUsed).toBe(1)
    expect(second.attemptId).not.toEqual(first.attemptId)
    expect(second.variantId).not.toEqual(first.variantId)

    const secondOutcome = await completeSprintLabAttempt(
      USER,
      completeInput({ attemptId: second.attemptId })
    )
    expect(secondOutcome.attempt.finalized).toBe(false)
  })

  it("C1 regression (a): same-attemptId resubmission is rejected — cannot freeze the budget or repeat a variant", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const first = await completeSprintLabAttempt(
      USER,
      completeInput({ attemptId: opened.attemptId })
    )
    expect(first.attempt.finalized).toBe(true)

    // Replaying the SAME attemptId must be rejected outright, not re-scored or overwritten.
    await expect(
      completeSprintLabAttempt(USER, completeInput({ attemptId: opened.attemptId }))
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_ALREADY_COMPLETED)

    // The first (real) completion's doc must be untouched by the rejected replay.
    const stored = h.store.get(`sprintLabRuns/run1/attempts/${opened.attemptId}`)
    expect(stored?.finalized).toBe(true)

    // And the budget genuinely advanced: a fresh, legitimate re-open sees attemptIndex 1, not
    // stuck at 0 (which "freezing the budget" would look like).
    ageAllStoredAttempts("run1", 3600)
    const reopened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    expect(reopened.submissionsUsed).toBe(1)
    expect(reopened.variantId).not.toEqual(opened.variantId) // did not repeat the same variant
  })

  it("C1 regression (b): a cross-ticket attemptId cannot re-finalize or double-fire mastery", async () => {
    seedRun("run1", { board: { "MER-101": "doing", "MER-202": "doing" } })
    contentMocks.getTicket.mockImplementation(async (_workbookId: string, ticketKey: string) =>
      ticketFixture({ key: ticketKey, aiPolicy: "unassisted" })
    )
    sealedMocks.loadSealedTicket.mockImplementation(async () => sealedFixture())

    const openedA = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-101" })
    const openedB = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-202" })

    // Try to complete ticket B's request using ticket A's attemptId.
    await expect(
      completeSprintLabAttempt(
        USER,
        completeInput({ ticketKey: "MER-202", attemptId: openedA.attemptId })
      )
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_NOT_FOUND)

    expect(masteryMocks.recordSprintLabMastery).not.toHaveBeenCalled()

    // Ticket B's OWN, legitimate attemptId still completes normally afterward.
    const outcome = await completeSprintLabAttempt(
      USER,
      completeInput({ ticketKey: "MER-202", attemptId: openedB.attemptId })
    )
    expect(outcome.attempt.finalized).toBe(true)
  })

  it("rejects an unknown attemptId", async () => {
    seedRun("run1")
    await expect(
      completeSprintLabAttempt(USER, completeInput({ attemptId: "does-not-exist" }))
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.ATTEMPT_NOT_FOUND)
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
    const outcome = await completeSprintLabAttempt(
      USER,
      completeInput({
        attemptId: opened.attemptId,
        ioCaseOutputs: { "case-a": { ok: true, value: {} } }, // WRONG output
        probeResults: { "probe-1": true }, // client claims the probe passed
      })
    )
    const ioCaseEntry = outcome.attempt.gateResults
      .find((g) => g.gate === "hidden")
      ?.cases.find((c) => c.testId === "case-a")
    expect(ioCaseEntry?.passed).toBe(false)
    expect(outcome.attempt.escapedDefects).toContain(IO_CASE_A.humanName)
    expect(outcome.attempt.scores.problemSolving).toBe(0)
  })

  it("R21: filesTouched/diffLineCount/learnerAddedTest are derived from the run's OWN file store, never a request field", async () => {
    seedRun("run1")
    seedWorkspaceFile("run1", "src/money.test.ts", "line1\nline2\nline3")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })

    // Post a fabricated filesTouched/diffLineCount/learnerAddedTest — the current schema no
    // longer even accepts these keys (Zod strips unknowns), but the cast proves the SERVER value
    // used is the derived one, not whatever a client might try to smuggle in.
    const outcome = await completeSprintLabAttempt(
      USER,
      completeInput({
        attemptId: opened.attemptId,
        filesTouched: ["totally/fake/path.ts"],
        diffLineCount: 99999,
        learnerAddedTest: false,
      }) as Parameters<typeof completeSprintLabAttempt>[1]
    )

    // learnerAddedTest is server-derived true (a real seeded file matches the test-path pattern),
    // contradicting the fabricated `learnerAddedTest: false` in the (ignored) request body.
    expect(outcome.attempt.scores.verification).toBeGreaterThan(0)
    const meta = h.store.get(`sprintLabRuns/run1/attempts/${opened.attemptId}/meta/grading`)
    expect(meta?.learnerAddedTest).toBe(true)
  })

  it("I6: zero io-case hidden tests collapses problemSolving/verification to 0 (never 100), and overall renormalizes around them", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "assisted" }))
    sealedMocks.loadSealedTicket.mockResolvedValue(
      sealedFixture({
        hiddenCases: [{ id: "probe-1", humanName: "probe", tags: [], kind: "probe", body: "x" }], // zero io-cases
        rubric: {
          weights: {
            understanding: 0.25,
            problemSolving: 0.25,
            codeQuality: 0.25,
            communication: 0,
            verification: 0.25,
          },
          notes: {},
        },
      })
    )
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const outcome = await completeSprintLabAttempt(
      USER,
      completeInput({ attemptId: opened.attemptId })
    )

    expect(outcome.attempt.scores.problemSolving).toBe(0)
    expect(outcome.attempt.scores.verification).toBe(0)
    // Nothing was touched: understanding = 0*0.7 (files) + 70*0.3 (neutral time default) = 21;
    // codeQuality = farScore 40 (zero learner diff vs a real reference diff). With
    // problemSolving/verification/communication all excluded (null, or 0-weight for
    // communication), overall renormalizes to JUST understanding+codeQuality at equal weight:
    // (21*.25 + 40*.25) / (.25+.25) = 30.5 -> rounds to 31. This is NOT the same as the
    // un-renormalized (wrong) average that would also divide in the two fabricated 0s.
    expect(outcome.attempt.scores.understanding).toBe(21)
    expect(outcome.attempt.scores.codeQuality).toBe(40)
    expect(outcome.attempt.scores.overall).toBe(31)
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
    const outcome = await completeSprintLabAttempt(
      USER,
      completeInput({ attemptId: opened.attemptId })
    )
    expect(outcome.reviewComments).toEqual([
      { id: "c1", body: "looks fine" },
      { id: "c2", body: "just delete it" },
    ])
  })

  it("does NOT release review comments for a non-review-only ticket", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const outcome = await completeSprintLabAttempt(
      USER,
      completeInput({ attemptId: opened.attemptId })
    )
    expect(outcome.reviewComments).toBeUndefined()
  })

  it("the projection never includes runner output or internal bookkeeping (status/attemptIndex/openedAt)", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    const outcome = await completeSprintLabAttempt(
      USER,
      completeInput({ attemptId: opened.attemptId })
    )
    expect(Object.keys(outcome.attempt).sort()).toEqual(
      [
        "aiPolicy",
        "escapedDefects",
        "finalized",
        "gateResults",
        "modelId",
        "scores",
        "submittedAt",
        "ticketKey",
        "variantId",
      ].sort()
    )
    for (const gate of outcome.attempt.gateResults) {
      expect(Object.keys(gate).sort()).toEqual(["cases", "gate"])
      for (const c of gate.cases) {
        expect(Object.keys(c).sort()).toEqual(["humanName", "passed", "testId"])
      }
    }
  })

  it("I5: records mastery at complete time for a non-review-only, finalized ticket", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, completeInput({ attemptId: opened.attemptId }))
    expect(masteryMocks.recordSprintLabMastery).toHaveBeenCalledTimes(1)
    expect(masteryMocks.recordSprintLabMastery).toHaveBeenCalledWith(
      USER,
      WORKBOOK_ID,
      expect.objectContaining({ key: "MER-201" }),
      expect.objectContaining({ finalized: true })
    )
  })

  it("I5: does NOT record mastery at complete time for a review-only ticket — deferred to the review round", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "review-only" }))
    sealedMocks.loadSealedTicket.mockResolvedValue(
      sealedFixture({ review: [{ id: "c1", body: "x", correct: true }] })
    )
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, completeInput({ attemptId: opened.attemptId }))
    expect(masteryMocks.recordSprintLabMastery).not.toHaveBeenCalled()
  })

  it("calls recordSprintLabMastery unconditionally for non-review-only policies (the ai_policy/finalized GATE for those is mastery.ts's own job, see mastery.test.ts)", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "assisted" }))
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, completeInput({ attemptId: opened.attemptId }))
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
    await completeSprintLabAttempt(USER, completeInput({ attemptId: opened.attemptId }))
    expect(usageMocks.trackUsageEvent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER, service: "sprint-labs-grading", cost: 0 })
    )
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
    await completeSprintLabAttempt(USER, completeInput({ attemptId: opened.attemptId }))
    return { attemptId: opened.attemptId }
  }

  it("rejects a non-review-only ticket", async () => {
    seedRun("run1")
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, completeInput({ attemptId: opened.attemptId }))
    await expect(
      reviewSprintLabAttempt(USER, {
        runId: "run1",
        ticketKey: "MER-201",
        attemptId: opened.attemptId,
        decisions: [{ commentId: "c1", decision: "accept" }],
      })
    ).rejects.toThrow(SPRINT_LAB_ATTEMPT_ERRORS.NOT_REVIEW_ONLY)
  })

  it("releases correctness + trap + referenceDiff, and records mastery (I5), when the attempt IS finalized", async () => {
    const { attemptId } = await completeReviewOnlyAttempt()
    masteryMocks.recordSprintLabMastery.mockClear() // clear the (skipped, I5) complete-time non-call
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
    expect(outcome.scores.communication).toBe(100) // both decisions correct

    expect(masteryMocks.recordSprintLabMastery).toHaveBeenCalledTimes(1)
    expect(masteryMocks.recordSprintLabMastery).toHaveBeenCalledWith(
      USER,
      WORKBOOK_ID,
      expect.objectContaining({ key: "MER-201" }),
      expect.objectContaining({ finalized: true })
    )
  })

  it("does NOT release anything, and does NOT record mastery, when the attempt is NOT finalized (a re-attempt)", async () => {
    seedRun("run1")
    contentMocks.getTicket.mockResolvedValue(ticketFixture({ aiPolicy: "review-only" }))
    sealedMocks.loadSealedTicket.mockResolvedValue(
      sealedFixture({ review: [{ id: "c1", body: "x", correct: true }] })
    )
    // Seed a prior finalized attempt (I4: the finalize-once SENTINEL doc is
    // what actually decides "already finalized" now, not a scan over attempt
    // docs — both are seeded here so this fixture matches the real mechanism).
    h.store.set(`sprintLabRuns/run1/attempts/prior`, {
      ticketKey: "MER-201",
      variantId: "v-prior",
      attemptIndex: 0,
      aiPolicy: "review-only",
      openedAt: "2020-01-01T00:00:00.000Z",
      status: "completed",
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
      submittedAt: "2020-01-01T00:00:00.000Z",
    })
    h.store.set(`sprintLabRuns/run1/attemptsMeta/MER-201`, {
      finalizedByAttemptId: "prior",
      finalizedAt: "2020-01-01T00:00:00.000Z",
    })
    const opened = await openSprintLabAttempt(USER, { runId: "run1", ticketKey: "MER-201" })
    await completeSprintLabAttempt(USER, completeInput({ attemptId: opened.attemptId }))
    masteryMocks.recordSprintLabMastery.mockClear()

    const outcome = await reviewSprintLabAttempt(USER, {
      runId: "run1",
      ticketKey: "MER-201",
      attemptId: opened.attemptId,
      decisions: [{ commentId: "c1", decision: "accept" }],
    })
    expect(outcome.released).toBeUndefined()
    expect(masteryMocks.recordSprintLabMastery).not.toHaveBeenCalled()
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

  it("rejects an attemptId shaped with a path separator (attemptId shape validation, C1)", async () => {
    seedRun("run1")
    await expect(
      reviewSprintLabAttempt(USER, {
        runId: "run1",
        ticketKey: "MER-201",
        attemptId: "some/nested/path",
        decisions: [{ commentId: "c1", decision: "accept" }],
      })
    ).rejects.toThrow()
  })
})
