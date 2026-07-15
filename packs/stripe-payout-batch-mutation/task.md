# Nightly payout batching — scheduled-total report

## Who reads this
The payments on-call runs the settlement job every night to decide how much money
leaves the platform for each merchant. The job reads the pending-payout feed,
groups the payouts it can release into per-currency batches, and prints the total
amount it scheduled for each merchant. That number is what the payout rail actually
moves. This morning a merchant, `atlas_supply`, opened a ticket: the amount the
report scheduled for them is lower than the pending payouts in their own ledger, and
their release is on hold until the two numbers line up.

## The program
`settle.py` reads the payout feed and prints, per merchant, the total amount that
got scheduled into a batch tonight.

Payouts are processed in the order they appear in the file. A payout is scheduled
when its currency is one this account pays out, its status is ready to release, and
its id has not already been scheduled from an earlier delivery. Payouts that clear
those checks are packed into per-currency batches (at most a few payouts per batch,
a limit of the downstream rail) and every scheduled payout lands in exactly one
batch; a merchant's reported total is the sum of their scheduled payouts across all
batches.

## Data contract (all of this is intended; the correct output tolerates it)
- Lines starting with `#` are comments.
- Columns are `payout_id,merchant,currency,amount,status`.
- `amount` is a non-negative integer in cents. A `0` amount is a real payout of
  zero cents and is scheduled like any other.
- `status` is the release state. Only `pending` payouts are released tonight; a
  payout in any other state (for example `hold`, an amount held for review) is not
  scheduled.
- `currency` is a three-letter code. This account pays out `usd`, `eur`, and `gbp`;
  a payout in any other currency (for example `cad`) is set aside and not scheduled.
- The feed rides an at-least-once bus, so the same `payout_id` can be delivered more
  than once, including a redelivery later in the file. Those deliveries are the same
  payout and it is scheduled once. Two different payouts for one merchant may share a
  currency and an amount (a merchant can legitimately be owed the same figure twice);
  those are distinct payouts with distinct ids.
- Because payouts are processed in file order, whether two lines are neighbors in the
  file is part of the input, not an accident.
- A line that does not have exactly five fields, or whose `amount` is not an integer,
  is malformed and is skipped.

## Run it
```
python3 src/settle.py fixtures/input.txt
```

## Expected output
```
=== Scheduled total (cents) by merchant ===
atlas_supply: 5500
delta_foods: 2500
harbor_books: 6000
north_hardware: 7000
sunset_bakery: 3000
```

The solution file is off-limits.
