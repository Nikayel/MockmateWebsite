> Module **sd-l6-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l6-m2](./sd-l6-m2.md) · Next: [sd-l6-m4](./sd-l6-m4.md)

# L6 · Delivery Guarantees

After this module you can state a system's end-to-end delivery guarantee precisely (and stop misusing the phrase "exactly-once"), design idempotent APIs and consumers that survive at-least-once delivery and client retries, and build retry, dead-letter, and backpressure machinery that keeps a stream flowing without losing data or blocking a partition on one poison message.

### sd-l6-delivery-semantics: Delivery Semantics: At-Most / At-Least / Exactly-Once

- **id:** `sd-l6-delivery-semantics`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** delivery-semantics, exactly-once

#### Learn

Every message pipeline makes one of three promises, and stating which one, end to end, is the single most important sentence in an async design.

**At-most-once**: a message is delivered zero or one times. You never see a duplicate, but you can lose messages. You get this by acknowledging (committing your read position) *before* you process. If the consumer crashes after the commit but before the work finishes, that message is gone forever. Fine for a metrics sample or a best-effort log line, unacceptable for a payment.

**At-least-once**: a message is delivered one or more times. You never lose a message, but you can see duplicates. You get this by processing *first* and acknowledging *after* success. If the consumer crashes after processing but before the ack, the broker redelivers on restart and you process again. This is the practical default for anything that matters, because losing data is usually worse than repeating work, and repeats can be neutralized (see the idempotency lesson).

**Exactly-once**: every message takes effect once, no loss, no duplicate. This is what everyone wants and what the network cannot give you.

Here is the sentence that separates a senior answer from a junior one. **Exactly-once delivery over a network is impossible.** The sender transmits a message and waits for an ack. If the ack does not arrive, the sender cannot distinguish "the message was lost" from "the message arrived and the ack was lost." Its only two moves are resend (risk a duplicate, that is at-least-once) or give up (risk a loss, that is at-most-once). No protocol escapes this, because the failure is indistinguishable from the receiving side's silence. This is the Two Generals problem in production clothing.

So what do the vendors mean by "exactly-once"? They mean **exactly-once processing**, achieved by taking at-least-once delivery and making the effect idempotent or transactional so that duplicates do not change the outcome. You convert a delivery guarantee into a processing guarantee at the consumer.

```
  producer --(at-least-once delivery, may duplicate)--> broker --> consumer
                                                                      |
                              [ idempotency / transaction here ]  <---+
                                                                      |
                                                            effectively-once effect
```

**Interview nuance:** Kafka's "exactly-once semantics" (EOS) is real but narrowly scoped. It combines an idempotent producer (dedups producer retries into a partition using a producer id and sequence number) with transactions that atomically commit the consumer's read offset and the produced output records together. That gives exactly-once for a **read-process-write loop that stays inside Kafka**. It does **not** extend to external side effects. If your consumer sends an email, calls Stripe, or writes to a non-transactional database, Kafka EOS does nothing for those, and you must add an idempotency key yourself. Claiming Kafka gives you end-to-end exactly-once including third-party charges is the classic wrong turn.

Where the ack sits is the whole game: commit-before-process is at-most-once, process-before-commit is at-least-once. Pick at-least-once plus idempotency for anything with real-world consequences.

Recap: three guarantees (lose / duplicate / neither), exactly-once delivery over a network is impossible so you get exactly-once *processing* via idempotency or transactions, Kafka EOS is scoped to read-process-write inside Kafka only, and ack timing decides which guarantee you actually have.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a payment-charging pipeline that must never double-charge; state your delivery guarantee end-to-end and where you convert at-least-once delivery into effectively-once processing.

**Think about:**
- Why is exactly-once delivery over a network impossible?
- What is the scope of Kafka's exactly-once (EOS)?
- Where does ack timing set the guarantee?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an e-commerce checkout emits a `charge_requested` event per order onto Kafka; a payment worker consumes it and calls Stripe; correctness requirement is no double-charge even under retries, redeliveries, and worker crashes; volume is a few hundred charges per second.

End-to-end I run **at-least-once delivery converted to effectively-once processing at the charge boundary**. I choose at-least-once deliberately: losing a charge event (at-most-once) would mean an order silently never gets billed, which is worse than the risk of a duplicate that I can neutralize.

The producer uses Kafka's idempotent producer (`enable.idempotence=true`, `acks=all`) so producer-side retries do not create duplicate events in the topic. Kafka EOS handles the ingest, but I am explicit that **EOS stops at Kafka's boundary**: the Stripe call is an external side effect Kafka knows nothing about, so I cannot rely on transactions for it.

The exactly-once conversion happens at the consumer, at the point of the external charge. Each order carries a stable **idempotency key** (the order id, or a dedicated charge id generated once at checkout). I pass that key to Stripe as its `Idempotency-Key` header. Stripe stores it and returns the original result on any repeat, so even if my worker crashes after charging but before committing the offset and Kafka redelivers, the second call is a no-op that returns the first charge. That is the seam where at-least-once delivery becomes effectively-once effect.

Ack timing: I **process before committing the offset**. Concretely: consume, call Stripe with the idempotency key, persist the local `charge` row keyed by the same id inside a DB transaction, and only then commit the Kafka offset. A crash anywhere before the offset commit simply causes a safe redelivery.

Tradeoffs: this costs an extra round trip and a dedup lookup per charge, and it depends on Stripe honoring the idempotency key (I would not roll my own charging without provider-side dedup). Common wrong turn to avoid: assuming Kafka EOS makes the whole pipeline exactly-once and skipping the idempotency key on the Stripe call, which double-charges on the first redelivery.

**Self-check rubric:**
- [ ] Named the end-to-end guarantee explicitly (at-least-once delivery, effectively-once processing)
- [ ] Explained why exactly-once delivery over a network is impossible
- [ ] Placed the idempotency key at the external side-effect boundary, not just inside Kafka
- [ ] Stated ack/offset-commit timing (process before commit) and why
- [ ] Called out that Kafka EOS does not cover the Stripe call

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the delivery-guarantee story for Uber-style driver payouts at roughly 5,000 payouts per second, where each payout is a bank transfer through a third-party processor with no idempotency-key support, and payouts run as a Kafka read-process-write loop that also updates an internal ledger. State exactly where exactly-once holds and where it does not.

**Model answer (revealed on demand):**

Assumptions: `payout_due` events on Kafka, a worker that (1) writes a ledger debit and (2) triggers an external bank transfer whose processor does not accept an idempotency key; 5k/s, must never pay a driver twice.

I split the flow at the exactly-once boundary. The **internal** read-process-write portion (consume `payout_due`, write the ledger entry, emit `payout_initiated`) I run under Kafka transactions plus a transactional ledger write, so within Kafka and the ledger I get true exactly-once: the offset commit, the ledger row, and the output event either all land or none do.

The **external** bank transfer is the hard part because the processor gives me no dedup. I cannot make the transfer itself idempotent, so I build my own dedup gate in front of it. I keep a `payout_attempt` table keyed by payout id with a unique constraint and a state machine (`PENDING -> SUBMITTED -> CONFIRMED`). The worker atomically claims the row (insert-if-absent, or transition PENDING to SUBMITTED) before it ever calls the processor. If a duplicate event or redelivery arrives, the claim fails and the worker does nothing. Crucially I record `SUBMITTED` *before* the network call, so a crash mid-call leaves the row in SUBMITTED, and recovery must **reconcile** (query the processor for that reference id) rather than blindly resubmit, since a blind resubmit could double-pay.

So exactly-once holds cleanly for the Kafka-plus-ledger portion; for the bank transfer I get effectively-once only via my own claim table plus reconciliation, and I accept a small window where a payout is SUBMITTED-but-unconfirmed that a reconciliation job resolves. At 5k/s the claim table needs a fast unique-key store (Postgres with the id as PK, or DynamoDB conditional put). Wrong turn to avoid: treating the whole loop as exactly-once because it is "inside Kafka" and resubmitting on recovery, which double-pays whenever the first transfer actually went through.

### sd-l6-idempotency-dedup: Idempotency & Deduplication

- **id:** `sd-l6-idempotency-dedup`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** idempotency, dedup

#### Learn

Once you accept at-least-once delivery (and you should for anything that matters), **idempotency is your primary defense against duplicate side effects**. An operation is idempotent if performing it twice has the same observable effect as performing it once. The goal is that a redelivered message, a client retry after a timeout, or a double-tapped "Pay" button all converge to a single outcome.

There are three flavors, in rough order of preference:

1. **Naturally idempotent operations.** `SET status = shipped` or an upsert keyed by a stable id is idempotent for free; applying it twice lands in the same state. Prefer designing operations this way. `INCR balance` is the opposite: repeating it corrupts state, so counters need explicit protection.
2. **Idempotent by design via state machines.** Model the aggregate as states with legal transitions (`CREATED -> PAID -> SHIPPED`). A command that tries an already-taken transition is a no-op. Combined with a per-aggregate **expected version** (optimistic concurrency), a replayed or stale command is simply rejected.
3. **Enforced idempotency via a dedup store.** For everything else, attach an **idempotency key** (a client-supplied UUID, or the event id) and keep a **dedup store** that records which keys you have already processed, with the result.

The single most important detail: the dedup store must save the **result**, not just a "seen" flag. If you store only a boolean, two concurrent duplicates both see "not seen," both execute, and now you have diverged and no stored answer to return. Store the outcome (the created order id, the HTTP response body) keyed by the idempotency key, and return it verbatim on any repeat.

**The concurrent-duplicate race** is what interviewers probe. Two copies of the same request arrive at two servers at the same millisecond. A read-then-write check ("is this key present? no -> insert") has a race between the read and the write where both pass. You must make the check-and-set **atomic**:

```
  INSERT INTO idempotency_keys (key, status, result)
  VALUES ($1, 'in_progress', NULL)
  ON CONFLICT (key) DO NOTHING;
  -- exactly one inserter wins the unique constraint; the loser
  -- re-reads the row and waits for / returns the winner's result
```

A unique constraint (or a Redis `SET key value NX`, or a DynamoDB conditional `PutItem` with `attribute_not_exists`) makes exactly one writer win. The loser reads back the row: if it is `in_progress`, it waits or returns 409/retry; if `completed`, it returns the stored result.

**Sizing the dedup window.** The dedup store keeps keys for a TTL. That TTL must be **at least as long as the longest window in which a duplicate can arrive.** Two windows matter: client retry horizon (how long clients keep retrying, minutes) and broker **replay/retention** window (Kafka can replay days of history during a reprocess or consumer reset). If your dedup TTL is 1 hour but you replay a 3-day-old topic, every replayed message looks new and re-applies. Size the TTL to cover the replay window, or use a permanent natural key so replays are inherently safe.

**Interview nuance:** distinguish the idempotency key's *scope*. A client-supplied key dedups client retries of the same logical request. An event-id key dedups broker redeliveries. They are different keys guarding different duplicate sources, and a robust design often uses both.

Recap: idempotency neutralizes at-least-once duplicates via natural idempotency, state machines with expected-version checks, or a dedup store that saves the *result* under an idempotency key; resolve the concurrent race with an atomic check-and-set (unique constraint), and size the TTL to cover both the client-retry and broker-replay windows.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design an idempotent "create order" API and consumer given at-least-once delivery and client retries; specify the idempotency key, storage, and TTL, and handle the concurrent-duplicate race.

**Think about:**
- What is the idempotency key and where does the dedup store live?
- How do you resolve two duplicates racing simultaneously?
- How do you size the dedup window vs the replay window?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a mobile client calls `POST /orders`; the network is flaky so the client retries on timeout; downstream, an `order_created` event is consumed at-least-once by a fulfillment worker. Requirement: one order per user intent, no duplicates from retries or redeliveries.

**Idempotency key.** The client generates a UUID per checkout attempt and sends it as an `Idempotency-Key` header. This is stable across the client's retries of the same intent (it does not regenerate on retry), so all retries share one key. For the downstream consumer, the key is the event id.

**Storage.** An `idempotency_keys` table (or Redis) with columns `key (unique), status, response_body, created_at`. It lives next to the order service so the write is transactional with the order insert.

**The write path.** On request, atomically `INSERT ... ON CONFLICT (key) DO NOTHING` with status `in_progress`. If I won the insert, I create the order and the `order_created` event in the **same DB transaction** as updating the row to `completed` with the stored response, then return it. If I lost (conflict), I read the existing row: `completed` -> return the stored response body (same 201 the first call got); `in_progress` -> return 409 or hold briefly and re-read. This makes two simultaneous duplicates converge: exactly one creates the order, the other returns the identical result.

**Consumer side.** The fulfillment worker dedups on event id with the same atomic check-and-set, and stores the result so a redelivery returns the same outcome rather than fulfilling twice.

**TTL sizing.** The client-retry horizon is minutes, but the Kafka topic retains, say, 7 days and can be replayed during a reprocess. So the consumer's dedup keys must live at least 7 days, matching the retention window; otherwise a replay re-fulfills every order. The API-side keys can expire after 24 hours since clients do not retry a day later. Common wrong turn: storing a boolean "seen" flag instead of the result, so concurrent duplicates both execute and diverge, and a shorter-than-retention TTL that lets replays re-apply.

**Self-check rubric:**
- [ ] Defined a client-supplied idempotency key stable across retries, plus event-id dedup downstream
- [ ] Used an atomic check-and-set (unique constraint / ON CONFLICT / SET NX) for the race
- [ ] Stored the result, not a boolean flag, and returned it on repeats
- [ ] Made the dedup write transactional with the state change
- [ ] Sized the TTL against the broker replay/retention window, not just client retries

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design idempotency for Stripe-scale API request handling: a global `POST /v1/charges` accepting client `Idempotency-Key` headers at 50,000 requests per second across multiple regions, where the same key can hit two regions and requests can be replayed for 24 hours. Specify the dedup store, the concurrency resolution, and how you handle a key reused with a *different* request body.

**Model answer (revealed on demand):**

Assumptions: multi-region API, clients send `Idempotency-Key`; must never double-charge, must return the original response on any replay within 24h, and must detect a client accidentally reusing a key for a different payload.

**Dedup store.** A low-latency, strongly consistent key-value store keyed by `(account_id, idempotency_key)`. At 50k/s I would not put this in a single Postgres; I would use a store with fast conditional writes and a native TTL, such as DynamoDB (with a conditional `PutItem`) or a Redis cluster backed by a durable record. The value holds `request_fingerprint`, `status`, `response`, and a 24h TTL.

**Concurrency resolution.** First writer wins via a conditional put (`attribute_not_exists(key)`), status `in_progress`. Concurrent duplicates that lose the put poll the record: `completed` returns the stored response; `in_progress` returns a 409 "request in progress, retry." I write the response back into the record inside the same logical transaction as the charge's idempotency handshake with the payment core, so the stored response is authoritative.

**Cross-region collision.** Two regions seeing the same key is the interesting case. I pin idempotency-key resolution to a **single authoritative region/partition per key** (route by hashing the key, or use a globally consistent table like DynamoDB global tables with a designated writer region) so the conditional put still serializes. Eventual-consistency-only replication would let both regions think they won, so the dedup store must be strongly consistent for the check-and-set, even if the rest of the stack is multi-master.

**Key reused with a different body.** I store a hash of the request body (`request_fingerprint`) with the key. On a repeat, if the fingerprint differs from the stored one, I reject with `400 idempotency_key_reused` rather than returning the old charge or making a new one. This catches client bugs where a key is accidentally reused for a different amount. Wrong turn to avoid: a per-region local cache with no global serialization, which double-charges when the same key lands in two regions at once.

### sd-l6-retries-dlq-backpressure: Retries, Dead-Letter Queues & Backpressure

- **id:** `sd-l6-retries-dlq-backpressure`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** retries, dlq, backpressure

#### Learn

A consumer that calls anything flaky (a third-party API, a downstream service) will hit failures. How you handle those failures decides whether your pipeline degrades gracefully or wedges completely.

**Retries with backoff and jitter.** Transient failures (a 503, a timeout, a throttle) should be retried, but naively retrying immediately in a tight loop turns a downstream blip into a self-inflicted DDoS. Use **exponential backoff** (wait 1s, 2s, 4s, 8s) plus **jitter** (randomize the delay) so a fleet of consumers that all failed at once do not retry in a synchronized thundering herd. Cap the attempts (say 5) so a permanently broken message does not retry forever.

**Transient vs permanent errors.** Classify the failure. A timeout or 429 is transient: retry it. A 400 "malformed payload" or a schema violation is permanent: retrying will never succeed, so send it straight to the dead-letter queue instead of burning 5 attempts. Blindly retrying permanent errors wastes capacity and delays the DLQ signal.

**The dead-letter queue (DLQ).** When a message exhausts its retries (or fails permanently), you must not drop it silently and you must not let it block the stream. You route it to a **dead-letter queue or topic**: a separate destination holding failed messages with their error context and attempt count. The DLQ needs three things to be useful: **alerting** (DLQ depth greater than zero pages someone), **inspection** (you can read why each message failed), and **redrive** (tooling to replay fixed messages back onto the main topic after you deploy a fix). A DLQ with no alerting is just a place data goes to die.

**Head-of-line blocking, the core Kafka trap.** A Kafka partition is a strictly ordered log, and a consumer processes it in order, one offset at a time. If message at offset 100 keeps failing and you retry it in place, you **cannot advance to offset 101** without either committing past the failure (losing it) or blocking forever. One poison message stalls the entire partition and everything behind it. This is head-of-line blocking, and it is the number one wrong turn in async design.

```
  partition:  ... 98  99  [100 FAILS] 101  102  103 ...
                            ^ retrying in place
                            everything behind 100 is stuck
```

The fix is to **not retry in place on the ordered partition**. Two standard patterns: (a) move the failed message to a **retry topic** (often a tiered set: `retry-5s`, `retry-1m`, `retry-10m`) with a delay, commit the original offset, and let the main partition flow; a separate consumer drains the retry topic after the delay. (b) After N retries, move it to the DLQ. Either way the main partition never blocks on one bad message. The tradeoff: moving a message off the ordered partition **breaks strict ordering** for that key, so this is for workloads where per-message success matters more than strict order, or where you accept reordering on failure.

**Backpressure.** When a consumer is slower than the producer, something has to give. With a **pull-based** log like Kafka, the consumer fetches at its own pace and simply falls behind; the **durable log is the buffer**, absorbing the backlog on disk (days of retention) instead of overflowing memory or dropping data. **Consumer lag** (how many messages behind the head you are) is the health signal, and you respond by **autoscaling consumers on lag** (up to the partition count, which caps parallelism). Contrast a push-based system with no buffer, where a slow consumer forces the producer to block or drop. Bounding in-flight work per consumer keeps memory stable while the log holds the overflow.

**Interview nuance:** if asked "what happens when your consumer can't keep up," the strong answer is "the durable log absorbs it as lag, I alert and autoscale on lag up to partition count, and I make sure a poison message goes to a retry topic or DLQ rather than blocking the partition." That covers both the slow-consumer and the bad-message failure modes in one breath.

Recap: retry transient errors with capped exponential backoff plus jitter, send permanent failures and exhausted retries to an alerted, redrivable DLQ, never retry in place on an ordered partition (use retry topics to avoid head-of-line blocking), and lean on the durable log as your backpressure buffer while autoscaling on consumer lag.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design retry + failure handling for a consumer that calls a flaky third-party API; prevent a single poison message from blocking a partition while guaranteeing no silent data loss, and keep the pipeline stable when the consumer slows down.

**Think about:**
- How do you avoid head-of-line blocking on an ordered partition?
- When does a message go to the DLQ versus retry?
- How does a durable log act as the backpressure buffer?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a Kafka consumer reads `notification_requested` events and calls a third-party push/SMS API that is occasionally slow, throttles (429), and sometimes returns 400 for a malformed recipient. Requirement: no lost events, no partition stall, stable under load spikes.

**Error classification first.** On each call I classify the result. Timeouts, 5xx, and 429 are **transient**: retry them. A 400 or a validation failure is **permanent**: it will never succeed, so it goes straight to the DLQ without wasting retry attempts.

**Retry without blocking the partition.** I do **not** retry in place, because the partition is ordered and a stuck message would block every event behind it (head-of-line blocking). Instead I use tiered **retry topics**: on a transient failure I publish the message (with an incremented attempt count and the error) to `retry-30s`, then commit the original offset so the main partition keeps flowing. A delayed consumer drains `retry-30s` after the delay; still failing, it escalates to `retry-5m`, then `retry-30m`. Retries use exponential backoff plus jitter so a downstream outage does not produce a synchronized thundering herd.

**DLQ for exhaustion and permanent errors.** After the last retry tier, or immediately for a permanent error, the message goes to a **dead-letter topic** carrying the payload, the final error, and the attempt count. DLQ depth greater than zero fires an alert. I keep redrive tooling to replay DLQ messages back to the main topic once I deploy a fix (for example after the third party recovers). Nothing is ever dropped silently, which satisfies no-data-loss.

**Backpressure.** When the third party slows and my consumer falls behind, the **durable Kafka log absorbs the backlog** as consumer lag (days of retention on disk), so I never overflow memory or drop events. I monitor consumer lag as the primary health signal and **autoscale consumers on lag**, up to the partition count (my parallelism ceiling). I bound in-flight requests per consumer so a slow API cannot balloon memory.

Common wrong turn: retrying the failing message in place on the ordered partition, which blocks the whole partition on one poison message, or having no DLQ so exhausted messages are dropped or loop forever.

**Self-check rubric:**
- [ ] Classified transient (retry) vs permanent (DLQ immediately) errors
- [ ] Avoided head-of-line blocking via retry topics / delayed retries, not in-place retry
- [ ] Used capped exponential backoff with jitter
- [ ] Routed exhausted/permanent messages to an alerted, redrivable DLQ (no silent loss)
- [ ] Named consumer lag as the backpressure signal and autoscaled on it, with the log as buffer

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design failure handling for DoorDash-style order-status webhooks fanned out to 200,000 merchant endpoints, where a large fraction of endpoints are slow or intermittently down, ordering per merchant matters, and you must not let one dead merchant delay deliveries to healthy ones. Specify your retry policy, DLQ strategy, and how you isolate slow endpoints.

**Model answer (revealed on demand):**

Assumptions: internal events produce webhook deliveries to 200k merchant URLs; many endpoints are flaky; per-merchant ordering matters (a "delivered" must not land before "picked up"); one bad endpoint must not degrade the other 199,999.

**Isolation is the headline.** The core risk is one slow merchant creating head-of-line blocking for others. I partition the delivery workload by merchant id so a stuck merchant only stalls its own lane, not the shared stream, and I cap concurrent in-flight deliveries per merchant. To stop a single dead endpoint from consuming a worker slot indefinitely I add a **per-endpoint circuit breaker**: after K consecutive failures I open the breaker for that merchant, stop attempting for a cooldown, and let their events accumulate in a per-merchant retry buffer instead of retrying hot. Healthy merchants are unaffected.

**Retry policy.** Transient failures (timeouts, 5xx, 429) retry with exponential backoff plus jitter across tiered delays (30s, 2m, 10m, 1h) over roughly 24 hours, because a merchant's server being down for an hour is normal and I want eventual delivery. A 4xx that indicates a permanently bad URL or rejected payload goes to the DLQ immediately.

**Ordering under retry.** Since per-merchant order matters, I do not let a later event pass a retrying earlier one for the same merchant. Within a merchant lane I hold ordering: if event N is retrying, N+1 waits behind it (bounded), because that merchant's throughput is naturally limited by their own endpoint anyway. Cross-merchant, everything flows independently.

**DLQ.** After 24h of retries or on a permanent error, the delivery goes to a DLQ with the endpoint, payload, and failure history, with alerting on depth and per-merchant failure dashboards so support can flag chronically broken integrations. Redrive lets me replay once a merchant fixes their endpoint. Wrong turn to avoid: a single shared retry queue with no per-merchant isolation or circuit breaker, where a few thousand dead endpoints saturate the worker pool and delay every healthy merchant.
