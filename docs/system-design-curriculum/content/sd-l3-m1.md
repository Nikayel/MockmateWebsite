> Module **sd-l3-m1** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l2-m5](./sd-l2-m5.md) · Next: [sd-l3-m2](./sd-l3-m2.md)

# L3 · Replication

After this module you can reach for replication as the first, cheapest lever to scale a read-heavy database, pick the right replication topology (single-leader, multi-leader, or leaderless) for a given consistency and geography requirement, reason about the concrete anomalies each one exposes, and fix the user-visible bugs (a comment that vanishes on refresh) that replication lag causes by adding the right session guarantee instead of over-promising linearizability.

### sd-l3-read-replicas: Read Scaling with Replicas

- **id:** `sd-l3-read-replicas`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** replication, read-replicas, scaling

#### Learn

When a read-heavy database saturates one machine, replication is the first lever you reach for, before any sharding, because it is operationally cheap and non-disruptive. The dominant pattern is **single-leader (primary/replica) replication**: every write goes to one leader, the leader streams its change log to N followers, and reads fan out across the followers. This scales **reads** linearly with follower count. It does **not** scale writes: every follower must apply every write, so the leader's write throughput is still the ceiling. That asymmetry is the whole point to internalize. Adding replicas buys read capacity and read-path fault tolerance, nothing more.

The core tradeoff is **how the leader waits for followers**, which trades durability and read freshness against write latency:

- **Asynchronous:** the leader commits and acks the client without waiting for any follower. Lowest write latency, highest throughput, but if the leader dies before a write reaches a follower, that write is lost, and followers can lag arbitrarily.
- **Synchronous:** the leader waits for a follower to confirm before acking. No data loss on leader failure for the confirmed write, but write latency now includes a round trip, and if the sync follower stalls, writes block entirely.
- **Semi-synchronous (the usual production choice):** exactly one follower is synchronous and the rest are async. You get "the write survives on at least two nodes" durability without gating on all of them. Postgres calls this `synchronous_commit` with a quorum; MySQL has semi-sync replication.

The number you must instrument is **replication lag**: how far behind, in seconds or bytes/LSN, each follower is. Under async replication lag is usually milliseconds but spikes to seconds under write bursts, long-running follower queries, or network hiccups. Lag is what makes replica reads **stale**, and stale reads are the source of the session-guarantee bugs covered later in this module. Route lag-sensitive reads (a user checking data they just wrote) to the leader or to a follower whose lag you have bounded.

Adding read capacity online is straightforward and the reason replicas are the first lever: provision a new follower, let it restore from a snapshot and catch up from the leader's log, then add it to the load balancer's pool (HAProxy, ProxySQL, or a discovery layer) once its lag is near zero. No downtime, no application change. This is how you take a CPU-bound primary from "melting" to "comfortable" in an afternoon.

**Interview nuance:** be crisp about when replication stops helping. It stops when (a) **write** throughput exceeds one leader (every replica already does all the writes, so more replicas do not help), or (b) the **dataset** no longer fits or fits poorly on one node. Both force **sharding** (next module). Replicas also do not remove the leader as a single point of failure for writes: you need automated failover (Patroni, Orchestrator, or a managed service like Aurora/RDS) to promote a follower, and that introduces its own split-brain and lost-write risks.

```
        writes            +--> follower 1 --\
client --------> LEADER ---+--> follower 2 ---+--> read LB --> reads
                          +--> follower 3 --/
   writes bottleneck at leader; reads scale with follower count
```

Recap: single-leader replication scales reads by fanning them across followers but never scales writes; choose async, sync, or semi-sync by trading write latency against durability and staleness, watch replication lag, add followers online for zero-downtime read capacity, and shard once writes or dataset size outgrow one leader.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the read path for a product catalog serving 50k read QPS against a single Postgres primary that is CPU-bound; show how you add capacity without downtime.

**Think about:**
- How does single-leader replication scale reads but not writes?
- What is the durability/latency tradeoff of sync vs async replication?
- When does replication stop helping and force sharding?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a product catalog is overwhelmingly read-heavy, say 50k read QPS against maybe a few hundred write QPS (price and inventory updates, new SKUs). The primary is CPU-bound on read query execution, not on writes and not on disk, and the catalog tolerates seconds of staleness for most reads (a price change appearing a second late is fine).

Diagnosis first: the write rate is tiny, so the CPU is being burned serving reads. That is the textbook case for **read replicas**, not sharding. I add three to five Postgres **streaming replicas** behind a read load balancer (ProxySQL, PgBouncer plus a discovery layer, or the reader endpoint of RDS/Aurora). The application splits its connections: writes and any read-your-writes-sensitive reads go to the primary; the bulk catalog browse, search-result hydration, and product-detail reads go to the replica pool. With 50k QPS spread across five replicas each handles ~10k QPS, comfortably within a single node, and I have headroom plus read-path redundancy.

Doing it without downtime: replication is async or semi-sync (the catalog does not need synchronous durability for price edits). I bring each new replica up by restoring a base backup, letting it catch up from the WAL, and only adding it to the LB pool once its lag is under a threshold (say < 1s). No schema change, no app deploy required beyond the read/write connection split, which I can ship behind a flag.

Handling staleness: catalog browse tolerates lag, so serving from replicas is fine. The two places to be careful are (1) a seller who just edited their own product and expects to see the change (route that read to the primary or use a version token), and (2) inventory/"in stock" flags where stale-high is a bad customer experience, which I would serve from the primary or a low-lag replica. I monitor per-replica lag and pull any replica exceeding the threshold out of the pool automatically.

Common wrong turn: jumping straight to sharding. Sharding a read-bound, write-light catalog adds cross-shard query complexity for no benefit, because sharding scales writes and dataset size, neither of which is the constraint. Replicas stop helping only if write QPS approaches the single-leader ceiling or the catalog outgrows one node's storage; neither is true here.

**Self-check rubric:**
- [ ] Correctly diagnosed a read-bound (not write-bound) workload and chose replicas over sharding
- [ ] Split read vs write traffic and sized the replica count against the QPS
- [ ] Described a zero-downtime add: snapshot, catch up, add to LB only when lag is low
- [ ] Named the staleness-sensitive reads and routed them to the primary or bounded-lag replica
- [ ] Stated the condition (write ceiling or dataset size) under which replication stops helping

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the read-scaling strategy for Shopify-style storefront reads where a flash sale drives 300k read QPS against product and inventory tables, replicas can lag up to 4 seconds during the write burst, and overselling inventory is a hard financial constraint.

**Model answer (revealed on demand):**

Assumptions: a flash sale spikes reads 6x to 300k QPS and simultaneously spikes writes (checkouts decrementing inventory), which is exactly what pushes replica lag to 4s. Product metadata (title, images, price) tolerates staleness; **inventory count and "in stock" must not oversell**.

Split the problem by field, not by table. **Product metadata** reads (the vast majority of 300k QPS) go to a large fleet of async read replicas, fronted by a CDN/edge cache and an application cache (Redis) since product data changes rarely. Most of the 300k never reaches a replica at all; the cache absorbs it. Replicas exist mainly for cache misses and cache fills, so even at 4s lag this is fine because a 4-second-stale product title is harmless.

**Inventory** is the hard part and must not be served from a lagging replica, because a stale-high count causes overselling, a real financial loss. So inventory reads on the checkout path go to the **primary** (or a synchronous replica), and the actual decrement is a **conditional atomic write** (`UPDATE ... SET qty = qty - 1 WHERE qty > 0` or a reservation row) so correctness does not depend on read freshness at all. For the storefront "only 3 left!" badge, I can serve a slightly stale count from a replica because it is advisory, but I never let it authorize a sale; the authoritative check happens at checkout against the primary. To protect the primary under the write burst I put hot SKUs behind a per-SKU inventory service or Redis counter that is the source of truth during the sale and reconciles to Postgres, avoiding row-lock contention on the single hottest rows.

Key tradeoff: I deliberately accept 4s staleness for metadata (cheap, cacheable, high volume) while refusing any staleness for the money-correct inventory decrement (routed to primary, made atomic). Common wrong turn: serving inventory from async replicas to shed load, which trades a financial correctness guarantee for read capacity and oversells during exactly the traffic spike you built the system for.

### sd-l3-replication-topologies: Replication Topologies & Consistency

- **id:** `sd-l3-replication-topologies`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** replication, consistency, conflict-resolution

#### Learn

Once one leader is not enough (you need multi-region writes, or you want no write SPOF), you choose among three **replication topologies**, and each one buys a capability by exposing a specific class of anomaly. Knowing which anomaly you are signing up for is the whole skill.

**Single-leader:** all writes go through one node, which serializes them, so there are **no write-write conflicts**, and it is the easiest to reason about. The costs are that the leader is a write SPOF (failover is required and risky) and cross-region writers pay the latency to reach the one leader's region. This is the default for most OLTP systems (Postgres, MySQL).

**Multi-leader:** several leaders (typically one per region or per datacenter) each accept writes and replicate to the others. This gives **low-latency local writes** everywhere and survives a region outage for writes. The price is brutal: two leaders can accept **conflicting writes** to the same key concurrently, and you must define how to merge them. Use it when local write latency or offline/multi-datacenter operation genuinely requires it (collaborative editors, calendar apps, multi-DC active-active), not by default.

**Leaderless (Dynamo-style):** any replica accepts a write, and the client (or a coordinator) writes to and reads from multiple replicas. Cassandra, DynamoDB, and Riak work this way. Consistency comes from **quorums**: with N replicas, if you require W replicas to ack a write and R to answer a read, then **R + W > N** guarantees the read set and write set overlap on at least one node, so a read sees the latest acked write. Common config is N=3, W=2, R=2. Tuning W and R trades consistency against availability and latency: W=1 is fast but weakly durable, R=1 can read stale data.

Two more leaderless mechanics interviewers probe. **Sloppy quorums with hinted handoff** keep the system available during failures by letting writes land on temporary "stand-in" nodes when the home replicas are down, then handing the data off when they recover; this trades consistency (R + W > N no longer strictly holds against the home nodes) for availability. **Anti-entropy** converges divergent replicas in the background: **read repair** fixes stale replicas noticed during a read, and **Merkle trees** let two replicas efficiently find and reconcile the exact ranges that differ.

Conflict resolution is where multi-leader and leaderless designs live or die:

- **Last-write-wins (LWW):** pick the write with the highest timestamp, discard the rest. Simple, and it is what Cassandra does by default, but it **silently loses data** for concurrent writes and depends on clock sync.
- **Version vectors:** track a per-replica counter so the system can tell whether two writes were concurrent or one causally followed the other, then surface genuine conflicts to the app or merge them.
- **CRDTs:** data types (counters, sets, sequences) mathematically designed so concurrent updates always merge deterministically without loss, used by Riak and collaborative editors.
- **Application merge:** hand both versions to business logic (shopping-cart union is the classic Dynamo example).

**Interview nuance:** do not answer with a CAP binary ("CP or AP"). Reason with **PACELC**: if there is a **P**artition, choose **A**vailability or **C**onsistency; **E**lse (normal operation) choose **L**atency or **C**onsistency. Dynamo-style stores are PA/EL (available and low-latency, at the cost of consistency); a single-leader RDBMS is PC/EC. Then name the **concrete anomaly** a user sees ("two edits from two regions, one silently overwrites the other under LWW"), which shows you reason about data, not letters.

```
SINGLE-LEADER          MULTI-LEADER              LEADERLESS (quorum)
 all writes -> L         L(us) <--> L(eu)          client -> W of N replicas
 no conflicts            local writes, but         reads <- R of N
 leader = write SPOF     concurrent conflicts      R + W > N => overlap
```

Recap: single-leader avoids conflicts but has a write SPOF; multi-leader enables multi-region writes at the cost of write-write conflicts; leaderless uses R + W > N quorums (plus sloppy quorums, hinted handoff, read repair, and Merkle trees) for availability; resolve conflicts with LWW (lossy), version vectors, CRDTs, or app merge, and reason with PACELC and named anomalies rather than CAP.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the replication + consistency scheme for a globally-used note app where two users may edit from different regions; state exactly which stale reads and conflicts are possible.

**Think about:**
- Where does each topology fit, and what conflicts does it create?
- How do quorum reads/writes (R + W > N) give strong-ish consistency?
- How is a write-write conflict resolved (LWW, version vectors, CRDT)?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a shared-notes app (Notion/Google Keep style) with users in multiple regions, where two people (or one person on two devices) may edit the same note near-simultaneously. Requirements: low-latency local edits worldwide, high availability, and no silently lost edits, because a vanished paragraph is the cardinal sin of a notes product. Notes are small documents; a few seconds of cross-region convergence is acceptable.

Topology: I choose **multi-leader** with one leader per region so every user gets **local write latency** and the app keeps working per-region during a cross-region partition. This directly creates the anomaly I must design for: two regions can accept concurrent edits to the same note, so **write-write conflicts** are possible, and until replication propagates, a reader in region A sees a **stale** version relative to a just-made edit in region B.

Conflict resolution: I refuse last-write-wins on wall-clock timestamps, because it would silently drop one user's concurrent paragraph and depends on synced clocks. For the note **body** I model the document as a **CRDT** (a sequence CRDT like RGA/LSEQ, as Yjs/Automerge implement), so concurrent inserts and deletes from both regions **merge deterministically without loss**, which is exactly the guarantee a notes product needs. For coarse metadata where a real either/or choice exists (note archived vs active), I keep **version vectors** to detect true concurrency and apply a defined rule or surface the conflict. This gives me convergence (all replicas end identical) plus intention preservation (nobody's text is dropped).

Consistency framing: I reason with PACELC. Under a partition I favor **availability** (regions keep accepting edits), and in normal operation I favor **latency** (local writes), so this is a PA/EL system. That is acceptable precisely because the CRDT removes the usual downside of choosing availability, namely lost updates. The stale reads I am explicitly accepting: a reader may briefly see a note without the other region's latest edit; convergence happens within seconds via replication and read repair.

Common wrong turn: promising a single global consistent view with LWW to "keep it simple," which under concurrent cross-region edits silently discards one editor's changes, the one failure a notes app cannot ship. If the product truly required a single serialized truth, I would instead pick single-leader and pay the cross-region write latency, and I would say so explicitly rather than pretend multi-leader is conflict-free.

**Self-check rubric:**
- [ ] Chose a topology (multi-leader) and justified it by the local-write / multi-region requirement
- [ ] Named the exact anomalies: concurrent write-write conflicts and stale cross-region reads
- [ ] Rejected LWW-on-wall-clock and justified CRDT (or version vectors) for lossless merge
- [ ] Reasoned with PACELC and stated the PA/EL choice rather than a CAP binary
- [ ] Flagged the wrong turn (LWW silently dropping a concurrent edit) explicitly

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the replication and consistency model for a DynamoDB-style shopping cart backing a large e-commerce site: N=3 replicas per key, writes must never be rejected (an "add to cart" always succeeds even during a node or network failure), and a user must never lose an item they added from two devices.

**Model answer (revealed on demand):**

Assumptions: this is the original Dynamo use case. "Add to cart" is a high-value, high-availability write that must succeed even during failures, and losing an added item costs revenue. Carts are small, per-user, and tolerate brief inconsistency across devices.

Topology and quorum: **leaderless** with N=3. To guarantee writes never fail even when replicas are down, I set **W=1** (or use a **sloppy quorum with hinted handoff** so a write lands on a stand-in node when a home replica is unavailable, then hands off on recovery). Reads use **R** tuned to the freshness I want; if I want R + W > N I would raise W or R, but the availability requirement means I prioritize accepting the write over strict overlap, and I lean on conflict resolution plus read repair to converge.

Conflict resolution is the crux, and LWW is wrong here: two devices adding different items concurrently would, under LWW, keep only one cart version and **drop the other item**. Instead I model the cart as an **add-wins set / CRDT** (or use version vectors and merge at read time by **unioning** the items across sibling versions, which is exactly what Dynamo did). Concurrent adds from two devices produce two siblings that merge to a cart containing **both** items, so no add is lost. Removes are the subtle case: a naive union resurrects deleted items, so I use tombstones or an OR-Set CRDT so a delete beats a concurrent stale add.

Availability and convergence: sloppy quorum plus hinted handoff keeps "add to cart" succeeding during a partition; **read repair** and **Merkle-tree anti-entropy** converge the replicas afterward. In PACELC terms this is PA/EL: available and low-latency, accepting temporary inconsistency, which is correct because the merge semantics make that inconsistency non-lossy.

Key tradeoff: I accept transient divergence and the complexity of sibling merges in exchange for a cart that never rejects a write and never loses an item. Common wrong turn: LWW on the whole cart object, which meets the availability bar but violates the "never lose an added item" requirement the moment a user adds from two devices at once.

### sd-l3-replication-lag-session: Replication Lag & Session Guarantees

- **id:** `sd-l3-replication-lag-session`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** session-guarantees, replication-lag

#### Learn

Replication lag is not an abstract metric; it shows up as concrete, infuriating user bugs. You post a comment, the write hits the leader, your refresh reads a lagging replica that has not received it yet, and **your comment vanishes**. The fix is not "make replication synchronous everywhere" (too slow and defeats the point of replicas). The fix is to provide the specific, cheap **session guarantee** that the buggy interaction actually needs. There are four, and matching a bug to its guarantee is the skill:

- **Read-your-writes (read-after-write):** after you write something, *you* always see it. Violated by the vanishing-comment bug. Note it only promises the writer sees their own write, not that others do.
- **Monotonic reads:** you never see time go backwards. If read 1 shows a comment and read 2 (hitting a more-lagged replica) does not, the comment appears to un-happen. This is the "refresh and content disappears, refresh again and it comes back" flicker.
- **Monotonic writes:** your own writes are applied in the order you issued them (write A then write B never lands as B then A on a replica).
- **Writes-follow-reads (causal):** if you read X and then write Y in reaction, everyone who sees Y also sees X (a reply never appears before the comment it replies to).

Two implementation techniques cover most cases:

**Sticky routing to the leader.** For a bounded window after a user writes (say 10 to 30 seconds, or until the write is known to have propagated), route *that user's* reads to the leader or to a replica known to be caught up. Simplest read-your-writes fix. The catch is it is per-connection/per-session, so it breaks across devices: you write on your phone, read on your laptop with a different session, and the laptop still hits a lagging replica.

**Version tokens (logical timestamps).** On a write, the leader returns a **version token** (a log sequence number / LSN, a commit timestamp, or an opaque cursor). The client stores it and sends it with subsequent reads. The read path then **waits for a replica to catch up to that token** (or picks a replica already past it) before serving. This bounds staleness precisely and works **across devices** if the token travels with the user (in a cookie, the session store, or the client). It is how you get read-your-writes without pinning everything to the leader.

**Interview nuance:** be clear that these guarantees are **strictly weaker than linearizability**. Linearizability means a single, global, real-time order that every client agrees on; it is expensive (consensus, leader round trips, or reading from the leader with a read lease). Session guarantees only constrain what a *single session or causal chain* observes. The senior move is recognizing that the product almost never needs global linearizability; it needs "the user sees their own action," which read-your-writes delivers far more cheaply. Reserve linearizability for the few operations that truly need it (a uniqueness constraint, a distributed lock, a "claim this seat" check), and use session guarantees for the rest.

```
user writes comment -> LEADER (LSN=1042)  --returns token 1042-->
   later read carries token 1042 ->
      pick replica whose applied LSN >= 1042, else wait/route to leader
   => the write is never missing for this user (read-your-writes)
```

Recap: replication lag causes user-visible bugs, each of which violates a specific session guarantee (read-your-writes, monotonic reads, monotonic writes, writes-follow-reads); implement them with sticky routing to the leader (simple, single-device) or version tokens that make reads wait for a replica to catch up (works cross-device), and remember these are weaker than linearizability but usually exactly what the product needs.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Add read-your-writes and monotonic-reads guarantees to a read-replica architecture where a user writes to the primary and reads from lagging replicas.

**Think about:**
- Which session guarantee does each user-visible bug violate?
- How do sticky routing and version tokens implement them?
- Why are these weaker than linearizability but often exactly enough?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: single-leader Postgres with async read replicas lagging typically < 500ms but spiking to a few seconds under load. Users write to the primary and read from the replica pool via a load balancer. Two reported bugs: (1) a user posts a comment and it is missing right after (read-your-writes violation), and (2) rapid refreshes make content appear, vanish, then reappear (monotonic-reads violation).

Bug 1, read-your-writes: after a user's write, that user must see it. I implement it primarily with **version tokens**. When the app writes to the primary, I capture the commit position (`pg_current_wal_lsn()` on the primary, or a logical commit timestamp) and store it in the user's session (cookie or session store). On subsequent reads I compare the token against each replica's applied LSN (`pg_last_wal_replay_lsn()`), and route the read to a replica that has caught up past the token, falling back to the primary if none has within a short wait. This bounds staleness exactly and, because the token lives in the session, it also works across devices if the session travels with the user. As a simpler first cut I can use **sticky routing**: for ~15 seconds after any write, send that user's reads to the primary. It is trivial but single-device and adds primary load, so I prefer the token approach for anything cross-device.

Bug 2, monotonic reads: the flicker happens because successive reads land on replicas at different lag, so the timeline jumps backward. The fix is to ensure a given user's reads never move to a *more stale* replica. Practically: pin a user's session to a **specific replica** (consistent hashing on user/session id) so they read from one timeline, and/or carry a **high-water-mark token** of the newest data the user has already seen and refuse to serve a read from a replica behind that mark (wait or reroute). Either way the user's observed position is monotonic.

Why not just linearize everything: global linearizability would require reading from the primary or a consensus read lease on every request, throwing away the read scaling that replicas exist to provide. These bugs do not need a global real-time order; they need each *session* to see a consistent, non-regressing view of its own actions, which read-your-writes and monotonic reads give for the cost of a token comparison.

Common wrong turn: promising read-your-writes while still round-robining reads across async replicas with no routing or token, which is exactly the architecture that produced the bug.

**Self-check rubric:**
- [ ] Correctly mapped each bug to its guarantee (vanishing write = read-your-writes; flicker = monotonic reads)
- [ ] Implemented read-your-writes with a version token (LSN/timestamp) and/or sticky-to-primary routing
- [ ] Addressed the cross-device limitation of sticky sessions with a session-carried token
- [ ] Implemented monotonic reads by pinning to one replica or refusing to read behind a high-water mark
- [ ] Justified why session guarantees suffice instead of paying for linearizability

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the session-consistency layer for Twitter/X-style posting and timeline reads at 400k read QPS off async replicas, where a user posts from their phone and immediately opens the same account on their laptop, and neither device may ever show the tweet as missing.

**Model answer (revealed on demand):**

Assumptions: single-leader-per-shard writes with a large async replica fleet serving 400k timeline QPS. The hard requirement is **cross-device read-your-writes**: post on phone, open laptop (different session, likely different replica), and the tweet must be present. Sticky-to-primary routing alone fails here because the laptop is a different session hitting a different replica, and pinning 400k QPS to primaries would collapse the read tier.

Design: on a successful post, the write path returns a **version token** (the shard's commit LSN or a global logical timestamp from something like a TrueTime/HLC clock). I persist this token **against the user account**, not just the browser session, in a fast store (Redis keyed by user id, or the user's auth/session record). Now any device for that user, on its next timeline read, fetches the user's latest token and includes it. The read router selects a replica whose applied position is **>= the token**, or briefly waits for one, or falls back to the primary only for that specific user's request. Because the token is account-scoped, the laptop honors the phone's write, delivering cross-device read-your-writes without pinning the whole fleet.

Scaling it: the token check is a cheap comparison against replica-reported LSNs (replicas heartbeat their applied position to the router). The vast majority of the 400k QPS carry a token already satisfied by most replicas (lag is normally sub-second), so they route normally with no wait; only reads whose token is newer than a candidate replica pay a small wait or a primary fallback, which is a tiny fraction. I also apply **monotonic reads** by keeping the user's high-water token advancing so their timeline never regresses across refreshes.

Key tradeoff: I spend one small per-user token write on the hot post path and a token comparison on reads to buy cross-device correctness, instead of buying it with primary reads (which does not scale) or global linearizability (which is unnecessary here). Common wrong turn: relying on sticky sessions, which silently works in single-device testing and then shows the missing-tweet bug the instant the user switches devices.
