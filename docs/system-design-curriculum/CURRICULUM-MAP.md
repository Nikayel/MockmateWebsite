# Zero-to-Hero System Design Curriculum Map

> Part of the **[Learn System Design curriculum pack](./README.md)**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [RESEARCH](./RESEARCH.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)
> **This file is the authoritative taxonomy** (ids, ordering, `thinkAbout`, `modelAnswerOutline`). Full authored prose per module lives in [`content/`](./content/), indexed by [`CONTENT.md`](./CONTENT.md).

This is the authoritative content contract for the CodeSparring Learn system-design course. It defines every level, module, and lesson. Content authors expand each lesson in place; the lesson ids are stable and must not change.

**Audience.** Dual-purpose: (a) real engineering knowledge for building modern systems, and (b) system-design interview readiness for SWE / senior / staff and DE/infra roles. Every module carries both.

**Apply format.** Every Apply is FREE-RESPONSE design reasoning. There is no code execution and no auto-grading. The learner reads the Learn section, thinks through the `thinkAbout` questions, writes an answer, saves it, then reveals the model answer (built from `modelAnswerOutline`) to self-compare.

**Style rules for authors.** Apply prompts lead with the deliverable (Design / Explain how you would / Choose and justify). No em dashes in learner-facing prose. Concrete senior-engineer voice with real systems and numbers. Model answers state assumptions, give the high-level design, name concrete technologies, quantify where sensible, and call out tradeoffs plus at least one common wrong turn.

**Totals:** 12 levels, 56 modules, 208 lessons.

## Summary

| Level | Title | Modules | Lessons | What a learner can do after it |
|------:|-------|--------:|--------:|--------------------------------|
| L0 | Interview & Communication Method | 4 | 15 | Run the interview clock: scope, estimate, structure a walkthrough, and drive tradeoffs at the right level. |
| L1 | Foundations & Mental Models | 4 | 21 | Reason about networking, API contracts, and the performance/resilience fundamentals every design assumes. |
| L2 | Data Storage & Modeling | 5 | 17 | Pick a datastore and model data for its access patterns, understanding engines, indexing, and transactions. |
| L3 | Scaling the Data Tier | 5 | 16 | Scale a data tier with replication, sharding, caching, CDN/search, and keep derived data in sync. |
| L4 | Scaling Compute & Traffic | 4 | 14 | Scale a compute tier: stateless services, load balancing, gateways, rate limiting, autoscaling, overload control. |
| L5 | Distributed Systems Core | 5 | 18 | Reason rigorously about consistency, consensus, clocks, distributed transactions, and failure handling. |
| L6 | Asynchronous & Event-Driven Systems | 5 | 15 | Design event-driven systems with correct delivery semantics, stream processing, and event sourcing/CQRS. |
| L7 | Reliability, Resilience & Operations | 5 | 17 | Make a system reliable: SLOs/error budgets, observability, resilience patterns, DR, and safe delivery. |
| L8 | Security, Privacy & Multi-tenancy | 5 | 16 | Secure a system: authn/authz, encryption/secrets, abuse defense, compliance/PII, and tenant isolation. |
| L9 | Modern Architecture & Delivery | 5 | 16 | Choose modern architecture and delivery: services, containers/mesh, serverless/edge, FinOps, OLTP vs OLAP. |
| L10 | Applied Case Studies | 5 | 28 | Design complete end-to-end systems (the canon of 'design X' problems) integrating every prior level. |
| L11 | Modern & Specialized Systems | 4 | 15 | Design modern specialized systems: ML platforms, LLM/GenAI infra, real-time analytics, global data, IoT. |


---

## L0. Interview & Communication Method

_Run a system-design round like a senior: scope, estimate, structure the walkthrough, and drive tradeoffs._

Slug: `interview-method` | Modules: 4 | Lessons: 15


### Module sd-l0-m1: Requirements & Scoping

Slug: `requirements-scoping` | 4 lessons


#### sd-l0-clarify-scope - Clarifying a Vague Prompt

- **learnFocus:** How to turn a one-line prompt into a scoped problem with 3-5 sharp questions and explicit out-of-scope.
- **difficulty:** easy | **estimatedMinutes:** 25 | **skills:** scoping, requirements, communication
- **applyPrompt:** Given the bare prompt 'Design Twitter', write the first 6 clarifying questions you would ask and show how each answer narrows the design.
- **thinkAbout:**
  - Which product slice is actually in scope, and what will you explicitly defer?
  - What do you need to know about actors, scale, and read/write mix before drawing anything?
  - How do you avoid analysis paralysis and move within 3-5 questions?
- **modelAnswerOutline:**
  - Assume the interviewer is a collaborator, not an oracle: propose assumptions and get buy-in.
  - Separate the product ask from the system ask; confirm the feature slice (home timeline vs full Twitter).
  - Ask about users/actors, primary use cases, scale (DAU), read:write ratio, and geo distribution.
  - Explicitly negotiate out-of-scope items (search, ads, DMs) to protect the time budget.
  - Restate the problem back to confirm shared understanding, then commit and move on.
  - Common wrong turn: interrogating with 15 questions or jumping to boxes before scoping.

#### sd-l0-functional-requirements - Functional Requirements

- **learnFocus:** Phrasing the top 3 user capabilities and mapping each to an API path and data flow.
- **difficulty:** easy | **estimatedMinutes:** 20 | **skills:** requirements, product-thinking
- **applyPrompt:** Write the top 3 functional requirements for a photo-sharing app as 'users should be able to...' statements and justify why you deferred the rest.
- **thinkAbout:**
  - Which 3 capabilities define the primary user journey?
  - How does each requirement later become an endpoint and a data-flow path?
  - What secondary features are you deferring and why is that safe?
- **modelAnswerOutline:**
  - State capabilities concretely: users can post a photo, follow users, and view a feed.
  - Ruthlessly prioritize ~3 core features instead of an exhaustive list.
  - Identify the main business objects (User, Photo, Follow) from the requirement nouns.
  - Map each functional requirement to one endpoint and one data path so the design stays coherent.
  - Defer search, notifications, and analytics explicitly to keep scope finishable.
  - Common wrong turn: an unbounded feature list that guarantees an incomplete design.

#### sd-l0-nonfunctional-requirements - Non-Functional Requirements, Quantified

- **learnFocus:** Turning scale, latency, availability, and consistency into quantified, testable targets that drive architecture.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** nfr, slo, capacity
- **applyPrompt:** For a 100M-DAU feed system, list 4-5 non-functional requirements as quantified, testable statements and name the design lever each one forces.
- **thinkAbout:**
  - Which NFRs actually change your architecture, and which are generic filler?
  - What is your explicit CAP/PACELC stance for this system and why?
  - How do read-path and write-path SLAs differ here?
- **modelAnswerOutline:**
  - Quantify: p99 feed load < 200ms, 100M DAU, 99.99% availability, not vague adjectives.
  - Take an explicit availability-vs-consistency stance for the feed (favor availability, eventual OK).
  - Cover scalability, latency, availability, durability, consistency; add cost/compliance where relevant.
  - Tie each NFR to a lever: low latency -> cache/CDN; high availability -> replication/multi-region.
  - Distinguish read-path SLAs (fast, cacheable) from write-path SLAs (durable, ordered).
  - Common wrong turn: listing 'scalable, reliable' NFRs that never influence a single decision.

#### sd-l0-core-entities-api - Core Entities & the API Sketch

- **learnFocus:** Naming entities and defining the interface so the abstract problem becomes concrete.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** api-design, data-modeling
- **applyPrompt:** For a URL shortener, define the core entities and the REST/RPC endpoints (create, redirect) with request/response shapes, and note where you would choose REST vs gRPC vs a stream.
- **thinkAbout:**
  - Which nouns in the requirements become entities, and which fields actually matter?
  - What is the minimal endpoint set, one per functional requirement?
  - Where do idempotency keys, pagination, and auth belong at the boundary?
- **modelAnswerOutline:**
  - Identify entities from requirement nouns (ShortLink, User) with only design-relevant fields.
  - Define one endpoint per requirement: POST /links (create), GET /{code} (redirect via 301/302).
  - Choose protocol deliberately: REST for the public API, gRPC internally, note streaming if needed.
  - Show idempotency key for create so the same long URL is stable, and auth where it matters.
  - Make the interface reveal the data flow: what the client sends and what comes back.
  - Common wrong turn: fully normalizing a schema or over-documenting every column upfront.

### Module sd-l0-m2: Back-of-the-Envelope Estimation

Slug: `estimation` | 4 lessons


#### sd-l0-fermi-estimation - The Fermi Estimation Method

- **learnFocus:** Decomposing a big unknown into assumed quantities, labeling units, and rounding to powers of ten.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** estimation, capacity
- **applyPrompt:** Estimate peak QPS, daily storage, and cache size for a service with 50M DAU averaging 10 reads and 1 write per day, showing every assumption and unit.
- **thinkAbout:**
  - What assumptions must you state so the numbers are defensible?
  - How do you get from average to peak, and what spike multiplier is reasonable?
  - Which computed number actually changes a design decision?
- **modelAnswerOutline:**
  - Decompose the unknown into small assumed quantities; process over precision.
  - Write down every assumption, label units, round to powers of ten.
  - Compute avg QPS (500M reads/day / 86,400s ~= 5.8k), apply a 2-3x peak multiplier.
  - Size storage = objects/day x size x retention; size cache from the hot working set.
  - Call out the design implication of each number (sharding, cache tier, server count).
  - Common wrong turn: elaborate math that never changes the architecture (analysis paralysis).

#### sd-l0-qps-read-write - QPS and Read-vs-Write Modeling

- **learnFocus:** Deriving read vs write QPS and letting the ratio decide caching, replication, and datastore.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** estimation, read-write-ratio
- **applyPrompt:** For a social feed, derive read QPS vs write QPS from DAU and a fan-out assumption, then state whether you would optimize the read or write path.
- **thinkAbout:**
  - What is the read:write ratio, and does it point you to cache-heavy or write-optimized design?
  - Is fan-out done on read or on write, and how does that change QPS?
  - How do hotspots and Zipfian access change the averages?
- **modelAnswerOutline:**
  - Convert DAU -> requests/day -> avg QPS -> peak QPS with explicit arithmetic.
  - Establish read:write ratio; a 100:1 read-heavy feed pushes you to caching and replicas.
  - Model fan-out-on-write (precompute feeds) vs fan-out-on-read (merge at query time).
  - Account for hot keys and non-uniform access, not just averages.
  - Translate QPS into a first-order server/connection count.
  - Common wrong turn: ignoring the read:write ratio and optimizing the wrong path.

#### sd-l0-storage-bandwidth-cache - Storage, Bandwidth & Cache Sizing

- **learnFocus:** Sizing 5-year storage, ingress/egress bandwidth, and the hot cache tier with the 80/20 rule.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** estimation, storage, cache
- **applyPrompt:** Size 5-year storage and the hot-cache tier for a media service, applying the 80/20 rule to decide what lives in cache vs cold storage.
- **thinkAbout:**
  - How do you separate metadata size from blob size in the storage estimate?
  - What working-set fraction belongs in the hot cache tier?
  - How does replication factor multiply your storage number?
- **modelAnswerOutline:**
  - Storage = objects/day x object size x retention; keep metadata and blobs separate.
  - Apply the 80/20 rule: size the cache from the hot ~20% of data, not the full corpus.
  - Bandwidth = QPS x payload, computed separately for ingress and egress (egress cost matters).
  - Multiply by replication factor and add index/overhead, not just raw payload.
  - Map to concrete tech: object store for blobs, cache for hot set, shard count for capacity.
  - Common wrong turn: forgetting replication multiplier or metadata/index overhead.

#### sd-l0-latency-numbers - Latency Numbers Every Engineer Should Know

- **learnFocus:** The latency ladder and unit cheat-sheet that make estimates credible and fast.
- **difficulty:** easy | **estimatedMinutes:** 20 | **skills:** estimation, latency
- **applyPrompt:** From memory, order these by latency and give rough magnitudes: L1/RAM read, SSD read, same-datacenter round trip, cross-region round trip, disk seek.
- **thinkAbout:**
  - What is the rough order of magnitude at each rung of the latency ladder?
  - How do you convert one day and one month into seconds for QPS math?
  - What single-machine ceilings (QPS, connections) do you assume?
- **modelAnswerOutline:**
  - Latency ladder: memory ~100ns << SSD ~100us << same-DC RTT ~0.5ms << cross-region ~50-150ms.
  - Powers of two for data units (KB/MB/GB/TB) and how they map to bytes.
  - One day ~= 86,400s (~10^5), one month ~= 2.5M s for quick QPS-to-volume conversion.
  - Rough ceilings: a tuned server handles tens of thousands of QPS; a DB node far fewer writes.
  - Typical object sizes (a tweet ~ hundreds of bytes, a photo ~ MB) to plug into storage math.
  - Common wrong turn: quoting numbers off by orders of magnitude that break the estimate.

### Module sd-l0-m3: The Structured Walkthrough

Slug: `structured-walkthrough` | 3 lessons


#### sd-l0-phased-delivery-clock - Phased Delivery & the Interview Clock

- **learnFocus:** A repeatable 6-phase structure with a minute budget and exit criteria for each phase.
- **difficulty:** easy | **estimatedMinutes:** 25 | **skills:** framework, time-management
- **applyPrompt:** Produce a labeled 6-phase walkthrough plan for a 45-minute 'Design a URL shortener' round, with a minute budget per phase and the exit criterion for each.
- **thinkAbout:**
  - How much time goes to requirements+estimation vs design+deep dives?
  - What is the exit criterion that lets you move to the next phase?
  - How do you narrate transitions so the interviewer follows your lead?
- **modelAnswerOutline:**
  - Canonical phases: clarify (~5m) -> entities (~2m) -> API (~5m) -> high-level design (~10-15m) -> deep dives (~10m) -> wrap-up (~3m).
  - Spend only ~5-7 min total on requirements+estimation; the bulk goes to design and deep dives.
  - Prime directive: reach a COMPLETE working design before adding complexity.
  - Narrate transitions ('I have a working design, now let me harden availability').
  - Treat the framework as a scaffold, not a script: reorder when the interviewer steers.
  - Common wrong turn: an incomplete design because pacing let deep dives eat the clock.

#### sd-l0-high-level-dataflow - High-Level Architecture & Data-Flow

- **learnFocus:** Drawing the boxes-and-arrows and tracing one concrete request end-to-end.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** architecture, diagramming
- **applyPrompt:** Draw the boxes-and-arrows for a chat app and narrate a single message's full path from sender client to recipient device, including the write and the delivery.
- **thinkAbout:**
  - What is the simplest set of components that satisfies the requirements?
  - Can you trace both the write path and the read/delivery path concretely?
  - Where is each functional requirement satisfied in the picture?
- **modelAnswerOutline:**
  - Start with the simplest boxes (client, LB, app servers, DB, cache) then evolve.
  - Introduce components with justification: gateway, queue, cache, CDN, object store, search index.
  - Trace at least one request end-to-end, both write and read/delivery paths.
  - Label arrows with the data/protocol and group by tier for legibility.
  - Show where each functional requirement is satisfied in the diagram.
  - Common wrong turn: adding components (Kafka, sharding) you cannot yet justify.

#### sd-l0-deep-dives-wrapup - Deep Dives & the Operational Wrap-Up

- **learnFocus:** Letting NFRs point you to the bottleneck, comparing two options, then closing on ops and cost.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** deep-dive, operations, cost
- **applyPrompt:** Pick the tightest non-functional requirement from a completed design and do a deep dive that removes the bottleneck it exposes, then deliver a 2-minute wrap-up naming the top remaining bottleneck, failure mode, what you would monitor, and the biggest cost driver.
- **thinkAbout:**
  - Which NFR points to the real bottleneck (hot partition, SPOF, tail latency)?
  - What two viable approaches can you compare with an explicit recommendation?
  - What breaks first at 10x scale, and what is the dominant cost driver?
- **modelAnswerOutline:**
  - Let NFRs and the traffic model point to the bottleneck rather than diving randomly.
  - Cover standard levers: sharding, replication, caching, async/queues, indexing.
  - Present 2+ options with explicit tradeoffs and commit to a defensible recommendation.
  - Wrap-up: name where it breaks at 10x, the main failure mode, monitoring, and cost driver.
  - Note unaddressed security/privacy gaps and prioritized next steps.
  - Common wrong turn: monologuing every possible dive and skipping the operational wrap-up.

### Module sd-l0-m4: Driving the Conversation & Tradeoffs

Slug: `driving-tradeoffs` | 4 lessons


#### sd-l0-tradeoff-articulation - Trade-off Articulation & Decision Framing

- **learnFocus:** Framing every major choice as an explicit tradeoff and committing with justification.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** tradeoffs, decision-framing
- **applyPrompt:** For a datastore choice in a feed system, compare SQL vs NoSQL against your specific consistency, scale, and query requirements and commit to one with justification.
- **thinkAbout:**
  - Which principled lens (CAP/PACELC, push/pull, sync/async) frames this choice?
  - What assumptions does the decision depend on, so it can be revisited at scale?
  - What are you giving up, not just gaining?
- **modelAnswerOutline:**
  - Frame the choice as a tradeoff (consistency vs availability, latency vs cost, simple vs scale).
  - Use a principled lens and state the assumptions the decision rests on.
  - Quantify where possible: this doubles storage but halves read latency.
  - Commit to one option rather than listing and stalling.
  - Acknowledge what you give up (e.g. cross-entity transactions with NoSQL).
  - Common wrong turn: listing options without taking a stance.

#### sd-l0-level-calibration - Level Calibration: Junior vs Senior vs Staff

- **learnFocus:** Aiming depth and breadth at the rubric for the target level.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** calibration, rubric
- **applyPrompt:** Take 'Design a rate limiter' and describe how a passing answer differs at junior, senior, and staff level on scope, depth, and trade-off sophistication.
- **thinkAbout:**
  - What does 'complete' look like at each level?
  - How many deep dives and how much estimation depth fit each level?
  - What are the graded rubric axes?
- **modelAnswerOutline:**
  - Junior: correct high-level design, core components, basic scaling; completeness over depth.
  - Senior: proactive bottleneck-finding, quantified tradeoffs, deep dives, drives unaided.
  - Staff+: ambiguous-scope framing, org/cost/reliability tradeoffs, evolution-over-time thinking.
  - Match estimation depth and number of deep dives to the target level.
  - Know the rubric axes: problem navigation, technical excellence, communication, proactive depth.
  - Common wrong turn: a staff-depth answer to a junior prompt that never finishes.

#### sd-l0-template-pitfalls - A Reusable Template & the Top Pitfalls

- **learnFocus:** A one-page personal cheat template plus the failure modes that sink most candidates.
- **difficulty:** easy | **estimatedMinutes:** 25 | **skills:** template, pitfalls
- **applyPrompt:** Write a one-page personal cheat template (phases, clarifying questions, estimation checklist, component palette, trade-off lenses) you could reproduce in the first minute of any round, and list the 5 pitfalls you will actively avoid.
- **thinkAbout:**
  - What is the minimal template that starts any round without sounding scripted?
  - Which pitfalls most commonly cause failure, and how do you counter each?
  - How do you adapt the template to the actual prompt's constraints?
- **modelAnswerOutline:**
  - Backbone: phase checklist with a time budget.
  - Stock clarifying questions and NFR prompts; an estimation checklist (QPS, storage, bandwidth, cache, servers).
  - A component palette (LB, gateway, cache, queue, CDN, object store, search, replica/shard).
  - Trade-off lenses (CAP/PACELC, push/pull, sync/async, SQL/NoSQL, denormalize).
  - Top pitfalls: solutioning before scoping, unbounded feature list, generic NFRs, designing in silence, no wrap-up.
  - Common wrong turn: reciting a memorized answer that ignores the actual prompt.

#### sd-l0-communication-whiteboarding - Communication, Whiteboarding & Reading the Interviewer

- **learnFocus:** Narrating your thinking, organizing the board, and treating interviewer hints as course corrections so you lead the round without steamrolling.
- **difficulty:** easy | **estimatedMinutes:** 25 | **skills:** communication, whiteboarding, interview-technique
- **applyPrompt:** Explain how you would run the first 20 minutes of a system-design round out loud: how you narrate your thinking, lay out the diagram, and respond when the interviewer nudges you toward a topic you had not planned to cover.
- **thinkAbout:**
  - How do you keep the interviewer inside your head instead of leaving them to guess what you are thinking silently?
  - What is the difference between a hint you should follow and a rabbit hole you should defer?
  - How do you lay out a diagram so it stays readable as the design grows?
  - What changes when the whiteboard is a shared remote tool instead of a physical wall?
- **modelAnswerOutline:**
  - Assume a 45-minute round with one interviewer who is also your scoring signal, so their attention is the resource you manage.
  - Narrate continuously: say the assumption, the option set, and why you are picking one, so silent thinking never reads as being stuck.
  - Organize the board in fixed zones: requirements and numbers top-left, the box-and-arrow diagram center, and a parking lot for deferred topics on the side.
  - Treat every interviewer comment as a hint with intent: a question about the write path usually means go deeper there, so follow it and confirm ('sounds like you want me to focus on durability, let me do that').
  - Lead by proposing a path and checking in ('I will cover data model then scaling, does that work?'), which is the opposite of steamrolling through a rehearsed script.
  - For remote tools (Excalidraw, a shared doc), pre-learn the shortcuts, keep shapes simple, and talk a bit more to compensate for weaker body-language signal.
  - Common wrong turn: going silent to think, or ignoring a hint because it was not in your planned outline, which reads as not listening.


---

## L1. Foundations & Mental Models

_The networking, API-contract, and performance fundamentals every later design assumes._

Slug: `foundations` | Modules: 4 | Lessons: 21


### Module sd-l1-m1: Networking & the Request Lifecycle

Slug: `networking-request-lifecycle` | 6 lessons


#### sd-l1-network-stack - The Network Stack (OSI / TCP-IP)

- **learnFocus:** A practical layer map so L4 vs L7 decisions later in the course are unambiguous.
- **difficulty:** easy | **estimatedMinutes:** 20 | **skills:** networking, osi
- **applyPrompt:** Explain the layers a browser request traverses from app code down to the wire, and label which component (LB, proxy, TLS terminator, app) operates at which layer.
- **thinkAbout:**
  - What is the practical 5-layer view versus the OSI reference?
  - Why is the L4-vs-L7 distinction the one that actually matters for LBs and proxies?
  - What does the 4-tuple identify about a connection?
- **modelAnswerOutline:**
  - Practical 5-layer view: link, IP, TCP/UDP, TLS, HTTP/app; OSI is a reference not gospel.
  - IP routes packets, TCP/UDP address processes via ports, TLS secures, HTTP carries app semantics.
  - L4 (connection/packet) vs L7 (request/content) is the key distinction for LBs, proxies, firewalls.
  - The 4-tuple (src IP:port, dst IP:port) identifies a connection; MTU/fragmentation lives at IP.
  - Common wrong turn: conflating an L4 load balancer with L7 routing capabilities.

#### sd-l1-dns - DNS Resolution & Traffic Steering

- **learnFocus:** DNS as a first-class routing, failover, and latency lever, and its limits.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** dns, routing, failover
- **applyPrompt:** Design the DNS setup for a globally deployed API: specify record types, TTLs, and how you steer users to the nearest healthy region.
- **thinkAbout:**
  - What is the resolver chain and where does caching happen at each hop?
  - What does TTL trade off, and why is failover not instant?
  - How does GeoDNS or latency-based routing steer traffic?
- **modelAnswerOutline:**
  - Recursive vs authoritative resolvers; root -> TLD -> authoritative chain with caching at each hop.
  - Record types: A/AAAA, CNAME, NS; ALIAS/ANAME for apex domains.
  - TTL trades failover speed against query load; short TTL is not instant due to cached resolvers.
  - GeoDNS / latency-based / weighted routing plus health checks steer and enable blue-green.
  - DNS load balancing has no built-in health awareness; pair with a real LB.
  - Common wrong turn: assuming DNS TTL gives instant failover, ignoring resolver caching.

#### sd-l1-tcp-udp - TCP & UDP Fundamentals

- **learnFocus:** How the handshake, ordering, congestion control, and connection reuse shape real latency.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** tcp, udp, latency
- **applyPrompt:** Explain why a chatty API over new connections is slow on a high-latency link, and list three ways to fix it without changing business logic.
- **thinkAbout:**
  - What does the 3-way handshake cost before any data flows?
  - How does connection reuse amortize that cost?
  - When is UDP the right choice despite losing reliability?
- **modelAnswerOutline:**
  - TCP 3-way handshake costs 1 RTT before data; setup is not free.
  - Reliability via sequencing, ACKs, retransmission; congestion control ramps throughput over a connection.
  - Fixes: keep-alive/connection pooling, HTTP/2 multiplexing, and placing an edge/POP closer to users.
  - UDP is connectionless with no ordering/retransmission; fits real-time media, gaming, DNS, telemetry.
  - Watch TIME_WAIT and ephemeral-port exhaustion at scale.
  - Common wrong turn: opening a new connection per request instead of reusing pooled connections.

#### sd-l1-tls-https - TLS / HTTPS & the Secure Handshake

- **learnFocus:** TLS 1.3 handshake cost, termination choices, and mTLS for service identity.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** tls, security, mtls
- **applyPrompt:** Design TLS termination for a multi-region service: decide where you terminate, how you cut handshake latency, and how services authenticate each other.
- **thinkAbout:**
  - Where do you terminate TLS and what is the latency vs security tradeoff?
  - How do session resumption and 0-RTT cut handshake cost, and what is the replay caveat?
  - Why use mTLS between services?
- **modelAnswerOutline:**
  - TLS 1.3 is a 1-RTT handshake (0-RTT on resumption); drop 1.2-era assumptions.
  - Certificate chain, CAs, SNI for multi-tenant hosts; cert expiry is a common outage source.
  - Terminate at edge/LB to offload crypto, or keep end-to-end/re-encrypt inside the mesh.
  - Session resumption and connection reuse avoid repeated handshakes.
  - mTLS gives service-to-service identity for zero-trust; 0-RTT only for idempotent requests (replay risk).
  - Common wrong turn: treating handshake cost as free or forgetting cert rotation.

#### sd-l1-http-versions - HTTP/1.1 vs 2 vs 3 (QUIC)

- **learnFocus:** How protocol choice affects multiplexing, head-of-line blocking, and mobile performance.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** http, quic, protocols
- **applyPrompt:** Choose the HTTP version(s) for a public API plus its internal microservices and justify each with its failure and latency profile.
- **thinkAbout:**
  - Where does head-of-line blocking bite in H1, H2, and H3?
  - When does HTTP/3 over QUIC actually win?
  - What protocol does gRPC use today?
- **modelAnswerOutline:**
  - HTTP/1.1: one in-flight request per connection, keep-alive, ~6 connections per host.
  - HTTP/2: multiplexed streams over one TCP connection, header compression, but TCP-level HOL blocking remains.
  - HTTP/3 over QUIC (UDP): per-stream reliability removes HOL blocking, faster handshake, connection migration.
  - H3 shines on lossy/mobile/many-short-connection paths; less compelling on stable low-loss links.
  - gRPC runs on H2 today; keep public edge on H2/H3, internal RPC on H2/gRPC.
  - Common wrong turn: adopting H3 everywhere including stable internal links where it adds little.

#### sd-l1-request-lifecycle - End-to-End Request Lifecycle

- **learnFocus:** The integrative 'what happens when you type a URL' story tying DNS, TCP, TLS, proxies, and caches.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** request-lifecycle, caching
- **applyPrompt:** Trace a request from browser to database and back for a signed-in user hitting a dynamic page, naming every hop and the cache at each layer.
- **thinkAbout:**
  - What RTTs are added at each step from DNS through TLS to first byte?
  - Where can a cache short-circuit the path, and what changes on a hit vs miss?
  - What are the failure points and timeouts at each hop?
- **modelAnswerOutline:**
  - Browser cache -> DNS -> TCP -> TLS -> HTTP request, noting the RTT each adds.
  - Edge path: CDN/anycast POP, WAF, load balancer, reverse proxy/API gateway, app server.
  - Server path: auth, business logic, cache lookup, database, downstream services.
  - Response path: serialization, compression, cache headers, CDN fill, client render.
  - Caches at browser, CDN, and app short-circuit the path; connection reuse helps subsequent requests.
  - Common wrong turn: forgetting where caching applies or ignoring per-hop timeouts.

### Module sd-l1-m2: API Design & Contracts

Slug: `api-design` | 8 lessons


#### sd-l1-api-paradigms - REST vs gRPC vs GraphQL

- **learnFocus:** Choosing the API style that fits the consumer and traffic shape.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** api-design, grpc, graphql
- **applyPrompt:** Recommend the API style for (a) a public developer API, (b) internal service-to-service calls, and (c) a mobile client with varied data needs, and defend each.
- **thinkAbout:**
  - What does each paradigm optimize, and what does it cost?
  - Why is a hybrid (REST/GraphQL edge, gRPC internal) the common real answer?
  - Where do WebSocket/SSE and queues fit for push and async?
- **modelAnswerOutline:**
  - REST: resource-oriented, HTTP-cacheable, ubiquitous; default for public APIs.
  - gRPC: contract-first Protobuf over H2, compact, streaming; best for internal RPC.
  - GraphQL: client-specified queries solve over/under-fetching; costs caching and complexity control.
  - Hybrid is normal: REST/GraphQL at the edge, gRPC between services.
  - Know WebSocket/SSE for push and message queues for async decoupling.
  - Common wrong turn: picking GraphQL/gRPC as a buzzword before establishing the consumer and traffic shape.

#### sd-l1-contract-design - Contract & Schema-First Design

- **learnFocus:** The durable interface: shape, naming, and evolution that prevent breakage.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** api-design, contracts, schema
- **applyPrompt:** Design the contract for a 'create order' endpoint: resource naming, request/response schema, required vs optional fields, and how a client discovers it.
- **thinkAbout:**
  - What is the source of truth for the contract, and how is it enforced?
  - How do you design for additive, non-breaking evolution?
  - How do consumer-driven contract tests catch breakage in CI?
- **modelAnswerOutline:**
  - Schema-first with OpenAPI (REST), Protobuf IDL (gRPC), or SDL (GraphQL) as source of truth.
  - Resource naming (nouns over verbs), consistent casing, explicit types, nullability, enums, units.
  - Consumer-driven contract tests catch breaking changes in CI before deploy.
  - Generated clients/servers and docs from the schema.
  - Design for evolution: additive changes, tolerant readers, no field renumbering.
  - Common wrong turn: ad-hoc contracts with renamed/removed fields that break consumers.

#### sd-l1-versioning - Versioning & Backward Compatibility

- **learnFocus:** Shipping a breaking change without breaking existing integrations.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** versioning, compatibility
- **applyPrompt:** Design a versioning strategy that lets you ship a breaking change to a public API without breaking existing integrations.
- **thinkAbout:**
  - URL-path vs header/media-type versioning, and which is the visible default?
  - How do additive changes and tolerant readers avoid version bumps?
  - How do you sequence a migration: deprecate, warn, remove?
- **modelAnswerOutline:**
  - URL-path versioning (/v1) as the visible default for public REST; header/media-type as alternatives.
  - Prefer additive, non-breaking evolution; reserve version bumps for true breaks.
  - GraphQL deprecates fieldwise; gRPC follows Protobuf field-number rules.
  - Backward and forward compatibility via the tolerant-reader pattern.
  - Sequence migrations: deprecate -> warn (sunset headers) -> remove.
  - Common wrong turn: no versioning story from day one, then being unable to fix a design flaw.

#### sd-l1-idempotency-retries - Idempotency & Safe Retries

- **learnFocus:** Making mutating requests safe to retry after a client timeout.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** idempotency, retries, payments
- **applyPrompt:** Make a 'submit payment' POST safe to retry after a client timeout, and specify the server behavior on the duplicate.
- **thinkAbout:**
  - Which HTTP methods are idempotent by definition, and which need explicit handling?
  - What does the server store so concurrent duplicates get the same answer?
  - How does at-least-once become effectively-once?
- **modelAnswerOutline:**
  - GET/PUT/DELETE are idempotent; POST/PATCH need an Idempotency-Key header.
  - Client-generated UUID key; server stores the result with a TTL and returns it on replay.
  - Store the response, not just a flag, so concurrent duplicates get the same answer.
  - Distinguish at-least-once vs effectively-once (dedup) delivery.
  - Apply the same keys to webhooks and message consumers.
  - Common wrong turn: retrying without an idempotency key, causing double charges.

#### sd-l1-pagination-errors - Pagination & Error Modeling

- **learnFocus:** Cursor pagination that stays fast at depth, plus consistent machine-readable errors.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** pagination, errors, api-design
- **applyPrompt:** Design a feed/list endpoint that stays fast at page 10,000 and is stable while new items are inserted, and define the error response shape for validation, auth, conflict, rate-limit, and server errors.
- **thinkAbout:**
  - Why does offset pagination degrade and become unstable under inserts?
  - What does a cursor/keyset page look like, and why is it O(1)?
  - What structured error body and status codes let clients retry correctly?
- **modelAnswerOutline:**
  - Offset/limit is O(n) deep and unstable under concurrent inserts.
  - Cursor/keyset (WHERE id > cursor ORDER BY id LIMIT n) is O(1) and stable; return an opaque next_cursor.
  - Always bound page size with a server max; prefer has_more over exact counts.
  - Use RFC 9457 Problem Details for errors: type/title/status/detail/instance plus a correlation id.
  - Correct codes: 400/401/403/404/409/422/429/5xx; distinguish retryable (5xx/429) from non-retryable (4xx).
  - Common wrong turn: offset pagination on large tables and leaking stack traces in errors.

#### sd-l1-realtime-comms - Real-Time Delivery: Short-Poll, Long-Poll, SSE, WebSocket & Webhooks

- **learnFocus:** Choosing among short-poll, long-poll, SSE, WebSocket, and webhooks by latency, connection cost, direction, and delivery guarantees.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** real-time, api-design, networking
- **applyPrompt:** Choose a real-time delivery mechanism for three features (a chat app, a notifications bell, and streaming LLM tokens back to a browser) and justify each choice against short-poll, long-poll, SSE, WebSocket, and webhooks.
- **thinkAbout:**
  - Is the data flow one-directional server-to-client, or does the client also need to push at low latency?
  - What does each open connection cost at your fan-out, and how does that interact with load balancers and proxies?
  - What delivery guarantee does the feature need, and who reconnects and replays missed messages?
- **modelAnswerOutline:**
  - Assume a browser client, a stateless service tier behind an L7 load balancer, and millions of concurrent users at peak.
  - Short-poll (client re-requests every N seconds): simplest and stateless, but wastes requests and adds up to N seconds of latency, so it fits low-urgency counters.
  - Long-poll (server holds the request open until data or timeout): near-real-time over plain HTTP and works everywhere, but ties up a connection per waiting client and needs careful timeout and reconnect handling.
  - SSE (server-sent events over one long-lived HTTP response): ideal one-way server-to-client streaming (notifications, live feeds, LLM token streaming) with auto-reconnect and event ids for resume, but no client-to-server channel and limited by per-domain connection caps on HTTP/1.1.
  - WebSocket (full-duplex TCP after an upgrade): best for true bidirectional low-latency (chat, presence, multiplayer), but it is stateful, needs sticky sessions or a pub/sub backbone (Redis, NATS) to fan out across nodes, and its own heartbeat and reconnect logic.
  - Webhooks (server-to-server HTTP callbacks): the right tool for async server-to-server events, not browser delivery, and should be paired with retries, signing, and idempotency.
  - Concrete choices: chat -> WebSocket, notifications bell -> SSE (with long-poll fallback), LLM token streaming -> SSE (one-way, resumable, proxy-friendly).
  - Common wrong turn: reaching for WebSockets for everything and paying the stateful-connection and sticky-session tax on a workload that is one-directional and fits SSE.

#### sd-l1-http-semantics - HTTP Semantics: Methods, Status Codes & Caching Headers

- **learnFocus:** Using HTTP method semantics, status families, and caching and conditional headers correctly, including optimistic concurrency with ETag and If-Match.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** http, api-design, caching, concurrency
- **applyPrompt:** Design the HTTP semantics for a document API: choose methods and status codes for read, create, update, and delete, and explain how you would use ETag, If-None-Match, and If-Match to cache reads and prevent lost updates.
- **thinkAbout:**
  - Which methods are safe, which are idempotent, and why does that distinction drive retry behavior?
  - How do Cache-Control, ETag, and Last-Modified turn a GET into a cheap conditional request?
  - How does ETag plus If-Match give you optimistic concurrency, and what status code signals a conflict?
- **modelAnswerOutline:**
  - Assume a JSON document API behind a CDN and shared caches, with clients that retry on failure.
  - Methods: GET and HEAD are safe and idempotent (cacheable), PUT and DELETE are idempotent but not safe, POST is neither, so only idempotent methods are safe to auto-retry.
  - Status families: 2xx success, 3xx redirect or not-modified, 4xx client error (do not retry blindly), 5xx server error (retry with backoff), using specific codes (201 Created with Location, 204 No Content, 404, 409, 429, 503).
  - Read caching: send Cache-Control (max-age, s-maxage, no-store for private data) plus a validator (ETag or Last-Modified) so caches can revalidate cheaply.
  - Conditional GET: the client sends If-None-Match with the ETag (or If-Modified-Since), and the server returns 304 Not Modified with no body, saving bandwidth and origin work.
  - Optimistic concurrency: the client reads an ETag, then sends the update with If-Match, and if the resource changed the server returns 412 Precondition Failed instead of overwriting, preventing the lost-update problem.
  - Content negotiation: honor Accept and Accept-Language, and set Vary on those headers so caches do not serve the wrong representation.
  - Common wrong turn: returning 200 for everything and doing last-write-wins updates, which silently loses concurrent edits and defeats caching.

#### sd-l1-serialization-compression - Serialization, Content Negotiation & Compression

- **learnFocus:** Trading payload size against CPU with serialization-format and compression choices, and evolving schemas safely per format.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** serialization, api-design, performance, schema-evolution
- **applyPrompt:** Choose a serialization format and compression scheme for a high-fan-out internal API and for a public mobile API, and justify each against JSON, Protobuf, Avro, Thrift, and gzip, Brotli, zstd on the size, CPU, and schema-evolution axes.
- **thinkAbout:**
  - Where is the bottleneck: bandwidth (mobile, cross-region) or CPU (very high QPS)?
  - How does each format handle schema evolution when producers and consumers deploy independently?
  - How do you pick a compression codec via Accept-Encoding without paying tail latency on large payloads?
- **modelAnswerOutline:**
  - Assume two surfaces: a chatty internal service mesh at very high QPS, and a public API serving mobile clients on slow, metered networks.
  - JSON: human-readable, ubiquitous, and self-describing, but verbose and slow to parse, so it is a good default for public APIs and debuggability.
  - Binary formats: Protobuf (compact, fast, IDL-driven), Avro (schema is registered or travels with the data, strong for Kafka pipelines), and Thrift (RPC plus serialization), so use binary on internal high-QPS paths to cut CPU and bytes.
  - Compression via Accept-Encoding: gzip (universal, cheap), Brotli (better ratio, great for text over HTTPS to browsers), and zstd (excellent ratio and speed, tunable levels) for internal transfer, and skip compression for tiny or already-compressed payloads.
  - The tradeoff is CPU versus bandwidth: compression and binary encoding cut bytes but add serialization cost, and heavy compression can add tail latency on large responses, so set a payload budget and a size threshold below which you do not compress.
  - Schema evolution per format: Protobuf, Avro, and Thrift support adding optional fields and reserving removed tags for forward and backward compatibility, so never reuse a field tag, while JSON relies on tolerant readers that ignore unknown fields.
  - Concrete choice: internal -> Protobuf with zstd, public mobile -> JSON with Brotli and Vary: Accept-Encoding.
  - Common wrong turn: forcing Protobuf onto a public browser API for 'speed' and paying huge developer and debugging cost for savings the network never needed.

### Module sd-l1-m3: Edge, Proxies & Caching Foundations

Slug: `edge-caching` | 3 lessons


#### sd-l1-load-balancing - Load Balancing: L4 vs L7 & Health Checks

- **learnFocus:** The scale-out primitive: layer, algorithm, stickiness, and how a dead node is drained.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** load-balancing, health-checks
- **applyPrompt:** Place and configure load balancing for a stateless API tier and explain how a dead instance is detected and drained.
- **thinkAbout:**
  - What does L4 vs L7 change about routing, TLS, and content awareness?
  - Which algorithm fits variable request durations?
  - How are active vs passive health checks and connection draining used?
- **modelAnswerOutline:**
  - L4 (transport, fast, opaque) vs L7 (HTTP-aware routing, TLS termination, path/host rules).
  - Algorithms: round robin, least connections, weighted, consistent hashing; least-connections for variable durations.
  - Active vs passive health checks; connection draining and graceful shutdown on deploy.
  - Prefer stateless services over sticky sessions so any node serves any request.
  - The LB itself is a SPOF; make it redundant (active-active/anycast).
  - Common wrong turn: confusing L4 and L7 or leaving the LB as an un-replicated SPOF.

#### sd-l1-reverse-proxy-gateway - Reverse Proxy, API Gateway & the Edge

- **learnFocus:** Pushing cross-cutting concerns (TLS, auth, rate limit, routing) to the edge, not every service.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** gateway, edge, proxy
- **applyPrompt:** Design the edge tier for a microservices backend: list the responsibilities you push to the gateway and why.
- **thinkAbout:**
  - Which cross-cutting concerns belong at the gateway vs in the service?
  - What is the BFF pattern for, and when does a service mesh handle internal concerns?
  - How do you keep the gateway from becoming a logic monolith?
- **modelAnswerOutline:**
  - Reverse proxy: TLS termination, routing, buffering, compression.
  - API gateway: authn/z, rate limiting, request/response transform, aggregation, quotas.
  - BFF (backend-for-frontend) tailors the API per client (web/mobile).
  - Service mesh sidecars handle internal cross-cutting concerns and mTLS.
  - Add a WAF and DDoS protection at the edge.
  - Common wrong turn: the gateway becoming a bottleneck or a distributed monolith of business logic.

#### sd-l1-cdn-caching-foundations - CDN & Caching Across Layers

- **learnFocus:** The highest-leverage performance tool, and its hardest correctness bugs.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** cdn, caching, invalidation
- **applyPrompt:** Design the caching layers for a read-heavy product page and state your invalidation strategy at each layer, including the CDN.
- **thinkAbout:**
  - What are the cache layers from browser to DB buffer?
  - Which write policy (cache-aside, write-through, write-back) fits, and how do you invalidate?
  - How do you invalidate a stale CDN asset?
- **modelAnswerOutline:**
  - Layers: browser -> CDN -> reverse proxy -> app/in-memory -> distributed cache -> DB buffer.
  - Patterns: cache-aside (default), read-through, write-through, write-behind.
  - Invalidation: TTL, explicit purge, event-driven; stale-while-revalidate for resilience.
  - CDN: anycast POPs, cache-key design, Cache-Control/immutable, versioned/fingerprinted URLs for busting.
  - Never cache personalized/authenticated responses; watch Vary pitfalls.
  - Common wrong turn: ignoring invalidation/stampede or caching authenticated responses by mistake.

### Module sd-l1-m4: Performance & Resilience Fundamentals

Slug: `performance-resilience` | 4 lessons


#### sd-l1-latency-percentiles - Latency, Throughput, Percentiles & Little's Law

- **learnFocus:** Why averages lie, why p99 is the user number, and how concurrency relates to throughput and latency.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** latency, percentiles, littles-law
- **applyPrompt:** Define the SLIs/SLOs for an API endpoint and explain why you target p99 latency rather than the mean, using Little's Law to relate concurrency, throughput, and latency.
- **thinkAbout:**
  - Why does tail latency dominate when one request fans out to many services?
  - How does Little's Law (L = arrival rate x latency) bound concurrency?
  - What is coordinated omission and why does it distort measured latency?
- **modelAnswerOutline:**
  - Latency vs throughput vs concurrency trade off under load.
  - Use percentiles p50/p95/p99/p99.9; averages hide the tail that users feel.
  - Tail latency dominates when a request fans out to many services.
  - Little's Law: L = arrival rate x latency relates concurrency, throughput, latency.
  - Measure at the right layer and beware coordinated omission; use histogram-based percentiles.
  - Common wrong turn: quoting average latency and missing that fan-out makes the tail the user number.

#### sd-l1-resilience-primitives - Timeouts, Retries, Backoff & Circuit Breakers

- **learnFocus:** The core client-side defenses so a slow dependency cannot take down the caller.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** resilience, retries, circuit-breaker
- **applyPrompt:** Design the client-side call policy for a flaky downstream dependency so a slow dependency cannot take down the caller.
- **thinkAbout:**
  - Why does every network call need a timeout and a propagated deadline?
  - When is a retry safe, and why do you need jitter and a retry budget?
  - What do the circuit-breaker states do?
- **modelAnswerOutline:**
  - Every network call needs a timeout; propagate deadlines/budgets across the call chain.
  - Retry only idempotent/retryable errors; exponential backoff with jitter to avoid synchronized storms.
  - Cap retries with a retry budget to prevent retry amplification.
  - Circuit breaker (closed/open/half-open) stops hammering a failing dependency.
  - Bulkheads and connection-pool isolation contain failures; fall back or degrade gracefully.
  - Common wrong turn: retries without backoff/jitter/idempotency causing a retry storm.

#### sd-l1-backpressure-shedding - Backpressure, Flow Control & Load Shedding

- **learnFocus:** Protecting a system under overload instead of letting it collapse.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** backpressure, load-shedding, overload
- **applyPrompt:** Design overload protection for an ingestion endpoint that receives more traffic than it can process.
- **thinkAbout:**
  - How do bounded queues and backpressure prevent memory blowup?
  - Why reject early (429/503) rather than queue-and-hope?
  - What does queueing theory say about latency near 100% utilization?
- **modelAnswerOutline:**
  - Backpressure signals producers to slow down; use bounded queues, not unbounded buffers.
  - Load shedding / admission control: reject early with 429/503 to preserve latency for accepted work.
  - Queueing intuition: as utilization approaches 100%, latency explodes.
  - Concurrency limits, token buckets, and adaptive concurrency bound in-flight work.
  - Prioritize critical traffic so it survives; drop stale/timed-out requests.
  - Common wrong turn: unbounded queues that hide overload until the process OOMs.

#### sd-l1-concurrency-models - Server Concurrency Models: Thread-per-Request vs Event Loop & C10k

- **learnFocus:** Comparing thread-per-request and event-loop concurrency, and understanding the C10k limits (file descriptors, ports, blocking IO) each one hits.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** concurrency, performance, operating-systems
- **applyPrompt:** Explain how you would choose between a thread-per-request server and an event-loop server for two workloads (a CPU-heavy image transcoder and an IO-heavy API gateway fanning out to 20 backends), and describe the C10k limits each model runs into.
- **thinkAbout:**
  - Is the workload CPU-bound or IO-bound, and how does that change which model wins?
  - Why does blocking IO cap a thread-per-request server long before CPU saturates?
  - Which OS limits (file descriptors, ephemeral ports, memory per thread) surface at 10k or more connections?
- **modelAnswerOutline:**
  - Assume a Linux host and a service that must hold many concurrent connections, some idle and waiting on downstream calls.
  - Thread-per-request (classic Tomcat or Apache prefork): simple, and blocking code is easy to write, but each thread costs about a megabyte of stack plus context-switch overhead, so tens of thousands of connections exhaust memory and the scheduler.
  - Event loop (Node.js, Nginx, Netty, async runtimes): one or a few threads multiplex thousands of sockets via epoll or kqueue, which is excellent for IO-bound fan-out because idle connections cost only a file descriptor and a little memory.
  - CPU-bound work (image transcoding) does not benefit from an event loop, because a single blocking CPU task stalls the whole loop, so offload it to a worker pool sized to the number of cores.
  - The C10k and C10M problem: holding 10k to 10M connections requires non-blocking IO plus tuned limits, because one blocking thread per connection simply does not scale.
  - Concrete OS limits: the file-descriptor ulimit (raise nofile), roughly 28k ephemeral ports per source IP toward one destination (use connection pooling and multiple destinations), and per-thread stack memory.
  - Concrete choice: image transcoder -> thread or process worker pool sized to cores, API gateway -> event-loop or async runtime with connection pooling to backends.
  - Common wrong turn: putting a blocking database or CPU call directly on the event loop, which serializes every request behind it and destroys throughput.


---

## L2. Data Storage & Modeling

_Relational vs NoSQL, storage engines, indexing, and modeling for access patterns._

Slug: `data-storage` | Modules: 5 | Lessons: 17


### Module sd-l2-m1: Relational & Transactions

Slug: `relational-transactions` | 3 lessons


#### sd-l2-relational-acid - The Relational Model & ACID

- **learnFocus:** What atomicity, consistency, isolation, and durability actually protect against.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** acid, transactions, relational
- **applyPrompt:** Design the schema and transaction boundaries for a bank money-transfer feature that must never lose or double-count funds under concurrent transfers.
- **thinkAbout:**
  - Why must debit + credit be a single atomic transaction?
  - What does durability actually mean at commit time?
  - When is strict ACID worth the cost versus relaxing to BASE?
- **modelAnswerOutline:**
  - Atomicity, Consistency, Isolation, Durability defined concretely, with what each protects against.
  - A transfer needs a single atomic transaction (debit + credit) or partial failure loses money.
  - Durability means the commit is fsync'd to the WAL, not just in memory.
  - Consistency is the app invariant enforced by constraints + isolation, not a free lunch.
  - Use constraints (unique, FK, CHECK, NOT NULL) and referential integrity as guardrails.
  - Common wrong turn: saying 'ACID' as a buzzword without reasoning about the concrete invariant.

#### sd-l2-isolation-levels - Isolation Levels & Read Anomalies

- **learnFocus:** The ANSI levels, the anomalies each prevents, and how to fix a specific concurrency bug.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** isolation, concurrency, transactions
- **applyPrompt:** Given a checkout that oversells inventory under load, choose an isolation level (or explicit locking) that prevents it and justify the concurrency cost.
- **thinkAbout:**
  - Which anomaly (lost update, write skew, phantom) is causing the oversell?
  - What is the difference between snapshot isolation and true serializable?
  - How do SELECT ... FOR UPDATE or a version column fix it?
- **modelAnswerOutline:**
  - ANSI levels: Read Uncommitted, Read Committed, Repeatable Read, Serializable.
  - Anomalies: dirty read, non-repeatable read, phantom, plus write skew and lost update.
  - Postgres defaults to Read Committed; MySQL InnoDB defaults to Repeatable Read.
  - Snapshot isolation still allows write skew; true serializable via SSI or 2PL costs throughput.
  - Fix the oversell with SELECT ... FOR UPDATE, an optimistic version column, or a unique constraint.
  - Common wrong turn: assuming snapshot isolation prevents write skew.

#### sd-l2-mvcc-locking - Concurrency Control: MVCC, Locking, OCC

- **learnFocus:** How isolation is implemented and why readers-don't-block-writers matters for throughput.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** mvcc, locking, concurrency
- **applyPrompt:** Design the concurrency-control strategy for a high-contention counter/like feature so reads stay fast under heavy writes.
- **thinkAbout:**
  - How does MVCC let readers see a snapshot without blocking writers?
  - When do you choose optimistic (version/CAS) over pessimistic locking?
  - What is the operational cost of MVCC (bloat, vacuum, long transactions)?
- **modelAnswerOutline:**
  - MVCC: each write creates a new version; readers see a consistent snapshot without blocking.
  - Pessimistic (2PL, shared/exclusive locks) vs optimistic (version/CAS) concurrency.
  - Vacuum/GC reclaims old versions; long-running transactions hold old snapshots and cause bloat.
  - Deadlocks: detect, order lock acquisition, timeout and retry.
  - For a hot counter, use optimistic CAS or shard the counter to cut contention.
  - Common wrong turn: heavy pessimistic locking on a hot key that serializes all writes.

### Module sd-l2-m2: Storage Engines & Indexing

Slug: `storage-engines-indexing` | 3 lessons


#### sd-l2-btree-vs-lsm - B-Tree vs LSM-Tree

- **learnFocus:** The core read-vs-write tradeoff behind every database choice.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** storage-engine, lsm, btree
- **applyPrompt:** Choose and justify a storage engine for a write-heavy IoT/event-ingestion service versus a read-heavy transactional app.
- **thinkAbout:**
  - Why does LSM suit write-heavy workloads and SSDs?
  - What are read, write, and space amplification, and how do they differ per engine?
  - How do bloom filters and compaction affect LSM behavior?
- **modelAnswerOutline:**
  - B+tree: in-place updates, great range scans/reads, write amplification via WAL + page writes.
  - LSM-tree: memtable + immutable SSTables + compaction, high write throughput, sequential writes.
  - Bloom filters avoid disk reads for non-existent keys in LSM.
  - Read/write/space amplification tradeoffs; compaction (leveled vs tiered) can cause stalls.
  - Pick LSM (Cassandra/RocksDB) for write-heavy IoT; B-tree (Postgres/InnoDB) for read/update-heavy OLTP.
  - Common wrong turn: ignoring compaction stalls or write amplification when picking an engine.

#### sd-l2-indexing-cost - Indexing: Types, Structure & Cost

- **learnFocus:** Which index serves a query, composite ordering, covering indexes, and the write cost.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** indexing, query-performance
- **applyPrompt:** Design the indexes for a query that filters by user_id, filters by status, and sorts by created_at, and explain the index that serves it fully.
- **thinkAbout:**
  - How does the leftmost-prefix rule drive composite column ordering?
  - What makes an index-only (covering) scan possible?
  - Why does over-indexing hurt writes?
- **modelAnswerOutline:**
  - Clustered/primary vs secondary indexes; heap vs index-organized tables.
  - Composite index (user_id, status, created_at) serves the filter+sort via leftmost-prefix.
  - Covering/index-only scans include the needed columns to avoid heap lookups.
  - Selectivity/cardinality decide whether the planner uses an index or a full scan.
  - Every index amplifies writes and storage; specialized indexes: hash, partial, GIN/GiST, geospatial.
  - Common wrong turn: over-indexing for reads while ignoring write amplification and storage cost.

#### sd-l2-physical-storage-wal - Physical Storage: Pages, Buffer Pool & WAL

- **learnFocus:** The mechanics connecting design to real latency and durability.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** storage, wal, durability
- **applyPrompt:** Explain what physically happens on disk and in memory when a row is inserted and the transaction commits.
- **thinkAbout:**
  - What is the role of the buffer pool and dirty-page flushing?
  - Why does the WAL give durability and enable crash recovery?
  - Why is the 100x gap between sequential and random I/O a design driver?
- **modelAnswerOutline:**
  - Data lives in fixed-size pages/blocks; row vs column layout matters.
  - Buffer pool/page cache keeps hot pages in memory; dirty pages flush at checkpoints.
  - Write-ahead log gives durability and crash recovery; group commit and fsync amortize cost.
  - Sequential vs random I/O differ ~100x and drive design.
  - The OS page cache sits under the DB; compression happens at the page level.
  - Common wrong turn: assuming a commit is durable in memory without the fsync'd WAL.

### Module sd-l2-m3: NoSQL Families

Slug: `nosql-families` | 6 lessons


#### sd-l2-key-value - Key-Value Stores

- **learnFocus:** The fastest NoSQL family, used for caches, sessions, and as a building block.
- **difficulty:** easy | **estimatedMinutes:** 25 | **skills:** key-value, redis, sessions
- **applyPrompt:** Design the data layout for user sessions and rate-limit counters in a key-value store, including key schema and TTLs.
- **thinkAbout:**
  - How do you design keys and namespaces to avoid hot keys?
  - When is a KV store a cache vs a source of truth?
  - What does value-blob opacity mean for your model?
- **modelAnswerOutline:**
  - O(1) point lookups by key; no server-side query on values.
  - Key design: namespacing, composite keys (user:123:profile), avoid hot keys.
  - Redis vs DynamoDB vs Memcached; in-memory vs durable; TTL/expiry and eviction for cache use.
  - You fetch the whole value (opaque blob); model accordingly.
  - Redis beyond KV: sorted sets, streams, pub/sub, vectors.
  - Common wrong turn: treating a cache-style KV as a durable source of truth without persistence.

#### sd-l2-document - Document Databases

- **learnFocus:** Flexible hierarchical data and the embedding-vs-referencing tradeoff.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** document-db, mongodb, modeling
- **applyPrompt:** Design the document model for a blog/CMS with posts, comments, and authors, deciding what to embed vs reference.
- **thinkAbout:**
  - What data is read together and should be embedded?
  - When does referencing win despite requiring lookups?
  - Why is atomicity per-document a constraint?
- **modelAnswerOutline:**
  - Flexible semi-structured schema (JSON/BSON); schema-on-read.
  - Embed frequently-read-together data (post + recent comments); reference large/independent entities (authors).
  - Watch document size limits (e.g. 16MB); model to the access pattern.
  - Atomicity is per-document; multi-document transactions are the exception.
  - Index nested fields/arrays; plan schema versioning and migration.
  - Common wrong turn: assuming a document DB gives relational-style multi-document transactions by default.

#### sd-l2-wide-column - Wide-Column / Column-Family Stores

- **learnFocus:** The write-heavy workhorse for feeds, logs, and time-series at internet scale.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** wide-column, cassandra, modeling
- **applyPrompt:** Design the Cassandra table(s) for a messaging app's message history optimized for 'load recent messages in a conversation'.
- **thinkAbout:**
  - How do partition key and clustering columns serve the query?
  - How do you avoid unbounded and hot partitions?
  - What consistency does a quorum read/write give?
- **modelAnswerOutline:**
  - Partition key distributes; clustering columns sort within a partition.
  - One denormalized table per access pattern; no joins.
  - Partition by conversation_id, cluster by time desc; time-bucket to bound partition size.
  - LSM-based, write-optimized; tunable consistency via quorum reads/writes.
  - Avoid hot partitions (celebrity conversations) with sub-partitioning.
  - Common wrong turn: an unbounded ever-growing partition that eventually breaks.

#### sd-l2-graph - Graph Databases

- **learnFocus:** The right tool for deeply connected, multi-hop relationship queries.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** graph-db, neo4j
- **applyPrompt:** Design the graph model for a social network's friends-of-friends and mutual-connection queries.
- **thinkAbout:**
  - Why do recursive relational joins blow up at traversal depth?
  - What does index-free adjacency buy you?
  - When does an adjacency table in SQL suffice instead?
- **modelAnswerOutline:**
  - Nodes + edges + properties; relationships are first-class via index-free adjacency.
  - Use for multi-hop traversals, fraud rings, recommendations.
  - Native graph (Neo4j, Cypher/Gremlin) vs a graph layer over another store.
  - Recursive relational joins blow up at depth; graph traversal cost is local.
  - Tradeoff: harder horizontal scaling; a SQL adjacency table can suffice for shallow depth.
  - Common wrong turn: reaching for a graph DB when a 1-2 hop adjacency table would do.

#### sd-l2-time-series - Time-Series Databases

- **learnFocus:** A distinct append-heavy workload for metrics, IoT, and observability.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** time-series, metrics, cardinality
- **applyPrompt:** Design storage for a metrics/monitoring system ingesting millions of points/sec with fast recent-range queries and cheap long-term retention.
- **thinkAbout:**
  - Why is cardinality explosion the key failure mode?
  - How do downsampling and retention tiers bound cost?
  - Why is columnar + delta-of-delta compression a good fit?
- **modelAnswerOutline:**
  - Append-heavy, time-ordered writes; time is the primary partition dimension.
  - Downsampling/rollups, retention policies, TTL, and hot/warm/cold tiering.
  - Columnar + heavy compression (delta-of-delta, Gorilla) for numeric series.
  - Cardinality explosion from tags/labels is the main failure mode; control it.
  - InfluxDB/TimescaleDB/Prometheus/ClickHouse; time-bucket partitions.
  - Common wrong turn: unbounded tag cardinality that blows up index size and query cost.

#### sd-l2-vector-embeddings - Vector Databases & Embeddings

- **learnFocus:** The modern AI/RAG addition: high-dimensional vectors and approximate nearest-neighbor search.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** vector-db, embeddings, ann
- **applyPrompt:** Design the storage and retrieval layer for a RAG system that does semantic search over millions of document chunks.
- **thinkAbout:**
  - Which ANN index (HNSW, IVF, PQ) fits your recall/latency/memory budget?
  - How do metadata filtering and hybrid (vector + BM25) search combine?
  - When is pgvector enough vs a dedicated vector store?
- **modelAnswerOutline:**
  - Store high-dimensional embeddings; use approximate nearest-neighbor search.
  - Index types: HNSW (high recall, RAM-heavy), IVF/IVF-PQ (memory-efficient), with recall/latency tradeoffs.
  - Metadata filtering + hybrid search (vector + keyword/BM25) for precision.
  - Dedicated (Pinecone, Weaviate, Qdrant, Milvus) vs extensions (pgvector, Elasticsearch).
  - Choose chunking, dimensionality, and distance metric (cosine/dot/L2); plan re-embedding migrations.
  - Common wrong turn: assuming exact vector search scales, ignoring recall vs latency vs memory.

### Module sd-l2-m4: Data Modeling

Slug: `data-modeling` | 3 lessons


#### sd-l2-normalization-denorm - Normalization vs Denormalization

- **learnFocus:** The write-integrity vs read-performance tradeoff at the heart of schema design.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** normalization, denormalization, modeling
- **applyPrompt:** Design the schema for an e-commerce order + line-items + product catalog, then denormalize it for a read-heavy order-history page.
- **thinkAbout:**
  - When are joins fine, and when do they fail to scale?
  - What is the cost of denormalization (update anomalies, fan-out writes)?
  - How do materialized views offer a managed middle ground?
- **modelAnswerOutline:**
  - Normal forms remove redundancy; joins are fine when indexed and bounded.
  - Denormalize to avoid joins on read-heavy paths (precomputed order-history rows).
  - Cost of denormalization: update anomalies and keeping copies consistent on write.
  - Cross-shard joins do not scale; denormalize/co-locate instead.
  - Materialized views and summary tables are a managed middle ground.
  - Common wrong turn: denormalizing for aesthetics rather than a real query pattern + scale trigger.

#### sd-l2-access-pattern-modeling - Query-First Data Modeling

- **learnFocus:** Modeling from access patterns backward, the key NoSQL mindset shift.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** access-patterns, modeling, nosql
- **applyPrompt:** Given the top 3 access patterns for a chat app (list conversations, load a thread, unread counts), design the primary keys and item layout.
- **thinkAbout:**
  - What are the access patterns, and how does each become a single lookup?
  - How do partition key + sort key co-locate related data?
  - How do you avoid a hot partition in the key design?
- **modelAnswerOutline:**
  - List access patterns FIRST, then design keys/tables to serve each in one lookup.
  - Partition key + sort key; composite keys co-locate related data.
  - Model one-to-many and many-to-many via embedding vs referencing.
  - Avoid hot partitions in the key design (spread celebrity/heavy keys).
  - Secondary indexes (global/local) with their consistency and cost implications.
  - Common wrong turn: modeling entities first instead of access patterns first in NoSQL.

#### sd-l2-keys-ids-constraints - Keys, IDs & Constraints

- **learnFocus:** Small ID decisions with outsized effects on sharding, indexing, and hotspots.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** ids, keys, sharding
- **applyPrompt:** Choose a primary-key/ID strategy for a distributed order service and explain its impact on index locality and sharding.
- **thinkAbout:**
  - Why do monotonic keys cause write hotspots on B-trees?
  - How do ULID/UUIDv7 restore time-ordering without random-UUID fragmentation?
  - Which constraints and data types protect integrity (money, timestamps)?
- **modelAnswerOutline:**
  - Auto-increment vs UUID/ULID/Snowflake; monotonic keys cause B-tree write hotspots.
  - UUIDv4 randomness hurts index locality; ULID/UUIDv7 restore time-ordering.
  - Natural vs surrogate keys; composite keys.
  - Constraints as guardrails: unique, FK, CHECK, NOT NULL.
  - Data types: decimal (not float) for money, sized ints, timezone-aware timestamps; soft vs hard delete.
  - Common wrong turn: random UUIDv4 as a clustered primary key causing fragmentation and hotspots.

### Module sd-l2-m5: Blob Storage & Choosing a Store

Slug: `blobs-choosing` | 2 lessons


#### sd-l2-blob-object-storage - Blob / Object Storage

- **learnFocus:** Where large binary data actually lives, and why the DB should hold only metadata.
- **difficulty:** easy | **estimatedMinutes:** 25 | **skills:** object-storage, blob, cdn
- **applyPrompt:** Design storage and delivery for user-uploaded images/videos, including upload path, metadata, and serving.
- **thinkAbout:**
  - Why store blobs in object storage and only the key/URL in the DB?
  - How do presigned URLs let clients upload/download directly?
  - How do lifecycle/tiering and a CDN control cost and latency?
- **modelAnswerOutline:**
  - Store large binaries in object storage (S3/GCS/Azure Blob), not the database.
  - DB holds metadata + object key; object store holds bytes with 11-nines durability.
  - Presigned URLs let clients upload/download directly, bypassing app servers.
  - Multipart upload for large files; versioning/immutability where needed.
  - Lifecycle/tiering (hot -> cold -> archive) for cost; CDN in front for reads.
  - Common wrong turn: storing images/video directly in the database instead of object storage + pointer.

#### sd-l2-choosing-db-polyglot - Choosing a Database & Polyglot Persistence

- **learnFocus:** The synthesis skill: matching workload to store and defending it, including NewSQL.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** database-selection, newsql, polyglot
- **applyPrompt:** Given a feature spec (workload mix, consistency needs, scale, query shapes), recommend a datastore and justify against alternatives, and say when NewSQL beats app-level sharding.
- **thinkAbout:**
  - Which decision drivers (access patterns, consistency, scale, query shape) dominate?
  - When does NewSQL/distributed SQL beat sharding MySQL/Postgres?
  - When should you default to boring relational?
- **modelAnswerOutline:**
  - Decision drivers: access patterns, read/write ratio, consistency, scale, latency, query complexity.
  - Match workload to family (KV, document, wide-column, graph, time-series, vector, relational, columnar).
  - NewSQL (Spanner, CockroachDB, TiDB) gives horizontal scale + ACID via consensus and auto-sharding.
  - Polyglot persistence: multiple stores each for what it is best at, with sync between them.
  - Frame CAP/PACELC and operational cost (managed vs self-hosted, team familiarity).
  - Common wrong turn: reaching for NoSQL for scale without evidence when a well-indexed Postgres suffices.


---

## L3. Scaling the Data Tier

_Replication, sharding, caching, CDN/search, and keeping derived data in sync at scale._

Slug: `scaling-data` | Modules: 5 | Lessons: 16


### Module sd-l3-m1: Replication

Slug: `replication` | 3 lessons


#### sd-l3-read-replicas - Read Scaling with Replicas

- **learnFocus:** The first and cheapest lever for read-heavy systems before any sharding.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** replication, read-replicas, scaling
- **applyPrompt:** Design the read path for a product catalog serving 50k read QPS against a single Postgres primary that is CPU-bound; show how you add capacity without downtime.
- **thinkAbout:**
  - How does single-leader replication scale reads but not writes?
  - What is the durability/latency tradeoff of sync vs async replication?
  - When does replication stop helping and force sharding?
- **modelAnswerOutline:**
  - Single-leader: writes to the leader, reads fanned out to N followers; scales reads not writes.
  - Async vs semi-sync vs sync replication trade durability against latency.
  - Measure replication lag; route lag-sensitive reads carefully.
  - Add followers online behind the LB to add read capacity without downtime.
  - Replication stops helping when write throughput or dataset size exceeds one node: shard.
  - Common wrong turn: promising read-your-writes while serving from a lagging replica.

#### sd-l3-replication-topologies - Replication Topologies & Consistency

- **learnFocus:** Single-leader vs multi-leader vs leaderless and the anomalies each exposes.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** replication, consistency, conflict-resolution
- **applyPrompt:** Design the replication + consistency scheme for a globally-used note app where two users may edit from different regions; state exactly which stale reads and conflicts are possible.
- **thinkAbout:**
  - Where does each topology fit, and what conflicts does it create?
  - How do quorum reads/writes (R + W > N) give strong-ish consistency?
  - How is a write-write conflict resolved (LWW, version vectors, CRDT)?
- **modelAnswerOutline:**
  - Single-leader (no write conflicts, leader SPOF) vs multi-leader (multi-region writes, conflicts) vs leaderless (Dynamo).
  - Quorum: R + W > N gives read/write overlap; sloppy quorums + hinted handoff trade consistency for availability.
  - Reason with PACELC, not a CAP binary; name the concrete anomalies users see.
  - Conflict resolution: last-write-wins (data loss), version vectors, CRDTs, app-level merge.
  - Anti-entropy (read repair, Merkle trees) converges replicas.
  - Common wrong turn: last-write-wins on wall-clock timestamps silently dropping concurrent writes.

#### sd-l3-replication-lag-session - Replication Lag & Session Guarantees

- **learnFocus:** Fixing the user-visible bugs (vanishing writes) that replication lag causes.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** session-guarantees, replication-lag
- **applyPrompt:** Add read-your-writes and monotonic-reads guarantees to a read-replica architecture where a user writes to the primary and reads from lagging replicas.
- **thinkAbout:**
  - Which session guarantee does each user-visible bug violate?
  - How do sticky routing and version tokens implement them?
  - Why are these weaker than linearizability but often exactly enough?
- **modelAnswerOutline:**
  - Session guarantees: read-your-writes, monotonic reads, monotonic writes, writes-follow-reads.
  - Replication lag breaks each; name the symptom (I posted a comment and it vanished on refresh).
  - Implement via sticky routing to the leader after a write, or a version/timestamp token bounding staleness.
  - These are weaker than linearizability but usually exactly what the product needs.
  - Cross-device cases where sticky sessions are insufficient need version tokens.
  - Common wrong turn: promising read-your-writes off async replicas with no routing or token.

### Module sd-l3-m2: Partitioning & Sharding

Slug: `partitioning-sharding` | 4 lessons


#### sd-l3-partitioning-strategies - Partitioning Strategies: Range vs Hash vs Directory

- **learnFocus:** The only way to scale writes and datasets beyond one machine, and how to defend against skew.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** partitioning, sharding, skew
- **applyPrompt:** Design the partitioning scheme for a 20 TB messaging store doing 200k writes/sec; pick a partition strategy and defend it against skew.
- **thinkAbout:**
  - What does range vs hash vs directory partitioning optimize and cost?
  - How do local vs global secondary indexes work across partitions?
  - How does each query map to partitions?
- **modelAnswerOutline:**
  - Horizontal (rows across nodes) vs vertical vs functional partitioning.
  - Range: good for range scans, prone to hotspots on sequential keys (timestamps, auto-inc).
  - Hash: even spread but kills efficient range queries; hash-mod-N is brittle on resize.
  - Directory/lookup-based: a routing table for flexibility at the cost of a lookup hop.
  - Local (scatter-gather) vs global (term-partitioned) secondary indexes; partition indexes too.
  - Common wrong turn: a sequential range key that creates a single hot partition.

#### sd-l3-consistent-hashing - Consistent Hashing, Virtual Nodes & Rebalancing

- **learnFocus:** Adding/removing nodes with minimal data movement instead of a full remap.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** consistent-hashing, rebalancing
- **applyPrompt:** Design node-membership handling for a distributed cache cluster so that losing 1 of 10 nodes does not invalidate the whole keyspace.
- **thinkAbout:**
  - Why does hash-mod-N remap nearly all keys on resize?
  - How do virtual nodes smooth load and speed rebalancing?
  - How does bounded-load consistent hashing cap hotspots?
- **modelAnswerOutline:**
  - Hash-mod-N remaps nearly all keys on resize; consistent hashing moves only ~1/N.
  - Ring placement: keys map to the next node clockwise; add/remove touches only neighbors.
  - Virtual nodes (many tokens per physical node) smooth load and speed rebalancing.
  - Weighted vnodes for heterogeneous hardware; bounded-load hashing caps hotspots.
  - Rendezvous (HRW) hashing is a simpler alternative for replica selection.
  - Common wrong turn: hash-mod-N sharding that reshuffles the world when a node is added.

#### sd-l3-shard-key-hotspots - Shard-Key Selection, Hotspots & the Celebrity Problem

- **learnFocus:** A bad shard key silently recreates a single-node bottleneck; it is costly to change.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** shard-key, hot-key, celebrity
- **applyPrompt:** Choose the shard key for a social feed where one celebrity account has 100M followers and 1000x normal traffic; prevent a single hot shard.
- **thinkAbout:**
  - What makes a good shard key (cardinality, even access, aligned to query)?
  - How do you mitigate a hot key (salting, dedicated shards, sub-partitioning)?
  - Why plan resharding and online migration early?
- **modelAnswerOutline:**
  - Pick a key with high cardinality and even access, aligned to the dominant query.
  - Hot-key mitigation: salting/key-splitting, sub-partitioning, dedicated shards for whales.
  - Entity groups / co-location keep common transactions single-shard.
  - Compound keys (tenant_id + entity_id) for multi-tenant isolation.
  - Resharding is painful: plan split points, online migration, double-write cutover early.
  - Common wrong turn: a low-cardinality shard key (status, country) that creates a hot shard.

#### sd-l3-cross-shard-ops - Cross-Shard Operations & Distributed Transactions

- **learnFocus:** Coping when sharding breaks joins and atomic multi-key writes.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** cross-shard, saga, transactions
- **applyPrompt:** Design a money-transfer or order-checkout flow that must update two records living on different shards without losing consistency.
- **thinkAbout:**
  - Why avoid 2PC on the hot path, and what does it cost?
  - How does a saga with compensations replace a cross-shard transaction?
  - How do the outbox pattern and idempotency keys make it safe?
- **modelAnswerOutline:**
  - Scatter-gather queries are bounded by the slowest shard (tail amplification).
  - Avoid 2PC on the hot path; it blocks on coordinator failure and holds locks.
  - Use a saga with compensating actions for cross-shard business transactions.
  - Idempotency keys and dedup make retries safe under at-least-once delivery.
  - Outbox pattern makes the DB write and event publish atomic; denormalize to avoid cross-shard joins.
  - Common wrong turn: hand-waving cross-shard joins as free instead of designing scatter-gather or sagas.

### Module sd-l3-m3: Caching at Scale

Slug: `caching-scale` | 3 lessons


#### sd-l3-caching-patterns - Caching Patterns & Write Policies

- **learnFocus:** Choosing cache-aside vs write-through vs write-back and an invalidation story.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** caching, write-policies
- **applyPrompt:** Design the caching layer for a read-heavy product page (95% reads) backed by a database that can serve only 10% of peak read traffic.
- **thinkAbout:**
  - Which write policy fits, and what is its durability tradeoff?
  - How do you size the working set so the hot data fits in memory?
  - How do you keep cache and source of truth in sync?
- **modelAnswerOutline:**
  - Cache-aside (lazy) is the common default: read cache, on miss load DB and populate.
  - Read-through / write-through / write-back trade durability and complexity.
  - TTL selection with jitter; eviction (LRU/LFU); size the working set to fit the hot data.
  - Cache hit ratio is the core metric; negative caching stops repeated misses on absent keys.
  - Keep cache and DB in sync via invalidate-on-write or short TTL backstop.
  - Common wrong turn: naming caching with no consistency/invalidation story.

#### sd-l3-cache-stampede-hotkey - Cache Stampede, Thundering Herd & Hot Keys

- **learnFocus:** Stopping a single popular key's expiry from taking the DB to 100% CPU.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** cache-stampede, hot-key, singleflight
- **applyPrompt:** A key served at 10k req/s backed by a 300ms query is about to expire; design so its expiry does not leak thousands of concurrent queries to the DB.
- **thinkAbout:**
  - How does request coalescing (singleflight) protect the DB?
  - How do jittered TTLs and early recompute prevent synchronized expiry?
  - How do you handle a genuinely hot key?
- **modelAnswerOutline:**
  - Request coalescing / singleflight so one rebuild serves all concurrent waiters.
  - Per-key mutex to serialize the recompute; probabilistic early expiration refreshes ahead of TTL.
  - TTL jitter avoids synchronized mass expiry of a key cohort.
  - Hot-key detection plus key replication across nodes or a client-side near cache.
  - Layer the defenses rather than relying on one; warm the cache after a flush.
  - Common wrong turn: a single TTL with no coalescing, so expiry stampedes the origin.

#### sd-l3-distributed-cache-arch - Distributed Cache Architecture

- **learnFocus:** How the cache tier itself scales and stays available.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** distributed-cache, redis, ha
- **applyPrompt:** Design a shared cache tier for a fleet of app servers needing sub-ms reads at 1M ops/sec with node failures tolerated.
- **thinkAbout:**
  - Redis vs Memcached: what do you gain from each?
  - How do you shard and replicate the cache for HA?
  - How do you keep cache and DB consistent, and treat the cache as disposable?
- **modelAnswerOutline:**
  - Redis (data structures, persistence, replication) vs Memcached (multithreaded LRU).
  - Shard via Redis Cluster hash slots; replicate + Sentinel for HA and failover.
  - Local/near cache (L1) + remote cache (L2) tiering to cut hops and hot keys.
  - Consistency: invalidate-on-write, versioned keys, short TTL backstop.
  - Handle memory pressure (eviction under maxmemory), big-key and hot-key hazards.
  - Common wrong turn: treating a cold cache flush as safe when it can overload the origin.

### Module sd-l3-m4: CDN, Search & Geo

Slug: `cdn-search-geo` | 4 lessons


#### sd-l3-cdn-scale - CDN & Edge Caching at Scale

- **learnFocus:** Moving bytes close to users and shielding a fragile origin.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** cdn, edge, origin-shield
- **applyPrompt:** Design content delivery for a media site serving images/video and semi-dynamic HTML to a global audience with a fragile origin.
- **thinkAbout:**
  - How does an origin shield coalesce fetches to protect the origin?
  - How do you invalidate: TTL, purge, or versioned URLs?
  - What dynamic content is cacheable, and what must never be cached?
- **modelAnswerOutline:**
  - Push vs pull CDNs; multi-tier hierarchy (L1 edge, L2 regional PoP, origin shield).
  - Origin shield coalesces misses so the origin sees ~thousands not millions of QPS on a burst.
  - Invalidation: TTL expiry, explicit purge, and versioned/hashed URLs (the production default).
  - Micro-caching and stale-while-revalidate for semi-dynamic content; normalize cache keys.
  - Edge compute for personalization/auth/A-B at the edge.
  - Common wrong turn: caching personalized/authenticated responses or ignoring cache-key normalization.

#### sd-l3-search-inverted-index - Full-Text Search & the Inverted Index

- **learnFocus:** Why a dedicated search tier exists and how it stays in sync with the source of truth.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** search, inverted-index, elasticsearch
- **applyPrompt:** Design search for an e-commerce catalog of 50M products with typo tolerance, filters, and relevance-ranked results.
- **thinkAbout:**
  - What is the analysis pipeline (tokenize, stem, synonyms) and inverted index?
  - How do you keep the index in sync with the DB?
  - Why is search not a system of record?
- **modelAnswerOutline:**
  - Inverted index: terms -> posting lists; analysis pipeline tokenizes, lowercases, stems, adds synonyms.
  - Elasticsearch/OpenSearch sharding: primary + replica shards, routing.
  - Relevance (BM25/TF-IDF), boosting, filters (cached bitsets) vs queries; faceting and highlighting.
  - Keep in sync via CDC/indexing pipeline (eventual consistency).
  - Search is a derived, rebuildable store, not a system of record; plan reindexing and mapping changes.
  - Common wrong turn: deep offset pagination; use search_after instead.

#### sd-l3-vector-hybrid-search - Vector, Semantic & Hybrid Search

- **learnFocus:** Semantic recall that keyword search cannot provide, fused with exact matching.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** vector-search, hybrid-search, rag
- **applyPrompt:** Design retrieval for a support/knowledge base that must match paraphrased questions plus exact error codes and version numbers.
- **thinkAbout:**
  - Why combine dense vectors with BM25, and how are the scores fused?
  - What does a retrieve-then-rerank pipeline add?
  - How do you handle freshness and metadata filtering?
- **modelAnswerOutline:**
  - Embeddings + ANN (HNSW/IVF) for semantic recall; recall/latency/memory tradeoffs.
  - Hybrid retrieval: BM25 for exact tokens (codes, IDs) + dense vectors for meaning.
  - Fuse with Reciprocal Rank Fusion (RRF) to combine incompatible score scales.
  - Two-stage retrieve-then-rerank (cross-encoder) for precision on the top-k.
  - Freshness, metadata pre/post-filtering, and re-embedding cost on model changes.
  - Common wrong turn: relying on raw vector similarity with no reranker or exact-match path.

#### sd-l3-geospatial-indexing - Geospatial Indexing: Geohash, Quadtree, S2 & H3

- **learnFocus:** Indexing points on a sphere so nearby and k-nearest-neighbor queries are fast, and handling precision, cell count, and hot cells.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** geospatial, indexing, data-modeling
- **applyPrompt:** Design the spatial index for a 'find drivers near me' query over millions of moving points, and justify a choice among geohash, quadtree, S2, and H3 for range and k-nearest-neighbor lookups.
- **thinkAbout:**
  - How do you turn a 2D nearest-neighbor query into a 1D or hierarchical key you can index and shard?
  - How does cell size trade recall (missing a nearby point) against cost (scanning too many points)?
  - What happens to a dense downtown cell, and how do you keep it from becoming a hotspot?
- **modelAnswerOutline:**
  - Assume millions of points, some static (restaurants) and some moving (drivers updating every few seconds), with 'within radius R' and 'nearest K' queries.
  - Geohash: interleaves latitude and longitude bits into a base-32 string so nearby points share a prefix, which stores easily in any B-tree or Redis and shards by prefix, but has boundary problems (neighbors can differ in prefix) so you query the cell plus its 8 neighbors.
  - Quadtree: recursively subdivides space so dense areas get finer cells and sparse areas stay coarse, adapting to non-uniform density, at the cost of a tree structure to maintain and rebalance.
  - S2 (Google) maps the sphere to cells along a Hilbert curve for good locality and true spherical geometry, while H3 (Uber) uses hexagonal cells with uniform neighbor distance, which is nicer for movement and coverage.
  - Precision versus cell count: finer cells mean fewer points per cell (cheaper scans) but more cells to enumerate for a radius query, so pick a resolution near your typical query radius and query a ring of neighbor cells to avoid boundary misses.
  - Hot-cell handling: a dense downtown cell becomes a hotspot, so subdivide adaptively (quadtree or a finer S2 level), cap points per cell, shard hot cells separately, and cache popular cell results.
  - Concrete choice: H3 or S2 for a rideshare-style system with moving points, storing cell id -> point set in Redis and refreshing moving points on a short TTL.
  - Common wrong turn: a naive SELECT with a bounding box or a full distance scan over all rows, which does not scale and ignores the geometry of the sphere.

### Module sd-l3-m5: Derived Data & Sync

Slug: `derived-data` | 2 lessons


#### sd-l3-denorm-fanout - Denormalization, Precomputation & Materialized Views

- **learnFocus:** Trading write cost and storage for cheap reads, including feed fan-out.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** fan-out, materialized-views, feed
- **applyPrompt:** Design a social timeline/feed choosing between fan-out-on-write and fan-out-on-read for a mix of normal and celebrity users.
- **thinkAbout:**
  - When does fan-out-on-write beat fan-out-on-read, and vice versa?
  - How does a hybrid handle celebrity accounts?
  - What is the write-amplification and consistency cost you now own?
- **modelAnswerOutline:**
  - Fan-out-on-write (precompute per-user feed) vs fan-out-on-read (query at read time).
  - Hybrid: precompute for most users, read-time merge for celebrity/whale accounts.
  - Materialized views and rollup tables for expensive counts and dashboards.
  - Approximate structures (HyperLogLog, Count-Min) where exactness is not needed.
  - Denormalization duplicates data: you own keeping copies consistent (write amplification).
  - Common wrong turn: pure fan-out-on-write for a celebrity, exploding write cost.

#### sd-l3-cdc-dual-write - Keeping Derived Stores in Sync (CDC & Outbox)

- **learnFocus:** The dual-write problem and the disciplined pipeline that keeps caches, search, and replicas from drifting.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** cdc, outbox, dual-write
- **applyPrompt:** Design how a write to the primary DB reliably updates a Redis cache and an Elasticsearch index without a dual-write race.
- **thinkAbout:**
  - Why can two independent writes partially fail and diverge?
  - How do the transactional outbox and log-based CDC fix it?
  - Why is at-least-once + idempotent consumers the realistic target?
- **modelAnswerOutline:**
  - Dual-write problem: two independent writes can partially fail and diverge.
  - Transactional outbox + relay so the event and the DB write commit atomically.
  - Log-based CDC (Debezium, Postgres logical decoding, MySQL binlog) is the change stream.
  - At-least-once delivery + idempotent/dedup consumers over exactly-once fantasies.
  - Backfills, replays, and snapshots for bootstrapping; monitor replication slots and lag.
  - Common wrong turn: dual-writing to DB + cache/search assuming they stay consistent.


---

## L4. Scaling Compute & Traffic

_Stateless scale-out, load balancing, gateways, rate limiting, autoscaling, and overload protection._

Slug: `scaling-compute` | Modules: 4 | Lessons: 14


### Module sd-l4-m1: Horizontal Scaling & Load Balancing

Slug: `horizontal-lb` | 5 lessons


#### sd-l4-horizontal-stateless - Horizontal vs Vertical Scaling & Stateless Services

- **learnFocus:** The precondition for all traffic scaling: you cannot load-balance servers that hold local state.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** horizontal-scaling, stateless
- **applyPrompt:** Design the scaling model for a web tier that currently keeps user sessions in server memory so it can grow from 1 to 500 nodes.
- **thinkAbout:**
  - What must you externalize to make nodes interchangeable?
  - When does scale-up still win over scale-out?
  - What is the cattle-not-pets model?
- **modelAnswerOutline:**
  - Vertical scaling hits a hardware/cost ceiling and is a single failure domain; scale out is the web-tier default.
  - Statelessness makes scale-out work: externalize session/state to Redis/DB/JWT so any node serves any request.
  - Scale-up still wins for hard-to-shard stateful tiers (single-writer DBs) until you shard.
  - Cattle-not-pets: nodes are interchangeable, disposable, provisioned from immutable images/IaC.
  - Know the cost/latency/failure-domain tradeoff and when a big-box monolith is right.
  - Common wrong turn: sticky in-memory sessions that pin state and lose it on node death.

#### sd-l4-lb-l4-l7 - Load Balancer Fundamentals: L4 vs L7

- **learnFocus:** Picking the routing layer; the wrong layer costs features or throughput.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** load-balancing, l4-l7
- **applyPrompt:** Choose and justify the load-balancing layers for a service handling both gRPC APIs and long-lived WebSocket connections.
- **thinkAbout:**
  - What does L4 give in throughput vs what L7 gives in routing features?
  - Why do real architectures stack L4 in front of L7?
  - How is the LB itself made highly available?
- **modelAnswerOutline:**
  - L4 (TCP/UDP): fast, high throughput, no payload inspection; good for raw/non-HTTP, WebSockets.
  - L7 (HTTP/gRPC): content/path/header routing, TLS termination, rate limiting, observability; higher latency.
  - Stack both: L4 at the edge fronting L7 behind it (NLB -> ALB, Maglev -> Envoy).
  - Software (HAProxy, Nginx, Envoy) vs cloud-managed (ALB/NLB, GCLB).
  - The LB must be HA (active-active, floating IP, anycast) or it is a SPOF.
  - Common wrong turn: forgetting an L7 LB is needed for path/header routing and TLS.

#### sd-l4-lb-algorithms - Load-Balancing Algorithms & Session Affinity

- **learnFocus:** How traffic spreads and how sticky routing works for cache-warm nodes.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** lb-algorithms, affinity
- **applyPrompt:** Pick a balancing algorithm for a fleet with highly variable request durations and explain how you keep a user pinned to a cache-warm node.
- **thinkAbout:**
  - Why does least-connections beat round robin for variable durations?
  - When is power-of-two-choices the practical large-pool default?
  - What is the downside of sticky sessions?
- **modelAnswerOutline:**
  - Round robin / weighted RR for homogeneous stateless nodes.
  - Least-connections / least-outstanding-requests for variable request durations.
  - Power-of-two-choices for large pools (avoids herd and O(N) least-conn scans).
  - Consistent/rendezvous hashing for sticky routing and minimal reshuffle on node change.
  - Session affinity via cookie/hash; downside is uneven load and lost state on node death.
  - Common wrong turn: sticky sessions everywhere causing hotspotting and lost sessions.

#### sd-l4-health-checks - Health Checks, Draining & Graceful Rollout

- **learnFocus:** Detecting dead nodes without evicting healthy ones during deploys.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** health-checks, draining, deploy
- **applyPrompt:** Design health checking and drain behavior so a rolling deploy of 50 nodes never drops in-flight requests or a long-lived stream.
- **thinkAbout:**
  - What is the difference between liveness and readiness?
  - How do connection draining and slow-start protect requests?
  - Why can a shallow 200 mask a broken dependency?
- **modelAnswerOutline:**
  - Active checks (probe) for fast detection vs passive checks (observe errors) for outlier ejection.
  - Liveness vs readiness: gate new nodes with readiness until warm.
  - Connection draining/graceful shutdown: stop new traffic, let in-flight finish before termination.
  - Slow-start / ramp so a cold node is not flooded on join.
  - Deep vs shallow checks: a shallow 200 can hide a broken downstream.
  - Common wrong turn: confusing liveness and readiness or shallow checks that pass while broken.

#### sd-l4-service-discovery - Service Discovery & Client vs Server-Side Load Balancing

- **learnFocus:** Letting services find healthy instances of a dynamic fleet, and choosing between client-side and server-side load balancing.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** service-discovery, load-balancing, microservices
- **applyPrompt:** Design service discovery for a microservice fleet that autoscales and redeploys constantly, and choose between client-side and server-side load balancing, justifying how unhealthy instances get removed.
- **thinkAbout:**
  - When instances come and go every minute, how does a caller learn the current set of healthy addresses?
  - Who makes the load-balancing decision: a central load balancer, or each client with a local view?
  - How fast does an unhealthy or terminated instance get pulled out of rotation?
- **modelAnswerOutline:**
  - Assume a fleet behind autoscaling where instance IP and port change constantly and stale routing causes errors.
  - Service registry: instances register on startup and heartbeat (Consul, etcd, Eureka), or the platform maintains it (Kubernetes Services and Endpoints/EndpointSlices), and deregister on shutdown or missed heartbeats.
  - Health-based removal: the registry marks instances unhealthy via active health checks or missed heartbeats and stops advertising them, combined with readiness probes so new instances only receive traffic once warm.
  - Server-side load balancing: clients hit one stable VIP or DNS name and a load balancer (AWS ALB/NLB, Envoy, Nginx) picks a backend, which keeps clients simple and control central but adds a hop and a component to scale.
  - Client-side load balancing: clients fetch the healthy instance list from the registry (or via a mesh sidecar) and pick a backend locally (gRPC client LB, a sidecar Envoy), which removes a hop and enables smart policies (locality, least-request) but pushes complexity into every client and needs fast registry propagation.
  - A service mesh (Istio or Linkerd with Envoy sidecars) gives client-side benefits with central config and mTLS, at the cost of operational complexity.
  - Concrete choice: Kubernetes with a mesh, or gRPC client-side LB backed by etcd, with short health-check intervals so bad instances leave rotation within seconds.
  - Common wrong turn: hardcoding instance IPs or relying on long-TTL DNS, so terminated instances keep receiving traffic and callers see errors.

### Module sd-l4-m2: Global Traffic & Gateway

Slug: `global-gateway` | 3 lessons


#### sd-l4-global-gslb - Global & DNS-Level Load Balancing (GSLB, Anycast)

- **learnFocus:** Steering global users to the nearest healthy region and failing a region out fast.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** gslb, anycast, multi-region
- **applyPrompt:** Design how a global user is routed to the nearest healthy region and how you fail an entire region out in under a minute.
- **thinkAbout:**
  - How do GeoDNS and anycast differ for steering?
  - Why does client DNS caching limit failover speed?
  - Active-active vs active-passive: how do you drain a region?
- **modelAnswerOutline:**
  - DNS-based GSLB with geo/latency routing, weighted records, health-checked failover.
  - Anycast IP + BGP routes to the nearest PoP; ECMP spreads equal-cost paths.
  - Maglev-style consistent hashing keeps connections stable across changes.
  - Client DNS caching and TTLs limit failover speed; edge/CDN termination offloads before origin.
  - Active-active vs active-passive; drain/shift traffic during regional failover.
  - Common wrong turn: assuming DNS failover is instant despite resolver caching.

#### sd-l4-api-gateway-bff - API Gateway & Backend-for-Frontend

- **learnFocus:** Centralizing cross-cutting concerns so services stay thin.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** gateway, bff
- **applyPrompt:** Design an API gateway layer for a microservices product with web, mobile, and partner API clients.
- **thinkAbout:**
  - What belongs at the gateway vs inside services vs the mesh?
  - When is a BFF the right pattern?
  - How do you keep the gateway from becoming a god-object?
- **modelAnswerOutline:**
  - Gateway centralizes auth/authz, TLS, rate limiting, routing, transformation, aggregation, observability.
  - Edge/API gateway (north-south) vs internal service mesh (east-west).
  - BFF per client type avoids over/under-fetching and coupling.
  - Gateway is a SPOF and latency tax; keep it HA, cached, and thin.
  - Versioning, canary routing, and contract enforcement at the edge.
  - Common wrong turn: the gateway becoming a distributed monolith of business logic.

#### sd-l4-tls-connection-mgmt - TLS Termination & Connection Management

- **learnFocus:** Where you terminate encryption and how you keep backend connection counts sane.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** tls, connection-management
- **applyPrompt:** Decide where to terminate TLS for an API platform and how to keep backend connection counts sane at 100k concurrent clients.
- **thinkAbout:**
  - What is the tradeoff of edge TLS termination vs end-to-end/mTLS?
  - Why do long-lived multiplexed gRPC/WebSocket connections defeat L7 balancing?
  - How do pooling and keep-alive avoid port exhaustion?
- **modelAnswerOutline:**
  - TLS termination at LB/edge offloads crypto; end-to-end/mTLS re-encrypts to backend.
  - Connection pooling/keep-alive avoids handshake and ephemeral-port exhaustion.
  - HTTP/2 and gRPC multiplexing: long-lived connections pin to one backend (the L7 rebalancing problem).
  - SNI-based routing and certificate rotation at scale.
  - Handle C10k/C10M with event-driven proxies and OS tuning.
  - Common wrong turn: terminating H2/gRPC at an L7 LB and finding streams pinned to one backend.

### Module sd-l4-m3: Rate Limiting & Overload

Slug: `rate-limiting-overload` | 3 lessons


#### sd-l4-rate-limit-algorithms - Rate Limiting Algorithms

- **learnFocus:** The top canonical control: burst-friendly vs smooth, and the response contract.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** rate-limiting, token-bucket
- **applyPrompt:** Write the algorithm for an API rate limiter that allows short bursts but enforces a steady long-run rate, and state the counters it stores per user.
- **thinkAbout:**
  - Which algorithm allows bursts vs smooths output?
  - What is the fixed-window boundary-spike bug?
  - What is the client-facing response contract?
- **modelAnswerOutline:**
  - Token bucket (burst-friendly, refill rate) is the usual default; leaky bucket smooths outflow.
  - Fixed window is cheap but has a boundary spike; sliding-window log is accurate but memory-heavy.
  - Sliding-window counter is the practical compromise.
  - Choose the key/dimension: per-user, per-IP, per-API-key, per-endpoint, global.
  - Return 429 + Retry-After + standard RateLimit headers; decide fail-open vs fail-closed.
  - Common wrong turn: fixed window that lets 2x burst across the window boundary.

#### sd-l4-distributed-rate-limiting - Distributed Rate Limiting

- **learnFocus:** Enforcing a global limit across N gateway nodes without letting a user get Nx.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** rate-limiting, distributed, redis
- **applyPrompt:** Extend a single-node rate limiter to a fleet of 20 gateway nodes without letting a user get 20x their limit.
- **thinkAbout:**
  - How do you keep the shared counter atomic under races?
  - What is the tradeoff of local approximation vs centralized exactness?
  - What happens if the shared store (Redis) is down?
- **modelAnswerOutline:**
  - Shared counter store (Redis) with atomic INCR or Lua scripts for token-bucket state.
  - Local-per-node approximation (budget/N) vs centralized exact vs hybrid with local cache + async sync.
  - Avoid read-modify-write races; use atomic ops/CAS.
  - Redis is a hot dependency (latency tax, hot-key sharding); decide fail-open if it is down.
  - Handle clock skew and window alignment across nodes.
  - Common wrong turn: naive per-node limits that grant a client Nx the intended limit.

#### sd-l4-load-shedding-backpressure - Load Shedding, Adaptive Concurrency & Backpressure

- **learnFocus:** Dropping the right requests under overload so the system stays alive.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** load-shedding, backpressure, concurrency
- **applyPrompt:** Design overload protection so that at 150% of capacity the service stays up and still serves its most important traffic.
- **thinkAbout:**
  - How do you shed the right traffic first?
  - Why are adaptive concurrency limits better than static thresholds?
  - How do bounded queues and deadline propagation prevent collapse?
- **modelAnswerOutline:**
  - Shed load before collapse: reject/queue-cap early rather than let latency and queues explode.
  - Priority-aware shedding: drop low-priority/retryable traffic first; protect critical paths.
  - Adaptive concurrency limits (Little's Law, TCP-Vegas style) instead of static thresholds.
  - Backpressure with bounded queues that reject when full; drop stale/timed-out requests.
  - Brownout/graceful degradation: shed features, serve cached/partial responses.
  - Common wrong turn: unbounded queues that hide overload until OOM.

### Module sd-l4-m4: Autoscaling & Isolation

Slug: `autoscaling-isolation` | 3 lessons


#### sd-l4-autoscaling - Autoscaling: Reactive, Event-Driven & Predictive

- **learnFocus:** Matching capacity to demand for cost and SLOs, and hiding scaling lag.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** autoscaling, keda, capacity
- **applyPrompt:** Design autoscaling for a service with a sharp 10x traffic spike every day at 9am and unpredictable bursts otherwise.
- **thinkAbout:**
  - Which signal (CPU vs queue depth vs RPS) should trigger scaling?
  - Why does reactive scaling always trail a fast burst?
  - How do warm pools and scheduled pre-scaling help?
- **modelAnswerOutline:**
  - Horizontal autoscaling on CPU/mem vs custom/business metrics (RPS, p99, queue depth).
  - Event-driven scaling (KEDA) on queue lag reacts before utilization spikes.
  - Cluster/node autoscaler adds machines; VPA right-sizes requests.
  - Predictive/scheduled pre-scaling for the known 9am spike; warm pools hide cold starts.
  - Scaling lag (scrape + decide + boot + warm) means reactive scaling trails bursts; keep headroom.
  - Common wrong turn: claiming autoscaling solves spikes while ignoring scaling lag.

#### sd-l4-capacity-planning - Capacity Planning & Back-of-Envelope Sizing

- **learnFocus:** Justifying node counts, headroom, and redundancy with numbers.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** capacity, sizing, littles-law
- **applyPrompt:** Size the fleet for a service that must serve 50k RPS at p99 < 200ms and survive one AZ failure.
- **thinkAbout:**
  - How does Little's Law convert RPS and latency into instance count?
  - What utilization target leaves headroom for spikes and failover?
  - How does N+1/N+2 AZ math change the count?
- **modelAnswerOutline:**
  - Estimate RPS from DAU x actions x peak; concurrency = RPS x latency (Little's Law).
  - Convert to instances via per-node throughput; target ~50-70% utilization for headroom.
  - N+1 / N+2 redundancy and AZ math so losing a zone stays above capacity.
  - Peak-to-average ratio and burst multipliers set autoscaling bounds.
  - Cost mix: reserved/spot/on-demand; know queues explode near 100% utilization.
  - Common wrong turn: running near 100% utilization with no headroom for failover or GC pauses.

#### sd-l4-cell-shuffle-sharding - Cell-Based Architecture & Shuffle Sharding

- **learnFocus:** Bounding the blast radius of any single failure or noisy tenant.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** cells, shuffle-sharding, blast-radius
- **applyPrompt:** Partition a multi-tenant service into cells so one tenant's traffic surge or a bad deploy cannot take down all tenants.
- **thinkAbout:**
  - What is a cell, and how does it contain failure?
  - How does shuffle sharding minimize tenant overlap?
  - What are the tradeoffs (capacity fragmentation, cross-cell ops)?
- **modelAnswerOutline:**
  - A cell is a self-contained slice (services + stores + LB) serving a subset of users.
  - A thin, highly-available cell router maps tenants to cells.
  - Shuffle sharding assigns each tenant a random subset of workers so overlap is tiny.
  - Blast-radius/fault-domain isolation and noisy-neighbor containment are the core benefit.
  - Per-cell deploy/canary limits bad-release impact.
  - Common wrong turn: global-only design where one bad tenant or deploy takes down everyone.


---

## L5. Distributed Systems Core

_CAP/PACELC, consistency, clocks, consensus, distributed transactions, and failure handling._

Slug: `distributed-core` | Modules: 5 | Lessons: 18


### Module sd-l5-m1: Failure Models & CAP

Slug: `failure-cap` | 3 lessons


#### sd-l5-partial-failure - Partial Failure & the Fallacies of Distributed Computing

- **learnFocus:** Why every distributed decision descends from independent failure and the ambiguity of a timeout.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** fallacies, partial-failure
- **applyPrompt:** Write a failure-mode analysis for a service A calling service B over the network: enumerate every outcome A can observe and how A should react to each.
- **thinkAbout:**
  - Why can A not distinguish a lost request from a slow or dead peer?
  - Which fallacies of distributed computing bite here?
  - What must every call handle: retries, reordering, duplication, stale reads?
- **modelAnswerOutline:**
  - Partial failure: some nodes/links fail while others run; there is no global off switch.
  - A timeout is ambiguous: request lost, response lost, or peer slow/dead, indistinguishable.
  - Fallacies: network is reliable, latency zero, bandwidth infinite, topology static, transport free.
  - Real systems assume partial synchrony; unbounded delay + clock drift cause most impossibility results.
  - Design implication: handle retries, reordering, duplication, and stale reads everywhere.
  - Common wrong turn: treating a timeout as a definite failure and double-applying a side effect.

#### sd-l5-cap-correct - CAP Theorem (Correct Framing)

- **learnFocus:** The most-misunderstood result: a choice only during a partition, not a permanent pick-2-of-3.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** cap, consistency, partition
- **applyPrompt:** Given a globally-replicated shopping cart, decide CP vs AP behavior during a cross-region partition and justify the user-visible consequence of each choice.
- **thinkAbout:**
  - Why is CA not a real operating point?
  - What exactly do C and A mean in CAP?
  - Why are most systems tunable/mixed rather than globally CP or AP?
- **modelAnswerOutline:**
  - CAP is a choice only DURING a partition: sacrifice C or A, not a permanent pick-2-of-3.
  - CA is not a real operating point; partitions happen so P is non-negotiable.
  - Consistency here means linearizability; availability means every non-failing node answers.
  - Most systems are tunable/mixed, per-operation or per-key, not globally CP or AP.
  - For the cart: AP (accept writes, reconcile) vs CP (reject writes in minority) with concrete consequences.
  - Common wrong turn: calling a single-node database 'CA' or stating CAP as permanent pick-2-of-3.

#### sd-l5-pacelc - PACELC & the Steady-State Tradeoff

- **learnFocus:** The latency-vs-consistency tax you pay on every request, not just during rare partitions.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** pacelc, consistency, latency
- **applyPrompt:** Classify DynamoDB, Cassandra, Spanner, and CockroachDB on the PACELC spectrum and explain what each choice costs a request in the no-partition case.
- **thinkAbout:**
  - What does the else-case (no partition) tradeoff cost per request?
  - Why do linearizable reads need a leader round-trip or read quorum?
  - How is consistency often per-operation tunable?
- **modelAnswerOutline:**
  - Else-case: even with no partition, strong consistency costs latency (quorum/leader round-trips).
  - PA/EL (Dynamo, Cassandra), PC/EC (Spanner, CockroachDB), PA/EC (some tunable stores).
  - Linearizable reads need a leader round-trip or read-quorum, adding tail latency.
  - Consistency is often per-operation tunable (Cassandra ONE vs QUORUM vs ALL).
  - Ties latency budgets to consistency SLOs as a concrete lever.
  - Common wrong turn: reasoning only about partitions and ignoring the steady-state latency tax.

### Module sd-l5-m2: Consistency & Time

Slug: `consistency-time` | 4 lessons


#### sd-l5-consistency-spectrum - Consistency Models Spectrum

- **learnFocus:** Placing a system precisely from linearizable to eventual and knowing the coordination cost.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** consistency-models, linearizability
- **applyPrompt:** Design the read path for a bank balance vs a social like-count and pick the weakest consistency model that is still correct for each, justifying the choice.
- **thinkAbout:**
  - What separates linearizable, sequential, causal, and eventual?
  - Why is causal the strongest model available under partition?
  - Why is replication consistency a different axis from ACID isolation?
- **modelAnswerOutline:**
  - Linearizability (single-copy, real-time order) vs sequential vs causal vs eventual.
  - Linearizable enables uniqueness/locks but costs coordination; eventual is cheapest but exposes stale reads.
  - Causal consistency is the strongest achievable while staying available under partition.
  - Cost ladder: stronger models need more coordination (quorums, leaders, waiting).
  - Do not conflate replication consistency with ACID isolation levels; they are different axes.
  - Common wrong turn: treating consistency as binary instead of naming the specific model.

#### sd-l5-session-guarantees - Client-Centric Session Guarantees

- **learnFocus:** The four guarantees that fix most user-facing consistency bugs.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** session-guarantees, consistency
- **applyPrompt:** Add read-your-writes and monotonic-reads guarantees to a read-replica architecture where a user writes to the primary and reads from lagging replicas.
- **thinkAbout:**
  - Which guarantee does each user-visible symptom violate?
  - How do sticky routing and version tokens implement them?
  - Where do cross-device cases break sticky sessions?
- **modelAnswerOutline:**
  - The four: read-your-writes, monotonic reads, monotonic writes, writes-follow-reads.
  - Replication lag breaks each with a specific symptom.
  - Implement via sticky routing to leader after a write or version/timestamp tokens.
  - Weaker than linearizability but often exactly what the product needs.
  - Cross-device cases need tokens because sticky sessions are insufficient.
  - Common wrong turn: promising read-your-writes off async replicas with no routing or token.

#### sd-l5-logical-clocks - Logical Time: Lamport & Vector Clocks

- **learnFocus:** Ordering events without a shared clock, and detecting concurrent conflicting writes.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** logical-clocks, vector-clocks, causality
- **applyPrompt:** Use vector clocks to detect concurrent conflicting writes in a leaderless key-value store and specify how the read path surfaces siblings.
- **thinkAbout:**
  - Why can Lamport clocks give a total order but not detect concurrency?
  - What do vector clocks capture that Lamport clocks cannot?
  - What is the O(N) cost and GC problem of vector clocks?
- **modelAnswerOutline:**
  - Happens-before relation; Lamport clocks give a total order but cannot detect concurrency.
  - Vector clocks capture causality and detect concurrent (conflicting) updates; cost is O(N) size.
  - Version vectors (per-replica) vs vector clocks; Dynamo surfaces conflict siblings to the read path.
  - Lamport a<b does not imply a caused b.
  - Actor churn makes vector clocks unbounded in practice (GC problem).
  - Common wrong turn: using Lamport total order and claiming it proves causality.

#### sd-l5-physical-time-hlc - Physical Time, Clock Uncertainty, HLC & TrueTime

- **learnFocus:** Why timestamp ordering corrupts data under drift and how modern DBs solve it.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** hlc, truetime, clocks
- **applyPrompt:** Design correct timestamp ordering for a multi-region database where node clocks can drift, choosing between HLC and a TrueTime-style bounded-uncertainty approach.
- **thinkAbout:**
  - Why does last-writer-wins on wall-clock timestamps lose data?
  - How do Hybrid Logical Clocks preserve causality near NTP time?
  - What does TrueTime's commit-wait buy, and at what infra cost?
- **modelAnswerOutline:**
  - NTP/PTP drift is real (tens of ms); LWW on wall-clock timestamps loses data and is not causal.
  - Hybrid Logical Clocks (physical + logical) stay close to NTP but preserve causality (CockroachDB, Mongo).
  - Google TrueTime uses GPS+atomic clocks for an uncertainty interval; Spanner commit-wait waits out epsilon.
  - Clock skew is a correctness input, not just a monitoring metric.
  - HLC needs no special hardware; TrueTime buys tighter bounds at infra cost.
  - Common wrong turn: LWW on wall-clock timestamps silently dropping writes under skew.

### Module sd-l5-m3: Consensus & Coordination

Slug: `consensus` | 3 lessons


#### sd-l5-smr-total-order - State-Machine Replication & Total-Order Broadcast

- **learnFocus:** Recognizing that 'all replicas apply the same ops in the same order' IS consensus.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** smr, total-order-broadcast
- **applyPrompt:** Design a replicated state machine for a key-value store and explain why an ordered replicated log is the core primitive.
- **thinkAbout:**
  - Why do deterministic, ordered ops give identical replicas?
  - Why is atomic broadcast equivalent to consensus?
  - How do snapshots bound log growth?
- **modelAnswerOutline:**
  - State-machine replication: deterministic apply of an agreed ordered log gives identical replicas.
  - Atomic/total-order broadcast is equivalent in power to consensus.
  - Idempotent, deterministic state transitions are a precondition.
  - Log compaction/snapshots bound log growth.
  - This is the model beneath Raft, Kafka, etcd, and most consensus systems.
  - Common wrong turn: non-deterministic apply that diverges replicas despite the same log.

#### sd-l5-raft-paxos - Consensus in Depth: Raft (and the Paxos Family)

- **learnFocus:** The industry-default coordination primitive: election, log replication, and safety.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** raft, paxos, consensus
- **applyPrompt:** Walk through how Raft keeps a 5-node cluster consistent across a leader crash: cover election, log replication, and what happens to an uncommitted entry.
- **thinkAbout:**
  - How does randomized-timeout election avoid split votes?
  - What is the commit rule, and why do majority quorums guarantee overlap?
  - How does a minority partition behave, and why is an even cluster wasteful?
- **modelAnswerOutline:**
  - Leader election via randomized timeouts + terms; only up-to-date logs can win.
  - An entry commits once replicated to a majority; majority quorums guarantee overlap.
  - Safety: election safety, leader append-only, log matching, leader completeness.
  - Minority partition: old leader steps down and cannot commit; membership via joint consensus.
  - Paxos underpins Spanner/Chubby; Raft constrains leader eligibility for understandability; FLP solved via partial synchrony.
  - Common wrong turn: an even-sized cluster (2/4 nodes) that wastes a node or deadlocks with no majority.

#### sd-l5-quorums-tunable - Quorums & Dynamo-Style Tunable Consistency

- **learnFocus:** R+W>N as the concrete dial mapping to durability, consistency, and latency.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** quorums, tunable-consistency, dynamo
- **applyPrompt:** Choose N/R/W for a session store that must survive one AZ loss and still serve fast reads, and state the consistency you actually get.
- **thinkAbout:**
  - What does R+W>N guarantee, and what does it NOT guarantee?
  - Why is quorum latency bounded by the slowest node?
  - How do sloppy quorum and hinted handoff trade consistency for availability?
- **modelAnswerOutline:**
  - N replicas, W write acks, R read responses; R+W>N gives read/write overlap.
  - Quorum intersection is why majorities work; it does not give linearizability (no real-time order).
  - Sloppy quorum + hinted handoff trade consistency for availability.
  - Latency is bounded by the slowest node in the quorum (tail amplification).
  - Flexible quorums / witness replicas cut cost while keeping fault tolerance.
  - Common wrong turn: assuming R+W>N gives linearizability.

### Module sd-l5-m4: Distributed Transactions

Slug: `distributed-transactions` | 4 lessons


#### sd-l5-2pc-3pc - Distributed Transactions: 2PC / 3PC & Their Limits

- **learnFocus:** The baseline every alternative is defined against, and why it blocks at scale.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** 2pc, distributed-transactions
- **applyPrompt:** Design an atomic transfer across two independently-owned services and explain why classic 2PC is a poor fit, including the exact failure that blocks it.
- **thinkAbout:**
  - What blocks participants when the coordinator crashes after prepare?
  - Why is holding locks across the protocol a throughput killer?
  - How do modern systems harden the coordinator?
- **modelAnswerOutline:**
  - 2PC phases: prepare/vote then commit/abort via a coordinator; guarantees atomicity.
  - Blocking problem: coordinator crash after prepare leaves participants holding locks indefinitely.
  - Participants hold locks across the whole protocol, killing throughput at scale.
  - 3PC reduces blocking but fails under partitions and is rarely used.
  - Modern hardening: replicate the coordinator via Raft/Paxos (Spanner, CockroachDB); XA acceptable within one cluster.
  - Common wrong turn: proposing 2PC across microservices without addressing coordinator-crash blocking.

#### sd-l5-sagas - Sagas: Orchestration vs Choreography & Compensation

- **learnFocus:** The default for cross-service business transactions, and its missing isolation.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** saga, compensation, orchestration
- **applyPrompt:** Design an order-checkout saga (reserve inventory, charge payment, book shipping) with compensations and specify behavior when payment fails after inventory is reserved.
- **thinkAbout:**
  - What does a saga give (atomicity of outcome) and NOT give (isolation)?
  - Orchestration vs choreography: which do you pick and why?
  - How do you handle non-idempotent or failing compensations?
- **modelAnswerOutline:**
  - A saga is a sequence of local transactions, each with a compensating action to undo prior steps.
  - Orchestration (central coordinator, easy to reason) vs choreography (event-driven, decoupled, hard to trace).
  - Sagas give atomicity of outcome but NOT isolation: intermediate states are visible.
  - Countermeasures: semantic locks, commutative updates, reread/version checks.
  - Compensations must be idempotent and may fail (retries, DLQ, human intervention); use Temporal/Step Functions.
  - Common wrong turn: ignoring the missing isolation and non-reversible steps.

#### sd-l5-outbox-messaging - Transactional Messaging: Outbox, Inbox & CDC

- **learnFocus:** The standard fix for the dual-write problem of updating the DB and publishing an event atomically.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** outbox, cdc, messaging
- **applyPrompt:** Guarantee that an order-created event is published if and only if the order row commits, without a distributed transaction between the DB and the broker.
- **thinkAbout:**
  - Why is writing to the DB then to Kafka not atomic?
  - How does the outbox table make it atomic?
  - Why is at-least-once + idempotent consumers the realistic end-to-end guarantee?
- **modelAnswerOutline:**
  - Dual-write problem: DB write then Kafka publish is not atomic; a crash loses or fabricates events.
  - Outbox: write the event to an outbox table in the same local transaction; a relay publishes it.
  - Relay via polling or CDC (Debezium reading the WAL); trade latency vs efficiency.
  - Inbox/dedup table on the consumer for idempotent, effectively-once processing.
  - At-least-once delivery + idempotent consumers = effectively-once end-to-end.
  - Common wrong turn: publishing the event and committing the DB as if that were atomic.

#### sd-l5-delivery-idempotency - Delivery Semantics, Idempotency & Exactly-Once Reality

- **learnFocus:** Why exactly-once is achieved via at-least-once + idempotency, not a network guarantee.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** delivery-semantics, idempotency, exactly-once
- **applyPrompt:** Make a payment-charge API safe to retry so a client that times out and retries never double-charges.
- **thinkAbout:**
  - Why is true network exactly-once impossible?
  - How do idempotency keys with a stored result achieve effectively-once?
  - What do fencing tokens protect against?
- **modelAnswerOutline:**
  - At-most-once vs at-least-once vs effectively-once; true network exactly-once is impossible.
  - Idempotency keys / request dedup with a stored result and TTL.
  - Idempotent ops (set x=5) vs non-idempotent (increment) and how to make the latter safe.
  - Kafka exactly-once is scoped to the pipeline, not external side effects.
  - Fencing tokens reject stale/delayed operations.
  - Common wrong turn: claiming exactly-once delivery as a network guarantee.

### Module sd-l5-m5: Membership & Failure Handling

Slug: `membership-failure` | 4 lessons


#### sd-l5-crdts - CRDTs, Strong Eventual Consistency & Anti-Entropy

- **learnFocus:** The modern AP answer for collaborative/offline-first systems, plus how replicas converge.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** crdt, anti-entropy, gossip
- **applyPrompt:** Design the merge logic for a collaboratively-edited counter and set that converge with no coordination under concurrent offline edits, and the background mechanism that reconciles missed writes.
- **thinkAbout:**
  - What operation properties make CRDTs converge without conflict resolution?
  - What do CRDTs cost (metadata, tombstones), and where can they not help?
  - How do gossip and Merkle trees reconcile divergent replicas cheaply?
- **modelAnswerOutline:**
  - Strong Eventual Consistency: replicas that received the same updates are identical, no conflict resolution.
  - Operations must be commutative, associative, idempotent; types: G/PN-Counter, OR-Set, LWW-Register, RGA.
  - Costs: metadata/tombstone growth and GC; LWW still loses concurrent writes.
  - CRDTs cannot enforce global invariants (uniqueness, no-overdraft).
  - Anti-entropy: gossip for dissemination, Merkle trees to find divergent ranges, read repair and hinted handoff.
  - Common wrong turn: forgetting anti-entropy so replicas never converge after a partition.

#### sd-l5-failure-detection - Failure Detection: Heartbeats, Phi-Accrual & SWIM

- **learnFocus:** Detecting real crashes fast without falsely evicting nodes during latency spikes.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** failure-detection, swim, gossip
- **applyPrompt:** Design failure detection for a 500-node cluster that detects real crashes within a few seconds without falsely evicting nodes during latency spikes.
- **thinkAbout:**
  - Why is the completeness-vs-accuracy tradeoff fundamental?
  - How does phi-accrual adapt to the inter-arrival distribution?
  - Why does SWIM scale where all-to-all heartbeats do not?
- **modelAnswerOutline:**
  - Fixed-timeout heartbeats vs adaptive phi-accrual (suspicion level from inter-arrival distribution).
  - Completeness vs accuracy: aggressive timeouts flap, conservative ones detect slowly.
  - SWIM: randomized direct + indirect probes + infection-style dissemination = O(1) load per node.
  - Gossip-based membership (SWIM/memberlist) scales past all-to-all heartbeats.
  - A suspicion mechanism reduces false positives before declaring dead.
  - Common wrong turn: tuning timeouts as if a slow node were reliably distinguishable from a dead one.

#### sd-l5-leader-election-fencing - Leader Election, Leases, Fencing & Split-Brain

- **learnFocus:** Preventing two active leaders and stale lock holders from corrupting shared state.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** leader-election, fencing, split-brain
- **applyPrompt:** Design a single-active-primary system so that when the primary is wrongly suspected and a new one is elected, the old primary cannot corrupt shared state, and specify behavior on a 3-2 partition.
- **thinkAbout:**
  - How can a GC pause make a live leader look dead and cause two leaders?
  - What do fencing tokens do that leases alone cannot?
  - How does a 5-node cluster behave when split 3-2?
- **modelAnswerOutline:**
  - Leader election via consensus (etcd/ZooKeeper) or lease; leases assume bounded clocks.
  - A GC pause or delay can make a live leader look dead: two leaders can briefly coexist.
  - Fencing tokens: monotonic numbers that storage rejects if stale, neutralizing a paused old leader.
  - Distributed locks are unsafe without fencing (the Redlock critique).
  - On a 3-2 split: the majority side stays writable (CP) or both accept and reconcile (AP); fence the minority.
  - Common wrong turn: a distributed lock with no fencing token, so a paused holder corrupts state.

#### sd-l5-byzantine-fault-tolerance - Byzantine Fault Tolerance & BFT Consensus

- **learnFocus:** Distinguishing crash-stop from Byzantine failures and knowing when BFT consensus (3f+1) is worth its cost.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** consensus, distributed-systems, fault-tolerance
- **applyPrompt:** Explain how you would decide whether a system needs Byzantine fault tolerance, contrast the crash-stop and Byzantine failure models, and describe how BFT consensus tolerates malicious nodes.
- **thinkAbout:**
  - What can a Byzantine node do that a crash-stopped node cannot?
  - Why does BFT need 3f+1 nodes where crash-tolerant consensus needs only 2f+1?
  - When is BFT justified, and when is it expensive over-engineering?
- **modelAnswerOutline:**
  - Assume a replicated state machine that must agree on an ordered log of operations across mutually distrusting or potentially compromised participants.
  - Crash-stop model: nodes either follow the protocol or halt, and Raft or Paxos tolerate f crash failures with 2f+1 nodes (a majority quorum) while assuming nodes never lie.
  - Byzantine model: a faulty node can lie, equivocate (send different messages to different peers), or collude, so you must tolerate arbitrary behavior, not just silence.
  - BFT quorum math: to tolerate f Byzantine nodes you need 3f+1 total and quorums of 2f+1, so honest nodes always outvote and overlap despite f liars, which is why BFT costs more nodes and more messages (often O(n^2)) than crash consensus.
  - Protocols: PBFT (classic, with a view-change when the leader is faulty), Tendermint, and HotStuff (used in blockchains, with HotStuff giving linear message complexity and pipelining).
  - When BFT is needed: cross-organization or adversarial trust boundaries (public blockchains, some financial settlement, hardware fault domains where corruption is undetectable).
  - When it is overkill: nodes inside one trusted datacenter under one operator, where crash-stop consensus (Raft) plus checksums, TLS, and authentication is far cheaper and sufficient.
  - Common wrong turn: reaching for BFT or a blockchain inside a single trusted org where Raft would do, paying huge latency and throughput cost for a threat you do not actually face.


---

## L6. Asynchronous & Event-Driven Systems

_Queues and logs, Kafka internals, delivery guarantees, stream processing, and event sourcing/CQRS._

Slug: `event-driven` | Modules: 5 | Lessons: 15


### Module sd-l6-m1: Messaging Foundations

Slug: `messaging-foundations` | 3 lessons


#### sd-l6-sync-vs-async - Sync vs Async & When to Go Event-Driven

- **learnFocus:** Choosing async to decouple, absorb spikes, and scale independently, at the cost of eventual consistency.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** async, event-driven, checkout
- **applyPrompt:** Design the checkout flow for an e-commerce site: decide which steps stay synchronous (payment auth) and which become async events (inventory, email, analytics), and justify each boundary.
- **thinkAbout:**
  - What are the three decouplings async buys (time, space, synchronization)?
  - Which steps need synchronous consistency, and which tolerate eventual?
  - How does the failure mode shift from sync errors to background retries/DLQ?
- **modelAnswerOutline:**
  - Async decouples in time (buffering), space (location), and synchronization (non-blocking).
  - Async trades immediate consistency for availability/throughput; design for eventual consistency.
  - Command (do this) vs event (this happened) semantics drive coupling direction.
  - Keep payment auth synchronous; make inventory, email, analytics async events.
  - Failure shifts from synchronous errors to background failures needing retries, DLQs, monitoring.
  - Common wrong turn: adding a broker for simple CRUD that needs strong-consistency reads.

#### sd-l6-queue-pubsub-log - Queue vs Pub/Sub vs Log/Streaming

- **learnFocus:** Three models with different fan-out, retention, and replay semantics.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** messaging-models, kafka, queue
- **applyPrompt:** Design the messaging backbone for an order system that needs (a) exactly one worker per order, (b) multiple independent subscribers to 'order placed', and (c) 30-day replay for a new analytics team; map each to a model.
- **thinkAbout:**
  - How does retention differ between a queue and a log?
  - Why does a log support many independent consumer groups and replay?
  - What is the difference between broker-tracked delivery and consumer-driven offsets?
- **modelAnswerOutline:**
  - Point-to-point queue (SQS/RabbitMQ): competing consumers, message removed on ack, work distribution.
  - Pub/sub (SNS, fan-out): each subscriber gets its own copy; topic-based routing.
  - Log/stream (Kafka, Kinesis, Pulsar): durable ordered append-only log, offset consumption, replayable.
  - Queues delete on consume; logs retain by time/size and support replay/reprocessing.
  - Consumer-driven offsets (pull, log) vs broker-tracked delivery (push, queue).
  - Common wrong turn: using a queue where 30-day replay by multiple consumers requires a log.

#### sd-l6-broker-selection - Broker Technology Selection

- **learnFocus:** Justifying Kafka vs a queue vs a cloud service instead of reaching for Kafka reflexively.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** broker-selection, kafka, rabbitmq
- **applyPrompt:** For three workloads (a task queue for image resizing, a 30-day-replayable analytics stream, and simple decoupled microservice notifications) recommend a specific broker for each and defend the choices.
- **thinkAbout:**
  - What decision drivers separate a log from a queue?
  - When is a managed service (SQS/SNS/Pub/Sub) the right call?
  - What do Pulsar's compute/storage separation and tiered storage add?
- **modelAnswerOutline:**
  - Kafka/Pulsar/Kinesis (log, high throughput, replay, ordering) vs RabbitMQ/SQS (queue, per-message ack, routing, DLQ).
  - SNS/Google Pub/Sub for managed fan-out; SQS FIFO for ordered managed queues.
  - Pulsar: compute/storage separation, multi-tenancy, geo-replication, tiered storage.
  - NATS/Redis Streams for lightweight/low-latency.
  - Drivers: throughput, ordering, retention/replay, delivery guarantee, routing complexity, ops budget.
  - Common wrong turn: reaching for Kafka when SQS/RabbitMQ (or no broker) is the right tool.

### Module sd-l6-m2: Kafka & the Log

Slug: `kafka-log` | 4 lessons


#### sd-l6-kafka-internals - Kafka Architecture Internals

- **learnFocus:** The log, partitions, replication, and ISR that explain throughput, ordering, and durability.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** kafka, isr, durability
- **applyPrompt:** Design a Kafka topic layout for a ride-hailing event stream at 500k events/sec: choose partition count, replication factor, and key, and explain the durability/latency tradeoffs of your acks and min.insync.replicas settings.
- **thinkAbout:**
  - What do acks and min.insync.replicas trade off?
  - Why do sequential writes, zero-copy, and page cache give Kafka its throughput?
  - What did KRaft change versus ZooKeeper?
- **modelAnswerOutline:**
  - Topic = partitioned append-only log; partition = unit of ordering and parallelism; offset = per-partition sequence.
  - Replication with leader/followers, ISR, acks=0/1/all and min.insync.replicas trade durability vs latency.
  - Sequential disk writes + zero-copy + page cache explain throughput; producer batching/compression help.
  - KRaft (Kafka 4.0) removed ZooKeeper; metadata is a Raft quorum.
  - Retention, log segments, and log compaction for changelog/table topics; tiered storage for cold segments.
  - Common wrong turn: acks=1 with a single ISR while claiming no acknowledged-message loss.

#### sd-l6-partitioning-ordering - Partitioning, Ordering & Keys

- **learnFocus:** Ordering holds only within a partition, so the key choice determines correctness.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** partitioning, ordering, keys
- **applyPrompt:** Design partitioning for a payments ledger where all events for one account must be processed in order but the system must scale horizontally; pick the key and handle a celebrity/hot-key account.
- **thinkAbout:**
  - Why does ordering only hold within a partition?
  - Why does changing partition count break key->partition stability?
  - How do you handle a hot partition without losing ordering?
- **modelAnswerOutline:**
  - Per-partition total order; no global order, so causally related events must share a key.
  - Key by account_id so an account's events stay ordered in one partition.
  - Changing partition count breaks key->partition stability.
  - Hot partition mitigation: compound keys, salting, sub-partitioning (accepting weaker ordering scope).
  - More partitions = more throughput but weaker ordering scope.
  - Common wrong turn: assuming global ordering when Kafka only guarantees per-partition order.

#### sd-l6-consumer-groups - Consumer Groups, Rebalancing & Scaling

- **learnFocus:** How you scale reads and how rebalance causes latency and duplicate spikes.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** consumer-groups, rebalancing, lag
- **applyPrompt:** Design the consumer tier for a stream where you must scale workers from 3 to 30 during peak without stalling processing; explain rebalance behavior and how you avoid duplicate processing during handoff.
- **thinkAbout:**
  - Why is the group size capped by partition count?
  - How do offset-commit strategies create at-least-once behavior?
  - How do cooperative rebalancing and KIP-848 reduce stop-the-world?
- **modelAnswerOutline:**
  - One partition maps to at most one consumer per group; group size is capped by partition count.
  - Offset commit (auto vs manual, commit-after-process) determines at-least-once behavior.
  - Rebalance is stop-the-world; cooperative/incremental rebalancing and KIP-848 cut it sharply.
  - Static membership and tuned session/heartbeat timeouts avoid spurious rebalances.
  - Consumer lag is the key health/scaling signal; duplicates around rebalance need idempotent handlers.
  - Common wrong turn: over-partitioning (overhead, weak ordering) or committing offsets before processing.

#### sd-l6-compaction-retention - Log Compaction, Retention & Tiered Storage

- **learnFocus:** Retention decides replayability, cost, and whether a topic is a stream or a table.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** compaction, retention, tiered-storage
- **applyPrompt:** Design storage for two topics: an immutable audit event stream kept 7 years cheaply, and a 'current user profile' changelog; choose retention/compaction and storage tier for each.
- **thinkAbout:**
  - When do you use time/size retention vs log compaction?
  - How does compaction give table/changelog semantics and enable state rebuild?
  - How does tiered storage decouple retention cost from broker disk?
- **modelAnswerOutline:**
  - Time/size retention (delete) vs log compaction (keep latest per key -> table/changelog).
  - Compaction enables state rebuild and bootstrapping new consumers/read models.
  - Tiered storage: hot local + cold object storage for cheap long/infinite retention.
  - Tombstones (null value) for deletes in compacted topics; retention vs GDPR erasure tension.
  - Replay/reprocessing depends on a retention window long enough for the use case.
  - Common wrong turn: a dedup window shorter than the retention window, so replay double-applies.

### Module sd-l6-m3: Delivery Guarantees

Slug: `delivery-guarantees` | 3 lessons


#### sd-l6-delivery-semantics - Delivery Semantics: At-Most / At-Least / Exactly-Once

- **learnFocus:** Precisely stating your end-to-end guarantee and where you convert delivery into processing.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** delivery-semantics, exactly-once
- **applyPrompt:** Design a payment-charging pipeline that must never double-charge; state your delivery guarantee end-to-end and where you convert at-least-once delivery into effectively-once processing.
- **thinkAbout:**
  - Why is exactly-once delivery over a network impossible?
  - What is the scope of Kafka's exactly-once (EOS)?
  - Where does ack timing set the guarantee?
- **modelAnswerOutline:**
  - At-most-once (may lose), at-least-once (may duplicate, the practical default), exactly-once (hard).
  - Exactly-once delivery over a network is impossible; you get exactly-once processing via idempotency/transactions.
  - Kafka EOS = idempotent producer + transactions, scoped to read-process-write within Kafka only.
  - EOS does not extend to external side effects (emails, third-party charges): use idempotency keys.
  - Ack timing: commit-before-process = at-most-once, process-before-commit = at-least-once.
  - Common wrong turn: claiming exactly-once as if it removed duplicates end-to-end.

#### sd-l6-idempotency-dedup - Idempotency & Deduplication

- **learnFocus:** The primary defense against duplicate side effects under at-least-once delivery.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** idempotency, dedup
- **applyPrompt:** Design an idempotent 'create order' API and consumer given at-least-once delivery and client retries; specify the idempotency key, storage, and TTL, and handle the concurrent-duplicate race.
- **thinkAbout:**
  - What is the idempotency key and where does the dedup store live?
  - How do you resolve two duplicates racing simultaneously?
  - How do you size the dedup window vs the replay window?
- **modelAnswerOutline:**
  - Idempotency key (client-supplied or event id) + dedup store with atomic check-and-set.
  - Natural idempotency (upserts) vs enforced (dedup table) vs idempotent by design (state machines).
  - Resolve concurrent duplicates with a unique constraint or optimistic locking.
  - Size the dedup window/TTL vs the retention/replay window so replays do not re-apply.
  - Per-aggregate expected-version/sequence numbers reject stale or replayed commands.
  - Common wrong turn: a dedup flag rather than a stored result, so concurrent duplicates diverge.

#### sd-l6-retries-dlq-backpressure - Retries, Dead-Letter Queues & Backpressure

- **learnFocus:** Handling failed messages and slow consumers without blocking the stream or losing data.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** retries, dlq, backpressure
- **applyPrompt:** Design retry + failure handling for a consumer that calls a flaky third-party API; prevent a single poison message from blocking a partition while guaranteeing no silent data loss, and keep the pipeline stable when the consumer slows down.
- **thinkAbout:**
  - How do you avoid head-of-line blocking on an ordered partition?
  - When does a message go to the DLQ versus retry?
  - How does a durable log act as the backpressure buffer?
- **modelAnswerOutline:**
  - Retry with exponential backoff + jitter; cap attempts to avoid infinite loops.
  - Dead-letter queue/topic for exhausted messages, with alerting and redrive tooling.
  - Head-of-line blocking on an ordered partition: use retry topics/delayed retries instead of blocking.
  - Distinguish transient (retry) from permanent (DLQ immediately) errors.
  - Pull consumers bound in-flight work; the durable log is the backpressure buffer; autoscale on lag.
  - Common wrong turn: no DLQ so one poison message blocks a partition (head-of-line blocking).

### Module sd-l6-m4: Stream Processing & Event Patterns

Slug: `event-patterns` | 3 lessons


#### sd-l6-stream-processing - Stream Processing: Windowing, Watermarks & State

- **learnFocus:** Transforming and aggregating streams in real time with correct late-data handling.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** stream-processing, windowing, flink
- **applyPrompt:** Design a real-time fraud/anomaly pipeline computing per-user rolling 5-minute aggregates over an event stream, correct even when events arrive late and out of order.
- **thinkAbout:**
  - What is the difference between event time and processing time?
  - How do watermarks bound lateness and trigger windows?
  - How is local state made fault-tolerant?
- **modelAnswerOutline:**
  - Event time vs processing time vs ingestion time; watermarks bound lateness and trigger windows.
  - Windowing: tumbling, sliding, session windows; allowed lateness and late-event handling.
  - Stateful processing with local state (RocksDB) + changelog/checkpoint for fault-tolerant recovery.
  - Flink (advanced state/CEP, exactly-once via checkpoints) vs Kafka Streams vs Spark Structured Streaming.
  - Stream-stream and stream-table joins; KTable/materialized views.
  - Common wrong turn: using processing time and dropping late events silently.

#### sd-l6-event-sourcing - Event Sourcing

- **learnFocus:** Storing state as an immutable event log for audit, replay, and temporal queries.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** event-sourcing, ledger
- **applyPrompt:** Design an account-balance/ledger service using event sourcing: rebuild current balance from events, support 'balance as of last Tuesday', and handle a growing event log.
- **thinkAbout:**
  - How is current state derived, and how do snapshots bound replay cost?
  - How does optimistic concurrency via expected version work?
  - When is event sourcing not a fit?
- **modelAnswerOutline:**
  - Events are the source of truth; current state is derived by folding events over an aggregate.
  - Append-only immutable log gives full audit trail and time-travel queries.
  - Snapshots + tail-of-events bound replay cost for long-lived aggregates.
  - Optimistic concurrency via expected aggregate version on append.
  - Schema/event evolution via upcasting; you never edit history, only append corrections.
  - Common wrong turn: adopting event sourcing for every entity, ignoring the complexity cost.

#### sd-l6-cqrs - CQRS & Read Models

- **learnFocus:** Splitting write and read models so each scales and is shaped independently.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** cqrs, read-models, projections
- **applyPrompt:** Design read/write separation for a high-read product catalog with complex write validation: build denormalized read projections updated from write-side events and handle read staleness.
- **thinkAbout:**
  - Why separate write (commands, validation) from read (denormalized projections)?
  - How do projections stay in sync, and how do you handle read-your-writes UX?
  - Why should CQRS not be coupled to event sourcing by default?
- **modelAnswerOutline:**
  - Separate write model (commands, validation, aggregates) from read model (denormalized projections).
  - Projections built by consuming events; multiple read models for different queries.
  - Eventual consistency between sides; handle read-your-writes via client echo or versioned reads.
  - Independent scaling and datastore per side (Postgres write, Elasticsearch read).
  - Idempotent projection handlers; rebuild by replaying the event log.
  - Common wrong turn: coupling CQRS to event sourcing by default and paying double complexity.

### Module sd-l6-m5: Schema Governance & Ops

Slug: `schema-ops` | 2 lessons


#### sd-l6-schema-evolution - Schema Management & Evolution

- **learnFocus:** Long-lived event streams outlive any single version; incompatible changes cause outages.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** schema-registry, evolution, avro
- **applyPrompt:** Design schema governance for a shared 'user' event topic consumed by 10 teams: allow producers to add fields without breaking old consumers and specify your compatibility policy.
- **thinkAbout:**
  - What compatibility mode lets producers add fields safely?
  - Why treat events as a public contract?
  - How do you make a breaking change?
- **modelAnswerOutline:**
  - Schema registry (Confluent, Karapace) enforces compatibility at produce time.
  - Avro/Protobuf/JSON-Schema; compact binary + schema id vs embedding the schema.
  - Backward/forward/full compatibility: add fields with defaults, never remove/rename required fields.
  - Events are a public contract; version via upcasting, tolerant reader, or a new topic for breaks.
  - Compatibility mode decides safe producer/consumer deploy order.
  - Common wrong turn: treating event schemas as private and mutable, breaking downstream consumers.

#### sd-l6-streaming-observability - Streaming Durability, HA & Observability

- **learnFocus:** Operating the messaging tier: no acknowledged-message loss, and the signals that reveal silent failures.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** streaming-ops, ha, observability
- **applyPrompt:** Make an event-streaming platform survive a full availability-zone loss with zero acknowledged-message loss, and define the top monitoring signals and capacity math for a 1M msg/s stream.
- **thinkAbout:**
  - What replication and acks settings prevent acknowledged-write loss?
  - What is the primary health signal for a stream?
  - How do you size partitions, storage, and network?
- **modelAnswerOutline:**
  - Rack/AZ-aware replication + acks=all + min.insync.replicas prevent acknowledged-write loss.
  - Leader election and the unclean-leader-election tradeoff (availability vs durability).
  - Multi-region via MirrorMaker 2 or stretch clusters; idempotent producer avoids failover duplicates.
  - Consumer lag is the primary SLO signal; also under-replicated partitions, DLQ depth, end-to-end latency.
  - Capacity: partitions ~ target throughput / per-partition throughput; storage = rate x size x retention x replication.
  - Common wrong turn: no lag metric or tracing across async hops, so failures are silent.


---

## L7. Reliability, Resilience & Operations

_SLOs and error budgets, observability, resilience patterns, DR/multi-region, and safe delivery._

Slug: `reliability-ops` | Modules: 5 | Lessons: 17


### Module sd-l7-m1: SLOs & Error Budgets

Slug: `slo-budgets` | 4 lessons


#### sd-l7-availability-nines - Availability Math & the Nines

- **learnFocus:** Translating nines into downtime and cost, and how serial vs parallel dependencies combine.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** availability, nines, slo
- **applyPrompt:** Compute the allowable monthly downtime for a checkout service at 99.9% vs 99.99%, then decide which nine is worth the cost and justify it.
- **thinkAbout:**
  - How do serial dependencies combine, and how does redundancy add availability?
  - Why does each added nine cost roughly 10x more?
  - What is the difference between measured, promised (SLA), and target (SLO) availability?
- **modelAnswerOutline:**
  - 99.9% ~= 43.8 min/month; 99.99% ~= 4.4 min/month.
  - Serial dependencies multiply (a chain is the product); more hops lower the ceiling.
  - Redundancy adds availability: parallel components combine as 1 - (1-a)^n.
  - Each added nine typically costs ~10x more; match the target to revenue impact.
  - Distinguish measured vs promised (SLA with penalties) vs internal target (SLO).
  - Common wrong turn: chasing five nines everywhere regardless of cost or dependency ceilings.

#### sd-l7-sli-slo-sla - SLI / SLO / SLA Hierarchy

- **learnFocus:** Turning 'reliable enough' into measurable, enforceable targets.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** sli, slo, sla
- **applyPrompt:** Define 3 SLIs and their SLO targets and measurement windows for a photo-upload API, and specify exactly how each SLI is computed from telemetry.
- **thinkAbout:**
  - How is an SLI defined as good events over valid events?
  - Why does the measurement point (LB vs client vs server) change the number?
  - Why use percentiles, not averages, for latency SLIs?
- **modelAnswerOutline:**
  - SLI = good events / valid events; SLO = target + window (99.9% over 28 days); SLA = external promise with penalties.
  - Pick SLIs from the user's perspective (availability, latency, durability, correctness).
  - The measurement point (LB vs client vs server) changes the number; define valid events to exclude noise.
  - Use percentiles/thresholds for latency, not averages.
  - Keep few SLOs, each tied to a user journey, targets set from user expectation.
  - Common wrong turn: averaging latency and setting SLOs disconnected from any user journey.

#### sd-l7-error-budgets - Error Budgets & Policy

- **learnFocus:** The mechanism that balances release velocity against reliability.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** error-budget, policy, sre
- **applyPrompt:** Write an error-budget policy for a team: what happens at 100%, 50%, and 0% budget remaining, and who has authority to halt releases.
- **thinkAbout:**
  - Why is the error budget permission to fail that should be spent?
  - What consequences kick in as the budget is exhausted?
  - How does the policy depoliticize the release-vs-reliability decision?
- **modelAnswerOutline:**
  - Error budget = 1 - SLO; it is permission to fail that much and should be spent, not hoarded.
  - Policy defines consequences: budget exhausted -> freeze feature releases, redirect to reliability.
  - Carve-outs for security/P0 fixes even during a freeze.
  - Shared accountability between dev and ops; leadership pre-agrees to the policy.
  - Track burn over a rolling window; one incident can consume weeks of budget.
  - Common wrong turn: hoarding the budget (never shipping) instead of spending it.

#### sd-l7-burn-rate-alerting - Burn-Rate Alerting (Multi-Window, Multi-Burn-Rate)

- **learnFocus:** Alerting on how fast you spend the budget for fewer, more actionable pages.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** burn-rate, alerting, slo
- **applyPrompt:** Design the alert rules for a 99.9% SLO service using multi-window multi-burn-rate alerts, giving thresholds for a fast-burn page vs a slow-burn ticket.
- **thinkAbout:**
  - What is a burn rate, and what does 1x mean?
  - Why require both a short and a long window to trip?
  - Why alert on SLO burn (symptom) not CPU (cause)?
- **modelAnswerOutline:**
  - Burn rate = how many times faster than sustainable you spend budget (1x = exactly on budget).
  - Fast-burn (e.g. 14.4x over 1h) pages; slow-burn (e.g. 3x over 6h) opens a ticket.
  - Multi-window (short + long) both trip, cutting false positives and flapping.
  - Alert on symptoms (SLO burn) not causes (CPU high); page only on user-impacting, actionable conditions.
  - Tune windows/thresholds to trade detection time against budget spent.
  - Common wrong turn: static threshold alerts on causes producing alert fatigue.

### Module sd-l7-m2: Observability

Slug: `observability` | 2 lessons


#### sd-l7-golden-signals - The Four Golden Signals & RED/USE

- **learnFocus:** The minimal signal set to instrument any service or resource.
- **difficulty:** medium | **estimatedMinutes:** 25 | **skills:** golden-signals, red-use, metrics
- **applyPrompt:** For a payments microservice, enumerate the golden signals plus the specific metrics, labels, and dashboards you would instrument for each.
- **thinkAbout:**
  - What are the four golden signals, and when do you use RED vs USE?
  - Why separate successful vs failed request latency?
  - Why does high-cardinality labeling blow up cost?
- **modelAnswerOutline:**
  - Golden signals: latency, traffic, errors, saturation.
  - RED (Rate, Errors, Duration) for request-driven services; USE (Utilization, Saturation, Errors) for resources.
  - Separate latency of successful vs failed requests; slow errors hide in aggregate latency.
  - Saturation is a leading indicator of impending failure.
  - Watch cardinality: high-cardinality labels blow up metric cost.
  - Common wrong turn: dashboards nobody watches instead of signal-based alerting.

#### sd-l7-three-pillars-otel - Three Pillars & OpenTelemetry

- **learnFocus:** Metrics, logs, traces and the vendor-neutral standard that ties them across services.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** opentelemetry, tracing, observability
- **applyPrompt:** Design end-to-end observability for a 12-service request path: what you emit as metrics vs logs vs traces, and how a trace correlates across services.
- **thinkAbout:**
  - When do you reach for metrics vs logs vs traces?
  - How does trace context propagate across hops?
  - How do you control cardinality and retention cost?
- **modelAnswerOutline:**
  - Metrics (cheap aggregates/alerting), logs (structured detail), traces (causal request path).
  - OpenTelemetry (SDKs + Collector) decouples apps from backends.
  - Distributed tracing needs propagated trace/span context and consistent correlation IDs.
  - Structured logs with sampling; exemplars link metrics to traces.
  - Cardinality and retention drive cost: sample traces, aggregate metrics, tier log storage.
  - Common wrong turn: no correlation IDs or tracing, making 'why is it slow?' unanswerable.

### Module sd-l7-m3: Resilience Patterns

Slug: `resilience-patterns` | 3 lessons


#### sd-l7-timeouts-retries - Timeouts, Retries, Backoff & Jitter

- **learnFocus:** The most common cause of self-inflicted cascading outages and its defenses.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** timeouts, retries, backoff
- **applyPrompt:** Design the timeout/retry policy for a service calling three downstreams; specify budgets, backoff formula, and how you prevent retry storms.
- **thinkAbout:**
  - Why does every call need a timeout and a propagated deadline?
  - What is the backoff-with-jitter formula and the retry budget?
  - How does retry amplification turn a blip into an outage?
- **modelAnswerOutline:**
  - Every call needs connect + request timeouts; propagate deadlines/budgets across the chain.
  - Exponential backoff with jitter: delay = min(cap, base * 2^attempt) then randomize.
  - Cap total retries with a per-request retry budget (e.g. <=10% of traffic).
  - Only retry idempotent/safe operations; use idempotency keys for writes.
  - Retry at one layer only; retries at every layer multiply load.
  - Common wrong turn: retries with no backoff/jitter/budget causing a self-inflicted DDoS.

#### sd-l7-circuit-breakers - Circuit Breakers, Bulkheads & Fallbacks

- **learnFocus:** Isolating and containing failures so one sick dependency cannot sink the system.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** circuit-breaker, bulkhead, fallback
- **applyPrompt:** Add a circuit breaker + bulkhead + fallback around a flaky recommendations dependency on a product page; describe states and degraded UX.
- **thinkAbout:**
  - What do the circuit-breaker states do?
  - How do bulkheads prevent one dependency from starving others?
  - Which dependencies should be fallback-able?
- **modelAnswerOutline:**
  - Circuit breaker: Closed -> Open (trip on failures) -> Half-Open (probe) -> Closed.
  - Opening fails fast, sheds load off the failing dependency, and lets it recover.
  - Bulkheads isolate thread/connection pools per dependency.
  - Fallbacks: cached/stale data, default response, or graceful feature omission.
  - Only non-critical dependencies should be fallback-able; recommendations can be omitted.
  - Common wrong turn: no isolation, so a slow dependency exhausts all threads and cascades.

#### sd-l7-load-shedding-degradation - Load Shedding & Graceful Degradation

- **learnFocus:** Controlled partial service under overload beats total collapse.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** load-shedding, degradation, goodput
- **applyPrompt:** Design overload behavior for a search service at 2x capacity: what you shed, what you prioritize, and how you signal clients.
- **thinkAbout:**
  - How do you prioritize what to shed and what to protect?
  - Why maximize goodput rather than raw throughput?
  - How do metastable failures form, and how do you break them?
- **modelAnswerOutline:**
  - Shed low-value requests early at the edge to protect goodput; prioritize by request class.
  - Return 429/503 with Retry-After; shed cheaply before expensive work.
  - Graceful degradation: disable non-essential features (personalization) under stress.
  - Admission control and concurrency limits beat unbounded queues.
  - Metastable failures self-sustain after the trigger clears; break with shedding + backoff, not just capacity.
  - Common wrong turn: no admission control, so the system collapses instead of serving reduced load.

### Module sd-l7-m4: Redundancy, DR & Multi-Region

Slug: `redundancy-dr` | 4 lessons


#### sd-l7-redundancy-failover - Redundancy, Failover & Health Checking

- **learnFocus:** Removing single points of failure with redundancy and automated failover.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** redundancy, failover, health-checks
- **applyPrompt:** Remove every single point of failure from a 3-tier web app; specify redundancy, health checks, and how failover is triggered at each tier.
- **thinkAbout:**
  - Where are the hidden SPOFs (LB, DB primary, DNS, config store)?
  - Active-active vs active-passive: what do you trade?
  - How do you avoid flapping and split-brain during a partition?
- **modelAnswerOutline:**
  - N+1/N+2 redundancy; identify and eliminate SPOFs (LB, DB primary, DNS, config).
  - Active-active (all serve, harder state) vs active-passive (standby, simpler, failover lag).
  - Health checks: liveness vs readiness vs deep/dependency checks.
  - Failover automation; beware flapping and split-brain during partitions.
  - Leader election/quorum for singleton roles to avoid dual-primary; plan failback.
  - Common wrong turn: leaving the LB or DB primary un-replicated as a SPOF.

#### sd-l7-dr-rto-rpo - Disaster Recovery: RTO/RPO & Strategies

- **learnFocus:** Defining tolerable downtime and data loss and picking a DR strategy per tier.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** dr, rto-rpo, backups
- **applyPrompt:** Set RTO/RPO per tier for an e-commerce platform and pick a DR strategy (backup/restore, pilot light, warm standby, multi-site active/active) for each, justifying cost.
- **thinkAbout:**
  - What do RTO and RPO mean concretely?
  - How does the strategy ladder trade cost against recovery time?
  - Why is an untested backup not a DR plan?
- **modelAnswerOutline:**
  - RTO = max tolerable downtime; RPO = max tolerable data loss.
  - Strategy ladder: backup & restore -> pilot light -> warm standby -> multi-site active/active.
  - Tier applications; not everything needs seconds-level RTO/RPO.
  - Scenario-specific recovery (ransomware vs region loss vs corruption differ).
  - Backups must be tested, immutable/air-gapped, and restore-drilled; DR needs runbooks and game-days.
  - Common wrong turn: treating an untested backup/DR plan as real DR.

#### sd-l7-multi-region - Multi-Region & Multi-AZ Architecture

- **learnFocus:** Surviving AZ/region outages and meeting low RTO/RPO for critical systems.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** multi-region, replication, failover
- **applyPrompt:** Design a multi-region deployment for a globally used app; decide active-active vs active-passive, data replication mode, and traffic routing/failover.
- **thinkAbout:**
  - What do multi-AZ and multi-region each protect against, and at what cost?
  - Sync vs async replication: what is the RPO and latency tradeoff?
  - How do you resolve conflicts in active-active?
- **modelAnswerOutline:**
  - Multi-AZ (cheap, synchronous, common) vs multi-region (expensive, async, survives region loss).
  - Sync (low RPO, latency/availability cost) vs async (lag, possible loss) replication.
  - Traffic steering via GeoDNS / global LB / anycast with health-based failover.
  - Cross-region consistency: conflict resolution, CRDTs, or single-writer-region designs.
  - Cell-based / shuffle-sharding to shrink blast radius; test region evacuation.
  - Common wrong turn: assuming multi-region gives strong consistency for free.

#### sd-l7-blast-radius-cells - Blast Radius Reduction: Cells & Static Stability

- **learnFocus:** Limiting how many users any single failure can affect.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** cells, static-stability, blast-radius
- **applyPrompt:** Redesign a multi-tenant SaaS so a bad deploy or poison tenant impacts under 5% of customers; use cells, shuffle sharding, and static stability.
- **thinkAbout:**
  - How do cells and shuffle sharding bound impact?
  - Why separate control plane from data plane?
  - What is static stability, and why does it matter when the control plane is down?
- **modelAnswerOutline:**
  - Cell-based architecture: independent isolated stacks each serving a subset of users.
  - Shuffle sharding gives each customer a unique worker combination, isolating noisy tenants.
  - Blast radius applies to deploys (canary/cells), data (partitioning), dependencies (bulkheads).
  - Separate control plane from data plane so control-plane failures do not stop serving.
  - Static stability: keep serving from cached/last-known state when the control plane is down.
  - Common wrong turn: one bad tenant or deploy taking down everyone for lack of cells.

### Module sd-l7-m5: Deploy, Release & Chaos

Slug: `deploy-chaos` | 4 lessons


#### sd-l7-deployment-strategies - Deployment Strategies: Blue-Green, Canary, Rolling

- **learnFocus:** Safe release strategies that limit and reverse deploy risk.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** deployment, canary, blue-green
- **applyPrompt:** Choose and design a rollout strategy for a schema-touching backend change; describe traffic ramp, health gates, and rollback path.
- **thinkAbout:**
  - What does each strategy trade in infra cost and rollback speed?
  - What automated analysis gates a canary?
  - Why separate 'deploy' from 'release'?
- **modelAnswerOutline:**
  - Rolling (in-place gradual), blue-green (instant switch + rollback), canary (small % first).
  - Canary needs automated analysis comparing golden signals of canary vs baseline, with auto-abort.
  - Blue-green doubles infra briefly and needs DB-compatibility handling.
  - Health gates / bake time between ramp steps; promote only if SLIs stay green.
  - Separate deploy (code present) from release (traffic on); rollback must be fast and tested.
  - Common wrong turn: a destructive schema change in one deploy while old and new code run.

#### sd-l7-progressive-delivery-schema - Progressive Delivery, Feature Flags & Zero-Downtime Schema Changes

- **learnFocus:** Decoupling release from deploy and migrating schema safely while old and new code run.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** feature-flags, progressive-delivery, schema-migration
- **applyPrompt:** Roll out a risky new pricing engine behind flags to 1% then 100%, and separately rename a heavily-used DB column with zero downtime; give the ordered migration steps.
- **thinkAbout:**
  - How do flags enable targeted rollout, kill-switch, and experiments?
  - What is the expand/contract (parallel change) sequence?
  - Why must changes be both backward and forward compatible during rollout?
- **modelAnswerOutline:**
  - Feature flags decouple deploy from release: ship dark, enable gradually, kill instantly.
  - Targeting by segment/geo/tenant/percentage; flags double as feature circuit breakers.
  - Expand/contract: add new -> dual-write/backfill -> migrate reads -> remove old.
  - Old and new versions run concurrently; changes must be backward + forward compatible.
  - Online schema-change tooling (gh-ost, pt-osc); backfills throttled, idempotent, restartable.
  - Common wrong turn: rolling back code but not the incompatible migration, making rollback impossible.

#### sd-l7-chaos-engineering - Chaos Engineering & Fault Injection

- **learnFocus:** Proving resilience by deliberately breaking things with guardrails.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** chaos, fault-injection, resilience
- **applyPrompt:** Design a chaos experiment to validate that a service survives losing its cache tier; state hypothesis, blast radius, metrics, and abort criteria.
- **thinkAbout:**
  - What is the steady-state-hypothesis method?
  - Why run in production with guardrails rather than only staging?
  - What automatic stop condition ties to the error budget?
- **modelAnswerOutline:**
  - Method: steady-state hypothesis -> inject a real-world fault -> minimize blast radius -> measure -> learn.
  - Fault types: latency, error injection, instance/AZ/region kill, resource exhaustion, dependency loss.
  - Run in production with guardrails because staging never matches real conditions.
  - Automatic stop/abort when a key metric crosses a threshold; tie to the error budget.
  - GameDays start manual, mature toward continuous automated experiments (AWS FIS, Gremlin, Chaos Mesh).
  - Common wrong turn: a chaos experiment with no hypothesis, blast-radius limit, or abort condition.

#### sd-l7-incident-postmortem - Incident Management & Blameless Postmortems

- **learnFocus:** Detecting, responding, and learning from failure so reliability compounds.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** incident-management, postmortem, oncall
- **applyPrompt:** Define an incident-response process (severity levels, roles, comms cadence) for a company scaling past its first big outage, and the structure of the blameless postmortem that follows.
- **thinkAbout:**
  - What roles separate coordination from fixing?
  - Why does mitigation beat diagnosis during an incident?
  - Why avoid 'human error' as a root cause?
- **modelAnswerOutline:**
  - Severity levels (SEV1-4) with entry criteria and expected response.
  - Incident Command roles: Commander, Comms Lead, Ops/Scribe; separate coordination from fixing.
  - Detect -> triage -> mitigate (stop the bleeding) before root-cause; mitigation beats diagnosis.
  - Blameless postmortem: timeline, impact, contributing causes, action items with owners.
  - Avoid 'human error' as a root cause; ask why the system allowed it; track action items to completion.
  - Common wrong turn: blameful postmortems that stop at 'human error', hiding the next incident.


---

## L8. Security, Privacy & Multi-tenancy

_AuthN/AuthZ, encryption and secrets, abuse defense, compliance/PII, and tenant isolation._

Slug: `security-privacy` | Modules: 5 | Lessons: 16


### Module sd-l8-m1: Authentication & Identity

Slug: `authentication` | 4 lessons


#### sd-l8-auth-credentials - Authentication Fundamentals & Credential Handling

- **learnFocus:** Answering 'who is this?' and surviving a database dump without exposing usable credentials.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** authentication, password-hashing, mfa
- **applyPrompt:** Design a login/identity service for 100M users that supports password + MFA and survives a database dump without exposing usable credentials.
- **thinkAbout:**
  - Which password hashing and salting choices survive a breach?
  - Why is account recovery the real attack surface?
  - How do you defend against credential stuffing without user enumeration?
- **modelAnswerOutline:**
  - Password hashing with a memory-hard KDF (argon2id/scrypt/bcrypt), per-user salt, optional pepper; never store plaintext.
  - MFA factor types (TOTP, push, hardware keys); SMS is weak (SIM-swap); step-up/risk-based auth.
  - Account recovery/reset is the real attack surface and the weakest link.
  - Credential-stuffing defenses: breached-password checks (HIBP k-anonymity), throttling, no user-enumeration.
  - Separate authentication (who) from authorization (what); use timing-safe comparisons.
  - Common wrong turn: fast hashes (MD5/SHA-256) for passwords or leaking user existence in errors.

#### sd-l8-passkeys-webauthn - Passwordless, Passkeys & WebAuthn/FIDO2

- **learnFocus:** The industry shift to phishing-resistant public-key credentials.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** passkeys, webauthn, fido2
- **applyPrompt:** Add passkey (WebAuthn) sign-in to an existing password system and design the fallback, device-loss, and cross-device sync story.
- **thinkAbout:**
  - Why is the public-key credential model breach-proof on the server?
  - How does origin binding make passkeys phishing-resistant?
  - How do you handle device loss and recovery?
- **modelAnswerOutline:**
  - Public-key model: the private key stays on the authenticator; the server stores only the public key.
  - Phishing resistance via origin binding and challenge-response; beats OTP/SMS.
  - Platform vs roaming authenticators; synced passkeys (iCloud/Google) vs device-bound.
  - Attestation and account recovery when a device is lost.
  - Coexist with passwords via progressive enrollment.
  - Common wrong turn: MFA around SMS OTP without acknowledging SIM-swap/phishing weakness.

#### sd-l8-oauth-oidc - OAuth 2.1 & OpenID Connect

- **learnFocus:** Delegated authorization and federated identity, with the OAuth 2.1 baseline.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** oauth, oidc, sso
- **applyPrompt:** Design 'Sign in with X' plus third-party API access for a platform, choosing the correct grant flow and token strategy.
- **thinkAbout:**
  - What is the OAuth vs OIDC distinction?
  - Which grant do you pick for web/SPA/mobile vs M2M vs devices?
  - What did OAuth 2.1 make mandatory or remove?
- **modelAnswerOutline:**
  - OAuth (authorization/delegation) vs OIDC (authentication, ID token); roles: RO, client, AS, RS.
  - OAuth 2.1: Authorization Code + PKCE mandatory for all clients; implicit and password grants removed; exact redirect-URI matching.
  - Grant selection: auth code+PKCE (web/SPA/mobile), client credentials (M2M), device flow (TVs/CLI).
  - Scopes, audience, consent; state/nonce/PKCE protect against CSRF and confused-deputy.
  - DPoP/mTLS sender-constrained tokens vs bearer; SAML vs OIDC for enterprise SSO, SCIM for provisioning.
  - Common wrong turn: naming 'OAuth' without a grant or defaulting to the removed implicit flow.

#### sd-l8-sessions-tokens - Sessions, Tokens & Token Lifecycle

- **learnFocus:** Representing and revoking a logged-in session to bound blast radius on token leak.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** sessions, jwt, tokens
- **applyPrompt:** Design session management for a web + mobile app: choose token format, storage, expiry, and instant revocation.
- **thinkAbout:**
  - Stateful opaque sessions vs stateless JWTs: what is the revocation-vs-scale tradeoff?
  - How does refresh-token rotation with reuse detection work?
  - Where should you never store a token?
- **modelAnswerOutline:**
  - Stateful/opaque sessions vs stateless JWTs: revocation cost vs scale; hybrid (short JWT + refresh).
  - Short access-token TTL + refresh-token rotation with reuse detection (invalidate the family on replay).
  - Secure cookie flags (HttpOnly, Secure, SameSite), CSRF defense, and the BFF pattern to keep tokens off the browser.
  - JWT validation: verify signature/alg (no alg:none), aud, iss, exp; rotate keys via JWKS.
  - Revocation/logout via denylist or short TTL; never store tokens in localStorage (XSS).
  - Common wrong turn: JWTs everywhere with no revocation story, so a stolen token cannot be killed.

### Module sd-l8-m2: Authorization & Tenancy

Slug: `authz-tenancy` | 2 lessons


#### sd-l8-authz-rbac-rebac - Authorization Models: RBAC, ABAC & ReBAC

- **learnFocus:** Choosing the permission model and enforcing it at every trust boundary.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** authz, rebac, zanzibar
- **applyPrompt:** Design the permission system for a Google-Drive-style app with sharing, groups, nested folders, and org roles.
- **thinkAbout:**
  - When does RBAC hit role explosion, and when does ReBAC fit?
  - How does the Zanzibar model represent permissions?
  - How do you avoid IDOR / broken object-level authorization?
- **modelAnswerOutline:**
  - RBAC vs ABAC vs ReBAC; role explosion is the RBAC failure mode.
  - ReBAC / Zanzibar: object-relation-user tuples, relationship graph, check + reverse-index queries (OpenFGA, SpiceDB, Cedar).
  - Separate Policy Decision Point from Policy Enforcement Point; externalize authz (OPA/Cedar).
  - Enforce at every trust boundary: deny by default, least privilege, fail closed.
  - Avoid IDOR/BOLA (OWASP API #1); handle new-enemy consistency and sub-10ms decision latency.
  - Common wrong turn: treating authz as a single gate instead of per-object checks (IDOR).

#### sd-l8-multi-tenancy - Multi-Tenancy Isolation Models

- **learnFocus:** Preventing tenant A from ever seeing tenant B's data across cost, compliance, and scale.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** multi-tenancy, isolation, rls
- **applyPrompt:** Design tenant isolation for a B2B SaaS spanning small self-serve and large regulated enterprise customers on one platform.
- **thinkAbout:**
  - What is the silo vs pool vs bridge tradeoff?
  - Where must tenant context be resolved and enforced?
  - What are the non-obvious cross-tenant leakage vectors?
- **modelAnswerOutline:**
  - Silo vs Pool vs Bridge (dedicated infra vs shared schema vs shared DB/separate schema): security vs cost.
  - Resolve tenant context on every request before business logic; propagate tenant_id through the chain.
  - Data-layer enforcement: Postgres Row-Level Security, per-tenant keys, schema/connection routing.
  - Per-tenant quotas/rate limits for noisy-neighbor fairness; tiered isolation (pool for SMB, silo for regulated).
  - Leakage vectors: cache keys, search indexes, background jobs, shared IDs, log aggregation.
  - Common wrong turn: forgetting the non-obvious leakage vectors like shared caches and search indexes.

### Module sd-l8-m3: Encryption & Secrets

Slug: `encryption-secrets` | 3 lessons


#### sd-l8-encryption-transit-mtls - Encryption in Transit & mTLS

- **learnFocus:** Confidentiality and integrity on every network hop, and service-to-service identity.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** tls, mtls, pki
- **applyPrompt:** Design end-to-end transport security for a microservices platform including internal service-to-service calls.
- **thinkAbout:**
  - What is the TLS 1.3 baseline and cert lifecycle hygiene?
  - How does mTLS give workload identity?
  - Where do you terminate vs re-encrypt?
- **modelAnswerOutline:**
  - TLS 1.3 baseline, cipher hygiene, HSTS, automated issuance/rotation (ACME).
  - Mutual TLS for service-to-service auth with short-lived certs and a CA.
  - Termination at edge/LB vs end-to-end; re-encryption inside the mesh.
  - PKI, pinning tradeoffs, and revocation (OCSP/CRL) challenges.
  - Forward secrecy and downgrade-attack protection.
  - Common wrong turn: trusting the internal network and skipping mTLS for east-west traffic.

#### sd-l8-encryption-rest-field - Encryption at Rest, Field-Level & E2E

- **learnFocus:** Making stolen storage useless, with granularity that determines breach exposure.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** encryption, envelope, crypto-shredding
- **applyPrompt:** Design encryption for a health/finance app storing PII so a stolen DB snapshot or backup reveals nothing usable.
- **thinkAbout:**
  - How does envelope encryption (DEK/KEK) work?
  - What is the searchability tradeoff across disk vs field vs client-side encryption?
  - How does crypto-shredding support GDPR erasure?
- **modelAnswerOutline:**
  - Envelope encryption: a DEK encrypts data, a KEK (in KMS/HSM) wraps the DEK; per-tenant/record DEKs.
  - Full-disk vs DB TDE vs application/field-level vs client-side/E2EE, with the searchability tradeoff.
  - AES-256-GCM (authenticated), nonce management, deterministic vs randomized for searchable fields.
  - E2EE where the server never sees plaintext (messaging, password managers).
  - Crypto-shredding: delete the key to make data unrecoverable, supporting erasure; encrypt backups/logs too.
  - Common wrong turn: 'encrypted at rest' with the key sitting next to the data.

#### sd-l8-secrets-kms - Secrets & Key Management (KMS/HSM, Rotation)

- **learnFocus:** Storing secrets, rotating keys, and solving the 'secret zero' bootstrap.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** secrets, kms, workload-identity
- **applyPrompt:** Design a centralized secrets platform for 500 microservices consuming 10k secrets with rotation and per-access audit.
- **thinkAbout:**
  - Why a dedicated secret store over env vars/config files?
  - How does workload identity solve the secret-zero problem?
  - How do you rotate without downtime?
- **modelAnswerOutline:**
  - Dedicated store (Vault, cloud Secrets Manager/KMS) over env vars; never commit secrets to source.
  - KMS vs HSM (FIPS), key hierarchy with a hardware-backed root of trust.
  - Automatic rotation without downtime via versioned secrets and dual-secret windows.
  - Dynamic/short-lived secrets and workload identity (SPIFFE/SVID, IAM/OIDC) solve secret zero.
  - Least-privilege policies, audit logging on every read, and leaked-credential scanning.
  - Common wrong turn: long-lived static credentials and secrets in env files or source control.

### Module sd-l8-m4: Abuse & Perimeter Defense

Slug: `abuse-defense` | 3 lessons


#### sd-l8-ddos-rate-abuse - Rate Limiting, Quotas & DDoS Defense

- **learnFocus:** Protecting capacity and defending against L3/L4 and L7 attacks before origin.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** ddos, rate-limiting, waf
- **applyPrompt:** Design DDoS protection plus abuse rate limiting for a high-traffic public API covering volumetric floods and L7 HTTP floods.
- **thinkAbout:**
  - How do L3/L4 volumetric and L7 application defenses differ?
  - What is economic denial-of-service (denial of wallet)?
  - What is the fail-open vs fail-closed decision for the limiter?
- **modelAnswerOutline:**
  - Layered defense: L3/L4 volumetric (anycast scrubbing, CDN, BGP) vs L7 application floods (WAF, behavioral limits).
  - Anycast + CDN absorption, IP reputation, and challenge pages / proof-of-work as graduated response.
  - Rate-limit algorithms (token bucket, sliding window), per-user/IP/key dimensions, tiered quotas.
  - 429 + Retry-After + RateLimit headers; decide fail-open vs fail-closed when the limiter store is down.
  - Autoscaling under attack causes economic denial-of-service (denial of wallet); cache to shed load.
  - Common wrong turn: treating DDoS as one problem instead of separate L3/L4 and L7 defenses.

#### sd-l8-bot-fraud-ato - Bot Defense, Fraud & Account-Takeover Prevention

- **learnFocus:** Behavioral defense against automated abuse distinct from raw DDoS.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** fraud, bot-defense, ato
- **applyPrompt:** Design abuse defense for a signup/login and checkout flow facing credential stuffing, fake accounts, and card testing.
- **thinkAbout:**
  - What signals detect credential stuffing and impossible travel?
  - How do you balance friction against conversion with graduated response?
  - How do you defend against Sybil/fake accounts?
- **modelAnswerOutline:**
  - Credential stuffing / ATO: breached-password checks, MFA, impossible-travel and velocity checks.
  - Bot management: device fingerprinting, behavioral signals, invisible challenges, risk scoring.
  - Fake-account/Sybil defense: phone/email verification, reputation, per-identity/device velocity limits.
  - Risk-based / step-up auth triggered by anomalies; make responses auditable and reversible.
  - Fraud signals pipeline (features + rules + ML), feedback loops, manual-review queues.
  - Common wrong turn: hard blocks that hurt conversion instead of graduated, risk-based friction.

#### sd-l8-threat-modeling-zerotrust - Threat Modeling & Zero-Trust Architecture

- **learnFocus:** Reasoning about attackers systematically and authenticating every request.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** threat-modeling, zero-trust, stride
- **applyPrompt:** Produce a threat model for a payments feature using STRIDE, then redesign a flat internal network into a zero-trust model for microservices.
- **thinkAbout:**
  - What does STRIDE enumerate, and what are the core secure-design principles?
  - What does 'never trust, always verify' change about internal traffic?
  - How do you limit lateral movement and blast radius?
- **modelAnswerOutline:**
  - STRIDE (spoofing, tampering, repudiation, info disclosure, DoS, elevation) over trust-boundary/data-flow diagrams.
  - Principles: least privilege, defense in depth, fail secure, complete mediation, secure defaults, assume-breach.
  - Zero-trust: authenticate/authorize every request, no implicit network trust (BeyondCorp).
  - Micro-segmentation, service mesh, mTLS workload identity; identity-aware proxies replace VPNs.
  - Limit lateral movement and contain blast radius; secure east-west traffic, not just north-south.
  - Common wrong turn: bolting security on at the end instead of reasoning from threats up front.

### Module sd-l8-m5: Privacy, Compliance & Audit

Slug: `privacy-compliance` | 4 lessons


#### sd-l8-compliance-frameworks - Compliance Frameworks & Regulatory Design

- **learnFocus:** How GDPR, SOC 2, HIPAA, and PCI-DSS dictate concrete architectural requirements.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** compliance, gdpr, pci
- **applyPrompt:** Design a system handling EU health/payment data to satisfy GDPR + SOC 2 + PCI/HIPAA overlapping controls.
- **thinkAbout:**
  - What baseline controls do the frameworks share?
  - How does data residency drive architecture?
  - How does tokenization reduce PCI scope?
- **modelAnswerOutline:**
  - Map frameworks: GDPR/CCPA (privacy rights), SOC 2 (Trust Services Criteria), HIPAA (PHI), PCI-DSS (cardholder data).
  - Shared baseline (encryption, access control, logging, backup) vs framework-specific non-negotiables.
  - Data residency/localization and cross-border transfer mechanisms (SCCs, adequacy).
  - Audit evidence, access reviews, change management, control operation over time.
  - Reduce scope: tokenization keeps cardholder data out of your systems; DPAs and DPIAs.
  - Common wrong turn: treating data residency as a checkbox instead of a regional-sharding driver.

#### sd-l8-pii-dsar-privacy - PII Governance, DSAR/Erasure & Privacy Engineering

- **learnFocus:** Honoring access/deletion rights and minimizing re-identification risk.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** pii, dsar, privacy-engineering
- **applyPrompt:** Design a data platform that can find and delete every copy of one user's PII within 30 days across all stores, and share analytics data while minimizing re-identification risk.
- **thinkAbout:**
  - How do you locate every copy of a user's PII?
  - How does crypto-shredding handle erasure across backups?
  - How do anonymization, pseudonymization, and tokenization differ?
- **modelAnswerOutline:**
  - Data classification/inventory and a catalog so you know where every copy lives.
  - Data-subject rights: access (DSAR), erasure, rectification, portability, consent withdrawal.
  - Delete across all stores (DBs, caches, search, backups, logs, lake, third parties); crypto-shredding for backups.
  - Retention conflicts (erasure vs legal retention) require per-field policy.
  - Anonymization (irreversible) vs pseudonymization (reversible) vs tokenization; differential privacy / k-anonymity for analytics.
  - Common wrong turn: claiming GDPR erasure while ignoring backups, caches, search, and third-party processors.

#### sd-l8-audit-supplychain - Audit Logging, OWASP & Supply-Chain Security

- **learnFocus:** Tamper-evident audit trails, application-layer defenses, and securing the build pipeline.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** audit-logging, owasp, supply-chain
- **applyPrompt:** Design a tamper-evident audit-logging system for sensitive/admin actions, and secure the build-and-deploy pipeline and service-to-service auth with no long-lived secrets.
- **thinkAbout:**
  - What makes an audit log tamper-evident, and what do you capture?
  - Which OWASP API risks must the gateway defend?
  - How do SBOM, signing, and workload identity secure the supply chain?
- **modelAnswerOutline:**
  - Immutable/append-only, tamper-evident logs (hash chaining, WORM) separate from app logs.
  - Capture actor, action, resource, timestamp, source, result; keep PII/secrets out of logs.
  - OWASP API defenses at the gateway: input validation, parameterized queries, BOLA/IDOR, SSRF, mass assignment.
  - Supply chain: SBOM, SCA scanning, artifact/image signing (Sigstore/cosign), SLSA provenance.
  - Workload identity (SPIFFE, cloud OIDC federation) issues short-lived creds instead of static keys.
  - Common wrong turn: dumping PII/secrets into logs or no audit trail for admin actions.

#### sd-l8-incident-breach-response - Security Incident & Breach Response, Key Compromise

- **learnFocus:** Running the detect-contain-eradicate-recover loop for a breach, rotating compromised keys at scale, and meeting notification and forensic obligations.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** security, incident-response, compliance
- **applyPrompt:** Design the incident and breach response plan for a compromised signing key in a multi-tenant SaaS, covering detection, containment, key rotation and revocation without downtime, forensic evidence, and regulatory notification.
- **thinkAbout:**
  - What are the ordered phases of incident response, and what is the goal of each?
  - How do you rotate and revoke a widely-used key without taking the whole system down?
  - What legal and forensic obligations start the moment you confirm a breach?
- **modelAnswerOutline:**
  - Assume a compromised signing or API key that may have been used to mint valid tokens, in a system under GDPR-style regulation.
  - Follow the NIST-style loop: detection (alerts, anomaly detection, threat intel), containment (isolate affected systems, revoke sessions), eradication (remove the foothold, rotate secrets), recovery (restore trusted state), and lessons learned (a blameless postmortem).
  - Detection: centralized logging or a SIEM, alerting on anomalous key usage, geo and velocity anomalies, and honeytokens, while assuming an outside party may notify you first, so plan for that path too.
  - Containment and key rotation without downtime: support multiple valid keys (key ids or a JWKS with overlapping validity), so you add a new key, flip signing to it, then revoke the old one, and short-lived credentials from a secrets manager (Vault, KMS) make rotation routine.
  - Revocation at scale: shrink token TTLs and rotate the JWKS rather than relying on long-lived tokens, and force re-authentication for affected sessions.
  - Forensics and evidence: preserve immutable logs and snapshots before cleanup, keep chain of custody, and do not destroy evidence while eradicating.
  - Regulatory clock: GDPR requires notifying the supervisory authority within 72 hours of becoming aware of a qualifying breach, so legal and comms are part of the runbook, not an afterthought, and immutable, object-locked (ransomware-resistant) backups keep a clean recovery path.
  - Common wrong turn: wiping and rebuilding immediately to 'fix it fast', which destroys the forensic evidence and does a hard key cutover that logs everyone out.


---

## L9. Modern Architecture & Delivery

_Service boundaries, containers/k8s/mesh, serverless/edge, delivery and FinOps, and OLTP vs OLAP/lakehouse._

Slug: `modern-architecture` | Modules: 5 | Lessons: 16


### Module sd-l9-m1: Service Architecture

Slug: `service-architecture` | 3 lessons


#### sd-l9-monolith-vs-microservices - Monolith vs Modular Monolith vs Microservices

- **learnFocus:** The most-tested architecture tradeoff, with the industry mood swinging back to starting monolithic.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** microservices, monolith, architecture
- **applyPrompt:** Recommend an architecture for a 12-engineer Series-B startup's ordering platform, then define the exact triggers that would make you extract the first microservice.
- **thinkAbout:**
  - Why default to a modular monolith first?
  - What are the real extraction triggers (org, deploy cadence, scaling profile)?
  - What is a distributed monolith and why is it the worst outcome?
- **modelAnswerOutline:**
  - Default to a modular monolith first; microservices are a destination, not a starting point.
  - Extraction triggers: org scaling (Conway), independent deploy cadence, divergent scaling, fault isolation, polyglot.
  - Costs of premature microservices: distributed transactions, latency, eventual consistency, ops/cloud overhead.
  - Modular monolith enforces module boundaries with a single deploy while keeping seams to split later.
  - Argue both directions from requirements; many orgs are consolidating services.
  - Common wrong turn: a distributed monolith (services sharing a DB / deploying together) getting both costs.

#### sd-l9-decomposition-ddd - Service Decomposition & Bounded Contexts (DDD)

- **learnFocus:** Drawing boundaries so microservices help instead of becoming a distributed monolith.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** ddd, bounded-context, decomposition
- **applyPrompt:** Given a monolithic e-commerce app, produce a service map: name the bounded contexts, their data ownership, and the two seams you would cut first.
- **thinkAbout:**
  - Why align boundaries to business capabilities, not technical layers?
  - Why must each service own its data (no shared DB)?
  - How does the Strangler Fig pattern extract incrementally?
- **modelAnswerOutline:**
  - Align boundaries to business capabilities / bounded contexts; each service owns its data.
  - Database-per-service with API/event-only access enforces the boundary.
  - Strangler Fig for incremental extraction with an anti-corruption layer at the seam.
  - Right-size: avoid nano-services (chatty) and god-services; one team owns each service.
  - Conway's Law: design teams and services together (Inverse Conway Maneuver).
  - Common wrong turn: a shared database across services, coupling them into a distributed monolith.

#### sd-l9-inter-service-comm - Inter-Service Communication

- **learnFocus:** Sync vs async and orchestration vs choreography to avoid cascading failure.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** inter-service, grpc, saga
- **applyPrompt:** Design the communication for a checkout flow spanning cart, payment, inventory, and shipping services and justify each sync vs async hop.
- **thinkAbout:**
  - Which hops are sync request-response and which are async events?
  - Orchestration vs choreography: what do you trade in visibility and coupling?
  - How do timeouts, retries, and idempotency prevent cascading failure?
- **modelAnswerOutline:**
  - Sync (REST/gRPC) for request-response reads; async (events/queue) for decoupling and fan-out.
  - gRPC/protobuf for internal east-west; REST/GraphQL for external north-south.
  - Orchestration (central saga coordinator) vs choreography (event chains): visibility vs coupling.
  - Saga + compensations for cross-service consistency without 2PC.
  - Backpressure, timeouts, retries with jitter, circuit breakers, idempotency keys prevent cascades.
  - Common wrong turn: synchronous chains everywhere, so one slow service stalls the whole flow.

### Module sd-l9-m2: Containers & Orchestration

Slug: `containers-orchestration` | 4 lessons


#### sd-l9-containers-k8s - Containers & Kubernetes Fundamentals

- **learnFocus:** The default deployment substrate and the assumed vocabulary in modern rounds.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** kubernetes, containers, probes
- **applyPrompt:** Design the K8s deployment for a stateless web API plus a stateful Postgres: specify workload objects, health probes, and how a rolling update stays zero-downtime.
- **thinkAbout:**
  - Which workload objects fit stateless vs stateful?
  - How do liveness/readiness/startup probes drive safe rollout?
  - Why prefer managed DBs over self-hosting state in K8s?
- **modelAnswerOutline:**
  - Immutable images (OCI), multi-stage builds, distroless bases for size and CVE surface.
  - Core objects: Pod, Deployment/StatefulSet/DaemonSet, Service, Ingress/Gateway, ConfigMap/Secret.
  - Requests/limits, QoS classes, affinity/taints, PodDisruptionBudgets for scheduling.
  - Liveness/readiness/startup probes gate traffic and drive safe rolling updates.
  - Stateful workloads need StatefulSets + PersistentVolumes; prefer managed DBs over self-hosting state.
  - Common wrong turn: treating K8s as a magic scaling button while missing statelessness and probes.

#### sd-l9-k8s-autoscaling - Autoscaling & Elasticity

- **learnFocus:** Elastic scaling as the core cloud-native value prop, including scale-to-zero.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** autoscaling, keda, elasticity
- **applyPrompt:** Design autoscaling for a service with spiky, event-driven load: choose the scalers, set the target metrics, and handle scale-to-zero cold starts.
- **thinkAbout:**
  - When is a queue-depth or RPS signal better than CPU?
  - How do HPA, VPA, cluster autoscaler, and KEDA differ?
  - How do you hide cold starts on a spike?
- **modelAnswerOutline:**
  - Horizontal (HPA) vs vertical (VPA) vs cluster autoscaler / Karpenter for nodes.
  - KEDA for event-driven / queue-depth scaling, including scale-to-zero.
  - Scale on the right signal: RPS/queue depth/custom often beat CPU; percentile targets.
  - Cold-start and warm-pool tradeoffs; provisioned concurrency to hide lag.
  - Predictive/scheduled scaling for diurnal patterns; stabilization windows avoid flapping.
  - Common wrong turn: scaling on CPU when the real signal is queue depth or p99 latency.

#### sd-l9-service-mesh - Service Mesh (Sidecar vs Sidecarless/Ambient/eBPF)

- **learnFocus:** Handling mTLS, traffic control, and observability for east-west traffic, and the sidecarless shift.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** service-mesh, ebpf, mtls
- **applyPrompt:** Add mTLS, retries, and per-service traffic shifting to a 40-service cluster; decide sidecar vs ambient/eBPF mesh and justify on cost and latency.
- **thinkAbout:**
  - What does a mesh move out of application code?
  - What is the sidecar cost, and what does ambient/eBPF change?
  - When is a mesh not warranted?
- **modelAnswerOutline:**
  - Mesh: mTLS/zero-trust, retries/timeouts/circuit-breaking, traffic splitting, L7 telemetry out of app code.
  - Sidecar model costs memory/pod and adds mTLS latency; proxy sprawl.
  - Sidecarless/ambient (Istio Ambient, Cilium eBPF) reduces the proxy tax; GA in 2025.
  - Gateway API is the converging standard, letting you swap implementations.
  - A mesh is not always warranted; adoption is declining for small fleets.
  - Common wrong turn: adding a mesh reflexively for a handful of services.

#### sd-l9-cloud-native-12factor - Cloud-Native & 12-Factor Principles

- **learnFocus:** Applying 12-factor and cloud-native principles (config in env, stateless disposable processes, attached backing services) as an explicit design lens.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** cloud-native, twelve-factor, deployment
- **applyPrompt:** Explain how you would apply the 12-factor and cloud-native principles to make a legacy stateful service ready for containers and autoscaling, calling out config, state, backing services, and disposability.
- **thinkAbout:**
  - What makes a process safe to kill and restart anywhere at any time?
  - Where should configuration and secrets live so one image runs in every environment?
  - How do you treat databases, caches, and queues so instances stay interchangeable?
- **modelAnswerOutline:**
  - Assume a legacy service that stores session and files on local disk and reads config from a baked-in file, which blocks horizontal scaling.
  - Config in the environment: keep config and secrets out of the image (env vars, a secrets manager or ConfigMap) so one immutable artifact is promoted unchanged from dev to prod (dev/prod parity).
  - Stateless, disposable processes: no local session or file state, so store session in Redis and files in object storage (S3), letting any instance serve any request while processes start fast and shut down gracefully on SIGTERM.
  - Backing services as attached resources: databases, caches, queues, and blob stores are addressed by URL and credentials and are swappable without code changes.
  - Build, release, run separation and immutable infrastructure: build once, tag the release, and run the same image, never mutating a running box but replacing it.
  - Design for failure: instances can vanish (spot, autoscale, node drain), so health checks, retries, and graceful shutdown are required, not optional, and logs stream to stdout for the platform to collect.
  - Use the checklist as an explicit lens: walk each factor and name the specific change (session -> Redis, disk -> S3, config -> env) rather than treating cloud-native as a vibe.
  - Common wrong turn: containerizing the service but keeping local session and disk state, so scaling out breaks users whose data lives on one instance.

### Module sd-l9-m3: Serverless & Edge

Slug: `serverless-edge` | 2 lessons


#### sd-l9-serverless-faas - Serverless / FaaS Architecture

- **learnFocus:** Removing capacity management for spiky workloads, with real constraints.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** serverless, faas, cold-start
- **applyPrompt:** Design an image-processing pipeline on Lambda triggered by uploads; address cold starts, concurrency limits, timeouts, and cost at scale.
- **thinkAbout:**
  - What are good vs bad fits for FaaS?
  - How do you mitigate cold starts?
  - Why does the cost model invert at high steady load?
- **modelAnswerOutline:**
  - FaaS: stateless, event-triggered, per-invocation billing, auto-scaling to zero; pair with managed queues/stores.
  - Cold starts (100ms-1s+); mitigate with provisioned concurrency, smaller packages, warm pools.
  - Constraints: execution-time limits, statelessness, concurrency caps, VPC latency, lock-in.
  - Good fits: bursty, glue, event processing; bad fits: long-running, low-latency-critical, high steady throughput.
  - Orchestrate multi-step logic via Step Functions / durable workflows.
  - Common wrong turn: serverless for high steady load where containers are cheaper.

#### sd-l9-edge-wasm - Edge Computing, CDN Compute & WebAssembly

- **learnFocus:** Sub-5ms cold starts and global low latency, and what runs at the edge vs origin.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** edge, wasm, workers
- **applyPrompt:** Design global request routing, auth, and personalization at the edge for a content site; decide what runs at the edge vs the origin.
- **thinkAbout:**
  - Why do V8 isolates start far faster than container FaaS?
  - What belongs at the edge vs the origin?
  - What are the edge data-consistency constraints?
- **modelAnswerOutline:**
  - V8 isolates (Cloudflare Workers) start in <5ms vs 100ms-1s+ for container FaaS; WASM hits sub-ms.
  - Edge for lightweight latency-sensitive work: routing, auth/JWT, A/B, personalization, caching; origin for heavy compute.
  - Edge runtime constraints: limited CPU, no full Node APIs, small memory.
  - Edge data: eventually-consistent KV, edge caches, regional read replicas; consistency tradeoffs.
  - TTFB <50ms globally without bespoke multi-region infra; debugging/observability is harder.
  - Common wrong turn: pushing heavy compute or strong-consistency data to the edge.

### Module sd-l9-m4: Delivery & FinOps

Slug: `delivery-finops` | 3 lessons


#### sd-l9-platform-gitops - Platform Engineering, IDPs & GitOps

- **learnFocus:** The golden-path answer to microservice sprawl and the dominant delivery control plane.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** platform-engineering, gitops, idp
- **applyPrompt:** Design an Internal Developer Platform so a product team can ship a new service to prod in a day: define golden paths, self-service, and guardrails.
- **thinkAbout:**
  - What does an IDP provide over raw Kubernetes?
  - What is GitOps and why is Git the source of truth?
  - How do guardrails-as-code replace gatekeeping?
- **modelAnswerOutline:**
  - An IDP provides self-service golden paths (scaffold, deploy, observe) that cut cognitive load.
  - GitOps: Git as the source of truth, declarative desired state, automated reconciliation (Argo CD/Flux).
  - Backstage/portals for service catalog, ownership, and scorecards.
  - Guardrails as code: policy (OPA/Kyverno), templates, paved roads over gatekeeping.
  - Supply-chain security baked in: SBOMs, signing (cosign), provenance (SLSA).
  - Common wrong turn: a ticket-queue platform team instead of platform-as-product self-service.

#### sd-l9-iac-progressive-delivery - IaC, Environments & Progressive Delivery

- **learnFocus:** Reproducible infra and safe, reversible rollouts for critical services.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** iac, progressive-delivery, terraform
- **applyPrompt:** Design the IaC and environment-promotion strategy for dev/staging/prod across two regions preventing config drift, plus a zero-downtime rollout for a critical payments service that auto-rolls-back on regression.
- **thinkAbout:**
  - How do you prevent config drift and snowflake environments?
  - Which rollout strategy and metrics gate a payments deploy?
  - How do feature flags decouple deploy from release?
- **modelAnswerOutline:**
  - Declarative IaC (Terraform/OpenTofu, Pulumi) with remote state locking and modules.
  - Immutable infra + environment parity; avoid manual console changes that cause drift.
  - Rolling vs blue-green (instant reversible) vs canary (gradual % with metric gates).
  - Automated analysis + auto-rollback (Argo Rollouts/Flagger) on SLO regressions; bake time between steps.
  - Feature flags decouple deploy from release; expand/contract for backward-compatible schema.
  - Common wrong turn: manual console changes causing drift, or a destructive migration in one deploy.

#### sd-l9-cloud-finops - Cloud Cost & FinOps

- **learnFocus:** Cost as a first-class design axis, including Kubernetes and AI/GPU spend.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** finops, cost, kubernetes
- **applyPrompt:** Cut a $200k/mo cloud bill by 30% without hurting reliability: produce a prioritized plan across compute, data, and Kubernetes allocation.
- **thinkAbout:**
  - What are the three FinOps pillars?
  - Why is Kubernetes cost visibility hard, and how do you fix it?
  - What are the biggest data/egress cost levers?
- **modelAnswerOutline:**
  - FinOps pillars: Inform (tagging/allocation), Optimize (rightsizing, idle cleanup), Operate (governance).
  - Compute: rightsizing, spot/preemptible for fault-tolerant work, savings plans, autoscaling, scale-to-zero.
  - K8s cost is opaque (bill shows nodes not apps); use OpenCost/Kubecost + consistent labels.
  - Percentile (P90/P95) rightsizing over static thresholds; automate.
  - Data/egress: inter-AZ/region transfer, storage tiering, warehouse query cost; AI/GPU spend is a top concern.
  - Common wrong turn: ignoring egress/data-transfer charges and per-app K8s allocation.

### Module sd-l9-m5: Data-Intensive & Analytics

Slug: `data-intensive` | 4 lessons


#### sd-l9-oltp-vs-olap - OLTP vs OLAP Fundamentals

- **learnFocus:** The foundational split between transactional and analytical workloads.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** oltp, olap, columnar
- **applyPrompt:** Design the data layer for an app that needs fast order writes AND real-time revenue dashboards without the dashboards slowing checkout.
- **thinkAbout:**
  - Why never run heavy analytics on the primary OLTP DB?
  - How do row-store and column-store physical layouts differ?
  - How does data move OLTP -> OLAP?
- **modelAnswerOutline:**
  - OLTP: row-store, normalized, short high-concurrency transactions (Postgres/MySQL).
  - OLAP: column-store, denormalized/star schema, large scans/aggregations (Snowflake/BigQuery/ClickHouse).
  - Never run heavy analytics on the primary OLTP DB; isolate to protect transactional latency.
  - Move data via ETL/ELT, CDC, or streaming; batch vs real-time tradeoff.
  - Columnar storage, compression, partitioning, vectorized execution power analytics.
  - Common wrong turn: running dashboards on the transactional primary and degrading checkout.

#### sd-l9-warehouse-lake-lakehouse - Warehouse vs Lake vs Lakehouse

- **learnFocus:** Placing warehouse/lake/lakehouse and avoiding the data-swamp anti-pattern.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** lakehouse, warehouse, data-lake
- **applyPrompt:** Choose and justify a warehouse vs lakehouse for a company doing BI + ML on 50TB of mixed structured/semi-structured data.
- **thinkAbout:**
  - What does each architecture optimize, and where does the lake become a swamp?
  - What is the medallion (bronze/silver/gold) pattern?
  - How does separating storage and compute help?
- **modelAnswerOutline:**
  - Warehouse: schema-on-write, curated, strong BI/governance, costlier for raw/unstructured.
  - Lake: schema-on-read, cheap object storage, risk of a data swamp.
  - Lakehouse = lake economics + warehouse features (ACID, schema, governance) via open table formats.
  - Medallion architecture (bronze/silver/gold) for progressive refinement.
  - Separation of storage and compute enables independent scaling and multiple engines on one copy.
  - Common wrong turn: a data lake with no catalog/schema/governance becoming a swamp.

#### sd-l9-table-formats-cdc - Open Table Formats & CDC

- **learnFocus:** The interoperability layer of the lakehouse and the backbone for syncing OLTP to analytics.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** iceberg, cdc, table-formats
- **applyPrompt:** Pick an open table format for a multi-engine lakehouse (Spark + Trino + Flink) and design real-time replication of order changes from Postgres into a search index and the lakehouse without dual-write inconsistency.
- **thinkAbout:**
  - What do table formats add over raw Parquet?
  - Which format fits multi-engine vs CDC-heavy vs streaming?
  - How does log-based CDC + outbox avoid the dual-write problem?
- **modelAnswerOutline:**
  - Table formats add ACID, schema/partition evolution, time travel, hidden partitioning over Parquet.
  - Iceberg (open standard, broad engines), Delta (Spark-native), Hudi (CDC/upserts), Paimon (batch-stream).
  - Catalogs (Iceberg REST, Polaris, Unity) provide metadata/governance and cross-engine access.
  - Log-based CDC (Debezium reading WAL/binlog) captures every change with low impact.
  - Transactional outbox avoids the dual-write problem; at-least-once + idempotent consumers.
  - Common wrong turn: dual-writing to DB and search/lake separately, creating inconsistency.

#### sd-l9-batch-streaming - Batch vs Streaming: Lambda vs Kappa

- **learnFocus:** Choosing batch vs streaming and unifying them for real-time plus reporting.
- **difficulty:** hard | **estimatedMinutes:** 30 | **skills:** batch, streaming, lambda-kappa
- **applyPrompt:** Design a pipeline that serves both a real-time fraud signal and a nightly financial report from the same event source.
- **thinkAbout:**
  - What does Lambda architecture add over Kappa, and at what complexity?
  - How do watermarks and event-time handle late data?
  - How does streaming-into-lakehouse collapse the two paths?
- **modelAnswerOutline:**
  - Batch (high throughput, high latency) vs streaming (low latency, continuous, harder correctness).
  - Lambda (parallel batch + speed layers) vs Kappa (single streaming path, replay from the log).
  - Engines: Kafka/Pulsar for the log; Flink/Spark Structured Streaming for processing.
  - Event-time vs processing-time, watermarks, windowing, late/out-of-order data.
  - Exactly-once vs at-least-once and checkpointing/replayability; Flink -> Iceberg collapses the paths.
  - Common wrong turn: maintaining two divergent codebases (Lambda) when Kappa + replay suffices.


---

## L10. Applied Case Studies

_End-to-end 'design X' capstones that integrate every prior level into complete systems._

Slug: `case-studies` | Modules: 5 | Lessons: 28


### Module sd-l10-m1: Foundational Building Blocks

Slug: `building-blocks` | 4 lessons


#### sd-l10-url-shortener - Design a URL Shortener (TinyURL)

- **learnFocus:** The canonical warm-up: estimation, KV storage, ID generation, and a read-heavy cache path.
- **difficulty:** easy | **estimatedMinutes:** 35 | **skills:** url-shortener, kv-store, caching
- **applyPrompt:** Design a service that returns a 7-character short URL for any long URL and redirects on lookup, at 100M new links/day and 100:1 read:write.
- **thinkAbout:**
  - How do you generate a short, collision-free key?
  - Why is a cache in front of a KV store the right read path?
  - 301 vs 302 redirect: how does it interact with analytics and caching?
- **modelAnswerOutline:**
  - Estimate QPS, storage/year, and cache working-set from 100M links/day and 100:1 reads.
  - Key generation: base62 of a counter/Snowflake vs hash-of-URL + collision handling vs pre-generated pool.
  - Read path: Redis cache in front of a sharded KV store; 301 (cacheable) vs 302 (analytics) tradeoff.
  - Idempotency for the same long URL; custom aliases and TTL/expiration.
  - Shard the KV store by key; a relational DB is unnecessary here.
  - Common wrong turn: a relational DB with an auto-increment PK creating a write hotspot.

#### sd-l10-rate-limiter - Design a Distributed Rate Limiter

- **learnFocus:** A reusable component: algorithm choice plus distributed-counter consistency.
- **difficulty:** medium | **estimatedMinutes:** 35 | **skills:** rate-limiter, redis, distributed
- **applyPrompt:** Design a rate limiter that enforces 100 req/min per API key across a fleet of stateless servers.
- **thinkAbout:**
  - Which algorithm balances burst tolerance and accuracy?
  - How do you keep the shared counter atomic across nodes?
  - What is the fail-open vs fail-closed decision on a Redis outage?
- **modelAnswerOutline:**
  - Algorithms: token bucket, leaky bucket, fixed/sliding window with burst/accuracy tradeoffs.
  - Placement: client, gateway, sidecar, or dedicated service.
  - Distributed counters in Redis (atomic INCR + TTL, Lua) vs local + async sync.
  - Handle clock skew, race conditions, and fail-open vs fail-closed under Redis outage.
  - Response contract: 429, Retry-After, RateLimit headers, per-tier quotas.
  - Common wrong turn: naive per-node limits letting a client get Nx the intended limit.

#### sd-l10-unique-id-generator - Design a Distributed Unique ID Generator (Snowflake)

- **learnFocus:** Monotonic, coordination-free 64-bit IDs and their clock dependence.
- **difficulty:** medium | **estimatedMinutes:** 30 | **skills:** snowflake, id-generation, clocks
- **applyPrompt:** Design a service issuing 64-bit, time-sortable, globally unique IDs at millions/sec without central coordination.
- **thinkAbout:**
  - How do you budget the bits (timestamp, worker, sequence)?
  - How do you handle clock skew and rollback?
  - What is the sortability vs unpredictability tension?
- **modelAnswerOutline:**
  - Snowflake layout: timestamp + machine/worker id + sequence; budget the bits.
  - UUIDv7/ULID vs Snowflake vs DB auto-increment vs ticket server tradeoffs.
  - Clock skew/rollback handling and NTP dependence.
  - Sortability vs unpredictability (security) tension.
  - Worker-id assignment via ZooKeeper/etcd; exhaustion limits.
  - Common wrong turn: random UUIDv4 as a clustered key causing index fragmentation.

#### sd-l10-typeahead - Design Typeahead / Autocomplete

- **learnFocus:** Low-latency read serving with a trie and top-k ranking under a tight p99.
- **difficulty:** medium | **estimatedMinutes:** 35 | **skills:** typeahead, trie, ranking
- **applyPrompt:** Design autocomplete that returns the top 10 ranked completions within 100ms as a user types a prefix.
- **thinkAbout:**
  - How does a trie with cached top-k per node serve sub-100ms?
  - How are suggestions ranked and updated from a stream?
  - How do debouncing and edge caching cut load?
- **modelAnswerOutline:**
  - Trie with top-k cached per node vs a prefix-indexed store; precomputation offline.
  - Ranking by frequency/recency/personalization; weighted tries.
  - Debouncing, client caching, and edge/CDN serving.
  - Update suggestions from a stream (batch rebuild vs incremental).
  - Fuzzy matching, typo tolerance, and profanity/safety filtering.
  - Common wrong turn: a DB LIKE 'prefix%' query per keystroke that cannot hit the latency budget.

### Module sd-l10-m2: Social, Feed & Messaging

Slug: `social-messaging` | 4 lessons


#### sd-l10-news-feed - Design a News Feed / Timeline (Twitter)

- **learnFocus:** The archetypal fan-out problem with celebrity hot-key handling.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** news-feed, fan-out, celebrity
- **applyPrompt:** Design a home timeline that shows a user the recent posts of everyone they follow, at read latency under 200ms.
- **thinkAbout:**
  - When do you fan out on write vs on read?
  - How does a hybrid handle celebrity accounts?
  - How do ranking and deletes/edits change the design?
- **modelAnswerOutline:**
  - Fan-out-on-write (push) vs fan-out-on-read (pull) vs hybrid for celebrities.
  - Per-user timeline cache, cursor pagination, and post storage.
  - Celebrity/hot-key problem: pull-merge for high-follower accounts.
  - Ranking layer (chronological vs ML-ranked) and how it changes the design.
  - Handle deletes/edits and the consistency-vs-freshness tradeoff.
  - Common wrong turn: pure fan-out-on-write for a celebrity, exploding write cost.

#### sd-l10-instagram - Design Instagram (Photo Sharing)

- **learnFocus:** Blob storage + metadata DB + CDN with feed generation.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** instagram, blob-storage, cdn
- **applyPrompt:** Design upload-to-view for a photo-sharing app including media storage, metadata, and feed delivery to a global audience.
- **thinkAbout:**
  - How do you split blob storage from metadata?
  - How do presigned uploads and a CDN serve media efficiently?
  - How does the feed reuse fan-out patterns?
- **modelAnswerOutline:**
  - Metadata DB (users, posts, follows) + object storage for media + CDN for reads.
  - Presigned uploads bypass app servers; generate multiple resolutions/thumbnails async.
  - Feed generation via fan-out (reuse the timeline patterns).
  - Estimate storage (photos/day x size x replication) and read bandwidth.
  - Ranking, likes/comments counters (sharded/approximate), and hot-post handling.
  - Common wrong turn: storing images in the database instead of object storage + pointer.

#### sd-l10-chat-messaging - Design a Chat / Messaging System (WhatsApp)

- **learnFocus:** Real-time delivery, ordering, presence, and offline delivery at massive concurrency.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** chat, websocket, presence
- **applyPrompt:** Design 1:1 and group messaging with delivery + read receipts, online presence, and offline delivery.
- **thinkAbout:**
  - What transport and connection layer sustain millions of persistent connections?
  - How do you guarantee per-conversation ordering and dedup?
  - How do you deliver to offline users and fan out to large groups?
- **modelAnswerOutline:**
  - Persistent connections (WebSocket) via connection servers; a presence service; a pub/sub backplane.
  - Per-conversation sequence numbers for ordering; idempotency and dedup.
  - Store-and-forward for offline users; ACKs and read receipts.
  - Group fan-out; large-channel hierarchical distribution.
  - Message history storage (wide-column), multi-device sync, optional E2E encryption (Signal).
  - Common wrong turn: assuming global ordering instead of per-conversation ordering.

#### sd-l10-notification-system - Design a Notification / Push System

- **learnFocus:** A reusable delivery backbone: queues, fan-out, provider adapters, dedup, and preferences.
- **difficulty:** medium | **estimatedMinutes:** 35 | **skills:** notifications, fan-out, queue
- **applyPrompt:** Design a system that delivers a notification to a user across push (APNs/FCM), SMS, email, and in-app with per-user preferences.
- **thinkAbout:**
  - How do provider adapters with retries/failover abstract channels?
  - How do you prevent double-sends with idempotency?
  - How do preferences, quiet hours, and batching fit?
- **modelAnswerOutline:**
  - Channel abstraction + provider adapters (APNs, FCM, Twilio, SES) with retries/failover.
  - Queue-based fan-out, priority lanes, and per-user rate/throttle.
  - Idempotency + dedup to prevent double-sends; a template/rendering service.
  - User preferences, opt-out, quiet hours, and digest/batching.
  - Delivery tracking, DLQ, and observability of send/open rates.
  - Common wrong turn: no idempotency, so a retry double-sends a push.

### Module sd-l10-m3: Geo, Media & Collaboration

Slug: `geo-media-collab` | 5 lessons


#### sd-l10-ride-sharing - Design a Ride-Sharing Service (Uber)

- **learnFocus:** Geospatial indexing, dispatch, and high-frequency moving-object updates.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** ride-sharing, geospatial, dispatch
- **applyPrompt:** Design ride matching that pairs a rider with the nearest available driver and tracks live locations at city scale.
- **thinkAbout:**
  - Which spatial index (geohash, quadtree, S2, H3) fits nearby queries?
  - How do you handle high-frequency driver location writes?
  - How does the matching/dispatch engine and trip state machine work?
- **modelAnswerOutline:**
  - Spatial indexing: geohash, quadtree, S2, or H3 cells for nearby range queries.
  - High-frequency driver location updates (write amplification); regional sharding by geography.
  - Matching/dispatch engine with supply-demand and surge signals.
  - ETA estimation, trip state machine, and consistency of assignment.
  - Hot-city handling and QoS for location updates.
  - Common wrong turn: a naive lat/long range scan that cannot serve nearby queries at scale.

#### sd-l10-file-sync - Design a File Sync & Storage Service (Dropbox)

- **learnFocus:** Chunking, dedup, delta sync, and conflict resolution across devices.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** file-sync, chunking, dedup
- **applyPrompt:** Design a service that syncs a user's files across devices, uploading only changed chunks and resolving conflicts.
- **thinkAbout:**
  - How does content-defined chunking + hashing enable dedup and delta sync?
  - What does the metadata service track?
  - How do you detect and resolve conflicts and keep versions?
- **modelAnswerOutline:**
  - Content-defined chunking, per-chunk hashing, and block-level dedup.
  - Delta/differential sync; a metadata service tracks file->chunk maps.
  - Conflict detection/resolution and versioning/history.
  - Client sync protocol: watcher, upload/download queues, offline edits.
  - Storage in object store + CDN; consistency of metadata vs blobs.
  - Common wrong turn: re-uploading whole files instead of changed chunks.

#### sd-l10-video-streaming - Design Video Streaming / VOD (YouTube/Netflix)

- **learnFocus:** Transcoding pipelines, CDN economics, and adaptive bitrate at global scale.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** video-streaming, transcoding, cdn
- **applyPrompt:** Design upload-to-playback for user videos including transcoding, storage, and adaptive streaming to a global audience.
- **thinkAbout:**
  - How does the async transcoding pipeline produce an ABR ladder?
  - How does the CDN offload origin, and what is cached?
  - How do you tier storage for popular vs cold content?
- **modelAnswerOutline:**
  - Ingestion + async transcoding pipeline (multiple resolutions/codecs) via a job queue.
  - Adaptive bitrate streaming (HLS/DASH), chunked segments, manifests.
  - CDN strategy and origin offload (Open Connect-style edge caches); handle live spikes.
  - Metadata + recommendation serving separate from delivery.
  - Storage tiering for popular vs cold content; thumbnail/preview generation.
  - Common wrong turn: serving video from origin without a CDN, saturating egress.

#### sd-l10-collaborative-editor - Design a Collaborative Editor (Google Docs)

- **learnFocus:** Concurrency correctness under real-time multi-writer edits: OT vs CRDT.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** collaborative-editor, crdt, ot
- **applyPrompt:** Design a document that multiple users edit simultaneously with all edits converging and cursors shown live.
- **thinkAbout:**
  - What is the OT vs CRDT tradeoff for convergence and intention preservation?
  - How do you broadcast presence and cursors in real time?
  - How do you persist and replay edits and handle offline reconnection?
- **modelAnswerOutline:**
  - Operational Transform vs CRDT: convergence, intention preservation, tradeoffs.
  - Real-time transport (WebSocket), presence, and cursor/selection broadcast.
  - Persistence: op log + snapshots and replay/undo.
  - Offline edits and reconciliation on reconnect.
  - Access control, comments, and scaling per-document connection servers.
  - Common wrong turn: last-write-wins on whole documents, losing concurrent edits.

#### sd-l10-yelp-nearby - Design Yelp / Nearby Places (Proximity Search)

- **learnFocus:** Designing a read-heavy proximity search over a mostly-static place dataset, distinct from live matching.
- **difficulty:** medium | **estimatedMinutes:** 40 | **skills:** geospatial, search, caching, case-study
- **applyPrompt:** Design Yelp's 'nearby places' feature: given a user location and filters, return ranked places within a radius, and justify your spatial index, ranking, and caching for a read-heavy, mostly-static dataset.
- **thinkAbout:**
  - How is this different from Uber matching, where points move every few seconds?
  - How do you combine spatial filtering with attribute filters (open now, category, rating) and ranking?
  - What is cacheable when the underlying place data barely changes?
- **modelAnswerOutline:**
  - Assume tens of millions of mostly-static places (POIs), heavy read traffic, and queries like 'coffee within 2km, open now, sorted by rating and distance'.
  - The key difference from Uber matching is that the data is read-heavy and rarely changes, so you precompute, denormalize, and cache aggressively instead of optimizing for high-rate location writes.
  - Spatial index: geohash, quadtree, or S2 buckets over place coordinates so a radius query hits a cell plus its neighbors, stored in a search engine (Elasticsearch or OpenSearch with geo_distance) that also handles attribute filters and text.
  - Query flow: candidate generation by spatial cell, then filter by attributes (category, open-now from hours, price), then rank by a blend of distance, rating, popularity, and sponsored boost.
  - Storage: source of truth in a relational or document store, a denormalized read model in the search index, place details in a KV cache, and media on a CDN.
  - Caching: cache popular (cell, filter) result pages and place detail pages with generous TTLs since data is stable, and invalidate on the rare place update.
  - Scale reads with replicas and CDN edge caching, while writes (new reviews, edits) are comparatively low-rate and flow through a pipeline that updates the index.
  - Common wrong turn: modeling it like a live-matching or geofencing system with constant location writes, over-engineering write throughput the workload never has.

### Module sd-l10-m4: Storage & Infrastructure Systems

Slug: `storage-infra` | 8 lessons


#### sd-l10-distributed-cache - Design a Distributed Cache (Redis-like)

- **learnFocus:** Sharding, eviction, replication, and hot-key handling as a core building block.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** distributed-cache, consistent-hashing, eviction
- **applyPrompt:** Design a distributed in-memory cache with consistent hashing, replication, and an eviction policy for a read-heavy service.
- **thinkAbout:**
  - How do consistent hashing and virtual nodes distribute keys?
  - Which eviction policy and cache pattern fit?
  - How do you handle stampede and hot keys?
- **modelAnswerOutline:**
  - Consistent hashing + virtual nodes for even distribution and minimal reshuffle.
  - Eviction (LRU/LFU/TTL) and memory management.
  - Replication, failover, and consistency with the backing store.
  - Cache patterns: cache-aside, write-through, write-back; stampede protection.
  - Hot-key mitigation via replication of hot entries and request coalescing.
  - Common wrong turn: hash-mod-N sharding that reshuffles the world when a node is added.

#### sd-l10-key-value-store - Design a Key-Value Store (DynamoDB/Cassandra)

- **learnFocus:** Distributed-storage internals: replication, quorums, consistency, and partitioning.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** key-value-store, quorum, lsm
- **applyPrompt:** Design a horizontally scalable KV store with tunable consistency and no single point of failure.
- **thinkAbout:**
  - How do consistent hashing and replication factor form the ring?
  - How do R/W quorums give tunable consistency?
  - How are conflicts resolved and replicas reconciled?
- **modelAnswerOutline:**
  - Consistent hashing partitioning + replication factor and ring topology.
  - Quorum reads/writes (R+W>N), tunable and eventual consistency.
  - Conflict resolution: vector clocks, LWW, read-repair, anti-entropy (Merkle trees).
  - Write path: commit log + memtable + SSTable (LSM), compaction.
  - Gossip membership, hinted handoff, and CAP positioning.
  - Common wrong turn: assuming R+W>N gives linearizability.

#### sd-l10-object-store-s3 - Design an Object Store (Amazon S3)

- **learnFocus:** Durability engineering: erasure coding, replication, and metadata at scale.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** object-store, erasure-coding, durability
- **applyPrompt:** Design an object store offering 11-nines durability with multi-region replication and range reads.
- **thinkAbout:**
  - How do replication vs erasure coding trade durability against storage cost?
  - How does the metadata/index service scale?
  - What is the consistency model and how do multipart/range reads work?
- **modelAnswerOutline:**
  - Data placement, replication vs erasure coding (durability vs storage cost).
  - Metadata/index service mapping keys -> objects at massive scale.
  - Multipart upload, range GET, and a read-after-write consistency model.
  - Multi-region replication, versioning, lifecycle/tiering to cold storage.
  - Background repair, checksums, and rebalancing.
  - Common wrong turn: full replication everywhere, ignoring erasure coding's cost savings.

#### sd-l10-message-queue - Design a Message Queue / Streaming Log (Kafka)

- **learnFocus:** The distributed log, delivery semantics, and consumer scaling reused everywhere.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** message-queue, kafka, delivery-semantics
- **applyPrompt:** Design a durable, partitioned pub/sub log supporting at-least-once delivery and horizontal consumer scaling.
- **thinkAbout:**
  - What gives per-partition ordering and durability?
  - How do consumer groups, offsets, and rebalancing scale reads?
  - How do you make processing effectively-once?
- **modelAnswerOutline:**
  - Distributed commit log, partitions, per-partition ordering.
  - Delivery semantics: at-most/at-least/exactly-once and idempotent consumers.
  - Consumer groups, offsets, rebalancing, and backpressure.
  - Replication (ISR), durability, retention/compaction.
  - Producer batching, throughput vs latency, dead-letter handling.
  - Common wrong turn: claiming exactly-once delivery without idempotent consumers.

#### sd-l10-job-scheduler - Design a Distributed Job Scheduler / Cron

- **learnFocus:** Exactly-once firing across failures, one of the hardest correctness problems.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** job-scheduler, leasing, idempotency
- **applyPrompt:** Design a scheduler that fires each job at its scheduled time exactly once, even if worker machines crash mid-run.
- **thinkAbout:**
  - How do you index and poll for due jobs efficiently?
  - How do leasing and visibility timeouts make a crashed job retry, not duplicate?
  - How do you handle clock skew, missed windows, and recurring jobs?
- **modelAnswerOutline:**
  - Time-bucketed storage/index of due jobs and efficient 'due now' polling.
  - Leasing/locking + visibility timeout so a crashed worker's job is retried, not duplicated.
  - Exactly-once via idempotency keys + dedup, not true once-delivery.
  - Handle clock skew, missed windows, and catch-up.
  - Scale via job sharding, priority, and recurring-schedule expansion.
  - Common wrong turn: a naive lock without fencing, so a paused worker double-runs a job.

#### sd-l10-distributed-lock - Design a Distributed Lock / Coordination Service (ZooKeeper/etcd)

- **learnFocus:** Composing leader election, leases, fencing tokens, and watches into a correct coordination service that stays safe under partitions.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** coordination, consensus, distributed-systems, case-study
- **applyPrompt:** Design a distributed lock and coordination service (in the spirit of ZooKeeper or etcd), and explain how leases, fencing tokens, and watches keep it safe from split-brain and stale lock holders.
- **thinkAbout:**
  - Why is a lock in Redis with a TTL not safe on its own, and what does a fencing token add?
  - What happens when a lock holder pauses (a long GC) past its lease and then wakes up?
  - How do clients get notified when a lock is released or a leader changes?
- **modelAnswerOutline:**
  - Assume many clients that need mutual exclusion, leader election, and config coordination, and must stay correct across process pauses and network partitions.
  - Core: build on a consensus-backed store (etcd, ZooKeeper, Consul) so the lock state itself is linearizable and survives node failure, rather than a single-node lock.
  - Leases and TTL: a lock is a key held with a session lease that must be renewed by heartbeat, so if the holder dies or partitions away the lease expires and the lock frees automatically, avoiding permanent deadlock.
  - Fencing tokens: hand out a monotonically increasing token with each grant, and have the protected resource reject any write carrying a token lower than the highest it has seen, so a paused-then-resumed old holder cannot corrupt state.
  - Watches and notify: clients watch the lock or leader key and get a callback on release or change instead of polling, which enables fast failover (ephemeral znodes in ZooKeeper, leases plus watch in etcd).
  - Leader election: candidates create ordered ephemeral keys, the lowest wins, and each other candidate watches its predecessor for a clean handoff.
  - Split-brain safety: a consensus quorum means only a majority side can grant the lock, and fencing tokens stop a stale minority-side holder from acting, so a partitioned old leader cannot keep writing.
  - Common wrong turn: relying on a single Redis SETNX with a TTL and no fencing token, which under GC pauses or partitions lets two clients each believe they hold the lock (the classic unsafe distributed lock).

#### sd-l10-code-sandbox - Design a Code Execution Sandbox / Online Judge

- **learnFocus:** Running untrusted code safely at scale with strong isolation, resource limits, a queue and worker pool, and streamed results.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** sandboxing, security, isolation, case-study
- **applyPrompt:** Design a code execution sandbox / online judge that runs untrusted user submissions safely at scale, and justify your isolation boundary, resource limits, queueing, and result streaming.
- **thinkAbout:**
  - What isolation boundary is strong enough to run hostile code, and what are the tradeoffs of each option?
  - How do you bound CPU, memory, time, disk, and network so one submission cannot harm the host or others?
  - How do you absorb bursty submissions and stream results back to the user?
- **modelAnswerOutline:**
  - Assume users submit arbitrary code in many languages, some of it hostile (fork bombs, network exfiltration, escape attempts), at spiky volume around contests.
  - The isolation boundary is the core decision: plain containers are convenient but share the host kernel (weaker), gVisor adds a user-space kernel, and microVMs (Firecracker) or Kata give near-VM isolation with fast startup, which is the strong default for untrusted code, with a hardened container (seccomp, AppArmor, non-root, read-only FS) as a middle ground.
  - Resource limits: cgroups for CPU and memory caps, a hard wall-clock and CPU-time timeout, a pids limit to stop fork bombs, disk quotas, and no network (or a strict egress allowlist) by default.
  - Architecture: a stateless API accepts submissions, a durable queue (SQS, Kafka) buffers them, and a pool of sandboxed workers pulls jobs, executes each in a fresh throwaway sandbox, and returns results, which absorbs bursts and lets workers autoscale.
  - Warm pools: pre-warm sandboxes or microVMs to hide cold-start latency, and always destroy the sandbox after each run so no state leaks between submissions.
  - Result streaming: stream stdout, stderr, and test progress back over SSE or WebSocket, store the final verdict, and enforce output-size caps.
  - Fairness and abuse: per-user rate limits and concurrency quotas so one user cannot starve the pool, plus monitoring for abuse, and treat the sandbox host itself as compromisable by running it in an isolated network segment.
  - Common wrong turn: running submissions in a shared container as root with network access and only a language-level timeout, which is trivially escapable and lets one job take down the host.

#### sd-l10-webhook-delivery - Design a Reliable Webhook Delivery System

- **learnFocus:** Delivering webhooks with at-least-once guarantees, retries with backoff, signing, ordering, dead-letters, and per-tenant fairness.
- **difficulty:** medium | **estimatedMinutes:** 40 | **skills:** messaging, reliability, api-design, case-study
- **applyPrompt:** Design a reliable webhook delivery system that notifies customer endpoints of events, and justify your delivery guarantee, retry and backoff, signing, idempotency, ordering, and dead-letter handling.
- **thinkAbout:**
  - What delivery guarantee do you offer, and what does that require of the consumer?
  - How do you retry a flaky or slow customer endpoint without amplifying load or blocking others?
  - How do consumers verify authenticity and safely handle duplicates and out-of-order events?
- **modelAnswerOutline:**
  - Assume you emit events (payment.succeeded and similar) to many customer-controlled HTTPS endpoints of varying reliability and speed.
  - Guarantee at-least-once: persist each event, enqueue a delivery task, and mark it delivered only on a 2xx, which means duplicates are possible so consumers must be idempotent.
  - Idempotency for consumers: include a stable event id and let consumers dedupe on it, and document clearly that delivery is at-least-once.
  - Retries with backoff: on failure or timeout, retry with exponential backoff and jitter over a long window (minutes to hours to days) with a capped attempt count, so a down endpoint can recover without a thundering herd.
  - Signing: sign each payload (HMAC-SHA256 over body plus timestamp) so consumers verify authenticity and reject replays, and rotate signing secrets with an overlap window.
  - Ordering: default to no strict global order (simpler and parallel), and where a tenant needs per-resource order, key delivery by resource id and deliver sequentially per key, accepting lower throughput for that key.
  - Dead-letter and fairness: after max attempts move the event to a dead-letter store, alert, and expose a manual replay or redrive API, and isolate delivery per tenant (per-tenant queues, rate limits, bounded concurrency, per-endpoint timeouts and circuit breakers) so one slow tenant cannot starve others.
  - Common wrong turn: delivering inline and synchronously from the event producer with a couple of quick retries, so a single slow customer endpoint backs up and stalls the whole event pipeline.

### Module sd-l10-m5: Commerce, Money & Analytics

Slug: `commerce-analytics` | 7 lessons


#### sd-l10-payment-ledger - Design a Payment System & Ledger

- **learnFocus:** Correctness-critical design: idempotency, double-entry accounting, and no lost money.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** payments, ledger, idempotency
- **applyPrompt:** Design a payment service that charges a user and credits a merchant with no double-charges and an auditable ledger.
- **thinkAbout:**
  - How do idempotency keys make charges safe under retries?
  - Why a double-entry immutable ledger?
  - How do you coordinate across payment provider, wallet, and orders?
- **modelAnswerOutline:**
  - Idempotency keys on every mutating request for safe retries.
  - Double-entry ledger, immutable append, and reconciliation.
  - Distributed transaction / saga across provider, wallet, and orders.
  - Effectively-once via dedup; handle provider webhooks, retries, timeouts.
  - Strong consistency for balances, audit trail, PCI/security, and fraud hooks.
  - Common wrong turn: mutable balance updates with no ledger, making audit and reconciliation impossible.

#### sd-l10-ecommerce-flash-sale - Design E-Commerce Inventory / Flash Sale (Ticketmaster)

- **learnFocus:** Inventory correctness under contention: overselling, reservations, and fairness at spike load.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** flash-sale, inventory, contention
- **applyPrompt:** Design ticket/seat purchasing that never oversells a finite inventory during a flash sale with millions of concurrent buyers.
- **thinkAbout:**
  - How do you prevent oversell under massive concurrency?
  - How do reservation holds with timeouts work?
  - How does a waiting room shed and fairly admit spike traffic?
- **modelAnswerOutline:**
  - Reservation/hold with timeout vs optimistic vs pessimistic locking on inventory.
  - Prevent oversell: atomic decrement, distributed locks, or serialized per-item queues.
  - Queue/waiting-room to shed and fairly admit spike traffic.
  - Cart, checkout saga, payment integration, and release of expired holds.
  - Hot-item sharding limits and eventual vs strong consistency choice.
  - Common wrong turn: read-modify-write on inventory that oversells under concurrency.

#### sd-l10-web-crawler - Design a Web Crawler

- **learnFocus:** Large-scale batch pipelines: crawl politeness, dedup, and incremental recrawl.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** web-crawler, frontier, dedup
- **applyPrompt:** Design a crawler that discovers, fetches, dedups, and indexes billions of web pages while respecting politeness.
- **thinkAbout:**
  - How does the frontier queue prioritize and respect robots.txt/per-host rate?
  - How do you dedup URLs and content and avoid traps?
  - How do you keep the index fresh with incremental recrawl?
- **modelAnswerOutline:**
  - Frontier/URL queue, politeness (robots.txt, per-host rate), and prioritization.
  - Dedup (URL and content hashing/shingling), trap avoidance, freshness recrawl.
  - Distributed fetching with connection reuse and DNS caching.
  - Storage of the crawled corpus and incremental updates.
  - Feed into an indexing pipeline (inverted index) downstream.
  - Common wrong turn: no politeness/rate limiting, getting the crawler blocked or trapped.

#### sd-l10-metrics-monitoring - Design a Metrics & Monitoring System (Prometheus/Datadog)

- **learnFocus:** High-cardinality write ingestion, time-series storage, rollups, and alerting.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** monitoring, time-series, alerting
- **applyPrompt:** Design a metrics platform that ingests millions of data points/sec and serves dashboards + alerts over them.
- **thinkAbout:**
  - How do you handle high-throughput ingestion and TSDB storage?
  - How do downsampling, rollups, and cardinality control bound cost?
  - How does alerting/rule evaluation work?
- **modelAnswerOutline:**
  - High-throughput ingestion pipeline, batching, and a TSDB.
  - Downsampling/rollups, retention tiers, and cardinality control (tags/labels).
  - Query engine for aggregations and dashboard read patterns.
  - Alerting/rule evaluation, deduplication, and notification integration.
  - Sharding by metric/time and hot vs cold storage.
  - Common wrong turn: unbounded tag cardinality that explodes storage and query cost.

#### sd-l10-ad-click-aggregator - Design an Ad Click Aggregator / Real-Time Analytics

- **learnFocus:** Streaming aggregation, dedup, and the batch/stream tradeoff at high volume.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** ad-aggregator, streaming, dedup
- **applyPrompt:** Design real-time aggregation of ad clicks producing per-campaign counts with fraud-resistant dedup.
- **thinkAbout:**
  - How do windowing and watermarks handle late clicks?
  - How do you dedup and count idempotently?
  - How does Lambda vs Kappa reconcile real-time with batch truth?
- **modelAnswerOutline:**
  - Stream processing (Flink/Kafka Streams), windowing, and watermarks for late data.
  - Exactly-once/idempotent counting and click dedup (bloom filters/IDs).
  - Lambda vs Kappa; reconcile real-time with batch truth.
  - Sharded counters and hot-campaign handling.
  - Fraud/bot filtering and out-of-order event handling.
  - Common wrong turn: naive per-event increments that double-count under at-least-once delivery.

#### sd-l10-leaderboard-topk - Design a Leaderboard / Top-K / Distributed Counter

- **learnFocus:** Building real-time leaderboards and high-throughput counters with sorted sets, sharded counters, and approximate structures.
- **difficulty:** medium | **estimatedMinutes:** 40 | **skills:** leaderboard, redis, approximation, case-study
- **applyPrompt:** Design a real-time global leaderboard and the counters behind it for a game with tens of millions of players, and justify your use of Redis sorted sets, sharded counters, and approximate structures for scale.
- **thinkAbout:**
  - How do you get a player's rank and the top-K without scanning everyone on every request?
  - What breaks when a single hot counter takes millions of increments per second?
  - Where is an approximate answer good enough, and which structure gives it cheaply?
- **modelAnswerOutline:**
  - Assume tens of millions of players, frequent score updates, and reads for both top-K and 'my rank and neighbors'.
  - Top-K and rank: a Redis sorted set (ZSET) keeps members ordered by score, giving O(log n) updates and O(log n + k) range reads for ZREVRANGE and ZREVRANK, which is the standard leaderboard primitive.
  - Scale the ZSET: shard by segment (region, league, time window) to bound each set's size, keep a smaller global top-N set merged from the shard tops, and snapshot periodically for all-time boards.
  - Distributed counters: a single hot key (global likes or views) becomes a write hotspot, so shard the counter into N sub-counters incremented independently and summed on read, trading read cost for write parallelism.
  - Approximate structures where exactness is not required: HyperLogLog for unique counts (unique players seen) at tiny memory, and Count-Min Sketch for heavy-hitter and top-K frequency estimates in streams, both trading bounded error for large memory savings.
  - Durability: Redis is the fast serving layer, but persist authoritative scores in a database and treat Redis as a rebuildable index, using write-behind or an event stream.
  - Real-time updates: push rank changes to clients via WebSocket or SSE, and recompute expensive global boards on a cadence rather than on every increment.
  - Common wrong turn: SELECT ... ORDER BY score LIMIT k with a COUNT-based rank query per request, which does a full sort or scan and collapses under load, plus a single global counter row that becomes a lock hotspot.

#### sd-l10-stock-exchange - Design a Stock Exchange / Order-Matching Engine

- **learnFocus:** Building a deterministic, low-latency order-matching engine with a single-writer in-memory order book and event-log recovery.
- **difficulty:** hard | **estimatedMinutes:** 45 | **skills:** low-latency, matching-engine, event-sourcing, case-study
- **applyPrompt:** Design a stock exchange order-matching engine targeting microsecond latency, and justify deterministic price-time-priority matching, single-writer sequencing, an in-memory order book, event-log replay recovery, and market-data fan-out.
- **thinkAbout:**
  - Why is a single-writer, in-memory design faster and more correct here than a sharded database?
  - How do you make matching fully deterministic so replay reproduces the exact same fills?
  - How do you recover state after a crash without losing or reordering orders?
- **modelAnswerOutline:**
  - Assume a single instrument's book must match orders fairly at microsecond latency with strict auditability, and the pattern is then replicated per instrument.
  - Matching rule: price-time priority (best price first, then earliest order at that price) over a limit order book, with limit, market, and cancel handled deterministically.
  - Single-writer sequencing: a sequencer assigns a total order to all inbound events and a single-threaded matching engine processes them from an in-memory ring buffer (LMAX Disruptor style), which avoids locks and gives cache-friendly determinism, while sharding by instrument across engines provides horizontal scale.
  - In-memory order book: keep price levels in arrays or intrusive structures for O(1) best-price access, with no per-order database round-trip on the hot path.
  - Determinism: the same ordered input must yield identical output, so avoid wall-clock decisions, random tie-breaks, and multi-threaded nondeterminism, and derive time and ids from the sequence.
  - Recovery: append every accepted event to a durable, replicated journal before matching, and on crash replay the journal (event sourcing) into a fresh engine to reconstruct the exact book, optionally from periodic snapshots to bound replay time.
  - Market-data fan-out and availability: publish trades and book deltas on a separate high-throughput multicast or streaming bus so slow subscribers cannot slow matching, and run hot-standby replicas that consume the same sequenced log and can take over deterministically, with pre-trade risk checks in front of the matcher.
  - Common wrong turn: putting the order book in a general-purpose transactional database with a lock per order, which adds milliseconds and nondeterminism and cannot reach microsecond latency.


---

## L11. Modern & Specialized Systems

_ML systems, LLM/GenAI infrastructure, real-time analytics, globally-consistent data, and IoT/time-series._

Slug: `specialized-systems` | Modules: 4 | Lessons: 15


### Module sd-l11-m1: ML Systems Design

Slug: `ml-systems` | 4 lessons


#### sd-l11-ml-blueprint - End-to-End ML System Blueprint

- **learnFocus:** Wiring data, features, training, serving, and a feedback loop into one production system.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** ml-systems, serving, drift
- **applyPrompt:** Design an ML platform that serves a click-through-rate model at 50k QPS with p99 < 30ms, retrains daily, and detects when the model degrades.
- **thinkAbout:**
  - How do the offline training plane and online serving plane differ?
  - How does a retrieval-ranking funnel keep heavy models off the hot path?
  - How do you detect drift and fall back when the model service is down?
- **modelAnswerOutline:**
  - Frame the ML problem: business metric -> ML objective -> proxy label; offline vs online metrics.
  - Two-plane architecture: offline training/batch pipeline vs low-latency online serving + a feedback log.
  - Latency/cost funnel: candidate generation -> ranking -> re-ranking to keep heavy models off the hot path.
  - Model registry, versioning, shadow/canary/A-B rollout, and rollback.
  - Monitoring: data/concept/prediction drift, feature-null alerts, ground-truth label delay.
  - Common wrong turn: no feedback/logging loop, so the system can never retrain or detect drift.

#### sd-l11-feature-store - Feature Stores & Training/Serving Skew

- **learnFocus:** Online-offline feature consistency, the top cause of silent production model failure.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** feature-store, training-serving-skew, point-in-time
- **applyPrompt:** Design a feature store that serves precomputed features online at single-digit-ms latency while guaranteeing the exact same feature values are used at train time.
- **thinkAbout:**
  - How do offline and online stores split responsibilities?
  - How does point-in-time correctness avoid label leakage?
  - How does a single feature definition eliminate skew?
- **modelAnswerOutline:**
  - Dual store: offline (warehouse/Parquet for point-in-time joins) vs online (Redis/DynamoDB) for low-latency reads.
  - Point-in-time correctness: join features as-of the event timestamp, not current values, to avoid leakage.
  - A single feature definition shared by both paths eliminates training/serving skew.
  - Batch vs streaming vs on-demand features and their freshness SLAs.
  - Feature registry, lineage, reuse, and high-cardinality cost.
  - Common wrong turn: ignoring training/serving skew and point-in-time correctness (label leakage).

#### sd-l11-realtime-recommendation - Real-Time Recommendation Systems

- **learnFocus:** The retrieval-ranking-reranking funnel under tight latency with real-time signals.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** recommendation, two-tower, ann
- **applyPrompt:** Design a home-feed recommender (short-video or e-commerce) that personalizes in real time from the user's last few clicks with p99 < 100ms.
- **thinkAbout:**
  - What are the stages of the candidate-to-ranking funnel?
  - How do two-tower embeddings + ANN retrieve candidates?
  - How do you handle cold start and feedback-loop bias?
- **modelAnswerOutline:**
  - Multi-stage funnel: candidate generation (two-tower + ANN) -> ranking -> re-ranking -> business-rule/diversity.
  - Two-tower embedding retrieval with ANN (HNSW/IVF); nightly refresh vs real-time.
  - Real-time signals via Kafka/Flink; near-line vs online split.
  - Cold start and exploration/exploitation (bandits) to avoid feedback-loop collapse.
  - Multi-task ranking (click, watch-time, conversion), calibration, diversity; offline replay + online A/B.
  - Common wrong turn: ignoring position/popularity bias and feedback loops in evaluation.

#### sd-l11-online-serving-rollout - Online Model Serving & Rollout

- **learnFocus:** Safely shipping and scaling model updates, distinct from stateless deploys.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** model-serving, rollout, fallback
- **applyPrompt:** Design the serving/rollout layer for a fraud model that must update multiple times per day without downtime and be instantly reversible.
- **thinkAbout:**
  - Which rollout strategy gives instant, reversible model updates?
  - How do you meet the feature-fetch latency budget on the serving path?
  - How do you degrade gracefully when the model service is down?
- **modelAnswerOutline:**
  - Shadow, canary, A/B, interleaving rollouts with automatic rollback on metric regression.
  - Batch vs real-time vs streaming inference; micro-batching for throughput.
  - Model registry, reproducible artifacts, weights separated from serving code.
  - Co-locate/cache online features to meet the serving latency budget.
  - Graceful degradation: cached predictions, simpler fallback model, default heuristics.
  - Common wrong turn: no fallback when the model or GPU service is unavailable.

### Module sd-l11-m2: LLM / GenAI Infrastructure

Slug: `llm-genai` | 7 lessons


#### sd-l11-rag-architecture - RAG (Retrieval-Augmented Generation) Architecture

- **learnFocus:** The default GenAI design: grounding LLM answers in private data with citations.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** rag, retrieval, grounding
- **applyPrompt:** Design a RAG system that answers employee questions over 10M internal documents with citations, sub-3s latency, and no hallucinated sources.
- **thinkAbout:**
  - What does the ingestion pipeline (chunking, embedding, indexing) require?
  - Why is a reranker and hybrid retrieval mandatory, not optional?
  - How do you enforce document-level access control at retrieval time?
- **modelAnswerOutline:**
  - Ingestion: parsing, chunking (size/overlap/semantic), metadata, incremental re-indexing on updates.
  - Hybrid retrieval (dense + BM25) then a cross-encoder reranker for precision.
  - Context assembly: top-k selection, context-window budgeting, dedup, citation templating.
  - Grounding/quality: guardrails against hallucination, 'I don't know', index freshness.
  - Evaluation: RAG triad (context relevance, faithfulness, answer relevance); enforce per-user doc auth at retrieval.
  - Common wrong turn: 'embed + top-k + prompt' with no reranker, no eval, and no access control.

#### sd-l11-vector-db-ann - Vector Databases & ANN Search

- **learnFocus:** Vector storage/index choices driving RAG latency, recall, cost, and freshness.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** vector-db, ann, hnsw
- **applyPrompt:** Design a vector search service holding 1B embeddings that returns top-20 neighbors in under 50ms with over 95% recall and supports metadata filtering.
- **thinkAbout:**
  - Which ANN index family fits your recall/latency/memory budget?
  - How does filtered/hybrid search interact with the index (pre vs post filter)?
  - When is pgvector enough vs a dedicated store?
- **modelAnswerOutline:**
  - ANN families: HNSW (graph, high recall, RAM-heavy) vs IVF/IVF-PQ (quantized) vs DiskANN (SSD-scale).
  - Recall vs latency vs memory knobs (ef_search, nprobe, quantization); exact search does not scale.
  - Filtered/hybrid search combining metadata predicates with similarity (pre vs post filter pitfalls).
  - Sharding, replication, and index build/refresh cost for streaming inserts and deletes.
  - Build vs buy: Pinecone/Weaviate/Qdrant/Milvus vs pgvector vs OpenSearch; re-embedding migrations.
  - Common wrong turn: assuming vector search is exact and free, ignoring recall/latency/memory.

#### sd-l11-model-gateway - Model Gateway / LLM Router / AI Gateway

- **learnFocus:** The control plane for cost, reliability, safety, and multi-provider strategy.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** model-gateway, llm-router, caching
- **applyPrompt:** Design an internal AI gateway that fronts multiple LLM providers for 100+ apps, enforcing per-team quotas, caching, failover, and safety filters.
- **thinkAbout:**
  - How does a unified API enable provider failover and routing?
  - How do semantic and exact caching cut cost/latency?
  - What safety and observability belong at the gateway?
- **modelAnswerOutline:**
  - Unified API over multiple providers/models with failover and load balancing.
  - Cost controls: per-tenant rate limiting, token budgets, cheap-model-first routing, usage metering.
  - Caching: exact-match and semantic caching of prompts/responses with invalidation.
  - Reliability: retries/backoff, timeouts, circuit breakers, streaming passthrough, degradation.
  - Safety/governance: prompt-injection and PII filtering, moderation, audit logging; token/cost dashboards.
  - Common wrong turn: no cost/quota controls or caching, so spend and latency balloon.

#### sd-l11-llm-inference-serving - LLM Inference Serving (GPU Economics)

- **learnFocus:** Serving LLMs efficiently, where GPU cost and latency dominate the budget.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** llm-inference, gpu, vllm
- **applyPrompt:** Design a self-hosted LLM inference service on a fixed GPU fleet that maximizes throughput while keeping time-to-first-token < 300ms.
- **thinkAbout:**
  - Why does KV-cache memory limit batch size, and how does paging help?
  - How does continuous batching improve throughput?
  - Which latency metrics (TTFT vs inter-token) matter, and how do you trade them?
- **modelAnswerOutline:**
  - KV cache + PagedAttention: memory fragmentation limits batch size; paging (vLLM) reclaims waste.
  - Continuous/in-flight batching vs static; chunked prefill and prefill/decode disaggregation.
  - Latency metrics: TTFT vs inter-token vs total; throughput vs latency under load.
  - Quantization (INT8/FP8/AWQ), tensor/pipeline parallelism, multi-GPU sharding.
  - Prefix caching for shared system prompts, speculative decoding, GPU-utilization autoscaling.
  - Common wrong turn: hand-waving cost with no KV cache, batching, or GPU-utilization story.

#### sd-l11-llm-agents - LLM Agents & Orchestration

- **learnFocus:** Tool-using agentic systems and their new reliability and safety failure modes.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** llm-agents, orchestration, tool-calling
- **applyPrompt:** Design an agent platform that lets an LLM plan multi-step tasks, call tools/APIs, and recover from failures without infinite loops or runaway cost.
- **thinkAbout:**
  - How does the orchestration loop bound steps, cost, and time?
  - How do you make side-effecting tools idempotent and sandboxed?
  - How do you defend against prompt injection through tool outputs?
- **modelAnswerOutline:**
  - Orchestration loop: planner + tool calling + a controller bounding steps, cost, and wall-clock time.
  - Tool/function schema design, structured-output validation, sandboxed execution of model actions.
  - Memory: short-term scratchpad, long-term vector/summary, durable resumable state.
  - Reliability: retries, idempotency for side-effecting tools, human-in-the-loop approval gates.
  - Safety: prompt-injection via tool outputs, permission scoping, audit trails; eval on task success.
  - Common wrong turn: no step/cost/time bounds, no idempotency, infinite-loop and runaway-cost risk.

#### sd-l11-llm-eval-guardrails - LLM Evaluation & Guardrails

- **learnFocus:** Eval and safety as first-class components for non-deterministic models.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** llm-eval, guardrails, safety
- **applyPrompt:** Design an evaluation and guardrail pipeline that gates every prompt/model change to a production LLM feature before rollout.
- **thinkAbout:**
  - What offline and online eval gates a change?
  - What input/output guardrails do you enforce?
  - How do you close the loop from production feedback into eval sets?
- **modelAnswerOutline:**
  - Offline eval sets, golden datasets, LLM-as-judge (with bias caveats), regression suites in CI.
  - Online eval: A/B tests, canary rollouts of prompts/models, live quality/guardrail metrics.
  - Guardrails: PII redaction, prompt-injection/jailbreak detection, toxicity/moderation, schema validation.
  - Hallucination/groundedness scoring and citation verification for RAG.
  - Human-in-the-loop labeling and feedback capture closing the loop into eval sets.
  - Common wrong turn: shipping prompt/model changes blind with no eval or guardrail story.

#### sd-l11-finetune-rag-prompting - Fine-Tuning vs RAG vs Prompting

- **learnFocus:** Choosing the adaptation strategy that trades cost, freshness, and quality.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** fine-tuning, rag, lora
- **applyPrompt:** Given a domain-specific assistant requirement, propose an architecture that decides among prompting, RAG, and fine-tuning and can evolve over time.
- **thinkAbout:**
  - When does each of prompting, RAG, and fine-tuning fit?
  - How do PEFT/LoRA adapters change the fine-tuning economics?
  - How does a data flywheel drive continuous improvement?
- **modelAnswerOutline:**
  - Decision framework: prompting for behavior, RAG for fresh/private knowledge, fine-tuning for style/format/latency.
  - PEFT/LoRA adapters and adapter hosting/multiplexing; full fine-tune rarely justified.
  - Data flywheel: capture production traces, distill to smaller/cheaper models.
  - Freshness: RAG index updates vs periodic re-tuning; avoid stale baked-in knowledge.
  - Model/adapter versioning, eval-gated promotion, and rollback.
  - Common wrong turn: fine-tuning for knowledge that changes, when RAG would keep it fresh.

### Module sd-l11-m3: Real-Time Analytics & Global Data

Slug: `realtime-global` | 2 lessons


#### sd-l11-streaming-realtime-analytics - Streaming / Real-Time Analytics Pipelines

- **learnFocus:** Real-time counting, metrics, and OLAP that underpin recsys signals and dashboards.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** real-time-analytics, streaming, olap
- **applyPrompt:** Design a real-time analytics system that shows near-real-time top-K trending items and per-minute event counts over a firehose of billions of events/day.
- **thinkAbout:**
  - What backbone and processing engine handle the firehose?
  - How do watermarks and windowing handle late/out-of-order events?
  - Which approximate algorithms scale counting and top-K?
- **modelAnswerOutline:**
  - Ingestion backbone: Kafka/Kinesis with partitioning, ordering, and backpressure/replay.
  - Stream processing (Flink/Spark), windowing (tumbling/sliding/session), watermarks, late events.
  - Exactly-once vs at-least-once, idempotent sinks, checkpointing; Lambda vs Kappa.
  - Serving via real-time OLAP (ClickHouse/Druid/Pinot) for sub-second aggregation.
  - Approximate structures: HyperLogLog (unique counts), Count-Min Sketch, top-K, t-digest.
  - Common wrong turn: exact counting at firehose scale instead of approximate structures.

#### sd-l11-globally-consistent-multiregion - Globally-Consistent Multi-Region Data

- **learnFocus:** Trading the speed of light against consistency for globally-distributed data.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** multi-region, spanner, geo-partitioning
- **applyPrompt:** Design a globally distributed database for user accounts/balances that gives low-latency local reads worldwide while preventing double-spend.
- **thinkAbout:**
  - Why do cross-region synchronous writes cost 100+ ms?
  - How do TrueTime/HLC and geo-partitioning enable local reads?
  - What conflict-resolution and consistency choices fit per workload?
- **modelAnswerOutline:**
  - CAP/PACELC in practice: cross-region synchronous writes cost 100+ ms.
  - Consensus + external consistency: Paxos/Raft quorums, Spanner TrueTime, deterministic ordering.
  - Data placement: geo-partitioning/pinning rows to home regions, follower/leader reads, read leases.
  - Active-active vs active-passive; conflict resolution via LWW vs CRDTs vs app merge.
  - Consistency spectrum (strong, bounded-staleness, causal, eventual) chosen per workload; RTO/RPO, residency.
  - Common wrong turn: claiming global strong consistency with low latency everywhere for free.

### Module sd-l11-m4: IoT, Edge & Time-Series

Slug: `iot-timeseries` | 2 lessons


#### sd-l11-iot-edge-ingestion - IoT / Edge Ingestion Architecture

- **learnFocus:** Massive device fleets with intermittent connectivity and huge write fan-out.
- **difficulty:** hard | **estimatedMinutes:** 40 | **skills:** iot, edge, mqtt
- **applyPrompt:** Design a platform ingesting telemetry from 10M IoT devices, tolerating offline devices, doing edge filtering, and enabling both real-time alerts and historical analytics.
- **thinkAbout:**
  - What belongs at the edge vs the cloud?
  - How do you handle intermittent connectivity and high write fan-out?
  - How do the hot (alerting) and cold (analytics) paths split?
- **modelAnswerOutline:**
  - Edge-cloud split: local filtering/aggregation/inference to cut bandwidth and enable low-latency control.
  - Device connectivity: MQTT/CoAP, offline buffering, store-and-forward at the edge.
  - Ingestion gateway: device provisioning/auth, backpressure, high write-fanout handling.
  - Command-and-control via device shadow/digital twin plus OTA firmware rollout.
  - Hot-path (alerting/anomaly) vs cold-path (batch analytics/ML) separation; per-device certs and rotation.
  - Common wrong turn: assuming devices are always online with no offline buffering or backpressure.

#### sd-l11-time-series-storage - Time-Series Databases & Storage Design

- **learnFocus:** The storage substrate for IoT, observability, and metrics with specialized patterns.
- **difficulty:** hard | **estimatedMinutes:** 35 | **skills:** time-series, cardinality, downsampling
- **applyPrompt:** Design a time-series store for high-frequency sensor metrics that ingests millions of points/sec and serves fast time-range + downsampled queries.
- **thinkAbout:**
  - Why is tag/label cardinality the dominant failure mode?
  - How do downsampling and tiering keep old data cheap?
  - Why is columnar + delta-of-delta compression a fit?
- **modelAnswerOutline:**
  - Append-heavy, high-cardinality: LSM storage, columnar + compression (delta-of-delta, Gorilla).
  - Time-partitioning/sharding by time + series; hot/warm/cold tiering and retention.
  - Downsampling/rollups and continuous aggregates keep old data cheap.
  - Cardinality explosion from tags/labels is the dominant failure mode; control it.
  - Query patterns: time-range scans, tag filters, aggregation, gap-filling; InfluxDB/Timescale/Prometheus/ClickHouse.
  - Common wrong turn: unbounded tag cardinality and no downsampling/retention tiering.

