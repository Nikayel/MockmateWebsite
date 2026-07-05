> Module **sd-l2-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l2-m1](./sd-l2-m1.md) · Next: [sd-l2-m3](./sd-l2-m3.md)

# L2 · Storage Engines & Indexing

After this module you can look at a workload, say whether its database should be built on a B-tree or an LSM-tree and why, design a composite index that fully serves a filter-plus-sort query without over-indexing, and explain the exact physical sequence of pages, buffer pool, and write-ahead log that makes a committed row both fast and durable. These are the mechanics that turn a hand-wavy "use a database" into a defensible storage decision.

### sd-l2-btree-vs-lsm: B-Tree vs LSM-Tree

- **id:** `sd-l2-btree-vs-lsm`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** storage-engine, lsm, btree

#### Learn

Every durable database is built on one of two storage engine families, and the choice is fundamentally a read-versus-write tradeoff. Knowing which one sits under Postgres versus Cassandra is the difference between guessing at a database and reasoning about one.

A **B+tree** (Postgres, MySQL/InnoDB, most SQL engines) keeps data in fixed-size pages, typically 8KB or 16KB, arranged as a balanced tree with all rows in the leaf pages. Updates happen **in place**: to change a row you find its leaf page, load it into memory, modify it, and eventually write the whole page back. This gives excellent point reads (a lookup is 3 to 4 page reads for billions of rows) and, crucially, excellent **range scans**, because leaves are linked in sorted order, so "created_at between X and Y" is a sequential walk. The cost is **write amplification**: changing one 200-byte row can force an 8KB page write, plus a write-ahead log record, and page splits when a page fills. Random in-place writes are also unfriendly to SSDs, which prefer large sequential erases.

An **LSM-tree** (Cassandra, RocksDB, ScyllaDB, LevelDB) inverts this. Writes go to an in-memory sorted structure, the **memtable**, plus a sequential commit log. When the memtable fills it is flushed to disk as an immutable, sorted **SSTable**. Writes are therefore append-only and sequential, so throughput is very high and SSD-friendly. The catch is reads: a key might live in the memtable or in any of several SSTables, so a read may have to check many files. Two mechanisms rescue read latency. **Bloom filters** (a small probabilistic set per SSTable) let a read skip an SSTable that definitely does not contain the key, avoiding a disk seek for non-existent or cold keys. **Compaction** merges SSTables in the background, discarding overwritten and deleted (tombstoned) rows, which bounds how many files a read must touch.

The three amplifications are the vocabulary interviewers probe:

- **Write amplification:** bytes written to disk per byte of logical write. B-tree pays it via full-page writes and the WAL. LSM pays it via compaction rewriting the same data across levels.
- **Read amplification:** disk reads per logical read. LSM is worse (multiple SSTables plus bloom checks); B-tree is a clean 3 to 4 pages.
- **Space amplification:** disk used per byte of live data. LSM can hold stale copies until compaction reclaims them; B-tree wastes space via partially-full pages and fragmentation.

**Interview nuance:** compaction is the LSM landmine. It runs in the background and competes for disk I/O and CPU, so under sustained write pressure you get **compaction stalls** and latency spikes right when you are busiest. "Leveled" compaction (RocksDB default) gives better read and space amplification but more write amplification; "size-tiered" (Cassandra default) is the reverse. Naming this tradeoff signals you have actually operated one.

```
B+TREE (read/update-heavy OLTP)     LSM-TREE (write-heavy ingest)
  in-place page updates               memtable (RAM) --> flush
  sorted leaves, fast range scan          |
  writes = random + WAL               immutable SSTables on disk
  amp: low read, higher write             |  bloom filter per SSTable
                                      compaction merges in background
                                      amp: high write, higher read
```

Recap: B-tree updates pages in place for fast reads and range scans at the cost of write amplification; LSM appends to a memtable then compacts immutable SSTables for high write throughput, using bloom filters and compaction to keep reads sane.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose and justify a storage engine for a write-heavy IoT/event-ingestion service versus a read-heavy transactional app.

**Think about:**
- Why does LSM suit write-heavy workloads and SSDs?
- What are read, write, and space amplification, and how do they differ per engine?
- How do bloom filters and compaction affect LSM behavior?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: the IoT service ingests device telemetry, say 500K writes/sec, mostly appends keyed by (device_id, timestamp), with queries for recent windows per device. The transactional app is an order/account system: moderate write rate, but heavy point reads and updates of the same rows, plus range and index scans for reporting, and it needs strong per-row consistency.

For the IoT ingestion service I pick an **LSM-based engine**: Cassandra or ScyllaDB if I want a distributed store, or RocksDB as an embedded engine. The workload is append-dominated, and LSM turns those writes into sequential memtable flushes and SSTable writes, which is exactly what SSDs are optimized for and what lets me sustain high write throughput without random-write amplification. Reads target recent data, which lives in the memtable or the newest SSTables, and bloom filters keep older-SSTable reads from hitting disk for keys that are not there. I would tune compaction (size-tiered or time-window compaction for time-series) and provision headroom so background compaction does not stall ingestion, and I would monitor pending compactions as a leading indicator of trouble.

For the transactional app I pick a **B+tree engine**: Postgres or MySQL/InnoDB. The access pattern is read and update heavy on individual rows, and B-tree in-place updates give clean 3-to-4-page point reads with low read amplification. Range scans and ordered reads (recent orders, reports) ride the sorted leaves efficiently. Write amplification via the WAL and page writes is acceptable because the write rate is moderate, and I get mature transaction support, secondary indexes, and a query planner for free.

The key tradeoff I am committing to: LSM trades read amplification and background compaction cost for write throughput; B-tree trades write amplification for predictable low-latency reads and range scans. 

**Common wrong turn:** picking LSM "because it is web-scale" for the OLTP app and then being surprised by read amplification and compaction-induced latency spikes on a workload that reads and updates hot rows, where a B-tree would have been simpler and faster.

**Self-check rubric:**
- [ ] I named a concrete engine for each side (e.g. Cassandra/RocksDB vs Postgres/InnoDB), not just "SQL vs NoSQL."
- [ ] I explained *why* LSM writes are sequential (memtable then immutable SSTables) and SSD-friendly.
- [ ] I defined read, write, and space amplification and said which engine pays which.
- [ ] I mentioned bloom filters and compaction and their effect on LSM reads and latency.
- [ ] I stated the committed tradeoff and flagged at least one wrong turn (ignoring compaction stalls).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the storage engine choice and compaction strategy for Discord's message store, which moved from Cassandra to ScyllaDB and handles trillions of messages with billions of writes per day and read patterns dominated by "load the most recent messages in a channel." Justify the engine and explain how you would prevent compaction and hot-partition problems at that scale.

**Model answer (revealed on demand):**

At trillions of stored messages and billions of daily writes, this is an append-heavy write workload with time-ordered reads, which is squarely LSM territory, so I keep an **LSM engine (ScyllaDB)** rather than a B-tree store. ScyllaDB is a C++ rewrite of Cassandra's LSM design with a shard-per-core architecture that removes JVM garbage-collection pauses, which is exactly the tail-latency win Discord needed: the old pain was p99 spikes, and a large share of those came from JVM GC and compaction contention, not from the data model.

Data model: partition by channel plus a time bucket, cluster by message_id (a Snowflake ID, so it sorts by time). Clustering descending means "recent messages in a channel" is a sequential read of the front of a partition, which touches the memtable and the newest SSTables where bloom filters and the row cache keep latency low.

Compaction: I use **time-window compaction (TWCS)** rather than size-tiered. Messages are written once and rarely updated, and reads are recent-heavy, so grouping SSTables by time window means old windows compact once and are then left alone, which slashes write amplification and stops old cold data from being rewritten forever. Old windows can also be dropped or tiered cheaply by TTL.

Hot partitions are the real risk: a huge active channel would create an unbounded, hot partition that overloads its replica set. I bound partitions with time bucketing (for example a bucket per 10-day window) so no single partition grows without limit, and for pathologically hot channels I sub-partition. I also front the store with a cache for the very hottest recent reads so a viral channel does not hammer one shard. The committed tradeoff: LSM plus TWCS accepts higher read amplification on old data (rarely read here) in exchange for cheap sustained writes and bounded compaction cost.

### sd-l2-indexing-cost: Indexing: Types, Structure & Cost

- **id:** `sd-l2-indexing-cost`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** indexing, query-performance

#### Learn

An index is a sorted, auxiliary copy of some columns that lets the database find rows without scanning the whole table. The core senior skill is not "add an index," it is knowing *which* index serves a given query, in what column order, and what that index costs you on every write.

Start with the two structural kinds. A **clustered / primary index** determines the physical order of the rows themselves; the table *is* the index (InnoDB tables are clustered on the primary key). A **secondary index** is a separate B-tree that maps indexed columns to a row locator (the primary key in InnoDB, or a physical tuple pointer in Postgres, whose tables are unordered "heaps"). This matters because in a heap table, a secondary index match still needs a second read to fetch the row from the heap.

The single most tested idea is the **leftmost-prefix rule** for composite indexes. An index on (a, b, c) is sorted first by a, then by b within equal a, then by c within equal (a, b). So it can serve queries that use a prefix of those columns: `a=?`, `a=? AND b=?`, `a=? AND b=? AND c=?`. It cannot efficiently serve `b=?` alone, because b is only sorted within each a group. This is why **column order is a design decision, not an alphabetical accident**. The rule of thumb: equality-filtered columns first, then the column you sort or range-scan on last, so that after the equality prefix pins a contiguous slice, the sort column is already in order inside that slice and no separate sort step is needed.

A **covering index** (index-only scan) is the next lever. If the index contains *every* column the query needs, in its keys or as included non-key columns (Postgres `INCLUDE`, SQL Server included columns), the database answers entirely from the index and never touches the table/heap. That removes the second read per row and can turn a slow query fast, at the cost of a wider index.

**Selectivity / cardinality** decides whether the planner even uses your index. An index on a boolean `is_active` that is 95% true is nearly useless: matching most of the table via an index (random-ish lookups) is slower than a sequential full scan. High-cardinality columns (user_id, email) are the good candidates. The planner estimates rows returned and picks index versus full scan on cost; a stale statistics estimate is a classic cause of "it stopped using my index."

**Interview nuance:** the cost side is where juniors get exposed. Every index is a second data structure the database must **keep in sync on every insert, update, and delete**. Ten indexes means one insert becomes eleven B-tree writes plus more WAL and more storage. Write-heavy tables should be deliberately under-indexed. Beyond the default B-tree, know the specialized types: **hash** (equality only, no ranges), **partial** (index only rows matching a predicate, e.g. `WHERE status='active'`, keeping it tiny), and **GIN/GiST** (Postgres inverted/generalized indexes for arrays, JSONB, full-text, and geospatial).

Recap: pick the index by the query, order composite columns as equality-then-sort per the leftmost-prefix rule, make it covering when a hot query justifies the width, and remember every index taxes every write.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the indexes for a query that filters by user_id, filters by status, and sorts by created_at, and explain the index that serves it fully.

**Think about:**
- How does the leftmost-prefix rule drive composite column ordering?
- What makes an index-only (covering) scan possible?
- Why does over-indexing hurt writes?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

The query is roughly: `SELECT ... FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 20`. The right index is a **composite index on (user_id, status, created_at)**.

The ordering follows the leftmost-prefix rule and the equality-then-sort heuristic. `user_id` and `status` are both equality filters, so they go first; together they pin a single contiguous run of index entries. Within that run the entries are already sorted by `created_at`, so the `ORDER BY created_at DESC LIMIT 20` becomes "walk the tail of that run backward and stop after 20 rows." There is no separate sort step and no scanning of rows we will discard. If I had ordered it (created_at, user_id, status), the index would be useless for this query because `created_at` leads and I have no equality on it. Putting `created_at` before `status` would also break the free sort, because the entries would be interleaved across statuses.

Direction: I would define `created_at DESC` (or rely on the engine reading the B-tree backward, which Postgres and InnoDB both do) so the newest-first LIMIT is a cheap prefix read.

To make it **covering**, I add the columns the SELECT returns as included payload, for example `INCLUDE (total, currency)` in Postgres, or extend the key in MySQL. Then the query is an index-only scan: it never visits the table/heap to fetch those columns, which removes one random read per returned row. I would only do this for a genuinely hot query, because included columns widen every index entry and increase storage and write cost.

The cost I am accepting: this index must be maintained on every insert and every status update to an order. That is fine here because reads of a user's orders dominate. 

**Common wrong turn:** creating three single-column indexes on user_id, status, and created_at and expecting the planner to combine them. It usually cannot serve the sort from a bitmap-AND of separate indexes, so it filters then sorts in memory, which is far slower than the one composite index and quietly triples write amplification.

**Self-check rubric:**
- [ ] I proposed one composite index and gave the exact column order.
- [ ] I justified the order via leftmost-prefix and equality-before-sort (so the ORDER BY is free).
- [ ] I explained how to make it covering and why that removes heap lookups.
- [ ] I noted the write/storage cost and that this is only worth it for hot reads.
- [ ] I flagged the wrong turn of three separate single-column indexes.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the indexing strategy for Stripe's charges table, a write-heavy multi-tenant table with billions of rows where the dashboard runs `WHERE merchant_id = ? AND status = ? ORDER BY created_at DESC` but analysts also occasionally filter by `customer_id` and by a JSONB `metadata` field. Justify what you index, what you deliberately do not, and how you keep writes cheap.

**Model answer (revealed on demand):**

Assumptions: this table is on the write hot path (every charge, refund, and status transition writes here), it is multi-tenant so almost every query is scoped by `merchant_id`, and the row count is in the billions, so a full scan is never acceptable for the interactive dashboard but is tolerable for rare analyst jobs.

Primary serving index: a **composite on (merchant_id, status, created_at DESC)**, exactly matching the dashboard query. `merchant_id` leads because it is always present and high-cardinality, which also keeps each merchant's slice small; `status` is the second equality; `created_at` last gives the free reverse-time sort for the paginated LIMIT. I would consider making it covering only for the handful of columns the dashboard list view renders, accepting the extra width because that view is extremely hot.

For `customer_id`: analysts query it occasionally, not on the hot path. Rather than a full secondary index that taxes every write, I would use a **partial index** if most lookups target a subset (for example only non-terminal charges), or accept an index scoped as (merchant_id, customer_id) so it stays cheap and tenant-local. If the query is truly rare, I might index nothing and let it run as a scoped scan.

For the JSONB `metadata`: I do **not** put a broad **GIN** index on it by default, because GIN maintenance is expensive on a write-heavy table and metadata is high-cardinality and rarely filtered. If a specific key becomes a common filter, I add a targeted **expression index** on just that extracted key (`(metadata->>'invoice_id')`), which is far cheaper than indexing the whole document.

The discipline: this is a write-heavy table, so every index is a tax on the hot path. I index the one query that must be fast for every tenant, use partial and expression indexes to serve secondary patterns narrowly, and refuse the broad "index everything" reflex. The committed tradeoff is that rare analyst queries pay with slower scoped scans so that the billions of daily writes and the interactive dashboard stay fast.

### sd-l2-physical-storage-wal: Physical Storage: Pages, Buffer Pool & WAL

- **id:** `sd-l2-physical-storage-wal`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** storage, wal, durability

#### Learn

This lesson connects the abstractions above to real latency and durability by following data down to the metal. The payoff is being able to answer, precisely, "what does commit actually guarantee, and why is it fast."

**Pages.** Databases do not read or write individual rows from disk; they move fixed-size **pages** (Postgres 8KB, InnoDB 16KB). A page holds many rows plus a header and a slot directory. This is why row layout matters: a **row-oriented** page stores whole rows together, great for "give me this order" (OLTP); a **column-oriented** layout stores each column contiguously across rows, great for "sum revenue over 10M rows" (OLAP) because you read only the columns you need and they compress extremely well.

**Buffer pool.** The database keeps hot pages in an in-memory **buffer pool** (the biggest knob in most databases, e.g. InnoDB `innodb_buffer_pool_size`). Reads check the buffer pool first; a hit is a memory access, a miss is a disk read that pulls the page in and evicts a cold one (usually via an LRU variant). Writes modify the page **in the buffer pool**, marking it **dirty**. Dirty pages are not written to their data-file home immediately; they are flushed later, in batches, at a **checkpoint**. This is what lets a database absorb many writes to the same hot page as one eventual disk write instead of one per update.

Which raises the durability problem: if a committed change lives only as a dirty page in volatile memory, a crash loses it. The fix is the **write-ahead log (WAL)**, also called the redo log or, in Postgres, the WAL.

**WAL.** Before a change is considered committed, the database appends a small **redo record** describing the change to the WAL and forces it to stable storage with **fsync**. The rule is "log before data": the WAL record hits disk before the corresponding data page does. Because the WAL is written **sequentially** (append-only), this is fast even though a fsync is still the single slowest thing in the commit path. On crash recovery the database replays WAL records after the last checkpoint to reconstruct any dirty pages that were lost, which is why a committed transaction survives a crash even though its data page never reached disk before the failure.

**Interview nuance:** the number that drives all of this is that **sequential I/O is roughly 100x faster than random I/O** on spinning disks, and still meaningfully faster on SSDs (which also suffer write amplification from random writes). This one fact explains why the WAL is a sequential append rather than random page writes, why LSM-trees win at writes, and why databases batch and checkpoint. To amortize the fsync cost, databases use **group commit**: many concurrent transactions' WAL records are batched into one fsync, so 500 commits can cost a handful of fsyncs instead of 500.

**Interview nuance:** the OS **page cache** sits underneath the database, so a "disk write" from the DB may only reach the OS buffer, which is exactly why an explicit fsync (not just `write()`) is required for real durability. Also, compression happens at the page level, and column stores compress far better because adjacent values share a type and range.

```
INSERT ... COMMIT
  1. change row in a page inside the BUFFER POOL (RAM) -> page now dirty
  2. append redo record to WAL buffer
  3. COMMIT: fsync WAL to disk (sequential, group-committed)  <-- durability point
  4. return success to client
  ...later...
  5. CHECKPOINT: flush dirty data pages to their home (random-ish)
  crash before 5? replay WAL from last checkpoint to rebuild the page.
```

Recap: writes land in in-memory pages in the buffer pool and are flushed lazily at checkpoints, while a sequentially-written, fsync'd WAL provides the actual durability and crash recovery, all of it shaped by the ~100x gap between sequential and random I/O.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain what physically happens on disk and in memory when a row is inserted and the transaction commits.

**Think about:**
- What is the role of the buffer pool and dirty-page flushing?
- Why does the WAL give durability and enable crash recovery?
- Why is the 100x gap between sequential and random I/O a design driver?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a row-store OLTP database like Postgres or InnoDB. Here is the sequence for `INSERT ... ; COMMIT`.

First, the engine locates the target **page** (8KB or 16KB) for the new row. If it is not already resident, it is read from disk into the **buffer pool**, possibly evicting a cold page. The row is written into the page *in memory*, and that page is marked **dirty**. Nothing has touched the data file on disk yet.

Second, before the commit can return, the engine appends a **redo record** describing this insert to the **write-ahead log** and calls **fsync** to force the WAL to stable storage. This is the moment durability is established. The WAL write is a **sequential append**, which is why it is cheap relative to a random write, and multiple concurrent commits are batched into one fsync via **group commit** to amortize the cost. Once the WAL is fsync'd, the transaction is durable and the database returns success to the client.

Third, and asynchronously, the dirty data page is eventually flushed to its home location in the data file at a **checkpoint**, along with other accumulated dirty pages. This flush is more random and is deliberately deferred and batched so many updates to the same hot page collapse into one physical write.

Crash recovery ties it together: if the machine dies after the WAL fsync but before the checkpoint flush, the data page is gone, but on restart the engine replays WAL records since the last checkpoint and reconstructs it. So the guarantee is precise: **commit means the WAL record is fsync'd, not that the data page is on disk.**

The reason it is structured this way is the roughly **100x** advantage of sequential over random I/O. Making durability depend on a sequential WAL append rather than a random data-page write is what lets a database commit thousands of transactions per second while still surviving power loss.

**Common wrong turn:** claiming the insert is durable once it is in the buffer pool, or once `write()` returns, forgetting that the buffer pool is volatile and that the OS page cache means only an fsync'd WAL is truly safe.

**Self-check rubric:**
- [ ] I described the row landing in an in-memory buffer-pool page and being marked dirty.
- [ ] I put the fsync'd WAL append before commit returns and named it as the durability point.
- [ ] I explained checkpoints / lazy dirty-page flushing as separate and asynchronous.
- [ ] I explained crash recovery as WAL replay from the last checkpoint.
- [ ] I invoked the ~100x sequential-vs-random gap and mentioned group commit.
- [ ] I flagged the wrong turn of calling an in-memory (un-fsync'd) commit durable.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Explain the durability and latency tradeoffs when a payments service commits at 20,000 write transactions/sec on a single Postgres primary, and choose settings for `synchronous_commit`, group commit, and synchronous replication. Justify where you would relax durability and where you would not.

**Model answer (revealed on demand):**

At 20K write TPS the fsync on the WAL is the binding constraint, because a single fsync to durable storage is on the order of tens of microseconds to a few milliseconds depending on the device, and doing one per transaction serially would cap throughput well below target. So the design is about batching fsyncs without lying about durability.

First, keep `synchronous_commit = on` for actual payment transactions: money movement must be durable before the API returns success, full stop. I would lean on **group commit** (`commit_delay` / `commit_siblings` in Postgres, or the equivalent) so that under high concurrency hundreds of in-flight commits share a single fsync. That is the key move: it preserves per-transaction durability while amortizing the expensive fsync across the batch, which is exactly how you hit 20K TPS without 20K fsyncs.

For clearly non-critical writes on the same system, for example audit-log rows or analytics events where losing the last few milliseconds on a crash is acceptable, I would set `synchronous_commit = off` per-transaction. That lets those commits return before the WAL fsync, trading a small window of potential loss for throughput. I would never do this for the ledger.

For a payments system I also want replication, so I would run a **synchronous standby** (`synchronous_commit = remote_write` or `remote_apply`) so a committed payment survives the loss of the primary, not just a local fsync. The tradeoff is latency: commit now waits for a network round trip to the standby, so I would place the sync standby in the same region/AZ-adjacent to keep that under a couple of milliseconds, and keep additional replicas asynchronous.

Committed tradeoff: money-movement transactions pay full local-plus-remote durability and accept the latency, group commit keeps the fsync cost per transaction low enough to sustain 20K TPS, and only genuinely disposable writes relax `synchronous_commit`. The wrong turn is globally disabling `synchronous_commit` to hit the throughput number and silently making the ledger lose committed payments on a crash.
