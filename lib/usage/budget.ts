/**
 * Budget cap resolution.
 *
 * One owner for the question "how much AI spend is this account allowed this
 * period". Previously three places answered it independently — the admin usage
 * stats, getUserUsageSummary, and quota-enforcement — each by indexing
 * AI_BUDGET_CAPS with the tier and nothing else.
 *
 * That is why the admin "Set Budget" action did nothing: POST /api/admin/usage
 * writes `custom_budget_cap` to the profile, and no reader consulted it. An
 * admin could raise a user's budget, see the success toast, and the user would
 * still be blocked at the tier cap.
 */

import { AI_BUDGET_CAPS, type SubscriptionTier } from "../pricing"

/** The profile fields budget resolution depends on. */
export interface BudgetProfileFields {
  subscription_tier?: unknown
  custom_budget_cap?: unknown
}

/**
 * Upper bound on a per-user override, mirroring the validation in
 * POST /api/admin/usage. Enforced on read as well as on write so a value
 * written before that validation existed cannot uncap an account.
 */
export const MAX_CUSTOM_BUDGET_CAP = 10000

const TIERS: readonly SubscriptionTier[] = ["free", "pro", "enterprise"]

/** Subscription tier, defaulting to free for missing or unrecognised values. */
export function resolveTier(profile: BudgetProfileFields | undefined): SubscriptionTier {
  const raw = profile?.subscription_tier
  return typeof raw === "string" && (TIERS as readonly string[]).includes(raw)
    ? (raw as SubscriptionTier)
    : "free"
}

/**
 * The account's budget cap in USD: the admin override when one is set and
 * valid, otherwise the tier default.
 *
 * A cap of 0 is meaningful (it blocks all spend) so it is honoured, which is
 * why this tests for a finite number rather than truthiness.
 */
export function resolveBudgetCap(profile: BudgetProfileFields | undefined): number {
  const override = profile?.custom_budget_cap
  if (
    typeof override === "number" &&
    Number.isFinite(override) &&
    override >= 0 &&
    override <= MAX_CUSTOM_BUDGET_CAP
  ) {
    return override
  }
  return AI_BUDGET_CAPS[resolveTier(profile)] ?? AI_BUDGET_CAPS.free
}

/** True when this account's cap came from an admin override rather than its tier. */
export function hasBudgetOverride(profile: BudgetProfileFields | undefined): boolean {
  const override = profile?.custom_budget_cap
  return (
    typeof override === "number" &&
    Number.isFinite(override) &&
    override >= 0 &&
    override <= MAX_CUSTOM_BUDGET_CAP
  )
}

/**
 * Share of the cap consumed, as a percentage.
 *
 * A zero cap would divide by zero; report it as fully consumed when anything
 * was spent and as empty otherwise, which is what both the enforcement path
 * and the admin display want.
 */
export function budgetUsedPercent(cost: number, cap: number): number {
  if (cap <= 0) return cost > 0 ? 100 : 0
  return (cost / cap) * 100
}
