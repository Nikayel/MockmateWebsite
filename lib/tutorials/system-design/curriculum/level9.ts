/**
 * System Design — Level 9: Modern Architecture & Delivery.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l9-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L9. 16 lessons across 5
 * modules (sd-l9-m1..m5). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const monolithVsMicroservicesTeach = `
## Match the architecture to the org and the load

This is the most-tested architecture tradeoff in system design rounds, and the industry mood has swung back toward starting monolithic. Amazon Prime Video famously moved a video quality-monitoring pipeline off distributed serverless steps and back into a single process, cutting cost about 90%. Shopify runs a modular monolith at enormous scale. The strong senior answer is not "microservices are modern" but "match the architecture to the org and the load."

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Dimension",
    "Monolith",
    "Modular monolith",
    "Microservices"
  ],
  "highlightCols": [
    "Modular monolith"
  ],
  "rows": [
    [
      "Deploy",
      "One deploy",
      "One deploy",
      "Many, one per service"
    ],
    [
      "Boundaries",
      "None enforced",
      "Enforced module interfaces",
      "Network boundaries"
    ],
    [
      "Data",
      "One database",
      "One database",
      "A database per service"
    ],
    [
      "Scaling",
      "Scale the whole app",
      "Scale the whole app",
      "Scale one service on its own"
    ],
    [
      "Strength",
      "Fastest to build and reason about",
      "Fast, and keeps the seams you split on later",
      "Independent deploys, scaling, fault isolation"
    ],
    [
      "Paid for with",
      "Internals rot without discipline",
      "The discipline to keep the seams honest",
      "A network hop per call, sagas, tracing, ops"
    ]
  ],
  "caption": "The fourth column nobody asks for is the distributed monolith: many deploys over one shared database, which pays every microservices cost and keeps every monolith constraint. Default to the highlighted column and extract a service only when a named trigger appears."
}
\`\`\`

A plain monolith is one codebase, one deploy, one database. It is the fastest way to ship and the easiest to reason about, because a call across features is a function call, not a network hop. Its weakness is that without discipline the internals turn to spaghetti and one team's change blocks another's deploy.

A modular monolith keeps the single deploy and single database but enforces internal module boundaries: the Orders module talks to the Inventory module only through a defined interface, not by reaching into its tables. You get most of the maintainability benefit of services with none of the network cost, and you keep clean seams so you can split a module out later when you actually need to.

Microservices split each capability into its own deployable service with its own datastore. The benefits are real but specific: independent deploy cadence, independent scaling (the search service can run 50 pods while checkout runs 5), fault isolation, and polyglot freedom. The costs are also real: network latency on every hop, no cross-service transactions (you need sagas), eventual consistency, distributed tracing to debug anything, and a large ops and cloud bill.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A team splits checkout into an Orders service and an Inventory service. Each gets its own repo, its own pipeline, and its own pods, but both read and write the same orders database. What have they built?",
  "options": [
    {
      "label": "Microservices, since each service now deploys on its own schedule",
      "feedback": "They cannot deploy on their own schedule: a change to the shared table forces both to ship together, so the independence exists only on paper."
    },
    {
      "label": "A distributed monolith: every cost of services and none of the benefits",
      "correct": true,
      "feedback": "Right. The shared database recouples them at the schema level, so they pay network latency, tracing, and ops overhead while still deploying and failing together."
    },
    {
      "label": "A modular monolith, because there is still only one database",
      "feedback": "A modular monolith is one deploy with enforced internal boundaries. These are two deploys across a network with no boundary at all, which is strictly worse."
    }
  ]
}
\`\`\`

## The extraction triggers

The decision rule: default to a modular monolith, then extract a service only when a concrete trigger appears. Real extraction triggers are (1) org scaling, when too many teams contend on one deploy pipeline (Conway's Law), (2) divergent deploy cadence, when one part ships hourly and the rest ships weekly, (3) divergent scaling profile, when one component needs 10x the hardware, (4) fault isolation for a critical path, and (5) a genuine polyglot need.

\`\`\`cswidget
{
  "type": "calc",
  "title": "What a split costs the request path",
  "predictPrompt": {
    "question": "One user request used to be four in-process calls. After the split it is four network calls to four services, each up 99.9 percent of the time. What is the availability of the request path?",
    "options": [
      "Still 99.9 percent, since every service meets its own target",
      "About 99.6 percent, because the misses multiply along the chain",
      "Better than 99.9 percent, because one service failing no longer takes the others with it"
    ]
  },
  "workedExample": "Four services sit on one request path and each is up 99.9 percent of the time, so the path is up 0.999 to the fourth power: 99.6 percent. That is about 2.9 hours unavailable every 30 days, against the 43 minutes a single 99.9 percent service promises, and nothing was deployed badly to earn it. The four hops also add 5 ms each, so 20 ms of pure network lands on every request before any service does work. Now drag the count: this is a chain, so each service you add multiplies the miss rate rather than averaging it, which is why fault isolation only helps when the services are genuinely independent instead of serial.",
  "inputs": [
    {
      "kind": "slider",
      "id": "services",
      "label": "Services on the request path",
      "min": 1,
      "max": 10,
      "step": 1,
      "initial": 4,
      "unit": "services"
    },
    {
      "kind": "select",
      "id": "avail",
      "label": "Availability of each service",
      "options": [
        {
          "label": "99% (3.65 days a year)",
          "value": 0.99
        },
        {
          "label": "99.9% (8.8 hours a year)",
          "value": 0.999
        },
        {
          "label": "99.99% (53 minutes a year)",
          "value": 0.9999
        }
      ],
      "initial": 1
    },
    {
      "kind": "slider",
      "id": "hop",
      "label": "Added latency per network hop",
      "min": 1,
      "max": 40,
      "step": 1,
      "initial": 5,
      "unit": "ms"
    }
  ],
  "outputs": [
    {
      "id": "chain",
      "label": "Availability of the whole path",
      "expr": "pow(avail, services)",
      "format": "percent",
      "sparkline": {
        "over": "services"
      }
    },
    {
      "id": "downtime",
      "label": "Unavailable per 30 days",
      "expr": "(1 - chain) * 2592000",
      "format": "duration"
    },
    {
      "id": "added",
      "label": "Network latency added per request",
      "expr": "services * hop / 1000",
      "format": "duration"
    }
  ],
  "caption": "Availability multiplies along a serial chain and latency adds, so a split you cannot tie to a named trigger buys you a worse request path for free. This is also the arithmetic behind the distributed monolith being the worst of both."
}
\`\`\`

**Interview nuance:** the worst outcome is a distributed monolith: services that share a database or must be deployed together. You pay the full network and ops cost of microservices and still cannot deploy or scale independently, so you get every cost and no benefit. Interviewers probe for this by asking "what if two of your services need the same data?" The right answer is API or event access, never a shared table.

Argue both directions from the requirements. If asked to justify microservices, ground it in a named trigger. If asked why not, cite the distributed-monolith risk and the ops overhead a small team cannot absorb.

**Recap:** default to a modular monolith with clean seams, extract services only on a concrete org, cadence, or scaling trigger, and never build a distributed monolith.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your 12-engineer team runs a modular monolith. Which of these is a real trigger to extract the first service?",
  "options": [
    {
      "label": "Search alone needs roughly 10 times the hardware of everything else",
      "correct": true,
      "feedback": "Right, and here it is already starving checkout of capacity. A divergent scaling profile is one of the named triggers, alongside org scaling, divergent deploy cadence, fault isolation for a critical path, and a genuine polyglot need."
    },
    {
      "label": "Microservices are the modern default and the codebase is over a year old",
      "feedback": "Age and fashion are not triggers. An extraction has to buy something concrete, or you take on sagas, tracing, and a bigger bill for nothing."
    },
    {
      "label": "Two features both need customer data, so each should own a service that reads the customers table",
      "feedback": "Two services on one table is the distributed monolith. Shared data is a reason to keep one boundary, not a reason to split it."
    },
    {
      "label": "A new hire finds the codebase large and would prefer smaller repositories",
      "feedback": "Smaller units can come from enforced module boundaries inside the monolith, which costs no network hops and keeps the single deploy."
    }
  ],
  "reveal": "The sequence is: default to a modular monolith with clean seams, extract only when a named trigger appears (org scaling, deploy cadence, scaling profile, fault isolation, polyglot need), and give every extracted service exclusive ownership of its data so you never land in a distributed monolith."
}
\`\`\`
`.trim()

const decompositionDddTeach = `
## Where to cut is the hard part

Once you decide to split, the hard part is where to cut. Bad boundaries are what turn microservices into a distributed monolith. The tool for drawing good boundaries is Domain-Driven Design, specifically the bounded context.

## Align boundaries to business capabilities

The core rule: align service boundaries to business capabilities, not technical layers. A common novice split is by layer (a UI service, a business-logic service, a data service), which is disastrous, because almost every feature touches all three, so every change requires coordinated deploys across all of them. Instead you split by capability: Orders, Payments, Inventory, Shipping, Catalog, Identity. Each maps to a bounded context, a part of the domain with its own model and its own language. The word "product" means an SKU with price and description in Catalog, but a line item with quantity and fulfillment status in Orders. Those are different models and belong in different services.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The Shipping service needs the customer's mailing address, which lives in the Identity service's database. What is the right way for Shipping to get it?",
  "options": [
    {
      "label": "Give Shipping read-only credentials and let it join across to the Identity tables",
      "feedback": "Read-only access is still schema coupling: Identity cannot rename a column without breaking Shipping, so the two are back to coordinated deploys."
    },
    {
      "label": "Call Identity's API, or subscribe to its customer-updated event and keep a local copy",
      "correct": true,
      "feedback": "Right. Each service owns its data and exposes it only through an API or events, which is exactly what keeps the schema free to change behind the boundary."
    },
    {
      "label": "Move the address table into a shared database that both services own",
      "feedback": "Shared ownership is no ownership: any change needs both teams to agree and deploy together, which is the coupling good boundaries were supposed to remove."
    }
  ]
}
\`\`\`

**Interview nuance:** the single most important consequence of a bounded context is data ownership. Each service owns its data and no other service touches its database. Access is only through the owning service's API or through events it publishes. If two services share a database table, they are coupled at the schema level: you cannot change the table without coordinating both deploys, and you are back to a distributed monolith. Interviewers will test this directly: "the Shipping service needs the customer's address, where does it get it?" The right answer is it calls Identity's API or subscribes to a customer-updated event and keeps its own copy, never a join across databases.

## Right-sizing in both directions

Nano-services (one service per table or per endpoint) create chatty networks where a single user action fans out to 20 synchronous calls, and latency and failure probability compound. God-services swallow half the domain and become a monolith with a network in front. The heuristic: one team owns each service, and a service should be independently deployable and understandable by that team. This is Conway's Law used deliberately, the Inverse Conway Maneuver: design the team structure and the service structure together, because your architecture will end up mirroring your org chart whether you plan it or not.

## Extract with the Strangler Fig

You rarely rewrite. The standard extraction pattern is the Strangler Fig. You put a routing layer (an API gateway or proxy) in front of the monolith, then peel off one capability at a time: stand up the new Payments service, route payment traffic to it, and leave everything else in the monolith. Over months you strangle the old code path until the monolith is gone or reduced to a small core. At each seam you place an anti-corruption layer, a translation shim that maps the monolith's messy legacy model to the new service's clean model, so the old design does not leak into and corrupt the new one.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Strangler Fig extraction, stage by stage",
  "nodes": [
    {
      "id": "clients",
      "label": "Clients",
      "kind": "client"
    },
    {
      "id": "gateway",
      "label": "Router / Gateway",
      "kind": "lb"
    },
    {
      "id": "monolith",
      "label": "Legacy monolith",
      "kind": "service"
    },
    {
      "id": "payments",
      "label": "Payments service (new)",
      "kind": "service"
    },
    {
      "id": "acl",
      "label": "Anti-corruption layer",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "clients",
      "to": "gateway",
      "kind": "sync"
    },
    {
      "from": "gateway",
      "to": "monolith",
      "kind": "sync",
      "label": "everything else"
    },
    {
      "from": "gateway",
      "to": "payments",
      "kind": "sync",
      "label": "payment traffic"
    },
    {
      "from": "payments",
      "to": "acl",
      "kind": "sync",
      "label": "clean model"
    },
    {
      "from": "acl",
      "to": "monolith",
      "kind": "sync",
      "label": "legacy model"
    }
  ],
  "stages": [
    {
      "adds": [
        "clients",
        "gateway",
        "monolith"
      ],
      "note": "You rarely rewrite. First move: put a routing layer (an API gateway or proxy) in front of the monolith. All traffic still flows to the legacy code, but you now own the seam."
    },
    {
      "adds": [
        "payments"
      ],
      "note": "Peel off one capability: stand up the new Payments service and route only payment traffic to it. Everything else stays in the monolith."
    },
    {
      "adds": [
        "acl"
      ],
      "note": "At the seam, an anti-corruption layer translates the monolith's messy legacy model into the new service's clean model, so the old design does not leak into and corrupt the new one."
    }
  ],
  "caption": "Repeat per capability over months until the old code path is strangled and the monolith is gone or reduced to a small core."
}
\`\`\`

**Recap:** cut along business capabilities and bounded contexts, give every service exclusive ownership of its data, size services to one team each, and extract incrementally with the Strangler Fig and an anti-corruption layer.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are extracting Payments out of a nine-year-old monolith whose data model is messy and whose vocabulary is nothing like the one the new service wants. What do you build at the seam?",
  "options": [
    {
      "label": "An anti-corruption layer that translates the legacy model into the new service's clean model",
      "correct": true,
      "feedback": "Right. Without a translation shim the legacy shapes leak straight into the new service, and you have rebuilt the old design under a new name."
    },
    {
      "label": "Nothing: adopt the monolith's existing model so the two stay compatible",
      "feedback": "That is the leak the pattern exists to stop. Compatibility today buys you a corrupted model you will carry for years."
    },
    {
      "label": "A full rewrite of both sides at once, so only one model ever exists",
      "feedback": "Big-bang rewrites are what the Strangler Fig replaces. You peel off one capability at a time behind a router precisely so you never take that risk."
    },
    {
      "label": "A shared library of the monolith's domain objects, imported by both sides",
      "feedback": "A shared domain library recouples them at compile time, so the monolith's model still dictates the new service's design and its release schedule."
    }
  ],
  "reveal": "Cut along business capabilities and bounded contexts rather than technical layers, give each service exclusive ownership of its data and let others in only through APIs or events, size a service to one team, and extract incrementally with a router in front and an anti-corruption layer at every seam."
}
\`\`\`
`.trim()

const interServiceCommTeach = `
## How services talk decides whether the system is resilient

Once you have services, how they talk determines whether the system is resilient or a house of cards. Two axes: synchronous versus asynchronous, and orchestration versus choreography.

## Sync vs async

Synchronous request-response (REST or gRPC) is right when the caller needs the answer now to proceed: checkout must know if the payment authorized. Asynchronous messaging (events on Kafka, RabbitMQ, or SQS) is right when the caller does not need to wait and you want to decouple: after an order is placed, notifications, analytics, and the loyalty service should each react without checkout waiting on any of them. The failure-mode difference is the whole point. A synchronous chain A -> B -> C -> D means if D is slow, A is slow, and threads pile up all the way back, so one slow service stalls the entire flow and can cascade into total outage. An async hop absorbs the slowness in a queue; D drains it when it recovers.

## Protocol choice

For internal east-west traffic between services, gRPC with protobuf is the default: binary, strongly typed, HTTP/2 multiplexed, and much faster than JSON over HTTP/1. For external north-south traffic to browsers and third parties, REST or GraphQL over HTTP/JSON wins on ubiquity and tooling. So a common shape is REST at the edge, gRPC inside.

## Orchestration vs choreography

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Two ways to wire the same checkout",
  "layout": "lr",
  "reveal": "all",
  "nodes": [
    {
      "id": "order",
      "label": "Order service",
      "kind": "service"
    },
    {
      "id": "saga",
      "label": "Saga orchestrator (Temporal)",
      "kind": "service"
    },
    {
      "id": "pay_o",
      "label": "Payment",
      "kind": "service"
    },
    {
      "id": "inv_o",
      "label": "Inventory",
      "kind": "service"
    },
    {
      "id": "ship_o",
      "label": "Shipping",
      "kind": "service"
    },
    {
      "id": "pay_c",
      "label": "Payment (on OrderPlaced)",
      "kind": "service"
    },
    {
      "id": "inv_c",
      "label": "Inventory (on PaymentTaken)",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "order",
      "to": "saga",
      "kind": "sync",
      "label": "orchestration"
    },
    {
      "from": "saga",
      "to": "pay_o",
      "kind": "sync",
      "label": "step 1"
    },
    {
      "from": "saga",
      "to": "inv_o",
      "kind": "sync",
      "label": "step 2"
    },
    {
      "from": "saga",
      "to": "ship_o",
      "kind": "sync",
      "label": "step 3"
    },
    {
      "from": "order",
      "to": "pay_c",
      "kind": "async",
      "label": "choreography"
    },
    {
      "from": "pay_c",
      "to": "inv_c",
      "kind": "async",
      "label": "PaymentTaken"
    }
  ],
  "caption": "Orchestration puts the whole flow in one component you can read, change, and audit, and that component ends up knowing about everyone, which is the coupling hotspot. Choreography couples least and leaves the end-to-end flow living nowhere, which is what makes it hard to trace. Choreography for two or three simple steps, orchestration once the workflow has branching, compensation, and an audit requirement."
}
\`\`\`

Orchestration puts a central coordinator (a saga orchestrator like Temporal or a workflow service) in charge of calling each service in order and handling failures. You get one place to see and change the flow, at the cost of a component that knows about everyone. Choreography has each service emit events and react to others' events with no central brain: lowest coupling, but the end-to-end flow lives nowhere and is painful to debug and reason about. Rule of thumb: choreography for simple 2 to 3 step flows, orchestration once a workflow has real branching, compensation, and needs auditability.

## Consistency without 2PC

You cannot run an ACID transaction across services, and two-phase commit does not scale and blocks on failure. The pattern is the saga: a sequence of local transactions where each step has a compensating action. If Shipping fails after Payment succeeded, you run the compensation for Payment (refund) rather than rolling back a distributed transaction. Sagas give you eventual consistency, not atomicity, and you must design the compensations explicitly.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A downstream service starts failing. Every caller retries three times, immediately, on every request. What does that downstream now experience?",
  "options": [
    {
      "label": "Roughly the same load, since the failed requests were cheap to serve",
      "feedback": "Failed requests are rarely free, and the retries triple the arrival rate at the exact moment the service has the least capacity to absorb it."
    },
    {
      "label": "Three times the traffic, arriving as a synchronized wave that prevents it from recovering",
      "correct": true,
      "feedback": "Right, that is a retry storm. Immediate lockstep retries multiply the load and keep it synchronized, so the dependency never gets a quiet window to come back."
    },
    {
      "label": "Less traffic, because callers back off once they see failures",
      "feedback": "Nothing backs off unless you write it. Exponential backoff is the deliberate fix, and the jitter is what breaks the wave apart in time."
    }
  ]
}
\`\`\`

**Interview nuance:** resilience primitives are almost always probed. Every sync call needs a timeout (never infinite), retries with exponential backoff and jitter (to avoid retry storms), a circuit breaker (stop calling a dead dependency so it can recover and you fail fast), and idempotency keys (so a retry does not double-charge). Backpressure and bounded queues stop a fast producer from drowning a slow consumer. These four, timeout plus retry-with-jitter plus circuit breaker plus idempotency, are what prevent one failure from cascading.

**Recap:** sync for must-know-now reads (gRPC inside, REST at the edge), async events to decouple and absorb slowness, orchestration for complex flows and choreography for simple ones, sagas with compensations for cross-service consistency, and timeouts plus jittered retries plus circuit breakers plus idempotency to stop cascades.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Checkout must authorize the card, reserve stock, email a receipt, and update loyalty points. Sort each step by how it should be called.",
  "buckets": [
    "Synchronous",
    "Async event"
  ],
  "items": [
    {
      "label": "Authorize the payment",
      "bucket": "Synchronous",
      "feedback": "You cannot tell the user the order succeeded until you know the card authorized, so this one has to block."
    },
    {
      "label": "Reserve the stock the confirmation depends on",
      "bucket": "Synchronous",
      "feedback": "Anything the confirmation depends on stays in the request path. You cannot confirm an order you may not be able to fill."
    },
    {
      "label": "Send the receipt email",
      "bucket": "Async event",
      "feedback": "Nobody waits on the email to see the confirmation page, and an email outage must never fail an order that was already paid for."
    },
    {
      "label": "Update the loyalty points balance",
      "bucket": "Async event",
      "feedback": "Loyalty can lag by seconds with no harm, and decoupling it means a loyalty outage cannot take checkout down with it."
    },
    {
      "label": "Increment the analytics dashboard counters",
      "bucket": "Async event",
      "feedback": "Analytics is the clearest case: it consumes the fact that an order happened, and it should never sit in the user's latency path."
    }
  ],
  "reveal": "Draw the line at the moment of commitment: synchronous up to order confirmed, async for everything after. Then protect the synchronous half with a timeout on every call, retries with exponential backoff and jitter, a circuit breaker so a dead dependency gets room to recover, and idempotency keys so a retry cannot double-charge."
}
\`\`\`
`.trim()

const containersK8sTeach = `
## Build small immutable images

A container is an immutable OCI image: your app plus its exact dependencies, built once and run everywhere. The senior habit is to build small and clean. A multi-stage build compiles in a fat builder image and copies only the artifact into a distroless or Alpine base, so the shipped image is 20 to 80 MB instead of 800 MB, pulls fast, and has almost no OS packages for a CVE scanner to flag. The image is immutable: you never \`ssh\` in and patch a running container, you build a new image and replace the old one.

## The core Kubernetes objects

Kubernetes schedules those images onto nodes and keeps the declared state true:

- **Pod:** the smallest unit, one or more co-located containers sharing a network namespace. You rarely create Pods directly.
- **Deployment:** manages a ReplicaSet of identical, interchangeable stateless Pods. The default for a web API.
- **StatefulSet:** stable network identity and stable per-Pod storage for stateful workloads (each Pod gets \`pod-0\`, \`pod-1\` and keeps its own PersistentVolume across restarts). The identity half of that promise is not delivered by the StatefulSet itself: it comes from the headless Service below, which is why a StatefulSet is always declared alongside one.
- **DaemonSet:** one Pod per node, for agents like log shippers or a CNI.
- **Service:** a stable virtual IP and DNS name load-balancing across a set of Pods. Set \`clusterIP: None\` and you get a **headless Service** instead, which is the opposite behavior: no virtual IP and no load balancing, and a DNS lookup returns one address record per ready Pod plus an individually addressable name for each, \`pg-0.pg.default.svc.cluster.local\`, \`pg-1.pg...\`, and so on. That per-Pod name is the "stable network identity" a StatefulSet advertises. A replica that has to stream from the primary specifically, or a broker that has to be reachable as broker 2 and not as "one of the brokers", cannot use a VIP that deliberately hides which Pod answered.
- **Ingress / Gateway API:** L7 north-south routing into the cluster.
- **ConfigMap / Secret:** non-secret and secret config injected as env vars or files, kept out of the image.

## Scheduling controls

Every container should set resource **requests** (what the scheduler reserves) and **limits** (the hard ceiling). Requests plus limits determine the **QoS class**: \`Guaranteed\` (requests == limits) is evicted last, \`BestEffort\` (nothing set) is evicted first under node pressure. Use **affinity/anti-affinity** and **taints/tolerations** to spread replicas across zones, and a **PodDisruptionBudget** so a voluntary drain never takes more than N Pods down at once.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Requests pack the node, limits do not",
  "predictPrompt": {
    "question": "A node has 4 CPU. Every pod requests 0.5 CPU and sets a limit of 2 CPU. How many pods does the scheduler place on that node?",
    "options": [
      "Two, because 2 CPU is the most a pod is allowed to use",
      "Eight, because the scheduler reserves the request and never reads the limit",
      "Four, the average of the request and the limit"
    ]
  },
  "workedExample": "A 4 CPU node, each pod requesting 0.5 CPU and capped at 2. The scheduler reserves the request and nothing else, so it fits 8 pods and calls the node full: 8 times 0.5 is exactly the 4 CPU it had to give. The limit played no part in that decision. If all 8 pods ran up to their ceiling at once they would ask for 16 CPU from 4 CPU of hardware, a 4x overcommit the kernel settles by throttling everyone, including the pod that stayed inside its request. Requests are the promise the scheduler keeps, limits are the ceiling the kernel enforces, and the gap between them is the overcommit you chose. Drag the request up and watch density fall while the ceiling does not move.",
  "inputs": [
    {
      "kind": "slider",
      "id": "nodecpu",
      "label": "Allocatable CPU on the node",
      "min": 2,
      "max": 64,
      "step": 1,
      "initial": 4,
      "unit": "CPU"
    },
    {
      "kind": "slider",
      "id": "request",
      "label": "CPU request per pod",
      "min": 0.1,
      "max": 4,
      "step": 0.1,
      "initial": 0.5,
      "unit": "CPU"
    },
    {
      "kind": "slider",
      "id": "limit",
      "label": "CPU limit per pod",
      "min": 0.5,
      "max": 8,
      "step": 0.5,
      "initial": 2,
      "unit": "CPU"
    }
  ],
  "outputs": [
    {
      "id": "pods",
      "label": "Pods the scheduler fits",
      "expr": "floor(nodecpu / request)",
      "format": "number",
      "unit": "pods",
      "sparkline": {
        "over": "request"
      }
    },
    {
      "id": "reserved",
      "label": "CPU reserved by those pods",
      "expr": "pods * request",
      "format": "number",
      "unit": "CPU"
    },
    {
      "id": "ceiling",
      "label": "CPU they may demand at once",
      "expr": "pods * limit",
      "format": "number",
      "unit": "CPU"
    },
    {
      "id": "overcommit",
      "label": "Overcommit at full tilt",
      "expr": "ceiling / nodecpu",
      "format": "number",
      "unit": "x"
    }
  ],
  "caption": "Setting requests equal to limits buys the Guaranteed QoS class and an honest node, and pays for it in packing density. Setting them far apart buys density and pays for it in CPU throttling that hits well-behaved pods alongside the greedy one."
}
\`\`\`

## Probes drive safe rollouts

- **startupProbe:** gates the other two until a slow-booting app is up, so a cold JVM is not killed prematurely.
- **readinessProbe:** decides whether the Pod receives traffic. A failing readiness probe pulls the Pod out of the Service endpoints without killing it.
- **livenessProbe:** decides whether to restart the Pod. A failing liveness probe triggers a kill and restart.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A service takes 40 seconds to warm its caches before it can answer correctly. Its Deployment defines only a livenessProbe, with a threshold generous enough that no Pod is ever restarted during warm-up. You roll out a new version. What do users see?",
  "options": [
    {
      "label": "Nothing: the liveness probe holds traffic back until the Pod is warm",
      "feedback": "Liveness answers one question only, whether to restart the Pod. It has no say over which Pods the Service sends traffic to."
    },
    {
      "label": "Errors from the new Pods, because nothing gates their membership in the Service",
      "correct": true,
      "feedback": "Right. With no readinessProbe a Pod joins the Service endpoints as soon as it starts, so it receives traffic for 40 seconds before it can serve it."
    },
    {
      "label": "A crash loop, because the probe kills each Pod before it finishes warming",
      "feedback": "That failure is real when liveness is tuned tightly, and a startupProbe is what prevents it. Here the threshold is generous, so the Pods survive and serve errors instead."
    }
  ]
}
\`\`\`

A rolling update stays zero-downtime because new Pods must pass readiness before old Pods are terminated. Set \`maxUnavailable: 0\` and \`maxSurge: 1\` and Kubernetes brings up a new ready Pod before removing an old one, so capacity never dips.

## Terminating a Pod is a race you have to pad

Readiness handles the Pod arriving. The Pod leaving needs two more fields, because termination is not one ordered event. The instant a Pod is marked for deletion, two things start in parallel and nothing sequences them: the kubelet begins shutting the container down, and the endpoints controller removes the Pod from the Service. That removal then has to propagate outward, to every kube-proxy rule on every node and to every Ingress, Gateway, or mesh proxy holding its own copy of the endpoint list. Propagation takes a second or two. For that whole window, proxies that have not caught up are still sending live requests to a Pod that has already been told to die, so a process that exits promptly on SIGTERM drops every request in that window and every request still in flight.

The two fields that pad the race sit in the same Pod spec as the probes:

\`\`\`yaml
spec:
  # Budget for the WHOLE shutdown, hook plus drain. Countdown starts when the Pod is
  # marked terminating, and SIGKILL lands when it expires. Default is 30.
  terminationGracePeriodSeconds: 45
  containers:
    - name: api
      readinessProbe:
        httpGet: { path: /readyz, port: 8080 }
        periodSeconds: 2
      lifecycle:
        preStop:
          # Runs BEFORE SIGTERM, and the kubelet blocks on it. Ten seconds of staying
          # healthy and serving while the endpoint deletion reaches every proxy.
          sleep:
            seconds: 10
\`\`\`

The native \`sleep\` action is 1.30 and later. Before that the same pause was written \`exec: {command: ["/bin/sh", "-c", "sleep 10"]}\`, which needs a shell inside the image, so it silently does nothing on the distroless base recommended at the top of this lesson. A \`preStop\` hook that fails is logged and then skipped, and the Pod goes straight to SIGTERM, which is the failure mode where you shipped the fix and kept the bug.

Walk the resulting order once, because the useful part is that \`preStop\` runs first. Second 0: the Pod is marked terminating, endpoint removal starts propagating, and the kubelet runs the hook. Seconds 0 to 10: the container is untouched and still answering, so the stragglers arriving from proxies that have not caught up are served normally. Second 10: the hook returns, the container gets SIGTERM, and the app stops accepting new connections and finishes what it is holding. Second 45: SIGKILL, and anything unfinished is lost. So the grace period has to exceed the hook plus your longest request, which is why 45 is written here rather than the default 30: a 10 second hook plus a request that can legitimately take 30 seconds does not fit in 30.

**Interview nuance:** the tell of a weak answer is treating K8s as "a magic scaling button." The strong answer says the app must be stateless (no local session, no local disk) for a Deployment to work, and that readiness probes, not liveness probes, are what make a rollout safe.

**Recap:** build small immutable images, use Deployments for stateless and StatefulSets for stateful (paired with a headless Service for per-Pod DNS names), set requests/limits and a PodDisruptionBudget, let readiness probes gate a \`maxUnavailable: 0\` rolling update, and pad the teardown with a \`preStop\` hook plus a \`terminationGracePeriodSeconds\` big enough for the hook and the drain, so the departing Pod is zero-downtime too.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each workload into the controller that fits it.",
  "buckets": [
    "Deployment",
    "StatefulSet",
    "DaemonSet"
  ],
  "items": [
    {
      "label": "A stateless HTTP API behind a Service",
      "bucket": "Deployment",
      "feedback": "Interchangeable replicas with no identity and no local disk are exactly what a Deployment's ReplicaSet manages."
    },
    {
      "label": "A Postgres primary with its own PersistentVolume",
      "bucket": "StatefulSet",
      "feedback": "It needs a stable name and its own volume across restarts, and a Deployment promises neither, which is how a reschedule loses or corrupts the data."
    },
    {
      "label": "A log-shipping agent that must run on every node",
      "bucket": "DaemonSet",
      "feedback": "One Pod per node is the DaemonSet contract, used for log shippers, node exporters, and CNI agents."
    },
    {
      "label": "A Kafka broker that keeps its own partition data",
      "bucket": "StatefulSet",
      "feedback": "Broker identity and its data directory both have to survive a reschedule, so it needs stable identity and stable storage."
    },
    {
      "label": "A stateless thumbnail worker scaled by an HPA",
      "bucket": "Deployment",
      "feedback": "Nothing survives between jobs, so any replica can do any job and the Pods stay interchangeable."
    }
  ],
  "reveal": "Build small immutable images and never patch a running container. Stateless work goes in Deployments, identity-bearing work in StatefulSets, per-node agents in DaemonSets. Set requests and limits so the scheduler and the QoS class work for you, add a PodDisruptionBudget so a drain cannot take too many Pods at once, and let readiness probes rather than liveness gate the rolling update."
}
\`\`\`
`.trim()

const k8sAutoscalingTeach = `
## Four scalers, four problems

Elastic scaling, matching capacity to load automatically, is the core reason to run cloud-native. There are four distinct scalers and they solve different problems; naming them precisely is the interview signal.

- **HPA (Horizontal Pod Autoscaler):** adds and removes Pod replicas to hit a target metric. The workhorse for stateless services.
- **VPA (Vertical Pod Autoscaler):** right-sizes a Pod's CPU/memory requests. Useful for workloads that cannot scale horizontally, but it usually restarts the Pod to apply, and it must never run against HPA on the same resource metric, CPU or memory, because the two controllers fight over the same signal; pair VPA with an HPA driven by a custom or external metric instead.
- **Cluster Autoscaler / Karpenter:** adds and removes **nodes** when Pods cannot be scheduled (Pending) or when nodes are underused. HPA makes more Pods; the cluster autoscaler makes room for them.
- **KEDA (Kubernetes Event-Driven Autoscaling):** scales on external event sources (Kafka lag, SQS depth, Redis list length, cron) and, critically, can **scale to zero** when the source is empty.

## Scale on the right signal

The most important senior point is that CPU is the default HPA metric and it is often wrong. For a web API, requests-per-second or p99 latency tracks user experience far better than CPU, which may sit low while the service is latency-bound on a downstream. For a queue consumer, the correct signal is **queue depth or consumer lag**: if 100,000 messages are backed up, you want to scale on that backlog directly, not on the CPU of the current workers (which may look fine while the backlog grows unbounded). Use custom or external metrics (via the metrics adapter or KEDA) and set a percentile target, for example keep p99 under 200 ms rather than average CPU at 70 percent.

\`\`\`cswidget
{
  "type": "queue-sim",
  "title": "Scale on the backlog, not the worker",
  "predictPrompt": {
    "question": "One consumer runs at a steady, comfortable pace while messages arrive about three times as fast. Judged by its own utilization the worker looks fine. What does the backlog do?",
    "options": [
      "It grows without limit even though the worker never looks distressed",
      "It levels off once the worker settles into a rhythm",
      "It stays small because the worker is never overloaded"
    ]
  },
  "workedExample": "In the starting run a single consumer works at a steady rate while messages arrive about three times as fast. From the worker's own point of view nothing is wrong: it processes at the same pace every tick, the queue-consumer equivalent of CPU sitting comfortably at 40 percent. The backlog curve tells the real story, climbing from the first tick and steepening when the traffic spike hits mid-run. Now enable scale-on-backlog: once depth crosses the threshold, replicas are added, the fleet's combined rate overtakes arrivals, and the backlog drains, riding through the spike instead of drowning in it. That is the KEDA argument in one picture: the worker-local signal stays flat while the lag signal is the one that reflects user pain.",
  "producerRate": 3,
  "consumerRate": 1,
  "ticks": 200,
  "capacity": 150,
  "burst": {
    "from": 100,
    "to": 140,
    "multiplier": 2
  },
  "scaleOnBacklog": {
    "threshold": 25,
    "maxConsumers": 5
  },
  "caption": "CPU can sit low while lag grows unbounded. Scaling on queue depth is the signal that actually catches up."
}
\`\`\`

## Scale-to-zero and cold starts

Scaling to zero saves money on spiky, event-driven work, but the first request after zero pays a cold start: pull image, boot process, warm caches, which can be hundreds of ms to seconds. Mitigations: keep a small **warm pool** (a floor of 1 to 2 replicas so you never fully cold-start on the user path), use **provisioned/pre-warmed concurrency**, and shrink the image and boot path. The decision is explicit: pure scale-to-zero for a nightly batch or a rare webhook, a warm floor for anything a user waits on synchronously.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your storefront takes a 10x jump in traffic every weekday at 09:00 sharp. The HPA is well tuned and scales on p99 latency rather than CPU. What still goes wrong at 09:00?",
  "options": [
    {
      "label": "Nothing: p99 latency is the correct signal, so a well-tuned HPA handles it",
      "feedback": "The signal is right and the timing is wrong. A reactive scaler can only move after latency has already degraded, so the first users pay for the evidence it needs."
    },
    {
      "label": "Scaling starts only once latency degrades, so the opening minutes of the spike breach the SLA",
      "correct": true,
      "feedback": "Right. Reaction always trails the wave: the metric has to move, then Pods are scheduled, and if the nodes are full the cluster autoscaler has to add nodes first."
    },
    {
      "label": "The HPA scales down instead, because latency looks unusually good just before the spike",
      "feedback": "A quiet moment can cause flapping, which is what stabilization windows exist to damp. But the 09:00 problem is that the response arrives after the pain, not before it."
    }
  ]
}
\`\`\`

**Diurnal and spiky patterns:** for predictable daily cycles use **scheduled or predictive scaling** to pre-provision before the morning ramp so autoscaling is not racing the traffic wave. To avoid **flapping** (rapidly scaling up and down around the threshold), set **stabilization windows** and sensible scale-down delays so a brief dip does not tear down capacity you will need again in 30 seconds. The lag this is fighting is quantified in [the scaling-compute treatment of autoscaling lag](/learn/system-design/scaling-compute/sd-l4-autoscaling), which prices the metric-scrape plus decision plus node-provisioning pipeline at 2 to 5 minutes.

**Interview nuance:** if you say "scale on CPU" for an event-driven or latency-bound service, a strong interviewer will push: "what if CPU is at 40 percent but the queue has a million messages?" The correct answer scales on backlog or p99, and uses KEDA for the queue-depth and scale-to-zero case.

**Recap:** pick the scaler to the problem (HPA Pods, cluster autoscaler nodes, KEDA events with scale-to-zero), scale on the signal that reflects user pain (RPS, p99, queue depth) not reflexive CPU, and blunt cold starts with a warm floor and stabilization windows.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each situation by the scaler that actually solves it.",
  "buckets": [
    "HPA",
    "Cluster autoscaler",
    "KEDA"
  ],
  "items": [
    {
      "label": "A stateless API whose p99 climbs as request rate rises",
      "bucket": "HPA",
      "feedback": "More replicas of the same stateless service is the HPA's job, driven by a metric that reflects user pain."
    },
    {
      "label": "Thirty new Pods stuck Pending because every node is full",
      "bucket": "Cluster autoscaler",
      "feedback": "Pending means there is nowhere to put them. The HPA already did its part by asking for the replicas; something has to add nodes."
    },
    {
      "label": "A nightly webhook consumer that should cost nothing between runs",
      "bucket": "KEDA",
      "feedback": "Scale to zero on an empty event source is the KEDA case, and a nightly job can absorb the cold start with nobody waiting."
    },
    {
      "label": "A Kafka consumer group whose lag is climbing",
      "bucket": "KEDA",
      "feedback": "Consumer lag is an external event-source metric, which is what KEDA reads directly to size the consumer fleet."
    }
  ],
  "reveal": "Match the scaler to the problem: HPA for replicas, cluster autoscaler or Karpenter for nodes, KEDA for event sources and scale to zero. Then pick the signal that reflects user pain, keep a warm floor anywhere a user waits synchronously, pre-provision for calendar-driven spikes instead of racing them, and use stabilization windows so a brief dip does not tear down capacity you need again in 30 seconds."
}
\`\`\`
`.trim()

const serviceMeshTeach = `
## A mesh manages east-west traffic

A service mesh manages **east-west** traffic: service-to-service calls inside the cluster. Its job is to move cross-cutting network concerns out of every application's code and into a uniform infrastructure layer:

- **Security:** automatic **mTLS** between services (zero-trust: every call authenticated and encrypted, no plaintext on the wire), plus authorization policy (service A may call service B).
- **Traffic control:** retries, timeouts, circuit breaking, and **traffic splitting / shifting** (send 5 percent to v2 for a canary) without touching app code.
- **Observability:** uniform L7 telemetry, golden metrics, and distributed-trace context for every hop, whatever language each service is written in.

## The sidecar model and its tax

The classic implementation is the **sidecar** model: a proxy (Envoy) is injected into every Pod, and all traffic goes app -> local sidecar -> remote sidecar -> app. This is powerful but not free. Every Pod now runs an extra container, so a 40-service fleet with hundreds of Pods pays real memory and CPU per Pod (tens of MB each, adding up to GBs cluster-wide). The latency tax is charged **per proxy traversal**, not per call: each traversal costs roughly a millisecond for mTLS termination, policy, and re-origination, and the count of traversals is what the call graph decides. Operationally you now run and upgrade a fleet of proxies, which is real "proxy sprawl."

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A request walks a chain of four services, so three service-to-service hops. Suppose each proxy traversal costs about 1 ms. Under the sidecar model, how much proxy latency does that one request pick up?",
  "options": [
    {
      "label": "About 1 ms, since the proxy is local to the Pod",
      "feedback": "Locality makes a traversal cheap, not free, and there is more than one of them: the request meets a proxy on the way out and another on the way in."
    },
    {
      "label": "About 3 ms, one proxy per hop",
      "feedback": "Close, but every hop passes through two proxies, the caller's sidecar and the callee's sidecar, so this counts half of them."
    },
    {
      "label": "About 6 ms, because each of the three hops crosses two sidecars",
      "correct": true,
      "feedback": "Right. The tax is charged per proxy traversal, not per call, so it compounds with the depth of the call graph. A deep chain feels the mesh far more than a single hop does."
    },
    {
      "label": "Nothing measurable, because Envoy shares the Pod's network namespace",
      "feedback": "Sharing a namespace removes the network trip but not the work: the proxy still parses the request, applies policy, and terminates and originates a connection."
    }
  ]
}
\`\`\`

## Price the sidecar tax

"Real memory and CPU per Pod" is only an argument once it has a size, because the same tax is a rounding error on one fleet and a headcount on another. The figures below are approximate US-region list prices and typical sidecar reservations, good to an order of magnitude and no further; the ratios are the durable part.

\`\`\`
a typical sidecar reservation      ~0.1 vCPU and ~100 MB per Pod
general-purpose compute            ~0.045 dollars per vCPU-hour  =  ~33 dollars per vCPU-month

40 services, ~500 Pods
  500 x 0.1 vCPU  =    50 vCPU  =   ~1,600 dollars a month
250 services, ~5,000 Pods
  5,000 x 0.1 vCPU =  500 vCPU  =  ~16,000 dollars a month

one 16 vCPU node packed with 30 Pods
  30 x 0.1 vCPU   =     3 vCPU reserved by proxies, about a fifth of the box,
                        held whether or not those proxies are carrying traffic
\`\`\`

Two decisions fall out. **The tax scales with Pod count, not with request rate.** That reservation is charged against node capacity the moment the Pod schedules, so a fleet of many small, mostly idle services pays the most per unit of useful work, and the same rightsizing and bin-packing argument that applies to your application containers applies to the proxies beside them.

**The migration is worth it at one end of that table and not the other.** At a few hundred Pods the sidecar bill is small enough that it will never be the argument that wins, so if you decline a mesh at that size, decline it on operational grounds (a proxy fleet to run, upgrade, and debug) rather than pretending the money decided it. At thousands of Pods it is a five-figure monthly line plus per-traversal latency compounding on every deep call path, and that is where a sidecarless data plane pays for its own migration.

## The sidecarless / ambient shift

The 2024 to 2025 shift is meshes that cut this tax:

- **Istio Ambient** splits the mesh into a per-node L4 component (ztunnel) handling mTLS for all Pods on the node, plus an optional per-namespace L7 proxy (waypoint) only where you need retries/splitting. The ztunnels carry traffic to each other over **HBONE**, an mTLS tunnel that keeps each workload's own identity on the connection, so per-connection mTLS survives even though most Pods pay no per-Pod proxy.
- **Cilium** takes a different route to the same goal. It enforces identity-based L3/L4 policy in the kernel via **eBPF**, does mutual authentication in its agent using SPIFFE workload identities (off the datapath, because eBPF does not perform a TLS handshake), and gets confidentiality from transparent node-to-node encryption with **WireGuard** or **IPsec**. The result is authenticated, encrypted east-west traffic with no per-Pod proxy at all, but it is not per-connection mTLS. That is the eBPF-plus-WireGuard posture. Cilium 1.19 added ztunnel transparent encryption (also beta), a per-node Rust proxy with SPIRE as CA that does give per-connection mTLS pod to pod, so "Cilium means no per-connection mTLS" stopped being true in March 2026.

The win is fewer proxies, lower per-Pod memory, and lower latency for the common L4 path. Put the earlier arithmetic through it: those 5,000 Pods sit on maybe 170 nodes, so ambient replaces 5,000 sidecars with 170 ztunnels, and even at a couple of times a sidecar's reservation each that is roughly 34 vCPU rather than 500, which is about 1,100 dollars a month rather than 16,000, plus waypoints only in the namespaces that genuinely need L7. Roughly an order of magnitude, which is the kind of gap that justifies a migration on its own. Maturity differs by implementation, and the difference matters in an interview: Istio's ambient mode went GA in 1.24 (November 2024), while Cilium's mutual authentication is still beta. Either way this is the direction of new adoption. **Gateway API** is the converging standard for both north-south and (via GAMMA) east-west config, which lets you swap the underlying implementation with less lock-in than the older bespoke CRDs.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Sidecar vs ambient data paths",
  "nodes": [
    {
      "id": "a_sidecar",
      "label": "Service A (sidecar model)",
      "kind": "service"
    },
    {
      "id": "envoy_a",
      "label": "Envoy sidecar in A's Pod",
      "kind": "service"
    },
    {
      "id": "envoy_b",
      "label": "Envoy sidecar in B's Pod",
      "kind": "service"
    },
    {
      "id": "b_sidecar",
      "label": "Service B (sidecar model)",
      "kind": "service"
    },
    {
      "id": "a_ambient",
      "label": "Service A (ambient model)",
      "kind": "service"
    },
    {
      "id": "ztunnel",
      "label": "ztunnel (per-node L4)",
      "kind": "service"
    },
    {
      "id": "waypoint",
      "label": "Waypoint proxy (optional L7)",
      "kind": "service"
    },
    {
      "id": "b_ambient",
      "label": "Service B (ambient model)",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "a_sidecar",
      "to": "envoy_a",
      "kind": "sync",
      "label": "proxy hop"
    },
    {
      "from": "envoy_a",
      "to": "envoy_b",
      "kind": "sync",
      "label": "mTLS"
    },
    {
      "from": "envoy_b",
      "to": "b_sidecar",
      "kind": "sync",
      "label": "proxy hop"
    },
    {
      "from": "a_ambient",
      "to": "ztunnel",
      "kind": "sync",
      "label": "mTLS at L4"
    },
    {
      "from": "ztunnel",
      "to": "b_ambient",
      "kind": "sync",
      "label": "plain L4 path"
    },
    {
      "from": "ztunnel",
      "to": "waypoint",
      "kind": "sync",
      "label": "only where L7 is needed"
    },
    {
      "from": "waypoint",
      "to": "b_ambient",
      "kind": "sync",
      "label": "retries, splitting"
    }
  ],
  "stages": [
    {
      "adds": [
        "a_sidecar",
        "envoy_a",
        "envoy_b",
        "b_sidecar"
      ],
      "note": "The classic sidecar model: an Envoy proxy injected into every Pod, all traffic app to local sidecar to remote sidecar to app. Every Pod pays memory (tens of MB each, GBs cluster-wide), and every hop crosses two proxies, so the latency tax is charged twice per hop rather than once per call."
    },
    {
      "adds": [
        "a_ambient",
        "ztunnel",
        "b_ambient"
      ],
      "note": "Istio Ambient: a per-node L4 ztunnel handles mTLS for all Pods on the node (over HBONE, carrying each workload's own identity), so most Pods pay no per-Pod proxy. Cilium replaces the proxy entirely: identity-based L3/L4 policy in the kernel via eBPF, mutual authentication in the agent with SPIFFE identities, and WireGuard or IPsec for encryption on the wire."
    },
    {
      "adds": [
        "waypoint"
      ],
      "note": "An optional per-namespace waypoint proxy adds L7 features (retries, traffic splitting) only where you need them, instead of taxing every Pod in the fleet."
    }
  ],
  "caption": "Different data paths for the same east-west problem: the sidecar tax is per Pod in memory and per proxy traversal in latency, while ambient pays per node and adds L7 only where needed. Cilium is a third path not drawn here, with policy in the kernel and no per-Pod proxy, though it authenticates in its agent rather than per connection."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An auditor asks you to demonstrate that every individual service-to-service connection is separately authenticated. Your cluster runs Cilium with eBPF policy and WireGuard encryption. What do you tell them?",
  "options": [
    {
      "label": "Yes, eBPF terminates a TLS handshake per connection",
      "feedback": "This is the common mental model and it is wrong. eBPF does not perform a TLS handshake at all; it enforces identity-based L3 and L4 policy in the kernel, and the handshake work happens elsewhere."
    },
    {
      "label": "No, the unit of authentication is the workload",
      "correct": true,
      "feedback": "Right. The agent mutually authenticates workloads with SPIFFE identities, off the datapath, and WireGuard or IPsec encrypts node to node, so the traffic genuinely is authenticated and encrypted. But the auditor asked about connections, and a requirement written that way needs ambient or sidecar mTLS instead."
    },
    {
      "label": "Yes, because WireGuard negotiates a fresh session key for the traffic",
      "feedback": "WireGuard gives you confidentiality between nodes, which is a different property from proving who is on each end of a connection. Encryption is not authentication."
    },
    {
      "label": "No, and nothing is authenticated: Cilium enforces policy but never proves identity",
      "feedback": "Too strong in the other direction. Identity is proved, just not where you expect: mutual authentication happens in the agent using SPIFFE workload identities."
    }
  ]
}
\`\`\`

## Crossing a cluster boundary

Everything above is one cluster. Run one cluster per region and the call graph does not stop at the cluster edge: a workload in eu-west still has to call one in us-east. Two things change there.

The first is plumbing. Pod IPs are not routable between clusters, so a caller cannot dial the far cluster's pod network at all. Mesh traffic crosses through an **east-west gateway**: one per cluster, published on an address the peer clusters can reach, whose only job is carrying service-to-service traffic in and out. It is a different object from the north-south ingress gateway, which admits external client traffic and terminates that client's TLS. Each control plane also needs read access to the peer's endpoints (in Istio, a remote secret pointing at the other API server), and once it has them a remote service looks like an ordinary set of endpoints that happen to live behind the peer's east-west gateway address.

The second is the part a compliance answer turns on: **the east-west gateway must not terminate the mesh's mTLS.** If it does, the certificate the callee authenticates is the gateway's, so every cross-region call arrives as one shared regional identity. Per-service authorization policy on the far side can no longer tell checkout from reporting, and the audit log records the gateway as the caller on every entry. So the gateway forwards the session instead of opening it: in sidecar mode it routes on the **SNI** value in the TLS handshake, which names the destination service and is readable without a key that decrypts the payload, and under ambient it forwards the HBONE tunnel, which was already built to keep each workload's own identity on the connection. Either way the caller's certificate arrives intact at the callee.

That only holds if both clusters chain to the **same root of trust**: one root CA issuing a per-cluster intermediate, so a certificate minted in eu-west validates in us-east. Two independently self-signed cluster roots is the usual first-attempt failure, and it fails closed, as every cross-cluster call rejected at the handshake.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "One call, two clusters, one identity",
  "reveal": "all",
  "nodes": [
    {
      "id": "ca",
      "label": "Shared root CA, one intermediate per cluster",
      "kind": "external"
    },
    {
      "id": "checkout",
      "label": "checkout workload (eu-west)",
      "kind": "service"
    },
    {
      "id": "proxy_eu",
      "label": "Local mesh proxy (sidecar or ztunnel)",
      "kind": "service"
    },
    {
      "id": "ewgw_eu",
      "label": "eu-west east-west gateway",
      "kind": "lb"
    },
    {
      "id": "ewgw_us",
      "label": "us-east east-west gateway",
      "kind": "lb"
    },
    {
      "id": "proxy_us",
      "label": "Local mesh proxy (sidecar or ztunnel)",
      "kind": "service"
    },
    {
      "id": "ledger",
      "label": "ledger workload (us-east)",
      "kind": "service"
    }
  ],
  "groups": [
    {
      "id": "eu",
      "label": "Cluster eu-west",
      "nodes": ["checkout", "proxy_eu", "ewgw_eu"]
    },
    {
      "id": "us",
      "label": "Cluster us-east",
      "nodes": ["ewgw_us", "proxy_us", "ledger"]
    }
  ],
  "edges": [
    {
      "from": "ca",
      "to": "proxy_eu",
      "kind": "sync",
      "label": "issues cert: identity checkout"
    },
    {
      "from": "ca",
      "to": "proxy_us",
      "kind": "sync",
      "label": "issues cert: identity ledger"
    },
    {
      "from": "checkout",
      "to": "proxy_eu",
      "kind": "sync",
      "label": "plaintext, inside the pod"
    },
    {
      "from": "proxy_eu",
      "to": "ewgw_eu",
      "kind": "sync",
      "label": "mTLS opens here"
    },
    {
      "from": "ewgw_eu",
      "to": "ewgw_us",
      "kind": "sync",
      "label": "forwarded on SNI, not decrypted"
    },
    {
      "from": "ewgw_us",
      "to": "proxy_us",
      "kind": "sync",
      "label": "same session, still not decrypted"
    },
    {
      "from": "proxy_us",
      "to": "ledger",
      "kind": "sync",
      "label": "mTLS closes here: peer is checkout"
    }
  ],
  "caption": "The mTLS session opens at the calling workload's proxy and closes at the called workload's proxy, with both gateways in between forwarding it unopened. That is what lets the authz policy and the access log in us-east name checkout as the caller instead of naming a gateway."
}
\`\`\`

## A mesh is not always warranted

For a handful of services, you can get mTLS from the platform, retries and timeouts from a shared client library, and metrics from your framework, without operating a mesh. Mesh adoption has actually declined for small fleets precisely because the operational cost outweighs the benefit until you have dozens of services in multiple languages where per-language libraries stop being viable.

**Interview nuance:** the strong answer is not "add Istio." It is "at 40 services in mixed languages, a mesh is justified because you cannot keep mTLS and retry logic consistent across five client libraries, and I would choose ambient/eBPF to avoid the per-Pod sidecar tax." The weak answer adds a mesh reflexively for three services.

**Recap:** a mesh moves mTLS, retries/timeouts, traffic shifting, and L7 telemetry out of app code; sidecars cost memory per Pod and latency per proxy traversal, two of them on every hop; Istio Ambient cuts that tax while keeping per-connection mTLS (GA in 1.24), and Cilium cuts it further by putting eBPF policy in the kernel with SPIFFE mutual authentication and WireGuard or IPsec encryption instead of mTLS (still beta, though Cilium 1.19's ztunnel add-on now gives per-connection mTLS too, also beta); across clusters, an east-west gateway per cluster forwards the session rather than terminating it, over a shared root of trust, so the caller's identity survives the region hop; and for a small fleet, a mesh is often not worth it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You run 6 services, all written in Go, owned by one team. A staff engineer proposes installing Istio in sidecar mode. What is the strongest response?",
  "options": [
    {
      "label": "Agree, because a mesh is how you get mTLS and mTLS is not optional",
      "feedback": "mTLS is not optional, but a mesh is not its only source. The platform can provide it, and at this size the proxies cost more to operate than they return."
    },
    {
      "label": "Decline for now, since it does not repay its operating cost yet",
      "correct": true,
      "feedback": "Right. Platform mTLS plus one shared Go client library already covers mTLS, retries and timeouts at this size. A mesh earns its keep when per-language client libraries stop being viable, which is dozens of services in mixed languages, not six in one."
    },
    {
      "label": "Decline permanently, since meshes are legacy technology now that eBPF exists",
      "feedback": "The sidecarless shift changes how a mesh is implemented, not whether the problem exists. At 40 mixed-language services you will still want one, just not a per-Pod proxy for each."
    },
    {
      "label": "Agree, but skip mTLS and use the mesh only for traffic splitting",
      "feedback": "Traffic splitting alone rarely justifies running a fleet of proxies, and you can canary with a rollout controller without a mesh at all."
    }
  ],
  "reveal": "A mesh moves mTLS, retries and timeouts, traffic shifting, and L7 telemetry out of application code. The sidecar model charges for that per Pod in memory and per proxy traversal in latency. Istio Ambient cuts the tax with a per-node ztunnel and keeps per-connection mTLS over HBONE; Cilium cuts it further with eBPF policy in the kernel, SPIFFE mutual authentication in the agent, and WireGuard or IPsec on the wire, which is authenticated and encrypted but not per-connection mTLS (Cilium 1.19 added a beta ztunnel mode that closes that gap pod to pod). Below a couple of dozen services, no mesh at all is frequently the right call."
}
\`\`\`
`.trim()

const cloudNative12factorTeach = `
## The factors are a design lens

The 12-factor methodology and cloud-native principles are a checklist for building an app that a platform can run, replace, and scale automatically. In an interview they are a **design lens**: when asked to make a service container-ready, walk the factors and name the specific change for each, rather than saying "make it cloud-native" as a vibe. The four that carry most of the weight:

## Config in the environment

Config and secrets live outside the image, in env vars, a ConfigMap, or a secrets manager. The payoff is **one immutable artifact** promoted unchanged from dev to staging to prod (dev/prod parity). The moment you bake an environment-specific config file into the image, you need a different build per environment, and parity is gone. A baked-in database URL or API key is the classic anti-pattern.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A service keeps login sessions in process memory and writes user uploads to the container's local disk. The team containerizes it as-is and puts it behind an autoscaler. What breaks first?",
  "options": [
    {
      "label": "Nothing: the container runtime keeps both across restarts",
      "feedback": "A container's filesystem and its heap die with the container, and the platform will kill and reschedule instances routinely for drains, spot reclaims, and scale-in."
    },
    {
      "label": "Users get logged out at random and uploads go missing",
      "correct": true,
      "feedback": "Right. Once there is more than one instance, which replica answers is effectively a coin flip, so a session held in one process's memory is found only some of the time, and a file on one container's disk is invisible to the others and deleted outright when a scale-in removes that instance."
    },
    {
      "label": "Only scale-in is a problem, since scaling out just adds empty instances",
      "feedback": "Scaling out is where it breaks first: the load balancer sends the next request to a replica that has never seen that session or that file."
    }
  ]
}
\`\`\`

## Stateless, disposable processes

A process must hold no state that another instance would need. No in-memory session that only lives on one box, no user files written to local disk. Move session to **Redis**, files to **object storage (S3)**. Then any instance can serve any request, and the platform can start a new instance or kill an old one at any moment. "Disposable" also means **fast startup** and **graceful shutdown**: on **SIGTERM** the process stops taking new work, drains in-flight requests, and exits, so a scale-down or node drain loses nothing.

\`\`\`cswidget
{
  "type": "steps",
  "title": "What SIGTERM has to do before the process exits",
  "frames": [
    {
      "note": "Steady state. The Service lists pod-c as an endpoint, pod-c reports Ready, and four requests are in flight inside it.",
      "rows": [
        {
          "label": "Service endpoints",
          "cells": [
            {
              "text": "pod-a"
            },
            {
              "text": "pod-b"
            },
            {
              "text": "pod-c",
              "state": "active"
            }
          ]
        },
        {
          "label": "pod-c",
          "cells": [
            {
              "text": "Ready",
              "state": "active"
            }
          ]
        },
        {
          "label": "in flight",
          "cells": [
            {
              "text": "req 1"
            },
            {
              "text": "req 2"
            },
            {
              "text": "req 3"
            },
            {
              "text": "req 4"
            }
          ]
        }
      ]
    },
    {
      "predict": {
        "question": "A node drain sends SIGTERM to pod-c and the process exits immediately. What happens to the four in-flight requests, and to traffic the Service is still routing?",
        "options": [
          "Both are safe: the endpoint is always removed before SIGTERM is sent",
          "The four in-flight requests fail, and new requests keep arriving for a moment because endpoint removal propagates separately",
          "Only the in-flight requests fail, because new traffic stops the instant the process exits"
        ]
      },
      "note": "Exiting on SIGTERM kills the four in-flight requests, and endpoint removal propagates on its own schedule, so the Service keeps routing new requests to an address that has already gone.",
      "rows": [
        {
          "label": "Service endpoints",
          "cells": [
            {
              "text": "pod-a"
            },
            {
              "text": "pod-b"
            },
            {
              "text": "pod-c still listed",
              "state": "active"
            }
          ]
        },
        {
          "label": "pod-c",
          "cells": [
            {
              "text": "exited on SIGTERM",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "in flight",
          "cells": [
            {
              "text": "req 1 502",
              "state": "dropped"
            },
            {
              "text": "req 2 502",
              "state": "dropped"
            },
            {
              "text": "req 3 502",
              "state": "dropped"
            },
            {
              "text": "req 4 502",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "new requests",
          "cells": [
            {
              "text": "still routed here",
              "state": "dropped"
            }
          ]
        }
      ]
    },
    {
      "note": "Graceful shutdown starts at the other end. On SIGTERM the process fails its readiness probe first, so the Service drops the endpoint and new traffic stops arriving while the four in-flight requests keep running.",
      "rows": [
        {
          "label": "Service endpoints",
          "cells": [
            {
              "text": "pod-a"
            },
            {
              "text": "pod-b"
            },
            {
              "text": "pod-c removed",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "pod-c",
          "cells": [
            {
              "text": "draining, not Ready",
              "state": "active"
            }
          ]
        },
        {
          "label": "in flight",
          "cells": [
            {
              "text": "req 1"
            },
            {
              "text": "req 2"
            },
            {
              "text": "req 3"
            },
            {
              "text": "req 4"
            }
          ]
        },
        {
          "label": "new requests",
          "cells": [
            {
              "text": "go to pod-a and pod-b",
              "state": "new"
            }
          ]
        }
      ]
    },
    {
      "note": "Only once the in-flight work has finished does the process exit, and nothing was lost. That is what disposable means: the platform can reclaim the instance at any moment because shutdown is a protocol rather than a kill.",
      "rows": [
        {
          "label": "Service endpoints",
          "cells": [
            {
              "text": "pod-a"
            },
            {
              "text": "pod-b"
            }
          ]
        },
        {
          "label": "pod-c",
          "cells": [
            {
              "text": "exited cleanly",
              "state": "dim"
            }
          ]
        },
        {
          "label": "in flight",
          "cells": [
            {
              "text": "none left",
              "state": "dim"
            }
          ]
        },
        {
          "label": "new requests",
          "cells": [
            {
              "text": "go to pod-a and pod-b"
            }
          ]
        }
      ]
    }
  ],
  "caption": "Disposability is not the platform being gentle, it is the process cooperating: fail readiness first so traffic stops arriving, drain what is already inside, then exit. A process that treats SIGTERM as exit now makes every scale-in and every node drain a small outage."
}
\`\`\`

## Backing services as attached resources

Databases, caches, queues, and blob stores are attached by **URL and credentials**, not compiled in. A local Postgres and a managed Aurora are the same "attached resource" to the app, so you can swap one for the other by changing config, with no code change. This is what makes an instance truly interchangeable across environments.

## Build, release, run separation, and immutable infrastructure

**Build** produces an image, **release** binds that image to a config to make a versioned, immutable release, and **run** executes it. You never mutate a running box; to change anything you build a new image and replace instances. This is what makes rollback trivial (re-run the previous release) and eliminates config drift.

## Design for failure

In a cloud-native world instances vanish routinely: spot reclamation, autoscale scale-in, node drains, zone loss. So health checks, retries, and graceful shutdown are **required, not optional**, and logs must stream to **stdout** as an event stream for the platform to collect (never written to a local file that dies with the instance).

**Interview nuance:** the highest-signal move is to walk a specific legacy service through the checklist and name the concrete change per factor: "session is in local memory -> move to Redis; uploads go to local disk -> move to S3; config is a baked-in \`app.conf\` -> move to env vars." That specificity is what separates a strong answer from reciting the factor names.

**Recap:** config in the environment (one image everywhere), stateless disposable processes (Redis session, S3 files, graceful SIGTERM), backing services attached by URL, and immutable build/release/run separation, all so a process is safe to kill and restart anywhere at any time.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A node is drained during a cluster upgrade. One service ignores SIGTERM and keeps working until the platform kills it 30 seconds later. Its sessions are in Redis and its uploads are in S3. What does a user see?",
  "options": [
    {
      "label": "Nothing goes wrong, since no state lived on that instance",
      "feedback": "Externalizing state is what makes an instance safe to replace, and this team did that part. It says nothing about the requests that were mid-flight when the signal arrived."
    },
    {
      "label": "Requests already in flight are cut off at the kill",
      "correct": true,
      "feedback": "Right. Disposability has two halves and this service only did one of them. On SIGTERM the process is supposed to stop accepting new work, finish what it is already holding, and exit. Ignoring the signal spends the whole grace period taking on more work for the kill to destroy."
    },
    {
      "label": "The platform waits for the process to finish rather than killing it",
      "feedback": "The grace period is a bound, not a promise. When it expires the process dies whatever it was doing, which is why draining has to be the process's own job."
    },
    {
      "label": "Only queued background jobs are lost, since HTTP requests are drained by the load balancer",
      "feedback": "A load balancer can stop sending new requests, which is a different thing from finishing the ones it already sent. Those are still inside the process when it dies."
    }
  ],
  "reveal": "Config in the environment so one image runs everywhere, stateless disposable processes with session in Redis and files in object storage, backing services attached by URL and credentials, strict build, release, and run separation, and logs streamed to stdout rather than a local file that dies with the instance. Together those are what make a process safe for the platform to kill, move, and restart."
}
\`\`\`
`.trim()

const serverlessFaasTeach = `
## FaaS removes capacity management

Function-as-a-Service (AWS Lambda, Google Cloud Functions, Azure Functions) removes capacity management: you deploy a stateless function, the platform runs one isolated instance per concurrent request, scales that fleet from zero to thousands in seconds, and bills per invocation by GB-seconds of memory-time plus a per-request fee. There are no idle servers to pay for and no autoscaling group to tune. That is the whole pitch, and it is genuinely transformative for spiky, unpredictable, or glue-code workloads.

## Cold starts

The catch is the execution model. Each function instance handles exactly one request at a time, so 500 concurrent requests means 500 warm instances. When no warm instance is free, the platform provisions a fresh one: download the package, start the runtime, initialize your code. That is a **cold start**, and it costs roughly 100ms for a lean Node or Python function up to 1s or more for a fat Java or .NET package. Users on the p99 tail feel exactly those cold starts.

Mitigations, in order of leverage: **provisioned concurrency** (pay to keep N instances warm, which brings back a slice of the always-on cost you were trying to escape), **smaller deployment packages and fewer heavy imports** so init is faster, sharing one subnet-and-security-group pair across functions so Lambda reuses an existing Hyperplane ENI rather than provisioning a new one (the ENI cost is paid once at attach, in the Pending state, not on every cold start), and lazy-loading SDK clients so you only initialize what a given request needs. Warm-ping hacks help marginally but do not scale to real concurrency.

## The hard constraints

- **Execution-time limit:** Lambda caps at 15 minutes. Anything longer must be chunked or moved to a container or batch job.
- **Statelessness:** no local disk you can rely on across invocations and no in-process cache that survives. State goes to DynamoDB, S3, Redis (ElastiCache/MemoryDB), or a managed queue.
- **Concurrency caps:** accounts have a regional concurrency limit (often 1000 by default). A traffic spike can throttle you, and a downstream database with a 200-connection pool will melt long before Lambda does. Use reserved concurrency and a connection proxy (RDS Proxy) to protect stores.
- **Cold-start-sensitive latency** and **vendor lock-in** (triggers, IAM, and event shapes are provider-specific).

Multi-step logic does not belong inside one giant function. Orchestrate it with **Step Functions** or a durable-workflow engine: each step is its own function, retries and timeouts are declarative, and you get a visual execution history instead of a 900-second monolith.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A function runs flat out, 24 hours a day, at high steady load. Next to a well-utilized container of the same size, what does the bill look like?",
  "options": [
    {
      "label": "Cheaper, because you pay only for what you use and here you use all of it",
      "feedback": "Per-invocation pricing carries a premium for elasticity you are not using. At full steady utilization you pay that premium on every single request."
    },
    {
      "label": "Several times more expensive, because per-invocation pricing is built for bursty utilization",
      "correct": true,
      "feedback": "Right. The crossover sits roughly where sustained utilization passes 40 to 60 percent; past that a reserved or well-packed container wins clearly."
    },
    {
      "label": "About the same, since both bill by memory and time",
      "feedback": "Both bill by memory-time, but not at the same rate, and FaaS adds a per-request fee on top of the GB-seconds."
    }
  ]
}
\`\`\`

## Price the crossover

"Several times more expensive" is an adjective with a number underneath it, and the number is what picks the architecture, so do the arithmetic. The figures below are approximate US-region list prices, good to an order of magnitude and no further. They drift year to year; the ratios between them are the durable part.

\`\`\`
Lambda bills memory-time and hands out CPU in proportion, roughly 1 vCPU per 1.8 GB.
  1 vCPU-hour = 1.8 GB x 3600 s x ~0.0000167 dollars per GB-second  =  ~0.11 dollars
  plus a request fee of ~0.20 dollars per million invocations

The same vCPU-hour on a general-purpose instance
  on demand                 ~0.045 dollars
  one-year commitment       ~0.030 dollars

Break-even utilization = instance rate / Lambda rate
  against on demand         0.045 / 0.11          =  ~40 percent busy
  against a commitment      0.030 / 0.11          =  ~27 percent busy
  against on demand, if you only dare average 70 percent CPU on the box
                            (0.045 / 0.7) / 0.11  =  ~58 percent busy
\`\`\`

Two things fall out of those numbers. **The crossover is a utilization figure, not a request count.** A function that is idle four fifths of the hour bills for the fifth it works, and a fifth of 0.11 comfortably beats a full hour of 0.045; a function pinned at full load pays 0.11 against 0.030, which is the "several times" made concrete at roughly 3.5x. Nobody can tell you whether 200 million invocations a month is expensive without knowing how much of each hour they occupy.

**Headroom is why the rule of thumb is a band rather than a point.** You cannot safely average 100 percent CPU on a box, so an honest comparison charges the container for the headroom it must keep, and that alone slides break-even from about 40 percent up towards 60. Provisioned concurrency slides it the other way: it converts part of the bill back into always-on cost at a keep-warm rate you pay whether or not a request arrives, which is why you size it to the steady baseline and let bursts spill into on-demand instances.

**Interview nuance:** the cost model inverts at high steady load. FaaS is priced for bursty utilization; if a function runs flat-out 24/7, per-invocation billing costs several times what an equivalently sized, well-utilized container or reserved instance would. The crossover is roughly when sustained utilization passes ~40 to 60 percent. Saying "serverless is cheaper" without "for spiky load" is the tell of someone who has not seen the bill. A tier that sits near 90 percent CPU all day is the 3.5x case by definition, so it belongs on committed or spot containers no matter how event-shaped its trigger looks.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "An upload through a function, and what the model forces",
  "nodes": [
    {
      "id": "upload",
      "label": "Client uploads a file",
      "kind": "client"
    },
    {
      "id": "bucket",
      "label": "S3 bucket",
      "kind": "db"
    },
    {
      "id": "fn",
      "label": "Lambda (stateless, cold start 100 ms to 1 s, 15 min cap, concurrency cap)",
      "kind": "service"
    },
    {
      "id": "store",
      "label": "S3 or DynamoDB (durable result)",
      "kind": "db"
    },
    {
      "id": "sfn",
      "label": "Step Functions (one function per step, retries declared)",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "upload",
      "to": "bucket",
      "kind": "sync",
      "label": "put object"
    },
    {
      "from": "bucket",
      "to": "fn",
      "kind": "async",
      "label": "object-created event"
    },
    {
      "from": "fn",
      "to": "store",
      "kind": "sync",
      "label": "write result"
    },
    {
      "from": "bucket",
      "to": "sfn",
      "kind": "async",
      "label": "multi-step work"
    },
    {
      "from": "sfn",
      "to": "store",
      "kind": "sync",
      "label": "per-step output"
    }
  ],
  "stages": [
    {
      "adds": [
        "upload",
        "bucket",
        "fn"
      ],
      "note": "The requirement is bursty, unpredictable per-file work, so an event triggers one function instance per concurrent file and there is no fleet to size. That is the whole pitch, and the price is a cold start on every instance the platform has to provision."
    },
    {
      "adds": [
        "store"
      ],
      "note": "Nothing on the instance survives the invocation, so any result a later request needs has to leave the function for a store that outlives it."
    },
    {
      "adds": [
        "sfn"
      ],
      "note": "A five-step job in one function hits the 15 minute cap and retries all five steps whenever one fails, so multi-step work moves to an orchestrator where each step retries alone."
    }
  ],
  "caption": "Cold starts land on the p99 tail, nothing local survives an invocation, and the 15 minute cap plus the account concurrency limit are why long work becomes several small functions rather than one big one."
}
\`\`\`

**Recap:** FaaS trades capacity management for per-invocation billing and instant scale, which wins for spiky event-driven glue but loses on cold-start latency, hard execution limits, statelessness, and a cost model that inverts against containers under high steady load.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A five-step nightly pipeline runs as one 12-minute function. It fails on the last step, and the retry starts again from step one and redoes everything. What is the right shape?",
  "options": [
    {
      "label": "Raise the timeout, since 12 minutes is close to the cap",
      "feedback": "The cap is not what failed, and there is nowhere to raise it to past 15 minutes anyway. The problem is that one invocation has no notion of partial progress, so every retry pays for all five steps again."
    },
    {
      "label": "One function per step, with an orchestrator between them",
      "correct": true,
      "feedback": "Right. Step Functions or a durable-workflow engine gives each step its own function with declarative retries and timeouts, so a failure retries only the step that failed, and you read a visible execution history instead of guessing inside one opaque invocation."
    },
    {
      "label": "Checkpoint progress to the function's local disk between steps",
      "feedback": "Nothing on an instance's local disk survives to the next invocation, and the retry may not even land on the same instance. Durable progress has to go to DynamoDB, S3, or a queue."
    },
    {
      "label": "Add provisioned concurrency so the function is always warm and does not fail",
      "feedback": "Provisioned concurrency buys you out of cold starts, which cost latency on the p99 tail. It has nothing to say about a step that failed for its own reasons."
    }
  ],
  "reveal": "FaaS trades capacity management for instant scale and per-invocation billing, which is a genuine win for spiky event-driven glue. The bill comes back as cold starts on the p99 tail, a hard execution limit, no durable local state, and a cost model that inverts under high steady load. The failure interviewers probe for is scale a downstream cannot absorb: bound it with reserved concurrency and a connection proxy, and orchestrate multi-step work with Step Functions instead of one long function."
}
\`\`\`
`.trim()

const edgeWasmTeach = `
## Edge compute runs your code close to users

Edge compute runs your code in the CDN's points of presence (Cloudflare has hundreds worldwide), physically close to users, so a request can be answered without a round trip to a distant origin region. The headline is latency: **time-to-first-byte under 50ms globally** with no bespoke multi-region infrastructure of your own. But the thing that makes edge compute practical is not just location, it is the runtime.

## V8 isolates and WASM

Container-based FaaS boots an OS-level sandbox per function, which is why cold starts are 100ms to 1s+. Edge platforms like **Cloudflare Workers** instead run **V8 isolates**: many tenants share one V8 process, each request gets a lightweight isolate (the same isolation a browser tab uses), and spinning one up is **under 5ms**, effectively no cold start. There is no VM or container to provision. **WebAssembly (WASM)** goes further: a precompiled WASM module can start in **sub-millisecond** time and lets you run Rust, Go, or C at the edge, not just JavaScript. The tradeoff for this speed is a constrained runtime: a small memory ceiling per isolate, a metered CPU budget, and **no full Node.js API surface** (no arbitrary filesystem, limited native modules). You write to a web-standard API, not to Node. Do not memorize the CPU number, because every vendor keeps moving it; memorize the shape of the limit instead.

## The limit that does not move: a PoP holds no data

The durable constraint is architectural rather than quota-shaped. A point of presence caches what is hot and holds nothing else, so code that has to sweep a **large or cold working set** ends up dragging that data across the network to reach the code. That is backwards: the whole win of the edge is moving small code to the user, and it evaporates the moment the work needs data that only lives at the origin. Code travels cheaply; a working set does not.

## What belongs where

Put at the **edge** the lightweight, latency-sensitive work on the request path: geo/device **routing**, **auth and JWT verification** (reject a bad token in the PoP instead of after a trans-oceanic hop), **A/B assignment**, header rewrites, **personalization** of otherwise-cached pages, bot filtering, and cache logic. Keep at the **origin** the heavy or stateful work: large database transactions, big compute, anything that reads a large or cold working set, anything needing the full Node ecosystem, and any operation requiring **strong consistency**.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "To cut latency you move the entitlement check to the edge and cache each user's plan tier in Workers KV. A user downgrades from premium to free. What can happen?",
  "options": [
    {
      "label": "Nothing: the write invalidates every point of presence before the next request arrives",
      "feedback": "Global invalidation faster than the next request is exactly what edge KV does not promise. Propagation is eventual and can take seconds."
    },
    {
      "label": "They keep receiving premium content for seconds, because KV propagation is eventual",
      "correct": true,
      "feedback": "Right. Edge KV is built to be read everywhere, not written strongly, so entitlements, balances, and idempotency keys are the wrong data to keep there."
    },
    {
      "label": "The read fails until propagation finishes, so the user sees an error",
      "feedback": "Eventual consistency serves the old value rather than failing. A stale success is the more dangerous outcome, because nothing signals that anything is wrong."
    }
  ]
}
\`\`\`

## The edge data constraint

That last point is the real constraint. Edge data stores are built for reads-everywhere, not strong writes. **Workers KV** is eventually consistent with propagation that can take seconds; edge caches and **regional read replicas** serve stale-tolerant reads fast. Newer primitives shift the tradeoff: **Durable Objects** give you single-threaded strong consistency for one key by pinning it to one location (so you pay latency for writes to that object), and **D1** offers a SQL database at the edge. But the general rule holds: you cannot get globally strong, low-latency writes for free, so edge data must be either read-mostly, eventually consistent, or explicitly pinned.

**Interview nuance:** the two failure modes interviewers listen for are (1) pushing heavy compute, a full Node app, or a large working set out to the edge, where the runtime is deliberately small and the PoP holds no data to work on, and (2) putting strong-consistency data (balances, inventory, idempotency keys) in eventually consistent edge KV and getting stale reads or lost updates. Also flag that **observability is harder**: your code runs in hundreds of PoPs, so you lean on the platform's aggregated logs and tracing rather than SSHing into a box.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "What runs in the PoP and what stays at the origin",
  "reveal": "all",
  "nodes": [
    {
      "id": "user",
      "label": "User",
      "kind": "client"
    },
    {
      "id": "pop",
      "label": "Nearest PoP: route, verify JWT, A/B, personalize, cache",
      "kind": "cdn"
    },
    {
      "id": "kv",
      "label": "Workers KV (eventual, propagation in seconds)",
      "kind": "cache"
    },
    {
      "id": "dobj",
      "label": "Durable Object (pinned to one place, strong)",
      "kind": "db"
    },
    {
      "id": "origin",
      "label": "Origin region: DB transactions, heavy compute, full Node",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "user",
      "to": "pop",
      "kind": "sync",
      "label": "under 5 ms isolate start"
    },
    {
      "from": "pop",
      "to": "kv",
      "kind": "sync",
      "label": "read-mostly"
    },
    {
      "from": "pop",
      "to": "dobj",
      "kind": "sync",
      "label": "strong, one key"
    },
    {
      "from": "pop",
      "to": "origin",
      "kind": "sync",
      "label": "cold or strong data"
    }
  ],
  "groups": [
    {
      "id": "edge",
      "label": "Edge PoP: request path",
      "nodes": [
        "pop",
        "kv",
        "dobj"
      ]
    },
    {
      "id": "core",
      "label": "Origin region",
      "nodes": [
        "origin"
      ]
    }
  ],
  "caption": "A V8 isolate starts in under 5 ms and a WASM module in under a millisecond, so the code travels cheaply. The data does not: a PoP caches what is hot and holds nothing else, KV and regional read replicas are eventually consistent, and only a Durable Object pinned to one location gives a strong write, at that location's latency."
}
\`\`\`

**Recap:** V8 isolates start in under 5ms and WASM sub-ms, so edge compute delivers global sub-50ms TTFB for lightweight request-path work like routing, auth, and personalization, while heavy compute, large working sets, and strong-consistency data stay at the origin, because an edge runtime is deliberately small, a PoP holds only what is hot, and edge data is eventually consistent by default.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each piece of work by where it should run.",
  "buckets": [
    "Edge PoP",
    "Origin region"
  ],
  "items": [
    {
      "label": "Rejecting a request that carries an invalid JWT",
      "bucket": "Edge PoP",
      "feedback": "Cheap, on the request path, and it saves a trans-oceanic round trip for traffic you were going to refuse anyway."
    },
    {
      "label": "Assigning a visitor to an A/B bucket and rewriting a header",
      "bucket": "Edge PoP",
      "feedback": "Tiny CPU cost, and it personalizes an otherwise cacheable page without waking the origin at all."
    },
    {
      "label": "Debiting an account balance inside a transaction",
      "bucket": "Origin region",
      "feedback": "This needs strong consistency, which edge data does not offer unless you pin the object, and then you are paying the write latency anyway."
    },
    {
      "label": "Rendering a monthly report over a year of order history",
      "bucket": "Origin region",
      "feedback": "The report has to sweep a large, mostly cold working set, and a point of presence caches what is hot and holds nothing else. Running it at the edge drags the data to the code instead of the code to the user, which is the win the edge exists for, thrown away."
    },
    {
      "label": "Choosing which regional origin to forward a request to, based on the caller's country",
      "bucket": "Edge PoP",
      "feedback": "Routing is the canonical edge job: the point of presence already knows where the caller is, and the decision costs almost no CPU."
    }
  ],
  "reveal": "V8 isolates start in under 5 ms and WASM in under a millisecond, so the edge can do lightweight request-path work next to the user for global sub-50 ms TTFB. What stays at the origin is set by where the data is, not by a CPU quota vendors keep raising: a point of presence caches what is hot and holds nothing else, so a large or cold working set belongs where it lives, and edge data is eventually consistent unless you explicitly pin it to one location."
}
\`\`\`
`.trim()

const platformGitopsTeach = `
## Raw Kubernetes is a construction kit, not a product

Give 40 product teams a bare cluster and each one reinvents CI, deployment YAML, secrets wiring, ingress, dashboards, and on-call, badly and differently. That cognitive load is the tax that kills velocity. **Platform engineering** treats the internal developer experience as a product: a small platform team builds paved roads so the median engineer never touches the messy layers.

## The Internal Developer Platform

An **IDP** is the interface over that machinery. Over raw Kubernetes it adds three things a product team actually wants: **self-service golden paths** (scaffold a new service from a template, deploy it, and get logs/metrics/traces wired up with one command or one portal click), **abstraction** (the developer declares "I need a service with a Postgres and a queue," and the platform materializes the Terraform, Helm, and RBAC), and **guardrails** so the paved road is also the compliant road. The classic reference is Spotify's **Backstage**: a service catalog that answers who owns this, what depends on it, is it meeting its scorecard (has a runbook, passing security scan, defined SLO), plus software templates for scaffolding.

## GitOps

GitOps is the delivery control plane underneath. The principle: **Git is the single source of truth for desired state**, everything is declarative (Kubernetes manifests, Helm/Kustomize, Terraform), and an in-cluster **reconciler** (Argo CD or Flux) continuously compares desired state in Git to actual state in the cluster and converges them. You never \`kubectl apply\` from a laptop. To ship, you open a pull request that changes the manifest; merge triggers the agent to roll it out.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "The GitOps reconcile loop",
  "nodes": [
    {
      "id": "dev",
      "label": "Developer",
      "kind": "client"
    },
    {
      "id": "repo",
      "label": "Config repo in Git (declared desired state)",
      "kind": "db"
    },
    {
      "id": "argo",
      "label": "Argo CD or Flux (in-cluster reconciler)",
      "kind": "service"
    },
    {
      "id": "admission",
      "label": "Admission policy (OPA or Kyverno, cosign, SLSA)",
      "kind": "service"
    },
    {
      "id": "cluster",
      "label": "Cluster (actual state)",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "dev",
      "to": "repo",
      "kind": "sync",
      "label": "reviewed pull request"
    },
    {
      "from": "repo",
      "to": "argo",
      "kind": "sync",
      "label": "pull desired state"
    },
    {
      "from": "argo",
      "to": "admission",
      "kind": "sync",
      "label": "apply"
    },
    {
      "from": "admission",
      "to": "cluster",
      "kind": "sync",
      "label": "admit or reject"
    },
    {
      "from": "cluster",
      "to": "argo",
      "kind": "feedback",
      "label": "actual state, diffed every loop"
    }
  ],
  "stages": [
    {
      "adds": [
        "dev",
        "repo"
      ],
      "note": "The requirement is an auditable record of every production change, so desired state lives in Git and the only way to ship is a reviewed pull request. Nobody applies from a laptop."
    },
    {
      "adds": [
        "argo"
      ],
      "note": "The reconciler runs inside the cluster and pulls, which is why no external CI system needs to hold cluster-admin credentials."
    },
    {
      "adds": [
        "admission"
      ],
      "note": "Git records what you asked for, not what a tag points at today, so the check that an image came from your pipeline has to happen here rather than in review."
    },
    {
      "adds": [
        "cluster"
      ],
      "note": "Actual state is read back on every loop, and that returning arrow is what turns a hand-made 2am edit into drift the reconciler quietly undoes."
    }
  ],
  "caption": "Deployment and self-healing are the same loop: the reconciler compares what Git declares against what the cluster is running, and converges the cluster either way."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "At 2am an engineer resolves an incident by editing the live Deployment directly in the cluster. The config repo is untouched. Argo CD is running. What happens next?",
  "options": [
    {
      "label": "The change sticks until somebody remembers to backport it into the repo",
      "feedback": "That is how it works with no reconciler, and it is the drift that makes environments diverge. Under GitOps, actual state is not the source of truth."
    },
    {
      "label": "The reconciler sees actual state diverge from Git and converges the cluster back to what Git says",
      "correct": true,
      "feedback": "Right. Self-healing is the same loop as deployment, so an out-of-band edit gets undone whether it was a mistake, an attack, or a well-meant hotfix."
    },
    {
      "label": "Argo CD adopts the change and commits it back to the repo automatically",
      "feedback": "Reconciliation runs one way. Nothing writes improvised cluster state back into the repository, which is exactly what keeps the repository a reviewable record."
    }
  ]
}
\`\`\`

Why Git as the source of truth: you get an audit log of every prod change (who, what, when, reviewed by whom) for free, rollback is \`git revert\`, drift is detected and auto-healed (someone hotfixes the cluster by hand, the reconciler reverts it back to Git), and disaster recovery is "point Argo at the repo and re-sync." Pull-based reconciliation is also more secure than push: no external CI system needs cluster-admin credentials.

## One Application does not reach 300 services

The unit Argo CD actually reconciles is an **Application**: one object naming one source (repo, path, revision) and one destination (cluster, namespace). That is one service in one place. A fleet of 300 services across 6 regions is 1,800 of those objects, and hand-writing them is both a week of YAML and a guarantee that the hundredth one drifts from the first.

Two patterns take the object count off your hands, and they compose:

- **App-of-Apps.** A parent Application whose source directory contains nothing but child Application manifests. Syncing the parent creates the children, and each child then syncs its own service. Onboarding a service becomes adding one file to that directory, and removing the parent tears down everything under it.
- **ApplicationSet.** A controller that renders many Applications from one template plus a **generator**. The generator produces a list of parameter sets (a literal \`list\`, one entry per directory in the repo with the \`git\` generator, one entry per registered cluster with the \`cluster\` generator), and the template is instantiated once per entry.

\`\`\`yaml
# 1. The parent. Its path holds child Application manifests and nothing else,
#    so one sync of this object reconciles every service underneath it.
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: payments-tenant
  namespace: argocd
spec:
  project: payments
  source:
    repoURL: https://git.example.com/config.git
    path: tenants/payments/apps      # every file in here is itself an Application
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
---
# 2. One template, one generator, one rendered Application per region. Adding a
#    region to the list is the whole diff; the template is not touched.
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: checkout
  namespace: argocd
spec:
  generators:
    - list:
        elements:
          - region: us-east-1
            cluster: https://api.use1.example.com
          - region: eu-west-1
            cluster: https://api.euw1.example.com
  template:
    metadata:
      name: checkout-{{region}}
    spec:
      project: payments
      source:
        repoURL: https://git.example.com/config.git
        path: services/checkout/overlays/{{region}}
        targetRevision: main
      destination:
        server: "{{cluster}}"
        namespace: checkout
      syncPolicy:
        automated: {}                # drop this and the rendered app waits for a human
\`\`\`

Two properties fall out of that shape and are worth holding on to. Each rendered Application is still a separate reconcile unit with its own sync status, health, and history, so one broken overlay fails its own Application and leaves its siblings synced. And because the per-entry difference is only the overlay path and destination, the two Applications are the same template by construction, which is what stops us-east-1 and eu-west-1 from quietly diverging the way two hand-maintained copies do.

## Guardrails as code

Instead of a review board that manually approves each deploy, you encode policy: **OPA/Gatekeeper or Kyverno** admission policies reject a manifest that has no resource limits, runs as root, or pulls an unsigned image. Templates bake in the right defaults. The paved road is faster than going around it, so people stay on it.

**Interview nuance:** supply-chain security belongs in the platform, not bolted on. Generate an **SBOM** at build, sign images with **cosign**, and attach **SLSA** provenance so the admission controller can verify "this image came from our pipeline, unmodified" before it runs.

**Interview nuance:** the failure mode to name is the **ticket-queue platform team**. If shipping still means filing a Jira ticket and waiting two days for the platform team to click deploy, you built a bottleneck, not a platform. Platform-as-product means self-service by default; the team's success metric is adoption and lead time, not tickets closed.

**Recap:** an IDP is a product that gives teams self-service golden paths (scaffold, deploy, observe) and abstraction over raw Kubernetes; GitOps makes Git the declarative source of truth with an Argo CD/Flux reconciler for audit, rollback, and self-healing; App-of-Apps and ApplicationSet generators render the thousands of Application objects a large fleet needs from one parent and one template, each still its own reconcile unit; Backstage catalogs ownership and scorecards; guardrails as code (OPA/Kyverno) and supply-chain controls (SBOM, cosign, SLSA) replace gatekeeping; the anti-pattern is a ticket-queue platform team.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Every change to your cluster goes through a reviewed pull request and Argo CD reconciles it. An attacker with registry access replaces the image sitting behind a tag your manifest already references. What stops it from running?",
  "options": [
    {
      "label": "Argo CD reverts it, because actual state no longer matches Git",
      "feedback": "Argo compares the manifest to the cluster, and the manifest still names the same tag it always did. Desired state never changed, so there is no drift for the reconciler to find."
    },
    {
      "label": "Nothing in Git or Argo: admission has to verify the image itself",
      "correct": true,
      "feedback": "Right, and this is why supply-chain control belongs in the platform rather than bolted on. The repository is the record of what you asked for, not of what a tag currently points at. Sign at build with cosign, attach SLSA provenance, and let the admission controller refuse anything whose signature and provenance do not match your pipeline."
    },
    {
      "label": "The pull-request review would have caught the change before it merged",
      "feedback": "There was no pull request. The swap happened downstream of the repository entirely, which is precisely the gap the Git audit trail does not cover."
    },
    {
      "label": "The Gatekeeper policy that requires resource limits on every manifest",
      "feedback": "That policy reads the manifest, and the manifest is fine. A rule about the shape of a workload is a different control from a rule about where its image came from, and you want both."
    }
  ],
  "reveal": "An IDP is a product: golden paths that scaffold, deploy, and observe a service with no ticket, abstraction over the messy layers, and guardrails encoded as admission policy instead of a review board. GitOps underneath makes Git the declarative source of truth, which buys audit, rollback by revert, and self-healing against drift, while SBOMs, cosign signatures, and SLSA provenance let admission verify an image came from your pipeline unmodified."
}
\`\`\`
`.trim()

const iacProgressiveDeliveryTeach = `
## Two failure modes ruin infrastructure delivery

**Drift** (staging and prod diverge because someone made a manual console change, so a deploy that passed staging breaks prod) and **big-bang rollout** (you ship to 100% at once, and if it regresses you have already taken an outage before you notice). This lesson kills both.

## Infrastructure as Code fixes drift

Declare the desired infrastructure in **Terraform/OpenTofu or Pulumi**, keep it in Git, and apply through a pipeline, never by hand. Key discipline: **remote state with locking** (an S3 backend with native lockfile locking via \`use_lockfile\`, or HCP Terraform; the older DynamoDB lock table is deprecated) so two engineers cannot corrupt state with concurrent applies, and **modules** so dev/staging/prod are the same module with different variable files. That gives **environment parity**: prod is staging with more replicas, not a different snowflake. Treat infra as **immutable**: to change a node you replace it, you do not SSH in and tweak it. Manual console changes are the cardinal sin because they are invisible to Git and cause the exact drift that makes staging a liar. You can catch drift by running \`terraform plan\` on a schedule and alerting on any non-empty diff.

**Environment promotion:** the same versioned artifact and same IaC modules flow dev to staging to prod. Config differs only by variables (replica counts, instance sizes, endpoints), ideally sourced from the same place, so promotion is "apply the tested module to the next environment," not "rebuild it."

## Progressive delivery fixes big-bang rollout

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Rollout",
    "How it moves",
    "Extra capacity",
    "How you find out it is bad"
  ],
  "highlightCols": [
    "How you find out it is bad"
  ],
  "rows": [
    [
      "Rolling",
      "Replace pods N at a time",
      "None",
      "Slowly, from whatever share of users is already on the new version"
    ],
    [
      "Blue-green",
      "Stand up a full parallel environment, then flip the router",
      "Double, briefly",
      "After the flip, from all of production at once"
    ],
    [
      "Canary",
      "1%, then 5%, 25%, 100%, baking between steps",
      "One step's worth of pods",
      "During the bake, from metrics on 1% of traffic, and it auto-halts"
    ],
    [
      "Shadow (mirror)",
      "It does not move any traffic: a copy of live requests goes to the new version and its answers are discarded",
      "A shadow fleet sized to the mirrored share",
      "Before a single user is exposed, from a diff of the two versions' answers to the same request"
    ]
  ],
  "caption": "The four differ less in how they move traffic than in when you learn the version is bad and how much of production learns it with you. Shadow is the odd one out: it never moves traffic at all, so it buys a comparison rather than a rollout. On a payments path that is the argument for shadow first, then canary with automated analysis."
}
\`\`\`

For a **critical payments service** you want **canary with automated analysis and auto-rollback**. Tools: **Argo Rollouts** or **Flagger** shift traffic in steps, and between steps they **bake** (hold and observe) while querying Prometheus for your SLIs: error rate, p99 latency, and a business metric like payment-authorization-success-rate. If any metric breaches its threshold during the bake, the rollout **auto-aborts and shifts traffic back** to the stable version. No human in the loop at 3am. Blue-green is the alternative when you cannot tolerate two versions serving simultaneously (it flips atomically) but it costs double capacity during the window.

\`\`\`cswidget
{
  "type": "steps",
  "title": "Canary with auto-rollback",
  "frames": [
    {
      "note": "The payments service pool is all v1, serving 100% of traffic. Ship v2 to every pod at once and a regression takes an outage before you notice; Argo Rollouts will shift traffic to v2 in steps instead.",
      "rows": [
        {
          "label": "pods",
          "cells": [
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            }
          ]
        },
        {
          "label": "traffic",
          "cells": [
            {
              "text": "v1 100%",
              "state": "active"
            }
          ]
        }
      ]
    },
    {
      "note": "The canary starts: one pod runs v2 and takes 1% of traffic. The rollout now bakes, holding while it queries Prometheus for error rate, p99 latency, and payment-authorization-success-rate against thresholds.",
      "rows": [
        {
          "label": "pods",
          "cells": [
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v2",
              "state": "new"
            }
          ]
        },
        {
          "label": "traffic",
          "cells": [
            {
              "text": "v1 99%"
            },
            {
              "text": "v2 1%",
              "state": "active"
            }
          ]
        },
        {
          "label": "bake watches",
          "cells": [
            {
              "text": "error rate"
            },
            {
              "text": "p99 latency"
            },
            {
              "text": "auth-success rate"
            }
          ]
        }
      ]
    },
    {
      "note": "The bake passes at 1% and 5%, so Argo Rollouts steps up: a quarter of the pods run v2 and 25% of traffic flows to them. Between every step it holds and watches the same SLIs.",
      "rows": [
        {
          "label": "pods",
          "cells": [
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v2"
            },
            {
              "text": "v2",
              "state": "new"
            }
          ]
        },
        {
          "label": "traffic",
          "cells": [
            {
              "text": "v1 75%"
            },
            {
              "text": "v2 25%",
              "state": "active"
            }
          ]
        },
        {
          "label": "steps",
          "cells": [
            {
              "text": "1% ok",
              "state": "dim"
            },
            {
              "text": "5% ok",
              "state": "dim"
            },
            {
              "text": "25% baking",
              "state": "active"
            }
          ]
        }
      ],
      "predict": {
        "question": "Mid-bake at 25%, v2's error rate breaches its threshold. What happens at 3am?",
        "options": [
          "A human is paged to decide",
          "Auto-abort: traffic shifts back to v1",
          "It continues to 100% and fixes forward"
        ]
      }
    },
    {
      "note": "Error rate breaches during the bake. The rollout auto-aborts and shifts traffic back to stable v1 with no human in the loop; the bad v2 never saw more than 25% of traffic.",
      "rows": [
        {
          "label": "pods",
          "cells": [
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v1"
            },
            {
              "text": "v2",
              "state": "dropped"
            },
            {
              "text": "v2",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "traffic",
          "cells": [
            {
              "text": "v1 100%",
              "state": "new"
            },
            {
              "text": "v2 25%",
              "state": "dropped"
            }
          ]
        },
        {
          "label": "bake watches",
          "cells": [
            {
              "text": "error rate BREACH",
              "state": "active"
            },
            {
              "text": "p99 latency",
              "state": "dim"
            },
            {
              "text": "auth-success rate",
              "state": "dim"
            }
          ]
        }
      ]
    },
    {
      "note": "A fixed v2 walks the whole ladder and every bake passes: 1%, 5%, 25%, then 100%. All pods now run v2. Blue-green would have flipped atomically instead, at the price of double capacity during the window.",
      "rows": [
        {
          "label": "pods",
          "cells": [
            {
              "text": "v2",
              "state": "new"
            },
            {
              "text": "v2",
              "state": "new"
            },
            {
              "text": "v2",
              "state": "new"
            },
            {
              "text": "v2",
              "state": "new"
            },
            {
              "text": "v2",
              "state": "new"
            },
            {
              "text": "v2",
              "state": "new"
            },
            {
              "text": "v2",
              "state": "new"
            },
            {
              "text": "v2",
              "state": "new"
            }
          ]
        },
        {
          "label": "traffic",
          "cells": [
            {
              "text": "v2 100%",
              "state": "active"
            }
          ]
        },
        {
          "label": "steps",
          "cells": [
            {
              "text": "1% ok",
              "state": "dim"
            },
            {
              "text": "5% ok",
              "state": "dim"
            },
            {
              "text": "25% ok",
              "state": "dim"
            },
            {
              "text": "100%",
              "state": "active"
            }
          ]
        }
      ]
    }
  ],
  "caption": "Canary shifts traffic 1% -> 5% -> 25% -> 100% with a bake and automated metric analysis between steps; any breach auto-aborts and shifts traffic back to stable, no human at 3am."
}
\`\`\`

## Shadow traffic buys a comparison before anyone is exposed

A canary is still a live experiment. At 1 percent, one in a hundred real users gets the new version's real answer, and if that answer is wrong they wear it. When the output itself is the risky part, an authorization decision, a fraud score, a price, you can test the new version against production traffic with nobody exposed at all, by **mirroring**. The proxy in front of the service copies each request, sends the copy to the shadow version, forwards the original to the stable version as always, and returns the stable version's response to the user. The shadow's response is read by your comparison job and then thrown away. It never reaches a client.

In an Istio VirtualService that is two fields:

\`\`\`yaml
spec:
  http:
    - route:
        - destination:          # the only response any user ever sees
            host: authorize
            subset: v1
      mirror:
        host: authorize         # a copy of the same request, fire and forget
        subset: v2
      mirrorPercentage:
        value: 10.0
\`\`\`

The comparison is the whole point and it is yours to build: log what each version decided for the same request id, then diff the two streams offline. "v2 declines 0.4 percent of the authorizations v1 approved" is a defect you found with no merchant's payment attached to it, which is exactly what a canary cannot give you.

Two costs to say out loud. You are running a second fleet sized to the mirrored share, so 10 percent mirroring is 10 percent extra capacity. And a mirrored request hits real dependencies: if the shadow version writes to the ledger, sends the email, or calls the card network, you have just charged a customer twice to run a test. Mirroring is safe for the read-shaped part of a request; anything that writes has to be stubbed, pointed at a scratch datastore, or excluded from the mirror.

**Feature flags decouple deploy from release.** Deploying code and releasing a feature become separate events: ship the code dark behind a flag (LaunchDarkly, Unleash, or a homegrown flag service), then turn it on for 1% of users independent of the deploy. This means you can roll back a *feature* instantly without redeploying, and you can deploy risky code safely because it is inert until flagged on.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your canary is holding at 25 percent when the v2 deploy also runs a migration that drops a column v1 still reads. What happens?",
  "options": [
    {
      "label": "Only the canary pods are affected, since v2 owns the new schema",
      "feedback": "There is one database behind both versions. A migration changes the world for every pod, not only the ones running the new image."
    },
    {
      "label": "The 75 percent of traffic still served by v1 starts failing immediately",
      "correct": true,
      "feedback": "Right. A canary assumes old and new code run at the same time, so a destructive migration breaks the stable version you were keeping as your escape route."
    },
    {
      "label": "The rollout controller notices the schema change and pauses the migration",
      "feedback": "Rollout controllers watch traffic and metrics, not schemas. Nothing in that pipeline knows a column the old version reads has just gone."
    },
    {
      "label": "Rolling the deployment back restores service, because the old image is still around",
      "feedback": "Rolling back the image does not bring back a dropped column, which is why the auto-rollback safety net is worth nothing against a destructive migration."
    }
  ]
}
\`\`\`

**Interview nuance:** database migrations are the trap in any progressive rollout. Canary assumes old and new code run simultaneously, so a **destructive migration in one deploy** (drop a column the old version still reads) breaks the stable version mid-canary. Use **expand/contract** (a.k.a. parallel-change): first expand (add the new column, write to both, backfill), deploy code reading the new shape, then in a later deploy contract (drop the old column) once nothing reads it. Migrations must be backward-compatible across at least one version.

**Recap:** IaC (Terraform/OpenTofu) with remote-state locking and shared modules gives environment parity and kills drift; never make manual console changes; promote the same artifact dev to staging to prod; use canary with automated metric analysis and auto-rollback (Argo Rollouts/Flagger) for a payments service, blue-green when versions cannot coexist, and mirror traffic to a shadow version whose answers you diff and discard when you need that comparison before anyone is exposed; feature flags decouple deploy from release; and use expand/contract so a migration never breaks the version still running during a canary.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A release that passed staging fails in prod. Both environments are built from the same Terraform module, and the module has not changed in weeks. What do you suspect first?",
  "options": [
    {
      "label": "Prod was changed by hand and the code never learned of it",
      "correct": true,
      "feedback": "Right. Manual console changes are invisible to the repository and are exactly what makes staging a liar. Detection is cheap once you look for it: run the plan on a schedule and alert on any non-empty diff, which turns silent drift into a page rather than a surprise at release time."
    },
    {
      "label": "Prod simply has more traffic, so it needs bigger instances",
      "feedback": "Sometimes true, but it does not explain a config-shaped failure, and reaching for capacity before checking for drift papers over a difference you still cannot see."
    },
    {
      "label": "The state file is stale, so applying the module again will fix prod",
      "feedback": "Applying blindly over unknown drift can destroy the thing somebody changed for a reason. Read the diff before you converge it."
    },
    {
      "label": "Staging is missing a test case; add one and redeploy",
      "feedback": "No test in staging can detect a difference that exists only in prod. Parity is an infrastructure property, not a test-coverage property."
    }
  ],
  "reveal": "IaC with remote state and locking, shared modules, and no manual console changes gives you environment parity and kills drift. Progressive delivery kills the big-bang rollout: canary with automated metric analysis and auto-rollback on a money path, blue-green when two versions cannot coexist, feature flags to separate release from deploy, and expand then contract migrations so the version still serving traffic never loses a column out from under it."
}
\`\`\`
`.trim()

const cloudFinopsTeach = `
## Cost is a design axis

Cost is a design axis, not an afterthought you hand to finance. **FinOps** is the practice of making engineering, finance, and product jointly own cloud spend, and it runs as a continuous loop of three pillars:

\`\`\`csdiagram
{
  "type": "pipeline",
  "title": "The FinOps loop",
  "stages": [
    {
      "label": "Inform",
      "note": "tag and allocate, so the bill maps to an owner"
    },
    {
      "label": "Optimize",
      "note": "rightsize, kill idle, commitments, spot"
    },
    {
      "label": "Operate",
      "note": "budgets, alerts, anomaly detection, accountability"
    }
  ],
  "caption": "It runs continuously rather than once: what Operate detects becomes the next round of Inform, and a team that cannot see its own spend has nothing to optimize."
}
\`\`\`

## Inform first

You cannot optimize what you cannot see. Enforce a **tagging/labeling policy** (team, service, environment, cost-center) so the bill maps to owners; untagged resources are the black hole where waste hides. Build a **showback/chargeback** view so each team sees its own spend.

## Optimize compute

- **Rightsizing**: most instances are provisioned for a peak that rarely comes. Size to **P90/P95 utilization** over a representative window, not to a static "just in case" ceiling and not to the max (which one spike inflates). Automate it; manual rightsizing rots.
- **Spot/preemptible** instances (60-90% cheaper) for **fault-tolerant** work: batch jobs, CI, stateless workers, ML training with checkpointing. Not for a stateful primary that cannot tolerate a 2-minute eviction.
- **Commitments**: savings plans or reserved instances for your steady-state baseline (the load that is always on), on-demand/spot for the spiky top.
- **Autoscaling and scale-to-zero**: scale with load, and scale non-prod and bursty services to zero when idle. A dev cluster running 24/7 for a 9-to-5 team is ~70% waste.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Finance asks what the recommendations service costs per month. Your cloud bill itemizes node hours, storage, and data transfer. Can the bill answer the question?",
  "options": [
    {
      "label": "Yes: add up the node hours for the nodes it runs on",
      "feedback": "Those nodes run a dozen other workloads too. Charging one tenant for the whole node overstates it, and splitting evenly is not much closer to the truth."
    },
    {
      "label": "No: many workloads share every node the bill itemizes",
      "correct": true,
      "feedback": "Right. The bill sees instances while you run pods, so you need per-workload allocation from something like OpenCost or Kubecost, which splits node cost by each workload's requests and actual usage. That only works if the labels are consistent, which loops straight back to Inform."
    },
    {
      "label": "No, and nothing can answer it: Kubernetes cost is fundamentally unattributable",
      "feedback": "It is opaque by default, not impossible. Consistent team and service labels plus an allocation tool turn it into a solved problem."
    }
  ]
}
\`\`\`

## Kubernetes cost is opaque

The cloud bill shows you *nodes* (EC2 instances), but you run *many apps per node*, so the bill cannot tell you that the recommendations service costs $8k/mo while payments costs $2k/mo. You fix visibility with **OpenCost or Kubecost**, which allocate node cost down to namespace/pod/label using each workload's requests and actual usage. That only works if workloads are **consistently labeled** (team, service), which loops back to Inform. Then you find the real K8s waste: **over-requested resources** (a pod requesting 4 CPU and using 0.3 pins capacity nobody uses) and **low bin-packing** (nodes half-empty because requests are inflated). Rightsize requests to P90/P95 usage and let the cluster autoscaler consolidate.

## Data and egress are the sneaky levers

**Data-transfer/egress** charges are easy to ignore and brutal at scale: inter-AZ traffic (keep chatty services zone-aligned), cross-region replication, and internet egress (a CDN both speeds delivery and cuts origin egress). **Storage tiering**: move cold objects from hot storage to infrequent-access/archive tiers (S3 Intelligent-Tiering/Glacier). **Warehouse query cost**: a single unpartitioned full-table scan in BigQuery/Snowflake can cost more than a server; partition, cluster, and cache. And the current top concern is **AI/GPU spend**: GPUs are expensive and often idle between jobs, so batch and bin-pack inference, use spot for training with checkpointing, and right-size the model to the task.

## Put unit prices on the levers

Every sentence above is a direction. What turns a direction into a plan is the unit price, because the same dollar figure on the invoice points at opposite fixes depending on which rate produced it. These are approximate US-region list prices, good to an order of magnitude and no further; they drift year to year and the ratios between them are the durable part.

\`\`\`
compute, one vCPU-hour on demand        ~0.045 dollars   (~33 dollars a vCPU-month)
one high-end GPU-hour                   ~2 to 10 dollars, by provider and commitment
transfer between AZs                    ~0.01 dollars per GB each way  = ~20 dollars per TB round trip
egress to the internet                  ~0.09 dollars per GB           = ~90 dollars per TB
warehouse scan, on-demand pricing       ~6 dollars per TB scanned
object storage, standard                ~23 dollars per TB-month
object storage, deep archive            ~1 dollar per TB-month

a 40,000 dollar a month transfer line is either
  inter-AZ chatter    40,000 / 20  =  ~2,000 TB a month between your own services
  internet egress     40,000 / 90  =    ~450 TB a month out to users (~1.4 Gbps average)

a dashboard scanning one 20 TB unpartitioned table, refreshed hourly
  20 x 6 = ~120 dollars a query, x 24 x 30   =  ~86,000 dollars a month
  partitioned by day, the query touches ~1 day of it
  0.2 x 6 x 24 x 30                          =     ~900 dollars a month
\`\`\`

**The unit price tells you which problem you have.** 2,000 TB of internal chatter is a topology problem: co-locate the chatty pair in one AZ, cache at the caller, or stop the fan-out. 450 TB going out to users is a delivery problem, and a CDN fixes it by never letting most of those bytes leave your origin. Same line on the invoice, opposite fix, and only the rate distinguishes them.

**"Costs more than a server" is literal, not rhetorical.** At roughly 33 dollars a vCPU-month, that one unpartitioned dashboard is spending what about 2,600 vCPUs would cost, and partitioning takes it down roughly a hundredfold. It is also the cheapest fix on this page to execute, because it is a schema decision rather than a purchasing negotiation.

**Idle is priced by what is idle.** A vCPU-hour and a high-end GPU-hour differ by roughly two orders of magnitude, so one GPU left idle for a single day burns 48 to 240 dollars against the 33 dollars a vCPU costs for the entire month, and a GPU idle all month costs what a fleet of roughly a hundred idle vCPUs costs. That is why the first question on an AI bill is utilization while the first question on a web bill is rightsizing: the same 35 percent utilization is a rounding error on one and the whole invoice on the other.

**Interview nuance:** never cut cost by cutting reliability blindly. Deleting a standby replica or a multi-AZ setup saves money until the outage costs 10x the savings. Frame every cut as "reduce waste (idle, over-provisioned, untiered) while preserving the reliability the SLO requires."

**Recap:** run FinOps as Inform (tag/allocate) -> Optimize (rightsize to P90/P95, spot for fault-tolerant work, commitments for baseline, scale-to-zero) -> Operate (budgets, anomaly detection); fix opaque Kubernetes cost with OpenCost/Kubecost plus consistent labels and rightsized requests; and do not ignore egress/inter-AZ transfer, storage tiering, warehouse scans, and GPU spend.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are asked to cut cloud spend by 30 percent this quarter. Which move is the wrong one to lead with?",
  "options": [
    {
      "label": "Rightsize instances and pod requests to P90 or P95 observed usage",
      "feedback": "This is the safest large lever: you are reclaiming capacity nobody used, and the percentile protects you from sizing to one freak spike."
    },
    {
      "label": "Drop the multi-AZ standby that backs the primary database",
      "correct": true,
      "feedback": "Right, this is the wrong lead. It trades a reliability guarantee you promised for a modest saving, and a single outage costs many times what it saved."
    },
    {
      "label": "Move fault-tolerant batch jobs and CI onto spot capacity",
      "feedback": "Work that can checkpoint and retry is exactly what spot is for, at 60 to 90 percent off, and no reliability promise is broken."
    },
    {
      "label": "Scale non-production environments to zero outside working hours",
      "feedback": "A dev cluster running around the clock for a team that works eight hours is mostly waste, and nothing user-facing depends on it."
    }
  ],
  "reveal": "FinOps runs as a loop: Inform by tagging so the bill maps to owners, Optimize by rightsizing to P90 or P95, spot for fault-tolerant work, commitments for the steady baseline and scale to zero for idle, then Operate with budgets, anomaly detection, and accountability. Kubernetes cost needs OpenCost or Kubecost plus consistent labels, and the levers people forget are inter-AZ and internet egress, storage tiering, unpartitioned warehouse scans, and idle GPUs. Cut waste, never the reliability the SLO requires."
}
\`\`\`
`.trim()

const oltpVsOlapTeach = `
## Two workloads that want opposite things

Every data-intensive system eventually splits into two workloads that want opposite things from a database, and confusing them is how you take down checkout with a dashboard.

## OLTP: row store, normalized

**OLTP (Online Transaction Processing)** is your product's operational database: place an order, update a balance, mark a message read. The access pattern is many small, high-concurrency transactions, each touching a few rows by primary key or a narrow index. You want low write latency (single-digit ms), strong isolation, and thousands of concurrent connections. The physical layout that serves this is a **row store**: a row's columns are stored contiguously, so fetching or updating one whole record is one disk/page read. Postgres, MySQL, and DynamoDB are OLTP engines. The schema is **normalized** to avoid update anomalies.

## OLAP: column store, denormalized

**OLAP (Online Analytical Processing)** is your analytics engine: revenue by region by day, funnel conversion, cohort retention. The access pattern is a few huge queries that scan millions to billions of rows but touch only a handful of columns, aggregating as they go. The layout that serves this is a **column store**: each column is stored contiguously, so a \`SUM(revenue) GROUP BY region\` reads only the \`revenue\` and \`region\` columns off disk and skips the other 40. Because a column holds one data type with low cardinality, columnar data compresses 5x to 20x (run-length, dictionary, delta encoding), which means less I/O, and engines run **vectorized execution** (process a batch of column values per CPU instruction) instead of row-at-a-time. Snowflake, BigQuery, ClickHouse, and Redshift are OLAP engines, usually fed a **denormalized star schema** (fact table plus dimension tables) so a query joins less.

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Dimension",
    "Row store (OLTP)",
    "Column store (OLAP)"
  ],
  "rows": [
    [
      "On disk",
      "A row's columns sit contiguously",
      "A column's values sit contiguously"
    ],
    [
      "Fetch one whole record",
      "One page read",
      "One read per column, then reassemble"
    ],
    [
      "SUM(rev) GROUP BY region",
      "Reads all 40 columns of every row",
      "Reads the rev and region columns only"
    ],
    [
      "Compression",
      "Mixed types in a page compress poorly",
      "One type per column, 5x to 20x"
    ],
    [
      "Execution",
      "Row at a time",
      "Vectorized: a batch of column values per instruction"
    ],
    [
      "Built for",
      "Many small high-concurrency transactions",
      "A few huge scanning aggregates"
    ]
  ],
  "caption": "The win is not mainly the compression, it is what never gets read: a column store touches only the columns the query names, so an aggregate over two columns of a 40 column table skips the other 38 before compression is even considered."
}
\`\`\`

\`\`\`cswidget
{
  "type": "calc",
  "title": "What a column store never reads",
  "predictPrompt": {
    "question": "SUM(rev) over a billion-row, 40-column table. Where does most of the column store's advantage over the row store come from?",
    "options": [
      "The 5x to 20x compression columnar data achieves",
      "Never reading the 38 columns the query does not name",
      "Vectorized execution, a batch of values per instruction"
    ]
  },
  "workedExample": "A billion rows, 40 columns, and 8 bytes a value. The row store stores a row contiguously, so reaching one column means reading every column of every row: 320 GB. The column store reads only the two columns the query names, 16 GB, and 5x compression takes that to 3.2 GB. Read the split before you move anything: 20x of the win came from skipping 38 columns, before one byte was decompressed, and 5x came from the compression everyone quotes first. Now drag the columns the query names upward, which is what SELECT star does, and watch the larger half of the advantage disappear while the compression stays exactly where it was.",
  "inputs": [
    {
      "kind": "slider",
      "id": "rows",
      "label": "Rows in the table",
      "min": 1000000,
      "max": 10000000000,
      "scale": "log",
      "initial": 1000000000,
      "unit": "rows"
    },
    {
      "kind": "slider",
      "id": "cols",
      "label": "Columns in the table",
      "min": 5,
      "max": 60,
      "step": 1,
      "initial": 40
    },
    {
      "kind": "slider",
      "id": "touched",
      "label": "Columns the query names",
      "min": 1,
      "max": 10,
      "step": 1,
      "initial": 2
    },
    {
      "kind": "select",
      "id": "comp",
      "label": "Columnar compression",
      "options": [
        {
          "label": "none",
          "value": 1
        },
        {
          "label": "5x",
          "value": 5
        },
        {
          "label": "20x",
          "value": 20
        }
      ],
      "initial": 1
    }
  ],
  "outputs": [
    {
      "id": "rowbytes",
      "label": "Row store reads",
      "expr": "rows * cols * 8",
      "format": "bytes"
    },
    {
      "id": "colbytes",
      "label": "Column store reads",
      "expr": "rows * touched * 8 / comp",
      "format": "bytes"
    },
    {
      "id": "skipwin",
      "label": "From skipping columns alone",
      "expr": "cols / touched",
      "format": "number",
      "unit": "x",
      "sparkline": {
        "over": "touched"
      }
    },
    {
      "id": "totalwin",
      "label": "Total advantage",
      "expr": "rowbytes / colbytes",
      "format": "number",
      "unit": "x"
    }
  ],
  "caption": "Compression is the smaller half of the story. The advantage lives in the columns that are never touched, which is why SELECT star on a columnar table throws the design away and why a wide table punishes the row store hardest."
}
\`\`\`

## Never run analytics on the OLTP primary

A single \`GROUP BY\` scan over the orders table evicts your hot rows from the buffer pool, holds read locks or MVCC snapshots that bloat, saturates I/O, and burns the connection your checkout path needed. The analytical query might run for 30 seconds; during those 30 seconds your p99 checkout latency triples. Isolation is not optional, it is the whole point.

## How data moves OLTP to OLAP

Three patterns. **ETL** (extract, transform, then load) transforms before loading, classic for warehouses. **ELT** (load raw, transform in the warehouse) is now dominant because warehouse compute is cheap and elastic. **CDC/streaming** tails the OLTP write-ahead log and streams changes continuously. The axis is freshness vs simplicity: a nightly batch load is simple and fine for finance reporting; a real-time dashboard needs CDC or streaming and more moving parts.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Dashboards were hammering the OLTP primary, so the team pointed them at a Postgres read replica instead. What is now true?",
  "options": [
    {
      "label": "Solved: the replica is a separate machine, so analytics and transactions no longer interfere",
      "feedback": "The primary really is protected from the contention, which is genuine progress. But the query itself did not improve, and the replica is not free capacity either."
    },
    {
      "label": "The primary is protected, but the replica is still a row store",
      "correct": true,
      "feedback": "Right. A replica changes which machine runs the scan, not the physical layout being scanned, so the aggregation still drags all forty columns off disk to sum one of them. Use a replica to scale OLTP-shaped reads; it is not an analytics store."
    },
    {
      "label": "It is strictly worse, because replication lag makes every dashboard number wrong",
      "feedback": "Seconds of lag is usually fine for a dashboard. The real cost is the layout: reading 40 columns off disk in order to aggregate one of them."
    }
  ]
}
\`\`\`

**Interview nuance:** a read replica is not an analytics store. A Postgres replica is still a row store with OLTP layout; pointing dashboards at it isolates the primary from lock contention but still runs column-scan queries on a row engine, which is slow and steals replica resources. Use a replica for read scaling of OLTP-shaped queries, and a real column store for analytics.

**Recap:** OLTP is row-store, normalized, small high-concurrency transactions (Postgres/DynamoDB); OLAP is column-store, denormalized star schema, huge scans with compression and vectorized execution (Snowflake/BigQuery/ClickHouse); never analyze on the OLTP primary because scans destroy transactional latency; move data via ETL, ELT, or CDC trading freshness for simplicity.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each property by the engine it describes.",
  "buckets": [
    "OLTP row store",
    "OLAP column store"
  ],
  "items": [
    {
      "label": "Fetch one order by its id and return all of its fields",
      "bucket": "OLTP row store",
      "feedback": "The whole record is contiguous, so a single page read has everything. The layout is chosen precisely to make this the cheap case."
    },
    {
      "label": "Sum one column across two billion rows, grouped by another",
      "bucket": "OLAP column store",
      "feedback": "Two of the forty-odd columns are touched. Only a layout that stores each column separately can read those two without dragging the other thirty-eight off disk with them."
    },
    {
      "label": "Whether a query needs one field or forty, roughly the same bytes come off disk",
      "bucket": "OLTP row store",
      "feedback": "A row's fields sit next to each other, so reading the row is all or nothing. That is a bargain when you wanted the record and a tax when you wanted one field of a million records."
    },
    {
      "label": "Adding a 41st column leaves existing aggregate queries untouched",
      "bucket": "OLAP column store",
      "feedback": "Each column lives in its own contiguous run, so a query that never names the new one never reads it. The same addition in a row store widens every record and therefore every page read."
    },
    {
      "label": "Ten thousand connections each holding a short write transaction",
      "bucket": "OLTP row store",
      "feedback": "Many small point operations under strong isolation, each in and out in single-digit milliseconds, is the transactional access pattern, and it is what the buffer pool and the locking are tuned for."
    },
    {
      "label": "Encoding a long run of repeated values as one count plus one value pays off",
      "bucket": "OLAP column store",
      "feedback": "Run-length encoding needs the repeats to be adjacent, which only happens when a single column is stored contiguously. That is where the 5x to 20x compression, and the I/O it saves on a scan, comes from."
    }
  ],
  "reveal": "Two workloads that want opposite physical layouts. Keep them on separate engines, never run analytics on the transactional primary, and remember that a read replica moves the scan without changing the layout it scans. Move data across with ETL, ELT, or CDC, trading freshness against operational complexity."
}
\`\`\`
`.trim()

const warehouseLakeLakehouseTeach = `
## A cost-versus-governance curve

These three are not interchangeable buzzwords; they sit at different points on a cost-versus-governance curve, and picking wrong gives you either an expensive warehouse full of data you cannot afford to keep or a cheap lake nobody can query.

## Data warehouse

Snowflake, BigQuery, Redshift. **Schema-on-write**: data is validated, typed, and modeled into curated tables before it lands. You get strong BI performance, first-class SQL, fine-grained governance, ACID, and reliable joins. The cost is rigidity and price: warehouses are optimized for structured/tabular data, ingesting raw JSON, logs, images, or video is awkward and expensive per TB, and schema changes are work. Great when the workload is dashboards and known reports over clean tabular data.

## Data lake

Files on S3/GCS/ADLS, usually Parquet/ORC/JSON. **Schema-on-read**: dump raw data cheaply now, impose structure at query time. Object storage is roughly 10x to 50x cheaper per TB than warehouse storage and holds any format, which is why ML and log workloads live here. The failure mode is the **data swamp**: with no catalog, no schema enforcement, and no ownership, the lake fills with undocumented files nobody trusts or can find, and every query becomes archaeology. A lake without governance is where data goes to die.

## Lakehouse

Databricks, or a warehouse engine reading open tables on S3. The synthesis: **lake economics** (cheap object storage, open formats, any data) **plus warehouse features** (ACID transactions, schema enforcement and evolution, time travel, governance) delivered through an **open table format** (Iceberg, Delta Lake, Hudi) layered over the raw Parquet files. You keep one cheap copy of the data and get warehouse-grade reliability on it. That is the pitch, and it is why the industry converged here for combined BI plus ML.

## The medallion pattern

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Layer",
    "What it holds",
    "Who reads it"
  ],
  "highlightCols": [
    "Layer"
  ],
  "rows": [
    [
      "Bronze",
      "Raw and append-only, exactly as ingested",
      "Nobody downstream: it is the audit trail and the replay source"
    ],
    [
      "Silver",
      "Cleaned, deduped, conformed, joined, schema enforced",
      "Data engineers, who own the promotion to gold"
    ],
    [
      "Gold",
      "Business-level aggregates and marts",
      "BI dashboards and ML feature consumers"
    ]
  ],
  "caption": "What makes this governance rather than folder naming is that every layer has an owner and a contract: consumers read gold, and the promotion between layers is somebody's job."
}
\`\`\`

Each layer has an owner and a contract; downstream consumers read gold, data engineers own the promotion between layers. This is governance you can actually enforce.

## Separation of storage and compute

The enabler underneath all of this. In old Redshift/on-prem warehouses, storage and compute were coupled on the same nodes, so to store more you paid for more compute and vice versa, and one workload starved another. In the lake/lakehouse (and modern Snowflake/BigQuery) storage is object storage and compute is separate, elastic clusters. That means you scale them independently (cheap to store 50TB, spin up compute only when querying), run **multiple engines on one copy** (Spark for ML, Trino for interactive SQL, Flink for streaming, all reading the same Iceberg tables), and give each team its own compute so they do not contend.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A team writes Parquet files into S3 and calls the result a lakehouse. What do they not actually have yet?",
  "options": [
    {
      "label": "Cheap storage that accepts any format",
      "feedback": "That half they do have. Object storage plus an open columnar format is the lake economics, and it really is 10x to 50x cheaper per TB than warehouse storage."
    },
    {
      "label": "ACID commits, schema evolution, and time travel, which come from the table format and catalog",
      "correct": true,
      "feedback": "Right. Those guarantees live in the metadata layer, not in the files. Without Iceberg, Delta, or Hudi plus a catalog, it is a lake with good intentions."
    },
    {
      "label": "Columnar compression and predicate pushdown",
      "feedback": "Parquet already gives them both, which is why the missing half is so easy to overlook: queries feel fast right up until two writers collide or a column is renamed."
    }
  ]
}
\`\`\`

**Interview nuance:** "lakehouse" without a catalog and table format is just a lake with good intentions. The ACID, schema evolution, and time travel come specifically from the table format plus a catalog, not from putting Parquet on S3. If someone says "lakehouse" ask what table format and catalog, that is where the substance is.

**Recap:** warehouse is schema-on-write, curated, strong BI/governance, pricey for raw data; lake is schema-on-read, cheap object storage, risks becoming a swamp; lakehouse gets lake economics plus warehouse features via open table formats and a catalog; use the medallion (bronze/silver/gold) pattern for governed refinement; separating storage and compute lets you scale independently and run many engines on one copy.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You hold 50 TB of raw clickstream and application logs. The BI team wants governed dashboards and the ML team wants the raw data. Which stack fits, and why?",
  "options": [
    {
      "label": "Load everything into a warehouse, since governance and BI performance are the stated requirements",
      "feedback": "The BI half fits, but warehouse storage prices raw logs and semi-structured data badly, and the ML team loses access to the unmodeled data it needs."
    },
    {
      "label": "A lakehouse: object storage under an open table format",
      "correct": true,
      "feedback": "Right. One cheap copy of the raw data for the ML team, ACID and schema enforcement from the table format and its catalog, and the medallion layers, bronze to silver to gold, carrying the governance BI needs."
    },
    {
      "label": "A plain data lake, since object storage is cheapest and both teams can read files",
      "feedback": "Cheapest today, a swamp within a year. With no catalog, no schema enforcement, and no ownership, nobody can find or trust the data and BI has nothing governed to build on."
    },
    {
      "label": "Both a lake and a warehouse, with a nightly copy from one into the other",
      "feedback": "This is a common real-world answer and it is defensible, but you now pay for two copies and maintain the sync between them, which is precisely the cost the lakehouse pattern removes."
    }
  ],
  "reveal": "Warehouse is schema on write: curated, strong BI and governance, expensive for raw data. Lake is schema on read: cheap and format-agnostic, and a swamp without governance. Lakehouse buys lake economics plus warehouse guarantees through an open table format and a catalog, refined through bronze, silver, and gold layers, and separating storage from compute is what lets Spark, Trino, and Flink all read one copy without contending."
}
\`\`\`
`.trim()

const tableFormatsCdcTeach = `
## The plumbing that makes the lakehouse real

This lesson is the plumbing that makes the lakehouse real: the table format that turns files into a database, and the CDC pattern that streams your OLTP changes in without corrupting them.

## Why raw Parquet is not enough

Parquet is a great columnar file format, but a directory of Parquet files on S3 is not a table. There is no atomicity (a reader can see a half-written batch), no schema evolution (rename a column and every reader breaks), no way to safely delete or update rows for GDPR, and no consistent view under concurrent writers. **Open table formats** (Apache Iceberg, Delta Lake, Apache Hudi, Apache Paimon) add a metadata layer over the Parquet files that provides:

- **ACID transactions** via an atomic swap of a metadata/manifest pointer, so writers commit all-or-nothing and readers always see a consistent snapshot.
- **Schema and partition evolution** without rewriting data: add/rename/drop columns, and change partitioning, tracked in metadata.
- **Time travel**: query the table as of a past snapshot or timestamp, for audits, reproducible ML training, and rollback.
- **Hidden partitioning** (Iceberg): you partition by a derived value (day of \`event_ts\`) and queries prune automatically, so users never write brittle partition predicates by hand.

## Which format when

**Iceberg** is the open standard with the broadest engine support (Spark, Trino, Flink, Snowflake, BigQuery), the right default for a multi-engine lakehouse. **Delta Lake** is Spark/Databricks-native and excellent inside that ecosystem. **Hudi** was built for CDC and record-level upserts/deletes with primary keys, strong when your workload is heavy mutation. **Paimon** targets unified streaming plus batch with a Flink lineage. A **catalog** (Iceberg REST catalog, Polaris, AWS Glue, Databricks Unity) holds the table metadata and enables governance and cross-engine access; the catalog is what lets Spark and Trino agree on what a table is.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A job keeps a search index in sync with Postgres by running a query every minute for rows whose 'updated_at' is newer than the last run. A row is deleted from Postgres. What does the search index show tomorrow?",
  "options": [
    {
      "label": "The row is gone, because the next poll will not return it",
      "feedback": "The poll returns only rows that exist. A row that is gone produces no result at all, so the job has no way to learn that it should remove anything."
    },
    {
      "label": "The row is still there, because a deleted row cannot appear in a query for changed rows",
      "correct": true,
      "feedback": "Right. Query-based polling structurally cannot see deletes, which is one of the two reasons it loses to reading the replication log."
    },
    {
      "label": "The row is still there until the next full reindex, which is the standard fix",
      "feedback": "A periodic full reindex does paper over it, at the cost of hammering the database on a schedule. That is a workaround for a mechanism that was the wrong choice."
    }
  ]
}
\`\`\`

## Log-based CDC

You want every insert/update/delete in Postgres to flow to analytics and a search index in near-real-time. The right mechanism is **log-based CDC**: **Debezium** reads the database's replication log (Postgres WAL, MySQL binlog) and emits a change event per row mutation. Log-based beats the alternatives: query-based polling (\`WHERE updated_at > x\`) misses deletes and hard-hits the DB, and trigger-based CDC adds write-path latency. Reading the log is low impact and captures every change including deletes, in commit order.

## The dual-write problem and the outbox

The trap: your service writes to Postgres and then also writes to Kafka (or directly to the search index). These are two systems with no shared transaction, so a crash between them leaves you inconsistent forever: the order is in the DB but the event never published, or published but the DB rolled back.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your service commits the order to Postgres and then publishes an OrderPlaced event to Kafka. It crashes between the two. Can a retry on restart repair the inconsistency?",
  "options": [
    {
      "label": "Yes: republish the event on startup, since the order is sitting in the database",
      "feedback": "You would have to know that this particular order never got its event. The crash took that knowledge with it, and republishing every order in the table duplicates instead of repairing."
    },
    {
      "label": "No: you cannot tell which of the two writes landed",
      "correct": true,
      "feedback": "Right, and that is the dual-write problem. With no shared transaction there is no record of how far you got, so republishing risks a duplicate and doing nothing risks a permanently missing event. The only way out is to stop having two writes."
    },
    {
      "label": "No, but a two-phase commit across Postgres and Kafka would solve it cleanly",
      "feedback": "Distributed 2PC across heterogeneous systems is what this pattern exists to avoid: it blocks when the coordinator fails, and neither system is happy hosting it."
    }
  ]
}
\`\`\`

You cannot fix this with retries because you do not know which write succeeded. The fix is the **transactional outbox**: within the same DB transaction that writes the order, insert a row into an \`outbox\` table. The business write and the event are now atomic (one transaction). CDC then tails the WAL, sees the outbox insert, and publishes it to Kafka. There is exactly one source of truth (the DB log) and no distributed transaction.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Transactional outbox into log-based CDC",
  "nodes": [
    {
      "id": "service",
      "label": "Service",
      "kind": "service"
    },
    {
      "id": "pg",
      "label": "Postgres (orders row and outbox row, one commit)",
      "kind": "db"
    },
    {
      "id": "dbz",
      "label": "Debezium (reads the WAL)",
      "kind": "service"
    },
    {
      "id": "kafka",
      "label": "Kafka",
      "kind": "queue"
    },
    {
      "id": "search",
      "label": "Search index (Elasticsearch, upsert by key)",
      "kind": "db"
    },
    {
      "id": "lake",
      "label": "Lakehouse table (Iceberg via Flink)",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "service",
      "to": "pg",
      "kind": "sync",
      "label": "one transaction"
    },
    {
      "from": "pg",
      "to": "dbz",
      "kind": "async",
      "label": "replication log"
    },
    {
      "from": "dbz",
      "to": "kafka",
      "kind": "async",
      "label": "one event per change"
    },
    {
      "from": "kafka",
      "to": "search",
      "kind": "async",
      "label": "at-least-once"
    },
    {
      "from": "kafka",
      "to": "lake",
      "kind": "async",
      "label": "at-least-once"
    }
  ],
  "stages": [
    {
      "adds": [
        "service",
        "pg"
      ],
      "note": "The requirement is that an order and its event can never disagree, so both rows commit in one transaction and the dual write the service could not repair after a crash is gone."
    },
    {
      "adds": [
        "dbz",
        "kafka"
      ],
      "note": "Publishing has to catch deletes and preserve commit order, which polling for changed rows cannot do, so the replication log becomes the single publisher."
    },
    {
      "adds": [
        "search",
        "lake"
      ],
      "note": "A connector can replay after a crash, so each consumer upserts by primary key and a redelivered event changes nothing."
    }
  ],
  "caption": "One commit writes the order and its event, the WAL is the only publisher, and idempotent consumers turn at-least-once delivery into an effectively exactly-once result."
}
\`\`\`

Because delivery is **at-least-once** (a connector can replay after a crash), downstream consumers must be **idempotent**: upsert by primary key into the search index and the Iceberg table so a redelivered event does not duplicate. Iceberg/Hudi upserts (merge-on-read or copy-on-write) handle this on the lake side.

**Interview nuance:** candidates reach for 'exactly-once' here almost every time. The question that settles it is what happens when the connector restarts mid-batch, and whether the sink can tell a redelivery from a new event; a design that cannot answer both has not earned the phrase. Claiming true exactly-once across DB, Kafka, and a search index without idempotency is the tell of someone who has not run this in production.

**Recap:** table formats (Iceberg/Delta/Hudi/Paimon) add ACID, schema/partition evolution, time travel, and hidden partitioning over Parquet, coordinated by a catalog; pick Iceberg for multi-engine, Hudi for upsert-heavy CDC; use log-based CDC (Debezium on the WAL/binlog) plus a transactional outbox to avoid the dual-write problem; delivery is at-least-once so make consumers idempotent for effective exactly-once.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "With a transactional outbox plus Debezium in front of Kafka, how would you describe the delivery guarantee end to end?",
  "options": [
    {
      "label": "Exactly-once, because the outbox row and the business row commit together",
      "feedback": "The atomic source write is only half of the story. The connector can replay after a crash, so the same event can reach a consumer more than once."
    },
    {
      "label": "At-least-once with an atomic source write, made effectively exactly-once by idempotent consumers",
      "correct": true,
      "feedback": "Right. The outbox removes the dual write and idempotency removes the duplicate. Upsert by primary key into the search index and the table format, and a replay changes nothing."
    },
    {
      "label": "At-most-once, since a crashed connector may skip events",
      "feedback": "The log is durable and the connector tracks its position, so it resumes rather than skipping. The risk here is repetition, not loss."
    },
    {
      "label": "Exactly-once, as long as Kafka transactions are enabled on the producer",
      "feedback": "Kafka transactions help within Kafka, but the search index and the lake table sit outside that boundary, so the last hop still has to be idempotent."
    }
  ],
  "reveal": "Table formats turn a directory of Parquet into a table: ACID through an atomic metadata swap, schema and partition evolution, time travel, and hidden partitioning, coordinated by a catalog so several engines agree on what a table is. Log-based CDC on the WAL or binlog captures every change including deletes, in commit order, at low cost. The outbox makes the business write and the event one transaction, and idempotent consumers turn at-least-once delivery into an effectively exactly-once result."
}
\`\`\`
`.trim()

const batchStreamingTeach = `
## One processing path or two?

The last piece is how data is processed over time, and the central interview question is whether you need two processing paths or one. Getting this right saves you from maintaining two codebases that slowly disagree.

## Batch vs streaming

A throughput-versus-latency tradeoff. **Batch** processes a bounded chunk (yesterday's events) on a schedule: high throughput, simple correctness (you have all the data before you compute), high latency (results are hours old). Spark and classic MapReduce are batch engines. **Streaming** processes an unbounded flow event by event: low latency (seconds), continuous, but correctness is harder because data arrives late, out of order, and you must decide when a window is "done." Flink and Spark Structured Streaming are streaming engines, fed by a durable log (Kafka, Pulsar).

## Lambda architecture

The first mainstream answer to "I need both fast and correct." It runs **two parallel layers**: a **batch layer** that reprocesses all history nightly to produce accurate, complete results, and a **speed layer** that processes the live stream for low-latency approximate results, with a serving layer merging the two so recent data comes from the speed layer and older data from the batch layer. It works and is self-correcting: the batch layer eventually overwrites any speed-layer approximation, so a wrong number is temporary rather than permanent.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Lambda architecture genuinely delivers both fast and accurate results. Which cost accumulates on you over the years?",
  "options": [
    {
      "label": "The same logic is written twice, in two different engines",
      "correct": true,
      "feedback": "Right. Every change to a metric definition is two changes in two codebases written against different engines, so they drift, and on the day the two numbers disagree nobody can say which one is correct."
    },
    {
      "label": "The speed layer's approximate results stay permanently wrong",
      "feedback": "The design is self-correcting on exactly that point: the batch layer reprocesses history and overwrites whatever the speed layer approximated."
    },
    {
      "label": "The batch layer cannot handle late-arriving data",
      "feedback": "Batch handles late data best of all, because it recomputes over a bounded chunk once everything has landed. That is why it is the accurate half."
    },
    {
      "label": "You must retain the full event log forever, and that storage dominates the bill",
      "feedback": "Long log retention is the price of the alternative, Kappa, which replays that log to recompute. It is not what makes Lambda expensive."
    }
  ]
}
\`\`\`

The cost is brutal: you implement the **same business logic twice**, once in a batch engine and once in a streaming engine, in different code, and they drift. Every metric change is two implementations to keep in sync.

## Kappa architecture

The reaction: delete the batch layer. There is **one streaming path**, and the durable log (Kafka) is the system of record with long retention. If you need to recompute history (bug fix, new metric), you **replay the log** from the beginning through the same streaming code. One codebase, one set of logic, no drift. Kappa is the default for new systems when the streaming engine can express your logic and the log retention is affordable.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Lambda against Kappa",
  "reveal": "all",
  "nodes": [
    {
      "id": "events",
      "label": "Event stream",
      "kind": "queue"
    },
    {
      "id": "kafka",
      "label": "Kappa: the same events, retained in Kafka",
      "kind": "queue"
    },
    {
      "id": "batch",
      "label": "Lambda batch layer (all history, accurate)",
      "kind": "service"
    },
    {
      "id": "speed",
      "label": "Lambda speed layer (live, approximate)",
      "kind": "service"
    },
    {
      "id": "merge",
      "label": "Serving layer (merges the two)",
      "kind": "db"
    },
    {
      "id": "job",
      "label": "Stream job (one codebase)",
      "kind": "service"
    },
    {
      "id": "tables",
      "label": "Iceberg tables (real time and reporting)",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "events",
      "to": "batch",
      "kind": "async",
      "label": "reprocess history"
    },
    {
      "from": "events",
      "to": "speed",
      "kind": "async",
      "label": "live"
    },
    {
      "from": "batch",
      "to": "merge",
      "kind": "sync",
      "label": "accurate, hours old"
    },
    {
      "from": "speed",
      "to": "merge",
      "kind": "sync",
      "label": "recent, approximate"
    },
    {
      "from": "kafka",
      "to": "job",
      "kind": "sync",
      "label": "read once"
    },
    {
      "from": "job",
      "to": "tables",
      "kind": "sync",
      "label": "exactly-once sink"
    },
    {
      "from": "job",
      "to": "kafka",
      "kind": "feedback",
      "label": "replay to recompute"
    }
  ],
  "caption": "Lambda buys accuracy and freshness with two layers, and pays for it forever in the same business logic written twice against two engines. Kappa keeps one streaming path and replays the retained log when history has to be recomputed, and landing that stream in Iceberg tables serves the reporting consumer from the same codebase."
}
\`\`\`

## Event-time, watermarks, and delivery

**Processing-time** is when your job sees an event; **event-time** is when it actually happened. A phone offline in a tunnel sends events with an event-time from 10 minutes ago. If you window by processing-time you put those events in the wrong bucket and your per-minute counts are wrong. So you window by **event-time**, and a **watermark** is the engine's assertion "I believe I have now seen all events up to time T," which lets it close the window for T and emit results. Late events arriving after the watermark are handled by policy: drop them, or emit an updated result (allowed lateness). Watermarks are the explicit tradeoff between latency (advance aggressively, emit fast, risk dropping late data) and completeness (wait longer, more correct, higher latency).

\`\`\`cswidget
{
  "type": "watermark-sim",
  "title": "Event-time vs processing-time windows",
  "predictPrompt": {
    "question": "A phone offline in a tunnel sends events stamped with an event-time from minutes ago. If the job windows by processing-time, where do those late events land?",
    "options": [
      "In the bucket for when they actually happened",
      "In whatever bucket is open when they arrive, inflating it while the true bucket stays undercounted",
      "Nowhere; the engine rejects timestamps that are too old"
    ]
  },
  "workedExample": "The same stream runs under two clocks. In processing-time mode, an event counts toward whatever window is open when the job sees it, so a delayed burst lands in the wrong bucket: the interval it belongs to is undercounted and the current one is inflated, which is exactly how per-minute counts go wrong. Switch to event-time mode: each event is placed by when it actually happened, and the watermark, trailing the max event time seen, decides when a window is done and can emit. Then work the lateness slider, the explicit watermark tradeoff: advance aggressively and emit fast but risk dropping late data, or allow more lateness for completeness at higher latency.",
  "seed": "l9-batch-streaming-clocks",
  "count": 70,
  "horizon": 140,
  "skew": 14,
  "windowSize": 20,
  "watermarkDelay": 5,
  "allowedLateness": 10,
  "maxLateness": 40,
  "modes": [
    "event-time",
    "processing-time"
  ],
  "caption": "Processing-time puts late events in the wrong bucket; event-time plus a watermark puts them where they belong, and the lateness bound is the latency-versus-completeness trade."
}
\`\`\`

**Delivery semantics.** **At-least-once** can double-count; **exactly-once** requires the engine to coordinate checkpoints with idempotent/transactional sinks. Flink provides exactly-once via distributed checkpointing (Chandy-Lamport) plus two-phase-commit sinks. For a fraud counter or a financial total this matters; for a rough traffic dashboard at-least-once is fine.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The product needs a live fraud signal within seconds and a nightly finance report over the same events. Does that force two pipelines?",
  "options": [
    {
      "label": "Yes: real-time and reporting are different workloads, so they need a stream job and a batch job",
      "feedback": "They are different consumers, which is not the same as different pipelines. Assuming they must be separate is how teams end up in Lambda by default."
    },
    {
      "label": "No: the stream job can land its output in a table the report queries",
      "correct": true,
      "feedback": "Right. A streaming engine that writes exactly-once into an open table format gives the live consumer its signal and leaves the reporting consumer an ordinary table to query, out of one codebase."
    },
    {
      "label": "No: run the nightly report by replaying the entire log through the stream job each night",
      "feedback": "Replay is the recompute tool for a bug fix or a new metric, not a nightly routine. Reprocessing all history every night is far more work than querying a table."
    }
  ]
}
\`\`\`

## Streaming-into-lakehouse collapses the two paths

The modern move that makes Kappa practical for reporting too: **Flink writes the stream directly into Iceberg** tables (exactly-once). Now the live stream powers the real-time signal, and the same Iceberg tables it lands in are queried by batch SQL (Trino, Spark) for nightly reports. One pipeline feeds both the real-time consumer and the reporting consumer, so you no longer maintain a separate batch path at all.

**Interview nuance:** do not reflexively say "Lambda" because you need both real-time and batch outputs. State the condition: Lambda is justified only when the batch engine can express something the stream cannot, or when you need a periodic full-reprocessing guarantee the stream cannot give cheaply. Otherwise Kappa plus log replay plus streaming-into-lakehouse gives you both outputs from one codebase, and that is the stronger default answer.

**Recap:** batch is high-throughput/high-latency and simple, streaming is low-latency/continuous and correctness-hard; Lambda runs parallel batch and speed layers (accurate but two codebases that drift), Kappa runs one streaming path and replays the retained log to recompute; window by event-time with watermarks to handle late/out-of-order data trading latency for completeness; choose exactly-once where counts must be exact; and Flink-into-Iceberg collapses real-time and reporting into one pipeline.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are designing a fraud-scoring pipeline whose counts feed a chargeback dispute process. Which delivery guarantee do you commit to, and why?",
  "options": [
    {
      "label": "At-least-once, because it is simpler and duplicates are rare",
      "feedback": "Rare duplicates still inflate a number somebody has to defend in a dispute. At-least-once is right for a rough traffic dashboard, not for a figure with money attached."
    },
    {
      "label": "Exactly-once, through engine checkpointing coordinated with transactional or idempotent sinks",
      "correct": true,
      "feedback": "Right. Flink gets there with distributed checkpoints plus two-phase-commit sinks, and you accept the checkpoint overhead because the count has to be auditable."
    },
    {
      "label": "At-most-once, since undercounting is safer than overcounting in fraud",
      "feedback": "Silently dropping events loses the fraud you were paid to catch, and it is not a guarantee anyone can audit back against the source."
    },
    {
      "label": "It does not matter, because windowing by event time already makes the counts exact",
      "feedback": "Event-time windows put each event in the right bucket. They do nothing to stop the same event being counted in that bucket twice."
    }
  ],
  "reveal": "Batch is high throughput and simple because the data is already complete; streaming is low latency and correctness-hard because data arrives late and out of order. Lambda buys both with two codebases that drift, so Kappa is the default: one streaming path over a retained log you replay to recompute. Window by event time with watermarks and an explicit lateness bound, choose exactly-once wherever the number must be exact, and land the stream in lake tables so reporting and real time come out of one pipeline."
}
\`\`\`
`.trim()

export const systemDesignLevel9: DesignLevel = {
  id: 9,
  slug: "modern-architecture",
  title: "Level 9: Modern Architecture & Delivery",
  tagline:
    "Service architecture, containers and orchestration, serverless and edge, delivery and FinOps, and data-intensive analytics.",
  estimatedHours: 8,
  modules: [
    {
      id: "sd-l9-m1",
      title: "Service Architecture",
      description:
        "Defend an architecture choice (monolith, modular monolith, or microservices) from real requirements, draw service boundaries that will not decay into a distributed monolith, and wire the communication between services so one slow dependency does not take the whole system down.",
      lessons: [
        {
          id: "sd-l9-monolith-vs-microservices",
          title: "Monolith vs Modular Monolith vs Microservices",
          summary:
            "Why a distributed monolith is the worst of both worlds, and the concrete triggers that justify extracting your first service from a modular monolith.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["microservices", "monolith", "architecture"],
          teach: {
            markdown: monolithVsMicroservicesTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-monolith-vs-microservices-apply",
            prompt:
              "Recommend an architecture for a 12-engineer Series-B startup's ordering platform, then define the exact triggers that would make you extract the first microservice.",
            thinkAbout: [
              "Why default to a modular monolith first?",
              "What are the real extraction triggers (org, deploy cadence, scaling profile)?",
              "What is a distributed monolith and why is it the worst outcome?",
            ],
            modelAnswerOutline: [
              "Assumptions: 12 engineers, roughly 2 to 3 small teams, moderate traffic (low thousands of orders per minute at peak), a product still changing shape weekly. At this size, engineering time is the scarce resource, not compute.",
              "**Recommendation: build a modular monolith.** One deployable application, one primary database (Postgres), but hard internal module boundaries: Orders, Catalog, Payments, Fulfillment, and Identity each expose an interface and own their tables, with no cross-module table reads. Package by module, enforce with import linting or an internal API layer so a violation fails CI. This gives a 12-person team a single fast deploy pipeline, transactional consistency for order placement (a real business need), and simple local debugging, while keeping seams so any module can be lifted out later.",
              "**Concretely:** a single Docker image behind a load balancer, autoscaled horizontally, backed by managed Postgres and Redis. Async work (emails, webhooks) goes on a queue (SQS or a Postgres-backed queue) even inside the monolith, so background jobs do not block requests.",
              "**Extraction triggers, defined in advance so the decision is not vibes:** (1) org contention, when a third or fourth team is regularly blocked on the shared deploy, extract along team ownership lines (Inverse Conway); (2) deploy cadence divergence, if Payments must ship on a slow compliance-gated cadence while the rest ships daily; (3) scaling divergence, if Catalog search needs 10x the CPU of everything else; (4) fault isolation, if a flaky Fulfillment integration threatens order placement.",
              "**First service to extract** is almost always the one with the most distinct scaling or cadence profile, often search or notifications, not the transactional core.",
              "Common wrong turn: splitting into 6 services on day one. With 12 engineers you would spend your quarters on distributed tracing, saga bugs, and Kubernetes plumbing instead of product, and you would likely land a distributed monolith (shared DB, coupled deploys) that has every cost and no benefit.",
            ],
          },
          practice: {
            id: "sd-l9-monolith-vs-microservices-practice",
            prompt:
              "Design the migration path for a company like Prime Video that runs its video quality-monitoring pipeline as distributed steps, orchestrated by AWS Step Functions over Lambda functions that hand video frames to each other through S3, and is now paying too much for it. Recommend whether to consolidate and how, leading with the deliverable.",
            thinkAbout: [
              "How do you confirm the cost is network/storage transfer, not compute?",
              "Which steps consolidate and which stay split?",
              "Why does per-step independent scaling lose nothing here?",
            ],
            modelAnswerOutline: [
              "Deliverable: consolidate the chatty, data-heavy steps into a single process, keeping only the genuinely independent components separate.",
              "**Diagnosis first.** The problem signature is high inter-step data volume: every frame is written to S3 by one step and read back by the next, so the bill is dominated by S3 operations and orchestration state transitions, not compute. This is the case where a distributed split actively hurts, because the 'hop' cost dwarfs the 'work' cost. A chain of steps that must all run for every frame has a coupled lifecycle and gains nothing from being split, so it pays the full transfer tax and buys no independence.",
              "**Recommendation:** merge the frame-processing steps (frame conversion, the defect detectors, aggregation) into one process where data moves in memory instead of through object storage. This is the change Amazon's Video Quality Analysis team actually made: they collapsed the Step Functions and Lambda pipeline into a single process running on ECS and EC2 and reported about 90% lower cost, because in-memory handoff replaced the S3 round trips and the orchestration transitions. Say the limit of that evidence out loud, because interviewers listen for it: this was one data-heavy pipeline where the per-hop transfer cost dwarfed the actual work cost, so it is a verdict on that shape of workload, not a general verdict that microservices cost more.",
              "**What stays split:** control-plane and orchestration pieces with a genuinely different profile, for example the API that schedules jobs, the dashboard, and any component that scales on a different axis. Keep those as separate services because they meet a real trigger (different cadence, different scaling).",
              "**Migration path:** (1) instrument to confirm the cost is transfer, not compute, so the decision is data-driven, (2) combine the hot data-path steps behind a feature flag into one deployable, (3) run old and new in parallel on a slice of traffic and compare cost and latency, (4) cut over and decommission the redundant functions and their intermediate storage buckets.",
              "Tradeoff acknowledged: the consolidated process scales as one unit and loses per-step independent scaling, but for a pipeline where every step runs on every frame anyway, that independence was never being used, so nothing real is lost while the network and storage bill collapses.",
            ],
          },
        },
        {
          id: "sd-l9-decomposition-ddd",
          title: "Service Decomposition & Bounded Contexts (DDD)",
          summary:
            "Where to cut a monolith: bounded contexts over technical layers, one owner per dataset, and Strangler Fig extraction behind an anti-corruption layer.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["ddd", "bounded-context", "decomposition"],
          teach: {
            markdown: decompositionDddTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-decomposition-ddd-apply",
            prompt:
              "Produce a service map for a monolithic e-commerce app: name the bounded contexts, their data ownership, and the two seams you would cut first.",
            thinkAbout: [
              "Why align boundaries to business capabilities, not technical layers?",
              "Why must each service own its data (no shared DB)?",
              "How does the Strangler Fig pattern extract incrementally?",
            ],
            modelAnswerOutline: [
              "Assumptions: a working monolithic e-commerce app with a single database, one team growing into several, and a need to ship independently in a couple of high-churn areas.",
              "**Bounded contexts and data ownership** (each owns its own datastore, accessed only by API or events): Catalog (products, SKUs, prices, search index; owns product master data); Inventory (stock levels per SKU per warehouse, reservations; owns availability); Orders (carts, orders, line items, order state machine; owns the order lifecycle); Payments (charges, refunds, payment methods, ledger; owns money movement); Shipping/Fulfillment (shipments, carriers, tracking); Identity (users, auth, addresses, profiles; owns the customer record).",
              "**Cross-context data** is handled by API calls for reads that must be fresh (Orders asks Payments to authorize a charge) and by events for propagation (Identity publishes customer-address-changed, Shipping keeps a local copy). No service joins another's tables. When Orders needs product name and price at checkout, it either calls Catalog or, better, snapshots price into the order at placement time so a later price change does not rewrite history.",
              "**Seam #1: Payments.** It has a different cadence (compliance-gated, careful releases), a strong fault-isolation need (you never want a catalog bug to touch money), and a clean interface (authorize, capture, refund). Extract it with a Strangler Fig: route payment calls through a gateway to the new service, wrap the legacy payment code in an anti-corruption layer, then decommission.",
              "**Seam #2: Catalog/Search.** It has a divergent scaling profile (read-heavy, needs its own search infra like Elasticsearch and heavy caching) that is wasteful to scale together with transactional order code.",
              "Common wrong turn: splitting by technical layer (a 'database service,' an 'API service') or letting the new Payments service keep reading the monolith's orders table for convenience. That shared table recouples them into a distributed monolith and defeats the extraction.",
            ],
          },
          practice: {
            id: "sd-l9-decomposition-ddd-practice",
            prompt:
              "Review the proposed service map below and rank the boundaries that will not hold, worst first. For each one, name what stays coupled to what, and give the boundary you would draw in its place.",
            thinkAbout: [
              "Which of these services owns its data, and which ones reach into someone else's?",
              "How many hops does one fare quote take, and what does a slow Tax service do to it?",
              "What does a single shared model package do to nine independent release schedules?",
            ],
            supplied: {
              label: "Proposed service map (internal RFC)",
              body: `
Internal RFC: splitting the ride-hailing monolith. One Python service, one Postgres, three engineering teams today, hiring to eight over the next year.

**Cutover.** All nine services below ship on one release weekend. Routing changes once, the on-call rota changes once, and we never run two code paths side by side.

**Services**

- **Driver-Location.** Owns a Redis geospatial index, written from driver pings every 4s. It leaves Postgres because its write rate is roughly 200x anything else in the system.
- **Dispatch.** Stateless matcher, reads Driver-Location over gRPC.
- **Trip-Data.** Owns every read and write against the existing \`trips\`, \`riders\` and \`drivers\` tables. Other services call it for that data, so we keep one schema and avoid a migration while the boundaries are still settling.
- **Base-Fare**, **Surge**, **Promo**, **Tax.** One service each, so a pricing change deploys without touching trip code. A quote calls all four in sequence and then Trip-Data to persist the result; each hop measured 6 to 10 ms in staging.
- **Payments.** Owns its own Postgres. Ships on the fortnightly compliance cadence rather than the daily one.
- **Rider-API.** The HTTP entry point for the rider app: request validation, auth and response shaping for every rider feature, calling the services above.

**Shared models.** All nine services import \`platform-models\`, a package published from the monolith's existing SQLAlchemy classes, so a Trip means the same thing everywhere and no team re-declares a schema.

**Reporting.** Dispatch, Surge and Promo also hold read-only credentials on the main Postgres, so their dashboards can join trips against pricing without a new pipeline.

**Teams.** The three existing teams take three services each at cutover, and ownership is redrawn as hiring lands.
`.trim(),
            },
            modelAnswerOutline: [
              "Deliverable: three of the nine boundaries are sound and the rest rebuild the monolith's coupling with a network in the middle. Ranked worst first: Trip-Data, the shared `platform-models` package, the four pricing services, Rider-API, and the one-weekend cutover.",
              "**Trip-Data is a technical layer, not a bounded context.** Every other service asks it for trips, riders and drivers, so no capability owns that data and the legacy schema stays the shared contract it always was. Trips belong to the context that owns the trip lifecycle, rider records to Rider, driver records to Driver. The reporting credentials say the same thing out loud: Dispatch, Surge and Promo read those Postgres tables directly, so renaming a column in `trips` now needs a coordinated deploy across four services. Reporting reads belong on a copy fed by events, not on the live schema.",
              "**`platform-models` recouples all nine services at compile time.** A package generated from the monolith's SQLAlchemy classes lets the legacy model dictate every service's shape, and on any breaking change it dictates every service's release date too. Each service declares only the fields it needs, and each seam carries an anti-corruption layer that translates the legacy model into the new one. That translation is most of the value of extracting at all.",
              "**Base-Fare, Surge, Promo and Tax are nano-services.** They change together (they are all pricing rules), one team owns all four, and a single quote pays five sequential hops at 6 to 10 ms with five independent chances of failure. One Pricing service holding the four as internal modules still delivers the stated benefit, that pricing deploys without touching trip code, at one hop.",
              "**Rider-API is a split by layer.** Putting validation and response shaping for every rider feature in one service means every feature change touches Rider-API plus its domain service, which is the coordinated deploy the split was supposed to remove. A thin gateway for TLS, auth and routing is worth keeping; per-feature validation belongs in the context that owns the rule.",
              "**Sequencing and org.** Nine services in one weekend has no incremental rollback: when matching regresses at 02:00 you are reverting a routing change, a schema change and nine deploys together. Strangler Fig instead, a router in front and one capability at a time: Driver-Location and Dispatch first because their scaling trigger is the sharpest, Payments second for cadence and fault isolation, Pricing third, with Rider, Trip and the rest left in a shrinking core. Three teams also cannot own nine services, so team topology leads the extraction (Inverse Conway): form the Dispatch team before Dispatch exists and let hiring pace the seams.",
              "**What the map already gets right, and worth saying out loud in an interview:** Driver-Location moving off Postgres into a Redis geospatial index is a textbook trigger, a write rate 200x the rest of the system and an access pattern nothing else shares, with its own store. Dispatch sitting beside it as a stateless matcher is the same trigger, one capability with a real-time latency profile. Payments owning its own Postgres on a fortnightly compliance cadence is the cadence and fault-isolation trigger. All three boundaries stay as proposed.",
            ],
            rubric: [
              {
                name: "Data ownership",
                weak: "Takes Trip-Data at face value as a service, and never asks what the read-only Postgres credentials held by Dispatch, Surge and Promo cost.",
                adequate:
                  "Names the shared Postgres as coupling but does not say which data moves to which context.",
                strong:
                  "Calls Trip-Data a layer rather than a capability, places trips, riders and drivers with their owning contexts, and notes a column rename now spans four deploys.",
              },
              {
                name: "Boundary sizing",
                weak: "Leaves Base-Fare, Surge, Promo and Tax as four services without counting what one fare quote pays for them.",
                adequate:
                  "Calls the pricing split too fine without saying what merges into what, or what the merge preserves.",
                strong:
                  "Merges the four into one Pricing context on shared change cadence and single-team ownership, and prices the five sequential hops the current split adds per quote.",
              },
              {
                name: "Coupling through shared code",
                weak: "Never mentions `platform-models` or what importing one legacy model package into nine services does.",
                adequate:
                  "Flags the shared model package as a smell without tying it to release schedules or to the legacy model leaking through.",
                strong:
                  "Ties `platform-models` to compile-time recoupling and a shared release date, and puts an anti-corruption layer at each seam in place of it.",
              },
              {
                name: "Extraction sequence and ownership",
                weak: "Accepts the one-weekend cutover of nine services and says nothing about three teams owning them.",
                adequate:
                  "Prefers an incremental extraction but does not order the seams or connect the order to hiring.",
                strong:
                  "Orders the seams by trigger sharpness, starting with Driver-Location and Dispatch, and forms each owning team before the service it will own.",
              },
              {
                name: "Credit for the sound calls",
                weak: "Reads as a list of everything wrong, sweeping Driver-Location and Payments in with the rest.",
                adequate:
                  "Leaves the two sound extractions alone without saying which trigger justifies either one.",
                strong:
                  "Keeps Driver-Location's Redis index and Payments' own Postgres and compliance cadence, naming the scaling trigger behind one and the cadence trigger behind the other.",
              },
            ],
          },
        },
        {
          id: "sd-l9-inter-service-comm",
          title: "Inter-Service Communication",
          summary:
            "When one service should call another synchronously, when an event is better, and the four primitives that stop a slow dependency cascading into an outage.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["inter-service", "grpc", "saga"],
          teach: {
            markdown: interServiceCommTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-inter-service-comm-apply",
            prompt:
              "Design the communication for a checkout flow spanning cart, payment, inventory, and shipping services and justify each sync vs async hop.",
            thinkAbout: [
              "Which hops are sync request-response and which are async events?",
              "Orchestration vs choreography: what do you trade in visibility and coupling?",
              "How do timeouts, retries, and idempotency prevent cascading failure?",
            ],
            modelAnswerOutline: [
              "Assumptions: user clicks 'place order,' and the flow spans Cart, Payment, Inventory, and Shipping. Correctness on money and stock matters, and the user is waiting on the request.",
              "**Sync hops.** Cart -> Inventory (reserve stock): synchronous gRPC; the user must know now whether the item is available, and we must reserve before charging. Timeout ~300 ms, idempotent reservation keyed by cart id. Cart -> Payment (authorize charge): synchronous gRPC; we need the auth result before confirming the order. Idempotency key on the payment request so a retry never double-charges. Timeout ~2 s (payment gateways are slow), one retry with jitter.",
              "**Async hops.** Order confirmed -> everything downstream (Shipping label, email, analytics, loyalty): asynchronous events on Kafka. The user does not need to wait for a shipping label; publishing an order-confirmed event lets Shipping, Notifications, and Analytics each consume independently. This keeps user-facing latency to just the reserve plus authorize path and means a slow Shipping service never blocks checkout.",
              "**Control model:** orchestration via a saga coordinator (Temporal) for the reserve -> authorize -> confirm sequence, because it has real failure branches and needs compensations. If Payment fails after reserving stock, the saga runs the compensation to release the reservation. If we confirmed the order but Shipping later cannot fulfill, that is handled async with its own compensation (refund plus notify), not by blocking checkout.",
              "**Resilience:** every sync call has a bounded timeout, retries use exponential backoff with jitter to avoid a retry storm hammering a recovering Payment service, and a circuit breaker on Payment fails fast (and shows the user a friendly retry) if the gateway is down rather than piling up threads. Idempotency keys on both reserve and authorize make retries safe.",
              "Common wrong turn: making every hop synchronous, including shipping and email, so the user waits on the slowest downstream service and a Shipping outage takes checkout down entirely. The fix is to draw the line at 'order confirmed': synchronous up to the point of commitment, async for everything after.",
            ],
          },
          practice: {
            id: "sd-l9-inter-service-comm-practice",
            prompt:
              "Design the inter-service communication for a food-delivery order flow at DoorDash scale (millions of orders/day, spanning order, restaurant, dispatch, driver, and payment services) where the restaurant may take minutes to accept and drivers are matched asynchronously. Lead with the deliverable and justify the sync/async split under a slow human in the loop.",
            thinkAbout: [
              "Why is synchronous blocking impossible with a multi-minute human wait?",
              "Why does orchestration beat choreography for a long-lived order state machine?",
              "How do you keep the flow correct under redelivery and poison events?",
            ],
            modelAnswerOutline: [
              "Deliverable: a mostly-async, event-driven flow with a saga tracking the long-lived order state, because a human (the restaurant) is in the loop and can take minutes, so synchronous blocking is impossible.",
              "**The key insight:** unlike instant e-commerce checkout, this flow contains a multi-minute human wait (restaurant acceptance) and an asynchronous match (finding a driver). You cannot hold a synchronous request open for that. So the order becomes a long-lived state machine driven by events.",
              "**Synchronous hops (short, must-know-now):** the initial Order -> Payment pre-authorization (gRPC, idempotency key, ~2 s timeout) so we hold funds before committing, and Order -> Restaurant availability check. That is roughly it for sync.",
              "**Asynchronous, event-driven (Kafka), coordinated by a saga orchestrator holding order state:** order-placed event -> Restaurant service notifies the restaurant; the order sits in PENDING_ACCEPTANCE with a timeout (say 10 minutes) after which the saga auto-cancels and voids the pre-auth (compensation). restaurant-accepted event -> Dispatch begins matching (itself async, may retry across drivers). driver-assigned and order-delivered events advance the state machine; payment capture fires on delivery, not on order, so we only charge for fulfilled orders.",
              "**Why orchestration here:** the flow has long timeouts, human-driven branches, and multiple compensation points (void pre-auth on restaurant reject, refund on undeliverable). A saga orchestrator gives one auditable place to see where every order is, essential for support and ops at millions/day. Pure choreography would scatter this state and make 'why is order X stuck?' unanswerable.",
              "**Resilience at scale:** partition Kafka by order id for per-order ordering, use idempotent consumers (a driver-assigned event may be redelivered), circuit breakers on Payment, and dead-letter queues so one poison message does not stall a partition; backpressure via consumer-lag monitoring and autoscaling dispatch consumers on queue depth. Tradeoff accepted: the whole flow is eventually consistent and the user sees status transitions (placed, accepted, preparing, on the way) rather than a single synchronous confirmation, which is correct when a slow human sits in the middle.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l9-m2",
      title: "Containers & Orchestration",
      description:
        "Specify a production Kubernetes deployment (workload objects, probes, zero-downtime rollouts), design autoscaling that reacts to the right signal instead of reflexively scaling on CPU, decide when a service mesh earns its cost, and use the 12-factor and cloud-native principles as an explicit lens to make a legacy stateful service safe to run and scale in containers.",
      lessons: [
        {
          id: "sd-l9-containers-k8s",
          title: "Containers & Kubernetes Fundamentals",
          summary:
            "Why readiness probes, not liveness probes, are what make a Kubernetes rolling update zero-downtime, and which controller each workload belongs in.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["kubernetes", "containers", "probes"],
          teach: {
            markdown: containersK8sTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-containers-k8s-apply",
            prompt:
              "Design the Kubernetes deployment for a stateless web API plus a stateful Postgres: specify the workload objects, health probes, and how a rolling update stays zero-downtime.",
            thinkAbout: [
              "Which workload objects fit stateless vs stateful?",
              "How do liveness/readiness/startup probes drive a safe rollout?",
              "Why prefer a managed DB over self-hosting state in K8s?",
            ],
            modelAnswerOutline: [
              "Assumptions: an HTTP API doing a few thousand RPS, config and secrets external to the image, and Postgres as the primary datastore. Availability target is zero-downtime deploys and rolling node maintenance.",
              "**Stateless API:** a **Deployment** with, say, 6 replicas behind a **Service** (ClusterIP) and an **Ingress/Gateway** for TLS and north-south routing. The image is a multi-stage distroless build. Config comes from a **ConfigMap**, secrets from a **Secret** (ideally backed by an external secrets manager). Set requests (250m CPU / 256Mi) and limits, spread replicas with zone anti-affinity, and add a **PodDisruptionBudget** of `minAvailable: 5` so a drain never drops below capacity.",
              "**Probes:** a **readinessProbe** hitting `/readyz` that returns 200 only when the app can reach Postgres and its caches, a **livenessProbe** on a cheap `/livez` that only fails on a genuinely wedged process, and a **startupProbe** if boot is slow so liveness does not kill a warming instance. The API must be stateless: session in Redis, uploads in S3, nothing on local disk, so any replica serves any request.",
              "**Zero-downtime rollout:** a RollingUpdate with `maxUnavailable: 0, maxSurge: 1`. Kubernetes starts a new Pod, waits for its readiness probe to pass, adds it to the Service endpoints, then terminates one old Pod. Because new capacity is ready before old capacity leaves, live traffic never hits a cold or missing Pod. Add a `preStop` hook plus `terminationGracePeriodSeconds` so draining Pods finish in-flight requests after SIGTERM.",
              "**Stateful Postgres:** if self-hosting, a **StatefulSet** with a **PersistentVolumeClaim** template so each Pod keeps stable identity and storage, plus a headless Service. But the committed recommendation is to **not** self-host the primary database: use a managed service (RDS/Cloud SQL/Aurora) for backups, failover, patching, and PITR, and let Kubernetes run only the stateless tier.",
              "Common wrong turn: putting Postgres in a plain Deployment (Pods are interchangeable, so a reschedule can corrupt or lose the volume), or relying on a livenessProbe to gate rollout traffic when readiness is the correct gate.",
            ],
          },
          practice: {
            id: "sd-l9-containers-k8s-practice",
            prompt:
              "Review the deployment spec below and rank what it costs in dropped requests and lost carts, worst first. For each item name the object or field you would change, and what the change costs in capacity or latency.",
            thinkAbout: [
              "What decides which Pods are in the Service endpoints during a rollout?",
              "What do all 400 Pods do at the same moment when the payment gateway stalls for 30s?",
              "Where does a cart live when its Pod is replaced?",
            ],
            supplied: {
              label: "Proposed deployment spec",
              body: `
Checkout API on Kubernetes, submitted a week before the peak sale. Peak traffic is about 40,000 rps across three zones.

**Image.** Multi-stage build on a distroless base, 60 MB. Config comes from a ConfigMap and secrets from a Secret backed by the external secrets manager, so the same image promotes from staging to production unchanged.

**checkout-api.** A Deployment of 400 replicas with zone anti-affinity, behind a Service and a Gateway listener.

**Session state.** The cart and session live on an \`emptyDir\` volume on each Pod, and the Gateway pins a user to their Pod with a sticky cookie. A cart read is then 1 ms of local disk instead of a Redis round trip.

**Probes.** One \`livenessProbe\` on \`/health\`, which returns 200 only after checking the Postgres pool, the Redis client and the payment gateway. Initial delay 45s, period 10s, failure threshold 3. One endpoint is one thing to keep correct, and a Pod that cannot reach its dependencies is a Pod we want restarted.

**Resources.** No requests or limits on checkout-api, so the scheduler packs Pods wherever there is room and a busy Pod can take idle CPU on its node during the sale.

**Rollout.** \`RollingUpdate\` with \`maxUnavailable: 25%\` and \`maxSurge: 0\`, so a deploy never asks the cluster autoscaler for nodes we have not already paid for.

**postgres-checkout.** A Deployment of 1 replica mounting a 500 GB PersistentVolumeClaim, plus its own Service. Same manifest shape as everything else, so one Helm chart covers the stack.

**Disruption.** No PodDisruptionBudget. Node pool upgrades are scheduled outside the sale window.
`.trim(),
            },
            modelAnswerOutline: [
              "Deliverable: five changes before the sale, ordered by the requests each one costs. Probes first, then the rollout fields, then cart state, then postgres-checkout, then requests and limits.",
              "**Nothing gates traffic.** With only a `livenessProbe` there is no readiness gate, so a new Pod joins the Service endpoints the moment its container starts and takes checkout traffic while it is still warming. The 45s initial delay postpones the restart decision and holds back no traffic at all. Split the endpoint: a cheap `/livez` that fails only on a wedged process, and a `/readyz` that checks the Postgres pool and Redis. The deeper hazard is the dependency check sitting on liveness: when the payment gateway stalls for 30s, all 400 Pods fail three checks and restart together, turning a partial dependency outage into a cold cluster at 40,000 rps. Readiness pulls a Pod out of endpoints without killing it, which is the behavior wanted here.",
              "**Rollout arithmetic.** `maxUnavailable: 25%` with `maxSurge: 0` withdraws 100 of the 400 Pods before a single replacement is ready, so a routine deploy sheds a quarter of capacity by design, at peak. `maxUnavailable: 0` with a small `maxSurge` keeps capacity flat: Kubernetes brings up a ready Pod before it removes an old one. The cost is a few Pods of extra headroom for the length of the rollout, which is far cheaper than the requests the current setting drops.",
              "**Cart on the Pod.** `emptyDir` plus the sticky cookie means a restart, a reschedule or any rollout loses that user's cart, and sticky routing skews load across the 400 replicas so scaling signals stop reflecting real demand. Cart state moves to Redis, where the read is an in-cluster round trip in the same ballpark as the 1 ms local one, and the replicas go back to interchangeable, which is the thing a Deployment assumes about its Pods.",
              "**postgres-checkout is in the wrong object.** A Deployment's Pods are interchangeable and carry no stable identity or guaranteed re-attachment of the same PersistentVolumeClaim across a reschedule, which is how a 500 GB volume gets stranded in the wrong zone or written by two Pods during a rollout. A StatefulSet is the minimum correct object. A managed Postgres is the better answer a week before peak, since nobody wants to practise failover and point-in-time restore during the sale.",
              "**Resources and disruption.** With neither requests nor limits, checkout-api is BestEffort and is evicted first under node pressure, which arrives exactly at peak, and the scheduler packs blind because it reserves the request and reads nothing else. Set requests near observed p95 with limits above them, and requests equal to limits for the tier that must not be evicted. The absent PodDisruptionBudget bounds nothing either: a node pool upgrade is one voluntary drain among several, and cluster autoscaler consolidation moves Pods without asking a human.",
              "**Sound as written:** the 60 MB multi-stage distroless image, config and secrets kept out of it in a ConfigMap and a Secret so one artifact promotes across environments, and zone anti-affinity spreading 400 replicas over three zones. None of those need changing, and saying so is part of the review.",
            ],
            rubric: [
              {
                name: "Probe roles",
                weak: "Takes the single livenessProbe as sufficient and never asks what puts a Pod into the Service endpoints.",
                adequate:
                  "Adds a readinessProbe but says nothing about what the dependency check on liveness does to all 400 Pods at once.",
                strong:
                  "Separates a cheap liveness check from a readiness check on the Postgres pool and Redis, and traces the simultaneous restart a payment gateway stall triggers.",
              },
              {
                name: "Rollout arithmetic",
                weak: "Leaves `maxUnavailable: 25%` and `maxSurge: 0` unexamined, or reads them as a cost control that works.",
                adequate:
                  "Calls the rollout fields risky without turning 25 percent into Pods or into dropped requests.",
                strong:
                  "Turns 25 percent of 400 replicas into 100 Pods withdrawn before any replacement is ready, and prices the surge headroom that replaces the setting.",
              },
              {
                name: "State on the Pod",
                weak: "Reads the emptyDir cart and the sticky cookie as a latency win and moves on.",
                adequate:
                  "Names sticky sessions as a rollout problem without following a Pod replacement through to the lost cart or the skewed load.",
                strong:
                  "Follows a Pod replacement to the dropped cart, moves the cart to Redis, and takes the round trip as the price of replicas a Deployment can treat as interchangeable.",
              },
              {
                name: "Workload object for state",
                weak: "Accepts postgres-checkout in a Deployment because it matches the shape of everything else in the chart.",
                adequate:
                  "Swaps Postgres to a StatefulSet without saying what stable identity and stable storage are protecting.",
                strong:
                  "Names what a Deployment does not promise the 500 GB volume across a reschedule, moves to a StatefulSet, and argues managed Postgres a week before peak.",
              },
              {
                name: "Credit for the sound choices",
                weak: "Treats every line of the spec as defective, image build and anti-affinity included.",
                adequate:
                  "Leaves the distroless image and the external config unchallenged without saying why they hold up.",
                strong:
                  "Keeps the 60 MB distroless image, the ConfigMap and Secret, and the zone anti-affinity, and gives the reason each one is already right.",
              },
            ],
          },
        },
        {
          id: "sd-l9-k8s-autoscaling",
          title: "Autoscaling & Elasticity",
          summary:
            "HPA, cluster autoscaler and KEDA solve different problems, and CPU is usually the wrong signal: scale on the queue depth or p99 that reflects user pain.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["autoscaling", "keda", "elasticity"],
          teach: {
            markdown: k8sAutoscalingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-k8s-autoscaling-apply",
            prompt:
              "Design autoscaling for a service with spiky, event-driven load: choose the scalers, set the target metrics, and handle scale-to-zero cold starts.",
            thinkAbout: [
              "When is a queue-depth or RPS signal better than CPU?",
              "How do HPA, VPA, cluster autoscaler, and KEDA differ?",
              "How do you hide cold starts on a spike?",
            ],
            modelAnswerOutline: [
              "Assumptions: a worker service consuming from a queue (SQS/Kafka) with bursty load, near-idle for long stretches then spikes to tens of thousands of messages in minutes. Cost matters (shed capacity when idle) but so does drain time (backlog must clear within an SLA).",
              "**Signal:** scale on **queue depth / consumer lag**, not CPU. The backlog directly measures how far behind we are; CPU can read 40 percent while a million messages pile up because the bottleneck is a downstream API. I would target 'keep messages-per-replica under 500' or 'keep lag under 30 seconds.'",
              "**Scalers:** **KEDA** as the primary autoscaler because it reads the queue source natively, drives the HPA under the hood, and supports **scale-to-zero** for idle periods. **HPA** (managed by KEDA) adds worker Pods as lag rises. **Cluster Autoscaler or Karpenter** provisions nodes when the new Pods go Pending, and reclaims them when the spike drains. **VPA** is optional for right-sizing the worker's memory request, kept off the same scaling metric so it does not fight HPA.",
              "**Cold starts on the spike:** pure scale-to-zero means the first burst pays image pull plus boot before anything drains. Mitigations: keep a **warm floor** of 1 to 2 replicas rather than true zero if the SLA is tight, so there is always a live consumer, or accept zero for cost and shrink the cold-start cost with a small image and fast boot. Pre-pull the image onto warm nodes, and if bursts are somewhat predictable, use **scheduled scaling** to pre-provision just before the expected wave.",
              "**Anti-flap:** set a **stabilization window** and a scale-down delay so a momentary dip in lag does not tear down workers we will immediately need again, which would thrash nodes and re-pay cold starts.",
              "Common wrong turn: scaling on CPU, so the service looks healthy while the backlog grows unbounded and the SLA is silently breached, or scaling to zero on a latency-critical path and forcing every burst's first users through a cold start.",
            ],
          },
          practice: {
            id: "sd-l9-k8s-autoscaling-practice",
            prompt:
              "Design the autoscaling for DoorDash's order-events pipeline during a Super Bowl halftime spike, where order volume jumps 10x in under two minutes and delayed order processing directly loses revenue and breaks delivery promises. Specify the scalers, signals, and how you avoid both cold-start lag and runaway cost.",
            thinkAbout: [
              "Why is reactive autoscaling alone too slow for a two-minute 10x ramp?",
              "How does predictive/scheduled pre-scaling for a known event help?",
              "What guardrails cap runaway scaling cost?",
            ],
            modelAnswerOutline: [
              "Assumptions: steady baseline with a sudden 10x spike in under two minutes, a hard SLA that an order is processed within a few seconds, and strong cost sensitivity the rest of the day. The dominant risk is that scaling lags the spike and orders queue past the SLA.",
              "**Signal and scalers:** scale the order-processing consumers on **Kafka consumer lag** via **KEDA**, targeting a small lag budget (under 5 seconds). KEDA drives HPA to add Pods as lag climbs; **Karpenter** provisions nodes fast when Pods go Pending, using on-demand for the warm floor and spot for burst capacity to control cost.",
              "**The two-minute ramp is the crux:** reactive autoscaling alone is too slow because node provisioning plus image pull plus consumer rebalance runs the same 2 to 5 minute reactive pipeline Level 4 breaks down (scrape, decide, provision, pull, boot, warm) while lag explodes. So combine reactive with **predictive/scheduled pre-scaling**: the Super Bowl is on the calendar, so pre-provision a warm pool of nodes and a higher replica floor minutes before halftime. You do not autoscale into a known spike, you pre-warm for it and let reactive scaling handle the residual. See [the scaling-compute breakdown of that pipeline](/learn/system-design/scaling-compute/sd-l4-autoscaling) for the full 2-to-5-minute accounting.",
              "**Cost control after the spike:** aggressive but **stabilized** scale-down (a stabilization window so a brief lull does not tear down capacity mid-event), spot instances for the burst tier, and return to a low floor once lag is durably back to baseline. Overprovision headroom is bounded to the event window, not left on all year.",
              "**Guardrails:** cap max replicas so a poison-message loop or a stuck downstream cannot trigger unbounded scaling and a cost blowout, and page on sustained lag that scaling is not resolving (a sign the bottleneck is downstream, not compute).",
              "Common wrong turn: relying purely on reactive CPU-based HPA for a known, calendar-driven 10x spike, so capacity arrives minutes late and every early order breaches its SLA during the highest-revenue window of the year.",
            ],
          },
        },
        {
          id: "sd-l9-service-mesh",
          title: "Service Mesh (Sidecar vs Sidecarless/Ambient/eBPF)",
          summary:
            "What the sidecar tax really costs per proxy traversal, how Istio Ambient and Cilium cut it, and when a small fleet is better off with no mesh at all.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["service-mesh", "ebpf", "mtls"],
          teach: {
            markdown: serviceMeshTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-service-mesh-apply",
            prompt:
              "Add mTLS, retries, and per-service traffic shifting to a 40-service cluster; decide sidecar vs ambient/eBPF mesh and justify the choice on cost and latency.",
            thinkAbout: [
              "What does a mesh move out of application code?",
              "What is the sidecar cost, and what does ambient/eBPF change?",
              "When is a mesh not warranted?",
            ],
            modelAnswerOutline: [
              "Assumptions: 40 microservices in mixed languages (Go, Java, Python, Node), hundreds of Pods, a zero-trust requirement (mTLS everywhere), and a need for consistent retries/timeouts and safe canary rollouts. Latency budgets are tight on the hot call graph.",
              "**Is a mesh justified here? Yes.** At 40 services in 4 languages you cannot keep mTLS, retry policy, timeouts, and circuit breaking consistent across four client libraries; that inconsistency is exactly where outages and security gaps live. A mesh gives one uniform, language-agnostic layer. (If this were 3 services I would decline the mesh and use platform mTLS plus a shared library.)",
              "**What the mesh provides:** automatic **mTLS** for zero-trust east-west, **retries/timeouts/circuit-breaking** declared as policy, **traffic splitting** for per-service canaries (5 percent to v2, watch metrics, ramp), and uniform L7 telemetry and trace propagation across every hop, all without editing 40 codebases.",
              "**Sidecar vs ambient:** the classic sidecar (Envoy per Pod) works but at this fleet size the tax is significant: hundreds of sidecars cost GBs of cluster memory and add 1 to several ms of proxy+mTLS latency per hop, compounding across a deep call graph and hurting p99. I choose a sidecarless mesh, and specifically **Istio Ambient**, because it is the option that actually preserves per-connection mTLS: a per-node ztunnel carries L4 traffic over HBONE with each workload's own identity, and waypoint proxies go only in namespaces that need L7 retries or splitting. The alternative is **Cilium**, which enforces identity-based L3/L4 policy in the kernel via eBPF, mutually authenticates workloads with SPIFFE identities in its agent, and encrypts node to node with WireGuard or IPsec; that is authenticated and encrypted east-west traffic with no proxy at all, but it is not per-connection mTLS and the mutual authentication is still beta, so I would not lead with it against a strict mTLS requirement. Either way I get far fewer proxies, lower per-Pod memory, and a cheaper L4 path, while still allowing full L7 features where I actually need them. I express routing through the **Gateway API** to keep the implementation swappable.",
              "**Rollout:** start L4 (mTLS everywhere, cheap), then add L7 waypoints only for the services doing canaries or complex retries, so I pay the L7 cost only where it earns its keep.",
              "Common wrong turn: defaulting to a full per-Pod Envoy sidecar mesh for the whole fleet and eating the memory and latency tax on every hop, when ambient delivers the same mTLS at a fraction of the cost; or the opposite error of adding a mesh reflexively when the fleet is too small to justify it.",
            ],
          },
          practice: {
            id: "sd-l9-service-mesh-practice",
            prompt:
              "Choose the mesh architecture for a fintech (you are the platform lead) running 250 microservices across three regions with a regulatory zero-trust mandate (every service call must be mutually authenticated and encrypted, with audit trails), justify it on latency, cost, and compliance, and explain how you would migrate an existing sidecar mesh without a maintenance window.",
            thinkAbout: [
              "How does ambient mTLS satisfy the compliance property at lower cost?",
              "How do STRICT mTLS and per-service authz plus access logs feed the audit trail?",
              "How does permissive-then-strict, namespace-by-namespace migration avoid a window?",
            ],
            modelAnswerOutline: [
              "Assumptions: 250 services, three regions, a hard compliance requirement for mTLS on every hop plus authz policy and audit, and an existing Istio sidecar mesh that is expensive and latency-heavy at this scale. Zero downtime during migration is mandatory.",
              "**Architecture:** keep a mesh (at 250 services it is unambiguously justified) but move to **ambient** to cut the tax. Istio Ambient gives per-node ztunnel mTLS for all Pods (satisfying 'encrypted and authenticated on every hop' cheaply at L4) with waypoint L7 proxies only where authz policy, retries, or traffic shifting are needed. mTLS gives the compliance property (mutual auth + encryption) and the mesh emits uniform authz decisions and L7 telemetry that feed the audit trail. Cross-region traffic goes over east-west gateways with mTLS preserved.",
              "**Why not stay on sidecars:** 250 services means thousands of Pods; per-Pod Envoy would cost many GBs of memory and add per-hop latency that, on a multi-hop payment path, meaningfully inflates p99. Ambient removes most per-Pod proxies while preserving mTLS everywhere, so compliance holds at lower cost and latency.",
              "**Compliance specifics:** enforce `STRICT` mTLS mode so any plaintext call is rejected (not just permitted alongside mTLS), authorization policies scoped per service, and export the mesh's access logs and policy decisions to the audit pipeline. Use SPIFFE-style workload identities so each service's certificate is its auditable identity.",
              "**Zero-window migration:** do it in **permissive mode** first (accept both mTLS and plaintext) so nothing breaks while you convert, then flip to strict per namespace once metrics confirm all traffic is already mTLS. Migrate ambient namespace by namespace: onboard a namespace to the ztunnel data path, verify golden metrics and mTLS coverage, add waypoints only where L7 policy is required, then move the next. Keep the old sidecar path as fallback per namespace until validated, so there is never a big-bang cutover.",
              "Common wrong turn: a big-bang switch from sidecar to ambient across all 250 services at once, or flipping mTLS to strict before verifying full coverage, either of which drops production calls and, in a fintech, causes a compliance and revenue incident.",
            ],
          },
        },
        {
          id: "sd-l9-cloud-native-12factor",
          title: "Cloud-Native & 12-Factor Principles",
          summary:
            "The 12-factor changes that let a platform kill and restart a service safely: config in the environment, session in Redis, files in S3, a real SIGTERM drain.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["cloud-native", "twelve-factor", "deployment"],
          teach: {
            markdown: cloudNative12factorTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-cloud-native-12factor-apply",
            prompt:
              "Explain how you would apply the 12-factor and cloud-native principles to make a legacy stateful service ready for containers and autoscaling, calling out config, state, backing services, and disposability.",
            thinkAbout: [
              "What makes a process safe to kill and restart anywhere at any time?",
              "Where should configuration and secrets live so one image runs in every environment?",
              "How do you treat databases, caches, and queues so instances stay interchangeable?",
            ],
            modelAnswerOutline: [
              "Assumptions: a legacy service that stores user sessions and uploaded files on local disk and reads config from a baked-in `app.conf`. Today it runs as one pinned instance, and that is exactly what blocks horizontal scaling and safe restarts.",
              "**Config in the environment.** Pull the baked-in `app.conf` out of the image. Non-secret config becomes env vars / a ConfigMap; secrets go to a secrets manager (or K8s Secret backed by one). Now a single immutable image is promoted unchanged from dev to prod, giving dev/prod parity and killing per-environment builds.",
              "**Stateless, disposable processes.** The crux of the 'stateful' problem: move session state out of local memory into **Redis**, and move uploaded files off local disk into **object storage (S3)**. Once no request-scoped state lives on the instance, any replica can serve any user, which is the precondition for both horizontal scaling and safe restarts. Add **graceful shutdown**: on SIGTERM stop accepting new requests, finish in-flight work within the termination grace period, then exit. Ensure fast startup so a new replica joins quickly.",
              "**Backing services as attached resources.** Address Postgres, Redis, S3, and any queue by URL and credentials from config, so they are swappable (local vs managed) without code changes. The database itself stays a managed service; the app tier becomes the stateless, scalable part.",
              "**Build, release, run + immutable infra.** Build the image once, bind it to a config as a versioned release, and run that release. Never `ssh` in to mutate a box; replace it. This makes rollback a re-run of the prior release and eliminates drift.",
              "**Design for failure and observability.** Add liveness/readiness probes, stream logs to stdout for the platform to collect (not to a local file that dies with the Pod), and assume instances can vanish, so retries and idempotency are built in. Common wrong turn: containerizing the service but leaving session in local memory and files on local disk, so scaling out breaks every user whose data happens to live on one instance, and a restart loses their session or uploads.",
            ],
          },
          practice: {
            id: "sd-l9-cloud-native-12factor-practice",
            prompt:
              "Design the concrete migration to make a 12-year-old Java monolith running a company's core billing container-ready and autoscalable without a billing outage, prioritizing which factors to fix first. It writes invoices to a local /data directory, keeps user sessions in the JVM heap, reads a 400-line config.properties baked into the WAR, and is deployed by hand to two pet servers.",
            thinkAbout: [
              "Why is externalizing state the priority-one blocker?",
              "How do you sequence the fixes by risk rather than all at once?",
              "How does idempotency prevent double-billing once elasticity is on?",
            ],
            modelAnswerOutline: [
              "Assumptions: billing is revenue- and compliance-critical, cannot lose an invoice, and cannot take a hard outage. Two hand-managed 'pet' servers with local state and baked-in config are the blockers. I sequence the fixes by risk, not fix everything at once.",
              "**Priority 1, externalize state (the true blocker).** Move invoice files from local `/data` to **object storage (S3)** with versioning (audit-friendly for billing), and move JVM-heap sessions to **Redis** (or make the API stateless with signed tokens). Until state is off the box, the service cannot scale out or be safely killed. Do it behind the existing single instance: write to S3 and Redis while still running as one node, verify parity, then allow multiple replicas.",
              "**Priority 2, config in the environment.** Externalize `config.properties` into env vars / a ConfigMap plus a secrets manager for DB and payment-gateway credentials. Now one immutable image is promotable across environments, and no secret ships inside the WAR.",
              "**Priority 3, backing services and immutability.** Point the DB, S3, Redis, and any queue at URLs from config so they are attached resources, containerize with a multi-stage build, and adopt build/release/run so deploys stop being hand-copies to pets. This kills the 'pet server' drift.",
              "**Priority 4, disposability and design-for-failure.** Implement graceful SIGTERM shutdown so an in-flight invoice completes before exit, add liveness/readiness probes, stream logs to stdout, and make invoice generation idempotent (an idempotency key) so a retried or restarted request never double-bills.",
              "**Rollout without outage:** run the refactored container alongside the legacy pets, shift traffic gradually (canary), and keep the pets as fallback until the container tier proves out. Only once replicas are interchangeable do I enable an HPA. Common wrong turn: lifting the monolith straight into a container with local `/data` and heap sessions intact, then turning on autoscaling, which double-writes invoices, loses sessions on scale-in, and causes a billing incident.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l9-m3",
      title: "Serverless & Edge",
      description:
        "Decide when to hand capacity management to a FaaS platform and when that decision quietly bankrupts you, design an event-driven Lambda pipeline that survives cold starts, concurrency caps, and timeouts, and split a global request path cleanly between V8-isolate edge compute and a heavier origin so users get sub-50ms TTFB without pushing strong-consistency data somewhere it cannot live.",
      lessons: [
        {
          id: "sd-l9-serverless-faas",
          title: "Serverless / FaaS Architecture",
          summary:
            "Where serverless wins and where the bill inverts against a container: cold starts on the p99 tail, the 15-minute cap, and no durable local state.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["serverless", "faas", "cold-start"],
          teach: {
            markdown: serverlessFaasTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-serverless-faas-apply",
            prompt:
              "Design an image-processing pipeline on Lambda triggered by uploads, and address cold starts, concurrency limits, timeouts, and cost at scale.",
            thinkAbout: [
              "What are good vs bad fits for FaaS?",
              "How do you mitigate cold starts?",
              "Why does the cost model invert at high steady load?",
            ],
            modelAnswerOutline: [
              "Assumptions: users upload images, we need thumbnails plus a few derived sizes, EXIF stripping, and a moderation check. Traffic is spiky (marketing pushes, time-of-day peaks) averaging maybe 50 uploads/sec but bursting to 2000/sec, and each image processes in 1 to 5 seconds. This bursty, event-triggered, embarrassingly parallel profile is a textbook good FaaS fit.",
              "**High-level design:** clients upload directly to **S3** via presigned URLs (never proxy bytes through a function). The S3 `ObjectCreated` event fans out to a **Lambda** per object. Because moderation, resizing, and a possible catalog write are distinct steps with different failure modes, I orchestrate with **Step Functions**: resize function, moderation function, then a DynamoDB write, each with its own retry and timeout policy, so a slow moderation call cannot burn the whole budget. Failures land in an SQS **dead-letter queue** for reprocessing.",
              "**Cold starts:** keep the resize function lean (a slim runtime plus a native image library, not a 300MB kitchen-sink package), lazy-load the SDK, and reuse an existing subnet-and-security-group pair so no new Hyperplane ENI has to be provisioned. For the latency-sensitive moderation path I add modest **provisioned concurrency** sized to the typical baseline so steady traffic never pays a cold start, while bursts above that spill into on-demand instances.",
              "**Concurrency and timeouts:** set **reserved concurrency** so a 2000/sec burst cannot exhaust the account limit or overwhelm DynamoDB; excess events queue in S3/SQS and drain as capacity frees. Every function gets a timeout comfortably above p99 processing time but well under 15 minutes; anything that could exceed that (a huge RAW file) is chunked or routed to a container batch job.",
              "**Cost at scale:** at bursty utilization this is cheap and I pay nothing between spikes. The tradeoff I commit to: if this pipeline ever becomes a steady flat-out 24/7 firehose, per-invocation billing will exceed a well-utilized container fleet, and I would migrate the hot path to Fargate/ECS while keeping Lambda for the bursty tail.",
              "Common wrong turn: stuffing resize, moderation, and catalog writes into one 12-minute function that retries the whole chain on any failure, and processing near the 15-minute ceiling with no orchestration, so one slow dependency cascades into timeouts and duplicated work.",
            ],
          },
          practice: {
            id: "sd-l9-serverless-faas-practice",
            prompt:
              "Design the compute tier for a Cloudinary-style media API that must transcode 20,000 videos/hour, where each transcode takes 3 to 20 minutes and CPU runs near 90 percent utilization all day. Decide whether Lambda belongs anywhere in this system, and justify the split.",
            thinkAbout: [
              "Which two FaaS constraints rule out Lambda for the transcode tier?",
              "Why is an autoscaled Spot container fleet the right heavy tier?",
              "Where does Lambda still earn a place at the edges of the pipeline?",
            ],
            modelAnswerOutline: [
              "Assumptions: 20,000 videos/hour is ~5.5/sec sustained, each job runs 3 to 20 minutes at ~90 percent CPU, all day. Two constraints kill pure FaaS here: the 15-minute execution cap (a 20-minute transcode cannot finish) and near-100 percent steady utilization (exactly where per-invocation billing loses to containers).",
              "**The heavy transcode tier is NOT Lambda.** It is a container fleet: **ECS/Fargate or Kubernetes** workers pulling jobs from an **SQS** (or Kafka) queue, autoscaling on queue depth, and running on **Spot/preemptible** instances because transcoding is fault-tolerant and idempotent (a preempted job just goes back on the queue). This is the biggest cost lever, since steady 90 percent CPU on reserved-plus-spot compute is far cheaper than the same GB-seconds billed per invocation, and it removes the 15-minute ceiling entirely.",
              "**Lambda still earns a place at the edges** of the pipeline, exactly where it is strong: the S3 upload event handler that validates the file and enqueues a job, presigned-URL issuance, webhook/callback notifications when a job completes, and lightweight metadata writes. These are sub-second, bursty, glue operations that would be wasteful to keep a container warm for.",
              "**The committed tradeoff:** use FaaS for the spiky event glue and thin control plane, use autoscaled Spot containers for the long, CPU-bound, steady-throughput work. Gate the transcode fleet with a queue so a traffic spike grows backlog (and scales workers) rather than dropping jobs, and set per-job timeouts and a DLQ so a poison file cannot wedge a worker forever.",
              "The wrong turn to avoid is forcing everything into Lambda 'to stay serverless' and hitting the 15-minute wall on long videos while paying a premium on a 90-percent-utilized workload.",
            ],
          },
        },
        {
          id: "sd-l9-edge-wasm",
          title: "Edge Computing, CDN Compute & WebAssembly",
          summary:
            "V8 isolates start in under 5ms, so routing, auth and personalization run next to the user, while a large or cold working set belongs back at the origin.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["edge", "wasm", "workers"],
          teach: {
            markdown: edgeWasmTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-edge-wasm-apply",
            prompt:
              "Design global request routing, auth, and personalization at the edge for a content site, and decide what runs at the edge vs the origin.",
            thinkAbout: [
              "Why do V8 isolates start far faster than container FaaS?",
              "What belongs at the edge vs the origin?",
              "What are the edge data-consistency constraints?",
            ],
            modelAnswerOutline: [
              "Assumptions: a global content site (news or docs) with mostly cacheable pages, logged-in readers who get light personalization (region, saved items, plan tier), and a requirement for fast TTFB everywhere. Read-heavy, personalization-light: an ideal edge fit.",
              "**At the edge** (Cloudflare Workers or equivalent) I run the request path: a Worker terminates the request at the nearest PoP and does geo/device **routing**, **JWT verification** (validate signature and expiry against a cached public key, so an unauthenticated request is rejected in the PoP without a trans-oceanic hop), **A/B bucket assignment**, and **personalization** by stitching a cached base page with per-user fragments. Static and semi-static content is served straight from the **CDN cache**; the Worker adds cache keys that vary on the few dimensions that matter (locale, plan) so I keep a high hit ratio instead of fragmenting the cache per user.",
              "**At the origin** I keep the heavy and authoritative work: the article database of record, search, comment writes, billing, and login (issuing the JWT after a real credential check). The edge validates tokens; the origin mints them and owns the user record.",
              "**Edge data strategy:** personalization data that tolerates staleness (region defaults, feature flags, A/B config, saved-article lists) lives in **Workers KV** or edge config, accepting eventual consistency of a few seconds. Anything authoritative (the session's true entitlements at purchase time, payment state) is read from the origin or a strongly consistent store, never assumed fresh from KV. For a value that needs strong per-key consistency at the edge (a rate-limit counter, a live view count) I would use a **Durable Object**, accepting that writes pay latency to its pinned location.",
              "The committed tradeoff: I get global sub-50ms TTFB and offload auth and routing from the origin, at the cost of eventual consistency for edge-cached personalization and harder debugging across hundreds of PoPs. Common wrong turn: running the full app at the edge, so heavy rendering or a database transaction blows the CPU-time and Node-API limits, or storing entitlements/balances in eventually consistent KV and serving a stale plan tier, letting a downgraded user keep premium content for seconds.",
            ],
          },
          practice: {
            id: "sd-l9-edge-wasm-practice",
            prompt:
              "Design the edge tier for a Shopify-scale storefront platform serving millions of merchants where each product page must be personalized (cart contents, currency, inventory badge, per-visitor A/B) yet still hit sub-50ms TTFB globally on Black Friday traffic. Specify exactly what runs in the V8 isolate, what stays at the origin, and how you handle the inventory number that must not show 'in stock' when it is sold out.",
            thinkAbout: [
              "How do you personalize every page yet keep a near-100% shell cache hit ratio?",
              "Why is the displayed inventory badge allowed to be stale but the purchase check not?",
              "Where does the binding stock check happen, and against what consistency?",
            ],
            modelAnswerOutline: [
              "Assumptions: millions of storefronts, most page structure cacheable, but every render carries per-visitor state (cart, currency, A/B, a live inventory badge). Black Friday means 10x+ spikes and zero tolerance for origin overload.",
              "**Edge (V8 isolate per request at the nearest PoP):** serve a **cached page shell** per storefront from the CDN, then have the Worker inject per-visitor fragments so I never cache a whole page per user. The Worker does **currency/geo resolution**, **A/B bucketing** (deterministic hash of visitor id, stored in a cookie so buckets are stable), **JWT/session validation**, and assembles the cart summary from a signed cookie or a fast session read. This keeps the shell cache hit ratio near 100 percent, which is what actually survives Black Friday: the origin sees a tiny fraction of requests.",
              "**Origin:** product catalog of record, checkout, payment, and the authoritative **inventory service**. The origin owns truth and takes writes.",
              "**The inventory number is the crux**, because it needs freshness and must never oversell on the page. I do **not** read it from eventually consistent edge KV for the 'in stock' claim. Instead the badge is coarse and safe: the edge shows 'In stock' / 'Low stock' / 'Sold out' from a short-TTL (a few seconds) edge cache populated by the inventory service, written **conservatively** so the service pushes 'sold out' aggressively and treats stale-positive as the failure to avoid.",
              "**The precise, binding stock check** happens at **add-to-cart / checkout** against the strongly consistent origin inventory service (or a Durable Object per SKU for hot items), so even if the badge is a few seconds stale the actual purchase cannot oversell.",
              "The committed tradeoff: the displayed badge is allowed to be slightly stale for speed, but the transaction is always validated against strong consistency, so correctness lives at the origin and latency optimization lives at the edge. The wrong turn is trusting an eventually consistent edge badge as the source of truth and letting a sold-out item be purchased.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l9-m4",
      title: "Delivery & FinOps",
      description:
        "Stand up an Internal Developer Platform with golden paths and GitOps so a team ships to prod in a day, promote infrastructure across environments with IaC plus progressive delivery that auto-rolls-back a payments deploy on an SLO regression, and treat cloud cost as a first-class design axis by cutting a large bill without hurting reliability using the FinOps Inform/Optimize/Operate loop.",
      lessons: [
        {
          id: "sd-l9-platform-gitops",
          title: "Platform Engineering, IDPs & GitOps",
          summary:
            "What an internal developer platform must give teams before it becomes a ticket queue, and how a GitOps reconciler buys audit, rollback and self-healing.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["platform-engineering", "gitops", "idp"],
          teach: {
            markdown: platformGitopsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-platform-gitops-apply",
            prompt:
              "Design an Internal Developer Platform so a product team can ship a new service to prod in a day: define golden paths, self-service, and guardrails.",
            thinkAbout: [
              "What does an IDP provide over raw Kubernetes?",
              "What is GitOps and why is Git the source of truth?",
              "How do guardrails-as-code replace gatekeeping?",
            ],
            modelAnswerOutline: [
              "Assumptions: ~50 product engineers across 8 teams, existing Kubernetes clusters in two regions, a mix of stateless HTTP services and workers. Goal: cut new-service lead time from ~2 weeks to under a day and standardize without a gatekeeping board.",
              "**Golden path (day-one flow).** A developer runs the scaffolder (a Backstage software template) and answers a short form: service name, owning team, language, needs a Postgres yes/no, needs a queue yes/no. The template generates a repo with a working CI pipeline, a Dockerfile, health/readiness probes, a Helm/Kustomize deployment, a default SLO and dashboard, an on-call rotation stub, and a `catalog-info.yaml` registering ownership. The fastest way to a running service is also the compliant one.",
              "**Delivery via GitOps.** Application config lives in a Git repo; **Argo CD** in each cluster reconciles it. To ship, CI builds and signs the image (**cosign**), generates an **SBOM**, and opens a PR bumping the image tag in the config repo. Merge triggers Argo to roll out and self-heal. This gives a full audit trail, one-command rollback via `git revert`, and drift correction for free. No engineer holds cluster credentials.",
              "**Self-service and abstraction.** Backstage is the portal: catalog (who owns what, dependencies, scorecards), templates, and TechDocs. A developer declaring 'service + Postgres' gets the database provisioned via a **Crossplane/Terraform** claim the platform reconciles, so they never write raw infra.",
              "**Guardrails as code.** **OPA Gatekeeper / Kyverno** admission policies reject manifests without resource limits, running as root, or using unsigned images; SLSA provenance is verified at admission. Scorecards flag services missing a runbook or SLO. Policy is the gate, not a person.",
              "**Tradeoffs.** The platform team is now a product team with a real roadmap and support burden; if it becomes a ticket queue, we have reintroduced the bottleneck we removed. Adoption is the success metric. Common wrong turn: exposing raw Kubernetes plus a wiki and calling it a platform; without scaffolding, self-service infra, and policy-as-code, every team still reinvents the messy layers differently.",
            ],
          },
          practice: {
            id: "sd-l9-platform-gitops-practice",
            prompt:
              "Design the IDP and GitOps rollout for a 900-engineer fintech running 300 services across 6 regions under SOC 2 and PCI audit, where every prod change must be provably reviewed, attributable, and reversible, and no human may hold standing cluster-admin.",
            thinkAbout: [
              "Why is GitOps itself the compliance win for attributable, reviewed change?",
              "How do you eliminate standing cluster-admin while keeping break-glass?",
              "How do you bound blast radius across 6 regions and 300 services?",
            ],
            modelAnswerOutline: [
              "Assumptions: strict change-management and least-privilege requirements; auditors want to sample any prod change and see who authored it, who approved it, what scanned it, and how it was rolled back.",
              "**Attributable, reviewed change.** GitOps is the compliance win: every prod change is a PR to the config repo, so the reviewer, author, timestamp, and CI checks are the audit evidence. I enforce branch protection (2 reviewers, one from the owning team), signed commits, and required status checks (policy scan, image signature verification). Auditors get a queryable log without any bespoke tooling.",
              "**No standing admin.** Argo CD is the only identity with write access to clusters, pull-based, so no human or external CI system holds cluster-admin. Break-glass access is via short-lived, approved, fully-logged just-in-time credentials (Teleport/PAM), not standing roles.",
              "**Multi-region and blast radius.** One Argo instance (or ApplicationSet) per region reconciling region-scoped config. Promotion is staged: a merge to the `staging` overlay auto-syncs; production overlays require a separate approved PR, and progressive rollout gates it. An App-of-Apps pattern keeps 300 services manageable.",
              "**PCI specifics.** Kyverno policies enforce network policies isolating the cardholder-data zone, block images without a verified SBOM and cosign signature, and require SLSA provenance. The scorecard blocks a service from the PCI scope if it lacks encryption-at-rest or a defined data classification.",
              "Tradeoff: this much policy can slow teams if the paved-road templates lag, so the platform team must keep golden-path templates current or engineers route around them and compliance erodes. The platform's job is to make the compliant path the easy path at 900-engineer scale.",
            ],
          },
        },
        {
          id: "sd-l9-iac-progressive-delivery",
          title: "IaC, Environments & Progressive Delivery",
          summary:
            "How Terraform state and shared modules kill drift, and why a canary with auto-rollback still breaks if the same deploy carries a destructive migration.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["iac", "progressive-delivery", "terraform"],
          teach: {
            markdown: iacProgressiveDeliveryTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-iac-progressive-delivery-apply",
            prompt:
              "Design the IaC and environment-promotion strategy for dev/staging/prod across two regions preventing config drift, plus a zero-downtime rollout for a critical payments service that auto-rolls-back on regression.",
            thinkAbout: [
              "How do you prevent config drift and snowflake environments?",
              "Which rollout strategy and metrics gate a payments deploy?",
              "How do feature flags decouple deploy from release?",
            ],
            modelAnswerOutline: [
              "Assumptions: a payments service on Kubernetes in two regions (us-east, eu-west), targeting zero-downtime deploys and an SLO of 99.95% authorization success and p99 under 300ms.",
              "**IaC and parity.** Everything is **Terraform** (or OpenTofu) with an S3 backend with `use_lockfile` **remote state with locking** per region. Dev/staging/prod are the *same modules* with different `.tfvars` (replica count, instance class, region endpoints), so prod is staging scaled up, not a snowflake. All applies go through the pipeline; no console changes. A nightly `terraform plan` runs against each environment and alerts on any non-empty diff to catch out-of-band drift. Two regions are the same module instantiated twice, keeping them identical by construction.",
              "**Promotion.** The same signed image and same modules flow dev to staging to prod. Merging to an environment overlay triggers its apply (GitOps). Staging is a faithful smaller mirror where the canary process is rehearsed.",
              "**Rollout.** Canary via **Argo Rollouts**: shift 1% -> 5% -> 25% -> 50% -> 100%, with a bake at each step. During each bake, an **AnalysisTemplate** queries Prometheus for error rate, p99 latency, and authorization-success-rate against the stable baseline. Any breach **auto-aborts** and shifts traffic back to stable, no human needed. I roll out region by region (us-east first, then eu-west) to bound blast radius. Blue-green would be the fallback if the payments code could not tolerate two versions running at once, at the cost of 2x capacity during the flip.",
              "**Deploy vs release.** New payment flows ship dark behind **feature flags**, enabled for 1% of users after the deploy is fully rolled out. If the feature misbehaves, I flip the flag off instantly without a redeploy.",
              "**Migrations.** Schema changes use **expand/contract** so old and new code coexist safely during the canary: add-and-backfill first, drop later. Common wrong turn: a destructive migration bundled into the canary deploy (drop a column the stable version still reads), which breaks the 95% of traffic still on the old version the moment you apply it; or hand-editing the prod console, which silently desyncs it from staging.",
            ],
          },
          practice: {
            id: "sd-l9-iac-progressive-delivery-practice",
            prompt:
              "Design the rollout for Stripe-scale payment-authorization changes deployed globally across 12 regions at 500k requests/sec, where a bad deploy directly loses merchant revenue and a manual rollback would take too long to prevent measurable financial loss.",
            thinkAbout: [
              "Why shadow-test authorization changes before a live canary?",
              "Why must rollback be automated rather than human-driven on the money path?",
              "How does region-by-region rollout bound a bad change's blast radius?",
            ],
            modelAnswerOutline: [
              "Assumptions: authorization is the money path; even a 30-second elevated error rate is real merchant revenue lost, so detection and rollback must be automated and fast.",
              "**Guardrails before speed.** Every change ships dark behind a feature flag and is **shadow-tested** first: mirror a copy of live authorization traffic to the new version and compare its decisions against the current one offline, with zero customer impact, until the diff is understood. Only then does it enter a live canary.",
              "**Tight, automated canary.** Argo Rollouts (or an equivalent in-house system) at very fine granularity: 0.1% -> 1% -> 5%, with short bakes and **strict, low thresholds** on authorization-success-rate, decline-reason distribution, and p99. Because the cost of a bad minute is high, the analysis auto-aborts on a small regression; I would rather roll back a false positive than eat financial loss. Automated rollback is mandatory because a human paging in would already be too slow at this revenue rate.",
              "**Regional blast-radius control.** Roll region by region, never globally at once, starting with a lower-volume region. Twelve regions means a bad change caught in region 1 never reaches the other 11. A global config that flips everywhere simultaneously is the nightmare scenario; regional staging bounds it.",
              "**Correctness under concurrency.** Old and new authorizers run together during canary, so any data or protocol change uses expand/contract, and idempotency keys ensure a retried authorization during a rollback is not double-charged.",
              "Tradeoff: this is slow and conservative by design. For a money path that is correct: the cost of caution is a few extra hours of rollout; the cost of speed is lost merchant revenue and trust. Common wrong turn: optimizing rollout speed on the authorization path as if it were a stateless web frontend.",
            ],
          },
        },
        {
          id: "sd-l9-cloud-finops",
          title: "Cloud Cost & FinOps",
          summary:
            "Why the cloud bill cannot tell you what one service costs on Kubernetes, and which levers cut waste without trading away the reliability your SLO promised.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["finops", "cost", "kubernetes"],
          teach: {
            markdown: cloudFinopsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-cloud-finops-apply",
            prompt:
              "Cut a $200k/mo cloud bill by 30% without hurting reliability: produce a prioritized plan across compute, data, and Kubernetes allocation.",
            thinkAbout: [
              "What are the three FinOps pillars?",
              "Why is Kubernetes cost visibility hard, and how do you fix it?",
              "What are the biggest data/egress cost levers?",
            ],
            modelAnswerOutline: [
              "Assumptions: $200k/mo across compute (~55%), managed data stores and warehouse (~25%), and data transfer/egress (~20%), on AWS with EKS. Target: save $60k/mo (30%) while holding every production SLO.",
              "**Inform first (week 1).** I cannot cut what I cannot see, so I enforce a tagging policy (team, service, env, cost-center) and stand up **Kubecost/OpenCost** to allocate EKS node cost down to namespace and service. This turns 'the bill is $200k' into 'recommendations is $22k, and 60% of it is idle requested capacity.' Non-prod is tagged so I can find always-on dev waste.",
              "**Optimize, prioritized by dollars-per-effort:** (1) **Kill idle and scale-to-zero non-prod** (fast, safe): dev/staging clusters running 24/7 for a daytime team scale to zero off-hours, often 10-15% of the bill at near-zero risk. (2) **Rightsize to P90/P95** (compute + K8s requests): rightsizing over-requested pods improves bin-packing so the cluster autoscaler drops nodes; automate with the metrics. (3) **Commitments on the steady-state baseline**: savings plans/reserved instances cover the always-on floor (30-50% off), on-demand and spot cover the spiky top. (4) **Spot for fault-tolerant work**: CI, batch, stateless workers, ML training with checkpointing move to spot (60-90% off); stateful primaries stay on-demand. (5) **Data/egress**: align chatty services to the same AZ, put a CDN in front to cut origin egress, tier cold S3 to Intelligent-Tiering/Glacier, and partition the worst warehouse full-scan queries.",
              "**Operate (make it stick).** Set per-team budgets with anomaly alerts so a new leak is caught in days, not on next month's invoice, and put the Kubecost showback in front of each team so cost has an owner.",
              "**Reliability guardrail.** Every cut is waste reduction (idle, over-provisioned, untiered, unpartitioned), not reliability reduction. I do not delete multi-AZ, standby replicas, or backups to hit the number; a single outage would erase the savings.",
              "Common wrong turn: chasing rightsizing while ignoring the 20% egress line and per-app K8s allocation, then cutting a redundancy to force the number and causing an outage.",
            ],
          },
          practice: {
            id: "sd-l9-cloud-finops-practice",
            prompt:
              "Cut cost for an AI startup whose bill is dominated by a $500k/mo GPU fleet serving LLM inference plus nightly fine-tuning, where GPU utilization is measured at 35% and latency SLOs must hold, without degrading model quality.",
            thinkAbout: [
              "Why is raising GPU utilization the biggest lever here?",
              "How do you split purchasing between latency-sensitive inference and fault-tolerant training?",
              "Which quality-neutral model optimizations cut cost?",
            ],
            modelAnswerOutline: [
              "Assumptions: most spend is GPU (A100/H100), ~35% average utilization means roughly two thirds of the fleet is paid-for and idle. The constraints are inference latency SLO and model quality, so I optimize utilization and purchasing, not quality.",
              "**Inform.** Tag GPUs by workload (real-time inference vs batch fine-tuning) and measure utilization per model, so I can see which endpoints are over-provisioned and which sit idle between requests.",
              "**Raise utilization (biggest lever).** The waste is idle GPU time. I **bin-pack** inference with continuous/dynamic batching (vLLM-style) so more requests share a GPU, and I consolidate low-traffic models onto shared GPUs (multi-model serving, MIG partitioning on A100/H100) instead of one dedicated GPU per model. Autoscale inference replicas to real traffic and scale idle endpoints down. Just moving 35% to 70% utilization roughly halves the fleet needed for the same load.",
              "**Split purchasing by workload.** Real-time inference (latency-sensitive, always-on baseline) goes on **reserved/committed** GPU capacity for the steady load, on-demand for the spiky top. Nightly **fine-tuning is fault-tolerant**, so it runs on **spot** GPUs with frequent checkpointing; an eviction just resumes from the last checkpoint. This alone can cut the fine-tuning line 60-80%.",
              "**Right-size the model to the task.** Where quality allows, quantize (int8/fp8) and use smaller distilled models for easy requests, routing only hard requests to the big model. This is a quality-neutral cut when done with eval gates.",
              "Tradeoff: aggressive batching adds queueing latency, so I tune batch size against the p99 SLO rather than maxing utilization blindly. Common wrong turn: running one dedicated, always-on, on-demand GPU per model at 35% utilization, the default that produces a $500k bill. Utilization and spot-for-training are where the money is, and neither touches model quality.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l9-m5",
      title: "Data-Intensive & Analytics",
      description:
        "Split OLTP from OLAP and isolate them, place a warehouse, lake, or lakehouse for a given BI and ML workload, wire OLTP changes into analytics with open table formats and log-based CDC instead of fragile dual writes, and choose batch, streaming, or a unified Kappa pipeline that serves both a real-time signal and a nightly report from one event source.",
      lessons: [
        {
          id: "sd-l9-oltp-vs-olap",
          title: "OLTP vs OLAP Fundamentals",
          summary:
            "Why a read replica is not an analytics store: row layout versus column layout, and what changes when you point a dashboard at a transactional database.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["oltp", "olap", "columnar"],
          teach: {
            markdown: oltpVsOlapTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-oltp-vs-olap-apply",
            prompt:
              "Design the data layer for an app that needs fast order writes AND real-time revenue dashboards without the dashboards slowing checkout.",
            thinkAbout: [
              "Why never run heavy analytics on the primary OLTP DB?",
              "How do row-store and column-store physical layouts differ?",
              "How does data move OLTP -> OLAP?",
            ],
            modelAnswerOutline: [
              "Assumptions: an e-commerce app writing ~2k orders/sec at peak, and a finance/ops team wanting revenue-by-region-by-minute dashboards that refresh within a minute or two. Checkout p99 must stay under 200ms.",
              "**Two stores with a pipeline between them.** The **OLTP tier** is Postgres (or a sharded equivalent): row store, normalized `orders`, `line_items`, `payments`, indexed by order id and customer id, tuned for fast single-row writes and strong isolation. All checkout traffic hits only this tier, so nothing analytical shares its buffer pool or connections.",
              "**The OLAP tier** is a column store, Snowflake or BigQuery for managed BI, or ClickHouse if I want second-fresh dashboards on my own infra. It holds a denormalized star schema: a `fact_orders` table plus `dim_product`, `dim_region`, `dim_time`. Column layout plus compression means `SUM(revenue) GROUP BY region, minute` scans two columns, not the whole row, and returns fast even over billions of rows.",
              "**Movement via log-based CDC:** Debezium tails the Postgres WAL and publishes order inserts/updates to Kafka, and a sink writes them into the column store continuously. This gives near-real-time freshness with negligible load on the primary (reading the WAL is cheap and does not lock tables). If the dashboards could tolerate hourly freshness I would instead run a simpler ELT batch load and skip the streaming machinery.",
              "The key tradeoff is freshness vs operational complexity: CDC buys sub-minute dashboards at the cost of running Kafka and a connector. Common wrong turn: pointing the dashboard at the OLTP primary (or even a read replica): a single revenue scan evicts hot rows, holds MVCC snapshots, and spikes checkout latency, and a row-store replica is still slow at column aggregations anyway. Two engines, each matched to its workload, connected by CDC, is the design.",
            ],
          },
          practice: {
            id: "sd-l9-oltp-vs-olap-practice",
            prompt:
              "Design the analytics data layer for Shopify-scale commerce: hundreds of thousands of merchants, millions of orders/hour across a sharded MySQL fleet, where each merchant wants a near-real-time sales dashboard and the platform team wants cross-merchant fraud and GMV analytics. Lead with how you get analytics off the transactional shards without touching merchant checkout latency.",
            thinkAbout: [
              "Why does binlog CDC beat any query against the shards at fleet scale?",
              "How do you partition the column store for both per-merchant and cross-merchant queries?",
              "How do you keep GMV exact under CDC replay (no double-count)?",
            ],
            modelAnswerOutline: [
              "Assumptions: transactional data lives on a horizontally sharded MySQL fleet (thousands of shards, merchants hashed across them), checkout latency is sacred, and there are two consumers: per-merchant dashboards (tenant-scoped, near-real-time) and platform-wide analytics (cross-shard, can tolerate minutes).",
              "**Never query the shards for analytics.** Each MySQL shard runs **binlog-based CDC** (Debezium or a Maxwell-style tailer) publishing row changes into Kafka, partitioned by merchant id so a merchant's events stay ordered. Reading the binlog adds no query load and no locks to the transactional path, which is the whole point at this scale: a cross-shard `GROUP BY` would be impossible to run against the fleet without wrecking checkout.",
              "**From Kafka, fan out to a column store** (ClickHouse or BigQuery) that ingests the stream into a denormalized `fact_orders` keyed and partitioned by merchant id, so a per-merchant dashboard query prunes to that merchant's partition and returns in tens of ms even under heavy tenants. Platform-wide GMV and fraud queries scan across partitions on the same column store, exactly what columnar plus vectorized execution is built for.",
              "**The hard parts:** multi-tenancy (partition/cluster by merchant so one giant merchant does not slow another, and enforce tenant isolation in the query layer), hot merchants (a Black-Friday seller floods one Kafka partition, so I may sub-partition by merchant+time), and exactly-once-ish loading (idempotent upserts keyed by order id so a CDC replay does not double-count GMV).",
              "The tradeoff versus a nightly batch ELT is real-time freshness at the cost of a streaming ingestion pipeline, justified because merchants expect live sales numbers. Common wrong turn: a fan-out query across thousands of shards or an analytics read replica per shard: neither gives cross-merchant analytics and both couple analytics load to the transactional fleet.",
            ],
          },
        },
        {
          id: "sd-l9-warehouse-lake-lakehouse",
          title: "Warehouse vs Lake vs Lakehouse",
          summary:
            "Warehouse, lake or lakehouse: what Parquet on S3 still does not buy you, and why ACID and time travel come from the table format rather than the files.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["lakehouse", "warehouse", "data-lake"],
          teach: {
            markdown: warehouseLakeLakehouseTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-warehouse-lake-lakehouse-apply",
            prompt:
              "Choose and justify a warehouse vs lakehouse for a company doing BI + ML on 50TB of mixed structured/semi-structured data.",
            thinkAbout: [
              "What does each architecture optimize, and where does the lake become a swamp?",
              "What is the medallion (bronze/silver/gold) pattern?",
              "How does separating storage and compute help?",
            ],
            modelAnswerOutline: [
              "Assumptions: 50TB spanning clean transactional tables, semi-structured event JSON, and clickstream/logs; two consumer groups, BI analysts who want fast SQL dashboards and ML engineers who want raw and semi-structured data for feature engineering and training.",
              "**I choose a lakehouse**, because the workload is explicitly BI plus ML on mixed data, the exact seam a pure warehouse or pure lake handles badly. A warehouse would serve the BI half well but make the ML/raw half expensive and awkward (loading and storing raw JSON, logs, and future images in warehouse storage is costly, and ML wants file access to raw data). A pure lake would serve ML but leave BI without ACID, schema enforcement, or reliable governance, and at 50TB with many producers it drifts into a swamp fast.",
              "**Concretely:** raw data lands in object storage (S3) as **Iceberg** or **Delta** tables, giving me ACID, schema evolution, and time travel over the cheap files. I organize with the **medallion pattern**: bronze holds raw append-only ingestion (also my replay/audit source), silver holds cleaned, deduplicated, conformed tables with enforced schema, and gold holds business aggregates and ML feature tables. Ownership and contracts at each layer are what keep the lake from becoming a swamp.",
              "**Separation of storage and compute** makes this economical and multi-tenant: one 50TB copy on S3, with independent elastic compute per workload. BI analysts run Trino or Snowflake against gold tables, ML engineers run Spark against silver/bronze for training, and neither contends because they bring their own compute to the same Iceberg tables. I scale storage and compute separately, so idle 50TB is cheap and I only pay compute when queries run.",
              "Key tradeoff: the lakehouse adds operational surface (table format, catalog like Iceberg REST or Unity, compaction of small files) versus a turnkey warehouse. That is justified here by the ML requirement and the storage cost of 50TB of raw data. Common wrong turn: a bare lake with no catalog or schema (an untrusted swamp), or a warehouse-only stack that prices out the raw/ML data.",
            ],
          },
          practice: {
            id: "sd-l9-warehouse-lake-lakehouse-practice",
            prompt:
              "Design the platform data architecture for a Netflix-scale streaming service: petabytes of playback events, device logs, and A/B experiment data, consumed by analysts (SQL dashboards), data scientists (recommendation model training in Spark), and near-real-time experiment analysis. Lead with the architecture choice and how you prevent a petabyte-scale swamp.",
            thinkAbout: [
              "Why is warehouse storage pricing prohibitive at petabyte scale?",
              "What process plus tooling prevents a PB swamp (catalog, contracts, quality gates)?",
              "How does storage/compute separation let hundreds of consumers coexist?",
            ],
            modelAnswerOutline: [
              "Assumptions: multiple petabytes growing daily, hundreds of internal consumers, workloads spanning interactive SQL, large-scale Spark training, and near-real-time experiment readouts, with strong pressure on storage cost at PB scale.",
              "**A lakehouse on object storage**, because at petabyte scale warehouse storage pricing is prohibitive and the consumers are heterogeneous (SQL, Spark ML, streaming). Raw events land in S3 as **Iceberg** tables through a catalog (Iceberg REST / a Unity-style governance layer) so every engine sees one governed copy with ACID, schema evolution, and time travel.",
              "**Preventing a PB swamp is process plus tooling, not just storage.** I enforce the **medallion pattern** with hard contracts: bronze is raw append-only playback/device/experiment events (also the replay source), silver is cleaned, sessionized, deduplicated and schema-enforced, gold is curated marts and ML feature tables. Every table has an owner, a schema registered in the catalog, data-quality checks at promotion (row counts, null/enum constraints, freshness SLAs), and lineage so a consumer can trust and trace a number. A data catalog with discovery and documentation is mandatory at this scale.",
              "**Separation of storage and compute** lets hundreds of consumers coexist: one Iceberg copy, isolated elastic compute per team (Trino/Presto for interactive SQL, Spark clusters for recommendation training, Flink for near-real-time experiment aggregation reading the same tables). Teams cannot starve each other because they do not share compute. For near-real-time experiments I stream events into Iceberg via Flink so experiment dashboards read minutes-fresh data from the same lakehouse rather than a separate stack.",
              "Tradeoffs: I invest heavily in catalog, governance, compaction of small streaming files, and metadata management, real operational cost, but at petabytes the alternative (a warehouse) is unaffordable and a bare lake is untrustworthy. Common wrong turn: skipping the catalog and quality gates and letting every team write ad hoc files.",
            ],
          },
        },
        {
          id: "sd-l9-table-formats-cdc",
          title: "Open Table Formats & CDC",
          summary:
            "Why the dual write between your database and Kafka can never be repaired by a retry, and how a transactional outbox plus log-based CDC removes the problem.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["iceberg", "cdc", "table-formats"],
          teach: {
            markdown: tableFormatsCdcTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-table-formats-cdc-apply",
            prompt:
              "Pick an open table format for a multi-engine lakehouse (Spark + Trino + Flink) and design real-time replication of order changes from Postgres into a search index and the lakehouse without dual-write inconsistency.",
            thinkAbout: [
              "What do table formats add over raw Parquet?",
              "Which format fits multi-engine vs CDC-heavy vs streaming?",
              "How does log-based CDC + outbox avoid the dual-write problem?",
            ],
            modelAnswerOutline: [
              "Assumptions: Postgres is the OLTP source for orders; consumers are an Elasticsearch search index (near-real-time) and an analytics lakehouse queried by Spark (ML), Trino (interactive SQL), and Flink (streaming). Correctness matters: no lost or duplicated orders.",
              "**Table format: Iceberg**, because the requirement is explicitly multi-engine (Spark + Trino + Flink) and Iceberg has the broadest cross-engine support and is the open standard, coordinated by an Iceberg REST catalog (or Glue/Unity) so all three engines agree on table metadata. Over raw Parquet, Iceberg gives me ACID snapshots (no reader sees a half-written commit), schema and partition evolution as the order schema changes, time travel for reproducible ML training and audits, and hidden partitioning by order day. (If the workload were mutation-heavy with constant upserts I would weigh Hudi, but for multi-engine breadth Iceberg wins.)",
              "**Replication without dual-write:** I never have the order service write to both Postgres and Kafka. Instead, in the same transaction that writes the `orders` row, the service inserts into an **outbox** table, so the business record and the change event commit atomically. **Debezium** then tails the Postgres **WAL** and publishes outbox events to **Kafka**, partitioned by order id to preserve per-order ordering. From Kafka, two sinks consume: a connector upserts into Elasticsearch, and a Flink job writes into the Iceberg table.",
              "**Idempotent sinks:** because CDC delivery is **at-least-once** (connectors replay after failures), both sinks must be idempotent: upsert by order id into Elasticsearch and merge-on-key into Iceberg, so a replayed event overwrites rather than duplicates. This yields effective exactly-once without any distributed transaction.",
              "Tradeoffs: the outbox adds a table and a bit of write overhead, and CDC adds Debezium plus Kafka to operate, but this is the correct price for consistency. Common wrong turn: dual-writing to the DB and the search index (or Kafka) directly: with no shared transaction, a crash between the two writes leaves the systems permanently inconsistent, and retries cannot fix it because you do not know which write landed.",
            ],
          },
          practice: {
            id: "sd-l9-table-formats-cdc-practice",
            prompt:
              "Design change propagation for an Airbnb-scale listings platform: a sharded MySQL fleet holds listings and availability, and changes must reach an Elasticsearch search index, a pricing/ML feature store, and an Iceberg lakehouse within seconds, with strict no-lost-updates and no-duplicates guarantees. Lead with how you capture changes at fleet scale and keep three consumers consistent.",
            thinkAbout: [
              "Why is binlog CDC the only capture option at thousands of shards?",
              "How does per-listing partitioning preserve ordering across three consumers?",
              "How do idempotent upserts plus a version column give effective exactly-once?",
            ],
            modelAnswerOutline: [
              "Assumptions: thousands of MySQL shards (listings sharded by listing id), high write rate on availability/price, three downstream consumers with a seconds-level freshness SLA, and hard correctness requirements (a lost price update or a duplicate listing is a real business bug).",
              "**Capture:** log-based CDC per shard. **Debezium** (or a Maxwell-style tailer) reads each shard's **binlog** and publishes to **Kafka**, keyed by listing id so all changes to one listing land on the same partition in commit order. Binlog CDC is the only option at this scale: query-polling would hammer thousands of shards and miss deletes, triggers would tax the write path. Where a change spans the DB and an event (a listing-published event that must be atomic with the row write), the service uses a **transactional outbox** in the shard.",
              "**Fan-out to three consumers, each idempotent.** From the per-listing Kafka topic, three independent consumer groups read the same ordered stream: one upserts into **Elasticsearch** (by listing id), one writes features into the **feature store** (upsert by key), one uses **Flink** to merge into **Iceberg** (or Hudi if upsert throughput dominates, since Hudi is built for record-level upserts). Ordering per listing is preserved by the partition key, so a price change followed by a delete are applied in order.",
              "**Correctness:** delivery is at-least-once, so every consumer is idempotent (upsert/merge by listing id, and use the binlog offset or a version/sequence column to ignore stale out-of-order retries). This gives effective exactly-once across all three sinks without a distributed transaction. For lost-update protection, the source of truth is the binlog itself, which records every committed mutation, so nothing is dropped as long as connectors track offsets durably.",
              "Tradeoffs: per-shard Debezium plus Kafka is significant operational surface, and I must handle schema changes across the fleet (Iceberg/ES schema evolution) and hot listings (a viral listing floods one partition, mitigated by careful keying). Common wrong turn: any consumer dual-writing from the app, or a non-idempotent sink that duplicates on replay.",
            ],
          },
        },
        {
          id: "sd-l9-batch-streaming",
          title: "Batch vs Streaming: Lambda vs Kappa",
          summary:
            "Why Lambda architecture costs you two codebases that drift, and how Kappa plus log replay and streaming into lake tables gets both outputs from one pipeline.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["batch", "streaming", "lambda-kappa"],
          teach: {
            markdown: batchStreamingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l9-batch-streaming-apply",
            prompt:
              "Design a pipeline that serves both a real-time fraud signal and a nightly financial report from the same event source.",
            thinkAbout: [
              "What does Lambda architecture add over Kappa, and at what complexity?",
              "How do watermarks and event-time handle late data?",
              "How does streaming-into-lakehouse collapse the two paths?",
            ],
            modelAnswerOutline: [
              "Assumptions: one event source, payment/transaction events at high volume. Two consumers with opposite needs: a fraud signal that must fire within seconds, and a nightly financial report that must be exactly correct and complete (auditable).",
              "**A Kappa-style single pipeline, not Lambda**, because I do not need two divergent codebases. All events land in **Kafka** with long retention (the log is my system of record and my replay source). A **Flink** job consumes the stream and does two things from one codebase.",
              "**Real-time fraud signal:** Flink computes per-account features and rules over short event-time windows (velocity of charges, geo-impossibility) and emits alerts within seconds. Here I favor low latency: aggressive watermarks so windows close fast, accepting that a late event might update a score afterward. Approximate-but-fast is the right call for a fraud signal.",
              "**Nightly financial report:** correctness is non-negotiable, so the same Flink job writes the enriched, exactly-once stream into **Iceberg** tables (Flink's checkpointing plus transactional sink give exactly-once). The nightly report is then a batch SQL query (Trino/Spark) over those Iceberg tables. This streaming-into-lakehouse move **collapses the two paths**: the live stream drives fraud, and the very tables it lands in serve the batch report, so there is no separate batch pipeline reimplementing the same logic.",
              "**Event-time and watermarks** keep the report correct despite late/out-of-order payments: I window by event-time (when the transaction occurred, not when Flink saw it), and watermarks with a bounded allowed-lateness let late events correct their window before the day is finalized. The report reads finalized, watermark-closed data so it is complete and reproducible (and time travel on Iceberg makes it auditable).",
              "Tradeoff: exactly-once and event-time processing add checkpointing and watermark tuning, but that is required for an auditable financial number. Common wrong turn: Lambda, standing up a separate nightly batch job that recomputes the same aggregations in different code, which drifts from the streaming logic and doubles maintenance.",
            ],
          },
          practice: {
            id: "sd-l9-batch-streaming-practice",
            prompt:
              "Design Uber-scale trip event processing: a firehose of GPS pings, trip state changes, and payments must power real-time surge pricing (sub-10-second freshness), live driver ETAs, and an exactly-correct daily earnings/settlement report. Lead with whether you run Lambda or Kappa and how you keep late GPS data from corrupting both the surge signal and the settlement numbers.",
            thinkAbout: [
              "Why does Lambda's parallel-codebase tax reject it at this scale?",
              "How do different watermark/lateness settings serve surge vs settlement from one job?",
              "Why is event-time, not processing-time, essential for late GPS pings?",
            ],
            modelAnswerOutline: [
              "Assumptions: millions of events/sec (GPS pings dominate), three consumers, real-time surge (seconds), live ETAs (seconds), and a daily earnings/settlement report that must be exactly correct and auditable for driver payouts.",
              "**Kappa, not Lambda.** At this scale maintaining a parallel batch reimplementation of surge and settlement logic would drift and be a permanent reconciliation tax. Events flow into **Kafka** (partitioned by geo cell / trip id for locality and ordering) with long retention as the system of record and replay source. **Flink** is the single processing engine.",
              "**Real-time surge and ETAs** are event-time windowed aggregations over short intervals per geo cell (supply/demand ratios, recent request velocity). I favor low latency: watermarks advance aggressively so surge updates within seconds, accepting that a late GPS ping may slightly revise a cell's number after the fact. Approximate-but-fresh is correct for a pricing signal.",
              "**Late GPS data is the crux.** Phones drop into tunnels and send pings with event-times minutes old. I window everything by **event-time**, never processing-time, so a delayed ping is attributed to the minute it actually occurred. **Watermarks** with bounded allowed-lateness let late pings correct their window: for surge, an aggressive watermark and small lateness (speed over completeness), while for settlement I hold windows open longer and only finalize a day after a generous lateness bound so stragglers are counted.",
              "**Exactly-correct settlement:** the same Flink job writes exactly-once (checkpointing + transactional sink) into **Iceberg** trip/earnings tables. The daily settlement report is a batch SQL query over finalized, watermark-closed Iceberg partitions, so it is complete, reproducible, and auditable via time travel. This streaming-into-lakehouse design serves surge, ETAs, and settlement from one codebase.",
              "Tradeoffs: exactly-once plus long watermark lateness for settlement adds latency and checkpoint overhead, justified because driver payouts must be exact. Common wrong turn: processing-time windows (which misattribute late pings and corrupt both surge and payouts) or a separate Lambda batch layer duplicating the logic.",
            ],
          },
        },
      ],
    },
  ],
}
