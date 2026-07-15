# SEALED — solution for palantir-ontology-link-rollup

Never candidate-visible. Compiles into `lib/scenarios/sealed/palantir-ontology-link-rollup.server.ts`.

## Bug (src/link_rollup.py, in `parse_links()`)
`next(handle, None)` discards the first line before the loop, on the assumption that
it is a header row. There is no header — the first line is a real link — so the object
type on the first line is undercounted by one.

## Minimal fix
Delete the `next(handle, None)` (and its comment); read the first record like any other.

## Why the symptom presents as it does
The first line is `graph,Asset,link-1,active`, so only `Asset` loses a link (3 -> 2).
Every other object type is counted correctly, which is why a spot check of Dataset and
Sensor looks fine — partial wrongness.

## Red herring (reachable, provably innocent)
`source_system != COUNTED_SOURCE` (the graph-only filter) looks like it silently drops
legitimate links, but the data contract says only graph-sourced links are counted in
this report, so excluding the `warehouse` link is correct.

## Complexity
Parse and aggregate are O(n) in the number of links; the dominant cost is
`sorted(totals)` over the object types. Time O(n log n), space O(n).

## Phase-2 adaptation path
Governance now wants `pending` links counted too. The pending links already flow
through `parse_links` but are filtered out by `status != "active"`. Widen the status
check to include `pending` (`COUNTED_STATUSES = ("active", "pending")`) — an adaptation
of the same filter, not a rewrite. The phase-2 fixture adds pending links that v1 drops
silently, so v1 output is unchanged until the filter is widened.

## Debrief
Deliver the intended bug vs the candidate's actual path, what they did well, where
signal was lost, and exactly ONE drill (first/last-element boundary if the boundary
pass was weak; adapt-vs-rewrite if PHASE2 was weak).
