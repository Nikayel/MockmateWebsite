# Ledger posting: nightly account-balance report

## Who reads this
The payments treasury on-call runs this posting job every night to compute each
account's balance (charges minus refunds) in cents, which feeds that account's
payout. This morning they flagged one account: its balance in the report is higher
than the ledger of record, and the payout for that account is held until the two
numbers reconcile.

## The program
`post_ledger.py` reads the day's settlement feed and prints each account's balance
in cents.

Transactions are delivered in settlement batches. A settlement can re-send an
overlapping window of a previous batch, so the SAME transaction (identified by its
`txn_id`) can appear in more than one batch. Those re-sends are the same
transaction and must be applied only once. An account can also legitimately have
two separate transactions that happen to share an amount (for example two customers
paying the same price), and those are two distinct transactions.

## Data contract (all of this is intended; the correct output tolerates it)
- Lines starting with `#` are comments.
- Columns are `batch_id,txn_id,account,type,amount,posted_at`.
- `amount` is a non-negative dollar value recorded to the cent, with exactly two
  decimal places (for example `42.00` or `9.05`); it is converted to integer cents.
- `type` is `charge` (adds to the balance) or `refund` (subtracts from the balance).
  A transaction may also carry another type, such as `reversal`; such a transaction
  is recorded in the feed but does not move the balance in this report.
- The same `txn_id` may appear more than once, including once in each of two
  different batches (a re-sent settlement window); it is one transaction and is
  applied once.
- `posted_at` is an ISO-8601 UTC timestamp.
- A line that does not have exactly six columns, or whose `amount` is not a
  two-decimal number, is malformed and is skipped.

## Run it
```
python3 src/post_ledger.py fixtures/input.txt
```

## Expected output
```
=== Ledger balance (cents) by account ===
atlas_market: 6000
cedar_books: 2000
nimbus_cafe: 4500
vertex_gym: 6000
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
