> Module **sd-l6-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l6-m3](./sd-l6-m3.md) · Next: [sd-l6-m5](./sd-l6-m5.md)

# L6 · Stream Processing & Event Patterns

After this module you can design real-time stream pipelines that stay correct under late and out-of-order data, model state as an immutable event log you can replay and time-travel, and split write and read models with CQRS so each scales and is shaped for its own job without paying complexity you do not need.

### sd-l6-stream-processing: Stream Processing: Windowing, Watermarks & State

- **id:** `sd-l6-stream-processing`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** stream-processing, windowing, flink

#### Learn

Batch processing sees a whole bounded dataset and computes an answer. Stream processing computes continuously over an unbounded, never-complete dataset, so the hard question is not "what is the answer" but "when do I emit it, given that more data for the period I am aggregating might still arrive." Everything in stream processing flows from three clocks and a promise about lateness.

**Three clocks.** *Event time* is when the thing actually happened (stamped by the producing device). *Ingestion time* is when the broker received it. *Processing time* is when your operator sees it. These differ because of network delay, mobile clients going offline, retries, and partition skew. A phone can buffer events for 30 seconds in a tunnel, then flush them. If you aggregate by processing time, that burst lands in the wrong 5-minute bucket and your per-user counts are silently wrong. Correct real-time analytics almost always uses **event time**.

**Windows.** You cut the infinite stream into finite chunks. *Tumbling* windows are fixed, non-overlapping (every event in exactly one 5-minute bucket). *Sliding* windows overlap (a 5-minute window advancing every 1 minute, so each event is in five windows: this is what you want for "rolling 5-minute rate"). *Session* windows group bursts separated by a gap of inactivity (great for user sessions, sized dynamically). 

**Watermarks.** A watermark is the engine's assertion "I believe I have now seen all events with event time <= T." It is a heuristic, usually `max_event_time_seen - allowed_lateness`. When the watermark passes a window's end, the window *fires* and emits its result. This is the mechanism that lets an unbounded stream produce bounded, timely output. You tune the lateness bound: a tight bound (say 5s) gives low latency but drops stragglers; a loose bound (say 5 min) waits longer but captures late data. *Allowed lateness* additionally keeps a window's state around after firing so a late event can trigger an updated (retracted/corrected) result instead of being dropped.

**Interview nuance:** the single most common wrong answer is "just use processing time and drop late events." Say out loud what you do with late data: route to a side output / dead-letter, or emit a correction. Silent drops are a correctness bug that never pages anyone.

**Fault-tolerant state.** Aggregations are stateful (a per-user counter lives somewhere). Flink keeps this in an embedded **RocksDB** state backend on each task's local disk, and periodically takes a **checkpoint**: a consistent snapshot of all operator state plus the source offsets, written to durable storage (S3/HDFS) using the Chandy-Lamport barrier algorithm. On failure it restores the last checkpoint and rewinds Kafka to the checkpointed offsets, giving **exactly-once** *state* semantics (each event affects state once, even though it may be reprocessed). Kafka Streams does the same idea with a compacted *changelog topic* backing each local store.

**Engine choice.** *Flink*: richest event-time/state/CEP support, true exactly-once via checkpoints, best for complex low-latency work. *Kafka Streams*: a library (no cluster), great when you already live in Kafka and want per-partition local state. *Spark Structured Streaming*: micro-batch, best if you already run Spark and can tolerate slightly higher latency. Joins matter too: *stream-stream* joins need windowed state on both sides; *stream-table* joins enrich events against a materialized **KTable** (a changelog folded into current-value-per-key).

Recap: aggregate by event time, use watermarks to bound lateness and fire windows, keep local state fault-tolerant via RocksDB plus checkpoints/changelogs for exactly-once, and never drop late data silently.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a real-time fraud/anomaly pipeline that computes per-user rolling 5-minute aggregates over an event stream and stays correct even when events arrive late and out of order.

**Think about:**
- What is the difference between event time and processing time?
- How do watermarks bound lateness and trigger windows?
- How is local state made fault-tolerant?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: events (login, transaction, device-change) land on a Kafka topic keyed by user_id, each carrying a producer event-time timestamp. Clients are mobile, so 30s to a few minutes of lateness is normal. We compute a rolling 5-minute count/sum per user and flag anomalies (e.g. > 20 transactions or > $5k in the window). Target end-to-end latency: a few seconds for on-time events.

**Engine and topology.** Flink, for real event-time and exactly-once state. Source: Kafka connector, keyBy(user_id) so each user's events go to one parallel task holding that user's state. Assign timestamps from the event-time field and emit a bounded-out-of-orderness watermark of `maxSeen - 2 min`. That 2-minute bound is the deliberate latency/completeness trade: most mobile stragglers land inside it.

**Windows.** A sliding event-time window of size 5 min, slide 1 min, so each firing reflects the true rolling 5-minute total. When the watermark crosses a window's end the window fires and I evaluate the fraud rule. I also set `allowedLateness(5 min)`: events later than the watermark but within 5 min re-fire the window and emit a corrected verdict; events later than that go to a **side output** (dead-letter) for offline review, never dropped silently.

**Why event time, not processing time.** A phone that was offline flushes a burst; by processing time those events would land in the current bucket and both undercount the real window and overcount now, corrupting the fraud signal. Event time places each event in the window where it actually belongs.

**Fault tolerance.** Per-user counters live in the embedded RocksDB state backend on each task. Enable checkpointing every 10s: Flink snapshots all keyed state plus Kafka source offsets to S3 via aligned barriers. On a task crash it restores the last checkpoint and rewinds Kafka to those offsets, so each event updates a user's counter exactly once. Downstream (the alert emitter) must be idempotent since re-emitted alerts can repeat.

**Common wrong turn:** using processing-time tumbling windows and discarding anything past the window, which silently drops the exact offline-then-reconnect pattern fraudsters exploit.

**Self-check rubric:**
- [ ] Distinguished event time from processing time and justified choosing event time
- [ ] Used a sliding (not tumbling) window for a rolling metric, keyed by user
- [ ] Explained watermarks as the firing trigger and named an explicit lateness bound
- [ ] Handled late data with allowed lateness plus a side output, no silent drops
- [ ] Made state fault-tolerant via RocksDB plus checkpoints and Kafka offset rewind (exactly-once state)

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the event-time pipeline for Uber-style surge pricing: consume a 500k events/sec stream of rider requests and driver GPS pings, compute per-hexagon (H3 cell) supply/demand ratios over a rolling 2-minute window, and keep the number correct when driver phones report GPS in delayed bursts on flaky networks.

**Model answer (revealed on demand):**

Assumptions: two Kafka topics (requests, driver-pings), both event-time stamped, ~500k/s combined, geo-bucketed to H3 hexagons. We need a surge multiplier per hexagon refreshed every few seconds, correct under bursty late GPS.

**Topology.** Flink, keyBy(h3_cell) so all events for a hexagon share one task and its state. Watermark = `maxEventTime - 90s`, tuned from observed p99 driver-ping lateness on cellular. A sliding event-time window (size 2 min, slide 15s) computes demand (request count) and supply (distinct active drivers) per hexagon; the surge multiplier is a function of their ratio.

**Late and bursty GPS.** A driver in a parking garage buffers pings and flushes 60s of them at once. With event time those pings land in the correct 15s slices, so supply is not spuriously spiked in the current instant. `allowedLateness(90s)` re-fires and corrects a hexagon's ratio when a burst lands; anything later is negligible for a 2-minute surge signal and goes to a side output for monitoring.

**Scale.** 500k/s over hexagons is naturally shardable: partition Kafka by h3_cell (hundreds of partitions), and Flink parallelism matches so hot downtown cells still spread across tasks. Per-cell state is tiny (a few counters and a driver set), so RocksDB local state stays small; checkpoint every 10s to S3.

**Correctness vs freshness trade.** The 90s watermark means a genuine demand spike is fully reflected up to 90s later, but the alternative (processing time) would let one delayed GPS burst swing a hexagon's surge multiplier and overcharge riders. For pricing, being briefly stale is far safer than being confidently wrong, so I take the event-time bound. I also cap multiplier change rate downstream to avoid whiplash from a single corrected window.

### sd-l6-event-sourcing: Event Sourcing

- **id:** `sd-l6-event-sourcing`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** event-sourcing, ledger

#### Learn

Most systems store *current state* and mutate it in place: a `balance` column gets `UPDATE`d and the previous value is gone. Event sourcing inverts this. The source of truth is an **append-only, immutable log of events** ("Deposited $100", "Withdrew $30"), and current state is *derived* by replaying (folding) those events over an aggregate. You never overwrite; you only append. The current balance is a computed view, not the stored truth.

**Deriving state.** An *aggregate* (say Account #42) has a fold function: start from an empty state, apply each event in order, produce the current state. `fold(events) = events.reduce(apply, initialState)`. Because the log is ordered per aggregate, replay is deterministic: the same events always yield the same state. This is why an event-sourced ledger can answer "what was the balance as of last Tuesday 5pm": you fold only the events up to that timestamp. In-place-state systems cannot answer that without a separate audit table, because they threw the history away.

**Why teams reach for it.** (1) *Full audit trail* for free: every change is a first-class, retained fact, which regulators love for financial and medical systems. (2) *Temporal / time-travel queries*: reconstruct any past state. (3) *Debugging*: replay production events into a fixed build to reproduce a bug exactly. (4) *New read models retroactively*: a new projection can be built by replaying the entire history (see the CQRS lesson).

**The replay-cost problem, and snapshots.** An account open for 10 years may have 100k events. Folding all of them on every read is too slow. The fix is **snapshots**: periodically persist the derived state (e.g. every 500 events) as `Snapshot(version=N, state=...)`. To load, take the latest snapshot and fold only the *tail* of events after it. Replay cost becomes bounded by snapshot frequency, not aggregate age. Snapshots are a cache, never the source of truth: you can always delete every snapshot and rebuild from the log.

**Concurrency: optimistic, via expected version.** Two requests both read Account #42 at version 100 and both try to append. To prevent a lost update, each append carries an **expected version**. The store's append is conditional: "append this event only if the aggregate is still at version 100." The first wins and moves to 101; the second's condition fails, and it retries by re-reading the now-current state. This is optimistic concurrency and it is the standard event-store contract (EventStoreDB, or a Postgres table with a unique constraint on `(aggregate_id, version)`).

**Interview nuance:** you never edit history. A wrong event is corrected by appending a *compensating* event ("Adjustment: -$30, reason: duplicate"), exactly like an accountant posts a correcting entry rather than erasing ink. Schema change over years is handled by **upcasting**: when you read an old event version, transform it on the fly into the current shape before applying it.

**When it is the wrong tool.** Event sourcing adds real complexity: eventual consistency in read models, replay tooling, schema/upcasting discipline, and a steeper mental model for the whole team. If an entity is simple CRUD with no audit or temporal need (a user's display-name preference), event sourcing is over-engineering. Reach for it where history *is* the product: ledgers, order lifecycles, inventory, anything audited.

Recap: store immutable events as truth and fold them to derive state, bound replay with snapshots, guard writes with expected-version optimistic concurrency, correct by appending (never editing), and use it only where audit/temporal value justifies the complexity.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design an account-balance/ledger service using event sourcing: rebuild the current balance from events, support "balance as of last Tuesday," and handle a continuously growing event log.

**Think about:**
- How is current state derived, and how do snapshots bound replay cost?
- How does optimistic concurrency via expected version work?
- When is event sourcing not a fit?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a ledger where correctness and auditability are paramount (a financial system). Each account is an aggregate. Operations: deposit, withdraw, transfer. We must reconstruct current balance, answer historical-balance queries, and stay fast as accounts accumulate years of events.

**Event model and store.** Events are immutable facts: `Deposited{amount, ts}`, `Withdrew{amount, ts}`, `TransferOut/In{...}`. Store them append-only in an event store: EventStoreDB, or a Postgres `events(aggregate_id, version, type, payload, event_ts)` table with a unique constraint on `(aggregate_id, version)`. The current balance is *not* a stored column; it is derived by folding an account's events: start at 0, add deposits, subtract withdrawals, in version order.

**Historical queries.** "Balance as of last Tuesday 5pm" is just folding the account's events with `event_ts <= that instant`. Because the log is retained and ordered, any past state is reconstructable exactly. An in-place `balance` column could never answer this without a bolted-on audit table.

**Bounding replay cost.** A hot account with 100k events is too slow to fold on every read. Persist snapshots every 500 events: `Snapshot(account, version=N, balance, event_ts)`. To read current balance, load the latest snapshot and fold only events after version N. Snapshots are a rebuildable cache; deleting them all still leaves the log as truth. Historical queries fold from the nearest snapshot *before* the target time.

**Concurrency.** Two withdrawals racing on the same account both read version 100. Each appends with expected version 100; the store's conditional append (unique constraint on `(account, 101)`) lets exactly one succeed. The loser re-reads (now version 101, updated balance) and retries, re-checking the funds invariant. This is optimistic concurrency, and it enforces "no overdraft" correctly under contention without cross-row locks.

**Corrections and evolution.** A bad entry is fixed by appending a compensating `Adjustment` event, never by editing history. Old event shapes are upcast to the current schema on read.

**When not to use it.** For a simple CRUD entity with no audit or temporal requirement, event sourcing is pure overhead. A ledger is the textbook *right* fit because history is the product.

**Common wrong turn:** storing a mutable `balance` column "for speed" alongside the events, which reintroduces the dual-write/lost-history problem event sourcing exists to remove. Keep balance derived (optionally cached via snapshot), never authoritative.

**Self-check rubric:**
- [ ] Made events the immutable source of truth and derived balance by folding
- [ ] Answered the historical query by folding events up to a timestamp
- [ ] Used snapshots to bound replay cost and called them a rebuildable cache
- [ ] Enforced no-overdraft/lost-update via expected-version optimistic concurrency
- [ ] Corrected by appending a compensating event, never editing history
- [ ] Stated when event sourcing is over-engineering

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the event-sourced core of a Stripe-style payments ledger handling 50M ledger entries/day, where every balance movement must be auditable for 7 years, double-entry invariants must always hold, and finance runs point-in-time reports for any past instant.

**Model answer (revealed on demand):**

Assumptions: double-entry ledger (every movement debits one account and credits another; the sum is always zero). 50M entries/day is ~580 writes/sec average, with peaks maybe 10x. 7-year immutable retention is a compliance requirement.

**Design.** Each account is an aggregate; each posting appends a paired debit/credit event within one atomic transaction so the double-entry invariant can never be half-applied. Store in an append-only log partitioned by account_id: EventStoreDB, or Kafka (as the durable log) fronting a Postgres/Cassandra event table. The unique `(account_id, version)` constraint gives per-account ordering and optimistic concurrency.

**Scale and retention.** 50M/day for 7 years is ~128B events, far too many to fold naively. Snapshot each account frequently (every N events or nightly) so current balance reads fold a tiny tail. Age cold events to cheap object storage (S3) with the hot tail in the primary store; the log stays immutable and complete for the 7-year audit window. Partitioning by account_id keeps writes horizontally scalable well past peak.

**Point-in-time reports.** Finance's "trial balance as of March 31, 23:59" is a fold of every account's events up to that instant, parallelized across account partitions and seeded from the nearest pre-March-31 snapshot. Because history is immutable, the report is exactly reproducible months later, which is the whole reason to event-source a ledger.

**Invariants and correctness.** Never edit; corrections are reversing entries (append a compensating debit/credit pair), preserving the audit chain. A continuous reconciliation job folds all events and asserts the global debit=credit invariant, catching any projection drift.

**Trade:** we accept higher storage and replay tooling cost and eventual consistency in read-side reports, in exchange for a provably complete, tamper-evident 7-year audit trail. For payments that trade is unambiguously correct.

### sd-l6-cqrs: CQRS & Read Models

- **id:** `sd-l6-cqrs`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** cqrs, read-models, projections

#### Learn

CQRS (Command Query Responsibility Segregation) is one idea: **separate the model you write through from the model(s) you read through.** The write side handles *commands* (intent to change state: "PublishProduct"), runs validation and business invariants, and owns the authoritative data. The read side serves *queries* from **denormalized projections** shaped exactly for how the UI reads. They can be different schemas, different databases, even different technologies.

**Why separate them.** Reads and writes have opposite pressures. A product catalog might take 50 writes/sec (with heavy validation: pricing rules, category constraints, inventory checks) but 500k reads/sec (search, filter, faceted browse). A single normalized schema optimized for write-side integrity forces reads to join 8 tables per page load. CQRS lets the write side stay a clean normalized model in Postgres, while the read side is a denormalized document in Elasticsearch or a materialized Redis view, each scaled independently. You are no longer forced to make one schema good at two conflicting jobs.

**How projections stay in sync.** The write side, on committing a command, emits an event ("ProductPublished"). Projection handlers *consume* those events and update the read models. You can have *many* projections off one event stream: an Elasticsearch index for search, a Redis hash for the product detail page, a Postgres rollup for the admin dashboard, each a different shape for a different query. Handlers must be **idempotent** (processing the same event twice yields the same result), because at-least-once delivery will redeliver. Store the last processed event offset/version per projection so replays are safe.

```
Command --> [Write model]      event      [Read model: ES index ]  <-- query
            (Postgres,     ----------->   [Read model: Redis view]  <-- query
             validation)      stream      [Read model: PG rollup ]  <-- query
```

**The consistency cost: eventual consistency.** The projection updates *after* the write commits, so there is a lag (usually milliseconds, sometimes seconds under load). A user who edits a product and immediately reloads may see stale data. This breaks **read-your-writes** expectations. Fixes: (1) *client echo*, where the client optimistically shows its own just-submitted value without waiting for the read model; (2) *versioned reads*, where the write returns a version and the client polls/reads until the projection has caught up to that version; (3) route the user's own immediately-following read to the write model for a short window. Pick one and state it; hand-waving eventual consistency is a red flag.

**Rebuild superpower.** Because projections are derived and idempotent, you can drop a read model and **replay** the event log to rebuild it. That is how you add a new read model months later, fix a projection bug, or migrate the read store: reset the offset to 0 and reprocess. This is the strongest operational reason to adopt CQRS.

**Interview nuance:** CQRS and event sourcing are *often taught together but are independent.* You can do CQRS with a plain CRUD write model that emits events (or that a change-data-capture stream like Debezium tails), no event store required. Coupling CQRS to full event sourcing "because they go together" doubles your complexity for no reason if you did not need the event log. Default to CQRS-with-CDC unless audit/temporal needs justify event sourcing too.

Recap: split commands (validated write model) from queries (denormalized projections built by idempotent event handlers), accept eventual consistency and handle read-your-writes explicitly, rebuild read models by replay, and do not drag in event sourcing unless you separately need it.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design read/write separation for a high-read product catalog that has complex write validation: build denormalized read projections updated from write-side events and handle read staleness.

**Think about:**
- Why separate the write side (commands, validation) from the read side (denormalized projections)?
- How do projections stay in sync, and how do you handle read-your-writes UX?
- Why should CQRS not be coupled to event sourcing by default?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: e-commerce catalog, ~50 product-edit writes/sec with heavy validation (pricing rules, category/attribute constraints, inventory), but ~500k reads/sec across search, filtering, and product pages. Read latency and scale dominate; writes are correctness-critical but low volume.

**Split.** Write side: a normalized Postgres model where commands (`PublishProduct`, `UpdatePrice`) run all validation and enforce invariants inside a transaction. Read side: denormalized projections shaped per query, an Elasticsearch index for search/faceting and a Redis/document view for the product detail page. One authoritative writer, many purpose-built readers.

**Why.** A single schema cannot be simultaneously great at transactional write integrity and at 500k/s faceted reads. Separating them lets the read stores be denormalized (no 8-table join per page) and scaled horizontally (ES/Redis replicas) without touching write-side correctness.

**Keeping projections in sync.** On commit, the write side emits an event (via a transactional outbox or Debezium CDC on the products table, so the event cannot be lost relative to the DB write). Projection consumers update ES and Redis. Each handler is idempotent and tracks the last processed version per document, so at-least-once redelivery and replays are safe. Multiple projections consume the same stream independently.

**Read staleness / read-your-writes.** Projections lag the write by tens of ms up to seconds under load. A merchant who edits a product and reloads must not see the old value. I return the new version from the write, and the edit screen reads its own write from the write model (or via versioned read that waits for the projection to reach that version) for a short window; anonymous shoppers tolerate the eventual-consistency lag fine.

**Rebuild.** Read models are derived, so a projection bug or a new read model is fixed by resetting the offset and replaying events from the outbox/CDC stream.

**Why not couple to event sourcing.** The write model here is fine as normalized CRUD emitting events via CDC. Full event sourcing would add an event store, folding, snapshots, and upcasting for no benefit, since the catalog has no strong audit/temporal requirement. That coupling is the classic wrong turn: paying double complexity by assuming CQRS requires event sourcing.

**Self-check rubric:**
- [ ] Justified the split from the read/write asymmetry (validation-heavy low writes vs huge reads)
- [ ] Built denormalized projections (ES/Redis) from write-side events
- [ ] Used a transactional outbox or CDC so events are not lost relative to the write
- [ ] Made projection handlers idempotent and replay-safe (per-doc version/offset)
- [ ] Handled read-your-writes explicitly (versioned read / read from write model)
- [ ] Explained why CQRS need not be coupled to event sourcing

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the CQRS read-side for Amazon-scale product search: a write model that ingests 100k catalog updates/sec from thousands of seller and inventory services, fanning out to multiple denormalized read models (full-text search, per-region price/availability, a recommendations feature store) while keeping each independently rebuildable and handling seller read-your-writes.

**Model answer (revealed on demand):**

Assumptions: 100k catalog mutations/sec (price, stock, attributes) from many upstream services; billions of reads/sec globally; several *different-shaped* read consumers. Consistency requirements differ per read model.

**Backbone.** All writes emit events to a partitioned Kafka topic (partition by product_id) via transactional outbox/CDC on each owning service, so the log is the single fan-out point. 100k/s over hundreds of partitions is comfortable and preserves per-product ordering.

**Multiple projections, each optimized.** (1) Search: a stream job denormalizes events into an Elasticsearch/OpenSearch index (title, attributes, category facets). (2) Price/availability: a per-region key-value store (DynamoDB global tables) so a product page reads the local region at single-digit ms. (3) Recommendations feature store: a rollup keyed for the model-serving layer. Each consumes the same event stream with its own consumer group and its own committed offset, so they scale and fail independently.

**Rebuildability.** Because each projection is idempotent and derived, any one can be rebuilt by resetting its consumer-group offset and replaying, without touching the others or the write side. That is how a search-schema change or a new read model ships safely at this scale.

**Consistency per model.** Search can tolerate seconds of lag (nobody notices a new facet a few seconds late). Price/availability is more sensitive: a stale in-stock flag causes oversells, so I keep that projection's lag tightly monitored (consumer-lag SLO) and let the checkout path re-validate stock against the authoritative write model at purchase time rather than trusting the read model. Seller read-your-writes: after a seller edits, their seller-console reads the write model (or a versioned read that waits for the projection version) so they see their change immediately, while shoppers ride the eventually-consistent projections.

**Trade:** many read stores multiply operational and storage cost and force explicit staleness handling per model, bought in exchange for each read path being independently shaped, scaled, and rebuildable, which is the only way one catalog serves search, pricing, and ML from one write stream at this scale.
