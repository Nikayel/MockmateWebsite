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
          "Before you touch a line of this billing code, I want your clarifying questions. Here is what you know: our provider delivers subscription events (upgrade, downgrade, cancel, credit) at-least-once and in no guaranteed order, and last Tuesday a replay double-granted monthly credits while a delayed cancel silently downgraded accounts that had already upgraded. Walk me through the three or four questions you would ask me before writing anything, and for each one tell me how the answer changes what you would build. Lead with the one that matters most: when we say every event must be 'applied exactly once,' do you mean we handle each event id exactly once, or that the account converges to the same final state no matter how many copies arrive or in what order?",
        whatItTests:
          "Whether you can scope payments-grade correctness before writing code. At Stripe the algorithm is trivial (a guard or two); the signal is whether you accept at-least-once, unordered delivery as a fixed contract and then define the goal precisely, distinguishing exactly-once processing from exactly-once effect, and separating the duplicate problem from the ordering problem instead of collapsing them into one vague 'make it idempotent.'",
        howToApproach: [
          "Pull the two symptoms apart out loud: the double-granted credit is a duplicate-delivery problem, the stale downgrade is an ordering problem, and they need different guards. Ask questions that keep them separate.",
          "Pin the meaning of 'exactly once' first. Push toward exactly-once effect (the account converges to one final state) rather than exactly-once delivery, and be ready to say why exactly-once delivery is not on the table over an at-least-once channel.",
          "Ask for the two levers you will need: is there a stable, unique event id you can dedup on, and is there a monotonic version or a trustworthy created timestamp on the subscription you can order by. Tie each lever to one of the two bugs.",
          "Ask what state you are allowed to touch per account: can you persist processed event ids or a last-applied version alongside the entitlement, and are those writes atomic with the entitlement change.",
          "Confirm the correctness bar and which direction hurts more: never double-grant and never lose a real event, and whether dropping a legitimate event is as bad as applying a stale one.",
        ],
        whatGoodLooksLike: [
          "Treats at-least-once and unordered as fixed facts of the contract, and never asks the provider to just stop sending duplicates or to deliver in order.",
          "Reframes the target as exactly-once effect or convergence, not exactly-once delivery, and can explain the difference in one sentence.",
          "Explicitly maps duplicate -> idempotency key and reordering -> version or timestamp guard, and connects each to the specific Tuesday failure it prevents.",
          "Surfaces the tie-break question early: if a cancel and an upgrade carry the same or ambiguous ordering signal, which one wins and who defines that rule.",
          "Keeps every question decision-relevant. Each answer changes the guard that gets written, and the candidate says so, rather than asking for background trivia.",
        ],
        commonTrap:
          "Collapsing the two bugs into one and asking only 'so I just need to dedup the events?' Deduplication stops the double credit, but a de-duped, processed-exactly-once cancel that lands after a newer upgrade still clobbers good state. Duplicates need an idempotency key, ordering needs a version or timestamp guard, and a candidate who does not separate them in the clarify step commits to building half a fix before touching the code.",
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
          "Draw me the path a single subscription webhook takes, from the moment the provider emits it to the moment an account's credits or plan actually change. Name the stages out loud: the worker dequeues the event, parses it, loads the current account, decides the new entitlement, writes it back, acks. Now here is what I actually care about. At each stage, tell me where a duplicate delivery or an out-of-order delivery could push the account to the wrong final state. Last Tuesday a provider replay double-granted monthly credits, and a delayed cancel landed after a newer upgrade and silently downgraded people, so both bugs are live in this exact pipeline. Walk me through your stages and point at the specific step where each one slips in. Where does a duplicate credit get applied a second time, and where does a stale cancel overwrite a newer upgrade?",
        whatItTests:
          "Whether you can decompose a money-moving pipeline into discrete stages and locate the precise step where at-least-once delivery and reordering corrupt account state, instead of jumping straight to a patch. At Stripe the code fix here is two small guards. The signal is whether you can point at the read-modify-write on the account and name the missing dedupe check and the missing ordering check before you touch the editor. Locating the failure site precisely, and keeping the two failure modes separate, is what separates a payments engineer from someone who patches symptoms.",
        howToApproach: [
          "List the pipeline stages end to end and keep them separate so you can point at exactly one: provider emits, worker dequeues, parse and validate, load the current account, compute the new entitlement, persist it, ack the event.",
          "Attach the provider's two guarantees to specific stages: at-least-once means any stage can see the same event id twice (dequeue and compute), and no ordering means a later-created event can arrive before an earlier one (load and persist). Say which property drives which bug.",
          "Trace the duplicate-credit path concretely: the same event id reaches compute, the worker adds credits again because nothing recorded that this id was already applied. Name the missing piece as a dedupe store keyed by event id, and note the stage it belongs in.",
          "Trace the stale-downgrade path concretely: a cancel with an older created timestamp lands after a newer upgrade, and the persist step blindly overwrites because compute never checked whether the account already reflects a newer event. Name the missing piece as an ordering key (created timestamp or a version the account carries).",
          "Use the two entities the brief gives you to define clean seams for Design: SubscriptionEvent supplies identity (id) and order (created), Account is the state that must converge. Hand Design a dedupe key and an ordering key without yet committing to storage or transactions.",
        ],
        whatGoodLooksLike: [
          "You name the read-modify-write on the account as the blast radius. Load, decide, write is where both duplicates and reordering do their damage, and you point at it rather than gesturing at the whole worker.",
          "You keep the two failure modes distinct: duplicates are an identity problem solved by the event id, reordering is a sequence problem solved by created timestamp or a monotonic version. You do not blur them into one vague check.",
          "You place the dedupe as its own processed-ids store keyed by event id, checked before the effect is applied and recorded together with the effect, not after the ack.",
          "You treat credits (which accumulate) differently from plan and status (last writer by version), because a duplicate credit and a stale downgrade break for different reasons and want different guards.",
          "You leave Design a clean handoff: two seams, a dedupe key and an ordering key, each mapped to the stage it plugs into, so the contract discussion starts from a precise picture instead of a blank pipeline.",
        ],
        commonTrap:
          "Collapsing both bugs into a single idempotency key and calling the pipeline fixed. Deduplicating by event id stops the double credit, but it does nothing for the stale cancel. That cancel has its own unique id, so it is not a duplicate, it is simply out of order, and a dedupe check waves it right through to overwrite the newer upgrade. Reordering needs a separate ordering key (the created timestamp or a version the account carries and compares against). A candidate who names only one guard has decomposed only half the problem.",
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
          "Before you write a line of the fix, draw me the contract this worker follows before it touches an account. I want three things on the board: what the idempotency key is, where it lives, and what makes an incoming event safe to apply. Then run two replays through it out loud. First, the same monthly credit grant delivered twice. Second, a cancel that the provider created before an upgrade but that arrives after the upgrade already landed. For each one, tell me what your contract does and why the account ends up in the right state. The thing I care about most: the credit path and the plan-change path may not want the same rule. So which guarantee does each class of event need, and at what single point in the pipeline do you enforce it so neither a duplicate nor a stale event can slip past?",
        whatItTests:
          "This is the round where Stripe finds out whether you can commit to a precise idempotency and ordering contract before you touch money, not whether you can code a guard. The algorithm is trivial. The signal is whether you separate additive, order-independent events (credit grants) from last-state-wins transitions (upgrade, downgrade, cancel), give each the guarantee it actually needs, and pick an enforcement point that holds when the provider replays and reorders events. It tests where you believe correctness lives, and whether you can defend that under a concrete replay instead of hand-waving 'we dedupe it.'",
        howToApproach: [
          "Split the events into two classes out loud before anything else: credit grants are additive and commute, so applying them once in any order is correct; upgrade, downgrade, and cancel are state transitions where the newest event should win. Say plainly that these two classes need different rules.",
          "For duplicates, name the idempotency key (the provider's event id), say where it lives (a processed-events table or a unique column on the write), and make 'record that I handled this id' and 'apply the effect' happen in one atomic transaction so there is no read-then-write gap between the check and the write.",
          "For ordering, pick a monotonic key the event actually carries (the created timestamp, and ideally a per-subscription sequence or version if the provider exposes one), store the last-applied value on the account, and only apply a transition when the incoming event is newer. The stale event becomes a no-op, not an overwrite.",
          "Trace both replays concretely: the duplicate credit is caught by the event-id dedup and order does not matter, and the late cancel is rejected by the ordering guard because its timestamp is older than the upgrade already applied. State the final account state each time so the interviewer can check convergence.",
          "Say where the guarantee is enforced: at the datastore with a unique constraint plus a transaction, never an in-memory set of seen ids. Flag that this choice is exactly what will survive the moment the consumer runs on more than one worker.",
        ],
        whatGoodLooksLike: [
          "Two event classes get two mechanisms, with the reason attached: dedup-by-event-id for credits because they commute, and monotonic ordering-by-event-time-or-version for plan and status because state does not commute.",
          "Idempotency and the effect are one atomic write backed by a unique constraint, so the guarantee lives in the database and cannot be raced by application code that reads before it writes.",
          "The candidate defines 'exactly-once effect' as convergence: any delivery order and any number of retries produce the same final account state, and they use that definition to judge their own two replays.",
          "They pick an ordering key that exists on the real event and reason about its failure modes: equal timestamps between two events, provider clock skew, and a preference for a per-object sequence number over a wall-clock time when one is available.",
          "They close the loop before touching code by naming how long processed ids are retained and what happens if the apply and the record could ever diverge, which is precisely why they put both in one transaction.",
        ],
        commonTrap:
          "Assuming idempotency solves the whole problem. Dedup on event id stops the double credit, so candidates declare the design done and never build an ordering guard. But the stale downgrade is a distinct event with its own id: it passes every dedup check clean, then overwrites a newer upgrade. Duplicate and stale are two different bugs, and a processed-ids set fixes the first while staying completely blind to the second.",
      },
      title: "Design",
      purpose:
        "Commit to an idempotency + ordering contract and defend it under replays and races.",
    },
    {
      kind: "build",
      guidance: {
        interviewerPrompt:
          "Open the billing worker and get the two failing tests green: the duplicate-credit test and the stale-downgrade test. Don't rewrite the pipeline. Find the exact line where a replayed event gets applied a second time, and the exact line where an older event overwrites newer account state, then add the smallest guards that hold: a dedupe on the event id, and an ordering check on the event's created timestamp or version. Run the tests as you go and narrate why each guard is correct, not just why the bar turned green. Show me the code. Which line applies a duplicate today, and what is the smallest change there that makes a credit grant land exactly once no matter how many times the provider delivers it?",
        whatItTests:
          "Whether you can turn an idempotency and ordering contract into working code inside an unfamiliar money-moving codebase. At Stripe the algorithm is trivial (a couple of guards); the signal is whether you can locate the exact defect in the apply path, add guards that survive replays and reordering rather than just the two seeded cases, keep the change minimal and reviewable in a billing path, and reason out loud about correctness instead of pattern-matching your way to a green test.",
        howToApproach: [
          "Read the apply path before you touch it. Find the function that mutates the account (plan, status, credits), and trace how an event id and a created timestamp actually reach it. Match the existing patterns in the file instead of inventing new abstractions.",
          "Reproduce first. Run the two failing tests and read what they assert, so you know the exact duplicate-credit and stale-downgrade behavior you have to change and can confirm green after each edit.",
          "Fix the two defects separately. For duplicates, record processed event ids in the same durable store as the account and skip an id you have already applied. For reordering, compare the incoming event's created timestamp or version against what the account last applied, and drop anything that is not strictly newer.",
          "Guard the effect, not the handler. A credit grant must land once even if the handler runs twice, and a stale cancel must lose to a newer upgrade even if it arrives later. Aim for the same final account state for any delivery order.",
          "Keep it small and re-run the whole test file. Do not refactor the pipeline. Add the smallest guards, confirm both target tests pass and nothing regressed, and be ready to point at the exact lines you changed and why.",
        ],
        whatGoodLooksLike: [
          "Both tests go green with a small, targeted diff: a dedupe on event id and a monotonic ordering check keyed on created timestamp or version, placed right at the account-mutation point.",
          "The candidate names why credits specifically need dedupe (they are additive, so a replay double-grants) and why status changes need ordering (a delayed cancel must not overwrite a newer upgrade), instead of stamping one guard everywhere.",
          "They treat green as evidence, not the goal: they re-run tests, read the assertions, and can describe a delivery order the seeded tests do not cover that their guard still handles correctly.",
          "When the three-worker curveball lands, they immediately see the check-then-act race and fold the dedupe-and-record into one atomic step: a unique constraint on event id that fails the second insert, a conditional update guarded by WHERE version < incoming, or a row lock, so two workers cannot both read 'unprocessed' and both apply.",
          "They stay inside the money path's blast radius: no broad refactor, clear reasoning about where the processed-id record lives, and honesty about what is prod-only (retry, dead-letter, observability) versus what this test needs now.",
        ],
        commonTrap:
          "Fixing only the case in front of you. The candidate dedupes on event id, both tests pass, and they call it done, but the idempotency check is read-then-write: check 'have I seen this id', then record it as a separate step. That is exactly-once on one worker and double-apply the instant the consumer scales, which is exactly the curveball. Keeping processed ids in an in-memory set instead of the same durable store as the account is the same trap in another shape: it evaporates on restart and is not shared across workers. The guard has to be atomic and durable, not a check followed by a later write.",
      },
      title: "Build",
      purpose:
        "Fix the entitlement update path in the real codebase until the duplicate and stale-event tests pass.",
    },
    {
      kind: "review",
      guidance: {
        interviewerPrompt:
          "Walk me through the fix you actually shipped. Point at the line where a replayed event stops being double-applied, and the line where a stale cancel gets dropped, and tell me why the account converges to the same state no matter what order these events land. Then here is the part I care about most. We just scaled this consumer to three workers to clear a backlog, and two of them dequeue the same retried credit event at the same instant. Both run your 'have I seen this id?' check, both read false, and both apply the credit before either one records the id. Show me exactly where your guarantee breaks under that race, tell me the smallest change that makes it hold with three workers instead of one, and then grade yourself honestly: where is your fix solid, and where would you not yet trust it with a real customer's money?",
        whatItTests:
          "Whether you can defend payments-grade correctness out loud, which at Stripe matters more than the two-line fix itself. Anyone can add a dedupe guard. The signal is whether you know precisely why it works, where the abstraction leaks the moment there is more than one worker, and whether you will say that honestly instead of claiming a green test bar means the code is safe. Stripe ships money-movement code that has to survive provider replays, retries, and racing consumers, so this round checks that you reason about correctness at the boundary where the network, the provider, and your own workers are all allowed to lie about what happened and when.",
        howToApproach: [
          "Restate your contract in one sentence before you defend it: duplicate and out-of-order deliveries must converge to the same account state, deduped by event id and ordered by the event's created timestamp, not by arrival time.",
          "Name the exact failure the curveball exposes. Your guard is two steps (read 'seen this id?', then write the effect), and two workers can both finish the read before either does the write. That is a time-of-check-to-time-of-use race, not a bug in your logic.",
          "Reach for atomicity, not a longer speech about locks. The smallest real fix is to let the database enforce it: a unique constraint on event id plus one transaction that records the id and applies the entitlement together, so the second worker's insert conflicts and its credit never lands.",
          "Show that ordering still holds under the race too: gate the write on the event's timestamp so you apply only if it is newer than the last applied event for that account, which means a stale cancel is dropped even if it wins the sprint to the row.",
          "Grade yourself concretely by separating what you tested (duplicate credit, stale downgrade, both on one worker) from what you did not (the three-worker race, a crash between recording the id and applying the effect), and name what you would add before trusting it with real money.",
        ],
        whatGoodLooksLike: [
          "Points at specific lines, the id dedupe that no-ops the replay and the timestamp guard that drops the stale cancel, and explains convergence in terms of the effect on the account, not just processing the event once.",
          "Locates the race precisely as a check-then-act problem and does not wave it away as 'add a lock', instead saying what the constraint or lock actually protects and why.",
          "Moves the guarantee into the store: a unique constraint on event id plus a single transaction covering both the dedupe record and the entitlement change, so uniqueness and atomicity come from the database rather than application code that two workers can interleave.",
          "Handles the crash-in-the-middle case, explaining what happens if a worker records the id but dies before applying the effect, and why the transaction boundary makes that all-or-nothing.",
          "Self-grades with a straight face, distinguishing what the passing tests actually prove from what still needs a concurrency test or failure-injection test before it ships.",
        ],
        commonTrap:
          "Declaring victory because the two tests are green. The duplicate-credit and stale-downgrade tests both run on a single worker, so a plain check-then-write passes them while staying broken under the exact concurrency the curveball describes. Candidates who treat the green bar as proof of correctness, instead of asking what the tests do not exercise, miss the whole point: at Stripe a passing test is the floor, not the finish line, and an idempotency guard that only works with one worker is not idempotent.",
      },
      title: "Review",
      purpose: "Defend your contract against the concurrency curveball, then grade yourself.",
    },
  ],
}
