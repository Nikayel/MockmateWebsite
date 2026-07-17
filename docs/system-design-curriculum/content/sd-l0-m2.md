> Module **sd-l0-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l0-m1](./sd-l0-m1.md) · Next: [sd-l0-m3](./sd-l0-m3.md)

# L0 · Back-of-the-Envelope Estimation

After this module you can take a vague prompt ("Design Twitter"), turn it into defensible numbers for QPS, storage, bandwidth, and cache size in under five minutes, and use each number to justify a concrete architecture decision instead of guessing. You will also carry a small mental cheat-sheet of latency and unit constants so your math is fast and credible under interview pressure.

### sd-l0-fermi-estimation: The Fermi Estimation Method

- **id:** `sd-l0-fermi-estimation`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** estimation, capacity

#### Learn

Fermi estimation is the skill of getting a number that is right to within one order of magnitude, fast, by decomposing a big unknown into small quantities you are willing to assume. The physicist Enrico Fermi famously estimated the yield of a nuclear test by dropping bits of paper and watching how far the blast pushed them. In a system design interview the same move applies: you never actually know the QPS, so you build it out of assumptions you state out loud.

The process matters more than the precision. Four rules:

1. Decompose the unknown into things you can assume (users, actions per user, object sizes).
2. Write down every assumption explicitly so the interviewer can challenge one number, not the whole result.
3. Label units on every line (requests/day, bytes/object, seconds). Most estimation mistakes are unit mistakes.
4. Round aggressively to powers of ten. 86,400 seconds/day becomes 10^5. You are choosing a sharding strategy, not filing taxes.

Worked example. Suppose 50M daily active users, each doing 10 reads and 1 write per day.

```
reads/day  = 50M x 10 = 500M   = 5 x 10^8
writes/day = 50M x 1  =  50M   = 5 x 10^7
seconds/day ~= 86,400          ~= 10^5

avg read QPS  = 5 x 10^8 / 10^5 = 5,000
avg write QPS = 5 x 10^7 / 10^5 =   500
```

Average is not what your capacity must survive. Real traffic is peaky: a diurnal curve plus launch spikes. A 2x to 3x peak multiplier over the daily average is the standard defensible assumption. So plan for roughly 15k peak read QPS and 1.5k peak write QPS.

**Interview nuance:** interviewers do not care whether you land on 5,000 or 6,200 QPS. They care that you can defend the shape of the calculation and that you convert average to peak. Saying "I will assume a 3x peak multiplier because of the daily traffic curve" scores; a single unexplained number does not.

The last rule is the one that separates a senior answer: only compute a number if it changes a decision. Peak write QPS of 1.5k tells you a single well-tuned Postgres primary can likely absorb writes, so you may not need to shard yet. A read QPS of 15k tells you that you want a cache tier and read replicas. A daily storage number tells you whether you need object storage plus a sharded metadata DB. If a calculation cannot move the architecture, skip it.

```
assumptions  ->  arithmetic  ->  a number  ->  a design decision
   (state)        (round)        (label)         (justify)
```

**Interview nuance:** the classic failure here is analysis paralysis, spending eight minutes deriving storage to three significant figures while the design goes untouched. Estimate only enough to unblock the next decision, then move.

Recap: decompose into stated assumptions, label units, round to powers of ten, convert average to peak with a 2 to 3x multiplier, and compute only the numbers that change the architecture.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Estimate peak QPS, daily storage, and cache size for a service with 50M DAU averaging 10 reads and 1 write per day, showing every assumption and unit.

**Think about:**
- What assumptions must you state so the numbers are defensible?
- How do you get from average to peak, and what spike multiplier is reasonable?
- Which computed number actually changes a design decision?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions I will state up front: 50M DAU, 10 reads and 1 write per user per day, average object size of 1 KB (a row of structured data plus a little metadata), 90-day retention for the hot dataset, and a 3x peak-to-average multiplier for the diurnal curve.

QPS. Reads/day = 50M x 10 = 5 x 10^8. Writes/day = 5 x 10^7. Dividing by ~10^5 seconds/day gives avg 5,000 read QPS and 500 write QPS. Applying a 3x peak multiplier: about 15k peak read QPS and 1,500 peak write QPS. Design implication: 15k read QPS wants a cache tier plus a few read replicas; 1,500 write QPS is comfortably inside a single tuned primary, so I would not shard writes on day one.

Storage. New objects/day = writes/day = 5 x 10^7. At 1 KB each that is 5 x 10^10 bytes = 50 GB/day. Over 90 days that is about 4.5 TB, and with a replication factor of 3 for durability, roughly 13 to 14 TB provisioned. Design implication: this is beyond a single node's comfortable working set, so a sharded datastore (or a managed store like DynamoDB or Cassandra) is justified, and I would keep blobs, if any, out of the primary DB.

Cache. Size the cache from the hot working set, not the full corpus. Assume the hot 20% of recent objects serves 80% of reads. If the daily hot set is roughly the last few days of writes plus popular older items, a cache holding tens of GB (say 50 to 100 GB of the hottest keys) captures the bulk of read traffic. A Redis cluster of that size is cheap relative to the read-replica load it removes.

The one number that most changes the design is peak read QPS versus peak write QPS: read-heavy by 10:1 pushes me toward caching and replication rather than write sharding.

Common wrong turn: computing storage to three significant figures while never stating the peak multiplier, then optimizing a write path that was never the bottleneck.

**Self-check rubric:**
- [ ] I stated object size, retention, replication factor, and peak multiplier as explicit assumptions.
- [ ] I converted average QPS to peak with a named multiplier (2 to 3x).
- [ ] Every line carried a unit (QPS, GB/day, TB).
- [ ] I multiplied storage by the replication factor.
- [ ] I named the specific design decision each number drives (shard or not, cache tier, replicas).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Estimate peak ingest QPS and daily storage for Instagram-scale photo uploads: assume 500M DAU, each uploading 2 photos per day and viewing 50, average photo 2 MB after server-side compression. State assumptions and call out which number forces a specific storage choice.

**Model answer (revealed on demand):**

Assumptions: 500M DAU, 2 uploads/day and 50 views/day per user, 2 MB per stored photo (post-compression, before thumbnails), 3x peak multiplier, and a replication factor of 3.

QPS. Uploads/day = 500M x 2 = 10^9. Views/day = 500M x 50 = 2.5 x 10^10. Dividing by ~10^5 s/day: avg upload QPS ~= 10,000, avg view QPS ~= 250,000. With a 3x peak: about 30k peak upload QPS and 750k peak view QPS. The 25:1 read:write skew screams CDN plus object store, not database-served images.

Storage. New photos/day = 10^9. At 2 MB each that is 2 x 10^15 bytes = 2 PB/day of raw blobs. With replication factor 3 that is about 6 PB/day provisioned, and thumbnails add maybe 10 to 20% more. Over a year the blob footprint is on the order of an exabyte. This single number forces the storage choice: photos must live in an object store (S3-class) fronted by a CDN, with only compact metadata (photo id, owner, S3 key, timestamps, roughly 1 KB/photo, so ~1 TB/day of metadata) in a sharded database. You cannot put multi-petabyte-per-day blobs in Postgres.

Design implications: 750k peak view QPS is served almost entirely from the CDN edge, so origin QPS is a small fraction of that. 30k peak upload QPS goes through an ingest tier that writes blobs to the object store asynchronously and enqueues thumbnail generation (via a queue like Kafka or SQS plus workers). Metadata writes at 30k QPS need sharding by photo id or user id.

Common wrong turn: sizing a database to hold the images themselves, or forgetting that egress at this view volume is a CDN and bandwidth-cost problem, not a database problem.

### sd-l0-qps-read-write: QPS and Read-vs-Write Modeling

- **id:** `sd-l0-qps-read-write`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** estimation, read-write-ratio

#### Learn

The single most decision-shaping number in an estimate is the read:write ratio. It tells you which path to optimize, and optimizing the wrong path is one of the most common ways to lose a design round. A 100:1 read-heavy system (a social feed, a product catalog) wants caches, read replicas, and denormalized read models. A write-heavy or balanced system (an analytics ingest pipeline, a metrics store) wants write batching, append-only logs, and horizontally sharded write paths.

Start by converting DAU to QPS with explicit arithmetic, exactly as in Fermi estimation. Then compute reads and writes separately and take the ratio.

The subtlety in feed-like systems is fan-out: one write can generate many logical reads, or one read can require merging many sources. This is the fan-out-on-write versus fan-out-on-read decision.

```
Fan-out on WRITE (precompute):        Fan-out on READ (merge at query time):
user posts -> push into each              user opens feed -> pull recent posts
follower's feed cache                     from each followee -> merge/sort
- read is cheap (one cache GET)           - write is cheap (one append)
- write is expensive (N inserts)          - read is expensive (N fetches + merge)
- great when reads >> writes              - great for celebrities / huge fan-out
```

Worked example: a feed with 50M DAU, each user reads their feed 20 times/day and posts 0.5 times/day, average 200 followers.

```
reads/day  = 50M x 20  = 10^9      -> avg  ~10k QPS,  peak ~30k QPS
writes/day = 50M x 0.5 = 2.5 x 10^7 -> avg ~250 QPS,  peak ~750 QPS
read:write ratio ~= 40:1  (read-heavy)
```

But if you fan out on write, each post writes into ~200 follower feeds. Effective feed-insert QPS = 250 x 200 = 50k QPS of cache writes. So the naive write QPS (250) understates the real write cost by the fan-out factor. This is why the ratio alone is not enough; you must model where the fan-out happens.

**Interview nuance:** the strong answer usually picks a hybrid. Fan out on write for normal users (cheap reads), but for celebrities with millions of followers, fan out on read (pull their posts at query time) so a single tweet does not trigger tens of millions of feed inserts. Naming this hybrid is a senior signal.

Averages also lie because access is Zipfian: a small number of hot keys (viral posts, celebrity accounts, trending products) take a hugely disproportionate share of traffic. Your design must survive the hot key, not just the average. That means a hot key can saturate a single cache node or shard even when the fleet-wide average looks fine, so you plan for replication of hot keys or request coalescing.

Finally, translate QPS into a first-order server count. If a tuned application server handles ~10k QPS, then 30k peak read QPS needs at least 3 to 4 app servers behind the load balancer plus headroom, and a cache handling 100k+ ops/sec covers the feed reads.

Recap: derive read and write QPS separately, take the ratio to decide read-optimized versus write-optimized, model where fan-out happens (write vs read, and a celebrity hybrid), and design for the hot key rather than the average.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Derive read QPS vs write QPS for a social feed from DAU and a fan-out assumption, then state whether you would optimize the read or write path.

**Think about:**
- What is the read:write ratio, and does it point you to cache-heavy or write-optimized design?
- Is fan-out done on read or on write, and how does that change QPS?
- How do hotspots and Zipfian access change the averages?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 50M DAU, each opens the feed 20 times/day (reads) and posts 0.5 times/day (writes), average 200 followers, 3x peak multiplier.

Base QPS. Reads/day = 50M x 20 = 10^9, so avg ~10k and peak ~30k read QPS. Writes/day = 50M x 0.5 = 2.5 x 10^7, so avg ~250 and peak ~750 post QPS. The base read:write ratio is about 40:1, firmly read-heavy.

That ratio says: optimize the read path. Reads must be a cheap cache lookup, not a live merge across hundreds of followees. So I fan out on write: when a user posts, I push the post id into each follower's precomputed feed (a per-user list in Redis). Now a feed read is a single cache range-read, which is what a 40:1 read-heavy system wants.

But fan-out changes the real write cost. Each post touches ~200 follower feeds, so effective feed-insert QPS = 250 x 200 = 50k avg (150k peak) cache writes. That is now the dominant write load, and it lives in the cache/feed-store tier, not the source-of-truth posts table (which still only takes ~750 peak QPS). So I still optimize reads, but I size the feed-fanout workers and cache write throughput for 150k peak inserts.

Hotspots force one correction. A celebrity with 10M followers would trigger 10M feed inserts per post, a write storm that fan-out-on-write cannot absorb. So I use a hybrid: users above a follower threshold (say 100k) are fan-out-on-read. Their posts are pulled and merged into a follower's feed at read time. Zipfian access also means a viral post's cache entry is a hot key, so I replicate hot feed entries across cache nodes and coalesce duplicate reads.

Server count: 30k peak read QPS at ~10k QPS/server is ~4 app servers plus headroom; a Redis cluster sized for 150k+ writes/sec handles fan-out.

Common wrong turn: reporting the 40:1 ratio, declaring "read-heavy, add a cache," and never noticing that fan-out-on-write made the system write-bound in the cache tier.

**Self-check rubric:**
- [ ] I computed read and write QPS separately with explicit arithmetic and a peak multiplier.
- [ ] I stated the read:write ratio and used it to pick which path to optimize.
- [ ] I chose fan-out-on-write vs on-read and recomputed the effective write QPS after fan-out.
- [ ] I handled the celebrity / huge-fan-out case with a hybrid.
- [ ] I addressed hot keys / Zipfian access, not just averages.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Model send QPS vs delivery QPS for WhatsApp-scale group messaging assuming 2B users, 40 messages sent per user per day, and an average group size of 8. Decide whether the delivery path or the send path is the scaling bottleneck and justify the fan-out strategy.

**Model answer (revealed on demand):**

Assumptions: 2B users, 40 sends/user/day, average group size 8 (so each sent message fans out to ~7 other recipients), 3x peak multiplier.

Send QPS. Messages sent/day = 2B x 40 = 8 x 10^10. Divided by ~10^5 s/day: avg ~800k send QPS, peak ~2.4M send QPS.

Delivery QPS. Each send delivers to ~7 recipients, so deliveries/day = 8 x 10^10 x 7 = 5.6 x 10^11, avg ~5.6M and peak ~17M delivery QPS. The delivery path is roughly 7x the send path and is clearly the bottleneck. This is inherently a fan-out-on-write system: messaging is write/delivery-heavy, the opposite of a read-heavy feed.

Fan-out strategy. On send, the server writes the message once to a durable log (per-conversation, in a store like Cassandra), then fans out delivery: for each recipient, either push over an existing persistent connection (WebSocket) if the device is online, or write to a per-user pending queue and trigger a push notification (APNs/FCM) if offline. So delivery is fan-out-on-write into per-recipient inboxes.

Bottleneck handling. 17M peak delivery QPS demands a large fleet of connection servers, each holding hundreds of thousands of live WebSocket connections, sharded by user id, with a pub/sub layer (or a routing service) to find which connection server holds a given recipient. Large groups (the tail of the size distribution) are the hot spots: a 1,000-member group turns one send into 1,000 deliveries, so I cap group size and treat very large groups closer to a broadcast/read model.

Common wrong turn: optimizing the send write (it is only 2.4M QPS) and under-provisioning the delivery fan-out, which is the 17M-QPS reality, or forgetting the online-vs-offline split that decides push-vs-queue.

### sd-l0-storage-bandwidth-cache: Storage, Bandwidth & Cache Sizing

- **id:** `sd-l0-storage-bandwidth-cache`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** estimation, storage, cache

#### Learn

Storage, bandwidth, and cache are the three capacity numbers that decide your datastore, your CDN strategy, and your cache tier. Each has a formula and a classic mistake.

Storage. The base formula is:

```
storage = objects/day  x  object size  x  retention (days)
```

The critical discipline is to separate metadata from blobs. A photo is 2 MB of blob but only ~1 KB of metadata (id, owner, timestamps, storage key, caption). These belong in different systems: blobs in an object store (S3), metadata in a sharded database. Estimating them together hides the fact that your database only needs to hold gigabytes while your object store holds petabytes.

Two multipliers people forget, both of which change the answer materially:

- Replication factor. Durable stores keep 3 copies (RF=3), so multiply raw storage by 3. Erasure coding can bring this down to ~1.3x to 1.5x for cold blobs, a real cost lever worth naming.
- Index and overhead. Secondary indexes, B-tree overhead, and free space commonly add 20 to 50% on top of raw row size for databases.

Bandwidth. Compute ingress and egress separately, because they have very different costs and destinations.

```
bandwidth = QPS  x  payload size
ingress = write QPS x write payload      (upload path)
egress  = read QPS  x read payload       (download/serve path)
```

Egress is usually the larger and more expensive number, and in cloud pricing egress leaves your provider's network at real dollar cost. A read-heavy media service serving 2 MB objects at 250k QPS is pushing 500 GB/s of egress, which is a "you must use a CDN" signal, not a "size your app servers" signal, because the CDN serves it from the edge and shields the origin.

Cache sizing with the 80/20 rule. You do not cache the whole corpus; you cache the hot working set. The Pareto assumption is that ~20% of data serves ~80% of requests, and often it is far more skewed (the recent and the viral). Size the cache from that hot fraction:

```
cache size ~= hot fraction (~20%) of the actively-read dataset
```

For a service with a 4.5 TB actively-read dataset, an 80/20 cut suggests roughly 900 GB of hot data, but in practice the truly hot set is the last few days plus trending items, often a much smaller absolute number like tens to low hundreds of GB. Verify the hit rate assumption: if 100 GB of cache yields a 90%+ hit rate, you have removed 90% of read load from the datastore, which is what justifies the cache economically.

**Interview nuance:** interviewers probe "how big is your cache and why that size." The winning answer ties cache size to a target hit rate and to the read load removed from the origin, not to a fraction of total storage pulled from thin air.

```
raw payload -> x replication -> + index/overhead = provisioned storage
hot 20% of reads -> cache size -> target hit rate -> read load removed
```

Recap: size storage as objects x size x retention with metadata and blobs kept separate, multiply by replication factor and add index overhead, compute ingress and egress bandwidth separately (egress drives CDN), and size the cache from the hot ~20% against a target hit rate.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Size 5-year storage and the hot-cache tier for a media service, applying the 80/20 rule to decide what lives in cache vs cold storage.

**Think about:**
- How do you separate metadata size from blob size in the storage estimate?
- What working-set fraction belongs in the hot cache tier?
- How does replication factor multiply your storage number?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 10M new media objects/day, average blob 2 MB, metadata ~1 KB/object, 5-year retention (~1,825 days), replication factor 3 for blobs, and RF 3 plus ~30% index overhead for metadata.

Blob storage. Objects/day x size = 10^7 x 2 MB = 2 x 10^13 bytes = 20 TB/day of raw blobs. Over 5 years: 20 TB x 1,825 ~= 36.5 PB raw. With RF=3 that is ~110 PB provisioned. If cold objects use erasure coding (~1.4x instead of 3x), the older tail drops substantially, so I would tier: recent data on RF=3, archival on erasure coding. Blobs live in an object store (S3-class), never in the database.

Metadata storage. 10^7 objects/day x 1 KB = 10 GB/day of metadata. Over 5 years: ~18 TB raw, with RF=3 and ~30% index overhead about 70 TB. This lives in a sharded database (DynamoDB or a sharded Postgres/Cassandra), sharded by object id. Note the 1000x gap between blob (110 PB) and metadata (70 TB): keeping them separate is what keeps the database tractable.

Cache tier. I cache the hot working set, not 36 PB. The hot set for media is dominated by recency and virality: the last few days of uploads plus trending older items. The last 3 days is ~60 TB of blobs, but the truly hot fraction served from cache is smaller. I would put a modest hot tier (say a few hundred GB to a few TB of the very hottest objects and all hot metadata) in Redis/an in-memory tier, and rely primarily on a CDN for blob egress. The CDN edge cache, sized to the hot ~20% by request volume, is what actually absorbs read traffic; origin cache handles metadata and cache-miss coalescing.

What lives where: hot metadata and hottest blobs in cache; recent blobs on RF=3 object store behind a CDN; archival blobs on erasure-coded cold storage; all metadata in the sharded DB.

Common wrong turn: forgetting the RF=3 multiplier (understating storage 3x), lumping blobs into the database, or sizing the cache as a fixed fraction of 36 PB rather than from the hot request distribution.

**Self-check rubric:**
- [ ] I used storage = objects/day x size x retention and kept metadata and blobs separate.
- [ ] I multiplied by replication factor and named index/overhead for metadata.
- [ ] I sized the cache from the hot working set, not total corpus.
- [ ] I mapped each tier to concrete tech (object store, sharded DB, CDN, Redis).
- [ ] I noted a cost lever (erasure coding / tiering) for cold data.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Size storage, egress bandwidth, and the cache/CDN tier for Netflix-scale video streaming: assume 250M subscribers, each streaming 2 hours/day at an average 5 Mbps bitrate, and a catalog of 100k titles at an average 15 GB per title (summed across encodings). Decide where the real capacity problem is.

**Model answer (revealed on demand):**

Assumptions: 250M subscribers, 2 hours/day streaming each, 5 Mbps average delivered bitrate, catalog 100k titles x 15 GB/title across encodings and resolutions, 3x peak multiplier for concurrent viewing.

Catalog storage. 100k x 15 GB = 1.5 PB raw. With RF=3 plus geo-distribution that is a few PB, but this is a fixed, modest number: the catalog is small and mostly static. Storage is not the hard problem here.

Egress bandwidth is the real problem. Aggregate streaming: 250M x 2 hours = 500M viewing-hours/day. But bandwidth is about concurrency, not daily totals. If ~10% of subscribers stream at peak, that is 25M concurrent streams x 5 Mbps = 125 Tbps of egress at peak. That number is the entire design constraint. You cannot serve 125 Tbps from central origins; it must be served from a CDN deployed deep into ISP networks (Netflix's Open Connect model), caching popular titles inside or adjacent to ISPs.

Cache/CDN tier. Apply the 80/20 rule hard: a small fraction of titles (new releases, trending shows) drive the overwhelming majority of streams. Each edge appliance caches the hot ~terabytes of the catalog (a few thousand popular titles) and serves them locally; cache misses for long-tail titles fall back to regional caches then origin. Because the catalog is only ~1.5 PB, a full copy fits in a regional cache, and edge nodes hold the hot subset. Fill happens off-peak overnight.

Where the capacity problem is: not storage (1.5 PB is small), not the control plane QPS (playback-start requests are modest), but sustained egress bandwidth at 125 Tbps peak, which forces a purpose-built CDN pushed to the network edge rather than a centralized serving tier.

Common wrong turn: sizing central data-center bandwidth for 125 Tbps, or fixating on catalog storage when the binding constraint is peak concurrent egress served from the edge.

### sd-l0-latency-numbers: Latency Numbers Every Engineer Should Know

- **id:** `sd-l0-latency-numbers`  ·  **difficulty:** easy  ·  **est:** 20 min  ·  **skills:** estimation, latency

#### Learn

Fast, credible estimation rests on a small set of memorized constants. If you quote a same-datacenter round trip as 50 ms or a memory read as 1 ms, every downstream number is wrong by orders of magnitude and the interviewer stops trusting your math. This lesson is the cheat-sheet.

The latency ladder (rounded, order-of-magnitude, the numbers that matter):

```
L1 cache reference            ~1 ns
Main memory (RAM) read        ~100 ns        (0.1 us)
Read 1 MB sequentially/RAM    ~10 us
SSD random read              ~100 us        (0.1 ms)
Round trip within same DC     ~0.5 ms
Read 1 MB from SSD            ~1 ms
Disk (HDD) seek               ~10 ms
Round trip cross-region       ~50-150 ms     (e.g. US-EU)
```

The key ratios to internalize: memory is roughly 1,000x faster than an SSD random read, an SSD is roughly 100x faster than an HDD seek, a same-datacenter round trip (~0.5 ms) is roughly 100x to 300x faster than a cross-region round trip. These ratios are why you cache in memory, why you avoid random disk seeks, and why you keep chatty request sequences within one region.

**Interview nuance:** the practical takeaway interviewers want is not the exact nanoseconds but the design consequence. "Cross-region is ~100 ms, so a synchronous read-your-writes across regions will feel slow; I will serve reads from a regional replica and replicate asynchronously" is the sentence that earns the point.

Data units in powers of two, and their byte magnitudes:

```
1 KB ~= 10^3 bytes      1 MB ~= 10^6      1 GB ~= 10^9      1 TB ~= 10^12
```

Time-to-seconds conversions for QPS math, rounded:

```
1 day   ~= 86,400 s      ~= ~10^5 s
1 month ~= 2.5M s        ~= 2.5 x 10^6 s
1 year  ~= 31.5M s       ~= ~3 x 10^7 s
```

Typical object sizes to plug into storage math (memorize the magnitudes):

```
a text message / tweet     ~ 100s of bytes to ~1 KB
a database row (metadata)   ~ 1 KB
a compressed web page       ~ 100s of KB
a photo (post-compression)  ~ 1-2 MB
a minute of video (SD/HD)   ~ 5-15 MB
```

Single-machine ceilings, the rough capacities you assume before proving otherwise:

```
Tuned app server (stateless)   ~ 10k-50k QPS
Redis / in-memory cache node   ~ 100k+ ops/sec
Single relational DB primary    ~ few k writes/sec, tens of k reads/sec
One server's live connections   ~ 100k+ WebSockets (tuned)
```

These ceilings turn a QPS number into a server count in one step: 30k peak read QPS at ~10k QPS/server means 3 to 4 servers plus headroom; 1M write QPS against a ~5k-writes/sec DB node means you need ~200 shards, which immediately justifies a horizontally sharded datastore.

**Interview nuance:** you will not be graded on decimal precision. You will be graded on whether your quoted numbers are within an order of magnitude and whether you convert them into a decision (cache here, shard there, replicate this way). Being off by 1000x on a single constant can invalidate an otherwise good design.

Recap: memorize the latency ladder (memory ~100 ns, SSD ~100 us, same-DC ~0.5 ms, cross-region ~50 to 150 ms), the day/month-to-seconds conversions, typical object sizes, and single-machine ceilings, then always translate a number into a design decision.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Order these by latency from memory and give rough magnitudes: L1/RAM read, SSD read, same-datacenter round trip, cross-region round trip, disk seek.

**Think about:**
- What is the rough order of magnitude at each rung of the latency ladder?
- How do you convert one day and one month into seconds for QPS math?
- What single-machine ceilings (QPS, connections) do you assume?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Ordered fastest to slowest, with magnitudes:

1. RAM (main memory) read: ~100 ns (0.1 us). An L1 cache reference is even faster at ~1 ns.
2. SSD random read: ~100 us (0.1 ms), roughly 1,000x slower than RAM.
3. Same-datacenter round trip: ~0.5 ms, in the same ballpark as an SSD read (a few times slower).
4. Disk (HDD) seek: ~10 ms, about 100x slower than an SSD read.
5. Cross-region round trip: ~50 to 150 ms, the slowest here, roughly 100x to 300x a same-DC round trip.

So the full order is: RAM (100 ns) < SSD (100 us) < same-DC RTT (0.5 ms) < HDD seek (10 ms) < cross-region RTT (50 to 150 ms). Note the same-DC round trip and SSD read are close; the big cliffs are RAM-to-SSD (1,000x) and same-DC-to-cross-region (100x+).

Design consequences I would state: because memory is ~1,000x faster than SSD, hot data belongs in an in-memory cache. Because a disk seek is ~10 ms, I avoid random-access patterns on spinning disk and prefer sequential I/O or SSDs. Because cross-region is ~100 ms, I do not make synchronous cross-region calls on the request path; I serve from a regional replica and replicate asynchronously, accepting eventual consistency.

Unit and time conversions I keep ready: 1 day ~= 86,400 s ~= 10^5 s, 1 month ~= 2.5M s, 1 year ~= ~3 x 10^7 s. Data units: 1 KB ~= 10^3, 1 MB ~= 10^6, 1 GB ~= 10^9, 1 TB ~= 10^12 bytes.

Single-machine ceilings I assume: a tuned stateless app server ~10k to 50k QPS; a Redis node ~100k+ ops/sec; a single relational primary a few thousand writes/sec and tens of thousands of reads/sec; one tuned server ~100k+ live WebSocket connections. These let me turn any QPS number into a server or shard count in one step.

Common wrong turn: quoting a same-DC round trip as tens of milliseconds or a memory read as microseconds, which throws every downstream latency budget off by orders of magnitude.

**Self-check rubric:**
- [ ] I ordered all five correctly with order-of-magnitude values.
- [ ] I named the two big cliffs (RAM to SSD ~1,000x, same-DC to cross-region ~100x).
- [ ] I gave the day/month/year-to-seconds conversions.
- [ ] I stated at least one design consequence per major rung (cache, avoid seeks, async cross-region).
- [ ] I recalled single-machine QPS/connection ceilings.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Explain how you would use the latency ladder to justify a design decision in a global e-commerce checkout with users in the US, EU, and Asia, where inventory is the source of truth in a single US region. Give a concrete latency budget and the tradeoff you accept.

**Model answer (revealed on demand):**

The binding constant is the cross-region round trip: US to EU is ~80 to 100 ms and US to Asia is ~150 to 200 ms one way can be worse. A checkout that makes several synchronous calls back to the single US inventory region will stack these round trips. If checkout does 4 sequential cross-region calls from Asia at ~150 ms each, that is ~600 ms of pure network latency before any processing, which blows a sub-200 ms p99 budget.

Latency budget for a 200 ms checkout: DNS/TLS is amortized by connection reuse, edge/CDN termination ~10 ms, regional app processing ~20 ms, cache reads (in-region, in-memory ~100 us each) negligible, and at most one cross-region call to the authoritative inventory. That one call is the expensive item, so I spend the budget on making it exactly one and issuing it asynchronously or optimistically where possible.

Design decision the ladder justifies: serve product browsing and cart from regional read replicas and in-region caches (memory reads at ~100 ns, same-DC round trips at ~0.5 ms are effectively free against the budget). Keep the single US region as the source of truth for the final inventory decrement, but do it with an optimistic reservation: the regional service tentatively reserves stock and confirms with one asynchronous cross-region write, reconciling on conflict.

Tradeoff I accept: eventual consistency on inventory. Two shoppers in different regions might both reserve the last unit within the replication window, so I accept a small oversell risk and resolve it with a compensating action (cancel and refund, or backorder) rather than paying a ~150 ms synchronous cross-region lock on every checkout. For most retail this is the right trade; for extremely scarce high-value inventory I would instead route those specific SKUs' checkout to the US region and accept the higher latency for correctness.

Common wrong turn: making checkout synchronously consistent across regions, which is correct but slow (600 ms+ from Asia), or ignoring the cross-region constant entirely and being surprised by tail latency.
