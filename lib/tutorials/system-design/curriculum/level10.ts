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
  ],
}
