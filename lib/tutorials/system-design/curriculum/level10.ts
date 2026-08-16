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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A candidate proposes a relational table with an AUTO_INCREMENT primary key, base62 encoded into the short key. What is the objection the interviewer is waiting for?",
  "options": [
    {
      "label": "Every insert lands on the highest index page, so writes hotspot on one page, and a single sequence does not shard cleanly",
      "correct": true,
      "feedback": "Right. A monotonic sequence concentrates inserts at one end of the index and cannot be split across shards without reintroducing a coordinator, which is why you reach for leased counter ranges or Snowflake."
    },
    {
      "label": "Auto-increment ids can collide when two inserts race",
      "feedback": "The database guarantees uniqueness, so collisions are not the risk. The cost is the write hotspot and the fact that the sequence resists sharding."
    },
    {
      "label": "Base62 of an integer id will not fit in seven characters",
      "feedback": "62 to the 7th is about 3.5 trillion, so a seven character key has enormous headroom. Length is not what fails here."
    },
    {
      "label": "Sequential ids let anyone enumerate every link, which is the main problem",
      "feedback": "Guessable keys are worth raising, and this lesson returns to it. But the structural objection, the one that decides the architecture, is the hotspot and the sharding failure."
    }
  ]
}
\`\`\`

**Interview nuance:** the single strongest sign of seniority here is refusing a relational table with an AUTO_INCREMENT primary key. It creates a write hotspot on the highest index page and does not shard cleanly. Say that out loud.

## The read path is a cache in front of a KV store

Because reads outnumber writes 100:1 and the mapping is immutable once created, this is the ideal caching workload: put Redis (or Memcached) in front of a sharded KV store (DynamoDB, Cassandra, or even sharded Postgres used as a KV table). Shard by the short key so lookups hit exactly one partition. A modest cache holding the hot working set absorbs the vast majority of the 116K reads/sec, and the KV store handles the long tail and all writes.

## Redirect semantics

A 301 (permanent) is cacheable by browsers and proxies, so the follow-up request may never reach your servers, which is great for load but blinds you to click analytics. A 302 (found/temporary) is not cached the same way, so every click hits you, which is what you want if analytics or per-click logic (expiry, A/B) is the product. Pick 302 when clicks are the business, 301 when raw redirect throughput is.

\`\`\`csdiagram
{
  "type": "pipeline",
  "stages": [
    { "label": "GET /aX9k2Bq", "note": "the short code is the cache key, so no lookup is needed to build it" },
    { "label": "Redis GET", "note": "hits roughly 99% of the time: the working set is tiny and links are read-heavy" },
    { "label": "KV GET on miss", "note": "sharded by the same key, so a miss is one hop, not a scan" },
    { "label": "Fill Redis", "note": "cache-aside, so the second reader for a link never reaches the store" },
    { "label": "302 Location", "note": "temporary redirect, so every click comes back to you and analytics stay intact" }
  ],
  "highlight": ["Redis GET", "302 Location"],
  "caption": "The two highlighted stages carry the design. A ~99% cache hit rate is what makes 116K reads/sec affordable, and choosing 302 over 301 deliberately gives up that caching at the browser so clicks remain measurable."
}
\`\`\`

**Recap:** estimate first (~1.2K writes/sec, ~116K reads/sec, ~20 TB/yr), generate keys with base62 of a counter/Snowflake to avoid collisions and hotspots, serve reads from Redis in front of a sharded KV store, and choose 301 vs 302 by whether you need click analytics.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Product says per-click analytics is the whole feature, and you sized reads at roughly 116K per second. Which pair of choices does that force?",
  "options": [
    {
      "label": "302 redirects so every click comes back to you, and a Redis cache absorbing the reads ahead of the sharded store",
      "correct": true,
      "feedback": "Right. 302 keeps clicks measurable by giving up browser and proxy caching, and the cache is what makes 116K reads per second affordable on a small fleet. Both halves are forced by the numbers, not chosen for taste."
    },
    {
      "label": "301 redirects so browsers cache the hop, with Redis in front of a sharded KV store",
      "feedback": "301 is the cheaper redirect and the better answer when raw throughput is the goal. But a cached permanent redirect never comes back, so the clicks you were asked to count disappear."
    },
    {
      "label": "302 redirects with a direct KV read on every click, since a cache would hide clicks from analytics",
      "feedback": "Analytics come from logging the redirect you serve, not from skipping the cache. Without the cache, the full 116K reads per second land on the store."
    },
    {
      "label": "301 redirects with no cache, since the browser cache already removes most of the load",
      "feedback": "It removes load only after the first click per browser, and it removes exactly the signal the product asked for. This trades the feature away to save infrastructure you can afford."
    }
  ],
  "reveal": "The shape of this answer is estimate, key generation, read path, redirect semantics. About 1.2K writes and 116K reads per second says the interesting problem is latency and throughput, not capacity. Base62 over a leased counter or a Snowflake id keeps generation collision free and hotspot free. Redis in front of a sharded KV store carries the reads because the mapping is immutable. And 301 versus 302 is a deliberate trade of free browser caching against clicks you can measure."
}
\`\`\`
`.trim()

const rateLimiterTeach = `
## Two things: the algorithm and distributed correctness

A rate limiter is a reusable component, so the interview is really about two things: which algorithm you pick and how you keep the counter correct across many stateless nodes. Get both right and the rest is response headers.

## Four algorithms

Fixed window counts requests per calendar minute: it is trivial (one counter, one TTL) but allows a 2x burst at the boundary, because 100 requests at 0:59 and another 100 at 1:00 both pass. Sliding window log keeps a timestamp per request and counts those within the last 60s: perfectly accurate but O(N) memory per key, which is expensive for hot keys. Sliding window counter approximates the log by weighting the previous window's count by how much of it overlaps the current one; it is the usual production choice because it kills the boundary burst with O(1) memory. Token bucket refills tokens at a fixed rate up to a capacity and spends one per request: it explicitly allows controlled bursts (up to the bucket size) while bounding the long-run rate, which is why AWS and Stripe use it. Leaky bucket smooths output to a constant rate (a queue drained at fixed speed), best when a downstream needs a steady feed rather than burst tolerance.

\`\`\`cswidget
{
  "type": "rate-limiter",
  "title": "Fixed window vs sliding window vs token bucket",
  "predictPrompt": {
    "question": "Steady traffic stays under 10 requests per 10-tick window. Then a burst of 20 extra requests lands on ticks 38 to 42, straddling the tick-40 window boundary. How many requests can fixed window admit in a single 10-tick span?",
    "options": [
      "Exactly 10, the limit is the limit",
      "About 18, nearly double the limit",
      "All 30 requests in the span",
      "None, bursts are always rejected"
    ]
  },
  "workedExample": "At the initial settings the limiter is fixed window with the burst off: 60 requests spread over 80 ticks never exceed 10 in any 10-tick window, so all 60 pass and the worst trailing window holds exactly 10. Toggle the boundary burst and 20 extra requests land on ticks 38 to 42, straddling the tick-40 boundary: fixed window admits 18 in a single trailing 10-tick span, close to the 2x boundary leak, the miniature version of 100 requests at 0:59 and another 100 at 1:00 both passing. Now switch algorithms: sliding window holds every trailing span at exactly 10, the accurate hard cap, while token bucket admits the most requests overall, 72 of 80, spending saved tokens on the burst and then throttling to its refill rate, the controlled burst tolerance that makes it the AWS and Stripe choice.",
  "algorithms": [
    "fixed-window",
    "sliding-window",
    "token-bucket"
  ],
  "limit": 10,
  "windowSize": 10,
  "seed": "per-key",
  "requests": 60,
  "horizon": 80,
  "burstAt": 40,
  "burstSize": 20,
  "caption": "One API key, scaled down: 10 per 10-tick window stands in for 100 req/min. Toggle the burst at the tick-40 boundary, then switch algorithms to compare burst tolerance (token bucket) against the accurate hard cap (sliding window counter)."
}
\`\`\`

**Interview nuance:** when asked to "enforce 100 req/min," clarify whether bursts are acceptable. If yes, token bucket. If you need a hard, accurate cap with cheap memory, sliding window counter. Naming the burst-vs-accuracy tradeoff is what separates a strong answer.

## Placement and distributed correctness

You can limit at the client (cheap, but untrusted), at the API gateway or a sidecar (Envoy) close to the app (low latency, shared policy), or in a dedicated rate-limit service (clean but adds a network hop per request). For a fleet of stateless servers the shared state must live somewhere both nodes can see, which is where Redis comes in.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Ten stateless app nodes sit behind a load balancer, and each enforces 100 requests per minute using its own in-process counter. What limit does one client actually get?",
  "options": [
    {
      "label": "Up to 1,000 per minute, because the load balancer spreads the client across all ten counters",
      "correct": true,
      "feedback": "Right. Local counters mean a client hitting N nodes gets up to N times the intended limit, which is why the counter has to live somewhere every node can see."
    },
    {
      "label": "100 per minute, because each node independently enforces the policy",
      "feedback": "Each node enforces it against the slice of traffic it sees. The client is not confined to one node, so it collects a fresh 100 request budget on each of them."
    },
    {
      "label": "10 per minute, because the limit is divided across the fleet",
      "feedback": "Nothing divides it: each node was configured with the full 100 and has no idea the other nine exist."
    }
  ]
}
\`\`\`

If each node keeps a local counter, a client hitting N nodes behind a load balancer gets up to N times the intended limit. So the counter is shared, usually in Redis. The naive \`GET\` then \`INCR\` is a race: two nodes read 99, both increment, both allow, and you overshoot. Fix it by making the check-and-increment atomic: either \`INCR\` first and compare the returned value (INCR is atomic and returns the new count), setting a TTL on first creation, or run a small Lua script that reads, decides, and writes in one round trip so no interleaving is possible. Sliding-window and token-bucket variants are almost always implemented as a single Lua script for exactly this reason.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your Redis is unreachable and the limiter cannot read the counter. The endpoint it protects is the login form. Fail open or fail closed?",
  "options": [
    {
      "label": "Fail closed and reject: unlimited login attempts is a worse outcome than a login outage",
      "correct": true,
      "feedback": "Right. The limiter on login exists to stop credential stuffing, so losing it turns a dependency outage into an abuse window. State the choice out loud and tie it to what the limiter protects."
    },
    {
      "label": "Fail open and allow: user experience always wins during a dependency outage",
      "feedback": "Fail open is the right default for a public read API where the limiter only protects capacity. On login it hands an attacker unmetered attempts, which is why the choice is per endpoint, not global."
    },
    {
      "label": "Neither: hold requests until Redis returns, so no traffic is wrongly admitted or rejected",
      "feedback": "Holding is just a slow failure, and the queue becomes its own outage. Every request still has to be admitted or rejected, so you are choosing fail open or fail closed whether you name it or not."
    }
  ]
}
\`\`\`

## Clock skew and the availability call

Clock skew: token buckets computed from wall-clock refill must tolerate small skew, so compute refill on the Redis side (single clock) rather than each app node's clock. And the availability call: if Redis is down, do you fail open (allow all traffic, protecting user experience but exposing the backend to overload) or fail closed (reject, protecting the backend but causing an outage)? Public read APIs often fail open; a login or payment endpoint being protected from abuse fails closed. State the choice.

The response contract: return HTTP 429 Too Many Requests with a \`Retry-After\` header and \`RateLimit-Limit\` / \`RateLimit-Remaining\` / \`RateLimit-Reset\` headers so clients can back off gracefully, and support per-tier quotas (free vs paid API keys).

\`\`\`
Node A, Node B  ->  Redis (atomic Lua): count = INCR key; if first, EXPIRE 60
                    if count > 100  -> 429 + Retry-After
                    else            -> allow
\`\`\`

**Recap:** pick the algorithm by burst tolerance (token bucket) vs accurate hard cap (sliding window counter), keep the shared counter in Redis with an atomic INCR+TTL or Lua script to avoid the read-modify-write race, compute time on the Redis side to dodge clock skew, and consciously choose fail-open vs fail-closed on a Redis outage.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The requirement is an accurate hard cap of 100 requests per minute per API key, enforced across 20 stateless nodes. What do you name?",
  "options": [
    {
      "label": "Sliding window counter in one Lua script against a shared Redis",
      "correct": true,
      "feedback": "Right, and every clause is load bearing. The sliding window counter kills the boundary burst at O(1) memory, so the cap is accurate. The shared Redis removes the per node divergence that handed one client twenty separate budgets. And evaluating the check and the increment inside one script removes the read modify write race between two nodes."
    },
    {
      "label": "Fixed window counters in Redis, since the shared store already removes the race",
      "feedback": "The shared store fixes divergence across nodes but not the boundary leak: a fixed window still admits close to twice the limit across a window edge, so the cap is not accurate."
    },
    {
      "label": "Token bucket in Redis, since it is what AWS and Stripe use",
      "feedback": "Token bucket is the right pick when controlled bursts are acceptable, which is why those APIs chose it. It deliberately admits a burst up to the bucket size, which an accurate hard cap forbids."
    },
    {
      "label": "Sliding window log kept on each node, since the log is exact",
      "feedback": "The log is exact per node, and per node state means every node grants its own 100. It also costs O(N) memory per key, which hurts most on exactly the hot keys you care about."
    }
  ],
  "reveal": "Two halves, always. The algorithm answers burst tolerance versus accuracy: token bucket for controlled bursts, sliding window counter for a cheap accurate cap, fixed window only when the roughly 2x boundary leak is acceptable. Distributed correctness answers where the counter lives: shared in Redis, mutated atomically by INCR with a TTL on first creation or by a Lua script, with refill time computed on the Redis side so no app node's clock matters. Then decide fail open versus fail closed per endpoint and return 429 with Retry-After."
}
\`\`\`
`.trim()

const uniqueIdGeneratorTeach = `
## Coordination-free is the whole point

The job is to hand out 64-bit, globally unique, roughly time-sortable IDs at millions per second without any node talking to any other node on the request path. Coordination-free is the whole point: a central sequence server would be a bottleneck and a single point of failure.

## The Snowflake bit budget

Snowflake's trick is to partition the ID space by bit budget so each node can mint IDs alone. A common 64-bit layout: 1 sign bit (unused, kept 0 so the number is positive), 41 bits of millisecond timestamp (since a custom epoch), 10 bits of machine/worker id, and 12 bits of a per-millisecond sequence counter. Do the arithmetic, because interviewers ask. 41 bits of ms is 2^41 milliseconds which is about 69 years of range from your epoch. 10 bits of worker id is 1,024 nodes. 12 bits of sequence is 4,096 ids per node per millisecond, which is about 4.096M ids per node per second, times 1,024 nodes is over 4 billion/sec of theoretical ceiling. You can rebudget the bits (fewer worker bits, more sequence) to match your fleet.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Why does the timestamp occupy the highest bits of the 64 rather than the lowest?",
  "options": [
    {
      "label": "Because integer comparison then compares time first, so sorting the raw ids sorts roughly by creation order",
      "correct": true,
      "feedback": "Right. Field order is the design decision here: put time in the high bits and a plain numeric sort is a time sort, which is what makes these good clustered primary keys."
    },
    {
      "label": "Because only the high bits have room for a 41 bit field",
      "feedback": "Bit width is a budget you allocate, and the field would fit anywhere in the 64. Position decides sort order, not capacity."
    },
    {
      "label": "Because the timestamp must be readable without decoding the rest of the id",
      "feedback": "You recover any field with a shift and a mask regardless of where it sits. The reason for the high bits is what integer ordering then means."
    }
  ]
}
\`\`\`

The ID is time-sortable because the timestamp occupies the high bits: sort the 64-bit integers and you get roughly chronological order, which is why these make excellent clustered primary keys. Within a single millisecond the sequence counter breaks ties and guarantees uniqueness; if the sequence overflows (more than 4,096 ids in one ms on one node), the generator waits (busy-spins) until the next millisecond.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A teammate says UUIDv4 is simpler: no worker ids, no clock handling, coordination free. You plan to use the id as the clustered primary key. What breaks?",
  "options": [
    {
      "label": "Random ids scatter inserts across the whole B-tree, fragmenting the index instead of appending to one end",
      "correct": true,
      "feedback": "Right, and this is the classic wrong turn. UUIDv4 is coordination free and unpredictable, but as a clustered key its randomness destroys insert locality. UUIDv7 and ULID exist to put a timestamp back in the high bits."
    },
    {
      "label": "Random 128 bit ids collide often enough to need a uniqueness check on insert",
      "feedback": "122 random bits make collisions negligible in practice, which is why UUIDv4 is safe to mint anywhere. The cost is what randomness does to the index, not to uniqueness."
    },
    {
      "label": "UUIDv4 cannot be generated without contacting a central service",
      "feedback": "It can be generated entirely locally, which is exactly its appeal. That is not where it fails."
    }
  ]
}
\`\`\`

**Interview nuance:** compare the alternatives out loud. UUIDv4 is random 128-bit: trivially coordination-free and unpredictable, but not sortable, and as a clustered index key its randomness scatters writes across the B-tree and fragments the index (the classic wrong turn). UUIDv7 and ULID fix that by putting a timestamp in the high bits (like Snowflake, but 128-bit and needing no worker-id assignment). DB auto-increment is perfectly sortable and compact but needs central coordination and does not shard. A ticket server (a dedicated ID service) centralizes allocation and reintroduces the bottleneck Snowflake exists to avoid. Snowflake wins when you want compact, sortable, coordination-free 64-bit keys and can manage worker ids.

## The clock is the weakness

Because the timestamp is in the high bits, if a node's clock jumps backward (NTP correction, VM migration), it could generate an ID with a smaller timestamp than one it already issued, risking a duplicate or breaking monotonicity. The standard defense: track the last-issued timestamp; if the current clock is behind it, refuse to issue IDs (throw, or wait) until the clock catches up, rather than emit a possibly-duplicate ID. Depend on NTP to keep clocks disciplined, but never trust it blindly.

Worker-id assignment is the other operational detail. Each node needs a unique 10-bit id. Assign it via a coordination service (ZooKeeper or etcd) that leases ids, or from a config/orchestrator on startup. Exhaustion (more than 1,024 live nodes) means you rebudget bits or recycle ids from dead nodes.

\`\`\`csdiagram
{
  "type": "table",
  "columns": ["Field", "Bits", "What it buys", "Runs out at"],
  "rows": [
    ["Sign", "1", "Always 0, so the id stays a positive signed 64-bit integer", "Reserved, never used"],
    ["Timestamp (ms since a custom epoch)", "41", "Rough sortability by creation time, because it occupies the high bits", "≈ 69 years after the epoch you pick"],
    ["Worker id", "10", "Uniqueness across nodes with no coordination per id", "1,024 simultaneously live nodes"],
    ["Sequence", "12", "Uniqueness within one millisecond on one node", "4,096 ids per node per millisecond"]
  ],
  "highlightCols": ["Runs out at"],
  "caption": "64 bits total, and the field ORDER is the design: timestamp sits highest so a plain integer sort is roughly a time sort. Move it lower and you keep uniqueness but lose sortability, which is the whole reason to prefer this over a random UUID."
}
\`\`\`

There is a real tension: sortability leaks information. A time-sortable ID reveals creation time and, worse, sequential-ish IDs let an attacker enumerate or estimate volume ("how many orders did they get today"). If unpredictability matters (public-facing resource ids), do not expose the raw sortable id; use a random UUID externally and keep the Snowflake id internal, or add a non-sequential public slug.

**Recap:** budget the 64 bits (timestamp high for sortability, worker id, sequence), which lets every node mint millions of unique IDs per second with zero coordination; defend the clock by refusing to issue on a backward jump; and remember that sortability trades away unpredictability, so hide raw ids when enumeration is a threat.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each id scheme by what it needs at the moment an id is minted.",
  "buckets": [
    "No coordination when the id is minted",
    "A central allocator in the request path"
  ],
  "items": [
    {
      "label": "Snowflake with a leased worker id",
      "bucket": "No coordination when the id is minted",
      "feedback": "The worker id is leased once at startup from etcd or ZooKeeper. After that the node mints ids alone from its own clock and sequence."
    },
    {
      "label": "UUIDv4",
      "bucket": "No coordination when the id is minted",
      "feedback": "Pure randomness, generated locally. It pays for that with no sortability and a fragmented clustered index."
    },
    {
      "label": "ULID or UUIDv7",
      "bucket": "No coordination when the id is minted",
      "feedback": "Timestamp in the high bits like Snowflake, but 128 bits wide, so it needs no worker id assignment at all."
    },
    {
      "label": "Database AUTO_INCREMENT",
      "bucket": "A central allocator in the request path",
      "feedback": "Perfectly sortable and compact, and every insert has to go through the one sequence, which is what stops it sharding."
    },
    {
      "label": "A dedicated ticket server",
      "bucket": "A central allocator in the request path",
      "feedback": "It centralizes allocation, which reintroduces the bottleneck and the single point of failure that Snowflake exists to remove."
    }
  ],
  "reveal": "The whole scheme is a bit budget traded against three properties. Timestamp high buys rough sortability, worker id buys coordination free minting, sequence buys uniqueness within a millisecond. The clock is the weak point, so track the last issued timestamp and refuse to issue on a backward jump rather than risk a duplicate. And sortability leaks: a time ordered id reveals creation time and invites enumeration, so keep the Snowflake id internal and expose a random public slug when that matters."
}
\`\`\`
`.trim()

const typeaheadTeach = `
## A latency problem in a data-structure costume

Typeahead is a latency problem wearing a data-structure costume. The user types a prefix and expects the top 10 completions to appear within about 100ms, and they fire a request on nearly every keystroke, so the read path has to be brutally fast and the load has to be cut before it ever reaches your servers.

## What is typeahead?

Typeahead, also called autocomplete or type-ahead search, is the feature that offers a ranked list of likely completions while a user is still typing into a search box, refreshing that list on each keystroke so they can pick a suggestion instead of finishing the query themselves. The input is whatever prefix has been typed so far and the output is the top few completions for it, ordered by how likely each one is to be what the user meant rather than alphabetically. It is not search itself: typeahead predicts the query and search answers it, which is why a typeahead index stores popular query strings rather than documents. The bar it has to clear is a ranked list back in roughly 100ms on every keystroke, and that budget is what turns a familiar UI affordance into a system design problem.

## The trie with cached top-k

The core structure is a trie (prefix tree): each node is a character, and a path from the root spells a prefix. The naive trie lookup walks to the prefix node, then does a subtree traversal to find all completions and rank them, which is too slow for a hot prefix with thousands of descendants. The production trick is to cache the top-k completions at every node. When you reach the node for "ne", the 10 best completions ("netflix", "news", "nest", ...) are already stored right there, so serving is O(length of prefix), single-digit milliseconds, no subtree walk. This precomputation is done offline or incrementally, not per request.

\`\`\`cswidget
{
  "type": "steps",
  "title": "Trie walk with cached top-k",
  "frames": [
    {
      "note": "Each trie node is one character; the path from the root spells the prefix. The production trick: every node carries its precomputed top suggestions with scores baked in offline. Typing 'c' walks one hop and the ranked list is already sitting at the node.",
      "rows": [
        {
          "label": "path",
          "cells": [
            {
              "text": "root",
              "state": "dim"
            },
            {
              "text": "c",
              "state": "active"
            }
          ]
        },
        {
          "label": "node 'c' top-k",
          "cells": [
            {
              "text": "car 95"
            },
            {
              "text": "cat 91"
            },
            {
              "text": "code 88"
            }
          ]
        }
      ]
    },
    {
      "note": "Keystroke 'a' extends the walk to the 'ca' node: two hops for a 2-char prefix, O(prefix length). Serving is just a read of that node's cached list, single-digit milliseconds, with zero ranking at request time.",
      "rows": [
        {
          "label": "path",
          "cells": [
            {
              "text": "root",
              "state": "dim"
            },
            {
              "text": "c",
              "state": "dim"
            },
            {
              "text": "a",
              "state": "active"
            }
          ]
        },
        {
          "label": "node 'ca' top-k",
          "cells": [
            {
              "text": "car 95"
            },
            {
              "text": "cat 91"
            },
            {
              "text": "cake 75"
            }
          ]
        }
      ]
    },
    {
      "note": "Keystroke 't' lands on the 'cat' node with its own cached list. Every keystroke is one more hop down the active path; the cost never depends on how many completions live below the node.",
      "rows": [
        {
          "label": "path",
          "cells": [
            {
              "text": "root",
              "state": "dim"
            },
            {
              "text": "c",
              "state": "dim"
            },
            {
              "text": "a",
              "state": "dim"
            },
            {
              "text": "t",
              "state": "active"
            }
          ]
        },
        {
          "label": "node 'cat' top-k",
          "cells": [
            {
              "text": "cat 91"
            },
            {
              "text": "catalog 64"
            },
            {
              "text": "catering 52"
            }
          ]
        }
      ],
      "predict": {
        "question": "Why store top-k at every node instead of computing it per query?",
        "options": [
          "A hot prefix has thousands of descendants; a subtree walk per keystroke blows the 100ms budget",
          "The trie has no child pointers, so it cannot be walked downward",
          "Per-node lists use less memory than the trie itself"
        ]
      }
    },
    {
      "note": "The naive lookup walks the whole subtree under the prefix node and ranks thousands of completions on every keystroke: too slow for a hot prefix. Caching top-k per node moves that heap-selection into the offline build (nightly rebuild plus incremental updates for trending terms), so a query only ever reads a list.",
      "rows": [
        {
          "label": "naive per query",
          "cells": [
            {
              "text": "walk 1000s of nodes",
              "state": "dropped"
            },
            {
              "text": "rank at request time",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "cached top-k",
          "cells": [
            {
              "text": "read k list",
              "state": "active"
            },
            {
              "text": "O(prefix), few ms",
              "state": "active"
            }
          ]
        },
        {
          "label": "offline build",
          "cells": [
            {
              "text": "heap over subtree",
              "state": "new"
            },
            {
              "text": "nightly rebuild",
              "state": "new"
            },
            {
              "text": "trending updates",
              "state": "new"
            }
          ]
        }
      ]
    }
  ],
  "caption": "Typing 'ca' then 'cat': each keystroke is one hop, and the ranking was paid for offline."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A candidate proposes a SQL table of terms with an index on the term column, queried with a prefix pattern on every keystroke. Why is that rejected?",
  "options": [
    {
      "label": "Ranking every match, on every keystroke, at real QPS",
      "correct": true,
      "feedback": "Right. The index makes the prefix match itself cheap, and the index is not what fails. What it cannot make cheap is scoring thousands of matches inside the request, then doing that again for every character every user types. The 100ms budget is spent on ranking work that should have been paid offline."
    },
    {
      "label": "A B-tree index cannot answer a prefix match at all",
      "feedback": "It can. A pattern anchored at the start of the string is exactly a B-tree range scan, which is why the idea is tempting. Feasibility is not the objection, cost under load is."
    },
    {
      "label": "SQL cannot store the frequency and recency scores that ranking needs",
      "feedback": "A score column is trivial. The problem is that ranking has to happen inside the request, on every keystroke, instead of once offline."
    }
  ]
}
\`\`\`

**Interview nuance:** the single most common wrong turn is \`SELECT ... WHERE term LIKE 'prefix%'\` against a SQL table on every keystroke. Even with an index, ranking and the per-keystroke QPS blow the 100ms budget under load. Say why a prefix tree with cached top-k beats it, and mention that a search engine (Elasticsearch completion suggester, which is FST/trie-backed) is the buy-not-build version.

## Ranking and freshness

Completions are scored by some blend of frequency (how often this query is issued), recency (trending terms weighted up via time decay), and personalization (this user's or this cohort's history). The scores are baked into the cached top-k per node, so ranking cost is paid offline. Weighted tries store the aggregate score alongside each terminal so the top-k selection is a simple heap over the subtree during the offline build.

Keeping suggestions fresh means updating from a stream. Query logs flow through Kafka; you either rebuild the trie in batch (hourly/daily) from aggregated counts, which is simple and consistent but stale by up to the batch interval, or apply incremental updates so a newly trending term (a breaking-news query) appears within minutes, at the cost of a more complex mutable structure. Most systems do a nightly full rebuild plus a fast incremental layer for trending terms.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your trie serves a prefix in about 5ms. Does the design still need client debouncing and an edge cache?",
  "options": [
    {
      "label": "Yes: the load is request count, not per request cost, and a small set of short prefixes carries most of it",
      "correct": true,
      "feedback": "Right. Typing one seven letter word can fire seven requests per user, and hot prefixes repeat across everyone, so debouncing and edge caching remove most origin load before the trie is ever consulted."
    },
    {
      "label": "No: at 5ms a lookup the origin can absorb the traffic, and debouncing only adds perceived latency",
      "feedback": "Per request latency is not the constraint. The fleet has to be sized for every keystroke of every user, and the debounce collapses seven requests into one or two without the user noticing."
    },
    {
      "label": "No: caching prefixes would serve stale suggestions, which the product cannot accept",
      "feedback": "Suggestions tolerate short staleness, which is why a short TTL at the edge is safe. That is a trade you make deliberately, and it is what makes the hot prefixes free."
    }
  ]
}
\`\`\`

## The load-shedding layer

Debounce on the client: wait ~150-300ms after the last keystroke before firing, so "netflix" sends one or two requests, not seven. Cache aggressively: the client caches results per prefix (typing then backspacing hits the cache), and because the same short prefixes are wildly popular, serve them from a CDN/edge cache with a short TTL. A huge fraction of traffic is a small set of hot prefixes, so edge caching plus debouncing removes most of the origin load before the trie is even consulted.

Finally, the quality details: fuzzy matching and typo tolerance (edit-distance or an n-gram index so "netlfix" still suggests "netflix"), and a profanity/safety filter so suggestions never surface offensive or unsafe completions.

\`\`\`
key "ne" -> trie walk n->e (O(2)) -> node holds cached top-10:
            [netflix, news, nest, netgear, ...]  -> return, ~few ms
   (before origin: client debounce 200ms + edge cache on hot prefixes)
\`\`\`

**Recap:** serve completions from a trie with top-k cached per node so lookup is O(prefix length) with no subtree walk, rank offline by frequency/recency/personalization, refresh from a Kafka stream (batch rebuild plus incremental for trending), and cut origin load with client debouncing and edge caching, never a per-keystroke SQL LIKE query.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A breaking news query starts trending at 9am. Your trie is rebuilt nightly from aggregated query logs. What do you add so the term surfaces within minutes?",
  "options": [
    {
      "label": "An incremental update layer over the nightly rebuild",
      "correct": true,
      "feedback": "Right. Most systems run both: the nightly full rebuild gives a simple, consistent base, and the incremental path writes a spiking term into the cached top-k of the affected nodes within minutes rather than tomorrow."
    },
    {
      "label": "Rebuild the whole trie hourly instead of nightly",
      "feedback": "It narrows the staleness window at a large and constant cost, and a term that spikes at 9:05 still waits most of an hour. The mutable incremental layer is what buys minutes."
    },
    {
      "label": "Rank at request time instead, so the newest scores are always used",
      "feedback": "That is the subtree walk the cached top-k exists to avoid, and it puts ranking cost back inside the 100ms budget on every keystroke."
    }
  ],
  "reveal": "Typeahead is a latency budget defended in three places. The structure is a trie whose every node already holds its top-k, so a lookup is O(prefix length) with no subtree walk. The ranking (frequency, recency, personalization) is paid offline, refreshed by a nightly rebuild plus an incremental layer for trending terms. And most of the traffic never reaches any of it, because client debouncing and edge caching on hot prefixes shed it first. The answer that fails is a per keystroke SQL prefix query."
}
\`\`\`
`.trim()

const newsFeedTeach = `
## The whole interview hinges on "fan-out"

A home timeline shows a user the recent posts of everyone they follow, newest first, in under 200ms. The entire problem is a read-vs-write cost tradeoff, and the whole interview hinges on the word "fan-out."

## Fan-out-on-write (push)

When Alice posts, you immediately write that post id into the timeline cache of every follower. Reads become trivial: a follower's timeline is a precomputed list you slice with a cursor. The cost moves to write time. If Alice has 200 followers, one post is 200 small writes. That is fine until Alice is a celebrity with 50M followers, at which point a single tweet is 50M writes, a multi-minute fan-out that hammers the cache and delays delivery.

## Fan-out-on-read (pull)

Store each post once keyed by author. When Bob loads his timeline, fetch the recent posts of everyone Bob follows and merge them at read time. Writes are cheap (one insert). Reads are expensive: if Bob follows 2,000 accounts you issue a scatter-gather across 2,000 authors and merge-sort on every timeline load. That blows the 200ms budget for active users.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Push dies on celebrities, and pull dies on users who follow thousands of accounts. What does the senior answer do?",
  "options": [
    {
      "label": "Push to normal followers, and pull only the handful of celebrity accounts a reader follows, merging them in at read time",
      "correct": true,
      "feedback": "Right. Both costs are bounded: write amplification is capped by the celebrity threshold, and the read time merge stays small because most users follow only a few celebrities."
    },
    {
      "label": "Pull for everyone, and cache the merged timeline so the scatter-gather only happens once",
      "feedback": "The cache helps repeat loads, but every new post invalidates it, so an active user following 2,000 accounts still pays the 2,000 way merge constantly."
    },
    {
      "label": "Push for everyone, but rate limit how often high follower accounts can post",
      "feedback": "That reshapes the product to fit the architecture, and one celebrity post is still 50M writes whenever it is allowed."
    },
    {
      "label": "Push for everyone, but shard the timeline cache further so the writes spread out",
      "feedback": "Sharding spreads where the writes land, it does not reduce how many there are. 50M timeline writes for one post is the same 50M writes on more machines."
    }
  ]
}
\`\`\`

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

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Hybrid fan-out: push for normal authors, pull for celebrities",
  "reveal": "all",
  "nodes": [
    {
      "id": "alice",
      "label": "Alice posts",
      "kind": "client"
    },
    {
      "id": "posts",
      "label": "Post store (bodies stored once, partitioned by author)",
      "kind": "db"
    },
    {
      "id": "fanout",
      "label": "Fan-out worker (skips authors above the 100K celebrity threshold)",
      "kind": "service"
    },
    {
      "id": "timelines",
      "label": "timeline:Bob (Redis list of post ids, capped to a few hundred)",
      "kind": "cache"
    },
    {
      "id": "celeb",
      "label": "Celebrity pull (recent posts of the celebs Bob follows, briefly cached)",
      "kind": "cache"
    },
    {
      "id": "read",
      "label": "Timeline read: merge, rank, hydrate bodies",
      "kind": "service"
    },
    {
      "id": "bob",
      "label": "Bob's timeline page (cursor, not OFFSET)",
      "kind": "client"
    }
  ],
  "edges": [
    {
      "from": "alice",
      "to": "posts",
      "kind": "sync",
      "label": "write the body once"
    },
    {
      "from": "alice",
      "to": "fanout",
      "kind": "async",
      "label": "post event"
    },
    {
      "from": "fanout",
      "to": "timelines",
      "kind": "async",
      "label": "push post id to each normal follower"
    },
    {
      "from": "posts",
      "to": "celeb",
      "kind": "sync",
      "label": "celebrities are never pushed"
    },
    {
      "from": "timelines",
      "to": "read",
      "kind": "sync",
      "label": "precomputed ids"
    },
    {
      "from": "celeb",
      "to": "read",
      "kind": "sync",
      "label": "merged in at read time"
    },
    {
      "from": "posts",
      "to": "read",
      "kind": "sync",
      "label": "hydrate bodies in one batched lookup"
    },
    {
      "from": "read",
      "to": "bob",
      "kind": "sync"
    }
  ],
  "groups": [
    {
      "id": "write_path",
      "label": "Write path (fan-out on write)",
      "nodes": [
        "alice",
        "fanout",
        "timelines"
      ]
    },
    {
      "id": "read_path",
      "label": "Read path (fan-out on read)",
      "nodes": [
        "celeb",
        "read",
        "bob"
      ]
    }
  ],
  "caption": "Timelines hold post ids, never bodies, which is why a delete is a tombstone on one row rather than a chase through 50M cached copies."
}
\`\`\`

## Storage, ranking, deletes

Posts live once in a partitioned store (Cassandra or a sharded SQL, partitioned by post id or author). Per-user timelines are Redis lists or sorted sets of post ids (not full bodies), capped to a few hundred entries. You hydrate bodies in a second batched lookup. Pagination uses an opaque cursor (last post id or a score), never \`OFFSET\`, which degrades linearly.

Chronological is a sorted set scored by timestamp. ML-ranked timelines change the shape: fan-out now delivers candidates, and a ranking service scores them per request using features (author affinity, recency, engagement). You keep fan-out as candidate generation and add a scoring layer.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Alice deletes a post that already fanned out into 50M follower timelines. What has to happen?",
  "options": [
    {
      "label": "Nothing in the timelines: they hold post ids, so a tombstone on the single post makes hydration skip it",
      "correct": true,
      "feedback": "Right, and this is exactly why timelines store ids and not bodies. The source of truth stays single, so deletes and edits are O(1) instead of a 50M row chase."
    },
    {
      "label": "A background job removes the id from all 50M cached timelines before the post can disappear",
      "feedback": "That is the work the indirection exists to avoid. You may lazily trim dead ids when a timeline is next written, but the delete itself must not depend on it."
    },
    {
      "label": "The post body in every timeline entry is overwritten with a deleted placeholder",
      "feedback": "Timelines never held the body. They hold ids, and bodies are hydrated in a second batched lookup, which is what makes this cheap."
    }
  ]
}
\`\`\`

Because post bodies are stored once and timelines hold only ids, a delete is a tombstone on the post; readers filter tombstoned ids at hydration. You do not chase 50M cached copies. This is exactly why timelines store ids, not bodies: it keeps the source of truth single and makes deletes and edits O(1).

**Interview nuance:** the consistency-vs-freshness tradeoff. Fan-out-on-write means a follower may see a post seconds after it is created (async fan-out lag). That is acceptable for a feed. Do not promise read-after-write on someone else's timeline.

**Recap:** use a hybrid, push posts to normal followers' timelines and pull celebrities at read time, store post ids not bodies so deletes stay cheap, and paginate by cursor.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A user posts, then immediately asks why a friend has not seen it. What is the honest guarantee?",
  "options": [
    {
      "label": "Timelines are eventually consistent: fan-out is async, so a follower may see the post seconds later",
      "correct": true,
      "feedback": "Right. Async fan-out is what makes the write path survivable, and a few seconds of lag on someone else's timeline is an acceptable trade for a feed."
    },
    {
      "label": "Read-after-write applies, because the post is written to follower timelines before the response returns",
      "feedback": "Doing the fan-out inline would put hundreds of timeline writes inside the request, and 50M of them for a celebrity. Never promise read-after-write on someone else's timeline."
    },
    {
      "label": "The friend will see it on their next load, because timelines are computed at read time",
      "feedback": "That describes pure pull. In the hybrid, a normal author's post is pushed asynchronously, so the arrival time depends on the fan-out worker, not on when the friend refreshes."
    }
  ],
  "reveal": "Fan-out is the whole interview. Push makes reads a cursor slice and moves the cost to write time; pull makes writes one insert and moves the cost to a scatter-gather at read time; the hybrid picks per author using a follower threshold. Underneath, posts live once in a partitioned store and timelines hold only ids, capped to a few hundred, hydrated in a batch, paginated by an opaque cursor rather than OFFSET. That indirection is what makes deletes a tombstone and lets a ranking layer sit on top of fan-out as candidate generation."
}
\`\`\`
`.trim()

const instagramTeach = `
## A fan-out timeline bolted onto a media pipeline

Instagram is a fan-out timeline (you already know that half from the news-feed lesson) bolted onto a media pipeline. The new material is how you store and serve photos and videos.

## Split blob from metadata

The single most important decision: photos go in object storage (S3, GCS), and the database stores only metadata plus a pointer (the object key or URL). A post row is \`(post_id, user_id, caption, media_key, created_at, like_count)\`, a few hundred bytes. The 3MB photo never enters the database. Storing image bytes in Postgres or MySQL bloats the row store, wrecks buffer-cache hit rates, makes backups enormous, and cannot be served from a CDN. The metadata DB (users, posts, follows) can be a partitioned relational store or a KV store; the media store is separate and optimized for large immutable blobs.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The client has a 3MB photo. The obvious flow is client uploads to your app server, and the app server writes it to S3. What breaks at scale?",
  "options": [
    {
      "label": "Every byte crosses your app tier, so the fleet has to be sized for media bandwidth rather than for request volume",
      "correct": true,
      "feedback": "Right. The bytes move twice and your app servers become a throughput bottleneck. The fix is a presigned URL: the app tier does auth and hands out a short lived signed URL, and S3 absorbs the bytes."
    },
    {
      "label": "S3 rejects object writes that do not originate from the end user's browser",
      "feedback": "S3 accepts a server side write without complaint, which is why this design gets built. The objection is cost and throughput through your own tier."
    },
    {
      "label": "The photo would have to pass through the metadata database on its way to S3",
      "feedback": "Nothing forces that, and you would never do it. The problem is bandwidth through the app tier, not where metadata lives."
    }
  ]
}
\`\`\`

## Presigned uploads

The naive path streams the photo through your app servers to S3, which doubles bandwidth and makes your app tier a throughput bottleneck. Instead the client asks the app server for a presigned S3 URL, then uploads the bytes directly to S3. Your app servers never touch the image bytes. The app tier does auth and issues a short-lived signed URL; S3 absorbs the upload.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Upload path: the bytes never cross the app tier",
  "nodes": [
    {
      "id": "client",
      "label": "Client (3MB photo)",
      "kind": "client"
    },
    {
      "id": "app",
      "label": "App tier (auth, returns a short lived presigned PUT URL and media_key)",
      "kind": "service"
    },
    {
      "id": "s3",
      "label": "Object store (S3): original bytes plus every variant",
      "kind": "db"
    },
    {
      "id": "meta",
      "label": "Metadata DB (post_id, user_id, caption, media_key, like_count)",
      "kind": "db"
    },
    {
      "id": "queue",
      "label": "S3 event queue",
      "kind": "queue"
    },
    {
      "id": "worker",
      "label": "Transcode worker (1080w, 640w, 320w, square thumb)",
      "kind": "service"
    },
    {
      "id": "feed",
      "label": "Hybrid fan-out (push post ids to normal followers)",
      "kind": "service"
    },
    {
      "id": "cdn",
      "label": "CDN (immutable media, long TTL, versioned key)",
      "kind": "cdn"
    },
    {
      "id": "viewer",
      "label": "Viewer (requests the resolution that fits the screen)",
      "kind": "client"
    }
  ],
  "edges": [
    {
      "from": "client",
      "to": "app",
      "kind": "sync",
      "label": "I want to upload"
    },
    {
      "from": "client",
      "to": "s3",
      "kind": "sync",
      "label": "PUT bytes directly"
    },
    {
      "from": "app",
      "to": "meta",
      "kind": "sync",
      "label": "post row, a few hundred bytes"
    },
    {
      "from": "s3",
      "to": "queue",
      "kind": "async",
      "label": "object created event"
    },
    {
      "from": "queue",
      "to": "worker",
      "kind": "async"
    },
    {
      "from": "worker",
      "to": "s3",
      "kind": "feedback",
      "label": "write variant keys back"
    },
    {
      "from": "worker",
      "to": "meta",
      "kind": "sync",
      "label": "mark post ready"
    },
    {
      "from": "worker",
      "to": "feed",
      "kind": "async",
      "label": "trigger fan-out"
    },
    {
      "from": "s3",
      "to": "cdn",
      "kind": "sync",
      "label": "origin fetch, then cached at the edge"
    },
    {
      "from": "cdn",
      "to": "viewer",
      "kind": "sync",
      "label": "over 90 percent of reads never touch origin"
    }
  ],
  "stages": [
    {
      "adds": [
        "client",
        "app",
        "s3"
      ],
      "note": "Sizing the app fleet for media bandwidth rather than request volume is the failure to avoid, so the app tier only authenticates and hands back a presigned URL, and the bytes go straight to object storage."
    },
    {
      "adds": [
        "meta"
      ],
      "note": "The feed has to filter and sort posts, which needs a row store, so the database keeps ids, caption and a media key and never the image bytes that would wreck its buffer cache."
    },
    {
      "adds": [
        "queue",
        "worker"
      ],
      "note": "Clients need a resolution that fits their screen and the uploader must not wait for it, so an object created event drives variant generation asynchronously."
    },
    {
      "adds": [
        "feed"
      ],
      "note": "A post is only worth delivering once its variants exist, so the worker marks it ready and that is what triggers fan-out."
    },
    {
      "adds": [
        "cdn",
        "viewer"
      ],
      "note": "Media is immutable and read far more than written, so long TTLs at the edge are what keep read bandwidth off the origin."
    }
  ],
  "caption": "One rule applied everywhere: bytes go in object storage, the database gets a pointer."
}
\`\`\`

## Async variants, CDN, feed reuse, counters

On upload you generate multiple resolutions and a thumbnail (1080w, 640w, 320w, a small square thumb) via a worker triggered by an S3 event through a queue. This is async so the user is not blocked. Clients request the resolution that fits their screen, saving bandwidth.

Media is immutable and read far more than written, the perfect CDN workload. Serve every image and thumbnail through a CDN (CloudFront, Fastly) so 90%+ of reads hit an edge cache near the user and never touch origin. Because media is immutable you set long TTLs and use a versioned key if you ever replace it.

The timeline is the same hybrid fan-out: push post ids to normal followers' timelines, pull for celebrity accounts, store ids not bodies, hydrate metadata in a batch, and resolve media keys to CDN links at render time.

Likes and comment counts on a viral post get millions of increments. A single \`UPDATE ... SET like_count = like_count + 1\` row is a hot-row contention nightmare. Shard the counter across N sub-counters and sum them, or maintain an approximate count in Redis flushed periodically. Exact like counts are not worth serializing every write.

**Interview nuance:** estimate to show you can size it. 100M photos/day at 2MB average is 200TB/day of new media before replication, so ~600TB/day at 3x replication, or roughly 250 to 300TB/day erasure coded (parity shards instead of whole copies), which is the choice you make for cold media. Read bandwidth dwarfs write bandwidth, which is the whole reason a CDN is non-negotiable.

**Recap:** metadata DB plus object storage plus CDN, upload direct to S3 with presigned URLs, generate resolution variants async, reuse hybrid fan-out for the feed, and never store image bytes in the database.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each piece of a post into where it is stored.",
  "buckets": [
    "Metadata database",
    "Object store behind a CDN"
  ],
  "items": [
    {
      "label": "The caption text",
      "bucket": "Metadata database",
      "feedback": "A few hundred bytes that queries filter and sort on, which is exactly what the row store is for."
    },
    {
      "label": "The 3MB original photo",
      "bucket": "Object store behind a CDN",
      "feedback": "Large, immutable, and read far more than written. In the database it bloats the row store, wrecks buffer cache hit rates, and can never be served from an edge."
    },
    {
      "label": "The 320 pixel thumbnail generated after upload",
      "bucket": "Object store behind a CDN",
      "feedback": "Every resolution variant is another immutable blob, produced asynchronously by a worker off an S3 event and served from the edge."
    },
    {
      "label": "The media key that points at the photo",
      "bucket": "Metadata database",
      "feedback": "The pointer is metadata: small, fetched with the post, and the reason the post row stays a few hundred bytes."
    },
    {
      "label": "post id, user id, created at",
      "bucket": "Metadata database",
      "feedback": "The identifiers the feed queries and joins on."
    }
  ],
  "reveal": "Instagram is the news feed you already know bolted onto a media pipeline, and the media half is one rule applied everywhere: bytes go in object storage, the database gets a pointer. That rule is what lets uploads bypass your app tier through a presigned URL, lets variants be generated asynchronously by a worker, lets a CDN serve better than 90 percent of reads from an edge with long TTLs because media is immutable, and lets the feed reuse hybrid fan-out over ids. The one place it does not help is the like counter, where a single hot row needs sharded sub counters or an approximate count in Redis."
}
\`\`\`
`.trim()

const chatMessagingTeach = `
## Real-time delivery at massive concurrency

Chat is a real-time delivery problem at massive concurrency. WhatsApp famously ran millions of connections per server. The interview lives in four areas: the connection layer, ordering, offline delivery, and group fan-out.

## Connection layer

Messaging needs the server to push to the client the instant a message arrives, so you hold persistent connections, WebSocket (or MQTT, which Facebook Messenger adopted for battery efficiency on mobile; WhatsApp itself ran a customized binary variant of XMPP, an XML-based messaging protocol). A tier of connection servers each hold hundreds of thousands to millions of open sockets. A user is connected to exactly one connection server at a time; a routing layer (a session registry in Redis mapping \`user_id -> connection_server\`) knows where each user is. When Alice sends to Bob, the system looks up Bob's connection server and forwards the message there over an internal pub/sub backplane (Kafka or a Redis pub/sub / a dedicated message bus).

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Routing a message to whichever server holds the recipient",
  "reveal": "all",
  "nodes": [
    {
      "id": "alice",
      "label": "Alice's device",
      "kind": "client"
    },
    {
      "id": "srv_a",
      "label": "Connection server A (hundreds of thousands of open WebSockets)",
      "kind": "service"
    },
    {
      "id": "registry",
      "label": "Session registry (Redis): user_id to connection server",
      "kind": "cache"
    },
    {
      "id": "backplane",
      "label": "Pub/sub backplane (Kafka, or a dedicated message bus)",
      "kind": "queue"
    },
    {
      "id": "srv_b",
      "label": "Connection server B",
      "kind": "service"
    },
    {
      "id": "bob",
      "label": "Bob's device: connected to exactly one server at a time",
      "kind": "client"
    },
    {
      "id": "inbox",
      "label": "Per-user inbox (Cassandra or HBase, partitioned by conversation or recipient)",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "alice",
      "to": "srv_a",
      "kind": "sync",
      "label": "WebSocket, with a client-generated message id"
    },
    {
      "from": "srv_a",
      "to": "inbox",
      "kind": "sync",
      "label": "persisted before the sent acknowledgement"
    },
    {
      "from": "srv_a",
      "to": "registry",
      "kind": "sync",
      "label": "where is Bob?"
    },
    {
      "from": "registry",
      "to": "backplane",
      "kind": "sync",
      "label": "Bob is on server B"
    },
    {
      "from": "backplane",
      "to": "srv_b",
      "kind": "async",
      "label": "route the message"
    },
    {
      "from": "srv_b",
      "to": "bob",
      "kind": "sync",
      "label": "push, if he is online"
    },
    {
      "from": "inbox",
      "to": "bob",
      "kind": "async",
      "label": "on reconnect: everything since his last acknowledged sequence number"
    }
  ],
  "caption": "The registry is what makes a push possible at all, because a user is on exactly one connection server and the sender is almost never on the same one. When Bob is offline there is nothing to push to, so the inbox is the delivery path."
}
\`\`\`

## Ordering and dedup

Global ordering across all messages is neither needed nor affordable. What users need is per-conversation ordering: messages within one chat appear in a consistent order. Assign each message a per-conversation monotonic sequence number (or a Snowflake-style time-sortable id scoped to the conversation). Clients sort by it. Because networks retry, messages carry a client-generated message id so the server (and other clients) can dedup: if the same message id arrives twice, drop the duplicate. This makes sends idempotent.

## Delivery, offline, groups

Delivery is a state machine per message: sent (server accepted), delivered (recipient's device ACKed receipt), read (recipient opened the chat). Each transition is an ACK flowing back that updates message state and notifies the sender.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Bob's phone is offline when Alice sends. There is no socket to push to. What does the system do?",
  "options": [
    {
      "label": "Persist it in Bob's durable inbox until he reconnects",
      "correct": true,
      "feedback": "Right, this is store and forward: the send succeeds even though delivery cannot. When the device comes back it pulls everything after its last acknowledged sequence number, which is what lets it resume at exactly the right point instead of refetching the conversation."
    },
    {
      "label": "Retry the push every few seconds until Bob's device reappears",
      "feedback": "There is nothing to push to, so each retry is wasted work, and a device offline for hours would lose the message entirely when the retries give up."
    },
    {
      "label": "Return an error to Alice so she can resend once Bob is back",
      "feedback": "That pushes the system's job onto the sender, and Alice has no way to know when Bob returns. The send is accepted; delivery is a later state transition."
    }
  ]
}
\`\`\`

If Bob is offline, you cannot push. Persist the message in Bob's per-user inbox / mailbox (a durable store), and when Bob reconnects, his device pulls everything since its last acknowledged sequence number. The message store is a wide-column database (Cassandra / HBase) partitioned by conversation or by recipient, which suits the append-heavy, time-ordered access pattern. Messages are typically deleted or aged out after delivery to all devices.

A group message is written once and delivered to each member: look up each member's connection server (or inbox if offline) and forward. For small groups this is a simple loop. For very large channels (Telegram-style broadcast channels with millions of members) you need hierarchical distribution: shard the member list, fan out through layers of workers rather than one server pushing millions of copies, similar to the celebrity timeline problem.

Multi-device sync means a message must reach all of a user's devices and read state must converge, so the "recipient" is really a set of device sessions. End-to-end encryption (the Signal protocol) means the server routes ciphertext it cannot read; the server just stores and forwards opaque blobs.

**Interview nuance:** when asked about ordering, say "per-conversation ordering via sequence numbers," never "global ordering." Claiming a global total order across a billion users is the classic red flag.

**Recap:** hold WebSocket connections on a connection tier with a session registry, order per-conversation with sequence numbers, dedup by client message id, store-and-forward for offline users, and fan out groups (hierarchically for huge channels).

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The interviewer asks what ordering guarantee you provide for messages. What do you claim?",
  "options": [
    {
      "label": "Per conversation ordering, from a monotonic sequence number scoped to the conversation, which clients sort on",
      "correct": true,
      "feedback": "Right. That is the only ordering a user can observe, and it is affordable because the sequence is scoped to one chat rather than to the whole system."
    },
    {
      "label": "A global total order across all messages, assigned by a single sequencer service",
      "feedback": "This is the classic red flag. A global sequencer across a billion users is a bottleneck you do not need, because no user can observe order across conversations they are not in."
    },
    {
      "label": "Ordering by the server receive timestamp, which is close enough across the fleet",
      "feedback": "Connection servers have skewed clocks, so two messages in one chat can be ordered differently by different readers. The sequence number exists precisely to remove that ambiguity."
    }
  ],
  "reveal": "Four areas, and the answer names all four. A connection tier holds the persistent sockets, with a session registry mapping each user to their connection server and a pub/sub backplane routing between them. Ordering is per conversation via sequence numbers, and a client generated message id makes retried sends idempotent. Offline users are handled by store and forward into a durable per user inbox in a wide column store, pulled from the last acknowledged sequence on reconnect. Group sends fan out per member, and huge broadcast channels need hierarchical distribution for the same reason a celebrity timeline does."
}
\`\`\`
`.trim()

const notificationSystemTeach = `
## A reusable delivery backbone

A notification system is a reusable delivery backbone: something happens (a like, a shipped order, a fraud alert) and the user must be reached across push, SMS, email, and in-app, respecting their preferences, without ever double-sending. The design is a pipeline, and the interview probes channel abstraction, idempotency, and preferences.

## Channel abstraction with provider adapters

Do not scatter APNs, FCM, Twilio, and SES calls through your code. Define one internal notification, then route it to channel adapters. Each adapter (a Push adapter over APNs and FCM, an SMS adapter over Twilio, an Email adapter over SES) implements a common interface, handles that provider's quirks, retries transient failures with backoff, and can fail over to a backup provider (Twilio to a second SMS vendor). Adding a new channel is a new adapter, not a rewrite.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "The delivery backbone, stage by stage",
  "nodes": [
    {
      "id": "event",
      "label": "Event (a like, a shipped order, a fraud alert)",
      "kind": "external"
    },
    {
      "id": "api",
      "label": "Ingestion API (validate and enqueue, return fast)",
      "kind": "service"
    },
    {
      "id": "queue",
      "label": "Durable queue (Kafka or SQS)",
      "kind": "queue"
    },
    {
      "id": "prefs",
      "label": "Preference and eligibility filter (opt-out, quiet hours, channel enabled, digest)",
      "kind": "service"
    },
    {
      "id": "render",
      "label": "Template and render service (localized, per channel)",
      "kind": "service"
    },
    {
      "id": "lanes",
      "label": "Per-channel priority lanes (2FA ahead of a marketing blast)",
      "kind": "queue"
    },
    {
      "id": "dedup",
      "label": "Dedup store (idempotency key: event + user + channel, TTL)",
      "kind": "cache"
    },
    {
      "id": "adapters",
      "label": "Provider adapters (retry with backoff, failover)",
      "kind": "service"
    },
    {
      "id": "provider",
      "label": "APNs, FCM, Twilio, SES",
      "kind": "external"
    },
    {
      "id": "tracking",
      "label": "Tracking (delivery and open callbacks)",
      "kind": "db"
    },
    {
      "id": "dlq",
      "label": "Dead-letter queue (inspect and replay)",
      "kind": "queue"
    }
  ],
  "edges": [
    {
      "from": "event",
      "to": "api",
      "kind": "sync"
    },
    {
      "from": "api",
      "to": "queue",
      "kind": "async",
      "label": "enqueue and return"
    },
    {
      "from": "queue",
      "to": "prefs",
      "kind": "async"
    },
    {
      "from": "prefs",
      "to": "render",
      "kind": "sync",
      "label": "eligible recipients only"
    },
    {
      "from": "render",
      "to": "lanes",
      "kind": "sync",
      "label": "rendered per channel"
    },
    {
      "from": "lanes",
      "to": "dedup",
      "kind": "sync",
      "label": "check the key before dispatch"
    },
    {
      "from": "dedup",
      "to": "adapters",
      "kind": "sync",
      "label": "first time only"
    },
    {
      "from": "adapters",
      "to": "provider",
      "kind": "sync",
      "label": "per-provider throttling"
    },
    {
      "from": "provider",
      "to": "tracking",
      "kind": "async",
      "label": "delivery and open callbacks"
    },
    {
      "from": "adapters",
      "to": "dlq",
      "kind": "async",
      "label": "retries exhausted"
    }
  ],
  "stages": [
    {
      "adds": [
        "event",
        "api",
        "queue"
      ],
      "note": "The caller must not wait for delivery, so ingestion validates and enqueues only, and the queue is what absorbs a spiky event source."
    },
    {
      "adds": [
        "prefs"
      ],
      "note": "A user who opted out, disabled a channel or is inside quiet hours must never be reached, so eligibility is decided before any content is produced."
    },
    {
      "adds": [
        "render"
      ],
      "note": "A push is a title and a short body, an email is HTML and an SMS is 160 characters, so one internal notification renders per channel and locale, and product can change copy without touching delivery."
    },
    {
      "adds": [
        "lanes",
        "dedup",
        "adapters"
      ],
      "note": "A 2FA code cannot sit behind a million marketing pushes, which is what lanes buy, and the pipeline is at-least-once, so the idempotency check has to sit in front of dispatch rather than trusting the broker."
    },
    {
      "adds": [
        "provider",
        "tracking",
        "dlq"
      ],
      "note": "Providers are third parties that degrade and confirm asynchronously, so adapters retry and fail over, callbacks feed tracking, and anything that exhausts its retries lands in a dead-letter queue rather than vanishing."
    }
  ],
  "caption": "Adding a channel is a new adapter, not a rewrite, because every provider quirk lives behind one interface."
}
\`\`\`

## Queues, priority lanes, and idempotency

Ingestion just validates and enqueues, returning fast. Workers consume from the queue (Kafka or SQS) and do the heavy work: fan-out, rendering, and dispatch. Use priority lanes: a 2FA code or fraud alert goes on a high-priority queue and must not sit behind a million marketing pushes. Per-user rate limiting prevents bombarding one user, and per-provider throttling respects APNs/Twilio rate limits.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A worker sends a push through APNs, then crashes before it records success. The queue redelivers the message. What stops the user getting two pushes?",
  "options": [
    {
      "label": "An idempotency key built from the event, user and channel, checked against a dedup store before dispatch",
      "correct": true,
      "feedback": "Right. The crash between the send and the record is the window no broker can close, so the dedup check has to happen in your pipeline, before the provider call."
    },
    {
      "label": "The queue's exactly-once delivery guarantee",
      "feedback": "The pipeline is at-least-once by construction. A worker that dies after acting but before acknowledging is exactly the case a broker cannot distinguish from one that died before acting."
    },
    {
      "label": "APNs itself, which collapses repeated notifications to the same device",
      "feedback": "Providers deliver what you hand them. Deduplication has to happen before dispatch, on a key you control and can check cheaply."
    }
  ]
}
\`\`\`

Every request carries an idempotency key (event id + user + channel). Before sending, check whether that key was already delivered (a dedup store in Redis with a TTL, or a unique constraint). Delivery pipelines retry constantly (a worker crashes after sending but before recording success, a queue redelivers), and without idempotency a retry sends the same push twice. The dedup check is what makes at-least-once delivery machinery feel exactly-once to the user.

## Templates, preferences, tracking

A template/rendering service turns an event plus data into channel-specific, localized content (a push has a title and short body, an email has HTML, an SMS has 160 characters). Keeping this separate means product can change copy without touching delivery.

A preference/eligibility filter runs before dispatch: has the user opted out of this category, is this channel enabled, is it their quiet hours (defer to morning), should low-priority notifications be batched into a digest? Digest/batching both respects the user and cuts provider cost.

Providers send delivery/open callbacks; record them. A dead-letter queue (DLQ) captures messages that fail after all retries for inspection and replay. Track send rate, delivery rate, and open rate per channel so you can see when APNs is degraded.

**Interview nuance:** the most common follow-up is "a worker retries and the user gets two pushes, why?" The answer names the idempotency key plus a dedup store checked before dispatch, and explains that the pipeline is at-least-once so dedup is mandatory, not optional.

**Recap:** an event flows through a queue to a preference filter, a renderer, priority per-channel lanes, and provider adapters with retries/failover, and an idempotency key checked against a dedup store is what prevents retries from double-sending.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A 2FA code and a million message marketing blast are enqueued in the same second. What keeps the 2FA code fast?",
  "options": [
    {
      "label": "Priority lanes: high priority notifications ride their own queue, so they never sit behind a bulk send",
      "correct": true,
      "feedback": "Right. Lanes are the only mechanism here that reorders work. Everything else in the pipeline shapes what gets sent, not what gets sent first."
    },
    {
      "label": "The dedup store, which drops the marketing duplicates and frees capacity",
      "feedback": "Dedup removes repeats of the same notification, not a legitimate campaign to a million distinct users. That is real work that still has to drain."
    },
    {
      "label": "Per user rate limiting, which caps how many messages any one user receives",
      "feedback": "Per user limits protect a user from being bombarded. They do nothing about a million other users' messages queued ahead of the 2FA code."
    },
    {
      "label": "The preference filter, which drops marketing for users who opted out",
      "feedback": "Opt-outs shrink the blast, and it is still enormous. Shrinking a queue is not the same as being able to jump it."
    }
  ],
  "reveal": "It is a pipeline, and each stage answers one probe. Ingestion validates and enqueues so the caller returns fast. A preference and eligibility filter applies opt-outs, quiet hours and digesting. A template service renders per channel and localized. Priority lanes keep a 2FA code ahead of a marketing blast. Provider adapters hide APNs, FCM, Twilio and SES behind one interface with retry and failover, so a new channel is a new adapter. And an idempotency key checked against a dedup store before dispatch is what makes an at-least-once pipeline feel exactly-once to the user, with delivery callbacks and a DLQ closing the loop."
}
\`\`\`
`.trim()

const rideSharingTeach = `
## The canonical "moving objects" system

Ride-sharing is the canonical "moving objects" system. The defining property is that hundreds of thousands of drivers each emit a location update every 4 to 5 seconds, and riders ask "who is near me right now" against that constantly-changing set. Both the write rate and the spatial query are the hard parts, and a naive \`SELECT ... WHERE lat BETWEEN ? AND ? AND lng BETWEEN ?\` full scan collapses immediately: a bounding-box scan over millions of rows with no spatial index is O(n) per query, and you have thousands of queries per second.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A bounding-box scan is O(n) per query. What does a spatial index have to do to the coordinates to make proximity cheap?",
  "options": [
    {
      "label": "Map two dimensions onto one sortable key",
      "correct": true,
      "feedback": "Right. Once nearby points share a prefix or land in adjacent cells, proximity is a key or range lookup: the query touches one cell and its neighbor ring instead of scanning rows. The schemes named in the next section, geohash, quadtree, S2 and H3, are four ways of doing exactly this."
    },
    {
      "label": "Compress the coordinates so more rows fit in memory for the scan",
      "feedback": "The scan itself is the problem, not the row width. Halving the bytes per row halves nothing about the O(n) shape of the query."
    },
    {
      "label": "Precompute the distance from every driver to every rider",
      "feedback": "That is quadratic and hopeless against points that move every four seconds. Distance work happens only after the index has narrowed the candidates."
    }
  ]
}
\`\`\`

## The spatial index

The fix maps 2D coordinates to a 1D sortable key so "nearby" becomes a range or key lookup:

- **Geohash**: interleaves lat/lng bits into a base-32 string; a shared prefix means spatial proximity. Simple and stringy, but has edge effects (two close points can straddle a cell boundary and share no prefix), so you always query the cell plus its 8 neighbors.
- **Quadtree**: recursively splits space into 4 quadrants, adapting depth to density. Great for skewed distributions (dense downtown, empty suburbs) but is a tree you must maintain in memory.
- **S2 (Google)** and **H3 (Uber)**: project onto a space-filling curve (S2 uses a Hilbert curve on a sphere; H3 uses hexagons). Hexagons matter because every neighbor is equidistant, which makes "expand the search ring" uniform. Uber built and open-sourced H3 for exactly this.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Hundreds of thousands of drivers each emit a location every four to five seconds. How do you store those updates?",
  "options": [
    {
      "label": "As an overwrite of the driver's single current position in an in-memory index sharded by geography",
      "correct": true,
      "feedback": "Right. Only the newest location matters to matching, so the write is an overwrite, not an append, and it never has to be durable to be useful."
    },
    {
      "label": "As an append to a durable table, so the trip trail stays complete and auditable",
      "feedback": "A location trail can be logged separately for analytics and disputes. The matching index only ever reads the newest point, so appending durable rows at that rate buys matching nothing and costs enormously."
    },
    {
      "label": "As a transactional update to the driver's row in the relational database",
      "feedback": "That is precisely the write load the in-memory index exists to absorb. Transactions per location ping is throughput you are paying for and cannot use."
    }
  ]
}
\`\`\`

## Writes as overwrites, sharded by geography

For writes, the trick is to **not** treat driver locations as durable database rows. Locations are ephemeral: you only ever care about the latest one. Keep the live index in memory (Redis geospatial commands, or a sharded in-memory service) and treat the write as an overwrite, not an append. Shard the index **by geography** (city or region), because a rider in Chicago never needs a driver in Miami. Regional sharding keeps each shard's write volume and index size bounded and lets you scale cities independently.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Moving objects: overwrite the index, then match against it",
  "reveal": "all",
  "nodes": [
    {
      "id": "driver",
      "label": "Driver app: a location every 4 to 5 seconds",
      "kind": "client"
    },
    {
      "id": "ingest",
      "label": "Location ingest (writes are overwrites, not history)",
      "kind": "service"
    },
    {
      "id": "index",
      "label": "In-memory geo index (Redis with H3 or S2 cells), sharded by city",
      "kind": "cache"
    },
    {
      "id": "rider",
      "label": "Rider request",
      "kind": "client"
    },
    {
      "id": "matcher",
      "label": "Matching engine: query the cell plus its neighbor ring, rank candidates by ETA",
      "kind": "service"
    },
    {
      "id": "offer",
      "label": "Offer under an exclusive lock on the driver, expiring in seconds",
      "kind": "service"
    },
    {
      "id": "trip",
      "label": "Trip state machine (the one strongly consistent part)",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "driver",
      "to": "ingest",
      "kind": "sync"
    },
    {
      "from": "ingest",
      "to": "index",
      "kind": "sync",
      "label": "overwrite the driver's current cell"
    },
    {
      "from": "rider",
      "to": "matcher",
      "kind": "sync"
    },
    {
      "from": "index",
      "to": "matcher",
      "kind": "sync",
      "label": "candidates from the cell and its ring"
    },
    {
      "from": "matcher",
      "to": "offer",
      "kind": "sync"
    },
    {
      "from": "offer",
      "to": "trip",
      "kind": "sync",
      "label": "accepted"
    },
    {
      "from": "offer",
      "to": "index",
      "kind": "feedback",
      "label": "declined or expired: the driver returns to the pool"
    }
  ],
  "caption": "A hot city concentrates load on one shard, and the graceful answer is to lower update frequency and widen the matching radius rather than drop location updates."
}
\`\`\`

## Dispatch, matching, and the trip FSM

The **dispatch/matching engine** does candidate generation (query the rider's H3 cell and its neighbor rings until it has enough drivers), then ranks by ETA (not raw distance, because a driver across a river is far by road), driver acceptance likelihood, and supply-demand balance. **Surge** is a pricing signal computed per cell from the ratio of open requests to available drivers. Once a driver accepts, a **trip state machine** (requested -> accepted -> arrived -> in-progress -> completed) becomes the source of truth, and this part **does** need durable, strongly consistent storage because it maps to money.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Cell resolution vs drivers per cell",
  "predictPrompt": {
    "question": "The matching engine drops to cells half as wide to tighten candidate ranking. What happens to the driver count in each cell?",
    "options": [
      "It halves",
      "It drops to a quarter",
      "It stays the same"
    ]
  },
  "workedExample": "At 30 bits the interleaved key gives longitude and latitude 15 bits each, so the 40075 km equator splits into 2 to the power 15, 32768 slices, about 1.2 km wide, while the 20038 km pole-to-pole span splits into those same 32768 slices, about 0.6 km tall. An even bit count splits longitude over 360 degrees and latitude over 180 with the same number of bits, so the cell is always wider than it is tall: 2 to 1 in degrees, and 2 x cos(latitude) to 1 on the ground, so the gap narrows as you move away from the equator. Either way one step north is not the same distance as one step east, which is another reason H3's hexagons won. Covering roughly 600 square km of a city like the lesson's Chicago takes 600 / (1.2 x 0.6), about 800 cells. With 200,000 drivers pinging every 4 to 5 seconds in that region, each cell's in-memory driver set holds about 200000 / 800 = 250 candidates, plenty for one cell-plus-neighbor-ring query. Slide bits up and the pool per cell thins fast, forcing candidate generation to expand its search rings before ranking by ETA.",
  "inputs": [
    {
      "kind": "slider",
      "id": "bits",
      "label": "Interleaved bits in the cell key",
      "min": 10,
      "max": 50,
      "scale": "linear",
      "step": 2,
      "initial": 30,
      "unit": "bits"
    },
    {
      "kind": "slider",
      "id": "drivers",
      "label": "Drivers in the city region",
      "min": 10000,
      "max": 1000000,
      "scale": "log",
      "initial": 200000,
      "unit": "drivers"
    }
  ],
  "outputs": [
    {
      "id": "cellWidthKm",
      "label": "Cell width",
      "expr": "40075 / pow(2, bits / 2)",
      "format": "number",
      "unit": "km"
    },
    {
      "id": "cellHeightKm",
      "label": "Cell height",
      "expr": "20038 / pow(2, bits / 2)",
      "format": "number",
      "unit": "km"
    },
    {
      "id": "cellsCovering",
      "label": "Cells covering a 600 sq km city",
      "expr": "600 / (cellWidthKm * cellHeightKm)",
      "format": "number",
      "unit": "cells"
    },
    {
      "id": "driversPerCell",
      "label": "Drivers per cell",
      "expr": "drivers / cellsCovering",
      "format": "number",
      "unit": "drivers",
      "sparkline": {
        "over": "bits"
      }
    }
  ],
  "caption": "Surge reads this exact per-cell ratio: too-fine cells starve each cell of candidates, too-coarse cells hide the downtown hotspot inside one giant cell."
}
\`\`\`

**Interview nuance:** the assignment must be exclusive. If you offer the same driver to two riders you double-book. Use a short lock or conditional write on the driver's state so only one match wins, and expire the offer if the driver does not accept in a few seconds so the driver returns to the pool. And hot cities (New Year's Eve downtown) concentrate load on one shard: degrade gracefully by lowering location-update frequency (QoS) and widening the matching radius under load rather than dropping updates blindly.

**Recap:** index moving drivers with a space-filling spatial index (H3/S2/geohash) sharded by geography, keep locations in memory as overwrites, and rank matches by ETA under an exclusive-assignment lock, with the trip state machine as the one strongly consistent part.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Two riders request at the same instant, and the matcher ranks the same driver first for both. What prevents a double booking?",
  "options": [
    {
      "label": "An exclusive assignment on the driver's state, with an expiring offer",
      "correct": true,
      "feedback": "Right. Ranking suggests, assignment decides, and the decision has to produce a single winner: a short lock or a conditional write on the driver's state so only one match commits. The expiry is the other half, returning an unresponsive driver to the pool instead of stranding the rider."
    },
    {
      "label": "Ranking by ETA, which will differ for the two riders and separate them",
      "feedback": "Ranking is a preference, not an exclusion. Both matchers can still put the same driver first, and nothing in the ranking stops the second write from landing."
    },
    {
      "label": "Geographic sharding, which keeps concurrent requests on separate shards",
      "feedback": "Both riders are in the same city, so they are on the same shard. Sharding bounds load; it does not serialize a contended driver."
    },
    {
      "label": "The trip state machine, which rejects a second trip for a driver already on one",
      "feedback": "The FSM is the right place for durable trip state, and it is downstream: by the time two trips are being created, you have already offered the driver twice and told two riders they matched."
    }
  ],
  "reveal": "The defining property is moving points at high write rate. That gives you a spatial index (geohash, quadtree, S2 or H3) that turns proximity into a cell plus neighbor ring lookup, sharded by geography because a Chicago rider never needs a Miami driver, and held in memory as overwrites because only the latest position matters. Matching is candidate generation from the cell rings, then ranking by ETA rather than raw distance, then an exclusive assignment so one driver goes to one rider. The trip state machine is the one piece that needs durable, strongly consistent storage, because it maps to money."
}
\`\`\`
`.trim()

const fileSyncTeach = `
## The whole difficulty is in NOT uploading files

File sync looks like "upload files to the cloud," but the entire difficulty is in **not** uploading files. A 2GB video where a user changes one tag should cost a few kilobytes of network, not 2GB. Two people uploading the same popular PDF should cost one copy of storage. Editing offline on a laptop and a phone must reconcile without silently losing an edit. The core techniques are chunking, dedup, delta sync, and conflict resolution.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Suppose you split every file into fixed 4MB blocks and hash each block. A user inserts one byte near the front of a 2GB file. How many block hashes change?",
  "options": [
    {
      "label": "Effectively all of them, every boundary shifts",
      "correct": true,
      "feedback": "Right, and this is the whole reason content-defined chunking exists. Every byte after the insert moves one position, so each fixed 4MB boundary now cuts different content and rehashes. One byte re-uploads a 2GB file."
    },
    {
      "label": "One, the block containing the inserted byte",
      "feedback": "That holds only when boundaries are anchored to content. With fixed offsets, every byte after the insert moves into a different block."
    },
    {
      "label": "Two, the block with the insert and the one after it",
      "feedback": "The shift does not settle after one block. Every byte in the file moves by one position, so every subsequent boundary cuts new content."
    }
  ]
}
\`\`\`

## Content-defined chunking

Instead of splitting a file into fixed 4MB blocks, CDC uses a rolling hash (Rabin fingerprint) over a sliding window and cuts a chunk boundary wherever the hash matches a pattern, yielding variable-size chunks averaging, say, 4MB. Why variable? Because if you insert one byte near the front of a file, fixed-size blocks all shift and every block hash changes, so the whole file re-uploads. CDC boundaries are anchored to content, so inserting a byte only changes the one chunk containing it; every other chunk keeps its old hash. Each chunk is hashed (SHA-256); the hash is both its content-address and its dedup key.

## Dedup and delta sync

Store each unique chunk hash exactly once in the object store. A file becomes a **manifest**: an ordered list of chunk hashes. If two files (or two users, with global dedup) share chunks, they share storage. **Delta sync** falls straight out: to sync a changed file the client computes the new manifest, sends only the hashes to the server, the server replies which hashes it already has, and the client uploads only the missing chunks.

\`\`\`cswidget
{
  "type": "steps",
  "title": "Chunk dedup and delta sync",
  "frames": [
    {
      "note": "Content-defined chunking cuts the 2GB file at rolling-hash boundaries into 4 variable chunks (about 4MB each). Each chunk is hashed with SHA-256; that hash is both its content address and its dedup key.",
      "rows": [
        {
          "label": "file v1 (2GB)",
          "cells": [
            {
              "text": "c1",
              "state": "active"
            },
            {
              "text": "c2",
              "state": "active"
            },
            {
              "text": "c3",
              "state": "active"
            },
            {
              "text": "c4",
              "state": "active"
            }
          ]
        },
        {
          "label": "SHA-256",
          "cells": [
            {
              "text": "h1"
            },
            {
              "text": "h2"
            },
            {
              "text": "h3"
            },
            {
              "text": "h4"
            }
          ]
        },
        {
          "label": "object store",
          "cells": [
            {
              "text": "h1",
              "state": "new"
            },
            {
              "text": "h2",
              "state": "new"
            },
            {
              "text": "h3",
              "state": "new"
            },
            {
              "text": "h4",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "note": "The file is now a manifest: an ordered list of 4 chunk hashes. The object store keeps each unique chunk exactly once, and the metadata DB maps the file to manifest v1 and its version.",
      "rows": [
        {
          "label": "manifest v1",
          "cells": [
            {
              "text": "h1"
            },
            {
              "text": "h2"
            },
            {
              "text": "h3"
            },
            {
              "text": "h4"
            }
          ]
        },
        {
          "label": "object store",
          "cells": [
            {
              "text": "h1",
              "state": "dim"
            },
            {
              "text": "h2",
              "state": "dim"
            },
            {
              "text": "h3",
              "state": "dim"
            },
            {
              "text": "h4",
              "state": "dim"
            }
          ]
        }
      ]
    },
    {
      "note": "The user edits bytes near the start. CDC boundaries are anchored to content, so only chunk c1 changes and rehashes to h1'. The client computes manifest v2 and sends just the 4 hashes to the server: kilobytes of network so far.",
      "rows": [
        {
          "label": "file v2",
          "cells": [
            {
              "text": "c1'",
              "state": "active"
            },
            {
              "text": "c2",
              "state": "dim"
            },
            {
              "text": "c3",
              "state": "dim"
            },
            {
              "text": "c4",
              "state": "dim"
            }
          ]
        },
        {
          "label": "manifest v2",
          "cells": [
            {
              "text": "h1'",
              "state": "new"
            },
            {
              "text": "h2"
            },
            {
              "text": "h3"
            },
            {
              "text": "h4"
            }
          ]
        }
      ],
      "predict": {
        "question": "The server compares manifest v2 against what it already stores. How much does the client upload?",
        "options": [
          "All 4 chunks, the full 2GB again",
          "Only c1', about 4MB",
          "Nothing, the server computes the delta itself"
        ]
      }
    },
    {
      "note": "The have/need negotiation: the server already has h2, h3, h4 and asks only for h1'. One chunk of about 4MB crosses the network, not 2GB. The server could never compute this delta itself: it does not have the client's new bytes.",
      "rows": [
        {
          "label": "server has",
          "cells": [
            {
              "text": "h2",
              "state": "dim"
            },
            {
              "text": "h3",
              "state": "dim"
            },
            {
              "text": "h4",
              "state": "dim"
            }
          ]
        },
        {
          "label": "server needs",
          "cells": [
            {
              "text": "h1'",
              "state": "active"
            }
          ]
        },
        {
          "label": "upload",
          "cells": [
            {
              "text": "h1' ~4MB",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "note": "Chunks land first, then metadata commits file v2 pointing at manifest v2. The store holds 5 unique chunks serving both versions: full history kept, shared chunks stored once, and the sync cost one chunk instead of the whole file.",
      "rows": [
        {
          "label": "object store",
          "cells": [
            {
              "text": "h1",
              "state": "dim"
            },
            {
              "text": "h1'",
              "state": "new"
            },
            {
              "text": "h2",
              "state": "dim"
            },
            {
              "text": "h3",
              "state": "dim"
            },
            {
              "text": "h4",
              "state": "dim"
            }
          ]
        },
        {
          "label": "manifest v1",
          "cells": [
            {
              "text": "h1"
            },
            {
              "text": "h2"
            },
            {
              "text": "h3"
            },
            {
              "text": "h4"
            }
          ]
        },
        {
          "label": "manifest v2",
          "cells": [
            {
              "text": "h1'",
              "state": "active"
            },
            {
              "text": "h2"
            },
            {
              "text": "h3"
            },
            {
              "text": "h4"
            }
          ]
        }
      ]
    }
  ],
  "caption": "Edit near the start of a 2GB file: hashes negotiate, one 4MB chunk uploads, versions share storage."
}
\`\`\`

\`\`\`
file --CDC--> [c1][c2][c3][c4]   each chunk -> SHA-256 -> content address
manifest = [h1, h2, h3, h4]
edit near start -> only c1 changes -> new manifest [h1', h2, h3, h4] -> upload 1 chunk
\`\`\`

## Metadata service and conflict resolution

Separate from blob storage, a metadata DB tracks: the file tree (paths, folders), each file's current manifest (chunk list) and version, per-device sync cursors, and sharing/ACLs. This is the coordination brain and needs strong consistency (a client must never see a manifest pointing at chunks that are not yet uploaded). The usual ordering: upload chunks to the object store first, then commit the metadata that references them.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Two people edit the same file, and the second client uploads based on version N when the server is already at N+1. What does the pragmatic product do?",
  "options": [
    {
      "label": "Keep both, as a new version and a conflicted copy",
      "correct": true,
      "feedback": "Right, and Dropbox's answer is deliberately unambitious. One upload commits as the new version, the other lands beside it as a conflicted copy, and full version history means nothing is destroyed. The one unacceptable outcome is a silently lost edit."
    },
    {
      "label": "Merge the two versions automatically with a three way diff",
      "feedback": "Some text merges cleanly, and binary files do not. A wrong automatic merge corrupts data silently, which is worse than handing the user two files."
    },
    {
      "label": "Last write wins on the file timestamp",
      "feedback": "That destroys one person's work with no trace, and clock skew between clients decides whose. It is the failure mode the version vector exists to detect."
    }
  ]
}
\`\`\`

Each file has a version vector or a monotonically increasing version. When a client uploads based on version N but the server is already at N+1 (someone else edited), that is a conflict. Dropbox's pragmatic answer is not to merge binary files: it keeps both, creating a "conflicted copy," so no edit is lost. The safe default is keep-both plus full version history so nothing is destroyed.

## The client sync protocol

A local filesystem watcher detects changes, an upload queue chunks and pushes, a download queue applies remote changes, and a persisted cursor tracks the last-seen server state so an interrupted sync resumes instead of rescanning everything. Offline edits queue locally and reconcile on reconnect against the server version.

**Interview nuance:** the tempting-but-wrong move is to compute deltas on the server. You cannot, because the server does not have the client's new bytes until they are uploaded. The client computes the manifest and asks the server which chunks are missing (a "have/need" negotiation), so the expensive comparison happens before any bulk transfer.

**Recap:** content-defined chunking plus per-chunk hashing gives dedup and delta sync (upload only changed chunks), a strongly consistent metadata service maps files to chunk manifests and versions, and conflicts are resolved by keeping both copies plus history rather than merging blindly.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A user renames a 2GB video and changes nothing inside it. What crosses the network?",
  "options": [
    {
      "label": "A metadata update only: the chunk hashes are unchanged, so the manifest is identical and no bytes move",
      "correct": true,
      "feedback": "Right. Chunks are addressed by content, and the name lives in the metadata service's file tree, so a rename never touches the object store at all."
    },
    {
      "label": "The whole file, because the file's identity changed",
      "feedback": "Identity in this design is the manifest of chunk hashes, not the path. The path is a metadata row."
    },
    {
      "label": "One chunk, because the file's header carries the name",
      "feedback": "The name is not in the bytes; it is in the metadata service. Not even one chunk rehashes."
    }
  ],
  "reveal": "Everything follows from addressing content instead of files. Content-defined chunking with a rolling hash puts boundaries where the content says, so an insert changes one chunk instead of all of them. Hashing each chunk makes the hash both a content address and a dedup key, so identical chunks are stored once globally and a sync becomes a have/need negotiation over hashes with only the missing chunks uploaded. A strongly consistent metadata service owns the file tree, the manifest per version, and the per device cursors, and it commits only after the chunks it names are stored. Conflicts keep both copies plus history rather than merging blindly."
}
\`\`\`
`.trim()

const videoStreamingTeach = `
## Two problems bolted together

Video is two very different problems bolted together: an **asynchronous ingest/transcoding pipeline** (write path, minutes of latency, compute-heavy) and a **delivery path** (read path, milliseconds, bandwidth-heavy, CDN-dominated). Conflating them is the classic mistake. A single 4K source uploaded once may be watched a billion times, so the economics are entirely about the read path and egress cost.

## Ingest and transcoding

A raw upload lands in object storage (S3). You never serve that file. Instead a job is enqueued (SQS/Kafka) and a fleet of transcoding workers produces an **ABR ladder**: the same content re-encoded at multiple resolutions and bitrates (for example 240p at 400kbps, 480p, 720p, 1080p, 4K), each in modern codecs (H.264 for compatibility, plus H.265/VP9/AV1 for efficiency). Transcoding is embarrassingly parallel: split the video into segments, transcode segments across many workers, then assemble. Each rendition is cut into short **segments** (2 to 10 seconds) and described by a **manifest** (an HLS \`.m3u8\` or DASH \`.mpd\`) that lists the available bitrates and segment URLs.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Two paths bolted together: transcode once, serve a billion times",
  "reveal": "all",
  "nodes": [
    {
      "id": "upload",
      "label": "Creator upload (one 4K source)",
      "kind": "client"
    },
    {
      "id": "raw",
      "label": "S3: the raw upload, never served to a viewer",
      "kind": "db"
    },
    {
      "id": "queue",
      "label": "Transcode queue (SQS or Kafka)",
      "kind": "queue"
    },
    {
      "id": "workers",
      "label": "Worker pool: segment-parallel transcode",
      "kind": "service"
    },
    {
      "id": "segments",
      "label": "ABR ladder as segments: 240p at 400kbps up to 4K, H.264 plus H.265, VP9 or AV1, cut into 2 to 10 second pieces",
      "kind": "db"
    },
    {
      "id": "manifest",
      "label": "Manifest (HLS .m3u8 or DASH .mpd): the bitrates and their segment URLs",
      "kind": "db"
    },
    {
      "id": "cdn",
      "label": "CDN edge PoPs: immutable segments, long TTLs, request coalescing",
      "kind": "cdn"
    },
    {
      "id": "player",
      "label": "Player: measures throughput and buffer, then picks the next segment's bitrate",
      "kind": "client"
    }
  ],
  "edges": [
    {
      "from": "upload",
      "to": "raw",
      "kind": "sync"
    },
    {
      "from": "raw",
      "to": "queue",
      "kind": "async",
      "label": "enqueue, minutes of latency are fine"
    },
    {
      "from": "queue",
      "to": "workers",
      "kind": "async"
    },
    {
      "from": "workers",
      "to": "segments",
      "kind": "sync",
      "label": "split, transcode in parallel, reassemble"
    },
    {
      "from": "segments",
      "to": "manifest",
      "kind": "sync",
      "label": "one list of every rendition"
    },
    {
      "from": "manifest",
      "to": "cdn",
      "kind": "sync"
    },
    {
      "from": "segments",
      "to": "cdn",
      "kind": "sync",
      "label": "cache key is the segment URL"
    },
    {
      "from": "cdn",
      "to": "player",
      "kind": "sync",
      "label": "a million viewers of one segment, one origin fetch"
    }
  ],
  "groups": [
    {
      "id": "write",
      "label": "Write path: once per video, minutes, compute-heavy",
      "nodes": [
        "raw",
        "queue",
        "workers",
        "segments",
        "manifest"
      ]
    },
    {
      "id": "read",
      "label": "Read path: a billion times, milliseconds, bandwidth-heavy",
      "nodes": [
        "cdn",
        "player"
      ]
    }
  ],
  "caption": "Scaling transcoding for a viral watch spike means the two paths have been conflated: the spike is pure cached reads, and the compute already happened once at upload."
}
\`\`\`

## Adaptive bitrate

The player, not the server, drives quality. It downloads the manifest, measures throughput and buffer level, and requests the next 4-second segment at whatever bitrate it can sustain. Bandwidth drops on a train, the player steps down to 480p mid-stream and steps back up later, all by choosing different segment URLs from the same manifest. This is why segmentation and per-bitrate manifests exist: they make quality a client-side, per-segment choice with no server session state.

### Segment duration is a latency floor

For a file uploaded last week nobody cares how long a segment is. The moment the source is live, segment duration stops being a packaging detail and becomes the dominant term in latency, because a segment is published as a unit: the encoder cannot list a segment's URL in the manifest until its last frame has been encoded, and a player cannot start decoding frame 1 until it can fetch the object. Walk one 4-second segment of a live feed:

\`\`\`
t=0.0s  camera captures the first frame of segment 12
        ... encoder is still filling segment 12, nothing is publishable ...
t=4.0s  last frame encoded, segment12.m4s finalized and written
t=4.1s  rolling manifest rewritten to list segment12.m4s
t=4.4s  player's next manifest poll sees it, issues GET segment12.m4s
t=4.7s  bytes arrive, player decodes frame 1 of segment 12

        frame 1 was captured at t=0.0 and displayed at t=4.7
        glass-to-glass floor ~= one full segment, before CDN hops or player buffer
\`\`\`

That floor is why segment duration is a latency knob at all: 2s segments roughly halve it and roughly double the request and manifest-poll rate. But the floor is still a whole segment, so chasing seconds this way runs out of road fast.

**Low-latency HLS and low-latency DASH break the coupling by publishing a segment before it is finished.** The encoder emits each segment as a sequence of **partial segments**, also called **CMAF chunks**: independently decodable pieces of roughly 200 to 500ms that are announced and served the instant they exist, while the rest of the segment is still being encoded. LL-HLS lists each one in the manifest as its own addressable resource; LL-DASH flushes them down a single response with **chunked transfer encoding**, so the response for segment 12 starts before segment 12 exists. Same segment, delivered in pieces:

\`\`\`
segment 12 (4s) as 200ms CMAF chunks:

t=0.2s  chunk 12.1 encoded -> announced/flushed -> player fetches and decodes it
t=0.4s  chunk 12.2 encoded -> flushed; player is decoding 12.1 as 12.3 is being encoded
t=0.6s  chunk 12.3 ...
        ...
t=4.0s  segment 12 completes and stays addressable as one 4s object, which is what
        late joiners, the DVR window and the normal CDN cache path fetch

        frame 1 captured t=0.0, displayed at ~t=0.2 plus network
        glass-to-glass ~= one chunk, not one segment: seconds, not tens of seconds
\`\`\`

Segment duration still sets cache granularity, manifest size and DVR seek points. It no longer sets latency. The bill arrives on the request path: announcements and fetches now happen per chunk rather than per segment, so request volume goes up by the chunk-per-segment ratio, and an edge holding an open response for media that has not been encoded yet coalesces less cleanly than an edge serving a finished immutable object. That is the trade a low-latency live design is actually making.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A title goes viral: a million people start watching it within a minute. What has to scale?",
  "options": [
    {
      "label": "Nothing on the transcode path: this is a read spike, not compute",
      "correct": true,
      "feedback": "Right. Transcoding ran once at upload, and every one of those viewers is reading the same immutable segments, so the spike lands entirely on the delivery path. Edge caches plus request coalescing absorb it, which is why origin egress barely moves."
    },
    {
      "label": "The transcoding fleet, since a million concurrent viewers need a million streams encoded",
      "feedback": "This is the exact conflation the lesson warns about. Transcoding is a write path job that finished at upload; nothing is encoded per viewer."
    },
    {
      "label": "The origin object store, which must serve a million concurrent segment reads",
      "feedback": "If the origin is serving those reads you have already lost. Edge caching plus request coalescing turn a million requests for one segment into roughly one origin fetch."
    }
  ]
}
\`\`\`

## CDN, origin offload, and tiering

You must not serve segments from origin; a viral video would saturate origin egress and bankrupt you. Segments are cached at CDN edge PoPs close to viewers. Netflix built **Open Connect**, placing its own caches inside ISPs; YouTube uses Google's edge. The cache key is the segment URL, and because segments are immutable you cache them with long TTLs. For a live spike (a premiere), you pre-warm edges and rely on the CDN's request coalescing so a million viewers of the same segment produce one origin fetch.

The vast majority of the catalog is watched rarely. Keep hot content on fast storage and at many edges; tier cold content to cheaper storage (S3 Infrequent Access / Glacier) and fewer edges, re-warming on demand. Metadata and recommendations are a completely separate serving path from delivery.

**Interview nuance:** interviewers love "what happens the instant a video goes viral." The right answer names CDN request coalescing and edge caching absorbing the read fan-out, plus the fact that transcoding already happened once at upload so the spike is pure cached reads, not compute. If you find yourself scaling transcoding for a viral watch spike, you have conflated the write and read paths.

**Recap:** transcode once, asynchronously, into an ABR ladder of segmented renditions with manifests; let the client adapt bitrate per segment; and serve segments from a CDN (Open Connect-style edge caches) with long TTLs so origin egress stays flat even under viral read spikes. Publication granularity is what bounds latency, so a live design pushes below the segment floor by publishing partial segments as they encode.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Bandwidth collapses mid stream on a train. Who decides to drop to 480p, and how?",
  "options": [
    {
      "label": "The player, from its own throughput and buffer measurements",
      "correct": true,
      "feedback": "Right. It measures throughput and buffer level, then simply fetches the next segment from a lower bitrate rendition listed in the same manifest. Quality is a client side choice of which URL to request, which is exactly why it works over plain cached objects with no server session state."
    },
    {
      "label": "The server, which detects the slow client and re-encodes the stream at a lower bitrate on the fly",
      "feedback": "Per viewer encoding is the cost the ABR ladder removes. The renditions already exist, and the server holds no state about this viewer's connection."
    },
    {
      "label": "The CDN edge, which downgrades segments it serves to slow clients",
      "feedback": "The edge serves whatever URL it is asked for, byte for byte. It has no notion of a stream to downgrade."
    }
  ],
  "reveal": "Two systems, deliberately kept apart. The write path is asynchronous and compute heavy: an upload lands in object storage, a queue feeds a worker pool, and segment parallel transcoding produces an ABR ladder of renditions cut into short segments with an HLS or DASH manifest. The read path is millisecond scale and bandwidth dominated: the player picks a bitrate per segment from the manifest, and segments are immutable so they cache at the edge with long TTLs. Origin egress stays flat under a viral spike because coalescing collapses identical requests, and cold catalog tiers to cheaper storage and fewer edges."
}
\`\`\`
`.trim()

const collaborativeEditorTeach = `
## The whole problem is convergence

The whole problem of a collaborative editor is **convergence**: many people edit the same document concurrently, each edit is applied against a slightly different local state, and yet every replica must end up byte-for-byte identical, while preserving what each user intended. Last-write-wins on the whole document is the disqualifying answer: if Alice and Bob both type at the same moment, LWW throws one person's work away. There are two correct families: **Operational Transformation (OT)** and **CRDTs**.

\`\`\`cswidget
{
  "type": "steps",
  "title": "Concurrent edits: clobber vs merge",
  "frames": [
    {
      "note": "Alice and Bob start from identical replicas of the same document. Both are about to insert at the same moment, each against their own local copy.",
      "rows": [
        {
          "label": "Alice's replica",
          "cells": [
            {
              "text": "a"
            },
            {
              "text": "b"
            },
            {
              "text": "c"
            },
            {
              "text": "d"
            },
            {
              "text": "e"
            },
            {
              "text": "f"
            }
          ]
        },
        {
          "label": "Bob's replica",
          "cells": [
            {
              "text": "a"
            },
            {
              "text": "b"
            },
            {
              "text": "c"
            },
            {
              "text": "d"
            },
            {
              "text": "e"
            },
            {
              "text": "f"
            }
          ]
        }
      ]
    },
    {
      "note": "Concurrent ops against the same base: Alice applies ins(5, x) locally, Bob applies ins(3, y) locally. The replicas have diverged, and each op's position only makes sense in its own local state.",
      "rows": [
        {
          "label": "Alice: ins(5, x)",
          "cells": [
            {
              "text": "a"
            },
            {
              "text": "b"
            },
            {
              "text": "c"
            },
            {
              "text": "d"
            },
            {
              "text": "e"
            },
            {
              "text": "x",
              "state": "new"
            },
            {
              "text": "f"
            }
          ]
        },
        {
          "label": "Bob: ins(3, y)",
          "cells": [
            {
              "text": "a"
            },
            {
              "text": "b"
            },
            {
              "text": "c"
            },
            {
              "text": "y",
              "state": "new"
            },
            {
              "text": "d"
            },
            {
              "text": "e"
            },
            {
              "text": "f"
            }
          ]
        }
      ]
    },
    {
      "note": "The naive answer: last-write-wins on the whole document. Bob's version arrives last and overwrites, so Alice's x is simply gone. LWW when two people type at the same moment throws one person's work away: the disqualifying answer.",
      "rows": [
        {
          "label": "LWW doc",
          "cells": [
            {
              "text": "a"
            },
            {
              "text": "b"
            },
            {
              "text": "c"
            },
            {
              "text": "y",
              "state": "active"
            },
            {
              "text": "d"
            },
            {
              "text": "e"
            },
            {
              "text": "f"
            }
          ]
        },
        {
          "label": "Alice's edit",
          "cells": [
            {
              "text": "ins(5, x)",
              "state": "dropped"
            }
          ]
        }
      ],
      "predict": {
        "question": "OT transforms Alice's ins(5, x) against Bob's concurrent ins(3, y). Where does x land?",
        "options": [
          "Still at position 5",
          "Shifted to position 6",
          "Dropped as a conflict"
        ]
      }
    },
    {
      "note": "The merge that keeps both: Bob inserted before position 5, so OT shifts Alice's op to ins(6, x). A CRDT reaches the same result by giving every character a unique id so concurrent inserts commute. Both replicas converge byte-for-byte, and both intents survive.",
      "rows": [
        {
          "label": "transform",
          "cells": [
            {
              "text": "ins(5, x)",
              "state": "dropped"
            },
            {
              "text": "ins(6, x)",
              "state": "new"
            }
          ]
        },
        {
          "label": "Alice's replica",
          "cells": [
            {
              "text": "a"
            },
            {
              "text": "b"
            },
            {
              "text": "c"
            },
            {
              "text": "y",
              "state": "active"
            },
            {
              "text": "d"
            },
            {
              "text": "e"
            },
            {
              "text": "x",
              "state": "active"
            },
            {
              "text": "f"
            }
          ]
        },
        {
          "label": "Bob's replica",
          "cells": [
            {
              "text": "a"
            },
            {
              "text": "b"
            },
            {
              "text": "c"
            },
            {
              "text": "y",
              "state": "active"
            },
            {
              "text": "d"
            },
            {
              "text": "e"
            },
            {
              "text": "x",
              "state": "active"
            },
            {
              "text": "f"
            }
          ]
        }
      ]
    }
  ],
  "caption": "Why convergence needs OT or CRDTs: whole-document LWW drops an edit, the transform keeps both."
}
\`\`\`

## Operational Transformation

Edits are operations like \`insert(pos=5, "x")\` and \`delete(pos=8)\`. When two operations are made concurrently against the same base, applying them in different orders gives different results, so OT **transforms** an incoming operation against operations that were applied before it locally, adjusting indices so intent is preserved. If Alice inserts at position 5 and Bob concurrently inserts at position 3, Bob's op shifts Alice's effective position to 6. OT is what Google Docs uses. It is proven and compact, but the transformation functions are notoriously subtle, and classic OT relies on a **central server** to impose a single canonical order of operations.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Classic OT depends on a central server to impose one canonical order on operations. What does that dependency cost?",
  "options": [
    {
      "label": "Offline and peer to peer editing get hard without a sequencer",
      "correct": true,
      "feedback": "Right. There is nothing to impose the canonical order while a replica is disconnected, and that is the gap CRDTs fill: give every character a unique, totally ordered id and concurrent inserts commute, so replicas merge in any order with no sequencer at all."
    },
    {
      "label": "Nothing real: the server is an optimization, and OT converges without it",
      "feedback": "The canonical order is what each op is transformed against. Remove the single ordering authority and two replicas can transform in different orders and end up different, which is the one thing convergence forbids."
    },
    {
      "label": "Latency, because every keystroke must round trip before the typist sees it",
      "feedback": "Operations apply locally first and are transformed as remote ops arrive. The server orders them; it does not gate the local echo."
    }
  ]
}
\`\`\`

## CRDTs

Instead of transforming operations, CRDTs give every character a globally unique, totally-ordered identifier (often a fractional index or a dense position between two neighbors) so that concurrent inserts have a deterministic, commutative merge order with no transformation needed. Sequence CRDTs (RGA, Logoot, YATA as used by Yjs, Automerge) let replicas merge in any order and converge. The advantage is they work **peer-to-peer and offline** without a central sequencer; the cost is metadata overhead (every character carries an id, and deleted characters may linger as tombstones).

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "The question",
    "OT (operational transformation)",
    "CRDT"
  ],
  "rows": [
    [
      "How does one edit reach the others?",
      "The op goes to a server, which orders it, transforms it against the concurrent ops, and broadcasts the transformed op",
      "Every character carries a unique id, so ops commute and any replica can merge them in any order"
    ],
    [
      "What has to be true for the replicas to converge?",
      "One ordering authority, so every editor of a document is routed to the same server",
      "Nothing central: the same set of ops produces the same document wherever it is merged"
    ],
    [
      "What does it cost in memory?",
      "Lean, because a position is just an index",
      "Higher, because of per-character ids and tombstones for deleted characters"
    ],
    [
      "A laptop edits offline for an hour, then reconnects",
      "Transform the whole queued batch against the history it missed",
      "Merge the queued ops, which commute by construction"
    ]
  ],
  "caption": "Both converge. They differ in where the ordering authority sits, which is why the OT design routes all editors of a document to one server and last-write-wins is not an option for either."
}
\`\`\`

The tradeoff: **OT** is server-centric, memory-lean, battle-tested, but the transform logic is fragile and hard to extend to rich data. **CRDTs** are decentralization-friendly and offline-first, conceptually cleaner to reason about for convergence, but carry more per-character metadata and need periodic tombstone garbage collection. For a server-backed product like Docs, OT (or a server-ordered CRDT) is pragmatic; for offline-first or P2P (local-first apps, Figma-like tools), CRDTs shine.

## Transport, persistence, scaling

Edits flow over a persistent **WebSocket** to a per-document collaboration server. Beyond the edits themselves, you broadcast **presence**: each user's cursor position and selection, and who is online. Presence is high-frequency but ephemeral and lossy-tolerant, so you send it on a lighter channel and never persist it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "How do you persist the document as people type?",
  "options": [
    {
      "label": "Append each operation to an op log and write periodic snapshots, so a joiner loads the latest snapshot plus the tail of ops",
      "correct": true,
      "feedback": "Right. The op log is also where undo, redo, history and reconnect catch-up all come from, and snapshots are what stop a new joiner replaying from creation."
    },
    {
      "label": "Save the whole document blob on every keystroke, which is simplest and always current",
      "feedback": "It rewrites the entire document per character, and it throws away the operation history that reconnect and undo depend on."
    },
    {
      "label": "Save the whole document blob, debounced to once per second, which bounds the write rate",
      "feedback": "Debouncing bounds the cost but keeps both problems: the write is still whole document, and there is still no op history for a returning client to catch up against."
    },
    {
      "label": "Keep it in the collaboration server's memory and write it when the last editor leaves",
      "feedback": "A crash then loses the session, and a client that reconnects mid session has nothing to replay from."
    }
  ]
}
\`\`\`

You do not save the document as a blob on every keystroke. You append operations to an **op log** and periodically write a **snapshot** so a new joiner can load the latest snapshot plus the tail of ops rather than replaying from creation. Undo/redo and history come from the op log. On reconnect after being offline, the client sends its queued local ops and receives the ops it missed (identified by a version/sequence number), then transforms or merges to catch up.

All editors of one document must reach the same collaboration server (or a consistent group) so ordering is coherent, so you **route by document id** to a specific server/shard (sticky, consistent-hashed). Different documents scale out horizontally.

**Interview nuance:** the killer follow-up is offline editing. If a laptop edits offline for an hour and reconnects, you cannot LWW. You must replay/merge the queued ops against everything that happened meanwhile. CRDTs make this natural (merge is commutative); OT requires transforming the whole queued batch against the missed history.

**Recap:** converge concurrent edits with OT (server-ordered, transform indices, memory-lean, Docs-style) or CRDTs (per-character ids, commutative merge, offline/P2P-friendly), broadcast ephemeral presence over WebSocket, persist an op log plus snapshots for replay and reconnect, and route all editors of a document to one server for coherent ordering.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A laptop edits offline for an hour and then reconnects. What has to happen?",
  "options": [
    {
      "label": "Its queued operations merge against the hour it missed",
      "correct": true,
      "feedback": "Right, this is the killer follow-up, and both families answer it at different cost. A CRDT merge is commutative, so the queued ops merge in whatever order they arrive. OT has to transform the whole queued batch against an hour of history it never saw."
    },
    {
      "label": "The server's version wins, since the server is the ordering authority",
      "feedback": "That is last write wins on the document, the disqualifying answer. It throws away an hour of real work."
    },
    {
      "label": "The laptop's version wins, since its operations carry the newest timestamps",
      "feedback": "The same failure pointing the other way. Both sides made real edits, and convergence means preserving both intents, not picking a winner."
    }
  ],
  "reveal": "Convergence is the whole problem: every replica must end byte-for-byte identical while preserving what each person meant, which rules out last write wins on the document. OT transforms an incoming operation against the ops already applied locally, adjusting indices, and leans on a server for a canonical order. CRDTs give every character a unique id so operations commute and any merge order converges, at the cost of per character metadata and tombstone collection. Around either one: WebSocket transport with presence on a lighter, unpersisted channel, an op log plus snapshots for replay and reconnect, and routing by document id so all editors of a document share one ordering."
}
\`\`\`
`.trim()

const yelpNearbyTeach = `
## Why nearby-places is the opposite of Uber matching

Yelp's "nearby places" looks like Uber matching at first glance (both are "find things near me"), and the whole lesson is why it is actually the **opposite** workload. In Uber, the points (drivers) move every few seconds, so writes dominate and you keep the index in memory as overwrites. In Yelp, the points (restaurants, shops, POIs) barely move; a place's location changes essentially never, its hours and rating change rarely. The workload is **read-heavy over a mostly-static dataset**, which flips every design decision toward precomputation, denormalization, and aggressive caching.

Scale assumption: tens of millions of POIs, very high read QPS, queries like "coffee within 2km, open now, sorted by rating and distance." The spatial part is only half the query; the other half is **attribute filtering** (category, open-now, price, minimum rating) and **ranking**.

## The spatial index is a search engine

You still bucket coordinates into cells (geohash, quadtree, or S2), so a radius query hits a cell plus its neighbors. But instead of a bespoke in-memory geo service, the natural home is a **search engine (Elasticsearch/OpenSearch)** with a native \`geo_distance\` filter, because it does spatial filtering, attribute filtering, full-text ("coffee"), and ranking in one query. This is the key architectural difference from Uber: Yelp's index is a search index you can rebuild from source, not a volatile live index.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "A read model you can rebuild, in front of a store that rarely changes",
  "reveal": "all",
  "nodes": [
    {
      "id": "source",
      "label": "Source of truth (Postgres or a document store): places, hours, reviews",
      "kind": "db"
    },
    {
      "id": "pipeline",
      "label": "Update pipeline (place edits and new reviews, a low rate)",
      "kind": "service"
    },
    {
      "id": "es",
      "label": "Elasticsearch read model: geo_distance over cells, attribute filters, text, ranking in one query",
      "kind": "db"
    },
    {
      "id": "query",
      "label": "Query: coffee within 2km, open now",
      "kind": "client"
    },
    {
      "id": "cache",
      "label": "Result cache: popular (cell, filter) pages on generous TTLs",
      "kind": "cache"
    },
    {
      "id": "results",
      "label": "Ranked results: distance, rating, review count, sponsored boost",
      "kind": "client"
    },
    {
      "id": "detail",
      "label": "Place detail in Redis, photos and media on a CDN",
      "kind": "cache"
    }
  ],
  "edges": [
    {
      "from": "source",
      "to": "pipeline",
      "kind": "async",
      "label": "on the rare edit"
    },
    {
      "from": "pipeline",
      "to": "es",
      "kind": "sync",
      "label": "denormalized, and rebuildable from source"
    },
    {
      "from": "query",
      "to": "cache",
      "kind": "sync"
    },
    {
      "from": "cache",
      "to": "es",
      "kind": "sync",
      "label": "on a miss only"
    },
    {
      "from": "es",
      "to": "results",
      "kind": "sync"
    },
    {
      "from": "cache",
      "to": "results",
      "kind": "sync",
      "label": "where the overwhelming majority of reads end"
    },
    {
      "from": "results",
      "to": "detail",
      "kind": "sync",
      "label": "the tapped place"
    }
  ],
  "caption": "Uber's index is volatile because drivers move; this one is a search index you can rebuild, which is what earns the TTLs. The exception is open-now: apply that filter at request time rather than baking it into the cached page."
}
\`\`\`

## Query flow, storage, caching

Query flow: (1) candidate generation by spatial cell/radius; (2) attribute filter: category, open-now (computed from stored hours plus current time), price band, minimum rating; (3) rank by a blend of distance, rating, review count/popularity, and sponsored boost.

Source of truth for places, reviews, and edits lives in a relational or document store. A **denormalized read model** (the ES index) is what queries hit. Place **detail** pages go in a KV cache (Redis). Photos and media sit on a CDN.

Because the underlying data is stable, you cache hard: popular \`(cell, filter)\` result pages and place-detail pages get **generous TTLs** (minutes to hours). A search for "coffee near downtown SF, open now" is asked constantly and its answer barely changes, so it should be served from cache the overwhelming majority of the time. Invalidate on the rare place update rather than expiring everything constantly. Reads scale with replicas (ES read replicas) and CDN edge caching.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Open now is computed from a place's stored hours and the current time. You are caching popular result pages for an hour. What goes wrong?",
  "options": [
    {
      "label": "A closed shop keeps appearing as open until the entry expires",
      "correct": true,
      "feedback": "Right. Every other filter here, category, price band, minimum rating, is a property of the data, so a cached page only goes stale when the data changes. Open now is a property of the clock, so the answer rots on its own with nothing to invalidate it."
    },
    {
      "label": "Nothing, because the hours are stored data and the entry is invalidated whenever a place is edited",
      "feedback": "Invalidation on edit is the right policy for this workload, and it is the wrong tool here: nobody edited the place. The shop closed because the clock moved past its closing time."
    },
    {
      "label": "The ranking drifts during the hour, because new reviews change the ratings it sorted on",
      "feedback": "True and tolerable: an hour old ordering by rating is a slightly stale ordering, not a wrong answer. Claiming a closed shop is open is a wrong answer."
    },
    {
      "label": "The cache key collides, since the current time is not part of the query",
      "feedback": "Nothing collides: every request for that query string is answered from one entry, which is exactly what makes the cache worth having. The problem is that the one entry stops being true."
    }
  ]
}
\`\`\`

That is the one filter that fights the caching policy. Keep open-now evaluation out of the cached artifact (cache the candidate set and apply the hours filter at request time), or give result pages carrying that filter a TTL of minutes rather than hours.

\`\`\`cswidget
{
  "type": "cache-sim",
  "title": "What a small result cache buys, and what open-now costs it",
  "predictPrompt": {
    "question": "Twenty distinct (cell, filter) result pages, one of them asked about half the time, and a cache that holds only eight of them. What hit ratio would you expect?",
    "options": [
      "About 40 percent, matching the 8 of 20 pages it can hold",
      "Well above half, because the popular pages are asked far more often than the rare ones",
      "Near zero until the cache is large enough to hold every page",
      "About 5 percent, since a new query almost always arrives"
    ]
  },
  "workedExample": "The stream is 240 searches over 20 distinct (cell, filter) pages, skewed the way real search traffic is: one page takes about half the requests. A cache holding 8 of those 20 pages serves 153 of the 240 searches, a hit ratio of about 64 percent, and leaves 87 reads for Elasticsearch. Capacity is not what earns that; skew is. Now model the open-now filter by dropping the TTL from 120 ticks to 12, because an answer that depends on the current time cannot be held for hours. The hit ratio falls to about 45 percent, Elasticsearch takes 131 reads instead of 87, and the hot page piles up 5 rebuilds at once because every miss during a rebuild launches another one. Turn coalescing on and that pile-up is capped at 1.",
  "seed": "yelp-nearby",
  "keys": 20,
  "ticks": 240,
  "capacity": 8,
  "ttl": 120,
  "rebuildTicks": 6,
  "caption": "This is why open-now is the filter that fights the caching policy: it is the one attribute whose answer changes without any place being edited, so either it comes out of the cached artifact and is applied at request time, or its pages carry a TTL of minutes."
}
\`\`\`

New reviews, edits, and new places are comparatively low-rate. They update the source of truth, then flow through an indexing pipeline that updates the ES read model and invalidates affected cache entries. You never optimize this path for high throughput because the workload does not have it.

**Interview nuance:** the trap is to over-engineer the write path. If you find yourself building a high-frequency location-write ingestion system or geofencing with constant updates, you have modeled Yelp like Uber and wasted your design budget on throughput the workload never generates. The senior move is to explicitly state "this is read-heavy and mostly static, so I precompute and cache instead of optimizing writes."

**Recap:** nearby-places is read-heavy over a near-static POI set, so serve it from a search engine (geo_distance plus attribute filters plus ranking) fed by a denormalized read model, cache popular result pages and detail pages with generous TTLs invalidated on rare edits, and do not over-build the low-rate write path.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Which component answers coffee within 2km, open now, at least four stars, ranked by rating and distance, in one hop?",
  "options": [
    {
      "label": "The search engine index over a denormalized read model",
      "correct": true,
      "feedback": "Right. The spatial part is only half the query: geo distance, category, open now, price band, minimum rating and the ranking all resolve in a single pass over one index. It is that combination, not the geo filter alone, that makes a search engine the natural home."
    },
    {
      "label": "The relational source of truth, with a spatial index added to the places table",
      "feedback": "It can do the geo part, but multi attribute filtering, text and ranking in a single query is what the search engine is for, and you do not want that load on the system of record."
    },
    {
      "label": "A Redis geo index holding every place, refreshed on each read",
      "feedback": "Redis geo commands do proximity, not category, open now, price band and ranked results. Refreshing on read also throws away the caching this workload lives on."
    }
  ],
  "reveal": "This is Uber inverted, and naming the inversion is the answer. The points barely move, so the index is a search index you can rebuild from the source of truth rather than a volatile live one, fed by a low rate indexing pipeline. Queries are candidate generation by cell or radius, then attribute filtering, then ranking on distance, rating, popularity and sponsorship. Because the data is stable you cache hard, with generous TTLs on popular result pages and detail pages, invalidated on the rare edit. The trap is spending your design budget on a write path this workload does not have."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A very popular key's TTL lapses, and ten thousand concurrent requests miss on it in the same instant. What fixes this specific failure?",
  "options": [
    {
      "label": "Request coalescing so one in flight fetch serves all the waiters, plus jittered TTLs so keys do not expire together",
      "correct": true,
      "feedback": "Right. This is a stampede, and the fix is to collapse the concurrent misses into one database read and to stop keys from expiring in lockstep. Serving stale while revalidating does the same job."
    },
    {
      "label": "Raise the TTL so the key expires far less often",
      "feedback": "That makes the event rarer without making it survivable, and the stampede is just as large when it finally happens."
    },
    {
      "label": "Add more cache nodes so the missing requests spread across the fleet",
      "feedback": "The key lives on one node either way, and the misses all fall through to the same database. More cache capacity does not help a key that is not there."
    },
    {
      "label": "Switch eviction from LRU to LFU so a popular key is never evicted",
      "feedback": "LFU does protect a popular key against eviction pressure, which is a different failure. This key was not evicted, its TTL expired, and every policy allows that."
    }
  ]
}
\`\`\`

## Stampedes and hot keys

A cache stampede happens when a hot key expires and thousands of concurrent requests all miss and hit the DB at once. Fix it with request coalescing (a single in-flight fetch per key, others wait for its result), a short randomized TTL jitter so keys do not all expire together, or serving stale-while-revalidate. A hot key is a single key so popular it saturates one node's CPU or network. Consistent hashing alone does not help because it is one key on one node, so replicate the hot entry across several nodes and randomize which replica a client reads, or add a small local in-process cache in front of the distributed tier.

Replication gives availability: each shard has a primary and one or more replicas, with async replication for speed (and a small window of lost writes on failover) or sync for safety. On primary failure a sentinel or the cluster gossip promotes a replica.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "One GET, and what happens when it misses",
  "reveal": "all",
  "nodes": [
    {
      "id": "client",
      "label": "Client: GET k",
      "kind": "client"
    },
    {
      "id": "ring",
      "label": "Consistent hash ring (100 to 200 virtual nodes per physical node)",
      "kind": "service"
    },
    {
      "id": "n3",
      "label": "Node N3: the first node clockwise from hash(k)",
      "kind": "cache"
    },
    {
      "id": "n5",
      "label": "Node N5: hot-key replica",
      "kind": "cache"
    },
    {
      "id": "n7",
      "label": "Node N7: hot-key replica",
      "kind": "cache"
    },
    {
      "id": "coalesce",
      "label": "Request coalescing: one in-flight fetch per key, the rest wait for it",
      "kind": "service"
    },
    {
      "id": "db",
      "label": "Database",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "client",
      "to": "ring",
      "kind": "sync",
      "label": "hash(k), never hash mod N"
    },
    {
      "from": "ring",
      "to": "n3",
      "kind": "sync",
      "label": "the owner"
    },
    {
      "from": "ring",
      "to": "n5",
      "kind": "sync",
      "label": "hot key: the client picks a replica at random"
    },
    {
      "from": "ring",
      "to": "n7",
      "kind": "sync"
    },
    {
      "from": "n3",
      "to": "coalesce",
      "kind": "sync",
      "label": "miss"
    },
    {
      "from": "coalesce",
      "to": "db",
      "kind": "sync",
      "label": "one read, however many waiters"
    },
    {
      "from": "db",
      "to": "n3",
      "kind": "feedback",
      "label": "SET k with a jittered TTL"
    }
  ],
  "caption": "Consistent hashing spreads keys; it does nothing for a single hot key, because that is one key on one node. Replication answers the hot key, coalescing plus TTL jitter answers the stampede."
}
\`\`\`

**Recap:** place keys with consistent hashing plus virtual nodes (never hash mod N), evict with LRU or LFU plus TTL, choose cache-aside by default, and defend hot keys with replication and stampedes with coalescing plus TTL jitter.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each failure by whether consistent hashing with virtual nodes is the fix.",
  "buckets": [
    "Consistent hashing plus virtual nodes fixes it",
    "Needs a different mechanism"
  ],
  "items": [
    {
      "label": "One physical node owning twice its share of the key space",
      "bucket": "Consistent hashing plus virtual nodes fixes it",
      "feedback": "This is what virtual nodes are for. Raw ring positions are random and come out lumpy; 100 to 200 points per physical node average that away."
    },
    {
      "label": "A dead node's whole key range landing on the next node clockwise",
      "bucket": "Consistent hashing plus virtual nodes fixes it",
      "feedback": "That is what happens with one point per node. With virtual nodes the dead node's points are scattered around the ring, so its load spreads over many survivors instead of one."
    },
    {
      "label": "One key so popular it saturates a single node's CPU and network",
      "bucket": "Needs a different mechanism",
      "feedback": "One key hashes to one point on the ring no matter how good the placement is. Replicate that entry across several nodes and read a random one, or add a small in process cache in front."
    },
    {
      "label": "Ten thousand requests missing at once when a hot key's TTL lapses",
      "bucket": "Needs a different mechanism",
      "feedback": "Placement is irrelevant to a stampede. Coalesce the in flight fetch, jitter the TTLs, or serve stale while revalidating."
    },
    {
      "label": "A scan of cold keys evicting the small set that everything reads",
      "bucket": "Needs a different mechanism",
      "feedback": "This is an eviction policy question. LRU treats the scan as recent and throws the popular set out; LFU keeps what is read often, which is exactly the case it beats LRU on."
    },
    {
      "label": "A node dying while the keys it held still have to be served",
      "bucket": "Needs a different mechanism",
      "feedback": "The ring decides where those keys go next, and it holds no data. Serving them without a trip to the database needs a replica per shard, promoted by a sentinel or by cluster gossip."
    }
  ],
  "reveal": "Three questions, three answers. Placement is consistent hashing with virtual nodes, never hash mod N, because mod N reshuffles the world on any membership change and stampedes the database. Eviction is LRU by default, LFU when a small popular set must survive a scan, with TTL almost always on as well, and Redis samples rather than maintaining exact recency so writes stay O(1). Survival is per failure: replicate a hot key and read a random replica, coalesce plus jitter against a stampede, and keep primary and replicas per shard so a failover is a promotion rather than an outage."
}
\`\`\`
`.trim()

const keyValueStoreTeach = `
## The Dynamo lineage: scale by trading away single-machine transactions

A distributed key-value store is the Dynamo-lineage system (DynamoDB, Cassandra, Riak) that gives you horizontal scale and no single point of failure by trading away single-machine transactions. The interview tests four internals: partitioning, replication and quorums, conflict resolution, and the write path (LSM).

## Partitioning and quorums

Partitioning uses consistent hashing again. Keys map onto a ring, each node owns a range, and a replication factor N means each key is stored on the N nodes clockwise from its position (the preference list). Virtual nodes even out the load.

Replication and quorums are the heart. With N replicas, a write is acknowledged after W replicas confirm and a read waits for R replicas to respond. The tunable rule is: if R + W > N, a read quorum and a write quorum must overlap in at least one node, so a read is guaranteed to see the latest acknowledged write. Common settings: N=3, W=2, R=2 gives strong-ish reads with tolerance for one node down. W=1 is fast writes but risky; R=1 is fast reads that may be stale.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You set N=3, W=2, R=2, so any read quorum overlaps any write quorum. Have you made the store linearizable?",
  "options": [
    {
      "label": "No: overlap buys freshness, not a single order over all operations",
      "correct": true,
      "feedback": "Right, and saying it this precisely is the seniority signal. Overlap guarantees a value at least as new as the last acknowledged write, and says nothing about concurrent writes, read-repair timing or sloppy quorums, so anomalies remain. Quorum overlap is a freshness property, not a global order."
    },
    {
      "label": "Yes: an overlapping node is guaranteed to hold the latest write, which is what linearizability means",
      "feedback": "Linearizability is a total order over every operation, not a guarantee about one node's copy. Two concurrent writes have no acknowledged winner for the overlap to reveal."
    },
    {
      "label": "Yes, provided the replicas keep their clocks synchronized with NTP",
      "feedback": "Timestamps are how last write wins picks a winner, and clock skew is one of its failure modes. No amount of clock discipline turns quorum overlap into consensus."
    },
    {
      "label": "No, but raising R and W to 3 would, since then every replica participates in both",
      "feedback": "Reading and writing all replicas maximizes freshness and destroys availability, and it still does not order two concurrent writes. For a true global order you need Paxos or Raft."
    }
  ]
}
\`\`\`

**Interview nuance:** the classic trap is claiming R + W > N gives linearizability. It does not. It guarantees you read a value at least as new as the last acknowledged write on the overlapping node, but concurrent writes, read-repair timing, and sloppy quorums (hinted handoff writing to fallback nodes) mean you can still see anomalies. Say "quorum overlap gives read-your-writes-ish freshness, not linearizability; for true linearizability you need consensus like Paxos or Raft."

## Conflicts and reconciliation

Conflicts happen because two clients can write the same key on different replicas during a partition. Resolution options: last-write-wins (LWW) by timestamp is simple but silently drops one write and is vulnerable to clock skew. Vector clocks track causality so you can detect true concurrency and either merge or hand both versions (siblings) to the application. Cassandra uses LWW; Dynamo used vector clocks. Replicas that drift are reconciled two ways: read-repair (on a read, if replicas disagree, push the newest to the stale ones) and anti-entropy using Merkle trees (nodes exchange hash trees of their ranges and only sync the differing subtrees, avoiding a full scan).

\`\`\`cswidget
{
  "type": "partition-sim",
  "title": "Concurrent writes to one key: LWW vs vector clocks",
  "predictPrompt": {
    "question": "During the partition, side A accepts city = Detroit while side B accepts city = Ann Arbor for the same key. When the link heals, what does last-write-wins by timestamp do with these two writes?",
    "options": [
      "It keeps both values as siblings and hands them to the application",
      "It keeps whichever write carries the later timestamp and silently drops the other",
      "It rejects both writes and asks the clients to retry",
      "It blocks reads on that key until an operator resolves the conflict"
    ]
  },
  "workedExample": "Cut the link and both replicas keep accepting writes, the availability choice a Dynamo-style store makes: one client sets the city to Detroit on side A while another sets it to Ann Arbor on side B, and neither replica knows about the other write. Heal the partition and compare the strategies. Last-write-wins by timestamp keeps whichever write happens to carry the later timestamp and silently drops the other, and clock skew between replicas can make the dropped write the one the user actually intended. A vector clock instead tracks causality: neither write descends from the other, so this is true concurrency, and the store hands both versions back as siblings for the application to merge or choose. That is the exact tradeoff in the prose above: Cassandra accepts the simple silent resolution, Dynamo surfaces siblings so no write is lost without the application deciding.",
  "kind": "register",
  "writes": [
    {
      "side": "A",
      "value": "Detroit",
      "label": "Client 1 sets city = Detroit on side A"
    },
    {
      "side": "B",
      "value": "Ann Arbor",
      "label": "Client 2 sets city = Ann Arbor on side B"
    }
  ],
  "strategies": [
    "lww",
    "version-vector"
  ],
  "caption": "Quorum overlap cannot save you here: these writes are concurrent, so the store must either drop one (LWW) or surface both (siblings). Read-repair then pushes the resolved value to stale replicas."
}
\`\`\`

## The LSM write path

A write appends to a commit log for durability, then updates an in-memory sorted structure (memtable). When the memtable fills, it flushes to an immutable sorted file on disk (SSTable). Every write is therefore sequential and fast, and nothing is ever updated in place.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An LSM write only appends to a commit log and updates an in-memory memtable. Where does the cost reappear?",
  "options": [
    {
      "label": "On reads, which now have several places to look for one key",
      "correct": true,
      "feedback": "Right. Sequential writes are bought by scattering a key's history across the memtable and a pile of immutable SSTables, so a read may have to consider all of them. Two mechanisms keep that bounded: a bloom filter per SSTable, which skips files that cannot hold the key, and background compaction, which merges files and drops tombstones."
    },
    {
      "label": "Nowhere: the memtable answers reads, because it holds the working set",
      "feedback": "The memtable is bounded and flushes when it fills, so most data lives in immutable SSTables that a read has to consider."
    },
    {
      "label": "On writes: the commit log has to be read back before each append",
      "feedback": "The commit log is append only and is read only during crash recovery. Keeping writes sequential is the entire point of the structure."
    }
  ]
}
\`\`\`

Reads may check several SSTables, so a bloom filter per SSTable skips ones that cannot contain the key. Background compaction merges SSTables, drops tombstones (deletes), and keeps read amplification bounded.

Membership uses gossip: nodes periodically exchange state so the cluster learns of joins and failures without a central coordinator. Hinted handoff keeps writes available during a brief node outage: a neighbor accepts the write with a hint and replays it when the owner returns.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "A write down the preference list, and where it lands on disk",
  "reveal": "all",
  "nodes": [
    {
      "id": "client",
      "label": "Client: write k=v",
      "kind": "client"
    },
    {
      "id": "coord",
      "label": "Coordinator (any node): forwards to the preference list, acks after W replicas confirm",
      "kind": "service"
    },
    {
      "id": "n1",
      "label": "Replica N1",
      "kind": "db"
    },
    {
      "id": "n2",
      "label": "Replica N2",
      "kind": "db"
    },
    {
      "id": "n3",
      "label": "Replica N3",
      "kind": "db"
    },
    {
      "id": "log",
      "label": "Commit log (append-only, for durability)",
      "kind": "db"
    },
    {
      "id": "memtable",
      "label": "Memtable (in memory, sorted)",
      "kind": "cache"
    },
    {
      "id": "sstable",
      "label": "SSTable: immutable, sorted, one bloom filter per file",
      "kind": "db"
    },
    {
      "id": "read",
      "label": "Read: waits for R replicas, and R + W > N forces the quorums to overlap",
      "kind": "service"
    },
    {
      "id": "repair",
      "label": "Read repair, plus Merkle-tree anti-entropy between nodes",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "client",
      "to": "coord",
      "kind": "sync"
    },
    {
      "from": "coord",
      "to": "n1",
      "kind": "sync",
      "label": "N replicas clockwise on the ring"
    },
    {
      "from": "coord",
      "to": "n2",
      "kind": "sync"
    },
    {
      "from": "coord",
      "to": "n3",
      "kind": "sync"
    },
    {
      "from": "n1",
      "to": "log",
      "kind": "sync",
      "label": "every write is a sequential append"
    },
    {
      "from": "log",
      "to": "memtable",
      "kind": "sync"
    },
    {
      "from": "memtable",
      "to": "sstable",
      "kind": "async",
      "label": "flush when it fills; nothing is updated in place"
    },
    {
      "from": "n1",
      "to": "read",
      "kind": "sync",
      "label": "R responses, not all N"
    },
    {
      "from": "n2",
      "to": "read",
      "kind": "sync"
    },
    {
      "from": "n3",
      "to": "read",
      "kind": "sync"
    },
    {
      "from": "read",
      "to": "repair",
      "kind": "async",
      "label": "replicas disagree: push the newest to the stale ones"
    }
  ],
  "caption": "Quorum overlap buys freshness, not linearizability: concurrent writes, read-repair timing and sloppy quorums still allow anomalies, and true linearizability needs consensus."
}
\`\`\`

**Recap:** partition with consistent hashing and replication factor N, tune consistency with R + W > N (which is freshness, not linearizability), resolve conflicts with vector clocks or LWW plus read-repair and Merkle anti-entropy, and store writes in an LSM (commit log, memtable, SSTable, compaction).

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Pick the sentence you would actually say about tuning N, R and W.",
  "options": [
    {
      "label": "Quorum overlap buys freshness; a global order needs consensus",
      "correct": true,
      "feedback": "Right. It concedes exactly what quorums cannot do, freshness relative to the last acknowledged write rather than a total order over operations, and it names what would buy the order: consensus such as Paxos or Raft. That pairing is what the interviewer is listening for."
    },
    {
      "label": "R plus W greater than N gives linearizability without paying for consensus",
      "feedback": "This is the classic trap. Overlap is not a total order, and stating it as one invites the follow-up that ends the round."
    },
    {
      "label": "W equal to 1 with R equal to N is safest, since every read consults every replica",
      "feedback": "Reading all replicas surfaces the newest value they hold, but W equal to 1 means one acknowledged replica can die before replicating, so the write you were relying on may exist nowhere."
    }
  ],
  "reveal": "Four internals, and the answer touches all four. Partitioning is consistent hashing with virtual nodes, with a replication factor N defining each key's preference list. Consistency is tunable through R and W, which buy freshness, not linearizability. Conflicts are inevitable because both sides of a partition accept writes, so you either take last write wins and silently drop one, or track causality with vector clocks and hand back siblings, then reconcile drift with read-repair and Merkle tree anti-entropy. Writes go through an LSM: commit log, memtable, SSTable flush, bloom filters and compaction, with gossip membership and hinted handoff keeping the cluster available."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "S3 promises strong read-after-write consistency, yet an object's bytes are spread over k plus m shards on many disks. Where does the guarantee come from?",
  "options": [
    {
      "label": "From the metadata index, which is the point of truth",
      "correct": true,
      "feedback": "Right. Readers find an object only through the index, so the write is not acknowledged until the index entry naming the new shards is durable and visible. Making the index commit the acknowledgement point is what makes a new version appear atomically."
    },
    {
      "label": "From writing all k plus m shards synchronously before acknowledging",
      "feedback": "The shards are durable before the ack, but durability is not visibility. Until the index points at them, no reader can find them."
    },
    {
      "label": "From a read quorum across the shard holders on every GET",
      "feedback": "A GET reads only the shards it needs for the requested bytes. What orders the new version ahead of the old one is the metadata commit, not a vote."
    }
  ]
}
\`\`\`

## Consistency and large objects

S3 now offers strong read-after-write consistency for new objects and overwrites, achieved by making the metadata commit the point of truth (the write is not acknowledged until the index update is durable and visible). Versioning keeps old versions instead of overwriting, so a PUT to an existing key writes a new version and the index points at the latest.

Multipart upload lets a client split a large object into parts, upload them in parallel (and retry individual failed parts), and then issue a complete call that assembles them, which is how you upload terabytes reliably. Range GET lets a reader fetch bytes [start, end], essential for video seeking and resumable downloads; the store reads only the shards covering that range.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Every object is checksummed and stored as k data plus m parity shards across racks. Is durability now settled?",
  "options": [
    {
      "label": "No: durability is a maintenance process, not a write property",
      "correct": true,
      "feedback": "Right. Disks fail and bits rot over years, so the surviving shard count only ever falls unless something pushes it back up. A scrubber has to keep detecting bad or missing shards and reconstructing them from the survivors, or the object eventually drifts past m and is gone."
    },
    {
      "label": "Yes: the code tolerates m simultaneous losses, so the object survives",
      "feedback": "It tolerates m losses at any one moment. Nothing stops a fourth and fifth disk from failing over the following months if the first three were never rebuilt."
    },
    {
      "label": "Yes, because spreading shards across racks and availability zones decorrelates the failures",
      "feedback": "Spreading makes simultaneous loss unlikely, which is necessary and not sufficient. Without reconstruction the surviving shard count only ever falls."
    }
  ]
}
\`\`\`

Background health: every shard is checksummed on write and periodically scrubbed. A scrubber detects bit rot or a failed disk, reconstructs the lost shards from the survivors, and rebalances data when nodes are added or removed, which is how durability is maintained over years, not just at write time. Lifecycle policies tier cold objects to cheaper storage (S3 to Glacier).

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Erasure coding on the way in, a range read on the way out",
  "reveal": "all",
  "nodes": [
    {
      "id": "put",
      "label": "PUT object",
      "kind": "client"
    },
    {
      "id": "api",
      "label": "Storage API (stateless front door)",
      "kind": "service"
    },
    {
      "id": "coder",
      "label": "Erasure coder: k data shards plus m parity (Reed-Solomon), 10 + 4 costs 40 percent overhead",
      "kind": "service"
    },
    {
      "id": "placement",
      "label": "Placement across different disks, racks and availability zones",
      "kind": "service"
    },
    {
      "id": "shards",
      "label": "Shard stores: any k of the k + m shards reconstruct the object",
      "kind": "db"
    },
    {
      "id": "meta",
      "label": "Metadata store: bucket plus key to shard map, range-partitioned so a prefix listing does not touch every shard",
      "kind": "db"
    },
    {
      "id": "get",
      "label": "GET with a byte range",
      "kind": "client"
    },
    {
      "id": "reader",
      "label": "Range read: only the shards covering the range, reconstructing if one is missing",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "put",
      "to": "api",
      "kind": "sync"
    },
    {
      "from": "api",
      "to": "coder",
      "kind": "sync"
    },
    {
      "from": "coder",
      "to": "placement",
      "kind": "sync",
      "label": "k + m shards"
    },
    {
      "from": "placement",
      "to": "shards",
      "kind": "sync"
    },
    {
      "from": "placement",
      "to": "meta",
      "kind": "sync",
      "label": "commit the shard map last"
    },
    {
      "from": "get",
      "to": "reader",
      "kind": "sync"
    },
    {
      "from": "meta",
      "to": "reader",
      "kind": "sync",
      "label": "where the shards are"
    },
    {
      "from": "shards",
      "to": "reader",
      "kind": "sync",
      "label": "read amplification when a shard is gone"
    }
  ],
  "caption": "Three-way replication costs 200 percent overhead and tolerates fewer losses than 10 + 4 does at 40 percent. The price of erasure coding is CPU on write and a degraded read when a shard is missing."
}
\`\`\`

**Recap:** hit 11 nines with erasure coding (k + m Reed-Solomon, roughly 1.4x overhead) instead of 3x replication, scale the metadata index by partitioning bucket+key across a KV store, give strong read-after-write via a durable metadata commit, support multipart upload and range GET, and maintain durability with checksums, scrubbing, and reconstruction.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Erasure coding is the default for the bulk of an exabyte catalog. Where does plain three-copy replication still win?",
  "options": [
    {
      "label": "On hot small objects, where a read is one copy and no reconstruction",
      "correct": true,
      "feedback": "Right. Erasure coding is paid for in CPU on write and in read amplification whenever a shard is missing, since a degraded read has to fetch k survivors and reconstruct. A replicated read takes any single whole copy, so the objects you serve constantly and cheaply are the ones that keep it."
    },
    {
      "label": "Nowhere: once the code is implemented, erasure coding is strictly cheaper",
      "feedback": "Cheaper in storage, yes, roughly 1.4x against 3x. It is not free: you pay encode CPU on every write and reconstruction work on every degraded read, which is a bad trade for a small object served constantly."
    },
    {
      "label": "On the coldest archive tier, where nobody notices a slow degraded read",
      "feedback": "Backwards. Cold bulk data is where the storage multiplier dominates and latency does not, which is exactly the case erasure coding was made for."
    },
    {
      "label": "On objects that must survive more than m simultaneous shard losses",
      "feedback": "Raise m and the code survives more losses at a little more overhead. Three copies tolerate only two losses, so replication is the weaker option on that axis, not the stronger one."
    }
  ],
  "reveal": "This is a durability engineering problem, and cost is the axis. Erasure coding stores k data plus m parity shards so any k reconstruct the object, giving more tolerance than 3x replication at roughly 1.4x overhead, paid for in encode CPU and degraded read amplification. The metadata index is the other half of the system: bucket plus key partitioned across a scalable store, sorted and range partitioned so prefix listing does not touch every shard, and committed durably before the ack, which is where strong read-after-write comes from. Multipart upload and range GET make huge objects practical, and checksums plus scrubbing plus reconstruction keep the eleven nines true over years."
}
\`\`\`
`.trim()

const messageQueueTeach = `
## The backbone of async systems

A distributed log (Kafka, Pulsar, Kinesis) is the backbone of async systems: producers append events, consumers read them at their own pace, and the log decouples the two. The interview tests the log abstraction, delivery semantics (the famous exactly-once question), and how consumers scale.

## The append-only log

The core data structure is an append-only commit log. A topic is split into partitions, and each partition is an ordered, immutable sequence of messages identified by a monotonically increasing offset. Ordering is guaranteed only within a partition, not across the topic, which is the key constraint: if you need messages for a given user in order, you must route them all to the same partition (partition by user id). This is what lets Kafka scale, because different partitions live on different brokers and are read and written in parallel.

Durability comes from replication. Each partition has a leader and followers; the leader takes writes and followers replicate. The in-sync replicas (ISR) are those caught up to the leader. A producer's \`acks\` setting controls durability: \`acks=1\` acks after the leader writes (fast, can lose data if the leader dies before replication), \`acks=all\` acks only after all ISR replicas have the message (durable, higher latency). On leader failure a follower in the ISR is elected leader. Data is retained by time or size, or compacted (keep only the latest value per key) for changelog topics.

## Delivery semantics

At-most-once means a message may be lost but never redelivered (fire and forget, no retries). At-least-once means every message is delivered but may be duplicated (retry on failure, ack after processing), which is the pragmatic default.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A candidate says: we will use exactly-once delivery, so a consumer never sees a duplicate. What is the correct framing?",
  "options": [
    {
      "label": "At-least-once delivery plus idempotent consumers",
      "correct": true,
      "feedback": "Right. Delivery over a network cannot be exactly once, so the guarantee moves into processing: the consumer dedupes on a message id or an idempotency key, and reprocessing a duplicate has no effect. That pairing is what people mean when they say exactly-once processing."
    },
    {
      "label": "At-most-once delivery, which is the only setting that truly prevents duplicates",
      "feedback": "It does prevent duplicates, by losing messages instead. That is a different guarantee and almost never the one a business wants."
    },
    {
      "label": "Kafka does offer exactly-once delivery, so the claim stands",
      "feedback": "Kafka's exactly-once is idempotent producers, which drop duplicate appends by producer id and sequence number, plus transactions tying the consume-process-produce cycle to an atomic offset commit. The delivery underneath is still at-least-once."
    }
  ]
}
\`\`\`

Exactly-once is the hard one, and the crucial nuance is that exactly-once delivery over a network is impossible; what systems provide is exactly-once processing.

**Interview nuance:** if you claim "exactly-once delivery," expect a challenge. The correct framing: we get at-least-once delivery from the broker plus idempotent consumers (dedupe on a message id or use an idempotency key) so that reprocessing a duplicate has no effect. Kafka's "exactly-once" is at-least-once delivery combined with idempotent producers (a producer id plus sequence number so the broker drops duplicate appends) and transactional writes that tie the consume-process-produce cycle to an atomic offset commit.

## Consumer scaling

Consumer groups: each partition is assigned to exactly one consumer in a group, so parallelism is capped at the partition count. Consumers track their position with committed offsets. When a consumer joins or dies, the group rebalances partition assignments. Two subtleties: commit the offset after processing (at-least-once) not before (which would be at-most-once and lose messages on crash), and backpressure is natural because a slow consumer just lags (its offset falls behind) rather than dropping data. A poison message that keeps failing goes to a dead-letter topic after N retries so it does not block the partition. Producers batch messages to trade latency for throughput.

\`\`\`
producer --partition by key--> topic P0 [m0 m1 m2 ...]  (leader + ISR followers)
                               topic P1 [n0 n1 n2 ...]
consumer group G: P0 -> C1, P1 -> C2   (one partition per consumer)
   process msg -> commit offset  (at-least-once) ; dedupe by id -> exactly-once processing
\`\`\`

\`\`\`cswidget
{
  "type": "steps",
  "title": "Consumer group G as consumers and partitions come and go",
  "frames": [
    {
      "note": "Two partitions, two consumers. Each partition is assigned to exactly one consumer in the group, so both have work, and every message routed to P0 is processed in offset order.",
      "rows": [
        {
          "label": "P0",
          "cells": [
            {
              "text": "m0"
            },
            {
              "text": "m1"
            },
            {
              "text": "m2"
            }
          ]
        },
        {
          "label": "P1",
          "cells": [
            {
              "text": "n0"
            },
            {
              "text": "n1"
            },
            {
              "text": "n2"
            }
          ]
        },
        {
          "label": "group G",
          "cells": [
            {
              "text": "C1 reads P0"
            },
            {
              "text": "C2 reads P1"
            }
          ]
        }
      ]
    },
    {
      "predict": {
        "question": "A third consumer joins group G and the topic still has two partitions. What does C3 do?",
        "options": [
          "Takes a share of both partitions, so throughput rises by half",
          "Sits idle, because a partition goes to exactly one consumer in a group",
          "Takes over P1, and C2 becomes its standby",
          "Splits P0 by key, so C1 and C3 both read it"
        ]
      },
      "note": "C3 sits idle. Parallelism inside a consumer group is capped by the partition count, so a consumer beyond that count is spare capacity for the next rebalance, not extra throughput.",
      "rows": [
        {
          "label": "P0",
          "cells": [
            {
              "text": "m0",
              "state": "dim"
            },
            {
              "text": "m1",
              "state": "dim"
            },
            {
              "text": "m2",
              "state": "dim"
            }
          ]
        },
        {
          "label": "P1",
          "cells": [
            {
              "text": "n0",
              "state": "dim"
            },
            {
              "text": "n1",
              "state": "dim"
            },
            {
              "text": "n2",
              "state": "dim"
            }
          ]
        },
        {
          "label": "group G",
          "cells": [
            {
              "text": "C1 reads P0"
            },
            {
              "text": "C2 reads P1"
            },
            {
              "text": "C3 idle",
              "state": "dropped"
            }
          ]
        }
      ]
    },
    {
      "note": "Adding a partition is what adds parallelism, and the group rebalances to pick it up. The cost lands on ordering: a key that used to hash to P0 can now hash to P2, and there is no ordering between partitions.",
      "rows": [
        {
          "label": "P0",
          "cells": [
            {
              "text": "m0"
            },
            {
              "text": "m1"
            },
            {
              "text": "m2"
            }
          ]
        },
        {
          "label": "P1",
          "cells": [
            {
              "text": "n0"
            },
            {
              "text": "n1"
            },
            {
              "text": "n2"
            }
          ]
        },
        {
          "label": "P2",
          "cells": [
            {
              "text": "p0",
              "state": "new"
            }
          ]
        },
        {
          "label": "group G",
          "cells": [
            {
              "text": "C1 reads P0"
            },
            {
              "text": "C2 reads P1"
            },
            {
              "text": "C3 reads P2",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "note": "Within a partition the offset is committed after processing, never before. A crash between the two redelivers m1, which is at-least-once delivery and exactly why the consumer dedupes on a message id. Committing first would be at-most-once and would lose it.",
      "rows": [
        {
          "label": "P0",
          "cells": [
            {
              "text": "m0 processed"
            },
            {
              "text": "m1 in flight",
              "state": "active"
            },
            {
              "text": "m2 waiting",
              "state": "dim"
            }
          ]
        },
        {
          "label": "committed offset",
          "cells": [
            {
              "text": "0",
              "state": "active"
            }
          ]
        },
        {
          "label": "on crash",
          "cells": [
            {
              "text": "m1 is redelivered",
              "state": "new"
            }
          ]
        }
      ]
    }
  ],
  "caption": "Partition count is doing two jobs at once: it is the only way to order a key's events, and the only way to add consumer parallelism."
}
\`\`\`

**Recap:** model it as a partitioned append-only log with per-partition ordering, get durability from ISR replication and acks=all, offer at-least-once delivery plus idempotent consumers for exactly-once processing (never claim exactly-once delivery), and scale reads with consumer groups where parallelism equals partition count.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You need every event for a given user processed in order, and you need to double consumer throughput. What is the constraint?",
  "options": [
    {
      "label": "One partition per user for order, more partitions for parallelism",
      "correct": true,
      "feedback": "Right, and the tension is that partition count is both things at once. Routing a user's events to one partition is the only way to order them, because ordering is per partition. Adding partitions is the only way to add parallelism, because each partition goes to exactly one consumer in the group."
    },
    {
      "label": "Add consumers to the group, since parallelism grows with consumer count",
      "feedback": "Consumers beyond the partition count sit idle. Each partition is assigned to exactly one consumer in a group, so partitions are the ceiling."
    },
    {
      "label": "Enable topic wide ordering, then scale consumers freely",
      "feedback": "There is no ordering across partitions, and a single partition topic would give you total order at the cost of all parallelism."
    },
    {
      "label": "Commit offsets before processing so slow consumers cannot hold up the partition",
      "feedback": "That converts the guarantee to at-most-once and loses messages on a crash. A slow consumer is meant to lag, which is how backpressure works here."
    }
  ],
  "reveal": "The abstraction is a partitioned append-only log: ordered offsets within a partition, no ordering across them, which is why the partition key is a design decision. Durability comes from leader and follower replication with an in-sync replica set, tuned by the producer's acks setting. Delivery semantics are at-most-once, at-least-once or exactly-once processing, and the honest answer is at-least-once plus idempotent consumers. Consumers scale in groups, with parallelism capped by partition count, offsets committed after processing, natural backpressure through lag, and a dead-letter topic so a poison message does not block its partition forever."
}
\`\`\`
`.trim()

const jobSchedulerTeach = `
## Fire each job exactly once despite crashes

A distributed job scheduler fires jobs at their scheduled time (one-off or recurring) across a fleet of workers, and its defining challenge is firing each job exactly once even when workers crash mid-run. This is one of the hardest correctness problems in system design because "exactly once" collides with the reality that any worker can die or pause at any instant. The honest target is effectively-once through idempotency, not literal once-delivery.

## Storage and the "due now" query

Jobs have a next-run timestamp, and the scheduler must efficiently find all jobs due in the current window without scanning everything. Index by run time: a database index on \`next_run_at\`, or time-bucketed storage where each bucket is a minute or second and workers poll the current bucket. A poller wakes every second, queries \`WHERE next_run_at <= now AND status = 'pending'\`, and dispatches those jobs. At large scale you shard jobs across many buckets or partitions so no single poller is a bottleneck.

### The poll interval is the precision floor, so stop polling harder

A poller's firing precision can never be better than its own interval. Whatever a job's timestamp says, it fires when the next poll happens to notice it:

\`\`\`
job due 19:00:00.000, poller ticks every 1s
  19:00:00.000  due
  19:00:00.640  poller wakes, runs the due-window query, dispatches
                fired 640ms late, and that lateness is uniform over the tick

want 100ms precision? tick 10x faster:
  10 queries/sec/shard instead of 1, against the same index, forever,
  and the tail of a slow query now eats a whole tick
\`\`\`

Polling harder buys precision with query load you pay every second of every day, most of it returning nothing. The way out is to split the two jobs the poller was doing at once: **finding** what is due, and **firing** it. Query on a coarse schedule, fire from memory.

Each scheduler shard keeps a **timer wheel**: an array of slots, one per tick, each holding the jobs due in that tick, with a cursor that advances one slot per tick and fires whatever it lands on. A loader query runs once per window and drops each row into the slot for its firing time.

\`\`\`
loading (once a minute, one query per shard):
  SELECT * FROM jobs
   WHERE next_run_at >= '19:00:00' AND next_run_at < '19:01:00'
     AND status = 'pending' AND shard_id = :me
  place each row in slot = second-of-minute(next_run_at)     <- O(1) per job

the wheel, 60 slots of 1s (cursor advances once per second):

  slot   00      01      02      03     ...    59
       [ j17 ] [     ] [ j4  ] [ j88 ]       [ j9  ]
       [ j92 ]         [ j8  ]
          ^
       19:00:00: cursor fires j17 and j92 straight from memory, no query

firing cost per tick = the jobs in THAT slot, not the millions still pending
\`\`\`

Precision is now the slot width, which is free to shrink: 100ms slots means 600 slots and 100ms firing precision while the loader still runs one query a minute. That is the trade the poller could not make.

The wheel is a cache of the job store, never the record of it. A job is durably written before it is ever loaded into a wheel, so a shard that dies loses its wheel and no jobs:

\`\`\`
19:00:20  shard 7 dies mid-minute, its in-memory wheel is gone
19:00:23  its buckets are reassigned to shard 3
19:00:23  shard 3 rebuilds the wheel from the durable store:
            WHERE next_run_at < '19:01:00' AND status = 'pending' AND shard_id = 7
          note the open lower bound: rows already past due (19:00:20 to 19:00:23)
          come back too and fire immediately, late rather than never
\`\`\`

Firing from memory does not replace any of the correctness machinery below it. The shard fires by dispatching, and the dispatch still goes through the lease acquisition in the next section, which is what keeps a brief double-ownership of a bucket during failover from becoming a double-run.

## Leasing with a visibility timeout

When a worker picks up a job it does not just mark it running; it acquires a lease: it atomically sets \`status = running, locked_by = worker, lease_expires_at = now + T\` in a single conditional update (compare-and-set on status). Only one worker wins the CAS, so only one runs the job. If that worker crashes, its lease expires and the job becomes eligible again, so another worker retries it. Crucially the job is retried, not duplicated, because a live worker holds the lease and a dead one's lease simply expires. This is the same visibility-timeout pattern SQS uses.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A worker wins the lease with a 60 second visibility timeout, then hits a 90 second GC pause. Its lease expires, a second worker takes the job and runs it. What happens when the first worker wakes up?",
  "options": [
    {
      "label": "It carries on believing it holds the lease and runs too, a double run the lease alone cannot prevent",
      "correct": true,
      "feedback": "Right. This is the paused worker problem, and the fix is a fencing token: every lease grant carries a monotonically increasing token, and downstream writes carrying a lower token are rejected."
    },
    {
      "label": "It notices the expired lease and aborts, because it re-checks the lease as it runs",
      "feedback": "A paused process runs no code, so it makes no checks. It resumes exactly where it stopped, holding a lease it no longer owns."
    },
    {
      "label": "Nothing: the compare-and-set already guaranteed a single holder",
      "feedback": "The compare-and-set guaranteed a single winner at acquisition time. Expiry later gives the job to someone else, and the original worker was never told it lost."
    }
  ]
}
\`\`\`

**Interview nuance:** the subtle failure is a paused worker. Suppose a worker acquires the lease, then suffers a long GC pause or network partition past its lease expiry. Its lease expires, a second worker picks up the job and runs it, and then the first worker wakes up and also runs it: a double-run. A lease alone does not prevent this. The fix is a fencing token: each lease grant carries a monotonically increasing token, and any external system the job writes to (or the completion update) rejects a token lower than the highest it has seen. So the resumed old worker's write is fenced off. Bring up fencing unprompted here; it is the senior signal.

## Exactly-once framing, clocks, misfires

You cannot guarantee a side effect runs exactly once across crashes, so combine at-least-once execution (retries via lease expiry) with idempotency. Give each job run an idempotency key so that if the job's action is retried, the downstream system dedupes it. Now a double-run produces a single effect.

For a cron job, on completion compute the next run and reschedule. Clock skew across machines means you should not rely on any single worker's clock for correctness; use the database's time or a logical ordering, and tolerate a small firing jitter. If the scheduler was down and missed a window, decide policy explicitly: catch up and run the missed occurrences, or skip to the next future one (misfire policy). Shard jobs by id or by time bucket so many pollers and workers run in parallel, add priority queues, and separate the scheduling tier from the execution tier.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Firing once despite crashes, one defence at a time",
  "nodes": [
    {
      "id": "jobs",
      "label": "Job store (indexed on next_run_at, or time bucketed)",
      "kind": "db"
    },
    {
      "id": "poller",
      "label": "Loader plus timer wheel (window query, then fires from memory on its tick)",
      "kind": "service"
    },
    {
      "id": "lease",
      "label": "Lease CAS (status pending to running, lease_expires = now + T, token n++)",
      "kind": "service"
    },
    {
      "id": "worker_a",
      "label": "Worker A (wins the CAS, then pauses past its lease)",
      "kind": "service"
    },
    {
      "id": "worker_b",
      "label": "Worker B (takes the expired lease, token n+1)",
      "kind": "service"
    },
    {
      "id": "resource",
      "label": "Downstream write (rejects any token below max_seen: fencing)",
      "kind": "service"
    },
    {
      "id": "dedup",
      "label": "Idempotency key store (dedupes the side effect)",
      "kind": "cache"
    },
    {
      "id": "effect",
      "label": "The side effect that must happen once (the charge)",
      "kind": "external"
    }
  ],
  "edges": [
    {
      "from": "jobs",
      "to": "poller",
      "kind": "sync",
      "label": "due window query, not a scan"
    },
    {
      "from": "poller",
      "to": "lease",
      "kind": "sync",
      "label": "dispatch"
    },
    {
      "from": "lease",
      "to": "worker_a",
      "kind": "sync",
      "label": "only one CAS wins"
    },
    {
      "from": "lease",
      "to": "worker_b",
      "kind": "sync",
      "label": "granted again once the lease expires"
    },
    {
      "from": "worker_a",
      "to": "resource",
      "kind": "sync",
      "label": "stale token n, fenced off"
    },
    {
      "from": "worker_b",
      "to": "resource",
      "kind": "sync",
      "label": "token n+1, accepted"
    },
    {
      "from": "resource",
      "to": "dedup",
      "kind": "sync",
      "label": "idempotency key checked"
    },
    {
      "from": "dedup",
      "to": "effect",
      "kind": "sync",
      "label": "applied once"
    },
    {
      "from": "worker_b",
      "to": "jobs",
      "kind": "feedback",
      "label": "completion: compute the next run"
    }
  ],
  "stages": [
    {
      "adds": [
        "jobs",
        "poller"
      ],
      "note": "Finding what is due cannot mean scanning every job, so jobs are indexed by run time and one coarse query loads the next window into an in-memory timer wheel, which fires on its own tick and is rebuilt from the store on failover."
    },
    {
      "adds": [
        "lease",
        "worker_a"
      ],
      "note": "Two workers reading the same due row would both run it, so a worker acquires the job with a single conditional update and only one compare-and-set wins."
    },
    {
      "adds": [
        "worker_b"
      ],
      "note": "A crashed holder must not strand the job forever, so its lease simply expires and another worker picks it up, which is a retry rather than a duplicate."
    },
    {
      "adds": [
        "resource"
      ],
      "note": "A worker that merely paused runs no code and makes no checks, so it wakes still believing it holds the lease; only a fencing token at the destination stops its write."
    },
    {
      "adds": [
        "dedup",
        "effect"
      ],
      "note": "No lease bounds a pause, so the honest target is at-least-once execution plus an idempotency key on the run, which is what makes the charge apply once."
    }
  ],
  "caption": "Each layer closes the hole the one before it leaves open, and the completion arc is what reschedules a recurring job."
}
\`\`\`

**Recap:** index jobs by run time and load the due window on a coarse query, fire from an in-memory timer wheel so precision is a tick rather than a poll interval and rebuild that wheel from the durable store on failover, make a single worker win via a compare-and-set lease with a visibility timeout so crashes retry rather than duplicate, add fencing tokens to defeat the paused-worker double-run, achieve effectively-once with idempotency keys, and handle clock skew and missed windows with an explicit misfire policy.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your scheduler fires a job whose action charges a customer. What gets you to effectively-once?",
  "options": [
    {
      "label": "At-least-once execution plus an idempotency key on the job run",
      "correct": true,
      "feedback": "Right. You cannot make a side effect run exactly once across crashes, so you make the retry safe instead: lease expiry gives at-least-once execution, and the idempotency key means the downstream charge applies once however many times the job runs. That is the honest target."
    },
    {
      "label": "A lease short enough that a crashed worker's job is retried before its action can complete",
      "feedback": "No TTL bounds a pause or a partition, so tuning the lease narrows the window without closing it. The downstream dedup is what actually closes it."
    },
    {
      "label": "Mark the job completed before running the action, so a retry can never re-run it",
      "feedback": "Then a crash between the mark and the action loses the job silently, which trades a visible duplicate for an invisible miss."
    }
  ],
  "reveal": "Firing each job once despite crashes is the defining challenge, and the answer is layered. Index jobs by next run time or time bucket so the due window is a cheap query, not a scan. Make a single worker win with a compare-and-set lease carrying a visibility timeout, so a crash means retry rather than duplicate. Add fencing tokens so a paused worker that wakes up cannot write behind the worker that replaced it. Reach effectively-once with idempotency keys on the job run. And handle time explicitly: derive it from the database rather than a worker's clock, and choose a misfire policy for windows the scheduler slept through."
}
\`\`\`
`.trim()

const distributedLockTeach = `
## Why a distributed lock is hard to get right

A distributed lock lets processes on different machines agree that only one of them is inside a critical section at a time. The naive build is a single command: set a key if it does not already exist, with an expiry so that a dead holder cannot deadlock everyone else. It is unsafe, and not in a way any amount of tuning removes. The holder can pause (a long garbage collection, a scheduler preemption, a network partition), the expiry can elapse while it is paused, a second client can acquire the lock, and the first can then wake up still believing it holds it. Two clients are now inside the critical section, and no TTL value prevents that, because a pause has no bound to tune the TTL against.

The fix is a fencing token. Every grant carries a monotonically increasing number, every write to the protected resource carries the number its holder was granted, and the resource remembers the highest number it has accepted and rejects anything lower. The paused holder's late write arrives with a stale token and is refused. Consensus makes the lock state correct, fencing makes the critical section correct, and a design needs both.

That is the substance of **Martin Kleppmann's critique** of the Redlock algorithm: safety cannot be derived from timing assumptions. A lock that treats elapsed clock time as evidence that it is still held breaks the moment a clock jumps or a process pauses for longer than the validity window, with no node having failed at all. Redis's author published a rebuttal, and the disagreement is largely about which system model is fair to assume, but the practical rule survives it. If losing the lock costs only efficiency, say a background job that runs twice, an expiry-based lock is a reasonable tool. If it costs correctness, say a double payment or a corrupted file, you need linearizable lock state plus a fencing token at the resource, because fencing is the only defence that assumes nothing about time.

A coordination service (ZooKeeper, etcd, Consul) gives a cluster the primitives it cannot build safely on its own: mutual exclusion (a distributed lock), leader election, and shared configuration that stays correct across process pauses and network partitions. The interview tests whether you understand why a naive lock is unsafe and how leases, fencing tokens, watches, and consensus combine into a correct one.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The lock is SET key if not exists with a 30 second expiry on one Redis node. Name the flaw that no amount of TTL tuning removes.",
  "options": [
    {
      "label": "The holder can pause past the TTL, the lock expires, a second client acquires it, and now two clients are inside the critical section",
      "correct": true,
      "feedback": "Right. You cannot bound a garbage collection pause, a scheduler preemption or a partition, so any TTL is a guess about something unbounded."
    },
    {
      "label": "A different client can delete the key, since SET if not exists does not restrict who may release",
      "feedback": "Real, and fixed by comparing a random token on release. It is hygiene rather than the fundamental hole, because expiry under a pause breaks mutual exclusion even when releases are perfect."
    },
    {
      "label": "A 30 second TTL deadlocks everyone else for half a minute after a holder crashes",
      "feedback": "That is a liveness annoyance you tune. The correctness hole runs the other way: a TTL that expires while the holder is merely paused rather than dead."
    },
    {
      "label": "A single Redis node cannot serve enough lock acquisitions per second",
      "feedback": "Throughput is not the concern here, and it is why the naive lock looks attractive. Its problems are failover losing the key and expiry under a pause."
    }
  ]
}
\`\`\`

## Why a single Redis SETNX with TTL is unsafe

It looks like a lock: SET key if not exists, with an expiry so a dead holder does not deadlock forever. It is unsafe for two reasons. First, a single Redis node is a single point of failure, and Redis replication is asynchronous, so a failover can lose the lock key and grant the lock twice. Second, and more fundamental, the TTL creates a correctness hole: the holder can pause (a long GC, a scheduler preemption, a network partition) past the TTL, the lock expires, a second client acquires it, and then the first client wakes up still believing it holds the lock. Now two clients act in the critical section at once. No amount of tuning the TTL fixes this, because you cannot bound a pause.

**Interview nuance:** the two-part answer that impresses: (1) put the lock state in a consensus-backed store so it is linearizable and survives node failure, and (2) hand out a fencing token so a stale holder's writes are rejected. Miss the fencing token and you have not actually made the lock safe.

## Consensus, leases, fencing, watches

Build on a store whose state is replicated by a consensus protocol (Raft in etcd and Consul, Zab in ZooKeeper). A write commits only when a majority (quorum) of nodes agree, so the lock state is linearizable and survives minority failures. Under a partition only the majority side can make progress. This is the CP corner of CAP: during a partition the minority side becomes unavailable rather than returning possibly-wrong state.

A client holds a lock via a session with a TTL that it must renew by heartbeat. If the client dies or partitions away, it stops heartbeating, the session lease expires, and the lock is released automatically. ZooKeeper models this as an ephemeral znode; etcd as a lease attached to the key.

Fencing tokens are what make leasing safe. Each lock grant includes a monotonically increasing token (etcd's key revision, ZooKeeper's zxid). Every write the lock holder makes to the protected resource carries its token, and the resource remembers the highest token it has accepted and rejects any lower one. So when a paused old holder wakes up and tries to write with an old token, the resource fences it off.

Instead of polling "is the lock free yet," clients register a watch on the lock or leader key and receive a callback when it changes, giving fast failover. Leader election: candidates each create an ordered ephemeral key (a sequence number); the candidate with the lowest number is the leader; each other candidate watches only its immediate predecessor, so when the leader dies exactly one candidate is notified and takes over, avoiding a herd.

Level 5 works the same mechanism from the other side, where the thing being held is a partition rather than a critical section: see [leader election, leases, and fencing tokens](/learn/system-design/distributed-core/sd-l5-leader-election-fencing) for how a demoted leader gets fenced off and why split-brain is the failure it exists to prevent.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "A lock that survives a pause and a partition",
  "nodes": [
    {
      "id": "client_a",
      "label": "Client A (holds the lock, then pauses past its lease)",
      "kind": "client"
    },
    {
      "id": "client_b",
      "label": "Client B (waits by watching its predecessor, never polling)",
      "kind": "client"
    },
    {
      "id": "lock",
      "label": "Lock key under /lock: ordered ephemeral sequence, session lease renewed by heartbeat",
      "kind": "service"
    },
    {
      "id": "consensus",
      "label": "Consensus store (Raft in etcd and Consul, Zab in ZooKeeper): a write commits only on a majority, so a minority partition is unavailable rather than wrong",
      "kind": "db"
    },
    {
      "id": "resource",
      "label": "Protected resource: accept a write only if token >= max_seen_token",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "client_a",
      "to": "lock",
      "kind": "sync",
      "label": "create an ephemeral sequence key; the lowest number holds the lock"
    },
    {
      "from": "client_b",
      "to": "lock",
      "kind": "sync",
      "label": "watch only the predecessor, so a failover wakes one node"
    },
    {
      "from": "lock",
      "to": "consensus",
      "kind": "sync",
      "label": "lock state, linearizable"
    },
    {
      "from": "lock",
      "to": "resource",
      "kind": "sync",
      "label": "every grant carries a monotonic token (etcd key revision, ZooKeeper zxid)"
    },
    {
      "from": "client_a",
      "to": "resource",
      "kind": "sync",
      "label": "wakes up and writes with a stale token: fenced off"
    },
    {
      "from": "client_b",
      "to": "resource",
      "kind": "sync",
      "label": "writes with the higher token: accepted"
    }
  ],
  "stages": [
    {
      "adds": [
        "client_a",
        "lock"
      ],
      "note": "A dead holder must not deadlock the cluster, so the lock is held through a session lease the client renews by heartbeat and that releases itself when the heartbeats stop."
    },
    {
      "adds": [
        "consensus"
      ],
      "note": "A single node loses the lock key on failover and can grant it twice, so the state sits behind a consensus protocol where a write commits only on a majority."
    },
    {
      "adds": [
        "resource"
      ],
      "note": "You cannot bound a garbage collection pause, so consensus fixes the lock and fencing has to fix the resource: it remembers the highest token accepted and rejects anything lower."
    },
    {
      "adds": [
        "client_b"
      ],
      "note": "Polling asks the same question forever and a shared watch wakes a herd, so each waiter watches only its immediate predecessor and exactly one is notified when the holder goes."
    }
  ],
  "caption": "The two-part answer: consensus makes the lock state correct, fencing makes the critical section correct."
}
\`\`\`

**Recap:** a Redis SETNX-with-TTL lock is unsafe because a single node can fail over and a paused holder can outlive its TTL; build on a consensus-backed store (etcd, ZooKeeper) for linearizable lock state, auto-release via session leases and heartbeats, defeat the stale-holder double-run with monotonic fencing tokens, notify clients with watches instead of polling, and elect leaders with ordered ephemeral keys where each watches its predecessor.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You move lock state into etcd, and a session lease auto releases it. Is the critical section safe now?",
  "options": [
    {
      "label": "Not yet: the resource still has to reject a stale token",
      "correct": true,
      "feedback": "Right. Consensus fixes the lock, fencing fixes the resource. A paused holder can still wake and write, so the protected resource must remember the highest token it has accepted and reject anything lower. That two-part answer is what separates a correct design from a plausible one."
    },
    {
      "label": "Yes: consensus makes the lock state linearizable, so only one client holds it at a time",
      "feedback": "Only one client holds it, which is true and necessary. A stale holder that has not learned it lost the lock still issues writes, and nothing in the lock service sees them."
    },
    {
      "label": "Yes: the heartbeat means a paused client's lease expires, so it can no longer write",
      "feedback": "Expiry releases the lock; it does not reach into the paused process and stop it. Its next write is still on its way unless the resource fences it."
    }
  ],
  "reveal": "A coordination service exists because a cluster cannot build these primitives safely on its own. Put lock state behind a consensus protocol (Raft in etcd and Consul, Zab in ZooKeeper) so it is linearizable and a minority partition becomes unavailable rather than wrong. Auto release through session leases and heartbeats so a dead client does not deadlock the cluster. Hand out a monotonic fencing token with every grant and have the protected resource reject stale ones, because that is the only defence against a paused holder. Use watches instead of polling, and elect leaders with ordered ephemeral keys where each candidate watches only its predecessor, so a failover wakes one node rather than a herd."
}
\`\`\`
`.trim()

const codeSandboxTeach = `
## The isolation boundary is the core decision

A code execution sandbox (an online judge like LeetCode, a CI runner, or this platform's own code runner) runs untrusted user code safely at scale. The defining decision is the isolation boundary: how strong a wall you put between hostile code and your host and other users. Assume the code is actively hostile (fork bombs, network exfiltration, kernel-escape attempts), because at contest scale someone will try.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A candidate says: run each submission in a Docker container, that is isolated. Why does that fail the security bar for hostile code?",
  "options": [
    {
      "label": "The container shares the host kernel, so one kernel vulnerability is a full escape onto the host and everyone else's work",
      "correct": true,
      "feedback": "Right. Containers are a packaging and resource boundary, not a security boundary against code that is actively trying to escape."
    },
    {
      "label": "Containers cannot bound CPU and memory, so a runaway submission takes the host down",
      "feedback": "cgroups do bound CPU, memory and process count, and you should use them. The security objection is the shared kernel, which no resource limit touches."
    },
    {
      "label": "Container startup is too slow for an online judge",
      "feedback": "Containers start fast, which is exactly what makes them tempting. The problem is the strength of the wall, not the time to build it."
    }
  ]
}
\`\`\`

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
      "display": "own guest kernel, boots ~100ms, snapshots",
      "note": "Hardware-virtualization isolation with its own guest kernel: near-VM strength that still boots in about 100ms, the strong default for untrusted code. It can also be snapshotted: pause the guest, persist its memory and disk state, resume it in a few hundred ms."
    }
  ],
  "caption": "Each rung up buys isolation and pays startup and performance cost. Name the spectrum and commit: Firecracker microVMs as the strong default, a hardened seccomp container as the fallback."
}
\`\`\`

**Interview nuance:** the senior move is to name the spectrum and commit: "I would use Firecracker microVMs for true kernel isolation with fast startup, falling back to a hardened seccomp container if microVMs are not available." Saying "run it in a Docker container" and stopping there fails the security bar, because a container shares the host kernel.

### A microVM can be paused, not only booted

The ~100ms boot is the half of Firecracker that gets quoted. The other half matters as soon as a sandbox is something a user comes back to. A microVM's entire state is a memory file plus its disk image, so the VMM can **snapshot** it: pause the guest, write its memory and device state out, and destroy the running VM. **Restoring** maps that memory file back and resumes the guest exactly where it stopped, in a few hundred milliseconds, with the process tree, the loaded interpreter, the warm page cache and whatever was installed still in place. Open TCP connections do not survive the pause, so whatever fronts the VM re-establishes them on wake.

That is a different economic object from a booted VM. A running VM holds host RAM and a scheduled vCPU whether or not anyone is using it; a snapshot holds bytes on disk:

\`\`\`
one 2 vCPU / 4 GB workspace, used ~2 hours a day:

  kept booted        4 GB host RAM and a vCPU slot reserved all 24h
                     ~$0.05/hour of compute x 24h  = ~$1.20/day
                                                     ~92% of it burned idle

  snapshotted        pause after 60s idle, persist a ~4 GB memory file plus the
                     disk delta, release the host slot to another workspace
                     storage: ~4 GB at ~$0.10/GB-month  = ~$0.01/day
                     compute: billed for the 2 active hours = ~$0.10/day
                                                     ~$0.11/day, roughly 10x cheaper

  waking it          map the memory file and resume: a few hundred ms,
                     versus tens of seconds to boot and reinstall from scratch
\`\`\`

A warm pool and a snapshot look similar and solve opposite problems, which is worth keeping straight. A warm pool holds **generic, empty, pre-booted** sandboxes so the next arriving job does not pay the boot; any VM in the pool will do, because a one-shot judge run brings nothing with it. A snapshot restores **one specific VM's state**, which is the only thing that helps when the user's packages, files and running server are what make the environment theirs. Neither substitutes for the other: a pooled VM does not have your state, and there is nothing to snapshot before a workspace has run once.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You run each submission in a Firecracker microVM with a CPU cap, a memory cap and a wall clock timeout. A submission forks in an infinite loop. What happens?",
  "options": [
    {
      "label": "It exhausts the process table, unless a pids limit caps it",
      "correct": true,
      "feedback": "Right. A fork bomb is cheap in memory and expensive in process slots, so it saturates the process table long before either of the caps you set fires. That is why the pids limit belongs alongside the CPU and memory caps rather than being assumed to fall out of them."
    },
    {
      "label": "The memory cap stops it, since every process consumes memory",
      "feedback": "Processes are cheap enough that the process table goes first. The memory cap fires too late to be the defence you rely on."
    },
    {
      "label": "The wall clock timeout stops it, since the sandbox is destroyed when time runs out",
      "feedback": "The timeout does end the run, but it lets the bomb saturate the sandbox and burn a worker slot for the whole window. The pids cap makes the failure immediate and cheap."
    }
  ]
}
\`\`\`

## Resource limits and architecture

Use cgroups to cap CPU shares and memory (with a hard OOM kill), a wall-clock and CPU-time timeout to kill infinite loops, a pids limit to defeat fork bombs (a fork bomb without a pids cap exhausts the process table), disk quotas to stop a submission from filling the disk, and no network by default (or a strict egress allowlist) to prevent data exfiltration and abuse. Every submission runs in a fresh, throwaway sandbox that is destroyed after the run, so no state leaks between users.

A stateless API accepts submissions and immediately enqueues them onto a durable queue (SQS, Kafka), returning a job id. A pool of sandboxed workers pulls jobs, executes each in a fresh sandbox, and reports results. The queue decouples submission rate from execution capacity, so a contest spike buffers instead of overwhelming the fleet, and workers autoscale on queue depth. Because microVM cold start still costs latency, keep a warm pool of pre-booted sandboxes ready to accept a job, then destroy each after use.

Users want to see output as it runs, so stream stdout, stderr, and per-test progress back over SSE or WebSocket, store the final verdict durably, and cap output size so a submission that prints forever cannot exhaust memory or the client. Per-user rate limits and concurrency quotas so one user cannot monopolize the pool, and treat the sandbox host itself as potentially compromised by running the whole fleet in an isolated network segment with no access to production.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "A submission's path through the sandbox fleet",
  "reveal": "all",
  "nodes": [
    {
      "id": "client",
      "label": "Client (POST /submit)",
      "kind": "client"
    },
    {
      "id": "api",
      "label": "API (stateless): auth, per-user rate limit and concurrency quota",
      "kind": "service"
    },
    {
      "id": "queue",
      "label": "Durable queue (SQS or Kafka): returns a job id",
      "kind": "queue"
    },
    {
      "id": "pool",
      "label": "Warm pool of pre-booted microVMs (hides the 100ms cold start)",
      "kind": "service"
    },
    {
      "id": "worker",
      "label": "Worker pool (autoscales on queue depth)",
      "kind": "service"
    },
    {
      "id": "vm",
      "label": "Fresh Firecracker microVM: cgroups for CPU and memory, wall clock and CPU timeout, pids limit, disk quota, no network",
      "kind": "service"
    },
    {
      "id": "stream",
      "label": "SSE stream: stdout, stderr, per-test progress (output size capped)",
      "kind": "service"
    },
    {
      "id": "verdict",
      "label": "Verdict store (durable), then the VM is destroyed",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "client",
      "to": "api",
      "kind": "sync"
    },
    {
      "from": "api",
      "to": "queue",
      "kind": "async",
      "label": "enqueue and return a job id"
    },
    {
      "from": "queue",
      "to": "worker",
      "kind": "async",
      "label": "a contest spike buffers here"
    },
    {
      "from": "pool",
      "to": "worker",
      "kind": "sync",
      "label": "hand over a pre-booted sandbox"
    },
    {
      "from": "worker",
      "to": "vm",
      "kind": "sync",
      "label": "one submission per fresh VM"
    },
    {
      "from": "vm",
      "to": "stream",
      "kind": "async",
      "label": "while it runs"
    },
    {
      "from": "vm",
      "to": "verdict",
      "kind": "sync",
      "label": "final result"
    },
    {
      "from": "stream",
      "to": "client",
      "kind": "feedback",
      "label": "progress back to the browser"
    }
  ],
  "groups": [
    {
      "id": "sandbox_segment",
      "label": "Isolated network segment: no access to production",
      "nodes": [
        "pool",
        "worker",
        "vm"
      ]
    }
  ],
  "caption": "The queue decouples submission rate from execution capacity, and every submission gets its own throwaway guest kernel so no state leaks between users."
}
\`\`\`

**Recap:** pick the isolation boundary deliberately (microVM/Firecracker as the strong default, hardened seccomp container as the middle ground, never a bare container for hostile code), bound every resource with cgroups plus timeouts plus a pids limit plus no network, run each submission in a fresh throwaway sandbox behind a queue and autoscaling worker pool with a warm pool for latency, and stream results while enforcing per-user fairness. A warm pool hides the boot for a stateless run; snapshot and restore is the separate lever for a sandbox whose state someone comes back to.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A contest starts and submissions arrive at twenty times the normal rate. What absorbs it?",
  "options": [
    {
      "label": "A durable queue in front of an autoscaling worker pool",
      "correct": true,
      "feedback": "Right. The queue decouples submission rate from execution capacity, so the spike becomes a backlog rather than an overload, and the pool scales on queue depth. A warm pool of pre-booted sandboxes hides the microVM cold start while it drains."
    },
    {
      "label": "Reusing each sandbox for several submissions so the boot cost is amortized",
      "feedback": "Sharing a sandbox leaks state between users and destroys the isolation the whole design exists for. Every submission gets a fresh throwaway sandbox."
    },
    {
      "label": "Rejecting submissions above current fleet capacity so nothing queues",
      "feedback": "Per user rate limits and concurrency quotas are fair and necessary, but dropping legitimate contest traffic is a product failure when a queue can buffer it."
    },
    {
      "label": "Raising the per submission CPU and memory caps so each run finishes sooner",
      "feedback": "Bigger limits do not make a queued job start earlier, and loosening the bounds on hostile code is exactly the wrong direction under load."
    }
  ],
  "reveal": "The core decision is the isolation boundary, and you name the spectrum and commit: plain process, container, hardened container with seccomp and dropped capabilities, gVisor, microVM. Firecracker is the strong default because it gives a guest kernel and hardware virtualization while still booting in about 100ms. Then bound everything: cgroups for CPU and memory, wall clock and CPU timeouts, a pids limit against fork bombs, disk quotas, and no network by default. Architecturally it is a stateless API in front of a durable queue and an autoscaling pool of workers that each build a fresh sandbox, with a warm pool for latency, streamed output with a size cap, and per user quotas for fairness."
}
\`\`\`
`.trim()

const webhookDeliveryTeach = `
## The receivers are outside your control

A webhook delivery system notifies customer-controlled endpoints when events happen (Stripe firing \`payment.succeeded\` to your server). The hard part is that the receivers are outside your control: they are slow, flaky, sometimes down for hours, and occasionally malicious. The interview tests your delivery guarantee, retry and backoff strategy, payload signing, idempotency and ordering, dead-letter handling, and per-tenant fairness.

## At-least-once plus consumer idempotency

Offer at-least-once. Persist every event first, enqueue a delivery task, and mark it delivered only when the endpoint returns a 2xx. If you crash after sending but before recording success, you redeliver, so duplicates are possible. This is the honest, standard guarantee; exactly-once delivery to an arbitrary external endpoint is not achievable, so you push idempotency to the consumer. Include a stable, unique event id in every payload (and an idempotency header) and document that delivery is at-least-once, so consumers dedupe on the id. Stripe, GitHub, and Shopify all do exactly this.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your checkout service calls the customer's webhook URL directly at the end of the request. One customer's endpoint starts hanging for 30 seconds. What happens?",
  "options": [
    {
      "label": "Your checkout requests pile up behind the hung endpoint, so their outage becomes your outage",
      "correct": true,
      "feedback": "Right. Every in-path call holds one of your handlers for its full timeout, so a receiver you do not control gets to consume your capacity."
    },
    {
      "label": "Only that customer's webhooks are delayed, since the calls are independent of each other",
      "feedback": "They are independent of each other and not of your fleet: they share the same worker and connection pool as the checkout traffic they are attached to."
    },
    {
      "label": "Nothing serious, as long as you set a short per attempt timeout on the call",
      "feedback": "A timeout bounds the damage per call and keeps the work in your request path. At volume, even two seconds multiplied by a flood of events stalls the producer."
    }
  ]
}
\`\`\`

**Interview nuance:** the single most important architectural point: never deliver inline and synchronously from the event producer. If your checkout service calls the customer's webhook URL directly in the request path, a slow or hung customer endpoint backs up your producer and can stall the whole pipeline. Always persist the event and hand delivery to a separate, queue-driven delivery service.

## Retries, signing, ordering

On a failure (non-2xx, timeout, connection error) retry with exponential backoff plus jitter over a long window: seconds, then minutes, then hours, up to a day or more, with a capped attempt count. Backoff lets a down endpoint recover without a thundering herd, and jitter prevents all retries for a mass event from firing in lockstep. Use a per-attempt timeout (a few seconds) so a hung endpoint does not tie up a worker.

Sign each payload so the consumer can verify it really came from you and was not tampered with. Compute an HMAC-SHA256 over the raw body plus a timestamp using a per-customer secret, and send it in a header. The consumer recomputes and compares. Include the timestamp and reject old ones to prevent replay attacks, and support secret rotation with an overlap window.

Default to no strict global order because it is simpler and lets you deliver in parallel. When a tenant genuinely needs per-resource order, key delivery by resource id and deliver sequentially per key, holding back the next event for a key until the prior one is acknowledged. This costs throughput for that key, so make it opt-in.

## Dead-letter and fairness

After the max attempts, move the event to a dead-letter store, alert, and expose a manual replay or redrive API. Fairness is critical because endpoints vary wildly: isolate delivery per tenant with per-tenant queues (or a fair scheduler), per-tenant concurrency limits and rate limits, per-endpoint timeouts, and circuit breakers that stop hammering an endpoint that has been failing, so one slow or dead customer cannot consume all workers and starve everyone else.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Delivering to an endpoint you do not control",
  "nodes": [
    {
      "id": "event",
      "label": "Event (payment.succeeded)",
      "kind": "external"
    },
    {
      "id": "store",
      "label": "Event store: persisted first, with a stable event id",
      "kind": "db"
    },
    {
      "id": "queue",
      "label": "Per-tenant delivery queue",
      "kind": "queue"
    },
    {
      "id": "worker",
      "label": "Delivery worker (per-attempt timeout of a few seconds)",
      "kind": "service"
    },
    {
      "id": "breaker",
      "label": "Circuit breaker and per-tenant concurrency limit",
      "kind": "service"
    },
    {
      "id": "endpoint",
      "label": "Customer endpoint (slow, flaky, sometimes down for hours)",
      "kind": "external"
    },
    {
      "id": "retry",
      "label": "Backoff and jitter retry (seconds, then minutes, then hours, capped attempts)",
      "kind": "queue"
    },
    {
      "id": "dlq",
      "label": "Dead-letter store: alert and manual redrive",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "event",
      "to": "store",
      "kind": "sync",
      "label": "persist before anything else"
    },
    {
      "from": "store",
      "to": "queue",
      "kind": "async",
      "label": "enqueue a delivery task"
    },
    {
      "from": "queue",
      "to": "worker",
      "kind": "async"
    },
    {
      "from": "worker",
      "to": "breaker",
      "kind": "sync"
    },
    {
      "from": "breaker",
      "to": "endpoint",
      "kind": "sync",
      "label": "POST, HMAC-SHA256 over the raw body plus a timestamp"
    },
    {
      "from": "endpoint",
      "to": "store",
      "kind": "feedback",
      "label": "2xx: mark delivered"
    },
    {
      "from": "endpoint",
      "to": "retry",
      "kind": "async",
      "label": "non-2xx, timeout or connection error"
    },
    {
      "from": "retry",
      "to": "worker",
      "kind": "feedback",
      "label": "re-attempt after backoff plus jitter"
    },
    {
      "from": "retry",
      "to": "dlq",
      "kind": "async",
      "label": "attempts exhausted"
    }
  ],
  "stages": [
    {
      "adds": [
        "event",
        "store",
        "queue"
      ],
      "note": "One customer endpoint hanging for 30 seconds must not become your outage, so the producer persists the event and hands delivery to a separate queue-driven service instead of calling inline."
    },
    {
      "adds": [
        "worker",
        "endpoint"
      ],
      "note": "The receiver is outside your control, so every attempt carries a short per-attempt timeout, and the payload is signed with HMAC-SHA256 over the raw body plus a timestamp so the consumer can verify it and reject replays."
    },
    {
      "adds": [
        "retry"
      ],
      "note": "A down endpoint has to be able to come back without every pending event arriving at once, so failures retry with exponential backoff plus jitter over hours rather than in lockstep."
    },
    {
      "adds": [
        "dlq"
      ],
      "note": "An event that exhausts its attempts must stay visible rather than disappear, so it lands in a dead-letter store with an alert and a redrive path."
    },
    {
      "adds": [
        "breaker"
      ],
      "note": "Workers are shared and endpoints vary wildly, so per-tenant concurrency limits and a breaker that stops hammering a failing endpoint are what keep one bad customer from starving everyone else."
    }
  ],
  "caption": "Delivery is at-least-once by construction: the mark-delivered arc only closes on a 2xx, so a crash before it is recorded means the consumer sees the event id twice."
}
\`\`\`

**Recap:** guarantee at-least-once (persist, enqueue, ack on 2xx) with a stable event id so consumers dedupe, deliver from a separate queue-driven service (never inline), retry with exponential backoff plus jitter over a long window, sign payloads with HMAC-SHA256 plus timestamp and rotate secrets, make ordering opt-in per resource key, and protect everyone with dead-letters plus per-tenant isolation and circuit breakers.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A customer reports they processed the same payment.succeeded event twice. What is the correct response?",
  "options": [
    {
      "label": "Delivery is at-least-once by design, every payload carries a stable event id, and consumers are documented to dedupe on it",
      "correct": true,
      "feedback": "Right. Exactly-once delivery to an arbitrary external endpoint is not achievable, so the guarantee is stated honestly and idempotency is pushed to the consumer."
    },
    {
      "label": "It is a bug in the delivery service, which should mark delivered before sending so redelivery cannot happen",
      "feedback": "Marking before the endpoint acknowledges turns duplicates into lost events, which is far worse, and it still cannot be atomic with an external HTTP call."
    },
    {
      "label": "Enable strict ordering for that tenant, which also removes the duplicates",
      "feedback": "Ordering is about sequence, not count. Holding events per resource key still redelivers an event whose acknowledgement was lost."
    }
  ],
  "reveal": "Everything here follows from the receivers being outside your control. The guarantee is at-least-once: persist the event, enqueue a delivery task, and mark delivered only on a 2xx, with a stable event id so consumers dedupe. Delivery lives in a separate queue-driven service, never inline in the producer. Failures retry with exponential backoff plus jitter over hours, with a per attempt timeout. Payloads are signed with HMAC-SHA256 over the raw body plus a timestamp, with replay rejection and rotatable secrets. Ordering is opt-in per resource key because it costs throughput. And dead-letters, per-tenant queues and concurrency limits, and circuit breakers keep one bad endpoint from starving everyone else."
}
\`\`\`
`.trim()

const paymentLedgerTeach = `
## "Roughly correct" is a failing answer

Payments is the interview where "roughly correct" is a failing answer. The whole problem is money that must never be double-charged, never lost, and always auditable, and every design choice flows from that. Volume is modest by web standards (a large processor might do 5K to 50K payments/sec at peak), so this is a correctness problem, not a throughput problem.

## Idempotency, because retries are guaranteed

Networks time out, clients resubmit, and your own workers retry after crashes. Every mutating request carries a client-generated idempotency key (a UUID the client mints per logical intent). The payment service stores that key with the request result in a dedup table before doing work, keyed uniquely so a second request with the same key returns the first result instead of charging again. This turns at-least-once delivery into effectively-once behavior. Without it, one dropped ACK becomes a double charge.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Where does an account balance live?",
  "options": [
    {
      "label": "Nowhere as an authoritative field: it is derived by summing that account's immutable journal entries",
      "correct": true,
      "feedback": "Right. A cached or materialized balance is a fine optimization on top, but the entries have to stay the source of truth or reconciliation and audit have nothing to stand on."
    },
    {
      "label": "In a balance column updated in the same transaction as the entry, so reads stay cheap",
      "feedback": "Doing it inside the transaction keeps them agreeing today. Treating the column as truth is what removes the audit trail, because a bug that skews it leaves nothing to recompute against."
    },
    {
      "label": "In the payment provider, which is authoritative for the customer's money",
      "feedback": "The provider knows what it settled, not your internal wallet positions, and you still have to reconcile your ledger against its settlement report."
    }
  ]
}
\`\`\`

## Double-entry, immutable ledger

The ledger is the source of truth, and it must be double-entry and immutable. Instead of storing a mutable \`balance\` column you update in place, you append immutable journal entries: every movement of money is two entries that sum to zero (debit one account, credit another). A charge of $50 becomes a debit to the customer's funding account and a credit to the merchant's payable account. A balance is then a derived sum of entries, never an overwritten field. This gives you a complete audit trail, makes reconciliation with the bank statement mechanical, and makes bugs detectable (entries that do not sum to zero are corruption you can alarm on).

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "entry",
    "account",
    "side",
    "amount"
  ],
  "rows": [
    [
      "jrnl-1",
      "customer funding account",
      "debit",
      "-50.00"
    ],
    [
      "jrnl-2",
      "merchant payable account",
      "credit",
      "+50.00"
    ],
    [
      "",
      "sum of entries",
      "",
      "0.00"
    ]
  ],
  "highlightCols": [
    "amount"
  ],
  "caption": "The 50 dollar charge as two immutable journal entries that sum to zero. A balance is a derived SUM over an account's entries, never an overwritten column."
}
\`\`\`

**Interview nuance:** the fastest way to fail this round is proposing \`UPDATE accounts SET balance = balance - 50\`. Say explicitly that you use an append-only double-entry ledger and derive balances, because mutable balances make audit and reconciliation impossible and hide bugs.

## Coordinating across systems with a saga

A charge spans several systems (your wallet/ledger, an external provider like Stripe or Adyen, and the orders service), and you cannot hold a distributed ACID transaction across an external API. Use a saga (an orchestrated sequence of local transactions with compensating actions). The orchestrator: (1) reserves funds in the ledger as a pending entry, (2) calls the provider with an idempotency key, (3) on success posts the settled ledger entries and marks the order paid, (4) on failure posts a compensating reversal. State lives in a durable workflow so a crash resumes rather than orphans money.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "The charge as a saga over an append-only ledger",
  "nodes": [
    {
      "id": "client",
      "label": "Client (mints one idempotency key per logical intent)",
      "kind": "client"
    },
    {
      "id": "api",
      "label": "Payment API",
      "kind": "service"
    },
    {
      "id": "dedup",
      "label": "Dedup table (idempotency key, unique, written before the work)",
      "kind": "db"
    },
    {
      "id": "saga",
      "label": "Saga orchestrator in a durable workflow (a crash resumes rather than orphans money)",
      "kind": "service"
    },
    {
      "id": "pending",
      "label": "Ledger: pending entry",
      "kind": "db"
    },
    {
      "id": "provider",
      "label": "Provider (Stripe, Adyen), called with an idempotency key",
      "kind": "external"
    },
    {
      "id": "settle",
      "label": "Ledger: settled double-entry pair, summing to zero",
      "kind": "db"
    },
    {
      "id": "order",
      "label": "Order marked paid",
      "kind": "service"
    },
    {
      "id": "reversal",
      "label": "Compensating reversal entry (appended, never a delete)",
      "kind": "db"
    },
    {
      "id": "webhook",
      "label": "Provider webhook (at-least-once, deduped on the provider event id)",
      "kind": "external"
    },
    {
      "id": "recon",
      "label": "Daily reconciliation against the settlement report",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "client",
      "to": "api",
      "kind": "sync",
      "label": "idempotency key"
    },
    {
      "from": "api",
      "to": "dedup",
      "kind": "sync",
      "label": "stored before any work"
    },
    {
      "from": "dedup",
      "to": "saga",
      "kind": "sync",
      "label": "a repeat key returns the first result instead of charging again"
    },
    {
      "from": "saga",
      "to": "pending",
      "kind": "sync",
      "label": "reserve funds"
    },
    {
      "from": "pending",
      "to": "provider",
      "kind": "sync",
      "label": "charge"
    },
    {
      "from": "provider",
      "to": "settle",
      "kind": "sync",
      "label": "on success"
    },
    {
      "from": "settle",
      "to": "order",
      "kind": "sync"
    },
    {
      "from": "provider",
      "to": "reversal",
      "kind": "async",
      "label": "on failure"
    },
    {
      "from": "reversal",
      "to": "pending",
      "kind": "feedback",
      "label": "reverses the pending entry"
    },
    {
      "from": "provider",
      "to": "webhook",
      "kind": "async",
      "label": "confirmation arrives later"
    },
    {
      "from": "webhook",
      "to": "saga",
      "kind": "feedback",
      "label": "handler is idempotent too"
    },
    {
      "from": "settle",
      "to": "recon",
      "kind": "sync",
      "label": "sum the entries, compare to the report"
    }
  ],
  "stages": [
    {
      "adds": [
        "client",
        "api",
        "dedup"
      ],
      "note": "One dropped acknowledgement otherwise becomes a double charge, so every mutating request carries a client-generated idempotency key and the dedup row is written before the work is done."
    },
    {
      "adds": [
        "saga",
        "pending"
      ],
      "note": "You cannot hold a distributed transaction across an external provider, so the charge becomes a sequence of local transactions and the first one only reserves funds as a pending entry."
    },
    {
      "adds": [
        "provider",
        "settle",
        "order"
      ],
      "note": "The provider call is the step that can time out, so it carries its own idempotency key, and only on success do the settled pair and the paid order follow."
    },
    {
      "adds": [
        "reversal"
      ],
      "note": "An audit trail cannot survive an overwrite, so a failure is corrected by appending a compensating reversal rather than by editing what was already recorded."
    },
    {
      "adds": [
        "webhook"
      ],
      "note": "Providers confirm asynchronously and their webhooks are at-least-once as well, so that handler dedupes on the provider event id before it touches the saga."
    },
    {
      "adds": [
        "recon"
      ],
      "note": "Entries that disagree with the money that actually moved are an incident, so the day's entries are summed and compared with the provider settlement report."
    }
  ],
  "caption": "Balances are never a column here: every account balance is a derived sum over these immutable entries, which is what makes reconciliation mechanical."
}
\`\`\`

Providers confirm asynchronously via webhooks, which are themselves at-least-once, so webhook handlers must be idempotent too (dedup on the provider's event id). Reconcile daily by summing ledger entries and comparing to the provider's settlement report; any drift is an incident. Layer PCI scope reduction (never store raw PANs, tokenize via the provider) and fraud hooks on top.

**Recap:** idempotency keys on every mutating call turn retries safe, an append-only double-entry ledger with derived balances gives auditability and reconciliation, and a saga with compensations plus idempotent webhook handling coordinates the provider, wallet, and orders without a distributed transaction.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A charge touches your ledger, an external provider, and the orders service. How do you keep them consistent?",
  "options": [
    {
      "label": "A saga of local transactions, with compensating reversals",
      "correct": true,
      "feedback": "Right, and name the steps: a pending ledger entry, the provider call carrying an idempotency key, then the settled entries and the order marked paid, with a compensating reversal if any step fails. The part people skip is holding it in a durable workflow, so a crash mid saga resumes rather than orphaning money."
    },
    {
      "label": "A distributed two phase commit across the ledger, the provider and the orders service",
      "feedback": "You cannot enlist an external payment provider in your transaction manager, and holding a prepare open across a third party call is exactly the coupling a saga avoids."
    },
    {
      "label": "Fire the three writes asynchronously and let the nightly reconciliation fix any drift",
      "feedback": "Reconciliation detects drift, it does not create consistency. Money in an unknown state overnight is an incident, not a design."
    }
  ],
  "reveal": "Correctness, not throughput, is the whole problem. Idempotency keys on every mutating call turn guaranteed retries into safe retries, because a dropped acknowledgement otherwise becomes a double charge. The ledger is append-only and double-entry: each movement is two entries summing to zero, balances are derived sums, and entries that fail to sum to zero are corruption you can alarm on. Coordination across the provider, the wallet and orders is a saga with compensating reversals in a durable workflow, provider webhooks are at-least-once so their handlers dedupe on the provider's event id, and daily reconciliation against the settlement report is what proves the whole thing."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You decrement inventory when a buyer adds the last seat to their cart. The buyer then wanders off and never checks out. What has to exist?",
  "options": [
    {
      "label": "A hold with a TTL, plus a sweeper or a lazy check that atomically increments the seat back when it expires",
      "correct": true,
      "feedback": "Right. The hold makes the seat unavailable during the cart window without permanently destroying it, and the automatic release is what stops abandoned carts from leaking inventory."
    },
    {
      "label": "Nothing: the seat is committed, and an abandoned cart is the buyer's problem",
      "feedback": "Then every abandoned cart burns real inventory, and a sold out event ends with empty seats. The decrement has to be reversible on a timer."
    },
    {
      "label": "Move the decrement to the payment step instead, so nothing is ever held",
      "feedback": "Then two buyers can both reach payment for the last seat, and one of them gets a charge and no seat. The hold exists precisely to prevent that."
    }
  ]
}
\`\`\`

## Reservation holds

Real commerce does not charge instantly, so you need reservation holds. When a buyer adds a seat to their cart, you decrement inventory and create a hold with a TTL (say 10 minutes). The seat is unavailable to others during the hold. If the buyer completes checkout, the hold converts to a sale; if the TTL expires, a background sweeper (or a lazy check on next read) releases the seat back to inventory via an atomic increment. This prevents both oversell and permanent leakage from abandoned carts. Optimistic locking (version numbers, retry on conflict) works when contention is low; pessimistic locking or serialized queues are better for genuinely hot items where most optimistic attempts would fail and retry-storm.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Five million people arrive in the same second. Your decrement is a single atomic operation, so oversell is impossible. Is the design done?",
  "options": [
    {
      "label": "No: a waiting room has to bound what reaches the counter",
      "correct": true,
      "feedback": "Right. Correctness and capacity are separate problems. Every one of those requests still has to reach the single counter, so the waiting room admits users in controlled batches at a rate the backend can absorb, and the inventory store sees bounded QPS no matter how many people showed up."
    },
    {
      "label": "Yes: correctness holds, and the excess requests simply fail fast on a sold out check",
      "feedback": "Failing fast still costs a full round trip through your stack per request, and five million of them in one second melt the tier long before the correctness argument matters."
    },
    {
      "label": "No: add read replicas of the inventory row so the check is cheaper",
      "feedback": "Replicas serve reads. The decrement is a write against one row, and all five million arrivals want that same write, so read scaling never touches the contended path."
    }
  ]
}
\`\`\`

## The waiting room

You cannot let 5 million people hit checkout simultaneously; you would melt the inventory store no matter how atomic it is. Put a virtual waiting room in front: arriving users get a queue token, are shown a "you are number 480,000 in line" page, and are admitted in controlled batches at a rate the backend can absorb (say 5,000 checkouts/sec). This sheds and paces load and provides fairness (FIFO or a randomized lottery to defeat bots). Only admitted users can even attempt a reservation, so the inventory store sees bounded QPS regardless of how many people showed up.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Pace the crowd, then let one atomic counter do the rest",
  "reveal": "all",
  "nodes": [
    {
      "id": "arrivals",
      "label": "5M arrivals",
      "kind": "client"
    },
    {
      "id": "room",
      "label": "Waiting room: a queue token, FIFO or a lottery to defeat bots, admitting about 5,000 per second",
      "kind": "queue"
    },
    {
      "id": "reservation",
      "label": "Reservation: one atomic conditional decrement, never read-then-write",
      "kind": "service"
    },
    {
      "id": "inventory",
      "label": "Inventory counter (a sold-out item is bounded by this single counter)",
      "kind": "db"
    },
    {
      "id": "sweeper",
      "label": "Hold with a TTL, released by a sweeper or a lazy check on the next read",
      "kind": "service"
    },
    {
      "id": "checkout",
      "label": "Checkout saga",
      "kind": "service"
    },
    {
      "id": "payment",
      "label": "Payment",
      "kind": "external"
    },
    {
      "id": "sale",
      "label": "Hold converted to a sale",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "arrivals",
      "to": "room",
      "kind": "sync"
    },
    {
      "from": "room",
      "to": "reservation",
      "kind": "sync",
      "label": "only admitted users may attempt one"
    },
    {
      "from": "reservation",
      "to": "inventory",
      "kind": "sync",
      "label": "decrement"
    },
    {
      "from": "reservation",
      "to": "sweeper",
      "kind": "async",
      "label": "the cart window, say 10 minutes"
    },
    {
      "from": "reservation",
      "to": "checkout",
      "kind": "sync"
    },
    {
      "from": "checkout",
      "to": "payment",
      "kind": "sync"
    },
    {
      "from": "payment",
      "to": "sale",
      "kind": "sync"
    },
    {
      "from": "sweeper",
      "to": "inventory",
      "kind": "feedback",
      "label": "TTL expiry: atomic increment releases the seat"
    }
  ],
  "caption": "The waiting room is what keeps the inventory store at bounded QPS however many people showed up, because you cannot shard a single seat."
}
\`\`\`

Hot-item sharding has a limit: you cannot shard a single seat, so the truly contended item is serialized. Accept that a sold-out item's throughput is bounded by one atomic counter, and design the waiting room so most users never reach it.

**Recap:** prevent oversell with a single atomic conditional decrement (never read-then-write), use reservation holds with TTL and automatic release for the cart window, and put a fair, rate-limiting waiting room in front to shed and pace the spike so the inventory store sees bounded load.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Why can you not scale the hot item the way you scale everything else, by sharding its counter?",
  "options": [
    {
      "label": "A single seat cannot be split, so it is serialized by nature",
      "correct": true,
      "feedback": "Right. A sold out item's throughput is capped by one atomic counter no matter how many machines you own, so the only lever left is how many requests ever reach it. That is what makes the waiting room a requirement rather than a nicety."
    },
    {
      "label": "You can: split 10,000 seats into ten counters of 1,000 and decrement a random one",
      "feedback": "That works while stock is plentiful and fails at the end. A request landing on an empty shard sees sold out while seats remain elsewhere, so you either mislead buyers or rebalance under exactly the contention you were avoiding."
    },
    {
      "label": "Because a decrement spread across shards is no longer atomic",
      "feedback": "Each shard's decrement is still atomic on its own. What you lose is a single truthful view of remaining stock."
    }
  ],
  "reveal": "One absolute rule, never oversell, and three mechanisms serving it. The decrement is a single atomic conditional operation, a conditional UPDATE whose affected row count you check, a Lua guarded Redis DECR, or a per item serialized queue, and never a read followed by a write in application code. Reservation holds with a TTL cover the cart window and release automatically so abandoned carts do not leak inventory. And a waiting room in front sheds and paces the spike, admitting users FIFO or by lottery at a rate the backend can absorb, because the truly contended item is serialized and the only lever left is how many requests reach it."
}
\`\`\`
`.trim()

const webCrawlerTeach = `
## The canonical large-scale batch pipeline

A web crawler is the canonical large-scale batch pipeline: discover, fetch, dedup, store, and repeat, across billions of pages, without getting banned. The interview tests whether you can build a distributed producer-consumer loop that is polite, deduplicated, and incrementally fresh.

## The frontier

The heart is the frontier: the queue of URLs to fetch.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Suppose the frontier were a single priority queue and fetchers always pulled the highest priority URL available. What goes wrong first?",
  "options": [
    {
      "label": "A high value host's URLs cluster at the top, so you hammer one site at thousands of requests per second and get blocked",
      "correct": true,
      "feedback": "Right, and politeness is the first thing interviewers probe. It is why the frontier is two layers: front queues for priority, back queues holding one host each with a per-host delay."
    },
    {
      "label": "Low priority URLs are never fetched, so the crawl misses most of the web",
      "feedback": "Starvation is a real scheduling concern, handled with priority bands and aging. The failure that ends the crawl is getting banned by the hosts you care about most."
    },
    {
      "label": "The queue grows without bound, because link extraction adds URLs faster than fetchers remove them",
      "feedback": "The frontier does grow enormous and needs durable storage. Size is a capacity problem you plan for; politeness is a correctness problem that stops the crawler working at all."
    }
  ]
}
\`\`\`

So the frontier is not a single FIFO. It must do two jobs at once: prioritize (crawl important, fresh, high-PageRank pages first) and enforce politeness (never hammer one host). The classic design (Mercator style) uses two layers of queues: front queues for priority (a URL is assigned to a priority band) and back queues for politeness (each back queue holds URLs for exactly one host, and a per-host timer enforces a minimum delay, respecting \`Crawl-delay\` and robots.txt). A heap of "next-fetch-time per host" tells the fetchers which host is due. This is what keeps you from sending 10,000 requests/sec to one small site and getting your IP blocked.

**Interview nuance:** politeness is the single most common thing juniors omit and the first thing interviewers probe. Say explicitly: fetch robots.txt per host (and cache it), enforce a per-host rate limit / min delay, identify with a real User-Agent, and back off on 429/503. A crawler without politeness gets banned and is useless.

### Two inbound edges into the frontier

Link extraction is one way URLs enter the frontier, and it is the slow one. A URL only enters after some page that links to it has been fetched, so the time from publication to discovery is bounded by how often you happen to recrawl the referring page. Your fetchers are not the term that matters:

\`\`\`
09:00:00  publisher posts /2026/quake; the homepage now links to it
          (you last fetched that homepage at 08:47, on its change-rate schedule)
09:02:00  homepage recrawled
09:02:04  link extractor emits /2026/quake, dedup says new, frontier accepts it
09:02:06  host is due, fetcher pulls the article

          discovery latency 2m 04s     fetch latency 2s
\`\`\`

So publishers declare their own new URLs, and a crawler that wants a sub-minute SLA reads those declarations as a **second inbound edge into the frontier** that never waits on a referring page.

**Sitemaps.** \`robots.txt\` points at a sitemap: a list of the site's URLs, each with a \`lastmod\` timestamp. Poll it and diff it against your seen-set:

\`\`\`
GET https://news.example.com/robots.txt
  Sitemap: https://news.example.com/sitemap-news.xml

GET https://news.example.com/sitemap-news.xml          <- polled every 30s
  <url><loc>.../2026/quake</loc><lastmod>2026-08-14T09:00:11Z</lastmod></url>
  <url><loc>.../2026/budget</loc><lastmod>2026-08-13T18:02:00Z</lastmod></url>

  /2026/quake   unseen loc                          -> inject into the frontier
  /2026/budget  known, lastmod > our last fetch     -> inject as a recrawl
  everything else: lastmod unchanged                -> skip, no fetch

09:00:30  /2026/quake is in the frontier, 19s after publication
\`\`\`

One small polled document discovered it, and no referring page was fetched at all. The poll interval, not the recrawl schedule of some other page, is now the discovery-latency term, and you set it per source.

**WebSub (formerly PubSubHubbub)** removes the poll. The publisher's feed names a hub; you subscribe once, and the hub calls you on publish:

\`\`\`
once, at subscribe time:
  POST https://hub.example.com/
    hub.mode=subscribe
    hub.topic=https://news.example.com/feed.atom
    hub.callback=https://crawler.example.com/websub

on every publish, the hub POSTs you (you are polling nothing):
  POST https://crawler.example.com/websub
    <entry><link href=".../2026/quake"/><updated>2026-08-14T09:00:11Z</updated></entry>

09:00:12  /2026/quake is in the frontier, ~1s after publication
\`\`\`

RSS and Atom feeds sit between the two: polled like a sitemap, but small and ordered newest-first, so a tight loop over an active source is cheap. All three routes drop a URL into the same frontier and out through the same per-host back queue, so politeness is unchanged: you are buying discovery speed from the publisher's own announcement, not from fetching anyone harder. That is what makes discovery latency and fetch latency separate tunable terms rather than one number.

## Dedup at two levels

URL dedup: before adding a URL to the frontier, check whether you have seen it, using a normalized URL (canonicalize scheme/host/case, strip tracking params, resolve relative links). At billions of URLs a hash set in memory is too big, so use a bloom filter (or scalable variant) for a fast "definitely new / probably seen" check backed by a durable seen-set store; a bloom filter's false positives cost you a few dropped new URLs, which is acceptable. Content dedup: many URLs return identical or near-identical content (mirrors, session-id URLs, print pages). Hash the content (or use MinHash/simhash shingling for near-duplicate detection) so you do not index the same page a million times. This also helps with crawler traps (infinite calendars, faceted-search URL explosions) which you additionally bound with max-depth and per-host URL caps.

## Fetching and freshness

Fetching is distributed and I/O-bound. Run many fetcher workers pulling due URLs from the frontier, with async I/O for high concurrency per box, DNS caching (DNS lookups are a real bottleneck at scale, cache aggressively), and connection reuse. Fetched pages go to a raw store (S3/HDFS) as the crawl corpus, a link-extraction stage parses out new URLs and feeds them back to the frontier (the loop), and the corpus feeds a downstream indexing pipeline that builds the inverted index.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "The crawl loop",
  "nodes": [
    {
      "id": "frontier",
      "label": "Frontier (front: priority, back: per-host politeness)",
      "kind": "queue"
    },
    {
      "id": "discovery",
      "label": "Publisher-declared discovery (sitemap lastmod polls, RSS/Atom, WebSub push)",
      "kind": "service"
    },
    {
      "id": "fetchers",
      "label": "Fetchers (async I/O, DNS cache, robots check)",
      "kind": "service"
    },
    {
      "id": "raw_store",
      "label": "Raw store (S3)",
      "kind": "db"
    },
    {
      "id": "link_extractor",
      "label": "Link extractor",
      "kind": "service"
    },
    {
      "id": "url_dedup",
      "label": "URL dedup (bloom filter)",
      "kind": "service"
    },
    {
      "id": "content_dedup",
      "label": "Content dedup (simhash)",
      "kind": "service"
    },
    {
      "id": "indexer",
      "label": "Indexer (inverted index)",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "discovery",
      "to": "frontier",
      "kind": "async",
      "label": "URLs the publisher announced, no referring page needed"
    },
    {
      "from": "frontier",
      "to": "fetchers",
      "kind": "async",
      "label": "due URLs (per-host timer)"
    },
    {
      "from": "fetchers",
      "to": "raw_store",
      "kind": "sync",
      "label": "fetched pages"
    },
    {
      "from": "raw_store",
      "to": "link_extractor",
      "kind": "async"
    },
    {
      "from": "link_extractor",
      "to": "url_dedup",
      "kind": "sync",
      "label": "normalized URLs"
    },
    {
      "from": "url_dedup",
      "to": "frontier",
      "kind": "async",
      "label": "new URLs re-enter the loop"
    },
    {
      "from": "raw_store",
      "to": "content_dedup",
      "kind": "async"
    },
    {
      "from": "content_dedup",
      "to": "indexer",
      "kind": "async",
      "label": "deduped corpus"
    }
  ],
  "stages": [
    {
      "adds": [
        "frontier",
        "discovery",
        "fetchers"
      ],
      "note": "The heart is the frontier: front queues assign priority, each back queue holds one host, and a next-fetch-time heap enforces the per-host delay so you never hammer one small site. Distributed fetchers pull only the hosts that are due. Note the two inbound edges: publisher-declared discovery (sitemap lastmod, feeds, WebSub push) enters here directly, while link extraction closes the loop from the other side."
    },
    {
      "adds": [
        "raw_store"
      ],
      "note": "Fetched pages land in a raw store (S3/HDFS): the durable crawl corpus that feeds everything downstream."
    },
    {
      "adds": [
        "link_extractor",
        "url_dedup"
      ],
      "note": "Link extraction closes the loop: new URLs are canonicalized and checked against a bloom filter (definitely new vs probably seen) backed by a durable seen-set, so billions of URLs stay affordable."
    },
    {
      "adds": [
        "content_dedup",
        "indexer"
      ],
      "note": "Content dedup (simhash/MinHash) stops mirrors, session-id URLs, and crawler traps from being indexed a million times; the deduped corpus feeds the indexing pipeline that builds the inverted index."
    }
  ],
  "caption": "A distributed producer-consumer loop: polite, deduplicated, and incrementally fresh."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You have crawled a billion pages once. How do you keep the corpus fresh?",
  "options": [
    {
      "label": "Adaptive recrawl by estimated change rate, with conditional GETs",
      "correct": true,
      "feedback": "Right. News changes hourly and an archive page never does, so the recrawl budget follows the change rate rather than the calendar. An If-Modified-Since or ETag request then makes the check almost free: an unchanged page costs a 304 instead of a full fetch."
    },
    {
      "label": "Recrawl everything on a fixed cycle, so no page is ever staler than the cycle length",
      "feedback": "A uniform cycle spends the same budget on a news homepage as on a decade old archive, so either the news is stale or most of the crawl is wasted."
    },
    {
      "label": "Rely on link extraction to rediscover changed pages, since a changed page usually gets relinked",
      "feedback": "Discovery finds new URLs, not new content at a URL you already have. A page can change without anyone linking to it again."
    }
  ]
}
\`\`\`

Freshness needs incremental recrawl, not one-shot. Estimate change rates per page (news changes hourly, an archive never does) and schedule recrawls adaptively, using HTTP conditional GETs (If-Modified-Since / ETag) so unchanged pages cost a cheap 304 instead of a full refetch.

**Recap:** a two-layer frontier balances priority and per-host politeness, bloom-filter URL dedup plus simhash content dedup avoid redundant work and traps, distributed async fetchers with DNS caching do the I/O, and adaptive incremental recrawl with conditional GETs keeps the corpus fresh. Discovery is its own term with its own inbound edge: sitemap \`lastmod\` polls, feeds, and WebSub pushes put a URL in the frontier without waiting for a referring page to be recrawled.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Which dedup does the bloom filter do, and what does its error rate cost you?",
  "options": [
    {
      "label": "URL dedup before the frontier: a false positive drops a genuinely new URL, an acceptable loss at billions of URLs",
      "correct": true,
      "feedback": "Right. The filter answers definitely new or probably seen, backed by a durable seen-set, and its one sided error costs you the occasional missed page rather than duplicated work."
    },
    {
      "label": "Content dedup after fetch: a false positive drops a genuinely new page, an acceptable loss",
      "feedback": "Near duplicate content is caught with simhash or MinHash shingling over the fetched bytes. The bloom filter sits earlier, on normalized URLs, to keep the seen set affordable."
    },
    {
      "label": "URL dedup, and a false positive causes the same URL to be crawled twice",
      "feedback": "The error runs the other way. A bloom filter never reports new for something it has seen, so it can only claim seen for something new, which means a missed URL, not a duplicate fetch."
    }
  ],
  "reveal": "A crawler is a producer-consumer loop with four disciplines. The frontier does priority and politeness at once, front queues banding by importance and back queues holding one host each behind a next-fetch-time heap, with robots.txt cached per host and backoff on 429 and 503. Dedup happens twice: bloom filtered normalized URLs before the frontier, and content hashing or simhash after the fetch, which also blunts mirrors and crawler traps alongside depth and per-host caps. Fetching is distributed and I/O bound, so async workers with aggressive DNS caching and connection reuse. And freshness is adaptive recrawl with conditional GETs, not a single pass."
}
\`\`\`
`.trim()

const metricsMonitoringTeach = `
## Write throughput and cardinality control

A metrics platform ingests a firehose of numbers over time (millions of data points per second from thousands of hosts), stores them cheaply, serves fast dashboard queries, and fires alerts. The interview is really about two things: write throughput into a time-series database, and controlling cardinality so cost does not explode.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A team adds a user_id label to http_requests_total so they can slice by customer. You have ten million users. What does that cost?",
  "options": [
    {
      "label": "Every series it already had, multiplied by ten million",
      "correct": true,
      "feedback": "Right, and the multiplication is the part that surprises people. A series is a unique combination of label values, so the new label does not add ten million series, it multiplies the series you already had by ten million. A metric already split by 200 services, 5 regions and 8 status codes is 8,000 series; add the user id and it is 80 billion. Unbounded fields like user id, request id or email are what actually take these systems down."
    },
    {
      "label": "Nothing at storage time: labels are just strings attached to the same series, so only queries get more complex",
      "feedback": "The label values are what define the series. A new value is a new series to index and store, not extra text hanging off an existing one."
    },
    {
      "label": "Slower writes but similar storage, since time series data compresses extremely well",
      "feedback": "Compression works within a series, where timestamps are regular and adjacent values are similar. Cardinality multiplies the number of series, and compression has nothing to work with across them."
    }
  ]
}
\`\`\`

## The cardinality trap

A metric is a name plus a set of labels plus a timestamped value: \`http_requests_total{service="checkout", region="us-east", status="200"} = 4823 @ t\`. The unique combination of label values is a time series. Here is the trap that dominates this problem: cardinality is the product of all label value counts, so a new label MULTIPLIES rather than adds. The metric above, split by 200 services, 5 regions and 8 status codes, is 8,000 series. Add a \`user_id\` label with 10M values and it is not 10M series, it is 8,000 times 10M, which is 80 billion, and your storage and query cost explode. Controlling cardinality (never put unbounded-cardinality fields like user id, request id, or email in labels) is the single most important design discipline.

**Interview nuance:** when asked "what breaks first," say high-cardinality labels. Interviewers want to hear that you would reject \`user_id\`/\`trace_id\` as labels, cap label sets, and detect cardinality spikes, because unbounded cardinality is what actually takes these systems down.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Cardinality is a product, not a sum",
  "predictPrompt": {
    "question": "One metric carries 200 services, 5 regions and 8 status codes. A team adds a user_id label with 10 million values. Roughly how many time series does that one metric become?",
    "options": [
      "About 8,000",
      "About 10 million",
      "About 200 million",
      "About 80 billion"
    ]
  },
  "workedExample": "At the initial settings the metric is 200 services times 5 regions times 8 status codes, which is 8,000 series, about 46 million samples a day at a 15 second scrape, and roughly 60 MB a day once compressed to about 1.3 bytes per sample. Leave user_id at 1, which means the label is absent. Slide it to 10 million and the same single metric becomes 80 billion series, because a series is a unique combination of label values and cardinality multiplies rather than adds. None of that growth is text hanging off an existing series: each one carries its own index entry and its own sample stream, and compression only works within a series, where timestamps are regular and adjacent values are similar, so it has nothing to exploit across 80 billion of them.",
  "inputs": [
    {
      "kind": "slider",
      "id": "services",
      "label": "service label values",
      "min": 1,
      "max": 2000,
      "initial": 200,
      "unit": "services"
    },
    {
      "kind": "slider",
      "id": "regions",
      "label": "region label values",
      "min": 1,
      "max": 40,
      "initial": 5,
      "unit": "regions"
    },
    {
      "kind": "slider",
      "id": "statuses",
      "label": "status label values",
      "min": 1,
      "max": 40,
      "initial": 8,
      "unit": "codes"
    },
    {
      "kind": "slider",
      "id": "user_ids",
      "label": "user_id label values (1 means the label is not there)",
      "min": 1,
      "max": 10000000,
      "scale": "log",
      "initial": 1,
      "unit": "users"
    }
  ],
  "outputs": [
    {
      "id": "series",
      "label": "Time series from this one metric",
      "expr": "services * regions * statuses * user_ids",
      "format": "compact",
      "unit": "series",
      "sparkline": {
        "over": "user_ids"
      }
    },
    {
      "id": "samples_per_day",
      "label": "Samples per day at a 15 second scrape",
      "expr": "series * 5760",
      "format": "compact",
      "unit": "samples/day"
    },
    {
      "id": "bytes_per_day",
      "label": "Compressed storage per day at 1.3 bytes per sample",
      "expr": "samples_per_day * 1.3",
      "format": "bytes",
      "unit": "per day"
    }
  ],
  "caption": "This is why user_id, request_id, trace_id and email are rejected as labels. The metric name did not change and the sample rate did not change; the label value count did, and it multiplies."
}
\`\`\`

## Ingestion and storage

Agents on each host batch and push samples (or the platform scrapes \`/metrics\` endpoints on an interval, the Prometheus pull model). A high-throughput front door (a stateless ingestion tier writing to Kafka) buffers the firehose and decouples spiky producers from storage. Batching and compression are essential: time-series data compresses beautifully because timestamps are regular and adjacent values are similar (delta-of-delta timestamp encoding plus XOR float compression, the Gorilla/Facebook technique, gets ~1.3 bytes per sample versus 16 raw).

Storage is a purpose-built TSDB (Prometheus TSDB, Cortex/Mimir, InfluxDB, TimescaleDB) organized for the dominant query pattern: "give me one series over a time range." Data is partitioned by time into blocks (recent blocks in memory/SSD for fast writes and hot reads, older blocks flushed to object storage) and indexed by label so a query can find matching series quickly.

## Retention, rollups, alerting

You do not keep raw 1-second resolution for a year. Downsample: keep raw for a short window (e.g., 15 days), then pre-aggregate into 5-minute and 1-hour rollups (min/max/avg/count) for longer retention. A dashboard showing last quarter reads cheap hourly rollups, not billions of raw points. Retention tiers plus rollups are the cost-control lever alongside cardinality.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Firehose in, dashboards and pages out",
  "reveal": "all",
  "nodes": [
    {
      "id": "hosts",
      "label": "Thousands of hosts",
      "kind": "client"
    },
    {
      "id": "agents",
      "label": "Agents: batch and compress (or the platform scrapes /metrics)",
      "kind": "service"
    },
    {
      "id": "kafka",
      "label": "Kafka: buffers the firehose so spiky producers cannot stall storage",
      "kind": "queue"
    },
    {
      "id": "ingester",
      "label": "Ingester (TSDB write path, cardinality limits on label values)",
      "kind": "service"
    },
    {
      "id": "hot",
      "label": "Recent blocks, hot: memory or SSD, delta-of-delta timestamps plus XOR floats, about 1.3 bytes per sample",
      "kind": "db"
    },
    {
      "id": "rollups",
      "label": "5m and 1h rollups (min, max, avg, count), cold in object storage",
      "kind": "db"
    },
    {
      "id": "query",
      "label": "Query engine (label index, then a range scan over one series)",
      "kind": "service"
    },
    {
      "id": "dash",
      "label": "Dashboards",
      "kind": "client"
    },
    {
      "id": "rules",
      "label": "Rule evaluator (every 15s)",
      "kind": "service"
    },
    {
      "id": "alerts",
      "label": "Alert manager: dedup, group, silence, route",
      "kind": "service"
    },
    {
      "id": "notify",
      "label": "PagerDuty, Slack, email",
      "kind": "external"
    }
  ],
  "edges": [
    {
      "from": "hosts",
      "to": "agents",
      "kind": "sync"
    },
    {
      "from": "agents",
      "to": "kafka",
      "kind": "async",
      "label": "batched and compressed"
    },
    {
      "from": "kafka",
      "to": "ingester",
      "kind": "async"
    },
    {
      "from": "ingester",
      "to": "hot",
      "kind": "sync",
      "label": "partitioned by time"
    },
    {
      "from": "hot",
      "to": "rollups",
      "kind": "async",
      "label": "downsample once the raw retention window passes"
    },
    {
      "from": "hot",
      "to": "query",
      "kind": "sync",
      "label": "recent, full resolution"
    },
    {
      "from": "rollups",
      "to": "query",
      "kind": "sync",
      "label": "a quarter-long chart reads these"
    },
    {
      "from": "query",
      "to": "dash",
      "kind": "sync"
    },
    {
      "from": "query",
      "to": "rules",
      "kind": "sync",
      "label": "the same query path, on a schedule"
    },
    {
      "from": "rules",
      "to": "alerts",
      "kind": "sync",
      "label": "firing conditions"
    },
    {
      "from": "alerts",
      "to": "notify",
      "kind": "sync",
      "label": "one incident, not 500 pages"
    }
  ],
  "groups": [
    {
      "id": "ingest",
      "label": "Ingest path",
      "nodes": [
        "agents",
        "kafka",
        "ingester"
      ]
    },
    {
      "id": "storage",
      "label": "Storage tiers: hot raw, cold rollups",
      "nodes": [
        "hot",
        "rollups"
      ]
    },
    {
      "id": "read",
      "label": "Read paths: dashboards and alerting",
      "nodes": [
        "query",
        "dash",
        "rules",
        "alerts"
      ]
    }
  ],
  "caption": "Cost is controlled at two levers, and both are visible here: cardinality limits at the ingester, and retention tiers between the hot and cold stores."
}
\`\`\`

Alerting is periodic rule evaluation. A rule engine runs queries on a schedule (e.g., every 15s), \`avg(rate(errors[5m])) > 0.05\`, and on a firing condition creates an alert. Crucially, an alert manager deduplicates and groups (one incident, not 500 pages from 500 hosts), applies silences/inhibitions, and routes to PagerDuty/Slack/email.

**Recap:** buffer the ingestion firehose through Kafka into a compressed TSDB partitioned by time, control cost with cardinality limits plus retention tiers and downsampled rollups, serve dashboards from a label-indexed query engine, and evaluate alert rules on a schedule with a dedup/group/route alert manager.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A dashboard charts error rate across the last quarter. Which data does it read?",
  "options": [
    {
      "label": "Downsampled rollups, because the raw data has aged out",
      "correct": true,
      "feedback": "Right. Raw resolution is kept for a short window only, then pre-aggregated into 5 minute and hourly rollups that carry min, max, avg and count, so a spike still shows. A quarter long chart could not render per second detail anyway. Retention tiers plus rollups are the cost lever alongside cardinality control."
    },
    {
      "label": "Raw samples, because rollups would smooth away the spikes that matter",
      "feedback": "The rollup keeps the max per bucket, so a spike survives as the max. Reading billions of raw points for a quarter long chart is the cost you avoid."
    },
    {
      "label": "Raw samples from object storage, since older blocks are flushed there and stay queryable",
      "feedback": "Older blocks do move to object storage, but retention ages the raw data out. What remains for long windows is the rollup."
    }
  ],
  "reveal": "Two forces shape this system: write throughput and cost control. Agents batch and push, or the platform scrapes, into a stateless ingestion tier that buffers through Kafka so spiky producers cannot stall storage. The TSDB is partitioned by time, hot blocks in memory or SSD and older ones in object storage, compressed hard with delta-of-delta timestamps and XOR encoded floats, and indexed by label. Cost is controlled at two levers: cardinality limits, because unbounded label values are what break the system, and retention tiers with downsampled rollups. Alerting is scheduled rule evaluation feeding an alert manager that deduplicates, groups, silences and routes, so one incident is one page."
}
\`\`\`
`.trim()

const adClickAggregatorTeach = `
## Fast and eventually exact

An ad click aggregator ingests a high-volume stream of click events and produces per-campaign counts that advertisers see in near real time and that also feed billing, so the numbers must be both fast and eventually exact. This is the canonical streaming-aggregation interview, and it lives or dies on two ideas: idempotent counting and reconciling real-time with batch truth.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A click consumer restarts and Kafka redelivers the last batch. Your aggregator does a plain increment per event. What did the advertiser get billed for?",
  "options": [
    {
      "label": "Clicks that happened once and were counted twice",
      "correct": true,
      "feedback": "Right, and because clicks are money that is fraud by bug. At-least-once delivery plus a blind increment double counts on every replay. The fix is dedup on a click id, or a processor whose state update and offset commit are atomic."
    },
    {
      "label": "Nothing extra: the offsets were committed, so redelivered events are skipped",
      "feedback": "Offsets are committed after processing, so a crash between the increment and the commit is exactly the window that replays. That window is where the double count lives."
    },
    {
      "label": "Fewer clicks than happened, since events in flight during the restart are dropped",
      "feedback": "The log is retained and redelivered from the last committed offset, so the failure mode here is duplication, not loss."
    }
  ]
}
\`\`\`

## Idempotent counting

The naive design fails immediately. If you just do \`counter++\` per event on an at-least-once stream (Kafka redelivers on consumer restart), you double-count, and since clicks are money, that is fraud-by-bug. You need exactly-once or idempotent counting. Each click carries a unique id; dedup on it. At high volume you cannot keep every id forever, so use a bloom filter or a windowed dedup store (recent ids in Redis with TTL) to reject replays cheaply, accepting a tiny false-positive rate. Alternatively, lean on the stream processor's exactly-once semantics (Flink checkpointing, Kafka transactions) so an aggregate update and the source offset commit are atomic, meaning a replay after crash does not double-apply.

**Interview nuance:** state the delivery-semantics problem out loud: Kafka gives at-least-once by default, so naive increments double-count. Name your fix (Flink exactly-once via checkpointed state + transactional sink, or explicit dedup on click id), because "just increment a counter" is the failing answer.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Ingestion lags by ten minutes during a spike. If you window clicks by the time your consumer saw them, what happens to the per minute campaign counts?",
  "options": [
    {
      "label": "Clicks are attributed to the wrong minute, so the shape is wrong",
      "correct": true,
      "feedback": "Right. The daily total can still come out right while the shape of the campaign's traffic is nonsense, which is the harder error to notice. That is why you window on event time, when the click happened, rather than processing time, when you saw it."
    },
    {
      "label": "Nothing: the counts are identical, just delivered ten minutes later",
      "feedback": "A uniform delay would only shift the chart. Ingestion lag is not uniform, so a backlog draining fast piles many minutes of clicks into one window."
    },
    {
      "label": "The clicks are dropped, because their window has already closed",
      "feedback": "Windowing on processing time never closes a window early, since every event looks current on arrival. The damage is misattribution, not loss."
    }
  ]
}
\`\`\`

## Event time and watermarks

Clicks arrive late and out of order (a mobile device offline for an hour uploads its clicks later). You aggregate over windows (per-minute, per-hour tumbling windows per campaign), and you need watermarks to decide when a window is "done." A watermark is the stream's assertion that "no events older than T will still arrive," so the window can close and emit. You also configure allowed lateness: hold windows open a bit past the watermark to admit stragglers, and emit late updates for clicks arriving after close. Event time (when the click happened) not processing time (when you saw it) is what you window on, or your counts are wrong whenever ingestion lags.

\`\`\`cswidget
{
  "type": "watermark-sim",
  "title": "Late Clicks vs the Watermark",
  "predictPrompt": {
    "question": "A mobile device was offline and uploads a batch of old clicks after the watermark has passed their window's end. With some allowed lateness configured, what happens to those clicks?",
    "options": [
      "They are silently discarded, so the campaign count stays wrong forever",
      "Clicks inside the allowed lateness land in the closed window and emit a late correction; only clicks beyond it are at risk",
      "They are counted into whatever window is currently open, misattributing the revenue to the wrong minute"
    ]
  },
  "workedExample": "The stream carries ad clicks stamped with the moment each click happened, and a seeded slice arrives well behind its event time, like the offline phone from the lesson uploading its clicks an hour later. Windows tumble at a fixed width per campaign and each closes once the watermark, trailing the newest event time seen by a small delay, passes its end. At the starting allowed-lateness setting, some stragglers still reach their closed window and fire a late update that corrects the count. Drag the lateness slider to zero and those same clicks miss entirely, silently undercounting revenue; raise it and the corrections return, at the cost of holding windows open longer before the number is final.",
  "seed": "ad-clicks-offline-upload",
  "count": 60,
  "horizon": 120,
  "skew": 12,
  "windowSize": 10,
  "watermarkDelay": 5,
  "allowedLateness": 8,
  "maxLateness": 30,
  "modes": [
    "event-time"
  ],
  "caption": "Windows close on the watermark; allowed lateness decides whether a late click becomes a count correction or a missing dollar."
}
\`\`\`

## Lambda / Kappa

Real-time systems are approximate and can have gaps, so the industry pattern is Lambda or Kappa. Lambda runs two paths: a fast streaming path (Flink) that gives immediate, slightly-approximate counts for the advertiser dashboard, and a slow batch path (Spark over the raw event log in S3, run hourly/daily) that recomputes the exact, deduplicated, fraud-filtered numbers that billing uses. The batch layer is the source of truth and corrects any streaming drift. Kappa simplifies to one streaming engine with replay: the same Flink job can reprocess from the Kafka/log retention to recompute, avoiding two codebases.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Lambda: a fast approximate path and an exact one",
  "reveal": "all",
  "nodes": [
    {
      "id": "clicks",
      "label": "Click events (at-least-once, out of order, some fraudulent)",
      "kind": "client"
    },
    {
      "id": "kafka",
      "label": "Kafka: the raw log, retained so it can be replayed",
      "kind": "queue"
    },
    {
      "id": "flink",
      "label": "Flink: event-time windows, watermarks, allowed lateness, dedup on click id",
      "kind": "service"
    },
    {
      "id": "counters",
      "label": "Sharded counters (pre-aggregated in the stream, summed on read)",
      "kind": "db"
    },
    {
      "id": "dash",
      "label": "Advertiser dashboard (near real time, slightly approximate)",
      "kind": "client"
    },
    {
      "id": "s3",
      "label": "S3: the raw events, kept whole",
      "kind": "db"
    },
    {
      "id": "spark",
      "label": "Spark batch, hourly: exact, deduplicated, fraud filtered",
      "kind": "service"
    },
    {
      "id": "billing",
      "label": "Billing: the number that is charged",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "clicks",
      "to": "kafka",
      "kind": "sync"
    },
    {
      "from": "kafka",
      "to": "flink",
      "kind": "async"
    },
    {
      "from": "flink",
      "to": "counters",
      "kind": "sync"
    },
    {
      "from": "counters",
      "to": "dash",
      "kind": "sync"
    },
    {
      "from": "kafka",
      "to": "s3",
      "kind": "async",
      "label": "the same events, archived"
    },
    {
      "from": "s3",
      "to": "spark",
      "kind": "async"
    },
    {
      "from": "spark",
      "to": "billing",
      "kind": "sync"
    },
    {
      "from": "spark",
      "to": "counters",
      "kind": "feedback",
      "label": "batch corrects streaming drift"
    }
  ],
  "groups": [
    {
      "id": "speed",
      "label": "Speed layer: fast, approximate",
      "nodes": [
        "flink",
        "counters",
        "dash"
      ]
    },
    {
      "id": "batch",
      "label": "Batch layer: slow, exact, the source of truth",
      "nodes": [
        "s3",
        "spark",
        "billing"
      ]
    }
  ],
  "caption": "Both layers read the same retained log, which is what makes Kappa possible: one replayable streaming job instead of two codebases."
}
\`\`\`

Hot campaigns create counter hotspots; a viral ad might take millions of increments/sec on one key. Shard the counter into N sub-counters updated independently and summed on read, and pre-aggregate within the stream processor before writing. Fraud/bot filtering (dedup, rate anomalies, click-farm patterns) runs in-stream for fast defense and again in batch for the authoritative purge.

**Recap:** dedup clicks idempotently (bloom/windowed store or Flink exactly-once) so at-least-once delivery does not double-count, window on event time with watermarks and allowed lateness for out-of-order clicks, use Lambda/Kappa so a fast approximate stream is reconciled by an exact batch (or replayable) source of truth, and shard hot-campaign counters.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The advertiser dashboard shows 41,102 clicks for a campaign and the billing run shows 40,987. Which is right, and why do both exist?",
  "options": [
    {
      "label": "Billing, because the batch path recomputes over the raw log",
      "correct": true,
      "feedback": "Right. The batch or replayed path recomputes exact, deduplicated, fraud filtered numbers from the retained raw log, while the streaming path trades a little accuracy for immediacy. The fast path is allowed to be approximate precisely because a slower authoritative path reconciles it, which is the whole point of Lambda and Kappa."
    },
    {
      "label": "The dashboard: it is closest to the live stream, and the batch job is a stale snapshot",
      "feedback": "The batch path reads the retained raw log, so it is not stale, it is late and complete. The streaming path is the approximate one."
    },
    {
      "label": "Neither: the two should agree exactly, so a gap means the pipeline has a bug",
      "feedback": "A small gap is the expected outcome of the architecture, not a defect. The batch layer exists to correct streaming drift."
    }
  ],
  "reveal": "Fast and eventually exact, and the design earns both words separately. Exactness comes from idempotent counting, dedup on a click id through a bloom filter or a windowed store, or a processor with checkpointed state and a transactional sink so a replay cannot double apply. Correct attribution comes from windowing on event time with watermarks deciding when a window closes and allowed lateness admitting stragglers as corrections. Trust comes from Lambda or Kappa, a fast approximate stream for the dashboard reconciled by an exact, fraud filtered batch or replay that billing uses. And a viral campaign's counter is sharded into sub counters summed on read, with pre-aggregation inside the stream processor."
}
\`\`\`
`.trim()

const leaderboardTopkTeach = `
## A trap wearing a trivial costume

A leaderboard looks trivial ("sort players by score") and is a trap, because the naive SQL answer collapses under load. The interview tests whether you know the right data structure (a sorted set), how to scale it, how to handle hot counters, and where approximation is a legitimate win.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Ten million players, constant score updates, and every client wants the top ten plus their own rank. With an index on score the top ten is a cheap ten row walk. Which half still does not scale?",
  "options": [
    {
      "label": "The rank query: counting every higher score has no ten row shortcut",
      "correct": true,
      "feedback": "Right. The top ten is bounded work, walk ten rows down the index and stop. Rank is not: counting every score above yours touches a slice of the table that grows with the player base, and it has to be recomputed on every request while scores keep moving."
    },
    {
      "label": "Both halves, since a table under constant writes cannot use an index",
      "feedback": "Writes keep an index current at a cost, they do not disable it. The top ten really is cheap here; the rank count is the half whose cost grows."
    },
    {
      "label": "The results would be stale, because the index cannot keep up with the write rate",
      "feedback": "The index stays current. The problem is what each read costs, not whether it is fresh."
    },
    {
      "label": "SQL cannot express a player's rank without a window function, which does not scale here",
      "feedback": "SQL can express rank several ways, and expressiveness is not the issue. Per request cost is."
    }
  ]
}
\`\`\`

## The sorted set

The wrong instinct is \`SELECT ... ORDER BY score DESC LIMIT 10\` plus, for a player's rank, \`SELECT COUNT(*) WHERE score > my_score\`. Be precise about which half hurts. With an index on score the top ten is cheap: the database walks ten entries down the index and stops. The rank query has no such shortcut, because counting every score above yours touches a slice of the table that grows with the player base, on every request, while ten million scores keep moving under it. The right primitive is a Redis sorted set (ZSET). A ZSET keeps members ordered by score in a skip list, giving O(log n) inserts/updates (ZADD), O(log n + k) top-K reads (ZREVRANGE 0 k), and O(log n) rank lookup (ZREVRANK). That single structure answers both "top 10" and "my rank" without scanning everyone.

**Interview nuance:** the interviewer wants you to reject the SQL-sort-per-request answer and name the sorted set with its complexities. Saying "Redis ZSET, ZREVRANGE for top-K, ZREVRANK for my rank, both O(log n)" is the seniority signal.

## Sharding the ZSET

A single ZSET has limits at tens of millions of members and high write rate, so shard it. Segment by natural boundaries (region, league, time window like daily/weekly boards) so each ZSET stays a manageable size, and maintain a smaller global top-N ZSET merged from the top of each shard for the global board (only the top entries of each shard can be globally top-N, so you merge cheaply). All-time boards are snapshotted periodically. "My rank" within a segment is exact; global exact rank across shards is expensive, so global rank is often approximate or bucketed ("top 1%").

## Hot counters and approximation

A single hot key (global likes, total views, a mega-popular player's score) taking millions of increments/sec becomes a write hotspot and lock contention point. The fix is a sharded/distributed counter: split the logical counter into N sub-counters (\`counter:0..N-1\`), increment a random shard per write so writes fan out, and sum the N shards on read. This trades a slightly more expensive read for massive write parallelism.

Where exactness is not required, approximate structures are a big memory win. HyperLogLog counts unique items (unique players seen, unique visitors) with ~0.8 percent error in ~12 KB regardless of cardinality, versus gigabytes for an exact set. Count-Min Sketch estimates per-item frequencies and heavy hitters (approximate top-K of a stream) in fixed memory with bounded overcount. Use these when "about 4.2M unique" or "roughly the top trending items" is good enough.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "What the board is asked for",
    "Structure and call",
    "Cost per request"
  ],
  "rows": [
    [
      "rank, the naive way",
      "SELECT COUNT(*) WHERE score > my_score",
      "grows with the player base, on every request"
    ],
    [
      "score update",
      "DB holds the truth, then ZADD into the segment ZSET",
      "O(log n)"
    ],
    [
      "top K",
      "ZREVRANGE segment 0 k",
      "O(log n + k)"
    ],
    [
      "my rank",
      "ZREVRANK segment player",
      "O(log n)"
    ],
    [
      "global board",
      "merge the top N of each shard ZSET",
      "one small merge, and exact global rank stays expensive"
    ],
    [
      "a single hot counter",
      "INCR counter:rand(0..N-1), read SUMs the N sub-counters",
      "writes fan out N ways, reads cost N"
    ],
    [
      "unique players seen",
      "HyperLogLog",
      "about 12 KB at any cardinality, roughly 0.8 percent error"
    ],
    [
      "trending top K",
      "Count-Min Sketch",
      "fixed memory, bounded overcount"
    ]
  ],
  "highlightCols": [
    "Cost per request"
  ],
  "caption": "The top ten was never the expensive half: with an index it is a ten row walk. Rank is the half with no shortcut, and the sorted set is what gives both in O(log n). Redis is a rebuildable index here, not the system of record."
}
\`\`\`

Durability matters: Redis is the fast serving/index layer, not the system of record. Persist authoritative scores in a database and treat the ZSET as a rebuildable index (write-behind, or rebuild from an event stream), so a Redis loss is a rebuild, not data loss.

**Recap:** use a Redis sorted set for O(log n) updates and top-K/rank reads instead of SQL sort-per-request, shard the ZSET by segment with a merged global top-N, break hot counters into summed sub-counters for write parallelism, reach for HyperLogLog and Count-Min Sketch when approximate is good enough, and keep authoritative scores in a database with Redis as a rebuildable index.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your Redis instance holding the leaderboard is lost. How bad is that?",
  "options": [
    {
      "label": "A rebuild rather than a data loss, because authoritative scores live in a database and the sorted set is a derived index",
      "correct": true,
      "feedback": "Right. Redis is the fast serving and index layer, not the system of record, so the recovery path is a rebuild from the database or an event stream."
    },
    {
      "label": "A data loss: ranks exist only in the sorted set, so scores have to be re-entered",
      "feedback": "Ranks are derived from scores, and scores belong in the system of record. Treating Redis as the only copy is what turns a cache incident into a data incident."
    },
    {
      "label": "Neither: Redis persistence guarantees the sorted set survives a lost instance",
      "feedback": "Persistence helps a restart, not a lost instance or a corrupted dataset, which is why the rebuildable index framing matters."
    }
  ],
  "reveal": "The trivial looking problem hides four decisions. The primitive is a sorted set, giving O(log n) score updates, O(log n + k) top-K reads and O(log n) rank lookups, instead of a sort or scan per request. Scale comes from sharding the set by region, league or time window with a smaller merged global top-N, accepting that exact global rank is expensive and often bucketed. A single hot counter is split into sub counters incremented at random and summed on read. Approximation is a legitimate win where exactness is not needed, HyperLogLog for unique counts and Count-Min Sketch for heavy hitters. And the database stays the source of truth with Redis as a rebuildable index."
}
\`\`\`
`.trim()

const stockExchangeTeach = `
## The order-matching engine

A matching engine is the component of an exchange that holds one instrument's order book and pairs each incoming buy order against the resting sell orders, and each incoming sell against the resting buys, under a published fairness rule. Everything else on the venue exists to feed it or to publish what it decided: gateways and pre-trade risk checks in front, market data and clearing behind. So the design question is not which services to draw, it is what this one component has to guarantee and what that rules out.

An order-matching engine is the interview where the usual web instincts (throw it in a database, shard it, scale horizontally) are all wrong, and knowing why is the whole point. The requirements are microsecond latency, perfect determinism (an audit must be able to replay every fill exactly), and strict fairness. Those force a single-writer, in-memory, event-sourced design.

## Price-time priority: how a fill is decided

The matching rule is price-time priority over a limit order book: for buys, highest price first; for sells, lowest price first; and at the same price, the earliest order wins (time priority). A limit order rests in the book until matched; a market order takes the best available price immediately; a cancel removes a resting order. The book is two sorted structures (bids descending, asks ascending) grouped by price level, each level a FIFO queue of orders. Matching pops the best price levels and fills in time order.

\`\`\`cswidget
{
  "type": "steps",
  "title": "Order book: rest, sweep, new spread",
  "frames": [
    {
      "note": "A limit order book for one symbol: asks sorted ascending, bids descending, a FIFO queue within each price level. Best bid 100.90, best ask 101.10, spread 0.20. At 101.10 two resting sells queue in arrival order: o5 (120 sh) ahead of o6 (80 sh).",
      "rows": [
        {
          "label": "ask 101.20",
          "cells": [
            {
              "text": "o7 300sh"
            }
          ]
        },
        {
          "label": "ask 101.10",
          "cells": [
            {
              "text": "o5 120sh"
            },
            {
              "text": "o6 80sh"
            }
          ]
        },
        {
          "label": "spread",
          "cells": [
            {
              "text": "0.20",
              "state": "dim"
            }
          ]
        },
        {
          "label": "bid 100.90",
          "cells": [
            {
              "text": "o3 150sh"
            }
          ]
        },
        {
          "label": "bid 100.80",
          "cells": [
            {
              "text": "o4 250sh"
            }
          ]
        }
      ]
    },
    {
      "note": "A limit buy o8 arrives at 100.95 for 100 sh. It does not cross the best ask at 101.10, so it rests in the book as the new best bid. The spread narrows to 0.15.",
      "rows": [
        {
          "label": "ask 101.20",
          "cells": [
            {
              "text": "o7 300sh",
              "state": "dim"
            }
          ]
        },
        {
          "label": "ask 101.10",
          "cells": [
            {
              "text": "o5 120sh",
              "state": "dim"
            },
            {
              "text": "o6 80sh",
              "state": "dim"
            }
          ]
        },
        {
          "label": "spread",
          "cells": [
            {
              "text": "0.15",
              "state": "new"
            }
          ]
        },
        {
          "label": "bid 100.95",
          "cells": [
            {
              "text": "o8 100sh",
              "state": "new"
            }
          ]
        },
        {
          "label": "bid 100.90",
          "cells": [
            {
              "text": "o3 150sh",
              "state": "dim"
            }
          ]
        },
        {
          "label": "bid 100.80",
          "cells": [
            {
              "text": "o4 250sh",
              "state": "dim"
            }
          ]
        }
      ],
      "predict": {
        "question": "A market buy for 250 sh arrives. At what prices does it fill?",
        "options": [
          "All 250 at 101.10",
          "200 at 101.10, then 50 at 101.20",
          "At the best bid, 100.95"
        ]
      }
    },
    {
      "note": "Price-time priority: the market buy takes the best ask level first. o5 fills before o6 because it arrived earlier at the same price; 120 + 80 = 200 sh empties the 101.10 level. The remaining 50 sh sweep up to 101.20 and partially fill o7.",
      "rows": [
        {
          "label": "ask 101.20",
          "cells": [
            {
              "text": "o7 -50sh",
              "state": "active"
            },
            {
              "text": "250sh left",
              "state": "new"
            }
          ]
        },
        {
          "label": "ask 101.10",
          "cells": [
            {
              "text": "o5 120sh",
              "state": "dropped"
            },
            {
              "text": "o6 80sh",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "mkt buy 250sh",
          "cells": [
            {
              "text": "200 @ 101.10",
              "state": "active"
            },
            {
              "text": "50 @ 101.20",
              "state": "active"
            }
          ]
        }
      ]
    },
    {
      "note": "After the sweep the 101.10 level is gone: best ask is now 101.20 with 250 sh of o7 left, best bid is still o8 at 100.95, and the spread widened from 0.15 to 0.25. The market order consumed liquidity, and the book shows it.",
      "rows": [
        {
          "label": "ask 101.20",
          "cells": [
            {
              "text": "o7 250sh",
              "state": "active"
            }
          ]
        },
        {
          "label": "spread",
          "cells": [
            {
              "text": "0.25",
              "state": "new"
            }
          ]
        },
        {
          "label": "bid 100.95",
          "cells": [
            {
              "text": "o8 100sh"
            }
          ]
        },
        {
          "label": "bid 100.90",
          "cells": [
            {
              "text": "o3 150sh",
              "state": "dim"
            }
          ]
        },
        {
          "label": "bid 100.80",
          "cells": [
            {
              "text": "o4 250sh",
              "state": "dim"
            }
          ]
        }
      ]
    }
  ],
  "caption": "Price-time priority in action: a resting limit, a two-level market sweep, and the spread it leaves behind."
}
\`\`\`

## The order book: which data structure, and why

The book is what the rest of the design is built around, so settle it before drawing any architecture. Its shape is already fixed by the matching rule: two sides, bids ordered by price descending and asks ascending, and inside a single price level a FIFO queue of orders in arrival order.

What varies is how the price levels are stored, and the deciding factor is that the hot path is narrow. An incoming order reads the best price level, fills against the front of that level's queue, and either empties the level or leaves a partial fill. A cancel removes one order from the middle of a queue. A new resting order appends to a level or creates one. Reading the best bid or the best ask happens on every single message; the ranged sorted query that a general-purpose index is built for happens never.

| Order-book structure | Read the best bid or ask | Rest a new order | Fits when |
| --- | --- | --- | --- |
| Array of price levels indexed by tick | O(1) through a best-level cursor | O(1) append to that level's queue | Prices are dense and bounded, as on a listed equity |
| Balanced tree, skip list, or treap keyed by price | O(1) through a cached edge pointer | O(log n) to create a new price level | Prices are sparse or unbounded, as on a crypto pair |
| One sorted list of orders, with no price levels | O(1) at the head | O(n) to find the insertion point | Never at production volume: every message re-walks the list |

The array of price levels is the usual answer for a listed equity. Prices move in ticks across a narrow band, so a level is an index lookup and the best level is a cursor you nudge as levels empty and fill, which is where the O(1) best-bid read comes from. A skip list or a treap earns its place when the price range is wide or unbounded and a dense array would be mostly empty, and a cached edge pointer keeps the best-price read O(1) there too.

Either workable option also needs a hash map from order id to the order's node in its queue. Cancels are the most common message on many venues, and a cancel that scans a price level to find its order turns the cheapest operation into the most expensive one.

**Interview nuance:** naming the structure is worth less than naming the operations that chose it. Say which reads and writes sit on the hot path (best price on every message, append to a level, cancel by id, delete an emptied level) and the structure follows from them.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The matching engine is single threaded per instrument. Why is that better here than a thread pool taking a lock per order?",
  "options": [
    {
      "label": "The bottleneck is determinism and tail latency, not throughput",
      "correct": true,
      "feedback": "Right. A lock costs microseconds this domain does not have, and worse, thread scheduling would decide tie breaks, which makes the output different on every run. A lock free single writer over a sequenced input stream gives reproducible fills and a tight tail, which a sharded transactional database cannot."
    },
    {
      "label": "Because one thread gets more CPU cache to itself than several threads combined",
      "feedback": "Cache friendly sequential access is a real part of why the ring buffer is fast, and it is a consequence rather than the reason. The reason is that concurrency makes the result nondeterministic, which the audit forbids."
    },
    {
      "label": "Because matching is I/O bound, so additional threads would only wait",
      "feedback": "There is no I/O on the hot path at all: the book lives entirely in memory, which is itself another reason a disk backed database is the wrong tool."
    }
  ]
}
\`\`\`

## Single-writer sequencing

The counterintuitive core: use a single-writer, single-threaded matching engine, not a database with locks. Why is single-threaded faster and more correct here? Because a lock per order in a general database adds milliseconds and nondeterminism (thread scheduling decides tie-breaks), and this domain needs microseconds and reproducibility. A sequencer assigns a total order to all inbound events (every order, cancel, and modify gets a monotonic sequence number), and a single thread processes them one at a time from an in-memory ring buffer (the LMAX Disruptor pattern), with no locks, cache-friendly memory access, and no cross-thread nondeterminism. Horizontal scale comes from sharding by instrument: each symbol (AAPL, TSLA) gets its own single-writer engine, and there is no cross-symbol coordination on the hot path.

**Interview nuance:** the signal here is explaining that single-threaded beats multi-threaded for this workload. Say: the bottleneck is not CPU throughput, it is determinism and tail latency, and a lock-free single writer over sequenced input gives both, which a sharded transactional database cannot.

The order book lives entirely in memory (arrays or intrusive structures per price level for O(1) best-price access), with no per-order database round-trip on the hot path, because a disk read would blow the microsecond budget.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Each fill needs a timestamp, and two orders arriving together need a tie break. Where do both come from?",
  "options": [
    {
      "label": "From the sequence number the sequencer assigned",
      "correct": true,
      "feedback": "Right. Determinism means the same ordered input always yields identical output, so every decision has to be a function of the sequenced stream. Read a wall clock or randomize a tie and the replay produces different fills, which is exactly what the audit forbids."
    },
    {
      "label": "From the machine clock, kept tightly synchronized so all engines agree",
      "feedback": "Even perfectly synchronized clocks read differently during a replay than during the original run, and a replay that produces different fills fails the audit requirement."
    },
    {
      "label": "From arrival order at the network card, which is the fairest measure available",
      "feedback": "Arrival order is what the sequencer captures and makes durable. Using it without the assigned, journaled number leaves you nothing to replay against."
    }
  ]
}
\`\`\`

## Deterministic replay from the journal

Determinism is a hard requirement, not a nice-to-have, because regulators and replay demand that the same ordered input always yields identical output. That means: no wall-clock decisions in matching logic (derive time and ids from the sequence number), no random tie-breaking, and no multi-threaded races. Given the exact same sequenced input, a replay must reproduce every fill identically.

Recovery uses event sourcing. Before the engine acts on an accepted event, append it to a durable, replicated journal (the sequenced event log). On a crash, spin up a fresh engine and replay the journal to reconstruct the exact book state; periodic snapshots bound replay time so you replay from the last snapshot forward rather than from the beginning of the day. Because matching is deterministic, replay is guaranteed to rebuild the identical book.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "One deterministic path from order to fill",
  "reveal": "all",
  "nodes": [
    {
      "id": "orders",
      "label": "Orders in (limit, market, cancel)",
      "kind": "client"
    },
    {
      "id": "risk",
      "label": "Pre-trade risk checks",
      "kind": "service"
    },
    {
      "id": "seq",
      "label": "Sequencer: assigns the sequence number, appends to the journal",
      "kind": "service"
    },
    {
      "id": "journal",
      "label": "Journal (replicated): the input every replay starts from",
      "kind": "db"
    },
    {
      "id": "engine",
      "label": "Single-threaded matching engine per instrument, order book in memory, price-time priority",
      "kind": "service"
    },
    {
      "id": "standby",
      "label": "Hot-standby replica: replays the journal for deterministic takeover",
      "kind": "service"
    },
    {
      "id": "fills",
      "label": "Fills and book deltas",
      "kind": "queue"
    },
    {
      "id": "bus",
      "label": "Market-data bus (multicast or streaming)",
      "kind": "queue"
    },
    {
      "id": "subs",
      "label": "Subscribers (traders, feeds, audit)",
      "kind": "client"
    }
  ],
  "edges": [
    {
      "from": "orders",
      "to": "risk",
      "kind": "sync"
    },
    {
      "from": "risk",
      "to": "seq",
      "kind": "sync",
      "label": "accepted orders only"
    },
    {
      "from": "seq",
      "to": "journal",
      "kind": "sync",
      "label": "append before matching"
    },
    {
      "from": "journal",
      "to": "engine",
      "kind": "sync",
      "label": "one ordered input stream"
    },
    {
      "from": "journal",
      "to": "standby",
      "kind": "async",
      "label": "same stream, same result"
    },
    {
      "from": "engine",
      "to": "fills",
      "kind": "sync"
    },
    {
      "from": "fills",
      "to": "bus",
      "kind": "sync"
    },
    {
      "from": "bus",
      "to": "subs",
      "kind": "sync"
    }
  ],
  "caption": "Sharding the matching engine per instrument is the only sharding allowed: within an instrument a single thread over one ordered journal is what makes an audit able to replay every fill exactly."
}
\`\`\`

Market-data fan-out must not slow matching: publish trades and book deltas onto a separate high-throughput multicast or streaming bus so slow subscribers cannot backpressure the matcher. Availability comes from hot-standby replicas that consume the same sequenced log and can take over deterministically, plus pre-trade risk checks in front of the matcher (credit/position limits) so bad orders never reach the book.

## Failure modes and what each one costs

| Failure | What breaks | What the design does about it |
| --- | --- | --- |
| The matching engine process dies mid session | The in-memory book is gone | Replay the journal into a fresh engine from the last snapshot: because matching is deterministic, the rebuilt book is identical rather than approximate |
| The engine matches before the journal append is durable | A fill exists that no replay can reproduce | Append the sequenced event to the replicated journal first, then match, so the journal is always the input of record |
| A market-data subscriber falls behind | Backpressure reaches the matcher and the tail-latency budget is gone | Publish fills and book deltas on a separate bus, so a slow subscriber only slows itself |
| Matching reads a wall clock or breaks a tie at random | A replay produces different fills from the original run | Derive time, ids, and tie-breaks from the sequence number alone |
| An order breaches a client's credit or position limits | A trade the client cannot settle reaches the book | Pre-trade risk checks sit in front of the sequencer, so the order is rejected before it is ever sequenced |

**Recap:** match by price-time priority in an in-memory order book, process a single-writer sequenced event stream single-threaded (Disruptor style) for lock-free determinism and microsecond latency, shard by instrument for scale, keep matching fully deterministic (no wall-clock, no randomness), recover by replaying a replicated event journal from snapshots, and fan out market data on a separate bus with hot standbys for availability.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The primary matching engine dies mid session. How does the exchange come back with the identical book?",
  "options": [
    {
      "label": "Replay the replicated journal from the last snapshot",
      "correct": true,
      "feedback": "Right. Because matching is deterministic, replaying the sequenced journal into a fresh engine reproduces every fill exactly rather than approximately, which is what event sourcing buys here. The snapshot exists only to bound how much of the day you have to replay."
    },
    {
      "label": "Restore the most recent snapshot and accept that fills after it are lost",
      "feedback": "Those fills are trades that really happened. The journal tail after the snapshot is exactly what makes recovery exact."
    },
    {
      "label": "Fail over to a hot standby that has been mirroring the primary's memory pages",
      "feedback": "A hot standby is the right answer for availability, and it stays in step by consuming the same sequenced log and matching deterministically, not by copying memory."
    }
  ],
  "reveal": "Every usual web instinct is wrong here, and the reasons are specific. Matching is price-time priority over an in-memory limit order book, two sorted sides of FIFO price levels. Events are totally ordered by a sequencer and processed by a single writer thread over a ring buffer, because the requirement is microsecond tail latency and reproducibility rather than raw throughput, and scale comes from sharding by instrument instead of by threads. Matching must be deterministic, so no wall clock and no random tie breaks. Recovery is event sourcing: journal before acting, replay from a snapshot to rebuild the exact book. And market data leaves on a separate bus so slow subscribers cannot backpressure the matcher."
}
\`\`\`
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
            "Why a URL shortener refuses an AUTO_INCREMENT primary key, and how base62 keys plus a cache carry 116K reads per second.",
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
            "Token bucket for bursts, sliding window counter for an accurate cap, and one Lua script so twenty nodes cannot each grant the full limit.",
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
              "Read the incident timeline below and say what is happening to acct_4KQ. Account for why its concurrency rejections keep climbing after the ledger service recovered, tie the counter value 512 to a quantity elsewhere in the timeline, and say what the flat rate layer and the eu-west counter each eliminate.",
            thinkAbout: [
              "Which of the three layers is issuing the 429s, and what does the rate layer's untouched token bucket eliminate?",
              "Follow one timed-out charge call through the concurrency layer, from the INCR to the 504. What happens to the slot it took?",
              "The counter reads 512 while the load balancer sees 6 open connections for the account. Which of those two numbers is its real concurrency?",
            ],
            modelAnswerOutline: [
              "**What is happening:** `rl:inflight:acct_4KQ` has stopped tracking in-flight requests and is now a running total of requests that never reached the path that decrements it. Each of Tuesday's gateway timeouts cancelled the handler after the `INCR` and before the response path, and the key carries no TTL (`TTL` returns -1), so a slot taken that way is never given back. The counter reads 512 while the account's real concurrency is the 6 open connections the load balancer reports, and because 512 is far past the budget of 40, every charge call is rejected no matter how little traffic the account sends.",
              "**The arithmetic ties the counter to the timeouts:** 3.1% of the roughly 16,500 charge calls acct_4KQ sent between 09:12 and 11:00 is about 512, which is exactly what the key holds. The rejection rate going 4%, then 22%, then 61% while the ledger p99 fell back to 190ms is the signature of a value that only ratchets: the load dropped and the number did not.",
              "**What the flat signals eliminate:** rate-layer rejections are 0 all week and the token bucket held 100 tokens at three sampled rejections, so the account is not over its request rate. The endpoint layer rejected nothing on any route. Redis CPU is flat at 22% with no evictions and a Lua p99 flat at 1.9ms, so neither limiter latency nor Redis saturation is involved, and the local-fallback counter reads 0, so nothing failed open onto a permissive local limiter.",
              "**Ruling out the coincident deploy and the region hypothesis:** the Tue 02:50 change added an endpoint bucket for `/v1/reports`, but that route's traffic is unchanged at 3 req/min and it has rejected nothing. Per-region buckets can let an account exceed a global cap, but that error admits too much traffic rather than rejecting it, and eu-west's counter reads 2 while 96% of the account's traffic is in us-east. Neither explains a counter that only rises.",
              "**What closes it:** make a slot self-releasing instead of trusting a decrement to run. Register each in-flight request as its own key with a TTL comfortably longer than the 10s gateway timeout and count the set, or hold the decrement in a deferred path that also runs on cancellation, and add a reconciliation sweep, since this counter can only drift upward. The one-time repair is deleting the key so the next `INCR` recreates it at 0.",
              "**Keep the layer:** the concurrency limiter is precisely what catches Tuesday's failure, slow downstream calls piling up while the request rate still looks fine, so deleting it gives back the protection it was added for. Common wrong turn: raising the budget from 40 to some larger number, which buys a few hours before the same ratchet passes it.",
            ],
            supplied: {
              label: "Incident timeline",
              body: `
**System:** payments API. Every \`POST /v1/charges\` passes three limiter layers in the caller's region, each a Redis Lua script sharded by account.

- **Rate layer**, key \`rl:rate:{acct}\`: token bucket, capacity 100, refill 100/s. TTL 60s, set when the key is created.
- **Concurrency layer**, key \`rl:inflight:{acct}\`: the handler runs \`INCR\` before it calls the ledger service and \`DECR\` on the path that returns a response to the client. Budget 40 in flight. The key is created by \`INCR\` and no TTL is set on it.
- **Endpoint layer**, key \`rl:ep:{acct}:{route}\`: a tighter bucket per expensive route.

A rejection from any layer returns 429. The concurrency layer's 429 carries \`X-RateLimit-Signal: concurrency\`.

**Timeline**
- Tue 02:50 deploy adds an endpoint-layer bucket for \`POST /v1/reports\`. That route's traffic is unchanged at 3 req/min all week.
- Tue 09:12 ledger service p99 goes from 180ms to 9.4s. 3.1% of charge calls exceed the gateway's 10s timeout; the gateway returns 504 to the caller and cancels the handler's context.
- Tue 09:20 acct_4KQ starts seeing 429s carrying the concurrency signal, 4% of its charge calls.
- Tue 09:12 to 11:00 acct_4KQ sends roughly 16,500 charge calls.
- Tue 11:00 ledger p99 back to 190ms and the timeout rate back to 0.0%. acct_4KQ's concurrency rejections keep climbing: 22% at 11:00, 61% at 14:00.
- Wed 04:00 overnight trough. acct_4KQ sends 3 req/s and the load balancer reports 6 open connections for it. 100% of its charge calls are rejected with the concurrency signal.
- Wed 09:00 \`GET rl:inflight:acct_4KQ\` returns 512. \`TTL rl:inflight:acct_4KQ\` returns -1.

**Signals**
- Redis CPU flat at 22%, no evictions, 0 rejected connections. Limiter Lua p99 flat at 1.9ms since Friday.
- Rate-layer rejections for acct_4KQ: 0 all week. Sampled at three of the concurrency rejections, its token bucket held 100 tokens.
- Local-fallback counter (the limiter runs a permissive local bucket when Redis is unreachable): 0 for the week.
- Endpoint layer: 0 rejections on any route, including \`/v1/reports\`.
- acct_4KQ sends 96% of its traffic to us-east and 4% to eu-west. \`rl:inflight:acct_4KQ\` in eu-west reads 2.
- 11 other accounts saw no gateway timeouts on Tuesday. Their \`rl:inflight\` values sit between 0 and 31 and none of them has been rejected.
`.trim(),
            },
            rubric: [
              {
                name: "Cause named",
                weak: "Blames the account's own traffic or Redis capacity, and leaves the counter reading 512 during a 3 req/s trough unexplained.",
                adequate:
                  "Says the in-flight counter is too high without saying which request outcome left it that way.",
                strong:
                  "States that the 10s gateway timeouts cancelled handlers after the INCR and before the response path that decrements, and that with no TTL on rl:inflight those slots are never returned.",
              },
              {
                name: "Evidence tied to the numbers",
                weak: "Treats 512 as an arbitrary reading and never connects it to anything else in the timeline.",
                adequate:
                  "Notes that 512 is far above the budget of 40 but does not derive it from the timeout rate.",
                strong:
                  "Derives 512 from 3.1% of the roughly 16,500 charge calls sent between 09:12 and 11:00, and reads the 4, 22, 61 percent climb after the ledger recovered as a value that only ratchets.",
              },
              {
                name: "Hypotheses ruled out",
                weak: "Offers a single cause and tests it against none of the flat signals.",
                adequate:
                  "Rules out the rate layer but leaves the Tue 02:50 deploy or the per-region buckets standing as live possibilities.",
                strong:
                  "Uses the flat signals by name: 0 rate-layer rejections with 100 tokens in the bucket, Redis at 22% with a 1.9ms script p99, 0 local-fallback events, unchanged /v1/reports traffic, and eu-west reading 2.",
              },
              {
                name: "Remedy and blast radius",
                weak: "Stops at the diagnosis, or proposes deleting the concurrency layer that exists to catch a slow downstream.",
                adequate:
                  "Says the decrement has to run on every path, without covering the process that dies between the INCR and the DECR.",
                strong:
                  "Makes the slot self-releasing with a per-request key whose TTL outlives the 10s gateway timeout, names deleting the key as the immediate repair, and keeps the layer.",
              },
            ],
          },
        },
        {
          id: "sd-l10-unique-id-generator",
          title: "Design a Distributed Unique ID Generator (Snowflake)",
          summary:
            "How Snowflake spends 64 bits so every node mints sortable ids alone, and why a clock that jumps backwards must stop issuing.",
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
              "Read the incident report below and say what is happening to the 41 messages. Explain why every affected id decodes into the same 1.412s span on one host, say what the etcd lease audit and the sequence peak each eliminate, and say what the store did with the second write to that primary key.",
            thinkAbout: [
              "Which field of a Snowflake id moves when a host's clock steps backwards, and which two fields carry on as if nothing happened?",
              "Two hypotheses produce duplicate ids: two processes holding one worker id, and one process reusing a timestamp. Which does the etcd audit close?",
              "All 41 were delivered live and acked by fan-out. Between the socket and the stored row, where can the message still be lost?",
            ],
            modelAnswerOutline: [
              "**What is happening:** ids minted on `msg-gw-14` inside the 03:14:22.6 to 03:14:24.0 span were minted twice. The NTP step of -1.412s moved that host's clock back into a range it had already issued in, and nothing stopped the generator from re-issuing those 41-bit timestamps. The worker id is fixed for the process and the 12-bit sequence restarts each millisecond, so the whole 64-bit id repeats. Cassandra applies the second `INSERT` at that primary key as an upsert, so the second message replaces the first message's columns in place. The first message was never deleted, it was overwritten, which is why the row still exists, holds another author's text, and appears nowhere in the delete audit.",
              "**Why the evidence lands where it does:** all 41 ids decode through `(id >> 22) + epoch` into a window 1.412s wide, exactly the size of the step, and all 41 came from the three gateway processes on the one host the hypervisor migrated. A cause outside the id generator would not respect either boundary.",
              "**What the flat signals eliminate:** Cassandra logged 0 write timeouts, 0 dropped mutations and 0 unavailable exceptions, and repair ran clean on Wednesday, so nothing was lost or left unreplicated on write. The gateway acked all 41 with no socket errors, so delivery is intact and the loss is at the row. Fleet volume of 480K messages/min is inside the normal overnight band, so this is not load.",
              "**Ruling out the other duplicate-id hypothesis and the coincident deploy:** two processes sharing a worker id would produce exactly these collisions, but the audit shows 96 distinct etcd leases with no expiry or reissue in the window and worker ids 41, 42 and 43 held on that host since Monday. Sequence exhaustion is out too, since the peak was 610 of 4,096 per millisecond, nowhere near a wrap. The Wed 21:40 cursor change is coincident rather than causal: the messages are equally absent from a direct primary-key read, and every other host's channels paginate normally.",
              "**What closes it:** the generator has to track the last-issued timestamp and refuse to issue while the clock sits behind it, waiting or erroring rather than emitting a possibly duplicate id. A refusal counter reading 0 across the fleet is consistent with nothing being armed to fire. Configure NTP to slew rather than step where it can, and treat a live migration as a reason to pause issuance until the clock is verified. The 41 overwritten rows cannot be recovered from Cassandra, since the upsert left no prior version; recovery has to come from the fan-out log.",
              "**Alternatives worth pricing:** ULID or UUIDv7 keep time in the high bits without a worker-id lease but carry the same clock dependency. A lightweight transaction (`IF NOT EXISTS`) on the message id turns a silent overwrite into a visible failure at a real cost per write, and a per-channel sequence removes the clock entirely at the cost of the coordination Snowflake exists to avoid. Common wrong turn: widening the sequence bits, which does nothing about a timestamp that repeats.",
            ],
            supplied: {
              label: "Incident report: missing messages",
              body: `
**System:** chat service, 96 gateway processes. Messages land in Cassandra table \`messages\`, \`PRIMARY KEY ((channel_id), message_id)\`, clustered by \`message_id\` ascending. Cassandra applies an \`INSERT\` at an existing primary key as an upsert: the new columns replace the stored row's.

\`message_id\` is a 64-bit Snowflake minted inside the gateway process: 41 bits of milliseconds since a service epoch, 10 bits of worker id leased from etcd at process start, 12 bits of per-millisecond sequence. Clients decode the send time as \`(id >> 22) + epoch\`. History reads are a clustering-order range scan, \`WHERE channel_id = ? AND message_id < ? LIMIT 50\`.

**Reports, Thursday: 41 messages across 9 channels**
- Each was delivered live over the gateway socket and seen by other members, and is absent when the channel is reopened.
- Support looked up the id the sending client had recorded. In all 41 cases the row exists and holds a different message body, written by a different author in the same channel within the same second.
- A direct read by primary key returns that other message, not the original.

**What the ids decode to**
- All 41 decode to send times inside the span 03:14:22.6 to 03:14:24.0.
- All 41 were written by the 3 gateway processes on host \`msg-gw-14\`.

**Host and cluster state**
- 03:14:22.6 the hypervisor live-migrated \`msg-gw-14\`. Its NTP daemon logged \`time reset -1.412s\` at 03:14:22.6, then no further step that day.
- The generator exports \`id.clock_regression_refusals\`. It reads 0 for the week on every host in the fleet, \`msg-gw-14\` included.
- etcd worker-id lease audit for Thursday: 96 leases, all distinct, none expired or reissued. The three processes on \`msg-gw-14\` hold worker ids 41, 42 and 43, held since Monday.
- Per-millisecond sequence use on those three processes peaked at 610 of 4,096 during the window.

**Signals**
- Cassandra: 0 write timeouts, 0 dropped mutations, 0 unavailable exceptions on Thursday. Compaction and tombstone counts flat. Repair ran clean Wed 02:00.
- Gateway fan-out acked all 41; 0 socket errors in the window.
- Moderation delete audit: no delete recorded against any of the 41 ids.
- A history pagination cursor change shipped Wed 21:40. Channels served by other hosts paginate normally.
- Fleet message volume at 03:14 Thursday was 480K/min, inside the normal overnight band.
`.trim(),
            },
            rubric: [
              {
                name: "Cause named",
                weak: "Attributes the loss to a Cassandra write failure or a deletion, neither of which appears in any log in the report.",
                adequate:
                  "Says two writes collided on one id but does not say what made the same id come back on that host.",
                strong:
                  "States that the -1.412s step let msg-gw-14 re-issue timestamps it had already used, so the full 64-bit id repeated with the worker id fixed and the per-millisecond sequence restarting.",
              },
              {
                name: "What the store did with the duplicate",
                weak: "Leaves it unexplained that the row is present and holding another author's message.",
                adequate:
                  "Calls it a primary-key collision without saying what Cassandra does with an INSERT at an existing key.",
                strong:
                  "Says the second INSERT upserted over the first row's columns, which is why the message is gone, the row exists, and the delete audit is empty.",
              },
              {
                name: "Hypotheses ruled out",
                weak: "Names one cause and tests it against neither the etcd audit nor the flat Cassandra counters.",
                adequate:
                  "Eliminates one alternative, usually the Wed 21:40 cursor change, and leaves duplicate worker ids standing.",
                strong:
                  "Closes duplicate worker ids on the 96 distinct leases, sequence wrap on the 610 of 4,096 peak, delivery on the clean fan-out acks, and the cursor change on the direct primary-key read.",
              },
              {
                name: "Remedy and recovery",
                weak: "Stops at the diagnosis, or moves to random UUIDs without pricing what that costs the clustering-order range scan.",
                adequate:
                  "Says the host's clock has to be disciplined, leaving the generator free to issue ids while its clock sits behind.",
                strong:
                  "Puts a last-issued-timestamp guard in the generator that refuses to issue on a backward jump, and says the 41 overwritten rows survive only in the fan-out log.",
              },
            ],
          },
        },
        {
          id: "sd-l10-typeahead",
          title: "Design Typeahead / Autocomplete",
          summary:
            "Why a typeahead trie caches its top-k at every node, and how debouncing and edge caching shed most keystroke traffic before the origin.",
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
            "Push fan-out dies on celebrities and pull dies on power followers, so a home timeline pushes to normal followers and pulls the rest.",
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
            "The rule that makes a photo app scale: bytes go to object storage behind a CDN, the database gets a pointer, and uploads skip your app tier.",
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
              "Assumptions: 500M users, 100M photos/day at ~2MB average, global audience, read-heavy, feed freshness of seconds is fine. Estimate: 100M x 2MB = 200TB/day of new media before replication; ~600TB/day at 3x replication, or roughly 250 to 300TB/day erasure coded, which is the choice you make for cold media. Read bandwidth is many multiples of write, which forces a CDN.",
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
            "Why chat promises per-conversation ordering and never a global one, and how store-and-forward reaches a phone that has been offline for a day.",
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
            "A push pipeline is at-least-once by construction, so an idempotency key checked before dispatch is what stops a retry sending twice.",
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
            "Matching moving drivers to riders: a spatial index instead of a scan, locations as in-memory overwrites, and one exclusive assignment.",
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
            "How content-defined chunking turns a one-byte edit in a 2GB file into a 4MB upload, and why a conflict keeps both copies instead of merging.",
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
            "Transcoding runs once at upload, so a viral title is a read spike absorbed at the edge rather than a reason to scale the encoder fleet.",
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
            "OT versus CRDTs for concurrent editing: what a central sequencer buys, what it costs you offline, and why last-write-wins is disqualifying.",
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
            "Nearby-places is Uber inverted: the points barely move, so you build a rebuildable search index and cache hard instead of chasing writes.",
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
            "Consistent hashing with virtual nodes solves placement, and a hot key and a cache stampede each need a fix that placement cannot give.",
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
            "Why R plus W greater than N buys freshness and not linearizability, and where an LSM tree charges you back for its very fast writes.",
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
            "How erasure coding reaches eleven nines at 1.4x overhead instead of 3x, and why the metadata index is where read-after-write comes from.",
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
            "Why exactly-once delivery is a lie, what idempotent consumers buy instead, and why partition count is both ordering unit and parallelism cap.",
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
            "A lease makes a crashed worker's job retry rather than duplicate, and a fencing token handles the case a lease cannot: a worker that wakes up.",
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
          title: "Design a Distributed Lock (ZooKeeper, etcd, Fencing)",
          summary:
            "Why a Redis SETNX lock is unsafe at any TTL, and what consensus-backed leases plus fencing tokens add that the naive version never had.",
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
            "Choosing an isolation boundary for hostile code: a container shares the host kernel, a Firecracker microVM does not, and a pids limit stops fork bombs.",
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
            "Never call a customer's endpoint inline: persist, enqueue, retry with backoff, sign with HMAC, and let a stable event id handle duplicates.",
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
            "Idempotency keys, an append-only double-entry ledger with derived balances, and a saga instead of a two-phase commit across a payment provider.",
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
            "One atomic conditional decrement prevents oversell, holds with a TTL cover the cart window, and a waiting room bounds what reaches the counter.",
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
            "Politeness is the first thing an interviewer probes here, and it is why the frontier is two layers of queues rather than one priority queue.",
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
            "High-cardinality labels are what actually take a metrics platform down, and retention tiers with rollups are the other half of the cost story.",
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
              "**Cardinality-based billing** requires an accurate, cheap count of unique series per tenant per period. Exact counting of tens of millions of series per tenant is expensive, so use HyperLogLog per tenant to estimate distinct active series with under 1 percent error at kilobytes of memory, and reconcile against the storage index periodically for the authoritative bill. This gives real-time cardinality visibility plus an accurate month-end total.",
              "**Query isolation:** run per-tenant query quotas and a fair scheduler so one org's expensive dashboard query cannot monopolize the query fleet, and cache per-tenant. Hot/cold tiering and downsampling work as in the single-tenant design but are metered and retained per plan.",
              "Common wrong turn: a shared, unpartitioned TSDB with global cardinality, where one customer's bad deploy that adds a `request_id` label explodes series count, blows up storage and query latency for all 20,000 tenants, and you cannot even attribute the cost. Per-tenant partitioning, quotas, and HLL-based cardinality metering are what make the noisy neighbor a billing event instead of an outage.",
            ],
          },
        },
        {
          id: "sd-l10-ad-click-aggregator",
          title: "Design an Ad Click Aggregator / Real-Time Analytics",
          summary:
            "Idempotent counting so a Kafka replay does not double-bill, event-time windows with watermarks, and a batch path that reconciles the fast one.",
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
            "Why a rank query melts under load when the top ten does not, and how a sharded sorted set answers both while the database stays the truth.",
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
              "**Approximation:** use HyperLogLog for unique counts (unique players seen) at ~12 KB with ~0.8 percent error, and Count-Min Sketch for heavy-hitter/top-K frequency estimates in streams, both trading bounded error for large memory savings.",
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
              "**Global 'players online' and 'matches played'** are exactly the hot-counter problem at its worst. For 'matches played' (monotonic, high write rate) use sharded counters: N sub-counters incremented on random shards, summed (and cached for a second) on read, so no single key takes the full write rate. For 'players online' (a distinct count that goes up and down) use HyperLogLog to approximate unique concurrent players at under 1 percent error and tiny memory, refreshed every few seconds, since an exact live concurrent count across 100M is neither cheap nor necessary on a marketing counter.",
              "Common wrong turn: a per-friend-group materialized leaderboard (100M of them, impossible to keep fresh) and a single global counter row for matches-played that becomes a write bottleneck the instant a global event ends. Read-time friends computation over a shared ZSET, Kafka-batched burst writes, and sharded-counter-plus-HLL for the live aggregates are what hold up under the match-end spike.",
            ],
          },
        },
        {
          id: "sd-l10-stock-exchange",
          title: "Design a Stock Exchange: Order Matching Engine",
          summary:
            "Why a matching engine is single-threaded and in-memory: determinism and tail latency beat throughput, and a replayed journal rebuilds the book.",
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
