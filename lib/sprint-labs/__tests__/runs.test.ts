/**
 * Service-layer tests for Sprint Lab run persistence (`../runs.ts`).
 *
 * Firestore is faked in-memory (path -> data map) rather than stubbed call by
 * call: the service touches a run doc, a `files` subcollection, queries, and
 * batched writes, and a generic fake makes those interactions readable as
 * ordinary async calls instead of a wall of ad hoc `vi.fn()` wiring. Modeled
 * on the repo's existing `vi.hoisted` + `vi.mock("@/lib/firebase-admin", ...)`
 * pattern (see lib/spaced-repetition/__tests__/defer-single-problem.test.ts).
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { SprintLabRun } from "../types"
import { MAX_WORKSPACE_FILE_CONTENT_CHARS } from "../types"

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
        if (existing === undefined) {
          throw new Error(`fake firestore: update on missing doc ${path}`)
        }
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
    batch: () => {
      const ops: Array<{ path: string; data: Record<string, unknown>; kind: "set" | "update" }> = []
      return {
        set: (ref: FakeDocRef, data: Record<string, unknown>) => {
          ops.push({ path: ref.__fakePath, data, kind: "set" })
        },
        update: (ref: FakeDocRef, data: Record<string, unknown>) => {
          ops.push({ path: ref.__fakePath, data, kind: "update" })
        },
        commit: async () => {
          for (const op of ops) {
            if (op.kind === "update") {
              const existing = store.get(op.path)
              store.set(op.path, { ...(existing ?? {}), ...op.data })
            } else {
              store.set(op.path, { ...op.data })
            }
          }
        },
      }
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
vi.mock("@/lib/logger", () => ({
  logger: { ...loggerSpies, info: vi.fn(), debug: vi.fn() },
}))

/**
 * Stubs the compiled-content registry (fix round 2026-08-26, I4). Kept
 * independent of the real fixture-demo content Task 2 authored: this service
 * test should not break if that content changes shape, and it lets every
 * existing fixture below keep using "meridian"/"MER-*" without rewriting them
 * against "fixture-demo"/"DEMO-*".
 *
 * Every stub is `async` (fix round 2, OPEN 1): the real
 * `getSprint`/`getTicket` return Promises (lazy dynamic-import content
 * loading), and `requireKnownWorkbookAndTickets` used to call them
 * synchronously — `!aPromise` is always `false`, so the "unknown" branches
 * never fired in production, but a plain-synchronous mock here made every
 * assertion pass anyway and hid it. Stubbing these as `async function`s
 * (real Promises, not synchronous values) is what makes this test file
 * exercise the actual contract instead of masking a missing `await` again.
 */
const KNOWN_WORKBOOK_ID = "meridian"
const KNOWN_SPRINTS = new Set([1, 2])
const KNOWN_TICKET_KEYS = new Set(["MER-101", "MER-102", "MER-201", "MER-202"])
// vi.fn()-wrapped (not plain arrow functions) so a specific test can override
// one call's resolution timing with mockImplementationOnce — see the
// deliberately macrotask-delayed regression test below.
const registryMocks = vi.hoisted(() => ({
  getWorkbookSummary: vi.fn(),
  getSprint: vi.fn(),
  getTicket: vi.fn(),
}))
registryMocks.getWorkbookSummary.mockImplementation(async (workbookId: string) =>
  workbookId === KNOWN_WORKBOOK_ID ? { id: workbookId } : undefined
)
registryMocks.getSprint.mockImplementation(async (workbookId: string, sprintNumber: number) =>
  workbookId === KNOWN_WORKBOOK_ID && KNOWN_SPRINTS.has(sprintNumber)
    ? { number: sprintNumber }
    : undefined
)
registryMocks.getTicket.mockImplementation(async (workbookId: string, ticketKey: string) =>
  workbookId === KNOWN_WORKBOOK_ID && KNOWN_TICKET_KEYS.has(ticketKey)
    ? { key: ticketKey }
    : undefined
)
vi.mock("@/lib/sprint-labs/content/registry", () => registryMocks)

import {
  SPRINT_LAB_RUN_ERRORS,
  advanceSprintLabRun,
  createSprintLabRun,
  getActiveSprintLabRun,
  getSprintLabRun,
  isLegalBoardTransition,
  listWorkspaceFiles,
  moveSprintLabTicket,
  saveWorkspaceFiles,
  sprintLabRunErrorStatus,
} from "../runs"

const USER = "user_alice"
const OTHER = "user_mallory"

/** Seed a run doc directly, bypassing the service — the way an existing Firestore doc looks. */
function seedRun(id: string, overrides: Partial<SprintLabRun> = {}): SprintLabRun {
  const run: SprintLabRun = {
    userId: USER,
    workbookId: "meridian",
    contentVersion: "v1",
    currentSprint: 1,
    board: { "MER-101": "todo", "MER-102": "todo" },
    status: "in_progress",
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
  h.store.set(`sprintLabRuns/${id}`, { ...run })
  return run
}

beforeEach(() => {
  h.reset()
  loggerSpies.warn.mockClear()
  loggerSpies.error.mockClear()
})

describe("isLegalBoardTransition", () => {
  it.each([
    ["todo", "doing", true],
    ["doing", "review", true],
    ["review", "done", true],
    ["review", "doing", true],
  ] as const)("%s -> %s is %s", (from, to, expected) => {
    expect(isLegalBoardTransition(from, to)).toBe(expected)
  })

  it.each([
    ["todo", "review"],
    ["todo", "done"],
    ["todo", "todo"],
    ["doing", "todo"],
    ["doing", "done"],
    ["doing", "doing"],
    ["review", "todo"],
    ["review", "review"],
    ["done", "todo"],
    ["done", "doing"],
    ["done", "review"],
    ["done", "done"],
  ] as const)("REJECTS %s -> %s", (from, to) => {
    expect(isLegalBoardTransition(from, to)).toBe(false)
  })
})

describe("createSprintLabRun", () => {
  it("creates a fresh run with the board seeded to todo for every ticket key", async () => {
    const run = await createSprintLabRun(USER, {
      workbookId: "meridian",
      contentVersion: "v1",
      ticketKeys: ["MER-101", "MER-102"],
    })
    expect(run.userId).toBe(USER)
    expect(run.currentSprint).toBe(1)
    expect(run.status).toBe("in_progress")
    expect(run.board).toEqual({ "MER-101": "todo", "MER-102": "todo" })
    expect(run.id).toBeTruthy()
  })

  it("rejects empty ticketKeys", async () => {
    await expect(
      createSprintLabRun(USER, { workbookId: "meridian", contentVersion: "v1", ticketKeys: [] })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  it("resumes (returns the same doc) when an in_progress run already exists for that workbook", async () => {
    const first = await createSprintLabRun(USER, {
      workbookId: "meridian",
      contentVersion: "v1",
      ticketKeys: ["MER-101"],
    })
    const second = await createSprintLabRun(USER, {
      workbookId: "meridian",
      contentVersion: "v2",
      ticketKeys: ["MER-999"],
    })
    expect(second.id).toBe(first.id)
    // The resumed run is untouched by the second call's (different) inputs.
    expect(second.contentVersion).toBe("v1")
    expect(second.board).toEqual({ "MER-101": "todo" })
  })

  it("starts a brand new run when the only existing run for that workbook is completed", async () => {
    seedRun("completed-run", { status: "completed", completedAt: "2026-01-02T00:00:00.000Z" })
    const run = await createSprintLabRun(USER, {
      workbookId: "meridian",
      contentVersion: "v2",
      ticketKeys: ["MER-101"],
    })
    expect(run.id).not.toBe("completed-run")
    expect(run.status).toBe("in_progress")
  })

  // I4: registry validation (fix round 2026-08-26).
  it("rejects an unknown workbookId", async () => {
    await expect(
      createSprintLabRun(USER, {
        workbookId: "not-a-real-workbook",
        contentVersion: "v1",
        ticketKeys: ["MER-101"],
      })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  it("rejects a ticket key that does not exist in the compiled workbook", async () => {
    await expect(
      createSprintLabRun(USER, {
        workbookId: "meridian",
        contentVersion: "v1",
        ticketKeys: ["MER-101", "MER-FORGED"],
      })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  // Fix round 2, OPEN 1 regression: requireKnownWorkbookAndTickets used to
  // call getTicket synchronously (`if (!getTicket(...))`), which is always
  // false on a Promise, so this branch never fired in production even though
  // it was covered by the test above — a plain synchronous mock made
  // "!examplePromise" moot by never producing a Promise in the first place.
  // Forcing THIS call's resolution onto a real macrotask (setTimeout, not
  // just an already-queued microtask) proves the validator genuinely awaits
  // the registry rather than happening to work by synchronous coincidence.
  it("rejects a fabricated ticket key even when the registry resolves on a later tick (regression: must await, not synchronously truth-test, a Promise)", async () => {
    registryMocks.getTicket.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined), 0))
    )
    await expect(
      createSprintLabRun(USER, {
        workbookId: "meridian",
        contentVersion: "v1",
        ticketKeys: ["MER-DELAYED-FORGED"],
      })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  it("does NOT validate ticketKeys against the registry on a resume (they are discarded anyway)", async () => {
    const first = await createSprintLabRun(USER, {
      workbookId: "meridian",
      contentVersion: "v1",
      ticketKeys: ["MER-101"],
    })
    // A resume call with a forged ticket key must still resume cleanly: the
    // second call's ticketKeys are never applied to an already-active run.
    const second = await createSprintLabRun(USER, {
      workbookId: "meridian",
      contentVersion: "v1",
      ticketKeys: ["totally-made-up"],
    })
    expect(second.id).toBe(first.id)
  })
})

describe("getActiveSprintLabRun (resume ordering)", () => {
  it("returns null when the user has no runs for the workbook", async () => {
    expect(await getActiveSprintLabRun(USER, "meridian")).toBeNull()
  })

  it("prefers an in_progress run over a more-recently-updated completed run", async () => {
    seedRun("completed", {
      status: "completed",
      updatedAt: "2026-06-01T00:00:00.000Z",
    })
    seedRun("in-progress", {
      status: "in_progress",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })
    const active = await getActiveSprintLabRun(USER, "meridian")
    expect(active?.id).toBe("in-progress")
  })

  it("falls back to the most-recently-updated completed run when nothing is in progress", async () => {
    seedRun("older-completed", { status: "completed", updatedAt: "2026-01-01T00:00:00.000Z" })
    seedRun("newer-completed", { status: "completed", updatedAt: "2026-02-01T00:00:00.000Z" })
    const active = await getActiveSprintLabRun(USER, "meridian")
    expect(active?.id).toBe("newer-completed")
  })

  it("ignores abandoned runs", async () => {
    seedRun("abandoned", { status: "abandoned", updatedAt: "2026-03-01T00:00:00.000Z" })
    expect(await getActiveSprintLabRun(USER, "meridian")).toBeNull()
  })

  it("ignores runs for a different workbook or a different user", async () => {
    seedRun("other-workbook", { workbookId: "not-meridian" })
    seedRun("other-user", { userId: OTHER })
    expect(await getActiveSprintLabRun(USER, "meridian")).toBeNull()
  })
})

describe("moveSprintLabTicket", () => {
  it("applies a legal transition and sets currentTicketKey on entering doing", async () => {
    seedRun("run1")
    const run = await moveSprintLabTicket(USER, {
      runId: "run1",
      ticketKey: "MER-101",
      to: "doing",
    })
    expect(run.board["MER-101"]).toBe("doing")
    expect(run.currentTicketKey).toBe("MER-101")

    // Persisted, not just returned.
    const reloaded = await getSprintLabRun(USER, "run1")
    expect(reloaded?.board["MER-101"]).toBe("doing")
  })

  it("allows review -> doing (reopen)", async () => {
    seedRun("run1", { board: { "MER-101": "review" } })
    const run = await moveSprintLabTicket(USER, {
      runId: "run1",
      ticketKey: "MER-101",
      to: "doing",
    })
    expect(run.board["MER-101"]).toBe("doing")
  })

  it("rejects an illegal transition and leaves the board unchanged", async () => {
    seedRun("run1", { board: { "MER-101": "todo" } })
    await expect(
      moveSprintLabTicket(USER, { runId: "run1", ticketKey: "MER-101", to: "done" })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.INVALID_TRANSITION)

    const reloaded = await getSprintLabRun(USER, "run1")
    expect(reloaded?.board["MER-101"]).toBe("todo")
  })

  it("rejects moving a second ticket to doing while one is already doing", async () => {
    seedRun("run1", { board: { "MER-101": "doing", "MER-102": "todo" } })
    await expect(
      moveSprintLabTicket(USER, { runId: "run1", ticketKey: "MER-102", to: "doing" })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.TICKET_ALREADY_DOING)
  })

  it("allows a review -> doing reopen even while that SAME ticket already occupies the doing slot conceptually (no other ticket is doing)", async () => {
    // MER-101 is the one in review; nothing else is "doing", so reopening it is fine.
    seedRun("run1", { board: { "MER-101": "review", "MER-102": "done" } })
    const run = await moveSprintLabTicket(USER, {
      runId: "run1",
      ticketKey: "MER-101",
      to: "doing",
    })
    expect(run.board["MER-101"]).toBe("doing")
  })

  it("rejects an unknown ticket key", async () => {
    seedRun("run1")
    await expect(
      moveSprintLabTicket(USER, { runId: "run1", ticketKey: "MER-999", to: "doing" })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.UNKNOWN_TICKET)
  })

  it("rejects a run owned by another user", async () => {
    seedRun("run1", { userId: OTHER })
    await expect(
      moveSprintLabTicket(USER, { runId: "run1", ticketKey: "MER-101", to: "doing" })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.UNAUTHORIZED)
  })

  it("rejects a nonexistent run", async () => {
    await expect(
      moveSprintLabTicket(USER, { runId: "does-not-exist", ticketKey: "MER-101", to: "doing" })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.NOT_FOUND)
  })

  // M8: mutations closed on a completed/abandoned run (fix round 2026-08-26).
  it.each(["completed", "abandoned"] as const)(
    "rejects moving a ticket on a %s run",
    async (status) => {
      seedRun("run1", { status })
      await expect(
        moveSprintLabTicket(USER, { runId: "run1", ticketKey: "MER-101", to: "doing" })
      ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.RUN_NOT_ACTIVE)
    }
  )
})

describe("advanceSprintLabRun", () => {
  it("advances to the next sprint, merging new ticket keys as todo without disturbing existing ones", async () => {
    seedRun("run1", {
      currentSprint: 1,
      board: { "MER-101": "done", "MER-102": "review" },
    })
    const run = await advanceSprintLabRun(USER, {
      runId: "run1",
      toSprint: 2,
      ticketKeys: ["MER-102", "MER-201", "MER-202"],
    })
    expect(run.currentSprint).toBe(2)
    expect(run.board).toEqual({
      "MER-101": "done",
      "MER-102": "review", // untouched even though it reappears in the new ticketKeys list
      "MER-201": "todo",
      "MER-202": "todo",
    })
  })

  it("rejects skipping a sprint", async () => {
    seedRun("run1", { currentSprint: 1 })
    await expect(
      advanceSprintLabRun(USER, { runId: "run1", toSprint: 3, ticketKeys: [] })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.INVALID_SPRINT_ADVANCE)
  })

  it("rejects advancing a run owned by another user", async () => {
    seedRun("run1", { userId: OTHER, currentSprint: 1 })
    await expect(
      advanceSprintLabRun(USER, { runId: "run1", toSprint: 2, ticketKeys: [] })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.UNAUTHORIZED)
  })

  // I4: registry validation (fix round 2026-08-26). currentSprint: 2 -> toSprint: 3 passes
  // the sequential check (3 === 2+1) so this specifically exercises the registry's
  // sprint-existence check, not the sequencing rule.
  it("rejects advancing into a sprint the workbook has not compiled", async () => {
    seedRun("run1", { currentSprint: 2 })
    await expect(
      advanceSprintLabRun(USER, { runId: "run1", toSprint: 3, ticketKeys: [] })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  it("rejects advancing with a ticket key that does not exist in the compiled workbook", async () => {
    seedRun("run1", { currentSprint: 1 })
    await expect(
      advanceSprintLabRun(USER, { runId: "run1", toSprint: 2, ticketKeys: ["MER-FORGED"] })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  // M8: mutations closed on a completed/abandoned run (fix round 2026-08-26).
  it.each(["completed", "abandoned"] as const)("rejects advancing a %s run", async (status) => {
    seedRun("run1", { currentSprint: 1, status })
    await expect(
      advanceSprintLabRun(USER, { runId: "run1", toSprint: 2, ticketKeys: [] })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.RUN_NOT_ACTIVE)
  })
})

describe("saveWorkspaceFiles / listWorkspaceFiles", () => {
  it("saves new files at revision 1 and lists them sorted by path", async () => {
    seedRun("run1")
    await saveWorkspaceFiles(USER, {
      runId: "run1",
      files: [
        { path: "src/b.ts", content: "b" },
        { path: "src/a.ts", content: "a" },
      ],
    })
    const files = await listWorkspaceFiles(USER, "run1")
    expect(files.map((f) => f.path)).toEqual(["src/a.ts", "src/b.ts"])
    expect(files.every((f) => f.revision === 1)).toBe(true)
    expect(files.every((f) => typeof f.updatedAt === "string")).toBe(true)
  })

  it("does not log a malformed-doc warning for an ordinary first-time save (no prior doc to parse)", async () => {
    seedRun("run1")
    await saveWorkspaceFiles(USER, { runId: "run1", files: [{ path: "src/new.ts", content: "x" }] })
    expect(loggerSpies.warn).not.toHaveBeenCalled()
  })

  it("increments revision on a subsequent save of the same path", async () => {
    seedRun("run1")
    await saveWorkspaceFiles(USER, { runId: "run1", files: [{ path: "src/a.ts", content: "v1" }] })
    const saved = await saveWorkspaceFiles(USER, {
      runId: "run1",
      files: [{ path: "src/a.ts", content: "v2" }],
    })
    expect(saved[0].revision).toBe(2)
    expect(saved[0].content).toBe("v2")
  })

  it("rejects the whole batch when one file exceeds the content cap (oversize rejection), writing nothing", async () => {
    seedRun("run1")
    const oversized = "a".repeat(MAX_WORKSPACE_FILE_CONTENT_CHARS + 1)
    await expect(
      saveWorkspaceFiles(USER, {
        runId: "run1",
        files: [
          { path: "src/ok.ts", content: "fine" },
          { path: "src/too-big.ts", content: oversized },
        ],
      })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)

    const files = await listWorkspaceFiles(USER, "run1")
    expect(files).toHaveLength(0)
  })

  it("accepts content at exactly the cap", async () => {
    seedRun("run1")
    const atCap = "a".repeat(MAX_WORKSPACE_FILE_CONTENT_CHARS)
    const saved = await saveWorkspaceFiles(USER, {
      runId: "run1",
      files: [{ path: "src/at-cap.ts", content: atCap }],
    })
    expect(saved[0].content).toHaveLength(MAX_WORKSPACE_FILE_CONTENT_CHARS)
  })

  it("rejects an invalid workspace path", async () => {
    seedRun("run1")
    await expect(
      saveWorkspaceFiles(USER, {
        runId: "run1",
        files: [{ path: "../escape.ts", content: "x" }],
      })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  it("rejects a batch over the per-call file limit", async () => {
    seedRun("run1")
    const files = Array.from({ length: 41 }, (_, i) => ({ path: `src/f${i}.ts`, content: "x" }))
    await expect(saveWorkspaceFiles(USER, { runId: "run1", files })).rejects.toThrow(
      SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED
    )
  })

  it("rejects saving to a run owned by another user", async () => {
    seedRun("run1", { userId: OTHER })
    await expect(
      saveWorkspaceFiles(USER, { runId: "run1", files: [{ path: "src/a.ts", content: "x" }] })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.UNAUTHORIZED)
  })

  it("rejects listing files for a run owned by another user", async () => {
    seedRun("run1", { userId: OTHER })
    await expect(listWorkspaceFiles(USER, "run1")).rejects.toThrow(
      SPRINT_LAB_RUN_ERRORS.UNAUTHORIZED
    )
  })

  it("returns an empty list for a run with no saved files yet", async () => {
    seedRun("run1")
    expect(await listWorkspaceFiles(USER, "run1")).toEqual([])
  })

  // M6: duplicate-path rejection (fix round 2026-08-26).
  it("rejects a batch containing the same path twice", async () => {
    seedRun("run1")
    await expect(
      saveWorkspaceFiles(USER, {
        runId: "run1",
        files: [
          { path: "src/a.ts", content: "one" },
          { path: "src/a.ts", content: "two" },
        ],
      })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
    expect(await listWorkspaceFiles(USER, "run1")).toEqual([])
  })

  // M7: the run's own updatedAt moves on a file save (fix round 2026-08-26).
  it("bumps the run's updatedAt after a file save", async () => {
    seedRun("run1", { updatedAt: "2020-01-01T00:00:00.000Z" })
    await saveWorkspaceFiles(USER, { runId: "run1", files: [{ path: "src/a.ts", content: "x" }] })
    const reloaded = await getSprintLabRun(USER, "run1")
    expect(reloaded?.updatedAt).not.toBe("2020-01-01T00:00:00.000Z")
  })

  // M10: reserved/oversize Firestore doc ids (fix round 2026-08-26).
  it("rejects a path that encodes to a reserved Firestore doc id", async () => {
    seedRun("run1")
    await expect(
      saveWorkspaceFiles(USER, { runId: "run1", files: [{ path: "__proto__", content: "x" }] })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  it("rejects a path whose encoded doc id exceeds the byte cap", async () => {
    seedRun("run1")
    // isValidWorkspacePath has no length limit of its own; a very long single
    // segment is otherwise a perfectly "valid" workspace path.
    const hugePath = `src/${"a".repeat(1500)}.ts`
    await expect(
      saveWorkspaceFiles(USER, { runId: "run1", files: [{ path: hugePath, content: "x" }] })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  // Per-run file-count ceiling (fix round 2026-08-26, I5).
  it("rejects a save that would push the run's total file count over the per-run ceiling", async () => {
    seedRun("run1")
    for (let i = 0; i < 200; i++) {
      h.store.set(`sprintLabRuns/run1/files/src%2Ff${i}.ts`, {
        path: `src/f${i}.ts`,
        content: "x",
        updatedAt: "2026-01-01T00:00:00.000Z",
        revision: 1,
      })
    }
    await expect(
      saveWorkspaceFiles(USER, {
        runId: "run1",
        files: [{ path: "src/one-too-many.ts", content: "x" }],
      })
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED)
  })

  it("allows re-saving an EXISTING file even when the run is already at the per-run ceiling", async () => {
    seedRun("run1")
    for (let i = 0; i < 200; i++) {
      h.store.set(`sprintLabRuns/run1/files/src%2Ff${i}.ts`, {
        path: `src/f${i}.ts`,
        content: "x",
        updatedAt: "2026-01-01T00:00:00.000Z",
        revision: 1,
      })
    }
    const saved = await saveWorkspaceFiles(USER, {
      runId: "run1",
      files: [{ path: "src/f0.ts", content: "updated" }],
    })
    expect(saved[0].revision).toBe(2)
  })

  // M8: mutations closed on a completed/abandoned run, but reads still work (fix round 2026-08-26).
  it.each(["completed", "abandoned"] as const)(
    "rejects saving files to a %s run",
    async (status) => {
      seedRun("run1", { status })
      await expect(
        saveWorkspaceFiles(USER, { runId: "run1", files: [{ path: "src/a.ts", content: "x" }] })
      ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.RUN_NOT_ACTIVE)
    }
  )

  it.each(["completed", "abandoned"] as const)(
    "still allows LISTING files on a %s run (reads stay open)",
    async (status) => {
      seedRun("run1", { status: "in_progress" })
      await saveWorkspaceFiles(USER, { runId: "run1", files: [{ path: "src/a.ts", content: "x" }] })
      // Flip status after saving, the way a real run would reach a finished state.
      const raw = h.store.get("sprintLabRuns/run1")
      h.store.set("sprintLabRuns/run1", { ...raw, status })
      await expect(listWorkspaceFiles(USER, "run1")).resolves.toHaveLength(1)
    }
  )
})

describe("sprintLabRunErrorStatus", () => {
  it.each([
    [SPRINT_LAB_RUN_ERRORS.NOT_FOUND, 404],
    [SPRINT_LAB_RUN_ERRORS.UNAUTHORIZED, 403],
    [SPRINT_LAB_RUN_ERRORS.VALIDATION_FAILED, 400],
    [SPRINT_LAB_RUN_ERRORS.UNKNOWN_TICKET, 409],
    [SPRINT_LAB_RUN_ERRORS.INVALID_TRANSITION, 409],
    [SPRINT_LAB_RUN_ERRORS.TICKET_ALREADY_DOING, 409],
    [SPRINT_LAB_RUN_ERRORS.INVALID_SPRINT_ADVANCE, 409],
    [SPRINT_LAB_RUN_ERRORS.RUN_NOT_ACTIVE, 409],
  ])("maps %s to %i", (code, status) => {
    expect(sprintLabRunErrorStatus(new Error(code))).toBe(status)
  })

  it("returns null for an error it doesn't recognize (caller should 500)", () => {
    expect(sprintLabRunErrorStatus(new Error("something else"))).toBeNull()
    expect(sprintLabRunErrorStatus("not even an Error")).toBeNull()
  })
})
