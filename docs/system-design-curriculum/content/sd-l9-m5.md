> Module **sd-l9-m5** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l9-m4](./sd-l9-m4.md) · Next: [sd-l10-m1](./sd-l10-m1.md)

# L9 · Data-Intensive & Analytics

After this module you can design the analytics side of a product without hurting the transactional side: split OLTP from OLAP and isolate them, place a warehouse, lake, or lakehouse for a given BI and ML workload, wire OLTP changes into analytics with open table formats and log-based CDC instead of fragile dual writes, and choose batch, streaming, or a unified Kappa pipeline that serves both a real-time signal and a nightly report from one event source.

### sd-l9-oltp-vs-olap: OLTP vs OLAP Fundamentals

- **id:** `sd-l9-oltp-vs-olap`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** oltp, olap, columnar

#### Learn

Every data-intensive system eventually splits into two workloads that want opposite things from a database, and confusing them is how you take down checkout with a dashboard.

**OLTP (Online Transaction Processing)** is your product's operational database: place an order, update a balance, mark a message read. The access pattern is many small, high-concurrency transactions, each touching a few rows by primary key or a narrow index. You want low write latency (single-digit ms), strong isolation, and thousands of concurrent connections. The physical layout that serves this is a **row store**: a row's columns are stored contiguously, so fetching or updating one whole record is one disk/page read. Postgres, MySQL, and DynamoDB are OLTP engines. The schema is **normalized** to avoid update anomalies.

**OLAP (Online Analytical Processing)** is your analytics engine: revenue by region by day, funnel conversion, cohort retention. The access pattern is a few huge queries that scan millions to billions of rows but touch only a handful of columns, aggregating as they go. The layout that serves this is a **column store**: each column is stored contiguously, so a `SUM(revenue) GROUP BY region` reads only the `revenue` and `region` columns off disk and skips the other 40. Because a column holds one data type with low cardinality, columnar data compresses 5x to 20x (run-length, dictionary, delta encoding), which means less I/O, and engines run **vectorized execution** (process a batch of column values per CPU instruction) instead of row-at-a-time. Snowflake, BigQuery, ClickHouse, and Redshift are OLAP engines, usually fed a **denormalized star schema** (fact table plus dimension tables) so a query joins less.

```
  row store (OLTP)                 column store (OLAP)
  [id|name|region|rev] [id|...]    [id,id,id,...] [region,region,...] [rev,rev,...]
  read one row = 1 page            SUM(rev) reads only the rev column, compressed
```

**Why you never run heavy analytics on the OLTP primary:** a single `GROUP BY` scan over the orders table evicts your hot rows from the buffer pool, holds read locks or MVCC snapshots that bloat, saturates I/O, and burns the connection your checkout path needed. The analytical query might run for 30 seconds; during those 30 seconds your p99 checkout latency triples. Isolation is not optional, it is the whole point.

**How data moves OLTP to OLAP.** Three patterns. **ETL** (extract, transform, then load) transforms before loading, classic for warehouses. **ELT** (load raw, transform in the warehouse) is now dominant because warehouse compute is cheap and elastic. **CDC/streaming** tails the OLTP write-ahead log and streams changes continuously. The axis is freshness vs simplicity: a nightly batch load is simple and fine for finance reporting; a real-time dashboard needs CDC or streaming and more moving parts.

**Interview nuance:** a read replica is not an analytics store. A Postgres replica is still a row store with OLTP layout; pointing dashboards at it isolates the primary from lock contention but still runs column-scan queries on a row engine, which is slow and steals replica resources. Use a replica for read scaling of OLTP-shaped queries, and a real column store for analytics.

Recap: OLTP is row-store, normalized, small high-concurrency transactions (Postgres/DynamoDB); OLAP is column-store, denormalized star schema, huge scans with compression and vectorized execution (Snowflake/BigQuery/ClickHouse); never analyze on the OLTP primary because scans destroy transactional latency; move data via ETL, ELT, or CDC trading freshness for simplicity.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the data layer for an app that needs fast order writes AND real-time revenue dashboards without the dashboards slowing checkout.

**Think about:**
- Why never run heavy analytics on the primary OLTP DB?
- How do row-store and column-store physical layouts differ?
- How does data move OLTP -> OLAP?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an e-commerce app writing ~2k orders/sec at peak, and a finance/ops team wanting revenue-by-region-by-minute dashboards that refresh within a minute or two. Checkout p99 must stay under 200ms.

I use two stores with a pipeline between them. The **OLTP tier** is Postgres (or a sharded equivalent): row store, normalized `orders`, `line_items`, `payments`, indexed by order id and customer id, tuned for fast single-row writes and strong isolation. All checkout traffic hits only this tier, so nothing analytical shares its buffer pool or connections.

The **OLAP tier** is a column store, Snowflake or BigQuery for managed BI, or ClickHouse if I want second-fresh dashboards on my own infra. It holds a denormalized star schema: a `fact_orders` table plus `dim_product`, `dim_region`, `dim_time`. Column layout plus compression means `SUM(revenue) GROUP BY region, minute` scans two columns, not the whole row, and returns fast even over billions of rows.

For the "real-time" requirement I move data with **log-based CDC**: Debezium tails the Postgres WAL and publishes order inserts/updates to Kafka, and a sink writes them into the column store continuously. This gives near-real-time freshness with negligible load on the primary (reading the WAL is cheap and does not lock tables). If the dashboards could tolerate hourly freshness I would instead run a simpler ELT batch load and skip the streaming machinery.

The key tradeoff is freshness vs operational complexity: CDC buys sub-minute dashboards at the cost of running Kafka and a connector. The common wrong turn is pointing the dashboard at the OLTP primary (or even a read replica): a single revenue scan evicts hot rows, holds MVCC snapshots, and spikes checkout latency, and a row-store replica is still slow at column aggregations anyway. Two engines, each matched to its workload, connected by CDC, is the design.

**Self-check rubric:**
- [ ] Uses separate OLTP (row store) and OLAP (column store) engines, not one DB
- [ ] Explains isolation: analytics never touches the checkout path's resources
- [ ] Names concrete engines (Postgres + Snowflake/BigQuery/ClickHouse) and a star schema
- [ ] Chooses a movement mechanism (CDC/ELT) matched to the freshness requirement
- [ ] Rejects "just use a read replica" for column-aggregation analytics
- [ ] States the freshness vs complexity tradeoff explicitly

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the analytics data layer for Shopify-scale commerce: hundreds of thousands of merchants, millions of orders/hour across a sharded MySQL fleet, where each merchant wants a near-real-time sales dashboard and the platform team wants cross-merchant fraud and GMV analytics. Lead with how you get analytics off the transactional shards without touching merchant checkout latency.

**Model answer (revealed on demand):**

Assumptions: transactional data lives on a horizontally sharded MySQL fleet (thousands of shards, merchants hashed across them), checkout latency is sacred, and there are two consumers: per-merchant dashboards (tenant-scoped, near-real-time) and platform-wide analytics (cross-shard, can tolerate minutes).

I never query the shards for analytics. Each MySQL shard runs **binlog-based CDC** (Debezium or a Maxwell-style tailer) publishing row changes into Kafka, partitioned by merchant id so a merchant's events stay ordered. Reading the binlog adds no query load and no locks to the transactional path, which is the whole point at this scale: a cross-shard `GROUP BY` would be impossible to run against the fleet without wrecking checkout.

From Kafka I fan out to two sinks. A **column store** (ClickHouse or BigQuery) ingests the stream into a denormalized `fact_orders` keyed and partitioned by merchant id, so a per-merchant dashboard query prunes to that merchant's partition and returns in tens of ms even under heavy tenants. Platform-wide GMV and fraud queries scan across partitions on the same column store, which is exactly what columnar plus vectorized execution is built for.

The hard parts: **multi-tenancy** (partition/cluster by merchant so one giant merchant does not slow another, and enforce tenant isolation in the query layer), **hot merchants** (a Black-Friday seller floods one Kafka partition, so I may sub-partition by merchant+time), and **exactly-once-ish loading** (idempotent upserts keyed by order id so a CDC replay does not double-count GMV). The tradeoff versus a nightly batch ELT is real-time freshness at the cost of a streaming ingestion pipeline, justified here because merchants expect live sales numbers. The wrong turn is a fan-out query across thousands of shards or an analytics read replica per shard: neither gives cross-merchant analytics and both couple analytics load to the transactional fleet.

### sd-l9-warehouse-lake-lakehouse: Warehouse vs Lake vs Lakehouse

- **id:** `sd-l9-warehouse-lake-lakehouse`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** lakehouse, warehouse, data-lake

#### Learn

These three are not interchangeable buzzwords; they sit at different points on a cost-versus-governance curve, and picking wrong gives you either an expensive warehouse full of data you cannot afford to keep or a cheap lake nobody can query.

**Data warehouse** (Snowflake, BigQuery, Redshift). **Schema-on-write**: data is validated, typed, and modeled into curated tables before it lands. You get strong BI performance, first-class SQL, fine-grained governance, ACID, and reliable joins. The cost is rigidity and price: warehouses are optimized for structured/tabular data, ingesting raw JSON, logs, images, or video is awkward and expensive per TB, and schema changes are work. Great when the workload is dashboards and known reports over clean tabular data.

**Data lake** (files on S3/GCS/ADLS, usually Parquet/ORC/JSON). **Schema-on-read**: dump raw data cheaply now, impose structure at query time. Object storage is roughly 10x to 50x cheaper per TB than warehouse storage and holds any format, which is why ML and log workloads live here. The failure mode is the **data swamp**: with no catalog, no schema enforcement, and no ownership, the lake fills with undocumented files nobody trusts or can find, and every query becomes archaeology. A lake without governance is where data goes to die.

**Lakehouse** (Databricks, or a warehouse engine reading open tables on S3) is the synthesis: **lake economics** (cheap object storage, open formats, any data) **plus warehouse features** (ACID transactions, schema enforcement and evolution, time travel, governance) delivered through an **open table format** (Iceberg, Delta Lake, Hudi) layered over the raw Parquet files. You keep one cheap copy of the data and get warehouse-grade reliability on it. That is the pitch, and it is why the industry converged here for combined BI plus ML.

**The medallion (bronze/silver/gold) pattern** is how you keep a lake or lakehouse from becoming a swamp by making refinement explicit:

```
  bronze  raw, append-only, exactly as ingested (audit + replay source)
  silver  cleaned, deduped, conformed, joined; schema enforced
  gold    business-level aggregates / marts, serving BI and ML features
```

Each layer has an owner and a contract; downstream consumers read gold, data engineers own the promotion between layers. This is governance you can actually enforce.

**Separation of storage and compute** is the enabler underneath all of this. In old Redshift/on-prem warehouses, storage and compute were coupled on the same nodes, so to store more you paid for more compute and vice versa, and one workload starved another. In the lake/lakehouse (and modern Snowflake/BigQuery) storage is object storage and compute is separate, elastic clusters. That means you scale them independently (cheap to store 50TB, spin up compute only when querying), run **multiple engines on one copy** (Spark for ML, Trino for interactive SQL, Flink for streaming, all reading the same Iceberg tables), and give each team its own compute so they do not contend.

**Interview nuance:** "lakehouse" without a catalog and table format is just a lake with good intentions. The ACID, schema evolution, and time travel come specifically from the table format plus a catalog, not from putting Parquet on S3. If someone says "lakehouse" ask what table format and catalog, that is where the substance is.

Recap: warehouse is schema-on-write, curated, strong BI/governance, pricey for raw data; lake is schema-on-read, cheap object storage, risks becoming a swamp; lakehouse gets lake economics plus warehouse features via open table formats and a catalog; use the medallion (bronze/silver/gold) pattern for governed refinement; separating storage and compute lets you scale independently and run many engines on one copy.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose and justify a warehouse vs lakehouse for a company doing BI + ML on 50TB of mixed structured/semi-structured data.

**Think about:**
- What does each architecture optimize, and where does the lake become a swamp?
- What is the medallion (bronze/silver/gold) pattern?
- How does separating storage and compute help?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 50TB spanning clean transactional tables, semi-structured event JSON, and clickstream/logs; two consumer groups, BI analysts who want fast SQL dashboards and ML engineers who want raw and semi-structured data for feature engineering and training.

I choose a **lakehouse**, because the workload is explicitly BI plus ML on mixed data, and that is the exact seam a pure warehouse or pure lake handles badly. A warehouse would serve the BI half well but make the ML/raw half expensive and awkward (loading and storing raw JSON, logs, and future images in warehouse storage is costly, and ML wants file access to raw data). A pure lake would serve ML but leave BI without ACID, schema enforcement, or reliable governance, and at 50TB with many producers it drifts into a swamp fast.

Concretely: raw data lands in object storage (S3) as **Iceberg** or **Delta** tables, giving me ACID, schema evolution, and time travel over the cheap files. I organize with the **medallion pattern**: bronze holds raw append-only ingestion (also my replay/audit source), silver holds cleaned, deduplicated, conformed tables with enforced schema, and gold holds business aggregates and ML feature tables. Ownership and contracts at each layer are what keep the lake from becoming a swamp.

**Separation of storage and compute** is what makes this economical and multi-tenant: one 50TB copy on S3, with independent elastic compute per workload. BI analysts run Trino or Snowflake against gold tables, ML engineers run Spark against silver/bronze for training, and neither contends with the other because they bring their own compute to the same Iceberg tables. I scale storage and compute separately, so idle 50TB is cheap and I only pay compute when queries run.

Key tradeoff: the lakehouse adds operational surface (table format, catalog like Iceberg REST or Unity, compaction of small files) versus a turnkey warehouse. That is justified here by the ML requirement and the storage cost of 50TB of raw data. The wrong turn is a bare lake with no catalog or schema, which becomes an untrusted swamp, or a warehouse-only stack that prices out the raw/ML data.

**Self-check rubric:**
- [ ] Picks one architecture and justifies it from the BI+ML+mixed-data requirement
- [ ] Explains what warehouse vs lake each optimize and their failure modes
- [ ] Names an open table format and a catalog as the source of ACID/schema/time travel
- [ ] Applies the medallion (bronze/silver/gold) pattern with ownership
- [ ] Uses storage/compute separation for independent scaling and multi-engine access
- [ ] States the added operational cost as the tradeoff

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the platform data architecture for a Netflix-scale streaming service: petabytes of playback events, device logs, and A/B experiment data, consumed by analysts (SQL dashboards), data scientists (recommendation model training in Spark), and near-real-time experiment analysis. Lead with the architecture choice and how you prevent a petabyte-scale swamp.

**Model answer (revealed on demand):**

Assumptions: multiple petabytes growing daily, hundreds of internal consumers, workloads spanning interactive SQL, large-scale Spark training, and near-real-time experiment readouts, with strong pressure on storage cost at PB scale.

I run a **lakehouse on object storage**, because at petabyte scale warehouse storage pricing is prohibitive and the consumers are heterogeneous (SQL, Spark ML, streaming). Raw events land in S3 as **Iceberg** tables through a catalog (Iceberg REST / a Unity-style governance layer) so every engine sees one governed copy with ACID, schema evolution, and time travel.

Preventing a PB swamp is the core of the answer and it is process plus tooling, not just storage. I enforce the **medallion pattern** with hard contracts: bronze is raw append-only playback/device/experiment events (also the replay source), silver is cleaned, sessionized, deduplicated and schema-enforced, gold is curated marts and ML feature tables. Every table has an owner, a schema registered in the catalog, data-quality checks at promotion (row counts, null/enum constraints, freshness SLAs), and lineage so a consumer can trust and trace a number. A data catalog with discovery and documentation is mandatory at this scale, undocumented tables are how a swamp starts.

**Separation of storage and compute** is what makes hundreds of consumers coexist: one Iceberg copy, isolated elastic compute per team (Trino/Presto for interactive SQL, Spark clusters for recommendation training, Flink for near-real-time experiment aggregation reading the same tables). Teams cannot starve each other because they do not share compute. For near-real-time experiments I stream events into Iceberg via Flink so experiment dashboards read minutes-fresh data from the same lakehouse rather than a separate stack.

Tradeoffs: I invest heavily in catalog, governance, compaction of small streaming files, and metadata management, which is real operational cost, but at petabytes the alternative (a warehouse) is unaffordable and a bare lake is untrustworthy. The wrong turn is skipping the catalog and quality gates and letting every team write ad hoc files.

### sd-l9-table-formats-cdc: Open Table Formats & CDC

- **id:** `sd-l9-table-formats-cdc`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** iceberg, cdc, table-formats

#### Learn

This lesson is the plumbing that makes the lakehouse real: the table format that turns files into a database, and the CDC pattern that streams your OLTP changes in without corrupting them.

**Why raw Parquet is not enough.** Parquet is a great columnar file format, but a directory of Parquet files on S3 is not a table. There is no atomicity (a reader can see a half-written batch), no schema evolution (rename a column and every reader breaks), no way to safely delete or update rows for GDPR, and no consistent view under concurrent writers. **Open table formats** (Apache Iceberg, Delta Lake, Apache Hudi, Apache Paimon) add a metadata layer over the Parquet files that provides:

- **ACID transactions** via an atomic swap of a metadata/manifest pointer, so writers commit all-or-nothing and readers always see a consistent snapshot.
- **Schema and partition evolution** without rewriting data: add/rename/drop columns, and change partitioning, tracked in metadata.
- **Time travel**: query the table as of a past snapshot or timestamp (`... FOR SYSTEM_TIME AS OF ...`), for audits, reproducible ML training, and rollback.
- **Hidden partitioning** (Iceberg): you partition by a derived value (day of `event_ts`) and queries prune automatically, so users never write brittle partition predicates by hand.

**Which format when.** **Iceberg** is the open standard with the broadest engine support (Spark, Trino, Flink, Snowflake, BigQuery), the right default for a multi-engine lakehouse. **Delta Lake** is Spark/Databricks-native and excellent inside that ecosystem. **Hudi** was built for CDC and record-level upserts/deletes with primary keys, strong when your workload is heavy mutation. **Paimon** targets unified streaming plus batch with a Flink lineage. A **catalog** (Iceberg REST catalog, Polaris, AWS Glue, Databricks Unity) holds the table metadata and enables governance and cross-engine access; the catalog is what lets Spark and Trino agree on what a table is.

**CDC: getting OLTP changes into all this.** You want every insert/update/delete in Postgres to flow to analytics and a search index in near-real-time. The right mechanism is **log-based CDC**: **Debezium** reads the database's replication log (Postgres WAL, MySQL binlog) and emits a change event per row mutation. Log-based beats the alternatives: query-based polling (`WHERE updated_at > x`) misses deletes and hard-hits the DB, and trigger-based CDC adds write-path latency. Reading the log is low impact and captures every change including deletes, in commit order.

**The dual-write problem and the outbox.** The trap: your service writes to Postgres and then also writes to Kafka (or directly to the search index). These are two systems with no shared transaction, so a crash between them leaves you inconsistent forever: the order is in the DB but the event never published, or published but the DB rolled back. You cannot fix this with retries because you do not know which write succeeded.

The fix is the **transactional outbox**: within the same DB transaction that writes the order, insert a row into an `outbox` table. The business write and the event are now atomic (one transaction). CDC then tails the WAL, sees the outbox insert, and publishes it to Kafka. There is exactly one source of truth (the DB log) and no distributed transaction.

```
  service --tx--> [orders row + outbox row]  (one Postgres commit)
                          |
                   Debezium reads WAL
                          v
                        Kafka --> search index (Elasticsearch)
                              --> lakehouse sink (Iceberg via Flink)
```

Because delivery is **at-least-once** (a connector can replay after a crash), downstream consumers must be **idempotent**: upsert by primary key into the search index and the Iceberg table so a redelivered event does not duplicate. Iceberg/Hudi upserts (merge-on-read or copy-on-write) handle this on the lake side.

**Interview nuance:** the outbox does not give you exactly-once end-to-end, it gives you at-least-once with an atomic source write, and you achieve effective exactly-once by making consumers idempotent. Claiming true exactly-once across DB, Kafka, and a search index without idempotency is the tell of someone who has not run this in production.

Recap: table formats (Iceberg/Delta/Hudi/Paimon) add ACID, schema/partition evolution, time travel, and hidden partitioning over Parquet, coordinated by a catalog; pick Iceberg for multi-engine, Hudi for upsert-heavy CDC; use log-based CDC (Debezium on the WAL/binlog) plus a transactional outbox to avoid the dual-write problem; delivery is at-least-once so make consumers idempotent for effective exactly-once.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Pick an open table format for a multi-engine lakehouse (Spark + Trino + Flink) and design real-time replication of order changes from Postgres into a search index and the lakehouse without dual-write inconsistency.

**Think about:**
- What do table formats add over raw Parquet?
- Which format fits multi-engine vs CDC-heavy vs streaming?
- How does log-based CDC + outbox avoid the dual-write problem?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: Postgres is the OLTP source for orders; consumers are an Elasticsearch search index (near-real-time) and an analytics lakehouse queried by Spark (ML), Trino (interactive SQL), and Flink (streaming). Correctness matters: no lost or duplicated orders.

**Table format: Iceberg**, because the requirement is explicitly multi-engine (Spark + Trino + Flink) and Iceberg has the broadest cross-engine support and is the open standard, coordinated by an Iceberg REST catalog (or Glue/Unity) so all three engines agree on table metadata. Over raw Parquet, Iceberg gives me ACID snapshots (no reader sees a half-written commit), schema and partition evolution as the order schema changes, time travel for reproducible ML training and audits, and hidden partitioning by order day so queries prune automatically. (If the workload were mutation-heavy with constant upserts I would weigh Hudi, but for multi-engine breadth Iceberg wins.)

**Replication without dual-write:** I never have the order service write to both Postgres and Kafka. Instead, in the same transaction that writes the `orders` row, the service inserts into an **outbox** table, so the business record and the change event commit atomically. **Debezium** then tails the Postgres **WAL** and publishes outbox events to **Kafka**, partitioned by order id to preserve per-order ordering. From Kafka, two sinks consume: a connector upserts into Elasticsearch, and a Flink job writes into the Iceberg table.

Because CDC delivery is **at-least-once** (connectors replay after failures), both sinks must be **idempotent**: upsert by order id into Elasticsearch and merge-on-key into Iceberg, so a replayed event overwrites rather than duplicates. This yields effective exactly-once without any distributed transaction.

Tradeoffs: the outbox adds a table and a bit of write overhead, and CDC adds Debezium plus Kafka to operate, but this is the correct price for consistency. The common wrong turn is dual-writing to the DB and the search index (or Kafka) directly: with no shared transaction, a crash between the two writes leaves the systems permanently inconsistent, and retries cannot fix it because you do not know which write landed.

**Self-check rubric:**
- [ ] Picks Iceberg and justifies it from the multi-engine requirement
- [ ] Lists what a table format adds over Parquet (ACID, schema/partition evolution, time travel)
- [ ] Uses log-based CDC (Debezium on the WAL), not polling or triggers
- [ ] Uses a transactional outbox to make the business write and event atomic
- [ ] Makes consumers idempotent because delivery is at-least-once
- [ ] Explicitly rejects dual-writing and explains why retries cannot fix it

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design change propagation for an Airbnb-scale listings platform: a sharded MySQL fleet holds listings and availability, and changes must reach an Elasticsearch search index, a pricing/ML feature store, and an Iceberg lakehouse within seconds, with strict no-lost-updates and no-duplicates guarantees. Lead with how you capture changes at fleet scale and keep three consumers consistent.

**Model answer (revealed on demand):**

Assumptions: thousands of MySQL shards (listings sharded by listing id), high write rate on availability/price, three downstream consumers with a seconds-level freshness SLA, and hard correctness requirements (a lost price update or a duplicate listing is a real business bug).

**Capture:** log-based CDC per shard. **Debezium** (or a Maxwell-style tailer) reads each shard's **binlog** and publishes to **Kafka**, keyed by listing id so all changes to one listing land on the same partition in commit order. Binlog CDC is the only option at this scale: query-polling would hammer thousands of shards and miss deletes, triggers would tax the write path. Where a change spans the DB and an event (for example a listing-published event that must be atomic with the row write), the service uses a **transactional outbox** in the shard so the row and the event commit together.

**Fan-out to three consumers, each idempotent.** From the per-listing Kafka topic, three independent consumer groups read the same ordered stream: one upserts into **Elasticsearch** (by listing id), one writes features into the **feature store** (upsert by key), one uses **Flink** to merge into **Iceberg** (or Hudi if upsert throughput dominates, since Hudi is built for record-level upserts). Ordering per listing is preserved by the partition key, so a price change followed by a delete are applied in order.

**Correctness:** delivery is at-least-once, so every consumer is idempotent (upsert/merge by listing id, and use the binlog offset or a version/sequence column to ignore stale out-of-order retries). This gives effective exactly-once across all three sinks without a distributed transaction. For lost-update protection, the source of truth is the binlog itself, which records every committed mutation, so nothing is dropped as long as connectors track offsets durably.

Tradeoffs: per-shard Debezium plus Kafka is significant operational surface, and I must handle schema changes across the fleet (Iceberg/ES schema evolution) and hot listings (a viral listing floods one partition, mitigated by careful keying). The wrong turn is any consumer dual-writing from the app, or a non-idempotent sink that duplicates on replay.

### sd-l9-batch-streaming: Batch vs Streaming: Lambda vs Kappa

- **id:** `sd-l9-batch-streaming`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** batch, streaming, lambda-kappa

#### Learn

The last piece is how data is processed over time, and the central interview question is whether you need two processing paths or one. Getting this right saves you from maintaining two codebases that slowly disagree.

**Batch vs streaming** is a throughput-versus-latency tradeoff. **Batch** processes a bounded chunk (yesterday's events) on a schedule: high throughput, simple correctness (you have all the data before you compute), high latency (results are hours old). Spark and classic MapReduce are batch engines. **Streaming** processes an unbounded flow event by event: low latency (seconds), continuous, but correctness is harder because data arrives late, out of order, and you must decide when a window is "done." Flink and Spark Structured Streaming are streaming engines, fed by a durable log (Kafka, Pulsar).

**Lambda architecture** was the first mainstream answer to "I need both fast and correct." It runs **two parallel layers**: a **batch layer** that reprocesses all history nightly to produce accurate, complete results, and a **speed layer** that processes the live stream for low-latency approximate results, with a serving layer merging the two so recent data comes from the speed layer and older data from the batch layer. It works, and it gives you a self-correcting system (the batch layer eventually overwrites any speed-layer approximation). The cost is brutal: you implement the **same business logic twice**, once in a batch engine and once in a streaming engine, in different code, and they drift. Every metric change is two implementations to keep in sync, and reconciling their outputs is a permanent tax.

**Kappa architecture** is the reaction: delete the batch layer. There is **one streaming path**, and the durable log (Kafka) is the system of record with long retention. If you need to recompute history (bug fix, new metric), you **replay the log** from the beginning through the same streaming code. One codebase, one set of logic, no drift. Kappa is the default for new systems when the streaming engine can express your logic and the log retention is affordable.

```
  Lambda                          Kappa
  events -> batch layer  \        events -> Kafka (retained) -> stream job -> serving
         -> speed layer  -> serve                   ^                |
  (two codebases, merged)                            +-- replay to recompute
```

**Event-time vs processing-time and watermarks** is the concept that makes streaming correct, and a favorite probe. **Processing-time** is when your job sees an event; **event-time** is when it actually happened. A phone offline in a tunnel sends events with an event-time from 10 minutes ago. If you window by processing-time you put those events in the wrong bucket and your per-minute counts are wrong. So you window by **event-time**, and a **watermark** is the engine's assertion "I believe I have now seen all events up to time T," which lets it close the window for T and emit results. Late events arriving after the watermark are handled by policy: drop them, or emit an updated result (allowed lateness). Watermarks are the explicit tradeoff between latency (advance aggressively, emit fast, risk dropping late data) and completeness (wait longer, more correct, higher latency).

**Delivery semantics.** **At-least-once** can double-count; **exactly-once** requires the engine to coordinate checkpoints with idempotent/transactional sinks. Flink provides exactly-once via distributed checkpointing (Chandy-Lamport) plus two-phase-commit sinks. For a fraud counter or a financial total this matters; for a rough traffic dashboard at-least-once is fine.

**How streaming-into-lakehouse collapses the two paths.** The modern move that makes Kappa practical for reporting too: **Flink writes the stream directly into Iceberg** tables (exactly-once). Now the live stream powers the real-time signal, and the same Iceberg tables it lands in are queried by batch SQL (Trino, Spark) for nightly reports. One pipeline feeds both the real-time consumer and the reporting consumer, so you no longer maintain a separate batch path at all.

**Interview nuance:** do not reflexively say "Lambda" because you need both real-time and batch outputs. State the condition: Lambda is justified only when the batch engine can express something the stream cannot, or when you need a periodic full-reprocessing guarantee the stream cannot give cheaply. Otherwise Kappa plus log replay plus streaming-into-lakehouse gives you both outputs from one codebase, and that is the stronger default answer.

Recap: batch is high-throughput/high-latency and simple, streaming is low-latency/continuous and correctness-hard; Lambda runs parallel batch and speed layers (accurate but two codebases that drift), Kappa runs one streaming path and replays the retained log to recompute; window by event-time with watermarks to handle late/out-of-order data trading latency for completeness; choose exactly-once where counts must be exact; and Flink-into-Iceberg collapses real-time and reporting into one pipeline.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a pipeline that serves both a real-time fraud signal and a nightly financial report from the same event source.

**Think about:**
- What does Lambda architecture add over Kappa, and at what complexity?
- How do watermarks and event-time handle late data?
- How does streaming-into-lakehouse collapse the two paths?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: one event source, payment/transaction events at high volume. Two consumers with opposite needs: a fraud signal that must fire within seconds, and a nightly financial report that must be exactly correct and complete (auditable).

I use a **Kappa-style single pipeline**, not Lambda, because I do not need two divergent codebases. All events land in **Kafka** with long retention (the log is my system of record and my replay source). A **Flink** job consumes the stream and does two things from one codebase.

For the **real-time fraud signal**, Flink computes per-account features and rules over short event-time windows (velocity of charges, geo-impossibility) and emits alerts within seconds. Here I favor low latency: aggressive watermarks so windows close fast, accepting that a late event might update a score afterward. Approximate-but-fast is the right call for a fraud signal.

For the **nightly financial report**, correctness is non-negotiable, so the same Flink job writes the enriched, exactly-once stream into **Iceberg** tables (Flink's checkpointing plus transactional sink give exactly-once). The nightly report is then a batch SQL query (Trino/Spark) over those Iceberg tables. This is the streaming-into-lakehouse move that **collapses the two paths**: the live stream drives fraud, and the very tables it lands in serve the batch report, so there is no separate batch pipeline reimplementing the same logic.

**Event-time and watermarks** are how I keep the report correct despite late/out-of-order payments: I window by event-time (when the transaction occurred, not when Flink saw it), and watermarks with a bounded allowed-lateness let late events correct their window before the day is finalized. The financial report reads finalized, watermark-closed data so it is complete and reproducible (and time travel on Iceberg makes it auditable).

Tradeoff: exactly-once and event-time processing add checkpointing and watermark tuning, but that is required for an auditable financial number. The **common wrong turn** is Lambda: standing up a separate nightly batch job that recomputes the same aggregations in different code, which drifts from the streaming logic and doubles maintenance. Kappa plus Flink-into-Iceberg serves both consumers from one implementation.

**Self-check rubric:**
- [ ] Uses one pipeline (Kappa) and justifies rejecting Lambda's two codebases
- [ ] Kafka with retention as system-of-record and replay source
- [ ] Serves the fast signal with low-latency windows and the report with exactly-once + batch SQL
- [ ] Uses event-time + watermarks to handle late/out-of-order data
- [ ] Collapses paths via streaming-into-lakehouse (Flink -> Iceberg, then batch query)
- [ ] Names exactly-once for the financial report and the latency/completeness tradeoff

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design Uber-scale trip event processing: a firehose of GPS pings, trip state changes, and payments must power real-time surge pricing (sub-10-second freshness), live driver ETAs, and an exactly-correct daily earnings/settlement report. Lead with whether you run Lambda or Kappa and how you keep late GPS data from corrupting both the surge signal and the settlement numbers.

**Model answer (revealed on demand):**

Assumptions: millions of events/sec (GPS pings dominate), three consumers, real-time surge (seconds), live ETAs (seconds), and a daily earnings/settlement report that must be exactly correct and auditable for driver payouts.

**Kappa, not Lambda.** At this scale maintaining a parallel batch reimplementation of surge and settlement logic would drift and be a permanent reconciliation tax. Events flow into **Kafka** (partitioned by geo cell / trip id for locality and ordering) with long retention as the system of record and replay source. **Flink** is the single processing engine.

**Real-time surge and ETAs** are event-time windowed aggregations over short intervals per geo cell (supply/demand ratios, recent request velocity). I favor low latency here: watermarks advance aggressively so surge updates within seconds, accepting that a late GPS ping may slightly revise a cell's number after the fact. Approximate-but-fresh is correct for a pricing signal, and I can tolerate a minor later correction.

**Late GPS data** is the crux. Phones drop into tunnels and dead zones and send pings with event-times minutes old. I window everything by **event-time**, never processing-time, so a delayed ping is attributed to the minute it actually occurred. **Watermarks** with bounded allowed-lateness let late pings correct their window: for surge, an aggressive watermark and small lateness (speed over completeness), while for settlement I hold windows open longer and only finalize a day after a generous lateness bound so stragglers are counted.

**Exactly-correct settlement:** the same Flink job writes exactly-once (checkpointing + transactional sink) into **Iceberg** trip/earnings tables. The daily settlement report is a batch SQL query over finalized, watermark-closed Iceberg partitions, so it is complete, reproducible, and auditable via time travel. This streaming-into-lakehouse design serves surge, ETAs, and settlement from one codebase.

Tradeoffs: exactly-once plus long watermark lateness for settlement adds latency and checkpoint overhead, justified because driver payouts must be exact. The wrong turn is processing-time windows (which misattribute late pings and corrupt both surge and payouts) or a separate Lambda batch layer duplicating the logic.
