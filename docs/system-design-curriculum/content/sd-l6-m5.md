> Module **sd-l6-m5** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l6-m4](./sd-l6-m4.md) · Next: [sd-l7-m1](./sd-l7-m1.md)

# L6 · Schema Governance & Ops

By the end of this module you can govern a shared event schema so ten teams evolve it without breaking each other (compatibility modes, registry enforcement, the safe way to make a breaking change), and you can operate the messaging tier itself: replicate and ack so no acknowledged message is ever lost, monitor the signals that expose silent async failures, and size partitions, storage, and network for a million-message-per-second stream.

### sd-l6-schema-evolution: Schema Management & Evolution

- **id:** `sd-l6-schema-evolution`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** schema-registry, evolution, avro

#### Learn

An event stream outlives every version of every service that touches it. A Kafka topic with 30-day retention holds messages written by last month's producer that today's consumer must still read, and a new consumer that spins up next quarter will replay events from long-dead producers. That is the core insight: an event schema is a public contract, not a private struct. The moment a second team subscribes to your topic, you have lost the freedom to change the shape at will. Rename a field and you break every consumer that still reads the old name, at deploy time, in production, with no compiler to catch it.

The tool that makes this safe is a **schema registry** (Confluent Schema Registry, Karapace, AWS Glue). Producers register the schema; the registry assigns a numeric schema ID and, critically, rejects any new version that violates the topic's configured compatibility rule before the producer is allowed to publish. On the wire the message carries the compact binary payload plus the schema ID (a few bytes), not the full schema, so you get self-describing evolution without paying to embed the schema on every record. Consumers fetch the writer schema by ID and reconcile it against their own reader schema. Avro, Protobuf, and JSON Schema all support this; Avro's explicit writer-plus-reader resolution is the classic model, Protobuf leans on field numbers and reserved tags.

Compatibility modes are the heart of the interview:

- **Backward** (the common default): new schema can read old data. You may add a field with a default and delete an optional field. Consumers upgrade first, then producers.
- **Forward:** old schema can read new data. You may add a field and remove one that had a default. Producers upgrade first, then consumers.
- **Full:** both directions hold. The safe intersection: add or remove only optional fields with defaults, never touch required ones.

The compatibility mode literally dictates your deploy order, which is why it matters operationally and not just in theory.

The rule that follows: **add fields with defaults, never remove or rename a required field.** A field with a default lets an old consumer that never heard of it simply fall back, and lets a new consumer read old records that lack it. Renaming is the classic trap, because a rename is a delete plus an add and breaks both directions at once.

So how do you make a genuinely breaking change? You do not mutate in place. Three options: **upcasting** (a transform step that reads v1 and rewrites it to v2 shape on read), the **tolerant reader** pattern (consumers ignore unknown fields and tolerate missing optional ones, so most additive change needs no coordination), or, for a real break, **publish a new topic** (`user.v2`) and run both until every consumer has migrated, then retire v1. New topic is the honest answer when the change cannot be made additive.

**Interview nuance:** the wrong turn is treating event schemas like internal database columns you can `ALTER` freely. Downstream teams you have never met are parsing your bytes. The senior move is to name the compatibility mode, show that it fixes deploy order, and reach for a new topic (not a mutation) when a break is unavoidable.

Recap: an event schema is a versioned public contract enforced at produce time by a registry; evolve additively with defaults under a stated compatibility mode, and make true breaks with upcasting, tolerant readers, or a new topic, never an in-place mutation.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design schema governance for a shared `user` event topic consumed by 10 teams: allow producers to add fields without breaking old consumers, and specify your compatibility policy.

**Think about:**
- What compatibility mode lets producers add fields safely?
- Why treat events as a public contract?
- How do you make a breaking change?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a `user` topic on Kafka, roughly a few thousand events per second, 10 consuming teams I do not control, mixed languages, and a hard requirement that one team's change never pages another team.

I put a schema registry (Confluent or Karapace) in front of the topic and make registration mandatory: producers cannot publish a payload whose schema is not registered and compatible. The serialization format is Avro (or Protobuf) so records carry a small schema ID and the registry stores the full writer schema. This gives every consumer a way to resolve the writer schema by ID instead of guessing.

The compatibility policy I set on the subject is **backward** (I would consider **full** if I need the freedom for either team to deploy first). Backward means a new schema can read data written under old schemas, so the governance rule I publish to all 10 teams is simple: you may add optional fields with defaults, you may delete an optional field, and you may never remove, rename, or retype a required field. Because backward requires consumers to upgrade before producers, that constraint is exactly what keeps an added field from breaking a consumer still running last week's code: the new field is simply ignored by readers that do not know it, and old records missing the field resolve to its default.

Events are a public contract because 10 teams with independent deploy cadences parse these bytes; there is no shared build that would catch a shape change, so the registry is the enforcement point that a compiler would normally be.

For a genuine breaking change (say, splitting `name` into `first`/`last`, which is a rename), I do not mutate `user`. I publish `user.v2`, dual-write both topics from the producer, let each consuming team migrate on its own schedule, track migration via consumer group offsets, and retire v1 only once lag on it goes to zero everywhere. For lighter changes I lean on tolerant readers so unknown fields are ignored by default.

The common wrong turn is treating the schema as a private, mutable struct and renaming a field in place, which breaks every downstream consumer at once with no warning.

**Self-check rubric:**
- [ ] Names a schema registry and makes compatibility enforced at produce time, not by convention.
- [ ] States a specific compatibility mode (backward/forward/full) and the exact deploy order it implies.
- [ ] Gives the additive rule: add optional fields with defaults, never remove/rename required fields.
- [ ] Handles a real breaking change with a new topic (or upcasting), not an in-place mutation.
- [ ] Explains why the events are a public contract across independent teams.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the schema-governance rollout for Stripe's `charge.succeeded`-style webhook and internal event, consumed by hundreds of external integrators plus dozens of internal services, where you must add a new `payment_method_details` object and later deprecate a legacy `card` field without breaking a single integrator.

**Model answer (revealed on demand):**

Assumptions: this is the hardest case because external integrators are code I will never see and cannot force to upgrade; their tolerance for change is near zero and a break becomes a public incident.

I run two layers. Internally, events flow through a schema registry on Kafka with **full** compatibility on the subject, so neither producers nor the many consuming services are forced into a deploy order. Externally, I version the public event via a **date-based API version** (Stripe's actual model): each integrator is pinned to the version they signed up on, and the webhook payload is transformed to that version at delivery time. This turns "evolve the schema" into "add a transform," not "mutate the contract everyone depends on."

Adding `payment_method_details` is purely additive: it is a new optional object with a default of absent. Under full compatibility, internal consumers that do not know it ignore it, and external integrators on old versions simply never receive it because the delivery-time transform strips fields their pinned version predates. No coordination required.

Deprecating the legacy `card` field is the dangerous half, and the answer is that you never actually remove it from old versions. You keep populating `card` for every integrator pinned to a version where it existed, mark it deprecated in docs, and stop emitting it only in a new API version that integrators opt into deliberately. Internally you upcast: a transform reads the new `payment_method_details` and synthesizes the legacy `card` shape for any consumer still reading it, so old and new coexist behind the version gate.

Rollout is staged: ship the additive field first, watch registry compatibility checks and consumer lag, publish the new version with `card` removed, drive adoption with dashboards on version usage, and retire the old version only when usage hits zero (which for external partners may be years, so plan to run both indefinitely). The wrong turn here is treating a public webhook like an internal schema and dropping `card` on a fixed date; that is a mass integrator outage, not a deprecation.

### sd-l6-streaming-observability: Streaming Durability, HA & Observability

- **id:** `sd-l6-streaming-observability`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** streaming-ops, ha, observability

#### Learn

Operating a messaging tier comes down to two promises: an acknowledged message is never lost, and when something silently breaks you find out from a signal rather than from an angry downstream. Both have concrete, defensible settings.

**No acknowledged-write loss.** In Kafka terms, three settings work together. Set replication factor to 3 across three availability zones (rack-aware placement so the three replicas never share an AZ). Set the producer to `acks=all`, meaning the leader does not acknowledge until every in-sync replica has the record. Set `min.insync.replicas=2`, meaning if fewer than two replicas are in sync the producer's write is rejected rather than silently accepted with too little redundancy. The combination guarantees that any acknowledged record survives losing a full AZ, because a second copy lives in a surviving zone. Drop `acks=all` and a leader can ack a write that only it holds, then die, and the write is gone even though the producer got a 200.

**Leader election and the unclean tradeoff.** When a leader fails, a follower is promoted. If you allow **unclean leader election**, an out-of-sync replica can become leader, which keeps the partition available but discards records the old leader had and the new one did not: you chose availability over durability. Keep it disabled (`unclean.leader.election.enable=false`) when the data is money or orders; the partition goes unavailable until an in-sync replica returns, which is the correct choice when losing an acknowledged record is unacceptable.

**Surviving multi-region and duplicates.** For cross-region resilience you either stretch a cluster across regions (simple, but latency-bound and quorum-sensitive) or replicate asynchronously with **MirrorMaker 2** to a second cluster (looser coupling, but the replica lags and failover can lose the in-flight tail). Either way, enable the **idempotent producer** so a producer retry across a failover does not write the record twice; combined with consumer idempotency this keeps a failover from duplicating side effects.

**The signals.** The primary health signal for a stream is **consumer lag**: the gap between the latest offset and the committed offset per partition. Rising lag means consumers are falling behind and end-to-end latency is growing, and it is the one number that turns into an SLO. Alongside it, watch **under-replicated partitions** (durability eroding, a replica has fallen out of sync), **dead-letter-queue depth** (poison messages piling up), and **end-to-end latency** measured with a trace that spans the async hop, not just per-service timings. Without lag and cross-hop tracing, async failures are silent: the producer got its ack, nobody is watching the consumer, and the first symptom is a stale downstream hours later.

**Capacity math.** Two formulas earn the offer. Partitions come from throughput: `partitions ~= target throughput / per-partition throughput`. If a partition sustains about 10 MB/s and you need 1M msg/s at 1 KB each (1 GB/s), that is roughly 100 partitions before you add headroom for consumer parallelism and skew (call it 150 to 200). Storage is `rate x message size x retention x replication factor`. At 1 GB/s, 7-day retention, replication 3: 1 GB/s x 604,800 s x 3 is on the order of 1.8 PB, so retention and replication, not raw ingest, dominate the disk bill. Network egress multiplies by fan-out: every consumer group re-reads the stream.

**Interview nuance:** the wrong turn is claiming durability from replication alone while leaving `acks=1` or unclean election on, or having no lag metric and no trace across the async boundary so failures are invisible. Name the three durability knobs together, name lag as the SLO, and show the two capacity formulas.

Recap: prevent acknowledged loss with rack-aware RF3 plus `acks=all` plus `min.insync.replicas=2` and clean leader election; make consumer lag the primary SLO alongside under-replicated partitions, DLQ depth, and end-to-end tracing; size partitions from throughput and storage from rate times size times retention times replication.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Make an event-streaming platform survive a full availability-zone loss with zero acknowledged-message loss, and define the top monitoring signals and capacity math for a 1M msg/s stream.

**Think about:**
- What replication and acks settings prevent acknowledged-write loss?
- What is the primary health signal for a stream?
- How do you size partitions, storage, and network?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a Kafka platform across three AZs in one region, 1M msg/s at about 1 KB average (1 GB/s ingest), messages are order and payment events where losing an acknowledged write is unacceptable, and I have consumer groups fanning out to several teams.

Durability first. Replication factor 3 with rack-aware placement so the three replicas of every partition sit in three different AZs. Producers use `acks=all` so the leader acknowledges only after both followers have the record, and `min.insync.replicas=2` so if an AZ loss drops the in-sync set below two the write is rejected rather than accepted under-replicated. I disable unclean leader election, so on an AZ failure the partition either fails over to an in-sync replica in a surviving zone (no loss) or goes briefly unavailable until one returns; I never promote a stale replica and silently drop acknowledged records. I enable the idempotent producer so retries during the failover do not duplicate, and make consumers idempotent keyed on event ID as the second line of defense. This set survives a full AZ loss with zero acknowledged loss, trading a short availability dip on affected partitions for durability.

Signals: consumer lag per partition is the primary SLO, because it is the leading indicator of every silent failure and directly maps to end-to-end freshness. I also alert on under-replicated partitions (durability eroding), DLQ depth (poison messages), broker disk and network saturation, and end-to-end latency measured with a trace that crosses the async hop so I catch a stuck consumer that the producer's healthy acks would hide.

Capacity: partitions from throughput. At 1 GB/s and roughly 10 MB/s per partition that is about 100 partitions, and I provision 150 to 200 for consumer parallelism, rebalancing headroom, and key skew. Storage is rate x size x retention x RF: 1 GB/s x 7 days x 3 replicas is on the order of 1.8 PB, so retention and replication dominate, and I would push cold data to tiered storage (S3) to keep local disk sane. Network egress multiplies ingest by the number of consumer groups, so N groups means roughly N GB/s read fan-out, which sizes broker NICs and cross-AZ transfer cost.

The common wrong turn is trusting RF3 while leaving `acks=1` or unclean election enabled, which quietly loses acknowledged writes on failover, or shipping with no lag metric so a dead consumer is invisible until a downstream goes stale.

**Self-check rubric:**
- [ ] Names RF3 rack-aware + `acks=all` + `min.insync.replicas=2` together, not just "replication."
- [ ] Addresses unclean leader election as an explicit availability-vs-durability choice.
- [ ] Names consumer lag as the primary SLO plus under-replicated partitions, DLQ depth, and cross-hop tracing.
- [ ] Computes partitions from throughput / per-partition throughput.
- [ ] Computes storage as rate x size x retention x replication and notes fan-out on egress.
- [ ] Uses idempotent producer/consumer to avoid failover duplicates.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the durability, failover, and observability posture for a global streaming platform like Uber's or LinkedIn's Kafka fleet handling 5M msg/s across multiple regions, where you must survive an entire region going dark with a bounded, stated data-loss and latency budget.

**Model answer (revealed on demand):**

Assumptions: 5M msg/s (roughly 5 GB/s) across trillions of records/day, multiple regions, and a business requirement to survive losing a whole region, not just an AZ. Surviving a full region forces an honest tradeoff I have to state.

Within each region I keep the single-region posture: RF3 across three AZs, `acks=all`, `min.insync.replicas=2`, clean leader election. That already survives an AZ loss with zero acknowledged loss and is the foundation. The region-loss question is different because synchronous replication across regions would add tens of milliseconds to every produce and couple availability to the WAN, which at 5 GB/s is untenable. So I run **active-active regional clusters with asynchronous MirrorMaker 2 replication** between them. The consequence I state up front: async cross-region replication means a region that dies takes its unreplicated tail with it, so my RPO is not zero, it is bounded by replication lag (target under a few seconds, alerted). If the business truly needs region-loss RPO of zero for a subset (payments), I carve that traffic onto a synchronous stretch quorum across regions and accept its latency cost, rather than pretending async gives zero loss everywhere.

Failover: consumers are configured to fail over to the mirror cluster, and because MirrorMaker 2 translates offsets I can resume near the right position; idempotent producers and consumer-side dedup on event ID absorb the duplicates that any async failover produces. I keep an explicit runbook and regularly game-day the region evacuation, because untested failover is failover that does not work.

Observability at this scale is fleet-level: consumer lag per group per region as the primary SLO, cross-region replication lag as an explicit RPO gauge, under-replicated partitions, DLQ depth, and distributed tracing across async hops with sampling so 5M msg/s does not drown the tracing backend. Capacity: about 500 partitions per hot topic before skew headroom, storage dominated by retention x RF pushed to tiered object storage, and cross-region egress budgeted as a first-class cost line. The wrong turn is claiming zero-loss region failover on async replication; the senior move is to state the RPO your architecture actually delivers and reserve synchronous cross-region quorum only for the traffic that truly needs it.
