import { describe, it, expect } from "vitest"
import {
  buildRevenueTimeSeries,
  centsToDollars,
  computeArrCents,
  computeMrrCents,
  getListPricesCents,
  summarizePaymentWindow,
  summarizeStripeCharges,
  type ListPricesCents,
} from "../revenue-metrics"
import { countBillingSubscriptions } from "../subscription-state"

/**
 * "MRR (Actual), based on actual payments" was headcount times list price plus
 * (range-limited yearly revenue) / 12, so it fell when you narrowed the time
 * picker. These tests pin MRR as a point-in-time figure, and pin the cents
 * boundary that separates Stripe's units from the dollars we render.
 */

const PRICES: ListPricesCents = {
  proMonthly: 2500,
  proYearlyTotal: 22500,
  enterpriseMonthly: 9900,
}

describe("computeMrrCents", () => {
  it("prices each billing subscription by what it actually pays", () => {
    const mrr = computeMrrCents(
      { proMonthly: 4, proYearly: 2, enterprise: 1, total: 7, unknownBillingState: 0 },
      PRICES
    )
    expect(mrr.proMonthly).toBe(10000)
    expect(mrr.proYearly).toBe(3750) // 2 x $225 / 12 = $37.50
    expect(mrr.enterprise).toBe(9900)
    expect(mrr.total).toBe(23650)
  })

  it("amortises a yearly plan over twelve months instead of pricing it at the monthly rate", () => {
    // The old calculated MRR counted every pro profile at $25/mo, yearly
    // included, so a $225/yr customer was booked at $25 rather than $18.75.
    const yearly = computeMrrCents(
      { proMonthly: 0, proYearly: 1, enterprise: 0, total: 1, unknownBillingState: 0 },
      PRICES
    )
    expect(yearly.total).toBe(1875)
    expect(yearly.total).not.toBe(PRICES.proMonthly)
  })

  it("amortises the yearly cohort as a whole, so ten plans are exactly ten times one", () => {
    const one = computeMrrCents(
      { proMonthly: 0, proYearly: 1, enterprise: 0, total: 1, unknownBillingState: 0 },
      { ...PRICES, proYearlyTotal: 22505 }
    )
    const ten = computeMrrCents(
      { proMonthly: 0, proYearly: 10, enterprise: 0, total: 10, unknownBillingState: 0 },
      { ...PRICES, proYearlyTotal: 22505 }
    )
    expect(ten.total).toBe(Math.round((10 * 22505) / 12))
    expect(ten.total).not.toBe(one.total * 10) // per-subscriber rounding would drift
  })

  it("counts nothing for lapsed, trialing, or status-less paid profiles", () => {
    const counts = countBillingSubscriptions([
      { userId: "a", subscription_tier: "pro", subscription_status: "past_due" },
      { userId: "b", subscription_tier: "pro", subscription_status: "trialing" },
      { userId: "c", subscription_tier: "pro" },
      { userId: "d", subscription_tier: "free" },
    ])
    expect(computeMrrCents(counts, PRICES).total).toBe(0)
  })

  it("does not vary with the selected time range", () => {
    // MRR takes no date argument at all: the profiles that are billing today
    // are the same set whichever range the page is showing. This test exists to
    // make that a property of the signature, not just of the current call site.
    const profiles = [
      { userId: "a", subscription_tier: "pro", subscription_status: "active" },
      { userId: "b", subscription_tier: "pro", subscription_status: "active", subscription_type: "yearly" },
    ]
    const results = ["7d", "30d", "90d", "all"].map(() =>
      computeMrrCents(countBillingSubscriptions(profiles), PRICES).total
    )
    expect(new Set(results).size).toBe(1)
    expect(results[0]).toBe(2500 + 1875)
  })

  it("uses the live list prices when none are supplied", () => {
    const prices = getListPricesCents()
    expect(prices.proMonthly).toBeGreaterThan(0)
    expect(Number.isInteger(prices.proMonthly)).toBe(true)
    expect(Number.isInteger(prices.proYearlyTotal)).toBe(true)
    const mrr = computeMrrCents({
      proMonthly: 1,
      proYearly: 0,
      enterprise: 0,
      total: 1,
      unknownBillingState: 0,
    })
    expect(mrr.total).toBe(prices.proMonthly)
  })
})

describe("computeArrCents", () => {
  it("is twelve times MRR", () => {
    expect(computeArrCents(2500)).toBe(30000)
    expect(computeArrCents(0)).toBe(0)
  })
})

describe("centsToDollars", () => {
  it("crosses the unit boundary exactly once, at the render edge", () => {
    expect(centsToDollars(2500)).toBe(25)
    expect(centsToDollars(1875)).toBe(18.75)
    expect(centsToDollars(1)).toBe(0.01)
    expect(centsToDollars(0)).toBe(0)
  })

  it("does not accumulate float error across a large total", () => {
    // 1000 payments of $18.75 summed in cents, then converted once.
    const totalCents = 1875 * 1000
    expect(centsToDollars(totalCents)).toBe(18750)
  })
})

describe("summarizePaymentWindow", () => {
  it("reads payment_history amounts as cents, refunds as negative cents", () => {
    const summary = summarizePaymentWindow([
      { amount: 2500, status: "succeeded" },
      { amount: 22500, status: "succeeded" },
      { amount: -2500, status: "refunded" },
    ])
    expect(summary.collectedCents).toBe(25000)
    expect(summary.refundedCents).toBe(2500)
    expect(summary.netCents).toBe(22500)
    expect(centsToDollars(summary.netCents)).toBe(225)
  })

  it("ignores failed payments and unparseable amounts", () => {
    const summary = summarizePaymentWindow([
      { amount: 2500, status: "failed" },
      { amount: "2500", status: "succeeded" },
      { status: "succeeded" },
      { amount: 2500, status: "succeeded" },
    ])
    expect(summary.collectedCents).toBe(2500)
    expect(summary.succeededCount).toBe(1)
  })

  it("treats a negative amount as a refund even without the refunded status", () => {
    const summary = summarizePaymentWindow([{ amount: -1000, status: "succeeded" }])
    expect(summary.refundedCents).toBe(1000)
    expect(summary.collectedCents).toBe(0)
  })

  it("keeps the refund share at or below 100% even in an all-refunds window", () => {
    // The old refund rate divided refunds by payments, so a window holding
    // refunds for charges made earlier printed above 100%.
    const summary = summarizePaymentWindow([
      { amount: -2500, status: "refunded" },
      { amount: -2500, status: "refunded" },
    ])
    expect(summary.refundShareOfEventsPercent).toBe(100)
    expect(summary.succeededCount).toBe(0)
  })

  it("returns zeroes rather than NaN for an empty window", () => {
    expect(summarizePaymentWindow([])).toEqual({
      collectedCents: 0,
      refundedCents: 0,
      netCents: 0,
      succeededCount: 0,
      refundedCount: 0,
      refundShareOfEventsPercent: 0,
    })
  })
})

describe("summarizeStripeCharges", () => {
  it("totals succeeded charges and the refunds booked against them", () => {
    const summary = summarizeStripeCharges([
      { amount: 2500, amount_refunded: 0, status: "succeeded" },
      { amount: 22500, amount_refunded: 22500, status: "succeeded" },
      { amount: 2500, amount_refunded: 0, status: "failed" },
    ])
    expect(summary.collectedCents).toBe(25000)
    expect(summary.refundedAgainstTheseChargesCents).toBe(22500)
    expect(summary.chargeCount).toBe(3)
  })

  it("counts every charge it is given, so a truncated fetch is the caller's problem to declare", () => {
    const charges = Array.from({ length: 250 }, () => ({
      amount: 100,
      amount_refunded: 0,
      status: "succeeded",
    }))
    expect(summarizeStripeCharges(charges).chargeCount).toBe(250)
    expect(summarizeStripeCharges(charges).collectedCents).toBe(25000)
  })
})

describe("buildRevenueTimeSeries", () => {
  it("buckets by day in cents and sorts ascending", () => {
    const series = buildRevenueTimeSeries([
      { amount: 2500, status: "succeeded", created_at: "2026-08-02T10:00:00.000Z" },
      { amount: 2500, status: "succeeded", created_at: "2026-08-01T10:00:00.000Z" },
      { amount: -2500, status: "refunded", created_at: "2026-08-02T12:00:00.000Z" },
    ])
    expect(series).toEqual([
      { date: "2026-08-01", revenueCents: 2500, refundsCents: 0, payments: 1 },
      { date: "2026-08-02", revenueCents: 2500, refundsCents: 2500, payments: 1 },
    ])
  })

  it("drops documents with no usable date instead of charting an unknown bucket", () => {
    const series = buildRevenueTimeSeries([
      { amount: 2500, status: "succeeded" },
      { amount: 2500, status: "succeeded", created_at: "not-a-date" },
      { amount: 2500, status: "succeeded", created_at: 1234567890 },
    ])
    expect(series).toEqual([])
  })
})
