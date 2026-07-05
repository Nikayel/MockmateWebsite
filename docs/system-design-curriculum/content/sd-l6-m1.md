> Module **sd-l6-m1** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l5-m5](./sd-l5-m5.md) · Next: [sd-l6-m2](./sd-l6-m2.md)

# L6 · Messaging Foundations

By the end of this module you can decide which parts of a flow stay synchronous and which become async events (and defend the boundary), tell a queue from a pub/sub topic from a durable log by their retention and replay semantics, and pick a specific broker for a workload instead of reaching for Kafka by reflex.

### sd-l6-sync-vs-async: Sync vs Async & When to Go Event-Driven

- **id:** `sd-l6-sync-vs-async`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** async, event-driven, checkout

#### Learn

A synchronous call blocks the caller until the callee returns. The caller's latency is the sum of every hop, and the caller's availability is the product of every downstream's availability. Chain five services at 99.9 percent each synchronously and your effective availability is about 99.5 percent, because any one being down fails the whole request. Async breaks that chain by putting a broker between producer and consumer.

Async buys you three specific decouplings, and naming them is how you sound senior:

- **Time decoupling (buffering).** The producer writes to the broker and moves on; the consumer processes later, at its own pace. A traffic spike that would overwhelm a synchronous downstream instead grows a queue that drains when load falls. The broker absorbs the burst.
- **Space decoupling (location).** The producer does not know or care which service, or how many of them, consume the message. You add a fraud checker or a new analytics consumer without touching the producer.
- **Synchronization decoupling (non-blocking).** The producer does not wait for the work to finish. Its own latency drops to the cost of one durable write to the broker (single-digit ms) instead of the sum of all downstream work.

The price is eventual consistency. The moment you make a step async, the effect (inventory decremented, email sent) happens after the response, so the user or a follow-up read can observe a state where the effect has not landed yet. You must design for that gap.

A second framing that drives the boundary is command versus event. A **command** ("ChargeCard") is an instruction to one specific handler that must succeed and often returns a result, so it tends to stay synchronous. An **event** ("OrderPlaced") is an immutable statement of fact that already happened; any number of consumers react to it, and the producer does not care what they do. Events point the coupling arrow away from the producer, which is why they scale fan-out cleanly.

The failure mode also inverts, and interviewers probe this. Synchronously, a failure is an error returned to the caller who can retry or show a message right now. Async pushes failure into the background: a consumer that throws must be retried with backoff, and after N failures the message lands in a dead-letter queue (DLQ) for inspection. You now need retry policy, idempotent consumers (because retries duplicate), a DLQ, and monitoring on consumer lag and DLQ depth. The user already got a 200; nobody is watching the screen when the async step breaks.

**Interview nuance:** the wrong turn is adding a broker to simple CRUD that needs a strong-consistency read right after the write. If a user saves a setting and immediately reads it back, an async write behind a queue gives them a stale read and a support ticket. Async pays off when the follow-up work is genuinely independent of the response, not when you are hiding a synchronous dependency behind a topic.

```
Sync:   client -> [payment] -> [inventory] -> [email] -> [analytics] -> 200
        latency = sum of all; one down = request fails

Async:  client -> [payment] -> 200
                       |
                   OrderPlaced --> broker --> [inventory]
                                          --> [email]
                                          --> [analytics]
```

Recap: async decouples in time, space, and synchronization, trading immediate consistency for throughput and availability; keep steps synchronous when the caller needs the result or a consistent read, and make independent side effects events.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the checkout flow for an e-commerce site: decide which steps stay synchronous (payment auth) and which become async events (inventory, email, analytics), and justify each boundary.

**Think about:**
- What are the three decouplings async buys (time, space, synchronization)?
- Which steps need synchronous consistency, and which tolerate eventual?
- How does the failure mode shift from sync errors to background retries/DLQ?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a mid-size store, a few hundred checkouts per minute with 10x spikes during sales, payment via Stripe, correctness on money and inventory matters more than shaving the last few ms.

The synchronous core is exactly what the user must know before they see a confirmation. Validate the cart, then call payment authorization synchronously. Payment auth is a command with a result the user needs right now: approved or declined changes what we show. It is also where we do not want ambiguity, so we block on it. I would keep a synchronous inventory reservation too if oversell is unacceptable (a `SELECT ... FOR UPDATE` or a conditional decrement against a hot-item row), because "sorry, actually out of stock" after charging is a terrible experience. Everything the user does not need in the response becomes async.

On successful auth, the checkout service writes one immutable `OrderPlaced` event to a broker (Kafka topic or SNS fan-out) inside or right after the same transaction, then returns 200. Independent consumers subscribe: a fulfillment/inventory-settlement consumer, an email/receipt consumer, an analytics consumer, a loyalty-points consumer. Space decoupling means adding a fraud-review consumer later touches no existing code. Time decoupling means a 10x sale spike grows consumer lag instead of timing out the checkout path.

The failure model shifts deliberately. A failed email is retried with exponential backoff and, after N attempts, parked in a DLQ with an alert, not surfaced to the buyer who already succeeded. Consumers must be idempotent because at-least-once delivery will redeliver: key side effects on `order_id` so a duplicate `OrderPlaced` does not send two receipts or double-decrement stock. I would monitor consumer lag and DLQ depth as first-class SLOs.

The common wrong turn is making payment async to "speed up checkout." Then the user sees a confirmation before the charge is real, and declines become a reconciliation nightmare. Keep the money-and-stock decision synchronous; make the notifications, analytics, and downstream fulfillment async.

**Self-check rubric:**
- [ ] Payment auth (and stock, if oversell is unacceptable) is justified as synchronous, with a reason tied to the response.
- [ ] At least three genuinely independent steps are made async events with the coupling benefit named.
- [ ] The answer names the eventual-consistency gap it accepts.
- [ ] Async failure handling is concrete: retry with backoff, DLQ, alerting.
- [ ] Consumers are called out as idempotent, keyed on order_id.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the async boundary for Uber's ride-request flow at the moment a rider taps "Confirm," where the dispatch match must feel near-instant (sub-second) but a single ride fans out to pricing finalization, driver notification, ETA updates, fraud scoring, and the trip-history/analytics pipeline. Decide what stays on the synchronous request path and what becomes events.

**Model answer (revealed on demand):**

Assumptions: hundreds of thousands of concurrent riders, dispatch latency budget under about one second because the rider is staring at the screen, correctness on matching (one driver per ride) is critical.

The synchronous path is narrow: validate the request, run the dispatch match against nearby available drivers, and reserve the chosen driver so no other ride grabs them. The match is a command with a result the rider needs immediately, and the driver reservation needs strong consistency to avoid double-assigning one driver, so I keep it synchronous against a low-latency store (Redis or an in-memory geo-index with a conditional claim). Return the assigned driver and a first ETA.

Everything else is an event. On a successful match, emit `RideMatched` to Kafka keyed by `ride_id`. Consumers: pricing finalization (surge, promos), the driver-app push notification, continuous ETA recomputation, fraud/risk scoring, and the trip-history/warehouse pipeline. These are independent, tolerate hundreds of ms of lag, and must not block the rider's confirmation. Space decoupling lets the risk team add a new consumer without touching dispatch.

Because delivery is at-least-once, consumers are idempotent on `ride_id`: the notification consumer dedupes so a driver is not double-pinged, and the analytics consumer upserts. Failures go to per-consumer retry then DLQ with alerts; a lagging analytics consumer never degrades dispatch. The wrong turn is putting fraud scoring or pricing on the synchronous path to "get it right up front," which would blow the sub-second budget and couple dispatch availability to five downstreams. Keep the match and driver reservation synchronous; make the fan-out events.

### sd-l6-queue-pubsub-log: Queue vs Pub/Sub vs Log/Streaming

- **id:** `sd-l6-queue-pubsub-log`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** messaging-models, kafka, queue

#### Learn

"Messaging" hides three models with genuinely different semantics. Picking the wrong one is one of the most common design-review mistakes, so learn to name them precisely.

**Point-to-point queue** (Amazon SQS, RabbitMQ, a Redis list). Producers push messages; a pool of competing consumers pulls them. Each message is delivered to exactly one consumer in the pool, and once that consumer acks, the message is deleted from the queue. This is work distribution: add consumers to process faster, and no two workers do the same job. The defining property is that the message is consumed and gone. There is no replay, no second reader. RabbitMQ adds routing (exchanges, bindings) and per-message DLQs; SQS adds a visibility timeout so an un-acked message reappears for another worker after a crash.

**Pub/sub** (Amazon SNS, Google Pub/Sub topics, RabbitMQ fanout exchange). A producer publishes to a topic; every subscriber gets its own copy. This is fan-out: one `OrderPlaced` reaches the email service, the analytics service, and the fraud service independently. Classic pub/sub is often fire-and-forget: if a subscriber is down when the message is published and there is no per-subscriber durable queue, that subscriber misses it. The common production pattern is SNS-to-SQS fan-out, where the topic delivers a copy into each subscriber's own durable queue so slow or offline subscribers do not lose messages.

**Log / stream** (Apache Kafka, Amazon Kinesis, Apache Pulsar). Messages are appended to a durable, ordered, append-only log and retained by time or size, for example seven days, regardless of who has read them. Consumers do not delete messages; each consumer group tracks its own **offset** (a cursor) into the log and reads forward. This is the key difference: because the data stays and each group has an independent cursor, a log gives you both fan-out (many groups) and replay (rewind a group's offset to reprocess history). A brand-new analytics team can start today and read the last 30 days from offset zero.

The two axes that separate these are **retention** and **who tracks delivery**:

```
              delete on consume?     who tracks position?      replay?    fan-out?
Queue (SQS)         yes              broker (per message ack)     no       no (competing)
Pub/Sub (SNS)   yes (per sub)        broker (per subscriber)      no       yes
Log (Kafka)          no             consumer (own offset)         yes      yes (per group)
```

A queue's broker tracks per-message delivery and acks; it is push-ish and the broker owns state. A log is pull-based: the consumer owns its offset, which is why one slow consumer group cannot slow another and why replay is just "reset my offset." That consumer-owned-offset design is the whole reason a log scales to many independent readers and supports reprocessing.

**Interview nuance:** the classic wrong turn is choosing a queue when the requirement is "multiple independent teams, each reading the full stream, some needing to replay 30 days." A queue deletes on consume and serves one consumer per message, so it cannot do multi-consumer replay. The moment you hear "replay," "reprocess," or "N independent consumer groups over the same data," reach for a log.

Recap: a queue distributes work and deletes on ack (no replay); pub/sub fans a copy to every subscriber; a log retains an ordered stream that many consumer groups read at their own offset and can replay.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the messaging backbone for an order system that needs (a) exactly one worker per order, (b) multiple independent subscribers to 'order placed', and (c) 30-day replay for a new analytics team; map each requirement to a model.

**Think about:**
- How does retention differ between a queue and a log?
- Why does a log support many independent consumer groups and replay?
- What is the difference between broker-tracked delivery and consumer-driven offsets?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an e-commerce order pipeline, thousands of orders per minute at peak, on AWS (so I can name concrete services), and the analytics team may want to reprocess history when they change their models.

Each requirement maps to a different model, and forcing one model to do all three is the trap.

(a) "Exactly one worker per order" for a task like packing or shipping-label generation is a competing-consumers workload: use a queue. SQS (or a Kafka topic consumed by a single group, which gives the same one-worker-per-message effect via partition assignment). The message is claimed by one worker, acked, and gone; add workers to scale throughput. Nothing else needs to see that shipping task, so the delete-on-ack semantics are exactly right.

(b) "Multiple independent subscribers to OrderPlaced" (email, fraud, loyalty, inventory) is fan-out: publish OrderPlaced to a pub/sub topic. On AWS that is SNS with SNS-to-SQS fan-out so each subscriber has its own durable queue and a slow subscriber does not lose events. Each team scales and fails independently.

(c) "30-day replay for a new analytics team" cannot be a queue, because a queue deletes on consume and has no history to replay. This requires a log: publish the order event stream to Kafka (or Kinesis) with 30-day retention. The analytics team runs its own consumer group at its own offset and can reset to offset zero to reprocess the full 30 days after a model change, without affecting any other consumer.

The clean design is to make the durable ordered log the backbone: OrderPlaced goes to a Kafka topic retained 30 days. Fan-out is native (each team is a consumer group). The one-worker-per-order task is a single consumer group on the relevant topic, or a dedicated SQS queue fed from it. The wrong turn is using SQS for everything and then telling the analytics team their history is gone the moment another consumer read it, or standing up three disconnected systems when one log covers fan-out and replay together.

**Self-check rubric:**
- [ ] Each of the three requirements is mapped to queue, pub/sub, and log respectively, with reasons.
- [ ] The answer explains why a queue cannot satisfy 30-day multi-consumer replay.
- [ ] Consumer-owned offsets are named as the reason a log supports independent groups and replay.
- [ ] Fan-out durability is handled (e.g., SNS-to-SQS or per-group Kafka), not fire-and-forget.
- [ ] The design does not overuse one model for a requirement it cannot meet.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the event backbone for DoorDash-scale order events (roughly 100k orders per hour at peak) where the same `OrderCreated` stream must feed a real-time dispatch matcher, a per-restaurant notification service, a fraud pipeline, and a data-warehouse ingest that reprocesses the last 7 days whenever the ML team ships a new feature. Choose the model(s) and justify retention and consumer topology.

**Model answer (revealed on demand):**

Assumptions: about 100k orders/hour (roughly 28 orders/sec average, several times that at dinner peaks), four independent consumers with very different SLAs, and the warehouse must be able to replay a week on demand.

This is a log workload end to end, because two hard requirements (multiple independent consumers over the same stream, and 7-day replay) are exactly what a queue cannot do. I would publish `OrderCreated` to a Kafka topic partitioned by a key that preserves the ordering that matters, likely `region_id` or `restaurant_id` so a given restaurant's events stay ordered, with 7-day retention (a little headroom over the replay requirement) and replication factor 3 for durability.

Each consumer is its own consumer group with an independent offset, which is the whole point: the real-time dispatch matcher runs a group tuned for low lag and horizontal scale; the restaurant notification service is another group; fraud is a third; warehouse ingest is a fourth. A slow warehouse batch cannot slow dispatch, because offsets are per group and consumer-owned. When the ML team ships a new feature, warehouse ingest simply resets its group offset to 7 days back and reprocesses, touching no other consumer.

Retention is set by the most demanding replay need (7 days) plus buffer, not by the fastest consumer. If we later need cheap long-term history, tiered storage or a sink to S3 covers it without paying broker-disk prices. Fan-out per team is native to consumer groups, so no SNS layer is needed. The wrong turn here is SQS: the first consumer to read would consume the message, breaking fan-out, and there would be no 7-day history for the ML team to replay. A queue is right only for the downstream one-worker tasks (for example, generating a single delivery label), which I would feed from the log as a dedicated group.

### sd-l6-broker-selection: Broker Technology Selection

- **id:** `sd-l6-broker-selection`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** broker-selection, kafka, rabbitmq

#### Learn

"We'll use Kafka" is the most common reflexive answer in system-design interviews, and it is often wrong. The senior move is to name the decision drivers, then match the workload to the cheapest tool that satisfies them. Kafka is a superb distributed log, but it is also operationally heavy (partitions, consumer groups, rebalancing, retention tuning, and until recently a ZooKeeper or KRaft quorum to run). If you do not need what it gives, you are paying its tax for nothing.

The drivers to reason about out loud:

- **Throughput.** Millions of messages/sec favors a partitioned log (Kafka, Kinesis, Pulsar). Thousands/sec is comfortable for any queue.
- **Ordering.** Need per-key ordering? A log gives per-partition order; SQS FIFO gives per-group order; standard SQS gives none.
- **Retention and replay.** Need to reprocess history or feed many independent consumers? You need a log. Queues delete on consume.
- **Delivery guarantee.** At-least-once is the default everywhere; per-message ack and redelivery are a queue strength; exactly-once-ish processing needs extra machinery.
- **Routing complexity.** Rich topic/header routing, priorities, per-message TTL, and DLQs are RabbitMQ's home turf.
- **Ops budget.** A small team with no streaming platform should lean on managed services (SQS, SNS, Google Pub/Sub, Kinesis, MSK) before self-hosting Kafka.

A quick map of the landscape:

```
Logs / streams:   Kafka, Pulsar, Kinesis   -> high throughput, ordering, retention, replay
Queues:           RabbitMQ, SQS            -> per-message ack, routing, DLQ, work distribution
Managed fan-out:  SNS, Google Pub/Sub      -> topic fan-out without running a broker
Ordered managed:  SQS FIFO                 -> per-group ordering, exactly-once-ish, lower throughput
Lightweight:      NATS, Redis Streams      -> low latency, simple ops, smaller durability guarantees
```

**RabbitMQ vs SQS vs Kafka** in one breath: RabbitMQ is a smart broker for complex routing and per-message workflows at moderate scale; SQS is a zero-ops managed queue for work distribution and decoupling on AWS; Kafka is a durable replayable log for high-throughput streaming and multi-consumer fan-out. Pick RabbitMQ for routing, SQS for simple managed decoupling, Kafka when retention/replay/throughput justify the ops.

**Pulsar** deserves a mention because interviewers like it as a "why not Kafka" foil. Pulsar separates compute (brokers) from storage (BookKeeper), so you scale serving and storage independently, and it has first-class multi-tenancy, geo-replication, and tiered storage built in. It supports both queue and log semantics in one system. The cost is a more complex deployment (brokers plus BookKeeper plus metadata). Choose it when multi-tenancy or independent compute/storage scaling is a real requirement, not by default.

**NATS and Redis Streams** cover the low-latency, lightweight end: great when you want simple pub/sub or a small stream with minimal ops and can accept weaker durability than Kafka's replicated log.

**Interview nuance:** the strongest answer sometimes is "no broker at all." If the requirement is a strong-consistency CRUD read after write, a broker adds latency and a stale-read window for nothing; a direct synchronous call or a database is correct. Reaching for Kafka to decouple two services that make ten calls a second is over-engineering you should call out.

Recap: match the broker to the drivers (throughput, ordering, retention/replay, delivery, routing, ops budget); use a log only when replay/throughput justify its ops, a queue for work distribution and routing, managed services when the team is small, and sometimes no broker at all.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Recommend a specific broker for each of three workloads (a task queue for image resizing, a 30-day-replayable analytics stream, and simple decoupled microservice notifications) and defend the choices.

**Think about:**
- What decision drivers separate a log from a queue?
- When is a managed service (SQS/SNS/Pub/Sub) the right call?
- What do Pulsar's compute/storage separation and tiered storage add?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a small team on AWS with limited platform-ops capacity, moderate scale (thousands of messages/sec, not millions), and a preference for managed services unless a driver forces otherwise.

**Image-resize task queue: SQS (standard).** This is a textbook competing-consumers workload. Each upload produces one resize job that exactly one worker should perform, then ack and delete. The drivers are work distribution and simple retry/DLQ, not ordering or replay. SQS gives a visibility timeout (a crashed worker's job reappears), a native DLQ after N receives, and zero ops. Kafka would be overkill: I do not need retention or fan-out, and I would be running a log to do a queue's job. If I needed rich priority or fan-out routing on-prem, RabbitMQ; on AWS, SQS wins on ops.

**30-day-replayable analytics stream: Kafka (or Kinesis/MSK).** The requirement literally names replay and implies multiple independent analytics consumers over the same data. Only a log satisfies retention plus multi-consumer-group replay. I would use Kafka with 30-day retention (managed as MSK, or Kinesis if I want fully serverless and the throughput fits its shard model). Each analytics job is its own consumer group and can rewind to reprocess. A queue is disqualified because it deletes on consume.

**Decoupled microservice notifications: SNS (with SNS-to-SQS fan-out).** Several services react to an event and I want fan-out without running a broker. SNS publishes a copy to each subscriber; wiring SNS-to-SQS gives each subscriber a durable queue so a down service does not miss messages. This is the lowest-ops fan-out on AWS. I would reach for Kafka only if these notifications later needed replay or high-throughput streaming.

The through-line: I matched each workload to the cheapest tool that meets its drivers, and I explicitly refused to use Kafka for the two workloads that do not need a log. The wrong turn is one Kafka cluster for all three, paying streaming ops for a simple resize queue and a fan-out notification.

**Self-check rubric:**
- [ ] Each workload names a specific broker, not just "a queue" or "Kafka."
- [ ] The log is reserved for the replay requirement, with retention/replay as the justification.
- [ ] The task queue and notifications use managed queue/fan-out with an ops-cost rationale.
- [ ] At least one "why not Kafka" is stated explicitly.
- [ ] Fan-out durability (SNS-to-SQS or equivalent) is addressed.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose one messaging platform for a fintech SaaS (you are the platform architect) onboarding many customer tenants, one that serves (1) a high-throughput transaction event stream with 90-day replay, (2) strict per-tenant isolation and independent scaling, and (3) geo-replication across two regions for DR. Defend it against Kafka and against a managed queue, then note where you would still use a plain queue.

**Model answer (revealed on demand):**

Assumptions: many tenants sharing infrastructure, tens of thousands of events/sec aggregate, regulatory pressure for tenant isolation and cross-region durability, and a platform team large enough to run real infrastructure.

I would choose **Apache Pulsar** as the backbone. The requirements line up with exactly what Pulsar adds over Kafka. First, its compute/storage separation (stateless brokers over a BookKeeper storage layer) lets me scale serving capacity and storage independently, which matters when one noisy tenant spikes traffic without needing more retention. Second, multi-tenancy is first-class: Pulsar has tenants, namespaces, and per-namespace policies (quotas, retention, isolation), so per-tenant isolation is a configuration rather than a fleet of separate clusters. Third, geo-replication across regions is built in at the namespace level, satisfying the DR requirement without bolting on MirrorMaker. Ninety-day replay is native via retention plus tiered storage, which offloads cold segments to S3 so I am not paying broker disk for three months of history.

Why not Kafka: Kafka can hit the throughput and, with tiered storage plus MirrorMaker 2, approximate the retention and geo-replication. But multi-tenant isolation and independent compute/storage scaling are things you engineer around in Kafka (separate clusters per tenant tier, careful quotas) rather than get natively. For a platform whose core requirement is per-tenant isolation, Pulsar's model is a better fit, and I would say so while acknowledging Kafka's larger ecosystem as the real tradeoff.

Why not a managed queue: SQS/SNS cannot do 90-day multi-consumer replay at all, so it is disqualified as the backbone.

Where I would still use a plain queue: for downstream one-worker tasks fed off the stream (generating a statement PDF, sending a single webhook), an SQS-style queue or a single Pulsar subscription in shared mode is simpler than treating every task as a streaming consumer. Match the tool to the driver even inside a Pulsar shop.
