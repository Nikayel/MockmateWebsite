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

const consistentHashingTeach = `
## Why hash mod N is the wrong primitive

The naive way to place keys across N nodes is \`node = hash(key) mod N\`. It spreads load evenly, and
it is a disaster the moment N changes. Go from 10 nodes to 11 and the modulus changes for almost
every key, so roughly **10 of 11 keys map to a different node**. For a cache that means a near-total
miss storm that stampedes the database; for a database it means moving nearly the whole dataset to
add one machine. Since adding and removing nodes is the entire point of horizontal scale, mod N is
the wrong primitive.

### The ring

**Consistent hashing** fixes the remap cost. Imagine a ring of hash values from 0 to 2^32 - 1. Hash
each **node** to a position on the ring, and hash each **key** to a position too. A key is owned by
the **first node clockwise** from its position. Now add a node: it lands somewhere on the ring and
takes over only the keys between it and its counter-clockwise neighbor. Remove a node: its keys pass
to the next node clockwise. Either way you move only about **1/N of the keys**, and only between
adjacent nodes, instead of remapping the world. This is why Dynamo, Cassandra, Riak, and most
distributed caches are built on it.

Plain consistent hashing has two problems. First, with few nodes the ring is lumpy: random placement
means some nodes own huge arcs and others tiny ones, so load is uneven (a 2x imbalance is easy).
Second, when a node leaves, all its load dumps onto a single neighbor rather than spreading.

### Virtual nodes, bounded load, and rendezvous

**Virtual nodes (vnodes)** solve both. Instead of one point per physical node, give each physical
node **many tokens** (say 128 or 256) hashed to many ring positions. Now each physical node owns many
small arcs scattered around the ring, so load smooths out toward even, and when a node fails its many
arcs are inherited by **many different neighbors**, spreading the rebalance rather than crushing one
node. Vnodes also give you **weighting**: a machine with 2x the RAM simply gets 2x the tokens.

**Bounded-load consistent hashing** adds a cap: each node may hold at most \`(1 + epsilon)\` times
the average load. When a key's target node is already at its cap, placement spills to the next node
clockwise. This bounds hotspots at the cost of some keys not living on their "natural" node. Reach
for it when even vnodes leave a hot node.

**Rendezvous hashing (highest-random-weight, HRW)** is a simpler alternative for some jobs: to place
a key, compute \`hash(key, node)\` for every node and pick the highest. Same minimal-movement
property without maintaining a ring, and selecting the top-k replicas is trivial (take the k
highest). The tradeoff is O(N) per lookup, so it suits smaller or bounded node sets, like choosing
replicas or a load-balancer backend, rather than a thousand-node ring.

**Interview nuance:** the phrase to earn is "only ~1/N keys move." If you are asked how a cache
cluster survives a node loss and you say hash mod N, you have just described the failure. Say
consistent hashing with vnodes, quantify the movement, and note that replicas are placed on the next
distinct physical nodes clockwise.

\`\`\`
hash mod N: add node -> ~all keys remap  (miss storm / full reshuffle)

consistent hash ring (with vnodes):
      [n2]...[n1]
     /            \\      key -> first node clockwise
  [n3]    o key    [n1]  add node: steals ~1/N keys from one arc
     \\            /      vnodes: many small arcs -> even load, spread rebalance
      [n2]...[n3]
\`\`\`

Recap: hash mod N remaps nearly every key on resize; consistent hashing moves only ~1/N and only
between neighbors; virtual nodes smooth load, spread rebalancing, and enable weighting; bounded-load
caps hotspots; and rendezvous hashing is a ring-free alternative for small replica-selection cases.
`.trim()

const shardKeyHotspotsTeach = `
## The decision you cannot cheaply undo

Consistent hashing spreads keys evenly *given* good keys. The shard key itself is the higher-leverage
decision, and it is the one you cannot cheaply undo. A bad shard key silently rebuilds a single-node
bottleneck inside your distributed system, and changing it later means migrating the whole dataset.

A good shard key has three properties. **High cardinality:** many distinct values, so load can
actually spread. Sharding by \`country\` or \`status\` (a handful of values) means a handful of
partitions, and one value dominates. **Even access distribution:** not just many values, but roughly
uniform *traffic* per value. A high-cardinality key where 1% of values get 99% of reads is still a
hotspot. **Alignment to the dominant query:** the key the most frequent/critical query filters on, so
that query hits one partition instead of scatter-gathering across all of them.

These pull against each other, which is the whole difficulty. \`user_id\` gives high cardinality and
even spread but forces "all posts in this group" to scatter-gather. \`group_id\` co-locates a group's
posts for cheap reads but hotspots a giant group. Naming the tension and committing to a side
(usually: align to the dominant query, then mitigate the resulting hotspot) is the senior move.

### The celebrity / hot-key problem

Shard a social graph by \`user_id\` and one celebrity with 100M followers and 1000x normal traffic
maps to **one** partition, which then owns 1000x the load of its peers. No amount of consistent
hashing helps: it is one key, so it is one node. Mitigations, roughly in order of reach:

- **Salting / key-splitting:** append a bucket suffix to spread one logical key across K physical
  partitions (\`celebrity_id:0..K-1\`). Writes pick a random bucket; reads fan out to all K and
  merge. Use it for the few known whales, not everyone.
- **Sub-partitioning:** split a hot partition's range into finer ranges dynamically when it exceeds a
  load threshold (DynamoDB adaptive capacity and split-for-heat do this for you).
- **Dedicated shards for whales:** route known celebrities/mega-tenants to their own isolated nodes
  so their traffic cannot starve normal users. Common in multi-tenant SaaS.
- **Caching + fan-out-on-read:** for a celebrity's timeline, cache aggressively and read the
  celebrity's posts at read time rather than fanning out writes to 100M follower inboxes (the classic
  Twitter hybrid).

**Entity groups / co-location:** deliberately put data that is transacted together on the same
partition so common operations stay single-shard (Google Megastore's entity groups, and the reason
you shard an e-commerce order and its line items together by \`order_id\`).

**Compound keys** serve multi-tenancy: \`(tenant_id, entity_id)\` isolates tenants (a tenant's data
is co-located) while entity_id preserves cardinality within a tenant. Combine with dedicated shards
for the biggest tenants.

**Interview nuance:** always say resharding is expensive and must be planned *before* you need it.
Pre-split into more logical partitions than nodes (e.g. 1024 logical shards on 16 physical nodes) so
growth is a cheap remap of logical-to-physical, not a re-key. And design **online migration**:
double-write to old and new, backfill, verify, then cut over reads, so you never take downtime to
reshard.

Recap: a good shard key is high-cardinality, evenly accessed, and aligned to the dominant query; the
celebrity problem defeats plain hashing because one key is one node, so mitigate with salting,
sub-partitioning, or dedicated shards; use entity groups and compound keys to keep transactions
single-shard; and plan resharding and online migration early.
`.trim()

const crossShardOpsTeach = `
## Sharding breaks joins and atomic multi-key writes

Sharding buys scale by breaking two things you took for granted on a single database: **joins** and
**atomic multi-key writes**. Once related rows can live on different nodes, a query that spans them
is a distributed operation, and a write that must change both is a distributed transaction.

### Cross-shard reads (scatter-gather)

A query that is not scoped to one shard key must fan out to every partition, and it is bounded by the
**slowest shard**, not the average. This is **tail latency amplification**: if each shard's p99 is
10ms and you hit 50 shards, the chance that *at least one* is slow approaches certainty, so the
overall p99 is far worse than 10ms. Mitigations: avoid the fan-out by choosing the shard key to match
the query, **denormalize** so the data you need is co-located, cap the fan-out width, and use
hedged/speculative requests to blunt single-shard tail latency. The senior instinct is to design most
reads to touch one shard and treat scatter-gather as the rare, budgeted case.

### Cross-shard writes: avoid 2PC on the hot path

The textbook answer is **two-phase commit (2PC)**: a coordinator asks all participants to *prepare*
(lock and promise), and if all vote yes, tells them to *commit*. It gives atomicity, and you should
know it, but **avoid it on the hot path**. 2PC holds locks across a network round trip, so it kills
throughput, and it is **blocking**: if the coordinator dies after prepare, participants sit holding
locks indefinitely, unsure whether to commit or abort. It is defensible only for low-frequency,
must-be-atomic operations, and modern systems (Spanner, CockroachDB) make it viable only by pairing
it with tight clock/consensus machinery you do not want to hand-roll.

### Sagas: the standard replacement

A saga breaks the operation into a sequence of **local** transactions, each on one shard, and for
every step defines a **compensating action** that semantically undoes it. If a later step fails, you
run the compensations for the completed steps in reverse. A money transfer becomes: debit A (local),
credit B (local); if credit fails, compensate by re-crediting A. You give up isolation (intermediate
states are visible, so you design for them, e.g. a "pending" balance) in exchange for no distributed
locks and independent, available shards. Sagas are **orchestrated** (a central coordinator drives
steps, easier to reason about and monitor) or **choreographed** (each step emits an event the next
reacts to, more decoupled but harder to trace).

Two patterns make sagas safe under real-world **at-least-once** delivery:

- **Idempotency keys.** Every step carries a unique key; the receiving shard records processed keys
  and **dedups retries**, so replaying "credit B" after a timeout does not double-credit.
- **The outbox pattern.** The problem: you must both write the DB row *and* publish an event, but
  they are separate systems, so a crash between them loses one. The fix: in the **same local
  transaction**, write the business row and an "outbox" row; a separate relay reads the outbox and
  publishes to Kafka, marking rows sent. Now the DB write and the intent-to-publish are atomic, and
  the relay retries publishing idempotently. This is how you drive a saga's next step reliably.

**Interview nuance:** the failure mode interviewers hunt for is hand-waving cross-shard joins and
multi-key writes as if they were free. When the design crosses shards, say it: "this is now a
distributed transaction; I will use a saga with compensations and idempotency keys, not 2PC on the
hot path, and I will denormalize to keep the frequent reads single-shard."

Recap: sharding breaks joins (scatter-gather, bounded by the slowest shard) and atomic multi-key
writes; avoid 2PC on the hot path because it locks and blocks on coordinator failure; use a saga of
local transactions with compensating actions, make retries safe with idempotency keys, publish events
atomically with the outbox pattern, and denormalize to avoid cross-shard joins.
`.trim()

const cachingPatternsTeach = `
## A cache is a bet, and the bet needs terms

A cache is a bet that the same data will be read many times before it changes. Getting the bet right
means choosing how reads populate the cache, how writes keep it honest, and how stale entries leave.
Get it wrong and you serve wrong data or you overload the database you were trying to protect.

### The read path

**Cache-aside (lazy loading)** is the default in almost every real system. The application checks the
cache; on a hit it returns; on a miss it loads from the database, writes the value back into the
cache, and returns it. Only requested data is ever cached (no wasted memory), and a cache outage
degrades to slower DB reads rather than an outage. The downside is that every cold key pays one miss,
and your app code owns the population logic. **Read-through** hides that logic behind the cache
client, which is cleaner but couples you to a client that understands your data source.

### The write path, where the real tradeoffs live

- **Write-through:** every write goes to the cache and the database synchronously before the write
  returns. The cache is always consistent with the DB, but every write pays two hops of latency, and
  you cache data that may never be read again.
- **Write-back (write-behind):** the write updates the cache and returns immediately, and the cache
  flushes to the DB asynchronously in batches. Lowest write latency, absorbs bursts, but you now own
  a durability risk: if the cache node dies before the flush, those writes are gone. Use it only
  where some loss is tolerable (view counts, metrics).
- **Write-around:** writes go straight to the DB and skip the cache, so the cache fills only on the
  next read. Avoids polluting the cache with write-once data, at the cost of a guaranteed miss on
  freshly written keys.

The most common pattern in practice is **cache-aside for reads plus invalidate-on-write**: on a
write, update the DB and then delete (not update) the cache key, so the next read re-populates from
the source of truth. Deleting rather than updating avoids a subtle race where two concurrent writers
leave a stale value behind.

### Expiry, sizing, and the numbers

Every entry gets a **TTL**, and you add **jitter** (say 300s plus or minus a random 30s) so a cohort
of keys written together does not all expire at the same instant. Eviction policy (**LRU** for
recency, **LFU** for frequency) decides what leaves when memory fills. The number you optimize is the
**cache hit ratio**: at 95% hits your DB sees 5% of read traffic, so a drop from 95% to 90% doubles
DB load. Size the cache so the **hot working set** fits in memory; caching the long cold tail buys
nothing. **Negative caching** (caching "this key does not exist" for a short TTL) stops repeated
misses from hammering the DB for absent keys.

**Interview nuance:** saying "add a cache" with no invalidation story is the fastest way to lose a
senior interviewer. Always pair a write policy with how and when entries become stale, and name your
consistency window: with a 60s TTL and no invalidation you are promising up-to-60s-stale reads, fine
for a product page and unacceptable for an account balance.

\`\`\`
READ (cache-aside)                WRITE (invalidate-on-write)
  app -> cache?                     app -> DB (source of truth)
   hit  -> return                   then -> DELETE cache key
   miss -> DB -> set cache          next read re-populates
\`\`\`

Recap: default to cache-aside reads plus invalidate-on-write, pick a write policy by its durability
and latency tradeoff, and always attach a TTL-with-jitter and a stated consistency window so the
cache is defensible, not just present.
`.trim()

const cacheStampedeHotkeyTeach = `
## A cache works right up until a popular key expires

In the instant a popular entry disappears, every concurrent request for it misses at once, and each
one independently tries to rebuild it by querying the database. This is the **cache stampede**
(thundering herd, dog-piling), and it is one of the most common ways a healthy system takes itself
down: the cache was hiding, say, 10K req/s worth of a 300ms query, and now all of those requests hit
the origin in the same window, so the DB suddenly has roughly 3,000 concurrent copies of a slow query
and its CPU goes to 100%. Worse, because the DB is now slow, each rebuild takes longer, so more
requests pile up before the first one finishes, and the cache never gets re-populated. The system
spirals.

Three families of defense exist, and a good design layers them rather than betting on one.

### Request coalescing (singleflight)

When a key is missing, only the first requester rebuilds it, and every other concurrent requester for
the same key waits for that single in-flight rebuild and shares its result. Go's \`singleflight\`
package is the canonical implementation, but the pattern is universal: a per-key lock serializes
recomputation. The first thread acquires the lock and rebuilds; the rest block briefly and then read
the freshly populated cache. This turns 3,000 concurrent DB queries into exactly one. If the lock is
process-local you protect one app node; to protect the DB from a whole fleet you use a **distributed
lock** (a short-lived Redis \`SET NX\` key) so exactly one node across the fleet rebuilds.

### Beating the synchronized expiry

Even with coalescing, a hard TTL means the key vanishes at a single instant. **TTL jitter** spreads
the expiry of a cohort of related keys over a window so they do not all expire together.
**Probabilistic early recomputation** (the XFetch algorithm) refreshes a key slightly before its TTL,
with a probability that rises as expiry approaches, so a single lucky reader rebuilds the value in
the background while the still-valid cached value keeps serving everyone else. The key never actually
expires under load. A simpler cousin is **stale-while-revalidate**: serve the stale value immediately
and kick off one async refresh.

### The genuinely hot key

Sometimes the problem is not expiry but sheer volume: one key (a viral tweet, a flash-sale SKU) is
read so often that even a single Redis shard cannot serve it, because all requests for one key hash
to one shard. Coalescing does not help here since the value is present; the shard is simply
saturated. The fixes are **key replication** (write the value under N suffixed keys
\`hotkey:0..N\` spread across shards and have clients read a random one) and a **client-side near
cache (L1)** on each app server so most reads never reach Redis at all. Hot-key detection (per-key
request rates) tells you which keys need this treatment.

**Interview nuance:** the subtlety interviewers push on is what happens right after a cache flush or
cold start. A cold cache is a stampede on every key at once, so "just flush and warm up" is dangerous
at scale. You **warm** the cache before taking traffic, or ramp traffic gradually, and keep
coalescing on. Treating a flush as free is the classic mistake.

\`\`\`
NAIVE (stampede)                 COALESCED (singleflight)
 key expires                      key expires
  req1 -> DB \\                     req1 -> lock -> DB -> set cache
  req2 -> DB  }  N queries         req2..N -> wait -> read cache
  reqN -> DB /  DB at 100%         => exactly 1 DB query
\`\`\`

Recap: stop expiry stampedes with request coalescing (singleflight) plus jittered TTLs and
probabilistic early refresh, and handle a genuinely hot key with replication across shards or an L1
near cache, layering the defenses and never treating a cold cache as safe.
`.trim()

const distributedCacheArchTeach = `
## The cache tier becomes its own distributed system

Once one cache node is not enough, the cache tier has to shard, replicate, and survive failures
without becoming a new single point of failure or a new source of stale data. The starting decision
is the engine.

**Redis vs Memcached.** Memcached is a lean, **multithreaded**, in-memory key-value store with LRU
eviction and almost nothing else; it scales vertically across cores well and is ideal when you want a
simple, fast, sharded blob cache. Redis is **single-threaded per instance** (for command execution)
but gives you rich data structures, optional **persistence** (RDB snapshots, AOF log),
**replication**, pub/sub, Lua scripting, and clustering. The crisp answer: pick Memcached when you
want a pure, multi-core, evict-freely cache of opaque values; pick Redis when you need data
structures, replication, persistence, or atomic operations (counters, rate limiters, leaderboards).
Most systems reach for Redis and scale it horizontally by running many shards.

**Sharding.** Redis Cluster divides the keyspace into **16,384 hash slots**; each key hashes (CRC16
mod 16384) to a slot, and slots are assigned to shards, so adding a shard means moving some slots
rather than rehashing everything. The important property is consistent-hashing-style behavior: a
topology change moves only a fraction of keys, avoiding a mass-miss event. Client-side sharding (a
smart client hashing keys to nodes) is the Memcached equivalent.

**Replication and HA.** Each shard is a primary with one or more **replicas**. Replication is
**asynchronous**, so a failover can lose the last few writes: acceptable for a cache, not for a
system of record. **Redis Sentinel** (or Cluster's built-in failover) promotes a replica when a
primary dies, so a node failure is a brief blip. The design principle that makes this safe: the
**cache is disposable**. The source of truth is the database, so losing a cache node loses only
performance, never data, as long as the application falls through to the DB on a miss.

**Tiering.** A remote cache is a network hop, too slow for the very hottest keys at high QPS. So you
add an **L1 near cache** in the app process (a local LRU) in front of the **L2 remote cache**
(Redis). L1 kills the hottest reads and shields Redis shards from hot keys. The cost of L1 is a
second consistency layer: an invalidation now has to reach every app node's L1 (via pub/sub or a
short L1 TTL), or you accept a small staleness window locally.

**Consistency and operational hazards.** Keep L2 in sync with the DB via **invalidate-on-write**,
**versioned keys** (\`user:123:v7\`, so a stale value is simply never read), or a **short TTL
backstop**. Under memory pressure, \`maxmemory\` plus an eviction policy (\`allkeys-lru\`) decides
what leaves; a wrong policy (\`noeviction\`) turns a full cache into write errors. Two
scale-specific hazards: a **big key** (a huge value or a million-element collection) blocks Redis's
single thread when accessed or deleted and unbalances shards, so split it; and a **hot key**
saturates one shard, handled with L1 and key replication.

**Interview nuance: the flush trap.** A **cold cache is not safe to bring online under load**,
because every read misses and the full read volume hits the origin at once: the stampede across the
whole keyspace. A cache restart, region failover, or \`FLUSHALL\` must be paired with cache warming
or a gradual traffic ramp, with coalescing on. Treating a flush as free is the wrong turn
interviewers listen for.

\`\`\`
app server                    app server
 [L1 near cache]               [L1 near cache]
       \\                          /
        \\----- L2: Redis Cluster ----/
        slot 0..5460   5461..10922  10923..16383
        shardA(P+R)    shardB(P+R)   shardC(P+R)   <- Sentinel/failover
                     source of truth: DB (cache is disposable)
\`\`\`

Recap: pick Redis for structures/persistence/replication or Memcached for a lean multi-core blob
cache, shard by hash slots so topology changes move few keys, replicate each shard with failover,
tier L1-near plus L2-remote, keep L2 consistent via invalidate-on-write or versioned keys, and never
bring a cold cache online under full load.
`.trim()

const cdnScaleTeach = `
## Move bytes closer, and shield the origin

A CDN exists to do two things: move bytes physically closer to users so latency drops, and absorb
read traffic so your origin never sees the full load. A user in Sydney fetching from a single
us-east-1 origin pays roughly 150 to 250 ms of round-trip time per request; an edge PoP 20 ms away
turns that into a snappy response and, because the object is cached, the origin never handles the
request at all.

There are two CDN fill models. A **pull CDN** is lazy: the edge fetches from origin on the first miss
for an object, caches it, and serves subsequent hits locally. A **push CDN** is eager: you publish
objects into the CDN ahead of demand. Pull is the default for almost everything because it is
self-managing; push is reserved for large predictable launches (a game patch, a video premiere).

### The multi-tier hierarchy and the origin shield

The structure that actually protects a fragile origin: many L1 edge caches close to users, a smaller
set of L2 regional PoPs behind them, and a single **origin shield** in front of the origin. The
shield is the key trick. When a popular object expires, thousands of edges could each miss and hammer
the origin simultaneously. The shield **coalesces** those misses: it lets one request through to
origin, holds the others, and fans the single response back out. On a burst the origin sees thousands
of QPS instead of millions. Set \`stale-while-revalidate\` so the edge keeps serving the slightly
stale object while one background fetch refreshes it.

\`\`\`
  users -> [ L1 edge PoPs ] -> [ L2 regional ] -> [ origin shield ] -> origin
   millions of QPS            coalesced misses      ~1 fetch/object     protected
\`\`\`

### Invalidation and cache keys

You have three tools. **TTL expiry** is simplest but coarse. **Explicit purge** is precise but slow
to propagate globally and easy to over-use. The production default is **versioned or content-hashed
URLs**: \`app.4f9c2a.js\` instead of \`app.js\`. A new deploy is a new URL, so you can cache the old
one forever (immutable) and never purge; the HTML that references it gets a short TTL. This sidesteps
invalidation almost entirely.

**Cache-key normalization** decides your hit rate. By default the key is the full URL including query
string, so \`?utm_source=twitter\` and \`?utm_source=email\` are two cache entries for one image.
Strip tracking params, normalize casing, and only \`Vary\` on headers that actually change the body
(like \`Accept-Encoding\`). Vary on \`Cookie\` and your hit rate collapses to near zero.

**Interview nuance:** the sharpest question is "what can you cache and what must you never cache?"
Static assets and public semi-dynamic HTML: yes, with **micro-caching** (a 1 to 5 second TTL on the
homepage still collapses a 100k-QPS spike to ~20 origin fetches/sec). Personalized or authenticated
responses: never at a shared edge, or you leak one user's account page to another. Do personalization
with **edge compute** (Cloudflare Workers, Lambda@Edge) that assembles a cached shell plus a small
per-user fragment.

Recap: use a pull CDN with an L1/L2/shield hierarchy so the shield coalesces misses down to ~1 fetch
per object, prefer versioned URLs over purging, normalize cache keys, micro-cache semi-dynamic HTML
with stale-while-revalidate, and never cache authenticated bodies at a shared edge.
`.trim()

const searchInvertedIndexTeach = `
## Why LIKE cannot power search

A relational \`WHERE description LIKE '%wireless headphone%'\` cannot power real search: it does a
full scan, cannot rank by relevance, cannot handle typos or word stems, and dies at scale. That is
why a **dedicated search tier** exists. Its core data structure is the **inverted index**: instead of
mapping a document to its words, it maps each word (term) to a **posting list** of the documents that
contain it. Query "wireless headphones" and the engine intersects the posting lists for \`wireless\`
and \`headphone\` in milliseconds, no scan required.

Terms do not go into the index raw; they pass through an **analysis pipeline**. Tokenize the text
into words, lowercase them, **stem** ("running", "ran", "runs" all collapse to "run"), drop
stopwords, and expand **synonyms** ("tv" also indexes as "television"). The same analyzer must run at
index time and query time so the terms match. Typo tolerance comes from **fuzzy matching** (edit
distance) or n-gram indexing, so "hedphones" still finds "headphones".

\`\`\`
  doc: "Wireless Bluetooth Headphones"
   -> analyze -> [wireless, bluetooth, headphone]
  inverted index:
    headphone -> [doc7, doc19, doc204, ...]
    wireless  -> [doc7, doc44, doc204, ...]
  query "wireless headphone" -> intersect posting lists -> [doc7, doc204] ranked by BM25
\`\`\`

### Ranking, queries, and filters

The default ranking is **BM25** (a refined TF-IDF): a term matters more when it is rare across the
corpus (high IDF) and appears often in a short document. On top you apply **boosting** (title matches
worth more than description, in-stock and popular items lifted) and **filters**. Crucial distinction:
a **query** contributes to the relevance score; a **filter** is a yes/no constraint (brand = Sony,
price < 100) that does not score and, because it is deterministic, is **cached as a bitset** and
reused cheaply across requests. Facets and highlighting come from the same index.

At scale you run **Elasticsearch or OpenSearch**, which shards the index. A shard is a self-contained
inverted index (a Lucene index); documents are **routed** to a primary shard by hash of the id, and
each primary has **replica shards** for read throughput and failover. A 50M-document catalog might
use 10 primaries; size shards to the tens-of-GB range because oversharding wastes memory.

### Keeping the index in sync

Search is **not a system of record**. The truth lives in your primary DB; the index is a **derived,
rebuildable store**. Feed it with a **CDC / indexing pipeline**: capture DB changes (Debezium on the
binlog, or an application event) onto a stream, and an indexer applies them to Elasticsearch. This is
**eventually consistent**, so a product edit shows in search a second or two later, which is fine.
Because it is derivable, plan for **full reindexing**: mapping changes require building a fresh index
and switching an **alias** over atomically, with zero downtime.

**Interview nuance:** the classic trap is **deep pagination**. \`from: 100000, size: 10\` forces
every shard to sort 100,010 docs and is O(offset). Use **\`search_after\`** (a cursor on the last
sort value) for deep result sets, and cap the max page. Also be ready to say why you would not make
Elasticsearch your primary DB: weaker durability and consistency guarantees, and no transactions.

Recap: search runs on a dedicated tier built on an inverted index plus an analysis pipeline, ranks
with BM25 and boosting, separates scoring queries from cached filters, shards across primaries and
replicas, stays in sync as an eventually-consistent derived store fed by CDC, and paginates deep sets
with search_after, never large from offsets.
`.trim()

const vectorHybridSearchTeach = `
## When tokens do not overlap

Keyword (BM25) search matches tokens. Ask it "my card was declined" and it will not find a document
titled "payment authorization failed" because the words do not overlap. **Vector search** fixes this.
An **embedding model** maps text into a dense vector (say 768 or 1536 dimensions) where semantically
similar text lands close together. Now "declined card" and "payment authorization failed" are near
neighbors even with zero shared words. Retrieval becomes: embed the query, find the nearest document
vectors by cosine similarity.

Exhaustively comparing the query to every vector is O(N) and too slow at millions of docs, so you use
an **approximate nearest neighbor (ANN)** index. The two workhorses are **HNSW** (a navigable
small-world graph, excellent recall and latency, high memory) and **IVF** (cluster the space and
search a few clusters, lower memory, tunable recall). ANN trades a little **recall** for a massive
latency win; you tune parameters (\`efSearch\`, \`nprobe\`) to sit where you want on the
recall/latency/memory curve.

### Hybrid search: because vectors are bad at exact tokens

Error code \`E-4021\`, SKU \`SKU-99183\`, version \`v2.14.0\`, a person's exact name: these are
precisely where semantic similarity fails, because the embedding blurs the exact string. That is why
production systems use **hybrid search**: run **BM25 for exact/lexical matching** and **dense vectors
for semantic recall** in parallel, then combine.

You cannot just add the scores: BM25 scores are unbounded and dataset-dependent, cosine similarity is
bounded 0 to 1, so summing them is meaningless. The clean fix is **Reciprocal Rank Fusion (RRF)**,
which ignores raw scores and fuses by **rank**: each result gets \`1 / (k + rank)\` from each list
(k ~ 60) and the sums are combined. A document ranked high by either method surfaces, and the
incompatible score scales never touch.

\`\`\`
  query --> [ BM25 exact match ]     --> ranked list A
        \\-> [ embed -> ANN vectors ] --> ranked list B
                          \\-> RRF fuse by rank -> top-k
                                        \\-> cross-encoder rerank -> top-n
\`\`\`

### Retrieve, then rerank

First-stage retrieval (BM25 + ANN) is cheap and optimized for **recall**: cast a wide net, fetch the
top ~100 candidates. Then a **cross-encoder reranker** (a model that reads the query and each
candidate together, far more accurate but far more expensive) reorders just those 100 to produce a
precise top 5 to 10. You get the recall of cheap retrieval and the precision of an expensive model,
without running the expensive model over the whole corpus.

**Interview nuance:** two operational realities interviewers probe. **Freshness and metadata
filtering**: you often must restrict to \`product_id = X\` or \`updated_at > T\`. Prefer
**pre-filtering** (filter the candidate set, then ANN) when the filter is selective, and be aware
naive **post-filtering** can return too few results after ANN. **Re-embedding cost**: if you change
the embedding model, every vector must be recomputed and reindexed, which for hundreds of millions of
docs is a real migration, so you version embeddings and roll over like a search alias.

Recap: use embeddings + an ANN index (HNSW/IVF) for semantic recall, run it alongside BM25 for exact
tokens like codes and IDs, fuse the two by rank with RRF (never by raw score), add a cross-encoder
reranker over the top-k for precision, and plan for metadata filtering and the migration cost of
re-embedding.
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
        {
          id: "sd-l3-consistent-hashing",
          title: "Consistent Hashing, Virtual Nodes & Rebalancing",
          summary:
            "Hash mod N remaps nearly everything on resize; a ring with virtual nodes moves only ~1/N of keys, smooths load, and spreads rebalancing across many neighbors.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["consistent-hashing", "rebalancing"],
          teach: {
            markdown: consistentHashingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-consistent-hashing-apply",
            prompt:
              "Design node-membership handling for a distributed cache cluster so that losing 1 of 10 nodes does not invalidate the whole keyspace.",
            thinkAbout: [
              "Why does hash-mod-N remap nearly all keys on resize?",
              "How do virtual nodes smooth load and speed rebalancing?",
              "How does bounded-load consistent hashing cap hotspots?",
            ],
            modelAnswerOutline: [
              "Assumptions: 10 cache nodes fronting a database, serving 1M ops/sec at a 95% hit ratio, so the DB sees ~50k ops/sec. The design goal: a single node loss should invalidate only ~1/10 of keys, keeping the DB within ~2x of its normal miss load, not 10x.",
              "**Consistent hashing on a ring, not hash mod N.** Under mod N, dropping to 9 nodes changes the modulus and remaps ~90% of keys, so 90% miss at once and the DB is hit with roughly 10x its normal read load: a cascading outage. Under consistent hashing, the dead node's arc passes to its clockwise neighbor, so only ~10% of keys move and only those miss; the DB sees ~2x normal miss traffic briefly while the cache refills, which is survivable.",
              "**~200 virtual nodes per physical node:** load evens out to within a few percent instead of the lumpy imbalance of 10 single points, and when a node dies its ~200 arcs are inherited by many different survivors rather than dumping all its load on one unlucky neighbor. Vnodes also let a bigger machine take more tokens later.",
              "**Membership:** nodes register in a coordination service (etcd/ZooKeeper) or gossip membership (as Cassandra does). Clients or a routing proxy watch the membership list and rebuild the ring on change, with a short failure-detection grace window so a brief network blip does not trigger a needless remap.",
              "**Hotspot backstop:** on a genuinely skewed workload where one node still runs hot, enable bounded-load consistent hashing: cap each node at (1 + epsilon) times average and spill overflow to the next node clockwise.",
              "Common wrong turn: hash mod N (or restarting all clients with a new node count), which reshuffles the whole keyspace and turns a routine node replacement into a database-melting miss storm.",
            ],
          },
          practice: {
            id: "sd-l3-consistent-hashing-practice",
            prompt:
              "Design the key placement and rebalancing for a DynamoDB-style storage cluster that runs replication factor 3 and must autoscale from 30 to 300 nodes during a Black Friday ramp without a read-availability dip or a thundering rebalance. Explain token assignment, replica placement, and how you throttle data movement.",
            thinkAbout: [
              "How are 3 replicas placed on the ring so one AZ loss does not take all of them?",
              "What makes a 10x scale-out 'thundering,' and which knobs tame it?",
              "When may a new node start serving reads?",
            ],
            modelAnswerOutline: [
              "Assumptions: durable storage (not a disposable cache), RF=3, and the cluster must grow 10x over hours while serving traffic. Neither lost data nor a rebalance that saturates the network and starves live requests is tolerable.",
              "**Placement:** consistent hashing on a ring with virtual nodes, each physical node owning a few hundred tokens. A key's 3 replicas are the next 3 *distinct physical* nodes clockwise (skipping additional vnodes of an already-chosen node), spread across availability zones so one AZ loss does not take all 3. This is the Dynamo replica model.",
              "**Scaling out:** new nodes claim tokens and take over the corresponding arcs. With vnodes, each newcomer pulls small arcs from many existing nodes in parallel rather than draining one, so no single source node is hammered. Only ~1/N of keys per added node move.",
              "**Throttling the rebalance (the crux):** rate-limit streaming (a bytes/sec cap per node pair), bootstrap new nodes in batches rather than all at once, and prioritize live read/write traffic over background streaming so p99 holds. New nodes serve reads only after their range is fully streamed and verified (Merkle-tree anti-entropy), so reads never route to a partially-filled replica. During the ramp, reads still have 3 replicas on the old owners until handoff completes: no availability dip.",
              "**Shrinking after the peak** reverses the process gradually with the same throttle.",
              "**The committed tradeoff:** a slower, throttled rebalance (hours, not minutes) protects live-traffic latency and correctness, rather than a fast reshuffle that would spike p99 and risk serving stale or missing replicas.",
            ],
          },
        },
        {
          id: "sd-l3-shard-key-hotspots",
          title: "Shard-Key Selection, Hotspots & the Celebrity Problem",
          summary:
            "A good shard key is high-cardinality, evenly accessed, and query-aligned; a celebrity is one key on one node, so split the key, dedicate shards, or change the read pattern.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["shard-key", "hot-key", "celebrity"],
          teach: {
            markdown: shardKeyHotspotsTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l3-shard-key-hotspots-apply",
            prompt:
              "Choose the shard key for a social feed where one celebrity account has 100M followers and 1000x normal traffic; prevent a single hot shard.",
            thinkAbout: [
              "What makes a good shard key (cardinality, even access, aligned to query)?",
              "How do you mitigate a hot key (salting, dedicated shards, sub-partitioning)?",
              "Why plan resharding and online migration early?",
            ],
            modelAnswerOutline: [
              "Assumptions: the store holds posts and the follow graph; dominant reads are 'load user U's home feed' and 'load account A's posts'; writes are 'A posts' and 'U follows A.' The stated pathology is one celebrity at 1000x traffic.",
              "**Base shard key: hash of user_id (the author) for posts.** High-cardinality, evenly accessed for the 99.9% of normal accounts, and it co-locates an account's own posts so 'load A's posts' is a single-partition scan. Shard 'followers of A' edges by A and 'who U follows' edges by U, so both directions of the graph have single-partition lookups.",
              "**The celebrity hotspot is unavoidable under plain hash(user_id):** one key, one node, 1000x load. Mitigation 1, salting/key-splitting for detected whales: store the celebrity's posts under celebrity_id:bucket for K=32 buckets, writes round-robin, reads fan out to 32 and merge. Converts a 1000x single-node hotspot into ~30x spread across 32 partitions with a bounded 32-way read.",
              "**Mitigation 2, the one that actually tames 100M followers: change the read pattern.** Normal accounts use fan-out-on-write (push a new post into each follower's inbox); celebrities use fan-out-on-read. Never write 100M inbox rows per celebrity post; a follower's feed merges their fan-out-on-write inbox with a read-time pull of the (heavily cached) celebrity posts they follow. The Twitter hybrid.",
              "**Mitigation 3:** dedicate shards to the top handful of celebrities so their traffic is physically isolated and cannot starve normal users.",
              "**Planning:** pre-split into ~1024 logical shards mapped onto far fewer physical nodes so growth is a logical-to-physical remap, not a re-key, and design online resharding (double-write, backfill, verify, cutover) up front.",
              "Common wrong turn: sharding by a low-cardinality key like country or account_status, or assuming hash(user_id) alone handles the celebrity. Hashing spreads *keys*; a celebrity is a single key, so it stays a single hot node until you split the key or change the read pattern.",
            ],
          },
          practice: {
            id: "sd-l3-shard-key-hotspots-practice",
            prompt:
              "Choose the shard key for a multi-tenant B2B SaaS analytics platform (think Datadog or a Segment-style event store) where 10,000 tenants share the cluster, the largest tenant generates 40% of all events, and every query is scoped to a single tenant. Prevent both the whale-tenant hotspot and the noisy-neighbor problem.",
            thinkAbout: [
              "Why must a 40%-of-volume tenant and a 3-event/day tenant not share one placement regime?",
              "What does the compound (tenant_id, entity_id) key preserve on both sides?",
              "How does a growing tenant move tiers without downtime?",
            ],
            modelAnswerOutline: [
              "Assumptions: every query filters by tenant, so tenant isolation is both a performance and a correctness/security concern; event volume per tenant spans many orders of magnitude; one whale is 40% of the load.",
              "**Shard key: compound (tenant_id, entity_id), hashed.** Scoping placement by tenant co-locates a tenant's data so every tenant-scoped query hits a bounded set of partitions, and it enforces isolation. The entity_id component preserves cardinality *within* a tenant so a single large tenant still spreads across partitions instead of one row-key.",
              "**Tier the tenants because the whale cannot share a regime with the tail.** Whales get dedicated shards (own physical nodes or a dedicated cluster): isolates their load (the noisy-neighbor fix) and lets their capacity scale independently. Within a whale, sub-partition by (tenant_id:bucket, entity) to spread the 40% across many partitions.",
              "**The long tail** of small tenants is packed many-to-a-partition by hash(tenant_id), efficient because none is individually hot.",
              "**A directory/routing table** (tenant to shard-tier mapping) allows promoting a growing tenant from the shared pool to a dedicated shard online, via double-write and backfill, when it crosses a load threshold.",
              "**The committed tradeoff:** two placement regimes plus a routing directory and tenant-promotion migrations, in exchange for hard noisy-neighbor isolation and independent scaling of the tenants that drive cost. A single uniform hash(tenant_id) would either waste a whole node on tiny tenants or let the whale dominate whatever partition it lands on.",
            ],
          },
        },
        {
          id: "sd-l3-cross-shard-ops",
          title: "Cross-Shard Operations & Distributed Transactions",
          summary:
            "Avoid 2PC on the hot path (locks, blocks on coordinator failure); use sagas of local transactions with compensations, idempotency keys, and the outbox pattern.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["cross-shard", "saga", "transactions"],
          teach: {
            markdown: crossShardOpsTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l3-cross-shard-ops-apply",
            prompt:
              "Design a money-transfer or order-checkout flow that must update two records living on different shards without losing consistency.",
            thinkAbout: [
              "Why avoid 2PC on the hot path, and what does it cost?",
              "How does a saga with compensations replace a cross-shard transaction?",
              "How do the outbox pattern and idempotency keys make it safe?",
            ],
            modelAnswerOutline: [
              "Assumptions: a money transfer of amount X from account A to account B, sharded by account_id onto different shards. Requirements: no money created or destroyed, no double-debit under retries, available and fast at scale.",
              "**Why not 2PC:** a two-phase commit across A's and B's shards would lock both rows across network round trips and, worse, block holding those locks if the coordinator crashes between prepare and commit, exactly on the highest-value hot path. A throughput and availability liability.",
              "**Saga design, orchestrated for traceability:** (1) create a transfer record in PENDING with a unique transfer_id (the idempotency key); (2) local txn on A's shard: debit A by X, tagged with transfer_id (a dedup table rejects a replayed debit); (3) local txn on B's shard: credit B by X, same dedup; (4) mark the transfer COMPLETED.",
              "**Compensation:** if step 3 fails permanently, run a local txn on A's shard that re-credits X (again keyed by transfer_id so it runs once) and mark the transfer FAILED. Isolation is relaxed: the debit is visible before the credit, so model A's balance as available vs pending and never let the same funds be spent twice.",
              "**Reliability:** each step uses the outbox pattern: the local DB write and the event that triggers the next step are written in one local transaction to an outbox table, and a relay publishes to Kafka and retries idempotently, so a crash between 'debit A' and 'emit credit-B event' cannot lose the step. Delivery is at-least-once, so idempotency keys (transfer_id + step) and per-shard dedup tables make every retry safe.",
              "Common wrong turn: reaching for 2PC (or an ambient distributed transaction) on the hot path, or waving away the two-shard write as atomic. It is not atomic; it is a saga, and the honest answer names the compensations and the idempotency/outbox machinery that keep it correct under retries and crashes.",
            ],
          },
          practice: {
            id: "sd-l3-cross-shard-ops-practice",
            prompt:
              "Design the order-placement flow for an Amazon-scale checkout that must, as one logical operation, reserve inventory (inventory service/shard), charge payment (payment service/shard), and create the order (order service/shard), each on a different data store, at tens of thousands of orders/sec. Guarantee no oversell and no double-charge, and keep it available if any one service is briefly down.",
            thinkAbout: [
              "Which local mechanism guarantees no oversell without any cross-service lock?",
              "What happens to the saga when the payment service is down for two minutes?",
              "Why must inventory holds eventually expire?",
            ],
            modelAnswerOutline: [
              "Assumptions: three independent services with their own sharded stores; the operation spans all three; peak is high; hard invariants are no overselling and no double-charging, while staying available under partial failures.",
              "**An orchestrated saga, not a distributed transaction.** An order orchestrator drives an order_id-keyed state machine: (1) reserve inventory (local txn on the inventory shard: decrement available, create a reservation keyed by order_id; compensation: release the reservation); (2) authorize payment (local txn on the payment shard, keyed by order_id; compensation: void/refund); (3) create the order as CONFIRMED and capture payment.",
              "**Failure paths:** if step 2 fails (card declined), compensate step 1 (release inventory) and mark the order FAILED. If step 3 fails, compensate payment (void) and inventory (release). No 2PC: each step is a local transaction, so no cross-service locks and each service stays independently available.",
              "**No oversell:** the inventory reservation is a local atomic decrement with a floor at zero, so two concurrent orders for the last unit cannot both succeed; the loser's saga fails and compensates. **No double-charge:** payment authorization is idempotent on order_id, so a retried authorize after a timeout returns the existing authorization instead of charging again.",
              "**Partial failure:** every step uses the outbox pattern (business write + next-step event in one local txn, relayed to Kafka), so a crash mid-saga does not lose a step. If a service is briefly down, the orchestrator retries with backoff; the order sits pending ('processing') and the saga resumes on recovery rather than failing the checkout. A timeout policy eventually compensates and releases the inventory hold so stock is not stranded.",
              "**The committed tradeoff:** eventual consistency and visible intermediate states (a brief inventory hold, a pending order) plus orchestration/idempotency/outbox complexity, in exchange for availability and throughput that 2PC across three services could never sustain at tens of thousands of orders/sec.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l3-m3",
      title: "Caching at Scale",
      description:
        "Put a cache in front of a database and defend every part: the right write policy and invalidation story, stampede and hot-key protection, and a shared cache tier that survives node failures at a million ops/sec.",
      lessons: [
        {
          id: "sd-l3-caching-patterns",
          title: "Caching Patterns & Write Policies",
          summary:
            "Default to cache-aside reads plus invalidate-on-write, pick the write policy by its durability/latency trade, and always state the TTL and consistency window.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["caching", "write-policies"],
          teach: {
            markdown: cachingPatternsTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-caching-patterns-apply",
            prompt:
              "Design the caching layer for a read-heavy product page (95% reads) backed by a database that can serve only 10% of peak read traffic.",
            thinkAbout: [
              "Which write policy fits, and what is its durability tradeoff?",
              "How do you size the working set so the hot data fits in memory?",
              "How do you keep cache and source of truth in sync?",
            ],
            modelAnswerOutline: [
              "Assumptions: an e-commerce product page at ~100K read QPS peak with the DB able to serve only 10K QPS. Product data changes rarely except inventory. So at least 90% of reads must come from cache, and the consistency requirement differs by field.",
              "**Design: Redis as a cache-aside layer.** On a read, fetch `product:{id}`; on a miss, load from the DB, set with a TTL, return. To hit the required 90%+ offload, the hot working set must fit in memory: product traffic follows a heavy Pareto distribution, so caching the top few percent of SKUs covers the large majority of reads. Size Redis for that hot set with headroom (tens of GB), set LRU eviction under maxmemory, and confirm the hit ratio empirically.",
              "**Write policy: cache-aside plus invalidate-on-write** for mostly-static fields. On an admin edit, write the DB then DELETE `product:{id}` (delete, not update, to avoid the concurrent-writer stale-value race), so the next read re-populates fresh. TTL is a backstop (10 minutes with jitter) in case an invalidation is missed.",
              "**Inventory is split into its own key** `inventory:{id}` with a very short TTL (a few seconds) or a write-through update, accepting a few seconds of staleness on the displayed count. No write-back anywhere: the DB is the source of truth and a committed product edit must never be lost in a cache flush.",
              "**Safety:** TTL jitter prevents synchronized cohort expiry; negative caching of missing product IDs stops 404-scanning traffic from reaching the DB. If Redis fails entirely, reads fall through to a DB that can only take 10%, so add a request-coalescing/stampede guard and a small in-process L1 cache to survive a cache-tier blip.",
              "Common wrong turn: write-through for everything 'to stay consistent,' doubling every write's latency and caching write-once data, or naming Redis with no invalidation and no working-set sizing, so the hit ratio is unknown and the DB still melts at peak.",
            ],
          },
          practice: {
            id: "sd-l3-caching-patterns-practice",
            prompt:
              "Design the caching strategy for Amazon's product detail page during a Prime Day spike where a small set of doorbuster SKUs draws 500K reads/sec while their price and inventory change every few seconds. Explain how you keep the displayed price correct while surviving the read volume, and lead with the concrete cache topology.",
            thinkAbout: [
              "Why does the hottest tier of the cache need to live in-process rather than in Redis?",
              "Where is the authoritative price actually enforced, and why is display staleness acceptable?",
              "What stops each 1-second expiry from stampeding the pricing service?",
            ],
            modelAnswerOutline: [
              "**Topology: a two-tier cache**, an in-process L1 near cache on each app server plus a shared Redis L2, in front of the product/pricing services. The doorbuster SKUs are a tiny hot set, so an L1 with a 1-2 second TTL absorbs the bulk of 500K reads/sec without crossing the network: essential because no single Redis shard wants half a million ops/sec for one key.",
              "**Split the page into fragments by volatility.** Static fragments (title, description, images) cache long with invalidate-on-write.",
              "**Price is the sensitive field:** a very short L1 TTL (1 second) bounds worst-case display staleness at one second, legally and commercially acceptable, and the checkout path re-validates the price against the pricing service at add-to-cart and order time, so the authoritative price is always confirmed before money moves. The cached price is a display optimization, never the source of truth.",
              "**Inventory** gets the same 1-second treatment plus a fail-safe 'low stock' signal ('limited availability' rather than a precise flickering count).",
              "**Stampede protection:** request coalescing at both tiers so only one refresh per key per node hits the origin, jittered L1 TTLs across nodes, and pricing changes pushed as invalidations (or a versioned price key) so a price cut propagates within a second or two rather than waiting on TTL.",
              "**The committed tradeoff:** up to ~1 second of price/inventory display staleness in exchange for serving 500K reads/sec from L1, with all correctness-critical price checks moved to the low-volume checkout path. Common wrong turn: keeping the displayed price perfectly live by reading the pricing service on every page view, which collapses under the read volume for no real benefit, since the binding price is the one confirmed at checkout.",
            ],
          },
        },
        {
          id: "sd-l3-cache-stampede-hotkey",
          title: "Cache Stampede, Thundering Herd & Hot Keys",
          summary:
            "Layer the defenses: singleflight coalescing with a distributed lock, jittered TTLs and probabilistic early refresh, plus L1 caches and key replication for genuinely hot keys.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["cache-stampede", "hot-key", "singleflight"],
          teach: {
            markdown: cacheStampedeHotkeyTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-cache-stampede-hotkey-apply",
            prompt:
              "Design so that when a key served at 10k req/s backed by a 300ms query is about to expire, its expiry does not leak thousands of concurrent queries to the DB.",
            thinkAbout: [
              "How does request coalescing (singleflight) protect the DB?",
              "How do jittered TTLs and early recompute prevent synchronized expiry?",
              "How do you handle a genuinely hot key?",
            ],
            modelAnswerOutline: [
              "Assumptions: one key at 10K req/s, rebuild cost 300ms. Without protection, at the expiry instant roughly 10,000 x 0.3s = ~3,000 concurrent rebuild queries hit the DB in the first window, and because the DB slows under that load, the pile-up grows before the first rebuild completes. Goal: at most one rebuild per expiry, and ideally the key never hard-expires under load.",
              "**Primary defense: request coalescing with a per-key distributed lock.** On a miss, a requester tries `SET lock:{key} nonce NX PX 2000` in Redis. The winner runs the 300ms query and repopulates; all other concurrent requesters, seeing the lock held, wait a few milliseconds and re-read the cache or serve the last stale value. 3,000 concurrent queries collapse into exactly one across the entire fleet. The lock is fleet-wide, not a process-local mutex, because the shared DB is what needs protecting.",
              "**Prevent the hard expiry: probabilistic early recomputation (XFetch).** Store the value with its computed cost and TTL; on each read, compute a small refresh probability that rises as expiry nears. One reader rebuilds in the background while the still-valid value serves everyone else, so the key is refreshed before it ever disappears. Add TTL jitter so this key's cohort does not synchronize expiry.",
              "**The hot-key dimension:** 10K req/s on a single key also merits an L1 near cache on each app server with a 1-second TTL, so the vast majority is served in-process and only a trickle reaches Redis and the DB. At far higher load, replicate the key across shards.",
              "**Layering:** coalescing bounds the blast radius to one query, early recompute removes the expiry cliff, and L1 removes the volume. On a cold start or after a flush, keep coalescing on and warm the key first.",
              "Common wrong turn: a single TTL with no coalescing (expiry deterministically stampedes the origin), or a process-local mutex only, which still lets one query per app server through: a 100-node fleet still fires 100 concurrent queries at the DB.",
            ],
          },
          practice: {
            id: "sd-l3-cache-stampede-hotkey-practice",
            prompt:
              "Design so that neither the frequent updates nor the read volume overloads the cache tier or the scoring backend during a World Cup final, where one match's live-score key on a sports platform is read at 2M req/s and its value changes every few seconds when a goal is scored, and lead with the concrete mechanism.",
            thinkAbout: [
              "Is this an expiry problem or a hot-key problem, and what changes because updates are event-driven?",
              "How does push-updating the cache remove the rebuild-on-miss path entirely?",
              "Where does the remaining cold-start miss risk live, and what guards it?",
            ],
            modelAnswerOutline: [
              "**Mechanism: a push-updated, replicated hot key served from an L1 near cache.** This is a hot-key problem, not an expiry problem: the value changes on real events (goals), not on TTL, so readers should never rebuild it. The scoring backend pushes the new score into the cache; readers only ever read.",
              "**Read path:** an L1 near cache on every app server holds the current score with a sub-second TTL. At 2M req/s across hundreds of app nodes, each node serves its share locally and refreshes from L2 a few times per second, so Redis sees thousands of ops/sec instead of millions. Because a single shard still cannot take the aggregate refresh load for one key, replicate the key across N shards (`score:match123:0..N`) and have each node read a random replica. Optionally push updates to app nodes over pub/sub or SSE so L1 is updated rather than polled.",
              "**Write path:** on a goal, the scoring backend writes the authoritative score once to the DB, then publishes the new value to all cache replicas (write-through to the N keys) and the pub/sub channel. A handful of updates per match: trivial write cost. The entire design absorbs reads, not writes.",
              "**No rebuild-on-miss in the hot loop, so no stampede to coalesce.** The only miss is a cold node start, guarded with singleflight so a restarting node does not fan out to the backend.",
              "**The tradeoff:** up to ~1 second of score staleness at the edge (L1 TTL / push latency), imperceptible for a live-score display, in exchange for cutting 2M req/s to a few thousand backend-facing ops/sec.",
              "Common wrong turn: caching the score with a short TTL and letting readers rebuild on expiry, which turns every goal into a 2M-request stampede against the scoring backend; push updates plus L1 plus key replication avoid the rebuild entirely.",
            ],
          },
        },
        {
          id: "sd-l3-distributed-cache-arch",
          title: "Distributed Cache Architecture",
          summary:
            "Shard by hash slots, replicate each shard with failover, tier L1-near plus L2-remote, treat the cache as disposable, and never bring a cold cache online under load.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["distributed-cache", "redis", "ha"],
          teach: {
            markdown: distributedCacheArchTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-distributed-cache-arch-apply",
            prompt:
              "Design a shared cache tier for a fleet of app servers needing sub-ms reads at 1M ops/sec with node failures tolerated.",
            thinkAbout: [
              "Redis vs Memcached: what do you gain from each?",
              "How do you shard and replicate the cache for HA?",
              "How do you keep cache and DB consistent, and treat the cache as disposable?",
            ],
            modelAnswerOutline: [
              "Assumptions: many app servers sharing one logical cache, 1M ops/sec aggregate, sub-millisecond read target, node failures tolerated without an outage. The DB remains the source of truth.",
              "**Engine: Redis Cluster.** Chosen over Memcached because the HA requirement wants replication and automatic failover, and atomic operations and data structures are usually needed somewhere. Memcached would be a fine, simpler choice for purely opaque-blob caching with no HA-via-replication need.",
              "**Sharding:** partition across Redis Cluster's 16,384 hash slots. A single instance handles ~100K+ ops/sec, so run roughly 10 to 20 primary shards for 1M ops/sec with headroom, with the client routing each key by slot. Slots move individually, so scaling out avoids a full rehash and a mass-miss event.",
              "**HA:** each shard is a primary plus at least one replica on a different host/AZ, with Cluster failover (or Sentinel) promoting a replica within seconds. Replication is async, so a failover may drop the last few milliseconds of writes: acceptable precisely because the cache is disposable and the app falls through to the DB on a miss.",
              "**Sub-ms reads:** a remote hop plus Redis is typically well under a millisecond in-datacenter, but for the hottest keys add an L1 near cache in each app process so those reads never leave the box and no shard is saturated by a hot key. L1 also cushions a shard failover.",
              "**Consistency:** invalidate-on-write to L2 (delete the key after the DB write) with a short TTL backstop, and versioned keys where any stale read is unacceptable. Set maxmemory with allkeys-lru so a full cache evicts rather than errors; split big keys; give hot keys L1 plus replication.",
              "**Operational:** never FLUSHALL under load or bring a cold cluster online at full traffic; warm the hot set or ramp traffic and keep request coalescing on.",
              "Common wrong turn: treating a cache flush or cold failover as safe and sending full read traffic at a cold cache (stampedes the origin), or running a single unreplicated Redis: a single point of failure that violates the fault-tolerance requirement.",
            ],
          },
          practice: {
            id: "sd-l3-distributed-cache-arch-practice",
            prompt:
              "Design Twitter/X's cache tier that fronts the timeline and tweet-object services at tens of millions of reads per second across multiple regions, where a single celebrity tweet can be read millions of times per second and a region can fail. Lead with the topology and explain how you keep it available and consistent enough.",
            thinkAbout: [
              "Why cache tweet objects and timelines separately?",
              "What two mechanisms absorb a single tweet read millions of times per second?",
              "What does per-region cache independence buy during a region failure?",
            ],
            modelAnswerOutline: [
              "**Topology: a per-region, multi-tier cache.** L1 near cache in each app process plus a regional Redis Cluster L2, with the DB (and cross-region replication of the source of truth) behind it. Timelines and tweet objects are cached separately: a tweet object is shared by millions of timelines and is the true hot spot, while a timeline is per-user.",
              "**Scale and hot keys, two mechanisms.** First, L1 near caches on every app server serve the hottest tweet objects in-process with a short TTL, so a viral tweet is answered locally on thousands of nodes and only trickles to L2. Second, for the very hottest keys, replicate the key across shards so its read load spreads instead of hammering one shard. Hot-key detection promotes keys into this treatment automatically.",
              "**Availability across regions:** an independent cache cluster per region, so a region failure does not take the cache down globally; traffic fails over to a healthy region whose cache is warm for its own users. Within a region, each shard has replicas with Cluster failover. The source of truth replicates across regions asynchronously.",
              "**Consistency:** tweets are largely immutable, so use versioned/immutable keys for tweet objects (an edit or delete writes a new version and invalidates the old), sidestepping most invalidation races. Timelines are rebuilt or invalidated on the fan-out path. Accept a few seconds of cross-region eventual consistency, fine for a social feed.",
              "**Tradeoff:** strict global consistency traded for regional availability and massive read scale, accepting seconds of cross-region staleness.",
              "Common wrong turn: a single global cache cluster (a shared failure domain and a cross-region latency tax), or caching a celebrity tweet under one key with no L1 and no replication, which turns one shard into the whole system's bottleneck when a tweet goes viral.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l3-m4",
      title: "CDN, Search & Geo",
      description:
        "Push bytes to the edge behind a multi-tier CDN, stand up a search tier on an inverted index kept in sync via CDC, extend it with vector and hybrid retrieval, and index millions of points on a sphere without hot-spotting.",
      lessons: [
        {
          id: "sd-l3-cdn-scale",
          title: "CDN & Edge Caching at Scale",
          summary:
            "An L1/L2/origin-shield hierarchy coalesces misses to ~1 fetch per object; version URLs instead of purging, normalize cache keys, and never cache authenticated bodies.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["cdn", "edge", "origin-shield"],
          teach: {
            markdown: cdnScaleTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-cdn-scale-apply",
            prompt:
              "Design content delivery for a media site serving images, video, and semi-dynamic HTML to a global audience, where the origin is fragile and cannot absorb spikes.",
            thinkAbout: [
              "How does an origin shield coalesce fetches to protect the origin?",
              "How do you invalidate: TTL, purge, or versioned URLs?",
              "What dynamic content is cacheable, and what must never be cached?",
            ],
            modelAnswerOutline: [
              "Assumptions: global readership, read-heavy, spiky traffic (an article can go viral), origin is a modest app+DB tier that falls over above a few thousand QPS.",
              "**High-level:** front everything with a pull CDN in a multi-tier hierarchy: L1 edges near users, L2 regional PoPs, and an origin shield as the single choke point. On a viral spike the shield coalesces all edge misses for a hot object into one origin fetch and fans the response back, so the origin sees thousands of QPS, not millions.",
              "**Images and video:** immutable, content-hashed keys (`img/9af3c1.jpg`), cached at the edge with long TTLs. Video served as HLS/DASH segments, each cached independently. The bulk of bytes never touches origin after first fill.",
              "**Semi-dynamic HTML** (article pages, homepage): micro-caching with a 1 to 5 second TTL plus stale-while-revalidate, so a 100k-QPS burst collapses to ~20 origin fetches/sec while readers still get fresh-enough pages.",
              "**Authenticated/personalized responses:** never cached at a shared edge. Use edge compute to stitch a cached public shell with a per-user fragment, or mark them `private, no-store`.",
              "**Invalidation:** default to versioned URLs so a new asset is a new URL cached immutably; reserve explicit purge for 'take this down now'; TTL for the micro-cached HTML. Normalize the cache key: strip UTM/tracking params, Vary only on Accept-Encoding, never on Cookie.",
              "**The tradeoff:** micro-caching trades a few seconds of staleness for surviving spikes, almost always worth it for a media site. Common wrong turn: caching a personalized response at a shared edge (leaking user A's page to user B), or skipping cache-key normalization so query-string variants shatter the hit rate.",
            ],
          },
          practice: {
            id: "sd-l3-cdn-scale-practice",
            prompt:
              "Design the edge delivery for a live sports streaming event like a World Cup final peaking at 5 million concurrent viewers, where the origin encoder produces new HLS segments every 2 seconds and cannot be hit by more than a few thousand requests per second. Lead with how a fresh, uncacheable-by-age segment still shields the origin.",
            thinkAbout: [
              "How does a brand-new segment get served to 5M players with roughly one origin fetch?",
              "What TTL does the constantly-updating manifest deserve?",
              "What does the 2-second segment size trade against?",
            ],
            modelAnswerOutline: [
              "Assumptions: single global live event, ~5M concurrent viewers, adaptive bitrate ladder (240p to 4K), new 2-second segments continuously, fragile origin encoder.",
              "**The hard part:** every segment is brand new, so there is no warm cache when 5M players request `seg_1050.ts` in the same 2-second window. The answer is request coalescing at the origin shield plus the tiered hierarchy: all 5M requests fan into L1 edges, then L2, then a shield that lets exactly one request per segment through to the encoder and holds the rest. The origin sees roughly (segments/sec) x (ladder size): a few dozen QPS, not millions.",
              "**Manifest handling:** the HLS playlist updates every 2 seconds and is the one genuinely dynamic object. Cache it with a ~1-2 second TTL so players poll the edge, not origin; even a 1-second micro-cache collapses millions of manifest polls to one origin fetch per second.",
              "**Prewarming:** segments are predictable, so push each new segment to L2 PoPs the instant the encoder emits it, making the first viewer request a hit. Use stale-while-revalidate so a late manifest refresh serves the last good version rather than stalling playback.",
              "**Scale math:** 5M viewers x ~5 Mbps average is ~25 Tbps of egress, which only a large CDN footprint serves: multi-CDN across providers with DNS/steering-based failover.",
              "**The tradeoff:** 2-second segments put viewers ~6-10 seconds behind live in exchange for cacheability and resilience; shrinking segments cuts latency but multiplies request rate and origin risk. Common wrong turn: caching the manifest with a long TTL (viewers freeze on stale playlists) or skipping the shield (the encoder melts on segment rollover).",
            ],
          },
        },
        {
          id: "sd-l3-search-inverted-index",
          title: "Full-Text Search & the Inverted Index",
          summary:
            "A dedicated search tier: inverted index plus analysis pipeline, BM25 with boosting, cached filters, shards and replicas, CDC-fed eventual consistency, search_after pagination.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["search", "inverted-index", "elasticsearch"],
          teach: {
            markdown: searchInvertedIndexTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-search-inverted-index-apply",
            prompt:
              "Design search for an e-commerce catalog of 50M products with typo tolerance, filters, and relevance-ranked results, including how the index stays in sync with the product database.",
            thinkAbout: [
              "What is the analysis pipeline (tokenize, stem, synonyms) and inverted index?",
              "How do you keep the index in sync with the DB?",
              "Why is search not a system of record?",
            ],
            modelAnswerOutline: [
              "Assumptions: 50M products, high read QPS with bursty spikes, product data owned by a relational primary (Postgres), search must tolerate typos, support faceted filtering, and rank by relevance.",
              "**High-level:** a dedicated Elasticsearch/OpenSearch cluster holds an inverted index of products. At index and query time, run an analysis pipeline: tokenize, lowercase, stem, drop stopwords, expand a curated synonym list ('tv' -> 'television'). Typo tolerance via fuzzy matching (edit distance 1-2) or edge n-grams for autocomplete.",
              "**Sharding:** route 50M docs across ~10 primary shards (tens of GB each) with 1-2 replicas per primary for read throughput and HA; documents route by product id hash.",
              "**Query shape:** the free-text term is a scored query ranked by BM25, with boosting (title > description, in-stock and high-rating lifted). Structured constraints (brand, price range, category) are filters, not queries: they do not affect score and are cached as bitsets, so repeated 'Sony under $100' filters are nearly free. Return facets and highlighting from the same request.",
              "**Sync:** the DB is the system of record; the index is a derived, rebuildable store. Capture product changes via CDC (Debezium on the DB log) or app events onto Kafka; an indexer applies them to Elasticsearch. Eventually consistent (a second or two of lag), acceptable for a catalog. Support full reindexing: for a mapping/analyzer change, build a new index and flip a read alias atomically for zero downtime.",
              "**Why search is not the primary store:** weaker durability and consistency, no transactions, and a retrieval-tuned schema. If it corrupts or a mapping changes, rebuild it from the DB, never the other way around.",
              "Common wrong turn: deep offset pagination (`from: 100000`) that sorts the whole prefix on every shard (use search_after cursors), or treating the search index as the system of record.",
            ],
          },
          practice: {
            id: "sd-l3-search-inverted-index-practice",
            prompt:
              "Design log and event search for an observability platform like Datadog or Elastic Observability ingesting 2M log lines per second across thousands of customers, where engineers run ad-hoc keyword and field queries over the last 15 minutes constantly and over the last 30 days occasionally. Lead with the index layout that makes recent data fast and old data cheap.",
            thinkAbout: [
              "What does time-based index rollover buy for both queries and retention?",
              "How do hot-warm-cold tiers match the access pattern to hardware cost?",
              "Where does multi-tenancy shape routing and shard placement?",
            ],
            modelAnswerOutline: [
              "Assumptions: 2M events/sec ingest, write-once read-many, queries skew heavily to recent data, strict cost pressure at petabyte scale, multi-tenant.",
              "**Index layout: time-based indices with ILM rollover** (one index per hour or per size threshold), aliased as `logs-write` and `logs-read-*`. This is the whole game: a query for the last 15 minutes touches one or two small hot shards, and 30-day queries are bounded and parallelized. Deletion becomes an O(1) drop-the-index operation instead of per-document deletes.",
              "**Hot-warm-cold tiering:** recent indices on hot nodes (fast NVMe, in memory) for low-latency reads and writes; after a day they migrate to warm nodes (cheaper disk, fewer replicas); after a week to a cold/frozen tier backed by object storage (searchable snapshots on S3) where queries take seconds but storage is 10-20x cheaper. Matches the access pattern: recent is hot and pricey, old is cold and cheap.",
              "**Ingest and sharding:** buffer through Kafka to absorb spikes and decouple producers from indexing; route by tenant + time so one noisy customer does not hotspot a shard, cap shard size, and force-merge plus reduce replicas on rolled-over indices to shrink footprint.",
              "**Query:** mostly filters (service, host, level, time range) plus keyword match, so lean on cached filter bitsets and time pruning.",
              "**The tradeoff:** cheaper cold storage means slow historical queries, which is right because engineers tolerate seconds for a 30-day search but never during a live incident. Common wrong turn: one giant append-only index (retention and deletes become impossible, every query scans everything) or keeping all data on hot nodes (cost explodes at petabyte scale).",
            ],
          },
        },
        {
          id: "sd-l3-vector-hybrid-search",
          title: "Vector, Semantic & Hybrid Search",
          summary:
            "Embeddings plus ANN give semantic recall, BM25 catches exact tokens; fuse by rank with RRF, rerank the top-k with a cross-encoder, and plan re-embedding migrations.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["vector-search", "hybrid-search", "rag"],
          teach: {
            markdown: vectorHybridSearchTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-vector-hybrid-search-apply",
            prompt:
              "Design retrieval for a support and knowledge base that must match paraphrased questions plus exact error codes and version numbers, and return the most relevant articles.",
            thinkAbout: [
              "Why combine dense vectors with BM25, and how are the scores fused?",
              "What does a retrieve-then-rerank pipeline add?",
              "How do you handle freshness and metadata filtering?",
            ],
            modelAnswerOutline: [
              "Assumptions: a KB of tens to hundreds of thousands of articles; queries mix natural-language paraphrases ('my payment won't go through') and exact tokens (`E-4021`, `v2.14.0`); latency budget in the low hundreds of ms; articles updated continuously.",
              "**Hybrid retrieval:** chunk articles into passages and index them two ways. (1) BM25 / inverted index for exact lexical matching, which catches error codes, SKUs, and version numbers that embeddings blur. (2) Dense embeddings + ANN (HNSW in pgvector, Weaviate, or Elasticsearch dense_vector) for semantic recall so paraphrases match with no shared words.",
              "**Fusion: Reciprocal Rank Fusion,** which fuses by rank (`1/(k+rank)`, k ~ 60) rather than raw score, because BM25 scores are unbounded and cosine is 0-1, so summing them directly is meaningless.",
              "**Two-stage precision:** first stage retrieves ~100 candidates optimized for recall; a cross-encoder reranker reads the query with each candidate and reorders into a precise top 5-10. The recall of cheap retrieval plus the precision of an expensive model, run over 100 items, not the corpus.",
              "**Freshness and filtering:** index updates flow through the same CDC/event pipeline as the article store (seconds of lag). Apply metadata filters (product, version, locale, is_published) as pre-filters when selective so ANN searches only the valid subset; avoid naive post-filtering that can starve results.",
              "**The tradeoff:** reranking adds tens of ms and model cost per query, worth it where a wrong top result means a filed ticket. Migration reality: changing the embedding model forces re-embedding and reindexing every passage, so version embeddings and roll over via an alias.",
              "Common wrong turn: raw vector similarity alone with no exact-match path (so `E-4021` returns vaguely-related payment articles) and no reranker (so the top result is only approximately right).",
            ],
          },
          practice: {
            id: "sd-l3-vector-hybrid-search-practice",
            prompt:
              "Design the retrieval layer for a coding assistant's RAG over a company's 20M-file private codebase and docs, where a query might be 'how do we rotate service credentials' or an exact symbol like AuthTokenRefresher.refresh(), and answers must never leak one team's private repos to another. Lead with how you keep exact-symbol matching and per-repo access control correct.",
            thinkAbout: [
              "Why must exact-symbol matching be first-class rather than left to embeddings?",
              "Where must ACL filtering happen so no unauthorized chunk ever reaches ranking or the LLM?",
              "What keeps the index fresh as code changes on every commit?",
            ],
            modelAnswerOutline: [
              "Assumptions: 20M files, mixed natural-language and exact-symbol queries, strict per-user/per-repo authorization, low-latency IDE completions, code and docs updated on every commit.",
              "**Exact-symbol correctness:** code retrieval lives or dies on exact tokens, so BM25 (or a symbol index) is first-class, not an afterthought. `AuthTokenRefresher.refresh()` must match exactly, which embeddings blur badly. Index code with a code-aware analyzer (split camelCase and snake_case, keep the raw symbol) and build a dedicated symbol/definition index from the parser (ctags/LSP/tree-sitter) so definitions and references are exact lookups. Run dense embeddings in parallel for conceptual queries, fuse with RRF, and rerank the top ~100 with a cross-encoder.",
              "**Access control, the load-bearing part: retrieval must be security-trimmed.** Attach repo_id and ACL/visibility metadata to every chunk and apply it as a pre-filter so the ANN and BM25 candidate sets only ever contain repos the user can read. Never post-filter after ranking (timing leaks and starved results), and never let the reranker or the LLM see a chunk the user cannot access. Enforce ACLs at query time from the authoritative permission service, not stale cached grants, because repo access changes.",
              "**Freshness:** index on commit via CDC/webhooks, chunk by function/symbol, and re-embed only changed files.",
              "**The tradeoff:** per-repo pre-filtering shrinks the candidate pool and can hurt recall for broad queries, which is correct because a leak is catastrophic and a slightly narrower result set is not.",
              "Common wrong turn: a single shared index queried then filtered afterward (leaks via ranking side channels and counts), or leaning on vector similarity alone so exact symbol lookups fail.",
            ],
          },
        },
      ],
    },
  ],
}
