# Monitor status board — per-series OK / ALERT / NO DATA for one window

## Who reads this
On-call keeps this status board open during an incident. For every monitored
series it evaluates the samples that landed in the current window and prints one
status line: `ALERT` if the series is at or over its threshold, `OK` if it is
under, and `NO DATA` if nothing arrived for it this window. This morning the
board printed `OK` for a series whose exporter had gone silent, so on-call could
not tell a healthy service from a blind monitor and stopped trusting the board.

## The program
`monitor_eval.py` reads the collector feed and prints, per monitored series, its
status for the fixed evaluation window.

The evaluation window is the fixed span `12:00:00Z` up to (but not including)
`12:05:00Z`. A series' window average is the mean of its sample values inside
that span.

## Data contract (all of this is intended; the correct output tolerates it)
- The feed has two record kinds, one per line:
  - `monitor,series,critical,warning` defines a monitored series and its
    thresholds.
  - `sample,series,sample_id,timestamp,value` is one observed value.
- Lines starting with `#` are comments.
- `timestamp` is ISO-8601 UTC, fixed width, always ending in `Z`
  (`2026-05-01T12:00:15Z`).
- A sample whose `timestamp` falls outside the window is not part of this
  evaluation and is excluded.
- The collector is at-least-once, so the same sample (identified by `sample_id`)
  can arrive more than once. Repeats of a `sample_id` are the same sample,
  counted once. A `sample_id` identifies exactly one sample.
- Samples can arrive out of order.
- A `sample` line that is truncated (not exactly five columns) or a `monitor`
  line that is malformed (thresholds not numeric) is skipped.
- A series can have a single sample in the window.
- A series **alerts when its window average is at or above its critical
  threshold**; otherwise it is `OK`.
- A series with **no samples in the window reports `NO DATA`** — it must never
  be reported as `OK`.

## Run it
```
python3 src/monitor_eval.py fixtures/input.txt
```

## Expected output
```
=== Monitor status ===
cache.evictions: OK
db.connections: ALERT
web.error_rate: NO DATA
web.latency_ms: OK
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
