> Module **sd-l7-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l7-m2](./sd-l7-m2.md) · Next: [sd-l7-m4](./sd-l7-m4.md)

# L7 · Resilience Patterns

After this module you can design the client-side defenses that stop one slow dependency from taking down a whole fleet: timeout and retry policies with propagated deadlines, backoff, jitter and retry budgets; circuit breakers, bulkheads and fallbacks that isolate and contain a failing dependency; and load shedding plus graceful degradation that keep a system serving useful work under overload instead of collapsing into a metastable failure.

### sd-l7-timeouts-retries: Timeouts, Retries, Backoff & Jitter

- **id:** `sd-l7-timeouts-retries`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** timeouts, retries, backoff

#### Learn

The single most common way a distributed system takes itself down is not a hardware failure. It is a small blip amplified by its own retry logic into a self-inflicted DDoS. This lesson is the defense.

**Every call needs a timeout.** A call with no timeout inherits the operating system default, which for a TCP connect can be minutes. When a downstream slows down, requests that would have failed fast instead pile up, each holding a thread and a connection. Your thread pool fills, and now a service that was merely slow makes your service completely unavailable. You need two timeouts: a **connect timeout** (how long to wait to establish the connection, usually tens of ms inside a datacenter) and a **request timeout** (how long to wait for the response). Set the request timeout from the downstream's real p99, not a guess. If the downstream's p99 is 80 ms, a 250 ms timeout is generous; a 30 second timeout is a liability.

**Propagate a deadline, do not reset it.** If the user-facing request has a 1 second budget and it has already spent 400 ms, the call to service B must be told "you have 600 ms left," and service B must pass the remaining budget to service C. gRPC does this natively with deadlines; in HTTP you pass a header like `X-Deadline` or `grpc-timeout`. Without propagation each hop uses its own fresh timeout, so a 3-hop chain can legally spend 3x the user's budget doing work whose result the user already gave up waiting for.

**Retries need backoff, jitter, and a budget.** Retrying immediately after a failure is how a blip becomes an outage: the downstream chokes, every caller retries at once, and the synchronized wave of retries keeps it choked. The formula is exponential backoff with jitter:

```
  delay = random_between(0, min(cap, base * 2^attempt))
```

The exponential part (`base * 2^attempt`) spaces retries further apart as failures persist. The `cap` bounds the worst-case wait. The **jitter** (randomizing within the window) is the part juniors omit and the part that matters most: without it, a thousand clients that failed at the same instant all retry at the same instant, recreating the thundering herd. AWS's published guidance is full jitter, exactly the form above.

**Cap total retries with a retry budget.** Even with backoff, blind retries multiply load. A retry budget limits retries to a small fraction of live traffic, for example "retries may not exceed 10% of successful requests in the last 10 seconds." When the downstream is broadly failing, the budget exhausts and you stop retrying, which is correct: retrying a dead dependency just delays recovery.

**Only retry idempotent operations.** A GET is safe. A POST that charges a card is not: a timeout does not tell you whether the charge happened, so a naive retry can double-charge. Make writes safe to retry with an idempotency key the server dedupes on.

**Interview nuance:** the killer is **retry amplification**. If the gateway retries 3x, and it calls a service that also retries 3x, and that service calls a database client that also retries 3x, one user request can become 27 database calls. Retry at exactly one layer, usually the outermost one that owns the deadline, and let inner layers fail fast.

Recap: connect plus request timeouts on every call, propagate a shrinking deadline down the chain, exponential backoff with full jitter, a retry budget capping retries to a small fraction of traffic, retry only idempotent operations, and retry at one layer to avoid multiplicative amplification.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the timeout/retry policy for a service calling three downstreams; specify budgets, backoff formula, and how you prevent retry storms.

**Think about:**
- Why does every call need a timeout and a propagated deadline?
- What is the backoff-with-jitter formula and the retry budget?
- How does retry amplification turn a blip into an outage?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an `OrderService` with a 1 second end-to-end SLO handles a user request by calling three downstreams: `InventoryService` (p99 40 ms, read, idempotent), `PricingService` (p99 60 ms, read, idempotent), and `PaymentService` (p99 200 ms, write, not naturally idempotent). Traffic is ~2k QPS.

Per-call timeouts come from each downstream's p99 with headroom: connect timeout 20 ms everywhere (same datacenter), request timeout 120 ms for Inventory, 150 ms for Pricing, 500 ms for Payment. These are ceilings for a single attempt, not the budget.

Deadline propagation is the spine. `OrderService` stamps a deadline of `now + 900 ms` (reserving 100 ms for its own work) and passes the remaining budget on every downstream call via a `grpc-timeout` style header. Each downstream must abandon work when the deadline passes rather than compute a response nobody is waiting for.

Retries: Inventory and Pricing are idempotent reads, so I allow up to 2 retries each, but only if the deadline has budget left. Backoff is full jitter, `delay = random(0, min(200ms, 25ms * 2^attempt))`. I retry **only at the OrderService layer** and configure the gRPC clients for Inventory/Pricing with no internal retries, so one user request cannot fan out into 3x3 calls.

Payment is a write: I do not blind-retry it. Checkout generates an idempotency key per order; PaymentService dedupes on it, so a retry after a timeout is safe and returns the original result instead of double-charging. Even so I cap it at 1 retry.

Retry budget: each client tracks a token bucket allowing retries up to 10% of its recent successful requests. When PaymentService is broadly failing, the budget drains and OrderService stops retrying and fails fast, shedding load off the sick dependency instead of hammering it.

Common wrong turn: setting generous timeouts and unbounded retries "to be safe." That is exactly how a 2 second Payment blip becomes a full outage, because held threads exhaust the pool and synchronized retries keep Payment down.

**Self-check rubric:**
- [ ] Separate connect and request timeouts, sized from each downstream's p99
- [ ] A single deadline is propagated and shrinks across hops, not reset per call
- [ ] Backoff formula includes a cap and jitter (not fixed or no delay)
- [ ] A retry budget caps retries to a small fraction of traffic
- [ ] Writes use idempotency keys; retries happen at one layer only
- [ ] Explains retry amplification as the outage mechanism

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the retry and timeout policy for Stripe's API gateway fronting a payments core, handling 5k QPS with a hard rule of zero double-charges even during a 90 second partial outage of the ledger service. Lead with the deliverable.

**Model answer (revealed on demand):**

Deliverable: a gateway policy that keeps charges correct and the ledger recoverable during a 90 second brownout.

Every charge request carries a client-supplied `Idempotency-Key`. The gateway persists the key with the request fingerprint and the eventual result in a fast store (Redis with a durable backing) before touching the ledger. A repeat of the same key returns the stored response verbatim and never re-executes, which is what makes retries safe at any layer.

Gateway to ledger: connect timeout 30 ms, request timeout 800 ms (ledger p99 is ~300 ms but writes fsync). On timeout the gateway does not know if the write landed, so it retries the same idempotency key: the ledger dedupes, so at most one charge is recorded. Retries use full jitter, `delay = random(0, min(1s, 50ms * 2^attempt))`, capped at 2 attempts, gated by a retry budget of 10% of recent successes.

During the 90 second ledger brownout the budget saturates within seconds and the circuit trips (covered next lesson), so the gateway stops retrying and returns a fast `503` with `Retry-After`. This is the crucial move: continuing to retry a struggling ledger prevents it from draining its backlog and recovering. Idempotency keys mean clients can safely retry after the brownout with the same key and still get exactly one charge.

Common wrong turn: raising the request timeout to 10 seconds "so slow charges succeed." That holds threads through the entire brownout, exhausts the gateway pool, and turns a ledger slowdown into a total payments outage.

### sd-l7-circuit-breakers: Circuit Breakers, Bulkheads & Fallbacks

- **id:** `sd-l7-circuit-breakers`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** circuit-breaker, bulkhead, fallback

#### Learn

Timeouts and retries stop one slow call from hanging forever. But if a dependency is broadly failing, you want to stop calling it at all, contain the damage to one part of your service, and serve something useful instead of an error. That is circuit breakers, bulkheads, and fallbacks: the three patterns of failure isolation.

**Circuit breaker** is a state machine wrapped around a dependency that trips like an electrical breaker so you stop sending requests into a failure.

```
                trip on failure rate
     CLOSED  ---------------------------->  OPEN
       ^                                      |
       |                                      | after cooldown
       | probe succeeds                       v
       +---------------- HALF-OPEN <----------+
                probe fails -> back to OPEN
```

- **Closed** is normal: requests flow, and the breaker counts failures over a rolling window.
- **Open** trips when the failure rate crosses a threshold (for example >50% of the last 20 requests failed). In Open state calls **fail immediately** without touching the dependency. This does two things: it protects your callers from waiting on timeouts, and it sheds all load off the sick dependency so it can recover instead of being pinned down.
- **Half-Open** starts after a cooldown (say 5 seconds). The breaker lets a small number of trial requests through. If they succeed, it closes; if they fail, it re-opens and waits again.

The key insight is that failing fast is a feature. A breaker in Open state gives an instant error, which is far better than a client waiting 500 ms for a timeout on every request, and it is the only thing that lets an overloaded dependency drain its queue.

**Bulkhead** isolates resources per dependency, named after ship compartments that stop one flooded section from sinking the vessel. If your service calls Dependencies A, B, and C from a single shared thread pool of 200 threads, and C gets slow, requests to C hold threads until they time out. Enough slow C calls and all 200 threads are stuck in C, so calls to A and B, which are perfectly healthy, get no threads and fail too. One sick dependency starved the others. The fix is to give each dependency its own bounded pool (for example 60 threads for A, 60 for B, 40 for C). Now a C brownout can consume at most C's 40 threads; A and B keep serving. Bulkheads convert a total outage into a partial one.

**Fallbacks** answer "what do we serve when the dependency is unavailable?" Options, in order of preference: return cached or slightly stale data; return a sensible default; or gracefully omit the feature. The rule is that **only non-critical dependencies should be fallback-able**. You cannot fall back on the payment authorization, but you absolutely can fall back on the "customers also bought" recommendations by rendering the page without them. The product still sells.

**Interview nuance:** breakers and bulkheads solve different halves of the same problem, and strong answers use both. The breaker decides *whether* to call a dependency based on its recent health; the bulkhead bounds *how much of your resources* any one dependency can ever consume, even before the breaker trips. Without the bulkhead, a dependency that is slow but not yet failing enough to trip the breaker can still exhaust your shared pool. Envoy and service meshes provide both as config (outlier detection for breaking, circuit-breaker connection/request limits for bulkheading).

Recap: circuit breakers move Closed to Open to Half-Open to fail fast and let a sick dependency recover; bulkheads give each dependency a bounded pool so one cannot starve the others; fallbacks serve stale, default, or omitted content, but only for non-critical dependencies.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add a circuit breaker + bulkhead + fallback around a flaky recommendations dependency on a product page; describe states and degraded UX.

**Think about:**
- What do the circuit-breaker states do?
- How do bulkheads prevent one dependency from starving others?
- Which dependencies should be fallback-able?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a product-detail page renders core content (title, price, inventory, add-to-cart) plus a "Recommended for you" carousel served by a separate `RecoService` that is occasionally flaky (p99 spikes to seconds, intermittent 5xx). The page serves ~10k QPS. Recommendations are valuable but strictly non-critical: the page must sell even with no carousel.

I classify RecoService as fallback-able and the core content dependencies (catalog, inventory, pricing) as critical and non-fallback-able. That classification drives everything.

Bulkhead: RecoService gets its own small bounded thread pool or connection pool, for example 30 threads, separate from the pools serving catalog and inventory. Now even if every Reco call hangs to its timeout, it can tie up at most those 30 threads; the core page pools are untouched and the page keeps rendering. This is the difference between a broken carousel and a broken store.

Circuit breaker around the RecoService client: Closed normally, counting failures (timeouts count as failures) over a rolling window of the last 20 calls. It trips to Open when >50% fail, and in Open state every Reco call returns instantly with the fallback instead of waiting on a doomed request. After a 5 second cooldown it goes Half-Open and lets a few probes through; success closes it, failure re-opens it. The Reco request timeout itself is tight, say 150 ms, because the carousel is not worth making the user wait.

Fallback / degraded UX: when the breaker is Open or a call fails, I serve, in order: a cached set of recommendations for that product from Redis (a few minutes stale is fine for recos), or if none, a generic "Popular in this category" list, or if that is also unavailable, I omit the carousel entirely and render the rest of the page normally. The user still sees price and can buy.

Common wrong turn: calling RecoService from the shared page-rendering thread pool with a long timeout and no breaker. A Reco brownout then exhausts the shared pool, and a non-critical carousel takes down the entire product page and stops sales.

**Self-check rubric:**
- [ ] Names all three breaker states and what Open does (fail fast, shed load)
- [ ] Gives RecoService its own bounded pool separate from core dependencies
- [ ] Explains how the bulkhead prevents starving core page rendering
- [ ] Fallback ladder: stale cache, then default, then omit the feature
- [ ] Correctly classifies recommendations as non-critical / fallback-able
- [ ] Degraded UX still lets the user buy the product

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design failure isolation for Netflix's home screen, which composes rows from ~20 microservices (continue-watching, trending, because-you-watched, new-releases). One personalization service degrades during peak. Deliver the isolation and degradation strategy so the home screen always renders in under 400 ms.

**Model answer (revealed on demand):**

Deliverable: a per-row isolation strategy so a single degraded service never blocks or breaks the whole home screen.

Each of the ~20 row services gets its own bulkhead: an independent bounded thread/connection pool (this is essentially what Hystrix, born at Netflix, provided). A slow personalization service can exhaust only its own pool, so the other 19 rows keep loading. Each service also gets a circuit breaker with outlier detection: when the personalization service's failure or latency rate crosses threshold, its breaker opens and calls fail fast rather than eating the 400 ms budget.

The home screen has a hard render deadline of 400 ms and composes rows concurrently with per-row deadlines propagated from it. Any row that has not returned by its slice of the deadline is dropped from this render, so a slow row never blocks the frame.

Fallback ladder per row: serve a recently cached version of that row from an edge cache (a few minutes stale is invisible for "trending"); if empty, substitute a non-personalized default row (global "Popular on Netflix"); if still nothing, omit the row and let the rows below shift up. Because rows are independent and non-critical relative to each other, the screen degrades gracefully from fully personalized to partially personalized to generic, never to blank.

Common wrong turn: composing rows sequentially from a shared pool with no per-row deadline. The one degraded personalization service then blocks composition, blows the 400 ms budget, and users get a spinner instead of a slightly-less-personalized but instant home screen.

### sd-l7-load-shedding-degradation: Load Shedding & Graceful Degradation

- **id:** `sd-l7-load-shedding-degradation`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** load-shedding, degradation, goodput

#### Learn

Circuit breakers protect you from a sick *dependency*. Load shedding protects you from too many *clients*. When demand exceeds capacity, you have two choices: try to serve everyone and serve no one (collapse), or deliberately reject some requests so the rest succeed. Controlled partial service beats total collapse, every time.

**Goodput, not throughput, is the metric.** Throughput is requests you process; goodput is requests you process *successfully and in time*. Under overload these diverge sharply. Imagine a service that maxes out at 10k QPS of goodput. Push 20k QPS at it with no shedding and throughput climbs while goodput *falls*, because the machine spends its CPU on context switches, GC, and requests that will time out before the client sees them. You are doing 20k QPS of work and delivering maybe 3k useful responses. The extra 17k is pure waste that actively harms the 3k. Maximizing goodput means throwing away the doomed work early so the machine's capacity goes to requests that can actually complete.

**Shed early and cheaply, at the edge.** The cost of a rejected request should be tiny. Rejecting at the load balancer or the front door, before you have parsed the body, hit the database, or spun up expensive work, costs almost nothing and frees capacity for real work. Rejecting *after* you have done the expensive part is nearly useless: you already paid. Return `429 Too Many Requests` or `503 Service Unavailable` with a `Retry-After` header so well-behaved clients back off instead of hammering.

**Prioritize by request class.** Not all requests are equal. Shed low-value traffic first and protect high-value traffic: reject prefetch and speculative requests before real user actions; protect logged-in checkout over anonymous browsing; protect a paying customer's writes over a background batch job. This requires tagging requests with a criticality/class at the edge (a header or token claim) so the shedder knows what to drop.

**Admission control beats unbounded queues.** The intuitive fix for overload is "add a bigger queue." It is a trap. A large queue does not add capacity; it adds *latency*. Requests sit in the queue past their deadline, so by the time you process them the client has already given up and retried, and you do work whose result nobody wants. Bounded queues plus concurrency limits (only N requests in flight at once, reject the rest) are the correct tool. Adaptive concurrency limits (as in Netflix's `concurrency-limits` library, a TCP-Vegas-style controller) find the right N automatically by watching latency.

**Metastable failures** are the reason this lesson is hard, and a favorite senior topic.

```
  normal ---(trigger: traffic spike)---> overloaded
     ^                                       |
     |                                       | retries + full queues
     +------ (does NOT self-recover) --------+
              the trigger is GONE but the system stays down
```

A metastable failure is one that *sustains itself after the original trigger is gone*. A traffic spike pushes the system into overload; the overload causes timeouts; the timeouts cause client retries; the retries add more load than the original spike; and now even after the spike passes, the retry-driven load keeps the system saturated. Adding capacity often does not break the loop, because the retries scale up to consume it. The way out is to attack the feedback loop directly: shed load aggressively to drop goodput demand below capacity, and combine it with backoff and jitter on the clients so the retry wave dissipates. Sometimes you must shed almost everything briefly to let the queues drain, then ramp back.

**Interview nuance:** the wrong turn is "we will autoscale." Autoscaling is minutes-slow and cannot outrun a retry storm that doubles load in seconds, and if the bottleneck is a shared database, more app servers make it worse. Load shedding acts in milliseconds at the edge and is the only thing that reliably breaks a metastable collapse.

Recap: maximize goodput not throughput by discarding doomed work early; shed cheaply at the edge with `429`/`503` and `Retry-After`; prioritize by request class; use admission control and bounded concurrency instead of unbounded queues; and break metastable failures with aggressive shedding plus client backoff, because autoscaling is too slow.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design overload behavior for a search service at 2x capacity: what you shed, what you prioritize, and how you signal clients.

**Think about:**
- How do you prioritize what to shed and what to protect?
- Why maximize goodput rather than raw throughput?
- How do metastable failures form, and how do you break them?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a search service rated for 50k QPS of goodput at p99 200 ms is hit with 100k QPS (2x). Requests fall into classes: logged-in user searches, anonymous searches, typeahead/autocomplete prefetches, and internal crawler/reindex traffic. The goal is to keep goodput at ~50k successful, fast responses rather than collapsing to near-zero.

Goal is goodput, not throughput. If I try to serve all 100k, CPU goes to GC, context switching, and requests that will time out before the client sees them, and successful responses crater. I would rather cleanly reject 50k than fail 90k. So I shed the excess.

Admission control at the edge: an adaptive concurrency limiter (Netflix-style, watching latency) caps in-flight requests to what keeps p99 under 200 ms and immediately rejects the rest. I do **not** add a big queue; a queue would just push requests past their deadline and trigger retries. Rejection is cheap: it happens at the load balancer / front proxy before query parsing or index access.

Prioritization by class, shed low value first: I drop internal crawler/reindex traffic first (it can run later), then typeahead prefetches (speculative, the user has not committed), then anonymous searches, protecting logged-in user searches last. Requests are tagged with a class header at the edge so the shedder can rank them. This keeps the highest-value traffic fast even at 2x.

Client signaling: shed requests get `503` (or `429`) with `Retry-After` and a jittered value, so clients back off instead of instantly retrying. Internally I also enable graceful degradation of the served requests: under stress I disable expensive re-ranking and personalization and serve the cheaper first-pass results, which raises capacity per request.

Breaking metastability: at 2x, naive clients retry failures and can push effective load to 3x, and it stays there after the spike. I break the loop by shedding hard enough to drop admitted load below capacity, requiring client backoff-with-jitter, and using a retry budget so retries cannot exceed a small fraction of traffic. Autoscaling is a background action, not the fix, because it is minutes-slow and the shared index tier is the real bottleneck.

Common wrong turn: no admission control, an unbounded request queue, and reliance on autoscaling. The queue fills with expired requests, retries pile on, and the service collapses to near-zero goodput instead of cleanly serving 50k.

**Self-check rubric:**
- [ ] Explicitly optimizes goodput and explains why serving all 2x lowers it
- [ ] Sheds early and cheaply at the edge, not after expensive work
- [ ] Prioritizes by request class (protects logged-in/user, sheds prefetch/internal)
- [ ] Uses admission control / bounded concurrency, not an unbounded queue
- [ ] Signals clients with 429/503 + Retry-After and requires backoff
- [ ] Names the metastable feedback loop and breaks it with shedding + backoff, not just autoscaling

#### Practice: real-world variant (save, then reveal)

**Prompt:** Deliver an overload-control design that restores service and keeps the highest-value orders flowing: DoorDash sees a Super Bowl demand spike driving 4x normal order volume into the order-placement service, and a retry storm from mobile clients is keeping it saturated even between ad breaks.

**Model answer (revealed on demand):**

Deliverable: an overload-control plan that breaks the retry-driven metastable state and protects order placement.

Diagnose the metastable loop first: the 4x spike pushed order placement over capacity, timeouts triggered aggressive mobile retries, and those retries now supply more than the original excess load, so the service stays saturated even when raw user demand dips. Adding servers has not helped because the shared orders database is the bottleneck and retries expand to fill any new capacity.

Break the loop at the edge. Enable aggressive admission control at the API gateway with an adaptive concurrency limit tied to the database's healthy latency, admitting only what the datastore can commit under p99 target and rejecting the rest with `503` + `Retry-After` carrying a large jittered value (say 5 to 20 seconds) to spread the retry wave. Enforce a server-side retry budget so retries cannot exceed ~10% of successful traffic; excess retries are rejected immediately and cheaply.

Prioritize by value: protect in-progress checkouts and payment confirmations (a dropped order is lost revenue and a lost customer) over cart edits, and shed non-essential traffic first, menu refreshes, restaurant browsing prefetch, and analytics/telemetry writes, routing the latter to an async buffer.

Graceful degradation: during the peak, disable expensive synchronous work in the order path, defer ETA recomputation, personalization, and promo re-evaluation to async, and accept the order with a provisional estimate. This shrinks the per-order database cost and lifts effective capacity.

Because the fix is admission control plus client backoff, the retry storm dissipates within seconds and goodput recovers, rather than waiting minutes for autoscaling that the database bottleneck would negate anyway. The wrong turn here is "scale the fleet and widen the queue," which feeds the metastable loop instead of starving it.
