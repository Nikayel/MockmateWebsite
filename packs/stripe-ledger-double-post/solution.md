# SEALED — solution for stripe-ledger-double-post

Never candidate-visible. Compiles into `lib/scenarios/sealed/stripe-ledger-double-post.server.ts`.

## Bug (src/post_ledger.py, in `post()`, the `for batch_id in batches:` accumulation)
Deduplication is scoped per batch: each batch is deduped on its own with
`posted.extend(dedupe(batches[batch_id]))`, and the deduped batches are then
concatenated and summed without a second dedup across batches. A transaction that
was re-sent in an overlapping settlement window therefore survives once in each
batch's deduped list, so it is posted twice for that account. The correct code
deduplicates by `txn_id` across ALL batches before summing.

## Minimal fix
Deduplicate the combined, already-per-batch-deduped list once more before posting:

```python
    for txn in dedupe(posted):
        apply_transaction(balances, txn)
```

## Why the symptom presents as it does
Only `atlas_market` has transactions that land in two batches: `t-2001` (4200) and
`t-2002` (1800) appear in B1 and are re-sent in B2's overlapping window. Under the
per-batch dedup, B1 keeps one copy of each and B2 keeps another copy of each, so
atlas_market is credited 2 * (4200 + 1800) = 12000 instead of 6000, over-credited by
a full window. Every other account's repeated `txn_id` is a WITHIN-batch redelivery
(`cedar_books` `t-2003` twice in B1), which per-batch dedup already collapses
correctly, so keying a single dedup across the combined list still collapses those
and leaves the rest of the table unchanged. That is the partial wrongness: one
account over by 6000, three correct.

## Red herrings (both reachable, both provably innocent)

1. `to_cents()` builds cents as `int(whole) * 100 + int(frac)`. It looks lossy
   because it concatenates the fractional part as cents with no scaling, which would
   misread a single-decimal amount like `42.5` as 4205 rather than 4250. It is
   innocent because the data contract guarantees every `amount` carries exactly two
   decimal places, so `frac` is always a two-digit cents value and the conversion is
   exact for every row in the fixture.
2. `in_posting_order()` sorts every transaction by its `posted_at` ISO-8601 string
   before posting. It looks suspect on two counts: sorting timestamps as plain
   strings, and feeding a keep-first-seen dedup from a reordered list so the "kept"
   record appears to depend on order. It is innocent because a balance is an
   order-independent sum of charges minus refunds, and every set of colliding
   `txn_id` records (a redelivery or a re-sent window) carries an identical amount,
   so whichever record the dedup keeps contributes the same number. No printed value
   can change with the sort under the documented contract.

## Complexity
Parse is O(n). The dominant cost is the `sorted()` in `in_posting_order` (and the
`sorted(balances)` for output ordering), so time is O(n log n); grouping, dedup, and
balance accumulation are each O(n). Space is O(n) for the transaction list, the
per-batch grouping, and the seen-set.

## Phase-2 adaptation path
Finance adds `reversal` transactions that must subtract from the account's balance
like a refund, deduplicated by `txn_id`. The reversal rows already flow through
`parse_transactions`, `in_posting_order`, `group_by_batch`, and `dedupe`; only
`apply_transaction` discards them, because `reversal` is in neither `CREDIT_TYPES`
nor `DEBIT_TYPES`. The adaptation is one line: add `"reversal"` to `DEBIT_TYPES`.
Combined with the across-batch dedup fix, a reversal re-sent in two batches
(`t-2009` on B2 and B3) is counted once: atlas_market 6000 -> 4000, cedar_books
2000 -> 1700, nimbus_cafe 4500 -> 3500 (the reversal `t-2007` that was already in
the v1 feed and silently dropped), vertex_gym unchanged. Running the shipped
(unadapted) code on the phase-2 fixture leaves v1 output untouched, which is exactly
the silent data loss finance is complaining about; running the across-batch fix
without the reversal adaptation also leaves v1 output untouched, because the reversal
rows are still discarded at posting.

## Debrief
Deliver the intended defect vs the candidate's actual path, what they did well, where
signal was lost, and exactly ONE drill: a scoping drill (where does the dedup key
need to hold?) if the pass from the high atlas_market row to the per-batch dedup was
weak; an adapt-vs-rewrite drill if they rebuilt `apply_transaction` or `post` in
phase-2 instead of recognizing the reversal data was already parsed and discarded.
