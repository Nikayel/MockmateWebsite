> Module **sd-l3-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l3-m2](./sd-l3-m2.md) · Next: [sd-l3-m4](./sd-l3-m4.md)

# L3 · Caching at Scale

After this module you can put a cache in front of a database and defend every part of it: pick the right write policy and invalidation story for a read-heavy workload, stop a single popular key from taking the origin to 100% CPU when it expires, and design a shared cache tier that survives node failures at a million operations per second. These are the moves that separate "add a Redis" from a cache you can actually run in production.

### sd-l3-caching-patterns: Caching Patterns & Write Policies

- **id:** `sd-l3-caching-patterns`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** caching, write-policies

#### Learn

A cache is a bet that the same data will be read many times before it changes. Getting the bet right means choosing how reads populate the cache, how writes keep it honest, and how stale entries leave. Get it wrong and you serve wrong data or you overload the database you were trying to protect.

Start with the read path. **Cache-aside (lazy loading)** is the default in almost every real system. The application checks the cache; on a hit it returns; on a miss it loads from the database, writes the value back into the cache, and returns it. The cache is a side store the app manages explicitly. The upside is that only requested data is ever cached (no wasted memory), and a cache outage degrades to slower DB reads rather than an outage. The downside is that every cold key pays one miss, and your app code owns the population logic. **Read-through** hides that logic behind the cache client (the cache library loads from the DB on a miss), which is cleaner but couples you to a client that understands your data source.

Now the write path, where the real tradeoffs live.

- **Write-through:** every write goes to the cache and the database synchronously before the write returns. The cache is always consistent with the DB, but every write pays two hops of latency, and you cache data that may never be read again.
- **Write-back (write-behind):** the write updates the cache and returns immediately, and the cache flushes to the DB asynchronously in batches. This gives the lowest write latency and absorbs write bursts, but you now own a durability risk: if the cache node dies before the flush, those writes are gone. Use it only where some loss is tolerable (view counts, metrics) or where the cache itself is durable.
- **Write-around:** writes go straight to the DB and skip the cache, so the cache fills only on the next read. This avoids polluting the cache with write-once data, at the cost of a guaranteed miss on freshly written keys.

The most common pattern in practice is **cache-aside for reads plus invalidate-on-write**: on a write, update the DB and then delete (not update) the cache key, so the next read re-populates from the source of truth. Deleting rather than updating avoids a subtle race where two concurrent writers leave a stale value behind.

Expiry and sizing are the other half. Every entry gets a **TTL**, and you add **jitter** (say TTL of 300s plus or minus a random 30s) so a cohort of keys written together does not all expire at the same instant. Eviction policy (**LRU** for recency, **LFU** for frequency) decides what leaves when memory fills. The number you optimize is the **cache hit ratio**: at 95% hits your DB sees 5% of read traffic, so a jump from 95% to 90% doubles DB load. Size the cache so the **hot working set** (the data actually re-read within a TTL window) fits in memory; caching the long cold tail buys nothing. **Negative caching** (caching "this key does not exist" for a short TTL) stops repeated misses from hammering the DB for absent keys, which is a classic defense against lookup-based abuse.

**Interview nuance:** saying "add a cache" with no invalidation story is the fastest way to lose a senior interviewer. Always pair a write policy with how and when entries become stale, and name your consistency window: with a 60s TTL and no invalidation you are promising up-to-60s-stale reads, which is fine for a product page and unacceptable for an account balance.

```
READ (cache-aside)                WRITE (invalidate-on-write)
  app -> cache?                     app -> DB (source of truth)
   hit  -> return                   then -> DELETE cache key
   miss -> DB -> set cache          next read re-populates
```

Recap: default to cache-aside reads plus invalidate-on-write, pick a write policy by its durability and latency tradeoff, and always attach a TTL-with-jitter and a stated consistency window so the cache is defensible, not just present.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the caching layer for a read-heavy product page (95% reads) backed by a database that can serve only 10% of peak read traffic.

**Think about:**
- Which write policy fits, and what is its durability tradeoff?
- How do you size the working set so the hot data fits in memory?
- How do you keep cache and source of truth in sync?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an e-commerce product page rendering title, price, description, images, and inventory, at say 100K read QPS peak, with the DB able to serve only 10K QPS. Product data changes rarely (edits, price changes) except inventory, which changes often. So I must serve at least 90% of reads from cache to survive peak, and my consistency requirement differs by field.

Design: **Redis as a cache-aside layer** in front of the product database. On a read, the app fetches `product:{id}` from Redis; on a hit it returns; on a miss it loads the row from the DB, sets the key with a TTL, and returns. This alone, at a healthy hit ratio, cuts DB read traffic to the miss rate. To hit the required 90%-plus offload I need the hot working set in memory: the top products by traffic follow a heavy Pareto distribution, so caching the top few percent of SKUs covers the large majority of reads. I would size Redis to hold that hot set with headroom (a few tens of GB), set **LRU eviction** under `maxmemory`, and confirm the hit ratio empirically rather than guessing.

Write policy: **cache-aside plus invalidate-on-write** for the mostly-static product fields. When an admin edits a product, the app writes the DB and then **deletes** `product:{id}`, so the next read re-populates fresh. TTL is a backstop (say 10 minutes with jitter) in case an invalidation is missed. For **inventory**, which changes constantly and is read constantly, I split it into a separate key `inventory:{id}` with a very short TTL (a few seconds) or a write-through update, accepting a few seconds of staleness on the displayed count rather than trying to keep it perfectly live. The durability tradeoff is deliberate: I do not use write-back anywhere, because the DB remains the source of truth and I never want to risk losing a committed product edit in a cache flush.

Sync and safety: TTL jitter prevents synchronized expiry of a product cohort, and negative caching of missing product IDs stops 404-scanning traffic from reaching the DB. If Redis fails entirely, reads fall through to the DB, which can only take 10%, so I would add a request-coalescing / stampede guard (the next lesson) and consider a small in-process L1 cache on the app servers to survive a cache-tier blip.

**Common wrong turn:** choosing write-through for everything "to stay consistent," which doubles every write's latency and caches write-once data, or naming Redis with no invalidation and no working-set sizing, so the hit ratio is unknown and the DB still melts at peak.

**Self-check rubric:**
- [ ] I picked cache-aside plus invalidate-on-write and justified deleting (not updating) the key on write.
- [ ] I sized the hot working set using the traffic distribution and set an eviction policy under a memory cap.
- [ ] I tied the required hit ratio (90%+) back to the DB's 10% capacity, with numbers.
- [ ] I handled fast-changing fields (inventory) differently from static fields, with a stated staleness window.
- [ ] I added TTL jitter and said what happens when the cache tier fails.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the caching strategy for Amazon's product detail page during a Prime Day spike where a small set of doorbuster SKUs draws 500K reads/sec while their price and inventory change every few seconds. Explain how you keep the displayed price correct while surviving the read volume, and lead with the concrete cache topology.

**Model answer (revealed on demand):**

Topology: a **two-tier cache**, an in-process L1 near cache on each app server plus a shared Redis L2, in front of the product/pricing services. The doorbuster SKUs are a tiny hot set, so an L1 with a 1-to-2-second TTL on each app node absorbs the bulk of the 500K reads/sec without ever crossing the network, which is essential because no single Redis shard wants half a million ops/sec for one key.

The hard part is that price and inventory change every few seconds, so I cannot serve a 10-minute cached page. I split the page into fragments by volatility. **Static fragments** (title, description, images) are cached long with invalidate-on-write. The **price** is the sensitive field: I give it a very short L1 TTL (1 second) so the worst-case staleness is one second, which is legally and commercially acceptable for display, and I make the checkout path re-validate the price against the pricing service at add-to-cart and at order time, so the authoritative price is always confirmed before money moves. The cached price is a display optimization, never the source of truth. **Inventory** gets the same 1-second treatment plus a "low stock" signal that fails safe (show "limited availability" rather than a precise count that flickers).

To survive the spike without stampeding on each 1-second expiry, I add **request coalescing** at both tiers so only one refresh per key per node hits the origin, and I stagger the L1 TTLs with jitter across nodes. Pricing changes are pushed as invalidations (or a versioned price key) so a price cut propagates within a second or two rather than waiting on TTL alone.

The committed tradeoff: I accept up to about one second of price/inventory display staleness in exchange for serving 500K reads/sec from L1, and I move all correctness-critical price checks to the write/checkout path where a re-validation against the source of truth is cheap because it is far lower volume than page reads. The wrong turn is trying to keep the displayed price perfectly live by reading the pricing service on every page view, which would collapse under the read volume for no real benefit, since the binding price is the one confirmed at checkout.

### sd-l3-cache-stampede-hotkey: Cache Stampede, Thundering Herd & Hot Keys

- **id:** `sd-l3-cache-stampede-hotkey`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** cache-stampede, hot-key, singleflight

#### Learn

A cache works right up until a popular key expires. In the instant that entry disappears, every concurrent request for it misses at once, and each one independently tries to rebuild it by querying the database. This is the **cache stampede** (also called thundering herd or dog-piling), and it is one of the most common ways a healthy system takes itself down: the cache was hiding, say, 10K req/s worth of a 300ms query, and now all 10K of those requests hit the origin in the same window, so the DB suddenly has roughly 3,000 concurrent copies of a slow query and its CPU goes to 100%. Worse, because the DB is now slow, each rebuild takes longer, so more requests pile up before the first one finishes, and the cache never gets re-populated. The system spirals.

Three families of defense exist, and a good design layers them rather than betting on one.

**Request coalescing (singleflight).** The core idea: when a key is missing, only the first requester rebuilds it, and every other concurrent requester for the same key waits for that single in-flight rebuild and shares its result. Go's `singleflight` package is the canonical implementation, but the pattern is universal. Concretely, a per-key mutex or lock serializes recomputation: the first thread acquires the lock and rebuilds, the rest block briefly and then read the freshly populated cache. This turns 3,000 concurrent DB queries into exactly one. If the lock is process-local you protect one app node; to protect the DB from a whole fleet you use a **distributed lock** (a short-lived Redis `SET NX` key) so exactly one node across the fleet rebuilds.

**Beating the synchronized expiry.** Even with coalescing, a hard TTL means the key vanishes at a single instant. Two techniques smooth this out. **TTL jitter** spreads the expiry of a cohort of related keys over a window so they do not all expire together. **Probabilistic early recomputation** (the XFetch algorithm) refreshes a key slightly before its TTL, with a probability that rises as expiry approaches, so a single lucky reader rebuilds the value in the background while the still-valid cached value keeps serving everyone else. The key never actually expires under load, because it is refreshed ahead of time. A simpler cousin is **stale-while-revalidate**: serve the stale value immediately and kick off one async refresh.

**The genuinely hot key.** Sometimes the problem is not expiry but sheer volume: one key (a viral tweet, a celebrity profile, a flash-sale SKU) is read so often that even a single Redis shard cannot serve it, because all requests for one key hash to one shard. Coalescing does not help here since the value is present; the shard is simply saturated. The fixes are **key replication** (write the value under N suffixed keys `hotkey:0..N` spread across shards and have clients read a random one) and a **client-side near cache (L1)** on each app server so most reads never reach Redis at all. Hot-key detection (tracking per-key request rates) tells you which keys need this treatment.

**Interview nuance:** the subtlety interviewers push on is what happens right after a cache flush or cold start. A cold cache is a stampede on every key at once, so "just flush and warm up" is dangerous at scale. You **warm** the cache before taking traffic, or ramp traffic gradually, or keep coalescing on so the cold start does not translate into millions of origin queries. Treating a flush as free is the classic mistake.

```
NAIVE (stampede)                 COALESCED (singleflight)
 key expires                      key expires
  req1 -> DB \                     req1 -> lock -> DB -> set cache
  req2 -> DB  }  N queries         req2..N -> wait -> read cache
  reqN -> DB /  DB at 100%         => exactly 1 DB query
```

Recap: stop expiry stampedes with request coalescing (singleflight) plus jittered TTLs and probabilistic early refresh, and handle a genuinely hot key with replication across shards or an L1 near cache, layering the defenses and never treating a cold cache as safe.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design so that when a key served at 10k req/s backed by a 300ms query is about to expire, its expiry does not leak thousands of concurrent queries to the DB.

**Think about:**
- How does request coalescing (singleflight) protect the DB?
- How do jittered TTLs and early recompute prevent synchronized expiry?
- How do you handle a genuinely hot key?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: one key at 10K req/s, rebuild cost 300ms per query. Without protection, at the expiry instant roughly 10,000 req/s times 0.3s equals about 3,000 concurrent rebuild queries hit the DB in the first window, and because the DB slows under that load, the pile-up grows before the first rebuild completes. My goal is to guarantee that at most one rebuild runs per expiry, and ideally that the key never hard-expires under load.

Primary defense: **request coalescing with a per-key lock.** On a miss, a requester tries to acquire a short-lived distributed lock (`SET lock:{key} nonce NX PX 2000` in Redis). The winner runs the 300ms query and repopulates the cache; all other concurrent requesters, on seeing the lock held, either wait a few milliseconds and re-read the cache or serve the last stale value. This collapses 3,000 concurrent queries into exactly one across the entire fleet. I use a fleet-wide (distributed) lock rather than a process-local mutex specifically because I have many app servers and I am protecting the shared DB, not one node.

Preventing the hard expiry in the first place: I add **probabilistic early recomputation.** Store the value with its computed cost and TTL, and on each read compute a small probability of proactively refreshing that rises as expiry nears (XFetch). One unlucky-in-a-good-way reader rebuilds in the background while the still-valid value serves everyone else, so the key is refreshed before it ever disappears. I also add **TTL jitter** so this key and its cohort do not synchronize their expiry with other popular keys.

Since 10K req/s on a single key is also a hot-key concern, I add an **L1 near cache** on each app server with a 1-second TTL, so the vast majority of the 10K req/s is served in-process and only a trickle reaches Redis and the DB. If the load were far higher on one shard I would additionally replicate the key across shards.

Layering: coalescing bounds the blast radius to one query, early recompute removes the expiry cliff, and the L1 cache removes the volume. On a cold start or after a flush I keep coalescing on and warm the key first, so the cold cache does not become a stampede.

**Common wrong turn:** relying on a single TTL with no coalescing, so expiry deterministically stampedes the origin; or using only a process-local mutex, which still lets one query per app server through, so a 100-node fleet still fires 100 concurrent queries at the DB.

**Self-check rubric:**
- [ ] I quantified the stampede (about 3,000 concurrent queries) from the QPS and rebuild time.
- [ ] I used request coalescing and specified a **distributed** lock to protect the shared DB across the fleet.
- [ ] I added probabilistic early recompute or stale-while-revalidate so the key does not hard-expire under load.
- [ ] I added TTL jitter and treated the 10K/s as a hot-key case (L1 near cache or replication).
- [ ] I said what happens on a cold start / flush (warm first, keep coalescing on).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design so that neither the frequent updates nor the read volume overloads the cache tier or the scoring backend during a World Cup final, where one match's live-score key on a sports platform is read at 2M req/s and its value changes every few seconds when a goal is scored, and lead with the concrete mechanism.

**Model answer (revealed on demand):**

Mechanism: a **push-updated, replicated hot key served from an L1 near cache**, because this is a hot-key problem, not an expiry problem. The value changes on real events (goals), not on TTL, so I do not want readers rebuilding it at all; I want the scoring backend to push the new score into the cache and readers to only ever read.

Read path: an **L1 near cache on every app server** holds the current score with a sub-second TTL. At 2M req/s across, say, hundreds of app nodes, each node serves its share locally and only refreshes from L2 a few times per second, so Redis sees thousands of ops/sec instead of millions. Because a single Redis shard still cannot take the aggregate refresh load for one key, I **replicate the key across N shards** (`score:match123:0..N`) and have each app node read a random replica, spreading the L2 refresh traffic. Optionally I push updates to app nodes over a pub/sub fan-out or SSE so the L1 is updated rather than polled.

Write path: when a goal is scored the scoring backend writes the authoritative score once to the DB and then **publishes the new value to all cache replicas** (write-through to the N replicated keys) and to the pub/sub channel. This is a low-frequency event (a handful of updates per match), so the write cost is trivial; the entire design is about absorbing reads, not writes. There is no rebuild-on-miss path in the hot loop, so there is no stampede to coalesce; the only miss is a cold node start, which I guard with singleflight so a restarting node does not fan out to the backend.

Tradeoff: I accept up to about one second of score staleness at the edge (the L1 TTL / push latency), which is imperceptible for a live-score display, in exchange for cutting 2M req/s down to a few thousand backend-facing ops/sec. The wrong turn is caching the score with a short TTL and letting readers rebuild on expiry, which turns every goal into a 2M-request stampede against the scoring backend; pushing updates plus L1 plus key replication avoids the rebuild entirely.

### sd-l3-distributed-cache-arch: Distributed Cache Architecture

- **id:** `sd-l3-distributed-cache-arch`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** distributed-cache, redis, ha

#### Learn

Once one cache node is not enough, the cache tier becomes its own distributed system, and it has to shard, replicate, and survive failures without becoming a new single point of failure or a new source of stale data. The starting decision is the engine.

**Redis vs Memcached.** Memcached is a lean, **multithreaded**, in-memory key-value store with LRU eviction and almost nothing else; it scales vertically across cores well and is ideal when you want a simple, fast, sharded blob cache. Redis is **single-threaded per instance** (for command execution) but gives you rich data structures (hashes, sorted sets, streams), optional **persistence** (RDB snapshots, AOF log), **replication**, pub/sub, Lua scripting, and clustering. In interviews the crisp answer is: pick Memcached when you want a pure, multi-core, evict-freely cache of opaque values; pick Redis when you need data structures, replication, persistence, or atomic operations (counters, rate limiters, leaderboards). Most systems reach for Redis because those extras are worth more than Memcached's threading model, and you scale Redis horizontally by running many shards.

**Sharding.** You cannot hold everything on one node, so you partition the keyspace. Redis Cluster divides the keyspace into **16,384 hash slots**; each key hashes (CRC16 mod 16384) to a slot, and slots are assigned to shards, so adding a shard means moving some slots rather than rehashing everything. The important property is **consistent hashing**-style behavior: adding or removing a node moves only a fraction of keys, not the whole map, which avoids a mass-miss event on every topology change. Client-side sharding (a smart client that hashes keys to nodes) is the Memcached equivalent.

**Replication and HA.** Each shard is a primary with one or more **replicas**. Replication is **asynchronous**, so a replica can lag the primary by a few milliseconds, which means a failover can lose the last few writes: acceptable for a cache, not for a system of record. **Redis Sentinel** (or Cluster's built-in failover) monitors primaries and promotes a replica when one dies, so a node failure is a brief blip, not an outage. The design principle that makes this safe is that the **cache is disposable**: the source of truth is the database, so losing a cache node loses only performance, never data, as long as the application falls through to the DB on a miss.

**Tiering.** A remote cache is a network hop (tenths of a millisecond plus round trips), which is too slow for the very hottest keys at high QPS. So you add an **L1 near cache** in the app process (a local LRU) in front of the **L2 remote cache** (Redis). L1 kills the hottest reads and shields individual Redis shards from hot keys; L2 is the shared, larger, authoritative cache. The cost of L1 is a second consistency layer: an invalidation now has to reach every app node's L1 (via pub/sub or a short L1 TTL), or you accept a small staleness window locally.

**Consistency and operational hazards.** Keep L2 in sync with the DB via **invalidate-on-write**, **versioned keys** (`user:123:v7`, so a stale value is simply never read), or a **short TTL backstop**. Under memory pressure, `maxmemory` plus an eviction policy (`allkeys-lru`) decides what leaves, and a wrong policy (like `noeviction`) turns a full cache into write errors. Two scale-specific hazards: a **big key** (a huge value or a collection with millions of elements) blocks Redis's single thread when accessed or deleted and creates unbalanced shards, so you split it; and a **hot key** saturates one shard, handled with L1 and key replication as in the previous lesson.

**Interview nuance:** the flush trap. A **cold cache is not safe to bring online under load**, because every read misses and the full read volume hits the origin at once, exactly the stampede from the last lesson but across the whole keyspace. So a cache restart, region failover, or `FLUSHALL` must be paired with cache warming or gradual traffic ramp, and coalescing must stay on. Treating a flush as a free operation is the wrong turn interviewers listen for.

```
app server                    app server
 [L1 near cache]               [L1 near cache]
       \                          /
        \----- L2: Redis Cluster ----/
        slot 0..5460   5461..10922  10923..16383
        shardA(P+R)    shardB(P+R)   shardC(P+R)   <- Sentinel/failover
                     source of truth: DB (cache is disposable)
```

Recap: pick Redis for structures/persistence/replication or Memcached for a lean multi-core blob cache, shard by hash slots so topology changes move few keys, replicate each shard with Sentinel/Cluster failover, tier L1-near plus L2-remote to cut hops and hot keys, keep L2 consistent via invalidate-on-write or versioned keys, and never bring a cold cache online under full load.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a shared cache tier for a fleet of app servers needing sub-ms reads at 1M ops/sec with node failures tolerated.

**Think about:**
- Redis vs Memcached: what do you gain from each?
- How do you shard and replicate the cache for HA?
- How do you keep cache and DB consistent, and treat the cache as disposable?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: many app servers sharing one logical cache, 1M ops/sec aggregate, sub-millisecond read target, and the requirement to survive individual node failures without an outage. The DB remains the source of truth.

Engine: **Redis Cluster.** I pick Redis over Memcached because I want replication and automatic failover for the HA requirement, and because atomic operations and data structures (counters, sorted sets) are usually needed somewhere in a real app. Memcached would be a fine, slightly simpler choice if the workload were purely opaque-blob caching with no HA-via-replication need, but the failover requirement tips me to Redis.

Sharding: partition the keyspace across N shards using Redis Cluster's **16,384 hash slots**. A single Redis instance handles on the order of 100K+ ops/sec, so to serve 1M ops/sec with headroom I run roughly 10 to 20 primary shards and let the client route each key by slot. Because slots move individually, I can add shards to scale out without a full rehash and without a mass-miss event.

HA: each shard is a **primary plus at least one replica** on a different host/AZ, with **Cluster failover (or Sentinel)** promoting a replica within seconds when a primary dies. Replication is async, so a failover may drop the last few milliseconds of writes; that is acceptable precisely because the **cache is disposable** and the app falls through to the DB on a miss, so no data is lost, only a little performance.

Sub-ms reads: a remote hop plus Redis is typically well under a millisecond within a datacenter, but for the hottest keys I add an **L1 near cache** in each app process so those reads never leave the box and no single shard is saturated by a hot key. L1 also cushions a shard failover.

Consistency: **invalidate-on-write** to L2 (delete the key after the DB write) with a **short TTL backstop**, and **versioned keys** where I want to avoid any stale read entirely. Set `maxmemory` with `allkeys-lru` eviction so a full cache evicts rather than errors, and watch for **big keys** (split them) and **hot keys** (L1 plus replication).

Operational: I never `FLUSHALL` under load or bring a cold cluster online at full traffic; I warm the hot set or ramp traffic and keep request coalescing on, so a cold start does not stampede the DB.

**Common wrong turn:** treating a cache flush or cold failover as safe and sending full read traffic at a cold cache, which stampedes the origin; or running a single unreplicated Redis, which makes the cache a single point of failure that violates the fault-tolerance requirement.

**Self-check rubric:**
- [ ] I chose an engine (Redis) and justified it against Memcached on the specific HA/structure needs.
- [ ] I sharded by hash slots and sized the shard count from per-node throughput to reach 1M ops/sec.
- [ ] I replicated each shard and named a failover mechanism (Cluster/Sentinel), noting async-replication data-loss is acceptable because the cache is disposable.
- [ ] I hit sub-ms with an L1 near cache and kept L2 consistent via invalidate-on-write / versioned keys / TTL.
- [ ] I addressed eviction under maxmemory, big/hot keys, and the cold-cache/flush hazard.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design Twitter/X's cache tier that fronts the timeline and tweet-object services at tens of millions of reads per second across multiple regions, where a single celebrity tweet can be read millions of times per second and a region can fail. Lead with the topology and explain how you keep it available and consistent enough.

**Model answer (revealed on demand):**

Topology: a **per-region, multi-tier cache**, L1 near cache in each app process plus a regional **Redis Cluster** L2, with the DB (and cross-region replication of the source of truth) behind it. Timelines and tweet objects are cached separately, because a tweet object is shared by millions of timelines and is the true hot spot, while a timeline is per-user.

Scale and hot keys: tens of millions of reads/sec is far beyond one cluster's single-key capacity, and a celebrity tweet read millions of times per second would saturate whichever shard owns its key. Two mechanisms handle this. First, **L1 near caches** on every app server serve the overwhelmingly hot tweet objects in-process with a short TTL, so a viral tweet is answered locally on thousands of nodes and only trickles to L2. Second, for the very hottest keys I **replicate the key across shards** so its read load spreads instead of hammering one shard. Hot-key detection promotes a key into this treatment automatically.

Availability across regions: run an **independent cache cluster per region** so a region failure does not take the cache down globally; traffic fails over to a healthy region, whose cache is warm for its own users. Within a region, each shard has replicas with Cluster failover, so a node loss is a blip. The source of truth is replicated across regions asynchronously.

Consistency: tweets are largely immutable (edits and deletes are rare), so I use **versioned/immutable keys** for tweet objects (a deleted or edited tweet writes a new version and invalidates the old), which sidesteps most invalidation races. Timelines are rebuilt or invalidated on the fan-out path. I accept eventual consistency of a few seconds across regions, which is fine for a social feed.

Tradeoff and wrong turn: I trade strict global consistency for regional availability and massive read scale, accepting seconds of cross-region staleness. The wrong turn is a single global cache cluster (a shared failure domain and a cross-region latency tax) or caching a celebrity tweet under one key with no L1 and no replication, which turns one shard into the whole system's bottleneck and takes the site down when a tweet goes viral.
