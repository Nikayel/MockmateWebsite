/**
 * Palantir — Usage Rollup Re-engineering Case Lab.
 *
 * The "Re-engineering / debugging round" counterpart to the 911 Dispatch
 * decomposition lab. Instead of scoping a system from scratch, the candidate is
 * dropped into an unfamiliar Foundry-style usage-rollup codebase that over-bills
 * some accounts, has to orient fast, find a SUBTLE logical bug (a dedup that
 * runs at the wrong scope) past a plausible red herring, and make the smallest
 * correct fix. The Build milestone reuses the multi-file `bugfix-foundry-usage-rollup`
 * workspace scenario (a real codebase drop, never a blank editor).
 */

import type { CaseLab } from "@/lib/labs/types"

export const palantirUsageRollup: CaseLab = {
  id: "palantir-usage-rollup",
  title: "Usage Rollup Double-Count",
  company: "palantir",
  role: "FDSE",
  difficulty: "hard",
  estimatedMinutes: 50,
  brief: {
    situation:
      "You've been dropped into a Foundry-style metered-usage pipeline you did not write. It rolls up usage events into per-account totals that customers get billed on. Events arrive from a primary ingest shard and a backup shard, delivery is at-least-once, and the same event can land on both. After an on-call engineer replayed the backup shard to recover from an outage, a handful of accounts opened tickets saying they were billed for far more compute than they used.",
    task: "Across five milestones you'll turn the over-billing report into a precise invariant, trace the rollup to localize where a duplicate slips through (past a plausible-looking red herring), commit to the smallest fix that restores the invariant, make the change inside the real codebase until the tests pass, then defend it and grade yourself.",
  },
  whyThisCompany:
    "Palantir's Re-engineering round drops you into 200 to 1000 lines of code you did not write, with a subtle logical bug and a planted red herring, and watches how fast you build an accurate mental model and localize the defect. It scores comprehension and disciplined debugging over authoring. This lab mirrors that round: the fix is a couple of lines, but the signal is whether you find the real cause instead of the thing that merely looks wrong. This is the stretch end of the Palantir track. The distributed-systems framing (at-least-once delivery, cross-shard replay, idempotency) leans toward the full-time FDSE bar, so if you're interviewing as an intern, warm up on the Ontology Learning lab and the 911 Dispatch decomposition lab first and treat this as a reach. It is one round of a longer loop, so treat it as onsite prep, not the whole bar.",
  coverage: {
    covers: [
      "Re-engineering / debugging round (orient in unfamiliar code, find a subtle logical bug)",
      "Reading real code under a bug report, past a red herring",
    ],
    prepElsewhere: [
      {
        round: "Decomposition round (scope an open-ended system)",
        cta: "911 Dispatch lab",
        href: "/labs/palantir-911-dispatch",
      },
      {
        round: "Learning round (model an unfamiliar API cold)",
        cta: "Ontology Learning lab",
        href: "/labs/palantir-ontology-learning",
      },
      {
        round: "Online Assessment + live coding (Python / DSA)",
        cta: "Daily practice",
        href: "/practice",
      },
      {
        round: "Behavioral, “why Palantir,” and mission fit",
        cta: "Palantir prep",
        href: "/interview-prep/palantir",
      },
    ],
  },
  skills: [
    "code comprehension",
    "debugging",
    "reading unfamiliar code",
    "deduplication / idempotency",
  ],
  buildScenarioId: "bugfix-foundry-usage-rollup",
  buildScenarioType: "bugfix",
  buildCurveball: {
    title: "Curveball: a third ingest shard just came online",
    prompt:
      "Ops adds a third ingest shard next week, and a fourth the week after. Your fix dedups across the two feeds you were handed. What happens when there are N shards, and what does a rollup look like that stays correct and idempotent no matter how many shards replay?",
  },
  milestones: [
    {
      kind: "clarify",
      title: "Clarify",
      purpose: "Turn the over-billing report into one precise invariant before opening a file.",
      mapsToRound: "Re-engineering round",
      guidance: {
        interviewerPrompt:
          "Here's a usage rollup some accounts say over-bills them after a backup replay. Before you open a single file, what do you need to know: what does 'correct' mean for this rollup, and what could a replay have changed about the input? Give me the one invariant a correct rollup must hold.",
        whatItTests:
          "Whether you turn a vague over-billing report into a precise, testable invariant before diving into code, instead of skimming for something that looks wrong.",
        howToApproach: [
          "Restate the bug as an invariant: every distinct event id counts toward an account exactly once, no matter how many times or from how many shards it arrives.",
          "Ask what a replay does: it re-delivers a shard, so the same event id can now appear in more than one feed.",
          "Keep the symptom (units too high) separate from the cause you haven't found yet. Don't guess the line.",
          "Decide what a correct-versus-buggy test would look like before you read the code.",
        ],
        whatGoodLooksLike: [
          "You state the exactly-once invariant in one sentence.",
          "You connect the replay to cross-shard duplicates without having seen the code.",
          "You resist naming a fix before you've reproduced the bug.",
        ],
        commonTrap:
          "Opening files and hunting for something that looks off. In a re-engineering round the fast path is a crisp invariant and a failing case, not a guess at the line.",
      },
      ghostExample: {
        dimension: "business-outcome",
        question: "What does a correct rollup guarantee for a single event id?",
        assumption:
          "Each distinct event id counts once per account, no matter how many shards deliver it.",
      },
    },
    {
      kind: "decompose",
      title: "Decompose",
      purpose: "Trace the pipeline and localize where a duplicate slips through.",
      mapsToRound: "Re-engineering round",
      guidance: {
        interviewerPrompt:
          "Trace one event from the two feeds to the number an account is billed. Where does an event id get counted, and where is a duplicate meant to be removed? Point at the stage where a cross-shard duplicate could survive, without fixing it yet.",
        whatItTests:
          "Whether you read unfamiliar code by following the data, localize the defect to one stage, and separate the real cause from a plausible-looking red herring.",
        howToApproach: [
          "Follow the value, not the whole file: which function turns events into per-account totals, and what feeds it.",
          "Find every place dedup happens and ask what scope it runs at: within one feed, or across both.",
          "Hold the suspicious-looking pieces (id normalization, parsing) as hypotheses and rule them out with a case, not a hunch.",
          "Say exactly where a duplicate present in both feeds would slip through.",
        ],
        whatGoodLooksLike: [
          "You localize to the dedup scope, not the whole rollup.",
          "You clear the red herring on purpose instead of ignoring it.",
          "You can name the exact inputs that reproduce the double count.",
        ],
        commonTrap:
          "Fixing the first thing that looks odd (the id normalizer), or rewriting the rollup. The dedup already exists; it just runs at the wrong scope.",
      },
      ghostExample: {
        workflow: [
          "Events arrive on a primary and a backup shard (at-least-once)",
          "Each feed is de-duplicated by event id",
          "Per-feed totals are summed into each account",
        ],
        entities: [
          { name: "UsageEvent", role: "a metered event carrying an id, accountId, and units" },
          { name: "Feed", role: "one shard's at-least-once delivery of events" },
          { name: "AccountRollup", role: "the per-account units and eventCount that gets billed" },
        ],
      },
    },
    {
      kind: "design",
      title: "Design",
      purpose: "Commit to the smallest fix that restores the invariant, and defend it.",
      mapsToRound: "Re-engineering round",
      guidance: {
        interviewerPrompt:
          "Before you change a line, give me the contract your fix must hold and why the smaller-looking fixes are wrong. What's the minimal change that dedups across shards without breaking within-shard dedup, and what would you refuse to touch?",
        whatItTests:
          "Whether you commit to a precise, minimal fix and defend it against tempting-but-wrong changes in code you didn't write.",
        howToApproach: [
          "State the fix as one rule: dedup by event id across the combined feeds, then roll up once.",
          "Say why deleting dedup entirely is wrong: within-shard duplicates would then double count.",
          "Say why the normalizer isn't the bug: it's correct, and changing it moves nothing.",
          "Keep the blast radius tiny: one merge point, not a rewrite.",
        ],
        whatGoodLooksLike: [
          "A one-line invariant a teammate could review.",
          "You reject at least one plausible wrong fix and say why.",
          "You touch the smallest surface that restores the invariant.",
        ],
        commonTrap:
          "Proposing a broad refactor, or a fix that passes the visible failing case but breaks the within-shard case you weren't shown.",
      },
    },
    {
      kind: "build",
      title: "Build",
      purpose: "Make the smallest correct edit in the real codebase and get the tests green.",
      mapsToRound: "Re-engineering round",
      guidance: {
        interviewerPrompt:
          "Open the rollup and get the tests green. The failing tests show the cross-shard double count, and there's a hidden case you can't see, so fix the invariant, not just the visible numbers. Which line merges the feeds, and what's the smallest edit?",
        whatItTests:
          "Whether you turn the invariant into a small, correct edit in unfamiliar code, and trust the invariant over the visible test numbers.",
        howToApproach: [
          "Read the rollup path before editing: find where the two feeds are dedup'd and summed.",
          "Run the failing tests and read what they assert, then make the smallest change that dedups across both feeds.",
          "Don't delete the within-feed dedup; move it to cover the combined stream.",
          "Re-run everything and confirm a within-shard duplicate still counts once.",
        ],
        whatGoodLooksLike: [
          "A small diff at the merge point, not a rewrite.",
          "You leave the read-only store and the correct normalizer alone.",
          "You reason about the hidden case instead of only the visible numbers.",
        ],
        commonTrap:
          "Editing before tracing the flow, or over-fitting to the two visible tests so the hidden within-shard case regresses. Fix the invariant, not the number.",
      },
    },
    {
      kind: "review",
      title: "Review",
      purpose: "Defend the fix under the hidden case, then grade yourself.",
      mapsToRound: "Self-review + mission reflection",
      guidance: {
        interviewerPrompt:
          "Walk me through the one line you changed and why it holds under the hidden case. Then the part that matters here: this rollup bills real customers, so who does an over-count hurt, and what would you add before you trusted it with money?",
        whatItTests:
          "Whether you can defend a fix in code you just met, name what you didn't test, and speak to the fact that a billing bug hurts a real customer.",
        howToApproach: [
          "Restate your fix as the invariant it restores, in one sentence.",
          "Name what the tests don't cover yet: a shard that replays mid-run, an event with zero units, ordering.",
          "Answer the human question straight: an over-count over-bills a customer, and that trust is hard to win back.",
          "Leave with one concrete follow-up test, not 'add more tests.'",
        ],
        whatGoodLooksLike: [
          "You tie the fix to the invariant, not the passing numbers.",
          "You volunteer a gap before I ask.",
          "You treat an over-bill as a customer-trust problem, not just a failing assert.",
        ],
        commonTrap:
          "Declaring done because the tests are green, or answering 'why it matters' with 'it was a fun bug.' A billing over-count is someone's money.",
      },
    },
  ],
}
