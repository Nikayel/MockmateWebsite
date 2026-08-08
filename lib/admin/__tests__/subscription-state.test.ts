import { describe, it, expect } from "vitest"
import {
  BILLING_SUBSCRIPTION_STATUSES,
  classifyBillingState,
  countBillingSubscriptions,
  isCurrentlyBilling,
  selectBillingUserIds,
} from "../subscription-state"

/**
 * The admin used to count a subscriber as anyone whose tier said pro, with no
 * regard for whether the subscription was still being paid. These tests pin the
 * single definition every admin surface now shares.
 */

describe("classifyBillingState", () => {
  it("counts an active paid subscription", () => {
    expect(classifyBillingState({ userId: "u", subscription_tier: "pro", subscription_status: "active" })).toEqual({
      kind: "billing",
      tier: "pro",
      interval: "monthly",
    })
  })

  it("counts a subscription set to cancel at period end, because this period is paid", () => {
    const state = classifyBillingState({
      userId: "u",
      subscription_tier: "pro",
      subscription_status: "cancel_at_period_end",
      subscription_type: "yearly",
    })
    expect(state).toEqual({ kind: "billing", tier: "pro", interval: "yearly" })
  })

  it.each([
    "past_due",
    "canceled",
    "expired",
    "unpaid",
    "refunded",
    "deleted",
    "paused",
    "requires_action",
    "disputed",
    "uncollectible",
    "trialing",
  ])("does not count a %s subscription as revenue", (status) => {
    expect(
      classifyBillingState({ userId: "u", subscription_tier: "pro", subscription_status: status })
    ).toEqual({ kind: "not_billing" })
  })

  it("fails closed on a status nobody has seen before", () => {
    expect(
      classifyBillingState({ userId: "u", subscription_tier: "pro", subscription_status: "quantum" })
    ).toEqual({ kind: "not_billing" })
  })

  it("puts a paid tier with no status in its own bucket rather than claiming revenue", () => {
    expect(classifyBillingState({ userId: "u", subscription_tier: "enterprise" })).toEqual({
      kind: "unknown",
      tier: "enterprise",
    })
    expect(
      classifyBillingState({ userId: "u", subscription_tier: "pro", subscription_status: "" })
    ).toEqual({ kind: "unknown", tier: "pro" })
  })

  it("treats free and missing tiers as not billing", () => {
    expect(classifyBillingState({ userId: "u", subscription_tier: "free" })).toEqual({ kind: "not_billing" })
    expect(classifyBillingState({ userId: "u" })).toEqual({ kind: "not_billing" })
    expect(classifyBillingState({ userId: "u", subscription_tier: 7 })).toEqual({ kind: "not_billing" })
  })

  it("defaults an unspecified interval to monthly, matching what checkout writes", () => {
    const state = classifyBillingState({
      userId: "u",
      subscription_tier: "pro",
      subscription_status: "active",
    })
    expect(state).toEqual({ kind: "billing", tier: "pro", interval: "monthly" })
  })
})

describe("BILLING_SUBSCRIPTION_STATUSES", () => {
  it("is the allowlist the predicate reads, not a denylist", () => {
    for (const status of BILLING_SUBSCRIPTION_STATUSES) {
      expect(isCurrentlyBilling({ userId: "u", subscription_tier: "pro", subscription_status: status })).toBe(true)
    }
    expect(BILLING_SUBSCRIPTION_STATUSES.has("trialing")).toBe(false)
  })
})

describe("selectBillingUserIds", () => {
  it("returns only the ids paying today", () => {
    const ids = selectBillingUserIds([
      { userId: "paying", subscription_tier: "pro", subscription_status: "active" },
      { userId: "lapsed", subscription_tier: "pro", subscription_status: "past_due" },
      { userId: "free", subscription_tier: "free" },
      { userId: "unknown", subscription_tier: "pro" },
    ])
    expect([...ids]).toEqual(["paying"])
  })

  it("skips profiles with no user id", () => {
    const ids = selectBillingUserIds([
      { userId: "", subscription_tier: "pro", subscription_status: "active" },
    ])
    expect(ids.size).toBe(0)
  })
})

describe("countBillingSubscriptions", () => {
  it("splits billing subscriptions by how they are priced", () => {
    const counts = countBillingSubscriptions([
      { userId: "m1", subscription_tier: "pro", subscription_status: "active" },
      { userId: "m2", subscription_tier: "pro", subscription_status: "active", subscription_type: "monthly" },
      { userId: "y1", subscription_tier: "pro", subscription_status: "active", subscription_type: "yearly" },
      { userId: "e1", subscription_tier: "enterprise", subscription_status: "active" },
      { userId: "lapsed", subscription_tier: "pro", subscription_status: "canceled" },
      { userId: "ghost", subscription_tier: "pro" },
      { userId: "free", subscription_tier: "free" },
    ])
    expect(counts).toEqual({
      proMonthly: 2,
      proYearly: 1,
      enterprise: 1,
      total: 4,
      unknownBillingState: 1,
    })
  })

  it("keeps total equal to the sum of the priced buckets", () => {
    const counts = countBillingSubscriptions([
      { userId: "a", subscription_tier: "pro", subscription_status: "active" },
      { userId: "b", subscription_tier: "pro", subscription_status: "active", subscription_type: "yearly" },
      { userId: "c", subscription_tier: "enterprise", subscription_status: "cancel_at_period_end" },
      { userId: "d", subscription_tier: "pro", subscription_status: "trialing" },
    ])
    expect(counts.proMonthly + counts.proYearly + counts.enterprise).toBe(counts.total)
  })

  it("counts nothing for an empty collection", () => {
    expect(countBillingSubscriptions([])).toEqual({
      proMonthly: 0,
      proYearly: 0,
      enterprise: 0,
      total: 0,
      unknownBillingState: 0,
    })
  })
})
