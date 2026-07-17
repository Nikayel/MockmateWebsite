# SQL Level 6 — Cloud & Data Engineering Foundations

## Why this level exists (the gap)

Levels 1-5 teach **SQL query skill**: SELECT/JOIN/aggregation (L1-L2), modeling and
scripting (L3-L4), and the advanced patterns of a live DE screen (L5: gaps-and-islands,
sessionization, CDC, incremental loads). What no level teaches is the **infrastructure
literacy** an intern/junior DE interview probes the moment SQL stops being the whole
question:

- "Why is Parquet faster than a CSV?"
- "What does partitioning a large table actually buy you?"
- "S3 vs a database disk — what's the difference?"
- "You're joining a huge fact table to a tiny lookup table — how do you avoid a shuffle?"
- "This backfill ran twice. Did it double-count?"

These are not SQL-syntax questions. They are questions about the **platform the SQL runs
on**: object storage, columnar file formats, partitioning, distributed execution, and
pipelines. Level 6 is that layer, taught comprehensively and from first principles for a
beginner.

## The pedagogical model

Every lesson in the SQL course must carry a graded `apply` and `practice` exercise that
runs real SQL against the in-browser sql.js engine (the type system requires it). Cloud
concepts are mostly conceptual, so L6 uses a deliberate device:

- **Teach** carries the deep, researched concept (this is where the "comprehensive
  beginner" content lives), with `csdiagram` visuals (`table` / `er` / `pipeline`).
- **Apply / Practice** are real **"query the platform's own metadata" tasks** over
  *simulated catalogs*: an S3 inventory, a Glue table catalog, Parquet column statistics,
  a partition catalog, Spark task metrics, a pipeline run log. Querying operational and
  storage metadata with SQL is itself a legitimate, interview-relevant DE skill (Athena
  over S3 Inventory, querying a Spark history server, dbt/Airflow run metadata), so the
  exercise reinforces the concept instead of shoehorning it.

This keeps L6 fully consistent with L1-L5 (every lesson is a real graded SQL exercise) and
the existing routing, registry, and test guards cover it with zero new wiring.

## Level shape

- id `6`, slug `cloud-data-foundations`, `defaultExecutionMode: "single-file"`, ~7h.
- Voice matches L5: an `**Interview nuance:**` callout and a
  `> **On a real platform this differs.**` blockquote per lesson where apt.
- Content rules: **no em dashes** in learner-facing prose; every Apply/Practice prompt
  **leads with the deliverable** ("Write a query that returns...").

## Modules & lessons (13)

### 6.1 The Cloud Data Platform  (`sql-l6-cloud-platform`)
1. `sql-l6-cloud-and-the-de-stack` — what the cloud is (region/AZ, managed services,
   pay-per-use) + the shape of a data platform (storage → catalog → compute →
   orchestration → serving). Query a `platform_services` catalog.
2. `sql-l6-object-vs-block-storage` — object vs block vs file (S3 / EBS / EFS); the
   immutable-blob-over-HTTP model, 11-nines durability, why the lake lives on object
   storage. Query an `s3_inventory`.
3. `sql-l6-storage-classes-lifecycle` — S3 storage classes + lifecycle (hot→cold→archive),
   cost tiers. Join inventory to `storage_pricing`, compute cost + lifecycle savings.
4. `sql-l6-lake-warehouse-catalog` — lake vs warehouse vs lakehouse; "files + catalog = a
   table" (Glue / Hive metastore). Query a `glue_catalog`.

### 6.2 File Formats: Why Columnar Wins  (`sql-l6-file-formats`)
5. `sql-l6-rows-vs-columns` — row vs columnar layout; column projection. Query
   `parquet_column_stats`; bytes read for `SELECT a,b` vs `SELECT *`.
6. `sql-l6-compression-encoding` — compression + encodings (dictionary/RLE); Snappy/Zstd/
   Gzip; the size/cost story. Compression ratio per column; CSV-vs-Parquet size.
7. `sql-l6-row-groups-pushdown` — row groups + min/max stats + predicate pushdown
   (row-group skipping); Parquet vs ORC vs Avro. Sum bytes of only the row groups whose
   [min,max] overlaps a range.

### 6.3 Partitioning a Large Table  (`sql-l6-partitioning`)
8. `sql-l6-what-is-a-partition` — `dt=.../` layout, pruning, why partition. Bytes scanned
   for `WHERE dt=...` (one partition) vs full scan.
9. `sql-l6-choosing-partition-key` — cardinality, date keys, the small-files problem,
   over-partitioning. Detect the small-files problem from the catalog.
10. `sql-l6-bucketing-and-the-full-scan-trap` — bucketing/clustering vs partitioning; the
    non-sargable-predicate full-scan trap. Bucket file distribution + pruned-vs-not scan.

### 6.4 Distributed Processing & Pipelines  (`sql-l6-distributed-pipelines`)
11. `sql-l6-distributed-execution` — partitions→tasks→stages, narrow vs wide, the shuffle.
    Query `task_metrics`: per-stage task count, shuffle bytes, avg duration.
12. `sql-l6-skew-and-joins` — data skew/stragglers + broadcast vs shuffle join (10 MB
    threshold). Detect the straggler; reason about broadcast eligibility.
13. `sql-l6-pipelines-orchestration` — DAGs, ETL vs ELT, idempotency, backfill,
    freshness/SLA, medallion. Capstone over `pipeline_runs`: success rate, late/stale runs,
    SLA breaches.

## Simulated-table conventions

Catalog tables are named after the real thing (`s3_inventory`, `glue_catalog`,
`parquet_column_stats`, `row_group_stats`, `partition_catalog`, `task_metrics`,
`pipeline_runs`) so a learner who later queries the real metadata recognizes the shape.
Bytes are plain INTEGERs; a helper column pre-computes MB where readability matters.

## Verification

- Every `singleFile.expected` set is generated by running the reference SELECT through the
  SAME self-hosted sql.js WASM the app ships (scratchpad `sqlgen/gen.mjs`), never
  hand-typed — identical discipline to L5.
- The existing guards auto-cover L6 (they iterate `SQL_LEVELS`):
  `single-file-reference-solutions.test.ts` (reference answer must equal its `expected`),
  `teach-demos.test.ts` (every teach demo executes), and the diagrams
  `content-integrity.test.ts` (every `csdiagram` parses and renders).

## Research

Deep, source-verified facts sheets live beside this plan in `docs/sql-curriculum/cloud/`
(`research-1-aws-storage.md`, `research-2-columnar-parquet.md`, `research-3-partitioning.md`,
`research-4-distributed-pipelines.md`). Lesson prose is grounded in those.
