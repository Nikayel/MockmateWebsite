# SEALED — solution for datadog-alert-dedup-order

Never candidate-visible. Compiles into `lib/scenarios/sealed/datadog-alert-dedup-order.server.ts`.

## Bug (src/alert_dedup.py, in `count_incidents()`)
The state that decides whether an ALERT opens a new incident is a single
`previous_state` flag created once above the loop and updated on every
transition regardless of which monitor it belongs to. Because the feed
interleaves monitors, `previous_state` holds the state of whichever monitor
transitioned last in feed order, not the state of the monitor the current
transition belongs to. The new-incident test therefore reads the wrong monitor's
history whenever monitors interleave.

## Minimal fix
Track the previous state per monitor instead of in one shared flag:

```python
    incidents = {}
    last_state = {}
    for transition in transitions:
        monitor = transition["monitor"]
        state = transition["state"]
        incidents.setdefault(monitor, 0)
        if state == "ALERT" and last_state.get(monitor) != "ALERT":
            incidents[monitor] += 1
        last_state[monitor] = state
    return incidents
```

Grouping the transitions by monitor before counting (so each monitor's run is
processed contiguously) is an equivalent fix.

## Why the symptom presents as it does
In the fixture, `db-pool` pages twice: incident 1 is `evt-d1` (ALERT) then
`evt-d2` (OK), and incident 2 is `evt-d3` (ALERT at 12:03:00) after it has
returned to OK. `db-pool`'s own previous state before `evt-d3` is OK, so it is a
genuine new incident. But the transition immediately before `evt-d3` in feed
order is `disk-usage`'s `evt-k1` ALERT (12:02:30). The shared `previous_state` is
therefore `ALERT` when `evt-d3` is read, so the new-incident test is false and
`db-pool`'s second incident is folded away: the rollup prints `db-pool: 1`
instead of `2`.

Every other monitor happens to be preceded in feed order by a non-ALERT
transition at each of its fresh ALERTs (`api-latency`'s ALERT follows the
comment/`evt-a3` region cleanly as the first counted transition; `disk-usage`
follows `db-pool`'s OK `evt-d2`), so their counts are correct — partial
wrongness, one monitor off by one.

This is an order-dependent symptom: the miscount lives at the boundary between
two interleaved monitors. Reordering the feed moves it. If the transitions were
grouped by monitor (each monitor's run processed contiguously), the shared flag
would never carry across a monitor boundary and every count would be right,
which is exactly why the per-monitor fix works. Equally, if `disk-usage`'s
`evt-k1` did not sit immediately before `db-pool`'s `evt-d3`, `db-pool` would
count correctly and a different monitor could be the one that loses a page.

## Red herrings (both reachable, both provably innocent)
1. `in_timestamp_order()` — `sorted(transitions, key=lambda t: t["timestamp"])`.
   It sorts by the raw ISO-8601 string rather than a parsed time, and because
   incident boundaries depend on processing order this looks like the order
   fault. Provably innocent: the contract fixes the timestamps as fixed-width
   UTC with a constant `Z` offset, so lexical order equals chronological order,
   and the feed is already in nondecreasing timestamp order, so the sort is a
   stable no-op that moves no transition. Removing it yields identical output.
   Reachable because it runs on every invocation in `main()`.
2. `dedupe()` keying only on `event_id` — looks under-specified (could a single
   field drop a legitimate distinct transition?). Provably innocent: the
   contract says the bus is at-least-once and an `event_id` identifies exactly
   one transition, so the repeated `evt-d1` line is a genuine redelivery with
   identical fields and dropping it is correct. Reachable because the fixture
   contains that redelivery.

## Complexity
Parse, dedupe, the env filter, and the counting pass are each O(n) in the number
of transitions. The dominant cost is `in_timestamp_order()`, the O(n log n) sort
over all transitions; the final `sorted(incidents)` is O(m log m) over the m
monitors, which is small. Time O(n log n), space O(n).

## Phase-2 adaptation path
Ops promotes the `staging` monitors into the rollup. Those rows already flow
through `parse_line`/`parse_feed` today and are discarded by
`transitions_for_env(transitions, "prod")` — the data exists and is thrown away
(the fixture already carries one such row, `evt-s1` for `cache-hit`). Adapt, do
not rewrite: iterate the environments so each gets its own section, e.g.

```python
    transitions = in_timestamp_order(dedupe(parse_feed(sys.argv[1])))
    for env in (TARGET_ENV, "staging"):
        print_report(env, count_incidents(transitions_for_env(transitions, env)))
```

The fix must ship first: in the staging section `cache-hit` pages twice
(`evt-s1` ALERT, `evt-c1` OK, `evt-c2` ALERT) and its second ALERT is preceded
in feed order by `queue-depth`'s `evt-q1` ALERT, so without the per-monitor fix
the new section would swallow `cache-hit`'s second incident too (`cache-hit: 1`
instead of `2`).

## Debrief
Deliver the intended bug vs the candidate's actual path, what they did well,
where signal was lost, and exactly ONE drill (shared-state-reset / order-
dependence reasoning if the SCOPE pass was weak; adapt-vs-rewrite if PHASE2 was
weak).
