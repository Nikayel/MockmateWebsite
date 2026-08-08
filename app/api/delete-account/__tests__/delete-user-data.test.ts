/**
 * Regression tests for GDPR account erasure.
 *
 * The bug: the route built every delete into one `adminDb.batch()`. Firestore
 * caps a write batch at 500 operations and enforces it at commit(), so a user
 * with enough history got a throw at the very last step, saw a generic toast,
 * and kept 100% of their data while believing it was gone. A silently failing
 * erasure is the worst possible version of this bug, so the batch arithmetic
 * and the honesty of the reporting are both pinned down here.
 */

import { describe, expect, it, vi } from "vitest"
import type { DocumentReference, Firestore } from "firebase-admin/firestore"

import {
  MAX_DELETES_PER_BATCH,
  chunk,
  deleteAllUserData,
  deleteInChunks,
} from "../delete-user-data"
import { USER_KEYED_DOCUMENTS, USER_KEYED_QUERIES } from "../user-data-map"

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

/** Firestore's own hard limit. MAX_DELETES_PER_BATCH must stay under it. */
const FIRESTORE_BATCH_LIMIT = 500

function fakeRefs(count: number): DocumentReference[] {
  return Array.from(
    { length: count },
    (_unused, index) => ({ path: `col/doc-${index}` }) as unknown as DocumentReference
  )
}

/**
 * A Firestore stand-in that records the size of every committed batch, which is
 * the only property that actually mattered in the production failure.
 */
function fakeDb() {
  const committedBatchSizes: number[] = []

  const db = {
    batch() {
      let pending = 0
      return {
        delete: () => {
          pending += 1
        },
        commit: async () => {
          committedBatchSizes.push(pending)
        },
      }
    },
  } as unknown as Firestore

  return { db, committedBatchSizes }
}

describe("chunk", () => {
  it("splits evenly divisible input", () => {
    expect(chunk([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it("keeps the remainder in a final short chunk", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })

  it("returns nothing for empty input, so no empty batch is ever committed", () => {
    expect(chunk([], 400)).toEqual([])
  })

  it("rejects a zero size rather than looping forever", () => {
    expect(() => chunk([1], 0)).toThrow(/at least 1/)
  })
})

describe("deleteInChunks", () => {
  it("keeps MAX_DELETES_PER_BATCH below the Firestore cap", () => {
    expect(MAX_DELETES_PER_BATCH).toBeLessThan(FIRESTORE_BATCH_LIMIT)
  })

  it("commits nothing when there is nothing to delete", async () => {
    const { db, committedBatchSizes } = fakeDb()

    expect(await deleteInChunks(db, [])).toBe(0)
    expect(committedBatchSizes).toEqual([])
  })

  it("uses a single batch when the work fits in one", async () => {
    const { db, committedBatchSizes } = fakeDb()

    expect(await deleteInChunks(db, fakeRefs(10))).toBe(10)
    expect(committedBatchSizes).toEqual([10])
  })

  it("never exceeds the 500-op cap for a heavy user (the original bug)", async () => {
    const { db, committedBatchSizes } = fakeDb()
    // 1,203 documents is entirely reachable: interview sessions plus usage
    // events for an active user. The old single-batch code threw here.
    const total = 1203

    expect(await deleteInChunks(db, fakeRefs(total))).toBe(total)

    expect(committedBatchSizes.length).toBeGreaterThan(1)
    for (const size of committedBatchSizes) {
      expect(size).toBeLessThanOrEqual(MAX_DELETES_PER_BATCH)
      expect(size).toBeLessThan(FIRESTORE_BATCH_LIMIT)
    }
    expect(committedBatchSizes.reduce((sum, size) => sum + size, 0)).toBe(total)
  })

  it("commits exactly one full batch at the boundary, with no trailing empty batch", async () => {
    const { db, committedBatchSizes } = fakeDb()

    await deleteInChunks(db, fakeRefs(MAX_DELETES_PER_BATCH))

    expect(committedBatchSizes).toEqual([MAX_DELETES_PER_BATCH])
  })
})

describe("deleteAllUserData", () => {
  const USER_ID = "user-123"

  /**
   * Drives the real routine against an in-memory Firestore so we can assert on
   * which collections and fields it actually touched.
   */
  function scriptedDb(options: { failingCollections?: string[]; docsPerQuery?: number } = {}) {
    const failing = new Set(options.failingCollections ?? [])
    const docsPerQuery = options.docsPerQuery ?? 0

    const recursivelyDeleted: string[] = []
    const queriedFields: { collection: string; field: string }[] = []
    const committedBatchSizes: number[] = []

    const db = {
      collection(name: string) {
        return {
          doc: () => ({
            path: `${name}/${USER_ID}`,
            get: async () => {
              if (failing.has(name)) throw new Error(`boom: ${name}`)
              return { exists: true }
            },
          }),
          where: (field: string, _op: string, _value: unknown) => ({
            get: async () => {
              if (failing.has(name)) throw new Error(`boom: ${name}`)
              queriedFields.push({ collection: name, field })
              return {
                docs: Array.from({ length: docsPerQuery }, (_unused, index) => ({
                  ref: { path: `${name}/doc-${index}` },
                })),
              }
            },
          }),
        }
      },
      recursiveDelete: async (ref: { path: string }) => {
        recursivelyDeleted.push(ref.path)
      },
      batch() {
        let pending = 0
        return {
          delete: () => {
            pending += 1
          },
          commit: async () => {
            committedBatchSizes.push(pending)
          },
        }
      },
    } as unknown as Firestore

    return { db, recursivelyDeleted, queriedFields, committedBatchSizes }
  }

  it("uses recursiveDelete on uid-keyed docs so subcollections cannot be orphaned", async () => {
    const { db, recursivelyDeleted } = scriptedDb()

    await deleteAllUserData(db, USER_ID)

    // problem_mastery/{uid}/problems and users/{uid}/session_summaries are the
    // ones that a plain batch.delete() on the parent would strand forever.
    expect(recursivelyDeleted).toContain(`problem_mastery/${USER_ID}`)
    expect(recursivelyDeleted).toContain(`users/${USER_ID}`)
    expect(recursivelyDeleted).toHaveLength(USER_KEYED_DOCUMENTS.length)
  })

  it("queries every field the map declares, including both referral roles", async () => {
    const { db, queriedFields } = scriptedDb()

    await deleteAllUserData(db, USER_ID)

    const totalFields = USER_KEYED_QUERIES.reduce((sum, entry) => sum + entry.fields.length, 0)
    expect(queriedFields).toHaveLength(totalFields)

    expect(queriedFields).toContainEqual({ collection: "referrals", field: "referrerId" })
    expect(queriedFields).toContainEqual({ collection: "referrals", field: "referredUserId" })
    // The old list queried referral_rewards by "user_id", which matches nothing.
    expect(queriedFields).toContainEqual({ collection: "referral_rewards", field: "referrerId" })
    // promo_code_usage is keyed on user_id by firestore.rules, not userId.
    expect(queriedFields).toContainEqual({ collection: "promo_code_usage", field: "user_id" })
  })

  it("reports success with no failures when everything completes", async () => {
    const { db } = scriptedDb()

    const result = await deleteAllUserData(db, USER_ID)

    expect(result.failedCollections).toEqual([])
    expect(result.deletedDocuments).toBe(USER_KEYED_DOCUMENTS.length)
  })

  it("keeps going after one collection fails, and names the one that did", async () => {
    const { db, recursivelyDeleted } = scriptedDb({
      failingCollections: ["user_stats", "feedback"],
    })

    const result = await deleteAllUserData(db, USER_ID)

    expect(result.failedCollections).toEqual(["user_stats", "feedback"])
    // Every other uid-keyed collection was still processed.
    expect(recursivelyDeleted.length).toBe(USER_KEYED_DOCUMENTS.length - 1)
  })

  it("stays under the batch cap when a single collection holds thousands of rows", async () => {
    const { db, committedBatchSizes } = scriptedDb({ docsPerQuery: 900 })

    await deleteAllUserData(db, USER_ID)

    expect(committedBatchSizes.length).toBeGreaterThan(0)
    for (const size of committedBatchSizes) {
      expect(size).toBeLessThan(FIRESTORE_BATCH_LIMIT)
    }
  })
})

describe("user data map", () => {
  it("has no duplicate collections within either list", () => {
    const docNames = USER_KEYED_DOCUMENTS.map((entry) => entry.collection)
    const queryNames = USER_KEYED_QUERIES.map((entry) => entry.collection)

    expect(new Set(docNames).size).toBe(docNames.length)
    expect(new Set(queryNames).size).toBe(queryNames.length)
  })

  it("never lists a collection as both uid-keyed and field-keyed", () => {
    const docNames = new Set(USER_KEYED_DOCUMENTS.map((entry) => entry.collection))
    const overlap = USER_KEYED_QUERIES.filter((entry) => docNames.has(entry.collection))

    expect(overlap).toEqual([])
  })

  it("gives every field-keyed collection at least one field to query on", () => {
    for (const entry of USER_KEYED_QUERIES) {
      expect(entry.fields.length).toBeGreaterThan(0)
      for (const field of entry.fields) {
        expect(field).not.toBe("")
      }
    }
  })

  it("does not resurrect the collections that never existed", () => {
    // These four were in the old delete list and no code has ever written them,
    // which is a large part of why the list looked thorough and was not.
    const phantoms = ["sessions", "analytics", "subscription_history", "referral_relationships"]
    const listed = [
      ...USER_KEYED_DOCUMENTS.map((entry) => entry.collection),
      ...USER_KEYED_QUERIES.map((entry) => entry.collection),
    ]

    for (const phantom of phantoms) {
      expect(listed).not.toContain(phantom)
    }
  })

  it("covers the per-user collections the old list silently missed", () => {
    const listed = new Set([
      ...USER_KEYED_DOCUMENTS.map((entry) => entry.collection),
      ...USER_KEYED_QUERIES.map((entry) => entry.collection),
    ])

    const previouslyMissed = [
      // session_summaries and usage_summaries are subcollections of users/{uid},
      // so listing "users" is what actually reaches them via recursiveDelete.
      "users",
      "user_stats",
      "notification_preferences",
      "in_app_notifications",
      "usage_events",
      "nps_responses",
      "referrals",
      "text_embeddings",
      "learner_model_events",
      "learner_model_challenges",
      "user_misconceptions",
      "user_tutorial_progress",
      "feedback",
      "user_activities",
    ]

    for (const collection of previouslyMissed) {
      expect(listed).toContain(collection)
    }
  })
})
