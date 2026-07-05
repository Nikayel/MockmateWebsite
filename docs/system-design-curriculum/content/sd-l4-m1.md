> Module **sd-l4-m1** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l3-m5](./sd-l3-m5.md) · Next: [sd-l4-m2](./sd-l4-m2.md)

# L4 · Horizontal Scaling & Load Balancing

After this module you can turn a single-box web tier into an interchangeable fleet that grows to hundreds of nodes, choose the right load-balancing layer (L4 vs L7) and algorithm for a given traffic shape, keep deploys and node death from dropping in-flight requests, and let services find healthy instances of a fleet that autoscales and redeploys every minute.

### sd-l4-horizontal-stateless: Horizontal vs Vertical Scaling & Stateless Services

- **id:** `sd-l4-horizontal-stateless`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** horizontal-scaling, stateless

#### Learn

There are two ways to serve more traffic. **Scale up (vertical)** means a bigger box: more cores, more RAM, faster disks on the same machine. **Scale out (horizontal)** means more boxes behind a load balancer. Scale-up is the easy first move because it needs no code changes, but it hits a wall fast: hardware has a top SKU, price scales super-linearly past commodity sizes (a 128-core box costs far more than 2x a 64-core box), and one box is a single failure domain. When it dies, you are fully down. Scale-out is the web-tier default precisely because it dodges all three: commodity nodes are cheap, you add capacity linearly, and losing one node loses only 1/N of capacity.

The catch, and the whole point of this lesson: **you cannot load-balance servers that hold local state.** If a node keeps the user's session in its own process memory, then request 1 lands on node A (which now holds the session), and request 2 might land on node B, which has never heard of that user. The user appears logged out. Worse, when node A dies, every session it held is gone. The load balancer can only freely spread requests if **any node can serve any request**, which means nodes must be **stateless**: they hold no per-user data that a sibling lacks.

Making a tier stateless means **externalizing state** to a shared tier every node can reach:

- **Sessions:** move them to Redis or Memcached, or make them stateless entirely with a signed **JWT** the client carries. Now any node validates the token or reads the session store, and node death loses nothing.
- **Uploaded files / user assets:** to object storage (S3, GCS), never local disk.
- **Durable data:** to the database, which is a separate scaling problem (replication, sharding, earlier and later levels).

Once state is externalized, nodes become **cattle, not pets.** A pet is a hand-tuned server with a name you nurse back to health. Cattle are interchangeable and disposable: provisioned from an immutable image or IaC (a baked AMI, a container, Terraform), and when one misbehaves you kill it and boot a replacement rather than debugging it live. Autoscaling groups, Kubernetes deployments, and rolling deploys all assume this.

**Interview nuance:** do not over-apply "scale out everything." Scale-up still wins for tiers that are genuinely hard to shard: a single-writer relational database, an in-memory analytics engine, anything where the working set must be co-located. There you buy the big box and defer sharding until write throughput or dataset size truly forces it, because sharding adds cross-node query and transaction complexity. The honest framing: **scale-out for the stateless web/app tier, scale-up (then shard) for the stateful data tier.**

```
  scale UP (vertical)            scale OUT (horizontal)
  +-------------+                +----+  +----+  +----+
  |  bigger box |     vs         | n1 |  | n2 |  | n3 |  ... n500
  +-------------+                +----+  +----+  +----+
  1 failure domain,                 \      |      /
  hard ceiling                    [ shared state: Redis / DB / S3 ]
```

Recap: scale-out is the web-tier default because it beats the cost, ceiling, and single-failure-domain limits of scale-up, but it only works once nodes are stateless (session and file state externalized to Redis/JWT/S3), turning servers into interchangeable cattle; scale-up still wins for hard-to-shard stateful tiers until you are forced to shard.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the scaling model for a web tier that currently keeps user sessions in server memory so it can grow from 1 to 500 nodes.

**Think about:**
- What must you externalize to make nodes interchangeable?
- When does scale-up still win over scale-out?
- What is the cattle-not-pets model?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a stateful web/app tier where login sessions, and possibly some uploaded files and per-user caches, live in each node's process memory. Traffic is growing 500x, and the tier is currently a small number of large, hand-managed instances. The database is a separate tier and out of scope beyond "it exists and is shared."

The blocker is not capacity, it is **state locality**: I cannot put 500 interchangeable nodes behind a load balancer while a request's correctness depends on hitting the one node that holds that user's session. So step one is to make the tier **stateless**. I move sessions out of process memory into a shared **Redis** cluster (or convert to signed **JWTs** so there is no server-side session at all, trading revocation flexibility for zero session storage). Any uploaded files move to **S3**, not local disk. After this, any node can serve any request, and a dead node loses zero user state.

Step two is the scale-out mechanics. I put the fleet in an **autoscaling group** (or a Kubernetes deployment) behind an **L7 load balancer** (ALB / Envoy). Nodes boot from an **immutable image** baked with the app (AMI or container), so provisioning a new node needs no manual setup. This is the **cattle-not-pets** model: nodes are nameless and disposable, scaled up on CPU/RPS and replaced rather than repaired. Health checks (later lesson) gate traffic to warm nodes. Scaling from 1 to 500 is now just raising the ASG max and letting the scheduler spread traffic; there is no per-node config to touch.

Sizing and tradeoffs: 500 commodity nodes give linear capacity and lose only 0.2% of capacity per node death, versus one huge box that is a single failure domain with a hard ceiling. The cost of statelessness is one extra hop to Redis on session reads (sub-millisecond, and cacheable) and the operational burden of running Redis HA. That is a good trade.

Common wrong turn: keeping the in-memory sessions and reaching for **sticky sessions** to pin each user to their node. That superficially works but reintroduces the exact failure: load skews toward long-lived users, and any node death logs out everyone it held. Sticky-because-you-must (cache warmth) is a later, narrower call; sticky-to-avoid-externalizing-state is a design smell.

**Self-check rubric:**
- [ ] Identified state locality (not raw capacity) as the actual blocker
- [ ] Externalized sessions to Redis or JWT and files to object storage
- [ ] Described immutable-image provisioning behind an ASG / deployment and LB
- [ ] Named the cattle-not-pets model and why nodes are disposable
- [ ] Rejected sticky-sessions-instead-of-externalizing and stated why

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the path to horizontally scale Zoom-style signaling servers where each server currently holds live WebSocket connections and in-memory meeting room state for the participants connected to it, and the fleet must survive a single-node crash without dropping every call on that node.

**Model answer (revealed on demand):**

Assumptions: a signaling tier where each node terminates thousands of long-lived **WebSocket** connections and holds per-meeting room state (participant list, mute status, who is presenting) in memory. Unlike a stateless HTTP tier, the connection itself is state: a socket is physically bound to one node, so you cannot freely reassign an in-flight connection the way you reassign an HTTP request.

The honest answer is that this tier is **partially stateful by nature**, so the goal is not "make every node identical" but "make the durable state survivable and the connection recoverable." I split state into two kinds. The **authoritative room state** (participants, roles) moves to a shared low-latency store, Redis with pub/sub or a dedicated in-memory data grid, so it is not lost when a node dies. The **socket** stays local (it must), but I make it **cheap to re-establish**: clients auto-reconnect on drop, and on reconnect the load balancer sends them to any healthy node, which rehydrates their view from the shared room state. So a node crash drops the sockets it held, but clients reconnect within a second or two and the meeting continues, rather than the call ending.

Load balancing uses an **L4 balancer** (NLB) for the raw WebSocket throughput, and connections are spread by **least-connections** (long-lived, variable-duration connections make round robin skew). Because room state is shared, participants of one meeting need not be co-located; if I did want locality for efficiency I would route by a **consistent hash of meeting ID** so a room clusters on one node while still tolerating that node's loss via the shared store.

Tradeoff: keeping room state in Redis adds a network hop per state change (mute, join) and makes Redis HA a hard dependency, but it converts "one node crash kills every call on it permanently" into "a brief reconnect blip." That is the trade the product requires. Common wrong turn: treating signaling exactly like a stateless HTTP tier and assuming the LB can just move live connections, which it cannot: the design work is in fast client reconnect plus externalized room state, not in pretending the socket is stateless.

### sd-l4-lb-l4-l7: Load Balancer Fundamentals: L4 vs L7

- **id:** `sd-l4-lb-l4-l7`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** load-balancing, l4-l7

#### Learn

A load balancer sits between clients and your fleet and decides which backend gets each request. The first design choice is **which layer of the network stack it operates at**, and getting it wrong costs you either routing features or raw throughput.

An **L4 (transport-layer) load balancer** works at TCP/UDP. It sees IP addresses and ports, not the HTTP payload. It picks a backend, often on the very first packet, and then just forwards packets (or NATs/DSRs them) without parsing anything above the transport layer. Because it does almost no work per packet, it is **fast and high-throughput**, handles millions of connections cheaply, and works for **any** protocol, not just HTTP: raw TCP, database connections, WebSockets, custom protocols. AWS **NLB**, Google **Maglev**, and IPVS are L4. The price is that it is **content-blind**: it cannot route by URL path, read a header, terminate TLS, or rate-limit, because it never looks inside the request.

An **L7 (application-layer) load balancer** terminates the connection, parses the HTTP/gRPC request, and routes on **content**: path (`/api/*` to one pool, `/static/*` to another), host header, cookies, or method. Because it understands requests it can also do **TLS termination**, **rate limiting**, **request/response transformation**, retries, and rich **observability** (per-route latency, status codes). AWS **ALB**, **Nginx**, **HAProxy** (HTTP mode), and **Envoy** are L7. The price is **higher latency and lower throughput per node**: parsing every request and terminating TLS costs CPU, so an L7 tier is more expensive per unit of traffic than an L4 one.

This is why real architectures **stack them**: a thin **L4 layer at the edge** absorbs the raw connection volume and spreads it across a fleet of **L7 proxies** behind it, which do the smart routing. The canonical shapes are **NLB in front of ALB** on AWS, or **Maglev in front of Envoy** at Google. The L4 layer gives you cheap, protocol-agnostic scale and DDoS surface; the L7 layer gives you features. You get both instead of choosing.

```
            +------------------ L7 proxy (Envoy/ALB) --> app pool A  (/api)
client --> L4 (NLB/Maglev) --+-- L7 proxy --------------> app pool B  (/static)
  raw TCP, high throughput   +-- L7 proxy --------------> app pool C  (path/header routing, TLS, rate limit)
```

The last thing that must be true: the **load balancer itself cannot be a single point of failure.** If all traffic funnels through one LB box and it dies, you are down regardless of how healthy the fleet is. So the LB tier is made HA: **active-active** LB nodes, a **floating/virtual IP** that fails over (keepalived/VRRP), or **anycast** so many LB nodes share one IP and BGP routes around a dead one. Cloud LBs (ALB/NLB, GCLB) bake this in and are themselves horizontally scaled behind the scenes.

**Interview nuance:** a common trap is choosing L4 for an HTTP API and then discovering you need path-based routing or TLS termination, which L4 cannot do. If the question mentions per-path routing, header-based canaries, or TLS termination, you need L7 somewhere. Conversely, if it is raw non-HTTP traffic or you need extreme throughput with minimal features, L4 alone is right.

Recap: L4 balancers are fast, protocol-agnostic, and content-blind (good for raw TCP/UDP, WebSockets, throughput); L7 balancers parse requests to route by path/header, terminate TLS, and rate-limit at a latency cost; production stacks L4 at the edge in front of an L7 fleet, and the LB tier itself must be made HA (active-active, floating IP, or anycast) so it is never a SPOF.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose and justify the load-balancing layers for a service handling both gRPC APIs and long-lived WebSocket connections.

**Think about:**
- What does L4 give in throughput vs what L7 gives in routing features?
- Why do real architectures stack L4 in front of L7?
- How is the LB itself made highly available?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: two distinct traffic classes. **gRPC** is HTTP/2 request/response where I want per-service and per-method routing, TLS termination, and per-route metrics. **WebSockets** are long-lived, low-message-rate connections where the connection count is large and I mostly need to fan connections across the fleet without per-message parsing. I want one coherent edge, not two unrelated stacks.

Design: a **stacked L4-in-front-of-L7** topology. At the edge I put an **L4 balancer** (AWS NLB, or Maglev-style) sharing one **anycast VIP**. It absorbs raw connection volume for both classes cheaply and protocol-agnostically, and it is where I get DDoS surface and connection-level scale. Behind it I run a fleet of **L7 proxies (Envoy)**.

For **gRPC**, the L7 Envoy layer is doing real work: it speaks HTTP/2, so it routes by `:path` (service/method), terminates TLS, load-balances **per-request** across backends (critical, because a naive L4 hash would pin all of one client's multiplexed gRPC calls to a single backend, defeating balancing), enforces rate limits, and emits per-method latency. This is exactly the content-aware routing L4 cannot do.

For **WebSockets**, I have a choice. WebSockets are long-lived; once established there is little per-message routing value, and an L7 proxy holding hundreds of thousands of idle sockets is expensive. So I can route WebSocket traffic **through L4 straight to backends** (least-connections, since durations vary wildly), reserving the L7 layer for the gRPC path, or terminate them at L7 if I need auth/header inspection at connect time and accept the cost. I would terminate TLS and authenticate at connect, then let the socket ride.

HA: the L4 edge is **active-active** behind **anycast**, so a dead LB node is routed around by BGP with no VIP failover step; the Envoy L7 fleet is itself horizontally scaled and health-checked, so no single proxy is a SPOF. Common wrong turn: putting only an L4 LB in front of gRPC and finding you cannot do method-based routing or per-request balancing, or putting a pure L7 tier in front of hundreds of thousands of idle WebSockets and paying L7 CPU/memory to babysit sockets that need no request parsing.

**Self-check rubric:**
- [ ] Correctly mapped gRPC to L7 (path/method routing, per-request LB, TLS) and justified it
- [ ] Handled WebSockets deliberately (L4 pass-through or L7 with a stated reason), noting long-lived-connection balancing
- [ ] Proposed a stacked L4-in-front-of-L7 topology rather than picking one layer
- [ ] Called out the gRPC/HTTP2 pinning problem that per-request L7 balancing solves
- [ ] Made the LB tier HA (active-active / anycast / floating IP)

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose the load-balancing layers for Cloudflare-scale edge traffic terminating tens of millions of concurrent TLS connections across hundreds of PoPs, where a single PoP or LB node failure must not drop the service, and justify where TLS terminates.

**Model answer (revealed on demand):**

Assumptions: global HTTP/HTTPS traffic at tens of millions of concurrent connections, hundreds of points of presence, and a hard requirement that any single node or PoP failure is invisible to users. Latency to the nearest PoP matters, and TLS is universal.

Topology, edge to origin: one **anycast IP** is announced by BGP from every PoP, so a client's packets go to the topologically nearest PoP automatically, and if a PoP withdraws its route, BGP reroutes to the next-nearest with no DNS change. Inside a PoP, the first hop is an **L4 layer** (Maglev-style ECMP with consistent hashing) that spreads connections across many L7 proxy nodes. **Consistent hashing at L4 is the key detail**: when an L7 node is added or removed, only a small fraction of connections rehash, so I do not reset every live TLS session. Behind L4 is a fleet of **L7 proxies (Envoy/Nginx)** that **terminate TLS at the edge**, parse HTTP, apply WAF/rate-limit/cache rules, and then reach origin over pooled, keep-alive'd (often re-encrypted) connections.

Why terminate TLS at the edge and not at origin: terminating at the PoP means the expensive handshake happens close to the user (low RTT, fast connection setup), the edge can cache and inspect requests, and origin connection count collapses because thousands of client connections multiplex onto a few pooled origin connections. The cost is that traffic between edge and origin must be independently secured (re-encrypted or over a private backbone), which at this scale you do.

Failure handling: L4 nodes are **active-active** and ECMP-balanced, so one dying just removes a hash bucket; L7 nodes are health-checked and drained; a whole PoP failing withdraws its anycast route and the next PoP absorbs the load. No component is a SPOF at any layer. Common wrong turn: using plain (non-consistent) hashing or round robin at L4, so scaling the L7 fleet mid-day resets a large share of live TLS connections and causes a reconnect storm.


### sd-l4-lb-algorithms: Load-Balancing Algorithms & Session Affinity

- **id:** `sd-l4-lb-algorithms`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** lb-algorithms, affinity

#### Learn

Once a load balancer has a pool of healthy backends, it needs a rule for **which one gets the next request**. The rule matters because the wrong one creates hotspots: some nodes melt while others sit idle.

- **Round robin (RR):** hand requests out in rotation, node 1, 2, 3, 1, 2, 3. **Weighted RR** biases the rotation toward bigger nodes. RR is perfect when every node is identical and every request costs about the same, because rotation then equals even load. It is blind to how busy a node actually is.
- **Least-connections (or least-outstanding-requests):** send the next request to the node with the fewest in-flight requests. This is the right default when **request durations vary widely.** Consider a fleet where most requests take 5ms but some take 2s. Under round robin, a node that happened to receive several 2s requests keeps getting new work on its turn even though it is buried, while RR cannot see it. Least-connections routes around the buried node automatically because its in-flight count is high. This is the single most important algorithm intuition to have crisp.
- **Power-of-two-choices (P2C):** for a **large** pool, tracking exact least-connections means either an O(N) scan or a globally synchronized structure across many LB nodes, which is expensive and, when many LB nodes independently pick "the least-loaded node," causes a **herd** onto whatever looked idle a moment ago. P2C fixes both: pick **two backends at random**, send to the less-loaded of the two. This is nearly as good as true least-connections in load smoothing, is O(1), needs no global state, and provably avoids herding. It is the practical default for big fleets and is what modern proxies (Envoy, Nginx) use.
- **Consistent / rendezvous hashing:** hash a request key (user ID, session ID, cache key) to a backend so the **same key always lands on the same node**, and when a node joins or leaves only ~1/N of keys move instead of remapping everything. This is how you get **sticky routing** without a lookup table, and it is essential for cache-warm nodes (route a user to the node that already has their data hot) and for sharded in-memory state.

**Session affinity (sticky sessions)** is the deliberate choice to pin a client to one backend, usually via a **cookie** the LB sets, or a **hash of the client IP / session ID**. You want it when a node holds warm per-user state (a hydrated cache, a local session) and re-hitting the same node avoids a cold miss. But affinity has two real costs. First, **uneven load**: pinning means the balancer can no longer freely spread traffic, so a few heavy users or long-lived sessions skew load onto their pinned nodes. Second, **lost state on node death**: when the pinned node dies, everything it held for those users is gone, and they reconnect cold to a new node. So affinity is a targeted tool, not a default.

**Interview nuance:** the crisp story an interviewer wants is "round robin for homogeneous stateless nodes; least-connections when request durations vary; power-of-two-choices when the pool is large; consistent hashing when I need stickiness or sharded state, and I accept that stickiness costs even load and loses state on node death." If you reach for sticky sessions to compensate for not externalizing state (previous lesson), that is a design smell; if you reach for consistent hashing to keep a cache warm, that is sound engineering. Same mechanism, different justification.

```
   variable durations:
   RR  -> buried node still gets its turn   (bad: hotspot)
   LC  -> skip the buried node              (good)
   P2C -> pick 2 random, send to lighter    (good + O(1), no herd, no global state)
```

Recap: use round robin (or weighted) for identical stateless nodes, least-connections when request durations vary, power-of-two-choices as the O(1) no-herd default for large pools, and consistent/rendezvous hashing when you need sticky routing or sharded state; session affinity via cookie or hash keeps a user on a cache-warm node but costs even load and loses that node's state when it dies, so use it deliberately rather than by default.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Pick a balancing algorithm for a fleet with highly variable request durations and explain how you keep a user pinned to a cache-warm node.

**Think about:**
- Why does least-connections beat round robin for variable durations?
- When is power-of-two-choices the practical large-pool default?
- What is the downside of sticky sessions?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a stateless-ish app fleet where request durations span a wide range (most requests are a few milliseconds, a meaningful tail runs hundreds of milliseconds to seconds, for example a report generation or a fan-out query), and each node keeps a **warm local cache** for the users it has recently served, so hitting the same node for a returning user saves a cold miss.

Algorithm choice: **not round robin.** With variable durations, round robin keeps handing new work to a node on its turn regardless of how buried it is, so a node that caught a few slow requests piles up while RR stays blind to it. I want a **load-aware** rule. The precise answer is **least-connections** (least outstanding requests): route to the node with the fewest in-flight requests, which naturally steers away from a node stuck on slow work. If the fleet is large (say hundreds of nodes across many LB instances), I use **power-of-two-choices** instead: pick two backends at random and send to the less loaded one. P2C gets nearly the same smoothing as true least-connections but is O(1), needs no global load table, and avoids the herd effect where every LB piles onto the one node that momentarily looked idle. So: least-connections for a modest pool, P2C once the pool is large.

Keeping a user on a cache-warm node: layer **consistent hashing** on top. I hash the user (or session) ID to a backend so a returning user deterministically lands on the node that already has their data hot, and because it is consistent hashing, adding or removing a node only remaps ~1/N of users rather than reshuffling everyone and cold-flushing the whole fleet. Practically this looks like affinity **within** a load-aware policy: hash for warmth, but let the balancer fall back to a least-loaded node if the hashed target is overloaded or unhealthy (bounded-load consistent hashing).

The downside I must call out: **affinity costs even load and loses state on node death.** Pinning heavy or long-lived users concentrates load on their nodes, and when a pinned node dies those users reconnect cold to a new node and rebuild their cache. That is acceptable because the cache is a performance optimization, not a source of truth; if the "warm state" were actually authoritative I would externalize it (previous lesson) rather than rely on stickiness. Common wrong turn: using round robin here (hotspots on slow requests) or making stickiness rigid with no load-aware fallback, so one hot user melts their pinned node.

**Self-check rubric:**
- [ ] Rejected round robin for variable durations and explained the buried-node hotspot
- [ ] Chose least-connections, and P2C once the pool is large, with the herd/O(1) justification
- [ ] Used consistent hashing (not a lookup table) for cache-warm stickiness and noted minimal remap on node change
- [ ] Stated affinity's two costs: uneven load and state loss on node death
- [ ] Ideally combined affinity with a load-aware fallback rather than rigid pinning

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the balancing and affinity strategy for Discord-style stateful gateway nodes where each node holds thousands of live connections plus per-guild in-memory fan-out state, request/message durations are highly variable, and a redeploy reshuffles the fleet several times a day.

**Model answer (revealed on demand):**

Assumptions: a gateway fleet where each node holds many long-lived connections and per-guild fan-out state in memory, message-handling cost varies widely (a quiet DM vs a 100k-member guild broadcast), and deploys rotate the fleet multiple times daily, so node membership churns often.

Two problems interact: **balancing highly variable work** and **keeping guild state coherent across a churning fleet.** For spreading connections and per-message work I use **least-connections / least-outstanding-requests** so a node stuck fanning out to a huge guild stops receiving new connections, rather than round robin which would keep loading it. Because the fleet is large I use **power-of-two-choices** as the concrete implementation: O(1), no global load table, no herd onto a momentarily idle node.

For guild state I need **stickiness**, but the hard part is that deploys reshuffle the fleet several times a day, so I cannot use naive `hash(guild) % N` (changing N remaps almost every guild and cold-flushes all state). I use **consistent hashing (or rendezvous hashing) on guild ID**, so a guild deterministically maps to a node and its warm fan-out state, and when a deploy adds or drains nodes only ~1/N of guilds migrate instead of all of them. I pair this with **bounded-load** consistent hashing so a viral guild does not overload its assigned node with no escape valve: past a load threshold, overflow spills to the next node in the ring.

Deploy handling: because affinity loses in-memory state on node death, I drain connections gracefully (next lesson) and let clients reconnect, and I treat the per-guild fan-out state as rebuildable (reload from the authoritative store on reconnect) rather than durable. Common wrong turn: `hash % N` stickiness, which turns every deploy into a fleet-wide cache stampede as nearly every guild remaps at once; consistent hashing bounds that churn to a small fraction.


### sd-l4-health-checks: Health Checks, Draining & Graceful Rollout

- **id:** `sd-l4-health-checks`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** health-checks, draining, deploy

#### Learn

A load balancer only helps if it sends traffic to nodes that can actually serve it and stops sending to nodes that cannot. That is the job of **health checks**, and the subtlety is doing it without evicting healthy nodes or dropping in-flight work during a deploy.

There are two ways to know a node is bad. **Active checks** have the LB **probe** each backend on an interval (an HTTP GET `/healthz`, a TCP connect) and mark it unhealthy after N consecutive failures. Active checks detect a dead node fast and proactively, at the cost of probe traffic. **Passive checks** (outlier detection) **observe real traffic**: if a backend starts returning 5xx or timing out on actual requests, eject it from the pool for a cooldown. Passive checks catch failures that a shallow probe misses and add no probe load, but they only react after real requests have already failed. Production uses both: active for fast baseline detection, passive/outlier ejection for the failures probes cannot see.

The distinction that trips people up is **liveness vs readiness**:

- **Liveness** asks "is this process alive at all?" A failed liveness check means the node is broken and should be **restarted/replaced.**
- **Readiness** asks "is this node ready to receive traffic right now?" A node can be alive but **not ready**: still warming its cache, still loading a model, still filling connection pools, or temporarily shedding load. A not-ready node should be **pulled from the LB pool but not killed.**

Conflating them is a classic bug. If you treat "not warmed up yet" as a liveness failure, the orchestrator keeps killing and restarting perfectly good nodes in a crash loop. Gate a **newly started node behind readiness** until it is warm, then admit it.

Deploys are where this all gets exercised. A **rolling deploy** replaces nodes a batch at a time, and two mechanisms keep it from dropping requests:

- **Connection draining (graceful shutdown):** when a node is going away, first mark it **not ready** so the LB stops sending it **new** requests, but let its **in-flight** requests (and long-lived streams) **finish** up to a drain timeout before the process exits. Without draining, terminating a node mid-request returns errors to whoever was mid-flight. The sequence is: stop advertising -> stop new traffic -> wait for in-flight to complete (or hit the deadline) -> terminate.
- **Slow-start / ramp:** a freshly joined node starts with **zero warm cache and cold connection pools.** If the LB immediately gives it a full 1/N share, it can fall over or spike latency. Slow-start ramps its traffic share up over some seconds so it warms gradually instead of being flooded on join.

**Interview nuance:** the deepest point is **deep vs shallow health checks.** A shallow check returns 200 as long as the web server is up, even if the database or a critical downstream is unreachable, so the node keeps receiving traffic and failing every real request. A **deep** check verifies the critical dependencies (can I reach the DB, is the cache up). But deep checks have their own trap: if every node's health check hits a shared dependency and that dependency blips, **every node marks itself unhealthy at once and the whole fleet drops out**, turning a minor blip into a total outage. The mature answer is deep enough to catch a truly broken node, but with **hysteresis and not so coupled that a shared-dependency blip fails the entire fleet simultaneously.**

```
  drain sequence on node removal / deploy:
  mark NOT-READY -> LB stops NEW traffic -> in-flight finishes (<= drain deadline) -> terminate
  join sequence:
  start -> READINESS gates traffic until warm -> slow-start ramps share up
```

Recap: use active probes for fast detection plus passive outlier ejection for failures probes miss; keep liveness (restart the node) separate from readiness (pull from pool, do not kill) so warming nodes are not crash-looped; drain connections (stop new traffic, let in-flight finish) and slow-start new nodes so a rolling deploy drops nothing; and make checks deep enough to catch a broken downstream without letting one shared-dependency blip fail the whole fleet at once.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design health checking and drain behavior so a rolling deploy of 50 nodes never drops in-flight requests or a long-lived stream.

**Think about:**
- What is the difference between liveness and readiness?
- How do connection draining and slow-start protect requests?
- Why can a shallow 200 mask a broken dependency?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 50 nodes behind an L7 LB, a mix of short HTTP requests and some **long-lived streams** (gRPC streams or WebSockets), deployed by a **rolling** strategy that replaces nodes in batches (say 5 at a time). The goal is zero dropped requests and no severed stream during the deploy.

Health-check design: I expose **two separate endpoints.** `/livez` is shallow and cheap (the process is up and event loop responsive); a liveness failure tells the orchestrator to **restart/replace** the node. `/readyz` is deeper: it confirms the node has warmed (caches primed, connection pools filled) and that its **critical** dependencies are reachable, and it controls whether the **LB sends traffic.** Keeping them separate means a node that is merely warming or briefly shedding is pulled from the pool but **not killed**, avoiding a crash loop. Active probes run on a short interval (say every 2 to 5s, unhealthy after 2 to 3 consecutive failures) for fast detection, and I enable **passive outlier ejection** so a node returning 5xx on real traffic is ejected even if its probe still passes.

Draining, per batch: before terminating a node I flip it to **not ready** so the LB stops routing **new** requests to it, then I **wait** for in-flight requests to complete up to a **drain deadline.** For the **long-lived streams**, a hard drain deadline would sever them, so I set the drain timeout longer than a normal request (and for truly long streams I signal the client to reconnect, via a GOAWAY on HTTP/2 or an app-level "please reconnect" message, so it re-establishes on an already-healthy node before I terminate). Only after in-flight work drains (or the deadline hits) does the process exit. The sequence per node is: mark not-ready -> stop new traffic -> drain in-flight -> terminate -> new node boots.

Joining: each replacement node stays out of the pool until **readiness** passes (warm), and I enable **slow-start** so its traffic share ramps up over some seconds rather than getting a full 1/50 share while its cache and pools are cold. I deploy in small batches with a health gate between batches: if error rate or latency rises, I halt and roll back rather than continuing.

Common wrong turn: a single shallow `/health` used for both liveness and LB routing. It returns 200 while a downstream is broken (so bad nodes keep serving errors), and it conflates "warming up" with "dead" (so warming nodes get killed). Splitting liveness from readiness and adding a deep-but-decoupled readiness check is the fix.

**Self-check rubric:**
- [ ] Separated liveness (restart) from readiness (pull from pool, do not kill)
- [ ] Described the drain sequence: mark not-ready, stop new traffic, let in-flight finish, then terminate
- [ ] Handled long-lived streams explicitly (longer drain and/or signal client to reconnect, e.g. GOAWAY)
- [ ] Used readiness gating plus slow-start so cold new nodes are not flooded on join
- [ ] Explained why a shallow 200 masks a broken dependency, and used a deep-but-decoupled readiness check

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the health-check and rollout strategy for a Kubernetes fleet of 500 pods behind an Envoy mesh where a critical shared dependency (a central auth service) occasionally has a 10-second blip, and explain how you avoid a deep health check turning that blip into a fleet-wide outage.

**Model answer (revealed on demand):**

Assumptions: 500 pods, Envoy sidecars doing the routing, and a **shared** central auth dependency that blips for ~10s occasionally. The naive deep check ("verify I can reach auth") would make **all 500 pods fail readiness simultaneously** during the blip, draining the entire fleet from rotation and turning a 10s dependency hiccup into a full outage. Avoiding that is the whole point.

Design: I still use **Kubernetes liveness and readiness probes**, kept distinct: liveness is shallow (process healthy) so pods are not restarted for a transient dependency issue, readiness controls Endpoint membership. But I make the readiness check **not hard-fail on the shared dependency.** Concretely: (1) the readiness check verifies **local** health (can serve, pools warm) and treats the auth dependency as **degraded, not down**, so a brief auth blip does not eject the pod; (2) I rely on **Envoy passive outlier ejection** with a **max-ejection-percentage cap** (for example, never eject more than ~20 to 30% of the pool) so even if many pods look bad at once, the mesh refuses to drain the whole fleet and keeps a serving quorum; (3) probes have **hysteresis** (require several consecutive failures and a failure window longer than a 10s blip) so a sub-threshold blip never flips readiness at all.

For the dependency itself I add **circuit breaking and caching** at the sidecar: cache recent auth decisions / keys so a 10s auth blip is served from cache rather than failing requests, and fail **degraded** (allow, with reduced assurance, or serve cached tokens) where policy permits rather than fail-closed for the whole fleet. Rollouts use small **maxUnavailable/maxSurge** with health gates between batches. Common wrong turn: a deep readiness check that hard-depends on a shared service with no ejection cap and no hysteresis, so the shared blip synchronously fails every pod and takes the service fully down, the exact correlated-failure amplification a good design prevents.


### sd-l4-service-discovery: Service Discovery & Client vs Server-Side Load Balancing

- **id:** `sd-l4-service-discovery`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** service-discovery, load-balancing, microservices

#### Learn

In a fleet that autoscales and redeploys constantly, a service's instances come and go every minute: IPs and ports change, instances are added under load and terminated on scale-in. So a caller cannot hardcode addresses, and it cannot rely on long-TTL DNS, because the moment an instance is terminated a stale address keeps receiving traffic and callers get connection errors. **Service discovery** is the mechanism that lets a caller learn the **current set of healthy addresses** for a service, and this lesson also covers **who makes the balancing decision**: a central load balancer, or each client.

The core component is a **service registry**, the source of truth for "which instances of service X are up right now." There are two ways it gets populated:

- **Self-registration:** each instance **registers** itself on startup and sends periodic **heartbeats** (Consul, etcd, Netflix Eureka). If heartbeats stop, the registry marks it gone. On graceful shutdown it deregisters.
- **Platform-managed:** the orchestrator maintains it for you. In **Kubernetes**, a **Service** is a stable name/VIP, and the control plane keeps its **Endpoints / EndpointSlices** in sync with the pods that pass their **readiness** probe. You never register by hand; readiness plus the controller does it.

**Health-based removal** is what keeps discovery honest. The registry advertises only instances that pass **active health checks** or are heartbeating, and combines that with **readiness** so a **new** instance receives traffic only once it is warm. The number that matters is **propagation speed**: how fast a terminated or failing instance actually leaves every caller's view. With short health-check and heartbeat intervals plus fast registry watch/push, a bad instance is out of rotation within **seconds**; with long DNS TTLs it can be minutes, which is the failure mode to avoid.

Given a healthy instance list, the second question is **where the load-balancing decision happens**:

- **Server-side load balancing:** clients hit **one stable VIP or DNS name** and a **dedicated load balancer** (AWS ALB/NLB, Envoy, Nginx) picks a backend. Clients stay dumb and simple, and control is central (one place to change policy, TLS, routing). The cost is an **extra network hop** and a component you must scale and keep HA.
- **Client-side load balancing:** the client **fetches the healthy instance list** from the registry (or from a **mesh sidecar**) and picks a backend **itself** (gRPC client-side LB, a sidecar Envoy). This removes the extra hop and enables **smart, locality-aware policies** (prefer same-zone, least-request with local load view). The cost is **complexity pushed into every client** (every language/service needs the logic) and a hard dependency on **fast registry propagation**, because a client with a stale list routes to dead instances.

A **service mesh** (Istio or Linkerd, Envoy sidecars) is the popular middle ground: it gives client-side benefits (no central-LB hop, locality, per-request balancing, retries, mTLS) but with **central configuration**, so you configure policy once and every sidecar enforces it. The price is real operational complexity (running the control plane and a sidecar next to every pod).

**Interview nuance:** the discriminator is where you want complexity to live. Central LB = simple clients, extra hop, one scaling choke point. Client-side/mesh = no hop and smart routing, but complexity and propagation risk in every caller. A strong concrete answer: **Kubernetes with a mesh (Istio/Linkerd)** for a polyglot microservice fleet, or **gRPC client-side LB backed by etcd** for a gRPC-heavy one, in both cases with **short health-check intervals** so bad instances leave rotation within seconds.

```
  registry (Consul/etcd/Eureka  |  k8s Endpoints via readiness)
       ^ register/heartbeat            ^ controller keeps in sync
  server-side:  client -> [ VIP/LB ] -> backend        (1 extra hop, central control)
  client-side:  client (has list) ---> backend         (no hop, smart local policy, needs fast propagation)
```

Recap: in a constantly churning fleet, callers learn healthy addresses from a service registry (self-registration with heartbeats via Consul/etcd/Eureka, or platform-managed Kubernetes Endpoints tied to readiness), and unhealthy instances leave rotation in seconds via active checks plus short intervals; server-side LB keeps clients simple at the cost of an extra hop and a central component, client-side/mesh LB removes the hop and enables locality-aware routing at the cost of per-client complexity and a dependence on fast propagation, and the classic wrong turn is hardcoded IPs or long-TTL DNS that keeps sending traffic to terminated instances.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design service discovery for a microservice fleet that autoscales and redeploys constantly, and choose between client-side and server-side load balancing, justifying how unhealthy instances get removed.

**Think about:**
- When instances come and go every minute, how does a caller learn the current set of healthy addresses?
- Who makes the load-balancing decision: a central load balancer, or each client with a local view?
- How fast does an unhealthy or terminated instance get pulled out of rotation?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a polyglot microservice fleet behind autoscaling, where instance IP and port change constantly, instances are added and removed every minute, and stale routing causes user-visible errors. I want low error rate during churn and one coherent story for how bad instances leave rotation.

Discovery: I use a **service registry** as the source of truth for healthy instances. If I am on Kubernetes I lean on the **platform-managed** path: a **Service** gives a stable name, and the control plane keeps its **EndpointSlices** in sync with pods that pass their **readiness** probe, so instances appear only when warm and disappear on termination automatically. If I am not on Kubernetes I use **Consul or etcd** with **self-registration**: instances register on startup and **heartbeat**, and stop being advertised when heartbeats lapse or a health check fails. Either way, discovery is dynamic, and I explicitly **avoid hardcoded IPs and long-TTL DNS**, which are the classic sources of "traffic to a terminated instance."

Health-based removal: I combine **active health checks** (short interval, unhealthy after 2 to 3 consecutive failures) with **readiness** gating for new instances and **passive outlier ejection** for instances that fail real requests but still probe green. Because the registry only advertises passing instances and my check interval is a few seconds, a terminated or failing instance is out of every caller's view within **seconds**, which is the metric that actually matters.

LB decision: I choose **client-side load balancing via a service mesh** (Istio or Linkerd with Envoy sidecars). The reasons: it removes the extra hop of a central LB, it enables **locality-aware and least-request** routing (keep traffic same-zone to cut latency and cross-AZ cost), it gives me **retries, circuit breaking, and mTLS** uniformly, and crucially it keeps the **balancing logic out of each service's code** (the sidecar handles it, so my polyglot services do not each reimplement it) while configuration stays **central**. The tradeoff I accept is the operational complexity of running the mesh control plane and a sidecar per pod, and a dependence on **fast endpoint propagation**, which the mesh handles by pushing updates to sidecars quickly.

If a mesh is too heavy, my fallback is **gRPC client-side LB backed by etcd**, or **server-side LB (ALB/Envoy behind a stable VIP)** when I want dumb clients and central control and can accept the extra hop. Common wrong turn: hardcoding instance addresses or relying on long-TTL DNS, so terminated instances keep getting traffic and callers see connection errors during every scale-in and deploy.

**Self-check rubric:**
- [ ] Used a service registry (k8s Endpoints via readiness, or Consul/etcd/Eureka with heartbeats), not static config
- [ ] Explained health-based removal (active checks + readiness + outlier ejection) and gave a seconds-scale propagation target
- [ ] Made an explicit client-side vs server-side choice and justified it with the hop/complexity tradeoff
- [ ] Named concrete tech (mesh: Istio/Linkerd/Envoy; or gRPC+etcd; or ALB/NLB) rather than staying abstract
- [ ] Rejected hardcoded IPs / long-TTL DNS and said why they break under churn

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design service discovery and load balancing for a Netflix-scale fleet of thousands of instances across three AWS regions and multiple availability zones, where deploys and autoscaling churn instances continuously, cross-AZ traffic is a real cost line, and a single instance failure must be invisible within seconds. Justify client-side vs server-side.

**Model answer (revealed on demand):**

Assumptions: thousands of instances, three regions, several AZs per region, continuous churn from red/black deploys and autoscaling, meaningful **cross-AZ data-transfer cost**, and a hard requirement that one instance dying is invisible to callers within seconds.

At this scale I choose **client-side load balancing** (this is essentially the Netflix Eureka + Ribbon lineage, and the modern equivalent is a **service mesh** with Envoy sidecars or gRPC client-side LB). The deciding factors: (1) **cost**, because a client that knows instance **zones** can prefer **same-AZ** backends and only spill cross-AZ on failure, directly cutting the cross-AZ cost line, which a central LB cannot express as cheaply; (2) **no central choke point**, because routing thousands of instances through a central LB tier means scaling and paying for that tier and adding a hop to every call; (3) **latency**, since local, least-request, locality-aware picks beat a blind central hop.

Discovery: instances **self-register and heartbeat** into a highly available, **regionally replicated** registry (Eureka-style, or etcd/Consul per region), and clients **poll/watch** for the current healthy set with a short refresh. Registration is **per-region** so a region is self-contained; cross-region routing is handled above this layer (GSLB, a later module), not by making one global registry.

Fast failure removal within seconds: I combine short heartbeat and health-check intervals with **client-side passive detection**, the client ejects an instance that errors or times out on real requests immediately, without waiting for the registry to catch up. This is why client-side wins the "invisible within seconds" requirement: the caller does not wait on a central component to notice, it reacts to its own observed failures instantly, then rechecks the registry. I add **retries with budgets** and **circuit breaking** so an ejected instance's in-flight requests are retried on a healthy peer.

Tradeoff and wrong turn: client-side/mesh pushes complexity into every caller and depends on fast registry propagation, which I accept for the cost and latency wins at this scale. The wrong turn would be a single central LB tier for all east-west traffic (an extra hop, a scaling choke point, and blind to AZ locality so it burns cross-AZ cost), or a single global registry whose propagation lag makes "invisible within seconds" impossible across regions.
