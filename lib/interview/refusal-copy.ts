/**
 * User-facing copy for the refusals the entitlement, quota, and capacity layer
 * can return.
 *
 * A rate limit, a monthly quota, a daily budget, and a platform-wide spend
 * ceiling are all legitimate and all temporary, and each one has a DIFFERENT
 * thing the user should do next. Collapsing them into "something went wrong"
 * turns a designed refusal into what looks like a broken product, and invites
 * exactly the retry that makes it worse.
 *
 * This module owns the title for each code, and whether upgrading is what
 * actually lifts it, for every surface that has to present one: the interview
 * chat toast and the post-interview feedback toast. It exists because those two
 * surfaces previously kept their own copies, and the one that was written second
 * was already missing a code the first had (DAILY_BUDGET_EXCEEDED), which is how
 * a budget refusal came to be titled "Too many requests".
 *
 * The messages themselves are NOT here: they come from the server, which knows
 * the numbers (which tier, which cap, when it resets). This module only supplies
 * the label and the fallback when a response arrives without one.
 *
 * Keep the keys in sync with the `code` values in lib/quota-enforcement.ts and
 * app/api/feedback/stream/route.ts.
 */

/** Titles for the codes the API can return. */
export const REFUSAL_TITLES: Record<string, string> = {
  QUOTA_EXCEEDED: "You've used this month's sessions",
  BUDGET_EXCEEDED: "You've used this month's AI allowance",
  DAILY_BUDGET_EXCEEDED: "You've used today's AI allowance",
  FREE_TRIAL_EXHAUSTED: "Your free session is finished",
  SUBSCRIPTION_INACTIVE: "Your Pro subscription needs attention",
  PRO_REQUIRED: "This one is part of Pro",
  GLOBAL_CAPACITY_LIMIT: "We're at capacity right now",
  SERVICE_UNAVAILABLE: "That service is briefly unavailable",
  RATE_LIMITED: "Too many requests",
  AUTH_REQUIRED: "Please sign in to continue",
}

/**
 * Codes a user can actually resolve by upgrading.
 *
 * Capacity, rate limiting, and auth problems are deliberately absent: offering
 * to sell someone a plan that will not fix their problem is worse than offering
 * nothing. DAILY_BUDGET_EXCEEDED is absent for the same reason even though a
 * larger plan does carry a larger daily allowance, because the block clears on
 * its own at midnight UTC and the monthly allowance is untouched. Waiting is the
 * honest answer.
 */
export const UPGRADE_RESOLVES: ReadonlySet<string> = new Set([
  "QUOTA_EXCEEDED",
  "BUDGET_EXCEEDED",
  "FREE_TRIAL_EXHAUSTED",
  "SUBSCRIPTION_INACTIVE",
  "PRO_REQUIRED",
])

/** Where a user goes to lift a quota or entitlement block. */
export const UPGRADE_PATH = "/upgrade"

/** True when the API labelled this refusal with something we can present. */
export function isKnownRefusalCode(code: string | undefined): code is string {
  return typeof code === "string" && (code in REFUSAL_TITLES || UPGRADE_RESOLVES.has(code))
}
