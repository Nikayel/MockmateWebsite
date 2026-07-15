# SEALED — solution for stripe-webhook-idempotency

Never candidate-visible. Compiles into `lib/scenarios/sealed/stripe-webhook-idempotency.server.ts`.

## Bug (src/main.py, in `dedupe()`, the `key = ...` line)
The idempotency key is built from `(merchant, type, amount)` instead of the event's
own `event_id`. That key is not unique per event: two distinct events for the same
merchant that share a type and an amount collapse to one key, so the second one is
discarded as if it were a redelivery.

## Minimal fix
Key the dedupe on the event identity:

```python
key = event["event_id"]
```

## Why the symptom presents as it does
Only `orbit_goods` has two genuinely distinct charges of the same amount (`evt-4` and
`evt-5`, both 2500). Under the shipped key they share `(orbit_goods, charge, 2500)`, so
one is dropped and orbit_goods reports 2000 instead of 4500, under-credited by a full
2500-cent charge. Every other merchant's same-key collisions are true redeliveries
(`evt-1`, `evt-7`), which SHOULD collapse to one, so keying on `event_id` still drops
those correctly and the rest of the table is unchanged. That is the partial wrongness:
one merchant off, three correct.

## Red herring (reachable, provably innocent)
`in_arrival_order()` sorts every event by its `received_at` ISO-8601 string before the
dedupe runs. It looks suspect on two counts: sorting timestamps as plain strings, and
feeding a keep-first-seen dedupe from a reordered list so the "kept" record depends on
order. It is innocent because a net balance is an order-independent sum of charges
minus refunds, and every set of colliding records carries an identical amount, so
whichever record the dedupe keeps contributes the same number. No printed value can
change with the sort under the documented contract.

## Complexity
Parse is O(n). The dominant cost is the `sorted()` in `in_arrival_order` (and the
`sorted(balances)` for output), so time is O(n log n); dedupe and balance accumulation
are O(n). Space O(n) for the event list and the seen-set.

## Phase-2 adaptation path
Finance adds `dispute` (chargeback) events that must subtract from the merchant's
balance like a refund, deduplicated by event_id. The dispute rows already flow through
`parse_events` and `dedupe`; only `compute_balances` discards them, because `dispute`
is neither in `CREDIT_TYPES` nor `DEBIT_TYPES`. The adaptation is one line: add
`"dispute"` to `DEBIT_TYPES`. Combined with the event_id fix, disputes are deduped by
identity, so the redelivered `evt-11` counts once: luna_labs 5400 -> 400,
delta_foods 8000 -> 4700, orbit_goods stays 4500 (the fix still holds), pine_market
unchanged. Running the shipped (unadapted) code on the phase-2 fixture leaves v1 output
untouched, which is exactly the silent data loss finance is complaining about.

## Debrief
Deliver the intended defect vs the candidate's actual path, what they did well, where
signal was lost, and exactly ONE drill: a dedup-key drill if the scoping pass to the
idempotency key was weak; an adapt-vs-rewrite drill if they rebuilt `compute_balances`
in phase-2 instead of recognizing the dispute data was already parsed and discarded.
