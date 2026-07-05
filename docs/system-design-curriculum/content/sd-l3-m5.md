> Module **sd-l3-m5** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l3-m4](./sd-l3-m4.md) · Next: [sd-l4-m1](./sd-l4-m1.md)

# L3 · Derived Data & Sync

After this module you can deliberately trade write cost and storage for cheap reads by denormalizing, precomputing, and fanning out feeds (including the hybrid that stops celebrity accounts from exploding write cost), and you can keep every derived store (cache, search index, read replica, analytics rollup) from silently drifting out of sync with the primary by replacing fragile dual writes with a transactional outbox and log-based change data capture.

### sd-l3-denorm-fanout: Denormalization, Precomputation & Materialized Views

- **id:** `sd-l3-denorm-fanout`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** fan-out, materialized-views, feed

#### Learn

Normalization optimizes for write correctness: every fact lives in exactly one place, so an update touches one row. That is the wrong default when reads outnumber writes by 100:1 or 1000:1, which is the common web shape. **Denormalization** deliberately duplicates data so the read path does no joins and no aggregation at request time. You pay for that with write amplification (one logical write now fans out to many physical writes) and with the ongoing job of keeping the copies consistent. The trade is almost always worth it when a read is on the hot path and a write is not.

The three concrete tools:

- **Precomputed/materialized views:** instead of running `SELECT count(*) ... GROUP BY` on every dashboard load, maintain a rollup table (`daily_orders_by_region`) that a job or a stream updates. Reads become a single indexed lookup. Postgres materialized views, a Kafka Streams/Flink job writing to a serving table, or a nightly batch all do this. You trade freshness (the view lags the source) and storage for read latency.
- **Approximate structures:** when the answer does not need to be exact, use sketches. **HyperLogLog** counts unique visitors in ~12 KB per counter with ~2% error instead of storing every visitor id. **Count-Min Sketch** gives approximate frequencies for "top trending" in fixed memory. Redis ships both. Exactness is a cost you should only pay when the product needs it.
- **Feed fan-out:** the canonical denormalization problem. A user opens their home timeline and wants the merged, time-sorted posts of everyone they follow, in under ~100 ms.

There are two strategies for that feed:

- **Fan-out-on-write (push):** when Alice posts, you immediately write that post id into the precomputed timeline of every follower (a per-user list, often in Redis). Reads are trivial: read your own list. But a post by someone with 50M followers triggers 50M writes. Write amplification is O(followers).
- **Fan-out-on-read (pull):** store each post once. At read time, query the recent posts of everyone the reader follows and merge-sort them. Writes are O(1), but a read for someone following 5,000 accounts is a large scatter-gather merge on the hot path.

```
 fan-out-on-write            fan-out-on-read
 Alice posts                 Bob opens feed
   |                           |
   +-> write to each of        +-> query recent posts of
       Alice's followers'          each account Bob follows,
       precomputed feed            then merge-sort at read time
 cheap reads, costly writes  cheap writes, costly reads
```

Neither pure form survives real distributions, because follower counts are power-law: most accounts have hundreds of followers, a handful have tens of millions. The production answer is a **hybrid**: fan-out-on-write for normal accounts (cheap, and reads stay a single list lookup), but **do not** push posts from celebrity/whale accounts. Instead, at read time, pull the celebrity posts the reader follows and merge them into the precomputed list. This is exactly what Twitter/X described: the vast majority of a timeline is precomputed, and a small number of high-fan-out accounts are merged in on read.

**Interview nuance:** the disqualifying mistake is proposing pure fan-out-on-write and not noticing that one celebrity post is now 50M writes and a thundering write storm. Say the threshold out loud: accounts above roughly 10k to 1M followers are handled on read; everyone else on write. The second nuance is owning the consistency cost you just created. Denormalized copies (a cached follower count, a duplicated author name on every post) can drift, and now you own an invalidation or reconciliation job.

Recap: denormalize when reads dominate, using materialized/rollup views and approximate sketches to make reads O(1) lookups; for feeds, fan-out-on-write gives cheap reads and fan-out-on-read gives cheap writes, so use a hybrid that precomputes normal-user feeds and merges celebrity posts at read time, and accept that you now own write amplification and copy consistency.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a social timeline/feed, choosing between fan-out-on-write and fan-out-on-read for a mix of normal and celebrity users, and specify where the hybrid boundary sits.

**Think about:**
- When does fan-out-on-write beat fan-out-on-read, and vice versa?
- How does a hybrid handle celebrity accounts?
- What is the write-amplification and consistency cost you now own?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a Twitter/Instagram-shaped home feed. Reads dominate writes heavily (people scroll far more than they post), the feed must load in under ~100 ms at p99, and follower counts follow a power law: the median account has hundreds of followers, the top 0.01% have tens of millions. A slightly stale feed (a post appearing a few seconds late) is acceptable.

High-level design: a **hybrid fan-out**. For normal authors I use **fan-out-on-write**. When they post, a fan-out worker (consuming a Kafka topic of new posts) appends the post id into each follower's precomputed timeline, stored as a capped per-user list in Redis (say the most recent 800 ids). The home-feed read is then a single Redis list read plus a hydration step that fetches post bodies from a post store (Cassandra or DynamoDB) by id, with the bodies themselves cached. Reads are O(1) list lookups, which is what keeps p99 low.

For **celebrity accounts** above a follower threshold (I would set it around 100k to 1M and tune it), I do **not** push. Their posts are stored once. At read time, after loading the reader's precomputed list, I pull the recent posts of the small set of celebrities that reader follows and **merge-sort** them into the timeline. Because a reader follows only a handful of celebrities, this read-time merge is bounded and cheap, while it saves the tens of millions of writes a single celebrity post would otherwise cause.

Quantifying the trade: pure fan-out-on-write for a 50M-follower account is 50M writes per post, a write storm that saturates the fan-out fleet and delays every other user's feed. The hybrid caps write amplification at the threshold. Pure fan-out-on-read, by contrast, turns every feed load into a scatter-gather over thousands of followees, which blows the 100 ms budget on the hot read path.

Consistency and edges: I own write amplification (fan-out lag under bursts, which I monitor as fan-out queue depth) and copy consistency (unfollow/block must filter posts, deletes must tombstone, and denormalized author names can drift). New follows backfill from the author's recent posts; the precomputed list is a cache that can be rebuilt from the source of truth.

Common wrong turn: pure fan-out-on-write with no celebrity carve-out, which looks clean in a diagram and detonates in production the first time a celebrity posts.

**Self-check rubric:**
- [ ] Named both strategies and stated which cost each one lowers (reads vs writes)
- [ ] Proposed a hybrid with an explicit follower threshold for celebrity accounts
- [ ] Quantified the write amplification of pushing a celebrity post (millions of writes)
- [ ] Specified concrete storage (Redis per-user lists, a post-by-id store, Kafka fan-out)
- [ ] Called out the consistency/invalidation cost of the denormalized copies
- [ ] Flagged pure fan-out-on-write for celebrities as the wrong turn

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the analytics/counts layer for a live-streaming platform (Twitch-scale: a top stream has 300k concurrent viewers) that must show a near-real-time viewer count, unique-viewer count for the session, and a "top 10 trending streams" board, without hammering the primary DB on every read.

**Model answer (revealed on demand):**

Assumptions: exact live viewer count can be approximate within a percent or two, unique-viewer count for a session needs to be close but not audit-grade, and the trending board updates every few seconds, not per event. Read volume is enormous (every viewer's client polls or subscribes), so reads must never touch a relational primary.

Design: precompute everything and serve from a fast store. **Live concurrent count** is a maintained counter in Redis per stream, incremented/decremented on join/leave events (or derived from a heartbeat TTL set so crashed clients age out). Clients read the counter, or better, subscribe via a pub/sub or WebSocket push so 300k viewers do not each poll. **Unique viewers per session** is a classic exactness-is-too-expensive case: storing 300k+ viewer ids per stream to dedupe is wasteful, so I use a **HyperLogLog** per stream (Redis `PFADD`/`PFCOUNT`), ~12 KB and ~2% error, which is fine for a "1.2M unique viewers this session" label. **Trending top 10** uses a **Count-Min Sketch** or a windowed rollup: a stream job (Kafka Streams/Flink) aggregates viewer-join events into per-stream counts over a sliding window and writes a small sorted materialized table that the board reads directly.

The through-line is the module's thesis: reads are on the hot path and vastly outnumber writes, so I move all aggregation off the read path into precomputed counters, sketches, and rollup tables, trading a little exactness and a few seconds of freshness for reads that are O(1) lookups against Redis or a tiny serving table instead of `COUNT(DISTINCT ...)` against a primary.

Common wrong turn: `SELECT COUNT(DISTINCT viewer_id)` on every read, or storing every viewer id to get exact uniques, either of which melts the DB and the memory budget at 300k concurrent viewers when a HyperLogLog answers the same question in 12 KB.

### sd-l3-cdc-dual-write: Keeping Derived Stores in Sync (CDC & Outbox)

- **id:** `sd-l3-cdc-dual-write`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** cdc, outbox, dual-write

#### Learn

The moment you have a primary database plus any derived store (a Redis cache, an Elasticsearch index, a read replica, an analytics warehouse), you have a sync problem. The naive solution, and the most common production bug, is the **dual write**: in your request handler, write to the DB, then write to the cache/index in the same code path.

```
handler:
  db.save(order)          # write 1
  cache.set(order)        # write 2   <-- if this fails or the process
  search.index(order)     # write 3       dies here, stores diverge
```

This is broken because the two writes are **not atomic** and there is no shared transaction across a database and a cache. Any of these happens routinely: write 1 commits and the process crashes before write 2, so the cache is stale forever; write 2 succeeds but write 1's transaction rolls back, so the cache holds a row the DB never persisted; or two concurrent requests apply their DB writes in one order and their cache writes in the opposite order, so the cache ends on the older value. Under load, partial failure is not an edge case, it is a steady drip of divergence you discover weeks later as "search shows a product that was deleted."

The disciplined fix has two parts.

**Transactional outbox:** stop writing to the second system from the handler. Instead, in the **same database transaction** as your business write, insert a row into an `outbox` table describing the event (`{id, aggregate_id, type: OrderPlaced, payload, created_at}`). Because it is the same transaction, the business change and the intent-to-publish commit together or not at all: no partial state. A separate **relay** process then reads unpublished outbox rows and publishes them to a message broker (Kafka), marking them sent. The handler now does exactly one atomic write.

**Log-based change data capture (CDC):** rather than write an outbox by hand, tap the database's own replication log, which already records every committed change durably and in order. **Debezium** reads Postgres logical decoding, the MySQL binlog, or MongoDB oplog and emits an ordered stream of row changes to Kafka. Downstream consumers (a cache updater, an Elasticsearch sink, a warehouse loader) subscribe and apply. CDC gives you the outbox's guarantee (only committed changes are published, in commit order) for free from the log, without changing the write path. The outbox is the right tool when you need domain events (`OrderPlaced`) rather than raw row diffs; CDC is the right tool when you want to mirror table state to derived stores with no application changes.

Now the delivery guarantee. **Exactly-once end-to-end is a fantasy** across a broker and heterogeneous sinks: the relay can crash after publishing but before marking the outbox row sent, so it republishes. The realistic and correct target is **at-least-once delivery plus idempotent consumers**. Make every consumer safe to re-apply the same event: key the cache/index write by the event's primary key and use last-writer-wins on a version/LSN, or dedupe on event id. Then a duplicate is a no-op and you never need exactly-once.

Operational reality: you also need **backfills and replays** (snapshot the current table state to bootstrap a brand-new index, then switch to the live stream), and you must **monitor replication slot / consumer lag**. A Postgres logical replication slot that a stalled Debezium connector stops advancing will pin WAL and eventually fill the disk, taking the primary down. Lag is the number that tells you the cache is N seconds stale.

**Interview nuance:** if the interviewer says "just write to the DB and the cache," name the dual-write problem explicitly and reach for outbox or CDC. If they push on "why not exactly-once," say the honest thing: at-least-once plus idempotent, versioned consumers is simpler and strictly more robust than chasing exactly-once, and it is what Kafka-based pipelines actually run.

Recap: never dual-write to a DB and a derived store, because the two writes cannot be atomic and will diverge on partial failure; commit the change and its event together via a transactional outbox, or tap the DB log with CDC (Debezium), publish through Kafka, and make consumers idempotent so at-least-once delivery is correct, while monitoring replication-slot lag and supporting snapshot backfills.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design how a write to the primary DB reliably updates a Redis cache and an Elasticsearch index without a dual-write race.

**Think about:**
- Why can two independent writes partially fail and diverge?
- How do the transactional outbox and log-based CDC fix it?
- Why is at-least-once + idempotent consumers the realistic target?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a primary Postgres holds the source of truth (say a product/order table), a Redis cache serves hot reads, and an Elasticsearch index serves full-text search. Sub-second staleness of the cache and index is acceptable; permanent divergence is not.

The problem to name first: dual-writing (handler writes Postgres, then Redis, then Elasticsearch) has three independent, non-atomic writes. A crash or error after the DB commit leaves Redis and Elasticsearch stale; concurrent requests can apply their side effects in a different order than their DB commits, so a derived store settles on an older value. There is no cross-system transaction to lean on, so this drifts under load.

High-level design: make the write path a **single atomic DB write** and derive everything else from the DB's change log. I use **log-based CDC**: Debezium reads Postgres logical decoding and streams every committed row change, in commit order, into a Kafka topic per table. Two consumer groups subscribe: a **cache updater** that sets/deletes the corresponding Redis key, and an **Elasticsearch sink** that indexes/deletes the document. The handler writes only to Postgres. (If I needed rich domain events rather than raw row diffs, I would use a transactional outbox instead: insert an `outbox` row in the same transaction as the business write, and a relay publishes it to Kafka. Same guarantee, different granularity.)

Delivery guarantee: I target **at-least-once, not exactly-once**, because the relay/connector can republish after a crash. I make both consumers **idempotent**. The cache write is keyed by primary id and guarded by the event's LSN/version so an older duplicate never overwrites a newer value (last-writer-wins). The Elasticsearch write uses the row id as the document id and Elasticsearch's external version = the DB version, so re-applying a stale event is rejected. Duplicates become no-ops, which is why exactly-once is unnecessary.

Bootstrapping and operations: a new index or a flushed cache is filled by a **snapshot backfill** (Debezium's initial snapshot, or a scan) and then cut over to the live stream. I monitor **consumer lag** and the **Postgres replication slot**: a stalled connector that stops advancing the slot pins WAL and can fill the primary's disk, so slot lag gets an alert and the connector gets a dead-letter queue for poison events.

Common wrong turn: keeping the dual write and adding retries. Retries do not make two non-atomic writes atomic; they narrow the window but the divergence class remains. The fix is structural (outbox/CDC), not more retries.

**Self-check rubric:**
- [ ] Named the dual-write problem and why the writes cannot be atomic
- [ ] Chose outbox or CDC and explained the atomic-with-the-DB-write guarantee
- [ ] Named concrete tech (Debezium/logical decoding, Kafka, Redis, Elasticsearch)
- [ ] Targeted at-least-once + idempotent/versioned consumers, not exactly-once
- [ ] Covered snapshot backfill and monitoring replication-slot / consumer lag
- [ ] Flagged "add retries to the dual write" as not a real fix

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the change-propagation pipeline for a marketplace (Shopify-scale: 5M product mutations/day across thousands of merchant DBs shards) that must keep a global Elasticsearch search index, a Redis price cache, and a Snowflake analytics warehouse in sync with per-shard Postgres primaries, and explain how you bootstrap a brand-new search index without downtime.

**Model answer (revealed on demand):**

Assumptions: product data is sharded across many Postgres primaries (by merchant), each with its own WAL. 5M mutations/day is a modest ~60 writes/sec average but bursty (flash sales, bulk imports). Search and cache tolerate a few seconds of lag; the warehouse tolerates minutes.

Design: one **Debezium CDC connector per shard**, each tapping that shard's logical replication slot and publishing row changes to Kafka topics keyed by product id, partitioned so all events for a product land on one partition and stay ordered. From Kafka, three independent consumer groups fan out: an **Elasticsearch sink** (idempotent upserts keyed by product id with external version = DB version), a **Redis price-cache updater** (last-writer-wins on version), and a **Snowflake loader** that micro-batches changes (Kafka Connect Snowflake sink or a Flink job writing Parquet to S3 then `COPY INTO`), because a warehouse wants batched loads, not per-row writes. Decoupling consumers means the slow warehouse loader never backpressures the fast search/cache path.

At-least-once plus idempotent consumers is the target here too; with thousands of shards and connectors, redeliveries on connector restarts are constant, so every sink must dedupe/version. Poison events go to a dead-letter topic rather than stalling a partition.

Bootstrapping a new index without downtime: build it in the background. Kick off Debezium's **initial snapshot** (or a bounded historical scan) writing into a **new index alias**, while the live CDC stream also applies to it, so the new index converges to current state. Because writes are idempotent and version-guarded, the snapshot and the live stream can interleave safely. When the new index's lag reaches near zero, atomically **flip the Elasticsearch alias** from the old index to the new one. Readers never see downtime; the old index is dropped after a soak period.

Common wrong turn: a single global CDC connector or dual-writing from the app tier across shards. The per-shard-slot design is what keeps ordering correct and prevents one merchant's bulk import from pinning every shard's WAL; app-tier dual writes reintroduce exactly the divergence CDC exists to remove.
