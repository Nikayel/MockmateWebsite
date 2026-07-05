> Module **sd-l4-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l4-m2](./sd-l4-m2.md) · Next: [sd-l4-m4](./sd-l4-m4.md)

# L4 · Rate Limiting & Overload

After this module you can build the controls that keep a service alive when demand exceeds supply: pick a rate-limiting algorithm and state its exact response contract, enforce one global limit across a fleet of gateway nodes without a client quietly getting N times their quota, and design overload protection that keeps the service up and serving its most important traffic at 150% of capacity instead of collapsing into a latency death spiral.

### sd-l4-rate-limit-algorithms: Rate Limiting Algorithms

- **id:** `sd-l4-rate-limit-algorithms`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** rate-limiting, token-bucket

#### Learn

Rate limiting answers one question: given a stream of requests keyed by some dimension (per-user, per-IP, per-API-key, per-endpoint, or global), do I allow or reject the next one? The interesting part is the shape of what you allow. Two systems can both permit "100 requests per minute" and behave completely differently at the second scale, and picking the wrong shape either rejects legitimate bursts or lets abuse through.

**Token bucket** is the usual default because it is burst-friendly. Picture a bucket that holds up to `B` tokens and refills at `R` tokens per second. Each request removes one token; if the bucket is empty, reject. A client that has been idle accumulates up to `B` tokens, so it can fire a burst of `B` instantly, then settle to the steady rate `R`. You store just two numbers per key: the current token count and the last-refill timestamp, and you lazily refill on each access (`tokens = min(B, tokens + elapsed * R)`). Capacity `B` sets the maximum burst; `R` sets the long-run rate. This is what most APIs actually want: allow a normal client's natural bursts, cap sustained abuse.

**Leaky bucket** is the opposite intent: it smooths output. Requests enter a queue and drain at a fixed rate, so downstream sees a perfectly steady stream regardless of arrival pattern. Use it when the thing you protect cannot absorb bursts at all (a fixed-throughput device, a payment processor with a hard TPS ceiling). The cost is added latency and a queue to manage.

Then the two window counters. **Fixed window** counts requests per aligned interval (for example, requests in the 12:00:00 to 12:00:59 minute) and resets to zero at the boundary. It is trivially cheap: one integer per key per window. Its fatal flaw is the **boundary spike**: a client can send the full quota in the last second of one window and the full quota in the first second of the next, delivering 2x the intended rate across a two-second span.

**Sliding-window log** fixes accuracy by storing a timestamp for every request and counting those within the trailing window. It is exact but memory-heavy: a client doing 1000 req/min costs 1000 stored timestamps. The practical compromise is the **sliding-window counter**, which keeps the current and previous fixed-window counts and weights the previous one by how much of it still overlaps the trailing window (`count = current + previous * overlap_fraction`). It kills the boundary spike with roughly the memory of fixed window.

**Interview nuance:** the response contract matters as much as the algorithm. On rejection return **HTTP 429 Too Many Requests** with a **Retry-After** header and the standard **RateLimit** headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) so well-behaved clients back off instead of hammering. Decide **fail-open vs fail-closed**: if the limiter's own state store is unavailable, do you allow traffic (protect availability, risk overload) or block it (protect the backend, risk an outage)? Most public APIs fail open on the limiter and rely on downstream load shedding as the real backstop.

```
token bucket (burst-friendly)        fixed window (boundary spike)
  cap B, refill R/sec                  [--59 reqs--|--59 reqs--]
  idle -> save up to B tokens                    ^ 118 in ~1s
  req  -> take 1 or 429                sliding-window counter fixes it
```

Recap: default to token bucket for burst-friendly per-key limits, use sliding-window counter when you need window accuracy without the log's memory, avoid raw fixed window for anything abuse-sensitive, and always return 429 plus Retry-After and RateLimit headers with a stated fail-open or fail-closed policy.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write the algorithm for an API rate limiter that allows short bursts but enforces a steady long-run rate, and state the counters it stores per user.

**Think about:**
- Which algorithm allows bursts vs smooths output?
- What is the fixed-window boundary-spike bug?
- What is the client-facing response contract?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a public REST API where each user (keyed by API key) should get, say, 100 requests per minute steady state but should be allowed a natural burst of up to 20 rapid requests after an idle period. I want O(1) memory per key and a decision cheap enough to run inline on every request.

Algorithm: **token bucket.** I define capacity `B = 20` (max burst) and refill rate `R = 100/60 ≈ 1.67 tokens/sec` (steady rate). Per user I store exactly two fields: `tokens` (current token count, a float) and `last_refill_ts`. On each request:

```
now      = current_time()
elapsed  = now - last_refill_ts
tokens   = min(B, tokens + elapsed * R)   # lazy refill
last_refill_ts = now
if tokens >= 1:
    tokens -= 1
    allow the request
else:
    reject with 429, Retry-After = ceil((1 - tokens) / R)
```

This gives exactly the behavior asked for: an idle client accumulates up to `B=20` tokens and can fire a 20-request burst instantly, then is throttled to the 100/min steady rate as tokens refill. Only two numbers are stored per user, and there is no queue.

Why not the alternatives: **fixed window** (one counter reset each minute) is cheaper still but has the **boundary-spike bug**, a user sends 100 in the last second of minute N and 100 in the first second of minute N+1, so 200 land in about two seconds, double the intended rate. **Leaky bucket** would smooth output but forbids the bursts the requirement explicitly wants and adds queueing latency. **Sliding-window log** is accurate but stores a timestamp per request, wasteful here.

Response contract: on allow, return the standard headers `RateLimit-Limit`, `RateLimit-Remaining` (floor of current tokens), and `RateLimit-Reset`. On reject, return **429 Too Many Requests** with **Retry-After** set to when one token will be available. If the state store backing the counters is unreachable I **fail open** (allow) and lean on downstream load shedding, because a limiter outage should not become a full API outage.

**Common wrong turn:** reaching for a plain fixed-window counter "because it is simple" and shipping the 2x boundary-spike bug, or omitting the 429 / Retry-After contract so clients cannot tell they are throttled and retry-storm the API.

**Self-check rubric:**
- [ ] I chose token bucket and tied capacity `B` to burst and refill `R` to the steady rate.
- [ ] I stated the exact per-user counters stored (token count + last-refill timestamp) and the lazy-refill update.
- [ ] I named and rejected fixed window because of the boundary-spike bug.
- [ ] I specified 429 + Retry-After + RateLimit headers.
- [ ] I stated a fail-open vs fail-closed policy for when the state store is down.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the rate-limiting tiers for Stripe-style payment APIs where a single merchant may legitimately batch thousands of charges at midnight but a compromised key must be contained fast. Choose the algorithms per tier and justify.

**Model answer (revealed on demand):**

Assumptions: payments API, keyed per API key, with distinct concerns: a legitimate merchant running a nightly billing job wants a large controlled burst, while a leaked key doing fraud must be stopped within seconds. One flat limit cannot serve both, so I use layered limits with different algorithms per layer.

Layer 1, **per-key steady rate: token bucket.** Give each key a generous capacity (say `B = 500`) and a refill of `R = 100/sec`, so the nightly batch drains its bucket in a burst then proceeds at the sustained rate. Token bucket is right because the merchant's burst is legitimate and expected. Publish the numbers so clients can pace their jobs.

Layer 2, **hard ceiling: sliding-window counter** at a coarser granularity (for example, per-hour), to cap total volume even if the token bucket is continuously refilled. This catches sustained abuse that stays just under the per-second bucket. Sliding-window counter avoids the fixed-window boundary spike while staying cheap.

Layer 3, **anomaly-triggered clamp.** Payments are money, so I add a fast reactive control: if a key's charge rate or failure/decline rate jumps far above its own trailing baseline (a fraud signal), automatically drop that key to a tiny emergency limit and alert. This is the "contain a compromised key fast" requirement, and no static limit alone provides it.

Because charges are non-idempotent side effects, the response contract must be strict: **429 with Retry-After**, and critically the API requires **idempotency keys** so a client retrying after a 429 cannot double-charge. I **fail closed** at the payment tier when the limiter state store is unavailable for a suspicious key, unusual for public APIs but correct here, since wrongly allowing a fraud burst is worse than briefly rejecting legitimate traffic; legitimate merchants retry safely via idempotency keys. Distributed enforcement of these shared counters is the next lesson.

### sd-l4-distributed-rate-limiting: Distributed Rate Limiting

- **id:** `sd-l4-distributed-rate-limiting`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** rate-limiting, distributed, redis

#### Learn

A single-node limiter is easy because one process owns the counter. Production limiters run on a **fleet of gateway nodes** behind a load balancer, and a user's requests land on any of them. If each of 20 nodes independently enforces "100 req/min," a user spraying across all 20 gets **2000 req/min**, 20x the intended limit. The whole problem of distributed rate limiting is enforcing one global limit across N nodes without paying an unacceptable latency or availability tax.

**Approach 1: centralized exact, with a shared store.** Put the counter in **Redis** and have every node read-modify-write it. The trap is the race: two nodes doing `GET count; if under limit INCR` can both read 99 and both allow, overshooting. You must make the decision **atomic**. For simple counters, `INCR` returns the new value in one round trip, so the node increments first and rejects if the result exceeds the limit. For token bucket you need multiple fields updated together (refill then decrement), so you run a **Lua script** via `EVAL`, which Redis executes atomically as a single operation. This gives exact global enforcement. The cost is a network round trip to Redis on **every request** (a latency tax of, say, 0.5 to 1ms added to each call) and Redis becoming a hot dependency.

**Approach 2: local approximation.** Give each node a slice of the budget: 2000/min total across 20 nodes means 100/min per node, enforced purely in local memory with zero coordination. This is fast and has no shared dependency, but it is only correct when traffic is evenly balanced. If the load balancer sends a hot user disproportionately to a few nodes, those nodes throttle the user early while the global budget is underused, so the effective limit is fuzzy. It also wastes budget: idle nodes' slices are unusable by busy nodes.

**Approach 3: hybrid, the common production answer.** Nodes enforce locally from a **local token cache** for speed, and **asynchronously sync** their consumption to Redis every short interval (say 100ms) to true up the shared view and re-divide the remaining global budget. This bounds overshoot to at most one sync interval's worth of traffic while keeping the hot path in local memory. Envoy's global rate limiting and many CDNs work roughly this way. You accept small, bounded inaccuracy in exchange for low latency and resilience.

**Interview nuance:** always be asked "what if Redis is down?" A rate limiter must not become a **single point of failure** for the whole API. The standard answer is **fail open**: if the shared store is unreachable, fall back to permissive local limits and let downstream load shedding protect the backend, because a limiter outage taking down all traffic is worse than briefly over-admitting. Also handle **hot keys** (one celebrity key hammering a single Redis slot) with key sharding or local caching, and **clock skew / window alignment** across nodes so windows do not drift, use the store's time or logical windows, not each node's wall clock.

```
naive per-node (BROKEN)          hybrid (production)
 node1: 100/min                   local cache enforces fast
 node2: 100/min   x20 nodes       async sync -> Redis every 100ms
 ...              = 2000/min       true up + re-divide budget
 user sprays -> 20x limit         overshoot bounded to ~1 interval
```

Recap: naive per-node limits grant Nx, so either enforce exactly via atomic Redis ops (INCR / Lua, paying a per-request round trip) or approximate locally and async-sync to a shared store for bounded overshoot, and always decide the fail-open path plus hot-key sharding so the limiter never becomes the outage.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Extend a single-node rate limiter to a fleet of 20 gateway nodes without letting a user get 20x their limit.

**Think about:**
- How do you keep the shared counter atomic under races?
- What is the tradeoff of local approximation vs centralized exactness?
- What happens if the shared store (Redis) is down?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 20 stateless gateway nodes behind an L7 load balancer, a user keyed by API key can land on any node, and the target is 100 req/min per key with p99 latency budget tight enough that I care about per-request overhead. The naive design where each node independently enforces 100/min is the bug to avoid: it yields up to 2000/min per user.

Design: I use a **hybrid limiter with a shared Redis backing store**. The per-request hot path checks a **local token cache** on the node (in-memory), so most decisions are made with zero network cost. Every node **asynchronously syncs** its consumed tokens to Redis on a short interval (100ms), and in return receives an updated view of global consumption and its re-divided share of the remaining budget. This keeps the effective limit close to the true 100/min while bounding overshoot to roughly one sync interval of traffic (a handful of requests), not 20x.

For the shared state itself, all mutations are **atomic**. If I used a plain counter I would call `INCR` (which returns the post-increment value in one round trip) and reject when it exceeds the limit, avoiding the read-modify-write race where two nodes both read 99 and both allow. Because I want token-bucket semantics (refill by elapsed time, then decrement) I run a **Lua script via EVAL**, which Redis executes as one atomic unit, so concurrent nodes cannot interleave and overshoot.

Tradeoff I am making explicitly: pure **centralized exact** (Redis on every request) is the most accurate but adds a round trip (about 0.5 to 1ms) to every call and makes Redis a hot dependency; pure **local approximation** (budget/N per node) is fastest but goes fuzzy under uneven load balancing and wastes idle nodes' shares. The hybrid buys most of the accuracy for most of the speed, which is the right point for a 20-node fleet.

Failure handling: Redis is a shared dependency, so I plan for its loss. If it is unreachable, nodes **fail open** to a conservative local limit (for example budget/N) and rely on downstream load shedding as the real backstop, because a limiter outage must not become a total API outage. I shard hot keys across Redis slots (or serve them from local cache with looser sync) so one celebrity key does not saturate a single slot, and I align windows using the store's clock or logical windows to avoid per-node clock skew.

**Common wrong turn:** enforcing an independent per-node limit "because the nodes are stateless," which silently grants every user 20x, or centralizing on Redis with a non-atomic GET-then-INCR that races and overshoots under concurrency.

**Self-check rubric:**
- [ ] I explicitly rejected naive per-node limits and named the Nx overshoot.
- [ ] I made shared-state mutation atomic (INCR or Lua/EVAL) and explained the race it prevents.
- [ ] I compared centralized-exact vs local-approx vs hybrid and picked one with a reason.
- [ ] I bounded the hybrid's overshoot to about one sync interval.
- [ ] I stated the fail-open behavior when Redis is down and handled hot keys / clock skew.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design global rate limiting for a CDN edge with 200 points of presence across the globe where the per-customer limit must hold worldwide but a synchronous call to a central store on every request would add unacceptable latency. Justify your consistency choice.

**Model answer (revealed on demand):**

Assumptions: 200 geographically distributed PoPs, each with many edge nodes, serving a customer whose global limit is, say, 1M req/min. A synchronous round trip to a central store from Tokyo to a US region would add 100ms-plus to every request, which is unacceptable for a CDN whose entire value is low latency. So strict centralized exactness is off the table by requirement; I must approximate and be honest about the consistency window.

Design: **hierarchical, eventually-consistent budgeting.** A central coordinator (or a regional tier of coordinators) holds the authoritative global budget and hands out **leases** of budget to each PoP, proportional to that PoP's recent share of the customer's traffic. Within a PoP, nodes enforce against the local lease using token buckets in memory, so the hot path is entirely local, zero cross-region latency. PoPs report consumption and request lease renewals **asynchronously** every short interval (say 250ms to 1s), and the coordinator re-divides the remaining global budget based on live demand, giving a busy region a bigger slice and shrinking idle ones.

Consistency choice: I explicitly accept **bounded eventual consistency** on the global limit. Overshoot is capped at roughly the sum of one refresh interval's in-flight traffic across regions, a small percentage of a 1M/min limit, which is the correct trade for a system whose SLA is latency. I would state this to the interviewer as a deliberate decision: perfect global exactness is not worth adding 100ms to every request, and rate limits are a coarse abuse control, not a financial ledger.

Failure and edge handling: if the coordinator is unreachable, each PoP **fails open** to its last known lease (or a conservative default) rather than blocking traffic, and downstream origin shielding / load shedding is the real backstop. Sudden traffic shifts (a viral event moving load to one region) are absorbed because leases re-divide toward live demand within an interval; until they do, the affected region briefly under- or over-limits, which is acceptable. This is essentially how large CDNs and Envoy-style global rate limiting operate: local speed, async global truing, fail-open safety.

### sd-l4-load-shedding-backpressure: Load Shedding, Adaptive Concurrency & Backpressure

- **id:** `sd-l4-load-shedding-backpressure`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** load-shedding, backpressure, concurrency

#### Learn

Rate limiting caps a client's demand. It does nothing when total legitimate demand simply exceeds your capacity, or a dependency slows down and requests pile up. That is where systems die, not by refusing work but by accepting more than they can finish. The goal of overload protection is blunt: at 150% of capacity, stay up and keep serving the most important traffic, instead of trying to serve everything and serving nothing.

Understand the failure mode first. A server has finite concurrency. When arrival rate exceeds completion rate, in-flight requests and queues grow, each request waits longer, latency climbs, clients hit timeouts and **retry** (often amplifying load 3x), memory for queued work grows, and eventually the box GCs itself to death or OOMs. This is the **congestion collapse / retry-storm death spiral**: throughput actually drops toward zero under increasing load. The defining mistake that enables it is the **unbounded queue**, which hides overload by accepting work it will never complete in time until memory runs out.

**Load shedding** is the fix: reject work early, while you still can, rather than queue it. A request you reject in 1ms costs almost nothing; a request you accept, queue for 5s, then fail costs capacity you needed for good traffic. So you **shed before collapse**, at a threshold below 100%, and you shed the **right** traffic. **Priority-aware shedding** classifies traffic (health checks and paying-customer writes are critical; bulk exports, retries, and best-effort reads are droppable) and drops low-priority first. Amazon-style services tag requests with priority and shed by tier so the checkout path survives while a recommendation call is dropped.

**Adaptive concurrency limits** beat static thresholds. A static "max 500 concurrent" is wrong the moment your dependency's latency changes: at 50ms per request 500 concurrency is fine, at 500ms it is 10x too much. Instead, discover the limit dynamically the way TCP congestion control does. By **Little's Law**, `concurrency = throughput * latency`; a system probes by raising its concurrency limit while latency stays flat and backing off when latency rises (a gradient / TCP-Vegas style loop, as in Netflix's adaptive concurrency limiter). The limit tracks the real, current capacity of the box and its dependencies with no operator-tuned magic number.

**Backpressure** is refusing upstream when you are full, so pressure propagates back to the source instead of accumulating in you. Use **bounded queues** that reject (or return a fast 503) when full rather than growing without limit. Propagate **deadlines**: pass a per-request deadline through the call chain and drop any request whose deadline has already passed, since finishing already-dead work is pure waste. Bounding queues plus dropping stale work is what keeps latency from exploding.

**Interview nuance:** graceful degradation / **brownout** is the senior move. Under overload you do not have to choose between full service and an error page; you can shed **features**: serve a cached or partial response, skip the personalization call, drop the recommendation carousel, return the core page. Combine that with retry hygiene (exponential backoff plus jitter, and **circuit breakers** so clients stop hammering a failing dependency) and you break the retry storm at both ends.

```
demand ---> [ admission: shed low-priority first if over threshold ]
             |
             v
        [ bounded queue: reject/503 when full, drop past-deadline ]
             |
             v
        [ worker pool: adaptive concurrency = probe via Little's Law ]
   overload -> brownout: cached/partial responses, drop optional features
```

Recap: keep the service alive under overload by shedding early and by priority (protect critical paths, drop droppable traffic first), replace static thresholds with adaptive concurrency limits derived from Little's Law, bound every queue and drop past-deadline work so latency cannot explode, and brown out optional features rather than failing everything, never an unbounded queue.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design overload protection so that at 150% of capacity the service stays up and still serves its most important traffic.

**Think about:**
- How do you shed the right traffic first?
- Why are adaptive concurrency limits better than static thresholds?
- How do bounded queues and deadline propagation prevent collapse?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an API service whose capacity is roughly 10k RPS before latency degrades, now hit with 15k RPS (150%). I cannot serve all of it, so success is defined as: stay up, keep p99 bounded for admitted traffic, and preserve the highest-value requests (paying-customer writes, checkout) while dropping the rest cleanly.

Design, three layers. **1) Priority-aware admission control at the edge.** Every request is tagged with a priority tier (critical: auth, payments, writes; normal: interactive reads; low: bulk exports, prefetch, retries). When the system is over its threshold I shed from the bottom tier up, so at 150% load the low tier is rejected fast with **503 / 429 + Retry-After**, the normal tier is partially shed, and critical traffic is protected. Rejecting a request in about 1ms is nearly free; the expensive mistake is accepting it, queuing it for seconds, then failing it, which burns the capacity critical traffic needed.

**2) Adaptive concurrency limits instead of a static cap.** Rather than hardcode "max 500 in flight," each node runs a gradient limiter (Netflix adaptive-concurrency / TCP-Vegas style) that raises its concurrency limit while measured latency stays flat and backs it off when latency rises. By Little's Law (`concurrency = throughput * latency`) this tracks the true current capacity even as a downstream dependency slows, which a static threshold cannot. Requests beyond the current limit are shed by priority.

**3) Bounded queues plus deadline propagation.** Every internal queue is bounded and returns a fast 503 when full, never an unbounded queue (that just hides overload until OOM and is the classic wrong turn). Each request carries a deadline propagated through the call chain; any request whose deadline has already passed is dropped without processing, since finishing dead work wastes the capacity I am trying to protect.

On top of these, **brownout / graceful degradation**: under pressure I shed features, not just requests, serving cached or partial responses and skipping optional calls (recommendations, personalization) so the core path stays fast. And **retry hygiene**: clients use exponential backoff with jitter, and circuit breakers trip on a failing dependency so a retry storm does not amplify the 150% into 400%.

Net effect: at 150% load the service admits roughly its 100% of highest-value traffic, sheds the rest quickly and legibly, and keeps latency bounded, rather than accepting everything and collapsing to zero throughput.

**Common wrong turn:** an unbounded queue to "absorb the spike," which grows until the process OOMs and takes down even critical traffic; or a static concurrency threshold that is wildly wrong the moment dependency latency changes.

**Self-check rubric:**
- [ ] I shed early (below 100%) and by priority, protecting named critical paths and dropping named low-priority traffic first.
- [ ] I used adaptive concurrency limits and justified them via Little's Law / changing dependency latency.
- [ ] I bounded every queue and reject/503 when full, explicitly rejecting unbounded queues.
- [ ] I propagated deadlines and drop past-deadline work.
- [ ] I added brownout/degradation and retry hygiene (backoff + jitter, circuit breakers).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design overload protection for a Black Friday checkout service that gets a 5x traffic spike where dropping a checkout costs real revenue but the payment provider has a hard fixed TPS ceiling you cannot exceed. Justify what you shed and what you queue.

**Model answer (revealed on demand):**

Assumptions: checkout service, normal peak 4k RPS, Black Friday brings ~20k RPS (5x). Two hard constraints pull against each other: dropped checkouts are lost revenue (so I want to shed as little checkout traffic as possible), but the downstream payment provider enforces a fixed, non-negotiable TPS ceiling (say 5k TPS) that I must never exceed or it rejects/blocks us. So this is not "shed to survive," it is "smooth to the payment ceiling while preserving intent."

Design: **queue the money path, shed everything around it.** Unlike a read service, a checkout represents real revenue and intent, so I do not simply reject excess checkouts. I put confirmed checkout requests into a **bounded, durable queue** (for example Kafka or SQS) and drain them into the payment provider at a **leaky-bucket rate matched to the provider's TPS ceiling** (5k TPS). This smooths the 20k spike down to the fixed 5k the provider can accept, which is exactly the leaky-bucket use case: protect a hard-throughput downstream. Users see "order confirmed, processing," an async completion pattern, rather than an error.

What I shed: everything that is not the money path. Recommendation carousels, related-items, live inventory refresh, and personalization are browned out or served from cache during the spike so the fleet's capacity goes to accepting and enqueuing checkouts. Best-effort and retry traffic is shed first with 503 + Retry-After.

Guardrails: the checkout queue is **bounded** with a sane max depth and a per-request **deadline**; if a checkout would sit past the point where the user's payment authorization or cart lock expires, I drop it explicitly and tell the user to retry rather than charge them late. I add **idempotency keys** so a client retry after a slow confirmation cannot double-charge, and a **circuit breaker** on the payment provider so if it degrades I stop feeding it and fail fast instead of piling up. Adaptive concurrency governs the web tier so accepting-and-enqueuing stays fast even as downstream slows.

Justification of the split: I queue the payment path because each item is scarce, high-value, and the downstream constraint is a rate ceiling that queuing directly solves; I shed the surrounding features because they are cheap to lose and their capacity is better spent capturing revenue. The wrong turn here is an unbounded checkout queue that promises everyone success then melts, or naively shedding checkouts as if they were droppable reads.
