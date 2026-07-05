> Module **sd-l10-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l10-m3](./sd-l10-m3.md) · Next: [sd-l10-m5](./sd-l10-m5.md)

# L10 · Storage & Infrastructure Systems

By the end of this module you can run the infrastructure "design X" interviews that sit under almost every product: a distributed cache, a key-value store, an object store, a Kafka-style log, a job scheduler, a coordination service, a code sandbox, and a webhook delivery system. You will reason from durability and consistency guarantees down to the one hard correctness detail (consistent hashing, quorums, erasure coding, fencing tokens, idempotency) that each problem is really testing.

### sd-l10-distributed-cache: Design a Distributed Cache (Redis-like)

- **id:** `sd-l10-distributed-cache`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** distributed-cache, consistent-hashing, eviction

#### Learn

A distributed cache is the workhorse that sits in front of your database and absorbs the read load that would otherwise crush it. The interview tests three things: how you spread keys across nodes, how you evict when memory fills, and how you survive a hot key or a cache stampede. Get those three right and the rest is plumbing.

Start with placement. The naive approach is `node = hash(key) % N`. It works until you add or remove a node, at which point almost every key maps somewhere new and your hit rate collapses to near zero while the whole fleet stampedes the database. Consistent hashing fixes this: map both keys and nodes onto a fixed ring (say a 2^32 space), and a key belongs to the first node clockwise from its hash. Adding a node only steals keys from its immediate neighbor, so only about 1/N of keys move. Raw consistent hashing gives lumpy load because node positions are random, so use virtual nodes: give each physical node 100 to 200 points on the ring. Now load evens out and, when a node dies, its keys spread across many survivors instead of dumping onto one neighbor.

**Interview nuance:** If you say "hash mod N" and do not immediately catch that adding a node reshuffles the world, that is a red flag. Lead with consistent hashing plus virtual nodes.

Eviction is next. You cannot hold everything, so pick a policy. LRU (least recently used) is the default and fits most workloads because recency predicts reuse. LFU (least frequently used) beats LRU when a small set of keys is popular over a long window and you do not want a scan to evict them. TTL-based expiry is orthogonal and almost always on too, so stale entries self-clean. Redis actually samples a handful of keys and evicts the best candidate rather than maintaining a perfect LRU list, trading exactness for O(1) writes.

Then caching patterns. Cache-aside (the app reads cache, on miss reads the DB and populates the cache) is the common default and keeps the cache out of the write path. Write-through writes cache and DB together for freshness at the cost of write latency. Write-back writes cache first and flushes to the DB asynchronously for speed, at the risk of data loss on crash. Say which you would use and why.

Now the two failure modes interviewers push on. A cache stampede happens when a hot key expires and thousands of concurrent requests all miss and hit the DB at once. Fix it with request coalescing (a single in-flight fetch per key, others wait for its result), a short randomized TTL jitter so keys do not all expire together, or serving stale-while-revalidate. A hot key is a single key so popular it saturates one node's CPU or network. Consistent hashing alone does not help because it is one key on one node, so replicate the hot entry across several nodes and randomize which replica a client reads, or add a small local in-process cache in front of the distributed tier.

Replication gives availability: each shard has a primary and one or more replicas, with async replication for speed (and a small window of lost writes on failover) or sync for safety. On primary failure a sentinel or the cluster gossip promotes a replica.

```
GET k -> hash(k) -> ring -> node N3 (primary)
   miss -> coalesce -> DB read -> SET k (jittered TTL) -> return
hot key: replicate k to N3,N5,N7 -> client picks a random replica
```

Recap: place keys with consistent hashing plus virtual nodes (never hash mod N), evict with LRU or LFU plus TTL, choose cache-aside by default, and defend hot keys with replication and stampedes with coalescing plus TTL jitter.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a distributed in-memory cache with consistent hashing, replication, and an eviction policy for a read-heavy service.

**Think about:**
- How do consistent hashing and virtual nodes distribute keys?
- Which eviction policy and cache pattern fit?
- How do you handle stampede and hot keys?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a read-heavy service (say 90:10 read:write), millions of keys, values from bytes to a few KB, sub-millisecond p99 lookup target, and the cache is allowed to lose data on crash because the database is the source of truth.

Placement: map keys and nodes onto a consistent hashing ring, with 150 virtual nodes per physical node so load is even and node loss spreads across survivors. A client library (or a proxy like Twemproxy or the Redis Cluster smart client) hashes the key and routes directly to the owning node, so there is no central bottleneck. Adding capacity moves only about 1/N of keys.

Eviction: LRU with sampled approximation (evict the oldest of a small random sample) for O(1) writes, plus a TTL on every entry so stale data self-expires. If the workload is a stable popular set, switch to LFU so a burst of one-off reads does not evict the hot working set.

Pattern: cache-aside. The app reads the cache, and on a miss reads the DB and populates the cache with a jittered TTL. Writes update the DB and either delete or update the cache key, so we never serve a value we know is stale.

Replication and failover: each shard is a primary with one async replica. On primary failure, cluster gossip or a sentinel promotes the replica, accepting a sub-second window of possibly lost recent writes, which is fine because the DB is authoritative.

Stampede protection: request coalescing so only one request per key fetches from the DB while others wait, plus randomized TTL jitter so popular keys do not all expire in the same second. Optionally serve stale-while-revalidate.

Hot keys: detect via per-key request counters, then replicate the hot entry to several nodes and have clients read a random replica, or push a tiny local LRU into each app process to absorb the spike before it hits the distributed tier.

Tradeoffs: async replication buys speed at a tiny durability risk (acceptable here); sampled LRU trades exactness for throughput. The common wrong turn is hash-mod-N sharding, which reshuffles nearly all keys and stampedes the DB whenever the fleet size changes.

**Self-check rubric:**
- [ ] Did I choose consistent hashing plus virtual nodes and explain why hash mod N is wrong?
- [ ] Did I name an eviction policy (LRU/LFU) and pair it with TTL?
- [ ] Did I pick a cache pattern (cache-aside) and justify it?
- [ ] Did I give concrete stampede protection (coalescing, TTL jitter)?
- [ ] Did I handle hot keys with replication or a local cache, not just sharding?
- [ ] Did I say how a primary failover works and what is lost?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the caching tier for Twitter's home timeline reads, where a celebrity tweet from an account with 100M followers triggers a read fan-out spike, sustained reads run at 300K QPS globally, and a single trending key can attract 500K reads/sec.

**Model answer (revealed on demand):**

Assumptions: reads dominate massively, the working set is billions of small objects (tweet blobs, timeline id lists), latency budget is a few milliseconds, and traffic is bursty around trending content and public events.

Topology: a multi-tier cache. Tier 1 is a small in-process LRU in each application server holding the hottest few thousand keys, which absorbs the trending-key spike before it ever leaves the box. Tier 2 is a large sharded Redis cluster placed by consistent hashing with virtual nodes, replicated per region. A trending key at 500K reads/sec would melt one Redis node, so we explicitly replicate hot entries across N nodes and have clients read a random replica, giving N times the serving capacity for that key. The in-process tier means most of those 500K reads never reach Redis at all.

Fan-out choice: for normal users we precompute and cache the timeline id list (fan-out on write). For celebrities with 100M followers, fan-out on write is catastrophic (one tweet writes 100M timelines), so we fan-out on read for their tweets: cache the celebrity's recent tweets as a hot key and merge them into each follower's timeline at read time. This hybrid is the core insight.

Stampede: when a viral tweet's cache entry expires, coalesce so one request rebuilds it while others serve stale, and use TTL jitter across timeline keys.

Consistency: timelines tolerate seconds of staleness, so async replication and cache-aside are fine; we optimize for availability and latency over freshness. The wrong turn is treating a celebrity like a normal user (fan-out on write to 100M timelines) or letting a single trending key ride one Redis shard with no replication or local tier.

### sd-l10-key-value-store: Design a Key-Value Store (DynamoDB/Cassandra)

- **id:** `sd-l10-key-value-store`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** key-value-store, quorum, lsm

#### Learn

A distributed key-value store is the Dynamo-lineage system (DynamoDB, Cassandra, Riak) that gives you horizontal scale and no single point of failure by trading away single-machine transactions. The interview tests four internals: partitioning, replication and quorums, conflict resolution, and the write path (LSM). You do not need to invent Paxos; you need to compose these pieces and know what each one costs.

Partitioning uses consistent hashing again. Keys map onto a ring, each node owns a range, and a replication factor N means each key is stored on the N nodes clockwise from its position (the preference list). Virtual nodes even out the load. This is the same primitive as the cache lesson, now applied to durable storage.

Replication and quorums are the heart. With N replicas, a write is acknowledged after W replicas confirm and a read waits for R replicas to respond. The tunable rule is: if R + W > N, a read quorum and a write quorum must overlap in at least one node, so a read is guaranteed to see the latest acknowledged write. Common settings: N=3, W=2, R=2 gives strong-ish reads with tolerance for one node down. W=1 is fast writes but risky; R=1 is fast reads that may be stale. You expose these knobs so the caller picks per-operation consistency.

**Interview nuance:** The classic trap is claiming R + W > N gives linearizability. It does not. It guarantees you read a value at least as new as the last acknowledged write on the overlapping node, but concurrent writes, read-repair timing, and sloppy quorums (hinted handoff writing to fallback nodes) mean you can still see anomalies. Say "quorum overlap gives read-your-writes-ish freshness, not linearizability; for true linearizability you need consensus like Paxos or Raft."

Conflicts happen because two clients can write the same key on different replicas during a partition. Resolution options: last-write-wins (LWW) by timestamp is simple but silently drops one write and is vulnerable to clock skew. Vector clocks track causality so you can detect true concurrency and either merge or hand both versions (siblings) to the application. Cassandra uses LWW; Dynamo used vector clocks. Replicas that drift are reconciled two ways: read-repair (on a read, if replicas disagree, push the newest to the stale ones) and anti-entropy using Merkle trees (nodes exchange hash trees of their ranges and only sync the differing subtrees, avoiding a full scan).

The write path is log-structured (LSM tree). A write appends to a commit log for durability, then updates an in-memory sorted structure (memtable). When the memtable fills, it flushes to an immutable sorted file on disk (SSTable). Reads may check several SSTables, so a bloom filter per SSTable skips ones that cannot contain the key. Background compaction merges SSTables, drops tombstones (deletes), and keeps read amplification bounded. This design makes writes sequential and fast, which is why these stores ingest so well.

Membership uses gossip: nodes periodically exchange state so the cluster learns of joins and failures without a central coordinator. Hinted handoff keeps writes available during a brief node outage: a neighbor accepts the write with a hint and replays it when the owner returns.

```
write k=v -> coordinator -> replicas [N1,N2,N3]
   commit log -> memtable -> (flush) SSTable ; bloom filter per SSTable
   ack after W replicas ; read waits for R ; R+W>N overlaps
```

Recap: partition with consistent hashing and replication factor N, tune consistency with R + W > N (which is freshness, not linearizability), resolve conflicts with vector clocks or LWW plus read-repair and Merkle anti-entropy, and store writes in an LSM (commit log, memtable, SSTable, compaction).

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a horizontally scalable KV store with tunable consistency and no single point of failure.

**Think about:**
- How do consistent hashing and replication factor form the ring?
- How do R/W quorums give tunable consistency?
- How are conflicts resolved and replicas reconciled?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a multi-node cluster serving get/put on opaque keys, high write and read throughput, must survive node and rack failures with no coordinator SPOF, and callers want to trade consistency for latency per operation.

Partitioning: consistent hashing ring with virtual nodes for even load. Replication factor N (default 3); each key lives on the N nodes clockwise from its hash (its preference list), ideally spread across racks or AZs for fault isolation. Any node can act as coordinator for a request and forward to the preference list, so there is no single point of failure.

Tunable consistency: expose W and R. A write acks after W replicas persist; a read gathers R responses and returns the newest. R + W > N guarantees the read and write quorums overlap, so reads see the latest acknowledged write. Defaults N=3, W=2, R=2 tolerate one node down while staying fresh; a latency-sensitive path can drop to R=1, and a durability-critical path can raise W=3.

Conflict resolution: attach a version to each value. Vector clocks detect concurrent writes so we can surface siblings to the app or merge them; if the data model allows, LWW by a hybrid logical clock is simpler but silently drops a write. Reconcile drifting replicas with read-repair on the read path and background anti-entropy using Merkle trees so only differing ranges sync.

Write path: append to a commit log, update the memtable, flush to immutable SSTables, and compact in the background; a bloom filter per SSTable bounds read amplification. This keeps writes sequential and fast.

Availability: gossip for membership and failure detection, and hinted handoff so a temporary node outage does not block writes.

Tradeoffs and the wrong turn: R + W > N gives read-your-writes freshness, not linearizability, because concurrent writes and sloppy quorums still allow anomalies; for true linearizable operations you need a consensus group (Raft) per partition, which costs latency. Claiming quorum overlap equals linearizability is the classic mistake. LWW trades correctness for simplicity; vector clocks trade simplicity for correctness.

**Self-check rubric:**
- [ ] Did I partition with consistent hashing plus replication factor N and a preference list?
- [ ] Did I explain R + W > N and give concrete W/R defaults?
- [ ] Did I explicitly say quorum overlap is not linearizability?
- [ ] Did I pick a conflict-resolution scheme (vector clocks vs LWW) with its cost?
- [ ] Did I describe read-repair and Merkle-tree anti-entropy?
- [ ] Did I describe the LSM write path (commit log, memtable, SSTable, compaction)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the storage engine behind DynamoDB's single-digit-millisecond p99 for a shopping-cart workload at Amazon scale, where carts must never lose an item even during a network partition and traffic can spike 10x on Prime Day.

**Model answer (revealed on demand):**

Assumptions: billions of small cart items, extreme write availability required (a dropped "add to cart" is lost revenue), p99 reads and writes in the low milliseconds, and correctness can be eventually resolved as long as no accepted write is ever lost.

Availability over consistency: this is the original Dynamo motivation. Choose AP under partition. Writes are always accepted on the available replicas (W=1 or a sloppy quorum with hinted handoff), so a partition never blocks "add to cart." The cost is temporary divergence, which we resolve rather than prevent.

Conflict handling for carts: model the cart as a set and resolve concurrent writes by merging, not by LWW. Vector clocks (or a CRDT set) let two partitioned writes each add a different item and then merge into the union on read, so nothing is lost. LWW here would be a bug because it would drop one of two concurrent additions. This merge-on-read semantics is exactly why Dynamo chose vector clocks for carts.

Scale and hotspots: partition by cart id with consistent hashing and adaptive capacity so a hot partition (a viral deal) can be split or given burst capacity, avoiding the throttling that a fixed-partition scheme suffers on Prime Day. Pre-warm capacity ahead of the known spike.

Storage: LSM engine for fast sequential writes, replicated across three AZs, with async cross-region replication (global tables) for locality. Read-repair and Merkle anti-entropy heal replicas after a partition ends.

Latency: because reads can be R=1 against the nearest replica, p99 stays low; the occasional stale read is repaired and, for carts, a briefly stale read that merges to the union is acceptable. The wrong turn is choosing strong consistency and blocking writes during a partition, which trades revenue for a guarantee the cart does not actually need.

### sd-l10-object-store-s3: Design an Object Store (Amazon S3)

- **id:** `sd-l10-object-store-s3`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** object-store, erasure-coding, durability

#### Learn

An object store (S3, GCS, Azure Blob) holds arbitrary blobs keyed by name, in flat buckets, at exabyte scale, with the headline promise of 11 nines of durability. The interview tests how you achieve that durability cheaply (erasure coding), how the metadata layer scales, and the consistency and read semantics (multipart, range GET). It is a durability-engineering problem more than a throughput one.

Durability first, because it drives cost. Full replication (store 3 copies) gives durability and simple reads but costs 3x storage. Erasure coding gives the same or better durability for far less overhead. Split an object into k data shards, compute m parity shards (Reed-Solomon), and store all k + m shards on different disks, racks, or AZs. Any k of the k + m shards reconstruct the object, so you tolerate m simultaneous failures. A common scheme is 10 + 4: 40% overhead to survive any 4 losses, versus 200% overhead for 3-way replication with weaker tolerance. The tradeoff: erasure coding adds CPU (encode on write, reconstruct on degraded read) and read amplification when a shard is missing, so hot small objects sometimes still use replication and large cold objects use erasure coding.

**Interview nuance:** If you say "just keep 3 copies everywhere," name erasure coding immediately as the cost-saver and quantify it (roughly 1.4x vs 3x). Not knowing erasure coding is the tell that separates junior from senior on this problem.

The metadata service is the scaling problem people miss. The blob data is easy (write shards to storage nodes), but you need a massive index mapping bucket + key to the shard locations and object metadata (size, etag, version, ACL). At trillions of objects this index cannot be one database. Partition it: shard the key space (often by a hash of bucket + key, or by key-range for prefix listing), store it in a horizontally scalable KV store or a sharded and replicated database, and cache hot metadata. Listing a bucket with billions of keys efficiently requires a sorted, range-partitioned index so prefix scans do not touch every shard.

Consistency: S3 now offers strong read-after-write consistency for new objects and overwrites, achieved by making the metadata commit the point of truth (the write is not acknowledged until the index update is durable and visible). Historically it was eventually consistent. Versioning keeps old versions instead of overwriting, so a PUT to an existing key writes a new version and the index points at the latest.

Large objects: multipart upload lets a client split a large object into parts, upload them in parallel (and retry individual failed parts), and then issue a complete call that assembles them, which is how you upload terabytes reliably. Range GET lets a reader fetch bytes [start, end], essential for video seeking and resumable downloads; the store reads only the shards covering that range.

Background health: every shard is checksummed on write and periodically scrubbed. A scrubber detects bit rot or a failed disk, reconstructs the lost shards from the survivors, and rebalances data when nodes are added or removed, which is how durability is maintained over years, not just at write time. Lifecycle policies tier cold objects to cheaper storage (S3 to Glacier), trading retrieval latency for cost.

```
PUT obj -> split into k data shards -> compute m parity (Reed-Solomon)
        -> place k+m shards across racks/AZs -> commit metadata (bucket+key -> shard map)
GET range -> metadata lookup -> read shards covering range -> (reconstruct if shard missing)
```

Recap: hit 11 nines with erasure coding (k + m Reed-Solomon, roughly 1.4x overhead) instead of 3x replication, scale the metadata index by partitioning bucket+key across a KV store, give strong read-after-write via a durable metadata commit, support multipart upload and range GET, and maintain durability with checksums, scrubbing, and reconstruction.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design an object store offering 11-nines durability with multi-region replication and range reads.

**Think about:**
- How do replication vs erasure coding trade durability against storage cost?
- How does the metadata/index service scale?
- What is the consistency model and how do multipart/range reads work?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: trillions of objects from bytes to terabytes, 11 nines (99.999999999%) durability, high availability, flat bucket + key namespace, strong read-after-write for new writes, and cost matters at exabyte scale.

Data placement and durability: erasure code each object with Reed-Solomon, say 10 data + 4 parity shards, spread across independent failure domains (disks, racks, AZs). Any 10 of 14 shards reconstruct the object, tolerating 4 concurrent losses at 40% overhead, far cheaper than 3-way replication's 200%. Small hot objects may use replication for read simplicity; large cold objects use wider erasure codes. Multi-region durability comes from async cross-region replication of both shards and metadata for the buckets that opt in.

Metadata service: a separately scaled, sharded, strongly consistent index mapping bucket + key to the shard map plus size, etag, version, and ACL. Partition by hash of bucket + key for even load, or range-partition for efficient prefix listing, and cache hot entries. This index, not the blob store, is the scaling and consistency bottleneck.

Consistency: strong read-after-write. A PUT is acknowledged only after all shards are durable and the metadata commit is visible, so a subsequent GET always sees the new object. Versioning writes a new version rather than overwriting, and the index points at the latest.

Large objects and reads: multipart upload splits a big object into parts uploaded in parallel with per-part retry, then a complete call assembles them. Range GET reads only the shards covering the requested byte range, enabling video seek and resumable downloads.

Durability maintenance: checksum every shard on write, scrub periodically to catch bit rot, reconstruct lost shards from survivors, and rebalance on node changes. Lifecycle policies tier cold data to cheaper storage.

Tradeoffs and wrong turn: erasure coding trades CPU and degraded-read amplification for a roughly 2x storage saving over replication, which is the right call at scale. The common wrong turn is full replication everywhere, which triples cost and still gives weaker fault tolerance than a 10 + 4 code, and forgetting that the metadata index, not the blobs, is the hard scaling problem.

**Self-check rubric:**
- [ ] Did I choose erasure coding and quantify its overhead vs replication?
- [ ] Did I design a separately scaled, partitioned metadata index?
- [ ] Did I state the consistency model and how the metadata commit provides it?
- [ ] Did I cover multipart upload and range GET concretely?
- [ ] Did I include checksums, scrubbing, and shard reconstruction for long-term durability?
- [ ] Did I reject full replication everywhere as the cost mistake?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the storage backend for Dropbox, which stores deduplicated file blocks for hundreds of millions of users, must sync edits across a user's devices in seconds, and needs to keep storage cost low despite massive duplication of identical files across accounts.

**Model answer (revealed on demand):**

Assumptions: hundreds of PB of user files, heavy cross-user and cross-version duplication (the same PDF or OS image stored by millions), fast multi-device sync, and cost pressure from duplication.

Content-addressed block storage: split each file into fixed or content-defined chunks (say 4 MB blocks), hash each block (SHA-256), and store the block once under its hash. A file becomes a manifest: an ordered list of block hashes plus metadata. Because storage is keyed by content hash, two identical blocks anywhere in the system collapse to one physical copy, which is the core cost win against duplication. New writes only upload blocks whose hashes the server does not already have.

Durability and placement: store blocks in an erasure-coded object store (10 + 4 Reed-Solomon) across AZs for 11-nines durability at low overhead, exactly like S3, with cross-region replication for the metadata that drives sync.

Metadata and sync: a strongly consistent metadata service holds per-user file trees, manifests, and version history. Devices maintain a cursor and receive change notifications (long-poll or push) so an edit on one device produces a manifest delta that other devices pull in seconds, downloading only the changed blocks. Because blocks are immutable and content-addressed, sync is just "fetch the blocks you are missing."

Dedup safety: guard against hash collisions in the design conversation (SHA-256 makes them astronomically unlikely) and handle privacy (per-user encryption complicates cross-user dedup, so real systems often dedup within a trust boundary). Deletion uses reference counting or garbage collection so a block is removed only when no manifest references it.

Tradeoff: content-addressed dedup saves enormous storage but adds a metadata layer (block index, ref counts, manifests) and makes deletion a GC problem. The wrong turn is storing whole files without chunking or dedup, which multiplies cost by the duplication factor and forces a full re-upload on every small edit.

### sd-l10-message-queue: Design a Message Queue / Streaming Log (Kafka)

- **id:** `sd-l10-message-queue`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** message-queue, kafka, delivery-semantics

#### Learn

A distributed log (Kafka, Pulsar, Kinesis) is the backbone of async systems: producers append events, consumers read them at their own pace, and the log decouples the two. The interview tests the log abstraction, delivery semantics (the famous exactly-once question), and how consumers scale. This building block reappears in half the other lessons in this module, so it is worth deep understanding.

The core data structure is an append-only commit log. A topic is split into partitions, and each partition is an ordered, immutable sequence of messages identified by a monotonically increasing offset. Ordering is guaranteed only within a partition, not across the topic, which is the key constraint: if you need messages for a given user in order, you must route them all to the same partition (partition by user id). This is what lets Kafka scale, because different partitions live on different brokers and are read and written in parallel.

Durability comes from replication. Each partition has a leader and followers; the leader takes writes and followers replicate. The in-sync replicas (ISR) are those caught up to the leader. A producer's `acks` setting controls durability: `acks=1` acks after the leader writes (fast, can lose data if the leader dies before replication), `acks=all` acks only after all ISR replicas have the message (durable, higher latency). On leader failure a follower in the ISR is elected leader. Data is retained by time or size, or compacted (keep only the latest value per key) for changelog topics.

Delivery semantics are the heart of the interview. At-most-once means a message may be lost but never redelivered (fire and forget, no retries). At-least-once means every message is delivered but may be duplicated (retry on failure, ack after processing), which is the pragmatic default. Exactly-once is the hard one, and the crucial nuance is that exactly-once delivery over a network is impossible; what systems provide is exactly-once processing.

**Interview nuance:** If you claim "exactly-once delivery," expect a challenge. The correct framing: we get at-least-once delivery from the broker plus idempotent consumers (dedupe on a message id or use an idempotency key) so that reprocessing a duplicate has no effect. Kafka's "exactly-once" is at-least-once delivery combined with idempotent producers (a producer id plus sequence number so the broker drops duplicate appends) and transactional writes that tie the consume-process-produce cycle to an atomic offset commit. Say that and you have nailed the question.

Consumer scaling uses consumer groups. Each partition is assigned to exactly one consumer in a group, so parallelism is capped at the partition count. Consumers track their position with committed offsets. When a consumer joins or dies, the group rebalances partition assignments. Two subtleties: commit the offset after processing (at-least-once) not before (which would be at-most-once and lose messages on crash), and backpressure is natural because a slow consumer just lags (its offset falls behind) rather than dropping data. A poison message that keeps failing goes to a dead-letter topic after N retries so it does not block the partition.

Producers batch messages to trade latency for throughput: larger batches and compression raise throughput but add latency, so tune batch size and linger by workload.

```
producer --partition by key--> topic P0 [m0 m1 m2 ...]  (leader + ISR followers)
                               topic P1 [n0 n1 n2 ...]
consumer group G: P0 -> C1, P1 -> C2   (one partition per consumer)
   process msg -> commit offset  (at-least-once) ; dedupe by id -> exactly-once processing
```

Recap: model it as a partitioned append-only log with per-partition ordering, get durability from ISR replication and acks=all, offer at-least-once delivery plus idempotent consumers for exactly-once processing (never claim exactly-once delivery), and scale reads with consumer groups where parallelism equals partition count.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a durable, partitioned pub/sub log supporting at-least-once delivery and horizontal consumer scaling.

**Think about:**
- What gives per-partition ordering and durability?
- How do consumer groups, offsets, and rebalancing scale reads?
- How do you make processing effectively-once?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: many producers and consumers, high throughput (hundreds of thousands of messages/sec), messages must survive broker failure, ordering is required per key (per user or per entity) but not globally, and consumers process at varying speeds.

Log model: topics split into partitions, each an append-only ordered sequence addressed by offset. Producers partition by key (hash of user id) so all messages for a key land in one partition and keep order; different partitions parallelize across brokers. Ordering is per partition, which I state explicitly as the constraint.

Durability: replicate each partition with a leader and followers, track the in-sync replica set, and require acks=all so a message is acknowledged only after all ISR replicas hold it. On leader failure, elect an ISR follower. Retain by time or size, or compact for changelog topics.

Delivery: at-least-once. The consumer processes a message and only then commits its offset, so a crash mid-processing causes reprocessing, not loss. Committing before processing would be at-most-once and drop messages on crash.

Effectively-once processing: because at-least-once yields duplicates, make consumers idempotent. Attach a stable message id and dedupe on it (a seen-ids set or an upsert keyed by id), or make the side effect naturally idempotent (SET rather than INCREMENT). For the produce side, use idempotent producers (producer id plus sequence number) so broker-level retries do not create duplicate appends, and transactional writes to tie processing output and offset commit into one atomic step. This is exactly-once processing, not exactly-once delivery.

Consumer scaling: consumer groups assign each partition to one consumer, so throughput scales with partition count; add partitions and consumers together. On membership change the group rebalances. Backpressure is automatic (a slow consumer just lags), and a repeatedly failing message goes to a dead-letter topic after N retries so it does not stall the partition.

Producer tuning: batch and compress to raise throughput, accepting a little latency.

Tradeoffs and wrong turn: per-partition ordering means you cannot get global order without a single partition (which kills parallelism), so choose a partition key that matches your ordering need. The common wrong turn is claiming exactly-once delivery; the honest, correct answer is at-least-once delivery plus idempotent consumers.

**Self-check rubric:**
- [ ] Did I model a partitioned append-only log with per-partition ordering and a partition key?
- [ ] Did I get durability from ISR replication and acks=all?
- [ ] Did I commit offsets after processing and explain why?
- [ ] Did I give idempotent consumers for exactly-once processing, not claim exactly-once delivery?
- [ ] Did I scale reads with consumer groups and note parallelism equals partition count?
- [ ] Did I handle poison messages with a dead-letter topic?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the event backbone for Uber, which ingests millions of GPS and trip events per second, must keep each driver's event stream strictly ordered, feeds both a real-time dispatch system (needs the freshest event) and a nightly billing batch (needs completeness), and cannot lose a payment-relevant event.

**Model answer (revealed on demand):**

Assumptions: millions of events/sec, per-driver ordering required, two very different consumers (low-latency dispatch and exhaustive batch), and payment events must be durable with no loss.

Partitioning for ordering: partition by driver id so every event for a driver is ordered within one partition; use thousands of partitions to reach millions of events/sec, since throughput scales with partition count. Global order is neither needed nor affordable, which I call out.

Durability for money: for payment-relevant topics use acks=all with a replication factor of 3 across AZs, so no acknowledged event is lost even if a broker and its rack fail. Producers are idempotent so retries do not double-emit a fare event.

Two consumers, one log: this is why a log beats a plain queue. The dispatch service is a consumer group reading the tail with low latency, committing offsets frequently, and it tolerates reprocessing because its actions are idempotent. The billing batch is a separate consumer group that reads the same partitions from an earlier offset each night, getting completeness because retention holds several days of events. The log's replayability lets one durable stream serve both a real-time and a batch reader without duplicating ingestion.

Exactly-once for billing: billing dedupes on event id and uses transactional consume-process-produce so a fare is counted once even under at-least-once redelivery. Dispatch stays at-least-once with idempotent effects.

Late and out-of-order data: GPS events can arrive late; the stream processor uses event-time windows with a watermark so a late point still lands in the right minute rather than being dropped.

Tradeoff and wrong turn: high partition count buys throughput and per-driver order at the cost of more consumer coordination and rebalancing. The wrong turn is using a traditional queue that deletes a message once consumed, which cannot serve both the real-time and the replay-for-billing readers, or using acks=1 on payment events and losing a fare when a leader dies.

### sd-l10-job-scheduler: Design a Distributed Job Scheduler / Cron

- **id:** `sd-l10-job-scheduler`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** job-scheduler, leasing, idempotency

#### Learn

A distributed job scheduler fires jobs at their scheduled time (one-off or recurring) across a fleet of workers, and its defining challenge is firing each job exactly once even when workers crash mid-run. This is one of the hardest correctness problems in system design because "exactly once" collides with the reality that any worker can die or pause at any instant. The honest target is effectively-once through idempotency, not literal once-delivery.

Start with storage and the "due now" query. Jobs have a next-run timestamp, and the scheduler must efficiently find all jobs due in the current window without scanning everything. Index by run time: a database index on `next_run_at`, or time-bucketed storage where each bucket is a minute or second and workers poll the current bucket. A poller wakes every second, queries `WHERE next_run_at <= now AND status = 'pending'`, and dispatches those jobs. At large scale you shard jobs across many buckets or partitions so no single poller is a bottleneck.

The heart of correctness is leasing with a visibility timeout. When a worker picks up a job it does not just mark it running; it acquires a lease: it atomically sets `status = running, locked_by = worker, lease_expires_at = now + T` in a single conditional update (compare-and-set on status). Only one worker wins the CAS, so only one runs the job. If that worker crashes, its lease expires and the job becomes eligible again, so another worker retries it. Crucially the job is retried, not duplicated, because a live worker holds the lease and a dead one's lease simply expires. This is the same visibility-timeout pattern SQS uses.

**Interview nuance:** The subtle failure is a paused worker. Suppose a worker acquires the lease, then suffers a long GC pause or network partition past its lease expiry. Its lease expires, a second worker picks up the job and runs it, and then the first worker wakes up and also runs it: a double-run. A lease alone does not prevent this. The fix is a fencing token: each lease grant carries a monotonically increasing token, and any external system the job writes to (or the completion update) rejects a token lower than the highest it has seen. So the resumed old worker's write is fenced off. Bring up fencing unprompted here; it is the senior signal.

Exactly-once framing: you cannot guarantee a side effect runs exactly once across crashes, so combine at-least-once execution (retries via lease expiry) with idempotency. Give each job run an idempotency key so that if the job's action is retried, the downstream system dedupes it (an insert keyed by the idempotency key, or a check-then-act guarded by the key). Now a double-run produces a single effect.

Recurring jobs, clock skew, and missed windows: for a cron job, on completion compute the next run and reschedule, or expand the cron expression into concrete run times. Clock skew across machines means you should not rely on any single worker's clock for correctness; use the database's time or a logical ordering, and tolerate a small firing jitter. If the scheduler was down and missed a window, decide policy explicitly: catch up and run the missed occurrences, or skip to the next future one (misfire policy). Say which and why.

Scaling: shard jobs by id or by time bucket so many pollers and workers run in parallel, add priority queues so urgent jobs preempt bulk ones, and separate the scheduling tier (decides what is due) from the execution tier (runs it) so they scale independently.

```
poller: SELECT jobs WHERE next_run_at<=now AND pending
worker: CAS status pending->running, lease_expires=now+T, token=n++   (only one wins)
   crash -> lease expires -> another worker retries (token n+1)
   downstream write carries token; rejects token < max_seen (fencing)
   completion: idempotency_key dedupes the side effect
```

Recap: index jobs by run time and poll the due window, make a single worker win via a compare-and-set lease with a visibility timeout so crashes retry rather than duplicate, add fencing tokens to defeat the paused-worker double-run, achieve effectively-once with idempotency keys, and handle clock skew and missed windows with an explicit misfire policy.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a scheduler that fires each job at its scheduled time exactly once, even if worker machines crash mid-run.

**Think about:**
- How do you index and poll for due jobs efficiently?
- How do leasing and visibility timeouts make a crashed job retry, not duplicate?
- How do you handle clock skew, missed windows, and recurring jobs?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: millions of scheduled jobs, one-off and recurring, worker crashes and pauses are normal, jobs have side effects that must not run twice, and second-level firing precision is acceptable.

Storage and due query: store jobs with a `next_run_at` timestamp and a status, indexed on `next_run_at`, or time-bucketed by minute. A poller queries jobs due now (`next_run_at <= now AND status = pending`) and dispatches them. Shard jobs across buckets or partitions so many pollers run in parallel and none is a bottleneck.

Single-execution via leasing: a worker claims a job with an atomic compare-and-set that flips status pending -> running, sets `locked_by` and `lease_expires_at = now + T`, and increments a fencing token. Only one worker wins the CAS, so only one runs the job. If that worker crashes, the lease expires and another worker re-claims it: the job is retried, not duplicated.

Paused-worker defense: a worker that pauses past its lease can wake up and try to run or complete a job a second worker already took. Prevent the double effect with fencing tokens: every downstream write carries the lease's token, and the target rejects any token lower than the highest it has seen, fencing off the stale worker.

Effectively-once: because execution is at-least-once, give each run an idempotency key and have the job's side effect dedupe on it (an insert or upsert keyed by the key), so a retried or double-run job produces exactly one effect. True once-delivery is impossible across crashes; idempotency is how we get once-effect.

Clock skew and misfires: rely on the database clock or logical ordering, not a worker's local clock, and tolerate small firing jitter. Define a misfire policy for windows missed during downtime: catch up and run them, or skip to the next occurrence, chosen per job. For recurring jobs, on completion compute and persist the next run time.

Scaling: separate the scheduling tier from the execution tier, shard by job id or time bucket, and add priority lanes so urgent jobs preempt bulk work.

Tradeoffs and wrong turn: leasing plus fencing plus idempotency gives effectively-once at the cost of extra coordination and a token check on the downstream. The common wrong turn is a naive lock with no fencing, so a paused worker resumes and double-runs the job, or committing the job as done before the side effect succeeds, which loses the run on a crash.

**Self-check rubric:**
- [ ] Did I index/bucket jobs by run time and poll the due window at scale?
- [ ] Did I use an atomic CAS lease so only one worker runs a job?
- [ ] Did I explain that lease expiry causes retry, not duplication, on crash?
- [ ] Did I add fencing tokens to defeat the paused-worker double-run?
- [ ] Did I achieve once-effect with idempotency keys rather than claiming once-delivery?
- [ ] Did I define a misfire policy and handle clock skew?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the scheduling system behind Uber's or DoorDash's scheduled orders, where a customer schedules delivery for 7:00pm, the job must fire within a few seconds of its time, tens of millions of jobs may be due in the same dinner-rush minute, and a fired job kicks off a payment and a driver dispatch that must never double-fire.

**Model answer (revealed on demand):**

Assumptions: tens of millions of jobs, sharp spikes where many jobs share the same minute, few-second firing precision, and each firing triggers a payment and a dispatch that must be exactly-once in effect.

Handling the thundering minute: if millions of jobs are due at 7:00:00 a single poller cannot dispatch them in a few seconds. Shard the time index into many buckets (for example hash the job id into 1024 sub-buckets per second) and run a pool of pollers, each owning a slice, so dispatch parallelizes. Pre-load the upcoming minute into an in-memory timer wheel on each scheduler shard so firing is precise to the second rather than bounded by DB poll latency, with the database as the durable backstop for recovery.

Exactly-once effect on payment and dispatch: the firing itself is at-least-once (lease expiry retries a crashed firing), so both downstream actions must be idempotent. The payment uses an idempotency key derived from the job id so a retried firing does not double-charge. Dispatch is guarded the same way, and a fencing token on the lease stops a paused scheduler from firing a job a second scheduler already fired.

Durability and recovery: jobs persist in a replicated store; a scheduler shard that dies has its buckets reassigned and the new owner reloads pending jobs from the DB into its timer wheel, so no scheduled order is lost. Leases with visibility timeouts ensure a crashed firing is retried by another shard.

Precision vs load tradeoff: the in-memory timer wheel gives second-level precision but must be rebuilt from the durable store on failover, and sharding by job id spreads the rush but requires rebalancing when shards change. The wrong turn is a single DB-polling loop for the whole fleet (it cannot drain a 10M-job minute in seconds) or firing payment and dispatch without idempotency keys, which double-charges a customer whenever a firing is retried after a crash or pause.

### sd-l10-distributed-lock: Design a Distributed Lock / Coordination Service (ZooKeeper/etcd)

- **id:** `sd-l10-distributed-lock`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** coordination, consensus, distributed-systems, case-study

#### Learn

A coordination service (ZooKeeper, etcd, Consul) gives a cluster the primitives it cannot build safely on its own: mutual exclusion (a distributed lock), leader election, and shared configuration that stays correct across process pauses and network partitions. The interview tests whether you understand why a naive lock is unsafe and how leases, fencing tokens, watches, and consensus combine into a correct one. This is the theory that underpins the job scheduler and many other lessons.

Start with why you cannot just use a single Redis SETNX with a TTL. It looks like a lock: SET key if not exists, with an expiry so a dead holder does not deadlock forever. It is unsafe for two reasons. First, a single Redis node is a single point of failure, and Redis replication is asynchronous, so a failover can lose the lock key and grant the lock twice. Second, and more fundamental, the TTL creates a correctness hole: the holder can pause (a long GC, a scheduler preemption, a network partition) past the TTL, the lock expires, a second client acquires it, and then the first client wakes up still believing it holds the lock. Now two clients act in the critical section at once. No amount of tuning the TTL fixes this, because you cannot bound a pause.

**Interview nuance:** The two-part answer that impresses: (1) put the lock state in a consensus-backed store so it is linearizable and survives node failure, and (2) hand out a fencing token so a stale holder's writes are rejected. Miss the fencing token and you have not actually made the lock safe.

Consensus foundation: build on a store whose state is replicated by a consensus protocol (Raft in etcd and Consul, Zab in ZooKeeper). A write commits only when a majority (quorum) of nodes agree, so the lock state is linearizable and survives minority failures. Under a partition only the majority side can make progress, which is what prevents two sides from both granting the lock. This is the CP corner of CAP: during a partition the minority side becomes unavailable rather than returning possibly-wrong state.

Leases and sessions: a client holds a lock via a session with a TTL that it must renew by heartbeat. If the client dies or partitions away, it stops heartbeating, the session lease expires, and the lock is released automatically, so a dead holder never deadlocks the system. ZooKeeper models this as an ephemeral znode (it vanishes when the session ends); etcd models it as a lease attached to the key.

Fencing tokens: this is what makes leasing safe. Each lock grant includes a monotonically increasing token (etcd's key revision, ZooKeeper's zxid). Every write the lock holder makes to the protected resource carries its token, and the resource remembers the highest token it has accepted and rejects any lower one. So when a paused old holder wakes up and tries to write with an old token, the resource fences it off. The lock plus fencing is safe even though the lock alone is not.

Watches and notification: instead of polling "is the lock free yet," clients register a watch on the lock or leader key and receive a callback when it changes. This gives fast failover: the moment a leader's session ends, watchers are notified and a new leader is chosen in milliseconds.

Leader election pattern: candidates each create an ordered ephemeral key (a sequence number). The candidate with the lowest number is the leader. Each other candidate watches only its immediate predecessor, so when the leader dies exactly one candidate is notified and takes over, avoiding a herd where everyone re-checks at once.

```
acquire: create ephemeral seq key under /lock  -> get number
   lowest number holds the lock; token = key revision
   others watch predecessor (no polling)
protected resource: accept write only if token >= max_seen_token   (fencing)
partition: only majority quorum can grant -> minority is unavailable, not wrong
```

Recap: a Redis SETNX-with-TTL lock is unsafe because a single node can fail over and a paused holder can outlive its TTL; build on a consensus-backed store (etcd, ZooKeeper) for linearizable lock state, auto-release via session leases and heartbeats, defeat the stale-holder double-run with monotonic fencing tokens, notify clients with watches instead of polling, and elect leaders with ordered ephemeral keys where each watches its predecessor.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a distributed lock and coordination service (in the spirit of ZooKeeper or etcd), and explain how leases, fencing tokens, and watches keep it safe from split-brain and stale lock holders.

**Think about:**
- Why is a lock in Redis with a TTL not safe on its own, and what does a fencing token add?
- What happens when a lock holder pauses (a long GC) past its lease and then wakes up?
- How do clients get notified when a lock is released or a leader changes?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: many clients need mutual exclusion, leader election, and shared config, and they must stay correct across process pauses (GC, preemption) and network partitions. Correctness beats availability during a partition.

Foundation: put the lock state in a consensus-backed store (etcd with Raft, or ZooKeeper with Zab) rather than a single node. A write commits only on a majority quorum, so the state is linearizable and survives minority failure. Under a partition only the majority side can grant the lock; the minority side is unavailable rather than returning stale state, which is what prevents split-brain.

Leases and auto-release: a client holds the lock through a session with a TTL, renewed by heartbeat. If it dies or partitions away it stops heartbeating, the lease expires, and the lock frees automatically (an ephemeral znode disappears, or an etcd lease lapses), so there is no permanent deadlock.

Why leases alone are not safe, and the fix: a holder can pause past its lease, the lock is granted to a second client, and then the paused holder wakes up still thinking it holds the lock. Two clients now act at once. The fix is a fencing token: each grant carries a monotonically increasing token (etcd revision, ZooKeeper zxid), every write to the protected resource carries it, and the resource rejects any token below the highest it has seen. The resumed old holder is fenced off. This is why a Redis SETNX with a TTL and no fencing is the classic unsafe lock: single-node failover can double-grant, and the TTL hole double-runs.

Watches: clients watch the lock or leader key and get a callback on release or change instead of polling, enabling millisecond failover.

Leader election: candidates create ordered ephemeral keys; the lowest wins; each other candidate watches its predecessor so exactly one takes over on failure, avoiding a herd.

Tradeoffs and wrong turn: consensus adds write latency (a quorum round trip) and makes the minority side unavailable under partition, which is the correct trade for a lock. The wrong turn is a single Redis SETNX with a TTL and no fencing token, which under a failover or a GC pause lets two clients each believe they hold the lock.

**Self-check rubric:**
- [ ] Did I explain both failure modes of the Redis-TTL lock (single-node failover and the pause-past-TTL hole)?
- [ ] Did I build on a consensus-backed, linearizable store?
- [ ] Did I use session leases with heartbeats for auto-release?
- [ ] Did I add fencing tokens and describe the resource rejecting stale tokens?
- [ ] Did I use watches instead of polling for notification?
- [ ] Did I describe ordered-ephemeral-key leader election with predecessor watches?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the leader-election and coordination layer for a database like CockroachDB or a Kafka-style cluster, where exactly one node must own a partition's writes at a time, a network partition must never let two nodes both accept writes to the same range (split-brain would corrupt data), and failover must complete in a few seconds.

**Model answer (revealed on demand):**

Assumptions: a cluster of nodes, each data range must have exactly one write owner (leaseholder), split-brain would silently corrupt data and is unacceptable, and failover should be seconds, not minutes.

Per-range consensus: each data range is its own Raft (or Multi-Paxos) group with a small replica set (typically 3 or 5). Writes go only to the elected leader (leaseholder), and a write commits only after a majority of replicas persist it. Because a majority is required, two nodes on opposite sides of a partition cannot both commit writes to the same range: only the side with a quorum makes progress, so split-brain is structurally impossible, not merely unlikely.

Leases with fencing: the leaseholder holds a time-bounded lease (an epoch or term number that increases on every election). A partitioned old leader whose lease has expired cannot commit because it cannot reach a quorum, and any straggler write it attempts carries an old term that followers reject, which is fencing built into the consensus term. This is why you do not bolt on a separate lock; the consensus term is the fencing token.

Fast failover: replicas run heartbeat timers; when the leader stops heartbeating, a follower times out and starts an election for the next term, and with a majority vote it becomes leader in a couple of seconds. Pre-vote and randomized election timeouts avoid split-vote herds.

Coordination for cluster metadata: cluster-wide config and membership live in a consensus store (etcd for Kubernetes control planes, or an internal Raft group), watched by nodes so they react to membership changes immediately.

Tradeoff and wrong turn: requiring a majority quorum for every write and every election costs a round trip of latency and makes a range unavailable if it loses its quorum, which is the correct price for never corrupting data. The wrong turn is electing a leader with a simple TTL lock and no term or quorum, so a partitioned old leader keeps accepting writes on the minority side and split-brains the range, corrupting the database.

### sd-l10-code-sandbox: Design a Code Execution Sandbox / Online Judge

- **id:** `sd-l10-code-sandbox`  ·  **difficulty:** hard  ·  **est:** 40 min  ·  **skills:** sandboxing, security, isolation, case-study

#### Learn

A code execution sandbox (an online judge like LeetCode, a CI runner, or this platform's own code runner) runs untrusted user code safely at scale. The defining decision is the isolation boundary: how strong a wall you put between hostile code and your host and other users. Around that sit resource limits, a queue-and-worker architecture to absorb bursts, and result streaming. Assume the code is actively hostile (fork bombs, network exfiltration, kernel-escape attempts), because at contest scale someone will try.

The isolation boundary is the core tradeoff and the thing to lead with. From weakest and cheapest to strongest and heaviest: a plain OS process with rlimits is trivially escapable and unacceptable for hostile code. A container (Docker) is convenient and starts fast but shares the host kernel, so a kernel vulnerability is a full escape; a container alone is not a security boundary for hostile code. A hardened container (seccomp to whitelist syscalls, AppArmor or SELinux, non-root user, read-only filesystem, dropped capabilities) is a reasonable middle ground that shrinks the attack surface dramatically. gVisor puts a user-space kernel between the code and the host kernel, intercepting syscalls so a kernel bug is much harder to reach, at some performance cost. A microVM (Firecracker) or Kata Containers gives each submission its own tiny virtual machine with its own guest kernel and hardware-virtualization isolation, which is near-VM strength but boots in about 100ms, making it the strong default for untrusted code.

**Interview nuance:** The senior move is to name the spectrum and commit: "I would use Firecracker microVMs for true kernel isolation with fast startup, falling back to a hardened seccomp container if microVMs are not available in the environment." Saying "run it in a Docker container" and stopping there fails the security bar, because a container shares the host kernel.

Resource limits stop one submission from harming the host or starving others, independent of the isolation tech. Use cgroups to cap CPU shares and memory (with a hard OOM kill), a wall-clock and CPU-time timeout to kill infinite loops, a pids limit to defeat fork bombs (a fork bomb without a pids cap exhausts the process table), disk quotas to stop a submission from filling the disk, and no network by default (or a strict egress allowlist) to prevent data exfiltration and abuse. Every submission runs in a fresh, throwaway sandbox that is destroyed after the run, so no state leaks between users.

Architecture for scale: a stateless API accepts submissions and immediately enqueues them onto a durable queue (SQS, Kafka), returning a job id. A pool of sandboxed workers pulls jobs, executes each in a fresh sandbox, and reports results. The queue decouples submission rate from execution capacity, so a contest spike buffers instead of overwhelming the fleet, and workers autoscale on queue depth. Because microVM cold start still costs latency, keep a warm pool of pre-booted sandboxes ready to accept a job, then destroy each after use.

Result streaming: users want to see output as it runs, so stream stdout, stderr, and per-test progress back over SSE or WebSocket, store the final verdict durably, and cap output size so a submission that prints forever cannot exhaust memory or the client. Fairness and abuse control: per-user rate limits and concurrency quotas so one user cannot monopolize the pool, monitoring for abuse patterns, and treat the sandbox host itself as potentially compromised by running the whole fleet in an isolated network segment with no access to production.

```
POST /submit -> API (stateless) -> durable queue (SQS/Kafka) -> job id
warm pool of microVMs -> worker pulls job -> fresh Firecracker VM
   cgroups (cpu/mem), timeout, pids limit, no network, disk quota
   stream stdout/stderr/test-progress (SSE) -> store verdict -> destroy VM
```

Recap: pick the isolation boundary deliberately (microVM/Firecracker as the strong default, hardened seccomp container as the middle ground, never a bare container for hostile code), bound every resource with cgroups plus timeouts plus a pids limit plus no network, run each submission in a fresh throwaway sandbox behind a queue and autoscaling worker pool with a warm pool for latency, and stream results while enforcing per-user fairness.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a code execution sandbox / online judge that runs untrusted user submissions safely at scale, and justify your isolation boundary, resource limits, queueing, and result streaming.

**Think about:**
- What isolation boundary is strong enough to run hostile code, and what are the tradeoffs of each option?
- How do you bound CPU, memory, time, disk, and network so one submission cannot harm the host or others?
- How do you absorb bursty submissions and stream results back to the user?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: users submit arbitrary code in many languages, some actively hostile (fork bombs, exfiltration, escape attempts), at spiky volume around contests, and we must protect the host and other users while giving fast feedback.

Isolation boundary (the core decision): run each submission in a Firecracker microVM. It gives each run its own guest kernel and hardware-virtualization isolation, so a kernel exploit does not reach the host, yet it boots in about 100ms. A hardened container (seccomp syscall whitelist, AppArmor, non-root, read-only FS, dropped capabilities) is the fallback where microVMs are unavailable. I explicitly reject a plain container as the security boundary because it shares the host kernel; gVisor is a middle option that intercepts syscalls in user space at some perf cost.

Resource limits: cgroups cap CPU and memory with a hard OOM kill; a wall-clock plus CPU-time timeout kills infinite loops; a pids limit defeats fork bombs; disk quotas stop disk-fill; and networking is off by default or a strict egress allowlist to prevent exfiltration. Each submission runs in a fresh sandbox destroyed after the run, so nothing leaks between users.

Architecture: a stateless API enqueues each submission onto a durable queue (SQS or Kafka) and returns a job id. A pool of sandboxed workers pulls jobs, runs each in a fresh microVM, and reports results. The queue absorbs contest bursts and lets workers autoscale on queue depth. A warm pool of pre-booted microVMs hides cold-start latency.

Result streaming: stream stdout, stderr, and per-test progress over SSE or WebSocket, store the final verdict durably, and cap output size so a runaway print cannot exhaust memory.

Fairness and blast radius: per-user rate limits and concurrency quotas so one user cannot starve the pool, abuse monitoring, and the entire execution fleet lives in an isolated network segment with no path to production, treating each sandbox host as potentially compromised.

Tradeoffs and wrong turn: microVMs cost a little more startup time and memory than containers, which the warm pool and their far stronger isolation justify. The classic wrong turn is running submissions in a shared container as root with network access and only a language-level timeout, which is trivially escapable and lets one job exfiltrate data or take down the host.

**Self-check rubric:**
- [ ] Did I name the isolation spectrum and commit to microVM (or hardened container) with reasons?
- [ ] Did I explicitly reject a plain container as a security boundary for hostile code?
- [ ] Did I bound CPU, memory, time, pids (fork bomb), disk, and network?
- [ ] Did I run each submission in a fresh, destroyed-after sandbox?
- [ ] Did I use a durable queue plus autoscaling workers plus a warm pool?
- [ ] Did I stream results and enforce per-user fairness and network isolation of the fleet?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the execution backend for a browser-based coding platform like Replit or CodeSandbox, where each user gets a long-lived interactive dev environment (not a one-shot judge), can install arbitrary packages and run a web server, thousands of environments run concurrently, and cost per idle environment must stay near zero.

**Model answer (revealed on demand):**

Assumptions: long-lived interactive sessions (not one-shot runs), users install packages and run servers, thousands concurrent, most idle at any moment, and idle cost must be minimal.

Isolation for long-lived untrusted workloads: give each workspace its own microVM (Firecracker) or a strongly isolated container (gVisor or Kata), because the code is untrusted and long-running, so kernel-sharing risk compounds over time. Each environment gets its own filesystem and network namespace with an egress policy, so one user's server cannot reach another's or production.

Idle cost, the defining constraint: since most environments are idle, do not keep a VM running per user. Snapshot idle environments to disk (Firecracker snapshotting, or pause-and-persist the container filesystem and memory) and free the compute. On the next request, resume from snapshot in a few hundred milliseconds. This is the key move: pay for compute only while a user is active, and pay only cheap storage while idle, which keeps idle cost near zero across thousands of environments.

Persistence: the user's files live on a network volume or content-addressed store that outlives the compute, so resuming attaches the same filesystem. Installed packages persist in that volume.

Networking and web servers: give each running environment a subdomain routed through a proxy (Envoy) that maps hostname to the live VM, spinning the VM up from snapshot on the first inbound request if it was paused, so preview URLs work without keeping every server warm.

Scale and scheduling: a scheduler bin-packs active VMs onto host machines, autoscales the host fleet on active count (not total count), and reclaims hosts as environments idle out.

Tradeoff and wrong turn: snapshot-resume adds a few hundred ms of wake latency and snapshot storage cost, which is far cheaper than running thousands of idle VMs. The wrong turn is a warm VM per user (cost scales with total users, not active users, and bankrupts you at idle) or a shared container per user with no per-workspace network isolation, which lets one long-lived hostile environment attack its neighbors or the host.

### sd-l10-webhook-delivery: Design a Reliable Webhook Delivery System

- **id:** `sd-l10-webhook-delivery`  ·  **difficulty:** medium  ·  **est:** 40 min  ·  **skills:** messaging, reliability, api-design, case-study

#### Learn

A webhook delivery system notifies customer-controlled endpoints when events happen (Stripe firing `payment.succeeded` to your server). The hard part is that the receivers are outside your control: they are slow, flaky, sometimes down for hours, and occasionally malicious. The interview tests your delivery guarantee, retry and backoff strategy, payload signing, idempotency and ordering, dead-letter handling, and per-tenant fairness so one bad customer cannot hurt the rest.

Delivery guarantee: offer at-least-once. Persist every event first, enqueue a delivery task, and mark it delivered only when the endpoint returns a 2xx. If you crash after sending but before recording success, you redeliver, so duplicates are possible. This is the honest, standard guarantee; exactly-once delivery to an arbitrary external endpoint is not achievable, so you push idempotency to the consumer.

Idempotency for consumers: include a stable, unique event id in every payload (and an idempotency header) and document that delivery is at-least-once, so consumers dedupe on the id (ignore an event id they have already processed). This is the contract that makes at-least-once safe on the receiver's side, and Stripe, GitHub, and Shopify all do exactly this.

**Interview nuance:** The single most important architectural point: never deliver inline and synchronously from the event producer. If your checkout service calls the customer's webhook URL directly in the request path, a slow or hung customer endpoint backs up your producer and can stall the whole pipeline. Always persist the event and hand delivery to a separate, queue-driven delivery service.

Retries with backoff: on a failure (non-2xx, timeout, connection error) retry with exponential backoff plus jitter over a long window: seconds, then minutes, then hours, up to a day or more, with a capped attempt count. Backoff lets a down endpoint recover without a thundering herd, and jitter prevents all retries for a mass event from firing in lockstep. Use a per-attempt timeout (a few seconds) so a hung endpoint does not tie up a worker.

Signing: sign each payload so the consumer can verify it really came from you and was not tampered with. Compute an HMAC-SHA256 over the raw body plus a timestamp using a per-customer secret, and send it in a header. The consumer recomputes and compares. Include the timestamp and reject old ones to prevent replay attacks, and support secret rotation with an overlap window (accept either the old or new secret for a period) so rotation does not drop events.

Ordering: default to no strict global order because it is simpler and lets you deliver in parallel. When a tenant genuinely needs per-resource order (all events for one subscription in sequence), key delivery by resource id and deliver sequentially per key, holding back the next event for a key until the prior one is acknowledged. This costs throughput for that key, so make it opt-in.

Dead-letter and fairness: after the max attempts, move the event to a dead-letter store, alert, and expose a manual replay or redrive API so support can re-send once the endpoint is fixed. Fairness is critical because endpoints vary wildly: isolate delivery per tenant with per-tenant queues (or a fair scheduler), per-tenant concurrency limits and rate limits, per-endpoint timeouts, and circuit breakers that stop hammering an endpoint that has been failing, so one slow or dead customer cannot consume all workers and starve everyone else.

```
event -> persist -> enqueue delivery task (per-tenant)
worker: POST endpoint (HMAC-signed, timeout) 
   2xx -> mark delivered ; non-2xx/timeout -> backoff+jitter retry (cap N)
   exhausted -> dead-letter + alert + manual redrive
circuit breaker + per-tenant concurrency -> one bad tenant cannot starve others
```

Recap: guarantee at-least-once (persist, enqueue, ack on 2xx) with a stable event id so consumers dedupe, deliver from a separate queue-driven service (never inline), retry with exponential backoff plus jitter over a long window, sign payloads with HMAC-SHA256 plus timestamp and rotate secrets, make ordering opt-in per resource key, and protect everyone with dead-letters plus per-tenant isolation and circuit breakers.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a reliable webhook delivery system that notifies customer endpoints of events, and justify your delivery guarantee, retry and backoff, signing, idempotency, ordering, and dead-letter handling.

**Think about:**
- What delivery guarantee do you offer, and what does that require of the consumer?
- How do you retry a flaky or slow customer endpoint without amplifying load or blocking others?
- How do consumers verify authenticity and safely handle duplicates and out-of-order events?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: we emit events (payment.succeeded and similar) to many customer-controlled HTTPS endpoints of widely varying reliability and speed, some down for hours, and we must not lose events or let one bad endpoint hurt others.

Delivery guarantee: at-least-once. Persist every event durably, enqueue a delivery task, and mark it delivered only on a 2xx. A crash between send and record causes redelivery, so duplicates are possible, which I make explicit. Exactly-once delivery to an external endpoint is not achievable, so I move idempotency to the consumer.

Consumer idempotency: every payload carries a stable, unique event id (and an idempotency header). I document that delivery is at-least-once and instruct consumers to dedupe on the event id, which makes duplicates harmless.

Architecture: delivery runs in a separate, queue-driven service, never inline from the event producer, so a slow customer endpoint cannot back up our core pipeline. Producers just persist and enqueue.

Retries and backoff: on a non-2xx, timeout, or connection error, retry with exponential backoff plus jitter over a long window (seconds to minutes to hours, up to a day) with a capped attempt count, and a short per-attempt timeout so a hung endpoint does not tie up a worker. Backoff lets a down endpoint recover; jitter avoids a thundering herd for mass events.

Signing: HMAC-SHA256 over the raw body plus a timestamp with a per-customer secret, sent in a header; the consumer recomputes to verify authenticity and rejects stale timestamps to block replay. Support secret rotation with an overlap window so rotation drops nothing.

Ordering: default to no global order for parallelism; where a tenant needs per-resource order, key delivery by resource id and deliver sequentially per key, accepting lower throughput for that key, as an opt-in.

Dead-letter and fairness: after max attempts, move the event to a dead-letter store, alert, and expose a manual replay/redrive API. Isolate per tenant with per-tenant queues, concurrency and rate limits, per-endpoint timeouts, and circuit breakers so one slow or dead tenant cannot starve the fleet.

Tradeoffs and wrong turn: at-least-once plus consumer idempotency is simpler and more robust than chasing exactly-once. The common wrong turn is delivering synchronously from the producer with a couple of quick retries, so a single slow customer endpoint stalls the whole event pipeline.

**Self-check rubric:**
- [ ] Did I offer at-least-once and require a stable event id for consumer dedupe?
- [ ] Did I deliver from a separate queue-driven service, never inline from the producer?
- [ ] Did I use exponential backoff plus jitter over a long window with a per-attempt timeout?
- [ ] Did I sign payloads (HMAC plus timestamp) and support secret rotation and replay protection?
- [ ] Did I make ordering opt-in per resource key?
- [ ] Did I add dead-letters plus per-tenant isolation and circuit breakers for fairness?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design Stripe's webhook delivery at scale, where a single Black Friday can generate tens of thousands of events per second, a large merchant's endpoint may go down for two hours mid-event, and merchants across the world each need their events delivered fairly and in a verifiable, replayable way.

**Model answer (revealed on demand):**

Assumptions: tens of thousands of events/sec at peak, hundreds of thousands of merchant endpoints of varying reliability, a merchant may be down for hours, and delivery must be fair, verifiable, and replayable.

Ingest and persist: write every event to a durable, replicated store first (the event is the source of truth), then enqueue a delivery task. This decouples the spike from delivery: a burst buffers in the queue rather than overwhelming delivery workers, which autoscale on queue depth.

Per-tenant fairness at scale: partition delivery so no single merchant can monopolize the fleet. Use per-tenant queues or a fair scheduler with per-tenant concurrency caps, so a two-hour outage at one large merchant parks that merchant's events in its own lane (retrying with long backoff) without consuming the workers serving everyone else. A circuit breaker detects the sustained failure and backs off aggressively, probing occasionally, so we stop hammering the dead endpoint and free capacity.

Long outage handling: retries continue with exponential backoff and jitter over a day-plus window, so when the merchant recovers after two hours their queued events drain in order of arrival. Because we persisted every event, nothing is lost during the outage. After the attempt cap, events dead-letter and the merchant can redrive them from a dashboard.

Verification and replay: each payload is HMAC-SHA256 signed with the merchant's secret plus a timestamp, so merchants verify authenticity and reject replays, and secrets rotate with an overlap window. A replay API and an event log let merchants re-fetch or re-receive any past event, which is essential for reconciliation after an outage.

Global fairness: run regional delivery pools close to merchants for latency, all fed from the durable event store.

Tradeoff and wrong turn: per-tenant isolation and long-window retries cost more queues and state but are the only way one merchant's outage does not degrade everyone. The wrong turn is a single global queue with shared workers, where one large merchant's two-hour outage fills the workers with its retrying deliveries and delays every other merchant's Black Friday events.
