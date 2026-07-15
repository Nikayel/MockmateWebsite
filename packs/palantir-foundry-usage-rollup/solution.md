# SEALED — solution for palantir-foundry-usage-rollup

Never candidate-visible. Compiles into `lib/scenarios/sealed/palantir-foundry-usage-rollup.server.ts`.

## Bug (src/rollup.py, in `rollup()`)
`primary` and `backup` are each deduplicated by `event_id` in isolation and then
summed. An event delivered on BOTH replicas (same `event_id` on primary and backup)
survives both per-stream dedupes and is counted twice for any account present in both
streams.

## Minimal fix
Deduplicate the combined streams by `event_id` before summing:

```python
for event in dedupe(primary + backup):
```

## Why the symptom presents as it does
Only `acme` has an event (`evt-1`) on both primary and backup, so only `acme` is
doubled (82 instead of 42). Every other account appears on a single stream, so the
rest of the table is already correct — partial wrongness.

## Red herrings (both reachable, both provably innocent)
1. `account_id.lower()` — looks like it could merge distinct accounts, but the data
   contract declares account ids case-insensitive ("Umbrella" and "umbrella" are the
   same account by design), so the normalization is correct.
2. The malformed-line skip (`len(parts) != 4` and the non-numeric `compute_seconds`
   guard) — looks like silent data loss, but the contract says malformed lines are
   skipped and the only such fixture rows are genuinely truncated/blank.

## Complexity
Parse and dedupe are O(n) in the number of events; the dominant cost is
`sorted(totals)` over the accounts. Time O(n log n), space O(n).

## Phase-2 adaptation path
Ops adds a third replica stream, `audit`. The audit events already flow through
`parse_events` but are discarded by the `stream not in VALID_STREAMS` filter. Add
`"audit"` to `VALID_STREAMS` and fold every valid event through one cross-stream
dedupe (`for event in dedupe(events)`) — an adaptation of the same fix, not a rewrite.
The audit fixture includes a cross-stream duplicate (`evt-1` for acme), so the fix
must still hold: acme stays 42, globex gains the new audit event (22 -> 30).

## Debrief
Deliver the intended bug vs the candidate's actual path, what they did well, where
signal was lost, and exactly ONE drill (dedup-key scoping if the SCOPE pass was weak;
adapt-vs-rewrite if PHASE2 was weak).
