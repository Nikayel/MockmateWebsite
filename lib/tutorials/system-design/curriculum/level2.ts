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

### The leftmost-prefix rule

The single most tested idea: an index on (a, b, c) is sorted first by a, then by b within equal a,
then by c within equal (a, b). So it can serve queries that use a prefix of those columns: \`a=?\`,
\`a=? AND b=?\`, \`a=? AND b=? AND c=?\`. It cannot efficiently serve \`b=?\` alone, because b is
only sorted within each a group. This is why **column order is a design decision, not an alphabetical
accident**. The rule of thumb: equality-filtered columns first, then the column you sort or
range-scan on last, so that after the equality prefix pins a contiguous slice, the sort column is
already in order inside that slice and no separate sort step is needed.

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
keeping it tiny), and **GIN/GiST** (Postgres inverted/generalized indexes for arrays, JSONB,
full-text, and geospatial).

Recap: pick the index by the query, order composite columns as equality-then-sort per the
leftmost-prefix rule, make it covering when a hot query justifies the width, and remember every index
taxes every write.
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

### Buffer pool

The database keeps hot pages in an in-memory **buffer pool** (the biggest knob in most databases,
e.g. InnoDB \`innodb_buffer_pool_size\`). Reads check the buffer pool first; a hit is a memory
access, a miss is a disk read that pulls the page in and evicts a cold one (usually via an LRU
variant). Writes modify the page **in the buffer pool**, marking it **dirty**. Dirty pages are not
written to their data-file home immediately; they are flushed later, in batches, at a **checkpoint**.
This is what lets a database absorb many writes to the same hot page as one eventual disk write.

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

\`\`\`
INSERT ... COMMIT
  1. change row in a page inside the BUFFER POOL (RAM) -> page now dirty
  2. append redo record to WAL buffer
  3. COMMIT: fsync WAL to disk (sequential, group-committed)  <-- durability point
  4. return success to client
  ...later...
  5. CHECKPOINT: flush dirty data pages to their home (random-ish)
  crash before 5? replay WAL from last checkpoint to rebuild the page.
\`\`\`

Recap: writes land in in-memory pages in the buffer pool and are flushed lazily at checkpoints, while
a sequentially-written, fsync'd WAL provides the actual durability and crash recovery, all of it
shaped by the ~100x gap between sequential and random I/O.
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

**Document size limits.** MongoDB caps a single document at **16MB**. A post with an unbounded,
ever-growing comments array will eventually hit that ceiling and the write fails. So the real pattern
is hybrid: **embed a bounded, frequently-read subset** (the latest 20 comments, denormalized author
name and avatar for display) and **reference the unbounded remainder** (the full comment history
lives in its own collection, keyed by post id). This gives you a fast first render and a scalable
long tail.

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

\`\`\`
posts (collection)
  { _id, title, body,
    author: { id, name, avatar },        <- referenced id + denormalized display fields
    recentComments: [ {..}, {..} x20 ],  <- embedded bounded subset
    commentCount: 1423 }                 <- embedded for atomic increment
comments (collection)                    <- full unbounded history, referenced
  { _id, postId, authorId, body, createdAt }
\`\`\`

Recap: Model to the access pattern, embed bounded read-together data and reference large or unbounded
entities, respect the 16MB document cap, and treat per-document atomicity as a design constraint
rather than assuming relational multi-row transactions.
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

**Consistency is tunable per query.** Cassandra is a Dynamo-style AP system with **tunable
consistency**: you choose how many replicas must acknowledge. \`ONE\` (fast, may read stale),
\`QUORUM\` (majority). If reads and writes both use QUORUM on replication factor 3, read-quorum (2)
plus write-quorum (2) overlap by at least one replica, giving read-your-writes strong consistency for
that key while tolerating one node down.

**Interview nuance:** The classic question is "why not just add a secondary index in Cassandra?"
Answer: Cassandra secondary indexes query across all partitions (a scatter-gather that does not
scale) and are an anti-pattern for high-cardinality columns; the idiomatic solution is a second
denormalized table, not an index.

\`\`\`
messages_by_conversation
  PRIMARY KEY ((conversation_id, month), created_at)
                 ^partition key^         ^clustering, DESC
  -> "latest 50 in conversation" = first 50 rows of current-month partition, one node
  -> month bucket bounds partition size; hot convo adds a sub-partition bucket
\`\`\`

Recap: Wide-column stores are LSM-based write machines; model one denormalized table per query,
choose a partition key that spreads load and co-locates the query, cluster to serve the sort, always
bound partitions with time-bucketing, sub-partition hot keys, and tune quorum for the consistency you
need.
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
              "**Why other orders fail:** (created_at, user_id, status) is useless for this query because `created_at` leads with no equality on it; putting `created_at` before `status` breaks the free sort because entries interleave across statuses.",
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
              "**Sessions are a source of truth for live logins:** run Redis with AOF persistence and a replica, and `noeviction` (or `volatile-lru` so only expiring keys drop) to avoid silently evicting a logged-in user.",
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
            "Model one denormalized table per query: a partition key that spreads load and co-locates the read, clustering for the sort, time-bucketed bounded partitions, tunable quorum.",
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
              "**Consistency:** write and read at QUORUM on RF=3. Write-quorum (2 of 3) and read-quorum (2 of 3) overlap by at least one replica, so a reader always sees the latest acknowledged write (read-your-writes) while tolerating one replica down. Drop to ONE for low-value paths like typing indicators.",
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
      ],
    },
  ],
}
