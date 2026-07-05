> Module **sd-l8-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l8-m1](./sd-l8-m1.md) · Next: [sd-l8-m3](./sd-l8-m3.md)

# L8 · Authorization & Tenancy

After this module you can choose the right authorization model (RBAC, ABAC, or ReBAC) for a product, enforce it correctly at every trust boundary without falling into IDOR, and design tenant isolation for a B2B SaaS that keeps small self-serve customers cheap while giving regulated enterprises the hard guarantees they demand.

### sd-l8-authz-rbac-rebac: Authorization Models: RBAC, ABAC & ReBAC

- **id:** `sd-l8-authz-rbac-rebac`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** authz, rebac, zanzibar

#### Learn

Authentication answers "who are you"; authorization answers "are you allowed to do this to *this specific object*." Getting authorization wrong is the number one item on the OWASP API Security Top 10 (Broken Object Level Authorization, aka BOLA/IDOR), so interviewers probe it hard. The first decision is which model expresses your permissions.

**RBAC (Role-Based Access Control)** assigns users to roles (admin, editor, viewer) and roles to permissions. It is simple, auditable, and correct for coarse, org-wide access. Its failure mode is **role explosion**: the moment permissions depend on *which* object, you start minting roles like `editor-of-folder-4821`, and a company with a million folders needs a million roles. RBAC has no notion of "editor of *that* document."

**ABAC (Attribute-Based Access Control)** decides from attributes of the subject, resource, action, and environment ("allow if `user.department == doc.department` and `time < 18:00`"). It is expressive and great for compliance rules, but policies get hard to reason about and hard to answer the reverse question "who can see this doc?" because there is no stored relationship, just a function evaluated at request time.

**ReBAC (Relationship-Based Access Control)** models permissions as a graph of relationships between objects and users. This is what Google's **Zanzibar** paper formalized and what powers Drive, Docs, Calendar, and YouTube. Permissions are stored as **relation tuples**: `object#relation@user`, for example `doc:readme#viewer@user:alice` or `doc:readme#parent@folder:eng`. Relations compose: a folder's `viewer` can be *inherited* by every child doc via a userset rewrite ("a doc's viewer = its own viewers UNION its parent folder's viewers"). Groups are just more tuples: `group:eng#member@user:alice`, and `doc:readme#viewer@group:eng#member` grants the whole group. This naturally expresses sharing, nested folders, and org roles without role explosion. Open-source implementations are **OpenFGA**, **SpiceDB** (both Zanzibar-modeled), and AWS **Cedar** (a policy language closer to ABAC/ReBAC hybrid).

A Zanzibar-style system answers two query shapes: **Check** ("can alice view doc:readme?") walks the relationship graph, and **Expand / reverse-index** ("list every doc alice can view" or "list every user who can view this doc") which powers search filtering and share dialogs. It must return decisions in single-digit milliseconds because every request blocks on it.

Whatever model you pick, separate the **Policy Decision Point (PDP)** from the **Policy Enforcement Point (PEP)**. The PEP lives in each service or gateway and asks the PDP "allowed?"; the PDP (OPA, Cedar, OpenFGA) owns the policy logic. Externalizing authz means one place to audit and change rules instead of `if user.isAdmin` scattered across 50 services.

```
  request -> PEP (in service/gateway) --check(user, action, object)--> PDP (OpenFGA/OPA/Cedar)
                                                                         |
                                       relation tuples / policy + graph -+
```

Non-negotiable enforcement principles: **deny by default**, **least privilege**, **fail closed** (if the PDP is unreachable, reject, do not wave the request through). And enforce at **every trust boundary and every object**, not once at the front door.

**Interview nuance:** the classic wrong turn is treating authz as a single gate. A route checks `user.isLoggedIn`, then the handler does `SELECT * FROM docs WHERE id = :id` with the id straight from the URL, never checking that *this* user may see *that* doc. That is IDOR/BOLA. The fix is a per-object check on every access: `check(user, "view", doc)` before returning it. Zanzibar also has a subtle consistency problem, the **"new enemy"** problem: if you remove someone's access and then change the object, a stale cache could let the just-removed user read the new content. Zanzibar solves it with **zookies**, opaque consistency tokens that pin a check to a snapshot at or after the ACL change.

Recap: use RBAC for coarse org roles, ReBAC/Zanzibar (relation tuples, graph checks, reverse indexes via OpenFGA/SpiceDB) when permissions are per-object with sharing and nesting; split PDP from PEP, deny by default and fail closed, and enforce a per-object check on every request to kill IDOR.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the permission system for a Google-Drive-style app with per-file sharing, groups, nested folders, and org roles.

**Think about:**
- When does RBAC hit role explosion, and when does ReBAC fit?
- How does the Zanzibar model represent permissions?
- How do you avoid IDOR / broken object-level authorization?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: tens of millions of users, hundreds of millions of files and folders, files shared with individuals and groups, folders nest arbitrarily deep with inherited permissions, org admins have blanket roles, and every read/write must be authorized in under ~10ms at the p99 because it is on the request path.

**Model choice.** RBAC alone fails here: "viewer of folder X" is per-object, so RBAC would need a role per folder (role explosion). This is a textbook **ReBAC / Zanzibar** problem. I model permissions as relation tuples of the form `object#relation@user`.

**Schema.** Objects: `doc`, `folder`, `org`, `group`. Relations and userset rewrites:
- `folder#viewer`, `folder#editor`, `folder#parent@folder:...` for nesting.
- `doc#parent@folder:...`; `doc#viewer = doc's own viewers UNION doc#parent->viewer` (inheritance).
- `group:eng#member@user:alice`; sharing with a group is `doc:x#viewer@group:eng#member`.
- Org roles: `org:acme#admin@user:bob`, and `folder#viewer` can include `folder#org->admin` so admins see everything.

**Serving.** I run OpenFGA or SpiceDB (or build the Zanzibar design directly). Two query paths: **Check(user, action, object)** walks up the parent chain and expands group membership, backed by an aggressively cached relation store (the tuples live in something like Spanner/Cassandra with a read-through cache). **Reverse index / ListObjects** answers "which docs can alice open" to filter search and populate the file list. To hit sub-10ms I cache subproblem results and denormalize hot paths, and I bound folder nesting depth.

**Enforcement.** A Policy Enforcement Point in the API gateway and again in the file service; the PDP is the authz service. Every object access does a per-object `Check`, never a blanket "is logged in" gate, which kills IDOR/BOLA (OWASP API #1). Deny by default, least privilege, fail closed if the authz service is down.

**Consistency.** Store a **zookie** with each object and pass it to Check so a permission revocation is not undone by a stale cache (the new-enemy problem).

**Common wrong turn:** fetching the doc by URL id after only an authentication check, exposing every other user's files by incrementing an id. The reverse-index query is also easy to forget and it is what makes shared-with-me and search actually correct.

**Self-check rubric:**
- [ ] Rejected RBAC-only on role-explosion grounds and justified ReBAC/Zanzibar.
- [ ] Represented sharing, groups, nested folders, and org roles as relation tuples with inheritance.
- [ ] Named both the Check and the reverse-index/ListObjects query paths.
- [ ] Separated PDP from PEP; deny by default and fail closed.
- [ ] Called out a per-object check to prevent IDOR/BOLA and addressed consistency (zookies/new enemy).
- [ ] Gave a concrete tech (OpenFGA/SpiceDB/Cedar) and a latency target.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the authorization layer for a GitHub-scale code host: 100M+ repositories, personal accounts and organizations, teams with nested subteams, per-repo roles (read/triage/write/maintain/admin), outside collaborators, and branch-protection rules, all authorized on every git and API operation with a sub-10ms p99 budget.

**Model answer (revealed on demand):**

Assumptions: 100M+ repos, orgs owning teams that nest, five per-repo permission levels, individual outside collaborators, and both API and git-transport paths that must authorize on every push/fetch/read.

This is ReBAC at scale, exactly GitHub's actual architecture. I model relation tuples:
- `org:acme#member@user:alice`, teams as `team:acme/backend#member@user:alice` and nesting as `team:acme/backend#member@team:acme/platform#member` (subteam members inherit).
- Repo roles as relations that compose: `repo:acme/api#admin` implies `maintain` implies `write` implies `triage` implies `read`, so a Check for `read` succeeds if any higher relation holds (userset rewrite, not five separate tuples).
- Grants come from three sources unioned: direct collaborator (`repo:acme/api#write@user:bob`), team grant (`repo:acme/api#write@team:acme/backend#member`), and org base permission.

**Serving.** A Zanzibar-style service (SpiceDB/OpenFGA-shaped) with the tuple store on a horizontally sharded, globally replicated DB plus a hot cache. Check walks: does the user hold the requested-or-higher relation directly, via any team (following subteam nesting), or via org role? Branch-protection is a second policy layer evaluated on write: even a `write` user is denied a direct push to `main` if protection requires a PR, so I model it as an ABAC-style rule on top of the ReBAC decision.

**Enforcement.** The git front door (the SSH/HTTPS receive-pack path) and the API both call the PDP per operation; no operation trusts a prior gate. Deny by default, fail closed. Cache decisions with a consistency token so removing someone from a team revokes access without a stale-cache window.

**Common wrong turn:** flattening the five roles into unrelated booleans, which loses the implication chain and forces the client to know that admin also means write. Modeling them as a hierarchy keeps Check simple and correct, and modeling branch protection as pure ReBAC (rather than a policy overlay) fails because it constrains *actions on a path*, not a relationship to the repo.

### sd-l8-multi-tenancy: Multi-Tenancy Isolation Models

- **id:** `sd-l8-multi-tenancy`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** multi-tenancy, isolation, rls

#### Learn

Multi-tenancy is running many customers (tenants) on one platform. The whole game is making it economically cheap to share infrastructure while guaranteeing tenant A can *never* see tenant B's data. The core spectrum is **silo vs pool vs bridge**.

**Silo** gives each tenant dedicated infrastructure: their own database, sometimes their own cluster or even their own cloud account. Strongest isolation, easiest compliance story ("your data is in your own database"), simplest blast radius, but expensive and operationally heavy (you now patch and migrate N databases). **Pool** shares everything: one database, one schema, rows from all tenants in the same tables distinguished by a `tenant_id` column. Cheapest and most scalable, but isolation now depends entirely on your code and query discipline, one missing `WHERE tenant_id = ?` leaks everyone. **Bridge** is the middle: shared database, separate schema (or separate table set) per tenant, or a shared cluster with per-tenant databases. More isolation than pool, cheaper than silo, but schema-per-tenant stops scaling past a few thousand tenants (migrations across 5,000 schemas hurt).

```
  SILO   dedicated DB/cluster per tenant   strongest isolation, highest cost
  BRIDGE shared DB, schema-per-tenant       middle ground
  POOL   shared schema, tenant_id column    cheapest, isolation is code-enforced
```

The senior move is **tiered isolation**: pool your thousands of small self-serve SMB customers for cost efficiency, and silo your regulated enterprise customers (health, finance, government, data-residency requirements) into dedicated databases or accounts. One product, two isolation postures, sold as a premium tier.

Wherever tenants share, isolation must be **enforced at the data layer, not just the app layer**, because app-layer checks are one forgotten `WHERE` clause from a breach. **Postgres Row-Level Security (RLS)** is the workhorse: you set `current_setting('app.tenant_id')` at the start of each request's transaction, and a policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)` makes the database itself refuse to return other tenants' rows even if application SQL forgets the filter. Combine with per-tenant encryption keys (crypto-isolation) and connection/schema routing where the tenant maps to a database.

**Interview nuance:** the deciding detail is *where and when tenant context is resolved*. It must be established on **every request, before any business logic runs**, from a trusted source: the JWT/session claim or a subdomain (`acme.app.com`), never from a request body field the client can set. Then `tenant_id` propagates through the entire call chain (into the DB session var, into cache keys, into async job payloads, into log fields). If tenant context is derived late or from untrusted input, everything downstream is exploitable.

The part that separates a strong answer is the **non-obvious leakage vectors**, which is where real multi-tenant breaches happen even when the primary DB path is perfect:
- **Caches:** a cache key of `user:profile:42` with no tenant prefix serves tenant B's cached object to tenant A. Every cache key must include `tenant_id`.
- **Search indexes:** Elasticsearch/OpenSearch queries need a tenant filter (or per-tenant index); a global search that forgets it returns everyone's documents.
- **Background jobs / async workers:** a job dequeued without its tenant context runs with ambient or wrong tenant, and RLS silently returns nothing or the wrong rows. Carry `tenant_id` in the job payload and re-establish context on pickup.
- **Shared/sequential IDs:** guessable global ids invite IDOR across tenants.
- **Log and metrics aggregation:** dumping raw payloads into a shared logging pipeline can expose tenant B's PII to tenant A's support view.

Finally, shared infra creates the **noisy neighbor** problem: one tenant's traffic spike starves everyone. Enforce **per-tenant quotas and rate limits** so tenants get fair-share isolation of *capacity*, not just data.

Recap: choose silo/pool/bridge per the cost-versus-isolation tradeoff (tier it: pool SMB, silo regulated); resolve tenant context from a trusted source on every request and propagate `tenant_id` everywhere; enforce at the data layer with Postgres RLS or per-tenant keys/routing; add per-tenant quotas for noisy neighbors; and hunt the non-obvious leaks in caches, search indexes, async jobs, ids, and logs.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design tenant isolation for a B2B SaaS spanning small self-serve customers and large regulated enterprise customers on one platform.

**Think about:**
- What is the silo vs pool vs bridge tradeoff?
- Where must tenant context be resolved and enforced?
- What are the non-obvious cross-tenant leakage vectors?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: thousands of small self-serve teams (a few users each, cost-sensitive) plus a few hundred large enterprises, some in regulated industries (HIPAA, SOC 2, data residency). Postgres primary store, Redis cache, an OpenSearch index, and async workers for exports and notifications.

**Isolation strategy: tiered.** I pool the SMB tenants into a shared Postgres cluster with a `tenant_id` column on every row, because siloing thousands of tiny tenants is economically absurd. I silo the regulated enterprises into dedicated databases (and, for data-residency customers, region-specific databases), giving them the "your data lives alone" compliance story and a small blast radius. This is one codebase with a tenant-to-datasource routing layer. The bridge (schema-per-tenant) I avoid as the default because it does not scale past a few thousand schemas at migration time.

**Tenant context.** Resolved on **every request before business logic**, from the JWT claim or the subdomain, never from a client-supplied body field. It sets the Postgres session var `app.tenant_id` and is propagated into cache keys, search filters, job payloads, and log fields.

**Data-layer enforcement.** For the pooled tenants I turn on **Postgres Row-Level Security**: a policy `USING (tenant_id = current_setting('app.tenant_id')::uuid)` on every table, so the database refuses cross-tenant rows even if a query forgets the filter. Siloed tenants get physical isolation plus per-tenant encryption keys, so a stolen snapshot of one is useless and crypto-shredding one tenant is a key delete.

**Non-obvious leaks I close:** every Redis key is prefixed with `tenant_id`; OpenSearch queries carry a mandatory tenant filter (large tenants get their own index); every async job carries `tenant_id` and re-establishes the session var on pickup so RLS applies; ids are UUIDs not sequential; logs are scrubbed and tenant-scoped before hitting the shared pipeline.

**Noisy neighbor.** Per-tenant rate limits and quotas (API QPS, background-job concurrency, storage) so one tenant's batch import cannot starve the pool.

**Common wrong turn:** getting the primary DB path perfect and forgetting the shared cache and search index, which is exactly where multi-tenant breaches actually happen, or resolving tenant from a request field the client can forge.

**Self-check rubric:**
- [ ] Explained silo vs pool vs bridge and picked a *tiered* strategy (pool SMB, silo regulated) with justification.
- [ ] Resolved tenant context on every request from a trusted source, not client input.
- [ ] Enforced at the data layer (Postgres RLS and/or per-tenant keys/routing), not just app code.
- [ ] Propagated `tenant_id` through cache keys, search, async jobs, and logs.
- [ ] Named at least three non-obvious leakage vectors (cache, search index, background jobs, ids, logs).
- [ ] Addressed noisy-neighbor fairness with per-tenant quotas/rate limits.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the multi-tenant data isolation for a Slack-scale workspace platform: millions of workspaces from 3-person startups to 250,000-seat enterprises, with enterprise customers demanding data residency (EU/US), their own encryption keys (BYOK), and a hard audit guarantee that no other workspace's data is ever co-mingled in a way they can access.

**Model answer (revealed on demand):**

Assumptions: millions of workspaces on a huge size skew, messages/files/search all per-workspace, some enterprises require EU-only residency, BYOK (customer-managed keys), and contractual isolation guarantees.

**Sharding as isolation.** At Slack scale, pooling still uses `workspace_id` (the tenant) on every row, but I shard the datastore *by workspace*, so a workspace's data lives on a specific shard (Vitess/MySQL or sharded Postgres). Small workspaces share a shard (pool); the largest 250k-seat enterprises get dedicated shards or dedicated clusters (silo), sized to their traffic and giving them an isolated blast radius. Tenant context (`workspace_id`) is resolved from the authenticated session on every request and routes to the right shard.

**Data residency.** Residency is a routing dimension: EU workspaces are provisioned onto EU-region shards, caches, and search clusters, and the tenant-to-datasource map is region-pinned so no request or async job crosses the boundary. This is why tenant context must be established before any I/O.

**BYOK / crypto isolation.** Each enterprise workspace has its own DEK wrapped by a customer-controlled KEK in their KMS (envelope encryption). Data is encrypted per-workspace, so co-mingled storage is still cryptographically isolated, and a customer revoking their key crypto-shreds only their data. This turns the "never co-mingled in an accessible way" guarantee into a cryptographic fact, not just a `WHERE` clause.

**Enforcement and leaks.** RLS or shard-routing on the DB path; per-workspace prefixes on every cache key; per-workspace search indexes (or a mandatory workspace filter) so a search never spans workspaces; async jobs carry `workspace_id` and region; per-workspace rate limits for noisy neighbors.

**Common wrong turn:** treating residency and BYOK as add-ons bolted onto a single global pool. If tenant/region context is not the first thing resolved and the routing/key layer is not workspace-aware end to end, an EU export job or a shared global search index quietly violates both the residency contract and the isolation guarantee.
