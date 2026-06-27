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

    it("fails open (false) when the read throws", async () => {
      process.env[CEILING_ENV] = "50"
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
