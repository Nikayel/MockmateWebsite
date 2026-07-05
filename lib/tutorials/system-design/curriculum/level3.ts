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
      ],
    },
  ],
}
