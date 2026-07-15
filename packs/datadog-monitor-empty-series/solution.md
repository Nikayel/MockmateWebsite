# SEALED — solution for datadog-monitor-empty-series

Never candidate-visible. Compiles into `lib/scenarios/sealed/datadog-monitor-empty-series.server.ts`.

## Bug (src/monitor_eval.py, in `evaluate()`)
The average is computed as
`average = sum(values) / len(values) if values else 0`. The `if values else 0`
guard was added to avoid dividing by zero when a series has no samples in the
window, but it substitutes a real average of `0` for "there was nothing here."
Zero is below every critical threshold, so the empty series falls through to the
`OK` branch instead of being reported as `NO DATA`. A monitor whose exporter went
silent reads exactly like a healthy one.

## Minimal fix
Treat the empty case as its own status instead of defaulting the average:

```python
def evaluate(values, monitor):
    if not values:
        return "NO DATA"
    average = sum(values) / len(values)
    if average >= monitor["crit"]:
        return "ALERT"
    return "OK"
```

## Why the symptom presents as it does
Only one series, `web.error_rate`, has no samples in the window — its exporter
sent nothing, and the fixture carries no `web.error_rate` sample lines. Every
other series has at least one in-window sample, so its average is real and its
status is correct: `cache.evictions` averages 20 (OK), `db.connections` averages
100 (ALERT), `web.latency_ms` averages 160 (OK). That is why only the
`web.error_rate` line is wrong — partial wrongness. The defaulted `0` average is
computed correctly for a non-empty series; it only lies when the list is empty.

## Red herring (reachable, provably innocent)
`average >= monitor["crit"]` in `evaluate()` uses `>=`, which invites the
suspicion that a series sitting exactly on its threshold is alerted when it
should still be under the limit. It is provably innocent: the contract says a
series alerts when its average is **at or above** its critical threshold, and
`db.connections` averages exactly 100 against a critical threshold of 100, so
`>=` correctly reports `ALERT`. The herring is reachable because that exact-tie
series is in the fixture — flipping `>=` to `>` would change its line, so the
candidate can test the comparison directly.

## Complexity
Parsing, dedup, grouping, and per-series evaluation are each O(n) in the number
of samples. The only super-linear step is `sorted(monitors)` for stable output
ordering, over m monitored series. Time O(n + m log m), space O(n) for the
retained samples and the per-series value lists.

## Phase-2 adaptation path
Ops adds a WARN band. Each `monitor` line already carries a `warning` threshold
that `parse_feed` stores in `monitors[series]["warn"]` and `evaluate` never
reads — the data exists and is thrown away. Adapt, don't rewrite: after the
critical check, add one band using the value already in hand:

```python
    if average >= monitor["crit"]:
        return "ALERT"
    if average >= monitor["warn"]:
        return "WARN"
    return "OK"
```

The fix must ship first: the empty-series branch has to exist or `web.error_rate`
would still read `OK`. The phase-2 fixture adds one late `web.latency_ms` sample
(340) that lifts its average from 160 to 220, which is at or above its warning
threshold (200) but below critical (300) — WARN under the adapted code. Until the
warn band is added, that same sample changes nothing on the board (220 is still
below 300, so the line stays `OK`), which is exactly the silent data loss ops is
complaining about.

## Debrief
Deliver the intended bug vs the candidate's actual path, what they did well,
where signal was lost, and exactly ONE drill (empty/first/last boundary reasoning
if the SCOPE pass was weak; adapt-vs-rewrite if PHASE2 was weak).
