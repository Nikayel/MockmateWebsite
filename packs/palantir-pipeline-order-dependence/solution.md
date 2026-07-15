# SEALED — solution for palantir-pipeline-order-dependence

Never candidate-visible. Compiles into `lib/scenarios/sealed/palantir-pipeline-order-dependence.server.ts`.

## Bug (src/pipeline.py, in `run_pipelines()`)
`batch` is created once, above the `for pipeline in PIPELINE_ORDER` loop, and is
shared by every pipeline. Inside a pipeline the batch commits and rebinds to a
fresh list each time it reaches `COMMIT_SIZE` (`batch = []`), so it self-clears
on the size-triggered path. But the end-of-pipeline flush only does
`materialized += len(batch)` — it counts the trailing partial batch and never
clears it. Those leftover records survive into the next pipeline's run and are
appended to by its records, so they are counted a second time inside that
pipeline's first commit.

## Minimal fix
Reset the batch per pipeline. Either clear it after the flush:

```python
        materialized += len(batch)
        batch = []
        counts[pipeline] = materialized
```

or initialize `batch = []` at the top of the `for pipeline in PIPELINE_ORDER`
loop body. One line; do not rewrite the function.

## Why the symptom presents as it does
With `COMMIT_SIZE = 3`, only `normalize` finishes with a non-empty partial batch:
it has 5 valid records, so after one commit of 3 the flush leaves 2 records in
`batch`. Those 2 records carry into `enrich`, whose first commit folds them in,
so `enrich` reports 6 instead of 4 — inflated by exactly the 2 leftover records.
`enrich` then ends on an exact commit boundary (2 carried + 4 of its own = 6, a
multiple of 3), so `batch` is empty again and `geocode` and `publish` are
untouched. Every other pipeline's valid-record count is already correct — partial
wrongness, one row off. Because the leftover is carried across the pipeline
boundary in declared order, reordering `PIPELINE_ORDER` would move the inflated
row: the bug is order-dependent, and it only surfaces because `normalize` (the
pipeline before `enrich`) ends with an uncommitted partial batch.

## Red herrings (both reachable, both provably innocent)
1. `dedupe()` keying only on `record_id` — looks under-specified (why is one
   field enough, and could it drop a record whose id recurs in another
   pipeline?). Provably innocent: the contract declares `record_id` globally
   unique across the whole feed, so the repeated `enrich` line (`e2`) is a
   genuine at-least-once redelivery with identical fields and dropping it is
   correct. Reachable because the fixture contains that redelivery.
2. `records_for()` sorting by the raw `ts` string — sorts by the ISO-8601 text
   rather than a parsed time, and reordering records changes which records share
   a commit batch, so it looks like it could change the counts. Provably
   innocent: a pipeline's materialized count is the number of its valid, deduped
   records regardless of batching order, and the timestamps are fixed-width UTC
   with a constant `Z` offset so lexical order equals chronological order anyway.
   Reachable because the fixture rows are deliberately out of `ts` order within a
   pipeline, so the sort actually reorders them — and the counts are unchanged.

## Complexity
Parsing and dedup are O(n). `records_for()` rescans the full record list once
per pipeline, so the rollup is O(p·n) over p pipelines, plus O(n log n) for the
per-pipeline sorts. A single grouping pass (bucket each record by its pipeline
once) would make it O(n) plus the sort. Space O(n) for the retained records.

## Phase-2 adaptation path
Ops adds a new transform pipeline, `reconcile`. Its rows already flow through
`parse_feed` and `dedupe` today and are discarded by the "pipeline outside the
declared set is ignored" filter — the data exists and is thrown away. Adapt,
don't rewrite: add `"reconcile"` to `PIPELINE_ORDER` (after `"publish"`) so the
already-parsed records run through the same path and print their own line. The
fix must ship first: without the batch reset, the leftover carry would still
corrupt a row; with the reset, `reconcile` materializes its 3 records cleanly.

## Debrief
Deliver the intended bug vs the candidate's actual path, what they did well,
where signal was lost, and exactly ONE drill (shared-state-reset / order-
dependence reasoning if the SCOPE pass was weak; adapt-vs-rewrite if PHASE2 was
weak).
