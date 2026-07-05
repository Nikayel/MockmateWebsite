> Module **sd-l7-m5** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l7-m4](./sd-l7-m4.md) · Next: [sd-l8-m1](./sd-l8-m1.md)

# L7 · Deploy, Release & Chaos

After this module you can pick and defend a safe rollout strategy (rolling, blue-green, canary) with real health gates and a tested rollback path, decouple release from deploy using feature flags while migrating a live schema with zero downtime, design a chaos experiment that has a hypothesis and a bounded blast radius, and run an incident plus write the blameless postmortem that stops it from recurring.

### sd-l7-deployment-strategies: Deployment Strategies: Blue-Green, Canary, Rolling

- **id:** `sd-l7-deployment-strategies`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** deployment, canary, blue-green

#### Learn

A deploy is a change to a running system, and most outages are self-inflicted by a change. The whole discipline of release engineering is about making that change small, observable, and reversible. Three strategies dominate, and they trade infra cost against rollback speed and blast radius.

**Rolling** replaces instances in place, a few at a time. You have N pods; the orchestrator (Kubernetes Deployment with `maxSurge`/`maxUnavailable`) drains and replaces them in batches until every pod runs the new version. Cost is near zero (no extra fleet), but rollback is slow because "rolling back" is just another rolling deploy in reverse, and during the roll both versions serve live traffic simultaneously. That last fact is the source of most rolling-deploy surprises.

**Blue-green** stands up a full second environment (green) alongside the live one (blue), warms it, smoke-tests it, then flips the router/load-balancer to send 100% of traffic to green in one move. Rollback is instant: flip the router back to blue, which is still running. The cost is doubling your fleet for the duration, plus the hard part that the shared database must be compatible with both versions at the moment of the flip and the moment of the flip-back.

**Canary** routes a small slice (1%, then 5%, 25%, 50%, 100%) of real production traffic to the new version and watches it. It has the smallest blast radius of the three because a bad build only touches 1% of users before you catch it. Canary is only as good as its **automated analysis**: a system (Argo Rollouts + Prometheus, Spinnaker + Kayenta, Flagger) that compares the golden signals (error rate, p99 latency, saturation) of the canary against the baseline over a **bake time** at each step, and auto-aborts if the canary's SLIs diverge. Without automated analysis a canary is just a slow manual deploy where a human squints at a dashboard.

```
Rolling:   [v1 v1 v1 v1] -> [v2 v1 v1 v1] -> [v2 v2 v1 v1] -> [v2 v2 v2 v2]   (both versions live mid-roll)
Blue-Green: blue=100% live | green warmed --smoke ok--> router flip --> green=100% (blue idle, instant rollback)
Canary:    v2 gets 1% -> analyze -> 5% -> analyze -> 25% -> ... auto-abort if SLIs diverge
```

**Interview nuance:** separate *deploy* from *release*. Deploy means the new code is present on machines; release means live traffic is running on it. Blue-green and flags let you deploy without releasing, which is what makes rollback a routing change (seconds) instead of a rebuild (minutes). If your rollback path is "redeploy the old version," you do not have a fast rollback, you have a slow one you have not tested.

The trap that ties this module together is the **destructive schema change**. During any of these strategies old and new code run at the same time (mid-roll, at the blue-green flip, during a canary). If the new deploy drops or renames a column the old code still reads, the old version breaks the instant the migration runs, and you cannot roll back the code because the schema is already gone. Schema changes must be backward compatible with the currently deployed version, which is the next lesson.

Recap: rolling is cheap but slow to reverse, blue-green buys instant rollback for double the fleet, canary gives the smallest blast radius but needs automated analysis and bake time, and every strategy runs two versions at once so never ship a destructive schema change inside a code deploy.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose and design a rollout strategy for a schema-touching backend change, and describe the traffic ramp, the health gates between steps, and the exact rollback path.

**Think about:**
- What does each strategy trade in infra cost and rollback speed?
- What automated analysis gates a canary?
- Why separate 'deploy' from 'release'?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a payments service, ~5k QPS, on Kubernetes behind Envoy, backed by Postgres. The change adds a `currency_code` column and new write logic. I want small blast radius and fast rollback, so I choose **canary** for the code and **expand/contract** for the schema, run as two separate deploys.

**Schema first, non-destructively.** Deploy migration 1: `ADD COLUMN currency_code TEXT NULL` with a default applied in application code. This is backward compatible, so the currently live version ignores the new column and keeps working. I never rename or drop anything in the same deploy as the code that depends on it.

**Canary ramp with gates.** Using Argo Rollouts, I route 1% of traffic to the new version. At each step (1%, 5%, 25%, 50%, 100%) there is a **bake time** of 10 to 15 minutes during which Kayenta/Prometheus runs automated analysis: it compares the canary's error rate, p99 latency, and 5xx ratio against the baseline pods. Promotion to the next step happens only if every SLI stays within tolerance; any breach triggers **auto-abort**, which shifts traffic back to 0% on the canary. Health gates are objective metrics, not a human eyeball.

**Rollback path (tested).** Because the schema change was additive, rolling the code back is safe: auto-abort routes 100% back to the old version, which still functions because the new column is nullable and unused by it. The rollback is a routing change of seconds, not a rebuild. Only after the new version is at 100% and stable for a day do I run the **contract** migration to drop the old column, in a later deploy.

**Deploy vs release.** The code is deployed to the canary pods before any meaningful traffic reaches it; the "release" is the analysis-gated traffic ramp. That decoupling is what makes rollback instant.

**Common wrong turn:** shipping `ALTER TABLE ... DROP COLUMN` or a rename inside the same deploy as the new code. The moment it runs, the still-live old version 500s, and you cannot roll the code back because the schema it needs is gone. You have converted a reversible deploy into an outage.

**Self-check rubric:**
- [ ] Picked a strategy and justified it on blast radius and rollback speed
- [ ] Made the schema change additive/backward compatible, in a separate deploy from the code
- [ ] Defined an explicit traffic ramp with bake time at each step
- [ ] Named concrete automated analysis (golden signals) as the promotion gate with auto-abort
- [ ] Described a rollback that is a routing change, and split deploy from release

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the deploy strategy for a change to Netflix's playback-authorization service, which serves ~2M RPS globally across three AWS regions and cannot tolerate more than a few seconds of elevated error rate. Specify how you ramp, what auto-aborts you, and how you avoid a global blast radius.

**Model answer (revealed on demand):**

Assumptions: stateless service, multi-region active-active, fronted by regional load balancers, strict SLO (99.99% availability, so the monthly error budget is minutes). A bad global deploy could black out playback worldwide, so the design goal is to make it structurally impossible to break all regions at once.

**Region-by-region canary.** I never deploy to all regions simultaneously. I canary in one region first (say us-east-1): 1% of that region's traffic to the new version, with Kayenta automated analysis comparing canary vs baseline on error rate, latency, and playback-start success. Bake 10 minutes per step, ramp 1% to 100% within the region. Only after the first region is fully healthy for a bake period do I begin the next region, and I keep at least one region entirely on the old version until the last step. This caps blast radius at one region even for a bug the canary analysis misses.

**Auto-abort tied to the SLO.** The abort threshold is derived from the error budget, not a round number: if the canary burns budget faster than roughly 10x the baseline rate over a 5-minute window, Argo/Spinnaker auto-rolls traffic back to 0% and pages nobody unless the rollback itself fails. Because Netflix pioneered this, the analysis runs continuously, not at a single checkpoint.

**Fast reversal.** The old version is still fully deployed and taking traffic in the untouched regions, so a bad build is contained by shifting the canary region's traffic back and, if needed, using regional DNS/load-balancer steering to drain the affected region to the healthy ones. Recovery is a routing change measured in seconds.

**Common wrong turn:** a single global canary at 1% of *global* traffic. That still exposes every region to the new code path and a subtle bug (say a bad cache-key format) can corrupt shared state across regions before analysis fires. Regional isolation, not just percentage, is what bounds the blast radius at this scale.

### sd-l7-progressive-delivery-schema: Progressive Delivery, Feature Flags & Zero-Downtime Schema Changes

- **id:** `sd-l7-progressive-delivery-schema`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** feature-flags, progressive-delivery, schema-migration

#### Learn

Progressive delivery is the practice of shipping code dark and then turning it on gradually, independent of the deploy. The two tools are **feature flags** for behavior and the **expand/contract** pattern for schema. Both exist because, during any rollout, old and new code run at the same time, so every change in flight must be both backward compatible (old code tolerates the new state) and forward compatible (new code tolerates the old state).

**Feature flags** are runtime conditionals (`if flag('new_pricing_engine', user)`) evaluated against a flag service (LaunchDarkly, Unleash, Statsig, or a homegrown config-plus-Redis setup). They decouple deploy from release: you deploy the new code disabled, then flip it on for 1% of users, then 100%, and if it misbehaves you flip it off in seconds without a redeploy. That kill switch is the point. Flags also target: by percentage, by user segment, by geo, by tenant, or by an allowlist, which is how you dogfood internally, then beta a cohort, then GA. The same flag doubles as a **feature circuit breaker**, cut a struggling feature to shed load during an incident. The tax is flag debt: every flag is a live branch, so you must remove flags after full rollout or they rot into untested dead paths.

**Expand/contract** (also called parallel change) migrates schema in ordered, individually-safe steps so that at no point does the deployed code disagree with the schema:

```
1. EXPAND    add the new column/table (nullable, additive) -- old code unaffected
2. DUAL-WRITE deploy code that writes BOTH old and new; reads still from old
3. BACKFILL  copy historical rows old -> new, throttled + idempotent + restartable
4. MIGRATE READS switch reads to the new column (behind a flag), verify parity
5. CONTRACT  once nothing reads the old column, stop dual-writing, then drop old
```

Each arrow is a separately deployable, separately reversible step. You never combine "add new" with "drop old" in one deploy, because that is exactly the destructive change that makes rollback impossible.

For the physical DDL on a large hot table, a naive `ALTER TABLE` can lock the table and stall writes. **Online schema-change tools** (gh-ost, pt-online-schema-change for MySQL) build a shadow table, backfill it while capturing live changes via triggers or the binlog, and swap it in with a brief atomic rename, so the table stays writable throughout. Backfills must be **throttled** (chunked, watching replica lag), **idempotent** (safe to re-run), and **restartable** (checkpoint progress) because a multi-hour backfill will get interrupted.

**Interview nuance:** the classic disaster is renaming a column. `ALTER TABLE users RENAME COLUMN email TO email_address` looks trivial and is a trap: the instant it runs, every still-deployed old instance that selects `email` breaks, and you cannot roll the code back because the column named `email` no longer exists. The correct answer is expand/contract: add `email_address`, dual-write, backfill, migrate reads, then drop `email` in a later deploy. A rename is never one step in a live system.

Recap: flags decouple release from deploy and give you a per-feature kill switch and targeting, expand/contract migrates schema in individually-safe reversible steps, everything in flight must be backward and forward compatible, and never pair "add new" with "drop old" in a single deploy.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Roll out a risky new pricing engine behind flags to 1% then 100%, and separately rename a heavily-used DB column with zero downtime. Give the ordered migration steps for each.

**Think about:**
- How do flags enable targeted rollout, kill-switch, and experiments?
- What is the expand/contract (parallel change) sequence?
- Why must changes be both backward and forward compatible during rollout?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: an e-commerce checkout service on Kubernetes with Postgres; the pricing change alters money math, so a bug is a revenue/trust incident. The column rename targets `orders.amount` (hot, millions of rows) to `orders.amount_cents`.

**Pricing engine behind a flag.** Deploy the new engine dark: the code is present but gated by `flag('new_pricing_engine')`, defaulting off, so the release is decoupled from the deploy. Turn it on for an internal-employee allowlist first (dogfood), then 1% of real users. Run it as an **experiment**: compute the new price alongside the old for flagged users and log both, so I can compare distributions before trusting it. Ramp 1% -> 5% -> 25% -> 100% while watching order-value distribution, checkout error rate, and support tickets. If anything looks wrong, flip the flag off in seconds, no redeploy. That kill switch is why a flag beats a plain canary here. After 100% and a stable week, delete the flag to avoid flag debt.

**Column rename with zero downtime (expand/contract).**
1. **Expand:** `ADD COLUMN amount_cents BIGINT NULL`. Old code is untouched.
2. **Dual-write:** deploy code that writes both `amount` and `amount_cents` on every insert/update; reads still use `amount`. Backward and forward compatible.
3. **Backfill:** a throttled, idempotent, restartable job copies `amount` -> `amount_cents` in chunks, watching replica lag; use gh-ost/pt-osc semantics so the table stays writable and never long-locks.
4. **Migrate reads:** behind a flag, switch reads to `amount_cents`, verify parity against `amount` for a bake period.
5. **Contract:** once nothing reads or writes `amount`, stop dual-writing, then in a final separate deploy `DROP COLUMN amount`.

**Why both-directional compatibility.** Mid-rollout, some pods run old code and some new. New code must tolerate rows where `amount_cents` is still NULL (forward compat during backfill); old code must tolerate the extra column existing (backward compat). Violate either and the mixed fleet breaks.

**Common wrong turn:** rolling back the pricing code after a bad migration without rolling back the schema, or doing the rename in one `ALTER`. Either leaves deployed code pointing at a column that no longer matches, so rollback itself fails and the outage extends.

**Self-check rubric:**
- [ ] Shipped the pricing engine dark and used the flag as an instant kill switch, not just a ramp
- [ ] Used targeting (allowlist/percentage) and ran it as a compare-both experiment
- [ ] Gave the full expand/contract sequence with add before drop, in separate deploys
- [ ] Made the backfill throttled, idempotent, and restartable, using online-DDL tooling
- [ ] Justified backward AND forward compatibility for the mixed old/new fleet, and removed the flag after

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the migration to shard Stripe's monolithic `charges` table (billions of rows, thousands of writes/sec, zero tolerance for a wrong or lost charge) from a single Postgres primary onto a partitioned/sharded layout, keeping the API serving throughout. Give the ordered steps and how you verify no charge is lost.

**Model answer (revealed on demand):**

Assumptions: financial data, so correctness dominates and any inconsistency is a payable incident. Single Postgres primary is the write bottleneck; target is charges sharded by a customer/merchant key. Must stay online.

**Expand/contract at the storage layer.**
1. **Expand:** stand up the new sharded cluster (e.g. Postgres partitioned by hash of merchant_id, or Citus). Schema present, no traffic.
2. **Dual-write:** deploy a data-access layer that writes every charge to both the old table and the new shards inside the same logical unit, with the old store still authoritative for reads. Behind a flag so it can be cut instantly.
3. **Backfill:** throttled, idempotent, restartable job copies historical charges into the shards, chunked by id range with checkpoints, watching replica lag and CDC lag. Use an online tool or a CDC stream (Debezium off the WAL) so nothing long-locks.
4. **Reconcile (the part that matters for money):** a continuous verifier reads both stores and asserts row counts and per-charge field parity, emitting a diff metric. I do not migrate reads until the diff is zero and stays zero across a bake period. This catches dropped or mismatched charges before they can affect a customer.
5. **Migrate reads:** flip reads to the shards for 1% of merchants, then ramp, comparing responses against the old store (shadow reads) until parity holds.
6. **Contract:** once reads are fully on shards and dual-write has been off long enough to be sure, decommission the old table.

**Verification of no loss:** the reconciliation job plus shadow reads are the safety net; the migration is gated on their metrics, not on a calendar. Rollback at any step is a flag flip back to the still-authoritative old store.

**Common wrong turn:** cutting reads over based on "backfill finished" without a continuous reconciliation gate. At billions of rows a 0.001% drift is thousands of wrong charges, and you will not know until a customer disputes one.

### sd-l7-chaos-engineering: Chaos Engineering & Fault Injection

- **id:** `sd-l7-chaos-engineering`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** chaos, fault-injection, resilience

#### Learn

Chaos engineering is not "randomly break things." It is the disciplined practice of running controlled experiments on a system to build confidence that it withstands turbulent real-world conditions. Every redundancy, timeout, retry, and failover you designed is a hypothesis about behavior under failure, and an untested failover is not a failover, it is a guess. Chaos engineering turns those guesses into evidence.

**The method** is a scientific loop:
1. Define the **steady state** as a measurable output that means "the system is healthy," typically a business or SLI metric like successful checkouts per second or playback-start rate, not an internal metric like CPU.
2. Form a **hypothesis**: "if we inject fault X, the steady-state metric stays within tolerance because failover/degradation Y handles it."
3. **Inject a real-world fault** into a controlled slice.
4. **Measure** the steady-state metric against the hypothesis.
5. **Learn**: either you gained confidence, or you found a weakness to fix before it finds you at 3 a.m.

**Fault types** map to real failures: added latency (a slow dependency), error injection (a dependency returning 500s), instance/AZ/region termination (Chaos Monkey killing a node, an AZ going dark), resource exhaustion (CPU/memory/disk/file-descriptor pressure), and dependency loss (the cache tier or a downstream service disappearing). Each corresponds to something that will actually happen in production.

**Blast radius** is the safety discipline that separates engineering from sabotage. You start with the smallest possible scope (one instance, one non-critical service, a tiny percentage of traffic, off-peak) and expand only as confidence grows. You always run with **guardrails**: an automatic **abort condition** that halts and reverts the experiment the moment a key metric crosses a threshold. That abort should be tied to the **error budget**, if the experiment is about to burn more budget than you can afford, it stops itself, so a chaos experiment can never cause an outage worse than your reliability target already tolerates.

**Interview nuance:** the strongest justification for running in production (with guardrails) rather than only staging is that staging never matches real conditions: real traffic patterns, real data volumes, real cache-hit ratios, real cross-service dependency graphs, and real autoscaler behavior only exist in prod. A failover that works in an empty staging environment routinely fails under production load. That is precisely the class of bug chaos exists to find, so you must eventually test where the risk lives, carefully.

Maturity progresses from **GameDays** (scheduled, human-run exercises where a team injects a fault together and watches) toward **continuous automated experiments** run by tooling: AWS Fault Injection Simulator (FIS), Gremlin, Chaos Mesh (Kubernetes), and Netflix's Chaos Monkey / Simian Army lineage. Automation lets you re-verify resilience on every change, so it does not silently regress.

Recap: state a steady-state hypothesis, inject a realistic fault into the smallest blast radius, measure against the hypothesis, always run with an error-budget-tied auto-abort, and test in production with guardrails because staging never reproduces real conditions.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a chaos experiment to validate that a service survives losing its cache tier. State the hypothesis, the blast radius, the metrics you watch, and the abort criteria.

**Think about:**
- What is the steady-state-hypothesis method?
- Why run in production with guardrails rather than only staging?
- What automatic stop condition ties to the error budget?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a product-catalog service at ~20k QPS fronting Postgres with a Redis cache at a ~95% hit ratio. The fear is that if Redis vanishes, the 5% miss rate becomes 100% and Postgres gets a 20x read surge that could topple it. I want to prove the service degrades gracefully instead.

**Steady-state hypothesis.** Steady state is "catalog p99 latency < 200ms and error rate < 0.1% at current QPS." Hypothesis: "if Redis becomes unavailable, the steady state holds within tolerance because request coalescing, a small in-process cache, and a Postgres read-replica pool absorb the miss surge, with load-shedding as a backstop."

**Fault and blast radius.** The fault is dependency loss: make Redis unreachable. I do NOT flush production Redis. I start tiny: inject the fault for a single canary instance (or 1% of traffic via a fault-injection sidecar / Envoy fault filter / AWS FIS) that treats Redis as down, off-peak, while the rest of the fleet runs normally. This bounds the blast radius to a slice of users and lets me compare the fault instance against the healthy baseline. Only if it holds do I widen to 5%, then an AZ, then consider the whole tier.

**Metrics.** I watch the steady-state SLIs (catalog p99, error rate, successful responses per second) plus the downstream signal that actually predicts collapse: Postgres read QPS, connection-pool saturation, and replica CPU. The point of the experiment is to see whether the DB surge stays survivable.

**Abort criteria (tied to error budget).** Automatic abort if error rate exceeds 1% or p99 exceeds 500ms for more than 60 seconds, or if Postgres connection saturation crosses 90%. That threshold is derived from the error budget: the experiment may consume a bounded, pre-agreed slice of budget and no more, and crossing it instantly reverts the injection (restore Redis reachability for that slice). The experiment can never cause a worse outage than the SLO already tolerates.

**Why production.** Staging has a warm empty cache, tiny data, and no real traffic mix, so the miss surge there is meaningless. Only production has the real 95% hit ratio and real QPS, which is the entire variable under test.

**Common wrong turn:** running with no hypothesis and no abort ("let's just kill Redis and see"), which is not an experiment, it is an incident. Equally wrong: flushing the whole prod cache at once, converting a bounded test into a real 20x DB overload.

**Self-check rubric:**
- [ ] Defined steady state as a measurable SLI/business metric and wrote an explicit hypothesis
- [ ] Chose a realistic fault (dependency loss) and started with the smallest blast radius
- [ ] Watched both the SLIs and the downstream metric that predicts collapse
- [ ] Gave a concrete auto-abort tied to the error budget that reverts the injection
- [ ] Justified running in production because staging cannot reproduce the real cache-hit ratio and load

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design a GameDay for a fintech that must prove its payments platform survives losing an entire AWS availability zone during business hours, without dropping or double-processing a single payment. State the hypothesis, blast radius controls, what you measure, and the abort plan.

**Model answer (revealed on demand):**

Assumptions: multi-AZ active-active payments platform on AWS, strict correctness (no lost or duplicate payment) and a tight availability SLO. The claim under test is that AZ redundancy actually fails over cleanly under real load.

**Hypothesis.** Steady state: payment-authorization success rate > 99.9% and settlement lag within SLA. Hypothesis: "if we terminate AZ us-east-1a, steady state holds within tolerance because load balancers reroute to the surviving AZs, the DB has a synchronous standby that promotes, and in-flight payments are idempotent so none are lost or double-charged."

**Fault and blast radius.** Use AWS FIS to progressively fail AZ-a: first inject latency/errors to a small percentage of AZ-a traffic, then terminate a subset of AZ-a instances, then simulate full AZ loss. Business-hours is deliberate because that is when the failover matters, but I bound risk by ramping the scope and having every payment write be idempotent (keyed by an idempotency token) so a reroute or retry cannot double-process. I brief on-call, freeze other deploys, and run inside a declared maintenance-aware window.

**What I measure.** Authorization success rate, p99 auth latency, DB failover time and replication lag at promotion, and a reconciliation counter that asserts every initiated payment reaches exactly one terminal state. The idempotency/reconciliation check is the one that guarantees correctness, not just availability.

**Abort plan.** Auto-abort and restore the AZ if success rate drops below 99% for 60s, if DB promotion exceeds the RTO, or if the reconciliation counter shows any divergence at all (zero tolerance for lost/duplicate payments). Abort is a single control that stops the FIS experiment and re-enables the AZ.

**Common wrong turn:** treating this as a pure availability test and skipping the exactly-once reconciliation. An AZ failover can be "successful" on latency while silently double-submitting the payments that were in flight during the promotion, which is the far more expensive failure for a fintech.

### sd-l7-incident-postmortem: Incident Management & Blameless Postmortems

- **id:** `sd-l7-incident-postmortem`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** incident-management, postmortem, oncall

#### Learn

Failure is inevitable at scale, so the differentiator is not preventing every incident but detecting, responding, and learning fast enough that reliability compounds over time. Incident management is the structured response; the blameless postmortem is the learning loop. Companies usually adopt both right after their first big outage teaches them that ad-hoc heroics do not scale.

**Severity levels** give everyone a shared vocabulary for "how bad" and the expected response. A typical scheme: **SEV1** = critical, major user-facing outage or data loss, all-hands, wake people up; **SEV2** = significant degradation, urgent but not everything-down; **SEV3** = minor/partial, handled in business hours; **SEV4** = negligible, tracked but not paged. Each level has explicit **entry criteria** (e.g. "checkout error rate > 5% for 5 min = SEV1") so declaring severity is objective, not a debate, and the severity drives who is paged and how often you communicate.

**Roles** exist to separate coordination from fixing, because the person elbow-deep in the database should not also be fielding "is it fixed yet?" from executives. The **Incident Commander (IC)** owns the response, makes decisions, and delegates; they do not fix, they coordinate. The **Communications Lead** posts regular updates to stakeholders and the status page on a fixed cadence. The **Operations/Scribe** does the hands-on remediation and keeps a timestamped log of actions. This is adapted from emergency-services incident command. In a small SEV3 one person may hold several hats; in a SEV1 they are distinct people.

**The response flow prioritizes mitigation over diagnosis:** detect -> triage/declare severity -> **mitigate (stop the bleeding)** -> then root-cause. During an active incident, restoring service beats understanding it. If a bad deploy is suspected, roll it back first and investigate after; if a region is unhealthy, fail traffic away first. Chasing the root cause while users are down is a classic and expensive mistake. Diagnosis is what the postmortem is for; mitigation is what the incident is for.

```
detect -> declare SEV + assign IC/Comms/Ops -> MITIGATE (rollback / failover / shed) -> service restored
        -> (only now) diagnose root cause -> blameless postmortem -> action items -> tracked to done
```

**The blameless postmortem** is the compounding step. Blameless means it assumes everyone acted reasonably with the information and tools they had, so the analysis targets the *system* that allowed the failure, not the individual who tripped it. Structure: a **timeline** (what happened, when), **impact** (users/revenue/duration), **contributing causes** (usually several, not one), and **action items** with named owners and due dates. Action items that are not tracked to completion are the reason the same incident recurs.

**Interview nuance:** never accept "human error" as a root cause, and be ready to say why. "Engineer ran the wrong command" is a stopping point that hides the real questions: why did the system let a single command take prod down, why was there no confirmation or dry-run, why did no guardrail catch it? Ask "why did the system allow this?" (this is the spirit of the Five Whys). Blameful postmortems make people hide mistakes, which hides the next incident, so blamelessness is a reliability strategy, not just a kindness.

Recap: objective severity levels drive the response, separate the Commander from the fixers, mitigate before you diagnose, and run a blameless postmortem that targets the system (never "human error") with owned action items tracked to completion.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Define an incident-response process (severity levels, roles, comms cadence) for a company scaling past its first big outage, and the structure of the blameless postmortem that follows.

**Think about:**
- What roles separate coordination from fixing?
- Why does mitigation beat diagnosis during an incident?
- Why avoid 'human error' as a root cause?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a ~150-person startup that just had a multi-hour outage handled by whoever happened to be online. I want a lightweight but real process that scales.

**Severity levels with objective entry criteria.** SEV1: major outage or data loss (e.g. checkout error rate > 5% for 5 min, or any data corruption), page immediately, all-hands. SEV2: significant degradation affecting many users but with a workaround, urgent response. SEV3: minor/partial, business hours. SEV4: negligible, ticket only. Objective triggers mean anyone can declare without a debate.

**Roles that separate coordination from fixing.** On a SEV1 I appoint an **Incident Commander** who runs the response and decides, but does not touch keyboards; a **Communications Lead** who posts updates to the status page and internal channel; and **Operations/Scribe** engineers who do the hands-on fix and keep a timestamped action log. Anyone can declare an incident and become the initial IC until a more appropriate one takes over. For a SEV3 one person wears several hats.

**Comms cadence.** SEV1: stakeholder + status-page update every 15 to 30 minutes even if the update is "still investigating," because silence is worse than bad news. SEV2: every 30 to 60 minutes. This is why Comms is a separate role: fixed cadence should never depend on the person doing the fixing.

**Response flow: mitigate first.** Detect (alerting on SLOs) -> declare severity and assign roles -> **stop the bleeding** (roll back the suspect deploy, fail over the region, shed load, flip a feature flag off) -> only then diagnose. Restoring service is the job during the incident; understanding it is the job of the postmortem. Rolling back first and investigating later routinely turns a 2-hour outage into a 10-minute one.

**Blameless postmortem structure.** Within a few days: a factual **timeline**, quantified **impact** (users, revenue, duration), **contributing causes** (expect several, from the trigger to the missing guardrail to the slow detection), and **action items** each with a named owner and due date, tracked in the same system as feature work so they actually ship. Blameless means we ask "why did the system allow this," not "who did it."

**Common wrong turn:** a postmortem that concludes "human error, engineer will be more careful." That names no fixable system weakness, so the same incident recurs, and it teaches people to hide mistakes, which blinds you to the next one.

**Self-check rubric:**
- [ ] Defined severity levels with objective entry criteria that drive paging
- [ ] Separated Incident Commander (coordinates) from Ops (fixes) and Comms (updates)
- [ ] Set a fixed comms cadence owned by someone other than the fixer
- [ ] Put mitigation before diagnosis in the response flow, with concrete mitigations
- [ ] Structured a blameless postmortem (timeline, impact, contributing causes, owned action items) and rejected 'human error' as a root cause

#### Practice: real-world variant (save, then reveal)

**Prompt:** Walk through your first 30 minutes as Incident Commander for a Cloudflare-style global outage where a single bad config push has taken down a service fronting millions of sites worldwide, then outline the blameless postmortem, focused on the systemic fixes that prevent a recurrence.

**Model answer (revealed on demand):**

Assumptions: global blast radius, a config change is the prime suspect, every minute is enormous customer impact. Correctness of the response process matters more than cleverness.

**First 30 minutes as IC.** Declare SEV1 immediately and assign roles: I command and do not touch config; a Comms Lead starts posting to the public status page and internal war room on a strict 15-minute cadence; Ops engineers execute. **Mitigate before diagnosis:** the fastest path to recovery is to revert the last config push, so I direct an immediate rollback to the last-known-good config rather than debating what in it was wrong. In parallel I have someone confirm the change is the trigger (timeline correlation with the deploy), but the rollback does not wait for full understanding. If the config system itself is wedged, I escalate to the break-glass path to force the previous version. Throughout, the Scribe timestamps every action so the postmortem timeline is accurate. I resist the strong pull to root-cause live; restoring millions of sites is the only priority until the metric recovers.

**Blameless postmortem, systemic focus.** Timeline from push to detection to rollback to recovery, with quantified impact (duration, sites affected, error volume). Contributing causes will be plural and systemic, not "someone pushed bad config": Why could one config change reach 100% of the global fleet at once (no staged/progressive rollout)? Why did validation not catch it before deploy (no schema/canary check on config)? Why was detection reliant on customer reports instead of automated SLO alerting? Action items target each: progressive config rollout with automated analysis (config is a deploy and deserves canarying), pre-deploy validation, a fast tested rollback, and better detection. Each item gets an owner and a due date and is tracked to completion.

**Common wrong turn:** stopping at "human error, the engineer will be retrained." The real failure is a system that let a single unvalidated change hit every region simultaneously. Blaming the person leaves that system unchanged, so the outage recurs with a different name on the commit.
