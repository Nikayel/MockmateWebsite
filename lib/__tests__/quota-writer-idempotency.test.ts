import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { getSessionsLimitForTier } from "@/lib/pricing"

// DUP-3 regression: the shared canonical quota writer must zero a user's usage at MOST
// once per billing period. A retried invoice.paid (resetUsage:true) in the SAME period
// must be an idempotent no-op on the reset fields, so a paying user cannot have their
// mid-period sessions silently re-zeroed (which would hand them unpaid usage / mask usage).

const PERIOD_START = new Date("2025-03-01T00:00:00.000Z")
const PERIOD_END = new Date("2025-03-31T23:59:59.999Z")

const quotaGet = vi.fn()
const quotaAdd = vi.fn()
const docUpdate = vi.fn()

function makeQuotaDoc(data: Record<string, unknown>) {
  return {
    data: () => data,
    ref: { update: docUpdate },
  }
}

function buildAdminDb() {
  const quotaQuery: Record<string, unknown> = {}
  quotaQuery.where = vi.fn(() => quotaQuery)
  quotaQuery.orderBy = vi.fn(() => quotaQuery)
  quotaQuery.limit = vi.fn(() => quotaQuery)
  quotaQuery.get = quotaGet
  quotaQuery.add = quotaAdd
  return {
    collection: vi.fn(() => quotaQuery),
  }
}

async function importWriter() {
  vi.resetModules()

  vi.doMock("stripe", () => ({ default: vi.fn(() => ({})) }))
  vi.doMock("@/lib/firebase-admin", () => ({ adminDb: buildAdminDb() }))
  vi.doMock("@/lib/firestore-helpers", () => ({
    calculateBillingPeriod: vi.fn(() => ({
      periodStart: PERIOD_START,
      periodEnd: PERIOD_END,
    })),
  }))
  vi.doMock("@/lib/logger", () => ({
    logger: {
      child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), payment: vi.fn() }),
      payment: vi.fn(),
    },
  }))

  return import("@/lib/stripe-helpers")
}

describe("updateQuotaForSubscriptionTierAdmin — reset idempotency", () => {
  beforeEach(() => {
    quotaGet.mockReset()
    quotaAdd.mockReset().mockResolvedValue(undefined)
    docUpdate.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it("does NOT re-zero usage when last_reset_period_start already equals the current period", async () => {
    quotaGet.mockResolvedValue({
      docs: [
        makeQuotaDoc({
          period_start: PERIOD_START.toISOString(),
          period_end: PERIOD_END.toISOString(),
          sessions_used: 12,
          sessions_limit: getSessionsLimitForTier("pro"),
          // Already reset for THIS period (e.g. from the first invoice.paid delivery)
          last_reset_period_start: PERIOD_START.toISOString(),
        }),
      ],
    })

    const { updateQuotaForSubscriptionTierAdmin } = await importWriter()
    await updateQuotaForSubscriptionTierAdmin("user_1", "pro", {
      resetUsage: true,
      profileData: { created_at: "2025-01-15T00:00:00.000Z", subscription_type: "monthly" },
    })

    expect(quotaAdd).not.toHaveBeenCalled()
    expect(docUpdate).toHaveBeenCalledTimes(1)

    const payload = docUpdate.mock.calls[0][0] as Record<string, unknown>
    // Idempotent no-op on the reset fields: a retry must NOT re-zero mid-period usage.
    expect(payload).not.toHaveProperty("sessions_used")
    expect(payload).not.toHaveProperty("free_opens_remaining")
    expect(payload).not.toHaveProperty("last_reset_period_start")
    // The limit/period are still synced on every call.
    expect(payload.sessions_limit).toBe(getSessionsLimitForTier("pro"))
  })

  it("DOES zero usage and stamps last_reset_period_start when the stored period differs", async () => {
    quotaGet.mockResolvedValue({
      docs: [
        makeQuotaDoc({
          period_start: PERIOD_START.toISOString(),
          period_end: PERIOD_END.toISOString(),
          sessions_used: 12,
          sessions_limit: getSessionsLimitForTier("pro"),
          // Reset stamp is from the PREVIOUS period -> a genuine new-period reset must run.
          last_reset_period_start: "2025-02-01T00:00:00.000Z",
        }),
      ],
    })

    const { updateQuotaForSubscriptionTierAdmin } = await importWriter()
    await updateQuotaForSubscriptionTierAdmin("user_1", "pro", {
      resetUsage: true,
      profileData: { created_at: "2025-01-15T00:00:00.000Z", subscription_type: "monthly" },
    })

    expect(quotaAdd).not.toHaveBeenCalled()
    expect(docUpdate).toHaveBeenCalledTimes(1)

    const payload = docUpdate.mock.calls[0][0] as Record<string, unknown>
    expect(payload.sessions_used).toBe(0)
    expect(payload.free_opens_remaining).toBe(0)
    expect(payload.last_reset_period_start).toBe(PERIOD_START.toISOString())
  })
})
