# Webhook replay: nightly net-balance report

## Who reads this
The payments on-call replays the webhook event log every night to compute each
merchant's net balance (charges minus refunds) in cents, which feeds their payout.
This morning a merchant opened a ticket: their balance in the report is lower than
their own ledger, and payouts are held for that merchant until the number reconciles.

## The program
`main.py` reads the webhook event log and prints each merchant's net balance in cents.

Events are delivered on an at-least-once bus, so the SAME event (identified by its
`event_id`) can be delivered more than once, including a redelivery seconds later.
Those redeliveries are the same event and must be applied only once. A merchant can
also legitimately have two separate events that happen to share an amount (for
example two customers buying the same item), and those are two distinct events.

## Data contract (all of this is intended; the correct output tolerates it)
- Lines starting with `#` are comments.
- Columns are `event_id,type,merchant,amount,received_at`.
- `amount` is a non-negative integer in cents. `type` is `charge` (adds to the
  balance) or `refund` (subtracts from the balance).
- The same `event_id` may appear more than once (an at-least-once redelivery); it is
  one event and is applied once.
- `received_at` is an ISO-8601 UTC timestamp.
- A line that does not have exactly five columns, or has a non-numeric `amount`, is
  malformed and is skipped.

## Run it
```
python3 src/main.py fixtures/input.txt
```

## Expected output
```
=== Net balance (cents) by merchant ===
delta_foods: 8000
luna_labs: 5400
orbit_goods: 4500
pine_market: 8400
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
