# SEALED — solution for palantir-entity-resolution-merge

Never candidate-visible. Compiles into `lib/scenarios/sealed/palantir-entity-resolution-merge.server.ts`.

## Bug (src/resolve_entities.py, in `entity_key()`)
`entity_key(namespace, name)` returns `name` alone and never uses `namespace`.
The merge/dedup key that decides whether two records are the same entity is
therefore keyed on name only. Two genuinely different entities that share a name
in different tenants (`commercial/acme` and `gov/acme`) collapse into one count
bucket, and every `(namespace, name)` row that shares that name reads the merged
total.

## Minimal fix
Key the entity on the full identity:

```python
def entity_key(namespace, name):
    return (namespace, name)
```

One line. `count_links` and `print_report` both route through `entity_key`, so
they stay consistent automatically.

## Why the symptom presents as it does
Only the name `acme` occurs in two namespaces (`commercial` and `gov`), so only
the two acme rows read the merged bucket — both print 5 (3 + 2) instead of 3 and
2. `globex`, `initech`, and `umbrella` each own a name unique to a single
namespace, so `counts[name]` already equals the correct per-entity count and the
rest of the report is right. Partial wrongness, and the two identical acme counts
are the tell.

## Red herrings (both reachable, both provably innocent)
1. `normalize_name` (`raw.strip().lower()`) — looks like it could merge two
   different entities by folding case, but the contract declares entity names
   case-insensitive, so `Acme ` and `acme` are the same entity by design
   (fixture row `commercial,Acme ,L-1003` is the same entity as
   `commercial,acme`). The normalization is correct.
2. `dedupe_links` keying only on `link_id` — looks under-specified, as though it
   could drop a link that legitimately repeats. But the contract says the bus is
   at-least-once and a `link_id` identifies exactly one resolution, so the
   redelivered `commercial,acme,L-1002` line is a true duplicate and dropping it
   is correct.

## Complexity
Parse, dedupe, and count are each O(n) in the number of link rows. The dominant
cost is `sorted()` over the distinct entities when building the report. Time
O(n log n), space O(n).

## Phase-2 adaptation path
Ops onboards a new tenant namespace, `research`. Those rows already flow through
`parse_line`, which parses the namespace and then discards the row because
`research` is not in `REGISTERED_NAMESPACES`. Add `"research"` to
`REGISTERED_NAMESPACES` — an adaptation of the existing filter, not a rewrite.
The research fixture includes `research/acme`, which shares the name `acme` with
the two existing acme entities, so the fixed `(namespace, name)` key must still
hold: `research/acme` stays 1 and the acme rows stay separate. If the merge key
were still name-only, all three acme entities would collapse again.

## Debrief
Deliver the intended bug vs the candidate's actual path, what they did well, where
signal was lost, and exactly ONE drill (dedup-key scoping if the SCOPE pass was
weak; adapt-vs-rewrite if PHASE2 was weak).
