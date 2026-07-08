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
      'You\'ve been dropped into the billing service of a subscription business. A worker consumes subscription lifecycle webhooks (upgrade, downgrade, cancel, credit grants) from the payment provider and applies them to each account. The provider guarantees at-least-once delivery, not order. After a provider replay last Tuesday, paid accounts were double-granted their monthly credits, and a separate cohort got silently downgraded when a delayed "cancel" landed after a newer "upgrade" had already been applied. The worker trusts every event it sees.',
    task: "Across five milestones you'll scope what \"applied exactly once\" actually means for money-moving events, decompose the webhook-to-entitlement pipeline to find exactly where duplicates and reordering slip through, commit to an idempotency and ordering contract that holds under replays and races, then fix the entitlement update path inside the real billing codebase until the duplicate-credit and stale-downgrade tests pass. Finally you'll defend your choices and grade yourself.",
  },
  whyThisCompany:
    'Stripe interviews drop you into payments-grade correctness problems where the hard part is never the algorithm. It\'s reasoning about at-least-once delivery, idempotency, and ordering when the network and the provider are both allowed to lie to you. This lab mirrors that: the actual fix is a couple of guards, but the signal is whether you can scope "exactly once" precisely and defend it when a replay or a concurrent worker shows up.',
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
      'To clear a delivery backlog, ops scaled the billing consumer to three parallel workers. Two of them dequeue the same retried event at the same instant, both check "have I processed this id?", both see false, and both apply it before either records the id. Where does your idempotency guarantee break under concurrency, and what would you change so the guarantee survives more than one worker?',
  },
  milestones: [
    {
      kind: "clarify",
      guidance: {
        interviewerPrompt:
          "You're hardening a billing worker that applies subscription webhooks (upgrade, downgrade, cancel, credit) to accounts. The provider delivers them at-least-once and out of order, and last Tuesday a replay double-granted credits while a late cancel downgraded accounts that had already upgraded. What do you ask me before writing anything? Start with the big one: does 'applied exactly once' mean each event id once, or the account converging to the same final state?",
        whatItTests:
          "Whether you scope payments-grade correctness first: accepting at-least-once, unordered delivery as fixed, and separating the duplicate problem from the ordering problem.",
        howToApproach: [
          "Pull the two bugs apart: the double credit is duplication, the stale downgrade is ordering. Different guards.",
          "Push toward exactly-once effect (the account converges), not exactly-once delivery.",
          "Ask for the two levers: a stable event id to dedup on, and a version or created timestamp to order by.",
          "Ask if you can persist processed ids or a last-applied version atomically with the entitlement.",
        ],
        whatGoodLooksLike: [
          "You treat at-least-once and unordered as fixed, not something to wish away.",
          "You map duplicate to an id key and reordering to a version or timestamp.",
          "Every question changes a guard you'd write, not background trivia.",
        ],
        commonTrap:
          "Collapsing both bugs into 'just dedup the events.' A de-duped stale cancel still overwrites a newer upgrade: duplicates need an id, ordering needs a version.",
      },
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
      guidance: {
        interviewerPrompt:
          "Draw the path one webhook takes, from the provider emitting it to an account's credits or plan changing. At each stage, where could a duplicate or an out-of-order delivery corrupt the final state? Point at the exact step where a duplicate credit gets applied twice, and where a stale cancel overwrites a newer upgrade.",
        whatItTests:
          "Whether you locate the exact step where at-least-once delivery and reordering corrupt account state, instead of jumping to a patch.",
        howToApproach: [
          "List the stages: dequeue, parse, load account, compute entitlement, persist, ack. Keep them separate.",
          "Trace the duplicate credit: the same id reaches compute and credits are added again because nothing recorded the id.",
          "Trace the stale cancel: an older event lands after a newer one and persist blindly overwrites.",
          "Hand Design two seams: a dedup key (event id) and an ordering key (created timestamp or version).",
        ],
        whatGoodLooksLike: [
          "You name the load-decide-write on the account as the blast radius.",
          "You keep duplication and reordering as two distinct problems.",
          "You treat credits (additive) differently from plan and status (last writer wins).",
        ],
        commonTrap:
          "One idempotency key for both bugs. Dedup stops the double credit but waves the stale cancel through; reordering needs its own version or timestamp guard.",
      },
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
      guidance: {
        interviewerPrompt:
          "Before you touch code, give me the contract: what the idempotency key is, where it lives, and what makes an event safe to apply. Then run two replays out loud, a repeated credit and a late cancel, and tell me the final account state each time. Which guarantee does each class of event need, and where do you enforce it?",
        whatItTests:
          "Whether you commit to a precise idempotency and ordering contract before coding: separating additive events from last-writer-wins transitions and picking an enforcement point that survives replays.",
        howToApproach: [
          "Split events: credits are additive and commute; upgrade, downgrade, cancel are transitions where newest wins.",
          "For duplicates, dedup on event id and record the id in the same atomic write as the effect.",
          "For ordering, store a last-applied timestamp or version and only apply strictly newer events.",
          "Enforce it at the datastore (a unique constraint plus a transaction), never an in-memory set.",
        ],
        whatGoodLooksLike: [
          "Two event classes, two mechanisms, each with a reason.",
          "Idempotency and the effect are one atomic write.",
          "You define exactly-once as convergence and use it to check your two replays.",
        ],
        commonTrap:
          "Assuming idempotency solves it all. The stale cancel is a distinct id, so it passes every dedup check clean, then overwrites a newer upgrade.",
      },
      title: "Design",
      purpose:
        "Commit to an idempotency + ordering contract and defend it under replays and races.",
    },
    {
      kind: "build",
      guidance: {
        interviewerPrompt:
          "Open the billing worker and get the two failing tests green: duplicate credit and stale downgrade. Don't rewrite the pipeline. Find the exact line where a replay gets applied twice, and where an older event overwrites newer state, and add the smallest guards. Which line applies a duplicate today, and what's the smallest fix?",
        whatItTests:
          "Whether you turn the idempotency and ordering contract into a small, correct change in an unfamiliar money-moving codebase, not just green tests.",
        howToApproach: [
          "Read the apply path: find the function that mutates the account and how an id and timestamp reach it.",
          "Run the two failing tests and read what they assert before changing anything.",
          "Fix the two defects separately: dedup by event id, and drop events not strictly newer.",
          "Guard the effect, not the handler, keep the diff small, and re-run the whole file.",
        ],
        whatGoodLooksLike: [
          "A small diff: a dedup on id and an ordering check at the mutation point.",
          "You say why credits need dedup and status needs ordering.",
          "You treat a green test as evidence, not the goal.",
        ],
        commonTrap:
          "Fixing only the case in front of you. A check-then-write dedup passes both tests but double-applies the instant a second worker races it.",
      },
      title: "Build",
      purpose:
        "Fix the entitlement update path in the real codebase until the duplicate and stale-event tests pass.",
    },
    {
      kind: "review",
      guidance: {
        interviewerPrompt:
          "Walk me through your fix: the line that stops the double credit and the line that drops the stale cancel. Then the part I care about: we scaled to three workers, two dequeue the same event and both pass your 'seen this id?' check before either records it. Where does your guarantee break, what's the smallest fix, and where would you not yet trust it with real money?",
        whatItTests:
          "Whether you can defend correctness out loud and see where your guard leaks the moment there's more than one worker, instead of trusting a green test.",
        howToApproach: [
          "Restate your contract in one sentence: dedup by id, order by timestamp, converge regardless of arrival.",
          "Name the failure: read-then-write means two workers both read 'unseen' before either writes. A check-then-act race.",
          "Reach for atomicity: a unique constraint on event id plus one transaction that records the id and applies the effect.",
          "Grade yourself by separating what you tested (one worker) from what you didn't (the race, a mid-write crash).",
        ],
        whatGoodLooksLike: [
          "You locate the race as check-then-act, not 'add a lock.'",
          "You move the guarantee into the database, not app code two workers interleave.",
          "You self-grade honestly about what the tests don't cover.",
        ],
        commonTrap:
          "Declaring victory because two single-worker tests are green. A check-then-write dedup passes them and stays broken under the concurrency the curveball describes.",
      },
      title: "Review",
      purpose: "Defend your contract against the concurrency curveball, then grade yourself.",
    },
  ],
}
