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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your bank schema declares no CHECK constraints and no foreign keys. A transfer transaction runs on a fully ACID database. Does the C in ACID still guarantee that money is never created or destroyed?",
  "options": [
    {
      "label": "Yes, the database enforces consistency on its own",
      "feedback": "Tempting, because C sits right there in the acronym alongside three guarantees the engine really does deliver for free. But the engine can only enforce the rules you declared, and here you declared none, so it has no idea what a valid state even is."
    },
    {
      "label": "No, it only upholds the constraints you declared",
      "correct": true,
      "feedback": "Right. Consistency in ACID means the database moves from one valid state to another as YOU defined valid: CHECK constraints, NOT NULL, foreign keys, unique indexes. Declare none and conserving money rests entirely on your transaction logic. Consistency is the outcome; atomicity, isolation, and the constraints you write are the mechanism."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "sequence",
  "title": "What COMMIT ok promises, and when",
  "actors": [
    {
      "id": "app",
      "label": "Application"
    },
    {
      "id": "db",
      "label": "Postgres"
    },
    {
      "id": "wal",
      "label": "WAL on disk"
    }
  ],
  "toggles": [
    {
      "id": "async",
      "label": "synchronous_commit = off",
      "description": "the acknowledgment no longer waits for the fsync"
    }
  ],
  "steps": [
    {
      "from": "app",
      "to": "db",
      "kind": "request",
      "label": "BEGIN, debit A, credit B",
      "state": {
        "WAL on disk": "empty",
        "Client believes": "in flight"
      }
    },
    {
      "from": "db",
      "kind": "note",
      "label": "Both writes buffered in memory"
    },
    {
      "from": "db",
      "to": "wal",
      "kind": "request",
      "label": "append the WAL record",
      "state": {
        "WAL on disk": "in the OS page cache",
        "Client believes": "in flight"
      }
    },
    {
      "from": "db",
      "to": "wal",
      "kind": "request",
      "label": "fsync the WAL record",
      "when": "!async",
      "predict": {
        "question": "The WAL record has been written. Why has Postgres still not acknowledged the commit?",
        "options": [
          "It has: the write call already reached the disk",
          "The write only reached the OS page cache, which a power loss erases",
          "It still has to write the data pages themselves first"
        ]
      },
      "state": {
        "WAL on disk": "durable",
        "Client believes": "in flight"
      }
    },
    {
      "from": "wal",
      "to": "db",
      "kind": "response",
      "label": "fsync returned",
      "when": "!async"
    },
    {
      "from": "db",
      "to": "app",
      "kind": "response",
      "label": "COMMIT ok",
      "when": "!async",
      "state": {
        "WAL on disk": "durable",
        "Client believes": "committed"
      }
    },
    {
      "from": "db",
      "kind": "note",
      "label": "Power loss one second later",
      "status": "error",
      "when": "!async"
    },
    {
      "from": "db",
      "kind": "note",
      "label": "Restart replays the WAL record",
      "when": "!async",
      "state": {
        "WAL on disk": "durable",
        "Client believes": "committed"
      }
    },
    {
      "from": "db",
      "to": "app",
      "kind": "response",
      "label": "COMMIT ok, no fsync yet",
      "status": "late",
      "when": "async",
      "predict": {
        "question": "With 'synchronous_commit = off', what sits on durable storage at the moment the client is told COMMIT ok?",
        "options": [
          "The WAL record; the fsync is just bookkeeping that happens later",
          "Nothing yet: the record is still only in the OS page cache",
          "The WAL record and the data pages, which is why it is faster"
        ]
      },
      "state": {
        "WAL on disk": "still in the OS page cache",
        "Client believes": "committed"
      }
    },
    {
      "from": "db",
      "kind": "note",
      "label": "Power loss one second later",
      "status": "error",
      "when": "async"
    },
    {
      "from": "db",
      "kind": "note",
      "label": "Restart finds no record to replay",
      "status": "error",
      "when": "async",
      "state": {
        "WAL on disk": "gone",
        "Client believes": "committed"
      }
    }
  ],
  "caption": "Flip the toggle and watch the acknowledgment move to the left of the fsync. The client's belief never changes; only whether anything backs it up does."
}
\`\`\`

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

### The balance column is a projection, not the record

That fence is atomic and durable and it still throws away the thing an auditor asks for. After the
commit, the only evidence the transfer happened is that two numbers are different from what they
were. There is nothing to recompute from and nothing to reconcile against, so a bug in one release
quietly becomes the new truth.

The pattern that fixes it makes the movement itself a row. Every movement of money is an
**immutable append-only entry**, and \`balance\` demotes to a cached projection of those entries that
the same transaction keeps in step.

\`\`\`
CREATE TABLE ledger_entries (
  id           BIGSERIAL   PRIMARY KEY,
  transfer_id  UUID        NOT NULL,
  account_id   BIGINT      NOT NULL REFERENCES accounts(id),
  amount_minor BIGINT      NOT NULL,   -- signed: debits negative, credits positive
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

BEGIN
  INSERT INTO ledger_entries (transfer_id, account_id, amount_minor)
  VALUES (:tid, :from_id, -100),        -- the debit, as a fact
         (:tid, :to_id,   +100);        -- the credit, as a fact

  UPDATE accounts SET balance = balance - 100 WHERE id = :from_id AND balance >= 100;
  UPDATE accounts SET balance = balance + 100 WHERE id = :to_id;
COMMIT
\`\`\`

Append-only means exactly that: no statement anywhere in the system UPDATEs or DELETEs a row in
\`ledger_entries\`. A mistake is corrected by inserting the opposite entry, which leaves both the
error and the correction visible.

Because the entries are the record and the balance is derived from them, the projection is
checkable at any moment:

\`\`\`
-- Every account's cached balance must equal the sum of its own entries.
SELECT a.id, a.balance, COALESCE(SUM(e.amount_minor), 0) AS from_entries
FROM accounts a
LEFT JOIN ledger_entries e ON e.account_id = a.id
GROUP BY a.id, a.balance
HAVING a.balance <> COALESCE(SUM(e.amount_minor), 0);
\`\`\`

Every row that query returns is a bug you can see and repair from source data. Run the same query
against the balance-only design and there is nothing to compare, because the number is its own only
witness. That reconciliation is what the extra table buys: keep \`balance\` for the fast read, keep
the entries for the truth.

### When the effect lives outside the database: the outbox

Atomicity covers writes to this database and nothing else. A charge on an external card processor,
an email, a call to another service: none of them roll back when your transaction does. Placing the
external call inside the transaction is the reflex, and it fails twice. It holds the transaction
(and its locks) open for the hundreds of milliseconds the processor takes, and a crash after the
call but before the COMMIT leaves the money moved with no record that it moved.

The **outbox** is a table in your own database holding the side effects you still owe the outside
world, written in the same transaction as the state change:

\`\`\`
BEGIN
  INSERT INTO payment_intents (id, status, amount_minor)
  VALUES (:id, 'processing', 2500);

  INSERT INTO outbox (id, topic, payload)          -- the promise to act, committed with the intent
  VALUES (gen_random_uuid(), 'charge.requested',
          jsonb_build_object('intent_id', :id, 'amount_minor', 2500));
COMMIT
\`\`\`

Both rows commit or neither does, so the state change and the promise to act on it can never
disagree. A separate worker then drains the table and performs the real call:

\`\`\`
-- worker loop, one batch at a time
BEGIN
  SELECT id, topic, payload FROM outbox
   WHERE published_at IS NULL
   ORDER BY id
   FOR UPDATE SKIP LOCKED     -- several workers drain the same table, never the same row
   LIMIT 100;
  -- ... call the processor for each row ...
  UPDATE outbox SET published_at = now() WHERE id = ANY(:ids);
COMMIT
\`\`\`

Be precise about what this buys. The outbox converts "the write and the side effect might disagree"
into "the side effect happens at least once," because the worker can crash after the external call
and before the \`UPDATE\`, and then the row is picked up and the call repeats. It does not make the
effect exactly-once. That last step is the receiver's job: the external call carries an idempotency
key so the repeat is recognized and ignored.

Recap: ACID is four concrete guarantees; atomicity makes debit+credit all-or-nothing, durability
means fsync'd to the WAL not just memory, and consistency is your invariant enforced by constraints
plus isolation, not a free lunch. Atomicity stops at the edge of the database, so immutable entries
give you something to reconcile against and an outbox row carries a promise across that edge.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You are about to design a money-transfer feature. Match each failure to the ACID guarantee that prevents it.",
  "buckets": [
    "Atomicity",
    "Isolation",
    "Durability"
  ],
  "items": [
    {
      "label": "A crash between the debit and the credit leaves 100 dollars missing",
      "bucket": "Atomicity",
      "feedback": "All-or-nothing: the half-finished transfer rolls back to the state before the transaction started."
    },
    {
      "label": "Power loss one second after the client saw 'committed' erases the transfer",
      "bucket": "Durability",
      "feedback": "Commit means the change was fsync'd to the WAL on durable storage before the acknowledgment, so it survives the crash."
    },
    {
      "label": "Two concurrent transfers read the same 100 dollar balance and both withdraw it",
      "bucket": "Isolation",
      "feedback": "Concurrent transactions seeing each other's half-finished work is exactly what isolation controls."
    },
    {
      "label": "A constraint failure on the credit leaves the debit already applied",
      "bucket": "Atomicity",
      "feedback": "Any failure inside the transaction, including a constraint violation, rolls back every write in it."
    }
  ],
  "reveal": "In your design write, do not say 'use ACID' as a buzzword. Name the invariant (money is conserved), then name which guarantee plus which declared constraint upholds it, and what must be fsync'd before commit returns."
}
\`\`\`
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
load, which is a real production trap. The two engines also disagree about what Repeatable Read does
when two transactions update the same row: Postgres is **first-updater-wins** and aborts the second
writer with a serialization failure the application must catch and retry, while MySQL InnoDB blocks
the second writer until the first commits and then lets it proceed.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Two doctors run the on-call transactions under snapshot isolation (what Postgres calls Repeatable Read). Each reads a consistent snapshot showing the other still on call, then removes itself. Can both commit, leaving zero doctors on call?",
  "options": [
    {
      "label": "No. Repeatable Read gives each transaction a consistent snapshot, so this anomaly is prevented.",
      "feedback": "Tempting, because snapshot isolation really does kill dirty, non-repeatable, and phantom reads. But each transaction validated the invariant against a snapshot that cannot see the other's uncommitted write."
    },
    {
      "label": "Yes. Both commit, and the on-call invariant is violated.",
      "correct": true,
      "feedback": "Right. This is write skew: each transaction was individually consistent against its stale snapshot, and snapshot isolation never checks their combined effect."
    },
    {
      "label": "Only if one transaction happened to start before the other.",
      "feedback": "Timing does not save you. Any overlap where each snapshot predates the other's commit produces the skew."
    }
  ]
}
\`\`\`

### The most-probed subtlety: snapshot isolation and write skew

**Snapshot isolation** (what Postgres calls Repeatable Read, and what many systems mean by
"Repeatable Read") gives every transaction a consistent snapshot as of its start, which kills dirty,
non-repeatable, and phantom reads for reads. But snapshot isolation still permits write skew, because
each transaction validates against a stale snapshot that does not see the other's write. Only **true
serializable** forbids write skew, implemented either by Serializable Snapshot Isolation (SSI, which
detects dangerous read-write dependency cycles and aborts one transaction) or by strict two-phase
locking (2PL). Serializable costs throughput: SSI adds abort-and-retry churn under contention, 2PL
adds lock waits.

\`\`\`cswidget
{
  "type": "steps",
  "title": "Write skew: two correct transactions, one broken invariant",
  "frames": [
    {
      "note": "Two doctors are on call, and the invariant is that at least one always is. Both transactions are about to start under snapshot isolation, which is what Postgres calls Repeatable Read.",
      "rows": [
        {
          "label": "Committed state",
          "cells": [
            {
              "text": "Ana: on call"
            },
            {
              "text": "Ben: on call"
            }
          ]
        },
        {
          "label": "Invariant",
          "cells": [
            {
              "text": "at least one on call: HELD"
            }
          ]
        }
      ]
    },
    {
      "note": "T1 and T2 both begin. Each takes its own consistent snapshot of the committed state, and neither snapshot will ever show the other transaction's uncommitted work.",
      "rows": [
        {
          "label": "Committed state",
          "cells": [
            {
              "text": "Ana: on call"
            },
            {
              "text": "Ben: on call"
            }
          ]
        },
        {
          "label": "T1 snapshot",
          "cells": [
            {
              "text": "Ana: on call",
              "state": "new"
            },
            {
              "text": "Ben: on call",
              "state": "new"
            }
          ]
        },
        {
          "label": "T2 snapshot",
          "cells": [
            {
              "text": "Ana: on call",
              "state": "new"
            },
            {
              "text": "Ben: on call",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "note": "T1 validates the invariant against its snapshot: Ben is still on call, so taking Ana off shift is safe. It writes Ana off. The write is uncommitted, so only T1 can see it.",
      "rows": [
        {
          "label": "Committed state",
          "cells": [
            {
              "text": "Ana: on call"
            },
            {
              "text": "Ben: on call"
            }
          ]
        },
        {
          "label": "T1 snapshot",
          "cells": [
            {
              "text": "Ana: off shift",
              "state": "active"
            },
            {
              "text": "Ben: on call",
              "state": "active"
            }
          ]
        },
        {
          "label": "T2 snapshot",
          "cells": [
            {
              "text": "Ana: on call",
              "state": "dim"
            },
            {
              "text": "Ben: on call",
              "state": "dim"
            }
          ]
        }
      ]
    },
    {
      "predict": {
        "question": "T2 started before T1 committed. What does T2's snapshot show for Ana?",
        "options": [
          "Ana off shift: each read refreshes the snapshot",
          "Ana still on call: the snapshot predates T1's write",
          "Nothing yet: T2 blocks until T1 commits"
        ]
      },
      "note": "T2 validates the same invariant against its own snapshot, where Ana is still on call. That check passes too, so T2 writes Ben off shift. Each transaction is individually correct.",
      "rows": [
        {
          "label": "Committed state",
          "cells": [
            {
              "text": "Ana: on call"
            },
            {
              "text": "Ben: on call"
            }
          ]
        },
        {
          "label": "T1 snapshot",
          "cells": [
            {
              "text": "Ana: off shift",
              "state": "dim"
            },
            {
              "text": "Ben: on call",
              "state": "dim"
            }
          ]
        },
        {
          "label": "T2 snapshot",
          "cells": [
            {
              "text": "Ana: on call",
              "state": "active"
            },
            {
              "text": "Ben: off shift",
              "state": "active"
            }
          ]
        }
      ]
    },
    {
      "note": "Both commit. Neither transaction wrote a row the other one wrote, so snapshot isolation sees no conflict worth reporting. Their combined effect leaves zero doctors on call.",
      "rows": [
        {
          "label": "Committed state",
          "cells": [
            {
              "text": "Ana: off shift",
              "state": "dropped"
            },
            {
              "text": "Ben: off shift",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "Invariant",
          "cells": [
            {
              "text": "at least one on call: VIOLATED",
              "state": "dropped"
            }
          ]
        }
      ]
    },
    {
      "note": "The same interleaving under true Serializable. SSI tracks the read-write dependency each transaction created, spots the dangerous cycle at commit time, and aborts one. The retry reads Ana already off shift and refuses to take Ben off too.",
      "rows": [
        {
          "label": "Committed state",
          "cells": [
            {
              "text": "Ana: off shift"
            },
            {
              "text": "Ben: on call",
              "state": "active"
            }
          ]
        },
        {
          "label": "T2 under Serializable",
          "cells": [
            {
              "text": "aborted, retried, refused",
              "state": "new"
            }
          ]
        },
        {
          "label": "Invariant",
          "cells": [
            {
              "text": "at least one on call: HELD"
            }
          ]
        }
      ]
    }
  ],
  "caption": "Snapshot isolation checked each transaction against a snapshot. Nothing ever checked the two of them against each other, and that gap is the whole anomaly."
}
\`\`\`

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
  index enforces it regardless of isolation level, and regardless of what any application code does.

**The unique index usually wants a predicate.** Write the plain form and you over-enforce. Take an
edit lock: at most one person may hold a document open at a time, but locks are released and expire,
and the next person takes it.

\`\`\`
CREATE UNIQUE INDEX one_lock_per_doc ON edit_locks (doc_id);

INSERT INTO edit_locks (doc_id, user_id, status) VALUES (42, 'alice', 'released');
INSERT INTO edit_locks (doc_id, user_id, status) VALUES (42, 'bob',   'active');
-- ERROR: duplicate key value violates unique constraint "one_lock_per_doc"
-- Alice let the lock go an hour ago and is still occupying the only slot in the index.
\`\`\`

The invariant was never "one row per doc," it is "one ACTIVE row per doc." A **partial unique
index** (also called a predicate or filtered index) carries that WHERE clause into the index itself,
so only rows matching the predicate are indexed at all, and only those rows can collide:

\`\`\`
CREATE UNIQUE INDEX one_active_lock_per_doc
  ON edit_locks (doc_id)
  WHERE status = 'active';      -- released and expired rows are simply not in the index

INSERT INTO edit_locks (doc_id, user_id, status) VALUES (42, 'alice', 'released');  -- ok
INSERT INTO edit_locks (doc_id, user_id, status) VALUES (42, 'bob',   'active');    -- ok
INSERT INTO edit_locks (doc_id, user_id, status) VALUES (42, 'carol', 'active');    -- ERROR
\`\`\`

Bob and Carol race, exactly one of them commits, and the loser catches a unique violation and turns
it into "someone else is editing this." Alice's released row sits outside the predicate and blocks
nobody. Reach for the predicate form whenever the invariant holds over a live subset rather than the
whole table, which is most of the time. It also keeps the index small, since dead rows never enter
it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Pick the surgical fix for each concurrency bug, without turning on global Serializable.",
  "buckets": [
    "'SELECT ... FOR UPDATE'",
    "Optimistic version column",
    "Unique constraint"
  ],
  "items": [
    {
      "label": "Flash-sale oversell on the last unit in stock; concurrent buyers must queue on that row",
      "bucket": "'SELECT ... FOR UPDATE'",
      "feedback": "High contention on known rows is the pessimistic lock's home turf: writers line up instead of both reading stale stock."
    },
    {
      "label": "Two admins occasionally edit the same record and one save silently overwrites the other",
      "bucket": "Optimistic version column",
      "feedback": "A lost update under low contention: a version check makes the late writer's UPDATE match zero rows, so it retries cheaply."
    },
    {
      "label": "Exactly one booking per seat must hold no matter what any application code does",
      "bucket": "Unique constraint",
      "feedback": "A unique index enforces the invariant at the data layer, independent of isolation level or app discipline. Often the cleanest fix of all."
    }
  ]
}
\`\`\`

Recap: pick the isolation level (or explicit lock) by naming the exact anomaly; snapshot isolation
stops dirty, non-repeatable, and phantom reads but still allows write skew, which only true
Serializable or targeted locking prevents.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A teammate proposes ending all concurrency bugs by running the whole database at Serializable. What is the sharpest objection?",
  "options": [
    {
      "label": "Serializable still allows write skew, so it would not work",
      "feedback": "Tempting to overcorrect after learning snapshot isolation's gap, but true Serializable (SSI or strict 2PL) is exactly the level that does forbid write skew. It is the one anomaly claim you can safely make about it."
    },
    {
      "label": "It works, but you pay globally for a local bug",
      "correct": true,
      "feedback": "Right. Serializable is correct, and it really does forbid write skew. But then every transaction in the database pays abort-and-retry churn under SSI or lock waits under 2PL, to fix bugs that live in a handful of code paths. Name the exact anomaly first: a lost update falls to a row lock or a version column, and a one-seat-per-booking invariant falls to a unique constraint, each at a fraction of the throughput cost."
    },
    {
      "label": "Postgres has no Serializable level, so it is not an option",
      "feedback": "Postgres implements true Serializable via SSI, so it is available and it is correct. The objection is cost and precision, not availability."
    }
  ],
  "reveal": "In your design write, name the anomaly before naming the fix: 'this is a lost update, so I lock the row' or 'this is write skew, so snapshot isolation is not enough.' Never just 'use transactions.'"
}
\`\`\`
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
writers keep creating new versions alongside it, and neither waits on the other. Concretely: a reader
whose snapshot was taken once v2 was committed sees v2 and ignores the in-flight v3 a writer is
building beside it, and it waits for nothing. This is what makes snapshot isolation cheap and is why
read-heavy systems love it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An analytics connection opens a transaction and then sits idle for an hour while writers keep updating the table. MVCC means readers do not block writers, so is the idle transaction harmless?",
  "options": [
    {
      "label": "Yes. Nobody waits on it, so nothing degrades.",
      "feedback": "Tempting, because it is true that no writer blocks on it. The damage is not blocking; it is what the database is forbidden to clean up while that old snapshot stays alive."
    },
    {
      "label": "No, its old snapshot stops vacuum reclaiming dead versions",
      "correct": true,
      "feedback": "Right. Vacuum cannot reclaim any row version newer than the oldest live snapshot, so one forgotten transaction holds that horizon still while writers keep creating versions alongside it. Dead tuples pile up as bloat, the table and its indexes swell to many times their live size, and sequential scans slow down. The damage was never blocking; it is the cleanup the database is forbidden to do."
    },
    {
      "label": "No, but only because the database automatically kills any transaction after a few minutes.",
      "feedback": "Not by default. You must configure something like 'idle_in_transaction_session_timeout'; out of the box the transaction pins the vacuum horizon indefinitely."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A viral post's like counter takes thousands of increments per second, all on one row. Contention could not be higher. Applying the rule you just read, is a pessimistic row lock the right design?",
  "options": [
    {
      "label": "Yes, high contention is exactly what pessimistic locks are for",
      "feedback": "Tempting, because the rule literally says pessimistic under high contention. But that rule picks between control schemes for a workload you keep as-is. One hot row behind a lock serializes every writer to one-at-a-time, so throughput caps at whatever a single lock holder can do."
    },
    {
      "label": "No, restructure the write path instead of serializing it",
      "correct": true,
      "feedback": "Right. Heavy locking is the worst possible choice for a hot key, because it turns thousands of parallel increments into a single-file queue. When contention concentrates on one row, change the shape of the writes: shard the counter into N sub-rows and sum on read, batch increments in memory or Redis and flush periodically, or use one atomic in-database increment so no writer holds a lock across a read-modify-write."
    },
    {
      "label": "No, use optimistic version checks to skip lock overhead",
      "feedback": "OCC is even worse on a hot row: nearly every transaction fails its version check and retries, so you burn CPU in an abort storm instead of waiting politely in a lock queue."
    }
  ]
}
\`\`\`

### The hot key

For a hot key specifically (a viral post's like counter taking thousands of increments per second on
one row), the wrong move is heavy pessimistic locking, which serializes every writer behind one lock
and caps throughput at one-at-a-time. The right moves: **shard the counter** into N sub-rows
(\`like_count_shard_0..N\`), increment a random shard, and sum on read, which spreads contention
N-fold; or aggregate increments in memory/Redis and flush periodically; or use an atomic in-database
increment so each write is a single short operation rather than a read-modify-write holding a lock.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "One hot counter row against N sharded rows",
  "nodes": [
    {
      "id": "writers",
      "label": "Thousands of increments per second on one viral post",
      "kind": "client"
    },
    {
      "id": "hot",
      "label": "like_count: one row, exclusive lock per writer",
      "kind": "db"
    },
    {
      "id": "shard0",
      "label": "like_count_shard_0",
      "kind": "db"
    },
    {
      "id": "shard1",
      "label": "like_count_shard_1",
      "kind": "db"
    },
    {
      "id": "shardn",
      "label": "like_count_shard_N",
      "kind": "db"
    },
    {
      "id": "reader",
      "label": "Read path: SUM over all N shard rows",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "writers",
      "to": "hot",
      "kind": "sync",
      "label": "LOCK: writers serialize, one at a time"
    },
    {
      "from": "writers",
      "to": "shard0",
      "kind": "sync",
      "label": "random shard pick"
    },
    {
      "from": "writers",
      "to": "shard1",
      "kind": "sync",
      "label": "random shard pick"
    },
    {
      "from": "writers",
      "to": "shardn",
      "kind": "sync",
      "label": "random shard pick"
    },
    {
      "from": "shard0",
      "to": "reader",
      "kind": "sync",
      "label": "read all N"
    },
    {
      "from": "shard1",
      "to": "reader",
      "kind": "sync",
      "label": "read all N"
    },
    {
      "from": "shardn",
      "to": "reader",
      "kind": "sync",
      "label": "read all N"
    }
  ],
  "groups": [
    {
      "id": "serialized",
      "label": "Serialized: throughput caps at one lock holder",
      "nodes": [
        "hot"
      ]
    },
    {
      "id": "sharded",
      "label": "Sharded: roughly N-way parallel",
      "nodes": [
        "shard0",
        "shard1",
        "shardn",
        "reader"
      ]
    }
  ],
  "stages": [
    {
      "adds": [
        "writers",
        "hot"
      ],
      "note": "The requirement is thousands of increments per second landing on one row. A pessimistic lock is correct and still wrong here: every writer queues behind the current holder, so throughput caps at whatever one holder finishes. Optimistic version checks are worse, because nearly every check fails and retries."
    },
    {
      "adds": [
        "shard0",
        "shard1",
        "shardn"
      ],
      "note": "Nothing about the requirement demanded a single row, so change the shape of the writes: split the counter into N rows and have each writer increment a random one. Two writers now collide only when they pick the same shard, which spreads contention about N-fold."
    },
    {
      "adds": [
        "reader"
      ],
      "note": "The cost the fix moves rather than removes. The true count is now a SUM across N rows, so reads do more work and can be momentarily behind. That is a fine trade for a like counter and the wrong trade for an account balance."
    }
  ],
  "caption": "The other two fixes have the same shape: batch increments in memory or Redis and flush periodically, or use one atomic in-database increment so no writer holds a lock across a read-modify-write."
}
\`\`\`

### The top rung: keep the events, not just the count

Every fix so far throws the individual events away and keeps a number. Sharded rows keep N numbers.
A Redis buffer flushed every few seconds keeps one number and loses whatever sat in memory when the
process died. That is the right trade for a like badge and the wrong one the moment the count
settles into money, because a lossy in-memory buffer leaves nothing to recount from and no way to
answer "was that event real?" after the fact.

The rung above sharding stops treating the counter as the write target at all. Each event is
appended to a **durable, retained, partitioned log** (Kafka, Kinesis). Take those three words
literally, because each one does work:

- **Durable**: the broker replicates and fsyncs the record before acknowledging, so it is not a
  memory buffer.
- **Retained**: the broker keeps records for a configured window rather than deleting them once a
  consumer has read them. This is the property that makes a *second* pass over the same data
  possible, and it is the one people forget a log has.
- **Partitioned**: the record key picks a partition, so ordering is per key and throughput scales
  with partition count instead of capping at one row.

Take an ad-impression counter that is billed to advertisers monthly:

\`\`\`
# One topic, partitioned by the entity being counted, records kept for 14 days.
kafka-topics --create --topic impressions \\
  --partitions 256 \\
  --config retention.ms=1209600000    # records survive being consumed

# The producer appends. The key decides the partition.
produce(topic="impressions", key=str(campaign_id),
        value={"event_id": "9f2c-41ab", "campaign_id": 42,
               "viewer": "u_88", "ts": 1723600000})
\`\`\`

Appending is cheap and coordination-free: no row is locked, no version is checked, and two events
for different campaigns never touch each other. Now the same log feeds two readers with two
different guarantees.

\`\`\`
# Reader 1, fast and approximate. A stream job folds each window into a hot store.
for window in stream.read("impressions", window="2s"):
    for campaign_id, n in count_by_key(window):
        redis.incrby(f"impr:{campaign_id}", n)   # the dashboard reads this, seconds stale

# Reader 2, exact and durable. A batch job re-reads the SAME retained records and
# writes one settled row per campaign per day.
SELECT campaign_id, count(DISTINCT event_id) AS impressions
FROM   impression_events                 -- the log's records, landed for query
WHERE  ts >= :day_start AND ts < :day_end
GROUP  BY campaign_id;                   -- this is the number that gets invoiced
\`\`\`

Reader 2 exists only because the records were still there to read a second time, which is what
retention bought. It also repairs Reader 1 rather than trusting it: \`count(DISTINCT event_id)\`
makes the aggregate idempotent, so an event the stream job counted twice across a crash and restart
contributes once here, and the settled number overwrites the fast one on reconciliation.

The rung you belong on is set by what the number is for. Shard the rows for a like badge, buffer in
Redis when losing a few seconds is survivable, and keep the raw events in a retained log the moment
someone will need the count to be exact after the fact.

Recap: MVCC makes readers and writers not block each other by versioning rows, at the cost of vacuum
and bloat from long transactions; choose optimistic control under low contention and pessimistic
under high, and for a hot key shard the counter instead of serializing writers behind one lock. When
the count has to be exact and durable, escalate past the counter entirely to a retained event log
that can be re-aggregated.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "For each workload, pick the concurrency approach you would defend in a design review.",
  "buckets": [
    "Optimistic version check",
    "Pessimistic row lock",
    "Restructure the writes"
  ],
  "items": [
    {
      "label": "User profile edits, where two writers hitting the same row is rare",
      "bucket": "Optimistic version check",
      "feedback": "Low contention is OCC territory: zero lock overhead, and the rare conflict costs one cheap retry."
    },
    {
      "label": "Withdrawals against a specific account row that several concurrent transfers target",
      "bucket": "Pessimistic row lock",
      "feedback": "Real contention on known rows: 'SELECT ... FOR UPDATE' queues the writers, and locking accounts in a consistent order (lower id first) avoids deadlocks."
    },
    {
      "label": "A trending video's view counter absorbing thousands of writes per second on one row",
      "bucket": "Restructure the writes",
      "feedback": "Neither locks nor version checks survive a hot key: locks serialize writers and OCC melts into retries. Shard the counter into N sub-rows or batch and flush."
    }
  ],
  "reveal": "In your design write, state the contention level first, then the mechanism: low contention gets a version check, high contention on known rows gets a short row lock taken in consistent order, and a hot key gets restructured, never serialized."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Which engine family does each statement describe?",
  "buckets": [
    "B+tree",
    "LSM-tree"
  ],
  "items": [
    {
      "label": "A range scan walks linked, sorted leaf pages sequentially",
      "bucket": "B+tree",
      "feedback": "Sorted leaves linked in order are the B+tree signature, and why it owns 'created_at between X and Y' queries."
    },
    {
      "label": "A write is an append to a memtable plus a sequential log, never an in-place page edit",
      "bucket": "LSM-tree",
      "feedback": "Append-only sequential writes are why LSM engines sustain very high, SSD-friendly write throughput."
    },
    {
      "label": "A read may need to consult several on-disk files, so each file carries a bloom filter",
      "bucket": "LSM-tree",
      "feedback": "The key could live in the memtable or any SSTable; bloom filters let a read skip files that definitely do not contain it."
    },
    {
      "label": "Changing one 200 byte row can force rewriting an entire 8KB page",
      "bucket": "B+tree",
      "feedback": "In-place page updates mean small logical writes become full page writes: the B+tree's flavor of write amplification."
    }
  ]
}
\`\`\`

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

### The third strategy: compact by time, not by size

Leveled and size-tiered both pick merge candidates by **size**, and on write-once, read-recent data
that is the wrong axis. Picture a sensor table taking 24 GB a day, never updated, read almost
entirely for "the last few hours." Under size-tiered compaction, a January SSTable keeps getting
swept into merges with newer similarly-sized files for as long as it exists:

\`\`\`
size-tiered, day 90:
  today's flushes  ->  merged with similar-sized files  ->  merged again as the result grows
  ...
  a January row has now been rewritten several times over, and nothing ever read it.
  Write amplification is paid forever, on data that is immutable and cold.
\`\`\`

**Time-window compaction (TWCS)** buckets SSTables by the time range of the rows inside them and
compacts only within the current window. Once a window closes, its file is final:

\`\`\`
TWCS with a one-day window, day 90:
  window 2026-08-14  OPEN    today's flushes merge into one file for the day
  window 2026-08-13  CLOSED  1 SSTable, never rewritten again
  window 2026-08-12  CLOSED  1 SSTable, never rewritten again
  ...
  window 2026-05-16  CLOSED  every row past its TTL -> drop the whole file, no merge at all
\`\`\`

Two wins fall out. Cold data is written once and then left alone, so write amplification is bounded
by roughly one window's volume instead of by the table's whole history. And expiry becomes a file
delete: when every row in a closed window is past its TTL, the SSTable is dropped whole, with no
compaction pass needed to find and discard expired rows one at a time.

The price is the assumption. TWCS needs data to arrive roughly in time order and not be updated
afterward. Backfill an old day and those rows land in the *current* window, so a read for that day
now touches two windows and the guarantee frays. Use TWCS for append-only time-ordered data, and
size-tiered or leveled for anything you overwrite.

### Two LSM stores are not interchangeable: where the tail comes from

"It is an LSM engine" does not finish the choice, because two engines implementing the same tree can
behave very differently at p99. LSM tail latency has two sources, and they stack:

- **Compaction contention.** A background merge is reading and writing hundreds of megabytes while
  your queries want the same disk and CPU. Every LSM engine has this.
- **Garbage-collection pauses.** Cassandra runs on the JVM. A heap holding large memtables and
  per-request buffers produces stop-the-world collections, and a collection that freezes the process
  freezes every in-flight request on that node with it. Nothing is running slowly; the process is
  simply not running.

\`\`\`
Cassandra node under steady read load:
  p50    ~1 ms
  p99    tens of ms         compaction stealing disk and CPU from queries
  p999   hundreds of ms     a stop-the-world GC pause landed on these requests
\`\`\`

That last line is why "tune compaction harder" does not fix it: a GC pause is not work you can
schedule around. **ScyllaDB** is a C++ reimplementation of the same data model and wire protocol
with no managed runtime, so there is no garbage collector to pause anything. It also pins one thread
per core and shards the data across those cores (**shard-per-core**), so a request is served
entirely on the core owning its shard, with no cross-core locking and no shared heap:

\`\`\`
Scylla node, same workload:
  p50    ~1 ms
  p99    single-digit ms    compaction, now scheduled against per-core I/O budgets
  p999   single-digit ms    there is no garbage collector, so no pause to land on anything
\`\`\`

So a choice between two LSM stores is a runtime and threading argument, not a data-model one. If the
pain you are solving is p99 and p999 rather than throughput or schema, that is the axis to argue on.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "The LSM write path",
  "nodes": [
    {
      "id": "writer",
      "label": "Incoming write",
      "kind": "client"
    },
    {
      "id": "commit_log",
      "label": "Commit log (sequential append)",
      "kind": "db"
    },
    {
      "id": "memtable",
      "label": "Memtable (sorted, in RAM)",
      "kind": "cache"
    },
    {
      "id": "sstables",
      "label": "Immutable SSTables, bloom filter each",
      "kind": "db"
    },
    {
      "id": "compaction",
      "label": "Background compaction",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "writer",
      "to": "memtable",
      "kind": "sync",
      "label": "insert sorted"
    },
    {
      "from": "writer",
      "to": "commit_log",
      "kind": "sync",
      "label": "append"
    },
    {
      "from": "memtable",
      "to": "sstables",
      "kind": "async",
      "label": "flush when full"
    },
    {
      "from": "sstables",
      "to": "compaction",
      "kind": "async",
      "label": "merge inputs"
    },
    {
      "from": "compaction",
      "to": "sstables",
      "kind": "async",
      "label": "fewer, merged files"
    }
  ],
  "stages": [
    {
      "adds": [
        "writer"
      ],
      "note": "A write never edits a page in place; the whole path is append-only and sequential, which is why LSM write throughput is high and SSD-friendly."
    },
    {
      "adds": [
        "memtable",
        "commit_log"
      ],
      "note": "The memtable keeps recent writes sorted in RAM; the commit log exists so an acknowledged write survives a crash before any flush."
    },
    {
      "adds": [
        "sstables"
      ],
      "note": "A full memtable is flushed to disk as an immutable, sorted SSTable; each file carries a bloom filter so a read can skip files that definitely do not contain the key."
    },
    {
      "adds": [
        "compaction"
      ],
      "note": "Compaction merges SSTables in the background, discarding overwritten and tombstoned rows; it bounds read amplification but competes for disk I/O, so sustained write pressure brings compaction stalls."
    }
  ],
  "caption": "Contrast with a B+tree, which updates fixed-size pages in place: a clean 3 to 4 page reads per lookup and fast range scans, paid for with write amplification on every small change."
}
\`\`\`

Recap: B-tree updates pages in place for fast reads and range scans at the cost of write
amplification; LSM appends to a memtable then compacts immutable SSTables for high write throughput,
using bloom filters and compaction to keep reads sane. Pick the compaction strategy from the
workload (time-window for append-only time-ordered data, size-tiered or leveled when you overwrite),
and remember that between two LSM engines the tail latency argument is about the runtime.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A teammate says: 'Cassandra benchmarks faster than Postgres, so we should use an LSM engine for everything.' What is the accurate correction?",
  "options": [
    {
      "label": "Neither is faster; each moves the cost somewhere else",
      "correct": true,
      "feedback": "Right. LSM wins the write path because writes are sequential appends to a memtable and a commit log, and it pays for that with read amplification (the key may sit in the memtable or any SSTable) and with background compaction that competes for disk exactly when you are busiest. A B+tree pays on the write side instead, through full-page writes and the WAL, and hands back clean 3-to-4-page point reads and fast range scans. A read-heavy or range-scan-heavy workload still favors the B+tree."
    },
    {
      "label": "They are right: append-only writes make LSM faster everywhere",
      "feedback": "Tempting, because the write path really is faster. But every overwrite lives in multiple SSTables until compaction merges them, so reads fan out across files, and compaction competes for disk exactly when you are busiest."
    },
    {
      "label": "B+trees are faster because SQL engines are better optimized",
      "feedback": "Maturity is not the axis. A write-heavy ingest workload genuinely overwhelms in-place page updates, which is exactly the problem LSM engines were built to solve."
    }
  ],
  "reveal": "In your design write, lead with the workload's read/write mix, then name the engine and the amplification you accept: 'write-heavy ingest, so LSM, and I will watch compaction' beats naming a database brand."
}
\`\`\`
`.trim()

const indexingCostTeach = `
## Which index, in what order, at what cost

An index is a sorted, auxiliary copy of some columns that lets the database find rows without
scanning the whole table. The core senior skill is not "add an index," it is knowing *which* index
serves a given query, in what column order, and what that index costs you on every write.

### Clustered vs secondary

A **clustered / primary index** determines the physical order of the rows themselves; the table *is*
the index (InnoDB tables are clustered on the primary key). A **secondary index** is a separate
B-tree that maps indexed columns to a row locator (the primary key in InnoDB, or a physical tuple
pointer in Postgres, whose tables are unordered "heaps"). This matters because in a heap table, a
secondary index match still needs a second read to fetch the row from the heap.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A table has one composite index on (a, b, c). A query filters 'WHERE b = 5' with no condition on a. Can the index serve that query efficiently?",
  "options": [
    {
      "label": "Yes, b is an indexed column, so it can seek to b = 5",
      "feedback": "Tempting, and it is the most common indexing mistake in practice. Being present in the index is not the same as being seekable in it, because an index is one sorted list, not three."
    },
    {
      "label": "No, b is only sorted inside each group of equal a",
      "correct": true,
      "feedback": "Right. The index on (a, b, c) is sorted by a first, then by b within equal a, then by c within equal (a, b). So it serves prefixes: a alone, a and b, or all three. With a unpinned, the entries for b = 5 are scattered across every a group and there is no single place to start the seek."
    },
    {
      "label": "Yes, but only if the query also sorts by c",
      "feedback": "Adding a sort on c does not help. Without pinning a, the entries for b = 5 are still spread across the whole index, and a sort cannot conjure locality that the key order never had."
    }
  ]
}
\`\`\`

### The leftmost-prefix rule

The single most tested idea: an index on (a, b, c) is sorted first by a, then by b within equal a,
then by c within equal (a, b). So it can serve queries that use a prefix of those columns: \`a=?\`,
\`a=? AND b=?\`, \`a=? AND b=? AND c=?\`. It cannot efficiently serve \`b=?\` alone, because b is
only sorted within each a group. This is why **column order is a design decision, not an alphabetical
accident**. The rule of thumb: equality-filtered columns first, then the column you sort or
range-scan on last, so that after the equality prefix pins a contiguous slice, the sort column is
already in order inside that slice and no separate sort step is needed.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "user_id",
    "status",
    "created_at",
    "why this entry is here"
  ],
  "rows": [
    [
      7,
      "active",
      "2026-06-30",
      "different user: outside the slice"
    ],
    [
      42,
      "active",
      "2026-06-01",
      "slice starts: the equality prefix (42, active) pins a contiguous run"
    ],
    [
      42,
      "active",
      "2026-06-09",
      "still inside the run"
    ],
    [
      42,
      "active",
      "2026-06-20",
      "and created_at is already in order, so no separate sort step"
    ],
    [
      42,
      "inactive",
      "2026-04-11",
      "same user, different status: the run has ended"
    ],
    [
      99,
      "active",
      "2026-06-03",
      "status = 'active' alone is scattered across every user_id group"
    ]
  ],
  "highlightCols": [
    "created_at"
  ],
  "caption": "A composite index on (user_id, status, created_at) is one sorted entry list: WHERE user_id = 42 AND status = 'active' ORDER BY created_at seeks one contiguous slice, while a lone status filter has no single place to seek."
}
\`\`\`

A **covering index** (index-only scan) is the next lever. If the index contains *every* column the
query needs, in its keys or as included non-key columns (Postgres \`INCLUDE\`, SQL Server included
columns), the database answers entirely from the index and never touches the table/heap. That removes
the second read per row and can turn a slow query fast, at the cost of a wider index.

**Selectivity / cardinality** decides whether the planner even uses your index. An index on a boolean
\`is_active\` that is 95% true is nearly useless: matching most of the table via an index
(random-ish lookups) is slower than a sequential full scan. High-cardinality columns (user_id, email)
are the good candidates. The planner estimates rows returned and picks index versus full scan on
cost; a stale statistics estimate is a classic cause of "it stopped using my index."

### The cost side

**Interview nuance:** the cost side is where juniors get exposed. Every index is a second data
structure the database must **keep in sync on every insert, update, and delete**. Ten indexes means
one insert becomes eleven B-tree writes plus more WAL and more storage. Write-heavy tables should be
deliberately under-indexed. Beyond the default B-tree, know the specialized types: **hash** (equality
only, no ranges), **partial** (index only rows matching a predicate, e.g. \`WHERE status='active'\`,
keeping it tiny), **GIN/GiST** (Postgres inverted/generalized indexes for arrays, JSONB, full-text,
and geospatial), and **expression** (also called functional) indexes, which index the *result* of an
expression instead of a bare column.

That last one is the cheap answer to "we need to filter on one field buried inside a JSON blob." The
reflex is to index the whole document, which makes every key inside it searchable and charges you
for all of them on every write:

\`\`\`
-- Indexes every key and value in the document. Broad, and expensive to maintain.
CREATE INDEX charges_metadata_gin ON charges USING GIN (metadata);
\`\`\`

An expression index indexes one derived value instead, as if you had added a real column:

\`\`\`
CREATE INDEX charges_invoice_id ON charges ((metadata->>'invoice_id'));

-- Used only when the query repeats the expression EXACTLY:
SELECT * FROM charges WHERE metadata->>'invoice_id' = 'in_9f2c';    -- index scan
SELECT * FROM charges WHERE metadata->'invoice_id'  = '"in_9f2c"';  -- different expression, seq scan
\`\`\`

The write cost is the difference that decides it. The GIN index extracts and indexes every key in
the document on every insert and updates a posting list per key. The expression index evaluates one
function and writes one B-tree entry. On a write-heavy table that gap is the entire argument, and
the same trick works on ordinary columns whenever a query applies a function:
\`CREATE INDEX ON users (lower(email))\` serves \`WHERE lower(email) = ?\`, which a plain index on
\`email\` cannot.

\`\`\`cswidget
{
  "type": "calc",
  "title": "What each extra index costs on the write path",
  "predictPrompt": {
    "question": "A table carries 4 secondary indexes and takes 5,000 inserts per second. How many B-tree writes per second does the storage engine actually perform?",
    "options": [
      "5,000: one write per row",
      "10,000: the row and one index",
      "20,000: one per index",
      "25,000: the row plus one per index"
    ]
  },
  "workedExample": "At the initial 4 secondary indexes, a single insert is 5 B-tree writes: the row itself plus one per index. At 5,000 inserts per second that is 20,000 index maintenance writes every second on top of the row writes, and across 500 million rows those four indexes occupy about 80 GB, which is 40 percent of the 200 GB table. Drag indexes up to 10 and read the bottom two outputs before deciding the eleventh one is free.",
  "inputs": [
    {
      "kind": "slider",
      "id": "indexes",
      "label": "Secondary indexes on the table",
      "min": 0,
      "max": 12,
      "scale": "linear",
      "step": 1,
      "initial": 4,
      "unit": "indexes"
    },
    {
      "kind": "slider",
      "id": "insert_qps",
      "label": "Inserts, updates and deletes per second",
      "min": 100,
      "max": 200000,
      "scale": "log",
      "initial": 5000,
      "unit": "per second"
    },
    {
      "kind": "slider",
      "id": "rows",
      "label": "Rows in the table",
      "min": 1000000,
      "max": 10000000000,
      "scale": "log",
      "initial": 500000000,
      "unit": "rows"
    },
    {
      "kind": "slider",
      "id": "entry_bytes",
      "label": "Bytes per index entry",
      "min": 20,
      "max": 120,
      "scale": "linear",
      "step": 4,
      "initial": 40,
      "unit": "bytes"
    },
    {
      "kind": "slider",
      "id": "row_bytes",
      "label": "Bytes per row",
      "min": 100,
      "max": 2000,
      "scale": "linear",
      "step": 50,
      "initial": 400,
      "unit": "bytes"
    }
  ],
  "outputs": [
    {
      "id": "writes_per_insert",
      "label": "B-tree writes per single insert",
      "expr": "indexes + 1",
      "format": "number",
      "unit": "writes"
    },
    {
      "id": "index_writes",
      "label": "Index maintenance writes per second",
      "expr": "insert_qps * indexes",
      "format": "compact",
      "unit": "per second",
      "sparkline": {
        "over": "indexes"
      }
    },
    {
      "id": "index_bytes",
      "label": "Storage the indexes occupy",
      "expr": "rows * indexes * entry_bytes",
      "format": "bytes"
    },
    {
      "id": "index_share",
      "label": "Index bytes as a share of the table",
      "expr": "index_bytes / (rows * row_bytes)",
      "format": "percent"
    }
  ],
  "caption": "Reads get faster one query at a time. Writes get slower on every insert, update and delete, and the index set routinely rivals the table it serves. The index you deliberately did not add is worth saying out loud."
}
\`\`\`

Recap: pick the index by the query, order composite columns as equality-then-sort per the
leftmost-prefix rule, make it covering when a hot query justifies the width, and remember every index
taxes every write.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your hot query is 'WHERE user_id = ? AND status = ? ORDER BY created_at DESC' on a write-heavy table. What do you build?",
  "options": [
    {
      "label": "One composite index on (user_id, status, created_at): equality columns first, sort column last.",
      "correct": true,
      "feedback": "Right. The equality prefix pins a contiguous slice, and created_at is already in order inside that slice, so no separate sort step. And it is a single index to maintain on every write."
    },
    {
      "label": "Three single-column indexes on user_id, status, and created_at, so the planner can combine them.",
      "feedback": "Tempting, because it feels flexible. The planner can sometimes bitmap-AND the filters, but it can never get the sort order from combined indexes, and you now pay three index maintenance writes on every insert."
    },
    {
      "label": "One composite index on (created_at, user_id, status), since the query sorts by created_at.",
      "feedback": "Sort-column-first breaks the leftmost-prefix rule for the equality filters: your user's rows are scattered across every created_at value, so the index cannot pin them."
    }
  ],
  "reveal": "In your design write, justify each index by the query it serves and the writes it taxes: name the column order and why (equality then sort), say whether it is covering, and name the index you deliberately did not add."
}
\`\`\`
`.trim()

const physicalStorageWalTeach = `
## What commit actually guarantees, and why it is fast

This lesson connects the abstractions above to real latency and durability by following data down to
the metal.

### Pages

Databases do not read or write individual rows from disk; they move fixed-size **pages** (Postgres
8KB, InnoDB 16KB). A page holds many rows plus a header and a slot directory. This is why row layout
matters: a **row-oriented** page stores whole rows together, great for "give me this order" (OLTP); a
**column-oriented** layout stores each column contiguously across rows, great for "sum revenue over
10M rows" (OLAP) because you read only the columns you need and they compress extremely well.

\`\`\`cswidget
{
  "type": "steps",
  "title": "Row page vs column scan",
  "frames": [
    {
      "note": "Three orders on a row-oriented page: each row's fields live side by side. A page holds many rows like these, plus a header and a slot directory.",
      "rows": [
        {
          "label": "row 101",
          "cells": [
            {
              "text": "id=101"
            },
            {
              "text": "cust=ana"
            },
            {
              "text": "status=paid"
            },
            {
              "text": "rev=40"
            }
          ]
        },
        {
          "label": "row 102",
          "cells": [
            {
              "text": "id=102"
            },
            {
              "text": "cust=bo"
            },
            {
              "text": "status=paid"
            },
            {
              "text": "rev=25"
            }
          ]
        },
        {
          "label": "row 103",
          "cells": [
            {
              "text": "id=103"
            },
            {
              "text": "cust=cy"
            },
            {
              "text": "status=ship"
            },
            {
              "text": "rev=90"
            }
          ]
        }
      ]
    },
    {
      "note": "The OLTP question, give me this order, is what row layout is built for: order 102 comes back whole in a single page read, every field already adjacent.",
      "rows": [
        {
          "label": "row 101",
          "cells": [
            {
              "text": "id=101",
              "state": "dim"
            },
            {
              "text": "cust=ana",
              "state": "dim"
            },
            {
              "text": "status=paid",
              "state": "dim"
            },
            {
              "text": "rev=40",
              "state": "dim"
            }
          ]
        },
        {
          "label": "row 102",
          "cells": [
            {
              "text": "id=102",
              "state": "active"
            },
            {
              "text": "cust=bo",
              "state": "active"
            },
            {
              "text": "status=paid",
              "state": "active"
            },
            {
              "text": "rev=25",
              "state": "active"
            }
          ]
        },
        {
          "label": "row 103",
          "cells": [
            {
              "text": "id=103",
              "state": "dim"
            },
            {
              "text": "cust=cy",
              "state": "dim"
            },
            {
              "text": "status=ship",
              "state": "dim"
            },
            {
              "text": "rev=90",
              "state": "dim"
            }
          ]
        }
      ]
    },
    {
      "note": "Now the OLAP question, sum revenue. The query needs only rev, but the row page drags every id, cust, and status along to reach 3 revenue values. Scale that to 10M rows and almost every byte read is wasted.",
      "rows": [
        {
          "label": "row 101",
          "cells": [
            {
              "text": "id=101",
              "state": "dropped"
            },
            {
              "text": "cust=ana",
              "state": "dropped"
            },
            {
              "text": "status=paid",
              "state": "dropped"
            },
            {
              "text": "rev=40",
              "state": "active"
            }
          ]
        },
        {
          "label": "row 102",
          "cells": [
            {
              "text": "id=102",
              "state": "dropped"
            },
            {
              "text": "cust=bo",
              "state": "dropped"
            },
            {
              "text": "status=paid",
              "state": "dropped"
            },
            {
              "text": "rev=25",
              "state": "active"
            }
          ]
        },
        {
          "label": "row 103",
          "cells": [
            {
              "text": "id=103",
              "state": "dropped"
            },
            {
              "text": "cust=cy",
              "state": "dropped"
            },
            {
              "text": "status=ship",
              "state": "dropped"
            },
            {
              "text": "rev=90",
              "state": "active"
            }
          ]
        },
        {
          "label": "at scale",
          "cells": [
            {
              "text": "x 10M rows",
              "state": "dim"
            }
          ]
        }
      ]
    },
    {
      "note": "A column-oriented layout stores each column contiguously across rows. The same 3 orders regroup into 4 runs, each holding one column's values for every row.",
      "rows": [
        {
          "label": "id col",
          "cells": [
            {
              "text": "101",
              "state": "dim"
            },
            {
              "text": "102",
              "state": "dim"
            },
            {
              "text": "103",
              "state": "dim"
            }
          ]
        },
        {
          "label": "cust col",
          "cells": [
            {
              "text": "ana",
              "state": "dim"
            },
            {
              "text": "bo",
              "state": "dim"
            },
            {
              "text": "cy",
              "state": "dim"
            }
          ]
        },
        {
          "label": "status col",
          "cells": [
            {
              "text": "paid",
              "state": "dim"
            },
            {
              "text": "paid",
              "state": "dim"
            },
            {
              "text": "ship",
              "state": "dim"
            }
          ]
        },
        {
          "label": "rev col",
          "cells": [
            {
              "text": "40",
              "state": "new"
            },
            {
              "text": "25",
              "state": "new"
            },
            {
              "text": "90",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "predict": {
        "question": "Same bytes, regrouped by column. Why do column stores also compress far better than row pages?",
        "options": [
          "Adjacent values share a type and range",
          "Columnar pages are physically larger",
          "Columnar layouts keep fewer rows per page"
        ]
      },
      "note": "Sum revenue now reads one contiguous run: 40, 25, 90 and nothing else, so SUM=155 costs a fraction of the bytes. And because adjacent values share a type and range, the run compresses extremely well. OLAP scans want columns; the single-order lookup keeps its row page.",
      "rows": [
        {
          "label": "rev col",
          "cells": [
            {
              "text": "40",
              "state": "active"
            },
            {
              "text": "25",
              "state": "active"
            },
            {
              "text": "90",
              "state": "active"
            },
            {
              "text": "SUM=155",
              "state": "new"
            }
          ]
        },
        {
          "label": "untouched",
          "cells": [
            {
              "text": "id col",
              "state": "dim"
            },
            {
              "text": "cust col",
              "state": "dim"
            },
            {
              "text": "status col",
              "state": "dim"
            }
          ]
        }
      ]
    }
  ],
  "caption": "Pages move whole; layout decides whether the bytes you move are the bytes you need."
}
\`\`\`

### Buffer pool

The database keeps hot pages in an in-memory **buffer pool** (the biggest knob in most databases,
e.g. InnoDB \`innodb_buffer_pool_size\`). Reads check the buffer pool first; a hit is a memory
access, a miss is a disk read that pulls the page in and evicts a cold one (usually via an LRU
variant). Writes modify the page **in the buffer pool**, marking it **dirty**. Dirty pages are not
written to their data-file home immediately; they are flushed later, in batches, at a **checkpoint**.
This is what lets a database absorb many writes to the same hot page as one eventual disk write.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A transaction commits and the client receives success. At that moment, has the updated data page reached its home in the data file on disk?",
  "options": [
    {
      "label": "Yes, commit means the data is on disk; that is durability",
      "feedback": "Tempting, and half right: something did reach disk before the acknowledgment. But it is not the data page, which is still sitting dirty in the buffer pool waiting for a checkpoint."
    },
    {
      "label": "Usually not; the page is still dirty in the buffer pool",
      "correct": true,
      "feedback": "Right. Writes modify the page in the buffer pool and mark it dirty, and dirty pages flush lazily in batches at a checkpoint, which is what lets many writes to one hot page cost a single eventual disk write. So at commit time the page has usually not reached its home in the data file, and something else must be carrying the durability. Keep reading: the gap you just spotted is exactly what the write-ahead log closes."
    },
    {
      "label": "Yes, because the database called 'write()' on the data file",
      "feedback": "Even after 'write()', the bytes can sit in the volatile OS page cache, which power loss wipes. Only an explicit fsync is durable, and the data page has not even gotten that far."
    }
  ]
}
\`\`\`

Which raises the durability problem: if a committed change lives only as a dirty page in volatile
memory, a crash loses it. The fix is the **write-ahead log (WAL)**.

### WAL

Before a change is considered committed, the database appends a small **redo record** describing the
change to the WAL and forces it to stable storage with **fsync**. The rule is "log before data": the
WAL record hits disk before the corresponding data page does. Because the WAL is written
**sequentially** (append-only), this is fast even though a fsync is still the single slowest thing in
the commit path. On crash recovery the database replays WAL records after the last checkpoint to
reconstruct any dirty pages that were lost, which is why a committed transaction survives a crash
even though its data page never reached disk before the failure.

**Interview nuance:** the number that drives all of this is that **sequential I/O is roughly 100x
faster than random I/O** on spinning disks, and still meaningfully faster on SSDs (which also suffer
write amplification from random writes). This one fact explains why the WAL is a sequential append
rather than random page writes, why LSM-trees win at writes, and why databases batch and checkpoint.
To amortize the fsync cost, databases use **group commit**: many concurrent transactions' WAL records
are batched into one fsync, so 500 commits can cost a handful of fsyncs instead of 500.

**Interview nuance:** the OS **page cache** sits underneath the database, so a "disk write" from the
DB may only reach the OS buffer, which is exactly why an explicit fsync (not just \`write()\`) is
required for real durability. Also, compression happens at the page level, and column stores compress
far better because adjacent values share a type and range.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "What a commit actually touches",
  "reveal": "all",
  "nodes": [
    {
      "id": "txn",
      "label": "INSERT then COMMIT",
      "kind": "client"
    },
    {
      "id": "pool",
      "label": "Buffer pool (RAM): the row changes in its page, page now dirty",
      "kind": "cache"
    },
    {
      "id": "walbuf",
      "label": "WAL buffer (RAM): redo record appended",
      "kind": "cache"
    },
    {
      "id": "wal",
      "label": "WAL on disk: sequential fsync, group-committed",
      "kind": "db"
    },
    {
      "id": "datafiles",
      "label": "Data files: dirty pages flushed to their home, random-ish",
      "kind": "db"
    },
    {
      "id": "recovery",
      "label": "Crash recovery: replay from the last checkpoint",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "txn",
      "to": "pool",
      "kind": "sync",
      "label": "1. change the row in its page"
    },
    {
      "from": "pool",
      "to": "walbuf",
      "kind": "sync",
      "label": "2. append the redo record"
    },
    {
      "from": "walbuf",
      "to": "wal",
      "kind": "sync",
      "label": "3. COMMIT: fsync, and this is the durability point"
    },
    {
      "from": "wal",
      "to": "txn",
      "kind": "feedback",
      "label": "4. success returned to the client"
    },
    {
      "from": "pool",
      "to": "datafiles",
      "kind": "async",
      "label": "5. later: CHECKPOINT flushes dirty pages"
    },
    {
      "from": "wal",
      "to": "recovery",
      "kind": "sync",
      "label": "crash before step 5"
    },
    {
      "from": "recovery",
      "to": "pool",
      "kind": "feedback",
      "label": "replay rebuilds the lost page"
    }
  ],
  "groups": [
    {
      "id": "volatile",
      "label": "Volatile: power loss wipes this",
      "nodes": [
        "pool",
        "walbuf"
      ]
    },
    {
      "id": "durable",
      "label": "Durable storage",
      "nodes": [
        "wal",
        "datafiles"
      ]
    }
  ],
  "caption": "Durability rides on the sequential WAL fsync, never on the data page: the page is still dirty in RAM at the moment the client is told the commit succeeded."
}
\`\`\`

### The durability tier above a local fsync

A local fsync covers exactly one failure: this process or this machine dying and coming back. It
does not cover the machine not coming back. If the disk is destroyed, or the instance is gone, or
the region is unreachable, that fsync'd WAL record is unreadable and the acknowledged transaction is
lost with it. The durability chain has one more link, and it is a choice you make at commit time:
**how far the WAL record must travel before the acknowledgment goes out.**

Postgres exposes this as the setting that decides where the COMMIT waits:

\`\`\`
COMMIT arrives
  |
  |-- synchronous_commit = off          ack here. Nothing is fsync'd. A crash loses recent commits.
  |-- synchronous_commit = local        ack here. Local WAL fsync'd. Survives a crash+restart.
  |-- synchronous_commit = remote_write ack here. A standby RECEIVED the record and wrote it
  |                                     (its OS has it; its own fsync may still be pending).
  |-- synchronous_commit = remote_apply ack here. A standby fsync'd AND replayed it, so a read
  |                                     on that standby already sees this transaction.
\`\`\`

Walk the same COMMIT through the last two and the cost is visible:

\`\`\`
local only:                                  remote_write to an AZ-adjacent standby:
  append WAL record       ~0.05 ms             append WAL record         ~0.05 ms
  fsync                   ~0.5  ms             fsync                     ~0.5  ms
  ------------------------------               ship record to standby    ~0.5  ms  (round trip)
  ack                     ~0.55 ms             standby acknowledges
                                               ------------------------------
  primary disk dies -> transaction gone        ack                       ~1.05 ms

                                               primary disk dies -> the standby still has it
\`\`\`

So the extra round trip roughly doubles commit latency and buys the one failure the local fsync
never covered. Two consequences follow directly. Distance is the cost, so a synchronous standby
belongs in the same region and ideally an adjacent availability zone, where the round trip is under
a millisecond rather than the tens of milliseconds a cross-continent hop costs. And the sync standby
is now in your commit path, so if it goes away, commits block: keep at least two candidates, or
accept that losing the standby stalls writes. Everything beyond that first standby stays
asynchronous, contributing read capacity and disaster recovery without taxing every commit.

Recap: writes land in in-memory pages in the buffer pool and are flushed lazily at checkpoints, while
a sequentially-written, fsync'd WAL provides the actual durability and crash recovery, all of it
shaped by the ~100x gap between sequential and random I/O. Durability is a tier, not a switch: a
local fsync survives a crash, and only a synchronous standby survives the machine.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Power dies after the commit acknowledgment but before any checkpoint flushed the dirty page. On restart, what happens to that committed transaction?",
  "options": [
    {
      "label": "It is lost: the data page never reached disk, so there is nothing to recover from.",
      "feedback": "Tempting, because the page really did live only in RAM. But durability never depended on the page. The commit's redo record was fsync'd to the WAL before the acknowledgment went out."
    },
    {
      "label": "It survives: recovery replays WAL records from the last checkpoint and rebuilds the lost page.",
      "correct": true,
      "feedback": "Right. Log before data: the sequential, fsync'd WAL is the durability point, and checkpoints are just an optimization that bounds how much replay recovery needs."
    },
    {
      "label": "It survives only if the OS page cache happened to flush in time.",
      "feedback": "The OS page cache is volatile and is exactly why 'write()' alone is not durability. The guarantee comes from the explicit fsync of the WAL, not from cache luck."
    }
  ],
  "reveal": "In your design write, when you claim a write is durable, name the mechanism: redo record fsync'd to the WAL before the acknowledgment, group commit to amortize the fsync, and checkpoint-plus-replay on crash. That chain is your answer to 'what happens if the box dies.'"
}
\`\`\`
`.trim()

const keyValueTeach = `
## The simplest database, and the discipline it forces

A key-value store is the simplest possible database: a distributed hash map. You \`GET(key)\`, you
\`PUT(key, value)\`, you \`DELETE(key)\`. There is no query language over the value, no \`WHERE\`
clause, no join. Because the access path is a hash lookup, point reads and writes are O(1) and the
fastest thing in your architecture: Redis serves reads in tens of microseconds in-process and
sub-millisecond p99 over the network, and a single node handles 100k+ ops/sec easily. This is why KV
stores are the default for caches, session stores, feature flags, rate-limit counters, and as a
building block inside bigger systems.

The defining constraint is **value opacity**. To the store, the value is a blob of bytes. You cannot
ask "give me all sessions where \`lastActive < X\`" because the store cannot see inside the value.
Whatever you want to query on must be encoded into the key. This forces the key-design discipline
that is the whole skill of this family.

### Key design

Namespace with a prefix and a delimiter so different data types never collide:
\`session:{sessionId}\`, \`user:123:profile\`, \`ratelimit:{userId}:{minuteBucket}\`. Composite keys
co-locate related lookups. The danger is **hot keys**: a single key that takes a wildly
disproportionate share of traffic (a global counter, a celebrity's profile) becomes a hotspot on
whichever shard owns it. You fight this by sharding the key (\`counter:{shard}\` summed across N
shards) or by fronting the hot key with a client-side or local cache.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your team stores login sessions in a Redis instance configured as a pure cache: no persistence, 'allkeys-lru' eviction. The node restarts. What do users experience?",
  "options": [
    {
      "label": "Nothing changes; Redis reloads its data from disk on restart",
      "feedback": "Tempting, because Redis CAN persist with AOF or RDB. But this instance is configured as a cache with persistence off, so there is nothing on disk to reload."
    },
    {
      "label": "Every user is logged out; all session data is gone",
      "correct": true,
      "feedback": "Right. A non-persistent Redis is a cache, and a cache can vanish at any moment. If sessions have no other copy, you just built a system of record on a cache."
    },
    {
      "label": "Only the sessions evicted by 'allkeys-lru' are lost",
      "feedback": "Eviction is what happens under memory pressure while the process is running. A restart with no persistence wipes the entire keyspace at once, not just the least recently used keys."
    }
  ]
}
\`\`\`

**Interview nuance:** Interviewers probe "cache or source of truth?" Memcached and a Redis instance
with no persistence are caches: if the box dies, the data is gone, and that is fine because you can
recompute it from the real database. If you use a KV store as a durable source of truth (DynamoDB, or
Redis with AOF/RDB persistence and replication), you must reason about durability, replication, and
backups just like any primary database. The common wrong turn is treating a cache-configured Redis as
a system of record, then losing data on a restart.

### TTL, eviction, and the rich data structures

Every session and counter should carry an expiry (\`SET key val EX 3600\`) so stale data
self-cleans. When memory fills, Redis evicts by policy: \`allkeys-lru\` for a pure cache,
\`volatile-lru\` to only evict keys that have a TTL, \`noeviction\` to fail writes instead of
dropping data (what you want for a source of truth).

\`\`\`cswidget
{
  "type": "cache-sim",
  "title": "A KV cache in front of the database: TTL, eviction, and the hot key",
  "predictPrompt": {
    "question": "Redis fronts the real database as a cache with room for only 6 of the 16 keys, and about half of all requests hit one hot key. Once the stream settles, what does the hit ratio look like?",
    "options": [
      "Low, because most of the keyspace can never fit in memory at once",
      "High, because the LRU keeps the hot key and its frequent neighbors resident while cold keys churn",
      "Roughly capacity divided by keys, since each key is equally likely to be requested"
    ]
  },
  "workedExample": "This is the cache-in-front-of-the-store setup: 16 distinct keys, memory for only 6, a 60-tick TTL, and a 6-tick trip to the real database on every miss. If traffic were uniform the hit ratio would be poor, but the stream is skewed: roughly half of all requests go to one hot key, and the LRU eviction policy keeps that key and its most frequent neighbors resident while the cold tail churns in and out. So the settled hit ratio lands well above what raw capacity over keys suggests. Lower the TTL toward the rebuild time and expiries start costing real database reads; the stampede toggle pushes TTL below the rebuild latency so you can watch requests pile onto the expired hot key mid-rebuild. Everything on screen is cache-configured Redis behavior: TTLs self-clean, eviction drops keys under memory pressure, and none of it is acceptable for data whose only copy lives here.",
  "seed": "kv-cache-front-l2",
  "keys": 16,
  "ticks": 240,
  "capacity": 6,
  "ttl": 60,
  "rebuildTicks": 6,
  "caption": "These knobs are the cache side of the cache-or-source-of-truth split; a source of truth gets noeviction, persistence, and a replica instead."
}
\`\`\`

**Redis is more than KV.** It ships data structures that make it a Swiss-army server: sorted sets
(leaderboards, sliding-window rate limits, priority queues), lists (simple queues), hashes (store a
session as fields you can update individually), streams (append-only log with consumer groups),
pub/sub, HyperLogLog (cardinality estimation), and vector similarity. Reaching for these instead of
raw string blobs is often the difference between a clean design and a clumsy one.

Choose the engine to the job: **Memcached** for a dumb, multi-threaded, memory-only cache; **Redis**
for a single-threaded rich-data-structure store that can also persist; **DynamoDB** for a managed,
durable, auto-sharded KV/document store with predictable single-digit-ms latency at any scale.

Recap: KV stores give O(1) opaque-blob lookups, so encode everything you query on into a namespaced
key, guard against hot keys, always TTL cache data, and never treat a non-persistent cache as your
source of truth.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You are about to design a session store and rate limiter on Redis. Sort each piece of data by what losing it on a restart would mean.",
  "buckets": [
    "Cache: losing it is acceptable",
    "Source of truth: needs persistence"
  ],
  "items": [
    {
      "label": "Live login sessions with no copy anywhere else",
      "bucket": "Source of truth: needs persistence",
      "feedback": "Losing these logs every user out. Run AOF persistence, a replica, and 'noeviction' so a full memory does not silently drop logged-in users."
    },
    {
      "label": "Per-minute rate-limit counters",
      "bucket": "Cache: losing it is acceptable",
      "feedback": "A lost counter means a user briefly gets a few extra calls. That is a cheap failure, so persistence is optional and a TTL cleans up each minute bucket."
    },
    {
      "label": "Cached results of an expensive database query",
      "bucket": "Cache: losing it is acceptable",
      "feedback": "The real database can recompute this. That recomputability is the definition of cache data: give it a TTL and let it go."
    },
    {
      "label": "The only copy of a user's shopping cart",
      "bucket": "Source of truth: needs persistence",
      "feedback": "The word 'only' is the tell. If no other system can rebuild it, it is a source of truth no matter how cache-like it feels, so it needs durability and backups."
    }
  ],
  "reveal": "This split drives every choice in the design exercise ahead: sessions get persistence, 'noeviction', and a reverse index for logout-everywhere; counters get bucketed keys with TTLs and can be lossy. Then encode everything you query on into the key, and shard any counter hot enough to melt one node."
}
\`\`\`
`.trim()

const documentTeach = `
## Schema-on-read trees, and the embed-vs-reference call

A document database stores semi-structured records, typically JSON or its binary form BSON, where
each document is a self-contained tree: nested objects, arrays, and scalars. MongoDB, Couchbase, and
Firestore are the common examples. Unlike a relational table, there is no fixed schema enforced by
the engine. It is **schema-on-read**: two documents in the same collection can have different fields,
and the application interprets shape at read time. That flexibility is the selling point (rapid
iteration, heterogeneous data, natural fit for object graphs) and the trap (nothing stops you writing
inconsistent shapes, so schema discipline moves into your application and validators).

### Embed versus reference

**Embedding** nests related data inside the parent document. A blog post document can carry its
recent comments as an array right inside it. One read returns the whole thing, no join, and the data
that is read together is stored together, which is exactly what you want on a hot read path.
**Referencing** stores an id pointer and fetches the related entity separately, the way a foreign key
works, requiring a second lookup (an application-side join, since most document stores do not join
efficiently).

The decision rule is driven by three questions. First, **is the data read together?** If you almost
always render the post and its comments on the same page, embed the recent ones. Second, **is the
related entity large or independently accessed?** An author appears on many posts; embedding a full
copy into every post duplicates data and means updating the author's name touches thousands of
documents. Reference the author. Third, **how big and how unbounded is it?** This is the killer.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A blog post document embeds its full comments array so one read returns everything. The post goes viral and comments never stop arriving. What eventually happens in MongoDB?",
  "options": [
    {
      "label": "Reads get gradually slower but everything keeps working",
      "feedback": "Tempting, and reads do bloat first: every fetch drags the whole array. But bloat is not the end state. There is a hard ceiling waiting."
    },
    {
      "label": "Writes to the post fail when the document hits the 16MB cap",
      "correct": true,
      "feedback": "Right. MongoDB caps a document at 16MB, so an unbounded embedded array is a time bomb: one day the append is rejected. Unbounded growth is the strongest signal to reference instead of embed."
    },
    {
      "label": "MongoDB automatically splits the document across shards",
      "feedback": "Sharding distributes a collection across servers by shard key. A single document is never split; it must fit inside the cap on its own."
    }
  ]
}
\`\`\`

**Document size limits.** MongoDB caps a single document at **16MB**. A post with an unbounded,
ever-growing comments array will eventually hit that ceiling and the write fails. So the real pattern
is hybrid: **embed a bounded, frequently-read subset** (the latest 20 comments, denormalized author
name and avatar for display) and **reference the unbounded remainder** (the full comment history
lives in its own collection, keyed by post id). This gives you a fast first render and a scalable
long tail.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Embedding an unbounded array, in bytes",
  "predictPrompt": {
    "question": "A post document embeds its entire comment array at roughly 800 bytes per comment. How many comments fit before the 16MB cap makes the write fail outright?",
    "options": [
      "About 2,000",
      "About 20,000",
      "About 200,000",
      "There is no hard limit; the document just keeps growing"
    ]
  },
  "workedExample": "The initial post is 12 KB of ordinary fields plus 500 embedded comments at 800 bytes each, so the document is about 412 KB, a comfortable 2.6 percent of the 16MB cap. The number that actually matters is the third output: about 20,000 comments before a write is simply rejected. Drag comments to 100,000, which a popular thread reaches, and the document is 80 MB, five times over the cap, while every read of that post has long been dragging the whole array across the wire to render twenty of them. The hybrid figure never moves, because it embeds a bounded 20 and references the rest.",
  "inputs": [
    {
      "kind": "slider",
      "id": "base_kb",
      "label": "The post's own fields",
      "min": 1,
      "max": 200,
      "scale": "linear",
      "step": 1,
      "initial": 12,
      "unit": "KB"
    },
    {
      "kind": "slider",
      "id": "comments",
      "label": "Comments on the post",
      "min": 10,
      "max": 1000000,
      "scale": "log",
      "initial": 500,
      "unit": "comments"
    },
    {
      "kind": "slider",
      "id": "comment_bytes",
      "label": "Bytes per embedded comment",
      "min": 200,
      "max": 4000,
      "scale": "linear",
      "step": 100,
      "initial": 800,
      "unit": "bytes"
    }
  ],
  "outputs": [
    {
      "id": "doc_bytes",
      "label": "Document size with the whole array embedded",
      "expr": "base_kb * 1000 + comments * comment_bytes",
      "format": "bytes",
      "sparkline": {
        "over": "comments"
      }
    },
    {
      "id": "cap_share",
      "label": "Share of the 16MB document cap",
      "expr": "doc_bytes / 16000000",
      "format": "percent"
    },
    {
      "id": "headroom",
      "label": "Comments this document can hold before writes fail",
      "expr": "floor((16000000 - base_kb * 1000) / comment_bytes)",
      "format": "compact",
      "unit": "comments"
    },
    {
      "id": "hybrid_bytes",
      "label": "Hybrid: newest 20 embedded, the rest referenced",
      "expr": "base_kb * 1000 + 20 * comment_bytes",
      "format": "bytes"
    }
  ],
  "caption": "Embedding is free while the array is bounded. The cap is the hard failure, and the read cost arrives long before it: one read returns the whole thing whether the page renders twenty comments or twenty thousand."
}
\`\`\`

**Interview nuance:** The question that separates juniors from seniors is transactions. **Atomicity
is guaranteed per document.** A single document update (including nested fields and arrays) is
atomic, all-or-nothing. Multi-document transactions exist in modern MongoDB but are the exception,
cost more, and were not available for years. So the idiomatic move is to model an operation that must
be atomic as a single document. If updating a post and its comment count must happen together, put
the count inside the post document and increment it in the same write. Reaching for multi-document
transactions to patch a bad model is the wrong turn.

**Indexing.** You can index nested fields (\`author.id\`) and array elements (multikey indexes on
\`tags\`). Plan indexes to your queries just as in SQL; an unindexed query on millions of documents
is a full collection scan. And because there is no engine-enforced schema, plan **schema
versioning**: stamp documents with a \`schemaVersion\`, migrate lazily on read or with a background
job, and let your app handle multiple shapes during the transition.

\`\`\`csdiagram
{
  "type": "er",
  "tables": [
    {
      "name": "posts",
      "columns": [
        {
          "name": "_id",
          "key": "pk"
        },
        {
          "name": "title"
        },
        {
          "name": "body"
        },
        {
          "name": "author.id",
          "key": "fk"
        },
        {
          "name": "author.name",
          "type": "denormalized copy"
        },
        {
          "name": "author.avatar",
          "type": "denormalized copy"
        },
        {
          "name": "recentComments",
          "type": "embedded, bounded x20"
        },
        {
          "name": "commentCount",
          "type": "embedded counter"
        }
      ]
    },
    {
      "name": "comments",
      "columns": [
        {
          "name": "_id",
          "key": "pk"
        },
        {
          "name": "postId",
          "key": "fk"
        },
        {
          "name": "authorId",
          "key": "fk"
        },
        {
          "name": "body"
        },
        {
          "name": "createdAt"
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "posts",
      "to": "comments",
      "kind": "1-n",
      "label": "full unbounded history, referenced by postId"
    }
  ],
  "caption": "The hybrid layout: the post embeds the bounded read-together subset (latest 20 comments, the author's display fields, the counter it increments atomically in the same write) and references the unbounded remainder, so one read renders the page and no document grows toward the 16MB cap."
}
\`\`\`

Recap: Model to the access pattern, embed bounded read-together data and reference large or unbounded
entities, respect the 16MB document cap, and treat per-document atomicity as a design constraint
rather than assuming relational multi-row transactions.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You are about to model a blog platform in a document store. Place each piece of the post page where the lesson's decision rule puts it.",
  "buckets": [
    "Embed in the post document",
    "Reference in its own collection"
  ],
  "items": [
    {
      "label": "The latest 20 comments with each author's display name",
      "bucket": "Embed in the post document",
      "feedback": "Read together on every page view and bounded at 20, so embedding buys a one-read first render without risking the size cap."
    },
    {
      "label": "The full comment history",
      "bucket": "Reference in its own collection",
      "feedback": "Unbounded, so it lives in a comments collection keyed by post id. Embedding it is the 16MB time bomb from earlier."
    },
    {
      "label": "The comment count shown next to the title",
      "bucket": "Embed in the post document",
      "feedback": "Keeping the counter inside the post means adding a comment and bumping the count can ride one atomic per-document write, no multi-document transaction needed."
    },
    {
      "label": "The author's complete profile with bio and settings",
      "bucket": "Reference in its own collection",
      "feedback": "Large, independently accessed, and shown on many posts. Embed only the display fields (name, avatar) and reference the rest, or a name change touches thousands of documents."
    }
  ],
  "reveal": "That is the hybrid pattern: embed the bounded read-together subset, reference the unbounded or shared remainder, and lean on per-document atomicity instead of multi-document transactions. Carry it straight into the design exercise, and stamp a schemaVersion so tomorrow's shape changes migrate lazily."
}
\`\`\`
`.trim()

const wideColumnTeach = `
## A distributed, sorted map of maps

Wide-column stores (Cassandra, ScyllaDB, HBase, Bigtable) are the write-heavy workhorse of
internet-scale systems: message history, activity feeds, event logs, time-series, and anything
ingesting a firehose of writes that must never block. The mental model is not a spreadsheet of
columns. It is a **distributed, sorted map of maps**: data is grouped into **partitions** (spread
across the cluster by a hash of the partition key), and within a partition, rows are **sorted** by
clustering columns. Get those two concepts right and this family is straightforward; get them wrong
and it falls over.

**Why it is write-optimized.** Cassandra uses an **LSM tree**. A write appends to a commit log and an
in-memory memtable and returns immediately: no in-place update, no read-before-write. Memtables flush
to immutable **SSTables** on disk, later merged by compaction. This makes writes extremely cheap and
sequential, so a cluster absorbs millions of writes per second and scales writes linearly by adding
nodes. The cost is read amplification (a read may touch several SSTables) and the operational weight
of compaction.

### Query-first modeling

There are **no joins** and essentially no ad-hoc queries. You cannot efficiently query a column that
is not part of the key. So you model **one denormalized table per access pattern**: decide the query
first, then build a table whose partition key and clustering columns serve exactly that query in a
single partition read. If you have two query shapes, you write the data twice into two tables. This
feels wasteful to a relational mind and is completely normal here; storage is cheap, and
denormalization is the price of linear-scale reads and writes.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your messages table is partitioned by 'conversation_id'. A new screen needs 'all messages sent by user X'. What is the idiomatic Cassandra move?",
  "options": [
    {
      "label": "Add a secondary index on the sender column",
      "feedback": "The natural SQL reflex, which is exactly why interviewers ask it. A Cassandra secondary index fans the query out to every partition across the cluster, a scatter-gather that does not scale and is an anti-pattern for high-cardinality columns like user id."
    },
    {
      "label": "Write each message twice, into a second table partitioned by sender",
      "correct": true,
      "feedback": "Right. One denormalized table per access pattern: 'messages_by_sender' keyed on the sender serves the new query from a single partition. Double-writing feels wasteful to a relational mind and is completely normal here."
    },
    {
      "label": "Run the query with a full scan and filter on the sender in the app",
      "feedback": "Tempting because it works in development on a tiny dataset. In production it reads every partition on every request, which is the same scatter-gather problem with even less help from the database."
    }
  ]
}
\`\`\`

The **partition key** decides which node owns the data and must both spread load evenly and gather
everything a query needs into one partition. The **clustering columns** decide the sort order inside
the partition, so a "most recent first" query becomes a contiguous slice. For message history:
partition by \`conversation_id\` so all of a conversation's messages live together, cluster by
\`created_at\` **descending** so "load the latest 50" is the first 50 rows of the partition.

### The two lethal failure modes

1. **Unbounded partitions.** Partition purely by \`conversation_id\` and a chatty conversation grows
   forever. Cassandra partitions have practical limits (aim for under ~100MB and ~100k rows); an
   unbounded partition eventually causes slow reads, GC pressure, and node instability. The fix is
   **time-bucketing**: make the partition key composite, \`(conversation_id, month)\`, so each
   partition is bounded and old buckets age out.
2. **Hot partitions.** A celebrity conversation or viral thread concentrates traffic on the one node
   owning that partition. Mitigate with **sub-partitioning**: add a bucket to the key
   (\`(conversation_id, bucket)\` where bucket is 0..N) to spread a hot entity across N partitions,
   at the cost of a scatter-gather read.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Diagnose each situation as one of the two lethal partition failure modes.",
  "buckets": [
    "Unbounded partition: time-bucket it",
    "Hot partition: sub-partition it"
  ],
  "items": [
    {
      "label": "A years-old group chat partitioned only by 'conversation_id' keeps growing",
      "bucket": "Unbounded partition: time-bucket it",
      "feedback": "Size is the problem, not traffic. A composite key like (conversation_id, month) bounds each partition and lets old buckets age out."
    },
    {
      "label": "A celebrity AMA thread is read by millions of users at once",
      "bucket": "Hot partition: sub-partition it",
      "feedback": "Traffic is the problem: one node owns the partition and takes the whole load. Adding a bucket 0..N to the key spreads it across N partitions, paying a scatter-gather on read."
    },
    {
      "label": "An IoT sensor appends readings forever to a partition keyed by 'device_id'",
      "bucket": "Unbounded partition: time-bucket it",
      "feedback": "Classic unbounded growth: steady per-device traffic, but the partition swells past the roughly 100MB and 100k-row comfort zone. Bucket by day or month."
    },
    {
      "label": "Every like on a viral post increments counters in one post partition",
      "bucket": "Hot partition: sub-partition it",
      "feedback": "The partition may stay small, but write traffic concentrates on the single owning node. Spread the counters across sub-partition buckets and sum on read."
    }
  ]
}
\`\`\`

**Consistency is tunable per query.** Cassandra is a Dynamo-style AP system with **tunable
consistency**: you choose how many replicas must acknowledge. \`ONE\` (fast, may read stale),
\`QUORUM\` (majority). If reads and writes both use QUORUM on replication factor 3, read-quorum (2)
plus write-quorum (2) overlap by at least one replica, so a read always sees the latest acknowledged
write (read-your-writes freshness) for that key while tolerating one node down. That is **quorum
consistency**, not linearizability: the overlap does not order concurrent writes, which can land on
different quorums and produce conflicting versions that still need reconciling.

\`\`\`cswidget
{
  "type": "quorum",
  "title": "The Cassandra dial: N=3, R=2, W=2",
  "predictPrompt": {
    "question": "N=3 with reads and writes both at QUORUM. Two clients write different values to the same key at the same moment, each acknowledged by 2 replicas. What has the overlap guaranteed?",
    "options": [
      "One write is ordered ahead of the other, and the loser is rejected",
      "A later read sees at least one copy of an acknowledged write, but the two versions still need reconciling",
      "Nothing: with two writers in flight the quorum guarantee does not apply"
    ]
  },
  "workedExample": "Start at N=3, R=2, W=2. R + W = 4, which is greater than N = 3, so any read set and any acknowledged write set share at least one replica and a read cannot miss a write that was acknowledged before it started. Kill one replica and writes keep flowing, because 2 of the 2 survivors can still acknowledge. Now drag R down to 1: R + W = 3 is no longer greater than 3, the two sets can be disjoint, and the single replica you happen to ask may be the one the write never reached. What no setting of this dial buys you is an ordering between two writes issued at the same moment to different quorums.",
  "preset": "dynamo",
  "n": 3,
  "r": 2,
  "w": 2,
  "caption": "Overlap is a freshness guarantee, not an ordering one. Find the settings where R + W > N holds, then say out loud what they still do not promise."
}
\`\`\`

**Interview nuance:** The classic question is "why not just add a secondary index in Cassandra?"
Answer: Cassandra secondary indexes query across all partitions (a scatter-gather that does not
scale) and are an anti-pattern for high-cardinality columns; the idiomatic solution is a second
denormalized table, not an index.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "partition key (conversation_id, month)",
    "owning node",
    "row",
    "created_at (clustering, DESC)",
    "what it shows"
  ],
  "rows": [
    [
      "(conv_42, 2026-07)",
      "node B",
      1,
      "07-23 09:14",
      "newest message: 'latest 50' starts here"
    ],
    [
      "(conv_42, 2026-07)",
      "node B",
      2,
      "07-23 08:57",
      "rows are pre-sorted; the slice just reads forward"
    ],
    [
      "(conv_42, 2026-07)",
      "node B",
      3,
      "07-22 18:03",
      "still the same partition on the same node"
    ],
    [
      "(conv_42, 2026-06)",
      "node D",
      1,
      "06-30 23:59",
      "month bucket bounds partition size; old buckets age out"
    ],
    [
      "(conv_7, 2026-07)",
      "node A",
      1,
      "07-21 11:02",
      "a different conversation hashes to a different node"
    ]
  ],
  "highlightCols": [
    "created_at (clustering, DESC)"
  ],
  "caption": "PRIMARY KEY ((conversation_id, month), created_at DESC) laid out physically: the partition key picks the owning node and gathers the conversation, the clustering column pre-sorts it, so 'load the latest 50' is the first 50 rows of the current-month partition, one contiguous slice on one node."
}
\`\`\`

Recap: Wide-column stores are LSM-based write machines; model one denormalized table per query,
choose a partition key that spreads load and co-locates the query, cluster to serve the sort, always
bound partitions with time-bucketing, sub-partition hot keys, and tune quorum for the consistency you
need.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Time to design chat message history yourself. Which primary key serves 'latest 50 messages in a conversation' fast and stays healthy for years?",
  "options": [
    {
      "label": "PRIMARY KEY (conversation_id) with messages clustered by 'created_at' ascending",
      "feedback": "Close: one partition per conversation does co-locate the query. But it is unbounded, so a chatty conversation eventually blows past partition limits, and ascending order puts the latest messages at the wrong end of the slice."
    },
    {
      "label": "PRIMARY KEY ((conversation_id, month)) with 'created_at' descending as the clustering column",
      "correct": true,
      "feedback": "Right. The month bucket bounds every partition, hashing on the composite key spreads load, and descending order makes 'latest 50' the first 50 rows of the current bucket: one contiguous slice on one node."
    },
    {
      "label": "PRIMARY KEY (created_at) with 'conversation_id' as the clustering column",
      "feedback": "Tempting because time feels like the natural axis, but this scatters each conversation across the cluster and funnels all current writes into the single partition owning 'now', a hot partition by construction."
    }
  ],
  "reveal": "That key is the whole method compressed: query first, partition key that spreads load and gathers the read, clustering that serves the sort, time-bucket for bounds, sub-partition if a conversation goes viral. In the design write, state the query, then the key, then which quorum settings you accept and why."
}
\`\`\`
`.trim()

const graphTeach = `
## Built for one thing: traversing relationships

A graph database (Neo4j, JanusGraph, Amazon Neptune, TigerGraph) models data as **nodes** (entities),
**edges** (relationships), and **properties** on both. It is purpose-built for one thing:
**traversing relationships**, especially deep, multi-hop ones. If your dominant queries are "friends
of friends," "who influenced whom across 5 hops," "find the fraud ring connecting these accounts," or
"recommend items bought by people who bought what you bought," a graph database is the right tool. If
your queries are mostly "get this row by id" or "filter this table," it is the wrong tool.

### Index-free adjacency

In a relational database, a relationship is a foreign key, and following it means a lookup (often an
index seek into another table). Following it N times, a multi-hop traversal, means N joins, and each
join can multiply the intermediate result set. In a native graph database, each node holds **direct
pointers to its adjacent edges and nodes**. Traversing from a node to its neighbors is a pointer hop,
roughly O(1) per step regardless of how big the total graph is, because you never consult a global
index to find neighbors. The cost of a traversal is proportional to the portion of the graph you
actually touch (the local neighborhood), not the size of the whole dataset. This is why "friends of
friends of friends" stays fast in Neo4j while the equivalent 3-way self-join degrades in SQL.

**Why recursive relational joins blow up.** Friends-of-friends in SQL on a
\`friendships(user_a, user_b)\` table: one hop is one self-join, two hops is a self-join of a
self-join, and the intermediate result is roughly users times average degree squared. At depth 4 or 5
on a social graph with average degree 200+, intermediate rows explode into the billions and the
optimizer chokes. The graph engine instead walks outward from the start node, visiting only reachable
nodes, deduplicating as it goes.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Join rows versus people reached, by traversal depth",
  "predictPrompt": {
    "question": "On a social graph where the average person has 200 friends, how many intermediate rows does a 5-hop friends-of-friends self-join materialize before deduplication?",
    "options": [
      "About 1,000",
      "About 1 million",
      "About 320 billion",
      "At most 1 billion, because that is how many people exist"
    ]
  },
  "workedExample": "At the initial 200 friends each and 3 hops, the chain of self-joins materializes 200 x 200 x 200, which is 8 million intermediate rows. That is still well under the 1 billion people in the graph, so the join is producing roughly one row per person it finds and SQL copes. Now drag hops to 5: the same arithmetic gives 320 billion rows describing at most 1 billion distinct people, which is 320 rows materialized for every person a traversal would have visited once.",
  "inputs": [
    {
      "kind": "slider",
      "id": "avg_degree",
      "label": "Average friends per person",
      "min": 5,
      "max": 1000,
      "scale": "log",
      "initial": 200,
      "unit": "friends"
    },
    {
      "kind": "slider",
      "id": "hops",
      "label": "Traversal depth",
      "min": 1,
      "max": 6,
      "scale": "linear",
      "step": 1,
      "initial": 3,
      "unit": "hops"
    },
    {
      "kind": "slider",
      "id": "people",
      "label": "People in the graph",
      "min": 100000,
      "max": 3000000000,
      "scale": "log",
      "initial": 1000000000,
      "unit": "people"
    }
  ],
  "outputs": [
    {
      "id": "join_rows",
      "label": "Intermediate rows the self-join materializes",
      "expr": "pow(avg_degree, hops)",
      "format": "compact",
      "unit": "rows",
      "sparkline": {
        "over": "hops"
      }
    },
    {
      "id": "reached",
      "label": "Distinct people that depth can reach",
      "expr": "min(join_rows, people)",
      "format": "compact",
      "unit": "people"
    },
    {
      "id": "rows_per_person",
      "label": "Rows materialized per distinct person found",
      "expr": "join_rows / reached",
      "format": "compact",
      "unit": "x"
    }
  ],
  "caption": "Paths grow exponentially with depth; people do not. The graph engine walks outward and dedupes as it goes, so its work tracks the people it reaches, while the join's work tracks the paths."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your app's only relationship query is 'show this user's direct friends', one hop, millions of times a day. Which store fits?",
  "options": [
    {
      "label": "A graph database; friendships are literally a graph",
      "feedback": "Tempting: the data is graph-shaped. But tool choice follows query depth, not data shape. One hop never triggers the join explosion, so you would be adopting a new datastore and its operational burden for no win."
    },
    {
      "label": "An indexed friendships table in the SQL database you already run",
      "correct": true,
      "feedback": "Right. A one-hop lookup is a single indexed query on an adjacency table. The graph engine earns its place only when traversals get deep or variable-length."
    },
    {
      "label": "Either one; they perform about the same at any depth",
      "feedback": "They do perform similarly at 1 or 2 hops, and that is precisely the argument for the simpler SQL option. The gap opens at depth 3 and beyond, where intermediate join results explode."
    }
  ]
}
\`\`\`

**Query languages.** Neo4j uses **Cypher**, an ASCII-art pattern language:
\`MATCH (me:User {id:1})-[:FRIEND*1..2]-(fof) RETURN DISTINCT fof\` finds everyone 1 to 2 hops away.
Gremlin (Apache TinkerPop) is the imperative traversal alternative, and GQL is the emerging standard.
Knowing that \`-[:REL*1..3]-\` expresses variable-length paths is the interview-relevant literacy.

### When you do NOT need a graph database

This is the senior judgment call. If your traversals are **shallow (1 or 2 hops)**, a plain
**adjacency table in SQL with the right indexes** is completely adequate and saves you a whole new
datastore, its operational burden, and its scaling weaknesses. "Show a user's direct friends" is one
indexed query. Only when depth grows, the patterns get variable-length, or path/relationship queries
dominate does the graph engine earn its place.

**Interview nuance:** The tradeoff interviewers want you to name is **horizontal scaling**. Graphs
are hard to shard because a good partition would cut edges, and the whole point is fast
edge-following, so a traversal that crosses partitions pays a network hop per boundary and the
index-free-adjacency advantage evaporates. Native graph databases often prefer to scale up (bigger
machine, replicas for read scaling) rather than out. So the honest position is: graph databases are
unbeatable for deep-traversal query complexity but weaker on raw horizontal write scale than
Cassandra. Recommendation and fraud systems at extreme scale often precompute or use specialized
graph-processing systems rather than a single serving graph database.

Recap: Graph databases win when relationships are first-class and traversals are deep, thanks to
index-free adjacency that keeps traversal cost local; recursive SQL joins explode at depth, but a
1-to-2-hop adjacency table in SQL is often the right, simpler choice, and the graph engine's weakness
is horizontal scaling.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A fraud team needs 'rings of accounts connected through shared devices and payment methods, up to 5 hops out'. Query volume is modest. What do you propose, and what caveat do you name unprompted?",
  "options": [
    {
      "label": "A graph database, with the caveat that sharding it is hard because partitions cut edges",
      "correct": true,
      "feedback": "Right on both counts. Deep, variable-length traversal is exactly what index-free adjacency is for, and the honest caveat is that a traversal crossing shard boundaries pays a network hop per edge, so graph stores often scale up rather than out."
    },
    {
      "label": "Recursive SQL joins; five self-joins on an indexed table are fine",
      "feedback": "Tempting because 1-hop and 2-hop worked fine in SQL. But intermediate results grow roughly with average degree raised to the depth, so at 5 hops on a well-connected graph the rows explode into the billions."
    },
    {
      "label": "Cassandra, because fraud checks need internet-scale write throughput",
      "feedback": "Cassandra is the write-scale champion, but it has no traversal primitive at all: every hop is another round-trip query, and 5-hop ring detection becomes application-side join code. Wrong axis of scale for this problem."
    }
  ],
  "reveal": "That is the full judgment this lesson builds: match the tool to traversal depth, name index-free adjacency as the reason deep queries stay local, and volunteer the sharding weakness before the interviewer asks. Use exactly that structure in the design write."
}
\`\`\`
`.trim()

const timeSeriesTeach = `
## Time is the primary axis

A time-series database (TSDB) is specialized for a distinct workload: **append-heavy, time-ordered
writes** of measurements, where **time is the primary axis** of both storage and query. Metrics and
monitoring (Prometheus), IoT sensor data (InfluxDB, TimescaleDB), observability, financial ticks, and
anything that is fundamentally "value at timestamp, tagged by source" fits. Writes almost always
append at the current time (you rarely update the past), reads are overwhelmingly **range scans**
("CPU for host X over the last hour"), and old data is queried less and less as it ages.

### Why not just use Postgres?

You can start there, but three properties of the workload make a purpose-built engine win at scale.

**1. Columnar storage + specialized compression.** A time series is a column of numbers with
regularly spaced timestamps, which compresses extraordinarily well stored column-wise.
**Delta-of-delta** encoding on timestamps: if points arrive every 10 seconds, the delta is constant
and the delta-of-delta is 0, packing to almost nothing. **Gorilla / XOR** compression on values
(Facebook's Gorilla paper): consecutive float values are often close, so XORing them leaves mostly
zero bits. Together these routinely hit **10x or better** compression versus row storage, the
difference between affordable and ruinous at millions of points per second.

**2. Time-partitioned storage and retention.** Data is written into **time-bucketed partitions**
(chunks by day or hour). Range queries touch only the relevant chunks, dropping old data is an O(1)
partition drop instead of a mass DELETE, and tiering puts recent hot data on fast SSD, warm data on
cheaper disk, and ancient data downsampled or in object storage.

**3. Downsampling and rollups.** You do not keep raw per-second points forever. **Retention
policies** plus **rollups** keep raw data for, say, 7 days, 1-minute aggregates for 30 days, and
1-hour aggregates for 2 years. A dashboard showing last-year trends reads the cheap hourly rollup,
not billions of raw points.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A dashboard charts one year of CPU usage for a whole fleet. In a well-configured TSDB, which data does that query actually read?",
  "options": [
    {
      "label": "The raw per-second points; anything else would be inaccurate",
      "feedback": "Tempting, but the retention policy already dropped raw points after about a week, and a year of per-second data is billions of points no chart could render anyway. A year-view pixel is far wider than an hour."
    },
    {
      "label": "The 1-hour rollups, touching only the chunks in the query range",
      "correct": true,
      "feedback": "Right. Rollups mean the query reads a few thousand pre-aggregated points instead of billions, and time-partitioned chunks mean it never even opens data outside the range."
    },
    {
      "label": "A full scan of every chunk, filtered down to the requested year",
      "feedback": "Time-partitioned storage exists precisely to avoid this: the engine prunes to the chunks overlapping the range before reading anything. A full scan is the row-store behavior the TSDB was built to escape."
    }
  ]
}
\`\`\`

### The signature failure mode: cardinality explosion

This is the single thing interviewers test. A time series is identified by its metric name plus its
**set of tag/label key-value pairs**: \`http_requests{host, region, status, endpoint, user_id}\`.
The number of distinct series is the **product** of the distinct values of every tag. Add a
high-cardinality tag like \`user_id\` (millions of values) or \`request_id\` (unbounded) and you
multiply your series count into the millions or billions. Each distinct series needs its own index
entry and storage stream, so cardinality explosion blows up index memory, slows every query, and can
OOM the database. Prometheus falling over because someone added a \`user_id\` label is a real, common
outage.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Series count is a product, not a sum",
  "predictPrompt": {
    "question": "Your metric already carries 50,000 active series. Product asks for a 'user_id' label with 2 million distinct values. How many series do you end up with?",
    "options": [
      "About 50,000: labels describe points, not series",
      "About 2 million: one series per user",
      "About 2,050,000: the label adds its values on top",
      "About 100 billion: the label multiplies every series you already had"
    ]
  },
  "workedExample": "The initial 500 hosts, 20 endpoint templates and 5 status codes multiply out to 500 x 20 x 5 = 50,000 active series, and at roughly 3 KB of index and head-chunk memory each that is about 150 MB. Every label multiplies the ones before it, it never adds. Switch the extra label from none to user_id and those 50,000 become 100 billion, which is also why a shorter retention would not save you: retention bounds how long a point lives, not how many series are active.",
  "inputs": [
    {
      "kind": "slider",
      "id": "hosts",
      "label": "Distinct hosts",
      "min": 10,
      "max": 100000,
      "scale": "log",
      "initial": 500,
      "unit": "hosts"
    },
    {
      "kind": "slider",
      "id": "endpoints",
      "label": "Endpoint templates",
      "min": 1,
      "max": 200,
      "scale": "linear",
      "step": 1,
      "initial": 20,
      "unit": "routes"
    },
    {
      "kind": "slider",
      "id": "statuses",
      "label": "Status codes emitted",
      "min": 1,
      "max": 25,
      "scale": "linear",
      "step": 1,
      "initial": 5,
      "unit": "codes"
    },
    {
      "kind": "select",
      "id": "extra_label",
      "label": "One more label, as requested by product",
      "initial": 0,
      "options": [
        {
          "label": "none",
          "value": 1
        },
        {
          "label": "region (5 values)",
          "value": 5
        },
        {
          "label": "customer_id (50k values)",
          "value": 50000
        },
        {
          "label": "user_id (2M values)",
          "value": 2000000
        }
      ]
    },
    {
      "kind": "slider",
      "id": "bytes_per_series",
      "label": "Index and head-chunk memory per active series",
      "min": 500,
      "max": 5000,
      "scale": "linear",
      "step": 100,
      "initial": 3000,
      "unit": "bytes"
    }
  ],
  "outputs": [
    {
      "id": "base_series",
      "label": "Series before the new label",
      "expr": "hosts * endpoints * statuses",
      "format": "compact",
      "unit": "series"
    },
    {
      "id": "series",
      "label": "Active series after it",
      "expr": "base_series * extra_label",
      "format": "compact",
      "unit": "series"
    },
    {
      "id": "index_memory",
      "label": "Memory the index must hold",
      "expr": "series * bytes_per_series",
      "format": "bytes"
    }
  ],
  "caption": "The index holds one entry per ACTIVE series, so the memory arrives on day one, before a single point has aged out. That is why the fix is bounding labels, not shortening retention."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You are labeling the metric 'http_requests'. Sort each candidate label before the pager does it for you.",
  "buckets": [
    "Safe: bounded cardinality",
    "Cardinality bomb"
  ],
  "items": [
    {
      "label": "'status' (HTTP status code)",
      "bucket": "Safe: bounded cardinality",
      "feedback": "A few dozen possible values at most. Multiplying series count by a small constant is what labels are for."
    },
    {
      "label": "'region' (deployment region)",
      "bucket": "Safe: bounded cardinality",
      "feedback": "You run a handful of regions and the set changes rarely. Bounded and operator-controlled: safe."
    },
    {
      "label": "'endpoint' as a route template like '/users/:id'",
      "bucket": "Safe: bounded cardinality",
      "feedback": "The template collapses every user's URL onto one value, so cardinality equals your route count. This is the safe way to get per-endpoint metrics."
    },
    {
      "label": "'url' as the raw path with query parameters",
      "bucket": "Cardinality bomb",
      "feedback": "Tempting because it looks like just 'more detailed endpoint', but every distinct id and query string mints a brand-new series. Unbounded by construction."
    },
    {
      "label": "'user_id'",
      "bucket": "Cardinality bomb",
      "feedback": "Millions of values, each multiplying against every other label. This is the label that famously OOMs Prometheus; per-user analytics belongs in an OLAP store or logs."
    },
    {
      "label": "'request_id'",
      "bucket": "Cardinality bomb",
      "feedback": "One new series per request, the worst possible case: infinite cardinality and every series has exactly one point. That is a log line wearing a metric costume."
    }
  ]
}
\`\`\`

**Controlling cardinality** is the core design skill: keep labels **low-cardinality and bounded**
(host, region, status code, endpoint template), never put unbounded identifiers (user id, request id,
full URL with query params, email) into labels. If you need per-user analytics, that belongs in an
OLAP store (ClickHouse) or logs, not in a metrics TSDB. Use endpoint **templates** (\`/users/:id\`)
not raw paths.

**Interview nuance:** Know the landscape. **Prometheus** is pull-based metrics with its own TSDB,
great for infra monitoring, not for long-term high-cardinality analytics. **InfluxDB / TimescaleDB**
(the latter is Postgres with time-series superpowers, so you keep SQL and joins) are general TSDBs.
**ClickHouse** is a columnar OLAP database often used for high-cardinality, high-volume time-series
analytics where you need arbitrary group-bys that would kill a label-indexed TSDB.

Recap: TSDBs exploit append-only, time-ordered, columnar data with delta-of-delta and Gorilla
compression, time-partitioning, retention tiers, and downsampling to make metrics affordable, and the
failure mode you must design against is cardinality explosion from unbounded tags.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Product asks for per-user request latency, and a teammate proposes adding a 'user_id' label to the existing Prometheus latency metric. What is the senior counter-proposal?",
  "options": [
    {
      "label": "Accept it; delta-of-delta and XOR compression will absorb the extra data",
      "feedback": "Tempting because the lesson just praised TSDB compression, but compression shrinks points within one series. The label multiplies the number of series, and it is the per-series index entries that blow up memory."
    },
    {
      "label": "Keep metric labels bounded and route per-user analytics to an OLAP store or logs",
      "correct": true,
      "feedback": "Right. Metrics answer 'how is the system doing' with bounded labels like endpoint template and status; per-user questions are high-cardinality analytics, which is ClickHouse or log territory. Two tools, each doing what it is built for."
    },
    {
      "label": "Add the label but cut retention to 24 hours so the data stays small",
      "feedback": "Retention bounds time, not series count. The index must hold every active series regardless of how quickly old points expire, so the memory blow-up arrives on day one."
    }
  ],
  "reveal": "This is the whole lesson in one decision: TSDBs win through append-only columnar storage, compression, chunked retention, and rollups, but only while the series count stays bounded. In the design exercise, name your labels explicitly and defend the cardinality of each one."
}
\`\`\`
`.trim()

const vectorEmbeddingsTeach = `
## Similarity search is the whole product

A vector database stores **embeddings**, high-dimensional numeric vectors (typically 384 to 3072
dimensions) produced by an embedding model, and answers **similarity search**: "give me the K stored
vectors closest to this query vector." This is the retrieval backbone of semantic search,
recommendations, deduplication, and RAG (retrieval-augmented generation), where you embed a user's
question, find the most similar document chunks, and feed them to an LLM as context. The whole value
is that "closeness" in embedding space approximates semantic meaning, so a query for "how do I reset
my password" retrieves a chunk about "recovering account access" even with zero shared keywords.

**Why not exact search.** Finding the true nearest neighbors means comparing the query against every
stored vector, O(N x d). At a few thousand vectors that is fine; at millions or billions it is far
too slow for an interactive query. So vector databases use **ANN (approximate nearest neighbor)**
search: give up a small amount of **recall** (you might miss a few of the true top-K) in exchange for
orders-of-magnitude faster queries. The central tradeoff of the whole family is **recall vs latency
vs memory**, and picking an index is picking a point on that surface.

### The index families you must know

**HNSW (Hierarchical Navigable Small World)** builds a layered graph where each vector links to
nearby vectors; search greedily hops through the graph from a coarse top layer down to a fine bottom
layer. It gives **high recall at low latency** and is the default for most workloads. The cost is
**memory**: the graph and vectors live in RAM, so it is expensive at billion scale. Tunable knobs:
\`M\` (links per node) and \`efSearch\` (candidates explored, higher = better recall, slower).

**IVF (Inverted File)** clusters vectors into \`nlist\` partitions (via k-means) and, at query time,
only searches the few nearest partitions (\`nprobe\`). More memory-efficient and faster to build than
HNSW but lower recall unless you probe more partitions. **PQ (Product Quantization)** compresses each
vector into a short code (e.g. a 1536-dim fp32 vector is 1536 x 4 = 6144 bytes; PQ codes it in 64
bytes, a 96x reduction), slashing memory 10 to 100x at the cost of some recall. **IVF-PQ** combines them and is the go-to for **billion-scale, memory-constrained**
deployments (what FAISS is known for). Rule of thumb: HNSW when recall and latency matter and you can
afford RAM; IVF-PQ when scale and memory dominate.

\`\`\`cswidget
{
  "type": "calc",
  "title": "What the index costs in RAM",
  "predictPrompt": {
    "question": "200,000 support-doc chunks embedded at 1,536 dimensions in fp32. How much RAM do the raw vectors alone need?",
    "options": [
      "About 12 MB",
      "About 120 MB",
      "About 1.2 GB",
      "About 12 GB"
    ]
  },
  "workedExample": "At the initial 200,000 chunks and 1,536 dimensions, one vector is 1,536 x 4 = 6,144 bytes, so the raw vectors alone come to about 1.2 GB, and HNSW adds roughly 16 x 8 bytes of graph links per vector on top of that. The same corpus stored as 64-byte PQ codes is about 13 MB, near a hundred times smaller, and that gap is what the recall you give up is buying. Now switch the model to 3,072 dimensions: the raw figure doubles and the PQ figure does not move at all.",
  "inputs": [
    {
      "kind": "slider",
      "id": "vectors",
      "label": "Vectors stored",
      "min": 10000,
      "max": 10000000000,
      "scale": "log",
      "initial": 200000,
      "unit": "vectors"
    },
    {
      "kind": "select",
      "id": "dims",
      "label": "Embedding dimensions",
      "initial": 2,
      "options": [
        {
          "label": "384 (small open model)",
          "value": 384
        },
        {
          "label": "768",
          "value": 768
        },
        {
          "label": "1536 (typical)",
          "value": 1536
        },
        {
          "label": "3072 (large)",
          "value": 3072
        }
      ]
    },
    {
      "kind": "slider",
      "id": "m_links",
      "label": "HNSW links per node (M)",
      "min": 8,
      "max": 64,
      "scale": "linear",
      "step": 8,
      "initial": 16,
      "unit": "links"
    },
    {
      "kind": "slider",
      "id": "pq_code",
      "label": "PQ code size per vector",
      "min": 16,
      "max": 256,
      "scale": "linear",
      "step": 16,
      "initial": 64,
      "unit": "bytes"
    }
  ],
  "outputs": [
    {
      "id": "raw_bytes",
      "label": "Raw fp32 vectors",
      "expr": "vectors * dims * 4",
      "format": "bytes",
      "sparkline": {
        "over": "vectors"
      }
    },
    {
      "id": "hnsw_bytes",
      "label": "HNSW: vectors plus the link graph",
      "expr": "raw_bytes + vectors * m_links * 8",
      "format": "bytes"
    },
    {
      "id": "pq_bytes",
      "label": "IVF-PQ: compressed codes",
      "expr": "vectors * pq_code",
      "format": "bytes"
    },
    {
      "id": "shrink",
      "label": "How much smaller the PQ index is",
      "expr": "hnsw_bytes / pq_bytes",
      "format": "compact",
      "unit": "x"
    }
  ],
  "caption": "Dimensionality is not only a quality knob: it multiplies straight through the raw index. A PQ code is a fixed size whatever the model does, which is why memory-constrained deployments at billion scale end up there."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each property or knob under the index family it belongs to.",
  "buckets": [
    "HNSW",
    "IVF-PQ"
  ],
  "items": [
    {
      "label": "Highest recall at low latency, the default for most workloads",
      "bucket": "HNSW",
      "feedback": "The layered graph hops greedily toward the neighborhood, keeping recall high without scanning partitions."
    },
    {
      "label": "Keeps a link graph and full vectors in RAM, pricey at billion scale",
      "bucket": "HNSW",
      "feedback": "Memory is the tax HNSW pays for its speed and recall; that is exactly what pushes billion-scale deployments elsewhere."
    },
    {
      "label": "Compresses each vector into a short code, cutting memory 10 to 100x",
      "bucket": "IVF-PQ",
      "feedback": "That is the PQ half: a 6144-byte vector becomes roughly 64 bytes, trading a little recall for a huge memory win."
    },
    {
      "label": "Tuned with 'M' and 'efSearch'",
      "bucket": "HNSW",
      "feedback": "Links per node and candidates explored: raising 'efSearch' buys recall with latency. These knobs move you along the recall-latency surface."
    },
    {
      "label": "Tuned with 'nlist' and 'nprobe'",
      "bucket": "IVF-PQ",
      "feedback": "Number of k-means partitions and how many get probed per query: raising 'nprobe' buys recall with latency, the IVF version of the same tradeoff."
    },
    {
      "label": "The go-to for billion-scale, memory-constrained deployments",
      "bucket": "IVF-PQ",
      "feedback": "Clustered partitions plus compressed codes is what FAISS is famous for when the corpus dwarfs your RAM."
    }
  ]
}
\`\`\`

### Two essentials beyond raw similarity

**Metadata filtering.** Real queries are "similar chunks **from this user's documents, in English,
updated this year**." You store metadata alongside each vector and filter on it. The subtlety is
**pre-filter vs post-filter**: post-filtering (find top-K by vector, then drop non-matching) can
return too few results if the filter is selective; good systems do **filtered ANN** that respects the
filter during traversal. Ask about this; it is a common gotcha.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You need the top 10 chunks similar to a query, restricted to one user who owns 0.1 percent of the corpus. The system fetches the global top 10 by similarity, then drops chunks the user does not own. What comes back?",
  "options": [
    {
      "label": "The right 10 results, just computed slightly wastefully",
      "feedback": "Tempting, and roughly true when the filter matches most of the corpus. But at 0.1 percent selectivity the odds that any of the global top 10 belong to this user are tiny."
    },
    {
      "label": "Usually far fewer than 10 results, often zero",
      "correct": true,
      "feedback": "Right. Post-filtering starves on selective filters: the ANN search never knew about the constraint, so nearly everything it returns gets discarded. You need filtered ANN that respects the filter during traversal, or pre-filtering."
    },
    {
      "label": "The database silently widens K until 10 matches survive",
      "feedback": "Some systems do retry with a larger K as a workaround, but naive post-filtering does not, and even the retry loop gets brutally expensive as selectivity drops. Filtering during traversal is the real fix."
    }
  ]
}
\`\`\`

**Hybrid search.** Pure vector search misses exact keyword matches (product codes, names, rare
terms). **Hybrid search** combines vector similarity with a keyword/**BM25** lexical score, fused
(often via **reciprocal rank fusion**), giving both semantic recall and lexical precision. Production
RAG almost always uses hybrid.

**Interview nuance:** "pgvector or a dedicated vector store?" **pgvector** (Postgres extension) is
the right call when your corpus is modest (up to low millions), you already run Postgres, and you
want vectors next to relational data and transactions with no new system. Reach for a **dedicated
store** (Pinecone, Weaviate, Qdrant, Milvus) at tens of millions to billions of vectors, when you
need advanced filtered ANN, horizontal scaling, or managed operations. Do not add a specialized
vector database for 50k chunks; pgvector is plenty.

**Design choices that bite later:** the **embedding model** fixes your **dimensionality** and
**distance metric** (cosine for normalized text embeddings, dot product, or L2). **Chunking**
strategy (size and overlap) hugely affects retrieval quality. And critically, **re-embedding
migrations**: if you switch embedding models, every stored vector is now in a different space and
must be **re-embedded**, an expensive backfill you must plan for, so version your embeddings.

Recap: Vector databases do approximate nearest-neighbor search over embeddings, trading recall for
latency and memory; choose HNSW for recall at cost of RAM or IVF-PQ for billion-scale memory
efficiency, always add metadata filtering and hybrid (vector + BM25) search, use pgvector until scale
forces a dedicated store, and plan for re-embedding when the model changes.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are designing RAG search over 200k support-doc chunks for a product that already runs Postgres. Which retrieval stack do you propose?",
  "options": [
    {
      "label": "Pinecone with HNSW, because dedicated vector stores are best practice",
      "feedback": "Tempting, because dedicated stores are the right answer at tens of millions of vectors. But 200k chunks is modest: you would be adding a whole new system, its ops burden, and a data sync path for scale you do not have."
    },
    {
      "label": "pgvector next to the existing tables, with hybrid vector plus BM25 search and versioned embeddings",
      "correct": true,
      "feedback": "Right. At this scale pgvector is plenty, keeps vectors beside relational data and transactions, hybrid search catches the exact product codes and names pure similarity misses, and versioning makes the eventual re-embedding migration survivable."
    },
    {
      "label": "pgvector with pure vector similarity; keyword search is what embeddings replace",
      "feedback": "Half right: pgvector is the correct home. But pure vector search whiffs on exact tokens like error codes and SKU names, which support queries are full of. Production RAG almost always fuses BM25 with vector scores."
    }
  ],
  "reveal": "That one decision exercises the whole lesson: ANN only when exact search stops scaling, index choice as a recall-latency-memory point, hybrid search for lexical precision, filtering that respects the query, and re-embedding as a planned migration. Walk the same checklist in the design write."
}
\`\`\`
`.trim()

const normalizationDenormTeach = `
## The most fundamental lever in schema design

Normalization and denormalization are the two ends of the single most fundamental lever in schema
design: you are trading write integrity against read performance, and every schema sits somewhere on
that line.

### Normalization: each fact exactly once

Third normal form (3NF), the practical target, says every non-key column depends on the key, the
whole key, and nothing but the key. A product's name and price live in one \`products\` row; an
\`order_items\` row references that product by \`product_id\` rather than copying the name and price.
The payoff is write integrity: change the product name in one place and every order that references
it sees the new name, with zero risk of two rows disagreeing. Normalized schemas make writes cheap
and correct, and they make **update anomalies** (the same fact stored in two rows that drift apart)
structurally impossible.

The cost is joins on read. Joins are perfectly fine when they are indexed and bounded: an index on
\`order_items.order_id\` and a primary-key lookup on \`products\` turns a 3-table join into a handful
of B-tree seeks, and Postgres or MySQL will serve that in single-digit milliseconds even at hundreds
of millions of rows. Joins fail to scale in two situations. First, when the join fan-out is large and
unbounded (joining a user to all of their events across years). Second, and this is the one that
actually forces the issue, **when the tables live on different shards**: a cross-shard join means a
scatter-gather across the network, and that does not scale. Once your data is sharded, you must
co-locate or denormalize.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A teammate opens a schema review with: 'Joins are slow, so I denormalized the whole schema up front for performance.' What is the strongest objection?",
  "options": [
    {
      "label": "None; reads dominate, so dropping joins everywhere is safe",
      "feedback": "Tempting because reads often do dominate, but indexed, bounded joins already run in single-digit milliseconds. Blanket denormalization buys an unmeasured read win while making every write a fan-out with anomaly risk."
    },
    {
      "label": "Which query is hot, and what is its measured read/write ratio?",
      "correct": true,
      "feedback": "Right. An indexed, bounded join is already a handful of B-tree seeks in single-digit milliseconds, so denormalizing the whole schema pays guaranteed write-time costs for a read win nobody measured. Denormalization is a targeted trade: name the specific query, its read/write ratio, and the scale trigger, such as a join that would otherwise scatter-gather across shards. Copy the fact for that one path, not for the whole schema."
    },
    {
      "label": "Denormalization is never acceptable; third normal form is the rule",
      "feedback": "Tempting as a purity rule, but wrong in the other direction: a hot read path, especially one that would otherwise scatter-gather across shards, is exactly when deliberately copying a fact is correct."
    }
  ]
}
\`\`\`

### Denormalization: pay at write time, on purpose

Denormalization means deliberately storing a copy of a fact where it is read, to avoid a join or a
cross-shard lookup on a hot read path. For a read-heavy order-history page you precompute a row that
already contains the product name, the quantity, the line total, and the order status, so rendering
the page is a single indexed range scan with no joins. The cost is symmetrical: you now have copies
to keep in sync, so a product rename becomes a **fan-out write** that must touch every denormalized
copy, and if you miss one you get an update anomaly. You have moved the pain from read time to write
time, which is the right trade only when reads vastly outnumber writes.

**Interview nuance:** the strong answer never says "denormalize for performance" in the abstract. It
names the specific query, the read/write ratio, and the scale trigger: "this order-history query runs
20k times per second, product data changes maybe once a day, so I denormalize the display fields into
the order row and accept a rare backfill on rename."

The managed middle ground is a **materialized view** (or a summary table). You keep the source of
truth normalized, and the database maintains a precomputed, denormalized copy for you, refreshing it
on a schedule or incrementally. You get join-free reads without hand-writing fan-out logic, at the
cost of some staleness. Daily revenue rollups, leaderboards, and dashboard aggregates are the classic
use.

\`\`\`csdiagram
{
  "type": "er",
  "tables": [
    {
      "name": "orders",
      "columns": [
        {
          "name": "order_id",
          "key": "pk"
        },
        {
          "name": "user_id"
        },
        {
          "name": "status"
        }
      ]
    },
    {
      "name": "order_items",
      "columns": [
        {
          "name": "order_id",
          "key": "fk"
        },
        {
          "name": "product_id",
          "key": "fk"
        },
        {
          "name": "qty"
        }
      ]
    },
    {
      "name": "products",
      "columns": [
        {
          "name": "product_id",
          "key": "pk"
        },
        {
          "name": "name"
        },
        {
          "name": "price"
        }
      ]
    },
    {
      "name": "order_history_rows",
      "columns": [
        {
          "name": "order_id",
          "key": "fk"
        },
        {
          "name": "user_id"
        },
        {
          "name": "status",
          "type": "copy"
        },
        {
          "name": "product_name",
          "type": "copy"
        },
        {
          "name": "qty",
          "type": "copy"
        },
        {
          "name": "line_total",
          "type": "precomputed"
        },
        {
          "name": "created_at"
        }
      ]
    }
  ],
  "relations": [
    {
      "from": "orders",
      "to": "order_items",
      "kind": "1-n",
      "label": "join on read: indexed, single-digit ms"
    },
    {
      "from": "products",
      "to": "order_items",
      "kind": "1-n",
      "label": "each fact exactly once"
    },
    {
      "from": "orders",
      "to": "order_history_rows",
      "kind": "1-n",
      "label": "refreshed as a materialized view"
    },
    {
      "from": "products",
      "to": "order_history_rows",
      "kind": "1-n",
      "label": "rename = fan-out write to every copy"
    }
  ],
  "caption": "The lever end to end: the three normalized tables store each fact exactly once, so writes stay cheap and update anomalies are structurally impossible; order_history_rows is the deliberate read model, join-free for the query that runs 20k times per second, paying with a fan-out write (or a materialized view refresh) when a product changes."
}
\`\`\`

Recap: normalize by default for write integrity, denormalize only for a specific hot read path with a
real read/write ratio and scale trigger (especially to dodge cross-shard joins), and reach for
materialized views when you want join-free reads without hand-maintaining the copies.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your order-history page renders 20k times per second; product names change a few times a day. You want join-free reads but do not want to hand-write fan-out sync code. Which design fits?",
  "options": [
    {
      "label": "Denormalize and update every copy by hand on rename",
      "feedback": "Tempting because it keeps every copy perfectly fresh, but you are hand-maintaining exactly the fan-out logic you wanted to avoid, and renames get slower and riskier as copies multiply."
    },
    {
      "label": "Keep the schema normalized and maintain a materialized view",
      "correct": true,
      "feedback": "Right. The source of truth stays normalized, so writes remain cheap and update anomalies stay structurally impossible, while the database (or a summary table refreshed by a pipeline) owns keeping the precomputed copy fresh. The page becomes a join-free scan and you never hand-write fan-out sync. The bill is brief staleness, which is the right currency for a cosmetic field that changes a few times a day."
    },
    {
      "label": "Stay fully normalized; an indexed three-table join serves 20k reads per second",
      "feedback": "Often true on a single node, which makes it tempting, but the moment orders shard that join becomes a cross-shard scatter-gather, and 20k reads/sec against a few writes/day is exactly the ratio that justifies a maintained copy."
    }
  ],
  "reveal": "This is the whole lever: normalize by default for write integrity, denormalize one named hot path when the read/write ratio and a scale trigger justify it, and prefer a managed copy (materialized view or CDC pipeline) over hand-rolled sync. In the design exercise, say the ratio out loud before you copy a single field."
}
\`\`\`
`.trim()

const accessPatternModelingTeach = `
## List the access patterns first

Relational modeling starts with entities: you draw the nouns, normalize them, and trust the query
planner to join them at read time. NoSQL modeling inverts this completely. In a system like DynamoDB
or Cassandra there is no join and no flexible query planner, so if you model entities first and hope
to query them later, you will find that the query you need is impossible or requires a full-table
scan. The mindset shift is: **list the access patterns first, then design keys and tables so each
pattern is a single lookup.**

Start by writing every read and write your feature performs, as concrete sentences: "list a user's
conversations, most recent first," "load the last 50 messages in a thread," "get the unread count per
conversation." Each of these must become one query against one partition. If any access pattern would
require scanning or a scatter-gather, the model is wrong, not the database.

### Composite keys co-locate the data

The core tool is the **composite primary key**: a **partition key** plus a **sort key**. The
partition key decides which physical node the item lives on; everything with the same partition key
is stored together, sorted by the sort key. To store a thread's messages, set partition key =
\`THREAD#<id>\` and sort key = \`MSG#<timestamp>\`; "load the last 50 messages" is then a single
Query on that partition, \`ScanIndexForward=false, Limit=50\`. No join, one partition, one round
trip.

Modeling relationships is about **embedding versus referencing**. A one-to-many where the many are
always read with the one, and are bounded, can be embedded: store the child items in the same
partition as the parent (same partition key, distinct sort keys). If the many are large or unbounded,
or read independently, reference them: give them their own partition and store just an id. A
many-to-many is handled with an adjacency-list pattern or a global secondary index that lets you
query the relationship from both directions.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Same partition or its own partition? Decide by how the related data is read and whether it is bounded.",
  "buckets": [
    "Embed: same partition as the parent",
    "Reference: own partition, store an id"
  ],
  "items": [
    {
      "label": "Order line items: bounded, always rendered with the order",
      "bucket": "Embed: same partition as the parent",
      "feedback": "Read with the parent and bounded: both embedding conditions hold, so co-locate them under the order's partition key."
    },
    {
      "label": "A user's clickstream events, accumulating forever",
      "bucket": "Reference: own partition, store an id",
      "feedback": "Unbounded growth would eventually blow past what one partition should hold; give events their own partitions."
    },
    {
      "label": "Product reviews that load on their own page, independent of the product",
      "bucket": "Reference: own partition, store an id",
      "feedback": "Read independently means reviews need their own access path, not a ride-along inside the product's partition."
    },
    {
      "label": "A conversation's participant list: a handful of members, always shown with the thread",
      "bucket": "Embed: same partition as the parent",
      "feedback": "Small, bounded, and always read with the parent: the classic embed case."
    }
  ]
}
\`\`\`

**Interview nuance:** the tell of a weak NoSQL answer is designing a users table, a conversations
table, and a messages table that mirror a relational schema, then discovering you cannot list a
user's conversations without a scan. The strong answer often puts multiple entity types in **one
table** (single-table design), keyed so each access pattern hits one partition.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "partition key",
    "sort key",
    "item type",
    "access pattern it serves"
  ],
  "rows": [
    [
      "USER#7",
      "CONV#2026-07-23T09:14",
      "conversation pointer",
      "list user 7's conversations, most recent first: one Query on USER#7, descending"
    ],
    [
      "USER#7",
      "CONV#2026-07-21T11:02",
      "conversation pointer",
      "same slice, next row"
    ],
    [
      "THREAD#123",
      "MSG#2026-07-23T09:14",
      "message",
      "load the last 50 messages: Query THREAD#123, ScanIndexForward=false, Limit=50"
    ],
    [
      "THREAD#123",
      "MSG#2026-07-23T09:12",
      "message",
      "same partition, already sorted by the timestamp in the sort key"
    ],
    [
      "THREAD#123",
      "MEMBER#USER#7",
      "participant",
      "bounded and always read with the thread, so it is embedded in the same partition"
    ]
  ],
  "highlightCols": [
    "partition key"
  ],
  "caption": "Single-table design: three item types in one table, keyed so every access pattern on the list is one contiguous Query slice against one partition, never a scan."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A tasks table uses partition key 'status'. Every new task is written with status ACTIVE. Writes start throttling, so you provision 10x more total table capacity. What happens?",
  "options": [
    {
      "label": "Throttling stops; you just raised the ceiling",
      "feedback": "Tempting because provisioned capacity sounds like one global pool, but the ceiling that matters is per partition. Total table capacity does nothing for a single overloaded key."
    },
    {
      "label": "Still throttles; the ceiling that binds is per partition",
      "correct": true,
      "feedback": "Right. Every new task carries status ACTIVE, so every write hashes to the one partition that key owns, and that physical partition has its own fixed throughput ceiling no matter how much total table capacity you buy. A low-cardinality partition key concentrates all the heat on one node by construction, which is why the key has to be chosen for spread, not for readability."
    },
    {
      "label": "The ACTIVE partition is split automatically across more nodes",
      "feedback": "Tempting because these systems do split data by key range, but they cannot split a single partition-key value. Only a higher-cardinality key or write sharding spreads this load."
    }
  ]
}
\`\`\`

### Hot partitions and secondary indexes

The failure mode you must actively design against is the **hot partition**. Because the partition key
routes to a physical node with a throughput ceiling (DynamoDB caps a single partition around 3,000
read and 1,000 write units per second), a key that concentrates traffic becomes a bottleneck no
matter how much total capacity you provision. A celebrity user's thread, or a partition key of
\`status=ACTIVE\` that every write touches, will throttle. Spread heat with a high-cardinality
partition key and, for known-heavy keys, **write sharding**: append a suffix
(\`THREAD#123#<0..9>\`) to fan one logical partition across ten physical ones, then scatter-read the
ten on the way out.

\`\`\`cswidget
{
  "type": "calc",
  "title": "The hot partition ceiling, and what write sharding buys",
  "predictPrompt": {
    "question": "Your table is provisioned for 100,000 writes per second, and one celebrity thread takes 4,000 of them. A single DynamoDB partition caps out near 1,000 writes per second. What happens?",
    "options": [
      "Nothing: the table has 25 times the capacity it needs",
      "That one key throttles near 1,000 writes per second while the rest of the table idles",
      "DynamoDB splits the key across partitions on its own",
      "The excess writes queue and drain within the second"
    ]
  },
  "workedExample": "At the initial 20,000 writes per second with 20 percent of them landing on one celebrity thread, that single partition key takes 4,000 writes per second against a ceiling near 1,000. It is four times over and throttled, no matter that the table as a whole is provisioned far above its total load. Drag suffixes to 4 and the write-sharded key spreads to 1,000 per shard, exactly at the ceiling. Take it to 10 for margin, then remember what you just bought: every read of that key now fans out to 10 partitions and merges the results.",
  "inputs": [
    {
      "kind": "slider",
      "id": "total_writes",
      "label": "Writes per second across the table",
      "min": 100,
      "max": 500000,
      "scale": "log",
      "initial": 20000,
      "unit": "per second"
    },
    {
      "kind": "slider",
      "id": "hot_share",
      "label": "Share of them landing on the hottest key",
      "min": 1,
      "max": 60,
      "scale": "linear",
      "step": 1,
      "initial": 20,
      "unit": "percent"
    },
    {
      "kind": "slider",
      "id": "shards",
      "label": "Write-sharding suffixes on that key",
      "min": 1,
      "max": 50,
      "scale": "linear",
      "step": 1,
      "initial": 1,
      "unit": "suffixes"
    }
  ],
  "outputs": [
    {
      "id": "hot_writes",
      "label": "Writes aimed at the hottest key",
      "expr": "total_writes * hot_share / 100",
      "format": "compact",
      "unit": "per second"
    },
    {
      "id": "per_partition",
      "label": "Writes per physical partition after sharding",
      "expr": "hot_writes / shards",
      "format": "compact",
      "unit": "per second",
      "sparkline": {
        "over": "shards"
      }
    },
    {
      "id": "ceiling_use",
      "label": "Load against the 1,000 per second partition ceiling",
      "expr": "per_partition / 1000",
      "format": "percent"
    },
    {
      "id": "shards_needed",
      "label": "Suffixes needed to clear the ceiling",
      "expr": "ceil(hot_writes / 1000)",
      "format": "number",
      "unit": "suffixes"
    }
  ],
  "caption": "Total provisioned capacity is not the constraint; one key's share of it is. Sharding trades a write bottleneck for a read fan-out, so the cost lands on the way out."
}
\`\`\`

**Secondary indexes** buy additional access patterns without a second table. A **global secondary
index (GSI)** has its own partition and sort key over the same items, so you can query by a different
attribute. GSIs are eventually consistent and cost extra write capacity (every base write replicates
to the index), so add them per access pattern, not by default. A **local secondary index (LSI)**
shares the partition key but offers an alternate sort key, and can be strongly consistent.

Recap: enumerate access patterns first, turn each into a single-partition lookup using composite
partition and sort keys, choose embedding versus referencing by how the related data is read, design
the partition key to avoid hot partitions, and add secondary indexes only to serve a named additional
access pattern.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are about to model a chat app on DynamoDB. What is the first artifact you write down?",
  "options": [
    {
      "label": "An entity-relationship diagram: users, conversations, messages",
      "feedback": "Tempting because that is exactly right for relational design, but with no joins and no flexible planner, entities-first is the tell of a weak answer: you discover too late that a query you need requires a full scan."
    },
    {
      "label": "The list of access patterns, written as concrete sentences",
      "correct": true,
      "feedback": "Right. Write out every read and write the feature performs as a sentence, such as 'list a user's conversations, most recent first', and require each one to become a single query against a single partition. Partition and sort keys, embed-versus-reference calls, the single-table layout, and any secondary index are all derived from that list, never the other way around."
    },
    {
      "label": "The set of global secondary indexes the app will need",
      "feedback": "Tempting because GSIs do buy extra access patterns, but they are eventually consistent and cost write capacity, so they are added last, one per named pattern the base keys cannot serve."
    }
  ],
  "reveal": "The order of operations for the design exercise: list every access pattern, shape composite keys so each is a single-partition lookup, choose embed vs reference by read pattern and boundedness, check each key for hot-partition risk (write-shard the known-heavy ones), and only then add a GSI or LSI for patterns the base keys cannot serve."
}
\`\`\`
`.trim()

/**
 * Read-only artifact for `sd-l2-access-pattern-modeling-practice`, which is a CRITIQUE: the learner
 * reviews this schema rather than writing one from a blank page.
 *
 * It is written as a design doc an engineer would defend, and the defects are consequences of
 * plausible choices rather than planted mistakes: an unread counter fanned out per member, a channel
 * partition key with no shard suffix, a workspace-wide GSI partition key, and the belief that
 * table-wide provisioned capacity is the ceiling that binds. Patterns 1 and 3's membership key is
 * deliberately CORRECT, so the exercise is a review and not a hunt.
 *
 * Nothing here states a verdict. `exercise-genres.test.ts` enforces that, because an artifact that
 * announces its own defect leaves the learner nothing to find and still scores as complete.
 */
const accessPatternCritiqueArtifact = `
**Design doc: team chat on DynamoDB, single table, revision 3**

Scale we are building for: 40 million users, 2 million channels, and one outlier, #general in our
largest workspace, with 500,000 members. #general peaks near 1,800 messages per second during an
incident. The table is provisioned at 200,000 write units per second, roughly ten times steady-state
load, so capacity is budgeted and understood.

Access patterns, in priority order:

1. List my channels, most recent activity first.
2. Load the last 50 messages in a channel and page backward.
3. Show an unread badge per channel.
4. Admin view: all message activity in a workspace over the last hour.

Item layout, one table:

- Membership item, \`PK = USER#userId\`, \`SK = CHAN#lastActivityTs#channelId\`, carrying the channel
  name and an \`unreadCount\` attribute. Serves patterns 1 and 3 together in one Query, descending.
- Message item, \`PK = CHAN#channelId\`, \`SK = TS#messageTs\`, carrying sender and body. Serves
  pattern 2 in one Query, descending, with Limit 50.

GSI1 serves pattern 4: \`PK = WORKSPACE#workspaceId\`, \`SK = TS#messageTs\`, projecting channelId,
senderId and timestamp, so the admin view is one Query on the workspace partition.

Write path for a new message: put the message item, then a BatchWrite loop over the channel's
members that bumps \`lastActivityTs\` and applies \`ADD unreadCount 1\` to every membership item
except the sender's. Opening a channel sets that member's \`unreadCount\` back to 0.

Reads: patterns 1 and 2 use strongly consistent reads. Pattern 4 reads GSI1 and tolerates a second
or two of staleness.
`.trim()

const keysIdsConstraintsTeach = `
## The most trivial-looking column is the highest-leverage one

An ID looks like the most trivial column in the table. It is actually one of the highest-leverage
decisions you make, because the primary key drives physical storage layout, index locality, and how
the data shards, and all three are painful to change once the table is large.

### The monotonic-key hotspot

Auto-increment integer keys are compact, sort naturally, and give great index locality: new rows
cluster at the right edge of the B-tree. That same property is a curse at write scale. In an
InnoDB-style **clustered index**, rows are physically stored in primary-key order, so if the key is
monotonic, every insert lands on the same rightmost page and, worse, the same shard. You get a
**write hotspot**: one page or one node absorbs all the insert traffic while the rest sit idle.
Auto-increment also leaks information (competitors count your order volume) and does not work cleanly
across multiple write nodes that would collide on the next value.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "To fix the rightmost-page insert hotspot, you switch the clustered primary key from auto-increment to random UUIDv4. What happens to write performance on a large table?",
  "options": [
    {
      "label": "It improves: inserts spread across the tree, not one page",
      "feedback": "This is exactly the tempting logic, and the spreading is real. The catch is what spreading costs once the table no longer fits in memory: you stopped concentrating the load and started scattering it."
    },
    {
      "label": "It often gets worse: the whole index becomes the working set",
      "correct": true,
      "feedback": "Right. You traded one hot page for touching all of them. Each insert lands on a random page, so pages split constantly, the index fragments, and the working set you must keep cached becomes the whole index instead of its right edge. On a large table that can multiply write cost and index size several-fold, which is why random UUIDv4 as a clustered primary key is such a common and expensive mistake."
    },
    {
      "label": "Nothing changes; the key value does not decide where rows sit",
      "feedback": "Tempting if you picture the primary key as just a lookup handle, but in a clustered index the key literally determines physical row placement. That is exactly why this column is so high-leverage."
    }
  ]
}
\`\`\`

### The random-UUID cure that causes a new disease

The obvious fix is a random **UUIDv4**: 128 bits of randomness, generated anywhere with no
coordination, no information leak, no collision. But UUIDv4 destroys index locality. Because values
are random, every insert lands on a random B-tree page, so the working set of pages you must keep in
memory balloons, pages split constantly, and the index **fragments**. On a large table this can
multiply write cost and index size several-fold. Using a random UUIDv4 as a clustered primary key is
one of the most common and expensive modeling mistakes.

\`\`\`cswidget
{
  "type": "sequence",
  "title": "Index locality: sequential vs random UUID keys",
  "actors": [
    {
      "id": "writer",
      "label": "Writer"
    },
    {
      "id": "index",
      "label": "Clustered index (B-tree)"
    }
  ],
  "toggles": [
    {
      "id": "uuidKeys",
      "label": "Random UUIDv4 keys",
      "description": "OFF: sequential auto-increment ids. ON: random UUIDv4 as the clustered primary key."
    }
  ],
  "steps": [
    {
      "from": "index",
      "label": "Rows stored in PK order",
      "kind": "note",
      "status": "ok"
    },
    {
      "from": "writer",
      "to": "index",
      "label": "INSERT id 1001",
      "kind": "request",
      "status": "ok",
      "when": "!uuidKeys"
    },
    {
      "from": "index",
      "to": "writer",
      "label": "Append to rightmost page",
      "kind": "response",
      "status": "ok",
      "when": "!uuidKeys",
      "state": {
        "pageSplits": "0"
      }
    },
    {
      "from": "writer",
      "to": "index",
      "label": "INSERT id 1002",
      "kind": "request",
      "status": "ok",
      "when": "!uuidKeys"
    },
    {
      "from": "index",
      "to": "writer",
      "label": "Tail append, no split",
      "kind": "response",
      "status": "ok",
      "when": "!uuidKeys",
      "state": {
        "pageSplits": "0"
      }
    },
    {
      "from": "writer",
      "to": "index",
      "label": "INSERT id 1003",
      "kind": "request",
      "status": "ok",
      "when": "!uuidKeys",
      "predict": {
        "question": "Sequential id 1003 arrives. Where does the insert land?",
        "options": [
          "On the same rightmost (tail) page again",
          "On a random page in the middle of the B-tree"
        ]
      }
    },
    {
      "from": "index",
      "to": "writer",
      "label": "Rightmost page: one hot page",
      "kind": "response",
      "status": "ok",
      "when": "!uuidKeys",
      "state": {
        "pageSplits": "0"
      }
    },
    {
      "from": "index",
      "label": "Rest of the tree sits idle",
      "kind": "note",
      "status": "ok",
      "when": "!uuidKeys"
    },
    {
      "from": "writer",
      "to": "index",
      "label": "INSERT 9f3a... (random)",
      "kind": "request",
      "status": "ok",
      "when": "uuidKeys"
    },
    {
      "from": "index",
      "to": "writer",
      "label": "Lands on a random mid page",
      "kind": "response",
      "status": "ok",
      "when": "uuidKeys",
      "state": {
        "pageSplits": "0"
      }
    },
    {
      "from": "writer",
      "to": "index",
      "label": "INSERT 41c7... (random)",
      "kind": "request",
      "status": "ok",
      "when": "uuidKeys"
    },
    {
      "from": "index",
      "label": "Full page splits in two",
      "kind": "note",
      "status": "error",
      "when": "uuidKeys",
      "state": {
        "pageSplits": "1"
      }
    },
    {
      "from": "writer",
      "to": "index",
      "label": "INSERT 07be... (random)",
      "kind": "request",
      "status": "ok",
      "when": "uuidKeys",
      "predict": {
        "question": "Another random UUIDv4 arrives. Where does this insert land?",
        "options": [
          "The rightmost page, like sequential ids",
          "An unpredictable page anywhere in the tree"
        ]
      }
    },
    {
      "from": "index",
      "label": "Another page split",
      "kind": "note",
      "status": "error",
      "when": "uuidKeys",
      "state": {
        "pageSplits": "2"
      }
    },
    {
      "from": "index",
      "to": "writer",
      "label": "Every page is now hot",
      "kind": "response",
      "status": "ok",
      "when": "uuidKeys",
      "state": {
        "pageSplits": "2"
      }
    },
    {
      "from": "index",
      "label": "Working set balloons in memory",
      "kind": "note",
      "status": "error",
      "when": "uuidKeys",
      "state": {
        "pageSplits": "3"
      }
    }
  ],
  "caption": "Sequential keys pile every insert onto the same rightmost page: perfect locality, one hot page. Random UUIDv4 keys scatter inserts across the whole B-tree, so pages split constantly, the index fragments, and the working set of pages you must keep in memory balloons, multiplying write cost and index size several-fold on a large table."
}
\`\`\`

### Time-ordered IDs, the actual answer

You want the coordination-free, information-hiding property of a UUID with the locality of a
sequential key. That is exactly what **ULID** and **UUIDv7** provide: a high-order timestamp prefix
(millisecond) followed by random bits. Because the prefix increases with time, new IDs are roughly
ordered, so they cluster like an auto-increment for locality, while the random suffix keeps them
collision-free and generatable anywhere. **Snowflake** IDs (Twitter's scheme: timestamp + machine id
+ per-ms sequence, packed into 64 bits) give the same time-ordering plus an embedded shard/worker id,
at the cost of needing worker-id coordination. Rule of thumb: default to ULID/UUIDv7 for distributed
primary keys; use Snowflake when you want a compact 64-bit id and already have worker-id assignment.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each property to the ID scheme it describes.",
  "buckets": [
    "Auto-increment integer",
    "Random UUIDv4",
    "ULID / UUIDv7"
  ],
  "items": [
    {
      "label": "Every insert lands on the rightmost B-tree page, and on one shard",
      "bucket": "Auto-increment integer",
      "feedback": "Monotonic order gives perfect locality and a write hotspot: the same property is the gift and the curse."
    },
    {
      "label": "Coordination-free generation, but fragments a clustered index",
      "bucket": "Random UUIDv4",
      "feedback": "Pure randomness scatters inserts across every page: no hotspot, but constant page splits and a bloated working set."
    },
    {
      "label": "Timestamp prefix clusters new rows together; random tail stays collision-free",
      "bucket": "ULID / UUIDv7",
      "feedback": "The best of both: auto-increment-like locality from the time prefix, UUID-like coordination-free generation from the random suffix."
    },
    {
      "label": "Lets a competitor estimate your order volume by comparing two IDs a week apart",
      "bucket": "Auto-increment integer",
      "feedback": "Sequential values leak counts; this is one of the non-performance reasons to avoid them for externally visible IDs."
    },
    {
      "label": "The default recommendation for distributed primary keys",
      "bucket": "ULID / UUIDv7",
      "feedback": "Time-ordered for locality, random-tailed for distribution, coordination-free: the answer that ends the interviewer's line of questioning."
    }
  ]
}
\`\`\`

**Interview nuance:** if you propose random UUIDs, expect "what does that do to your clustered
index," and if you propose auto-increment, expect "how does that shard." The answer that ends the
line of questioning is "ULID/UUIDv7: time-ordered for locality, random-tailed for distribution,
coordination-free."

### Keys, constraints, and types

**Natural vs surrogate keys.** A natural key is a real-world attribute (email, ISBN, SKU). A
surrogate key is a synthetic id with no business meaning. Prefer surrogate keys for entity primary
keys, because natural attributes change (people change emails) and a primary key should be immutable
and stable as a foreign-key target. Keep the natural attribute as a \`UNIQUE\` constraint, not the
PK. Composite keys are right when the identity truly is the combination, for example a junction table
keyed by \`(order_id, product_id)\`.

**Constraints are guardrails, not decoration.** They enforce invariants at the one place nothing can
bypass: the database. \`NOT NULL\` stops missing data, \`UNIQUE\` stops duplicate emails, a
\`FOREIGN KEY\` stops orphaned rows, and a \`CHECK\` (\`quantity > 0\`, \`status IN (...)\`) stops
invalid values regardless of which service wrote them. Application-level validation is not a
substitute, because a second service or a manual fix can write around it.

**Data types encode correctness.** Store **money as decimal/integer cents, never float**, because
binary floating point cannot represent 0.10 exactly and will drift by cents over millions of rows.
Use **timezone-aware timestamps** (\`timestamptz\`, stored UTC) so events order correctly across
regions. Size integers to the domain. Finally, decide **soft vs hard delete**: a \`deleted_at\`
timestamp preserves history and audit trails and lets you undo, at the cost of every query filtering
\`WHERE deleted_at IS NULL\`; a hard delete reclaims space and simplifies queries but loses the
record. Pick soft delete when history or recovery matters, hard delete for high-churn or
privacy-mandated erasure.

### One table shape where neither delete is right: the ledger

Soft versus hard delete is a real choice on most tables and a trap on one shape. The ACID lesson at
the start of this level made ledger entries the source of truth and the balance a projection of
them. Add one more rule and you get the **double-entry** shape that accounting has used for
centuries: every movement of money is recorded twice, once as a debit and once as a credit, and the
entries belonging to a single transaction sum to zero.

\`\`\`
CREATE TABLE ledger_entries (
  id             UUID        PRIMARY KEY,          -- UUIDv7: time-ordered, append-friendly
  transaction_id UUID        NOT NULL,             -- groups the entries that must balance
  account_id     BIGINT      NOT NULL REFERENCES accounts(id),
  amount_minor   BIGINT      NOT NULL CHECK (amount_minor <> 0),  -- signed integer cents
  currency       CHAR(3)     NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A 25.00 transfer is two rows, and they cancel.
INSERT INTO ledger_entries (id, transaction_id, account_id, amount_minor, currency)
VALUES (uuidv7(), :txn, :payer_account, -2500, 'USD'),   -- debit
       (uuidv7(), :txn, :payee_account, +2500, 'USD');   -- credit
\`\`\`

The invariant is "every \`transaction_id\` sums to zero," and a plain \`CHECK\` cannot express it,
because a CHECK sees one row and this rule spans several. It needs a **deferred constraint trigger**
that fires at COMMIT, once all of the transaction's entries exist:

\`\`\`
CREATE CONSTRAINT TRIGGER entries_must_balance
  AFTER INSERT ON ledger_entries
  DEFERRABLE INITIALLY DEFERRED             -- checked at COMMIT, not after each row
  FOR EACH ROW EXECUTE FUNCTION assert_transaction_sums_to_zero();

-- assert_transaction_sums_to_zero() raises unless this returns 0:
--   SELECT SUM(amount_minor) FROM ledger_entries WHERE transaction_id = NEW.transaction_id;
\`\`\`

Deferred matters: check it per row and the very first INSERT fails, because a lone debit never sums
to zero on its own.

Now the delete question answers itself. A wrong entry is never softened and never removed. It is
**reversed**, by appending the opposite entry under a new transaction that points back at the
original:

\`\`\`
INSERT INTO ledger_entries (id, transaction_id, account_id, amount_minor, currency)
VALUES (uuidv7(), :reversal_txn, :payer_account, +2500, 'USD'),
       (uuidv7(), :reversal_txn, :payee_account, -2500, 'USD');
-- balances are back where they started, and BOTH the error and the correction are on the record
\`\`\`

A \`deleted_at\` column is wrong here for a specific reason: it makes the balance depend on a WHERE
clause, so any reader that forgets the filter reports a different number, and it erases the evidence
that a mistake was made and fixed, which is the thing an auditor came to see. A hard delete is worse
still. On a ledger, append-only is absolute, and the reversing entry is how you say "this was wrong"
without unsaying it.

Recap: avoid monotonic keys for hotspots and random UUIDv4 for fragmentation, default to ULID/UUIDv7
(or Snowflake) for time-ordered distributed IDs, use surrogate keys with natural attributes as unique
constraints, enforce invariants with DB constraints, and pick types that encode correctness. On a
ledger, add the double-entry rule (paired entries summing to zero, corrections as reversing entries)
and drop the soft-delete option entirely.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are designing the orders table for a sharded, multi-writer system. Which primary key do you defend in the design exercise?",
  "options": [
    {
      "label": "Auto-increment bigint: compact and naturally sorted.",
      "feedback": "Tempting for its locality and small size, but multiple writers collide on the next value, all inserts hit one shard, and the sequence leaks your order volume."
    },
    {
      "label": "The customer's email plus a timestamp: a real-world identity.",
      "feedback": "Tempting because natural keys feel meaningful, but emails change and a primary key must be immutable as a foreign-key target. Keep email as a UNIQUE constraint, not the PK."
    },
    {
      "label": "Random UUIDv4: collision-free and generatable anywhere.",
      "feedback": "Coordination-free, yes, but as a clustered key it fragments the index. You would trade the hotspot disease for the fragmentation disease."
    },
    {
      "label": "ULID or UUIDv7: time-ordered and coordination-free.",
      "correct": true,
      "feedback": "Right. The millisecond timestamp prefix gives auto-increment-like index locality, the random tail keeps it collision-free and generatable on any writer with no coordination, and carrying no business meaning makes it immutable as a foreign-key target. Keep email and the other natural attributes beside it as UNIQUE constraints, and let NOT NULL, FOREIGN KEY, and CHECK enforce the invariants no service can write around."
    }
  ],
  "reveal": "The full checklist for the design write: a surrogate, time-ordered ID (ULID/UUIDv7, or Snowflake if you need 64 bits and have worker-id assignment), natural attributes as UNIQUE constraints, invariants in the database via NOT NULL, FOREIGN KEY, and CHECK, money as integer cents, timezone-aware timestamps, and a deliberate soft-vs-hard delete decision."
}
\`\`\`
`.trim()

const blobObjectStorageTeach = `
## Bytes belong in object storage, pointers in the database

The single most common storage mistake juniors make is putting a 5 MB image, or worse a 500 MB video,
into a database column. Relational and document databases are tuned for small, structured,
frequently-queried rows. A large binary object (a "blob") is the opposite: big, opaque, write-once,
read-many. Stuffing blobs into Postgres or MongoDB bloats the table, blows out your backup and
replication times, wrecks the buffer cache (one video eviction flushes thousands of hot rows), and
forces every byte to flow through your app servers. The right home for bytes is **object storage**:
S3, Google Cloud Storage, or Azure Blob Storage.

The mental model is a split. **Object storage holds the bytes; the database holds the metadata plus a
pointer (the object key).** A \`photos\` row stores \`id\`, \`owner_id\`, \`caption\`, \`width\`,
\`height\`, \`content_type\`, and \`object_key = "photos/2026/u123/abc.jpg"\`. The actual JPEG lives
in the bucket at that key. Your DB stays small and fast; the blobs live somewhere built for them.
Object stores give you flat key-value semantics (a key maps to an immutable object plus metadata),
effectively unlimited capacity, and roughly **eleven nines of durability** (99.999999999 percent),
achieved by replicating each object across multiple facilities.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A user uploads a 200 MB video. Which path should the bytes take?",
  "options": [
    {
      "label": "Client to your app server, which then writes it to the bucket",
      "feedback": "Tempting because the server does need to authorize the upload, but streaming file bodies through the app tier makes your small server fleet the bottleneck for all transfer. Authorize the request, not the bytes."
    },
    {
      "label": "Base64 into a JSON column so everything lives in one database",
      "feedback": "Tempting for simplicity, but blobs bloat the table, wreck the buffer cache, and stretch backups and replication. Databases are tuned for small, structured, frequently-queried rows."
    },
    {
      "label": "Client to the bucket, on a short-lived URL your server signs",
      "correct": true,
      "feedback": "Right. The client asks your server for permission first, and the server authorizes the user and hands back a signed URL good for a PUT to one specific key for a few minutes. The 200 MB body then travels client-to-bucket and never enters your app tier at all. Your app mints capability tokens rather than moving bytes, and that split is what lets a tiny fleet of app servers support petabytes of transfer."
    }
  ]
}
\`\`\`

### Presigned URLs: keep bytes off your servers

When a client wants to upload, it asks your app server for permission. The app authorizes the user,
then generates a short-lived, cryptographically signed URL that grants \`PUT\` to one specific key
for, say, 15 minutes, and returns it. The client \`PUT\`s the file **directly to S3**. Downloads work
the same way with a signed \`GET\`. Your app never touches the file body: it only mints capability
tokens. This is what lets a tiny fleet of app servers support petabytes of transfer.

For large files use **multipart upload**: split the file into parts (say 8 MB each), upload parts in
parallel, retry only failed parts, and finalize with a "complete" call that stitches them
server-side. This gives resumability and parallel throughput. Where history matters enable
**versioning** or write objects **immutably** with a content hash in the key.

### The two cost and latency levers

**Lifecycle and tiering**: hot data stays in the standard tier, and a policy automatically moves
objects to infrequent-access, then cold, then archive (S3 Glacier) as they age, cutting storage cost
by 5 to 20x for data nobody reads. **A CDN in front for reads**: CloudFront or Cloudflare caches
objects at edge PoPs near users, so a popular video is served from an edge 20 ms away instead of a
single region 150 ms away, and your origin bucket sees a fraction of the traffic. You almost never
serve public media directly from the bucket at scale.

**Interview nuance:** If asked "why not just base64 the image into a JSON column," the crisp answer
is durability, cost, cache pollution, and egress path: object storage is cheaper per GB, more
durable, and lets clients transfer directly via presigned URLs and a CDN, so bytes never bottleneck
on your database or app tier.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Upload path and read path for one photo",
  "nodes": [
    {
      "id": "uploader",
      "label": "Uploading client",
      "kind": "client"
    },
    {
      "id": "app",
      "label": "App server: authorizes the user, signs the URL",
      "kind": "service"
    },
    {
      "id": "bucket",
      "label": "S3 bucket: the object bytes, eleven nines of durability",
      "kind": "db"
    },
    {
      "id": "db",
      "label": "Database row: id, owner, caption, w, h, content_type, object_key",
      "kind": "db"
    },
    {
      "id": "cdn",
      "label": "CDN edge cache, serving the signed GET",
      "kind": "cdn"
    },
    {
      "id": "viewer",
      "label": "Viewing client",
      "kind": "client"
    }
  ],
  "edges": [
    {
      "from": "uploader",
      "to": "app",
      "kind": "sync",
      "label": "1. ask to upload"
    },
    {
      "from": "app",
      "to": "uploader",
      "kind": "feedback",
      "label": "2. presigned PUT URL, one key, 15 minutes"
    },
    {
      "from": "uploader",
      "to": "bucket",
      "kind": "sync",
      "label": "3. PUT bytes directly, multipart if large"
    },
    {
      "from": "app",
      "to": "db",
      "kind": "sync",
      "label": "4. write the metadata row plus the object key"
    },
    {
      "from": "bucket",
      "to": "cdn",
      "kind": "sync",
      "label": "origin fetch on an edge miss"
    },
    {
      "from": "cdn",
      "to": "viewer",
      "kind": "sync",
      "label": "read served from a PoP about 20 ms away"
    }
  ],
  "groups": [
    {
      "id": "control",
      "label": "Control plane: mints capability tokens, never moves bytes",
      "nodes": [
        "app",
        "db"
      ]
    },
    {
      "id": "data",
      "label": "Data plane: every byte, none of it through your servers",
      "nodes": [
        "bucket",
        "cdn"
      ]
    }
  ],
  "stages": [
    {
      "adds": [
        "uploader",
        "app"
      ],
      "note": "The upload opens as a permission request, not a file. Authorizing this user for this key is the only part of the transfer your server is actually needed for."
    },
    {
      "adds": [
        "bucket"
      ],
      "note": "A small app fleet has to carry petabytes of transfer, so the signed URL sends the 200 MB body straight to the bucket and the app tier never sees it."
    },
    {
      "adds": [
        "db"
      ],
      "note": "The row holds only what you query on. Put the bytes in a column instead and you stretch every backup and replication window, and one video eviction flushes thousands of hot rows out of the buffer cache."
    },
    {
      "adds": [
        "cdn",
        "viewer"
      ],
      "note": "Reads are the volume: without an edge cache a viral photo hits one region 150 ms away for every viewer, so the CDN serves it from a nearby PoP and the origin bucket sees a fraction of the traffic."
    }
  ],
  "caption": "Bytes in object storage, the key plus metadata in the database, and your servers on the control path only."
}
\`\`\`

### When the object you stored is not the object you serve

Everything above assumes the bytes a viewer wants are the bytes the uploader sent. True for a JPEG,
false for video. One 4 GB 4K MP4 is unplayable on a phone on 3G: the player has to buffer megabytes
before the first frame, and a single dip in bandwidth stalls it. Serving that same file to a 4K TV
and to that phone is not a delivery problem you can solve with a CDN, because there is only one
thing to deliver. The upload path stays exactly as taught; the read path grows three steps, and all
three products live in object storage.

**1. Transcode into a ladder of renditions.** Once the raw upload lands, an async worker re-encodes
it at several resolution and bitrate pairs, so a version exists for every plausible network:

\`\`\`
raw/{videoId}/source.mp4     3840x2160, 45 Mbps    <- what the creator uploaded, never served
  ->  hls/{videoId}/240p/     426x240,   0.4 Mbps
  ->  hls/{videoId}/480p/     854x480,   1.2 Mbps
  ->  hls/{videoId}/720p/    1280x720,   3.0 Mbps
  ->  hls/{videoId}/1080p/   1920x1080,  6.0 Mbps
  ->  hls/{videoId}/2160p/   3840x2160, 18.0 Mbps
\`\`\`

**2. Cut every rendition into segments, and write a manifest.** Each rendition is chopped into short
independently decodable chunks, usually 2 to 6 seconds, each stored as its own immutable object. A
**manifest** is a small text file listing the renditions and their segments. That pairing is what
HLS and DASH are: HLS is Apple's format (an \`.m3u8\` manifest with \`.ts\` or \`.m4s\` segments),
DASH is the ISO equivalent (an \`.mpd\` manifest). Same job, two spellings.

\`\`\`
hls/{videoId}/master.m3u8            # the manifest the player fetches first
  #EXT-X-STREAM-INF:BANDWIDTH=400000,RESOLUTION=426x240
  240p/index.m3u8
  #EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720
  720p/index.m3u8

hls/{videoId}/720p/index.m3u8        # one rendition's segment list
  #EXTINF:4.0
  seg_00001.ts
  #EXTINF:4.0
  seg_00002.ts
\`\`\`

**3. Let the player pick a rendition per segment.** This is **adaptive bitrate**. The client reads
the master manifest, times how long the last segment took to arrive, and chooses which rendition to
request next. Every rendition was cut on the same boundaries, so switching mid-playback is seamless:

\`\`\`
t=0s    fetch master.m3u8, start conservatively   ->  720p/seg_00001.ts
t=4s    that segment arrived in 1.1s, plenty spare ->  1080p/seg_00002.ts
t=8s    viewer steps into a lift, took 3.8s        ->  480p/seg_00003.ts
t=12s   still bad                                  ->  240p/seg_00004.ts
t=16s   back on wifi                               ->  1080p/seg_00005.ts
\`\`\`

The choice belongs to the client, made fresh at every segment boundary, which is how one stored
library serves a 3G phone and a 4K TV with the server knowing nothing about either. It is also
kinder to the CDN than the single file was: segments are immutable, so they cache at the edge with
very long TTLs, and the hot read set becomes a pile of small cacheable objects instead of one
enormous range-requested blob.

Recap: Keep bytes in object storage with eleven-nines durability and only the key plus metadata in
the DB, move files with presigned URLs and multipart upload so they bypass your servers, and control
cost and latency with lifecycle tiering and a CDN. When one stored object cannot serve every
viewer, transcode it into a rendition ladder, segment each rendition beside a manifest, and let the
player switch renditions per segment.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Your photo-sharing feature ships. Where does each piece live?",
  "buckets": [
    "Database row",
    "Object storage bucket",
    "CDN edge cache"
  ],
  "items": [
    {
      "label": "The 4 MB JPEG bytes",
      "bucket": "Object storage bucket",
      "feedback": "Big, opaque, write-once, read-many: exactly what object storage is built for, with eleven nines of durability."
    },
    {
      "label": "owner_id, caption, width, height, content_type",
      "bucket": "Database row",
      "feedback": "Small, structured, queryable metadata is what the database is for; it stays fast because the bytes live elsewhere."
    },
    {
      "label": "The object key, like 'photos/2026/u123/abc.jpg'",
      "bucket": "Database row",
      "feedback": "The pointer is the glue: the row records where in the bucket the bytes live."
    },
    {
      "label": "The hot copy of a viral photo being served to millions of viewers",
      "bucket": "CDN edge cache",
      "feedback": "Popular reads are served from edge PoPs near users, so the origin bucket sees only a fraction of the traffic."
    },
    {
      "label": "A three-year-old photo nobody has opened in a year",
      "bucket": "Object storage bucket",
      "feedback": "Still in the bucket, but a lifecycle policy should have tiered it down to infrequent-access or archive to cut cost."
    }
  ],
  "reveal": "That split is the whole lesson: bytes in object storage, metadata plus the key in the database, presigned URLs and multipart upload so file bodies bypass your servers, lifecycle tiering for cost, and a CDN in front for read latency. Walk that path end to end in the design exercise."
}
\`\`\`
`.trim()

const choosingDbPolyglotTeach = `
## Given a feature, pick a store and defend it

This is the synthesis lesson. Strong candidates do not memorize "use NoSQL for scale." They reason
from **decision drivers** to a **storage family**, then defend against the runner-up.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Asked where to store orders for a new marketplace, a candidate opens with: 'NoSQL, because we need scale.' What is the interviewer listening for instead?",
  "options": [
    {
      "label": "Numbers and access patterns first, and only then a storage family",
      "correct": true,
      "feedback": "Right. 'Scale' with no number attached is not a decision driver. What the interviewer wants named is QPS now and in two years, the query shapes you actually run and by what key, the p99 latency budget, and whether a stale read causes a real bug or a cosmetic one. A single well-indexed relational box comfortably serves tens of thousands of QPS, so the burden of proof sits on whoever wants to leave it."
    },
    {
      "label": "Which NoSQL product: MongoDB versus DynamoDB is the decision",
      "feedback": "Tempting because product names sound concrete, but picking within a family before establishing the drivers is the same mistake one level down."
    },
    {
      "label": "Nothing; relational databases do not scale, so the instinct is right",
      "feedback": "This is the exact myth. Tens of thousands of QPS on one well-indexed Postgres box is routine, which is why relational is the correct default for most features."
    }
  ]
}
\`\`\`

The drivers, roughly in the order they decide things: **access patterns** (what queries do you
actually run, and by what key), **read/write ratio and volume** (QPS now and in two years),
**consistency needs** (does a stale read cause a real bug or just a cosmetic one), **scale** (does
the working set fit one big node or not), **latency target** (p99 budget), and **query complexity**
(joins, aggregations, ad hoc filters, full-text, geospatial). Two more sit underneath: **operational
cost** (managed vs self-hosted, and does your team already run it) and **transactions** (do you need
multi-row ACID).

### Drivers to families

- **Relational (Postgres, MySQL):** rich queries, joins, ACID transactions, strong consistency. The
  correct default for most features. A single well-indexed Postgres box comfortably serves tens of
  thousands of QPS.
- **Key-value (Redis, DynamoDB):** always access by a known key, single-digit-ms latency, millions of
  ops/sec. Sessions, carts, flags, counters. Weak at ad hoc queries.
- **Document (MongoDB):** self-contained JSON documents, flexible schema, query by fields inside the
  document. Catalogs and content where the aggregate loads whole.
- **Wide-column (Cassandra, Bigtable, HBase):** massive write throughput, huge datasets, queries
  known in advance and modeled as partitions. Weak at joins and ad hoc filters.
- **Graph (Neo4j):** the value is in relationships and multi-hop traversals.
- **Time-series (InfluxDB, TimescaleDB, Prometheus):** append-heavy timestamped metrics with rollups
  and retention.
- **Vector (pgvector, Pinecone, Milvus):** nearest-neighbor search over embeddings.
- **Columnar / OLAP (Snowflake, BigQuery, ClickHouse):** large analytical scans and aggregations,
  kept separate from your OLTP store.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Read each workload's drivers and pick the storage family they point to.",
  "buckets": [
    "Relational (Postgres)",
    "Key-value (Redis / DynamoDB)",
    "Columnar OLAP (ClickHouse / BigQuery)"
  ],
  "items": [
    {
      "label": "Checkout: multi-row ACID transactions plus ad hoc reporting joins",
      "bucket": "Relational (Postgres)",
      "feedback": "Transactions plus rich, evolving queries are the relational sweet spot."
    },
    {
      "label": "Session lookup by token at single-digit milliseconds, millions of ops per second",
      "bucket": "Key-value (Redis / DynamoDB)",
      "feedback": "Always accessed by a known key with a tight latency budget: the key-value signature."
    },
    {
      "label": "A weekly revenue dashboard scanning a year of events",
      "bucket": "Columnar OLAP (ClickHouse / BigQuery)",
      "feedback": "Large analytical scans and aggregations belong in a columnar store, kept separate from OLTP."
    },
    {
      "label": "Feature flags read by key on every request",
      "bucket": "Key-value (Redis / DynamoDB)",
      "feedback": "Tiny values, known key, extreme read volume: classic key-value."
    },
    {
      "label": "A new CRUD feature whose future queries are still unclear",
      "bucket": "Relational (Postgres)",
      "feedback": "Unknown query shapes are the strongest argument for the flexible, boring default. Tempting to reach for something specialized, but you would be optimizing for patterns you cannot yet name."
    }
  ]
}
\`\`\`

### NewSQL: the family people miss

**NewSQL / distributed SQL (Spanner, CockroachDB, TiDB)** gives you **horizontal scale plus ACID and
SQL** by auto-sharding data across nodes and using consensus (Raft/Paxos) to keep replicas
consistent. The tradeoff versus a single Postgres is higher write latency per transaction (a commit
needs a cross-node quorum) and operational complexity. So: choose NewSQL when you have genuinely
outgrown one node **and** still need transactions and SQL, because the alternative is **app-level
sharding** of MySQL/Postgres, where you hand-roll routing, cross-shard joins, resharding, and
distributed transactions in application code. That is a large, permanent tax. NewSQL buys back most
of that pain at the cost of latency and money.

**Polyglot persistence** means using several stores, each for what it is best at, and syncing between
them: Postgres as the system of record, Redis for a hot cache, Elasticsearch for full-text, S3 for
blobs, a warehouse for analytics via CDC. The cost is operational surface area and keeping derived
data in sync, so you justify each store, you do not collect them.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "One product, five stores, each one justified",
  "reveal": "staged",
  "nodes": [
    {
      "id": "api",
      "label": "Product API",
      "kind": "service"
    },
    {
      "id": "postgres",
      "label": "Postgres (system of record)",
      "kind": "db"
    },
    {
      "id": "redis",
      "label": "Redis (session and flag cache)",
      "kind": "cache"
    },
    {
      "id": "s3",
      "label": "S3 (blob bytes by signed URL)",
      "kind": "db"
    },
    {
      "id": "search",
      "label": "Elasticsearch (ranked full-text)",
      "kind": "db"
    },
    {
      "id": "cdc",
      "label": "CDC stream (Debezium)",
      "kind": "queue"
    },
    {
      "id": "warehouse",
      "label": "ClickHouse (columnar scans)",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "api",
      "to": "postgres",
      "kind": "sync",
      "label": "orders, multi-row ACID"
    },
    {
      "from": "api",
      "to": "redis",
      "kind": "sync",
      "label": "session by key"
    },
    {
      "from": "api",
      "to": "s3",
      "kind": "sync",
      "label": "upload, key row in Postgres"
    },
    {
      "from": "api",
      "to": "search",
      "kind": "sync",
      "label": "ranked product search"
    },
    {
      "from": "postgres",
      "to": "cdc",
      "kind": "async",
      "label": "row change stream"
    },
    {
      "from": "cdc",
      "to": "search",
      "kind": "async",
      "label": "reindex documents"
    },
    {
      "from": "cdc",
      "to": "warehouse",
      "kind": "async",
      "label": "load facts"
    }
  ],
  "groups": [
    {
      "id": "record",
      "label": "Systems of record",
      "nodes": [
        "postgres",
        "s3"
      ]
    },
    {
      "id": "derived",
      "label": "Derived, rebuildable from the record",
      "nodes": [
        "search",
        "warehouse"
      ]
    }
  ],
  "stages": [
    {
      "adds": [
        "api",
        "postgres"
      ],
      "note": "Start on one well-indexed relational box. It answers the joins, holds the multi-row ACID transactions, and serves tens of thousands of QPS, so every store after this one has to beat it on a driver you can name."
    },
    {
      "adds": [
        "redis"
      ],
      "note": "Sessions and feature flags are read by a known key on every single request against a single-digit-millisecond budget. That is a latency and access-pattern driver, not a scale one, and it is the pattern a relational index serves worst per dollar."
    },
    {
      "adds": [
        "s3"
      ],
      "note": "Product images are megabytes each. Blob bytes inside a row bloat the page cache and every backup, so the bytes move to object storage and the row keeps only the key. Postgres stays the record for what the object IS."
    },
    {
      "adds": [
        "search"
      ],
      "note": "Typo-tolerant, ranked, faceted search is a query shape a B-tree cannot answer at any size of machine. This is the first store bought for query complexity rather than for volume, and it is derived data: you can drop it and rebuild."
    },
    {
      "adds": [
        "cdc",
        "warehouse"
      ],
      "note": "Finance wants a year of orders scanned per dashboard load, and that scan would evict the OLTP cache the checkout depends on. Analytics moves to a columnar store fed by change data capture, so the API still writes in exactly one place."
    }
  ],
  "caption": "Read the notes as five arguments. A store enters only when a driver the existing ones cannot serve shows up, and the dashed lanes mark which stores you could lose and rebuild from the record."
}
\`\`\`

**Interview nuance:** Reason with **PACELC**, not a CAP one-liner. CAP only speaks about behavior
during a partition; PACELC adds the normal case: even when there is no partition (Else), you still
trade **Latency** against **Consistency**. Spanner chooses consistency and pays latency; Dynamo
chooses availability and latency and gives you eventual consistency. Naming PACELC signals you know
CAP is not the whole story.

Recap: Drive from access pattern, consistency, scale, and query shape to a family, default to boring
well-indexed relational, reach for NewSQL only when you have outgrown one node yet still need SQL and
ACID (versus hand-rolled sharding), and treat polyglot persistence as a justified set of specialized
stores, not a collection.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You close your storage defense with: 'CAP says pick two; we picked availability, done.' Why does that under-answer the question?",
  "options": [
    {
      "label": "It does not; CAP fully describes the trade space",
      "feedback": "Tempting because CAP is the famous acronym, but CAP only describes behavior during a partition, which is rare. It says nothing about the trade you make the rest of the time."
    },
    {
      "label": "CAP only speaks about partitions, which are the rare case",
      "correct": true,
      "feedback": "Right. PACELC adds the else-case CAP leaves out: even when there is no partition, you still trade Latency against Consistency, and that is the trade your system lives with every single day. Spanner chooses consistency and pays the latency; Dynamo-style stores choose availability and latency and hand you eventual consistency. Naming the everyday else-case is what defending against the runner-up sounds like."
    },
    {
      "label": "The problem is choosing availability; correct systems choose consistency",
      "feedback": "Tempting as a safety instinct, but plenty of features tolerate staleness happily. The flaw in the answer is the missing else-case reasoning, not the letter chosen."
    }
  ],
  "reveal": "The synthesis for the design exercise: name the drivers with numbers, map them to a family, default to boring well-indexed relational, escalate to NewSQL only when you have outgrown one node yet still need SQL and ACID (the alternative is hand-rolled app-level sharding), justify every extra store in a polyglot setup, and reason about consistency with PACELC rather than a CAP one-liner."
}
\`\`\`
`.trim()

/**
 * Read-only artifact for `sd-l2-choosing-db-polyglot-practice`, the level's second CRITIQUE.
 *
 * Written as a real ADR: three of the six calls (Cassandra for messages, Postgres for the small
 * relational core, S3 for attachment bytes) are CORRECT and defended on their drivers, so the
 * learner has to separate the good arguments from the ones that only sound good. The three that do
 * not hold are each justified by something a tired team genuinely says, "we already operate it" and
 * "the primary is never touched", which is what makes them worth reviewing rather than spotting.
 */
const polyglotCritiqueArtifact = `
**ADR-014: storage for launch. Chat product, 12 million monthly users.**

Numbers we are designing against: 3 million concurrent connections at peak, 400,000 messages per
second written across all channels, 8 billion messages retained, and every connected client
heartbeating its presence every 10 seconds.

**Messages: Cassandra.** Partition key (channel_id, 10-day bucket), clustered by message id
descending, so the hot read "the most recent 50 messages in this channel" is a single-partition
slice. Postgres was rejected here: 8 billion rows at 400,000 writes per second is past one node, and
the read needs no joins.

**Users, servers, roles, permissions: Postgres.** Small, highly relational, and a permission change
has to be a multi-row transaction. One primary, two read replicas.

**Attachments: S3.** The bytes live in object storage; the Cassandra row keeps the key and the
content type.

**Presence: Postgres.** A \`user_presence(user_id primary key, status, last_seen)\` table on the same
primary. Every heartbeat runs \`UPDATE user_presence SET status = ?, last_seen = now() WHERE
user_id = ?\`, and presence is read on every channel open. We considered Redis and chose Postgres
because we already operate it, and one fewer system at launch is worth real money.

**Search: Postgres.** Every message is inserted a second time into
\`messages_fts(message_id, channel_id, body)\` with a GIN index over \`to_tsvector(body)\`. The API
handler writes the Cassandra row first, then the \`messages_fts\` row, inside the same request.
Search runs \`WHERE channel_id = ? AND to_tsvector(body) @@ plainto_tsquery(?)\`.

**Analytics: Postgres read replicas.** The weekly engagement dashboard aggregates over a year of
rows against the two replicas, so the primary is never touched.
`.trim()

export const systemDesignLevel2: DesignLevel = {
  id: 2,
  slug: "data-storage",
  title: "Level 2: Data Storage & Modeling",
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
            "Why snapshot isolation still allows write skew, and how naming the exact anomaly gets you a surgical fix instead of Serializable.",
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
              "Common wrong turn: assuming Repeatable Read means the same thing on both engines. The optimistic version check survives under Read Committed, where the guarded UPDATE matches 0 rows so you retry cheaply, and it survives under MySQL InnoDB Repeatable Read even when the app writes an absolute `stock = :computed`, because the second writer blocks until the first commits and then re-checks the committed row. Postgres Repeatable Read is the one that behaves differently: it is first-updater-wins, so the second writer is aborted with a serialization failure the application must catch and retry, and under flash-sale contention that retry churn is exactly why the atomic conditional decrement still wins.",
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
            "MVCC versions rows so readers and writers never block each other, and one forgotten long transaction bloats the table by pinning vacuum.",
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
            "B-trees update pages in place for fast reads and range scans; LSM-trees append and compact to buy write throughput instead.",
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
        {
          id: "sd-l2-indexing-cost",
          title: "Indexing: Types, Structure & Cost",
          summary:
            "Order composite indexes equality-then-sort per the leftmost-prefix rule, make hot queries covering, and remember every index taxes every write.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["indexing", "query-performance"],
          teach: {
            markdown: indexingCostTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-indexing-cost-apply",
            prompt:
              "Design the indexes for a query that filters by user_id, filters by status, and sorts by created_at, and explain the index that serves it fully.",
            thinkAbout: [
              "How does the leftmost-prefix rule drive composite column ordering?",
              "What makes an index-only (covering) scan possible?",
              "Why does over-indexing hurt writes?",
            ],
            modelAnswerOutline: [
              "The query is roughly `SELECT ... FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 20`. The right index is a **composite on (user_id, status, created_at)**.",
              "**Why that order:** `user_id` and `status` are both equality filters, so they go first; together they pin a single contiguous run of index entries. Within that run the entries are already sorted by `created_at`, so the ORDER BY ... LIMIT 20 becomes 'walk the tail of that run backward and stop after 20 rows': no separate sort step, no scanning rows that get discarded.",
              "**Why other orders fail:** (created_at, user_id, status) is useless for this query because `created_at` leads with no equality on it, so the engine falls back to scanning the whole index. Putting `created_at` before `status` is subtler: the sort stays free (within a `user_id` the entries are still ordered by `created_at`), but the tight LIMIT dies. `status` is no longer part of the equality prefix, so the engine walks the user's whole `created_at` run discarding other statuses before it collects 20 rows, and the rarer the status the more it discards.",
              "**Direction:** define `created_at DESC` (or rely on the engine reading the B-tree backward, which Postgres and InnoDB both do) so the newest-first LIMIT is a cheap prefix read.",
              "**Covering:** add the columns the SELECT returns as included payload (`INCLUDE (total, currency)` in Postgres, or extend the key in MySQL) so the query becomes an index-only scan that never visits the heap, removing one random read per returned row. Only do this for a genuinely hot query: included columns widen every entry and increase storage and write cost.",
              "**The cost accepted:** this index must be maintained on every insert and every status update. Fine here because reads of a user's orders dominate.",
              "Common wrong turn: creating three single-column indexes on user_id, status, and created_at and expecting the planner to combine them. A bitmap-AND of separate indexes usually cannot serve the sort, so it filters then sorts in memory, far slower than the one composite index, while quietly tripling write amplification.",
            ],
          },
          practice: {
            id: "sd-l2-indexing-cost-practice",
            prompt:
              "Design the indexing strategy for Stripe's charges table, a write-heavy multi-tenant table with billions of rows where the dashboard runs WHERE merchant_id = ? AND status = ? ORDER BY created_at DESC but analysts also occasionally filter by customer_id and by a JSONB metadata field. Justify what you index, what you deliberately do not, and how you keep writes cheap.",
            thinkAbout: [
              "Which single query must be fast for every tenant, and what exact index serves it?",
              "What do partial and expression indexes buy you on a write-heavy table?",
              "Which queries should deliberately stay slow, and why is that the right trade?",
            ],
            modelAnswerOutline: [
              "Assumptions: the table is on the write hot path (every charge, refund, and status transition writes here), multi-tenant so almost every query is scoped by merchant_id, and billions of rows, so a full scan is never acceptable for the interactive dashboard but tolerable for rare analyst jobs.",
              "**Primary serving index: composite (merchant_id, status, created_at DESC)**, exactly matching the dashboard query. merchant_id leads because it is always present and high-cardinality (keeping each merchant's slice small); status is the second equality; created_at last gives the free reverse-time sort for the paginated LIMIT. Consider making it covering only for the handful of columns the dashboard list view renders, accepting the width because that view is extremely hot.",
              "**customer_id:** occasional analyst use, not hot path. Use a partial index if most lookups target a subset (e.g. non-terminal charges), or scope it as (merchant_id, customer_id) so it stays cheap and tenant-local. If truly rare, index nothing and let it run as a scoped scan.",
              "**JSONB metadata: no broad GIN index by default.** GIN maintenance is expensive on a write-heavy table and metadata is high-cardinality and rarely filtered. If a specific key becomes a common filter, add a targeted expression index on just that extracted key (`(metadata->>'invoice_id')`), far cheaper than indexing the whole document.",
              "**The discipline:** every index taxes the write hot path. Index the one query that must be fast for every tenant, serve secondary patterns narrowly with partial and expression indexes, and refuse the broad 'index everything' reflex. The committed tradeoff: rare analyst queries pay with slower scoped scans so billions of daily writes and the interactive dashboard stay fast.",
            ],
          },
        },
        {
          id: "sd-l2-physical-storage-wal",
          title: "Physical Storage: Pages, Buffer Pool & WAL",
          summary:
            "Writes land in dirty buffer-pool pages flushed lazily at checkpoints; the fsync'd sequential WAL is the durability point and the crash-recovery source.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["storage", "wal", "durability"],
          teach: {
            markdown: physicalStorageWalTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-physical-storage-wal-apply",
            prompt:
              "Explain what physically happens on disk and in memory when a row is inserted and the transaction commits.",
            thinkAbout: [
              "What is the role of the buffer pool and dirty-page flushing?",
              "Why does the WAL give durability and enable crash recovery?",
              "Why is the 100x gap between sequential and random I/O a design driver?",
            ],
            modelAnswerOutline: [
              "Assume a row-store OLTP database like Postgres or InnoDB, following `INSERT ...; COMMIT`.",
              "**First:** the engine locates the target page (8KB or 16KB) for the new row. If not resident, it is read from disk into the buffer pool, possibly evicting a cold page. The row is written into the page *in memory* and the page is marked dirty. Nothing has touched the data file on disk yet.",
              "**Second, the durability point:** before the commit can return, the engine appends a redo record describing this insert to the write-ahead log and calls fsync to force the WAL to stable storage. The WAL write is a sequential append, which is why it is cheap relative to a random write, and multiple concurrent commits are batched into one fsync via group commit. Once the WAL is fsync'd, the transaction is durable and success returns to the client.",
              "**Third, asynchronously:** the dirty data page is eventually flushed to its home location at a checkpoint, along with other accumulated dirty pages. This flush is more random and is deliberately deferred and batched so many updates to the same hot page collapse into one physical write.",
              "**Crash recovery ties it together:** if the machine dies after the WAL fsync but before the checkpoint flush, the data page is gone, but on restart the engine replays WAL records since the last checkpoint and reconstructs it. The guarantee is precise: commit means the WAL record is fsync'd, not that the data page is on disk.",
              "**Why this structure:** the roughly 100x advantage of sequential over random I/O. Making durability depend on a sequential WAL append rather than a random data-page write is what lets a database commit thousands of transactions per second while surviving power loss.",
              "Common wrong turn: claiming the insert is durable once it is in the buffer pool, or once `write()` returns, forgetting that the buffer pool is volatile and the OS page cache means only an fsync'd WAL is truly safe.",
            ],
          },
          practice: {
            id: "sd-l2-physical-storage-wal-practice",
            prompt:
              "Explain the durability and latency tradeoffs when a payments service commits at 20,000 write transactions/sec on a single Postgres primary, and choose settings for synchronous_commit, group commit, and synchronous replication. Justify where you would relax durability and where you would not.",
            thinkAbout: [
              "What is the binding physical constraint at 20K write TPS, and what amortizes it?",
              "Which writes on this system can tolerate losing the last few milliseconds on a crash?",
              "What does a synchronous standby add beyond a local fsync, and what does it cost?",
            ],
            modelAnswerOutline: [
              "At 20K write TPS the fsync on the WAL is the binding constraint: a single fsync costs tens of microseconds to a few milliseconds depending on the device, and one per transaction serially would cap throughput well below target. The design is about batching fsyncs without lying about durability.",
              "**Payment transactions: `synchronous_commit = on`, full stop.** Money movement must be durable before the API returns success. Lean on group commit (`commit_delay` / `commit_siblings`) so under high concurrency hundreds of in-flight commits share a single fsync: the key move that preserves per-transaction durability while amortizing the expensive fsync, which is how you hit 20K TPS without 20K fsyncs.",
              "**Non-critical writes on the same system** (audit-log rows, analytics events where losing the last few milliseconds on a crash is acceptable): set `synchronous_commit = off` per-transaction, letting those commits return before the WAL fsync. Never for the ledger.",
              "**Replication:** run a synchronous standby (`synchronous_commit = remote_write` or `remote_apply`) so a committed payment survives loss of the primary, not just a local fsync. The cost is a network round trip on every commit, so place the sync standby region-local/AZ-adjacent to keep it under a couple of milliseconds, and keep additional replicas asynchronous.",
              "**The committed tradeoff:** money transactions pay full local-plus-remote durability and accept the latency; group commit keeps per-transaction fsync cost low enough for 20K TPS; only genuinely disposable writes relax synchronous_commit.",
              "Common wrong turn: globally disabling synchronous_commit to hit the throughput number, silently making the ledger lose committed payments on a crash.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l2-m3",
      title: "NoSQL Families",
      description:
        "Pick the right non-relational store and defend it: key-value for O(1) lookups, document for read-together trees, wide-column for write-heavy feeds, graph for deep traversals, time-series for metrics, and vector for semantic search.",
      lessons: [
        {
          id: "sd-l2-key-value",
          title: "Key-Value Stores",
          summary:
            "Encode everything you query on into a namespaced key, guard against hot keys, TTL cache data, and never treat a non-persistent cache as a source of truth.",
          estimatedMinutes: 25,
          difficulty: "easy",
          skills: ["key-value", "redis", "sessions"],
          teach: {
            markdown: keyValueTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l2-key-value-apply",
            prompt:
              "Design the data layout for user sessions and rate-limit counters in a key-value store, including key schema and TTLs.",
            thinkAbout: [
              "How do you design keys and namespaces to avoid hot keys?",
              "When is a KV store a cache vs a source of truth?",
              "What does value-blob opacity mean for your model?",
            ],
            modelAnswerOutline: [
              "Assume Redis, a web app with a few million DAU, 30-minute sliding session timeout, and a rate limit of 100 API calls per user per minute.",
              "**Sessions.** Key `session:{sessionId}` where sessionId is a 128-bit random token. Store the session as a Redis **hash** so individual fields (userId, csrfToken, lastSeen, roles) update without rewriting the blob. TTL `EXPIRE session:{id} 1800`, refreshed on each authenticated request for a sliding window. Because the value is opaque, 'all sessions for user 123' needs a reverse index: `user:{userId}:sessions` as a set of session ids, deleted explicitly for 'log out everywhere.'",
              "**Sessions are a source of truth for live logins:** run Redis with AOF persistence and a replica, and set `noeviction` so a full instance fails writes loudly instead of silently evicting a logged-in user. `volatile-lru` is the trap here: every session key carries a TTL and the reverse index does not, so eviction lands entirely on live sessions and leaves orphaned pointers behind. Keep memory headroom and alert on `used_memory` so you scale before it fills, and accept a failed write over a silent logout.",
              "**Rate-limit counters.** Key `ratelimit:{userId}:{minuteBucket}` where minuteBucket is floor(epochSeconds / 60). Each request does INCR then, on first creation, EXPIRE 60; the bucketed key self-expires with no cleanup job. This is **cache-like**: losing a counter on restart means a user briefly gets extra calls, acceptable, so persistence is optional. For a smoother sliding window, use a **sorted set** per user keyed by timestamp, counting entries in the trailing 60s and trimming with ZREMRANGEBYSCORE.",
              "**Hot keys:** a global counter (`ratelimit:global`) concentrates traffic on one shard; shard it into `ratelimit:global:{0..15}`, increment a random shard, sum on read. Per-user keys naturally spread across the keyspace.",
              "Common wrong turn: putting queryable attributes (like lastActive) inside the opaque value and then discovering you cannot query them, or running the session store as a non-persistent cache and logging every user out on a restart.",
            ],
          },
          practice: {
            id: "sd-l2-key-value-practice",
            prompt:
              "Design the key-value layer for Twitch's live-stream viewer-count and chat rate-limiting during a top event peaking at 5 million concurrent viewers on a single channel, where a naive global counter would melt one shard. Explain the key schema, the hot-key mitigation, and the consistency you accept.",
            thinkAbout: [
              "What makes a single channel's viewer count the archetypal hot key?",
              "Does the displayed count actually need to be exact, and what does relaxing that buy?",
              "Where can rate-limit enforcement move so a channel-wide limit is not a global lock?",
            ],
            modelAnswerOutline: [
              "Assumptions: one channel with 5M concurrent viewers, viewer count displayed with a few seconds of staleness tolerance, chat rate-limited per user and per channel, sub-second update latency.",
              "**Viewer count is the archetypal hot key:** 5M clients incrementing `viewers:{channelId}` would serialize on one shard. Use **sharded counters**: `viewers:{channelId}:{0..255}`. Each edge server increments a random (or edge-id-hashed) shard with INCR, and a background aggregator sums the 256 shards every 2 seconds into `viewers:{channelId}:total`, which clients read. Exactness is traded for throughput: the displayed count lags by seconds, fine for a viewer badge.",
              "**Drift correction:** increments on connect and decrements on disconnect miss occasionally, so reconcile periodically against the connection manager's true socket count.",
              "**Chat rate-limiting, two scopes.** Per-user: `ratelimit:chat:{userId}:{secondBucket}` with INCR/EXPIRE 1, enforcing a few messages per second. Per-channel (slow mode): a channel-wide limit is itself a hot key, so push enforcement to the chat edge nodes with a local token bucket per node and only periodically sync aggregate state to Redis, accepting slight over-admission rather than a global lock on every message.",
              "**Consistency accepted:** deliberately eventual/approximate for counts (AP-style), because a viewer badge off by 0.1% for 2 seconds costs nothing, whereas exact synchronous counting at 5M concurrent would require coordination that blows the latency budget. Redis Cluster shards the keyspace; sharded-counter keys spread write load, replicas serve the aggregated-total read.",
              "Common wrong turn: a single `INCR viewers:{channelId}` for correctness: exact, but concentrates millions of writes on one node and falls over. The senior move is recognizing the count does not need to be exact and buying massive throughput with sharding plus periodic aggregation.",
            ],
          },
        },
        {
          id: "sd-l2-document",
          title: "Document Databases",
          summary:
            "Embed bounded read-together data, reference large or unbounded entities, respect the 16MB cap, and treat per-document atomicity as a design constraint.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["document-db", "mongodb", "modeling"],
          teach: {
            markdown: documentTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l2-document-apply",
            prompt:
              "Design the document model for a blog/CMS with posts, comments, and authors, deciding what to embed vs reference.",
            thinkAbout: [
              "What data is read together and should be embedded?",
              "When does referencing win despite requiring lookups?",
              "Why is atomicity per-document a constraint?",
            ],
            modelAnswerOutline: [
              "Assume MongoDB, a blog with tens of thousands of posts, popular posts reaching thousands of comments, and the hot read path being 'render a post page with its author and recent comments.'",
              "**Authors: reference.** An author is a large, independently accessed entity appearing across many posts, and their name or avatar can change. Embedding a full copy in every post duplicates data and turns a name change into a fan-out update across thousands of documents. The post holds `author.id` plus a small **denormalized display subset** (name, avatar) so the common render needs no join; the canonical author lives in an `authors` collection, with a background job updating denormalized copies on change (accepting brief staleness).",
              "**Recent comments: embed a bounded subset.** The post page shows the latest ~20 comments, so embed them as an array in the post document with denormalized commenter names/avatars. One read renders the page. Keep the array **bounded**: on a new comment, push and trim to the newest 20, because an unbounded array eventually blows the **16MB document limit** and makes the post heavy to read.",
              "**Full comment history: reference.** All comments live in a `comments` collection keyed by postId with an index on (postId, createdAt); 'load more comments' pages this collection. Post document stays small, comment count unbounded.",
              "**Atomicity:** store `commentCount` inside the post document and increment it in the **same atomic write** that pushes the new comment into the embedded array, because per-document updates are atomic. The full comment also inserts into `comments`; prefer making the post-document update the display source of truth and treating the history insert as append-only, reaching for a multi-document transaction only if both writes must be all-or-nothing.",
              "Common wrong turn: embedding all comments in the post (hits 16MB, bloats reads), embedding full author copies everywhere (fan-out updates), or assuming a document store gives free relational transactions across posts, authors, and comments.",
            ],
          },
          practice: {
            id: "sd-l2-document-practice",
            prompt:
              "Design the Firestore/MongoDB document model for Notion-style nested pages where a page contains blocks (text, images, tables, sub-pages) that can nest arbitrarily deep and a busy workspace page can have thousands of blocks. Explain your embed/reference split, how you avoid the document-size cliff, and how you keep block reordering fast.",
            thinkAbout: [
              "What breaks, twice, if the entire block tree is embedded in one page document?",
              "How does a fractional order key make reordering a single-block write?",
              "What does per-document atomicity give two users editing different blocks?",
            ],
            modelAnswerOutline: [
              "Assumptions: a document store, arbitrarily deep block nesting, pages with up to thousands of blocks, frequent block edits and reordering, multiple users viewing a page.",
              "**Do not embed the block tree.** The naive single-page-document model fails twice: a busy page exceeds the 16MB cap, and every keystroke rewrites a huge document, killing write throughput and concurrency. Instead, **each block is its own document** in a `blocks` collection: `{ _id, pageId, parentId, type, content, order }`. The page document holds only metadata (title, icon, permissions, rootBlockIds).",
              "**Rendering:** fetch all blocks with `pageId == X` (indexed on pageId) and reassemble the tree client-side from parentId pointers. Reference-heavy on purpose: blocks are numerous, independently edited, and unbounded, exactly when referencing wins. Editing one block is a single small-document atomic write, so two users editing different blocks never contend.",
              "**Ordering: fractional keys.** A reorder must not rewrite every sibling. Use a fractional `order` (a string or float between neighbors): moving a block computes a key between its new neighbors' values, so a reorder is a single-block update, not an O(n) renumber. Rebalance keys periodically if they get too dense.",
              "**Nesting depth** is handled by parentId, not physical embedding, so arbitrary depth costs nothing in document size. Sub-pages are blocks of type `page` pointing at another page document.",
              "**The accepted tradeoff:** rendering is now N block reads instead of one document read, mitigated by a single indexed query on pageId, client-side assembly, and caching the assembled tree.",
              "Common wrong turn: embedding the tree for 'one fast read' and hitting the size cliff plus write contention the moment a page gets popular.",
            ],
          },
        },
        {
          id: "sd-l2-wide-column",
          title: "Wide-Column / Column-Family Stores",
          summary:
            "Why Cassandra wants one denormalized table per query, and how a partition key spreads load without growing unbounded.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["wide-column", "cassandra", "modeling"],
          teach: {
            markdown: wideColumnTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-wide-column-apply",
            prompt:
              "Design the Cassandra table(s) for a messaging app's message history optimized for 'load recent messages in a conversation.'",
            thinkAbout: [
              "How do partition key and clustering columns serve the query?",
              "How do you avoid unbounded and hot partitions?",
              "What consistency does a quorum read/write give?",
            ],
            modelAnswerOutline: [
              "Assume Cassandra with replication factor 3, millions of conversations, the dominant read being 'load the latest 50 messages in a conversation and page backward,' and heavy concurrent writes.",
              "**The table, modeled to the query:** `CREATE TABLE messages_by_conversation (conversation_id uuid, bucket text, created_at timeuuid, message_id timeuuid, sender_id uuid, body text, PRIMARY KEY ((conversation_id, bucket), created_at)) WITH CLUSTERING ORDER BY (created_at DESC)` where bucket is a month like '2026-07'.",
              "**Why this serves the query:** the partition key (conversation_id, bucket) co-locates a conversation's messages for a month on one replica set, so 'load recent' is a single-partition read with no scatter-gather. The clustering column created_at DESC stores rows newest-first, so 'latest 50' is literally the first 50 rows, LIMIT 50, no read-time sort. Paging backward continues the slice; crossing a month boundary walks to the previous bucket.",
              "**Unbounded partitions avoided:** without the bucket, a busy conversation's partition grows without bound and eventually degrades reads and destabilizes the node. The month bucket keeps partitions well under the ~100MB / 100k-row guidance; shrink to a day bucket for extreme volume.",
              "**Hot partitions:** a viral group chat concentrates writes on one partition's replicas. If needed, sub-partition by adding a small shard (0..N) to the partition key and scatter-gather across shards on read, trading a fan-out read for spread write load. Only pay that for genuinely hot conversations.",
              "**Consistency:** write and read at QUORUM on RF=3. Write-quorum (2 of 3) and read-quorum (2 of 3) overlap by at least one replica, so a reader always sees the latest acknowledged write (read-your-writes freshness, not linearizability) while tolerating one replica down. Drop to ONE for low-value paths like typing indicators.",
              "Common wrong turn: partitioning by conversation_id alone (unbounded partition), or adding a secondary index on sender_id instead of building a second messages_by_sender table.",
            ],
          },
          practice: {
            id: "sd-l2-wide-column-practice",
            prompt:
              "Design the Cassandra data model for Discord's message storage, roughly a trillion messages, where channels range from a 2-person DM to a 500k-member server firehose, and the read 'jump to any point in a channel's history and page' must stay fast. Explain the partition strategy that survives both extremes and how you handle deletes/edits in an append-optimized store.",
            thinkAbout: [
              "Why can no single fixed idea of 'bucket per conversation' serve both a DM and a firehose channel?",
              "What lets 'jump to any point in history' compute its partition directly from the message id?",
              "What do tombstones do to range reads, and how do you keep them out of the hot path?",
            ],
            modelAnswerOutline: [
              "Assumptions: trillions of messages, channels spanning six orders of magnitude in volume, the core read being 'load messages around a point in a channel and page in both directions,' and edits/deletes rare relative to writes. (This mirrors Discord's real Cassandra/ScyllaDB design.)",
              "**Partition strategy: bucket by time window, sized to the worst case.** Partition key (channel_id, bucket) where bucket is a coarse time window. One fixed bucket size cannot be perfect for both extremes: a 2-person DM wants large buckets (else reads span dozens of tiny partitions) and a 500k firehose wants small ones (else the partition blows past 100MB). Discord uses a **static ~10-day bucket derived from the Snowflake message id timestamp**, chosen so even high-traffic channels stay under the partition-size ceiling, accepting sparse partitions for quiet channels.",
              "**Reads:** message ids are Snowflakes (time-ordered), so the bucket is computable from the id. 'Jump to a point' computes the bucket from the target message id and does a single-partition slice; paging walks adjacent buckets. Clustering by message_id gives time order for free, with no separate created_at and no read-time sort.",
              "**Edits and deletes in an LSM store:** never update in place. An edit rewrites the row (same primary key, new body); latest write wins by timestamp during compaction. A delete writes a **tombstone** that shadows the row until compaction removes it after gc_grace_seconds.",
              "**The tombstone trap:** a channel that deletes many messages accumulates tombstones that slow range reads (Cassandra must scan and skip them). Keep bulk deletion rare, tune gc_grace_seconds, and rely on time-bucketing so old buckets (and their tombstones) age out of the hot read path entirely.",
              "Common wrong turn: a single unbucketed channel_id partition (a busy server's partition grows into gigabytes and dies) or per-message dynamic bucket sizes that make the bucket un-computable from the id. The senior insight: one bucket size that bounds the worst case, plus time-ordered ids so the id itself encodes both order and location.",
            ],
          },
        },
        {
          id: "sd-l2-graph",
          title: "Graph Databases",
          summary:
            "Index-free adjacency keeps deep traversals local while recursive SQL joins explode; a 1-2 hop adjacency table in SQL is often the simpler right choice.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["graph-db", "neo4j"],
          teach: {
            markdown: graphTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l2-graph-apply",
            prompt:
              "Design the graph model for a social network's friends-of-friends and mutual-connection queries.",
            thinkAbout: [
              "Why do recursive relational joins blow up at traversal depth?",
              "What does index-free adjacency buy you?",
              "When does an adjacency table in SQL suffice instead?",
            ],
            modelAnswerOutline: [
              "Assume Neo4j, a social network with tens of millions of users, average degree in the low hundreds, and target queries 'people you may know' (friends-of-friends) and 'mutual connections between A and B.'",
              "**Model:** `(:User {id, name})` nodes with a `[:FRIEND]` relationship between mutual friends (stored once and traversed both directions, or as a reciprocal pair). Edge properties like `since` live on the relationship. Relationships are first-class: no join table.",
              "**Friends-of-friends in Cypher:** `MATCH (me:User {id:$id})-[:FRIEND]-(f)-[:FRIEND]-(fof) WHERE fof <> me AND NOT (me)-[:FRIEND]-(fof) RETURN fof, count(*) AS mutuals ORDER BY mutuals DESC LIMIT 20`. Two pointer hops out from `me`, touching only the local neighborhood (~degree-squared nodes, not the whole 10M-user graph), with `count(*)` giving the mutual-connection ranking for free.",
              "**Mutual connections:** `MATCH (a:User {id:$a})-[:FRIEND]-(m)-[:FRIEND]-(b:User {id:$b}) RETURN m`: two short traversals intersecting at the shared node.",
              "**Why not SQL:** in a relational friendships table, friends-of-friends is a self-join of a self-join; at average degree 200 the intermediate result is ~40k rows per user before dedup, and mutual-connection ranking across the base becomes a heavy aggregate. Works at small scale, degrades as depth or degree grows.",
              "**When SQL would suffice:** if the product only showed direct friends (1 hop) and a simple mutual count, a `friendships(user_a, user_b)` table indexed on both columns answers both with one indexed query each, and Neo4j would not be introduced at all. The graph database earns its place specifically because 'people you may know' is an inherently 2-hop, ranked-by-shared-edges query.",
              "**Scaling caveat stated up front:** Neo4j is hard to shard because partitioning cuts the very edges being traversed; scale reads with replicas and, for a truly massive graph, precompute PYMK suggestions in a batch job rather than traversing live per request.",
              "Common wrong turn: reaching for a graph database when the product only needs 1-hop direct-friend lookups, adding operational cost for no query-complexity benefit.",
            ],
          },
          practice: {
            id: "sd-l2-graph-practice",
            prompt:
              "Design the graph model for a payments company's real-time fraud-ring detection, where you must flag whether a new transaction connects (within 3 to 4 hops through shared devices, cards, IPs, and accounts) to a known fraudulent entity, at 10k transactions per second with a sub-100ms decision budget. Explain the model, the query, and how you meet the latency budget given graph scaling limits.",
            thinkAbout: [
              "What does a fraud ring look like structurally in a heterogeneous entity graph?",
              "Can a live 4-hop traversal per transaction hold a sub-100ms budget at 10k TPS?",
              "What can be precomputed offline so the hot path becomes a shallow lookup?",
            ],
            modelAnswerOutline: [
              "Assumptions: 10k TPS, sub-100ms per-decision budget, entities are accounts, cards, devices, IPs, and merchants, and fraud manifests as many entities clustered around shared identifiers (one device using 40 cards, one card across 30 accounts).",
              "**Model:** a heterogeneous graph: `(:Account)`, `(:Card)`, `(:Device)`, `(:IP)`, `(:Merchant)` nodes with edges like `(:Account)-[:USED]->(:Device)` and `(:Card)-[:BELONGS_TO]->(:Account)`. Known-bad entities carry a `:Flagged` label. Fraud rings show up as dense subgraphs where many accounts share a device, card, or IP: exactly a graph-shaped query and miserable in SQL.",
              "**Query:** on a new transaction, traverse 3 to 4 hops from the transaction's entities looking for a path to any `:Flagged` node or structural red flags (a device linked to more than K accounts): `MATCH (t)-[*1..4]-(bad:Flagged) RETURN bad LIMIT 1`, plus fan-out checks. Index-free adjacency keeps this touching only the transaction's local neighborhood.",
              "**Meeting the budget despite scaling limits: split the work.** A live 4-hop traversal per transaction at 10k TPS is where the graph database's horizontal-scaling weakness bites (cross-partition hops and contention blow 100ms). Offline/near-real-time, a graph-processing job continuously computes connected components and risk scores and materializes 'distance-to-known-fraud' and 'cluster risk' scores onto each entity node. In the hot path, the decision becomes a cheap lookup of the precomputed scores of the transaction's 4-5 directly involved entities plus a shallow 1-2 hop live check, fitting sub-100ms. New edges feed the next incremental recompute.",
              "The senior move: use the graph engine's traversal strength offline to precompute, keep the synchronous 10k-TPS path to a bounded shallow lookup. Common wrong turn: a full 4-hop live traversal per transaction, correct but unable to hold the latency budget at scale given graph sharding limits.",
            ],
          },
        },
        {
          id: "sd-l2-time-series",
          title: "Time-Series Databases",
          summary:
            "How a time-series database earns 10x compression and cheap rollups, and why one unbounded label can OOM Prometheus.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["time-series", "metrics", "cardinality"],
          teach: {
            markdown: timeSeriesTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-time-series-apply",
            prompt:
              "Design storage for a metrics/monitoring system ingesting millions of points/sec with fast recent-range queries and cheap long-term retention.",
            thinkAbout: [
              "Why is cardinality explosion the key failure mode?",
              "How do downsampling and retention tiers bound cost?",
              "Why is columnar + delta-of-delta compression a good fit?",
            ],
            modelAnswerOutline: [
              "Assume a fleet-monitoring system ingesting ~2M points/sec, dashboards querying the last hour heavily and last year occasionally, and 2 years of affordable retention required.",
              "**Data model:** each point is `metric_name{labels} -> (timestamp, value)`. Labels are strictly low-cardinality and bounded: host, region, service, status_code, endpoint_template. Unbounded labels (user_id, request_id, raw URL) are explicitly forbidden because series count is the product of label cardinalities, and one unbounded label explodes it into millions of series that OOM the index. Per-user needs go to an OLAP store or logs.",
              "**Storage engine:** a purpose-built TSDB (Prometheus plus a long-term store like Thanos/Mimir, or InfluxDB/TimescaleDB). Data is columnar, compressed with delta-of-delta on timestamps (near-zero for regular intervals) and Gorilla/XOR on values, yielding 10x+ compression: what makes 2M points/sec economical.",
              "**Time-partitioning:** write into time-bucketed chunks (2-hour or daily blocks). Recent-range queries touch only current chunks; dropping expired data is a cheap partition drop, not a mass DELETE.",
              "**Retention tiers + downsampling:** raw resolution for 7 days (hot, SSD), 1-minute rollups for 30 days (warm), 1-hour rollups for 2 years (cold, cheap disk or object storage). A 'last hour' dashboard reads raw; a 'last year' trend reads hourly rollups, so query cost is bounded by resolution, not raw volume. Rollups are precomputed continuously (recording rules / continuous aggregates).",
              "**Query path:** recent-range queries hit hot chunks at raw resolution in tens of ms; long-range queries transparently read the rollup tier. Ingest is decoupled with a remote-write buffer so a query spike never backs up ingestion.",
              "Common wrong turn: allowing high-cardinality labels ('tag by user for flexibility'), quietly growing series count until the index OOMs, or keeping raw points forever, blowing up long-range queries and storage cost. The fix to both is bounded labels plus downsampling and retention tiers.",
            ],
          },
          practice: {
            id: "sd-l2-time-series-practice",
            prompt:
              "Design the time-series storage for Datadog-style multi-tenant observability ingesting 20M points/sec across thousands of customers, where any one customer can accidentally emit a runaway high-cardinality metric that must not degrade other tenants. Explain your ingestion, cardinality guardrails, and how you isolate a noisy tenant.",
            thinkAbout: [
              "Where in the pipeline do you enforce cardinality limits so a runaway never reaches the index?",
              "What makes cardinality an isolation boundary rather than just a performance concern in multi-tenant?",
              "How do per-tenant quotas cover ingest, series count, and query cost?",
            ],
            modelAnswerOutline: [
              "Assumptions: 20M points/sec, thousands of tenants, per-tenant isolation required, dashboards over minutes-to-months, and the certainty that some customer will emit a metric tagged by request_id or pod_uid and explode cardinality.",
              "**Ingestion:** a horizontally scaled write path fronted by Kafka: agents remote-write to a stateless ingestion tier that validates, then produces to Kafka partitioned by (tenant_id, metric). Kafka absorbs bursts and decouples ingest from storage so a storage hiccup never drops customer data. Consumers write into a columnar TSDB (Mimir/Cortex-style) with delta-of-delta + Gorilla compression and time-bucketed blocks in object storage (S3) for cheap long-term retention, SSD for hot.",
              "**Cardinality guardrails (the crux):** enforce a per-tenant active-series limit and per-metric label-cardinality limits at ingest. When a tenant's series count crosses a threshold, reject or drop the offending high-cardinality label (or the metric) and surface a 'cardinality limit exceeded' warning in their UI rather than accepting it. Detect the usual culprits (UUID-looking label values, unbounded growth) and auto-quarantine. This is the difference between a runaway metric being one customer's dashboard problem versus a cluster-wide OOM.",
              "**Tenant isolation:** every write and query carries tenant_id; storage blocks and index are partitioned per tenant so one tenant's cardinality never shares an index with another's. Per-tenant quotas cover ingest rate, active series, and query concurrency/cost, so a noisy tenant hits their own limit first; an expensive year-long high-resolution query is throttled, not allowed to starve others.",
              "**Downsampling/retention** is per-tenant policy: raw for days, rollups for months to years, all in S3 tiers.",
              "Common wrong turn: a shared global index with no per-tenant cardinality caps: the first customer to tag by pod_uid takes down everyone. The senior insight: in a multi-tenant TSDB, cardinality is a security/isolation boundary, not just a performance concern, so it must be quota-enforced per tenant at the ingest gate.",
            ],
          },
        },
        {
          id: "sd-l2-vector-embeddings",
          title: "Vector Databases & Embeddings",
          summary:
            "ANN search trades recall for latency and memory: HNSW when RAM is affordable, IVF-PQ at billion scale, hybrid BM25 for exact tokens.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["vector-db", "embeddings", "ann"],
          teach: {
            markdown: vectorEmbeddingsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-vector-embeddings-apply",
            prompt:
              "Design the storage and retrieval layer for a RAG system that does semantic search over millions of document chunks.",
            thinkAbout: [
              "Which ANN index (HNSW, IVF, PQ) fits your recall/latency/memory budget?",
              "How do metadata filtering and hybrid (vector + BM25) search combine?",
              "When is pgvector enough vs a dedicated vector store?",
            ],
            modelAnswerOutline: [
              "Assume an enterprise RAG system over ~10M document chunks, multi-tenant (each query scoped to one org's documents), interactive retrieval budget under ~200ms, and a requirement to catch both semantic matches and exact terms (product codes, names).",
              "**Pipeline:** ingest documents, chunk them (~500 tokens with ~50-token overlap so context is not sliced mid-idea), embed each chunk with a fixed model (say 1024-dim), store `{vector, chunk_text, metadata: {org_id, doc_id, lang, updated_at, source}}`. Normalize vectors and use cosine distance.",
              "**Store choice:** at 10M chunks with multi-tenant filtering and sub-200ms needs, a dedicated vector store (Qdrant, Weaviate, or Milvus) rather than pgvector. pgvector wins under a couple million chunks with existing Postgres, but 10M plus heavy filtered ANN and horizontal scaling pushes to a purpose-built system.",
              "**Index: HNSW** as the primary: high recall at low latency, which matters because RAG answer quality depends on retrieving the right chunks. 10M x 1024-dim vectors fit in RAM on a reasonably sized cluster, so pay the memory cost for recall; tune efSearch to hit the recall target and measure. If the corpus grew to billions or memory got tight, switch to IVF-PQ to trade some recall for a large memory reduction.",
              "**Filtering:** every query is scoped by org_id (a hard multi-tenant boundary) plus optional lang/recency filters, using the store's filtered ANN (filter applied during graph traversal) rather than naive post-filtering, because post-filtering a selective org_id after top-K could return too few chunks.",
              "**Hybrid search:** run vector search + BM25 keyword search in parallel and fuse with reciprocal rank fusion, so a query mentioning an exact SKU or name still retrieves the lexically matching chunk that pure embeddings might rank low.",
              "**Retrieval:** return top ~20 by fused score, optionally rerank with a cross-encoder to top ~5, then pass to the LLM. **Migrations:** version embeddings; upgrading the embedding model means re-embedding all 10M chunks as a planned backfill, since old and new vectors are not comparable.",
              "Common wrong turn: assuming brute-force vector search scales (it does not past a few thousand), 'using HNSW' without measuring recall, or forgetting metadata filtering and leaking one tenant's chunks into another's answers.",
            ],
          },
          practice: {
            id: "sd-l2-vector-embeddings-practice",
            prompt:
              "Design the retrieval layer for Spotify-style podcast/music semantic search and recommendations over 5 billion embeddings (tracks, episodes, user taste vectors), where queries must return in under 50ms and the index must fit a realistic memory budget. Explain your index choice, how you shard, and how you keep recommendations fresh as new content arrives every minute.",
            thinkAbout: [
              "What does full in-RAM HNSW cost at 5 billion vectors, and what does IVF-PQ change?",
              "How does a query find its way across many shards and merge results?",
              "How does brand-new content become retrievable without retraining the base index?",
            ],
            modelAnswerOutline: [
              "Assumptions: 5 billion vectors, p99 under 50ms, a memory budget that makes full in-RAM HNSW over 5B vectors economically impossible, continuous ingestion of new tracks/episodes, and both search (query to items) and recommendation (taste vector to items) use cases.",
              "**Index: IVF-PQ, not pure HNSW.** At 5B vectors, full-precision vectors plus an HNSW graph in RAM cost an absurd amount of memory. IVF partitions the space so a query only scans a few (nprobe) partitions, and PQ compresses each vector to a short code (e.g. 64 bytes), cutting memory by an order of magnitude. This fits the budget and hits sub-50ms by probing a bounded number of partitions, accepting slightly lower recall, fine for recommendations where 'good' beats 'provably nearest.' Add a re-ranking pass on full-precision vectors for the top candidates to recover precision.",
              "**Sharding:** partition the 5B vectors across many shards (by IVF cluster or hash), each shard an IVF-PQ index on its own nodes; a query fans out to relevant shards and merges top-K (scatter-gather). Horizontal scale with bounded per-shard memory; replicas per shard give read throughput and availability.",
              "**Freshness: a two-tier index.** IVF training is expensive, so new content cannot wait for a full rebuild. Run a large, periodically rebuilt base IVF-PQ index for the bulk, plus a small, fast, freshly-updated HNSW (or flat) index for recent items that is cheap to insert into. Queries search both and merge, so a track uploaded a minute ago is retrievable immediately and folds into the base index at the next scheduled rebuild. User taste vectors update as people listen and are just another query vector against the item index.",
              "Common wrong turn: insisting on exact search or full in-memory HNSW at 5B scale (memory-infeasible, too slow to rebuild), or a single monolithic index that cannot ingest fresh content without a full retrain. The senior moves: IVF-PQ for the memory/latency budget, sharded scatter-gather for scale, and a hot fresh-item index layered over a periodically rebuilt base.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l2-m4",
      title: "Data Modeling",
      description:
        "Turn a feature spec into a schema that survives real traffic: normalize for write integrity, denormalize for named hot reads, model NoSQL backward from access patterns, and pick ID/key strategies that avoid hotspots.",
      lessons: [
        {
          id: "sd-l2-normalization-denorm",
          title: "Normalization vs Denormalization",
          summary:
            "Normalize by default for write integrity, and denormalize only a named hot read path with a read/write ratio you can quote.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["normalization", "denormalization", "modeling"],
          teach: {
            markdown: normalizationDenormTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-normalization-denorm-apply",
            prompt:
              "Design the schema for an e-commerce order, line-items, and product catalog, then denormalize it for a read-heavy order-history page.",
            thinkAbout: [
              "When are joins fine, and when do they fail to scale?",
              "What is the cost of denormalization (update anomalies, fan-out writes)?",
              "How do materialized views offer a managed middle ground?",
            ],
            modelAnswerOutline: [
              "Assume a store doing thousands of orders per hour, an order-history page rendering hundreds of times per second, and a product catalog that changes slowly (a few updates a day, not per second).",
              "**Normalized core (source of truth):** `products(product_id PK, name, price_cents)`, `orders(order_id PK, user_id FK, status, created_at, total_cents)`, `order_items(order_item_id PK, order_id FK, product_id FK, quantity, unit_price_cents)`. Critically, `unit_price_cents` is copied into order_items at purchase time: the price at the moment of sale is a distinct historical fact from the current catalog price. That is capturing the right fact, not denormalization. Index order_items(order_id) and orders(user_id, created_at).",
              "**Are the joins fine?** For most reads, yes: rendering one order joins via primary and foreign keys, a few indexed seeks, single-digit milliseconds. Joins would fail if orders were sharded by user and products globally, because rendering history would scatter-gather across shards.",
              "**Denormalize the hot page:** the order-history page is read-heavy and product data slow-changing, so build an `order_history` read model: one row per line item carrying order_id, user_id, status, created_at, product_name, quantity, line_total_cents. The page becomes a single indexed range scan on (user_id, created_at DESC) with zero joins.",
              "**The cost, and how it is paid:** product_name is now duplicated, so a rename is a fan-out write: update the catalog, then backfill the read model asynchronously (a job or CDC stream), accepting brief staleness on a cosmetic field. Do NOT sync unit_price_cents (the historical sale price never changes). Status changes propagate off the same order-events stream.",
              "**The managed middle ground:** define order_history as a materialized view refreshed incrementally, or maintain it via CDC (Debezium into a denormalized table), keeping the source of truth normalized while the pipeline owns the copy.",
              "Common wrong turn: denormalizing the whole schema up front 'for speed' with no measured hot path, trading guaranteed write-time complexity for a read win nobody needed. Denormalize the one page that is actually hot, after naming its read/write ratio.",
            ],
          },
          practice: {
            id: "sd-l2-normalization-denorm-practice",
            prompt:
              "Design the data model for the Amazon-scale 'Your Orders' page where the orders service is sharded by customer_id across hundreds of nodes and must render a customer's last 50 orders in under 100 ms at p99, while the product catalog is a separate, globally replicated service. Show exactly where you refuse to join and what you denormalize instead.",
            thinkAbout: [
              "What would a per-line-item catalog call cost against a 100ms p99 budget?",
              "Which fields are frozen historical facts, safe to snapshot at order time?",
              "Which fields must stay live, and where do they live so render needs no cross-service call?",
            ],
            modelAnswerOutline: [
              "Assume hundreds of millions of customers, orders sharded by customer_id (all of one customer's orders on one shard), and a catalog service owned by another team, globally replicated, that cannot be joined against from the orders shard.",
              "**Where to refuse to join:** orders and catalog live in different services and shard maps, so a join from an order shard to the catalog is a cross-service, cross-shard network fan-out per line item: unacceptable at a 100 ms p99. The 'Your Orders' read path performs ZERO live catalog joins.",
              "**What to denormalize:** at order-placement time, snapshot the display fields needed forever: product_title, image_url, unit_price_cents, quantity into the order-item record on the customer's shard. These are captured facts (title and price as of purchase), correct to freeze, never needing a catalog lookup on read. The page becomes a single-shard query: `WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50` with an index on (customer_id, created_at DESC), comfortably under 100 ms.",
              "**Handling change:** cosmetic catalog drift (title corrections, CDN URL rotation) does not rewrite history; the snapshot is the record of what was bought. Mutable fields the page must show live (delivery status, return eligibility) are stored on the order itself, same shard, updated via the order-events stream, never fetched from another service on render.",
              "**Scale and hotspots:** sharding by customer_id keeps each customer's history co-located and spreads load evenly; no single customer is a hotspot the way a celebrity product would be. The LIMIT 50 plus index bound keeps the query cheap regardless of lifetime order count.",
              "**Trade acknowledged:** snapshot staleness on cosmetic fields in exchange for a join-free, single-shard, sub-100 ms read. Common wrong turn: preserving normalization purity by calling the catalog service per line item, turning one page load into 50 cross-service RPCs and blowing the latency budget.",
            ],
          },
        },
        {
          id: "sd-l2-access-pattern-modeling",
          title: "Query-First Data Modeling",
          summary:
            "List every access pattern first, then shape DynamoDB keys so each one is a single-partition lookup instead of a scan.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["access-patterns", "modeling", "nosql"],
          teach: {
            markdown: accessPatternModelingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-access-pattern-modeling-apply",
            prompt:
              "Design the primary keys and item layout for the top 3 access patterns of a chat app (list conversations, load a thread, unread counts).",
            thinkAbout: [
              "What are the access patterns, and how does each become a single lookup?",
              "How do partition key + sort key co-locate related data?",
              "How do you avoid a hot partition in the key design?",
            ],
            modelAnswerOutline: [
              "Assume DynamoDB single-table design, chat with direct and small group conversations. Write the access patterns first as one-lookup requirements: (1) list a user's conversations by recency, (2) load the last N messages in a thread, (3) get unread count per conversation.",
              "**Messages (pattern 2):** `PK = THREAD#<threadId>`, `SK = MSG#<ts>`. All of a thread's messages are co-located and time-sorted, so 'load last 50' is one Query with ScanIndexForward=false, Limit=50. New messages are cheap appends.",
              "**Membership and conversation list (pattern 1):** a membership item per (user, thread): `PK = USER#<userId>`, `SK = CONV#<lastActivityTs>#<threadId>`, with conversation title and peer attributes. Querying PK = USER#<userId> descending returns the user's conversations already ordered by recency, one lookup. On a new message, update the member items' lastActivityTs (rewriting the sort key); for small groups this fan-out write is bounded and fine.",
              "**Unread counts (pattern 3):** an `unreadCount` counter on each membership item. On a new message, atomically ADD 1 for every member except the sender; opening a thread resets the reader's to 0. Pattern 3 is then free: it comes back with the conversation-list query, no extra read.",
              "**Co-location twice:** messages co-located under THREAD#, a user's conversations co-located and pre-sorted under USER#. Each access pattern is exactly one Query.",
              "**Hot partitions:** a busy group thread concentrates writes on one THREAD# partition. If a thread can exceed ~1,000 writes/sec, write-shard it: `PK = THREAD#<id>#<shard 0..N>` chosen by message hash, scatter-reading N shards for history. Membership writes spread naturally across USER# partitions.",
              "Common wrong turn: mirroring a relational schema (separate users, conversations, messages tables) and needing a scan to list a user's conversations, or computing unread counts on read by scanning a thread.",
            ],
          },
          practice: {
            id: "sd-l2-access-pattern-modeling-practice",
            prompt:
              "Review the proposed key schema below and say which parts of it survive the scale it is written for and which do not. For each weak point, name the change you would make to the key or the write path, and say what that change costs on the read side.",
            thinkAbout: [
              "Count the item writes one message in the 500,000-member channel actually performs.",
              "The table is provisioned at 200,000 write units per second. Which ceiling binds first for #general?",
              "How many distinct partition-key values does GSI1 have, and where do a workspace's writes land?",
            ],
            modelAnswerOutline: [
              "**What holds up, and say so first.** The membership item is right: `PK = USER#userId`, `SK = CHAN#lastActivityTs#channelId` spreads across 40 million partition keys, comes back already ordered by recency, and lets the unread badge ride along with pattern 1 at no extra read. Strongly consistent reads on patterns 1 and 2 are cheap here and correct.",
              "**The unread fan-out is the expensive call.** `ADD unreadCount 1` on every membership item makes a single message in #general 500,000 item writes, which alone is more than twice the table's entire 200,000 write units per second, and #general is taking 1,800 messages per second. Replace the counter with two sequence numbers: a monotonic `lastMessageSeq` on the channel item and a `lastReadSeq` on each membership item, with unread computed as the difference at read time. One message becomes one write, and the badge still arrives with the pattern-1 Query.",
              "**The message partition key needs a shard suffix.** `PK = CHAN#channelId` puts a channel's whole write stream on one physical partition, and a DynamoDB partition tops out near 1,000 writes per second, so #general throttles at roughly half its 1,800 per second peak. Use `CHAN#channelId#0..15` chosen by hash of the message id. The cost lands on pattern 2: loading history now scatter-reads 16 partitions and merges by timestamp instead of one Query.",
              "**Provisioned capacity is not the ceiling that binds.** 200,000 write units is a table-wide number and does not raise the per-partition limit, so buying more of it leaves #general throttling while the rest of the table idles.",
              "**GSI1 concentrates a workspace onto one index partition.** `PK = WORKSPACE#workspaceId` has one value per workspace, so every message write in the largest workspace hits the same index partition against the same ceiling, and every base write is replicated into the index, roughly doubling the write cost of the whole system. Bucket the key by hour, or serve pattern 4 off a stream into a store built for scans rather than off a GSI at all.",
              "Common wrong turn in a review like this: rewriting the schema from scratch. Patterns 1 and 2 have the right shape. Three key changes and one write-path change carry the whole answer.",
            ],
            supplied: {
              label: "Proposed key schema, revision 3",
              body: accessPatternCritiqueArtifact,
            },
            rubric: [
              {
                name: "Write amplification",
                weak: "Reads the write path as one message equals one write, and never counts the per-member updates behind it.",
                adequate:
                  "Names the per-member fan-out but leaves it as 'a lot of writes', with no number attached to it.",
                strong:
                  "Puts 500,000 item writes on one message in #general, sets that against the table's 200,000 write units, and replaces the counter with a constant-cost mechanism.",
              },
              {
                name: "Per-partition ceiling",
                weak: "Treats the 200,000 provisioned write units as the only capacity number in play.",
                adequate:
                  "Says the channel partition will run hot without naming the roughly 1,000 writes per second one partition allows.",
                strong:
                  "Sets #general's 1,800 messages per second against the per-partition ceiling, shards the channel key, and names the scatter-read that shard costs pattern 2.",
              },
              {
                name: "Secondary index cost",
                weak: "Leaves GSI1 unexamined, or waves it through because the admin view tolerates staleness.",
                adequate:
                  "Notices that the workspace partition key has few distinct values, without following it through to the write path.",
                strong:
                  "Names both effects, a workspace's writes landing on one index partition and every base write being duplicated into GSI1, then rekeys or reroutes pattern 4.",
              },
              {
                name: "Fair reading of the design",
                weak: "Rejects the schema wholesale, often proposing a relational rewrite in its place.",
                adequate:
                  "Repairs the weak points without saying which parts of the design were already correct.",
                strong:
                  "Keeps the membership key and its pre-sorted channel list explicitly, and confines every change to the message partition key, the unread mechanism and GSI1.",
              },
            ],
          },
        },
        {
          id: "sd-l2-keys-ids-constraints",
          title: "Keys, IDs & Constraints",
          summary:
            "Why auto-increment keys create a write hotspot and random UUIDv4 fragments the index, and what ULID and UUIDv7 fix about both.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["ids", "keys", "sharding"],
          teach: {
            markdown: keysIdsConstraintsTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l2-keys-ids-constraints-apply",
            prompt:
              "Choose a primary-key/ID strategy for a distributed order service and explain its impact on index locality and sharding.",
            thinkAbout: [
              "Why do monotonic keys cause write hotspots on B-trees?",
              "How do ULID/UUIDv7 restore time-ordering without random-UUID fragmentation?",
              "Which constraints and data types protect integrity (money, timestamps)?",
            ],
            modelAnswerOutline: [
              "Assume an order service that must scale writes across multiple nodes/shards, generate ids without a central sequence, and support 'list a customer's recent orders' efficiently.",
              "**Reject auto-increment:** in a clustered index every insert lands on the same rightmost page and, once sharded by id, the same node: a write hotspot. It also needs central coordination across nodes and leaks order volume. **Reject random UUIDv4:** coordination-free, but random values scatter inserts across the whole B-tree, fragmenting the index, causing constant page splits, and inflating the in-memory working set, multiplying write cost on a large table.",
              "**Choose ULID (or UUIDv7):** a millisecond timestamp prefix makes ids time-ordered (new orders cluster like an auto-increment: good locality, cheap 'recent orders' range scans) while the random suffix keeps them collision-free and generatable on any node with no coordination.",
              "**Sharding impact:** because the id is time-ordered, sharding on the raw id would send all current writes to one shard (the newest time-prefix range), recreating the hotspot. Shard on hash(customer_id) instead, spreading writes evenly and co-locating a customer's orders for 'list my orders,' while ULID remains the primary key for locality within a shard. Separate the routing key (customer) from the storage-ordering key (ULID).",
              "**Keys:** surrogate ULID PK for orders; order_number (human-facing natural value) as a separate UNIQUE column, not the PK. Line items use a composite identity (order_id, line_no).",
              "**Constraints:** FOREIGN KEY(customer_id) against orphaned orders, CHECK(quantity > 0), CHECK(status IN (...)), NOT NULL on money and status, UNIQUE(order_number): in the DB so a second service cannot write around them.",
              "**Types:** money as bigint cents (or numeric), never float; created_at timestamptz in UTC; soft delete via cancelled_at/deleted_at because order history is audit-relevant.",
              "Common wrong turn: UUIDv4 as the clustered PK (write amplification and index bloat in production), or sharding on the time-ordered id and hotspotting the newest shard.",
            ],
          },
          practice: {
            id: "sd-l2-keys-ids-constraints-practice",
            prompt:
              "Choose the ID and key strategy for a payments ledger at Stripe scale that must generate globally unique ids across dozens of regions with no coordination, guarantee no double-charge on retries, and keep money math exact. Show the ID scheme, the idempotency mechanism, and the constraints and types that make correctness enforceable in the database.",
            thinkAbout: [
              "Where does the double-charge risk actually come from: id generation or retries?",
              "Why is 'check if exists then insert' not a safe idempotency mechanism?",
              "What schema shape makes ledger corrections auditable instead of destructive?",
            ],
            modelAnswerOutline: [
              "Assume a ledger writing across dozens of regions, clients that retry on timeout, and zero tolerance for a lost cent or a double charge.",
              "**ID scheme:** UUIDv7/ULID for internal row ids: time-ordered for index locality on the append-heavy ledger, random-tailed for collision-free generation in every region with no central sequence. Snowflake would also be defensible if worker-id assignment infrastructure existed. Public-facing object ids get a prefixed opaque form (`ch_<base32>`) so the type is visible and the internal id is not leaked.",
              "**No double-charge: idempotency keys, enforced by the database.** The double-charge risk comes from retries, not id generation. The client sends an idempotency key per logical charge attempt, stored in an `idempotency_keys` table with a UNIQUE constraint plus the stored response. The first request inserts the key inside the same transaction that writes the charge; a retry hits the unique-constraint violation and returns the stored original response. Two concurrent retries racing across regions cannot both succeed: the unique constraint is the atomic guard. 'Check if exists then insert' has a TOCTOU race and is not the mechanism.",
              "**Money math:** amounts as integer minor units (bigint cents or numeric(20,0)), never floating point, because binary float cannot represent 0.10 and drifts over billions of rows. Currency as a separate char(3) column with a CHECK.",
              "**Ledger shape:** every entry is immutable and append-only; corrections are new reversing entries, never updates. Enforce double-entry with a CHECK/trigger that debits and credits sum to zero per transaction. No soft delete on a ledger: reversals instead.",
              "**Constraints and types carrying correctness:** UNIQUE(idempotency_key), FOREIGN KEY from entries to accounts, CHECK(amount_minor <> 0), NOT NULL on amount/currency/account, timestamptz UTC for global ordering. The invariants live in the database, where no service, retry, or manual fix can bypass them.",
              "Common wrong turn: relying on application-code checks to prevent double charges (racy under retries), or storing money as float and reconciling penny drift later.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l2-m5",
      title: "Blob Storage & Choosing a Store",
      description:
        "Design the storage and delivery path for large binary files with object storage, presigned URLs, and a CDN, then defend any datastore choice from decision drivers, including when NewSQL beats app-level sharding.",
      lessons: [
        {
          id: "sd-l2-blob-object-storage",
          title: "Blob / Object Storage",
          summary:
            "Keep the bytes in object storage and only the key in the database, and let presigned URLs move files past your app servers.",
          estimatedMinutes: 25,
          difficulty: "easy",
          skills: ["object-storage", "blob", "cdn"],
          teach: {
            markdown: blobObjectStorageTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l2-blob-object-storage-apply",
            prompt:
              "Design storage and delivery for user-uploaded images and videos, including the upload path, the metadata model, and the serving path.",
            thinkAbout: [
              "Why store blobs in object storage and only the key/URL in the DB?",
              "How do presigned URLs let clients upload and download directly?",
              "How do lifecycle/tiering and a CDN control cost and latency?",
            ],
            modelAnswerOutline: [
              "Assumptions: consumer app, images up to ~20 MB and videos up to ~2 GB, read-heavy (each upload viewed many times), public-ish media over HTTPS.",
              "**High-level split:** bytes live in an S3 bucket; Postgres holds only metadata.",
              "**Upload, direct-to-storage in three steps:** (1) client calls `POST /uploads` with content type and size; the app authorizes, creates a `media` row in state `pending` with a generated object_key like `media/{userId}/{uuid}`, and returns a presigned URL (single presigned PUT for images; multipart upload with presigned per-part URLs, 8-16 MB parts uploaded in parallel with per-part retry, for videos). (2) The client uploads bytes directly to S3, never through the app. (3) On completion, an S3 event notification (S3 -> SQS/Lambda) or a client `complete` call flips the row to `ready` and enqueues async processing (virus scan, thumbnails, transcode to HLS renditions).",
              "**Metadata model:** `media(id, owner_id, object_key, content_type, bytes, width, height, duration, status, created_at)`. The DB stays tiny; every listing/feed query hits only these small rows.",
              "**Serving:** a CDN (CloudFront) in front of the bucket: client -> edge cache -> origin, so popular objects serve from a PoP ~20 ms away and origin sees a fraction of traffic. Private media gets short-lived signed CDN URLs; public media caches with long TTLs and a content-hash in the key so a new upload is a new URL (immutable, cache-friendly).",
              "**Cost and durability:** S3 gives eleven-nines durability with no disk management. A lifecycle policy moves originals to infrequent-access after 30 days and Glacier after a year while keeping thumbnails hot, cutting storage cost several-fold.",
              "Common wrong turn: storing image or video bytes in a BLOB column or routing every upload/download through the app tier: pollutes the DB cache, balloons backups, and makes the app fleet the transfer bottleneck. Bytes belong in object storage; the DB holds a pointer.",
            ],
          },
          practice: {
            id: "sd-l2-blob-object-storage-practice",
            prompt:
              "Design the ingest and delivery pipeline for a video platform like YouTube handling 500 hours of video uploaded per minute, where a single upload can be 4 GB and must play back adaptively on a 3G phone and a 4K TV. Lead with how raw bytes enter storage and how a viewer eventually streams them.",
            thinkAbout: [
              "How does a 4 GB upload survive a flaky network without touching your app servers?",
              "What turns one raw file into something a 3G phone and a 4K TV can both play?",
              "What makes the read side economically possible at this fan-out?",
            ],
            modelAnswerOutline: [
              "Assumptions: massive write ingest, far larger read fan-out, global audience, adaptive bitrate required.",
              "**Ingest:** creators upload directly to an object store via resumable multipart upload with presigned part URLs, so 4 GB uploads survive flaky networks (retry only failed parts) and never touch app servers. The raw object lands under a `raw/` prefix and fires an event notification onto a queue (SQS/Kafka); the DB writes a `video` row in state `uploaded`.",
              "**Processing:** a fleet of transcode workers consumes the queue and fans each raw file into a ladder of renditions (240p through 4K) segmented for HLS/DASH adaptive streaming, plus thumbnails and captions. Segments write back to object storage under `hls/{videoId}/{rendition}/seg_{n}.ts`. Embarrassingly parallel, autoscaled off queue depth, idempotent and checkpointed so a crashed worker re-runs only its segment. When the ladder completes, the row flips to `ready`.",
              "**Storage layout and cost:** originals are cold, so a lifecycle policy pushes `raw/` to archive quickly (you rarely re-transcode); the HLS segments are the hot read set. Popular videos stay in standard storage; long-tail videos tier down.",
              "**Delivery:** viewers never hit the origin bucket. A multi-tier CDN caches segments at the edge; the player fetches a manifest, then pulls segments and switches rendition per segment based on measured bandwidth, so the 3G phone pulls 240p and the 4K TV pulls 2160p from the same library. Because segments are immutable and content-addressed, they cache with very long TTLs and edge hit rates exceed 95 percent: what makes the read side economically possible.",
              "**Metadata:** a horizontally scalable store (Cassandra/Bigtable or Vitess-sharded MySQL, as YouTube uses) holds video metadata, view counts, and manifests; the object store holds bytes; the CDN holds hot copies.",
              "Common wrong turn: serving a single MP4 per video (no adaptive bitrate) or transcoding synchronously in the upload request, which buffers on mobile and times out on large files.",
            ],
          },
        },
        {
          id: "sd-l2-choosing-db-polyglot",
          title: "Choosing a Database & Polyglot Persistence",
          summary:
            "Reason from access patterns and real numbers to a storage family, and know when NewSQL beats hand-rolled application sharding.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["database-selection", "newsql", "polyglot"],
          teach: {
            markdown: choosingDbPolyglotTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l2-choosing-db-polyglot-apply",
            prompt:
              "Recommend a datastore given a feature spec (workload mix, consistency needs, scale, and query shapes), justify it against the alternatives, and state explicitly when NewSQL beats app-level sharding.",
            thinkAbout: [
              "Which decision drivers (access patterns, consistency, scale, query shape) dominate this spec?",
              "When does NewSQL / distributed SQL beat sharding MySQL/Postgres?",
              "When should you default to boring relational?",
            ],
            modelAnswerOutline: [
              "The strong answer is a **repeatable method plus a defended example**, and interviewers grade the method.",
              "**Method: extract the drivers before naming a technology.** State the access patterns (query by which keys, joins needed?), read/write ratio and QPS now and projected, the consistency requirement (does a stale or lost write cause a real bug: money yes, a like count no), the scale (does the working set fit one large node, roughly a few TB and tens of thousands of QPS?), the p99 latency budget, and operational reality (what the team already runs). Only then map to a family.",
              "**Worked example:** 'a payments ledger, 5k writes/sec, must never lose or double-count a transaction, needs multi-row transactions, queries by account and time range.' Consistency and transactions dominate, and 5k writes/sec fits one node, so: **boring relational, a single primary Postgres** with read replicas for reporting, ACID transactions for the debit/credit pair, and a unique idempotency key against doubles.",
              "**Defend against the runners-up:** Cassandra rejected (no multi-row ACID; last-write-wins risks losing a financial write); Mongo rejected (needs cross-document transactions and strong consistency).",
              "**When NewSQL beats app-level sharding:** when the same workload grows past one node (say 200k writes/sec and 40 TB) AND still needs SQL and ACID. The alternatives are (a) shard Postgres by account id in the application, hand-building routing, cross-shard transactions, resharding, and distributed joins forever, or (b) Spanner/CockroachDB, which auto-shard and give ACID across shards via Raft consensus. NewSQL wins there: it buys back the sharding tax for the price of higher per-commit latency (cross-node quorum) and cost. Framed with PACELC: NewSQL chooses consistency and pays latency, correct for money.",
              "**Default to boring relational** whenever the data is relational, transactions matter, and it fits one node.",
              "Common wrong turn: reaching for NoSQL 'for scale' with no QPS or size evidence, when a well-indexed Postgres would serve the load for years with far less operational pain.",
            ],
          },
          practice: {
            id: "sd-l2-choosing-db-polyglot-practice",
            prompt:
              "Review the storage plan below and say which of its six choices you would keep as written and which you would move to a different family. For each move, name the driver that forces it and say how the new store stays in sync with the source of truth.",
            thinkAbout: [
              "3 million clients, one presence heartbeat each every 10 seconds: what rate is that, and which box absorbs it?",
              "Which of these stores holds derived data you could delete outright, and what would you rebuild it from?",
              "The handler writes Cassandra, then messages_fts. What is true of a message if the process dies between the two?",
            ],
            modelAnswerOutline: [
              "**Keep three of the six.** Cassandra for messages is right: partition by (channel_id, 10-day bucket) clustered by message id descending makes the hot read a single-partition slice, and 8 billion rows at 400,000 writes per second is genuinely past one relational node with no joins in the read path. Postgres for users, servers, roles and permissions is right: small, relational, multi-row transactional. S3 for attachment bytes with only the key on the Cassandra row is right.",
              "**Presence is on the wrong family and on the wrong box.** 3 million clients heartbeating every 10 seconds is 300,000 UPDATE statements per second aimed at a primary that serves tens of thousands of QPS when it is well indexed. Each one is a durable WAL write for a fact that is worthless 60 seconds later, and it shares that primary with permissions, so presence load turns into failed logins. Presence is the key-value signature: known key, single-digit-millisecond budget, no durability requirement. Put it in Redis keyed by user with a short TTL and let the key expire instead of writing 'offline'. The 'one fewer system to operate' argument is real, and it is being paid for with 300,000 writes per second of throwaway traffic on the system of record.",
              "**Search: right that it needs its own path, wrong store and wrong plumbing.** `messages_fts` is a second full copy of 8 billion messages on the box whose stated job is small relational data, and Postgres full-text gives no relevance tuning, no fuzziness, no faceting. Elasticsearch, and treat it as derived data: droppable and rebuildable. The plumbing matters more than the store. Writing Cassandra and then `messages_fts` in one handler is a dual write with no atomicity, so any crash between the two leaves a message that exists and is permanently unsearchable, with nothing to detect it. Write once to Cassandra, publish a change stream (Kafka or CDC), let an indexer consume it, and accept a few seconds of search lag.",
              "**Analytics on the read replicas is still OLTP hardware.** Aggregating a year of rows evicts the buffer cache of replicas that are also serving permission reads, so the dashboard's cost is paid as product p99. Feed the same change stream into a columnar store (ClickHouse, BigQuery) and let the dashboard scan there.",
              "**The through-line:** every choice in ADR-014 is justified by operational convenience. Justify by drivers: ephemeral plus known key plus millisecond budget goes to Redis, ranked text over a huge corpus goes to a search engine as derived data, year-long scans go to a columnar store. And whatever gets added, one write path plus a change stream, never two writes in a request handler.",
            ],
            supplied: {
              label: "ADR-014: storage plan for launch",
              body: polyglotCritiqueArtifact,
            },
            rubric: [
              {
                name: "Presence workload",
                weak: "Leaves presence in Postgres, or moves it somewhere else without ever costing the heartbeats.",
                adequate:
                  "Names Redis for presence on the general grounds that it is ephemeral, with no arithmetic on the heartbeat rate.",
                strong:
                  "Turns 3 million clients at one heartbeat per 10 seconds into 300,000 writes per second, weighs that against one Postgres primary, and names the shared blast radius with permissions.",
              },
              {
                name: "Search store and its plumbing",
                weak: "Accepts messages_fts as written, or swaps the store while leaving both writes in the request handler.",
                adequate:
                  "Moves search to a search engine but treats the two writes in one handler as an implementation detail.",
                strong:
                  "Rejects store and plumbing both: names the second copy of 8 billion messages, and the message that lives in Cassandra but never reaches the index when the handler dies mid-request.",
              },
              {
                name: "Sync spine",
                weak: "Never says how the stores stay in agreement once there is more than one of them.",
                adequate:
                  "Reaches for a queue or CDC without naming which store is the source of truth the others follow.",
                strong:
                  "Puts Cassandra as the record and one change stream as the fan-out to both the search index and the columnar store, and calls both rebuildable from it.",
              },
              {
                name: "Fair reading of the plan",
                weak: "Rewrites all six choices, usually collapsing the whole plan back onto one database.",
                adequate:
                  "Keeps the Cassandra, Postgres and S3 calls without saying what makes each of them correct.",
                strong:
                  "Defends the message partitioning and the small relational core on their own drivers, and confines the changes to presence, search and analytics.",
              },
            ],
          },
        },
      ],
    },
  ],
}
