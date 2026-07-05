> Module **sd-l9-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l9-m1](./sd-l9-m1.md) · Next: [sd-l9-m3](./sd-l9-m3.md)

# L9 · Containers & Orchestration

By the end of this module you can specify a production Kubernetes deployment (workload objects, probes, zero-downtime rollouts), design autoscaling that reacts to the right signal instead of reflexively scaling on CPU, decide when a service mesh earns its cost and when it is overhead, and use the 12-factor and cloud-native principles as an explicit lens to make a legacy stateful service safe to run and scale in containers.

### sd-l9-containers-k8s: Containers & Kubernetes Fundamentals

- **id:** `sd-l9-containers-k8s`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** kubernetes, containers, probes

#### Learn

A container is an immutable OCI image: your app plus its exact dependencies, built once and run everywhere. The senior habit is to build small and clean. A multi-stage build compiles in a fat builder image and copies only the artifact into a distroless or Alpine base, so the shipped image is 20 to 80 MB instead of 800 MB, pulls fast, and has almost no OS packages for a CVE scanner to flag. The image is immutable: you never `ssh` in and patch a running container, you build a new image and replace the old one.

Kubernetes is the orchestrator that schedules those images onto nodes and keeps the declared state true. The core objects you must be able to name:

- **Pod:** the smallest unit, one or more co-located containers sharing a network namespace. You rarely create Pods directly.
- **Deployment:** manages a ReplicaSet of identical, interchangeable stateless Pods. This is the default for a web API.
- **StatefulSet:** stable network identity and stable per-Pod storage for stateful workloads (each Pod gets `pod-0`, `pod-1` and keeps its own PersistentVolume across restarts).
- **DaemonSet:** one Pod per node, for agents like log shippers or a CNI.
- **Service:** a stable virtual IP and DNS name load-balancing across a set of Pods.
- **Ingress / Gateway API:** L7 north-south routing into the cluster.
- **ConfigMap / Secret:** non-secret and secret config injected as env vars or files, kept out of the image.

Scheduling controls matter in interviews. Every container should set resource **requests** (what the scheduler reserves) and **limits** (the hard ceiling). Requests plus limits determine the **QoS class**: `Guaranteed` (requests == limits) is evicted last, `BestEffort` (nothing set) is evicted first under node pressure. Use **affinity/anti-affinity** and **taints/tolerations** to spread replicas across zones, and a **PodDisruptionBudget** so a voluntary drain never takes more than N Pods down at once.

Probes are how Kubernetes knows a Pod is healthy, and they drive safe rollouts:

- **startupProbe:** gates the other two until a slow-booting app is up, so a cold JVM is not killed prematurely.
- **readinessProbe:** decides whether the Pod receives traffic. A failing readiness probe pulls the Pod out of the Service endpoints without killing it.
- **livenessProbe:** decides whether to restart the Pod. A failing liveness probe triggers a kill and restart.

A rolling update stays zero-downtime because new Pods must pass readiness before old Pods are terminated. Set `maxUnavailable: 0` and `maxSurge: 1` and Kubernetes brings up a new ready Pod before removing an old one, so capacity never dips.

**Interview nuance:** the tell of a weak answer is treating K8s as "a magic scaling button." The strong answer says the app must be stateless (no local session, no local disk) for a Deployment to work, and that readiness probes, not liveness probes, are what make a rollout safe.

Recap: build small immutable images, use Deployments for stateless and StatefulSets for stateful, set requests/limits and a PodDisruptionBudget, and let readiness probes gate a `maxUnavailable: 0` rolling update to stay zero-downtime.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the Kubernetes deployment for a stateless web API plus a stateful Postgres: specify the workload objects, health probes, and how a rolling update stays zero-downtime.

**Think about:**
- Which workload objects fit stateless vs stateful?
- How do liveness/readiness/startup probes drive a safe rollout?
- Why prefer a managed DB over self-hosting state in K8s?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an HTTP API doing a few thousand RPS, config and secrets external to the image, and Postgres as the primary datastore. Availability target is zero-downtime deploys and rolling node maintenance.

Stateless API: a **Deployment** with, say, 6 replicas behind a **Service** (ClusterIP) and an **Ingress/Gateway** for TLS and north-south routing. The image is a multi-stage distroless build. Config comes from a **ConfigMap**, secrets from a **Secret** (ideally backed by an external secrets manager). Set requests (250m CPU / 256Mi) and limits, spread replicas with zone anti-affinity, and add a **PodDisruptionBudget** of `minAvailable: 5` so a drain never drops below capacity.

Probes: a **readinessProbe** hitting `/readyz` that returns 200 only when the app can reach Postgres and its caches, a **livenessProbe** on a cheap `/livez` that only fails on a genuinely wedged process, and a **startupProbe** if boot is slow so liveness does not kill a warming instance. The API must be stateless: session in Redis, uploads in S3, nothing on local disk, so any replica serves any request.

Zero-downtime rollout: a RollingUpdate with `maxUnavailable: 0, maxSurge: 1`. Kubernetes starts a new Pod, waits for its readiness probe to pass, adds it to the Service endpoints, then terminates one old Pod. Because new capacity is ready before old capacity leaves, live traffic never hits a cold or missing Pod. Add a `preStop` hook plus `terminationGracePeriodSeconds` so draining Pods finish in-flight requests after SIGTERM.

Stateful Postgres: if self-hosting, a **StatefulSet** with a **PersistentVolumeClaim** template so each Pod keeps stable identity and storage, plus a headless Service. But the committed recommendation is to **not** self-host the primary database. Use a managed service (RDS/Cloud SQL/Aurora) for backups, failover, patching, and PITR, and let Kubernetes run only the stateless tier. Self-hosting stateful databases means owning replication, failover, and storage durability yourself, which is a large operational burden for no product benefit.

Common wrong turn: putting Postgres in a plain Deployment (Pods are interchangeable, so a reschedule can corrupt or lose the volume), or relying on a livenessProbe to gate rollout traffic when readiness is the correct gate.

**Self-check rubric:**
- [ ] Did I use a Deployment for the stateless API and a StatefulSet (or managed DB) for Postgres, not a plain Deployment for state?
- [ ] Did I distinguish readiness (traffic gate) from liveness (restart) and startup (slow-boot gate)?
- [ ] Did I make the rollout zero-downtime with `maxUnavailable: 0` and readiness gating plus graceful shutdown?
- [ ] Did I externalize state (Redis session, S3 files) so replicas are interchangeable?
- [ ] Did I justify preferring a managed DB over self-hosting Postgres in K8s?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the Kubernetes rollout strategy for Shopify's storefront API during Black Friday, where a bad deploy can lose revenue at 40,000+ RPS and you cannot tolerate a single failed request window. Specify how you keep the rollout zero-downtime and instantly reversible under peak load.

**Model answer (revealed on demand):**

Assumptions: 40k+ RPS across many zones, revenue-critical, deploys frozen at the very peak but still needed for hotfixes. The goal is not just zero-downtime but instant, blameless reversibility.

Baseline: a Deployment with hundreds of replicas, requests/limits tuned so autoscaling headroom exists, zone anti-affinity, and a PodDisruptionBudget that keeps `minAvailable` high enough that node maintenance never dents peak capacity. Readiness probes check real downstream health (DB pool, cache, payment gateway) so a Pod that cannot serve real traffic is pulled from endpoints.

Rollout: a plain rolling update is too coarse at this scale because a bad build reaches many users before you notice. Use **progressive delivery** with Argo Rollouts: a canary that shifts 1 percent, then 5, 25, 50, 100, with a bake time at each step and automated analysis on p99 latency, 5xx rate, and checkout success. If any metric breaches its SLO gate, the rollout **auto-aborts and rolls back** to the previous ReplicaSet in seconds, because the old version is still running and healthy. `maxUnavailable: 0` guarantees capacity never dips during the shift.

Blast-radius controls: pre-scale before the traffic wave (scheduled scaling) so the deploy is not competing with an autoscale event, keep `maxSurge` small in absolute Pod count so a bad image does not consume the whole cluster, and gate risky changes behind a feature flag so you can dark-launch and flip off without a redeploy. During the absolute peak, enforce a deploy freeze except for flag flips and validated hotfixes.

Common wrong turn: a single big-bang rolling update with only a liveness probe, which exposes every user to a regression before you can react, and no automated metric gate, so rollback depends on a human noticing a revenue dip.

### sd-l9-k8s-autoscaling: Autoscaling & Elasticity

- **id:** `sd-l9-k8s-autoscaling`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** autoscaling, keda, elasticity

#### Learn

Elastic scaling, matching capacity to load automatically, is the core reason to run cloud-native. There are four distinct scalers and they solve different problems; naming them precisely is the interview signal.

- **HPA (Horizontal Pod Autoscaler):** adds and removes Pod replicas to hit a target metric. This is the workhorse for stateless services.
- **VPA (Vertical Pod Autoscaler):** right-sizes a Pod's CPU/memory requests. Useful for workloads that cannot scale horizontally, but it usually restarts the Pod to apply, so it does not fight HPA on the same metric.
- **Cluster Autoscaler / Karpenter:** adds and removes **nodes** when Pods cannot be scheduled (Pending) or when nodes are underused. HPA makes more Pods; the cluster autoscaler makes room for them.
- **KEDA (Kubernetes Event-Driven Autoscaling):** scales on external event sources (Kafka lag, SQS depth, Redis list length, cron) and, critically, can **scale to zero** when the source is empty.

The most important senior point is **scale on the right signal**. CPU is the default HPA metric and it is often wrong. For a web API, requests-per-second or p99 latency tracks user experience far better than CPU, which may sit low while the service is latency-bound on a downstream. For a queue consumer, the correct signal is **queue depth or consumer lag**: if 100,000 messages are backed up, you want to scale on that backlog directly, not on the CPU of the current workers (which may look fine while the backlog grows unbounded). Use custom or external metrics (via the metrics adapter or KEDA) and set a percentile target, for example keep p99 under 200 ms rather than average CPU at 70 percent.

**Scale-to-zero and cold starts** are the classic tradeoff. Scaling to zero saves money on spiky, event-driven work, but the first request after zero pays a cold start: pull image, boot process, warm caches, which can be hundreds of ms to seconds. Mitigations: keep a small **warm pool** (a floor of 1 to 2 replicas so you never fully cold-start on the user path), use **provisioned/pre-warmed concurrency**, and shrink the image and boot path. The decision is explicit: pure scale-to-zero for a nightly batch or a rare webhook, a warm floor for anything a user waits on synchronously.

**Diurnal and spiky patterns:** for predictable daily cycles use **scheduled or predictive scaling** to pre-provision before the morning ramp so autoscaling is not racing the traffic wave. To avoid **flapping** (rapidly scaling up and down around the threshold), set **stabilization windows** and sensible scale-down delays so a brief dip does not tear down capacity you will need again in 30 seconds.

**Interview nuance:** if you say "scale on CPU" for an event-driven or latency-bound service, a strong interviewer will push: "what if CPU is at 40 percent but the queue has a million messages?" The correct answer scales on backlog or p99, and uses KEDA for the queue-depth and scale-to-zero case.

Recap: pick the scaler to the problem (HPA Pods, cluster autoscaler nodes, KEDA events with scale-to-zero), scale on the signal that reflects user pain (RPS, p99, queue depth) not reflexive CPU, and blunt cold starts with a warm floor and stabilization windows.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design autoscaling for a service with spiky, event-driven load: choose the scalers, set the target metrics, and handle scale-to-zero cold starts.

**Think about:**
- When is a queue-depth or RPS signal better than CPU?
- How do HPA, VPA, cluster autoscaler, and KEDA differ?
- How do you hide cold starts on a spike?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a worker service consuming from a queue (SQS/Kafka) with bursty load, near-idle for long stretches then spikes to tens of thousands of messages in minutes. Cost matters (we want to shed capacity when idle) but so does drain time (backlog must clear within an SLA).

Signal: scale on **queue depth / consumer lag**, not CPU. The backlog directly measures how far behind we are; CPU can read 40 percent while a million messages pile up because the bottleneck is a downstream API, not local compute. I would target something like "keep messages-per-replica under 500" or "keep lag under 30 seconds."

Scalers: **KEDA** as the primary autoscaler because it reads the queue source natively, drives the HPA under the hood, and supports **scale-to-zero** for the idle periods. **HPA** (which KEDA manages) adds worker Pods as lag rises. **Cluster Autoscaler or Karpenter** provisions nodes when the new Pods go Pending, and reclaims them when the spike drains, so we pay for nodes only during bursts. **VPA** is optional here for right-sizing the worker's memory request, kept off the same scaling metric so it does not fight HPA.

Cold starts on the spike: pure scale-to-zero means the first burst pays image pull plus boot before anything drains. Mitigations: keep a **warm floor** of 1 to 2 replicas rather than true zero if the SLA is tight, so there is always a live consumer, or accept zero for cost and shrink the cold-start cost with a small image and fast boot. Pre-pull the image onto warm nodes, and if bursts are somewhat predictable, use **scheduled scaling** to pre-provision just before the expected wave.

Anti-flap: set a **stabilization window** and a scale-down delay so a momentary dip in lag does not tear down workers we will immediately need again, which would thrash nodes and re-pay cold starts.

Common wrong turn: scaling on CPU, so the service looks healthy while the backlog grows unbounded and the SLA is silently breached, or scaling to zero on a latency-critical path and forcing every burst's first users through a cold start.

**Self-check rubric:**
- [ ] Did I scale on queue depth / lag (or RPS / p99) rather than reflexive CPU, and say why?
- [ ] Did I correctly distinguish HPA (Pods), cluster autoscaler/Karpenter (nodes), VPA (right-size), KEDA (events + scale-to-zero)?
- [ ] Did I address cold starts with a warm floor, provisioned concurrency, or pre-warming?
- [ ] Did I add stabilization windows / scale-down delays to prevent flapping?
- [ ] Did I make the scale-to-zero vs warm-floor decision explicitly against the SLA?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the autoscaling for DoorDash's order-events pipeline during a Super Bowl halftime spike, where order volume jumps 10x in under two minutes and delayed order processing directly loses revenue and breaks delivery promises. Specify the scalers, signals, and how you avoid both cold-start lag and runaway cost.

**Model answer (revealed on demand):**

Assumptions: steady baseline load with a sudden 10x spike in under two minutes, a hard SLA that an order is processed within a few seconds, and strong cost sensitivity the rest of the day. The dominant risk is that scaling lags the spike and orders queue past the SLA.

Signal and scalers: scale the order-processing consumers on **Kafka consumer lag** via **KEDA**, targeting a small lag budget (for example under 5 seconds). KEDA drives HPA to add Pods as lag climbs; **Karpenter** provisions nodes fast when Pods go Pending, using a mix of on-demand for the warm floor and spot for burst capacity to control cost.

The two-minute ramp is the crux: reactive autoscaling alone is too slow because node provisioning plus image pull plus consumer rebalance can eat 30 to 90 seconds while lag explodes. So combine reactive with **predictive/scheduled pre-scaling**: the Super Bowl is on the calendar, so pre-provision a warm pool of nodes and a higher replica floor minutes before halftime. This is the difference between a strong answer and a naive one: you do not autoscale into a known spike, you pre-warm for it and let reactive scaling handle the residual.

Cost control after the spike: aggressive but **stabilized** scale-down (a stabilization window so a brief lull does not tear down capacity mid-event), spot instances for the burst tier, and return to a low floor once lag is durably back to baseline. Overprovision headroom is bounded to the event window, not left on all year.

Guardrails: cap max replicas so a poison-message loop or a stuck downstream cannot trigger unbounded scaling and a cost blowout, and page on sustained lag that scaling is not resolving (a sign the bottleneck is downstream, not compute).

Common wrong turn: relying purely on reactive CPU-based HPA for a known, calendar-driven 10x spike, so capacity arrives a minute late and every early order breaches its SLA during the highest-revenue window of the year.

### sd-l9-service-mesh: Service Mesh (Sidecar vs Sidecarless/Ambient/eBPF)

- **id:** `sd-l9-service-mesh`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** service-mesh, ebpf, mtls

#### Learn

A service mesh manages **east-west** traffic: service-to-service calls inside the cluster. Its job is to move cross-cutting network concerns out of every application's code and into a uniform infrastructure layer:

- **Security:** automatic **mTLS** between services (zero-trust: every call authenticated and encrypted, no plaintext on the wire), plus authorization policy (service A may call service B).
- **Traffic control:** retries, timeouts, circuit breaking, and **traffic splitting / shifting** (send 5 percent to v2 for a canary) without touching app code.
- **Observability:** uniform L7 telemetry, golden metrics, and distributed-trace context for every hop, whatever language each service is written in.

The classic implementation is the **sidecar** model: a proxy (Envoy) is injected into every Pod, and all traffic goes app -> local sidecar -> remote sidecar -> app. This is powerful but not free. Every Pod now runs an extra container, so a 40-service fleet with hundreds of Pods pays real memory and CPU per Pod (tens of MB each, adding up to GBs cluster-wide), and every hop adds mTLS and proxy latency (often 1 to several ms per call, which compounds across a deep call graph). Operationally you now run and upgrade a fleet of proxies, which is real "proxy sprawl."

The 2024 to 2025 shift is **sidecarless / ambient** meshes that cut this tax:

- **Istio Ambient** splits the mesh into a per-node L4 component (ztunnel) handling mTLS for all Pods on the node, plus an optional per-namespace L7 proxy (waypoint) only where you need retries/splitting. Most Pods pay no per-Pod proxy.
- **Cilium** pushes mTLS and L4 policy into the kernel via **eBPF**, avoiding a userspace proxy hop for much of the work.

The win is fewer proxies, lower per-Pod memory, and lower latency for the common L4 path, while keeping mTLS everywhere. Ambient/eBPF meshes reached GA maturity around 2025 and are the direction of new adoption.

**Gateway API** is the converging standard for both north-south and (via GAMMA) east-west config, which lets you express routing declaratively and swap the underlying implementation (Istio, Cilium, Linkerd) with less lock-in than the older bespoke CRDs.

The senior judgment call: **a mesh is not always warranted.** For a handful of services, you can get mTLS from the platform, retries and timeouts from a shared client library, and metrics from your framework, without operating a mesh. Mesh adoption has actually declined for small fleets precisely because the operational cost outweighs the benefit until you have dozens of services in multiple languages where per-language libraries stop being viable.

**Interview nuance:** the strong answer is not "add Istio." It is "at 40 services in mixed languages, a mesh is justified because you cannot keep mTLS and retry logic consistent across five client libraries, and I would choose ambient/eBPF to avoid the per-Pod sidecar tax." The weak answer adds a mesh reflexively for three services.

Recap: a mesh moves mTLS, retries/timeouts, traffic shifting, and L7 telemetry out of app code; sidecars cost memory and latency per Pod, ambient/eBPF (Istio Ambient, Cilium) cut that tax and are the 2025 direction, and for a small fleet a mesh is often not worth it.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add mTLS, retries, and per-service traffic shifting to a 40-service cluster; decide sidecar vs ambient/eBPF mesh and justify the choice on cost and latency.

**Think about:**
- What does a mesh move out of application code?
- What is the sidecar cost, and what does ambient/eBPF change?
- When is a mesh not warranted?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 40 microservices in mixed languages (Go, Java, Python, Node), hundreds of Pods, a zero-trust requirement (mTLS everywhere), and a need for consistent retries/timeouts and safe canary rollouts. Latency budgets are tight on the hot call graph.

Is a mesh justified here? Yes. At 40 services in 4 languages you cannot keep mTLS, retry policy, timeouts, and circuit breaking consistent across four client libraries; that inconsistency is exactly where outages and security gaps live. A mesh gives one uniform layer for all of it, language-agnostic. (If this were 3 services I would decline the mesh and use platform mTLS plus a shared library.)

What the mesh provides: automatic **mTLS** for zero-trust east-west, **retries/timeouts/circuit-breaking** declared as policy, **traffic splitting** for per-service canaries (5 percent to v2, watch metrics, ramp), and uniform L7 telemetry and trace propagation across every hop, all without editing 40 codebases.

Sidecar vs ambient: the classic sidecar (Envoy per Pod) works but at this fleet size the tax is significant. Hundreds of sidecars cost GBs of cluster memory and add 1 to several ms of proxy+mTLS latency on every hop, which compounds across a deep call graph and hurts p99. I would choose an **ambient / eBPF** mesh: **Istio Ambient** (per-node ztunnel for mTLS/L4, waypoint proxies only in namespaces that need L7 retries/splitting) or **Cilium** (mTLS and L4 policy in the kernel via eBPF). This gives mTLS everywhere with far fewer proxies, lower per-Pod memory, and a cheaper L4 path, while still allowing full L7 features where I actually need retries and traffic shifting. I would express routing through the **Gateway API** to keep the implementation swappable.

Rollout: start L4 (mTLS everywhere, cheap), then add L7 waypoints only for the services doing canaries or complex retries, so I pay the L7 cost only where it earns its keep.

Common wrong turn: defaulting to a full per-Pod Envoy sidecar mesh for the whole fleet and eating the memory and latency tax on every hop, when ambient/eBPF delivers the same mTLS at a fraction of the cost; or the opposite error of adding a mesh reflexively when the fleet is too small to justify it.

**Self-check rubric:**
- [ ] Did I name what the mesh removes from app code (mTLS, retries/timeouts, traffic split, L7 telemetry)?
- [ ] Did I quantify the sidecar tax (per-Pod memory, per-hop mTLS latency) and how ambient/eBPF reduces it?
- [ ] Did I pick ambient/eBPF (Istio Ambient / Cilium) with a concrete reason at 40 services, not just "add Istio"?
- [ ] Did I mention Gateway API for swappability and an L4-first, L7-where-needed rollout?
- [ ] Did I state the condition under which a mesh is NOT warranted?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose the mesh architecture for a fintech (you are the platform lead) running 250 microservices across three regions with a regulatory zero-trust mandate (every service call must be mutually authenticated and encrypted, with audit trails), justify it on latency, cost, and compliance, and explain how you would migrate an existing sidecar mesh without a maintenance window.

**Model answer (revealed on demand):**

Assumptions: 250 services, three regions, a hard compliance requirement for mTLS on every hop plus authz policy and audit, and an existing Istio sidecar mesh that is expensive and latency-heavy at this scale. Zero downtime during migration is mandatory.

Architecture: keep a mesh (at 250 services it is unambiguously justified) but move to **ambient/eBPF** to cut the tax. Istio Ambient gives per-node ztunnel mTLS for all Pods (satisfying the "encrypted and authenticated on every hop" mandate cheaply at L4) with waypoint L7 proxies only where authz policy, retries, or traffic shifting are needed. mTLS gives me the compliance property (mutual auth + encryption) and the mesh emits uniform authz decisions and L7 telemetry that feed the audit trail. Cross-region traffic goes over east-west gateways with mTLS preserved.

Why not stay on sidecars: 250 services means thousands of Pods; per-Pod Envoy would cost many GBs of memory and add per-hop latency that, on a multi-hop payment path, meaningfully inflates p99. Ambient removes most of the per-Pod proxies while preserving mTLS everywhere, so compliance holds at lower cost and latency.

Compliance specifics: enforce `STRICT` mTLS mode so any plaintext call is rejected (not just permitted alongside mTLS), authorization policies scoped per service, and export the mesh's access logs and policy decisions to the audit pipeline. Use SPIFFE-style workload identities so each service's certificate is its auditable identity.

Zero-window migration: mesh migrations are done in **permissive mode** first (accept both mTLS and plaintext) so nothing breaks while you convert, then flip to strict per namespace once metrics confirm all traffic is already mTLS. Migrate ambient namespace by namespace: onboard a namespace to the ztunnel data path, verify golden metrics and mTLS coverage, add waypoints only where L7 policy is required, then move the next. Roll forward gradually and keep the old sidecar path as fallback per namespace until each is validated, so there is never a big-bang cutover.

Common wrong turn: a big-bang switch from sidecar to ambient across all 250 services at once, or flipping mTLS to strict before verifying full coverage, either of which drops production calls and, in a fintech, causes a compliance and revenue incident.

### sd-l9-cloud-native-12factor: Cloud-Native & 12-Factor Principles

- **id:** `sd-l9-cloud-native-12factor`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** cloud-native, twelve-factor, deployment

#### Learn

The 12-factor methodology and cloud-native principles are a checklist for building an app that a platform can run, replace, and scale automatically. In an interview they are a **design lens**: when asked to make a service container-ready, walk the factors and name the specific change for each, rather than saying "make it cloud-native" as a vibe. The four that carry most of the weight:

**1. Config in the environment.** Config and secrets live outside the image, in env vars, a ConfigMap, or a secrets manager. The payoff is **one immutable artifact** promoted unchanged from dev to staging to prod (dev/prod parity). The moment you bake an environment-specific config file into the image, you need a different build per environment, and parity is gone. A baked-in database URL or API key is the classic anti-pattern.

**2. Stateless, disposable processes.** A process must hold no state that another instance would need. No in-memory session that only lives on one box, no user files written to local disk. Move session to **Redis**, files to **object storage (S3)**. Then any instance can serve any request, and the platform can start a new instance or kill an old one at any moment. "Disposable" also means **fast startup** and **graceful shutdown**: on **SIGTERM** the process stops taking new work, drains in-flight requests, and exits, so a scale-down or node drain loses nothing.

**3. Backing services as attached resources.** Databases, caches, queues, and blob stores are attached by **URL and credentials**, not compiled in. A local Postgres and a managed Aurora are the same "attached resource" to the app, so you can swap one for the other by changing config, with no code change. This is what makes an instance truly interchangeable across environments.

**4. Build, release, run separation, and immutable infrastructure.** **Build** produces an image, **release** binds that image to a config to make a versioned, immutable release, and **run** executes it. You never mutate a running box; to change anything you build a new image and replace instances. This is what makes rollback trivial (re-run the previous release) and eliminates config drift.

The connective idea is **design for failure**. In a cloud-native world instances vanish routinely: spot reclamation, autoscale scale-in, node drains, zone loss. So health checks, retries, and graceful shutdown are **required, not optional**, and logs must stream to **stdout** as an event stream for the platform to collect (never written to a local file that dies with the instance).

**Interview nuance:** the highest-signal move is to walk a specific legacy service through the checklist and name the concrete change per factor: "session is in local memory -> move to Redis; uploads go to local disk -> move to S3; config is a baked-in `app.conf` -> move to env vars." That specificity is what separates a strong answer from reciting the factor names.

Recap: config in the environment (one image everywhere), stateless disposable processes (Redis session, S3 files, graceful SIGTERM), backing services attached by URL, and immutable build/release/run separation, all so a process is safe to kill and restart anywhere at any time.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain how you would apply the 12-factor and cloud-native principles to make a legacy stateful service ready for containers and autoscaling, calling out config, state, backing services, and disposability.

**Think about:**
- What makes a process safe to kill and restart anywhere at any time?
- Where should configuration and secrets live so one image runs in every environment?
- How do you treat databases, caches, and queues so instances stay interchangeable?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a legacy service that stores user sessions and uploaded files on local disk and reads config from a baked-in `app.conf`. Today it runs as one pinned instance, and that is exactly what blocks horizontal scaling and safe restarts.

I would walk the checklist and name the specific fix for each factor:

**Config in the environment.** Pull the baked-in `app.conf` out of the image. Non-secret config becomes env vars / a ConfigMap; secrets go to a secrets manager (or Kubernetes Secret backed by one). Now a single immutable image is promoted unchanged from dev to prod, giving dev/prod parity and killing per-environment builds.

**Stateless, disposable processes.** This is the crux of the "stateful" problem. Move session state out of local memory into **Redis**, and move uploaded files off local disk into **object storage (S3)**. Once no request-scoped state lives on the instance, any replica can serve any user, which is the precondition for both horizontal scaling and safe restarts. Add **graceful shutdown**: on SIGTERM stop accepting new requests, finish in-flight work within the termination grace period, then exit, so a scale-in or node drain drops nothing. Ensure fast startup so a new replica joins quickly.

**Backing services as attached resources.** Address Postgres, Redis, S3, and any queue by URL and credentials from config, so they are swappable (local vs managed) without code changes. The database itself stays a managed service; the app tier becomes the stateless, scalable part.

**Build, release, run + immutable infra.** Build the image once, bind it to a config as a versioned release, and run that release. Never `ssh` in to mutate a box; replace it. This makes rollback a re-run of the prior release and eliminates drift.

**Design for failure and observability.** Add liveness/readiness probes, stream logs to stdout for the platform to collect (not to a local file that dies with the Pod), and assume instances can vanish, so retries and idempotency are built in.

Once state is externalized and config is in the environment, the service is safe to run as a Deployment with an HPA: replicas are interchangeable, killable, and scalable.

Common wrong turn: containerizing the service but leaving session in local memory and files on local disk, so scaling out breaks every user whose data happens to live on one instance, and a restart loses their session or uploads.

**Self-check rubric:**
- [ ] Did I move config/secrets out of the image so one artifact runs in every environment?
- [ ] Did I externalize session to Redis and files to S3 so instances are interchangeable?
- [ ] Did I address disposability with fast startup and graceful SIGTERM draining?
- [ ] Did I treat DB/cache/queue as attached resources addressed by URL, with the DB staying managed?
- [ ] Did I cover immutable build/release/run and stdout logging / probes for design-for-failure?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the concrete migration to make a 12-year-old Java monolith running a company's core billing container-ready and autoscalable without a billing outage, prioritizing which factors to fix first. It writes invoices to a local `/data` directory, keeps user sessions in the JVM heap, reads a 400-line `config.properties` baked into the WAR, and is deployed by hand to two pet servers.

**Model answer (revealed on demand):**

Assumptions: billing is revenue- and compliance-critical, cannot lose an invoice, and cannot take a hard outage. Two hand-managed "pet" servers with local state and baked-in config are the blockers. I would sequence the fixes by risk, not fix everything at once.

Priority 1, externalize state (the true blocker). Move invoice files from local `/data` to **object storage (S3)** with versioning (audit-friendly for billing), and move JVM-heap sessions to **Redis** (or make the API stateless with signed tokens). Until state is off the box, the service cannot scale out or be safely killed, so this comes first. Do it behind the existing single instance: write to S3 and Redis while still running as one node, verify parity, then allow multiple replicas.

Priority 2, config in the environment. Externalize `config.properties` into env vars / a ConfigMap plus a secrets manager for DB and payment-gateway credentials. Now one immutable image is promotable across environments, and no secret ships inside the WAR.

Priority 3, backing services and immutability. Point the DB, S3, Redis, and any queue at URLs from config so they are attached resources, containerize with a multi-stage build, and adopt build/release/run so deploys stop being hand-copies to pets. This kills the "pet server" drift.

Priority 4, disposability and design-for-failure. Implement graceful SIGTERM shutdown so an in-flight invoice completes before exit, add liveness/readiness probes, stream logs to stdout, and make invoice generation idempotent (an idempotency key) so a retried or restarted request never double-bills.

Rollout without outage: run the refactored container alongside the legacy pets, shift traffic gradually (canary), and keep the pets as fallback until the container tier proves out. Only once replicas are interchangeable do I enable an HPA.

Common wrong turn: lifting the monolith straight into a container with local `/data` and heap sessions intact, then turning on autoscaling, which double-writes invoices, loses sessions on scale-in, and causes a billing incident. State and idempotency must be fixed before elasticity is switched on.
