/**
 * Tests for migrateAllUsersToFsrs — the paginated, chunked, dry-run-capable
 * A/B-teardown sweep.
 *
 * The in-memory mock models just enough Firestore: a profiles collection with
 * documentId ordering/cursoring, per-user problem_mastery subcollections, and
 * WriteBatch with per-commit op counting (to pin the ≤400-op chunking).
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

interface FixtureDoc {
  id: string
  data: Record<string, unknown>
}

const h = vi.hoisted(() => ({
  profiles: [] as { id: string; data: Record<string, unknown> }[],
  cards: {} as Record<string, { id: string; data: Record<string, unknown> }[]>,
  batchCommitSizes: [] as number[],
  updates: [] as { path: string; data: Record<string, unknown> }[],
}))

vi.mock("@/lib/firebase-admin", () => {
  const profileDoc = (d: { id: string; data: Record<string, unknown> }) => ({
    id: d.id,
    data: () => d.data,
    ref: { path: `profiles/${d.id}` },
  })

  const makeQuery = (state: { limit?: number; after?: string }) => ({
    orderBy: () => makeQuery(state),
    limit: (n: number) => makeQuery({ ...state, limit: n }),
    startAfter: (id: string) => makeQuery({ ...state, after: id }),
    get: async () => {
      let docs = [...h.profiles].sort((a, b) => a.id.localeCompare(b.id))
      if (state.after !== undefined) docs = docs.filter((d) => d.id > state.after!)
      if (state.limit !== undefined) docs = docs.slice(0, state.limit)
      return { empty: docs.length === 0, docs: docs.map(profileDoc) }
    },
  })

  return {
    adminDb: {
      collection: (name: string) => {
        if (name === "profiles") return makeQuery({})
        if (name === "problem_mastery") {
          return {
            doc: (uid: string) => ({
              collection: () => ({
                get: async () => ({
                  docs: (h.cards[uid] ?? []).map((c) => ({
                    id: c.id,
                    data: () => c.data,
                    ref: { path: `problem_mastery/${uid}/problems/${c.id}` },
                  })),
                }),
              }),
            }),
          }
        }
        throw new Error(`unexpected collection ${name}`)
      },
      batch: () => {
        const ops: { path: string; data: Record<string, unknown> }[] = []
        return {
          update: (ref: { path: string }, data: Record<string, unknown>) => {
            ops.push({ path: ref.path, data })
          },
          commit: async () => {
            h.batchCommitSizes.push(ops.length)
            h.updates.push(...ops)
          },
        }
      },
    },
  }
})

import { migrateAllUsersToFsrs } from "../fsrs-migration"

const sm2Profile = (overrides: Record<string, unknown> = {}) => ({
  spaced_repetition_algorithm: "sm2",
  algorithm_user_overridden: false,
  ...overrides,
})

const sm2CardData = (overrides: Record<string, unknown> = {}) => ({
  ease_factor: 2.0,
  interval_days: 7,
  review_count: 3,
  next_review_at: "2026-08-02T09:00:00.000Z",
  last_reviewed_at: "2026-07-26T09:00:00.000Z",
  ...overrides,
})

/** Replay committed updates onto the fixtures (for idempotency re-runs). */
function applyCommittedUpdates() {
  for (const { path, data } of h.updates) {
    const parts = path.split("/")
    if (parts[0] === "profiles") {
      const profile = h.profiles.find((p) => p.id === parts[1])
      if (profile) profile.data = { ...profile.data, ...data }
    } else {
      const card = (h.cards[parts[1]] ?? []).find((c) => c.id === parts[3])
      if (card) card.data = { ...card.data, ...data }
    }
  }
  h.updates = []
  h.batchCommitSizes = []
}

beforeEach(() => {
  h.profiles = []
  h.cards = {}
  h.batchCommitSizes = []
  h.updates = []
})

describe("migrateAllUsersToFsrs", () => {
  it("dry run counts everything and writes nothing", async () => {
    h.profiles = [
      { id: "u1", data: sm2Profile() },
      { id: "u2", data: sm2Profile() },
    ]
    h.cards = {
      u1: [
        { id: "p1", data: sm2CardData() },
        { id: "p2", data: sm2CardData() },
      ],
      u2: [{ id: "p1", data: sm2CardData() }],
    }

    const result = await migrateAllUsersToFsrs({ dryRun: true })

    expect(result).toMatchObject({
      usersScanned: 2,
      usersFlippedToFsrs: 2,
      cardsConverted: 3,
      cardsSkipped: 0,
      nextCursor: null,
      dryRun: true,
    })
    expect(h.updates).toHaveLength(0)
    expect(h.batchCommitSizes).toHaveLength(0)
  })

  it("real run writes converted cards and arm flips", async () => {
    h.profiles = [{ id: "u1", data: sm2Profile() }]
    h.cards = { u1: [{ id: "p1", data: sm2CardData() }] }

    const result = await migrateAllUsersToFsrs()

    expect(result.usersFlippedToFsrs).toBe(1)
    expect(result.cardsConverted).toBe(1)

    const cardUpdate = h.updates.find((u) => u.path.includes("problems/p1"))!
    expect(typeof cardUpdate.data.fsrs_state).toBe("string")
    expect(cardUpdate.data.fsrs_stability).toBe(7)

    const profileUpdate = h.updates.find((u) => u.path === "profiles/u1")!
    expect(profileUpdate.data.spaced_repetition_algorithm).toBe("fsrs")
    expect(profileUpdate.data.algorithm_migrated_from).toBe("sm2")
  })

  it("chunks batches at 400 ops", async () => {
    h.profiles = [{ id: "u1", data: sm2Profile() }]
    h.cards = {
      u1: Array.from({ length: 450 }, (_, i) => ({
        id: `p${String(i).padStart(3, "0")}`,
        data: sm2CardData(),
      })),
    }

    const result = await migrateAllUsersToFsrs()

    expect(result.cardsConverted).toBe(450)
    // 450 card updates + 1 profile flip = 451 ops → [400, 51]
    expect(h.batchCommitSizes).toEqual([400, 51])
    expect(Math.max(...h.batchCommitSizes)).toBeLessThanOrEqual(400)
    expect(h.updates).toHaveLength(451)
  })

  it("paginates with a resumable cursor and never reprocesses", async () => {
    h.profiles = ["u1", "u2", "u3", "u4", "u5"].map((id) => ({
      id,
      data: sm2Profile(),
    }))
    h.cards = {}

    const first = await migrateAllUsersToFsrs({ maxUsers: 2, pageSize: 2 })
    expect(first.usersScanned).toBe(2)
    expect(first.nextCursor).toBe("u2")

    const second = await migrateAllUsersToFsrs({
      maxUsers: 2,
      pageSize: 2,
      cursor: first.nextCursor!,
    })
    expect(second.usersScanned).toBe(2)
    expect(second.nextCursor).toBe("u4")

    const third = await migrateAllUsersToFsrs({
      maxUsers: 2,
      pageSize: 2,
      cursor: second.nextCursor!,
    })
    expect(third.usersScanned).toBe(1)
    expect(third.nextCursor).toBeNull()

    // 5 distinct profile flips across the three invocations, no duplicates.
    const flippedPaths = h.updates.filter((u) => u.path.startsWith("profiles/")).map((u) => u.path)
    expect(new Set(flippedPaths).size).toBe(5)
    expect(flippedPaths).toHaveLength(5)
  })

  it("is idempotent: a re-run after applying writes converges to zero", async () => {
    h.profiles = [{ id: "u1", data: sm2Profile() }]
    h.cards = { u1: [{ id: "p1", data: sm2CardData() }] }

    const first = await migrateAllUsersToFsrs()
    expect(first.cardsConverted).toBe(1)
    applyCommittedUpdates()

    const second = await migrateAllUsersToFsrs()
    expect(second.usersFlippedToFsrs).toBe(0)
    expect(second.usersAlreadyFsrs).toBe(1)
    expect(second.cardsConverted).toBe(0)
    expect(second.cardsSkipped).toBe(1)
    expect(h.updates).toHaveLength(0)
  })

  it("skips the arm flip for overridden users but still converts their cards", async () => {
    h.profiles = [{ id: "u1", data: sm2Profile({ algorithm_user_overridden: true }) }]
    h.cards = { u1: [{ id: "p1", data: sm2CardData() }] }

    const result = await migrateAllUsersToFsrs()

    expect(result.usersOverriddenSkipped).toBe(1)
    expect(result.usersFlippedToFsrs).toBe(0)
    expect(result.cardsConverted).toBe(1)
    expect(h.updates.some((u) => u.path === "profiles/u1")).toBe(false)
  })

  it("upgrades blob-less cards of already-fsrs users without touching the profile", async () => {
    h.profiles = [{ id: "u1", data: { spaced_repetition_algorithm: "fsrs" } }]
    h.cards = { u1: [{ id: "p1", data: sm2CardData() }] }

    const result = await migrateAllUsersToFsrs()

    expect(result.usersAlreadyFsrs).toBe(1)
    expect(result.cardsConverted).toBe(1)
    expect(h.updates.some((u) => u.path === "profiles/u1")).toBe(false)
  })

  it("skips docs without SR scheduling state (no next_review_at)", async () => {
    h.profiles = [{ id: "u1", data: sm2Profile() }]
    h.cards = {
      u1: [
        { id: "legacy", data: { last_score: 80, review_count: 1 } },
        { id: "ok", data: sm2CardData() },
      ],
    }

    const result = await migrateAllUsersToFsrs()

    expect(result.cardsSkipped).toBe(1)
    expect(result.cardsConverted).toBe(1)
  })

  it("records per-user errors without aborting the sweep", async () => {
    h.profiles = [
      { id: "u1", data: sm2Profile() },
      { id: "u2", data: sm2Profile() },
    ]
    // u1's subcollection read explodes; u2 is fine.
    h.cards = new Proxy(
      { u2: [{ id: "p1", data: sm2CardData() }] },
      {
        get(target, prop: string) {
          if (prop === "u1") throw new Error("boom")
          return (target as Record<string, FixtureDoc[]>)[prop]
        },
      }
    ) as typeof h.cards

    const result = await migrateAllUsersToFsrs()

    expect(result.errors).toEqual([{ userId: "u1", message: "boom" }])
    expect(result.usersScanned).toBe(2)
    expect(result.cardsConverted).toBe(1)
  })
})
