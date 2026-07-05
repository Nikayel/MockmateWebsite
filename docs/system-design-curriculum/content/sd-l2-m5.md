> Module **sd-l2-m5** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l2-m4](./sd-l2-m4.md) · Next: [sd-l3-m1](./sd-l3-m1.md)

# L2 · Blob Storage & Choosing a Store

After this module you can design the storage and delivery path for large binary files (images, video, backups) using object storage plus a metadata pointer and a CDN, and you can take an arbitrary feature spec and defend a datastore choice against alternatives, including knowing when NewSQL beats app-level sharding and when boring relational is the right answer.

### sd-l2-blob-object-storage: Blob / Object Storage

- **id:** `sd-l2-blob-object-storage`  ·  **difficulty:** easy  ·  **est:** 25 min  ·  **skills:** object-storage, blob, cdn

#### Learn

The single most common storage mistake juniors make is putting a 5 MB image, or worse a 500 MB video, into a database column. Relational and document databases are tuned for small, structured, frequently-queried rows. A large binary object (a "blob") is the opposite: big, opaque, write-once, read-many. Stuffing blobs into Postgres or MongoDB bloats the table, blows out your backup and replication times, wrecks the buffer cache (one video eviction flushes thousands of hot rows), and forces every byte to flow through your app servers. The right home for bytes is **object storage**: S3, Google Cloud Storage, or Azure Blob Storage.

The mental model is a split. **Object storage holds the bytes; the database holds the metadata plus a pointer (the object key).** A `photos` row stores `id`, `owner_id`, `caption`, `width`, `height`, `content_type`, and `object_key = "photos/2026/u123/abc.jpg"`. The actual JPEG lives in the bucket at that key. Your DB stays small and fast; the blobs live somewhere built for them. Object stores give you flat key-value semantics (a key maps to an immutable object plus metadata), effectively unlimited capacity, and roughly **eleven nines of durability** (99.999999999 percent), achieved by replicating each object across multiple facilities. You do not manage disks, RAID, or capacity.

The second big idea is **presigned URLs**, which keep bytes off your servers entirely. When a client wants to upload, it asks your app server for permission. The app authorizes the user, then generates a short-lived, cryptographically signed URL that grants `PUT` to one specific key for, say, 15 minutes, and returns it. The client `PUT`s the file **directly to S3**. Downloads work the same way with a signed `GET`. Your app never touches the file body: it only mints capability tokens. This is what lets a tiny fleet of app servers support petabytes of transfer.

For large files you use **multipart upload**: split the file into parts (say 8 MB each), upload parts in parallel, retry only failed parts, and finalize with a "complete" call that stitches them server-side. This gives you resumability and parallel throughput. Where history matters (documents, compliance) enable **versioning** or write objects **immutably** with a content hash in the key.

Cost and latency are controlled by two levers. **Lifecycle and tiering**: hot data stays in the standard tier, and a policy automatically moves objects to infrequent-access, then cold, then archive (S3 Glacier) as they age, cutting storage cost by 5 to 20x for data nobody reads. **A CDN in front for reads**: CloudFront or Cloudflare caches objects at edge PoPs near users, so a popular video is served from an edge 20 ms away instead of a single region 150 ms away, and your origin bucket sees a fraction of the traffic. You almost never serve public media directly from the bucket at scale.

**Interview nuance:** If asked "why not just base64 the image into a JSON column," the crisp answer is durability, cost, cache pollution, and egress path: object storage is cheaper per GB, more durable, and lets clients transfer directly via presigned URLs and a CDN, so bytes never bottleneck on your database or app tier.

```
  client --(1) ask to upload--> app server (authz) --(2) presigned PUT URL-->
  client --(3) PUT bytes directly--------------------------------> S3 bucket
                                                                     |
  DB row: {id, owner, key, w, h, type}  <--(4) app writes metadata--/
  read:  client <-- CDN edge cache <-- (signed GET) <-- S3 origin
```

Recap: Keep bytes in object storage (S3/GCS/Azure) with eleven-nines durability and only the key plus metadata in the DB, move files with presigned URLs and multipart upload so they bypass your servers, and control cost and latency with lifecycle tiering and a CDN.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design storage and delivery for user-uploaded images and videos, including the upload path, the metadata model, and the serving path.

**Think about:**
- Why store blobs in object storage and only the key/URL in the DB?
- How do presigned URLs let clients upload and download directly?
- How do lifecycle/tiering and a CDN control cost and latency?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: consumer app, images up to ~20 MB and videos up to ~2 GB, read-heavy (each upload viewed many times), public-ish media served over HTTPS.

High-level design: bytes live in an **S3 bucket**; a relational DB (Postgres) holds only metadata. Upload is a three-step direct-to-storage flow. (1) Client calls `POST /uploads` with content type and size; the app authorizes the user, creates a `media` row in state `pending` with a generated `object_key` like `media/{userId}/{uuid}`, and returns a **presigned URL**. For images this is a single presigned `PUT`; for videos it is a **multipart upload** (presigned URLs per part, 8 to 16 MB parts, uploaded in parallel with per-part retry). (2) The client uploads bytes **directly to S3**, never through the app. (3) On completion, either S3 fires an **event notification** (S3 -> SQS/Lambda) or the client calls `POST /uploads/{id}/complete`; the app flips the row to `ready` and enqueues async processing (virus scan, generate thumbnails, transcode video into HLS renditions).

Metadata model: `media(id, owner_id, object_key, content_type, bytes, width, height, duration, status, created_at)`. The DB stays tiny and every listing/feed query hits only these small rows.

Serving: put a **CDN (CloudFront)** in front of the bucket. Reads go client -> edge cache -> origin, so popular objects serve from a PoP ~20 ms away and the origin sees a fraction of traffic. For private media, mint short-lived signed CDN URLs; for public media, cache with long TTLs and a content-hash in the key so a new upload is a new URL (immutable, cache-friendly).

Cost and durability: S3 gives eleven-nines durability with no disk management. A **lifecycle policy** moves originals to infrequent-access after 30 days and Glacier after a year, while keeping thumbnails hot, cutting storage cost several-fold.

Common wrong turn: storing the image or video bytes in a BLOB column or routing every upload/download through the app tier. That pollutes the DB cache, balloons backups, and makes the app fleet the transfer bottleneck. Bytes belong in object storage; the DB holds a pointer.

**Self-check rubric:**
- [ ] Bytes go to object storage; DB holds only metadata plus the object key.
- [ ] Upload is direct-to-storage via presigned URLs (multipart for large video).
- [ ] There is an explicit `pending` -> `ready` state and async post-processing (thumbnails/transcode).
- [ ] Reads are fronted by a CDN with a stated cache/signing strategy.
- [ ] Lifecycle tiering is used for cost, and durability is quantified (eleven nines).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the ingest and delivery pipeline for a video platform like YouTube handling 500 hours of video uploaded per minute, where a single upload can be 4 GB and must play back adaptively on a 3G phone and a 4K TV. Lead with how raw bytes enter storage and how a viewer eventually streams them.

**Model answer (revealed on demand):**

Assumptions: massive write ingest, far larger read fan-out, global audience, adaptive bitrate playback required.

Ingest: creators upload **directly to an object store (S3/GCS)** via resumable **multipart upload** with presigned part URLs, so 4 GB uploads survive flaky networks (retry only failed parts) and never touch app servers. The raw object lands in a `raw/` prefix and its arrival fires an **event notification onto a queue (SQS/Kafka)**. The DB writes a `video` row in state `uploaded`.

Processing: a fleet of transcode workers consumes the queue and fans each raw file into a **ladder of renditions** (240p through 4K) segmented for **HLS/DASH** adaptive streaming, plus thumbnails and a captions job. Each segment is written back to object storage under `hls/{videoId}/{rendition}/seg_{n}.ts`. This is embarrassingly parallel and autoscaled off queue depth. When the ladder is complete the row flips to `ready`. Transcoding is the expensive path, so it is idempotent and checkpointed: a crashed worker re-runs only its segment.

Storage layout and cost: originals are cold, so a **lifecycle policy** pushes `raw/` to archive quickly (you rarely re-transcode); the HLS segments are the hot read set. Popular videos stay in standard storage; long-tail videos tier down.

Delivery: viewers never hit the origin bucket. A **multi-tier CDN** caches segments at the edge; the player fetches a manifest, then pulls segments and **switches rendition per segment based on measured bandwidth** (adaptive bitrate), so the 3G phone pulls 240p and the 4K TV pulls 2160p from the same library. Because segments are immutable and content-addressed, they cache with very long TTLs and edge hit rates exceed 95 percent, which is what makes the read side economically possible.

Metadata store: a horizontally scalable store (Cassandra/Bigtable or sharded MySQL, as YouTube uses Vitess) holds video metadata, view counts, and segment manifests; the object store holds bytes; the CDN holds hot copies. Common wrong turn: serving a single MP4 file per video (no adaptive bitrate) or transcoding synchronously in the upload request, which buffers on mobile and times out on large files.

### sd-l2-choosing-db-polyglot: Choosing a Database & Polyglot Persistence

- **id:** `sd-l2-choosing-db-polyglot`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** database-selection, newsql, polyglot

#### Learn

This is the synthesis lesson: given a feature, pick a store and defend it. Strong candidates do not memorize "use NoSQL for scale." They reason from **decision drivers** to a **storage family**, then defend against the runner-up.

The drivers, roughly in the order they decide things: **access patterns** (what queries do you actually run, and by what key), **read/write ratio and volume** (QPS now and in two years), **consistency needs** (does a stale read cause a real bug or just a cosmetic one), **scale** (does the working set fit one big node or not), **latency target** (p99 budget), and **query complexity** (joins, aggregations, ad hoc filters, full-text, geospatial). Two more sit underneath: **operational cost** (managed service vs self-hosted, and does your team already run it) and **transactions** (do you need multi-row ACID).

Now map drivers to families:

- **Relational (Postgres, MySQL):** rich queries, joins, ACID transactions, strong consistency, secondary indexes. The correct default for most features. A single well-indexed Postgres box comfortably serves tens of thousands of QPS.
- **Key-value (Redis, DynamoDB):** you always access by a known key, you need single-digit-ms latency, and you will do millions of ops/sec. Great for sessions, carts, feature flags, counters. Weak at ad hoc queries.
- **Document (MongoDB):** self-contained JSON documents, flexible schema, query by fields inside the document. Good for catalogs and content where the aggregate is loaded whole.
- **Wide-column (Cassandra, Bigtable, HBase):** massive write throughput, huge datasets, queries known in advance and modeled as partitions. You design tables per query. Weak at joins and ad hoc filters.
- **Graph (Neo4j):** the value is in relationships and multi-hop traversals (social graph, fraud rings, recommendations).
- **Time-series (InfluxDB, TimescaleDB, Prometheus):** append-heavy timestamped metrics with time-window rollups and retention.
- **Vector (pgvector, Pinecone, Milvus):** nearest-neighbor search over embeddings for semantic search and RAG.
- **Columnar / OLAP (Snowflake, BigQuery, ClickHouse):** large analytical scans and aggregations, kept separate from your OLTP store.

**NewSQL / distributed SQL (Spanner, CockroachDB, TiDB)** is the family people miss. It gives you **horizontal scale plus ACID and SQL** by auto-sharding data across nodes and using consensus (Raft/Paxos) to keep replicas consistent. The tradeoff versus a single Postgres is higher write latency per transaction (a commit needs a cross-node quorum) and operational complexity. So: choose NewSQL when you have genuinely outgrown one node **and** still need transactions and SQL, because the alternative is **app-level sharding** of MySQL/Postgres, where you hand-roll routing, cross-shard joins, resharding, and distributed transactions in application code. That is a large, permanent tax. NewSQL buys back most of that pain at the cost of latency and money.

**Polyglot persistence** means using several stores, each for what it is best at, and syncing between them: Postgres as the system of record, Redis for a hot cache, Elasticsearch for full-text, S3 for blobs, a warehouse for analytics via CDC. The cost is operational surface area and keeping derived data in sync, so you justify each store, you do not collect them.

**Interview nuance:** Reason with **PACELC**, not a CAP one-liner. CAP only speaks about behavior during a partition; PACELC adds the normal case: even when there is no partition (Else), you still trade **Latency** against **Consistency**. Spanner chooses consistency and pays latency; Dynamo chooses availability and latency and gives you eventual consistency. Naming PACELC signals you know CAP is not the whole story.

Recap: Drive from access pattern, consistency, scale, and query shape to a family, default to boring well-indexed relational, reach for NewSQL only when you have outgrown one node yet still need SQL and ACID (versus hand-rolled sharding), and treat polyglot persistence as a justified set of specialized stores, not a collection.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Recommend a datastore given a feature spec (workload mix, consistency needs, scale, and query shapes), justify it against the alternatives, and state explicitly when NewSQL beats app-level sharding.

**Think about:**
- Which decision drivers (access patterns, consistency, scale, query shape) dominate this spec?
- When does NewSQL / distributed SQL beat sharding MySQL/Postgres?
- When should you default to boring relational?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Since the prompt is generic, the strong answer is a **repeatable method plus a defended example**, and interviewers grade the method.

Method: extract the drivers before naming a technology. State the **access patterns** (query by which keys, joins needed?), the **read/write ratio and QPS** now and projected, the **consistency requirement** (does a stale or lost write cause a real bug: money, yes; a like count, no), the **scale** (does the working set fit one large node, roughly a few TB and tens of thousands of QPS?), the **p99 latency budget**, and **operational reality** (what does the team already run?). Only then map to a family.

Worked example: "a payments ledger, 5k writes/sec now, must never lose or double-count a transaction, needs multi-row transactions, queries by account and by time range." Consistency and transactions dominate, and 5k writes/sec fits one node, so the answer is **boring relational: a single primary Postgres** with read replicas for reporting, ACID transactions for the debit/credit pair, and a unique idempotency key to prevent doubles. I would defend this against Cassandra (rejected: no multi-row ACID, and last-write-wins risks losing a financial write) and against Mongo (rejected: I need cross-document transactions and strong consistency).

When NewSQL beats app-level sharding: when the same workload grows past one node, say 200k writes/sec and 40 TB, **and still needs SQL and ACID**. The alternatives are (a) shard Postgres by account id in the application, which forces me to hand-build routing, cross-shard transactions, resharding, and distributed joins forever, or (b) adopt **Spanner or CockroachDB**, which auto-shard and give ACID across shards via Raft consensus. NewSQL wins here: it buys back the sharding tax for the price of higher per-commit latency (a cross-node quorum) and cost. I frame it with **PACELC**: NewSQL chooses consistency and pays latency, which is correct for money.

Default to boring relational whenever the data is relational, transactions matter, and it fits one node. Common wrong turn: reaching for NoSQL "for scale" with no QPS or size evidence, when a well-indexed Postgres would serve the load for years with far less operational pain.

**Self-check rubric:**
- [ ] Extracts decision drivers (access pattern, consistency, R/W and QPS, scale, latency, ops) before naming a store.
- [ ] Maps the workload to a specific family and names concrete technologies.
- [ ] Defends the pick against at least one named alternative and says why it loses.
- [ ] States the NewSQL-vs-app-sharding threshold: outgrown one node yet still needs SQL + ACID.
- [ ] Uses PACELC (not just CAP) and defaults to relational when it fits.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose the datastores for building Discord (real-time chat) from scratch: billions of messages, a hot read pattern of "the most recent messages in a channel," presence for millions of concurrent users, and full-text search across message history. Justify each store and describe how they stay in sync (polyglot persistence).

**Model answer (revealed on demand):**

This is a polyglot problem: no single store wins all four workloads, so I assign each to the family that fits and sync between them.

Messages (the core): billions of rows, append-heavy writes, and the dominant query is "most recent N messages in channel X," which is a partition-plus-range read, not an ad hoc join. This is textbook **wide-column: Cassandra or ScyllaDB** (what Discord actually runs), partitioned by `(channel_id, time_bucket)` and clustered by message id descending so the hot "recent messages" read is a single-partition sequential scan. It absorbs the write firehose and scales horizontally. I explicitly reject a single Postgres here: at billions of messages and this write rate it exceeds one node, and the access pattern needs no joins.

Presence and sessions ("who is online," typing indicators): ephemeral, updated constantly, read by fan-out, and worthless if stale by a minute. This is **in-memory key-value: Redis**, keyed by user and channel with short TTLs. It gives single-digit-ms reads/writes and I do not care about durability, so its weakness does not bite.

Full-text search across history: neither Cassandra nor Redis does relevance-ranked text search, so I add **Elasticsearch** as a dedicated search store.

Systems of record for small relational data (users, servers, channel membership, permissions): a normal **relational store (Postgres, or Vitess-sharded MySQL)** because it is joinable, transactional, and small.

Keeping them in sync (the polyglot cost): the message write goes to Cassandra as the source of truth, then a **CDC or event stream (Kafka)** fans that write out to derived stores: an indexer consumes the stream and writes to Elasticsearch, so search is **eventually consistent** and can lag a few seconds, which is acceptable. Presence never syncs to the durable stores; it lives and dies in Redis. Common wrong turn: trying to serve recent-message reads, search, and presence all from one relational database, which either melts under write load or forces slow `LIKE` scans and hot-row contention. Each workload gets the store it deserves, and Kafka is the spine that keeps the derived copies in sync.
