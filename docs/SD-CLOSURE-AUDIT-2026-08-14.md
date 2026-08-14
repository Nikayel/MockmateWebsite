# System Design closure audit, 2026-08-14

Every fact a model answer leans on that its own teach section never demonstrated.

## What this replaces

The council's SD-W5 workstream asserted that levels 7, 9, 10 and 11 were thin, measured by
`teachWords`. That metric counted fenced block bodies, and a `csdiagram` or `cswidget` spec is
JSON, so a single topology spec weighed several hundred "words". SD-W5 was really reporting which
levels carried widgets. On prose the twelve levels run 485 to 588 words and there is no gap. The
thesis is retracted and this audit is what replaced it: reading each lesson against its own answer
key, which is the only way this class of defect is visible.

The rule being enforced, from CLAUDE.md:

> every FACT the solution needs (an API, a signature, a semantic) must be recoverable from the
> teach section, the read-only files, or the README, and the teach section must have demonstrated
> it in a runnable code fence rather than named it in prose.

**BLOCKING** means a learner who read the teach carefully still could not produce that clause,
because the concept is absent. **FRICTION** means the teach names the thing in passing but never
shows it working, so the learner recognises the word without being able to use it.

## Result

12 levels, 208 lessons, **83 gaps: 50 blocking and 33 friction**.

| Level | | Lessons | Blocking | Friction |
| --- | --- | ---: | ---: | ---: |
| L0 | Interview method | 15 | 6 | 2 |
| L1 | Foundations | 21 | 9 | 5 |
| L2 | Data & storage | 17 | 4 | 10 |
| L3 | Scaling data | 16 | 6 (re-audited) | 8 (re-audited) |
| L4 | Scaling compute | 14 | 2 | 1 |
| L5 | Distributed core | 18 | 4 | 2 |
| L6 | Event driven | 15 | 4 | 4 |
| L7 | Reliability & ops | 17 | 1 | 3 |
| L8 | Security & privacy | 16 | 8 | 3 |
| L9 | Modern architecture | 16 | 3 | 2 |
| L10 | Case studies | 28 | 4 | 0 |
| L11 | Specialized systems | 15 | 5 | 1 |
| | **Total** | **208** | **50** | **33** |

Level 3 originally returned zero gaps, and **that number was wrong**. Spot-checking it found a gap on
the first lesson tried: `sd-l3-geospatial-indexing`'s model answer ends with "an exact haversine
distance filter and sort on the candidates", and `haversine` appears exactly once in the entire
4,900-line level file, in that sentence.

**A full re-audit then found 14 gaps across 10 of the 16 lessons, 6 blocking and 8 friction.** Zero
was not a near miss. Among them: `sd-l3-cdc-dual-write` routes poison events to a dead-letter queue in
BOTH its apply and practice answers while the teach never mentions a permanently-failing event or
head-of-line blocking; `sd-l3-vector-hybrid-search` instructs the learner to "chunk articles into
passages" while the teach operates entirely at document granularity and never uses the word;
`sd-l3-replication-topologies` requires OR-Set merge semantics whose entire treatment in the teach is
one prose bullet with no merge shown.

The re-audit also did something the first pass did not, and it is the more useful half: it separated
**sequencing defects** from absences. Three L3 lessons reach for a concept taught two lessons later in
the same module (stampede guards, hot-key shard saturation, sub-partitioning with a bucket suffix).
Those reorder rather than rewrite. It also listed what it CLEARED and why, so the negative results are
checkable: Snowflake IDs, LSM tombstones, Zipfian working sets and hot/warm/cold tiering are all
taught in earlier levels, and "through-line" and "audit-grade" are English rather than terms.

One nuance it added that corrects the spot check above: on haversine, the SUBSTANCE is reachable. The
teach says "distance on a sphere is not Euclidean" and twice says "a final exact-distance filter and
sort on the small candidate set". Only the named formula is missing, so the repair is to name it where
the teach already describes it, not to write the concept from scratch.

The lesson for the method: **a confidently empty agent result reads exactly like a clean one.** This
is why CLAUDE.md says to verify agent reports rather than relay them. A zero from one reader in a
fleet of twelve deserves a second reader before it is believed.

Three other findings were spot-checked and held. `sd-l0-nonfunctional-requirements` needing
idempotency keys: confirmed, `nonfunctionalRequirementsTeach` spans lines 495 to 741 and the first
mention of idempotency in the file is line 832, inside the NEXT lesson's teach.
`sd-l1-network-stack` needing anycast: confirmed, `networkStackTeach` spans lines 12 to 742 and the
first anycast mention is line 1472, inside `requestLifecycleTeach`.

## Reading the pattern

The blocking gaps cluster at the two ends of the curriculum for opposite reasons.

**L0 and L1 (15 of 50)** lean forward. A Level 0 practice needs idempotency keys, anycast, or a
server-assigned sequence number, and each of those is genuinely taught, just one to three lessons
LATER. These are ordering defects, not missing content, and several are fixed by moving a
definition earlier rather than writing anything new.

**L8 (8 of 50)** is the densest single level. Security answers name specific mechanisms, and a
mechanism named but never shown is exactly the friction-to-blocking boundary.

## Blocking

### L0 — Interview method

**`sd-l0-fermi-estimation` [apply]** — Cache sizing from the hot working set: the ~20%-of-data-serves-~80%-of-reads cut, and the fact that the cache is sized off the actively-read window rather than the retained corpus

> **Cache.** Size from the hot working set, not the full corpus: assume the hot ~20% of recent objects serves ~80% of reads.

The Fermi teach's worked chain stops at peak QPS and never sizes a cache, yet the prompt demands "cache size"; either extend the worked example with a runnable cache-sizing line (actively-read window x hot fraction, against a hit target) or drop "cache size" from the prompt, since the formula currently first appears two lessons later in sd-l0-storage-bandwidth-cache.

**`sd-l0-nonfunctional-requirements` [practice]** — Idempotency keys as the mechanism that makes a retried write safe

> Forces a transactional store (PostgreSQL or Spanner) with idempotency keys on every charge request so retries never double-charge.

thinkAbout asks "which mechanism makes them safe?" but idempotency is demonstrated only in coreEntitiesApiTeach, the NEXT lesson, so introduce the key here in the durability/consistency lever material with the ambiguous-timeout example (a retried charge returning the original result), or move this practice after sd-l0-core-entities-api.

**`sd-l0-nonfunctional-requirements` [practice]** — The active-active vs active-passive multi-region write topologies, and why active-active forfeits a single source of truth

> Forces multi-region active-passive failover (not active-active, to preserve a single source of truth for consistency)

Neither term appears in any Level 0 teach and the availability lever as written ("replication, multi-region, no single points of failure") argues toward more redundancy rather than a passive standby, so work the two topologies once: both regions accepting writes yields conflicting writes with no single authority, one writer plus a standby keeps the authority at the cost of failover time.

**`sd-l0-high-level-dataflow` [practice]** — A geospatial/proximity index as a component (geohash buckets or an in-memory QuadTree) and why a relational store cannot serve nearest-neighbour queries at rate

> driver apps continuously push location into an ingest path updating a geospatial index (Redis with geohash buckets, or an in-memory QuadTree sharded by region)

The prompt requires the learner to "show where geospatial matching lives" and the exercise's own common-wrong-turn penalises reaching for Postgres, but the teach's component palette (gateway, cache, queue, CDN, object store, search index) contains no proximity-query store, so add it to the palette with a requirement-tied justification in the same form as the Redis and Elasticsearch entries.

**`sd-l0-tradeoff-articulation` [practice]** — That an in-memory geospatial store exists, answers radius queries directly (GEOADD/GEOSEARCH), and is partitioned by an S2 or geohash cell grid

> keep live location in an in-memory geospatial store, Redis with geospatial commands (GEOADD/GEOSEARCH) sharded by geographic cell

Here the store choice IS the graded answer, yet no Level 0 teach names a store that answers "drivers near this point", so one worked proximity lookup against a cell-partitioned in-memory geo index (the same addition that closes the sd-l0-high-level-dataflow practice gap) makes the decision recoverable instead of unguessable.

**`sd-l0-communication-whiteboarding` [practice]** — Server-assigned monotonic per-conversation sequence numbers issued by the owning partition, and that client clocks cannot be trusted for ordering

> Commit to a per-conversation sequence number assigned by the owning partition (the conversation is the partition key), so all messages in a chat get a monotonic sequence from one authority

thinkAbout demands "the technically rigorous answer to per-conversation message ordering" but this teach is entirely communication technique and no Level 0 teach mentions sequence numbers or ordering authority, so demonstrate the server-assigned monotonic sequence in the sd-l0-high-level-dataflow chat trace (which already draws the chat service and message store) and let this practice lean on it.

### L1 — Foundations

**`sd-l1-network-stack` [practice]** — Anycast: advertising the same IP prefix from every POP so traffic (and a flood) lands at the nearest site and spreads geographically

> **Tier 1 is L3/L4.** Anycast advertises the same IPs from every POP so a volumetric flood spreads geographically across dozens of sites instead of concentrating on one.

networkStackTeach should introduce anycast where it already discusses L3/IP routing, showing the same VIP announced from multiple sites and the resulting nearest-POP selection; the term currently first appears in requestLifecycleTeach (lesson 6) and cdnCachingFoundationsTeach (lesson 17), both downstream of this exercise.

**`sd-l1-network-stack` [practice]** — The TCP 3-way handshake and SYN-cookie defense, i.e. that a half-open SYN flood costs the server per-connection state and that a spoofed source cannot complete a handshake

> with SYN-cookie defense so no per-connection state is held for half-open floods

networkStackTeach should demonstrate the SYN / SYN-ACK / ACK exchange at its L4 row and show why an unanswered SYN pins state (hence SYN cookies), since the exercise's own thinkAbout leans on 'what does completing a TCP+TLS handshake prove'; the handshake is currently first taught two lessons later in tcpUdpTeach and SYN cookies appear in no teach section at all.

**`sd-l1-tcp-udp` [practice]** — Forward error correction and packet loss concealment as UDP's substitutes for retransmission, plus app-layer congestion control (WebRTC/GCC)

> **Loss handling without retransmission:** forward error correction (send redundant parity so the receiver reconstructs a lost packet without asking), packet loss concealment (interpolate a missing audio frame), and adaptive bitrate that lowers resolution when the network degrades.

tcpUdpTeach's 'When UDP is right' section should work a concrete example of what replaces retransmission once you drop it (redundant parity packets reconstructing a loss, interpolating a missing audio frame, and bandwidth estimation living in the app), because the teach currently establishes only that UDP has 'no congestion control by default' and stops there.

**`sd-l1-tcp-udp` [practice]** — Selective Forwarding Unit (SFU): a regional media relay each client sends one stream to, which then fans out, instead of a peer mesh

> route media through Selective Forwarding Units (SFUs) in regional POPs near users, so each client has one short-RTT UDP path to its nearest SFU and the SFU fans out

tcpUdpTeach should show the mesh-versus-relay arithmetic for a multi-party call (N participants means N-1 uploads per client in a mesh, one upload plus a server fan-out with an SFU), since the practice's entire 1M-participant scaling answer rests on a topology the teach never introduces.

**`sd-l1-request-lifecycle` [practice]** — Cache stampede (thundering herd) on a hot key, and its defenses: request coalescing / single-flight, jittered TTLs, and stale-while-revalidate

> A doorbuster product is a single cache key every request wants; a miss or expiry causes a thundering herd. Defend with request coalescing (single-flight so one miss repopulates while others wait), jittered TTLs, and pre-warming hot products.

requestLifecycleTeach should demonstrate what happens to one hot cache key at the moment it expires under load and show single-flight plus TTL jitter collapsing the concurrent rebuilds; the exercise's thinkAbout asks 'how do you defend?' but the teach covers only cache-aside hit-versus-miss, and the stampede material lives in cdnCachingFoundationsTeach eleven lessons later.

**`sd-l1-versioning` [practice]** — Date-based, per-account pinned API versions, with a per-request override header (Stripe-Version)

> **Mechanism: date-based, per-account pinned versions** (Stripe's real model). Each account is pinned to the API version current when it integrated, e.g. `2020-08-27`. Every request runs against that pinned behavior unless explicitly overridden with a `Stripe-Version` header.

versioningTeach currently teaches only URL-path and header/media-type versioning; it should demonstrate a third axis where the version is a dated value bound to the account rather than to the URL, showing two accounts pinned to different dates hitting the identical endpoint and getting different response shapes.

**`sd-l1-versioning` [practice]** — The request/response version-transformer chain: up-convert an old request to the current internal model, process once, down-convert the response back through per-version shims

> The backend keeps a chain of request and response transformers, one per dated version, translating between the internal current model and each historical shape.

versioningTeach should work a runnable example of one such shim (a small function that renames or reshapes a single field, applied in sequence) so the learner can see how one canonical implementation serves many historical shapes; without it the practice's central 'why this is not N forked codebases' claim is unreachable, and the term appears nowhere in any teach section.

**`sd-l1-http-semantics` [practice]** — Operational Transformation (OT) and CRDTs: merge-based concurrency control over fine-grained operations, as the alternative to a whole-document version check

> a real-time collaboration protocol, either Operational Transformation (OT, what Google Docs historically used) or CRDTs

httpSemanticsTeach should close its optimistic-concurrency section by showing what replaces If-Match once contention is per-keystroke: two concurrent insert-at-position operations being transformed or merged so both survive and converge. The prompt explicitly asks 'what you would use instead' and the thinkAbout asks for 'what protocol family merges concurrent edits instead of rejecting them', but neither OT nor CRDT appears in any level 0 or level 1 teach.

**`sd-l1-latency-percentiles` [apply]** — SLI and SLO as distinct things, and the error budget that falls out of an SLO target

> **SLIs vs SLOs:** SLIs are the measured signals: latency distribution (p50/p95/p99/p99.9), availability (fraction of requests returning non-5xx within the latency budget), error rate.

latencyPercentilesTeach uses the word SLO exactly once as an aside and never defines it, never mentions SLI, and never mentions error budget; it should work one concrete example that names the measured signal, the target written against it, and the budget the target implies (99.9% success over a window means 0.1% may miss), because the apply prompt asks the learner to 'define the SLIs/SLOs' as its first task.

### L2 — Data & storage

**`sd-l2-relational-acid` [apply]** — The immutable append-only ledger-entries pattern: entries are the source of truth and the balance column is a derived projection of them

> Balance is a cached projection of the immutable ledger, not the primary record.

Extend the teach's worked BEGIN/UPDATE/UPDATE/COMMIT fence with a second fence that inserts two immutable `ledger_entries` rows inside the same transaction and derives the balance from them; as written the teach's only runnable schema is the two-UPDATE balance design that the apply answer scores as the common wrong turn ('storing balance as the source of truth with no immutable ledger').

**`sd-l2-mvcc-locking` [practice]** — A durable, retained, partitioned event log (Kafka/Kinesis) that can be re-aggregated for an exact total, plus a stream-processing tier reading from it

> treat the Kafka log as the durable source of truth and process it exactly-once

Extend the teach's hot-key escalation ladder past 'batch increments in memory or Redis and flush periodically' to a retained event log: show one worked path where raw events append to a partitioned log, a stream job maintains the fast approximate tally, and a batch aggregate over the same log produces the exact total. The ladder currently tops out at a lossy in-memory buffer, which cannot meet the practice's payout-durability requirement (level1 teaches at-least-once delivery and consumer dedup, but never a replayable log as a source of truth).

**`sd-l2-keys-ids-constraints` [practice]** — The double-entry ledger shape: immutable append-only entries whose debits and credits sum to zero, corrected by reversing entries rather than updates

> Enforce double-entry with a CHECK/trigger that debits and credits sum to zero per transaction.

The teach covers surrogate keys, constraints, money types and soft-vs-hard delete but never the ledger shape; add a worked schema with paired entries summing to zero, a correction expressed as a reversing entry, and the reason soft delete is wrong on a ledger. 'Ledger' and 'double-entry' appear in no level0/level1/level2 teach.

**`sd-l2-blob-object-storage` [practice]** — Adaptive bitrate delivery: a transcode ladder of renditions, segmented media plus a manifest, and per-segment bitrate switching by the player

> fans each raw file into a ladder of renditions (240p through 4K) segmented for HLS/DASH adaptive streaming

The teach covers presigned multipart upload, lifecycle tiering and CDN reads, but never transcoding or adaptive bitrate (HLS, DASH, rendition, manifest and segment appear in no level2 teach); add a worked delivery path (raw object -> rendition ladder -> immutable segments plus manifest -> player switches per segment) so the answer's 'common wrong turn' does not penalize a fact the lesson never taught.

### L4 — Scaling compute

**`sd-l4-health-checks` [practice]** — max-ejection-percentage: the outlier-detection setting that caps what fraction of a pool passive ejection is allowed to remove, so correlated failures cannot drain the whole fleet

> rely on Envoy passive outlier ejection with a max-ejection-percentage cap (never eject more than ~20-30% of the pool), so even if many pods look bad at once, the mesh refuses to drain the whole fleet

In healthChecksTeach, after the passive-outlier-ejection paragraph, work the 500-pod case end to end: show uncapped ejection emptying the pool when a shared dependency blips, then the same run with a 20-30% max-ejection-percentage leaving the majority serving, naming the setting alongside the consecutive-failure threshold it pairs with.

**`sd-l4-autoscaling` [practice]** — SQS visibility timeout: the per-message invisibility window after receive, and the duplicate redelivery that happens when a job runs longer than it

> an SQS visibility timeout above the max job time so a job is not redelivered while still processing

In autoscalingTeach, where SQS/Kafka appear as KEDA metric sources, add a worked timeline for a 300-second transcode against a 30-second visibility timeout: receive at t=0, message reappears at t=30, a second worker starts the same job, then the corrected setting. The teach names SQS only as a scaler input, so the redelivery semantic is unreachable at Level 4 (it is first taught in Level 6).

### L5 — Distributed core

**`sd-l5-smr-total-order` [practice]** — Kafka's in-sync replica (ISR) set and the high-water mark as a partition's commit point

> the leader advances the high-water mark only once records are replicated to the in-sync replica (ISR) set. Consumers read only up to the high-water mark

Add a worked Kafka-partition walkthrough to the SMR teach: the leader assigns offsets, followers fetch in order, the ISR is the set of followers currently caught up, and the high-water mark advances only to the offset every ISR member holds while consumers are capped at it, stepped through a follower falling out of and rejoining the ISR.

**`sd-l5-smr-total-order` [practice]** — Kafka's durability configuration: acks=all, min.insync.replicas, and unclean leader election

> Leaving min.insync.replicas=1 and allowing unclean leader election means a lagging replica can become leader and truncate acknowledged records: durability sacrificed for availability and throughput.

Demonstrate the config triple with a concrete failure trace in the teach: RF=3, the ISR shrinks to the leader alone, a write is acknowledged under acks=all with min.insync.replicas=1, the leader dies, an out-of-sync replica wins an unclean election and truncates the acknowledged record; then replay the same trace with min.insync.replicas=2 and unclean election disabled to show the write being rejected instead of lost.

**`sd-l5-raft-paxos` [practice]** — ReadIndex: a Raft leader must re-confirm leadership with a heartbeat quorum before serving a linearizable read, because a deposed leader does not know it was deposed

> For linearizable reads, route through the leader with a ReadIndex confirmation (the leader verifies it is still leader via a heartbeat quorum before serving), accepting the latency.

Add a read-path section to the Raft teach: walk a partitioned leader that still believes it leads answering a read from its stale state machine, then show the ReadIndex fix step by step (record the current commit index, confirm leadership via a heartbeat round to a majority, wait until that index is applied, then serve), contrasted with cheap stale follower reads.

**`sd-l5-physical-time-hlc` [practice]** — the read uncertainty interval and transaction restart that close the residual clock-skew window on commodity (NTP-only) hardware

> an uncertainty interval around each read timestamp; if a read encounters a value written within the interval it cannot safely order, it restarts at a higher timestamp, never returning a result that violates the real order

Extend the HLC section with a worked read example: a read at timestamp T carries an uncertainty window [T, T + max clock offset]; show a value written inside that window forcing the transaction to restart at a higher timestamp, so the commodity-cloud counterpart to TrueTime's commit-wait is demonstrated rather than only the hardware answer.

### L6 — Event driven

**`sd-l6-kafka-internals` [apply]** — The partition-sizing rule `partitions ~= target throughput / per-partition throughput`, and the ~10 MB/s-per-partition planning figure it needs

> size from a conservative ~10 MB/s produce and ~10 MB/s consume per partition, so 250 MB/s needs ~25 partitions on throughput alone

Add a worked capacity fence to kafkaInternalsTeach that computes a partition count from a stated ingest rate and a ~10 MB/s-per-partition figure, since this is the first lesson whose exercise requires choosing a partition count and the formula currently appears only in streamingObservabilityTeach, eleven lessons later.

**`sd-l6-kafka-internals` [practice]** — The same per-partition throughput figure (~10 MB/s) used to turn an ingest rate into a partition floor

> For 2.1 GB/s at ~10 MB/s per partition you need ~210 partitions minimum

The same worked capacity fence in kafkaInternalsTeach closes this: show the division from GB/s to a partition floor once, so both the apply and the practice can perform it rather than quoting a number the learner has never seen.

**`sd-l6-consumer-groups` [practice]** — That a stateful consumer keeps local state and backs it with a compacted changelog topic, so a reassigned partition restores state from the changelog instead of replaying the source topic

> Because state is local (RocksDB-backed), use a changelog topic so a reassigned pod rebuilds state from the changelog rather than replaying the whole source.

Demonstrate in consumerGroupsTeach a stateful consumer whose local store is mirrored to a compacted changelog topic, and walk a partition handoff where the new owner restores from the changelog, since the teach currently covers only assignment, offsets, rebalancing and lag, and changelog-backed state is first shown in compactionRetentionTeach and streamProcessingTeach, both later in the level (L2 taught RocksDB only as an LSM storage engine).

**`sd-l6-delivery-semantics` [practice]** — A mechanism that makes an external database write atomic with the Kafka offset commit (offsets stored inside the sink DB transaction, or an outbox); the teach states the opposite, that EOS covers only offsets and records inside Kafka

> runs under Kafka transactions plus a transactional ledger write, so within Kafka and the ledger I get true exactly-once: the offset commit, the ledger row, and the output event either all land or none do

Either demonstrate in deliverySemanticsTeach how a read-process-write loop makes an external ledger row atomic with the read position (commit the offset inside the sink database transaction and resume from it, or use an outbox), or reword the clause, because a learner who followed the teach's own rule that EOS stops at Kafka's edge cannot produce a claim the teach explicitly rules out.

### L7 — Reliability & ops

**`sd-l7-three-pillars-otel` [practice]** — Span links as a trace primitive: a span that references one or more upstream trace contexts without being their child, which is what a batched consumer poll needs instead of a single parent.

> Span links are the right primitive because one consumer poll can batch many messages from different traces, so a rigid single-parent model does not fit; links let one processing span reference multiple upstream trace contexts.

Add a worked trace example to threePillarsOtelTeach showing a batched consumer poll whose single processing span carries span links to several different upstream producer trace contexts, so the learner sees the tree-with-one-parent model break and the link primitive replace it.

### L8 — Security & privacy

**`sd-l8-auth-credentials` [practice]** — number-matching push prompts as the countermeasure to MFA-fatigue push bombing

> Defeat MFA-fatigue push bombing by using number-matching prompts (the user types a code shown on the login screen) instead of tap-to-approve, and rate-limit push challenges.

The teach names the attack ('push approvals (watch for MFA-fatigue bombing)' and the classify feedback 'nothing binds the tap to the real login attempt') but never names a defense, so the teach should walk a worked push-approval flow twice, tap-to-approve versus number-matching, showing the code displayed on the login screen being typed into the phone so the learner sees what binds the approval to the attempt.

**`sd-l8-passkeys-webauthn` [practice]** — break-glass emergency accounts as an enterprise identity-lifecycle control

> Emergency access uses break-glass accounts with hardware keys stored in a safe, heavily audited.

The 'Device loss and coexistence' section should extend its two-authenticator rule to the enterprise case with a worked lifecycle walkthrough that shows the break-glass account (a rarely-used, physically-secured, alarmed-on-use credential) alongside the ordinary joiner/leaver path; note that the same exercise's SCIM clause is taught only one lesson later in sd-l8-oauth-oidc, so a forward pointer or a one-line mention here would close that too.

**`sd-l8-sessions-tokens` [practice]** — the per-user revocation epoch: a stored 'sessions valid after' timestamp compared against each token's issued-at

> maintain a per-user 'sessions valid after' timestamp (an epoch) in a fast store like Redis or DynamoDB replicated to every region. Every access token carries an issued-at, and the API gateway rejects any token issued before the user's current epoch.

The teach's only revocation mechanisms are short TTL plus refresh-token revocation and a per-token `jti` denylist, none of which can terminate every session for one user, so the 'Where tokens live' / validation section should add a worked example of a per-user epoch (bump one timestamp, every outstanding token fails its next `iat` comparison) and contrast it with the per-token denylist.

**`sd-l8-secrets-kms` [practice]** — M-of-N quorum / split control and the key ceremony as the operating model for a root key

> The root is held in one hardened region under M-of-N quorum (multiple officers must approve a root operation).

The teach's 'KMS vs HSM' section describes the key hierarchy and root of trust but never says how a root key is operated, so it should demonstrate a root operation requiring M-of-N officer approval (a key ceremony) and contrast it with the fully automated intermediate/DEK path, since the practice's runbook step 2 ('Stand up a new root via the quorum ceremony in the HSM') and its committed tradeoff both depend on it.

**`sd-l8-bot-fraud-ato` [practice]** — the virtual waiting room: an edge admission queue that issues a signed queue token and releases users at a controlled rate

> All users are admitted to a queue at the edge (Queue-it style or homegrown) before they can reach the buy flow, and released at a controlled rate.

The model answer labels this 'the core move' yet no teach in Levels 0-8 introduces it (it is first taught in Level 10's flash-sale lesson, which is later), so the bot-defense teach should work through the on-sale timeline with and without an admission queue, showing that controlled release removes the fastest-bot-wins race and buys scoring time.

**`sd-l8-threat-modeling-zerotrust` [practice]** — service-mesh mTLS permissive mode: a mode that accepts both plaintext and mTLS while reporting which calls are already mutually authenticated

> Deploy the service mesh (Istio/Linkerd) with mTLS in **permissive mode**, where it accepts both plaintext and mTLS and reports which calls are already mutually authenticated.

Sequencing the migration is the learner's decision, but that the mesh can run in a both-accepted, observe-only mode is a fact the teach never states (nor does the earlier sd-l8-encryption-transit-mtls teach), so the zero-trust section should demonstrate the two enforcement modes and what the permissive-mode telemetry reveals about the real call graph.

**`sd-l8-compliance-frameworks` [practice]** — PSD2 and its Strong Customer Authentication (SCA) requirement on EU payment flows

> add PSD2 Strong Customer Authentication (SCA) at the EU payment flow via 3-D Secure

The teach's framework table is the lesson's central artifact and enumerates only GDPR/CCPA, SOC 2, HIPAA, and PCI-DSS, so it should gain a PSD2 row stating the architectural demand (strong customer authentication on EU payment initiation, satisfied in practice by 3-D Secure) since the practice is an EU payments expansion and treats the regulation as known.

**`sd-l8-audit-supplychain` [practice]** — break-the-glass access: allowing an emergency read instead of denying it, and making the audit trail the control

> clinicians need broad access for emergencies (break-the-glass), so I do not hard-block; instead break-the-glass access is allowed but heavily logged and reviewed

The teach presents object-level authorization only as a hard denial ('an authorization check on every object access, `caller owns resource`'), so it should demonstrate the break-the-glass alternative: an access the policy permits but flags, requiring a stated reason and landing in the tamper-evident log for review, which is the pattern the EHR practice is built on.

### L9 — Modern architecture

**`sd-l9-containers-k8s` [apply]** — The Kubernetes pod-termination lifecycle: the `preStop` lifecycle hook and the `terminationGracePeriodSeconds` field, and the race between endpoint removal and SIGTERM that makes them necessary for a zero-downtime rollout.

> Add a `preStop` hook plus `terminationGracePeriodSeconds` so draining Pods finish in-flight requests after SIGTERM.

In containersK8sTeach's rolling-update section, add a fenced pod-spec snippet showing `terminationGracePeriodSeconds` and a `preStop` hook alongside the probes, with the one-line reason (endpoint removal propagates asynchronously, so the pod must keep serving briefly after SIGTERM) — the later cloudNative12factorTeach steps widget demonstrates the drain protocol but never names either field, and neither does any other teach in L0-L9.

**`sd-l9-service-mesh` [practice]** — Multi-cluster / multi-region mesh topology, and the east-west gateway that carries mesh traffic between clusters while preserving mTLS identity.

> Cross-region traffic goes over east-west gateways with mTLS preserved.

Add a short worked topology to serviceMeshTeach showing two clusters joined by an east-west gateway and what it must preserve (workload identity end to end, so mTLS is not terminated and re-originated at the region edge); the practice prompt mandates three regions but every diagram and example in the teach is single-cluster.

**`sd-l9-platform-gitops` [practice]** — How Argo CD scales past a single Application: the App-of-Apps pattern (a parent Application whose manifests are child Applications) and ApplicationSet generators for per-region/per-service fan-out.

> An App-of-Apps pattern keeps 300 services manageable.

Add a fenced example to platformGitopsTeach showing a parent Application that renders child Applications and an ApplicationSet generator fanning one template across regions, so the answer to the exercise's own "how do you bound blast radius across 6 regions and 300 services" is recoverable; neither term appears in any teach across the whole system-design curriculum.

### L10 — Case studies

**`sd-l10-video-streaming` [practice]** — Low-latency HLS/DASH: partial segments (CMAF chunks) published via chunked transfer, which decouple playback latency from segment duration

> low-latency HLS uses partial segments/chunked transfer to push latency toward a few seconds

In the segmentation/ABR section, walk one segment's timeline to show that a 2s segment costs at least 2s of latency because it must be fully encoded before it can be published, then show LL-HLS publishing partial segments as they encode so latency drops below the segment duration; the teach currently stops at '2 to 10 second' segments and never introduces sub-segment delivery.

**`sd-l10-web-crawler` [practice]** — Publisher-declared discovery channels distinct from link extraction: sitemaps with lastmod, RSS/Atom feeds, and WebSub/PubSubHubbub push notifications

> A hot tier is driven by discovery signals (publisher sitemaps and RSS/Atom feeds polled on a tight loop, WebSub/PubSubHubbub push notifications where publishers support it, plus social-share velocity)

In the frontier section, show a second inbound edge into the frontier besides the link-extraction loop: a worked example where a sitemap lastmod entry or a WebSub push injects a URL directly, making discovery latency a separate tunable term from fetch latency. The teach's only discovery path is parsing links out of already-fetched pages, which structurally cannot meet a 60-second SLA.

**`sd-l10-job-scheduler` [practice]** — An in-memory timer structure (timer wheel) preloaded with the upcoming firing window, fired from memory with the durable job store as the recovery backstop

> Pre-load the upcoming minute into an in-memory timer wheel on each scheduler shard so firing is precise to the second rather than bounded by DB poll latency, with the database as the durable backstop for recovery.

Extend the 'due now query' section past the one-second DB poller into a worked two-tier firing model: a coarse periodic query that loads the next window of jobs into an in-memory timer, firing from memory for sub-second precision, and rebuilding that timer from the durable store on shard failover. The teach's only firing mechanism is a poller that queries the DB every second, which is exactly what the practice answer argues is insufficient.

**`sd-l10-code-sandbox` [practice]** — microVM snapshot and restore (Firecracker snapshotting): persisting a paused VM's memory and filesystem state and resuming it in a few hundred milliseconds

> Snapshot idle environments to disk (Firecracker snapshotting, or pause-and-persist the container filesystem and memory) and free the compute. On the next request, resume from snapshot in a few hundred milliseconds.

On the microVM rung of the isolation ladder, add snapshot/restore beside the '~100ms boot' figure and show the idle-cost arithmetic it unlocks: a paused sandbox costs storage rather than compute and resumes in a few hundred ms. The teach covers a warm pool of pre-booted generic sandboxes, which does not preserve a specific user's state and so cannot answer the practice's defining constraint.

### L11 — Specialized systems

**`sd-l11-ml-blueprint` [practice]** — Loss-function choice under asymmetric error cost: that regression defaults to squared error, and that a quantile (pinball) or otherwise asymmetric loss deliberately biases predictions to one side. The teach's metric-hierarchy section goes business metric -> ML objective -> label and names AUC and log-loss as offline metrics, but never touches what objective the model is trained against or how cost asymmetry changes it. 'quantile' appears nowhere else in L11 and nowhere in levels 0-10.

> The asymmetric cost means we do not minimize plain squared error; we use a quantile or asymmetric loss so the model slightly over-predicts, because a late surprise costs far more than a padded estimate.

Extend the 'Frame the metric hierarchy first' section with a worked case where the two error directions cost differently (an ETA that is 20 minutes short versus 20 minutes long), showing squared error treating them identically and a quantile/asymmetric loss shifting the prediction, so the learner has the term and its effect before the practice asks for it.

**`sd-l11-ml-blueprint` [apply]** — Point-in-time correctness of training rows (the as-of join that takes each feature's last value strictly before the label's event time). The whole concept lives in the NEXT lesson's teach (featureStoreTeach, lines 312-581); at ml-blueprint the learner has only 'a daily job builds training data' plus one shared feature definition, which covers code-divergence skew but says nothing about which moment a value is read from.

> a daily job builds point-in-time-correct training data, trains the model, evaluates against a holdout and the current champion, and pushes a versioned artifact to a model registry

In the 'Two planes plus a loop' prose, add one concrete row-building example to the offline plane (label at time T joined to each feature's last value strictly before T) and name it point-in-time correctness, leaving the dual-store mechanics and the leakage failure mode to the feature-store lesson that follows.

**`sd-l11-rag-architecture` [practice]** — Physical per-tenant partitioning of a vector index: that a vector store can hold separate per-tenant namespaces/collections so a query is structurally incapable of touching another tenant's vectors, and that this is strictly stronger than a metadata pre-filter over one shared index. The teach's 'Access control at retrieval time' section teaches pre-filter versus post-filter over a single index and stops there; 'namespace' and per-tenant index partitioning appear in no teach section in L11.

> To eliminate cross-tenant leakage risk entirely, physically partition private embeddings by patient (or by a hashed shard) so a query can only ever touch that patient's namespace

Add a third rung to the ACL section showing the same query against (a) a shared index with a metadata pre-filter and (b) a per-tenant namespace, making explicit that only the second makes cross-tenant retrieval impossible by construction rather than by a correct predicate.

**`sd-l11-vector-db-ann` [apply]** — The IVF coarse quantizer: that selecting the nprobe nearest of nlist partitions is itself a nearest-neighbour problem, that the structure solving it is called the coarse quantizer, and that using an HNSW graph over the centroids instead of a flat scan is a recall/latency lever. The teach explains nlist, nprobe and PQ but never says how a query finds its nearest partitions, and 'coarse quantizer' appears nowhere else in the corpus.

> I choose IVF-PQ with an HNSW coarse quantizer for the recall target

In the IVF/IVF-PQ bullet, walk one query through centroid selection and name the coarse quantizer, showing the flat-scan-over-centroids default and the HNSW-over-centroids upgrade so the apply's index-choice sentence is reconstructable.

**`sd-l11-iot-edge-ingestion` [practice]** — A/B (dual-slot) firmware partitioning: that a device carries two firmware slots, flashes the inactive one, and boots back into the previous known-good image if the new one fails to come up. The teach covers OTA thoroughly on the cloud side (device shadow, desired/reported state, 1% canary then ramp) but has no on-device recovery mechanism; 'A/B partition', 'known-good' and 'firmware' appear in no teach section here and nowhere in levels 0-10.

> installed to an **A/B partition** so a failed flash boots the previous known-good image

Extend the device-shadow/OTA paragraph with the on-device half of the rollout: two firmware slots, write to the inactive slot, verify the signature, boot it, and a boot-failure watchdog that reverts to the other slot, so the practice's 'no A/B partition' wrong turn is a mechanism the learner has been shown rather than a phrase from the thinkAbout list.

## Friction

### L0 — Interview method

- **`sd-l0-fermi-estimation` [apply]** — Replication factor as a x3 provisioning multiplier on raw storage (RF=3). "Replication factor" is named once as a durability lever in the earlier NFR teach but is never shown multiplying anything until sd-l0-storage-bandwidth-cache two lessons later, so add one worked line to the Fermi teach turning raw bytes into provisioned bytes (raw x RF), which also closes the same clause in this lesson's practice ("with RF=3 about 6 PB/day provisioned").
- **`sd-l0-level-calibration` [apply]** — What fixed window, sliding-window-log and token bucket each do, and their quantified costs (the 2x boundary burst, the log's memory cost, the bucket's smoothing). The teach names the three only as labels ("Fixed vs sliding vs bucket", "the sliding-window-vs-token-bucket tradeoff"), so work each one's counter behaviour once, above all the window boundary where a fixed window admits two full quotas back to back, since the model answer requires the learner to produce that quantified tradeoff rather than merely recognise the phrase.

### L1 — Foundations

- **`sd-l1-tls-https` [practice]** — SPIFFE/SPIRE workload identity and the X.509 SVID / spiffe:// identity URI format. tlsHttpsTeach already teaches mTLS with short-lived certs issued by an internal CA and rotated by the mesh, so the substance is reachable; it should additionally show one concrete workload-identity string in the cert (a spiffe:// URI in an SVID) so the learner can name the artifact the audit log is keyed by rather than only describe it.
- **`sd-l1-api-paradigms` [apply]** — Persisted (allow-listed) GraphQL queries as a client-side hardening lever distinct from depth and cost limits. apiParadigmsTeach's GraphQL cost paragraph already names query-cost limiting, depth limiting, and DataLoader batching; it should add the one missing member of that list by showing a client sending a registered query id instead of a query document, so the learner can produce all three guards rather than two.
- **`sd-l1-serialization-compression` [practice]** — How a schema registry actually enforces compatibility: per-topic modes (BACKWARD, FULL) checked at registration time, plus the schema-id on the wire and writer-versus-reader schema resolution. serializationCompressionTeach names the registry once in passing ('a schema registry lets producers and consumers evolve independently') but never shows it working; it should demonstrate a registration being rejected under a named compatibility mode and a message carrying a schema id that the consumer resolves against its own reader schema, since that enforcement is the practice's stated 'real protection'.
- **`sd-l1-latency-percentiles` [practice]** — The latency-versus-utilization curve (wait time scaling like 1/(1-rho)) that forces headroom at roughly 70%. latencyPercentilesTeach never mentions utilization at all, yet the exercise's thinkAbout asks 'what utilization headroom does the latency-vs-utilization curve force you to keep'; the curve is taught two lessons later in backpressureSheddingTeach, so either move the 1/(1-rho) demonstration forward next to Little's Law or add a short worked version of it here.
- **`sd-l1-idempotency-retries` [practice]** — Kafka consumer offsets: the committed offset is the consumer's durable progress marker, so commit ordering decides whether a crash reprocesses or loses an event. idempotencyRetriesTeach already teaches at-least-once redelivery of a Kafka or SQS message; it should show the offset commit as the step that makes redelivery happen, walking a crash before commit versus after commit, so the learner can reason about commit ordering rather than only about dedup.

### L2 — Data & storage

- **`sd-l2-relational-acid` [practice]** — The outbox pattern: a row committed in the same transaction as the state change, drained later by a worker that performs the external side effect. Either show the outbox row in a runnable fence in the ACID teach (one transaction inserting both the intent row and the outbox row, plus the worker that drains it), or drop the unexplained term; 'outbox' appears nowhere in level0, level1, or any level2 teach, and is not defined until level3/level5.
- **`sd-l2-isolation-levels` [practice]** — A predicate-scoped (partial) unique index, which is what makes 'at most one ACTIVE reservation per seat' enforceable while still allowing re-reservation after a hold lapses. The teach's unique-constraint bullet already uses the seat example, so show the predicate form there: a plain UNIQUE(seat_id) would block the re-reservation that the answer's own expiry bullet depends on. Partial indexes are otherwise not introduced until the indexing lesson, two lessons later in the level.
- **`sd-l2-btree-vs-lsm` [practice]** — Time-window compaction (TWCS): SSTables grouped by time window so an old window compacts once and is never rewritten, and whole windows drop by TTL. The teach's compaction comparison names only leveled and size-tiered; add time-window compaction to that same comparison and show, on a write-once/read-recent workload, why grouping SSTables by time window stops cold data being rewritten forever.
- **`sd-l2-btree-vs-lsm` [practice]** — That Cassandra runs on the JVM and its p99 spikes come largely from GC, and that ScyllaDB's C++ shard-per-core design removes them. The teach lists ScyllaDB only as another LSM engine alongside Cassandra and RocksDB, so a choice between two LSM stores is not derivable; add one worked contrast of where LSM tail latency comes from (GC pauses plus compaction contention) so the ScyllaDB-over-Cassandra call is reasoned rather than recalled.
- **`sd-l2-indexing-cost` [practice]** — Expression (functional) indexes: indexing the result of an expression such as an extracted JSONB key. The teach's specialized-index list covers hash, partial, and GIN/GiST but never expression indexes (the word 'expression' does not appear in any level2 teach); add one worked line indexing an extracted JSONB key and contrast its write cost with a whole-document GIN index.
- **`sd-l2-physical-storage-wal` [practice]** — Synchronous replication as a commit-time durability tier: the acknowledgment waits for a standby, costing a network round trip and covering primary loss. The teach's durability chain ends at the local WAL fsync; extend the same COMMIT walkthrough one step to a remote acknowledgment, naming the failure a local fsync does not cover and what the extra round trip costs. Replication is not otherwise taught until level3.
- **`sd-l2-key-value` [apply]** — How a Redis sorted set implements a sliding window: score members by timestamp, trim the expired range, count what remains. The teach names sorted sets for 'sliding-window rate limits' only inside a parenthetical list of Redis structures; show the three-command sequence working (add scored by timestamp, trim below now-60s, count) so the learner can write the window instead of just recognizing the phrase.
- **`sd-l2-document` [practice]** — Fractional ordering keys: storing a sortable value between two neighbors so a reorder is a single-document write, plus periodic rebalancing. Add a short worked example to the document teach computing a key between two neighbours' values and showing the O(n) sibling renumber it replaces, plus why the keys eventually need rebalancing; 'fractional' appears nowhere in any level2 teach.
- **`sd-l2-wide-column` [practice]** — That a delete in an LSM store appends a tombstone which range reads must scan and skip until the grace window (gc_grace_seconds) lets compaction drop it. 'Tombstoned' appears only once, in the earlier B-tree/LSM teach, as something compaction discards; show the delete path in the wide-column teach (the delete is an append, reads scan past tombstones, they persist for a grace window) so the practice's tombstone-trap bullet is derivable.
- **`sd-l2-wide-column` [practice]** — Time-ordered ids that embed a timestamp (Snowflake), so the partition bucket is computable directly from the message id with no lookup. Snowflake is defined only in the Keys, IDs & Constraints teach, two modules later in this level, and nowhere in level0/level1; introduce the single property this answer needs (an id whose high bits are a timestamp, so bucket and sort order both fall out of the id) in the wide-column teach's time-bucketing section.

### L4 — Scaling compute

- **`sd-l4-health-checks` [apply]** — the drain-time reconnect signal for long-lived streams (HTTP/2 GOAWAY or an application-level equivalent), as distinct from waiting out a drain deadline. Extend the teach's connection-draining bullet, which currently says only that in-flight requests 'and long-lived streams' finish up to a drain timeout, with the stream case shown working: the sequence where the server emits a reconnect signal (GOAWAY on HTTP/2, or an app-level equivalent) and the client re-establishes on a healthy node before termination. The exercise's stated goal of no severed stream is unreachable from a drain deadline alone.

### L5 — Distributed core

- **`sd-l5-quorums-tunable` [practice]** — Cassandra's per-datacenter replication factor and the datacenter-scoped consistency levels LOCAL_QUORUM, EACH_QUORUM and LOCAL_ONE. The teach shows only Cassandra's ONE/QUORUM/ALL; add a two-datacenter worked example where the replication factor is set per datacenter (3 + 3) and the same write is run at LOCAL_QUORUM, EACH_QUORUM and LOCAL_ONE, naming exactly which replicas each waits on and which one a single-datacenter blip rejects.
- **`sd-l5-crdts` [practice]** — how a sequence CRDT orders concurrent inserts: unique, densely-orderable position ids instead of array indices. The workhorse-types list names 'RGA / sequence CRDTs' in a single line; add a worked two-client insert at the same index showing array indices colliding and unique fractional/tree-path position ids merging deterministically, plus why a delete leaves a tombstone so a concurrent insert beside it still lands correctly.

### L6 — Event driven

- **`sd-l6-kafka-internals` [practice]** — Kafka's cross-cluster replication mechanism and its name, MirrorMaker 2 (and Confluent Cluster Linking). Name and show MirrorMaker 2 asynchronously mirroring one cluster into another in kafkaInternalsTeach, because the practice prompt makes cross-datacenter strategy a required deliverable while the tool is first introduced in streamingObservabilityTeach, the level's final lesson; the generic per-region async-replication shape is available from L3/L5, so only the Kafka-specific mechanism is missing.
- **`sd-l6-broker-selection` [practice]** — What tiered storage actually does (cold segments offloaded to object storage, old offsets fetched from it transparently), as opposed to the bare term. Show the hot-segments-on-disk / cold-segments-in-object-storage split in brokerSelectionTeach where tiered storage is currently only listed as a Pulsar bullet point, since the practice's 90-day retention requirement leans on the cost mechanism and that mechanism is not explained until kafkaInternalsTeach, the next lesson.
- **`sd-l6-compaction-retention` [apply]** — The compaction-timing knob `min.compaction.lag.ms` and the hazard it guards, that a lagging consumer can have recent superseded values compacted away before it reads them. Extend the compaction steps widget in compactionRetentionTeach with a frame where a lagging consumer misses a superseded value, and name the two timing knobs (`delete.retention.ms` for tombstones, `min.compaction.lag.ms` for recent updates) alongside the tombstone semantics it already teaches.
- **`sd-l6-consumer-groups` [apply]** — The rebalance-callback API `ConsumerRebalanceListener.onPartitionsRevoked` as the hook for committing final offsets before a partition is released. In consumerGroupsTeach, where revocation is already narrated for the eager and cooperative protocols, show the revocation callback committing final offsets and state that it shrinks but never closes the duplicate window.

### L7 — Reliability & ops

- **`sd-l7-three-pillars-otel` [practice]** — Trace context must be manually injected into and extracted from message-queue message headers; the teach demonstrates propagation only over HTTP traceparent and never shows the messaging case or that auto-instrumentation does not cover it.. Extend the context-propagation section of threePillarsOtelTeach past HTTP with a concrete publish/consume pair that stamps the trace context into a message header on publish and extracts it on consume, stating that HTTP auto-instrumentation does not do this for you.
- **`sd-l7-sli-slo-sla` [practice]** — An SLI's numerator and denominator can be units of time (good seconds over valid seconds), not only counts of events; the teach defines an SLI exclusively as good events over valid events and its classify widget reinforces it as a bare event ratio.. Show one worked time-based SLI in sliSloSlaTeach alongside the event-count examples (good seconds over valid seconds) so the good/valid definition visibly generalizes past counting requests, since a learner following the taught definition literally would propose a session-count ratio, which the model answer calls the wrong shape.
- **`sd-l7-burn-rate-alerting` [apply]** — How a multi-window burn-rate rule is actually expressed as a query: rate over a range window, summed into a ratio, compared against burn_rate x (1 - SLO), with the two windows joined by AND. burnRateAlertingTeach names no query language and shows no rule expression, and no earlier level introduces PromQL.. Add one concrete alert-rule expression to burnRateAlertingTeach in a code fence that computes the long-window and short-window error ratios and ANDs them against the 14.4x threshold, so the taught ladder is demonstrated as a runnable rule rather than only as a table of thresholds.

### L8 — Security & privacy

- **`sd-l8-oauth-oidc` [apply]** — JWKS as the key-discovery endpoint for verifying a provider-signed ID token, and the `alg: none` / algorithm-confusion rejection rule. The teach introduces the ID token as 'a signed JWT' and covers scope/audience/state/nonce but never says where the verifying key comes from or how the signature check is attacked, so the 'Hardening tokens' section should show a worked ID-token validation (fetch the provider's JWKS by `kid`, pin the algorithm, reject `alg: none`, then check `iss`/`aud`/`exp`/`nonce`); both facts are currently first introduced in the next lesson's teach, sd-l8-sessions-tokens.
- **`sd-l8-multi-tenancy` [practice]** — envelope encryption (a per-tenant DEK wrapped by a customer-held KEK) and the key-delete erasure it enables (BYOK, crypto-shredding). The teach names the thing once in passing ('Combine with per-tenant encryption keys (crypto-isolation)') but never shows the wrapping structure, so the 'Enforce at the data layer' section should work through one tenant's key path (data encrypted under a tenant DEK, DEK wrapped by a KEK the customer controls, revoking the KEK renders that tenant's ciphertext unreadable) since the apply leans on the same fact ('crypto-shredding one tenant is a key delete') and envelope encryption is not introduced until module 3.
- **`sd-l8-incident-breach-response` [practice]** — cross-signing a CA (the old root signing the new root's key so existing chains still validate). The teach demonstrates overlapping validity only for JWKS signing keys and never defines cross-signing, and the practice's own numbered steps describe trust-bundle distribution rather than any cross-signature, so the teach should either work a PKI example showing what a cross-signed root buys over plain trust-bundle rollout, or the term should be dropped from the answer and its thinkAbout so the taught overlap principle carries the whole clause.

### L9 — Modern architecture

- **`sd-l9-containers-k8s` [apply]** — The headless Service, i.e. the Service object with no cluster IP that gives each StatefulSet Pod its own stable DNS name.. Extend the StatefulSet and Service bullets in containersK8sTeach's object list to name the headless Service as the thing that actually delivers the "stable network identity" the StatefulSet bullet already promises, since the Service bullet currently describes only the opposite behaviour (one virtual IP load-balancing across interchangeable Pods).
- **`sd-l9-iac-progressive-delivery` [practice]** — Shadow deployment / traffic mirroring: send a copy of live requests to the new version, compare its outputs against the current version offline, and discard its responses so there is zero customer impact.. Add shadow/mirror as a fourth row to the rollout-comparison table in iacProgressiveDeliveryTeach (how it moves, extra capacity, how you find out it is bad) and show the compare-and-discard mechanic in one worked step, since the teach currently enumerates the strategy space as exactly rolling/blue-green/canary and this practice leads with the technique it omits; the nearest prior exposure is L7's "(shadow reads)" inside a sharding-migration model answer, which is a data-store comparison rather than a deploy strategy.

### L11 — Specialized systems

- **`sd-l11-online-serving-rollout` [practice]** — Probability calibration: that a calibrated score means predicted probability matches observed frequency, that calibration is independent of ranking quality (AUC is invariant to monotonic rescaling), and how you measure it. This lesson's teach never mentions calibration; the only prior mention in the level is one clause of prose in the previous lesson's teach ('Calibrated probabilities matter when you blend objectives or mix in ads priced by expected value'), which never shows what it is or how it is checked. Nothing in levels 0-10 covers probability calibration (the L0 'calibration' lesson is about interview seniority rubrics).. Add a short worked comparison to the rollout-gate discussion: two models over the same impressions where the challenger ranks better but its predicted CTRs are uniformly inflated, showing predicted-versus-observed rates in buckets and the resulting auction mispricing, so calibration becomes a gate the learner can compute rather than a word they have met once. The same fix closes the smaller lean in this level's ml-blueprint apply, which also assumes calibration.

## What happens next

This is diagnosis. Repair is a separate ticket run against this list, per the
separate-diagnosis-from-repair rule in CLAUDE.md: an agent that finds and fixes in one pass fixes
what it found first and never sees the pattern.

Two rules for whoever runs the repair:

1. **Answer "this is too hard" by teaching the missing fact, never by filling in the starter.**
   Every FACT must be recoverable; every DECISION stays the learner's.
2. **A definition may not live only in a hint.** Hints are opt-in, so a definition that lives there
   is unreachable for the learner who needs it most. Teach prose owns every term the graded work
   requires.
