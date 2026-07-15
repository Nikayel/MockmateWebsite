# SEALED — solution for datadog-metric-window-rollup

Never candidate-visible. Compiles into `lib/scenarios/sealed/datadog-metric-window-rollup.server.ts`.

## Bug (src/window_rollup.py, in `rollup()`)
The per-window membership test is
`start <= s["epoch"] <= end`, which includes the window's closing edge. Windows
are meant to be half-open `[start, start + 60)`. A sample whose timestamp lands
exactly on a window boundary satisfies BOTH the closing window (as its inclusive
`end`) and the opening window (as its `start`), so it is counted twice: once in
the window where it belongs and once in the window before it.

## Minimal fix
Make the upper bound exclusive so windows are half-open:

```python
in_window = [s for s in ordered if start <= s["epoch"] < end]
```

## Why the symptom presents as it does
Only one sample in the fixture sits exactly on a boundary: `a3` at
`2026-05-01T12:01:00Z`. It correctly belongs to the `12:01:00` window and is
counted there in both versions, so that window stays correct. The inclusive
`end` ALSO folds it into the preceding `12:00:00` window, which is why only the
first window is inflated (count 3 / sum 10 instead of 2 / 5). Every other sample
sits strictly inside its window, so the rest of the table is already correct —
partial wrongness. `window_start()` floors correctly; the boundary contract it
implies is violated one hop away, in `rollup()`'s comparison.

## Red herrings (both reachable, both provably innocent)
1. `ordered.sort(key=lambda sample: sample["ts_text"])` in `rollup()` — sorts by
   the raw ISO-8601 string, not by the parsed epoch, and the sorted ends feed
   `window_starts()` (the first/last window). Looks like a lexical sort could
   misorder timestamps and pick the wrong first/last window. Provably innocent:
   the contract fixes these timestamps as fixed-width UTC with a constant `Z`
   offset, so lexical order equals chronological order; `samples[0]` and
   `samples[-1]` are the true min and max. Reachable because the fixture is
   deliberately out of order, so the sort actually reorders rows.
2. `dedupe()` keying only on `sample_id` — looks under-specified (why is a single
   field enough to identify a sample, and could it drop legitimate repeats?).
   Provably innocent: the contract says the bus is at-least-once and a
   `sample_id` identifies exactly one sample, so the duplicate `a2` line is a
   genuine redelivery with identical fields; dropping it is correct. Reachable
   because the fixture contains that redelivery.

## Complexity
Parsing and dedup are O(n). Sorting is O(n log n). The window loop rescans all n
samples for each of w windows, so it is O(w·n) and dominates for any non-trivial
window span; a single pass that buckets each sample by `window_start()` once
would make the whole rollup O(n). Space O(n) for the retained samples.

## Phase-2 adaptation path
Ops adds a second metric, `web.4xx`. Those rows already flow through
`parse_line`/`parse_samples` today and are discarded by the `metric_name != metric`
filter — the data exists and is thrown away. Adapt, don't rewrite: iterate the
metrics (`for metric in ("web.5xx", "web.4xx"): print_rollup(metric, parse_samples(path, metric))`)
so each gets its own section. The fix must ship first: the `web.4xx` fixture
includes a boundary sample (`b3` at `12:02:00`), so without the half-open fix the
new section would be double-counted too.

## Debrief
Deliver the intended bug vs the candidate's actual path, what they did well,
where signal was lost, and exactly ONE drill (half-open-vs-closed boundary
reasoning if the SCOPE pass was weak; adapt-vs-rewrite if PHASE2 was weak).
