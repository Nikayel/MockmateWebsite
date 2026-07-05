> Module **sd-l2-m1** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l1-m4](./sd-l1-m4.md) · Next: [sd-l2-m2](./sd-l2-m2.md)

# L2 · Relational & Transactions

By the end of this module you can reason concretely about what ACID actually protects a system from, pick the right isolation level (or explicit lock) to kill a specific concurrency bug like an inventory oversell, and design the concurrency-control strategy for a hot, high-contention row so reads stay fast while writes contend.

### sd-l2-relational-acid: The Relational Model & ACID

- **id:** `sd-l2-relational-acid`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** acid, transactions, relational

#### Learn

ACID is four separate guarantees that people blur into one buzzword. The way to sound senior is to say what each one protects against with a concrete failure in mind.

**Atomicity** means a transaction is all-or-nothing. A money transfer is a debit on one row and a credit on another. If the process crashes, or a constraint fails, or the network drops between the two writes, atomicity guarantees the database rolls back to the state before the transaction started. Without it you get the classic bug: 100 dollars leaves account A and never arrives at account B because the second write failed. The invariant "total money is conserved" only holds if both writes commit together or neither does.

**Consistency** in ACID is not a free property the database grants you. It means the database moves from one valid state to another valid state as defined by your constraints and your application logic. The database enforces the part you declared: `CHECK (balance >= 0)`, `NOT NULL`, foreign keys, unique constraints. Everything else (a transfer must not create money) is an invariant your transaction plus isolation must uphold. Consistency is the outcome; atomicity, isolation, and your constraints are the mechanism.

**Isolation** means concurrent transactions do not corrupt each other. If two transfers touch the same account at once, isolation determines whether one sees the other's half-finished work. This is the hardest and most-probed guarantee, and the next lesson is entirely about its levels.

**Durability** means once the database returns "committed," that data survives a crash, a power loss, or a kill -9. The concrete mechanism: the change is written and `fsync`'d to the write-ahead log (WAL) on durable storage before the commit acknowledgment is sent. A commit that is only in a memory buffer is not durable; if the box loses power, it is gone. This is why a synchronous commit costs a disk `fsync` (often a few ms), and why "group commit" batches many transactions into one `fsync` to amortize it.

**Interview nuance:** When asked "is your write durable?" the strong answer names the WAL and `fsync`, and flags the tradeoff: `synchronous_commit = off` in Postgres returns faster but risks losing the last few hundred ms of commits on a crash. Money says on; a like counter can say off.

When is strict ACID worth its cost? When a violated invariant means lost money, double-charged users, or corrupted balances, pay for it: a single-primary relational database (Postgres, MySQL InnoDB) with real transactions. When the invariant is soft (a view count, a feed ordering) you can relax to BASE (basically available, soft state, eventual consistency) and buy horizontal scale and availability instead.

```
BEGIN
  UPDATE accounts SET balance = balance - 100 WHERE id = A;  -- debit
  UPDATE accounts SET balance = balance + 100 WHERE id = B;  -- credit
COMMIT   -- atomic: both or neither; durable: fsync'd WAL before ack
```

Recap: ACID is four concrete guarantees; atomicity makes debit+credit all-or-nothing, durability means fsync'd to the WAL not just memory, and consistency is your invariant enforced by constraints plus isolation, not a free lunch.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the schema and transaction boundaries for a bank money-transfer feature that must never lose or double-count funds under concurrent transfers.

**Think about:**
- Why must debit + credit be a single atomic transaction?
- What does durability actually mean at commit time?
- When is strict ACID worth the cost versus relaxing to BASE?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a single-currency internal ledger, thousands of transfers per second at peak, correctness is non-negotiable (this is money), and we accept single-primary write throughput because a bank ledger is a CP/consistency problem.

Schema: an `accounts` table with `(id PK, balance BIGINT NOT NULL, CHECK (balance >= 0))` storing money in integer minor units (cents) to avoid float rounding. Critically, a `ledger_entries` (or `transfers`) table that is the source of truth: `(id PK, transfer_id, account_id FK, amount BIGINT, direction, created_at)`. Balance is a cached projection of the immutable ledger, not the primary record. A `transfers` table carries an idempotency key with a `UNIQUE` constraint so a retried request cannot execute twice.

Transaction boundary: the debit and the credit happen inside one `BEGIN ... COMMIT`. Atomicity guarantees that a crash between them rolls back, so money is never created or destroyed. Concretely:

```
BEGIN;
  INSERT INTO transfers(idempotency_key, ...) ...;   -- unique key; dup => abort
  UPDATE accounts SET balance = balance - :amt WHERE id = :from AND balance >= :amt;
  -- if 0 rows updated, insufficient funds => ROLLBACK
  UPDATE accounts SET balance = balance + :amt WHERE id = :to;
  INSERT INTO ledger_entries(...);  -- debit and credit rows
COMMIT;
```

Guardrails: the `CHECK (balance >= 0)` and the conditional `WHERE balance >= :amt` prevent overdraft; the unique idempotency key prevents double-count on retry; foreign keys keep entries pointing at real accounts. Durability: on commit the database `fsync`s the WAL before acknowledging, so a confirmed transfer survives a crash. Set `synchronous_commit = on` here (money justifies the `fsync` cost) and consider synchronous replication so a failover does not lose an acknowledged transfer.

Is strict ACID worth it? Yes, unambiguously. A lost or doubled transfer is a real financial loss and a compliance problem; the cost is single-primary write throughput, which thousands of TPS on modern Postgres comfortably absorbs. If we later needed multi-region writes we would shard by account or move to a system like Spanner, not relax the invariant.

Common wrong turn: saying "use ACID" as a buzzword without naming the concrete invariant (money conserved), or storing balance as the source of truth with no immutable ledger, which makes reconciliation and audit impossible.

**Self-check rubric:**
- [ ] Did I wrap debit + credit in one transaction and explain what a crash between them would do?
- [ ] Did I name concrete constraints (CHECK, UNIQUE idempotency key, FK) rather than say "ACID"?
- [ ] Did I define durability as fsync'd to the WAL before commit ack, not in-memory?
- [ ] Did I treat an immutable ledger as source of truth with balance as a projection?
- [ ] Did I justify strict ACID over BASE by naming the invariant and the throughput cost?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the transaction and idempotency strategy for Stripe-style payment intents where the client retries aggressively on timeouts and network blips, at roughly 5,000 charge attempts per second, so no customer is ever charged twice for one intent.

**Model answer (revealed on demand):**

Assumptions: charges hit an external processor (a card network) that is slow (hundreds of ms) and non-transactional, clients retry on any timeout, and duplicate charges are the worst outcome. The problem is exactly-once effect over an at-least-once network.

Core design: every charge request carries a client-generated idempotency key. Persist it in an `idempotency_keys` table with a `UNIQUE` constraint on the key, plus the request fingerprint and the stored response. The very first thing the transaction does is `INSERT` that key; a duplicate insert fails the unique constraint, and we return the previously stored response instead of charging again. This turns "did my earlier request go through?" into a single indexed lookup.

The hard part is that the external card charge is not inside the database transaction, so a two-phase pattern is needed. Model the charge as a state machine: `requires_action -> processing -> succeeded/failed`, persisted atomically. The DB transaction records intent and flips state; a durable step (via an outbox row committed in the same transaction, later picked up by a worker) calls the processor. If we crash after charging the card but before recording success, recovery reconciles by querying the processor with the same idempotency key, which the processor itself also dedupes on. So idempotency is enforced at both layers.

Concurrency: two simultaneous retries of the same key race on the unique insert; exactly one wins and proceeds, the other blocks then reads the winner's result. `SELECT ... FOR UPDATE` on the intent row serializes state transitions so we never double-advance the machine.

At 5,000 TPS the idempotency table is write-heavy but each row is tiny and short-lived (TTL of 24 hours), so it stays index-resident. Durability stays strict (`synchronous_commit = on`): acknowledging a charge we did not durably record is a way to charge twice on recovery.

Common wrong turn: relying only on an application-level "check if exists then insert," which has a race window two retries slip through; the correctness has to come from the database `UNIQUE` constraint plus the processor's own idempotency, not an app-side read.

### sd-l2-isolation-levels: Isolation Levels & Read Anomalies

- **id:** `sd-l2-isolation-levels`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** isolation, concurrency, transactions

#### Learn

Isolation levels are a menu of how much concurrent transactions are allowed to see of each other's in-flight work. The ANSI SQL levels, weakest to strongest, are Read Uncommitted, Read Committed, Repeatable Read, and Serializable. Each level forbids more anomalies and costs more throughput.

The anomalies, in order of nastiness:

- **Dirty read:** you read another transaction's uncommitted write, which may roll back. Forbidden at Read Committed and above. Almost no real database defaults to allowing it.
- **Non-repeatable read:** you read a row, another transaction commits an update to it, you read it again in the same transaction and get a different value. Forbidden at Repeatable Read and above.
- **Phantom read:** you run a range query (`WHERE status = 'pending'`), another transaction inserts a new matching row, you re-run and a new row appears. Classically forbidden only at Serializable.
- **Lost update:** two transactions read the same value, both compute a new value from it, both write; one overwrites the other. `balance = balance + x` done as read-modify-write in the app is the usual victim.
- **Write skew:** two transactions each read an overlapping set, each individually keeps an invariant true, but their combined effect violates it. The textbook case: two doctors both on call, each checks "at least one other doctor is on call" (true), each takes themselves off shift, and now zero doctors are on call.

Defaults matter and differ: **Postgres defaults to Read Committed**, **MySQL InnoDB defaults to Repeatable Read**. So the same application code can behave differently on the two databases under load, which is a real production trap.

The crucial and most-probed subtlety: **snapshot isolation** (what Postgres calls Repeatable Read, and what many systems mean by "Repeatable Read") gives every transaction a consistent snapshot as of its start, which kills dirty, non-repeatable, and phantom reads for reads. But snapshot isolation still permits write skew, because each transaction validates against a stale snapshot that does not see the other's write. Only **true serializable** forbids write skew, implemented either by Serializable Snapshot Isolation (SSI, which detects dangerous read-write dependency cycles and aborts one transaction) or by strict two-phase locking (2PL). Serializable costs throughput: SSI adds abort-and-retry churn under contention, 2PL adds lock waits.

**Interview nuance:** If you claim "Repeatable Read fixes it," the interviewer will ask "which anomaly, and are you sure Repeatable Read covers it?" If the bug is write skew, Repeatable Read (snapshot) does not fix it and you need Serializable or an explicit lock. Naming the exact anomaly is the whole game.

How to actually fix a concurrency bug without paying for global Serializable:

- **`SELECT ... FOR UPDATE`**: take a pessimistic row lock on the rows you are about to modify, forcing concurrent transactions to queue. Fixes lost update and many oversell cases with surgical scope.
- **Optimistic version column**: add `version`, read it, and on write do `UPDATE ... WHERE version = :read_version`; if 0 rows change, someone beat you, so retry. Cheap under low contention.
- **Unique constraint**: sometimes the cleanest fix. If "one seat per booking" must hold, a unique index enforces it regardless of isolation level.

Recap: pick the isolation level (or explicit lock) by naming the exact anomaly; snapshot isolation stops dirty, non-repeatable, and phantom reads but still allows write skew, which only true Serializable or targeted locking prevents.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose an isolation level (or explicit locking) that prevents a checkout from overselling inventory under load, and justify the concurrency cost.

**Think about:**
- Which anomaly (lost update, write skew, phantom) is causing the oversell?
- What is the difference between snapshot isolation and true serializable?
- How do SELECT ... FOR UPDATE or a version column fix it?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a `products` table with a `stock` integer, high concurrent checkout on a few hot SKUs (a flash sale), Postgres at its Read Committed default, and correctness (never sell the 11th of 10 units) matters more than a little added latency.

Diagnose the anomaly first. The bug is a **lost update**: two checkouts both read `stock = 1`, both decide "in stock," both write `stock = 0`, and two orders ship for one unit. Under Read Committed each transaction reads the latest committed value but nothing stops the interleaving of read-check-write across two transactions. This is not a phantom (no new rows) and not classic write skew; it is the read-modify-write lost update.

Fix, in order of preference:

1. **Do the decrement atomically in the database, not the app.** Replace read-then-write with a single conditional update: `UPDATE products SET stock = stock - 1 WHERE id = :sku AND stock >= 1`. If it updates 0 rows, we are sold out and reject the checkout. This is atomic at the row level and eliminates the lost update at any isolation level, because there is no gap between read and write. This is the answer I lead with.

2. If checkout must reserve across multiple rows (stock plus a reservation row), take a pessimistic lock: `SELECT stock FROM products WHERE id = :sku FOR UPDATE`, then decrement, then commit. Concurrent checkouts on the same SKU serialize behind the row lock. Cost: on a hot SKU all buyers queue on one lock, so throughput on that key is bounded by how fast each transaction commits. Keep the transaction tiny to minimize hold time.

3. An optimistic `version` column with retry works and avoids holding locks, but under a flash sale contention is high, so the retry-abort rate is high and wastes work. I would prefer the conditional update or `FOR UPDATE` when contention is heavy, and reserve optimistic for low-contention cases.

I would not reach for global Serializable here. It would fix the bug but penalizes every unrelated transaction with SSI aborts or lock waits; the surgical row-level fix costs nothing outside the hot key.

Common wrong turn: assuming snapshot isolation (Repeatable Read) prevents this. It gives each transaction a stale snapshot showing `stock = 1`, both pass the check, and on Postgres the second write triggers a serialization failure only under Serializable, not under Repeatable Read for this shape. The reliable fix is the atomic conditional update or an explicit lock.

**Self-check rubric:**
- [ ] Did I name the specific anomaly (lost update) rather than say "concurrency bug"?
- [ ] Did I lead with the atomic conditional decrement (`WHERE stock >= 1`) as the primary fix?
- [ ] Did I explain why snapshot isolation alone does not reliably fix it?
- [ ] Did I quantify the cost of the pessimistic lock on a hot SKU (serialized throughput)?
- [ ] Did I justify not using global Serializable (broad penalty vs surgical fix)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the concurrency control for a Ticketmaster-style seat-reservation system during an onsale where 50,000 users race for 20,000 numbered seats in the first 30 seconds, so no seat is ever sold twice and the invariant "a seat has at most one active reservation" holds under write skew.

**Model answer (revealed on demand):**

Assumptions: individually numbered seats (not fungible stock), a reservation holds a seat for a few minutes before purchase, extreme burst contention on popular sections, and double-selling a seat is a hard failure.

The core invariant is per-seat uniqueness, so I enforce it at the strongest, cheapest layer: a `seats` table where the active reservation is guarded by a **unique constraint**. Model reservations so that at most one active row per seat can exist, for example a partial unique index `CREATE UNIQUE INDEX ON reservations (seat_id) WHERE status = 'held' OR status = 'sold'`. Now two concurrent reservations for the same seat both try to insert; the database guarantees exactly one succeeds and the other gets a unique-violation, which we translate to "seat just taken, pick another." This is immune to isolation level and immune to write skew, because uniqueness is a physical constraint, not a snapshot-dependent check.

Why not just Serializable? Because at 50,000 users hammering hot sections, Serializable Snapshot Isolation would generate a storm of serialization-failure aborts and retries, collapsing throughput exactly when load peaks. The unique-index approach lets non-conflicting seat reservations proceed fully in parallel and only serializes actual same-seat contenders, which is the minimum necessary serialization.

To keep the hot path fast I would front the database with a short-lived reservation in Redis (a `SETNX seat:{id}` lock with a TTL matching the hold window) to shed the majority of duplicate attempts before they ever hit Postgres, then confirm the durable reservation in Postgres where the unique constraint is the final authority. Redis is an optimization for load-shedding, not the source of truth; a Redis failure must never allow a double-sell, so the DB constraint remains the backstop.

Expiry handles abandoned holds: a background job (or a `held_until` timestamp checked at insert time) frees seats whose hold lapsed, and because release plus re-reservation both go through the same unique constraint, there is no window for a double-book.

Common wrong turn: treating seats as a fungible counter and decrementing stock, which loses the identity of which seat, or relying on application-level "check then insert," which write skew and raced retries slip through. Correctness must come from the unique index.

### sd-l2-mvcc-locking: Concurrency Control: MVCC, Locking, OCC

- **id:** `sd-l2-mvcc-locking`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** mvcc, locking, concurrency

#### Learn

Isolation levels are the contract; concurrency control is how the database actually delivers them. There are two big families, and modern databases lean on the first.

**Multi-Version Concurrency Control (MVCC)** is the reason "readers don't block writers and writers don't block readers" in Postgres, MySQL InnoDB, Oracle, and most serious OLTP engines. The idea: a write does not overwrite a row in place; it creates a new version of the row, tagged with the transaction that created it. Every transaction runs against a consistent snapshot defined by which versions were committed as of its start. So a long analytical read sees a frozen, coherent view while writers keep creating new versions alongside it, and neither waits on the other. This is what makes snapshot isolation cheap and is why read-heavy systems love it.

The cost of MVCC is that old row versions pile up and must be reclaimed. In Postgres this is **VACUUM** (and autovacuum); in InnoDB it is the purge thread cleaning the undo log. The dangerous failure mode is a **long-running transaction**: it holds an old snapshot, so the database cannot reclaim any version newer than that snapshot's start, and dead tuples accumulate as **bloat**. A single forgotten transaction (an idle-in-transaction connection, a stuck analytics query) can bloat a table many times its live size and tank performance. This is the operational tax of MVCC, and interviewers love it.

**Interview nuance:** "What breaks if a transaction stays open for an hour?" The strong answer: it pins the vacuum horizon, so dead tuples cannot be reclaimed, the table and its indexes bloat, and sequential scans slow down. Mitigation: `idle_in_transaction_session_timeout`, keep transactions short, and monitor the oldest transaction age.

The second family is **locking-based / pessimistic concurrency**, classically **two-phase locking (2PL)**: acquire shared (read) or exclusive (write) locks, hold them, and release only at commit. It is correct but writers block conflicting readers and each other, so throughput drops under contention, and it introduces **deadlocks**: transaction 1 holds lock A and wants B, transaction 2 holds B and wants A. Databases handle this by detecting the cycle and aborting one victim, so your app must catch the deadlock error and retry. You reduce deadlocks by acquiring locks in a consistent order (always lock the lower account id first) and keeping transactions short.

**Optimistic concurrency control (OCC)** assumes conflicts are rare: do not lock, just read a `version`, and at commit check `WHERE version = :read_version`; if it changed, abort and retry. OCC wins when contention is genuinely low, because it skips all lock overhead. It loses badly under high contention, because the abort-and-retry rate explodes and you burn CPU redoing work. So the rule is: **optimistic under low contention, pessimistic under high contention.**

For a hot key specifically (a viral post's like counter taking thousands of increments per second on one row), the wrong move is heavy pessimistic locking, which serializes every writer behind one lock and caps throughput at one-at-a-time. The right moves: **shard the counter** into N sub-rows (`like_count_shard_0..N`), increment a random shard, and sum on read, which spreads contention N-fold; or aggregate increments in memory/Redis and flush periodically; or use an atomic in-database increment so each write is a single short operation rather than a read-modify-write holding a lock.

```
MVCC read:  txn snapshot ──► sees v2 (committed), ignores v3 (in-flight) ── no wait
Hot counter: 1 row, all writers ── LOCK ──► serialized (bad)
             N shards, random pick ──────► ~N-way parallel, sum on read (good)
```

Recap: MVCC makes readers and writers not block each other by versioning rows, at the cost of vacuum and bloat from long transactions; choose optimistic control under low contention and pessimistic under high, and for a hot key shard the counter instead of serializing writers behind one lock.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the concurrency-control strategy for a high-contention counter/like feature so reads stay fast under heavy writes.

**Think about:**
- How does MVCC let readers see a snapshot without blocking writers?
- When do you choose optimistic (version/CAS) over pessimistic locking?
- What is the operational cost of MVCC (bloat, vacuum, long transactions)?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a social product where a viral post can take 5,000 likes per second concentrated on one row, reads of the like count are far more frequent than writes and can tolerate being a second or two stale, and exact-to-the-like precision is not required (off by a few for a second is fine).

The naive design (`UPDATE posts SET likes = likes + 1 WHERE id = :post`) fails on a hot row: under MVCC every increment creates a new row version, and although MVCC keeps readers non-blocking, the writers all contend on the same row's write lock and serialize, so throughput caps at how fast one transaction commits (a few thousand per second at best) and the row bloats with dead versions that vacuum must chase.

Design: **shard the counter.** Store the count as N rows (say 50), `post_like_shards(post_id, shard_id, count)`. Each like increments a randomly chosen shard: `UPDATE ... WHERE post_id = :p AND shard_id = :random`. This spreads 5,000 writes/sec across 50 rows, roughly 100/sec each, which is trivial and cuts contention 50-fold. Reads compute `SELECT SUM(count) ... WHERE post_id = :p`. Because reads are hot, cache that sum in Redis with a short TTL (1 to 2 seconds) or maintain a materialized total, so the common read is a single key lookup and the SUM runs only on cache miss.

For the increment itself I use the **atomic in-database increment** (single-statement `count = count + 1`), not app-side read-modify-write, so there is no lost update and no need for a held lock. I would not use pessimistic `SELECT ... FOR UPDATE` on the counter: it serializes writers, which is exactly the failure I am avoiding. Optimistic CAS with a version column also fails here, because under heavy contention its retry-abort rate explodes; OCC is for low contention.

MVCC operational care: sharding also relieves bloat because updates spread across rows, but I still keep autovacuum aggressive on these tables and monitor for long-running transactions that could pin the vacuum horizon and let dead tuples accumulate.

At even higher scale I would move the write path fully off the transactional store: buffer increments in Redis (`INCR post:likes:{id}`) and flush aggregated deltas to Postgres every few seconds, trading a small staleness and durability window for near-unlimited write throughput.

Common wrong turn: reaching for pessimistic locking on the hot key to be safe, which serializes all writers behind one lock and is the worst possible choice for a contended counter.

**Self-check rubric:**
- [ ] Did I explain why a single-row increment serializes writers despite MVCC keeping reads non-blocking?
- [ ] Did I shard the counter (or buffer in Redis) to spread contention, with a numeric contention reduction?
- [ ] Did I make reads fast via cache/materialized sum, and note the staleness tradeoff?
- [ ] Did I correctly reject pessimistic locking and OCC for this high-contention case?
- [ ] Did I mention the MVCC operational cost (vacuum/bloat, long transactions)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the concurrency control for a YouTube-scale view counter where a trending video takes 100,000 view events per second globally across many regions, the displayed count can lag real time by seconds, but the eventual total must be accurate and durable enough to drive creator payouts.

**Model answer (revealed on demand):**

Assumptions: writes vastly exceed reads for a given video (millions of viewers, one display read per page), a globally distributed audience, the shown count may lag by seconds, but the settled total feeds monetization so it must eventually be exact and durable. A single relational row cannot absorb 100,000 writes/sec; even a sharded single-database counter strains at that rate.

Design as a streaming pipeline, not a transactional counter. View events are produced to **Kafka** (or Kinesis), partitioned by video id so all events for one video land in ordered partitions. Because payouts need accuracy, treat the Kafka log as the durable source of truth and process it exactly-once (idempotent consumers keyed by event id, or Kafka transactions) so a consumer crash does not double-count or drop views.

Two read paths, two consistency tiers. For the **live displayed count**, a stream processor (Kafka Streams or Flink) maintains a running per-video tally and pushes it to a fast store (Redis, `INCRBY` on aggregated windows) that the UI reads with single-digit-ms latency; this is allowed to be seconds stale and slightly approximate. For the **billing-grade total**, a batch or exactly-once streaming job periodically aggregates the raw event log into a durable warehouse table (per video, per time window) that is the number of record for payouts. Reconciliation compares the two and heals the fast tier from the authoritative one.

Regionally, each region writes to its local Kafka cluster to keep write latency low, and cross-region aggregation rolls regional partials into the global total, avoiding a single global write bottleneck. This is a deliberate move from strong single-row consistency to eventual consistency, justified because the invariant (exact eventual total) is preserved by the durable log while the real-time display trades precision for throughput.

Anti-fraud dedup (bot views, replays) also lives in the stream layer, keyed by viewer/session, before events count toward payout.

Common wrong turn: trying to keep an ACID row counter authoritative at 100,000 writes/sec, which no single-primary relational row survives; the scale forces the counter out of the transactional database into a durable event log with tiered consistency, while still preserving eventual accuracy for money.
