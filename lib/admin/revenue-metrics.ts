/**
 * Revenue metric definitions for the admin dashboard.
 *
 * Every function here is pure so the definitions can be tested without
 * Firestore or Stripe. Three rules govern this module:
 *
 * 1. MRR is point in time. It is computed from the subscriptions billing us
 *    right now, so it does not move when the time picker moves. The route used
 *    to add a headcount times list price to (range-limited yearly revenue) / 12,
 *    which meant switching from 90d to 7d lowered "MRR". Real MRR does not work
 *    that way.
 * 2. Money is in CENTS everywhere in this module. `payment_history.amount` is
 *    written in cents by the Stripe webhook, with refunds stored as NEGATIVE
 *    cents alongside a "refunded" status. Dollars appear only at the render
 *    boundary, via `centsToDollars`. Other collections (referral_rewards) store
 *    dollars and must never be fed through these functions.
 * 3. No ratio can exceed 100%. Where a natural rate could (refunds in a window
 *    can settle charges from before it), the denominator is widened to the set
 *    the numerator is drawn from, and the metric is renamed to match.
 */

import { getAnnualPrice, getMonthlyPrice } from "@/lib/pricing"
import type { BillingSubscriptionCounts } from "./subscription-state"

const MONTHS_PER_YEAR = 12

/** List prices in cents, so the arithmetic below never touches floats. */
export interface ListPricesCents {
  /** Charged every month for a Pro monthly subscription. */
  proMonthly: number
  /** Charged once a year for a Pro yearly subscription. */
  proYearlyTotal: number
  /** Charged every month for an Enterprise subscription. */
  enterpriseMonthly: number
}

/** The live list prices, converted from the dollars in lib/pricing. */
export function getListPricesCents(): ListPricesCents {
  return {
    proMonthly: Math.round(getMonthlyPrice("pro") * 100),
    proYearlyTotal: Math.round(getAnnualPrice("pro") * 100),
    enterpriseMonthly: Math.round(getMonthlyPrice("enterprise") * 100),
  }
}

/** MRR broken down by what produced it, all in cents. */
export interface MrrBreakdownCents {
  proMonthly: number
  /** Yearly plans amortised over 12 months, not counted at their annual price. */
  proYearly: number
  enterprise: number
  total: number
}

/**
 * Monthly recurring revenue in cents from the subscriptions billing us today.
 *
 * Amortisation is applied to the yearly cohort as a whole rather than per
 * subscriber, so a $225 plan contributes exactly $18.75 a month and ten of them
 * contribute exactly $187.50 rather than ten separately rounded figures.
 */
export function computeMrrCents(
  counts: BillingSubscriptionCounts,
  prices: ListPricesCents = getListPricesCents()
): MrrBreakdownCents {
  const proMonthly = counts.proMonthly * prices.proMonthly
  const proYearly = Math.round((counts.proYearly * prices.proYearlyTotal) / MONTHS_PER_YEAR)
  const enterprise = counts.enterprise * prices.enterpriseMonthly
  return {
    proMonthly,
    proYearly,
    enterprise,
    total: proMonthly + proYearly + enterprise,
  }
}

/** ARR is MRR times twelve. It inherits MRR's independence from the time range. */
export function computeArrCents(mrrCents: number): number {
  return mrrCents * MONTHS_PER_YEAR
}

/** Cents to dollars, rounded to the cent. The only place units change. */
export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100
}

/** Loose read model over a `payment_history` document. Amounts are in cents. */
export interface PaymentRecordInput {
  amount?: unknown
  status?: unknown
  type?: unknown
  description?: unknown
  created_at?: unknown
}

/** Money that actually moved inside a window, plus the counts behind it. */
export interface PaymentWindowSummary {
  /** Sum of succeeded payments, cents. */
  collectedCents: number
  /** Sum of refunds as a positive magnitude, cents. */
  refundedCents: number
  /** collectedCents - refundedCents. */
  netCents: number
  succeededCount: number
  refundedCount: number
  /**
   * Share of payment events in the window that were refunds, 0-100.
   *
   * Not "refunds divided by payments": a refund can settle a charge from before
   * the window, so that ratio can exceed 100% and did. The denominator here is
   * every payment event counted, which the numerator is drawn from, so the
   * figure is bounded by construction.
   */
  refundShareOfEventsPercent: number
}

function readCents(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

/**
 * Total what a set of `payment_history` documents did. The caller decides which
 * documents are in scope; this function does not filter by date, so it can
 * never disagree with the window the caller labelled the result with.
 */
export function summarizePaymentWindow(
  payments: Iterable<PaymentRecordInput>
): PaymentWindowSummary {
  let collectedCents = 0
  let refundedCents = 0
  let succeededCount = 0
  let refundedCount = 0

  for (const payment of payments) {
    const amount = readCents(payment.amount)
    if (amount === null) continue

    if (payment.status === "succeeded" && amount > 0) {
      collectedCents += amount
      succeededCount++
    } else if (payment.status === "refunded" || amount < 0) {
      // Refunds are written as negative cents; take the magnitude so the
      // refund total reads as an amount rather than a signed delta.
      refundedCents += Math.abs(amount)
      refundedCount++
    }
  }

  const events = succeededCount + refundedCount
  return {
    collectedCents,
    refundedCents,
    netCents: collectedCents - refundedCents,
    succeededCount,
    refundedCount,
    refundShareOfEventsPercent: events > 0 ? (refundedCount / events) * 100 : 0,
  }
}

/** Loose read model over a Stripe charge. Stripe amounts are always cents. */
export interface StripeChargeInput {
  amount?: unknown
  amount_refunded?: unknown
  status?: unknown
}

/** What a page of Stripe charges adds up to, with the caveats it carries. */
export interface StripeChargeSummary {
  /** Succeeded charge amounts, cents. */
  collectedCents: number
  /**
   * Amount refunded against those charges, cents. Attributed to the CHARGE, not
   * to the date the refund happened, so this is not "refunds in the window".
   */
  refundedAgainstTheseChargesCents: number
  chargeCount: number
}

/** Total a set of Stripe charges. The caller is responsible for fetching all pages. */
export function summarizeStripeCharges(
  charges: Iterable<StripeChargeInput>
): StripeChargeSummary {
  let collectedCents = 0
  let refundedAgainstTheseChargesCents = 0
  let chargeCount = 0

  for (const charge of charges) {
    chargeCount++
    const amount = readCents(charge.amount) ?? 0
    const refunded = readCents(charge.amount_refunded) ?? 0
    if (charge.status === "succeeded") collectedCents += amount
    refundedAgainstTheseChargesCents += Math.abs(refunded)
  }

  return { collectedCents, refundedAgainstTheseChargesCents, chargeCount }
}

/** Daily revenue for the chart, cents, keyed by ISO date. */
export interface RevenuePoint {
  date: string
  revenueCents: number
  refundsCents: number
  payments: number
}

/**
 * Daily buckets from `payment_history`. Documents with no usable `created_at`
 * are dropped rather than filed under an "unknown" bucket that then renders as
 * a date on a time axis.
 */
export function buildRevenueTimeSeries(
  payments: Iterable<PaymentRecordInput>
): RevenuePoint[] {
  const buckets = new Map<string, RevenuePoint>()

  for (const payment of payments) {
    const createdAt = payment.created_at
    if (typeof createdAt !== "string" || createdAt.length < 10) continue
    const date = createdAt.slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue

    const amount = readCents(payment.amount)
    if (amount === null) continue

    let bucket = buckets.get(date)
    if (!bucket) {
      bucket = { date, revenueCents: 0, refundsCents: 0, payments: 0 }
      buckets.set(date, bucket)
    }

    if (payment.status === "succeeded" && amount > 0) {
      bucket.revenueCents += amount
      bucket.payments++
    } else if (payment.status === "refunded" || amount < 0) {
      bucket.refundsCents += Math.abs(amount)
    }
  }

  return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date))
}
