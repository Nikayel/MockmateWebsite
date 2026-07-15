/**
 * SEALED content for pack palantir-foundry-usage-rollup (SERVER-ONLY).
 *
 * Never candidate-visible; never in the interviewer model's context before the literal
 * "debrief me". Loaded only through lib/scenarios/sealed/registry.server.ts by the
 * feedback/debrief path and the phase-2 release endpoint. Values verified by execution
 * (generate-pack.md Step 3).
 */

import type { SealedPackContent } from "@/lib/bugfix/packs/types"

if (typeof window !== "undefined") {
  throw new Error("Sealed pack content must never load in the browser.")
}

export const sealed: SealedPackContent = {
  packId: "palantir-foundry-usage-rollup",
  solutionMd: `## Bug
\`src/rollup.py\`, in \`rollup()\`: \`primary\` and \`backup\` are each deduplicated by
\`event_id\` in isolation and then summed. An event delivered on BOTH replicas (same
\`event_id\` on primary and backup) survives both per-stream dedupes and is counted
twice for any account present in both streams.

## Minimal fix
Deduplicate the combined streams by \`event_id\` before summing:
\`for event in dedupe(primary + backup):\`

## Why the symptom presents as it does
Only \`acme\` has an event (\`evt-1\`) on both primary and backup, so only \`acme\` is
doubled (82 instead of 42). Every other account appears on a single stream, so the
rest of the table is already correct — classic partial wrongness.

## Red herrings (both provably innocent)
1. \`account_id.lower()\` — looks like it could merge distinct accounts, but the data
   contract declares account ids case-insensitive ("Umbrella" and "umbrella" are the
   same account), so the normalization is correct.
2. The malformed-line skip (\`len(parts) != 4\` and the non-numeric \`compute_seconds\`
   guard) — looks like silent data loss, but the contract says malformed lines are
   skipped and the only such fixture rows are genuinely truncated/blank.

## Complexity
Parse and dedupe are O(n) in the number of events; the dominant cost is
\`sorted(totals)\` over the accounts, so O(n log n) time, O(n) space (the dedupe seen
sets + the totals dict).

## Phase-2 adaptation path
The data ops now needs (audit-stream events) already flows through \`parse_events\`
but is discarded by the \`stream not in VALID_STREAMS\` filter. Add \`"audit"\` to
\`VALID_STREAMS\` and fold every valid event through one cross-stream dedupe
(\`for event in dedupe(events)\`) — an adaptation of the same fix, not a rewrite.`,
  bugLocation: "src/rollup.py — rollup(): `for event in primary + backup`",
  bugSummary:
    "dedupe is scoped per stream, so an event delivered on both primary and backup is counted twice for any account present in both streams",
  minimalFix:
    "Deduplicate the combined streams before summing: `for event in dedupe(primary + backup):`",
  survivalStory:
    "Each stream is correctly deduplicated in isolation, so reading rollup() on its own looks right; it only doubles for the rare account whose event lands on BOTH replicas, which the happy-path fixtures (one stream per account) never exercised.",
  redHerrings: [
    {
      location: "src/rollup.py — parse_events(): account_id.lower()",
      looksWrongBecause: "normalizing case could merge two different accounts",
      provablyInnocentBecause:
        "the data contract declares account ids case-insensitive, so Umbrella and umbrella are the same account by design",
    },
    {
      location: "src/rollup.py — parse_events(): len(parts) != 4 and the int() guard",
      looksWrongBecause: "silently skipping lines looks like data loss",
      provablyInnocentBecause:
        "the contract says malformed lines are skipped, and the only skipped fixture rows are genuinely truncated/blank",
    },
  ],
  complexityAnswer: {
    time: "O(n log n)",
    space: "O(n)",
    dominantCost:
      "the sorted() over the account totals for output ordering; parse and dedupe are O(n)",
  },
  phase2: {
    specPatch:
      "Ops added a third replica stream, 'audit'. Its events must be folded into each account's compute-seconds, deduplicated by event_id the same way — an event on audit that also arrived on primary or backup is still one event.",
    fixturePatch: "audit,acme,evt-1,40\naudit,globex,evt-7,8\n",
    expectedOutputV2:
      "=== Compute-seconds by account ===\nacme: 42\nglobex: 30\ninitech: 30\numbrella: 12\n",
  },
  buggyOutput:
    "=== Compute-seconds by account ===\nacme: 82\nglobex: 22\ninitech: 30\numbrella: 12\n",
  debriefRubric: [
    "Reproduced with the run command and diffed against the oracle before opening the source.",
    "Localized the wrong value to the acme row and named the cross-stream duplicate (evt-1 on primary and backup) as the cause, in one sentence.",
    "Shipped a minimal fix (dedupe the combined streams) rather than rewriting rollup().",
    "Complexity: identified the sort as the dominant O(n log n) cost rather than pattern-matching the nested-looking loops.",
    "Phase-2: adapted the existing dedupe to include the audit stream instead of rewriting; recognized the audit data was already parsed and thrown away.",
    "Recommend exactly one drill: for a weak scoping pass, a dedup-key drill; for a weak phase-2, an adapt-vs-rewrite drill.",
  ],
}
