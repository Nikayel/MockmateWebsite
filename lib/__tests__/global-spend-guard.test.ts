/**
 * Tests for global-spend-guard.ts
 * The aggregate daily AI-spend kill-switch that bounds platform-wide COGS
 * independent of per-user budgets.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

const { mockGet, mockSet } = vi.hoisted(() => ({
  mockGet: vi.fn(),
  mockSet: vi.fn(() => Promise.resolve()),
}))

vi.mock("../firebase-admin", () => ({
  adminDb: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({ get: mockGet, set: mockSet })),
    })),
  },
}))

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => "__ts"),
  },
}))

vi.mock("../logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

const CEILING_ENV = "GLOBAL_DAILY_SPEND_CEILING_USD"

describe("global-spend-guard", () => {
  const originalEnv = process.env[CEILING_ENV]

  beforeEach(() => {
    // mockReset (not just clear) wipes any queued *Once implementations so a
    // value queued by a test that early-returns can't leak into the next test.
    mockGet.mockReset()
    mockSet.mockReset()
    delete process.env[CEILING_ENV]
    mockGet.mockResolvedValue({ data: () => ({}) })
    mockSet.mockResolvedValue(undefined)
  })

  afterEach(() => {
    if (originalEnv === undefined) delete process.env[CEILING_ENV]
    else process.env[CEILING_ENV] = originalEnv
  })

  describe("getGlobalDailyCeiling", () => {
    it("defaults to the COST_PROTECTION constant when no env override", async () => {
      const { getGlobalDailyCeiling } = await import("../global-spend-guard")
      const { COST_PROTECTION } = await import("../constants")
      expect(getGlobalDailyCeiling()).toBe(COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD)
    })

    it("honors a valid env override", async () => {
      process.env[CEILING_ENV] = "123.5"
      const { getGlobalDailyCeiling } = await import("../global-spend-guard")
      expect(getGlobalDailyCeiling()).toBe(123.5)
    })

    it("allows 0 to disable the gate", async () => {
      process.env[CEILING_ENV] = "0"
      const { getGlobalDailyCeiling } = await import("../global-spend-guard")
      expect(getGlobalDailyCeiling()).toBe(0)
    })

    it("falls back to the constant for an invalid env value", async () => {
      process.env[CEILING_ENV] = "not-a-number"
      const { getGlobalDailyCeiling } = await import("../global-spend-guard")
      const { COST_PROTECTION } = await import("../constants")
      expect(getGlobalDailyCeiling()).toBe(COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD)
    })

    // An env var declared with no value, or a cleared secret, arrives as "".
    // Number("") is 0, and 0 means "gate off", so the old parse disarmed the
    // platform's last cost defence with no error and no log. These pin that
    // every unusable value leaves the gate ARMED instead.
    it.each([
      ["empty string", ""],
      ["whitespace only", "   "],
      ["negative", "-1"],
      ["non-numeric", "not-a-number"],
    ])("keeps the gate armed when the env value is %s", async (_label, value) => {
      process.env[CEILING_ENV] = value
      const { getGlobalDailyCeiling } = await import("../global-spend-guard")
      const { COST_PROTECTION } = await import("../constants")
      expect(getGlobalDailyCeiling()).toBe(COST_PROTECTION.GLOBAL_DAILY_SPEND_CEILING_USD)
      // Specifically NOT 0, which is what silently turns the kill-switch off.
      expect(getGlobalDailyCeiling()).not.toBe(0)
    })

    it("logs at ERROR when the env value is set but unusable", async () => {
      process.env[CEILING_ENV] = ""
      const { getGlobalDailyCeiling, resetGlobalCeilingWarnings } = await import(
        "../global-spend-guard"
      )
      const { logger } = await import("../logger")
      resetGlobalCeilingWarnings()
      vi.mocked(logger.error).mockClear()

      getGlobalDailyCeiling()

      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(vi.mocked(logger.error).mock.calls[0][0]).toContain(
        "GLOBAL_DAILY_SPEND_CEILING_USD is set but not a usable"
      )

      // Latched: a per-request log on the hot path carries no new information.
      getGlobalDailyCeiling()
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it("logs at ERROR when an operator deliberately disables the gate", async () => {
      // 0 remains the documented escape hatch from a fail-closed block, but a
      // disabled kill-switch must never be a silent state.
      process.env[CEILING_ENV] = "0"
      const { getGlobalDailyCeiling, resetGlobalCeilingWarnings } = await import(
        "../global-spend-guard"
      )
      const { logger } = await import("../logger")
      resetGlobalCeilingWarnings()
      vi.mocked(logger.error).mockClear()

      expect(getGlobalDailyCeiling()).toBe(0)
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(vi.mocked(logger.error).mock.calls[0][0]).toContain("DISABLED")
    })
  })

  describe("empty env does not disarm the kill-switch end to end", () => {
    it("still blocks over-ceiling spend when the env var is empty", async () => {
      // The whole point. Before this fix an empty value produced ceiling 0,
      // isGlobalCeilingExceeded returned false on the `ceiling <= 0` line, and
      // spend of any size was waved through.
      process.env[CEILING_ENV] = ""
      mockGet.mockResolvedValueOnce({ data: () => ({ totalCost: 999999 }) })
      const { isGlobalCeilingExceeded } = await import("../global-spend-guard")
      expect(await isGlobalCeilingExceeded()).toBe(true)
    })
  })

  describe("getGlobalDailySpend", () => {
    it("returns the stored totalCost", async () => {
      mockGet.mockResolvedValueOnce({ data: () => ({ totalCost: 42.5 }) })
      const { getGlobalDailySpend } = await import("../global-spend-guard")
      expect(await getGlobalDailySpend()).toBe(42.5)
    })

    it("returns 0 when the day doc is missing/empty", async () => {
      mockGet.mockResolvedValueOnce({ data: () => undefined })
      const { getGlobalDailySpend } = await import("../global-spend-guard")
      expect(await getGlobalDailySpend()).toBe(0)
    })
  })

  describe("isGlobalCeilingExceeded", () => {
    it("is false when spend is under the ceiling", async () => {
      process.env[CEILING_ENV] = "50"
      mockGet.mockResolvedValueOnce({ data: () => ({ totalCost: 10 }) })
      const { isGlobalCeilingExceeded } = await import("../global-spend-guard")
      expect(await isGlobalCeilingExceeded()).toBe(false)
    })

    it("is true once spend reaches the ceiling", async () => {
      process.env[CEILING_ENV] = "50"
      mockGet.mockResolvedValueOnce({ data: () => ({ totalCost: 50 }) })
      const { isGlobalCeilingExceeded } = await import("../global-spend-guard")
      expect(await isGlobalCeilingExceeded()).toBe(true)
    })

    it("is disabled (always false) when the ceiling is 0", async () => {
      process.env[CEILING_ENV] = "0"
      mockGet.mockResolvedValueOnce({ data: () => ({ totalCost: 999999 }) })
      const { isGlobalCeilingExceeded } = await import("../global-spend-guard")
      expect(await isGlobalCeilingExceeded()).toBe(false)
    })

    it("fails CLOSED (true) when the read throws", async () => {
      // A spend ceiling that releases itself when it cannot read its own gauge
      // is not a ceiling — and the load that runs spend up is the same load that
      // makes Firestore reads fail, so failing open yields exactly when it
      // matters most. Blocking is recoverable in one step; the money is not.
      process.env[CEILING_ENV] = "50"
      mockGet.mockRejectedValueOnce(new Error("firestore down"))
      const { isGlobalCeilingExceeded } = await import("../global-spend-guard")
      expect(await isGlobalCeilingExceeded()).toBe(true)
    })

    it("stays disabled on a read error when the gate is turned off", async () => {
      // The env kill-switch is the operator's escape hatch from a fail-closed
      // block, so it must not itself depend on a working Firestore read.
      process.env[CEILING_ENV] = "0"
      mockGet.mockRejectedValueOnce(new Error("firestore down"))
      const { isGlobalCeilingExceeded } = await import("../global-spend-guard")
      expect(await isGlobalCeilingExceeded()).toBe(false)
    })
  })

  describe("recordGlobalSpend", () => {
    it("increments the daily counter for a positive cost", async () => {
      const { recordGlobalSpend } = await import("../global-spend-guard")
      await recordGlobalSpend(0.0123)
      expect(mockSet).toHaveBeenCalledTimes(1)
      const [payload, opts] = mockSet.mock.calls[0]
      expect(payload).toMatchObject({ totalCost: { __increment: 0.0123 } })
      expect(opts).toEqual({ merge: true })
    })

    it("ignores zero / negative / non-finite costs", async () => {
      const { recordGlobalSpend } = await import("../global-spend-guard")
      await recordGlobalSpend(0)
      await recordGlobalSpend(-5)
      await recordGlobalSpend(Number.NaN)
      expect(mockSet).not.toHaveBeenCalled()
    })

    it("never throws when the write fails", async () => {
      mockSet.mockRejectedValueOnce(new Error("write failed"))
      const { recordGlobalSpend } = await import("../global-spend-guard")
      await expect(recordGlobalSpend(1)).resolves.toBeUndefined()
    })
  })
})

/**
 * A transient read failure is not the same as spend being invisible.
 *
 * The gate fails closed by design, and that argument is sound: a brake that
 * releases itself when it cannot read its gauge is not a brake. But it had no
 * memory, so one Firestore blip refused every AI turn on the platform, mid
 * interview, for users nowhere near any budget. A successful reading taken
 * moments earlier is real evidence and now answers the failure, provided it
 * showed enough headroom that the ceiling cannot have been crossed since.
 */
describe("isGlobalCeilingExceeded, read failure with a recent reading", () => {
  const CEILING = "100"

  beforeEach(async () => {
    process.env[CEILING_ENV] = CEILING
    const { __resetSpendReadingForTests } = await import("../global-spend-guard")
    __resetSpendReadingForTests()
    mockGet.mockReset()
  })

  it("blocks when the read fails and nothing was ever read", async () => {
    const { isGlobalCeilingExceeded } = await import("../global-spend-guard")
    mockGet.mockRejectedValue(new Error("firestore unavailable"))

    expect(await isGlobalCeilingExceeded()).toBe(true)
  })

  it("allows when a recent reading showed real headroom", async () => {
    const { isGlobalCeilingExceeded } = await import("../global-spend-guard")

    mockGet.mockResolvedValueOnce({ data: () => ({ totalCost: 5 }) })
    expect(await isGlobalCeilingExceeded()).toBe(false)

    mockGet.mockRejectedValue(new Error("firestore blip"))
    expect(await isGlobalCeilingExceeded()).toBe(false)
  })

  it("still blocks when the recent reading was close to the ceiling", async () => {
    // 85 of 100 is inside the headroom margin, so the ceiling could plausibly
    // have been crossed while the gauge was unreadable.
    const { isGlobalCeilingExceeded } = await import("../global-spend-guard")

    mockGet.mockResolvedValueOnce({ data: () => ({ totalCost: 85 }) })
    expect(await isGlobalCeilingExceeded()).toBe(false)

    mockGet.mockRejectedValue(new Error("firestore blip"))
    expect(await isGlobalCeilingExceeded()).toBe(true)
  })

  it("stops trusting a reading once it is older than the grace window", async () => {
    const { isGlobalCeilingExceeded } = await import("../global-spend-guard")

    const start = new Date("2026-08-08T12:00:00Z")
    mockGet.mockResolvedValueOnce({ data: () => ({ totalCost: 5 }) })
    expect(await isGlobalCeilingExceeded(start)).toBe(false)

    mockGet.mockRejectedValue(new Error("firestore blip"))
    const wellPast = new Date(start.getTime() + 5 * 60 * 1000)
    expect(await isGlobalCeilingExceeded(wellPast)).toBe(true)
  })
})
