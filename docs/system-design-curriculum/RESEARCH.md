# Learn System Design — research foundation

> Part of the **[Learn System Design curriculum pack](./README.md)**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [RESEARCH](./RESEARCH.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)

The web-grounded research that shaped this curriculum: what modern distributed systems and the **modern
system-design interview** actually require, the full skill taxonomy (a twelve-level spine from the interview
method up through ML/LLM infrastructure), the canonical "design X" case-study canon, the 2023-2026 additions
(ML/LLM infra, vector DBs, multi-region, edge), and the candidate pitfalls that separate a passing answer
from a failing one. This fed the [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md).

The material is grounded in the reference canon the whole field draws on: Alex Xu's *System Design Interview*
Vol. 1 & 2 and the [ByteByteGo](https://bytebytego.com/) archive; the [Hello Interview](https://www.hellointerview.com/learn/system-design)
guides and their "don't do ritual estimation" stance; Martin Kleppmann's *Designing Data-Intensive Applications*
(the definitive text on replication, partitioning, transactions, and consensus); the [Google SRE Book and SRE
Workbook](https://sre.google/books/) for SLO/error-budget practice; the [AWS Builders' Library](https://aws.amazon.com/builders-library/)
for load shedding, retries, and cell-based architecture; [Jepsen](https://jepsen.io/) for how consistency claims
are actually falsified; and the vendor engineering blogs and docs (Confluent/Kafka, Netflix, Uber, Stripe,
Cloudflare, Databricks, Google Cloud) that the case studies are reverse-engineered from. Sources are cited
inline; a consolidated list closes the document.

Nine briefs follow, one per competency band:

1. **The interview method (L0)** — the phased clock, requirements, estimation, the design walkthrough, and level calibration.
2. **Foundations (L1)** — networking, the request lifecycle, API/contract design, and performance fundamentals.
3. **Data storage & modeling (L2)** — ACID, storage engines, the NoSQL families, and blob/vector storage.
4. **Scaling the data tier (L3)** — replication, sharding, caching, CDN/edge, and search systems.
5. **Scaling compute & traffic (L4)** — horizontal scaling, load balancing, gateways, rate limiting, autoscaling, load shedding.
6. **Distributed systems core (L5)** — CAP/PACELC, consistency, clocks, consensus/Raft, transactions/sagas, failure detection.
7. **Async & event-driven systems (L6)** — queues/Kafka, delivery semantics, idempotency, event sourcing/CQRS, streaming.
8. **Reliability & operations (L7)** — SLOs/error budgets, DR/failover, resilience patterns, observability, deploy/release, chaos.
9. **Security, privacy & multi-tenancy (L8)**, **modern architecture & delivery (L9)**, **the case-study canon (L10)**, and **specialized 2023-2026 systems (L11)**.

Throughout, three cross-cutting shifts recur and are called out where they land: **cost/FinOps as a first-class
non-functional requirement**, **operational maturity (observability + SLOs) as a graded phase**, and the arrival
of **GenAI/ML system design** (RAG, vector search, LLM serving, model gateways) into the standard canon.

---

## Brief 1 — The interview method, estimation, and the structured walkthrough (L0)

### The phased clock is the single strongest predictor of a senior-looking answer

A repeatable phase structure with a time budget is what makes an answer read as complete rather than
meandering. The canonical phases and their rough budget for a 45-minute round: **clarify / requirements (~5 min)
→ core entities (~2 min) → API / interface (~5 min) → high-level design + data flow (~10-15 min) → deep dives
(~10 min) → wrap-up.** Spend only ~5-7 minutes total on requirements and estimation; the bulk goes to design
and deep dives ([Hello Interview — Delivery Framework](https://www.hellointerview.com/learn/system-design/in-a-hurry/delivery);
Alex Xu, *System Design Interview* Vol. 1, ch. "A framework for system design interviews").

The prime directive is to **arrive at a complete system that satisfies the stated requirements before adding
complexity.** Incomplete solutions are the number-one reason mid-level candidates fail, so pace to finish and
narrate transitions out loud ("I have a working design; now let me harden it against the availability
requirement"). The framework is a scaffold, not a script — reorder when the interviewer steers, and don't force
estimation math if it won't change the design.

### Clarify the ambiguous prompt; scoping is itself graded

Interviewers deliberately give one-line prompts ("Design Twitter"). Distinguish the *product* ask from the
*system* ask, confirm which feature slice is in scope, and **explicitly negotiate what is out of scope to protect
your time budget.** Ask about users/actors, primary use cases, scale, read-vs-write ratio, and geographic
distribution — then move after 3-5 sharp questions. Treat the interviewer as a collaborating PM, not an oracle:
propose assumptions and get buy-in rather than interrogating.

### Requirements: functional (top ~3), then quantified non-functional

Phrase **functional requirements** as concrete user capabilities ("users should be able to post / follow / view
feed") and ruthlessly prioritize the top three; each should later map to an API endpoint and a data-flow path.
Defer secondary features (search, analytics, notifications) explicitly.

**Non-functional requirements are what actually drive the interesting architecture**, so quantify them:
"p99 feed load < 200 ms," "scale to 100M DAU," "99.99% availability" — not vague adjectives. Take an explicit
CAP/PACELC stance (availability vs consistency, and why, for *this* system), pick the 3-5 NFRs that most shape
the design, and tie each to a later decision: low latency → cache/CDN; high availability → replication/
multi-region; strong consistency → quorum/leader. Distinguish read-path from write-path SLAs.

### Back-of-the-envelope estimation (Fermi), used sparingly

Estimation shows you can reason about scale quantitatively and justifies sharding, caching, and server counts.
Decompose the unknown into assumed quantities, **state every assumption and label units**, and round to powers
of ten. Standard targets: QPS (average + peak with a 2-3x spike multiplier), storage/day and /5yr, bandwidth
in/out, cache/memory (apply the 80/20 rule to size the hot working set), and a first-order server count. The
**latency ladder every engineer should know** anchors the math: memory ~100 ns ≪ SSD read ~100 µs ≪ same-DC
round-trip ~0.5 ms ≪ cross-region round-trip ~50-150 ms; one day ≈ 86,400 s (~10⁵) for quick QPS-to-volume
conversion (Jeff Dean's ["Numbers Everyone Should Know"](https://static.googleusercontent.com/media/research.google.com/en//people/jeff/stanford-295-talk.pdf);
[Hello Interview — Estimation](https://www.hellointerview.com/learn/system-design/deep-dives/estimation)).

The modern (Hello Interview) stance is **estimation-that-drives-design**: skip ritual capacity math and only
compute the numbers that actually change an architectural decision. Whether a system is read-heavy or
write-heavy — and how it fans out — dictates caching, replication, CDN, and datastore choice, so model fan-out
on read vs fan-out on write for feed/notification systems, and account for Zipfian hotspots, not just averages.

### The high-level design, deep dives, and trade-off framing

The end-to-end **component diagram plus a traced request path** (write path *and* read path) is the core
deliverable interviewers grade for completeness. Start with the simplest boxes that satisfy requirements
(client, LB, app servers, DB, cache) and evolve; introduce standard components — gateway, queue, CDN, object
store, search index — only with justification. Then let the NFRs and traffic model point you to the bottleneck
(hot partition, single point of failure, tail latency) and do **deep dives that present 2+ options with explicit
trade-offs and a defensible recommendation.** Frame every major choice through principled lenses: CAP/PACELC,
push vs pull, sync vs async, normalize vs denormalize, SQL vs NoSQL. Commit to a decision rather than listing
options and stalling; quantify the trade-off ("this doubles storage but halves read latency") and acknowledge
what you give up.

### Wrap-up and level calibration

A closing pass on operational maturity separates senior candidates and is explicitly evaluated in 2025-2026
rubrics: name the top remaining bottleneck ("where it breaks first at 10x"), the main failure mode, what you'd
monitor (metrics/logs/traces, health checks, graceful degradation), and the **dominant cost driver plus a lever
to reduce it.** The same prompt is graded on different rubrics by level:

| Level | What a passing answer looks like |
|---|---|
| **Junior** | Correct high-level design, core components, basic scaling; completeness over depth. |
| **Senior** | Proactive bottleneck-finding, quantified trade-offs, deep dives, drives the session unaided. |
| **Staff+** | Ambiguous-scope framing, org/cost/reliability trade-offs, multi-system and evolution-over-time thinking. |

The graded rubric axes are **problem navigation, technical excellence, communication, and (senior+) proactive
depth** ([Hello Interview — evaluation rubric](https://www.hellointerview.com/blog/the-system-design-interview-evaluation-criteria)).
A staff answer to a junior prompt that never finishes can read as failing.

### What's new in the 2025-2026 method

- **Cost/FinOps awareness** — interviewers now probe dollar cost and cost-latency trade-offs, not just feasibility.
- **Operational maturity as a phase** — observability (metrics/logs/traces), SLOs, health checks, graceful degradation, and on-call/runbook thinking.
- **ML/GenAI prompts in the canon** — design a recommendation feed, a RAG/LLM chat system, an ML feature store, or an ad-ranking pipeline.
- **Security/privacy by default** — auth/authz, encryption in transit/at rest, PII, GDPR/data-residency, multi-region implications.
- **Remote-tooling fluency** — Excalidraw / collaborative whiteboards and organizing a shared canvas, since most rounds are virtual.
- **Edge/CDN + multi-region active-active** as default expectations for global-scale prompts (data locality, conflict resolution).
- **Backpressure, idempotency, and exactly-once vs at-least-once** discussed explicitly for write and queue paths.
- **AI-prep caveat** — interviewers now *penalize* memorized/templated answers that ignore the actual requirements; adapt the pattern to the prompt.

### The L0 pitfalls

Jumping to boxes-and-arrows before clarifying scope; an unbounded feature list instead of the top ~3; generic
NFRs ("scalable, reliable") that change no decision; elaborate capacity math that changes nothing (analysis
paralysis); designing in silence; over-engineering early (sharding, microservices, exotic tech) before a simple
correct design exists; **never reaching a working end-to-end system** (the top mid-level failure); unlabeled/
assumption-free estimates; ignoring the read:write ratio and hotspots; refusing to take a CAP stance; steamrolling
the interviewer's hints; reciting a memorized "design X"; over-documenting full schemas; and skipping the
wrap-up (no bottleneck, failure-mode, monitoring, or cost discussion).

---

## Brief 2 — Foundations: networking, the request lifecycle, API design, performance (L1)

The foundations layer is the substrate every later decision rests on, and its integrative case study — **"what
happens when you type a URL and press enter"** — ties DNS, TCP, TLS, proxies, caching, and rendering into one
story.

### The network stack and the request path

Use the practical 5-layer view (link, IP, TCP/UDP, TLS, HTTP/app) rather than treating OSI as gospel. The
load-bearing distinction is **L4 (connection/packet) vs L7 (request/content)** for load balancers, proxies, and
firewalls. Every request begins with **DNS** — recursive vs authoritative resolvers, record types (A/AAAA, CNAME,
NS), and TTL as the trade-off between failover speed and query load. GeoDNS / latency-based routing steers
traffic; but DNS is not instant failover because resolvers and clients cache (a top pitfall).

**TCP** costs a 1-RTT handshake before any data, so connection reuse (keep-alive) and pooling amortize setup;
TIME_WAIT and ephemeral-port exhaustion bite at scale. **UDP** trades reliability for latency and is the
foundation of **QUIC/HTTP/3**. **TLS 1.3** is now the baseline (1-RTT, 0-RTT resumption); mTLS provides
service-to-service identity in a zero-trust mesh. Across HTTP versions: 1.1 is one-request-at-a-time with
keep-alive; **HTTP/2** multiplexes streams over one TCP connection but still suffers TCP-level head-of-line
blocking; **HTTP/3 over QUIC** removes HOL blocking per stream, adds faster handshakes and connection migration
(Wi-Fi ↔ cellular), and shines on lossy/mobile paths — adopt it selectively at the edge, while internal RPC
often stays on H2/gRPC ([Cloudflare Learning Center — HTTP/3](https://www.cloudflare.com/learning/performance/what-is-http3/)).

### API design is the most common L1 topic

The single most common question is **paradigm selection: REST vs gRPC vs GraphQL.** REST is resource-oriented,
HTTP-cacheable, and the default for public APIs (~80% of business APIs); **gRPC** is contract-first Protobuf over
HTTP/2, binary and far more compact, best for internal service-to-service RPC and streaming; **GraphQL** lets
clients specify queries and solves over/under-fetching for varied clients at the cost of caching and complexity.
A hybrid is normal: REST/GraphQL at the edge, gRPC between services; know WebSocket/SSE for push and queues for
async.

Design the **contract schema-first** (OpenAPI for REST, Protobuf IDL for gRPC, SDL for GraphQL) with
consumer-driven contract testing in CI, and **version from day one** (`/v1` path versioning for public REST;
GraphQL fieldwise deprecation; Protobuf field-number rules) — omitting versioning is a classic costly mistake.
Two boundary behaviors interviewers reliably probe:

- **Idempotency and safe retries** — GET/PUT/DELETE are idempotent by definition; POST/PATCH need an
  **Idempotency-Key** (client UUID, server stores the *result* with a TTL, returns it on replay) so a retried
  "submit payment" never double-charges. This is now a first-class API feature (Stripe-style).
- **Cursor/keyset pagination** — offset/limit is O(n)-deep and unstable under concurrent inserts; keyset
  (`WHERE id > cursor ORDER BY id LIMIT n`) is O(1) and stable and is the default for anything that scales.
  Always bound page size; prefer `has_more` over exact counts.

Model errors as **RFC 9457 Problem Details** (structured `type/title/status/detail/instance`, superseding
ad-hoc bodies and RFC 7807) with stable machine-readable codes and a correlation ID, distinguishing retryable
(5xx/429) from non-retryable (4xx). Enforce **rate limiting** at the boundary (token bucket / leaky bucket /
sliding window), returning 429 + `Retry-After` + standardized `RateLimit` headers.

### Load balancing, edge, and caching

Place **load balancing** in front of a stateless tier: L4 (fast, opaque) vs L7 (HTTP-aware routing, TLS
termination, path/host rules); algorithms round-robin / least-connections / weighted / consistent-hashing;
active vs passive health checks with connection draining and graceful shutdown; and the LB itself made redundant
(anycast / active-active) so it isn't a single point of failure. Push cross-cutting concerns (TLS, auth, rate
limiting, routing) to a **reverse proxy / API gateway / BFF** rather than duplicating them per service, with a
**service mesh** (sidecar, mTLS) for internal traffic. A **CDN** moves bytes close to users via anycast POPs;
design cache keys, TTLs, and invalidation (purge vs versioned/fingerprinted URLs), and never cache personalized/
authenticated responses.

**Caching is the highest-leverage performance tool and the source of the hardest correctness bugs.** Know the
layers (browser → CDN → reverse proxy → app/in-memory → distributed cache → DB buffer), the patterns (cache-aside,
read-through, write-through, write-behind), the invalidation strategies (TTL, explicit purge, event-driven), and
the failure modes (thundering herd / stampede, hot keys) with their mitigations (request coalescing/singleflight,
jittered TTL, probabilistic early expiration).

### Performance and resilience fundamentals

You cannot SLO what you can't measure, and **averages lie**: reason in percentiles (p50/p95/p99/p99.9) because
**tail latency dominates when one request fans out to many services.** Little's Law (concurrency = arrival rate ×
latency) relates throughput and latency; SLI/SLO/SLA and error budgets are the vocabulary. The core resilience
primitives: every network call gets a **timeout** with deadline/budget propagation across the chain; **retries**
only for idempotent errors, with exponential backoff *and jitter*; a **circuit breaker** (closed/open/half-open)
to stop hammering a failing dependency; **bulkheads** to isolate pools; and **backpressure / load shedding /
admission control** (reject early with 429/503) so the system degrades instead of collapsing — queue utilization
near 100% makes latency explode. Instrument the request path with the three pillars (metrics, logs, traces),
distributed tracing via propagated correlation IDs, and RED (rate/errors/duration) + USE (utilization/saturation/
errors).

**Modern L1 shifts:** HTTP/3/QUIC at the edge; TLS 1.3 baseline + mTLS/zero-trust; RFC 9457 error format;
standardized RateLimit headers; Idempotency-Key as expected; cursor pagination as default; schema-first +
contract testing; adaptive concurrency limits; coordinated-omission awareness in latency measurement;
edge compute / stale-while-revalidate; SLO/error-budget framing; deadline/budget propagation; and the AI-era
reality of **token streaming (SSE), long-lived connections, and tail latency to model backends.**

**L1 pitfalls:** quoting average instead of p99; no versioning from day one; retries without idempotency/backoff/
jitter (retry storms); no timeouts (thread exhaustion cascades); offset pagination on large tables; treating TLS/
handshake as free; assuming DNS TTL gives instant failover; confusing L4/L7 or making the LB/gateway a SPOF or a
logic monolith; caching personalized responses / ignoring stampede; leaking stack traces and using wrong status
codes; jumping to Kafka/gRPC/GraphQL before establishing requirements; stateful/sticky servers that can't scale
out; skipping capacity math; unbounded queues; forgetting authz and input validation at trust boundaries; and no
correlation IDs.

---

## Brief 3 — Data storage & modeling (L2)

Relational + ACID is the correctness baseline every candidate should reason about *before* trading it away, and
the modern default advice is **"boring, relational (a single well-indexed Postgres) until a concrete requirement
forces a specialized store."**

### ACID, isolation, and concurrency control

Define **ACID** concretely (durability means the commit is fsync'd to the WAL, not just in memory; consistency
is the app invariant enforced by constraints + isolation). The **most-probed storage topic in senior interviews
is transaction isolation**: the ANSI levels (Read Uncommitted → Read Committed → Repeatable Read → Serializable)
and the anomalies each prevents (dirty read, non-repeatable read, phantom, plus **write skew** and **lost update**).
Read Committed is the Postgres default; MySQL InnoDB defaults to Repeatable Read; **snapshot isolation still
allows write skew** (a classic trap), fixed with `SELECT … FOR UPDATE`, optimistic version columns, or a unique
constraint. Under the hood: **MVCC** (writers create versions, readers see a snapshot without blocking) vs
pessimistic 2PL vs optimistic CAS, plus vacuum/GC of old versions as a real operational concern
(Kleppmann, *DDIA* ch. 7; [Postgres MVCC docs](https://www.postgresql.org/docs/current/mvcc.html)).

### Storage engines and indexing

The **B-tree vs LSM-tree** trade-off is behind every database choice. B+trees do in-place updates and excel at
range scans/reads (InnoDB, Postgres); **LSM-trees** (memtable + immutable SSTables + compaction, with bloom
filters) give high write throughput via sequential writes and suit SSD/write-heavy workloads (RocksDB, Cassandra,
LevelDB). Know read/write/space amplification and compaction stalls. **Indexing** decisions — clustered vs
secondary, composite column ordering and the leftmost-prefix rule, covering/index-only scans, selectivity, and
specialized indexes (hash, partial, GIN/GiST, full-text, geospatial) — must weigh that **every index amplifies
writes**; over-indexing is a real cost. The physical layer (fixed-size pages, buffer pool / page cache, WAL,
sequential vs random I/O's ~100x gap) connects "design" to real latency and durability.

### Modeling: normalization and query-first design

**Normalization** (1NF-3NF/BCNF) removes redundancy and update anomalies; **denormalization** trades write cost
and storage for cheap reads on hot paths, managed via materialized views and summary tables — the trigger is
query pattern + scale, not aesthetics. The biggest mindset shift for NoSQL/scaled systems is **query-first
(access-pattern) modeling**: list access patterns first, then design partition-key + sort-key so each pattern is
served in one lookup, modeling one-to-many and many-to-many by embedding vs referencing rather than joins, and
avoiding hot partitions in the key design.

### The NoSQL families (match workload to family)

| Family | Fit / examples | Key modeling notes |
|---|---|---|
| **Key-value** | Caches, sessions, counters — Redis, DynamoDB, Memcached | O(1) point lookups; value-blob opacity; TTL/eviction; hot-key avoidance |
| **Document** | Flexible/hierarchical app data — MongoDB, Couchbase, Firestore | Embed vs reference; per-document atomicity; schema-on-read (it *has* a schema) |
| **Wide-column** | Massive write-heavy sparse data, feeds, time-series — Cassandra, ScyllaDB, Bigtable, HBase | Partition key + clustering columns; one denormalized table per access pattern; tunable quorum consistency; avoid unbounded partitions |
| **Graph** | Deeply connected multi-hop queries, fraud rings, recommendations — Neo4j | Index-free adjacency; recursive relational joins blow up at depth; harder to scale horizontally |
| **Time-series** | Metrics, IoT, observability — InfluxDB, TimescaleDB, Prometheus, ClickHouse | Time as primary partition; downsampling/rollups/retention; **tag cardinality explosion** is the failure mode |
| **Vector** | AI/RAG/semantic search (see Brief 9) — Pinecone, Weaviate, Milvus, Qdrant, pgvector | ANN indexes (HNSW/IVF/PQ); metadata filtering + hybrid search |
| **Columnar/OLAP** | Analytics over billions of rows — ClickHouse, Snowflake, BigQuery, Redshift, Druid | Column-oriented scans + heavy compression; star/snowflake schemas; **never on the OLTP primary** |

**Blob/object storage** (S3/GCS/Azure Blob) is where large binaries actually live: the DB holds metadata + object
key, the object store holds bytes, with **presigned URLs** for direct client upload/download, storage classes/
lifecycle tiering (hot→cold→archive), a CDN in front for reads, and multipart upload — putting images/video in the
DB is a classic mistake.

### Scaling storage and choosing IDs

**Partitioning/sharding** is the primary lever beyond one machine: hash (even spread) vs range (range scans) vs
directory shard keys, **consistent hashing** to minimize reshuffle, the hot-shard/celebrity problem, and the pain
of cross-shard joins/transactions. **NewSQL / distributed SQL** (Spanner, CockroachDB, TiDB, YugabyteDB) is
increasingly the expected default for large new systems — horizontal scale + ACID via Raft/Paxos and clock-based
ordering (TrueTime), at the cost of cross-region 2PC latency. Small early decisions echo: **monotonic auto-increment
keys cause write hotspots on B-trees, and random UUIDv4 hurts index locality — ULID/UUIDv7 restore time-ordering**
(a specific, current best practice).

**Modern L2 additions:** vector storage & ANN as table stakes; open lakehouse table formats (**Apache Iceberg,
Delta Lake, Hudi**; AWS S3 Tables) bringing ACID/schema-evolution/time-travel to object storage; HTAP / zero-ETL /
unified OLTP+OLAP; separation of storage and compute as the cloud default (Snowflake, Aurora, Neon); serverless/
scale-to-zero databases; **log-based CDC** (Debezium, logical replication) to fan data out; time-ordered IDs;
multimodel convergence (Redis with vector/streams, Postgres with pgvector/JSONB/PostGIS); and tiered/lifecycle
storage as a cost lever ([Databricks — lakehouse](https://www.databricks.com/glossary/data-lakehouse);
[Debezium docs](https://debezium.io/documentation/)).

**L2 pitfalls:** reaching for NoSQL without evidence; modeling entities-first for NoSQL; claiming "NoSQL has no
schema"; confusing isolation levels and their anomalies (thinking SI prevents write skew); "eventual consistency"
as a magic word with no stated staleness tolerance; blobs in the DB; over-indexing; a hot-partition shard key
(status/country/timestamp); hand-waving cross-shard cost; UUIDv4 as a clustered PK; ACID/CAP as buzzwords;
running analytics on the OLTP primary; assuming document DBs give multi-document transactions; and unbounded
partitions/rows.

---

## Brief 4 — Scaling the data tier: replication, sharding, caching, CDN, search (L3)

The disciplined order is **exhaust replication, caching, and vertical scale before sharding** — jumping straight
to shards is a top pitfall.

### Replication and consistency

**Read replicas** (single-leader: writes to leader, reads fanned to N followers) are the first, cheapest lever for
read-heavy systems — but they scale reads, not writes, and introduce **replication lag** with its user-visible
symptom: broken read-your-writes ("I posted a comment and it vanished on refresh"). The fixes are session
guarantees engineered explicitly: sticky routing to the leader after a write, version/timestamp tokens, or a
lag-bounded replica. Choose a **topology** — single-leader (simple, no write conflicts, leader is the write
bottleneck), multi-leader (multi-region writes but write-write conflicts to resolve), or leaderless/Dynamo
(quorum reads/writes, no failover, eventual + read repair) — and reason with **PACELC**, not just CAP: even with
no partition, strong consistency costs a leader/quorum round-trip. Quorums give `R + W > N` overlap (not
linearizability); conflicts resolve via last-write-wins (lossy), version vectors, CRDTs, or app-level merge, and
replicas converge only via **anti-entropy** (read repair, Merkle-tree reconciliation) — omitting it is a common
gap.

### Partitioning done right

Beyond the range/hash/directory choice, the **shard key is the highest-stakes decision** because a bad one
silently recreates a single-node bottleneck and is very costly to change. Pick a high-cardinality key aligned to
the dominant query; handle the **celebrity/hot-key problem** (salting/key-splitting, sub-partitioning, dedicated
whale shards); use **consistent hashing with virtual nodes** so losing one of ten nodes doesn't invalidate the
keyspace; and plan resharding, split points, and double-write cutover *early*. Cross-shard operations are the
pain point: scatter-gather bounds latency by the slowest shard (tail amplification), 2PC is avoided on the hot
path, and **sagas with compensating actions + idempotency keys + the outbox pattern** are the standard answers.

### Caching, CDN, and the stampede

Cache-aside (lazy) is the common default; know read-through / write-through / write-behind and their durability
trade-offs, TTL + jitter, and eviction (LRU/LFU). The set-piece problem is **cache stampede / thundering herd**:
a single popular key expiring can take the DB to 100% CPU instantly. The 2025 consensus is **layered defense** —
request coalescing / singleflight, per-key mutex, **probabilistic early expiration**, and TTL jitter — not a
single mechanism. The cache tier itself scales and must stay available (Redis Cluster hash slots + Sentinel/
replicas, near-cache L1 to cut hops), and a **CDN** adds a multi-tier hierarchy with an **origin shield** that
coalesces misses so origin sees ~10k not millions of QPS, plus edge compute and stale-while-revalidate.

### Search and derived-data sync

Databases can't do relevance ranking or fuzzy text at scale, so a **full-text search tier** (Elasticsearch/
OpenSearch) is required: an inverted index (terms → posting lists), an analysis pipeline (tokenize/stem/synonyms),
BM25/TF-IDF scoring, primary + replica shards, and `search_after` instead of deep offset paging — and it is a
*derived, rebuildable store, never a system of record.* Modern search is **hybrid**: BM25 for exact tokens (error
codes, IDs) fused with dense vectors for meaning via **Reciprocal Rank Fusion (RRF)**, then a **two-stage
retrieve-then-rerank** with a cross-encoder for top-k precision.

Every derived store (cache, search index, replica) drifts without discipline, which surfaces the **dual-write
problem** (two independent writes can partially fail and diverge). The canonical fix is the **transactional
outbox** (write the event to an outbox table in the same DB transaction; a relay publishes it) fed by **log-based
CDC** (Debezium, Postgres logical decoding, MySQL binlog), with **at-least-once delivery + idempotent consumers**
over exactly-once fantasies. **Multi-region** data adds geo-partitioning/residency (GDPR), active-passive vs
active-active with conflict resolution, read-local/write-global with bounded staleness, and the speed-of-light
latency floor.

**Modern L3 additions:** CDC as the default sync backbone; outbox/inbox as the standard dual-write fix; hybrid
search + RRF + rerank; vector DBs/ANN as first-class; origin shield + edge compute; probabilistic early expiration
+ singleflight; PACELC over CAP; NewSQL blurring SQL/NoSQL; bounded-load consistent hashing and rendezvous (HRW)
hashing; data residency/geo-partitioning; approximate structures (HyperLogLog, Count-Min, Bloom); CQRS with
event-synced read models; and change-stream-driven invalidation + stale-while-revalidate/stale-if-error.

**L3 pitfalls:** sharding before replication/caching/vertical scale; a low-cardinality/sequential shard key;
reasoning with averages (ignoring tail/skew/celebrity); CAP as a binary; promising read-your-writes off a lagging
replica; dual-writing DB + cache/search with no outbox/CDC; caching with no stampede protection or consistency
story; hand-waving cross-shard joins; treating a cache/index as a system of record; no resharding plan; skipping
capacity math; assuming free global strong consistency; and deep offset pagination + unbounded scatter-gather.

---

## Brief 5 — Scaling compute & traffic (L4)

### Statelessness is the precondition for everything

You cannot load-balance or autoscale servers that hold local state, so the first move is to **externalize
session/state to Redis/DB/JWT** (cattle, not pets; nodes provisioned from immutable images/IaC). Horizontal
scale-out is the default for the web/app tier; vertical scale-up still wins for hard-to-shard stateful tiers until
you shard.

### Load balancing and the edge

**L4 vs L7** is the core routing choice: L4 (~50-100 µs, high throughput, no payload inspection — good for raw
connections, WebSockets, game servers) vs L7 (content/path/header routing, TLS termination, rate limiting,
retries, observability, ~0.5-3 ms). Real architectures stack both (AWS NLB → ALB, Google Maglev → Envoy).
Algorithms: round-robin / weighted for homogeneous pools; **least-connections / least-outstanding-requests** for
variable durations; **power-of-two-choices (P2C)** as the practical large-pool default (avoids the herd and an
O(N) least-conn scan); consistent/rendezvous hashing for sticky routing. Health-check carefully — **liveness vs
readiness**, active vs passive (outlier ejection), connection draining, and slow-start — and remember a shallow
200 can mask a broken dependency. Above the regional LB sits **global/DNS load balancing** (GSLB): GeoDNS +
health-checked failover, anycast + BGP, Maglev-style consistent hashing for connection stability, and active-active
vs active-passive multi-region. The **API gateway / BFF** centralizes auth, TLS, rate limiting, routing, and
aggregation without becoming a fat god-object.

### Rate limiting, autoscaling, and overload protection

**Rate limiting** is a top-3 canonical component: token bucket (burst-friendly) vs leaky bucket (smooth) vs fixed
window (cheap, boundary-spike bug) vs sliding-window log (accurate, memory-heavy) vs sliding-window counter (the
practical compromise), keyed per user/IP/API-key/endpoint, returning 429 + `Retry-After`. **Distributed** rate
limiting needs a shared atomic counter (Redis `INCR`/Lua) or local approximation, and must decide fail-open vs
fail-closed when the store is down. **Autoscaling** spans three layers — HPA (pods) vs VPA (right-sizing) vs
cluster/Karpenter (nodes) — and the modern signal is **event-driven (KEDA on queue/Kafka lag or HTTP concurrency)**
plus scheduled/predictive pre-scaling, because **scaling lag** (scrape + decide + boot + warm) means reactive
scaling always trails a fast burst — hence warm pools / provisioned concurrency.

When overloaded, **shed load before collapse**: reject early (429/503) rather than let queues and latency explode
(congestion collapse), drop low-priority traffic first, use **adaptive concurrency limits** (Little's Law,
Netflix concurrency-limits) instead of static thresholds, apply **backpressure** with bounded queues, drop stale/
timed-out requests, and prefer **brownout/graceful degradation** (shed features, serve cached/partial responses)
over hard failure. Wrap dependencies in **timeouts + retries (backoff + jitter + retry budgets) + circuit breakers
+ bulkheads** with deadline propagation, so one slow downstream can't exhaust all threads. The modern
blast-radius pattern is **cell-based architecture + shuffle sharding** (AWS/Slack/Shopify): a cell is a
self-contained slice serving a subset of users; shuffle sharding gives each tenant a random subset of workers so
overlap between any two tenants is tiny (AWS Route 53's 4-of-thousands), containing a bad tenant, deploy, or AZ
([AWS Builders' Library — shuffle sharding & workload isolation](https://aws.amazon.com/builders-library/workload-isolation-using-shuffle-sharding/)).

**Modern L4 additions:** KEDA event-driven autoscaling; adaptive concurrency limits; cell-based + shuffle
sharding as the default hyperscale blast-radius control; ambient/sidecarless and **eBPF (Cilium)** meshes cutting
the sidecar tax; retry budgets + circuit-broken retries against self-inflicted storms; deadline propagation;
ML/predictive/scheduled pre-scaling on SLO targets; zone/locality-aware LB to cut cross-AZ cost; power-of-two-
choices; standardized RateLimit headers; warm pools/provisioned concurrency; and graceful degradation/brownout.

**L4 pitfalls:** the LB as a single box (SPOF); autoscaling "solves" spikes without acknowledging scaling lag;
sticky sessions everywhere; naive per-node rate limiting (Nx the limit) or a racy shared counter; retries with no
backoff/jitter/budget; unbounded queues that hide overload; confusing liveness/readiness or shallow health checks;
no load-shedding/degradation plan (congestion collapse); running near 100% utilization with no headroom; picking
L4/L7 or an algorithm with no justification; long-lived multiplexed gRPC/WebSocket connections pinning to one
backend and defeating L7 balancing; and global-only thinking with no cell/shard fault isolation.

---

## Brief 6 — Distributed systems core (L5)

This is the theory layer that every earlier decision descends from: **nodes and networks fail independently, and
you cannot tell slow from dead.**

### The system model, CAP, and PACELC

Start from partial failure and the fallacies of distributed computing (the network is reliable, latency is zero,
topology is static…). A **timeout is ambiguous** — request lost, response lost, or peer slow — so everything must
handle retries, reordering, duplication, and stale reads. **CAP is the most-misunderstood result**: the choice
between C and A binds *only during a partition* (P is non-negotiable), "CA" is not a real operating point, and
"consistency" here means linearizability. Real systems are tunable/mixed, not globally CP or AP. **PACELC** is the
2025-2026 expected framing because it captures the steady-state tax: *else* (no partition) you still trade
latency vs consistency. Classify stores on it — PA/EL (DynamoDB, Cassandra), PC/EC (Spanner, CockroachDB) — and
tie latency budgets to consistency SLOs (Kleppmann, *DDIA* chs. 5, 8-9; [Jepsen analyses](https://jepsen.io/analyses)).

### The consistency spectrum and clocks

Consistency is a spectrum, not a boolean: **linearizable → sequential → causal → eventual**, with a cost ladder
(stronger models need more coordination). Do not conflate replication consistency (linearizability) with ACID
isolation levels (serializable/snapshot) — different axes. Most user-facing "vanished data" bugs are **session-
guarantee** violations (read-your-writes, monotonic reads/writes, writes-follow-reads), fixable with sticky
routing or version tokens. Ordering without a shared clock needs **logical time**: Lamport clocks give a total
order but *cannot detect concurrency* (a < b in Lamport does not mean a caused b — a classic confusion); **vector
clocks / version vectors** capture causality and detect concurrent conflicting writes (Dynamo-style siblings) at
O(N) size cost. Physical clocks drift tens of ms, so **wall-clock last-writer-wins silently loses data**; the
modern answers are **Hybrid Logical Clocks** (CockroachDB, MongoDB clusterTime, YugabyteDB) and Google's
**TrueTime** (GPS + atomic clocks, commit-wait over the uncertainty interval for external consistency in Spanner).

### Consensus, quorums, and transactions

Recognize that "all replicas apply the same ops in the same order" *is* consensus (state-machine replication over
an ordered log). **Raft is the industry default** (etcd, Consul, TiKV, CockroachDB, **Kafka KRaft**) — leader
election via randomized timeouts + terms, log replication committed at a majority quorum, and safety properties
you should be able to name; a 3-node cluster tolerates 1 failure, 5 tolerates 2, and even-sized clusters waste a
node. **Paxos** (Multi-Paxos, Flexible Paxos, EPaxos) still underpins Spanner and Chubby; **FLP** says no
deterministic async consensus tolerates even one crash, solved in practice via partial synchrony + randomized
timeouts. Quorums (`N/R/W`, `R + W > N`) are the concrete dial mapping to durability/consistency/latency —
but `R + W > N` gives overlap, **not** linearizability (a common false claim).

For **distributed transactions**: 2PC is fine within one cluster but its coordinator-crash-after-prepare blocking
problem and held locks make it a poor fit across microservices; the modern answer is the **saga**
(orchestration vs choreography, compensating actions) which gives atomicity-of-outcome but **not isolation** —
intermediate states are visible, so you need semantic locks and idempotent compensations. Reliable event
publishing uses the **outbox pattern + CDC**; delivery is **at-least-once + idempotency/dedup = effectively-once**
(true network exactly-once is impossible), with **fencing tokens** to reject stale delayed operations. **CRDTs**
(G/PN-Counter, OR-Set, LWW-Register, RGA/sequence) give strong eventual consistency for collaborative/offline-first
apps (Figma, Yjs, Automerge, Redis) where operations are commutative/associative/idempotent.

### Failure detection, leadership, and partitions

You can't recover from what you can't detect: **heartbeats vs adaptive phi-accrual** (Cassandra) vs **SWIM/gossip**
(Consul, memberlist) for large fleets, tuned against the completeness-vs-accuracy (flapping-vs-slow) trade-off —
and no detector is perfect under asynchrony. **Leader election + leases need fencing tokens**: a GC pause or
network delay can make a live leader look dead, so two leaders briefly coexist, and storage must reject a stale
token (the canonical **Redlock critique**). On a **partition**, the majority side stays writable (CP) or both
sides accept and reconcile (AP); witness/quorum nodes avoid even-cluster deadlock; and **gray/asymmetric
partitions** are harder than clean splits — which is why **Jepsen** is the cultural reference for validating
consistency claims. **BFT** (3f+1 nodes, PBFT/Tendermint/HotStuff) is only needed across trust boundaries;
internal datacenter systems use crash-fault consensus.

**Modern L5 additions:** durable-execution engines (**Temporal, AWS Step Functions, Restate, DBOS**) as the
mainstream saga/orchestration substrate; **Kafka KRaft** replacing ZooKeeper; HLCs as the default in new
distributed SQL; NewSQL collapsing "strong consistency OR scale"; effectively-once framing; local-first/CRDT
libraries; consistency as an explicit API knob (DynamoDB strong-vs-eventual, Cosmos DB's five levels); gray
failures; Jepsen; cell-based blast-radius isolation; the fencing-token/Redlock critique; and PACELC over CAP.

**L5 pitfalls:** CAP as permanent "pick 2 of 3" or calling a single-node system "CA"; consistency as binary;
conflating replication consistency with ACID isolation; assuming `R + W > N` gives linearizability; claiming
"exactly-once delivery"; wall-clock LWW ignoring skew; 2PC across microservices without the blocking problem; a
saga ignoring lost isolation and non-idempotent compensations; a distributed lock without fencing; reinventing
consensus and getting split-brain wrong; tuning timeouts as if failure detection were exact; forgetting
anti-entropy; even-sized clusters; read-your-writes off async replicas; BFT where crash-fault suffices; Lamport
total-order confused with causality; and no stated fault budget.

---

## Brief 7 — Asynchronous & event-driven systems (L6)

Going async **decouples in time (buffering), space (location), and synchronization (non-blocking)** and absorbs
spikes — but you trade immediate consistency for eventual, and the failure mode shifts from synchronous errors
the caller sees to background failures needing retries, DLQs, and monitoring. Don't add a broker for simple CRUD
or low-latency request/response.

### The three messaging models and Kafka internals

- **Queue** (SQS/RabbitMQ) — competing consumers, message removed on ack, work distribution.
- **Pub/sub** (SNS, fan-out) — each subscriber gets its own copy.
- **Log/stream** (Kafka, Kinesis, Pulsar) — durable ordered append-only log, offset-based, replayable by many
  independent consumer groups.

The retention difference is the crux: queues delete on consume; logs retain by time/size and support replay. Kafka
is the default interview substrate: a **topic is a partitioned append-only log; the partition is the unit of
ordering and parallelism; the offset is a per-partition sequence.** Durability comes from replication with **ISR
(in-sync replicas), `acks=all`, and `min.insync.replicas`**; throughput from sequential disk writes, zero-copy,
page cache, and producer batching/compression. **Ordering holds only within a partition**, so causally related
events must share a key — and that key choice creates the hot-partition/celebrity problem. Consumer groups cap
parallelism at the partition count; **consumer lag is the primary health/scaling signal**; and rebalances cause
latency/duplicate spikes, mitigated by cooperative/incremental rebalancing and static membership.

### Delivery semantics, idempotency, and the dual-write problem

State your guarantee precisely: **at-most-once** (may lose) / **at-least-once** (may duplicate — the practical
default) / **exactly-once** (hard). "Exactly-once *delivery*" over a network is impossible (two-generals); what
exists is exactly-once *processing* via idempotency or transactions. **Kafka EOS** (idempotent producer +
transactions) is scoped to read-process-write *within Kafka* and does not extend to external side effects
(emails, third-party charges) — those need **idempotency keys** (client/event id + dedup store with atomic
check-and-set, TTL sized to the retention window, and a unique constraint to resolve concurrent duplicates). The
**dual-write problem** (DB commit but publish fails → lost event; publish succeeds but DB rolls back → phantom
event) is fixed by the **transactional outbox** relayed by polling or **CDC (Debezium reading the WAL/binlog)**,
plus an inbox/dedup table for idempotent consumption. Failed messages need **retries (backoff + jitter, capped)**,
a **dead-letter queue**, and poison-pill handling so one bad message doesn't block a partition (head-of-line
blocking), with **backpressure** from the durable log acting as the bounded buffer.

### Schema, stream processing, event sourcing, and CQRS

Long-lived streams are a **public contract**, so use a **schema registry** (Confluent, Karapace) with Avro/
Protobuf and backward/forward compatibility rules (add fields with defaults; never renumber). **Stream processing**
(Flink for advanced state/CEP and exactly-once via distributed checkpoints; Kafka Streams as an embedded library;
Spark Structured Streaming as micro-batch; Flink SQL/ksqlDB as the accessible interface) handles **event-time vs
processing-time, watermarks for lateness, and windowing (tumbling/sliding/session)** with fault-tolerant local
state (RocksDB + changelog). **Event sourcing** stores state as an immutable event log (audit, replay, temporal
queries, snapshots to bound replay, optimistic concurrency on aggregate version) and pairs naturally with
**CQRS** (separate denormalized read projections updated from events, eventual consistency between write and read
sides) — but neither should be adopted everywhere by default. Cross-service business transactions use the **saga**
(orchestration vs choreography; compensations as semantic undo; **Temporal / Step Functions** as the modern
durable-orchestration substrate). Real-time client fan-out (feeds, notifications, presence) chooses among
**WebSocket / SSE / long-poll / mobile push (APNs/FCM)** with fan-out-on-write vs -on-read and a pub/sub backplane.
Broker selection should be justified: **Kafka/Pulsar/Kinesis** (log, replay, ordering) vs **RabbitMQ/SQS** (queue,
per-message ack, DLQ) vs **SNS/Pub/Sub** (managed fan-out), not "reach for Kafka reflexively."

**Modern L6 additions:** **Kafka 4.0 / KRaft** (ZooKeeper removed); **KIP-848** broker-driven rebalance (no more
stop-the-world); **Kafka queues / share groups (KIP-932)**; **tiered storage** decoupling retention cost from
broker disk; Flink SQL/ksqlDB; durable execution (Temporal/Restate); CDC-first with Debezium 2.x; object-storage-
native brokers (**WarpStream, AutoMQ, Confluent Freight**); data contracts + event catalogs (AsyncAPI);
effectively-once framing; local-first/CRDTs; streaming lakehouse (Kafka → Iceberg/Tableflow); the **claim-check /
zero-payload** pattern; event-driven LLM/agent pipelines; and backpressure-aware autoscaling (KEDA on lag).

**L6 pitfalls:** claiming "exactly-once delivery"; reaching for Kafka when SQS/RabbitMQ (or no broker) fits;
assuming global ordering (Kafka is per-partition); ignoring the dual-write problem; non-idempotent consumers under
at-least-once; no DLQ/poison-message strategy; under/over-partitioning; committing offsets before processing
completes; treating event schemas as private/mutable; adopting event sourcing/CQRS by default; no backpressure/lag
story; missing observability across async hops; confusing event notification vs event-carried state transfer; and
compensating-transaction hand-waving.

---

## Brief 8 — Reliability, resilience & operations (L7)

Operational maturity is now a graded phase, and its vocabulary is **SLO/error-budget** (from the Google SRE Book
and Workbook).

### Availability math and the SLO hierarchy

Translate the "nines" into a downtime budget (99.9% ≈ 43.8 min/month, 99.99% ≈ 4.4 min/month), remember **serial
dependencies multiply** (more hops → lower ceiling) while redundancy combines as `1 − (1−a)ⁿ`, and each added nine
costs ~10x more — so **match the target to revenue impact, not vanity.** An **SLI** is good/valid events, an
**SLO** is a target + window, an **SLA** is an externally promised SLO with penalties; pick few SLIs from the
user's perspective using percentiles, not averages. The **error budget = 1 − SLO** is permission to fail that
much and should be *spent, not hoarded*; an **error-budget policy** pre-agrees the consequence (budget exhausted →
freeze feature releases, redirect to reliability work). Alert on **how fast you're burning** with **multi-window,
multi-burn-rate** rules (a fast 14.4x/1h burn pages; a slow 3x/6h opens a ticket), and alert on **symptoms
(SLO burn), not causes (CPU high)** — the Google SRE Workbook approach.

### Observability, resilience, and overload

The **three pillars** (metrics cheap/aggregate, logs detailed, traces causal-path) with **OpenTelemetry** as the
now-standard vendor-neutral instrumentation layer, distributed tracing via propagated context, the **four golden
signals** (latency, traffic, errors, saturation), and **RED/USE**. The resilience primitives from L1/L4 recur —
**timeouts with deadline propagation, retries with backoff + jitter + budgets, circuit breakers, bulkheads,
fallbacks** — plus **graceful degradation and load shedding** (maximize *goodput*, drop low-value work early with
429/503 + `Retry-After`, adaptive/LIFO/CoDel queues that drop stale work). Watch for **metastable failures**: a
trigger pushes the system into a self-sustaining bad state (retries + full queues + timeouts) that persists after
the trigger clears, requiring load shedding to break — not just more capacity.

### Redundancy, DR, and blast-radius

Eliminate SPOFs with N+1/N+2 redundancy, active-active vs active-passive, and liveness/readiness/deep health
checks with failover automation that avoids flapping and split-brain (quorum/leader election). **DR** is framed by
**RTO** (max downtime) and **RPO** (max data loss) across a strategy ladder — backup & restore → pilot light →
warm standby → multi-site active/active — with **tested, immutable/air-gapped backups** and regular restore/
region-evacuation drills (an untested DR plan is not a DR plan; tier RTO/RPO by scenario — ransomware vs region
loss vs corruption differ). **Multi-region/AZ** trades synchronous (low RPO, latency cost) vs async replication,
GeoDNS/anycast steering, and cross-region conflict resolution, with **cell-based architecture + shuffle sharding**
and **static stability** (keep serving from cached/last-known state when the control plane is down) as the modern
blast-radius controls.

### Safe delivery, chaos, and incidents

Most deploy outages are really **schema/contract-migration failures**, so use **expand/contract (parallel change):
add new → dual-write/backfill → migrate reads → remove old**, keeping old and new code forward/backward compatible,
with online schema-change tooling (gh-ost, pt-osc). Ship with **rolling / blue-green / canary** plus **feature
flags** (decouple deploy from release, dark-launch, instant kill-switch), and **automated metric-driven canary
analysis + auto-rollback** (Argo Rollouts, Flagger). Prove resilience with **chaos engineering**: steady-state
hypothesis → inject a real fault (latency, error, instance/AZ kill, dependency loss) → minimize blast radius →
measure → learn, with automatic abort tied to the error budget, run in production with guardrails (AWS FIS,
Gremlin, Chaos Mesh, LitmusChaos). Operate with **incident management** (SEV levels, Incident Commander / Comms /
Scribe, mitigate before root-cause, MTTD/MTTA/MTTR) and **blameless postmortems** (systems not individuals; "human
error" is never a root cause), and reduce **toil** (manual, repetitive, automatable work) toward self-healing.

**Modern L7 additions:** OpenTelemetry as default; multi-window multi-burn-rate alerting; cell-based + shuffle
sharding; static stability; metastable failures as a formal class; SLO-driven automated canary analysis + auto-
rollback; chaos tied to error budgets; managed fault injection; GitOps + progressive delivery (Argo CD/Rollouts,
Flux); eBPF observability/profiling (Pixie, Parca); platform engineering / golden paths; service mesh out-of-app
resilience; AIOps (with skepticism); observability cost governance (cardinality control, tail-based sampling);
production-readiness reviews; **reliability of AI/LLM systems** (fallback models, provider failover, token/latency
budgets); and tiered scenario-specific RTO/RPO.

**L7 pitfalls:** five-nines everywhere / hoarding the error budget; averages instead of percentiles; retries with
no backoff/jitter/budget; missing or over-long timeouts; alerting on causes not symptoms; confusing liveness/
readiness or shallow health checks; untested backups/DR; assuming multi-region gives free strong consistency;
flapping failover / split-brain; chaos with no hypothesis/blast-radius/abort; destructive single-deploy schema
changes; rolling back code but not the migration; feature-flag debt; blameful postmortems; promising availability
above your hard dependencies' SLA; unbounded queues; cache as an unacknowledged SPOF (no stale-serving/stampede
protection); autoscaling the app tier but not the real bottleneck (DB connections); and vanity dashboards nobody
watches.

---

## Brief 9 — Security & multi-tenancy (L8), modern architecture (L9), and the specialized 2023-2026 systems (L11)

### Security, privacy & multi-tenancy (L8)

Every system answers "who is this?" before anything else, and **credential storage is the most common
catastrophic failure**: hash passwords with a memory-hard KDF (**argon2id / scrypt / bcrypt**), never a fast hash,
with per-user salt. The big 2024-2026 shift is **passkeys / WebAuthn / FIDO2** — a public-key credential where the
private key never leaves the authenticator, making the server breach-proof and the login phishing-resistant
(origin-bound), displacing SMS OTP. **OAuth 2.1 / OIDC** is the delegated-authz + federated-identity backbone,
and its baseline changed: **Authorization Code + PKCE is mandatory for all clients; implicit and password (ROPC)
grants are removed; exact redirect-URI matching** — with **DPoP / mTLS sender-constrained tokens** replacing plain
bearer tokens for high-security APIs. Sessions balance stateless JWTs (revocation cost) vs opaque sessions, using
short-TTL access tokens + **refresh-token rotation with reuse detection**, secure cookie flags, and the **BFF
pattern to keep tokens out of the browser** (localStorage is XSS-exposed).

**Authorization** spans RBAC → ABAC → **ReBAC / Google Zanzibar** (object-relation-user tuples; OpenFGA, SpiceDB/
AuthZed, AWS Cedar) with a PDP/PEP split, enforced at every object (deny by default, least privilege) to avoid
**IDOR/BOLA** (OWASP API #1). **Multi-tenancy** lives or dies on isolation: **Silo vs Pool vs Bridge** (dedicated
infra vs shared schema vs shared DB/separate schema), tenant context resolved on every request, and **Postgres
Row-Level Security** as the de facto pool-model control — watching the non-obvious leakage vectors (shared caches,
search indexes, background jobs, log aggregation, predictable IDs). **Encryption** spans TLS 1.3 + mTLS in transit
and **envelope encryption** at rest (a DEK encrypts data, a KEK in KMS/HSM wraps the DEK, per-tenant/per-record
DEKs), with **crypto-shredding** (delete the key) as the practical GDPR-erasure mechanism, and dedicated **secrets
management** (Vault, cloud KMS) with rotation and **workload identity (SPIFFE/SPIRE, OIDC federation)** to solve
the "secret zero" problem. Public systems layer **DDoS defense** (L3/L4 volumetric via anycast/scrubbing/CDN vs
L7 application floods via WAF/behavioral limits; **HTTP/2 Rapid Reset**), **bot/fraud/ATO defense** (credential-
stuffing checks, device fingerprinting, risk-based step-up), **threat modeling (STRIDE)**, **zero-trust**, and
**compliance** (GDPR/CCPA, SOC 2, HIPAA, PCI-DSS — reduce PCI scope via tokenization), **PII governance** (DSAR/
erasure across *all* stores including backups/indexes/lakes), privacy engineering (anonymization vs
pseudonymization vs tokenization, differential privacy), **tamper-evident audit logging**, OWASP API hardening,
and **software supply-chain** security (SBOM, SLSA provenance, Sigstore/cosign, workload identity).

*L8 pitfalls:* conflating authn with authz or gating authz once instead of per-object (IDOR/BOLA); JWTs everywhere
with no revocation; rolling your own crypto or fast password hashes; tokens in localStorage / secrets in source;
bolting security on at the end; forgetting tenant-leakage vectors; ignoring the rate-limiter/authz fail-open-vs-
closed SPOF; claiming GDPR erasure while ignoring backups/replicas/caches; "encrypted at rest" with the key next
to the data; PII in logs; over- or under-isolating tenants; naming "OAuth" without a grant (or defaulting to the
removed implicit flow); treating DDoS as one problem; confusing anonymization with pseudonymization; SMS-OTP MFA
without acknowledging SIM-swap; and no plan for the after (rotation, revocation, breach notification).

### Modern architecture & delivery (L9)

The most-tested architecture trade-off is **monolith vs modular monolith vs microservices**, and the 2024-2026
mood has swung back toward **starting monolithic** — Amazon Prime Video, Segment, and Istio all re-consolidated,
~42% of orgs are actively consolidating services, and service-mesh adoption is declining. **Default to a modular
monolith**; microservices are a destination whose *extraction triggers* are org-scaling (Conway's Law / team
autonomy), independent deploy cadence, divergent scaling profiles, and fault isolation — **not code size** — and
the failure mode is the **distributed monolith** (services that share a DB or must deploy together, giving the
costs of both). Draw boundaries by **bounded context** (DDD) with database-per-service, use the **Strangler Fig**
for incremental extraction, and communicate via sync (gRPC/REST) for reads and async (events) for decoupling, with
**sagas** for cross-service consistency. **Containers + Kubernetes** are the assumed substrate (immutable images,
Deployments/StatefulSets, requests/limits, liveness/readiness probes, HPA/VPA/Karpenter, **KEDA** event-driven
scaling), with the **sidecarless / ambient / eBPF** service-mesh shift (Istio Ambient GA 2025, Cilium) and the
**Kubernetes Gateway API** superseding Ingress. **Serverless/FaaS** fits spiky/event-driven work (with cold starts,
execution limits, and a cost model that inverts at high steady load), and **edge compute** (Cloudflare Workers'
V8 isolates < 5 ms cold start, WASM/WASI, SpinKube) delivers global low latency with eventually-consistent edge
data. **Cost/FinOps** is now a first-class design axis (Inform/Optimize/Operate; spot/reserved; **OpenCost/
Kubecost** allocation; percentile rightsizing; egress; and 2025-26's top concern, **AI/GPU spend**). On the data
side, respect the **OLTP vs OLAP** split, the **warehouse vs lake vs lakehouse** progression (medallion bronze/
silver/gold; separation of storage and compute), **open table formats (Iceberg, Delta, Hudi, Paimon)** with open
catalogs (Polaris, Unity), **CDC + outbox** for sync, and **batch vs streaming (Lambda vs Kappa)** converging via
Flink → Iceberg. Delivery uses **IaC (Terraform/OpenTofu), GitOps (Argo CD / Flux), progressive delivery, and
OpenTelemetry.**

*L9 pitfalls:* defaulting to microservices for small/greenfield systems; the distributed monolith; hand-waving
cross-service consistency; Kubernetes as a magic scaling button; adding a mesh/gateway/Kafka reflexively;
forgetting serverless cold starts and cost-inversion; ignoring cost / unable to explain a K8s bill; analytics on
the OLTP primary; the dual-write problem; confusing a queue with a log; no observability/SLO story; skipping
multi-region/DR specifics; ignoring Conway's Law; and the data-swamp (a lake with no catalog/governance).

### Specialized 2023-2026 systems: ML & GenAI infra (L11)

This band is the newest and the one candidates who only prep the classic web-scale set are caught off guard by.

- **End-to-end ML systems** wire data → features → training → serving → feedback into one loop: a **two-plane
  architecture** (offline training vs low-latency online serving), a candidate-generation → ranking → re-ranking
  **funnel** to keep heavy models off the hot path, a model registry with **shadow/canary/A-B rollout**, and
  monitoring for **data/concept/prediction drift** — with a fallback to a simpler/cached model when the model
  service is down.
- **Feature stores** solve the single most-probed ML-infra topic: **training/serving skew** and **point-in-time
  correctness** (join features as-of the event timestamp to avoid label leakage), via a dual offline (Parquet/
  warehouse) + online (Redis/DynamoDB) store sharing one feature definition.
- **Real-time recommendation** exercises the full **retrieval (two-tower + ANN) → ranking → re-ranking →
  business-rules** funnel with streaming session features, cold-start and exploration/exploitation (bandits),
  multi-task objectives, and offline-replay + online A/B evaluation — shifting toward **sequence/transformer-based
  and generative recommendation** (semantic IDs).
- **RAG** is the default GenAI design: ingestion (chunking, metadata, incremental re-indexing) → **hybrid
  retrieval (dense + BM25) + cross-encoder reranker** → context assembly with citations, evaluated by the **RAG
  triad (context relevance, faithfulness/groundedness, answer relevance)** (Ragas-style) and enforcing
  **document-level access control at retrieval time**, with advanced patterns (query rewriting, GraphRAG, agentic/
  self-corrective CRAG).
- **Vector databases & ANN** — **HNSW** (graph, high recall, RAM-heavy) vs **IVF/IVF-PQ** (quantized, memory-
  efficient) vs **DiskANN** (SSD-scale), tuning recall vs latency vs memory, filtered/hybrid search, and build-vs-
  buy (**Pinecone/Weaviate/Qdrant/Milvus vs pgvector vs OpenSearch**) — with a re-embedding migration plan when the
  model changes.
- **Model gateway / LLM router** is the control plane for cost, reliability, and safety across providers: unified
  API + failover, per-tenant rate limiting / token budgets / model routing, **exact + semantic caching**, retries/
  circuit breakers/streaming passthrough, and prompt-injection/PII guardrails with usage metering/chargeback.
- **LLM inference serving** turns on GPU economics: the **KV cache and PagedAttention** (vLLM), **continuous/
  in-flight batching**, prefill/decode disaggregation, the latency metrics that matter (**TTFT vs inter-token vs
  total**), quantization (INT8/FP8/AWQ/GPTQ), tensor/pipeline parallelism, **prefix caching** for shared system
  prompts, and speculative decoding — served K8s-native (KServe, llm-d).
- **LLM agents & orchestration** — a bounded planner/tool-calling loop (step/cost/time caps), sandboxed tool
  execution, short- and long-term memory, idempotency for side-effecting tools, human-in-the-loop gates, and
  guardrails against prompt injection propagating through tool outputs.
- Plus **streaming/real-time analytics** (Kafka/Flink + real-time OLAP ClickHouse/Druid/Pinot; HyperLogLog/
  Count-Min/t-digest), **globally consistent multi-region data** (Spanner TrueTime, CRDTs, geo-partitioning),
  **IoT/edge ingestion** (MQTT, device shadow/digital twin, edge filtering, OTA), **time-series storage**
  (cardinality control, downsampling, tiering), **LLM/ML evaluation & guardrails** (golden sets, LLM-as-judge,
  online canary), and the **fine-tuning vs RAG vs prompting** decision (PEFT/LoRA, the data flywheel, distillation
  to small models).

*L11 pitfalls:* choosing a model before clarifying the business metric/label; ignoring training/serving skew and
point-in-time correctness; RAG as "embed + top-k + prompt" with no reranker/chunking/eval/freshness; assuming
vector search is exact/free; hand-waving LLM serving cost (no KV cache/batching/TTFT); no eval/guardrail story;
forgetting document-level authorization in RAG; claiming global strong consistency at low latency; LWW without
acknowledging lost updates; IoT ingest as if devices are always online; time-series ignoring tag-cardinality
explosion; unbounded multi-agent loops; no fallback when the model/GPU is down; over-engineering (a dedicated
vector DB / agent swarm / global DB when pgvector / one model / one region suffices); and missing the feedback/
logging loop needed to retrain and detect drift.

---

## Brief 10 — The canon of applied "design X" case studies (L10)

L10 is where the taxonomy is exercised. The meta-skill it scores across every prompt is the framework itself —
**requirements → API → data model → high-level design → deep dives → bottlenecks** — plus explicit CAP/PACELC
reasoning, SPOF analysis, and articulating trade-offs out loud. The canonical set, grouped by what each primarily
tests:

| Group | Case studies | Primarily tests |
|---|---|---|
| **KV & warm-ups** | URL shortener (TinyURL), Pastebin, rate limiter, unique-ID generator (Snowflake/ULID), distributed cache (Redis), typeahead/autocomplete | Estimation, KV storage, ID generation, caching, read/write ratios, algorithm choice |
| **Feeds & social** | Twitter/news feed & timeline, Instagram, Facebook ranked newsfeed, Reddit threaded comments, People You May Know | Fan-out-on-write vs -read, the celebrity/hot-key problem, ranking, graph traversal |
| **Real-time comms** | WhatsApp/Messenger, Slack/Discord, notification/push system, live streaming + chat (Twitch), collaborative editor (Google Docs/Figma) | WebSocket/SSE connection management, ordering, delivery/read receipts, presence, OT vs CRDT |
| **Geo & matching** | Uber/Lyft (matching + dispatch), Yelp/Nearby (geo search), Google Maps ETA/routing | Geospatial indexing (geohash/quadtree/S2/H3), moving-object updates, road-graph routing |
| **Media & files** | Dropbox/Google Drive (sync), YouTube/Netflix (VOD + transcoding + CDN), Gmail (mail + search + spam) | Chunking/dedup/delta sync, transcoding pipelines, adaptive bitrate, CDN economics |
| **Storage internals** | Distributed KV store (DynamoDB), Cassandra (wide-column), Amazon S3 (object store), message queue/Kafka | Consistent hashing, quorums, vector clocks, LSM/SSTable, erasure coding, the distributed log |
| **Correctness-critical** | Payment/wallet ledger, Ticketmaster/flash-sale inventory, distributed job scheduler/cron, distributed lock (ZooKeeper/etcd), stock-exchange matching engine | Idempotency, double-entry accounting, overselling under contention, exactly-once firing, consensus, microsecond determinism |
| **Search & crawl** | Web crawler, Google Search (index + rank), full-text search (Twitter Search) | Crawl politeness, inverted index, sharded scoring, near-real-time indexing |
| **Analytics & counting** | Metrics/monitoring (Datadog/Prometheus), ad click aggregator, distributed counter/leaderboard/top-K | High-cardinality ingestion, TSDB rollups, streaming windows, approximate structures |
| **ML/GenAI (modern)** | Recommendation (Netflix/TikTok two-tower), Google Ads auction, RAG chatbot/enterprise search, LLM serving platform, code-execution sandbox (LeetCode), CI/CD + feature flags | Retrieval + ranking funnels, real-time auctions, grounding/citations, GPU scheduling, secure multi-tenant execution, safe rollout |

The load-bearing modern shift is that **GenAI designs are first-class** (RAG, LLM serving, model gateways,
semantic search, agents), **evaluation methodology is itself system design** (offline + online eval, the RAG
triad, recall@k, nDCG), and **cost is a scored non-functional requirement** ($/token, egress, GPU) alongside
latency and throughput.

*L10 pitfalls* (the ones that fail otherwise-correct answers): jumping to boxes before requirements/estimation;
not driving the conversation (the biggest signal gap); hand-waving numbers; ignoring the read:write ratio;
buzzword architecture ("use NoSQL / add a cache / use Kafka") with no justification; missing the hot-key/
celebrity/thundering-herd problem; not stating a consistency model; ignoring idempotency in payments/schedulers/
queues; happy-path-only designs; no SPOF analysis; over-engineering for scale that wasn't required (or not
addressing 10-100x growth); skipping the data model and API contract; for ML/LLM, ignoring training/serving skew,
cold-start, evaluation, and cost; poor time management; and applying the wrong pattern to look-alike problems
(Uber matching vs Yelp geo-search, OT vs CRDT).

---

### Cross-checked against

- **Interview method & canon:** Alex Xu, *System Design Interview* Vol. 1 & 2 and [ByteByteGo](https://bytebytego.com/); [Hello Interview — System Design](https://www.hellointerview.com/learn/system-design) (delivery framework, estimation, evaluation rubric); the [system-design-primer](https://github.com/donnemartin/system-design-primer); [Grokking the System Design Interview](https://www.designgurus.io/course/grokking-the-system-design-interview) (Educative/DesignGurus).
- **Data-intensive foundations:** Martin Kleppmann, *Designing Data-Intensive Applications* (replication ch. 5, partitioning ch. 6, transactions ch. 7, distributed troubles ch. 8, consistency & consensus ch. 9); Jeff Dean, ["Numbers Everyone Should Know"](https://static.googleusercontent.com/media/research.google.com/en//people/jeff/stanford-295-talk.pdf).
- **Reliability & operations:** [Google SRE Book and SRE Workbook](https://sre.google/books/) (SLI/SLO/error budgets, multi-burn-rate alerting, golden signals); [AWS Builders' Library](https://aws.amazon.com/builders-library/) (timeouts & retries, load shedding, shuffle sharding, static stability); [OpenTelemetry docs](https://opentelemetry.io/docs/).
- **Distributed systems:** the [Raft paper](https://raft.github.io/raft.pdf) (Ongaro & Ousterhout); Google [Spanner](https://research.google/pubs/pub39966/) (TrueTime); [Jepsen analyses](https://jepsen.io/analyses); Martin Kleppmann, ["How to do distributed locking"](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html) (the Redlock/fencing critique); the [Kafka KRaft (KIP-500)](https://cwiki.apache.org/confluence/display/KAFKA/KIP-500) and consumer-rebalance (KIP-848) proposals.
- **Async & event-driven:** [Confluent / Apache Kafka docs](https://kafka.apache.org/documentation/); [Debezium](https://debezium.io/documentation/); Chris Richardson, [microservices.io patterns](https://microservices.io/patterns/) (saga, outbox, CQRS); [Apache Flink docs](https://nightlies.apache.org/flink/flink-docs-stable/) (event time, watermarks, exactly-once).
- **Architecture & delivery:** Martin Fowler on [MonolithFirst](https://martinfowler.com/bliki/MonolithFirst.html) and [bounded context](https://martinfowler.com/bliki/BoundedContext.html); [Kubernetes](https://kubernetes.io/docs/) and [KEDA](https://keda.sh/) docs; [Istio Ambient](https://istio.io/latest/docs/ambient/) and [Cilium](https://cilium.io/) mesh; [FinOps Foundation](https://www.finops.org/) and [OpenCost](https://www.opencost.io/); [Databricks lakehouse](https://www.databricks.com/glossary/data-lakehouse) and [Apache Iceberg](https://iceberg.apache.org/).
- **Security & privacy:** [OWASP API Security Top 10](https://owasp.org/API-Security/); [WebAuthn/FIDO2](https://www.w3.org/TR/webauthn-2/) and [passkeys.dev](https://passkeys.dev/); the [OAuth 2.1 draft](https://oauth.net/2.1/); Google [Zanzibar](https://research.google/pubs/pub48190/) (and [OpenFGA](https://openfga.dev/) / [SpiceDB](https://authzed.com/)); [SPIFFE/SPIRE](https://spiffe.io/); [SLSA](https://slsa.dev/) and [Sigstore](https://www.sigstore.dev/).
- **ML/GenAI infra:** Chip Huyen, *Designing Machine Learning Systems*; the [vLLM / PagedAttention](https://blog.vllm.ai/2023/06/20/vllm.html) work; [HNSW](https://arxiv.org/abs/1603.09320) and [DiskANN](https://suhasjs.github.io/files/diskann_neurips19.pdf) ANN papers; [Ragas](https://docs.ragas.io/) (RAG triad evaluation); vendor docs for [Pinecone](https://docs.pinecone.io/), [Weaviate](https://weaviate.io/developers/weaviate), and [pgvector](https://github.com/pgvector/pgvector).
