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

const platformGitopsTeach = `
## Raw Kubernetes is a construction kit, not a product

Give 40 product teams a bare cluster and each one reinvents CI, deployment YAML, secrets wiring, ingress, dashboards, and on-call, badly and differently. That cognitive load is the tax that kills velocity. **Platform engineering** treats the internal developer experience as a product: a small platform team builds paved roads so the median engineer never touches the messy layers.

## The Internal Developer Platform

An **IDP** is the interface over that machinery. Over raw Kubernetes it adds three things a product team actually wants: **self-service golden paths** (scaffold a new service from a template, deploy it, and get logs/metrics/traces wired up with one command or one portal click), **abstraction** (the developer declares "I need a service with a Postgres and a queue," and the platform materializes the Terraform, Helm, and RBAC), and **guardrails** so the paved road is also the compliant road. The classic reference is Spotify's **Backstage**: a service catalog that answers who owns this, what depends on it, is it meeting its scorecard (has a runbook, passing security scan, defined SLO), plus software templates for scaffolding.

## GitOps

GitOps is the delivery control plane underneath. The principle: **Git is the single source of truth for desired state**, everything is declarative (Kubernetes manifests, Helm/Kustomize, Terraform), and an in-cluster **reconciler** (Argo CD or Flux) continuously compares desired state in Git to actual state in the cluster and converges them. You never \`kubectl apply\` from a laptop. To ship, you open a pull request that changes the manifest; merge triggers the agent to roll it out.

\`\`\`
  developer --> PR to config repo --> merge
                                        |
                          Argo CD / Flux (in cluster)
                                        |  reconcile loop
                          diff(desired in Git, actual)
                                        |
                                   apply / self-heal --> cluster
\`\`\`

Why Git as the source of truth: you get an audit log of every prod change (who, what, when, reviewed by whom) for free, rollback is \`git revert\`, drift is detected and auto-healed (someone hotfixes the cluster by hand, the reconciler reverts it back to Git), and disaster recovery is "point Argo at the repo and re-sync." Pull-based reconciliation is also more secure than push: no external CI system needs cluster-admin credentials.

## Guardrails as code

Instead of a review board that manually approves each deploy, you encode policy: **OPA/Gatekeeper or Kyverno** admission policies reject a manifest that has no resource limits, runs as root, or pulls an unsigned image. Templates bake in the right defaults. The paved road is faster than going around it, so people stay on it.

**Interview nuance:** supply-chain security belongs in the platform, not bolted on. Generate an **SBOM** at build, sign images with **cosign**, and attach **SLSA** provenance so the admission controller can verify "this image came from our pipeline, unmodified" before it runs.

**Interview nuance:** the failure mode to name is the **ticket-queue platform team**. If shipping still means filing a Jira ticket and waiting two days for the platform team to click deploy, you built a bottleneck, not a platform. Platform-as-product means self-service by default; the team's success metric is adoption and lead time, not tickets closed.

**Recap:** an IDP is a product that gives teams self-service golden paths (scaffold, deploy, observe) and abstraction over raw Kubernetes; GitOps makes Git the declarative source of truth with an Argo CD/Flux reconciler for audit, rollback, and self-healing; Backstage catalogs ownership and scorecards; guardrails as code (OPA/Kyverno) and supply-chain controls (SBOM, cosign, SLSA) replace gatekeeping; the anti-pattern is a ticket-queue platform team.
`.trim()

const iacProgressiveDeliveryTeach = `
## Two failure modes ruin infrastructure delivery

**Drift** (staging and prod diverge because someone made a manual console change, so a deploy that passed staging breaks prod) and **big-bang rollout** (you ship to 100% at once, and if it regresses you have already taken an outage before you notice). This lesson kills both.

## Infrastructure as Code fixes drift

Declare the desired infrastructure in **Terraform/OpenTofu or Pulumi**, keep it in Git, and apply through a pipeline, never by hand. Key discipline: **remote state with locking** (an S3 backend plus DynamoDB lock, or Terraform Cloud) so two engineers cannot corrupt state with concurrent applies, and **modules** so dev/staging/prod are the same module with different variable files. That gives **environment parity**: prod is staging with more replicas, not a different snowflake. Treat infra as **immutable**: to change a node you replace it, you do not SSH in and tweak it. Manual console changes are the cardinal sin because they are invisible to Git and cause the exact drift that makes staging a liar. You can catch drift by running \`terraform plan\` on a schedule and alerting on any non-empty diff.

**Environment promotion:** the same versioned artifact and same IaC modules flow dev to staging to prod. Config differs only by variables (replica counts, instance sizes, endpoints), ideally sourced from the same place, so promotion is "apply the tested module to the next environment," not "rebuild it."

## Progressive delivery fixes big-bang rollout

\`\`\`
  rolling     : replace pods N at a time; cheap, no extra capacity, slow to detect a bad version
  blue-green   : full parallel env, flip the router; instant rollback, but 2x capacity briefly
  canary       : send 1% -> 5% -> 25% -> 100%, watch metrics, auto-halt on regression
\`\`\`

For a **critical payments service** you want **canary with automated analysis and auto-rollback**. Tools: **Argo Rollouts** or **Flagger** shift traffic in steps, and between steps they **bake** (hold and observe) while querying Prometheus for your SLIs: error rate, p99 latency, and a business metric like payment-authorization-success-rate. If any metric breaches its threshold during the bake, the rollout **auto-aborts and shifts traffic back** to the stable version. No human in the loop at 3am. Blue-green is the alternative when you cannot tolerate two versions serving simultaneously (it flips atomically) but it costs double capacity during the window.

**Feature flags decouple deploy from release.** Deploying code and releasing a feature become separate events: ship the code dark behind a flag (LaunchDarkly, Unleash, or a homegrown flag service), then turn it on for 1% of users independent of the deploy. This means you can roll back a *feature* instantly without redeploying, and you can deploy risky code safely because it is inert until flagged on.

**Interview nuance:** database migrations are the trap in any progressive rollout. Canary assumes old and new code run simultaneously, so a **destructive migration in one deploy** (drop a column the old version still reads) breaks the stable version mid-canary. Use **expand/contract** (a.k.a. parallel-change): first expand (add the new column, write to both, backfill), deploy code reading the new shape, then in a later deploy contract (drop the old column) once nothing reads it. Migrations must be backward-compatible across at least one version.

**Recap:** IaC (Terraform/OpenTofu) with remote-state locking and shared modules gives environment parity and kills drift; never make manual console changes; promote the same artifact dev to staging to prod; use canary with automated metric analysis and auto-rollback (Argo Rollouts/Flagger) for a payments service, blue-green when versions cannot coexist; feature flags decouple deploy from release; and use expand/contract so a migration never breaks the version still running during a canary.
`.trim()

const cloudFinopsTeach = `
## Cost is a design axis

Cost is a design axis, not an afterthought you hand to finance. **FinOps** is the practice of making engineering, finance, and product jointly own cloud spend, and it runs as a continuous loop of three pillars:

\`\`\`
  Inform   -> tag/allocate: know who spends what, per team/service/feature
  Optimize -> rightsize, kill idle, buy commitments, use spot
  Operate  -> governance: budgets, alerts, anomaly detection, accountability
\`\`\`

## Inform first

You cannot optimize what you cannot see. Enforce a **tagging/labeling policy** (team, service, environment, cost-center) so the bill maps to owners; untagged resources are the black hole where waste hides. Build a **showback/chargeback** view so each team sees its own spend.

## Optimize compute

- **Rightsizing**: most instances are provisioned for a peak that rarely comes. Size to **P90/P95 utilization** over a representative window, not to a static "just in case" ceiling and not to the max (which one spike inflates). Automate it; manual rightsizing rots.
- **Spot/preemptible** instances (60-90% cheaper) for **fault-tolerant** work: batch jobs, CI, stateless workers, ML training with checkpointing. Not for a stateful primary that cannot tolerate a 2-minute eviction.
- **Commitments**: savings plans or reserved instances for your steady-state baseline (the load that is always on), on-demand/spot for the spiky top.
- **Autoscaling and scale-to-zero**: scale with load, and scale non-prod and bursty services to zero when idle. A dev cluster running 24/7 for a 9-to-5 team is ~70% waste.

## Kubernetes cost is opaque

The cloud bill shows you *nodes* (EC2 instances), but you run *many apps per node*, so the bill cannot tell you that the recommendations service costs $8k/mo while payments costs $2k/mo. You fix visibility with **OpenCost or Kubecost**, which allocate node cost down to namespace/pod/label using each workload's requests and actual usage. That only works if workloads are **consistently labeled** (team, service), which loops back to Inform. Then you find the real K8s waste: **over-requested resources** (a pod requesting 4 CPU and using 0.3 pins capacity nobody uses) and **low bin-packing** (nodes half-empty because requests are inflated). Rightsize requests to P90/P95 usage and let the cluster autoscaler consolidate.

## Data and egress are the sneaky levers

**Data-transfer/egress** charges are easy to ignore and brutal at scale: inter-AZ traffic (keep chatty services zone-aligned), cross-region replication, and internet egress (a CDN both speeds delivery and cuts origin egress). **Storage tiering**: move cold objects from hot storage to infrequent-access/archive tiers (S3 Intelligent-Tiering/Glacier). **Warehouse query cost**: a single unpartitioned full-table scan in BigQuery/Snowflake can cost more than a server; partition, cluster, and cache. And the current top concern is **AI/GPU spend**: GPUs are expensive and often idle between jobs, so batch and bin-pack inference, use spot for training with checkpointing, and right-size the model to the task.

**Interview nuance:** never cut cost by cutting reliability blindly. Deleting a standby replica or a multi-AZ setup saves money until the outage costs 10x the savings. Frame every cut as "reduce waste (idle, over-provisioned, untiered) while preserving the reliability the SLO requires."

**Recap:** run FinOps as Inform (tag/allocate) -> Optimize (rightsize to P90/P95, spot for fault-tolerant work, commitments for baseline, scale-to-zero) -> Operate (budgets, anomaly detection); fix opaque Kubernetes cost with OpenCost/Kubecost plus consistent labels and rightsized requests; and do not ignore egress/inter-AZ transfer, storage tiering, warehouse scans, and GPU spend.
`.trim()

const oltpVsOlapTeach = `
## Two workloads that want opposite things

Every data-intensive system eventually splits into two workloads that want opposite things from a database, and confusing them is how you take down checkout with a dashboard.

## OLTP: row store, normalized

**OLTP (Online Transaction Processing)** is your product's operational database: place an order, update a balance, mark a message read. The access pattern is many small, high-concurrency transactions, each touching a few rows by primary key or a narrow index. You want low write latency (single-digit ms), strong isolation, and thousands of concurrent connections. The physical layout that serves this is a **row store**: a row's columns are stored contiguously, so fetching or updating one whole record is one disk/page read. Postgres, MySQL, and DynamoDB are OLTP engines. The schema is **normalized** to avoid update anomalies.

## OLAP: column store, denormalized

**OLAP (Online Analytical Processing)** is your analytics engine: revenue by region by day, funnel conversion, cohort retention. The access pattern is a few huge queries that scan millions to billions of rows but touch only a handful of columns, aggregating as they go. The layout that serves this is a **column store**: each column is stored contiguously, so a \`SUM(revenue) GROUP BY region\` reads only the \`revenue\` and \`region\` columns off disk and skips the other 40. Because a column holds one data type with low cardinality, columnar data compresses 5x to 20x (run-length, dictionary, delta encoding), which means less I/O, and engines run **vectorized execution** (process a batch of column values per CPU instruction) instead of row-at-a-time. Snowflake, BigQuery, ClickHouse, and Redshift are OLAP engines, usually fed a **denormalized star schema** (fact table plus dimension tables) so a query joins less.

\`\`\`
  row store (OLTP)                 column store (OLAP)
  [id|name|region|rev] [id|...]    [id,id,id,...] [region,region,...] [rev,rev,...]
  read one row = 1 page            SUM(rev) reads only the rev column, compressed
\`\`\`

## Never run analytics on the OLTP primary

A single \`GROUP BY\` scan over the orders table evicts your hot rows from the buffer pool, holds read locks or MVCC snapshots that bloat, saturates I/O, and burns the connection your checkout path needed. The analytical query might run for 30 seconds; during those 30 seconds your p99 checkout latency triples. Isolation is not optional, it is the whole point.

## How data moves OLTP to OLAP

Three patterns. **ETL** (extract, transform, then load) transforms before loading, classic for warehouses. **ELT** (load raw, transform in the warehouse) is now dominant because warehouse compute is cheap and elastic. **CDC/streaming** tails the OLTP write-ahead log and streams changes continuously. The axis is freshness vs simplicity: a nightly batch load is simple and fine for finance reporting; a real-time dashboard needs CDC or streaming and more moving parts.

**Interview nuance:** a read replica is not an analytics store. A Postgres replica is still a row store with OLTP layout; pointing dashboards at it isolates the primary from lock contention but still runs column-scan queries on a row engine, which is slow and steals replica resources. Use a replica for read scaling of OLTP-shaped queries, and a real column store for analytics.

**Recap:** OLTP is row-store, normalized, small high-concurrency transactions (Postgres/DynamoDB); OLAP is column-store, denormalized star schema, huge scans with compression and vectorized execution (Snowflake/BigQuery/ClickHouse); never analyze on the OLTP primary because scans destroy transactional latency; move data via ETL, ELT, or CDC trading freshness for simplicity.
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

\`\`\`
  bronze  raw, append-only, exactly as ingested (audit + replay source)
  silver  cleaned, deduped, conformed, joined; schema enforced
  gold    business-level aggregates / marts, serving BI and ML features
\`\`\`

Each layer has an owner and a contract; downstream consumers read gold, data engineers own the promotion between layers. This is governance you can actually enforce.

## Separation of storage and compute

The enabler underneath all of this. In old Redshift/on-prem warehouses, storage and compute were coupled on the same nodes, so to store more you paid for more compute and vice versa, and one workload starved another. In the lake/lakehouse (and modern Snowflake/BigQuery) storage is object storage and compute is separate, elastic clusters. That means you scale them independently (cheap to store 50TB, spin up compute only when querying), run **multiple engines on one copy** (Spark for ML, Trino for interactive SQL, Flink for streaming, all reading the same Iceberg tables), and give each team its own compute so they do not contend.

**Interview nuance:** "lakehouse" without a catalog and table format is just a lake with good intentions. The ACID, schema evolution, and time travel come specifically from the table format plus a catalog, not from putting Parquet on S3. If someone says "lakehouse" ask what table format and catalog, that is where the substance is.

**Recap:** warehouse is schema-on-write, curated, strong BI/governance, pricey for raw data; lake is schema-on-read, cheap object storage, risks becoming a swamp; lakehouse gets lake economics plus warehouse features via open table formats and a catalog; use the medallion (bronze/silver/gold) pattern for governed refinement; separating storage and compute lets you scale independently and run many engines on one copy.
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

## Log-based CDC

You want every insert/update/delete in Postgres to flow to analytics and a search index in near-real-time. The right mechanism is **log-based CDC**: **Debezium** reads the database's replication log (Postgres WAL, MySQL binlog) and emits a change event per row mutation. Log-based beats the alternatives: query-based polling (\`WHERE updated_at > x\`) misses deletes and hard-hits the DB, and trigger-based CDC adds write-path latency. Reading the log is low impact and captures every change including deletes, in commit order.

## The dual-write problem and the outbox

The trap: your service writes to Postgres and then also writes to Kafka (or directly to the search index). These are two systems with no shared transaction, so a crash between them leaves you inconsistent forever: the order is in the DB but the event never published, or published but the DB rolled back. You cannot fix this with retries because you do not know which write succeeded.

The fix is the **transactional outbox**: within the same DB transaction that writes the order, insert a row into an \`outbox\` table. The business write and the event are now atomic (one transaction). CDC then tails the WAL, sees the outbox insert, and publishes it to Kafka. There is exactly one source of truth (the DB log) and no distributed transaction.

\`\`\`
  service --tx--> [orders row + outbox row]  (one Postgres commit)
                          |
                   Debezium reads WAL
                          v
                        Kafka --> search index (Elasticsearch)
                              --> lakehouse sink (Iceberg via Flink)
\`\`\`

Because delivery is **at-least-once** (a connector can replay after a crash), downstream consumers must be **idempotent**: upsert by primary key into the search index and the Iceberg table so a redelivered event does not duplicate. Iceberg/Hudi upserts (merge-on-read or copy-on-write) handle this on the lake side.

**Interview nuance:** the outbox does not give you exactly-once end-to-end, it gives you at-least-once with an atomic source write, and you achieve effective exactly-once by making consumers idempotent. Claiming true exactly-once across DB, Kafka, and a search index without idempotency is the tell of someone who has not run this in production.

**Recap:** table formats (Iceberg/Delta/Hudi/Paimon) add ACID, schema/partition evolution, time travel, and hidden partitioning over Parquet, coordinated by a catalog; pick Iceberg for multi-engine, Hudi for upsert-heavy CDC; use log-based CDC (Debezium on the WAL/binlog) plus a transactional outbox to avoid the dual-write problem; delivery is at-least-once so make consumers idempotent for effective exactly-once.
`.trim()

const batchStreamingTeach = `
## One processing path or two?

The last piece is how data is processed over time, and the central interview question is whether you need two processing paths or one. Getting this right saves you from maintaining two codebases that slowly disagree.

## Batch vs streaming

A throughput-versus-latency tradeoff. **Batch** processes a bounded chunk (yesterday's events) on a schedule: high throughput, simple correctness (you have all the data before you compute), high latency (results are hours old). Spark and classic MapReduce are batch engines. **Streaming** processes an unbounded flow event by event: low latency (seconds), continuous, but correctness is harder because data arrives late, out of order, and you must decide when a window is "done." Flink and Spark Structured Streaming are streaming engines, fed by a durable log (Kafka, Pulsar).

## Lambda architecture

The first mainstream answer to "I need both fast and correct." It runs **two parallel layers**: a **batch layer** that reprocesses all history nightly to produce accurate, complete results, and a **speed layer** that processes the live stream for low-latency approximate results, with a serving layer merging the two so recent data comes from the speed layer and older data from the batch layer. It works and is self-correcting (the batch layer eventually overwrites any speed-layer approximation). The cost is brutal: you implement the **same business logic twice**, once in a batch engine and once in a streaming engine, in different code, and they drift. Every metric change is two implementations to keep in sync.

## Kappa architecture

The reaction: delete the batch layer. There is **one streaming path**, and the durable log (Kafka) is the system of record with long retention. If you need to recompute history (bug fix, new metric), you **replay the log** from the beginning through the same streaming code. One codebase, one set of logic, no drift. Kappa is the default for new systems when the streaming engine can express your logic and the log retention is affordable.

\`\`\`
  Lambda                          Kappa
  events -> batch layer  \\        events -> Kafka (retained) -> stream job -> serving
         -> speed layer  -> serve                   ^                |
  (two codebases, merged)                            +-- replay to recompute
\`\`\`

## Event-time, watermarks, and delivery

**Processing-time** is when your job sees an event; **event-time** is when it actually happened. A phone offline in a tunnel sends events with an event-time from 10 minutes ago. If you window by processing-time you put those events in the wrong bucket and your per-minute counts are wrong. So you window by **event-time**, and a **watermark** is the engine's assertion "I believe I have now seen all events up to time T," which lets it close the window for T and emit results. Late events arriving after the watermark are handled by policy: drop them, or emit an updated result (allowed lateness). Watermarks are the explicit tradeoff between latency (advance aggressively, emit fast, risk dropping late data) and completeness (wait longer, more correct, higher latency).

**Delivery semantics.** **At-least-once** can double-count; **exactly-once** requires the engine to coordinate checkpoints with idempotent/transactional sinks. Flink provides exactly-once via distributed checkpointing (Chandy-Lamport) plus two-phase-commit sinks. For a fraud counter or a financial total this matters; for a rough traffic dashboard at-least-once is fine.

## Streaming-into-lakehouse collapses the two paths

The modern move that makes Kappa practical for reporting too: **Flink writes the stream directly into Iceberg** tables (exactly-once). Now the live stream powers the real-time signal, and the same Iceberg tables it lands in are queried by batch SQL (Trino, Spark) for nightly reports. One pipeline feeds both the real-time consumer and the reporting consumer, so you no longer maintain a separate batch path at all.

**Interview nuance:** do not reflexively say "Lambda" because you need both real-time and batch outputs. State the condition: Lambda is justified only when the batch engine can express something the stream cannot, or when you need a periodic full-reprocessing guarantee the stream cannot give cheaply. Otherwise Kappa plus log replay plus streaming-into-lakehouse gives you both outputs from one codebase, and that is the stronger default answer.

**Recap:** batch is high-throughput/high-latency and simple, streaming is low-latency/continuous and correctness-hard; Lambda runs parallel batch and speed layers (accurate but two codebases that drift), Kappa runs one streaming path and replays the retained log to recompute; window by event-time with watermarks to handle late/out-of-order data trading latency for completeness; choose exactly-once where counts must be exact; and Flink-into-Iceberg collapses real-time and reporting into one pipeline.
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
            "An IDP is a product that gives teams self-service golden paths (scaffold, deploy, observe) and abstraction over raw Kubernetes; GitOps makes Git the declarative source of truth with an Argo CD/Flux reconciler for audit, rollback, and self-healing; guardrails as code (OPA/Kyverno) and supply-chain controls (SBOM, cosign, SLSA) replace gatekeeping; the anti-pattern is a ticket-queue platform team.",
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
            "IaC with remote-state locking and shared modules gives environment parity and kills drift; never make manual console changes; promote the same artifact dev to staging to prod; use canary with automated metric analysis and auto-rollback for a payments service, blue-green when versions cannot coexist; feature flags decouple deploy from release; and use expand/contract so a migration never breaks the version still running during a canary.",
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
              "**IaC and parity.** Everything is **Terraform** (or OpenTofu) with an S3 + DynamoDB **remote state with locking** per region. Dev/staging/prod are the *same modules* with different `.tfvars` (replica count, instance class, region endpoints), so prod is staging scaled up, not a snowflake. All applies go through the pipeline; no console changes. A nightly `terraform plan` runs against each environment and alerts on any non-empty diff to catch out-of-band drift. Two regions are the same module instantiated twice, keeping them identical by construction.",
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
            "Run FinOps as Inform (tag/allocate) -> Optimize (rightsize to P90/P95, spot for fault-tolerant work, commitments for baseline, scale-to-zero) -> Operate (budgets, anomaly detection); fix opaque Kubernetes cost with OpenCost/Kubecost plus consistent labels and rightsized requests; and do not ignore egress/inter-AZ transfer, storage tiering, warehouse scans, and GPU spend.",
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
            "OLTP is row-store, normalized, small high-concurrency transactions (Postgres/DynamoDB); OLAP is column-store, denormalized star schema, huge scans with compression and vectorized execution (Snowflake/BigQuery/ClickHouse); never analyze on the OLTP primary because scans destroy transactional latency; move data via ETL, ELT, or CDC trading freshness for simplicity.",
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
            "Warehouse is schema-on-write, curated, strong BI/governance, pricey for raw data; lake is schema-on-read, cheap object storage, risks becoming a swamp; lakehouse gets lake economics plus warehouse features via open table formats and a catalog; use the medallion (bronze/silver/gold) pattern for governed refinement; separating storage and compute lets you scale independently and run many engines on one copy.",
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
            "Table formats (Iceberg/Delta/Hudi/Paimon) add ACID, schema/partition evolution, time travel, and hidden partitioning over Parquet, coordinated by a catalog; pick Iceberg for multi-engine, Hudi for upsert-heavy CDC; use log-based CDC (Debezium on the WAL/binlog) plus a transactional outbox to avoid the dual-write problem; delivery is at-least-once so make consumers idempotent for effective exactly-once.",
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
            "Batch is high-throughput/high-latency and simple, streaming is low-latency/continuous and correctness-hard; Lambda runs parallel batch and speed layers (accurate but two codebases that drift), Kappa runs one streaming path and replays the retained log to recompute; window by event-time with watermarks to handle late/out-of-order data trading latency for completeness; choose exactly-once where counts must be exact; and Flink-into-Iceberg collapses real-time and reporting into one pipeline.",
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
