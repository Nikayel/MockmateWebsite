> Module **sd-l11-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l11-m2](./sd-l11-m2.md) · Next: [sd-l11-m4](./sd-l11-m4.md)

# L11 · Real-Time Analytics & Global Data

By the end of this module you can design the two systems that show up whenever data has to be either fast at massive volume or correct across the planet: a streaming analytics pipeline that turns a firehose of billions of events per day into sub-second trending and per-minute counts, and a globally distributed database that serves low-latency local reads worldwide without letting two regions double-spend the same balance. Both lessons force the tradeoffs interviewers probe hardest: approximate versus exact, and the speed of light versus strong consistency.

### sd-l11-streaming-realtime-analytics: Streaming / Real-Time Analytics Pipelines

- **id:** `sd-l11-streaming-realtime-analytics`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** real-time-analytics, streaming, olap

#### Learn

A real-time analytics pipeline turns an unbounded stream of events into aggregates you can query within seconds: per-minute counts, unique visitors, top-K trending items. At billions of events per day (a few million per second at peak) the entire design is a fight against two things: the cost of exact counting, and the fact that events arrive late and out of order.

**The backbone.** Producers write events to a partitioned, replayable log: Kafka or Kinesis. Partition by a key that both spreads load and preserves the ordering you need (for example, `item_id` so all events for one item land on one partition in order). The log gives you three things a queue does not: replay (reprocess from an offset after a bug), backpressure (consumers pull at their own rate), and durability (retain days of data). Size it: 2M events/sec times 200 bytes is 400 MB/sec, roughly 35 TB/day before replication, so retention and partition count are real capacity decisions.

**The processing engine.** A stream processor (Flink, or Spark Structured Streaming) consumes partitions and maintains windowed state. Windows come in three shapes: tumbling (fixed, non-overlapping, for per-minute counts), sliding (overlapping, for a trailing 5-minute top-K refreshed every 30s), and session (gap-defined, for user activity). The hard part is time. Event time (when it happened) differs from processing time (when you saw it). A phone offline for 10 minutes floods you with old events. Windows are keyed on event time, and a **watermark** is the engine's assertion that no event older than time T will still arrive. When the watermark passes a window's end, the window closes and emits. Late events past the watermark go to a side output or a small allowed-lateness update, never silently dropped.

**Delivery semantics.** At-least-once is cheap but double-counts on retry. Exactly-once needs the processor to checkpoint state and offsets atomically (Flink's distributed checkpoints) and sinks to be idempotent or transactional. For counts, exactly-once matters; for a fuzzy trending list, at-least-once with idempotent upserts is often enough.

**Approximate structures, the core insight.** Exact distinct counts and exact top-K over a firehose need unbounded memory (a set of every id seen). You trade a bounded error for bounded memory:

```
HyperLogLog  -> unique counts (cardinality) in ~12 KB per key, ~2% error
Count-Min Sketch -> per-item frequency in fixed memory, over-counts only
Top-K (heavy hitters, on top of CMS) -> trending items without a full sort
t-digest / DDSketch -> p50/p95/p99 latency quantiles in a tiny footprint
```

HyperLogLog also merges: per-partition sketches union into a global unique count, which is why it scales horizontally.

**Serving.** Do not query Flink state directly. Land aggregates in a real-time OLAP store built for high-ingest, sub-second aggregation: Apache Druid, Pinot, or ClickHouse. They pre-aggregate on ingest and answer "counts per minute for the last hour" in tens of milliseconds under dashboard concurrency.

**Lambda vs Kappa.** Lambda runs a batch layer (exact, slow) alongside the speed layer (approximate, fast) and merges them, at the cost of two codebases. Kappa runs one streaming pipeline and reprocesses from the log by replaying when you need a correction. Kappa is the modern default because replay makes the batch layer redundant.

**Interview nuance:** When asked for "exact" trending, name the cost explicitly. Exact top-K needs a global count per item, which is a shuffle-heavy full aggregation. State that approximate top-K is a deliberate accuracy-for-scale trade, not a shortcut you forgot to fix.

Recap: Kafka backbone, Flink windows keyed on event time with watermarks for late data, exactly-once via checkpointing where counts must be right, HyperLogLog and Count-Min Sketch for bounded-memory counting, and a Druid/Pinot/ClickHouse serving layer for sub-second queries.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a real-time analytics system that shows near-real-time top-K trending items and per-minute event counts over a firehose of billions of events/day.

**Think about:**
- What backbone and processing engine handle the firehose?
- How do watermarks and windowing handle late/out-of-order events?
- Which approximate algorithms scale counting and top-K?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 5B events/day, roughly 60K/sec average and ~2M/sec peak, each event ~200 bytes with an `item_id`, `user_id`, and `event_time`. Requirements: per-minute counts and a trailing 5-minute top-100 trending list, both fresh within a few seconds, dashboard reads at sub-second latency. Events can arrive minutes late from offline clients.

Estimation: 2M/sec times 200 bytes is 400 MB/sec ingest, ~35 TB/day pre-replication. That sizing drives Kafka partition count (hundreds) and retention (say 3 days for replay).

Ingestion: producers write to Kafka, partitioned by `item_id` so per-item ordering holds and top-K aggregation stays partition-local. Kafka gives replay, backpressure, and durability.

Processing: Flink consumes partitions. Two window jobs. One tumbling 1-minute window per `item_id` for per-minute counts. One sliding 5-minute window advancing every 30s feeding a top-K. Windows key on `event_time`. A watermark set to (max seen event_time minus 2 minutes) lets late events land; events later than that go to a side output for correction rather than being dropped. For unique visitors per minute I maintain a HyperLogLog per key (~12 KB, ~2% error) that merges across partitions. For trending I run a Count-Min Sketch plus a heavy-hitters top-K rather than an exact global sort.

Delivery: exactly-once for counts via Flink checkpointing of state and offsets, with idempotent upserts into the sink so a replay does not double-count.

Serving: Flink writes minute-level rollups and the current top-K into Apache Druid (or Pinot/ClickHouse), which serves dashboard queries in tens of ms under concurrency. Clients never query Flink state directly.

Architecture is Kappa: one streaming pipeline, corrections by replaying Kafka from an offset, no separate batch codebase.

Key tradeoffs: approximate top-K and HLL trade ~2% error for bounded memory, the only way to count billions of events without unbounded state. Watermark lag trades a small freshness delay for correctness on late data.

Common wrong turn: exact counting at firehose scale (a global set or GROUP BY over every event), which needs unbounded memory and a huge shuffle and cannot keep up. Another: windowing on processing time, which silently miscounts whenever clients are late.

**Self-check rubric:**
- [ ] Did you choose a partitioned, replayable log (Kafka/Kinesis) and justify the partition key?
- [ ] Did you window on event time with watermarks and a defined late-event policy?
- [ ] Did you use HyperLogLog for uniques and Count-Min/top-K for trending instead of exact counts?
- [ ] Did you pick a real-time OLAP serving store (Druid/Pinot/ClickHouse) separate from the processor?
- [ ] Did you address exactly-once vs at-least-once and idempotent sinks?
- [ ] Did you give ingest sizing (events/sec, MB/sec, TB/day) and name Lambda vs Kappa?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the real-time metrics pipeline behind a video platform like YouTube that must show creators a live view count that ticks up during a premiere, while also preventing bots from inflating counts, at 500M view events/sec across a global audience.

**Model answer (revealed on demand):**

Assumptions: 500M view events/sec at peak, geographically spread, creators want a live counter fresh within a few seconds, and the public count must resist bot inflation. Two consumers of the same stream: a fast approximate live counter and a slower validated official count.

Regional ingestion: view events land in a Kafka cluster per region (US, EU, APAC) to keep producer latency low, partitioned by `video_id`. Regional Flink jobs pre-aggregate per-video counts locally, then a global aggregation tier sums regional partials so no single cluster sees 500M/sec.

Two paths on the same log, a Lambda-style split justified here by the fraud requirement. The speed path maintains a per-video running counter with at-least-once and idempotent increments, giving the live ticking number. Because bots make raw counts untrustworthy, the batch/validation path replays the same events through fraud scoring (dedupe by device and session, watch-time thresholds, rate anomalies, HyperLogLog on `user_id` to sanity-check uniques against total views) and produces the official count that is reconciled periodically. The live counter is explicitly labeled approximate and can be revised down when validation lands, which is exactly how real platforms behave.

Late and out-of-order events: watermarks with generous allowed lateness because mobile clients buffer views offline; a phone syncing an hour later still counts, routed through the same fraud path.

Serving: per-video counters cached in Redis for the live read path (creators poll every few seconds); validated rollups in Druid for creator analytics dashboards (views by geo, by minute, retention curves).

Key tradeoff: the live number optimizes freshness over correctness, the official number optimizes correctness over freshness, and they are allowed to disagree transiently. Trying to make one number both instant and fraud-proof is the trap; you cannot validate at 500M/sec inline without adding seconds of latency, so you split the paths and reconcile.

### sd-l11-globally-consistent-multiregion: Globally-Consistent Multi-Region Data

- **id:** `sd-l11-globally-consistent-multiregion`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** multi-region, spanner, geo-partitioning

#### Learn

Once your data lives on more than one continent, physics sets the rules. Light in fiber crosses the Atlantic in about 40ms one way, so a New York to Frankfurt round trip is ~80ms and a synchronous write that waits for a quorum spanning both regions costs 100+ ms before you add any processing. The whole design is about deciding, per piece of data, whether that latency is worth paying for correctness.

**CAP and PACELC in practice.** CAP says under a network partition you choose consistency or availability. PACELC adds the part interviewers actually want: Else (no partition), you still trade Latency against Consistency. A globally strong-consistent write is slow because it must reach a cross-region quorum; a fast local write is only locally consistent. There is no configuration that gives strong consistency and low latency everywhere for free. State this out loud.

**How you still get strong consistency.** Replicate each data shard across regions with a consensus protocol (Paxos or Raft): a write commits when a majority of replicas acknowledge. Place replicas so the quorum is reachable quickly. Google Spanner adds **TrueTime**, an API that returns time as an interval `[earliest, latest]` bounded by GPS and atomic clocks (uncertainty typically a few ms). To commit at timestamp T, Spanner waits out the uncertainty (commit-wait) so that no later reader can observe an earlier timestamp. This gives **external consistency**: if transaction A commits before B starts, A's timestamp is smaller, globally. Without special clocks you approximate ordering with Hybrid Logical Clocks (HLC), which combine physical time with a logical counter to preserve causality (CockroachDB, YugabyteDB use this).

**Data placement is the real lever.** You do not need every row to be globally consistent. **Geo-partition**: pin each row to a home region near its owner. A European user's account lives with its leader in Frankfurt, so their reads and writes are local (single-region quorum, single-digit ms) and only rarely touch another continent. US users' rows are led from us-east. You pay cross-region latency only for genuinely cross-region operations. Add **follower reads** (read a nearby replica at a slightly stale timestamp) and **read leases** (a leader holds a lease so it can serve strongly consistent reads without a quorum round trip) to make local reads cheap.

```
EU user  -> leader in Frankfurt   -> local quorum (EU replicas) ~ single-digit ms
US user  -> leader in us-east     -> local quorum (US replicas) ~ single-digit ms
cross-region txn (EU pays US) -> two-region coordination ~ 100+ ms  (rare by design)
```

**Active-active vs active-passive.** Active-passive keeps one write region and fails over (simple, but the standby's capacity sits idle and failover has an RTO). Active-active accepts writes in multiple regions and must resolve conflicts: Last-Write-Wins (simple, silently loses data on concurrent writes), CRDTs (conflict-free types that merge deterministically, great for counters, sets, presence), or application merge (you write the reconcile logic). For money you generally avoid multi-writer conflict resolution entirely and route each account's writes to its single home leader.

**Consistency spectrum, chosen per workload.** Strong (balances, must be exact), bounded-staleness (read at most N seconds old, fine for a profile), causal (you always see your own writes and their causes), eventual (a like count). Pick per data type, not for the whole system. Track RTO and RPO for failover, and data residency (GDPR) which may force certain rows to physically stay in-region.

**Interview nuance:** For a balance, the correctness requirement is no double-spend, which is a single-key serializable constraint. You get it cheaply by homing each account in one region so its writes serialize through one leader, then using Spanner-style TrueTime or a Raft leader for ordering. You do not need global multi-writer consensus for every action, only correct ordering per account.

Recap: cross-region synchronous writes cost 100+ ms because of the speed of light, so use consensus plus TrueTime/HLC for correct ordering, geo-partition rows to their home region for local reads and writes, add follower reads and leases, and choose a consistency level per workload instead of paying for global strong consistency everywhere.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a globally distributed database for user accounts/balances that gives low-latency local reads worldwide while preventing double-spend.

**Think about:**
- Why do cross-region synchronous writes cost 100+ ms?
- How do TrueTime/HLC and geo-partitioning enable local reads?
- What conflict-resolution and consistency choices fit per workload?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: hundreds of millions of user accounts each holding a balance, users concentrated by region (a user is usually near one region), reads dominate (balance checks, profile loads) but writes (transfers, purchases) must never double-spend, low read latency worldwide, and GDPR residency for EU users. RPO near zero for balances.

Why writes are expensive: a strongly consistent write commits only when a cross-region majority acknowledges. A NY to Frankfurt round trip is ~80ms, so any quorum spanning continents costs 100+ ms. That is physics, not tuning.

High-level design: use a Spanner-class database (Spanner, CockroachDB, or YugabyteDB). Each account is a row in a table geo-partitioned by a `home_region` column derived from the user. The row's Raft/Paxos replica group has its leader and majority in the user's home region, so that account's reads and writes complete with a single-region quorum in single-digit ms. Ordering and no-double-spend come from serializable transactions: a debit runs as a read-modify-write in one serializable transaction against the account's home leader, so concurrent debits serialize and cannot both succeed on an insufficient balance. TrueTime (or HLC in CockroachDB) provides external consistency so timestamps are globally correct without a global lock.

Reads worldwide: for the account owner, reads are local (their home region). For occasional foreign reads, use follower reads at a bounded-staleness timestamp against a nearby replica, avoiding the cross-region round trip when a few seconds of staleness is acceptable. Leaders hold read leases to serve strong reads locally.

Cross-account transfers (EU account to US account) are the genuinely cross-region case: a two-region distributed transaction (two-phase commit across the two leader groups) costing 100+ ms. That is acceptable because transfers are rare relative to reads, and correctness dominates.

Consistency per workload: balances are strong/serializable; profile and settings can be bounded-staleness; activity feeds eventual. Residency is satisfied because EU rows are pinned to EU replicas.

Common wrong turn: claiming global strong consistency with low write latency everywhere, or using active-active multi-writer with Last-Write-Wins on balances, which silently drops a concurrent debit and enables double-spend. The fix is single-home each account so its writes serialize through one leader.

**Self-check rubric:**
- [ ] Did you explain the 100+ ms cost as a speed-of-light quorum round trip?
- [ ] Did you geo-partition/home each account row to its owner's region for local reads and writes?
- [ ] Did you get no-double-spend via a serializable single-key transaction on the home leader (not LWW)?
- [ ] Did you name TrueTime/HLC and external consistency for global ordering?
- [ ] Did you use follower reads / bounded staleness for cheap foreign reads?
- [ ] Did you assign a consistency level per workload and address residency (GDPR)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the global inventory and cart system behind an event like a worldwide flash sale (think a limited PlayStation 5 drop across US, EU, and APAC) where 10,000 units must never oversell, buyers expect a cart response under 100ms locally, and demand spikes to millions of concurrent shoppers at the drop instant.

**Model answer (revealed on demand):**

Assumptions: a small, fixed inventory (10K units) that absolutely must not oversell, millions of concurrent buyers globally at t=0, local add-to-cart under 100ms, and it is acceptable that some buyers see "sold out" a moment before the global count truly hits zero (better than overselling).

The core tension: inventory is a single strongly-consistent counter that must decrement correctly, but the counter is one hot key while buyers are global. Naive global synchronous decrement per request would serialize millions of requests through one leader with 100+ ms cross-region hops, collapsing under load.

Design: partition the 10K units into regional allocations up front, say 4K US, 4K EU, 2K APAC, each held as a separate strongly-consistent counter homed in that region (Spanner/CockroachDB row or a Redis counter backed by consensus). Buyers decrement their local region's allocation, so the common path is a local single-region quorum under 100ms with no cross-region hop. Within a region, shard the hot counter into sub-counters (for example 40 shards of 100) to spread contention, decrementing a random shard and rebalancing.

Overselling prevention: each decrement is a conditional atomic operation (compare-and-decrement, reject at zero). Because each unit lives in exactly one regional allocation and decrements are serialized per shard, the sum can never go below zero. When a region exhausts its allocation, a coordinator can rebalance leftover units from another region via a cross-region transaction (rare, and correctness-first).

Cart holds: a successful decrement creates a time-boxed reservation (2-minute TTL) so an abandoned cart returns stock. Reservations are the source of truth for "held," and checkout converts a hold to a sale.

Consistency choice: the inventory counter is strong; the "X left" number shown to browsers is eventual and cached at the edge (it can lag). Trying to show a globally exact live remaining count to every shopper is the trap: that recreates the hot-key global read storm. Show an approximate count, enforce exactness only at the decrement.

Common wrong turn: one global counter with synchronous cross-region writes (latency collapse) or an eventually-consistent counter for the actual decrement (oversell). Regional allocation plus per-shard atomic compare-and-decrement gives both local latency and hard correctness.
