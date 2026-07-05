> Module **sd-l9-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l9-m2](./sd-l9-m2.md) · Next: [sd-l9-m4](./sd-l9-m4.md)

# L9 · Serverless & Edge

After this module you can decide when to hand capacity management to a FaaS platform and when that decision quietly bankrupts you, design an event-driven Lambda pipeline that survives cold starts, concurrency caps, and timeouts, and split a global request path cleanly between V8-isolate edge compute and a heavier origin so users get sub-50ms TTFB without pushing strong-consistency data somewhere it cannot live.

### sd-l9-serverless-faas: Serverless / FaaS Architecture

- **id:** `sd-l9-serverless-faas`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** serverless, faas, cold-start

#### Learn

Function-as-a-Service (AWS Lambda, Google Cloud Functions, Azure Functions) removes capacity management: you deploy a stateless function, the platform runs one isolated instance per concurrent request, scales that fleet from zero to thousands in seconds, and bills per invocation by GB-seconds of memory-time plus a per-request fee. There are no idle servers to pay for and no autoscaling group to tune. That is the whole pitch, and it is genuinely transformative for spiky, unpredictable, or glue-code workloads.

The catch is the execution model. Each function instance handles exactly one request at a time, so 500 concurrent requests means 500 warm instances. When no warm instance is free, the platform provisions a fresh one: download the package, start the runtime, initialize your code. That is a **cold start**, and it costs roughly 100ms for a lean Node or Python function up to 1s or more for a fat Java or .NET package, or a function that must attach an ENI to reach a VPC. Users on the p99 tail feel exactly those cold starts.

Mitigations, in order of leverage: **provisioned concurrency** (pay to keep N instances warm, which brings back a slice of the always-on cost you were trying to escape), **smaller deployment packages and fewer heavy imports** so init is faster, **keeping the function out of a VPC** or using VPC-native networking to skip ENI attachment, and lazy-loading SDK clients so you only initialize what a given request needs. Warm-ping hacks help marginally but do not scale to real concurrency.

The hard constraints you must design around:

- **Execution-time limit:** Lambda caps at 15 minutes. Anything longer must be chunked or moved to a container or batch job.
- **Statelessness:** no local disk you can rely on across invocations and no in-process cache that survives. State goes to DynamoDB, S3, Redis (ElastiCache/MemoryDB), or a managed queue.
- **Concurrency caps:** accounts have a regional concurrency limit (often 1000 by default). A traffic spike can throttle you, and a downstream database with a 200-connection pool will melt long before Lambda does. Use reserved concurrency and a connection proxy (RDS Proxy) to protect stores.
- **Cold-start-sensitive latency** and **vendor lock-in** (triggers, IAM, and event shapes are provider-specific).

Multi-step logic does not belong inside one giant function. Orchestrate it with **Step Functions** or a durable-workflow engine: each step is its own function, retries and timeouts are declarative, and you get a visual execution history instead of a 900-second monolith.

**Interview nuance:** the cost model inverts at high steady load. FaaS is priced for bursty utilization; if a function runs flat-out 24/7, per-invocation billing costs several times what an equivalently sized, well-utilized container or reserved instance would. The crossover is roughly when sustained utilization passes ~40 to 60 percent. Saying "serverless is cheaper" without "for spiky load" is the tell of someone who has not seen the bill.

```
UPLOAD --> S3 event --> Lambda (per-file, stateless, auto-scale)
                              |  cold start 100ms-1s+
                              |  15-min cap, concurrency cap
                       write result --> S3 / DynamoDB
   multi-step? --> Step Functions orchestrates N small functions
```

Recap: FaaS trades capacity management for per-invocation billing and instant scale, which wins for spiky event-driven glue but loses on cold-start latency, hard execution limits, statelessness, and a cost model that inverts against containers under high steady load.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design an image-processing pipeline on Lambda triggered by uploads, and address cold starts, concurrency limits, timeouts, and cost at scale.

**Think about:**
- What are good vs bad fits for FaaS?
- How do you mitigate cold starts?
- Why does the cost model invert at high steady load?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: users upload images to an app, we need thumbnails plus a few derived sizes, EXIF stripping, and a moderation check. Traffic is spiky (marketing pushes, time-of-day peaks) averaging maybe 50 uploads/sec but bursting to 2000/sec, and each image processes in 1 to 5 seconds. This bursty, event-triggered, embarrassingly parallel profile is a textbook good FaaS fit.

High-level design: clients upload directly to **S3** via presigned URLs (never proxy bytes through a function). The S3 `ObjectCreated` event fans out to a **Lambda** per object. Because moderation, resizing, and a possible catalog write are distinct steps with different failure modes, I orchestrate with **Step Functions**: resize function, moderation function, then a DynamoDB write, each with its own retry and timeout policy, so a slow moderation call cannot burn the whole budget. Failures land in an SQS **dead-letter queue** for reprocessing.

Cold starts: keep the resize function lean (a slim runtime plus a native image library, not a 300MB kitchen-sink package), lazy-load the SDK, and keep it out of a VPC so there is no ENI attach penalty. For the latency-sensitive moderation path I add modest **provisioned concurrency** sized to the typical baseline so steady traffic never pays a cold start, while bursts above that spill into on-demand instances.

Concurrency and timeouts: set **reserved concurrency** so a 2000/sec burst cannot exhaust the account limit or overwhelm DynamoDB; excess events queue in S3/SQS and drain as capacity frees. Every function gets a timeout comfortably above p99 processing time but well under 15 minutes; anything that could exceed that (a huge RAW file) is chunked or routed to a container batch job.

Cost at scale: at bursty utilization this is cheap and I pay nothing between spikes. The tradeoff I commit to: if this pipeline ever becomes a steady flat-out 24/7 firehose, per-invocation billing will exceed a well-utilized container fleet, and I would migrate the hot path to Fargate/ECS while keeping Lambda for the bursty tail.

**Common wrong turn:** stuffing resize, moderation, and catalog writes into one 12-minute function that retries the whole chain on any failure, and processing near the 15-minute ceiling with no orchestration, so one slow dependency cascades into timeouts and duplicated work.

**Self-check rubric:**
- [ ] I used S3 presigned upload plus event trigger, not a function proxying image bytes.
- [ ] I split multi-step logic across functions with Step Functions (per-step retry/timeout), not one monolith.
- [ ] I named concrete cold-start mitigations (lean package, no VPC, provisioned concurrency for the baseline).
- [ ] I protected downstreams with reserved concurrency and a queue/DLQ for backpressure.
- [ ] I stated the cost inversion and gave a container migration trigger for steady high load.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the compute tier for a Cloudinary-style media API that must transcode 20,000 videos/hour, where each transcode takes 3 to 20 minutes and CPU runs near 90 percent utilization all day. Decide whether Lambda belongs anywhere in this system, and justify the split.

**Model answer (revealed on demand):**

Assumptions: 20,000 videos/hour is ~5.5/sec sustained, each job runs 3 to 20 minutes at ~90 percent CPU, all day. Two constraints kill pure FaaS here: the 15-minute execution cap (a 20-minute transcode cannot finish) and near-100 percent steady utilization (exactly where per-invocation billing loses to containers).

So the heavy transcode tier is **not** Lambda. It is a container fleet: **ECS/Fargate or Kubernetes** workers pulling jobs from an **SQS** (or Kafka) queue, autoscaling on queue depth, and running on **Spot/preemptible** instances because transcoding is fault-tolerant and idempotent (a preempted job just goes back on the queue). This gives me the biggest cost lever, since steady 90 percent CPU on reserved-plus-spot compute is far cheaper than the same GB-seconds billed per invocation, and it removes the 15-minute ceiling entirely.

Lambda still earns a place at the **edges** of the pipeline, exactly where it is strong: the S3 upload event handler that validates the file and enqueues a job, presigned-URL issuance, webhook/callback notifications when a job completes, and lightweight metadata writes. These are sub-second, bursty, glue operations that would be wasteful to keep a container warm for.

The committed tradeoff: use FaaS for the spiky event glue and thin control plane, use autoscaled Spot containers for the long, CPU-bound, steady-throughput work. I would gate the transcode fleet with a queue so a traffic spike grows backlog (and scales workers) rather than dropping jobs, and set per-job timeouts and a DLQ so a poison file cannot wedge a worker forever. The wrong turn to avoid is forcing everything into Lambda "to stay serverless" and hitting the 15-minute wall on long videos while paying a premium on a 90-percent-utilized workload.

### sd-l9-edge-wasm: Edge Computing, CDN Compute & WebAssembly

- **id:** `sd-l9-edge-wasm`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** edge, wasm, workers

#### Learn

Edge compute runs your code in the CDN's points of presence (Cloudflare has hundreds worldwide), physically close to users, so a request can be answered without a round trip to a distant origin region. The headline is latency: **time-to-first-byte under 50ms globally** with no bespoke multi-region infrastructure of your own. But the thing that makes edge compute practical is not just location, it is the runtime.

Container-based FaaS boots an OS-level sandbox per function, which is why cold starts are 100ms to 1s+. Edge platforms like **Cloudflare Workers** instead run **V8 isolates**: many tenants share one V8 process, each request gets a lightweight isolate (the same isolation a browser tab uses), and spinning one up is **under 5ms**, effectively no cold start. There is no VM or container to provision. **WebAssembly (WASM)** goes further: a precompiled WASM module can start in **sub-millisecond** time and lets you run Rust, Go, or C at the edge, not just JavaScript. The tradeoff for this speed is a constrained runtime: strict CPU-time budgets per request (tens of milliseconds of CPU, not seconds), small memory, and **no full Node.js API surface** (no arbitrary filesystem, limited native modules). You write to a web-standard API, not to Node.

This shapes what belongs where. Put at the **edge** the lightweight, latency-sensitive work on the request path: geo/device **routing**, **auth and JWT verification** (reject a bad token in the PoP instead of after a trans-oceanic hop), **A/B assignment**, header rewrites, **personalization** of otherwise-cached pages, bot filtering, and cache logic. Keep at the **origin** the heavy or stateful work: large database transactions, big compute, anything needing the full Node ecosystem, and any operation requiring **strong consistency**.

That last point is the real constraint. Edge data stores are built for reads-everywhere, not strong writes. **Workers KV** is eventually consistent with propagation that can take seconds; edge caches and **regional read replicas** serve stale-tolerant reads fast. Newer primitives shift the tradeoff: **Durable Objects** give you single-threaded strong consistency for one key by pinning it to one location (so you pay latency for writes to that object), and **D1** offers a SQL database at the edge. But the general rule holds: you cannot get globally strong, low-latency writes for free, so edge data must be either read-mostly, eventually consistent, or explicitly pinned.

**Interview nuance:** the two failure modes interviewers listen for are (1) pushing heavy compute or a full Node app to the edge and hitting the CPU-time and API limits, and (2) putting strong-consistency data (balances, inventory, idempotency keys) in eventually consistent edge KV and getting stale reads or lost updates. Also flag that **observability is harder**: your code runs in hundreds of PoPs, so you lean on the platform's aggregated logs and tracing rather than SSHing into a box.

```
USER --> nearest PoP (V8 isolate, <5ms start / WASM <1ms)
            | route, auth/JWT, A/B, personalize, cache
            | strong-consistency data? --> origin
            v
          ORIGIN region: DB txns, heavy compute, full Node
   edge data: KV (eventual), read replicas, Durable Objects (pinned strong)
```

Recap: V8 isolates start in under 5ms and WASM sub-ms, so edge compute delivers global sub-50ms TTFB for lightweight request-path work like routing, auth, and personalization, while heavy compute and strong-consistency data stay at the origin because edge runtimes are CPU/memory/API constrained and edge data is eventually consistent by default.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design global request routing, auth, and personalization at the edge for a content site, and decide what runs at the edge vs the origin.

**Think about:**
- Why do V8 isolates start far faster than container FaaS?
- What belongs at the edge vs the origin?
- What are the edge data-consistency constraints?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a global content site (news or docs) with mostly cacheable pages, logged-in readers who get light personalization (region, saved items, plan tier), and a requirement for fast TTFB everywhere. Read-heavy, personalization-light: an ideal edge fit.

At the **edge** (Cloudflare Workers or an equivalent) I run the request path: a Worker terminates the request at the nearest PoP and does geo/device **routing**, **JWT verification** (validate signature and expiry against a cached public key, so an unauthenticated request is rejected in the PoP without a trans-oceanic hop), **A/B bucket assignment**, and **personalization** by stitching a cached base page with per-user fragments. Static and semi-static content is served straight from the **CDN cache**; the Worker adds cache keys that vary on the few dimensions that matter (locale, plan) so I keep a high hit ratio instead of fragmenting the cache per user.

At the **origin** I keep the heavy and authoritative work: the article/database of record, search, comment writes, billing, and login (issuing the JWT after a real credential check). The edge validates tokens; the origin mints them and owns the user record.

Edge data strategy: personalization data that tolerates staleness (region defaults, feature flags, A/B config, saved-article lists) lives in **Workers KV** or edge config, accepting eventual consistency of a few seconds. Anything authoritative (the session's true entitlements at purchase time, payment state) is read from the origin or a strongly consistent store, never assumed fresh from KV. For a value that needs strong per-key consistency at the edge (a rate-limit counter, a live view count) I would use a **Durable Object**, accepting that writes pay latency to its pinned location.

The committed tradeoff: I get global sub-50ms TTFB and offload auth and routing from the origin, at the cost of eventual consistency for edge-cached personalization and harder debugging across hundreds of PoPs.

**Common wrong turn:** running the full app at the edge, so heavy rendering or a database transaction blows the CPU-time and Node-API limits, or storing entitlements/balances in eventually consistent KV and serving a stale plan tier, letting a downgraded user keep premium content for seconds.

**Self-check rubric:**
- [ ] I explained V8 isolates (<5ms, shared process) vs container cold starts as the reason edge is viable on the request path.
- [ ] I put routing, JWT verification, A/B, and personalization at the edge and heavy/authoritative work at the origin.
- [ ] I kept a high cache hit ratio by varying on few dimensions, not per-user cache fragmentation.
- [ ] I named the edge data-consistency constraint (KV eventual) and where I would use a strongly consistent primitive (Durable Object).
- [ ] I flagged a wrong turn (heavy compute at edge, or strong-consistency data in KV).

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the edge tier for a Shopify-scale storefront platform serving millions of merchants where each product page must be personalized (cart contents, currency, inventory badge, per-visitor A/B) yet still hit sub-50ms TTFB globally on Black Friday traffic. Specify exactly what runs in the V8 isolate, what stays at the origin, and how you handle the inventory number that must not show "in stock" when it is sold out.

**Model answer (revealed on demand):**

Assumptions: millions of storefronts, most page structure cacheable, but every render carries per-visitor state (cart, currency, A/B, a live inventory badge). Black Friday means 10x+ spikes and zero tolerance for origin overload.

Edge (V8 isolate per request at the nearest PoP): serve a **cached page shell** per storefront from the CDN, then have the Worker inject per-visitor fragments so I never cache a whole page per user. The Worker does **currency/geo resolution**, **A/B bucketing** (deterministic hash of visitor id, stored in a cookie so buckets are stable), **JWT/session validation**, and assembles the cart summary from a signed cookie or a fast session read. This keeps the shell cache hit ratio near 100 percent, which is what actually survives Black Friday: the origin sees a tiny fraction of requests.

Origin: product catalog of record, checkout, payment, and the authoritative **inventory service**. The origin owns truth and takes writes.

The inventory number is the crux, because it needs freshness and must never oversell on the page. I do **not** read it from eventually consistent edge KV for the "in stock" claim. Instead the badge is coarse and safe: the edge shows "In stock" / "Low stock" / "Sold out" from a short-TTL (a few seconds) edge cache populated by the inventory service, and it is written **conservatively**, so the service pushes "sold out" aggressively and treats stale-positive as the failure to avoid. The precise, binding stock check happens at **add-to-cart / checkout** against the strongly consistent origin inventory service (or a Durable Object per SKU for hot items), so even if the badge is a few seconds stale the actual purchase cannot oversell. The committed tradeoff: the displayed badge is allowed to be slightly stale for speed, but the transaction is always validated against strong consistency, so correctness lives at the origin and latency optimization lives at the edge. The wrong turn is trusting an eventually consistent edge badge as the source of truth and letting a sold-out item be purchased.
