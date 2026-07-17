# Research 3: Partitioning a Large Table

Source-verified facts sheet for SQL Level 6, module 6.3 (`sql-l6-partitioning`).
Grounds lessons 8 (`sql-l6-what-is-a-partition`), 9 (`sql-l6-choosing-partition-key`),
and 10 (`sql-l6-bucketing-and-the-full-scan-trap`).

Every claim below is tagged:

- **[documented]** = quoted or paraphrased directly from a vendor doc (AWS, Google,
  Snowflake, Apache) linked in Sources.
- **[widely cited]** = consistent across reputable engineering sources but not a single
  canonical vendor number.
- **[illustrative]** = an example built to teach; the shape is real, the exact bytes are
  made up.

The one sentence that carries this whole topic, quoted verbatim from AWS Athena docs:

> "By partitioning your data, you can restrict the amount of data scanned by each query,
> thus improving performance and reducing cost." **[documented]**

---

## 1. What a partition IS physically

Hive-style (also written "Hive-format") partitioning lays data out in **directories named
`key=value`**. The partition column and its value live in the **path**, not in every row of
every file.

AWS Athena, verbatim:

> "Athena can use Apache Hive style partitions, whose data paths contain key value pairs
> connected by equal signs (for example, `country=us/...` or
> `year=2021/month=01/day=26/...`). Thus, the paths include both the names of the partition
> keys and the values that each path represents." **[documented]**

### Concrete directory tree

A daily-partitioned `events` table on S3 looks like this. Each leaf directory (`dt=...`)
holds only that day's data files:

```text
s3://my-bucket/events/
├── dt=2024-01-01/
│   ├── part-00000.parquet
│   └── part-00001.parquet
├── dt=2024-01-02/
│   ├── part-00000.parquet
│   └── part-00001.parquet
├── dt=2024-01-03/
│   ├── part-00000.parquet
│   └── part-00001.parquet
└── dt=2024-01-04/
    ├── part-00000.parquet
    └── part-00001.parquet
```

A real AWS-hosted sample listing (ad impressions, partitioned by `dt`) proves the layout is
not hypothetical **[documented]**:

```text
aws s3 ls s3://elasticmapreduce/samples/hive-ads/tables/impressions/

    PRE dt=2009-04-12-13-00/
    PRE dt=2009-04-12-13-05/
    PRE dt=2009-04-12-13-10/
    PRE dt=2009-04-12-14-00/
    PRE dt=2009-04-12-15-00/
```

### The column is in the path, not the rows

In the matching `CREATE TABLE`, the partition column is declared in `PARTITIONED BY`, and
it is **not** one of the stored file columns **[documented]**:

```sql
CREATE EXTERNAL TABLE impressions (
    requestBeginTime string,
    adId string,
    ...
)
PARTITIONED BY (dt string)          -- dt is a "virtual" partition column
LOCATION 's3://.../impressions/';
```

Teaching point: `dt` is never physically written into the Parquet/JSON files. The engine
reads its value **from the folder name** at query time. This is why partitioning a table by
a column that is already stored costs almost no extra storage: you are re-using the
directory name as a free, pre-computed index.

> **On a real platform this differs.** Some engines call these "virtual columns" or
> "partition columns"; the value is materialized only when you `SELECT` it. Multi-level
> schemes (`year=2021/month=01/day=26/`) nest one directory per level.

---

## 2. Partition pruning (the single reason to partition)

**Partition pruning** = the engine uses the `WHERE` predicate to eliminate whole partitions
(directories) **before reading any data files**, so it lists and scans only the matching
directory.

AWS Athena, verbatim:

> "If you query a partitioned table and specify the partition in the `WHERE` clause, Athena
> scans the data only from that partition." **[documented]**

BigQuery, verbatim:

> "If a query uses a qualifying filter on the value of the partitioning column, BigQuery can
> scan the partitions that match the filter and skip the remaining partitions." And: "The
> pruned partitions are not included when calculating the bytes scanned by the query."
> **[documented]**

### How the engine prunes before reading data

1. The **catalog** (AWS Glue Data Catalog / Hive metastore, or the table's own metadata)
   holds the list of partition values and the S3 prefix each maps to.
2. The planner reads the `WHERE` predicate on the partition column, e.g.
   `WHERE dt = '2024-01-01'`.
3. It intersects the predicate with the partition list and keeps only matching prefixes.
4. It lists and opens files **only under those prefixes**. Every other directory is never
   listed or read.

So a query over a 3-year daily table (about 1,095 partitions) that filters one day reads
roughly **1/1,095 of the table**.

### Pruning is literally cheaper

Serverless lake engines bill by **bytes scanned**, so fewer bytes read is fewer dollars.

| Engine   | Pricing basis                     | Verified figure |
|----------|-----------------------------------|-----------------|
| Athena   | Data scanned per query            | **$5.00 per TB scanned**; "Price for 3 TB scanned is 3 * $5/TB = $15." **[documented]** |
| BigQuery | Bytes read (on-demand)            | Partitioning lets you "improve query performance and control costs by reducing the number of bytes read by a query." **[documented]** |

Illustrative cost of a `WHERE dt = '2024-01-01'` query on a 1 TB / 365-partition table:
one day is roughly 2.7 GB, so about `2.7 GB x $5/TB ≈ $0.0135` versus `1 TB x $5 = $5.00`
for a full scan, a ~370x saving. **[illustrative]**

---

## 3. Why you partition a large table

Four concrete payoffs:

| # | Benefit             | What it buys you |
|---|---------------------|------------------|
| a | **Scan less data**  | Faster queries and lower cost, because engines charge by bytes scanned and pruning cuts the bytes. **[documented]** |
| b | **Prune by the common filter** | If almost every query says `WHERE dt = ...`, a date partition turns that filter into "read one folder." **[documented]** |
| c | **Data lifecycle**  | Drop or expire a whole partition in one cheap metadata operation: `ALTER TABLE ... DROP PARTITION`. Deleting "last year" is deleting a set of directories, not a row-by-row `DELETE`. **[documented]** |
| d | **Parallelism + fewer S3 pains** | Independent directories parallelize cleanly, and partitioning spreads objects so you do not hammer one S3 prefix. **[documented]** |

On (d), AWS is explicit that a non-partitioned lake can trip S3 request-rate limits:

> "If you issue queries against Amazon S3 buckets with a large number of objects and the
> data is not partitioned, such queries may affect the `GET` request rate limits in Amazon
> S3 and lead to Amazon S3 exceptions. To prevent errors, partition your data." **[documented]**

---

## 4. Choosing a partition key (the skill an interview probes)

### The rule

AWS, verbatim:

> "Pick partition keys that support your queries. Work backward from your queries and find
> fields that are often used to filter the dataset." **[documented]**

So: **partition on the column you FILTER by most**, which for event/log/fact tables is
almost always an **event or ingest DATE**, and which should be **low-to-moderate
cardinality**. A widely cited rule of thumb is to keep a partition column under roughly
**100 distinct values per level**, or to use a date grain where you accept one directory
per day. **[widely cited]**

### The small-files problem (the counterexample interviewers love)

If you partition on a **high-cardinality** column (like `user_id` or `transaction_id`) you
create one directory per distinct value, hence **millions of tiny files**. That is
pathological. AWS names three distinct costs:

- **Per-file open overhead**, verbatim: "There is an overhead in reading each file, for
  example getting metadata, making the request to Amazon S3, and setting up compression
  dictionaries." **[documented]**
- **Metadata / planning overhead**, verbatim: "as the number of partitions in your table
  increases, the higher the overhead of retrieving and processing the partition metadata,"
  and over-partitioning shows up as "the planning phase in the query stats is more than a
  few percent of the total running time." **[documented]**
- **S3 request pressure**, verbatim: "In the worst case, your queries may fail with an
  Amazon S3 error saying 'Please reduce your request rate.' This happens when the number of
  files is so great that Athena exceeds Amazon S3 service quotas." **[documented]**

AWS measured it: reading data spread across **100,000 files took 11.5 seconds versus 4.3
seconds** for the same data in one file (about a 62% slowdown from file count alone).
**[documented]**

On classic HDFS the same disease hits the NameNode: every file, block, and directory is an
object costing roughly **150 bytes of NameNode heap**, so millions of tiny files exhaust
master memory. **[widely cited]**

### Target file size (the fix for "too small")

Aim files at a healthy size, not a trickle of tiny ones.

- AWS Athena guidance, verbatim: **"aim for splits that are around 128 MB."** **[documented]**
- Broader lake practice: a target file size of roughly **128 MB to 1 GB** for Parquet, with
  a common sweet spot around **256-512 MB**. **[widely cited]**

### Over-partitioning: symptom and fix

- **Symptom:** millions of small files, slow planning phase, `GetPartitions`/metadata
  latency, occasional S3 throttling. AWS, verbatim: "Over-partitioning leads to greater
  quantity of smaller files, which hurts performance." **[documented]**
- **Fix:** partition **coarser**. Go from `dt` (daily) to `month`, or drop the
  high-cardinality key entirely and instead **bucket / cluster** on it (Section 5). Compact
  existing small files (e.g. Delta/Iceberg `OPTIMIZE`, or a CTAS rewrite).

### Partitioning a column you never filter on

Buys **nothing**. It adds directories, files, and catalog entries (all overhead) and prunes
zero queries, because pruning only fires when a query filters on the partition key. Partition
for the filters you actually run.

---

## 5. Bucketing / clustering vs partitioning

The teaching point in one line: **partition by low-cardinality FILTER columns; bucket or
cluster by high-cardinality JOIN/lookup columns.**

Bucketing hashes a high-cardinality column into a **fixed number** of buckets/files, so it
gives you join and aggregation locality **without** the directory explosion of partitioning.

### Spark / Hive bucketing

Apache Spark docs, verbatim:

> "`bucketBy` distributes data across a fixed number of buckets and can be used when the
> number of unique values is unbounded." Whereas "`partitionBy` creates a directory
> structure ... Thus, it has limited applicability to columns with high cardinality." And:
> "Bucketing and sorting are applicable only to persistent tables." **[documented]**

```python
people_df.write.bucketBy(42, "name").sortBy("age").saveAsTable("people_bucketed")
```

Bucketing's payoff is **shuffle-free joins**: if two tables are bucketed on the **same join
column** with the **same number of buckets**, matching rows already sit in the same bucket
file on both sides, so Spark can do a sort-merge join with **no shuffle/exchange**. If the
bucket counts differ (16 vs 32) or the columns differ, the optimization does not apply and
Spark shuffles anyway. **[widely cited]**

### Snowflake: micro-partitions + clustering keys

- Snowflake auto-partitions all table data into **micro-partitions**, each holding
  **between 50 MB and 500 MB of uncompressed data**, and stores per-column min/max and
  distinct-count metadata used for pruning. **[documented]**
- You add a **clustering key** so data is co-located along a dimension; the **Automatic
  Clustering** service then maintains ordering with no manual work. **[documented]**
- Cardinality guidance, verbatim in spirit: for a very high-cardinality column, define the
  key as an **expression** on the column rather than the raw column, to cut distinct values,
  and note there is "no performance advantage from a clustering key that produces a
  cardinality larger than the micro-partition count." **[documented]**

### BigQuery clustering

- "Queries that filter or aggregate by the clustered columns only scan the relevant blocks
  ... instead of the entire table or table partition" (this is **block pruning**), and
  "When a block is pruned, it is not scanned. Only the scanned blocks are used to calculate
  the bytes of data processed by the query." **[documented]**
- Clustering is the tool for **high-cardinality** filter columns: "If your queries filter on
  columns that have many distinct values (high cardinality), clustering accelerates these
  queries." **[documented]**
- Hard limit: **"You can only specify up to four clustering columns."** **[documented]**
- Combine both: "you first segment data into partitions, and then you cluster the data
  within each partition by the clustering columns." **[documented]**

### Partition vs bucket/cluster at a glance

| Dimension            | Partitioning                          | Bucketing / Clustering                         |
|----------------------|---------------------------------------|------------------------------------------------|
| Physical form        | One **directory per value** (`key=value/`) | **Fixed N** buckets/files by hash, or sorted blocks |
| Best for cardinality | Low to moderate (dates, region, type) | High (`user_id`, `order_id`)                   |
| Best for             | **Filtering** (prune whole dirs)      | **Joins / aggregations / high-card filters**   |
| Failure mode         | High cardinality -> small-files explosion | Bad key -> weak pruning, but no dir explosion |
| Prune mechanism      | Skip non-matching directories         | Skip non-matching buckets/blocks (min/max)     |

---

## 6. The full-scan trap (non-sargable predicates)

If you do **not** filter on the partition key, or you wrap it in a function, or you compare
it to another column or a subquery result, the engine **cannot prune and scans the whole
table**. Keeping predicates "sargable" (Search-ARGument-ABLE, i.e. usable directly against
the partition/index structure) is the fix.

BigQuery, verbatim:

> "To limit the partitions that are scanned in a query, filter the partitioning column using
> a constant expression, rather than a dynamic expression." And: "Other functions and
> complex mathematical operations will require a full table scan." And the rule of thumb:
> "Isolate the partitioning column on one side of a comparison operator, or wrap the column
> only in a supported built-in function." **[documented]**

| Predicate                                            | Prunes? | Why |
|------------------------------------------------------|---------|-----|
| `WHERE dt = '2024-01-01'`                             | Yes     | Bare partition column vs a constant literal. |
| `WHERE datehour = '2025-03-30 12:00:00'`             | Yes     | Constant expression on the partition column. **[documented, BigQuery]** |
| `WHERE ts + INTERVAL 1 DAY > CURRENT_TIMESTAMP()`    | **No**  | Arithmetic on the partition column, so BigQuery scans all partitions. **[documented]** |
| `WHERE FORMAT_DATE('%Y-%m-%d %H', ts) = '2025-03-28 20'` | **No** | Wraps the column in a non-pruning function. **[documented]** |
| `WHERE dt = (SELECT max(dt) FROM other)`             | Usually No | Dynamic/subquery value, not a constant at plan time. **[documented]** |
| `WHERE dt = t2.load_dt` (from a join)                | Often No | Athena has no dynamic partition pruning from join keys. **[documented, Athena]** |

Athena's own limitation, verbatim in spirit: pruning "works when partition filters are
applied directly and explicitly in the `WHERE` clause"; if the partition column is "wrapped
in a function, compared to another column, or derived from a subquery," Athena typically
cannot prune. **[documented, AWS re:Post / Athena guidance]**

> **Version-dependent nuance (flag this).** BigQuery *does* prune some function-wrapped
> filters if the function is a **supported built-in**, e.g. `WHERE DATE(datehour) =
> '2025-03-30'` still prunes. So "never put a function on the partition column" is too
> strong for BigQuery specifically. The **safe, portable beginner rule that is always
> correct**: filter the bare partition column against a constant literal. That prunes on
> Athena, Hive, Presto/Trino, Spark, Snowflake, and BigQuery alike.

---

## 7. Modern hidden partitioning (Apache Iceberg) - forward-looking mention

Apache Iceberg introduces **hidden partitioning**: you declare a **transform** on a real
column, and Iceberg derives the partition value itself. You never hand-manage a separate
`dt=` column, and queries never need an extra partition filter. **[documented]**

Transforms include `years()`, `months()`, `days()`, `hours()` (temporal), `bucket(N, col)`
(Murmur3 hash, for high cardinality), `truncate(width, col)`, and `identity`. **[documented]**

```sql
CREATE TABLE logs (
  level string,
  message string,
  event_time timestamp
)
USING iceberg
PARTITIONED BY (days(event_time));      -- transform, not a hand-built dt column
```

```sql
-- No partition filter needed. Iceberg turns the event_time predicate into pruning.
SELECT level, message
FROM logs
WHERE event_time BETWEEN '2024-03-01 10:00:00' AND '2024-03-01 12:00:00';
```

What this fixes versus Hive-style partitioning **[documented]**:

- No manually computed `dt` value to insert (Hive lets you write the wrong value silently).
- No redundant `WHERE dt = ... AND event_time = ...`; forgetting the extra partition filter
  in Hive quietly triggers a full scan.

**Partition evolution:** Iceberg can change the partition spec (e.g. `months(order_date)`
to `days(order_date)`) as a **metadata-only operation that does not rewrite existing data**.
Old files keep their old spec, new files use the new spec, and both remain queryable through
the same table. This is the answer to "how do you re-partition a 10 TB table without a full
rewrite." **[documented]**

---

## 8. Athena partition projection (brief)

Partition projection is an Athena feature that **computes partitions from a formula/config**
instead of looking them up per-partition in the catalog.

AWS, verbatim:

> "In partition projection, Athena calculates partition values and locations using the table
> properties that you configure directly on your table in AWS Glue. ... Because in-memory
> operations are often faster than remote operations, partition projection can reduce the
> runtime of queries against highly partitioned tables." **[documented]**

Why it helps, verbatim:

> "Partition projection allows Athena to avoid calling `GetPartitions` because the partition
> projection configuration gives Athena all of the necessary information to build the
> partitions itself." **[documented]**

- You declare projection **types** per column: `integer`, `date`, `enum`, and `injected`
  (used when values are high-cardinality or unknown ahead of time and are supplied by the
  query). **[documented]**
- Default path template Athena builds:
  `s3://bucket/<table-root>/col1=<val1>/col2=<val2>/`. **[documented]**
- Caveat to flag: projection **speeds planning, it does not reduce bytes scanned**; pruning
  still does the byte-saving. Also, if **more than half** your projected partitions are
  empty, AWS recommends traditional partitions instead, and projection is an **Athena-only**
  (DML) feature. **[documented]**

---

## Common learner misconceptions

1. **"More partitions = always faster."** The most common wrong belief. Past a point, more
   partitions means more, smaller files, which means per-file open overhead, catalog
   metadata overhead, slower planning, and S3 throttling. AWS: "Over-partitioning leads to
   greater quantity of smaller files, which hurts performance." **[documented]**
2. **"The partition column is stored in every row."** No. In Hive-style layout the value is
   encoded in the **directory name** and read from the path, not stored per row.
3. **"Any `WHERE` on the partition column prunes."** No. Wrapping it in a function, comparing
   it to another column, or feeding it a subquery/join value usually defeats pruning and
   triggers a full scan (with the BigQuery supported-built-in nuance in Section 6).
4. **"Partition by `user_id` so per-user lookups are fast."** This is the classic
   small-files trap: millions of directories/files. Use **bucketing or clustering** on
   high-cardinality columns instead.
5. **"Partitioning any column helps."** Only the column(s) you actually filter on help.
   Partitioning a never-filtered column is pure overhead.
6. **"Bucketing makes directories like partitioning."** No. Bucketing writes a **fixed
   number** of files by hash, so it never explodes the directory count.
7. **"Partition projection makes queries scan less data."** No. It removes the `GetPartitions`
   catalog round-trip and speeds **planning**; the **bytes scanned** are still governed by
   pruning.

---

## Interview angles

- **"Why would you partition this table?"** Because nearly every query filters by date, so a
  `dt` partition turns each query into "read one day's directory": far fewer bytes scanned,
  which is faster and (on Athena/BigQuery) directly cheaper. Bonus: you can drop or expire a
  whole day/month as one metadata op, and you avoid hammering a single S3 prefix.
- **"You have millions of tiny files. What happened, and how do you fix it?"** Someone
  partitioned on a high-cardinality key (or the pipeline writes many small files per run).
  Each file carries open/metadata overhead, the catalog balloons, planning dominates
  runtime, and S3 starts throttling. Fix: partition **coarser** (day or month), move the
  high-cardinality column to **bucketing/clustering**, and **compact** existing files
  (`OPTIMIZE` / CTAS rewrite) toward roughly 128 MB to 1 GB each.
- **"Partition vs bucket, when do you use which?"** Partition on a **low-cardinality filter**
  column (usually date) so the engine prunes whole directories. Bucket/cluster on a
  **high-cardinality join or lookup** column so co-located hashing gives join locality and
  shuffle-free joins, without exploding directories.
- **"Your query has `WHERE dt = ...` but still scans the whole table. Why?"** The predicate
  is not sargable: the partition column is wrapped in a function, compared to another column,
  or set from a subquery/join, so the planner cannot prune. Rewrite it as the bare column
  against a constant literal.
- **"Choose a partition key for a clickstream events table."** Event **date** at day grain
  (`day(event_time)` in Iceberg terms), optionally plus one low-cardinality dimension like
  region or event_type. Never `user_id` or `session_id`.
- **"Re-partition a 10 TB table without rewriting it?"** Use Apache Iceberg **partition
  evolution**: change the spec as a metadata-only change; old data keeps its layout, new data
  uses the new one, both stay queryable.

---

## Sources

Vendor / Apache primary docs (verified in this research):

- AWS Athena, Partition your data:
  https://docs.aws.amazon.com/athena/latest/ug/partitions.html
- AWS Athena, Use partition projection:
  https://docs.aws.amazon.com/athena/latest/ug/partition-projection.html
- AWS Big Data Blog, Top 10 Performance Tuning Tips for Amazon Athena (file size, small
  files, over-partitioning): https://aws.amazon.com/blogs/big-data/top-10-performance-tuning-tips-for-amazon-athena/
- AWS Athena pricing ($5/TB scanned): https://aws.amazon.com/athena/pricing/
- Google BigQuery, Introduction to partitioned tables:
  https://docs.cloud.google.com/bigquery/docs/partitioned-tables
- Google BigQuery, Query partitioned tables (constant-expression pruning, full-scan
  predicates): https://docs.cloud.google.com/bigquery/docs/querying-partitioned-tables
- Google BigQuery, Introduction to clustered tables (block pruning, 4-column limit):
  https://docs.cloud.google.com/bigquery/docs/clustered-tables
- Snowflake, Micro-partitions & Data Clustering (50-500 MB micro-partitions):
  https://docs.snowflake.com/en/user-guide/tables-clustering-micropartitions
- Snowflake, Clustering Keys & Clustered Tables (cardinality, Automatic Clustering):
  https://docs.snowflake.com/en/user-guide/tables-clustering-keys
- Apache Spark, Data Sources - Load/Save (bucketBy, partitionBy, persistent tables):
  https://spark.apache.org/docs/latest/sql-data-sources-load-save-functions.html
- Apache Iceberg, Partitioning (hidden partitioning, transforms):
  https://iceberg.apache.org/docs/latest/partitioning/

Reputable secondary sources (cross-checks; not the source of any number tagged
[documented]):

- AWS re:Post, why a partitioned table full-scans on join keys:
  https://repost.aws/questions/QUQcq6hh50Qhe6xsZlxqeJxA/why-is-my-athena-query-doing-a-full-scan-on-a-partitioned-table-with-joins-on-the-partition-keys
- Dremio, Iceberg partition evolution:
  https://www.dremio.com/blog/apache-iceberg-partition-evolution-change-your-partitioning-strategy-without-rewriting-data/
- Delta Lake, small-file compaction with OPTIMIZE:
  https://delta.io/blog/2023-01-25-delta-lake-small-file-compaction-optimize/
- SwirlAI, Partitioning and Bucketing in Spark (shuffle-free bucket joins):
  https://www.newsletter.swirlai.com/p/sai-26-partitioning-and-bucketing
