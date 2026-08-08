/**
 * The A/B aggregate document must not carry a confidence, a winner, or any
 * other significance claim.
 *
 * It used to carry `confidence_level = Math.min(95, 60 + wins * 7)`, where
 * `wins` counted how many of five cohort averages one arm led on. That number
 * was written to Firestore, read back by the admin route, rendered to the
 * founder and exported to CSV under the word "confidence". It never touched the
 * spread of the data or the size of the sample, and it could not go below 74.
 *
 * Two tests, because deleting such a field takes two separate fixes:
 *  - the WRITER must stop producing it, and
 *  - the READER must stop passing it through, because every document written
 *    before the fix still has it and `doc.data() as T` strips nothing.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

const h = vi.hoisted(() => {
  const writes: Array<{ path: string; data: Record<string, unknown> }> = []
  const state = { storedAggregate: null as Record<string, unknown> | null }
  return { writes, state }
})

vi.mock("@/lib/firebase-admin", () => {
  const emptySnapshot = { docs: [], size: 0, empty: true }

  const chainable = () => {
    const query: Record<string, unknown> = { get: () => Promise.resolve(emptySnapshot) }
    query.where = () => query
    query.orderBy = () => query
    query.limit = () => query
    return query
  }

  const adminDb = {
    collection: (name: string) => ({
      ...chainable(),
      doc: (id: string) => ({
        get: () =>
          Promise.resolve({
            exists: h.state.storedAggregate !== null,
            data: () => h.state.storedAggregate,
          }),
        set: (data: Record<string, unknown>) => {
          h.writes.push({ path: `${name}/${id}`, data })
          return Promise.resolve()
        },
      }),
    }),
    collectionGroup: () => chainable(),
  }

  return { adminDb, adminAuth: { verifyIdToken: vi.fn() } }
})

import { generateAggregateComparison, getAggregateComparison } from "../research-tracker"

/** An aggregate exactly as an older build wrote it, fabricated fields and all. */
const legacyStoredAggregate = () => ({
  last_updated: "2026-08-01T00:00:00.000Z",
  data_range: { start_date: "2026-07-02T00:00:00.000Z", end_date: "2026-08-01T00:00:00.000Z" },
  sm2: { algorithm: "sm2", total_users: 120, average_retention_rate: 61 },
  fsrs: { algorithm: "fsrs", total_users: 118, average_retention_rate: 66 },
  comparison: {
    retention_rate_difference: 5,
    average_score_difference: 2,
    time_to_mastery_difference_days: 1,
    engagement_difference: 0.4,
    interval_efficiency_difference: 3,
    sufficient_sample_size: true,
    fsrs_wins_count: 5,
    sm2_wins_count: 0,
    // The two fields this whole change exists to remove.
    overall_winner: "fsrs",
    confidence_level: 95,
  },
})

beforeEach(() => {
  h.writes.length = 0
  h.state.storedAggregate = null
})

describe("generateAggregateComparison", () => {
  it("stores no confidence and no winner", async () => {
    const aggregate = await generateAggregateComparison()

    expect(aggregate.comparison).not.toHaveProperty("confidence_level")
    expect(aggregate.comparison).not.toHaveProperty("overall_winner")

    const stored = h.writes.find((write) => write.path === "algorithm_research_aggregate/comparison")
    expect(stored).toBeDefined()
    expect(JSON.stringify(stored!.data)).not.toMatch(/confidence_level|overall_winner/)
  })

  it("still counts which cohort average each arm leads on, and only that", async () => {
    const aggregate = await generateAggregateComparison()

    // A count of leads is a true fact about the averages, so it stays. What is
    // gone is the step that turned that count into a percentage.
    expect(aggregate.comparison.fsrs_wins_count + aggregate.comparison.sm2_wins_count).toBe(5)
    expect(aggregate.comparison.sufficient_sample_size).toBe(false)
  })
})

describe("getAggregateComparison", () => {
  it("strips the fabricated fields out of a document written before the fix", async () => {
    h.state.storedAggregate = legacyStoredAggregate()

    const comparison = await getAggregateComparison()

    expect(comparison).not.toBeNull()
    expect(comparison!.comparison).not.toHaveProperty("confidence_level")
    expect(comparison!.comparison).not.toHaveProperty("overall_winner")
    expect(JSON.stringify(comparison)).not.toMatch(/confidence_level|overall_winner/)
  })

  it("keeps every descriptive field the dashboard still reads", async () => {
    h.state.storedAggregate = legacyStoredAggregate()

    const comparison = await getAggregateComparison()

    expect(comparison!.last_updated).toBe("2026-08-01T00:00:00.000Z")
    expect(comparison!.sm2.total_users).toBe(120)
    expect(comparison!.fsrs.total_users).toBe(118)
    expect(comparison!.comparison.retention_rate_difference).toBe(5)
    expect(comparison!.comparison.sufficient_sample_size).toBe(true)
    expect(comparison!.comparison.fsrs_wins_count).toBe(5)
    expect(comparison!.comparison.sm2_wins_count).toBe(0)
  })

  it("returns null when nothing has been generated yet", async () => {
    expect(await getAggregateComparison()).toBeNull()
  })
})
