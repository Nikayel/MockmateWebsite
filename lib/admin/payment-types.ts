/**
 * The wire contract for GET /api/admin/payments.
 *
 * These five interfaces were declared twice, character for character: once in
 * the route that builds the response and once in the page that renders it.
 * Neither file can import the other (the route pulls in the Admin SDK, which
 * cannot enter a browser bundle), so the copies had no mechanism keeping them
 * honest. They had already begun to drift on `provenance`, and a renamed field
 * on either side would have compiled clean on both while the table rendered
 * `undefined`.
 *
 * Types only, so this module erases at build time and adds nothing to either
 * bundle.
 *
 * UNITS: `PaymentRecord.amount` is DOLLARS here. The `payment_history`
 * documents it is built from store CENTS, and the route converts on the way out
 * (see `centsToDollars` in ./revenue-metrics). `VoidedReward.amount` is already
 * dollars, or whole months for a credit, and is never converted.
 */

export interface PaymentRecord {
  id: string
  userId: string
  userEmail?: string
  type: "subscription" | "one_time"
  amount: number
  currency: string
  status: "succeeded" | "failed" | "refunded"
  description?: string
  createdAt: string
}

export interface WebhookEvent {
  id: string
  eventType: string
  processedAt: string
  eventId: string
}

export interface VoidedReward {
  id: string
  referrerId: string
  referrerEmail: string
  referredUserId: string
  referredEmail: string
  type: "signup_cash" | "conversion_credit"
  amount: number
  voidedReason: string
  processedAt: string
}

/** All-time money, aggregated across the whole collection. Dollars. */
export interface PaymentTotals {
  revenue: number
  refunds: number
  net: number
  paymentCount: number
  refundCount: number
  /** Share of payment events that were refunds, 0-100. Cannot exceed 100. */
  refundShareOfEventsPercent: number
}

export interface PaymentStats {
  /** Every payment ever recorded. Not the sample in the tables below. */
  allTime: PaymentTotals
  /** How many documents fed the recent-activity tables. */
  recentSampleSize: number
  recentPayments: PaymentRecord[]
  recentRefunds: PaymentRecord[]
  recentWebhooks: WebhookEvent[]
  voidedRewards: VoidedReward[]
  /**
   * Required, because the two scopes above are easy to confuse and the route
   * must always say which is which. The page still reads it defensively: it
   * parses JSON that a previously deployed build may have produced.
   */
  provenance: {
    allTime: string
    recent: string
  }
}
