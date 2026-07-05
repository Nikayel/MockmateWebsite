> Module **sd-l9-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l9-m3](./sd-l9-m3.md) · Next: [sd-l9-m5](./sd-l9-m5.md)

# L9 · Delivery & FinOps

After this module you can turn "we have 200 microservices and shipping is chaos" into a coherent delivery story: stand up an Internal Developer Platform with golden paths and GitOps so a team ships to prod in a day, promote infrastructure across environments with IaC plus progressive delivery that auto-rolls-back a payments deploy on an SLO regression, and treat cloud cost as a first-class design axis by cutting a large bill without hurting reliability using the FinOps Inform/Optimize/Operate loop.

### sd-l9-platform-gitops: Platform Engineering, IDPs & GitOps

- **id:** `sd-l9-platform-gitops`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** platform-engineering, gitops, idp

#### Learn

Raw Kubernetes is a construction kit, not a product. Give 40 product teams a bare cluster and each one reinvents CI, deployment YAML, secrets wiring, ingress, dashboards, and on-call, badly and differently. That cognitive load is the tax that kills velocity. **Platform engineering** treats the internal developer experience as a product: a small platform team builds paved roads so the median engineer never touches the messy layers.

An **Internal Developer Platform (IDP)** is the interface over that machinery. Over raw Kubernetes it adds three things a product team actually wants: **self-service golden paths** (scaffold a new service from a template, deploy it, and get logs/metrics/traces wired up with one command or one portal click), **abstraction** (the developer declares "I need a service with a Postgres and a queue," and the platform materializes the Terraform, Helm, and RBAC), and **guardrails** so the paved road is also the compliant road. The classic reference is Spotify's **Backstage**: a service catalog that answers who owns this, what depends on it, is it meeting its scorecard (has a runbook, passing security scan, defined SLO), plus software templates for scaffolding.

**GitOps** is the delivery control plane underneath. The principle: **Git is the single source of truth for desired state**, everything is declarative (Kubernetes manifests, Helm/Kustomize, Terraform), and an in-cluster **reconciler** (Argo CD or Flux) continuously compares desired state in Git to actual state in the cluster and converges them. You never `kubectl apply` from a laptop. To ship, you open a pull request that changes the manifest; merge triggers the agent to roll it out.

```
  developer --> PR to config repo --> merge
                                        |
                          Argo CD / Flux (in cluster)
                                        |  reconcile loop
                          diff(desired in Git, actual)
                                        |
                                   apply / self-heal --> cluster
```

Why Git as the source of truth: you get an audit log of every prod change (who, what, when, reviewed by whom) for free, rollback is `git revert`, drift is detected and auto-healed (someone hotfixes the cluster by hand, the reconciler reverts it back to Git), and disaster recovery is "point Argo at the repo and re-sync." Pull-based reconciliation is also more secure than push: no external CI system needs cluster-admin credentials.

**Guardrails as code** replace human gatekeeping. Instead of a review board that manually approves each deploy, you encode policy: **OPA/Gatekeeper or Kyverno** admission policies reject a manifest that has no resource limits, runs as root, or pulls an unsigned image. Templates bake in the right defaults. The paved road is faster than going around it, so people stay on it.

**Interview nuance:** supply-chain security belongs in the platform, not bolted on. Generate an **SBOM** at build, sign images with **cosign**, and attach **SLSA** provenance so the admission controller can verify "this image came from our pipeline, unmodified" before it runs.

**Interview nuance:** the failure mode to name is the **ticket-queue platform team**. If shipping still means filing a Jira ticket and waiting two days for the platform team to click deploy, you built a bottleneck, not a platform. Platform-as-product means self-service by default; the team's success metric is adoption and lead time, not tickets closed.

Recap: an IDP is a product that gives teams self-service golden paths (scaffold, deploy, observe) and abstraction over raw Kubernetes; GitOps makes Git the declarative source of truth with an Argo CD/Flux reconciler for audit, rollback, and self-healing; Backstage catalogs ownership and scorecards; guardrails as code (OPA/Kyverno) and supply-chain controls (SBOM, cosign, SLSA) replace gatekeeping; the anti-pattern is a ticket-queue platform team.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design an Internal Developer Platform so a product team can ship a new service to prod in a day: define golden paths, self-service, and guardrails.

**Think about:**
- What does an IDP provide over raw Kubernetes?
- What is GitOps and why is Git the source of truth?
- How do guardrails-as-code replace gatekeeping?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: ~50 product engineers across 8 teams, existing Kubernetes clusters in two regions, a mix of stateless HTTP services and workers. Goal: cut new-service lead time from ~2 weeks to under a day and standardize without a gatekeeping board.

**Golden path (day-one flow).** A developer runs the scaffolder (a Backstage software template) and answers a short form: service name, owning team, language, needs a Postgres yes/no, needs a queue yes/no. The template generates a repo with a working CI pipeline, a Dockerfile, health/readiness probes, a Helm/Kustomize deployment, a default SLO and dashboard, an on-call rotation stub, and a `catalog-info.yaml` registering ownership. That is the paved road: the fastest way to a running service is also the compliant one.

**Delivery via GitOps.** Application config lives in a Git repo; **Argo CD** in each cluster reconciles it. To ship, CI builds and signs the image (**cosign**), generates an **SBOM**, and opens a PR bumping the image tag in the config repo. Merge triggers Argo to roll out and self-heal. This gives us a full audit trail, one-command rollback via `git revert`, and drift correction for free. No engineer holds cluster credentials.

**Self-service and abstraction.** Backstage is the portal: catalog (who owns what, dependencies, scorecards), templates, and TechDocs. A developer declaring "service + Postgres" gets the database provisioned via a **Crossplane/Terraform** claim the platform reconciles, so they never write raw infra.

**Guardrails as code.** **OPA Gatekeeper / Kyverno** admission policies reject manifests without resource limits, running as root, or using unsigned images; SLSA provenance is verified at admission. Scorecards flag services missing a runbook or SLO. Policy is the gate, not a person.

**Tradeoffs.** The platform team is now a product team with a real roadmap and support burden; if it becomes a ticket queue, we have reintroduced the bottleneck we removed. Adoption is the success metric.

Common wrong turn: exposing raw Kubernetes plus a wiki and calling it a platform. Without scaffolding, self-service infra, and policy-as-code, every team still reinvents the messy layers differently.

**Self-check rubric:**
- [ ] Defines a concrete golden path (scaffold to running service) that a team follows in a day
- [ ] Uses GitOps (Argo CD/Flux) with Git as declarative source of truth, and explains audit/rollback/self-heal
- [ ] Includes a service catalog/portal (Backstage) with ownership and scorecards
- [ ] Replaces gatekeeping with policy-as-code (OPA/Kyverno) and self-service infra
- [ ] Names supply-chain controls (SBOM, cosign signing, SLSA provenance)
- [ ] Calls out the ticket-queue platform-team anti-pattern

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the IDP and GitOps rollout for a 900-engineer fintech running 300 services across 6 regions under SOC 2 and PCI audit, where every prod change must be provably reviewed, attributable, and reversible, and no human may hold standing cluster-admin.

**Model answer (revealed on demand):**

Assumptions: strict change-management and least-privilege requirements; auditors want to sample any prod change and see who authored it, who approved it, what scanned it, and how it was rolled back.

**Attributable, reviewed change.** GitOps is the compliance win here: every prod change is a PR to the config repo, so the reviewer, author, timestamp, and CI checks are the audit evidence. I enforce branch protection (2 reviewers, one from the owning team), signed commits, and required status checks (policy scan, image signature verification). Auditors get a queryable log without any bespoke tooling.

**No standing admin.** Argo CD is the only identity with write access to clusters, pull-based, so no human or external CI system holds cluster-admin. Break-glass access is via short-lived, approved, fully-logged just-in-time credentials (Teleport/PAM), not standing roles.

**Multi-region and blast radius.** One Argo instance (or ApplicationSet) per region reconciling region-scoped config. Promotion is staged: a merge to the `staging` overlay auto-syncs; production overlays require a separate approved PR, and progressive rollout (next lesson) gates it. An App-of-Apps pattern keeps 300 services manageable.

**PCI specifics.** Kyverno policies enforce network policies isolating the cardholder-data zone, block images without a verified SBOM and cosign signature, and require SLSA provenance. The scorecard blocks a service from the PCI scope if it lacks encryption-at-rest or a defined data classification.

Tradeoff: this much policy can slow teams if the paved-road templates lag, so the platform team must keep golden-path templates current or engineers route around them and compliance erodes. The platform's job is to make the compliant path the easy path at 900-engineer scale.

### sd-l9-iac-progressive-delivery: IaC, Environments & Progressive Delivery

- **id:** `sd-l9-iac-progressive-delivery`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** iac, progressive-delivery, terraform

#### Learn

Two failure modes ruin infrastructure delivery: **drift** (staging and prod diverge because someone made a manual console change, so a deploy that passed staging breaks prod) and **big-bang rollout** (you ship to 100% at once, and if it regresses you have already taken an outage before you notice). This lesson kills both.

**Infrastructure as Code** fixes drift. Declare the desired infrastructure in **Terraform/OpenTofu or Pulumi**, keep it in Git, and apply through a pipeline, never by hand. Key discipline: **remote state with locking** (an S3 backend plus DynamoDB lock, or Terraform Cloud) so two engineers cannot corrupt state with concurrent applies, and **modules** so dev/staging/prod are the same module with different variable files. That gives **environment parity**: prod is staging with more replicas, not a different snowflake. Treat infra as **immutable**: to change a node you replace it, you do not SSH in and tweak it. Manual console changes are the cardinal sin because they are invisible to Git and cause the exact drift that makes staging a liar. You can catch drift by running `terraform plan` on a schedule and alerting on any non-empty diff.

**Environment promotion:** the same versioned artifact and same IaC modules flow dev to staging to prod. Config differs only by variables (replica counts, instance sizes, endpoints), ideally sourced from the same place, so promotion is "apply the tested module to the next environment," not "rebuild it."

**Progressive delivery** fixes big-bang rollout. Know the three strategies and when each fits:

```
  rolling     : replace pods N at a time; cheap, no extra capacity, slow to detect a bad version
  blue-green   : full parallel env, flip the router; instant rollback, but 2x capacity briefly
  canary       : send 1% -> 5% -> 25% -> 100%, watch metrics, auto-halt on regression
```

For a **critical payments service** you want **canary with automated analysis and auto-rollback**. Tools: **Argo Rollouts** or **Flagger** shift traffic in steps, and between steps they **bake** (hold and observe) while querying Prometheus for your SLIs: error rate, p99 latency, and a business metric like payment-authorization-success-rate. If any metric breaches its threshold during the bake, the rollout **auto-aborts and shifts traffic back** to the stable version. No human in the loop at 3am. Blue-green is the alternative when you cannot tolerate two versions serving simultaneously (it flips atomically) but it costs double capacity during the window.

**Feature flags decouple deploy from release.** Deploying code and releasing a feature become separate events: ship the code dark behind a flag (LaunchDarkly, Unleff/Unleash, or a homegrown flag service), then turn it on for 1% of users independent of the deploy. This means you can roll back a *feature* instantly without redeploying, and you can deploy risky code safely because it is inert until flagged on.

**Interview nuance:** database migrations are the trap in any progressive rollout. Canary assumes old and new code run simultaneously, so a **destructive migration in one deploy** (drop a column the old version still reads) breaks the stable version mid-canary. Use **expand/contract** (a.k.a. parallel-change): first expand (add the new column, write to both, backfill), deploy code reading the new shape, then in a later deploy contract (drop the old column) once nothing reads it. Migrations must be backward-compatible across at least one version.

Recap: IaC (Terraform/OpenTofu) with remote-state locking and shared modules gives environment parity and kills drift; never make manual console changes; promote the same artifact dev to staging to prod; use canary with automated metric analysis and auto-rollback (Argo Rollouts/Flagger) for a payments service, blue-green when versions cannot coexist; feature flags decouple deploy from release; and use expand/contract so a migration never breaks the version still running during a canary.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the IaC and environment-promotion strategy for dev/staging/prod across two regions preventing config drift, plus a zero-downtime rollout for a critical payments service that auto-rolls-back on regression.

**Think about:**
- How do you prevent config drift and snowflake environments?
- Which rollout strategy and metrics gate a payments deploy?
- How do feature flags decouple deploy from release?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a payments service on Kubernetes in two regions (us-east, eu-west), targeting zero-downtime deploys and an SLO of 99.95% authorization success and p99 under 300ms.

**IaC and parity.** Everything is **Terraform** (or OpenTofu) with an S3 + DynamoDB **remote state with locking** per region. Dev/staging/prod are the *same modules* with different `.tfvars` (replica count, instance class, region endpoints), so prod is staging scaled up, not a snowflake. All applies go through the pipeline; no console changes. A nightly `terraform plan` runs against each environment and alerts on any non-empty diff to catch out-of-band drift. Two regions are the same module instantiated twice, keeping them identical by construction.

**Promotion.** The same signed image and same modules flow dev to staging to prod. Merging to an environment overlay triggers its apply (GitOps). Staging is a faithful smaller mirror where the canary process is rehearsed.

**Rollout.** Canary via **Argo Rollouts**: shift 1% -> 5% -> 25% -> 50% -> 100%, with a bake at each step. During each bake, an **AnalysisTemplate** queries Prometheus for error rate, p99 latency, and authorization-success-rate against the stable baseline. Any breach **auto-aborts** and shifts traffic back to stable, no human needed. I roll out region by region (us-east first, then eu-west) to bound blast radius. Blue-green would be the fallback if the payments code could not tolerate two versions running at once, at the cost of 2x capacity during the flip.

**Deploy vs release.** New payment flows ship dark behind **feature flags**, enabled for 1% of users after the deploy is fully rolled out. If the feature misbehaves, I flip the flag off instantly without a redeploy.

**Migrations.** Schema changes use **expand/contract** so old and new code coexist safely during the canary: add-and-backfill first, drop later.

Common wrong turn: a destructive migration bundled into the canary deploy (drop a column the stable version still reads), which breaks the 95% of traffic still on the old version the moment you apply it. The other classic miss is hand-editing the prod console, which silently desyncs it from staging.

**Self-check rubric:**
- [ ] Uses declarative IaC with remote-state locking and shared modules for parity
- [ ] Explicitly forbids manual console changes and detects drift (scheduled plan)
- [ ] Chooses canary with automated metric analysis and auto-rollback for payments, and justifies vs blue-green
- [ ] Names concrete gating metrics (error rate, p99, business SLI) and a bake period
- [ ] Uses feature flags to decouple deploy from release
- [ ] Handles migrations with expand/contract so versions can coexist

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the rollout for Stripe-scale payment-authorization changes deployed globally across 12 regions at 500k requests/sec, where a bad deploy directly loses merchant revenue and a manual rollback would take too long to prevent measurable financial loss.

**Model answer (revealed on demand):**

Assumptions: authorization is the money path; even a 30-second elevated error rate is real merchant revenue lost, so detection and rollback must be automated and fast.

**Guardrails before speed.** Every change ships dark behind a feature flag and is **shadow-tested** first: mirror a copy of live authorization traffic to the new version and compare its decisions against the current one offline, with zero customer impact, until the diff is understood. Only then does it enter a live canary.

**Tight, automated canary.** Argo Rollouts (or an equivalent in-house system) at very fine granularity: 0.1% -> 1% -> 5%, with short bakes and **strict, low thresholds** on authorization-success-rate, decline-reason distribution, and p99. Because the cost of a bad minute is high, the analysis auto-aborts on a small regression; I would rather roll back a false positive than eat financial loss. Automated rollback is mandatory because a human paging in would already be too slow at this revenue rate.

**Regional blast-radius control.** Roll region by region, never globally at once, starting with a lower-volume region. Twelve regions means a bad change caught in region 1 never reaches the other 11. A global config that flips everywhere simultaneously is the nightmare scenario; regional staging bounds it.

**Correctness under concurrency.** Old and new authorizers run together during canary, so any data or protocol change uses expand/contract, and idempotency keys ensure a retried authorization during a rollback is not double-charged.

Tradeoff: this is slow and conservative by design. For a money path that is correct: the cost of caution is a few extra hours of rollout; the cost of speed is lost merchant revenue and trust. The common wrong turn is optimizing rollout speed on the authorization path as if it were a stateless web frontend.

### sd-l9-cloud-finops: Cloud Cost & FinOps

- **id:** `sd-l9-cloud-finops`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** finops, cost, kubernetes

#### Learn

Cost is a design axis, not an afterthought you hand to finance. **FinOps** is the practice of making engineering, finance, and product jointly own cloud spend, and it runs as a continuous loop of three pillars:

```
  Inform   -> tag/allocate: know who spends what, per team/service/feature
  Optimize -> rightsize, kill idle, buy commitments, use spot
  Operate  -> governance: budgets, alerts, anomaly detection, accountability
```

You cannot optimize what you cannot see, so **Inform** comes first. Enforce a **tagging/labeling policy** (team, service, environment, cost-center) so the bill maps to owners; untagged resources are the black hole where waste hides. Build a **showback/chargeback** view so each team sees its own spend.

**Optimize** on compute is where the biggest dollars usually are:
- **Rightsizing**: most instances are provisioned for a peak that rarely comes. Size to **P90/P95 utilization** over a representative window, not to a static "just in case" ceiling and not to the max (which one spike inflates). Automate it; manual rightsizing rots.
- **Spot/preemptible** instances (60-90% cheaper) for **fault-tolerant** work: batch jobs, CI, stateless workers, ML training with checkpointing. Not for a stateful primary that cannot tolerate a 2-minute eviction.
- **Commitments**: savings plans or reserved instances for your steady-state baseline (the load that is always on), on-demand/spot for the spiky top.
- **Autoscaling and scale-to-zero**: scale with load, and scale non-prod and bursty services to zero when idle. A dev cluster running 24/7 for a 9-to-5 team is ~70% waste.

**Kubernetes cost is opaque, and interviewers probe this.** The cloud bill shows you *nodes* (EC2 instances), but you run *many apps per node*, so the bill cannot tell you that the recommendations service costs $8k/mo while payments costs $2k/mo. You fix visibility with **OpenCost or Kubecost**, which allocate node cost down to namespace/pod/label using each workload's requests and actual usage. That only works if workloads are **consistently labeled** (team, service), which loops back to Inform. Then you find the real K8s waste: **over-requested resources** (a pod requesting 4 CPU and using 0.3 pins capacity nobody uses) and **low bin-packing** (nodes half-empty because requests are inflated). Rightsize requests to P90/P95 usage and let the cluster autoscaler consolidate.

**Data and egress are the sneaky levers.** **Data-transfer/egress** charges are easy to ignore and brutal at scale: inter-AZ traffic (keep chatty services zone-aligned), cross-region replication, and internet egress (a CDN both speeds delivery and cuts origin egress). **Storage tiering**: move cold objects from hot storage to infrequent-access/archive tiers (S3 Intelligent-Tiering/Glacier). **Warehouse query cost**: a single unpartitioned full-table scan in BigQuery/Snowflake can cost more than a server; partition, cluster, and cache. And the current top concern is **AI/GPU spend**: GPUs are expensive and often idle between jobs, so batch and bin-pack inference, use spot for training with checkpointing, and right-size the model to the task.

**Interview nuance:** never cut cost by cutting reliability blindly. Deleting a standby replica or a multi-AZ setup saves money until the outage costs 10x the savings. Frame every cut as "reduce waste (idle, over-provisioned, untiered) while preserving the reliability the SLO requires."

Recap: run FinOps as Inform (tag/allocate) -> Optimize (rightsize to P90/P95, spot for fault-tolerant work, commitments for baseline, scale-to-zero) -> Operate (budgets, anomaly detection); fix opaque Kubernetes cost with OpenCost/Kubecost plus consistent labels and rightsized requests; and do not ignore egress/inter-AZ transfer, storage tiering, warehouse scans, and GPU spend.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Cut a $200k/mo cloud bill by 30% without hurting reliability: produce a prioritized plan across compute, data, and Kubernetes allocation.

**Think about:**
- What are the three FinOps pillars?
- Why is Kubernetes cost visibility hard, and how do you fix it?
- What are the biggest data/egress cost levers?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: $200k/mo across compute (~55%), managed data stores and warehouse (~25%), and data transfer/egress (~20%), on AWS with EKS. Target: save $60k/mo (30%) while holding every production SLO.

**Inform first (week 1).** I cannot cut what I cannot see, so I enforce a tagging policy (team, service, env, cost-center) and stand up **Kubecost/OpenCost** to allocate EKS node cost down to namespace and service. This turns "the bill is $200k" into "recommendations is $22k, and 60% of it is idle requested capacity." Non-prod is tagged so I can find always-on dev waste.

**Optimize, prioritized by dollars-per-effort:**
1. **Kill idle and scale-to-zero non-prod** (fast, safe): dev/staging clusters running 24/7 for a daytime team scale to zero off-hours. Often 10-15% of the bill, near-zero risk.
2. **Rightsize to P90/P95** (compute + K8s requests): most instances and pod requests are set for a peak that never comes. Rightsizing over-requested pods improves bin-packing so the cluster autoscaler drops nodes. Automate with the metrics, do not eyeball once.
3. **Commitments on the steady-state baseline**: savings plans/reserved instances cover the always-on floor (30-50% off), on-demand and spot cover the spiky top.
4. **Spot for fault-tolerant work**: CI, batch, stateless workers, and ML training with checkpointing move to spot (60-90% off). Stateful primaries stay on-demand.
5. **Data/egress**: align chatty services to the same AZ to cut inter-AZ transfer, put a CDN in front to cut origin egress, tier cold S3 to Intelligent-Tiering/Glacier, and partition the worst warehouse full-scan queries.

**Operate (make it stick).** Set per-team budgets with anomaly alerts so a new leak is caught in days, not on next month's invoice, and put the Kubecost showback in front of each team so cost has an owner.

**Reliability guardrail.** Every cut is waste reduction (idle, over-provisioned, untiered, unpartitioned), not reliability reduction. I do not delete multi-AZ, standby replicas, or backups to hit the number; a single outage would erase the savings.

Common wrong turn: chasing rightsizing while ignoring the 20% egress line and per-app K8s allocation, then cutting a redundancy to force the number and causing an outage.

**Self-check rubric:**
- [ ] Starts with Inform (tagging + allocation) before optimizing
- [ ] Fixes Kubernetes opacity with OpenCost/Kubecost + consistent labels and rightsized requests
- [ ] Uses P90/P95 rightsizing, spot for fault-tolerant work, commitments for baseline, scale-to-zero
- [ ] Addresses data/egress: inter-AZ, CDN, storage tiering, warehouse query cost
- [ ] Adds Operate governance (budgets, anomaly detection, showback)
- [ ] Explicitly preserves reliability/SLOs and prioritizes by dollars-per-effort

#### Practice: real-world variant (save, then reveal)

**Prompt:** Cut cost for an AI startup whose bill is dominated by a $500k/mo GPU fleet serving LLM inference plus nightly fine-tuning, where GPU utilization is measured at 35% and latency SLOs must hold, without degrading model quality.

**Model answer (revealed on demand):**

Assumptions: most spend is GPU (A100/H100), ~35% average utilization means roughly two thirds of the fleet is paid-for and idle. The constraints are inference latency SLO and model quality, so I optimize utilization and purchasing, not quality.

**Inform.** Tag GPUs by workload (real-time inference vs batch fine-tuning) and measure utilization per model, so I can see which endpoints are over-provisioned and which sit idle between requests.

**Raise utilization (biggest lever).** The waste is idle GPU time. I **bin-pack** inference with continuous/dynamic batching (vLLM-style) so more requests share a GPU, and I consolidate low-traffic models onto shared GPUs (multi-model serving, MIG partitioning on A100/H100) instead of one dedicated GPU per model. Autoscale inference replicas to real traffic and scale idle endpoints down. Just moving 35% to 70% utilization roughly halves the fleet needed for the same load.

**Split purchasing by workload.** Real-time inference (latency-sensitive, always-on baseline) goes on **reserved/committed** GPU capacity for the steady load, on-demand for the spiky top. Nightly **fine-tuning is fault-tolerant**, so it runs on **spot** GPUs with frequent checkpointing; an eviction just resumes from the last checkpoint. This alone can cut the fine-tuning line 60-80%.

**Right-size the model to the task.** Where quality allows, quantize (int8/fp8) and use smaller distilled models for easy requests, routing only hard requests to the big model. This is a quality-neutral cut when done with eval gates.

Tradeoff: aggressive batching adds queueing latency, so I tune batch size against the p99 SLO rather than maxing utilization blindly. The wrong turn is running one dedicated, always-on, on-demand GPU per model at 35% utilization, which is the default that produces a $500k bill. Utilization and spot-for-training are where the money is, and neither touches model quality.
