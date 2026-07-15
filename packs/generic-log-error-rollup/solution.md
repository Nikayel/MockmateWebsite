# SEALED — solution for generic-log-error-rollup

Never candidate-visible. Compiles into `lib/scenarios/sealed/generic-log-error-rollup.server.ts`.

## Bug (src/report.py, in `build_report()`)
`error_count` is initialized ONCE before the `for service in grouped` loop instead of
inside it, so it is never reset between services. Each service's stored count is the
running total of every ERROR line seen up to and including that service, so a service
that is processed after another service's errors is credited with those earlier errors.

## Minimal fix
Move the reset inside the per-service loop so the accumulator starts at zero for each
service:

```python
    report = {}
    for service in grouped:
        error_count = 0
        for level in grouped[service]:
            if level == ERROR_LEVEL:
                error_count += 1
        report[service] = error_count
    return report
```

## Why the symptom presents as it does
Services are processed in first-seen order: `gateway`, `catalog`, `payments`,
`notifications`. `gateway` and `catalog` log no ERROR lines, so the accumulator is
still 0 when `payments` is reached — `payments` correctly reads 3. Only
`notifications`, processed after `payments`, carries the leftover 3 and reports
5 instead of its own 2. Every other row is already correct — partial wrongness, and
the inflated row is the only one that follows a service that had errors.

## Red herrings (reachable, provably innocent)
1. `level.strip().upper()` in `parse_line()` — looks like it could miscount by folding
   levels together, and it is load-bearing (the lowercase `error` line for `payments`
   is only counted because of it). It is innocent: the data contract declares levels
   case-insensitive, `error`/`Error`/`ERROR` are the same level by design, and `WARN`
   and `INFO` never normalize to `ERROR`. Removing it would UNDER-count payments, which
   is the opposite of the observed symptom, so it cannot be the cause.

## Complexity
Parsing and grouping are O(n) in the number of lines; `build_report` is O(n) over the
grouped levels. Output is emitted in dict insertion order (no sort). Time O(n),
space O(n) for the grouped levels.

## Phase-2 adaptation path
Ops also wants each service's WARN count. The WARN levels ALREADY flow into
`group_by_service` and sit in each service's level list — `build_report` simply
discards everything that is not `ERROR`. Adapt (do not rewrite): add a second
per-service accumulator `warn_count` next to the now-correctly-scoped `error_count`,
increment it on `WARN`, and change the print to `service: errors=<e> warns=<w>`. The
phase-2 fixture only adds WARN lines to services already present, so unadapted code
(which ignores WARN and gains no new service or ERROR) prints the v1 report unchanged —
the silent data loss is exactly the ops complaint.

## Debrief
Deliver the intended accumulator-scope flaw vs the candidate's actual path, what they
did well, where signal was lost, and exactly ONE drill (accumulator-scoping if the
SCOPE pass was weak; adapt-vs-rewrite if PHASE2 was weak).
