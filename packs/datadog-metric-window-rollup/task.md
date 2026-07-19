# Metric window rollup: per-minute web.5xx count and sum

## Who reads this
The on-call SRE keeps this rollup open during an incident. It buckets raw
`web.5xx` samples into fixed 60-second windows and prints, per window, how many
samples landed and their total. When a window's total crosses the alert
threshold, the SRE pages the owning team. This morning they noticed the first
window reads higher than the metering dashboard shows for the same minute, so
they stopped trusting the rollup before it pages anyone by mistake.

## The program
`window_rollup.py` reads the collector feed and prints, for one metric, each
60-second window with its sample count and value sum.

Windows are fixed 60-second buckets aligned to the epoch (`12:00:00–12:01:00`,
`12:01:00–12:02:00`, ...) and are half-open: a sample whose timestamp is exactly
`12:01:00` belongs to the `12:01:00` window, not the `12:00:00` one.

## Data contract (all of this is intended; the correct output tolerates it)
- Columns are `timestamp,metric,sample_id,value`.
- `timestamp` is ISO-8601 UTC, fixed width, always ending in `Z`
  (`2026-05-01T12:00:15Z`). Lexical order of these strings is the same as
  chronological order.
- Lines starting with `#` are comments.
- The feed carries more than one metric; only `web.5xx` is rolled up here. Rows
  for any other metric are ignored.
- The bus is at-least-once, so the same sample (identified by `sample_id`) can
  arrive more than once. Repeats of a `sample_id` are the same sample, counted
  once. A `sample_id` identifies exactly one sample.
- Samples can arrive out of order.
- A line that is truncated (fewer or more than four columns), has an empty or
  non-numeric `value`, or an unparseable timestamp is malformed and is skipped.

## Run it
```
python3 src/window_rollup.py fixtures/input.txt
```

## Expected output
```
=== web.5xx per 60s window ===
12:00:00  count=2  sum=5
12:01:00  count=2  sum=9
12:02:00  count=1  sum=1
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
