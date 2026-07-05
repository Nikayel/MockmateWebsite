> Module **sd-l8-m5** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l8-m4](./sd-l8-m4.md) · Next: [sd-l9-m1](./sd-l9-m1.md)

# L8 · Privacy, Compliance & Audit

By the end of this module you can translate regulations (GDPR, SOC 2, HIPAA, PCI-DSS) into concrete architecture instead of legalese, build a data platform that can actually find and erase every copy of one user's PII, design tamper-evident audit trails and a secure build pipeline with no long-lived secrets, and run a breach response for a compromised key without either losing forensic evidence or logging every user out.

### sd-l8-compliance-frameworks: Compliance Frameworks & Regulatory Design

- **id:** `sd-l8-compliance-frameworks`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** compliance, gdpr, pci

#### Learn

Compliance frameworks feel like legal noise until you realize each one is really a list of architectural constraints. The senior move is to map every framework to the concrete controls it forces, then notice how much they overlap so you build one control set that satisfies several regimes.

The four you will be asked about:

```
Framework   Protects              Core demand on architecture
GDPR/CCPA   EU/CA personal data   Data-subject rights (access, erasure), lawful basis, residency
SOC 2       customer trust        Trust Services Criteria, controls that operate over time, evidence
HIPAA       US health PHI         Safeguards for PHI, BAAs with every processor, audit controls
PCI-DSS     cardholder data       Isolate/encrypt PAN, network segmentation, scope reduction
```

The good news is a shared baseline. Encryption in transit (TLS 1.2+) and at rest (AES-256 with KMS-managed keys), least-privilege access control (RBAC/ABAC with MFA), centralized logging and monitoring, tested backups and DR, vendor/processor management, and change management show up in all four. Build those once and you have cleared most of the surface area. Then you layer the framework-specific non-negotiables: GDPR needs a lawful basis and honored data-subject rights; HIPAA needs a signed BAA (Business Associate Agreement) with every subprocessor that touches PHI; PCI needs network segmentation isolating the cardholder data environment; SOC 2 needs the controls to demonstrably operate over a period, not just exist on audit day.

The single most architecturally load-bearing requirement is **data residency**. GDPR restricts moving EU personal data outside approved regions. This is not a config checkbox, it is a sharding decision. It forces you to region-pin storage and processing so EU user data lives in eu-central-1 and never silently replicates to us-east-1. Cross-border transfer needs a legal mechanism (Standard Contractual Clauses, or an adequacy decision like the EU-US Data Privacy Framework), and that legal mechanism only works if your architecture can actually keep the data regional. Teams that treat residency as a checkbox discover it late, when a global DynamoDB table or a CDN log has already scattered EU data across continents.

**Interview nuance:** the sharpest scope-reduction lever is **tokenization**. If you never store the raw card number (PAN), and instead hand it to a PCI-certified provider (Stripe, Adyen) that returns a token, then most of your systems fall out of PCI scope entirely. Your database holds `tok_1a2b`, not a card. The same idea reduces GDPR and HIPAA blast radius: the less sensitive data you hold, the fewer systems the auditor examines. Data minimization is a security control, not just a privacy nicety.

Rounding it out: DPAs (Data Processing Agreements) govern each processor, DPIAs (Data Protection Impact Assessments) are required before high-risk processing, and SOC 2 evidence means access reviews, change tickets, and log retention you can produce on demand.

Recap: build the shared baseline (encryption, access control, logging, backups) once, layer framework-specific non-negotiables on top, treat data residency as a regional-sharding driver rather than a checkbox, and use tokenization to pull whole systems out of PCI/PHI scope.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a system handling EU health and payment data to satisfy overlapping GDPR, SOC 2, PCI-DSS, and HIPAA controls, and show which controls you build once versus per-framework.

**Think about:**
- What baseline controls do the frameworks share?
- How does data residency drive architecture?
- How does tokenization reduce PCI scope?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a telehealth product taking EU patients, storing health records (HIPAA-style PHI plus GDPR special-category data) and taking card payments (PCI-DSS), sold to enterprises who demand a SOC 2 Type II report.

Strategy: build one control baseline, then bolt on framework-specific pieces, and aggressively reduce scope so fewer systems face audit.

Shared baseline (built once): TLS 1.2+ everywhere, AES-256 at rest with keys in a managed KMS (envelope encryption, per-tenant data keys), RBAC plus ABAC with mandatory MFA and least privilege, centralized immutable logging, tested encrypted backups with a documented RTO/RPO, and change management through pull requests and ticketed approvals. This single stack satisfies most of GDPR Art. 32, HIPAA safeguards, PCI encryption/access requirements, and SOC 2 security criteria at once.

Data residency (the architectural driver): shard by region. EU patient PHI is stored and processed only in eu-central-1, with region-pinned databases, region-local backups, and CDN/log sinks that never leave the EU. Any transfer to a US analytics team rides on SCCs plus the Data Privacy Framework, and the pipeline is built so residency holds by construction, not by policy memo.

Scope reduction via tokenization: I never store the PAN. The browser sends the card straight to Stripe (a PCI Level 1 provider), which returns a token my systems persist. This drops nearly all of my services out of PCI scope, leaving only the thin payment-initiation path to assess. Similarly I minimize PHI: store what treatment requires, nothing more.

Framework-specific additions: sign a BAA with every subprocessor touching PHI (hosting, email, monitoring), stand up DSAR and erasure workflows for GDPR rights, run a DPIA before launch, and instrument the controls to produce SOC 2 evidence (access reviews quarterly, change logs, uptime and incident records) over a 6 to 12 month observation window.

Common wrong turn: treating residency as a checkbox. Using a globally-replicated table or a US-terminating CDN silently exports EU data and breaks GDPR no matter what the privacy policy says.

**Self-check rubric:**
- [ ] Did I name a shared baseline (encryption, access control, logging, backups) built once across frameworks?
- [ ] Did I make data residency a sharding/region-pinning decision, not a policy line?
- [ ] Did I use tokenization to pull systems out of PCI scope and minimize PHI?
- [ ] Did I add framework-specific pieces (BAAs, DSAR/erasure, DPIA, SOC 2 evidence over time)?
- [ ] Did I name a legal transfer mechanism (SCCs / adequacy) for any cross-border flow?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the compliance architecture for a US fintech (a Chime-style neobank) expanding into Germany, handling both cardholder data and bank-account data for 5 million EU users, and explain how you re-architect a single global platform into a residency-compliant one.

**Model answer (revealed on demand):**

Assumptions: the existing platform is a single US-region monolith on AWS us-east-1 with a global Aurora database and a shared analytics lake. EU launch triggers GDPR, PSD2/SCA for payments, and continued PCI-DSS. 5M EU users at, say, tens of events per user per day is a meaningful but not extreme data volume; the hard problem is residency, not throughput.

Re-architecture: split the platform into region cells. Stand up an eu-central-1 cell with its own Aurora cluster, its own KMS keys, and its own object storage, and route EU users to it via geo-aware DNS and an identity home-region attribute. EU personal and account data is written only in the EU cell. The US cell stays authoritative for US users. This is the "regional sharding" from residency made real: no global table spanning both.

Payments: keep tokenizing cards through a PCI provider so PAN never lands in either cell, and add PSD2 Strong Customer Authentication (SCA) at the EU payment flow via 3-D Secure.

Analytics without leaking residency: rather than shipping raw EU rows to the US lake, pseudonymize and aggregate inside the EU, then export only de-identified aggregates under SCCs. Cross-region control-plane traffic (deploys, config) is fine; cross-region personal data is not.

Controls and evidence: replicate the shared baseline (encryption, RBAC/MFA, logging) into the EU cell, appoint an EU representative and run a DPIA, and stand up local DSAR/erasure so an EU regulator sees a compliant, self-contained processor.

Common wrong turn: bolting a read replica of the global DB into Frankfurt and calling it "EU residency." The write path and backups still live in the US, so EU data is still exported. Residency means the authoritative copy and its backups stay in-region.

### sd-l8-pii-dsar-privacy: PII Governance, DSAR/Erasure & Privacy Engineering

- **id:** `sd-l8-pii-dsar-privacy`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** pii, dsar, privacy-engineering

#### Learn

GDPR gives users the right to see their data and the right to be forgotten. Honoring the second one, erasure within 30 days across every store, is one of the hardest data-engineering problems most companies quietly fail at, because a user's PII is never in one place.

**Step one is knowing where it lives.** You cannot delete what you cannot find. This demands a data inventory and classification: a catalog (DataHub, Amundsen, AWS Glue Data Catalog, or a home-grown registry) that tags every field as PII, sensitive, or non-sensitive, and records which datastore, table, and column holds it. Without this, "delete the user" is a guess. Mature teams enforce classification at write time so new PII columns cannot appear uncatalogued.

**Step two is the data-subject rights machinery.** Beyond access (DSAR) and erasure, GDPR grants rectification (fix wrong data), portability (export in a machine-readable format), and consent withdrawal. Model these as an orchestrated workflow keyed on a stable `user_id`, with a queue that fans a request out to every system of record and tracks completion, because a 30-day legal deadline needs a status you can audit, not an email thread.

**Step three, the hard part, is deleting every copy.** A single user lives in the primary DB, read replicas, Redis caches, an Elasticsearch/OpenSearch index, the analytics lake (S3/Parquet), message queues, application logs, and third-party processors (Stripe, Segment, your email provider). Erasure has to reach all of them. Live stores you delete directly. Search indexes you re-index or delete by query. Third parties you call their deletion API and record the confirmation.

Backups are the killer. You cannot surgically edit a Postgres snapshot from three weeks ago, and you should not (immutable backups are a ransomware defense). The answer is **crypto-shredding**: encrypt each user's data with a per-user data key, store those keys in a KMS, and to "erase" the user, destroy their key. The ciphertext still sits in old backups but is now unrecoverable noise, which regulators accept as effective erasure. This is the single most important pattern in this lesson.

```
Erasure request(user_id)
   -> live DBs / replicas: DELETE rows
   -> caches (Redis): evict keys
   -> search (OpenSearch): delete by query
   -> lake (S3/Parquet): tombstone + compaction rewrite
   -> third parties: call deletion API, store receipt
   -> backups: DESTROY per-user KMS key (crypto-shred)
```

**Retention conflicts** are real: tax law may require keeping transaction records for 7 years even after an erasure request. You cannot honor both blindly, so policy is per-field. You erase the marketing profile and contact info while retaining the legally-mandated financial record (often pseudonymized), and you document the lawful basis for what you keep.

**Interview nuance:** know the three de-identification tiers precisely. **Anonymization** is irreversible: strip identifiers so no one can re-link (truly anonymized data leaves GDPR scope). **Pseudonymization** replaces identifiers with a reversible token, key held separately, still personal data under GDPR. **Tokenization** is a form of pseudonymization for a specific field. For sharing analytics safely, add **k-anonymity** (each row indistinguishable from at least k-1 others) or **differential privacy** (inject calibrated noise so no individual's presence changes an aggregate). Aggregates alone are not safe: a single-row group re-identifies instantly.

Recap: catalog every copy first, orchestrate rights on a stable user_id, delete across all live stores plus third parties, crypto-shred to handle backups, resolve retention conflicts per-field, and pick anonymization vs pseudonymization deliberately with k-anonymity or differential privacy for shared analytics.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a data platform that can find and delete every copy of one user's PII within 30 days across all stores, and can share analytics data while minimizing re-identification risk.

**Think about:**
- How do you locate every copy of a user's PII?
- How does crypto-shredding handle erasure across backups?
- How do anonymization, pseudonymization, and tokenization differ?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a consumer app under GDPR with PII spread across Postgres (primary + replicas), Redis, OpenSearch, an S3/Parquet lake feeding analytics, Kafka, application logs, and third parties (Stripe, Segment, SendGrid). Legal deadline is 30 days.

Foundation, find it: a data catalog tags every field's sensitivity and records its home store. Classification is enforced at write time so no PII column is uncatalogued. This inventory is what makes "delete the user" deterministic rather than a hunt.

Rights orchestration: a DSAR/erasure service keyed on `user_id` writes a request record, then fans out jobs to every registered store and tracks per-store completion against the 30-day clock, producing an auditable trail.

Erasure across stores: direct DELETE in Postgres and replicas, key eviction in Redis, delete-by-query in OpenSearch, tombstone-plus-compaction to physically rewrite Parquet files in the lake, and deletion-API calls to Stripe/Segment/SendGrid with stored receipts. Logs get short retention and PII-scrubbing at ingest so old logs age out.

Backups via crypto-shredding: each user's data is encrypted with a per-user data key in KMS. Erasure destroys that key, so the ciphertext frozen in immutable backups becomes unrecoverable. I keep backups immutable (ransomware defense) and still achieve effective erasure, the pattern regulators accept.

Retention conflicts: policy is per-field. I erase profile and marketing data but retain legally-required financial records (pseudonymized) with a documented lawful basis, rather than blindly honoring one law and breaking another.

Safe analytics sharing: I never share raw PII. For internal analytics I pseudonymize (reversible token, key held separately). For external or broad sharing I anonymize and enforce k-anonymity so no group is a single person, or apply differential privacy (noise injection) for aggregate queries so one individual's presence never shifts a result.

Common wrong turn: claiming GDPR erasure while ignoring backups, caches, search, and third-party processors. Deleting the primary DB row alone leaves the user fully recoverable from a replica, a search index, or a vendor.

**Self-check rubric:**
- [ ] Did I start with a data catalog/inventory so every copy is findable?
- [ ] Did I enumerate ALL stores (DB, replicas, cache, search, lake, queues, logs, third parties)?
- [ ] Did I use crypto-shredding for immutable backups specifically?
- [ ] Did I handle retention conflicts per-field rather than all-or-nothing?
- [ ] Did I distinguish anonymization vs pseudonymization and add k-anonymity or differential privacy for sharing?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the "delete my account" pipeline for a Spotify-scale platform (500M+ users, PII in Cassandra, Kafka, a petabyte-scale data lake, ML feature stores, and dozens of third-party ad and analytics vendors), meeting a 30-day SLA at that scale.

**Model answer (revealed on demand):**

Assumptions: 500M users, high erasure request volume, PII replicated across Cassandra (multi-region), Kafka event streams, a petabyte S3 lake, an ML feature store, and 30+ vendors. Scale makes both discovery and lake rewriting the hard parts.

Architecture: an erasure request publishes a `UserDeletionRequested(user_id)` event to Kafka. Every data-owning system subscribes and is responsible for erasing its own copy, then emits a `DeletionCompleted(user_id, system)` ack. A central coordinator tracks acks against the 30-day SLA and escalates stragglers. This event-driven fan-out scales far better than a synchronous orchestrator calling dozens of systems.

Live stores: Cassandra deletes emit tombstones; I must ensure `gc_grace_seconds` and repair actually purge them across regions, not just mask them. Feature store rows and cached vectors are deleted or invalidated so the ML models stop seeing the user.

Petabyte lake: you cannot rewrite a petabyte on every request. Two moves: (1) crypto-shred, per-user keys so destroying a key neutralizes lake and backup copies instantly without a rewrite, and (2) batch physical deletion via a table format (Apache Iceberg/Hudi/Delta) that supports row-level deletes and periodic compaction, so tombstones from many users are applied in scheduled compaction rather than per-request. Crypto-shredding is what makes the 30-day SLA feasible at this scale.

Third parties: call each vendor's deletion API (or suppression list where deletion is not offered), store the receipt, and treat a missing ack as an SLA breach to chase.

Streams and backups: Kafka topics with PII get short retention plus crypto-shredding; immutable backups are handled entirely by key destruction.

Common wrong turn: trying to synchronously find and rewrite every copy at request time. At 500M users and petabyte lakes that never meets the SLA. Crypto-shredding plus event-driven per-owner erasure plus batched compaction is the scalable pattern.

### sd-l8-audit-supplychain: Audit Logging, OWASP & Supply-Chain Security

- **id:** `sd-l8-audit-supplychain`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** audit-logging, owasp, supply-chain

#### Learn

Three defenses that share a theme: prove what happened, block the obvious attacks, and trust nothing you did not build yourself.

**Tamper-evident audit logging.** An audit log records who did what to which resource when, and its whole value is that it cannot be quietly altered after the fact, including by an insider or an attacker who gained admin. So it must be separate from application logs and tamper-evident. Two techniques: **hash chaining**, where each entry stores a hash of its contents plus the previous entry's hash, so altering or removing any record breaks the chain and is detectable (the same idea a blockchain uses); and **WORM storage** (write-once-read-many, for example S3 Object Lock in compliance mode), which the storage layer itself refuses to overwrite or delete before a retention date. Combine them: write to WORM and chain the hashes.

What to capture per event: actor (user or service identity), action, resource, timestamp, source IP/session, and result (success or failure). Critically, keep PII and secrets **out** of the audit log. The log is widely readable for investigations and retained for years, so a password or SSN in it is a second breach waiting to happen. Log that user 123 viewed record 456, not the record's contents.

```
{ ts, actor, action, resource, source_ip, result, prev_hash, hash }
   -> append-only stream -> WORM store (S3 Object Lock) + hash chain
```

**OWASP application defenses at the gateway.** The OWASP API Security Top 10 is the standard checklist. The one interviewers hammer is **BOLA (Broken Object Level Authorization)**, also called IDOR: the server returns object 456 because the URL asked for it, without checking that this caller owns 456. The fix is an authorization check on every object access, `caller owns resource`, never trusting an ID from the client. Others: input validation and parameterized queries (SQL injection), blocking **SSRF** (validate and allowlist any URL the server fetches, or an attacker pivots to your cloud metadata endpoint), and **mass assignment** (never bind a request body straight onto a model, or a user sets `isAdmin=true`). Centralize what you can at the API gateway (schema validation, rate limits, auth) but object-level authorization has to live in the service that knows ownership.

**Interview nuance:** BOLA is the number-one API risk precisely because it is invisible in a happy-path demo. It only appears when you ask "what if I change the ID in the URL to someone else's?" Say that sentence in an interview.

**Supply-chain security.** Most of your running code is dependencies, so you must secure what you did not write. **SBOM** (Software Bill of Materials, SPDX or CycloneDX) inventories every component so when the next Log4Shell drops you can answer "are we affected?" in minutes. **SCA scanning** flags known-vulnerable dependencies in CI. **Artifact/image signing** with Sigstore/cosign lets deploys verify an image was built by your pipeline, not swapped by an attacker, and **SLSA provenance** attests how and from what source an artifact was built.

**Workload identity kills long-lived secrets.** Instead of a static API key in an env var (which leaks, never rotates, and grants standing access), services get short-lived credentials from their identity. **SPIFFE/SPIRE** issues cryptographic service identities, and cloud **OIDC federation** lets a GitHub Actions job or a pod exchange its identity for a 15-minute cloud credential. No static key to steal.

Recap: make audit logs separate, append-only, hash-chained and WORM-stored with actor/action/resource but no PII; defend BOLA/injection/SSRF/mass-assignment (BOLA first); and secure the supply chain with SBOM, SCA, signing, SLSA provenance, and workload identity for short-lived creds.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a tamper-evident audit-logging system for sensitive and admin actions, and secure the build-and-deploy pipeline and service-to-service auth with no long-lived secrets.

**Think about:**
- What makes an audit log tamper-evident, and what do you capture?
- Which OWASP API risks must the gateway defend?
- How do SBOM, signing, and workload identity secure the supply chain?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a multi-service SaaS where admins can change tenant settings, export data, and impersonate users, and the pipeline builds container images in CI and deploys to Kubernetes.

Audit logging: a dedicated audit service, separate from app logs, exposes an append-only write API. Every sensitive or admin action emits an event capturing actor identity, action, resource id, timestamp, source IP/session, and result. Entries are hash-chained (each stores the previous entry's hash) and persisted to S3 with Object Lock in compliance mode (WORM), so neither an attacker with admin nor an insider can silently rewrite history, and any tampering breaks the chain and is detectable. I deliberately keep PII and secrets out of the payload (log "exported dataset 789," not its rows), since this log is broadly readable and retained for years.

OWASP defenses: the gateway does schema/input validation, rate limiting, and authentication, and all queries are parameterized. The critical control lives in the services: object-level authorization (BOLA/IDOR) on every access, verifying the caller owns the object rather than trusting an ID from the URL. I also block SSRF by allowlisting any server-side URL fetches (protecting the cloud metadata endpoint) and reject mass assignment by binding to explicit DTOs, never the raw request body.

Supply chain: CI generates an SBOM (CycloneDX) for every build and runs SCA scanning to fail the build on known-vulnerable dependencies. Images are signed with cosign and carry SLSA provenance, and the cluster admission controller refuses to run any image lacking a valid signature, so an attacker cannot inject a swapped image.

No long-lived secrets: the CI job and each pod use OIDC federation / SPIFFE to exchange their workload identity for short-lived (15-minute) cloud credentials from the secrets manager, instead of a static key in an env var. There is no standing secret to steal or leak.

Common wrong turn: dumping PII or secrets into logs, or having no audit trail at all for admin actions, so a malicious admin leaves no trace.

**Self-check rubric:**
- [ ] Is the audit log separate, append-only, hash-chained AND WORM-stored?
- [ ] Do I capture actor/action/resource/time/result while keeping PII and secrets out?
- [ ] Did I name BOLA/IDOR and put object-level authz in the owning service (plus SSRF, mass assignment, injection)?
- [ ] Did I cover SBOM + SCA + signing (cosign) + SLSA provenance?
- [ ] Did I replace static secrets with short-lived workload-identity credentials?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the audit and supply-chain security for a healthcare records platform (Epic-style EHR) where every access to a patient chart must be logged for HIPAA, clinicians legitimately need broad read access, and a compromised build could endanger patient safety.

**Model answer (revealed on demand):**

Assumptions: an EHR where thousands of clinicians read millions of charts daily. HIPAA requires an audit control recording every PHI access, and the threat model includes both external attackers and curious insiders (the classic "employee looks up a celebrity's chart").

Audit at read scale: unlike most systems, here reads are the sensitive event, so I log every chart view, not just writes. Each event captures clinician identity, patient id, action (view/edit/print/export), timestamp, and the access context (which encounter or care relationship justified it). Volume is huge, so events stream through Kafka into a WORM audit store (Object Lock) with hash chaining for tamper evidence, and a downstream anomaly detector flags access without a care relationship (an ER nurse opening a chart from a different hospital, or a spike of VIP lookups). The log's value is catching the insider who had valid credentials but no legitimate reason.

Authorization nuance: clinicians need broad access for emergencies (break-the-glass), so I do not hard-block; instead break-the-glass access is allowed but heavily logged and reviewed, turning a BOLA-style hard denial into a monitored, accountable path. Object-level checks still apply for non-clinical roles.

Supply chain and patient safety: a compromised deploy could alter dosing logic, so the bar is high. Every image is SBOM-inventoried, SCA-scanned, signed with cosign, and carries SLSA provenance, and the K8s admission controller refuses unsigned or unattested images. CI uses OIDC federation for short-lived credentials, no static keys. A signed, provenance-attested pipeline means a swapped or backdoored build cannot reach production undetected.

Common wrong turn: logging only writes. In healthcare the unauthorized read is the primary breach, so an audit design that ignores reads fails HIPAA and misses the insider entirely.

### sd-l8-incident-breach-response: Security Incident & Breach Response, Key Compromise

- **id:** `sd-l8-incident-breach-response`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** security, incident-response, compliance

#### Learn

When a key or credential is compromised, panic causes two classic mistakes: wiping systems immediately (destroying the evidence you need) and doing a hard key cutover (logging every user out). A senior responder runs a disciplined loop instead.

**The NIST-style loop** has ordered phases, each with a goal:

```
Detection  -> know something is wrong
Containment-> stop the bleeding without destroying evidence
Eradication-> remove the foothold, rotate secrets
Recovery   -> restore trusted state, watch for reinfection
Lessons    -> blameless postmortem, fix root cause
```

**Detection.** Feed everything into centralized logging or a SIEM (Splunk, Elastic, a cloud-native equivalent) and alert on anomalous key usage: geo-velocity impossibilities (the key signs from two continents a minute apart), unusual volume, or calls at odd hours. Seed **honeytokens** (a fake credential that should never be used, so any use is a certain intrusion signal). And plan for the humbling reality that an outside party (a researcher, a customer, law enforcement) often notifies you first, so build an intake path for external reports.

**Containment without destroying evidence.** Isolate affected systems (pull them from the load balancer, cut network egress) and revoke active sessions, but do not wipe yet. This is the phase where the discipline matters most.

**The core problem: rotate a widely-used key without downtime.** If one signing key protects every session and you just delete it, every valid token instantly becomes invalid and the whole userbase is logged out. The answer is to design for **overlapping key validity** ahead of time. Publish keys via a **JWKS** (JSON Web Key Set) endpoint with a key id (`kid`) in each token header. To rotate: (1) add the new key to the JWKS so verifiers accept both old and new, (2) flip signing to the new key, (3) after tokens signed with the old key have expired, remove the old key. Because verifiers trust both during the overlap, nobody is logged out. Under compromise you compress this: shrink token TTLs immediately so old tokens age out fast, force re-authentication for genuinely affected sessions, and pull the compromised `kid` from the JWKS. Short-lived credentials from a secrets manager (Vault, cloud KMS) make this routine rather than heroic.

**Eradication and recovery.** Remove the attacker's foothold, rotate all potentially-exposed secrets, then restore from a known-good state and watch closely for reinfection. This is where **immutable, object-locked backups** pay off: if the attacker also ran ransomware, a ransomware-resistant backup is your clean recovery path.

**Forensics and the legal clock, running in parallel.** The instant you suspect a breach, evidence preservation starts: snapshot affected volumes and preserve immutable logs **before** you clean anything, and maintain chain of custody so the evidence holds up later. Simultaneously the regulatory clock starts: **GDPR requires notifying the supervisory authority within 72 hours** of becoming aware of a qualifying breach, and affected users without undue delay if there is high risk. So legal and comms are named roles in the runbook, activated at hour zero, not consulted after cleanup.

**Interview nuance:** the trap is optimizing for "fix it fast." Wiping and rebuilding immediately feels decisive but destroys forensics and, with a hard key cutover, causes a self-inflicted outage on top of the breach. The strong answer sequences containment before eradication, rotates keys via overlapping validity, and runs forensics and the 72-hour legal clock in parallel from the start.

Recap: run detection, containment, eradication, recovery, lessons in order; rotate the compromised key via overlapping JWKS validity plus shortened TTLs so nobody is logged out; preserve evidence before cleanup with chain of custody; and start the GDPR 72-hour notification clock the moment you become aware.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the incident and breach response plan for a compromised signing key in a multi-tenant SaaS, covering detection, containment, key rotation and revocation without downtime, forensic evidence, and regulatory notification.

**Think about:**
- What are the ordered phases of incident response, and what is the goal of each?
- How do you rotate and revoke a widely-used key without taking the whole system down?
- What legal and forensic obligations start the moment you confirm a breach?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a multi-tenant SaaS under GDPR whose JWT signing key (or a privileged API key) is compromised and may already have been used to mint valid tokens. The key is used to verify every session, so a naive revocation logs everyone out.

The loop: I run detection, containment, eradication, recovery, and lessons-learned in order, with forensics and legal running in parallel from hour zero.

Detection: a SIEM aggregates logs and alerts on anomalous key usage, geo/velocity anomalies, and honeytoken hits, and I keep an intake path because an outside party may report it first. Confirming the compromise starts every downstream clock.

Containment: isolate affected systems (drop them from the load balancer, cut egress) and revoke active sessions, but do not wipe anything yet, because eradication before evidence preservation destroys forensics.

Key rotation without downtime: this is the crux. Because I publish keys via a JWKS with a `kid` per token and support overlapping validity, I add a new signing key to the JWKS (verifiers now accept both), flip signing to the new key, then remove the compromised `kid`. Nobody is logged out during the overlap. Under active compromise I compress the window: shrink token TTLs so attacker-minted tokens expire fast, pull the bad `kid`, and force re-authentication for affected sessions. Short-lived creds from Vault/KMS make this routine.

Eradication and recovery: remove the foothold, rotate every potentially-exposed secret, restore from known-good state, and watch for reinfection. Immutable, object-locked backups give a clean recovery path if ransomware was involved.

Forensics (parallel): snapshot volumes and preserve immutable logs before cleanup, with chain of custody, so evidence survives.

Legal (parallel): GDPR's 72-hour notification clock to the supervisory authority starts the moment I become aware, so legal and comms are activated at hour zero, and I notify affected tenants without undue delay if risk is high.

Common wrong turn: wiping and rebuilding immediately to "fix it fast," which destroys forensic evidence, and doing a hard key cutover that logs out every tenant, converting a breach into a self-inflicted outage.

**Self-check rubric:**
- [ ] Did I name the ordered phases (detect, contain, eradicate, recover, lessons) with a goal each?
- [ ] Did I rotate the key via overlapping JWKS validity + shortened TTLs so nobody is logged out?
- [ ] Did I contain BEFORE eradicating, and preserve evidence (snapshots, immutable logs, chain of custody) before cleanup?
- [ ] Did I start the GDPR 72-hour notification clock at "become aware" and name legal/comms roles?
- [ ] Did I flag the "wipe immediately / hard cutover" wrong turn?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the breach response for a compromised root Certificate Authority signing key at a payments provider (a Stripe-scale system) where the key secures mTLS between thousands of internal services and any rotation risks a full internal outage.

**Model answer (revealed on demand):**

Assumptions: the compromised key is the private key of an internal root CA that signs the certificates every service uses for mTLS. Thousands of services trust this root. Naively revoking it makes every service distrust every other service at once: a total internal outage. This is the highest-stakes version of "rotate a widely-used key."

Why it is hard: unlike a JWT signing key, a root CA is a trust anchor baked into every service's trust store. You cannot just publish a new one and flip; every workload has to trust the new root before you can stop trusting the old one.

The rotation strategy is **cross-signing and staged trust distribution**: (1) generate a new root CA in an HSM, (2) push the new root into every service's trust bundle so services trust BOTH old and new roots (a config rollout, not a cutover), (3) once telemetry confirms every workload trusts the new root, reissue leaf/intermediate certs signed by the new root (short-lived, via SPIFFE/SPIRE so this is automated and fast), (4) only then remove the compromised root from trust stores. The overlap window is what prevents the outage, the same overlapping-validity principle as JWKS but applied to a PKI trust anchor.

Containment meanwhile: shrink certificate TTLs hard (SPIFFE issues minutes-long certs), and use the CRL/OCSP path to revoke the specific compromised intermediates without yet touching the root.

Detection and forensics: CA usage is tightly audited, so alert on any signing operation not originating from the approved issuance pipeline, and preserve HSM audit logs (they are your chain of custody).

Legal: a payments provider under PCI-DSS plus GDPR notifies card networks/acquirers and the supervisory authority on the regulatory clocks, in parallel with the technical response.

Common wrong turn: revoking the root immediately. It is decisive and catastrophic, freezing all internal mTLS. Staged cross-signed trust distribution is the only way to rotate a trust anchor without downtime.
