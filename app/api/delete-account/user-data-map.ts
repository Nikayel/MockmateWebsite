/**
 * The authoritative map of where a user's data lives in Firestore.
 *
 * This exists because GDPR erasure is only as good as this list. The previous
 * inline list in route.ts named 18 entries, four of which were collections that
 * no code has ever written (`sessions`, `analytics`, `subscription_history`,
 * `referral_relationships`), five of which used the wrong key, and ~30 of which
 * were simply absent. The route then told the user "all associated data have
 * been permanently deleted".
 *
 * Every entry below was derived by reading the write site, not by guessing from
 * the collection name. The naming is genuinely inconsistent across the codebase
 * (`userId` vs `user_id` vs `referrerId`), so the field is recorded per
 * collection rather than assumed.
 *
 * WHEN YOU ADD A COLLECTION THAT STORES ANYTHING PER USER, ADD IT HERE. The
 * conventions test in `__tests__/user-data-map.test.ts` guards the shape of this
 * file but cannot know about a collection you never told it about.
 */

/**
 * A collection whose document ID *is* the user's uid.
 *
 * These are deleted with `recursiveDelete`, which also removes any
 * subcollections hanging off the user document. `subcollections` is recorded for
 * documentation only: deleting the parent document with a plain `batch.delete()`
 * would orphan the children forever, which is exactly the trap the old code fell
 * into with `problem_mastery`.
 */
export interface UserKeyedDocument {
  collection: string
  /** Known subcollections under the user document, for readers of this file. */
  subcollections?: string[]
  /** Why this holds personal data, when the name does not make it obvious. */
  note?: string
}

/**
 * A collection of documents that reference the user through one or more fields.
 *
 * `fields` may hold more than one entry either because the same document can be
 * attached to a user in two roles (referrer / referred) or because the write
 * path stamps the id under two different spellings.
 */
export interface UserKeyedQuery {
  collection: string
  fields: string[]
  note?: string
}

/**
 * Collections keyed by document ID = uid.
 *
 * `admin_roles` is included deliberately: an admin exercising their own right to
 * erasure must not leave a dangling role grant behind that a recreated account
 * with the same uid could inherit.
 */
export const USER_KEYED_DOCUMENTS: readonly UserKeyedDocument[] = [
  { collection: "profiles" },
  {
    collection: "users",
    subcollections: ["session_summaries", "usage_summaries"],
    note: "Per-session scoring summaries and billing-period usage rollups live here, not at the top level.",
  },
  { collection: "user_learning_state" },
  {
    collection: "problem_mastery",
    subcollections: ["problems"],
    note: "Spaced-repetition state. The real rows are the per-problem subcollection docs.",
  },
  { collection: "user_stats" },
  { collection: "performance_profiles" },
  { collection: "user_performance_profiles" },
  { collection: "enhanced_user_profiles" },
  { collection: "behavioral_profiles" },
  { collection: "notification_preferences" },
  { collection: "notification_analytics" },
  { collection: "user_dismissed_announcements" },
  { collection: "user_rate_limits" },
  { collection: "user_research_consent" },
  {
    collection: "algorithm_research_metrics",
    subcollections: ["daily", "summary"],
  },
  {
    collection: "insight_effectiveness_stats",
    subcollections: ["counters", "pattern_scores"],
  },
  {
    collection: "admin_roles",
    note: "A role grant keyed by uid must not survive the account it was granted to.",
  },
] as const

/**
 * Collections whose documents carry the user id in a field.
 *
 * Composite document ids (`${userId}_${problemId}_${timestamp}` and friends) are
 * queried by field rather than reconstructed, because the suffix is not
 * recoverable from the uid alone.
 */
export const USER_KEYED_QUERIES: readonly UserKeyedQuery[] = [
  { collection: "interview_sessions", fields: ["user_id"] },
  { collection: "profile_quota", fields: ["user_id"] },
  {
    collection: "payment_history",
    fields: ["user_id"],
    note: "Stripe remains the record of the transaction itself for tax purposes; this is our copy.",
  },
  { collection: "email_notifications", fields: ["user_id"] },
  { collection: "in_app_notifications", fields: ["userId"] },
  { collection: "notification_queue", fields: ["userId"] },
  { collection: "usage_events", fields: ["userId"] },
  { collection: "user_activities", fields: ["userId"] },
  { collection: "user_misconceptions", fields: ["userId"] },
  { collection: "insight_interactions", fields: ["userId"] },
  { collection: "nps_responses", fields: ["userId"] },
  { collection: "feedback", fields: ["userId"] },
  { collection: "user_roadmaps", fields: ["userId"] },
  { collection: "caseLabRuns", fields: ["userId"] },
  { collection: "user_tutorial_progress", fields: ["userId"] },
  { collection: "user_design_answers", fields: ["userId"] },
  { collection: "learn_item_responses", fields: ["user_id"] },
  { collection: "learner_model_events", fields: ["user_id"] },
  { collection: "learner_model_challenges", fields: ["user_id"] },
  { collection: "algorithm_research_events", fields: ["user_id"] },
  {
    collection: "promo_code_usage",
    fields: ["user_id"],
    note: "firestore.rules keys this on user_id; the old delete list queried userId and matched nothing.",
  },
  {
    collection: "session_vectors",
    fields: ["userId", "user_id"],
    note: "vectorization.ts stamps BOTH spellings on every document; either may be the indexed one.",
  },
  {
    collection: "referrals",
    fields: ["referrerId", "referredUserId"],
    note: "A user can appear on either side of a referral.",
  },
  {
    collection: "referral_rewards",
    fields: ["referrerId", "referredUserId"],
    note: "Not user_id, which is what the old list queried.",
  },
  {
    collection: "text_embeddings",
    fields: ["metadata.userId", "metadata.user_id"],
    note: "The id is nested under metadata; the legacy snake_case spelling is still read at query time elsewhere.",
  },
  {
    collection: "analytics_events",
    fields: ["properties.userId", "properties.user_id"],
    note: "trackEventServer nests everything under properties, so there is no top-level userId to match.",
  },
] as const
