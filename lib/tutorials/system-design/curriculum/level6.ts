/**
 * System Design — Level 6: Asynchronous & Event-Driven Systems.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l6-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L6. 15 lessons across 5
 * modules (sd-l6-m1..m5). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const syncVsAsyncTeach = `
## The chain of availability

A synchronous call blocks the caller until the callee returns. The caller's latency is the sum of
every hop, and the caller's availability is the product of every downstream's availability. Chain
five services at 99.9 percent each synchronously and your effective availability is about 99.5
percent, because any one being down fails the whole request. Async breaks that chain by putting a
broker between producer and consumer.

Async buys you three specific decouplings, and naming them is how you sound senior:

- **Time decoupling (buffering).** The producer writes to the broker and moves on; the consumer
  processes later, at its own pace. A traffic spike that would overwhelm a synchronous downstream
  instead grows a queue that drains when load falls.
- **Space decoupling (location).** The producer does not know or care which service, or how many of
  them, consume the message. You add a fraud checker or a new analytics consumer without touching the
  producer.
- **Synchronization decoupling (non-blocking).** The producer does not wait for the work to finish.
  Its latency drops to the cost of one durable write to the broker (single-digit ms) instead of the
  sum of all downstream work.

The price is eventual consistency. The moment you make a step async, the effect (inventory
decremented, email sent) happens after the response, so a follow-up read can observe a state where
the effect has not landed yet. You must design for that gap.

### Command versus event

A **command** ("ChargeCard") is an instruction to one specific handler that must succeed and often
returns a result, so it tends to stay synchronous. An **event** ("OrderPlaced") is an immutable
statement of fact that already happened; any number of consumers react to it, and the producer does
not care what they do. Events point the coupling arrow away from the producer, which is why they
scale fan-out cleanly.

The failure mode also inverts. Synchronously, a failure is an error returned to the caller who can
retry right now. Async pushes failure into the background: a consumer that throws must be retried
with backoff, and after N failures the message lands in a dead-letter queue (DLQ). You now need retry
policy, idempotent consumers (because retries duplicate), a DLQ, and monitoring on consumer lag and
DLQ depth. The user already got a 200; nobody is watching the screen when the async step breaks.

**Interview nuance:** the wrong turn is adding a broker to simple CRUD that needs a strong-consistency
read right after the write. If a user saves a setting and immediately reads it back, an async write
behind a queue gives them a stale read and a support ticket. Async pays off when the follow-up work
is genuinely independent of the response.

\`\`\`
Sync:   client -> [payment] -> [inventory] -> [email] -> [analytics] -> 200
        latency = sum of all; one down = request fails

Async:  client -> [payment] -> 200
                       |
                   OrderPlaced --> broker --> [inventory]
                                          --> [email]
                                          --> [analytics]
\`\`\`

Recap: async decouples in time, space, and synchronization, trading immediate consistency for
throughput and availability; keep steps synchronous when the caller needs the result or a consistent
read, and make independent side effects events.
`.trim()

const queuePubsubLogTeach = `
## Three models hiding under "messaging"

Picking the wrong one is one of the most common design-review mistakes, so learn to name them
precisely.

**Point-to-point queue** (Amazon SQS, RabbitMQ, a Redis list). Producers push messages; a pool of
competing consumers pulls them. Each message is delivered to exactly one consumer in the pool, and
once that consumer acks, the message is deleted. This is work distribution: add consumers to process
faster, and no two workers do the same job. The defining property is that the message is consumed and
gone. No replay, no second reader. RabbitMQ adds routing (exchanges, bindings) and per-message DLQs;
SQS adds a visibility timeout so an un-acked message reappears for another worker after a crash.

**Pub/sub** (Amazon SNS, Google Pub/Sub topics, RabbitMQ fanout). A producer publishes to a topic;
every subscriber gets its own copy. This is fan-out: one \`OrderPlaced\` reaches email, analytics,
and fraud independently. Classic pub/sub is often fire-and-forget: if a subscriber is down when the
message is published and there is no per-subscriber durable queue, that subscriber misses it. The
common production pattern is SNS-to-SQS fan-out, where the topic delivers a copy into each
subscriber's own durable queue so slow or offline subscribers do not lose messages.

**Log / stream** (Apache Kafka, Amazon Kinesis, Apache Pulsar). Messages are appended to a durable,
ordered, append-only log and retained by time or size (say seven days), regardless of who has read
them. Consumers do not delete messages; each consumer group tracks its own **offset** (a cursor) into
the log and reads forward. Because the data stays and each group has an independent cursor, a log
gives you both fan-out (many groups) and replay (rewind an offset to reprocess history). A brand-new
analytics team can start today and read the last 30 days from offset zero.

### The two axes: retention and who tracks delivery

\`\`\`
              delete on consume?     who tracks position?      replay?    fan-out?
Queue (SQS)         yes              broker (per message ack)     no       no (competing)
Pub/Sub (SNS)   yes (per sub)        broker (per subscriber)      no       yes
Log (Kafka)          no             consumer (own offset)         yes      yes (per group)
\`\`\`

A queue's broker tracks per-message delivery and acks; it is push-ish and the broker owns state. A
log is pull-based: the consumer owns its offset, which is why one slow consumer group cannot slow
another and why replay is just "reset my offset." That consumer-owned-offset design is the whole
reason a log scales to many independent readers and supports reprocessing.

**Interview nuance:** the classic wrong turn is choosing a queue when the requirement is "multiple
independent teams, each reading the full stream, some needing to replay 30 days." A queue deletes on
consume and serves one consumer per message. The moment you hear "replay," "reprocess," or "N
independent consumer groups over the same data," reach for a log.

Recap: a queue distributes work and deletes on ack (no replay); pub/sub fans a copy to every
subscriber; a log retains an ordered stream that many consumer groups read at their own offset and
can replay.
`.trim()

const brokerSelectionTeach = `
## "We'll use Kafka" is usually the wrong reflex

The senior move is to name the decision drivers, then match the workload to the cheapest tool that
satisfies them. Kafka is a superb distributed log, but it is also operationally heavy (partitions,
consumer groups, rebalancing, retention tuning, and a ZooKeeper or KRaft quorum to run). If you do
not need what it gives, you are paying its tax for nothing.

The drivers to reason about out loud:

- **Throughput.** Millions of messages/sec favors a partitioned log (Kafka, Kinesis, Pulsar).
  Thousands/sec is comfortable for any queue.
- **Ordering.** Need per-key ordering? A log gives per-partition order; SQS FIFO gives per-group
  order; standard SQS gives none.
- **Retention and replay.** Need to reprocess history or feed many independent consumers? You need a
  log. Queues delete on consume.
- **Delivery guarantee.** At-least-once is the default everywhere; per-message ack and redelivery are
  a queue strength; exactly-once-ish processing needs extra machinery.
- **Routing complexity.** Rich topic/header routing, priorities, per-message TTL, and DLQs are
  RabbitMQ's home turf.
- **Ops budget.** A small team with no streaming platform should lean on managed services (SQS, SNS,
  Google Pub/Sub, Kinesis, MSK) before self-hosting Kafka.

### The landscape

\`\`\`
Logs / streams:   Kafka, Pulsar, Kinesis   -> high throughput, ordering, retention, replay
Queues:           RabbitMQ, SQS            -> per-message ack, routing, DLQ, work distribution
Managed fan-out:  SNS, Google Pub/Sub      -> topic fan-out without running a broker
Ordered managed:  SQS FIFO                 -> per-group ordering, exactly-once-ish, lower throughput
Lightweight:      NATS, Redis Streams      -> low latency, simple ops, smaller durability guarantees
\`\`\`

RabbitMQ is a smart broker for complex routing and per-message workflows at moderate scale; SQS is a
zero-ops managed queue for work distribution and decoupling on AWS; Kafka is a durable replayable log
for high-throughput streaming and multi-consumer fan-out.

**Pulsar** is the classic "why not Kafka" foil: it separates compute (brokers) from storage
(BookKeeper), so you scale serving and storage independently, and it has first-class multi-tenancy,
geo-replication, and tiered storage built in, supporting both queue and log semantics in one system.
The cost is a more complex deployment. Choose it when multi-tenancy or independent compute/storage
scaling is a real requirement, not by default. **NATS and Redis Streams** cover the low-latency,
lightweight end when you want simple pub/sub or a small stream with minimal ops.

**Interview nuance:** the strongest answer is sometimes "no broker at all." If the requirement is a
strong-consistency CRUD read after write, a broker adds latency and a stale-read window for nothing;
a direct synchronous call or a database is correct. Reaching for Kafka to decouple two services that
make ten calls a second is over-engineering you should call out.

Recap: match the broker to the drivers (throughput, ordering, retention/replay, delivery, routing,
ops budget); use a log only when replay/throughput justify its ops, a queue for work distribution and
routing, managed services when the team is small, and sometimes no broker at all.
`.trim()

const kafkaInternalsTeach = `
## Not a fast queue: a replicated commit log

Kafka is a distributed, replicated, append-only **commit log**, and almost every property people
admire falls out of that one design choice. A **topic** is a named log split into **partitions**.
Each partition is an ordered, immutable sequence of records, and every record gets a monotonically
increasing **offset** (0, 1, 2, ...). That is the entire data model: no per-message delete, no random
insert, no in-place update. Producers append to the tail; consumers read forward from an offset they
control.

### Why it is fast

**Sequential disk writes:** appending to the end of a file is the one access pattern spinning disks
and SSDs both love, so Kafka sustains hundreds of MB/s per broker. **Page cache:** Kafka writes to
the OS page cache and lets the kernel flush, so recent data is served from RAM with no user-space
copy. **Zero-copy:** on read, \`sendfile()\` moves bytes from page cache straight to the network
socket without dragging them through the JVM heap. Add producer-side **batching and compression**
(lz4/zstd, batches keyed by \`linger.ms\` and \`batch.size\`) and one cluster handles millions of
events per second.

### Durability from replication

Each partition has one **leader** and N-1 **followers** (replication factor typically 3). Followers
pull from the leader and, when caught up, sit in the **in-sync replica (ISR)** set. Two settings
decide the trade:

- **\`acks\`** on the producer: \`acks=0\` (fire and forget, can lose data), \`acks=1\` (leader
  persisted, but a leader crash before replication loses acknowledged writes), \`acks=all\` (leader
  waits for all ISR members).
- **\`min.insync.replicas\`** on the broker: the minimum ISR size for an \`acks=all\` write to be
  accepted. With RF=3 and \`min.insync.replicas=2\`, a write needs the leader plus one follower, so
  you survive one broker loss with zero acknowledged-message loss and still accept writes.

**Interview nuance:** \`acks=all\` alone is not durable. If \`min.insync.replicas=1\`, "all ISR" can
mean "just the leader" after followers drop out, so a leader crash still loses acknowledged writes.
The durable combination is \`acks=all\` **and** \`min.insync.replicas>=2\` **and** RF>=3.

\`\`\`
Topic "rides", partition 3:
 offset:  0    1    2    3    4  <- append here (tail)
 record: [r0] [r1] [r2] [r3] [r4]
 Leader (broker 1) --replicate--> Follower (b2), Follower (b3)
 ISR = {1,2,3}. acks=all + min.insync.replicas=2 -> survives 1 loss.
\`\`\`

**Log segments and retention:** a partition is stored as segment files that roll by size/time; old
segments are deleted (time/size retention) or compacted. **Tiered storage** (KIP-405) offloads cold
segments to S3-class object storage so retention cost decouples from broker disk. Finally, **KRaft**
(GA, default in Kafka 4.0) replaced ZooKeeper: cluster metadata now lives in an internal Raft quorum
of controllers, removing the external dependency, speeding failover, and scaling to far more
partitions.

Recap: Kafka is a partitioned append-only log; sequential writes, page cache, and zero-copy explain
its throughput; durability is leader/follower replication tuned by acks plus min.insync.replicas over
the ISR (durable = acks=all + min.insync.replicas>=2 + RF3); retention, segments, compaction, and
tiered storage govern cost and replay; and KRaft removed ZooKeeper by making metadata a Raft quorum.
`.trim()

const partitioningOrderingTeach = `
## One ordering guarantee, and it burns candidates

Kafka gives you exactly one ordering guarantee: **records are totally ordered within a partition, and
there is no ordering across partitions.** A partition is a single append-only sequence, so offset
order equals arrival order there. But a topic with 100 partitions is 100 independent sequences
interleaved by wall-clock chance. If event X lands in partition 4 and event Y lands in partition 7,
Kafka makes no promise about whether a consumer sees X or Y first. There is no global clock and no
global sequence.

This is not a limitation to work around; it is the direct cost of parallelism. The only reason Kafka
scales horizontally is that partitions are independent, so anything needing global order would need a
single partition, capping you at one broker's throughput and one consumer.

### The key is correctness

A producer computes the partition as \`hash(key) mod partition_count\` (default murmur2). So **all
records with the same key go to the same partition and are totally ordered relative to each other.**
Correctness reduces to one question: which events must be seen in order relative to each other?
Whatever that set is, it must share a key.

- Bank account: key by \`account_id\`, so deposit-then-withdraw for one account is never reordered
  into overdraft.
- Order lifecycle: key by \`order_id\`, so \`created -> paid -> shipped\` stays monotonic.
- Chat: key by \`conversation_id\`, so a room's messages stay in order even though rooms interleave.

**Interview nuance:** the deadliest trap is assuming global ordering. Candidates say "Kafka keeps
events ordered" and design a ledger that reads events across partitions expecting chronological
order. It will silently apply a withdrawal before its deposit under load. The senior framing: order
is per-partition only, so causally related events must be co-keyed.

A second trap: **changing partition count breaks key-to-partition stability.** Because the mapping is
\`hash(key) mod N\`, changing N remaps most keys. New events for \`account_42\` land in a different
partition than the old ones, so its historical order splits across two partitions for the migration
window. That is why partition count is effectively immutable in practice; you over-provision up front.
(Partitions can be added, never removed, and even adding reshuffles the hash.)

### The hot key

One \`account_id\` (a celebrity, an omnibus account, a viral post) can flood its partition while
others idle. You cannot just split it, because splitting breaks the ordering you keyed for. Options,
in order of preference:

\`\`\`
Hot key "acct_42" floods partition 3:
 (a) Compound key: hash(account_id + sub_stream) -> spread across a few
     partitions, but ordering now only holds within each sub-stream.
 (b) Salting: key = account_id + (0..k) -> k partitions, then a downstream
     merge/serializer re-establishes per-account order by sequence number.
 (c) Accept it: if the hot key truly needs strict single-stream order,
     one partition is the ceiling; scale vertically and isolate it.
\`\`\`

Every mitigation trades ordering scope for throughput. You either keep strict per-account order (one
partition, capped throughput) or widen the key and downgrade to per-sub-stream order plus reassembly.

Recap: Kafka orders within a partition only, the partition is chosen by hash(key) mod N so causally
related events must share a key; there is no global order; changing partition count remaps keys and
breaks ordering, so partition count is fixed up front; and a hot key forces a choice between strict
order (one partition, limited throughput) and salting/compound keys (more throughput, weaker
ordering plus reassembly).
`.trim()

const consumerGroupsTeach = `
## How Kafka scales reads

A **consumer group** is how Kafka scales reads. All consumers sharing a \`group.id\` cooperatively
divide a topic's partitions, and Kafka guarantees **each partition is assigned to at most one
consumer in the group.** A group with 4 consumers over a 12-partition topic gives each consumer 3
partitions. Two different groups ("ranking" and "analytics") each get the full stream independently:
that is how one topic fans out to many pipelines.

The immediate ceiling: **group parallelism is capped by partition count.** With 12 partitions, a 13th
consumer sits idle. This is the number one scaling mistake: adding consumers past the partition count
does nothing. You scale reads by having enough partitions in the first place.

### Offsets and delivery semantics

Each consumer tracks its position per partition as a committed offset in the internal
\`__consumer_offsets\` topic. When and how you commit decides your delivery guarantee:

- **Auto-commit** (every 5s) commits on a timer regardless of whether processing finished, so a crash
  after commit but before processing loses messages, and a crash before commit reprocesses.
  Convenient and wrong for anything that matters.
- **Manual commit after processing** (commit only once the side effect is durably done) gives
  **at-least-once**: crash after processing but before committing and you reprocess a duplicate. The
  sane default.
- Committing **before** processing gives at-most-once and silently drops work on a crash.

Because the safe choice is at-least-once, **your consumer handlers must be idempotent.** Duplicates
are guaranteed around every crash and every rebalance.

### Rebalancing, the sharp edge

When a consumer joins, leaves, or is presumed dead (misses heartbeats), the group **rebalances**:
partitions are reassigned. The classic "eager" protocol is **stop-the-world**: every consumer revokes
all its partitions, then the group reassigns from scratch, so the entire group stops for the
rebalance (hundreds of ms to seconds). A deploy that restarts 30 consumers one by one can trigger 30
rebalances, each a latency and duplicate spike.

\`\`\`
Group "ranking", topic 6 partitions, 3 consumers:
  C1 -> p0,p1   C2 -> p2,p3   C3 -> p4,p5
C3 dies -> rebalance -> C1 -> p0,p1,p4   C2 -> p2,p3,p5
 Eager: ALL stop, revoke everything, reassign. Cooperative: only p4,p5 move.
\`\`\`

**Cooperative (incremental) rebalancing** revokes only the partitions that must move, so consumers
keep processing unaffected partitions. **Static group membership** (\`group.instance.id\`) lets a
restarting consumer rejoin with its old assignment within \`session.timeout.ms\`, so a rolling deploy
causes **no rebalance at all**. And **KIP-848** (the new consumer-group protocol, GA in Kafka 4.0)
moves assignment computation to the broker-side coordinator and makes rebalances fully incremental,
removing the stop-the-world join barrier. Tuning \`session.timeout.ms\`/\`heartbeat.interval.ms\`
sensibly (e.g., 45s/3s) avoids spurious rebalances from a GC pause.

**Interview nuance:** the health/scaling signal is **consumer lag** (latest offset minus committed
offset). Rising lag means you are falling behind; autoscale consumers on lag, but only up to the
partition count, and alert on it. Do not scale on CPU alone.

Recap: a consumer group splits partitions one-per-consumer so group size is capped by partition
count; offset-commit timing sets the delivery guarantee, and commit-after-process gives at-least-once
so handlers must be idempotent; rebalancing is stop-the-world in the eager protocol but made
incremental by cooperative rebalancing, static membership, and KIP-848; and consumer lag is the
metric you scale and alert on.
`.trim()

const compactionRetentionTeach = `
## Retention decides what a topic *is*

The same append-only log behaves as a replayable event stream or as a queryable table depending
entirely on how you retain it, and getting this wrong is how teams either blow up storage cost or
lose the ability to rebuild state.

### Two fundamentally different retention policies

**Delete retention (time or size):** keep records for a window, then delete whole old segments.
\`retention.ms=604800000\` keeps 7 days; \`retention.bytes\` caps total size. This makes a topic a
**stream**: an immutable, time-bounded history you can replay within the window. Audit logs,
clickstream, and event-sourcing event stores use this. The replay window is the retention window.

**Log compaction (\`cleanup.policy=compact\`):** instead of deleting by age, Kafka guarantees it
retains **at least the latest value for every key**, garbage-collecting superseded older values in
the background. This makes a topic a **table/changelog**: the log is the full edit history, but its
compacted tail is the current state of every key. A "current user profile" topic keyed by
\`user_id\` is the canonical case. A brand-new consumer reads the compacted topic from offset 0 and
materializes the entire current state without a database: how Kafka Streams rebuilds a \`KTable\` and
how CDC pipelines bootstrap read models.

\`\`\`
Compacted topic keyed by user_id, before compaction:
  (u1,"A") (u2,"X") (u1,"B") (u3,"Q") (u1,"C") (u2,"Y")
After compaction keeps latest per key:
  (u3,"Q") (u1,"C") (u2,"Y")   <- current state of every user
\`\`\`

**Deletes in a compacted topic** use a **tombstone**: a record with the key and a \`null\` value.
Compaction keeps the tombstone long enough for all consumers to observe the deletion, then removes
both the tombstone and all prior values for that key.

**Interview nuance:** GDPR/right-to-erasure collides with long retention. An immutable 7-year audit
stream cannot literally delete one user's records without breaking immutability, so the standard
pattern is **crypto-shredding**: encrypt per-subject data with a per-user key and delete the key to
render the data unrecoverable, rather than mutating the log. On a compacted topic, a tombstone plus
compaction does the erasure directly.

**Tiered storage** (KIP-405, GA) decouples retention cost from broker disk: hot recent segments stay
on local broker SSD; cold older segments offload to object storage (S3, GCS) transparently, and
consumers reading old offsets fetch from object storage automatically. This makes cheap long or
effectively infinite retention viable: 7 years of audit data at S3 prices instead of years of broker
SSD, and brokers rebalance faster.

The subtle correctness trap: your **dedup/idempotency window must be at least as long as the
replay/retention window.** If you keep 7 days of events but your consumer only remembers processed
ids for 24 hours, replaying day-6 events sails past the dedup memory and **double-applies** them.
Retention and dedup must be sized together.

Recap: delete-retention makes a topic a replayable stream bounded by its window; log compaction keeps
the latest value per key and makes a topic a rebuildable table/changelog (with tombstones for
deletes); tiered storage puts cold segments in object storage for cheap long retention; GDPR erasure
on immutable logs uses crypto-shredding or tombstones; and the dedup window must be at least the
replay window or replays double-apply.
`.trim()

const deliverySemanticsTeach = `
## Three promises a pipeline can make

Every message pipeline makes one of three promises, and stating which one, end to end, is the single most important sentence in an async design.

**At-most-once**: a message is delivered zero or one times. You never see a duplicate, but you can lose messages. You get this by acknowledging (committing your read position) *before* you process. If the consumer crashes after the commit but before the work finishes, that message is gone forever. Fine for a metrics sample or a best-effort log line, unacceptable for a payment.

**At-least-once**: a message is delivered one or more times. You never lose a message, but you can see duplicates. You get this by processing *first* and acknowledging *after* success. If the consumer crashes after processing but before the ack, the broker redelivers on restart and you process again. This is the practical default for anything that matters, because losing data is usually worse than repeating work, and repeats can be neutralized (see the idempotency lesson).

**Exactly-once**: every message takes effect once, no loss, no duplicate. This is what everyone wants and what the network cannot give you.

## Exactly-once delivery over a network is impossible

Here is the sentence that separates a senior answer from a junior one. **Exactly-once delivery over a network is impossible.** The sender transmits a message and waits for an ack. If the ack does not arrive, the sender cannot distinguish "the message was lost" from "the message arrived and the ack was lost." Its only two moves are resend (risk a duplicate, that is at-least-once) or give up (risk a loss, that is at-most-once). No protocol escapes this, because the failure is indistinguishable from the receiving side's silence. This is the Two Generals problem in production clothing.

So what do the vendors mean by "exactly-once"? They mean **exactly-once processing**, achieved by taking at-least-once delivery and making the effect idempotent or transactional so that duplicates do not change the outcome. You convert a delivery guarantee into a processing guarantee at the consumer.

\`\`\`
  producer --(at-least-once delivery, may duplicate)--> broker --> consumer
                                                                      |
                              [ idempotency / transaction here ]  <---+
                                                                      |
                                                            effectively-once effect
\`\`\`

## Interview nuance: what Kafka EOS actually covers

Kafka's "exactly-once semantics" (EOS) is real but narrowly scoped. It combines an idempotent producer (dedups producer retries into a partition using a producer id and sequence number) with transactions that atomically commit the consumer's read offset and the produced output records together. That gives exactly-once for a **read-process-write loop that stays inside Kafka**. It does **not** extend to external side effects. If your consumer sends an email, calls Stripe, or writes to a non-transactional database, Kafka EOS does nothing for those, and you must add an idempotency key yourself. Claiming Kafka gives you end-to-end exactly-once including third-party charges is the classic wrong turn.

Where the ack sits is the whole game: commit-before-process is at-most-once, process-before-commit is at-least-once. Pick at-least-once plus idempotency for anything with real-world consequences.

**Recap:** three guarantees (lose / duplicate / neither), exactly-once delivery over a network is impossible so you get exactly-once *processing* via idempotency or transactions, Kafka EOS is scoped to read-process-write inside Kafka only, and ack timing decides which guarantee you actually have.
`.trim()

const idempotencyDedupTeach = `
## Idempotency is your defense against duplicates

Once you accept at-least-once delivery (and you should for anything that matters), **idempotency is your primary defense against duplicate side effects**. An operation is idempotent if performing it twice has the same observable effect as performing it once. The goal is that a redelivered message, a client retry after a timeout, or a double-tapped "Pay" button all converge to a single outcome.

There are three flavors, in rough order of preference:

1. **Naturally idempotent operations.** \`SET status = shipped\` or an upsert keyed by a stable id is idempotent for free; applying it twice lands in the same state. Prefer designing operations this way. \`INCR balance\` is the opposite: repeating it corrupts state, so counters need explicit protection.
2. **Idempotent by design via state machines.** Model the aggregate as states with legal transitions (\`CREATED -> PAID -> SHIPPED\`). A command that tries an already-taken transition is a no-op. Combined with a per-aggregate **expected version** (optimistic concurrency), a replayed or stale command is simply rejected.
3. **Enforced idempotency via a dedup store.** For everything else, attach an **idempotency key** (a client-supplied UUID, or the event id) and keep a **dedup store** that records which keys you have already processed, with the result.

## Store the result, not a boolean

The single most important detail: the dedup store must save the **result**, not just a "seen" flag. If you store only a boolean, two concurrent duplicates both see "not seen," both execute, and now you have diverged and no stored answer to return. Store the outcome (the created order id, the HTTP response body) keyed by the idempotency key, and return it verbatim on any repeat.

## The concurrent-duplicate race

**The concurrent-duplicate race** is what interviewers probe. Two copies of the same request arrive at two servers at the same millisecond. A read-then-write check ("is this key present? no -> insert") has a race between the read and the write where both pass. You must make the check-and-set **atomic**:

\`\`\`
  INSERT INTO idempotency_keys (key, status, result)
  VALUES ($1, 'in_progress', NULL)
  ON CONFLICT (key) DO NOTHING;
  -- exactly one inserter wins the unique constraint; the loser
  -- re-reads the row and waits for / returns the winner's result
\`\`\`

A unique constraint (or a Redis \`SET key value NX\`, or a DynamoDB conditional \`PutItem\` with \`attribute_not_exists\`) makes exactly one writer win. The loser reads back the row: if it is \`in_progress\`, it waits or returns 409/retry; if \`completed\`, it returns the stored result.

## Sizing the dedup window

The dedup store keeps keys for a TTL. That TTL must be **at least as long as the longest window in which a duplicate can arrive.** Two windows matter: client retry horizon (how long clients keep retrying, minutes) and broker **replay/retention** window (Kafka can replay days of history during a reprocess or consumer reset). If your dedup TTL is 1 hour but you replay a 3-day-old topic, every replayed message looks new and re-applies. Size the TTL to cover the replay window, or use a permanent natural key so replays are inherently safe.

**Interview nuance:** distinguish the idempotency key's *scope*. A client-supplied key dedups client retries of the same logical request. An event-id key dedups broker redeliveries. They are different keys guarding different duplicate sources, and a robust design often uses both.

**Recap:** idempotency neutralizes at-least-once duplicates via natural idempotency, state machines with expected-version checks, or a dedup store that saves the *result* under an idempotency key; resolve the concurrent race with an atomic check-and-set (unique constraint), and size the TTL to cover both the client-retry and broker-replay windows.
`.trim()

const retriesDlqBackpressureTeach = `
## Failure handling decides whether your pipeline degrades or wedges

A consumer that calls anything flaky (a third-party API, a downstream service) will hit failures. How you handle those failures decides whether your pipeline degrades gracefully or wedges completely.

**Retries with backoff and jitter.** Transient failures (a 503, a timeout, a throttle) should be retried, but naively retrying immediately in a tight loop turns a downstream blip into a self-inflicted DDoS. Use **exponential backoff** (wait 1s, 2s, 4s, 8s) plus **jitter** (randomize the delay) so a fleet of consumers that all failed at once do not retry in a synchronized thundering herd. Cap the attempts (say 5) so a permanently broken message does not retry forever.

**Transient vs permanent errors.** Classify the failure. A timeout or 429 is transient: retry it. A 400 "malformed payload" or a schema violation is permanent: retrying will never succeed, so send it straight to the dead-letter queue instead of burning 5 attempts. Blindly retrying permanent errors wastes capacity and delays the DLQ signal.

## The dead-letter queue

When a message exhausts its retries (or fails permanently), you must not drop it silently and you must not let it block the stream. You route it to a **dead-letter queue or topic**: a separate destination holding failed messages with their error context and attempt count. The DLQ needs three things to be useful: **alerting** (DLQ depth greater than zero pages someone), **inspection** (you can read why each message failed), and **redrive** (tooling to replay fixed messages back onto the main topic after you deploy a fix). A DLQ with no alerting is just a place data goes to die.

## Head-of-line blocking, the core Kafka trap

A Kafka partition is a strictly ordered log, and a consumer processes it in order, one offset at a time. If message at offset 100 keeps failing and you retry it in place, you **cannot advance to offset 101** without either committing past the failure (losing it) or blocking forever. One poison message stalls the entire partition and everything behind it. This is head-of-line blocking, and it is the number one wrong turn in async design.

\`\`\`
  partition:  ... 98  99  [100 FAILS] 101  102  103 ...
                            ^ retrying in place
                            everything behind 100 is stuck
\`\`\`

The fix is to **not retry in place on the ordered partition**. Two standard patterns: (a) move the failed message to a **retry topic** (often a tiered set: \`retry-5s\`, \`retry-1m\`, \`retry-10m\`) with a delay, commit the original offset, and let the main partition flow; a separate consumer drains the retry topic after the delay. (b) After N retries, move it to the DLQ. Either way the main partition never blocks on one bad message. The tradeoff: moving a message off the ordered partition **breaks strict ordering** for that key, so this is for workloads where per-message success matters more than strict order, or where you accept reordering on failure.

## Backpressure

When a consumer is slower than the producer, something has to give. With a **pull-based** log like Kafka, the consumer fetches at its own pace and simply falls behind; the **durable log is the buffer**, absorbing the backlog on disk (days of retention) instead of overflowing memory or dropping data. **Consumer lag** (how many messages behind the head you are) is the health signal, and you respond by **autoscaling consumers on lag** (up to the partition count, which caps parallelism). Contrast a push-based system with no buffer, where a slow consumer forces the producer to block or drop. Bounding in-flight work per consumer keeps memory stable while the log holds the overflow.

**Interview nuance:** if asked "what happens when your consumer can't keep up," the strong answer is "the durable log absorbs it as lag, I alert and autoscale on lag up to partition count, and I make sure a poison message goes to a retry topic or DLQ rather than blocking the partition." That covers both the slow-consumer and the bad-message failure modes in one breath.

**Recap:** retry transient errors with capped exponential backoff plus jitter, send permanent failures and exhausted retries to an alerted, redrivable DLQ, never retry in place on an ordered partition (use retry topics to avoid head-of-line blocking), and lean on the durable log as your backpressure buffer while autoscaling on consumer lag.
`.trim()

export const systemDesignLevel6: DesignLevel = {
  id: 6,
  slug: "event-driven",
  title: "Level 6 — Asynchronous & Event-Driven Systems",
  tagline:
    "Messaging models, Kafka and the log, delivery guarantees, stream processing, and schema governance.",
  estimatedHours: 7,
  modules: [
    {
      id: "sd-l6-m1",
      title: "Messaging Foundations",
      description:
        "Decide which parts of a flow stay synchronous and which become async events, tell a queue from a pub/sub topic from a durable log by retention and replay, and pick a specific broker instead of reaching for Kafka by reflex.",
      lessons: [
        {
          id: "sd-l6-sync-vs-async",
          title: "Sync vs Async & When to Go Event-Driven",
          summary:
            "Async decouples in time, space, and synchronization at the cost of eventual consistency; keep the result-bearing or consistency-sensitive steps synchronous and make independent side effects events.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["async", "event-driven", "checkout"],
          teach: {
            markdown: syncVsAsyncTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-sync-vs-async-apply",
            prompt:
              "Design the checkout flow for an e-commerce site: decide which steps stay synchronous (payment auth) and which become async events (inventory, email, analytics), and justify each boundary.",
            thinkAbout: [
              "What are the three decouplings async buys (time, space, synchronization)?",
              "Which steps need synchronous consistency, and which tolerate eventual?",
              "How does the failure mode shift from sync errors to background retries/DLQ?",
            ],
            modelAnswerOutline: [
              "Assumptions: a mid-size store, a few hundred checkouts per minute with 10x sale spikes, payment via Stripe, correctness on money and inventory matters more than shaving the last few ms.",
              "**The synchronous core is what the user must know before a confirmation:** validate the cart, then call payment authorization synchronously. Payment auth is a command with a result the user needs right now (approved or declined changes what we show), and it is where ambiguity is unacceptable, so block on it. Keep a synchronous inventory reservation too if oversell is unacceptable (`SELECT ... FOR UPDATE` or a conditional decrement), because 'sorry, out of stock' after charging is a terrible experience.",
              "**Everything the user does not need in the response becomes async:** on successful auth, write one immutable `OrderPlaced` event to a broker (Kafka topic or SNS fan-out) and return 200. Independent consumers subscribe: fulfillment/inventory-settlement, email/receipt, analytics, loyalty-points. Space decoupling means adding a fraud-review consumer later touches no existing code; time decoupling means a 10x sale spike grows consumer lag instead of timing out checkout.",
              "**The failure model shifts deliberately:** a failed email is retried with exponential backoff and, after N attempts, parked in a DLQ with an alert, not surfaced to the buyer who already succeeded. Consumers must be idempotent because at-least-once delivery redelivers: key side effects on `order_id` so a duplicate `OrderPlaced` does not send two receipts or double-decrement stock. Monitor consumer lag and DLQ depth as first-class SLOs.",
              "Common wrong turn: making payment async to 'speed up checkout.' Then the user sees a confirmation before the charge is real, and declines become a reconciliation nightmare. Keep the money-and-stock decision synchronous; make notifications, analytics, and downstream fulfillment async.",
            ],
          },
          practice: {
            id: "sd-l6-sync-vs-async-practice",
            prompt:
              "Design the async boundary for Uber's ride-request flow at the moment a rider taps 'Confirm,' where the dispatch match must feel near-instant (sub-second) but a single ride fans out to pricing finalization, driver notification, ETA updates, fraud scoring, and the trip-history/analytics pipeline. Decide what stays on the synchronous request path and what becomes events.",
            thinkAbout: [
              "What is the narrow synchronous path the rider is actually waiting on?",
              "Why must the driver reservation be strongly consistent?",
              "How do you keep a lagging analytics consumer from degrading dispatch?",
            ],
            modelAnswerOutline: [
              "Assumptions: hundreds of thousands of concurrent riders, dispatch latency budget under about one second because the rider is staring at the screen, correctness on matching (one driver per ride) is critical.",
              "**The synchronous path is narrow:** validate the request, run the dispatch match against nearby available drivers, and reserve the chosen driver so no other ride grabs them. The match is a command with a result the rider needs immediately, and the driver reservation needs strong consistency to avoid double-assigning, so keep it synchronous against a low-latency store (Redis or an in-memory geo-index with a conditional claim). Return the assigned driver and a first ETA.",
              "**Everything else is an event:** on a successful match, emit `RideMatched` to Kafka keyed by `ride_id`. Consumers: pricing finalization (surge, promos), the driver-app push notification, continuous ETA recomputation, fraud/risk scoring, and the trip-history/warehouse pipeline. These are independent, tolerate hundreds of ms of lag, and must not block the rider's confirmation. Space decoupling lets the risk team add a consumer without touching dispatch.",
              "**Because delivery is at-least-once, consumers are idempotent on `ride_id`:** the notification consumer dedupes so a driver is not double-pinged, and the analytics consumer upserts. Failures go to per-consumer retry then DLQ with alerts; a lagging analytics consumer never degrades dispatch because offsets are per-consumer.",
              "Common wrong turn: putting fraud scoring or pricing on the synchronous path to 'get it right up front,' which blows the sub-second budget and couples dispatch availability to five downstreams. Keep the match and driver reservation synchronous; make the fan-out events.",
            ],
          },
        },
        {
          id: "sd-l6-queue-pubsub-log",
          title: "Queue vs Pub/Sub vs Log/Streaming",
          summary:
            "A queue distributes work and deletes on ack (no replay); pub/sub fans a copy to every subscriber; a log retains an ordered stream that many consumer groups read at their own offset and can replay.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["messaging-models", "kafka", "queue"],
          teach: {
            markdown: queuePubsubLogTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-queue-pubsub-log-apply",
            prompt:
              "Design the messaging backbone for an order system that needs (a) exactly one worker per order, (b) multiple independent subscribers to 'order placed', and (c) 30-day replay for a new analytics team; map each requirement to a model.",
            thinkAbout: [
              "How does retention differ between a queue and a log?",
              "Why does a log support many independent consumer groups and replay?",
              "What is the difference between broker-tracked delivery and consumer-driven offsets?",
            ],
            modelAnswerOutline: [
              "Assumptions: an e-commerce order pipeline, thousands of orders per minute at peak, on AWS, and the analytics team may want to reprocess history when they change their models. Forcing one model to do all three is the trap.",
              "**(a) Exactly one worker per order** (packing, shipping-label generation) is competing-consumers: use a queue. SQS (or a Kafka topic consumed by a single group, which gives the same one-worker-per-message effect via partition assignment). The message is claimed by one worker, acked, and gone; add workers to scale. Nothing else needs to see that task, so delete-on-ack is exactly right.",
              "**(b) Multiple independent subscribers to OrderPlaced** (email, fraud, loyalty, inventory) is fan-out: publish to a pub/sub topic. On AWS, SNS with SNS-to-SQS fan-out so each subscriber has its own durable queue and a slow subscriber does not lose events. Each team scales and fails independently.",
              "**(c) 30-day replay for a new analytics team** cannot be a queue, because a queue deletes on consume and has no history. This requires a log: publish the order event stream to Kafka (or Kinesis) with 30-day retention. The analytics team runs its own consumer group at its own offset and can reset to offset zero to reprocess the full 30 days without affecting any other consumer.",
              "**The clean design makes the durable ordered log the backbone:** OrderPlaced goes to a Kafka topic retained 30 days. Fan-out is native (each team is a consumer group). The one-worker-per-order task is a single consumer group, or a dedicated SQS queue fed from it.",
              "Common wrong turn: using SQS for everything and then telling the analytics team their history is gone the moment another consumer read it, or standing up three disconnected systems when one log covers fan-out and replay together.",
            ],
          },
          practice: {
            id: "sd-l6-queue-pubsub-log-practice",
            prompt:
              "Design the event backbone for DoorDash-scale order events (roughly 100k orders per hour at peak) where the same OrderCreated stream must feed a real-time dispatch matcher, a per-restaurant notification service, a fraud pipeline, and a data-warehouse ingest that reprocesses the last 7 days whenever the ML team ships a new feature. Choose the model(s) and justify retention and consumer topology.",
            thinkAbout: [
              "Which two requirements structurally disqualify a queue as the backbone?",
              "What partition key preserves the ordering that actually matters?",
              "Who sets the retention window: the fastest consumer or the replay need?",
            ],
            modelAnswerOutline: [
              "Assumptions: ~100k orders/hour (~28/sec average, several times that at dinner peaks), four independent consumers with very different SLAs, and the warehouse must replay a week on demand.",
              "**A log workload end to end,** because two hard requirements (multiple independent consumers over the same stream, and 7-day replay) are exactly what a queue cannot do. Publish `OrderCreated` to a Kafka topic partitioned by a key that preserves the ordering that matters (likely `region_id` or `restaurant_id` so a given restaurant's events stay ordered), with 7-day retention (headroom over the requirement) and replication factor 3.",
              "**Each consumer is its own consumer group with an independent offset:** the real-time dispatch matcher tuned for low lag and horizontal scale; the restaurant notification service; fraud; warehouse ingest. A slow warehouse batch cannot slow dispatch because offsets are per-group and consumer-owned. When the ML team ships a feature, warehouse ingest resets its group offset to 7 days back and reprocesses, touching no other consumer.",
              "**Retention is set by the most demanding replay need (7 days) plus buffer, not by the fastest consumer.** For cheap long-term history later, tiered storage or a sink to S3 covers it without broker-disk prices. Fan-out per team is native to consumer groups, so no SNS layer is needed.",
              "Common wrong turn: SQS as the backbone: the first consumer to read consumes the message, breaking fan-out, and there is no 7-day history to replay. A queue is right only for downstream one-worker tasks (generating a single delivery label), fed from the log as a dedicated group.",
            ],
          },
        },
        {
          id: "sd-l6-broker-selection",
          title: "Broker Technology Selection",
          summary:
            "Match the broker to the drivers (throughput, ordering, retention/replay, delivery, routing, ops budget); a log only when replay/throughput justify its ops, and sometimes no broker at all.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["broker-selection", "kafka", "rabbitmq"],
          teach: {
            markdown: brokerSelectionTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-broker-selection-apply",
            prompt:
              "Recommend a specific broker for each of three workloads (a task queue for image resizing, a 30-day-replayable analytics stream, and simple decoupled microservice notifications) and defend the choices.",
            thinkAbout: [
              "What decision drivers separate a log from a queue?",
              "When is a managed service (SQS/SNS/Pub/Sub) the right call?",
              "What do Pulsar's compute/storage separation and tiered storage add?",
            ],
            modelAnswerOutline: [
              "Assumptions: a small team on AWS with limited platform-ops capacity, moderate scale (thousands of messages/sec, not millions), and a preference for managed services unless a driver forces otherwise.",
              "**Image-resize task queue: SQS (standard).** A textbook competing-consumers workload: each upload produces one resize job that exactly one worker performs, then acks and deletes. The drivers are work distribution and simple retry/DLQ, not ordering or replay. SQS gives a visibility timeout (a crashed worker's job reappears), a native DLQ after N receives, and zero ops. Kafka would be overkill: no retention or fan-out needed, so I would be running a log to do a queue's job.",
              "**30-day-replayable analytics stream: Kafka (or Kinesis/MSK).** The requirement literally names replay and implies multiple independent consumers over the same data. Only a log satisfies retention plus multi-consumer-group replay. Use Kafka with 30-day retention (as MSK, or Kinesis if fully serverless and the throughput fits its shard model). Each analytics job is its own consumer group and can rewind to reprocess. A queue is disqualified because it deletes on consume.",
              "**Decoupled microservice notifications: SNS (with SNS-to-SQS fan-out).** Several services react to an event and I want fan-out without running a broker. SNS publishes a copy to each subscriber; wiring SNS-to-SQS gives each subscriber a durable queue so a down service does not miss messages: the lowest-ops fan-out on AWS. Reach for Kafka only if these notifications later needed replay or high-throughput streaming.",
              "**The through-line:** match each workload to the cheapest tool that meets its drivers, and explicitly refuse to use Kafka for the two workloads that do not need a log. Common wrong turn: one Kafka cluster for all three, paying streaming ops for a simple resize queue and a fan-out notification.",
            ],
          },
          practice: {
            id: "sd-l6-broker-selection-practice",
            prompt:
              "Choose one messaging platform for a fintech SaaS (you are the platform architect) onboarding many customer tenants, one that serves (1) a high-throughput transaction event stream with 90-day replay, (2) strict per-tenant isolation and independent scaling, and (3) geo-replication across two regions for DR. Defend it against Kafka and against a managed queue, then note where you would still use a plain queue.",
            thinkAbout: [
              "Which requirement is a native Pulsar feature but an engineered-around Kafka one?",
              "Why is a managed queue disqualified as the backbone?",
              "Where does a plain queue still fit inside a Pulsar shop?",
            ],
            modelAnswerOutline: [
              "Assumptions: many tenants sharing infrastructure, tens of thousands of events/sec aggregate, regulatory pressure for tenant isolation and cross-region durability, and a platform team large enough to run real infrastructure.",
              "**Choose Apache Pulsar as the backbone.** The requirements line up with what Pulsar adds over Kafka. (1) Compute/storage separation (stateless brokers over BookKeeper) scales serving capacity and storage independently, so one noisy tenant spiking traffic does not force more retention. (2) Multi-tenancy is first-class: tenants, namespaces, and per-namespace policies (quotas, retention, isolation) make per-tenant isolation a configuration, not a fleet of clusters. (3) Geo-replication across regions is built in at the namespace level, satisfying DR without bolting on MirrorMaker. 90-day replay is native via retention plus tiered storage (cold segments to S3), so you avoid broker disk for three months of history.",
              "**Why not Kafka:** it can hit the throughput and, with tiered storage plus MirrorMaker 2, approximate retention and geo-replication. But multi-tenant isolation and independent compute/storage scaling are things you engineer around in Kafka (separate clusters per tenant tier, careful quotas) rather than get natively. For a platform whose core requirement is per-tenant isolation, Pulsar's model is a better fit; acknowledge Kafka's larger ecosystem as the real tradeoff.",
              "**Why not a managed queue:** SQS/SNS cannot do 90-day multi-consumer replay at all, so it is disqualified as the backbone.",
              "**Where a plain queue still fits:** downstream one-worker tasks fed off the stream (generating a statement PDF, sending a single webhook) are simpler as an SQS-style queue or a single Pulsar subscription in shared mode than as a streaming consumer. Match the tool to the driver even inside a Pulsar shop.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l6-m2",
      title: "Kafka & the Log",
      description:
        "Reason about Kafka like a staff engineer: why the append-only log gives throughput, why partitions are the atom of ordering and parallelism, how a wrong key breaks correctness, how rebalancing becomes latency, and how retention decides stream vs table.",
      lessons: [
        {
          id: "sd-l6-kafka-internals",
          title: "Kafka Architecture Internals",
          summary:
            "Sequential writes, page cache, and zero-copy give throughput; durability is leader/follower ISR replication where durable means acks=all + min.insync.replicas>=2 + RF3.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["kafka", "isr", "durability"],
          teach: {
            markdown: kafkaInternalsTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l6-kafka-internals-apply",
            prompt:
              "Design a Kafka topic layout for a ride-hailing event stream at 500k events/sec: choose partition count, replication factor, and key, and explain the durability/latency tradeoffs of your acks and min.insync.replicas settings.",
            thinkAbout: [
              "What do acks and min.insync.replicas trade off?",
              "Why do sequential writes, zero-copy, and page cache give Kafka its throughput?",
              "What did KRaft change versus ZooKeeper?",
            ],
            modelAnswerOutline: [
              "Assumptions: 500k events/sec (requested, matched, started, location-ping, completed), average record 500 bytes so ~250 MB/s ingest, ordering required per ride, feeding matching, pricing, and analytics consumers, with no acknowledged-message loss.",
              "**Partition count:** size from a conservative ~10 MB/s produce and ~10 MB/s consume per partition, so 250 MB/s needs ~25 partitions on throughput alone. But partition count caps consumer parallelism and you want growth headroom without repartitioning (which breaks key stability), so provision **120 partitions**: room for many workers per consumer group, modest per-partition load, 3-4x headroom. Do not go to thousands (more open files, replication traffic, longer rebalances, metadata pressure).",
              "**Replication factor: RF=3** across 3 availability zones with rack-awareness so replicas land in different AZs, surviving a full broker or single-AZ loss.",
              "**Key by `ride_id`:** all events for one ride hash to the same partition and stay totally ordered (matching and billing require it). `driver_id` or `city` would create hot partitions (a busy city dwarfs the rest); `ride_id` spreads load evenly because rides are numerous and short-lived.",
              "**Durability: `acks=all` with `min.insync.replicas=2` and RF=3,** so every acknowledged write is on at least 2 replicas: tolerate one broker/AZ failure with zero loss and still accept writes. The cost is one extra replication round trip versus acks=1 (single-digit ms within a region): the right price for a payments-adjacent stream. Location pings, lossy-tolerant and huge, could go to a separate topic at acks=1. Producer linger.ms ~5-10ms plus lz4 batches to hit throughput.",
              "**Throughput holds** because Kafka appends sequentially, serves reads from page cache via zero-copy sendfile, and batches on the producer. KRaft means no ZooKeeper, so 120 partitions x RF3 is well within a single cluster's metadata budget and controller failover is fast.",
              "Common wrong turn: setting acks=all but leaving min.insync.replicas=1, which can silently degrade to leader-only and lose acknowledged writes on a leader crash.",
            ],
          },
          practice: {
            id: "sd-l6-kafka-internals-practice",
            prompt:
              "Design the Kafka topology for LinkedIn-scale clickstream ingestion at 7 million events/sec across 3 datacenters, feeding both a real-time feed-ranking pipeline and a batch data lake, where losing a page-view event is acceptable but the cluster must never be a single point of failure. Choose partition count, replication, acks, and cross-datacenter strategy.",
            thinkAbout: [
              "How do you match durability to the value of each event class?",
              "Why not stretch one cluster across datacenters?",
              "What holds throughput at 2 GB/s and keeps 30-day lake retention cheap?",
            ],
            modelAnswerOutline: [
              "Assumptions: 7M events/sec, average 300 bytes, so ~2.1 GB/s. Page views are individually lossy-tolerant, but the pipeline must stay available and must not lose whole partitions. Two consumer classes: low-latency feed ranking and high-throughput batch (Hadoop/Spark lake).",
              "**Split by event family** (`pageview`, `impression`, `engagement`) so each scales and is retained independently. For 2.1 GB/s at ~10 MB/s per partition you need ~210 partitions minimum; with growth and consumer-parallelism headroom, provision **600-1000 partitions** across the family topics over dozens of brokers. Key `pageview` by `member_id` so a member's events are ordered (for sessionization) while spreading load across the member base.",
              "**Replication: RF=3** within each datacenter, rack/AZ aware. Because a single lost page view is acceptable, producers use **acks=1** on the pageview topic to shave the replication round trip and sustain 2 GB/s cheaply; the engagement topic (clicks driving revenue/ranking signals) uses acks=all with min.insync.replicas=2. The key move: match durability to the value of each event class rather than paying acks=all everywhere.",
              "**Cross-datacenter:** do not stretch one cluster across DCs (WAN latency wrecks replication and ISR). Run an independent cluster per DC and use **MirrorMaker 2** (or Confluent Cluster Linking) for async replication into an aggregate cluster that feeds the central data lake, accepting some cross-DC lag. Local producers write to their local cluster, so a DC partition never blocks ingestion. Feed ranking consumes locally; the lake consumes from the aggregate.",
              "**Throughput** relies on heavy producer batching, zstd compression, and zero-copy reads; **tiered storage** (S3/HDFS) holds cold segments so 30-day lake retention does not bloat broker disk. KRaft keeps ~1000-partition metadata cheap. Never a SPOF: RF3 plus multi-broker plus per-DC clusters plus MM2 aggregation means no single broker, rack, or DC failure stops ingestion or loses a whole partition.",
            ],
          },
        },
        {
          id: "sd-l6-partitioning-ordering",
          title: "Partitioning, Ordering & Keys",
          summary:
            "Kafka orders within a partition only, chosen by hash(key) mod N, so causally related events share a key; partition count is fixed up front, and a hot key trades ordering scope for throughput.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["partitioning", "ordering", "keys"],
          teach: {
            markdown: partitioningOrderingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-partitioning-ordering-apply",
            prompt:
              "Design partitioning for a payments ledger where all events for one account must be processed in order but the system must scale horizontally; pick the key and handle a celebrity/hot-key account.",
            thinkAbout: [
              "Why does ordering only hold within a partition?",
              "Why does changing partition count break key->partition stability?",
              "How do you handle a hot partition without losing ordering?",
            ],
            modelAnswerOutline: [
              "Assumptions: a ledger topic of monetary events (credit, debit, hold, release). The invariant: events for a single account apply in order so a debit never overtakes the credit that funds it, but total volume exceeds one partition. Cross-account order does not matter.",
              "**Key by `account_id`, the whole design:** every event for one account hashes to one partition, so that account has a total order and consumers apply its events in offset order. Different accounts land on different partitions and process in parallel: the horizontal scaling we want. Provision partitions generously up front (say 200) because you cannot resize later without breaking key stability: hash(account_id) mod N changes for most accounts if N changes, splitting an account's history across two partitions during migration and violating the invariant.",
              "**Ordering holds only within a partition** because a partition is a single append-only sequence with monotonic offsets, while the topic is many such sequences interleaved by chance. Co-keying is the correctness mechanism, not an optimization.",
              "**Hot key (celebrity/omnibus account):** first question the requirement: does that account truly need one strict serial order, or is it internally partitionable? If it can be split by sub-ledger (per currency, per merchant, per day), use a **compound key** `account_id + sub_ledger` to spread across partitions while preserving order within each sub-ledger, and make the ledger math associative so sub-streams sum correctly. If it genuinely needs one serial stream, keep it on a single partition and scale that partition vertically (bigger broker, dedicated consumer), isolating it so its lag does not starve others (route hot accounts to a dedicated topic). As a last resort, **salt** the key (`account_id + [0..k]`), then have a single downstream serializer re-order by an account-level monotonic sequence number before applying, accepting extra latency for throughput.",
              "Every option trades ordering scope for throughput; only widen the key when the ledger semantics genuinely tolerate sub-stream ordering. Common wrong turn: assuming Kafka gives global order and reading across partitions expecting chronological sequence, which silently applies debits before credits under load.",
            ],
          },
          practice: {
            id: "sd-l6-partitioning-ordering-practice",
            prompt:
              "Design the partitioning key for a Coinbase-style crypto matching engine feed where every order for a given trading pair (BTC-USD) must be sequenced in strict arrival order, but BTC-USD alone can be 100x the volume of a quiet pair like a new listing. Choose the key, set partition count, and handle the case where one pair's volume exceeds a single partition's ceiling.",
            thinkAbout: [
              "Why can you never salt the BTC-USD stream?",
              "Where is the real bottleneck: the partition or the matcher?",
              "How do you isolate the hot pairs from the long tail?",
            ],
            modelAnswerOutline: [
              "Assumptions: an order-event stream (new, cancel, fill) feeding a per-pair matching engine. The hard invariant is price-time priority: within a pair, orders must be processed in exact arrival order or the matching is wrong and the exchange is liable. Cross-pair order is irrelevant. BTC-USD dominates volume.",
              "**Key by `trading_pair`:** every event for BTC-USD lands on one partition and is strictly ordered, exactly what price-time priority requires; a single matching-engine worker consumes it and maintains the order book. Quiet pairs share partitions and process in parallel. Because one strict serial stream per pair is a genuine business requirement, do NOT salt or compound the key for a pair: that would destroy the arrival ordering the matcher depends on.",
              "**The throughput tension is architectural, not a Kafka trick:** BTC-USD may exceed a single partition's ceiling. You cannot spread it without losing order. Keep events small (order id, side, price, qty, timestamp) in a compact binary format so one partition goes far (high-hundreds of MB/s). Recognize the **matching engine is single-threaded per pair by design** (LMAX-style), so the partition is not the bottleneck, the matcher is, and both scale by pair, not within a pair.",
              "**Isolate the hot pairs:** route the top handful (BTC-USD, ETH-USD) each to their own dedicated single-partition topic with dedicated brokers and consumers, so their volume never contends with the long tail; long-tail pairs share a multi-partition topic keyed by pair.",
              "**Partition count:** the shared long-tail topic provisions generously (say 100) since resizing breaks key stability; each hot pair gets exactly one partition with vertical scaling and an in-memory order book. Common wrong turn: salting BTC-USD to gain throughput, which reorders events and corrupts price-time priority: unacceptable for a matching engine.",
            ],
          },
        },
        {
          id: "sd-l6-consumer-groups",
          title: "Consumer Groups, Rebalancing & Scaling",
          summary:
            "Group size is capped by partition count; commit-after-process gives at-least-once so handlers must be idempotent; cooperative rebalancing and static membership avoid stop-the-world, and you scale on lag.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["consumer-groups", "rebalancing", "lag"],
          teach: {
            markdown: consumerGroupsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-consumer-groups-apply",
            prompt:
              "Design the consumer tier for a stream where you must scale workers from 3 to 30 during peak without stalling processing; explain rebalance behavior and how you avoid duplicate processing during handoff.",
            thinkAbout: [
              "Why is the group size capped by partition count?",
              "How do offset-commit strategies create at-least-once behavior?",
              "How do cooperative rebalancing and KIP-848 reduce stop-the-world?",
            ],
            modelAnswerOutline: [
              "Assumptions: a topic feeding a worker pool doing per-message work (enrichment, a DB write). Traffic is spiky, so scale 3 to 30 workers at peak and back down without stalling or corrupting state.",
              "**Partition count first:** group parallelism is capped by partitions, so to run 30 workers you need at least 30 partitions; provision more (say 60) for headroom above 30 so each worker owns a couple of partitions (smoother during scaling). The load-bearing decision: no autoscaling helps past the partition count.",
              "**Scaling mechanism:** autoscale the worker deployment on consumer lag, not CPU: when lag crosses a threshold, add workers up to the partition ceiling; when lag drains, scale down. Each scale event triggers a rebalance, so make rebalances cheap.",
              "**Rebalance behavior:** use the cooperative (incremental) rebalancing assignor (or KIP-848 on Kafka 4.0). Adding 10 workers revokes only the partitions that must migrate; every other worker keeps processing, so no stop-the-world stall. KIP-848 removes the synchronization barrier by computing assignments broker-side. Set static group membership (`group.instance.id`) so a routine pod restart rejoins with the same assignment inside session.timeout.ms and causes no rebalance, and tune session.timeout.ms=45s / heartbeat.interval.ms=3s so a GC pause does not falsely eject a healthy worker.",
              "**Avoiding duplicates at handoff:** commit offsets after processing (at-least-once), so when a partition moves mid-batch the new owner reprocesses uncommitted work. Duplicates are guaranteed at every handoff, and the only correct defense is idempotent handlers: dedup on an idempotency key or upsert by event id. Use ConsumerRebalanceListener.onPartitionsRevoked to commit final offsets before releasing a partition, which shrinks (but never eliminates) the duplicate window.",
              "Common wrong turn: over-partitioning to thousands (rebalance overhead, weak ordering) or committing offsets before processing (silent data loss on a crash).",
            ],
          },
          practice: {
            id: "sd-l6-consumer-groups-practice",
            prompt:
              "Design the consumer tier for Uber's real-time driver-location pipeline consuming 1M events/sec, where you deploy new consumer code multiple times a day and each deploy currently causes a visible latency spike from rebalancing. Eliminate the deploy-time stall and explain how you keep processing exactly-once-effectively across the handoff.",
            thinkAbout: [
              "What makes a rolling deploy cause zero rebalances?",
              "How does a reassigned pod rebuild local state without replaying the whole source?",
              "What keeps a reprocessed location update from corrupting the geo-index?",
            ],
            modelAnswerOutline: [
              "Assumptions: a high-volume location topic feeding a stateful geo-index. Deploys happen many times a day via rolling restart, and today each restarted pod leaves and rejoins the group, causing an eager stop-the-world rebalance and a latency spike (stale driver positions).",
              "**Root cause:** a rolling deploy churns group membership, and eager rebalancing stops the whole group on every churn. Three changes remove the stall.",
              "**1. Static group membership:** assign each pod a stable `group.instance.id` (from the StatefulSet ordinal) and set session.timeout.ms comfortably above the pod restart time (say 5 minutes during deploys). Now a restarting pod gets its identical partitions back with NO rebalance, so a rolling deploy of 50 pods causes zero reassignments as long as each pod returns within the timeout.",
              "**2. Adopt the KIP-848 consumer protocol** (Kafka 4.0) or at minimum the cooperative sticky assignor, so any rebalance from a genuine crash moves only the affected partitions incrementally. **3. Size partitions well above peak worker count** (e.g., 256) so the pool has parallelism headroom and each pod owns a small, stable slice.",
              "**Correctness across handoff:** commit offsets after the geo-index update (at-least-once), and make the update idempotent by keying the index on `driver_id` with last-write-wins on event timestamp, so a reprocessed location update is a no-op or an in-order overwrite, not a corruption. Because state is local (RocksDB-backed), use a changelog topic so a reassigned pod rebuilds state from the changelog rather than replaying the whole source. Monitor consumer lag per partition as the SLA signal; a deploy should show a flat lag line.",
              "Common wrong turn: bumping consumer count past 256 expecting more throughput, when the partition count is the real ceiling.",
            ],
          },
        },
        {
          id: "sd-l6-compaction-retention",
          title: "Log Compaction, Retention & Tiered Storage",
          summary:
            "Delete-retention makes a replayable stream, compaction makes a rebuildable table/changelog with tombstones, tiered storage makes long retention cheap, and dedup must cover the replay window.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["compaction", "retention", "tiered-storage"],
          teach: {
            markdown: compactionRetentionTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-compaction-retention-apply",
            prompt:
              "Design storage for two topics: an immutable audit event stream kept 7 years cheaply, and a 'current user profile' changelog; choose retention/compaction and storage tier for each.",
            thinkAbout: [
              "When do you use time/size retention vs log compaction?",
              "How does compaction give table/changelog semantics and enable state rebuild?",
              "How does tiered storage decouple retention cost from broker disk?",
            ],
            modelAnswerOutline: [
              "Assumptions: the audit stream is an append-only record compliance requires kept 7 years and must be replayable and immutable. The user-profile topic must let any service know the current profile of every user and rebuild that state from scratch.",
              "**Audit stream: delete-retention + tiered storage.** A pure event stream, so `cleanup.policy=delete` with `retention.ms` set to 7 years. Never compact it, because every event matters individually (compaction would drop superseded records, destroying the audit trail). Seven years on broker SSD would be enormous, so enable tiered storage: hot recent segments (last 7-30 days, queried often) on local SSD, everything older offloaded to S3 at a few cents/GB/month. Replay of an old range fetches transparently from S3. Durability RF=3, acks=all, min.insync.replicas=2. For GDPR erasure without mutating the immutable log, crypto-shred: encrypt per-user fields with a per-user key and delete the key.",
              "**User-profile changelog: log compaction.** A table, not a stream, so `cleanup.policy=compact`, keyed by `user_id`, each record the latest full profile (or a merged patch). Compaction keeps at least the latest value per key, so the compacted tail is the current profile of every user. A new service, or a rebuilt search index, reads from offset 0 and materializes the entire current-state table with no separate database: KTable/CDC bootstrap behavior.",
              "**Deletes and lagging consumers:** a deleted user is a tombstone (key + null), retained long enough (`delete.retention.ms`) for all consumers to see the deletion before it is compacted away. Set `min.compaction.lag.ms` so very recent updates are not compacted before a lagging consumer reads them. Storage stays small because only the latest value per key survives, so tiered storage is optional here.",
              "**The unifying idea:** retention policy is a semantic choice. Delete-retention = replayable history (stream); compaction = current-state table (changelog). Common wrong turn: setting a dedup window on the audit consumers shorter than the 7-year retention, so a replay after a fix double-applies old events. Size the dedup window to cover the replay window (or make handlers idempotent by construction).",
            ],
          },
          practice: {
            id: "sd-l6-compaction-retention-practice",
            prompt:
              "Design the retention and storage strategy for Netflix's viewing-history platform: an immutable 'play events' stream (billions/day) that data science replays for months, plus a 'current playback position per profile per title' changelog that the resume-watching feature reads with single-digit-ms latency. Choose policies, storage tiers, and handle a title being pulled from the catalog for legal reasons.",
            thinkAbout: [
              "Why is tiered storage mandatory rather than optional at billions/day?",
              "Where do you actually serve the single-digit-ms resume reads from?",
              "How do you remove a pulled title from each topic type without breaking immutability?",
            ],
            modelAnswerOutline: [
              "Assumptions: play events are high-volume immutable facts (play, pause, seek, stop) that ML pipelines reprocess for up to 6 months to retrain models; the playback-position store must return 'where did profile P stop in title T' instantly.",
              "**Play-events stream: delete-retention + tiered storage.** `cleanup.policy=delete`, `retention.ms` at 6 months to cover the ML replay horizon. At billions/day this is petabytes, so tiered storage is mandatory: keep ~the last 7 days hot on broker SSD for real-time consumers, offload the rest to S3 where 6-month retention costs S3 rates. ML backfills read old offsets straight from S3. Key by `profile_id` so a profile's events stay ordered for sessionization. Durability RF=3, acks=all, min.insync.replicas=2. Critically, size the ML pipeline's idempotency to cover the full 6-month replay window (or make its aggregations idempotent) so a reprocess does not double-count watch time.",
              "**Playback-position changelog: log compaction.** `cleanup.policy=compact`, keyed by `(profile_id, title_id)`, each record the latest position. Compaction keeps the latest position per key. For single-digit-ms reads, do NOT serve from Kafka directly: materialize the compacted changelog into a fast key-value store (DynamoDB or Redis) via Kafka Streams or a consumer; the compacted topic is the durable source of truth that can rebuild that store from offset 0 after a wipe. Compaction keeps the changelog and its downstream store small regardless of how many pauses a user racks up.",
              "**Title pulled for legal reasons:** for the compacted changelog, emit tombstones (`(profile_id, title_id)` -> null) for every position tied to that title; compaction propagates them and removes the resume entries, and downstream stores apply the tombstone as a delete. For the immutable play-events stream, do not rewrite history: either crypto-shred the title's records by dropping its encryption key, or add a suppression/filter list so consumers exclude the pulled title, preserving the log's immutability while making the content effectively unavailable.",
              "Common wrong turn: trying to mutate the immutable stream in place, which breaks replayability and offsets.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l6-m3",
      title: "Delivery Guarantees",
      description:
        "State a system's end-to-end delivery guarantee precisely and stop misusing 'exactly-once', make APIs and consumers idempotent so at-least-once delivery and client retries converge to one outcome, and build retry, dead-letter, and backpressure machinery that keeps a stream flowing without losing data or blocking a partition on one poison message.",
      lessons: [
        {
          id: "sd-l6-delivery-semantics",
          title: "Delivery Semantics: At-Most / At-Least / Exactly-Once",
          summary:
            "Ack timing sets the guarantee (commit-before-process is at-most-once, process-before-commit is at-least-once); exactly-once delivery over a network is impossible, so you convert at-least-once into effectively-once processing at the consumer, and Kafka EOS covers only a read-process-write loop inside Kafka.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["delivery-semantics", "exactly-once"],
          teach: {
            markdown: deliverySemanticsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-delivery-semantics-apply",
            prompt:
              "Design a payment-charging pipeline that must never double-charge; state your delivery guarantee end-to-end and where you convert at-least-once delivery into effectively-once processing.",
            thinkAbout: [
              "Why is exactly-once delivery over a network impossible?",
              "What is the scope of Kafka's exactly-once (EOS)?",
              "Where does ack timing set the guarantee?",
            ],
            modelAnswerOutline: [
              "Assumptions: an e-commerce checkout emits a `charge_requested` event per order onto Kafka; a payment worker consumes it and calls Stripe; correctness requirement is no double-charge even under retries, redeliveries, and worker crashes; volume is a few hundred charges per second.",
              "**End-to-end guarantee:** at-least-once delivery converted to effectively-once processing at the charge boundary. I choose at-least-once deliberately: losing a charge event (at-most-once) would mean an order silently never gets billed, which is worse than the risk of a duplicate I can neutralize.",
              "**Producer side:** Kafka's idempotent producer (`enable.idempotence=true`, `acks=all`) so producer-side retries do not create duplicate events in the topic. EOS handles the ingest, but I am explicit that **EOS stops at Kafka's boundary**: the Stripe call is an external side effect Kafka knows nothing about, so I cannot rely on transactions for it.",
              "**The exactly-once conversion happens at the consumer, at the external charge.** Each order carries a stable **idempotency key** (the order id, or a dedicated charge id generated once at checkout). I pass it to Stripe as its `Idempotency-Key` header. Stripe stores it and returns the original result on any repeat, so even if my worker crashes after charging but before committing the offset and Kafka redelivers, the second call is a no-op returning the first charge. That is the seam where at-least-once delivery becomes effectively-once effect.",
              "**Ack timing:** process before committing the offset. Consume, call Stripe with the idempotency key, persist the local `charge` row keyed by the same id inside a DB transaction, and only then commit the Kafka offset. A crash anywhere before the offset commit simply causes a safe redelivery.",
              "Tradeoffs: an extra round trip and a dedup lookup per charge, and a dependence on Stripe honoring the idempotency key (I would not roll my own charging without provider-side dedup). Common wrong turn: assuming Kafka EOS makes the whole pipeline exactly-once and skipping the idempotency key on the Stripe call, which double-charges on the first redelivery.",
            ],
          },
          practice: {
            id: "sd-l6-delivery-semantics-practice",
            prompt:
              "Design the delivery-guarantee story for Uber-style driver payouts at roughly 5,000 payouts per second, where each payout is a bank transfer through a third-party processor with no idempotency-key support, and payouts run as a Kafka read-process-write loop that also updates an internal ledger. State exactly where exactly-once holds and where it does not.",
            thinkAbout: [
              "Which portion of the flow can be truly exactly-once, and why?",
              "How do you build your own dedup gate in front of a processor that has no idempotency key?",
              "Why must recovery reconcile rather than blindly resubmit?",
            ],
            modelAnswerOutline: [
              "Assumptions: `payout_due` events on Kafka, a worker that (1) writes a ledger debit and (2) triggers an external bank transfer whose processor does not accept an idempotency key; 5k/s, must never pay a driver twice.",
              "**Split the flow at the exactly-once boundary.** The **internal** read-process-write portion (consume `payout_due`, write the ledger entry, emit `payout_initiated`) runs under Kafka transactions plus a transactional ledger write, so within Kafka and the ledger I get true exactly-once: the offset commit, the ledger row, and the output event either all land or none do.",
              "**The external bank transfer is the hard part** because the processor gives me no dedup. I cannot make the transfer itself idempotent, so I build my own dedup gate in front of it: a `payout_attempt` table keyed by payout id with a unique constraint and a state machine (`PENDING -> SUBMITTED -> CONFIRMED`). The worker atomically claims the row (insert-if-absent, or transition PENDING to SUBMITTED) before it ever calls the processor. A duplicate event or redelivery fails the claim and does nothing.",
              "**Record `SUBMITTED` before the network call**, so a crash mid-call leaves the row in SUBMITTED, and recovery must **reconcile** (query the processor for that reference id) rather than blindly resubmit, since a blind resubmit could double-pay.",
              "So exactly-once holds cleanly for the Kafka-plus-ledger portion; for the bank transfer I get effectively-once only via my own claim table plus reconciliation, and I accept a small SUBMITTED-but-unconfirmed window that a reconciliation job resolves. At 5k/s the claim table needs a fast unique-key store (Postgres with the id as PK, or DynamoDB conditional put). Common wrong turn: treating the whole loop as exactly-once because it is 'inside Kafka' and resubmitting on recovery, which double-pays whenever the first transfer actually went through.",
            ],
          },
        },
        {
          id: "sd-l6-idempotency-dedup",
          title: "Idempotency & Deduplication",
          summary:
            "Neutralize at-least-once duplicates with natural idempotency, state machines with expected-version checks, or a dedup store that saves the result (not a boolean) under an idempotency key; resolve the concurrent race with an atomic check-and-set and size the TTL to cover both the client-retry and broker-replay windows.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["idempotency", "dedup"],
          teach: {
            markdown: idempotencyDedupTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-idempotency-dedup-apply",
            prompt:
              "Design an idempotent 'create order' API and consumer given at-least-once delivery and client retries; specify the idempotency key, storage, and TTL, and handle the concurrent-duplicate race.",
            thinkAbout: [
              "What is the idempotency key and where does the dedup store live?",
              "How do you resolve two duplicates racing simultaneously?",
              "How do you size the dedup window vs the replay window?",
            ],
            modelAnswerOutline: [
              "Assumptions: a mobile client calls `POST /orders`; the network is flaky so the client retries on timeout; downstream, an `order_created` event is consumed at-least-once by a fulfillment worker. Requirement: one order per user intent, no duplicates from retries or redeliveries.",
              "**Idempotency key.** The client generates a UUID per checkout attempt and sends it as an `Idempotency-Key` header. It is stable across the client's retries of the same intent (it does not regenerate on retry), so all retries share one key. For the downstream consumer, the key is the event id.",
              "**Storage.** An `idempotency_keys` table (or Redis) with columns `key (unique), status, response_body, created_at`. It lives next to the order service so the write is transactional with the order insert.",
              "**The write path.** On request, atomically `INSERT ... ON CONFLICT (key) DO NOTHING` with status `in_progress`. If I won the insert, I create the order and the `order_created` event in the **same DB transaction** as updating the row to `completed` with the stored response, then return it. If I lost (conflict), I read the existing row: `completed` -> return the stored response body (same 201 the first call got); `in_progress` -> return 409 or hold briefly and re-read. Two simultaneous duplicates converge: exactly one creates the order, the other returns the identical result.",
              "**Consumer side.** The fulfillment worker dedups on event id with the same atomic check-and-set, and stores the result so a redelivery returns the same outcome rather than fulfilling twice.",
              "**TTL sizing.** The client-retry horizon is minutes, but the Kafka topic retains, say, 7 days and can be replayed during a reprocess. So the consumer's dedup keys must live at least 7 days, matching the retention window; otherwise a replay re-fulfills every order. The API-side keys can expire after 24 hours since clients do not retry a day later. Common wrong turn: storing a boolean 'seen' flag instead of the result, so concurrent duplicates both execute and diverge, and a shorter-than-retention TTL that lets replays re-apply.",
            ],
          },
          practice: {
            id: "sd-l6-idempotency-dedup-practice",
            prompt:
              "Design idempotency for Stripe-scale API request handling: a global `POST /v1/charges` accepting client `Idempotency-Key` headers at 50,000 requests per second across multiple regions, where the same key can hit two regions and requests can be replayed for 24 hours. Specify the dedup store, the concurrency resolution, and how you handle a key reused with a different request body.",
            thinkAbout: [
              "Why must the dedup store be strongly consistent even in a multi-master stack?",
              "How do you serialize a key that lands in two regions at once?",
              "How do you detect a key reused for a different payload?",
            ],
            modelAnswerOutline: [
              "Assumptions: multi-region API, clients send `Idempotency-Key`; must never double-charge, must return the original response on any replay within 24h, and must detect a client accidentally reusing a key for a different payload.",
              "**Dedup store.** A low-latency, strongly consistent key-value store keyed by `(account_id, idempotency_key)`. At 50k/s I would not put this in a single Postgres; I would use a store with fast conditional writes and a native TTL, such as DynamoDB (conditional `PutItem`) or a Redis cluster backed by a durable record. The value holds `request_fingerprint`, `status`, `response`, and a 24h TTL.",
              "**Concurrency resolution.** First writer wins via a conditional put (`attribute_not_exists(key)`), status `in_progress`. Concurrent duplicates that lose the put poll the record: `completed` returns the stored response; `in_progress` returns a 409 'request in progress, retry.' The response is written back into the record inside the same logical transaction as the charge's idempotency handshake with the payment core, so the stored response is authoritative.",
              "**Cross-region collision.** Two regions seeing the same key is the interesting case. I pin idempotency-key resolution to a **single authoritative region/partition per key** (route by hashing the key, or use a globally consistent table like DynamoDB global tables with a designated writer region) so the conditional put still serializes. Eventual-consistency-only replication would let both regions think they won, so the dedup store must be strongly consistent for the check-and-set, even if the rest of the stack is multi-master.",
              "**Key reused with a different body.** Store a hash of the request body (`request_fingerprint`) with the key. On a repeat, if the fingerprint differs from the stored one, reject with `400 idempotency_key_reused` rather than returning the old charge or making a new one. This catches client bugs where a key is accidentally reused for a different amount. Common wrong turn: a per-region local cache with no global serialization, which double-charges when the same key lands in two regions at once.",
            ],
          },
        },
        {
          id: "sd-l6-retries-dlq-backpressure",
          title: "Retries, Dead-Letter Queues & Backpressure",
          summary:
            "Retry transient errors with capped exponential backoff plus jitter, send permanent failures and exhausted retries to an alerted redrivable DLQ, never retry in place on an ordered partition (use retry topics to avoid head-of-line blocking), and lean on the durable log as your backpressure buffer while autoscaling on consumer lag.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["retries", "dlq", "backpressure"],
          teach: {
            markdown: retriesDlqBackpressureTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-retries-dlq-backpressure-apply",
            prompt:
              "Design retry + failure handling for a consumer that calls a flaky third-party API; prevent a single poison message from blocking a partition while guaranteeing no silent data loss, and keep the pipeline stable when the consumer slows down.",
            thinkAbout: [
              "How do you avoid head-of-line blocking on an ordered partition?",
              "When does a message go to the DLQ versus retry?",
              "How does a durable log act as the backpressure buffer?",
            ],
            modelAnswerOutline: [
              "Assumptions: a Kafka consumer reads `notification_requested` events and calls a third-party push/SMS API that is occasionally slow, throttles (429), and sometimes returns 400 for a malformed recipient. Requirement: no lost events, no partition stall, stable under load spikes.",
              "**Error classification first.** On each call I classify the result. Timeouts, 5xx, and 429 are **transient**: retry them. A 400 or a validation failure is **permanent**: it will never succeed, so it goes straight to the DLQ without wasting retry attempts.",
              "**Retry without blocking the partition.** I do **not** retry in place, because the partition is ordered and a stuck message would block every event behind it (head-of-line blocking). Instead I use tiered **retry topics**: on a transient failure I publish the message (with an incremented attempt count and the error) to `retry-30s`, then commit the original offset so the main partition keeps flowing. A delayed consumer drains `retry-30s` after the delay; still failing, it escalates to `retry-5m`, then `retry-30m`. Retries use exponential backoff plus jitter so a downstream outage does not produce a synchronized thundering herd.",
              "**DLQ for exhaustion and permanent errors.** After the last retry tier, or immediately for a permanent error, the message goes to a **dead-letter topic** carrying the payload, the final error, and the attempt count. DLQ depth greater than zero fires an alert. I keep redrive tooling to replay DLQ messages back to the main topic once I deploy a fix. Nothing is ever dropped silently, which satisfies no-data-loss.",
              "**Backpressure.** When the third party slows and my consumer falls behind, the **durable Kafka log absorbs the backlog** as consumer lag (days of retention on disk), so I never overflow memory or drop events. I monitor consumer lag as the primary health signal and **autoscale consumers on lag**, up to the partition count (my parallelism ceiling). I bound in-flight requests per consumer so a slow API cannot balloon memory.",
              "Common wrong turn: retrying the failing message in place on the ordered partition, which blocks the whole partition on one poison message, or having no DLQ so exhausted messages are dropped or loop forever.",
            ],
          },
          practice: {
            id: "sd-l6-retries-dlq-backpressure-practice",
            prompt:
              "Design failure handling for DoorDash-style order-status webhooks fanned out to 200,000 merchant endpoints, where a large fraction of endpoints are slow or intermittently down, ordering per merchant matters, and you must not let one dead merchant delay deliveries to healthy ones. Specify your retry policy, DLQ strategy, and how you isolate slow endpoints.",
            thinkAbout: [
              "How do you keep one dead endpoint from starving the worker pool?",
              "How do you preserve per-merchant ordering while retrying?",
              "Where does a circuit breaker fit relative to the retry tiers?",
            ],
            modelAnswerOutline: [
              "Assumptions: internal events produce webhook deliveries to 200k merchant URLs; many endpoints are flaky; per-merchant ordering matters (a 'delivered' must not land before 'picked up'); one bad endpoint must not degrade the other 199,999.",
              "**Isolation is the headline.** The core risk is one slow merchant creating head-of-line blocking for others. I partition the delivery workload by merchant id so a stuck merchant only stalls its own lane, not the shared stream, and I cap concurrent in-flight deliveries per merchant. To stop a single dead endpoint from consuming a worker slot indefinitely I add a **per-endpoint circuit breaker**: after K consecutive failures I open the breaker for that merchant, stop attempting for a cooldown, and let their events accumulate in a per-merchant retry buffer instead of retrying hot. Healthy merchants are unaffected.",
              "**Retry policy.** Transient failures (timeouts, 5xx, 429) retry with exponential backoff plus jitter across tiered delays (30s, 2m, 10m, 1h) over roughly 24 hours, because a merchant's server being down for an hour is normal and I want eventual delivery. A 4xx that indicates a permanently bad URL or rejected payload goes to the DLQ immediately.",
              "**Ordering under retry.** Since per-merchant order matters, I do not let a later event pass a retrying earlier one for the same merchant. Within a merchant lane I hold ordering: if event N is retrying, N+1 waits behind it (bounded), because that merchant's throughput is naturally limited by their own endpoint anyway. Cross-merchant, everything flows independently.",
              "**DLQ.** After 24h of retries or on a permanent error, the delivery goes to a DLQ with the endpoint, payload, and failure history, with alerting on depth and per-merchant failure dashboards so support can flag chronically broken integrations. Redrive lets me replay once a merchant fixes their endpoint. Common wrong turn: a single shared retry queue with no per-merchant isolation or circuit breaker, where a few thousand dead endpoints saturate the worker pool and delay every healthy merchant.",
            ],
          },
        },
      ],
    },
  ],
}
