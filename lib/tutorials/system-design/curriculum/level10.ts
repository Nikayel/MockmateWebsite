/**
 * System Design — Level 10: Applied Case Studies.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l10-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L10. 28 lessons across 5
 * modules (sd-l10-m1..m5) — the largest level. Same lesson shape as the earlier levels: `apply`
 * and `practice` are both required by `TutorialLesson<E>`; the player completes them together (one
 * design write per lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const urlShortenerTeach = `
## The canonical warm-up

The URL shortener is the canonical warm-up because it forces you to demonstrate estimation, key generation, a KV data model, and a read-heavy cache path in about 20 minutes, and it punishes anyone who reaches for a relational database by reflex.

## Estimate first

At 100M new links per day, writes are 100M / 86,400s which is roughly 1,160 writes/sec, call it about 1.2K QPS write. At 100:1 read:write that is roughly 116K reads/sec. Storage: each row is a short key (7 bytes), a long URL (say ~500 bytes), plus metadata, call it ~600 bytes. 100M/day times 365 is 36.5B links/year, times 600 bytes is roughly 20 TB/year of raw rows. That is small enough that the interesting problem is latency and throughput, not capacity.

## Key generation is the heart

Base62 (0-9, a-z, A-Z) gives 62^7 which is about 3.5 trillion combinations for a 7-char key, plenty of headroom. There are three real strategies. First, encode a globally unique counter (or a Snowflake ID) into base62. This is collision-free by construction and needs no read-before-write, but a naive single counter is a coordination bottleneck, so use ranged counter allocation (each app server leases a block of 10,000 ids) or a Snowflake generator. Second, hash the long URL (MD5/SHA) and take the first 7 chars. This gives idempotency for free (same URL maps to same key) but you must detect collisions with a read and retry with a salt. Third, pre-generate a large pool of unused keys offline and hand them out; this moves collision work out of the request path entirely.

**Interview nuance:** the single strongest sign of seniority here is refusing a relational table with an AUTO_INCREMENT primary key. It creates a write hotspot on the highest index page and does not shard cleanly. Say that out loud.

## The read path is a cache in front of a KV store

Because reads outnumber writes 100:1 and the mapping is immutable once created, this is the ideal caching workload: put Redis (or Memcached) in front of a sharded KV store (DynamoDB, Cassandra, or even sharded Postgres used as a KV table). Shard by the short key so lookups hit exactly one partition. A modest cache holding the hot working set absorbs the vast majority of the 116K reads/sec, and the KV store handles the long tail and all writes.

## Redirect semantics

A 301 (permanent) is cacheable by browsers and proxies, so the follow-up request may never reach your servers, which is great for load but blinds you to click analytics. A 302 (found/temporary) is not cached the same way, so every click hits you, which is what you want if analytics or per-click logic (expiry, A/B) is the product. Pick 302 when clicks are the business, 301 when raw redirect throughput is.

\`\`\`
GET /aX9k2Bq  ->  Redis GET aX9k2Bq  (hit ~99%)  ->  302 Location: https://long...
                       miss  ->  KV GET (sharded by key)  ->  fill Redis  ->  302
\`\`\`

**Recap:** estimate first (~1.2K writes/sec, ~116K reads/sec, ~20 TB/yr), generate keys with base62 of a counter/Snowflake to avoid collisions and hotspots, serve reads from Redis in front of a sharded KV store, and choose 301 vs 302 by whether you need click analytics.
`.trim()

const rateLimiterTeach = `
## Two things: the algorithm and distributed correctness

A rate limiter is a reusable component, so the interview is really about two things: which algorithm you pick and how you keep the counter correct across many stateless nodes. Get both right and the rest is response headers.

## Four algorithms

Fixed window counts requests per calendar minute: it is trivial (one counter, one TTL) but allows a 2x burst at the boundary, because 100 requests at 0:59 and another 100 at 1:00 both pass. Sliding window log keeps a timestamp per request and counts those within the last 60s: perfectly accurate but O(N) memory per key, which is expensive for hot keys. Sliding window counter approximates the log by weighting the previous window's count by how much of it overlaps the current one; it is the usual production choice because it kills the boundary burst with O(1) memory. Token bucket refills tokens at a fixed rate up to a capacity and spends one per request: it explicitly allows controlled bursts (up to the bucket size) while bounding the long-run rate, which is why AWS and Stripe use it. Leaky bucket smooths output to a constant rate (a queue drained at fixed speed), best when a downstream needs a steady feed rather than burst tolerance.

**Interview nuance:** when asked to "enforce 100 req/min," clarify whether bursts are acceptable. If yes, token bucket. If you need a hard, accurate cap with cheap memory, sliding window counter. Naming the burst-vs-accuracy tradeoff is what separates a strong answer.

## Placement and distributed correctness

You can limit at the client (cheap, but untrusted), at the API gateway or a sidecar (Envoy) close to the app (low latency, shared policy), or in a dedicated rate-limit service (clean but adds a network hop per request). For a fleet of stateless servers the shared state must live somewhere both nodes can see, which is where Redis comes in.

If each node keeps a local counter, a client hitting N nodes behind a load balancer gets up to N times the intended limit. So the counter is shared, usually in Redis. The naive \`GET\` then \`INCR\` is a race: two nodes read 99, both increment, both allow, and you overshoot. Fix it by making the check-and-increment atomic: either \`INCR\` first and compare the returned value (INCR is atomic and returns the new count), setting a TTL on first creation, or run a small Lua script that reads, decides, and writes in one round trip so no interleaving is possible. Sliding-window and token-bucket variants are almost always implemented as a single Lua script for exactly this reason.

## Clock skew and the availability call

Clock skew: token buckets computed from wall-clock refill must tolerate small skew, so compute refill on the Redis side (single clock) rather than each app node's clock. And the availability call: if Redis is down, do you fail open (allow all traffic, protecting user experience but exposing the backend to overload) or fail closed (reject, protecting the backend but causing an outage)? Public read APIs often fail open; a login or payment endpoint being protected from abuse fails closed. State the choice.

The response contract: return HTTP 429 Too Many Requests with a \`Retry-After\` header and \`RateLimit-Limit\` / \`RateLimit-Remaining\` / \`RateLimit-Reset\` headers so clients can back off gracefully, and support per-tier quotas (free vs paid API keys).

\`\`\`
Node A, Node B  ->  Redis (atomic Lua): count = INCR key; if first, EXPIRE 60
                    if count > 100  -> 429 + Retry-After
                    else            -> allow
\`\`\`

**Recap:** pick the algorithm by burst tolerance (token bucket) vs accurate hard cap (sliding window counter), keep the shared counter in Redis with an atomic INCR+TTL or Lua script to avoid the read-modify-write race, compute time on the Redis side to dodge clock skew, and consciously choose fail-open vs fail-closed on a Redis outage.
`.trim()

const uniqueIdGeneratorTeach = `
## Coordination-free is the whole point

The job is to hand out 64-bit, globally unique, roughly time-sortable IDs at millions per second without any node talking to any other node on the request path. Coordination-free is the whole point: a central sequence server would be a bottleneck and a single point of failure.

## The Snowflake bit budget

Snowflake's trick is to partition the ID space by bit budget so each node can mint IDs alone. A common 64-bit layout: 1 sign bit (unused, kept 0 so the number is positive), 41 bits of millisecond timestamp (since a custom epoch), 10 bits of machine/worker id, and 12 bits of a per-millisecond sequence counter. Do the arithmetic, because interviewers ask. 41 bits of ms is 2^41 milliseconds which is about 69 years of range from your epoch. 10 bits of worker id is 1,024 nodes. 12 bits of sequence is 4,096 ids per node per millisecond, which is about 4.096M ids per node per second, times 1,024 nodes is over 4 billion/sec of theoretical ceiling. You can rebudget the bits (fewer worker bits, more sequence) to match your fleet.

The ID is time-sortable because the timestamp occupies the high bits: sort the 64-bit integers and you get roughly chronological order, which is why these make excellent clustered primary keys. Within a single millisecond the sequence counter breaks ties and guarantees uniqueness; if the sequence overflows (more than 4,096 ids in one ms on one node), the generator waits (busy-spins) until the next millisecond.

**Interview nuance:** compare the alternatives out loud. UUIDv4 is random 128-bit: trivially coordination-free and unpredictable, but not sortable, and as a clustered index key its randomness scatters writes across the B-tree and fragments the index (the classic wrong turn). UUIDv7 and ULID fix that by putting a timestamp in the high bits (like Snowflake, but 128-bit and needing no worker-id assignment). DB auto-increment is perfectly sortable and compact but needs central coordination and does not shard. A ticket server (a dedicated ID service) centralizes allocation and reintroduces the bottleneck Snowflake exists to avoid. Snowflake wins when you want compact, sortable, coordination-free 64-bit keys and can manage worker ids.

## The clock is the weakness

Because the timestamp is in the high bits, if a node's clock jumps backward (NTP correction, VM migration), it could generate an ID with a smaller timestamp than one it already issued, risking a duplicate or breaking monotonicity. The standard defense: track the last-issued timestamp; if the current clock is behind it, refuse to issue IDs (throw, or wait) until the clock catches up, rather than emit a possibly-duplicate ID. Depend on NTP to keep clocks disciplined, but never trust it blindly.

Worker-id assignment is the other operational detail. Each node needs a unique 10-bit id. Assign it via a coordination service (ZooKeeper or etcd) that leases ids, or from a config/orchestrator on startup. Exhaustion (more than 1,024 live nodes) means you rebudget bits or recycle ids from dead nodes.

\`\`\`
 0 | 41 bits timestamp (ms since epoch) | 10 bits worker id | 12 bits sequence
   |<------------- high bits: sortable ------------->|<-- uniqueness within ms -->
\`\`\`

There is a real tension: sortability leaks information. A time-sortable ID reveals creation time and, worse, sequential-ish IDs let an attacker enumerate or estimate volume ("how many orders did they get today"). If unpredictability matters (public-facing resource ids), do not expose the raw sortable id; use a random UUID externally and keep the Snowflake id internal, or add a non-sequential public slug.

**Recap:** budget the 64 bits (timestamp high for sortability, worker id, sequence), which lets every node mint millions of unique IDs per second with zero coordination; defend the clock by refusing to issue on a backward jump; and remember that sortability trades away unpredictability, so hide raw ids when enumeration is a threat.
`.trim()

const typeaheadTeach = `
## A latency problem in a data-structure costume

Typeahead is a latency problem wearing a data-structure costume. The user types a prefix and expects the top 10 completions to appear within about 100ms, and they fire a request on nearly every keystroke, so the read path has to be brutally fast and the load has to be cut before it ever reaches your servers.

## The trie with cached top-k

The core structure is a trie (prefix tree): each node is a character, and a path from the root spells a prefix. The naive trie lookup walks to the prefix node, then does a subtree traversal to find all completions and rank them, which is too slow for a hot prefix with thousands of descendants. The production trick is to cache the top-k completions at every node. When you reach the node for "ne", the 10 best completions ("netflix", "news", "nest", ...) are already stored right there, so serving is O(length of prefix), single-digit milliseconds, no subtree walk. This precomputation is done offline or incrementally, not per request.

**Interview nuance:** the single most common wrong turn is \`SELECT ... WHERE term LIKE 'prefix%'\` against a SQL table on every keystroke. Even with an index, ranking and the per-keystroke QPS blow the 100ms budget under load. Say why a prefix tree with cached top-k beats it, and mention that a search engine (Elasticsearch completion suggester, which is FST/trie-backed) is the buy-not-build version.

## Ranking and freshness

Completions are scored by some blend of frequency (how often this query is issued), recency (trending terms weighted up via time decay), and personalization (this user's or this cohort's history). The scores are baked into the cached top-k per node, so ranking cost is paid offline. Weighted tries store the aggregate score alongside each terminal so the top-k selection is a simple heap over the subtree during the offline build.

Keeping suggestions fresh means updating from a stream. Query logs flow through Kafka; you either rebuild the trie in batch (hourly/daily) from aggregated counts, which is simple and consistent but stale by up to the batch interval, or apply incremental updates so a newly trending term (a breaking-news query) appears within minutes, at the cost of a more complex mutable structure. Most systems do a nightly full rebuild plus a fast incremental layer for trending terms.

## The load-shedding layer

Debounce on the client: wait ~150-300ms after the last keystroke before firing, so "netflix" sends one or two requests, not seven. Cache aggressively: the client caches results per prefix (typing then backspacing hits the cache), and because the same short prefixes are wildly popular, serve them from a CDN/edge cache with a short TTL. A huge fraction of traffic is a small set of hot prefixes, so edge caching plus debouncing removes most of the origin load before the trie is even consulted.

Finally, the quality details: fuzzy matching and typo tolerance (edit-distance or an n-gram index so "netlfix" still suggests "netflix"), and a profanity/safety filter so suggestions never surface offensive or unsafe completions.

\`\`\`
key "ne" -> trie walk n->e (O(2)) -> node holds cached top-10:
            [netflix, news, nest, netgear, ...]  -> return, ~few ms
   (before origin: client debounce 200ms + edge cache on hot prefixes)
\`\`\`

**Recap:** serve completions from a trie with top-k cached per node so lookup is O(prefix length) with no subtree walk, rank offline by frequency/recency/personalization, refresh from a Kafka stream (batch rebuild plus incremental for trending), and cut origin load with client debouncing and edge caching, never a per-keystroke SQL LIKE query.
`.trim()

const newsFeedTeach = `
## The whole interview hinges on "fan-out"

A home timeline shows a user the recent posts of everyone they follow, newest first, in under 200ms. The entire problem is a read-vs-write cost tradeoff, and the whole interview hinges on the word "fan-out."

## Fan-out-on-write (push)

When Alice posts, you immediately write that post id into the timeline cache of every follower. Reads become trivial: a follower's timeline is a precomputed list you slice with a cursor. The cost moves to write time. If Alice has 200 followers, one post is 200 small writes. That is fine until Alice is a celebrity with 50M followers, at which point a single tweet is 50M writes, a multi-minute fan-out that hammers the cache and delays delivery.

## Fan-out-on-read (pull)

Store each post once keyed by author. When Bob loads his timeline, fetch the recent posts of everyone Bob follows and merge them at read time. Writes are cheap (one insert). Reads are expensive: if Bob follows 2,000 accounts you issue a scatter-gather across 2,000 authors and merge-sort on every timeline load. That blows the 200ms budget for active users.

## The hybrid (the senior answer)

Fan-out-on-write for the common case, fan-out-on-read for celebrities. When you post, you push to normal followers' timelines. Accounts above a follower threshold (say 100K) are marked "celebrity" and are NOT pushed. At read time you take a user's precomputed timeline and merge in the recent posts of the handful of celebrities they follow, pulled live and cached briefly. Most users follow only a few celebrities, so the read-time merge is small and bounded. This caps write amplification and keeps reads fast.

\`\`\`
Alice posts
  |
  +-- Alice is normal?  push post_id -> timeline:<each follower>   (fan-out-on-write)
  +-- Alice is celeb?   do nothing on write; readers pull her recent posts

Bob loads timeline:
  precomputed timeline:Bob   (Redis list of post_ids)
  + merge recent posts of celebs Bob follows (pulled + cached)
  -> rank -> hydrate post bodies -> return page
\`\`\`

## Storage, ranking, deletes

Posts live once in a partitioned store (Cassandra or a sharded SQL, partitioned by post id or author). Per-user timelines are Redis lists or sorted sets of post ids (not full bodies), capped to a few hundred entries. You hydrate bodies in a second batched lookup. Pagination uses an opaque cursor (last post id or a score), never \`OFFSET\`, which degrades linearly.

Chronological is a sorted set scored by timestamp. ML-ranked timelines change the shape: fan-out now delivers candidates, and a ranking service scores them per request using features (author affinity, recency, engagement). You keep fan-out as candidate generation and add a scoring layer.

Because post bodies are stored once and timelines hold only ids, a delete is a tombstone on the post; readers filter tombstoned ids at hydration. You do not chase 50M cached copies. This is exactly why timelines store ids, not bodies: it keeps the source of truth single and makes deletes and edits O(1).

**Interview nuance:** the consistency-vs-freshness tradeoff. Fan-out-on-write means a follower may see a post seconds after it is created (async fan-out lag). That is acceptable for a feed. Do not promise read-after-write on someone else's timeline.

**Recap:** use a hybrid, push posts to normal followers' timelines and pull celebrities at read time, store post ids not bodies so deletes stay cheap, and paginate by cursor.
`.trim()

const instagramTeach = `
## A fan-out timeline bolted onto a media pipeline

Instagram is a fan-out timeline (you already know that half from the news-feed lesson) bolted onto a media pipeline. The new material is how you store and serve photos and videos.

## Split blob from metadata

The single most important decision: photos go in object storage (S3, GCS), and the database stores only metadata plus a pointer (the object key or URL). A post row is \`(post_id, user_id, caption, media_key, created_at, like_count)\`, a few hundred bytes. The 3MB photo never enters the database. Storing image bytes in Postgres or MySQL bloats the row store, wrecks buffer-cache hit rates, makes backups enormous, and cannot be served from a CDN. The metadata DB (users, posts, follows) can be a partitioned relational store or a KV store; the media store is separate and optimized for large immutable blobs.

## Presigned uploads

The naive path streams the photo through your app servers to S3, which doubles bandwidth and makes your app tier a throughput bottleneck. Instead the client asks the app server for a presigned S3 URL, then uploads the bytes directly to S3. Your app servers never touch the image bytes. The app tier does auth and issues a short-lived signed URL; S3 absorbs the upload.

\`\`\`
Client -> app: "I want to upload" -> app returns presigned PUT URL (+ media_key)
Client -> S3: PUT bytes directly (app never sees them)
S3 event -> queue -> transcode worker: make 1080/640/thumbnail variants
Worker -> writes variant keys; marks post ready; triggers feed fan-out
\`\`\`

## Async variants, CDN, feed reuse, counters

On upload you generate multiple resolutions and a thumbnail (1080w, 640w, 320w, a small square thumb) via a worker triggered by an S3 event through a queue. This is async so the user is not blocked. Clients request the resolution that fits their screen, saving bandwidth.

Media is immutable and read far more than written, the perfect CDN workload. Serve every image and thumbnail through a CDN (CloudFront, Fastly) so 90%+ of reads hit an edge cache near the user and never touch origin. Because media is immutable you set long TTLs and use a versioned key if you ever replace it.

The timeline is the same hybrid fan-out: push post ids to normal followers' timelines, pull for celebrity accounts, store ids not bodies, hydrate metadata in a batch, and resolve media keys to CDN links at render time.

Likes and comment counts on a viral post get millions of increments. A single \`UPDATE ... SET like_count = like_count + 1\` row is a hot-row contention nightmare. Shard the counter across N sub-counters and sum them, or maintain an approximate count in Redis flushed periodically. Exact like counts are not worth serializing every write.

**Interview nuance:** estimate to show you can size it. 100M photos/day at 2MB average is 200TB/day of new media before replication, and with 3x replication or erasure coding that is the storage bill the CDN then fronts. Read bandwidth dwarfs write bandwidth, which is the whole reason a CDN is non-negotiable.

**Recap:** metadata DB plus object storage plus CDN, upload direct to S3 with presigned URLs, generate resolution variants async, reuse hybrid fan-out for the feed, and never store image bytes in the database.
`.trim()

const chatMessagingTeach = `
## Real-time delivery at massive concurrency

Chat is a real-time delivery problem at massive concurrency. WhatsApp famously ran millions of connections per server. The interview lives in four areas: the connection layer, ordering, offline delivery, and group fan-out.

## Connection layer

Messaging needs the server to push to the client the instant a message arrives, so you hold persistent connections, WebSocket (or MQTT, which WhatsApp used for battery efficiency). A tier of connection servers each hold hundreds of thousands to millions of open sockets. A user is connected to exactly one connection server at a time; a routing layer (a session registry in Redis mapping \`user_id -> connection_server\`) knows where each user is. When Alice sends to Bob, the system looks up Bob's connection server and forwards the message there over an internal pub/sub backplane (Kafka or a Redis pub/sub / a dedicated message bus).

\`\`\`
Alice ==WS== connSrv-A          connSrv-B ==WS== Bob
                |                     ^
                v                     |
        session registry: Bob -> connSrv-B
                |                     |
                +---- pub/sub backplane (routes msg)
\`\`\`

## Ordering and dedup

Global ordering across all messages is neither needed nor affordable. What users need is per-conversation ordering: messages within one chat appear in a consistent order. Assign each message a per-conversation monotonic sequence number (or a Snowflake-style time-sortable id scoped to the conversation). Clients sort by it. Because networks retry, messages carry a client-generated message id so the server (and other clients) can dedup: if the same message id arrives twice, drop the duplicate. This makes sends idempotent.

## Delivery, offline, groups

Delivery is a state machine per message: sent (server accepted), delivered (recipient's device ACKed receipt), read (recipient opened the chat). Each transition is an ACK flowing back that updates message state and notifies the sender.

If Bob is offline, you cannot push. Persist the message in Bob's per-user inbox / mailbox (a durable store), and when Bob reconnects, his device pulls everything since its last acknowledged sequence number. The message store is a wide-column database (Cassandra / HBase) partitioned by conversation or by recipient, which suits the append-heavy, time-ordered access pattern. Messages are typically deleted or aged out after delivery to all devices.

A group message is written once and delivered to each member: look up each member's connection server (or inbox if offline) and forward. For small groups this is a simple loop. For very large channels (Telegram-style broadcast channels with millions of members) you need hierarchical distribution: shard the member list, fan out through layers of workers rather than one server pushing millions of copies, similar to the celebrity timeline problem.

Multi-device sync means a message must reach all of a user's devices and read state must converge, so the "recipient" is really a set of device sessions. End-to-end encryption (the Signal protocol) means the server routes ciphertext it cannot read; the server just stores and forwards opaque blobs.

**Interview nuance:** when asked about ordering, say "per-conversation ordering via sequence numbers," never "global ordering." Claiming a global total order across a billion users is the classic red flag.

**Recap:** hold WebSocket connections on a connection tier with a session registry, order per-conversation with sequence numbers, dedup by client message id, store-and-forward for offline users, and fan out groups (hierarchically for huge channels).
`.trim()

const notificationSystemTeach = `
## A reusable delivery backbone

A notification system is a reusable delivery backbone: something happens (a like, a shipped order, a fraud alert) and the user must be reached across push, SMS, email, and in-app, respecting their preferences, without ever double-sending. The design is a pipeline, and the interview probes channel abstraction, idempotency, and preferences.

## Channel abstraction with provider adapters

Do not scatter APNs, FCM, Twilio, and SES calls through your code. Define one internal notification, then route it to channel adapters. Each adapter (a Push adapter over APNs and FCM, an SMS adapter over Twilio, an Email adapter over SES) implements a common interface, handles that provider's quirks, retries transient failures with backoff, and can fail over to a backup provider (Twilio to a second SMS vendor). Adding a new channel is a new adapter, not a rewrite.

\`\`\`
event -> ingestion API -> queue
   -> preference/eligibility filter (opt-out? quiet hours? channel enabled?)
   -> template/render service (localized, per-channel)
   -> per-channel queues (priority lanes) -> provider adapters (retry/failover)
   -> provider (APNs/FCM/Twilio/SES) -> delivery-status callback -> tracking + DLQ
\`\`\`

## Queues, priority lanes, and idempotency

Ingestion just validates and enqueues, returning fast. Workers consume from the queue (Kafka or SQS) and do the heavy work: fan-out, rendering, and dispatch. Use priority lanes: a 2FA code or fraud alert goes on a high-priority queue and must not sit behind a million marketing pushes. Per-user rate limiting prevents bombarding one user, and per-provider throttling respects APNs/Twilio rate limits.

Every request carries an idempotency key (event id + user + channel). Before sending, check whether that key was already delivered (a dedup store in Redis with a TTL, or a unique constraint). Delivery pipelines retry constantly (a worker crashes after sending but before recording success, a queue redelivers), and without idempotency a retry sends the same push twice. The dedup check is what makes at-least-once delivery machinery feel exactly-once to the user.

## Templates, preferences, tracking

A template/rendering service turns an event plus data into channel-specific, localized content (a push has a title and short body, an email has HTML, an SMS has 160 characters). Keeping this separate means product can change copy without touching delivery.

A preference/eligibility filter runs before dispatch: has the user opted out of this category, is this channel enabled, is it their quiet hours (defer to morning), should low-priority notifications be batched into a digest? Digest/batching both respects the user and cuts provider cost.

Providers send delivery/open callbacks; record them. A dead-letter queue (DLQ) captures messages that fail after all retries for inspection and replay. Track send rate, delivery rate, and open rate per channel so you can see when APNs is degraded.

**Interview nuance:** the most common follow-up is "a worker retries and the user gets two pushes, why?" The answer names the idempotency key plus a dedup store checked before dispatch, and explains that the pipeline is at-least-once so dedup is mandatory, not optional.

**Recap:** an event flows through a queue to a preference filter, a renderer, priority per-channel lanes, and provider adapters with retries/failover, and an idempotency key checked against a dedup store is what prevents retries from double-sending.
`.trim()

const rideSharingTeach = `
## The canonical "moving objects" system

Ride-sharing is the canonical "moving objects" system. The defining property is that hundreds of thousands of drivers each emit a location update every 4 to 5 seconds, and riders ask "who is near me right now" against that constantly-changing set. Both the write rate and the spatial query are the hard parts, and a naive \`SELECT ... WHERE lat BETWEEN ? AND ? AND lng BETWEEN ?\` full scan collapses immediately: a bounding-box scan over millions of rows with no spatial index is O(n) per query, and you have thousands of queries per second.

## The spatial index

The fix maps 2D coordinates to a 1D sortable key so "nearby" becomes a range or key lookup:

- **Geohash**: interleaves lat/lng bits into a base-32 string; a shared prefix means spatial proximity. Simple and stringy, but has edge effects (two close points can straddle a cell boundary and share no prefix), so you always query the cell plus its 8 neighbors.
- **Quadtree**: recursively splits space into 4 quadrants, adapting depth to density. Great for skewed distributions (dense downtown, empty suburbs) but is a tree you must maintain in memory.
- **S2 (Google)** and **H3 (Uber)**: project onto a space-filling curve (S2 uses a Hilbert curve on a sphere; H3 uses hexagons). Hexagons matter because every neighbor is equidistant, which makes "expand the search ring" uniform. Uber built and open-sourced H3 for exactly this.

## Writes as overwrites, sharded by geography

For writes, the trick is to **not** treat driver locations as durable database rows. Locations are ephemeral: you only ever care about the latest one. Keep the live index in memory (Redis geospatial commands, or a sharded in-memory service) and treat the write as an overwrite, not an append. Shard the index **by geography** (city or region), because a rider in Chicago never needs a driver in Miami. Regional sharding keeps each shard's write volume and index size bounded and lets you scale cities independently.

\`\`\`
driver app --loc every 4s--> location ingest --> in-memory geo index (Redis/H3), sharded by city
rider request --> matching engine --> query index (cell + neighbor ring) --> rank candidates --> offer --> trip FSM
\`\`\`

## Dispatch, matching, and the trip FSM

The **dispatch/matching engine** does candidate generation (query the rider's H3 cell and its neighbor rings until it has enough drivers), then ranks by ETA (not raw distance, because a driver across a river is far by road), driver acceptance likelihood, and supply-demand balance. **Surge** is a pricing signal computed per cell from the ratio of open requests to available drivers. Once a driver accepts, a **trip state machine** (requested -> accepted -> arrived -> in-progress -> completed) becomes the source of truth, and this part **does** need durable, strongly consistent storage because it maps to money.

**Interview nuance:** the assignment must be exclusive. If you offer the same driver to two riders you double-book. Use a short lock or conditional write on the driver's state so only one match wins, and expire the offer if the driver does not accept in a few seconds so the driver returns to the pool. And hot cities (New Year's Eve downtown) concentrate load on one shard: degrade gracefully by lowering location-update frequency (QoS) and widening the matching radius under load rather than dropping updates blindly.

**Recap:** index moving drivers with a space-filling spatial index (H3/S2/geohash) sharded by geography, keep locations in memory as overwrites, and rank matches by ETA under an exclusive-assignment lock, with the trip state machine as the one strongly consistent part.
`.trim()

const fileSyncTeach = `
## The whole difficulty is in NOT uploading files

File sync looks like "upload files to the cloud," but the entire difficulty is in **not** uploading files. A 2GB video where a user changes one tag should cost a few kilobytes of network, not 2GB. Two people uploading the same popular PDF should cost one copy of storage. Editing offline on a laptop and a phone must reconcile without silently losing an edit. The core techniques are chunking, dedup, delta sync, and conflict resolution.

## Content-defined chunking

Instead of splitting a file into fixed 4MB blocks, CDC uses a rolling hash (Rabin fingerprint) over a sliding window and cuts a chunk boundary wherever the hash matches a pattern, yielding variable-size chunks averaging, say, 4MB. Why variable? Because if you insert one byte near the front of a file, fixed-size blocks all shift and every block hash changes, so the whole file re-uploads. CDC boundaries are anchored to content, so inserting a byte only changes the one chunk containing it; every other chunk keeps its old hash. Each chunk is hashed (SHA-256); the hash is both its content-address and its dedup key.

## Dedup and delta sync

Store each unique chunk hash exactly once in the object store. A file becomes a **manifest**: an ordered list of chunk hashes. If two files (or two users, with global dedup) share chunks, they share storage. **Delta sync** falls straight out: to sync a changed file the client computes the new manifest, sends only the hashes to the server, the server replies which hashes it already has, and the client uploads only the missing chunks.

\`\`\`
file --CDC--> [c1][c2][c3][c4]   each chunk -> SHA-256 -> content address
manifest = [h1, h2, h3, h4]
edit near start -> only c1 changes -> new manifest [h1', h2, h3, h4] -> upload 1 chunk
\`\`\`

## Metadata service and conflict resolution

Separate from blob storage, a metadata DB tracks: the file tree (paths, folders), each file's current manifest (chunk list) and version, per-device sync cursors, and sharing/ACLs. This is the coordination brain and needs strong consistency (a client must never see a manifest pointing at chunks that are not yet uploaded). The usual ordering: upload chunks to the object store first, then commit the metadata that references them.

Each file has a version vector or a monotonically increasing version. When a client uploads based on version N but the server is already at N+1 (someone else edited), that is a conflict. Dropbox's pragmatic answer is not to merge binary files: it keeps both, creating a "conflicted copy," so no edit is lost. The safe default is keep-both plus full version history so nothing is destroyed.

## The client sync protocol

A local filesystem watcher detects changes, an upload queue chunks and pushes, a download queue applies remote changes, and a persisted cursor tracks the last-seen server state so an interrupted sync resumes instead of rescanning everything. Offline edits queue locally and reconcile on reconnect against the server version.

**Interview nuance:** the tempting-but-wrong move is to compute deltas on the server. You cannot, because the server does not have the client's new bytes until they are uploaded. The client computes the manifest and asks the server which chunks are missing (a "have/need" negotiation), so the expensive comparison happens before any bulk transfer.

**Recap:** content-defined chunking plus per-chunk hashing gives dedup and delta sync (upload only changed chunks), a strongly consistent metadata service maps files to chunk manifests and versions, and conflicts are resolved by keeping both copies plus history rather than merging blindly.
`.trim()

const videoStreamingTeach = `
## Two problems bolted together

Video is two very different problems bolted together: an **asynchronous ingest/transcoding pipeline** (write path, minutes of latency, compute-heavy) and a **delivery path** (read path, milliseconds, bandwidth-heavy, CDN-dominated). Conflating them is the classic mistake. A single 4K source uploaded once may be watched a billion times, so the economics are entirely about the read path and egress cost.

## Ingest and transcoding

A raw upload lands in object storage (S3). You never serve that file. Instead a job is enqueued (SQS/Kafka) and a fleet of transcoding workers produces an **ABR ladder**: the same content re-encoded at multiple resolutions and bitrates (for example 240p at 400kbps, 480p, 720p, 1080p, 4K), each in modern codecs (H.264 for compatibility, plus H.265/VP9/AV1 for efficiency). Transcoding is embarrassingly parallel: split the video into segments, transcode segments across many workers, then assemble. Each rendition is cut into short **segments** (2 to 10 seconds) and described by a **manifest** (an HLS \`.m3u8\` or DASH \`.mpd\`) that lists the available bitrates and segment URLs.

\`\`\`
upload --> S3 (raw) --> transcode queue --> worker pool (segment-parallel)
   --> renditions [240p 480p 720p 1080p 4K] x segments --> manifest (HLS/DASH) --> object store --> CDN
\`\`\`

## Adaptive bitrate

The player, not the server, drives quality. It downloads the manifest, measures throughput and buffer level, and requests the next 4-second segment at whatever bitrate it can sustain. Bandwidth drops on a train, the player steps down to 480p mid-stream and steps back up later, all by choosing different segment URLs from the same manifest. This is why segmentation and per-bitrate manifests exist: they make quality a client-side, per-segment choice with no server session state.

## CDN, origin offload, and tiering

You must not serve segments from origin; a viral video would saturate origin egress and bankrupt you. Segments are cached at CDN edge PoPs close to viewers. Netflix built **Open Connect**, placing its own caches inside ISPs; YouTube uses Google's edge. The cache key is the segment URL, and because segments are immutable you cache them with long TTLs. For a live spike (a premiere), you pre-warm edges and rely on the CDN's request coalescing so a million viewers of the same segment produce one origin fetch.

The vast majority of the catalog is watched rarely. Keep hot content on fast storage and at many edges; tier cold content to cheaper storage (S3 Infrequent Access / Glacier) and fewer edges, re-warming on demand. Metadata and recommendations are a completely separate serving path from delivery.

**Interview nuance:** interviewers love "what happens the instant a video goes viral." The right answer names CDN request coalescing and edge caching absorbing the read fan-out, plus the fact that transcoding already happened once at upload so the spike is pure cached reads, not compute. If you find yourself scaling transcoding for a viral watch spike, you have conflated the write and read paths.

**Recap:** transcode once, asynchronously, into an ABR ladder of segmented renditions with manifests; let the client adapt bitrate per segment; and serve segments from a CDN (Open Connect-style edge caches) with long TTLs so origin egress stays flat even under viral read spikes.
`.trim()

const collaborativeEditorTeach = `
## The whole problem is convergence

The whole problem of a collaborative editor is **convergence**: many people edit the same document concurrently, each edit is applied against a slightly different local state, and yet every replica must end up byte-for-byte identical, while preserving what each user intended. Last-write-wins on the whole document is the disqualifying answer: if Alice and Bob both type at the same moment, LWW throws one person's work away. There are two correct families: **Operational Transformation (OT)** and **CRDTs**.

## Operational Transformation

Edits are operations like \`insert(pos=5, "x")\` and \`delete(pos=8)\`. When two operations are made concurrently against the same base, applying them in different orders gives different results, so OT **transforms** an incoming operation against operations that were applied before it locally, adjusting indices so intent is preserved. If Alice inserts at position 5 and Bob concurrently inserts at position 3, Bob's op shifts Alice's effective position to 6. OT is what Google Docs uses. It is proven and compact, but the transformation functions are notoriously subtle, and classic OT relies on a **central server** to impose a single canonical order of operations.

## CRDTs

Instead of transforming operations, CRDTs give every character a globally unique, totally-ordered identifier (often a fractional index or a dense position between two neighbors) so that concurrent inserts have a deterministic, commutative merge order with no transformation needed. Sequence CRDTs (RGA, Logoot, YATA as used by Yjs, Automerge) let replicas merge in any order and converge. The advantage is they work **peer-to-peer and offline** without a central sequencer; the cost is metadata overhead (every character carries an id, and deleted characters may linger as tombstones).

\`\`\`
OT:   op flows to server -> server orders + transforms against concurrent ops -> broadcasts transformed op
CRDT: each char has a unique id -> ops commute -> any replica merges in any order -> same result
\`\`\`

The tradeoff: **OT** is server-centric, memory-lean, battle-tested, but the transform logic is fragile and hard to extend to rich data. **CRDTs** are decentralization-friendly and offline-first, conceptually cleaner to reason about for convergence, but carry more per-character metadata and need periodic tombstone garbage collection. For a server-backed product like Docs, OT (or a server-ordered CRDT) is pragmatic; for offline-first or P2P (local-first apps, Figma-like tools), CRDTs shine.

## Transport, persistence, scaling

Edits flow over a persistent **WebSocket** to a per-document collaboration server. Beyond the edits themselves, you broadcast **presence**: each user's cursor position and selection, and who is online. Presence is high-frequency but ephemeral and lossy-tolerant, so you send it on a lighter channel and never persist it.

You do not save the document as a blob on every keystroke. You append operations to an **op log** and periodically write a **snapshot** so a new joiner can load the latest snapshot plus the tail of ops rather than replaying from creation. Undo/redo and history come from the op log. On reconnect after being offline, the client sends its queued local ops and receives the ops it missed (identified by a version/sequence number), then transforms or merges to catch up.

All editors of one document must reach the same collaboration server (or a consistent group) so ordering is coherent, so you **route by document id** to a specific server/shard (sticky, consistent-hashed). Different documents scale out horizontally.

**Interview nuance:** the killer follow-up is offline editing. If a laptop edits offline for an hour and reconnects, you cannot LWW. You must replay/merge the queued ops against everything that happened meanwhile. CRDTs make this natural (merge is commutative); OT requires transforming the whole queued batch against the missed history.

**Recap:** converge concurrent edits with OT (server-ordered, transform indices, memory-lean, Docs-style) or CRDTs (per-character ids, commutative merge, offline/P2P-friendly), broadcast ephemeral presence over WebSocket, persist an op log plus snapshots for replay and reconnect, and route all editors of a document to one server for coherent ordering.
`.trim()

const yelpNearbyTeach = `
## Why nearby-places is the opposite of Uber matching

Yelp's "nearby places" looks like Uber matching at first glance (both are "find things near me"), and the whole lesson is why it is actually the **opposite** workload. In Uber, the points (drivers) move every few seconds, so writes dominate and you keep the index in memory as overwrites. In Yelp, the points (restaurants, shops, POIs) barely move; a place's location changes essentially never, its hours and rating change rarely. The workload is **read-heavy over a mostly-static dataset**, which flips every design decision toward precomputation, denormalization, and aggressive caching.

Scale assumption: tens of millions of POIs, very high read QPS, queries like "coffee within 2km, open now, sorted by rating and distance." The spatial part is only half the query; the other half is **attribute filtering** (category, open-now, price, minimum rating) and **ranking**.

## The spatial index is a search engine

You still bucket coordinates into cells (geohash, quadtree, or S2), so a radius query hits a cell plus its neighbors. But instead of a bespoke in-memory geo service, the natural home is a **search engine (Elasticsearch/OpenSearch)** with a native \`geo_distance\` filter, because it does spatial filtering, attribute filtering, full-text ("coffee"), and ranking in one query. This is the key architectural difference from Uber: Yelp's index is a search index you can rebuild from source, not a volatile live index.

\`\`\`
source of truth (Postgres/doc store)  --pipeline-->  denormalized read model in Elasticsearch (geo + attrs + text)
place edits/new reviews (low rate) --> update pipeline --> reindex
query --> [ES: geo_distance cell + filters + rank] --> results, with popular (cell,filter) pages cached
\`\`\`

## Query flow, storage, caching

Query flow: (1) candidate generation by spatial cell/radius; (2) attribute filter: category, open-now (computed from stored hours plus current time), price band, minimum rating; (3) rank by a blend of distance, rating, review count/popularity, and sponsored boost.

Source of truth for places, reviews, and edits lives in a relational or document store. A **denormalized read model** (the ES index) is what queries hit. Place **detail** pages go in a KV cache (Redis). Photos and media sit on a CDN.

Because the underlying data is stable, you cache hard: popular \`(cell, filter)\` result pages and place-detail pages get **generous TTLs** (minutes to hours). A search for "coffee near downtown SF, open now" is asked constantly and its answer barely changes, so it should be served from cache the overwhelming majority of the time. Invalidate on the rare place update rather than expiring everything constantly. Reads scale with replicas (ES read replicas) and CDN edge caching.

New reviews, edits, and new places are comparatively low-rate. They update the source of truth, then flow through an indexing pipeline that updates the ES read model and invalidates affected cache entries. You never optimize this path for high throughput because the workload does not have it.

**Interview nuance:** the trap is to over-engineer the write path. If you find yourself building a high-frequency location-write ingestion system or geofencing with constant updates, you have modeled Yelp like Uber and wasted your design budget on throughput the workload never generates. The senior move is to explicitly state "this is read-heavy and mostly static, so I precompute and cache instead of optimizing writes."

**Recap:** nearby-places is read-heavy over a near-static POI set, so serve it from a search engine (geo_distance plus attribute filters plus ranking) fed by a denormalized read model, cache popular result pages and detail pages with generous TTLs invalidated on rare edits, and do not over-build the low-rate write path.
`.trim()

export const systemDesignLevel10: DesignLevel = {
  id: 10,
  slug: "case-studies",
  title: "Level 10 — Applied Case Studies",
  tagline:
    "The full-length 'design X' interviews: foundational building blocks, social and feed, geo and media, storage and infra systems, and commerce, money, and analytics.",
  estimatedHours: 16,
  modules: [
    {
      id: "sd-l10-m1",
      title: "Foundational Building Blocks",
      description:
        "Run the four warm-up 'design X' interviews that show up in almost every loop (URL shortener, distributed rate limiter, Snowflake ID generator, and typeahead), moving cleanly from back-of-envelope estimation to a concrete data model, a read path, and the one deep dive each problem is really testing.",
      lessons: [
        {
          id: "sd-l10-url-shortener",
          title: "Design a URL Shortener (TinyURL)",
          summary:
            "Estimate first (~1.2K writes/sec, ~116K reads/sec, ~20 TB/yr), generate keys with base62 of a counter/Snowflake to avoid collisions and hotspots, serve reads from Redis in front of a sharded KV store, and choose 301 vs 302 by whether you need click analytics.",
          estimatedMinutes: 35,
          difficulty: "easy",
          skills: ["url-shortener", "kv-store", "caching"],
          teach: {
            markdown: urlShortenerTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l10-url-shortener-apply",
            prompt:
              "Design a service that returns a 7-character short URL for any long URL and redirects on lookup, at 100M new links/day and 100:1 read:write.",
            thinkAbout: [
              "How do you generate a short, collision-free key?",
              "Why is a cache in front of a KV store the right read path?",
              "301 vs 302 redirect: how does it interact with analytics and caching?",
            ],
            modelAnswerOutline: [
              "Assumptions: 100M links/day, 100:1 reads, keys never change once created, custom aliases and optional expiry are in scope, correctness on collisions is required. Estimation: ~1,160 writes/sec, ~116K reads/sec, ~600 bytes/row, ~20 TB/year. This is a latency and throughput problem, not a storage one.",
              "**API:** `POST /urls {longUrl, customAlias?, ttl?}` returns `{shortUrl}`; `GET /{key}` returns a 301 or 302 redirect. Creation is idempotent per longUrl unless a custom alias is requested. **Data model:** a single logical table `links(short_key PK, long_url, created_at, expires_at, owner_id)` in a KV store (DynamoDB or Cassandra) sharded by `short_key`. No relational joins are needed, so a relational DB and its auto-increment PK are the wrong tool.",
              "**Key generation:** allocate a globally unique 64-bit id from a Snowflake generator (or ranged counter blocks leased per server) and base62-encode it to 7 chars. This is collision-free by construction with no read-before-write, and it avoids the single-counter bottleneck. If we instead hash the URL for idempotency, we detect the rare collision with a conditional put and retry with a salt.",
              "**Read path:** Redis in front of the KV store. Because mappings are immutable and reads dominate 100:1, cache hit rate is very high; the hot working set fits comfortably in memory. On a miss, read the shard, backfill the cache, and redirect. This lets a small fleet serve 116K reads/sec.",
              "**Redirect choice:** use 302 if click analytics or expiry enforcement is the product (every click reaches us), or 301 if we only care about redirect throughput and want browsers and CDNs to cache the hop. Extras: idempotency (same longUrl returns the same key via a URL-hash lookup), custom aliases as reserved keys with a uniqueness check, TTL/expiry via `expires_at` plus a lazy check on read and a background sweeper.",
              "Tradeoffs: base62-of-counter buys collision-freedom and sortability at the cost of guessable, enumerable keys; if enumeration is a concern, add random bits or use a hash. Common wrong turn: a relational DB with an AUTO_INCREMENT primary key, which creates an index write hotspot and shards poorly at this write rate.",
            ],
          },
          practice: {
            id: "sd-l10-url-shortener-practice",
            prompt:
              "Design the redirect and link-creation path for Bitly's enterprise tier, where paid customers require real-time click analytics (geo, device, referrer) on every click, custom branded domains, and 99.99% redirect availability, at a sustained 500K redirects/sec globally.",
            thinkAbout: [
              "Why can't you rely on browser-cached 301s when analytics is the paid feature?",
              "How do you keep the redirect path fast while counting every click?",
              "How do branded domains and 99.99% availability shape the design?",
            ],
            modelAnswerOutline: [
              "Assumptions: every click must be counted (analytics is the paid feature), branded domains multiply the routing table, and availability is contractual (99.99% is ~52 min/year of downtime budget).",
              "**Every click must reach us**, so use 302 redirects (not browser-cached 301s), and put the redirect service at the edge (Anycast plus regional POPs) to hold the sub-50ms budget globally. The short-key -> long-URL map is immutable and small enough to replicate fully to every region; push it to a per-region cache (Redis or in-process LRU) backed by a globally replicated KV store (DynamoDB global tables). A redirect is then a pure in-memory lookup plus a fire-and-forget analytics event.",
              "**Analytics path:** on each redirect, emit an event (key, timestamp, geo from edge, user-agent, referrer) to Kafka rather than writing to a DB inline. A stream processor (Flink) aggregates counts into per-link rollups (per minute, hour, day) in a time-series or wide-column store, and raw events land in S3 for ad-hoc queries. This decouples the 500K/sec redirect path from analytics durability: if the pipeline lags, redirects are unaffected, and we accept eventual (seconds) freshness on dashboards.",
              "**Branded domains:** store a `domain -> tenant` mapping and namespace keys by tenant so `acme.link/promo` and `globex.link/promo` do not collide. TLS is handled with on-demand certificate issuance (ACME) per custom domain, cached at the edge.",
              "**Availability:** the redirect path has no synchronous dependency on a primary DB (it reads a replicated cache), so a regional DB failure still serves redirects from cache. Analytics is fail-open: if Kafka is unreachable, buffer events locally and keep redirecting rather than dropping the click or the redirect. Multi-region active-active with health-checked Anycast gives the four nines.",
              "Tradeoff: full replication of the key map to every region costs memory and write-propagation lag (new links visible after replication catches up, typically sub-second), acceptable for a globally fast, always-available redirect. Common wrong turn: writing an analytics row synchronously on the redirect path, coupling click-counting durability to redirect latency and availability.",
            ],
          },
        },
        {
          id: "sd-l10-rate-limiter",
          title: "Design a Distributed Rate Limiter",
          summary:
            "Pick the algorithm by burst tolerance (token bucket) vs accurate hard cap (sliding window counter), keep the shared counter in Redis with an atomic INCR+TTL or Lua script to avoid the read-modify-write race, compute time on the Redis side to dodge clock skew, and consciously choose fail-open vs fail-closed on a Redis outage.",
          estimatedMinutes: 35,
          difficulty: "medium",
          skills: ["rate-limiter", "redis", "distributed"],
          teach: {
            markdown: rateLimiterTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l10-rate-limiter-apply",
            prompt:
              "Design a rate limiter that enforces 100 req/min per API key across a fleet of stateless servers.",
            thinkAbout: [
              "Which algorithm balances burst tolerance and accuracy?",
              "How do you keep the shared counter atomic across nodes?",
              "What is the fail-open vs fail-closed decision on a Redis outage?",
            ],
            modelAnswerOutline: [
              "Assumptions: many stateless app servers behind a load balancer, the limit is per API key, small bursts are tolerable but the long-run cap must hold, and the limiter must add well under 5ms to the request.",
              "**Algorithm:** sliding window counter as the default because it enforces an accurate 100/min without the fixed-window boundary burst and uses O(1) memory per key. If the product wants to allow short bursts, token bucket (capacity 100, refill 100/60s) is the alternative; I confirm burst policy with the interviewer and name the tradeoff.",
              "**Placement:** enforce at the API gateway or an Envoy sidecar so every request is checked close to the app with shared policy, and keep the shared state in Redis so all nodes see one counter. Local-only counters are wrong: a client spread across N nodes would get up to Nx the limit.",
              "**Atomicity:** the counter operation must be a single atomic step. Use a Lua script (or `INCR` + conditional) executed in Redis: read the current count for `key = ratelimit:{apiKey}:{window}`, decide allow/deny, and increment in one round trip so two nodes cannot both read 99 and both allow. Set the TTL to the window length on creation so keys expire automatically. Computing the window and any token refill on the Redis side uses a single clock and sidesteps app-node clock skew.",
              "**Outage behavior:** if Redis is unreachable, this API fails open (allow) for a public, non-destructive endpoint to protect user experience, with an alert and a short local fallback limiter; for an abuse-sensitive endpoint (login, payments) it fails closed. I state the choice explicitly.",
              "**Response contract:** on limit, return 429 with `Retry-After` and `RateLimit-*` headers; support per-tier quotas by keying the limit on the API key's plan. Common wrong turn: per-node local counters (client gets Nx the limit) or a non-atomic GET-then-INCR that races under concurrency and overshoots.",
            ],
          },
          practice: {
            id: "sd-l10-rate-limiter-practice",
            prompt:
              "Design Stripe's API rate limiter, which must enforce multiple simultaneous limits per account (a steady request-rate limit, a concurrent-request limit, and a per-endpoint limit on expensive operations like charge creation) across a global multi-region fleet handling hundreds of thousands of requests/sec, while staying fast enough to add negligible latency.",
            thinkAbout: [
              "Why layer several limiter types, and what does the concurrency limiter catch?",
              "Why enforce per-region buckets instead of a strict global counter?",
              "How do you keep the limiter within a single-digit-ms budget?",
            ],
            modelAnswerOutline: [
              "Assumptions: several limiter types run at once, limits are per account and per endpoint, traffic is global, and the limiter is on the hot path so it must be a single-digit-millisecond in-region operation.",
              "**Layered limiters, each a Redis Lua token bucket** (Stripe's public design favors token buckets for controlled bursts). Layer one: a request-rate limiter (tokens/sec per account). Layer two: a concurrency limiter counting in-flight requests (increment on start, decrement on completion, reject over the concurrent-slot budget), protecting against slow requests piling up even when the rate looks fine. Layer three: a per-endpoint limiter with tighter buckets for expensive operations (charge creation, report generation) so a costly endpoint cannot starve cheap traffic. A request must pass all applicable layers.",
              "**Locality and scale:** run the limiter in the same region as the request and shard the Redis keyspace by account so a hot account's counters live on one node and lookups are one round trip. Keep the script tiny with a strict timeout; on Redis failure, fall back to a permissive local limiter, fail open for read APIs, fail closed for mutating money endpoints.",
              "**Global consistency:** strict global counting across regions needs cross-region coordination that blows the latency budget, so enforce per-region buckets sized to the account's share and accept that a client spraying across regions could briefly exceed the global cap by a bounded amount, a deliberate accuracy-for-latency trade.",
              "**Load shedding** sits above all of this: when the overall system is unhealthy, a separate shedder drops the lowest-priority traffic (test-mode calls, non-critical endpoints) first.",
              "Response: 429 with `Retry-After`, plus a distinct signal for concurrency-limit rejections so clients reduce parallelism rather than just slow their rate. Common wrong turn: a single global counter with cross-region synchronous coordination, trading away the latency budget for accuracy the business does not need.",
            ],
          },
        },
        {
          id: "sd-l10-unique-id-generator",
          title: "Design a Distributed Unique ID Generator (Snowflake)",
          summary:
            "Budget the 64 bits (timestamp high for sortability, worker id, sequence), which lets every node mint millions of unique IDs per second with zero coordination; defend the clock by refusing to issue on a backward jump; and remember that sortability trades away unpredictability, so hide raw ids when enumeration is a threat.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["snowflake", "id-generation", "clocks"],
          teach: {
            markdown: uniqueIdGeneratorTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l10-unique-id-generator-apply",
            prompt:
              "Design a service issuing 64-bit, time-sortable, globally unique IDs at millions/sec without central coordination.",
            thinkAbout: [
              "How do you budget the bits (timestamp, worker, sequence)?",
              "How do you handle clock skew and rollback?",
              "What is the sortability vs unpredictability tension?",
            ],
            modelAnswerOutline: [
              "Assumptions: we need compact 64-bit ids (they will be clustered primary keys), rough time ordering is desired, and the generator must run locally on each node with no per-request coordination.",
              "**Layout:** a Snowflake scheme in 64 bits: 1 sign bit (0), 41 bits of millisecond timestamp from a custom epoch (~69 years of range), 10 bits of worker id (1,024 nodes), 12 bits of per-ms sequence (4,096 ids/ms/node). That yields ~4.096M ids/node/sec and over 4B/sec across a full fleet, comfortably meeting millions/sec. I would rebudget (fewer worker bits, more sequence) if the fleet is small but very hot.",
              "**Why this and not alternatives:** it is coordination-free (each node mints alone), sortable (timestamp in the high bits, so ids double as chronological clustered keys), and compact (64-bit fits a BIGINT). A DB auto-increment needs central coordination and does not shard; a ticket server reintroduces a bottleneck; UUIDv4 is coordination-free but random, so not sortable and fragments a clustered index. UUIDv7/ULID are good 128-bit alternatives if I do not want to manage worker ids.",
              "**Clock handling:** because the timestamp drives ordering, a backward clock jump could produce a duplicate or non-monotonic id. The generator tracks the last-issued timestamp; if the current time is less than it, it refuses to issue (waits or throws) until the clock catches up. Sequence overflow within a millisecond makes the node spin to the next ms. NTP keeps clocks disciplined but is not trusted blindly.",
              "**Worker-id assignment:** lease unique ids from ZooKeeper/etcd (or inject via the orchestrator on startup); recycle ids from dead nodes; rebudget bits if we exceed 1,024 live nodes.",
              "**Sortability vs unpredictability:** sortable ids leak creation time and enable enumeration and volume estimation. If ids are public, I expose a random UUID or opaque slug externally and keep the Snowflake id internal. Common wrong turn: using random UUIDv4 as a clustered primary key, which scatters inserts across the index and fragments it.",
            ],
          },
          practice: {
            id: "sd-l10-unique-id-generator-practice",
            prompt:
              "Design the primary-key generation strategy for Discord's message store, which writes billions of messages/day into Cassandra, needs ids that sort by creation time so a channel's history can be range-scanned efficiently, and must let clients derive a message's approximate timestamp from its id offline, all without a central sequence service.",
            thinkAbout: [
              "How does a time-sortable id become the Cassandra clustering key and cursor?",
              "How do clients decode the timestamp offline from the id?",
              "Why is per-channel ordering enough despite small cross-worker clock differences?",
            ],
            modelAnswerOutline: [
              "Assumptions: writes are enormous (billions/day), messages are stored in Cassandra partitioned by channel, and the id must be both the ordering key for range scans and a client-decodable timestamp source. This is exactly the Snowflake use case, and Discord in fact uses Snowflake ids.",
              "**Design:** generate 64-bit Snowflake ids with the timestamp in the high 41 bits from a Discord-specific epoch (not Unix, to maximize usable years), then worker and process bits, then a per-ms sequence. Store messages in Cassandra with partition key `channel_id` and clustering key the Snowflake `message_id` ascending. Because the id sorts by time, fetching a channel's recent history is a single efficient clustering-order range scan (id < cursor, limit 50), and pagination just carries the last id as the cursor. No secondary time index is needed because time is embedded in the key.",
              "**Client-side timestamp:** since the epoch and bit layout are published, a client extracts `(id >> 22) + epoch` to recover the creation time in milliseconds without a server round trip, powering relative timestamps and offline ordering reasoning.",
              "**Coordination-free at scale:** each id-generating worker mints locally, so billions/day spread across many workers never touch a central sequence; 4,096 ids/ms/worker is far more than any worker needs. Worker/process ids are assigned at process startup.",
              "**Clock safety:** a backward clock jump on a worker would risk a duplicate or out-of-order id in a channel, so the generator refuses to issue while its clock is behind the last-issued timestamp, and hosts run disciplined NTP. Because ordering only needs to be correct per channel and ids are globally unique, small cross-worker clock differences only perturb the ordering of messages sent within the same millisecond, which is acceptable.",
              "Tradeoff: embedding time in the key makes ids enumerable and leaks message volume per channel, but message ids are already scoped to authorized channel members, so the risk is contained; the payoff is index-free time-ordered range scans and offline-decodable timestamps. Common wrong turn: random UUID message ids, which force a separate time index and make Cassandra range scans and cursor pagination far more expensive.",
            ],
          },
        },
        {
          id: "sd-l10-typeahead",
          title: "Design Typeahead / Autocomplete",
          summary:
            "Serve completions from a trie with top-k cached per node so lookup is O(prefix length) with no subtree walk, rank offline by frequency/recency/personalization, refresh from a Kafka stream (batch rebuild plus incremental for trending), and cut origin load with client debouncing and edge caching, never a per-keystroke SQL LIKE query.",
          estimatedMinutes: 35,
          difficulty: "medium",
          skills: ["typeahead", "trie", "ranking"],
          teach: {
            markdown: typeaheadTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l10-typeahead-apply",
            prompt:
              "Design autocomplete that returns the top 10 ranked completions within 100ms as a user types a prefix.",
            thinkAbout: [
              "How does a trie with cached top-k per node serve sub-100ms?",
              "How are suggestions ranked and updated from a stream?",
              "How do debouncing and edge caching cut load?",
            ],
            modelAnswerOutline: [
              "Assumptions: top 10 completions, hard 100ms budget, a request per keystroke at high QPS, and suggestions ranked by popularity with some recency, refreshed regularly rather than in real time.",
              "**Serving structure:** a trie where every node caches its top-10 completions (with scores) precomputed offline. A lookup walks the prefix (O(prefix length), a handful of characters) and returns the node's cached list with no subtree traversal, so serving is single-digit milliseconds, well inside 100ms. Hold the trie in memory on the suggestion service (sharded by prefix range if it does not fit one box), or buy it as an Elasticsearch completion suggester (FST-backed).",
              "**Ranking:** score completions offline by a blend of frequency (dominant), recency via time decay (so trending terms rise), and optional personalization from the user's or cohort's history. Because scores are baked into the cached top-k, ranking costs nothing at request time.",
              "**Freshness from a stream:** query logs flow through Kafka. A batch job aggregates counts and rebuilds the trie nightly for consistency, and a lightweight incremental path promotes newly trending terms within minutes. This is the batch-vs-incremental tradeoff: batch is simple and stale, incremental is fresh and complex, so I do both.",
              "**Cutting load before the origin:** debounce on the client (fire ~200ms after the last keystroke, collapsing seven keystrokes into one or two calls), cache results per prefix on the client (backspacing is a cache hit), and put hot short prefixes behind a CDN/edge cache with a short TTL. Because a small set of prefixes carries most traffic, these three together remove the majority of origin QPS.",
              "**Quality:** typo tolerance via an edit-distance or n-gram fallback so 'netlfix' still resolves, and a profanity/safety filter applied at build time. Common wrong turn: a per-keystroke `LIKE 'prefix%'` SQL query, which cannot hit the latency budget under this QPS and does not rank well.",
            ],
          },
          practice: {
            id: "sd-l10-typeahead-practice",
            prompt:
              "Design Google-scale search autocomplete: personalized, trend-aware suggestions in multiple languages returned within 100ms at the p99, at hundreds of thousands of prefix queries/sec globally, where a breaking-news query must start appearing in suggestions within minutes.",
            thinkAbout: [
              "How do you personalize without building a per-user trie?",
              "How do you get trending terms into suggestions within minutes?",
              "How does the system fail soft when a shard times out?",
            ],
            modelAnswerOutline: [
              "Assumptions: global multi-region traffic, hundreds of thousands of QPS, a hard 100ms p99, per-user personalization on top of global popularity, multilingual input, and minutes-fresh trending.",
              "**Serving:** a distributed in-memory trie with top-k cached per node, sharded by prefix and replicated to every region so a lookup is a local, in-region, single-digit-millisecond operation. Front it with per-region edge caches; because a small set of prefixes dominates, edge caching plus client debouncing (200ms) absorbs most of the QPS before it reaches the trie fleet. Language is part of the shard key so multilingual tries are served from the right index, with the user's locale narrowing candidates.",
              "**Two-layer ranking:** a global base score (frequency plus time-decayed recency) is precomputed and baked into the cached top-k. Personalization is a fast re-rank applied at request time over the small candidate set (10-20 items): blend the global candidates with the user's recent-query signals and a lightweight model, cheap because it only re-scores a handful of items. This keeps personalization within budget without a per-user trie.",
              "**Trending in minutes** is the hard freshness requirement. Query events stream through Kafka into a real-time aggregation (Flink) computing short-window trending scores; a fast incremental updater pushes newly hot terms into the live tries within minutes, layered on a nightly full rebuild that guarantees a consistent global baseline. The deliberate batch-plus-incremental split: batch for correctness and coverage, streaming for trending latency.",
              "**Reliability and quality:** fail soft, since a missing suggestion is not an outage, so on a shard timeout return the global (non-personalized) top-k rather than blocking. Apply per-language profanity and safety filters at build time, and add typo tolerance via an n-gram/edit-distance fallback.",
              "Common wrong turn at this scale: building a full per-user trie (memory explosion) or re-ranking the entire subtree per request; instead personalize by re-ranking a tiny candidate set and keep the heavy popularity ranking offline.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l10-m2",
      title: "Social, Feed & Messaging",
      description:
        "Whiteboard the four social-scale classics under interview time pressure: a fan-out timeline with celebrity hot keys, a photo-sharing app that splits blobs from metadata behind a CDN, a real-time chat system with per-conversation ordering and offline delivery, and a reusable multi-channel notification backbone.",
      lessons: [
        {
          id: "sd-l10-news-feed",
          title: "Design a News Feed / Timeline (Twitter)",
          summary:
            "Use a hybrid fan-out, push posts to normal followers' timelines and pull celebrities at read time, store post ids not bodies so deletes stay cheap, paginate by cursor, and accept async fan-out lag (seconds) as the freshness tradeoff.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["news-feed", "fan-out", "celebrity"],
          teach: {
            markdown: newsFeedTeach,
            estimatedMinutes: 15,
          },
          apply: {
            id: "sd-l10-news-feed-apply",
            prompt:
              "Design a home timeline that shows a user the recent posts of everyone they follow, at read latency under 200ms.",
            thinkAbout: [
              "When do you fan out on write vs on read?",
              "How does a hybrid handle celebrity accounts?",
              "How do ranking and deletes/edits change the design?",
            ],
            modelAnswerOutline: [
              "Assumptions: 300M users, average 200 follows, a heavy read skew, p99 read under 200ms, feed freshness of a few seconds is acceptable. Estimate: if 10% of users post twice a day that is 60M posts/day, ~700 posts/sec average and maybe 10x at peak. Read QPS is far higher, hundreds of thousands per second.",
              "**API:** `POST /posts`, `GET /timeline?cursor=<opaque>&limit=20`, `POST /follow`. **Data model:** `posts(post_id snowflake PK, author_id, body, created_at)` in Cassandra partitioned by post id (time-sortable ids for free). `follows` and its inverse for fan-out. Per-user timeline as a Redis sorted set `timeline:<user>` scored by post time, capped at ~800 ids.",
              "**Write path:** publish each post to Kafka; a fan-out worker looks up the author's followers. If the author is normal, it pushes the post id into each follower's Redis timeline. If the author is a celebrity (follower count over 100K), it skips fan-out.",
              "**Read path:** load `timeline:<user>`, merge in recent posts from the small set of celebrities the user follows (each celebrity's recent posts cached), rank (chronological or ML), then batch-hydrate bodies from Cassandra and return a page by cursor.",
              "**Deep dive, the celebrity hot key:** pure fan-out-on-write for a 50M-follower account is 50M writes per tweet, saturating the cache and delaying delivery by minutes. The hybrid caps write amplification because celebrities are pulled, and caps read cost because a user follows only a few celebrities.",
              "Tradeoffs: async fan-out means eventual timeline freshness (seconds of lag), fine for a feed. Deletes are tombstones filtered at hydration, so a delete is O(1) rather than chasing millions of cached copies. Common wrong turn: pushing a celebrity's post to all 50M followers on write, or storing full post bodies in every timeline (making edits/deletes an O(followers) rewrite).",
            ],
          },
          practice: {
            id: "sd-l10-news-feed-practice",
            prompt:
              "Design the timeline for X (Twitter) during a live event like the World Cup final, where a single account (the official league account) with 90M followers posts a goal, and 30M users are refreshing their timeline in the same 60-second window. Explain how you keep both the write and read paths from collapsing.",
            thinkAbout: [
              "Why is this a read hot-key problem, not a write-throughput problem?",
              "How do hot-key replication, coalescing, and short local caches survive 500K read QPS on one key?",
              "How does ranking degrade gracefully under the spike?",
            ],
            modelAnswerOutline: [
              "Assumptions: one hot author (90M followers, celebrity-tier so never fanned out on write), a spike of 30M concurrent readers in a minute, and a demand to see the goal within a few seconds.",
              "**Write path:** the goal post is one insert into Cassandra. Because the account is celebrity-tier, there is zero fan-out on write, so the 'goal tweet' costs one write regardless of 90M followers. This is precisely why the hybrid exists.",
              "**Read path is the hard part.** 30M readers in 60 seconds is ~500K read QPS, and nearly all want the same handful of recent posts from the same hot celebrity, a textbook hot key. Mitigations, layered: cache the celebrity's recent-posts list in Redis with hot-key replication (store the key on several replicas / multiple shards, or replicate it into every read-path cache node) so no single Redis node takes 500K QPS. Add request coalescing (single-flight) at the app tier so a cache miss triggers exactly one backend fetch while other requests wait on the same in-flight promise. Put a short-TTL (1 to 2 second) local in-process cache in front of Redis on each app server, enough to collapse a burst since the content barely changes second to second.",
              "**Serve the hot post body from a CDN or edge cache** keyed by post id, since the body is immutable once posted.",
              "**Ranking degrades gracefully:** during the spike, fall back to chronological merge and drop the expensive ML scoring to protect latency, then re-enable it as load subsides.",
              "Tradeoff: readers may see the goal a second or two apart because of the short local caches, an acceptable freshness cost to survive the spike. Common wrong turn: treating this as a write-throughput problem and trying to fan out to 90M timelines, when it is a read hot-key problem solved by cache replication and coalescing.",
            ],
          },
        },
        {
          id: "sd-l10-instagram",
          title: "Design Instagram (Photo Sharing)",
          summary:
            "Metadata DB plus object storage plus CDN, upload direct to S3 with presigned URLs, generate resolution variants async, reuse hybrid fan-out for the feed, shard viral like counters, and never store image bytes in the database.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["instagram", "blob-storage", "cdn"],
          teach: {
            markdown: instagramTeach,
            estimatedMinutes: 15,
          },
          apply: {
            id: "sd-l10-instagram-apply",
            prompt:
              "Design upload-to-view for a photo-sharing app including media storage, metadata, and feed delivery to a global audience.",
            thinkAbout: [
              "How do you split blob storage from metadata?",
              "How do presigned uploads and a CDN serve media efficiently?",
              "How does the feed reuse fan-out patterns?",
            ],
            modelAnswerOutline: [
              "Assumptions: 500M users, 100M photos/day at ~2MB average, global audience, read-heavy, feed freshness of seconds is fine. Estimate: 100M x 2MB = 200TB/day of new media before replication; with 3x that is ~600TB/day of storage growth. Read bandwidth is many multiples of write, which forces a CDN.",
              "**API:** `POST /uploads` returns a presigned S3 PUT URL plus a `media_key`; client PUTs bytes to S3 directly; `POST /posts` with the `media_key` and caption; `GET /feed?cursor=...`; `POST /posts/{id}/like`. **Data model:** metadata store `posts(post_id, user_id, caption, media_key, created_at, like_count)`, `users`, `follows` and inverse. Media store: S3 buckets holding the original plus variants (1080/640/320/thumb). Per-user timeline as Redis sorted sets of post ids.",
              "**High-level design:** client requests a presigned URL and uploads directly to S3, so app servers never carry image bytes. An S3 put-event lands on a queue; a transcode worker generates resolution variants and a thumbnail, writes their keys, marks the post ready, and enqueues fan-out. Fan-out is the hybrid: push post ids to normal followers, pull for celebrities. The read path loads the user's timeline of ids, batch-hydrates metadata, resolves media keys to CDN URLs, and returns a page by cursor. All media is served through a CDN with long TTLs because it is immutable.",
              "**Deep dive, media delivery:** the CDN offloads 90%+ of read traffic from origin, which is what makes 500M users affordable. Clients fetch the variant matching their viewport, cutting bandwidth. Like counts on viral posts are sharded sub-counters or an approximate Redis counter, avoiding hot-row contention.",
              "Tradeoffs: async variant generation means a just-uploaded photo may briefly show a placeholder until variants exist; acceptable. Approximate like counts trade exactness for write throughput.",
              "Common wrong turn: storing image bytes in the database instead of object storage plus a pointer, which bloats the DB, kills cache hit rates, and cannot be CDN-served; or proxying uploads through app servers instead of presigned direct-to-S3.",
            ],
          },
          practice: {
            id: "sd-l10-instagram-practice",
            prompt:
              "Design Instagram Stories: media that 500M daily users post and view but that expires and is deleted after 24 hours. Explain how the ephemeral lifecycle changes storage, delivery, and the feed compared to permanent posts.",
            thinkAbout: [
              "How does a storage TTL/lifecycle policy replace a massive delete job?",
              "Why does fan-out-on-read fit Stories where fan-out-on-write fits permanent posts?",
              "How do CDN TTLs interact with the 24-hour expiry?",
            ],
            modelAnswerOutline: [
              "Assumptions: Stories are short photos/videos, viewed heavily in the first few hours then rarely, and hard-deleted at 24 hours. Volume is even higher than permanent posts because posting a Story is casual.",
              "**Storage lifecycle:** put Story media in an S3 bucket with a lifecycle policy that auto-expires objects after 24 hours, so deletion is the storage layer's job, not a cron scanning billions of rows. Metadata rows carry a TTL: DynamoDB native item TTL, or Cassandra write with a 24h TTL so tombstones and compaction reclaim them automatically. You never run an app-level delete sweep.",
              "**Delivery:** Stories are extremely hot in the first hours (recency skew), so CDN caching matters even more, but TTLs must not outlive the media. Set CDN TTL at or below the remaining Story lifetime, and rely on the origin returning 404/410 after expiry so stale edge copies drain. Because a Story is viewed in bursts right after posting, a short-TTL edge cache captures most reads.",
              "**Feed shape differs:** the Stories tray is not a ranked infinite timeline, it is 'which of the people I follow have an unexpired Story,' a bounded set. Rather than fan-out-on-write to every follower's tray, use fan-out-on-read: when a user opens the app, query the recent (unexpired) Stories of the accounts they follow, cheap because the candidate set is small and time-bounded, and cache it briefly. Track seen/unseen per viewer with a lightweight per-user read-state record (also TTL'd).",
              "Tradeoff: fan-out-on-read fits here precisely because Stories are short-lived and the query window is tiny, the opposite call from the permanent timeline. Common wrong turn: reusing permanent-post fan-out-on-write and then needing a massive delete job at 24 hours, when a storage TTL policy deletes for free.",
            ],
          },
        },
        {
          id: "sd-l10-chat-messaging",
          title: "Design a Chat / Messaging System (WhatsApp)",
          summary:
            "Hold WebSocket connections on a connection tier with a session registry, order per-conversation with sequence numbers (never global), dedup by client message id, store-and-forward for offline users, and fan out groups (hierarchically for very large channels).",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["chat", "websocket", "presence"],
          teach: {
            markdown: chatMessagingTeach,
            estimatedMinutes: 15,
          },
          apply: {
            id: "sd-l10-chat-messaging-apply",
            prompt:
              "Design 1:1 and group messaging with delivery + read receipts, online presence, and offline delivery.",
            thinkAbout: [
              "What transport and connection layer sustain millions of persistent connections?",
              "How do you guarantee per-conversation ordering and dedup?",
              "How do you deliver to offline users and fan out to large groups?",
            ],
            modelAnswerOutline: [
              "Assumptions: 1B users, 50M concurrent connections, tens of billions of messages/day, 1:1 and group chats up to a few hundred members, delivery within a second when both parties are online. Estimate: 50B msgs/day is ~600K messages/sec average, several million/sec at peak, each message small.",
              "**API/transport:** clients hold a persistent WebSocket (or MQTT) to a connection server. `send(conversation_id, client_msg_id, body)`, ACK frames for delivered/read, and a `sync(last_seq)` on reconnect. Presence is a heartbeat over the same socket.",
              "**Data model:** `messages(conversation_id, seq, msg_id, sender_id, body, created_at)` in Cassandra partitioned by conversation_id so a chat is a contiguous, time-ordered partition. A session registry in Redis maps `user_id -> {device -> connection_server}`. Per-user undelivered mailboxes for offline recipients.",
              "**High-level design:** Alice's message hits connection server A, which assigns a per-conversation sequence number and persists it. A routing layer looks up each recipient in the session registry; online recipients get the message pushed via the pub/sub backplane to their connection server, offline recipients get it queued in their mailbox and pulled on reconnect by `sync(last_seq)`. Client message ids make sends idempotent and let clients dedup retries. Delivery and read receipts are small ACK control messages that advance a per-message state machine and notify the sender.",
              "**Deep dive, ordering:** per-conversation monotonic sequence numbers give a consistent order within a chat without any global coordinator. Clients sort by seq; gaps trigger a re-sync. Presence uses heartbeats with a short TTL in Redis so a dropped connection expires the 'online' flag. Group fan-out: write once, deliver per member via their connection server or mailbox; for huge channels, fan out hierarchically through worker layers.",
              "Tradeoffs: per-conversation (not global) ordering is the deliberate scale choice. Optional E2E encryption (Signal) means the server stores and forwards ciphertext blobs it cannot read. Common wrong turn: assuming a global total order across all messages instead of per-conversation ordering, which does not scale and is not needed.",
            ],
          },
          practice: {
            id: "sd-l10-chat-messaging-practice",
            prompt:
              "Design Slack-style channels where a busy engineering channel has 50,000 members and a message triggers a burst of typing indicators, reactions, and read-state updates. Explain how you keep the fan-out and the presence/typing signals from overwhelming the system.",
            thinkAbout: [
              "Why not individually queue a message to 50K offline members?",
              "Why are typing indicators best-effort, lossy, and never persisted?",
              "How do you collapse a burst of reactions and read-state updates?",
            ],
            modelAnswerOutline: [
              "Assumptions: workspaces with large channels (50K members), most members passive readers, and the noisy signals are typing indicators, reactions, and per-user read cursors, which vastly outnumber actual messages.",
              "**Message fan-out:** a channel message is written once to the channel's partition (Cassandra by channel_id), then delivered to the connection servers holding that channel's online members. For 50K members you fan out hierarchically, and you only push to currently-connected members (the session registry filters offline users). Offline members are not individually queued; they catch up by reading channel history from `last_read_seq`, far cheaper than 50K mailbox writes per message.",
              "**Typing indicators are the real flood:** high-frequency and disposable. Never persist them and never fan them out to all 50K. Debounce on the client (at most one 'typing' per few seconds), route them over an ephemeral pub/sub topic with no durability, and optionally only deliver to members who currently have the channel open (viewport-aware). A dropped typing signal is harmless.",
              "**Reactions and read state:** reactions are frequent but tiny; aggregate them (store counts, broadcast a debounced aggregate rather than one event per reaction) to collapse 500 reactions into a few update frames. Read state is per-user and does not need broadcasting: store each member's `last_read_seq` and compute unread counts on read, rather than pushing every read event to every member.",
              "Tradeoff: typing/presence are best-effort and lossy by design, traded for survivability; message delivery stays durable and ordered. Common wrong turn: treating typing indicators and read receipts as durable, ordered messages and fanning them out to all 50K members, producing orders of magnitude more traffic than the actual chat.",
            ],
          },
        },
        {
          id: "sd-l10-notification-system",
          title: "Design a Notification / Push System",
          summary:
            "An event flows through a queue to a preference filter, a renderer, priority per-channel lanes, and provider adapters with retries/failover, and an idempotency key checked against a dedup store is what prevents retries from double-sending.",
          estimatedMinutes: 35,
          difficulty: "medium",
          skills: ["notifications", "fan-out", "queue"],
          teach: {
            markdown: notificationSystemTeach,
            estimatedMinutes: 13,
          },
          apply: {
            id: "sd-l10-notification-system-apply",
            prompt:
              "Design a system that delivers a notification to a user across push (APNs/FCM), SMS, email, and in-app with per-user preferences.",
            thinkAbout: [
              "How do provider adapters with retries/failover abstract channels?",
              "How do you prevent double-sends with idempotency?",
              "How do preferences, quiet hours, and batching fit?",
            ],
            modelAnswerOutline: [
              "Assumptions: multi-tenant, hundreds of millions of notifications/day across four channels, a mix of transactional (2FA, order shipped) and marketing traffic, and a hard requirement that a user is never double-notified for one event. Estimate: 200M/day is ~2.3K/sec average with large spikes, so the pipeline must absorb bursts on a queue.",
              "**API:** `POST /notifications` with `{event_id, user_id, category, channel_hint, payload, idempotency_key}`, returning 202 after enqueue. Delivery-status webhooks feed back into tracking. **Data model:** `user_preferences(user_id, category, channels_enabled, quiet_hours, digest_pref)`, `device_tokens`, a `dedup` store (Redis, key = idempotency_key, TTL), and a `delivery_log(notification_id, channel, provider, status, timestamps)`.",
              "**High-level design:** the ingestion API validates and pushes to Kafka, returning fast. Workers consume and run the pipeline: check the dedup store for the idempotency key (skip if already sent), apply the preference/eligibility filter (opt-out, channel enabled, quiet hours defer, digest batching), render channel-specific content, then enqueue onto per-channel priority lanes. Channel adapters (APNs/FCM, Twilio, SES) dispatch with retry/backoff and failover to a backup provider, record the send in the dedup store and delivery log, and messages that exhaust retries land in a DLQ for replay.",
              "**Deep dive, idempotency:** because the pipeline is at-least-once (queues redeliver, workers crash mid-send), a retry would re-push without protection. The idempotency key checked against the dedup store before dispatch, plus recording success atomically after, makes the user experience effectively exactly-once. Priority lanes keep a 2FA code from queuing behind a marketing blast.",
              "Tradeoffs: quiet-hours deferral and digest batching trade immediacy for user respect and cost, applied only to low-priority categories. Failover trades a little latency for resilience when a provider degrades.",
              "Common wrong turn: no idempotency, so a retry double-sends a push; or calling provider SDKs directly from application code instead of behind adapters, making a new channel or a failover impossible.",
            ],
          },
          practice: {
            id: "sd-l10-notification-system-practice",
            prompt:
              "Design the notification system for an incident-alerting product like PagerDuty, where an alert must reach an on-call engineer within seconds and escalate through push, then SMS, then a phone call if unacknowledged. Explain the escalation state machine, idempotency, and how you avoid both missed pages and alert storms.",
            thinkAbout: [
              "How does a durable, timer-driven escalation state machine work?",
              "Why does this system bias toward delivery over avoiding duplicates?",
              "How do alert grouping and dedup prevent an alert storm?",
            ],
            modelAnswerOutline: [
              "Assumptions: alerts are high-priority and low-volume relative to marketing, correctness is life-or-death for uptime, and the key mechanic is timed escalation with acknowledgment. Latency target: first notification within a couple of seconds.",
              "**Escalation state machine:** an alert creates an escalation instance with an ordered policy: push immediately, if no ACK within 60s send SMS, if no ACK within another 120s place a phone call (Twilio Voice), then escalate to the next person in the rotation. Model this as a durable state machine driven by a scheduler / delayed queue: each step schedules a 'check for ACK' timer; when the timer fires, if still unacknowledged, advance to the next channel. An ACK (from any channel, via a deep link or reply) transitions the alert to Acknowledged and cancels all pending timers.",
              "**Idempotency and correctness:** each escalation step has an idempotency key (alert_id + step) so a retried timer does not double-page the same step. Because a missed page is worse than a duplicate, dispatch uses at-least-once with dedup, biased toward delivering. Phone and SMS go through provider failover (a second voice/SMS vendor) because a single provider outage during an incident is unacceptable.",
              "**Avoiding alert storms:** dedupe and group alerts at ingestion so 500 alerts from one failing service become one incident with a count, not 500 pages (alert grouping / suppression). Apply a per-service rate limit and maintenance windows to suppress known-noisy sources. Deduplication keys on the alert fingerprint (service + check) collapse repeats.",
              "Tradeoffs: this system biases hard toward delivery over cost and over avoiding duplicates, the opposite of a marketing system, because a missed page causes an outage. Quiet hours do NOT apply to on-call pages. Common wrong turn: treating pages like best-effort marketing notifications (batching, quiet hours, fire-and-forget) instead of a durable, timed, acknowledged escalation with failover.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l10-m3",
      title: "Geo, Media & Collaboration",
      description:
        "Walk an interviewer through five of the most-asked case studies end to end: ride matching over moving objects, cross-device file sync, upload-to-playback video at global scale, real-time collaborative editing, and read-heavy proximity search. Each teaches a transferable core that recurs far beyond the named product.",
      lessons: [
        {
          id: "sd-l10-ride-sharing",
          title: "Design a Ride-Sharing Service (Uber)",
          summary:
            "Index moving drivers with a space-filling spatial index (H3/S2/geohash) sharded by geography, keep locations in memory as overwrites, and rank matches by ETA under an exclusive-assignment lock, with the trip state machine as the one strongly consistent part.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["ride-sharing", "geospatial", "dispatch"],
          teach: {
            markdown: rideSharingTeach,
            estimatedMinutes: 15,
          },
          apply: {
            id: "sd-l10-ride-sharing-apply",
            prompt:
              "Design ride matching that pairs a rider with the nearest available driver and tracks live locations at city scale.",
            thinkAbout: [
              "Which spatial index (geohash, quadtree, S2, H3) fits nearby queries?",
              "How do you handle high-frequency driver location writes?",
              "How does the matching/dispatch engine and trip state machine work?",
            ],
            modelAnswerOutline: [
              "Assume a large city with roughly 100k active drivers, each sending a location every 4 seconds (about 25k location writes/sec), and tens of thousands of ride requests per hour with a p99 match latency target under 2 seconds. Three planes: a location ingest plane, a matching plane, and a durable trip plane.",
              "**Spatial index:** I choose **H3** (hexagonal cells): a driver's location maps to a cell id, and a rider query reads its own cell plus expanding neighbor rings until it collects enough candidates. Hexagons give uniform neighbor distance so ring expansion is even. I shard the index **by city/region** so each shard's write and query volume stays bounded, and keep it in **Redis (or a custom in-memory service)** treating each driver's location as an overwrite, not an append, since only the latest matters and durability is unnecessary for ephemeral positions.",
              "**Location writes:** 25k writes/sec is fine for an in-memory overwrite index. I do not persist every ping to a durable DB; that would be pointless write amplification. I only persist trip-relevant snapshots (pickup, drop-off, breadcrumb sampling for support/billing) to something like Cassandra.",
              "**Matching:** candidate generation via H3 ring query, then rank by **road-network ETA** (not straight-line distance), acceptance likelihood, and supply balance. Assignment must be **exclusive**: a conditional update on the driver's availability so only one match claims a driver, with a few-second offer TTL that returns unaccepted drivers to the pool. Surge multiplier is computed per cell from request/supply ratio.",
              "**The trip state machine** (requested -> matched -> arrived -> in-progress -> completed/canceled) lives in a strongly consistent store because it drives billing; state transitions are idempotent and event-sourced so a retry does not double-charge.",
              "Tradeoffs: in-memory index trades durability for speed (acceptable, positions are ephemeral); regional sharding trades cross-region flexibility for bounded load. Common wrong turn: a lat/lng bounding-box SQL scan, which is O(n) per query and cannot meet the latency target at this write and read rate.",
            ],
          },
          practice: {
            id: "sd-l10-ride-sharing-practice",
            prompt:
              "Design DoorDash-style dispatch where a single courier can carry multiple orders (batching) across a metro of 5 million people, and one dispatch decision must jointly consider restaurant prep time, courier location, and multiple in-flight deliveries. Explain how the matching objective and index differ from single-rider Uber matching.",
            thinkAbout: [
              "Why does the objective shift from nearest-driver to route optimization?",
              "Why deliberately delay assignment by 30-90 seconds?",
              "What does a prep-time model and per-stop route add over a single trip FSM?",
            ],
            modelAnswerOutline: [
              "Assumptions: a metro with tens of thousands of active couriers and hundreds of thousands of daily orders, where a courier may hold 2 to 3 orders and pickups happen at restaurants (clustered points), not arbitrary rider locations.",
              "**Same spatial index** (H3 cells, sharded by metro), but the **matching objective changes from nearest-driver to route optimization**. Instead of 'closest available courier,' dispatch solves a constrained assignment: minimize total delivery time and courier idle miles while respecting food-ready times and per-order lateness. This is effectively an online vehicle-routing problem, so I run a batch optimizer every few seconds per region rather than matching each order instantly. Delaying assignment by 30 to 90 seconds is deliberate: it lets the optimizer see more orders and batch two deliveries onto one courier heading the same direction.",
              "**Key additions over Uber:** (1) a **restaurant prep-time model** so a courier is dispatched to arrive when food is ready, not before (idle courier) or after (cold food); (2) a **batching engine** that groups orders with compatible routes and time windows; (3) each courier carries a small route (ordered list of pickups and drop-offs), so the state machine is per-stop, not a single trip. Courier live positions stay in the same in-memory H3 index, but candidate generation also filters by remaining capacity and current route detour cost.",
              "Tradeoffs: batching lowers cost per delivery and raises courier utilization but risks lateness on the first order, so the optimizer bounds added delay per order. Common wrong turn: greedily assigning each order to the nearest free courier the instant it arrives, which forbids batching and produces far worse total efficiency at metro scale.",
            ],
          },
        },
        {
          id: "sd-l10-file-sync",
          title: "Design a File Sync & Storage Service (Dropbox)",
          summary:
            "Content-defined chunking plus per-chunk hashing gives dedup and delta sync (upload only changed chunks), a strongly consistent metadata service maps files to chunk manifests and versions, and conflicts are resolved by keeping both copies plus history rather than merging blindly.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["file-sync", "chunking", "dedup"],
          teach: {
            markdown: fileSyncTeach,
            estimatedMinutes: 15,
          },
          apply: {
            id: "sd-l10-file-sync-apply",
            prompt:
              "Design a service that syncs a user's files across devices, uploading only changed chunks and resolving conflicts.",
            thinkAbout: [
              "How does content-defined chunking + hashing enable dedup and delta sync?",
              "What does the metadata service track?",
              "How do you detect and resolve conflicts and keep versions?",
            ],
            modelAnswerOutline: [
              "Assumptions: hundreds of millions of files, files ranging from tiny docs to multi-GB videos, multiple devices per user syncing near-real-time, and a hard goal that a small edit costs proportionally small bandwidth.",
              "**API:** `commit(file_path, base_version, manifest[])` where manifest is the ordered chunk-hash list; `have_chunks(hashes[]) -> missing[]`; `put_chunk(hash, bytes)`; `list_changes(cursor) -> {changes, new_cursor}`. **Data model:** a metadata store (sharded SQL or a document DB) holds the file tree, and per file the current version plus manifest, and per device a sync cursor. A chunk store (S3-style, content-addressed by SHA-256) holds unique chunks once. A CDN fronts downloads.",
              "**Upload path:** the client runs **content-defined chunking** (Rabin rolling hash, ~4MB average) so an insert only rewrites the affected chunk, hashes each chunk, and calls `have_chunks` to learn which are missing. It uploads only missing chunks, then commits the new manifest with `base_version`. The server commits metadata **after** confirming chunks exist, so a manifest never dangles. Global dedup means a chunk uploaded by anyone is instantly 'have' for everyone (with per-user access still enforced at the metadata layer).",
              "**Conflict resolution:** `commit` is a conditional write on `base_version`. If the server has advanced, it is a conflict; the safe default is **keep both** (create a conflicted copy) and retain full version history, so no edit is lost. Text-specific merges are an optimization, not the default.",
              "**Sync protocol:** a filesystem watcher feeds an upload queue; a `list_changes(cursor)` long-poll feeds a download queue; the persisted cursor makes interrupted syncs resumable. Offline edits queue and reconcile on reconnect.",
              "Tradeoffs: CDC costs client CPU (hashing) to save bandwidth and storage, a good trade. Global dedup saves storage but needs careful access control so a hash guess cannot leak someone's file (the metadata ACL, not chunk possession, gates access). Common wrong turn: re-uploading whole files on any change, or trying to diff on the server before the client has sent its bytes.",
            ],
          },
          practice: {
            id: "sd-l10-file-sync-practice",
            prompt:
              "Design the sync layer for Google Drive / Dropbox handling a 500-person company sharing a 50GB folder of large binary assets (video, CAD files), where dozens of people may edit different files in that shared folder simultaneously. Explain how shared-folder sync and permissions change the design versus single-user sync.",
            thinkAbout: [
              "How does a per-namespace change log fan out one edit to 500 members?",
              "Why is chunk dedup an even bigger win for a shared binary folder?",
              "How do ACLs and removal interact with global dedup?",
            ],
            modelAnswerOutline: [
              "Assumptions: one shared namespace (a team folder) with ~500 members, 50GB of mostly large binaries, high concurrent edit activity across different files (rarely the same file), and a need for fast fan-out so member B sees member A's change within seconds.",
              "**Shared folders turn sync from per-user into per-namespace.** I model the shared folder as its own **namespace with its own change log** (a monotonic sequence of commits). Every member device holds a cursor into that log and pulls `list_changes(namespace, cursor)`, so a single edit fans out to all 500 members via their cursors rather than N independent copies. Because edits usually hit **different** files, per-file conditional writes on version handle correctness cleanly; genuine same-file conflicts still fall back to keep-both plus history.",
              "**Storage and dedup** are unchanged and pay off more here: chunk dedup means the 50GB is stored once, and a member who joins syncs by pulling manifests and only the chunks they lack. Large binaries (video, CAD) get big average chunk sizes and parallel multi-connection chunk transfer.",
              "**Permissions are the new hard part.** ACLs live at the namespace and can be scoped per subfolder. When someone is removed, their device's next `list_changes` must be rejected and its local cached chunks are no longer refreshable; sensitive setups additionally re-key. The metadata layer, not chunk possession, is the access gate, so global dedup is safe.",
              "**Fan-out scale:** a naive design that pushes every change to every member synchronously would thrash; instead members long-poll their cursor and the server batches notifications. Tradeoffs: a per-namespace log centralizes ordering (simple, consistent) but makes a hyper-active folder a hotspot, mitigated by sharding logs per subtree. Common wrong turn: treating a shared folder as N private copies, which multiplies storage and loses a single consistent ordering of who-changed-what.",
            ],
          },
        },
        {
          id: "sd-l10-video-streaming",
          title: "Design Video Streaming / VOD (YouTube/Netflix)",
          summary:
            "Transcode once, asynchronously, into an ABR ladder of segmented renditions with manifests; let the client adapt bitrate per segment; and serve segments from a CDN (Open Connect-style edge caches) with long TTLs so origin egress stays flat even under viral read spikes.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["video-streaming", "transcoding", "cdn"],
          teach: {
            markdown: videoStreamingTeach,
            estimatedMinutes: 15,
          },
          apply: {
            id: "sd-l10-video-streaming-apply",
            prompt:
              "Design upload-to-playback for user videos including transcoding, storage, and adaptive streaming to a global audience.",
            thinkAbout: [
              "How does the async transcoding pipeline produce an ABR ladder?",
              "How does the CDN offload origin, and what is cached?",
              "How do you tier storage for popular vs cold content?",
            ],
            modelAnswerOutline: [
              "Assumptions: user-generated video (YouTube-like), hundreds of hours uploaded per minute, a global audience, playback start under ~2s, and read traffic orders of magnitude above write.",
              "**API:** `initiate_upload` (multipart) -> raw bytes to S3; on completion emit a `video.uploaded` event. Playback: `GET /manifest/{videoId}` returns the HLS/DASH manifest; players then `GET` immutable segment URLs from the CDN.",
              "**Ingest pipeline:** raw upload to **S3**, which enqueues a transcode job on **Kafka/SQS**. A **worker pool** splits the video into segments and transcodes in parallel into an **ABR ladder** (240p through 4K, H.264 plus AV1/VP9 for efficiency), cutting each rendition into 4s segments and writing a manifest. Jobs are idempotent and retryable; a failed segment re-transcodes without redoing the whole video. Status flows back so the UI shows 'processing' until ready.",
              "**Storage and delivery:** segments and manifests live in object storage as the **origin**, fronted by a **CDN**. Because segments are immutable, they cache with long TTLs; the cache key is the segment URL. New/cold content misses to origin, hot content is served entirely from edge. Netflix-style, the biggest players push caches into ISPs (Open Connect) to cut transit cost.",
              "**Adaptive streaming:** the **client** measures bandwidth and buffer and picks the next segment's bitrate from the manifest, stepping down on congestion and up on recovery, with no server session state. **Storage tiering:** hot titles stay on fast storage and many edges; cold catalog tiers to S3-IA/Glacier and fewer edges, re-warmed on demand. Thumbnails/preview frames are generated during transcode and cached as static assets.",
              "Separation of concerns: metadata and recommendations are a distinct serving path from delivery. Tradeoffs: bigger ABR ladders and more codecs improve quality-per-byte and device reach but multiply transcode compute and storage. Common wrong turn: serving video straight from origin with no CDN (saturates egress on the first viral video), or scaling transcoding to absorb a watch spike (that is a cached-read problem, not a compute one).",
            ],
          },
          practice: {
            id: "sd-l10-video-streaming-practice",
            prompt:
              "Design live streaming for a Super Bowl-scale event: 30 million concurrent viewers watching the same live feed with under 10 seconds of glass-to-glass latency. Explain how live differs from the VOD design above.",
            thinkAbout: [
              "Why is transcoding now real-time and continuous, not a one-shot batch?",
              "How does multi-tier CDN request coalescing survive 30M viewers of the same segment?",
              "Why is segment duration a direct latency knob?",
            ],
            modelAnswerOutline: [
              "Assumptions: a single live source, up to 30M concurrent viewers globally, a latency budget of roughly 5 to 10 seconds (low-latency HLS/DASH), and a hard requirement that one hot moment does not melt the origin.",
              "**Live inverts the timing of VOD:** transcoding is **real-time and continuous**, not a one-shot batch. The encoder ingests the live feed (via RTMP/SRT), transcodes it on the fly into an ABR ladder, and publishes short segments continuously, rewriting a rolling manifest that lists only the last few segments. Segment duration is a direct latency knob: 2s segments cut latency but raise request rate; low-latency HLS uses partial segments/chunked transfer to push latency toward a few seconds.",
              "**The delivery challenge** is that everyone wants the same newest segment at the same instant, so the CDN's job is request coalescing at massive fan-out: 30M requests for segment N collapse to one origin fetch per edge tier. Use a multi-tier CDN (edge -> mid-tier shield -> origin) so origin sees a handful of requests per segment regardless of viewer count. Pre-provision and pre-warm capacity; live events are scheduled, so you scale ahead rather than react.",
              "**Differences from VOD:** (1) no complete file exists, so no random seek beyond the DVR window and manifests are rolling, not static; (2) transcoding capacity must be reserved live and cannot fall behind; (3) latency, not just throughput, is a primary SLO; (4) a redundant encoder path and instant failover matter because you cannot re-run a live moment.",
              "Tradeoffs: shorter segments and low-latency modes cut delay but increase request volume and reduce coalescing efficiency, so you balance latency against origin protection. Common wrong turn: reusing the VOD assumption that content is fully transcoded and cacheable ahead of time, which is impossible when the segment being requested was encoded one second ago.",
            ],
          },
        },
        {
          id: "sd-l10-collaborative-editor",
          title: "Design a Collaborative Editor (Google Docs)",
          summary:
            "Converge concurrent edits with OT (server-ordered, transform indices, memory-lean, Docs-style) or CRDTs (per-character ids, commutative merge, offline/P2P-friendly), broadcast ephemeral presence over WebSocket, persist an op log plus snapshots for replay and reconnect, and route all editors of a document to one server for coherent ordering.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["collaborative-editor", "crdt", "ot"],
          teach: {
            markdown: collaborativeEditorTeach,
            estimatedMinutes: 15,
          },
          apply: {
            id: "sd-l10-collaborative-editor-apply",
            prompt:
              "Design a document that multiple users edit simultaneously with all edits converging and cursors shown live.",
            thinkAbout: [
              "What is the OT vs CRDT tradeoff for convergence and intention preservation?",
              "How do you broadcast presence and cursors in real time?",
              "How do you persist and replay edits and handle offline reconnection?",
            ],
            modelAnswerOutline: [
              "Assumptions: documents edited by up to a few dozen concurrent users, thousands of documents active at once, a hard requirement that no concurrent edit is lost and all replicas converge, and live cursors/presence.",
              "**Concurrency model:** I choose **server-ordered OT** for a server-backed product (Google Docs' approach). Edits are operations (`insert(pos, text)`, `delete(range)`); the server imposes a single canonical order and **transforms** each incoming op against the ops applied since the client's known version, so indices adjust and intent is preserved. I name CRDTs (per-character unique ids, commutative merge) as the alternative I would pick for an offline-first or P2P product, since they converge without a central sequencer at the cost of per-character metadata and tombstone GC.",
              "**Transport:** a persistent **WebSocket** from each client to a per-document collaboration server. Two channels: a reliable, ordered channel for document ops (each ack'd with a version number), and a lossy, ephemeral channel for **presence** (cursor position, selection, who is online), broadcast frequently and never persisted.",
              "**Persistence:** append every op to an **op log** and periodically write a **snapshot**. A joiner loads the latest snapshot plus the op tail rather than replaying from zero. Undo/redo and version history derive from the op log.",
              "**Reconnection/offline:** the client tracks its last-acknowledged version. On reconnect it sends queued local ops and pulls the ops it missed by version; the server transforms its queued ops against the missed history so it converges. This is the case LWW cannot handle.",
              "**Scaling and access:** route all editors of a document to one server via **consistent hashing on document id** so ordering is coherent; different docs shard horizontally. ACLs (view/comment/edit) are checked at connect and per op. Tradeoffs: OT is lean and proven but the transform functions are subtle and centralize ordering; CRDTs decentralize at a metadata cost. Common wrong turn: last-write-wins on the whole document, which silently discards concurrent edits.",
            ],
          },
          practice: {
            id: "sd-l10-collaborative-editor-practice",
            prompt:
              "Design the collaboration engine for Figma, where the shared document is not text but a tree of graphical objects (frames, shapes, layers with properties), edited by dozens of designers in real time. Explain why Figma chose a CRDT-style model and how editing a property tree differs from editing a text string.",
            thinkAbout: [
              "Why does a tree of typed-property objects favor CRDT registers over text OT?",
              "How do LWW-registers per property and ordered-list CRDTs converge?",
              "Why is losing one concurrent property edit acceptable for design tooling?",
            ],
            modelAnswerOutline: [
              "Assumptions: a design file is a tree of objects (frames containing shapes, each with properties like position, size, fill, and a parent/child and z-order), edited by dozens of designers concurrently, with live multiplayer cursors and instant local feedback.",
              "**Figma uses a CRDT-style model** rather than text OT because the data is a **document tree of objects with typed properties**, not a linear character sequence. Each object has a stable globally-unique id, and each property is a last-writer-wins register keyed by that id: if two designers set the fill of the same shape concurrently, a LWW-register (ordered by a logical timestamp) deterministically picks one and both clients converge, and crucially they edited a **property**, not overlapping text, so the loss is acceptable and bounded. Different objects and different properties never conflict, the common case, so most concurrent edits merge with zero contention.",
              "**The tree structure adds ordering and parenting** concerns absent in text: children under a parent and z-order are modeled as CRDT-ordered lists (fractional indexing between neighbors) so concurrent inserts/reorders converge without index rewrites. Object creation, deletion, and reparenting are operations on the tree; deletion leaves a tombstone so a concurrent edit to a just-deleted object resolves deterministically.",
              "**Architecture:** a server holds the authoritative document and relays operations; clients apply locally first for instant feedback (optimistic) and reconcile via the CRDT merge, so latency feels zero. Presence (multiplayer cursors, selection) is ephemeral and broadcast separately.",
              "**Why not text OT:** OT's transform functions are defined for sequence insert/delete and become very hard to generalize to a rich object tree with typed properties, whereas per-object, per-property CRDT registers plus ordered-list CRDTs map naturally onto the data model. Tradeoffs: CRDT metadata per object and tombstones need periodic GC, and LWW-per-property silently drops one value on a genuine conflict, acceptable for design tooling but wrong for financial text. Common wrong turn: treating the design file as a serialized blob and doing whole-file LWW, which loses concurrent edits across unrelated objects.",
            ],
          },
        },
        {
          id: "sd-l10-yelp-nearby",
          title: "Design Yelp / Nearby Places (Proximity Search)",
          summary:
            "Nearby-places is read-heavy over a near-static POI set, so serve it from a search engine (geo_distance plus attribute filters plus ranking) fed by a denormalized read model, cache popular result pages and detail pages with generous TTLs invalidated on rare edits, and do not over-build the low-rate write path.",
          estimatedMinutes: 40,
          difficulty: "medium",
          skills: ["geospatial", "search", "caching", "case-study"],
          teach: {
            markdown: yelpNearbyTeach,
            estimatedMinutes: 15,
          },
          apply: {
            id: "sd-l10-yelp-nearby-apply",
            prompt:
              "Design Yelp's 'nearby places' feature: given a user location and filters, return ranked places within a radius, and justify your spatial index, ranking, and caching for a read-heavy, mostly-static dataset.",
            thinkAbout: [
              "How is this different from Uber matching, where points move every few seconds?",
              "How do you combine spatial filtering with attribute filters (open now, category, rating) and ranking?",
              "What is cacheable when the underlying place data barely changes?",
            ],
            modelAnswerOutline: [
              "Assumptions: tens of millions of mostly-static POIs, heavy read traffic (tens of thousands of QPS at peak), and queries like 'coffee within 2km, open now, sorted by rating and distance.' The defining fact is read-heavy and rarely-changing, the opposite of Uber's write-heavy moving points.",
              "**Because data barely changes, I precompute, denormalize, and cache** instead of optimizing location writes. Source of truth for places and reviews lives in a relational or document store; the query-serving layer is a **denormalized read model in Elasticsearch/OpenSearch**, which handles spatial filtering (`geo_distance` over cell-bucketed coordinates), attribute filters, and text in one query.",
              "**Query flow:** (1) candidate generation by spatial cell/radius; (2) filter by category, open-now (from stored hours plus current time), price, minimum rating; (3) rank by a blend of distance, rating, popularity (review count), and sponsored boost. Spatial index choice: geohash/S2/quadtree buckets so a radius query reads a cell plus neighbors; I lean on ES's native geo support rather than a bespoke in-memory index because, unlike Uber, this index is rebuildable and read-optimized, not volatile.",
              "**Caching (the core lever):** cache popular `(cell, filter)` result pages and place-detail pages in Redis with **generous TTLs** (minutes to hours) since data is stable, plus CDN edge caching for common result sets and all media. Invalidate on the rare place update rather than expiring aggressively. Scale reads with ES replicas and the CDN.",
              "**Write path:** new reviews/edits/places are low-rate; they update the source of truth, then an indexing pipeline updates the ES read model and invalidates affected caches. I deliberately do not build high-throughput write ingestion.",
              "Tradeoffs: denormalized read model plus caching trades slight staleness (a just-added review may take seconds to appear) for huge read scalability, the right trade here. Common wrong turn: modeling it like Uber with constant location writes and geofencing, over-engineering write throughput the workload never has.",
            ],
          },
          practice: {
            id: "sd-l10-yelp-nearby-practice",
            prompt:
              "Design the 'restaurants near you, open now, delivering to your address' search for a food-delivery app (Uber Eats scale) where, unlike Yelp, availability is genuinely dynamic: a restaurant can go offline, hit capacity, or stop delivering to your zone within minutes. Explain how you keep Yelp-style read caching while a slice of the data is now fast-changing.",
            thinkAbout: [
              "How do you split the data by velocity (static attributes vs live availability)?",
              "How does a real-time overlay stage keep the search itself cacheable?",
              "Why is putting availability into the ES index the wrong turn?",
            ],
            modelAnswerOutline: [
              "Assumptions: millions of restaurants, very high read QPS, but with **two data velocities**: static-ish attributes (location, menu, cuisine, base hours) that change rarely, and **fast-changing availability** (open/paused, at-capacity, current delivery radius, prep-time estimate) that changes every few minutes.",
              "**The core move is to split the data by velocity** and cache them differently. Static attributes go in the Yelp-style path: a denormalized Elasticsearch read model for spatial plus attribute plus text search, with popular `(cell, filter)` result pages cached at generous TTLs. This gives the candidate set cheaply.",
              "**Fast-changing availability goes in a separate low-latency store** (Redis) keyed by restaurant id, updated by the availability service on each state change with short TTLs (tens of seconds) or push updates. The query does a two-stage flow: ES returns spatial/attribute candidates (cacheable), then a **real-time overlay** joins the live availability from Redis to filter out paused/at-capacity restaurants and those not delivering to the user's zone, and to attach live prep-time. So the expensive spatial/text search stays cached and static, while only a cheap per-candidate availability lookup is real-time.",
              "**Delivery-zone filtering** adds a geospatial twist: each restaurant has a dynamic delivery polygon/radius, so 'delivers to me' is a point-in-polygon check against the user's address, evaluated in the overlay stage against current zones (which can shrink under load).",
              "Tradeoffs: splitting velocities keeps 90% of the work cached while a small, cheap slice is fresh, versus the naive alternative of dropping all caching because 'availability changes,' which would collapse under read load. The risk is a brief inconsistency (a restaurant paused 5 seconds ago may still show, then get filtered on tap), acceptable and far better than uncached search. Common wrong turn: putting fast-changing availability into the ES index and reindexing constantly, turning a read-optimized search index into a high-write hotspot, exactly the Uber-modeling mistake applied to the wrong field.",
            ],
          },
        },
      ],
    },
  ],
}
