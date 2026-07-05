> Module **sd-l4-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l4-m1](./sd-l4-m1.md) · Next: [sd-l4-m3](./sd-l4-m3.md)

# L4 · Global Traffic & Gateway

After this module you can route a global user to the nearest healthy region and fail an entire region out in under a minute, design an API gateway and backend-for-frontend layer that keeps microservices thin without becoming a distributed monolith, and decide where to terminate TLS while keeping backend connection counts sane at hundreds of thousands of concurrent clients. These are the front-door decisions that every large multi-region system depends on.

### sd-l4-global-gslb: Global & DNS-Level Load Balancing (GSLB, Anycast)

- **id:** `sd-l4-global-gslb`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** gslb, anycast, multi-region

#### Learn

Once your product serves users on multiple continents from multiple regions, you need a way to steer each user to a nearby healthy region and, when a region catches fire, to pull all traffic off it fast. There are two distinct mechanisms, and interviewers want you to know they operate at different layers.

**GeoDNS / DNS-based GSLB** steers at name resolution. When a client resolves `api.example.com`, an authoritative DNS service (Route 53, NS1, Akamai) returns different IPs based on the resolver's location or measured latency. You get **geo-routing** (map the user to the closest region), **latency-based routing** (return the region with the lowest measured RTT), **weighted records** (send 10% to a new region for a canary), and **health-checked failover** (stop handing out a region's IP once its health check fails). The catch is that DNS is a *caching* system. Every answer carries a **TTL**, and resolvers, OS stub resolvers, and browsers cache it. Even a 30 to 60 second TTL means some clients keep hitting a dead region for a minute or more after you flip the record, and some misbehaving resolvers ignore short TTLs entirely. So DNS failover is never instant, and that single fact is the most-probed point in this topic.

**Anycast** steers at the network layer. You announce the *same* IP address from many points of presence (PoPs) via BGP. The internet's routing fabric delivers each client's packets to the topologically nearest PoP announcing that prefix. Withdraw the BGP announcement at a failing PoP and traffic reconverges to the next-nearest one in seconds, with no DNS change and no client-side caching to wait out. **ECMP** (equal-cost multi-path) spreads flows across equal-cost paths and across the servers behind a PoP. The subtlety: plain ECMP rehashes flows when the server set changes, which breaks in-flight connections. Production anycast load balancers (Google's **Maglev**, AWS **Hyperplane**) use **consistent hashing** so that adding or removing a backend only remaps a small fraction of connections instead of shuffling everyone.

The two combine in practice. Anycast to the nearest edge/CDN PoP terminates TLS and absorbs the connection close to the user, then the edge forwards over warm long-haul connections to a healthy origin region chosen by GSLB. Terminating at the edge means the user's slow handshake happens near them, not across an ocean.

```
User -> [Anycast IP, BGP -> nearest PoP] -> edge TLS terminate
     -> GSLB picks healthy origin region -> origin
  fail a region: withdraw BGP (seconds)  |  flip DNS (minutes, TTL-bound)
```

**Active-active vs active-passive.** Active-active runs live traffic in every region, so failing one out is just shifting its share of load onto the survivors (which must have the headroom to absorb it). Active-passive keeps a warm standby that only takes traffic on failover, which is simpler but wastes capacity and has a colder failover path. To **drain** a region cleanly you stop sending it new traffic (lower its DNS weight to zero or withdraw its anycast announcement), let in-flight requests finish, then take it down, rather than yanking it and dropping live connections.

**Interview nuance:** if you say "DNS failover, done" you will be asked "how long until the last user leaves the dead region?" The honest answer is bounded by TTL plus resolver misbehavior, which is why anycast (BGP withdrawal) or connection-level draining is what actually gives you sub-minute regional failover.

Recap: use GeoDNS for coarse region steering and anycast plus BGP for fast, cache-free failover, keep connections stable with Maglev-style consistent hashing, and never claim DNS failover is instant because resolver caching bounds it.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design how a global user is routed to the nearest healthy region and how you fail an entire region out in under a minute.

**Think about:**
- How do GeoDNS and anycast differ for steering?
- Why does client DNS caching limit failover speed?
- Active-active vs active-passive: how do you drain a region?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an API and web product served from three active-active regions (us-east, eu-west, ap-south), users worldwide, and an SLO that a full regional outage is invisible to users within about 60 seconds.

Steering, two layers. At the edge I use an **anycast IP** fronting a CDN/edge network (CloudFront, Cloudflare, or a self-run PoP fleet). The same IP is announced by BGP from every PoP, so each user's packets land at the topologically nearest PoP with no client-side decision. The edge terminates TLS close to the user and holds warm, pooled connections back to the origin regions. Behind that, **latency-based GSLB** (Route 53 latency records or the edge's own origin selection) maps each PoP to the lowest-RTT healthy origin region, with **health checks** removing a region from the candidate set when it fails, **weighted records** to canary a new region, and **geo rules** for data-residency constraints.

Failing a region out in under a minute. DNS alone will not hit 60 seconds reliably because resolvers cache answers past the TTL, so I do not depend on it as the primary lever. The fast lever is at the anycast/edge layer: **withdraw the failing region from the edge's origin pool** (or withdraw its BGP announcement if the region itself is a PoP). Reconvergence is seconds, and because the edge owns the origin connections, no end user has to re-resolve DNS. I also lower the region's DNS weight to zero as a slower backstop for any traffic that reaches origins directly. Because the regions are **active-active**, failover is just redistributing the dead region's share onto the survivors, so I must run each region with enough headroom (roughly N-over-(N-1), about 50% spare at three regions) to absorb it without tipping over.

Draining cleanly: stop new traffic first (weight to zero / announcement withdrawn), let in-flight requests finish within a grace window, then decommission, so I shift load rather than dropping live connections. To keep connections stable during backend changes I rely on **Maglev-style consistent hashing** at the load balancers so scaling or partial failure remaps only a small fraction of flows.

**Common wrong turn:** assuming DNS failover is instant. Setting a 30 second TTL and flipping the record leaves a long tail of clients hammering the dead region because resolvers and browsers cache (and some ignore short TTLs), so the real sub-minute story has to come from anycast/BGP or edge-level origin removal, not DNS alone.

**Self-check rubric:**
- [ ] I separated DNS/GeoDNS steering from anycast/BGP steering and said which layer each operates at.
- [ ] I gave a concrete sub-minute failover mechanism that does not depend on DNS TTL expiry.
- [ ] I explained why resolver/browser caching bounds DNS failover speed.
- [ ] I chose active-active vs active-passive and sized the headroom needed to absorb a lost region.
- [ ] I described draining (stop new traffic, finish in-flight, then remove) rather than a hard cutover.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design global traffic steering and 60-second regional failover for a payments API like Stripe running active-active in five regions at 200K requests/sec, where a region can go unhealthy partially (elevated p99 and error rate, not a clean crash) and some tenants are contractually pinned to an EU region for data residency.

**Model answer (revealed on demand):**

Topology: five active-active regions behind an **anycast** edge fleet, TLS terminated at the nearest PoP, and per-region origin pools selected by **health-and-latency-aware routing** at the edge. At 200K rps each region should run near 60% utilization so any one region's load can spill onto the other four without collapse.

Partial failure is the interesting case: a clean crash trips a health check, but "elevated p99 and 2% errors" does not. So health checks must be **outlier-detection style**, driven by real request success rate and latency (Envoy-style ejection), not just a TCP ping. When a region crosses an error/latency threshold, the edge **sheds a growing fraction** of that region's traffic to healthy regions rather than an all-or-nothing flip, so a gray failure degrades gracefully. Full ejection (withdraw from the origin pool) happens in seconds and does not wait on any DNS TTL, which is how I hit the 60-second SLO.

Data residency changes the routing rules: EU-pinned tenants must never be steered outside the EU. I encode residency as a routing policy keyed on the API key or token, so those requests only ever select among EU regions. If the single EU region is unhealthy I need a **second EU region** to fail over to, because spilling EU-pinned traffic to us-east would violate the contract. That constraint is a common trap: latency-based routing that ignores residency will happily send an EU tenant to the nearest non-EU region during failover.

Idempotency ties it together: payments retries during a failover must not double-charge, so the API is **idempotency-key** based and writes go to a region-aware, replicated store, letting a retried request land in a different region and still be deduplicated. I keep connections stable with consistent hashing so shifting load does not reshuffle every in-flight flow.

### sd-l4-api-gateway-bff: API Gateway & Backend-for-Frontend

- **id:** `sd-l4-api-gateway-bff`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** gateway, bff

#### Learn

As a monolith splits into dozens of microservices, a hard question appears: where do the cross-cutting concerns live? Every client call needs authentication, TLS, rate limiting, routing to the right service, and observability. You do not want each of thirty services reimplementing all of that, and you do not want each client talking directly to thirty services. The **API gateway** is the single north-south entry point that owns those concerns so the services behind it stay thin.

A gateway centralizes: **TLS termination**, **authentication and authorization** (validate the JWT or session, reject anonymous calls once), **rate limiting and quotas**, **routing** (path or host to the right upstream), **request/response transformation** (protocol translation, header shaping), **response aggregation** (fan out to several services and compose one response), **API versioning and canary routing**, and **observability** (a consistent place for request logs, metrics, and trace propagation). Concrete implementations: Kong, AWS API Gateway, Envoy-based gateways, Apigee, or a custom Netflix Zuul-style edge service.

Draw the boundary carefully. The gateway handles **north-south** traffic (client to system). Service-to-service **east-west** traffic (service to service, inside the cluster) is the job of a **service mesh** (Istio, Linkerd, Envoy sidecars), which handles mTLS, retries, and load balancing *between* services. Confusing the two, or trying to route internal calls through the public gateway, is a common design error. Business logic belongs *inside services*, not in either the gateway or the mesh.

**Backend-for-frontend (BFF).** One generic API rarely fits every client. A mobile app on a slow network wants a small, denormalized payload in one round trip; a web SPA wants richer data; a partner API needs stable, versioned contracts. A single endpoint serving all three leads to **over-fetching** (mobile downloads fields it never renders) or **under-fetching** (the client makes five calls to build one screen). A **BFF** is a thin gateway *per client type*: `bff-mobile`, `bff-web`, `bff-partner`. Each aggregates and shapes exactly what its client needs and is owned by that client's team, so a mobile change does not ripple through the web contract. GraphQL is one way to give clients field-level selection and reduce the need for many hand-written BFFs, at the cost of its own query-cost and caching complexity.

```
web  -> bff-web    \
mobile -> bff-mobile -> [API gateway: authn, rate limit, routing] -> services
partner -> bff-partner /                                   (mesh handles service-to-service)
```

The two big risks. First, the gateway is a **single point of failure and a latency tax**: every request pays one extra hop, and if it is down the whole product is down. So it must be horizontally scaled, stateless, health-checked, and kept fast (offload heavy work, cache authz decisions and hot responses). Second, and worse, the gateway can rot into a **god-object**: teams keep adding "just one more" piece of business logic until the edge holds orchestration and domain rules that belong in services. Then every service change requires a gateway change, deploys serialize on one component, and you have rebuilt the distributed monolith you split up to avoid.

**Interview nuance:** the strongest answers name *what does not* belong at the gateway (domain business rules, per-feature orchestration, data ownership) as crisply as what does. Interviewers probe the god-object failure mode specifically, so pre-empt it by stating a rule: the gateway does cross-cutting concerns and routing only, business logic lives in the owning service.

Recap: put auth, TLS, rate limiting, routing, and observability at a horizontally scaled gateway for north-south traffic, use a BFF per client type to avoid over/under-fetching, leave service-to-service concerns to the mesh, and hold the line against business logic creeping into the edge.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design an API gateway layer for a microservices product with web, mobile, and partner API clients.

**Think about:**
- What belongs at the gateway vs inside services vs the mesh?
- When is a BFF the right pattern?
- How do you keep the gateway from becoming a god-object?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a product with 20-plus microservices and three client classes (a web SPA, native mobile apps, and third-party partners hitting a public API), all needing authentication, rate limiting, and consistent observability.

Layering. A horizontally scaled, stateless **API gateway** (Envoy-based or Kong) is the single north-south entry point. It owns the cross-cutting concerns exactly once: **TLS termination**, **authentication** (validate JWT/session, reject anonymous), coarse **authorization**, **rate limiting and quotas** (tighter per-partner-key limits, looser for first-party clients), **routing** to upstreams, and **trace/metric/log** injection. Service-to-service traffic inside the cluster does not go through this gateway; a **service mesh** (Istio/Linkerd sidecars) handles east-west mTLS, retries, and inter-service load balancing. Domain **business logic lives inside the owning services**, never at the edge.

BFFs. The three clients have genuinely different needs, so I put a **BFF per client type** behind (or as part of) the gateway. `bff-mobile` returns small, denormalized, single-round-trip payloads to protect battery and radio; `bff-web` composes richer views; `bff-partner` exposes a stable, explicitly **versioned** contract with stricter quotas and backward-compat guarantees. Each BFF aggregates the handful of service calls its screens need, which kills mobile over-fetching and the "five calls to render one page" under-fetching problem. Each BFF is owned by that client's team, so a mobile shape change never forces a web or partner change. (If field-level flexibility dominates, a GraphQL layer can replace hand-written BFFs, accepting its caching and query-cost tradeoffs.)

Keeping it thin and available. The gateway is a **SPOF and a latency tax**, so I run several stateless replicas behind the load balancer, health-check them, cache authz decisions and hot responses, and keep per-request work minimal. I hold an explicit rule against the **god-object** failure mode: the gateway does cross-cutting concerns, routing, and (in the BFFs) client-shaped aggregation only. Orchestration of domain workflows and any business rule stays in services, so gateway deploys stay decoupled from feature work. Versioning and **canary routing** live at the edge so I can shift 5% of traffic to a new version and roll back at the router.

**Common wrong turn:** letting the gateway accrete business logic until it is a distributed monolith where every feature change needs a gateway deploy, or routing internal service-to-service calls through the public gateway instead of the mesh.

**Self-check rubric:**
- [ ] I placed cross-cutting concerns (authn, TLS, rate limit, routing, observability) at the gateway and business logic in services.
- [ ] I distinguished north-south (gateway) from east-west (service mesh) traffic.
- [ ] I justified a BFF per client type in terms of over/under-fetching and team ownership.
- [ ] I addressed the gateway as a SPOF and latency tax (replicas, stateless, caching).
- [ ] I stated an explicit rule that prevents the gateway from becoming a god-object.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the API gateway and BFF layer for Netflix-scale streaming, where a single home-screen load fans out to dozens of microservices (recommendations, artwork, continue-watching, billing status) and the same backend must serve TVs, phones, browsers, and game consoles with wildly different capabilities. Lead with the request topology.

**Model answer (revealed on demand):**

Topology: an anycast edge terminates TLS and hands off to a scaled **API gateway (Zuul-style)** that does authn, rate limiting, and routing, then to a **device-specific BFF/edge-aggregation layer** that fans out to dozens of services and composes one home-screen response. The home screen is the classic aggregation case: recommendations, per-row artwork, continue-watching state, and billing/entitlement status all come from different services, and the client should get one composed payload, not make forty calls over a phone radio.

Device diversity is why one generic API fails here. A 4K TV, a low-end Android phone, and a console differ in screen size, codec support, memory, and network. So the aggregation layer is **device-aware**: it shapes payloads (image resolutions, row counts, field sets) per device class, ideally driven by device capability metadata rather than a hard-coded BFF per model. Netflix's real answer was to let device teams run their own adapter logic at the edge so each client controls its own shaping without a central bottleneck, which is the BFF idea taken to its scaled conclusion.

Resilience dominates at this fan-out. Because one screen depends on dozens of services, the aggregator must degrade gracefully: wrap each downstream in a **circuit breaker and timeout** (Hystrix-style), and when a non-critical service (say a single recommendation row) is slow or down, return the screen **without** that row rather than failing the whole load. Critical fields (is the account active, is playback allowed) fail differently from cosmetic ones. Hot, shared responses (artwork, common rows) are cached at the edge to cut fan-out volume. The gateway stays thin and stateless; the per-device shaping and partial-failure composition live in the aggregation/BFF layer, and the domain logic stays in the individual services.

### sd-l4-tls-connection-mgmt: TLS Termination & Connection Management

- **id:** `sd-l4-tls-connection-mgmt`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** tls, connection-management

#### Learn

Two questions decide the health of a system's front door under real load: where do you decrypt, and how many TCP connections does your backend actually have to hold open? Getting either wrong shows up as CPU burn, port exhaustion, or a load balancer that silently stops balancing.

**Where you terminate TLS.** The TLS handshake (asymmetric crypto, certificate exchange) is expensive, and it happens per new connection. **Edge/LB termination** decrypts at the load balancer or edge PoP, so the backend fleet never pays the handshake cost and you manage certificates in one place. The gap: traffic from the LB to the backend is now plaintext on your internal network. **End-to-end TLS** (or re-encryption at the LB) keeps it encrypted all the way to the service, and **mTLS** additionally has both sides present certificates so services mutually authenticate, which is the zero-trust default inside a service mesh (Istio/Linkerd issue and rotate the certs via sidecars). The tradeoff is concrete: edge termination is cheaper and simpler but trusts the internal network; mTLS everywhere costs more CPU and operational machinery but removes that trust assumption. A common production shape is TLS terminated at the edge for the public handshake, then re-encrypted with mTLS for the internal hop, so you get both cheap edge offload and a zero-trust interior.

**SNI and certificates at scale.** One IP/LB often fronts many hostnames. **SNI** (the client sends the target hostname in the TLS ClientHello) lets the LB pick the right certificate per connection, which is how a single edge serves thousands of domains. At scale, certificate **rotation** must be automated (ACME/Let's Encrypt, an internal CA); manual cert management does not survive thousands of short-lived certs.

**Connection management is where the sharp edges live.** Every new backend connection means a handshake and consumes an **ephemeral port** on the client side of that hop. A proxy opening a fresh connection per request will exhaust its ~64K ephemeral ports and burn CPU on handshakes. The fixes are **keep-alive** (reuse a connection for many requests) and **connection pooling** (maintain a warm pool of connections to each backend and multiplex requests over them). This is how you keep backend connection counts sane instead of linear in request rate.

Then the trap that separates senior answers: **HTTP/2 and gRPC multiplex many streams over one long-lived connection.** A layer-7 load balancer balances at *connection* establishment. But a gRPC client opens one connection and keeps it, sending thousands of RPCs as streams over that single connection, all of which are **pinned to whatever backend the LB picked at connect time**. Add ten new backend pods and existing clients keep hammering the old ones; the new pods sit idle. This is the L7 rebalancing problem, and it is a favorite interview probe.

```
gRPC client --- one long-lived H2 connection ---> backend A  (all streams pinned)
new backends B,C come up  ->  get zero traffic until clients reconnect
```

The fixes: do **client-side load balancing** (the client is aware of all backends and spreads RPCs itself, via a name resolver like gRPC's `round_robin` policy or an xDS/mesh control plane), balance at **L7 per-request** with a proxy that understands H2 streams (Envoy load-balances individual streams, not just connections), or periodically **cycle connections** (max-connection-age) so clients re-resolve and rebalance. WebSockets have the same pinning problem: a long-lived socket sticks to one backend, so you plan for connection draining and rebalancing on scale events.

**C10k / C10M.** Holding 100K-plus concurrent connections needs **event-driven** proxies (epoll/kqueue, nginx/Envoy) rather than thread-per-connection, plus OS tuning (file-descriptor limits, ephemeral port range, TCP buffers, SO_REUSEPORT).

**Interview nuance:** if you say "terminate gRPC at our L7 load balancer" without mentioning stream pinning, expect "then why did your new pods get no traffic after a scale-up?" Naming client-side LB or Envoy per-request balancing is what proves you have run this in production.

Recap: terminate TLS at the edge to offload crypto and re-encrypt with mTLS for a zero-trust interior, pool and keep-alive connections to avoid handshake cost and port exhaustion, and remember that long-lived multiplexed H2/gRPC/WebSocket connections pin to one backend so you need client-side or per-request balancing to actually spread load.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Decide where to terminate TLS for an API platform and how to keep backend connection counts sane at 100k concurrent clients.

**Think about:**
- What is the tradeoff of edge TLS termination vs end-to-end/mTLS?
- Why do long-lived multiplexed gRPC/WebSocket connections defeat L7 balancing?
- How do pooling and keep-alive avoid port exhaustion?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an API platform with 100K concurrent clients, a mix of HTTP/1.1, HTTP/2, and gRPC, running on an internal network I do not fully trust, with an SLO to keep p99 low and the backend fleet unmelted.

TLS termination. I terminate the public TLS at the **edge / L7 load balancer** (Envoy or an ALB) so the crypto-heavy handshake is offloaded from the backend fleet and certificates are managed in one place with **SNI** for multi-hostname routing and **automated rotation** (ACME/internal CA). Because the internal network is not trusted, I do not leave the internal hop plaintext: I **re-encrypt with mTLS** from the edge to the services, using a service mesh (Istio/Linkerd) to issue and rotate the sidecar certs. That gives cheap edge offload plus a zero-trust interior. If regulatory or threat-model requirements demanded no plaintext anywhere including inside the LB, I would push toward full end-to-end TLS, accepting the extra CPU.

Keeping connection counts sane. Naively, 100K clients each opening fresh connections per request would burn CPU on handshakes and exhaust ephemeral ports on the proxy-to-backend hop. So I use **keep-alive** to reuse connections across many requests and **connection pooling** so the edge holds a bounded warm pool to each backend and multiplexes over it, making backend connection count a function of concurrency and pool size, not raw request rate. I run **event-driven proxies** (epoll-based nginx/Envoy) that hold 100K-plus sockets efficiently instead of thread-per-connection, and I tune the OS (file-descriptor limits, ephemeral port range, TCP buffers, SO_REUSEPORT).

The gRPC/H2 trap. gRPC clients open **one long-lived H2 connection** and stream thousands of RPCs over it, all pinned to the backend chosen at connect time. If I terminate gRPC at a naive L7 LB, a scale-up adds pods that get **zero traffic** because existing connections never move. I avoid this by balancing **per request/stream** at an Envoy-style L7 proxy that understands H2 streams, or by **client-side load balancing** where clients resolve all backends and spread RPCs themselves, and I set a **max-connection-age** so connections cycle and clients periodically re-resolve and rebalance after scaling events. WebSockets get the same treatment: plan for connection draining and rebalancing on scale-up rather than assuming the LB spreads them.

**Common wrong turn:** terminating H2/gRPC at an L7 LB and discovering streams pinned to one backend, so new capacity sits idle and one pod is hot while others are cold.

**Self-check rubric:**
- [ ] I chose a TLS termination point and justified it against the internal-network trust model (edge offload vs mTLS re-encryption vs full end-to-end).
- [ ] I used pooling and keep-alive and tied them to avoiding handshake cost and ephemeral-port exhaustion.
- [ ] I named the H2/gRPC stream-pinning problem and a concrete fix (per-request L7 balancing, client-side LB, or connection cycling).
- [ ] I addressed holding 100K sockets with event-driven proxies and OS tuning.
- [ ] I mentioned SNI and automated certificate rotation for scale.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design connection and TLS management for a real-time trading or chat platform holding 5 million concurrent WebSocket connections across a fleet, where backends scale up and down through the day and a dropped connection is a user-visible event. Lead with how you spread and rebalance those long-lived connections.

**Model answer (revealed on demand):**

Spreading them: 5M concurrent long-lived WebSocket connections cannot land on one tier, so I front them with a fleet of **event-driven edge/gateway nodes** (Envoy or a custom epoll-based server), each holding a few hundred thousand sockets, behind an **L4 load balancer** (an anycast/NLB layer). I deliberately balance at **L4 on connect** and spread with **consistent hashing** so that adding or removing an edge node remaps only a small fraction of new connections rather than reshuffling everyone. TLS terminates at these edge nodes; the handshake happens once per connection, so with millions of persistent sockets the handshake cost amortizes to near zero and the real cost is memory per connection, which is why event-driven, not thread-per-connection, is mandatory. Internally I re-encrypt with mTLS to the message-routing services.

The hard part is the trap this whole lesson is about: a WebSocket is pinned to the edge node it connected to for its entire lifetime, so **L7 rebalancing does not help an already-open socket**. When I scale up, new nodes get zero existing connections and only pick up new ones, so I add **connection-age limits / graceful cycling** to bleed some connections onto new capacity over time, and I bias new client connects toward the least-loaded nodes via the resolver. When I scale *down*, I **drain**: stop routing new connects to the node, then let the client reconnect logic move sockets off it gradually rather than dropping 300K users at once. Because a drop is user-visible, clients have **automatic reconnect with jittered backoff** (to avoid a thundering herd all reconnecting at once), and the server supports **fast session resume** so a reconnect restores subscriptions without a full re-auth round trip. OS tuning (file descriptors in the millions across the fleet, ephemeral ports, TCP keepalive for dead-peer detection) and per-node connection caps keep any single node from tipping over.
