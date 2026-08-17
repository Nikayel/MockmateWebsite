/**
 * The sweep's arithmetic and its window, neither of which had any coverage: the
 * existing sweep tests pin the event query to an empty snapshot, so they prove
 * the throttle holds and nothing about what the detector does once it finds
 * events. Three failures hid in that gap.
 *
 * - One stored NaN turned the whole sum into NaN, and `NaN > budget` is false,
 *   so a single bad document disarmed the alarm silently.
 * - The query returns the 5,000 NEWEST events. Past that the sum is a floor,
 *   reported as if it were the total, precisely during the runaway it exists to
 *   catch.
 * - The window was a fixed trailing 60 minutes while the throttle only promised
 *   "at least an hour", so sweeps at 10:00 and 11:30 left 10:00-10:30 unscanned
 *   by anything, forever.
 */

import { describe, it, expect, vi, beforeEach } from "vitest"

type EventDoc = { data: () => Record<string, unknown> }

const mocks = vi.hoisted(() => ({
  state: {
    usageEvents: { docs: [] as EventDoc[], size: 0 },
    /** Firestore `config` documents, by id. Undefined means the doc is absent. */
    configDocs: {} as Record<string, Record<string, unknown> | undefined>,
    claimLastRunAtMs: undefined as number | undefined,
  },
  /** Records the `where` arguments of the usage_events scan. */
  usageEventsWhere: vi.fn(),
  anomalyAdd: vi.fn(async () => ({ id: "anomaly-1" })),
  configSet: vi.fn(async () => undefined),
  transactionSet: vi.fn(),
  runTransaction: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
}))

vi.mock("../firebase-admin", () => {
  const makeQuery = (collection: string) => {
    const query: Record<string, unknown> = {}
    query.where = (...args: unknown[]) => {
      if (collection === "usage_events") mocks.usageEventsWhere(...args)
      return query
    }
    query.orderBy = () => query
    query.limit = () => query
    query.get = async () =>
      collection === "usage_events"
        ? mocks.state.usageEvents
        : // cost_anomalies dedup lookup: always a miss, so every anomaly is a
          // fresh `add` a test can read.
          { docs: [], size: 0, empty: true }
    return query
  }

  return {
    adminDb: {
      collection: (name: string) => ({
        ...makeQuery(name),
        doc: (id: string) => ({
          get: async () => {
            const data = mocks.state.configDocs[id]
            return { exists: data !== undefined, data: () => data }
          },
          set: mocks.configSet,
        }),
        add: mocks.anomalyAdd,
      }),
      runTransaction: mocks.runTransaction,
    },
  }
})

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => "__ts"),
  },
}))

vi.mock("../logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: mocks.loggerWarn, error: mocks.loggerError },
}))

/** A usage_events snapshot whose documents carry the given `cost` values. */
function eventsCosting(...costs: unknown[]) {
  return {
    docs: costs.map((cost) => ({ data: () => ({ cost }) })),
    size: costs.length,
  }
}

function wireTransaction() {
  mocks.runTransaction.mockImplementation(
    async (fn: (t: { get: unknown; set: unknown }) => Promise<unknown>) =>
      fn({
        get: async () => ({ data: () => ({ lastRunAtMs: mocks.state.claimLastRunAtMs }) }),
        set: (_ref: unknown, value: { lastRunAtMs: number }) => {
          mocks.state.claimLastRunAtMs = value.lastRunAtMs
          mocks.transactionSet(value)
        },
      })
  )
}

/** Lower bound of the most recent usage_events scan. */
function lastScanStart(): Date {
  const calls = mocks.usageEventsWhere.mock.calls
  const lastCall = calls[calls.length - 1]
  expect(lastCall?.[0]).toBe("createdAt")
  expect(lastCall?.[1]).toBe(">=")
  return lastCall?.[2] as Date
}

function anomalyWrites() {
  return mocks.anomalyAdd.mock.calls.map(
    (call) => (call as unknown as [Record<string, unknown>])[0]
  )
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.state.usageEvents = { docs: [], size: 0 }
  mocks.state.configDocs = {}
  mocks.state.claimLastRunAtMs = undefined
  wireTransaction()
})

describe("hourly sweep arithmetic", () => {
  it("sums the window and alarms when the rate clears the budget", async () => {
    mocks.state.usageEvents = eventsCosting(30, 25)
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    const anomaly = await checkHourlyCostAnomaly({ now: new Date("2026-08-08T11:00:00Z") })

    expect(anomaly).not.toBeNull()
    expect(anomaly?.cost).toBeCloseTo(55)
    expect(anomaly?.threshold).toBe(50)
    expect(anomaly?.severity).toBe("warning")
    expect(anomaly?.description).toContain("$55.00 across 2 events")
    expect(anomalyWrites()).toEqual([expect.objectContaining({ type: "hourly_spike", cost: 55 })])
  })

  it("calls double the budget critical", async () => {
    mocks.state.usageEvents = eventsCosting(60, 60)
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    const anomaly = await checkHourlyCostAnomaly({ now: new Date("2026-08-08T11:00:00Z") })

    expect(anomaly?.severity).toBe("critical")
  })

  it("does not let one unusable cost field disarm the alarm", async () => {
    // The regression: `cost || 0` turned a stored NaN into NaN for the whole
    // sum, and `NaN > 50` is false, so the sweep went quiet instead of loud.
    mocks.state.usageEvents = eventsCosting(60, NaN, "banana", null, undefined)
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    const anomaly = await checkHourlyCostAnomaly({ now: new Date("2026-08-08T11:00:00Z") })

    expect(anomaly).not.toBeNull()
    expect(Number.isFinite(anomaly?.cost)).toBe(true)
    expect(anomaly?.cost).toBe(60)
  })

  it("stays quiet under budget", async () => {
    mocks.state.usageEvents = eventsCosting(1.25, 2.5)
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    await expect(
      checkHourlyCostAnomaly({ now: new Date("2026-08-08T11:00:00Z") })
    ).resolves.toBeNull()
    expect(mocks.anomalyAdd).not.toHaveBeenCalled()
  })
})

describe("a truncated window", () => {
  /** Exactly the query limit: cheap calls, so the visible total is small. */
  const atTheLimit = {
    docs: Array.from({ length: 5000 }, () => ({ data: () => ({ cost: 0.001 }) })),
    size: 5000,
  }

  it("alarms as critical and says the figure is a floor", async () => {
    mocks.state.usageEvents = atTheLimit
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    const anomaly = await checkHourlyCostAnomaly({ now: new Date("2026-08-08T11:00:00Z") })

    // $5 of visible spend is nowhere near the $50 budget. The anomaly is the
    // window itself: past the limit the sweep cannot claim to be under budget.
    expect(anomaly).not.toBeNull()
    expect(anomaly?.severity).toBe("critical")
    expect(anomaly?.description).toContain("at least $5.00 across ≥5000 events")
    expect(anomaly?.description).toContain("floor")
    expect(anomalyWrites()).toHaveLength(1)
  })

  it("logs the truncation at error, not silently", async () => {
    mocks.state.usageEvents = atTheLimit
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    await checkHourlyCostAnomaly({ now: new Date("2026-08-08T11:00:00Z") })

    const truncationLogs = mocks.loggerError.mock.calls.filter(([message]) =>
      String(message).includes("query limit")
    )
    expect(truncationLogs).toHaveLength(1)
    const context = truncationLogs[0][1] as { limit: number; costFloor: number }
    expect(context.limit).toBe(5000)
    expect(context.costFloor).toBeCloseTo(5)
  })
})

describe("the scanned window", () => {
  it("scans the trailing hour on the first sweep ever", async () => {
    const { maybeRunHourlyCostSweep } = await import("../cost-anomaly-detection")

    await maybeRunHourlyCostSweep(new Date("2026-08-08T10:00:00Z"))

    expect(lastScanStart()).toEqual(new Date("2026-08-08T09:00:00Z"))
  })

  it("starts where the previous sweep stopped, leaving no unscanned minutes", async () => {
    const { maybeRunHourlyCostSweep } = await import("../cost-anomaly-detection")

    await maybeRunHourlyCostSweep(new Date("2026-08-08T10:00:00Z"))
    // 90 minutes later: a fixed trailing hour would start at 10:30 and nothing
    // would ever look at 10:00-10:30.
    await maybeRunHourlyCostSweep(new Date("2026-08-08T11:30:00Z"))

    expect(lastScanStart()).toEqual(new Date("2026-08-08T10:00:00Z"))
  })

  it("caps the window at six hours after a long quiet period", async () => {
    mocks.state.claimLastRunAtMs = Date.parse("2026-08-08T00:00:00Z")
    const { maybeRunHourlyCostSweep } = await import("../cost-anomaly-detection")

    await maybeRunHourlyCostSweep(new Date("2026-08-08T12:00:00Z"))

    expect(lastScanStart()).toEqual(new Date("2026-08-08T06:00:00Z"))
  })
})

describe("prorated comparison", () => {
  it("compares dollars per hour, not the window total", async () => {
    // $120 over three hours is $40/hour, under the $50 budget. Comparing the
    // raw window total would alarm on a perfectly normal afternoon.
    mocks.state.claimLastRunAtMs = Date.parse("2026-08-08T10:00:00Z")
    mocks.state.usageEvents = eventsCosting(60, 60)
    const { maybeRunHourlyCostSweep } = await import("../cost-anomaly-detection")

    await maybeRunHourlyCostSweep(new Date("2026-08-08T13:00:00Z"))

    expect(mocks.anomalyAdd).not.toHaveBeenCalled()
  })

  it("still alarms when the rate over a long window is over budget", async () => {
    mocks.state.claimLastRunAtMs = Date.parse("2026-08-08T10:00:00Z")
    mocks.state.usageEvents = eventsCosting(90, 90)
    const { maybeRunHourlyCostSweep } = await import("../cost-anomaly-detection")

    await maybeRunHourlyCostSweep(new Date("2026-08-08T13:00:00Z"))

    expect(anomalyWrites()).toEqual([
      expect.objectContaining({ type: "hourly_spike", cost: 60, threshold: 50 }),
    ])
    expect(String(anomalyWrites()[0].description)).toContain("over 3.0h")
  })

  it("floors the window at one hour so a short one is not a rate", async () => {
    // 15 minutes of ordinary spend is $80/hour extrapolated, which is noise.
    mocks.state.usageEvents = eventsCosting(20)
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    const anomaly = await checkHourlyCostAnomaly({
      since: new Date("2026-08-08T11:45:00Z"),
      now: new Date("2026-08-08T12:00:00Z"),
    })

    expect(anomaly).toBeNull()
  })
})

describe("stored config values the detector cannot use", () => {
  it("falls back to the default budget when the stored one is not a number", async () => {
    // "banana" makes `rate > budget` false forever: the alarm is disarmed and
    // nothing on the admin screen says so.
    mocks.state.configDocs.cost_anomaly = { hourlyBudget: "banana" }
    mocks.state.usageEvents = eventsCosting(60)
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    const anomaly = await checkHourlyCostAnomaly({ now: new Date("2026-08-08T11:00:00Z") })

    expect(anomaly?.threshold).toBe(50)
    const warnings = mocks.loggerWarn.mock.calls.filter(([message]) =>
      String(message).includes("Stored cost anomaly config")
    )
    expect(warnings).toHaveLength(1)
    expect(warnings[0][1]).toMatchObject({ fields: ["hourlyBudget"] })
  })

  it("falls back when the stored budget is null, instead of alarming on everything", async () => {
    // `1 > null` is true, so a null budget alarmed on every sweep forever.
    mocks.state.configDocs.cost_anomaly = { hourlyBudget: null }
    mocks.state.usageEvents = eventsCosting(1)
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    await expect(
      checkHourlyCostAnomaly({ now: new Date("2026-08-08T11:00:00Z") })
    ).resolves.toBeNull()
    expect(mocks.anomalyAdd).not.toHaveBeenCalled()
  })

  it("honors a stored budget that a detector can actually use", async () => {
    mocks.state.configDocs.cost_anomaly = { hourlyBudget: 5 }
    mocks.state.usageEvents = eventsCosting(6)
    const { checkHourlyCostAnomaly } = await import("../cost-anomaly-detection")

    const anomaly = await checkHourlyCostAnomaly({ now: new Date("2026-08-08T11:00:00Z") })

    expect(anomaly?.threshold).toBe(5)
    expect(anomaly?.cost).toBe(6)
  })
})
