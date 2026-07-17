> Module **sd-l2-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l2-m2](./sd-l2-m2.md) · Next: [sd-l2-m4](./sd-l2-m4.md)

# L2 · NoSQL Families

After this module you can pick the right non-relational store for a workload and defend it: key-value for O(1) lookups and caches, document for hierarchical read-together data, wide-column for write-heavy feeds and logs at internet scale, graph for deep multi-hop relationships, time-series for append-heavy metrics, and vector for semantic search in RAG systems. You will be able to design the concrete data layout (keys, partitions, indexes) for each family and name the failure mode that breaks it.

### sd-l2-key-value: Key-Value Stores

- **id:** `sd-l2-key-value`  ·  **difficulty:** easy  ·  **est:** 25 min  ·  **skills:** key-value, redis, sessions

#### Learn

A key-value store is the simplest possible database: a distributed hash map. You `GET(key)`, you `PUT(key, value)`, you `DELETE(key)`. There is no query language over the value, no `WHERE` clause, no join. Because the access path is a hash lookup, point reads and writes are O(1) and the fastest thing in your architecture: Redis serves reads in tens of microseconds in-process and sub-millisecond p99 over the network, and a single node handles 100k+ ops/sec easily. This is why KV stores are the default for caches, session stores, feature flags, rate-limit counters, and as a building block inside bigger systems.

The defining constraint is **value opacity**. To the store, the value is a blob of bytes. You cannot ask "give me all sessions where `lastActive < X`" because the store cannot see inside the value. Whatever you want to query on must be encoded into the key. This forces the key-design discipline that is the whole skill of this family.

**Key design.** Namespace with a prefix and a delimiter so different data types never collide and you can reason about them: `session:{sessionId}`, `user:123:profile`, `ratelimit:{userId}:{minuteBucket}`. Composite keys co-locate related lookups. The danger is **hot keys**: a single key that takes a wildly disproportionate share of traffic (a global counter, a celebrity's profile) becomes a hotspot on whichever shard owns it. You fight this by sharding the key (`counter:{shard}` summed across N shards) or by fronting the hot key with a client-side or local cache.

**Interview nuance:** Interviewers probe "cache or source of truth?" Memcached and a Redis instance with no persistence are caches: if the box dies, the data is gone, and that is fine because you can recompute it from the real database. If you use a KV store as a durable source of truth (DynamoDB, or Redis with AOF/RDB persistence and replication), you must reason about durability, replication, and backups just like any primary database. The common wrong turn is treating a cache-configured Redis as a system of record, then losing data on a restart.

**TTL and eviction** are core to cache use. Every session and counter should carry an expiry (`SET key val EX 3600`) so stale data self-cleans. When memory fills, Redis evicts by policy: `allkeys-lru` for a pure cache, `volatile-lru` to only evict keys that have a TTL, `noeviction` to fail writes instead of dropping data (what you want for a source of truth).

**Redis is more than KV.** It ships data structures that make it a Swiss-army server: sorted sets (leaderboards, sliding-window rate limits, priority queues), lists (simple queues), hashes (store a session as fields you can update individually), streams (append-only log with consumer groups), pub/sub, HyperLogLog (cardinality estimation), and vector similarity. Reaching for these instead of raw string blobs is often the difference between a clean design and a clumsy one.

Choose the engine to the job: **Memcached** for a dumb, multi-threaded, memory-only cache; **Redis** for a single-threaded rich-data-structure store that can also persist; **DynamoDB** for a managed, durable, auto-sharded KV/document store with predictable single-digit-ms latency at any scale.

Recap: KV stores give O(1) opaque-blob lookups, so encode everything you query on into a namespaced key, guard against hot keys, always TTL cache data, and never treat a non-persistent cache as your source of truth.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the data layout for user sessions and rate-limit counters in a key-value store, including key schema and TTLs.

**Think about:**
- How do you design keys and namespaces to avoid hot keys?
- When is a KV store a cache vs a source of truth?
- What does value-blob opacity mean for your model?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume Redis, a web app with a few million daily active users, 30-minute sliding session timeout, and a rate limit of 100 API calls per user per minute.

**Sessions.** Key: `session:{sessionId}` where `sessionId` is a 128-bit random token (opaque, unguessable). I store the session as a Redis **hash** so I can update individual fields (`userId`, `csrfToken`, `lastSeen`, `roles`) without rewriting the whole blob. TTL: `EXPIRE session:{id} 1800`, refreshed on each authenticated request to implement a sliding window. Because the value is opaque, I cannot query "all sessions for user 123" from the session key alone; if I need "log out everywhere," I keep a reverse index `user:{userId}:sessions` as a set of session ids and delete them explicitly. This is a **source of truth** for live sessions, so I run Redis with AOF persistence and a replica, and `noeviction` (or `volatile-lru` so only expiring keys are dropped) to avoid silently evicting a logged-in user.

**Rate-limit counters.** Key: `ratelimit:{userId}:{minuteBucket}` where `minuteBucket` is `floor(epochSeconds / 60)`. Each request does `INCR` then, on first creation, `EXPIRE 60`. The bucketed key means the counter self-expires and I never need a cleanup job. This is **cache-like**: if Redis restarts and a counter is lost, the worst case is a user briefly gets extra calls, which is acceptable, so persistence is optional here. For a smoother sliding window I would instead use a **sorted set** per user keyed by timestamp and count entries in the trailing 60 seconds, trimming old ones with `ZREMRANGEBYSCORE`.

**Hot keys.** A global rate limit (`ratelimit:global`) or a shared counter would concentrate all traffic on one shard. I shard it into `ratelimit:global:{0..15}`, increment a random shard, and sum across shards when reading. Per-user keys naturally spread across the keyspace, so the user-scoped design already avoids hotspots.

The common wrong turn is putting queryable attributes (like `lastActive`) inside the opaque value and then discovering you cannot query them, or running the session store as a non-persistent cache and logging every user out on a restart.

**Self-check rubric:**
- [ ] Did I give a concrete namespaced key schema for both sessions and counters?
- [ ] Did I set TTLs and explain the sliding-window refresh?
- [ ] Did I classify sessions as source-of-truth (persist) and counters as cache-like?
- [ ] Did I address hot keys (sharded global counter, per-user spread)?
- [ ] Did I account for blob opacity (reverse index for "log out everywhere")?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the key-value layer for Twitch's live-stream viewer-count and chat rate-limiting during a top event peaking at 5 million concurrent viewers on a single channel, where a naive global counter would melt one shard. Explain the key schema, the hot-key mitigation, and the consistency you accept.

**Model answer (revealed on demand):**

Assumptions: one channel with 5M concurrent viewers, viewer count displayed with a few seconds of staleness tolerance, chat rate-limited per user and per channel, sub-second update latency.

**Viewer count** is the archetypal hot key: 5M clients all incrementing `viewers:{channelId}` would serialize on one shard and saturate it. I use **sharded counters**: `viewers:{channelId}:{0..255}`. Each edge server increments a random (or edge-id-hashed) shard with `INCR`, and a background aggregator sums the 256 shards every 2 seconds into `viewers:{channelId}:total`, which is what clients read. This trades exactness for throughput: the displayed count lags by seconds, which is fine for a viewer badge. Joins/leaves are handled by incrementing on connect and decrementing on disconnect, with a periodic reconciliation against the connection manager's true socket count to correct drift from missed decrements.

**Chat rate-limiting** has two scopes. Per-user: `ratelimit:chat:{userId}:{secondBucket}` with `INCR`/`EXPIRE 1`, enforcing a few messages per second. Per-channel (slow mode): a single channel-wide limit is itself a hot key, so I push enforcement to the chat edge nodes with a local token bucket per node and only periodically sync aggregate state to Redis, accepting slight over-admission rather than a global lock on every message.

**Consistency:** I deliberately choose eventual/approximate consistency for counts (AP-style) because a viewer badge that is off by 0.1% for 2 seconds costs nothing, whereas exact synchronous counting at 5M concurrent would require coordination that blows the latency budget. Redis Cluster shards the keyspace across nodes; the sharded-counter keys spread the write load, and replicas serve the read of the aggregated total.

The wrong turn here is a single `INCR viewers:{channelId}` for correctness: it is exact but concentrates millions of writes on one node and falls over. The senior move is recognizing the count does not need to be exact and buying massive throughput with sharding plus periodic aggregation.

### sd-l2-document: Document Databases

- **id:** `sd-l2-document`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** document-db, mongodb, modeling

#### Learn

A document database stores semi-structured records, typically JSON or its binary form BSON, where each document is a self-contained tree: nested objects, arrays, and scalars. MongoDB, Couchbase, and Firestore are the common examples. Unlike a relational table, there is no fixed schema enforced by the engine. It is **schema-on-read**: two documents in the same collection can have different fields, and the application interprets shape at read time. That flexibility is the selling point (rapid iteration, heterogeneous data, natural fit for object graphs) and the trap (nothing stops you writing inconsistent shapes, so schema discipline moves into your application and validators).

The single most important modeling decision in this family is **embed versus reference**.

**Embedding** nests related data inside the parent document. A blog post document can carry its recent comments as an array right inside it. One read returns the whole thing, no join, and the data that is read together is stored together, which is exactly what you want on a hot read path. **Referencing** stores an id pointer and fetches the related entity separately, the way a foreign key works, requiring a second lookup (an application-side join, since most document stores do not join efficiently).

The decision rule is driven by three questions. First, **is the data read together?** If you almost always render the post and its comments on the same page, embed the recent ones. Second, **is the related entity large or independently accessed?** An author has a profile, a follower count, and appears on many posts; embedding a full copy of the author into every post duplicates data and means updating the author's name touches thousands of documents. Reference the author. Third, **how big and how unbounded is it?** This is the killer.

**Document size limits.** MongoDB caps a single document at **16MB**. A post with an unbounded, ever-growing comments array will eventually hit that ceiling and the write fails. So the real pattern is hybrid: **embed a bounded, frequently-read subset** (the latest 20 comments, denormalized author name and avatar for display) and **reference the unbounded remainder** (the full comment history lives in its own collection, keyed by post id). This gives you a fast first render and a scalable long tail.

**Interview nuance:** The question that separates juniors from seniors is transactions. **Atomicity is guaranteed per document.** A single document update (including nested fields and arrays) is atomic, all-or-nothing. Multi-document transactions exist in modern MongoDB but are the exception, cost more, and were not available for years. So the idiomatic move is to model an operation that must be atomic as a single document. If updating a post and its comment count must happen together, put the count inside the post document and increment it in the same write. Reaching for multi-document transactions to patch a bad model is the wrong turn.

**Indexing.** You can index nested fields (`author.id`) and array elements (multikey indexes on `tags`). Plan indexes to your queries just as in SQL; an unindexed query on millions of documents is a full collection scan. And because there is no engine-enforced schema, plan **schema versioning**: stamp documents with a `schemaVersion`, migrate lazily on read or with a background job, and let your app handle multiple shapes during the transition.

```
posts (collection)
  { _id, title, body,
    author: { id, name, avatar },        <- referenced id + denormalized display fields
    recentComments: [ {..}, {..} x20 ],   <- embedded bounded subset
    commentCount: 1423 }                   <- embedded for atomic increment
comments (collection)                      <- full unbounded history, referenced
  { _id, postId, authorId, body, createdAt }
```

Recap: Model to the access pattern, embed bounded read-together data and reference large or unbounded entities, respect the 16MB document cap, and treat per-document atomicity as a design constraint rather than assuming relational multi-row transactions.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the document model for a blog/CMS with posts, comments, and authors, deciding what to embed vs reference.

**Think about:**
- What data is read together and should be embedded?
- When does referencing win despite requiring lookups?
- Why is atomicity per-document a constraint?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume MongoDB, a blog with tens of thousands of posts, popular posts reaching thousands of comments, and the hot read path being "render a post page with its author and recent comments."

**Authors: reference.** An author is a large, independently accessed entity that appears across many posts, and their name or avatar can change. Embedding a full author copy in every post would duplicate data and turn a name change into a fan-out update across thousands of documents. So the post holds `author.id` plus a small **denormalized display subset** (`author.name`, `author.avatar`) so the common render needs no join; the canonical author lives in an `authors` collection. If the name changes, a background job updates the denormalized copies, and I accept brief staleness.

**Recent comments: embed a bounded subset.** The post page shows the latest ~20 comments, so I embed them as an array inside the post document, each with the commenter's denormalized name and avatar. One read renders the whole page. Critically I keep this array **bounded**: on a new comment I push and trim to the newest 20, because an unbounded array would eventually blow the **16MB document limit** and would also make the post document heavy to read.

**Full comment history: reference.** All comments live in a `comments` collection keyed by `postId` with an index on `(postId, createdAt)`. "Load more comments" pages this collection. This keeps the post document small and the comment count unbounded.

**Atomicity.** I store `commentCount` inside the post document and increment it in the **same atomic write** that pushes the new comment into the embedded array, because per-document updates are atomic. The full comment also gets inserted into the `comments` collection; if I need those two writes to be all-or-nothing I use a multi-document transaction, but I prefer to make the post-document update the source of truth for display and treat the history insert as append-only.

The common wrong turn is embedding all comments in the post (hits 16MB and bloats reads) or embedding full author copies everywhere (fan-out updates), or assuming a document store gives free relational transactions across posts, authors, and comments.

**Self-check rubric:**
- [ ] Did I reference authors with a denormalized display subset and justify it?
- [ ] Did I embed a bounded recent-comments subset and explain the trim?
- [ ] Did I reference full comment history in its own collection with an index?
- [ ] Did I use per-document atomicity for the comment count?
- [ ] Did I name the 16MB limit and the unbounded-array failure mode?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the Firestore/MongoDB document model for Notion-style nested pages where a page contains blocks (text, images, tables, sub-pages) that can nest arbitrarily deep and a busy workspace page can have thousands of blocks. Explain your embed/reference split, how you avoid the document-size cliff, and how you keep block reordering fast.

**Model answer (revealed on demand):**

Assumptions: a document store, arbitrarily deep block nesting, pages with up to thousands of blocks, frequent block edits and reordering, and multiple users viewing a page.

The naive model embeds the entire block tree inside one page document. It fails twice: a busy page exceeds the **16MB cap**, and every keystroke rewrites a huge document, killing write throughput and concurrency. So I **do not embed the block tree**. I model **each block as its own document** in a `blocks` collection: `{ _id, pageId, parentId, type, content, order }`. The page document holds only metadata (title, icon, permissions, `rootBlockIds`).

**Rendering** a page fetches all blocks with `pageId == X` (indexed on `pageId`) and reassembles the tree in the client from `parentId` pointers. This is a reference-heavy model on purpose: blocks are numerous, independently edited, and unbounded, which is exactly when referencing wins over embedding. Editing one block is a single small-document atomic write, so two users editing different blocks never contend, and per-document atomicity covers each edit.

**Ordering** must not require rewriting every sibling on a reorder. I use **fractional ordering** (a `order` string or float between neighbors): to move a block between two others I compute a key between their order values, so a reorder is a single-block update, not an O(n) renumber. Periodically I rebalance keys if they get too dense.

**Nesting depth** is handled by `parentId`, not by physical embedding, so arbitrary depth costs nothing in document size. Sub-pages are just blocks of type `page` that point to another page document.

The tradeoff I accept: rendering a page is now N block reads instead of one document read, so I mitigate with a single indexed query on `pageId` and client-side assembly, and I can cache the assembled tree. The wrong turn is embedding the tree for "one fast read" and hitting the size cliff plus write contention the moment a page gets popular.

### sd-l2-wide-column: Wide-Column / Column-Family Stores

- **id:** `sd-l2-wide-column`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** wide-column, cassandra, modeling

#### Learn

Wide-column stores (Cassandra, ScyllaDB, HBase, Bigtable) are the write-heavy workhorse of internet-scale systems: message history, activity feeds, event logs, time-series, and anything ingesting a firehose of writes that must never block. The mental model is not a spreadsheet of columns. It is a **distributed, sorted map of maps**: data is grouped into **partitions** (spread across the cluster by a hash of the partition key), and within a partition, rows are **sorted** by clustering columns. Get those two concepts right and this family is straightforward; get them wrong and it falls over.

**Why it is write-optimized.** Cassandra uses an **LSM tree** (log-structured merge tree). A write appends to a commit log and an in-memory memtable and returns immediately, no in-place update, no read-before-write. Memtables flush to immutable **SSTables** on disk, which are later merged by compaction. This makes writes extremely cheap and sequential, so a cluster absorbs millions of writes per second and scales writes linearly by adding nodes. The cost is read amplification (a read may touch several SSTables) and the operational weight of compaction.

**Query-first modeling.** There are **no joins** and essentially no ad-hoc queries. You cannot efficiently query a column that is not part of the key. So you model **one denormalized table per access pattern**: decide the query first, then build a table whose partition key and clustering columns serve exactly that query in a single partition read. If you have two query shapes, you write the data twice into two tables. This feels wasteful to a relational mind and is completely normal here; storage is cheap, and denormalization is the price of linear-scale reads and writes.

**Partition key and clustering columns.** The **partition key** decides which node owns the data and must both spread load evenly and gather everything a query needs into one partition. The **clustering columns** decide the sort order inside the partition, so a "most recent first" query becomes a contiguous slice. For message history: partition by `conversation_id` so all of a conversation's messages live together, cluster by `message_id`/`created_at` **descending** so "load the latest 50" is the first 50 rows of the partition, no sorting at read time.

**The two lethal failure modes.**

1. **Unbounded partitions.** If you partition purely by `conversation_id`, a chatty conversation grows forever. Cassandra partitions have practical limits (aim for under ~100MB and ~100k rows); an unbounded partition eventually causes slow reads, GC pressure, and node instability. The fix is **time-bucketing**: make the partition key composite, `(conversation_id, month)` or `(conversation_id, day)`, so each partition is bounded and old buckets age out. Reads for recent messages hit the current bucket; older reads walk back a bucket at a time.

2. **Hot partitions.** A celebrity conversation or a viral thread concentrates traffic on the one node owning that partition. Mitigate with **sub-partitioning**: add a bucket to the key (`(conversation_id, bucket)` where bucket is `0..N`) to spread a hot entity across N partitions, scattering the load at the cost of a scatter-gather read.

**Consistency is tunable per query.** Cassandra is a Dynamo-style AP system with **tunable consistency**. You choose how many replicas must acknowledge: `ONE` (fast, may read stale), `QUORUM` (majority). If reads and writes both use `QUORUM` on a replication factor of 3, then read-quorum (2) plus write-quorum (2) overlap by at least one replica, so a read always sees the latest acknowledged write (read-your-writes freshness) for that key while tolerating one node down. That is quorum consistency, not linearizability.

**Interview nuance:** The classic question is "why not just add a secondary index in Cassandra?" Answer: Cassandra secondary indexes query across all partitions (a scatter-gather that does not scale) and are an anti-pattern for high-cardinality columns; the idiomatic solution is a second denormalized table, not an index.

```
messages_by_conversation
  PRIMARY KEY ((conversation_id, month), created_at)
                 ^partition key^         ^clustering, DESC
  -> "latest 50 in conversation" = first 50 rows of current-month partition, one node
  -> month bucket bounds partition size; hot convo adds a sub-partition bucket
```

Recap: Wide-column stores are LSM-based write machines; model one denormalized table per query, choose a partition key that spreads load and co-locates the query, cluster to serve the sort, always bound partitions with time-bucketing, sub-partition hot keys, and tune quorum for the consistency you need.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the Cassandra table(s) for a messaging app's message history optimized for "load recent messages in a conversation."

**Think about:**
- How do partition key and clustering columns serve the query?
- How do you avoid unbounded and hot partitions?
- What consistency does a quorum read/write give?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume Cassandra with replication factor 3, a messaging app with millions of conversations, the dominant read being "load the latest 50 messages in a conversation and page backward," and heavy concurrent writes.

**Table, modeled to the query.**

```
CREATE TABLE messages_by_conversation (
  conversation_id  uuid,
  bucket           text,      -- e.g. '2026-07' month bucket
  created_at       timeuuid,
  message_id       timeuuid,
  sender_id        uuid,
  body             text,
  PRIMARY KEY ((conversation_id, bucket), created_at)
) WITH CLUSTERING ORDER BY (created_at DESC);
```

**Why this serves the query.** The **partition key** `(conversation_id, bucket)` co-locates all of a conversation's messages for a given month on the replica set that owns that partition, so "load recent" is a single-partition read (fast, no scatter-gather). The **clustering column** `created_at DESC` stores rows newest-first, so "latest 50" is literally the first 50 rows, `LIMIT 50`, no read-time sort. Paging backward continues the slice, and crossing a month boundary walks to the previous bucket.

**Avoiding unbounded partitions.** Without the `bucket`, a busy conversation's partition grows without bound and eventually degrades reads and destabilizes the node. The **month bucket** bounds each partition; a conversation doing thousands of messages a month stays well under the ~100MB / 100k-row guidance, and I can shrink to a day bucket for extreme volume.

**Avoiding hot partitions.** A viral group chat concentrates writes on one partition's replicas. If that becomes a problem I **sub-partition** by adding a small `shard` (`0..N`) to the partition key and scatter-gather across shards on read, trading a fan-out read for spread write load. I would only pay that cost for genuinely hot conversations.

**Consistency.** I write and read at `QUORUM` on RF=3. Write-quorum (2 of 3) and read-quorum (2 of 3) overlap by at least one replica, so a reader always sees the latest acknowledged write: read-your-writes freshness, not linearizability, while tolerating one replica being down. For lower-value paths (typing indicators) I would drop to `ONE` for speed.

The common wrong turn is partitioning by `conversation_id` alone (unbounded partition), or adding a secondary index on `sender_id` instead of building a second `messages_by_sender` table.

**Self-check rubric:**
- [ ] Did I give a concrete `PRIMARY KEY` with a composite partition key and clustering order?
- [ ] Did I explain how the key makes "load recent" a single-partition, pre-sorted read?
- [ ] Did I time-bucket to bound partition size and name the size limits?
- [ ] Did I address hot partitions with sub-partitioning?
- [ ] Did I specify quorum reads/writes and what consistency that yields on RF=3?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the Cassandra data model for Discord's message storage, roughly a trillion messages, where channels range from a 2-person DM to a 500k-member server firehose, and the read "jump to any point in a channel's history and page" must stay fast. Explain the partition strategy that survives both extremes and how you handle deletes/edits in an append-optimized store.

**Model answer (revealed on demand):**

Assumptions: trillions of messages, channels spanning six orders of magnitude in volume, the core read being "load messages around a point in a channel and page in both directions," and edits/deletes being rare relative to writes. (This mirrors Discord's real Cassandra/ScyllaDB design.)

**Partition strategy: bucket by time window, sized to volume.** Partition key is `(channel_id, bucket)` where `bucket` is a coarse time window. The subtlety is that one fixed bucket size cannot serve both a 2-person DM (needs large buckets so a partition is not tiny and reads do not span dozens of buckets) and a 500k firehose (needs small buckets so a partition does not blow past 100MB). Discord uses a **static ~10-day bucket derived from the Snowflake message id timestamp**, chosen so that even high-traffic channels stay under the partition-size ceiling, and accepts that quiet channels have small sparse partitions. Message ids are **Snowflakes** (time-ordered), so the bucket is computable from the id and clustering by `message_id` gives time order for free.

**Reads.** "Jump to a point" computes the bucket from the target message id and does a single-partition slice; paging backward/forward walks adjacent buckets. Because ids are time-sortable, no separate `created_at` is needed and there is no read-time sort.

**Edits and deletes in an LSM store.** You never update in place. An **edit** rewrites the row (same primary key, new body); the latest write wins by timestamp during compaction. A **delete** writes a **tombstone**, a marker that shadows the row until compaction physically removes it after `gc_grace_seconds`. The trap is **tombstone buildup**: a channel that deletes many messages accumulates tombstones that slow range reads (Cassandra must scan and skip them). This is a real operational pain point, so I keep bulk deletion rare, tune `gc_grace_seconds`, and rely on time-bucketing so old buckets (and their tombstones) age out of the hot read path entirely.

The wrong turn is a single unbucketed `channel_id` partition (a busy server's partition grows into the gigabytes and dies) or per-message dynamic bucket sizes that make the bucket un-computable from the id. The senior insight is picking one bucket size that keeps the worst-case partition bounded and leaning on time-ordered ids so the id itself encodes both order and location.

### sd-l2-graph: Graph Databases

- **id:** `sd-l2-graph`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** graph-db, neo4j

#### Learn

A graph database (Neo4j, JanusGraph, Amazon Neptune, TigerGraph) models data as **nodes** (entities), **edges** (relationships), and **properties** on both. It is purpose-built for one thing: **traversing relationships**, especially deep, multi-hop ones. If your dominant queries are "friends of friends," "who influenced whom across 5 hops," "find the fraud ring connecting these accounts," or "recommend items bought by people who bought what you bought," a graph database is the right tool. If your queries are mostly "get this row by id" or "filter this table," it is the wrong tool.

**The core advantage: index-free adjacency.** In a relational database, a relationship is a foreign key, and following it means a lookup (often an index seek into another table). Following it N times, a multi-hop traversal, means N joins, and each join can multiply the intermediate result set. In a native graph database, each node holds **direct pointers to its adjacent edges and nodes**. Traversing from a node to its neighbors is a pointer hop, roughly O(1) per step regardless of how big the total graph is, because you never consult a global index to find neighbors. The cost of a traversal is proportional to the portion of the graph you actually touch (the local neighborhood), not the size of the whole dataset. This is why "friends of friends of friends" stays fast in Neo4j while the equivalent 3-way self-join degrades in SQL.

**Why recursive relational joins blow up.** Consider friends-of-friends in SQL on a `friendships(user_a, user_b)` table. One hop is one self-join. Two hops is a self-join of a self-join, and the intermediate result is roughly the number of users times the average degree squared. At depth 4 or 5 on a social graph with average degree 200+, the intermediate rows explode into the billions and the optimizer chokes. The graph engine instead walks outward from the start node, visiting only reachable nodes, and deduplicates as it goes.

**Query languages.** Neo4j uses **Cypher**, an ASCII-art pattern language: `MATCH (me:User {id:1})-[:FRIEND*1..2]-(fof) RETURN DISTINCT fof` finds everyone 1 to 2 hops away. Gremlin (Apache TinkerPop) is the imperative traversal alternative, and GQL is the emerging standard. Knowing that `-[:REL*1..3]-` expresses variable-length paths is the interview-relevant literacy.

**When you do NOT need a graph database.** This is the senior judgment call. If your traversals are **shallow (1 or 2 hops)**, a plain **adjacency table in SQL with the right indexes** is completely adequate and saves you a whole new datastore, its operational burden, and its scaling weaknesses. "Show a user's direct friends" is one indexed query. Only when depth grows, the patterns get variable-length, or path/relationship queries dominate does the graph engine earn its place.

**Interview nuance:** The tradeoff interviewers want you to name is **horizontal scaling**. Graphs are hard to shard because a good partition would cut edges, and the whole point is fast edge-following, so a traversal that crosses partitions pays a network hop per boundary and the index-free-adjacency advantage evaporates. Native graph databases often prefer to scale up (bigger machine, replicas for read scaling) rather than out. So the honest position is: graph databases are unbeatable for deep-traversal query complexity but weaker on raw horizontal write scale than Cassandra. Recommendation and fraud systems at extreme scale often precompute or use specialized graph-processing systems rather than a single serving graph database.

Recap: Graph databases win when relationships are first-class and traversals are deep, thanks to index-free adjacency that keeps traversal cost local; recursive SQL joins explode at depth, but a 1-to-2-hop adjacency table in SQL is often the right, simpler choice, and the graph engine's weakness is horizontal scaling.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the graph model for a social network's friends-of-friends and mutual-connection queries.

**Think about:**
- Why do recursive relational joins blow up at traversal depth?
- What does index-free adjacency buy you?
- When does an adjacency table in SQL suffice instead?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume Neo4j, a social network with tens of millions of users, average degree in the low hundreds, and the target queries being "people you may know" (friends-of-friends) and "mutual connections between A and B."

**Model.** `(:User {id, name})` nodes with a single undirected-style `[:FRIEND]` relationship between mutual friends (I store it once and traverse both directions, or store a reciprocal pair, depending on the engine). Properties like `since` live on the edge. Because relationships are first-class, no join table is needed.

**Friends-of-friends** in Cypher: `MATCH (me:User {id:$id})-[:FRIEND]-(f)-[:FRIEND]-(fof) WHERE fof <> me AND NOT (me)-[:FRIEND]-(fof) RETURN fof, count(*) AS mutuals ORDER BY mutuals DESC LIMIT 20`. This walks two pointer hops out from `me`, touching only my neighborhood, and ranks candidates by how many mutual friends they share. **Index-free adjacency** makes this touch only the ~degree-squared local nodes, not the whole 10M-user graph, so it stays fast, and `count(*)` gives the mutual-connection score for free.

**Mutual connections** between A and B: `MATCH (a:User {id:$a})-[:FRIEND]-(m)-[:FRIEND]-(b:User {id:$b}) RETURN m`. Two short traversals intersecting at the shared node.

**Why not SQL.** In a relational `friendships` table, friends-of-friends is a self-join of a self-join; at average degree 200 the intermediate result is on the order of 200 x 200 = 40k rows per user before dedup, and mutual-connection ranking across the whole base becomes a heavy aggregate. It works at small scale but degrades as depth or degree grows.

**When SQL would suffice.** If the product only ever showed **direct friends** (1 hop) and a simple mutual count on a profile, a `friendships(user_a, user_b)` table with an index on both columns answers both with one indexed query each, and I would not introduce Neo4j at all. I add the graph database specifically because "people you may know" is an inherently 2-hop, ranked-by-shared-edges query that is the graph engine's sweet spot.

**Scaling caveat I would state:** Neo4j is hard to shard because partitioning cuts the very edges we traverse, so I scale reads with replicas and, for a truly massive graph, precompute PYMK suggestions in a batch job rather than traversing live for every request.

The common wrong turn is reaching for a graph database when the product only needs 1-hop direct-friend lookups, adding operational cost for no query-complexity benefit.

**Self-check rubric:**
- [ ] Did I define nodes, edges, and edge properties concretely?
- [ ] Did I write the friends-of-friends and mutual-connection traversals?
- [ ] Did I explain index-free adjacency keeping cost local vs SQL join explosion at depth?
- [ ] Did I state when a SQL adjacency table would suffice instead?
- [ ] Did I name the horizontal-scaling weakness and a mitigation (replicas/precompute)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the graph model for a payments company's real-time fraud-ring detection, where you must flag whether a new transaction connects (within 3 to 4 hops through shared devices, cards, IPs, and accounts) to a known fraudulent entity, at 10k transactions per second with a sub-100ms decision budget. Explain the model, the query, and how you meet the latency budget given graph scaling limits.

**Model answer (revealed on demand):**

Assumptions: 10k TPS, sub-100ms per-decision budget, entities are accounts, cards, devices, IP addresses, and merchants, and fraud manifests as many entities clustered around shared identifiers (one device using 40 cards, one card across 30 accounts).

**Model.** A heterogeneous graph: `(:Account)`, `(:Card)`, `(:Device)`, `(:IP)`, `(:Merchant)` nodes, with edges like `(:Account)-[:USED]->(:Device)`, `(:Card)-[:BELONGS_TO]->(:Account)`, `(:Transaction)-[:FROM_IP]->(:IP)`. Known-bad entities carry a `:Flagged` label. Fraud rings show up as dense subgraphs where many accounts share a device, card, or IP, which is exactly a graph-shaped query and miserable in SQL.

**Query.** On a new transaction, traverse 3 to 4 hops from the transaction's entities looking for a path to any `:Flagged` node or for structural red flags (a device linked to more than K accounts): `MATCH (t)-[*1..4]-(bad:Flagged) RETURN bad LIMIT 1`, plus fan-out checks. Index-free adjacency keeps this touching only the local neighborhood of the new transaction rather than scanning the whole graph.

**Meeting the latency budget despite scaling limits.** A live 4-hop traversal per transaction at 10k TPS is where the graph database's horizontal-scaling weakness bites: cross-partition hops and contention blow the 100ms budget. So I split the work. **Offline/near-real-time**, a graph-processing job (or the graph database over replicas) continuously computes connected components and risk scores for entities and materializes a "distance-to-known-fraud" and "cluster risk" score onto each entity node. **In the hot path**, the transaction decision becomes a cheap lookup of the precomputed scores of its 4 or 5 directly involved entities plus a shallow 1-to-2-hop live check, which fits sub-100ms. New edges from the transaction are written to the graph and feed the next incremental recompute.

This is the senior move: use the graph engine for its traversal strength offline to precompute, and keep the synchronous 10k-TPS path to a bounded shallow lookup. The wrong turn is a full 4-hop live traversal per transaction, which is correct but cannot hold the latency budget at scale given graph sharding limits.

### sd-l2-time-series: Time-Series Databases

- **id:** `sd-l2-time-series`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** time-series, metrics, cardinality

#### Learn

A time-series database (TSDB) is specialized for a distinct workload: **append-heavy, time-ordered writes** of measurements, where **time is the primary axis** of both storage and query. Metrics and monitoring (Prometheus), IoT sensor data (InfluxDB, TimescaleDB), observability, financial ticks, and anything that is fundamentally "value at timestamp, tagged by source" fits. The workload has a very particular shape: writes almost always append at the current time (you rarely update the past), reads are overwhelmingly **range scans** ("CPU for host X over the last hour," "p99 latency across the fleet for the last 24h"), and old data is queried less and less as it ages.

**Why not just use Postgres?** You can start there, but three properties of the workload make a purpose-built engine win at scale.

**1. Columnar storage + specialized compression.** A time series is a column of numbers with regularly spaced timestamps, which compresses extraordinarily well if you store it column-wise. Two techniques dominate. **Delta-of-delta** encoding on timestamps: if points arrive every 10 seconds, the delta is constant (10s) and the delta-of-delta is 0, which packs to almost nothing. **Gorilla / XOR** compression on values (Facebook's Gorilla paper): consecutive float values are often close, so XORing them leaves mostly zero bits that pack tightly. Together these routinely hit **10x or better** compression versus row storage, which is the difference between affordable and ruinous at millions of points per second.

**2. Time-partitioned storage and retention.** Data is written into **time-bucketed partitions** (chunks/shards by day or hour). This makes range queries touch only the relevant chunks, makes dropping old data an O(1) partition drop instead of a mass DELETE, and enables **tiering**: recent "hot" data on fast SSD, older "warm" data on cheaper disk, ancient "cold" data downsampled or in object storage like S3.

**3. Downsampling and rollups.** You do not keep raw per-second points forever. **Retention policies** plus **rollups** keep raw data for, say, 7 days, 1-minute aggregates for 30 days, and 1-hour aggregates for 2 years. A dashboard showing last-year trends reads the cheap hourly rollup, not billions of raw points. This bounds both storage cost and query cost.

**The signature failure mode: cardinality explosion.** This is the single thing interviewers test. A time series is identified by its metric name plus its **set of tag/label key-value pairs**: `http_requests{host, region, status, endpoint, user_id}`. The number of distinct series is the **product** of the distinct values of every tag. Add a high-cardinality tag like `user_id` (millions of values) or `request_id` (unbounded) and you multiply your series count into the millions or billions. Each distinct series needs its own index entry and storage stream, so cardinality explosion blows up index memory, slows every query, and can OOM the database. Prometheus falling over because someone added a `user_id` label is a real, common outage.

**Controlling cardinality** is the core design skill: keep labels **low-cardinality and bounded** (host, region, status code, endpoint template), never put unbounded identifiers (user id, request id, full URL with query params, email) into labels. If you need per-user analytics, that belongs in an OLAP store (ClickHouse) or logs, not in a metrics TSDB. Use endpoint **templates** (`/users/:id`) not raw paths.

**Interview nuance:** Know the landscape. **Prometheus** is pull-based metrics with its own TSDB, great for infra monitoring, not for long-term high-cardinality analytics. **InfluxDB / TimescaleDB** (the latter is Postgres with time-series superpowers, so you keep SQL and joins) are general TSDBs. **ClickHouse** is a columnar OLAP database often used for high-cardinality, high-volume time-series analytics where you need arbitrary group-bys that would kill a label-indexed TSDB.

Recap: TSDBs exploit append-only, time-ordered, columnar data with delta-of-delta and Gorilla compression, time-partitioning, retention tiers, and downsampling to make metrics affordable, and the failure mode you must design against is cardinality explosion from unbounded tags.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design storage for a metrics/monitoring system ingesting millions of points/sec with fast recent-range queries and cheap long-term retention.

**Think about:**
- Why is cardinality explosion the key failure mode?
- How do downsampling and retention tiers bound cost?
- Why is columnar + delta-of-delta compression a good fit?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a fleet-monitoring system ingesting ~2M points/sec, dashboards querying the last hour heavily and last year occasionally, and a requirement to retain some history for 2 years affordably.

**Data model.** Each point is `metric_name{labels} -> (timestamp, value)`. I keep labels **strictly low-cardinality and bounded**: `host`, `region`, `service`, `status_code`, `endpoint_template`. I explicitly forbid unbounded labels (`user_id`, `request_id`, raw URL) because the series count is the product of label cardinalities, and one unbounded label explodes it into millions of series that OOM the index. Per-user needs go to an OLAP store or logs, not here.

**Storage engine.** A purpose-built TSDB (Prometheus + long-term store like Thanos/Mimir, or InfluxDB/TimescaleDB). Data is **columnar** and compressed with **delta-of-delta** on timestamps (near-zero for regular intervals) and **Gorilla/XOR** on values, yielding 10x+ compression, which is what makes 2M points/sec economical.

**Time-partitioning.** Write into **time-bucketed chunks** (e.g. 2-hour or daily blocks). Recent-range queries touch only the current chunks, and dropping expired data is a cheap partition drop, not a mass DELETE.

**Retention tiers + downsampling.** I keep **raw resolution for 7 days** (hot, on SSD), **1-minute rollups for 30 days** (warm), and **1-hour rollups for 2 years** (cold, cheaper disk or object storage). A "last hour" dashboard reads raw; a "last year" trend reads hourly rollups, so query cost is bounded by resolution, not raw volume. Rollups are precomputed continuously (recording rules / continuous aggregates).

**Query path.** Recent-range queries hit hot chunks at raw resolution and return in tens of ms; long-range queries transparently read the rollup tier. Ingest is decoupled with a buffer (remote-write queue) so a query spike never backs up ingestion.

The common wrong turn is allowing high-cardinality labels ("let's tag by user for flexibility"), which quietly grows series count until the index OOMs, or keeping raw points forever, which makes long-range queries and storage cost blow up. The fix to both is bounded labels plus downsampling and retention tiers.

**Self-check rubric:**
- [ ] Did I define the metric+labels model and explicitly bound label cardinality?
- [ ] Did I explain cardinality = product of label values and the OOM failure?
- [ ] Did I specify columnar storage with delta-of-delta and Gorilla compression?
- [ ] Did I lay out retention tiers with downsampling/rollups by resolution?
- [ ] Did I use time-partitioning for range queries and cheap expiry?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the time-series storage for Datadog-style multi-tenant observability ingesting 20M points/sec across thousands of customers, where any one customer can accidentally emit a runaway high-cardinality metric that must not degrade other tenants. Explain your ingestion, cardinality guardrails, and how you isolate a noisy tenant.

**Model answer (revealed on demand):**

Assumptions: 20M points/sec, thousands of tenants, per-tenant isolation required, dashboards over minutes-to-months, and the certainty that some customer will emit a metric tagged by `request_id` or `pod_uid` and explode cardinality.

**Ingestion.** A horizontally scaled write path fronted by Kafka: agents remote-write to a stateless ingestion tier that validates, then produces to Kafka partitioned by `(tenant_id, metric)`. Kafka absorbs bursts and decouples ingest from storage so a storage hiccup never drops customer data. Consumers write into a columnar TSDB (Mimir/Cortex/InfluxIOx-style) with delta-of-delta + Gorilla compression and time-bucketed blocks in object storage (S3) for cheap long-term retention, SSD for hot.

**Cardinality guardrails (the crux).** I enforce a **per-tenant active-series limit** and **per-metric label-cardinality limits** at ingest. When a tenant's series count for a metric crosses a threshold, I **reject or drop the offending high-cardinality label** (or the metric) and surface a "cardinality limit exceeded" warning in their UI rather than accepting it. I detect the usual culprits (labels whose value looks like a UUID, unbounded growth rate) and can auto-quarantine them. This is the difference between a runaway metric being one customer's dashboard problem versus a cluster-wide OOM.

**Tenant isolation.** Every write and query carries `tenant_id`; storage blocks and index are partitioned per tenant so one tenant's data and cardinality never share an index with another's. I enforce **per-tenant quotas** on ingest rate, active series, and query concurrency/cost, so a noisy tenant hits their own limit first. The query tier is multi-tenant but rate-limited and cost-capped per tenant (a tenant running an expensive year-long high-resolution query is throttled, not allowed to starve others). Kafka partitioning plus per-tenant series limits mean a runaway is contained to the offending tenant's partitions and quota.

**Downsampling/retention** is per-tenant policy: raw for days, rollups for months to years, all in S3 tiers.

The wrong turn is a shared global index with no per-tenant cardinality caps: the first customer to tag by `pod_uid` takes down everyone. The senior insight is that in multi-tenant TSDB, cardinality is a **security/isolation boundary**, not just a performance concern, so it must be quota-enforced per tenant at the ingest gate.

### sd-l2-vector-embeddings: Vector Databases & Embeddings

- **id:** `sd-l2-vector-embeddings`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** vector-db, embeddings, ann

#### Learn

A vector database stores **embeddings**, high-dimensional numeric vectors (typically 384 to 3072 dimensions) produced by an embedding model, and answers **similarity search**: "give me the K stored vectors closest to this query vector." This is the retrieval backbone of semantic search, recommendations, deduplication, and RAG (retrieval-augmented generation), where you embed a user's question, find the most similar document chunks, and feed them to an LLM as context. The whole value is that "closeness" in embedding space approximates semantic meaning, so a query for "how do I reset my password" retrieves a chunk about "recovering account access" even with zero shared keywords.

**Why not exact search.** Finding the true nearest neighbors means comparing the query against every stored vector (a brute-force scan), which is O(N x d). At a few thousand vectors that is fine; at millions or billions it is far too slow for an interactive query. So vector databases use **ANN (approximate nearest neighbor)** search: give up a small amount of **recall** (you might miss a few of the true top-K) in exchange for orders-of-magnitude faster queries. The central tradeoff of the whole family is **recall vs latency vs memory**, and picking an index is picking a point on that surface.

**The index families you must know.**

**HNSW (Hierarchical Navigable Small World)** builds a layered graph where each vector links to nearby vectors; search greedily hops through the graph from a coarse top layer down to a fine bottom layer. It gives **high recall at low latency** and is the default for most workloads. The cost is **memory**: the graph and vectors live in RAM, so it is expensive at billion scale. Tunable knobs: `M` (links per node) and `efSearch` (candidates explored, higher = better recall, slower).

**IVF (Inverted File)** clusters vectors into `nlist` partitions (via k-means) and, at query time, only searches the few nearest partitions (`nprobe`). It is more memory-efficient and faster to build than HNSW but has lower recall unless you probe more partitions. **PQ (Product Quantization)** compresses each vector into a short code (e.g. 1536 floats to 64 bytes), slashing memory maybe 10 to 50x at the cost of some recall. **IVF-PQ** combines them and is the go-to for **billion-scale, memory-constrained** deployments (this is what FAISS is known for). Rule of thumb: HNSW when recall and latency matter and you can afford RAM; IVF-PQ when scale and memory dominate.

**Beyond raw similarity: two essentials.**

**Metadata filtering.** Real queries are "similar chunks **from this user's documents, in English, updated this year**." You store metadata alongside each vector and filter on it. The subtlety is **pre-filter vs post-filter**: post-filtering (find top-K by vector, then drop non-matching) can return too few results if the filter is selective; good systems do **filtered ANN** that respects the filter during traversal. Ask about this; it is a common gotcha.

**Hybrid search.** Pure vector search misses exact keyword matches (product codes, names, rare terms). **Hybrid search** combines vector similarity with a keyword/**BM25** lexical score, fused (often via **reciprocal rank fusion**), giving both semantic recall and lexical precision. Production RAG almost always uses hybrid.

**Interview nuance:** "pgvector or a dedicated vector store?" **pgvector** (Postgres extension) is the right call when your corpus is modest (up to low millions), you already run Postgres, and you want vectors next to relational data and transactions with no new system. Reach for a **dedicated store** (Pinecone, Weaviate, Qdrant, Milvus) at tens of millions to billions of vectors, when you need advanced filtered ANN, horizontal scaling, or managed operations. Do not add a specialized vector database for 50k chunks; pgvector is plenty.

**Design choices that bite later:** the **embedding model** fixes your **dimensionality** and **distance metric** (cosine for normalized text embeddings, dot product, or L2). **Chunking** strategy (size and overlap) hugely affects retrieval quality. And critically, **re-embedding migrations**: if you switch embedding models, every stored vector is now in a different space and must be **re-embedded**, an expensive backfill you must plan for, so version your embeddings.

Recap: Vector databases do approximate nearest-neighbor search over embeddings, trading recall for latency and memory; choose HNSW for recall at cost of RAM or IVF-PQ for billion-scale memory efficiency, always add metadata filtering and hybrid (vector + BM25) search, use pgvector until scale forces a dedicated store, and plan for re-embedding when the model changes.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the storage and retrieval layer for a RAG system that does semantic search over millions of document chunks.

**Think about:**
- Which ANN index (HNSW, IVF, PQ) fits your recall/latency/memory budget?
- How do metadata filtering and hybrid (vector + BM25) search combine?
- When is pgvector enough vs a dedicated vector store?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume an enterprise RAG system over ~10M document chunks, multi-tenant (each query scoped to one org's documents), interactive latency budget under ~200ms for retrieval, and a requirement to catch both semantic matches and exact terms (product codes, names).

**Pipeline.** Ingest documents, chunk them (roughly 500 tokens with ~50-token overlap so context is not sliced mid-idea), embed each chunk with a fixed model (say a 1024-dim text embedding), and store `{vector, chunk_text, metadata: {org_id, doc_id, lang, updated_at, source}}`. Normalize vectors and use **cosine** distance.

**Store choice.** At 10M chunks with multi-tenant filtering and sub-200ms needs, I use a **dedicated vector store** (Qdrant, Weaviate, or Milvus) rather than pgvector. pgvector would be my choice under a couple million chunks with existing Postgres, but 10M plus heavy filtered ANN and horizontal scaling pushes me to a purpose-built system.

**Index.** **HNSW** as the primary index: it gives high recall at low latency, which matters because RAG answer quality depends on retrieving the right chunks. 10M x 1024-dim vectors fit in RAM on a reasonably sized cluster, so I pay the memory cost for recall. I tune `efSearch` to hit my recall target and measure. If the corpus grew to billions or memory got tight, I would switch to **IVF-PQ** to trade some recall for a large memory reduction.

**Filtering.** Every query is scoped by `org_id` (a hard multi-tenant boundary) plus optional `lang`/`recency` filters. I use the store's **filtered ANN** (filter applied during graph traversal) rather than naive post-filtering, because post-filtering a selective `org_id` after top-K could return too few chunks.

**Hybrid search.** I run **vector search + BM25 keyword search** in parallel and fuse with reciprocal rank fusion, so a query mentioning an exact SKU or person's name still retrieves the lexically matching chunk that pure embeddings might rank low. This measurably improves precision on enterprise corpora.

**Retrieval.** Return top ~20 by fused score, optionally **rerank** with a cross-encoder to top ~5, then pass those chunks to the LLM.

**Migrations.** I version embeddings; if I upgrade the embedding model, all 10M chunks must be **re-embedded** (a planned backfill), since old and new vectors are not comparable.

The common wrong turn is assuming exact/brute-force vector search scales (it does not past a few thousand), or ignoring the recall-vs-latency-vs-memory tradeoff and just "using HNSW" without measuring recall, or forgetting metadata filtering and leaking one tenant's chunks into another's answers.

**Self-check rubric:**
- [ ] Did I choose an ANN index (HNSW vs IVF-PQ) and justify it on recall/latency/memory?
- [ ] Did I include metadata filtering with filtered ANN and a multi-tenant boundary?
- [ ] Did I add hybrid (vector + BM25) search with fusion?
- [ ] Did I justify dedicated store vs pgvector by scale?
- [ ] Did I cover chunking, distance metric, and re-embedding migrations?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the retrieval layer for Spotify-style podcast/music semantic search and recommendations over 5 billion embeddings (tracks, episodes, user taste vectors), where queries must return in under 50ms and the index must fit a realistic memory budget. Explain your index choice, how you shard, and how you keep recommendations fresh as new content arrives every minute.

**Model answer (revealed on demand):**

Assumptions: 5 billion vectors, p99 under 50ms, a memory budget that makes full in-RAM HNSW over 5B vectors economically impossible, continuous ingestion of new tracks/episodes, and both search (query vector to items) and recommendation (user taste vector to items) use cases.

**Index: IVF-PQ, not pure HNSW.** At 5B vectors, storing full-precision vectors plus an HNSW graph in RAM would cost an absurd amount of memory. So I use **IVF-PQ** (FAISS-style): IVF partitions the space into many clusters so a query only scans a few (`nprobe`) partitions, and **PQ** compresses each vector to a short code (e.g. 64 bytes), cutting memory by an order of magnitude. This fits the budget and hits sub-50ms by probing a bounded number of partitions, accepting slightly lower recall than HNSW, which is fine for recommendations where "good" beats "provably nearest." I can add a re-ranking pass on full-precision vectors for the top candidates to recover precision.

**Sharding.** Partition the 5B vectors across many shards (by IVF cluster or by a hash), each shard an IVF-PQ index served by its own nodes; a query fans out to the relevant shards and merges top-K (scatter-gather). This scales horizontally and keeps per-shard memory bounded. Replicas per shard give read throughput and availability.

**Freshness.** New content every minute cannot wait for a full index rebuild (IVF training is expensive). I run a **two-tier index**: a large, periodically rebuilt **base IVF-PQ index** for the bulk, plus a small, fast, freshly-updated **HNSW (or flat) index for recent items** that is cheap to insert into. Queries search both and merge, so a track uploaded a minute ago is retrievable immediately, and it folds into the base index on the next scheduled rebuild. User taste vectors update as people listen and are just another query vector against the item index.

The wrong turn is insisting on exact search or full in-memory HNSW at 5B scale (memory-infeasible and too slow to rebuild), or a single monolithic index that cannot ingest fresh content without a full retrain. The senior moves are IVF-PQ for the memory/latency budget, sharded scatter-gather for horizontal scale, and a hot fresh-item index layered over a periodically rebuilt base for freshness.
