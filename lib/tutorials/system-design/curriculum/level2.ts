/**
 * System Design — Level 2: Data Storage & Modeling.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l2-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L2. 17 lessons across 5
 * modules (sd-l2-m1..m5). Same lesson shape as level0.ts/level1.ts: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const relationalAcidTeach = `
## Four guarantees, not one buzzword

ACID is four separate guarantees that people blur into one buzzword. The way to sound senior is to
say what each one protects against with a concrete failure in mind.

**Atomicity** means a transaction is all-or-nothing. A money transfer is a debit on one row and a
credit on another. If the process crashes, or a constraint fails, or the network drops between the
two writes, atomicity guarantees the database rolls back to the state before the transaction started.
Without it you get the classic bug: 100 dollars leaves account A and never arrives at account B
because the second write failed. The invariant "total money is conserved" only holds if both writes
commit together or neither does.

**Consistency** in ACID is not a free property the database grants you. It means the database moves
from one valid state to another valid state as defined by your constraints and your application
logic. The database enforces the part you declared: \`CHECK (balance >= 0)\`, \`NOT NULL\`, foreign
keys, unique constraints. Everything else (a transfer must not create money) is an invariant your
transaction plus isolation must uphold. Consistency is the outcome; atomicity, isolation, and your
constraints are the mechanism.

**Isolation** means concurrent transactions do not corrupt each other. If two transfers touch the
same account at once, isolation determines whether one sees the other's half-finished work. This is
the hardest and most-probed guarantee, and the next lesson is entirely about its levels.

**Durability** means once the database returns "committed," that data survives a crash, a power
loss, or a kill -9. The concrete mechanism: the change is written and \`fsync\`'d to the write-ahead
log (WAL) on durable storage before the commit acknowledgment is sent. A commit that is only in a
memory buffer is not durable; if the box loses power, it is gone. This is why a synchronous commit
costs a disk \`fsync\` (often a few ms), and why "group commit" batches many transactions into one
\`fsync\` to amortize it.

**Interview nuance:** When asked "is your write durable?" the strong answer names the WAL and
\`fsync\`, and flags the tradeoff: \`synchronous_commit = off\` in Postgres returns faster but risks
losing the last few hundred ms of commits on a crash. Money says on; a like counter can say off.

### When is strict ACID worth its cost?

When a violated invariant means lost money, double-charged users, or corrupted balances, pay for it:
a single-primary relational database (Postgres, MySQL InnoDB) with real transactions. When the
invariant is soft (a view count, a feed ordering) you can relax to BASE (basically available, soft
state, eventual consistency) and buy horizontal scale and availability instead.

\`\`\`
BEGIN
  UPDATE accounts SET balance = balance - 100 WHERE id = A;  -- debit
  UPDATE accounts SET balance = balance + 100 WHERE id = B;  -- credit
COMMIT   -- atomic: both or neither; durable: fsync'd WAL before ack
\`\`\`

Recap: ACID is four concrete guarantees; atomicity makes debit+credit all-or-nothing, durability
means fsync'd to the WAL not just memory, and consistency is your invariant enforced by constraints
plus isolation, not a free lunch.
`.trim()

const isolationLevelsTeach = `
## A menu of how much transactions see of each other

Isolation levels are a menu of how much concurrent transactions are allowed to see of each other's
in-flight work. The ANSI SQL levels, weakest to strongest, are Read Uncommitted, Read Committed,
Repeatable Read, and Serializable. Each level forbids more anomalies and costs more throughput.

### The anomalies, in order of nastiness

- **Dirty read:** you read another transaction's uncommitted write, which may roll back. Forbidden at
  Read Committed and above. Almost no real database defaults to allowing it.
- **Non-repeatable read:** you read a row, another transaction commits an update to it, you read it
  again in the same transaction and get a different value. Forbidden at Repeatable Read and above.
- **Phantom read:** you run a range query (\`WHERE status = 'pending'\`), another transaction inserts
  a new matching row, you re-run and a new row appears. Classically forbidden only at Serializable.
- **Lost update:** two transactions read the same value, both compute a new value from it, both
  write; one overwrites the other. \`balance = balance + x\` done as read-modify-write in the app is
  the usual victim.
- **Write skew:** two transactions each read an overlapping set, each individually keeps an invariant
  true, but their combined effect violates it. The textbook case: two doctors both on call, each
  checks "at least one other doctor is on call" (true), each takes themselves off shift, and now zero
  doctors are on call.

Defaults matter and differ: **Postgres defaults to Read Committed**, **MySQL InnoDB defaults to
Repeatable Read**. So the same application code can behave differently on the two databases under
load, which is a real production trap.

### The most-probed subtlety: snapshot isolation and write skew

**Snapshot isolation** (what Postgres calls Repeatable Read, and what many systems mean by
"Repeatable Read") gives every transaction a consistent snapshot as of its start, which kills dirty,
non-repeatable, and phantom reads for reads. But snapshot isolation still permits write skew, because
each transaction validates against a stale snapshot that does not see the other's write. Only **true
serializable** forbids write skew, implemented either by Serializable Snapshot Isolation (SSI, which
detects dangerous read-write dependency cycles and aborts one transaction) or by strict two-phase
locking (2PL). Serializable costs throughput: SSI adds abort-and-retry churn under contention, 2PL
adds lock waits.

**Interview nuance:** If you claim "Repeatable Read fixes it," the interviewer will ask "which
anomaly, and are you sure Repeatable Read covers it?" If the bug is write skew, Repeatable Read
(snapshot) does not fix it and you need Serializable or an explicit lock. Naming the exact anomaly is
the whole game.

### Fixing a concurrency bug without global Serializable

- **\`SELECT ... FOR UPDATE\`**: take a pessimistic row lock on the rows you are about to modify,
  forcing concurrent transactions to queue. Fixes lost update and many oversell cases with surgical
  scope.
- **Optimistic version column**: add \`version\`, read it, and on write do
  \`UPDATE ... WHERE version = :read_version\`; if 0 rows change, someone beat you, so retry. Cheap
  under low contention.
- **Unique constraint**: sometimes the cleanest fix. If "one seat per booking" must hold, a unique
  index enforces it regardless of isolation level.

Recap: pick the isolation level (or explicit lock) by naming the exact anomaly; snapshot isolation
stops dirty, non-repeatable, and phantom reads but still allows write skew, which only true
Serializable or targeted locking prevents.
`.trim()

const mvccLockingTeach = `
## The contract vs the machinery

Isolation levels are the contract; concurrency control is how the database actually delivers them.
There are two big families, and modern databases lean on the first.

### MVCC: readers don't block writers

**Multi-Version Concurrency Control (MVCC)** is the reason "readers don't block writers and writers
don't block readers" in Postgres, MySQL InnoDB, Oracle, and most serious OLTP engines. The idea: a
write does not overwrite a row in place; it creates a new version of the row, tagged with the
transaction that created it. Every transaction runs against a consistent snapshot defined by which
versions were committed as of its start. So a long analytical read sees a frozen, coherent view while
writers keep creating new versions alongside it, and neither waits on the other. This is what makes
snapshot isolation cheap and is why read-heavy systems love it.

The cost of MVCC is that old row versions pile up and must be reclaimed. In Postgres this is
**VACUUM** (and autovacuum); in InnoDB it is the purge thread cleaning the undo log. The dangerous
failure mode is a **long-running transaction**: it holds an old snapshot, so the database cannot
reclaim any version newer than that snapshot's start, and dead tuples accumulate as **bloat**. A
single forgotten transaction (an idle-in-transaction connection, a stuck analytics query) can bloat a
table many times its live size and tank performance. This is the operational tax of MVCC, and
interviewers love it.

**Interview nuance:** "What breaks if a transaction stays open for an hour?" The strong answer: it
pins the vacuum horizon, so dead tuples cannot be reclaimed, the table and its indexes bloat, and
sequential scans slow down. Mitigation: \`idle_in_transaction_session_timeout\`, keep transactions
short, and monitor the oldest transaction age.

### Locking and optimistic control

The second family is **locking-based / pessimistic concurrency**, classically **two-phase locking
(2PL)**: acquire shared (read) or exclusive (write) locks, hold them, and release only at commit. It
is correct but writers block conflicting readers and each other, so throughput drops under
contention, and it introduces **deadlocks**: transaction 1 holds lock A and wants B, transaction 2
holds B and wants A. Databases handle this by detecting the cycle and aborting one victim, so your
app must catch the deadlock error and retry. You reduce deadlocks by acquiring locks in a consistent
order (always lock the lower account id first) and keeping transactions short.

**Optimistic concurrency control (OCC)** assumes conflicts are rare: do not lock, just read a
\`version\`, and at commit check \`WHERE version = :read_version\`; if it changed, abort and retry.
OCC wins when contention is genuinely low, because it skips all lock overhead. It loses badly under
high contention, because the abort-and-retry rate explodes and you burn CPU redoing work. So the
rule is: **optimistic under low contention, pessimistic under high contention.**

### The hot key

For a hot key specifically (a viral post's like counter taking thousands of increments per second on
one row), the wrong move is heavy pessimistic locking, which serializes every writer behind one lock
and caps throughput at one-at-a-time. The right moves: **shard the counter** into N sub-rows
(\`like_count_shard_0..N\`), increment a random shard, and sum on read, which spreads contention
N-fold; or aggregate increments in memory/Redis and flush periodically; or use an atomic in-database
increment so each write is a single short operation rather than a read-modify-write holding a lock.

\`\`\`
MVCC read:  txn snapshot --> sees v2 (committed), ignores v3 (in-flight) -- no wait
Hot counter: 1 row, all writers -- LOCK --> serialized (bad)
             N shards, random pick ------> ~N-way parallel, sum on read (good)
\`\`\`

Recap: MVCC makes readers and writers not block each other by versioning rows, at the cost of vacuum
and bloat from long transactions; choose optimistic control under low contention and pessimistic
under high, and for a hot key shard the counter instead of serializing writers behind one lock.
`.trim()

const btreeVsLsmTeach = `
## Two engine families, one read-versus-write trade

Every durable database is built on one of two storage engine families, and the choice is
fundamentally a read-versus-write tradeoff. Knowing which one sits under Postgres versus Cassandra is
the difference between guessing at a database and reasoning about one.

### B+tree: in-place pages, fast reads and ranges

A **B+tree** (Postgres, MySQL/InnoDB, most SQL engines) keeps data in fixed-size pages, typically 8KB
or 16KB, arranged as a balanced tree with all rows in the leaf pages. Updates happen **in place**: to
change a row you find its leaf page, load it into memory, modify it, and eventually write the whole
page back. This gives excellent point reads (a lookup is 3 to 4 page reads for billions of rows) and,
crucially, excellent **range scans**, because leaves are linked in sorted order, so "created_at
between X and Y" is a sequential walk. The cost is **write amplification**: changing one 200-byte row
can force an 8KB page write, plus a write-ahead log record, and page splits when a page fills. Random
in-place writes are also unfriendly to SSDs, which prefer large sequential erases.

### LSM-tree: append-only writes, compacted reads

An **LSM-tree** (Cassandra, RocksDB, ScyllaDB, LevelDB) inverts this. Writes go to an in-memory
sorted structure, the **memtable**, plus a sequential commit log. When the memtable fills it is
flushed to disk as an immutable, sorted **SSTable**. Writes are therefore append-only and sequential,
so throughput is very high and SSD-friendly. The catch is reads: a key might live in the memtable or
in any of several SSTables, so a read may have to check many files. Two mechanisms rescue read
latency. **Bloom filters** (a small probabilistic set per SSTable) let a read skip an SSTable that
definitely does not contain the key. **Compaction** merges SSTables in the background, discarding
overwritten and deleted (tombstoned) rows, which bounds how many files a read must touch.

### The three amplifications

- **Write amplification:** bytes written to disk per byte of logical write. B-tree pays it via
  full-page writes and the WAL. LSM pays it via compaction rewriting the same data across levels.
- **Read amplification:** disk reads per logical read. LSM is worse (multiple SSTables plus bloom
  checks); B-tree is a clean 3 to 4 pages.
- **Space amplification:** disk used per byte of live data. LSM can hold stale copies until
  compaction reclaims them; B-tree wastes space via partially-full pages and fragmentation.

**Interview nuance:** compaction is the LSM landmine. It runs in the background and competes for disk
I/O and CPU, so under sustained write pressure you get **compaction stalls** and latency spikes right
when you are busiest. "Leveled" compaction (RocksDB default) gives better read and space
amplification but more write amplification; "size-tiered" (Cassandra default) is the reverse. Naming
this tradeoff signals you have actually operated one.

\`\`\`
B+TREE (read/update-heavy OLTP)     LSM-TREE (write-heavy ingest)
  in-place page updates               memtable (RAM) --> flush
  sorted leaves, fast range scan          |
  writes = random + WAL               immutable SSTables on disk
  amp: low read, higher write             |  bloom filter per SSTable
                                      compaction merges in background
                                      amp: high write, higher read
\`\`\`

Recap: B-tree updates pages in place for fast reads and range scans at the cost of write
amplification; LSM appends to a memtable then compacts immutable SSTables for high write throughput,
using bloom filters and compaction to keep reads sane.
`.trim()

export const systemDesignLevel2: DesignLevel = {
  id: 2,
  slug: "data-storage",
  title: "Level 2 — Data Storage & Modeling",
  tagline: "Relational vs NoSQL, storage engines, indexing, and modeling for access patterns.",
  estimatedHours: 8,
  modules: [
    {
      id: "sd-l2-m1",
      title: "Relational & Transactions",
      description:
        "Reason concretely about what ACID protects, pick the isolation level or explicit lock that kills a specific concurrency bug, and design concurrency control for hot, high-contention rows.",
      lessons: [
        {
          id: "sd-l2-relational-acid",
          title: "The Relational Model & ACID",
          summary:
            "Name what each ACID guarantee protects against: atomic debit+credit, fsync'd WAL durability, and consistency as your constraint-enforced invariant.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["acid", "transactions", "relational"],
          teach: {
            markdown: relationalAcidTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-relational-acid-apply",
            prompt:
              "Design the schema and transaction boundaries for a bank money-transfer feature that must never lose or double-count funds under concurrent transfers.",
            thinkAbout: [
              "Why must debit + credit be a single atomic transaction?",
              "What does durability actually mean at commit time?",
              "When is strict ACID worth the cost versus relaxing to BASE?",
            ],
            modelAnswerOutline: [
              "Assumptions: a single-currency internal ledger, thousands of transfers per second at peak, correctness non-negotiable (this is money), and single-primary write throughput accepted because a bank ledger is a CP/consistency problem.",
              "**Schema:** an `accounts` table `(id PK, balance BIGINT NOT NULL, CHECK (balance >= 0))` storing money in integer minor units (cents) to avoid float rounding. Critically, a `ledger_entries` table as the source of truth: `(id PK, transfer_id, account_id FK, amount BIGINT, direction, created_at)`. Balance is a cached projection of the immutable ledger, not the primary record. A `transfers` table carries an idempotency key with a UNIQUE constraint so a retried request cannot execute twice.",
              "**Transaction boundary:** the debit and the credit happen inside one `BEGIN ... COMMIT`: insert the transfer row (unique idempotency key, duplicate aborts), `UPDATE accounts SET balance = balance - :amt WHERE id = :from AND balance >= :amt` (0 rows updated means insufficient funds, roll back), credit the destination, insert the debit and credit ledger rows, commit. Atomicity guarantees a crash between the writes rolls back, so money is never created or destroyed.",
              "**Guardrails:** `CHECK (balance >= 0)` and the conditional `WHERE balance >= :amt` prevent overdraft; the unique idempotency key prevents double-count on retry; foreign keys keep entries pointing at real accounts.",
              "**Durability:** on commit the database fsyncs the WAL before acknowledging, so a confirmed transfer survives a crash. Set `synchronous_commit = on` (money justifies the fsync cost) and consider synchronous replication so a failover does not lose an acknowledged transfer.",
              "**Strict ACID is worth it here, unambiguously:** a lost or doubled transfer is a financial loss and a compliance problem; the cost is single-primary write throughput, which thousands of TPS on modern Postgres comfortably absorbs. If multi-region writes were ever needed, shard by account or move to Spanner rather than relaxing the invariant.",
              "Common wrong turn: saying 'use ACID' as a buzzword without naming the concrete invariant (money conserved), or storing balance as the source of truth with no immutable ledger, which makes reconciliation and audit impossible.",
            ],
          },
          practice: {
            id: "sd-l2-relational-acid-practice",
            prompt:
              "Design the transaction and idempotency strategy for Stripe-style payment intents where the client retries aggressively on timeouts and network blips, at roughly 5,000 charge attempts per second, so no customer is ever charged twice for one intent.",
            thinkAbout: [
              "Why can the external card charge not live inside your database transaction?",
              "What database mechanism (not app-side logic) makes two concurrent retries converge on one charge?",
              "How does recovery reconcile a crash that happened after charging but before recording success?",
            ],
            modelAnswerOutline: [
              "Assumptions: charges hit an external processor that is slow (hundreds of ms) and non-transactional, clients retry on any timeout, duplicate charges are the worst outcome. The problem is exactly-once effect over an at-least-once network.",
              "**Core design:** every charge request carries a client-generated idempotency key, persisted in an `idempotency_keys` table with a UNIQUE constraint, plus the request fingerprint and the stored response. The first thing the transaction does is INSERT that key; a duplicate insert fails the unique constraint and returns the previously stored response instead of charging again.",
              "**The hard part: the external charge is outside the DB transaction,** so use a two-phase pattern. Model the charge as a state machine (`requires_action -> processing -> succeeded/failed`) persisted atomically. The DB transaction records intent and flips state; a durable step (an outbox row committed in the same transaction, picked up by a worker) calls the processor. If the process crashes after charging but before recording success, recovery reconciles by querying the processor with the same idempotency key, which the processor also dedupes on. Idempotency is enforced at both layers.",
              "**Concurrency:** two simultaneous retries of the same key race on the unique insert; exactly one wins and proceeds, the other blocks then reads the winner's result. `SELECT ... FOR UPDATE` on the intent row serializes state transitions so the machine never double-advances.",
              "**At 5,000 TPS:** the idempotency table is write-heavy but rows are tiny and short-lived (24h TTL), so it stays index-resident. Durability stays strict (`synchronous_commit = on`): acknowledging a charge that was not durably recorded is a way to charge twice on recovery.",
              "Common wrong turn: relying on an application-level 'check if exists then insert,' which has a race window two retries slip through; correctness has to come from the database UNIQUE constraint plus the processor's own idempotency, not an app-side read.",
            ],
          },
        },
        {
          id: "sd-l2-isolation-levels",
          title: "Isolation Levels & Read Anomalies",
          summary:
            "Diagnose the exact anomaly (dirty read, lost update, write skew) and fix it surgically; snapshot isolation still allows write skew, which only Serializable or a lock prevents.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["isolation", "concurrency", "transactions"],
          teach: {
            markdown: isolationLevelsTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l2-isolation-levels-apply",
            prompt:
              "Choose an isolation level (or explicit locking) that prevents a checkout from overselling inventory under load, and justify the concurrency cost.",
            thinkAbout: [
              "Which anomaly (lost update, write skew, phantom) is causing the oversell?",
              "What is the difference between snapshot isolation and true serializable?",
              "How do SELECT ... FOR UPDATE or a version column fix it?",
            ],
            modelAnswerOutline: [
              "Assumptions: a `products` table with a `stock` integer, high concurrent checkout on a few hot SKUs (a flash sale), Postgres at its Read Committed default, and correctness (never sell the 11th of 10 units) matters more than a little added latency.",
              "**Diagnose the anomaly first: this is a lost update.** Two checkouts both read `stock = 1`, both decide 'in stock,' both write `stock = 0`, and two orders ship for one unit. Under Read Committed nothing stops the interleaving of read-check-write across two transactions. Not a phantom (no new rows), not classic write skew: the read-modify-write lost update.",
              "**Lead with the atomic conditional decrement in the database, not the app:** `UPDATE products SET stock = stock - 1 WHERE id = :sku AND stock >= 1`. If it updates 0 rows, sold out, reject the checkout. Atomic at the row level, eliminates the lost update at any isolation level, because there is no gap between read and write.",
              "**If checkout must reserve across multiple rows,** take a pessimistic lock: `SELECT stock FROM products WHERE id = :sku FOR UPDATE`, then decrement, then commit. Concurrent checkouts on the same SKU serialize behind the row lock. Cost: on a hot SKU all buyers queue on one lock, so throughput on that key is bounded by commit speed; keep the transaction tiny.",
              "**Optimistic version-column retry** works and avoids holding locks, but under a flash sale contention is high, so the retry-abort rate is high and wastes work. Prefer the conditional update or FOR UPDATE under heavy contention; reserve optimistic for low-contention cases.",
              "**Do not reach for global Serializable:** it would fix the bug but penalizes every unrelated transaction with SSI aborts or lock waits; the surgical row-level fix costs nothing outside the hot key.",
              "Common wrong turn: assuming snapshot isolation (Repeatable Read) prevents this. It gives each transaction a stale snapshot showing `stock = 1`, both pass the check, and the second write triggers a serialization failure only under Serializable, not Repeatable Read, for this shape. The reliable fix is the atomic conditional update or an explicit lock.",
            ],
          },
          practice: {
            id: "sd-l2-isolation-levels-practice",
            prompt:
              "Design the concurrency control for a Ticketmaster-style seat-reservation system during an onsale where 50,000 users race for 20,000 numbered seats in the first 30 seconds, so no seat is ever sold twice and the invariant 'a seat has at most one active reservation' holds under write skew.",
            thinkAbout: [
              "What is the strongest, cheapest layer that can enforce per-seat uniqueness regardless of isolation level?",
              "Why would global Serializable collapse throughput exactly at peak load?",
              "What role can Redis play without ever becoming the source of truth?",
            ],
            modelAnswerOutline: [
              "Assumptions: individually numbered seats (not fungible stock), a reservation holds a seat for a few minutes before purchase, extreme burst contention on popular sections, and double-selling a seat is a hard failure.",
              "**Enforce the invariant with a unique constraint, the strongest and cheapest layer:** model reservations so at most one active row per seat can exist, e.g. a partial unique index `CREATE UNIQUE INDEX ON reservations (seat_id) WHERE status = 'held' OR status = 'sold'`. Two concurrent reservations for the same seat both try to insert; the database guarantees exactly one succeeds and the other gets a unique-violation, translated to 'seat just taken, pick another.' Immune to isolation level and to write skew, because uniqueness is a physical constraint, not a snapshot-dependent check.",
              "**Why not global Serializable:** at 50,000 users hammering hot sections, SSI would generate a storm of serialization-failure aborts and retries, collapsing throughput exactly when load peaks. The unique-index approach lets non-conflicting seat reservations proceed fully in parallel and only serializes actual same-seat contenders: the minimum necessary serialization.",
              "**Load-shed with Redis in front:** a short-lived `SETNX seat:{id}` lock with a TTL matching the hold window sheds the majority of duplicate attempts before they hit Postgres, then the durable reservation is confirmed in Postgres where the unique constraint is the final authority. Redis is an optimization, not the source of truth; a Redis failure must never allow a double-sell, so the DB constraint remains the backstop.",
              "**Expiry:** a background job (or a `held_until` timestamp checked at insert time) frees seats whose hold lapsed; because release plus re-reservation both go through the same unique constraint, there is no window for a double-book.",
              "Common wrong turn: treating seats as a fungible counter and decrementing stock (loses which seat), or relying on application-level 'check then insert,' which write skew and raced retries slip through. Correctness must come from the unique index.",
            ],
          },
        },
        {
          id: "sd-l2-mvcc-locking",
          title: "Concurrency Control: MVCC, Locking, OCC",
          summary:
            "MVCC versions rows so readers and writers never block each other (at vacuum/bloat cost); go optimistic under low contention, pessimistic under high, and shard hot counters.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["mvcc", "locking", "concurrency"],
          teach: {
            markdown: mvccLockingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-mvcc-locking-apply",
            prompt:
              "Design the concurrency-control strategy for a high-contention counter/like feature so reads stay fast under heavy writes.",
            thinkAbout: [
              "How does MVCC let readers see a snapshot without blocking writers?",
              "When do you choose optimistic (version/CAS) over pessimistic locking?",
              "What is the operational cost of MVCC (bloat, vacuum, long transactions)?",
            ],
            modelAnswerOutline: [
              "Assumptions: a social product where a viral post can take 5,000 likes per second concentrated on one row; reads of the count far exceed writes and can tolerate a second or two of staleness; exact-to-the-like precision is not required.",
              "**Why the naive design fails:** `UPDATE posts SET likes = likes + 1` on a hot row means every increment creates a new row version, and although MVCC keeps readers non-blocking, the writers all contend on the same row's write lock and serialize, capping throughput at how fast one transaction commits, while the row bloats with dead versions vacuum must chase.",
              "**Design: shard the counter.** Store the count as N rows (say 50), `post_like_shards(post_id, shard_id, count)`. Each like increments a randomly chosen shard: 5,000 writes/sec spread across 50 rows is ~100/sec each, trivial, and cuts contention 50-fold. Reads compute `SELECT SUM(count)`; because reads are hot, cache that sum in Redis with a 1-2s TTL or maintain a materialized total so the common read is a single key lookup.",
              "**The increment itself is the atomic in-database form** (single-statement `count = count + 1`), not app-side read-modify-write, so there is no lost update and no held lock. Reject pessimistic `SELECT ... FOR UPDATE` on the counter (serializes writers, exactly the failure being avoided) and reject optimistic CAS (under heavy contention its retry-abort rate explodes; OCC is for low contention).",
              "**MVCC operational care:** sharding also relieves bloat because updates spread across rows, but keep autovacuum aggressive on these tables and monitor for long-running transactions that pin the vacuum horizon.",
              "**At even higher scale,** move the write path off the transactional store: buffer increments in Redis (`INCR post:likes:{id}`) and flush aggregated deltas to Postgres every few seconds, trading a small staleness and durability window for near-unlimited write throughput.",
              "Common wrong turn: reaching for pessimistic locking on the hot key to be safe, which serializes all writers behind one lock and is the worst possible choice for a contended counter.",
            ],
          },
          practice: {
            id: "sd-l2-mvcc-locking-practice",
            prompt:
              "Design the concurrency control for a YouTube-scale view counter where a trending video takes 100,000 view events per second globally across many regions, the displayed count can lag real time by seconds, but the eventual total must be accurate and durable enough to drive creator payouts.",
            thinkAbout: [
              "Can any single-primary relational row absorb 100,000 writes per second, even sharded?",
              "How do you serve a fast approximate count and a billing-grade exact total from the same events?",
              "Where does deduplication (bots, replays) belong in the pipeline?",
            ],
            modelAnswerOutline: [
              "Assumptions: writes vastly exceed reads for a given video, a globally distributed audience, the shown count may lag by seconds, but the settled total feeds monetization so it must eventually be exact and durable. A single relational row cannot absorb 100,000 writes/sec; even a sharded single-database counter strains.",
              "**Design as a streaming pipeline, not a transactional counter.** View events are produced to Kafka (or Kinesis), partitioned by video id so all events for one video land in ordered partitions. Because payouts need accuracy, treat the Kafka log as the durable source of truth and process it exactly-once (idempotent consumers keyed by event id, or Kafka transactions) so a consumer crash does not double-count or drop views.",
              "**Two read paths, two consistency tiers.** Live displayed count: a stream processor (Kafka Streams or Flink) maintains a running per-video tally and pushes it to a fast store (Redis `INCRBY` on aggregated windows) the UI reads with single-digit-ms latency; allowed to be seconds stale and slightly approximate. Billing-grade total: a batch or exactly-once streaming job periodically aggregates the raw event log into a durable warehouse table (per video, per time window) that is the number of record for payouts. Reconciliation compares the two and heals the fast tier from the authoritative one.",
              "**Regional layout:** each region writes to its local Kafka cluster to keep write latency low; cross-region aggregation rolls regional partials into the global total, avoiding a single global write bottleneck. A deliberate move from strong single-row consistency to eventual consistency, justified because the invariant (exact eventual total) is preserved by the durable log while the real-time display trades precision for throughput.",
              "**Anti-fraud dedup** (bot views, replays) lives in the stream layer, keyed by viewer/session, before events count toward payout.",
              "Common wrong turn: trying to keep an ACID row counter authoritative at 100,000 writes/sec, which no single-primary relational row survives; the scale forces the counter out of the transactional database into a durable event log with tiered consistency, while still preserving eventual accuracy for money.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l2-m2",
      title: "Storage Engines & Indexing",
      description:
        "Say whether a workload wants a B-tree or an LSM-tree and why, design composite indexes that fully serve filter-plus-sort queries, and trace the pages/buffer-pool/WAL sequence that makes a committed row fast and durable.",
      lessons: [
        {
          id: "sd-l2-btree-vs-lsm",
          title: "B-Tree vs LSM-Tree",
          summary:
            "B-trees update pages in place for fast reads and range scans; LSM-trees append and compact for write throughput, paying read amplification and compaction stalls.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["storage-engine", "lsm", "btree"],
          teach: {
            markdown: btreeVsLsmTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-btree-vs-lsm-apply",
            prompt:
              "Choose and justify a storage engine for a write-heavy IoT/event-ingestion service versus a read-heavy transactional app.",
            thinkAbout: [
              "Why does LSM suit write-heavy workloads and SSDs?",
              "What are read, write, and space amplification, and how do they differ per engine?",
              "How do bloom filters and compaction affect LSM behavior?",
            ],
            modelAnswerOutline: [
              "Assumptions: the IoT service ingests device telemetry at ~500K writes/sec, mostly appends keyed by (device_id, timestamp), with queries for recent windows per device. The transactional app is an order/account system: moderate write rate, heavy point reads and updates of the same rows, plus range scans for reporting, needing strong per-row consistency.",
              "**IoT ingestion -> LSM engine** (Cassandra or ScyllaDB distributed, or RocksDB embedded). The workload is append-dominated, and LSM turns those writes into sequential memtable flushes and SSTable writes, exactly what SSDs are optimized for, sustaining high write throughput without random-write amplification. Reads target recent data, which lives in the memtable or newest SSTables, and bloom filters keep older-SSTable reads from hitting disk for absent keys.",
              "**LSM operational care:** tune compaction (size-tiered or time-window for time-series), provision headroom so background compaction does not stall ingestion, and monitor pending compactions as a leading indicator of trouble.",
              "**Transactional app -> B+tree engine** (Postgres or MySQL/InnoDB). The access pattern is read and update heavy on individual rows, and B-tree in-place updates give clean 3-to-4-page point reads with low read amplification. Range scans and ordered reads ride the sorted leaves. Write amplification via WAL and page writes is acceptable at a moderate write rate, and you get mature transactions, secondary indexes, and a query planner for free.",
              "**The committed tradeoff:** LSM trades read amplification and background compaction cost for write throughput; B-tree trades write amplification for predictable low-latency reads and range scans.",
              "Common wrong turn: picking LSM 'because it is web-scale' for the OLTP app and being surprised by read amplification and compaction-induced latency spikes on a workload that reads and updates hot rows, where a B-tree would have been simpler and faster.",
            ],
          },
          practice: {
            id: "sd-l2-btree-vs-lsm-practice",
            prompt:
              "Design the storage engine choice and compaction strategy for Discord's message store, which moved from Cassandra to ScyllaDB and handles trillions of messages with billions of writes per day and read patterns dominated by 'load the most recent messages in a channel.' Justify the engine and explain how you would prevent compaction and hot-partition problems at that scale.",
            thinkAbout: [
              "What made ScyllaDB's shard-per-core design fix the p99 spikes Cassandra suffered?",
              "Why does time-window compaction fit write-once, read-recent message data?",
              "What bounds a huge active channel's partition from growing and overheating?",
            ],
            modelAnswerOutline: [
              "At trillions of stored messages and billions of daily writes, this is an append-heavy write workload with time-ordered reads: squarely LSM territory, so keep an **LSM engine (ScyllaDB)** rather than a B-tree store. ScyllaDB is a C++ rewrite of Cassandra's LSM design with a shard-per-core architecture that removes JVM garbage-collection pauses, exactly the tail-latency win Discord needed: the old pain was p99 spikes, largely from JVM GC and compaction contention, not the data model.",
              "**Data model:** partition by channel plus a time bucket, cluster by message_id (a Snowflake ID, so it sorts by time). Clustering descending means 'recent messages in a channel' is a sequential read of the front of a partition, touching the memtable and newest SSTables where bloom filters and the row cache keep latency low.",
              "**Compaction: time-window compaction (TWCS),** not size-tiered. Messages are written once and rarely updated, and reads are recent-heavy, so grouping SSTables by time window means old windows compact once and are left alone, slashing write amplification and stopping cold data from being rewritten forever. Old windows can be dropped or tiered cheaply by TTL.",
              "**Hot partitions are the real risk:** a huge active channel would create an unbounded hot partition that overloads its replica set. Bound partitions with time bucketing (e.g. one bucket per 10-day window) so no partition grows without limit; sub-partition pathologically hot channels; and front the store with a cache for the hottest recent reads so a viral channel does not hammer one shard.",
              "**The committed tradeoff:** LSM plus TWCS accepts higher read amplification on old data (rarely read here) in exchange for cheap sustained writes and bounded compaction cost.",
            ],
          },
        },
      ],
    },
  ],
}
