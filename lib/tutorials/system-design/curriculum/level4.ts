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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your team keeps sessions in each node's memory and proposes sticky sessions: the balancer pins every user to the node that holds their session. That node dies mid-afternoon. What happens to its users?",
  "options": [
    {
      "label": "The balancer reroutes them and they continue seamlessly",
      "feedback": "Tempting, because rerouting is exactly what a balancer does for stateless nodes. But their sessions lived only in the dead node's memory, so the nodes they land on have never heard of them."
    },
    {
      "label": "They are all logged out, and any state that node held is gone",
      "correct": true,
      "feedback": "Right. Stickiness hides the state problem instead of fixing it: the balancer can no longer spread load freely, and a single node death still wipes every session it held. The real fix is externalizing the state."
    },
    {
      "label": "Nothing, sessions replicate between nodes automatically",
      "feedback": "Tempting if you have seen session-replication features, but nothing replicates by default, and full replication reintroduces the coordination cost that statelessness exists to avoid."
    }
  ]
}
\`\`\`

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

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Scale out: interchangeable nodes with their state pushed outside",
  "nodes": [
    {
      "id": "clients",
      "label": "Clients",
      "kind": "client"
    },
    {
      "id": "lb",
      "label": "Load balancer (any node, any request)",
      "kind": "lb"
    },
    {
      "id": "n1",
      "label": "App node n1 (stateless)",
      "kind": "service"
    },
    {
      "id": "n2",
      "label": "App node n2 ... n500 (stateless)",
      "kind": "service"
    },
    {
      "id": "sessions",
      "label": "Session store: Redis, or a signed JWT the client carries",
      "kind": "cache"
    },
    {
      "id": "objects",
      "label": "Object storage for uploads (S3 or GCS), never local disk",
      "kind": "db"
    },
    {
      "id": "database",
      "label": "Database: durable data, scaled up then sharded",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "clients",
      "to": "lb",
      "kind": "sync"
    },
    {
      "from": "lb",
      "to": "n1",
      "kind": "sync",
      "label": "1/N of traffic"
    },
    {
      "from": "lb",
      "to": "n2",
      "kind": "sync"
    },
    {
      "from": "n1",
      "to": "sessions",
      "kind": "sync",
      "label": "read or validate"
    },
    {
      "from": "n2",
      "to": "sessions",
      "kind": "sync"
    },
    {
      "from": "n1",
      "to": "objects",
      "kind": "sync"
    },
    {
      "from": "n2",
      "to": "objects",
      "kind": "sync"
    },
    {
      "from": "n1",
      "to": "database",
      "kind": "sync"
    },
    {
      "from": "n2",
      "to": "database",
      "kind": "sync"
    }
  ],
  "groups": [
    {
      "id": "fleet",
      "label": "Stateless fleet: any node serves any request",
      "nodes": [
        "n1",
        "n2"
      ]
    },
    {
      "id": "state",
      "label": "Externalized state, shared by every node",
      "nodes": [
        "sessions",
        "objects",
        "database"
      ]
    }
  ],
  "stages": [
    {
      "adds": [
        "clients",
        "lb",
        "n1",
        "n2"
      ],
      "note": "Scale out puts commodity nodes behind one balancer, which is what buys linear capacity and turns a node death into the loss of 1/N rather than everything. It only works if the balancer is free to send any request to any node."
    },
    {
      "adds": [
        "sessions"
      ],
      "note": "A session held in one node's process memory forces the balancer to pin that user to that node, and kills the session outright when the node dies. Moving it to Redis, or making it a signed JWT the client carries, is what buys back the freedom to spread requests."
    },
    {
      "adds": [
        "objects"
      ],
      "note": "An upload written to local disk is readable only from the node that happened to receive it, so every later request for that file has to land on the same node. User assets go to object storage for the same reason sessions do."
    },
    {
      "adds": [
        "database"
      ],
      "note": "Durable data stays in the database, and this is the tier the lesson does NOT scale out: write ordering and a co-located working set are hard to split, so buy the bigger box and shard only when throughput forces it."
    }
  ],
  "caption": "Scale up is the other option and needs no code change, but it has a hard top SKU, a price curve that runs super-linear past commodity sizes, and one failure domain. Once state is external the nodes are cattle: booted from an image and replaced rather than nursed."
}
\`\`\`

Recap: scale-out is the web-tier default because it beats the cost, ceiling, and
single-failure-domain limits of scale-up, but it only works once nodes are stateless (session and
file state externalized to Redis/JWT/S3), turning servers into interchangeable cattle; scale-up still
wins for hard-to-shard stateful tiers until you are forced to shard.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each tier the way this lesson would scale it.",
  "buckets": [
    "Scale out: stateless fleet behind a balancer",
    "Scale up first, shard only when forced"
  ],
  "items": [
    {
      "label": "API servers with sessions in Redis and uploads in S3",
      "bucket": "Scale out: stateless fleet behind a balancer",
      "feedback": "Externalized state makes these cattle: any node serves any request, so capacity grows linearly with node count."
    },
    {
      "label": "A single-writer relational database",
      "bucket": "Scale up first, shard only when forced",
      "feedback": "Write ordering and the working set are hard to split across boxes, so buy the bigger box and defer sharding until write throughput truly forces it."
    },
    {
      "label": "Image-resize workers reading from object storage",
      "bucket": "Scale out: stateless fleet behind a balancer",
      "feedback": "No local state at all: the textbook scale-out tier."
    },
    {
      "label": "An in-memory analytics engine whose working set must be co-located",
      "bucket": "Scale up first, shard only when forced",
      "feedback": "Co-location requirements are exactly what makes scale-out painful; this is the honest scale-up case the interview nuance names."
    }
  ],
  "reveal": "The split to carry into your design write: scale out the stateless web and app tier (sessions to Redis or a JWT, files to S3, nodes as disposable cattle) and scale up, then shard, the stateful data tier. Say which side of that split each box in your diagram sits on."
}
\`\`\`
`.trim()

const lbL4L7Teach = `
## Stacking L4 and L7, the production shape

Level 1's [introductory pass on balancer layers](/learn/system-design/foundations/sd-l1-load-balancing)
owns the comparison itself: what each layer can see, and which one a given service needs. This lesson
takes that as settled and builds the topology production actually runs, a thin L4 tier stacked in
front of an L7 proxy fleet, plus the high availability that balancer tier needs so it is not the
single point of failure everything else routes through. A one-paragraph refresher first, because the
layer choice still decides your routing features and throughput.

**L4 (transport-layer)** balancers work at TCP/UDP, see only IP and port, and forward packets without
parsing the payload, so they are fast, protocol-agnostic (raw TCP, database connections, WebSockets),
and **content-blind**: no path routing, no TLS termination, no rate limiting (AWS **NLB**, Google
**Maglev**, IPVS). **L7 (application-layer)** balancers terminate the connection, parse HTTP/gRPC, and
route on content (path, host header, cookie, method), which also unlocks **TLS termination**, **rate
limiting**, request/response transformation, and rich per-route **observability**, at a higher
per-request CPU and latency cost (AWS **ALB**, **Nginx**, **HAProxy**, **Envoy**).

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You are picking a balancer feature by feature. Which layer does each one need?",
  "buckets": [
    "L4 can do it",
    "Needs L7"
  ],
  "items": [
    {
      "label": "Spreading raw TCP database connections",
      "bucket": "L4 can do it",
      "feedback": "L4 forwards packets by IP and port without parsing them, so any protocol works."
    },
    {
      "label": "Routing '/api' and '/static' to different pools",
      "bucket": "Needs L7",
      "feedback": "The path lives inside the HTTP payload, which an L4 balancer never parses. This is the classic interview trap."
    },
    {
      "label": "Terminating TLS",
      "bucket": "Needs L7",
      "feedback": "Termination means reading and re-encrypting the application byte stream, so it belongs to the layer that parses requests."
    },
    {
      "label": "Extreme-throughput WebSocket pass-through with minimal features",
      "bucket": "L4 can do it",
      "feedback": "Content-blind forwarding is cheap, which is exactly why the fast path is L4."
    },
    {
      "label": "Header-based canary routing and per-route rate limits",
      "bucket": "Needs L7",
      "feedback": "Headers, cookies, and per-route policy all require parsing the request first."
    }
  ]
}
\`\`\`

### Stack them

Real architectures stack the layers: a thin **L4 layer at the edge** absorbs the raw connection
volume and spreads it across a fleet of **L7 proxies** behind it, which do the smart routing. The
canonical shapes are **NLB in front of ALB** on AWS, or **Maglev in front of Envoy** at Google. The
L4 layer gives you cheap, protocol-agnostic scale and DDoS surface; the L7 layer gives you features.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Stacked L4 edge in front of an L7 fleet",
  "nodes": [
    {
      "id": "client",
      "label": "client",
      "kind": "client"
    },
    {
      "id": "l4_edge",
      "label": "L4 edge (NLB/Maglev)",
      "kind": "lb"
    },
    {
      "id": "l7_1",
      "label": "L7 proxy (Envoy/ALB)",
      "kind": "lb"
    },
    {
      "id": "l7_2",
      "label": "L7 proxy (Envoy/ALB)",
      "kind": "lb"
    },
    {
      "id": "pool_api",
      "label": "app pool A (/api)",
      "kind": "service"
    },
    {
      "id": "pool_static",
      "label": "app pool B (/static)",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "client",
      "to": "l4_edge",
      "kind": "sync",
      "label": "raw TCP, high throughput"
    },
    {
      "from": "l4_edge",
      "to": "l7_1",
      "kind": "sync"
    },
    {
      "from": "l4_edge",
      "to": "l7_2",
      "kind": "sync"
    },
    {
      "from": "l7_1",
      "to": "pool_api",
      "kind": "sync",
      "label": "path /api"
    },
    {
      "from": "l7_1",
      "to": "pool_static",
      "kind": "sync",
      "label": "path /static"
    },
    {
      "from": "l7_2",
      "to": "pool_api",
      "kind": "sync"
    },
    {
      "from": "l7_2",
      "to": "pool_static",
      "kind": "sync"
    }
  ],
  "stages": [
    {
      "adds": [
        "client",
        "l4_edge"
      ],
      "note": "The L4 edge sees only IP and port and forwards packets without parsing the payload, so it absorbs the raw connection volume: fast, protocol-agnostic, and content-blind."
    },
    {
      "adds": [
        "l7_1",
        "l7_2"
      ],
      "note": "The thin L4 layer spreads connections across a fleet of L7 proxies, which terminate the connection, parse HTTP/gRPC, and add TLS termination and rate limiting at a higher per-request CPU cost."
    },
    {
      "adds": [
        "pool_api",
        "pool_static"
      ],
      "note": "Only the L7 layer can route on content: any proxy sends /api and /static traffic to different app pools, which the content-blind L4 tier cannot do."
    }
  ],
  "caption": "The canonical production stack: NLB in front of ALB on AWS, or Maglev in front of Envoy at Google. The LB tier itself runs active-active with a floating IP or anycast so it is never a SPOF."
}
\`\`\`

### The LB tier itself must be HA

Whichever layer you run, the LB cannot be a SPOF: if all traffic funnels through one box and it dies,
you are down regardless of fleet health. Make the tier HA with **active-active** nodes plus a failover
mechanism, either a **floating/virtual IP** (keepalived/VRRP) or **anycast** so many nodes share one
IP and BGP routes around a dead one. Cloud LBs bake this in.

**Interview nuance:** a common trap is choosing L4 for an HTTP API and then discovering you need
path-based routing or TLS termination, which L4 cannot do. If the question mentions per-path routing,
header-based canaries, or TLS termination, you need L7 somewhere. Conversely, if it is raw non-HTTP
traffic or extreme throughput with minimal features, L4 alone is right.

Recap: L4 balancers are fast, protocol-agnostic, and content-blind; L7 balancers parse requests to
route by path/header, terminate TLS, and rate-limit at a latency cost; production stacks L4 at the
edge in front of an L7 fleet, and the LB tier itself must be made HA (active-active, floating IP, or
anycast) so it is never a SPOF.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An interview system takes huge volumes of raw non-HTTP traffic and also serves an HTTP API that needs per-path routing and TLS termination. What shape do you draw?",
  "options": [
    {
      "label": "One L7 fleet handling everything",
      "feedback": "Tempting because L7 has every feature, but you would pay the per-request parsing cost on raw traffic that needs none of it, and an HTTP-parsing proxy is the wrong tool for arbitrary TCP streams."
    },
    {
      "label": "One L4 tier handling everything",
      "feedback": "Fast and protocol-agnostic, but content-blind: the per-path routing and TLS termination the API needs are impossible at L4."
    },
    {
      "label": "A thin L4 edge absorbing connections, feeding an L7 proxy fleet where content routing is needed",
      "correct": true,
      "feedback": "Right, the production shape: NLB in front of ALB, or Maglev in front of Envoy. L4 gives cheap protocol-agnostic scale at the edge; L7 supplies features where the traffic actually needs them."
    }
  ],
  "reveal": "In your design write, draw the stack explicitly and add one sentence on HA: the balancer tier itself runs active-active with a floating IP or anycast, because a lone balancer is a single point of failure no matter how healthy the fleet behind it is."
}
\`\`\`
`.trim()

const lbAlgorithmsTeach = `
## The rule for who gets the next request

Level 1's [introductory treatment of load balancing](/learn/system-design/foundations/sd-l1-load-balancing)
covers the layer choice and health checks; this lesson goes deep on the piece it left open, the
algorithm that picks which backend serves the next request. Once a load balancer has a pool of healthy
backends, it needs a rule for **which one gets the next request**. The rule matters because the wrong
one creates hotspots: some nodes melt while others sit idle.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A fleet serves mostly 5ms requests, but a few take 2 seconds. The balancer is plain round robin, and one node has caught several of the 2-second requests. What happens to that node?",
  "options": [
    {
      "label": "Round robin skips it until its in-flight work clears",
      "feedback": "Tempting, but that is least-connections behavior. Round robin keeps no view of how busy a node is; it only counts turns."
    },
    {
      "label": "It keeps receiving its full share of new requests and buries deeper",
      "correct": true,
      "feedback": "Right. Round robin is blind to in-flight load, so the buried node gets its turn anyway. Routing around it is exactly what least-connections adds."
    },
    {
      "label": "The slow requests average out, so no node stays hot",
      "feedback": "Averaging out is what happens when durations are uniform. With high-variance durations, the slow requests concentrate on whoever caught them, and rotation does nothing to relieve it."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Same mechanism, different justification. Sort each pinning decision.",
  "buckets": [
    "Sound engineering",
    "Design smell"
  ],
  "items": [
    {
      "label": "Consistent hashing so each user re-hits the node holding their warm cache",
      "bucket": "Sound engineering",
      "feedback": "Affinity here buys a real cache-hit win, and the state being protected is a rebuildable cache, not the only copy."
    },
    {
      "label": "Sticky sessions because sessions live in process memory and moving them is on the backlog",
      "bucket": "Design smell",
      "feedback": "This is affinity compensating for state that should be externalized: load skews toward pinned nodes and a node death logs out everyone it held."
    },
    {
      "label": "Hashing on meeting ID so one room's traffic clusters on one node",
      "bucket": "Sound engineering",
      "feedback": "Deliberate sharding of hot state, with the hash keeping reshuffles to about 1/N of keys when the pool changes."
    },
    {
      "label": "Pinning by client IP so per-user counters can stay in local memory",
      "bucket": "Design smell",
      "feedback": "Those local counters are the only copy, so a node death silently loses them; the pin exists to avoid externalizing state."
    }
  ]
}
\`\`\`

**Interview nuance:** the crisp story: "round robin for homogeneous stateless nodes; least-connections
when request durations vary; power-of-two-choices when the pool is large; consistent hashing when I
need stickiness or sharded state, accepting that stickiness costs even load and loses state on node
death." If you reach for sticky sessions to compensate for not externalizing state, that is a design
smell; if you reach for consistent hashing to keep a cache warm, that is sound engineering. Same
mechanism, different justification.

\`\`\`cswidget
{
  "type": "hash-ring",
  "title": "Why a consistent-hash balancer keeps caches warm",
  "predictPrompt": {
    "question": "A hash-based balancer pins each session to a backend with hash mod N. One backend is drained for a deploy. How many sessions land on a cold node?",
    "options": [
      "Only the drained node's share",
      "Most of them",
      "None, sessions follow their backend"
    ]
  },
  "workedExample": "The 36 keys here are sessions pinned by hash. In mod-N mode, remove a backend and most sessions reshuffle onto cold nodes: a fleet-wide warm-state loss. On the ring, only the drained backend's sessions move, straight to the clockwise neighbor. Try both, then re-read the crisp story above.",
  "initialNodes": 4,
  "maxNodes": 6,
  "keys": 36,
  "initialMode": "modulo",
  "vnodeFactor": 16
}
\`\`\`

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Algorithm",
    "What it does when request durations vary",
    "Verdict"
  ],
  "rows": [
    [
      "Round robin",
      "The node already buried in slow work still gets its turn",
      "Hotspot: requests pile up behind the slowest node"
    ],
    [
      "Least connections",
      "Skips the buried node and picks the one with the fewest in flight",
      "Good, but it needs a live connection count for every backend"
    ],
    [
      "Power of two choices",
      "Picks 2 backends at random and sends to the lighter of the two",
      "Good, and O(1) with no herd and no global state"
    ]
  ],
  "highlightCols": [
    "Verdict"
  ],
  "caption": "Round robin is fine while nodes are identical and requests cost the same. The moment durations vary, the difference in this table is the whole lesson."
}
\`\`\`

Recap: round robin for identical stateless nodes, least-connections for variable durations,
power-of-two-choices as the O(1) no-herd default for large pools, and consistent/rendezvous hashing
for sticky routing or sharded state; session affinity keeps a user on a cache-warm node but costs
even load and loses that node's state when it dies, so use it deliberately.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Pick the balancing rule this lesson would reach for in each situation.",
  "buckets": [
    "Round robin",
    "Least-connections or P2C",
    "Consistent hashing"
  ],
  "items": [
    {
      "label": "Identical nodes where every request costs about the same",
      "bucket": "Round robin",
      "feedback": "Homogeneous work is the one case where blind rotation is genuinely perfect."
    },
    {
      "label": "Request durations range from 5ms to 2 seconds",
      "bucket": "Least-connections or P2C",
      "feedback": "In-flight counts route around the buried node automatically, which rotation cannot do."
    },
    {
      "label": "A very large pool where an O(N) scan and herding both hurt",
      "bucket": "Least-connections or P2C",
      "feedback": "Power-of-two-choices: pick two at random, send to the lighter. O(1), no global state, and it provably avoids herding."
    },
    {
      "label": "Each session must land on the node holding its warm cache",
      "bucket": "Consistent hashing",
      "feedback": "Sticky routing without a lookup table, and only about 1/N of keys move when the pool changes."
    },
    {
      "label": "Sharded in-memory state keyed by user ID",
      "bucket": "Consistent hashing",
      "feedback": "Stable key-to-node mapping is the whole point of the ring."
    }
  ],
  "reveal": "For the design write: name the algorithm and justify it from workload shape (duration variance, pool size, need for stickiness). If you choose affinity, say out loud what state it protects and what is lost when the pinned node dies."
}
\`\`\`
`.trim()

const healthChecksTeach = `
## Send traffic only to nodes that can serve it

Level 1's [introductory treatment of load balancing](/learn/system-design/foundations/sd-l1-load-balancing)
named health checks as the mechanism that keeps a pool healthy. This lesson is the deep treatment, and
its center of gravity is a distinction that introduction leaves alone: **liveness** and **readiness**
are two different questions, and answering both with one endpoint is what crash-loops a node that is
merely warming up. A load balancer only helps if it sends traffic to nodes that can actually serve it
and stops sending to nodes that cannot. That is the job of **health checks**, and the subtlety is
doing it without evicting healthy nodes or dropping in-flight work during a deploy.

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A new node needs 90 seconds to warm its cache. The platform uses one '/health' endpoint for both liveness and readiness, and it returns failure until the cache is warm. What happens on startup?",
  "options": [
    {
      "label": "It receives no traffic until warm, then joins the pool",
      "feedback": "Tempting, because that is exactly what a readiness failure alone would do. But the same failing endpoint is also the liveness check, and liveness failures trigger restarts."
    },
    {
      "label": "It crash-loops before it ever finishes warming",
      "correct": true,
      "feedback": "Right. One endpoint is answering two different questions, so 'not warm yet' is read as 'dead': the orchestrator kills and restarts the node, and the restart timer beats the 90 second warmup timer every time. Keeping liveness and readiness as separate questions is the fix."
    },
    {
      "label": "The balancer slow-starts it on a reduced traffic share",
      "feedback": "Slow-start ramps traffic after a node is admitted to the pool; a node failing its checks never gets admitted at all."
    }
  ]
}
\`\`\`

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

**A long-lived stream needs a signal, not a deadline.** A drain deadline works for a request that was
always going to finish on its own. A gRPC stream, a WebSocket, or an HTTP/2 connection carrying a
subscription has no natural end: it is still open when the deadline expires, and the deadline is the
thing that severs it. HTTP/2 has a frame for exactly this. The server sends **GOAWAY**, which means
"finish the streams already open on this connection, start no new ones here". Draining one node then
runs like this:

1. Mark the node not-ready. The LB stops handing it new connections. Every connection already
   established is untouched, because the LB is no longer in that path.
2. The server sends \`GOAWAY(last_stream_id = 4001)\` on each open connection. Streams numbered up to
   4001 keep running; the client must not open 4003 on this connection.
3. The client reacts at once: it dials a fresh connection, which goes back through the LB and lands
   on a healthy node, and it sends all NEW work there while its existing streams finish on the old
   connection.
4. The drain deadline still backstops the node, but the only thing left for it to sever is a stream
   that was already open at step 2, and the client has known since step 2 that this connection is
   going away.

Servers usually send GOAWAY twice: a first one with \`last_stream_id\` set to the maximum, which
commits to nothing and only warns, then the real one after a grace period, so a client that was
mid-request is never surprised. WebSockets have no GOAWAY frame, so the equivalent is an
application-level control message ("reconnect now") or a close code the client treats that way.
Either way, jitter the reconnects: 50 nodes draining through a rolling deploy otherwise turn every
client into one synchronized reconnect storm.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A node's '/healthz' returns 200 whenever the web process is running. Its database connection pool is dead. What does the active health check conclude?",
  "options": [
    {
      "label": "The node is healthy, so it keeps full traffic and fails every real request",
      "correct": true,
      "feedback": "Right. The probe asks 'is the process up' when the question that matters is 'can this node actually serve'. This is the shallow-check trap."
    },
    {
      "label": "The probe fails after N attempts and the node is ejected",
      "feedback": "Tempting, but the probe is succeeding: the endpoint honestly reports that the process is up. Nothing in a shallow check ever touches the database."
    },
    {
      "label": "Nothing changes, because the balancer judges nodes on real traffic instead",
      "feedback": "That is passive outlier detection, a different mechanism. Production pairs it with active probes precisely because a shallow active probe misses this failure."
    }
  ]
}
\`\`\`

**Interview nuance: deep vs shallow health checks.** A shallow check returns 200 as long as the web
server is up, even if the database or a critical downstream is unreachable, so the node keeps
receiving traffic and failing every real request. A **deep** check verifies the critical
dependencies. But deep checks have their own trap: if every node's health check hits a shared
dependency and that dependency blips, **every node marks itself unhealthy at once and the whole fleet
drops out**, turning a minor blip into a total outage. The mature answer: deep enough to catch a
truly broken node, with hysteresis, and not so coupled that a shared-dependency blip fails the entire
fleet simultaneously.

### Cap how much of the pool ejection is allowed to remove

Passive outlier ejection decides one host at a time, but a shared dependency fails all of them at
once, so "eject the bad host" and "empty the fleet" become the same instruction the moment every host
is bad together. Envoy's outlier detector therefore takes a ceiling as well as a trigger, and an
answer that names the trigger without the ceiling has described half the mechanism:

- \`consecutive_5xx\` (default 5): how many failures on real traffic eject a host.
- \`base_ejection_time\` (default 30s): how long an ejection lasts, multiplied by the number of times
  that host has been ejected before.
- \`max_ejection_percent\` (default 10): the ceiling on what fraction of the pool may be ejected at
  once. Past it the detector simply refuses to eject, however bad the next host looks.

Run a 500-pod fleet through a 10-second blip in a shared auth service, both ways:

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Moment",
    "No ceiling (max_ejection_percent 100)",
    "max_ejection_percent 20"
  ],
  "rows": [
    [
      "t=0, auth blips",
      "All 500 pods start failing real requests with 5xx",
      "Identical: the pods are equally broken either way"
    ],
    [
      "t=2s, consecutive_5xx crossed",
      "Every host qualifies, so every host is ejected",
      "The detector ejects 100 hosts, then stops"
    ],
    [
      "t=3s, routing a request",
      "0 healthy hosts left, so every request fails, including the ones auth was never on the path for",
      "400 hosts still routable, so anything that does not touch auth keeps succeeding"
    ],
    [
      "t=10s, auth recovers",
      "Hosts stay out for base_ejection_time, so a 10 second blip costs 30+ seconds of hard down",
      "Nothing to recover from: the pool never emptied"
    ]
  ],
  "highlightCols": [
    "max_ejection_percent 20"
  ],
  "caption": "The ceiling does not make the ejected hosts healthy. It buys the only thing that matters during a correlated failure, which is a pool that still exists when the dependency comes back."
}
\`\`\`

Envoy backstops this a second time in the load balancer itself: if fewer than
\`healthy_panic_threshold\` of the hosts (default 50%) are healthy it enters **panic mode** and
balances across ALL hosts, healthy or not, on the reasoning that spraying traffic at a mostly-broken
fleet still beats routing into an empty pool.

Note where this ceiling lives. It bounds **passive ejection in the mesh**, and Kubernetes readiness
has no equivalent: if all 500 pods fail their readiness probe the Endpoints list legitimately empties
and the Service has nowhere to send anything. That asymmetry is why the two mechanisms get different
jobs. Keep readiness a **local** question that a shared dependency cannot answer on your behalf, and
let capped passive ejection be what reacts to a downstream that really is failing requests.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "max-ejection-percent-ceiling",
  "prompt": "500 pods sit behind Envoy sidecars with outlier detection on, and a shared auth service blips for 10 seconds so every pod starts returning 5xx. max_ejection_percent is set to 20. What does the mesh do?",
  "options": [
    {
      "label": "Every host crosses the failure threshold, so the pool ejects down to zero",
      "feedback": "That is the uncapped run, and it is the exact outcome the ceiling exists to prevent. Setting a cap changes nothing about which hosts qualify for ejection; it changes how many of those qualifying hosts the detector will actually act on."
    },
    {
      "label": "It ejects 100 of the 500 hosts and then refuses to eject another",
      "correct": true,
      "feedback": "Right. 20 percent of 500 is 100, so once 100 hosts are out the detector will not take the 101st however bad it looks. The surviving 400 are still broken for auth-dependent requests, but everything that does not touch auth keeps serving and the pool is intact when auth returns."
    },
    {
      "label": "Nothing: a correlated failure is not an outlier",
      "feedback": "Outlier detection has no notion of correlation. It judges each host against the failure threshold on its own, which is precisely why it needs a ceiling: 500 individually-defensible decisions add up to one catastrophic one."
    }
  ]
}
\`\`\`

\`\`\`csdiagram
{
  "type": "pipeline",
  "title": "A node joining and leaving the pool",
  "stages": [
    {
      "label": "Start",
      "note": "process up, cache cold, pools empty"
    },
    {
      "label": "READINESS gates traffic",
      "note": "alive but not ready, so no traffic yet"
    },
    {
      "label": "Slow start ramps the share",
      "note": "traffic climbs over seconds"
    },
    {
      "label": "Serving a full 1/N share",
      "note": "warm cache, warm connection pools"
    },
    {
      "label": "Mark NOT-READY",
      "note": "deploy or scale-in begins here"
    },
    {
      "label": "LB stops NEW traffic",
      "note": "in-flight keeps going, streams get GOAWAY"
    },
    {
      "label": "In-flight finishes",
      "note": "or the drain deadline expires"
    },
    {
      "label": "Terminate",
      "note": "process exits, nothing dropped"
    }
  ],
  "highlight": [
    "READINESS gates traffic",
    "Mark NOT-READY"
  ],
  "caption": "A liveness failure is a different path entirely: it restarts or replaces the node rather than draining it, which is why answering both questions with one endpoint crash-loops a node that is merely still warming up."
}
\`\`\`

Recap: use active probes plus passive outlier ejection under a \`max_ejection_percent\` ceiling; keep
liveness (restart) separate from readiness (pull from pool, do not kill); drain connections, signal
long-lived streams to reconnect rather than waiting out a deadline, and slow-start new nodes so a
rolling deploy drops nothing; and make checks deep enough to catch a broken downstream without
letting one shared-dependency blip fail the whole fleet at once.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "After the shallow-check incident, every node's check is upgraded to deeply verify the shared database. The database then blips for ten seconds. What does the load balancer see?",
  "options": [
    {
      "label": "A few unlucky nodes fail their checks",
      "feedback": "Tempting, because failures usually look random. But every node shares this dependency, so their checks fail together, not independently."
    },
    {
      "label": "Every node goes unhealthy at once and the pool empties",
      "correct": true,
      "feedback": "Right. Correlated checks turn a shared-dependency blip into a fleet-wide eviction, so ten seconds of database trouble becomes a total outage with no healthy node left to route to. A max_ejection_percent ceiling does not save you here either: it bounds passive ejection in the mesh, not a readiness probe that all 500 pods are failing honestly. The mature design is deep enough to catch a truly broken node, with hysteresis, and never coupled so tightly that one blip fails everyone."
    },
    {
      "label": "Nothing, health checks hold their last result through short blips",
      "feedback": "Checks run continuously on an interval with no such grace by default; hysteresis is something you must design in deliberately."
    }
  ],
  "reveal": "Bringing the lesson together for your design write: active probes plus passive ejection under a max_ejection_percent ceiling, liveness (restart) kept separate from readiness (pull from pool, do not kill), draining plus a GOAWAY-style reconnect signal for long-lived streams so a rolling deploy drops nothing, and a stated answer for how deep your check goes without letting one shared blip empty the pool."
}
\`\`\`
`.trim()

const serviceDiscoveryTeach = `
## Callers must learn addresses that change every minute

In a fleet that autoscales and redeploys constantly, a service's instances come and go every minute:
IPs and ports change, instances are added under load and terminated on scale-in. So a caller cannot
hardcode addresses, and it cannot rely on long-TTL DNS, because the moment an instance is terminated
a stale address keeps receiving traffic and callers get connection errors. **Service discovery** lets
a caller learn the **current set of healthy addresses**, and the second question is **who makes the
balancing decision**: a central load balancer, or each client.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You publish instance IPs in DNS with a 60 second TTL and call it service discovery. An instance is terminated during scale-in. Where does its traffic go for the next minute?",
  "options": [
    {
      "label": "Resolvers notice the connection failures and refetch immediately",
      "feedback": "Tempting, but DNS has no feedback loop from failed connections; resolvers serve their cache until the TTL expires, and some ignore short TTLs entirely."
    },
    {
      "label": "Callers holding the cached record keep dialing the dead address and get connection errors",
      "correct": true,
      "feedback": "Right. The record stays stale in every caller's cache for up to the TTL, and nothing pushes the update. That propagation gap is exactly what a registry with watch or push closes."
    },
    {
      "label": "The terminated instance drains gracefully, so nothing is lost",
      "feedback": "Draining protects in-flight work during a planned shutdown, but it cannot stop new connections from callers whose cached DNS answer still lists the dead address."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "steps",
  "title": "How long a terminated instance keeps taking traffic",
  "frames": [
    {
      "note": "Instance i-7 is terminated during scale-in. Neither mechanism knows yet, so all three callers are still holding an address that now refuses connections.",
      "rows": [
        {
          "label": "Instance i-7",
          "cells": [
            {
              "text": "terminated at t = 0",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "Registry watch",
          "cells": [
            {
              "text": "caller A: still lists i-7",
              "state": "active"
            },
            {
              "text": "caller B: still lists i-7",
              "state": "active"
            },
            {
              "text": "caller C: still lists i-7",
              "state": "active"
            }
          ]
        },
        {
          "label": "DNS, 60s TTL",
          "cells": [
            {
              "text": "caller A: still lists i-7",
              "state": "active"
            },
            {
              "text": "caller B: still lists i-7",
              "state": "active"
            },
            {
              "text": "caller C: still lists i-7",
              "state": "active"
            }
          ]
        }
      ]
    },
    {
      "note": "The instance deregistered on shutdown, and the registry pushed that to every watcher. The DNS record was updated at the same instant, and it changed nothing: no resolver was told, because DNS has no channel to tell them.",
      "predict": {
        "question": "The registry deregisters on shutdown and pushes to watchers. The DNS record is edited in the same second, with a 60 second TTL. Two seconds later, who is still dialing the dead instance?",
        "options": [
          "Neither: both mechanisms have propagated",
          "Only the DNS callers",
          "Only the registry callers",
          "Both, until their next request fails"
        ]
      },
      "rows": [
        {
          "label": "Instance i-7",
          "cells": [
            {
              "text": "gone, t = 2s",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "Registry watch",
          "cells": [
            {
              "text": "caller A: removed",
              "state": "new"
            },
            {
              "text": "caller B: removed",
              "state": "new"
            },
            {
              "text": "caller C: removed",
              "state": "new"
            }
          ]
        },
        {
          "label": "DNS, 60s TTL",
          "cells": [
            {
              "text": "caller A: cache still says i-7",
              "state": "active"
            },
            {
              "text": "caller B: cache still says i-7",
              "state": "active"
            },
            {
              "text": "caller C: cache still says i-7",
              "state": "active"
            }
          ]
        }
      ]
    },
    {
      "note": "At t = 60s the TTL expires, and it expires only for the caller that honors it. A resolver refetches; an OS stub cache and a browser connection cache both keep their own copies on their own schedules.",
      "rows": [
        {
          "label": "Instance i-7",
          "cells": [
            {
              "text": "gone, t = 60s",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "Registry watch",
          "cells": [
            {
              "text": "caller A: healthy",
              "state": "normal"
            },
            {
              "text": "caller B: healthy",
              "state": "normal"
            },
            {
              "text": "caller C: healthy",
              "state": "normal"
            }
          ]
        },
        {
          "label": "DNS, 60s TTL",
          "cells": [
            {
              "text": "caller A: TTL expired, refetched",
              "state": "new"
            },
            {
              "text": "caller B: stub resolver cached",
              "state": "active"
            },
            {
              "text": "caller C: browser cached",
              "state": "active"
            }
          ]
        }
      ]
    },
    {
      "note": "Three minutes in, one caller is still sending requests to hardware that no longer exists. The registry path finished in seconds; the DNS path has a tail nobody controls, which is why the TTL is a bound on well behaved caches rather than on reality.",
      "rows": [
        {
          "label": "Instance i-7",
          "cells": [
            {
              "text": "gone, t = 3 min",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "Registry watch",
          "cells": [
            {
              "text": "caller A: healthy",
              "state": "normal"
            },
            {
              "text": "caller B: healthy",
              "state": "normal"
            },
            {
              "text": "caller C: healthy",
              "state": "normal"
            }
          ]
        },
        {
          "label": "DNS, 60s TTL",
          "cells": [
            {
              "text": "caller A: healthy",
              "state": "normal"
            },
            {
              "text": "caller B: refetched at last",
              "state": "new"
            },
            {
              "text": "caller C: still dialing i-7",
              "state": "dropped"
            }
          ]
        }
      ]
    }
  ],
  "caption": "This is the propagation number the lesson asks you to quote: seconds with a watched registry, minutes with DNS, and no upper bound you can promise once a resolver decides to ignore your TTL."
}
\`\`\`

### Where the balancing decision happens

- **Server-side load balancing:** clients hit one stable VIP or DNS name and a dedicated load
  balancer (ALB/NLB, Envoy, Nginx) picks a backend. Clients stay dumb and simple, and control is
  central. The cost is an extra network hop and a component you must scale and keep HA.
- **Client-side load balancing:** the client fetches the healthy instance list from the registry (or
  a mesh sidecar) and picks a backend itself (gRPC client-side LB, a sidecar Envoy). This removes the
  extra hop and enables smart, locality-aware policies (prefer same-zone, least-request with local
  load view). The cost is complexity pushed into every client and a hard dependency on fast registry
  propagation.

A **service mesh** (Istio with Envoy sidecars, or Linkerd with its own Rust micro-proxy) is the
popular middle ground: client-side benefits (no central-LB hop, locality, per-request balancing,
retries, mTLS) with **central configuration**. The price is real operational complexity (a control
plane and a sidecar per pod).

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each property by where the balancing decision lives.",
  "buckets": [
    "Server-side LB",
    "Client-side LB or mesh"
  ],
  "items": [
    {
      "label": "Clients stay dumb and hit one stable VIP",
      "bucket": "Server-side LB",
      "feedback": "Central control with simple callers is the whole pitch of a dedicated balancer."
    },
    {
      "label": "Every request pays an extra network hop",
      "bucket": "Server-side LB",
      "feedback": "The balancer sits in the path, and it is also a component you must scale and keep HA."
    },
    {
      "label": "Prefer-same-zone and least-request decisions made with a local load view",
      "bucket": "Client-side LB or mesh",
      "feedback": "Smart locality-aware policy is what holding the instance list yourself unlocks."
    },
    {
      "label": "Balancing complexity is pushed into every caller",
      "bucket": "Client-side LB or mesh",
      "feedback": "The cost side of client-side LB, which a mesh softens by moving it into a sidecar under central configuration."
    },
    {
      "label": "One central choke point that can become the bottleneck",
      "bucket": "Server-side LB",
      "feedback": "The scaling and HA burden concentrates in the balancer tier."
    },
    {
      "label": "A hard dependency on fast registry propagation",
      "bucket": "Client-side LB or mesh",
      "feedback": "Each caller's own list must stay fresh, or it keeps dialing terminated instances."
    }
  ]
}
\`\`\`

**Interview nuance:** the discriminator is where you want complexity to live. Central LB = simple
clients, extra hop, one scaling choke point. Client-side/mesh = no hop and smart routing, but
complexity and propagation risk in every caller. A strong concrete answer: Kubernetes with a mesh for
a polyglot fleet, or gRPC client-side LB backed by etcd for a gRPC-heavy one, with short health-check
intervals so bad instances leave rotation within seconds.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "One registry, two places the balancing decision can live",
  "reveal": "all",
  "nodes": [
    {
      "id": "registry",
      "label": "Service registry (Consul, etcd, Eureka, or k8s Endpoints)",
      "kind": "db"
    },
    {
      "id": "client_srv",
      "label": "Client (dumb: one stable VIP or name)",
      "kind": "client"
    },
    {
      "id": "client_cli",
      "label": "Client holding the instance list",
      "kind": "client"
    },
    {
      "id": "vip",
      "label": "VIP or LB (ALB, NLB, Envoy, Nginx)",
      "kind": "lb"
    },
    {
      "id": "backend_srv",
      "label": "Backend instances behind the VIP",
      "kind": "service"
    },
    {
      "id": "backend_cli",
      "label": "Backend instances dialed directly",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "registry",
      "to": "vip",
      "kind": "sync",
      "label": "readiness keeps the set in sync"
    },
    {
      "from": "client_srv",
      "to": "vip",
      "kind": "sync",
      "label": "one stable name"
    },
    {
      "from": "vip",
      "to": "backend_srv",
      "kind": "sync",
      "label": "1 extra hop, central control"
    },
    {
      "from": "registry",
      "to": "client_cli",
      "kind": "sync",
      "label": "watch or push the healthy list"
    },
    {
      "from": "client_cli",
      "to": "backend_cli",
      "kind": "sync",
      "label": "no hop, locality aware policy"
    },
    {
      "from": "backend_srv",
      "to": "registry",
      "kind": "feedback",
      "label": "register and heartbeat"
    },
    {
      "from": "backend_cli",
      "to": "registry",
      "kind": "feedback",
      "label": "register and heartbeat"
    }
  ],
  "groups": [
    {
      "id": "server_side",
      "label": "Server side: a dedicated balancer decides",
      "nodes": [
        "client_srv",
        "vip",
        "backend_srv"
      ]
    },
    {
      "id": "client_side",
      "label": "Client side or mesh: the caller decides",
      "nodes": [
        "client_cli",
        "backend_cli"
      ]
    }
  ],
  "caption": "Both lanes read the same registry, and the return arcs are what keep it honest: an instance that stops heartbeating, or fails readiness, leaves the advertised set. The number to quote is propagation speed, seconds with registry watch or push, minutes when a DNS TTL is the only mechanism."
}
\`\`\`

Recap: callers learn healthy addresses from a service registry (self-registration with heartbeats, or
Kubernetes Endpoints tied to readiness), unhealthy instances leave rotation in seconds; server-side
LB keeps clients simple at the cost of a hop and a central component, client-side/mesh removes the
hop and adds locality at the cost of per-client complexity, and the classic wrong turn is hardcoded
IPs or long-TTL DNS that keeps sending traffic to terminated instances.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are designing discovery for an autoscaling gRPC fleet whose instance set changes every minute. Which shape keeps a dead instance's lingering traffic to seconds?",
  "options": [
    {
      "label": "Short-TTL DNS records listing the instance IPs",
      "feedback": "Tempting because short TTLs feel fast, but resolver and stub caching still stretch propagation to a minute or more, and nothing pushes updates to callers."
    },
    {
      "label": "A watched registry with heartbeats and readiness",
      "correct": true,
      "feedback": "Right. Instances heartbeat into the registry and readiness gates them until warm, and because each client-side balancer watches the registry rather than sitting on a cached answer until a TTL expires, watch or push propagation gets a terminated instance out of every caller's view in seconds. This is the gRPC-plus-etcd shape the lesson names."
    },
    {
      "label": "Hardcoded instance addresses refreshed on each deploy",
      "feedback": "Autoscaling changes the set between deploys, so every scale-in strands traffic on a dead address until someone ships new config."
    }
  ],
  "reveal": "For the design write: name the registry, say where the balancing decision lives and why (simple clients plus a hop, versus locality plus per-caller complexity), and quote the number that matters: a bad instance leaves every caller's view in seconds, not minutes."
}
\`\`\`
`.trim()

const globalGslbTeach = `
## Steer users to the nearest healthy region, and fail fast

Once your product serves users on multiple continents from multiple regions, you need a way to steer
each user to a nearby healthy region and, when a region catches fire, to pull all traffic off it
fast. Level 1's [introductory treatment of name resolution](/learn/system-design/foundations/sd-l1-dns)
covers the resolver chain, TTL tradeoffs, and the steering records themselves. This lesson starts
where that ends, at the failover clock: why resolution alone cannot pull traffic off a burning region
inside a minute, what anycast plus a BGP withdrawal does instead, and how much headroom active-active
regions need to absorb one another. There are two distinct mechanisms, and interviewers want you to
know they operate at different layers.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A region dies and you flip its DNS record to point elsewhere. The record's TTL is 30 seconds. How long until the last client stops hammering the dead region?",
  "options": [
    {
      "label": "About 30 seconds, the TTL is the bound",
      "feedback": "Tempting, and it is the bound for well-behaved caches. But OS stub resolvers, browsers, and outright misbehaving resolvers ignore short TTLs, so a tail of clients lingers well past it."
    },
    {
      "label": "Instantly, resolvers see the record change",
      "feedback": "DNS is a pull-based caching system; nothing notifies resolvers that a record changed. They serve their cached answer until it expires."
    },
    {
      "label": "A minute or more, and some clients longer still",
      "correct": true,
      "feedback": "Right. TTL plus resolver misbehavior means DNS failover is never instant, and that single fact is the most-probed point in this topic."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Two steering mechanisms, two layers. Sort each property.",
  "buckets": [
    "GeoDNS / DNS-based GSLB",
    "Anycast + BGP"
  ],
  "items": [
    {
      "label": "Failover speed bounded by resolver caching",
      "bucket": "GeoDNS / DNS-based GSLB",
      "feedback": "Every DNS answer carries a TTL, and caches keep serving it after you flip the record."
    },
    {
      "label": "Withdraw an announcement and traffic reconverges in seconds",
      "bucket": "Anycast + BGP",
      "feedback": "BGP reroutes to the next-nearest PoP with no client-side cache to wait out."
    },
    {
      "label": "Weighted records sending 10 percent of users to a new region",
      "bucket": "GeoDNS / DNS-based GSLB",
      "feedback": "Canary-by-weight is a name-resolution feature."
    },
    {
      "label": "The same IP address announced from many points of presence",
      "bucket": "Anycast + BGP",
      "feedback": "The routing fabric itself delivers each client to the topologically nearest PoP."
    },
    {
      "label": "Needs Maglev-style consistent hashing so a backend change does not break in-flight connections",
      "bucket": "Anycast + BGP",
      "feedback": "Plain ECMP rehashes flows when the server set changes; consistent hashing keeps the remapped fraction small."
    }
  ]
}
\`\`\`

The two combine in practice: anycast to the nearest edge/CDN PoP terminates TLS and absorbs the
connection close to the user, then the edge forwards over warm long-haul connections to a healthy
origin region chosen by GSLB.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Anycast to the nearest edge, GSLB to a healthy origin",
  "nodes": [
    {
      "id": "user",
      "label": "User",
      "kind": "client"
    },
    {
      "id": "pop",
      "label": "Nearest PoP (one anycast IP announced by BGP)",
      "kind": "cdn"
    },
    {
      "id": "edge",
      "label": "Edge TLS termination",
      "kind": "lb"
    },
    {
      "id": "gslb",
      "label": "GSLB: health checked region steering",
      "kind": "lb"
    },
    {
      "id": "origin_us",
      "label": "Origin region us-east (live traffic)",
      "kind": "service"
    },
    {
      "id": "origin_eu",
      "label": "Origin region eu-west (live traffic)",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "user",
      "to": "pop",
      "kind": "sync",
      "label": "routing fabric picks the nearest PoP"
    },
    {
      "from": "pop",
      "to": "edge",
      "kind": "sync"
    },
    {
      "from": "edge",
      "to": "gslb",
      "kind": "sync",
      "label": "warm long haul connections"
    },
    {
      "from": "gslb",
      "to": "origin_us",
      "kind": "sync",
      "label": "healthy"
    },
    {
      "from": "gslb",
      "to": "origin_eu",
      "kind": "sync",
      "label": "healthy"
    }
  ],
  "stages": [
    {
      "adds": [
        "user",
        "pop"
      ],
      "note": "The requirement is steering with no client-side cache to wait out, so the same IP is announced from many PoPs and BGP delivers each user to the topologically nearest one. Withdraw that announcement and traffic reconverges in seconds."
    },
    {
      "adds": [
        "edge"
      ],
      "note": "A TLS handshake costs round trips, and round trips across an ocean are the expensive kind, so the connection terminates at the PoP rather than at the origin. Production anycast balancers use consistent hashing here so a backend change does not rehash every flow."
    },
    {
      "adds": [
        "gslb",
        "origin_us",
        "origin_eu"
      ],
      "note": "The edge still has to choose where to send the request, which is the second, coarser decision: GSLB health checks pick a live origin region. Running both regions active-active only works if the survivor has the headroom to absorb the other one's share."
    }
  ],
  "caption": "Failing a region out has two speeds, and the gap between them is the most probed point in this topic: withdraw the BGP announcement and traffic moves in seconds, or flip DNS and wait out the TTL plus resolver misbehavior, which is minutes."
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Region us-east is failing and the interviewer wants traffic off it in under a minute without dropping in-flight requests. What is the strongest sequence?",
  "options": [
    {
      "label": "Flip the DNS record to the surviving regions and declare it done",
      "feedback": "Tempting because it is one API call, but resolver caching bounds it: some clients hammer the dead region for minutes, and the follow-up question 'how long until the last user leaves' is coming."
    },
    {
      "label": "Withdraw its anycast announcement, drain, then take it down",
      "correct": true,
      "feedback": "Right. BGP withdrawal is cache-free, so traffic reconverges to the next-nearest PoP in seconds with no client waiting out a TTL, and draining lets in-flight requests finish before the region goes away. It only holds up if the surviving regions run active-active with the headroom to absorb the shifted share."
    },
    {
      "label": "Lower the DNS weight to zero and power the region down immediately",
      "feedback": "Weight-zero is the right lever for a planned drain, but powering down immediately kills in-flight requests and everyone still holding a cached DNS answer."
    }
  ],
  "reveal": "For the design write: steer coarsely with GeoDNS, fail fast with anycast plus BGP withdrawal, keep flows stable with Maglev-style consistent hashing, state your active-active headroom explicitly, and never claim DNS failover is instant."
}
\`\`\`
`.trim()

const apiGatewayBffTeach = `
## Where the cross-cutting concerns live

As a monolith splits into dozens of microservices, a hard question appears: where do the
cross-cutting concerns live? Every client call needs authentication, TLS, rate limiting, routing, and
observability. You do not want thirty services reimplementing all of that, and you do not want each
client talking directly to thirty services. The **API gateway** is the single north-south entry point
that owns those concerns so the services behind it stay thin.

Level 1's [introductory treatment of the reverse proxy](/learn/system-design/foundations/sd-l1-reverse-proxy-gateway)
establishes that a thin edge exists and what it is for. This lesson draws the boundaries around it:
what stays at the gateway, what belongs to the mesh carrying traffic between services, what a
per-client BFF owns, and what must never leave the service that owns the domain.

A gateway centralizes: **TLS termination**, **authentication and authorization**, **rate limiting and
quotas**, **routing**, **request/response transformation**, **response aggregation**, **API
versioning and canary routing**, and **observability**. Concrete implementations: Kong, AWS API
Gateway, Envoy-based gateways, Apigee, or a Netflix Zuul-style edge service.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The order service needs to call the inventory service inside the cluster. Should that call route through the API gateway, which already owns auth, rate limiting, and observability?",
  "options": [
    {
      "label": "Yes. The gateway already centralizes the cross-cutting concerns, so internal calls should get them the same way.",
      "feedback": "Tempting, since centralizing is the whole point of the gateway. But the gateway owns north-south traffic (client to system). Routing internal east-west calls through it adds a needless hop, makes the edge a bottleneck, and is a classic design error."
    },
    {
      "label": "No. Service-to-service traffic is a different layer's job.",
      "correct": true,
      "feedback": "Right. East-west traffic belongs to the service mesh (Istio with Envoy sidecars, or Linkerd with its own Rust micro-proxy), which handles mTLS, retries, and load balancing between services. The gateway owns the north-south boundary only."
    }
  ]
}
\`\`\`

Draw the boundary carefully. The gateway handles **north-south** traffic (client to system).
Service-to-service **east-west** traffic is the job of a **service mesh** (Istio with Envoy sidecars,
or Linkerd with its own Rust micro-proxy), which handles mTLS, retries, and load balancing *between*
services. Routing internal calls through the public gateway is a common design error. Business logic
belongs *inside services*, not in either the gateway or the mesh.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each concern into the layer that should own it.",
  "buckets": [
    "API gateway",
    "Service mesh",
    "Owning service"
  ],
  "items": [
    {
      "label": "TLS termination and rate limiting for client traffic",
      "bucket": "API gateway"
    },
    {
      "label": "mTLS and retries between internal services",
      "bucket": "Service mesh"
    },
    {
      "label": "The discount calculation for checkout",
      "bucket": "Owning service",
      "feedback": "Domain business rules never live at the edge or in the mesh, no matter how convenient the placement looks."
    },
    {
      "label": "Canary routing of client requests to a new API version",
      "bucket": "API gateway"
    },
    {
      "label": "Load balancing calls from the order service to inventory",
      "bucket": "Service mesh"
    },
    {
      "label": "Deciding whether a refund is allowed",
      "bucket": "Owning service"
    }
  ]
}
\`\`\`

### Backend-for-frontend (BFF)

One generic API rarely fits every client. A mobile app on a slow network wants a small, denormalized
payload in one round trip; a web SPA wants richer data; a partner API needs stable, versioned
contracts. A single endpoint serving all three leads to **over-fetching** (mobile downloads fields it
never renders) or **under-fetching** (five calls to build one screen). A **BFF** is a thin gateway
*per client type*: \`bff-mobile\`, \`bff-web\`, \`bff-partner\`. Each aggregates and shapes exactly
what its client needs and is owned by that client's team, so a mobile change does not ripple through
the web contract. GraphQL is one way to give clients field-level selection and reduce the need for
many hand-written BFFs, at the cost of its own query-cost and caching complexity.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "BFFs, the gateway, and the north-south / east-west boundary",
  "nodes": [
    {
      "id": "web",
      "label": "web SPA",
      "kind": "client"
    },
    {
      "id": "mobile",
      "label": "mobile app",
      "kind": "client"
    },
    {
      "id": "partner",
      "label": "partner client",
      "kind": "client"
    },
    {
      "id": "bff_web",
      "label": "bff-web",
      "kind": "service"
    },
    {
      "id": "bff_mobile",
      "label": "bff-mobile",
      "kind": "service"
    },
    {
      "id": "bff_partner",
      "label": "bff-partner",
      "kind": "service"
    },
    {
      "id": "gateway",
      "label": "API gateway (authn, rate limit, routing)",
      "kind": "lb"
    },
    {
      "id": "svc_orders",
      "label": "order service",
      "kind": "service"
    },
    {
      "id": "svc_users",
      "label": "user service",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "web",
      "to": "bff_web",
      "kind": "sync"
    },
    {
      "from": "mobile",
      "to": "bff_mobile",
      "kind": "sync"
    },
    {
      "from": "partner",
      "to": "bff_partner",
      "kind": "sync"
    },
    {
      "from": "bff_web",
      "to": "gateway",
      "kind": "sync",
      "label": "north-south"
    },
    {
      "from": "bff_mobile",
      "to": "gateway",
      "kind": "sync"
    },
    {
      "from": "bff_partner",
      "to": "gateway",
      "kind": "sync"
    },
    {
      "from": "gateway",
      "to": "svc_orders",
      "kind": "sync"
    },
    {
      "from": "gateway",
      "to": "svc_users",
      "kind": "sync"
    },
    {
      "from": "svc_orders",
      "to": "svc_users",
      "kind": "sync",
      "label": "east-west via mesh"
    }
  ],
  "stages": [
    {
      "adds": [
        "web",
        "mobile",
        "partner"
      ],
      "note": "Three client types need different payloads: mobile wants a small denormalized response in one round trip, the web SPA wants richer data, and the partner needs stable versioned contracts. One generic endpoint over-fetches or under-fetches."
    },
    {
      "adds": [
        "bff_web",
        "bff_mobile",
        "bff_partner"
      ],
      "note": "A thin BFF per client type aggregates and shapes exactly what its client needs and is owned by that client's team, so a mobile change does not ripple through the web contract."
    },
    {
      "adds": [
        "gateway"
      ],
      "note": "The gateway is the single north-south entry point owning TLS termination, authentication, rate limiting, routing, and observability, kept horizontally scaled and stateless because every request pays this hop."
    },
    {
      "adds": [
        "svc_orders",
        "svc_users"
      ],
      "note": "Business logic lives inside the owning services. Service-to-service east-west traffic is the service mesh's job (mTLS, retries, load balancing); routing internal calls through the public gateway is a common design error."
    }
  ],
  "caption": "North-south traffic enters through a per-client BFF and the gateway; east-west traffic between services belongs to the mesh, and domain rules stay in the services."
}
\`\`\`

### The two big risks

First, the gateway is a **single point of failure and a latency tax**: every request pays one extra
hop, and if it is down the whole product is down. So it must be horizontally scaled, stateless,
health-checked, and kept fast (offload heavy work, cache authz decisions and hot responses). Second,
and worse, the gateway can rot into a **god-object**: teams keep adding "just one more" piece of
business logic until the edge holds orchestration and domain rules that belong in services. Then
every service change requires a gateway change, deploys serialize on one component, and you have
rebuilt the distributed monolith you split up to avoid.

**Interview nuance:** the strongest answers name *what does not* belong at the gateway (domain
business rules, per-feature orchestration, data ownership) as crisply as what does. Pre-empt the
god-object probe by stating a rule: the gateway does cross-cutting concerns and routing only,
business logic lives in the owning service.

Recap: put auth, TLS, rate limiting, routing, and observability at a horizontally scaled gateway for
north-south traffic, use a BFF per client type to avoid over/under-fetching, leave service-to-service
concerns to the mesh, and hold the line against business logic creeping into the edge.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A teammate proposes putting the coupon-validation rules in the gateway, since every checkout request already passes through it. If you say yes, what does the system look like six months later?",
  "options": [
    {
      "label": "Fine: coupon logic lives in one place and the services stay thinner.",
      "feedback": "Tempting, and this is exactly how gateway rot starts: each addition looks convenient in isolation. But coupon rules are domain logic owned by the checkout service, not a cross-cutting concern."
    },
    {
      "label": "The gateway has become a god-object.",
      "correct": true,
      "feedback": "Right. 'Just one more' piece of business logic accretes until every feature change needs an edge deploy, teams serialize on one component, and you have rebuilt the distributed monolith you split up to avoid. Hold the rule: the gateway does cross-cutting concerns and routing only."
    }
  ],
  "reveal": "In your design write, name the gateway's exact responsibility list (TLS, authn, rate limits, routing, observability), give each client type a BFF if payload needs genuinely differ, and state explicitly that business logic stays in the owning services while the mesh handles east-west."
}
\`\`\`
`.trim()

const tlsConnectionMgmtTeach = `
## Where do you decrypt, and how many connections do you hold?

Two questions decide the health of a system's front door under real load: where do you decrypt, and
how many TCP connections does your backend actually have to hold open? Getting either wrong shows up
as CPU burn, port exhaustion, or a load balancer that silently stops balancing.

Level 1's [introductory treatment of the secure handshake](/learn/system-design/foundations/sd-l1-tls-https)
owns the protocol: what the handshake exchanges, what resumption saves, what mTLS proves. This lesson
is the operational half. Where the termination point goes once the fleet is large, how many
connections that leaves each backend holding, and what a long-lived multiplexed connection does to
the balancing you thought you had.

### Where you terminate TLS

The TLS handshake is expensive, and it happens per new connection. **Edge/LB termination** decrypts
at the load balancer or edge PoP, so the backend fleet never pays the handshake cost and certificates
are managed in one place. The gap: traffic from the LB to the backend is now plaintext internally.
**End-to-end TLS** (or re-encryption at the LB) keeps it encrypted all the way, and **mTLS**
additionally has both sides present certificates so services mutually authenticate: the zero-trust
default inside a service mesh (Istio/Linkerd issue and rotate certs via sidecars). A common
production shape: TLS terminated at the edge for the public handshake, then re-encrypted with mTLS
for the internal hop, giving both cheap edge offload and a zero-trust interior.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each statement to the TLS setup it describes.",
  "buckets": [
    "Edge termination only",
    "End-to-end TLS",
    "mTLS"
  ],
  "items": [
    {
      "label": "Backends never pay handshake CPU, but the internal hop is plaintext",
      "bucket": "Edge termination only"
    },
    {
      "label": "Every hop is encrypted, but services do not prove their identity to each other",
      "bucket": "End-to-end TLS"
    },
    {
      "label": "Both sides present certificates: the zero-trust default inside a mesh",
      "bucket": "mTLS"
    },
    {
      "label": "Sidecars issue and rotate its certificates automatically",
      "bucket": "mTLS"
    }
  ]
}
\`\`\`

**SNI and certificates at scale.** One IP/LB often fronts many hostnames. **SNI** (the client sends
the target hostname in the ClientHello) lets the LB pick the right certificate per connection.
Certificate **rotation** must be automated (ACME/Let's Encrypt, an internal CA); manual cert
management does not survive thousands of short-lived certs.

### Connection management: where the sharp edges live

Every new backend connection means a handshake and consumes an **ephemeral port**. A proxy opening a
fresh connection per request will exhaust its ephemeral ports and burn CPU on handshakes: Linux
defaults to roughly 28k of them (the range 32768-60999), and that budget applies per (source IP,
destination IP, destination port) tuple rather than per host. The fixes are **keep-alive** (reuse a
connection for many requests) and **connection pooling** (a warm pool per backend, multiplexing
requests over it), making backend connection counts a function of concurrency and pool size, not raw
request rate.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A gRPC fleet behind an L7 load balancer scales from 5 pods to 15 during a spike. Existing clients each hold one long-lived HTTP/2 connection. Where do their RPCs land?",
  "options": [
    {
      "label": "Spread across all 15 pods: balancing requests is what an L7 balancer is for",
      "feedback": "Tempting, because an L7 LB does balance individual requests for HTTP/1.1. But it picks a backend when the connection is established, and gRPC multiplexes thousands of RPCs as streams over that one connection."
    },
    {
      "label": "Still hammering the original 5 pods, while the 10 new ones sit idle",
      "correct": true,
      "feedback": "Right. Every stream is pinned to the backend chosen at connect time. You need per-stream balancing (Envoy), client-side load balancing, or max-connection-age cycling to move traffic onto new capacity."
    },
    {
      "label": "Gradually migrating to the new pods as the balancer rebalances",
      "feedback": "The balancer never revisits an established connection. Without connection-age limits or a scale-event drain, nothing ever forces existing clients to reconnect."
    }
  ]
}
\`\`\`

### The trap: multiplexed connections pin to one backend

**HTTP/2 and gRPC multiplex many streams over one long-lived connection.** A layer-7 load balancer
balances at *connection* establishment. But a gRPC client opens one connection and keeps it, sending
thousands of RPCs as streams over that single connection, all **pinned to whatever backend the LB
picked at connect time**. Add ten new backend pods and existing clients keep hammering the old ones;
the new pods sit idle.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Why a scale-up leaves the new pods cold",
  "nodes": [
    {
      "id": "client",
      "label": "gRPC client (one long lived HTTP/2 connection)",
      "kind": "client"
    },
    {
      "id": "lb",
      "label": "L7 LB (balances at connect time)",
      "kind": "lb"
    },
    {
      "id": "backend_a",
      "label": "Backend A: every stream pinned here",
      "kind": "service"
    },
    {
      "id": "backend_b",
      "label": "Backend B: new pod",
      "kind": "service"
    },
    {
      "id": "backend_c",
      "label": "Backend C: new pod",
      "kind": "service"
    },
    {
      "id": "rebalance",
      "label": "Per stream balancing, client side LB, or max connection age",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "client",
      "to": "lb",
      "kind": "sync",
      "label": "thousands of RPCs multiplexed as streams"
    },
    {
      "from": "lb",
      "to": "backend_a",
      "kind": "sync",
      "label": "chosen once, at connect time"
    },
    {
      "from": "lb",
      "to": "backend_b",
      "kind": "sync",
      "label": "no traffic until a client reconnects"
    },
    {
      "from": "lb",
      "to": "backend_c",
      "kind": "sync"
    },
    {
      "from": "rebalance",
      "to": "client",
      "kind": "feedback",
      "label": "re-resolve and rebalance"
    }
  ],
  "stages": [
    {
      "adds": [
        "client",
        "lb",
        "backend_a"
      ],
      "note": "A layer 7 balancer makes its choice when the CONNECTION is established, and a gRPC client opens one and keeps it, so every stream that rides it is pinned to backend A no matter how many requests that is."
    },
    {
      "adds": [
        "backend_b",
        "backend_c"
      ],
      "note": "Scaling up satisfies the capacity requirement on paper and nothing else: no mechanism revisits an established connection, so the new pods stay cold while A runs hot. WebSockets pin exactly the same way."
    },
    {
      "adds": [
        "rebalance"
      ],
      "note": "Only ending the pinning fixes it. Envoy balances individual H2 streams rather than connections, a client side balancer spreads RPCs itself, and a max-connection-age policy forces clients to re-resolve after a scale event."
    }
  ],
  "caption": "This is the shape behind the follow-up question: if you say you terminate gRPC at the L7 load balancer and stop there, expect to be asked why the new pods got no traffic after the scale-up."
}
\`\`\`

The fixes: **client-side load balancing** (the client spreads RPCs itself, via gRPC's round_robin
resolver or an xDS/mesh control plane), balance at **L7 per-request** with a proxy that understands
H2 streams (Envoy balances individual streams, not just connections), or periodically **cycle
connections** (max-connection-age) so clients re-resolve and rebalance. WebSockets have the same
pinning problem, so plan for connection draining and rebalancing on scale events.

**C10k / C10M.** Holding 100K-plus concurrent connections needs **event-driven** proxies
(epoll/kqueue, nginx/Envoy) rather than thread-per-connection, plus OS tuning (file-descriptor
limits, ephemeral port range, TCP buffers, SO_REUSEPORT).

**Interview nuance:** if you say "terminate gRPC at our L7 load balancer" without mentioning stream
pinning, expect "then why did your new pods get no traffic after a scale-up?" Naming client-side LB
or Envoy per-request balancing is what proves you have run this in production.

Recap: terminate TLS at the edge and re-encrypt with mTLS for a zero-trust interior, pool and
keep-alive connections to avoid handshake cost and port exhaustion, and remember that long-lived
multiplexed H2/gRPC/WebSocket connections pin to one backend so you need client-side or per-request
balancing to actually spread load.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You designed the front door: TLS terminates at the edge, mTLS inside, keep-alive pools to the backends. After a scale-up the new pods stay cold while the old pods run hot. Which choice is biting you?",
  "options": [
    {
      "label": "Edge TLS termination: handshake cost keeps traffic on the warm pods",
      "feedback": "Tempting because TLS placement is the flashiest decision, but termination decides where crypto happens, not which backend a request reaches."
    },
    {
      "label": "The long-lived pooled connections: pinned at connect time",
      "correct": true,
      "feedback": "Right. A multiplexed H2 or gRPC connection is balanced exactly once, when it is established, so every stream on it stays on the backend picked then and the new pods never get a turn. Add per-stream balancing at an Envoy-style proxy, client-side load balancing, or max-connection-age so clients re-resolve after scale events."
    },
    {
      "label": "Internal mTLS: sidecar handshakes are throttling the new pods",
      "feedback": "mTLS adds some CPU per new connection but does not steer traffic; the new pods would still receive their share of fresh connections if anything were reconnecting."
    }
  ],
  "reveal": "In the design write, state where TLS terminates and why, how connections are pooled and kept alive, and name the pinning fix (per-stream Envoy balancing, client-side LB, or connection-age cycling) before the interviewer asks why your scale-up did nothing."
}
\`\`\`
`.trim()

const rateLimitAlgorithmsTeach = `
## The shape of what you allow

Rate limiting answers one question: given a stream of requests keyed by some dimension (per-user,
per-IP, per-API-key, per-endpoint, or global), do I allow or reject the next one? The interesting
part is the shape of what you allow. Two systems can both permit "100 requests per minute" and behave
completely differently at the second scale.

That shape is all this lesson is about: four algorithms, what each one lets through, and the response
contract that goes with the decision. Holding one limit across a fleet is the next lesson's problem,
and Level 10's [end-to-end limiter case study](/learn/system-design/case-studies/sd-l10-rate-limiter)
assembles a whole component from both.

**Token bucket** is the usual default because it is burst-friendly. A bucket holds up to \`B\` tokens
and refills at \`R\` tokens per second. Each request removes one token; if the bucket is empty,
reject. A client that has been idle accumulates up to \`B\` tokens, so it can fire a burst of \`B\`
instantly, then settle to the steady rate \`R\`. You store just two numbers per key: the current
token count and the last-refill timestamp, refilled lazily on each access
(\`tokens = min(B, tokens + elapsed * R)\`). Capacity \`B\` sets the maximum burst; \`R\` sets the
long-run rate. This is what most APIs want: allow natural bursts, cap sustained abuse.

**Leaky bucket** is the opposite intent: it smooths output. Requests enter a queue and drain at a
fixed rate, so downstream sees a perfectly steady stream. Use it when the thing you protect cannot
absorb bursts at all (a payment processor with a hard TPS ceiling). The cost is added latency and a
queue to manage.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A limiter allows 100 requests per minute per key, counting in aligned one-minute windows that reset at :00. A client sends 100 requests at 11:00:59 and 100 more at 11:01:01. What gets through?",
  "options": [
    {
      "label": "The second batch is rejected: the client already spent its 100 for the minute",
      "feedback": "Tempting, because the stated limit is 100 per minute. But the counter reset at 11:01:00, so the second batch lands in a fresh window with a zeroed count."
    },
    {
      "label": "All 200 pass: double the intended rate inside about two seconds",
      "correct": true,
      "feedback": "Right. This is the boundary spike, the classic fixed-window failure: full quota at the end of one window plus full quota at the start of the next. Sliding-window counters exist to kill exactly this."
    }
  ]
}
\`\`\`

**Fixed window** counts requests per aligned interval and resets at the boundary. Trivially cheap
(one integer per key per window), but it has the **boundary spike**: a client can send the full quota
in the last second of one window and the full quota in the first second of the next, delivering 2x
the intended rate across a two-second span.

**Sliding-window log** stores a timestamp per request and counts those in the trailing window: exact
but memory-heavy (1000 req/min = 1000 stored timestamps). The practical compromise is the
**sliding-window counter**: keep the current and previous fixed-window counts and weight the previous
one by how much still overlaps the trailing window
(\`count = current + previous * overlap_fraction\`). It kills the boundary spike with roughly the
memory of fixed window.

\`\`\`cswidget
{
  "type": "rate-limiter",
  "title": "Three limiters, one boundary burst",
  "predictPrompt": {
    "question": "The stream bursts 20 requests right on the boundary between two 10-tick windows, with a limit of 10 per window. How many of the burst does the fixed-window limiter admit?",
    "options": [
      "About 10: the limit is 10 per window, so the limit holds",
      "Up to about 20: each window contributes its full quota, roughly 2x the stated limit",
      "Almost none: a burst that size trips the limiter and is rejected outright"
    ]
  },
  "workedExample": "This is the lesson's 100 requests per minute at one tenth scale: a limit of 10 per 10-tick window. The sim opens on fixed window: one counter per aligned window, reset every 10 ticks. Even the steady seeded stream clusters enough that fixed window sheds 6 of 48 requests while its worst trailing 10-tick span reaches 16: aligned counters bound aligned windows, not the spans that straddle them. Toggle the boundary burst: 20 extra requests land at tick 30 and the worst trailing span hits 19, nearly double the stated limit, because each side of the boundary gets a fresh budget. Switch to sliding window: every trailing span caps at exactly 10. Token bucket reads the same burst differently: saved capacity plus refill let its worst span reach 17 while it bounds the long-run rate, the controlled burst the lesson describes.",
  "algorithms": [
    "fixed-window",
    "sliding-window",
    "token-bucket"
  ],
  "limit": 10,
  "windowSize": 10,
  "seed": "boundary-spike-l4",
  "requests": 48,
  "horizon": 60,
  "burstAt": 30,
  "burstSize": 20,
  "caption": "Same stream, three verdicts. Watch the admitted count in the two ticks around the boundary: fixed window near 20, sliding window and token bucket near 10."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each property to the algorithm it belongs to.",
  "buckets": [
    "Token bucket",
    "Leaky bucket",
    "Sliding-window counter"
  ],
  "items": [
    {
      "label": "An idle client can fire a burst of B, then settles to rate R",
      "bucket": "Token bucket"
    },
    {
      "label": "Downstream sees a perfectly steady stream, at the cost of queueing latency",
      "bucket": "Leaky bucket"
    },
    {
      "label": "Weights the previous window by its overlap fraction to fix the boundary spike",
      "bucket": "Sliding-window counter"
    },
    {
      "label": "Stores just a token count and a last-refill timestamp per key",
      "bucket": "Token bucket"
    },
    {
      "label": "The right pick in front of a payment processor with a hard TPS ceiling",
      "bucket": "Leaky bucket",
      "feedback": "When the protected system cannot absorb bursts at all, you want smoothed output, not burst tolerance."
    }
  ]
}
\`\`\`

**Interview nuance:** the response contract matters as much as the algorithm. On rejection return
**HTTP 429 Too Many Requests** with a **Retry-After** header and the standard **RateLimit** headers
(\`RateLimit-Limit\`, \`RateLimit-Remaining\`, \`RateLimit-Reset\`) so well-behaved clients back off.
Decide **fail-open vs fail-closed**: if the limiter's state store is unavailable, do you allow
traffic (protect availability, risk overload) or block it (protect the backend, risk an outage)?
Most public APIs fail open on the limiter and rely on downstream load shedding as the real backstop.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Algorithm",
    "How it decides",
    "What that shape costs you"
  ],
  "rows": [
    [
      "Token bucket",
      "Capacity B refilling at R per second. Idle time saves up to B tokens; each request takes one or gets a 429.",
      "Burst friendly on purpose, so a rested client can fire B at once. No aligned window, so no boundary to double at."
    ],
    [
      "Fixed window",
      "Counts requests inside an aligned window and resets the count at the boundary.",
      "59 at the end of one window plus 59 at the start of the next is about 118 in one second, roughly 2x the stated limit."
    ],
    [
      "Sliding window counter",
      "Weights the previous window by how much it overlaps the current one.",
      "Fixes the boundary spike at roughly fixed window memory, which is why it is the accuracy default."
    ]
  ],
  "highlightCols": [
    "What that shape costs you"
  ],
  "caption": "The middle row is why raw fixed window is unsafe for anything abuse sensitive: the limit reads 60 per minute and the client gets about 118 of them inside one second."
}
\`\`\`

Recap: default to token bucket for burst-friendly per-key limits, use sliding-window counter when you
need window accuracy without the log's memory, avoid raw fixed window for anything abuse-sensitive,
and always return 429 plus Retry-After and RateLimit headers with a stated fail-open or fail-closed
policy.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are designing per-key limits for a public API: clients burst naturally, sustained abuse must be capped, window-edge doubling is unacceptable, and the limiter's state store can go down. Which combination fits?",
  "options": [
    {
      "label": "Fixed window for cheapness, failing closed when the store is down",
      "feedback": "Tempting for its simplicity, but fixed window has the boundary spike, and failing closed turns a limiter-store outage into a full API outage."
    },
    {
      "label": "Token bucket with a 429 contract, failing open",
      "correct": true,
      "feedback": "Right. Token bucket allows the natural bursts while capping the sustained rate, and because it has no aligned window there is no boundary edge to double at. The 429 plus Retry-After and the RateLimit headers let well-behaved clients back off, and failing open keeps a limiter-store outage from becoming an API outage, with downstream load shedding as the real backstop."
    },
    {
      "label": "Sliding-window log for exactness, failing open",
      "feedback": "The log is exact but stores a timestamp per request, which is heavy at public-API scale. The sliding-window counter gives nearly the same accuracy at roughly fixed-window memory."
    }
  ],
  "reveal": "In the design write, name the algorithm, the key dimension (per user, per API key, per endpoint), the exact rejection contract (429, Retry-After, the RateLimit headers), and your fail-open or fail-closed call. The contract earns as much credit as the algorithm."
}
\`\`\`
`.trim()

const distributedRateLimitingTeach = `
## One global limit across N nodes

A single-node limiter is easy because one process owns the counter. Production limiters run on a
**fleet of gateway nodes** behind a load balancer, and a user's requests land on any of them. If each
of 20 nodes independently enforces "100 req/min," a user spraying across all 20 gets **2000
req/min**, 20x the intended limit. Enforcing one global limit across N nodes without paying an
unacceptable latency or availability tax is the whole of the coordination problem, and the whole of
this lesson. The algorithms themselves came from the previous lesson, and Level 10's
[end-to-end limiter case study](/learn/system-design/case-studies/sd-l10-rate-limiter) builds a full
component around the two together.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The fleet moves the counter to shared Redis. Each gateway node runs 'GET count', checks it against the limit of 100, and calls 'INCR' if allowed. Two nodes execute this at the same instant when the count is 99. What happens?",
  "options": [
    {
      "label": "Redis is single-threaded, so it serializes the commands and only one request is allowed",
      "feedback": "Tempting, because each individual Redis command is atomic. But the race lives between the GET and the INCR: both nodes read 99 before either one increments."
    },
    {
      "label": "Both nodes read 99, both allow, and the limit is overshot",
      "correct": true,
      "feedback": "Right. A read-then-write across two commands is not atomic. Fix it by making the decision one atomic operation: a bare 'INCR' whose returned value you check, or a Lua script via 'EVAL' when multiple fields must update together, as in a token bucket."
    }
  ]
}
\`\`\`

**Approach 1: centralized exact, with a shared store.** Put the counter in **Redis** and have every
node read-modify-write it. The trap is the race: two nodes doing \`GET count; if under limit INCR\`
can both read 99 and both allow, overshooting. You must make the decision **atomic**. For simple
counters, \`INCR\` returns the new value in one round trip, so the node increments first and rejects
if the result exceeds the limit. For token bucket you need multiple fields updated together (refill
then decrement), so you run a **Lua script** via \`EVAL\`, which Redis executes atomically. This
gives exact global enforcement. The cost is a network round trip to Redis on **every request** (0.5
to 1ms added per call) and Redis becoming a hot dependency.

**Approach 2: local approximation.** Give each node a slice of the budget: a global 100/min across 20
nodes means 5/min per node, enforced purely in local memory with zero coordination. Fast, no shared
dependency, but only correct when traffic is evenly balanced. If the load balancer sends a hot user
disproportionately to a few nodes, those nodes burn their 5/min and throttle early while the global
100/min sits underused. It also wastes budget: idle nodes' slices are unusable by busy nodes.

**Approach 3: hybrid, the common production answer.** Nodes enforce locally from a **local token
cache** for speed, and **asynchronously sync** their consumption to Redis every short interval (say
100ms) to true up the shared view and re-divide the remaining global budget. This bounds overshoot to
at most one sync interval's worth of traffic while keeping the hot path in local memory. Envoy's
global rate limiting and many CDNs work roughly this way.

\`\`\`cswidget
{
  "type": "calc",
  "title": "What N nodes actually enforce",
  "predictPrompt": {
    "question": "Twenty gateway nodes each enforce the documented limit of 100 requests per minute, exactly as written. One user sprays requests across all twenty. What does the fleet actually allow that user?",
    "options": [
      "100 per minute: that is the limit",
      "About 500 per minute",
      "2000 per minute",
      "It depends on which node the balancer picks"
    ]
  },
  "workedExample": "Start where the lesson starts: 20 gateway nodes, a documented limit of 100 requests per minute, and a hybrid that syncs every 100ms. With every node enforcing the full 100 itself, the fleet allows 20 times 100, which is 2000 per minute. Nobody wrote a bug to get there; each node is obeying the number in the spec. Divide the budget instead and each node holds 100 / 20 = 5 per minute, which is correct only while the balancer spreads that user evenly across all twenty. Now read the third row: 100 per minute is 1.67 per second, a 100ms window is 0.167 of a request per node, so across 20 nodes the worst case overshoot before the next true-up is about 3 requests. Drag the sync interval to 2000ms and watch that bound grow twentyfold.",
  "inputs": [
    {
      "kind": "slider",
      "id": "nodes",
      "label": "Gateway nodes in the fleet",
      "min": 2,
      "max": 50,
      "step": 1,
      "initial": 20,
      "unit": "nodes"
    },
    {
      "kind": "slider",
      "id": "globalLimit",
      "label": "The documented global limit",
      "min": 60,
      "max": 6000,
      "step": 20,
      "initial": 100,
      "unit": "req/min"
    },
    {
      "kind": "slider",
      "id": "syncMs",
      "label": "Hybrid sync interval",
      "min": 50,
      "max": 2000,
      "step": 50,
      "initial": 100,
      "unit": "ms"
    }
  ],
  "outputs": [
    {
      "id": "naiveGlobal",
      "label": "Naive per-node: what the fleet really allows",
      "expr": "nodes * globalLimit",
      "format": "compact",
      "unit": "req/min",
      "sparkline": {
        "over": "nodes"
      }
    },
    {
      "id": "slice",
      "label": "Local slice per node once you divide the budget",
      "expr": "globalLimit / nodes",
      "format": "number",
      "unit": "req/min"
    },
    {
      "id": "hybridOvershoot",
      "label": "Hybrid worst case overshoot before the next true-up",
      "expr": "nodes * (globalLimit / 60) * (syncMs / 1000)",
      "format": "number",
      "unit": "requests"
    }
  ],
  "caption": "The first row is the whole problem: nothing is misconfigured, every node enforces the documented number, and the fleet still grants N times it. The third row is what you buy with the hybrid, a bounded overshoot you can quote out loud, instead of a Redis round trip on every single request."
}
\`\`\`

**Interview nuance:** you will always be asked "what if Redis is down?" A rate limiter must not
become a **single point of failure** for the whole API. The standard answer is **fail open**: if the
shared store is unreachable, fall back to permissive local limits and let downstream load shedding
protect the backend. Also handle **hot keys** (one celebrity key hammering a single Redis slot) with
key sharding or local caching, and **clock skew / window alignment** across nodes: use the store's
time or logical windows, not each node's wall clock.

\`\`\`
naive per-node (BROKEN)           hybrid (production)
 every node enforces the full     local cache enforces fast
 100/min itself, not a 5/min      async sync -> Redis every 100ms
 slice: 20 x 100 = 2000/min       true up + re-divide budget
 user sprays -> 20x the limit     overshoot bounded to ~1 interval
\`\`\`

Recap: naive per-node limits grant Nx, so either enforce exactly via atomic Redis ops (INCR / Lua,
paying a per-request round trip) or approximate locally and async-sync to a shared store for bounded
overshoot, and always decide the fail-open path plus hot-key sharding so the limiter never becomes
the outage.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each property to the distributed enforcement approach it describes.",
  "buckets": [
    "Centralized Redis",
    "Local budget slices",
    "Hybrid with async sync"
  ],
  "items": [
    {
      "label": "Exact global enforcement, but every request pays a network round trip",
      "bucket": "Centralized Redis"
    },
    {
      "label": "Zero coordination, but a hot user concentrated on a few nodes gets throttled while global budget sits unused",
      "bucket": "Local budget slices"
    },
    {
      "label": "Overshoot bounded to roughly one sync interval of traffic",
      "bucket": "Hybrid with async sync"
    },
    {
      "label": "How Envoy global rate limiting and many CDNs actually work",
      "bucket": "Hybrid with async sync"
    },
    {
      "label": "Only correct while the load balancer spreads traffic evenly",
      "bucket": "Local budget slices",
      "feedback": "The moment balancing skews, some nodes throttle early while others waste their slice."
    }
  ],
  "reveal": "In the design write, pick an approach and defend its tradeoff (exactness vs per-request latency vs bounded overshoot), then pre-empt the interviewer: say what happens when Redis is down (fail open to permissive local limits, let load shedding backstop) and how you handle hot keys and clock skew."
}
\`\`\`
`.trim()

const loadSheddingBackpressureTeach = `
## Systems die by accepting more than they can finish

Level 1's [introductory treatment of flow control](/learn/system-design/foundations/sd-l1-backpressure-shedding)
owns the primitives, and this lesson does not re-derive them: bound every queue, let backpressure
propagate, and reject early because
latency explodes as utilization nears 100%. Taking those as given, this lesson is about what happens
when they are not enough. It leads with the failure they exist to prevent, the retry-storm death
spiral that outlives its own trigger, and then the two controls that beat it, adaptive concurrency
limits and brownout. Rate limiting caps one client's demand; overload protection is what you reach for
when total legitimate demand simply exceeds your capacity, or a dependency slows and requests pile up.
The goal is blunt: at 150% of capacity, stay up and keep serving the most important traffic, instead
of trying to serve everything and serving nothing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A service with an unbounded request queue takes sustained traffic at 150% of its capacity. What does its completed-work-per-second look like over the next few minutes?",
  "options": [
    {
      "label": "It plateaus at 100% of capacity while the queue absorbs the extra 50%",
      "feedback": "Tempting, and true for a short spike. But under sustained overload the queue grows without bound: every request waits longer, clients time out and retry, and the server spends capacity on work that is already dead."
    },
    {
      "label": "It collapses toward zero",
      "correct": true,
      "feedback": "Right. Latency climbs past client timeouts, retries amplify load roughly 3x, memory fills with queued work, and the box GCs itself to death or OOMs. This is congestion collapse, and the unbounded queue is what enables it."
    }
  ]
}
\`\`\`

Understand the failure mode first. A server has finite concurrency. When arrival rate exceeds
completion rate, in-flight requests and queues grow, each request waits longer, latency climbs,
clients hit timeouts and **retry** (often amplifying load 3x), memory for queued work grows, and
eventually the box GCs itself to death or OOMs. This is the **congestion collapse / retry-storm death
spiral**: throughput actually drops toward zero under increasing load. The defining mistake that
enables it is the **unbounded queue**, which hides overload by accepting work it will never complete
in time until memory runs out.

\`\`\`cswidget
{
  "type": "queue-sim",
  "title": "The Unbounded Queue at 150 Percent Load",
  "predictPrompt": {
    "question": "Arrivals hold at 150 percent of capacity, and a retry surge hits partway through the run. With the queue unbounded, what does the depth curve do?",
    "options": [
      "It levels off at a plateau once the queue absorbs the extra 50 percent",
      "It climbs steadily, then the retry surge steepens the slope, and it never comes back down",
      "It spikes during the retry surge but drains back to empty once the surge ends"
    ]
  },
  "workedExample": "Arrivals run at 3 per tick against a drain of 2, a steady 150 percent of capacity, so depth starts climbing from the first tick and never gets a chance to recover. Midway through, the retry surge triples arrivals and the slope turns sharply steeper: this is the death spiral feeding itself. In unbounded mode the curve only ever goes up, because the drain never once exceeds arrivals; the queue is hiding overload by accepting work it will never finish in time. Flip to bounded mode and depth stops hard at the cap, with the excess refused at the door: the 1ms rejection the lesson argues is almost free, instead of the accept-queue-fail path that burns capacity you needed for good traffic.",
  "producerRate": 3,
  "consumerRate": 2,
  "ticks": 160,
  "capacity": 60,
  "burst": {
    "from": 70,
    "to": 110,
    "multiplier": 3
  },
  "caption": "Toggle bounded mode to see the difference between a queue that hides overload until memory runs out and one that refuses work it cannot finish."
}
\`\`\`

### The Level 1 mechanics, recapped in one pass

Level 1 owns the how, so take these as settled: reject early at the door with a **429** or **503**
rather than accepting work you will fail later, bound every queue so it returns a fast 503 instead of
growing, propagate a per-request **deadline** through the call chain and drop anything already past
it, and classify traffic so low-value requests die before paying-customer writes.

Two things change once the enemy is a spiral rather than a latency tail. The shedding threshold moves
**below** 100%, because you have to shed before collapse rather than at the moment of it. And
**retried requests move near the top of the drop list**, because retries are the fuel the spiral runs
on: dropping them cheaply is how you starve it. The one class you never shed is health checks, since
dropping those makes the load balancer mark you dead and converts an overload into an outage.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You are past the shedding threshold. Sort the traffic.",
  "buckets": [
    "Shed first",
    "Keep serving"
  ],
  "items": [
    {
      "label": "Bulk data export job",
      "bucket": "Shed first"
    },
    {
      "label": "Paying-customer checkout write",
      "bucket": "Keep serving"
    },
    {
      "label": "Health checks from the load balancer",
      "bucket": "Keep serving",
      "feedback": "Drop these and the balancer marks you dead, converting an overload into an outage."
    },
    {
      "label": "Recommendation carousel call",
      "bucket": "Shed first"
    },
    {
      "label": "Retried requests from clients that already timed out",
      "bucket": "Shed first",
      "feedback": "Retries are the fuel of the death spiral, so they are among the first candidates to drop."
    }
  ]
}
\`\`\`

### Adaptive concurrency limits

A static "max 500 concurrent" is wrong the moment your dependency's latency changes: at 50ms per
request 500 concurrency is fine, at 500ms it is 10x too much. Instead, discover the limit dynamically
the way TCP congestion control does. By **Little's Law**, \`concurrency = throughput * latency\`; a
system probes by raising its concurrency limit while latency stays flat and backing off when latency
rises (a gradient / TCP-Vegas style loop, as in Netflix's adaptive concurrency limiter). The limit
tracks the real, current capacity with no operator-tuned magic number.

### Brownout: shed features, not just requests

**Interview nuance:** graceful degradation / **brownout** is the senior move, and it is the control
Level 1 has no equivalent for, because it does not choose between requests at all. Under overload you
shed **features** instead: serve a cached or partial response, skip the personalization call, drop the
recommendation carousel, return the core page. Every browned-out response costs less work than a full
one, so admitted traffic gets cheaper at exactly the moment capacity is scarce, and the user still
gets an answer rather than a 429. Combine it with retry hygiene (exponential backoff plus jitter, and
**circuit breakers**) and you break the retry storm at both ends: fewer retries arriving, and less
work spent on each request you do admit.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "The admission path that keeps a service up at 150 percent",
  "reveal": "all",
  "nodes": [
    {
      "id": "demand",
      "label": "Demand at 150 percent of capacity",
      "kind": "client"
    },
    {
      "id": "admission",
      "label": "Admission: shed low priority first past the threshold",
      "kind": "service"
    },
    {
      "id": "queue",
      "label": "Bounded queue: fast 503 when full, drop past deadline",
      "kind": "queue"
    },
    {
      "id": "workers",
      "label": "Worker pool: adaptive concurrency probed via Little's Law",
      "kind": "service"
    },
    {
      "id": "brownout",
      "label": "Brownout: cached or partial response, optional features dropped",
      "kind": "service"
    },
    {
      "id": "rejected",
      "label": "Rejected in about 1ms",
      "kind": "external"
    }
  ],
  "edges": [
    {
      "from": "demand",
      "to": "admission",
      "kind": "sync"
    },
    {
      "from": "admission",
      "to": "queue",
      "kind": "sync",
      "label": "accepted work only"
    },
    {
      "from": "queue",
      "to": "workers",
      "kind": "sync"
    },
    {
      "from": "workers",
      "to": "brownout",
      "kind": "sync",
      "label": "still over: serve the core page"
    },
    {
      "from": "admission",
      "to": "rejected",
      "kind": "sync",
      "label": "bulk exports and retries go first"
    },
    {
      "from": "queue",
      "to": "rejected",
      "kind": "sync",
      "label": "queue full, or already past its deadline"
    }
  ],
  "caption": "Three layers, one rule: never accept work you cannot finish in time. A request refused in 1ms costs almost nothing, while one accepted, queued for 5s and then failed has spent capacity that good traffic needed. Health checks are the traffic you never shed, because dropping them converts an overload into an outage."
}
\`\`\`

Recap: shed early and by priority, replace static thresholds with adaptive concurrency limits derived
from Little's Law, bound every queue and drop past-deadline work so latency cannot explode, and brown
out optional features rather than failing everything: never an unbounded queue.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your dependency's latency just jumped from 50ms to 500ms and demand is running at 150% of capacity. Which pair of defenses keeps the service up?",
  "options": [
    {
      "label": "Raise the static max-concurrency limit and let clients retry",
      "feedback": "Tempting, because more concurrency feels like more capacity. But at 500ms per call the old static limit is already 10x too high, and retries amplify the overload roughly 3x."
    },
    {
      "label": "Adaptive concurrency limits plus priority shedding and brownout",
      "correct": true,
      "feedback": "Right. The Little's Law probe (concurrency equals throughput times latency) shrinks the limit as the dependency slows, shedding drops droppable traffic at the door, and brownout serves cached or partial responses instead of failing everything."
    },
    {
      "label": "A much bigger queue in front of the worker pool",
      "feedback": "A bigger queue just hides overload for longer: it adds latency, feeds timeouts and retries, and eats memory. Queues must be bounded and reject fast when full."
    }
  ],
  "reveal": "In the design write, walk the admission path explicitly: priority-aware shedding at the door, bounded queues returning fast 503s, deadline propagation that drops already-dead work, adaptive concurrency at the worker pool, and a named brownout behavior for the features you sacrifice first."
}
\`\`\`
`.trim()

const autoscalingTeach = `
## Match capacity to demand, and respect the lag

Autoscaling is the machinery that grows and shrinks a fleet so you pay for roughly what you use while
still meeting your SLOs. Level 9's
[platform-side treatment of elasticity](/learn/system-design/modern-architecture/sd-l9-k8s-autoscaling)
takes the Kubernetes components one at a time, the HPA against the cluster autoscaler against KEDA.
This lesson is about the thing none of those components removes: the lag. Every reactive loop trails
the burst that triggered it by minutes, so the design work is picking a signal that moves early and
buying cover for the window before capacity lands. There are three layers, and interviewers want you
to name them distinctly.

**Horizontal Pod/instance autoscaling (HPA)** adds or removes replicas based on a metric. The default
metric is **CPU or memory utilization**: target 60% CPU, add pods when the average climbs above that.
The problem is that CPU is a *lagging* signal: by the time CPU is pegged, requests are already
queuing and your p99 is already blown. Better is to scale on a **leading business metric**:
requests-per-second per pod, in-flight concurrency, or, best of all for async workers, **queue depth
/ consumer lag**. If a Kafka or SQS backlog is growing, you need workers *now*, before any CPU number
moves.

**Event-driven autoscaling** is exactly this idea productized. **KEDA** scales a deployment directly
off external event sources: Kafka lag, SQS queue length, Redis list size, Prometheus queries. A
worker fleet can even **scale to zero** when the queue is empty. This reacts to the *cause* (work
arriving) rather than the *symptom* (CPU rising), buying precious lead time.

\`\`\`cswidget
{
  "type": "queue-sim",
  "title": "Scale on the Backlog, Not the CPU",
  "predictPrompt": {
    "question": "A wave of jobs lands while the lone worker is already flat out on the job in hand. Which signal tells the autoscaler to add workers first?",
    "options": [
      "CPU utilization: the worker heats up as the wave arrives",
      "Queue depth: the backlog grows the moment arrivals outpace the drain",
      "p99 latency: alerts fire once jobs start missing their deadlines"
    ]
  },
  "workedExample": "At the start the drain slightly outruns arrivals, so the queue idles near empty even though the busy worker's CPU already reads as pegged. When the wave hits, arrivals run several times the single consumer's drain and depth climbs steeply, while a CPU trigger would still see nothing new: a worker grinding through one job looks exactly the same at 100 percent whether zero jobs or hundreds are waiting behind it. Turn on scale on backlog and the moment depth crosses the threshold, extra consumers attach and the combined drain overtakes arrivals, so the backlog crests and then empties well before the run ends. Queue depth is the cause-side signal: it moves the instant work outpaces the drain, minutes before any utilization number would.",
  "producerRate": 1.5,
  "consumerRate": 2,
  "ticks": 180,
  "capacity": 120,
  "burst": {
    "from": 40,
    "to": 100,
    "multiplier": 6
  },
  "scaleOnBacklog": {
    "threshold": 20,
    "maxConsumers": 5
  },
  "caption": "Flip scale on backlog to watch KEDA-style scaling catch a wave that a CPU-based trigger would sleep through."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each autoscaling metric.",
  "buckets": [
    "Leading signal",
    "Lagging signal"
  ],
  "items": [
    {
      "label": "CPU utilization",
      "bucket": "Lagging signal",
      "feedback": "By the time CPU is pegged, requests are already queuing and the p99 is already blown."
    },
    {
      "label": "Kafka consumer lag",
      "bucket": "Leading signal"
    },
    {
      "label": "Requests per second per pod",
      "bucket": "Leading signal"
    },
    {
      "label": "Memory utilization",
      "bucket": "Lagging signal"
    },
    {
      "label": "SQS queue depth",
      "bucket": "Leading signal",
      "feedback": "A growing backlog is the cause of future overload; scaling on it buys lead time before any CPU number moves."
    }
  ]
}
\`\`\`

### The queue you scale on has its own clock

Scaling on a backlog makes the queue's redelivery rules part of your scaling design, and the one that
bites is SQS's **visibility timeout**. \`ReceiveMessage\` does not remove a message, it **hides** it:
the message goes invisible to every other consumer for the length of the visibility timeout, and the
worker removes it for good only by calling \`DeleteMessage\` when the job is done. The clock starts at
**receive**, not at the worker's last sign of life, so a job that merely runs longer than the timeout
is indistinguishable from a job whose worker died. Here is a 300-second transcode against the
30-second default, with the delete at the end of the job and nothing crashing at all:

\`\`\`csdiagram
{
  "type": "pipeline",
  "title": "One job, one 30 second visibility timeout",
  "stages": [
    {
      "label": "t=0 worker A receives job 42",
      "note": "hidden from other consumers until t=30"
    },
    {
      "label": "t=30 the timeout lapses",
      "note": "A is 10% done and has deleted nothing"
    },
    {
      "label": "t=31 worker B receives job 42",
      "note": "two workers now transcode the same file"
    },
    {
      "label": "t=60, t=90, t=120 ...",
      "note": "it reappears every 30s: a third worker, a fourth"
    },
    {
      "label": "t=300 A finishes and deletes",
      "note": "duplicate output written, CPU paid several times over"
    }
  ],
  "highlight": [
    "t=30 the timeout lapses"
  ],
  "caption": "No worker failed here. The only fault is a job that outlives its lease, which the queue cannot tell apart from a job whose worker died."
}
\`\`\`

Two fixes, and they trade against each other. Set the timeout **above the longest job you have
measured** (600 seconds over a 300-second maximum) so the message stays hidden for the whole run and
reappears only if the worker really did die. Or **extend the lease while working**: call
\`ChangeMessageVisibility\` on a heartbeat so a long job keeps pushing its own deadline out. The fixed
timeout is simpler and is what most fleets ship, and its cost is that a genuinely crashed job now
sits invisible for the full 600 seconds before anyone retries it. The safety margin you bought is
also added latency on every crash. Kafka has the same shape under different names: a consumer that
does not come back to \`poll()\` within \`max.poll.interval.ms\` is presumed dead, its partitions are
revoked and reassigned, and whoever takes them re-consumes the records it was working on.

This feeds straight back into the scaler. SQS publishes the backlog as two numbers:
\`ApproximateNumberOfMessages\` for messages waiting and visible, and
\`ApproximateNumberOfMessagesNotVisible\` for messages a worker has received but not yet deleted. A
message that reappears mid-job moves from the second number back into the first, so a too-short
timeout inflates the pending backlog with jobs that are already being processed and the scaler adds
workers for work the fleet is doing right now.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "id": "sqs-visibility-timeout-redelivery",
  "prompt": "A transcode runs 300 seconds and deletes its SQS message only once it finishes. The visibility timeout is left at the 30-second default, and no worker crashes. What happens?",
  "options": [
    {
      "label": "It completes once, because redelivery is a response to a crashed worker",
      "feedback": "Redelivery has no way to tell the difference. SQS knows only that the message was not deleted before its timeout expired, and a job still grinding away looks identical to a worker that died holding it."
    },
    {
      "label": "A second worker receives the same job while the first is still running",
      "correct": true,
      "feedback": "Right. Receive hides the message for 30 seconds and the clock starts at receive, so at t=30 job 42 is visible again and the next poller takes it. It then reappears every 30 seconds after that. Put the timeout above the longest job you have measured, or heartbeat ChangeMessageVisibility while the job runs."
    },
    {
      "label": "The message is discarded at t=30 and that upload is lost",
      "feedback": "Expiry is what makes a message visible again, not what removes it. Messages leave an SQS queue on delete, at the retention limit, or into a dead-letter queue after too many receives."
    }
  ]
}
\`\`\`

Below the pod layer sits the **cluster/node autoscaler**. HPA asking for 40 more pods does nothing if
there is no node to place them on; the Cluster Autoscaler (or Karpenter) provisions new VMs when pods
are unschedulable. Separately, the **Vertical Pod Autoscaler (VPA)** right-sizes each pod's
CPU/memory *requests*. HPA and VPA on the same metric fight each other, so keep them on different
signals.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Traffic jumps 10x in 20 seconds. Your HPA targets 60% CPU with a 30-second scrape interval, and fresh nodes take about 90 seconds to provision. Does autoscaling save the burst?",
  "options": [
    {
      "label": "Yes: the HPA reacts within a scrape interval or two, well under a minute",
      "feedback": "Tempting, because the scaling decision itself is quick. But the decision is only the start: node provisioning, image pull, app boot, warmup, and health checks stack on top, typically 2 to 5 minutes end to end."
    },
    {
      "label": "No: new capacity lands minutes after the burst, so only standing headroom or pre-scaled capacity absorbs it",
      "correct": true,
      "feedback": "Right. Reactive scaling always trails a fast burst. The fleet you already have, running at 60% instead of 95%, is what survives the first minutes while new capacity boots."
    }
  ]
}
\`\`\`

### Scaling lag: the concept that separates a senior answer

Reactive autoscaling has an unavoidable pipeline of delays: metric scrape interval (15 to 60s) +
controller decision/stabilization window + node provisioning (30 to 120s for a fresh VM) + container
pull + app boot + JIT/cache warmup + health-check pass. That is often **2 to 5 minutes** end to end.
A traffic burst that arrives in 20 seconds will overwhelm you long before new capacity is ready.
Reactive scaling *always trails a fast burst.*

Two tools hide the lag. **Warm pools** keep pre-booted, pre-warmed instances parked so a scale-out is
just "attach," collapsing minutes to seconds. **Scheduled / predictive pre-scaling** grows the fleet
*ahead* of a known pattern: if traffic 10x's every day at 9am, a scheduled scaler raises the floor at
8:50. Predictive autoscalers learn the daily/weekly curve and pre-provision automatically.

**Interview nuance:** the trap is claiming "autoscaling handles spikes" full stop. The correct
framing: autoscaling handles *sustained load changes and gradual ramps* well, but for sharp bursts
you must either pre-scale (if predictable) or hold **headroom** (run at 60% not 95%) so the existing
fleet absorbs the burst while new capacity boots.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Strategy",
    "How the capacity arrives",
    "How late it is for a 20 second burst"
  ],
  "rows": [
    [
      "Reactive (HPA on a metric)",
      "Scrape 30s, decide 30s, boot 90s, warm 30s",
      "About 3 minutes late"
    ],
    [
      "Warm pool",
      "Attach a node that is already booted and already warm",
      "About 15 seconds"
    ],
    [
      "Scheduled or predictive",
      "Floor raised at 8:50 for the 9am spike",
      "Already serving when the burst arrives"
    ]
  ],
  "highlightCols": [
    "How late it is for a 20 second burst"
  ],
  "caption": "None of these makes an unpredictable 20 second burst survivable by itself. Standing headroom, running the fleet at 60 percent rather than 95, is the only thing absorbing the burst while the rows above catch up."
}
\`\`\`

Recap: scale on leading signals (queue depth via KEDA, RPS) not just lagging CPU, know what the queue
does with a message while a worker holds it so redelivery does not inflate the signal you scale on,
layer HPA + cluster autoscaler + VPA, and because reactive scaling always trails a fast burst by 2 to
5 minutes of lag, hide that lag with warm pools, scheduled pre-scaling, and standing headroom.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your service 10x's every weekday at 9:00am sharp and also takes occasional unpredictable spikes. What is the strongest scaling setup?",
  "options": [
    {
      "label": "An aggressive HPA on CPU with a short stabilization window",
      "feedback": "Tempting, but CPU is a lagging signal and reactive scaling still pays the full 2 to 5 minute pipeline. Aggressive settings mostly add flapping, not speed."
    },
    {
      "label": "Scheduled pre-scaling, leading signals, and headroom",
      "correct": true,
      "feedback": "Right. The 9am spike is predictable, so a scheduled scaler raises the floor at 8:50 and the capacity is warm before the first user arrives. Queue depth or RPS cuts reaction lag on the gradual ramps, and standing headroom is the only thing that absorbs a burst nothing could predict while new capacity boots."
    },
    {
      "label": "VPA, so every pod gets more CPU when the spike hits",
      "feedback": "VPA right-sizes per-pod requests over time; it does not add replicas during a burst, and applying a new size typically restarts pods, the last thing you want mid-spike."
    }
  ],
  "reveal": "In the design write, name the layers distinctly (HPA or event-driven scaling, cluster autoscaler, VPA on a separate signal), state the 2 to 5 minute scaling-lag number, and show how you hide it: scheduled pre-scaling for the 9am pattern, warm pools, and explicit headroom."
}
\`\`\`
`.trim()

const capacityPlanningTeach = `
## From "how much traffic" to "how many machines"

Capacity planning is turning traffic numbers into machine counts you can defend on a whiteboard. The
core engine is **Little's Law**: in a stable system, the average number of requests *in flight*
equals arrival rate times average time-in-system.

\`\`\`
  L (concurrency) = lambda (RPS) x W (latency in seconds)
\`\`\`

If you serve 50,000 RPS and each request spends 100ms (0.1s) being processed, average concurrency is
\`50000 x 0.1 = 5000\` requests in flight simultaneously. That is the real sizing number: not RPS,
but *concurrent work*. If one instance can hold ~250 concurrent requests before its own latency
degrades, you need \`5000 / 250 = 20\` instances just to hold steady-state concurrency.

### Never size to 100%

You never size to 100% of steady state, for two reasons rooted in queueing theory. First,
**utilization and latency are not linear**. As utilization approaches 100%, queue length and wait
time explode toward infinity (the \`1/(1-rho)\` term): going from 70% to 90% utilization can double
or triple your p99. Second, you need slack to absorb bursts and GC/pause jitter. So you target **50
to 70% utilization**: 20 instances at a 70% target becomes \`20 / 0.7 = ~29\` instances.

\`\`\`cswidget
{
  "type": "calc",
  "title": "The utilization hockey stick",
  "predictPrompt": {
    "question": "Compared with a nearly idle system, how much longer does a request wait at 90% utilization?",
    "options": [
      "About 2x",
      "About 5x",
      "About 10x",
      "About 100x"
    ]
  },
  "workedExample": "At the lesson's 70% target, 'rho' = 0.7 gives a wait multiplier of 1 / (1 - 0.7) = about 3.3x the idle-system response time, leaving 30% headroom. Slide 'rho' to 0.9 and the multiplier jumps to 10x with only 10% headroom; at 0.95 it doubles again to 20x. Watch the sparkline stay almost flat until about 0.8, then turn vertical.",
  "inputs": [
    {
      "kind": "slider",
      "id": "rho",
      "label": "Utilization (rho)",
      "min": 0.1,
      "max": 0.99,
      "scale": "linear",
      "step": 0.01,
      "initial": 0.7
    }
  ],
  "outputs": [
    {
      "id": "wait_multiplier",
      "label": "Wait/response-time multiplier",
      "expr": "1 / (1 - rho)",
      "format": "number",
      "unit": "x",
      "sparkline": {
        "over": "rho"
      }
    },
    {
      "id": "headroom",
      "label": "Headroom",
      "expr": "1 - rho",
      "format": "percent"
    }
  ],
  "caption": "Queueing delay grows as 1/(1-rho): gentle below 0.7, explosive past 0.8. This curve is why you size to 50 to 70%, never 100%."
}
\`\`\`

### Redundancy math

You must survive failure of a whole **availability zone**, so you spread instances across (typically)
3 AZs and size so that *losing one AZ still leaves enough capacity*. This is **N+1** thinking at the
AZ level. If 29 instances serve peak at target utilization across 3 AZs, losing one removes a third
of the fleet; to keep the surviving two AZs at or below target after a zone loss, provision ~50%
more, so \`2/3\` of the fleet still covers 100% of peak. So ~29 becomes ~44 instances (roughly 15 per
AZ).

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A fleet of 30 instances serves peak at a 65% utilization target, spread evenly across 3 AZs, with no extra AZ factor applied. One AZ fails at peak. What happens to the 20 survivors?",
  "options": [
    {
      "label": "They are fine: the 35% headroom absorbs the loss",
      "feedback": "Tempting, because 35% headroom sounds bigger than a 33% capacity loss. But the math runs the other way: the survivors now carry 3/2 of their old load, so utilization jumps from 65% to about 98%, deep inside the queueing blow-up."
    },
    {
      "label": "Utilization jumps to about 98% and p99 explodes",
      "correct": true,
      "feedback": "Right. Work that needed 30 instances at 65% lands on 20, so utilization hits roughly 0.65 x 30 / 20 = 98%. The utilization target buys tail headroom in normal operation; surviving an AZ loss needs its own explicit N+1 factor on top."
    },
    {
      "label": "The load balancer sheds a third of the traffic, so nothing changes",
      "feedback": "Tempting, but a load balancer routes traffic, it does not create capacity. Unless you deliberately built load shedding, all of peak lands on the surviving two thirds of the fleet."
    }
  ]
}
\`\`\`

Finally, **peak-to-average ratio** sets autoscaling bounds and the reserved-vs-on-demand mix. Buy
**reserved/savings-plan** capacity for the always-on baseline (cheapest per hour), **on-demand** for
the predictable daily peak, and **spot** for burst or batch (cheapest but pre-emptible). You do not
reserve for peak, because peak is a small fraction of the day.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You have sized the fleet. Now match each slice of capacity to the purchase model that fits it.",
  "buckets": [
    "Reserved or savings plan",
    "On-demand",
    "Spot"
  ],
  "items": [
    {
      "label": "The always-on baseline that is still serving at 3am",
      "bucket": "Reserved or savings plan",
      "feedback": "It never turns off, so commit to it at the cheapest per-hour rate."
    },
    {
      "label": "The predictable daily peak above the baseline",
      "bucket": "On-demand",
      "feedback": "It runs only part of the day, so a full-time commitment would sit idle most hours. On-demand covers exactly the hours it exists."
    },
    {
      "label": "Interruptible nightly batch jobs",
      "bucket": "Spot",
      "feedback": "Restartable work tolerates pre-emption, so take the deepest discount."
    },
    {
      "label": "The single busiest traffic hour of the year",
      "bucket": "On-demand",
      "feedback": "Tempting to reserve for the scariest number, but a reservation bills every hour of the year while that peak lasts one. You do not reserve for peak; you let autoscaling and on-demand carry it."
    }
  ]
}
\`\`\`

**Interview nuance:** the fastest way to sound junior is to divide RPS by "requests per second per
server" and stop. The fastest way to sound senior is to (1) convert to concurrency with Little's Law,
(2) apply a utilization target and say *why* (queues explode near 100%), and (3) add explicit N+1 AZ
redundancy. State the estimation chain out loud: DAU x actions/user/day / 86,400s x peak multiplier =
peak RPS. Interviewers grade the *method*, not the exact number.

Recap: size with Little's Law (concurrency = RPS x latency), divide by a 50 to 70% utilization target
because queues blow up near 100%, add N+1 AZ redundancy so losing a zone stays above peak, and split
the resulting capacity across reserved/on-demand/spot by peak-to-average ratio.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Run the whole chain: 30,000 RPS at peak, each request spends 150ms in the system, one instance holds 300 concurrent requests before its tail degrades, 3 AZs. Which fleet size can you defend?",
  "options": [
    {
      "label": "100 instances: 30000 RPS divided by 300",
      "feedback": "This mixes a rate with a concurrency limit: 300 is how many requests an instance holds at once, not how many it serves per second. Dividing RPS by a per-server number and stopping is exactly the junior move the lesson warns about."
    },
    {
      "label": "15 instances: 30000 x 0.15 = 4500 in flight, divided by 300",
      "feedback": "The Little's Law step is right, but this sizes to 100% utilization with zero failover margin. The first burst pushes utilization toward 1 and the 1/(1-rho) blow-up wrecks p99, and an AZ loss is fatal."
    },
    {
      "label": "About 35 instances: 15, then utilization, then AZs",
      "correct": true,
      "feedback": "Right. Little's Law first: 30000 x 0.15 = 4500 in flight, and 4500 / 300 = 15 instances. Divide by the 0.65 utilization target because queues explode near 100%, which gives 23. Then multiply by 1.5 so the two surviving AZs still cover peak, which gives about 35. Concurrency, then a utilization target with a reason, then the AZ factor: that is the defensible chain."
    }
  ],
  "reveal": "In the design exercise, say the chain out loud: RPS x latency = concurrency, divide by per-instance concurrency, divide by a 50 to 70% utilization target, multiply by the N+1 AZ factor, then split the result across reserved, on-demand, and spot using the peak-to-average ratio. Interviewers grade the method, not the exact number."
}
\`\`\`
`.trim()

const cellShuffleShardingTeach = `
## Bounding the blast radius

The failure this lesson prevents: in a single global fleet, *any* systemic problem hits *everyone*. A
poison-pill request, a bad deploy, a runaway tenant, a corrupted cache entry: all of them can cascade
across the whole fleet because every node shares the same pool, the same code version, and the same
downstream dependencies. Cell-based architecture and shuffle sharding are the two techniques for
**bounding blast radius** so a failure takes down a slice, not the service.

Level 7's [reliability-side view of blast radius](/learn/system-design/reliability-ops/sd-l7-blast-radius-cells)
argues the principle and pairs it with static stability. This lesson is the partitioning mechanics:
how a cell is drawn, what the router may and may not be allowed to do, and the combinatorics that
turn a random subset of workers into a stated bound on how many tenants one bad neighbor can reach.

### Cells

**A cell is a complete, self-contained copy of the stack**: its own load balancer, service instances,
cache, and often its own database partition, serving a *subset* of users or tenants. Ten cells means
ten independent stacks, each carrying ~10% of traffic. Cells share almost nothing at runtime. The
point is a **fault domain**: a bad deploy, a resource exhaustion, or a poison request confined to
cell 3 affects only cell 3's ~10% of users. This is how AWS runs many services and how Slack and
Salesforce limit outage scope.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your fleet already spans 3 AZs with autoscaling. A release with a crashing bug ships through your normal global deploy. Who is affected?",
  "options": [
    {
      "label": "About a third of users, because an AZ is a fault domain",
      "feedback": "Tempting, because AZs really are fault domains, but only for infrastructure failures like a zone outage. A deploy pushes the same bad code to every AZ, so all three share the fault."
    },
    {
      "label": "Everyone: all AZs run the same code version",
      "correct": true,
      "feedback": "Right. AZ spread protects against the building burning down, not against your own release. Only a boundary that splits code version and rollout, like a cell, can cap a bad deploy."
    },
    {
      "label": "Almost no one: autoscaling replaces the crashing nodes",
      "feedback": "Tempting, but every replacement boots the same bad version and crashes the same way. Capacity cannot fix a code fault."
    }
  ]
}
\`\`\`

Routing to cells is done by a **thin, extremely simple, highly-available cell router**: it maps a
tenant/user ID to a cell (a lookup table or a hash) and forwards. The router must be *dumb and
rock-solid*, because it is the one shared component. You deploy changes **cell by cell**: canary cell
1, watch its metrics, then roll the rest. A bad release is caught at 10% blast radius instead of
100%.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Cells: one shared router in front of N independent stacks",
  "reveal": "all",
  "nodes": [
    {
      "id": "router",
      "label": "Cell router (dumb, HA, the only shared thing)",
      "kind": "lb"
    },
    {
      "id": "c1_lb",
      "label": "Cell 1 load balancer",
      "kind": "lb"
    },
    {
      "id": "c1_svc",
      "label": "Cell 1 service instances",
      "kind": "service"
    },
    {
      "id": "c1_data",
      "label": "Cell 1 cache and DB partition",
      "kind": "db"
    },
    {
      "id": "c2_lb",
      "label": "Cell 2 load balancer",
      "kind": "lb"
    },
    {
      "id": "c2_svc",
      "label": "Cell 2 service instances",
      "kind": "service"
    },
    {
      "id": "c2_data",
      "label": "Cell 2 cache and DB partition",
      "kind": "db"
    },
    {
      "id": "c3_lb",
      "label": "Cell 3 load balancer",
      "kind": "lb"
    },
    {
      "id": "c3_svc",
      "label": "Cell 3 service instances",
      "kind": "service"
    },
    {
      "id": "c3_data",
      "label": "Cell 3 cache and DB partition",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "router",
      "to": "c1_lb",
      "kind": "sync",
      "label": "tenant id maps to a cell"
    },
    {
      "from": "router",
      "to": "c2_lb",
      "kind": "sync"
    },
    {
      "from": "router",
      "to": "c3_lb",
      "kind": "sync"
    },
    {
      "from": "c1_lb",
      "to": "c1_svc",
      "kind": "sync"
    },
    {
      "from": "c1_svc",
      "to": "c1_data",
      "kind": "sync"
    },
    {
      "from": "c2_lb",
      "to": "c2_svc",
      "kind": "sync"
    },
    {
      "from": "c2_svc",
      "to": "c2_data",
      "kind": "sync"
    },
    {
      "from": "c3_lb",
      "to": "c3_svc",
      "kind": "sync"
    },
    {
      "from": "c3_svc",
      "to": "c3_data",
      "kind": "sync"
    }
  ],
  "groups": [
    {
      "id": "cell1",
      "label": "Cell 1 (tenants A to J)",
      "nodes": [
        "c1_lb",
        "c1_svc",
        "c1_data"
      ]
    },
    {
      "id": "cell2",
      "label": "Cell 2 (tenants K to T)",
      "nodes": [
        "c2_lb",
        "c2_svc",
        "c2_data"
      ]
    },
    {
      "id": "cell3",
      "label": "Cell 3 (tenants U to Z)",
      "nodes": [
        "c3_lb",
        "c3_svc",
        "c3_data"
      ]
    }
  ],
  "caption": "Nothing crosses a lane at runtime, which is the entire point: a poison request, a resource exhaustion or a bad deploy is confined to one cell's share of users. You deploy cell by cell, so a bad release is caught at 10 percent instead of 100. The bill is capacity fragmentation, because every cell carries its own headroom and cannot borrow a quiet cell's, plus a router you must obsess over because it is the one thing everybody shares."
}
\`\`\`

### Shuffle sharding

Shuffle sharding solves a finer-grained problem: noisy neighbors *within* a shared pool. Say you have
8 workers and you shard tenants into 4 fixed shards of 2 workers each: a single abusive tenant
saturates its 2 workers and takes down every tenant on that shard. Shuffle sharding instead gives
each tenant a *random subset* (say 2 of the 8 workers), chosen so that the probability any two
tenants share their *entire* subset is tiny. With 8 choose 2 there are 28 possible pairs; two tenants
fully overlap only 1-in-28 of the time. One bad tenant degrades only the handful of tenants who share
a worker, and *never* a tenant who shares zero workers. Combined with per-request fault isolation (a
client retries on its other worker), the practical blast radius of one bad tenant drops to a rounding
error. This is exactly how AWS Route 53 isolates customers.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Shuffle-shard overlap odds (2 workers per tenant)",
  "predictPrompt": {
    "question": "8 workers, each tenant assigned a random pair (28 possible pairs). You double the pool to 16 workers. What happens to the chance another tenant shares BOTH of your workers?",
    "options": [
      "It halves, from 1 in 28 to 1 in 56",
      "It drops about 4x, from 1 in 28 to 1 in 120",
      "It stays the same: there are just more tenants per worker"
    ]
  },
  "workedExample": "Start with the lesson's numbers: 8 workers, each tenant on a random pair, 28 possible pairs. The chance a specific other tenant holds exactly your pair is 2/8 x 1/7 = 1/28, about 3.6 percent. With 1000 tenants in the pool, expect about 1000 x 1/28, roughly 36 tenants who fully share your pair and go down with you. Slide workers to 32 and the odds fall to 2/32 x 1/31 = 1/496, about 0.2 percent: roughly 2 of the same 1000 tenants.",
  "inputs": [
    {
      "kind": "slider",
      "id": "n",
      "label": "Workers in the pool",
      "min": 4,
      "max": 32,
      "step": 1,
      "scale": "linear",
      "initial": 8
    },
    {
      "kind": "slider",
      "id": "customers",
      "label": "Tenants in the pool",
      "min": 100,
      "max": 1000000,
      "scale": "log",
      "initial": 1000
    }
  ],
  "outputs": [
    {
      "id": "pairProb",
      "label": "Chance another tenant shares BOTH your workers",
      "expr": "2 / n * (1 / (n - 1))",
      "format": "percent"
    },
    {
      "id": "expectedFullOverlap",
      "label": "Expected tenants sharing your exact pair",
      "expr": "customers * pairProb",
      "format": "number",
      "sparkline": {
        "over": "n"
      }
    }
  ],
  "caption": "Full overlap shrinks with roughly n squared: doubling the pool roughly quarters the chance any two tenants share their whole pair."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "8 workers serve many tenants, each tenant assigned to 2 workers. Plan A: 4 fixed shards of 2. Plan B: shuffle sharding, each tenant gets a random pair out of the 28 possible. One tenant floods its 2 workers. Compare which other tenants go fully down.",
  "options": [
    {
      "label": "The same either way: 2 workers are saturated in both plans",
      "feedback": "Tempting, because the dead hardware is identical. But blast radius is about who depends on exactly that pair: in Plan A it is every tenant on the shard, in Plan B it is almost nobody."
    },
    {
      "label": "Plan A takes down a quarter of tenants; Plan B almost none",
      "correct": true,
      "feedback": "Right. In Plan A every tenant on that fixed shard depends on exactly those 2 workers, so shard-mates share total fate and a full quarter goes down. In Plan B only the roughly 1-in-28 tenants holding the identical pair lose both of theirs; a tenant who overlaps on just one worker still has a healthy worker and survives with a retry."
    },
    {
      "label": "Plan B is worse: random pairs spread the flood across more tenants",
      "feedback": "Tempting, because random assignment does mean more tenants share one worker with the abuser. But sharing one worker is survivable via retry on the other; Plan A guarantees total loss for every shard-mate. Partial, survivable overlap beats concentrated, fatal overlap."
    }
  ]
}
\`\`\`

**Interview nuance:** the tradeoffs are real and you must name them. Cells cause **capacity
fragmentation**: each cell needs its own headroom, so ten cells cost more idle capacity than one big
pool, and a hot cell cannot borrow a quiet cell's spare capacity without rebalancing. **Cross-cell
operations** get hard: global queries, a tenant that outgrows a cell, moving tenants between cells.
And the **cell router becomes the critical shared dependency** you must obsess over. The honest
trade: higher cost and operational complexity for a hard ceiling on how many users any single failure
can hurt.

Recap: a cell is a self-contained stack serving a user subset behind a dumb HA router, so a bad
deploy or tenant is contained to one cell's ~10%, while shuffle sharding assigns each tenant a random
worker subset so full overlap between any two tenants is rare; you pay with capacity fragmentation
and harder cross-cell operations.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each statement by which mechanism delivers it, or whether it is part of the bill you agree to pay.",
  "buckets": [
    "Cells",
    "Shuffle sharding",
    "Cost you accept"
  ],
  "items": [
    {
      "label": "A bad deploy is caught at one canary slice instead of 100% of users",
      "bucket": "Cells",
      "feedback": "Cell-by-cell rollout means the blast radius of a bad release is one cell's share."
    },
    {
      "label": "Two tenants fully share fate only about 1 time in 28",
      "bucket": "Shuffle sharding",
      "feedback": "Random worker subsets make complete overlap between any two tenants statistically rare."
    },
    {
      "label": "A noisy tenant inside a shared pool degrades only the few tenants sharing a worker, never those sharing none",
      "bucket": "Shuffle sharding",
      "feedback": "This is the finer-grained, within-pool isolation that cells alone do not give."
    },
    {
      "label": "Each stack needs its own idle headroom, and a hot one cannot borrow a quiet one's slack",
      "bucket": "Cost you accept",
      "feedback": "Capacity fragmentation: ten pools of headroom cost more than one, and rebalancing is a project."
    },
    {
      "label": "Global queries and tenant migration need extra tooling",
      "bucket": "Cost you accept",
      "feedback": "Cross-cell operations get hard once cells share nothing at runtime."
    },
    {
      "label": "One dumb, rock-solid router is the shared dependency you must obsess over",
      "bucket": "Cost you accept",
      "feedback": "The router is the price of having any shared entry point at all: keep it thin, stateless, and over-provisioned."
    }
  ],
  "reveal": "In the design exercise, name the mechanism and its price in the same breath: cells cap any single failure at one cell's share of users, shuffle sharding makes full overlap between two tenants a rounding error, and you pay with fragmented headroom, harder cross-cell operations, and a router that must stay dumb and highly available."
}
\`\`\`
`.trim()

export const systemDesignLevel4: DesignLevel = {
  id: 4,
  slug: "scaling-compute",
  title: "Level 4: Scaling Compute & Traffic",
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
          title: "Stacked Load Balancer Tiers: L4 Edge, L7 Proxy Fleet",
          summary:
            "Why production stacks a content-blind L4 balancer at the edge in front of an L7 fleet that routes on path and terminates TLS.",
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
          title: "Load Balancing Algorithms: Round Robin vs Least Connections",
          summary:
            "Why least-connections beats round robin when request durations vary, and when to reach for power-of-two-choices or consistent hashing instead.",
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
              "Review the proposed gateway design below and rank its balancing and affinity decisions by how much damage each one does in production. For each decision you would change, say what the fleet actually experiences and what rule you would put in its place, and name the decisions you would keep untouched.",
            thinkAbout: [
              "The fleet ships four times a weekday and rotates all 300 nodes. What does an ownership rule keyed on liveNodeCount do each time?",
              "Message handling is 0.4ms at p50 and 900ms at p99. What does a rotation-based admission rule do with a spread that wide?",
              "One guild goes viral overnight. What in this design limits how much of it lands on a single node?",
              "Which decision here is already right, and what does it let the fleet survive?",
            ],
            modelAnswerOutline: [
              "Order the review by blast radius: guild ownership by hash(guildId) % liveNodeCount first, then weighted round robin for connection admission, then the missing overflow path for a hot guild. The state model is sound and stays.",
              "**Ownership keyed on liveNodeCount remaps almost every guild whenever the node count moves.** The fleet ships 4 times a weekday and rotates all 300 nodes, so the modulus changes repeatedly during each rollout and the guild-to-node mapping is effectively re-randomised. Every new owner takes a guild whose member list it does not hold and rebuilds it from the primary datastore, so each deploy becomes a fleet-wide cold-read stampede against that store. Consistent hashing or rendezvous hashing on guildId holds the movement to roughly 1/N of guilds per node change, which is the difference between a migration and a reshuffle.",
              "**Weighted round robin is blind to in-flight load, and this workload runs 0.4ms at p50 against 900ms at p99.** Rotation hands a node its next connection on its turn no matter how buried it is, so the node that just took a 100k-member guild broadcast keeps collecting new sockets. Least-outstanding-requests routes around it because its in-flight count is high; at 300 nodes with many balancer instances, run it as power-of-two-choices (pick two backends at random, send to the lighter) for O(1) cost with no global load table and no herd onto whichever node last looked idle. Worth noting that the weights are inert anyway: the design says instance sizes are uniform today.",
              "**Nothing caps one guild's share of its owner.** A single hash pins a viral guild to one node permanently, and fan-out for it is one owner-node loop, so that node saturates while the other 299 sit idle. Bounded-load consistent hashing puts a per-node cap on the ring and spills overflow to the next node; splitting fan-out for the largest guilds across a small replica set is the heavier alternative when one node cannot hold the member list at all.",
              "**Keep the state model.** Nothing in gateway memory is authoritative: membership, roles and channel config live in the primary datastore and the in-memory copy is a rebuildable read cache. That is what makes affinity here sound engineering rather than a smell, because pinning buys a cache-hit win and a node death costs a rebuild rather than data. Keep the 30-second drain with an explicit reconnect frame too; it is the reason a rollout is a reconnect blip instead of an outage.",
            ],
            supplied: {
              label: "Proposed design: gateway balancing",
              body: `
**Service.** The gateway tier for a chat product. Each node terminates roughly 40,000 live WebSocket
connections and holds per-guild fan-out state in memory: member list, presence, and the channel
subscription map for every guild it owns. The fleet is 300 nodes and ships 4 times on a normal
weekday, rotating every node.

**Connection admission.** New WebSocket connections are spread across the fleet by weighted round
robin, weighted by instance size. Instance sizes are uniform today, so every node takes an equal
share of new connections.

**Guild ownership.** Each guild is owned by exactly one node, selected as
hash(guildId) % liveNodeCount. Every gateway node computes the same function over the same
membership list, so a node that receives a message for a guild it does not own forwards it to the
owner over the internal mesh. Ownership therefore needs no coordination service and no lookup table.

**Fan-out.** The owner node holds the guild's member list in memory and pushes each message to the
subscribed sockets it holds locally, forwarding to peer nodes for members connected elsewhere. A
100k-member guild broadcast is a single loop on the owner; a two-person DM is a couple of writes.

**State durability.** Nothing in gateway memory is authoritative. Guild membership, roles and channel
config live in the primary datastore; the in-memory copy is a read cache that a node rebuilds on the
first message for a guild it has just taken over.

**Deploys.** Nodes are replaced in batches of 20. A node stops accepting new connections, sends a
reconnect frame to its sockets, waits 30 seconds for them to migrate, then exits. Clients reconnect
with jitter and are placed on a healthy node.

**Measured on a normal Tuesday.** Message handling is 0.4ms at p50 and 900ms at p99, with the tail
driven by the largest guilds.
`.trim(),
            },
            rubric: [
              {
                name: "Deploy churn under hash mod N",
                weak: "Reads guild ownership as fine, or calls it fragile without tying the churn to liveNodeCount changing during a rollout.",
                adequate:
                  "Names the modulus as the churn source but does not follow through to what every new owner then does to the primary datastore.",
                strong:
                  "Connects the four daily rollouts to a near-total guild remap, names the cold-read stampede on the primary datastore, and bounds movement to about 1/N with consistent or rendezvous hashing.",
              },
              {
                name: "Algorithm choice against duration spread",
                weak: "Leaves weighted round robin unchallenged, or objects to it without reference to the 0.4ms to 900ms spread.",
                adequate:
                  "Argues from the latency spread to a load-aware rule and stops at exact least-connections for a 300-node fleet.",
                strong:
                  "Rejects rotation on the strength of the p99, picks least-outstanding-requests, and drops to power-of-two-choices at 300 nodes to avoid an O(N) scan and the herd.",
              },
              {
                name: "Hot-guild containment",
                weak: "Never asks what happens when one guild's fan-out outgrows the single node that owns it.",
                adequate:
                  "Spots the viral-guild hotspot and settles for 'add capacity' or 'shard it somehow' without a mechanism.",
                strong:
                  "Reaches for bounded-load consistent hashing or an explicit fan-out split for the largest guilds, and prices what the overflow path costs in cache locality.",
              },
              {
                name: "Reading the sound parts",
                weak: "Rejects the design wholesale, rebuildable in-memory cache and 30-second drain included.",
                adequate:
                  "Leaves the state model unmentioned, so the review never separates a sound decision from a broken one.",
                strong:
                  "Keeps the non-authoritative in-memory cache and the drain-plus-reconnect-frame sequence, and says why affinity over rebuildable state is sound rather than a smell.",
              },
            ],
          },
        },
        {
          id: "sd-l4-health-checks",
          title: "Liveness vs Readiness: Draining & Graceful Rollout",
          summary:
            "Why conflating liveness with readiness crash-loops a warming node, and how draining and slow-start keep a rolling deploy from dropping requests.",
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
            "How callers find healthy instances when IPs change every minute, and whether the balancing decision belongs in a central LB or in each client.",
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
              "**LB decision: client-side via a service mesh** (Istio with Envoy sidecars, or Linkerd with its own Rust micro-proxy). It removes the central-LB hop, enables locality-aware and least-request routing (same-zone traffic cuts latency and cross-AZ cost), gives retries, circuit breaking, and mTLS uniformly, and keeps balancing logic out of each service's code (the sidecar handles it) while configuration stays central. The accepted tradeoff: running the mesh control plane and a sidecar per pod, and a dependence on fast endpoint propagation.",
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
          title: "GSLB & Anycast: Sub-Minute Regional Failover",
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
        {
          id: "sd-l4-api-gateway-bff",
          title: "API Gateway vs Service Mesh, and Where BFFs Fit",
          summary:
            "What belongs at an API gateway, what belongs in a BFF, and how to stop the edge rotting into a god-object full of business logic.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["gateway", "bff"],
          teach: {
            markdown: apiGatewayBffTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-api-gateway-bff-apply",
            prompt:
              "Design an API gateway layer for a microservices product with web, mobile, and partner API clients.",
            thinkAbout: [
              "What belongs at the gateway vs inside services vs the mesh?",
              "When is a BFF the right pattern?",
              "How do you keep the gateway from becoming a god-object?",
            ],
            modelAnswerOutline: [
              "Assumptions: 20-plus microservices and three client classes (a web SPA, native mobile apps, and third-party partners), all needing authentication, rate limiting, and consistent observability.",
              "**Layering:** a horizontally scaled, stateless API gateway (Envoy-based or Kong) as the single north-south entry point, owning the cross-cutting concerns exactly once: TLS termination, authentication (validate JWT/session), coarse authorization, rate limiting and quotas (tighter per-partner-key limits), routing to upstreams, and trace/metric/log injection. Service-to-service traffic inside the cluster does not go through this gateway: a service mesh handles east-west mTLS, retries, and inter-service load balancing. Domain business logic lives inside the owning services, never at the edge.",
              "**BFFs:** the three clients have genuinely different needs, so a BFF per client type sits behind the gateway. bff-mobile returns small, denormalized, single-round-trip payloads to protect battery and radio; bff-web composes richer views; bff-partner exposes a stable, explicitly versioned contract with stricter quotas. Each BFF aggregates the handful of service calls its screens need, killing mobile over-fetching and the 'five calls to render one page' problem, and each is owned by that client's team so shape changes do not ripple. (If field-level flexibility dominates, GraphQL can replace hand-written BFFs, accepting its caching and query-cost tradeoffs.)",
              "**Keeping it thin and available:** the gateway is a SPOF and a latency tax, so run several stateless replicas behind the load balancer, health-check them, cache authz decisions and hot responses, and keep per-request work minimal. Hold an explicit rule against the god-object: the gateway does cross-cutting concerns, routing, and (in BFFs) client-shaped aggregation only; orchestration of domain workflows stays in services. Versioning and canary routing live at the edge so 5% of traffic can shift to a new version and roll back at the router.",
              "Common wrong turn: letting the gateway accrete business logic until it is a distributed monolith where every feature change needs a gateway deploy, or routing internal service-to-service calls through the public gateway instead of the mesh.",
            ],
          },
          practice: {
            id: "sd-l4-api-gateway-bff-practice",
            prompt:
              "Design the API gateway and BFF layer for Netflix-scale streaming, where a single home-screen load fans out to dozens of microservices (recommendations, artwork, continue-watching, billing status) and the same backend must serve TVs, phones, browsers, and game consoles with wildly different capabilities. Lead with the request topology.",
            thinkAbout: [
              "Why does one generic API fail across TVs, phones, and consoles?",
              "At a dozens-of-services fan-out, what must happen when one non-critical service is slow?",
              "Which fields fail differently from cosmetic ones?",
            ],
            modelAnswerOutline: [
              "**Topology:** an anycast edge terminates TLS and hands off to a scaled API gateway (Zuul-style) doing authn, rate limiting, and routing, then to a device-specific BFF/edge-aggregation layer that fans out to dozens of services and composes one home-screen response. The home screen is the classic aggregation case: recommendations, per-row artwork, continue-watching state, and billing/entitlement status come from different services, and the client should get one composed payload, not make forty calls over a phone radio.",
              "**Device diversity is why one generic API fails:** a 4K TV, a low-end Android phone, and a console differ in screen size, codec support, memory, and network. The aggregation layer is device-aware: it shapes payloads (image resolutions, row counts, field sets) per device class, ideally driven by device capability metadata. Netflix's real answer let device teams run their own adapter logic at the edge so each client controls its own shaping: the BFF idea taken to its scaled conclusion.",
              "**Resilience dominates at this fan-out:** because one screen depends on dozens of services, the aggregator must degrade gracefully. Wrap each downstream in a circuit breaker and timeout (Hystrix-style); when a non-critical service (a single recommendation row) is slow or down, return the screen without that row rather than failing the whole load. Critical fields (is the account active, is playback allowed) fail differently from cosmetic ones.",
              "**Caching and thinness:** hot shared responses (artwork, common rows) cache at the edge to cut fan-out volume. The gateway stays thin and stateless; per-device shaping and partial-failure composition live in the aggregation/BFF layer; domain logic stays in the individual services.",
            ],
          },
        },
        {
          id: "sd-l4-tls-connection-mgmt",
          title: "Connection Management: TLS Offload, Pooling & gRPC Pinning",
          summary:
            "Where to terminate TLS, and why a long-lived gRPC or WebSocket connection pins to one backend so your scale-up adds pods that get no traffic.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["tls", "connection-management"],
          teach: {
            markdown: tlsConnectionMgmtTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-tls-connection-mgmt-apply",
            prompt:
              "Decide where to terminate TLS for an API platform and how to keep backend connection counts sane at 100k concurrent clients.",
            thinkAbout: [
              "What is the tradeoff of edge TLS termination vs end-to-end/mTLS?",
              "Why do long-lived multiplexed gRPC/WebSocket connections defeat L7 balancing?",
              "How do pooling and keep-alive avoid port exhaustion?",
            ],
            modelAnswerOutline: [
              "Assumptions: an API platform with 100K concurrent clients, a mix of HTTP/1.1, HTTP/2, and gRPC, running on an internal network that is not fully trusted, with a low-p99 SLO.",
              "**TLS termination:** terminate public TLS at the edge / L7 load balancer (Envoy or ALB) so the crypto-heavy handshake is offloaded from backends and certificates are managed centrally, with SNI for multi-hostname routing and automated rotation (ACME/internal CA). Because the internal network is untrusted, do not leave the internal hop plaintext: re-encrypt with mTLS from edge to services via a mesh that issues and rotates sidecar certs. Cheap edge offload plus a zero-trust interior. If the threat model forbids plaintext anywhere including inside the LB, push toward full end-to-end TLS and accept the CPU.",
              "**Connection counts:** naively, 100K clients opening fresh connections per request burns CPU on handshakes and exhausts ephemeral ports on the proxy-to-backend hop. Use keep-alive to reuse connections and connection pooling so the edge holds a bounded warm pool per backend, making backend connection count a function of concurrency and pool size rather than request rate. Run event-driven proxies (epoll-based nginx/Envoy) and tune the OS (fd limits, ephemeral port range, TCP buffers, SO_REUSEPORT).",
              "**The gRPC/H2 trap:** gRPC clients open one long-lived H2 connection and stream thousands of RPCs over it, all pinned to the backend chosen at connect time. Terminating gRPC at a naive L7 LB means a scale-up adds pods that get zero traffic. Fix by balancing per request/stream at an Envoy-style proxy that understands H2 streams, or client-side load balancing where clients resolve all backends and spread RPCs, plus max-connection-age so connections cycle and clients re-resolve after scaling events. WebSockets get the same treatment: plan for draining and rebalancing on scale-up.",
              "Common wrong turn: terminating H2/gRPC at an L7 LB and discovering streams pinned to one backend, so new capacity sits idle and one pod is hot while others are cold.",
            ],
          },
          practice: {
            id: "sd-l4-tls-connection-mgmt-practice",
            prompt:
              "Design connection and TLS management for a real-time trading or chat platform holding 5 million concurrent WebSocket connections across a fleet, where backends scale up and down through the day and a dropped connection is a user-visible event. Lead with how you spread and rebalance those long-lived connections.",
            thinkAbout: [
              "Why does L7 rebalancing not help an already-open WebSocket?",
              "How do new nodes ever acquire connections after a scale-up?",
              "What makes a scale-down drain invisible instead of dropping 300K users at once?",
            ],
            modelAnswerOutline: [
              "**Spreading them:** 5M concurrent long-lived WebSockets cannot land on one tier, so front them with a fleet of event-driven edge/gateway nodes (Envoy or a custom epoll-based server), each holding a few hundred thousand sockets, behind an L4 anycast/NLB layer. Balance at L4 on connect and spread with consistent hashing so adding or removing an edge node remaps only a small fraction of new connections. TLS terminates at these edge nodes: the handshake happens once per connection, so with millions of persistent sockets it amortizes to near zero and the real cost is memory per connection, which is why event-driven (not thread-per-connection) is mandatory. Re-encrypt internally with mTLS to the message-routing services.",
              "**The hard part is pinning:** a WebSocket is bound to the edge node it connected to for its lifetime, so L7 rebalancing does not help an open socket. On scale-up, new nodes get zero existing connections and only pick up new ones, so add connection-age limits / graceful cycling to bleed some connections onto new capacity over time, and bias new client connects toward the least-loaded nodes via the resolver.",
              "**Scale-down: drain.** Stop routing new connects to the node, then let client reconnect logic move sockets off it gradually rather than dropping 300K users at once.",
              "**Because a drop is user-visible:** clients have automatic reconnect with jittered backoff (avoiding a thundering herd all reconnecting at once), and the server supports fast session resume so a reconnect restores subscriptions without a full re-auth round trip.",
              "**OS and safety:** file descriptors in the millions across the fleet, ephemeral port tuning, TCP keepalive for dead-peer detection, and per-node connection caps so no single node tips over.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l4-m3",
      title: "Rate Limiting & Overload",
      description:
        "Keep a service alive when demand exceeds supply: pick a rate-limiting algorithm with an exact response contract, enforce one global limit across a fleet, and shed load by priority instead of collapsing.",
      lessons: [
        {
          id: "sd-l4-rate-limit-algorithms",
          title: "Rate Limiting Algorithms: Token Bucket vs Sliding Window",
          summary:
            "Why a fixed window lets a client send double its limit in two seconds, and what token bucket and sliding-window counter do about it.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["rate-limiting", "token-bucket"],
          teach: {
            markdown: rateLimitAlgorithmsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-rate-limit-algorithms-apply",
            prompt:
              "Write the algorithm for an API rate limiter that allows short bursts but enforces a steady long-run rate, and state the counters it stores per user.",
            thinkAbout: [
              "Which algorithm allows bursts vs smooths output?",
              "What is the fixed-window boundary-spike bug?",
              "What is the client-facing response contract?",
            ],
            modelAnswerOutline: [
              "Assumptions: a public REST API where each user (keyed by API key) gets 100 requests per minute steady state with a natural burst of up to 20 rapid requests after idle; O(1) memory per key; the decision runs inline on every request.",
              "**Algorithm: token bucket** with capacity B = 20 (max burst) and refill rate R = 100/60 ~ 1.67 tokens/sec (steady rate). Per user, store exactly two fields: `tokens` (a float) and `last_refill_ts`.",
              "**Per request:** compute elapsed = now - last_refill_ts; lazily refill `tokens = min(B, tokens + elapsed * R)`; update last_refill_ts; if tokens >= 1, decrement and allow; else reject with 429 and `Retry-After = ceil((1 - tokens) / R)`. An idle client accumulates up to 20 tokens and can fire a 20-request burst instantly, then throttles to 100/min as tokens refill. Two numbers per user, no queue.",
              "**Why not the alternatives:** fixed window (one counter per minute) is cheaper but has the boundary-spike bug: 100 requests in the last second of minute N plus 100 in the first second of minute N+1 = 200 in ~2 seconds, double the intended rate. Leaky bucket smooths output but forbids the bursts the requirement wants and adds queueing latency. Sliding-window log is accurate but stores a timestamp per request: wasteful here.",
              "**Response contract:** on allow, return RateLimit-Limit, RateLimit-Remaining (floor of current tokens), and RateLimit-Reset. On reject, 429 Too Many Requests with Retry-After set to when one token will be available. If the state store is unreachable, fail open (allow) and lean on downstream load shedding, because a limiter outage should not become a full API outage.",
              "Common wrong turn: a plain fixed-window counter 'because it is simple,' shipping the 2x boundary-spike bug, or omitting the 429 / Retry-After contract so clients cannot tell they are throttled and retry-storm the API.",
            ],
          },
          practice: {
            id: "sd-l4-rate-limit-algorithms-practice",
            prompt:
              "Design the rate-limiting tiers for Stripe-style payment APIs where a single merchant may legitimately batch thousands of charges at midnight but a compromised key must be contained fast. Choose the algorithms per tier and justify.",
            thinkAbout: [
              "Why can one flat limit not serve both the nightly batch and the fraud case?",
              "What does an anomaly-triggered clamp add that static limits cannot?",
              "Why does the payment tier invert the usual fail-open default?",
            ],
            modelAnswerOutline: [
              "Assumptions: payments API keyed per API key, with two opposing concerns: a legitimate merchant running a nightly billing job wants a large controlled burst, while a leaked key doing fraud must be stopped within seconds. One flat limit cannot serve both, so use layered limits with different algorithms per layer.",
              "**Layer 1, per-key steady rate: token bucket** with generous capacity (B = 500) and refill R = 100/sec, so the nightly batch drains its bucket in a burst then proceeds at the sustained rate. Token bucket is right because the merchant's burst is legitimate and expected. Publish the numbers so clients can pace their jobs.",
              "**Layer 2, hard ceiling: sliding-window counter** at a coarser granularity (per-hour) to cap total volume even if the token bucket is continuously refilled: catches sustained abuse that stays just under the per-second bucket, without the fixed-window boundary spike.",
              "**Layer 3, anomaly-triggered clamp:** payments are money, so add a fast reactive control: if a key's charge rate or failure/decline rate jumps far above its own trailing baseline (a fraud signal), automatically drop that key to a tiny emergency limit and alert. This is the 'contain a compromised key fast' requirement; no static limit provides it.",
              "**Contract:** 429 with Retry-After, and critically the API requires idempotency keys so a client retrying after a 429 cannot double-charge. **Fail closed** at the payment tier when the limiter state store is unavailable for a suspicious key: unusual for public APIs but correct here, since wrongly allowing a fraud burst is worse than briefly rejecting legitimate traffic, and legitimate merchants retry safely via idempotency keys.",
            ],
          },
        },
        {
          id: "sd-l4-distributed-rate-limiting",
          title: "Global Rate Limits Across a Fleet: Redis Atomics & Sync",
          summary:
            "Naive per-node limits grant Nx; enforce exactly with atomic Redis ops or hybrid local-cache-plus-async-sync for bounded overshoot, always with a fail-open plan.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["rate-limiting", "distributed", "redis"],
          teach: {
            markdown: distributedRateLimitingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-distributed-rate-limiting-apply",
            prompt:
              "Extend a single-node rate limiter to a fleet of 20 gateway nodes without letting a user get 20x their limit.",
            thinkAbout: [
              "How do you keep the shared counter atomic under races?",
              "What is the tradeoff of local approximation vs centralized exactness?",
              "What happens if the shared store (Redis) is down?",
            ],
            modelAnswerOutline: [
              "Assumptions: 20 stateless gateway nodes behind an L7 load balancer, a user keyed by API key lands on any node, target 100 req/min per key, tight p99 budget. The naive design where each node independently enforces 100/min is the bug: it yields up to 2000/min per user.",
              "**Design: a hybrid limiter with a shared Redis backing store.** The per-request hot path checks a local token cache on the node (in-memory), so most decisions cost zero network. Every node asynchronously syncs its consumed tokens to Redis on a short interval (100ms) and receives an updated view of global consumption plus its re-divided share of the remaining budget. The effective limit stays close to 100/min with overshoot bounded to roughly one sync interval of traffic, not 20x.",
              "**Atomic shared state:** for a plain counter, `INCR` (returns the post-increment value in one round trip) and reject when it exceeds the limit, avoiding the read-modify-write race where two nodes both read 99 and both allow. For token-bucket semantics (refill by elapsed time, then decrement), a Lua script via EVAL executes atomically so concurrent nodes cannot interleave and overshoot.",
              "**The explicit tradeoff:** pure centralized-exact (Redis on every request) is most accurate but adds 0.5-1ms per call and makes Redis a hot dependency; pure local approximation (budget/N per node) is fastest but goes fuzzy under uneven balancing and wastes idle nodes' shares. The hybrid buys most of the accuracy for most of the speed: right for a 20-node fleet.",
              "**Failure handling:** if Redis is unreachable, nodes fail open to a conservative local limit (budget/N) and rely on downstream load shedding as the real backstop, because a limiter outage must not become a total API outage. Shard hot keys across Redis slots (or serve them from local cache with looser sync), and align windows using the store's clock or logical windows to avoid per-node clock skew.",
              "Common wrong turn: independent per-node limits 'because the nodes are stateless' (silently grants 20x), or centralizing on Redis with a non-atomic GET-then-INCR that races and overshoots under concurrency.",
            ],
          },
          practice: {
            id: "sd-l4-distributed-rate-limiting-practice",
            prompt:
              "Design global rate limiting for a CDN edge with 200 points of presence across the globe where the per-customer limit must hold worldwide but a synchronous call to a central store on every request would add unacceptable latency. Justify your consistency choice.",
            thinkAbout: [
              "Why is strict centralized exactness off the table by requirement here?",
              "How do budget leases follow live demand across regions?",
              "What is the honest bound on overshoot, and why is it acceptable?",
            ],
            modelAnswerOutline: [
              "Assumptions: 200 geographically distributed PoPs, a customer with a global limit of say 1M req/min, and a synchronous round trip from Tokyo to a US store adding 100ms+ per request: unacceptable for a CDN whose value is latency. Strict centralized exactness is off the table by requirement; approximate and be honest about the consistency window.",
              "**Design: hierarchical, eventually-consistent budgeting.** A central coordinator (or regional tier of coordinators) holds the authoritative global budget and hands out **leases** of budget to each PoP, proportional to that PoP's recent share of the customer's traffic. Within a PoP, nodes enforce against the local lease using in-memory token buckets: the hot path is entirely local, zero cross-region latency. PoPs report consumption and renew leases asynchronously every 250ms to 1s, and the coordinator re-divides the remaining budget toward live demand.",
              "**Consistency choice, stated deliberately:** bounded eventual consistency on the global limit. Overshoot is capped at roughly the sum of one refresh interval's in-flight traffic across regions: a small percentage of a 1M/min limit. Perfect global exactness is not worth adding 100ms to every request; rate limits are a coarse abuse control, not a financial ledger.",
              "**Failure and shifts:** if the coordinator is unreachable, each PoP fails open to its last known lease (or a conservative default) rather than blocking traffic, with origin shielding / load shedding as the real backstop. A viral event moving load to one region is absorbed as leases re-divide toward live demand within an interval; until then the affected region briefly under- or over-limits, which is acceptable.",
              "This is essentially how large CDNs and Envoy-style global rate limiting operate: local speed, async global truing, fail-open safety.",
            ],
          },
        },
        {
          id: "sd-l4-load-shedding-backpressure",
          title: "Congestion Collapse & Adaptive Concurrency",
          summary:
            "Why an unbounded queue turns 150 percent load into zero throughput, and what adaptive concurrency limits, priority load shedding and brownout do instead.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["load-shedding", "backpressure", "concurrency"],
          teach: {
            markdown: loadSheddingBackpressureTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-load-shedding-backpressure-apply",
            prompt:
              "Design overload protection so that at 150% of capacity the service stays up and still serves its most important traffic.",
            thinkAbout: [
              "How do you shed the right traffic first?",
              "Why are adaptive concurrency limits better than static thresholds?",
              "How do bounded queues and deadline propagation prevent collapse?",
            ],
            modelAnswerOutline: [
              "Assumptions: an API service with ~10k RPS capacity before latency degrades, hit with 15k RPS (150%). Success: stay up, keep p99 bounded for admitted traffic, and preserve the highest-value requests while dropping the rest cleanly.",
              "**Layer 1, priority-aware admission control at the edge:** every request is tagged with a priority tier (critical: auth, payments, writes; normal: interactive reads; low: bulk exports, prefetch, retries). Over threshold, shed from the bottom tier up: at 150% the low tier is rejected fast with 503/429 + Retry-After, normal is partially shed, critical is protected. Rejecting in ~1ms is nearly free; the expensive mistake is accepting, queuing for seconds, then failing, burning capacity critical traffic needed.",
              "**Layer 2, adaptive concurrency limits instead of a static cap:** each node runs a gradient limiter (Netflix adaptive-concurrency / TCP-Vegas style) that raises its concurrency limit while measured latency stays flat and backs off when latency rises. By Little's Law (concurrency = throughput x latency) this tracks true current capacity even as a downstream slows: something a static threshold cannot do. Requests beyond the limit are shed by priority.",
              "**Layer 3, bounded queues plus deadline propagation:** every internal queue is bounded and returns a fast 503 when full: never unbounded (that hides overload until OOM). Each request carries a deadline propagated through the call chain; any request whose deadline has passed is dropped without processing.",
              "**On top: brownout and retry hygiene.** Shed features, not just requests: cached or partial responses, skip optional calls (recommendations, personalization) so the core path stays fast. Clients use exponential backoff with jitter, circuit breakers trip on failing dependencies, so a retry storm does not amplify 150% into 400%.",
              "**Net effect:** at 150% load the service admits roughly its 100% of highest-value traffic, sheds the rest quickly and legibly, and keeps latency bounded: rather than accepting everything and collapsing to zero throughput.",
              "Common wrong turn: an unbounded queue to 'absorb the spike' (grows until OOM and takes down critical traffic too), or a static concurrency threshold that is wildly wrong the moment dependency latency changes.",
            ],
          },
          practice: {
            id: "sd-l4-load-shedding-backpressure-practice",
            prompt:
              "Design overload protection for a Black Friday checkout service that gets a 5x traffic spike where dropping a checkout costs real revenue but the payment provider has a hard fixed TPS ceiling you cannot exceed. Justify what you shed and what you queue.",
            thinkAbout: [
              "Why is a checkout not droppable the way a read is, and what does that imply?",
              "Which algorithm smooths a 20k spike into a fixed 5k TPS drain?",
              "What bounds the checkout queue so late charges never happen?",
            ],
            modelAnswerOutline: [
              "Assumptions: checkout normally peaks at 4k RPS, Black Friday brings ~20k RPS (5x). Two constraints pull against each other: dropped checkouts are lost revenue, but the payment provider enforces a fixed TPS ceiling (say 5k) that must never be exceeded. This is not 'shed to survive'; it is 'smooth to the payment ceiling while preserving intent.'",
              "**Queue the money path, shed everything around it.** A checkout represents real revenue and intent, so do not reject excess checkouts. Put confirmed checkouts into a bounded, durable queue (Kafka or SQS) and drain into the payment provider at a leaky-bucket rate matched to the ceiling (5k TPS): exactly the leaky-bucket use case, protecting a hard-throughput downstream. Users see 'order confirmed, processing' (async completion) rather than an error.",
              "**What gets shed:** everything not on the money path. Recommendation carousels, related items, live inventory refresh, and personalization are browned out or served from cache so fleet capacity goes to accepting and enqueuing checkouts. Best-effort and retry traffic is shed first with 503 + Retry-After.",
              "**Guardrails:** the checkout queue is bounded with a sane max depth and a per-request deadline: if a checkout would sit past the point where the payment authorization or cart lock expires, drop it explicitly and tell the user to retry rather than charge late. Idempotency keys prevent a double-charge on retried confirmations; a circuit breaker on the payment provider stops feeding it if it degrades. Adaptive concurrency governs the web tier so accepting-and-enqueuing stays fast.",
              "**The justification of the split:** queue the payment path because each item is scarce, high-value, and the downstream constraint is a rate ceiling that queuing directly solves; shed the surrounding features because they are cheap to lose and their capacity is better spent capturing revenue.",
              "Common wrong turn: an unbounded checkout queue that promises everyone success then melts, or naively shedding checkouts as if they were droppable reads.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l4-m4",
      title: "Autoscaling & Isolation",
      description:
        "Match compute to demand with reactive, event-driven, and predictive autoscaling despite scaling lag, size fleets from Little's Law plus redundancy math, and bound blast radius with cells and shuffle sharding.",
      lessons: [
        {
          id: "sd-l4-autoscaling",
          title: "Autoscaling Lag: Warm Pools, Pre-Scaling & Headroom",
          summary:
            "Scale on leading signals (queue depth, RPS) not lagging CPU, and hide the 2-5 minute reactive lag with warm pools, scheduled pre-scaling, and standing headroom.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["autoscaling", "keda", "capacity"],
          teach: {
            markdown: autoscalingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-autoscaling-apply",
            prompt:
              "Design autoscaling for a service with a sharp 10x traffic spike every day at 9am and unpredictable bursts otherwise.",
            thinkAbout: [
              "Which signal (CPU vs queue depth vs RPS) should trigger scaling?",
              "Why does reactive scaling always trail a fast burst?",
              "How do warm pools and scheduled pre-scaling help?",
            ],
            modelAnswerOutline: [
              "Assumptions: a stateless request-serving fleet on Kubernetes, baseline ~100 pods, 9am peak needs ~1000 pods, SLO p99 < 200ms. The 9am spike is predictable; the other bursts are not. Split the problem: the known spike and the unknown bursts need different tools.",
              "**The known 9am 10x: scheduled pre-scaling.** A scheduled scaler (CronJob patching the HPA min, or AWS Scheduled Scaling) raises the replica floor from 100 to ~1000 at 8:50am, so capacity is warm and serving before the first user hits. This sidesteps scaling lag entirely: you anticipate the spike rather than react. A predictive autoscaler that learns the daily curve backstops it.",
              "**The unpredictable bursts, two moves.** First, scale on a leading metric: RPS-per-pod or in-flight concurrency via a custom metric, not CPU, so the HPA reacts to load arriving rather than CPU already pegged; for async work, KEDA on queue depth reacts before utilization moves at all. Second, the key point: reactive scaling cannot catch a sharp burst because scaling lag (scrape + decide + node boot + warmup) is 2 to 5 minutes, and a 20-second burst overwhelms you long before pods are ready.",
              "**Cover the lag:** a warm pool of pre-booted nodes turns scale-out from minutes into ~15 seconds, and standing headroom (target 60% utilization, not 95%) lets the existing fleet absorb the first minute of any burst while real capacity spins up.",
              "**Underneath:** the Cluster Autoscaler / Karpenter must keep spare node capacity so HPA's new pods have somewhere to land. Bound HPA min/max by peak-to-average ratio so cost stays sane off-peak (scale the floor back down after 9am).",
              "**Tradeoffs:** pre-scaling and headroom cost money for idle capacity: the price of meeting p99 under bursts. Common wrong turn: claiming 'the HPA will handle it': on a 20-second burst the HPA is still 3 minutes behind. Anticipate the known, buffer the unknown.",
            ],
          },
          practice: {
            id: "sd-l4-autoscaling-practice",
            prompt:
              "Review the autoscaling configuration below and walk through what the transcode fleet does when a 500-upload wave lands after an idle hour. Rank the changes you would make by what each one costs today, name the signal you would scale on, and say which decisions you would keep.",
            thinkAbout: [
              "A worker mid-transcode pins a core for the whole job. What does the 70% CPU target read while 500 jobs sit in the queue?",
              "Jobs run up to 300 seconds and the pod termination grace period is 30. What does a scale-down event do to work in flight?",
              "The live path has a 5-second startup budget. Which part of this configuration is aimed at meeting it?",
              "Which decisions here are already right for a workload where a lost job can simply be re-driven?",
            ],
            modelAnswerOutline: [
              "Rank by what each costs today: the scaling signal, then the termination grace period, then the live path sharing the batch deployment. The spot choice and the 600-second visibility timeout are right and stay.",
              "**A 70% CPU target cannot see the wave.** A worker mid-transcode pins a core for the full 30 to 300 seconds, so average fleet CPU reads near 100% with two pods busy and 500 jobs waiting, and near zero with the same two pods idle and an empty queue. CPU tracks how hard the current jobs are, not how much work is pending, so the HPA only moves after the first jobs finish. Scale on SQS queue depth with KEDA: the backlog moves the instant arrivals outrun the drain, and it is the only signal that lets this fleet scale to zero between waves, which is the cost line the design says it cares about. Set a backlog-per-worker target, say one worker per 5 queued jobs, so a 500-job wave asks for about 100 workers in a single decision.",
              "**A 30-second grace period under jobs that run 300 seconds means scale-down destroys work in flight.** A pod picked for removal gets 30 seconds and then SIGKILL, so a transcode four minutes in is abandoned. SQS does redeliver it, but only once the 600-second visibility timeout expires, so that upload's end-to-end latency becomes its own runtime plus ten minutes and its CPU is paid for twice. Raise the grace period above the longest job and drain by refusing new pulls, or checkpoint long transcodes into segments so a kill costs one segment rather than the whole job.",
              "**The live path does not belong on this deployment.** Live transcoding with a 5-second startup budget shares a queue with batch jobs that run for minutes, so it waits behind them, and it shares a spot fleet where a reclaim is unrecoverable because re-driving a live stream is meaningless. Give it its own queue and an on-demand pool with a standing floor: a 90-second Karpenter node plus the usual 2 to 5 minute reactive pipeline cannot serve a 5-second budget under any signal. Batch keeps spot.",
              "**Changing the signal does not remove the lag.** Even on queue depth, a fresh Karpenter node still takes about 90 seconds to join and pull the transcoder image, so the front of a wave waits. A warm pool of pre-booted nodes or a small standing buffer covers that first minute. For batch transcoding a 90-second wait may simply be acceptable, and saying so explicitly is stronger than implying KEDA made the lag disappear.",
              "**Keep:** spot for batch, since a lost job returns to SQS and the 600-second visibility timeout already sits above the 300-second maximum job, and Karpenter for node supply. Both are correct for a retryable, interruption-tolerant workload.",
            ],
            supplied: {
              label: "Proposed autoscaling config: transcode",
              body: `
**Workload.** Uploads land in S3 and an event enqueues one transcode job per upload onto SQS. A
worker fleet on Kubernetes pulls jobs. Each job runs 30 to 300 seconds and pins a core for its whole
duration. Waves are bursty and unpredictable: a quiet hour, then 500 uploads in two minutes.

**Scaling policy.** An HPA on the worker deployment targets 70% average CPU across the fleet, metrics
scraped every 30 seconds, with a 5-minute stabilization window on scale-down. Min replicas 2, max
replicas 400.

**Nodes.** Karpenter provisions compute-optimized nodes when pods go unschedulable. A fresh node
takes about 90 seconds to join the cluster and pull the transcoder image.

**Cost.** The worker fleet runs entirely on spot instances. The reasoning: a transcode job is pure
recompute, so an interrupted job is re-driven at no cost beyond the CPU. SQS redelivers any message
whose visibility timeout lapses, and the visibility timeout is set to 600 seconds, above the longest
job we have measured.

**Scale-down.** When average CPU falls below target the HPA removes pods. The deployment sets
terminationGracePeriodSeconds to 30, matching the platform default for the other services in this
cluster.

**Live jobs.** Roughly 3% of traffic is live-stream transcoding with a 5-second startup budget. It
runs on the same deployment, off the same queue, so there is one fleet to operate and one set of
dashboards.
`.trim(),
            },
            rubric: [
              {
                name: "Scaling signal",
                weak: "Accepts CPU as the trigger, or swaps in queue depth without saying what CPU reads on a core-pinned worker.",
                adequate:
                  "Names queue depth as the right signal but connects it to neither scale-to-zero nor a backlog-per-worker target.",
                strong:
                  "Shows that a core-pinned worker reads the same at 0 and 500 queued jobs, moves to SQS depth via KEDA, and sets a backlog-per-worker ratio the wave can be sized against.",
              },
              {
                name: "Scale-down against long jobs",
                weak: "Does not register that a 30-second grace period sits under a job that can run 300 seconds.",
                adequate:
                  "Flags the grace period but does not trace what redelivery then costs in end-to-end latency and repeated CPU.",
                strong:
                  "Puts the grace period above the longest job or checkpoints into segments, and prices the alternative as the job's runtime plus the 600-second visibility timeout.",
              },
              {
                name: "Live path isolation",
                weak: "Treats live and batch as one workload, so the 5-second startup budget is never tested against the configuration.",
                adequate:
                  "Separates live from batch without saying why spot reclaims and 90-second node provisioning are the specific obstacles.",
                strong:
                  "Splits live onto its own queue and an on-demand floor, arguing from the 5-second budget against 90-second Karpenter nodes and unrecoverable spot reclaims.",
              },
              {
                name: "Residual scaling lag",
                weak: "Presents the signal change as if it removed the wait for capacity entirely.",
                adequate:
                  "Acknowledges node boot time and stops there, with no warm pool, no headroom, and no statement that the wait is acceptable.",
                strong:
                  "Keeps the 90-second node provision in view after the signal change and either buys a warm pool and headroom or states plainly that batch transcoding can absorb it.",
              },
              {
                name: "What survives review",
                weak: "Rejects the configuration wholesale, spot instances and Karpenter included.",
                adequate:
                  "Keeps spot without stating what makes this particular workload safe to interrupt.",
                strong:
                  "Keeps spot and Karpenter for batch and justifies it from re-drive: an interrupted job returns to SQS and the 600-second timeout already covers the 300-second maximum.",
              },
            ],
          },
        },
        {
          id: "sd-l4-capacity-planning",
          title: "Capacity Planning & Back-of-Envelope Sizing",
          summary:
            "Turn RPS and latency into a defensible instance count with Little's Law, a utilization target, and an explicit N+1 availability-zone factor.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["capacity", "sizing", "littles-law"],
          teach: {
            markdown: capacityPlanningTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-capacity-planning-apply",
            prompt:
              "Size the fleet for a service that must serve 50k RPS at p99 < 200ms and survive one AZ failure.",
            thinkAbout: [
              "How does Little's Law convert RPS and latency into instance count?",
              "What utilization target leaves headroom for spikes and failover?",
              "How does N+1/N+2 AZ math change the count?",
            ],
            modelAnswerOutline: [
              "Assumptions: 50k RPS is peak, p99 < 200ms so budget average processing time W ~90ms (headroom under the tail), 3 AZs, and each instance sustains ~200 concurrent in-flight requests before tail degradation (validated by load test, stated and carried).",
              "**Step 1, Little's Law:** concurrency L = 50000 x 0.09s = 4500 requests in flight at peak. That is the quantity actually being sized for.",
              "**Step 2, instances at full utilization:** 4500 / 200 = ~23 instances to just hold peak concurrency with zero slack.",
              "**Step 3, utilization target:** never run at 100%, because queueing delay explodes as utilization approaches 1 (the 1/(1-rho) blow-up), wrecking p99. Target 65%: 23 / 0.65 = ~35 instances to serve peak with healthy tails.",
              "**Step 4, AZ redundancy (N+1):** across 3 AZs, losing one removes a third of capacity. Size so the surviving 2 AZs still carry 100% of peak at target: multiply by 3/2. 35 x 1.5 = ~53 instances, roughly 18 per AZ. An AZ failure drops to 36 instances, still above the 35 needed.",
              "**Step 5, cost and bounds:** with peak ~2.5x daily average, the always-on baseline (~21 instances) goes on reserved/savings plans, the daily peak delta on on-demand, spillover burst on spot. Autoscaling min/max come from the peak-to-average ratio so 53 instances are not running at 3am.",
              "**Tradeoffs:** the utilization target plus the 1.5x AZ factor mean running roughly 2.3x the naive count: the cost of a healthy p99 plus surviving a zone outage. Common wrong turn: sizing to raw peak at high utilization with no failover margin: cheap on the slide, pages you the first time an AZ blips.",
            ],
          },
          practice: {
            id: "sd-l4-capacity-planning-practice",
            prompt:
              "Size the read fleet for a service like Twitter's home-timeline API that must serve 300k RPS at p99 < 150ms across 3 regions, where each request fans out to a Redis timeline cache plus 2 downstream calls, and you must survive losing an entire region. Lead with your estimation chain.",
            thinkAbout: [
              "What must each region carry when a peer region dies?",
              "Why must the downstreams be sized for the failover surge too?",
              "Can the failover headroom be warm-but-light rather than fully provisioned?",
            ],
            modelAnswerOutline: [
              "Assumptions: 300k RPS global peak split evenly (~100k RPS/region), p99 < 150ms, each request does a Redis read plus 2 downstream RPCs with average server-side W ~60ms, and each instance sustains ~250 concurrent requests. Size per region, then apply region-level redundancy.",
              "**Estimation chain per region:** L = 100000 x 0.06 = 6000 in-flight requests. At 250 concurrent/instance: 6000 / 250 = 24 instances at full load. Apply a 60% utilization target (tight p99 budget): 24 / 0.6 = 40 instances per region for regional peak.",
              "**Region-level redundancy (the hard constraint):** surviving a full region loss means the other 2 regions absorb all 300k RPS, so each region must carry 300k / 2 = 150k RPS at target when a peer dies: 1.5x its steady load. 40 x 1.5 = 60 instances per region, ~180 globally. On region failure, GeoDNS/global LB shifts traffic to the survivors: 150000 x 0.06 = 9000 in flight, and 9000 / 250 = 36 instances' worth of work spread across the 60 provisioned, so survivors run at 36 / 60 = 60% utilization. That is exactly the target the 1.5x was sized to hold, so p99 stays inside the 150ms budget. Had I provisioned only the 40 that regional peak needs, survivors would sit at 36 / 40 = 90% utilization and the queueing blow-up would wreck the tail, which is why the 1.5x is not optional.",
              "**Downstream check:** the Redis timeline cache and the 2 downstreams must also be sized for the failover surge, or the compute fleet just moves the bottleneck. Verify Redis has connection and throughput headroom for 1.5x regional load.",
              "**Cost mix:** baseline reserved, failover margin on-demand, and consider running the failover headroom warm-but-light rather than fully provisioned 24/7 if RTO tolerance allows a brief autoscale ramp.",
              "Common wrong turn: sizing each region only for its own 100k RPS, so the day a region dies the survivors instantly saturate and cascade.",
            ],
          },
        },
        {
          id: "sd-l4-cell-shuffle-sharding",
          title: "Shuffle Sharding & Cell-Based Architecture",
          summary:
            "How cells cap a bad deploy at one slice of users, and why shuffle sharding makes two tenants sharing total fate a 1-in-28 event.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["cells", "shuffle-sharding", "blast-radius"],
          teach: {
            markdown: cellShuffleShardingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l4-cell-shuffle-sharding-apply",
            prompt:
              "Partition a multi-tenant service into cells so one tenant's traffic surge or a bad deploy cannot take down all tenants.",
            thinkAbout: [
              "What is a cell, and how does it contain failure?",
              "How does shuffle sharding minimize tenant overlap?",
              "What are the tradeoffs (capacity fragmentation, cross-cell ops)?",
            ],
            modelAnswerOutline: [
              "Assumptions: a multi-tenant SaaS API, thousands of tenants of very uneven size, currently one global fleet plus shared database, and all-or-nothing outages. Goal: no single tenant surge or bad deploy hurts more than a small fraction of tenants.",
              "**Cell design:** split into N cells (say 10), each a self-contained stack: its own load balancer, service instances, cache, and database partition, carrying ~10% of tenants. Cells share nothing at runtime, so a resource exhaustion, poison request, or crash in cell 4 is confined to cell 4's tenants. A hard fault-domain boundary a single global pool cannot give.",
              "**Routing:** a thin, highly-available cell router maps tenant_id -> cell via a cached lookup table (source of truth in a small, heavily replicated store). The router does almost nothing else, because it is the one shared component and thus the scariest SPOF: over-provision it, keep it stateless, cache mappings aggressively. Placement balances load and can be rebalanced by updating the table and draining.",
              "**Bad-deploy containment:** deploy cell by cell: canary cell 1, bake and watch error rate / p99, then progressively roll. A bad release blows up at most one cell (~10%) before the rollout halts, versus 100% for a global deploy.",
              "**Noisy tenant containment:** within a cell, shuffle sharding across the cell's workers: each tenant gets a random subset, so a single tenant's surge saturates only its few workers, and the odds another tenant shares that entire subset are small. Per-tenant rate limits remain the first line of defense.",
              "**Tradeoffs stated up front:** capacity fragmentation (each cell needs its own headroom; a hot cell cannot trivially borrow a quiet cell's slack), cross-cell operations need extra tooling (global analytics, tenant migration), and the router is the critical shared dependency. Accepted because a firm cap on blast radius is worth it for a multi-tenant platform.",
              "Common wrong turn: a single global fleet 'with good rate limiting,' which still shares one code version and one dependency graph, so one bad deploy is a total outage.",
            ],
          },
          practice: {
            id: "sd-l4-cell-shuffle-sharding-practice",
            prompt:
              "Design cell-based isolation for a service like AWS DynamoDB or Route 53 serving millions of customers where a single misbehaving customer (a request flood or a poison-pill query pattern) must not be able to degrade service for others, and no more than a tiny fraction of customers can share fate. Lead with your isolation strategy.",
            thinkAbout: [
              "Why are cells alone not enough when millions of customers share each cell?",
              "What is the probability math that makes shuffle sharding a provable guarantee?",
              "What role do per-customer throttling and admission control still play?",
            ],
            modelAnswerOutline: [
              "Assumptions: a foundational multi-tenant service, millions of customers, extreme reliability bar, and a threat model where any one customer may send a traffic flood or a pathological request pattern. The requirement is a quantifiable cap on how many others any one customer can affect.",
              "**Strategy: cells plus shuffle sharding, sized for a probabilistic overlap guarantee.** Partition the fleet into many cells behind a dumb, ultra-redundant router keyed on customer ID: that caps blast radius per cell. But with millions of customers, '10% share a cell' is still millions sharing fate, so shuffle sharding inside each cell is the primary isolation mechanism.",
              "**The key math:** each customer is assigned a random subset of k workers out of the cell's M. With M choose k distinct subsets, the probability that another specific customer shares your entire subset (and can fully take you down) is roughly 1 / (M choose k). Tune M and k so this is negligible: a few workers out of a few dozen gives thousands of distinct combinations. When a customer floods, only their k workers are hit; every customer whose subset does not fully overlap keeps at least one healthy worker and, with client-side retry across their subset, stays up.",
              "**Layered defenses:** per-customer throttling / token buckets at the front door (stops most floods before they reach workers) and request-level admission control to shed poison-pill patterns. Deploys go cell by cell with automated rollback on health regression.",
              "**Tradeoffs:** shuffle sharding needs enough workers per cell for the combinatorics to work, and the routing/assignment layer must be extremely reliable and stable (a customer's subset must not churn). The payoff is a provable isolation property: 'no single customer can affect more than X% of others,' exactly the guarantee a foundational service must state.",
              "Common wrong turn: relying on throttling alone, which caps rate but still lets a flood within the limit, or a novel query pattern, degrade every customer sharing the pool.",
            ],
          },
        },
      ],
    },
  ],
}
