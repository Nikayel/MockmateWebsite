> Module **sd-l5-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l5-m3](./sd-l5-m3.md) · Next: [sd-l5-m5](./sd-l5-m5.md)

# L5 · Distributed Transactions

After this module you can reason about atomicity across independently-owned services: why classic two-phase commit blocks at scale, how sagas trade isolation for progress, how the outbox pattern kills the dual-write problem, and why exactly-once is an application property built from at-least-once delivery plus idempotency, not a network guarantee.

### sd-l5-2pc-3pc: Distributed Transactions: 2PC / 3PC & Their Limits

- **id:** `sd-l5-2pc-3pc`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** 2pc, distributed-transactions

#### Learn

A single-node database transaction is atomic because one process owns the commit decision and one write-ahead log records it. The moment your transaction spans two independently-owned services or two databases, there is no shared log and no single owner, so you need a protocol to make N participants agree to commit or abort together. Two-phase commit (2PC) is that baseline, and every alternative in this module is defined against it.

2PC has a **coordinator** and **participants**. Phase 1 (prepare/vote): the coordinator asks every participant "can you commit?" Each participant does the work, writes it durably in a *prepared* state, locks the affected rows, and votes yes or no. A yes vote is a binding promise: "I will commit if you tell me to, even if I crash and restart." Phase 2 (commit/abort): if all voted yes, the coordinator writes a commit record and tells everyone to commit; if any voted no, it tells everyone to abort. This guarantees atomicity: all commit or all abort.

The fatal flaw is **blocking**. Between voting yes and hearing the decision, a participant holds locks and cannot unilaterally decide. If the coordinator crashes *after* participants voted yes but *before* broadcasting the decision, every participant is stuck: it cannot commit (maybe someone voted no) and cannot abort (maybe everyone voted yes and the coordinator already told others to commit). They hold their locks and wait for the coordinator to recover. This is the classic in-doubt window, and it can last as long as the coordinator is down.

```
Coordinator          P1            P2
   |---- prepare ---->|             |
   |---- prepare ------------------>|
   |<---- yes --------|             |
   |<---- yes ----------------------|
   X (crash here)                       <- P1, P2 now BLOCKED holding locks
   |                 (wait...)     (wait...)
```

The second problem is **throughput**. Locks are held across the *entire* protocol, which spans multiple network round trips (two, minimum, plus disk forces). A single-node commit holds a lock for microseconds; a 2PC lock is held for milliseconds to seconds across the fleet. Contended rows serialize behind this, so 2PC caps concurrency hard. This is why it does not survive at internet scale.

**3PC** (three-phase commit) inserts a pre-commit phase so participants can time out and make progress if the coordinator vanishes, reducing blocking. But it assumes a synchronous network with bounded delays; under a real network partition it can violate atomicity (different sides decide differently), so it is almost never used in production.

**Interview nuance:** modern systems do not abandon 2PC, they *harden the coordinator*. Google Spanner and CockroachDB run 2PC but replicate the coordinator's state via Paxos/Raft, so a coordinator crash is just a failover to a replica that knows the decision, and the in-doubt window closes in seconds instead of never. XA (the classic 2PC standard) is acceptable *within one cluster or one trust domain* where the coordinator is HA and latencies are bounded. It is a poor fit *across* independently-deployed microservices, which is exactly why sagas exist.

Recap: 2PC guarantees cross-participant atomicity via prepare-then-commit, but a coordinator crash after the vote leaves participants blocked holding locks, and lock-holding across the whole protocol throttles throughput, so at scale you either replicate the coordinator with consensus or switch to sagas.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design an atomic transfer of \$100 across two independently-owned services (an Accounts service and a Ledger service, each with its own database) and explain why classic 2PC is a poor fit, including the exact failure that blocks it.

**Think about:**
- What blocks participants when the coordinator crashes after prepare?
- Why is holding locks across the protocol a throughput killer?
- How do modern systems harden the coordinator?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: two services, two databases, separately deployed and possibly separately owned. The transfer must be atomic (debit and credit both happen or neither does). I first show the 2PC design, then argue it is the wrong tool here.

**The 2PC version.** A transaction coordinator runs the transfer. Phase 1: it tells Accounts "prepare: debit \$100 from A" and Ledger "prepare: credit \$100 to B." Each service performs the write in a *prepared* state, locks the affected rows/balances, and votes yes only if it can durably guarantee the commit. Phase 2: if both vote yes, the coordinator writes a commit record and broadcasts commit; both apply and release locks. If either votes no (insufficient funds, constraint violation), it broadcasts abort and both roll back. That gives true atomicity.

**Why it is a poor fit, and the exact blocking failure.** Suppose Accounts and Ledger both vote yes, then the **coordinator crashes before broadcasting the decision**. Now both services are in-doubt: they hold their row locks and cannot decide alone. Accounts cannot commit (Ledger might have been told to abort) and cannot abort (the coordinator may have already durably decided commit and told others). Account A's balance is locked until the coordinator recovers. That is the in-doubt window, and it is unbounded if the coordinator stays down.

**Throughput cost.** Those balance-row locks are held across two full round trips plus disk forces, i.e. milliseconds to seconds, not microseconds. Any other transfer touching account A serializes behind it. For a hot account this collapses concurrency, so 2PC across services does not hold up under real transfer volume.

**Hardening (if I insisted on 2PC).** Replicate the coordinator's log via Raft/Paxos so a crash is a fast failover to a replica that already knows the decision (the Spanner / CockroachDB approach). Keep XA only inside one cluster with bounded latency.

**What I would actually build.** For two independently-owned services I would use a **saga**: Accounts commits the debit locally and emits an event, Ledger commits the credit locally, and if the credit fails a compensating transaction re-credits A. No cross-service locks, no coordinator in-doubt blocking. I trade strict isolation (a brief window where the debit is visible without the credit) for availability and throughput, which is the right trade across service boundaries.

Common wrong turn: proposing 2PC across microservices and stopping there, without naming the coordinator-crash blocking window or the lock-held-across-the-protocol throughput hit.

**Self-check rubric:**
- [ ] Described both phases (prepare/vote, then commit/abort) and the "prepared" durable state
- [ ] Named the exact blocking failure: coordinator crash after all-yes, before broadcast, leaves participants holding locks
- [ ] Explained locks held across the whole protocol as the throughput killer
- [ ] Mentioned coordinator hardening via Raft/Paxos replication (Spanner/CockroachDB) and XA-within-a-cluster
- [ ] Concluded with a saga (or similar) as the better cross-service fit and named the tradeoff

#### Practice: real-world variant (save, then reveal)

**Prompt:** Explain how a system like Google Spanner or CockroachDB runs 2PC across shards at global scale without the classic coordinator-blocking problem crippling it, and quantify roughly where the latency goes. Lead with the mechanism that removes the blocking.

**Model answer (revealed on demand):**

Assumptions: a horizontally-sharded SQL database where a single transaction can touch rows on multiple shards, each shard replicated across zones/regions. The naive fear is that 2PC across shards inherits the coordinator-crash blocking window. The design removes it by making every role fault-tolerant via consensus.

**The mechanism: consensus under the 2PC.** Each shard is a Raft/Paxos group (Spanner calls these Paxos groups; CockroachDB uses Raft ranges). The 2PC **coordinator is not a single process, it is one of the participant groups**, and its transaction record is written through Raft, so it is replicated to a majority before the protocol proceeds. When the leader coordinating the commit crashes, a new leader is elected in that Raft group and *already has the committed transaction record in its log*, so it knows the decision and finishes the protocol. The in-doubt window shrinks from "until a single coordinator recovers" to "one leader-election round," typically single-digit seconds, and correctness is never lost because the decision was durable in a majority before anyone acted on it.

**Locks and isolation.** Participants still take write locks during prepare, but each shard's writes are also replicated via its own consensus group, so a prepared state survives replica failure. Spanner uses TrueTime commit-wait to order transactions globally; the cost is a deliberate few-milliseconds wait for clock uncertainty.

**Where the latency goes (rough budget).** A multi-shard commit pays: one WAN round trip for the prepare phase to reach each participant leader, a Raft majority-replication round trip *inside* each shard to make prepare durable, then the commit phase and its replication. Cross-region, each consensus round trip is tens of milliseconds, so a global multi-shard write is often 50 to 150 ms, versus sub-millisecond for a single-shard local write. That is the price of strict serializability at global scale.

**Tradeoff.** You get atomic, strongly-consistent, non-blocking distributed transactions, paying extra WAN round trips and consensus replication on every distributed commit. The wrong turn is assuming Spanner "solved" 2PC for free: it did not, it made every role consensus-backed and accepted higher commit latency, which is why architects keep transactions single-shard whenever possible.

### sd-l5-sagas: Sagas: Orchestration vs Choreography & Compensation

- **id:** `sd-l5-sagas`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** saga, compensation, orchestration

#### Learn

When a business transaction spans services and 2PC is too blocking, the standard answer is a **saga**: a sequence of *local* transactions, one per service, where each step has a **compensating action** that semantically undoes it. There is no global lock and no global commit. Instead you make forward progress step by step, and if a later step fails you run the compensations for the steps that already succeeded, in reverse. A saga gives you **atomicity of outcome** (the system ends either fully done or fully undone) but crucially *not* isolation.

Two ways to coordinate a saga:

- **Orchestration:** a central orchestrator (a Temporal/Cadence workflow, an AWS Step Functions state machine, or a hand-rolled saga service) explicitly calls step 1, step 2, step 3, and on failure invokes the compensations. Pros: the flow lives in one place, is easy to reason about, easy to trace, easy to add timeouts/retries. Cons: the orchestrator is a component you must run and make reliable, and it centralizes coupling.
- **Choreography:** no central brain. Each service listens for events and reacts by doing its local transaction and emitting the next event. Order service emits `OrderCreated`, Inventory reacts and emits `InventoryReserved`, Payment reacts, and so on. Pros: highly decoupled, no central bottleneck. Cons: the end-to-end flow is *implicit*, scattered across services and event subscriptions, and is genuinely hard to trace, debug, and reason about, especially for compensations. Cyclic event dependencies sneak in.

Rule of thumb: choose **orchestration** for anything with more than a couple of steps, non-trivial compensation logic, or where an on-call engineer must be able to see "where is this order stuck?" Choose choreography only for short, simple, truly decoupled flows.

The subtle, interview-critical property: **a saga has no isolation.** Between steps, intermediate states are *visible* to other transactions. In an order saga, inventory is reserved (visible) before payment succeeds; another request can observe "reserved but unpaid." This is a real anomaly a single ACID transaction would never expose. You manage it with **countermeasures**, not by pretending it does not exist:

- **Semantic lock:** mark a record with a pending/in-saga flag (e.g. order status `PENDING`) so others treat it as tentative until the saga completes.
- **Commutative updates:** design operations so order does not matter (increment/decrement rather than absolute set), which sidesteps some interleavings.
- **Reread / version check (optimistic):** re-read and verify a version/state before compensating, so you compensate against current reality, not a stale snapshot.

Compensations are their own hazard. A compensation **must be idempotent** (it may be retried) and it **may itself fail** (the service is down, or the action is not cleanly reversible). "Un-charge a card" is fine as a refund, but "un-send an email" or "un-ship a package" is not truly reversible, so you compensate *semantically* (issue a recall, send an apology, restock on return). For compensations that fail, you need retries with backoff, a dead-letter queue, and ultimately human/operator escalation. This durability and retry machinery is exactly what Temporal / Step Functions give you for free, which is a strong reason to use them over a hand-rolled orchestrator.

**Interview nuance:** the two things interviewers probe are (1) "sagas give atomicity but not isolation, what anomaly does that allow and how do you contain it?" and (2) "what happens when a compensation fails?" If you can answer both concretely you are ahead of most candidates.

Recap: a saga chains local transactions each with a compensating undo, coordinated centrally (orchestration, preferred for anything non-trivial) or via events (choreography, decoupled but hard to trace); it guarantees the outcome is all-or-nothing but exposes intermediate state, so you add semantic locks and version checks for the missing isolation and make compensations idempotent with retries, DLQ, and escalation for the ones that fail.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design an order-checkout saga that reserves inventory, charges payment, and books shipping across three services, with compensations, and specify the exact behavior when payment fails after inventory has already been reserved.

**Think about:**
- What does a saga give (atomicity of outcome) and NOT give (isolation)?
- Orchestration vs choreography: which do you pick and why?
- How do you handle non-idempotent or failing compensations?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: three services (Inventory, Payment, Shipping), each with its own database, and a checkout flow that must not double-charge, must not sell inventory it cannot ship, and must release held stock if the order fails. Strict cross-service ACID is off the table, so I use a saga.

**Coordination choice.** I pick **orchestration** with a durable workflow engine (Temporal or Step Functions). Checkout has multiple steps, real compensation logic, and on-call needs to answer "where is this order?" A central orchestrator makes the flow explicit, gives me built-in retries, timeouts, and durable state, and centralizes the compensation logic. Choreography would scatter this across event handlers and make the failure path hard to trace.

**Forward path.** Step 1: Inventory reserves the items (local transaction, marks stock reserved for this order). Step 2: Payment charges the card (local transaction, with an idempotency key so retries do not double-charge). Step 3: Shipping books the delivery. Each step commits locally; the orchestrator advances on success.

**The specified failure: payment fails after inventory is reserved.** The orchestrator catches the payment failure and runs compensation for the one completed step: it calls **Inventory.release(orderId)** to un-reserve the stock, then marks the order `FAILED`. Because payment never succeeded, there is nothing to refund. The reserved stock returns to available. The compensation is idempotent (releasing an already-released reservation is a no-op keyed on orderId), so a retry is safe.

**The missing isolation.** Between step 1 and the failure, inventory is reserved but unpaid, and that state is *visible*. Another shopper could see reduced availability for stock that ultimately gets released. I contain this with a **semantic lock**: the order sits in `PENDING`, and the reservation is explicitly a hold with a TTL, not a sale. If the saga stalls, the TTL auto-releases the hold so stock is not stranded. Availability counts treat reserved-pending as tentative.

**Failing / non-reversible compensations.** If `Inventory.release` fails (service down), the orchestrator retries with backoff; persistent failure goes to a DLQ and pages an operator, and the durable workflow state means we never lose the fact that a release is owed. Payment refunds (if we had charged and a later step failed) are semantic compensations, not literal un-charges, and are also idempotent by idempotency key. Shipping, once a label is printed, may not be cleanly reversible, so its compensation is a cancellation/recall, and I sequence charge-then-ship so I never ship before payment clears.

Common wrong turn: treating the saga as if it had isolation, so you expose reserved-but-unpaid inventory as truly sold, or ignoring that a compensation can fail and leaving no retry/DLQ/escalation path.

**Self-check rubric:**
- [ ] Chose orchestration (Temporal/Step Functions) and justified it over choreography for this flow
- [ ] Listed the three local transactions each with a named compensating action
- [ ] Specified the payment-fails-after-reserve path exactly: compensate the reservation, no refund needed, mark FAILED
- [ ] Addressed missing isolation with a semantic lock / PENDING status / reservation TTL
- [ ] Made compensations idempotent and gave a plan for failing/non-reversible compensations (retry, DLQ, escalation, semantic undo)

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the booking saga for a service like Expedia or Booking.com that reserves a flight, a hotel, and a rental car from three independent third-party suppliers in one trip, where any supplier can be slow or reject the booking and some confirmations are effectively non-reversible. Lead with the deliverable, then walk the compensation and isolation strategy.

**Model answer (revealed on demand):**

Assumptions: three external suppliers, each its own API with its own latency and failure behavior, no shared transaction, and some confirmations (a non-refundable fare) that cannot be cleanly undone. Goal: a trip books fully or the customer is left in a clean, refunded state.

**Deliverable: an orchestrated saga with a durable workflow per trip.** I use Temporal (or an equivalent durable orchestrator) with one workflow instance per booking. It calls each supplier as an **activity** with per-supplier timeouts and retries, and it drives compensation on failure. Durable state is essential because a trip can span minutes while a slow supplier responds, and the process must survive orchestrator restarts.

**Ordering to minimize irreversible exposure.** I sequence the *hardest to reverse* or *most likely to fail* step so that failures are cheap. Concretely I reserve the most constrained/non-refundable item last where possible, and I prefer suppliers that support a two-step **hold then confirm** so I hold all three (reversible), then confirm. Holds are semantic locks with a TTL from the supplier, which is my isolation mechanism: an expired hold auto-releases, so a stalled saga does not strand supplier inventory.

**Compensation.** If the car fails after flight and hotel are held, I cancel the flight and hotel holds (idempotent, keyed on booking id). If a supplier only supports confirm (no hold) and the fare is non-refundable, that step is a genuinely non-reversible action: I place it last, and if it fails I compensate the earlier reversible holds; if an *earlier* reversible step later fails after this non-reversible confirm, I cannot undo the fare, so I compensate *semantically* (rebook the failed leg, offer credit, escalate to an agent) and never silently drop the customer's money.

**Handling slow/uncertain suppliers.** Supplier timeouts are ambiguous (did the booking happen?), so every call carries an **idempotency key**, and on timeout I *query* the supplier for booking status rather than blindly retrying, to avoid a double-booking. Failed compensations retry with backoff, then DLQ and page ops, with the durable workflow guaranteeing the owed compensation is never forgotten.

Tradeoff: no isolation across suppliers means a customer can briefly see a partially-booked trip; I contain it with holds/TTLs and a `PENDING` trip status. Wrong turn: firing all three confirmations in parallel with no holds, so a single supplier rejection leaves confirmed, non-refundable bookings you cannot cleanly undo.

### sd-l5-outbox-messaging: Transactional Messaging: Outbox, Inbox & CDC

- **id:** `sd-l5-outbox-messaging`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** outbox, cdc, messaging

#### Learn

Sagas and event-driven systems depend on a step that looks trivial and is not: "update my database *and* publish an event." Doing both is the **dual-write problem**, and it has no atomic solution across two independent systems without a distributed transaction.

Consider the naive code: write the order row to Postgres, then publish `OrderCreated` to Kafka. Two failure orderings break you. If the service crashes *after* the DB commit but *before* the Kafka publish, the order exists but no event was ever sent, so downstream systems (email, fulfillment, analytics) never hear about it: a **lost event**. If you flip the order (publish first, then write the DB) and the DB write fails, you have published an event for an order that does not exist: a **phantom/fabricated event**. You cannot wrap a Postgres commit and a Kafka publish in one atomic transaction, because they are separate systems with separate logs. 2PC between the DB and the broker is technically possible (XA) but reintroduces coordinator blocking and most brokers/DBs discourage it.

The **transactional outbox** pattern removes the dual write entirely by making the event part of the *same local database transaction* as the business data:

```
BEGIN;
  INSERT INTO orders (...);                          -- business write
  INSERT INTO outbox (event_type, payload, ...);     -- event, SAME txn
COMMIT;                                              -- both or neither
```

Now the order row and the "there is an event to publish" fact commit atomically, because they are in one local transaction in one database. There is no cross-system atomicity to worry about. A separate **relay** process reads unpublished rows from the outbox table and publishes them to Kafka, marking them sent (or deleting them) after the broker acknowledges.

Two ways to run the relay:

- **Polling:** the relay periodically `SELECT ... FROM outbox WHERE published = false` and publishes. Simple, works on any database, but adds polling latency and query load, and needs care to avoid double-scanning under concurrency (use `FOR UPDATE SKIP LOCKED`).
- **Change Data Capture (CDC):** a tool like **Debezium** tails the database's write-ahead log (WAL/binlog) and streams committed changes to Kafka directly. No polling, low latency, low DB load, but more infrastructure to operate. This is the production default at scale, and often you can CDC the *business* tables directly and skip a separate outbox table, though a dedicated outbox gives you clean control over event shape.

The relay guarantees the event is published **at least once**: if the relay crashes after publishing but before marking the row sent, it will republish on restart. So consumers can receive duplicates. The **inbox** pattern closes this: the consumer records each processed event id in an inbox/dedup table inside the same transaction as its side effect, and skips any id it has already seen. At-least-once delivery from the relay plus an idempotent (inbox-backed) consumer equals **effectively-once** end-to-end processing, which is the strongest realistic guarantee.

**Interview nuance:** be precise that the outbox does *not* give exactly-once *delivery*. It converts "atomically write DB and publish" (impossible) into "atomically write DB and *record intent to publish*" (a single local transaction), then relies on at-least-once relay plus consumer idempotency for the end-to-end guarantee. Interviewers love to hear you name the ordering-of-failures argument for why the naive dual write is broken.

Recap: writing the DB then publishing to Kafka is not atomic and either loses or fabricates events, so you write the event into an outbox table *in the same local transaction* as the business data and let a relay (polling or Debezium CDC off the WAL) publish it at least once, with a consumer-side inbox/dedup table making the end-to-end result effectively-once.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Guarantee that an `OrderCreated` event is published if and only if the order row commits, without using a distributed transaction between the database and the message broker.

**Think about:**
- Why is writing to the DB then to Kafka not atomic?
- How does the outbox table make it atomic?
- Why is at-least-once + idempotent consumers the realistic end-to-end guarantee?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an Order service on Postgres publishing to Kafka, downstream consumers (fulfillment, email, analytics) that must react to every real order and never to a phantom one. No XA/2PC between Postgres and Kafka.

**Why the naive dual write is broken.** If I `COMMIT` the order then `publish` to Kafka, a crash in between commits the order but loses the event, so fulfillment never runs. If I publish first then commit, a failed DB commit fabricates an event for an order that does not exist. Postgres and Kafka have separate logs, so there is no atomic "commit both." That is the dual-write problem.

**The outbox design.** In the *same* Postgres transaction that inserts the order, I insert a row into an `outbox` table containing the event type, payload, aggregate id, and a unique event id. The transaction commits both or neither, so the invariant "an event exists to be published iff the order committed" holds atomically inside one local transaction. No distributed transaction needed.

```
BEGIN;
  INSERT INTO orders(...);
  INSERT INTO outbox(event_id, type='OrderCreated', payload, published=false);
COMMIT;
```

**Publishing the event.** A relay ships outbox rows to Kafka. At scale I use **Debezium CDC** tailing the Postgres WAL, which turns committed outbox inserts into Kafka records with low latency and no polling load. A simpler alternative is a polling relay using `SELECT ... FOR UPDATE SKIP LOCKED` to claim unpublished rows, publish, and mark them sent. Either way the relay publishes **at least once**: if it crashes after Kafka acks but before marking the row published, it republishes on restart.

**Effectively-once end to end.** Because delivery is at-least-once, consumers can see duplicates, so each consumer must be **idempotent**. I give every event a stable `event_id` and each consumer keeps an **inbox/dedup table**: within the same transaction as its side effect, it checks whether `event_id` was already processed and skips if so. At-least-once relay plus idempotent consumers equals effectively-once processing, which is the strongest realistic guarantee.

**Tradeoffs.** Outbox adds a table, a relay to operate, and a little publish latency (WAL-to-Kafka lag with CDC, poll interval with polling). Ordering: I partition Kafka by aggregate id (order id) so per-order events stay ordered. Cleanup: I prune or archive published outbox rows to keep the table small.

Common wrong turn: publishing to Kafka and committing the DB as if that pair were atomic, or claiming the outbox gives exactly-once *delivery*. It gives an atomic local write plus at-least-once delivery, and idempotent consumers finish the job.

**Self-check rubric:**
- [ ] Explained both failure orderings of the naive dual write (lost event, phantom event) and why no atomic cross-system commit exists
- [ ] Wrote the business row and the event to an outbox table in one local transaction
- [ ] Chose a relay (Debezium CDC off the WAL, or polling with SKIP LOCKED) and noted it is at-least-once
- [ ] Added consumer-side idempotency (inbox/dedup on event id) for effectively-once
- [ ] Noted ordering (partition by aggregate id) and outbox cleanup, and did NOT claim exactly-once delivery

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the change-propagation pipeline for a service like Shopify or an e-commerce platform that must reliably fan out every product/inventory change from its OLTP database to a search index (Elasticsearch), a cache (Redis), and an analytics warehouse, at tens of thousands of writes per second, with no lost or fabricated updates. Lead with the deliverable.

**Model answer (revealed on demand):**

Assumptions: a Postgres/MySQL OLTP store as the source of truth, three async downstream consumers (search, cache, warehouse), 10k to 50k writes/sec peak, and a hard requirement that every committed change reaches all three and no uncommitted/rolled-back change ever does.

**Deliverable: CDC-driven propagation with idempotent consumers.** I make the OLTP database's committed WAL the single source of change truth and stream from it with **Debezium**, rather than asking application code to dual-write to four systems (which would be four dual-write problems at once). Debezium tails the WAL/binlog, so it emits *exactly the committed changes in commit order*, which structurally eliminates both lost and fabricated updates: a rolled-back transaction never reaches the WAL, and a committed one always does.

**Topology.** Debezium publishes change events into Kafka, one topic per table (or an outbox topic if I want curated event shapes rather than raw row diffs). I partition by product id so all changes to one product are ordered on one partition. Three independent consumer groups read the same topics: one upserts into Elasticsearch, one updates/invalidates Redis, one lands changes into the warehouse (via a sink connector). Consumers are independent, so a slow warehouse never blocks search.

**Correctness under at-least-once.** Kafka + Debezium is at-least-once, so on relay/consumer restart events can replay. Every consumer is **idempotent**: I use the change's log sequence number (LSN)/offset or a per-row version, and each consumer applies an event only if it is newer than what it last applied for that key (upsert with a version guard). That makes replays and duplicates harmless and preserves per-product ordering.

**Scale and lag.** At 50k writes/sec I scale Kafka partitions and consumer instances horizontally; CDC keeps DB overhead low because it reads the WAL, not the tables. I monitor **replication lag** (WAL-to-consumer delay) as the key SLO, since it is the freshness of search/cache. Backfills use a Debezium snapshot then switch to streaming.

Tradeoff: CDC couples me to the database's WAL format and adds operational surface (connectors, schema evolution), but it buys a single, ordered, exactly-committed change stream that a fan-out of application dual-writes could never guarantee. Wrong turn: having the app write to Postgres, then Elasticsearch, then Redis, then the warehouse in sequence, where any crash between writes silently desynchronizes the systems.

### sd-l5-delivery-idempotency: Delivery Semantics, Idempotency & Exactly-Once Reality

- **id:** `sd-l5-delivery-idempotency`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** delivery-semantics, idempotency, exactly-once

#### Learn

"Exactly-once" is the most misunderstood phrase in distributed systems. The correct mental model: **exactly-once delivery over an unreliable network is impossible; exactly-once *effect* is achievable by combining at-least-once delivery with idempotency.** This lesson is about why, and how you build the second thing.

Start with the three delivery semantics:

- **At-most-once:** send and forget. If the message is lost, it is gone. No duplicates, but possible loss. Fine for a metric sample, fatal for a payment.
- **At-least-once:** send and retry until acknowledged. No loss, but if the ack is lost the sender retries and the receiver may process the message twice: **duplicates possible**.
- **Exactly-once (delivery):** each message delivered and processed once, no loss, no duplicates. Over a real network you cannot have this at the delivery layer.

Why is true exactly-once delivery impossible? Because acknowledgements can be lost too. Sender sends, receiver processes, receiver's ack is dropped by the network. The sender cannot distinguish "message lost" from "ack lost," so to avoid loss it must retry, and retrying risks a duplicate. This is a fundamental consequence of the two-generals problem: no finite exchange of messages over a lossy channel lets both sides be *certain*. So every real system that "cannot lose data" runs **at-least-once** and then deduplicates.

The tool that turns at-least-once into exactly-once *effect* is the **idempotency key**. The client attaches a unique key to a request (e.g. `Idempotency-Key: a1b2...`, as Stripe does). The server, on first receipt, does the work and **stores the result keyed by that idempotency key** (with a TTL). On any retry with the same key, the server does *not* redo the work; it returns the stored result. The effect happened exactly once even though the request arrived multiple times. The critical detail: recording the key and performing the side effect must be **atomic** (same transaction), or a crash between them reopens the double-execution window.

Not all operations need a stored-result table. Distinguish:

- **Naturally idempotent operations:** `SET balance = 5`, `PUT user.email = x`, deleting by id. Applying them twice yields the same state. Safe to retry with no extra machinery.
- **Non-idempotent operations:** `balance = balance + 100`, "charge \$50," "append to list." Applying twice doubles the effect. These are the dangerous ones, and you make them safe by wrapping them in an idempotency key with a stored result, or by converting them to conditional/versioned updates (compare-and-set on a version, or a unique constraint on the operation id).

**Kafka's "exactly-once semantics" (EOS)** is real but narrowly scoped. Kafka can give exactly-once *within a Kafka-to-Kafka pipeline*: idempotent producers (dedup by producer id + sequence number) plus transactions that atomically commit consumer offsets and output records. But this guarantee stops at Kafka's boundary. If your consumer's side effect is an *external* action (charge a card, send an email, call a third-party API), Kafka EOS does not cover it. Those external effects still need application-level idempotency. Stating this scope precisely is a strong signal in interviews.

**Fencing tokens** protect against a different failure: a *stale* operation from a delayed or paused actor. A process pauses (long GC), is presumed dead, a new one takes over, then the old one wakes and issues a now-stale write. A monotonically increasing **fencing token** attached to each operation, which the storage layer rejects if it is lower than the highest seen, neutralizes the zombie write. Idempotency keys stop *duplicates of the same intent*; fencing tokens stop *stale operations from a superseded actor*. Different problems, both needed in different places.

**Interview nuance:** if you say "we use exactly-once delivery" you will get pushed on it. Say instead "at-least-once delivery plus idempotent processing gives exactly-once *effect*," and name where the dedup state lives and how it is made atomic with the side effect.

Recap: networks force you to choose at-most-once (may lose) or at-least-once (may duplicate), and since exactly-once delivery is impossible you build exactly-once *effect* by giving each request an idempotency key whose stored result is written atomically with the side effect, converting non-idempotent operations to safe ones, while Kafka EOS covers only the pipeline (not external effects) and fencing tokens separately reject stale writes from superseded actors.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Make a payment-charge API safe to retry, so that a client which times out and retries the same charge never double-charges the customer.

**Think about:**
- Why is true network exactly-once impossible?
- How do idempotency keys with a stored result achieve effectively-once?
- What do fencing tokens protect against?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a `POST /charges` API over HTTP, clients that will time out and retry (mobile networks, gateway timeouts), and a hard requirement of at most one actual charge per intended payment. I cannot rely on the network to deliver exactly once.

**Why exactly-once delivery is off the table.** When a client times out it cannot tell whether the charge succeeded and the response was lost, or the request never landed. To avoid *losing* a legitimate charge it must retry, and retrying risks a *duplicate* charge. Acks and responses can be lost just like requests, so no protocol makes both sides certain in finite messages. So I run at-least-once transport and dedup at the application.

**Idempotency-key design.** The client generates a unique **idempotency key** per payment intent (a UUID, reused across retries of the *same* charge) and sends it as a header. Server logic:

1. Look up the key in an `idempotency` table.
2. If present and the original request completed, return the **stored response** verbatim. No second charge.
3. If present but still in-flight (a concurrent retry), return a 409/"processing" or block on a lock so two retries do not both execute.
4. If absent, insert the key in a `PENDING` state (a unique constraint on the key makes concurrent first-requests race-safe: exactly one wins), perform the charge, and **store the result under the key in the same transaction** that records completion.

The atomicity in step 4 is the crux: recording the key and committing the charge must be one transaction, or a crash between them lets a retry re-charge. I also validate that a reused key carries the *same* request parameters, rejecting a key reused for a different amount (Stripe does this).

**TTL and storage.** Keys live in a durable store (Postgres or Redis with persistence) with a TTL long enough to cover realistic client retry windows (e.g. 24h). After that the key expires.

**Fencing (a different risk).** Idempotency keys stop duplicate submissions of the same intent. They do not stop a *stale* actor: if a worker processing a charge pauses (GC), is presumed dead, is replaced, then wakes and tries to finalize, that is a zombie write. I attach a monotonically increasing **fencing token** to the operation and have the ledger reject any token lower than the highest it has seen, so the superseded worker's late write is refused.

**Also:** the downstream payment processor call itself must carry an idempotency key (most, like Stripe, support this), so my retry to *them* is also deduped, not just the client's retry to me.

Common wrong turn: claiming "exactly-once delivery" as a network guarantee, or recording the idempotency key in a separate step from the charge so a crash in between still double-charges.

**Self-check rubric:**
- [ ] Explained why timeout ambiguity forces at-least-once and makes exactly-once delivery impossible
- [ ] Client sends a stable idempotency key per intent; server returns the stored result on retry
- [ ] Recording the key and performing the charge are atomic (same transaction), with a unique-constraint race guard
- [ ] Gave the dedup store a TTL and validated reused-key parameter consistency
- [ ] Distinguished fencing tokens (stale/zombie actor) from idempotency keys (duplicate intent), and idempotency-keyed the downstream processor call too

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design end-to-end effectively-once processing for a service like Uber's payment pipeline, where a trip-completed event flows through Kafka to a billing consumer that charges the rider's card and credits the driver, at high throughput, and neither the rider double-charge nor the driver double-credit is acceptable even under consumer restarts and Kafka rebalances. Lead with the guarantee you actually provide.

**Model answer (revealed on demand):**

Assumptions: `TripCompleted` events produced to Kafka, a billing consumer that performs *external* side effects (charge the rider via a payment processor, credit the driver's ledger), high event volume, and inevitable consumer crashes and partition rebalances that cause redelivery.

**The guarantee I provide.** Not "exactly-once delivery." I provide **at-least-once delivery plus idempotent processing = exactly-once effect**. Kafka can give exactly-once *within* the pipeline (idempotent producer + transactional offset commits), but the moment the consumer charges an external processor, Kafka EOS no longer covers the side effect, so I add application idempotency for the money movements.

**Producer side.** The trip service produces `TripCompleted` with a stable **event id = trip id** and uses Kafka's idempotent producer so producer retries do not create duplicate records within Kafka. Partition by rider id (or trip id) for ordering.

**Consumer side (the real protection).** The billing consumer treats every event as possibly-redelivered (a rebalance can reprocess an offset that was handled but not yet committed). For each event it runs an idempotent transaction against the billing DB: check an **inbox/dedup table** for `trip_id`; if already processed, skip and just commit the offset; if not, perform the charge and driver credit and record `trip_id` as processed **in the same database transaction**. Redelivery after a crash finds the trip already processed and does nothing.

**External call idempotency.** The charge to the payment processor carries an **idempotency key = trip_id**, so even if my consumer crashes after calling the processor but before recording completion, the retry hits the processor with the same key and the processor dedups it: the card is charged once. The driver credit is a ledger append guarded by a unique constraint on trip_id, so it too applies at most once.

**Non-idempotent operations made safe.** Both "charge \$X" and "credit \$Y" are non-idempotent (repeating doubles them), so I convert them to keyed, at-most-once effects via the idempotency key and the unique-constraint/inbox guard.

Tradeoff: I pay for a dedup table lookup and a durable idempotency store on the hot path, and I accept that ordering plus idempotency, not magic delivery, is what makes it safe. Wrong turn: trusting Kafka "exactly-once" to cover the external card charge and driver credit, which it does not, so a rebalance re-runs the side effects and someone gets double-charged.
