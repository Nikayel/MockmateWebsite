# Chief of Staff Notes: canonical glossary + per-level directives

These notes ride on top of `sd-fix-brief.md`. Where they conflict, these win.

## Canonical glossary (use these link targets; adapt gloss wording to context, keep the meaning)

The same terms were flagged across many levels. So that twelve developers do not write twelve different CDN definitions, the FIRST gloss of any term below uses roughly this plain-words meaning and ALWAYS this link target. Base URL pattern: `/learn/system-design/<slug>/<id>`.

| Term | Plain-words gloss (adapt freely, keep meaning) | Canonical link target |
|---|---|---|
| QPS | queries per second, how many requests arrive each second | `interview-method/sd-l0-qps-read-write` |
| back-of-envelope / Fermi | rough math with round numbers to size a system | `interview-method/sd-l0-fermi-estimation` |
| DNS | the internet's phone book, turns a name like example.com into a server address | `foundations/sd-l1-dns` |
| TTL | time to live, how long a saved answer may be reused before re-asking | gloss inline; no dedicated lesson |
| load balancer | a traffic cop that spreads incoming requests across many identical servers | `foundations/sd-l1-load-balancing` |
| reverse proxy / API gateway | a front door server that receives every request and forwards it inside | `foundations/sd-l1-reverse-proxy-gateway` (gateway detail: `scaling-compute/sd-l4-api-gateway-bff`) |
| CDN | content delivery network, computers around the world keeping copies of your files close to users | `foundations/sd-l1-cdn-caching-foundations` (at-scale: `scaling-data/sd-l3-cdn-scale`) |
| cache / caching | keeping a ready copy of hot data somewhere fast so you skip the slow trip | `foundations/sd-l1-cdn-caching-foundations` (patterns: `scaling-data/sd-l3-caching-patterns`) |
| p50 / p99 / percentiles | line up all response times slow to fast; p99 is the time the slowest 1 percent exceed | `foundations/sd-l1-latency-percentiles` |
| idempotency | safe to repeat: doing it twice leaves the same result as once | `foundations/sd-l1-idempotency-retries` |
| ACID / transaction | a batch of changes that lands all-or-nothing | `data-storage/sd-l2-relational-acid` |
| WAL / write-ahead log | the database's diary: changes are written to an append-only file first so a crash loses nothing | `data-storage/sd-l2-physical-storage-wal` |
| OLTP | online transaction processing, many small live reads and writes from users | gloss inline early; lesson: `modern-architecture/sd-l9-oltp-vs-olap` |
| shard / partition (data) | splitting data across servers, each holding one slice | `scaling-data/sd-l3-partitioning-strategies` |
| replica / replication | keeping full copies of the data on several servers | `scaling-data/sd-l3-read-replicas` |
| consistent hashing | a trick for assigning keys to servers so adding one moves little data | `scaling-data/sd-l3-consistent-hashing` |
| fan-out (on write) | doing delivery work at post time, writing into every follower's feed so reads stay cheap | `scaling-data/sd-l3-denorm-fanout` |
| CDC | change data capture, tailing the database's own change log to feed other systems | `scaling-data/sd-l3-cdc-dual-write` |
| rate limiting | counting requests per caller and refusing past a budget | `scaling-compute/sd-l4-rate-limit-algorithms` |
| eventual consistency | copies may briefly disagree; wait and they converge | `distributed-core/sd-l5-consistency-spectrum` |
| CAP | when the network splits, each piece either keeps answering (availability) or refuses rather than risk being wrong (consistency) | `distributed-core/sd-l5-cap-correct` |
| PACELC | CAP plus: even with no failure you trade latency vs consistency | `distributed-core/sd-l5-pacelc` |
| quorum | requiring a majority of copies to agree before an answer counts | `distributed-core/sd-l5-quorums-tunable` |
| consensus / Raft / Paxos | an algorithm servers use to agree on one value even when some crash | `distributed-core/sd-l5-raft-paxos` |
| queue / pub-sub | a waiting line for work between services, so the sender never waits for the receiver | `event-driven/sd-l6-queue-pubsub-log` |
| Kafka | the most common durable event log; producers append, consumers read at their own pace | `event-driven/sd-l6-kafka-internals` |
| SPOF | single point of failure, one box whose death takes the whole system down | gloss inline; redundancy lesson: `reliability-ops/sd-l7-redundancy-failover` |
| availability zone (AZ) | one physically separate data-center building within a cloud region | gloss inline; multi-region lesson: `reliability-ops/sd-l7-multi-region` |
| nines (99.9%...) | availability as time allowed down per year; each extra nine is 10x less downtime | `reliability-ops/sd-l7-availability-nines` |
| Kubernetes / pod / control plane | the fleet-manager software; a pod is the unit it runs; the control plane is its brain | `modern-architecture/sd-l9-containers-k8s` |
| microservices | splitting one app into many small separately-deployed services | `modern-architecture/sd-l9-monolith-vs-microservices` |
| vector embedding | a list of numbers capturing meaning, so similar things sit near each other | `data-storage/sd-l2-vector-embeddings` |
| RAG | retrieval-augmented generation: fetch relevant documents first, then let the model answer from them | `specialized-systems/sd-l11-rag-architecture` |

Terms with "gloss inline": there is no teaching lesson, so the gloss carries the load; write it well and do not link.

## Per-level directives

- **L0, L1, L2 (the zero-knowledge levels):** apply EVERY finding, including minors. This is the user's number one demand: the course must start assuming the student knows nothing. L0's `nonfunctional-requirements` lesson (~lines 620-780 of level0.ts) is the worst wall in the course: a lever list drops sharding, load balancer, p99, CDN, replication, nines, WAL, quorum, CAP/PACELC bare in nine lines. Rework that passage so every lever reads in plain words first with forward links ("each of these gets a whole lesson later").
- **L3-L9:** blocking and major mandatory; minors when the edit is cheap and local.
- **L10, L11:** two findings files each (a + b); read both. Mostly missing-links: these are revision levels, so links back to the teaching lesson are the product. Blocking and major mandatory.
- **Applied pieces budget:** implement AT MOST 4 applied opportunities per level, chosen by: (1) the audit called the lesson's CORE trade-off abstract, (2) the lesson currently has no sim/animated widget, (3) prose numbers or a predict-with-numbers check will do the job. A `calc` only when sliders genuinely teach more than two worked numbers would. Skip the rest; list them as skipped.
- **Forward references are fine when glossed.** The course deliberately teaches interview method (L0) before fundamentals (L1-L2). Never restructure, reorder, or move content between lessons. The fix is always: plain words at first use, then a link.
- **Do not re-gloss inside the term's own teaching lesson.** A lesson whose job is DNS teaches DNS; no parenthetical needed before its own definition section.
- **Consistency check before you finish a lesson:** if you glossed a term, later mentions in the same lesson stay bare (no double glosses).
