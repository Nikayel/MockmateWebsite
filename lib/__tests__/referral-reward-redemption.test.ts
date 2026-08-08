/**
 * Tests for recordRewardRedemption (REV-5 / REV-6).
 *
 * The bug these guard: the old "Mark Credited" action decremented the
 * referrer's `pendingFreeMonths` and incremented `totalFreeMonthsEarned` while
 * nothing in the platform ever applied a free month. Clicking it deleted the
 * only record that a reward was owed.
 *
 * So the load-bearing assertion here is a NEGATIVE one: recording a redemption
 * must not write to the referrer's user document at all.
 */

import { describe, it, expect, beforeEach, vi } from "vitest"

interface UpdatePayload {
  [key: string]: unknown
}

const { state } = vi.hoisted(() => ({
  state: {
    rewardDoc: null as { exists: boolean; data: () => Record<string, unknown> } | null,
    updates: [] as Array<{ path: string; payload: UpdatePayload }>,
    /** Every collection name touched during the call, reads included. */
    collectionsTouched: [] as string[],
    transactionThrows: false,
  },
}))

vi.mock("../firebase-admin", () => {
  const makeDocRef = (collectionName: string, id: string) => ({
    __path: `${collectionName}/${id}`,
    get: vi.fn(async () => state.rewardDoc),
    update: vi.fn(async (payload: UpdatePayload) => {
      state.updates.push({ path: `${collectionName}/${id}`, payload })
    }),
  })

  return {
    adminDb: {
      collection: vi.fn((name: string) => {
        state.collectionsTouched.push(name)
        return {
          doc: vi.fn((id: string) => makeDocRef(name, id)),
        }
      }),
      runTransaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
        if (state.transactionThrows) throw new Error("contention")
        const transaction = {
          get: vi.fn(async () => state.rewardDoc),
          update: vi.fn((ref: { __path: string }, payload: UpdatePayload) => {
            state.updates.push({ path: ref.__path, payload })
          }),
        }
        return callback(transaction)
      }),
    },
  }
})

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((n: number) => ({ __increment: n })),
    serverTimestamp: vi.fn(() => "__ts"),
  },
}))

vi.mock("../logger", () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock("nanoid", () => ({ customAlphabet: () => () => "TESTCODE1" }))

import { recordRewardRedemption } from "../referrals"

function pendingReward(overrides: Record<string, unknown> = {}) {
  return {
    exists: true,
    data: () => ({
      referrerId: "referrer-1",
      referredUserId: "referred-1",
      type: "signup_credit",
      amount: 1,
      status: "pending",
      ...overrides,
    }),
  }
}

const baseInput = {
  rewardId: "reward-1",
  adminUserId: "admin-9",
  reference: "PAYPAL-8891",
  eligibilityOverridden: false,
}

describe("recordRewardRedemption", () => {
  beforeEach(() => {
    state.rewardDoc = null
    state.updates = []
    state.collectionsTouched = []
    state.transactionThrows = false
  })

  it("records the redemption against the reward", async () => {
    state.rewardDoc = pendingReward()

    const result = await recordRewardRedemption(baseInput)

    expect(result.ok).toBe(true)
    expect(state.updates).toHaveLength(1)
    const [{ path, payload }] = state.updates
    expect(path).toBe("referral_rewards/reward-1")
    expect(payload.status).toBe("redemption_recorded")
    expect(payload.redemptionReference).toBe("PAYPAL-8891")
    expect(payload.redemptionMethod).toBe("manual_out_of_band")
    expect(payload.processedBy).toBe("admin-9")
  })

  it("does NOT touch the referrer's balances, because nothing was delivered", async () => {
    // This is the regression that matters. The reward stays on the books as
    // owed until something actually applies it.
    state.rewardDoc = pendingReward()

    await recordRewardRedemption(baseInput)

    expect(state.collectionsTouched).not.toContain("users")
    for (const { payload } of state.updates) {
      expect(payload).not.toHaveProperty("pendingFreeMonths")
      expect(payload).not.toHaveProperty("totalFreeMonthsEarned")
      expect(payload).not.toHaveProperty("pendingCashRewards")
      expect(payload).not.toHaveProperty("totalCashEarned")
    }
  })

  it("leaves cash rewards alone too", async () => {
    state.rewardDoc = pendingReward({ type: "conversion_cash", amount: 10 })

    const result = await recordRewardRedemption(baseInput)

    expect(result.ok).toBe(true)
    expect(state.collectionsTouched).not.toContain("users")
    // One status, for every type. The old code branched to "paid" vs
    // "credited" and the UI then tested for the wrong one.
    expect(state.updates[0].payload.status).toBe("redemption_recorded")
  })

  it("records whether the eligibility gate was overridden", async () => {
    state.rewardDoc = pendingReward()

    await recordRewardRedemption({ ...baseInput, eligibilityOverridden: true })

    expect(state.updates[0].payload.redemptionEligibilityOverridden).toBe(true)
  })

  it("writes null rather than undefined for absent notes", async () => {
    // Firestore rejects a document containing `undefined`; the old code passed
    // `notes || undefined` straight into update().
    state.rewardDoc = pendingReward()

    await recordRewardRedemption(baseInput)

    expect(state.updates[0].payload.notes).toBeNull()
    for (const value of Object.values(state.updates[0].payload)) {
      expect(value).not.toBeUndefined()
    }
  })

  it("trims a padded reference before storing it", async () => {
    state.rewardDoc = pendingReward()

    await recordRewardRedemption({ ...baseInput, reference: "  PAYPAL-8891  " })

    expect(state.updates[0].payload.redemptionReference).toBe("PAYPAL-8891")
  })

  it("refuses a blank reference and writes nothing", async () => {
    state.rewardDoc = pendingReward()

    const result = await recordRewardRedemption({ ...baseInput, reference: "   " })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("missing_reference")
    expect(state.updates).toHaveLength(0)
  })

  it("refuses a second recording of the same reward", async () => {
    state.rewardDoc = pendingReward({ status: "redemption_recorded" })

    const result = await recordRewardRedemption(baseInput)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("not_pending")
    expect(state.updates).toHaveLength(0)
  })

  it("refuses a voided reward", async () => {
    state.rewardDoc = pendingReward({ status: "voided" })

    const result = await recordRewardRedemption(baseInput)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("not_pending")
    expect(state.updates).toHaveLength(0)
  })

  it("reports a missing reward as not_found", async () => {
    state.rewardDoc = { exists: false, data: () => ({}) }

    const result = await recordRewardRedemption(baseInput)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("not_found")
  })

  it("surfaces a failed write instead of reporting success", async () => {
    state.rewardDoc = pendingReward()
    state.transactionThrows = true

    const result = await recordRewardRedemption(baseInput)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe("write_failed")
  })

  it("returns a before/after pair the audit trail can record", async () => {
    state.rewardDoc = pendingReward()

    const result = await recordRewardRedemption(baseInput)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.before.status).toBe("pending")
      expect(result.before.redemptionReference).toBeNull()
      expect(result.after.status).toBe("redemption_recorded")
      expect(result.after.redemptionReference).toBe("PAYPAL-8891")
      expect(result.after.referrerId).toBe("referrer-1")
    }
  })
})
