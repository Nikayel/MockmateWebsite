# SEALED — solution for stripe-payout-batch-mutation

Never candidate-visible. Compiles into `lib/scenarios/sealed/stripe-payout-batch-mutation.server.ts`.

## Bug (src/settle.py, in `schedule()`, the `pending.remove(payout)` line)
De-duplication drops a redelivered payout by calling `pending.remove(payout)` while
the `for payout in pending` loop is still iterating that same list. Removing the
current element shifts every later element one position toward the front, but the
loop's internal cursor keeps advancing, so the element that was immediately after the
removed one is stepped over and never processed. That skipped payout is never
scheduled, and the merchant it belonged to is under-credited by its full amount.

## Minimal fix
The `seen` set already suppresses the redelivery, so the removal is not needed at all;
delete the mutation and just skip:

```python
        if payout["id"] in seen:
            continue
```

(Equivalently, iterate a snapshot such as `for payout in list(pending):` and build the
schedule without mutating the list being iterated.)

## Why the symptom presents as it does
The only redelivery in the feed is `po_n1` (north_hardware, delivered at seq 0 and
again at seq 4). In file order the payout immediately after the redelivery is `po_a1`
(atlas_supply, gbp 4000). When the redelivery is removed mid-iteration, the list slides
left and the loop's next step lands on `po_a2`, stepping over `po_a1` entirely. So a
full 4000-cent atlas payout is dropped and atlas reports 1500 instead of 5500. Every
other payout is scheduled normally, which is why only the atlas row differs — partial
wrongness, one merchant off out of five. Because the dropped payout is simply whatever
sits immediately after the redelivery in file order, reordering the feed would strand a
different payout and short a different merchant; that order-dependence is what makes the
symptom intermittent (difficulty 3).

## Red herrings (both reachable, both provably innocent)
1. The stable `sorted(..., key=lambda payout: payout["amount"])` in
   `pack_into_batches()`. It looks load-bearing: it reorders payouts and feeds the
   batch cutting, so it looks like it could decide what lands in which batch and let an
   overflow fall out. Provably innocent: slicing a list into fixed-size chunks keeps
   every element, and a merchant's reported total is the order-independent sum of their
   scheduled amounts across all batches, so neither the sort nor the batch cut can move
   any printed number. It also runs strictly after `schedule()` has already dropped the
   payout, so it cannot be the cause. Reachable because usd and gbp each have multiple
   scheduled payouts, so the sort really does reorder.
2. The currency filter `payout["currency"] not in SUPPORTED_CURRENCIES`, which sets
   aside atlas_supply's `cad` payout (`po_a3`, 8000). It looks guilty precisely because
   it discards an atlas payout and atlas is the merchant who is short. Provably
   innocent: the contract says this account pays out only usd/eur/gbp, so setting the
   cad payout aside is correct, and it is set aside identically in the correct and the
   shipped versions, so it is not the source of the diff. Testing it (removing the
   filter) raises atlas by 8000 in BOTH versions and never closes the 4000 gap.

## Complexity
Parse is O(n). `schedule()` is O(n) over the feed, with the caveat that
`pending.remove()` is itself an O(n) scan; it fires once per redelivery (once here), so
it does not dominate. The `sorted()` in `pack_into_batches()` is the dominant cost at
O(n log n); batching and totalling are O(n). Space O(n) for the payout list, the
`seen` set, and the batches.

## Phase-2 adaptation path
Compliance wants held funds surfaced. The `hold` rows already flow through
`parse_payouts` and are set aside by the status guard in `schedule()`
(`status != SCHEDULABLE_STATUS` -> `continue`), so the data already exists in the
dataflow and is thrown away. Adapt, don't rewrite: add a `held_totals(pending)` that
sums `amount` grouped by merchant for rows where `status == "hold"`, and print a second
section with the same `print_totals` helper and the same merchant sort. Holds are
independent of the mutation, so the section is correct regardless of the fix; but the
fix should still ship, since the scheduled section above it is what the ticket is about.
Running the shipped (unadapted) code on the phase-2 fixture leaves the scheduled section
unchanged because the added hold rows are discarded by the status guard, which is
exactly the silent data loss compliance is complaining about.

## Debrief
Deliver the intended defect versus the candidate's actual path, what they did well,
where signal was lost, and exactly ONE drill: a mutation-during-iteration drill if the
scoping pass to the `pending.remove()` under the loop was weak (for example if they
chased the sort or the currency filter instead of testing them); an adapt-vs-rewrite
drill if in phase-2 they rebuilt the scheduler instead of recognizing the hold rows were
already parsed and set aside.
