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

This is the most-tested architecture tradeoff in system design rounds, and the industry mood has swung back toward starting monolithic. Amazon Prime Video famously moved a monitoring pipeline from microservices back to a monolith and cut cost 90%. Shopify runs a modular monolith at enormous scale. The strong senior answer is not "microservices are modern" but "match the architecture to the org and the load."

\`\`\`
 Monolith            Modular Monolith           Microservices
 one deploy          one deploy                 many deploys
 no enforced         enforced module            network boundaries
 boundaries          boundaries, single DB      DB-per-service
 fastest to build    fast + refactorable        independent scaling
\`\`\`

A plain monolith is one codebase, one deploy, one database. It is the fastest way to ship and the easiest to reason about, because a call across features is a function call, not a network hop. Its weakness is that without discipline the internals turn to spaghetti and one team's change blocks another's deploy.

A modular monolith keeps the single deploy and single database but enforces internal module boundaries: the Orders module talks to the Inventory module only through a defined interface, not by reaching into its tables. You get most of the maintainability benefit of services with none of the network cost, and you keep clean seams so you can split a module out later when you actually need to.

Microservices split each capability into its own deployable service with its own datastore. The benefits are real but specific: independent deploy cadence, independent scaling (the search service can run 50 pods while checkout runs 5), fault isolation, and polyglot freedom. The costs are also real: network latency on every hop, no cross-service transactions (you need sagas), eventual consistency, distributed tracing to debug anything, and a large ops and cloud bill.

## The extraction triggers

The decision rule: default to a modular monolith, then extract a service only when a concrete trigger appears. Real extraction triggers are (1) org scaling, when too many teams contend on one deploy pipeline (Conway's Law), (2) divergent deploy cadence, when one part ships hourly and the rest ships weekly, (3) divergent scaling profile, when one component needs 10x the hardware, (4) fault isolation for a critical path, and (5) a genuine polyglot need.

**Interview nuance:** the worst outcome is a distributed monolith: services that share a database or must be deployed together. You pay the full network and ops cost of microservices and still cannot deploy or scale independently, so you get every cost and no benefit. Interviewers probe for this by asking "what if two of your services need the same data?" The right answer is API or event access, never a shared table.

Argue both directions from the requirements. If asked to justify microservices, ground it in a named trigger. If asked why not, cite the distributed-monolith risk and the ops overhead a small team cannot absorb.

**Recap:** default to a modular monolith with clean seams, extract services only on a concrete org, cadence, or scaling trigger, and never build a distributed monolith.
`.trim()

const decompositionDddTeach = `
## Where to cut is the hard part

Once you decide to split, the hard part is where to cut. Bad boundaries are what turn microservices into a distributed monolith. The tool for drawing good boundaries is Domain-Driven Design, specifically the bounded context.

## Align boundaries to business capabilities

The core rule: align service boundaries to business capabilities, not technical layers. A common novice split is by layer (a UI service, a business-logic service, a data service), which is disastrous, because almost every feature touches all three, so every change requires coordinated deploys across all of them. Instead you split by capability: Orders, Payments, Inventory, Shipping, Catalog, Identity. Each maps to a bounded context, a part of the domain with its own model and its own language. The word "product" means an SKU with price and description in Catalog, but a line item with quantity and fulfillment status in Orders. Those are different models and belong in different services.

**Interview nuance:** the single most important consequence of a bounded context is data ownership. Each service owns its data and no other service touches its database. Access is only through the owning service's API or through events it publishes. If two services share a database table, they are coupled at the schema level: you cannot change the table without coordinating both deploys, and you are back to a distributed monolith. Interviewers will test this directly: "the Shipping service needs the customer's address, where does it get it?" The right answer is it calls Identity's API or subscribes to a customer-updated event and keeps its own copy, never a join across databases.

## Right-sizing in both directions

Nano-services (one service per table or per endpoint) create chatty networks where a single user action fans out to 20 synchronous calls, and latency and failure probability compound. God-services swallow half the domain and become a monolith with a network in front. The heuristic: one team owns each service, and a service should be independently deployable and understandable by that team. This is Conway's Law used deliberately, the Inverse Conway Maneuver: design the team structure and the service structure together, because your architecture will end up mirroring your org chart whether you plan it or not.

## Extract with the Strangler Fig

You rarely rewrite. The standard extraction pattern is the Strangler Fig. You put a routing layer (an API gateway or proxy) in front of the monolith, then peel off one capability at a time: stand up the new Payments service, route payment traffic to it, and leave everything else in the monolith. Over months you strangle the old code path until the monolith is gone or reduced to a small core. At each seam you place an anti-corruption layer, a translation shim that maps the monolith's messy legacy model to the new service's clean model, so the old design does not leak into and corrupt the new one.

\`\`\`
        [ Router / Gateway ] --> new Payments service (extracted)
                            \\--> legacy Monolith (everything else)
             anti-corruption layer translates at each seam
\`\`\`

**Recap:** cut along business capabilities and bounded contexts, give every service exclusive ownership of its data, size services to one team each, and extract incrementally with the Strangler Fig and an anti-corruption layer.
`.trim()

const interServiceCommTeach = `
## How services talk decides whether the system is resilient

Once you have services, how they talk determines whether the system is resilient or a house of cards. Two axes: synchronous versus asynchronous, and orchestration versus choreography.

## Sync vs async

Synchronous request-response (REST or gRPC) is right when the caller needs the answer now to proceed: checkout must know if the payment authorized. Asynchronous messaging (events on Kafka, RabbitMQ, or SQS) is right when the caller does not need to wait and you want to decouple: after an order is placed, notifications, analytics, and the loyalty service should each react without checkout waiting on any of them. The failure-mode difference is the whole point. A synchronous chain A -> B -> C -> D means if D is slow, A is slow, and threads pile up all the way back, so one slow service stalls the entire flow and can cascade into total outage. An async hop absorbs the slowness in a queue; D drains it when it recovers.

## Protocol choice

For internal east-west traffic between services, gRPC with protobuf is the default: binary, strongly typed, HTTP/2 multiplexed, and much faster than JSON over HTTP/1. For external north-south traffic to browsers and third parties, REST or GraphQL over HTTP/JSON wins on ubiquity and tooling. So a common shape is REST at the edge, gRPC inside.

## Orchestration vs choreography

\`\`\`
 Orchestration                     Choreography
 [ Coordinator ] --> Payment       Order -event-> Payment -event-> Inventory
   (saga)        --> Inventory     each service reacts to the
                 --> Shipping      previous one's event; no central brain
 central visibility, one           low coupling, but flow is
 place to change, but a            implicit and hard to trace
 coupling hotspot
\`\`\`

Orchestration puts a central coordinator (a saga orchestrator like Temporal or a workflow service) in charge of calling each service in order and handling failures. You get one place to see and change the flow, at the cost of a component that knows about everyone. Choreography has each service emit events and react to others' events with no central brain: lowest coupling, but the end-to-end flow lives nowhere and is painful to debug and reason about. Rule of thumb: choreography for simple 2 to 3 step flows, orchestration once a workflow has real branching, compensation, and needs auditability.

## Consistency without 2PC

You cannot run an ACID transaction across services, and two-phase commit does not scale and blocks on failure. The pattern is the saga: a sequence of local transactions where each step has a compensating action. If Shipping fails after Payment succeeded, you run the compensation for Payment (refund) rather than rolling back a distributed transaction. Sagas give you eventual consistency, not atomicity, and you must design the compensations explicitly.

**Interview nuance:** resilience primitives are almost always probed. Every sync call needs a timeout (never infinite), retries with exponential backoff and jitter (to avoid retry storms), a circuit breaker (stop calling a dead dependency so it can recover and you fail fast), and idempotency keys (so a retry does not double-charge). Backpressure and bounded queues stop a fast producer from drowning a slow consumer. These four, timeout plus retry-with-jitter plus circuit breaker plus idempotency, are what prevent one failure from cascading.

**Recap:** sync for must-know-now reads (gRPC inside, REST at the edge), async events to decouple and absorb slowness, orchestration for complex flows and choreography for simple ones, sagas with compensations for cross-service consistency, and timeouts plus jittered retries plus circuit breakers plus idempotency to stop cascades.
`.trim()

export const systemDesignLevel9: DesignLevel = {
  id: 9,
  slug: "modern-architecture",
  title: "Level 9 — Modern Architecture & Delivery",
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
            "Default to a modular monolith with clean seams, extract services only on a concrete org, cadence, or scaling trigger, and never build a distributed monolith (shared DB or coupled deploys) that has every cost and no benefit.",
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
              "Design the migration path for a company like Prime Video that already runs a 12-microservice media-monitoring pipeline costing too much, where the services are chatty and pass large frames over the network. Recommend whether to consolidate and how, leading with the deliverable.",
            thinkAbout: [
              "How do you confirm the cost is network/storage transfer, not compute?",
              "Which services consolidate and which stay split?",
              "Why does per-step independent scaling lose nothing here?",
            ],
            modelAnswerOutline: [
              "Deliverable: consolidate the chatty, data-heavy services into a single orchestrated process, keeping only the genuinely independent components as services.",
              "**Diagnosis first.** The problem signature is high inter-service data volume: each frame is passed over the network and often serialized to object storage between steps, so the bill is dominated by network transfer and S3 round trips, not compute. This is the case where microservices actively hurt, because the 'hop' cost dwarfs the 'work' cost. Twelve services that must all run for every frame is a distributed monolith wearing a microservices costume: coupled lifecycle, no independent value, full network tax.",
              "**Recommendation:** merge the frame-processing steps (detectors, defect analysis, aggregation) into one process where data moves in memory instead of over the network. This is exactly the change Prime Video made, collapsing the pipeline into a single monolithic process and cutting cost about 90%, because in-memory handoff replaced S3 and inter-service transfer.",
              "**What stays split:** control-plane and orchestration pieces with a genuinely different profile, for example the API that schedules jobs, the dashboard, and any component that scales on a different axis. Keep those as separate services because they meet a real trigger (different cadence, different scaling).",
              "**Migration path:** (1) instrument to confirm the cost is transfer, not compute, so the decision is data-driven, (2) combine the hot data-path services behind a feature flag into one deployable, (3) run old and new in parallel on a slice of traffic and compare cost and latency, (4) cut over and decommission the redundant services and their storage buckets.",
              "Tradeoff acknowledged: the consolidated process scales as one unit and loses per-step independent scaling, but for a pipeline where every step runs on every frame anyway, that independence was never being used, so nothing real is lost while the network and storage bill collapses.",
            ],
          },
        },
        {
          id: "sd-l9-decomposition-ddd",
          title: "Service Decomposition & Bounded Contexts (DDD)",
          summary:
            "Cut along business capabilities and bounded contexts, give every service exclusive ownership of its data (API/event access only, never a shared table), size services to one team each, and extract incrementally with the Strangler Fig and an anti-corruption layer.",
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
              "Design the decomposition and 18-month extraction plan for a large monolith like early Uber's, where the rider, driver, trip, pricing, and payments logic all live in one Python service and one Postgres, and the org is about to grow from 3 to 15 teams. Lead with the deliverable.",
            thinkAbout: [
              "Which context has the sharpest extraction trigger, and why extract it first?",
              "How does the Inverse Conway Maneuver sequence team and service creation?",
              "What consistency tradeoff do you accept for real-time matching?",
            ],
            modelAnswerOutline: [
              "Deliverable: a capability-aligned service map plus a Strangler Fig plan sequenced by org growth and coupling, not a big-bang rewrite.",
              "**Contexts:** Rider (profiles, requests), Driver (profiles, availability, location), Dispatch/Matching (the real-time matching engine), Trip (trip lifecycle and state), Pricing/Surge (fare and surge computation), Payments (charges, driver payouts), Maps/ETA. Each owns its data. Driver location is high-write and high-read and belongs behind its own service and a specialized store (an in-memory geospatial index, not the shared Postgres), which is itself a strong extraction trigger.",
              "**Sequence over 18 months, driven by the trigger with the sharpest edge:** (1) extract Dispatch/Matching and Driver-location first, because they have a wildly different scaling and latency profile (real-time, geospatial, huge write volume) that is strangling the shared Postgres; give them their own datastore (Redis or a purpose-built geo index) and a dedicated team. (2) Extract Payments next for fault isolation and compliance cadence. (3) Extract Pricing/Surge, which has its own compute-heavy, independently deployable model and experiment cadence. (4) Leave Rider, Driver profile, and Trip in a shrinking modular core longer, since they are transactional and change together.",
              "**Mechanics:** a gateway routes by capability; each extraction gets an anti-corruption layer translating the legacy model; events (on Kafka) propagate state like trip-completed to Payments and Pricing so they do not read the trip table directly. Team topology follows the Inverse Conway Maneuver: form the Dispatch team before you extract Dispatch, so ownership and boundary land together.",
              "Tradeoff: matching now depends on network calls to Driver-location, so you accept eventual consistency on driver position and design the matcher to tolerate slightly stale locations rather than demanding a synchronous strongly-consistent read. That is the correct trade for a system that must stay real-time under load.",
            ],
          },
        },
        {
          id: "sd-l9-inter-service-comm",
          title: "Inter-Service Communication",
          summary:
            "Sync for must-know-now reads (gRPC inside, REST at the edge), async events to decouple and absorb slowness, orchestration for complex flows and choreography for simple ones, sagas with compensations for cross-service consistency, and timeouts plus jittered retries plus circuit breakers plus idempotency to stop cascades.",
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
  ],
}
