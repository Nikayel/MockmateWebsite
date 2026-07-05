> Module **sd-l1-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l1-m2](./sd-l1-m2.md) · Next: [sd-l1-m4](./sd-l1-m4.md)

# L1 · Edge, Proxies & Caching Foundations

After this module you can design the front half of any system: place a redundant load balancer in front of a stateless tier and explain how a dead node is detected and drained, decide which cross-cutting concerns belong at an API gateway versus inside a service, and lay out the full caching stack from browser to database with a defensible invalidation strategy at every layer. These are the primitives that turn a single box into something that survives real traffic.

### sd-l1-load-balancing: Load Balancing: L4 vs L7 & Health Checks

- **id:** `sd-l1-load-balancing`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** load-balancing, health-checks

#### Learn

A load balancer is the primitive that lets you scale out instead of up. Once one machine cannot serve your traffic, you run N identical machines and put a load balancer in front to spread requests across them. Everything else in this lesson is about doing that spreading correctly and about noticing when one of those N machines is dead.

The first decision is the layer. An **L4 (transport) load balancer** works at the TCP/UDP level. It sees IP addresses and ports, not HTTP. It picks a backend, forwards packets, and stays out of the way. Because it never parses the request body or terminates TLS, it is extremely fast and cheap per connection, and it is content-blind: it cannot route `/api/*` to one pool and `/images/*` to another. AWS NLB and IPVS are L4. An **L7 (application) load balancer** terminates the connection, reads the HTTP request, and can route on host, path, header, or cookie. It usually terminates TLS, can retry failed requests, inject headers, and do sticky routing. AWS ALB, Nginx, Envoy, and HAProxy in HTTP mode are L7. The cost is CPU and latency: it does real work per request. Rule of thumb: use L7 when you need HTTP-aware routing, TLS termination, or per-request features, and L4 when you need raw throughput or non-HTTP protocols.

**Interview nuance:** Interviewers love to ask "L4 or L7 and why," then probe TLS. The clean answer: L7 terminates TLS at the edge so backends speak plain HTTP inside the trusted network (or re-encrypt for zero-trust); L4 passes TLS straight through, so the backend does the handshake and the LB never sees plaintext.

The second decision is the algorithm. **Round robin** rotates evenly and is fine when every request costs about the same. **Least connections** sends the next request to the backend with the fewest in-flight connections, which is the right default when request durations vary a lot (some calls take 2 ms, some take 2 s), because it naturally avoids piling long requests onto one node. **Weighted** variants let a bigger box take more traffic. **Consistent hashing** pins a given key (user id, cache key) to the same backend so you get cache affinity with minimal reshuffling when the pool changes.

The third piece is failure detection. **Active health checks** have the LB probe each backend on a schedule (`GET /healthz` every few seconds); miss a threshold of probes and the node is marked down and pulled from rotation. **Passive health checks** watch real traffic: if a backend returns errors or times out, eject it. You want both. When you deploy, you do not want to kill in-flight requests, so you use **connection draining**: the LB stops sending new requests to a node, waits for existing ones to finish (up to a timeout), then removes it. Pair that with graceful shutdown in the app (stop accepting, finish work, exit).

Two traps. First, prefer **stateless** services so any node can serve any request; sticky sessions (pinning a user to one node) are a crutch that breaks when that node dies and complicates deploys. Push session state to Redis instead. Second, the load balancer itself is a **single point of failure**. One LB in front of ten app servers just moves the SPOF up a layer. Run it redundant: active-active pairs, or an anycast VIP fronting multiple LBs, with health-checked failover.

```
        anycast VIP (redundant LBs)
              |
        [ L7 load balancer ]  <- TLS terminate, path routing, least-conn
         /        |        \
     app-1     app-2     app-3   (stateless; session in Redis)
       ^ active healthz probes every 3s; drain on deploy
```

Recap: Pick L4 for raw speed or L7 for HTTP-aware routing and TLS, use least-connections when durations vary, combine active and passive health checks with connection draining, keep services stateless, and never leave the LB itself un-replicated.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Place and configure load balancing for a stateless API tier and explain how a dead instance is detected and drained.

**Think about:**
- What does L4 vs L7 change about routing, TLS, and content awareness?
- Which algorithm fits variable request durations?
- How are active vs passive health checks and connection draining used?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a stateless HTTP/JSON API tier of about 12 instances behind one virtual IP, serving a mix of fast reads and slower search calls, with rolling deploys several times a day.

I place an **L7 load balancer** (Envoy or an AWS ALB) in front of the tier. I choose L7 because I want TLS termination at the edge, path-based routing (`/v1/search` may go to a differently sized pool than `/v1/read`), and per-request retries on idempotent GETs. TLS terminates at the LB; inside the VPC I either speak plain HTTP on a trusted network or re-encrypt to the backend if we require zero-trust. If this were a non-HTTP protocol or I needed millions of PPS with minimal latency, I would drop to an L4 NLB instead, accepting that it cannot route on path.

For the algorithm I use **least connections**, not round robin, precisely because request durations vary: a 2 second search must not get round-robined onto a node already busy with three other searches while a neighbor sits idle. Least-connections tracks in-flight work and steers around hot nodes.

For failure detection I run **active health checks**: the LB probes `GET /healthz` every 3 seconds, and after 3 consecutive failures the node is marked unhealthy and removed from rotation; it must pass 2 checks to return. `/healthz` checks real readiness (DB pool reachable), not just process-up. I add **passive checks** so a node returning 5xx or timing out on live traffic is ejected immediately rather than waiting for the next probe.

On deploy I use **connection draining**: the LB stops routing new requests to the target, waits up to 30 seconds for in-flight requests to complete, then removes it; the app cooperates with graceful shutdown (stop accepting, drain, exit). This gives zero-downtime rolling deploys.

Because the tier is stateless, any node serves any request, so I never need sticky sessions; session state lives in Redis. Finally I make the **LB itself redundant** (active-active ALB across AZs, or anycast VIP over multiple Envoys) so the LB is not the new single point of failure.

The common wrong turn is turning on sticky sessions "to be safe," which reintroduces state and breaks graceful failover, or leaving a single LB as an un-replicated SPOF.

**Self-check rubric:**
- [ ] Did I choose L4 or L7 and justify it with TLS and routing needs?
- [ ] Did I pick an algorithm suited to variable request durations (least connections)?
- [ ] Did I specify active health checks (path, interval, thresholds) and add passive checks?
- [ ] Did I describe connection draining plus graceful shutdown for deploys?
- [ ] Did I keep the tier stateless and make the LB redundant?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the load-balancing tier for Stripe's payments API at roughly 100k requests per second, global, where mis-routing a request during a deploy can double-charge a customer. Explain how you route, health-check, and deploy without dropping or duplicating a single in-flight payment.

**Model answer (revealed on demand):**

Assumptions: global traffic, strict correctness (no dropped or duplicated charges), p99 latency budget in the low hundreds of ms, and frequent deploys.

**Global entry:** I use anycast so clients hit the nearest point of presence, terminating TLS at regional L7 load balancers (Envoy). Anycast plus health-checked withdrawal means a failing region is pulled from BGP and traffic shifts to the next-closest region without client changes. Within a region I run active-active Envoy behind a shared VIP so no single LB is a SPOF.

**Routing:** L7, routing on path and API version. For the payment-execution path I use **least connections** because charge calls have variable latency (some hit slow card networks). Critically, I do **not** rely on the LB to prevent duplicates. Duplication is solved at the application layer with **idempotency keys**: every charge carries a client-supplied key, and the service dedupes on it, so even if the LB retries or a request lands twice during failover, the customer is charged once. This is the key insight: the LB is for availability, idempotency is for correctness. I therefore only enable automatic LB retries on requests carrying an idempotency key.

**Health checks:** Active `GET /healthz` every 2 to 3 seconds with a low failure threshold, plus passive ejection on 5xx or timeout, so a node processing payments incorrectly is removed fast.

**Deploys:** Connection draining with a generous timeout so in-flight charges complete, combined with graceful shutdown. I deploy region by region (or canary a small weighted slice first via weighted routing) and watch error and latency SLOs before widening. If a canary misbehaves, the weight goes back to zero instantly.

The wrong turn here is trusting the load balancer to guarantee exactly-once delivery. Networks retry and LBs fail over; only application-level idempotency makes double-charging impossible, and the LB design just has to avoid dropping in-flight work via draining.

### sd-l1-reverse-proxy-gateway: Reverse Proxy, API Gateway & the Edge

- **id:** `sd-l1-reverse-proxy-gateway`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** gateway, edge, proxy

#### Learn

As soon as you have more than a couple of services, you face a question: where do the concerns that *every* request needs (TLS, auth, rate limiting, routing) actually live? The wrong answer is "in every service," because then you reimplement auth twelve times and update it twelve times. The edge tier exists to handle cross-cutting concerns once, in front of everything.

Start with the **reverse proxy**. It sits in front of your backends and forwards client requests to them. Its jobs are infrastructural: TLS termination, request routing, connection buffering (absorbing slow clients so backends are not tied up), response compression (gzip/brotli), and static asset serving. Nginx and Envoy are the canonical examples. A reverse proxy is content-aware (L7) but does not know about *your* business or *your* users.

An **API gateway** is a reverse proxy that also owns application-edge policy. On top of routing and TLS it does: **authentication and authorization** (validate the JWT or session, reject anonymous calls before they reach a service), **rate limiting and quotas** (per-API-key token buckets), **request and response transformation** (rewrite headers, translate protocols), and sometimes **aggregation** (fan one client call out to several services and merge). Kong, AWS API Gateway, Apigee, and Envoy-plus-control-plane are typical. The value is that a request is authenticated, rate-limited, and validated once at the door, so internal services can trust it and stay focused on business logic.

**Interview nuance:** The classic follow-up is "what belongs at the gateway versus in the service." The line: put *cross-cutting, request-shaped* concerns at the gateway (authn, coarse authz, rate limits, TLS, routing, WAF). Keep *business* concerns in the service (domain validation, fine-grained authorization like "can this user edit this specific document," pricing rules). Auth token *validation* is edge work; deciding *what this user may do to this resource* is service work.

The **BFF (backend-for-frontend)** pattern is a gateway variant: instead of one general gateway, you run a thin per-client gateway. The web app talks to a web BFF, the mobile app to a mobile BFF. Each BFF aggregates and shapes exactly the payload its client wants, so the mobile client is not forced to over-fetch a web-sized response. BFFs prevent one generic API from being pulled in incompatible directions by different clients.

For internal, service-to-service concerns, a **service mesh** (Istio, Linkerd) is often the better tool than the gateway. Each service gets a sidecar proxy (Envoy) that handles mTLS between services, retries, timeouts, circuit breaking, and traffic-shifting, controlled centrally without changing app code. Mental model: the **gateway is north-south** (client to system), the **mesh is east-west** (service to service). Add a **WAF** and **DDoS protection** at the very edge, in front of the gateway, to filter malicious traffic before it costs you anything.

The failure mode to avoid: the gateway becoming a **logic monolith**. It is tempting to keep adding "just one more" business rule to the gateway until it holds pricing logic, feature flags, and per-endpoint special cases, at which point it is a distributed monolith that every team must coordinate on and a single bottleneck all traffic squeezes through. Keep the gateway thin and generic; push business logic down into services.

```
Internet
  |
[ WAF / DDoS ]            <- filter junk before it costs you
  |
[ API Gateway ]          <- TLS, authn, rate limit, routing (north-south)
  |     |     |
 svcA  svcB  svcC        <- business logic + fine-grained authz
   \____|____/
    service mesh sidecars <- mTLS, retries, timeouts (east-west)
```

Recap: Push TLS, authn, rate limiting, and routing to a thin API gateway (north-south), handle service-to-service mTLS and retries in a mesh (east-west), use BFFs to shape per-client payloads, front it all with a WAF, and never let the gateway swell into a business-logic monolith.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the edge tier for a microservices backend: list the responsibilities you push to the gateway and why.

**Think about:**
- Which cross-cutting concerns belong at the gateway vs in the service?
- What is the BFF pattern for, and when does a service mesh handle internal concerns?
- How do you keep the gateway from becoming a logic monolith?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume roughly 20 backend microservices, web and mobile clients, and a requirement that every service can trust that inbound requests are already authenticated and rate-limited.

At the very front I put a **WAF and DDoS layer** (Cloudflare or AWS WAF/Shield) to drop obvious attacks and volumetric floods before they consume gateway or service capacity.

Behind it I place an **API gateway** (Kong or Envoy with a control plane) that owns the cross-cutting, request-shaped concerns:

- **TLS termination** so backends speak plain HTTP inside the VPC (or mTLS via the mesh).
- **Authentication**: validate the JWT or session token and reject anonymous requests at the door, so no service reimplements this.
- **Coarse authorization**: enforce scopes and roles present in the token.
- **Rate limiting and quotas**: per-API-key token buckets to protect backends and enforce plan limits.
- **Routing**: map host and path to the right service; handle versioning.
- **Observability**: assign a request/trace id and emit consistent access logs.

I deliberately keep **business logic out** of the gateway. Fine-grained authorization ("can *this* user edit *this* document"), domain validation, and pricing stay in the owning service, because they depend on domain state the gateway does not have and would otherwise turn the gateway into a distributed monolith every team must coordinate on.

For clients I add **BFFs**: a web BFF and a mobile BFF that each aggregate and shape payloads for their client, so mobile is not forced to over-fetch a web-shaped response and each client can evolve independently.

For **service-to-service** concerns I use a **service mesh** (Istio or Linkerd): sidecar proxies handle mTLS, retries, timeouts, and circuit breaking east-west, centrally configured without app changes. That keeps the north-south gateway thin.

To keep the gateway from bloating, I hold a hard rule: only cross-cutting, non-domain policy lives there, and anything needing business state goes to a service. If someone proposes adding pricing rules to the gateway, that is the signal to stop.

The common wrong turn is either duplicating auth in every service (unmaintainable) or, at the other extreme, cramming business logic into the gateway until it is a bottleneck and a shared point of contention.

**Self-check rubric:**
- [ ] Did I list concrete gateway responsibilities (TLS, authn, rate limit, routing) with reasons?
- [ ] Did I draw the line between edge auth and service-level fine-grained authorization?
- [ ] Did I use BFFs for per-client shaping and a mesh for east-west concerns?
- [ ] Did I front the gateway with a WAF/DDoS layer?
- [ ] Did I state an explicit rule that keeps the gateway from becoming a logic monolith?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the edge tier for Netflix-style traffic where the mobile app, TV app, and web app each need different payload shapes, one gateway pool handles hundreds of thousands of requests per second, and a bad gateway deploy must not black out every client at once. Explain your gateway topology and how you avoid a single global point of failure and a logic monolith.

**Model answer (revealed on demand):**

Assumptions: three very different client types (constrained mobile, big-screen TV, rich web), extreme scale, and a hard requirement that no single deploy or region can take down all clients.

**Per-client BFFs, not one god-gateway.** Each client (mobile, TV, web) gets its own BFF, so the TV app can request large, image-heavy aggregated payloads while the mobile BFF returns lean responses tuned for cellular. This is exactly the problem BFFs solve: one generic gateway would be pulled in three incompatible directions and every client change would risk the others. It also gives blast-radius isolation: a bad mobile-BFF deploy degrades mobile only, not TV or web.

**Shared edge, isolated logic.** In front of the BFFs I keep a thin common edge doing the universal cross-cutting work: WAF/DDoS, TLS termination, authentication, coarse rate limiting, and routing to the right BFF. Universal concerns live once at this edge; client-specific aggregation lives in each BFF; and business logic stays down in the domain services. That three-way split is what prevents any layer from becoming a monolith.

**No single global SPOF.** The edge runs active-active across multiple regions behind anycast, so a failing region is withdrawn and traffic shifts to the next-closest one. Within a region the gateway/BFF pools are horizontally scaled and health-checked.

**Safe deploys.** I roll gateway and BFF changes out as **canaries**: shift a small weighted slice of traffic to the new version, watch error rate and latency SLOs, and widen only if healthy; roll back by dropping the weight to zero. Because BFFs are separate pools, a bad canary is contained to one client type and one region, never a global blackout.

**East-west** concerns (BFF to domain services) go through a **service mesh** for mTLS, retries, and circuit breaking, keeping resilience policy out of the BFF code.

The wrong turn is a single monolithic gateway serving all clients and holding client-specific logic: it becomes both a global SPOF and a coordination bottleneck, and one bad deploy blacks out every device at once.

### sd-l1-cdn-caching-foundations: CDN & Caching Across Layers

- **id:** `sd-l1-cdn-caching-foundations`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** cdn, caching, invalidation

#### Learn

Caching is the highest-leverage performance tool you have: it turns a 50 ms database query into a sub-millisecond memory hit and takes load off the systems that are hardest to scale. It is also the source of the nastiest correctness bugs, because a cache is a copy of the truth that can silently go stale. Phil Karlton's line ("there are only two hard things in computer science: cache invalidation and naming things") is a joke that ships incidents.

Think of caching as a **stack of layers**, each catching what the layer above missed:

```
Browser cache (private, per user)
   |
CDN / edge POP (shared, geographic)
   |
Reverse proxy / gateway cache
   |
App in-memory cache (local, per instance)
   |
Distributed cache (Redis / Memcached, shared)
   |
Database buffer pool (pages in RAM)
```

The closer to the user a request is served, the cheaper and faster it is, so you try to satisfy reads as high up as possible. A product page image should be served from the browser or CDN, never from your database.

Next, the **write/read policy**, which governs how the cache and the database stay related:

- **Cache-aside (lazy loading)** is the default. The app checks the cache; on a miss it reads the DB, writes the value into the cache, and returns it. Simple and resilient (a cache outage just means slower reads), but the first read after a write is a miss, and you must invalidate on writes or serve stale data.
- **Read-through** is cache-aside where the cache library, not your code, loads from the DB on a miss. Same semantics, less boilerplate.
- **Write-through** writes to the cache and the DB together on every write, so the cache is always fresh, at the cost of write latency and caching data that may never be read.
- **Write-behind (write-back)** writes to the cache immediately and flushes to the DB asynchronously. Fast writes, but you risk data loss if the cache dies before the flush.

Now the hard part, **invalidation**. Three strategies, usually combined. **TTL (time to live)** expires entries after N seconds; simple and self-healing, but you serve stale data for up to the TTL, so you tune TTL against how stale you can tolerate. **Explicit purge** deletes or updates the entry when the underlying data changes; precise but requires the write path to know every cache key it affects. **Event-driven** invalidation publishes a change event (via Kafka or a CDC stream) that fan-out invalidates caches; this scales to many caches but is more machinery. A powerful pattern is **stale-while-revalidate**: serve the stale value immediately while asynchronously refreshing it, which hides refresh latency and keeps you serving during a backend blip. Guard hot keys against a **cache stampede** (thundering herd): when a popular key expires and a thousand requests all miss and hit the DB at once, use request coalescing (single-flight), a short lock, or jittered TTLs so they do not all expire together.

The **CDN** is the caching layer nearest the user. It is a network of **anycast POPs** worldwide that cache your static (and cacheable dynamic) content near users, cutting latency and offloading your origin. Key knobs: the **cache key** (usually URL plus a chosen subset of headers/query params; include too much and hit rate collapses, include user-specific fields and you leak data), **`Cache-Control`** headers (`max-age`, `s-maxage` for shared caches, `immutable` for content that never changes), and **cache busting**. The clean way to invalidate a CDN asset is not to purge, it is to **version the URL**: ship `app.9f3a1c.js` (a content fingerprint) with a one-year `immutable` TTL, and when the file changes the filename changes, so clients fetch the new URL and the old one just ages out. Purge APIs exist for emergencies, but fingerprinting avoids the need.

**Interview nuance:** The correctness landmine is caching **personalized or authenticated** responses. Never let a shared cache (CDN or proxy) store a response that contains one user's data, or you will serve Alice's account page to Bob. Mark those `Cache-Control: private, no-store`, and be careful with the **`Vary`** header: `Vary: Cookie` technically keys per user but destroys hit rate, so the right move is usually to not cache authenticated responses at the shared layer at all and cache only truly public assets.

Recap: Cache as high up the browser-CDN-proxy-app-Redis-DB stack as you can, default to cache-aside, invalidate with a mix of TTL, explicit purge, and events plus stale-while-revalidate, version CDN URLs instead of purging, defend hot keys against stampedes, and never let a shared cache store authenticated responses.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the caching layers for a read-heavy product page and state your invalidation strategy at each layer, including the CDN.

**Think about:**
- What are the cache layers from browser to DB buffer?
- Which write policy (cache-aside, write-through, write-back) fits, and how do you invalidate?
- How do you invalidate a stale CDN asset?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume an e-commerce product page: mostly public content (title, images, description, price), read-to-write ratio around 1000:1, prices and stock change occasionally, and the page must never show one user's data to another.

I split the page into **public** parts (product details, images, marketing copy) and **personalized** parts (cart badge, recommendations, "your price"). I render the shell as cacheable and load personalized bits client-side or via a non-cached fragment, so shared caches only ever hold public data.

**Layer by layer, top to bottom:**

- **Browser cache**: static assets (JS, CSS, images) served with `Cache-Control: max-age=31536000, immutable` and fingerprinted filenames. The HTML shell gets a short TTL (say 60 s) or is revalidated.
- **CDN (Cloudflare/CloudFront, anycast POPs)**: caches images and the public product HTML with `s-maxage`. Cache key is URL plus product id; I explicitly exclude cookies and user query params from the key so I never cache a personalized variant. Hit rate here should be very high given the 1000:1 read ratio.
- **App in-memory cache**: hot product objects cached per instance for a few seconds to absorb bursts with zero network hop.
- **Distributed cache (Redis)**: the shared product-object cache the app tier reads, using **cache-aside**: on miss, read from the DB, populate Redis, return.
- **Database buffer pool**: PostgreSQL keeps hot pages in RAM as the last line.

**Write policy**: cache-aside, because it is simple, survives a Redis outage (degrades to slower DB reads), and fits a read-heavy workload where write-through would waste effort caching rarely-read writes.

**Invalidation per layer**: Redis and app cache use a **short TTL plus explicit purge** on price/stock change: the write path publishes a product-updated event (Kafka) that deletes the affected keys, so a price change propagates in seconds rather than waiting out the TTL. I add **stale-while-revalidate** on the product object and jittered TTLs to prevent a stampede when a hot product expires. For the **CDN**, I invalidate images and versioned assets by **URL fingerprinting** (`hero.9f3a.jpg`), so a new image is a new URL; for the public HTML I use a short `s-maxage` and, on a price change, fire a targeted **purge API** call for that product's URL as a backstop.

The common wrong turn is caching the whole page including the personalized cart/price at the CDN, which leaks one user's data to another, or setting a long TTL with no purge path so a price change is invisible for an hour.

**Self-check rubric:**
- [ ] Did I name the full layer stack (browser, CDN, proxy/app, Redis, DB buffer)?
- [ ] Did I choose cache-aside and justify it for a read-heavy workload?
- [ ] Did I give a concrete invalidation strategy per layer (TTL + purge + events)?
- [ ] Did I invalidate the CDN via URL versioning/fingerprinting (and purge as backstop)?
- [ ] Did I separate public from personalized content so shared caches never hold user data?
- [ ] Did I address cache stampede on hot keys?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the caching and invalidation strategy for a news homepage like the BBC during a breaking-news event, where a single URL gets 500k requests per second globally and an editor's correction to the headline must reach every reader within about 10 seconds without melting the origin. Explain your CDN strategy, invalidation, and stampede protection.

**Model answer (revealed on demand):**

Assumptions: one extremely hot public URL, global readership, 500k RPS, content updated by editors, and a hard freshness target of about 10 seconds for corrections. The content is public, which is what makes aggressive edge caching possible.

**Serve almost everything from the CDN edge.** At 500k RPS the origin must see a tiny fraction of traffic. I cache the homepage HTML at the CDN with a **short `s-maxage`** (say 5 to 10 s) so the edge answers the vast majority of requests and the origin sees at most a trickle. Static assets are fingerprinted and `immutable` with a one-year TTL.

**Stale-while-revalidate is the core trick.** I set `stale-while-revalidate` so the edge keeps serving the slightly old page instantly while it refetches in the background. Readers never wait on the origin, and the origin is hit only for the occasional revalidation, not per request. This is what keeps a 500k RPS spike from melting the origin.

**Fast corrections via targeted purge.** When an editor fixes the headline, the CMS fires a **purge/invalidate** for that one URL to the CDN. Combined with the short TTL, the correction reaches all POPs within the freshness window. I do not rely on TTL expiry alone for corrections because 10 seconds is tight; the explicit purge guarantees it.

**Stampede protection at the edge.** A naive short TTL means that when the entry expires, thousands of edge requests could all miss and stampede the origin (thundering herd). I rely on the CDN's **origin shielding / request coalescing**: a single POP is designated to talk to the origin, and concurrent misses for the same key are **collapsed into one origin fetch** (single-flight) while the rest wait or serve stale. I also add small **TTL jitter** so POPs do not all expire in lockstep.

**Origin resilience.** The origin sits behind its own cache (Redis/varnish) so even revalidation requests rarely hit the database, and I can raise the CDN TTL during an incident to shed origin load if needed.

The wrong turn is a long TTL with no purge (corrections invisible for minutes) or a very short TTL with no request coalescing (every expiry stampedes the origin at 500k RPS and takes it down).
