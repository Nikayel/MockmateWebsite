/**
 * Two of the four cost detectors never ran. checkUserCostAnomaly had zero
 * callers, and checkHourlyCostAnomaly was reachable only from an admin
 * "check now" button — so the only detector running automatically was the
 * per-request one, which fires at $1 for a SINGLE request.
 *
 * That threshold is blind to the failure that actually produces a surprise
 * bill: thousands of ordinary-sized calls. Each is a few cents, none is
 * remarkable, and the damage exists only in the aggregate nothing was watching.
 *
 * maybeRunHourlyCostSweep is that aggregate detector, running by itself. It is
 * called on every AI call, so its throttle is load-bearing: the sweep reads up
 * to 5,000 documents, and running it per call — or per warm instance — would
 * make the cost detector a cost problem.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

const mocks = vi.hoisted(() => ({
  runTransaction: vi.fn(),
  transactionGet: vi.fn(),
  transactionSet: vi.fn(),
  eventsGet: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock("../firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(async () => ({ exists: false, data: () => undefined })),
      })),
      where: vi.fn(() => ({
        orderBy: vi.fn(() => ({
          limit: vi.fn(() => ({ get: mocks.eventsGet })),
        })),
      })),
    })),
    runTransaction: mocks.runTransaction,
  },
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => "__ts"),
  },
}))

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: mocks.loggerError },
}))

/** Firestore claim doc state, shared by the transaction mock. */
let claimLastRunAtMs: number | undefined

function wireTransaction() {
  mocks.runTransaction.mockImplementation(
    async (fn: (t: { get: unknown; set: unknown }) => Promise<boolean>) =>
      fn({
        get: async () => ({ data: () => ({ lastRunAtMs: claimLastRunAtMs }) }),
        set: (_ref: unknown, value: { lastRunAtMs: number }) => {
          claimLastRunAtMs = value.lastRunAtMs
          mocks.transactionSet(value)
        },
      })
  )
}

describe("maybeRunHourlyCostSweep", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    claimLastRunAtMs = undefined
    wireTransaction()
    mocks.eventsGet.mockResolvedValue({ docs: [], size: 0 })
  })

  it("runs the sweep on the first call", async () => {
    const { maybeRunHourlyCostSweep } = await import("../cost-anomaly-detection")

    await maybeRunHourlyCostSweep(new Date("2026-08-08T10:00:00Z"))

    expect(mocks.transactionSet).toHaveBeenCalledTimes(1)
    expect(mocks.eventsGet).toHaveBeenCalled()
  })

  it("does not scan again within the hour", async () => {
    const { maybeRunHourlyCostSweep } = await import("../cost-anomaly-detection")

    await maybeRunHourlyCostSweep(new Date("2026-08-08T10:00:00Z"))
    const scansAfterFirst = mocks.eventsGet.mock.calls.length

    for (let i = 0; i < 50; i++) {
      await maybeRunHourlyCostSweep(new Date("2026-08-08T10:30:00Z"))
    }

    expect(mocks.eventsGet.mock.calls.length).toBe(scansAfterFirst)
    // The in-memory gate stops them before they even reach the claim.
    expect(mocks.runTransaction).toHaveBeenCalledTimes(1)
  })

  it("runs again once the hour has passed", async () => {
    const { maybeRunHourlyCostSweep } = await import("../cost-anomaly-detection")

    await maybeRunHourlyCostSweep(new Date("2026-08-08T10:00:00Z"))
    await maybeRunHourlyCostSweep(new Date("2026-08-08T11:00:01Z"))

    expect(mocks.transactionSet).toHaveBeenCalledTimes(2)
  })

  it("lets only one instance win the claim for an hour", async () => {
    // A second instance has its own in-memory timestamp, so the Firestore claim
    // is the only thing standing between N warm instances and N 5,000-doc scans.
    const first = await import("../cost-anomaly-detection")
    await first.maybeRunHourlyCostSweep(new Date("2026-08-08T10:00:00Z"))
    const scansAfterFirst = mocks.eventsGet.mock.calls.length

    vi.resetModules()
    const second = await import("../cost-anomaly-detection")
    await second.maybeRunHourlyCostSweep(new Date("2026-08-08T10:05:00Z"))

    expect(mocks.runTransaction).toHaveBeenCalledTimes(2)
    expect(mocks.eventsGet.mock.calls.length).toBe(scansAfterFirst)
  })

  it("never throws when the claim fails", async () => {
    mocks.runTransaction.mockRejectedValue(new Error("firestore down"))
    const { maybeRunHourlyCostSweep } = await import("../cost-anomaly-detection")

    await expect(
      maybeRunHourlyCostSweep(new Date("2026-08-08T10:00:00Z"))
    ).resolves.toBeUndefined()
    expect(mocks.loggerError).toHaveBeenCalled()
  })
})

describe("checkUserCostAnomaly is gone", () => {
  it("no longer exists", async () => {
    // Deleted rather than wired: it scanned up to 1,000 usage_events per user
    // per invocation, so putting it on the AI path would have cost 1,000
    // document reads per LLM call to detect a cost problem. The capability is
    // now ENFORCED by the daily spend cap in quota-enforcement, which reads one
    // pre-aggregated document.
    const costAnomalyModule = await import("../cost-anomaly-detection")
    expect("checkUserCostAnomaly" in costAnomalyModule).toBe(false)
  })
})
