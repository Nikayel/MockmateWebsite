/**
 * Regression cover for the reader behind BOTH /knowledge evidence and the
 * "This seems wrong" challenge flow.
 *
 * The ordered form of this query needs the composite index
 * algorithm_research_events (user_id, problem_id, timestamp DESC), which is
 * declared in firestore.indexes.json but was never deployed. In production
 * Firestore therefore answered with FAILED_PRECONDITION and both surfaces
 * returned a 500. Nothing caught it: every existing test mocks Firestore, and
 * the emulator does not enforce composite indexes, so the only way to see it
 * was to query the live project.
 *
 * These tests pin the fallback instead of the index, since the fallback is the
 * part that has to keep working whatever the deploy state is.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const h = vi.hoisted(() => ({
  orderedGet: vi.fn(),
  unorderedGet: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
}))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => {
      const query = {
        where: () => query,
        orderBy: (...args: unknown[]) => {
          h.orderBy(...args)
          return { limit: (n: number) => ({ get: () => h.orderedGet(n) }) }
        },
        limit: (n: number) => {
          h.limit(n)
          return { get: () => h.unorderedGet(n) }
        },
      }
      return query
    },
  },
}))

import { fetchCardResearchEvents } from "../evidence"

/** Firestore surfaces a missing index as gRPC FAILED_PRECONDITION. */
function missingIndexError() {
  return Object.assign(new Error("9 FAILED_PRECONDITION: The query requires an index."), {
    code: 9,
  })
}

function doc(id: string, timestamp: string) {
  return { id, data: () => ({ timestamp, problem_id: "invert-binary-tree" }) }
}

beforeEach(() => {
  h.orderedGet.mockReset()
  h.unorderedGet.mockReset()
  h.orderBy.mockReset()
  h.limit.mockReset()
})

describe("fetchCardResearchEvents", () => {
  it("uses the indexed query and returns Firestore's order untouched", async () => {
    h.orderedGet.mockResolvedValue({
      docs: [doc("b", "2026-07-20T00:00:00.000Z"), doc("a", "2026-07-01T00:00:00.000Z")],
    })

    const rows = await fetchCardResearchEvents("u1", "invert-binary-tree", 10)

    expect(h.orderBy).toHaveBeenCalledWith("timestamp", "desc")
    expect(h.unorderedGet).not.toHaveBeenCalled()
    expect(rows.map((r) => r.id)).toEqual(["b", "a"])
  })

  it("falls back to the unordered query when the index is not deployed", async () => {
    h.orderedGet.mockRejectedValue(missingIndexError())
    h.unorderedGet.mockResolvedValue({ docs: [doc("a", "2026-07-01T00:00:00.000Z")] })

    const rows = await fetchCardResearchEvents("u1", "invert-binary-tree", 10)

    expect(rows.map((r) => r.id)).toEqual(["a"])
  })

  it("still returns newest-first after falling back", async () => {
    // The whole point of the orderBy. Firestore returns the fallback in
    // __name__ order, so the sort has to happen here or the evidence panel
    // reads as a shuffled history.
    h.orderedGet.mockRejectedValue(missingIndexError())
    h.unorderedGet.mockResolvedValue({
      docs: [
        doc("mid", "2026-07-10T00:00:00.000Z"),
        doc("newest", "2026-07-31T00:00:00.000Z"),
        doc("oldest", "2026-06-01T00:00:00.000Z"),
      ],
    })

    const rows = await fetchCardResearchEvents("u1", "invert-binary-tree", 10)

    expect(rows.map((r) => r.id)).toEqual(["newest", "mid", "oldest"])
  })

  it("applies the caller's limit to the fallback, not Firestore's scan window", async () => {
    // The fallback reads a wider window because it cannot order server-side.
    // amendForChallenge asks for exactly 1 and must not receive 3.
    h.orderedGet.mockRejectedValue(missingIndexError())
    h.unorderedGet.mockResolvedValue({
      docs: [
        doc("mid", "2026-07-10T00:00:00.000Z"),
        doc("newest", "2026-07-31T00:00:00.000Z"),
        doc("oldest", "2026-06-01T00:00:00.000Z"),
      ],
    })

    const rows = await fetchCardResearchEvents("u1", "invert-binary-tree", 1)

    expect(rows.map((r) => r.id)).toEqual(["newest"])
    expect(h.limit).toHaveBeenCalledWith(100)
  })

  it("recognises the missing index by message when no numeric code is set", async () => {
    // The Firestore client is not consistent about attaching `code`; the
    // message is the only signal left when it does not.
    h.orderedGet.mockRejectedValue(new Error("The query requires an index. You can create it..."))
    h.unorderedGet.mockResolvedValue({ docs: [doc("a", "2026-07-01T00:00:00.000Z")] })

    await expect(fetchCardResearchEvents("u1", "invert-binary-tree", 10)).resolves.toHaveLength(1)
  })

  it("rethrows failures that are not about a missing index", async () => {
    // A permission error or an outage must not be laundered into an empty
    // history: an open learner model showing "no reviews yet" when it simply
    // could not read is exactly the dishonesty the feature exists to avoid.
    h.orderedGet.mockRejectedValue(Object.assign(new Error("permission denied"), { code: 7 }))

    await expect(fetchCardResearchEvents("u1", "invert-binary-tree", 10)).rejects.toThrow(
      "permission denied"
    )
    expect(h.unorderedGet).not.toHaveBeenCalled()
  })
})
