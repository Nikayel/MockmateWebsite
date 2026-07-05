> Module **sd-l1-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l1-m3](./sd-l1-m3.md) · Next: [sd-l2-m1](./sd-l2-m1.md)

# L1 · Performance & Resilience Fundamentals

By the end of this module you can reason about latency the way a user experiences it (tails, not averages) and tie concurrency, throughput, and latency together with Little's Law; design the client-side call policy (timeouts, retries with jitter, circuit breakers, bulkheads) that stops a slow dependency from taking down its caller; protect an overloaded service with backpressure and load shedding instead of letting it collapse; and choose between thread-per-request and event-loop concurrency for a given workload while naming the C10k OS limits each one hits.

### sd-l1-latency-percentiles: Latency, Throughput, Percentiles & Little's Law

- **id:** `sd-l1-latency-percentiles`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** latency, percentiles, littles-law

#### Learn

Three numbers describe how a system behaves under load, and confusing them is the fastest way to sound junior. **Latency** is how long one request takes. **Throughput** is how many requests complete per second (QPS). **Concurrency** is how many requests are in flight at once. They are not independent, and the glue between them is Little's Law.

The first hard truth: averages lie. Imagine 100 requests, 99 at 10ms and one at 2000ms. The mean is 30ms, which sounds healthy, but 1% of your users just waited two seconds. The number that matters is a **percentile**: p50 (median) is the typical request, p99 is the request that only 1 in 100 users beats, and p99.9 is the tail your biggest, most active users hit constantly. Report p50, p95, p99, and p99.9, and treat **p99 as the user number**, because a heavy user who makes 100 requests per page load will almost certainly hit your p99 on every single page.

Tail latency gets worse, not better, as you scale, because of **fan-out**. If one API request fans out to 20 backend calls and you must wait for all of them, your response is as slow as the slowest of the 20. Even if each backend has a clean 1% chance of a slow (p99) response, the probability that at least one of 20 is slow is 1 minus 0.99^20, roughly 18%. So a backend p99 becomes a frontend p82. Fan-out turns rare tails into common ones, which is why Google's "tail at scale" work pushes techniques like hedged requests (send a duplicate after the p95 mark, take the first to answer).

**Little's Law** ties it together: `L = arrival_rate x latency`, where L is the average number of requests concurrently in the system. If you serve 2000 QPS and each request takes 50ms (0.05s), then on average `2000 x 0.05 = 100` requests are in flight, so you need at least 100 units of concurrency (threads, connections, or async slots). Turn it around: if you have a fixed pool of 200 workers and latency creeps to 200ms, your ceiling is `200 / 0.2 = 1000 QPS`, no matter how much traffic arrives. Little's Law is how you size pools and how you spot that rising latency is silently capping throughput.

**Interview nuance:** When asked "how many threads/connections do you need," reach for Little's Law out loud. `concurrency = QPS x latency` is a one-line answer that signals you can size a system rather than guess.

One measurement trap: **coordinated omission**. Many load testers send the next request only after the previous one returns. When the server stalls, the tester stalls with it and simply fails to send the requests that would have piled up, so those never get timed. The result badly understates the tail. Fix it by measuring against intended send time (record when a request *should* have started), or use tools like `wrk2` or HdrHistogram that correct for it. Always aggregate with histograms, not by averaging per-node p99s, because you cannot average percentiles.

Recap: Averages hide the tail, p99 is the number users feel and fan-out makes it common, and Little's Law (`L = arrival_rate x latency`) sizes your concurrency and exposes when latency is capping throughput.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Define the SLIs/SLOs for an API endpoint and explain why you target p99 latency rather than the mean, using Little's Law to relate concurrency, throughput, and latency.

**Think about:**
- Why does tail latency dominate when one request fans out to many services?
- How does Little's Law (L = arrival rate x latency) bound concurrency?
- What is coordinated omission and why does it distort measured latency?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a read-heavy JSON API (say a product-detail endpoint) serving 3000 QPS at peak, fronting a service that fans out to a catalog store, a pricing service, and an inventory service.

SLIs are the measured signals: request latency distribution (p50/p95/p99/p99.9), availability (fraction of requests that return a non-5xx within the latency budget), and error rate. SLOs are the targets, for example "p99 latency under 200ms and success rate at or above 99.9%, measured over a rolling 28-day window." I would attach an error budget: 0.1% of requests may miss, and burning it too fast pages someone.

I target **p99, not the mean**, because the mean hides the tail that users actually feel. A page that fans out to 3 backends returns only when the slowest returns, so a backend p99 shows up far more often than 1 in 100 at the page level (with 3 independent backends, roughly 1 minus 0.99^3, about 3% of pages hit a tail). Users with many items on screen hit p99 on nearly every load, so the tail is the experience, not the outlier.

**Little's Law** sizes the system: at 3000 QPS and 50ms latency, average concurrency is `3000 x 0.05 = 150` in-flight requests, so my thread pool or async slot count and downstream connection pools must comfortably exceed 150 or requests queue and latency spikes. If a downstream slows to 150ms, concurrency demand triples to 450; if the pool is capped at 200, throughput is bounded at `200 / 0.15 = 1333 QPS` and everything above that queues.

I would guard measurement against **coordinated omission**: a closed-loop load test that waits for each response stops sending during a stall and never records the requests that should have piled up, understating the tail. I measure against intended send time and aggregate with HdrHistogram, and I never average per-host p99s.

Common wrong turn: quoting average latency ("we're at 30ms average, we're fine") while p99 is 800ms and fan-out is making that 800ms the common case.

**Self-check rubric:**
- [ ] Did I distinguish SLI (measured signal) from SLO (target) and include a latency percentile, availability, and error budget?
- [ ] Did I justify p99 over the mean with a concrete tail/fan-out argument?
- [ ] Did I apply Little's Law with real numbers to size concurrency and show how latency caps throughput?
- [ ] Did I mention coordinated omission and histogram-based aggregation?
- [ ] Did I name the common wrong turn (quoting the mean)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the latency SLOs and capacity model for Amazon's product-page assembly service during a Prime Day peak, where a single page renders by fanning out to about 100 backend services (recommendations, pricing, reviews, inventory, ads) and must return in 300ms at p99. Quantify why the tail dominates and how you size for it.

**Model answer (revealed on demand):**

Assumptions: peak of 500,000 page assemblies per second, a strict 300ms p99 page budget, and a fan-out to roughly 100 independent backends where the page needs most of them to render.

The core problem is tail amplification. If each backend hit p99 (its own 1%-slow response) independently, the chance a page dodges every tail is 0.99^100, about 37%, meaning **63% of pages would hit at least one slow backend**. A per-backend p99 is nowhere near good enough; each backend needs roughly p99.99 to keep the page's p99 in budget. So I push per-backend budgets down to single-digit milliseconds and treat the tail, not the mean, as the design target.

Techniques: **hedged requests** (after a backend passes its p95, fire a duplicate to a second replica and take the first answer, which collapses the tail at the cost of a few percent extra load); hard per-backend deadlines with **graceful degradation** (if reviews or ads miss their budget, render the page without them rather than blowing the whole SLO); and returning a skeleton with critical blocks (price, buy button) prioritized over optional blocks.

Capacity by Little's Law: at 500k pages/sec and a 300ms budget, in-flight pages average `500000 x 0.3 = 150000`, and each page holds up to 100 downstream calls, so downstream connection pools and thread/async budgets must be sized against the fan-out, not the page count. I would provision to keep every tier well under about 70% utilization at peak, because latency explodes as utilization approaches 100%.

Common wrong turn: setting a single p99 SLO on the page and assuming healthy per-backend p99s will deliver it, when fan-out math says they will not.

### sd-l1-resilience-primitives: Timeouts, Retries, Backoff & Circuit Breakers

- **id:** `sd-l1-resilience-primitives`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** resilience, retries, circuit-breaker

#### Learn

A distributed system fails one dependency at a time, and the way one failure becomes an outage is almost always the caller mishandling a slow or broken downstream. The client-side call policy is your primary defense, and it has four moving parts: timeouts, retries, circuit breakers, and isolation.

**Timeouts.** Every network call must have one. The default in most HTTP clients is infinite or 30+ seconds, which is a trap: when a downstream stalls, your threads (or async slots) block waiting, the pool drains, and you stop serving healthy requests too. This is the classic cascading failure. Set the timeout from the downstream's SLO (for example, if it promises p99 of 50ms, time out at maybe 150ms), and **propagate a deadline** down the call chain. If the top-level request has a 300ms budget and 200ms is already spent, the next hop should be told it has 100ms left, not handed a fresh 150ms. gRPC deadlines and context propagation do this for you; without it, downstreams do work for a client that already gave up.

**Retries.** A retry can turn a transient blip into a success, but only under two conditions. First, the operation must be **idempotent or the error must be safely retryable** (a timeout on a non-idempotent POST might have already charged the card). Use idempotency keys so a retried write dedupes. Second, retries must have **exponential backoff with jitter**. Without backoff, thousands of clients retry in lockstep the instant a service hiccups, creating a synchronized thundering herd that keeps the service down (a "retry storm"). Backoff spreads them out; jitter (randomizing the delay) breaks the synchronization. Cap the total with a **retry budget**: allow retries only up to, say, 10% of request volume, so a widespread failure cannot multiply your load 3x and turn a partial outage into a total one.

**Interview nuance:** "Retries make it more reliable" is only half true. The senior answer names the failure mode retries cause (retry amplification) and the three guards: idempotency, backoff-with-jitter, and a retry budget.

**Circuit breaker.** When a downstream is genuinely down, retrying at all is waste that adds load. A circuit breaker tracks the recent failure rate and has three states. **Closed:** calls flow normally. When failures cross a threshold (for example 50% of the last 20 calls), it trips to **Open:** calls fail fast immediately without touching the network, giving the downstream room to recover and freeing your threads. After a cool-down it goes **Half-open:** it lets a trickle of trial calls through, and if they succeed it closes, if they fail it re-opens. This converts a slow, thread-eating failure into a fast, cheap one.

**Isolation and fallback.** **Bulkheads** give each dependency its own bounded connection pool or thread pool, so one slow dependency drowns only its own bulkhead instead of every thread in the process (the pattern that named the Hystrix library). When a call fails fast, **degrade gracefully**: serve a cached value, a default, or a partial response rather than an error.

```
Closed ──failures over threshold──► Open ──cool-down──► Half-open ──trial ok──► Closed
   ▲                                                         │
   └──────────────── trial fails ────────────────────────────┘
```

Recap: Give every call a propagated deadline, retry only idempotent errors with backoff, jitter, and a budget, trip a circuit breaker to fail fast when a dependency is down, and isolate with bulkheads so one slow dependency cannot drain the whole caller.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the client-side call policy for a flaky downstream dependency so a slow dependency cannot take down the caller.

**Think about:**
- Why does every network call need a timeout and a propagated deadline?
- When is a retry safe, and why do you need jitter and a retry budget?
- What do the circuit-breaker states do?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: my service calls a downstream pricing API that promises p99 of 40ms but occasionally stalls or returns 503s during deploys. My service has a 250ms end-to-end budget and runs a bounded thread pool.

**Timeouts and deadlines.** I set a per-call timeout derived from the downstream SLO, roughly 120ms (a few multiples of its p99, not its worst case). Critically, I propagate a deadline: I pass the remaining budget down (gRPC deadline or a context header), so if 200ms of my 250ms is already gone, the pricing call gets 50ms and fails fast instead of doing work I will discard. This keeps my thread pool from filling with requests waiting on a downstream that already blew the budget, which is how a slow dependency cascades into my own outage.

**Retries.** I retry only idempotent, retryable errors: connection failures, 503s, and timeouts on safe reads. Writes carry an idempotency key so a retry dedupes rather than double-charges. Retries use exponential backoff with full jitter (for example base 20ms, doubling, randomized), so clients do not resynchronize into a thundering herd the moment the service recovers. I cap retries at a **retry budget** of about 10% of traffic, so a broad failure cannot triple my outbound load and cause retry amplification. Typically that means at most 1 to 2 retries per request, not unbounded.

**Circuit breaker.** I wrap the dependency in a breaker: closed normally, and if failures exceed, say, 50% over a rolling window of 20 calls it opens and fails fast (serving a fallback) for a cool-down of a few seconds, then goes half-open to test with a few trial calls before closing. This stops me from hammering a downed dependency and frees threads instantly.

**Isolation and fallback.** The pricing dependency gets its own bulkhead (a bounded pool), so if it stalls it exhausts only its pool, not my whole process. On failure I degrade: serve a slightly stale cached price or a default, rather than failing the user's request.

Common wrong turn: adding retries with no backoff, no jitter, no idempotency, and no budget, which turns a brief downstream hiccup into a self-inflicted retry storm that keeps the dependency down.

**Self-check rubric:**
- [ ] Did I set timeouts from the downstream SLO and propagate a deadline/budget down the chain?
- [ ] Did I gate retries on idempotency/retryability and add backoff, jitter, and a retry budget?
- [ ] Did I describe the closed/open/half-open circuit-breaker states and what each does?
- [ ] Did I isolate with a bulkhead and specify a graceful fallback?
- [ ] Did I name the retry-storm wrong turn?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the resilience policy for Stripe's payment-charge path when its downstream fraud-scoring service degrades under a traffic spike, where charges must not be double-executed and the fraud check is on the critical path. Specify exactly how retries, deadlines, and the breaker behave for a money-moving, non-idempotent operation.

**Model answer (revealed on demand):**

Assumptions: the charge operation moves money and is not naturally idempotent, the fraud-scoring service is on the critical path, and correctness (never double-charge, never approve fraud incorrectly) outranks latency.

Because the operation moves money, **idempotency is non-negotiable before anything else**: every charge carries a client-supplied idempotency key, and the charge service dedupes on it, so a retry that arrives after a first attempt already succeeded returns the original result instead of charging twice. This is what makes retrying safe at all here.

**Deadlines:** the fraud call gets a tight, propagated deadline (say 200ms of the charge's budget). On a timeout I do **not** silently approve; for a money path, timing out the fraud check should fail closed (decline or queue for manual review), because approving an unscored charge is the expensive error. I retry the fraud call at most once, with jittered backoff, and only on clearly transient errors, under a retry budget so a spike cannot amplify load into the already-struggling fraud service.

**Circuit breaker with a policy decision:** when the breaker opens because fraud scoring is broadly down, failing fast is correct, but the fallback is a business decision, not a default value. Options are to decline (safest, hurts conversion), to route to a cheaper cached/heuristic model, or to approve-and-async-review small low-risk charges under a strict cap. I would degrade to the heuristic model for low-risk charges and fail closed above a risk/amount threshold, isolating fraud scoring in its own bulkhead so its stall never drains the charge service's threads.

Common wrong turn: retrying the non-idempotent charge itself (not just the fraud read) without an idempotency key, or failing *open* on a fraud timeout and letting unscored charges through under load.

### sd-l1-backpressure-shedding: Backpressure, Flow Control & Load Shedding

- **id:** `sd-l1-backpressure-shedding`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** backpressure, load-shedding, overload

#### Learn

Every system has a maximum sustainable throughput. The question is what happens when arriving traffic exceeds it. The wrong answer is "queue it all and hope," because that quietly trades a latency problem for a crash. The right answer is a deliberate overload strategy built from backpressure, bounded queues, and load shedding.

**Backpressure** is the signal that flows upstream telling producers to slow down. In a well-designed pipeline, a full downstream buffer stops the upstream from producing, all the way back to the source. TCP flow control does this at the socket level; reactive stream libraries (Reactive Streams, gRPC flow control) do it at the application level; a bounded queue does it implicitly, because a producer that cannot enqueue must block or drop. The enemy of backpressure is the **unbounded queue**. An unbounded queue looks like it is absorbing the spike, but it is really accumulating latency (a request that waits 30 seconds in a queue is useless, the user left) and memory, until the process runs out of heap and OOM-crashes, taking down everything including the in-flight work that was fine. Bound every queue.

**Queueing theory** explains why you cannot run hot. As utilization (rho) approaches 100%, queue length and wait time do not rise linearly, they explode. A rough mental model from M/M/1 queues: average time in system scales like `1 / (1 - rho)`. At 50% utilization latency is roughly 2x the service time; at 90% it is 10x; at 99% it is 100x. This is why you provision to run at 60 to 70% and treat the last 30% as headroom for spikes, not capacity to sell. A system run at 95% "efficient" utilization has a brutal tail.

**Interview nuance:** If asked "why not just run at 100% utilization, isn't that efficient," answer with the `1/(1-rho)` intuition. Utilization is bought with latency, and near saturation the price is unbounded.

**Load shedding (admission control)** is the deliberate choice to reject some work so the rest survives. When you are over capacity, it is far better to reject early with a **429 (Too Many Requests)** or **503 (Service Unavailable)** at the edge than to accept a request, let it sit in a queue, and time it out after doing partial work. Rejecting early is cheap and preserves latency for accepted requests; queue-and-timeout burns capacity on work nobody will use (this is "goodput" collapsing even as "throughput" stays busy). Shed at the front door, before you have invested resources.

Do it with real tools: **concurrency limits** (cap in-flight requests, the most robust knob because it directly bounds Little's Law's L), **token-bucket rate limiters** (smooth bursts to a sustainable rate), and **adaptive concurrency** (algorithms like Netflix's that watch latency and dynamically lower the limit as latency rises, no hand-tuned magic number). Pair shedding with **prioritization**: shed low-value traffic first (batch, retries, free tier) so critical traffic (checkout, paying users, health of the system) survives. And **drop stale work**: if a request has already exceeded its deadline while queued, discard it instead of processing it, because the caller has already given up.

```
arrivals ──► [admission control] ──accept──► [bounded queue] ──► workers
                    │                              │
                  reject                       drop if stale/
                429/503                        past deadline
```

Recap: Bound every queue and let backpressure propagate, run below saturation because latency explodes as utilization nears 100%, and when overloaded reject early with 429/503, prioritize critical traffic, and drop stale requests instead of letting an unbounded queue hide the overload until an OOM.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design overload protection for an ingestion endpoint that receives more traffic than it can process.

**Think about:**
- How do bounded queues and backpressure prevent memory blowup?
- Why reject early (429/503) rather than queue-and-hope?
- What does queueing theory say about latency near 100% utilization?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an HTTP ingestion endpoint accepting event/telemetry writes, downstream of which events are validated and written to Kafka then a datastore. Sustainable capacity is about 20,000 events/sec per instance; spikes can hit 60,000.

**Bound everything.** The intake buffer between the HTTP handler and the Kafka producer is a bounded queue (say 10,000 slots). When it fills, that is backpressure: the handler cannot enqueue, so it stops accepting new work rather than growing the queue. This is the difference between a controlled slowdown and an OOM. An unbounded queue would appear to absorb the 60k spike while silently accumulating multi-second latency and heap until the process crashes and drops everything, including the 20k it could have served.

**Admission control at the front door.** I put a concurrency limiter and a token-bucket rate limiter at the edge. The concurrency limit directly bounds in-flight work (Little's Law: at 20k/sec sustainable and 5ms of processing, `L = 100`, so I cap in-flight near that). When over the limit, I reject immediately with **429** (client should back off and retry later, ideally to a durable client-side buffer) and set a `Retry-After` header. Rejecting early is cheap and keeps p99 healthy for the accepted 20k; accepting all 60k into a queue would collapse goodput as everything times out after wasting CPU.

**Run below saturation.** I target about 70% utilization, because queueing theory says wait time scales like `1/(1 - rho)`: fine at 70%, catastrophic at 99%. The extra headroom absorbs bursts without the tail exploding.

**Prioritize and drop stale.** If tiers exist, I shed free-tier or low-priority events first so paying/critical streams survive. Any event that has sat past its deadline in the buffer is dropped rather than written, because it is stale and the producer has moved on.

**Scale-out seam:** load shedding buys survival now; horizontally I add instances behind the LB and, since ingestion is naturally async, I can let clients buffer and retry into a durable queue so a spike is absorbed over time rather than dropped.

Common wrong turn: an unbounded in-memory queue that "handles" the spike right up until the OOM, plus accepting-then-timing-out instead of rejecting at admission.

**Self-check rubric:**
- [ ] Did I bound every queue and explain backpressure preventing memory blowup?
- [ ] Did I reject early with 429/503 (and Retry-After) rather than queue-and-hope, with a goodput argument?
- [ ] Did I cite the `1/(1-rho)` intuition and target sub-saturation utilization?
- [ ] Did I include a concrete admission-control mechanism (concurrency limit / token bucket / adaptive concurrency)?
- [ ] Did I prioritize critical traffic and drop stale requests?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design overload protection for Cloudflare's edge accepting a sudden 10x legitimate traffic surge (a flash sale plus a viral event) across thousands of edge nodes, where dropping paying customers' checkout traffic is unacceptable but best-effort analytics traffic is expendable. Specify how you decide what to shed.

**Model answer (revealed on demand):**

Assumptions: a global edge fleet, a 10x surge that exceeds origin capacity, and a mix of traffic classes: checkout/payment (must survive), authenticated app traffic (should survive), and analytics/prefetch/bot traffic (expendable).

The key move is that **load shedding must be priority-aware, not uniform**. A dumb global rate limit would drop 90% of everything including checkouts. Instead I classify requests at the edge (by route, auth state, customer tier, and a cost/priority header) and shed from the bottom up: expendable analytics and prefetch first, then anonymous browsing, protecting checkout and authenticated traffic to the last. Each class gets its own token bucket / concurrency budget (bulkheading by priority), so a flood of cheap traffic cannot starve the expensive-but-critical class.

**Where to shed:** at the edge, before the request crosses to origin, because rejecting a 429 at the nearest PoP is nearly free and protects the scarce origin capacity. The edge tracks origin health via backpressure signals (rising latency, 503s, connection limits) and adaptive concurrency lowers admitted load automatically as origin latency climbs, rather than relying on a static hand-set limit that is wrong at 10x.

**Graceful behavior for shed traffic:** serve stale-but-cached content from the edge cache where possible (a slightly old product page beats an error), return 429 with `Retry-After` for the truly rejectable, and queue nothing unboundedly. For write-ish analytics I can accept-and-async or simply drop, since it is best-effort.

Run origins below saturation and let the edge soak the burst via caching, so the `1/(1-rho)` latency cliff never hits the origin.

Common wrong turn: a single global rate limit applied uniformly, which sheds checkout and analytics at the same rate and loses revenue to protect telemetry.

### sd-l1-concurrency-models: Server Concurrency Models: Thread-per-Request vs Event Loop & C10k

- **id:** `sd-l1-concurrency-models`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** concurrency, performance, operating-systems

#### Learn

How a server maps incoming connections onto CPU work is one of the oldest and most consequential design choices, and it is entirely governed by one question: is the workload CPU-bound or IO-bound?

**Thread-per-request** (classic Apache prefork, Tomcat's default, most synchronous frameworks) dedicates a thread (or process) to each in-flight request. Its great virtue is simplicity: you write straight-line blocking code (`result = db.query(...)`), the OS scheduler handles switching, and stack traces are clean. The cost is that each thread carries a real price. A default Linux thread reserves around 1MB of stack, so 10,000 threads is roughly 10GB of address space before doing any work, and the scheduler pays context-switch overhead (a few microseconds each) that grows with thread count. The killer is **blocking IO**: when a thread waits on a slow database or a downstream API, it is parked doing nothing but still consuming a thread. If your workload is 90% waiting on IO, your threads sit idle while CPU is nearly free, and you exhaust the thread pool (and memory) long before the CPU saturates. That is why a thread-per-request box can fall over at a few thousand concurrent connections while showing 10% CPU.

**Event loop** (Node.js, Nginx, Netty, Redis, Python asyncio, Go's runtime is a hybrid) inverts this: one thread (or a small number, one per core) multiplexes thousands of sockets using an OS readiness API, **epoll** on Linux or **kqueue** on BSD/macOS, which lets the kernel tell you "these 50 of your 10,000 sockets have data ready" in one cheap call. Idle connections cost only a file descriptor and a little kernel memory, not a thread, so a single event-loop process holds hundreds of thousands of mostly-idle connections. This is precisely what IO-bound fan-out needs: an API gateway waiting on 20 backends per request spends almost all its time waiting, and the event loop turns that waiting into near-free multiplexing.

But the event loop has one absolute rule: **never block the loop**. Because one thread drives everything, any single long operation (a synchronous CPU task, a blocking file read, a `JSON.parse` of a 50MB payload) freezes every other connection until it finishes. A CPU-heavy image transcode on the event loop serializes the whole server behind it. The fix is to offload CPU work to a **worker pool** sized to the number of cores (Node's worker threads, a thread pool, or a separate service), keeping the loop free to do IO.

**Interview nuance:** The crisp rule is "event loops are for waiting, thread/worker pools are for computing." CPU-bound work does not benefit from an event loop because there is nothing to wait on; you are limited by cores, so you want exactly one busy worker per core, not async.

**The C10k / C10M problem** names the challenge of holding 10,000 (or 10 million) concurrent connections. It is unsolvable with one blocking thread per connection and requires non-blocking IO plus tuned OS limits. The concrete limits you hit:

- **File descriptors:** every socket is an fd, and the default `ulimit -n` is often 1024. You raise `nofile` (and system-wide `fs.file-max`) to hundreds of thousands.
- **Ephemeral ports:** a single source IP connecting to one destination IP:port is limited to roughly 28,000 outbound connections (the ~32k ephemeral port range), so a proxy fanning out to one backend runs out of ports. Fix with connection pooling (reuse connections) and spreading across multiple destination IPs/ports.
- **Memory per thread:** the ~1MB stack per thread that caps thread-per-request; event loops sidestep it by not having a thread per connection.

**The concrete choice.** For a **CPU-heavy image transcoder**, use a thread or process **worker pool sized to the core count**: the work is compute, not waiting, so async buys nothing and the goal is to keep every core busy without oversubscription. For an **IO-heavy API gateway** fanning out to 20 backends, use an **event-loop or async runtime with connection pooling** to the backends: the work is almost all waiting, so multiplexing thousands of connections on a few threads is exactly right.

```
Thread-per-request:   [req]→thread→BLOCK on IO (idle, 1MB)   ... caps at ~thousands
Event loop:           epoll ─► 1 thread ─► 100k idle sockets  ... never block it
                                     └─► CPU task? offload to worker pool (N=cores)
```

Recap: CPU-bound work wants a worker pool sized to cores, IO-bound fan-out wants an event loop multiplexing many connections via epoll/kqueue, never block the loop with CPU or blocking IO, and past ~10k connections you must raise fd limits, pool connections around the ephemeral-port ceiling, and avoid the per-thread memory wall.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain how you would choose between a thread-per-request server and an event-loop server for two workloads (a CPU-heavy image transcoder and an IO-heavy API gateway fanning out to 20 backends), and describe the C10k limits each model runs into.

**Think about:**
- Is the workload CPU-bound or IO-bound, and how does that change which model wins?
- Why does blocking IO cap a thread-per-request server long before CPU saturates?
- Which OS limits (file descriptors, ephemeral ports, memory per thread) surface at 10k or more connections?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a Linux host, and services that must hold many concurrent connections, some idle and waiting on downstream calls.

The deciding axis is CPU-bound vs IO-bound. **Image transcoding is CPU-bound:** each request pins a core for hundreds of milliseconds doing real compute with nothing to wait on. **The API gateway is IO-bound:** each request fans out to 20 backends and spends almost all its wall-clock time waiting on the network, using near-zero CPU.

**Image transcoder -> thread/process worker pool sized to cores.** Since the work is compute, the only thing that matters is keeping every core busy without oversubscription; a pool of roughly N threads for N cores (plus a bounded queue in front) is ideal. An event loop would be actively wrong here, because a single transcode blocks the loop and serializes every other request behind it. If I did use an event runtime for the HTTP layer, I would offload the transcode itself to worker threads or a separate transcoding service.

**API gateway -> event-loop / async runtime with connection pooling.** Thread-per-request fails here for a specific reason: with 20 blocking downstream calls per request, each request parks 1 (or up to 20) threads doing nothing but waiting. At a few thousand concurrent requests I exhaust the thread pool and memory (~1MB stack each) while CPU sits near idle, because blocking IO caps the server long before compute does. An event loop multiplexes thousands of these waiting connections on a few threads via epoll, so idle connections cost only an fd.

**C10k / OS limits I would tune:** raise the file-descriptor limit (`ulimit -n` and `fs.file-max`) from the 1024 default to hundreds of thousands, since every connection is an fd. Watch **ephemeral ports**: the gateway opening connections to a single backend IP:port is capped near 28,000 by the ephemeral range, so I pool and reuse connections and spread across multiple backend endpoints. And the **per-thread ~1MB stack** is exactly the wall that makes thread-per-request infeasible at 10k+ connections, which the event loop avoids by not having a thread per connection.

Common wrong turn: putting a blocking DB call or a CPU-heavy transform directly on the event loop, which serializes every request behind it and destroys throughput, the mirror image of running CPU work on an async model that gives no benefit.

**Self-check rubric:**
- [ ] Did I classify each workload as CPU-bound vs IO-bound and let that drive the pick?
- [ ] Did I choose a core-sized worker pool for the transcoder and an event loop for the gateway, with reasons?
- [ ] Did I explain why blocking IO caps thread-per-request before CPU saturates?
- [ ] Did I name the three OS limits (fds, ephemeral ports, per-thread memory) and how to relieve them?
- [ ] Did I flag the never-block-the-loop wrong turn?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Explain the concurrency architecture you would choose for Discord's real-time gateway holding several million idle-but-connected WebSocket clients per cluster, where most connections sit silent and occasionally receive a pushed message, and contrast it with the model you would use for the media/voice transcoding tier. Name the OS-level limits and how you get past them.

**Model answer (revealed on demand):**

Assumptions: millions of persistent WebSocket connections that are mostly idle (heartbeats plus occasional pushed events), and a separate voice/media tier that does CPU-heavy audio transcoding and mixing.

**Gateway (millions of idle sockets) -> event-loop / async, unambiguously.** This is the C10M problem: the connections are almost entirely idle, so the cost that matters is per-connection memory and the ability to wait cheaply. A thread-per-connection model is dead on arrival, because a million threads at ~1MB each is a terabyte of stack. An event-driven runtime built on epoll (Discord famously uses Elixir/BEAM, whose lightweight processes are effectively userspace green threads over an async core; a Go, Netty, or Node model is analogous) holds each connection as a few KB of userspace state, and epoll surfaces only the handful of sockets with activity per tick. The workload is 99.9% waiting, which is exactly what async multiplexing is for.

**Media/voice tier -> worker pool sized to cores (or GPUs).** Transcoding and mixing are CPU-bound, so this tier wants one busy worker per core, a bounded intake queue, and horizontal scale-out, not async. Async would only block whatever loop it ran on. These are deliberately separate services precisely because their concurrency models are opposite.

**OS limits and fixes:** raise `nofile` to millions and `fs.file-max` system-wide (every WebSocket is an fd); shard connections across many gateway nodes so no single box holds all millions; tune kernel socket buffers and `somaxconn` for accept bursts; and on any node making outbound connections, pool them and spread across destination IPs to dodge the ~28k ephemeral-port ceiling per source/destination pair. Heartbeat/keepalive tuning matters too, because at millions of connections even a cheap per-connection timer adds up.

Common wrong turn: trying to hold millions of WebSockets with a thread-per-connection server (instant memory death), or conversely running voice transcoding on the same event loop and freezing every connected client behind one CPU-bound mixing job.
