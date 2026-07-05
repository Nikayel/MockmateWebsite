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
      ],
    },
  ],
}
