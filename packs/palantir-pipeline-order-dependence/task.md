# Foundry transform reconciliation: records materialized per pipeline

## Who reads this
The FinOps on-call runs this reconciliation job every night. It replays the
day's shared record feed through each named transform pipeline and reports how
many records each pipeline successfully materialized, so usage can be billed
against the platform dashboard. This morning FinOps flagged that one pipeline's
count reads higher than the dashboard shows, and usage billing is held until the
report is trusted again.

## The program
`pipeline.py` reads the shared record feed and prints, per pipeline, the number
of records that pipeline materialized.

Every pipeline draws from the same feed. The pipelines run over that feed in a
fixed, declared order: `normalize`, then `enrich`, then `geocode`, then
`publish`. A record names the pipeline it belongs to, so records for different
pipelines are interleaved in the feed.

## Data contract (all of this is intended; the correct output tolerates it)
- Lines starting with `#` are comments.
- Columns are `pipeline,record_id,size_bytes,ts`.
- `ts` is ISO-8601 UTC, fixed width, always ending in `Z`
  (`2026-05-01T09:00:05Z`). Lexical order of these strings matches chronological
  order.
- `record_id` is globally unique across the whole feed. The bus is at-least-once,
  so the same record can be delivered more than once; repeats of a `record_id`
  are the same record and count once.
- A record materializes only if `size_bytes` is a positive integer. A record
  whose `size_bytes` is non-numeric or not positive is a validation failure and
  is not materialized.
- A line that does not have exactly four columns is malformed and is skipped.
- A record naming a pipeline outside the declared set is ignored.
- Records for different pipelines are interleaved and may arrive out of order.

## Run it
```
python3 src/pipeline.py fixtures/input.txt
```

## Expected output
```
=== Records materialized by pipeline ===
normalize: materialized=5
enrich: materialized=4
geocode: materialized=3
publish: materialized=2
```

`tests/expected_output.txt` is the oracle. Do not edit it to make the run pass.
