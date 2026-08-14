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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your write throughput is at 90 percent of what the leader can absorb. You add three more read replicas. What happens to write capacity?",
  "options": [
    {
      "label": "It roughly doubles, since writes now spread across more machines",
      "feedback": "Tempting, because reads really do spread this way. But every follower must apply every write to stay in sync, so the leader remains the write ceiling no matter how many replicas you add."
    },
    {
      "label": "Nothing changes, the leader is still the ceiling",
      "correct": true,
      "feedback": "Right. Replication fans out reads, but each write is replayed on every follower. When writes outgrow one leader, the lever is sharding, not more replicas."
    },
    {
      "label": "It gets slightly worse",
      "feedback": "Closer than it sounds: more followers mean more replication work, and under synchronous settings more waiting. But the headline answer is that write capacity does not scale; the leader still bounds it."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "replication-lag",
  "title": "Leader Ahead, Followers Behind",
  "predictPrompt": {
    "question": "A write burst hits the leader while each follower can only apply a fixed number of entries per tick. What happens?",
    "options": [
      "The leader slows its writes so every follower stays in sync",
      "All followers fall behind by the same amount until the burst ends",
      "Each follower falls behind at its own rate, and the slowest one serves the stalest reads"
    ]
  },
  "workedExample": "One leader streams its change log to three followers. Follower 1 applies entries fastest and follower 3 slowest, so under the steady trickle of writes everyone stays caught up and lag sits near zero. Then the burst multiplies the write rate for a stretch: the leader pulls ahead immediately, and each follower falls behind in proportion to how fast it can apply. Mid-burst a user posts a comment to the leader, and a few ticks later their refresh is routed to follower 3, the laggiest one. Run the timeline and watch whether that follower has applied past the comment when the read lands, then watch how long each follower takes to drain its lag once the burst ends.",
  "followers": 3,
  "writeRate": 1,
  "applyRate": 4,
  "ticks": 240,
  "burst": {
    "from": 20,
    "to": 50,
    "multiplier": 6
  },
  "scenario": {
    "writeTick": 30,
    "readTick": 34,
    "follower": 2
  },
  "caption": "Adding replicas buys read capacity, but lag is the tax: under a write burst the leader runs ahead, followers fall behind at different rates, and a read routed to a lagging follower is stale. Route lag-sensitive reads to the leader or to a follower whose lag you have bounded."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A product's database is melting and your first instinct is 'add replicas'. In which situation does that instinct actually fix the problem?",
  "options": [
    {
      "label": "Read traffic saturates the primary and writes are modest",
      "correct": true,
      "feedback": "Right. This is exactly what read replicas buy: reads fan out across followers added online with zero downtime, while the modest write stream stays within one leader's capacity."
    },
    {
      "label": "Write bursts are saturating the primary",
      "feedback": "Tempting because replicas feel like generic capacity, but every follower replays every write, so more replicas add zero write headroom. This case forces sharding."
    },
    {
      "label": "The dataset no longer fits on one machine",
      "feedback": "Each replica holds a full copy of the data, so replication multiplies the storage problem instead of splitting it. Partitioning the data across nodes is the fix."
    }
  ],
  "reveal": "Replication is the read lever: cheap, online, and linear in follower count, but bounded by one leader for writes and one machine for data. In the design exercise, say which workload is read-bound before you reach for replicas, and name the replication-lag consequence you are accepting."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Two regional leaders accept concurrent edits to the same profile field. A teammate proposes: just keep whichever write carries the later timestamp. Is that a safe default?",
  "options": [
    {
      "label": "Yes, it is deterministic and simple",
      "feedback": "Tempting, and it is even Cassandra's default. But deterministic is not the same as safe: one of the two users' edits is silently discarded, and 'later' depends on clocks that drift. The next section covers the alternatives."
    },
    {
      "label": "No, it silently throws away one user's write",
      "correct": true,
      "feedback": "Right. Last-write-wins resolves the conflict by destroying data, and clock skew can even pick the wrong 'later'. Version vectors, CRDTs, or an application merge preserve both writes instead."
    },
    {
      "label": "Conflicts cannot happen if replication is fast enough",
      "feedback": "Tempting, but speed does not help: both leaders accepted their write before either heard about the other. Concurrency creates the conflict, not lag."
    }
  ]
}
\`\`\`

**Leaderless (Dynamo-style):** any replica accepts a write, and the client (or a coordinator) writes
to and reads from multiple replicas. Cassandra, DynamoDB, and Riak work this way. Consistency comes
from **quorums**: with N replicas, if you require W replicas to ack a write and R to answer a read,
then **R + W > N** guarantees the read set and write set overlap on at least one node, so a read sees
the latest acked write. Common config is N=3, W=2, R=2. Tuning W and R trades consistency against
availability and latency: W=1 is fast but weakly durable, R=1 can read stale data.

\`\`\`cswidget
{
  "type": "quorum",
  "title": "Tune the quorum dial: N, W, R",
  "predictPrompt": {
    "question": "Common config: N=3, W=2, R=2. One replica crashes. Can writes and reads still succeed?",
    "options": [
      "No: every quorum needs all 3 replicas to answer",
      "Yes: the 2 survivors can still form both the W=2 write set and the R=2 read set",
      "Writes keep working but reads start failing"
    ]
  },
  "workedExample": "Start at N=3, W=2, R=2. A write is acknowledged once 2 of the 3 replicas have it, say nodes 1 and 2. A read waits for 2 answers, say nodes 2 and 3. Since R + W = 4 is greater than N = 3, the read set and the write set must overlap in at least one node, here node 2, which holds the latest acknowledged write. Kill one replica and exactly 2 remain: still enough for W=2 and R=2, so the system stays available. Now drop W to 1: writes get fast but weakly durable, and R + W = 3 no longer beats N, so a read can miss the only replica that saw the write.",
  "preset": "dynamo",
  "n": 3,
  "r": 2,
  "w": 2,
  "caption": "Slide W and R to trade consistency against availability and latency, then kill a replica and watch which quorums still form."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each behavior to the replication topology that produces it.",
  "buckets": [
    "Single-leader",
    "Multi-leader",
    "Leaderless"
  ],
  "items": [
    {
      "label": "No write-write conflicts, because one node serializes every write",
      "bucket": "Single-leader",
      "feedback": "One serialization point is exactly what buys conflict-freedom, at the cost of a write SPOF."
    },
    {
      "label": "Low-latency local writes in every region, with concurrent conflicting writes to merge",
      "bucket": "Multi-leader",
      "feedback": "The capability and the anomaly arrive together: local writes everywhere means two leaders can accept clashing writes."
    },
    {
      "label": "Any replica accepts writes; reads are safe when 'R + W > N'",
      "bucket": "Leaderless",
      "feedback": "Quorum overlap is the whole consistency story here: the read set and write set must share at least one node."
    },
    {
      "label": "Write availability hinges on risky failover when one node dies",
      "bucket": "Single-leader",
      "feedback": "The leader is the write SPOF; promoting a follower brings split-brain and lost-write risks."
    },
    {
      "label": "Sloppy quorums and hinted handoff keep writes flowing during node failures",
      "bucket": "Leaderless",
      "feedback": "Stand-in nodes accept writes for downed replicas, trading consistency for availability, then hand the data back."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The interviewer asks: 'So is your store CP or AP?' What is the strongest move?",
  "options": [
    {
      "label": "Pick one of the two letters confidently",
      "feedback": "Tempting because it sounds decisive, but the CAP binary hides the normal-operation tradeoff and says nothing about what a user actually experiences."
    },
    {
      "label": "Reason with PACELC and name the concrete anomaly a user would see",
      "correct": true,
      "feedback": "Right. During a partition: availability or consistency; else: latency or consistency. Then ground it: 'under last-write-wins, one region's edit silently overwrites the other'. That shows you reason about data, not letters."
    },
    {
      "label": "Say the system is both, as long as quorums are configured correctly",
      "feedback": "Tempting, because 'R + W > N' feels like consistency for free. But sloppy quorums, hinted handoff, and the latency cost of larger W and R mean you are still choosing tradeoffs; quorums tune the dial, they do not remove it."
    }
  ],
  "reveal": "Every topology buys its capability by exposing an anomaly: single-leader pays with a write SPOF, multi-leader with merge conflicts, leaderless with staleness and conflict windows. In your design write, name the topology you chose, the anomaly you accepted, and the conflict-resolution or quorum setting that contains it."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Each bug below violates one session guarantee. Match the symptom to the guarantee that would prevent it.",
  "buckets": [
    "Read-your-writes",
    "Monotonic reads",
    "Writes-follow-reads"
  ],
  "items": [
    {
      "label": "You post a comment, refresh, and your own comment is gone",
      "bucket": "Read-your-writes",
      "feedback": "The writer must always see their own write; nothing is promised about other users."
    },
    {
      "label": "A comment appears, vanishes on the next refresh, then comes back",
      "bucket": "Monotonic reads",
      "feedback": "Successive reads hit replicas with different lag, so time appears to go backwards. Monotonic reads forbids that flicker."
    },
    {
      "label": "A reply shows up before the comment it responds to",
      "bucket": "Writes-follow-reads",
      "feedback": "The reply was written in reaction to a read, so anyone who sees the reply must also see what it replies to. That is the causal guarantee."
    },
    {
      "label": "You update your bio, then still see the old one on the profile page",
      "bucket": "Read-your-writes",
      "feedback": "Same shape as the vanishing comment: your read raced ahead to a replica that had not applied your own write yet."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "replication-lag",
  "title": "The Vanishing Comment and Its Two Cures",
  "predictPrompt": {
    "question": "You post a comment during the write burst; your refresh a few ticks later is routed to the lagging follower with no cure in place. What do you see?",
    "options": [
      "The comment, because replicas apply writes within a tick or two",
      "Your own comment is missing, a read-your-writes violation",
      "An error, because the replica refuses to serve reads while it lags"
    ]
  },
  "workedExample": "Two followers replicate from the leader; the second applies entries more slowly, so the burst opens a real gap between them. The comment lands on the leader mid-burst and the refresh reads the slower follower a few ticks later, before it has applied the write, so with no cure the comment vanishes. Then try the cures. Sticky routing sends this user's reads to the leader for a while after their write: the simplest read-your-writes fix, but per-session, and it gives up replica scaling for those reads. The version token carries the write's log position with the read, and the replica holds the read until it has applied past that position: staleness bounded precisely, the read still served by a replica, and it works across devices if the token travels with the user.",
  "followers": 2,
  "writeRate": 2,
  "applyRate": 5,
  "ticks": 180,
  "burst": {
    "from": 15,
    "to": 45,
    "multiplier": 4
  },
  "scenario": {
    "writeTick": 25,
    "readTick": 28,
    "follower": 1
  },
  "caption": "Match the bug to its session guarantee, then buy just that guarantee: sticky routing to the leader is the simple single-device fix, and a version token that reads wait on delivers read-your-writes cross-device without pinning everything to the leader."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Requirement: a user who posts from their phone must see that post when they open their laptop seconds later. What do you reach for?",
  "options": [
    {
      "label": "Linearizability across the system",
      "feedback": "Tempting because it certainly works, but it makes every read pay consensus or leader-round-trip costs to fix one user-scoped bug. The product needs read-your-writes, not a global real-time order."
    },
    {
      "label": "Sticky-route the writing session to the leader for a while",
      "feedback": "Tempting, and it does fix the single-device case. But stickiness is per session: the laptop is a different session and still lands on a lagging replica."
    },
    {
      "label": "A version token stored with the user that reads must catch up to",
      "correct": true,
      "feedback": "Right. The write returns an LSN-style token, the token travels with the user, and any device's reads wait for a replica at or past it. Cross-device read-your-writes at a fraction of linearizability's cost."
    }
  ],
  "reveal": "The pattern to carry into the design write: name the exact session guarantee the user story needs, then buy just that guarantee with sticky routing or version tokens. Reserve linearizability for the rare operation that truly needs a global order, like claiming a unique username or a seat."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are sharding an append-heavy events table. A teammate suggests partitioning by timestamp so recent events sit together. Predict the write pattern.",
  "options": [
    {
      "label": "Writes spread evenly, since events arrive continuously",
      "feedback": "Tempting because time feels continuous, but at any given moment every new event carries roughly the newest timestamp, so they all map into the same range."
    },
    {
      "label": "All writes land on the newest partition while the others sit idle",
      "correct": true,
      "feedback": "Right. Sequential keys under range partitioning send 100 percent of writes to the highest range: one hot node and a fleet of spectators. This is the single most common partitioning mistake."
    },
    {
      "label": "Writes spread fine, but reads get slow",
      "feedback": "Backwards in this case: time-range reads are actually the scheme's strength. It is the write side that collapses onto one partition."
    }
  ]
}
\`\`\`

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

\`\`\`csdiagram
{
  "type": "table",
  "columns": [
    "Strategy",
    "How keys map",
    "Wins",
    "Costs"
  ],
  "rows": [
    [
      "Range",
      "Contiguous key ranges (A-F, G-M, N-Z) or time ranges",
      "Range scans hit 1 or 2 partitions",
      "Sequential keys hotspot the highest partition"
    ],
    [
      "Hash",
      "hash(key) mod N scatters adjacent keys",
      "Even spread, no sequential hotspot",
      "Range scans fan out to every partition; changing N remaps almost every key"
    ],
    [
      "Directory",
      "Explicit lookup table maps keys to partitions",
      "Surgical rebalance: split a hot range, move a heavy tenant",
      "Extra lookup hop plus a routing service that must stay highly available"
    ]
  ],
  "caption": "Map the dominant queries onto the scheme out loud: which reads hit one partition, and which became scatter-gather."
}
\`\`\`

Recap: horizontal partitioning is the only way to scale writes and data past one node; range wins
range scans but hotspots on sequential keys, hash spreads evenly but loses ranges and reshuffles on
mod N, directory adds a flexible routing hop, and secondary indexes are either scatter-gather locals
or write-costly globals.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each behavior to the partitioning strategy that produces it.",
  "buckets": [
    "Range",
    "Hash",
    "Directory"
  ],
  "items": [
    {
      "label": "'All orders from last Tuesday' touches one or two partitions",
      "bucket": "Range",
      "feedback": "Contiguous key ranges make time and prefix scans local. This is range partitioning's superpower."
    },
    {
      "label": "An auto-increment key turns one node into the sole write target",
      "bucket": "Range",
      "feedback": "The curse that comes with the superpower: sequential keys pile onto the highest range."
    },
    {
      "label": "Adjacent keys scatter, so a date query fans out to every partition",
      "bucket": "Hash",
      "feedback": "Hashing kills hotspots by destroying locality, so range queries become scatter-gather."
    },
    {
      "label": "Adding one node under plain 'hash(key) mod N' remaps almost every key",
      "bucket": "Hash",
      "feedback": "The 'mod N' trap: change N and nearly everything moves. Consistent hashing exists to fix exactly this."
    },
    {
      "label": "Move one heavy tenant to its own node by editing a routing table",
      "bucket": "Directory",
      "feedback": "Explicit lookup gives surgical control over placement and rebalancing."
    },
    {
      "label": "An extra lookup hop and a routing service that must stay highly available",
      "bucket": "Directory",
      "feedback": "Flexibility is paid for on the critical path: the routing metadata becomes infrastructure you operate."
    }
  ],
  "reveal": "Each family trades the same three things: scan locality, write spread, and rebalance flexibility. In the design write, state your dominant query first, pick the partition function that keeps that query single-partition, and say out loud which queries you just turned into scatter-gather."
}
\`\`\`
`.trim()

const consistentHashingTeach = `
## Why hash mod N is the wrong primitive

The naive way to place keys across N nodes is \`node = hash(key) mod N\`. It spreads load evenly, and
it is a disaster the moment N changes. Go from 10 nodes to 11 and the modulus changes for almost
every key, so roughly **10 of 11 keys map to a different node**. For a cache that means a near-total
miss storm that stampedes the database; for a database it means moving nearly the whole dataset to
add one machine. Since adding and removing nodes is the entire point of horizontal scale, mod N is
the wrong primitive.

\`\`\`cswidget
{
  "type": "hash-ring",
  "title": "Feel the remap: mod N versus the ring",
  "predictPrompt": {
    "question": "You add one node to a 4-node cluster placed by hash(key) mod N. What fraction of keys change owner?",
    "options": [
      "About 1 in 5",
      "About half",
      "Almost all of them"
    ]
  },
  "workedExample": "The scene opens in mod-N mode: 48 keys colored by owner across nodes A to D. Add node E and read the remap number; it lands near 80 percent. Then switch to the consistent-hash ring and add or remove a node again: the number collapses to roughly 1 in N, and virtual nodes flatten the shares.",
  "initialNodes": 4,
  "maxNodes": 7,
  "keys": 48,
  "initialMode": "modulo",
  "vnodeFactor": 16,
  "caption": "The interview phrase this earns: only about 1/N of keys move on the ring."
}
\`\`\`

### The ring

**Consistent hashing** fixes the remap cost. Imagine a ring of hash values from 0 to 2^32 - 1. Hash
each **node** to a position on the ring, and hash each **key** to a position too. A key is owned by
the **first node clockwise** from its position. Now add a node: it lands somewhere on the ring and
takes over only the keys between it and its counter-clockwise neighbor. Remove a node: its keys pass
to the next node clockwise. Either way you move only about **1/N of the keys**, and only between
adjacent nodes, instead of remapping the world. This is why Dynamo, Cassandra, Riak, and most
distributed caches are built on it.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A plain consistent-hash ring with one token per node. One node dies. Where does its load go?",
  "options": [
    {
      "label": "It spreads evenly across all surviving nodes",
      "feedback": "Tempting, because even spreading is what hashing seems to promise. But ownership is 'first node clockwise', so the dead node's entire arc has exactly one inheritor. Keep reading: this is one of the two problems virtual nodes fix."
    },
    {
      "label": "It all lands on the next node clockwise",
      "correct": true,
      "feedback": "Right. The single clockwise neighbor absorbs the whole arc, potentially doubling its load. Virtual nodes fix this by giving each machine many small arcs whose inheritors are many different nodes."
    },
    {
      "label": "Those keys become unreachable until the node returns",
      "feedback": "Tempting if you picture fixed assignments, but the ring rule always finds an owner: the keys simply resolve to the next node clockwise. Availability survives; balance is what suffers."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Interview question: 'Your 20-node cache cluster loses a machine. What happens?' Which answer earns the point?",
  "options": [
    {
      "label": "Keys rehash across the cluster, so expect a brief global miss storm",
      "feedback": "That is the 'hash mod N' failure you are supposed to design away. Describing it as expected behavior tells the interviewer you picked the wrong primitive."
    },
    {
      "label": "With consistent hashing and vnodes, only about 1 in 20 keys move, absorbed by many nodes",
      "correct": true,
      "feedback": "Right. That is the phrase to earn: only about '1/N' of keys move, and because each machine holds many small arcs, the inherited load spreads across many neighbors instead of crushing one."
    },
    {
      "label": "Nothing moves, because replicas already hold every key",
      "feedback": "Tempting, since replication does mask the loss for reads. But ownership still transfers for about '1/N' of keys, and some node must absorb that traffic and re-warm its cache."
    }
  ],
  "reveal": "You now have the full ladder: 'mod N' fails on any resize, the ring cuts movement to about 1/N, vnodes even out load and spread rebalancing, bounded-load caps hotspots, and rendezvous hashing covers small replica-selection jobs. In the design write, quantify the key movement when your system adds or loses a node."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your social graph is sharded by 'user_id' with consistent hashing and vnodes. A celebrity with 100M followers drives 1000x normal traffic. Does the hashing setup absorb it?",
  "options": [
    {
      "label": "Yes, vnodes spread every user's load across many nodes",
      "feedback": "Tempting, because vnodes do spread aggregate load beautifully. But they spread many keys; this is one key, and everything for that 'user_id' hashes to a single owner."
    },
    {
      "label": "No, one key maps to one node no matter how it hashes",
      "correct": true,
      "feedback": "Right. Consistent hashing balances load across keys; it cannot split load within a key. A hot key needs key-level surgery: salting, sub-partitioning, or a dedicated shard."
    },
    {
      "label": "Only if the celebrity also writes a lot",
      "feedback": "Reads alone are enough: 1000x read traffic aimed at one partition overwhelms its node regardless of write volume."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Pick the first mitigation you would reach for in each situation.",
  "buckets": [
    "Salt or split the hot key",
    "Dedicated shard",
    "Co-locate on one shard"
  ],
  "items": [
    {
      "label": "A handful of known celebrity keys take 1000x the write traffic of normal keys",
      "bucket": "Salt or split the hot key",
      "feedback": "Append a bucket suffix so one logical key spans K partitions; writes pick a bucket, reads fan out to K and merge. Reserve it for the known whales."
    },
    {
      "label": "One mega-tenant's traffic starves every neighbor in a multi-tenant SaaS",
      "bucket": "Dedicated shard",
      "feedback": "Route the whale to its own isolated nodes so its load cannot touch normal users. Pair with compound keys like '(tenant_id, entity_id)' for everyone else."
    },
    {
      "label": "An order and its line items must commit together atomically",
      "bucket": "Co-locate on one shard",
      "feedback": "Entity groups: shard both by 'order_id' so the common transaction stays single-shard."
    },
    {
      "label": "Reading one group's posts currently scatter-gathers across every partition",
      "bucket": "Co-locate on one shard",
      "feedback": "Aligning the key to the dominant query pulls the group's rows onto one partition, then you watch for the giant-group hotspot this creates."
    }
  ],
  "reveal": "The interview conversation runs in order: the three shard-key properties, the tension between them, the hot-key mitigation, and the resharding plan. In the design write, name your shard key, the query it aligns to, the hotspot it creates, and the mitigation plus logical pre-split you pair with it."
}
\`\`\`
`.trim()

const crossShardOpsTeach = `
## Sharding breaks joins and atomic multi-key writes

Sharding buys scale by breaking two things you took for granted on a single database: **joins** and
**atomic multi-key writes**. Once related rows can live on different nodes, a query that spans them
is a distributed operation, and a write that must change both is a distributed transaction.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Each of your 50 shards answers reads with a 'p99' of 10ms. A query fans out to all 50 shards and must wait for every one of them. About what fraction of these queries will see at least one shard running slower than its 'p99'?",
  "options": [
    {
      "label": "About 1%, the same as a single shard",
      "feedback": "Tempting: each shard individually is slow only 1% of the time. But the query waits for all 50, so the 1% risks add up across shards instead of staying at 1%."
    },
    {
      "label": "Around 40%",
      "correct": true,
      "feedback": "Right. The chance that every shard is fast is 0.99 raised to the 50th power, about 60%, so roughly 40% of fan-out queries wait on at least one slow shard. Fan-out latency is bounded by the slowest shard, not the average."
    },
    {
      "label": "Essentially 0%: slow responses are independent, so they cancel out",
      "feedback": "Tempting but backwards. Independence makes it worse, not better: fifty independent 1% risks compound, they never cancel."
    }
  ]
}
\`\`\`

### Cross-shard reads (scatter-gather)

A query that is not scoped to one shard key must fan out to every partition, and it is bounded by the
**slowest shard**, not the average. This is **tail latency amplification**: if each shard's p99 is
10ms and you hit 50 shards, the chance that *at least one* is slow is 1 minus 0.99^50, roughly 40%,
so the overall p99 is far worse than 10ms. Mitigations: avoid the fan-out by choosing the shard key to match
the query, **denormalize** so the data you need is co-located, cap the fan-out width, and use
hedged/speculative requests to blunt single-shard tail latency. The senior instinct is to design most
reads to touch one shard and treat scatter-gather as the rare, budgeted case.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You must atomically debit an account on shard A and credit an account on shard B. Two-phase commit gives exactly the atomicity you need. Should it be your default for this hot path?",
  "options": [
    {
      "label": "Yes, 2PC is exactly the tool for atomic cross-node writes",
      "feedback": "Tempting, and it is the textbook answer. But 2PC holds locks across network round trips and blocks indefinitely if the coordinator dies after prepare, which is fatal on a high-volume path."
    },
    {
      "label": "No, use a saga of local transactions with compensations",
      "correct": true,
      "feedback": "Right, and keep 2PC for the rare operations that genuinely must be atomic. The next sections show how a saga trades isolation for the absence of distributed locks, and what machinery, idempotency keys and the outbox, keeps it correct under failures."
    },
    {
      "label": "No, do the two writes independently and retry either failure",
      "feedback": "Tempting because it avoids locks, but with no compensations and no dedup, a crash between the writes strands money and a retry can double-apply a step."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "sequence",
  "title": "Cross-shard transfer: saga + outbox",
  "actors": [
    {
      "id": "svc",
      "label": "Transfer service"
    },
    {
      "id": "shardA",
      "label": "Shard A (account A)"
    },
    {
      "id": "shardB",
      "label": "Shard B (account B)"
    },
    {
      "id": "relay",
      "label": "Outbox relay"
    }
  ],
  "toggles": [
    {
      "id": "crashBetween",
      "label": "Crash after debit",
      "description": "the service dies after shard A commits and before shard B is credited"
    }
  ],
  "steps": [
    {
      "from": "svc",
      "to": "shardA",
      "kind": "request",
      "label": "debit A + outbox row (1 txn)"
    },
    {
      "from": "shardA",
      "to": "svc",
      "kind": "response",
      "label": "debit committed",
      "state": {
        "a": "done",
        "b": "pending"
      }
    },
    {
      "from": "svc",
      "to": "shardB",
      "kind": "request",
      "label": "credit B (idempotency key)",
      "when": "!crashBetween"
    },
    {
      "from": "shardB",
      "to": "svc",
      "kind": "response",
      "label": "credit committed",
      "when": "!crashBetween",
      "state": {
        "a": "done",
        "b": "done"
      }
    },
    {
      "from": "svc",
      "kind": "note",
      "label": "transfer COMPLETED",
      "when": "!crashBetween"
    },
    {
      "from": "svc",
      "kind": "note",
      "label": "service crashes",
      "status": "error",
      "when": "crashBetween",
      "state": {
        "a": "done",
        "b": "missing"
      }
    },
    {
      "from": "svc",
      "to": "shardB",
      "kind": "event",
      "label": "credit B never sent",
      "status": "lost",
      "when": "crashBetween"
    },
    {
      "from": "relay",
      "to": "shardA",
      "kind": "request",
      "label": "poll outbox table",
      "when": "crashBetween",
      "predict": {
        "question": "Shard A shows the debit, shard B was never told, and the service is dead. What saves the transfer?",
        "options": [
          "Nothing: the credit intent died with the service",
          "Shard A rolls back the debit on its own after a timeout",
          "The outbox row committed with the debit, so a relay replays the credit event"
        ]
      }
    },
    {
      "from": "shardA",
      "to": "relay",
      "kind": "response",
      "label": "credit-B event pending",
      "when": "crashBetween"
    },
    {
      "from": "relay",
      "to": "shardB",
      "kind": "request",
      "label": "replay credit B (same key)",
      "when": "crashBetween"
    },
    {
      "from": "shardB",
      "to": "relay",
      "kind": "response",
      "label": "committed, key recorded",
      "when": "crashBetween",
      "state": {
        "a": "done",
        "b": "done"
      }
    },
    {
      "from": "relay",
      "kind": "note",
      "label": "at-least-once made safe",
      "when": "crashBetween"
    }
  ],
  "caption": "The debit and its outbox row commit in one local transaction on shard A, so even when the service dies before crediting B, the relay replays the credit and the idempotency key makes the retry safe."
}
\`\`\`

**Interview nuance:** the failure mode interviewers hunt for is hand-waving cross-shard joins and
multi-key writes as if they were free. When the design crosses shards, say it: "this is now a
distributed transaction; I will use a saga with compensations and idempotency keys, not 2PC on the
hot path, and I will denormalize to keep the frequent reads single-shard."

Recap: sharding breaks joins (scatter-gather, bounded by the slowest shard) and atomic multi-key
writes; avoid 2PC on the hot path because it locks and blocks on coordinator failure; use a saga of
local transactions with compensating actions, make retries safe with idempotency keys, publish events
atomically with the outbox pattern, and denormalize to avoid cross-shard joins.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Before you design the cross-shard money transfer, match each mechanism to the failure it exists to prevent.",
  "buckets": [
    "Prevents double-apply on retry",
    "Prevents losing a step on crash",
    "Prevents cross-shard locking and blocking"
  ],
  "items": [
    {
      "label": "Idempotency key recorded in a per-shard dedup table",
      "bucket": "Prevents double-apply on retry",
      "feedback": "At-least-once delivery means the same 'credit B' can arrive twice; the recorded key makes the second apply a no-op."
    },
    {
      "label": "Outbox row committed in the same local transaction as the business write",
      "bucket": "Prevents losing a step on crash",
      "feedback": "The write and the intent-to-publish become atomic, so a crash between them cannot lose the event."
    },
    {
      "label": "Relay that re-reads the outbox and republishes until acknowledged",
      "bucket": "Prevents losing a step on crash",
      "feedback": "The relay turns the committed intent into at-least-once delivery; the idempotency key absorbs the duplicates it creates."
    },
    {
      "label": "Saga of local transactions with compensating actions",
      "bucket": "Prevents cross-shard locking and blocking",
      "feedback": "Each step commits on a single shard, so nothing holds locks across the network and no coordinator failure can strand them."
    }
  ],
  "reveal": "In your design write, name all three together: a saga instead of 2PC on the hot path, the outbox to drive each next step reliably, and idempotency keys to make at-least-once delivery safe. That combination is the whole answer."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Suppose you had chosen update-on-write instead: after each DB write, the app also writes the new value into the cache. W1 writes value A, then W2 writes value B, but their two cache updates arrive in the order B then A. What does the cache serve afterwards?",
  "options": [
    {
      "label": "B, the latest value: cache writes land in the same order as the DB commits",
      "feedback": "Tempting, but nothing synchronizes the two paths. The DB serialized W1 before W2, while the network is free to deliver the cache updates in any order."
    },
    {
      "label": "A, the stale value, until a TTL or the next delete rescues it",
      "correct": true,
      "feedback": "Right. The late-arriving A overwrites B and sticks. Deleting the key on write avoids the race entirely: the next read repopulates from the DB, the single source of truth."
    },
    {
      "label": "This cannot happen, because the cache executes commands one at a time",
      "feedback": "Tempting: a single-threaded cache does serialize execution, but it executes in arrival order, and arrival order is exactly what the race scrambles."
    }
  ]
}
\`\`\`

### Expiry, sizing, and the numbers

Every entry gets a **TTL**, and you add **jitter** (say 300s plus or minus a random 30s) so a cohort
of keys written together does not all expire at the same instant. Eviction policy (**LRU** for
recency, **LFU** for frequency) decides what leaves when memory fills. The number you optimize is the
**cache hit ratio**: at 95% hits your DB sees 5% of read traffic, so a drop from 95% to 90% doubles
DB load. Size the cache so the **hot working set** fits in memory; caching the long cold tail buys
nothing. **Negative caching** (caching "this key does not exist" for a short TTL) stops repeated
misses from hammering the DB for absent keys.

\`\`\`cswidget
{
  "type": "cache-sim",
  "title": "TTL, eviction, and the hit ratio",
  "predictPrompt": {
    "question": "This stream is skewed: about half of all requests go to one hot key. The cache holds 6 of the 12 keys and every entry expires after 40 ticks. Where will the hit ratio settle?",
    "options": [
      "High: LRU keeps the hot key and a few warm keys resident, so most requests hit",
      "About half: only half the keys fit in memory, so roughly half of all requests must miss",
      "Near zero: TTL expiry keeps wiping entries before they are ever reused"
    ]
  },
  "workedExample": "Start with the dials as given: 12 keys, room for 6, and a 40-tick TTL against a 6-tick rebuild. Because the stream is skewed toward one hot key, LRU keeps that key and the warm ones resident while the cold tail cycles out, so the hit ratio climbs well above what raw capacity suggests: eviction is doing exactly its job, discarding data that was barely re-read anyway. Expiries stay occasional because the TTL is long relative to the rebuild. Now shrink capacity and watch recency stop saving you, or pull the TTL down toward the rebuild time and watch misses start paying the rebuild latency again and again. The hit ratio is the number to defend: every point it loses lands directly on the database.",
  "seed": "product-page-hot-set",
  "keys": 12,
  "ticks": 240,
  "capacity": 6,
  "ttl": 40,
  "rebuildTicks": 6,
  "caption": "Cache-aside against a skewed read stream. TTL decides how long entries stay honest, LRU decides what leaves when memory fills, and the hit ratio is the number the database feels."
}
\`\`\`

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your cache runs at a 99% hit ratio and the DB comfortably handles the 1% of reads that miss. A deploy nudges the hit ratio down to 98%. What happens to DB read load?",
  "options": [
    {
      "label": "It rises about 1%, barely noticeable",
      "feedback": "Tempting because the hit ratio only moved one point, but the DB never sees the hits. It only sees misses, and the miss rate is what changed."
    },
    {
      "label": "It doubles",
      "correct": true,
      "feedback": "Right. Misses went from 1% to 2% of all reads, so the DB sees twice the traffic. At high hit ratios, tiny hit-ratio drops are large miss-rate multipliers."
    },
    {
      "label": "It halves",
      "feedback": "Backwards: the hit ratio fell, so more reads fall through to the DB, not fewer."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You are defending a cache in a design review. Match each requirement to the write pattern you would reach for.",
  "buckets": [
    "Cache-aside plus invalidate-on-write",
    "Write-back",
    "Write-around"
  ],
  "items": [
    {
      "label": "Product page that must reflect an edit on the very next read",
      "bucket": "Cache-aside plus invalidate-on-write",
      "feedback": "Deleting the key on write forces the next read to repopulate from the DB, so staleness ends at the write instead of waiting out a TTL."
    },
    {
      "label": "View counter absorbing write bursts, where losing a few increments is acceptable",
      "bucket": "Write-back",
      "feedback": "Write-back acknowledges before the DB write happens, which is exactly the durability trade a lossy counter can afford."
    },
    {
      "label": "Bulk import of rows that will rarely, if ever, be read",
      "bucket": "Write-around",
      "feedback": "Skipping the cache on write keeps write-once data from evicting your hot working set."
    },
    {
      "label": "The sensible default when no requirement pushes you elsewhere",
      "bucket": "Cache-aside plus invalidate-on-write",
      "feedback": "It caches only requested data, degrades to slower DB reads if the cache dies, and keeps the DB the source of truth."
    }
  ],
  "reveal": "In your design write, never say 'add a cache' alone: name the read pattern, the write policy, the TTL with jitter, and the consistency window you are promising the reader."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "cache-sim",
  "title": "The hot key expires under load",
  "predictPrompt": {
    "question": "About half of all requests land on one hot key. Its TTL runs out and the entry vanishes while the database rebuild takes 8 ticks. What happens during those 8 ticks?",
    "options": [
      "One miss: the first request rebuilds it and everyone else keeps hitting the cache",
      "A dog-pile: every request for the hot key misses and launches its own duplicate rebuild until the first one finally lands",
      "Nothing visible: the other keys keep hitting, so the overall picture barely moves"
    ]
  },
  "workedExample": "With the starting dials the TTL is comfortably longer than the 8-tick rebuild, so expiries are rare and the hot key is almost always present: the cache looks healthy. Flip the stampede toggle to force the TTL below the rebuild time and the paragraph above plays out in front of you: the instant the hot key expires, every arriving request misses and starts its own rebuild, and the pile of in-flight queries grows faster than the first rebuild can finish. Then turn on coalescing: the first requester rebuilds, everyone else waits on that single flight, and the pile collapses to one rebuild per expiry. Same load, same TTL, one query instead of a stack of them.",
  "seed": "hot-key-dogpile",
  "keys": 10,
  "ticks": 300,
  "capacity": 8,
  "ttl": 60,
  "rebuildTicks": 8,
  "caption": "The stampede is a race between request arrivals and one slow rebuild. Coalescing does not make the rebuild faster; it makes it singular."
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A flash-sale SKU is read 500K times per second. The value is sitting in cache, nowhere near expiry, but the one Redis shard that owns the key is at 100% CPU. Does singleflight coalescing fix this?",
  "options": [
    {
      "label": "Yes: it collapses the 500K reads into one",
      "feedback": "Tempting, but coalescing dedups rebuilds on a miss. These requests are hits: there is nothing to rebuild, just one shard drowning in reads for one key."
    },
    {
      "label": "No: the value is present, so there is no rebuild to coalesce; the shard itself is saturated",
      "correct": true,
      "feedback": "Right. Expiry misses and raw volume are different failures. A genuinely hot key needs its reads spread out or absorbed before they ever reach the shard."
    },
    {
      "label": "Yes, if you upgrade the process-local lock to a distributed lock",
      "feedback": "Tempting: a distributed lock widens coalescing to the whole fleet, but it still only governs rebuild-on-miss. It does nothing for hit traffic on a value that is already there."
    }
  ]
}
\`\`\`

### The genuinely hot key

Sometimes the problem is not expiry but sheer volume: one key (a viral tweet, a flash-sale SKU) is
read so often that even a single Redis shard cannot serve it, because all requests for one key hash
to one shard. Coalescing does not help here since the value is present; the shard is simply
saturated. The fixes are **key replication** (write the value under N suffixed keys
\`hotkey:0..N\` spread across shards and have clients read a random one) and a **client-side near
cache (L1)** on each app server so most reads never reach Redis at all. Hot-key detection (per-key
request rates) tells you which keys need this treatment.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "An engineer flushes the entire cache at peak traffic to clear a bad config, reasoning that each key will just miss once and refill. What actually happens?",
  "options": [
    {
      "label": "A brief blip: one miss per key, then normal service",
      "feedback": "Tempting per-key logic, but every key misses at the same moment, so the DB takes the entire read volume at once instead of a trickle of misses."
    },
    {
      "label": "A whole-keyspace stampede: the DB absorbs close to the full read load and can spiral",
      "correct": true,
      "feedback": "Right. A cold cache is the stampede on every key simultaneously. That is why flushes and cold starts call for cache warming or a gradual traffic ramp."
    },
    {
      "label": "Only the hottest few keys cause trouble; the long tail refills quietly",
      "feedback": "Tempting, but the tail is huge in aggregate: even rarely-read keys all missing together adds up to the full pre-cache load."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each failure to the defense family you would lead with. You will layer them in your design, but know which one carries each case.",
  "buckets": [
    "Request coalescing",
    "Jitter or early refresh",
    "Replication or L1 near cache"
  ],
  "items": [
    {
      "label": "A popular key expires and 3,000 concurrent requests all miss at once",
      "bucket": "Request coalescing",
      "feedback": "Singleflight turns those 3,000 rebuilds into exactly one DB query; everyone else waits briefly and reads the fresh value."
    },
    {
      "label": "A cohort of keys cached together all vanish at the same instant",
      "bucket": "Jitter or early refresh",
      "feedback": "TTL jitter spreads a cohort's expiries across a window so there is no single cliff."
    },
    {
      "label": "A key under constant heavy load must never actually hit its expiry",
      "bucket": "Jitter or early refresh",
      "feedback": "Probabilistic early recomputation (XFetch) refreshes it in the background before the TTL lands, so readers never see a miss."
    },
    {
      "label": "A viral key saturates its shard even though the cached value is valid",
      "bucket": "Replication or L1 near cache",
      "feedback": "Only spreading the reads helps: N suffixed copies across shards, or a per-node L1 so most reads never reach Redis at all."
    }
  ],
  "reveal": "A strong design write layers all three families and adds the cold-start rule: never bring an empty cache online under full load; warm it or ramp traffic, with coalescing on."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Which engine does each requirement point to?",
  "buckets": [
    "Redis",
    "Memcached"
  ],
  "items": [
    {
      "label": "Atomic counters, rate limiters, and leaderboards",
      "bucket": "Redis",
      "feedback": "Rich data structures with atomic operations are the core Redis pitch."
    },
    {
      "label": "A lean cache of opaque blobs squeezing every core of one big box",
      "bucket": "Memcached",
      "feedback": "Memcached is multithreaded within one instance, so a single process scales across cores; Redis executes commands on a single thread."
    },
    {
      "label": "Built-in replication with automatic failover",
      "bucket": "Redis",
      "feedback": "Replication, Sentinel, and Cluster failover ship with Redis; Memcached leaves high availability to the client."
    },
    {
      "label": "Surviving a restart with the cached data intact",
      "bucket": "Redis",
      "feedback": "RDB snapshots and the AOF log are Redis persistence options; Memcached is memory-only by design."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A region failover points 100% of traffic at a brand-new, completely empty Redis cluster. Normally the cache absorbs 95% of reads. In the first moments, what does the database see?",
  "options": [
    {
      "label": "Roughly its normal 5%, refilling smoothly as each key misses once",
      "feedback": "Tempting per-key reasoning, but the misses do not queue up politely: they happen at the same moment across the entire keyspace."
    },
    {
      "label": "Close to 100% of the read volume at once, a 20x surge it was never sized for",
      "correct": true,
      "feedback": "Right. An empty cache passes everything through, and a DB sized for 5% of reads suddenly meets all of them. This is the flush trap the next paragraph names."
    },
    {
      "label": "Only the hot keys' share of traffic until the tail warms up",
      "feedback": "Tempting, but hot and cold keys alike miss on an empty cache, and the cold tail in aggregate is most of the volume."
    }
  ]
}
\`\`\`

**Interview nuance: the flush trap.** A **cold cache is not safe to bring online under load**,
because every read misses and the full read volume hits the origin at once: the stampede across the
whole keyspace. A cache restart, region failover, or \`FLUSHALL\` must be paired with cache warming
or a gradual traffic ramp, with coalescing on. Treating a flush as free is the wrong turn
interviewers listen for.

\`\`\`csdiagram
{
  "type": "topology",
  "title": "L1 near cache, sharded L2, and the disposable-cache principle",
  "nodes": [
    {
      "id": "app",
      "label": "App servers",
      "kind": "service"
    },
    {
      "id": "l1_near",
      "label": "L1 near cache (local LRU in each app process)",
      "kind": "cache"
    },
    {
      "id": "shard_a",
      "label": "Shard A: primary + replica (slots 0-5460)",
      "kind": "cache"
    },
    {
      "id": "shard_b",
      "label": "Shard B: primary + replica (slots 5461-10922)",
      "kind": "cache"
    },
    {
      "id": "shard_c",
      "label": "Shard C: primary + replica (slots 10923-16383)",
      "kind": "cache"
    },
    {
      "id": "db",
      "label": "DB: source of truth",
      "kind": "db"
    }
  ],
  "edges": [
    {
      "from": "app",
      "to": "l1_near",
      "kind": "sync",
      "label": "hottest keys, no network hop"
    },
    {
      "from": "l1_near",
      "to": "shard_a",
      "kind": "sync",
      "label": "CRC16 mod 16384 -> slot"
    },
    {
      "from": "l1_near",
      "to": "shard_b",
      "kind": "sync"
    },
    {
      "from": "l1_near",
      "to": "shard_c",
      "kind": "sync"
    },
    {
      "from": "app",
      "to": "db",
      "kind": "sync",
      "label": "fall through on miss"
    }
  ],
  "stages": [
    {
      "adds": [
        "app",
        "db"
      ],
      "note": "The cache is disposable because the DB stays the source of truth: losing a cache node loses only performance, never data, as long as the app falls through to the DB on a miss."
    },
    {
      "adds": [
        "shard_a",
        "shard_b",
        "shard_c"
      ],
      "note": "One node is not enough: Redis Cluster splits the keyspace into 16,384 hash slots across shards, each a primary with replicas and failover, so adding a shard moves some slots instead of rehashing everything."
    },
    {
      "adds": [
        "l1_near"
      ],
      "note": "A remote cache is a network hop, too slow for the very hottest keys at high QPS: the L1 near cache kills the hottest reads and shields Redis shards from hot keys, at the cost of a second consistency layer (pub/sub invalidation or a short L1 TTL)."
    }
  ],
  "caption": "Sharding, replication, and tiering make the cache tier a distributed system of its own; never bring it online cold under full load."
}
\`\`\`

Recap: pick Redis for structures/persistence/replication or Memcached for a lean multi-core blob
cache, shard by hash slots so topology changes move few keys, replicate each shard with failover,
tier L1-near plus L2-remote, keep L2 consistent via invalidate-on-write or versioned keys, and never
bring a cold cache online under full load.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A Redis primary dies mid-traffic. Sentinel promotes a replica, and because replication is asynchronous, the last few cached writes are simply gone. Before you write your design: is this a flaw you must engineer away?",
  "options": [
    {
      "label": "Yes: add synchronous replication so the cache never loses a write",
      "feedback": "Tempting, but you would pay a latency tax on every cache write to protect data that already lives safely in the database."
    },
    {
      "label": "No: the cache is disposable; the DB is the source of truth and misses fall through to it",
      "correct": true,
      "feedback": "Right. Losing a cache node loses performance, never data. The principle is also a constraint: never let the cache hold the only copy of anything, which is exactly what write-back of authoritative data would do."
    },
    {
      "label": "Only if AOF persistence was disabled",
      "feedback": "Tempting, and persistence does narrow the window, but failover to an async replica can still drop acknowledged writes. The safety comes from the DB being the system of record, not from cache durability settings."
    }
  ],
  "reveal": "In your design write, walk the tier top down: engine choice with a reason, hash-slot sharding, replicas with failover, L1 plus L2, an explicit invalidation story, and the cold-cache rule. The through-line is that the cache is disposable and the database is not."
}
\`\`\`
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

\`\`\`csdiagram
{
  "type": "topology",
  "title": "Pull CDN hierarchy with an origin shield",
  "nodes": [
    {
      "id": "users",
      "label": "Users worldwide",
      "kind": "client"
    },
    {
      "id": "l1_edges",
      "label": "L1 edge PoPs (~20 ms from users)",
      "kind": "cdn"
    },
    {
      "id": "l2_regional",
      "label": "L2 regional PoPs",
      "kind": "cdn"
    },
    {
      "id": "shield",
      "label": "Origin shield",
      "kind": "cdn"
    },
    {
      "id": "origin",
      "label": "Origin (protected)",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "users",
      "to": "l1_edges",
      "kind": "sync",
      "label": "millions of QPS"
    },
    {
      "from": "l1_edges",
      "to": "l2_regional",
      "kind": "sync",
      "label": "L1 misses"
    },
    {
      "from": "l2_regional",
      "to": "shield",
      "kind": "sync",
      "label": "coalesced misses"
    },
    {
      "from": "shield",
      "to": "origin",
      "kind": "sync",
      "label": "~1 fetch per object"
    }
  ],
  "stages": [
    {
      "adds": [
        "users",
        "origin"
      ],
      "note": "Without a CDN, a Sydney user pays roughly 150 to 250 ms of round-trip time to a single us-east-1 origin, and the origin handles every request itself."
    },
    {
      "adds": [
        "l1_edges",
        "l2_regional"
      ],
      "note": "Pull CDN: L1 edges about 20 ms from users cache an object on first miss and serve later hits locally; a smaller L2 regional tier absorbs the L1 misses."
    },
    {
      "adds": [
        "shield"
      ],
      "note": "When a popular object expires, thousands of edges could miss simultaneously; the shield lets one request through to origin, holds the others, and fans the single response back out, so the origin sees thousands of QPS instead of millions."
    }
  ],
  "caption": "Each tier shrinks what the next tier sees; pair the shield with stale-while-revalidate so edges keep serving while one background fetch refreshes."
}
\`\`\`

### Invalidation and cache keys

You have three tools. **TTL expiry** is simplest but coarse. **Explicit purge** is precise but slow
to propagate globally and easy to over-use. The production default is **versioned or content-hashed
URLs**: \`app.4f9c2a.js\` instead of \`app.js\`. A new deploy is a new URL, so you can cache the old
one forever (immutable) and never purge; the HTML that references it gets a short TTL. This sidesteps
invalidation almost entirely.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A teammate sets 'Vary: Cookie' on cached pages so that users with different cookies can never share an entry. What happens to the CDN hit rate?",
  "options": [
    {
      "label": "Roughly unchanged: most users share the same few cookie values",
      "feedback": "Tempting, but cookies carry per-user session ids and analytics values, so nearly every user presents a unique Cookie header."
    },
    {
      "label": "It collapses toward zero: nearly every request becomes its own cache entry",
      "correct": true,
      "feedback": "Right. Varying on Cookie fragments the cache per user, which is barely a cache at all. Vary only on headers that truly change the response body, like 'Accept-Encoding'."
    },
    {
      "label": "It improves: the cache stops serving wrong entries to the wrong users",
      "feedback": "Tempting because correctness sounds like a win, but the right fix for personalized responses is to not cache them at a shared edge, not to fragment the whole cache by cookie."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You are about to design the CDN layer. Sort each response by how the edge should treat it.",
  "buckets": [
    "Cache long or forever",
    "Micro-cache for seconds",
    "Never cache at a shared edge"
  ],
  "items": [
    {
      "label": "'app.4f9c2a.js', a content-hashed bundle",
      "bucket": "Cache long or forever",
      "feedback": "The hash makes it immutable: a new deploy is a new URL, so the old one never needs purging."
    },
    {
      "label": "The public homepage during a traffic spike",
      "bucket": "Micro-cache for seconds",
      "feedback": "A 1 to 5 second TTL with stale-while-revalidate collapses a 100k QPS spike to a handful of origin fetches per second."
    },
    {
      "label": "A logged-in user's account page body",
      "bucket": "Never cache at a shared edge",
      "feedback": "A shared entry here leaks one user's data to another. Assemble personalization with edge compute over a cached shell instead."
    },
    {
      "label": "An API response keyed to an auth token",
      "bucket": "Never cache at a shared edge",
      "feedback": "Authenticated bodies are per-user by definition; caching them at a shared edge is a data leak waiting to happen."
    }
  ],
  "reveal": "Your design write should name the hierarchy (edge PoPs, regional tier, origin shield coalescing misses), versioned URLs as the invalidation default, normalized cache keys, and a hard line between cacheable and never-cacheable responses."
}
\`\`\`
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

\`\`\`csdiagram
{
  "type": "topology",
  "title": "From documents to a queryable inverted index",
  "nodes": [
    {
      "id": "docs",
      "label": "Docs in the primary DB (doc7: 'Wireless Bluetooth Headphones')",
      "kind": "db"
    },
    {
      "id": "analyzer",
      "label": "Analyzer: tokenize, lowercase, stem, stopwords, synonyms",
      "kind": "service"
    },
    {
      "id": "postings",
      "label": "Inverted index: term -> posting list",
      "kind": "db"
    },
    {
      "id": "searcher",
      "label": "Query: 'wireless headphone'",
      "kind": "client"
    },
    {
      "id": "search_tier",
      "label": "Search tier: intersect postings, rank by BM25",
      "kind": "service"
    }
  ],
  "edges": [
    {
      "from": "docs",
      "to": "analyzer",
      "kind": "async",
      "label": "doc text at index time"
    },
    {
      "from": "analyzer",
      "to": "postings",
      "kind": "async",
      "label": "terms: wireless, bluetooth, headphone"
    },
    {
      "from": "searcher",
      "to": "search_tier",
      "kind": "sync",
      "label": "same analyzer at query time"
    },
    {
      "from": "search_tier",
      "to": "postings",
      "kind": "sync",
      "label": "intersect 'wireless' AND 'headphone' -> doc7, doc204"
    }
  ],
  "stages": [
    {
      "adds": [
        "docs",
        "analyzer"
      ],
      "note": "Terms never enter the index raw: the analysis pipeline tokenizes, lowercases, stems ('running' collapses to 'run'), drops stopwords, and expands synonyms."
    },
    {
      "adds": [
        "postings"
      ],
      "note": "The index inverts the mapping: each term points to a posting list of the docs that contain it ('headphone' -> doc7, doc19, doc204), which is what a LIKE full scan can never give you."
    },
    {
      "adds": [
        "searcher",
        "search_tier"
      ],
      "note": "The query runs the SAME analyzer so terms match, then the engine intersects posting lists in milliseconds and ranks the survivors with BM25."
    }
  ],
  "caption": "The build path (docs -> analyzer -> posting lists) and the query path meet at the inverted index; both sides must share one analyzer."
}
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A crawler requests results 100,000 through 100,010 using a large 'from' offset. Compared to page one, what does this cost the cluster?",
  "options": [
    {
      "label": "About the same, since the index seeks straight to the offset",
      "feedback": "Tempting B-tree intuition, but relevance order is computed fresh per query against the terms you searched for. There is no precomputed position 100,000 on disk to seek to."
    },
    {
      "label": "Far more, every shard ranks 100,010 documents first",
      "correct": true,
      "feedback": "Right, and the cost grows with the offset rather than the page size. No shard can know which of its documents land in the global top 100,010, so each one ranks and ships that many and the coordinator merges the lot. Use 'search_after' cursors and cap the page depth."
    },
    {
      "label": "Slightly more, and only the coordinating node pays",
      "feedback": "Tempting, but the coordinator can only discard what the shards have already ranked and shipped to it. The work proportional to the offset happens on every shard first."
    }
  ]
}
\`\`\`

**Interview nuance:** the classic trap is **deep pagination**. \`from: 100000, size: 10\` forces
every shard to sort 100,010 docs and is O(offset). Use **\`search_after\`** (a cursor on the last
sort value) for deep result sets, and cap the max page. Also be ready to say why you would not make
Elasticsearch your primary DB: weaker durability and consistency guarantees, and no transactions.

Recap: search runs on a dedicated tier built on an inverted index plus an analysis pipeline, ranks
with BM25 and boosting, separates scoring queries from cached filters, shards across primaries and
replicas, stays in sync as an eventually-consistent derived store fed by CDC, and paginates deep sets
with search_after, never large from offsets.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Final gut check before you design the search tier: sort each decision.",
  "buckets": [
    "Sound design",
    "Trap"
  ],
  "items": [
    {
      "label": "Feed the index by CDC from the primary DB and accept a second or two of lag",
      "bucket": "Sound design",
      "feedback": "Search is a derived, rebuildable store; eventual consistency is the honest and standard contract."
    },
    {
      "label": "Make Elasticsearch the system of record to remove a moving part",
      "bucket": "Trap",
      "feedback": "Tempting simplification, but it trades away durability, consistency, and transactions. The truth stays in the primary DB."
    },
    {
      "label": "Express brand and price constraints as filters, not queries",
      "bucket": "Sound design",
      "feedback": "Filters do not score and are deterministic, so the engine caches them as bitsets and reuses them across requests."
    },
    {
      "label": "Serve page 10,000 with a large 'from' offset",
      "bucket": "Trap",
      "feedback": "That is the deep-pagination trap you just predicted: cost grows with the offset on every shard. Use 'search_after' and cap depth."
    },
    {
      "label": "Run one analyzer at index time and a different one at query time",
      "bucket": "Trap",
      "feedback": "Tempting to tune them separately, but the produced terms must match exactly; mismatched analyzers silently return nothing."
    },
    {
      "label": "Plan for full reindexing with an atomic alias switch",
      "bucket": "Sound design",
      "feedback": "Mapping changes require a rebuild; because the index is derived, you build fresh and flip the alias with zero downtime."
    }
  ],
  "reveal": "In your design write, present search as a dedicated derived tier: inverted index plus analysis pipeline, BM25 with boosting, cached filters, sharded primaries with replicas, CDC sync, alias-based reindexing, and cursor pagination."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your hybrid pipeline ran both retrievers. BM25 scores one document 27.4 and cosine similarity scores another 0.91. How should the two ranked lists be combined?",
  "options": [
    {
      "label": "Add each document's BM25 and cosine scores and sort by the sum",
      "feedback": "Tempting because both look like relevance scores, but BM25 is unbounded and dataset dependent while cosine lives in 0 to 1, so the sum is dominated by BM25 and effectively meaningless."
    },
    {
      "label": "Normalize both scores to 0 to 1 first, then add them",
      "feedback": "Closer, but min-max normalizing BM25 still depends on whatever happened to land in this result set, so the blend shifts from query to query. The robust fix ignores raw scores entirely."
    },
    {
      "label": "Ignore the raw scores and fuse by rank position",
      "correct": true,
      "feedback": "Right. Reciprocal Rank Fusion gives each document 1 / (k + rank) from each list and sums those contributions, so a document ranked high by either method surfaces and the incompatible score scales never touch."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Map each job to the pipeline stage that owns it.",
  "buckets": [
    "BM25 lexical index",
    "Dense vectors + ANN",
    "Cross-encoder reranker"
  ],
  "items": [
    {
      "label": "Match the exact error code 'E-4021'",
      "bucket": "BM25 lexical index",
      "feedback": "Embeddings blur exact strings; the inverted index matches the literal token."
    },
    {
      "label": "Match 'my card was declined' to 'payment authorization failed'",
      "bucket": "Dense vectors + ANN",
      "feedback": "Zero shared tokens, so only semantic similarity in embedding space finds it."
    },
    {
      "label": "Reorder the top 100 candidates into a precise top 5",
      "bucket": "Cross-encoder reranker",
      "feedback": "It reads the query together with each candidate: far too expensive for the whole corpus, affordable over 100 items."
    },
    {
      "label": "Trade a little recall for a big latency win via HNSW or IVF",
      "bucket": "Dense vectors + ANN",
      "feedback": "ANN indexes make nearest-neighbor search sublinear; 'efSearch' and 'nprobe' tune where you sit on the recall/latency/memory curve."
    }
  ],
  "reveal": "That is the whole design: two cheap recall-oriented retrievers in parallel, RRF fusing them by rank because their score scales are incompatible, and one expensive precision stage over a small candidate set. In your design write, name all three stages, say where metadata pre-filtering happens, and flag the re-embedding migration cost of changing the embedding model."
}
\`\`\`
`.trim()

const geospatialIndexingTeach = `
## "Find drivers near me" is a scaling trap

The naive query, \`WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?\` or worse a full distance scan,
cannot use a normal B-tree index effectively (two independent range predicates) and does not scale.
Worse, distance on a sphere is not Euclidean. The real problem is turning a **2D nearest-neighbor
query into a 1D or hierarchical key** you can index, shard, and range-scan.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You add B-tree indexes on lat and lng and run 'WHERE lat BETWEEN ? AND ? AND lng BETWEEN ? AND ?'. Why does this stay slow at scale?",
  "options": [
    {
      "label": "Only one of the two range predicates can use an index",
      "correct": true,
      "feedback": "Right. Two independent range predicates do not compose in one B-tree, so the engine picks one, scans an entire latitude band, and filters the rest of the candidate strip row by row. That is exactly why we encode both dimensions into a single indexable key."
    },
    {
      "label": "B-trees cannot index floating point columns",
      "feedback": "Tempting if you have heard B-trees prefer discrete keys, but they index floats fine. The blocker is the shape of the query, not the column type."
    },
    {
      "label": "The plan is fine, the real problem is spherical distance",
      "feedback": "Spherical distance is a real second problem, but even with perfect distance math the two-range predicate still cannot use a B-tree effectively. The index shape fails first."
    }
  ]
}
\`\`\`

### Geohash: nearby points share a prefix

Interleave the bits of latitude and longitude and encode them base-32 into a short string. The magic
property: **nearby points share a prefix**. \`9q8yy\` and \`9q8yz\` are adjacent cells; truncating
the string zooms out. This means a geohash stores trivially in **any B-tree or a Redis sorted set**
and **shards by prefix**, and a proximity query becomes a prefix range scan. The flaw is **boundary
problems**: two points a meter apart can straddle a cell edge and share almost no prefix. The fix is
to query the target cell **plus its 8 neighbors** (a 3x3 ring) so you never miss a nearby point.

\`\`\`
  geohash "9q8yy" and neighbors (query a 3x3 ring to avoid edge misses):
     9q8yw 9q8yx 9q8yz
     9q8yt [9q8yy] 9q8zn      <- center cell + 8 neighbors
     9q8ym 9q8yq 9q8yr
\`\`\`

### Quadtree, S2, and H3

**Quadtree** recursively subdivides space into four quadrants, but only where it is dense: a downtown
block splits into fine cells while an ocean stays one coarse cell. This **adapts to non-uniform
density** at the cost of maintaining a tree rather than flat key math.

**S2 (Google)** projects the sphere onto a cube and orders cells along a **Hilbert curve**, giving
excellent spatial locality (nearby cells have nearby ids, so range scans are tight) and true
spherical geometry, with 30 levels of precision. **H3 (Uber)** tiles the world in **hexagons**.
Hexagons matter because every neighbor is equidistant (a square has 4 close and 4 diagonal
neighbors), which makes movement, coverage, and radius queries cleaner: exactly what a rideshare or
delivery system wants.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Three indexing schemes, four signature properties. Sort each property under its scheme.",
  "buckets": [
    "Geohash",
    "Quadtree",
    "H3"
  ],
  "items": [
    {
      "label": "Nearby points share a string prefix, so it stores in any B-tree or Redis sorted set",
      "bucket": "Geohash",
      "feedback": "Bit interleaving plus base-32 encoding turns proximity into a prefix range scan."
    },
    {
      "label": "Subdivides only where points are dense; an ocean stays one coarse cell",
      "bucket": "Quadtree",
      "feedback": "Adaptive splitting handles non-uniform density, at the cost of maintaining a tree instead of flat key math."
    },
    {
      "label": "Hexagonal cells where every neighbor sits at the same distance",
      "bucket": "H3",
      "feedback": "Uniform neighbor distance is why movement, coverage, and ring queries in rideshare systems prefer it."
    },
    {
      "label": "Two points a meter apart can share almost no prefix across a cell edge",
      "bucket": "Geohash",
      "feedback": "The boundary flaw: this is why you always query the center cell plus its 8 neighbors."
    }
  ],
  "reveal": "S2 rounds out the set: Hilbert-curve cell ordering gives it tight range scans and true spherical geometry, landing between geohash's simplicity and H3's hexagon advantages."
}
\`\`\`

### Cell size, hot cells, and moving points

The central tuning knob is **cell size versus cell count**. Finer cells hold fewer points (cheap
scans) but a radius query must enumerate more cells; coarser cells mean fewer cells but more points
per cell to scan and filter. Rule of thumb: pick a resolution near your **typical query radius**,
query a **ring of neighbor cells**, then do a final exact-distance filter and sort on the small
candidate set.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Geohash precision: bits to cell size",
  "predictPrompt": {
    "question": "You append two more base-32 characters (10 more bits) to your geohash keys. What happens to the cell width?",
    "options": [
      "It halves",
      "It shrinks about 10x",
      "It shrinks 32x",
      "It shrinks 1024x"
    ]
  },
  "workedExample": "The lesson's geohash 9q8yy is 5 base-32 characters at 5 bits each, 25 bits of interleaved lat/lng, so start the slider one notch up at 26 bits. Half the bits slice longitude: 2 to the power 13 is 8192 slices of the 40075 km equator, so the cell is 40075 / 8192, about 4.9 km wide, and 20004 / 8192, about 2.4 km tall along the pole-to-pole half meridian. That roughly 5 km cell is exactly the resolution where a 5-character prefix range scan matches a city-scale query radius. Each 2-bit step of the slider halves both dimensions, so 10 extra bits (two more characters) shrink the cell width 32x.",
  "inputs": [
    {
      "kind": "slider",
      "id": "bits",
      "label": "Interleaved bits in the cell key",
      "min": 10,
      "max": 50,
      "scale": "linear",
      "step": 2,
      "initial": 26,
      "unit": "bits"
    }
  ],
  "outputs": [
    {
      "id": "cellWidthKm",
      "label": "Cell width",
      "expr": "40075 / pow(2, bits / 2)",
      "format": "number",
      "unit": "km",
      "sparkline": {
        "over": "bits"
      }
    },
    {
      "id": "cellHeightKm",
      "label": "Cell height",
      "expr": "20004 / pow(2, bits / 2)",
      "format": "number",
      "unit": "km"
    }
  ],
  "caption": "Pick the precision whose cell width sits near your typical query radius, then query the cell plus its 8 neighbors; finer cells mean cheaper scans but more cells per radius query."
}
\`\`\`

The failure mode that separates seniors from juniors is the **hot cell**. A dense downtown or a
stadium at concert-end becomes a single cell with a huge point set: a hotspot on both writes and
reads. Fixes: **subdivide adaptively** (quadtree, or drop to a finer S2/H3 resolution just for that
cell), **cap points per cell**, **shard hot cells separately** so one node does not carry Manhattan,
and **cache** popular cell results.

**Interview nuance:** for moving points, storage and refresh matter as much as the index. Keep
\`cell_id -> set of driver_ids\` in **Redis** and refresh a moving driver on a **short TTL** so stale
positions age out; the source of truth for a driver's live position is the fast store, not your
durable DB.

Recap: encode points into a prefix-shareable or hierarchical cell key (geohash, S2, H3) so 2D
proximity becomes an indexable/shardable range query, query the cell plus a neighbor ring to beat
boundary misses, tune cell size to your query radius, and defuse hot cells by adaptive subdivision,
per-cell caps, separate sharding, and caching.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A concert ends and thirty thousand riders and drivers flood the single cell around the stadium. What breaks first?",
  "options": [
    {
      "label": "Nothing breaks, the cell key still indexes every point",
      "feedback": "The index stays correct, and that is the trap: correctness survives while throughput does not. One cell now holds a giant point set on one shard, so every nearby query scans it and every driver ping writes to it."
    },
    {
      "label": "One hot cell saturates a single shard",
      "correct": true,
      "feedback": "Right. Reads and writes for the whole stadium land on the one shard that owns that cell, and no amount of index tuning moves them. The fix is deliberate: subdivide that cell to a finer resolution, cap points per cell, shard it separately, and cache the popular results."
    },
    {
      "label": "The geohash or H3 library splits hot cells for you",
      "feedback": "Tempting because the schemes are hierarchical, so finer levels always exist, but nothing switches levels on your behalf. Deciding when and where to drop to a finer resolution is your design decision."
    }
  ],
  "reveal": "You now hold the full toolkit: encode 2D points into cell keys so proximity becomes a range query, ring-query neighbors to beat boundary misses, size cells to the typical query radius, keep moving points in a fast store with a short TTL, and defuse hot cells deliberately. In your design write, name the scheme you pick and why, the neighbor-ring query, and your hot-cell plan."
}
\`\`\`
`.trim()

const denormFanoutTeach = `
## Trade write cost for cheap reads, on purpose

Normalization optimizes for write correctness: every fact lives in exactly one place. That is the
wrong default when reads outnumber writes by 100:1 or 1000:1, which is the common web shape.
**Denormalization** deliberately duplicates data so the read path does no joins and no aggregation at
request time. You pay with write amplification (one logical write fans out to many physical writes)
and the ongoing job of keeping the copies consistent. The trade is almost always worth it when a read
is on the hot path and a write is not.

### The three concrete tools

- **Precomputed/materialized views:** instead of running \`SELECT count(*) ... GROUP BY\` on every
  dashboard load, maintain a rollup table (\`daily_orders_by_region\`) that a job or a stream
  updates. Reads become a single indexed lookup. You trade freshness and storage for read latency.
- **Approximate structures:** when the answer does not need to be exact, use sketches.
  **HyperLogLog** counts unique visitors in ~12 KB per counter with ~0.8% standard error instead of storing
  every visitor id. **Count-Min Sketch** gives approximate frequencies for "top trending" in fixed
  memory. Redis ships both. Exactness is a cost you should only pay when the product needs it.
- **Feed fan-out:** the canonical denormalization problem. A user opens their home timeline and wants
  the merged, time-sorted posts of everyone they follow, in under ~100 ms.

### The two feed strategies

- **Fan-out-on-write (push):** when Alice posts, immediately write that post id into the precomputed
  timeline of every follower (a per-user list, often in Redis). Reads are trivial: read your own
  list. But a post by someone with 50M followers triggers 50M writes. Write amplification is
  O(followers).
- **Fan-out-on-read (pull):** store each post once. At read time, query the recent posts of everyone
  the reader follows and merge-sort them. Writes are O(1), but a read for someone following 5,000
  accounts is a large scatter-gather merge on the hot path.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Follower counts are power-law: the median user has a few hundred followers, the top accounts have 50 million. Which fan-out strategy do you ship?",
  "options": [
    {
      "label": "Fan-out-on-write for everyone: reads must be fast, and list appends are cheap",
      "feedback": "Tempting because it makes every feed read a single list lookup, but one celebrity post now triggers 50 million timeline writes: a storm that saturates the fan-out fleet and delays everyone's feed."
    },
    {
      "label": "Fan-out-on-read for everyone: store each post once and merge at read time",
      "feedback": "Writes become trivial, but a reader following 5,000 accounts now pays a scatter-gather merge on the hot read path, and reads outnumber writes by orders of magnitude. The cost moved to the worst possible place."
    },
    {
      "label": "Push for normal accounts, but pull and merge celebrity posts at read time",
      "correct": true,
      "feedback": "Right. The hybrid caps write amplification at the celebrity threshold while keeping normal reads O(1); a reader follows only a handful of celebrities, so the read-time merge stays small and bounded."
    }
  ]
}
\`\`\`

\`\`\`
 fan-out-on-write            fan-out-on-read
 Alice posts                 Bob opens feed
   |                           |
   +-> write to each of        +-> query recent posts of
       Alice's followers'          each account Bob follows,
       precomputed feed            then merge-sort at read time
 cheap reads, costly writes  cheap writes, costly reads
\`\`\`

Neither pure form survives real distributions, because follower counts are power-law. The production
answer is a **hybrid**: fan-out-on-write for normal accounts, but **do not** push posts from
celebrity/whale accounts. Instead, at read time, pull the celebrity posts the reader follows and
merge them into the precomputed list. This is exactly what Twitter/X described.

**Interview nuance:** the disqualifying mistake is proposing pure fan-out-on-write and not noticing
that one celebrity post is now 50M writes and a thundering write storm. Say the threshold out loud:
accounts above roughly 10k to 1M followers are handled on read; everyone else on write. The second
nuance is owning the consistency cost you just created: denormalized copies (a cached follower count,
a duplicated author name) can drift, and now you own an invalidation or reconciliation job.

Recap: denormalize when reads dominate, using materialized/rollup views and approximate sketches to
make reads O(1) lookups; for feeds, use a hybrid that precomputes normal-user feeds and merges
celebrity posts at read time, and accept that you now own write amplification and copy consistency.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "For each product need, pick the precomputation tool this lesson gives you.",
  "buckets": [
    "Materialized rollup",
    "Approximate sketch",
    "Hybrid fan-out"
  ],
  "items": [
    {
      "label": "A dashboard shows daily orders by region without running a 'GROUP BY' per page load",
      "bucket": "Materialized rollup",
      "feedback": "A job or stream maintains the rollup table; the read becomes one indexed lookup."
    },
    {
      "label": "Count unique monthly visitors within a percent, in kilobytes of memory",
      "bucket": "Approximate sketch",
      "feedback": "HyperLogLog: about 12 KB per counter at roughly 0.8 percent error beats storing every visitor id."
    },
    {
      "label": "Top trending hashtags from a firehose, in fixed memory",
      "bucket": "Approximate sketch",
      "feedback": "Count-Min Sketch gives approximate frequencies without keeping a counter per key."
    },
    {
      "label": "A home timeline that loads in under 100 ms for a user who follows two celebrities",
      "bucket": "Hybrid fan-out",
      "feedback": "Precompute normal-author feeds on write and merge the couple of celebrity streams at read time."
    }
  ],
  "reveal": "Every tool here is the same move: pay at write time (amplification, staleness, a consistency job you now own) so the read path is an O(1) lookup. In your design write, quantify the read-to-write ratio, say the celebrity threshold out loud, and own the drift-and-invalidation cost of the copies you just created."
}
\`\`\`
`.trim()

const cdcDualWriteTeach = `
## The dual write: the most common production sync bug

The moment you have a primary database plus any derived store (a Redis cache, an Elasticsearch index,
a read replica, an analytics warehouse), you have a sync problem. The naive solution is the **dual
write**: in your request handler, write to the DB, then write to the cache/index in the same code
path.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The handler writes the DB, then the cache, then the search index. Each write succeeds 99.9 percent of the time, and you add retries on failure. Is the system safe from drift?",
  "options": [
    {
      "label": "Yes, retries cover the rare failures and the stores converge",
      "feedback": "Tempting, and retries do narrow the window, but they cannot make three non-atomic writes atomic. A process that dies between writes never issues the retry, and a rolled-back DB transaction cannot un-write the cache."
    },
    {
      "label": "No, the three writes are not atomic",
      "correct": true,
      "feedback": "Right. No transaction spans a database and a cache, so a crash between writes, a rolled-back DB transaction, and two concurrent writers landing in different orders all leave the stores disagreeing. Under load that is a steady drip of divergence, so the fix has to be structural rather than more retries."
    },
    {
      "label": "Yes, as long as you write the cache before the DB",
      "feedback": "Reordering only changes which failure hurts: now a DB rollback leaves the cache holding a row the database never persisted."
    }
  ]
}
\`\`\`

\`\`\`
handler:
  db.save(order)          # write 1
  cache.set(order)        # write 2   <-- if this fails or the process
  search.index(order)     # write 3       dies here, stores diverge
\`\`\`

This is broken because the writes are **not atomic** and there is no shared transaction across a
database and a cache. Any of these happens routinely: write 1 commits and the process crashes before
write 2 (cache stale forever); write 2 succeeds but write 1's transaction rolls back (the cache holds
a row the DB never persisted); or two concurrent requests apply their DB writes in one order and
their cache writes in the opposite order (the cache ends on the older value). Under load, partial
failure is a steady drip of divergence you discover weeks later as "search shows a product that was
deleted."

### The disciplined fix, in two parts

**Transactional outbox:** stop writing to the second system from the handler. Instead, in the **same
database transaction** as your business write, insert a row into an \`outbox\` table describing the
event (\`{id, aggregate_id, type: OrderPlaced, payload, created_at}\`). The business change and the
intent-to-publish commit together or not at all. A separate **relay** process reads unpublished
outbox rows and publishes them to a message broker (Kafka), marking them sent.

**Log-based change data capture (CDC):** rather than write an outbox by hand, tap the database's own
replication log, which already records every committed change durably and in order. **Debezium**
reads Postgres logical decoding, the MySQL binlog, or the MongoDB oplog and emits an ordered stream
of row changes to Kafka. Downstream consumers (a cache updater, an Elasticsearch sink, a warehouse
loader) subscribe and apply. The outbox is the right tool when you need domain events
(\`OrderPlaced\`) rather than raw row diffs; CDC is the right tool when you want to mirror table
state to derived stores with no application changes.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Outbox or CDC? Sort each statement under the tool it describes.",
  "buckets": [
    "Transactional outbox",
    "Log-based CDC"
  ],
  "items": [
    {
      "label": "Emits rich domain events like 'OrderPlaced' that you shape by hand",
      "bucket": "Transactional outbox",
      "feedback": "You write the event payload yourself, so it carries domain meaning rather than raw column diffs."
    },
    {
      "label": "Inserts the event row in the same transaction as the business write",
      "bucket": "Transactional outbox",
      "feedback": "That shared transaction is the whole trick: the change and the intent-to-publish commit together or not at all."
    },
    {
      "label": "Tails Postgres logical decoding or the MySQL binlog with zero application changes",
      "bucket": "Log-based CDC",
      "feedback": "Debezium reads the log the database already writes, so the application code never changes."
    },
    {
      "label": "Mirrors raw row state into a search index or warehouse",
      "bucket": "Log-based CDC",
      "feedback": "Row-level change streams are ideal when the goal is keeping derived table state in sync rather than publishing domain events."
    }
  ]
}
\`\`\`

### The honest delivery guarantee

**Exactly-once end-to-end is a fantasy** across a broker and heterogeneous sinks: the relay can crash
after publishing but before marking the outbox row sent, so it republishes. The realistic and correct
target is **at-least-once delivery plus idempotent consumers**. Make every consumer safe to re-apply
the same event: key the cache/index write by the event's primary key and use last-writer-wins on a
version/LSN, or dedupe on event id. Then a duplicate is a no-op.

Operational reality: you also need **backfills and replays** (snapshot the current table state to
bootstrap a brand-new index, then switch to the live stream), and you must **monitor replication slot
/ consumer lag**. A Postgres logical replication slot that a stalled Debezium connector stops
advancing will pin WAL and eventually fill the disk, taking the primary down.

**Interview nuance:** if the interviewer says "just write to the DB and the cache," name the
dual-write problem explicitly and reach for outbox or CDC. If they push on "why not exactly-once,"
say the honest thing: at-least-once plus idempotent, versioned consumers is simpler and strictly more
robust, and it is what Kafka-based pipelines actually run.

Recap: never dual-write to a DB and a derived store; commit the change and its event together via a
transactional outbox, or tap the DB log with CDC (Debezium), publish through Kafka, and make
consumers idempotent so at-least-once delivery is correct, while monitoring replication-slot lag and
supporting snapshot backfills.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your relay crashes after publishing an event to Kafka but before marking the outbox row sent. On restart it publishes the same event again. What must be true downstream?",
  "options": [
    {
      "label": "The broker deduplicates, so consumers see the event exactly once end to end",
      "feedback": "Tempting because Kafka advertises exactly-once features, but they do not span heterogeneous sinks like Redis and Elasticsearch. Across the whole pipeline, exactly-once is a fantasy."
    },
    {
      "label": "Consumers are idempotent and version-guarded, so the duplicate applies as a no-op",
      "correct": true,
      "feedback": "Right. At-least-once delivery plus idempotent consumers is the honest contract: key writes by primary id, guard with a version or LSN so an older duplicate never overwrites newer state, and a replay changes nothing."
    },
    {
      "label": "The pipeline must halt and alert, because a duplicate would corrupt the derived stores",
      "feedback": "If a duplicate could corrupt state, the consumer is the bug. Duplicates are routine in this architecture, so consumers are built to absorb them, not to page a human."
    }
  ],
  "reveal": "The whole lesson in one line: make one atomic write (the business change plus its event, via outbox or the DB's own log), derive everything else from the ordered stream, and let idempotent, versioned consumers turn at-least-once delivery into correctness. In your design write, also cover the ops edges: snapshot backfills to bootstrap new sinks, and alerts on replication-slot and consumer lag before pinned WAL fills the primary's disk."
}
\`\`\`
`.trim()

export const systemDesignLevel3: DesignLevel = {
  id: 3,
  slug: "scaling-data",
  title: "Level 3: Scaling the Data Tier",
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
            "Why read replicas scale reads but never writes, and how to pick async, sync or semi-sync replication by durability against latency.",
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
            "Single-leader, multi-leader and leaderless replication compared: which conflicts each one admits, and what PACELC says about the price.",
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
            "Range, hash and directory partitioning compared: what each one costs you in hotspots, lost range scans and extra routing hops.",
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
            "How to pick a shard key that will not hotspot, and what to do when one celebrity key drives all its traffic onto a single node.",
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
            "Why one expiring key can take down the database behind it, and how singleflight coalescing, jittered TTLs and early refresh stop the stampede.",
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
            "How to shard, replicate and tier a Redis cluster, and why bringing a cold cache online under full traffic is the failure nobody plans for.",
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
            "How an origin shield collapses thousands of CDN misses into about one origin fetch per object, and why you version URLs instead of purging them.",
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
            "How an inverted index and BM25 ranking actually work, and why paginating deep with a large offset gets more expensive on every shard.",
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
            "Why vector search alone misses exact tokens, and how reciprocal rank fusion blends it with BM25 without comparing two incomparable scores.",
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
        {
          id: "sd-l3-geospatial-indexing",
          title: "Geospatial Indexing: Geohash, Quadtree, S2 & H3",
          summary:
            "Why two B-tree indexes cannot answer 'find drivers near me', and how geohash, S2 and H3 turn 2D proximity into an indexable range scan.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["geospatial", "indexing", "data-modeling"],
          teach: {
            markdown: geospatialIndexingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-geospatial-indexing-apply",
            prompt:
              "Design the spatial index for a 'find drivers near me' query over millions of moving points, and justify a choice among geohash, quadtree, S2, and H3 for range and k-nearest-neighbor lookups.",
            thinkAbout: [
              "How do you turn a 2D nearest-neighbor query into a 1D or hierarchical key you can index and shard?",
              "How does cell size trade recall (missing a nearby point) against cost (scanning too many points)?",
              "What happens to a dense downtown cell, and how do you keep it from becoming a hotspot?",
            ],
            modelAnswerOutline: [
              "Assumptions: millions of points, some static (restaurants, pickup spots) and many moving (drivers pinging every few seconds); queries are 'drivers within radius R' and 'nearest K drivers'; latency budget in the low tens of ms.",
              "**Turning 2D into an indexable key:** map each point to a cell id so proximity becomes a range/hierarchical lookup. Geohash interleaves lat/lng bits into a base-32 string where nearby points share a prefix, so it stores in any B-tree or Redis sorted set and shards by prefix. Its boundary problem (adjacent points across a cell edge diverge) is handled by querying the center cell plus its 8 neighbors, then an exact haversine distance filter and sort on the candidates.",
              "**Precision tradeoff:** pick a cell resolution near the typical query radius. Finer cells hold fewer points (cheap per-cell scans) but a radius query enumerates more cells and larger rings; coarser cells enumerate fewer but each holds more points to scan. Size to the common case (e.g. ~1 km cells for city pickups).",
              "**Hot cells:** a downtown or event cell hotspots on writes and reads. Subdivide adaptively (a finer S2/H3 level or a quadtree there), cap points per cell, shard hot cells onto separate nodes, and cache their results.",
              "**Choice and storage:** for moving points, pick H3 (or S2) over plain geohash. H3's hexagons give uniform neighbor distance, making ring queries and movement cleaner; S2's Hilbert-curve ordering gives tight range scans and true spherical geometry. Store `cell_id -> set of driver_ids` in Redis and refresh each moving driver on a short TTL so stale positions expire; the durable DB is not in the hot path.",
              "**The tradeoff:** geohash is simplest and shards trivially but has ugly boundaries; H3/S2 cost a library and cell math but pay off for moving points and radius coverage. Common wrong turn: a bounding-box SELECT or full distance scan over all rows, which ignores the sphere's geometry and does not scale.",
            ],
          },
          practice: {
            id: "sd-l3-geospatial-indexing-practice",
            prompt:
              "Design the geospatial layer for a ride-matching system like Uber at 5M active drivers pinging their location every 4 seconds and 1M rider 'cars near me' queries per second at peak, where surge zones create extreme density spikes. Lead with how you absorb the write storm and keep dense cells from hot-spotting.",
            thinkAbout: [
              "Why do 1.25M location writes/sec belong in an in-memory grid rather than the durable DB?",
              "How does a short TTL replace explicit deletes for drivers who stop pinging?",
              "What splits a surge-zone cell that overloads its node?",
            ],
            modelAnswerOutline: [
              "Assumptions: 5M drivers x a ping every 4 seconds is ~1.25M location writes/sec, ~1M proximity reads/sec, geographically skewed (dense cities, surge events), sub-50ms match latency.",
              "**Write storm:** driver pings are high-volume, low-durability updates, so the live position store is an in-memory grid, not the primary DB. Keep `h3_cell -> {driver_id: (lat, lng, ts)}` in Redis (sharded by cell) with a short TTL (~10s) so a driver who stops pinging ages out automatically with no delete needed. If pings are also needed durably, buffer through Kafka to a warehouse, but the match path reads only the memory grid.",
              "**Index and reads:** H3 at a resolution matched to city pickup radius. A 'cars near me' query resolves the rider's cell, gathers the cell plus a kRing of neighbors to cover the radius, unions the driver sets, then does exact distance + ETA ranking on the small candidate set. H3 cell ids are the shard key, so reads and writes for a city colocate.",
              "**Hot cells (the crux):** surge zones and airports overload a single cell. Shard by cell so dense cells spread across nodes; for a pathologically hot cell, drop to a finer H3 resolution locally so it splits into many sub-cells; cap drivers scanned per cell; and cache the recent nearby-driver result for a second (riders a block apart get the same answer). Precompute surge-zone cell sets.",
              "**The tradeoff:** a short TTL and in-memory grid trade durability (a crashed Redis shard loses live positions, rebuilt in one ping cycle) for the throughput to absorb 1.25M writes/sec: the right call because positions are ephemeral anyway.",
              "Common wrong turn: writing every ping to the durable DB (it melts) or a single global index without per-cell sharding (surge cells hotspot one node).",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l3-m5",
      title: "Derived Data & Sync",
      description:
        "Trade write cost for cheap reads with denormalization, precomputation, and hybrid feed fan-out, and keep every derived store from drifting by replacing dual writes with the transactional outbox and log-based CDC.",
      lessons: [
        {
          id: "sd-l3-denorm-fanout",
          title: "Denormalization, Precomputation & Materialized Views",
          summary:
            "Precompute rollups and sketches so reads are O(1) lookups, and feed timelines with hybrid fan-out: push for normal users, pull-and-merge for celebrities.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["fan-out", "materialized-views", "feed"],
          teach: {
            markdown: denormFanoutTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-denorm-fanout-apply",
            prompt:
              "Design a social timeline/feed, choosing between fan-out-on-write and fan-out-on-read for a mix of normal and celebrity users, and specify where the hybrid boundary sits.",
            thinkAbout: [
              "When does fan-out-on-write beat fan-out-on-read, and vice versa?",
              "How does a hybrid handle celebrity accounts?",
              "What is the write-amplification and consistency cost you now own?",
            ],
            modelAnswerOutline: [
              "Assumptions: a Twitter/Instagram-shaped home feed. Reads dominate writes heavily, the feed must load in under ~100 ms at p99, follower counts follow a power law (median in the hundreds, top 0.01% in the tens of millions), and a post appearing a few seconds late is acceptable.",
              "**Hybrid fan-out. Normal authors: fan-out-on-write.** On post, a fan-out worker (consuming a Kafka topic of new posts) appends the post id into each follower's precomputed timeline, a capped per-user list in Redis (the most recent ~800 ids). The home-feed read is a single Redis list read plus hydration of post bodies from a post store (Cassandra/DynamoDB) by id, with bodies cached. O(1) list lookups keep p99 low.",
              "**Celebrity accounts above a follower threshold (~100k to 1M, tuned): do NOT push.** Their posts are stored once; at read time, after loading the reader's precomputed list, pull the recent posts of the small set of celebrities that reader follows and merge-sort them in. A reader follows only a handful of celebrities, so the read-time merge is bounded and cheap, while saving the tens of millions of writes a celebrity post would cause.",
              "**Quantify the trade:** pure fan-out-on-write for a 50M-follower account is 50M writes per post: a write storm that saturates the fan-out fleet and delays everyone's feed. Pure fan-out-on-read turns every feed load into a scatter-gather over thousands of followees, blowing the 100 ms budget. The hybrid caps write amplification at the threshold.",
              "**Consistency and edges owned:** fan-out lag under bursts (monitor fan-out queue depth), unfollow/block must filter posts, deletes must tombstone, denormalized author names can drift. New follows backfill from the author's recent posts; the precomputed list is a cache rebuildable from the source of truth.",
              "Common wrong turn: pure fan-out-on-write with no celebrity carve-out, which looks clean in a diagram and detonates in production the first time a celebrity posts.",
            ],
          },
          practice: {
            id: "sd-l3-denorm-fanout-practice",
            prompt:
              "Design the analytics/counts layer for a live-streaming platform (Twitch-scale: a top stream has 300k concurrent viewers) that must show a near-real-time viewer count, unique-viewer count for the session, and a 'top 10 trending streams' board, without hammering the primary DB on every read.",
            thinkAbout: [
              "Which of these numbers actually needs to be exact?",
              "What does a HyperLogLog buy over storing every viewer id?",
              "Where does the trending board's aggregation run so reads stay O(1)?",
            ],
            modelAnswerOutline: [
              "Assumptions: the live viewer count can be approximate within a percent or two, unique-viewer count needs to be close but not audit-grade, the trending board updates every few seconds, and read volume is enormous, so reads must never touch a relational primary.",
              "**Live concurrent count:** a maintained counter in Redis per stream, incremented/decremented on join/leave events (or derived from a heartbeat TTL set so crashed clients age out). Clients read the counter or, better, subscribe via pub/sub or WebSocket push so 300k viewers do not each poll.",
              "**Unique viewers per session: a HyperLogLog per stream** (Redis PFADD/PFCOUNT), ~12 KB and ~0.8% standard error: exactness is too expensive here, since storing 300k+ viewer ids per stream to dedupe is wasteful, and '1.2M unique viewers' does not need audit precision.",
              "**Trending top 10:** a Count-Min Sketch or a windowed rollup: a stream job (Kafka Streams/Flink) aggregates viewer-join events into per-stream counts over a sliding window and writes a small sorted materialized table that the board reads directly.",
              "**The through-line:** reads are on the hot path and vastly outnumber writes, so all aggregation moves off the read path into precomputed counters, sketches, and rollup tables, trading a little exactness and a few seconds of freshness for O(1) lookups against Redis or a tiny serving table.",
              "Common wrong turn: `SELECT COUNT(DISTINCT viewer_id)` on every read, or storing every viewer id for exact uniques: either melts the DB and the memory budget at 300k concurrent viewers when a HyperLogLog answers the same question in 12 KB.",
            ],
          },
        },
        {
          id: "sd-l3-cdc-dual-write",
          title: "Keeping Derived Stores in Sync (CDC & Outbox)",
          summary:
            "Why writing to your database and your cache in one handler always drifts, and what the transactional outbox and log-based CDC buy you instead.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["cdc", "outbox", "dual-write"],
          teach: {
            markdown: cdcDualWriteTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l3-cdc-dual-write-apply",
            prompt:
              "Design how a write to the primary DB reliably updates a Redis cache and an Elasticsearch index without a dual-write race.",
            thinkAbout: [
              "Why can two independent writes partially fail and diverge?",
              "How do the transactional outbox and log-based CDC fix it?",
              "Why is at-least-once + idempotent consumers the realistic target?",
            ],
            modelAnswerOutline: [
              "Assumptions: a primary Postgres holds the source of truth, a Redis cache serves hot reads, and an Elasticsearch index serves full-text search. Sub-second staleness is acceptable; permanent divergence is not.",
              "**Name the problem first:** dual-writing (handler writes Postgres, then Redis, then Elasticsearch) has three independent, non-atomic writes. A crash after the DB commit leaves Redis and Elasticsearch stale; concurrent requests can apply side effects in a different order than their DB commits, settling a derived store on an older value. No cross-system transaction exists, so this drifts under load.",
              "**Design: a single atomic DB write, everything else derived from the change log.** Log-based CDC: Debezium reads Postgres logical decoding and streams every committed row change, in commit order, into a Kafka topic per table. Two consumer groups subscribe: a cache updater that sets/deletes the Redis key, and an Elasticsearch sink that indexes/deletes the document. The handler writes only to Postgres. (For rich domain events rather than raw row diffs, use a transactional outbox instead: insert an outbox row in the same transaction, a relay publishes to Kafka. Same guarantee, different granularity.)",
              "**Delivery guarantee: at-least-once, not exactly-once,** because the relay/connector can republish after a crash. Both consumers are idempotent: the cache write is keyed by primary id and guarded by the event's LSN/version (last-writer-wins, an older duplicate never overwrites newer); the Elasticsearch write uses the row id as document id and external version = DB version, so a stale event is rejected. Duplicates become no-ops.",
              "**Bootstrapping and ops:** a new index or flushed cache fills via a snapshot backfill (Debezium's initial snapshot), then cuts over to the live stream. Monitor consumer lag and the Postgres replication slot: a stalled connector that stops advancing the slot pins WAL and can fill the primary's disk, so slot lag gets an alert and poison events go to a dead-letter queue.",
              "Common wrong turn: keeping the dual write and adding retries. Retries do not make two non-atomic writes atomic; they narrow the window but the divergence class remains. The fix is structural (outbox/CDC), not more retries.",
            ],
          },
          practice: {
            id: "sd-l3-cdc-dual-write-practice",
            prompt:
              "Design the change-propagation pipeline for a marketplace (Shopify-scale: 5M product mutations/day across thousands of merchant DB shards) that must keep a global Elasticsearch search index, a Redis price cache, and a Snowflake analytics warehouse in sync with per-shard Postgres primaries, and explain how you bootstrap a brand-new search index without downtime.",
            thinkAbout: [
              "Why one CDC connector per shard rather than a single global one?",
              "How do three sinks with very different speeds avoid backpressuring each other?",
              "How can a snapshot and the live stream interleave safely into a new index?",
            ],
            modelAnswerOutline: [
              "Assumptions: product data sharded across many Postgres primaries (by merchant), each with its own WAL. 5M mutations/day is a modest ~60 writes/sec average but bursty (flash sales, bulk imports). Search and cache tolerate seconds of lag; the warehouse tolerates minutes.",
              "**Design:** one Debezium CDC connector per shard, each tapping that shard's logical replication slot and publishing row changes to Kafka topics keyed by product id, partitioned so all events for a product land on one partition and stay ordered.",
              "**Three independent consumer groups fan out:** an Elasticsearch sink (idempotent upserts keyed by product id with external version = DB version), a Redis price-cache updater (last-writer-wins on version), and a Snowflake loader that micro-batches changes (Kafka Connect Snowflake sink, or Flink writing Parquet to S3 then COPY INTO), because a warehouse wants batched loads. Decoupled consumers mean the slow warehouse loader never backpressures the fast search/cache path.",
              "**Delivery:** at-least-once plus idempotent consumers; with thousands of shards and connectors, redeliveries on restarts are constant, so every sink dedupes/versions. Poison events go to a dead-letter topic rather than stalling a partition.",
              "**Bootstrapping a new index without downtime:** build it in the background. Kick off Debezium's initial snapshot (or a bounded historical scan) writing into a new index alias, while the live CDC stream also applies to it, so the new index converges. Because writes are idempotent and version-guarded, snapshot and live stream interleave safely. When the new index's lag reaches near zero, atomically flip the Elasticsearch alias; readers never see downtime, and the old index drops after a soak period.",
              "Common wrong turn: a single global CDC connector or app-tier dual writes across shards. The per-shard-slot design keeps ordering correct and prevents one merchant's bulk import from pinning every shard's WAL; app-tier dual writes reintroduce exactly the divergence CDC exists to remove.",
            ],
          },
        },
      ],
    },
  ],
}
