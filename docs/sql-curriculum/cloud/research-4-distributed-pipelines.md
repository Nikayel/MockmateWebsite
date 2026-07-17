# Research 4 — Distributed Processing & Data Pipelines (facts-sheet)

Audience: interns / junior data-engineering candidates. Every number below is verified
against a primary source (Apache Spark docs, AWS, Snowflake, Databricks, Apache Airflow,
dbt). Version-dependent numbers are flagged. See **Sources** at the bottom.

> Canonical example engine is **Apache Spark**, but the ideas (partitions, parallel tasks,
> shuffle, skew, broadcast) are engine-general and apply to any distributed processor.

---

## 1. Why one machine isn't enough — what "distributed processing" means

A single machine has a fixed ceiling: a fixed amount of RAM, a fixed number of CPU cores,
and one disk/network. Once the dataset (or the compute) is larger than that ceiling, you
cannot finish the job on one box in acceptable time (or at all). Distributed processing
solves this by using **many machines at once**.

The core loop of every distributed engine:

```
1. SPLIT the data into PARTITIONS (chunks that fit in memory on one worker).
2. SHIP A COPY OF THE COMPUTE to where each partition already lives
   (move code to data — code is small, data is huge).
3. RUN IN PARALLEL — every worker processes its own partition at the same time.
4. COMBINE the partial results into the final answer.
```

Moving the *computation* to the *data* (rather than pulling all the data to one place) is
the founding idea of Hadoop/MapReduce and every engine after it. Data is expensive to move;
code is cheap to copy.

### Scale OUT vs scale UP

| Term | Meaning | Example | Trade-off |
|---|---|---|---|
| **Scale UP** (vertical) | Make **one** machine bigger | 16 GB RAM → 512 GB RAM box | Simple, but a hard ceiling; biggest box is finite and $$$ nonlinear |
| **Scale OUT** (horizontal) | Add **more** machines | 1 node → 100 nodes | Near-linear headroom; needs coordination, network, fault tolerance |

Distributed processing is fundamentally **scale-out**. Cloud warehouses and Spark clusters
add *nodes*, not just bigger nodes. The catch scale-out introduces is that machines must now
**talk over the network**, which sets up everything in section 3 (the shuffle).

---

## 2. The Spark execution model (beginner level)

Vocabulary, from smallest to largest, with the one rule that ties them together:

| Term | Beginner definition |
|---|---|
| **Partition** | A chunk of a DataFrame that lives on and is processed by one worker. A DataFrame is physically split into many partitions. |
| **Task** | The unit of work that processes **exactly one partition**. **One task per partition.** |
| **Executor** | A JVM process on a worker machine that runs tasks and holds data in memory. A cluster has many executors, each with several cores. |
| **Stage** | A group of tasks that can all run without moving data between machines. A stage boundary is created by a shuffle. |
| **Job** | Everything triggered by one **action** (e.g. `count()`, `write()`, `collect()`). A job is broken into stages; each stage into tasks. |

```
JOB  (one action, e.g. df.write())
 └── STAGE 1 ──────────────┐  (shuffle boundary here)
      ├── Task (partition 0) │
      ├── Task (partition 1) │  N partitions -> N tasks, run in parallel on executors
      └── Task (partition N) │
 └── STAGE 2 (reads shuffled data) ...
```

**The key rule:** *a stage runs as many tasks as there are partitions* — one task per
partition. If a stage has 200 partitions, it launches 200 tasks; they run in parallel up to
the number of available executor cores.

### Narrow vs wide transformations

This is the single most important distinction for performance.

| Type | Data movement? | Examples | Why |
|---|---|---|---|
| **Narrow** | **No** network shuffle | `map`, `filter`, `select`, `withColumn`, `union` | Each output partition depends on **one** input partition; the work stays local. |
| **Wide** | **Yes — a SHUFFLE** | `groupBy`, `join`, `distinct`, `reduceByKey`, `repartition`, `orderBy` | Each output partition depends on **many** input partitions, so rows must be moved between machines. |

Narrow transformations are cheap and pipeline together inside one stage. A **wide**
transformation forces a shuffle, which **ends one stage and starts the next** — and the
shuffle is where the cost lives.

---

## 3. The SHUFFLE — the expensive thing

**Why it exists:** to `groupBy` a key or `join` on a key, *all rows with the same key must
end up on the same machine*. But those rows start scattered across every partition on every
node. So the engine **repartitions the data by key across the network**.

Official Apache Spark definition:

> "the shuffle is Spark's mechanism for re-distributing data so that it's grouped
> differently across partitions. This typically involves copying data across executors and
> machines, making the shuffle a **complex and costly operation**." — Spark RDD Programming Guide

A shuffle pays **three** costs at once (all three quoted from the Spark docs):

- **Disk I/O** — map outputs are sorted and written to files on disk.
- **Data serialization** — rows are serialized into bytes to travel.
- **Network I/O** — those bytes are copied machine-to-machine.

This is why the shuffle is the **dominant cost of most big jobs**. A filter that drops 99%
of rows is nearly free; a `groupBy` that moves 100% of rows over the network is not.

### Map-side write / reduce-side read (beginner mechanics)

Spark splits a shuffle into two sets of tasks:

> "To organize data for the shuffle, Spark generates sets of tasks — **map** tasks to
> organize the data, and a set of **reduce** tasks to aggregate it."

```
   MAP SIDE (write)                        REDUCE SIDE (read)
 ┌───────────────────┐                    ┌────────────────────────┐
 │ each map task:    │   network / disk   │ each reduce task:      │
 │  hash each row by │ ─────────────────► │  pull its assigned     │
 │  key -> target    │  (serialized       │  key-buckets from EVERY│
 │  bucket, sort,    │   shuffle files)   │  map output, combine   │
 │  write to file    │                    │  same-key rows locally │
 └───────────────────┘                    └────────────────────────┘
```

- **Map side:** every task decides, for each row, *which* reduce partition the row's key
  belongs to (`hash(key) % numShufflePartitions`), sorts by that target, and writes shuffle
  files to disk.
- **Reduce side:** each reduce task reads *its* bucket from *every* map output, so all rows
  for a given key finally sit together and can be grouped/joined.

> Spark docs, verbatim: "results from individual map tasks are kept in memory until they
> can't fit. Then, these are sorted based on the target partition and written to a single
> file. On the reduce side, tasks read the relevant sorted blocks."

### `spark.sql.shuffle.partitions` — default **200** (VERIFIED)

| Property | Default | Since | Controls |
|---|---|---|---|
| `spark.sql.shuffle.partitions` | **200** | 1.1.0 | The number of partitions produced **on the reduce side** of a shuffle (i.e. how many partitions exist *after* a `join`/`groupBy`/`distinct`). |

So after any wide transformation, Spark SQL produces **200 partitions by default → 200
reduce tasks**, regardless of data size. That is why:
- On a tiny dataset, 200 is wasteful (200 near-empty tasks, scheduling overhead).
- On a huge dataset, 200 may be too few (each partition too big to fit in memory → spill/OOM).
- **AQE (section 4) now auto-coalesces** this number at runtime, which is why hand-tuning
  it matters less on Spark 3.2+.

> Do not confuse `spark.sql.shuffle.partitions` (SQL/DataFrame shuffles, default 200) with
> `spark.default.parallelism` (RDD ops, defaults to total cores). Different knobs.

---

## 4. DATA SKEW and STRAGGLERS

**The problem:** the shuffle sends each key to one reduce task. If the keys are *uneven* —
one key has 100M rows while most keys have a few thousand — then the one task that got the
giant key has to process vastly more data than its siblings. Because a **stage is not done
until its slowest task finishes**, the whole stage waits on that one task. That slow task is
the **straggler**.

Classic skew sources: a `NULL` join key (all nulls hash to the same bucket), a "mega-
customer" / default account, a bot user, a single hot date.

**Symptoms a beginner can recognize:**
- In the Spark UI, one task in a stage takes **10x+ longer** than the median task
  (e.g. 199 tasks finish in 20s, 1 task runs for 12 min).
- One executor **OOMs / spills to disk heavily** while the rest sit idle.
- A `groupBy`/`join` stage's duration ≈ the duration of its single slowest task.

**Beginner-level fixes:**

| Fix | What you do | When |
|---|---|---|
| **Filter nulls** | `WHERE key IS NOT NULL` before the join (or handle nulls separately) | NULL is the skewed key |
| **Salting** | Append a random suffix (`key + "_" + rand(0..N)`) to spread one hot key across N reduce tasks, join to a replicated/exploded dimension, then strip the salt | A few known mega-keys |
| **Broadcast the small side** | Turn the join into a broadcast join (section 5) so there is **no shuffle at all** | One side is small |
| **Let AQE handle it** | Leave `spark.sql.adaptive.skewJoin.enabled` on (default true) | Spark 3.x sort-merge joins |

### AQE — enabled by default since **Spark 3.2.0** (VERIFIED), splits skewed partitions

| Property | Default (latest) | Since | Note |
|---|---|---|---|
| `spark.sql.adaptive.enabled` | **true** | 1.6.0 (property) | **Enabled by default since Apache Spark 3.2.0.** In Spark 3.0 / 3.1 the default was **false** — you had to turn it on. ← version-dependent, commonly mis-stated |
| `spark.sql.adaptive.skewJoin.enabled` | true | 3.0.0 | Splits skewed partitions in sort-merge joins |
| `spark.sql.adaptive.coalescePartitions.enabled` | true | 3.0.0 | Auto-shrinks the 200 shuffle partitions at runtime |
| `spark.sql.adaptive.skewJoin.skewedPartitionFactor` | 5.0 | 3.0.0 | A partition is "skewed" if > 5.0 × median partition size … |
| `spark.sql.adaptive.skewJoin.skewedPartitionThresholdInBytes` | 256MB | 3.0.0 | … **and** larger than 256MB |

**AQE = Adaptive Query Execution.** It uses *runtime* statistics (the actual sizes of the
shuffle files it just wrote) to change the plan mid-flight. Its three headline optimizations:
1. **Coalesce** post-shuffle partitions (fix the "200 tiny partitions" problem automatically).
2. **Convert** a sort-merge join to a broadcast join when a side turns out to be small.
3. **Skew join optimization:** "dynamically handles skew in sort-merge join by **splitting
   (and replicating if needed) skewed tasks into roughly evenly sized tasks**" — i.e. it
   detects the one giant partition and cuts it into several, so no single task is a straggler.

A partition triggers skew handling when it is **both** `> 5.0 × median` **and** `> 256MB`.

---

## 5. BROADCAST JOIN vs SHUFFLE (sort-merge) JOIN

The single most-tested optimization in DE interviews.

**Sort-merge join (the shuffle join):** the default when **both** sides are large. Spark
**shuffles both tables** by the join key so matching keys land together, sorts each side,
then merges. Two big shuffles = expensive.

**Broadcast hash join (the map-side join):** when **one** side is small, Spark sends a
**full copy of the small table to every executor**. Each executor then joins its local
partitions of the big table against the in-memory copy of the small table. **The big table
is never shuffled** — no network repartition of the expensive side.

```
SORT-MERGE (both large)              BROADCAST (one small)
  BIG ──shuffle──┐                     small ──copy to ALL executors──► [in memory everywhere]
  BIG ──shuffle──┴─ sort+merge         BIG  ── stays put, joins locally ─► done (NO shuffle of BIG)
```

### `spark.sql.autoBroadcastJoinThreshold` — default **10 MB = 10485760 bytes** (VERIFIED)

| Property | Default | Since | Meaning |
|---|---|---|---|
| `spark.sql.autoBroadcastJoinThreshold` | **10485760 (10 MB)** | 1.1.0 | Max size of a table that Spark will **automatically** broadcast. If one side's estimated size ≤ this, Spark auto-picks a broadcast join. |
| same, set to **-1** | — | — | **Disables** automatic broadcast joins entirely, regardless of table size. |

Practical notes for accuracy:
- The threshold is compared against Spark's **estimated** size of the table; if statistics
  are missing/wrong, a small table may not auto-broadcast. You can force it with the hint
  `broadcast(df)` / SQL `/*+ BROADCAST(t) */`.
- Broadcasting something too large risks driver/executor **OOM** — the whole table must fit
  in memory on every executor. That is why the auto threshold is conservative (10 MB).

### The classic interview question

> *"You're joining a huge fact table to a tiny dimension table — how do you avoid the
> shuffle?"*

**Answer:** broadcast the tiny dimension. `broadcast(dim)` (or rely on
`spark.sql.autoBroadcastJoinThreshold`, default 10 MB) sends the small table to every
executor so the fact table joins locally with **no shuffle of the big table**. If the dim is
just over 10 MB but still fits in memory, raise the threshold or use the explicit hint.

---

## 6. MPP data warehouses (beginner level)

"MPP" = **Massively Parallel Processing**: the warehouse spreads one query across many
compute nodes, each working on its slice — the exact same partition-and-parallelize idea as
Spark, applied to SQL. The same "get the join keys onto the same node" concern shows up here
as **distribution**.

### Amazon Redshift — distribution style / distribution key

Redshift splits every table's rows across its compute nodes (each node is further divided
into **slices**). *How* the rows are spread is the **distribution style**, chosen per table.
Co-locating rows that join on the same key on the same node means the join needs **no
data redistribution** across the network (the warehouse equivalent of avoiding a shuffle).

| Style | How rows are placed | Use it when |
|---|---|---|
| **KEY** | Rows hashed by **one column**; equal values on the same slice | Two big tables that join on that column → co-located, no redistribution |
| **ALL** | A **full copy of every row on every node** | Small, slow-changing dimension tables — collocated for every join (costs N× storage) |
| **EVEN** | Round-robin, ignoring values | Table doesn't join, or no clear key |
| **AUTO** | Redshift **picks and changes** the style as the table grows (starts ALL when small → KEY/EVEN when big); the **default** | You don't want to decide up front |

Choosing a good **distribution key** (a high-cardinality column that tables actually join
on) is the Redshift analog of avoiding a shuffle.

### Snowflake — separated storage & compute over micro-partitions

Snowflake's design is different but rests on the same distribution idea:

- **Storage / compute separation.** Data lives once in cloud object storage as immutable,
  compressed, columnar **micro-partitions**. Compute is separate.
- **Virtual warehouses** are independent MPP compute clusters you spin up on demand. Many
  warehouses can read the **same** data at once, each isolated, each scaling independently
  (this is what enables elastic scale-up and per-second billing).
- **Micro-partitions** — VERIFIED size: *"Each micro-partition contains between **50 MB and
  500 MB of uncompressed data** (note that the actual size in Snowflake is smaller because
  data is always stored compressed)."* Snowflake stores per-partition metadata (min/max
  range of each column, number of distinct values) so it can **prune** — skip partitions
  that can't match a filter — instead of scanning everything.

> Common mis-statement: micro-partitions are **not** "16 MB." The official figure is **50–500
> MB uncompressed**; 16 MB is an unofficial estimate of the *compressed* on-disk size. Cite
> 50–500 MB uncompressed.

The through-line: Spark shuffle-partition = Redshift distribution = Snowflake
micro-partition + pruning. All three are "how do we split data across machines and avoid
moving it needlessly."

---

## 7. Data pipelines & orchestration

### Pipeline / DAG (Airflow definition)

A **data pipeline** is a series of steps that move and transform data from source to
destination. Orchestrators model a pipeline as a **DAG — Directed Acyclic Graph**:

- **Directed:** steps have a direction (A runs before B).
- **Acyclic:** **no cycles** — a task can never depend on itself, directly or indirectly, so
  the workflow always terminates (no infinite loop).
- **Graph:** nodes = **tasks** (units of work); edges = **dependencies** (run-order).

In Apache Airflow: *"A Dag is a model that encapsulates everything needed to execute a
workflow"* — its tasks, their dependencies (declared with `>>` / `<<` or
`set_upstream`/`set_downstream`), and a schedule. The **scheduler** triggers DAG runs on
that schedule and launches each task only once its upstream dependencies have succeeded,
handling retries and timeouts.

### ETL vs ELT

| | **ETL** (Extract → **Transform** → Load) | **ELT** (Extract → Load → **Transform**) |
|---|---|---|
| Order | Transform **before** loading | Load raw **first**, transform **in the warehouse** |
| Where transform runs | External engine before the warehouse | Inside the warehouse (uses its compute) |
| Fits | Legacy warehouses, compliance (mask before it lands), pre-tested transforms | **Cloud warehouses** (Snowflake/BigQuery/Redshift), big/flexible data |
| Trade | Only clean data lands; reprocessing = re-extract | Raw stays queryable; transform iteratively; scales with warehouse compute |

**Modern cloud data engineering favors ELT** because cloud warehouses have cheap, elastic
compute — load the raw data cheaply, then transform it in place (this is the dbt model).
ETL hasn't disappeared: it's still used for compliance/masking-before-landing and legacy
systems.

### Idempotency — the retry-safety property

**Idempotent = running a task/backfill twice with the same input produces the same result**
(no duplicates, no double-counting). This matters because **anything that can be retried
will be retried**: a task fails halfway, the scheduler re-runs it, a human re-runs a
backfill. A non-idempotent "append rows" job double-counts on every retry.

The three canonical idempotent-write patterns:

| Pattern | How | Note |
|---|---|---|
| **Partition overwrite** | Replace the *entire* partition for the period being processed (`INSERT OVERWRITE`, Delta `replaceWhere`) instead of appending | Simplest & most reliable for batch; re-running just replaces the same partition |
| **MERGE / UPSERT** | Match source↔target on a business key; update if present, insert if not | Row-level idempotency by key |
| **Delete-then-insert** | Delete the affected slice, then insert the recomputed rows (one transaction) | Works where MERGE isn't available |

Rule of thumb: **never blind-`INSERT`/append** in a retryable pipeline. Make the write
target a *deterministic function of the input partition* so a re-run overwrites rather than
adds.

### Backfill

**Backfill = re-processing historical partitions** — because the transform logic changed,
a bug was fixed, or data arrived late. Good backfills:
- Target **only the affected partitions** (small blast radius), which time-based
  partitioning (day/hour) makes easy.
- Are **safe to re-run** — i.e. they rely on the idempotent write patterns above so
  re-running a date range doesn't duplicate rows.

**Incremental vs full refresh:**

| | Full refresh | Incremental |
|---|---|---|
| What | Recompute the whole table every run | Load only rows changed since last run |
| Cost | High, simple, always correct | Cheap, needs bookkeeping |

**High-water-mark incremental load:** track the max processed value (a timestamp or an
increasing id) — the "watermark" — and next run pull only rows **greater than** it. To catch
**late-arriving data**, re-read a small window *before* the watermark and rely on idempotent
loads to absorb the overlap without duplicating.

### Freshness / SLA / late-arriving data

- **Freshness:** how recent the data is (e.g. "the table is never more than 1 hour behind
  source").
- **SLA:** the promise for it (e.g. "gold tables ready by 6 AM"). Airflow can alert when a
  task misses its SLA.
- **Late-arriving data:** events that show up after their time-window already ran (network
  delay, offline device). Handled with watermark look-back windows + idempotent re-processing
  of the affected partition (backfill).

### Medallion architecture (Bronze / Silver / Gold)

The canonical layered-pipeline pattern (popularized by Databricks). Data quality improves as
it flows through three tiers:

| Layer | Also called | What's in it | Transformations |
|---|---|---|---|
| **Bronze** | Raw | Source data in its **original form**, appended incrementally, minimal/no cleanup | Ingest as-is; keep history |
| **Silver** | Cleaned / conformed | **Validated, cleaned, enriched** data | Dedup, schema enforcement, null handling, joins, quality checks |
| **Gold** | Business / curated | **Aggregated, business-level** tables | Business logic, aggregations for dashboards / BI / ML features |

```
sources ──► BRONZE (raw, immutable) ──► SILVER (clean, conformed) ──► GOLD (aggregated, business-ready)
             append-only               dedup / validate / join       KPIs / marts / dashboards
```

Rule of thumb: **Bronze = as-received, Silver = trustworthy, Gold = decision-ready.**

### Querying pipeline RUN METADATA (a real DE skill)

Pipelines emit **operational metadata** about every run: run status (success/failed),
rows read vs rows written, task duration, start/end time, freshness/lag. This metadata is
itself stored in tables and **queried with SQL** — e.g. `SELECT` over Airflow's metadata DB,
dbt's `run_results` / artifacts, or an audit/`pipeline_runs` table — to answer:
- "Which tasks failed or ran long last night?"
- "How many rows did each load write (did counts suddenly drop = upstream break)?"
- "How stale is this table right now (max load time vs now)?"

Being able to write those SQL queries over run/audit metadata is a genuine day-to-day DE
skill, not just a nice-to-have.

---

## Common learner misconceptions

| Misconception | Reality |
|---|---|
| "`spark.sql.shuffle.partitions` scales with my data size." | It's a **fixed default of 200** regardless of data; you tune it or let AQE coalesce it. |
| "AQE has always been on in Spark 3." | AQE has existed since 3.0 but was **default-OFF in 3.0/3.1**; **default-ON only since 3.2.0.** |
| "The broadcast threshold is 10 GB / 100 MB / 8 MB." | It is **10 MB = 10485760 bytes** (`spark.sql.autoBroadcastJoinThreshold`); `-1` disables auto-broadcast. |
| "A broadcast join shuffles the small table." | It **copies** the small table whole to every executor; **neither** table is shuffled by key (the big table stays put). |
| "More partitions is always faster." | Too many → tiny tasks + scheduler overhead; too few → giant tasks + OOM/spill. There's a middle. |
| "A `filter` is as expensive as a `groupBy`." | `filter`/`map` are **narrow** (no shuffle); `groupBy`/`join`/`distinct` are **wide** (shuffle) — usually the dominant cost. |
| "Skew just means the job is slow." | Skew shows as **one straggler task 10x+ slower** / one executor OOMing while others idle — the stage waits on that one task. |
| "Snowflake micro-partitions are 16 MB." | Official figure is **50–500 MB uncompressed** (stored compressed, so smaller on disk). |
| "Re-running a backfill is safe by default." | Only if writes are **idempotent** (overwrite/MERGE/delete-insert). A plain append **double-counts** on re-run. |
| "ETL and ELT are the same, just spelled differently." | Order differs: ETL transforms **before** load; ELT loads raw then transforms **in the warehouse** (cloud default). |
| "Redshift `ALL` distribution is the fast default." | Default is **AUTO**; `ALL` copies every row to every node (N× storage) and suits only small dims. |

---

## Interview angles

1. **"Huge fact table joins a tiny dim table — avoid the shuffle."**
   Broadcast the small dim (`broadcast(dim)` or auto via `spark.sql.autoBroadcastJoinThreshold`,
   default **10 MB**). The dim is copied to every executor; the big fact table joins locally
   with **no shuffle of the big side**. If the dim is a bit over 10 MB but fits in memory,
   raise the threshold or force the hint.

2. **"One task runs 10x longer than the rest — what's happening and how do you fix it?"**
   **Data skew** → a straggler. One key (often NULL or a mega-customer) has most of the rows,
   so its reduce task dwarfs the others and the stage waits on it. Fixes: filter/handle NULL
   keys, **salt** the hot key, broadcast the small side, or rely on **AQE skew-join
   handling** (default-on since Spark 3.2, splits the skewed partition; triggers at
   > 5× median **and** > 256 MB).

3. **"Make this backfill safe to re-run."**
   Make writes **idempotent**: **overwrite the target partition** (or MERGE by key, or
   delete-then-insert) instead of appending, so re-processing a date range **replaces** rows
   rather than duplicating them. Backfill only the affected partitions.

4. **"Why is the shuffle the expensive part of my job?"**
   Grouping/joining by key needs same-key rows co-located, so Spark repartitions across the
   cluster: map-side **serialize + sort + write to disk**, transfer over the **network**,
   reduce-side **read back**. Disk + serialization + network = the dominant cost. Narrow ops
   (map/filter) avoid it entirely.

5. **"What does `spark.sql.shuffle.partitions = 200` actually control?"**
   The number of **reduce-side partitions after a wide transformation** — i.e. 200 tasks
   after every `join`/`groupBy` by default, independent of data size. Too many for small
   data, too few for huge; AQE now coalesces it at runtime.

6. **"ETL vs ELT — which and why for a cloud warehouse?"**
   **ELT.** Cloud warehouses (Snowflake/BigQuery/Redshift) have cheap elastic compute, so
   load raw first and transform in-warehouse (dbt-style) — faster to land, raw stays
   queryable, transforms iterate without re-extracting. ETL still fits compliance/masking-
   before-landing and legacy systems.

7. **"Explain Bronze/Silver/Gold."**
   Layered pipeline: **Bronze** raw as-received (append-only), **Silver** cleaned/validated/
   conformed (dedup, schema, joins), **Gold** aggregated business-ready tables for BI/ML.
   Quality and business-readiness increase left to right.

8. **"Redshift: two big tables join slowly — what do you change?"**
   Give both tables a **KEY distribution on the join column** so matching keys are co-located
   on the same slice → **no cross-node redistribution** at join time (the warehouse analog of
   avoiding a shuffle). Small dims can use **ALL**.

---

## Sources

Primary / authoritative (verified for the load-bearing numbers):

- Apache Spark — Performance Tuning (config defaults: `shuffle.partitions`=200,
  `autoBroadcastJoinThreshold`=10485760, AQE properties, skew factor 5.0 / 256MB, "AQE
  enabled by default since Apache Spark 3.2.0"):
  https://spark.apache.org/docs/latest/sql-performance-tuning.html
- Apache Spark — RDD Programming Guide, "Shuffle operations" (shuffle definition, map/reduce
  tasks, disk/serialization/network I/O, "complex and costly"):
  https://spark.apache.org/docs/latest/rdd-programming-guide.html
- Amazon Redshift — Distribution styles (AUTO/EVEN/KEY/ALL, AUTO is default, ALL collocates):
  https://docs.aws.amazon.com/redshift/latest/dg/c_choosing_dist_sort.html
- Amazon Redshift — Choose the best distribution style:
  https://docs.aws.amazon.com/redshift/latest/dg/c_best-practices-best-dist-key.html
- Snowflake — Micro-partitions & Data Clustering (50–500 MB uncompressed, stored compressed,
  per-partition metadata + pruning):
  https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions
- Snowflake — Key Concepts & Architecture (storage/compute separation, virtual warehouses,
  services layer):
  https://docs.snowflake.com/en/user-guide/intro-key-concepts
- Databricks — Medallion architecture (Bronze/Silver/Gold definitions):
  https://docs.databricks.com/aws/en/lakehouse/medallion
- Apache Airflow — DAGs / core concepts (DAG = directed acyclic graph of tasks + deps,
  scheduler):
  https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html
- dbt Labs — ETL vs ELT (order, cloud favors ELT):
  https://www.getdbt.com/blog/etl-vs-elt
- AWS — Difference between ETL and ELT:
  https://aws.amazon.com/compare/the-difference-between-etl-and-elt/
- AWS Prescriptive Guidance — Using Adaptive Query Execution (AQE default-on 3.2.0):
  https://docs.aws.amazon.com/prescriptive-guidance/latest/spark-tuning-glue-emr/using-adaptive-query-execution.html
- Databricks — Adaptive Query Execution blog (three AQE features incl. skew handling):
  https://www.databricks.com/blog/2020/05/29/adaptive-query-execution-speeding-up-spark-sql-at-runtime.html

Supporting / corroborating (idempotency, backfill, incremental patterns):

- Start Data Engineering — Incremental load strategy / design decisions:
  https://www.startdataengineering.com/post/incremental-load-strategy/
- ml4devs — Backfilling historical data with idempotent pipelines:
  https://www.ml4devs.com/what-is/backfilling-data/

---

## Version-dependent / commonly-mis-stated (flagged for authors)

- **AQE default-on version:** *Spark 3.2.0*, not 3.0. (3.0/3.1: AQE exists but default-OFF.)
  The config table lists `spark.sql.adaptive.enabled` "Since 1.6.0" with default `true` in
  the *latest* docs, but the default only *became* `true` in 3.2.0 — cite 3.2.0 for "on by
  default."
- **`autoBroadcastJoinThreshold` = 10 MB (10485760 bytes)**; `-1` disables. Verify against
  the version's docs; some managed platforms (e.g. Databricks) may ship a different default.
- **`spark.sql.shuffle.partitions` = 200** — a fixed default, not data-dependent.
- **Snowflake micro-partition = 50–500 MB uncompressed** (not "16 MB"; that's a compressed
  estimate).
- **Redshift default distribution style = AUTO** (not EVEN/KEY).
- Skew-join thresholds (**5.0× median AND >256 MB**) are Spark defaults and are themselves
  tunable per version.
