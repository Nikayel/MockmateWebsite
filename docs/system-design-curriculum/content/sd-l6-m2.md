> Module **sd-l6-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l6-m1](./sd-l6-m1.md) · Next: [sd-l6-m3](./sd-l6-m3.md)

# L6 · Kafka & the Log

After this module you can reason about Kafka the way a staff engineer does: you understand why the append-only log gives it throughput, why partitions are the atom of both ordering and parallelism, why a wrong key silently breaks correctness, how consumer-group rebalancing turns into latency and duplicate spikes, and how retention and compaction decide whether a topic is a replayable stream or a queryable table.

### sd-l6-kafka-internals: Kafka Architecture Internals

- **id:** `sd-l6-kafka-internals`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** kafka, isr, durability

#### Learn

Kafka is not a message queue that happens to be fast. It is a distributed, replicated, append-only **commit log**, and almost every property people admire falls out of that one design choice. A **topic** is a named log split into **partitions**. Each partition is an ordered, immutable sequence of records, and every record gets a monotonically increasing **offset** (0, 1, 2, ...). That is the entire data model. There is no per-message delete, no random insert, no in-place update. Producers append to the tail; consumers read forward from an offset they control.

Why is this fast? Three mechanical reasons. **Sequential disk writes:** appending to the end of a file is the one access pattern spinning disks and SSDs both love, so Kafka sustains hundreds of MB/s per broker where a random-write store would thrash. **Page cache:** Kafka does not maintain its own in-process cache; it writes to the OS page cache and lets the kernel flush, so recent data is served from RAM without a user-space copy. **Zero-copy:** on read, `sendfile()` moves bytes from page cache straight to the network socket without dragging them through the JVM heap. Add producer-side **batching and compression** (lz4/zstd, batches keyed by `linger.ms` and `batch.size`) and a single cluster comfortably handles millions of events per second.

Durability comes from **replication**. Each partition has one **leader** and N-1 **followers**; the replication factor is typically 3. Followers pull from the leader and, when caught up, sit in the **in-sync replica (ISR)** set. Two settings decide your durability/latency trade:

- **`acks`** on the producer: `acks=0` (fire and forget, can lose data), `acks=1` (leader persisted, but a leader crash before replication loses acknowledged writes), `acks=all` (leader waits for all ISR members).
- **`min.insync.replicas`** on the broker: the minimum ISR size for an `acks=all` write to be accepted. With RF=3 and `min.insync.replicas=2`, a write needs the leader plus one follower, so you survive one broker loss with zero acknowledged-message loss and still accept writes.

**Interview nuance:** `acks=all` alone is not durable. If `min.insync.replicas=1`, "all ISR" can mean "just the leader" after followers drop out, so a leader crash still loses acknowledged writes. The durable combination is `acks=all` **and** `min.insync.replicas>=2` **and** RF>=3. Stating `acks=all` without the ISR floor is the classic wrong turn.

```
Topic "rides", partition 3:
 offset:  0    1    2    3    4  <- append here (tail)
 record: [r0] [r1] [r2] [r3] [r4]
 Leader (broker 1) --replicate--> Follower (b2), Follower (b3)
 ISR = {1,2,3}. acks=all + min.insync.replicas=2 -> survives 1 loss.
```

**Log segments and retention:** a partition is stored as segment files that roll by size/time; old segments are deleted (time/size retention) or compacted. **Tiered storage** (KIP-405) offloads cold segments to S3-class object storage so retention cost decouples from broker disk. Finally, **KRaft** (GA, default in Kafka 4.0) replaced ZooKeeper: cluster metadata now lives in an internal Raft quorum of controllers, which removes the external dependency, speeds failover, and scales to far more partitions.

Recap: Kafka is a partitioned append-only log; sequential writes, page cache, and zero-copy explain its throughput; durability is leader/follower replication tuned by `acks` plus `min.insync.replicas` over the ISR (durable = `acks=all` + `min.insync.replicas>=2` + RF3); retention, segments, compaction, and tiered storage govern cost and replay; and KRaft removed ZooKeeper by making metadata a Raft quorum.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a Kafka topic layout for a ride-hailing event stream at 500k events/sec: choose partition count, replication factor, and key, and explain the durability/latency tradeoffs of your acks and min.insync.replicas settings.

**Think about:**
- What do acks and min.insync.replicas trade off?
- Why do sequential writes, zero-copy, and page cache give Kafka its throughput?
- What did KRaft change versus ZooKeeper?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 500k events/sec of ride events (requested, matched, started, location-ping, completed), average record 500 bytes so roughly 250 MB/s ingest, ordering required per ride, and this stream feeds matching, pricing, and analytics consumers. We want no acknowledged-message loss.

**Partition count.** Size from the higher of producer and consumer throughput per partition. A conservative safe budget is 10 MB/s produce and 10 MB/s consume per partition, so 250 MB/s needs about 25 partitions on throughput alone. But partition count also caps consumer parallelism and you want headroom for growth without repartitioning (which breaks key stability), so I would provision **120 partitions**. That gives each of several consumer groups room to run many workers, keeps per-partition load modest, and leaves 3-4x headroom. I would not go to thousands: more partitions means more open files, more replication traffic, longer rebalances, and (pre-KRaft) metadata pressure.

**Replication factor.** **RF=3** across 3 availability zones with rack-awareness so replicas land in different AZs. This survives a full broker or single-AZ loss.

**Key.** Key by **`ride_id`**. All events for one ride hash to the same partition and therefore stay totally ordered, which matching and billing require. Keying by `driver_id` or `city` would create hot partitions (a busy city dwarfs the rest); `ride_id` spreads load evenly because rides are numerous and short-lived.

**Durability settings.** Producers use `acks=all`; brokers set `min.insync.replicas=2`. With RF=3 this means every acknowledged write is on at least 2 replicas, so we tolerate one broker/AZ failure with zero acknowledged-message loss and still accept writes. The latency cost is one extra replication round trip versus `acks=1` (single-digit ms within a region), which is the right price for a payments-adjacent stream. Location pings, which are lossy-tolerant and huge in volume, could go to a separate topic at `acks=1` to save latency and cost. Producer `linger.ms` around 5-10ms plus lz4 compression batches aggressively to hit throughput.

Throughput holds because Kafka appends sequentially, serves reads from page cache via zero-copy `sendfile`, and batches on the producer. KRaft means no ZooKeeper, so 120 partitions times RF3 is well within a single cluster's metadata budget and controller failover is fast.

Common wrong turn: setting `acks=all` but leaving `min.insync.replicas=1`, which can silently degrade to leader-only and lose acknowledged writes on a leader crash.

**Self-check rubric:**
- [ ] Did you size partitions from throughput per partition and add growth headroom, not pick a round number?
- [ ] Did you choose RF=3 across AZs with rack awareness?
- [ ] Did you key by `ride_id` and justify why it avoids hot partitions while preserving per-ride order?
- [ ] Did you pair `acks=all` with `min.insync.replicas>=2` and name the latency cost?
- [ ] Did you flag the `acks=all` + `min.insync.replicas=1` trap?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the Kafka topology for LinkedIn-scale clickstream ingestion at 7 million events/sec across 3 datacenters, feeding both a real-time feed-ranking pipeline and a batch data lake, where losing a page-view event is acceptable but the cluster must never be a single point of failure. Choose partition count, replication, acks, and cross-datacenter strategy.

**Model answer (revealed on demand):**

Assumptions: 7M events/sec, average 300 bytes, so about 2.1 GB/s. Page views are individually lossy-tolerant, but the pipeline as a whole must stay available and must not lose whole partitions. Two consumer classes: low-latency feed ranking and high-throughput batch (Hadoop/Spark lake).

I would not run one giant topic. Split by event family (`pageview`, `impression`, `engagement`) so each scales and is retained independently. For 2.1 GB/s at roughly 10 MB/s per partition on the produce side you need about 210 partitions minimum; with growth and consumer-parallelism headroom I would provision **600-1000 partitions** across the family topics, spread over dozens of brokers. Key `pageview` by `member_id` so a member's events are ordered (needed for sessionization downstream) while spreading load across the member base.

Replication: **RF=3** within each datacenter, rack/AZ aware. Because a single lost page view is acceptable, producers use **`acks=1`** on the pageview topic to shave the replication round trip and sustain 2 GB/s cheaply; the engagement topic (clicks that drive revenue/ranking signals) uses `acks=all` with `min.insync.replicas=2`. This is the key move: match durability to the value of each event class rather than paying `acks=all` everywhere.

Cross-datacenter: do not stretch one cluster across DCs (WAN latency wrecks replication and ISR). Run an independent cluster per DC and use **MirrorMaker 2** (or Confluent Cluster Linking) for async replication into an aggregate cluster that feeds the central data lake, accepting some cross-DC lag. Local producers write to their local cluster, so a DC partition never blocks ingestion. Feed ranking consumes locally for low latency; the lake consumes from the aggregate.

Throughput relies on heavy producer batching, zstd compression, and zero-copy reads; tiered storage (S3/HDFS) holds cold segments so 30-day lake retention does not bloat broker disk. KRaft keeps ~1000-partition metadata cheap. The cluster is never a SPOF: RF3 plus multi-broker plus per-DC clusters plus MM2 aggregation means no single broker, rack, or DC failure stops ingestion or loses a whole partition.

### sd-l6-partitioning-ordering: Partitioning, Ordering & Keys

- **id:** `sd-l6-partitioning-ordering`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** partitioning, ordering, keys

#### Learn

Kafka gives you exactly one ordering guarantee, and interview candidates get burned by it constantly: **records are totally ordered within a partition, and there is no ordering across partitions.** A partition is a single append-only sequence, so offset order equals arrival order there. But a topic with 100 partitions is 100 independent sequences interleaved by wall-clock chance. If event X lands in partition 4 and event Y lands in partition 7, Kafka makes no promise about whether a consumer sees X or Y first. There is no global clock and no global sequence.

This is not a limitation to work around; it is the direct cost of parallelism. The only reason Kafka scales reads and writes horizontally is that partitions are independent, so anything that needed global order would need a single partition, which caps you at one broker's throughput and one consumer.

The consequence for correctness is the **key**. A producer computes the partition as `hash(key) mod partition_count` (default murmur2 hash). So **all records with the same key go to the same partition and are therefore totally ordered relative to each other.** Records with different keys may be reordered. Correctness therefore reduces to one question: which events must be seen in order relative to each other? Whatever that set is, it must share a key.

- Bank account: key by `account_id`, so deposit-then-withdraw for one account is never reordered into overdraft.
- Order lifecycle: key by `order_id`, so `created -> paid -> shipped` stays monotonic.
- Chat: key by `conversation_id`, so a room's messages stay in order even though different rooms interleave freely.

**Interview nuance:** the deadliest trap is assuming global ordering. Candidates say "Kafka keeps events ordered" and design a ledger that reads events across partitions expecting chronological order. It will silently apply a withdrawal before its deposit under load. The senior framing is: order is per-partition only, so causally related events must be co-keyed, and everything else is best treated as unordered.

A second trap: **changing partition count breaks key-to-partition stability.** Because the mapping is `hash(key) mod N`, changing N remaps most keys to different partitions. New events for `account_42` now land in a different partition than the old ones, so its historical order is split across two partitions and ordering is broken for the migration window. That is why partition count is effectively immutable in practice; you over-provision up front instead of resizing later. (Note: partitions can only be added, never removed, and even adding reshuffles the hash.)

The hard operational problem is a **hot key**: one `account_id` (a celebrity, an exchange's omnibus account, a viral post) receives orders of magnitude more traffic than any other, so its partition saturates while others idle. You cannot just split it, because splitting breaks the ordering you keyed for. The real options, in order of preference:

```
Hot key "acct_42" floods partition 3:
 (a) Compound key: hash(account_id + sub_stream) -> spread across a few
     partitions, but ordering now only holds within each sub-stream.
 (b) Salting: key = account_id + (0..k) -> k partitions, then a downstream
     merge/serializer re-establishes per-account order by sequence number.
 (c) Accept it: if the hot key truly needs strict single-stream order,
     one partition is the ceiling; scale vertically and isolate it.
```

Every mitigation trades ordering scope for throughput. There is no free lunch: you either keep strict per-account order (one partition, capped throughput) or you widen the key and downgrade the guarantee to per-sub-stream order plus a reassembly step.

Recap: Kafka orders within a partition only, the partition is chosen by `hash(key) mod N`, so causally related events must share a key; there is no global order; changing partition count remaps keys and breaks ordering, so partition count is fixed up front; and a hot key forces a choice between strict order (one partition, limited throughput) and salting/compound keys (more throughput, weaker ordering scope plus reassembly).

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design partitioning for a payments ledger where all events for one account must be processed in order but the system must scale horizontally; pick the key and handle a celebrity/hot-key account.

**Think about:**
- Why does ordering only hold within a partition?
- Why does changing partition count break key->partition stability?
- How do you handle a hot partition without losing ordering?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a ledger topic of monetary events (credit, debit, hold, release). The invariant is that events for a single account apply in order so a debit never overtakes the credit that funds it, but total volume is high enough that a single partition cannot keep up. Cross-account order does not matter.

**Key by `account_id`.** This is the whole design. Every event for one account hashes to one partition, so that account has a total order and consumers apply its events in offset order. Different accounts land on different partitions and process in parallel, which is exactly the horizontal scaling we want. I would provision partitions generously up front (say 200) because I cannot resize later without breaking key stability: `hash(account_id) mod N` changes for most accounts if N changes, splitting an account's history across two partitions during the migration and violating the ordering invariant. Over-provisioning is the standard defense.

Ordering holds only within a partition because a partition is a single append-only sequence with monotonic offsets, while the topic as a whole is many such sequences interleaved by chance. So co-keying is not an optimization; it is the correctness mechanism.

**Hot key (celebrity/omnibus account).** Suppose one settlement account receives 40% of all traffic and saturates its partition. First, question the requirement: does that account truly need one strict serial order, or is it internally partitionable? If it can be split by sub-ledger (per currency, per merchant, per day), use a **compound key** `account_id + sub_ledger`, which spreads the load across several partitions while preserving order within each sub-ledger, and make the ledger math associative so sub-streams sum correctly. If it genuinely needs one serial stream, I keep it on a single partition and scale that partition vertically (bigger broker, dedicated consumer), and I isolate it so its lag does not starve other accounts, possibly by routing hot accounts to a dedicated topic with its own consumers. As a last resort, **salt** the key (`account_id + [0..k]`) to spread writes, then have a single downstream serializer re-order by an account-level monotonic sequence number before applying, accepting extra latency and complexity for throughput.

Every option trades ordering scope for throughput; I would only widen the key when the ledger semantics genuinely tolerate sub-stream ordering.

Common wrong turn: assuming Kafka gives global order and reading across partitions expecting chronological sequence, which silently applies debits before credits under load.

**Self-check rubric:**
- [ ] Did you key by `account_id` and explain that co-keying is the ordering mechanism, not an optimization?
- [ ] Did you over-provision partitions and explain why resizing breaks `hash(key) mod N`?
- [ ] Did you offer compound-key/salting/isolation for the hot key and name the ordering cost of each?
- [ ] Did you preserve per-account order in every mitigation (e.g., reassembly by sequence when salting)?
- [ ] Did you flag the global-ordering assumption as the classic wrong turn?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the partitioning key for a Coinbase-style crypto matching engine feed where every order for a given trading pair (BTC-USD) must be sequenced in strict arrival order, but BTC-USD alone can be 100x the volume of a quiet pair like a new listing. Choose the key, set partition count, and handle the case where one pair's volume exceeds a single partition's ceiling.

**Model answer (revealed on demand):**

Assumptions: an order-event stream (new, cancel, fill) feeding a per-pair matching engine. The hard invariant is price-time priority: within a pair, orders must be processed in exact arrival order or the matching is wrong and the exchange is liable. Cross-pair order is irrelevant. BTC-USD dominates volume.

**Key by `trading_pair`.** Every event for BTC-USD lands on one partition and is strictly ordered, which is precisely what price-time priority requires; a single matching-engine worker consumes that partition and maintains the order book. Quiet pairs share partitions and process in parallel. This is a case where one strict serial stream per pair is a genuine business requirement, so I do **not** salt or compound the key for a pair, because that would destroy the arrival ordering the matching engine depends on.

The tension is that BTC-USD may exceed a single partition's throughput ceiling (say a few hundred k orders/sec). You cannot spread it across partitions without losing order, so the answer is architectural rather than a Kafka trick. First, keep the events small (order id, side, price, qty, timestamp) and use a compact binary format so one partition goes as far as possible; a single partition can push high-hundreds of MB/s. Second, recognize that the **matching engine itself is single-threaded per pair by design** (LMAX-style), so the partition is not really the bottleneck, the matcher is, and both scale by pair, not within a pair. Third, isolate the hot pairs: route the top handful of pairs (BTC-USD, ETH-USD) each to their own dedicated single-partition topic with dedicated brokers and consumers, so their volume never contends with the long tail, and the long-tail pairs share a multi-partition topic keyed by pair.

Partition count: for the shared long-tail topic, provision generously (say 100) since resizing breaks key stability; for each hot pair, exactly one partition with vertical scaling and an in-memory order book. Common wrong turn: salting BTC-USD to gain throughput, which reorders events and corrupts price-time priority, an unacceptable trade for a matching engine.

### sd-l6-consumer-groups: Consumer Groups, Rebalancing & Scaling

- **id:** `sd-l6-consumer-groups`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** consumer-groups, rebalancing, lag

#### Learn

A **consumer group** is how Kafka scales reads. All consumers sharing a `group.id` cooperatively divide a topic's partitions among themselves, and Kafka guarantees that **each partition is assigned to at most one consumer in the group.** So a group with 4 consumers over a 12-partition topic gives each consumer 3 partitions, and the work is spread. Two different groups (say "ranking" and "analytics") each get the full stream independently, which is how one topic fans out to many pipelines.

The immediate ceiling: **group parallelism is capped by partition count.** With 12 partitions, a 13th consumer sits idle because there is no partition left to give it. This is the number one scaling mistake: adding consumers past the partition count does nothing. You scale reads by having enough partitions in the first place (which is why the previous lesson over-provisions them).

**Offsets and delivery semantics.** Each consumer tracks its position per partition as a committed offset, stored in the internal `__consumer_offsets` topic. When and how you commit decides your delivery guarantee:

- **Auto-commit** (`enable.auto.commit=true`, every 5s) commits on a timer regardless of whether processing finished, so a crash after commit but before processing loses messages (at-most-once-ish) and a crash before commit reprocesses (duplicates). It is convenient and wrong for anything that matters.
- **Manual commit after processing** (commit the offset only once the side effect is durably done) gives **at-least-once**: if you crash after processing but before committing, you reprocess and the handler sees a duplicate. This is the sane default.
- Committing **before** processing gives at-most-once and silently drops work on a crash.

Because the safe choice is at-least-once, **your consumer handlers must be idempotent.** Duplicates are not an edge case; they are guaranteed around every crash and every rebalance.

**Rebalancing** is the sharp edge. When a consumer joins, leaves, or is presumed dead (misses heartbeats), the group **rebalances**: partitions are reassigned across the current members. The classic "eager" protocol is **stop-the-world**: every consumer revokes all its partitions, then the group re-assigns from scratch, so the entire group stops processing for the rebalance duration (hundreds of ms to seconds). During a deploy that restarts 30 consumers one by one, you can trigger 30 rebalances, each a latency and duplicate spike (uncommitted work gets reprocessed by whoever picks the partition up).

```
Group "ranking", topic 6 partitions, 3 consumers:
  C1 -> p0,p1   C2 -> p2,p3   C3 -> p4,p5
C3 dies -> rebalance -> C1 -> p0,p1,p4   C2 -> p2,p3,p5
 Eager: ALL stop, revoke everything, reassign. Cooperative: only p4,p5 move.
```

Modern Kafka fixes this. **Cooperative (incremental) rebalancing** revokes only the partitions that actually need to move (p4, p5 above), so consumers keep processing their unaffected partitions throughout. **Static group membership** (`group.instance.id`) lets a restarting consumer rejoin with its old assignment within `session.timeout.ms`, so a rolling deploy or a brief pod restart causes **no rebalance at all**. And **KIP-848** (the new consumer-group protocol, GA in Kafka 4.0) moves assignment computation to the broker-side group coordinator and makes rebalances fully incremental and much faster, removing the stop-the-world join barrier. Tuning `session.timeout.ms` and `heartbeat.interval.ms` sensibly (e.g., 45s/3s) avoids spurious rebalances from a GC pause or a slow poll.

**Interview nuance:** the health/scaling signal is **consumer lag** (latest offset minus committed offset). Rising lag means you are falling behind; you autoscale consumers on lag, but only up to the partition count, and you alert on it. Do not scale on CPU alone.

Recap: a consumer group splits partitions one-per-consumer so group size is capped by partition count; offset-commit timing sets the delivery guarantee, and commit-after-process gives at-least-once so handlers must be idempotent; rebalancing on membership change is stop-the-world in the eager protocol but is made incremental by cooperative rebalancing, static membership, and KIP-848; and consumer lag is the metric you scale and alert on.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the consumer tier for a stream where you must scale workers from 3 to 30 during peak without stalling processing; explain rebalance behavior and how you avoid duplicate processing during handoff.

**Think about:**
- Why is the group size capped by partition count?
- How do offset-commit strategies create at-least-once behavior?
- How do cooperative rebalancing and KIP-848 reduce stop-the-world?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a topic feeding a worker pool that does per-message work (enrichment, a DB write). Traffic is spiky, so I need to go from 3 to 30 workers at peak and back down, all without stalling the pipeline or corrupting state.

**Partition count first.** Group parallelism is capped by partitions, so to run 30 workers I need at least 30 partitions, and I would provision more (say 60) so I have headroom above 30 and so each worker owns a couple of partitions rather than exactly one (smoother during scaling). This is the load-bearing decision: no amount of autoscaling helps past the partition count, because extra consumers sit idle.

**Scaling mechanism.** Autoscale the worker deployment on **consumer lag**, not CPU: when lag crosses a threshold, add workers up to the partition ceiling; when lag drains, scale down. Each scale event adds or removes group members, which triggers a rebalance, so the goal is to make rebalances cheap.

**Rebalance behavior and avoiding stalls.** Use the **cooperative (incremental) rebalancing** assignor (or KIP-848's new protocol on Kafka 4.0). When I add 10 workers, only the partitions that must migrate to the new members are revoked; every other worker keeps processing its partitions throughout, so there is no stop-the-world stall. KIP-848 further removes the synchronization barrier by computing assignments broker-side, so even large membership changes rebalance in well under a second. I also set **static group membership** (`group.instance.id`) so a routine pod restart or rolling deploy rejoins with the same assignment inside `session.timeout.ms` and causes no rebalance at all, and I tune `session.timeout.ms=45s` / `heartbeat.interval.ms=3s` so a GC pause does not falsely eject a healthy worker.

**Avoiding duplicates at handoff.** Commit offsets **after** processing, which is at-least-once, so when a partition moves mid-batch the new owner reprocesses whatever the old owner did not commit. That means duplicates are guaranteed at every handoff, and the only correct defense is **idempotent handlers**: dedup on an idempotency key or use upserts keyed by event id, so reprocessing is a no-op. I use `ConsumerRebalanceListener.onPartitionsRevoked` to commit final offsets before releasing a partition, which shrinks (but never eliminates) the duplicate window.

Common wrong turn: over-partitioning to thousands (rebalance overhead, weak ordering) or committing offsets before processing (silent data loss on a crash).

**Self-check rubric:**
- [ ] Did you set partition count >= max workers (with headroom) and explain the cap?
- [ ] Did you autoscale on lag rather than CPU?
- [ ] Did you use cooperative/incremental rebalancing (or KIP-848) plus static membership to avoid stop-the-world?
- [ ] Did you commit after processing and require idempotent handlers to absorb handoff duplicates?
- [ ] Did you flag over-partitioning and commit-before-process as wrong turns?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the consumer tier for Uber's real-time driver-location pipeline consuming 1M events/sec, where you deploy new consumer code multiple times a day and each deploy currently causes a visible latency spike from rebalancing. Eliminate the deploy-time stall and explain how you keep processing exactly-once-effectively across the handoff.

**Model answer (revealed on demand):**

Assumptions: a high-volume location topic feeding a stateful geo-index. Deploys happen many times a day via rolling restart, and today each restarted pod leaves and rejoins the group, causing an eager stop-the-world rebalance and a latency spike users notice as stale driver positions.

The root cause is that a rolling deploy churns group membership, and eager rebalancing stops the whole group on every churn. Three changes remove the stall. First, enable **static group membership**: assign each pod a stable `group.instance.id` (from the StatefulSet ordinal) and set `session.timeout.ms` comfortably above the pod restart time (say 5 minutes during deploys). Now when a pod restarts, the coordinator waits for the same instance id to come back and re-hands it the identical partitions with **no rebalance**, so a rolling deploy of 50 pods causes zero reassignments as long as each pod returns within the timeout. Second, adopt the **KIP-848 consumer protocol** (Kafka 4.0) or at minimum the **cooperative sticky assignor**, so any rebalance that does happen (a genuine crash) moves only the affected partitions incrementally instead of stopping the group. Third, size partitions well above peak worker count (e.g., 256 partitions) so the pool has parallelism headroom and each pod owns a small, stable slice.

For correctness across handoff: commit offsets after the geo-index update, giving at-least-once, and make the update **idempotent** by keying the index on `driver_id` with a last-write-wins on event timestamp, so a reprocessed location update is a no-op or an in-order overwrite rather than a corruption. Because the state is local (RocksDB-backed), I use a changelog topic so a pod that does get reassigned rebuilds state from the changelog rather than replaying the whole source. Monitor consumer lag per partition as the SLA signal; a deploy should now show a flat lag line instead of a spike. Common wrong turn: bumping consumer count past 256 expecting more throughput, when the partition count is the real ceiling.

### sd-l6-compaction-retention: Log Compaction, Retention & Tiered Storage

- **id:** `sd-l6-compaction-retention`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** compaction, retention, tiered-storage

#### Learn

Retention is the setting that quietly decides what a topic **is**. The same append-only log can behave as a replayable event stream or as a queryable table depending entirely on how you retain it, and getting this wrong is how teams either blow up storage cost or lose the ability to rebuild state.

There are two fundamentally different retention policies.

**Delete retention (time or size):** keep records for a window, then delete whole old segments. `retention.ms=604800000` keeps 7 days; `retention.bytes` caps total size. This makes a topic a **stream**: an immutable, time-bounded history you can replay within the window. Audit logs, clickstream, and event-sourcing event stores use this. The replay window is the retention window: you can only reprocess as far back as you kept.

**Log compaction (`cleanup.policy=compact`):** instead of deleting by age, Kafka guarantees it retains **at least the latest value for every key**, garbage-collecting superseded older values for the same key in the background. This makes a topic a **table/changelog**: the log is the full edit history, but its compacted tail is the current state of every key. A "current user profile" topic keyed by `user_id` where each record is the newest profile is the canonical case. A brand-new consumer can read the compacted topic from offset 0 and materialize the entire current state (every key's latest value) without a database, which is how Kafka Streams rebuilds a `KTable` and how change-data-capture pipelines bootstrap read models.

```
Compacted topic keyed by user_id, before compaction:
  (u1,"A") (u2,"X") (u1,"B") (u3,"Q") (u1,"C") (u2,"Y")
After compaction keeps latest per key:
  (u3,"Q") (u1,"C") (u2,"Y")   <- current state of every user
```

**Deletes in a compacted topic** use a **tombstone**: a record with the key and a `null` value. Compaction keeps the tombstone long enough for all consumers to observe the deletion, then removes both the tombstone and all prior values for that key. This is how a changelog represents "user deleted."

**Interview nuance:** GDPR/right-to-erasure collides with long retention. An immutable 7-year audit stream cannot literally delete one user's records without breaking immutability, so the standard pattern is **crypto-shredding**: encrypt per-subject data with a per-user key and delete the key to render the data unrecoverable, rather than mutating the log. On a compacted topic, a tombstone plus compaction does the erasure directly.

**Tiered storage** (KIP-405, GA) decouples retention cost from broker disk. Hot recent segments stay on local broker SSD for low-latency reads; cold older segments are offloaded to object storage (S3, GCS) transparently, and consumers reading old offsets fetch from object storage automatically. This is what makes **cheap long or effectively infinite retention** viable: you keep 7 years of audit data at S3 prices (cents/GB/month) instead of provisioning years of broker SSD, and brokers rebalance faster because they hold less local data.

The subtle correctness trap ties this module to delivery guarantees: your **dedup/idempotency window must be at least as long as the replay/retention window.** If you keep 7 days of events but your consumer only remembers processed ids for 24 hours, then replaying day-6 events (after a bug fix) sails past the dedup memory and **double-applies** them. Retention and dedup must be sized together.

Recap: delete-retention makes a topic a replayable stream bounded by its window; log compaction keeps the latest value per key and makes a topic a rebuildable table/changelog (with tombstones for deletes); tiered storage puts cold segments in object storage for cheap long retention; GDPR erasure on immutable logs uses crypto-shredding or tombstones; and the dedup window must be at least the replay window or replays double-apply.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design storage for two topics: an immutable audit event stream kept 7 years cheaply, and a 'current user profile' changelog; choose retention/compaction and storage tier for each.

**Think about:**
- When do you use time/size retention vs log compaction?
- How does compaction give table/changelog semantics and enable state rebuild?
- How does tiered storage decouple retention cost from broker disk?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: the audit stream is an append-only record of security-relevant actions that compliance requires kept 7 years and that must be replayable and immutable. The user-profile topic must let any service (and any new read model) know the current profile of every user and rebuild that state from scratch.

**Audit stream: delete-retention + tiered storage.** This is a pure event stream, so `cleanup.policy=delete` with `retention.ms` set to 7 years. I never compact it, because every event matters individually (compaction would drop superseded records, destroying the audit trail). Seven years of events would be enormous on broker SSD, so I enable **tiered storage**: hot recent segments (say the last 7-30 days, the ones queried often) stay on local SSD, and everything older offloads to S3 at a few cents/GB/month. Replay of an old range fetches transparently from S3. Durability is RF=3 with `acks=all` and `min.insync.replicas=2` so no acknowledged audit event is lost. For GDPR erasure without mutating the immutable log, I **crypto-shred**: encrypt per-user fields with a per-user key and delete the key to erase, preserving immutability.

**User-profile changelog: log compaction.** This is a table, not a stream, so `cleanup.policy=compact`, keyed by `user_id`, each record the latest full profile (or a merged patch). Compaction keeps at least the latest value per key, so the compacted tail is the current profile of every user. A new service, or a rebuilt search index, reads from offset 0 and materializes the entire current-state table with no separate database, which is exactly `KTable`/CDC bootstrap behavior. A deleted user is a **tombstone** (key + null), retained long enough (`delete.retention.ms`) for all consumers to see the deletion before it is compacted away. I can also set `min.compaction.lag.ms` so very recent updates are not compacted before a lagging consumer reads them. Storage stays small because only the latest value per key survives, so tiered storage is optional here.

The unifying idea: retention policy is a semantic choice. Delete-retention = replayable history (stream); compaction = current-state table (changelog). Common wrong turn: setting a dedup window on the audit consumers shorter than the 7-year retention, so a replay after a fix double-applies old events. Size the dedup/idempotency window to cover the replay window (or make handlers idempotent by construction).

**Self-check rubric:**
- [ ] Did you pick delete-retention for the audit stream and compaction for the profile changelog, and say why each fits?
- [ ] Did you use tiered storage to make 7-year retention cheap and name the hot/cold split?
- [ ] Did you explain compaction enabling state rebuild from offset 0 (KTable/CDC bootstrap)?
- [ ] Did you handle deletes with tombstones and GDPR erasure with crypto-shredding?
- [ ] Did you flag the dedup-window-shorter-than-replay-window trap?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the retention and storage strategy for Netflix's viewing-history platform: an immutable "play events" stream (billions/day) that data science replays for months, plus a "current playback position per profile per title" changelog that the resume-watching feature reads with single-digit-ms latency. Choose policies, storage tiers, and handle a title being pulled from the catalog for legal reasons.

**Model answer (revealed on demand):**

Assumptions: play events are high-volume immutable facts (play, pause, seek, stop) that ML pipelines reprocess for up to 6 months to retrain models; the playback-position store must return "where did profile P stop in title T" instantly so resume-watching is snappy.

**Play-events stream: delete-retention + tiered storage.** `cleanup.policy=delete`, `retention.ms` at 6 months to cover the ML replay horizon. At billions/day this is petabytes, so **tiered storage is mandatory**: keep roughly the last 7 days hot on broker SSD for real-time consumers (personalization, fraud) and offload the rest to S3, where 6-month retention costs S3 rates rather than broker SSD rates. ML backfills read old offsets straight from S3. Key by `profile_id` so one profile's events stay ordered for sessionization. Durability RF=3, `acks=all`, `min.insync.replicas=2`. Critically, size the ML pipeline's idempotency/dedup to cover the full 6-month replay window (or make its aggregations idempotent), so a reprocess does not double-count watch time.

**Playback-position changelog: log compaction.** `cleanup.policy=compact`, keyed by `(profile_id, title_id)`, each record the latest position. Compaction keeps the latest position per key, so the resume feature reads current state. For single-digit-ms reads I do not serve this from Kafka directly; I materialize the compacted changelog into a fast key-value store (DynamoDB or Redis) via Kafka Streams or a consumer, and the compacted topic is the durable source of truth that can rebuild that store from offset 0 after a wipe. Compaction keeps the changelog and its downstream store small regardless of how many pauses a user racks up.

**Title pulled for legal reasons.** For the compacted changelog, emit **tombstones** (`(profile_id, title_id)` -> null) for every position tied to that title, which compaction propagates and which removes the resume entries; downstream stores apply the tombstone as a delete. For the immutable play-events stream I do not rewrite history; I either **crypto-shred** the title's records by dropping its encryption key or add a suppression/filter list so consumers exclude the pulled title, preserving the log's immutability while making the content effectively unavailable. Common wrong turn: trying to mutate the immutable stream in place, which breaks replayability and offsets.
