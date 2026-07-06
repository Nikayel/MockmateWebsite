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

const containersK8sTeach = `
## Build small immutable images

A container is an immutable OCI image: your app plus its exact dependencies, built once and run everywhere. The senior habit is to build small and clean. A multi-stage build compiles in a fat builder image and copies only the artifact into a distroless or Alpine base, so the shipped image is 20 to 80 MB instead of 800 MB, pulls fast, and has almost no OS packages for a CVE scanner to flag. The image is immutable: you never \`ssh\` in and patch a running container, you build a new image and replace the old one.

## The core Kubernetes objects

Kubernetes schedules those images onto nodes and keeps the declared state true:

- **Pod:** the smallest unit, one or more co-located containers sharing a network namespace. You rarely create Pods directly.
- **Deployment:** manages a ReplicaSet of identical, interchangeable stateless Pods. The default for a web API.
- **StatefulSet:** stable network identity and stable per-Pod storage for stateful workloads (each Pod gets \`pod-0\`, \`pod-1\` and keeps its own PersistentVolume across restarts).
- **DaemonSet:** one Pod per node, for agents like log shippers or a CNI.
- **Service:** a stable virtual IP and DNS name load-balancing across a set of Pods.
- **Ingress / Gateway API:** L7 north-south routing into the cluster.
- **ConfigMap / Secret:** non-secret and secret config injected as env vars or files, kept out of the image.

## Scheduling controls

Every container should set resource **requests** (what the scheduler reserves) and **limits** (the hard ceiling). Requests plus limits determine the **QoS class**: \`Guaranteed\` (requests == limits) is evicted last, \`BestEffort\` (nothing set) is evicted first under node pressure. Use **affinity/anti-affinity** and **taints/tolerations** to spread replicas across zones, and a **PodDisruptionBudget** so a voluntary drain never takes more than N Pods down at once.

## Probes drive safe rollouts

- **startupProbe:** gates the other two until a slow-booting app is up, so a cold JVM is not killed prematurely.
- **readinessProbe:** decides whether the Pod receives traffic. A failing readiness probe pulls the Pod out of the Service endpoints without killing it.
- **livenessProbe:** decides whether to restart the Pod. A failing liveness probe triggers a kill and restart.

A rolling update stays zero-downtime because new Pods must pass readiness before old Pods are terminated. Set \`maxUnavailable: 0\` and \`maxSurge: 1\` and Kubernetes brings up a new ready Pod before removing an old one, so capacity never dips.

**Interview nuance:** the tell of a weak answer is treating K8s as "a magic scaling button." The strong answer says the app must be stateless (no local session, no local disk) for a Deployment to work, and that readiness probes, not liveness probes, are what make a rollout safe.

**Recap:** build small immutable images, use Deployments for stateless and StatefulSets for stateful, set requests/limits and a PodDisruptionBudget, and let readiness probes gate a \`maxUnavailable: 0\` rolling update to stay zero-downtime.
`.trim()

const k8sAutoscalingTeach = `
## Four scalers, four problems

Elastic scaling, matching capacity to load automatically, is the core reason to run cloud-native. There are four distinct scalers and they solve different problems; naming them precisely is the interview signal.

- **HPA (Horizontal Pod Autoscaler):** adds and removes Pod replicas to hit a target metric. The workhorse for stateless services.
- **VPA (Vertical Pod Autoscaler):** right-sizes a Pod's CPU/memory requests. Useful for workloads that cannot scale horizontally, but it usually restarts the Pod to apply, so it does not fight HPA on the same metric.
- **Cluster Autoscaler / Karpenter:** adds and removes **nodes** when Pods cannot be scheduled (Pending) or when nodes are underused. HPA makes more Pods; the cluster autoscaler makes room for them.
- **KEDA (Kubernetes Event-Driven Autoscaling):** scales on external event sources (Kafka lag, SQS depth, Redis list length, cron) and, critically, can **scale to zero** when the source is empty.

## Scale on the right signal

The most important senior point is that CPU is the default HPA metric and it is often wrong. For a web API, requests-per-second or p99 latency tracks user experience far better than CPU, which may sit low while the service is latency-bound on a downstream. For a queue consumer, the correct signal is **queue depth or consumer lag**: if 100,000 messages are backed up, you want to scale on that backlog directly, not on the CPU of the current workers (which may look fine while the backlog grows unbounded). Use custom or external metrics (via the metrics adapter or KEDA) and set a percentile target, for example keep p99 under 200 ms rather than average CPU at 70 percent.

## Scale-to-zero and cold starts

Scaling to zero saves money on spiky, event-driven work, but the first request after zero pays a cold start: pull image, boot process, warm caches, which can be hundreds of ms to seconds. Mitigations: keep a small **warm pool** (a floor of 1 to 2 replicas so you never fully cold-start on the user path), use **provisioned/pre-warmed concurrency**, and shrink the image and boot path. The decision is explicit: pure scale-to-zero for a nightly batch or a rare webhook, a warm floor for anything a user waits on synchronously.

**Diurnal and spiky patterns:** for predictable daily cycles use **scheduled or predictive scaling** to pre-provision before the morning ramp so autoscaling is not racing the traffic wave. To avoid **flapping** (rapidly scaling up and down around the threshold), set **stabilization windows** and sensible scale-down delays so a brief dip does not tear down capacity you will need again in 30 seconds.

**Interview nuance:** if you say "scale on CPU" for an event-driven or latency-bound service, a strong interviewer will push: "what if CPU is at 40 percent but the queue has a million messages?" The correct answer scales on backlog or p99, and uses KEDA for the queue-depth and scale-to-zero case.

**Recap:** pick the scaler to the problem (HPA Pods, cluster autoscaler nodes, KEDA events with scale-to-zero), scale on the signal that reflects user pain (RPS, p99, queue depth) not reflexive CPU, and blunt cold starts with a warm floor and stabilization windows.
`.trim()

const serviceMeshTeach = `
## A mesh manages east-west traffic

A service mesh manages **east-west** traffic: service-to-service calls inside the cluster. Its job is to move cross-cutting network concerns out of every application's code and into a uniform infrastructure layer:

- **Security:** automatic **mTLS** between services (zero-trust: every call authenticated and encrypted, no plaintext on the wire), plus authorization policy (service A may call service B).
- **Traffic control:** retries, timeouts, circuit breaking, and **traffic splitting / shifting** (send 5 percent to v2 for a canary) without touching app code.
- **Observability:** uniform L7 telemetry, golden metrics, and distributed-trace context for every hop, whatever language each service is written in.

## The sidecar model and its tax

The classic implementation is the **sidecar** model: a proxy (Envoy) is injected into every Pod, and all traffic goes app -> local sidecar -> remote sidecar -> app. This is powerful but not free. Every Pod now runs an extra container, so a 40-service fleet with hundreds of Pods pays real memory and CPU per Pod (tens of MB each, adding up to GBs cluster-wide), and every hop adds mTLS and proxy latency (often 1 to several ms per call, which compounds across a deep call graph). Operationally you now run and upgrade a fleet of proxies, which is real "proxy sprawl."

## The sidecarless / ambient shift

The 2024 to 2025 shift is meshes that cut this tax:

- **Istio Ambient** splits the mesh into a per-node L4 component (ztunnel) handling mTLS for all Pods on the node, plus an optional per-namespace L7 proxy (waypoint) only where you need retries/splitting. Most Pods pay no per-Pod proxy.
- **Cilium** pushes mTLS and L4 policy into the kernel via **eBPF**, avoiding a userspace proxy hop for much of the work.

The win is fewer proxies, lower per-Pod memory, and lower latency for the common L4 path, while keeping mTLS everywhere. Ambient/eBPF meshes reached GA maturity around 2025 and are the direction of new adoption. **Gateway API** is the converging standard for both north-south and (via GAMMA) east-west config, which lets you swap the underlying implementation with less lock-in than the older bespoke CRDs.

## A mesh is not always warranted

For a handful of services, you can get mTLS from the platform, retries and timeouts from a shared client library, and metrics from your framework, without operating a mesh. Mesh adoption has actually declined for small fleets precisely because the operational cost outweighs the benefit until you have dozens of services in multiple languages where per-language libraries stop being viable.

**Interview nuance:** the strong answer is not "add Istio." It is "at 40 services in mixed languages, a mesh is justified because you cannot keep mTLS and retry logic consistent across five client libraries, and I would choose ambient/eBPF to avoid the per-Pod sidecar tax." The weak answer adds a mesh reflexively for three services.

**Recap:** a mesh moves mTLS, retries/timeouts, traffic shifting, and L7 telemetry out of app code; sidecars cost memory and latency per Pod, ambient/eBPF (Istio Ambient, Cilium) cut that tax and are the 2025 direction, and for a small fleet a mesh is often not worth it.
`.trim()

const cloudNative12factorTeach = `
## The factors are a design lens

The 12-factor methodology and cloud-native principles are a checklist for building an app that a platform can run, replace, and scale automatically. In an interview they are a **design lens**: when asked to make a service container-ready, walk the factors and name the specific change for each, rather than saying "make it cloud-native" as a vibe. The four that carry most of the weight:

## Config in the environment

Config and secrets live outside the image, in env vars, a ConfigMap, or a secrets manager. The payoff is **one immutable artifact** promoted unchanged from dev to staging to prod (dev/prod parity). The moment you bake an environment-specific config file into the image, you need a different build per environment, and parity is gone. A baked-in database URL or API key is the classic anti-pattern.

## Stateless, disposable processes

A process must hold no state that another instance would need. No in-memory session that only lives on one box, no user files written to local disk. Move session to **Redis**, files to **object storage (S3)**. Then any instance can serve any request, and the platform can start a new instance or kill an old one at any moment. "Disposable" also means **fast startup** and **graceful shutdown**: on **SIGTERM** the process stops taking new work, drains in-flight requests, and exits, so a scale-down or node drain loses nothing.

## Backing services as attached resources

Databases, caches, queues, and blob stores are attached by **URL and credentials**, not compiled in. A local Postgres and a managed Aurora are the same "attached resource" to the app, so you can swap one for the other by changing config, with no code change. This is what makes an instance truly interchangeable across environments.

## Build, release, run separation, and immutable infrastructure

**Build** produces an image, **release** binds that image to a config to make a versioned, immutable release, and **run** executes it. You never mutate a running box; to change anything you build a new image and replace instances. This is what makes rollback trivial (re-run the previous release) and eliminates config drift.

## Design for failure

In a cloud-native world instances vanish routinely: spot reclamation, autoscale scale-in, node drains, zone loss. So health checks, retries, and graceful shutdown are **required, not optional**, and logs must stream to **stdout** as an event stream for the platform to collect (never written to a local file that dies with the instance).

**Interview nuance:** the highest-signal move is to walk a specific legacy service through the checklist and name the concrete change per factor: "session is in local memory -> move to Redis; uploads go to local disk -> move to S3; config is a baked-in \`app.conf\` -> move to env vars." That specificity is what separates a strong answer from reciting the factor names.

**Recap:** config in the environment (one image everywhere), stateless disposable processes (Redis session, S3 files, graceful SIGTERM), backing services attached by URL, and immutable build/release/run separation, all so a process is safe to kill and restart anywhere at any time.
`.trim()

const serverlessFaasTeach = `
## FaaS removes capacity management

Function-as-a-Service (AWS Lambda, Google Cloud Functions, Azure Functions) removes capacity management: you deploy a stateless function, the platform runs one isolated instance per concurrent request, scales that fleet from zero to thousands in seconds, and bills per invocation by GB-seconds of memory-time plus a per-request fee. There are no idle servers to pay for and no autoscaling group to tune. That is the whole pitch, and it is genuinely transformative for spiky, unpredictable, or glue-code workloads.

## Cold starts

The catch is the execution model. Each function instance handles exactly one request at a time, so 500 concurrent requests means 500 warm instances. When no warm instance is free, the platform provisions a fresh one: download the package, start the runtime, initialize your code. That is a **cold start**, and it costs roughly 100ms for a lean Node or Python function up to 1s or more for a fat Java or .NET package, or a function that must attach an ENI to reach a VPC. Users on the p99 tail feel exactly those cold starts.

Mitigations, in order of leverage: **provisioned concurrency** (pay to keep N instances warm, which brings back a slice of the always-on cost you were trying to escape), **smaller deployment packages and fewer heavy imports** so init is faster, **keeping the function out of a VPC** or using VPC-native networking to skip ENI attachment, and lazy-loading SDK clients so you only initialize what a given request needs. Warm-ping hacks help marginally but do not scale to real concurrency.

## The hard constraints

- **Execution-time limit:** Lambda caps at 15 minutes. Anything longer must be chunked or moved to a container or batch job.
- **Statelessness:** no local disk you can rely on across invocations and no in-process cache that survives. State goes to DynamoDB, S3, Redis (ElastiCache/MemoryDB), or a managed queue.
- **Concurrency caps:** accounts have a regional concurrency limit (often 1000 by default). A traffic spike can throttle you, and a downstream database with a 200-connection pool will melt long before Lambda does. Use reserved concurrency and a connection proxy (RDS Proxy) to protect stores.
- **Cold-start-sensitive latency** and **vendor lock-in** (triggers, IAM, and event shapes are provider-specific).

Multi-step logic does not belong inside one giant function. Orchestrate it with **Step Functions** or a durable-workflow engine: each step is its own function, retries and timeouts are declarative, and you get a visual execution history instead of a 900-second monolith.

**Interview nuance:** the cost model inverts at high steady load. FaaS is priced for bursty utilization; if a function runs flat-out 24/7, per-invocation billing costs several times what an equivalently sized, well-utilized container or reserved instance would. The crossover is roughly when sustained utilization passes ~40 to 60 percent. Saying "serverless is cheaper" without "for spiky load" is the tell of someone who has not seen the bill.

\`\`\`
UPLOAD --> S3 event --> Lambda (per-file, stateless, auto-scale)
                              |  cold start 100ms-1s+
                              |  15-min cap, concurrency cap
                       write result --> S3 / DynamoDB
   multi-step? --> Step Functions orchestrates N small functions
\`\`\`

**Recap:** FaaS trades capacity management for per-invocation billing and instant scale, which wins for spiky event-driven glue but loses on cold-start latency, hard execution limits, statelessness, and a cost model that inverts against containers under high steady load.
`.trim()

const edgeWasmTeach = `
## Edge compute runs your code close to users

Edge compute runs your code in the CDN's points of presence (Cloudflare has hundreds worldwide), physically close to users, so a request can be answered without a round trip to a distant origin region. The headline is latency: **time-to-first-byte under 50ms globally** with no bespoke multi-region infrastructure of your own. But the thing that makes edge compute practical is not just location, it is the runtime.

## V8 isolates and WASM

Container-based FaaS boots an OS-level sandbox per function, which is why cold starts are 100ms to 1s+. Edge platforms like **Cloudflare Workers** instead run **V8 isolates**: many tenants share one V8 process, each request gets a lightweight isolate (the same isolation a browser tab uses), and spinning one up is **under 5ms**, effectively no cold start. There is no VM or container to provision. **WebAssembly (WASM)** goes further: a precompiled WASM module can start in **sub-millisecond** time and lets you run Rust, Go, or C at the edge, not just JavaScript. The tradeoff for this speed is a constrained runtime: strict CPU-time budgets per request (tens of milliseconds of CPU, not seconds), small memory, and **no full Node.js API surface** (no arbitrary filesystem, limited native modules). You write to a web-standard API, not to Node.

## What belongs where

Put at the **edge** the lightweight, latency-sensitive work on the request path: geo/device **routing**, **auth and JWT verification** (reject a bad token in the PoP instead of after a trans-oceanic hop), **A/B assignment**, header rewrites, **personalization** of otherwise-cached pages, bot filtering, and cache logic. Keep at the **origin** the heavy or stateful work: large database transactions, big compute, anything needing the full Node ecosystem, and any operation requiring **strong consistency**.

## The edge data constraint

That last point is the real constraint. Edge data stores are built for reads-everywhere, not strong writes. **Workers KV** is eventually consistent with propagation that can take seconds; edge caches and **regional read replicas** serve stale-tolerant reads fast. Newer primitives shift the tradeoff: **Durable Objects** give you single-threaded strong consistency for one key by pinning it to one location (so you pay latency for writes to that object), and **D1** offers a SQL database at the edge. But the general rule holds: you cannot get globally strong, low-latency writes for free, so edge data must be either read-mostly, eventually consistent, or explicitly pinned.

**Interview nuance:** the two failure modes interviewers listen for are (1) pushing heavy compute or a full Node app to the edge and hitting the CPU-time and API limits, and (2) putting strong-consistency data (balances, inventory, idempotency keys) in eventually consistent edge KV and getting stale reads or lost updates. Also flag that **observability is harder**: your code runs in hundreds of PoPs, so you lean on the platform's aggregated logs and tracing rather than SSHing into a box.

\`\`\`
USER --> nearest PoP (V8 isolate, <5ms start / WASM <1ms)
            | route, auth/JWT, A/B, personalize, cache
            | strong-consistency data? --> origin
            v
          ORIGIN region: DB txns, heavy compute, full Node
   edge data: KV (eventual), read replicas, Durable Objects (pinned strong)
\`\`\`

**Recap:** V8 isolates start in under 5ms and WASM sub-ms, so edge compute delivers global sub-50ms TTFB for lightweight request-path work like routing, auth, and personalization, while heavy compute and strong-consistency data stay at the origin because edge runtimes are CPU/memory/API constrained and edge data is eventually consistent by default.
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
            "Build small immutable images, use Deployments for stateless and StatefulSets (or a managed DB) for stateful, set requests/limits and a PodDisruptionBudget, and let readiness probes gate a maxUnavailable: 0 rolling update to stay zero-downtime.",
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
              "Design the Kubernetes rollout strategy for Shopify's storefront API during Black Friday, where a bad deploy can lose revenue at 40,000+ RPS and you cannot tolerate a single failed request window. Specify how you keep the rollout zero-downtime and instantly reversible under peak load.",
            thinkAbout: [
              "Why is a plain rolling update too coarse at this scale?",
              "How does progressive delivery with automated analysis bound the blast radius?",
              "What pre-scaling and freeze controls protect the peak window?",
            ],
            modelAnswerOutline: [
              "Assumptions: 40k+ RPS across many zones, revenue-critical, deploys frozen at the very peak but still needed for hotfixes. The goal is not just zero-downtime but instant, blameless reversibility.",
              "**Baseline:** a Deployment with hundreds of replicas, requests/limits tuned so autoscaling headroom exists, zone anti-affinity, and a PodDisruptionBudget that keeps `minAvailable` high enough that node maintenance never dents peak capacity. Readiness probes check real downstream health (DB pool, cache, payment gateway) so a Pod that cannot serve real traffic is pulled from endpoints.",
              "**Rollout:** a plain rolling update is too coarse at this scale because a bad build reaches many users before you notice. Use **progressive delivery** with Argo Rollouts: a canary that shifts 1 percent, then 5, 25, 50, 100, with a bake time at each step and automated analysis on p99 latency, 5xx rate, and checkout success. If any metric breaches its SLO gate, the rollout **auto-aborts and rolls back** to the previous ReplicaSet in seconds, because the old version is still running. `maxUnavailable: 0` guarantees capacity never dips during the shift.",
              "**Blast-radius controls:** pre-scale before the traffic wave (scheduled scaling) so the deploy is not competing with an autoscale event, keep `maxSurge` small in absolute Pod count so a bad image does not consume the whole cluster, and gate risky changes behind a feature flag so you can dark-launch and flip off without a redeploy. During the absolute peak, enforce a deploy freeze except for flag flips and validated hotfixes.",
              "Common wrong turn: a single big-bang rolling update with only a liveness probe, which exposes every user to a regression before you can react, and no automated metric gate, so rollback depends on a human noticing a revenue dip.",
            ],
          },
        },
        {
          id: "sd-l9-k8s-autoscaling",
          title: "Autoscaling & Elasticity",
          summary:
            "Pick the scaler to the problem (HPA Pods, cluster autoscaler nodes, KEDA events with scale-to-zero), scale on the signal that reflects user pain (RPS, p99, queue depth) not reflexive CPU, and blunt cold starts with a warm floor and stabilization windows.",
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
              "**The two-minute ramp is the crux:** reactive autoscaling alone is too slow because node provisioning plus image pull plus consumer rebalance can eat 30 to 90 seconds while lag explodes. So combine reactive with **predictive/scheduled pre-scaling**: the Super Bowl is on the calendar, so pre-provision a warm pool of nodes and a higher replica floor minutes before halftime. You do not autoscale into a known spike, you pre-warm for it and let reactive scaling handle the residual.",
              "**Cost control after the spike:** aggressive but **stabilized** scale-down (a stabilization window so a brief lull does not tear down capacity mid-event), spot instances for the burst tier, and return to a low floor once lag is durably back to baseline. Overprovision headroom is bounded to the event window, not left on all year.",
              "**Guardrails:** cap max replicas so a poison-message loop or a stuck downstream cannot trigger unbounded scaling and a cost blowout, and page on sustained lag that scaling is not resolving (a sign the bottleneck is downstream, not compute).",
              "Common wrong turn: relying purely on reactive CPU-based HPA for a known, calendar-driven 10x spike, so capacity arrives a minute late and every early order breaches its SLA during the highest-revenue window of the year.",
            ],
          },
        },
        {
          id: "sd-l9-service-mesh",
          title: "Service Mesh (Sidecar vs Sidecarless/Ambient/eBPF)",
          summary:
            "A mesh moves mTLS, retries/timeouts, traffic shifting, and L7 telemetry out of app code; sidecars cost memory and latency per Pod, ambient/eBPF (Istio Ambient, Cilium) cut that tax and are the 2025 direction, and for a small fleet a mesh is often not worth it.",
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
              "**Sidecar vs ambient:** the classic sidecar (Envoy per Pod) works but at this fleet size the tax is significant: hundreds of sidecars cost GBs of cluster memory and add 1 to several ms of proxy+mTLS latency per hop, compounding across a deep call graph and hurting p99. I choose an **ambient / eBPF** mesh: **Istio Ambient** (per-node ztunnel for mTLS/L4, waypoint proxies only in namespaces that need L7 retries/splitting) or **Cilium** (mTLS and L4 policy in the kernel via eBPF). This gives mTLS everywhere with far fewer proxies, lower per-Pod memory, and a cheaper L4 path, while still allowing full L7 features where I actually need them. I express routing through the **Gateway API** to keep the implementation swappable.",
              "**Rollout:** start L4 (mTLS everywhere, cheap), then add L7 waypoints only for the services doing canaries or complex retries, so I pay the L7 cost only where it earns its keep.",
              "Common wrong turn: defaulting to a full per-Pod Envoy sidecar mesh for the whole fleet and eating the memory and latency tax on every hop, when ambient/eBPF delivers the same mTLS at a fraction of the cost; or the opposite error of adding a mesh reflexively when the fleet is too small to justify it.",
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
              "**Architecture:** keep a mesh (at 250 services it is unambiguously justified) but move to **ambient/eBPF** to cut the tax. Istio Ambient gives per-node ztunnel mTLS for all Pods (satisfying 'encrypted and authenticated on every hop' cheaply at L4) with waypoint L7 proxies only where authz policy, retries, or traffic shifting are needed. mTLS gives the compliance property (mutual auth + encryption) and the mesh emits uniform authz decisions and L7 telemetry that feed the audit trail. Cross-region traffic goes over east-west gateways with mTLS preserved.",
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
            "Config in the environment (one image everywhere), stateless disposable processes (Redis session, S3 files, graceful SIGTERM), backing services attached by URL, and immutable build/release/run separation, all so a process is safe to kill and restart anywhere at any time.",
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
            "FaaS trades capacity management for per-invocation billing and instant scale, which wins for spiky event-driven glue but loses on cold-start latency, hard execution limits, statelessness, and a cost model that inverts against containers under high steady load.",
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
              "**Cold starts:** keep the resize function lean (a slim runtime plus a native image library, not a 300MB kitchen-sink package), lazy-load the SDK, and keep it out of a VPC so there is no ENI attach penalty. For the latency-sensitive moderation path I add modest **provisioned concurrency** sized to the typical baseline so steady traffic never pays a cold start, while bursts above that spill into on-demand instances.",
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
            "V8 isolates start in under 5ms and WASM sub-ms, so edge compute delivers global sub-50ms TTFB for lightweight request-path work like routing, auth, and personalization, while heavy compute and strong-consistency data stay at the origin because edge runtimes are CPU/memory/API constrained and edge data is eventually consistent by default.",
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
  ],
}
