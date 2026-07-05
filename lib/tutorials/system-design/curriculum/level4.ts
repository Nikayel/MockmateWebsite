/**
 * System Design — Level 4: Scaling Compute & Traffic.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l4-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L4. 14 lessons across 4
 * modules (sd-l4-m1..m4). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const horizontalStatelessTeach = `
## Scale up hits a wall; scale out needs statelessness

There are two ways to serve more traffic. **Scale up (vertical)** means a bigger box: more cores,
more RAM, faster disks on the same machine. **Scale out (horizontal)** means more boxes behind a load
balancer. Scale-up is the easy first move because it needs no code changes, but it hits a wall fast:
hardware has a top SKU, price scales super-linearly past commodity sizes (a 128-core box costs far
more than 2x a 64-core box), and one box is a single failure domain. When it dies, you are fully
down. Scale-out is the web-tier default precisely because it dodges all three: commodity nodes are
cheap, you add capacity linearly, and losing one node loses only 1/N of capacity.

The catch, and the whole point of this lesson: **you cannot load-balance servers that hold local
state.** If a node keeps the user's session in its own process memory, then request 1 lands on node A
(which now holds the session), and request 2 might land on node B, which has never heard of that
user. The user appears logged out. Worse, when node A dies, every session it held is gone. The load
balancer can only freely spread requests if **any node can serve any request**, which means nodes
must be **stateless**.

### Externalizing state

- **Sessions:** move them to Redis or Memcached, or make them stateless entirely with a signed
  **JWT** the client carries. Now any node validates the token or reads the session store, and node
  death loses nothing.
- **Uploaded files / user assets:** to object storage (S3, GCS), never local disk.
- **Durable data:** to the database, which is a separate scaling problem.

Once state is externalized, nodes become **cattle, not pets.** A pet is a hand-tuned server with a
name you nurse back to health. Cattle are interchangeable and disposable: provisioned from an
immutable image or IaC (a baked AMI, a container, Terraform), and when one misbehaves you kill it and
boot a replacement rather than debugging it live. Autoscaling groups, Kubernetes deployments, and
rolling deploys all assume this.

**Interview nuance:** do not over-apply "scale out everything." Scale-up still wins for tiers that
are genuinely hard to shard: a single-writer relational database, an in-memory analytics engine,
anything where the working set must be co-located. There you buy the big box and defer sharding until
write throughput or dataset size truly forces it. The honest framing: **scale-out for the stateless
web/app tier, scale-up (then shard) for the stateful data tier.**

\`\`\`
  scale UP (vertical)            scale OUT (horizontal)
  +-------------+                +----+  +----+  +----+
  |  bigger box |     vs         | n1 |  | n2 |  | n3 |  ... n500
  +-------------+                +----+  +----+  +----+
  1 failure domain,                 \\      |      /
  hard ceiling                    [ shared state: Redis / DB / S3 ]
\`\`\`

Recap: scale-out is the web-tier default because it beats the cost, ceiling, and
single-failure-domain limits of scale-up, but it only works once nodes are stateless (session and
file state externalized to Redis/JWT/S3), turning servers into interchangeable cattle; scale-up still
wins for hard-to-shard stateful tiers until you are forced to shard.
`.trim()

const lbL4L7Teach = `
## Which layer, and why it decides everything

A load balancer sits between clients and your fleet and decides which backend gets each request. The
first design choice is **which layer of the network stack it operates at**, and getting it wrong
costs you either routing features or raw throughput.

An **L4 (transport-layer) load balancer** works at TCP/UDP. It sees IP addresses and ports, not the
HTTP payload. It picks a backend, often on the very first packet, and then just forwards packets
without parsing anything above the transport layer. Because it does almost no work per packet, it is
**fast and high-throughput**, handles millions of connections cheaply, and works for **any**
protocol: raw TCP, database connections, WebSockets, custom protocols. AWS **NLB**, Google
**Maglev**, and IPVS are L4. The price is that it is **content-blind**: it cannot route by URL path,
read a header, terminate TLS, or rate-limit.

An **L7 (application-layer) load balancer** terminates the connection, parses the HTTP/gRPC request,
and routes on **content**: path (\`/api/*\` to one pool, \`/static/*\` to another), host header,
cookies, or method. Because it understands requests it can also do **TLS termination**, **rate
limiting**, **request/response transformation**, retries, and rich **observability** (per-route
latency, status codes). AWS **ALB**, **Nginx**, **HAProxy** (HTTP mode), and **Envoy** are L7. The
price is higher latency and lower throughput per node: parsing every request and terminating TLS
costs CPU.

### Stack them

Real architectures stack the layers: a thin **L4 layer at the edge** absorbs the raw connection
volume and spreads it across a fleet of **L7 proxies** behind it, which do the smart routing. The
canonical shapes are **NLB in front of ALB** on AWS, or **Maglev in front of Envoy** at Google. The
L4 layer gives you cheap, protocol-agnostic scale and DDoS surface; the L7 layer gives you features.

\`\`\`
            +------------------ L7 proxy (Envoy/ALB) --> app pool A  (/api)
client --> L4 (NLB/Maglev) --+-- L7 proxy --------------> app pool B  (/static)
  raw TCP, high throughput   +-- L7 proxy --------------> app pool C  (routing, TLS, rate limit)
\`\`\`

### The LB itself cannot be a SPOF

If all traffic funnels through one LB box and it dies, you are down regardless of how healthy the
fleet is. So the LB tier is made HA: **active-active** LB nodes, a **floating/virtual IP** that fails
over (keepalived/VRRP), or **anycast** so many LB nodes share one IP and BGP routes around a dead
one. Cloud LBs bake this in and are themselves horizontally scaled behind the scenes.

**Interview nuance:** a common trap is choosing L4 for an HTTP API and then discovering you need
path-based routing or TLS termination, which L4 cannot do. If the question mentions per-path routing,
header-based canaries, or TLS termination, you need L7 somewhere. Conversely, if it is raw non-HTTP
traffic or extreme throughput with minimal features, L4 alone is right.

Recap: L4 balancers are fast, protocol-agnostic, and content-blind; L7 balancers parse requests to
route by path/header, terminate TLS, and rate-limit at a latency cost; production stacks L4 at the
edge in front of an L7 fleet, and the LB tier itself must be made HA (active-active, floating IP, or
anycast) so it is never a SPOF.
`.trim()

const lbAlgorithmsTeach = `
## The rule for who gets the next request

Once a load balancer has a pool of healthy backends, it needs a rule for **which one gets the next
request**. The rule matters because the wrong one creates hotspots: some nodes melt while others sit
idle.

- **Round robin (RR):** hand requests out in rotation. **Weighted RR** biases toward bigger nodes. RR
  is perfect when every node is identical and every request costs about the same. It is blind to how
  busy a node actually is.
- **Least-connections (least-outstanding-requests):** send the next request to the node with the
  fewest in-flight requests. The right default when **request durations vary widely.** In a fleet
  where most requests take 5ms but some take 2s, a node that caught several 2s requests keeps getting
  new work on its RR turn even though it is buried; least-connections routes around it automatically
  because its in-flight count is high. This is the single most important algorithm intuition.
- **Power-of-two-choices (P2C):** for a **large** pool, tracking exact least-connections means an
  O(N) scan or a globally synchronized structure, and when many LB nodes independently pick "the
  least-loaded node," they **herd** onto whatever looked idle a moment ago. P2C fixes both: pick
  **two backends at random**, send to the less-loaded of the two. Nearly as good as true
  least-connections, O(1), no global state, provably avoids herding. The practical default for big
  fleets (Envoy, Nginx).
- **Consistent / rendezvous hashing:** hash a request key (user ID, session ID, cache key) to a
  backend so the **same key always lands on the same node**, and when a node joins or leaves only
  ~1/N of keys move. This is **sticky routing** without a lookup table: essential for cache-warm
  nodes and sharded in-memory state.

### Session affinity: a targeted tool, not a default

**Sticky sessions** deliberately pin a client to one backend, usually via a **cookie** the LB sets or
a **hash of the client IP / session ID**. You want it when a node holds warm per-user state and
re-hitting the same node avoids a cold miss. But affinity has two real costs. First, **uneven load**:
pinning means the balancer can no longer freely spread traffic, so a few heavy users skew load onto
their pinned nodes. Second, **lost state on node death**: when the pinned node dies, everything it
held is gone, and those users reconnect cold.

**Interview nuance:** the crisp story: "round robin for homogeneous stateless nodes; least-connections
when request durations vary; power-of-two-choices when the pool is large; consistent hashing when I
need stickiness or sharded state, accepting that stickiness costs even load and loses state on node
death." If you reach for sticky sessions to compensate for not externalizing state, that is a design
smell; if you reach for consistent hashing to keep a cache warm, that is sound engineering. Same
mechanism, different justification.

\`\`\`
   variable durations:
   RR  -> buried node still gets its turn   (bad: hotspot)
   LC  -> skip the buried node              (good)
   P2C -> pick 2 random, send to lighter    (good + O(1), no herd, no global state)
\`\`\`

Recap: round robin for identical stateless nodes, least-connections for variable durations,
power-of-two-choices as the O(1) no-herd default for large pools, and consistent/rendezvous hashing
for sticky routing or sharded state; session affinity keeps a user on a cache-warm node but costs
even load and loses that node's state when it dies, so use it deliberately.
`.trim()

const healthChecksTeach = `
## Send traffic only to nodes that can serve it

A load balancer only helps if it sends traffic to nodes that can actually serve it and stops sending
to nodes that cannot. That is the job of **health checks**, and the subtlety is doing it without
evicting healthy nodes or dropping in-flight work during a deploy.

There are two ways to know a node is bad. **Active checks** have the LB **probe** each backend on an
interval (an HTTP GET \`/healthz\`, a TCP connect) and mark it unhealthy after N consecutive
failures: fast, proactive detection at the cost of probe traffic. **Passive checks** (outlier
detection) **observe real traffic**: if a backend starts returning 5xx or timing out on actual
requests, eject it from the pool for a cooldown. Passive checks catch failures a shallow probe
misses. Production uses both.

### Liveness vs readiness

- **Liveness** asks "is this process alive at all?" A failed liveness check means the node is broken
  and should be **restarted/replaced.**
- **Readiness** asks "is this node ready to receive traffic right now?" A node can be alive but
  **not ready**: still warming its cache, loading a model, filling connection pools, or temporarily
  shedding load. A not-ready node should be **pulled from the LB pool but not killed.**

Conflating them is a classic bug. If you treat "not warmed up yet" as a liveness failure, the
orchestrator keeps killing and restarting perfectly good nodes in a crash loop. Gate a newly started
node behind readiness until it is warm, then admit it.

### Deploys: draining and slow-start

- **Connection draining (graceful shutdown):** when a node is going away, first mark it **not ready**
  so the LB stops sending it **new** requests, but let its **in-flight** requests (and long-lived
  streams) **finish** up to a drain timeout before the process exits. The sequence: stop advertising
  -> stop new traffic -> wait for in-flight to complete (or hit the deadline) -> terminate.
- **Slow-start / ramp:** a freshly joined node starts with zero warm cache and cold connection pools.
  If the LB immediately gives it a full 1/N share, it can fall over or spike latency. Slow-start
  ramps its traffic share up over some seconds.

**Interview nuance: deep vs shallow health checks.** A shallow check returns 200 as long as the web
server is up, even if the database or a critical downstream is unreachable, so the node keeps
receiving traffic and failing every real request. A **deep** check verifies the critical
dependencies. But deep checks have their own trap: if every node's health check hits a shared
dependency and that dependency blips, **every node marks itself unhealthy at once and the whole fleet
drops out**, turning a minor blip into a total outage. The mature answer: deep enough to catch a
truly broken node, with hysteresis, and not so coupled that a shared-dependency blip fails the entire
fleet simultaneously.

\`\`\`
  drain sequence on node removal / deploy:
  mark NOT-READY -> LB stops NEW traffic -> in-flight finishes (<= drain deadline) -> terminate
  join sequence:
  start -> READINESS gates traffic until warm -> slow-start ramps share up
\`\`\`

Recap: use active probes plus passive outlier ejection; keep liveness (restart) separate from
readiness (pull from pool, do not kill); drain connections and slow-start new nodes so a rolling
deploy drops nothing; and make checks deep enough to catch a broken downstream without letting one
shared-dependency blip fail the whole fleet at once.
`.trim()

const serviceDiscoveryTeach = `
## Callers must learn addresses that change every minute

In a fleet that autoscales and redeploys constantly, a service's instances come and go every minute:
IPs and ports change, instances are added under load and terminated on scale-in. So a caller cannot
hardcode addresses, and it cannot rely on long-TTL DNS, because the moment an instance is terminated
a stale address keeps receiving traffic and callers get connection errors. **Service discovery** lets
a caller learn the **current set of healthy addresses**, and the second question is **who makes the
balancing decision**: a central load balancer, or each client.

### The service registry

- **Self-registration:** each instance **registers** itself on startup and sends periodic
  **heartbeats** (Consul, etcd, Netflix Eureka). If heartbeats stop, the registry marks it gone. On
  graceful shutdown it deregisters.
- **Platform-managed:** the orchestrator maintains it for you. In **Kubernetes**, a **Service** is a
  stable name/VIP, and the control plane keeps its **Endpoints / EndpointSlices** in sync with the
  pods that pass their **readiness** probe.

**Health-based removal** keeps discovery honest. The registry advertises only instances that pass
**active health checks** or are heartbeating, combined with **readiness** so a new instance receives
traffic only once warm. The number that matters is **propagation speed**: how fast a terminated or
failing instance actually leaves every caller's view. With short check intervals plus fast registry
watch/push, a bad instance is out of rotation within **seconds**; with long DNS TTLs it can be
minutes, which is the failure mode to avoid.

### Where the balancing decision happens

- **Server-side load balancing:** clients hit one stable VIP or DNS name and a dedicated load
  balancer (ALB/NLB, Envoy, Nginx) picks a backend. Clients stay dumb and simple, and control is
  central. The cost is an extra network hop and a component you must scale and keep HA.
- **Client-side load balancing:** the client fetches the healthy instance list from the registry (or
  a mesh sidecar) and picks a backend itself (gRPC client-side LB, a sidecar Envoy). This removes the
  extra hop and enables smart, locality-aware policies (prefer same-zone, least-request with local
  load view). The cost is complexity pushed into every client and a hard dependency on fast registry
  propagation.

A **service mesh** (Istio or Linkerd, Envoy sidecars) is the popular middle ground: client-side
benefits (no central-LB hop, locality, per-request balancing, retries, mTLS) with **central
configuration**. The price is real operational complexity (a control plane and a sidecar per pod).

**Interview nuance:** the discriminator is where you want complexity to live. Central LB = simple
clients, extra hop, one scaling choke point. Client-side/mesh = no hop and smart routing, but
complexity and propagation risk in every caller. A strong concrete answer: Kubernetes with a mesh for
a polyglot fleet, or gRPC client-side LB backed by etcd for a gRPC-heavy one, with short health-check
intervals so bad instances leave rotation within seconds.

\`\`\`
  registry (Consul/etcd/Eureka  |  k8s Endpoints via readiness)
       ^ register/heartbeat            ^ controller keeps in sync
  server-side:  client -> [ VIP/LB ] -> backend        (1 extra hop, central control)
  client-side:  client (has list) ---> backend         (no hop, smart local policy)
\`\`\`

Recap: callers learn healthy addresses from a service registry (self-registration with heartbeats, or
Kubernetes Endpoints tied to readiness), unhealthy instances leave rotation in seconds; server-side
LB keeps clients simple at the cost of a hop and a central component, client-side/mesh removes the
hop and adds locality at the cost of per-client complexity, and the classic wrong turn is hardcoded
IPs or long-TTL DNS that keeps sending traffic to terminated instances.
`.trim()

const globalGslbTeach = `
## Steer users to the nearest healthy region, and fail fast

Once your product serves users on multiple continents from multiple regions, you need a way to steer
each user to a nearby healthy region and, when a region catches fire, to pull all traffic off it
fast. There are two distinct mechanisms, and interviewers want you to know they operate at different
layers.

**GeoDNS / DNS-based GSLB** steers at name resolution. When a client resolves \`api.example.com\`, an
authoritative DNS service (Route 53, NS1, Akamai) returns different IPs based on the resolver's
location or measured latency. You get **geo-routing**, **latency-based routing**, **weighted
records** (send 10% to a new region for a canary), and **health-checked failover** (stop handing out
a region's IP once its health check fails). The catch is that DNS is a *caching* system. Every answer
carries a **TTL**, and resolvers, OS stub resolvers, and browsers cache it. Even a 30 to 60 second
TTL means some clients keep hitting a dead region for a minute or more after you flip the record, and
some misbehaving resolvers ignore short TTLs entirely. So DNS failover is never instant, and that
single fact is the most-probed point in this topic.

**Anycast** steers at the network layer. You announce the *same* IP address from many points of
presence via BGP. The internet's routing fabric delivers each client's packets to the topologically
nearest PoP announcing that prefix. Withdraw the BGP announcement at a failing PoP and traffic
reconverges to the next-nearest one in seconds, with no DNS change and no client-side caching to wait
out. **ECMP** spreads flows across equal-cost paths. The subtlety: plain ECMP rehashes flows when the
server set changes, which breaks in-flight connections. Production anycast load balancers (Google's
**Maglev**, AWS **Hyperplane**) use **consistent hashing** so a backend change only remaps a small
fraction of connections.

The two combine in practice: anycast to the nearest edge/CDN PoP terminates TLS and absorbs the
connection close to the user, then the edge forwards over warm long-haul connections to a healthy
origin region chosen by GSLB.

\`\`\`
User -> [Anycast IP, BGP -> nearest PoP] -> edge TLS terminate
     -> GSLB picks healthy origin region -> origin
  fail a region: withdraw BGP (seconds)  |  flip DNS (minutes, TTL-bound)
\`\`\`

### Active-active vs active-passive, and draining

Active-active runs live traffic in every region, so failing one out is just shifting its share onto
the survivors (which must have the headroom to absorb it). Active-passive keeps a warm standby that
only takes traffic on failover: simpler but wastes capacity and has a colder failover path. To
**drain** a region cleanly you stop sending it new traffic (lower its DNS weight to zero or withdraw
its anycast announcement), let in-flight requests finish, then take it down.

**Interview nuance:** if you say "DNS failover, done" you will be asked "how long until the last user
leaves the dead region?" The honest answer is bounded by TTL plus resolver misbehavior, which is why
anycast (BGP withdrawal) or connection-level draining is what actually gives you sub-minute regional
failover.

Recap: use GeoDNS for coarse region steering and anycast plus BGP for fast, cache-free failover, keep
connections stable with Maglev-style consistent hashing, and never claim DNS failover is instant
because resolver caching bounds it.
`.trim()

export const systemDesignLevel4: DesignLevel = {
  id: 4,
  slug: "scaling-compute",
  title: "Level 4 — Scaling Compute & Traffic",
  tagline:
    "Stateless scale-out, load balancing, gateways, rate limiting, autoscaling, and overload protection.",
  estimatedHours: 7,
  modules: [
    {
      id: "sd-l4-m1",
      title: "Horizontal Scaling & Load Balancing",
      description:
        "Turn a single-box web tier into an interchangeable fleet: choose L4 vs L7 and the right algorithm, keep deploys from dropping in-flight requests, and let services find healthy instances under constant churn.",
      lessons: [
        {
          id: "sd-l4-horizontal-stateless",
          title: "Horizontal vs Vertical Scaling & Stateless Services",
          summary:
            "Scale out the web tier by externalizing sessions and files so any node serves any request; scale up (then shard) the stateful data tier.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["horizontal-scaling", "stateless"],
          teach: {
            markdown: horizontalStatelessTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-horizontal-stateless-apply",
            prompt:
              "Design the scaling model for a web tier that currently keeps user sessions in server memory so it can grow from 1 to 500 nodes.",
            thinkAbout: [
              "What must you externalize to make nodes interchangeable?",
              "When does scale-up still win over scale-out?",
              "What is the cattle-not-pets model?",
            ],
            modelAnswerOutline: [
              "Assumptions: a stateful web/app tier where login sessions, some uploaded files, and per-user caches live in each node's process memory; traffic growing 500x; the database is a separate shared tier.",
              "**The blocker is state locality, not capacity:** you cannot put 500 interchangeable nodes behind a load balancer while a request's correctness depends on hitting the one node holding that user's session. Step one: make the tier stateless. Move sessions into a shared Redis cluster (or convert to signed JWTs, trading revocation flexibility for zero session storage). Uploaded files move to S3, not local disk. Now any node serves any request, and a dead node loses zero user state.",
              "**Step two, scale-out mechanics:** put the fleet in an autoscaling group (or Kubernetes deployment) behind an L7 load balancer. Nodes boot from an immutable image (AMI or container), so provisioning needs no manual setup. This is cattle-not-pets: nameless, disposable nodes, scaled on CPU/RPS and replaced rather than repaired. Health checks gate traffic to warm nodes. Scaling 1 to 500 is raising the ASG max.",
              "**Sizing and tradeoffs:** 500 commodity nodes give linear capacity and lose only 0.2% of capacity per node death, versus one huge box that is a single failure domain with a hard ceiling. The cost of statelessness is one extra sub-millisecond hop to Redis on session reads and the burden of running Redis HA: a good trade.",
              "Common wrong turn: keeping in-memory sessions and reaching for sticky sessions to pin each user to their node. That superficially works but load skews toward long-lived users, and any node death logs out everyone it held. Sticky-to-avoid-externalizing-state is a design smell.",
            ],
          },
          practice: {
            id: "sd-l4-horizontal-stateless-practice",
            prompt:
              "Design the path to horizontally scale Zoom-style signaling servers where each server currently holds live WebSocket connections and in-memory meeting room state for the participants connected to it, and the fleet must survive a single-node crash without dropping every call on that node.",
            thinkAbout: [
              "Which state can be externalized, and which (the socket itself) physically cannot?",
              "What makes a node crash a brief reconnect blip instead of a dead call?",
              "How would you get room locality without making a node's loss fatal?",
            ],
            modelAnswerOutline: [
              "Assumptions: a signaling tier where each node terminates thousands of long-lived WebSocket connections and holds per-meeting room state (participants, mute status, presenter) in memory. Unlike a stateless HTTP tier, the connection itself is state: a socket is physically bound to one node.",
              "**The honest framing: this tier is partially stateful by nature,** so the goal is not 'make every node identical' but 'make the durable state survivable and the connection recoverable.'",
              "**Split state into two kinds.** Authoritative room state (participants, roles) moves to a shared low-latency store: Redis with pub/sub or an in-memory data grid, so it survives node death. The socket stays local (it must), but is made cheap to re-establish: clients auto-reconnect on drop, the load balancer sends them to any healthy node, and that node rehydrates their view from the shared room state. A node crash drops its sockets, but clients reconnect within a second or two and the meeting continues.",
              "**Load balancing:** an L4 balancer (NLB) for raw WebSocket throughput, spreading connections by least-connections (long-lived, variable-duration connections make round robin skew). Because room state is shared, participants of one meeting need not be co-located; for locality, route by a consistent hash of meeting ID so a room clusters on one node while still tolerating that node's loss via the shared store.",
              "**The tradeoff:** room state in Redis adds a network hop per state change and makes Redis HA a hard dependency, but converts 'one node crash kills every call on it permanently' into 'a brief reconnect blip.'",
              "Common wrong turn: treating signaling exactly like a stateless HTTP tier and assuming the LB can move live connections: it cannot. The design work is in fast client reconnect plus externalized room state, not in pretending the socket is stateless.",
            ],
          },
        },
        {
          id: "sd-l4-lb-l4-l7",
          title: "Load Balancer Fundamentals: L4 vs L7",
          summary:
            "L4 is fast, protocol-agnostic, and content-blind; L7 routes on content and terminates TLS at a CPU cost; production stacks L4 at the edge in front of an L7 fleet, all made HA.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["load-balancing", "l4-l7"],
          teach: {
            markdown: lbL4L7Teach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-lb-l4-l7-apply",
            prompt:
              "Choose and justify the load-balancing layers for a service handling both gRPC APIs and long-lived WebSocket connections.",
            thinkAbout: [
              "What does L4 give in throughput vs what L7 gives in routing features?",
              "Why do real architectures stack L4 in front of L7?",
              "How is the LB itself made highly available?",
            ],
            modelAnswerOutline: [
              "Assumptions: two distinct traffic classes. gRPC is HTTP/2 request/response wanting per-service and per-method routing, TLS termination, and per-route metrics. WebSockets are long-lived, low-message-rate connections where connection count is large and the need is mostly fanning connections across the fleet.",
              "**Design: a stacked L4-in-front-of-L7 topology.** At the edge, an L4 balancer (AWS NLB or Maglev-style) shares one anycast VIP, absorbing raw connection volume for both classes cheaply and protocol-agnostically: also the DDoS surface. Behind it, a fleet of L7 proxies (Envoy).",
              "**For gRPC, the L7 layer does real work:** it speaks HTTP/2, routes by :path (service/method), terminates TLS, load-balances per-request across backends (critical: a naive L4 hash would pin all of one client's multiplexed gRPC calls to a single backend, defeating balancing), enforces rate limits, and emits per-method latency.",
              "**For WebSockets, choose deliberately:** once established there is little per-message routing value, and an L7 proxy holding hundreds of thousands of idle sockets is expensive. Either route WebSocket traffic through L4 straight to backends (least-connections, since durations vary wildly), or terminate at L7 for auth/header inspection at connect time and accept the cost. Terminate TLS and authenticate at connect, then let the socket ride.",
              "**HA:** the L4 edge is active-active behind anycast, so a dead LB node is routed around by BGP with no VIP failover step; the Envoy L7 fleet is horizontally scaled and health-checked.",
              "Common wrong turn: only an L4 LB in front of gRPC (no method routing, no per-request balancing), or a pure L7 tier babysitting hundreds of thousands of idle WebSockets, paying L7 CPU/memory for sockets that need no request parsing.",
            ],
          },
          practice: {
            id: "sd-l4-lb-l4-l7-practice",
            prompt:
              "Choose the load-balancing layers for Cloudflare-scale edge traffic terminating tens of millions of concurrent TLS connections across hundreds of PoPs, where a single PoP or LB node failure must not drop the service, and justify where TLS terminates.",
            thinkAbout: [
              "What does consistent hashing at the L4 tier protect during L7 fleet changes?",
              "Why terminate TLS at the PoP rather than at origin?",
              "How does a whole-PoP failure disappear without a DNS change?",
            ],
            modelAnswerOutline: [
              "Assumptions: global HTTPS traffic at tens of millions of concurrent connections, hundreds of points of presence, and a hard requirement that any single node or PoP failure is invisible to users.",
              "**Topology, edge to origin:** one anycast IP announced by BGP from every PoP, so a client's packets go to the topologically nearest PoP, and if a PoP withdraws its route, BGP reroutes to the next-nearest with no DNS change. Inside a PoP, the first hop is an L4 layer (Maglev-style ECMP with consistent hashing) spreading connections across many L7 proxy nodes.",
              "**Consistent hashing at L4 is the key detail:** when an L7 node is added or removed, only a small fraction of connections rehash, so live TLS sessions are not reset en masse. Behind L4, a fleet of L7 proxies terminates TLS at the edge, parses HTTP, applies WAF/rate-limit/cache rules, and reaches origin over pooled, keep-alive, often re-encrypted connections.",
              "**Why TLS terminates at the edge:** the expensive handshake happens close to the user (low RTT, fast setup), the edge can cache and inspect requests, and origin connection count collapses because thousands of client connections multiplex onto a few pooled origin connections. The cost: edge-to-origin traffic must be independently secured (re-encrypted or over a private backbone).",
              "**Failure handling:** L4 nodes are active-active and ECMP-balanced (one dying just removes a hash bucket); L7 nodes are health-checked and drained; a whole PoP failing withdraws its anycast route and the next PoP absorbs the load. No SPOF at any layer.",
              "Common wrong turn: plain (non-consistent) hashing or round robin at L4, so scaling the L7 fleet mid-day resets a large share of live TLS connections and causes a reconnect storm.",
            ],
          },
        },
        {
          id: "sd-l4-lb-algorithms",
          title: "Load-Balancing Algorithms & Session Affinity",
          summary:
            "Least-connections for variable durations, power-of-two-choices for large pools, consistent hashing for cache-warm stickiness, and affinity used deliberately, not by default.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["lb-algorithms", "affinity"],
          teach: {
            markdown: lbAlgorithmsTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l4-lb-algorithms-apply",
            prompt:
              "Pick a balancing algorithm for a fleet with highly variable request durations and explain how you keep a user pinned to a cache-warm node.",
            thinkAbout: [
              "Why does least-connections beat round robin for variable durations?",
              "When is power-of-two-choices the practical large-pool default?",
              "What is the downside of sticky sessions?",
            ],
            modelAnswerOutline: [
              "Assumptions: a stateless-ish app fleet where most requests take a few milliseconds but a meaningful tail runs hundreds of milliseconds to seconds (report generation, fan-out queries), and each node keeps a warm local cache for recently served users.",
              "**Not round robin:** with variable durations, RR keeps handing new work to a node on its turn regardless of how buried it is, so a node that caught a few slow requests piles up while RR stays blind. Choose a load-aware rule: **least-connections** (route to the fewest in-flight requests), which naturally steers away from a node stuck on slow work.",
              "**Once the fleet is large** (hundreds of nodes across many LB instances), use **power-of-two-choices**: pick two backends at random, send to the less loaded. Nearly the same smoothing as true least-connections, O(1), no global load table, and no herd effect where every LB piles onto the one node that momentarily looked idle.",
              "**Cache-warm pinning: layer consistent hashing on top.** Hash the user (or session) ID to a backend so a returning user deterministically lands on the node with their data hot; because it is consistent hashing, adding or removing a node remaps only ~1/N of users rather than cold-flushing the fleet. Practically: affinity within a load-aware policy, with a fallback to a least-loaded node if the hashed target is overloaded or unhealthy (bounded-load consistent hashing).",
              "**The downside called out:** affinity costs even load (heavy or long-lived users concentrate on their pinned nodes) and loses state on node death (those users reconnect cold and rebuild). Acceptable here because the cache is a performance optimization, not a source of truth; if the warm state were authoritative, externalize it rather than rely on stickiness.",
              "Common wrong turn: round robin here (hotspots on slow requests) or rigid stickiness with no load-aware fallback, so one hot user melts their pinned node.",
            ],
          },
          practice: {
            id: "sd-l4-lb-algorithms-practice",
            prompt:
              "Design the balancing and affinity strategy for Discord-style stateful gateway nodes where each node holds thousands of live connections plus per-guild in-memory fan-out state, request/message durations are highly variable, and a redeploy reshuffles the fleet several times a day.",
            thinkAbout: [
              "What does hash % N do to guild state on every deploy, and what fixes it?",
              "How do you stop a viral guild from overloading its assigned node?",
              "Which state must be rebuildable rather than durable for this to work?",
            ],
            modelAnswerOutline: [
              "Assumptions: a gateway fleet where each node holds many long-lived connections and per-guild fan-out state in memory; message-handling cost varies widely (a quiet DM vs a 100k-member guild broadcast); deploys rotate the fleet multiple times daily.",
              "**Two interacting problems: balancing variable work, and keeping guild state coherent across a churning fleet.** For spreading connections and per-message work: least-connections / least-outstanding-requests so a node stuck fanning out to a huge guild stops receiving new connections. Because the fleet is large, implement it as power-of-two-choices: O(1), no global load table, no herd.",
              "**Guild stickiness under churn:** naive `hash(guild) % N` is unusable because changing N (every deploy) remaps almost every guild and cold-flushes all state. Use consistent hashing (or rendezvous hashing) on guild ID, so a guild deterministically maps to a node and its warm fan-out state, and a deploy migrates only ~1/N of guilds.",
              "**The viral-guild escape valve:** pair with bounded-load consistent hashing so a hot guild does not overload its assigned node: past a load threshold, overflow spills to the next node in the ring.",
              "**Deploy handling:** affinity loses in-memory state on node death, so drain connections gracefully, let clients reconnect, and treat per-guild fan-out state as rebuildable (reload from the authoritative store on reconnect) rather than durable.",
              "Common wrong turn: `hash % N` stickiness, which turns every deploy into a fleet-wide cache stampede as nearly every guild remaps at once; consistent hashing bounds that churn to a small fraction.",
            ],
          },
        },
        {
          id: "sd-l4-health-checks",
          title: "Health Checks, Draining & Graceful Rollout",
          summary:
            "Separate liveness (restart) from readiness (pull from pool), drain in-flight work before terminating, slow-start cold nodes, and keep deep checks from failing the whole fleet.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["health-checks", "draining", "deploy"],
          teach: {
            markdown: healthChecksTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l4-health-checks-apply",
            prompt:
              "Design health checking and drain behavior so a rolling deploy of 50 nodes never drops in-flight requests or a long-lived stream.",
            thinkAbout: [
              "What is the difference between liveness and readiness?",
              "How do connection draining and slow-start protect requests?",
              "Why can a shallow 200 mask a broken dependency?",
            ],
            modelAnswerOutline: [
              "Assumptions: 50 nodes behind an L7 LB, a mix of short HTTP requests and long-lived streams (gRPC streams or WebSockets), rolling deploy in batches of ~5, and a goal of zero dropped requests and no severed stream.",
              "**Two separate endpoints.** `/livez` is shallow and cheap (process up, event loop responsive); a liveness failure tells the orchestrator to restart/replace the node. `/readyz` is deeper: it confirms the node has warmed (caches primed, pools filled) and critical dependencies are reachable, and it controls whether the LB sends traffic. Keeping them separate means a node that is merely warming or briefly shedding is pulled from the pool but not killed. Active probes every 2-5s (unhealthy after 2-3 consecutive failures), plus passive outlier ejection so a node returning 5xx on real traffic is ejected even if its probe still passes.",
              "**Draining, per batch:** flip the node to not-ready so the LB stops routing new requests, then wait for in-flight requests to complete up to a drain deadline. For long-lived streams, a hard deadline would sever them, so set the drain timeout longer than a normal request and signal the client to reconnect (a GOAWAY on HTTP/2 or an app-level 'please reconnect') so it re-establishes on a healthy node before termination. Sequence per node: mark not-ready -> stop new traffic -> drain in-flight -> terminate -> new node boots.",
              "**Joining:** each replacement stays out of the pool until readiness passes, with slow-start so its traffic share ramps over seconds rather than getting a full 1/50 share cold. Deploy in small batches with a health gate between batches: if error rate or latency rises, halt and roll back.",
              "Common wrong turn: a single shallow `/health` used for both liveness and LB routing. It returns 200 while a downstream is broken (bad nodes keep serving errors) and conflates 'warming up' with 'dead' (warming nodes get killed). Splitting liveness from readiness with a deep-but-decoupled readiness check is the fix.",
            ],
          },
          practice: {
            id: "sd-l4-health-checks-practice",
            prompt:
              "Design the health-check and rollout strategy for a Kubernetes fleet of 500 pods behind an Envoy mesh where a critical shared dependency (a central auth service) occasionally has a 10-second blip, and explain how you avoid a deep health check turning that blip into a fleet-wide outage.",
            thinkAbout: [
              "What happens if all 500 readiness probes hard-depend on the shared auth service?",
              "What do ejection caps and probe hysteresis each protect against?",
              "How can the sidecar make a 10-second auth blip invisible to requests?",
            ],
            modelAnswerOutline: [
              "Assumptions: 500 pods, Envoy sidecars routing, and a shared central auth dependency that blips for ~10s occasionally. The naive deep check ('verify I can reach auth') would make all 500 pods fail readiness simultaneously during the blip, draining the entire fleet and turning a 10s hiccup into a full outage.",
              "**Keep Kubernetes liveness and readiness distinct:** liveness is shallow (process healthy) so pods are not restarted for a transient dependency issue; readiness controls Endpoint membership.",
              "**Make readiness not hard-fail on the shared dependency:** (1) the readiness check verifies local health (can serve, pools warm) and treats the auth dependency as degraded, not down, so a brief blip does not eject the pod; (2) rely on Envoy passive outlier ejection with a max-ejection-percentage cap (never eject more than ~20-30% of the pool), so even if many pods look bad at once, the mesh refuses to drain the whole fleet; (3) give probes hysteresis (several consecutive failures over a window longer than a 10s blip) so a sub-threshold blip never flips readiness at all.",
              "**Handle the dependency itself at the sidecar:** circuit breaking plus caching of recent auth decisions/keys so a 10s auth blip is served from cache rather than failing requests, and fail degraded where policy permits rather than fail-closed for the whole fleet.",
              "**Rollouts:** small maxUnavailable/maxSurge with health gates between batches.",
              "Common wrong turn: a deep readiness check that hard-depends on a shared service with no ejection cap and no hysteresis, so the shared blip synchronously fails every pod and takes the service fully down: exactly the correlated-failure amplification a good design prevents.",
            ],
          },
        },
        {
          id: "sd-l4-service-discovery",
          title: "Service Discovery & Client vs Server-Side Load Balancing",
          summary:
            "A registry (heartbeats or k8s readiness-driven Endpoints) keeps healthy addresses current within seconds; choose server-side simplicity or client-side/mesh locality deliberately.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["service-discovery", "load-balancing", "microservices"],
          teach: {
            markdown: serviceDiscoveryTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-service-discovery-apply",
            prompt:
              "Design service discovery for a microservice fleet that autoscales and redeploys constantly, and choose between client-side and server-side load balancing, justifying how unhealthy instances get removed.",
            thinkAbout: [
              "When instances come and go every minute, how does a caller learn the current set of healthy addresses?",
              "Who makes the load-balancing decision: a central load balancer, or each client with a local view?",
              "How fast does an unhealthy or terminated instance get pulled out of rotation?",
            ],
            modelAnswerOutline: [
              "Assumptions: a polyglot microservice fleet behind autoscaling, where instance IP and port change constantly and stale routing causes user-visible errors.",
              "**Discovery:** a service registry as the source of truth. On Kubernetes, lean on the platform-managed path: a Service gives a stable name and the control plane keeps EndpointSlices in sync with pods that pass readiness, so instances appear only when warm and disappear on termination. Off Kubernetes, use Consul or etcd with self-registration: instances register on startup and heartbeat, and stop being advertised when heartbeats lapse. Explicitly avoid hardcoded IPs and long-TTL DNS: the classic sources of 'traffic to a terminated instance.'",
              "**Health-based removal:** active health checks (short interval, unhealthy after 2-3 consecutive failures) plus readiness gating for new instances plus passive outlier ejection for instances that fail real requests but probe green. With second-scale intervals and registry watch/push, a terminated or failing instance is out of every caller's view within seconds: the metric that actually matters.",
              "**LB decision: client-side via a service mesh** (Istio or Linkerd with Envoy sidecars). It removes the central-LB hop, enables locality-aware and least-request routing (same-zone traffic cuts latency and cross-AZ cost), gives retries, circuit breaking, and mTLS uniformly, and keeps balancing logic out of each service's code (the sidecar handles it) while configuration stays central. The accepted tradeoff: running the mesh control plane and a sidecar per pod, and a dependence on fast endpoint propagation.",
              "**Fallbacks:** gRPC client-side LB backed by etcd for a gRPC-heavy fleet, or server-side LB (ALB/Envoy behind a stable VIP) when dumb clients and central control are worth the extra hop.",
              "Common wrong turn: hardcoding instance addresses or relying on long-TTL DNS, so terminated instances keep getting traffic and callers see connection errors during every scale-in and deploy.",
            ],
          },
          practice: {
            id: "sd-l4-service-discovery-practice",
            prompt:
              "Design service discovery and load balancing for a Netflix-scale fleet of thousands of instances across three AWS regions and multiple availability zones, where deploys and autoscaling churn instances continuously, cross-AZ traffic is a real cost line, and a single instance failure must be invisible within seconds. Justify client-side vs server-side.",
            thinkAbout: [
              "What can a zone-aware client do that a central LB cannot express as cheaply?",
              "Why does client-side passive detection beat waiting for a registry update?",
              "Why per-region registries rather than one global one?",
            ],
            modelAnswerOutline: [
              "Assumptions: thousands of instances, three regions, several AZs per region, continuous churn from deploys and autoscaling, meaningful cross-AZ data-transfer cost, and one instance dying must be invisible within seconds.",
              "**Choose client-side load balancing** (the Netflix Eureka + Ribbon lineage; the modern equivalent is a mesh with Envoy sidecars or gRPC client-side LB). Deciding factors: (1) cost: a client that knows instance zones can prefer same-AZ backends and only spill cross-AZ on failure, directly cutting the cross-AZ cost line, which a central LB cannot express as cheaply; (2) no central choke point: routing thousands of instances through a central LB tier means scaling and paying for that tier plus a hop on every call; (3) latency: local, least-request, locality-aware picks beat a blind central hop.",
              "**Discovery:** instances self-register and heartbeat into a highly available, regionally replicated registry (Eureka-style, or etcd/Consul per region); clients poll/watch with a short refresh. Registration is per-region so a region is self-contained; cross-region routing is handled above this layer (GSLB), not by one global registry.",
              "**Invisible-within-seconds:** short heartbeat and check intervals plus client-side passive detection: the client ejects an instance that errors or times out on real requests immediately, without waiting for the registry to catch up, then rechecks the registry. Retries with budgets and circuit breaking cover an ejected instance's in-flight requests on a healthy peer. This is why client-side wins the requirement: the caller reacts to its own observed failures instantly.",
              "**Tradeoff:** client-side/mesh pushes complexity into every caller and depends on fast registry propagation: accepted for the cost and latency wins at this scale.",
              "Common wrong turn: a single central LB tier for all east-west traffic (extra hop, scaling choke point, blind to AZ locality so it burns cross-AZ cost), or a single global registry whose propagation lag makes 'invisible within seconds' impossible across regions.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l4-m2",
      title: "Global Traffic & Gateway",
      description:
        "Route global users to the nearest healthy region and fail a region out in under a minute, design gateways and BFFs that keep services thin, and manage TLS termination plus long-lived connections at scale.",
      lessons: [
        {
          id: "sd-l4-global-gslb",
          title: "Global & DNS-Level Load Balancing (GSLB, Anycast)",
          summary:
            "GeoDNS steers coarsely but is TTL-bound; anycast plus BGP withdrawal gives seconds-scale failover; active-active regions need headroom to absorb a lost region.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["gslb", "anycast", "multi-region"],
          teach: {
            markdown: globalGslbTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-global-gslb-apply",
            prompt:
              "Design how a global user is routed to the nearest healthy region and how you fail an entire region out in under a minute.",
            thinkAbout: [
              "How do GeoDNS and anycast differ for steering?",
              "Why does client DNS caching limit failover speed?",
              "Active-active vs active-passive: how do you drain a region?",
            ],
            modelAnswerOutline: [
              "Assumptions: an API and web product served from three active-active regions (us-east, eu-west, ap-south), users worldwide, and an SLO that a full regional outage is invisible within ~60 seconds.",
              "**Steering, two layers.** At the edge, an anycast IP fronting a CDN/edge network: the same IP announced by BGP from every PoP, so each user's packets land at the topologically nearest PoP with no client-side decision. The edge terminates TLS close to the user and holds warm pooled connections back to origin regions. Behind that, latency-based GSLB (Route 53 latency records or the edge's own origin selection) maps each PoP to the lowest-RTT healthy origin region, with health checks removing a failed region, weighted records for canarying, and geo rules for data residency.",
              "**Failing a region out in under a minute:** DNS alone will not reliably hit 60 seconds because resolvers cache past the TTL, so it is not the primary lever. The fast lever is at the anycast/edge layer: withdraw the failing region from the edge's origin pool (or withdraw its BGP announcement if the region is a PoP). Reconvergence is seconds, and because the edge owns the origin connections, no end user re-resolves DNS. Lower the region's DNS weight to zero as a slower backstop.",
              "**Headroom:** because the regions are active-active, failover is redistributing the dead region's share onto the survivors, so each region runs with roughly N/(N-1) headroom (about 50% spare at three regions) to absorb it without tipping over.",
              "**Draining cleanly:** stop new traffic first (weight to zero / announcement withdrawn), let in-flight requests finish within a grace window, then decommission. Keep connections stable during backend changes with Maglev-style consistent hashing so scaling or partial failure remaps only a small fraction of flows.",
              "Common wrong turn: assuming DNS failover is instant. A 30-second TTL flip leaves a long tail of clients hammering the dead region because resolvers and browsers cache (and some ignore short TTLs); the real sub-minute story comes from anycast/BGP or edge-level origin removal.",
            ],
          },
          practice: {
            id: "sd-l4-global-gslb-practice",
            prompt:
              "Design global traffic steering and 60-second regional failover for a payments API like Stripe running active-active in five regions at 200K requests/sec, where a region can go unhealthy partially (elevated p99 and error rate, not a clean crash) and some tenants are contractually pinned to an EU region for data residency.",
            thinkAbout: [
              "How do you detect and respond to a gray failure that never trips a binary health check?",
              "What must routing never do with EU-pinned tenants, even during failover?",
              "What keeps retried payment requests from double-charging across regions?",
            ],
            modelAnswerOutline: [
              "**Topology:** five active-active regions behind an anycast edge fleet, TLS terminated at the nearest PoP, per-region origin pools selected by health-and-latency-aware routing. At 200K rps, each region runs near 60% utilization so any one region's load spills onto the other four without collapse.",
              "**Partial failure is the interesting case:** a clean crash trips a health check, but 'elevated p99 and 2% errors' does not. Health checks must be outlier-detection style, driven by real request success rate and latency (Envoy-style ejection), not a TCP ping. When a region crosses an error/latency threshold, the edge sheds a growing fraction of its traffic to healthy regions rather than an all-or-nothing flip, so a gray failure degrades gracefully. Full ejection (withdraw from the origin pool) happens in seconds and never waits on a DNS TTL: how the 60-second SLO is met.",
              "**Data residency changes the routing rules:** EU-pinned tenants must never be steered outside the EU. Encode residency as a routing policy keyed on the API key or token, so those requests only ever select among EU regions. If the single EU region is unhealthy, a second EU region is required for failover, because spilling EU-pinned traffic to us-east violates the contract. The common trap: latency-based routing that ignores residency happily sends an EU tenant to the nearest non-EU region during failover.",
              "**Idempotency ties it together:** payment retries during a failover must not double-charge, so the API is idempotency-key based and writes go to a region-aware replicated store, letting a retried request land in a different region and still be deduplicated.",
              "**Connections:** consistent hashing keeps shifting load from reshuffling every in-flight flow.",
            ],
          },
        },
      ],
    },
  ],
}
