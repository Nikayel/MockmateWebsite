/**
 * System Design — Level 3: Scaling the Data Tier.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l3-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L3. 16 lessons across 5
 * modules (sd-l3-m1..m5). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const readReplicasTeach = `
## The first, cheapest lever for a read-heavy database

When a read-heavy database saturates one machine, replication is the first lever you reach for,
before any sharding, because it is operationally cheap and non-disruptive. The dominant pattern is
**single-leader (primary/replica) replication**: every write goes to one leader, the leader streams
its change log to N followers, and reads fan out across the followers. This scales **reads** linearly
with follower count. It does **not** scale writes: every follower must apply every write, so the
leader's write throughput is still the ceiling. That asymmetry is the whole point to internalize.
Adding replicas buys read capacity and read-path fault tolerance, nothing more.

### How the leader waits for followers

The core tradeoff trades durability and read freshness against write latency:

- **Asynchronous:** the leader commits and acks the client without waiting for any follower. Lowest
  write latency, highest throughput, but if the leader dies before a write reaches a follower, that
  write is lost, and followers can lag arbitrarily.
- **Synchronous:** the leader waits for a follower to confirm before acking. No data loss on leader
  failure for the confirmed write, but write latency now includes a round trip, and if the sync
  follower stalls, writes block entirely.
- **Semi-synchronous (the usual production choice):** exactly one follower is synchronous and the
  rest are async. You get "the write survives on at least two nodes" durability without gating on all
  of them.

The number you must instrument is **replication lag**: how far behind, in seconds or bytes/LSN, each
follower is. Under async replication lag is usually milliseconds but spikes to seconds under write
bursts, long-running follower queries, or network hiccups. Lag is what makes replica reads **stale**,
and stale reads are the source of the session-guarantee bugs covered later in this module. Route
lag-sensitive reads (a user checking data they just wrote) to the leader or to a follower whose lag
you have bounded.

### Adding capacity online

Provision a new follower, let it restore from a snapshot and catch up from the leader's log, then add
it to the load balancer's pool once its lag is near zero. No downtime, no application change. This is
how you take a CPU-bound primary from "melting" to "comfortable" in an afternoon.

**Interview nuance:** be crisp about when replication stops helping. It stops when (a) **write**
throughput exceeds one leader (every replica already does all the writes, so more replicas do not
help), or (b) the **dataset** no longer fits or fits poorly on one node. Both force **sharding**.
Replicas also do not remove the leader as a single point of failure for writes: you need automated
failover (Patroni, Orchestrator, or a managed service) to promote a follower, and that introduces its
own split-brain and lost-write risks.

\`\`\`
        writes            +--> follower 1 --\\
client --------> LEADER --+--> follower 2 ---+--> read LB --> reads
                          +--> follower 3 --/
   writes bottleneck at leader; reads scale with follower count
\`\`\`

Recap: single-leader replication scales reads by fanning them across followers but never scales
writes; choose async, sync, or semi-sync by trading write latency against durability and staleness,
watch replication lag, add followers online for zero-downtime read capacity, and shard once writes or
dataset size outgrow one leader.
`.trim()

const replicationTopologiesTeach = `
## Each topology buys a capability by exposing an anomaly

Once one leader is not enough (you need multi-region writes, or you want no write SPOF), you choose
among three **replication topologies**, and each one buys a capability by exposing a specific class
of anomaly. Knowing which anomaly you are signing up for is the whole skill.

**Single-leader:** all writes go through one node, which serializes them, so there are **no
write-write conflicts**, and it is the easiest to reason about. The costs are that the leader is a
write SPOF (failover is required and risky) and cross-region writers pay the latency to reach the one
leader's region. This is the default for most OLTP systems.

**Multi-leader:** several leaders (typically one per region) each accept writes and replicate to the
others. This gives **low-latency local writes** everywhere and survives a region outage for writes.
The price is brutal: two leaders can accept **conflicting writes** to the same key concurrently, and
you must define how to merge them. Use it when local write latency or offline/multi-datacenter
operation genuinely requires it, not by default.

**Leaderless (Dynamo-style):** any replica accepts a write, and the client (or a coordinator) writes
to and reads from multiple replicas. Cassandra, DynamoDB, and Riak work this way. Consistency comes
from **quorums**: with N replicas, if you require W replicas to ack a write and R to answer a read,
then **R + W > N** guarantees the read set and write set overlap on at least one node, so a read sees
the latest acked write. Common config is N=3, W=2, R=2. Tuning W and R trades consistency against
availability and latency: W=1 is fast but weakly durable, R=1 can read stale data.

Two more leaderless mechanics interviewers probe. **Sloppy quorums with hinted handoff** keep the
system available during failures by letting writes land on temporary "stand-in" nodes when the home
replicas are down, then handing the data off when they recover; this trades consistency for
availability. **Anti-entropy** converges divergent replicas in the background: **read repair** fixes
stale replicas noticed during a read, and **Merkle trees** let two replicas efficiently find and
reconcile the exact ranges that differ.

### Conflict resolution: where these designs live or die

- **Last-write-wins (LWW):** pick the write with the highest timestamp, discard the rest. Simple, and
  Cassandra's default, but it **silently loses data** for concurrent writes and depends on clock
  sync.
- **Version vectors:** track a per-replica counter so the system can tell whether two writes were
  concurrent or causally ordered, then surface genuine conflicts to the app or merge them.
- **CRDTs:** data types (counters, sets, sequences) mathematically designed so concurrent updates
  always merge deterministically without loss.
- **Application merge:** hand both versions to business logic (shopping-cart union is the classic
  Dynamo example).

**Interview nuance:** do not answer with a CAP binary ("CP or AP"). Reason with **PACELC**: if there
is a **P**artition, choose **A**vailability or **C**onsistency; **E**lse (normal operation) choose
**L**atency or **C**onsistency. Dynamo-style stores are PA/EL; a single-leader RDBMS is PC/EC. Then
name the **concrete anomaly** a user sees ("two edits from two regions, one silently overwrites the
other under LWW"), which shows you reason about data, not letters.

\`\`\`
SINGLE-LEADER          MULTI-LEADER              LEADERLESS (quorum)
 all writes -> L         L(us) <--> L(eu)          client -> W of N replicas
 no conflicts            local writes, but         reads <- R of N
 leader = write SPOF     concurrent conflicts      R + W > N => overlap
\`\`\`

Recap: single-leader avoids conflicts but has a write SPOF; multi-leader enables multi-region writes
at the cost of write-write conflicts; leaderless uses R + W > N quorums (plus sloppy quorums, hinted
handoff, read repair, and Merkle trees) for availability; resolve conflicts with LWW (lossy), version
vectors, CRDTs, or app merge, and reason with PACELC and named anomalies rather than CAP.
`.trim()

const replicationLagSessionTeach = `
## Lag is not a metric, it is a user-visible bug

Replication lag shows up as concrete, infuriating user bugs. You post a comment, the write hits the
leader, your refresh reads a lagging replica that has not received it yet, and **your comment
vanishes**. The fix is not "make replication synchronous everywhere" (too slow and defeats the point
of replicas). The fix is to provide the specific, cheap **session guarantee** that the buggy
interaction actually needs. There are four, and matching a bug to its guarantee is the skill:

- **Read-your-writes (read-after-write):** after you write something, *you* always see it. Violated
  by the vanishing-comment bug. It only promises the writer sees their own write, not that others do.
- **Monotonic reads:** you never see time go backwards. If read 1 shows a comment and read 2 (hitting
  a more-lagged replica) does not, the comment appears to un-happen. This is the "refresh and content
  disappears, refresh again and it comes back" flicker.
- **Monotonic writes:** your own writes are applied in the order you issued them.
- **Writes-follow-reads (causal):** if you read X and then write Y in reaction, everyone who sees Y
  also sees X (a reply never appears before the comment it replies to).

### Two implementation techniques cover most cases

**Sticky routing to the leader.** For a bounded window after a user writes (say 10 to 30 seconds, or
until the write is known to have propagated), route *that user's* reads to the leader or to a replica
known to be caught up. Simplest read-your-writes fix. The catch is it is per-connection/per-session,
so it breaks across devices: you write on your phone, read on your laptop with a different session,
and the laptop still hits a lagging replica.

**Version tokens (logical timestamps).** On a write, the leader returns a **version token** (a log
sequence number / LSN, a commit timestamp, or an opaque cursor). The client stores it and sends it
with subsequent reads. The read path then **waits for a replica to catch up to that token** (or picks
a replica already past it) before serving. This bounds staleness precisely and works **across
devices** if the token travels with the user (in a cookie, the session store, or the client). It is
how you get read-your-writes without pinning everything to the leader.

**Interview nuance:** be clear that these guarantees are **strictly weaker than linearizability**.
Linearizability means a single, global, real-time order that every client agrees on; it is expensive
(consensus, leader round trips, or reading from the leader with a read lease). Session guarantees
only constrain what a *single session or causal chain* observes. The senior move is recognizing that
the product almost never needs global linearizability; it needs "the user sees their own action,"
which read-your-writes delivers far more cheaply. Reserve linearizability for the few operations that
truly need it (a uniqueness constraint, a distributed lock, a "claim this seat" check).

\`\`\`
user writes comment -> LEADER (LSN=1042)  --returns token 1042-->
   later read carries token 1042 ->
      pick replica whose applied LSN >= 1042, else wait/route to leader
   => the write is never missing for this user (read-your-writes)
\`\`\`

Recap: replication lag causes user-visible bugs, each violating a specific session guarantee;
implement them with sticky routing to the leader (simple, single-device) or version tokens that make
reads wait for a replica to catch up (works cross-device), and remember these are weaker than
linearizability but usually exactly what the product needs.
`.trim()

const partitioningStrategiesTeach = `
## Splitting past one machine

When one machine can no longer hold the dataset or absorb the write rate, the only real fix is
**horizontal partitioning** (sharding): split the rows across many nodes so each node owns a slice.
Contrast this with **vertical partitioning** (splitting a wide table into narrow ones by column) and
**functional partitioning** (giving each service its own database). Vertical and functional buy some
headroom, but only horizontal partitioning scales writes and dataset size without bound, so it is the
technique interviewers mean by "shard it."

The design choice is the **partition function**: given a key, which partition owns it. Three families
dominate.

**Range partitioning** assigns contiguous key ranges to partitions (users A to F on p0, G to M on p1;
or time ranges for events). Its superpower is **range scans**: "all orders from last Tuesday" touches
one or two partitions. Its curse is **hotspots on sequential keys**. If you range-partition by an
auto-increment ID or a timestamp, every new write lands on the highest partition, so one node absorbs
100% of the write traffic while the rest sit idle. This is the single most common partitioning
mistake.

**Hash partitioning** applies a hash to the key and assigns by the result (often
\`hash(key) mod N\`). It spreads load **evenly** and kills sequential hotspots, because adjacent keys
scatter. The cost is that you **lose efficient range queries**: "orders from last Tuesday" now fans
out to every partition (scatter-gather). The other trap is \`hash mod N\` specifically: change N (add
a node) and almost every key remaps, forcing a near-total reshuffle. Consistent hashing exists to fix
exactly that.

**Directory (lookup-based) partitioning** keeps an explicit routing table mapping key ranges or key
groups to partitions, maintained in a coordination service (ZooKeeper/etcd) or a metadata store. It
gives maximum flexibility: split a hot range, move a heavy tenant to its own node, rebalance
surgically. The price is an extra **lookup hop** on the request path and a routing service you must
keep highly available, since it is now on the critical path.

### Secondary indexes get partitioned too

A **local (document-partitioned) index** stores each partition's index alongside its own data, so a
query on a non-partition-key column must **scatter-gather** across all partitions and merge (DynamoDB
LSI, Elasticsearch by default). A **global (term-partitioned) index** partitions the index itself by
the indexed term, so a lookup hits one index partition, but writes must update an index partition
that may live on a different node, making writes slower and asynchronous (DynamoDB GSI). The index
does not live for free on one node.

**Interview nuance:** always map the dominant queries onto the partition scheme out loud. "This query
hits one partition, that one is scatter-gather bounded by the slowest node." Interviewers are
checking whether you know which reads got expensive, not just that you sprinkled the word "shard."

\`\`\`
RANGE                    HASH                     DIRECTORY
A-F | G-M | N-Z          h(k)%N spreads evenly    lookup table -> partition
+ range scans hit 1      + no sequential hotspot  + surgical rebalance/split
- seq keys = hot p       - range scan = fan-out   - extra hop + HA routing svc
\`\`\`

Recap: horizontal partitioning is the only way to scale writes and data past one node; range wins
range scans but hotspots on sequential keys, hash spreads evenly but loses ranges and reshuffles on
mod N, directory adds a flexible routing hop, and secondary indexes are either scatter-gather locals
or write-costly globals.
`.trim()

export const systemDesignLevel3: DesignLevel = {
  id: 3,
  slug: "scaling-data",
  title: "Level 3 — Scaling the Data Tier",
  tagline: "Replication, sharding, caching, CDN/search, and keeping derived data in sync at scale.",
  estimatedHours: 8,
  modules: [
    {
      id: "sd-l3-m1",
      title: "Replication",
      description:
        "Reach for replication as the cheapest read-scaling lever, pick the right topology (single-leader, multi-leader, leaderless) for the consistency and geography required, and fix lag-induced bugs with session guarantees.",
      lessons: [
        {
          id: "sd-l3-read-replicas",
          title: "Read Scaling with Replicas",
          summary:
            "Single-leader replication scales reads linearly but never writes; pick async/sync/semi-sync by durability vs latency, watch lag, and shard only when writes outgrow one leader.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["replication", "read-replicas", "scaling"],
          teach: {
            markdown: readReplicasTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-read-replicas-apply",
            prompt:
              "Design the read path for a product catalog serving 50k read QPS against a single Postgres primary that is CPU-bound; show how you add capacity without downtime.",
            thinkAbout: [
              "How does single-leader replication scale reads but not writes?",
              "What is the durability/latency tradeoff of sync vs async replication?",
              "When does replication stop helping and force sharding?",
            ],
            modelAnswerOutline: [
              "Assumptions: a product catalog is overwhelmingly read-heavy: 50k read QPS against a few hundred write QPS. The primary is CPU-bound on read query execution, and the catalog tolerates seconds of staleness for most reads.",
              "**Diagnosis first:** the write rate is tiny, so the CPU is being burned serving reads. Textbook case for read replicas, not sharding.",
              "**Design:** add three to five Postgres streaming replicas behind a read load balancer (ProxySQL, PgBouncer plus discovery, or an RDS/Aurora reader endpoint). Split connections: writes and read-your-writes-sensitive reads go to the primary; bulk catalog browse and product-detail reads go to the replica pool. At 50k QPS across five replicas, each handles ~10k QPS with headroom plus read-path redundancy.",
              "**Zero-downtime add:** replication is async or semi-sync (price edits do not need synchronous durability). Bring each replica up from a base backup, let it catch up from the WAL, and add it to the LB pool only once lag is under a threshold (< 1s). No schema change; the read/write connection split ships behind a flag.",
              "**Staleness handling:** browse tolerates lag. Two careful spots: (1) a seller who just edited their own product expects to see it (route that read to the primary or use a version token); (2) inventory/'in stock' flags where stale-high is a bad experience (serve from the primary or a low-lag replica). Monitor per-replica lag and auto-eject any replica exceeding the threshold.",
              "Common wrong turn: jumping straight to sharding. Sharding a read-bound, write-light catalog adds cross-shard complexity for no benefit, because sharding scales writes and dataset size, neither of which is the constraint here.",
            ],
          },
          practice: {
            id: "sd-l3-read-replicas-practice",
            prompt:
              "Design the read-scaling strategy for Shopify-style storefront reads where a flash sale drives 300k read QPS against product and inventory tables, replicas can lag up to 4 seconds during the write burst, and overselling inventory is a hard financial constraint.",
            thinkAbout: [
              "Which fields tolerate 4 seconds of staleness and which cannot tolerate any?",
              "How does a conditional atomic decrement make correctness independent of read freshness?",
              "What absorbs most of the 300k QPS before it ever reaches a replica?",
            ],
            modelAnswerOutline: [
              "Assumptions: a flash sale spikes reads 6x to 300k QPS and simultaneously spikes writes (checkouts decrementing inventory), which is exactly what pushes replica lag to 4s. Product metadata tolerates staleness; inventory and 'in stock' must not oversell.",
              "**Split the problem by field, not by table.** Product metadata reads (the vast majority) go to a large fleet of async read replicas fronted by a CDN/edge cache and Redis, since product data changes rarely. Most of the 300k never reaches a replica; the cache absorbs it. Replicas serve cache misses and fills, so 4s lag is fine because a 4-second-stale product title is harmless.",
              "**Inventory is the hard part and never comes from a lagging replica:** a stale-high count causes overselling, a real financial loss. Inventory reads on the checkout path go to the primary (or a synchronous replica), and the actual decrement is a conditional atomic write (`UPDATE ... SET qty = qty - 1 WHERE qty > 0` or a reservation row), so correctness does not depend on read freshness at all.",
              "**The 'only 3 left!' badge** can serve a slightly stale count from a replica because it is advisory; it never authorizes a sale. The authoritative check happens at checkout against the primary.",
              "**Protecting the primary under the burst:** put hot SKUs behind a per-SKU inventory service or Redis counter that is the source of truth during the sale and reconciles to Postgres, avoiding row-lock contention on the hottest rows.",
              "**The committed tradeoff:** accept 4s staleness for metadata (cheap, cacheable, high volume) while refusing any staleness for the money-correct inventory decrement. Common wrong turn: serving inventory from async replicas to shed load, trading a financial correctness guarantee for read capacity, and overselling during exactly the traffic spike the system was built for.",
            ],
          },
        },
        {
          id: "sd-l3-replication-topologies",
          title: "Replication Topologies & Consistency",
          summary:
            "Single-leader avoids conflicts, multi-leader buys local writes at the cost of write-write conflicts, leaderless uses R+W>N quorums; resolve conflicts losslessly and reason with PACELC.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["replication", "consistency", "conflict-resolution"],
          teach: {
            markdown: replicationTopologiesTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l3-replication-topologies-apply",
            prompt:
              "Design the replication + consistency scheme for a globally-used note app where two users may edit from different regions; state exactly which stale reads and conflicts are possible.",
            thinkAbout: [
              "Where does each topology fit, and what conflicts does it create?",
              "How do quorum reads/writes (R + W > N) give strong-ish consistency?",
              "How is a write-write conflict resolved (LWW, version vectors, CRDT)?",
            ],
            modelAnswerOutline: [
              "Assumptions: a shared-notes app with users in multiple regions, where two people (or one person on two devices) may edit the same note near-simultaneously. Requirements: low-latency local edits worldwide, high availability, and no silently lost edits, because a vanished paragraph is the cardinal sin of a notes product. A few seconds of cross-region convergence is acceptable.",
              "**Topology: multi-leader,** one leader per region, so every user gets local write latency and the app keeps working per-region during a cross-region partition. This directly creates the anomalies to design for: two regions can accept concurrent edits to the same note (write-write conflicts), and until replication propagates, a reader in region A sees a stale version relative to a just-made edit in region B.",
              "**Conflict resolution: refuse last-write-wins on wall-clock timestamps.** It would silently drop one user's concurrent paragraph and depends on synced clocks. For the note body, model the document as a sequence CRDT (RGA/LSEQ, as Yjs/Automerge implement), so concurrent inserts and deletes from both regions merge deterministically without loss: exactly the guarantee a notes product needs. For coarse metadata with a real either/or choice (archived vs active), keep version vectors to detect true concurrency and apply a defined rule or surface the conflict.",
              "**Consistency framing with PACELC:** under a partition favor availability (regions keep accepting edits); in normal operation favor latency (local writes). A PA/EL system, acceptable precisely because the CRDT removes the usual downside of choosing availability, namely lost updates. The stale reads explicitly accepted: a reader may briefly see a note without the other region's latest edit; convergence happens within seconds via replication and read repair.",
              "Common wrong turn: promising a single global consistent view with LWW to 'keep it simple,' which under concurrent cross-region edits silently discards one editor's changes. If the product truly required a single serialized truth, pick single-leader and pay the cross-region write latency, and say so explicitly rather than pretend multi-leader is conflict-free.",
            ],
          },
          practice: {
            id: "sd-l3-replication-topologies-practice",
            prompt:
              "Design the replication and consistency model for a DynamoDB-style shopping cart backing a large e-commerce site: N=3 replicas per key, writes must never be rejected (an 'add to cart' always succeeds even during a node or network failure), and a user must never lose an item they added from two devices.",
            thinkAbout: [
              "What quorum settings and mechanisms keep a write succeeding when home replicas are down?",
              "Why does LWW on the whole cart object violate the never-lose-an-item requirement?",
              "What makes deletes the subtle case in a merge-by-union cart?",
            ],
            modelAnswerOutline: [
              "Assumptions: the original Dynamo use case. 'Add to cart' is a high-value, high-availability write that must succeed even during failures, and losing an added item costs revenue. Carts are small, per-user, and tolerate brief inconsistency across devices.",
              "**Topology and quorum: leaderless with N=3.** To guarantee writes never fail even when replicas are down, set W=1 or use a sloppy quorum with hinted handoff so a write lands on a stand-in node when a home replica is unavailable, handing off on recovery. Reads use R tuned to desired freshness; the availability requirement means prioritizing accepting the write over strict R + W > N overlap, leaning on conflict resolution plus read repair to converge.",
              "**Conflict resolution is the crux, and LWW is wrong here:** two devices adding different items concurrently would, under LWW, keep only one cart version and drop the other item. Instead model the cart as an add-wins set / CRDT (or use version vectors and merge at read time by unioning items across sibling versions, exactly what Dynamo did). Concurrent adds from two devices produce siblings that merge to a cart containing both items.",
              "**Removes are the subtle case:** a naive union resurrects deleted items, so use tombstones or an OR-Set CRDT so a delete beats a concurrent stale add.",
              "**Availability and convergence:** sloppy quorum plus hinted handoff keeps 'add to cart' succeeding during a partition; read repair and Merkle-tree anti-entropy converge replicas afterward. In PACELC terms: PA/EL, correct because the merge semantics make the temporary inconsistency non-lossy.",
              "Common wrong turn: LWW on the whole cart object, which meets the availability bar but violates 'never lose an added item' the moment a user adds from two devices at once.",
            ],
          },
        },
        {
          id: "sd-l3-replication-lag-session",
          title: "Replication Lag & Session Guarantees",
          summary:
            "Map each lag-induced bug to its session guarantee and fix it with sticky routing or version tokens, instead of over-promising linearizability.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["session-guarantees", "replication-lag"],
          teach: {
            markdown: replicationLagSessionTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-replication-lag-session-apply",
            prompt:
              "Add read-your-writes and monotonic-reads guarantees to a read-replica architecture where a user writes to the primary and reads from lagging replicas.",
            thinkAbout: [
              "Which session guarantee does each user-visible bug violate?",
              "How do sticky routing and version tokens implement them?",
              "Why are these weaker than linearizability but often exactly enough?",
            ],
            modelAnswerOutline: [
              "Assumptions: single-leader Postgres with async read replicas lagging typically < 500ms but spiking to seconds. Two reported bugs: (1) a user posts a comment and it is missing right after (read-your-writes violation); (2) rapid refreshes make content appear, vanish, then reappear (monotonic-reads violation).",
              "**Bug 1, read-your-writes via version tokens:** on a write to the primary, capture the commit position (`pg_current_wal_lsn()` or a logical commit timestamp) and store it in the user's session. On subsequent reads, compare the token against each replica's applied LSN (`pg_last_wal_replay_lsn()`) and route to a replica caught up past the token, falling back to the primary if none is within a short wait. This bounds staleness exactly and works across devices if the session travels with the user.",
              "**The simpler first cut, sticky routing:** for ~15 seconds after any write, send that user's reads to the primary. Trivial, but single-device and adds primary load, so prefer the token approach for anything cross-device.",
              "**Bug 2, monotonic reads:** the flicker happens because successive reads land on replicas at different lag, so the timeline jumps backward. Ensure a user's reads never move to a MORE stale replica: pin the session to a specific replica (consistent hashing on user/session id) so they read one timeline, and/or carry a high-water-mark token of the newest data the user has seen and refuse to serve a read from a replica behind that mark (wait or reroute).",
              "**Why not just linearize everything:** global linearizability would require reading from the primary or a consensus read lease on every request, throwing away the read scaling replicas exist to provide. These bugs need each session to see a consistent, non-regressing view of its own actions, which read-your-writes and monotonic reads deliver for the cost of a token comparison.",
              "Common wrong turn: promising read-your-writes while still round-robining reads across async replicas with no routing or token, which is exactly the architecture that produced the bug.",
            ],
          },
          practice: {
            id: "sd-l3-replication-lag-session-practice",
            prompt:
              "Design the session-consistency layer for Twitter/X-style posting and timeline reads at 400k read QPS off async replicas, where a user posts from their phone and immediately opens the same account on their laptop, and neither device may ever show the tweet as missing.",
            thinkAbout: [
              "Why does sticky-to-primary routing fail the phone-then-laptop case?",
              "Where must the version token live so any device can honor it?",
              "What fraction of reads actually pay a wait, and why is that fraction small?",
            ],
            modelAnswerOutline: [
              "Assumptions: single-leader-per-shard writes with a large async replica fleet serving 400k timeline QPS. The hard requirement is cross-device read-your-writes: post on phone, open laptop (different session, likely different replica), and the tweet must be present. Sticky-to-primary routing fails because the laptop is a different session, and pinning 400k QPS to primaries would collapse the read tier.",
              "**Design: account-scoped version tokens.** On a successful post, the write path returns a version token (the shard's commit LSN or a global logical timestamp from an HLC-style clock). Persist the token against the user account, not the browser session, in a fast store (Redis keyed by user id, or the auth/session record). Any device for that user fetches the latest token on its next timeline read and includes it.",
              "**The read router** selects a replica whose applied position is >= the token, or briefly waits for one, or falls back to the primary only for that specific user's request. Because the token is account-scoped, the laptop honors the phone's write, delivering cross-device read-your-writes without pinning the fleet.",
              "**Scaling it:** the token check is a cheap comparison against replica-reported LSNs (replicas heartbeat their applied position to the router). The vast majority of the 400k QPS carry a token already satisfied by most replicas (lag is normally sub-second), so they route normally with no wait; only reads whose token is newer than a candidate replica pay a small wait or a primary fallback: a tiny fraction. Keep the user's high-water token advancing for monotonic reads so the timeline never regresses across refreshes.",
              "**The tradeoff:** one small per-user token write on the hot post path and a token comparison on reads buys cross-device correctness, instead of buying it with primary reads (does not scale) or global linearizability (unnecessary).",
              "Common wrong turn: relying on sticky sessions, which silently works in single-device testing and then shows the missing-tweet bug the instant the user switches devices.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l3-m2",
      title: "Partitioning & Sharding",
      description:
        "Split a dataset or write rate past one machine: pick a partition strategy that survives skew, rebalance with consistent hashing, choose shard keys that dodge the celebrity problem, and design correct cross-shard operations.",
      lessons: [
        {
          id: "sd-l3-partitioning-strategies",
          title: "Partitioning Strategies: Range vs Hash vs Directory",
          summary:
            "Range wins range scans but hotspots on sequential keys, hash spreads evenly but loses ranges, directory adds a flexible routing hop; map every dominant query to its partitions.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["partitioning", "sharding", "skew"],
          teach: {
            markdown: partitioningStrategiesTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l3-partitioning-strategies-apply",
            prompt:
              "Design the partitioning scheme for a 20 TB messaging store doing 200k writes/sec; pick a partition strategy and defend it against skew.",
            thinkAbout: [
              "What does range vs hash vs directory partitioning optimize and cost?",
              "How do local vs global secondary indexes work across partitions?",
              "How does each query map to partitions?",
            ],
            modelAnswerOutline: [
              "Assumptions: a chat/messaging store. Dominant write: append a message to a conversation. Dominant read: load the last N messages of a conversation. Secondary read: load a user's conversation list. 20 TB and 200k writes/sec are far past one node: real horizontal sharding, 40+ partitions for headroom (each ~500 GB and ~5k writes/sec).",
              "**Shard by hash of conversation_id.** High cardinality, so hashing spreads the 200k writes evenly instead of piling on the newest partition. Critically it co-locates all messages of one conversation on one partition, so the hot-path read ('last N messages') is a single-partition ordered scan, not scatter-gather. Within a partition, cluster by (conversation_id, message_id) with a time-sortable Snowflake message_id, so 'last N' is a cheap reverse range scan.",
              "**Why not range partition by timestamp:** timestamp ranges would send every new message to the single highest partition, recreating a one-node write bottleneck at exactly 200k/sec. That is the skew failure being defended against; hashing eliminates it.",
              "**The user conversation-list query** must not scatter-gather 40 partitions on every app open, so maintain a global secondary index (or separate table) keyed by user_id, updated when a conversation is created or a message arrives. It costs a cross-partition write on new-conversation events but turns a frequent read into a single-partition lookup. Message search, which is rare, goes to Elasticsearch with a local index, accepting scatter-gather there.",
              "**Residual skew acknowledged:** a huge active channel can still hot-spot one partition; mitigate by sub-partitioning very hot conversations with a bucket suffix.",
              "Common wrong turn: range-partitioning by timestamp 'so recent messages are together,' which concentrates 100% of writes on one partition and defeats the entire point of sharding.",
            ],
          },
          practice: {
            id: "sd-l3-partitioning-strategies-practice",
            prompt:
              "Design the partitioning scheme for Stripe-style payment events at 50 TB and 300k events/sec, where the two dominant access patterns fight each other: (1) low-latency single-object reads by event_id, and (2) an analytics/reconciliation job that must scan 'all events for merchant M in a date range.' Pick a scheme and defend it against both skew and the range-scan requirement.",
            thinkAbout: [
              "How can one scheme serve both hash-friendly point reads and range-friendly merchant scans?",
              "What does a whale merchant at 40% of volume do to its partition, and what splits it?",
              "How does encoding routing information into the event_id avoid a fan-out?",
            ],
            modelAnswerOutline: [
              "Assumptions: events are immutable, write-once appends, each belonging to a merchant with a timestamp. Pattern 1 is high-QPS point reads on the serving path; pattern 2 is a lower-QPS but heavy scan for reconciliation and dashboards.",
              "**Resolve the conflict with a compound key:** `hash(merchant_id)` for partition placement, and within a partition a clustering order of (merchant_id, event_time, event_id). Hashing merchant_id spreads the 300k/sec and prevents a timestamp hotspot; co-locating a merchant's events on one partition, sorted by time, turns pattern 2 into a single-partition ordered range scan instead of a 40-way scatter-gather.",
              "**Point reads by event_id** go through a global secondary index (event_id to partition), or encode merchant_id into the event_id so the read routes directly, avoiding fan-out.",
              "**Whale defense:** a marketplace doing a huge share of volume hotspots its partition. Detect high-volume merchants and sub-partition them with a bucket in the key (merchant_id:bucket, bucket = hash(event_id) mod K), spreading the whale across K partitions. The reconciliation scan then reads K buckets and merges: bounded and acceptable because that job is not latency-critical.",
              "**Store choice:** a wide-column store (Cassandra/ScyllaDB or DynamoDB) whose native partition-key plus clustering-key model expresses exactly this.",
              "**The committed tradeoff:** optimize the frequent merchant range scan and even write spread; pay for point reads with a global index hop and for whales with explicit sub-partitioning, rather than pretending one flat key serves both patterns for free.",
            ],
          },
        },
      ],
    },
  ],
}
