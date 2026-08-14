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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You move the inventory decrement behind a broker. The user gets a 200, then immediately loads a page that reads inventory. What can that read observe?",
  "options": [
    {
      "label": "Stale state: the decrement may not have landed yet, and the design must tolerate that gap",
      "correct": true,
      "feedback": "Right: async means the effect happens after the response, so a follow-up read can arrive inside the eventual-consistency gap."
    },
    {
      "label": "Always the decremented value, because the broker write is durable before the 200",
      "feedback": "Durability is not visibility: the broker holds the message, but the consumer may not have applied it when the read arrives."
    },
    {
      "label": "An error, because reads are blocked until the consumer finishes",
      "feedback": "Nothing blocks the reader; non-blocking is the whole point of async, which is exactly why the stale window exists."
    }
  ]
}
\`\`\`

\`\`\`cswidget
{
  "type": "queue-sim",
  "title": "The buffer absorbs the burst",
  "predictPrompt": {
    "question": "The consumer is slightly faster than the producer, but a sale spike triples arrivals for a stretch mid-run. What does queue depth do?",
    "options": [
      "It climbs while the spike lasts, then drains back toward zero once it ends",
      "It stays flat because the consumer is faster on average",
      "It keeps growing even after the spike ends"
    ]
  },
  "workedExample": "The starting configuration is the healthy async shape: the consumer drains slightly faster than the producer fills, so depth hugs zero and every message is picked up almost as soon as it lands. When the burst window opens, arrivals triple and outrun the consumer, and the depth curve climbs steadily for as long as the spike lasts. Nothing times out and no caller is waiting; the broker is simply absorbing the excess. The moment the burst ends, the consumer's spare capacity takes over and the backlog drains back toward zero before the run finishes. That triangle in the depth chart is time decoupling: the same spike aimed at a synchronous downstream would have been failed requests instead of temporary lag.",
  "producerRate": 2,
  "consumerRate": 3,
  "ticks": 200,
  "capacity": 60,
  "burst": {
    "from": 60,
    "to": 90,
    "multiplier": 3
  },
  "caption": "Time decoupling in one chart: the spike becomes a temporary backlog that drains, not a wave of failed requests."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The email consumer for OrderPlaced throws on every message tonight. Who notices the failure?",
  "options": [
    {
      "label": "The buyer, whose checkout request returns a 5xx so they can retry",
      "feedback": "The buyer already got a 200 before the consumer ever ran; async failure never reaches that response."
    },
    {
      "label": "Nobody, unless you monitor retries, consumer lag, and DLQ depth",
      "correct": true,
      "feedback": "Right: async pushes failure into the background, so retry policy, a DLQ, and monitoring are mandatory, not optional."
    },
    {
      "label": "The producer service, because the broker returns the consumer's error to it",
      "feedback": "The producer finished when its write to the broker was acked; the broker does not propagate consumer errors back upstream."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Checkout involves several steps. Sort each one: keep it synchronous in the request, or make it an async event behind the broker.",
  "buckets": [
    "Keep synchronous",
    "Async event"
  ],
  "items": [
    {
      "label": "ChargeCard, where a decline must be shown to the user before the response",
      "bucket": "Keep synchronous",
      "feedback": "A command whose result the caller needs must stay in the request path."
    },
    {
      "label": "Save a notification setting the user immediately reads back on the next screen",
      "bucket": "Keep synchronous",
      "feedback": "A read right after the write would land in the eventual-consistency gap and look like a lost save."
    },
    {
      "label": "Send the order confirmation email",
      "bucket": "Async event",
      "feedback": "An independent side effect: the response does not depend on it, so it belongs behind OrderPlaced."
    },
    {
      "label": "Update the analytics counters for the order",
      "bucket": "Async event",
      "feedback": "Analytics never gates the response; one more consumer on the event costs the producer nothing."
    },
    {
      "label": "Let a new fraud team react to orders without the checkout service changing",
      "bucket": "Async event",
      "feedback": "Space decoupling: events let consumers be added without touching the producer."
    }
  ],
  "reveal": "The split is command versus event plus the consistency gap: keep a step synchronous when the caller needs the result or a consistent read right after, and publish independent side effects as events."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Orders flow through an SQS queue that a worker pool drains. A second team asks to read the same messages for analytics. What do they find?",
  "options": [
    {
      "label": "Nothing: the messages were deleted on ack",
      "correct": true,
      "feedback": "Right. Each message went to exactly one worker in the pool and vanished the moment that worker acked, so there is no second reader to serve and no cursor to rewind. Consumed-and-gone is the defining property of a point-to-point queue."
    },
    {
      "label": "A full copy, because the broker keeps everything until every team has read it",
      "feedback": "That describes a log with per-group offsets, not a queue that deletes on ack."
    },
    {
      "label": "The last 30 days, as long as they start reading from offset zero",
      "feedback": "Offsets and replay belong to the log model; a queue has no cursor to rewind."
    }
  ]
}
\`\`\`

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

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Model",
    "Delete on consume?",
    "Who tracks position?",
    "Replay?",
    "Fan-out?"
  ],
  "rows": [
    [
      "Queue (SQS)",
      "yes",
      "broker (per-message ack)",
      "no",
      "no (competing consumers)"
    ],
    [
      "Pub/Sub (SNS)",
      "yes (per subscriber)",
      "broker (per subscriber)",
      "no",
      "yes"
    ],
    [
      "Log (Kafka)",
      "no",
      "consumer (own offset)",
      "yes",
      "yes (per group)"
    ]
  ],
  "highlightCols": [
    "Who tracks position?"
  ],
  "caption": "The two axes that separate the models: whether consuming deletes the message, and who owns the position. Consumer-owned offsets are the whole reason a log gives replay and many independent reader groups."
}
\`\`\`

A queue's broker tracks per-message delivery and acks; it is push-ish and the broker owns state. A
log is pull-based: the consumer owns its offset, which is why one slow consumer group cannot slow
another and why replay is just "reset my offset." That consumer-owned-offset design is the whole
reason a log scales to many independent readers and supports reprocessing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "On a Kafka topic, the analytics consumer group falls two days behind. What happens to the ranking group reading the same topic?",
  "options": [
    {
      "label": "Nothing: each group owns its own offset, so one slow group cannot slow another",
      "correct": true,
      "feedback": "Right: consumer-owned cursors are the whole reason a log serves many independent readers."
    },
    {
      "label": "It slows down too, because the broker tracks one delivery position for the topic",
      "feedback": "Broker-tracked per-message state is the queue model; a log makes each group keep its own cursor."
    },
    {
      "label": "It loses messages, because the broker deletes records once the slow group has read them",
      "feedback": "A log retains by time or size regardless of who has read; consuming never deletes."
    }
  ]
}
\`\`\`

**Interview nuance:** the classic wrong turn is choosing a queue when the requirement is "multiple
independent teams, each reading the full stream, some needing to replay 30 days." A queue deletes on
consume and serves one consumer per message. The moment you hear "replay," "reprocess," or "N
independent consumer groups over the same data," reach for a log.

Recap: a queue distributes work and deletes on ack (no replay); pub/sub fans a copy to every
subscriber; a log retains an ordered stream that many consumer groups read at their own offset and
can replay.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Name the messaging model each requirement points to.",
  "buckets": [
    "Queue",
    "Pub/sub",
    "Log"
  ],
  "items": [
    {
      "label": "Thumbnail jobs where each job must be processed by exactly one worker, then disappear",
      "bucket": "Queue",
      "feedback": "Work distribution with delete-on-ack is exactly the point-to-point queue."
    },
    {
      "label": "A new team must reprocess the last 30 days of the stream from offset zero",
      "bucket": "Log",
      "feedback": "Replay needs retention plus a consumer-owned offset to rewind; only the log has both."
    },
    {
      "label": "Fan a copy of each message into every subscriber's own durable queue, with no need for history",
      "bucket": "Pub/sub",
      "feedback": "Per-subscriber copies without retained history is topic fan-out, the SNS-to-SQS pattern."
    },
    {
      "label": "An un-acked message must reappear for another worker after a crash",
      "bucket": "Queue",
      "feedback": "The visibility timeout is the queue broker's redelivery mechanism for crashed workers."
    },
    {
      "label": "Several independent reader groups over the same retained stream, each at its own cursor",
      "bucket": "Log",
      "feedback": "Independent groups each tracking their own offset is the log's defining read model."
    }
  ],
  "reveal": "Two axes decide it: does consuming delete the message, and who tracks the position. Delete-on-ack with broker-tracked state is a queue, a copy per subscriber is pub/sub, and retained records with consumer-owned offsets is a log."
}
\`\`\`
`.trim()

const brokerSelectionTeach = `
## "We'll use Kafka" is usually the wrong reflex

The senior move is to name the decision drivers, then match the workload to the cheapest tool that
satisfies them. Kafka is a superb distributed log, but it is also operationally heavy (partitions,
consumer groups, rebalancing, retention tuning, and a ZooKeeper or KRaft quorum to run). If you do
not need what it gives, you are paying its tax for nothing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A three-person team with no streaming platform needs to decouple two AWS services exchanging a few thousand messages per hour, with no replay requirement. What is the senior pick?",
  "options": [
    {
      "label": "A managed queue like SQS: it satisfies every driver with zero broker ops",
      "correct": true,
      "feedback": "Right: match the workload to the cheapest tool that satisfies the drivers; nothing here needs a log's retention or throughput."
    },
    {
      "label": "Self-hosted Kafka, so the platform is ready for future scale",
      "feedback": "That is paying the partitions, rebalancing, and quorum tax for guarantees nobody asked for."
    },
    {
      "label": "Pulsar, since it supports both queue and log semantics in one system",
      "feedback": "Pulsar is an even heavier deployment; its multi-tenancy and compute/storage split are not requirements here."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "When is Pulsar the right call over Kafka?",
  "options": [
    {
      "label": "When multi-tenancy or scaling compute independently from storage is a real requirement",
      "correct": true,
      "feedback": "Right: the broker/BookKeeper separation and first-class multi-tenancy are what you buy with its extra deployment complexity."
    },
    {
      "label": "Whenever you need higher raw throughput than Kafka can reach",
      "feedback": "Throughput is not the differentiator; both are high-throughput partitioned logs."
    },
    {
      "label": "Whenever you want simpler operations than Kafka",
      "feedback": "Pulsar's stated cost is a more complex deployment, not a simpler one."
    }
  ]
}
\`\`\`

**Interview nuance:** the strongest answer is sometimes "no broker at all." If the requirement is a
strong-consistency CRUD read after write, a broker adds latency and a stale-read window for nothing;
a direct synchronous call or a database is correct. Reaching for Kafka to decouple two services that
make ten calls a second is over-engineering you should call out.

Recap: match the broker to the drivers (throughput, ordering, retention/replay, delivery, routing,
ops budget); use a log only when replay/throughput justify its ops, a queue for work distribution and
routing, managed services when the team is small, and sometimes no broker at all.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A settings service handles ten writes per second, and users read their setting back immediately after saving. A teammate proposes putting writes behind Kafka for scalability. What is the strongest counter?",
  "options": [
    {
      "label": "Use no broker at all",
      "correct": true,
      "feedback": "Right. A direct synchronous write to the database is the answer here. Ten writes per second fails the throughput driver, nothing asks for replay or fan-out, and the read-after-write requirement means any async hop buys latency plus a stale-read window and nothing else. The cheapest tool that satisfies the drivers is sometimes no broker."
    },
    {
      "label": "Use SQS instead of Kafka, since the team is small",
      "feedback": "A cheaper broker still leaves the stale-read window; the requirement rules out the async hop entirely, not just Kafka."
    },
    {
      "label": "Use Kafka but with a single partition to preserve ordering",
      "feedback": "Ordering was never the problem; the read-after-write requirement makes any async hop the wrong shape."
    }
  ],
  "reveal": "This combines the driver checklist with the strongest answer of all: when the caller needs a consistent read of its own write and throughput is trivial, the cheapest tool that satisfies the drivers is no broker."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Kafka sustains hundreds of MB/s per broker on ordinary disks. Which combination explains it?",
  "options": [
    {
      "label": "Sequential appends, the OS page cache, zero-copy sendfile on reads, and producer batching with compression",
      "correct": true,
      "feedback": "Right: every trick avoids random I/O and user-space copying on the append-only log."
    },
    {
      "label": "An in-heap JVM index that keeps all recent records in memory",
      "feedback": "Kafka deliberately keeps data out of the JVM heap; the OS page cache serves recent data with no user-space copy."
    },
    {
      "label": "Random-access B-tree storage tuned for SSDs",
      "feedback": "The design is the opposite: appending to the end of a file is the one access pattern spinning disks and SSDs both love."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A producer uses acks=1. The leader persists the record and acks, then crashes before any follower replicates it. What happened to that acknowledged write?",
  "options": [
    {
      "label": "It is lost: acks=1 means only the leader had it, and a new leader is elected without it",
      "correct": true,
      "feedback": "Right: leader-only acknowledgment leaves a window where an acked write dies with the leader."
    },
    {
      "label": "It is safe, because an ack always means the full ISR had it",
      "feedback": "That is acks=all; acks=1 returns as soon as the leader alone has persisted the record."
    },
    {
      "label": "It is safe, because the crashed leader replays it to followers when it restarts",
      "feedback": "The failed broker may never return, and the partition moves on under a new leader that never saw the write."
    }
  ]
}
\`\`\`

\`\`\`cswidget
{
  "type": "quorum",
  "title": "Kafka durability: acks=all over the ISR",
  "predictPrompt": {
    "question": "acks=all with min.insync.replicas=1: followers have dropped out of the ISR, the leader alone acknowledges a write, and that broker dies right after the ack. Is the write safe?",
    "options": [
      "Yes, acks=all always waits for every replica",
      "No, the ISR had shrunk to just the leader, so the ack meant one copy and it is gone",
      "Yes, the followers replay it from the leader when it restarts"
    ]
  },
  "workedExample": "Start from the configuration on screen: replication factor 3, so one leader and 2 followers, with min.insync.replicas=2. An acks=all write is accepted only while the ISR holds at least 2 members, so every acknowledged record sits on at least 2 of the 3 replicas. Kill one broker and read the outcome: the write survives on the remaining in-sync replica, which is exactly why RF=3 with min.insync.replicas=2 tolerates one broker loss with zero acknowledged-message loss and still accepts writes. Then drop min.insync.replicas to 1 and kill again: the ISR can shrink to just the leader, all ISR means one copy, and the kill read-out shows the acknowledged write lost. Durable is acks=all and min.insync.replicas>=2 and RF>=3, never acks=all alone.",
  "preset": "kafka",
  "n": 3,
  "w": 2,
  "caption": "RF=3 with min.insync.replicas=2: kill a broker and check whether an acknowledged write survives."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "One design choice, the partitioned append-only commit log, explains both Kafka's throughput and its replay. How?",
  "options": [
    {
      "label": "Appends are sequential, and retained records stay rewindable",
      "correct": true,
      "feedback": "Right. The same immutable log makes the write path a pure sequential append served back out of the page cache, and it leaves the history in place afterwards, so a consumer group can move its offset backward over the very same bytes. One data model, both properties."
    },
    {
      "label": "The log lets the broker delete each record after delivery, keeping disks small and fast",
      "feedback": "Delete-on-delivery is the queue model; Kafka retains records regardless of who has read them, which is exactly what makes replay possible."
    },
    {
      "label": "The metadata quorum coordinates both the write path and replay",
      "feedback": "KRaft manages cluster metadata; it has nothing to do with why appends are fast or why history can be reread."
    }
  ],
  "reveal": "No per-message delete, no random insert, no in-place update: that one data model gives you the fast sequential write path and the retained, offset-addressable history at the same time."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A ledger consumer reads a 100-partition topic and applies events assuming chronological order across the whole topic. What happens under load?",
  "options": [
    {
      "label": "It can apply a withdrawal before its deposit",
      "correct": true,
      "feedback": "Right, and it does so silently. Order holds within a partition only, so 100 partitions are 100 independent sequences interleaved by wall-clock chance and nothing promises order across them. The ledger applies what it reads, in whatever order it happens to read it."
    },
    {
      "label": "Nothing: record timestamps let the consumer reconstruct global order automatically",
      "feedback": "There is no global clock and no global sequence; timestamps do not create an ordering guarantee."
    },
    {
      "label": "The consumer crashes, because Kafka rejects out-of-order reads",
      "feedback": "Kafka happily serves each partition in its own order; the reordering bug is silent, which is what makes it deadly."
    }
  ]
}
\`\`\`

### The key is correctness

A producer computes the partition as \`hash(key) mod partition_count\` (default murmur2). So **all
records with the same key go to the same partition and are totally ordered relative to each other.**
Correctness reduces to one question: which events must be seen in order relative to each other?
Whatever that set is, it must share a key.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Which pairs of events must share a message key to stay safe, and which can live under different keys?",
  "buckets": [
    "Must share a key",
    "Different keys are fine"
  ],
  "items": [
    {
      "label": "A deposit and a withdrawal on the same bank account",
      "bucket": "Must share a key",
      "feedback": "Reordering them can invent an overdraft; co-key them by account_id."
    },
    {
      "label": "created, paid, and shipped for one order",
      "bucket": "Must share a key",
      "feedback": "The lifecycle must stay monotonic, so key by order_id."
    },
    {
      "label": "Two messages in the same chat room",
      "bucket": "Must share a key",
      "feedback": "A room's transcript must read in order; key by conversation_id."
    },
    {
      "label": "Events for two different customers' orders",
      "bucket": "Different keys are fine",
      "feedback": "There is no causal relation across customers, so nothing requires their events to interleave in order."
    },
    {
      "label": "One chat room's messages relative to another room's",
      "bucket": "Different keys are fine",
      "feedback": "Rooms may interleave freely; only the order within each room matters."
    }
  ]
}
\`\`\`

\`\`\`cswidget
{
  "type": "hash-ring",
  "title": "Why partition counts are fixed up front",
  "predictPrompt": {
    "question": "A topic has 4 partitions chosen by hash(key) mod 4. You raise the count to 5. What happens to per-key ordering histories?",
    "options": [
      "Nothing, keys stay put",
      "Only new keys are affected",
      "Most keys change partition, splitting their histories"
    ]
  },
  "workedExample": "Keys here are message keys; colors are partitions. In mod-N mode, add a partition and read the remap: most keys now hash to a different partition, so an account's history continues somewhere new and per-key order is broken across the change. That is why partition counts are chosen generously up front. The ring view shows what Dynamo-style stores do instead; Kafka deliberately does not.",
  "initialNodes": 4,
  "maxNodes": 6,
  "keys": 48,
  "initialMode": "modulo",
  "vnodeFactor": 16
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A celebrity account floods its partition, so you salt the key and its events spread across 8 partitions. What did you just trade away?",
  "options": [
    {
      "label": "Strict per-account ordering",
      "correct": true,
      "feedback": "Right. Order lives inside a single partition, so once the account's events land on eight of them, ordering survives only within each salted sub-stream and a downstream merge has to re-establish the account-level sequence by sequence number. Every hot-key mitigation trades ordering scope for throughput."
    },
    {
      "label": "Durability, because salted records skip replication",
      "feedback": "Salting only changes which partition a record hashes to; replication is untouched."
    },
    {
      "label": "Nothing, because Kafka reorders across partitions for you",
      "feedback": "There is no cross-partition ordering to fall back on; that absence is exactly what the salt breaks for this account."
    }
  ],
  "reveal": "The hot-key options and the ordering rule are the same lesson: strict single-stream order caps you at one partition's throughput, and any widening of the key downgrades the ordering scope and pushes reassembly downstream."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A 12-partition topic is falling behind, so the team scales its consumer group from 12 to 16 consumers. What improves?",
  "options": [
    {
      "label": "Nothing: each partition is assigned to at most one consumer in the group, so four consumers sit idle",
      "correct": true,
      "feedback": "Right: group parallelism is capped by partition count, and consumers past that cap do nothing."
    },
    {
      "label": "Throughput rises by a third, since the work is now split 16 ways",
      "feedback": "Partitions, not consumers, are the unit of parallelism; 12 partitions cannot be split 16 ways."
    },
    {
      "label": "Latency drops, because idle consumers share reads with the partition owners",
      "feedback": "An idle consumer takes over only after a rebalance; it never reads a partition concurrently with its owner."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A consumer commits offsets only after its payment side effect is durably done. It crashes after processing but before committing. What happens on restart?",
  "options": [
    {
      "label": "The message is reprocessed and the handler sees a duplicate",
      "correct": true,
      "feedback": "Right. Commit-after-process is at-least-once: the payment really happened but the committed offset never advanced past it, so the broker redelivers. Commit timing trades lost work for duplicate work, and duplicates surround every crash and every rebalance, which is why the handler has to be idempotent."
    },
    {
      "label": "The message is skipped, because the broker saw it delivered once already",
      "feedback": "The broker only knows the committed offset; an uncommitted message is redelivered, not skipped."
    },
    {
      "label": "Kafka rolls back the payment so the retry starts clean",
      "feedback": "Kafka cannot undo your external side effect; neutralizing the repeat is the handler's job, which is why idempotency is required."
    }
  ]
}
\`\`\`

### Rebalancing, the sharp edge

When a consumer joins, leaves, or is presumed dead (misses heartbeats), the group **rebalances**:
partitions are reassigned. The classic "eager" protocol is **stop-the-world**: every consumer revokes
all its partitions, then the group reassigns from scratch, so the entire group stops for the
rebalance (hundreds of ms to seconds). A deploy that restarts 30 consumers one by one can trigger 30
rebalances, each a latency and duplicate spike.

\`\`\`cswidget
{
  "type": "sequence",
  "title": "A deploy triggers a rebalance",
  "actors": [
    {
      "id": "coordinator",
      "label": "Group coordinator"
    },
    {
      "id": "c1",
      "label": "Consumer 1"
    },
    {
      "id": "c2",
      "label": "Consumer 2"
    },
    {
      "id": "c3",
      "label": "Consumer 3"
    }
  ],
  "toggles": [
    {
      "id": "deploy",
      "label": "Deploy restarts consumer 2",
      "description": "A rolling deploy takes consumer 2 down mid-batch, long enough to miss heartbeats."
    }
  ],
  "steps": [
    {
      "from": "coordinator",
      "to": "c1",
      "label": "Assign p0,p1",
      "kind": "event",
      "status": "ok"
    },
    {
      "from": "coordinator",
      "to": "c2",
      "label": "Assign p2,p3",
      "kind": "event",
      "status": "ok"
    },
    {
      "from": "coordinator",
      "to": "c3",
      "label": "Assign p4,p5",
      "kind": "event",
      "status": "ok"
    },
    {
      "from": "c2",
      "to": "coordinator",
      "label": "Heartbeat",
      "kind": "request",
      "status": "ok",
      "when": "!deploy"
    },
    {
      "from": "c2",
      "label": "Steady consumption, lag flat",
      "kind": "note",
      "status": "ok",
      "when": "!deploy",
      "state": {
        "duplicates": "0"
      }
    },
    {
      "from": "coordinator",
      "label": "No rebalance needed",
      "kind": "note",
      "status": "ok",
      "when": "!deploy",
      "state": {
        "duplicates": "0"
      }
    },
    {
      "from": "c2",
      "label": "Deploy: consumer 2 restarts",
      "kind": "note",
      "status": "ok",
      "when": "deploy",
      "state": {
        "duplicates": "0"
      }
    },
    {
      "from": "c2",
      "to": "coordinator",
      "label": "Heartbeat missed",
      "kind": "request",
      "status": "lost",
      "when": "deploy"
    },
    {
      "from": "coordinator",
      "label": "session.timeout.ms expires",
      "kind": "timer",
      "status": "late",
      "when": "deploy"
    },
    {
      "from": "coordinator",
      "to": "c1",
      "label": "Rebalance: revoke all (eager)",
      "kind": "event",
      "status": "error",
      "when": "deploy",
      "predict": {
        "question": "Consumer 2 had processed part of a batch on p2 but not yet committed the offsets. What happens to that in-flight work at the rebalance?",
        "options": [
          "It is lost forever: at-most-once",
          "The new owner reprocesses it, so duplicates appear",
          "The coordinator finishes the batch itself"
        ]
      }
    },
    {
      "from": "c1",
      "label": "Work pauses: stop-the-world",
      "kind": "note",
      "status": "error",
      "when": "deploy"
    },
    {
      "from": "c3",
      "label": "p4,p5 paused too",
      "kind": "note",
      "status": "error",
      "when": "deploy"
    },
    {
      "from": "coordinator",
      "to": "c1",
      "label": "Assign p0,p1,p2",
      "kind": "event",
      "status": "ok",
      "when": "deploy"
    },
    {
      "from": "coordinator",
      "to": "c3",
      "label": "Assign p3,p4,p5",
      "kind": "event",
      "status": "ok",
      "when": "deploy"
    },
    {
      "from": "c1",
      "label": "Redo uncommitted p2 work",
      "kind": "note",
      "status": "late",
      "when": "deploy",
      "state": {
        "duplicates": "7"
      }
    },
    {
      "from": "c3",
      "label": "Redo uncommitted p3 work",
      "kind": "note",
      "status": "late",
      "when": "deploy",
      "state": {
        "duplicates": "14"
      }
    },
    {
      "from": "coordinator",
      "label": "Idempotent handlers required",
      "kind": "note",
      "status": "ok",
      "when": "deploy",
      "state": {
        "duplicates": "14"
      }
    }
  ],
  "caption": "Commit-after-process is at-least-once, so every rebalance handoff makes the new owner reprocess uncommitted work: duplicates are guaranteed, and only idempotent handlers neutralize them. Cooperative rebalancing moves only p2,p3 instead of revoking everything, and static group membership (group.instance.id) lets a restarting consumer rejoin with its old assignment so a rolling deploy causes no rebalance at all."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Consumer lag keeps rising on a 12-partition topic, and the group already runs 12 consumers on healthy CPUs. What actually helps?",
  "options": [
    {
      "label": "Make the handler faster, or add partitions",
      "correct": true,
      "feedback": "Right. Lag is still the correct signal, but the lever it normally pulls has run out: group parallelism is capped by partition count and the group is sitting on that cap. From here the only levers left are per-message cost and partition count."
    },
    {
      "label": "Add four more consumers, since rising lag says scale out",
      "feedback": "Lag is the right trigger, but consumers 13 through 16 would sit idle; the partition cap binds first."
    },
    {
      "label": "Switch the autoscaler to CPU, since lag is clearly misleading here",
      "feedback": "CPU can look healthy while the group drowns; lag is still the truth, the bottleneck is just past the consumer count."
    }
  ],
  "reveal": "Two rules combine: lag, not CPU, is the health signal, and group parallelism is capped by partition count. When lag rises at the cap, the lever is per-message speed or partition count, not more consumers."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Pick the retention policy each topic needs.",
  "buckets": [
    "Delete retention (stream)",
    "Compaction (table)"
  ],
  "items": [
    {
      "label": "Seven days of clickstream that analytics may replay within the window",
      "bucket": "Delete retention (stream)",
      "feedback": "A time-bounded immutable history is delete retention; the replay window is the retention window."
    },
    {
      "label": "Current user profile keyed by user_id, rebuildable by any new consumer",
      "bucket": "Compaction (table)",
      "feedback": "Latest-value-per-key is exactly what compaction guarantees; reading from offset 0 materializes the current state."
    },
    {
      "label": "An audit log where every historical event must survive within its window",
      "bucket": "Delete retention (stream)",
      "feedback": "Compaction garbage-collects superseded values, which would destroy the history an audit needs."
    },
    {
      "label": "The changelog a Kafka Streams KTable restores its state store from",
      "bucket": "Compaction (table)",
      "feedback": "A KTable rebuild reads the compacted tail as the current state of every key."
    }
  ]
}
\`\`\`

\`\`\`
Compacted topic keyed by user_id, before compaction:
  (u1,"A") (u2,"X") (u1,"B") (u3,"Q") (u1,"C") (u2,"Y")
After compaction keeps latest per key:
  (u3,"Q") (u1,"C") (u2,"Y")   <- current state of every user
\`\`\`

**Deletes in a compacted topic** use a **tombstone**: a record with the key and a \`null\` value.
Compaction keeps the tombstone long enough for all consumers to observe the deletion, then removes
both the tombstone and all prior values for that key.

\`\`\`cswidget
{
  "type": "steps",
  "title": "Log compaction: latest value per key",
  "frames": [
    {
      "note": "A compacted topic keyed by user_id. u1 was written three times (A, then B, then C), u2 twice (X, then Y), and u3 once (Q). The raw log still holds every superseded version.",
      "rows": [
        {
          "label": "log",
          "cells": [
            {
              "text": "u1=A"
            },
            {
              "text": "u2=X"
            },
            {
              "text": "u1=B"
            },
            {
              "text": "u3=Q"
            },
            {
              "text": "u1=C"
            },
            {
              "text": "u2=Y"
            }
          ]
        }
      ]
    },
    {
      "note": "Compaction guarantees at least the latest value for every key. For u1 the latest is C, so the superseded A and B are garbage-collected in the background.",
      "rows": [
        {
          "label": "log",
          "cells": [
            {
              "text": "u1=A",
              "state": "dropped"
            },
            {
              "text": "u2=X",
              "state": "dim"
            },
            {
              "text": "u1=B",
              "state": "dropped"
            },
            {
              "text": "u3=Q",
              "state": "dim"
            },
            {
              "text": "u1=C",
              "state": "active"
            },
            {
              "text": "u2=Y",
              "state": "dim"
            }
          ]
        }
      ],
      "predict": {
        "question": "Which u2 record survives compaction?",
        "options": [
          "u2=X, it was written first",
          "u2=Y, it is the latest value",
          "Both survive"
        ]
      }
    },
    {
      "note": "Same rule for u2: Y supersedes X, so X is dropped. u3 only ever wrote Q, so Q is already the latest for its key and is kept untouched.",
      "rows": [
        {
          "label": "log",
          "cells": [
            {
              "text": "u1=A",
              "state": "dropped"
            },
            {
              "text": "u2=X",
              "state": "dropped"
            },
            {
              "text": "u1=B",
              "state": "dropped"
            },
            {
              "text": "u3=Q",
              "state": "active"
            },
            {
              "text": "u1=C",
              "state": "dim"
            },
            {
              "text": "u2=Y",
              "state": "active"
            }
          ]
        }
      ]
    },
    {
      "note": "The compacted tail is the current state of every key: u3=Q, u1=C, u2=Y. A brand-new consumer reads from offset 0 and materializes this entire table with no database, exactly how Kafka Streams rebuilds a KTable and CDC pipelines bootstrap read models.",
      "rows": [
        {
          "label": "compacted",
          "cells": [
            {
              "text": "u3=Q",
              "state": "new"
            },
            {
              "text": "u1=C",
              "state": "new"
            },
            {
              "text": "u2=Y",
              "state": "new"
            }
          ]
        }
      ]
    }
  ],
  "caption": "cleanup.policy=compact keeps at least the latest value per key, turning the log into a rebuildable table/changelog."
}
\`\`\`

**Interview nuance:** GDPR/right-to-erasure collides with long retention. An immutable 7-year audit
stream cannot literally delete one user's records without breaking immutability, so the standard
pattern is **crypto-shredding**: encrypt per-subject data with a per-user key and delete the key to
render the data unrecoverable, rather than mutating the log. On a compacted topic, a tombstone plus
compaction does the erasure directly.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A user invokes right-to-erasure against your immutable 7-year audit stream. What is the standard pattern?",
  "options": [
    {
      "label": "Crypto-shredding: delete that user's key",
      "correct": true,
      "feedback": "Right. Their data was encrypted under a key belonging to them alone, so destroying the key renders every copy unrecoverable without rewriting a byte. You erase access rather than bytes, which keeps the stream immutable and every consumer offset into it still valid."
    },
    {
      "label": "Rewrite the log with that user's records filtered out",
      "feedback": "Rewriting seven years of an append-only stream breaks immutability and every consumer offset into it."
    },
    {
      "label": "Nothing is needed: immutable logs are exempt from erasure",
      "feedback": "Erasure still applies; crypto-shredding, or a tombstone on a compacted topic, is how immutable systems comply."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A topic retains 7 days of events. The consumer's dedup store remembers processed ids for 24 hours. An incident forces a replay from 6 days back. What happens?",
  "options": [
    {
      "label": "Day-6 events sail past the expired dedup memory and are applied a second time",
      "correct": true,
      "feedback": "Right: retention sets how far you can replay while the dedup window sets how far you are safe, so the dedup window must be at least the replay window."
    },
    {
      "label": "Nothing: replayed records carry the same offsets, so the consumer knows it has seen them",
      "feedback": "An offset is a position, not a processed-id memory; after a reset the consumer just reads forward and applies."
    },
    {
      "label": "Kafka refuses to rewind further back than the dedup TTL",
      "feedback": "Kafka knows nothing about your consumer's dedup store; it serves anything still inside retention."
    }
  ],
  "reveal": "Retention gives you the replay window; idempotency gives you safety inside it. Size them together: a 7-day replay window with a 24-hour dedup memory is a double-apply waiting for its first incident."
}
\`\`\`
`.trim()

const deliverySemanticsTeach = `
## Three promises a pipeline can make

Level 5's distributed-systems theory already proved the theorem this lesson stands on: **exactly-once delivery over a network is impossible**, because a sender that never gets an ack cannot tell "message lost" from "ack lost" (the Two Generals problem). Take that as settled. The operational question here is the one the theory does not answer: given that impossibility, which of three promises does your pipeline actually make, and where does the ack sit that decides it?

Every message pipeline makes one of three promises, and stating which one, end to end, is the single most important sentence in an async design.

**At-most-once**: a message is delivered zero or one times. You never see a duplicate, but you can lose messages. You get this by acknowledging (committing your read position) *before* you process. If the consumer crashes after the commit but before the work finishes, that message is gone forever. Fine for a metrics sample or a best-effort log line, unacceptable for a payment.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Now flip the ack: the consumer processes first and commits its position only after success, then crashes between processing and the commit. What do you observe on restart?",
  "options": [
    {
      "label": "The message is redelivered and processed again: no loss, but a duplicate, which is at-least-once",
      "correct": true,
      "feedback": "Right: moving the ack after the work converts possible loss into possible repetition."
    },
    {
      "label": "The message is gone, exactly like the commit-before-process case",
      "feedback": "Loss requires the position to advance past unprocessed work; here the commit never happened, so the broker still holds the message."
    },
    {
      "label": "Neither loss nor duplicate, since the crash happened after the work finished",
      "feedback": "The broker cannot see that the work finished, only that no ack arrived, so it must redeliver; that ambiguity is the Two Generals problem."
    }
  ]
}
\`\`\`

**At-least-once**: a message is delivered one or more times. You never lose a message, but you can see duplicates. You get this by processing *first* and acknowledging *after* success. If the consumer crashes after processing but before the ack, the broker redelivers on restart and you process again. This is the practical default for anything that matters, because losing data is usually worse than repeating work, and repeats can be neutralized (see the idempotency lesson).

**Exactly-once**: every message takes effect once, no loss, no duplicate. This is what everyone wants and what the network cannot give you.

## From impossible delivery to exactly-once processing

Since delivery itself cannot be exactly-once (the impossibility is stated above and proved in Level 5), the useful move is to redefine the goal. So what do the vendors mean by "exactly-once"? They mean **exactly-once processing**, achieved by taking at-least-once delivery and making the effect idempotent or transactional so that duplicates do not change the outcome. You convert a delivery guarantee into a processing guarantee at the consumer.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A streaming vendor advertises exactly-once. Given that exactly-once delivery over a network is impossible, what are they actually selling?",
  "options": [
    {
      "label": "Exactly-once processing, not exactly-once delivery",
      "correct": true,
      "feedback": "Right. They ship at-least-once delivery and then make the effect idempotent or transactional at the consumer, so a duplicate arrival does not change the outcome. The guarantee moved off the transport and onto the effect; the network still duplicates exactly as before."
    },
    {
      "label": "A broker that solved the Two Generals problem with a better ack protocol",
      "feedback": "No ack protocol escapes it: a sender still cannot tell a lost message from a lost ack."
    },
    {
      "label": "At-most-once delivery with a very low loss rate",
      "feedback": "At-most-once drops data; vendors build on at-least-once and make the repeats harmless, not rarer."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A consumer with Kafka EOS enabled reads an event, calls Stripe to charge the card, and writes a result record, all inside a Kafka transaction. A rebalance causes redelivery. Is the customer charged exactly once?",
  "options": [
    {
      "label": "Not guaranteed: the Stripe call sits outside the transaction",
      "correct": true,
      "feedback": "Right. EOS atomically commits the consumer's read offset together with the produced records, and both of those live inside Kafka. The charge left Kafka, so it rides plain at-least-once and needs an idempotency key you attach to the Stripe request yourself."
    },
    {
      "label": "Yes: the transaction rolls the Stripe charge back along with the offsets",
      "feedback": "Kafka transactions span Kafka topics only; no third-party API joins the transaction, so the charge cannot be rolled back."
    },
    {
      "label": "Yes, as long as the producer also sets acks=all",
      "feedback": "acks controls durability of writes into Kafka, not duplication of an external call on redelivery."
    }
  ],
  "reveal": "Two ideas combine: redelivery duplicates are inherent to at-least-once, and Kafka EOS neutralizes them only for offsets and records inside Kafka. Any effect that leaves Kafka, an email, a charge, a non-transactional write, needs its own idempotency."
}
\`\`\`
`.trim()

const idempotencyDedupTeach = `
## Idempotency, past the definition

Level 5's delivery-and-idempotency lesson established the key mechanics: attach a unique **idempotency key** to a request, do the work once, store the *result* keyed by that key, and return the stored result on any retry, all written atomically with the side effect. This lesson takes that as given and goes at the two things that actually break in production once you accept at-least-once delivery: the concurrent-duplicate race, and how long you must remember a key.

## The concurrent-duplicate race

**The concurrent-duplicate race** is what interviewers probe. Two copies of the same request arrive at two servers at the same millisecond. A read-then-write check ("is this key present? no -> insert") has a race between the read and the write where both pass, both execute, and you double-apply. You must make the check-and-set **atomic**:

\`\`\`
  INSERT INTO idempotency_keys (key, status, result)
  VALUES ($1, 'in_progress', NULL)
  ON CONFLICT (key) DO NOTHING;
  -- exactly one inserter wins the unique constraint; the loser
  -- re-reads the row and waits for / returns the winner's result
\`\`\`

A unique constraint (or a Redis \`SET key value NX\`, or a DynamoDB conditional \`PutItem\` with \`attribute_not_exists\`) makes exactly one writer win. The loser reads back the row: if it is \`in_progress\`, it waits or returns 409/retry; if \`completed\`, it returns the stored result.

**Store the result, not a boolean.** This is the detail the race turns on. If the dedup store keeps only a "seen" flag, two concurrent duplicates both find "not seen," both execute, and there is no stored answer to hand back. Save the outcome (the created order id, the HTTP response body) keyed by the idempotency key, and return it verbatim on any repeat.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Two copies of the same request hit two servers at the same millisecond. The dedup store keeps only a seen flag per key, checked with a read-then-write. What happens?",
  "options": [
    {
      "label": "Both requests pass the check, both execute, and there is no stored result to hand back on later retries",
      "correct": true,
      "feedback": "Right: the read-then-write race lets both pass, and a bare flag leaves nothing to return, which is why the fix is an atomic check-and-set that stores the result."
    },
    {
      "label": "The second request finds the flag set and safely returns the first request's response",
      "feedback": "A flag cannot return a response because no result was saved, and at the same millisecond the flag is not yet set when the second read happens."
    },
    {
      "label": "The database serializes the two writes, so only one request executes",
      "feedback": "Without a unique constraint or conditional write there is nothing to serialize on; the read and the write are separate steps and both reads pass."
    }
  ]
}
\`\`\`

## Sizing the dedup window

The dedup store keeps keys for a TTL, and that TTL must be **at least as long as the longest window in which a duplicate can arrive.** Two windows matter: the client retry horizon (how long clients keep retrying, usually minutes) and the broker **replay/retention** window (Kafka can replay days of history during a reprocess or consumer reset). If your dedup TTL is 1 hour but you replay a 3-day-old topic, every replayed message looks new and re-applies. Size the TTL to cover the replay window, or use a permanent natural key so replays are inherently safe.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your dedup TTL is 1 hour and clients stop retrying after 5 minutes. An incident forces you to replay 3 days of a Kafka topic. What happens to the replayed messages?",
  "options": [
    {
      "label": "Every replayed message looks new to the dedup store and re-applies its side effect",
      "correct": true,
      "feedback": "Right: the keys expired long ago, so the TTL must cover the broker replay window, not just the client retry horizon."
    },
    {
      "label": "The dedup store still recognizes them because keys are only evicted under memory pressure",
      "feedback": "The TTL is a hard expiry, not a memory-pressure heuristic; after 1 hour the keys are gone."
    },
    {
      "label": "Kafka suppresses duplicates during replay so the dedup store never sees them",
      "feedback": "Replay is the point of the log: the broker redelivers everything in the retention window and leaves dedup entirely to you."
    }
  ]
}
\`\`\`

## The idempotency toolkit

The dedup store is the general fallback, but two cheaper flavors come first when the operation allows:

1. **Naturally idempotent operations.** \`SET status = shipped\` or an upsert keyed by a stable id lands in the same state however many times it runs. Design for this where you can. \`INCR balance\` is the opposite: repeating it corrupts state, so counters need explicit protection.
2. **Idempotent by design via state machines.** Model the aggregate as states with legal transitions (\`CREATED -> PAID -> SHIPPED\`). A command that tries an already-taken transition is a no-op, and a per-aggregate **expected version** (optimistic concurrency) rejects a replayed or stale command outright.
3. **Enforced idempotency via a dedup store.** For everything else, the idempotency-key-plus-stored-result machinery above, guarded by the atomic check-and-set.

**Interview nuance:** distinguish the idempotency key's *scope*. A client-supplied key dedups client retries of the same logical request. An event-id key dedups broker redeliveries. They are different keys guarding different duplicate sources, and a robust design often uses both.

**Recap:** past the L5 key mechanics, the two production hazards are the concurrent-duplicate race (resolve it with an atomic check-and-set on a unique constraint, storing the *result* not a flag) and the dedup window (size the TTL to cover both the client-retry and broker-replay horizons); prefer naturally idempotent operations or state-machine transitions before falling back to a dedup store.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A 3-day replay hits two consumers. Consumer A runs SET status = shipped keyed by order id. Consumer B runs INCR balance guarded by a dedup store with a 1-hour TTL. Which one corrupts state, and why?",
  "options": [
    {
      "label": "B: an increment is not naturally idempotent",
      "correct": true,
      "feedback": "Right, and both hazards land on B at once. INCR corrupts state every time it repeats, so it needs explicit protection, and the protection it has expired two days before the replay reached it. A is safe with no store at all, because SET status = shipped keyed by a stable order id lands in the same state however many times it runs."
    },
    {
      "label": "A: repeated SETs push the order through its lifecycle again",
      "feedback": "SET status = shipped keyed by a stable id lands in the same state however many times it runs; that is exactly what naturally idempotent means."
    },
    {
      "label": "Both: any replayed message re-applies once the dedup TTL has passed",
      "feedback": "The dedup window only matters for operations that need a dedup store; a naturally idempotent operation is safe with no store at all."
    }
  ]
}
\`\`\`
`.trim()

const retriesDlqBackpressureTeach = `
## Failure handling decides whether your pipeline degrades or wedges

A consumer that calls anything flaky (a third-party API, a downstream service) will hit failures. How you handle those failures decides whether your pipeline degrades gracefully or wedges completely.

**Retries with backoff and jitter.** Transient failures (a 503, a timeout, a throttle) should be retried, but naively retrying immediately in a tight loop turns a downstream blip into a self-inflicted DDoS. Use **exponential backoff** (wait 1s, 2s, 4s, 8s) plus **jitter** (randomize the delay) so a fleet of consumers that all failed at once do not retry in a synchronized thundering herd. Cap the attempts (say 5) so a permanently broken message does not retry forever.

\`\`\`cswidget
{
  "type": "queue-sim",
  "title": "A retry storm is self-inflicted load",
  "predictPrompt": {
    "question": "A short downstream blip makes every failed call retry immediately, multiplying arrivals several times over, while the consumer barely outruns the normal producer rate. What does the unbounded queue look like after the blip ends?",
    "options": [
      "A large backlog that takes far longer to drain than the blip lasted",
      "Depth returns to zero as soon as the downstream recovers",
      "No backlog forms because retries replace messages instead of adding them"
    ]
  },
  "workedExample": "The run starts healthy: the consumer has a little headroom over the producer, so depth stays near zero. Then the downstream blip hits and every failed call is retried immediately, so arrivals jump to several times the consumer's rate and the depth curve climbs steeply for the whole storm. Watch what happens after the blip ends: because the consumer's headroom over the normal producer rate is thin, the drain is a long shallow slope, and the backlog outlives the blip that caused it by a wide margin. Now flip to the bounded queue: depth stops at the cap and the overflow is shed or pushed back on the producer instead of accumulating, so the pipeline recovers soon after the storm passes. A bounded queue plus capped backoff with jitter is the defense; the storm itself was load you generated.",
  "producerRate": 2,
  "consumerRate": 2.5,
  "ticks": 240,
  "capacity": 40,
  "burst": {
    "from": 50,
    "to": 100,
    "multiplier": 4
  },
  "caption": "The blip is short; the backlog it leaves is not. Capped backoff with jitter and a bounded queue keep a retry storm from wedging the pipeline."
}
\`\`\`

**Transient vs permanent errors.** Classify the failure. A timeout or 429 is transient: retry it. A 400 "malformed payload" or a schema violation is permanent: retrying will never succeed, so send it straight to the dead-letter queue instead of burning 5 attempts. Blindly retrying permanent errors wastes capacity and delays the DLQ signal.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each failure by what the consumer should do with it.",
  "buckets": [
    "Retry with backoff",
    "Straight to the DLQ"
  ],
  "items": [
    {
      "label": "Downstream returns a 503 during a deploy",
      "bucket": "Retry with backoff",
      "feedback": "A 503 is transient; capped exponential backoff plus jitter gives the downstream room to recover."
    },
    {
      "label": "A 429 throttle from a third-party API",
      "bucket": "Retry with backoff",
      "feedback": "Throttles pass; backing off is exactly what the 429 is asking for."
    },
    {
      "label": "A 400 malformed payload",
      "bucket": "Straight to the DLQ",
      "feedback": "Retrying a permanently bad payload will never succeed; burning 5 attempts just delays the DLQ signal."
    },
    {
      "label": "A message that violates the topic schema",
      "bucket": "Straight to the DLQ",
      "feedback": "A schema violation is permanent; no number of retries fixes the bytes."
    }
  ],
  "reveal": "Classify before you retry: transient errors get capped backoff with jitter, permanent errors skip retries entirely so the DLQ alert fires sooner."
}
\`\`\`

## The dead-letter queue

When a message exhausts its retries (or fails permanently), you must not drop it silently and you must not let it block the stream. You route it to a **dead-letter queue or topic**: a separate destination holding failed messages with their error context and attempt count. The DLQ needs three things to be useful: **alerting** (DLQ depth greater than zero pages someone), **inspection** (you can read why each message failed), and **redrive** (tooling to replay fixed messages back onto the main topic after you deploy a fix). A DLQ with no alerting is just a place data goes to die.

## Head-of-line blocking, the core Kafka trap

A Kafka partition is a strictly ordered log, and a consumer processes it in order, one offset at a time. If message at offset 100 keeps failing and you retry it in place, you **cannot advance to offset 101** without either committing past the failure (losing it) or blocking forever. One poison message stalls the entire partition and everything behind it. This is head-of-line blocking, and it is the number one wrong turn in async design.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Offset 100 on a partition keeps failing. You move it to a delayed retry topic, commit offset 100, and let the partition flow. What did you just trade away?",
  "options": [
    {
      "label": "Strict per-key ordering: the failed message will now be processed after messages that were behind it",
      "correct": true,
      "feedback": "Right: leaving the ordered partition is the price of unblocking it, which is why this fits workloads where per-message success beats strict order."
    },
    {
      "label": "Durability: the message only lives in consumer memory until the retry fires",
      "feedback": "A retry topic is itself a durable log; nothing sits in memory waiting for the delay."
    },
    {
      "label": "Nothing: the retry topic preserves the original partition's ordering guarantees",
      "feedback": "Ordering is a property of one partition's sequence; a message that leaves and re-enters later has left that sequence."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Lag is climbing on exactly one partition while its siblings drain fine, and the consumer log shows the same offset failing over and over. Why will adding more consumers not fix this?",
  "options": [
    {
      "label": "The partition is head-of-line blocked by a poison message",
      "correct": true,
      "feedback": "Right. A partition is assigned to at most one consumer in the group, so no extra worker can take it over, and the offset that keeps failing holds every message behind it. Only moving that message to a retry topic or the DLQ lets the flow resume. This is the bad-message failure mode, not the slow-consumer one, so the autoscale-on-lag playbook does not apply."
    },
    {
      "label": "Autoscaling only helps once lag exceeds the broker's retention window",
      "feedback": "Retention bounds how long the log can buffer, not when scaling helps; the blocker here is ordering, not capacity."
    },
    {
      "label": "More consumers would help, but only after you raise the partition count",
      "feedback": "Repartitioning adds parallelism for throughput problems; a poison message would still wedge whichever partition it lands on."
    }
  ]
}
\`\`\`
`.trim()

const streamProcessingTeach = `
## Batch answers a bounded set; a stream never completes

Batch processing sees a whole bounded dataset and computes an answer. Stream processing computes continuously over an unbounded, never-complete dataset, so the hard question is not "what is the answer" but "when do I emit it, given that more data for the period I am aggregating might still arrive." Everything in stream processing flows from three clocks and a promise about lateness.

## Three clocks

*Event time* is when the thing actually happened (stamped by the producing device). *Ingestion time* is when the broker received it. *Processing time* is when your operator sees it. These differ because of network delay, mobile clients going offline, retries, and partition skew. A phone can sit in a tunnel for 30 seconds with its events piling up locally, then flush the whole batch the instant it reconnects.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A phone buffers 30 seconds of events in a tunnel, then flushes them. Your per-user counts aggregate by processing time. What do the dashboards show?",
  "options": [
    {
      "label": "The burst lands in the wrong 5-minute bucket, so the counts are silently wrong",
      "correct": true,
      "feedback": "Right: processing time stamps events with when your operator saw them, not when they happened, which is why correct analytics uses event time."
    },
    {
      "label": "The events are rejected as late and the counts run low",
      "feedback": "Nothing rejects them; processing-time windows happily accept the burst, they just file it under the wrong period."
    },
    {
      "label": "The broker rewrites the timestamps at ingestion so the buckets stay correct",
      "feedback": "Ingestion time is a third clock, not a fix; it still reflects arrival at the broker, not when the events actually happened."
    }
  ]
}
\`\`\`

If you aggregate by processing time, that burst lands in the wrong 5-minute bucket and your per-user counts are silently wrong: the tunnel period reads as empty and the reconnect minute reads as a spike, and neither number ever happened. Correct real-time analytics almost always uses **event time**, because the producing device already stamped the only clock that describes when the thing occurred.

## Windows

You cut the infinite stream into finite chunks. *Tumbling* windows are fixed, non-overlapping (every event in exactly one 5-minute bucket). *Sliding* windows overlap (a 5-minute window advancing every 1 minute, so each event is in five windows: this is what you want for "rolling 5-minute rate"). *Session* windows group bursts separated by a gap of inactivity (great for user sessions, sized dynamically).

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each requirement to the window type that fits it.",
  "buckets": [
    "Tumbling",
    "Sliding",
    "Session"
  ],
  "items": [
    {
      "label": "Every event counted in exactly one 5-minute bucket",
      "bucket": "Tumbling",
      "feedback": "Fixed, non-overlapping buckets are the tumbling definition."
    },
    {
      "label": "A rolling 5-minute error rate refreshed every minute",
      "bucket": "Sliding",
      "feedback": "Overlap is the point: each event participates in five windows as the 5-minute window advances by 1 minute."
    },
    {
      "label": "Group one user's burst of clicks, ended by 30 minutes of inactivity",
      "bucket": "Session",
      "feedback": "Session windows are sized dynamically by a gap of inactivity, so each burst becomes its own window."
    },
    {
      "label": "Each event must appear in five overlapping windows",
      "bucket": "Sliding",
      "feedback": "Only overlapping windows put one event in multiple buckets; tumbling puts it in exactly one."
    }
  ]
}
\`\`\`

## Watermarks

A watermark is the engine's assertion "I believe I have now seen all events with event time <= T." It is a heuristic, usually \`max_event_time_seen - allowed_lateness\`. When the watermark passes a window's end, the window *fires* and emits its result. This is the mechanism that lets an unbounded stream produce bounded, timely output. You tune the lateness bound: a tight bound (say 5s) gives low latency but drops stragglers; a loose bound (say 5 min) waits longer but captures late data. *Allowed lateness* additionally keeps a window's state around after firing so a late event can trigger an updated (retracted/corrected) result instead of being dropped.

\`\`\`cswidget
{
  "type": "watermark-sim",
  "title": "Watermarks: when does a window fire?",
  "predictPrompt": {
    "question": "A phone buffers events in a tunnel and flushes them well after they happened. With allowed lateness at zero, what happens to those events when they arrive after the watermark already fired their window?",
    "options": [
      "They are dropped and the fired count stays silently wrong",
      "The window's state is still around, so it emits a corrected result",
      "They are counted in whichever window is currently open"
    ]
  },
  "workedExample": "Events stream in mostly on time, but a seeded slice arrives well behind its event time, like a phone flushing after a tunnel. The watermark trails the max event time seen by a small delay, and when it passes a window's end that window fires and emits. With the lateness slider at zero, stragglers arriving after their window fired are dropped, so the emitted count is silently short. Drag the slider up: the window's state is kept around after firing, a late event triggers an updated, corrected result, and you pay with later finality. The slider is exactly the trade the lesson names: a tight bound gives low latency but drops stragglers, a loose bound waits longer but captures late data.",
  "seed": "l6-stream-watermarks",
  "count": 60,
  "horizon": 120,
  "skew": 12,
  "windowSize": 20,
  "watermarkDelay": 6,
  "allowedLateness": 0,
  "maxLateness": 30,
  "modes": [
    "event-time"
  ],
  "caption": "Tune the lateness bound and watch windows fire: tight fires fast but drops stragglers, loose waits and captures them. Whatever you pick, never drop late data silently; route it to a side output or emit a correction."
}
\`\`\`

**Interview nuance:** the single most common wrong answer is "just use processing time and drop late events." Say out loud what you do with late data: route to a side output / dead-letter, or emit a correction. Silent drops are a correctness bug that never pages anyone.

## Fault-tolerant state

Aggregations are stateful (a per-user counter lives somewhere). Flink keeps this in an embedded **RocksDB** state backend on each task's local disk, and periodically takes a **checkpoint**: a consistent snapshot of all operator state plus the source offsets, written to durable storage (S3/HDFS) using the Chandy-Lamport barrier algorithm. On failure it restores the last checkpoint and rewinds Kafka to the checkpointed offsets, giving **exactly-once** *state* semantics (each event affects state once, even though it may be reprocessed). Kafka Streams does the same idea with a compacted *changelog topic* backing each local store.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A Flink job crashes, restores its last checkpoint, rewinds Kafka to the checkpointed offsets, and reprocesses. Why do the per-user counters not double-count?",
  "options": [
    {
      "label": "State and source offsets rewind as one snapshot",
      "correct": true,
      "feedback": "Right. The checkpoint captures operator state and the Kafka offsets at the same consistent instant, so after a restore the replayed events land on a state that genuinely has not seen them yet. That is what exactly-once state semantics means: each event affects state once, even though it is reprocessed."
    },
    {
      "label": "Kafka deduplicates redelivered records before the job sees them",
      "feedback": "The broker happily redelivers; the exactly-once promise here lives in the checkpoint mechanism, not the transport."
    },
    {
      "label": "RocksDB rejects a write whose key it has already stored",
      "feedback": "RocksDB is just the local state backend; it applies whatever the operator tells it, including a double-count if state and offsets drifted apart."
    }
  ]
}
\`\`\`

## Engine choice

*Flink*: richest event-time/state/CEP support, true exactly-once via checkpoints, best for complex low-latency work. *Kafka Streams*: a library (no cluster), great when you already live in Kafka and want per-partition local state. *Spark Structured Streaming*: micro-batch, best if you already run Spark and can tolerate slightly higher latency. Joins matter too: *stream-stream* joins need windowed state on both sides; *stream-table* joins enrich events against a materialized **KTable** (a changelog folded into current-value-per-key).

**Recap:** aggregate by event time, use watermarks to bound lateness and fire windows, keep local state fault-tolerant via RocksDB plus checkpoints/changelogs for exactly-once, and never drop late data silently.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your 5-minute event-time windows fire with a tight 5-second lateness bound and zero allowed lateness. Backend-service metrics are perfect, but counts for mobile users on the subway run consistently low. What is happening?",
  "options": [
    {
      "label": "Subway phones flush after their window already fired",
      "correct": true,
      "feedback": "Right. Event-time skew from offline clients runs straight into a 5-second watermark bound, so those stragglers arrive past the fire and zero allowed lateness drops them without a trace. Loosen the bound, keep allowed lateness so the window can emit a correction, or route late events to a side output."
    },
    {
      "label": "Event time is the wrong clock for mobile traffic, so the windows misfile the burst",
      "feedback": "Event time is exactly the right clock; the problem is the lateness bound dropping stragglers, not the bucket they would land in."
    },
    {
      "label": "Checkpoints are restoring stale counters for mobile users",
      "feedback": "Checkpoint restore affects all traffic equally and only after a failure; a consistent mobile-only undercount points at late data, not recovery."
    }
  ]
}
\`\`\`
`.trim()

const eventSourcingTeach = `
## Store the events, derive the state

Most systems store *current state* and mutate it in place: a \`balance\` column gets \`UPDATE\`d and the previous value is gone. Event sourcing inverts this. The source of truth is an **append-only, immutable log of events** ("Deposited $100", "Withdrew $30"), and current state is *derived* by replaying (folding) those events over an aggregate. You never overwrite; you only append. The current balance is a computed view, not the stored truth.

## Deriving state

An *aggregate* (say Account #42) has a fold function: start from an empty state, apply each event in order, produce the current state. \`fold(events) = events.reduce(apply, initialState)\`. Because the log is ordered per aggregate, replay is deterministic: the same events always yield the same state. This is why an event-sourced ledger can answer "what was the balance as of last Tuesday 5pm": you fold only the events up to that timestamp. In-place-state systems cannot answer that without a separate audit table, because they threw the history away.

## Why teams reach for it

(1) *Full audit trail* for free: every change is a first-class, retained fact, which regulators love for financial and medical systems. (2) *Temporal / time-travel queries*: reconstruct any past state. (3) *Debugging*: replay production events into a fixed build to reproduce a bug exactly. (4) *New read models retroactively*: a new projection can be built by replaying the entire history (see the CQRS lesson).

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An auditor asks for Account #42's balance as of last Tuesday at 5pm. The event-sourced ledger folds events up to that timestamp and answers. Why can a mutate-in-place system not answer the same question?",
  "options": [
    {
      "label": "Each UPDATE overwrote the previous balance, so the history is gone unless a separate audit table was kept",
      "correct": true,
      "feedback": "Right: in-place state throws history away; the event log retains every change as a first-class fact, which is the whole audit-and-time-travel win."
    },
    {
      "label": "It can, by re-running the fold over its balance column",
      "feedback": "There is nothing to fold: a single current-value column has no ordered events behind it."
    },
    {
      "label": "It can, because the database keeps old row versions around indefinitely",
      "feedback": "Old row versions exist for transaction isolation and get garbage-collected; they are not a queryable history."
    }
  ]
}
\`\`\`

\`\`\`cswidget
{
  "type": "steps",
  "title": "Folding the event log into state",
  "frames": [
    {
      "note": "The source of truth for Account #42 is an append-only log of four events. No balance is stored anywhere; state starts empty and will be derived by folding the events in order.",
      "rows": [
        {
          "label": "events",
          "cells": [
            {
              "text": "AccountOpened"
            },
            {
              "text": "Deposited 50"
            },
            {
              "text": "Withdrew 20"
            },
            {
              "text": "Deposited 10"
            }
          ]
        },
        {
          "label": "state",
          "cells": [
            {
              "text": "empty"
            }
          ]
        }
      ]
    },
    {
      "note": "The fold starts from the empty state and applies each event in order. AccountOpened initializes the aggregate: balance 0.",
      "rows": [
        {
          "label": "events",
          "cells": [
            {
              "text": "AccountOpened",
              "state": "active"
            },
            {
              "text": "Deposited 50",
              "state": "dim"
            },
            {
              "text": "Withdrew 20",
              "state": "dim"
            },
            {
              "text": "Deposited 10",
              "state": "dim"
            }
          ]
        },
        {
          "label": "state",
          "cells": [
            {
              "text": "balance 0",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "note": "Deposited 50 is applied to the running state: 0 + 50 = 50. The event itself is never overwritten; only the derived view changes.",
      "rows": [
        {
          "label": "events",
          "cells": [
            {
              "text": "AccountOpened",
              "state": "dim"
            },
            {
              "text": "Deposited 50",
              "state": "active"
            },
            {
              "text": "Withdrew 20",
              "state": "dim"
            },
            {
              "text": "Deposited 10",
              "state": "dim"
            }
          ]
        },
        {
          "label": "state",
          "cells": [
            {
              "text": "balance 50",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "note": "Withdrew 20 folds in next: 50 - 20 = 30. Because the log is ordered per aggregate, replay is deterministic: the same events always yield the same state.",
      "rows": [
        {
          "label": "events",
          "cells": [
            {
              "text": "AccountOpened",
              "state": "dim"
            },
            {
              "text": "Deposited 50",
              "state": "dim"
            },
            {
              "text": "Withdrew 20",
              "state": "active"
            },
            {
              "text": "Deposited 10",
              "state": "dim"
            }
          ]
        },
        {
          "label": "state",
          "cells": [
            {
              "text": "balance 30",
              "state": "new"
            }
          ]
        }
      ],
      "predict": {
        "question": "After the last event, Deposited 10, is applied, what is the derived balance?",
        "options": [
          "30",
          "40",
          "60"
        ]
      }
    },
    {
      "note": "Deposited 10 completes the fold: 30 + 10 = 40. That 40 is a computed view, not stored truth. Fold only the events up to a timestamp and you get the balance as of that instant, which is how a ledger answers what the balance was last Tuesday 5pm.",
      "rows": [
        {
          "label": "events",
          "cells": [
            {
              "text": "AccountOpened",
              "state": "dim"
            },
            {
              "text": "Deposited 50",
              "state": "dim"
            },
            {
              "text": "Withdrew 20",
              "state": "dim"
            },
            {
              "text": "Deposited 10",
              "state": "active"
            }
          ]
        },
        {
          "label": "state",
          "cells": [
            {
              "text": "balance 40",
              "state": "new"
            }
          ]
        }
      ]
    }
  ],
  "caption": "fold(events) = events.reduce(apply, initialState): the log is the truth, state is always derived."
}
\`\`\`

## The replay-cost problem, and snapshots

An account open for 10 years may have 100k events. Folding all of them on every read is too slow. The fix is **snapshots**: periodically persist the derived state (e.g. every 500 events) as \`Snapshot(version=N, state=...)\`. To load, take the latest snapshot and fold only the *tail* of events after it. Replay cost becomes bounded by snapshot frequency, not aggregate age. Snapshots are a cache, never the source of truth: you can always delete every snapshot and rebuild from the log.

## Concurrency: optimistic, via expected version

Two requests both read Account #42 at version 100 and both try to append. To prevent a lost update, each append carries an **expected version**. The store's append is conditional: "append this event only if the aggregate is still at version 100." The first wins and moves to 101; the second's condition fails, and it retries by re-reading the now-current state. This is optimistic concurrency and it is the standard event-store contract (EventStoreDB, or a Postgres table with a unique constraint on \`(aggregate_id, version)\`).

**Interview nuance:** you never edit history. A wrong event is corrected by appending a *compensating* event ("Adjustment: -$30, reason: duplicate"), exactly like an accountant posts a correcting entry rather than erasing ink. Schema change over years is handled by **upcasting**: when you read an old event version, transform it on the fly into the current shape before applying it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Last month's Deposited 100 event should have been 70. What is the event-sourced correction?",
  "options": [
    {
      "label": "Append a compensating adjustment event of minus 30",
      "correct": true,
      "feedback": "Right. Carry a reason on it, and the fold then produces the correct current balance while the original event stays exactly as written. The audit chain is unbroken and every past replay still reproduces what the system believed at the time. This is an accountant's correcting entry, not an eraser."
    },
    {
      "label": "Update the stored event in place; state is derived anyway, so nothing else changes",
      "feedback": "Editing history breaks the audit trail and silently changes what every past replay and projection would compute."
    },
    {
      "label": "Delete the bad event and replay the log to rebuild state",
      "feedback": "The log is append-only and immutable; deleting an event is editing history with extra steps."
    }
  ]
}
\`\`\`

## When it is the wrong tool

Event sourcing adds real complexity: eventual consistency in read models, replay tooling, schema/upcasting discipline, and a steeper mental model for the whole team. If an entity is simple CRUD with no audit or temporal need (a user's display-name preference), event sourcing is over-engineering. Reach for it where history *is* the product: ledgers, order lifecycles, inventory, anything audited.

**Recap:** store immutable events as truth and fold them to derive state, bound replay with snapshots, guard writes with expected-version optimistic concurrency, correct by appending (never editing), and use it only where audit/temporal value justifies the complexity.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An operator accidentally deletes every snapshot for a 10-year-old account with 100k events. What is permanently lost?",
  "options": [
    {
      "label": "Nothing: snapshots are a cache, not truth",
      "correct": true,
      "feedback": "Right. The log is the sole source of truth and the fold is deterministic, so the same 100k events rebuild the same state. What you lost is only the shortcut, and you pay full replay time on each read until new snapshots are taken."
    },
    {
      "label": "The current balance: it lived in the latest snapshot",
      "feedback": "The balance was never stored truth; it is derived, and the same events always fold to the same state."
    },
    {
      "label": "All events older than the most recent snapshot",
      "feedback": "Snapshots never replace log segments; every event is still in the append-only log."
    }
  ]
}
\`\`\`
`.trim()

const cqrsTeach = `
## One idea: separate the write model from the read models

CQRS (Command Query Responsibility Segregation) is one idea: **separate the model you write through from the model(s) you read through.** The write side handles *commands* (intent to change state: "PublishProduct"), runs validation and business invariants, and owns the authoritative data. The read side serves *queries* from **denormalized projections** shaped exactly for how the UI reads. They can be different schemas, different databases, even different technologies.

## Why separate them

Reads and writes have opposite pressures. A product catalog might take 50 writes/sec (with heavy validation: pricing rules, category constraints, inventory checks) but 500k reads/sec (search, filter, faceted browse). A single normalized schema optimized for write-side integrity forces reads to join 8 tables per page load. CQRS lets the write side stay a clean normalized model in Postgres, while the read side is a denormalized document in Elasticsearch or a materialized Redis view, each scaled independently. You are no longer forced to make one schema good at two conflicting jobs.

## How projections stay in sync

The write side, on committing a command, emits an event ("ProductPublished"). Projection handlers *consume* those events and update the read models. You can have *many* projections off one event stream: an Elasticsearch index for search, a Redis hash for the product detail page, a Postgres rollup for the admin dashboard, each a different shape for a different query. Handlers must be **idempotent** (processing the same event twice yields the same result), because at-least-once delivery will redeliver. Store the last processed event offset/version per projection so replays are safe.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "At-least-once delivery redelivers a ProductPublished event to your Elasticsearch projection handler. What two properties keep the read model correct?",
  "options": [
    {
      "label": "The handler is idempotent, and it stores the last processed offset per projection so replays are safe",
      "correct": true,
      "feedback": "Right: redelivery is guaranteed eventually, so processing the same event twice must yield the same result, and the tracked offset makes deliberate replays safe too."
    },
    {
      "label": "The broker guarantees exactly-once delivery to each projection",
      "feedback": "The premise is at-least-once; the projection layer, not the broker, absorbs the duplicates."
    },
    {
      "label": "The handler locks the write model's row while it updates the index",
      "feedback": "Projections never touch the write model; coupling them would reintroduce the single-schema problem CQRS exists to split."
    }
  ]
}
\`\`\`

\`\`\`csdiagram
{
  "type": "topology",
  "title": "CQRS: one write model, many read models",
  "nodes": [
    {
      "id": "writer",
      "label": "Client (command)",
      "kind": "client"
    },
    {
      "id": "write_model",
      "label": "Write model (Postgres, validation)",
      "kind": "db"
    },
    {
      "id": "events",
      "label": "Event stream",
      "kind": "queue"
    },
    {
      "id": "es_index",
      "label": "ES index (search)",
      "kind": "db"
    },
    {
      "id": "redis_view",
      "label": "Redis view (product page)",
      "kind": "cache"
    },
    {
      "id": "pg_rollup",
      "label": "PG rollup (admin dashboard)",
      "kind": "db"
    },
    {
      "id": "reader",
      "label": "Client (query)",
      "kind": "client"
    }
  ],
  "edges": [
    {
      "from": "writer",
      "to": "write_model",
      "kind": "sync",
      "label": "PublishProduct"
    },
    {
      "from": "write_model",
      "to": "events",
      "kind": "async",
      "label": "ProductPublished"
    },
    {
      "from": "events",
      "to": "es_index",
      "kind": "async",
      "label": "projection handler"
    },
    {
      "from": "events",
      "to": "redis_view",
      "kind": "async",
      "label": "projection handler"
    },
    {
      "from": "events",
      "to": "pg_rollup",
      "kind": "async",
      "label": "projection handler"
    },
    {
      "from": "reader",
      "to": "es_index",
      "kind": "sync",
      "label": "search"
    },
    {
      "from": "reader",
      "to": "redis_view",
      "kind": "sync",
      "label": "detail page"
    },
    {
      "from": "reader",
      "to": "pg_rollup",
      "kind": "sync",
      "label": "dashboard"
    }
  ],
  "stages": [
    {
      "adds": [
        "writer",
        "write_model"
      ],
      "note": "Commands like PublishProduct carry intent to change state; the write model runs pricing, category, and inventory validation and owns the authoritative data at about 50 writes/sec."
    },
    {
      "adds": [
        "events"
      ],
      "note": "On committing a command the write side emits ProductPublished; delivery is at-least-once, so every projection handler must be idempotent and store its last processed offset."
    },
    {
      "adds": [
        "es_index",
        "redis_view",
        "pg_rollup",
        "reader"
      ],
      "note": "500k reads/sec against 50 writes/sec justifies denormalized projections, each shaped for one query and rebuildable by replaying the stream from offset 0."
    }
  ],
  "caption": "Projections update after the commit, so reads can lag by milliseconds to seconds; handle read-your-writes explicitly with client echo, versioned reads, or a short window of reading from the write model."
}
\`\`\`

## The consistency cost: eventual consistency

The projection updates *after* the write commits, so there is a lag (usually milliseconds, sometimes seconds under load). A user who edits a product and immediately reloads may see stale data. This breaks **read-your-writes** expectations. Fixes: (1) *client echo*, where the client optimistically shows its own just-submitted value without waiting for the read model; (2) *versioned reads*, where the write returns a version and the client polls/reads until the projection has caught up to that version; (3) route the user's own immediately-following read to the write model for a short window. Pick one and state it; hand-waving eventual consistency is a red flag.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A seller edits a product and instantly reloads the page, which reads the Elasticsearch projection. They see the old data. What broke, and which class of fix applies?",
  "options": [
    {
      "label": "Read-your-writes broke: the projection lags",
      "correct": true,
      "feedback": "Right. The projection updates after the write commits, so an instant reload races it. Bridge that lag explicitly: client echo of the just-submitted value, a versioned read that waits for the projection to reach the write's version, or briefly routing that seller's own read to the write model."
    },
    {
      "label": "The write was lost, so the command pipeline needs retries",
      "feedback": "The write committed fine; the read simply raced a projection that had not caught up yet."
    },
    {
      "label": "The event stream delivered ProductPublished out of order",
      "feedback": "Ordering is not the issue for a single edit; the read model is just milliseconds behind the write model."
    }
  ]
}
\`\`\`

## Rebuild superpower

Because projections are derived and idempotent, you can drop a read model and **replay** the event log to rebuild it. That is how you add a new read model months later, fix a projection bug, or migrate the read store: reset the offset to 0 and reprocess. This is the strongest operational reason to adopt CQRS.

**Interview nuance:** CQRS and event sourcing are *often taught together but are independent.* You can do CQRS with a plain CRUD write model that emits events (or that a change-data-capture stream like Debezium tails), no event store required. Coupling CQRS to full event sourcing "because they go together" doubles your complexity for no reason if you did not need the event log. Default to CQRS-with-CDC unless audit/temporal needs justify event sourcing too.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A team wants denormalized read models for a read-heavy catalog but has no audit or temporal requirement. What is the default architecture?",
  "options": [
    {
      "label": "CQRS with a plain CRUD write model whose changes are tailed by a CDC stream like Debezium, with no event store",
      "correct": true,
      "feedback": "Right: CQRS and event sourcing are independent; adopting the event store without an audit or temporal need doubles complexity for nothing."
    },
    {
      "label": "Full event sourcing, because CQRS requires an event log as the source of truth",
      "feedback": "CQRS only needs events to feed projections; a CDC stream off a CRUD database provides those without making a log the source of truth."
    },
    {
      "label": "Neither: denormalized reads can only be built by joining the write schema at query time",
      "feedback": "Forcing one normalized schema to serve 500k reads per second is the exact pressure the pattern relieves."
    }
  ]
}
\`\`\`

**Recap:** split commands (validated write model) from queries (denormalized projections built by idempotent event handlers), accept eventual consistency and handle read-your-writes explicitly, rebuild read models by replay, and do not drag in event sourcing unless you separately need it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Six months after launch you need a brand-new admin dashboard rollup that never existed before. Using the CQRS machinery, how do you build it without touching the write model?",
  "options": [
    {
      "label": "Write a new handler and replay from offset 0",
      "correct": true,
      "feedback": "Right. Make the handler idempotent and replaying the existing stream backfills six months of history for free, while the write model never learns the rollup exists. Rebuild-by-replay is the strongest operational reason to adopt CQRS."
    },
    {
      "label": "Dual-write the rollup from the command handler going forward, backfilling by hand",
      "feedback": "Dual-writes couple the write path to every read model and cannot recover history; replaying the stream gives you the backfill for free."
    },
    {
      "label": "Query the write model's tables directly and cache the results",
      "feedback": "That reintroduces the 8-table-join problem and skips the projection machinery that makes read models cheap and rebuildable."
    }
  ]
}
\`\`\`
`.trim()

const schemaEvolutionTeach = `
## An event schema is a public contract, not a private struct

An event stream outlives every version of every service that touches it. A Kafka topic with 30-day retention holds messages written by last month's producer that today's consumer must still read, and a new consumer that spins up next quarter will replay events from long-dead producers. That is the core insight: an event schema is a public contract, not a private struct. The moment a second team subscribes to your topic, you have lost the freedom to change the shape at will. Rename a field and you break every consumer that still reads the old name, at deploy time, in production, with no compiler to catch it.

## The schema registry

The tool that makes this safe is a **schema registry** (Confluent Schema Registry, Karapace, AWS Glue). Producers register the schema; the registry assigns a numeric schema ID and, critically, rejects any new version that violates the topic's configured compatibility rule before the producer is allowed to publish. On the wire the message carries the compact binary payload plus the schema ID (a few bytes), not the full schema, so you get self-describing evolution without paying to embed the schema on every record. Consumers fetch the writer schema by ID and reconcile it against their own reader schema. Avro, Protobuf, and JSON Schema all support this; Avro's explicit writer-plus-reader resolution is the classic model, Protobuf leans on field numbers and reserved tags.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A topic is configured for backward compatibility, which means a new schema can read data written by the old one. You want to drop a field your consumers no longer read. Which side deploys first?",
  "options": [
    {
      "label": "Consumers first, then producers",
      "correct": true,
      "feedback": "Right. Backward compatibility guarantees the new reader can read old bytes, so a consumer already on the new schema handles both the records that still carry the field and the ones that soon will not. Producers move second."
    },
    {
      "label": "Producers first, then consumers",
      "feedback": "That is the order forward compatibility buys you. Ship the producer first here and old consumers start receiving records missing a field their schema still expects, which is the break this mode never promised to prevent."
    },
    {
      "label": "Either order, because the registry would have rejected the schema if it were unsafe",
      "feedback": "The registry checks the new version against the rule when the schema is registered, which is on first produce; it cannot upgrade a running consumer. The mode tells you the safe order, it does not remove the need for one."
    },
    {
      "label": "Neither, because deleting a field is never legal under any mode",
      "feedback": "Deleting a field is exactly what backward compatibility allows: a new reader that no longer declares it simply ignores it in old bytes. That is why the deploy order matters here. The change that breaks both directions at once is a rename with no default on the new field, since that is a delete and an add shipped together."
    }
  ]
}
\`\`\`

## Compatibility modes are the heart of the interview

- **Backward** (the common default): new schema can read old data. You may add a field with a default and delete an optional field. Consumers upgrade first, then producers.
- **Forward:** old schema can read new data. You may add a field and remove one that had a default. Producers upgrade first, then consumers.
- **Full:** both directions hold. The safe intersection: add or remove only optional fields with defaults, never touch required ones.

The compatibility mode literally dictates your deploy order, which is why it matters operationally and not just in theory.

The rule that follows: **add fields with defaults, never remove or rename a required field.** A field with a default lets an old consumer that never heard of it simply fall back, and lets a new consumer read old records that lack it. Renaming is the classic trap, because a rename is a delete plus an add and breaks both directions at once.

## Making a genuinely breaking change

You do not mutate in place. Three options: **upcasting** (a transform step that reads v1 and rewrites it to v2 shape on read), the **tolerant reader** pattern (consumers ignore unknown fields and tolerate missing optional ones, so most additive change needs no coordination), or, for a real break, **publish a new topic** (\`user.v2\`) and run both until every consumer has migrated, then retire v1. New topic is the honest answer when the change cannot be made additive.

**Interview nuance:** the wrong turn is treating event schemas like internal database columns you can \`ALTER\` freely. Downstream teams you have never met are parsing your bytes. The senior move is to name the compatibility mode, show that it fixes deploy order, and reach for a new topic (not a mutation) when a break is unavoidable.

**Recap:** an event schema is a versioned public contract enforced at produce time by a registry; evolve additively with defaults under a stated compatibility mode, and make true breaks with upcasting, tolerant readers, or a new topic, never an in-place mutation.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An event type must change 'amount' from a string to an integer, a change no default can smooth over. The topic is on full compatibility and four teams you have never met consume it. What is the senior move?",
  "options": [
    {
      "label": "Publish a new topic such as 'orders.v2'",
      "correct": true,
      "feedback": "Right. A true break cannot be made additive, so you version the contract itself: run v1 and v2 side by side, let each of the four teams migrate on its own schedule, and retire v1 only once its consumer lag reaches zero everywhere. No synchronized cutover across teams you do not control."
    },
    {
      "label": "Register the new schema and coordinate a simultaneous deploy of every producer and consumer",
      "feedback": "Under full compatibility the registry rejects the version when it is registered on first produce, and even with the rule loosened, a synchronized cutover across teams you do not control is exactly the failure mode versioning exists to avoid."
    },
    {
      "label": "Add 'amount_int' alongside the old field and delete 'amount' in the same release",
      "feedback": "The add is fine and is how a real migration starts. The delete is the trap: under full compatibility the registry blocks it outright, and even with the rule loosened it is the half that strands old readers still asking for the original field. Ship the add, migrate every reader, then delete in a later release."
    },
    {
      "label": "Treat the topic like a table and alter the field type in place",
      "feedback": "There is no in-place mutation of bytes already written to the log, and last month's records keep their old shape for the whole retention window. That instinct comes from owning a private database column, not a public contract."
    }
  ],
  "reveal": "Three ideas meet here. The registry enforces the compatibility mode at produce time, additive change with defaults is the only evolution that needs no cross-team coordination, and when a change cannot be made additive the contract itself gets a version. Bytes already on the log never change shape, so every plan has to keep working for readers of last month's records."
}
\`\`\`
`.trim()

const streamingObservabilityTeach = `
## Two promises: no acknowledged loss, and no silent failure

Operating a messaging tier comes down to two promises: an acknowledged message is never lost, and when something silently breaks you find out from a signal rather than from an angry downstream. Both have concrete, defensible settings.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A payments team ships an async pipeline. Producers get their acknowledgements, no service is throwing errors, dashboards are green, and every service's own latency panel looks normal. Eleven hours later a customer reports that yesterday's settlements never posted. What was almost certainly missing?",
  "options": [
    {
      "label": "Consumer lag as a monitored signal, with an SLO on it",
      "correct": true,
      "feedback": "Right. Lag is the gap between the latest offset and the committed offset, and it is the one number that catches a consumer that has stopped keeping up. Nothing else in that list would have gone red: the producer really was acknowledged, and each service really was fast, because a stalled consumer is not slow, it is absent."
    },
    {
      "label": "More replicas, since the records were clearly lost",
      "feedback": "Nothing was lost here. The records are sitting in the log exactly as written. Replication protects an acknowledged write from a broker dying, and it has no opinion about whether anyone read it."
    },
    {
      "label": "A higher acknowledgement level on the producer",
      "feedback": "That is the durability promise, and the symptom says durability held: the producer got its ack and the data survived. The failure is on the consuming side of the hop, which acks cannot see."
    },
    {
      "label": "Per-service latency alerting, tightened",
      "feedback": "Per-service panels are exactly what made this invisible. Each service was fast at what it did; the time was spent waiting in a queue between them, which no single service's latency panel measures. That is why the end-to-end signal has to span the async hop."
    }
  ]
}
\`\`\`

## No acknowledged-write loss

In Kafka terms, three settings work together. Set replication factor to 3 across three availability zones (rack-aware placement so the three replicas never share an AZ). Set the producer to \`acks=all\`, meaning the leader does not acknowledge until every in-sync replica has the record. Set \`min.insync.replicas=2\`, meaning if fewer than two replicas are in sync the producer's write is rejected rather than silently accepted with too little redundancy. The combination guarantees that any acknowledged record survives losing a full AZ, because a second copy lives in a surviving zone. Drop \`acks=all\` and a leader can ack a write that only it holds, then die, and the write is gone even though the producer got a 200.

## Leader election and the unclean tradeoff

When a leader fails, a follower is promoted. If you allow **unclean leader election**, an out-of-sync replica can become leader, which keeps the partition available but discards records the old leader had and the new one did not: you chose availability over durability. Keep it disabled (\`unclean.leader.election.enable=false\`) when the data is money or orders; the partition goes unavailable until an in-sync replica returns, which is the correct choice when losing an acknowledged record is unacceptable.

## Surviving multi-region and duplicates

For cross-region resilience you either stretch a cluster across regions (simple, but latency-bound and quorum-sensitive) or replicate asynchronously with **MirrorMaker 2** to a second cluster (looser coupling, but the replica lags and failover can lose the in-flight tail). Either way, enable the **idempotent producer** so a producer retry across a failover does not write the record twice; combined with consumer idempotency this keeps a failover from duplicating side effects.

## The signals

The primary health signal for a stream is **consumer lag**: the gap between the latest offset and the committed offset per partition. Rising lag means consumers are falling behind and end-to-end latency is growing, and it is the one number that turns into an SLO. Alongside it, watch **under-replicated partitions** (durability eroding, a replica has fallen out of sync), **dead-letter-queue depth** (poison messages piling up), and **end-to-end latency** measured with a trace that spans the async hop, not just per-service timings. Without lag and cross-hop tracing, async failures are silent: the producer got its ack, nobody is watching the consumer, and the first symptom is a stale downstream hours later.

## Capacity math

Two formulas earn the offer. Partitions come from throughput: \`partitions ~= target throughput / per-partition throughput\`. If a partition sustains about 10 MB/s and you need 1M msg/s at 1 KB each (1 GB/s), that is roughly 100 partitions before you add headroom for consumer parallelism and skew (call it 150 to 200). Storage is \`rate x message size x retention x replication factor\`. At 1 GB/s, 7-day retention, replication 3: 1 GB/s x 604,800 s x 3 is on the order of 1.8 PB, so retention and replication, not raw ingest, dominate the disk bill. Network egress multiplies by fan-out: every consumer group re-reads the stream.

**Interview nuance:** the wrong turn is claiming durability from replication alone while leaving \`acks=1\` or unclean election on, or having no lag metric and no trace across the async boundary so failures are invisible. Name the three durability knobs together, name lag as the SLO, and show the two capacity formulas.

**Recap:** prevent acknowledged loss with rack-aware RF3 plus \`acks=all\` plus \`min.insync.replicas=2\` and clean leader election; make consumer lag the primary SLO alongside under-replicated partitions, DLQ depth, and end-to-end tracing; size partitions from throughput and storage from rate times size times retention times replication.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You inherit a Kafka tier: replication factor 3 across three zones, 'acks=all', 'min.insync.replicas=2', unclean leader election disabled, 7 day retention. Broker CPU and disk alarms are the only monitors. Which gap do you close first?",
  "options": [
    {
      "label": "Consumer lag per partition, because nothing on this list would notice a consumer group that stopped advancing",
      "correct": true,
      "feedback": "Right. The durability side is already configured correctly, so the live risk is the second promise: producers keep collecting acks while a consumer group stalls, and lag is the one number that catches it and turns into an SLO."
    },
    {
      "label": "Raise replication factor to 5, since three copies is thin for a 7 day window",
      "feedback": "Replication factor 3 with 'min.insync.replicas=2' already survives losing a full zone, and raising it multiplies the term that already dominates the disk bill, since storage is rate times size times retention times replication."
    },
    {
      "label": "Enable unclean leader election so a partition never goes unavailable",
      "feedback": "That trades away the durability the other three settings just bought. An out-of-sync replica promoted to leader discards acknowledged records, which is the wrong trade whenever the data is money or orders."
    },
    {
      "label": "Nothing: 'acks=all' with replication factor 3 already makes the pipeline observable",
      "feedback": "Those settings make writes durable, not visible. Durability and observability are separate promises, and nothing in this configuration reports whether any consumer ever read the record."
    }
  ],
  "reveal": "The two promises are independent and each has its own knobs. No acknowledged loss comes from rack-aware replication factor 3 plus 'acks=all' plus 'min.insync.replicas=2' plus clean leader election. No silent failure comes from consumer lag as the primary SLO, alongside under-replicated partitions, dead letter queue depth, and a trace that spans the async hop. Capacity sits under both: partitions from throughput, storage from rate times size times retention times replication."
}
\`\`\`
`.trim()

export const systemDesignLevel6: DesignLevel = {
  id: 6,
  slug: "event-driven",
  title: "Level 6: Asynchronous & Event-Driven Systems",
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
            "Async decoupling buys throughput and availability but opens a stale-read window, so some checkout steps must stay synchronous.",
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
            "Queue, pub/sub or log: two axes decide it, whether consuming deletes the message and who owns the read position.",
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
            "How to choose SQS, RabbitMQ, Kafka, Pulsar or no broker at all by naming the drivers instead of reaching for Kafka by reflex.",
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
            "Why Kafka is fast (sequential appends, page cache, zero-copy) and why acks=all on its own is still not durable.",
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
            "Kafka orders within a partition and nowhere else, which makes the message key a correctness decision rather than a tuning knob.",
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
            "Why a 13th consumer on a 12-partition topic does nothing, and how to make a rolling deploy cause zero rebalances.",
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
            "Delete retention makes a Kafka topic a stream; compaction makes it a rebuildable table. Plus tiered storage and the dedup-window trap.",
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
            "Exactly-once delivery is impossible, so ack timing plus idempotency is the real answer, and Kafka EOS stops at Kafka's edge.",
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
            "The two things that break idempotency in production: the concurrent-duplicate race, and a dedup TTL shorter than the replay window.",
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
            "How to retry a flaky downstream without a thundering herd, and why one poison message wedges an entire Kafka partition.",
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
    {
      id: "sd-l6-m4",
      title: "Stream Processing & Event Patterns",
      description:
        "Design real-time stream pipelines that stay correct under late and out-of-order data, model state as an immutable event log you can replay and time-travel, and split write and read models with CQRS so each scales and is shaped for its own job without paying complexity you do not need.",
      lessons: [
        {
          id: "sd-l6-stream-processing",
          title: "Stream Processing: Windowing, Watermarks & State",
          summary:
            "Aggregate by event time (not processing time), use watermarks to bound lateness and fire windows, keep local state fault-tolerant via RocksDB plus checkpoints/changelogs for exactly-once state, and never drop late data silently.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["stream-processing", "windowing", "flink"],
          teach: {
            markdown: streamProcessingTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l6-stream-processing-apply",
            prompt:
              "Design a real-time fraud/anomaly pipeline that computes per-user rolling 5-minute aggregates over an event stream and stays correct even when events arrive late and out of order.",
            thinkAbout: [
              "What is the difference between event time and processing time?",
              "How do watermarks bound lateness and trigger windows?",
              "How is local state made fault-tolerant?",
            ],
            modelAnswerOutline: [
              "Assumptions: events (login, transaction, device-change) land on a Kafka topic keyed by user_id, each carrying a producer event-time timestamp. Clients are mobile, so 30s to a few minutes of lateness is normal. We compute a rolling 5-minute count/sum per user and flag anomalies (e.g. > 20 transactions or > $5k in the window). Target end-to-end latency: a few seconds for on-time events.",
              "**Engine and topology.** Flink, for real event-time and exactly-once state. Source: Kafka connector, `keyBy(user_id)` so each user's events go to one parallel task holding that user's state. Assign timestamps from the event-time field and emit a bounded-out-of-orderness watermark of `maxSeen - 2 min`. That 2-minute bound is the deliberate latency/completeness trade: most mobile stragglers land inside it.",
              "**Windows.** A sliding event-time window of size 5 min, slide 1 min, so each firing reflects the true rolling 5-minute total. When the watermark crosses a window's end the window fires and I evaluate the fraud rule. I also set `allowedLateness(5 min)`: events later than the watermark but within 5 min re-fire the window and emit a corrected verdict; events later than that go to a **side output** (dead-letter) for offline review, never dropped silently.",
              "**Why event time, not processing time.** A phone that was offline flushes a burst; by processing time those events would land in the current bucket and both undercount the real window and overcount now, corrupting the fraud signal. Event time places each event in the window where it actually belongs.",
              "**Fault tolerance.** Per-user counters live in the embedded RocksDB state backend on each task. Enable checkpointing every 10s: Flink snapshots all keyed state plus Kafka source offsets to S3 via aligned barriers. On a task crash it restores the last checkpoint and rewinds Kafka to those offsets, so each event updates a user's counter exactly once. Downstream (the alert emitter) must be idempotent since re-emitted alerts can repeat.",
              "Common wrong turn: using processing-time tumbling windows and discarding anything past the window, which silently drops the exact offline-then-reconnect pattern fraudsters exploit.",
            ],
          },
          practice: {
            id: "sd-l6-stream-processing-practice",
            prompt:
              "Design the event-time pipeline for Uber-style surge pricing: consume a 500k events/sec stream of rider requests and driver GPS pings, compute per-hexagon (H3 cell) supply/demand ratios over a rolling 2-minute window, and keep the number correct when driver phones report GPS in delayed bursts on flaky networks.",
            thinkAbout: [
              "How do you key and partition so hot downtown cells still spread across tasks?",
              "How does allowed lateness correct a hexagon's ratio when a GPS burst lands?",
              "Why is being briefly stale safer than being confidently wrong for pricing?",
            ],
            modelAnswerOutline: [
              "Assumptions: two Kafka topics (requests, driver-pings), both event-time stamped, ~500k/s combined, geo-bucketed to H3 hexagons. We need a surge multiplier per hexagon refreshed every few seconds, correct under bursty late GPS.",
              "**Topology.** Flink, `keyBy(h3_cell)` so all events for a hexagon share one task and its state. Watermark = `maxEventTime - 90s`, tuned from observed p99 driver-ping lateness on cellular. A sliding event-time window (size 2 min, slide 15s) computes demand (request count) and supply (distinct active drivers) per hexagon; the surge multiplier is a function of their ratio.",
              "**Late and bursty GPS.** A driver in a parking garage buffers pings and flushes 60s of them at once. With event time those pings land in the correct 15s slices, so supply is not spuriously spiked in the current instant. `allowedLateness(90s)` re-fires and corrects a hexagon's ratio when a burst lands; anything later is negligible for a 2-minute surge signal and goes to a side output for monitoring.",
              "**Scale.** 500k/s over hexagons is naturally shardable: partition Kafka by h3_cell (hundreds of partitions), and Flink parallelism matches so hot downtown cells still spread across tasks. Per-cell state is tiny (a few counters and a driver set), so RocksDB local state stays small; checkpoint every 10s to S3.",
              "**Correctness vs freshness trade.** The 90s watermark means a genuine demand spike is fully reflected up to 90s later, but the alternative (processing time) would let one delayed GPS burst swing a hexagon's surge multiplier and overcharge riders. For pricing, being briefly stale is far safer than being confidently wrong, so I take the event-time bound. I also cap multiplier change rate downstream to avoid whiplash from a single corrected window.",
            ],
          },
        },
        {
          id: "sd-l6-event-sourcing",
          title: "Event Sourcing",
          summary:
            "Store immutable events as truth and fold them to derive state, bound replay with snapshots, guard writes with expected-version optimistic concurrency, correct by appending a compensating event (never editing), and use it only where audit/temporal value justifies the complexity.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["event-sourcing", "ledger"],
          teach: {
            markdown: eventSourcingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-event-sourcing-apply",
            prompt:
              "Design an account-balance/ledger service using event sourcing: rebuild the current balance from events, support 'balance as of last Tuesday,' and handle a continuously growing event log.",
            thinkAbout: [
              "How is current state derived, and how do snapshots bound replay cost?",
              "How does optimistic concurrency via expected version work?",
              "When is event sourcing not a fit?",
            ],
            modelAnswerOutline: [
              "Assumptions: a ledger where correctness and auditability are paramount (a financial system). Each account is an aggregate. Operations: deposit, withdraw, transfer. We must reconstruct current balance, answer historical-balance queries, and stay fast as accounts accumulate years of events.",
              "**Event model and store.** Events are immutable facts: `Deposited{amount, ts}`, `Withdrew{amount, ts}`, `TransferOut/In{...}`. Store them append-only in an event store: EventStoreDB, or a Postgres `events(aggregate_id, version, type, payload, event_ts)` table with a unique constraint on `(aggregate_id, version)`. The current balance is *not* a stored column; it is derived by folding an account's events: start at 0, add deposits, subtract withdrawals, in version order.",
              "**Historical queries.** 'Balance as of last Tuesday 5pm' is just folding the account's events with `event_ts <= that instant`. Because the log is retained and ordered, any past state is reconstructable exactly. An in-place `balance` column could never answer this without a bolted-on audit table.",
              "**Bounding replay cost.** A hot account with 100k events is too slow to fold on every read. Persist snapshots every 500 events: `Snapshot(account, version=N, balance, event_ts)`. To read current balance, load the latest snapshot and fold only events after version N. Snapshots are a rebuildable cache; deleting them all still leaves the log as truth. Historical queries fold from the nearest snapshot *before* the target time.",
              "**Concurrency.** Two withdrawals racing on the same account both read version 100. Each appends with expected version 100; the store's conditional append (unique constraint on `(account, 101)`) lets exactly one succeed. The loser re-reads (now version 101, updated balance) and retries, re-checking the funds invariant. This is optimistic concurrency, and it enforces 'no overdraft' correctly under contention without cross-row locks.",
              "**Corrections and evolution.** A bad entry is fixed by appending a compensating `Adjustment` event, never by editing history. Old event shapes are upcast to the current schema on read. For a simple CRUD entity with no audit or temporal requirement, event sourcing is pure overhead; a ledger is the textbook right fit because history is the product.",
              "Common wrong turn: storing a mutable `balance` column 'for speed' alongside the events, which reintroduces the dual-write/lost-history problem event sourcing exists to remove. Keep balance derived (optionally cached via snapshot), never authoritative.",
            ],
          },
          practice: {
            id: "sd-l6-event-sourcing-practice",
            prompt:
              "Design the event-sourced core of a Stripe-style payments ledger handling 50M ledger entries/day, where every balance movement must be auditable for 7 years, double-entry invariants must always hold, and finance runs point-in-time reports for any past instant.",
            thinkAbout: [
              "How do you keep the double-entry invariant from ever being half-applied?",
              "How do snapshots plus tiered storage make 128B events foldable and affordable?",
              "How do you produce an exactly-reproducible point-in-time trial balance?",
            ],
            modelAnswerOutline: [
              "Assumptions: double-entry ledger (every movement debits one account and credits another; the sum is always zero). 50M entries/day is ~580 writes/sec average, with peaks maybe 10x. 7-year immutable retention is a compliance requirement.",
              "**Design.** Each account is an aggregate; each posting appends a paired debit/credit event within one atomic transaction so the double-entry invariant can never be half-applied. Store in an append-only log partitioned by account_id: EventStoreDB, or Kafka (as the durable log) fronting a Postgres/Cassandra event table. The unique `(account_id, version)` constraint gives per-account ordering and optimistic concurrency.",
              "**Scale and retention.** 50M/day for 7 years is ~128B events, far too many to fold naively. Snapshot each account frequently (every N events or nightly) so current-balance reads fold a tiny tail. Age cold events to cheap object storage (S3) with the hot tail in the primary store; the log stays immutable and complete for the 7-year audit window. Partitioning by account_id keeps writes horizontally scalable well past peak.",
              "**Point-in-time reports.** Finance's 'trial balance as of March 31, 23:59' is a fold of every account's events up to that instant, parallelized across account partitions and seeded from the nearest pre-March-31 snapshot. Because history is immutable, the report is exactly reproducible months later, which is the whole reason to event-source a ledger.",
              "**Invariants and correctness.** Never edit; corrections are reversing entries (append a compensating debit/credit pair), preserving the audit chain. A continuous reconciliation job folds all events and asserts the global debit=credit invariant, catching any projection drift.",
              "Trade: we accept higher storage and replay tooling cost and eventual consistency in read-side reports, in exchange for a provably complete, tamper-evident 7-year audit trail. For payments that trade is unambiguously correct.",
            ],
          },
        },
        {
          id: "sd-l6-cqrs",
          title: "CQRS & Read Models",
          summary:
            "Split commands (validated write model) from queries (denormalized projections built by idempotent event handlers), accept eventual consistency and handle read-your-writes explicitly, rebuild read models by replay, and do not drag in event sourcing unless you separately need it.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["cqrs", "read-models", "projections"],
          teach: {
            markdown: cqrsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-cqrs-apply",
            prompt:
              "Design read/write separation for a high-read product catalog that has complex write validation: build denormalized read projections updated from write-side events and handle read staleness.",
            thinkAbout: [
              "Why separate the write side (commands, validation) from the read side (denormalized projections)?",
              "How do projections stay in sync, and how do you handle read-your-writes UX?",
              "Why should CQRS not be coupled to event sourcing by default?",
            ],
            modelAnswerOutline: [
              "Assumptions: e-commerce catalog, ~50 product-edit writes/sec with heavy validation (pricing rules, category/attribute constraints, inventory), but ~500k reads/sec across search, filtering, and product pages. Read latency and scale dominate; writes are correctness-critical but low volume.",
              "**Split.** Write side: a normalized Postgres model where commands (`PublishProduct`, `UpdatePrice`) run all validation and enforce invariants inside a transaction. Read side: denormalized projections shaped per query, an Elasticsearch index for search/faceting and a Redis/document view for the product detail page. One authoritative writer, many purpose-built readers.",
              "**Why.** A single schema cannot be simultaneously great at transactional write integrity and at 500k/s faceted reads. Separating them lets the read stores be denormalized (no 8-table join per page) and scaled horizontally (ES/Redis replicas) without touching write-side correctness.",
              "**Keeping projections in sync.** On commit, the write side emits an event (via a transactional outbox or Debezium CDC on the products table, so the event cannot be lost relative to the DB write). Projection consumers update ES and Redis. Each handler is idempotent and tracks the last processed version per document, so at-least-once redelivery and replays are safe. Multiple projections consume the same stream independently.",
              "**Read staleness / read-your-writes.** Projections lag the write by tens of ms up to seconds under load. A merchant who edits a product and reloads must not see the old value. I return the new version from the write, and the edit screen reads its own write from the write model (or via a versioned read that waits for the projection to reach that version) for a short window; anonymous shoppers tolerate the eventual-consistency lag fine.",
              "**Rebuild.** Read models are derived, so a projection bug or a new read model is fixed by resetting the offset and replaying events from the outbox/CDC stream.",
              "Common wrong turn: assuming CQRS requires event sourcing. The write model here is fine as normalized CRUD emitting events via CDC; full event sourcing would add an event store, folding, snapshots, and upcasting for no benefit since the catalog has no strong audit/temporal requirement, paying double complexity.",
            ],
          },
          practice: {
            id: "sd-l6-cqrs-practice",
            prompt:
              "Design the CQRS read-side for Amazon-scale product search: a write model that ingests 100k catalog updates/sec from thousands of seller and inventory services, fanning out to multiple denormalized read models (full-text search, per-region price/availability, a recommendations feature store) while keeping each independently rebuildable and handling seller read-your-writes.",
            thinkAbout: [
              "Why is a single partitioned event log the right fan-out backbone?",
              "How do consistency requirements differ across the read models?",
              "How do you keep a stale in-stock flag from causing oversells?",
            ],
            modelAnswerOutline: [
              "Assumptions: 100k catalog mutations/sec (price, stock, attributes) from many upstream services; billions of reads/sec globally; several *different-shaped* read consumers. Consistency requirements differ per read model.",
              "**Backbone.** All writes emit events to a partitioned Kafka topic (partition by product_id) via transactional outbox/CDC on each owning service, so the log is the single fan-out point. 100k/s over hundreds of partitions is comfortable and preserves per-product ordering.",
              "**Multiple projections, each optimized.** (1) Search: a stream job denormalizes events into an Elasticsearch/OpenSearch index (title, attributes, category facets). (2) Price/availability: a per-region key-value store (DynamoDB global tables) so a product page reads the local region at single-digit ms. (3) Recommendations feature store: a rollup keyed for the model-serving layer. Each consumes the same event stream with its own consumer group and its own committed offset, so they scale and fail independently.",
              "**Rebuildability.** Because each projection is idempotent and derived, any one can be rebuilt by resetting its consumer-group offset and replaying, without touching the others or the write side. That is how a search-schema change or a new read model ships safely at this scale.",
              "**Consistency per model.** Search can tolerate seconds of lag (nobody notices a new facet a few seconds late). Price/availability is more sensitive: a stale in-stock flag causes oversells, so I keep that projection's lag tightly monitored (consumer-lag SLO) and let the checkout path re-validate stock against the authoritative write model at purchase time rather than trusting the read model. Seller read-your-writes: after a seller edits, their seller-console reads the write model (or a versioned read that waits for the projection version) so they see their change immediately, while shoppers ride the eventually-consistent projections.",
              "Trade: many read stores multiply operational and storage cost and force explicit staleness handling per model, bought in exchange for each read path being independently shaped, scaled, and rebuildable, which is the only way one catalog serves search, pricing, and ML from one write stream at this scale.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l6-m5",
      title: "Schema Governance & Ops",
      description:
        "Govern a shared event schema so many teams evolve it without breaking each other (compatibility modes, registry enforcement, the safe way to make a breaking change), and operate the messaging tier itself: replicate and ack so no acknowledged message is ever lost, monitor the signals that expose silent async failures, and size partitions, storage, and network for a million-message-per-second stream.",
      lessons: [
        {
          id: "sd-l6-schema-evolution",
          title: "Schema Management & Evolution",
          summary:
            "An event schema is a versioned public contract enforced at produce time by a registry; evolve additively with defaults under a stated compatibility mode (which dictates deploy order), and make true breaks with upcasting, tolerant readers, or a new topic, never an in-place mutation.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["schema-registry", "evolution", "avro"],
          teach: {
            markdown: schemaEvolutionTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l6-schema-evolution-apply",
            prompt:
              "Design schema governance for a shared `user` event topic consumed by 10 teams: allow producers to add fields without breaking old consumers, and specify your compatibility policy.",
            thinkAbout: [
              "What compatibility mode lets producers add fields safely?",
              "Why treat events as a public contract?",
              "How do you make a breaking change?",
            ],
            modelAnswerOutline: [
              "Assumptions: a `user` topic on Kafka, roughly a few thousand events per second, 10 consuming teams I do not control, mixed languages, and a hard requirement that one team's change never pages another team.",
              "**Registry, enforced at produce time.** I put a schema registry (Confluent or Karapace) in front of the topic and make registration mandatory: producers cannot publish a payload whose schema is not registered and compatible. The format is Avro (or Protobuf) so records carry a small schema ID and the registry stores the full writer schema, giving every consumer a way to resolve the writer schema by ID instead of guessing.",
              "**Compatibility policy: backward.** I set the subject to **backward** (I would consider **full** if I need either team to deploy first). Backward means a new schema can read data written under old schemas, so the governance rule I publish to all 10 teams is simple: add optional fields with defaults, delete an optional field, never remove/rename/retype a required field. Backward requires consumers to upgrade before producers, which is exactly what keeps an added field from breaking a consumer still running last week's code: the new field is ignored by readers that do not know it, and old records missing the field resolve to its default.",
              "**Why a public contract.** 10 teams with independent deploy cadences parse these bytes; there is no shared build to catch a shape change, so the registry is the enforcement point a compiler would normally be.",
              "**A genuine breaking change** (say splitting `name` into `first`/`last`, which is a rename): I do not mutate `user`. I publish `user.v2`, dual-write both topics from the producer, let each consuming team migrate on its own schedule, track migration via consumer group offsets, and retire v1 only once lag on it goes to zero everywhere. For lighter changes I lean on tolerant readers so unknown fields are ignored by default.",
              "Common wrong turn: treating the schema as a private, mutable struct and renaming a field in place, which breaks every downstream consumer at once with no warning.",
            ],
          },
          practice: {
            id: "sd-l6-schema-evolution-practice",
            prompt:
              "Design the schema-governance rollout for Stripe's `charge.succeeded`-style webhook and internal event, consumed by hundreds of external integrators plus dozens of internal services, where you must add a new `payment_method_details` object and later deprecate a legacy `card` field without breaking a single integrator.",
            thinkAbout: [
              "Why do external integrators force a different strategy than internal consumers?",
              "How does version-pinning plus a delivery-time transform turn 'evolve the schema' into 'add a transform'?",
              "How do you deprecate a field without ever removing it for pinned integrators?",
            ],
            modelAnswerOutline: [
              "Assumptions: this is the hardest case because external integrators are code I will never see and cannot force to upgrade; their tolerance for change is near zero and a break becomes a public incident.",
              "**Two layers.** Internally, events flow through a schema registry on Kafka with **full** compatibility on the subject, so neither producers nor the many consuming services are forced into a deploy order. Externally, I version the public event via a **date-based API version** (Stripe's actual model): each integrator is pinned to the version they signed up on, and the webhook payload is transformed to that version at delivery time. This turns 'evolve the schema' into 'add a transform,' not 'mutate the contract everyone depends on.'",
              "**Adding `payment_method_details` is purely additive:** a new optional object defaulting to absent. Under full compatibility, internal consumers that do not know it ignore it, and external integrators on old versions simply never receive it because the delivery-time transform strips fields their pinned version predates. No coordination required.",
              "**Deprecating the legacy `card` field** is the dangerous half, and the answer is you never actually remove it from old versions. You keep populating `card` for every integrator pinned to a version where it existed, mark it deprecated in docs, and stop emitting it only in a new API version integrators opt into deliberately. Internally you upcast: a transform reads the new `payment_method_details` and synthesizes the legacy `card` shape for any consumer still reading it, so old and new coexist behind the version gate.",
              "**Rollout is staged:** ship the additive field first, watch registry compatibility checks and consumer lag, publish the new version with `card` removed, drive adoption with dashboards on version usage, and retire the old version only when usage hits zero (which for external partners may be years, so plan to run both indefinitely). Common wrong turn: treating a public webhook like an internal schema and dropping `card` on a fixed date, which is a mass integrator outage, not a deprecation.",
            ],
          },
        },
        {
          id: "sd-l6-streaming-observability",
          title: "Streaming Durability, HA & Observability",
          summary:
            "Prevent acknowledged loss with rack-aware RF3 plus acks=all plus min.insync.replicas=2 and clean leader election; make consumer lag the primary SLO alongside under-replicated partitions, DLQ depth, and end-to-end tracing; size partitions from throughput and storage from rate times size times retention times replication.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["streaming-ops", "ha", "observability"],
          teach: {
            markdown: streamingObservabilityTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l6-streaming-observability-apply",
            prompt:
              "Make an event-streaming platform survive a full availability-zone loss with zero acknowledged-message loss, and define the top monitoring signals and capacity math for a 1M msg/s stream.",
            thinkAbout: [
              "What replication and acks settings prevent acknowledged-write loss?",
              "What is the primary health signal for a stream?",
              "How do you size partitions, storage, and network?",
            ],
            modelAnswerOutline: [
              "Assumptions: a Kafka platform across three AZs in one region, 1M msg/s at about 1 KB average (1 GB/s ingest), messages are order and payment events where losing an acknowledged write is unacceptable, and I have consumer groups fanning out to several teams.",
              "**Durability first.** Replication factor 3 with rack-aware placement so the three replicas of every partition sit in three different AZs. Producers use `acks=all` so the leader acknowledges only after both followers have the record, and `min.insync.replicas=2` so if an AZ loss drops the in-sync set below two the write is rejected rather than accepted under-replicated. I disable unclean leader election, so on an AZ failure the partition either fails over to an in-sync replica in a surviving zone (no loss) or goes briefly unavailable until one returns; I never promote a stale replica and silently drop acknowledged records.",
              "**Duplicates on failover.** I enable the idempotent producer so retries during the failover do not duplicate, and make consumers idempotent keyed on event ID as the second line of defense. This set survives a full AZ loss with zero acknowledged loss, trading a short availability dip on affected partitions for durability.",
              "**Signals.** Consumer lag per partition is the primary SLO, because it is the leading indicator of every silent failure and directly maps to end-to-end freshness. I also alert on under-replicated partitions (durability eroding), DLQ depth (poison messages), broker disk and network saturation, and end-to-end latency measured with a trace that crosses the async hop so I catch a stuck consumer that the producer's healthy acks would hide.",
              "**Capacity.** Partitions from throughput: at 1 GB/s and roughly 10 MB/s per partition that is about 100 partitions, and I provision 150 to 200 for consumer parallelism, rebalancing headroom, and key skew. Storage is rate x size x retention x RF: 1 GB/s x 7 days x 3 replicas is on the order of 1.8 PB, so retention and replication dominate, and I push cold data to tiered storage (S3) to keep local disk sane. Network egress multiplies ingest by the number of consumer groups, so N groups means roughly N GB/s read fan-out, which sizes broker NICs and cross-AZ transfer cost.",
              "Common wrong turn: trusting RF3 while leaving `acks=1` or unclean election enabled, which quietly loses acknowledged writes on failover, or shipping with no lag metric so a dead consumer is invisible until a downstream goes stale.",
            ],
          },
          practice: {
            id: "sd-l6-streaming-observability-practice",
            prompt:
              "Design the durability, failover, and observability posture for a global streaming platform like Uber's or LinkedIn's Kafka fleet handling 5M msg/s across multiple regions, where you must survive an entire region going dark with a bounded, stated data-loss and latency budget.",
            thinkAbout: [
              "Why does surviving a full region force an honest RPO tradeoff?",
              "When do you carve payment traffic onto a synchronous cross-region quorum?",
              "What does fleet-level observability add over the single-region signals?",
            ],
            modelAnswerOutline: [
              "Assumptions: 5M msg/s (roughly 5 GB/s) across trillions of records/day, multiple regions, and a business requirement to survive losing a whole region, not just an AZ. Surviving a full region forces an honest tradeoff I have to state.",
              "**Within each region I keep the single-region posture:** RF3 across three AZs, `acks=all`, `min.insync.replicas=2`, clean leader election. That already survives an AZ loss with zero acknowledged loss and is the foundation.",
              "**The region-loss question is different.** Synchronous replication across regions would add tens of milliseconds to every produce and couple availability to the WAN, untenable at 5 GB/s. So I run **active-active regional clusters with asynchronous MirrorMaker 2 replication** between them. The consequence I state up front: async cross-region replication means a region that dies takes its unreplicated tail with it, so my RPO is not zero, it is bounded by replication lag (target under a few seconds, alerted). If the business truly needs region-loss RPO of zero for a subset (payments), I carve that traffic onto a synchronous stretch quorum across regions and accept its latency cost, rather than pretending async gives zero loss everywhere.",
              "**Failover.** Consumers fail over to the mirror cluster, and because MirrorMaker 2 translates offsets I can resume near the right position; idempotent producers and consumer-side dedup on event ID absorb the duplicates any async failover produces. I keep an explicit runbook and regularly game-day the region evacuation, because untested failover is failover that does not work.",
              "**Observability at this scale is fleet-level:** consumer lag per group per region as the primary SLO, cross-region replication lag as an explicit RPO gauge, under-replicated partitions, DLQ depth, and distributed tracing across async hops with sampling so 5M msg/s does not drown the tracing backend. Capacity: about 500 partitions per hot topic before skew headroom, storage dominated by retention x RF pushed to tiered object storage, and cross-region egress budgeted as a first-class cost line.",
              "Common wrong turn: claiming zero-loss region failover on async replication; the senior move is to state the RPO your architecture actually delivers and reserve synchronous cross-region quorum only for the traffic that truly needs it.",
            ],
          },
        },
      ],
    },
  ],
}
