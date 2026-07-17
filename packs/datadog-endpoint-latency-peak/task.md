# Peak latency report — per-endpoint slowest request

## Who reads this
A performance reviewer runs this before signing off on a latency regression. This
morning it shows one endpoint far slower at the peak than that endpoint's own traces
support, and the review is stuck until the number reconciles.

## The program
`latency_rollup.py` reads a request-latency feed and prints, per endpoint, the peak
(slowest) request latency in milliseconds and how many requests it saw.

## Data contract (all of this is intended; the correct output tolerates it)
- Columns are `kind,endpoint,request_id,latency_ms`, one event per line.
- Lines starting with `#` are comments.
- Only events whose `kind` is `request` are metered; other kinds (e.g. `health`) are
  excluded from this report.
- A line that is truncated or has a non-numeric `latency_ms` is malformed and is
  skipped.
- Events may appear in any order.

## Run it
```
python3 src/latency_rollup.py fixtures/input.txt
```

## Expected output
```
=== Peak latency by endpoint ===
/login: peak=200ms over 2
/search: peak=60ms over 3
/checkout: peak=900ms over 2
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
