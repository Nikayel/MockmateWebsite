# Alert-incident rollup: distinct incidents per monitor

## Who reads this
The on-call engineer reads this rollup at the start of a shift to see how many
separate times each monitor paged. This morning they noticed one monitor's
count reads lower than the metering dashboard shows for the same window, so a
second page that really did fire is missing from the rollup. They stopped
trusting the count before it hides another incident.

## The program
`alert_dedup.py` reads the collector feed and prints, per monitor, how many
distinct alert incidents fired.

An incident is a contiguous run of ALERT transitions for one monitor.
Consecutive ALERT transitions for the same monitor with no OK transition between
them are the SAME incident and are counted once. A monitor pages again (a new
incident) only after it has returned to OK and then goes back to ALERT.

Each line is one monitor state transition. The collector writes transitions to
the single shared feed in the order it received them, so the feed is in
nondecreasing timestamp order but transitions from different monitors are
interleaved. The rollup processes the transitions in that feed order.

## Data contract (all of this is intended; the correct output tolerates it)
- Columns are `timestamp,env,monitor,state,event_id`.
- `timestamp` is ISO-8601 UTC, fixed width, always ending in `Z`
  (`2026-05-01T12:00:15Z`). Lexical order of these strings is the same as
  chronological order.
- Lines starting with `#` are comments.
- The feed carries more than one environment; only `prod` monitors are rolled
  up here. Rows for any other environment are ignored.
- The bus is at-least-once, so the same transition (identified by `event_id`)
  can arrive more than once. Repeats of an `event_id` are the same transition,
  counted once. An `event_id` identifies exactly one transition.
- `state` is `OK` or `ALERT`. A transition whose state is neither (for example a
  No Data transition) is not an incident transition and is skipped.
- A line that is truncated (not exactly five columns) is malformed and skipped.
- A monitor may appear only once in the window (a single transition).

## Run it
```
python3 src/alert_dedup.py fixtures/input.txt
```

## Expected output
```
=== Alert incidents by monitor (prod) ===
api-latency: 1
db-pool: 2
disk-usage: 1
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
