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
      ],
    },
  ],
}
