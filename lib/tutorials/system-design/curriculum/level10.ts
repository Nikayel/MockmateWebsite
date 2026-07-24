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

\`\`\`cswidget
{
  "type": "calc",
  "title": "Fan-out write cost: push vs pull vs hybrid",
  "predictPrompt": {
    "question": "The platform sees 250 posts/sec and the average author has 200 followers. Roughly what does pure fan-out-on-write cost in timeline writes per second?",
    "options": [
      "About 500",
      "About 5,000",
      "About 50,000",
      "About 500,000"
    ]
  },
  "workedExample": "At the initial settings, 250 posts/sec times 200 average followers is 50,000 timeline writes/sec under pure push, and hybrid matches it because 200 sits far below the 100K celebrity cutoff, while pull costs just 250 writes/sec (one insert per post) by moving all the work to reads. Slide followers past 100K and hybrid drops to zero timeline writes because celebrity posts are pulled at read time, while pure push climbs to 250 million writes/sec at 1M followers. That cliff is why the hybrid is the senior answer.",
  "inputs": [
    {
      "kind": "slider",
      "id": "posts_per_sec",
      "label": "Posts per second",
      "min": 1,
      "max": 10000,
      "scale": "log",
      "initial": 250,
      "unit": "posts/s"
    },
    {
      "kind": "slider",
      "id": "avg_followers",
      "label": "Followers per author",
      "min": 10,
      "max": 1000000,
      "scale": "log",
      "initial": 200,
      "unit": "followers"
    },
    {
      "kind": "slider",
      "id": "celeb_cutoff",
      "label": "Celebrity cutoff",
      "min": 1000,
      "max": 1000000,
      "scale": "log",
      "initial": 100000,
      "unit": "followers"
    }
  ],
  "outputs": [
    {
      "id": "push_write_qps",
      "label": "Push: timeline writes/sec",
      "expr": "posts_per_sec * avg_followers",
      "format": "compact",
      "unit": "writes/s"
    },
    {
      "id": "hybrid_write_qps",
      "label": "Hybrid: timeline writes/sec",
      "expr": "push_write_qps * min(1, floor(celeb_cutoff / avg_followers))",
      "format": "compact",
      "unit": "writes/s",
      "sparkline": {
        "over": "avg_followers"
      }
    },
    {
      "id": "pull_write_qps",
      "label": "Pull: writes/sec (one insert per post)",
      "expr": "posts_per_sec",
      "format": "compact",
      "unit": "writes/s"
    }
  ],
  "caption": "Hybrid pushes only authors at or below the cutoff; above it, readers pull, so the write cost vanishes and the cost moves to the read path."
}
\`\`\`

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

const distributedCacheTeach = `
## Three things: placement, eviction, hot keys/stampedes

A distributed cache is the workhorse that sits in front of your database and absorbs the read load that would otherwise crush it. The interview tests three things: how you spread keys across nodes, how you evict when memory fills, and how you survive a hot key or a cache stampede.

## Placement: consistent hashing

The naive approach is \`node = hash(key) % N\`. It works until you add or remove a node, at which point almost every key maps somewhere new and your hit rate collapses to near zero while the whole fleet stampedes the database. Consistent hashing fixes this: map both keys and nodes onto a fixed ring (say a 2^32 space), and a key belongs to the first node clockwise from its hash. Adding a node only steals keys from its immediate neighbor, so only about 1/N of keys move. Raw consistent hashing gives lumpy load because node positions are random, so use virtual nodes: give each physical node 100 to 200 points on the ring. Now load evens out and, when a node dies, its keys spread across many survivors instead of dumping onto one neighbor.

\`\`\`cswidget
{
  "type": "hash-ring",
  "title": "The cache fleet remap, live",
  "predictPrompt": {
    "question": "Your 4-node cache fleet loses a node under hash mod N placement. What happens to the hit rate?",
    "options": [
      "Dips by roughly that node's share",
      "Collapses fleet-wide",
      "Nothing changes"
    ]
  },
  "workedExample": "In mod-N mode, remove a node and read the remap: most keys now live somewhere new, so almost every request misses and the fleet stampedes the database. Switch to the ring and repeat: only about 1/N move. Then turn on virtual nodes and remove a node again to spread the dead node's load across many survivors instead of one neighbor.",
  "initialNodes": 4,
  "maxNodes": 7,
  "keys": 48,
  "initialMode": "modulo",
  "vnodeFactor": 16
}
\`\`\`

**Interview nuance:** if you say "hash mod N" and do not immediately catch that adding a node reshuffles the world, that is a red flag. Lead with consistent hashing plus virtual nodes.

## Eviction and caching patterns

You cannot hold everything, so pick a policy. LRU (least recently used) is the default and fits most workloads because recency predicts reuse. LFU (least frequently used) beats LRU when a small set of keys is popular over a long window and you do not want a scan to evict them. TTL-based expiry is orthogonal and almost always on too. Redis actually samples a handful of keys and evicts the best candidate rather than maintaining a perfect LRU list, trading exactness for O(1) writes.

Cache-aside (the app reads cache, on miss reads the DB and populates the cache) is the common default and keeps the cache out of the write path. Write-through writes cache and DB together for freshness at the cost of write latency. Write-back writes cache first and flushes to the DB asynchronously for speed, at the risk of data loss on crash.

## Stampedes and hot keys

A cache stampede happens when a hot key expires and thousands of concurrent requests all miss and hit the DB at once. Fix it with request coalescing (a single in-flight fetch per key, others wait for its result), a short randomized TTL jitter so keys do not all expire together, or serving stale-while-revalidate. A hot key is a single key so popular it saturates one node's CPU or network. Consistent hashing alone does not help because it is one key on one node, so replicate the hot entry across several nodes and randomize which replica a client reads, or add a small local in-process cache in front of the distributed tier.

Replication gives availability: each shard has a primary and one or more replicas, with async replication for speed (and a small window of lost writes on failover) or sync for safety. On primary failure a sentinel or the cluster gossip promotes a replica.

\`\`\`
GET k -> hash(k) -> ring -> node N3 (primary)
   miss -> coalesce -> DB read -> SET k (jittered TTL) -> return
hot key: replicate k to N3,N5,N7 -> client picks a random replica
\`\`\`

**Recap:** place keys with consistent hashing plus virtual nodes (never hash mod N), evict with LRU or LFU plus TTL, choose cache-aside by default, and defend hot keys with replication and stampedes with coalescing plus TTL jitter.
`.trim()

const keyValueStoreTeach = `
## The Dynamo lineage: scale by trading away single-machine transactions

A distributed key-value store is the Dynamo-lineage system (DynamoDB, Cassandra, Riak) that gives you horizontal scale and no single point of failure by trading away single-machine transactions. The interview tests four internals: partitioning, replication and quorums, conflict resolution, and the write path (LSM).

## Partitioning and quorums

Partitioning uses consistent hashing again. Keys map onto a ring, each node owns a range, and a replication factor N means each key is stored on the N nodes clockwise from its position (the preference list). Virtual nodes even out the load.

Replication and quorums are the heart. With N replicas, a write is acknowledged after W replicas confirm and a read waits for R replicas to respond. The tunable rule is: if R + W > N, a read quorum and a write quorum must overlap in at least one node, so a read is guaranteed to see the latest acknowledged write. Common settings: N=3, W=2, R=2 gives strong-ish reads with tolerance for one node down. W=1 is fast writes but risky; R=1 is fast reads that may be stale.

**Interview nuance:** the classic trap is claiming R + W > N gives linearizability. It does not. It guarantees you read a value at least as new as the last acknowledged write on the overlapping node, but concurrent writes, read-repair timing, and sloppy quorums (hinted handoff writing to fallback nodes) mean you can still see anomalies. Say "quorum overlap gives read-your-writes-ish freshness, not linearizability; for true linearizability you need consensus like Paxos or Raft."

## Conflicts and reconciliation

Conflicts happen because two clients can write the same key on different replicas during a partition. Resolution options: last-write-wins (LWW) by timestamp is simple but silently drops one write and is vulnerable to clock skew. Vector clocks track causality so you can detect true concurrency and either merge or hand both versions (siblings) to the application. Cassandra uses LWW; Dynamo used vector clocks. Replicas that drift are reconciled two ways: read-repair (on a read, if replicas disagree, push the newest to the stale ones) and anti-entropy using Merkle trees (nodes exchange hash trees of their ranges and only sync the differing subtrees, avoiding a full scan).

## The LSM write path

A write appends to a commit log for durability, then updates an in-memory sorted structure (memtable). When the memtable fills, it flushes to an immutable sorted file on disk (SSTable). Reads may check several SSTables, so a bloom filter per SSTable skips ones that cannot contain the key. Background compaction merges SSTables, drops tombstones (deletes), and keeps read amplification bounded. This design makes writes sequential and fast.

Membership uses gossip: nodes periodically exchange state so the cluster learns of joins and failures without a central coordinator. Hinted handoff keeps writes available during a brief node outage: a neighbor accepts the write with a hint and replays it when the owner returns.

\`\`\`
write k=v -> coordinator -> replicas [N1,N2,N3]
   commit log -> memtable -> (flush) SSTable ; bloom filter per SSTable
   ack after W replicas ; read waits for R ; R+W>N overlaps
\`\`\`

**Recap:** partition with consistent hashing and replication factor N, tune consistency with R + W > N (which is freshness, not linearizability), resolve conflicts with vector clocks or LWW plus read-repair and Merkle anti-entropy, and store writes in an LSM (commit log, memtable, SSTable, compaction).
`.trim()

const objectStoreS3Teach = `
## A durability-engineering problem

An object store (S3, GCS, Azure Blob) holds arbitrary blobs keyed by name, in flat buckets, at exabyte scale, with the headline promise of 11 nines of durability. The interview tests how you achieve that durability cheaply (erasure coding), how the metadata layer scales, and the consistency and read semantics (multipart, range GET). It is a durability-engineering problem more than a throughput one.

## Erasure coding

Durability drives cost. Full replication (store 3 copies) gives durability and simple reads but costs 3x storage. Erasure coding gives the same or better durability for far less overhead. Split an object into k data shards, compute m parity shards (Reed-Solomon), and store all k + m shards on different disks, racks, or AZs. Any k of the k + m shards reconstruct the object, so you tolerate m simultaneous failures. A common scheme is 10 + 4: 40% overhead to survive any 4 losses, versus 200% overhead for 3-way replication with weaker tolerance. The tradeoff: erasure coding adds CPU (encode on write, reconstruct on degraded read) and read amplification when a shard is missing, so hot small objects sometimes still use replication and large cold objects use erasure coding.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Erasure coding overhead vs 3x replication",
  "predictPrompt": {
    "question": "Keep 4 parity shards but widen the stripe from 10 to 20 data shards. What happens to the storage overhead multiplier?",
    "options": [
      "It doubles to 2.8x",
      "It stays at 1.4x",
      "It falls to 1.2x",
      "It rises to 1.8x"
    ]
  },
  "workedExample": "At the initial 10 data + 4 parity shards you store 14 shards for every 10 shards of data, a 1.4x multiplier, while surviving any 4 simultaneous shard losses; 3-way replication costs 3.0x and dies after just 2 lost copies. Widen the stripe to 20 data shards and overhead falls to 1.2x with the same 4-loss tolerance, because the fixed parity is amortized over more data. Then ask what the wider stripe costs at reconstruction time: rebuilding one lost shard now reads 20 survivors instead of 10.",
  "inputs": [
    {
      "kind": "slider",
      "id": "data_shards",
      "label": "Data shards (k)",
      "min": 4,
      "max": 20,
      "scale": "linear",
      "step": 1,
      "initial": 10,
      "unit": "shards"
    },
    {
      "kind": "slider",
      "id": "parity_shards",
      "label": "Parity shards (m)",
      "min": 1,
      "max": 6,
      "scale": "linear",
      "step": 1,
      "initial": 4,
      "unit": "shards"
    }
  ],
  "outputs": [
    {
      "id": "overhead_multiplier",
      "label": "Storage overhead multiplier",
      "expr": "(data_shards + parity_shards) / data_shards",
      "format": "number",
      "unit": "x",
      "sparkline": {
        "over": "data_shards"
      }
    },
    {
      "id": "losses_survived",
      "label": "Simultaneous shard losses survived",
      "expr": "parity_shards",
      "format": "number",
      "unit": "shards"
    }
  ],
  "caption": "For comparison, 3-way replication is a 3.0x multiplier and survives only 2 lost copies."
}
\`\`\`

**Interview nuance:** if you say "just keep 3 copies everywhere," name erasure coding immediately as the cost-saver and quantify it (roughly 1.4x vs 3x). Not knowing erasure coding is the tell that separates junior from senior on this problem.

## The metadata service

The blob data is easy (write shards to storage nodes), but you need a massive index mapping bucket + key to the shard locations and object metadata (size, etag, version, ACL). At trillions of objects this index cannot be one database. Partition it: shard the key space (often by a hash of bucket + key, or by key-range for prefix listing), store it in a horizontally scalable KV store or a sharded and replicated database, and cache hot metadata. Listing a bucket with billions of keys efficiently requires a sorted, range-partitioned index so prefix scans do not touch every shard.

## Consistency and large objects

S3 now offers strong read-after-write consistency for new objects and overwrites, achieved by making the metadata commit the point of truth (the write is not acknowledged until the index update is durable and visible). Versioning keeps old versions instead of overwriting, so a PUT to an existing key writes a new version and the index points at the latest.

Multipart upload lets a client split a large object into parts, upload them in parallel (and retry individual failed parts), and then issue a complete call that assembles them, which is how you upload terabytes reliably. Range GET lets a reader fetch bytes [start, end], essential for video seeking and resumable downloads; the store reads only the shards covering that range.

Background health: every shard is checksummed on write and periodically scrubbed. A scrubber detects bit rot or a failed disk, reconstructs the lost shards from the survivors, and rebalances data when nodes are added or removed, which is how durability is maintained over years, not just at write time. Lifecycle policies tier cold objects to cheaper storage (S3 to Glacier).

\`\`\`
PUT obj -> split into k data shards -> compute m parity (Reed-Solomon)
        -> place k+m shards across racks/AZs -> commit metadata (bucket+key -> shard map)
GET range -> metadata lookup -> read shards covering range -> (reconstruct if shard missing)
\`\`\`

**Recap:** hit 11 nines with erasure coding (k + m Reed-Solomon, roughly 1.4x overhead) instead of 3x replication, scale the metadata index by partitioning bucket+key across a KV store, give strong read-after-write via a durable metadata commit, support multipart upload and range GET, and maintain durability with checksums, scrubbing, and reconstruction.
`.trim()

const messageQueueTeach = `
## The backbone of async systems

A distributed log (Kafka, Pulsar, Kinesis) is the backbone of async systems: producers append events, consumers read them at their own pace, and the log decouples the two. The interview tests the log abstraction, delivery semantics (the famous exactly-once question), and how consumers scale.

## The append-only log

The core data structure is an append-only commit log. A topic is split into partitions, and each partition is an ordered, immutable sequence of messages identified by a monotonically increasing offset. Ordering is guaranteed only within a partition, not across the topic, which is the key constraint: if you need messages for a given user in order, you must route them all to the same partition (partition by user id). This is what lets Kafka scale, because different partitions live on different brokers and are read and written in parallel.

Durability comes from replication. Each partition has a leader and followers; the leader takes writes and followers replicate. The in-sync replicas (ISR) are those caught up to the leader. A producer's \`acks\` setting controls durability: \`acks=1\` acks after the leader writes (fast, can lose data if the leader dies before replication), \`acks=all\` acks only after all ISR replicas have the message (durable, higher latency). On leader failure a follower in the ISR is elected leader. Data is retained by time or size, or compacted (keep only the latest value per key) for changelog topics.

## Delivery semantics

At-most-once means a message may be lost but never redelivered (fire and forget, no retries). At-least-once means every message is delivered but may be duplicated (retry on failure, ack after processing), which is the pragmatic default. Exactly-once is the hard one, and the crucial nuance is that exactly-once delivery over a network is impossible; what systems provide is exactly-once processing.

**Interview nuance:** if you claim "exactly-once delivery," expect a challenge. The correct framing: we get at-least-once delivery from the broker plus idempotent consumers (dedupe on a message id or use an idempotency key) so that reprocessing a duplicate has no effect. Kafka's "exactly-once" is at-least-once delivery combined with idempotent producers (a producer id plus sequence number so the broker drops duplicate appends) and transactional writes that tie the consume-process-produce cycle to an atomic offset commit.

## Consumer scaling

Consumer groups: each partition is assigned to exactly one consumer in a group, so parallelism is capped at the partition count. Consumers track their position with committed offsets. When a consumer joins or dies, the group rebalances partition assignments. Two subtleties: commit the offset after processing (at-least-once) not before (which would be at-most-once and lose messages on crash), and backpressure is natural because a slow consumer just lags (its offset falls behind) rather than dropping data. A poison message that keeps failing goes to a dead-letter topic after N retries so it does not block the partition. Producers batch messages to trade latency for throughput.

\`\`\`
producer --partition by key--> topic P0 [m0 m1 m2 ...]  (leader + ISR followers)
                               topic P1 [n0 n1 n2 ...]
consumer group G: P0 -> C1, P1 -> C2   (one partition per consumer)
   process msg -> commit offset  (at-least-once) ; dedupe by id -> exactly-once processing
\`\`\`

**Recap:** model it as a partitioned append-only log with per-partition ordering, get durability from ISR replication and acks=all, offer at-least-once delivery plus idempotent consumers for exactly-once processing (never claim exactly-once delivery), and scale reads with consumer groups where parallelism equals partition count.
`.trim()

const jobSchedulerTeach = `
## Fire each job exactly once despite crashes

A distributed job scheduler fires jobs at their scheduled time (one-off or recurring) across a fleet of workers, and its defining challenge is firing each job exactly once even when workers crash mid-run. This is one of the hardest correctness problems in system design because "exactly once" collides with the reality that any worker can die or pause at any instant. The honest target is effectively-once through idempotency, not literal once-delivery.

## Storage and the "due now" query

Jobs have a next-run timestamp, and the scheduler must efficiently find all jobs due in the current window without scanning everything. Index by run time: a database index on \`next_run_at\`, or time-bucketed storage where each bucket is a minute or second and workers poll the current bucket. A poller wakes every second, queries \`WHERE next_run_at <= now AND status = 'pending'\`, and dispatches those jobs. At large scale you shard jobs across many buckets or partitions so no single poller is a bottleneck.

## Leasing with a visibility timeout

When a worker picks up a job it does not just mark it running; it acquires a lease: it atomically sets \`status = running, locked_by = worker, lease_expires_at = now + T\` in a single conditional update (compare-and-set on status). Only one worker wins the CAS, so only one runs the job. If that worker crashes, its lease expires and the job becomes eligible again, so another worker retries it. Crucially the job is retried, not duplicated, because a live worker holds the lease and a dead one's lease simply expires. This is the same visibility-timeout pattern SQS uses.

**Interview nuance:** the subtle failure is a paused worker. Suppose a worker acquires the lease, then suffers a long GC pause or network partition past its lease expiry. Its lease expires, a second worker picks up the job and runs it, and then the first worker wakes up and also runs it: a double-run. A lease alone does not prevent this. The fix is a fencing token: each lease grant carries a monotonically increasing token, and any external system the job writes to (or the completion update) rejects a token lower than the highest it has seen. So the resumed old worker's write is fenced off. Bring up fencing unprompted here; it is the senior signal.

## Exactly-once framing, clocks, misfires

You cannot guarantee a side effect runs exactly once across crashes, so combine at-least-once execution (retries via lease expiry) with idempotency. Give each job run an idempotency key so that if the job's action is retried, the downstream system dedupes it. Now a double-run produces a single effect.

For a cron job, on completion compute the next run and reschedule. Clock skew across machines means you should not rely on any single worker's clock for correctness; use the database's time or a logical ordering, and tolerate a small firing jitter. If the scheduler was down and missed a window, decide policy explicitly: catch up and run the missed occurrences, or skip to the next future one (misfire policy). Shard jobs by id or by time bucket so many pollers and workers run in parallel, add priority queues, and separate the scheduling tier from the execution tier.

\`\`\`
poller: SELECT jobs WHERE next_run_at<=now AND pending
worker: CAS status pending->running, lease_expires=now+T, token=n++   (only one wins)
   crash -> lease expires -> another worker retries (token n+1)
   downstream write carries token; rejects token < max_seen (fencing)
   completion: idempotency_key dedupes the side effect
\`\`\`

**Recap:** index jobs by run time and poll the due window, make a single worker win via a compare-and-set lease with a visibility timeout so crashes retry rather than duplicate, add fencing tokens to defeat the paused-worker double-run, achieve effectively-once with idempotency keys, and handle clock skew and missed windows with an explicit misfire policy.
`.trim()

const distributedLockTeach = `
## Why a naive lock is unsafe

A coordination service (ZooKeeper, etcd, Consul) gives a cluster the primitives it cannot build safely on its own: mutual exclusion (a distributed lock), leader election, and shared configuration that stays correct across process pauses and network partitions. The interview tests whether you understand why a naive lock is unsafe and how leases, fencing tokens, watches, and consensus combine into a correct one.

## Why a single Redis SETNX with TTL is unsafe

It looks like a lock: SET key if not exists, with an expiry so a dead holder does not deadlock forever. It is unsafe for two reasons. First, a single Redis node is a single point of failure, and Redis replication is asynchronous, so a failover can lose the lock key and grant the lock twice. Second, and more fundamental, the TTL creates a correctness hole: the holder can pause (a long GC, a scheduler preemption, a network partition) past the TTL, the lock expires, a second client acquires it, and then the first client wakes up still believing it holds the lock. Now two clients act in the critical section at once. No amount of tuning the TTL fixes this, because you cannot bound a pause.

**Interview nuance:** the two-part answer that impresses: (1) put the lock state in a consensus-backed store so it is linearizable and survives node failure, and (2) hand out a fencing token so a stale holder's writes are rejected. Miss the fencing token and you have not actually made the lock safe.

## Consensus, leases, fencing, watches

Build on a store whose state is replicated by a consensus protocol (Raft in etcd and Consul, Zab in ZooKeeper). A write commits only when a majority (quorum) of nodes agree, so the lock state is linearizable and survives minority failures. Under a partition only the majority side can make progress. This is the CP corner of CAP: during a partition the minority side becomes unavailable rather than returning possibly-wrong state.

A client holds a lock via a session with a TTL that it must renew by heartbeat. If the client dies or partitions away, it stops heartbeating, the session lease expires, and the lock is released automatically. ZooKeeper models this as an ephemeral znode; etcd as a lease attached to the key.

Fencing tokens are what make leasing safe. Each lock grant includes a monotonically increasing token (etcd's key revision, ZooKeeper's zxid). Every write the lock holder makes to the protected resource carries its token, and the resource remembers the highest token it has accepted and rejects any lower one. So when a paused old holder wakes up and tries to write with an old token, the resource fences it off.

Instead of polling "is the lock free yet," clients register a watch on the lock or leader key and receive a callback when it changes, giving fast failover. Leader election: candidates each create an ordered ephemeral key (a sequence number); the candidate with the lowest number is the leader; each other candidate watches only its immediate predecessor, so when the leader dies exactly one candidate is notified and takes over, avoiding a herd.

\`\`\`
acquire: create ephemeral seq key under /lock  -> get number
   lowest number holds the lock; token = key revision
   others watch predecessor (no polling)
protected resource: accept write only if token >= max_seen_token   (fencing)
partition: only majority quorum can grant -> minority is unavailable, not wrong
\`\`\`

**Recap:** a Redis SETNX-with-TTL lock is unsafe because a single node can fail over and a paused holder can outlive its TTL; build on a consensus-backed store (etcd, ZooKeeper) for linearizable lock state, auto-release via session leases and heartbeats, defeat the stale-holder double-run with monotonic fencing tokens, notify clients with watches instead of polling, and elect leaders with ordered ephemeral keys where each watches its predecessor.
`.trim()

const codeSandboxTeach = `
## The isolation boundary is the core decision

A code execution sandbox (an online judge like LeetCode, a CI runner, or this platform's own code runner) runs untrusted user code safely at scale. The defining decision is the isolation boundary: how strong a wall you put between hostile code and your host and other users. Assume the code is actively hostile (fork bombs, network exfiltration, kernel-escape attempts), because at contest scale someone will try.

## The isolation spectrum

From weakest and cheapest to strongest and heaviest: a plain OS process with rlimits is trivially escapable and unacceptable for hostile code. A container (Docker) is convenient and starts fast but shares the host kernel, so a kernel vulnerability is a full escape; a container alone is not a security boundary for hostile code. A hardened container (seccomp to whitelist syscalls, AppArmor or SELinux, non-root user, read-only filesystem, dropped capabilities) is a reasonable middle ground that shrinks the attack surface dramatically. gVisor puts a user-space kernel between the code and the host kernel, intercepting syscalls so a kernel bug is much harder to reach, at some performance cost. A microVM (Firecracker) or Kata Containers gives each submission its own tiny virtual machine with its own guest kernel and hardware-virtualization isolation, which is near-VM strength but boots in about 100ms, making it the strong default for untrusted code.

\`\`\`csdiagram
{
  "type": "ladder",
  "title": "The isolation spectrum: weakest and cheapest to strongest and heaviest",
  "scale": "linear",
  "bands": [
    {
      "label": "Plain OS process (rlimits)",
      "value": 1,
      "display": "trivially escapable",
      "note": "Starts instantly and costs nothing, but the wall is paper: trivially escapable and unacceptable for hostile code."
    },
    {
      "label": "Container (Docker)",
      "value": 2,
      "display": "shares the host kernel",
      "note": "Convenient and fast to start, but one kernel vulnerability is a full escape. A container alone is not a security boundary for hostile code."
    },
    {
      "label": "Hardened container (seccomp, AppArmor/SELinux)",
      "value": 3,
      "display": "shrunken attack surface",
      "note": "Syscall whitelist, non-root user, read-only filesystem, dropped capabilities: a reasonable middle ground that shrinks the attack surface dramatically at little extra startup cost."
    },
    {
      "label": "gVisor (user-space kernel)",
      "value": 4,
      "display": "kernel bugs hard to reach",
      "note": "A user-space kernel intercepts syscalls so a host kernel bug is much harder to reach, at some performance cost."
    },
    {
      "label": "microVM (Firecracker) / Kata",
      "value": 5,
      "display": "own guest kernel, boots ~100ms",
      "note": "Hardware-virtualization isolation with its own guest kernel: near-VM strength that still boots in about 100ms, the strong default for untrusted code."
    }
  ],
  "caption": "Each rung up buys isolation and pays startup and performance cost. Name the spectrum and commit: Firecracker microVMs as the strong default, a hardened seccomp container as the fallback."
}
\`\`\`

**Interview nuance:** the senior move is to name the spectrum and commit: "I would use Firecracker microVMs for true kernel isolation with fast startup, falling back to a hardened seccomp container if microVMs are not available." Saying "run it in a Docker container" and stopping there fails the security bar, because a container shares the host kernel.

## Resource limits and architecture

Use cgroups to cap CPU shares and memory (with a hard OOM kill), a wall-clock and CPU-time timeout to kill infinite loops, a pids limit to defeat fork bombs (a fork bomb without a pids cap exhausts the process table), disk quotas to stop a submission from filling the disk, and no network by default (or a strict egress allowlist) to prevent data exfiltration and abuse. Every submission runs in a fresh, throwaway sandbox that is destroyed after the run, so no state leaks between users.

A stateless API accepts submissions and immediately enqueues them onto a durable queue (SQS, Kafka), returning a job id. A pool of sandboxed workers pulls jobs, executes each in a fresh sandbox, and reports results. The queue decouples submission rate from execution capacity, so a contest spike buffers instead of overwhelming the fleet, and workers autoscale on queue depth. Because microVM cold start still costs latency, keep a warm pool of pre-booted sandboxes ready to accept a job, then destroy each after use.

Users want to see output as it runs, so stream stdout, stderr, and per-test progress back over SSE or WebSocket, store the final verdict durably, and cap output size so a submission that prints forever cannot exhaust memory or the client. Per-user rate limits and concurrency quotas so one user cannot monopolize the pool, and treat the sandbox host itself as potentially compromised by running the whole fleet in an isolated network segment with no access to production.

\`\`\`
POST /submit -> API (stateless) -> durable queue (SQS/Kafka) -> job id
warm pool of microVMs -> worker pulls job -> fresh Firecracker VM
   cgroups (cpu/mem), timeout, pids limit, no network, disk quota
   stream stdout/stderr/test-progress (SSE) -> store verdict -> destroy VM
\`\`\`

**Recap:** pick the isolation boundary deliberately (microVM/Firecracker as the strong default, hardened seccomp container as the middle ground, never a bare container for hostile code), bound every resource with cgroups plus timeouts plus a pids limit plus no network, run each submission in a fresh throwaway sandbox behind a queue and autoscaling worker pool with a warm pool for latency, and stream results while enforcing per-user fairness.
`.trim()

const webhookDeliveryTeach = `
## The receivers are outside your control

A webhook delivery system notifies customer-controlled endpoints when events happen (Stripe firing \`payment.succeeded\` to your server). The hard part is that the receivers are outside your control: they are slow, flaky, sometimes down for hours, and occasionally malicious. The interview tests your delivery guarantee, retry and backoff strategy, payload signing, idempotency and ordering, dead-letter handling, and per-tenant fairness.

## At-least-once plus consumer idempotency

Offer at-least-once. Persist every event first, enqueue a delivery task, and mark it delivered only when the endpoint returns a 2xx. If you crash after sending but before recording success, you redeliver, so duplicates are possible. This is the honest, standard guarantee; exactly-once delivery to an arbitrary external endpoint is not achievable, so you push idempotency to the consumer. Include a stable, unique event id in every payload (and an idempotency header) and document that delivery is at-least-once, so consumers dedupe on the id. Stripe, GitHub, and Shopify all do exactly this.

**Interview nuance:** the single most important architectural point: never deliver inline and synchronously from the event producer. If your checkout service calls the customer's webhook URL directly in the request path, a slow or hung customer endpoint backs up your producer and can stall the whole pipeline. Always persist the event and hand delivery to a separate, queue-driven delivery service.

## Retries, signing, ordering

On a failure (non-2xx, timeout, connection error) retry with exponential backoff plus jitter over a long window: seconds, then minutes, then hours, up to a day or more, with a capped attempt count. Backoff lets a down endpoint recover without a thundering herd, and jitter prevents all retries for a mass event from firing in lockstep. Use a per-attempt timeout (a few seconds) so a hung endpoint does not tie up a worker.

Sign each payload so the consumer can verify it really came from you and was not tampered with. Compute an HMAC-SHA256 over the raw body plus a timestamp using a per-customer secret, and send it in a header. The consumer recomputes and compares. Include the timestamp and reject old ones to prevent replay attacks, and support secret rotation with an overlap window.

Default to no strict global order because it is simpler and lets you deliver in parallel. When a tenant genuinely needs per-resource order, key delivery by resource id and deliver sequentially per key, holding back the next event for a key until the prior one is acknowledged. This costs throughput for that key, so make it opt-in.

## Dead-letter and fairness

After the max attempts, move the event to a dead-letter store, alert, and expose a manual replay or redrive API. Fairness is critical because endpoints vary wildly: isolate delivery per tenant with per-tenant queues (or a fair scheduler), per-tenant concurrency limits and rate limits, per-endpoint timeouts, and circuit breakers that stop hammering an endpoint that has been failing, so one slow or dead customer cannot consume all workers and starve everyone else.

\`\`\`
event -> persist -> enqueue delivery task (per-tenant)
worker: POST endpoint (HMAC-signed, timeout)
   2xx -> mark delivered ; non-2xx/timeout -> backoff+jitter retry (cap N)
   exhausted -> dead-letter + alert + manual redrive
circuit breaker + per-tenant concurrency -> one bad tenant cannot starve others
\`\`\`

**Recap:** guarantee at-least-once (persist, enqueue, ack on 2xx) with a stable event id so consumers dedupe, deliver from a separate queue-driven service (never inline), retry with exponential backoff plus jitter over a long window, sign payloads with HMAC-SHA256 plus timestamp and rotate secrets, make ordering opt-in per resource key, and protect everyone with dead-letters plus per-tenant isolation and circuit breakers.
`.trim()

const paymentLedgerTeach = `
## "Roughly correct" is a failing answer

Payments is the interview where "roughly correct" is a failing answer. The whole problem is money that must never be double-charged, never lost, and always auditable, and every design choice flows from that. Volume is modest by web standards (a large processor might do 5K to 50K payments/sec at peak), so this is a correctness problem, not a throughput problem.

## Idempotency, because retries are guaranteed

Networks time out, clients resubmit, and your own workers retry after crashes. Every mutating request carries a client-generated idempotency key (a UUID the client mints per logical intent). The payment service stores that key with the request result in a dedup table before doing work, keyed uniquely so a second request with the same key returns the first result instead of charging again. This turns at-least-once delivery into effectively-once behavior. Without it, one dropped ACK becomes a double charge.

## Double-entry, immutable ledger

The ledger is the source of truth, and it must be double-entry and immutable. Instead of storing a mutable \`balance\` column you update in place, you append immutable journal entries: every movement of money is two entries that sum to zero (debit one account, credit another). A charge of $50 becomes a debit to the customer's funding account and a credit to the merchant's payable account. A balance is then a derived sum of entries, never an overwritten field. This gives you a complete audit trail, makes reconciliation with the bank statement mechanical, and makes bugs detectable (entries that do not sum to zero are corruption you can alarm on).

**Interview nuance:** the fastest way to fail this round is proposing \`UPDATE accounts SET balance = balance - 50\`. Say explicitly that you use an append-only double-entry ledger and derive balances, because mutable balances make audit and reconciliation impossible and hide bugs.

## Coordinating across systems with a saga

A charge spans several systems (your wallet/ledger, an external provider like Stripe or Adyen, and the orders service), and you cannot hold a distributed ACID transaction across an external API. Use a saga (an orchestrated sequence of local transactions with compensating actions). The orchestrator: (1) reserves funds in the ledger as a pending entry, (2) calls the provider with an idempotency key, (3) on success posts the settled ledger entries and marks the order paid, (4) on failure posts a compensating reversal. State lives in a durable workflow so a crash resumes rather than orphans money.

\`\`\`
client --idem key--> Payment API --> dedup check
   |                                     |
   v                                     v
saga orchestrator --> ledger (pending) --> provider (charge, idem) --> ledger (settle) --> order paid
        \\--- on failure ---> compensating reversal entry ---/
\`\`\`

Providers confirm asynchronously via webhooks, which are themselves at-least-once, so webhook handlers must be idempotent too (dedup on the provider's event id). Reconcile daily by summing ledger entries and comparing to the provider's settlement report; any drift is an incident. Layer PCI scope reduction (never store raw PANs, tokenize via the provider) and fraud hooks on top.

**Recap:** idempotency keys on every mutating call turn retries safe, an append-only double-entry ledger with derived balances gives auditability and reconciliation, and a saga with compensations plus idempotent webhook handling coordinates the provider, wallet, and orders without a distributed transaction.
`.trim()

const ecommerceFlashSaleTeach = `
## Correctness and concurrency collide

A flash sale is the interview where correctness and concurrency collide. You have a finite inventory (10,000 concert seats), millions of buyers arriving in the same second, and one absolute rule: never oversell. Everything else (fairness, UX, latency) is negotiable, but selling seat 4A twice is a lawsuit.

## The read-modify-write race

If two requests both read \`available = 1\`, both decide "yes, buy," and both write \`available = 0\`, you have sold one item twice. Naive application-level checks always lose under concurrency. You need the decrement to be atomic. Three real options: (1) an atomic conditional update in the database, \`UPDATE inventory SET available = available - 1 WHERE item_id = ? AND available > 0\`, and check that exactly one row changed; (2) an atomic operation in Redis (DECR with a Lua script that rejects going below zero), serving as a fast front-line counter backed by durable storage; (3) a per-item serialized queue where a single consumer processes purchase requests for a hot item in order, converting contention into a sequential log.

**Interview nuance:** interviewers deliberately probe the race. State plainly that you never do "read available, then write" in app code; the check and decrement must be a single atomic operation, and you verify the affected-row count to confirm you actually won the decrement.

\`\`\`cswidget
{
  "type": "sequence",
  "title": "Flash sale: two buyers, one seat",
  "actors": [
    {
      "id": "buyer1",
      "label": "Buyer 1"
    },
    {
      "id": "buyer2",
      "label": "Buyer 2"
    },
    {
      "id": "service",
      "label": "Service"
    },
    {
      "id": "db",
      "label": "Database"
    }
  ],
  "toggles": [
    {
      "id": "atomic",
      "label": "Atomic decrement",
      "description": "check and decrement in one conditional UPDATE where available > 0; verify exactly one row changed"
    }
  ],
  "steps": [
    {
      "from": "buyer1",
      "to": "service",
      "label": "buy 1 ticket",
      "kind": "request",
      "state": {
        "available": "1",
        "sold": "0"
      }
    },
    {
      "from": "buyer2",
      "to": "service",
      "label": "buy 1 ticket",
      "kind": "request"
    },
    {
      "from": "service",
      "to": "db",
      "label": "read available (B1)",
      "kind": "request",
      "when": "!atomic"
    },
    {
      "from": "db",
      "to": "service",
      "label": "available = 1",
      "kind": "response",
      "when": "!atomic"
    },
    {
      "from": "service",
      "to": "db",
      "label": "read available (B2)",
      "kind": "request",
      "when": "!atomic"
    },
    {
      "from": "db",
      "to": "service",
      "label": "available = 1 again",
      "kind": "response",
      "when": "!atomic"
    },
    {
      "from": "service",
      "to": "db",
      "label": "B1 write: decrement",
      "kind": "request",
      "when": "!atomic",
      "state": {
        "available": "0",
        "sold": "1"
      }
    },
    {
      "from": "service",
      "to": "db",
      "label": "B2 write: decrement",
      "kind": "request",
      "status": "error",
      "when": "!atomic",
      "state": {
        "available": "-1",
        "sold": "2"
      },
      "predict": {
        "question": "Buyer 2's write is about to commit. What does the database end up with?",
        "options": [
          "available -1, sold 2: oversell",
          "the write fails, 0 rows changed",
          "the database blocks buyer 2"
        ]
      }
    },
    {
      "from": "service",
      "to": "buyer1",
      "label": "confirmed",
      "kind": "response",
      "when": "!atomic"
    },
    {
      "from": "service",
      "to": "buyer2",
      "label": "confirmed: oversold!",
      "kind": "response",
      "status": "error",
      "when": "!atomic"
    },
    {
      "from": "service",
      "to": "db",
      "label": "B1: decrement if > 0",
      "kind": "request",
      "when": "atomic",
      "state": {
        "available": "0",
        "sold": "1"
      }
    },
    {
      "from": "db",
      "to": "service",
      "label": "1 row changed",
      "kind": "response",
      "when": "atomic"
    },
    {
      "from": "service",
      "to": "db",
      "label": "B2: decrement if > 0",
      "kind": "request",
      "when": "atomic",
      "predict": {
        "question": "Buyer 2's write is about to commit. What does the database end up with?",
        "options": [
          "available -1, sold 2: oversell",
          "the write fails, 0 rows changed",
          "the database blocks buyer 2"
        ]
      }
    },
    {
      "from": "db",
      "to": "service",
      "label": "0 rows changed",
      "kind": "response",
      "status": "error",
      "when": "atomic",
      "state": {
        "available": "0",
        "sold": "1"
      }
    },
    {
      "from": "service",
      "to": "buyer1",
      "label": "confirmed",
      "kind": "response",
      "when": "atomic"
    },
    {
      "from": "service",
      "to": "buyer2",
      "label": "sold out, no oversell",
      "kind": "response",
      "when": "atomic"
    }
  ],
  "caption": "With the toggle off, both buyers read available = 1 and both writes land: sold = 2, available = -1. Flip 'Atomic decrement' and the check and decrement become one operation, so buyer 2 changes 0 rows and fails cleanly."
}
\`\`\`

## Reservation holds

Real commerce does not charge instantly, so you need reservation holds. When a buyer adds a seat to their cart, you decrement inventory and create a hold with a TTL (say 10 minutes). The seat is unavailable to others during the hold. If the buyer completes checkout, the hold converts to a sale; if the TTL expires, a background sweeper (or a lazy check on next read) releases the seat back to inventory via an atomic increment. This prevents both oversell and permanent leakage from abandoned carts. Optimistic locking (version numbers, retry on conflict) works when contention is low; pessimistic locking or serialized queues are better for genuinely hot items where most optimistic attempts would fail and retry-storm.

## The waiting room

You cannot let 5 million people hit checkout simultaneously; you would melt the inventory store no matter how atomic it is. Put a virtual waiting room in front: arriving users get a queue token, are shown a "you are number 480,000 in line" page, and are admitted in controlled batches at a rate the backend can absorb (say 5,000 checkouts/sec). This sheds and paces load and provides fairness (FIFO or a randomized lottery to defeat bots). Only admitted users can even attempt a reservation, so the inventory store sees bounded QPS regardless of how many people showed up.

\`\`\`
5M arrivals -> Waiting Room (token, FIFO/lottery) -> admit 5K/sec
   -> Reservation (atomic decrement + hold TTL) -> Checkout saga -> Payment -> convert hold to sale
                                    \\-- TTL expiry --> atomic increment (release) --/
\`\`\`

Hot-item sharding has a limit: you cannot shard a single seat, so the truly contended item is serialized. Accept that a sold-out item's throughput is bounded by one atomic counter, and design the waiting room so most users never reach it.

**Recap:** prevent oversell with a single atomic conditional decrement (never read-then-write), use reservation holds with TTL and automatic release for the cart window, and put a fair, rate-limiting waiting room in front to shed and pace the spike so the inventory store sees bounded load.
`.trim()

const webCrawlerTeach = `
## The canonical large-scale batch pipeline

A web crawler is the canonical large-scale batch pipeline: discover, fetch, dedup, store, and repeat, across billions of pages, without getting banned. The interview tests whether you can build a distributed producer-consumer loop that is polite, deduplicated, and incrementally fresh.

## The frontier

The heart is the frontier: the queue of URLs to fetch. It is not a single FIFO. It must do two jobs at once: prioritize (crawl important, fresh, high-PageRank pages first) and enforce politeness (never hammer one host). The classic design (Mercator style) uses two layers of queues: front queues for priority (a URL is assigned to a priority band) and back queues for politeness (each back queue holds URLs for exactly one host, and a per-host timer enforces a minimum delay, respecting \`Crawl-delay\` and robots.txt). A heap of "next-fetch-time per host" tells the fetchers which host is due. This is what keeps you from sending 10,000 requests/sec to one small site and getting your IP blocked.

**Interview nuance:** politeness is the single most common thing juniors omit and the first thing interviewers probe. Say explicitly: fetch robots.txt per host (and cache it), enforce a per-host rate limit / min delay, identify with a real User-Agent, and back off on 429/503. A crawler without politeness gets banned and is useless.

## Dedup at two levels

URL dedup: before adding a URL to the frontier, check whether you have seen it, using a normalized URL (canonicalize scheme/host/case, strip tracking params, resolve relative links). At billions of URLs a hash set in memory is too big, so use a bloom filter (or scalable variant) for a fast "definitely new / probably seen" check backed by a durable seen-set store; a bloom filter's false positives cost you a few dropped new URLs, which is acceptable. Content dedup: many URLs return identical or near-identical content (mirrors, session-id URLs, print pages). Hash the content (or use MinHash/simhash shingling for near-duplicate detection) so you do not index the same page a million times. This also helps with crawler traps (infinite calendars, faceted-search URL explosions) which you additionally bound with max-depth and per-host URL caps.

## Fetching and freshness

Fetching is distributed and I/O-bound. Run many fetcher workers pulling due URLs from the frontier, with async I/O for high concurrency per box, DNS caching (DNS lookups are a real bottleneck at scale, cache aggressively), and connection reuse. Fetched pages go to a raw store (S3/HDFS) as the crawl corpus, a link-extraction stage parses out new URLs and feeds them back to the frontier (the loop), and the corpus feeds a downstream indexing pipeline that builds the inverted index.

\`\`\`
Frontier (front=priority, back=per-host politeness)
   -> Fetchers (async I/O, DNS cache, robots check)
   -> raw store (S3)  --> link extractor --> URL dedup (bloom) --> back to Frontier
                      \\-> content dedup (simhash) --> Indexer (inverted index)
\`\`\`

Freshness needs incremental recrawl, not one-shot. Estimate change rates per page (news changes hourly, an archive never does) and schedule recrawls adaptively, using HTTP conditional GETs (If-Modified-Since / ETag) so unchanged pages cost a cheap 304 instead of a full refetch.

**Recap:** a two-layer frontier balances priority and per-host politeness, bloom-filter URL dedup plus simhash content dedup avoid redundant work and traps, distributed async fetchers with DNS caching do the I/O, and adaptive incremental recrawl with conditional GETs keeps the corpus fresh.
`.trim()

const metricsMonitoringTeach = `
## Write throughput and cardinality control

A metrics platform ingests a firehose of numbers over time (millions of data points per second from thousands of hosts), stores them cheaply, serves fast dashboard queries, and fires alerts. The interview is really about two things: write throughput into a time-series database, and controlling cardinality so cost does not explode.

## The cardinality trap

A metric is a name plus a set of labels plus a timestamped value: \`http_requests_total{service="checkout", region="us-east", status="200"} = 4823 @ t\`. The unique combination of label values is a time series. Here is the trap that dominates this problem: cardinality is the product of all label value counts. Add a \`user_id\` label with 10M values and one metric becomes 10M time series, and your storage and query cost explode. Controlling cardinality (never put unbounded-cardinality fields like user id, request id, or email in labels) is the single most important design discipline.

**Interview nuance:** when asked "what breaks first," say high-cardinality labels. Interviewers want to hear that you would reject \`user_id\`/\`trace_id\` as labels, cap label sets, and detect cardinality spikes, because unbounded cardinality is what actually takes these systems down.

## Ingestion and storage

Agents on each host batch and push samples (or the platform scrapes \`/metrics\` endpoints on an interval, the Prometheus pull model). A high-throughput front door (a stateless ingestion tier writing to Kafka) buffers the firehose and decouples spiky producers from storage. Batching and compression are essential: time-series data compresses beautifully because timestamps are regular and adjacent values are similar (delta-of-delta timestamp encoding plus XOR float compression, the Gorilla/Facebook technique, gets ~1.3 bytes per sample versus 16 raw).

Storage is a purpose-built TSDB (Prometheus TSDB, Cortex/Mimir, InfluxDB, TimescaleDB) organized for the dominant query pattern: "give me one series over a time range." Data is partitioned by time into blocks (recent blocks in memory/SSD for fast writes and hot reads, older blocks flushed to object storage) and indexed by label so a query can find matching series quickly.

## Retention, rollups, alerting

You do not keep raw 1-second resolution for a year. Downsample: keep raw for a short window (e.g., 15 days), then pre-aggregate into 5-minute and 1-hour rollups (min/max/avg/count) for longer retention. A dashboard showing last quarter reads cheap hourly rollups, not billions of raw points. Retention tiers plus rollups are the cost-control lever alongside cardinality.

\`\`\`
hosts -> agents (batch, compress) -> Kafka -> ingester (TSDB write)
                                                  |
   raw (hot, in-mem/SSD) --downsample--> 5m/1h rollups (cold, object store)
                                                  |
   Query engine (label index, range scan) -> dashboards
   Rule evaluator (every 15s) -> alerts -> dedup/group -> notify (PagerDuty/Slack)
\`\`\`

Alerting is periodic rule evaluation. A rule engine runs queries on a schedule (e.g., every 15s), \`avg(rate(errors[5m])) > 0.05\`, and on a firing condition creates an alert. Crucially, an alert manager deduplicates and groups (one incident, not 500 pages from 500 hosts), applies silences/inhibitions, and routes to PagerDuty/Slack/email.

**Recap:** buffer the ingestion firehose through Kafka into a compressed TSDB partitioned by time, control cost with cardinality limits plus retention tiers and downsampled rollups, serve dashboards from a label-indexed query engine, and evaluate alert rules on a schedule with a dedup/group/route alert manager.
`.trim()

const adClickAggregatorTeach = `
## Fast and eventually exact

An ad click aggregator ingests a high-volume stream of click events and produces per-campaign counts that advertisers see in near real time and that also feed billing, so the numbers must be both fast and eventually exact. This is the canonical streaming-aggregation interview, and it lives or dies on two ideas: idempotent counting and reconciling real-time with batch truth.

## Idempotent counting

The naive design fails immediately. If you just do \`counter++\` per event on an at-least-once stream (Kafka redelivers on consumer restart), you double-count, and since clicks are money, that is fraud-by-bug. You need exactly-once or idempotent counting. Each click carries a unique id; dedup on it. At high volume you cannot keep every id forever, so use a bloom filter or a windowed dedup store (recent ids in Redis with TTL) to reject replays cheaply, accepting a tiny false-positive rate. Alternatively, lean on the stream processor's exactly-once semantics (Flink checkpointing, Kafka transactions) so an aggregate update and the source offset commit are atomic, meaning a replay after crash does not double-apply.

**Interview nuance:** state the delivery-semantics problem out loud: Kafka gives at-least-once by default, so naive increments double-count. Name your fix (Flink exactly-once via checkpointed state + transactional sink, or explicit dedup on click id), because "just increment a counter" is the failing answer.

## Event time and watermarks

Clicks arrive late and out of order (a mobile device offline for an hour uploads its clicks later). You aggregate over windows (per-minute, per-hour tumbling windows per campaign), and you need watermarks to decide when a window is "done." A watermark is the stream's assertion that "no events older than T will still arrive," so the window can close and emit. You also configure allowed lateness: hold windows open a bit past the watermark to admit stragglers, and emit late updates for clicks arriving after close. Event time (when the click happened) not processing time (when you saw it) is what you window on, or your counts are wrong whenever ingestion lags.

## Lambda / Kappa

Real-time systems are approximate and can have gaps, so the industry pattern is Lambda or Kappa. Lambda runs two paths: a fast streaming path (Flink) that gives immediate, slightly-approximate counts for the advertiser dashboard, and a slow batch path (Spark over the raw event log in S3, run hourly/daily) that recomputes the exact, deduplicated, fraud-filtered numbers that billing uses. The batch layer is the source of truth and corrects any streaming drift. Kappa simplifies to one streaming engine with replay: the same Flink job can reprocess from the Kafka/log retention to recompute, avoiding two codebases.

\`\`\`
clicks -> Kafka (raw log, retained) --> Flink (windows + watermarks + dedup) --> sharded counters -> dashboard (fast, ~approx)
                          \\--> S3 raw --> Spark batch (hourly, exact, fraud-filtered) --> billing (truth)
\`\`\`

Hot campaigns create counter hotspots; a viral ad might take millions of increments/sec on one key. Shard the counter into N sub-counters updated independently and summed on read, and pre-aggregate within the stream processor before writing. Fraud/bot filtering (dedup, rate anomalies, click-farm patterns) runs in-stream for fast defense and again in batch for the authoritative purge.

**Recap:** dedup clicks idempotently (bloom/windowed store or Flink exactly-once) so at-least-once delivery does not double-count, window on event time with watermarks and allowed lateness for out-of-order clicks, use Lambda/Kappa so a fast approximate stream is reconciled by an exact batch (or replayable) source of truth, and shard hot-campaign counters.
`.trim()

const leaderboardTopkTeach = `
## A trap wearing a trivial costume

A leaderboard looks trivial ("sort players by score") and is a trap, because the naive SQL answer collapses under load. The interview tests whether you know the right data structure (a sorted set), how to scale it, how to handle hot counters, and where approximation is a legitimate win.

## The sorted set

The wrong instinct is \`SELECT ... ORDER BY score DESC LIMIT 10\` plus, for a player's rank, \`SELECT COUNT(*) WHERE score > my_score\`. Both do a full sort or scan on every request, and at tens of millions of players and constant score updates they melt. The right primitive is a Redis sorted set (ZSET). A ZSET keeps members ordered by score in a skip list, giving O(log n) inserts/updates (ZADD), O(log n + k) top-K reads (ZREVRANGE 0 k), and O(log n) rank lookup (ZREVRANK). That single structure answers both "top 10" and "my rank" without scanning everyone.

**Interview nuance:** the interviewer wants you to reject the SQL-sort-per-request answer and name the sorted set with its complexities. Saying "Redis ZSET, ZREVRANGE for top-K, ZREVRANK for my rank, both O(log n)" is the seniority signal.

## Sharding the ZSET

A single ZSET has limits at tens of millions of members and high write rate, so shard it. Segment by natural boundaries (region, league, time window like daily/weekly boards) so each ZSET stays a manageable size, and maintain a smaller global top-N ZSET merged from the top of each shard for the global board (only the top entries of each shard can be globally top-N, so you merge cheaply). All-time boards are snapshotted periodically. "My rank" within a segment is exact; global exact rank across shards is expensive, so global rank is often approximate or bucketed ("top 1%").

## Hot counters and approximation

A single hot key (global likes, total views, a mega-popular player's score) taking millions of increments/sec becomes a write hotspot and lock contention point. The fix is a sharded/distributed counter: split the logical counter into N sub-counters (\`counter:0..N-1\`), increment a random shard per write so writes fan out, and sum the N shards on read. This trades a slightly more expensive read for massive write parallelism.

Where exactness is not required, approximate structures are a big memory win. HyperLogLog counts unique items (unique players seen, unique visitors) with ~2 percent error in ~12 KB regardless of cardinality, versus gigabytes for an exact set. Count-Min Sketch estimates per-item frequencies and heavy hitters (approximate top-K of a stream) in fixed memory with bounded overcount. Use these when "about 4.2M unique" or "roughly the top trending items" is good enough.

\`\`\`
score update -> DB (truth) + ZADD to segment ZSET (O(log n))
top-K:  ZREVRANGE segment 0 k          (O(log n + k))
my rank: ZREVRANK segment player       (O(log n))
global:  merge top-N of each shard ZSET
hot counter: INCR counter:rand(0..N) ; read = SUM(counter:0..N-1)
unique count: HyperLogLog ; trending top-K: Count-Min Sketch
\`\`\`

Durability matters: Redis is the fast serving/index layer, not the system of record. Persist authoritative scores in a database and treat the ZSET as a rebuildable index (write-behind, or rebuild from an event stream), so a Redis loss is a rebuild, not data loss.

**Recap:** use a Redis sorted set for O(log n) updates and top-K/rank reads instead of SQL sort-per-request, shard the ZSET by segment with a merged global top-N, break hot counters into summed sub-counters for write parallelism, reach for HyperLogLog and Count-Min Sketch when approximate is good enough, and keep authoritative scores in a database with Redis as a rebuildable index.
`.trim()

const stockExchangeTeach = `
## Web instincts are all wrong here

An order-matching engine is the interview where the usual web instincts (throw it in a database, shard it, scale horizontally) are all wrong, and knowing why is the whole point. The requirements are microsecond latency, perfect determinism (an audit must be able to replay every fill exactly), and strict fairness. Those force a single-writer, in-memory, event-sourced design.

## Price-time priority

The matching rule is price-time priority over a limit order book: for buys, highest price first; for sells, lowest price first; and at the same price, the earliest order wins (time priority). A limit order rests in the book until matched; a market order takes the best available price immediately; a cancel removes a resting order. The book is two sorted structures (bids descending, asks ascending) grouped by price level, each level a FIFO queue of orders. Matching pops the best price levels and fills in time order.

## Single-writer, single-threaded

The counterintuitive core: use a single-writer, single-threaded matching engine, not a database with locks. Why is single-threaded faster and more correct here? Because a lock per order in a general database adds milliseconds and nondeterminism (thread scheduling decides tie-breaks), and this domain needs microseconds and reproducibility. A sequencer assigns a total order to all inbound events (every order, cancel, and modify gets a monotonic sequence number), and a single thread processes them one at a time from an in-memory ring buffer (the LMAX Disruptor pattern), with no locks, cache-friendly memory access, and no cross-thread nondeterminism. Horizontal scale comes from sharding by instrument: each symbol (AAPL, TSLA) gets its own single-writer engine, and there is no cross-symbol coordination on the hot path.

**Interview nuance:** the signal here is explaining that single-threaded beats multi-threaded for this workload. Say: the bottleneck is not CPU throughput, it is determinism and tail latency, and a lock-free single writer over sequenced input gives both, which a sharded transactional database cannot.

The order book lives entirely in memory (arrays or intrusive structures per price level for O(1) best-price access), with no per-order database round-trip on the hot path, because a disk read would blow the microsecond budget.

## Determinism and recovery

Determinism is a hard requirement, not a nice-to-have, because regulators and replay demand that the same ordered input always yields identical output. That means: no wall-clock decisions in matching logic (derive time and ids from the sequence number), no random tie-breaking, and no multi-threaded races. Given the exact same sequenced input, a replay must reproduce every fill identically.

Recovery uses event sourcing. Before the engine acts on an accepted event, append it to a durable, replicated journal (the sequenced event log). On a crash, spin up a fresh engine and replay the journal to reconstruct the exact book state; periodic snapshots bound replay time so you replay from the last snapshot forward rather than from the beginning of the day. Because matching is deterministic, replay is guaranteed to rebuild the identical book.

\`\`\`
orders --> pre-trade risk checks --> Sequencer (assign seq #, append to journal)
   --> [single-threaded matching engine per instrument, in-memory book]
   --> fills + book deltas --> market-data bus (multicast/streaming)
Journal (replicated) --replay--> hot-standby replica (deterministic takeover)
\`\`\`

Market-data fan-out must not slow matching: publish trades and book deltas onto a separate high-throughput multicast or streaming bus so slow subscribers cannot backpressure the matcher. Availability comes from hot-standby replicas that consume the same sequenced log and can take over deterministically, plus pre-trade risk checks in front of the matcher (credit/position limits) so bad orders never reach the book.

**Recap:** match by price-time priority in an in-memory order book, process a single-writer sequenced event stream single-threaded (Disruptor style) for lock-free determinism and microsecond latency, shard by instrument for scale, keep matching fully deterministic (no wall-clock, no randomness), recover by replaying a replicated event journal from snapshots, and fan out market data on a separate bus with hot standbys for availability.
`.trim()

export const systemDesignLevel10: DesignLevel = {
  id: 10,
  slug: "case-studies",
  title: "Level 10: Applied Case Studies",
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
    {
      id: "sd-l10-m4",
      title: "Storage & Infrastructure Systems",
      description:
        "Run the infrastructure 'design X' interviews that sit under almost every product: a distributed cache, a key-value store, an object store, a Kafka-style log, a job scheduler, a coordination service, a code sandbox, and a webhook delivery system, reasoning from durability and consistency guarantees down to the one hard correctness detail each problem is really testing.",
      lessons: [
        {
          id: "sd-l10-distributed-cache",
          title: "Design a Distributed Cache (Redis-like)",
          summary:
            "Place keys with consistent hashing plus virtual nodes (never hash mod N), evict with LRU or LFU plus TTL, choose cache-aside by default, and defend hot keys with replication and stampedes with coalescing plus TTL jitter.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["distributed-cache", "consistent-hashing", "eviction"],
          teach: { markdown: distributedCacheTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-distributed-cache-apply",
            prompt:
              "Design a distributed in-memory cache with consistent hashing, replication, and an eviction policy for a read-heavy service.",
            thinkAbout: [
              "How do consistent hashing and virtual nodes distribute keys?",
              "Which eviction policy and cache pattern fit?",
              "How do you handle stampede and hot keys?",
            ],
            modelAnswerOutline: [
              "Assumptions: a read-heavy service (say 90:10 read:write), millions of keys, values from bytes to a few KB, sub-millisecond p99 lookup target, and the cache is allowed to lose data on crash because the database is the source of truth.",
              "**Placement:** map keys and nodes onto a consistent hashing ring, with 150 virtual nodes per physical node so load is even and node loss spreads across survivors. A client library (or a proxy like Twemproxy or the Redis Cluster smart client) hashes the key and routes directly to the owning node, so there is no central bottleneck. Adding capacity moves only about 1/N of keys.",
              "**Eviction:** LRU with sampled approximation (evict the oldest of a small random sample) for O(1) writes, plus a TTL on every entry so stale data self-expires. If the workload is a stable popular set, switch to LFU so a burst of one-off reads does not evict the hot working set.",
              "**Pattern:** cache-aside. The app reads the cache, and on a miss reads the DB and populates the cache with a jittered TTL. Writes update the DB and either delete or update the cache key, so we never serve a value we know is stale.",
              "**Replication and failover:** each shard is a primary with one async replica. On primary failure, cluster gossip or a sentinel promotes the replica, accepting a sub-second window of possibly lost recent writes, which is fine because the DB is authoritative.",
              "**Stampede protection:** request coalescing so only one request per key fetches from the DB while others wait, plus randomized TTL jitter so popular keys do not all expire in the same second. **Hot keys:** detect via per-key request counters, then replicate the hot entry to several nodes and have clients read a random replica, or push a tiny local LRU into each app process. Common wrong turn: hash-mod-N sharding, which reshuffles nearly all keys and stampedes the DB whenever the fleet size changes.",
            ],
          },
          practice: {
            id: "sd-l10-distributed-cache-practice",
            prompt:
              "Design the caching tier for Twitter's home timeline reads, where a celebrity tweet from an account with 100M followers triggers a read fan-out spike, sustained reads run at 300K QPS globally, and a single trending key can attract 500K reads/sec.",
            thinkAbout: [
              "Why does a multi-tier cache (in-process + Redis cluster) matter for a trending key?",
              "How does hot-entry replication give N times serving capacity for one key?",
              "Why is fan-out-on-read for celebrities the core insight?",
            ],
            modelAnswerOutline: [
              "Assumptions: reads dominate massively, the working set is billions of small objects (tweet blobs, timeline id lists), latency budget is a few milliseconds, and traffic is bursty around trending content.",
              "**Topology: a multi-tier cache.** Tier 1 is a small in-process LRU in each application server holding the hottest few thousand keys, which absorbs the trending-key spike before it ever leaves the box. Tier 2 is a large sharded Redis cluster placed by consistent hashing with virtual nodes, replicated per region. A trending key at 500K reads/sec would melt one Redis node, so we explicitly replicate hot entries across N nodes and have clients read a random replica, giving N times the serving capacity for that key. The in-process tier means most of those 500K reads never reach Redis at all.",
              "**Fan-out choice:** for normal users we precompute and cache the timeline id list (fan-out on write). For celebrities with 100M followers, fan-out on write is catastrophic (one tweet writes 100M timelines), so we fan-out on read for their tweets: cache the celebrity's recent tweets as a hot key and merge them into each follower's timeline at read time. This hybrid is the core insight.",
              "**Stampede:** when a viral tweet's cache entry expires, coalesce so one request rebuilds it while others serve stale, and use TTL jitter across timeline keys.",
              "**Consistency:** timelines tolerate seconds of staleness, so async replication and cache-aside are fine; we optimize for availability and latency over freshness. Common wrong turn: treating a celebrity like a normal user (fan-out on write to 100M timelines) or letting a single trending key ride one Redis shard with no replication or local tier.",
            ],
          },
        },
        {
          id: "sd-l10-key-value-store",
          title: "Design a Key-Value Store (DynamoDB/Cassandra)",
          summary:
            "Partition with consistent hashing and replication factor N, tune consistency with R + W > N (which is freshness, not linearizability), resolve conflicts with vector clocks or LWW plus read-repair and Merkle anti-entropy, and store writes in an LSM (commit log, memtable, SSTable, compaction).",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["key-value-store", "quorum", "lsm"],
          teach: { markdown: keyValueStoreTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-key-value-store-apply",
            prompt:
              "Design a horizontally scalable KV store with tunable consistency and no single point of failure.",
            thinkAbout: [
              "How do consistent hashing and replication factor form the ring?",
              "How do R/W quorums give tunable consistency?",
              "How are conflicts resolved and replicas reconciled?",
            ],
            modelAnswerOutline: [
              "Assumptions: a multi-node cluster serving get/put on opaque keys, high write and read throughput, must survive node and rack failures with no coordinator SPOF, and callers want to trade consistency for latency per operation.",
              "**Partitioning:** consistent hashing ring with virtual nodes for even load. Replication factor N (default 3); each key lives on the N nodes clockwise from its hash (its preference list), ideally spread across racks or AZs. Any node can act as coordinator and forward to the preference list, so there is no single point of failure.",
              "**Tunable consistency:** expose W and R. A write acks after W replicas persist; a read gathers R responses and returns the newest. R + W > N guarantees the quorums overlap, so reads see the latest acknowledged write. Defaults N=3, W=2, R=2 tolerate one node down while staying fresh; a latency-sensitive path can drop to R=1, a durability-critical path can raise W=3.",
              "**Conflict resolution:** attach a version to each value. Vector clocks detect concurrent writes so we can surface siblings to the app or merge them; LWW by a hybrid logical clock is simpler but silently drops a write. Reconcile drifting replicas with read-repair on the read path and background anti-entropy using Merkle trees so only differing ranges sync.",
              "**Write path:** append to a commit log, update the memtable, flush to immutable SSTables, and compact in the background; a bloom filter per SSTable bounds read amplification. Availability: gossip for membership and failure detection, and hinted handoff so a temporary node outage does not block writes.",
              "Tradeoffs and the wrong turn: R + W > N gives read-your-writes freshness, not linearizability, because concurrent writes and sloppy quorums still allow anomalies; for true linearizable operations you need a consensus group (Raft) per partition, which costs latency. Claiming quorum overlap equals linearizability is the classic mistake.",
            ],
          },
          practice: {
            id: "sd-l10-key-value-store-practice",
            prompt:
              "Design the storage engine behind DynamoDB's single-digit-millisecond p99 for a shopping-cart workload at Amazon scale, where carts must never lose an item even during a network partition and traffic can spike 10x on Prime Day.",
            thinkAbout: [
              "Why choose AP (availability over consistency) for a cart?",
              "Why is last-write-wins a bug for carts, and what merges without loss?",
              "How do adaptive capacity and pre-warming survive a Prime Day spike?",
            ],
            modelAnswerOutline: [
              "Assumptions: billions of small cart items, extreme write availability required (a dropped 'add to cart' is lost revenue), p99 reads and writes in the low milliseconds, and correctness can be eventually resolved as long as no accepted write is ever lost.",
              "**Availability over consistency** (the original Dynamo motivation). Choose AP under partition. Writes are always accepted on the available replicas (W=1 or a sloppy quorum with hinted handoff), so a partition never blocks 'add to cart.' The cost is temporary divergence, which we resolve rather than prevent.",
              "**Conflict handling for carts:** model the cart as a set and resolve concurrent writes by merging, not by LWW. Vector clocks (or a CRDT set) let two partitioned writes each add a different item and then merge into the union on read, so nothing is lost. LWW here would be a bug because it would drop one of two concurrent additions. This merge-on-read is exactly why Dynamo chose vector clocks for carts.",
              "**Scale and hotspots:** partition by cart id with consistent hashing and adaptive capacity so a hot partition (a viral deal) can be split or given burst capacity, avoiding the throttling a fixed-partition scheme suffers on Prime Day. Pre-warm capacity ahead of the known spike.",
              "**Storage:** LSM engine for fast sequential writes, replicated across three AZs, with async cross-region replication (global tables) for locality. Read-repair and Merkle anti-entropy heal replicas after a partition ends.",
              "Latency: because reads can be R=1 against the nearest replica, p99 stays low; the occasional stale read is repaired and, for carts, a briefly stale read that merges to the union is acceptable. Common wrong turn: choosing strong consistency and blocking writes during a partition, trading revenue for a guarantee the cart does not need.",
            ],
          },
        },
        {
          id: "sd-l10-object-store-s3",
          title: "Design an Object Store (Amazon S3)",
          summary:
            "Hit 11 nines with erasure coding (k + m Reed-Solomon, roughly 1.4x overhead) instead of 3x replication, scale the metadata index by partitioning bucket+key across a KV store, give strong read-after-write via a durable metadata commit, support multipart upload and range GET, and maintain durability with checksums, scrubbing, and reconstruction.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["object-store", "erasure-coding", "durability"],
          teach: { markdown: objectStoreS3Teach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-object-store-s3-apply",
            prompt:
              "Design an object store offering 11-nines durability with multi-region replication and range reads.",
            thinkAbout: [
              "How do replication vs erasure coding trade durability against storage cost?",
              "How does the metadata/index service scale?",
              "What is the consistency model and how do multipart/range reads work?",
            ],
            modelAnswerOutline: [
              "Assumptions: trillions of objects from bytes to terabytes, 11 nines (99.999999999%) durability, high availability, flat bucket + key namespace, strong read-after-write for new writes, and cost matters at exabyte scale.",
              "**Data placement and durability:** erasure code each object with Reed-Solomon, say 10 data + 4 parity shards, spread across independent failure domains (disks, racks, AZs). Any 10 of 14 shards reconstruct the object, tolerating 4 concurrent losses at 40% overhead, far cheaper than 3-way replication's 200%. Small hot objects may use replication for read simplicity; large cold objects use wider erasure codes. Multi-region durability comes from async cross-region replication of both shards and metadata for buckets that opt in.",
              "**Metadata service:** a separately scaled, sharded, strongly consistent index mapping bucket + key to the shard map plus size, etag, version, and ACL. Partition by hash of bucket + key for even load, or range-partition for efficient prefix listing, and cache hot entries. This index, not the blob store, is the scaling and consistency bottleneck.",
              "**Consistency:** strong read-after-write. A PUT is acknowledged only after all shards are durable and the metadata commit is visible, so a subsequent GET always sees the new object. Versioning writes a new version rather than overwriting, and the index points at the latest.",
              "**Large objects and reads:** multipart upload splits a big object into parts uploaded in parallel with per-part retry, then a complete call assembles them. Range GET reads only the shards covering the requested byte range, enabling video seek and resumable downloads. **Durability maintenance:** checksum every shard on write, scrub periodically to catch bit rot, reconstruct lost shards from survivors, and rebalance on node changes. Lifecycle policies tier cold data.",
              "Tradeoffs and wrong turn: erasure coding trades CPU and degraded-read amplification for a roughly 2x storage saving over replication. Common wrong turn: full replication everywhere, which triples cost and still gives weaker fault tolerance than a 10 + 4 code, and forgetting that the metadata index, not the blobs, is the hard scaling problem.",
            ],
          },
          practice: {
            id: "sd-l10-object-store-s3-practice",
            prompt:
              "Design the storage backend for Dropbox, which stores deduplicated file blocks for hundreds of millions of users, must sync edits across a user's devices in seconds, and needs to keep storage cost low despite massive duplication of identical files across accounts.",
            thinkAbout: [
              "How does content-addressed block storage collapse cross-user duplication?",
              "How does a manifest plus block index enable seconds-fast delta sync?",
              "How does deletion become a garbage-collection problem?",
            ],
            modelAnswerOutline: [
              "Assumptions: hundreds of PB of user files, heavy cross-user and cross-version duplication (the same PDF or OS image stored by millions), fast multi-device sync, and cost pressure from duplication.",
              "**Content-addressed block storage:** split each file into fixed or content-defined chunks (say 4 MB blocks), hash each block (SHA-256), and store the block once under its hash. A file becomes a manifest: an ordered list of block hashes plus metadata. Because storage is keyed by content hash, two identical blocks anywhere collapse to one physical copy, the core cost win against duplication. New writes only upload blocks whose hashes the server does not already have.",
              "**Durability and placement:** store blocks in an erasure-coded object store (10 + 4 Reed-Solomon) across AZs for 11-nines durability at low overhead, with cross-region replication for the metadata that drives sync.",
              "**Metadata and sync:** a strongly consistent metadata service holds per-user file trees, manifests, and version history. Devices maintain a cursor and receive change notifications (long-poll or push) so an edit on one device produces a manifest delta that other devices pull in seconds, downloading only the changed blocks. Because blocks are immutable and content-addressed, sync is just 'fetch the blocks you are missing.'",
              "**Dedup safety:** guard against hash collisions (SHA-256 makes them astronomically unlikely) and handle privacy (per-user encryption complicates cross-user dedup, so real systems often dedup within a trust boundary). Deletion uses reference counting or garbage collection so a block is removed only when no manifest references it.",
              "Tradeoff: content-addressed dedup saves enormous storage but adds a metadata layer (block index, ref counts, manifests) and makes deletion a GC problem. Common wrong turn: storing whole files without chunking or dedup, which multiplies cost by the duplication factor and forces a full re-upload on every small edit.",
            ],
          },
        },
        {
          id: "sd-l10-message-queue",
          title: "Design a Message Queue / Streaming Log (Kafka)",
          summary:
            "Model it as a partitioned append-only log with per-partition ordering, get durability from ISR replication and acks=all, offer at-least-once delivery plus idempotent consumers for exactly-once processing (never claim exactly-once delivery), and scale reads with consumer groups where parallelism equals partition count.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["message-queue", "kafka", "delivery-semantics"],
          teach: { markdown: messageQueueTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-message-queue-apply",
            prompt:
              "Design a durable, partitioned pub/sub log supporting at-least-once delivery and horizontal consumer scaling.",
            thinkAbout: [
              "What gives per-partition ordering and durability?",
              "How do consumer groups, offsets, and rebalancing scale reads?",
              "How do you make processing effectively-once?",
            ],
            modelAnswerOutline: [
              "Assumptions: many producers and consumers, high throughput (hundreds of thousands of messages/sec), messages must survive broker failure, ordering is required per key (per user or per entity) but not globally, and consumers process at varying speeds.",
              "**Log model:** topics split into partitions, each an append-only ordered sequence addressed by offset. Producers partition by key (hash of user id) so all messages for a key land in one partition and keep order; different partitions parallelize across brokers. Ordering is per partition, which I state explicitly as the constraint.",
              "**Durability:** replicate each partition with a leader and followers, track the in-sync replica set, and require acks=all so a message is acknowledged only after all ISR replicas hold it. On leader failure, elect an ISR follower. Retain by time or size, or compact for changelog topics.",
              "**Delivery:** at-least-once. The consumer processes a message and only then commits its offset, so a crash mid-processing causes reprocessing, not loss. Committing before processing would be at-most-once.",
              "**Effectively-once processing:** because at-least-once yields duplicates, make consumers idempotent (attach a stable message id and dedupe, or make the side effect naturally idempotent). For the produce side, use idempotent producers (producer id plus sequence number) so broker-level retries do not create duplicate appends, and transactional writes to tie processing output and offset commit into one atomic step. This is exactly-once processing, not exactly-once delivery.",
              "**Consumer scaling:** consumer groups assign each partition to one consumer, so throughput scales with partition count; add partitions and consumers together. On membership change the group rebalances. Backpressure is automatic (a slow consumer just lags), and a repeatedly failing message goes to a dead-letter topic after N retries. Common wrong turn: claiming exactly-once delivery; the honest answer is at-least-once delivery plus idempotent consumers.",
            ],
          },
          practice: {
            id: "sd-l10-message-queue-practice",
            prompt:
              "Design the event backbone for Uber, which ingests millions of GPS and trip events per second, must keep each driver's event stream strictly ordered, feeds both a real-time dispatch system (needs the freshest event) and a nightly billing batch (needs completeness), and cannot lose a payment-relevant event.",
            thinkAbout: [
              "How does partitioning by driver id give per-driver order at millions/sec?",
              "Why does one durable log serve both a real-time and a batch reader?",
              "How do you keep payment events lossless and exactly-once for billing?",
            ],
            modelAnswerOutline: [
              "Assumptions: millions of events/sec, per-driver ordering required, two very different consumers (low-latency dispatch and exhaustive batch), and payment events must be durable with no loss.",
              "**Partitioning for ordering:** partition by driver id so every event for a driver is ordered within one partition; use thousands of partitions to reach millions of events/sec, since throughput scales with partition count. Global order is neither needed nor affordable.",
              "**Durability for money:** for payment-relevant topics use acks=all with a replication factor of 3 across AZs, so no acknowledged event is lost even if a broker and its rack fail. Producers are idempotent so retries do not double-emit a fare event.",
              "**Two consumers, one log** (why a log beats a plain queue): the dispatch service is a consumer group reading the tail with low latency, committing offsets frequently, tolerating reprocessing because its actions are idempotent. The billing batch is a separate consumer group that reads the same partitions from an earlier offset each night, getting completeness because retention holds several days of events. The log's replayability lets one durable stream serve both readers without duplicating ingestion.",
              "**Exactly-once for billing:** billing dedupes on event id and uses transactional consume-process-produce so a fare is counted once even under at-least-once redelivery. Dispatch stays at-least-once with idempotent effects. **Late/out-of-order data:** the stream processor uses event-time windows with a watermark so a late GPS point still lands in the right minute.",
              "Tradeoff and wrong turn: high partition count buys throughput and per-driver order at the cost of more consumer coordination and rebalancing. Common wrong turn: using a traditional queue that deletes a message once consumed (cannot serve both real-time and replay-for-billing readers), or acks=1 on payment events and losing a fare when a leader dies.",
            ],
          },
        },
        {
          id: "sd-l10-job-scheduler",
          title: "Design a Distributed Job Scheduler / Cron",
          summary:
            "Index jobs by run time and poll the due window, make a single worker win via a compare-and-set lease with a visibility timeout so crashes retry rather than duplicate, add fencing tokens to defeat the paused-worker double-run, achieve effectively-once with idempotency keys, and handle clock skew and missed windows with an explicit misfire policy.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["job-scheduler", "leasing", "idempotency"],
          teach: { markdown: jobSchedulerTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-job-scheduler-apply",
            prompt:
              "Design a scheduler that fires each job at its scheduled time exactly once, even if worker machines crash mid-run.",
            thinkAbout: [
              "How do you index and poll for due jobs efficiently?",
              "How do leasing and visibility timeouts make a crashed job retry, not duplicate?",
              "How do you handle clock skew, missed windows, and recurring jobs?",
            ],
            modelAnswerOutline: [
              "Assumptions: millions of scheduled jobs, one-off and recurring, worker crashes and pauses are normal, jobs have side effects that must not run twice, and second-level firing precision is acceptable.",
              "**Storage and due query:** store jobs with a `next_run_at` timestamp and a status, indexed on `next_run_at`, or time-bucketed by minute. A poller queries jobs due now (`next_run_at <= now AND status = pending`) and dispatches them. Shard jobs across buckets or partitions so many pollers run in parallel.",
              "**Single-execution via leasing:** a worker claims a job with an atomic compare-and-set that flips status pending -> running, sets `locked_by` and `lease_expires_at = now + T`, and increments a fencing token. Only one worker wins the CAS. If that worker crashes, the lease expires and another worker re-claims it: the job is retried, not duplicated.",
              "**Paused-worker defense:** a worker that pauses past its lease can wake up and try to run or complete a job a second worker already took. Prevent the double effect with fencing tokens: every downstream write carries the lease's token, and the target rejects any token lower than the highest it has seen, fencing off the stale worker.",
              "**Effectively-once:** because execution is at-least-once, give each run an idempotency key and have the job's side effect dedupe on it, so a retried or double-run job produces exactly one effect. **Clock skew and misfires:** rely on the database clock or logical ordering, not a worker's local clock, and define a misfire policy for windows missed during downtime (catch up, or skip to next). For recurring jobs, on completion compute the next run time.",
              "Tradeoffs and wrong turn: leasing plus fencing plus idempotency gives effectively-once at the cost of extra coordination and a token check on the downstream. Common wrong turn: a naive lock with no fencing (a paused worker resumes and double-runs), or committing the job as done before the side effect succeeds (loses the run on a crash).",
            ],
          },
          practice: {
            id: "sd-l10-job-scheduler-practice",
            prompt:
              "Design the scheduling system behind Uber's or DoorDash's scheduled orders, where a customer schedules delivery for 7:00pm, the job must fire within a few seconds of its time, tens of millions of jobs may be due in the same dinner-rush minute, and a fired job kicks off a payment and a driver dispatch that must never double-fire.",
            thinkAbout: [
              "How do you drain tens of millions of jobs due in the same minute?",
              "How does an in-memory timer wheel give second-level precision with a durable backstop?",
              "How do idempotency keys and fencing keep payment and dispatch exactly-once?",
            ],
            modelAnswerOutline: [
              "Assumptions: tens of millions of jobs, sharp spikes where many jobs share the same minute, few-second firing precision, and each firing triggers a payment and a dispatch that must be exactly-once in effect.",
              "**Handling the thundering minute:** if millions of jobs are due at 7:00:00 a single poller cannot dispatch them in a few seconds. Shard the time index into many buckets (hash the job id into 1024 sub-buckets per second) and run a pool of pollers, each owning a slice, so dispatch parallelizes. Pre-load the upcoming minute into an in-memory timer wheel on each scheduler shard so firing is precise to the second rather than bounded by DB poll latency, with the database as the durable backstop for recovery.",
              "**Exactly-once effect on payment and dispatch:** the firing itself is at-least-once (lease expiry retries a crashed firing), so both downstream actions must be idempotent. The payment uses an idempotency key derived from the job id so a retried firing does not double-charge. Dispatch is guarded the same way, and a fencing token on the lease stops a paused scheduler from firing a job a second scheduler already fired.",
              "**Durability and recovery:** jobs persist in a replicated store; a scheduler shard that dies has its buckets reassigned and the new owner reloads pending jobs from the DB into its timer wheel, so no scheduled order is lost. Leases with visibility timeouts ensure a crashed firing is retried by another shard.",
              "Precision vs load tradeoff: the in-memory timer wheel gives second-level precision but must be rebuilt from the durable store on failover, and sharding by job id spreads the rush but requires rebalancing when shards change. Common wrong turn: a single DB-polling loop for the whole fleet (it cannot drain a 10M-job minute in seconds) or firing payment and dispatch without idempotency keys (double-charges a customer whenever a firing is retried).",
            ],
          },
        },
        {
          id: "sd-l10-distributed-lock",
          title: "Design a Distributed Lock / Coordination Service (ZooKeeper/etcd)",
          summary:
            "A Redis SETNX-with-TTL lock is unsafe because a single node can fail over and a paused holder can outlive its TTL; build on a consensus-backed store for linearizable lock state, auto-release via session leases and heartbeats, defeat the stale-holder double-run with monotonic fencing tokens, notify clients with watches instead of polling, and elect leaders with ordered ephemeral keys.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["coordination", "consensus", "distributed-systems", "case-study"],
          teach: { markdown: distributedLockTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-distributed-lock-apply",
            prompt:
              "Design a distributed lock and coordination service (in the spirit of ZooKeeper or etcd), and explain how leases, fencing tokens, and watches keep it safe from split-brain and stale lock holders.",
            thinkAbout: [
              "Why is a lock in Redis with a TTL not safe on its own, and what does a fencing token add?",
              "What happens when a lock holder pauses (a long GC) past its lease and then wakes up?",
              "How do clients get notified when a lock is released or a leader changes?",
            ],
            modelAnswerOutline: [
              "Assumptions: many clients need mutual exclusion, leader election, and shared config, and they must stay correct across process pauses (GC, preemption) and network partitions. Correctness beats availability during a partition.",
              "**Foundation:** put the lock state in a consensus-backed store (etcd with Raft, or ZooKeeper with Zab) rather than a single node. A write commits only on a majority quorum, so the state is linearizable and survives minority failure. Under a partition only the majority side can grant the lock; the minority side is unavailable rather than returning stale state, which prevents split-brain.",
              "**Leases and auto-release:** a client holds the lock through a session with a TTL, renewed by heartbeat. If it dies or partitions away it stops heartbeating, the lease expires, and the lock frees automatically (an ephemeral znode disappears, or an etcd lease lapses), so no permanent deadlock.",
              "**Why leases alone are not safe, and the fix:** a holder can pause past its lease, the lock is granted to a second client, and then the paused holder wakes up still thinking it holds the lock. The fix is a fencing token: each grant carries a monotonically increasing token (etcd revision, ZooKeeper zxid), every write to the protected resource carries it, and the resource rejects any token below the highest it has seen. This is why a Redis SETNX with a TTL and no fencing is the classic unsafe lock: single-node failover can double-grant, and the TTL hole double-runs.",
              "**Watches:** clients watch the lock or leader key and get a callback on release or change instead of polling, enabling millisecond failover. **Leader election:** candidates create ordered ephemeral keys; the lowest wins; each other candidate watches its predecessor so exactly one takes over on failure, avoiding a herd.",
              "Tradeoffs and wrong turn: consensus adds write latency (a quorum round trip) and makes the minority side unavailable under partition, the correct trade for a lock. Common wrong turn: a single Redis SETNX with a TTL and no fencing token, which under a failover or a GC pause lets two clients each believe they hold the lock.",
            ],
          },
          practice: {
            id: "sd-l10-distributed-lock-practice",
            prompt:
              "Design the leader-election and coordination layer for a database like CockroachDB or a Kafka-style cluster, where exactly one node must own a partition's writes at a time, a network partition must never let two nodes both accept writes to the same range (split-brain would corrupt data), and failover must complete in a few seconds.",
            thinkAbout: [
              "Why is per-range Raft the structural defense against split-brain?",
              "How is the consensus term itself the fencing token?",
              "How does randomized election timeout give fast failover without split votes?",
            ],
            modelAnswerOutline: [
              "Assumptions: a cluster of nodes, each data range must have exactly one write owner (leaseholder), split-brain would silently corrupt data and is unacceptable, and failover should be seconds, not minutes.",
              "**Per-range consensus:** each data range is its own Raft (or Multi-Paxos) group with a small replica set (typically 3 or 5). Writes go only to the elected leader (leaseholder), and a write commits only after a majority of replicas persist it. Because a majority is required, two nodes on opposite sides of a partition cannot both commit writes to the same range: only the side with a quorum makes progress, so split-brain is structurally impossible, not merely unlikely.",
              "**Leases with fencing:** the leaseholder holds a time-bounded lease (an epoch or term number that increases on every election). A partitioned old leader whose lease has expired cannot commit because it cannot reach a quorum, and any straggler write it attempts carries an old term that followers reject, which is fencing built into the consensus term. You do not bolt on a separate lock; the consensus term is the fencing token.",
              "**Fast failover:** replicas run heartbeat timers; when the leader stops heartbeating, a follower times out and starts an election for the next term, and with a majority vote it becomes leader in a couple of seconds. Pre-vote and randomized election timeouts avoid split-vote herds.",
              "**Coordination for cluster metadata:** cluster-wide config and membership live in a consensus store (etcd for Kubernetes control planes, or an internal Raft group), watched by nodes so they react to membership changes immediately.",
              "Tradeoff and wrong turn: requiring a majority quorum for every write and every election costs a round trip of latency and makes a range unavailable if it loses its quorum, the correct price for never corrupting data. Common wrong turn: electing a leader with a simple TTL lock and no term or quorum, so a partitioned old leader keeps accepting writes on the minority side and split-brains the range.",
            ],
          },
        },
        {
          id: "sd-l10-code-sandbox",
          title: "Design a Code Execution Sandbox / Online Judge",
          summary:
            "Pick the isolation boundary deliberately (microVM/Firecracker as the strong default, hardened seccomp container as the middle ground, never a bare container for hostile code), bound every resource with cgroups plus timeouts plus a pids limit plus no network, run each submission in a fresh throwaway sandbox behind a queue and autoscaling worker pool with a warm pool, and stream results while enforcing per-user fairness.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["sandboxing", "security", "isolation", "case-study"],
          teach: { markdown: codeSandboxTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-code-sandbox-apply",
            prompt:
              "Design a code execution sandbox / online judge that runs untrusted user submissions safely at scale, and justify your isolation boundary, resource limits, queueing, and result streaming.",
            thinkAbout: [
              "What isolation boundary is strong enough to run hostile code, and what are the tradeoffs of each option?",
              "How do you bound CPU, memory, time, disk, and network so one submission cannot harm the host or others?",
              "How do you absorb bursty submissions and stream results back to the user?",
            ],
            modelAnswerOutline: [
              "Assumptions: users submit arbitrary code in many languages, some actively hostile (fork bombs, exfiltration, escape attempts), at spiky volume around contests, and we must protect the host and other users while giving fast feedback.",
              "**Isolation boundary (the core decision):** run each submission in a Firecracker microVM. It gives each run its own guest kernel and hardware-virtualization isolation, so a kernel exploit does not reach the host, yet it boots in about 100ms. A hardened container (seccomp syscall whitelist, AppArmor, non-root, read-only FS, dropped capabilities) is the fallback where microVMs are unavailable. I explicitly reject a plain container as the security boundary because it shares the host kernel; gVisor is a middle option that intercepts syscalls in user space at some perf cost.",
              "**Resource limits:** cgroups cap CPU and memory with a hard OOM kill; a wall-clock plus CPU-time timeout kills infinite loops; a pids limit defeats fork bombs; disk quotas stop disk-fill; and networking is off by default or a strict egress allowlist to prevent exfiltration. Each submission runs in a fresh sandbox destroyed after the run, so nothing leaks between users.",
              "**Architecture:** a stateless API enqueues each submission onto a durable queue (SQS or Kafka) and returns a job id. A pool of sandboxed workers pulls jobs, runs each in a fresh microVM, and reports results. The queue absorbs contest bursts and lets workers autoscale on queue depth. A warm pool of pre-booted microVMs hides cold-start latency.",
              "**Result streaming:** stream stdout, stderr, and per-test progress over SSE or WebSocket, store the final verdict durably, and cap output size so a runaway print cannot exhaust memory. **Fairness and blast radius:** per-user rate limits and concurrency quotas, abuse monitoring, and the entire execution fleet in an isolated network segment with no path to production, treating each sandbox host as potentially compromised.",
              "Tradeoffs and wrong turn: microVMs cost a little more startup time and memory than containers, which the warm pool and far stronger isolation justify. Common wrong turn: running submissions in a shared container as root with network access and only a language-level timeout, which is trivially escapable and lets one job exfiltrate data or take down the host.",
            ],
          },
          practice: {
            id: "sd-l10-code-sandbox-practice",
            prompt:
              "Design the execution backend for a browser-based coding platform like Replit or CodeSandbox, where each user gets a long-lived interactive dev environment (not a one-shot judge), can install arbitrary packages and run a web server, thousands of environments run concurrently, and cost per idle environment must stay near zero.",
            thinkAbout: [
              "Why does a long-lived untrusted workload compound kernel-sharing risk?",
              "How does snapshot-and-resume make idle cost near zero?",
              "How do preview subdomains wake a paused environment on demand?",
            ],
            modelAnswerOutline: [
              "Assumptions: long-lived interactive sessions (not one-shot runs), users install packages and run servers, thousands concurrent, most idle at any moment, and idle cost must be minimal.",
              "**Isolation for long-lived untrusted workloads:** give each workspace its own microVM (Firecracker) or a strongly isolated container (gVisor or Kata), because the code is untrusted and long-running, so kernel-sharing risk compounds over time. Each environment gets its own filesystem and network namespace with an egress policy, so one user's server cannot reach another's or production.",
              "**Idle cost, the defining constraint:** since most environments are idle, do not keep a VM running per user. Snapshot idle environments to disk (Firecracker snapshotting, or pause-and-persist the container filesystem and memory) and free the compute. On the next request, resume from snapshot in a few hundred milliseconds. Pay for compute only while a user is active, and only cheap storage while idle, keeping idle cost near zero across thousands of environments.",
              "**Persistence:** the user's files live on a network volume or content-addressed store that outlives the compute, so resuming attaches the same filesystem. Installed packages persist in that volume.",
              "**Networking and web servers:** give each running environment a subdomain routed through a proxy (Envoy) that maps hostname to the live VM, spinning the VM up from snapshot on the first inbound request if it was paused, so preview URLs work without keeping every server warm. A scheduler bin-packs active VMs onto hosts and autoscales the host fleet on active count (not total count).",
              "Tradeoff and wrong turn: snapshot-resume adds a few hundred ms of wake latency and snapshot storage cost, far cheaper than running thousands of idle VMs. Common wrong turn: a warm VM per user (cost scales with total users, not active users, and bankrupts you at idle) or a shared container per user with no per-workspace network isolation.",
            ],
          },
        },
        {
          id: "sd-l10-webhook-delivery",
          title: "Design a Reliable Webhook Delivery System",
          summary:
            "Guarantee at-least-once (persist, enqueue, ack on 2xx) with a stable event id so consumers dedupe, deliver from a separate queue-driven service (never inline), retry with exponential backoff plus jitter over a long window, sign payloads with HMAC-SHA256 plus timestamp and rotate secrets, make ordering opt-in per resource key, and protect everyone with dead-letters plus per-tenant isolation and circuit breakers.",
          estimatedMinutes: 40,
          difficulty: "medium",
          skills: ["messaging", "reliability", "api-design", "case-study"],
          teach: { markdown: webhookDeliveryTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-webhook-delivery-apply",
            prompt:
              "Design a reliable webhook delivery system that notifies customer endpoints of events, and justify your delivery guarantee, retry and backoff, signing, idempotency, ordering, and dead-letter handling.",
            thinkAbout: [
              "What delivery guarantee do you offer, and what does that require of the consumer?",
              "How do you retry a flaky or slow customer endpoint without amplifying load or blocking others?",
              "How do consumers verify authenticity and safely handle duplicates and out-of-order events?",
            ],
            modelAnswerOutline: [
              "Assumptions: we emit events (payment.succeeded and similar) to many customer-controlled HTTPS endpoints of widely varying reliability and speed, some down for hours, and we must not lose events or let one bad endpoint hurt others.",
              "**Delivery guarantee:** at-least-once. Persist every event durably, enqueue a delivery task, and mark it delivered only on a 2xx. A crash between send and record causes redelivery, so duplicates are possible. Exactly-once delivery to an external endpoint is not achievable, so I move idempotency to the consumer: every payload carries a stable, unique event id and I document that delivery is at-least-once so consumers dedupe on it.",
              "**Architecture:** delivery runs in a separate, queue-driven service, never inline from the event producer, so a slow customer endpoint cannot back up our core pipeline. Producers just persist and enqueue.",
              "**Retries and backoff:** on a non-2xx, timeout, or connection error, retry with exponential backoff plus jitter over a long window (seconds to minutes to hours, up to a day) with a capped attempt count, and a short per-attempt timeout so a hung endpoint does not tie up a worker. Backoff lets a down endpoint recover; jitter avoids a thundering herd.",
              "**Signing:** HMAC-SHA256 over the raw body plus a timestamp with a per-customer secret, sent in a header; the consumer recomputes to verify authenticity and rejects stale timestamps to block replay. Support secret rotation with an overlap window. **Ordering:** default to no global order for parallelism; where a tenant needs per-resource order, key delivery by resource id and deliver sequentially per key, as an opt-in.",
              "**Dead-letter and fairness:** after max attempts, move the event to a dead-letter store, alert, and expose a manual replay/redrive API. Isolate per tenant with per-tenant queues, concurrency and rate limits, per-endpoint timeouts, and circuit breakers so one slow or dead tenant cannot starve the fleet. Common wrong turn: delivering synchronously from the producer with a couple of quick retries, so a single slow customer endpoint stalls the whole event pipeline.",
            ],
          },
          practice: {
            id: "sd-l10-webhook-delivery-practice",
            prompt:
              "Design Stripe's webhook delivery at scale, where a single Black Friday can generate tens of thousands of events per second, a large merchant's endpoint may go down for two hours mid-event, and merchants across the world each need their events delivered fairly and in a verifiable, replayable way.",
            thinkAbout: [
              "How does persist-then-enqueue decouple a spike from delivery?",
              "How do per-tenant queues and circuit breakers keep one merchant's outage from hurting others?",
              "How do signing and a replay API support reconciliation after an outage?",
            ],
            modelAnswerOutline: [
              "Assumptions: tens of thousands of events/sec at peak, hundreds of thousands of merchant endpoints of varying reliability, a merchant may be down for hours, and delivery must be fair, verifiable, and replayable.",
              "**Ingest and persist:** write every event to a durable, replicated store first (the event is the source of truth), then enqueue a delivery task. This decouples the spike from delivery: a burst buffers in the queue rather than overwhelming delivery workers, which autoscale on queue depth.",
              "**Per-tenant fairness at scale:** partition delivery so no single merchant can monopolize the fleet. Use per-tenant queues or a fair scheduler with per-tenant concurrency caps, so a two-hour outage at one large merchant parks that merchant's events in its own lane (retrying with long backoff) without consuming the workers serving everyone else. A circuit breaker detects the sustained failure and backs off aggressively, probing occasionally, so we stop hammering the dead endpoint and free capacity.",
              "**Long outage handling:** retries continue with exponential backoff and jitter over a day-plus window, so when the merchant recovers after two hours their queued events drain in order of arrival. Because we persisted every event, nothing is lost during the outage. After the attempt cap, events dead-letter and the merchant can redrive them from a dashboard.",
              "**Verification and replay:** each payload is HMAC-SHA256 signed with the merchant's secret plus a timestamp, so merchants verify authenticity and reject replays, and secrets rotate with an overlap window. A replay API and an event log let merchants re-fetch or re-receive any past event, essential for reconciliation after an outage. Global fairness: run regional delivery pools close to merchants, all fed from the durable event store.",
              "Tradeoff and wrong turn: per-tenant isolation and long-window retries cost more queues and state but are the only way one merchant's outage does not degrade everyone. Common wrong turn: a single global queue with shared workers, where one large merchant's two-hour outage fills the workers with its retrying deliveries and delays every other merchant's Black Friday events.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l10-m5",
      title: "Commerce, Money & Analytics",
      description:
        "Run the correctness-critical and high-volume 'design X' interviews that separate senior candidates: a payment ledger that never loses money, a flash-sale system that never oversells, a web crawler at web scale, a metrics platform, a real-time ad-click aggregator, a leaderboard, and a microsecond order-matching engine. Each is a repeatable pattern you can name and defend under pressure.",
      lessons: [
        {
          id: "sd-l10-payment-ledger",
          title: "Design a Payment System & Ledger",
          summary:
            "Idempotency keys on every mutating call turn retries safe, an append-only double-entry ledger with derived balances gives auditability and reconciliation, and a saga with compensations plus idempotent webhook handling coordinates the provider, wallet, and orders without a distributed transaction.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["payments", "ledger", "idempotency"],
          teach: { markdown: paymentLedgerTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-payment-ledger-apply",
            prompt:
              "Design a payment service that charges a user and credits a merchant with no double-charges and an auditable ledger.",
            thinkAbout: [
              "How do idempotency keys make charges safe under retries?",
              "Why a double-entry immutable ledger?",
              "How do you coordinate across payment provider, wallet, and orders?",
            ],
            modelAnswerOutline: [
              "Assumptions: peak ~10K payments/sec, external provider (Stripe/Adyen) does the card network work, we own the wallet/ledger and orders, correctness beats latency, full audit is required. Estimation: 10K/sec is small; the constraint is that every cent is accounted for.",
              "**API:** `POST /payments {idempotencyKey, userId, merchantId, amount, currency}`. The idempotency key is client-minted per intent and is the uniqueness contract. **Data model:** an append-only `ledger_entries(id, account_id, amount_signed, currency, txn_id, created_at)` where every `txn_id` has entries summing to zero (double-entry). Balances are `SUM(amount_signed)` per account, never a mutable column. A `payments(idempotency_key PK, status, provider_ref, ...)` table dedups requests.",
              "**Flow:** the API first does a conditional insert on the idempotency key; a duplicate returns the stored result with no side effect. A saga orchestrator then posts a pending ledger entry (funds reserved), calls the provider with the same idempotency key so the provider also dedups, and on success posts the settled double-entry pair (debit customer, credit merchant payable) and marks the order paid. On provider failure or timeout, it posts a compensating reversal and fails the payment. Workflow state is durable so a crash resumes.",
              "**Async and reconciliation:** provider webhooks are idempotent (dedup on event id) and drive final state for delayed settlements. A daily job sums ledger entries and reconciles against the provider settlement file; any mismatch pages on-call.",
              "Tradeoffs: strong consistency on the ledger (single-writer per account or serializable transactions) costs throughput but is required for balance correctness; we accept eventual consistency only on downstream read models. PCI scope is minimized by tokenizing cards at the provider. Common wrong turn: mutable `balance = balance - amount` updates with no ledger, which makes reconciliation and audit impossible and hides double-spend bugs, plus non-idempotent charge and webhook handlers.",
            ],
          },
          practice: {
            id: "sd-l10-payment-ledger-practice",
            prompt:
              "Design the ledger and money-movement core for Stripe-style multi-currency payouts, where a marketplace collects from buyers in 135 currencies, holds funds, deducts platform fees, and pays out to sellers on a rolling schedule, with an auditable trail that survives a full external audit.",
            thinkAbout: [
              "How do you model every party as accounts in one double-entry ledger?",
              "Why must each account be single-currency, and how is FX an explicit transaction?",
              "How do payouts and holds become balanced, auditable ledger events?",
            ],
            modelAnswerOutline: [
              "Assumptions: funds are held between capture and payout, fees split per transaction, FX conversion happens at payout, regulators can demand a full trace of any dollar.",
              "**Model every party as accounts** in one double-entry ledger: a buyer funding account, a platform fee account, a seller payable account, and per-currency clearing accounts. A single purchase becomes a balanced set of entries: debit buyer funding, credit seller payable (minus fee), credit platform fee account, all in the transaction currency. Because entries are immutable and balanced, any dollar is traceable from capture to payout by following `txn_id` links, exactly what an audit needs.",
              "**Multi-currency:** never mix currencies in one account. Each account is single-currency, and FX is an explicit transaction that debits a source-currency clearing account and credits a target-currency clearing account at a recorded rate, so the conversion itself is an auditable, balanced ledger event rather than a hidden arithmetic step.",
              "**Payouts:** a scheduled job sums each seller's payable balance, applies holds/reserves for risk, creates a payout transaction (debit seller payable, credit an outbound clearing account), and hands it to the bank rail (ACH/SEPA/wire) with an idempotency key. The payout is pending until the rail confirms; a webhook settles or reverses it, and the ledger reflects each state transition as new entries, never edits.",
              "**Correctness at scale:** shard the ledger by account to parallelize writes while keeping each account single-writer for balance integrity, and enforce a database constraint or write-time check that every transaction's entries sum to zero per currency. Reconcile daily against each bank partner's statement.",
              "Common wrong turn: a single mutable multi-currency balance with fees subtracted inline: it cannot survive an audit, cannot represent in-flight FX, and silently drifts from the banks.",
            ],
          },
        },
        {
          id: "sd-l10-ecommerce-flash-sale",
          title: "Design E-Commerce Inventory / Flash Sale (Ticketmaster)",
          summary:
            "Prevent oversell with a single atomic conditional decrement (never read-then-write), use reservation holds with TTL and automatic release for the cart window, and put a fair, rate-limiting waiting room in front to shed and pace the spike so the inventory store sees bounded load.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["flash-sale", "inventory", "contention"],
          teach: { markdown: ecommerceFlashSaleTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-ecommerce-flash-sale-apply",
            prompt:
              "Design ticket/seat purchasing that never oversells a finite inventory during a flash sale with millions of concurrent buyers.",
            thinkAbout: [
              "How do you prevent oversell under massive concurrency?",
              "How do reservation holds with timeouts work?",
              "How does a waiting room shed and fairly admit spike traffic?",
            ],
            modelAnswerOutline: [
              "Assumptions: fixed inventory (e.g., 20,000 seats), up to 5M concurrent buyers at on-sale, individually addressable seats, payment happens after seat selection, oversell is unacceptable, some queueing latency is acceptable. Estimation: 5M arrivals in the first minute is ~80K arrivals/sec of pressure, but only ~20K seats exist, so admit buyers at a rate the inventory store can serve (~5K attempts/sec) and shed the rest.",
              "**API:** `POST /reserve {seatId, userId}` returns a hold token or 'unavailable'; `POST /checkout {holdToken, payment}` converts the hold to a sale. Both are behind a waiting-room admission gate. **Waiting room:** on arrival, users get a signed queue token and a position. An admission controller releases tokens at the backend's safe rate, FIFO for fairness with per-account limits and bot defenses. Only admitted tokens can call `/reserve`.",
              "**Oversell prevention:** each seat is a row/key with a state. Reservation is a single atomic conditional operation, `UPDATE seats SET state='held', hold_expires=now+10m, holder=? WHERE seat_id=? AND state='available'`, and we succeed only if one row changed. Equivalent Redis approach: a Lua script that atomically checks-and-sets seat state. There is no separate read step, so no race.",
              "**Holds:** a successful reserve sets a 10-minute TTL. Checkout within the window converts `held -> sold`. On expiry, a sweeper (plus a lazy check on read) atomically returns `held -> available`, bounding cart-hold leakage. **Checkout saga:** reserve -> charge (idempotent payment) -> mark sold -> issue ticket, with compensation (release seat) if payment fails.",
              "Tradeoffs: per-seat atomicity serializes contention on hot seats, which is fine because there are only so many seats; the waiting room protects the store from the crowd. We choose strong consistency on seat state over availability of the buy button under overload (we show a queue instead). Common wrong turn: reading availability into the app, deciding, then writing back (oversells under concurrency), and letting all traffic hit checkout directly with no waiting room.",
            ],
          },
          practice: {
            id: "sd-l10-ecommerce-flash-sale-practice",
            prompt:
              "Design the on-sale system for Taylor Swift tickets on Ticketmaster, where 14 million people queued for 2 million seats across dozens of venues, bots made up a large share of traffic, and the previous system melted down. Prioritize fairness, oversell-safety, and graceful degradation under 10x the expected load.",
            thinkAbout: [
              "Why does a randomized lottery beat pure FIFO against bots?",
              "How does adaptive admission tied to backend health prevent the meltdown?",
              "How do you shard inventory so hot events do not share a contention domain?",
            ],
            modelAnswerOutline: [
              "Assumptions: demand is ~7x supply, traffic is globally distributed, a large fraction is bots, and the failure mode to avoid is total collapse plus double-sold seats.",
              "**Mandatory waiting room** that users enter before the sale even opens. Pre-registration issues verified codes so real fans are distinguished from bots up front (identity + payment pre-verification), and at on-sale time admission is a **randomized lottery** among verified users rather than pure FIFO, which defeats the bot advantage of hammering at t=0. Admitted users get a short-lived signed token that authorizes exactly one reservation session.",
              "**Shard inventory by venue and by section** so hot events do not share a contention domain, and within a section each seat is an atomically-guarded key (Redis-backed counter/state with durable Postgres or DynamoDB behind it). Reservation is a single atomic check-and-set with a strict per-account seat cap enforced at reservation time (not at checkout, where it is too late). Holds carry a tight TTL (5 minutes) because demand is so far above supply.",
              "**Graceful degradation is the headline lesson** from the real meltdown: the buy path must have no synchronous dependency that cannot absorb 10x. Serve the waiting-room and queue-position pages from a CDN/edge with cached, static-ish content so the queue itself never falls over even when 14M people watch it. Rate-limit admission dynamically based on live backend health (admit slower when the inventory store's latency climbs) rather than a fixed rate. If the payment provider degrades, extend holds and slow admission rather than dropping reservations.",
              "**Bot defense is layered:** verified pre-registration, device fingerprinting, per-account and per-payment-instrument caps, and anomaly detection that shadow-bans obvious scripts.",
              "Common wrong turn (the one that actually happened): letting unbounded verified-and-unverified traffic reach the reservation tier at once with no adaptive shedding, so the store saturates, latency explodes, and the site is down for everyone. The fix is admission control tied to backend health plus lottery fairness, so the system stays up and slow rather than down and unfair.",
            ],
          },
        },
        {
          id: "sd-l10-web-crawler",
          title: "Design a Web Crawler",
          summary:
            "A two-layer frontier balances priority and per-host politeness, bloom-filter URL dedup plus simhash content dedup avoid redundant work and traps, distributed async fetchers with DNS caching do the I/O, and adaptive incremental recrawl with conditional GETs keeps the corpus fresh.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["web-crawler", "frontier", "dedup"],
          teach: { markdown: webCrawlerTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-web-crawler-apply",
            prompt:
              "Design a crawler that discovers, fetches, dedups, and indexes billions of web pages while respecting politeness.",
            thinkAbout: [
              "How does the frontier queue prioritize and respect robots.txt/per-host rate?",
              "How do you dedup URLs and content and avoid traps?",
              "How do you keep the index fresh with incremental recrawl?",
            ],
            modelAnswerOutline: [
              "Assumptions: target ~10B pages, refresh important pages frequently, must respect robots.txt and not get banned, output feeds a search index. Estimation: 10B pages / 30 days is ~3,900 pages/sec sustained just to cover once a month; hot pages need far more. Average page ~100 KB compressed means ~1 PB of corpus, so raw storage is S3/HDFS, not a database.",
              "**Frontier:** a distributed priority-and-politeness queue. Front queues assign priority (by estimated importance and staleness); back queues hold one host each and a per-host next-fetch-time heap enforces a minimum delay and robots `Crawl-delay`. Fetchers pull only hosts that are due, so no host is overwhelmed.",
              "**Politeness** (stated up front as non-negotiable): fetch and cache robots.txt per host, honor disallow rules and crawl-delay, send a truthful User-Agent with contact info, cap concurrent connections per host, and back off on 429/503.",
              "**Dedup:** normalize URLs (canonical scheme/host, strip tracking params) and check a bloom filter before enqueue for a cheap 'probably seen' test, backed by a durable seen-set. Hash page content and use simhash shingling to drop exact and near-duplicate pages. Bound traps with max-depth, per-host URL caps, and pattern detection on calendar/faceted URLs.",
              "**Fetching:** many async workers, aggressive DNS caching, connection reuse. Pages land in S3; a link-extraction stage emits new URLs back to the frontier and hands content to the indexer. **Freshness:** track per-page change frequency and recrawl adaptively; use conditional GET (If-Modified-Since/ETag) so unchanged pages return a cheap 304.",
              "Tradeoffs: bloom-filter dedup trades a small false-positive rate (a few new URLs dropped) for bounded memory at 10B scale. Politeness caps throughput per host, which we accept because getting banned is worse than being slow. Common wrong turn: no politeness / per-host rate limiting (the crawler gets blocked and trapped), and an exact in-memory seen-set that does not fit at billions of URLs.",
            ],
          },
          practice: {
            id: "sd-l10-web-crawler-practice",
            prompt:
              "Design the crawl and refresh pipeline for Googlebot-scale coverage of a fast-moving vertical (a news and social discovery crawler) that must surface breaking-news pages within 60 seconds of publication while still crawling the long tail of the web politely.",
            thinkAbout: [
              "How do you split the frontier into tiers for two very different SLAs?",
              "Why is discovery latency, not fetch latency, the bottleneck for the 60-second SLA?",
              "How does a dedicated hot fetch lane keep a cold-tier backlog from delaying breaking news?",
            ],
            modelAnswerOutline: [
              "Assumptions: two very different SLAs coexist. Breaking news must be indexed in under a minute; the long tail can wait days. Both must stay polite and deduplicated.",
              "**Split the frontier into tiers** with different scheduling policies rather than one uniform queue. A hot tier is driven by discovery signals (publisher sitemaps and RSS/Atom feeds polled on a tight loop, WebSub/PubSubHubbub push notifications where publishers support it, plus social-share velocity), so a newly published article is discovered from its feed within seconds and jumped to the front of the queue. A cold tier does normal breadth-first coverage of the long tail at a leisurely, polite rate. Each tier still runs through the same per-host politeness layer, so even a hot page respects the host's crawl-delay; we buy speed from earlier discovery, not from hammering the site.",
              "**For the 60-second SLA, the bottleneck is discovery latency, not fetch latency**, so invest there: subscribe to WebSub hubs, prioritize sitemaps with `lastmod`, and maintain a per-source publish-rate model to poll active news sources every few seconds and dormant ones rarely. On discovery, a hot URL skips the priority bands and goes straight to a low-latency fetch lane with its own dedicated fetcher pool so a backlog in the cold tier cannot delay it.",
              "**Freshness of already-known pages** uses conditional GETs and change-rate models, but news pages get a burst schedule (recrawl every few minutes for the first hour after publish, then decay) because comments, updates, and corrections change them rapidly. Dedup still applies: near-duplicate detection (simhash) collapses the syndication explosion where one wire story appears on hundreds of sites, keeping the canonical and clustering the rest.",
              "Common wrong turn: a single-priority frontier, where either you crawl politely and miss the 60-second window, or you crawl aggressively enough to hit it and get banned across the long tail. The tiered frontier with feed/push-based discovery and a dedicated hot fetch lane is what reconciles the two SLAs.",
            ],
          },
        },
        {
          id: "sd-l10-metrics-monitoring",
          title: "Design a Metrics & Monitoring System (Prometheus/Datadog)",
          summary:
            "Buffer the ingestion firehose through Kafka into a compressed TSDB partitioned by time, control cost with cardinality limits plus retention tiers and downsampled rollups, serve dashboards from a label-indexed query engine, and evaluate alert rules on a schedule with a dedup/group/route alert manager.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["monitoring", "time-series", "alerting"],
          teach: { markdown: metricsMonitoringTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-metrics-monitoring-apply",
            prompt:
              "Design a metrics platform that ingests millions of data points/sec and serves dashboards + alerts over them.",
            thinkAbout: [
              "How do you handle high-throughput ingestion and TSDB storage?",
              "How do downsampling, rollups, and cardinality control bound cost?",
              "How does alerting/rule evaluation work?",
            ],
            modelAnswerOutline: [
              "Assumptions: ~5M samples/sec from ~50K hosts, dashboards query recent data most, a year of history at coarse resolution, sub-second dashboard reads, alert latency of tens of seconds is fine. Estimation: 5M samples/sec at ~1.3 bytes/sample compressed is ~6.5 MB/sec, ~560 GB/day of hot raw data before rollups. Cardinality: if each host emits 1,000 series, that is 50M active series, the real scaling number.",
              "**Ingestion:** host agents batch and compress; a stateless ingest tier writes to Kafka to absorb bursts and decouple producers; ingesters consume and write to the TSDB. Backpressure and buffering prevent data loss during spikes.",
              "**Storage:** a TSDB with delta-of-delta timestamp and XOR value compression, partitioned into time blocks, with recent blocks hot (memory/SSD) and old blocks flushed to object storage, indexed by label for series lookup.",
              "**Cost control:** reject/limit high-cardinality labels (no user_id/trace_id in labels), cap series per metric, and alert on cardinality spikes. Keep raw for ~15 days, then downsample to 5-minute and 1-hour rollups (min/max/avg/count) for long retention, so old dashboards read cheap rollups.",
              "**Query:** a query engine uses the label index to find matching series and range-scans blocks; shard by metric name and time to scale reads; cache frequent dashboard queries. **Alerting:** a rule evaluator runs each rule on a schedule (every 15s), fires on threshold breach, and an alert manager dedups and groups related alerts into one incident, applies silences, and routes to PagerDuty/Slack.",
              "Tradeoffs: pull vs push (pull gives the platform control over scrape timing and target health, push handles short-lived jobs and NAT better); support both. We trade query flexibility of a general DB for the compression and range-scan speed of a purpose-built TSDB. Common wrong turn: allowing unbounded tag cardinality (per-user or per-request labels), which explodes series count, storage, and query cost and eventually takes the system down.",
            ],
          },
          practice: {
            id: "sd-l10-metrics-monitoring-practice",
            prompt:
              "Design the metrics backend for a Datadog-style multi-tenant SaaS serving 20,000 customer organizations, where each org sends its own custom metrics, noisy neighbors must not degrade others, and per-org billing is based on ingested custom-metric cardinality. Prioritize tenant isolation and cardinality-based cost attribution.",
            thinkAbout: [
              "How do you isolate a noisy tenant so it cannot degrade the other 19,999?",
              "How do you count unique series per tenant cheaply for billing (HyperLogLog)?",
              "Why is a shared unpartitioned TSDB the wrong turn here?",
            ],
            modelAnswerOutline: [
              "Assumptions: 20K tenants with wildly uneven volume, one tenant can suddenly emit a cardinality explosion, and cardinality is literally the billing unit, so it must be measured accurately per tenant.",
              "**Tenant isolation is the headline.** Tag every sample with a tenant id from ingestion onward and enforce per-tenant quotas and rate limits at the ingest tier so a noisy neighbor cannot starve others. Partition storage by tenant (dedicated series namespaces, and for the largest tenants dedicated ingesters/shards) so one tenant's write and query load is contained. Kafka topics or partitions keyed by tenant let you throttle a runaway producer without touching everyone else. A per-tenant cardinality limiter tracks active series in real time and, when a tenant blows past its plan, applies backpressure (drop new series, keep existing ones) and alerts them, rather than silently exploding shared storage.",
              "**Cardinality-based billing** requires an accurate, cheap count of unique series per tenant per period. Exact counting of tens of millions of series per tenant is expensive, so use HyperLogLog per tenant to estimate distinct active series with ~2 percent error at kilobytes of memory, and reconcile against the storage index periodically for the authoritative bill. This gives real-time cardinality visibility plus an accurate month-end total.",
              "**Query isolation:** run per-tenant query quotas and a fair scheduler so one org's expensive dashboard query cannot monopolize the query fleet, and cache per-tenant. Hot/cold tiering and downsampling work as in the single-tenant design but are metered and retained per plan.",
              "Common wrong turn: a shared, unpartitioned TSDB with global cardinality, where one customer's bad deploy that adds a `request_id` label explodes series count, blows up storage and query latency for all 20,000 tenants, and you cannot even attribute the cost. Per-tenant partitioning, quotas, and HLL-based cardinality metering are what make the noisy neighbor a billing event instead of an outage.",
            ],
          },
        },
        {
          id: "sd-l10-ad-click-aggregator",
          title: "Design an Ad Click Aggregator / Real-Time Analytics",
          summary:
            "Dedup clicks idempotently (bloom/windowed store or Flink exactly-once) so at-least-once delivery does not double-count, window on event time with watermarks and allowed lateness for out-of-order clicks, use Lambda/Kappa so a fast approximate stream is reconciled by an exact batch (or replayable) source of truth, and shard hot-campaign counters.",
          estimatedMinutes: 40,
          difficulty: "hard",
          skills: ["ad-aggregator", "streaming", "dedup"],
          teach: { markdown: adClickAggregatorTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-ad-click-aggregator-apply",
            prompt:
              "Design real-time aggregation of ad clicks producing per-campaign counts with fraud-resistant dedup.",
            thinkAbout: [
              "How do windowing and watermarks handle late clicks?",
              "How do you dedup and count idempotently?",
              "How does Lambda vs Kappa reconcile real-time with batch truth?",
            ],
            modelAnswerOutline: [
              "Assumptions: ~1M clicks/sec at peak, advertisers want dashboard freshness within seconds, billing needs exact deduplicated fraud-filtered counts, clicks can arrive minutes late and out of order. Estimation: 1M clicks/sec at ~200 bytes is ~200 MB/sec into the log, ~17 TB/day of raw events in S3; the aggregated counts are tiny by comparison.",
              "**Ingestion:** all clicks land in Kafka as the durable, replayable raw log (retained days), which decouples producers from processing and is the backbone for both fast and exact paths.",
              "**Streaming (fast path):** Flink consumes Kafka, windows by event time into tumbling per-minute windows per campaign, uses watermarks to close windows once late arrivals are unlikely, and allows a bounded lateness to admit stragglers with late updates. Dedup on `clickId` using Flink keyed state (or a windowed Redis/bloom set); Flink's checkpointing plus a transactional sink gives exactly-once so a crash-replay does not double-apply. Results write to sharded counters serving the dashboard.",
              "**Batch (truth):** Spark runs hourly over the S3 raw log to recompute exact, fully-deduplicated, fraud-filtered counts that billing uses, correcting any streaming drift. This is Lambda; a Kappa alternative reprocesses via a second Flink run over Kafka retention, avoiding a separate codebase.",
              "**Hot campaigns:** shard each campaign counter into N sub-counters summed on read, and pre-aggregate in the Flink operator before the sink so one viral ad does not hotspot a single key. **Fraud:** in-stream filters (dedup, per-user rate caps, obvious bot signatures) for fast defense; the batch layer does the authoritative fraud purge before billing.",
              "Tradeoffs: the dashboard is fast but approximate (open windows, in-stream fraud only); billing is slower but exact. We choose event-time windowing over processing-time so lagging ingestion does not corrupt counts. Common wrong turn: naive per-event increments on at-least-once delivery (double-count under replay), and windowing on processing time (misattributes late clicks).",
            ],
          },
          practice: {
            id: "sd-l10-ad-click-aggregator-practice",
            prompt:
              "Design the real-time attribution and counting pipeline for TikTok-scale ad analytics, where 10M events/sec span impressions, clicks, and conversions that must be joined across a multi-day attribution window, advertisers see near-real-time spend, and click fraud is adversarial. Prioritize the cross-event join under late data and the fraud pipeline.",
            thinkAbout: [
              "How do you hold multi-day join state per user without blowing up memory?",
              "Why is state TTL equal to the attribution window the key mechanism?",
              "How does a two-tier (in-stream + batch/ML) fraud pipeline handle an adversary?",
            ],
            modelAnswerOutline: [
              "Assumptions: three event types (impression, click, conversion) must be attributed together, conversions can land days after the click, fraud actors actively try to inflate counts, and advertisers watch spend live.",
              "**The hard new problem is a stateful stream join across a multi-day window.** A conversion must be matched to the click and impression that drove it, but those happened days earlier, so the join key state (per user/device/campaign) must be held for the full attribution window (e.g., 7 days) in the stream processor. Use Flink with RocksDB-backed keyed state so the join state spills to disk and survives being large, keyed by device/user, with state TTL equal to the attribution window so it is garbage-collected automatically. When a conversion arrives, it looks up the retained click/impression state and emits an attributed event; late conversions still find their click because the state is retained. Event-time processing with watermarks tuned to the multi-day lateness is essential.",
              "**Because state for the full window at 10M events/sec is huge**, partition by device/user so each Flink task holds a bounded slice, and checkpoint frequently to durable storage so a failure does not lose days of join state.",
              "**Fraud is adversarial, so it is layered and partly offline.** In-stream, cheap defenses run first: dedup on event id, per-device and per-IP rate limits, and obvious bot fingerprints, so live spend is roughly clean. Offline, a batch/ML fraud pipeline over the S3 raw log detects click-farm coordination, anomalous conversion-rate patterns, and device-graph collusion that need a global view, then issues corrections that claw back fraudulent counts before final billing. Advertiser dashboards show provisional near-real-time numbers with a clear 'subject to fraud adjustment' reconciliation, and billing uses the post-batch authoritative figure.",
              "Common wrong turn: trying to do multi-day attribution with fixed short windows or stateless joins: you either lose the click by the time the conversion lands, or you hold unbounded state with no TTL and blow up memory. Keyed, TTL'd, disk-backed stream state plus a two-tier fraud pipeline is what makes adversarial, late-arriving attribution correct.",
            ],
          },
        },
        {
          id: "sd-l10-leaderboard-topk",
          title: "Design a Leaderboard / Top-K / Distributed Counter",
          summary:
            "Use a Redis sorted set for O(log n) updates and top-K/rank reads instead of SQL sort-per-request, shard the ZSET by segment with a merged global top-N, break hot counters into summed sub-counters for write parallelism, reach for HyperLogLog and Count-Min Sketch when approximate is good enough, and keep authoritative scores in a database with Redis as a rebuildable index.",
          estimatedMinutes: 40,
          difficulty: "medium",
          skills: ["leaderboard", "redis", "approximation", "case-study"],
          teach: { markdown: leaderboardTopkTeach, estimatedMinutes: 15 },
          apply: {
            id: "sd-l10-leaderboard-topk-apply",
            prompt:
              "Design a real-time global leaderboard and the counters behind it for a game with tens of millions of players, and justify your use of Redis sorted sets, sharded counters, and approximate structures for scale.",
            thinkAbout: [
              "How do you get a player's rank and the top-K without scanning everyone on every request?",
              "What breaks when a single hot counter takes millions of increments per second?",
              "Where is an approximate answer good enough, and which structure gives it cheaply?",
            ],
            modelAnswerOutline: [
              "Assumptions: tens of millions of players, frequent score updates, reads for both top-K and 'my rank and neighbors,' near-real-time freshness, Redis available as the serving layer with a database as source of truth.",
              "**Top-K and rank:** use a Redis sorted set keyed by leaderboard segment. ZADD updates a score in O(log n), ZREVRANGE 0 k returns the top-K in O(log n + k), and ZREVRANK returns a player's rank in O(log n). 'My rank and neighbors' is ZREVRANK plus a ZREVRANGE around that index. This avoids the fatal `ORDER BY score LIMIT k` plus `COUNT(*) WHERE score > x` per request, which full-scans and collapses under load.",
              "**Scaling the ZSET:** shard by segment (region, league, daily/weekly window) so each set stays bounded, and keep a smaller global top-N ZSET merged from each shard's top entries for the global board. Exact global rank across all shards is costly, so global rank is bucketed/approximate while in-segment rank is exact. All-time boards are snapshotted on a cadence.",
              "**Distributed counters:** a single hot key (a viral player's score, global counts) taking millions of increments/sec is a write hotspot. Shard the counter into N sub-counters, increment a random shard per write, and sum on read, trading read cost for write parallelism.",
              "**Approximation:** use HyperLogLog for unique counts (unique players seen) at ~12 KB with ~2 percent error, and Count-Min Sketch for heavy-hitter/top-K frequency estimates in streams, both trading bounded error for large memory savings.",
              "**Durability and real-time:** persist authoritative scores in a database and treat Redis as a rebuildable index via write-behind or an event stream, so a Redis failure is a rebuild not data loss. Push rank changes to clients over WebSocket/SSE, and recompute expensive global boards on a cadence. Common wrong turn: SQL sort-and-count per request (full scan, collapses under load) and a single global counter row that becomes a lock hotspot.",
            ],
          },
          practice: {
            id: "sd-l10-leaderboard-topk-practice",
            prompt:
              "Design the leaderboard and engagement-counter backend for a live mobile battle-royale like Fortnite during a global event, where 100M+ players generate score updates in bursts at match-end, players demand their exact rank among friends instantly, and a global 'players online' and 'matches played' counter must be shown live. Prioritize the friends leaderboard and the hot global counters.",
            thinkAbout: [
              "Why compute the friends board on read from a shared ZSET instead of one ZSET per friend group?",
              "How do you absorb the synchronized match-end write burst?",
              "Which structure fits 'matches played' vs 'players online'?",
            ],
            modelAnswerOutline: [
              "Assumptions: 100M+ players, updates arrive in synchronized bursts (matches end together, so the write rate spikes hard), friends leaderboards are the primary social feature, and global aggregate counters are on every screen.",
              "**Friends leaderboard is the interesting twist** because it is per-viewer and small (a player has maybe 200 friends) but there are 100M viewers. Do not build a ZSET per friend group. Instead keep each player's score in a global or sharded ZSET as the source of scores, and compute a friends board on read by fetching the player's friend list and doing a small batched score lookup (ZSCORE/ZMSCORE for those 200 members) then sorting 200 items at the edge, which is trivial. This gives an exact friends ranking instantly without maintaining 100M overlapping leaderboards, and it caches well per player between score changes.",
              "**Burst writes at match-end are a thundering herd** on the ZSET and DB. Absorb them through Kafka: match results publish to a stream, consumers batch-apply ZADDs and DB writes, and dashboards read slightly-lagged values. Batching turns millions of simultaneous single updates into far fewer pipelined operations.",
              "**Global 'players online' and 'matches played'** are exactly the hot-counter problem at its worst. For 'matches played' (monotonic, high write rate) use sharded counters: N sub-counters incremented on random shards, summed (and cached for a second) on read, so no single key takes the full write rate. For 'players online' (a distinct count that goes up and down) use HyperLogLog to approximate unique concurrent players at ~2 percent error and tiny memory, refreshed every few seconds, since an exact live concurrent count across 100M is neither cheap nor necessary on a marketing counter.",
              "Common wrong turn: a per-friend-group materialized leaderboard (100M of them, impossible to keep fresh) and a single global counter row for matches-played that becomes a write bottleneck the instant a global event ends. Read-time friends computation over a shared ZSET, Kafka-batched burst writes, and sharded-counter-plus-HLL for the live aggregates are what hold up under the match-end spike.",
            ],
          },
        },
        {
          id: "sd-l10-stock-exchange",
          title: "Design a Stock Exchange / Order-Matching Engine",
          summary:
            "Match by price-time priority in an in-memory order book, process a single-writer sequenced event stream single-threaded (Disruptor style) for lock-free determinism and microsecond latency, shard by instrument for scale, keep matching fully deterministic (no wall-clock, no randomness), recover by replaying a replicated event journal from snapshots, and fan out market data on a separate bus with hot standbys.",
          estimatedMinutes: 45,
          difficulty: "hard",
          skills: ["low-latency", "matching-engine", "event-sourcing", "case-study"],
          teach: { markdown: stockExchangeTeach, estimatedMinutes: 16 },
          apply: {
            id: "sd-l10-stock-exchange-apply",
            prompt:
              "Design a stock exchange order-matching engine targeting microsecond latency, and justify deterministic price-time-priority matching, single-writer sequencing, an in-memory order book, event-log replay recovery, and market-data fan-out.",
            thinkAbout: [
              "Why is a single-writer, in-memory design faster and more correct here than a sharded database?",
              "How do you make matching fully deterministic so replay reproduces the exact same fills?",
              "How do you recover state after a crash without losing or reordering orders?",
            ],
            modelAnswerOutline: [
              "Assumptions: match a single instrument's book fairly at microsecond latency with strict auditability, replicate the pattern per instrument for scale, and require that any replay reproduces identical fills.",
              "**Matching rule:** price-time priority over a limit order book. Bids sorted descending, asks ascending, each price level a FIFO by arrival. Limit orders rest, market orders take best price, cancels remove resting orders, all handled deterministically.",
              "**Architecture:** a sequencer assigns a monotonic sequence number to every inbound event and appends it to a durable, replicated journal, then a single-threaded matching engine consumes the sequenced stream from an in-memory ring buffer (LMAX Disruptor style). Single-writer and lock-free means no lock latency and no thread-scheduling nondeterminism, which is exactly what a general transactional database cannot provide. Horizontal scale is per-instrument sharding: each symbol has its own engine with no cross-symbol hot-path coordination.",
              "**In-memory book:** price levels in arrays/intrusive structures for O(1) best-price access, no per-order DB round-trip on the hot path, because a disk hit would break the microsecond budget. **Determinism:** derive time and ids from the sequence number, forbid wall-clock and random tie-breaks, and keep matching single-threaded, so the same ordered input always yields identical output.",
              "**Recovery:** append every accepted event to the replicated journal before matching (event sourcing); on crash, replay the journal into a fresh engine from the latest snapshot to reconstruct the exact book. Deterministic matching guarantees the replay matches the original.",
              "**Market data and availability:** publish trades and book deltas on a separate high-throughput multicast/streaming bus so slow subscribers cannot backpressure the matcher, run hot-standby replicas consuming the same sequenced log for deterministic takeover, and put pre-trade risk checks in front of the matcher. Tradeoffs: single-threaded caps per-instrument throughput at one core, which we accept because latency and determinism dominate and sharding by instrument scales out. Common wrong turn: putting the order book in a general-purpose transactional database with a lock per order, which adds milliseconds and nondeterminism and cannot reach microsecond latency or reproducible replay.",
            ],
          },
          practice: {
            id: "sd-l10-stock-exchange-practice",
            prompt:
              "Design the matching core for a Coinbase-style crypto exchange that runs 24/7 with no maintenance window, matches hundreds of trading pairs, must survive data-center failure without losing or reordering a single order, and faces bursty retail volume spikes of 50x during market events. Prioritize continuous availability and cross-datacenter failover of a deterministic engine.",
            thinkAbout: [
              "Why must the sequenced journal be synchronously replicated across datacenters?",
              "How does a hot standby take over deterministically without reordering orders?",
              "How do you fence a demoted primary to avoid split-brain double-matching?",
            ],
            modelAnswerOutline: [
              "Assumptions: no nightly downtime (crypto never closes), hundreds of pairs, zero tolerance for lost or reordered orders even across a DC failure, and 50x burst spikes that must not corrupt matching.",
              "**Keep the single-writer, deterministic, event-sourced engine per trading pair**, because the correctness argument is unchanged. The new problems are 24/7 availability, cross-DC failover, and bursts. The backbone is the replicated sequenced log. Every accepted order is sequenced and written to a synchronously replicated journal spanning at least two datacenters (Raft/quorum replication) before matching acts on it, so an order acknowledged to the client is guaranteed durable in multiple DCs and can never be lost or reordered. The sequence number is the single source of truth for ordering.",
              "**Failover:** run a hot standby in a second datacenter consuming the same sequenced log and rebuilding the identical book deterministically, kept in lockstep by replay. On primary failure, the standby, already caught up to the last committed sequence number, takes over from exactly that point. Because ordering is defined by the committed log and matching is deterministic, takeover cannot reorder or drop orders; it resumes at the next uncommitted sequence. Careful fencing (a single active writer via leader election, rejecting a demoted primary's writes) prevents split-brain double-matching.",
              "**Bursts of 50x:** the sequencer and journal must absorb the write spike, so use a high-throughput append-only log (the ring buffer plus batched fsync/replication) that batches under load, and apply admission control / rate limiting and pre-trade risk checks in front so malformed or abusive order floods are shed before the matcher. Per-pair sharding spreads the burst across engines; a single hot pair is still bounded by one core, so capacity-plan the busiest pairs and, if needed, place them on dedicated hardware.",
              "Common wrong turn: async replication of the journal for speed: an async gap means a DC failure loses acknowledged orders or lets the standby diverge, violating the no-loss/no-reorder requirement. Synchronous cross-DC quorum commit of the sequenced log, deterministic standby replay, and leader-fenced failover are what deliver 24/7 availability without sacrificing the exactly-reproducible matching that the single-writer design exists to guarantee.",
            ],
          },
        },
      ],
    },
  ],
}
