# SEALED — solution for datadog-endpoint-latency-peak

Never candidate-visible. Compiles into `lib/scenarios/sealed/datadog-endpoint-latency-peak.server.ts`.

## Bug (src/latency_rollup.py, in `build_report()`)
`peak = 0` is initialized above the `for endpoint in grouped` loop, so it is never
reset between endpoints. Each endpoint's reported peak can only ever rise to the
highest latency seen in any earlier endpoint, so an endpoint whose true peak is lower
than a preceding endpoint's peak is overstated.

## Minimal fix
Move `peak = 0` inside the `for endpoint in grouped` loop.

## Why the symptom presents as it does
`/login` peaks at 200 (correct, first). `/search`'s true peak is 60, but the leaked
`peak` is already 200, so it prints 200. `/checkout`'s true peak is 900, which exceeds
the leaked 200, so it is correct. Only `/search` is wrong — partial wrongness.

## Red herring (reachable, provably innocent)
`kind != COUNTED_KIND` (the request-only filter) looks like it silently drops latency
data, but the contract says only request latencies are metered, so the `health`/`ping`
event is correctly excluded.

## Complexity
One pass to group events, then one pass over each endpoint's events. Time O(n), space
O(n) for the grouping dict. (It is linear, not the O(n^2) the nested loops resemble.)

## Phase-2 adaptation path
Ops now meters `internal` service-to-service calls too. Those events already flow
through `parse_events` but are dropped by the `kind != COUNTED_KIND` filter. Widen the
filter to include `internal` (`COUNTED_KINDS = ("request", "internal")`) — an
adaptation of the same filter, not a rewrite. The phase-2 fixture adds internal calls
that v1 silently drops, so v1 output is unchanged until the filter is widened; after
the fix + adaptation, `/search` peaks at 500 (internal) over 4 and `/checkout` counts 3.

## Debrief
Intended bug vs the candidate's actual path, what they did well, where signal was
lost, and exactly ONE drill (accumulator-scope if the scoping pass was weak;
adapt-vs-rewrite if PHASE2 was weak).
