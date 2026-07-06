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
  ],
}
