/**
 * trackUsageEvent is the single funnel every tracked dollar passes through,
 * and since 2026-08-17 it owns two contracts that used to be scattered across
 * its callers:
 *
 * 1. It feeds the global daily kill-switch itself. The Node AI path and the
 *    Edge ingest used to call recordGlobalSpend directly, which meant voice
 *    and embedding spend never reached the $250/day ceiling at all — and any
 *    future caller could forget the second call. Now the funnel does it, once,
 *    for every event, and STILL does it when the ledger write fails: a
 *    Firestore incident and a runaway spend loop must not be able to coincide
 *    invisibly.
 *
 * 2. Every event carries a registered service id, and every dollar lands in
 *    the per-service rollup maps (monthly summary, daily doc) so "which
 *    product surface spent this" is answerable without scanning usage_events.
 *
 * The month boundary is also pinned here: the monthly period key was built
 * from LOCAL date components while every other money key was UTC, so under a
 * non-UTC TZ a call at 2026-09-01T03:00Z billed August's budget. utcMonthKey
 * uses getUTC* and these assertions fail against the local-time version on
 * any machine west of UTC.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  eventsAdd: vi.fn(async () => ({ id: "evt-1" })),
  runTransaction: vi.fn(),
  summarySet: vi.fn(),
  summaryUpdate: vi.fn(),
  summaryDocId: vi.fn(),
  dailySet: vi.fn(async () => undefined),
  dailyDocId: vi.fn(),
  recordGlobalSpend: vi.fn(async () => undefined),
  maybeRunHourlyCostSweep: vi.fn(async () => undefined),
  loggerError: vi.fn(),
}))

vi.mock("../firebase-admin", () => ({
  adminDb: {
    collection: vi.fn((name: string) => {
      if (name === "usage_events") {
        return { add: mocks.eventsAdd }
      }
      if (name === "users") {
        return {
          doc: vi.fn(() => ({
            collection: vi.fn((sub: string) => ({
              doc: vi.fn((docId: string) => {
                if (sub === "usage_summaries") {
                  mocks.summaryDocId(docId)
                  return { __kind: "summaryRef" }
                }
                mocks.dailyDocId(docId)
                return { set: mocks.dailySet }
              }),
            })),
          })),
        }
      }
      throw new Error(`unexpected collection ${name}`)
    }),
    runTransaction: mocks.runTransaction,
  },
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => "__ts"),
  },
  Timestamp: {
    fromDate: vi.fn((d: Date) => ({ __ts: d.toISOString() })),
  },
}))

vi.mock("../global-spend-guard", () => ({
  recordGlobalSpend: mocks.recordGlobalSpend,
}))

vi.mock("../cost-anomaly-detection", () => ({
  maybeRunHourlyCostSweep: mocks.maybeRunHourlyCostSweep,
}))

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: mocks.loggerError },
}))

function wireTransaction(existingSummary: Record<string, unknown> | null = null) {
  mocks.runTransaction.mockImplementation(
    async (fn: (t: { get: unknown; set: unknown; update: unknown }) => Promise<void>) =>
      fn({
        get: async () => ({
          exists: existingSummary !== null,
          data: () => existingSummary ?? undefined,
        }),
        set: mocks.summarySet,
        update: mocks.summaryUpdate,
      })
  )
}

const PAID_EVENT = {
  userId: "user-1",
  eventType: "chat_message" as const,
  service: "interview-chat" as const,
  provider: "gemini",
  cost: 0.0425,
  totalTokens: 9500,
}

describe("trackUsageEvent funnel contracts", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.eventsAdd.mockResolvedValue({ id: "evt-1" })
    mocks.dailySet.mockResolvedValue(undefined)
    wireTransaction()
  })

  it("feeds the global kill-switch exactly once, with cost and service", async () => {
    const { trackUsageEvent } = await import("../usage-tracking")

    await expect(trackUsageEvent(PAID_EVENT)).resolves.toBe(true)

    expect(mocks.recordGlobalSpend).toHaveBeenCalledTimes(1)
    expect(mocks.recordGlobalSpend).toHaveBeenCalledWith(0.0425, "interview-chat")
  })

  it("still feeds the kill-switch when the ledger write fails", async () => {
    mocks.eventsAdd.mockRejectedValue(new Error("firestore down"))
    const { trackUsageEvent } = await import("../usage-tracking")

    await expect(trackUsageEvent(PAID_EVENT)).resolves.toBe(false)

    // Fail-open for the ceiling: an unrecordable dollar is still a spent
    // dollar, and the kill-switch is the last line against a runaway loop.
    expect(mocks.recordGlobalSpend).toHaveBeenCalledTimes(1)
    expect(mocks.recordGlobalSpend).toHaveBeenCalledWith(0.0425, "interview-chat")
    expect(mocks.loggerError).toHaveBeenCalled()
  })

  it("writes the service onto the raw event and the dollars into both rollup maps", async () => {
    const { trackUsageEvent } = await import("../usage-tracking")

    await trackUsageEvent(PAID_EVENT)

    const rawEvent = mocks.eventsAdd.mock.calls[0][0] as Record<string, unknown>
    expect(rawEvent.service).toBe("interview-chat")

    const summaryCreate = mocks.summarySet.mock.calls[0][1] as Record<string, unknown>
    expect(summaryCreate.costByService).toEqual({ "interview-chat": 0.0425 })

    const dailyPayload = mocks.dailySet.mock.calls[0][0] as {
      costByService: Record<string, { __increment: number }>
    }
    expect(dailyPayload.costByService["interview-chat"]).toEqual({ __increment: 0.0425 })
  })

  it("increments an existing monthly summary per service via a dotted field path", async () => {
    wireTransaction({ requestsByType: {}, requestsByProvider: {} })
    const { trackUsageEvent } = await import("../usage-tracking")

    await trackUsageEvent(PAID_EVENT)

    const update = mocks.summaryUpdate.mock.calls[0][1] as Record<string, unknown>
    expect(update["costByService.interview-chat"]).toEqual({ __increment: 0.0425 })
  })

  it("never churns the rollup maps for zero-cost telemetry", async () => {
    const { trackUsageEvent } = await import("../usage-tracking")

    await trackUsageEvent({
      userId: "user-1",
      eventType: "session_start",
      service: "session-telemetry",
    })

    const summaryCreate = mocks.summarySet.mock.calls[0][1] as Record<string, unknown>
    expect(summaryCreate.costByService).toEqual({})
    const dailyPayload = mocks.dailySet.mock.calls[0][0] as Record<string, unknown>
    expect(dailyPayload.costByService).toBeUndefined()
  })

  it("keys the monthly summary by the UTC month, matching every other money key", async () => {
    const { trackUsageEvent } = await import("../usage-tracking")

    await trackUsageEvent(PAID_EVENT)

    const now = new Date()
    const expectedKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
    expect(mocks.summaryDocId).toHaveBeenCalledWith(expectedKey)
  })
})

describe("UTC month helpers", () => {
  it("derive the month from UTC components regardless of process timezone", async () => {
    const { utcMonthKey, utcMonthStart, utcMonthEnd } = await import("../usage-tracking")

    // 2026-09-01T03:00Z is still 2026-08-31 in America/Los_Angeles. The
    // local-time implementation this replaced returned "2026-08" here on any
    // machine west of UTC — billing September's first calls to August.
    const edge = new Date("2026-09-01T03:00:00Z")
    expect(utcMonthKey(edge)).toBe("2026-09")
    expect(utcMonthStart(edge).toISOString()).toBe("2026-09-01T00:00:00.000Z")
    expect(utcMonthEnd(edge).toISOString()).toBe("2026-09-30T00:00:00.000Z")
  })
})
