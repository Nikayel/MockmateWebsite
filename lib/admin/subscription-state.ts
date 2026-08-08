/**
 * One definition of "this profile is paying us right now".
 *
 * The admin previously answered that question three different ways: the funnel
 * counted any profile whose `subscription_tier` was pro or enterprise, ignoring
 * `subscription_status` entirely; the revenue route's "calculated MRR" did the
 * same; and the revenue route's subscriber breakdown checked
 * `subscription_status === "active"` but only for the pro tier. Three answers
 * to one question is how a dashboard ends up contradicting itself.
 *
 * This module is pure so the definition can be tested without Firestore.
 */

/**
 * Subscription statuses that are billing us this month.
 *
 * `cancel_at_period_end` is included deliberately: the subscription is set not
 * to renew, but the current period is paid for, so it is revenue today.
 * `trialing` is excluded because a trial has not been charged. Every degraded
 * status (`past_due`, `unpaid`, `requires_action`, `paused`, `canceled`,
 * `expired`, `refunded`, `deleted`, `disputed`, `uncollectible`) is excluded,
 * which matches the entitlement rule in lib/quota-enforcement.ts. Anything not
 * on this list is treated as not billing, so a status we have never seen fails
 * closed rather than inflating revenue.
 */
export const BILLING_SUBSCRIPTION_STATUSES: ReadonlySet<string> = new Set([
  "active",
  "cancel_at_period_end",
])

/** Tiers that carry a price. `free` is not one of them. */
export const PAID_TIERS = ["pro", "enterprise"] as const
export type PaidTier = (typeof PAID_TIERS)[number]

/** Loose read model over a `profiles` document. Fields are unknown until narrowed. */
export interface SubscriptionProfileInput {
  userId: string
  subscription_tier?: unknown
  subscription_status?: unknown
  subscription_type?: unknown
}

/** What we can say about one profile's billing state, with no guessing. */
export type BillingState =
  /** Paid tier and a status that is billing this month. */
  | { kind: "billing"; tier: PaidTier; interval: "monthly" | "yearly" }
  /** Paid tier but no usable `subscription_status`, so we cannot claim revenue. */
  | { kind: "unknown"; tier: PaidTier }
  /** Free tier, or a paid tier in a status that is not billing. */
  | { kind: "not_billing" }

function readPaidTier(value: unknown): PaidTier | null {
  return value === "pro" || value === "enterprise" ? value : null
}

/**
 * Yearly only when the profile says so. A missing `subscription_type` on a
 * monthly-by-default product means monthly, which is what the checkout writes.
 */
function readInterval(value: unknown): "monthly" | "yearly" {
  return value === "yearly" ? "yearly" : "monthly"
}

/** Classify one profile. Never throws; unrecognised shapes come back not_billing. */
export function classifyBillingState(profile: SubscriptionProfileInput): BillingState {
  const tier = readPaidTier(profile.subscription_tier)
  if (!tier) return { kind: "not_billing" }

  const status = profile.subscription_status
  if (typeof status !== "string" || status.length === 0) {
    // A paid tier with no status is an unresolved account (hand-granted, or a
    // profile written before the webhook stamped a status). Reporting it as
    // revenue would be an invention; reporting it as free would hide it. It
    // gets its own bucket so the admin can see the ambiguity.
    return { kind: "unknown", tier }
  }

  if (!BILLING_SUBSCRIPTION_STATUSES.has(status)) return { kind: "not_billing" }

  return { kind: "billing", tier, interval: readInterval(profile.subscription_type) }
}

/** True only for profiles billing us this month. */
export function isCurrentlyBilling(profile: SubscriptionProfileInput): boolean {
  return classifyBillingState(profile).kind === "billing"
}

/**
 * The user ids billing us right now. This is a point-in-time set: it does not
 * depend on any selected time range, because "who is paying today" is not a
 * question a date picker can change.
 */
export function selectBillingUserIds(profiles: Iterable<SubscriptionProfileInput>): Set<string> {
  const ids = new Set<string>()
  for (const profile of profiles) {
    if (profile.userId && isCurrentlyBilling(profile)) ids.add(profile.userId)
  }
  return ids
}

/** Head counts of currently billing subscriptions, split the way they are priced. */
export interface BillingSubscriptionCounts {
  proMonthly: number
  proYearly: number
  enterprise: number
  /** proMonthly + proYearly + enterprise. */
  total: number
  /** Paid tier, no usable status. Excluded from every count above. */
  unknownBillingState: number
}

/** Count currently billing subscriptions by the shape that determines their price. */
export function countBillingSubscriptions(
  profiles: Iterable<SubscriptionProfileInput>
): BillingSubscriptionCounts {
  const counts: BillingSubscriptionCounts = {
    proMonthly: 0,
    proYearly: 0,
    enterprise: 0,
    total: 0,
    unknownBillingState: 0,
  }

  for (const profile of profiles) {
    const state = classifyBillingState(profile)
    if (state.kind === "unknown") {
      counts.unknownBillingState++
      continue
    }
    if (state.kind !== "billing") continue

    if (state.tier === "enterprise") counts.enterprise++
    else if (state.interval === "yearly") counts.proYearly++
    else counts.proMonthly++
    counts.total++
  }

  return counts
}
