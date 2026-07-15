# Foundry usage rollup — nightly compute-seconds bill

## Who reads this
The FinOps on-call runs this rollup every night to bill each account for the
compute-seconds it used. This morning they flagged that one account's total looks
higher than the metering dashboard shows, and billing is paused until it is trusted.

## The program
`rollup.py` reads a usage feed and prints total compute-seconds per account.

Each account's usage is delivered on two replica streams for durability: `primary`
and `backup`. The bus is at-least-once, so the SAME event (identified by its
`event_id`) can arrive more than once, including once on each replica — those are the
same event, not two.

## Data contract (all of this is intended; the correct output tolerates it)
- Lines starting with `#` are comments.
- Columns are `stream,account_id,event_id,compute_seconds`.
- `account_id` is case-insensitive; "Umbrella" and "umbrella" are the same account.
- A line that is truncated or has a non-numeric `compute_seconds` is malformed and is
  skipped.
- Streams other than `primary`/`backup` are ignored.

## Run it
```
python3 src/rollup.py fixtures/input.txt
```

## Expected output
```
=== Compute-seconds by account ===
acme: 42
globex: 22
initech: 30
umbrella: 12
```

The solution file is off-limits.
