import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * Both bounds on the challenge idempotency guard, and why each exists.
 *
 * The first version keyed only on `status === "pending_verification"`. That assumes
 * something eventually clears the status — but the only writer that does is
 * `resolveVerificationForReview`, reachable only from /api/spaced-repetition/complete,
 * which only the SYSTEM DESIGN feedback path calls. DSA reviews write mastery
 * elsewhere entirely, so for the cards /knowledge is mostly made of, the first
 * challenge stays pending forever. An unbounded guard therefore swallowed every
 * later dispute permanently and still reported success — strictly worse than the
 * rare double-correction it was added to prevent.
 *
 * The second bound is the half-written case: if `amendForChallenge` throws after the
 * doc is created, `correction` is null. Returning that doc latches the card into a
 * state where no correction was applied and none ever can be.
 */

const h = vi.hoisted(() => ({ get: vi.fn() }))

vi.mock("@/lib/firebase-admin", () => ({
  adminDb: {
    collection: () => {
      const q = { where: () => q, get: h.get }
      return q
    },
  },
}))

import { findRetriedChallenge } from "../challenges"

const NOW = new Date("2026-08-02T12:00:00.000Z")
const at = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString()

const doc = (overrides: Record<string, unknown>) => ({
  data: () => ({
    id: "c1",
    problem_id: "two-sum",
    correction: { type: "rerate" },
    status: "pending_verification",
    created_at: at(1_000),
    ...overrides,
  }),
})

beforeEach(() => h.get.mockReset())

describe("findRetriedChallenge", () => {
  it("matches a challenge applied seconds ago — the retry it exists for", async () => {
    h.get.mockResolvedValue({ docs: [doc({})] })
    await expect(findRetriedChallenge("u1", "two-sum", NOW)).resolves.toMatchObject({ id: "c1" })
  })

  it("ignores a challenge older than the retry window", async () => {
    // The regression: nothing clears pending_verification for a DSA card, so an
    // unbounded guard would swallow every future dispute on it, forever.
    h.get.mockResolvedValue({ docs: [doc({ created_at: at(10 * 60_000) })] })
    await expect(findRetriedChallenge("u1", "two-sum", NOW)).resolves.toBeNull()
  })

  it("ignores a challenge whose correction never landed", async () => {
    // amendForChallenge threw after the doc was written. Falling through lets the
    // next attempt repair the card instead of latching it into a silent no-op.
    h.get.mockResolvedValue({ docs: [doc({ correction: null })] })
    await expect(findRetriedChallenge("u1", "two-sum", NOW)).resolves.toBeNull()
  })

  it("requires BOTH bounds, not either", async () => {
    h.get.mockResolvedValue({
      docs: [doc({ correction: null, created_at: at(500) })],
    })
    await expect(findRetriedChallenge("u1", "two-sum", NOW)).resolves.toBeNull()
  })

  it("picks the qualifying challenge out of a mixed set", async () => {
    h.get.mockResolvedValue({
      docs: [
        doc({ id: "old", created_at: at(10 * 60_000) }),
        doc({ id: "broken", correction: null }),
        doc({ id: "recent", created_at: at(2_000) }),
      ],
    })
    await expect(findRetriedChallenge("u1", "two-sum", NOW)).resolves.toMatchObject({
      id: "recent",
    })
  })

  it("returns null when nothing is pending at all", async () => {
    h.get.mockResolvedValue({ docs: [] })
    await expect(findRetriedChallenge("u1", "two-sum", NOW)).resolves.toBeNull()
  })

  it("ignores an unparseable or future created_at rather than trusting it", async () => {
    // A doc written by a skewed clock must not be able to suppress a real challenge.
    h.get.mockResolvedValue({ docs: [doc({ created_at: "not-a-date" })] })
    await expect(findRetriedChallenge("u1", "two-sum", NOW)).resolves.toBeNull()

    h.get.mockResolvedValue({ docs: [doc({ created_at: at(-60_000) })] })
    await expect(findRetriedChallenge("u1", "two-sum", NOW)).resolves.toBeNull()
  })
})
