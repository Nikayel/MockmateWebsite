> Module **sd-l4-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l4-m3](./sd-l4-m3.md) · Next: [sd-l5-m1](./sd-l5-m1.md)

# L4 · Autoscaling & Isolation

After this module you can match compute capacity to demand with reactive, event-driven, and predictive autoscaling while accounting for the scaling lag that reactive systems can never escape, size a fleet from first principles using Little's Law and redundancy math, and partition a multi-tenant system into cells with shuffle sharding so one bad tenant or bad deploy cannot take everyone down.

### sd-l4-autoscaling: Autoscaling: Reactive, Event-Driven & Predictive

- **id:** `sd-l4-autoscaling`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** autoscaling, keda, capacity

#### Learn

Autoscaling is the machinery that grows and shrinks a fleet so you pay for roughly what you use while still meeting your SLOs. There are three layers, and interviewers want you to name them distinctly.

**Horizontal Pod/instance autoscaling (HPA)** adds or removes replicas based on a metric. The default metric is **CPU or memory utilization**: target 60% CPU, and the controller adds pods when the average climbs above that. The problem is that CPU is a *lagging* signal. By the time CPU is pegged, requests are already queuing and your p99 is already blown. Better is to scale on a **leading business metric**: requests-per-second per pod, in-flight concurrency, or, best of all for async workers, **queue depth / consumer lag**. If a Kafka or SQS backlog is growing, you need workers *now*, before any CPU number moves.

**Event-driven autoscaling** is exactly this idea productized. **KEDA** (Kubernetes Event-Driven Autoscaling) scales a deployment directly off external event sources: Kafka lag, SQS queue length, Redis list size, Prometheus queries. A worker fleet can even **scale to zero** when the queue is empty and scale back up on the first message. This reacts to the *cause* (work arriving) rather than the *symptom* (CPU rising), which buys you precious lead time.

Below the pod layer sits the **cluster/node autoscaler**. HPA asking for 40 more pods does nothing if there is no node to place them on. The Cluster Autoscaler (or Karpenter on AWS) provisions new VMs when pods are unschedulable. Separately, the **Vertical Pod Autoscaler (VPA)** right-sizes each pod's CPU/memory *requests* so you are not over-reserving. HPA and VPA on the same metric fight each other, so keep them on different signals.

The concept that separates a senior answer: **scaling lag**. Reactive autoscaling has an unavoidable pipeline of delays: metric scrape interval (15 to 60s) + controller decision/stabilization window + node provisioning (30 to 120s for a fresh VM) + container pull + app boot + JIT/cache warmup + health-check pass before traffic. That is often **2 to 5 minutes** end to end. A traffic burst that arrives in 20 seconds will overwhelm you long before new capacity is ready. Reactive scaling *always trails a fast burst.*

Two tools hide the lag. **Warm pools** keep pre-booted, pre-warmed instances parked and idle so a scale-out is just "attach," not "boot from scratch," collapsing minutes to seconds. **Scheduled / predictive pre-scaling** grows the fleet *ahead* of a known pattern: if traffic 10x's every day at 9am, a cron-based scheduled scaler raises the floor at 8:50. Predictive autoscalers (AWS Predictive Scaling) learn the daily/weekly curve and pre-provision automatically.

**Interview nuance:** the trap is claiming "autoscaling handles spikes" full stop. The correct framing is that autoscaling handles *sustained load changes and gradual ramps* well, but for sharp bursts you must either pre-scale (if the spike is predictable) or hold **headroom** (run at 60% not 95%) so the existing fleet absorbs the burst while new capacity boots.

```
  burst arrives ->  |####| traffic
  reactive:         scrape(30s)+decide(30s)+boot(90s)+warm(30s) = ~3min late
  warm pool:        attach pre-booted node = ~15s
  scheduled:        capacity already up at 8:50 for the 9am spike
```

Recap: scale on leading signals (queue depth via KEDA, RPS) not just lagging CPU, layer HPA + cluster autoscaler + VPA, and because reactive scaling always trails a fast burst by 2 to 5 minutes of lag, hide that lag with warm pools, scheduled pre-scaling, and standing headroom.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design autoscaling for a service with a sharp 10x traffic spike every day at 9am and unpredictable bursts otherwise.

**Think about:**
- Which signal (CPU vs queue depth vs RPS) should trigger scaling?
- Why does reactive scaling always trail a fast burst?
- How do warm pools and scheduled pre-scaling help?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a stateless request-serving fleet on Kubernetes, baseline maybe 100 pods, 9am peak needs ~1000 pods, SLO is p99 < 200ms. The 9am spike is predictable (same time daily); the "otherwise" bursts are not.

I split the problem into the *known* spike and the *unknown* bursts, because they need different tools.

For the **known 9am 10x**, I use **scheduled pre-scaling**. A scheduled scaler (Kubernetes CronJob patching the HPA min, or AWS Scheduled Scaling) raises the replica floor from 100 to ~1000 at **8:50am**, ten minutes before the spike, so capacity is warm and traffic-serving before the first user hits. This sidesteps scaling lag entirely: you never react to the 9am spike, you anticipate it. I add a predictive autoscaler as a backstop that learns the daily curve.

For the **unpredictable bursts**, I combine two things. First, **scale on a leading metric**: RPS-per-pod or in-flight concurrency via a custom/external metric, not CPU, so the HPA reacts to load arriving rather than to CPU already pegged. If any work is async, KEDA on **queue depth** reacts before utilization moves at all. Second, and this is the key point, reactive scaling *cannot* catch a sharp burst because of **scaling lag**: scrape + decide + node boot + warmup is 2 to 5 minutes, and a 20-second burst overwhelms you long before pods are ready. So I cover bursts two ways: a **warm pool** of pre-booted nodes turns scale-out from minutes into ~15 seconds, and I run **standing headroom** (target 60% utilization, not 95%) so the existing fleet absorbs the first minute of any burst while real capacity spins up.

Underneath, the **Cluster Autoscaler / Karpenter** must keep spare node capacity or pre-provisioned nodes so HPA's new pods actually have somewhere to land. I bound the HPA min/max by peak-to-average ratio so cost stays sane off-peak (scale the floor back down after the 9am peak passes).

Tradeoffs: pre-scaling and headroom cost money for idle capacity, but that is the price of meeting p99 under bursts. The common wrong turn is claiming "the HPA will handle it": on a 20-second burst the HPA is still 3 minutes behind. Anticipate the known, buffer the unknown.

**Self-check rubric:**
- [ ] Chose a leading signal (queue depth/RPS) over lagging CPU and justified why
- [ ] Used scheduled/predictive pre-scaling for the known 9am spike
- [ ] Named scaling lag explicitly and quantified it (2 to 5 min)
- [ ] Covered unpredictable bursts with warm pools plus standing headroom
- [ ] Remembered the cluster/node autoscaler must have capacity for new pods

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design autoscaling for a video transcoding pipeline like Mux or Cloudflare Stream where users upload files in bursty, unpredictable waves, each job takes 30 to 300 seconds of heavy CPU, and cost matters because transcoding is expensive. Lead with what signal you scale on.

**Model answer (revealed on demand):**

Assumptions: uploads land in an S3 bucket, an event enqueues a transcode job onto SQS (or Kafka), a worker fleet pulls jobs and transcodes. Load is spiky and unpredictable, jobs are long and CPU-bound, and idle GPU/CPU workers are costly.

I scale the workers on **queue depth / consumer lag**, not CPU, using **KEDA** with the SQS or Kafka scaler. This is the textbook event-driven case: the moment jobs pile up, KEDA adds workers, and when the backlog drains it **scales the fleet to zero**, which is critical for cost given expensive transcode instances. CPU-based scaling would be wrong here twice over: a worker mid-transcode is already at 100% CPU (so CPU tells you nothing about *pending* work), and it would keep expensive nodes alive with an empty queue.

Because jobs run 30 to 300s, I make scale-down **graceful**: KEDA/HPA must not kill a pod mid-job. I use long termination grace periods and a drain that lets in-flight transcodes finish (or checkpoint) before the pod exits, and I set the SQS visibility timeout above the max job time so a job is not redelivered while still processing.

For the **cold-start / lag** problem, a warm pool of pre-provisioned nodes (or Karpenter with a small standing buffer) means the first burst of uploads does not wait 2 minutes for VMs. I scale the *target ratio* by desired backlog: e.g. one worker per 5 queued jobs, so a 500-job wave provisions ~100 workers.

Cost mix: run the baseline on **spot instances** (transcoding is retryable and interruption-tolerant, so a lost spot node just re-queues its job), with a small on-demand floor for latency-sensitive live jobs. The tradeoff is that scale-to-zero adds cold-start latency on the first job after idle, acceptable for async transcoding. The wrong turn is autoscaling on CPU and paying for idle GPU nodes between upload waves.

### sd-l4-capacity-planning: Capacity Planning & Back-of-Envelope Sizing

- **id:** `sd-l4-capacity-planning`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** capacity, sizing, littles-law

#### Learn

Capacity planning is turning "how much traffic" into "how many machines" with numbers you can defend on a whiteboard. The core engine is **Little's Law**: in a stable system, the average number of requests *in flight* equals arrival rate times average time-in-system.

```
  L (concurrency) = lambda (RPS) x W (latency in seconds)
```

If you serve 50,000 RPS and each request spends 100ms (0.1s) being processed, average concurrency is `50000 x 0.1 = 5000` requests in flight simultaneously. That is the real sizing number: not RPS, but *concurrent work*. If one instance can hold ~250 concurrent requests before its own latency degrades (limited by threads, event-loop capacity, or downstream connections), you need `5000 / 250 = 20` instances just to hold the steady-state concurrency.

But you never size to 100% of steady state, for two reasons rooted in queueing theory. First, **utilization and latency are not linear**. As utilization approaches 100%, queue length and wait time explode toward infinity (the `1/(1-rho)` term in queueing models): going from 70% to 90% utilization can double or triple your p99. Second, you need slack to absorb bursts and GC/pause jitter. So you target **50 to 70% utilization**, which means dividing your theoretical instance count by that target. 20 instances at 70% target becomes `20 / 0.7 = ~29` instances.

Then layer **redundancy math**. You must survive failure of a whole **availability zone (AZ)**, so you spread instances across (typically) 3 AZs and size so that *losing one AZ still leaves enough capacity*. This is **N+1** thinking at the AZ level: if you need N AZs' worth of capacity to serve peak, provision N+1 so one can die. Concretely, if 29 instances serve peak at target utilization, and you run 3 AZs, losing one AZ removes a third of your fleet. To keep the surviving two AZs at or below target after a zone loss, you size each AZ to carry the load alone-ish: a common rule is provision ~50% more so that `2/3` of the fleet still covers 100% of peak. So ~29 becomes ~44 instances (roughly 15 per AZ across 3 AZs).

Finally, **peak-to-average ratio** sets your autoscaling bounds and your reserved-vs-on-demand mix. If peak is 3x average, you buy **reserved/savings-plan** capacity for the always-on baseline (cheapest per hour), **on-demand** for the predictable daily peak, and **spot** for burst or batch (cheapest but pre-emptible). You do not reserve for peak, because peak is a small fraction of the day.

**Interview nuance:** the fastest way to sound junior is to divide RPS by "requests per second per server" and stop. The fastest way to sound senior is to (1) convert to concurrency with Little's Law, (2) apply a utilization target and say *why* (queues explode near 100%), and (3) add explicit N+1 AZ redundancy. Also state your estimation chain out loud: DAU x actions/user/day / 86,400s x peak multiplier = peak RPS. Interviewers grade the *method*, not the exact number, so show the arithmetic and label every assumption.

Recap: size with Little's Law (concurrency = RPS x latency), divide by a 50 to 70% utilization target because queues blow up near 100%, add N+1 AZ redundancy so losing a zone stays above peak, and split the resulting capacity across reserved/on-demand/spot by peak-to-average ratio.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Size the fleet for a service that must serve 50k RPS at p99 < 200ms and survive one AZ failure.

**Think about:**
- How does Little's Law convert RPS and latency into instance count?
- What utilization target leaves headroom for spikes and failover?
- How does N+1/N+2 AZ math change the count?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 50k RPS is peak, target p99 < 200ms, so I budget average processing time W around 80 to 100ms per request (leaving headroom under the 200ms tail). Deployed across 3 AZs. I will assume each instance sustains ~200 concurrent in-flight requests before its own tail latency degrades; I would validate this number with a load test, but I will state it and carry it.

**Step 1, Little's Law.** Concurrency `L = lambda x W = 50000 x 0.09s = 4500` requests in flight at peak. That is the quantity I actually size for.

**Step 2, instances at full utilization.** At ~200 concurrent per instance, I need `4500 / 200 = ~23` instances to *just* hold peak concurrency with zero slack.

**Step 3, utilization target.** I will not run at 100%, because queueing delay explodes as utilization approaches 1 (the `1/(1-rho)` blow-up), which would wreck my p99. Target **65%**: `23 / 0.65 = ~35` instances to serve peak while keeping tail latency healthy.

**Step 4, AZ redundancy (N+1).** Across 3 AZs, losing one removes a third of capacity. I size so the surviving 2 AZs still carry 100% of peak at target utilization. That means each AZ must hold ~half of peak: I provision so `2/3` of the fleet covers peak, i.e. multiply by `3/2`: `35 x 1.5 = ~53` instances, roughly **18 per AZ across 3 AZs**. Now an AZ failure drops me to 36 instances, still above the 35 needed for peak.

**Step 5, cost and bounds.** If peak is ~2.5x daily average, the always-on baseline (~21 instances) goes on **reserved / savings plans**, the daily peak delta on **on-demand**, and any spillover burst on **spot**. Autoscaling min/max are set from the peak-to-average ratio so I am not paying for 53 instances at 3am.

Tradeoffs: the utilization target and the 1.5x AZ factor together mean I run roughly 2.3x the "naive" instance count. That is the cost of a healthy p99 plus surviving a zone outage, and it is the right trade. The common wrong turn is sizing to raw peak at high utilization with no failover margin: it looks cheap on the slide and pages you the first time an AZ blips or the GC pauses.

**Self-check rubric:**
- [ ] Used Little's Law to get concurrency (RPS x latency), not just RPS/throughput
- [ ] Applied a 50 to 70% utilization target and justified it via queueing blow-up
- [ ] Added explicit N+1 AZ redundancy math so a zone loss stays above peak
- [ ] Stated and labeled every assumption (per-instance concurrency, W, AZ count)
- [ ] Mapped baseline/peak/burst onto reserved/on-demand/spot

#### Practice: real-world variant (save, then reveal)

**Prompt:** Size the read fleet for a service like Twitter's home-timeline API that must serve 300k RPS at p99 < 150ms across 3 regions, where each request fans out to a Redis timeline cache plus 2 downstream calls, and you must survive losing an entire region. Lead with your estimation chain.

**Model answer (revealed on demand):**

Assumptions: 300k RPS global peak, split roughly evenly across 3 regions (~100k RPS/region), p99 < 150ms. Each request does a Redis read plus 2 downstream RPCs; with fan-out and network, average server-side W is ~60ms (0.06s). Each instance sustains ~250 concurrent requests before tail degradation. I size per region, then apply region-level redundancy.

**Estimation chain (per region).** Concurrency `L = 100000 x 0.06 = 6000` in-flight requests. At 250 concurrent/instance: `6000 / 250 = 24` instances at full load. Apply a 60% utilization target (tight p99 budget, so more headroom): `24 / 0.6 = 40` instances per region to serve regional peak healthily.

**Region-level redundancy (the hard constraint).** Surviving a full region loss means the other 2 regions must absorb *all* 300k RPS. So each region must be sized to carry `300k / 2 = 150k RPS` at target when a peer region is down, i.e. 1.5x its own steady load. `40 x 1.5 = 60` instances per region, ~180 globally. On region failure, GeoDNS/global load balancing shifts that region's traffic to the survivors, which now run at ~90% of their provisioned capacity, still within budget.

Downstream check: the Redis timeline cache and the 2 downstreams must *also* be sized for the failover surge, or the compute fleet just moves the bottleneck. I verify Redis has connection and throughput headroom for 1.5x regional load.

Cost mix: baseline reserved, failover margin as on-demand held in reserve, and I would consider running the failover headroom "warm but light" rather than fully provisioned 24/7 if RTO tolerance allows a brief autoscale ramp. Wrong turn: sizing each region only for its own 100k RPS, so the day a region dies the survivors instantly saturate and cascade.

### sd-l4-cell-shuffle-sharding: Cell-Based Architecture & Shuffle Sharding

- **id:** `sd-l4-cell-shuffle-sharding`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** cells, shuffle-sharding, blast-radius

#### Learn

The failure this lesson prevents: in a single global fleet, *any* systemic problem hits *everyone*. A poison-pill request, a bad deploy, a runaway tenant, a corrupted cache entry, one hot shard: all of them can cascade across the whole fleet because every node shares the same pool, the same code version, and the same downstream dependencies. Cell-based architecture and shuffle sharding are the two techniques for **bounding blast radius** so a failure takes down a slice, not the service.

**A cell is a complete, self-contained copy of the stack**: its own load balancer, service instances, cache, and often its own database partition, serving a *subset* of users or tenants. Ten cells means ten independent stacks, each carrying ~10% of traffic. Cells share almost nothing at runtime. The point is a **fault domain**: a bad deploy, a resource exhaustion, or a poison request confined to cell 3 affects only cell 3's ~10% of users. The rest of the fleet never sees it. This is how AWS runs many services and how Slack, Salesforce, and others limit outage scope.

Routing to cells is done by a **thin, extremely simple, highly-available cell router**: it maps a tenant/user ID to a cell (a lookup table or a hash) and forwards the request. The router must be *dumb and rock-solid*, because it is the one shared component. Keep it stateless-ish, cache the mapping, and give it far more redundancy than anything else, since if the router dies, everything dies. You deploy changes **cell by cell**: canary cell 1, watch its metrics, then roll cells 2, 3, and so on. A bad release is caught at 10% blast radius (one cell) instead of 100%.

```
        cell router (dumb, HA, the only shared thing)
        /          |           \
   +--------+  +--------+   +--------+
   | Cell 1 |  | Cell 2 |   | Cell 3 |   ...
   | LB     |  | LB     |   | LB     |
   | svc    |  | svc    |   | svc    |
   | cache  |  | cache  |   | cache  |
   | db-part|  | db-part|   | db-part|
   +--------+  +--------+   +--------+
   tenants A-J  tenants K-T  tenants U-Z
```

**Shuffle sharding** solves a finer-grained problem: noisy neighbors *within* a shared pool. Say you have 8 workers and you shard tenants into 4 fixed shards of 2 workers each. A single abusive tenant saturates its 2 workers and takes down every tenant on that shard. Shuffle sharding instead gives each tenant a *random subset* (say 2 of the 8 workers), chosen so that the probability any two tenants share their *entire* subset is tiny. With 8 workers choose 2, there are 28 possible pairs; two tenants fully overlap only 1-in-28 of the time. So one bad tenant degrades only the handful of tenants who happen to share a worker, and *never* a tenant who shares zero workers. Combined with per-request fault isolation (a client retries on its other worker), the practical blast radius of one bad tenant drops to a rounding error. This is exactly how AWS Route 53 and other services isolate customers.

**Interview nuance:** the tradeoffs are real and you must name them. Cells cause **capacity fragmentation**: each cell needs its own headroom and redundancy, so ten cells cost more idle capacity than one big pool, and a hot cell cannot borrow a quiet cell's spare capacity without rebalancing. **Cross-cell operations** get hard: anything requiring all tenants (a global query, a tenant that outgrows one cell, moving a tenant between cells) needs extra machinery. And the **cell router becomes the critical shared dependency** you must obsess over. The honest trade: you accept higher cost and operational complexity to buy a hard ceiling on how many users any single failure can hurt.

Recap: a cell is a self-contained stack serving a user subset behind a dumb HA router, so a bad deploy or tenant is contained to one cell's ~10%, while shuffle sharding assigns each tenant a random worker subset so full overlap between any two tenants is rare and one noisy tenant barely touches the rest; you pay for this with capacity fragmentation and harder cross-cell operations.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Partition a multi-tenant service into cells so one tenant's traffic surge or a bad deploy cannot take down all tenants.

**Think about:**
- What is a cell, and how does it contain failure?
- How does shuffle sharding minimize tenant overlap?
- What are the tradeoffs (capacity fragmentation, cross-cell ops)?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a multi-tenant SaaS API, thousands of tenants of very uneven size, currently one global fleet + shared database, and outages today are all-or-nothing. Goal: bound blast radius so no single tenant surge or bad deploy can hurt more than a small fraction of tenants.

**Cell design.** I split the system into **N cells** (say 10), each a *self-contained stack*: its own load balancer, service instances, cache, and database partition. Each cell carries ~10% of tenants. Cells share nothing at runtime, so a resource exhaustion, poison request, or crash in cell 4 is confined to cell 4's tenants. The other 90% are untouched. This is a hard **fault-domain** boundary, which a single global pool cannot give you.

**Routing.** A **thin, highly-available cell router** maps `tenant_id -> cell` via a cached lookup table (source of truth in a small, heavily-replicated store). The router does almost nothing else, because it is the one shared component and thus the scariest single point of failure: I over-provision it, keep it stateless, and cache mappings aggressively. Tenant-to-cell placement balances load and can be rebalanced by updating the table and draining.

**Bad-deploy containment.** I deploy **cell by cell**: canary cell 1, bake and watch error rate / p99, then progressively roll the rest. A bad release blows up at most one cell (~10%) before I halt the rollout, versus a global deploy that takes down 100%.

**Noisy tenant containment.** Within a cell I add **shuffle sharding** across the cell's workers: each tenant gets a random subset of workers, so a single tenant's surge saturates only its few workers, and the odds another tenant shares that *entire* subset are small. One abusive tenant degrades a handful of neighbors, not the whole cell. I also keep per-tenant rate limits as the first line of defense.

**Tradeoffs I would state up front.** Capacity fragmentation: each cell needs its own headroom, so total idle capacity is higher than one big pool, and a hot cell cannot trivially borrow a quiet cell's slack. Cross-cell operations (global analytics, a tenant that outgrows a cell, moving tenants) need extra tooling. And the router is now the critical shared dependency. I accept these because the payoff, a firm cap on blast radius, is worth it for a multi-tenant platform where one noisy or targeted tenant would otherwise take everyone down. Common wrong turn: a single global fleet "with good rate limiting," which still shares one code version and one dependency graph, so one bad deploy is a total outage.

**Self-check rubric:**
- [ ] Defined a cell as a self-contained stack (LB + svc + cache + db partition) serving a tenant subset
- [ ] Included a thin, highly-available cell router and flagged it as the critical shared component
- [ ] Used per-cell deploy/canary to bound bad-release blast radius
- [ ] Added shuffle sharding for noisy-neighbor isolation and explained the low-overlap property
- [ ] Named the tradeoffs: capacity fragmentation and cross-cell operations

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design cell-based isolation for a service like AWS DynamoDB or Route 53 serving millions of customers where a single misbehaving customer (a request flood or a poison-pill query pattern) must not be able to degrade service for others, and no more than a tiny fraction of customers can share fate. Lead with your isolation strategy.

**Model answer (revealed on demand):**

Assumptions: a foundational multi-tenant service, millions of customers, extreme reliability bar, and a threat model where any one customer may (accidentally or maliciously) send a traffic flood or a pathological request pattern. The requirement is a *quantifiable* cap on how many others any one customer can affect.

**Strategy: cells plus shuffle sharding, sized for a probabilistic overlap guarantee.** First, partition the fleet into many cells, each a self-contained stack behind a dumb, ultra-redundant router keyed on customer ID. That already caps blast radius per cell. But with millions of customers, "10% of customers share a cell" is still millions sharing fate, so I layer **shuffle sharding** inside each cell as the primary isolation mechanism.

Each customer is assigned a **random subset of k workers** out of the cell's M workers. The key math: with M workers choose k, the number of distinct subsets is large, and the probability that another specific customer shares your *entire* subset (and thus can fully take you down) is roughly `1 / (M choose k)`. Tune M and k so this is negligible, e.g. a few workers out of a few dozen gives thousands of distinct combinations. When a customer floods, only their k workers are hit; every customer whose subset does not fully overlap keeps at least one healthy worker and, with client-side retry across their subset, stays up. So one bad actor degrades a *statistically tiny* slice, not the service.

I combine this with **per-customer throttling / token buckets** at the front door (first line of defense, stops most floods before they reach workers) and **request-level admission control** to shed poison-pill patterns. Deploys go cell by cell with automated rollback on health regression.

Tradeoffs: shuffle sharding needs enough workers per cell to make the combinatorics work, and the routing/assignment layer must be extremely reliable and consistent (a customer's subset must be stable). The payoff is a *provable* isolation property, "no single customer can affect more than X% of others," which is exactly the guarantee a foundational AWS-scale service must be able to state. Wrong turn: relying on throttling alone, which caps rate but still lets a flood within the limit, or a novel query pattern, degrade every customer sharing the pool.
