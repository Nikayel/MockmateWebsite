> Module **sd-l7-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l7-m3](./sd-l7-m3.md) · Next: [sd-l7-m5](./sd-l7-m5.md)

# L7 · Redundancy, DR & Multi-Region

After this module you can hunt down and eliminate single points of failure across a stack, set defensible RTO/RPO targets and pick a matching disaster-recovery strategy per tier, design a multi-region deployment with an honest story about replication and consistency, and shrink blast radius with cells, shuffle sharding, and static stability so a single failure never takes everyone down.

### sd-l7-redundancy-failover: Redundancy, Failover & Health Checking

- **id:** `sd-l7-redundancy-failover`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** redundancy, failover, health-checks

#### Learn

Availability starts with a simple rule: no component whose failure takes down the system may exist as a single instance. A single point of failure (SPOF) is any box, process, or record that has no live substitute. Redundancy is having N+1 or N+2 of everything, so losing one (or two) instances still leaves enough capacity to serve.

The trap is that SPOFs hide. Engineers dutifully run three web servers, then route all of them through one load balancer, one database primary, one DNS name backed by one provider, and one config service that every pod reads on boot. Each of those is a SPOF that quietly undoes the redundant web tier. A real audit walks the request path and asks, at every hop, "if this single thing dies, does traffic stop?" Load balancers need a redundant pair (or a managed multi-node LB like AWS ALB/NLB); the DB primary needs replicas plus automated promotion; DNS needs multiple providers or at least multiple authoritative servers; the config store needs a quorum (etcd/ZooKeeper run 3 or 5 nodes for exactly this reason).

Redundancy comes in two shapes. **Active-active**: every instance serves live traffic, so you use the capacity you pay for and failover is instant (just stop routing to the dead one). The cost is shared state, which is hard when instances are stateful (two DB primaries accepting writes will diverge). **Active-passive**: a hot or warm standby sits idle until the primary fails, then gets promoted. Simpler to reason about because only one instance owns the state, but you pay for idle hardware and you eat a failover lag while the standby takes over.

Failover has to be *triggered* by something, and that something is health checking. Three depths matter:

- **Liveness**: is the process up? (answers a TCP connect or a trivial `/healthz`). If it fails, restart the instance.
- **Readiness**: can this instance serve *right now*? (warmed caches, DB pool connected). If it fails, pull it from the LB pool but do not kill it.
- **Deep / dependency check**: can it reach its critical dependencies? Useful but dangerous: if your health check calls the shared database and the database blips, *every* instance fails its check at once, the LB pulls them all, and a minor blip becomes a total outage.

**Interview nuance:** the two failure modes interviewers probe are flapping and split-brain. Flapping is an instance that fails and recovers repeatedly, causing constant add/remove churn; you damp it with hysteresis (require N consecutive failures to eject, M consecutive successes to re-admit) and cooldowns. Split-brain is worse: during a network partition, a passive standby cannot tell "primary is dead" from "I just cannot reach the primary," promotes itself, and now you have two primaries taking writes. The fix is to never let a single node decide promotion. Use quorum-based leader election (Raft/Paxos, or a fencing token) so a minority side cannot win, and fence the old primary (STONITH, revoke its storage lease) before the new one takes over. Also plan failback: returning to the recovered primary is its own controlled operation, not automatic.

```
        clients
           |
     [ DNS: 2 providers ]
           |
   [ LB pair, active-active ]
        /        \
   web-1       web-2 ... web-N     (N+2, stateless, readiness-gated)
        \        /
   [ DB primary ]==async/sync==>[ replica ]
     leader elected via quorum; fence old primary on failover
```

Recap: eliminate every SPOF (LB, DB primary, DNS, config) with N+1/N+2 redundancy, pick active-active for instant failover or active-passive for simpler state, gate traffic with liveness/readiness/deep checks, and use quorum election plus fencing and hysteresis to avoid split-brain and flapping.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Remove every single point of failure from a 3-tier web app; specify redundancy, health checks, and how failover is triggered at each tier.

**Think about:**
- Where are the hidden SPOFs (LB, DB primary, DNS, config store)?
- Active-active vs active-passive: what do you trade?
- How do you avoid flapping and split-brain during a partition?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a classic 3-tier app (LB -> stateless app servers -> relational DB) serving a few thousand QPS in one region; goal is to survive any single instance failure with no outage and minimal data loss. I will walk the path and kill each SPOF.

**DNS / edge:** a single DNS name on one provider is a SPOF. I use a provider with multiple authoritative servers, ideally two providers, with health-checked records so a dead endpoint is pulled from rotation.

**Load balancer tier:** one LB is a SPOF even if the app tier is redundant. I run a managed LB (AWS NLB/ALB, or an HAProxy/Envoy pair with a floating VIP via keepalived/VRRP). Active-active across at least two AZs. The LB itself health-checks the app tier.

**App tier:** stateless by design (sessions in Redis/JWT, not local memory), run N+2 instances across 3 AZs so losing one AZ still leaves capacity. Active-active. The LB uses a **readiness** check (`/ready` that verifies the DB pool and warm caches) to decide routing, and the orchestrator (Kubernetes) uses a **liveness** check to restart hung processes. I deliberately keep the readiness check shallow, not a deep DB call from every pod, to avoid a DB blip ejecting the whole fleet at once.

**Database tier:** the primary is the classic hidden SPOF. I run a primary with one or two replicas across AZs. Synchronous replication to at least one replica bounds data loss (RPO near zero) at some write-latency cost; async to the rest. Failover is automated (RDS Multi-AZ, Patroni, or Orchestrator) but promotion is decided by **quorum**, not by a lone standby, and the old primary is **fenced** (storage lease revoked) before the new one accepts writes, to prevent split-brain dual-primary.

**Config store:** if every pod reads one config service on boot, that is a SPOF. I run etcd/Consul as a 3- or 5-node quorum and cache config locally so a control-plane blip does not stop serving.

Tradeoffs: active-active app tier gives instant failover and full capacity use; active-passive DB primary is simpler and avoids write conflicts at the cost of failover lag. I add hysteresis (N-consecutive-failure ejection, cooldown before re-admit) to stop flapping. Common wrong turn: making the app tier redundant while leaving one LB or one un-replicated DB primary, so the "HA" system still has a single box that ends it.

**Self-check rubric:**
- [ ] Named the LB, DB primary, DNS, and config store as SPOFs and gave each a redundant replacement
- [ ] Distinguished active-active from active-passive with a concrete tradeoff per tier
- [ ] Used liveness vs readiness correctly and avoided deep checks ejecting the whole fleet
- [ ] Addressed split-brain with quorum election plus fencing
- [ ] Mentioned flapping mitigation (hysteresis/cooldown)

#### Practice: real-world variant (save, then reveal)

**Prompt:** Explain how you would make the PostgreSQL primary behind a payments API highly available at 20,000 writes/second, with automated failover that provably cannot cause a split-brain dual-primary during a network partition.

**Model answer (revealed on demand):**

Assumptions: single-region, one PostgreSQL primary is the write bottleneck and the SPOF; payments demand near-zero data loss (RPO ~0) and fast, safe failover.

I run the cluster with **Patroni**, which uses a distributed configuration store (etcd, 5 nodes for quorum) to hold the leader lease. Only the node that holds a valid, unexpired lease in etcd is primary. Because etcd requires a majority to grant or renew a lease, a partition that isolates the current primary means it *cannot renew its lease*, so it demotes itself; simultaneously the majority side elects a new leader. A minority partition can never win, which is what structurally prevents dual-primary.

Replication: **synchronous** to at least one standby (`synchronous_standby_names` with `ANY 1`) so a committed payment is on two nodes before the client sees success. This bounds RPO to zero for committed writes at the cost of a few ms of commit latency, which is the right trade for payments. Additional async replicas serve reads and provide more failover candidates.

Fencing: Patroni demotes the losing primary via its own lease loss, and I add **watchdog** (softdog) so a hung primary that cannot demote itself gets its node reset rather than lingering. Clients reach the DB through a proxy (PgBouncer + HAProxy, or the cluster VIP) that always points at the current leader, so application code does not chase failovers.

At 20k writes/s, the single primary is a throughput ceiling too, so beyond HA I would shard by account/tenant to spread writes, giving each shard its own Patroni cluster. Tradeoff: sync replication adds latency and, if the sync standby dies, writes stall unless I allow degrading to async (which reopens an RPO window, so I alert loudly on it). Common wrong turn: automated failover driven by a single monitoring node's opinion rather than a quorum lease, which promotes a standby during a partition and double-writes.

### sd-l7-dr-rto-rpo: Disaster Recovery: RTO/RPO & Strategies

- **id:** `sd-l7-dr-rto-rpo`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** dr, rto-rpo, backups

#### Learn

Disaster recovery is not "we have backups." It is a set of promises about how fast you come back and how much data you lose, made per system, and *proven* by drills. The two numbers that anchor everything are RTO and RPO.

**RTO (Recovery Time Objective)** is the maximum tolerable downtime: how long the system can be unavailable before the business is unacceptably harmed. **RPO (Recovery Point Objective)** is the maximum tolerable data loss, measured in time: if you can lose at most 5 minutes of data, your RPO is 5 minutes, which means your recovery point can be no older than 5 minutes before the disaster. RTO is about the clock; RPO is about the data. A checkout system might need RTO of minutes and RPO near zero; a marketing analytics warehouse might be fine with RTO of a day and RPO of an hour.

These numbers set your strategy, because recovery speed costs money. The industry ladder, cheapest and slowest first:

```
 cost / readiness  ->  higher
 RTO/RPO           ->  lower (better)

 Backup & Restore   Pilot Light      Warm Standby        Multi-site Active/Active
 (hours/days)       (10s of min)     (minutes)           (near zero)
 restore from S3    core data live,  scaled-down full    full stack live in 2+
 into new infra     app off; scale   stack always on;    regions; DNS shifts;
                    up on disaster   scale up on failover instant, most expensive
```

- **Backup & restore**: periodic snapshots to durable storage (S3, cross-region). On disaster you provision infra and restore. Cheapest, RTO in hours, RPO as good as your backup cadence. Fine for non-critical tiers.
- **Pilot light**: keep the critical data continuously replicated to the DR region and a minimal always-on core (the database), but application servers are off. On disaster you start and scale the app tier. RTO in tens of minutes.
- **Warm standby**: a scaled-down but fully functional copy runs in the DR region all the time. You fail over and scale up. RTO in minutes.
- **Multi-site active/active**: full capacity live in two or more regions, traffic already flowing to both. A region loss is just a traffic shift. RTO/RPO near zero, and the most expensive by far (covered in the next lesson).

The senior move is to **tier your systems** and apply a different rung to each. Your payment ledger might warrant warm standby; your recommendation model can live on backup & restore. Spending active/active money on a system whose users would not notice an hour of downtime is a classic waste.

**Interview nuance:** name the disaster *types*, because they need different recovery. **Region loss** (fire, flood, power) is what most people picture and multi-region solves. **Data corruption or a bad migration** is different: it replicates *instantly* to your standby, so failover just gives you the corrupted data faster. You recover corruption with point-in-time restore from immutable backups, not failover. **Ransomware** is different again: it may sit dormant and encrypt your backups too, so you need immutable, air-gapped (or object-lock) backups the attacker cannot reach. A DR plan that only handles "the region went away" fails the other two.

And the line that separates real DR from theater: **an untested backup is not a DR plan.** Backups silently rot, restore scripts break, permissions drift, and the one time you need it you discover the restore takes 14 hours or fails. Real DR means restore-drills, documented runbooks, and periodic game-days where you actually fail over and time it against your stated RTO.

Recap: RTO is tolerable downtime, RPO is tolerable data loss, both are set per tier; pick the cheapest rung on the backup -> pilot-light -> warm-standby -> active/active ladder that meets the tier's numbers; handle corruption and ransomware (not just region loss) with immutable/air-gapped backups; and prove it with restore drills and game-days or it is not a plan.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Set RTO/RPO per tier for an e-commerce platform and pick a DR strategy (backup/restore, pilot light, warm standby, multi-site active/active) for each, justifying cost.

**Think about:**
- What do RTO and RPO mean concretely?
- How does the strategy ladder trade cost against recovery time?
- Why is an untested backup not a DR plan?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a mid-size e-commerce platform with checkout/payments, product catalog and browse, order history, and an analytics/reporting warehouse. Downtime during checkout directly loses revenue; analytics downtime loses almost nothing. I tier by business impact.

**Checkout, payments, and the order ledger** (revenue-critical). RTO: 5 minutes. RPO: near zero, because a lost paid order is a customer who was charged and got nothing. Strategy: **warm standby** in a second region, with synchronous or low-lag async replication of the orders/payments database. It runs scaled down continuously and scales up on failover. This is the tier where I spend the money.

**Product catalog and browse** (important, but degradable). RTO: 30 minutes. RPO: 1 hour (catalog changes slowly and can be re-derived from the source of truth). Strategy: **pilot light**. Keep the catalog data replicated and the DB warm in DR, but leave the stateless serving tier off and spin it up on disaster. Cheaper than warm standby, and a 30-minute recovery is acceptable for browse if checkout is protected separately.

**Order history and account data** (needed, not on the hot path). RTO: 2 hours. RPO: 15 minutes. Strategy: **backup & restore** with 15-minute incremental backups plus continuous WAL archiving for point-in-time recovery, restored into fresh infra on disaster.

**Analytics/reporting warehouse** (internal, tolerant). RTO: 24 hours. RPO: 24 hours. Strategy: **backup & restore** from daily snapshots. It can be rebuilt from upstream sources anyway, so anything more is wasted spend.

Cross-cutting: all backups are **immutable / object-locked and cross-region** so ransomware or a bad migration cannot destroy the recovery point, because failover alone would just replicate corruption faster. I keep **runbooks** per tier and run a quarterly **game-day** that actually fails over checkout and times it against the 5-minute RTO. Tradeoff summary: I concentrate cost on checkout (warm standby) and deliberately accept slower recovery on catalog, history, and analytics. Common wrong turn: buying one uniform active/active tier for everything (overpaying for analytics) or, worse, calling nightly snapshots a DR plan without ever test-restoring them.

**Self-check rubric:**
- [ ] Defined RTO and RPO correctly and assigned concrete numbers per tier
- [ ] Chose a different ladder rung per tier and justified it by business impact/cost
- [ ] Gave the revenue-critical tier the strongest RPO and explained why
- [ ] Called out corruption/ransomware needing immutable backups, not just failover
- [ ] Said the plan is validated by restore drills / game-days

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the DR plan for a hospital's electronic health records (EHR) system where regulators require RPO under 15 minutes and RTO under 1 hour, and explain how you would prove the plan works before an auditor asks.

**Model answer (revealed on demand):**

Assumptions: EHR is safety-critical and regulated (think HIPAA-style controls); clinicians must reach records during an outage, and lost records can harm patients. Regulator-set targets: RPO < 15 min, RTO < 1 hour.

To hit RPO < 15 min I run **continuous replication**, not periodic snapshots: streaming database replication to a warm standby in a second region plus continuous transaction-log (WAL) archiving to immutable, cross-region storage. Committed writes reach the standby within seconds, so the realistic RPO is well under a minute of async lag, comfortably inside 15 minutes, with the WAL archive as the point-in-time floor if the standby itself is compromised.

To hit RTO < 1 hour I use **warm standby**: a scaled-down but functional EHR stack always running in DR, fronted by a DNS/global-LB failover that shifts clinician traffic on health-check failure. Failover plus scale-up is minutes, well under an hour.

Because EHR is a corruption/ransomware target, backups are **immutable (object-lock/WORM) and air-gapped** so an attacker who encrypts production cannot reach the recovery point, and I keep point-in-time restore to recover from a bad write rather than replicating it. Access to DR is role-gated and audited like production.

Proving it to an auditor: I do not claim readiness, I **demonstrate** it. Quarterly game-days actually fail over to DR and time both RTO and RPO against the targets, with signed records of each drill. Monthly automated **restore tests** provision a throwaway environment from backups and verify integrity. All runbooks are versioned, and I retain the drill logs, timings, and any misses-with-remediation as the audit evidence. Tradeoff: continuous replication plus an always-on warm standby is expensive, but for a regulated safety-critical system the alternative (a cheaper, slower rung) is not permitted. Common wrong turn: pointing at nightly backups and a written procedure that has never been restore-tested, which fails both the RPO math and the audit.

### sd-l7-multi-region: Multi-Region & Multi-AZ Architecture

- **id:** `sd-l7-multi-region`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** multi-region, replication, failover

#### Learn

Multi-AZ and multi-region are not the same tool, and conflating them is a common tell. Know exactly what each buys and what it costs.

**Multi-AZ** spreads a system across Availability Zones: physically separate data centers within one region, tens of km apart, connected by fast, low-latency (single-digit ms) links. Because latency between AZs is tiny, you can replicate **synchronously** across them cheaply, so multi-AZ is the default for HA. It protects against a data-center failure (power, cooling, a fire in one building) but *not* against a whole-region outage, and not against region-wide control-plane failures.

**Multi-region** spreads across regions hundreds or thousands of km apart, with 50-150+ ms of round-trip latency between them. It protects against losing an entire region (natural disaster, region-wide provider outage, regulatory blackout). But that latency changes everything about data: synchronous replication across regions would add 100+ ms to every write, so you almost always replicate **asynchronously**, which means the remote copy lags and a region loss can lose the un-replicated tail. Multi-region is expensive (full or partial stacks in each region, cross-region data transfer, more operational surface) and it makes consistency genuinely hard.

That hard part is the crux, and it is the CAP theorem made concrete. Across a WAN partition you cannot have both strong consistency and full availability:

- **Sync replication**: a write is acknowledged only after it lands in the remote region. RPO is zero, but every write eats the cross-region round trip, and if the remote region is unreachable your writes stall (you chose consistency over availability).
- **Async replication**: acknowledge locally, ship to the remote region in the background. Writes are fast and stay available, but the remote copy lags (seconds), so a sudden region loss loses the in-flight tail (non-zero RPO), and reads from the remote region can be stale.

For **active-passive** multi-region (one region serves, the other is a hot standby), async is standard: the passive region trails by seconds, and on failover you accept that small RPO. Simple, one writer, no conflicts.

For **active-active** multi-region (both regions take writes), you now have two places accepting writes to the same data, and reconciling them is the whole problem. Options:

- **Single-writer-region per record**: partition ownership so each record (or shard/tenant) has exactly one home region that owns its writes; other regions forward writes there or serve read-only. Avoids conflicts entirely at the cost of cross-region write latency for non-local records. This is the most common sane choice.
- **Conflict resolution**: allow writes anywhere and reconcile. Last-writer-wins (simple, silently drops one update), vector clocks (detect conflicts, push resolution to the app), or **CRDTs** (conflict-free replicated data types that merge deterministically, great for counters/sets/carts, not for everything).
- **Globally consistent stores** like Spanner or CockroachDB use synchronized clocks (TrueTime) and consensus to give strong consistency across regions, paying the latency, so you do not hand-roll conflict logic.

Traffic steering sits on top: **GeoDNS** (route by client location, but DNS TTL caching makes failover slow), a **global load balancer / anycast** (AWS Global Accelerator, Cloudflare) that health-checks regions and shifts traffic in seconds. Health-based failover moves traffic off a dead region automatically.

**Interview nuance:** two things separate strong answers. First, **cell-based and shuffle-sharding** thinking (next lesson) applies here: an active-active pair still shares a blast radius if a bad config or poison request replicates to both, so regions should fail independently and you must **test region evacuation** (actually drain a region) rather than assume it works. Second, do not claim multi-region gives strong consistency for free. It does not. You either pay cross-region latency (sync/Spanner) or accept eventual consistency and design conflict resolution. Saying "we go multi-region active-active and everything is consistent and fast" is the wrong turn interviewers wait for.

Recap: multi-AZ is cheap synchronous HA within a region; multi-region is expensive async protection against region loss; sync gives RPO~0 but latency and stall risk while async gives speed but lag/loss; active-active forces a consistency choice (single-writer-region, CRDTs, or a Spanner-class store); steer with GeoDNS/global-LB health-based failover and actually test region evacuation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a multi-region deployment for a globally used app; decide active-active vs active-passive, data replication mode, and traffic routing/failover.

**Think about:**
- What do multi-AZ and multi-region each protect against, and at what cost?
- Sync vs async replication: what is the RPO and latency tradeoff?
- How do you resolve conflicts in active-active?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a globally used app (say a collaboration/productivity SaaS) with users in North America, Europe, and Asia; goals are low read latency worldwide, survival of a full region loss, and honest data-correctness guarantees. Write volume moderate, reads dominant.

**Topology.** Each region is already **multi-AZ** internally (3 AZs, synchronous within-region replication) for cheap HA against a data-center failure. On top of that I run **three regions** (us-east, eu-west, ap-southeast) to survive a region loss and cut latency for each geography.

**Active-active vs active-passive.** I go **active-active for reads** (every region serves local reads, cutting latency to single-digit ms for nearby users) and **single-writer-region for writes**, which is a pragmatic active-active. Each account/workspace is *homed* to one region; that region owns its writes. Users read locally everywhere, and writes route to the workspace's home region. This avoids cross-region write conflicts entirely, which is the honest version of active-active. Fully symmetric multi-master (writes accepted anywhere) I would only choose for data that is naturally conflict-free (CRDT-friendly: presence, counters, collaborative doc ops via OT/CRDT).

**Replication mode.** Within a region: **synchronous** across AZs (RPO~0, sub-ms cost). Across regions: **asynchronous** (seconds of lag) because sync across 100+ ms WAN would make every write painfully slow and would stall on partition. I accept a small cross-region RPO on catastrophic region loss and make that explicit. For the small set of data that must be globally strongly consistent (billing, unique-username allocation) I use a Spanner-class store (Spanner or CockroachDB) and pay its latency rather than hand-roll conflict resolution.

**Traffic routing / failover.** A global anycast layer (AWS Global Accelerator / Cloudflare) with **health-based failover** steers users to the nearest healthy region and shifts traffic within seconds if a region fails checks; I avoid relying solely on GeoDNS because DNS TTL caching makes failover minutes-slow. On region loss, the failed region's homed workspaces are re-homed to a surviving region (promote its async replica, accepting the small RPO tail).

**Tradeoffs and wrong turn.** Cost roughly triples versus single-region, and cross-region writes for a non-local workspace are slower. I test **region evacuation** as a drill, not an assumption. Common wrong turn I avoid: claiming symmetric active-active multi-master gives strong consistency for free; instead I use single-writer-region (or CRDTs/Spanner) and name the consistency I actually provide.

**Self-check rubric:**
- [ ] Distinguished multi-AZ (sync, cheap, DC failure) from multi-region (async, expensive, region loss)
- [ ] Made an explicit active-active vs active-passive choice and justified it
- [ ] Stated sync (RPO~0, latency/stall) vs async (lag/loss) and where each is used
- [ ] Gave a concrete conflict strategy (single-writer-region, CRDTs, or Spanner-class store)
- [ ] Used health-based global-LB/anycast failover and noted GeoDNS TTL slowness; mentioned testing evacuation

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the multi-region data layer for a global shopping-cart service (think Amazon-scale) where the cart must always accept "add to item" writes even during a network partition, and no item a user added may silently vanish.

**Model answer (revealed on demand):**

Assumptions: carts are written from anywhere, availability of writes trumps immediate consistency (a customer must always be able to add to cart, even mid-partition), and the correctness rule is "never lose an added item." This is the classic Dynamo shopping-cart problem.

I choose **AP over CP** for the cart: always accept writes, reconcile later. That means an **active-active, multi-master** store replicating asynchronously across regions, backed by a Dynamo-style system (DynamoDB global tables, or Cassandra/Riak). Each region takes cart writes locally with low latency and stays writable during a partition because it does not need a cross-region quorum to accept a write.

The heart of the design is **conflict resolution that never drops an add**. Naive last-writer-wins is wrong here: if two regions concurrently modify a cart, LWW discards one region's change and an item vanishes, violating the rule. Instead I model the cart as a **conflict-free merge**. Adds are represented so that concurrent versions **merge by union** rather than overwrite: when replication surfaces divergent cart versions (detected via vector clocks / version vectors), I merge them by taking the union of added items (a CRDT OR-Set, or the classic Dynamo approach of returning both siblings and merging on read). The bias is deliberately toward keeping items: a resurrected deleted item (a known Dynamo quirk) is a far better failure than a lost purchase intent.

Quantities and removals get more care: I represent quantity as a PN-counter-style CRDT or reconcile by max, and treat deletes as tombstones with enough causal history that a concurrent add does not un-delete forever. Reads that encounter siblings merge them and write back the reconciled value.

Traffic: users hit the nearest region via anycast/global-LB; a region failure just routes them elsewhere, and because replication is async multi-master the cart is already writable there. Tradeoffs: I accept eventual consistency and occasional resurrected items in exchange for always-available writes and zero silent loss. Common wrong turn: using a single-writer-region or strong-consistency store here, which would block cart writes during a partition, exactly the availability the business refuses to give up.

### sd-l7-blast-radius-cells: Blast Radius Reduction: Cells & Static Stability

- **id:** `sd-l7-blast-radius-cells`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** cells, static-stability, blast-radius

#### Learn

Redundancy keeps you up when a component dies. Blast-radius reduction limits *how many users* any single failure, bad deploy, or poison input can hurt. The two are different: a perfectly redundant global fleet can still be taken down entirely by one bad config that every node loads. The goal here is that no single failure affects more than a small fraction of customers.

**Cell-based architecture** is the primary tool. Instead of one big shared stack serving all users, you run many independent, isolated **cells**, each a complete stack (LB, app, database, cache) serving a fixed subset of users. Cells share nothing at runtime: a failure, a bad deploy, an overloaded database, or a poison request in cell 7 cannot reach cells 1 through 6. If you have 20 cells and one fails, ~5% of users are affected, not 100%. A thin routing layer maps each user to their cell (by user id hash or tenant id) and is kept deliberately simple so it is not itself a fragile shared brain.

```
        [ thin cell router: user_id -> cell ]
        /        |          |          \
     cell-1    cell-2     cell-3  ...  cell-N     (each: full independent stack)
     LB/app    LB/app     LB/app       LB/app
     +DB       +DB        +DB          +DB
   failure in cell-3 stays in cell-3  ->  ~1/N of users affected
```

Cells also transform deploys: you roll a change **cell by cell** (a form of canary at the cell granularity), watch health, and stop after one cell if it regresses. A bad deploy hits one cell's worth of users, then halts.

**Shuffle sharding** sharpens isolation for shared-worker pools where full cells are too coarse. Suppose 8 workers and you assign each customer 2 of them at random. With plain sharding (each customer pinned to 1 worker), a customer who sends poison traffic takes down everyone on that worker. With shuffle sharding, each customer gets a *unique combination* of 2 workers out of 8 (28 possible pairs). A noisy or malicious customer degrades only their 2 workers; another customer overlapping on at most one of those workers still has a second healthy worker and stays up. With enough workers and picks, the probability that two customers share their *entire* combination is tiny, so one poison tenant is isolated to a handful of others rather than everyone. AWS Route 53 and API Gateway use this to contain abusive customers.

Blast radius is a lens you apply everywhere, not just to compute: **deploys** (canary/cell-by-cell), **data** (partition so one corrupt shard is not the whole dataset), and **dependencies** (bulkheads and circuit breakers so one slow downstream does not exhaust every thread).

**Separate control plane from data plane.** The data plane serves user requests (the hot path). The control plane manages the system: config changes, scaling decisions, deployments, service discovery, health orchestration. Control planes are complex and change often, so they fail more. If your data plane *depends on the control plane being up to serve requests*, then a control-plane outage becomes a user-facing outage. The rule: the data plane must keep serving even while the control plane is down.

Which brings in **static stability**, the AWS-coined principle that ties this together: a system is statically stable if it keeps working on its **last-known-good state** when its dependencies (especially the control plane) are unavailable, taking **no new action** that requires them. The canonical example: an EC2 instance keeps running even if the EC2 control-plane API is down, because running instances do not need the control plane; you just cannot *launch new ones* until it recovers. Applied to your design: cache config locally and keep serving the last-known-good config if the config service is unreachable, rather than failing or blocking. Load balancers should keep routing to the last-known-healthy set if the health-check control plane blips, rather than assuming "no data means all dead" and ejecting everyone. The failure mode static stability prevents is a control-plane hiccup cascading into a total data-plane outage.

**Interview nuance:** the wrong turn interviewers listen for is a design where "one bad tenant or one bad deploy takes down everyone," or where the data plane cannot serve a single request because a control-plane component (config store, service discovery, a central auth service) is briefly down. Strong answers bound impact with cells/shuffle-sharding *and* make the data plane statically stable so it coasts on cached state through control-plane failures.

Recap: cells give independent isolated stacks so one failure hits ~1/N of users, shuffle sharding gives each customer a unique worker combination to isolate noisy tenants, apply blast-radius thinking to deploys/data/dependencies, separate control plane from data plane, and use static stability so the data plane keeps serving last-known-good state when the control plane is down.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Redesign a multi-tenant SaaS so a bad deploy or poison tenant impacts under 5% of customers; use cells, shuffle sharding, and static stability.

**Think about:**
- How do cells and shuffle sharding bound impact?
- Why separate control plane from data plane?
- What is static stability, and why does it matter when the control plane is down?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a multi-tenant SaaS on one big shared stack today, so any bad deploy or heavy/abusive tenant currently affects 100% of customers. Goal: no single failure or deploy hits more than ~5% of customers.

**Cells.** I split the shared stack into at least **20 independent cells**, each a full self-contained stack (LB, app, database, cache) serving a fixed slice of tenants (~5% each). Cells share nothing at runtime, so a database meltdown, memory leak, or poison request in one cell is contained to that cell's ~5%. A thin, deliberately simple **cell router** maps tenant id to cell. I keep cells sized so no single cell exceeds the 5% target, and I place large tenants carefully (a huge tenant may get its own dedicated cell).

**Deploys become cell-by-cell.** I roll each change one cell at a time, bake and watch golden signals, and halt if a cell regresses. A bad deploy therefore reaches at most one cell (~5%) before automated health gates stop the rollout, instead of everyone. This is canary at cell granularity.

**Shuffle sharding** inside shared pools. For any tier that is still a shared worker pool (say async job workers or a rate-limited API front), I assign each tenant a unique random *combination* of workers rather than pinning them to one. A poison tenant then degrades only their small combination of workers; other tenants, overlapping on at most part of that set, keep a healthy worker and stay up. This isolates a noisy neighbor to a handful of tenants, not the whole pool.

**Control plane vs data plane + static stability.** I separate the control plane (deploys, config distribution, tenant->cell mapping updates, autoscaling) from the data plane (serving tenant requests). Critically, the data plane is **statically stable**: each cell caches its config and its tenant-routing table locally and keeps serving on last-known-good state if the control plane is unreachable. It takes no action that *requires* the control plane to serve a request. So a control-plane outage means "we cannot deploy or re-shard right now," not "customers are down." Health checking likewise coasts on last-known-healthy rather than ejecting everything on a blip.

**Tradeoffs.** Cells add operational overhead (N stacks to run, patch, and observe) and complicate cross-tenant features; per-cell databases mean data is partitioned, not global. I accept that in exchange for a hard 5% blast-radius ceiling. Common wrong turn: keeping one shared database or one shared deploy under the "cells," so a poison tenant or bad migration still reaches everyone through the shared piece.

**Self-check rubric:**
- [ ] Used cells to cap any single failure at ~1/N (~5%) of customers
- [ ] Made deploys cell-by-cell with health gates to bound bad-deploy impact
- [ ] Applied shuffle sharding to isolate a noisy/poison tenant in shared pools
- [ ] Separated control plane from data plane
- [ ] Made the data plane statically stable (serves last-known-good when control plane is down)
- [ ] Avoided a hidden shared component (DB/deploy) that reintroduces global blast radius

#### Practice: real-world variant (save, then reveal)

**Prompt:** Explain how you would design a global DNS/health-check service (think Route 53 scale, serving millions of queries/second across all customers) so that one abusive customer's traffic and one control-plane outage each affect a minimal set of customers, and the service keeps answering queries even when its control plane is completely down.

**Model answer (revealed on demand):**

Assumptions: an authoritative DNS + health-checking service at Route-53 scale; queries are the hot data-plane path and must never stop; the control plane handles record changes, health-check configuration, and customer onboarding.

**Data plane must be statically stable, full stop.** DNS resolution is life-or-death for every customer's site, so the resolvers (data plane) serve from **locally replicated zone data and last-known health state**. If the control plane is entirely down, resolvers keep answering with the last-known-good records and last-known health status. The only thing lost is the ability to *change* records or reconfigure health checks, not the ability to answer. This is exactly the EC2-style static stability principle: running functions do not depend on the control plane.

**Shuffle sharding to contain abuse.** The resolver fleet is huge, and I assign each customer's zones a **unique shuffle-sharded subset** of resolver capacity (this is literally what Route 53 does). A customer under a massive DDoS or one issuing pathological queries only stresses their subset of nodes; another customer overlapping on at most a few of those nodes retains healthy capacity elsewhere. With enough nodes and picks, the chance two customers share their full combination is negligible, so abuse is isolated to a tiny blast radius instead of the whole fleet.

**Cell-based control plane.** The control plane is regionalized/celled so a control-plane failure in one cell affects only the customers homed there, and control-plane failures never propagate to the data plane by construction (the data plane does not call the control plane on the query path).

**Propagation as async, not synchronous dependency.** Record and health changes flow to resolvers via an async replication pipeline; resolvers apply updates when they arrive but never block a query waiting for the control plane. Tradeoff: changes have eventual propagation delay (seconds), which I accept because the alternative (resolvers synchronously consulting the control plane) would make a control-plane blip a global DNS outage. Common wrong turn: putting any control-plane call on the query hot path, which turns the most failure-prone subsystem into a single point of global failure.
