/**
 * Service-layer tests for `seedWorkspaceFilesIfAbsent` (`../runs.ts`), kept in its own file rather
 * than added to the shared `runs.test.ts` (that file was mid-edit by other work at the time this
 * task landed; a fully disjoint file avoids any risk of two agents' changes colliding in one file's
 * diff, per this repo's own concurrent-agent commit rules).
 *
 * Firestore is faked in-memory, mirroring `runs.test.ts`'s own established pattern (`vi.hoisted` +
 * `vi.mock("@/lib/firebase-admin", ...)`), extended with a `create()` that fails if a doc already
 * exists at that path -- the same real `DocumentReference.create()` semantics
 * `seedWorkspaceFilesIfAbsent` now writes through (review round 1, MINOR-1: strict first-writer-wins
 * instead of a check-then-act `.set()`).
 *
 * Covers the review round 1 regression directly: a completed (or abandoned) run must seed as a
 * silent no-op, never a throw -- `requireOwnedActiveRun`'s 409 used to bubble out of the
 * `/runs/provision` route entirely, which meant a finished run's workspace never got its
 * materialized files back at all. See `app/api/sprint-labs/runs/provision/route.test.ts`'s own
 * "REGRESSION" test for the route-level half of this same fix.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import type { SprintLabRun } from "../types"

interface FakeDocRef {
  __fakePath: string
  get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>
  set: (data: Record<string, unknown>) => Promise<void>
  update: (data: Record<string, unknown>) => Promise<void>
  create: (data: Record<string, unknown>) => Promise<void>
  collection: (name: string) => FakeCollectionRef
}

interface FakeCollectionRef {
  doc: (id?: string) => FakeDocRef
  get: () => Promise<{ docs: Array<{ id: string; data: () => Record<string, unknown> }> }>
}

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>()
  /** docIds whose `.create()` must always reject, regardless of whether the fake store already
   *  has that path -- models "lost a create-race to a genuinely concurrent writer" without having
   *  to fabricate exact interleaving: the CONTRACT under test is "one rejected create must not
   *  block the others and must not throw out of the function", which this exercises directly. */
  const forceCreateRejectDocIds = new Set<string>()

  function directChildren(collectionPath: string) {
    const prefix = `${collectionPath}/`
    return Array.from(store.entries()).filter(
      ([key]) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/")
    )
  }

  function docRef(path: string): FakeDocRef {
    return {
      __fakePath: path,
      get: async () => {
        const data = store.get(path)
        return { exists: data !== undefined, data: () => (data ? { ...data } : undefined) }
      },
      set: async (data: Record<string, unknown>) => {
        store.set(path, { ...data })
      },
      update: async (data: Record<string, unknown>) => {
        const existing = store.get(path)
        if (existing === undefined) throw new Error(`fake firestore: update on missing doc ${path}`)
        store.set(path, { ...existing, ...data })
      },
      create: async (data: Record<string, unknown>) => {
        const docId = path.split("/").pop() as string
        if (forceCreateRejectDocIds.has(docId)) {
          throw new Error(`fake firestore: create forced to reject for ${path}`)
        }
        if (store.has(path)) {
          throw new Error(`fake firestore: create on existing doc ${path} (ALREADY_EXISTS)`)
        }
        store.set(path, { ...data })
      },
      collection: (name: string) => collectionRef(`${path}/${name}`),
    }
  }

  function collectionRef(collectionPath: string): FakeCollectionRef {
    return {
      doc: (id?: string) => docRef(`${collectionPath}/${id ?? `auto_${Math.random()}`}`),
      get: async () => ({
        docs: directChildren(collectionPath).map(([key, data]) => ({
          id: key.slice(collectionPath.length + 1),
          data: () => ({ ...data }),
        })),
      }),
    }
  }

  const adminDbFake = { collection: (name: string) => collectionRef(name) }

  return {
    adminDbFake,
    store,
    forceCreateRejectDocIds,
    reset: () => {
      store.clear()
      forceCreateRejectDocIds.clear()
    },
  }
})

vi.mock("@/lib/firebase-admin", () => ({ adminDb: h.adminDbFake }))
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))
vi.mock("@/lib/sprint-labs/content/registry", () => ({
  getWorkbookSummary: vi.fn(),
  getSprint: vi.fn(),
  getTicket: vi.fn(),
}))

import { seedWorkspaceFilesIfAbsent, SPRINT_LAB_RUN_ERRORS } from "../runs"

const USER = "user_alice"
const OTHER = "user_mallory"

function seedRun(id: string, overrides: Partial<SprintLabRun> = {}): void {
  const run: SprintLabRun = {
    userId: USER,
    workbookId: "meridian",
    contentVersion: "v1",
    currentSprint: 1,
    board: { "MER-101": "todo" },
    status: "in_progress",
    startedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
  h.store.set(`sprintLabRuns/${id}`, run)
}

function fileDoc(runId: string, path: string): Record<string, unknown> | undefined {
  return h.store.get(`sprintLabRuns/${runId}/files/${encodeURIComponent(path)}`)
}

describe("seedWorkspaceFilesIfAbsent", () => {
  beforeEach(() => {
    h.reset()
  })

  it("returns [] immediately for an empty files array (no reads, no writes)", async () => {
    seedRun("run1")
    const written = await seedWorkspaceFilesIfAbsent(USER, "run1", [])
    expect(written).toEqual([])
  })

  it("seeds every path absent from the store", async () => {
    seedRun("run1")
    const written = await seedWorkspaceFilesIfAbsent(USER, "run1", [
      { path: "src/a.ts", content: "export const a = 1" },
      { path: "src/b.ts", content: "export const b = 2" },
    ])

    expect(written.map((f) => f.path).sort()).toEqual(["src/a.ts", "src/b.ts"])
    expect(fileDoc("run1", "src/a.ts")).toMatchObject({
      content: "export const a = 1",
      revision: 1,
    })
    expect(fileDoc("run1", "src/b.ts")).toMatchObject({
      content: "export const b = 2",
      revision: 1,
    })
  })

  it("never overwrites a path already present, while still seeding a co-occurring new path", async () => {
    seedRun("run1")
    h.store.set(`sprintLabRuns/run1/files/${encodeURIComponent("src/a.ts")}`, {
      path: "src/a.ts",
      content: "LEARNER'S OWN SAVED EDIT",
      updatedAt: "2026-01-01T00:00:00.000Z",
      revision: 5,
    })

    const written = await seedWorkspaceFilesIfAbsent(USER, "run1", [
      { path: "src/a.ts", content: "provisioned content that must NOT land" },
      { path: "src/b.ts", content: "genuinely new path" },
    ])

    expect(written.map((f) => f.path)).toEqual(["src/b.ts"])
    expect(fileDoc("run1", "src/a.ts")).toMatchObject({
      content: "LEARNER'S OWN SAVED EDIT",
      revision: 5,
    })
  })

  it("a rejected create() for one path (lost race / any failure) does not block the others, and is silently dropped rather than thrown (MINOR-1)", async () => {
    seedRun("run1")
    h.forceCreateRejectDocIds.add(encodeURIComponent("src/raced.ts"))

    const written = await seedWorkspaceFilesIfAbsent(USER, "run1", [
      { path: "src/raced.ts", content: "lost the race" },
      { path: "src/fine.ts", content: "won cleanly" },
    ])

    expect(written.map((f) => f.path)).toEqual(["src/fine.ts"])
    expect(fileDoc("run1", "src/raced.ts")).toBeUndefined()
    expect(fileDoc("run1", "src/fine.ts")).toMatchObject({ content: "won cleanly" })
  })

  it("REGRESSION (review round 1): a COMPLETED run seeds as a silent no-op, never a throw", async () => {
    seedRun("run1", { status: "completed" })

    const written = await seedWorkspaceFilesIfAbsent(USER, "run1", [
      { path: "src/a.ts", content: "should not be written" },
    ])

    expect(written).toEqual([])
    expect(fileDoc("run1", "src/a.ts")).toBeUndefined()
  })

  it("an ABANDONED run also seeds as a silent no-op, never a throw", async () => {
    seedRun("run1", { status: "abandoned" })

    const written = await seedWorkspaceFilesIfAbsent(USER, "run1", [
      { path: "src/a.ts", content: "should not be written" },
    ])

    expect(written).toEqual([])
  })

  it("still throws NOT_FOUND for a run that does not exist (ownership check is not bypassed by the tolerant-status fix)", async () => {
    await expect(
      seedWorkspaceFilesIfAbsent(USER, "does-not-exist", [{ path: "src/a.ts", content: "x" }])
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.NOT_FOUND)
  })

  it("still throws UNAUTHORIZED for a run owned by someone else", async () => {
    seedRun("run1", { userId: OTHER })

    await expect(
      seedWorkspaceFilesIfAbsent(USER, "run1", [{ path: "src/a.ts", content: "x" }])
    ).rejects.toThrow(SPRINT_LAB_RUN_ERRORS.UNAUTHORIZED)
  })
})
