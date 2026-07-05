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
      ],
    },
  ],
}
