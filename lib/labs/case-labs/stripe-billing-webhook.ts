/**
 * Stripe — Billing Webhook Idempotency Case Lab.
 *
 * The "bugfix / real codebase" counterpart to the 911 Dispatch lab: instead of
 * adding a recommender, the candidate hardens a money-moving entitlement path
 * that already exists but mishandles at-least-once, out-of-order webhooks. The
 * Build milestone reuses the multi-file `bugfix-billing-webhook-idempotency`
 * workspace scenario — a real codebase drop, never a blank DSA editor (spec §1,
 * §7.4, §17.3).
 */

import type { CaseLab } from "@/lib/labs/types"

export const stripeBillingWebhook: CaseLab = {
  id: "stripe-billing-webhook",
  title: "Billing Webhook Idempotency",
  company: "stripe",
  role: "Software Engineer",
  difficulty: "hard",
  estimatedMinutes: 60,
  brief: {
    situation:
      'You\'ve been dropped into the billing service of a subscription business. A worker consumes subscription lifecycle webhooks — upgrade, downgrade, cancel, credit grants — from the payment provider and applies them to each account. The provider guarantees at-least-once delivery, not order. After a provider replay last Tuesday, paid accounts were double-granted their monthly credits, and a separate cohort got silently downgraded when a delayed "cancel" landed after a newer "upgrade" had already been applied. The worker trusts every event it sees.',
    task: 'Across five milestones you\'ll scope what "applied exactly once" actually means for money-moving events, decompose the webhook-to-entitlement pipeline to find exactly where duplicates and reordering slip through, commit to an idempotency and ordering contract that holds under replays and races, then fix the entitlement update path inside the real billing codebase until the duplicate-credit and stale-downgrade tests pass — and finally defend your choices and grade yourself.',
  },
  whyThisCompany:
    'Stripe interviews drop you into payments-grade correctness problems where the hard part is never the algorithm — it\'s reasoning about at-least-once delivery, idempotency, and ordering when the network and the provider are both allowed to lie to you. This lab mirrors that: the actual fix is a couple of guards, but the signal is whether you can scope "exactly once" precisely and defend it when a replay or a concurrent worker shows up.',
  skills: [
    "idempotency",
    "event ordering",
    "at-least-once delivery",
    "billing correctness",
    "decomposition",
  ],
  buildScenarioId: "bugfix-billing-webhook-idempotency",
  buildScenarioType: "bugfix",
  buildCurveball: {
    title: "Curveball: the consumer just scaled to three workers",
    prompt:
      'To clear a delivery backlog, ops scaled the billing consumer to three parallel workers. Two of them dequeue the same retried event at the same instant — both check "have I processed this id?", both see false, and both apply it before either records the id. Where does your idempotency guarantee break under concurrency, and what would you change so the guarantee survives more than one worker?',
  },
  milestones: [
    {
      kind: "clarify",
      title: "Clarify",
      purpose: "Pin down what “applied exactly once” means before you touch money.",
      ghostExample: {
        dimension: "business-outcome",
        question:
          "Do we need exactly-once *processing* of each event, or exactly-once *effect* on the account?",
        assumption:
          "Exactly-once effect: duplicate and out-of-order deliveries must converge to the same final account state, even if an event is technically handled more than once.",
      },
    },
    {
      kind: "decompose",
      title: "Decompose",
      purpose:
        "Map the webhook-to-entitlement pipeline and name where duplicates and reordering slip in.",
      ghostExample: {
        workflow: [
          "Provider emits a subscription event (at-least-once, unordered)",
          "Billing worker receives and parses the event",
          "Worker applies plan / status / credit changes to the account",
        ],
        entities: [
          {
            name: "SubscriptionEvent",
            role: "a provider-sent change carrying an id and a created timestamp",
          },
          {
            name: "Account",
            role: "the entitlement state that must converge regardless of delivery order",
          },
        ],
      },
    },
    {
      kind: "design",
      title: "Design",
      purpose:
        "Commit to an idempotency + ordering contract and defend it under replays and races.",
    },
    {
      kind: "build",
      title: "Build",
      purpose:
        "Fix the entitlement update path in the real codebase until the duplicate and stale-event tests pass.",
    },
    {
      kind: "review",
      title: "Review",
      purpose: "Defend your contract against the concurrency curveball, then grade yourself.",
    },
  ],
}
