> Module **sd-l10-m1** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l9-m5](./sd-l9-m5.md) · Next: [sd-l10-m2](./sd-l10-m2.md)

# L10 · Foundational Building Blocks

By the end of this module you can run the four warm-up "design X" interviews that show up in almost every loop (URL shortener, distributed rate limiter, Snowflake ID generator, and typeahead), moving cleanly from back-of-envelope estimation to a concrete data model, a read path, and the one deep dive each problem is really testing.

### sd-l10-url-shortener: Design a URL Shortener (TinyURL)

- **id:** `sd-l10-url-shortener`  ·  **difficulty:** easy  ·  **est:** 35 min  ·  **skills:** url-shortener, kv-store, caching

#### Learn

The URL shortener is the canonical warm-up because it forces you to demonstrate estimation, key generation, a KV data model, and a read-heavy cache path in about 20 minutes, and it punishes anyone who reaches for a relational database by reflex.

Start with numbers because they justify every later decision. At 100M new links per day, writes are 100M / 86,400s which is roughly 1,160 writes/sec, call it about 1.2K QPS write. At 100:1 read:write that is roughly 116K reads/sec. Storage: each row is a short key (7 bytes), a long URL (say ~500 bytes), plus metadata, call it ~600 bytes. 100M/day times 365 is 36.5B links/year, times 600 bytes is roughly 20 TB/year of raw rows. That is small enough that the interesting problem is latency and throughput, not capacity.

Key generation is the heart of the problem. Base62 (0-9, a-z, A-Z) gives 62^7 which is about 3.5 trillion combinations for a 7-char key, plenty of headroom. There are three real strategies. First, encode a globally unique counter (or a Snowflake ID) into base62. This is collision-free by construction and needs no read-before-write, but a naive single counter is a coordination bottleneck, so use ranged counter allocation (each app server leases a block of 10,000 ids) or a Snowflake generator. Second, hash the long URL (MD5/SHA) and take the first 7 chars. This gives idempotency for free (same URL maps to same key) but you must detect collisions with a read and retry with a salt. Third, pre-generate a large pool of unused keys offline and hand them out; this moves collision work out of the request path entirely.

**Interview nuance:** The single strongest sign of seniority here is refusing a relational table with an AUTO_INCREMENT primary key. It creates a write hotspot on the highest index page and does not shard cleanly. Say that out loud.

The read path is a cache in front of a KV store. Because reads outnumber writes 100:1 and the mapping is immutable once created, this is the ideal caching workload: put Redis (or Memcached) in front of a sharded KV store (DynamoDB, Cassandra, or even sharded Postgres used as a KV table). Shard by the short key so lookups hit exactly one partition. A modest cache holding the hot working set absorbs the vast majority of the 116K reads/sec, and the KV store handles the long tail and all writes.

Redirect semantics matter more than people expect. A 301 (permanent) is cacheable by browsers and proxies, so the follow-up request may never reach your servers, which is great for load but blinds you to click analytics. A 302 (found/temporary) is not cached the same way, so every click hits you, which is what you want if analytics or per-click logic (expiry, A/B) is the product. Pick 302 when clicks are the business, 301 when raw redirect throughput is.

```
GET /aX9k2Bq  ->  Redis GET aX9k2Bq  (hit ~99%)  ->  302 Location: https://long...
                       miss  ->  KV GET (sharded by key)  ->  fill Redis  ->  302
```

Recap: estimate first (~1.2K writes/sec, ~116K reads/sec, ~20 TB/yr), generate keys with base62 of a counter/Snowflake to avoid collisions and hotspots, serve reads from Redis in front of a sharded KV store, and choose 301 vs 302 by whether you need click analytics.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a service that returns a 7-character short URL for any long URL and redirects on lookup, at 100M new links/day and 100:1 read:write.

**Think about:**
- How do you generate a short, collision-free key?
- Why is a cache in front of a KV store the right read path?
- 301 vs 302 redirect: how does it interact with analytics and caching?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 100M links/day, 100:1 reads, keys never change once created, custom aliases and optional expiry are in scope, correctness on collisions is required.

Estimation: ~1,160 writes/sec, ~116K reads/sec, ~600 bytes/row, ~20 TB/year. This is a latency and throughput problem, not a storage one.

API: `POST /urls {longUrl, customAlias?, ttl?}` returns `{shortUrl}`; `GET /{key}` returns a 301 or 302 redirect. Creation is idempotent per longUrl unless a custom alias is requested.

Data model: a single logical table `links(short_key PK, long_url, created_at, expires_at, owner_id)` stored in a KV store (DynamoDB or Cassandra) sharded by `short_key`. No relational joins are needed, so a relational DB and its auto-increment PK are the wrong tool.

Key generation: allocate a globally unique 64-bit id from a Snowflake generator (or ranged counter blocks leased per server) and base62-encode it to 7 chars. This is collision-free by construction with no read-before-write, and it avoids the single-counter bottleneck. If we instead hash the URL for idempotency, we detect the rare collision with a conditional put and retry with a salt.

Read path: Redis in front of the KV store. Because mappings are immutable and reads dominate 100:1, cache hit rate is very high; the hot working set fits comfortably in memory. On a miss, read the shard, backfill the cache, and redirect. This lets a small fleet serve 116K reads/sec.

Redirect choice: use 302 if click analytics or expiry enforcement is the product (every click reaches us), or 301 if we only care about redirect throughput and want browsers and CDNs to cache the hop.

Extras: idempotency (same longUrl returns the same key via a URL-hash lookup), custom aliases stored as reserved keys with a uniqueness check, and TTL/expiry via an `expires_at` column plus a lazy check on read and a background sweeper.

Tradeoffs: base62-of-counter buys collision-freedom and sortability at the cost of guessable, enumerable keys; if enumeration is a concern, add random bits or use a hash. The KV + cache design trades relational query flexibility (which we do not need) for horizontal scale.

Common wrong turn: a relational DB with an AUTO_INCREMENT primary key, which creates an index write hotspot and shards poorly at this write rate.

**Self-check rubric:**
- [ ] Did I estimate writes/sec, reads/sec, and yearly storage before designing?
- [ ] Did I pick a collision-free key strategy (base62 of counter/Snowflake) and justify it over hashing?
- [ ] Did I put a cache in front of a sharded KV store and explain why the workload caches well?
- [ ] Did I make the 301 vs 302 decision based on analytics/caching, not arbitrarily?
- [ ] Did I explicitly reject a relational auto-increment PK as a write hotspot?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the redirect and link-creation path for Bitly's enterprise tier, where paid customers require real-time click analytics (geo, device, referrer) on every click, custom branded domains, and 99.99% redirect availability, at a sustained 500K redirects/sec globally.

**Model answer (revealed on demand):**

Assumptions: every click must be counted (analytics is the paid feature), branded domains multiply the routing table, and availability is contractual (99.99% is ~52 min/year of downtime budget).

Because analytics is required on every click, we cannot rely on browser-cached 301s; we must see each click. Use 302 redirects so requests reach us, and put the redirect service at the edge (Anycast plus regional POPs) to hold the sub-50ms redirect budget globally. The short-key -> long-URL map is immutable and small enough to replicate fully to every region; push it to a per-region cache (Redis or an in-process LRU) backed by a globally replicated KV store (DynamoDB global tables). A redirect is then a pure in-memory lookup plus a fire-and-forget analytics event, so the redirect stays fast even though we count every click.

Analytics path: on each redirect, emit an event (key, timestamp, geo from edge, user-agent, referrer) to Kafka rather than writing to a DB inline. A stream processor (Flink) aggregates counts into per-link rollups (per minute, hour, day) stored in a time-series or wide-column store, and raw events land in S3 for ad-hoc queries. This decouples the 500K/sec redirect path from analytics durability: if the analytics pipeline lags, redirects are unaffected, and we accept eventual (seconds) freshness on dashboards.

Branded domains: store a `domain -> tenant` mapping and namespace keys by tenant so `acme.link/promo` and `globex.link/promo` do not collide. TLS is handled with on-demand certificate issuance (ACME) per custom domain, cached at the edge.

Availability: the redirect path has no synchronous dependency on a primary DB (it reads a replicated cache), so a regional DB failure still serves redirects from cache. Analytics is fail-open: if Kafka is unreachable, buffer events locally and keep redirecting rather than dropping the click or the redirect. Multi-region active-active with health-checked Anycast gives the four nines.

Tradeoff: full replication of the key map to every region costs memory and write-propagation lag (new links are visible after replication catches up, typically sub-second), which is an acceptable price for a globally fast, always-available redirect. The wrong turn here is writing an analytics row synchronously on the redirect path, coupling click-counting durability to redirect latency and availability.

### sd-l10-rate-limiter: Design a Distributed Rate Limiter

- **id:** `sd-l10-rate-limiter`  ·  **difficulty:** medium  ·  **est:** 35 min  ·  **skills:** rate-limiter, redis, distributed

#### Learn

A rate limiter is a reusable component, so the interview is really about two things: which algorithm you pick and how you keep the counter correct across many stateless nodes. Get both right and the rest is response headers.

Four algorithms, with real tradeoffs. Fixed window counts requests per calendar minute: it is trivial (one counter, one TTL) but allows a 2x burst at the boundary, because 100 requests at 0:59 and another 100 at 1:00 both pass. Sliding window log keeps a timestamp per request and counts those within the last 60s: perfectly accurate but O(N) memory per key, which is expensive for hot keys. Sliding window counter approximates the log by weighting the previous window's count by how much of it overlaps the current one; it is the usual production choice because it kills the boundary burst with O(1) memory. Token bucket refills tokens at a fixed rate up to a capacity and spends one per request: it explicitly allows controlled bursts (up to the bucket size) while bounding the long-run rate, which is why AWS and Stripe use it. Leaky bucket smooths output to a constant rate (a queue drained at fixed speed), best when a downstream needs a steady feed rather than burst tolerance.

**Interview nuance:** When asked to "enforce 100 req/min," clarify whether bursts are acceptable. If yes, token bucket. If you need a hard, accurate cap with cheap memory, sliding window counter. Naming the burst-vs-accuracy tradeoff is what separates a strong answer.

Placement decides latency and blast radius. You can limit at the client (cheap, but untrusted), at the API gateway or a sidecar (Envoy) close to the app (low latency, shared policy), or in a dedicated rate-limit service (clean but adds a network hop per request). For a fleet of stateless servers the shared state must live somewhere both nodes can see, which is where Redis comes in.

The hard part is distributed correctness. If each node keeps a local counter, a client hitting N nodes behind a load balancer gets up to N times the intended limit. So the counter is shared, usually in Redis. The naive `GET` then `INCR` is a race: two nodes read 99, both increment, both allow, and you overshoot. Fix it by making the check-and-increment atomic: either `INCR` first and compare the returned value (INCR is atomic and returns the new count), setting a TTL on first creation, or run a small Lua script that reads, decides, and writes in one round trip so no interleaving is possible. Sliding-window and token-bucket variants are almost always implemented as a single Lua script for exactly this reason.

Two operational decisions round it out. Clock skew: token buckets computed from wall-clock refill must tolerate small skew, so compute refill on the Redis side (single clock) rather than each app node's clock. And the availability call: if Redis is down, do you fail open (allow all traffic, protecting user experience but exposing the backend to overload) or fail closed (reject, protecting the backend but causing an outage)? Public read APIs often fail open; a login or payment endpoint being protected from abuse fails closed. State the choice.

The response contract: return HTTP 429 Too Many Requests with a `Retry-After` header and `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` headers so clients can back off gracefully, and support per-tier quotas (free vs paid API keys).

```
Node A, Node B  ->  Redis (atomic Lua): count = INCR key; if first, EXPIRE 60
                    if count > 100  -> 429 + Retry-After
                    else            -> allow
```

Recap: pick the algorithm by burst tolerance (token bucket) vs accurate hard cap (sliding window counter), keep the shared counter in Redis with an atomic INCR+TTL or Lua script to avoid the read-modify-write race, compute time on the Redis side to dodge clock skew, and consciously choose fail-open vs fail-closed on a Redis outage.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a rate limiter that enforces 100 req/min per API key across a fleet of stateless servers.

**Think about:**
- Which algorithm balances burst tolerance and accuracy?
- How do you keep the shared counter atomic across nodes?
- What is the fail-open vs fail-closed decision on a Redis outage?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: many stateless app servers behind a load balancer, the limit is per API key, small bursts are tolerable but the long-run cap must hold, and the limiter must add well under 5ms to the request.

Algorithm: sliding window counter as the default because it enforces an accurate 100/min without the fixed-window boundary burst and uses O(1) memory per key. If the product wants to allow short bursts (e.g. a batch job), token bucket with capacity 100 and refill 100/60s per second is the alternative; I would confirm burst policy with the interviewer and name the tradeoff either way.

Placement: enforce at the API gateway or an Envoy sidecar so every request is checked close to the app with shared policy, and keep the shared state in Redis so all nodes see one counter. Local-only counters are wrong here: a client spread across N nodes would get up to Nx the limit.

Atomicity: the counter operation must be a single atomic step. Use a Lua script (or `INCR` + conditional) executed in Redis: read the current count for `key = ratelimit:{apiKey}:{window}`, decide allow/deny, and increment in one round trip so two nodes cannot both read 99 and both allow. Set the TTL to the window length on creation so keys expire automatically. Computing the window and any token refill on the Redis side uses a single clock and sidesteps app-node clock skew.

Outage behavior: if Redis is unreachable, this API fails open (allow) for a public, non-destructive endpoint to protect user experience, with an alert and a short local fallback limiter as a safety net; for an abuse-sensitive endpoint (login, payments) it fails closed. I state the choice explicitly rather than leaving it implicit.

Response contract: on limit, return 429 with `Retry-After` and `RateLimit-*` headers; support per-tier quotas by keying the limit on the API key's plan.

Tradeoffs: Redis adds a network hop and is a shared dependency, but it is the only way to enforce a global limit across stateless nodes; the sliding window counter trades a tiny approximation error for O(1) memory versus the exact-but-heavy sliding log.

Common wrong turn: per-node local counters (client gets Nx the limit) or a non-atomic GET-then-INCR that races under concurrency and overshoots.

**Self-check rubric:**
- [ ] Did I pick a specific algorithm and justify it on burst vs accuracy?
- [ ] Did I make the check-and-increment atomic (Lua or INCR+TTL) and explain the race it prevents?
- [ ] Did I keep shared state in Redis and reject per-node local counters?
- [ ] Did I address clock skew by computing time on the Redis side?
- [ ] Did I consciously choose fail-open vs fail-closed and return 429 + Retry-After?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design Stripe's API rate limiter, which must enforce multiple simultaneous limits per account (a steady request-rate limit, a concurrent-request limit, and a per-endpoint limit on expensive operations like charge creation) across a global multi-region fleet handling hundreds of thousands of requests/sec, while staying fast enough to add negligible latency.

**Model answer (revealed on demand):**

Assumptions: several limiter types run at once, limits are per account and per endpoint, traffic is global, and the limiter is on the hot path so it must be a single-digit-millisecond in-region operation.

Use a layered set of limiters, each a token bucket implemented as a Redis Lua script, because Stripe's public design explicitly favors token buckets for controlled bursts. Layer one is a request-rate limiter (tokens/sec per account). Layer two is a concurrency limiter that counts in-flight requests: increment on start, decrement on completion, reject when the account exceeds its concurrent slot budget; this protects against slow requests piling up even when the rate looks fine. Layer three is a per-endpoint limiter with tighter buckets for expensive operations (charge creation, report generation) so a single costly endpoint cannot starve the account's cheap traffic. A request must pass all applicable layers.

Locality and scale: run the limiter in the same region as the request and shard the Redis keyspace by account so a hot account's counters live on one node and lookups are one round trip. To survive the case where Redis is slow, keep the script tiny and set a strict timeout; on Redis failure, fall back to a permissive local limiter and fail open for read APIs, fail closed for mutating money endpoints.

Global consistency: strict global counting across regions would need cross-region coordination that blows the latency budget, so enforce per-region buckets sized to the account's share and accept that a client spraying across regions could briefly exceed the global cap by a bounded amount; this is a deliberate accuracy-for-latency trade. Load shedding sits above all of this: when the overall system is unhealthy, a separate shedder drops the lowest-priority traffic (test-mode calls, non-critical endpoints) first.

Response: 429 with `Retry-After`, plus a distinct signal for concurrency-limit rejections so clients reduce parallelism rather than just slow their rate. The wrong turn is a single global counter with cross-region synchronous coordination, which trades away the latency budget for accuracy the business does not actually need.

### sd-l10-unique-id-generator: Design a Distributed Unique ID Generator (Snowflake)

- **id:** `sd-l10-unique-id-generator`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** snowflake, id-generation, clocks

#### Learn

The job is to hand out 64-bit, globally unique, roughly time-sortable IDs at millions per second without any node talking to any other node on the request path. Coordination-free is the whole point: a central sequence server would be a bottleneck and a single point of failure.

Snowflake's trick is to partition the ID space by bit budget so each node can mint IDs alone. A common 64-bit layout: 1 sign bit (unused, kept 0 so the number is positive), 41 bits of millisecond timestamp (since a custom epoch), 10 bits of machine/worker id, and 12 bits of a per-millisecond sequence counter. Do the arithmetic, because interviewers ask. 41 bits of ms is 2^41 milliseconds which is about 69 years of range from your epoch. 10 bits of worker id is 1,024 nodes. 12 bits of sequence is 4,096 ids per node per millisecond, which is about 4.096M ids per node per second, times 1,024 nodes is over 4 billion/sec of theoretical ceiling. You can rebudget the bits (fewer worker bits, more sequence) to match your fleet.

The ID is time-sortable because the timestamp occupies the high bits: sort the 64-bit integers and you get roughly chronological order, which is why these make excellent clustered primary keys. Within a single millisecond the sequence counter breaks ties and guarantees uniqueness; if the sequence overflows (more than 4,096 ids in one ms on one node), the generator waits (busy-spins) until the next millisecond.

**Interview nuance:** Compare the alternatives out loud. UUIDv4 is random 128-bit: trivially coordination-free and unpredictable, but not sortable, and as a clustered index key its randomness scatters writes across the B-tree and fragments the index (the classic wrong turn). UUIDv7 and ULID fix that by putting a timestamp in the high bits (like Snowflake, but 128-bit and needing no worker-id assignment). DB auto-increment is perfectly sortable and compact but needs central coordination and does not shard. A ticket server (a dedicated ID service) centralizes allocation and reintroduces the bottleneck Snowflake exists to avoid. Snowflake wins when you want compact, sortable, coordination-free 64-bit keys and can manage worker ids.

The whole scheme rests on the clock, which is its main weakness. Because the timestamp is in the high bits, if a node's clock jumps backward (NTP correction, VM migration), it could generate an ID with a smaller timestamp than one it already issued, risking a duplicate or breaking monotonicity. The standard defense: track the last-issued timestamp; if the current clock is behind it, refuse to issue IDs (throw, or wait) until the clock catches up, rather than emit a possibly-duplicate ID. Depend on NTP to keep clocks disciplined, but never trust it blindly.

Worker-id assignment is the other operational detail. Each node needs a unique 10-bit id. Assign it via a coordination service (ZooKeeper or etcd) that leases ids, or from a config/orchestrator on startup. Exhaustion (more than 1,024 live nodes) means you rebudget bits or recycle ids from dead nodes.

```
 0 | 41 bits timestamp (ms since epoch) | 10 bits worker id | 12 bits sequence
   |<------------- high bits: sortable ------------->|<-- uniqueness within ms -->
```

There is a real tension: sortability leaks information. A time-sortable ID reveals creation time and, worse, sequential-ish IDs let an attacker enumerate or estimate volume ("how many orders did they get today"). If unpredictability matters (public-facing resource ids), do not expose the raw sortable id; use a random UUID externally and keep the Snowflake id internal, or add a non-sequential public slug.

Recap: budget the 64 bits (timestamp high for sortability, worker id, sequence), which lets every node mint millions of unique IDs per second with zero coordination; defend the clock by refusing to issue on a backward jump; and remember that sortability trades away unpredictability, so hide raw ids when enumeration is a threat.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a service issuing 64-bit, time-sortable, globally unique IDs at millions/sec without central coordination.

**Think about:**
- How do you budget the bits (timestamp, worker, sequence)?
- How do you handle clock skew and rollback?
- What is the sortability vs unpredictability tension?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: we need compact 64-bit ids (they will be clustered primary keys), rough time ordering is desired, and the generator must run locally on each node with no per-request coordination.

Layout: a Snowflake scheme in 64 bits: 1 sign bit (0), 41 bits of millisecond timestamp from a custom epoch (about 69 years of range), 10 bits of worker id (1,024 nodes), 12 bits of per-ms sequence (4,096 ids/ms/node). That yields about 4.096M ids/node/sec and over 4B/sec across a full fleet, comfortably meeting millions/sec. I would rebudget (fewer worker bits, more sequence) if the fleet is small but very hot.

Why this and not alternatives: it is coordination-free (each node mints alone), sortable (timestamp in the high bits, so ids double as chronological clustered keys), and compact (64-bit fits a BIGINT). A DB auto-increment needs central coordination and does not shard; a ticket server reintroduces a bottleneck; UUIDv4 is coordination-free but random, so it is not sortable and fragments a clustered index. UUIDv7/ULID are good 128-bit alternatives if I do not want to manage worker ids.

Clock handling: because the timestamp drives ordering, a backward clock jump could produce a duplicate or non-monotonic id. The generator tracks the last-issued timestamp; if the current time is less than it, it refuses to issue (waits or throws) until the clock catches up, never emitting a possibly-duplicate id. Sequence overflow within a millisecond makes the node spin to the next ms. NTP keeps clocks disciplined but is not trusted blindly.

Worker-id assignment: lease unique ids from ZooKeeper/etcd (or inject via the orchestrator on startup); recycle ids from dead nodes; rebudget bits if we exceed 1,024 live nodes.

Sortability vs unpredictability: sortable ids leak creation time and enable enumeration and volume estimation. If ids are public, I expose a random UUID or opaque slug externally and keep the Snowflake id internal.

Tradeoff and wrong turn: the design trades unpredictability for sortability and compactness, and trades a hard clock dependency for coordination-freedom. The classic wrong turn is using random UUIDv4 as a clustered primary key, which scatters inserts across the index and fragments it.

**Self-check rubric:**
- [ ] Did I budget the 64 bits explicitly and compute the per-node and fleet throughput?
- [ ] Did I explain why the timestamp in the high bits makes ids sortable?
- [ ] Did I handle backward clock jumps by refusing to issue rather than risking a duplicate?
- [ ] Did I compare Snowflake to UUIDv4/v7, auto-increment, and a ticket server?
- [ ] Did I name the sortability-vs-unpredictability leak and how to hide ids when needed?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the primary-key generation strategy for Discord's message store, which writes billions of messages/day into Cassandra, needs ids that sort by creation time so a channel's history can be range-scanned efficiently, and must let clients derive a message's approximate timestamp from its id offline, all without a central sequence service.

**Model answer (revealed on demand):**

Assumptions: writes are enormous (billions/day), messages are stored in Cassandra partitioned by channel, and the id must be both the ordering key for range scans and a client-decodable timestamp source. This is exactly the Snowflake use case, and Discord in fact uses Snowflake ids.

Design: generate 64-bit Snowflake ids with the timestamp in the high 41 bits from a Discord-specific epoch (not the Unix epoch, to maximize usable years), then worker and process bits, then a per-ms sequence. Store messages in Cassandra with a partition key of `channel_id` and a clustering key of the Snowflake `message_id` in ascending order. Because the id sorts by time, fetching a channel's recent history is a single efficient clustering-order range scan (give me messages with id < cursor, limit 50), and pagination is just carrying the last id as the cursor. No secondary time index is needed because time is embedded in the key.

Client-side timestamp: since the epoch and bit layout are published, a client extracts `(id >> 22) + epoch` to recover the message's creation time in milliseconds without a server round trip, which powers relative timestamps in the UI and lets clients reason about ordering offline.

Coordination-free at scale: each id-generating worker mints locally, so billions/day spread across many workers never touch a central sequence; 4,096 ids/ms/worker is far more than any single worker needs. Worker/process ids are assigned at process startup.

Clock safety: a backward clock jump on a worker would risk a duplicate or out-of-order id in a channel, so the generator refuses to issue while its clock is behind the last-issued timestamp, and hosts run disciplined NTP. Because ordering only needs to be correct per channel and ids are globally unique, small cross-worker clock differences only perturb the ordering of messages sent within the same millisecond, which is acceptable.

Tradeoff: embedding time in the key makes ids enumerable and leaks message volume per channel, but message ids are already scoped to authorized channel members, so the enumeration risk is contained; the payoff is index-free time-ordered range scans and offline-decodable timestamps. The wrong turn would be random UUID message ids, which would force a separate time index and make Cassandra range scans and cursor pagination far more expensive.

### sd-l10-typeahead: Design Typeahead / Autocomplete

- **id:** `sd-l10-typeahead`  ·  **difficulty:** medium  ·  **est:** 35 min  ·  **skills:** typeahead, trie, ranking

#### Learn

Typeahead is a latency problem wearing a data-structure costume. The user types a prefix and expects the top 10 completions to appear within about 100ms, and they fire a request on nearly every keystroke, so the read path has to be brutally fast and the load has to be cut before it ever reaches your servers.

The core structure is a trie (prefix tree): each node is a character, and a path from the root spells a prefix. The naive trie lookup walks to the prefix node, then does a subtree traversal to find all completions and rank them, which is too slow for a hot prefix with thousands of descendants. The production trick is to cache the top-k completions at every node. When you reach the node for "ne", the 10 best completions ("netflix", "news", "nest", ...) are already stored right there, so serving is O(length of prefix), single-digit milliseconds, no subtree walk. This precomputation is done offline or incrementally, not per request.

**Interview nuance:** The single most common wrong turn is `SELECT ... WHERE term LIKE 'prefix%'` against a SQL table on every keystroke. Even with an index, ranking and the per-keystroke QPS blow the 100ms budget under load. Say why a prefix tree with cached top-k beats it, and mention that a search engine (Elasticsearch completion suggester, which is FST/trie-backed) is the buy-not-build version.

Ranking is what makes suggestions good. Completions are scored by some blend of frequency (how often this query is issued), recency (trending terms weighted up via time decay), and personalization (this user's or this cohort's history). The scores are baked into the cached top-k per node, so ranking cost is paid offline. Weighted tries store the aggregate score alongside each terminal so the top-k selection is a simple heap over the subtree during the offline build.

Keeping suggestions fresh means updating from a stream. Query logs flow through Kafka; you either rebuild the trie in batch (hourly/daily) from aggregated counts, which is simple and consistent but stale by up to the batch interval, or apply incremental updates so a newly trending term (a breaking-news query) appears within minutes, at the cost of a more complex mutable structure. Most systems do a nightly full rebuild plus a fast incremental layer for trending terms.

The load-shedding layer is as important as the data structure. Debounce on the client: wait ~150-300ms after the last keystroke before firing, so "netflix" sends one or two requests, not seven. Cache aggressively: the client caches results per prefix (typing then backspacing hits the cache), and because the same short prefixes are wildly popular, serve them from a CDN/edge cache with a short TTL. A huge fraction of traffic is a small set of hot prefixes, so edge caching plus debouncing removes most of the origin load before the trie is even consulted.

Finally, the quality details: fuzzy matching and typo tolerance (edit-distance or an n-gram index so "netlfix" still suggests "netflix"), and a profanity/safety filter so suggestions never surface offensive or unsafe completions.

```
key "ne" -> trie walk n->e (O(2)) -> node holds cached top-10:
            [netflix, news, nest, netgear, ...]  -> return, ~few ms
   (before origin: client debounce 200ms + edge cache on hot prefixes)
```

Recap: serve completions from a trie with top-k cached per node so lookup is O(prefix length) with no subtree walk, rank offline by frequency/recency/personalization, refresh from a Kafka stream (batch rebuild plus incremental for trending), and cut origin load with client debouncing and edge caching, never a per-keystroke SQL LIKE query.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design autocomplete that returns the top 10 ranked completions within 100ms as a user types a prefix.

**Think about:**
- How does a trie with cached top-k per node serve sub-100ms?
- How are suggestions ranked and updated from a stream?
- How do debouncing and edge caching cut load?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: top 10 completions, hard 100ms budget, a request per keystroke at high QPS, and suggestions ranked by popularity with some recency, refreshed regularly rather than in real time.

Serving structure: a trie where every node caches its top-10 completions (with scores) precomputed offline. A lookup walks the prefix (O(prefix length), a handful of characters) and returns the node's cached list with no subtree traversal, so serving is single-digit milliseconds, well inside 100ms. Hold the trie in memory on the suggestion service (sharded by prefix range if it does not fit one box), or buy it as an Elasticsearch completion suggester (FST-backed), which is the same idea productized.

Ranking: score completions offline by a blend of frequency (dominant), recency via time decay (so trending terms rise), and optional personalization from the user's or cohort's history. Because scores are baked into the cached top-k, ranking costs nothing at request time.

Freshness from a stream: query logs flow through Kafka. A batch job aggregates counts and rebuilds the trie nightly for consistency, and a lightweight incremental path promotes newly trending terms within minutes so breaking queries are not missing for a day. This is the batch-vs-incremental tradeoff: batch is simple and stale, incremental is fresh and complex, so I do both.

Cutting load before the origin: debounce on the client (fire ~200ms after the last keystroke, collapsing seven keystrokes into one or two calls), cache results per prefix on the client (backspacing is a cache hit), and put hot short prefixes behind a CDN/edge cache with a short TTL. Because a small set of prefixes carries most traffic, these three together remove the majority of origin QPS.

Quality: typo tolerance via an edit-distance or n-gram fallback so "netlfix" still resolves, and a profanity/safety filter applied at build time so unsafe completions never enter the cached lists.

Tradeoffs: caching top-k per node trades memory and offline build cost for sub-100ms reads; near-real-time freshness costs incremental-update complexity. Common wrong turn: a per-keystroke `LIKE 'prefix%'` SQL query, which cannot hit the latency budget under this QPS and does not rank well.

**Self-check rubric:**
- [ ] Did I use a trie with top-k cached per node and explain why it avoids a subtree walk?
- [ ] Did I state the ranking signals (frequency, recency, personalization) and say they are computed offline?
- [ ] Did I describe stream updates and the batch-vs-incremental freshness tradeoff?
- [ ] Did I cut origin load with client debouncing plus client and edge caching?
- [ ] Did I explicitly reject a per-keystroke SQL LIKE query and add typo/safety handling?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design Google-scale search autocomplete: personalized, trend-aware suggestions in multiple languages returned within 100ms at the p99, at hundreds of thousands of prefix queries/sec globally, where a breaking-news query must start appearing in suggestions within minutes.

**Model answer (revealed on demand):**

Assumptions: global multi-region traffic, hundreds of thousands of QPS, a hard 100ms p99, per-user personalization on top of global popularity, multilingual input, and minutes-fresh trending.

Serving: a distributed in-memory trie with top-k cached per node, sharded by prefix and replicated to every region so a lookup is a local, in-region, single-digit-millisecond operation. Front it with per-region edge caches; because a small set of prefixes dominates, edge caching plus client debouncing (200ms) absorbs the majority of the QPS before it reaches the trie fleet. Language is part of the shard key so multilingual tries are served from the right index, with the user's locale narrowing the candidate set.

Two-layer ranking: a global base score (frequency plus time-decayed recency) is precomputed and baked into the cached top-k. Personalization is a fast re-rank applied at request time over the small candidate set (10-20 items): blend the global candidates with the user's recent-query signals and a lightweight model, cheap because it only re-scores a handful of items. This keeps personalization within budget without a per-user trie.

Trending in minutes: this is the hard freshness requirement. Query events stream through Kafka into a real-time aggregation (Flink) computing short-window trending scores; a fast incremental updater pushes newly hot terms into the live tries within minutes, layered on top of a nightly full rebuild that guarantees a consistent global baseline. This is the deliberate batch-plus-incremental split: batch for correctness and coverage, streaming for trending latency.

Reliability and quality: fail soft, since a missing suggestion is not an outage, so on a shard timeout return the global (non-personalized) top-k rather than blocking. Apply per-language profanity and safety filters at build time, and add typo tolerance via an n-gram/edit-distance fallback. The wrong turn at this scale is trying to build a full per-user trie (memory explosion) or re-ranking the entire subtree per request; instead personalize by re-ranking a tiny candidate set and keep the heavy popularity ranking offline.
