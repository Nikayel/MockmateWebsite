> Module **sd-l3-m2** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l3-m1](./sd-l3-m1.md) · Next: [sd-l3-m3](./sd-l3-m3.md)

# L3 · Partitioning & Sharding

After this module you can take a dataset or write rate that no longer fits one machine and split it across many, choosing a partition strategy that survives skew, adding and removing nodes with minimal data movement via consistent hashing, picking a shard key that will not silently recreate a single-node bottleneck (including the celebrity/hot-key case), and designing correct multi-record operations once sharding has broken joins and atomic multi-key writes. These are the mechanics of horizontal scale, and they are the part of the interview where hand-waving gets caught.

### sd-l3-partitioning-strategies: Partitioning Strategies: Range vs Hash vs Directory

- **id:** `sd-l3-partitioning-strategies`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** partitioning, sharding, skew

#### Learn

When one machine can no longer hold the dataset or absorb the write rate, the only real fix is **horizontal partitioning** (sharding): split the rows across many nodes so each node owns a slice. Contrast this with **vertical partitioning** (splitting a wide table into narrow ones by column, e.g. hot columns vs a rarely-read blob) and **functional partitioning** (giving each service its own database). Vertical and functional buy you some headroom, but only horizontal partitioning scales writes and dataset size without bound, so it is the technique interviewers mean by "shard it."

The design choice is the **partition function**: given a key, which partition owns it. Three families dominate.

**Range partitioning** assigns contiguous key ranges to partitions (users A to F on p0, G to M on p1, and so on; or time ranges for events). Its superpower is **range scans**: "all orders from last Tuesday" or "usernames starting with S" touch one or two partitions. Its curse is **hotspots on sequential keys**. If you range-partition by an auto-increment ID or a timestamp, every new write lands on the highest partition, so one node absorbs 100% of the write traffic while the rest sit idle. This is the single most common partitioning mistake.

**Hash partitioning** applies a hash to the key and assigns by the result (often `hash(key) mod N`). It spreads load **evenly** and kills sequential hotspots, because adjacent keys scatter. The cost is that you **lose efficient range queries**: "orders from last Tuesday" now has to fan out to every partition (scatter-gather). The other trap is `hash mod N` specifically: change N (add a node) and almost every key remaps, forcing a near-total reshuffle. Consistent hashing (next lesson) exists to fix exactly that.

**Directory (lookup-based) partitioning** keeps an explicit routing table mapping key ranges or key groups to partitions, maintained in a coordination service (ZooKeeper/etcd) or a metadata store. It gives maximum flexibility: you can split a hot range, move a heavy tenant to its own node, or rebalance surgically. The price is an extra **lookup hop** on the request path and a routing service you must keep highly available, since it is now on the critical path.

**Secondary indexes** are where partitioning gets subtle. A **local (document-partitioned) index** stores each partition's index alongside its own data, so a query on a non-partition-key column must **scatter-gather** across all partitions and merge (DynamoDB LSI, Elasticsearch by default). A **global (term-partitioned) index** partitions the index itself by the indexed term, so a lookup hits one index partition, but writes must update an index partition that may live on a different node, making writes slower and asynchronous (DynamoDB GSI). The index has to be partitioned too; it does not live for free on one node.

**Interview nuance:** always map the dominant queries onto the partition scheme out loud. "This query hits one partition, that one is scatter-gather bounded by the slowest node." Interviewers are checking whether you know which reads got expensive, not just that you sprinkled the word "shard."

```
RANGE                    HASH                     DIRECTORY
A-F | G-M | N-Z          h(k)%N spreads evenly    lookup table -> partition
+ range scans hit 1      + no sequential hotspot  + surgical rebalance/split
- seq keys = hot p       - range scan = fan-out   - extra hop + HA routing svc
```

Recap: horizontal partitioning is the only way to scale writes and data past one node; range wins range scans but hotspots on sequential keys, hash spreads evenly but loses ranges and reshuffles on `mod N`, directory adds a flexible routing hop, and secondary indexes are either scatter-gather locals or write-costly globals.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the partitioning scheme for a 20 TB messaging store doing 200k writes/sec; pick a partition strategy and defend it against skew.

**Think about:**
- What does range vs hash vs directory partitioning optimize and cost?
- How do local vs global secondary indexes work across partitions?
- How does each query map to partitions?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: this is a chat/messaging store (think Slack or WhatsApp). The dominant write is "append a message to a conversation," the dominant read is "load the last N messages of a conversation," and a secondary read is "load a user's conversation list." 20 TB and 200k writes/sec are both far past one node, so I need real horizontal sharding, say 40+ partitions to leave headroom (each around 500 GB and 5k writes/sec).

I shard by a **hash of `conversation_id`**. This is the deliberate choice: conversation_id has high cardinality, and hashing spreads the 200k writes evenly instead of piling them on the newest partition. Critically it keeps all messages of one conversation **co-located on one partition**, so the hot-path read ("last N messages") is a single-partition ordered scan, not a scatter-gather. Within a partition I store messages clustered by `(conversation_id, message_id)` where message_id is time-sortable (a Snowflake ID), so "last N" is a cheap reverse range scan on one node.

Why not **range partition by conversation_id or by timestamp**: timestamp ranges would send every new message to the single highest partition, recreating a one-node write bottleneck at exactly 200k/sec. That is the skew failure I am defending against, and hashing eliminates it.

For the **user conversation-list** query I do not want a scatter-gather over 40 partitions on every app open, so I maintain a **global secondary index** (or a separate table) keyed by user_id, updated when a conversation is created or a message arrives. It costs a cross-partition write on new-conversation events, but it turns a frequent read into a single-partition lookup. Message search, which is rare, I hand to Elasticsearch with a local (document-partitioned) index and accept scatter-gather there.

Residual skew: a huge active channel (100k members, thousands of msgs/sec) can still hot-spot one partition. I flag this as a known risk and mitigate by sub-partitioning very hot conversations by a bucket suffix, which the next lessons develop.

**Common wrong turn:** range-partitioning by timestamp "so recent messages are together," which concentrates 100% of writes on one partition and defeats the entire point of sharding.

**Self-check rubric:**
- [ ] I picked a concrete strategy (hash of conversation_id) and said what it optimizes and costs.
- [ ] I explained why the dominant read stays single-partition (co-location + clustered order).
- [ ] I rejected timestamp/sequential range partitioning by naming the write-hotspot failure.
- [ ] I addressed the secondary query (user's conversations) with a global index vs scatter-gather tradeoff.
- [ ] I acknowledged residual skew (a mega-conversation) rather than claiming perfect balance.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the partitioning scheme for Stripe-style payment events at 50 TB and 300k events/sec, where the two dominant access patterns fight each other: (1) low-latency single-object reads by event_id, and (2) an analytics/reconciliation job that must scan "all events for merchant M in a date range." Pick a scheme and defend it against both skew and the range-scan requirement.

**Model answer (revealed on demand):**

Assumptions: events are immutable, write-once (appends), each belongs to a merchant, and carries a timestamp. Pattern 1 is high-QPS point reads on the serving path; pattern 2 is a lower-QPS but heavy scan for reconciliation and merchant dashboards.

The conflict is real: point reads want hash spreading, merchant-plus-date scans want range locality. I resolve it with a **compound partition key: `hash(merchant_id)` for partition placement, and within a partition a clustering order of `(merchant_id, event_time, event_id)`**. Hashing merchant_id spreads the 300k/sec across partitions and prevents a timestamp hotspot. Co-locating a merchant's events on one partition, sorted by time, turns pattern 2 into a single-partition ordered range scan instead of a 40-way scatter-gather. Point reads by event_id I serve through a **global secondary index** (event_id to partition), or by encoding merchant_id into the event_id so the read routes directly, avoiding a fan-out.

Skew defense: a whale merchant (a marketplace doing a huge share of volume) will hotspot its partition. I detect high-cardinality merchants and **sub-partition** them by adding a bucket to the key (`merchant_id:bucket`, bucket = hash(event_id) mod K), which spreads a whale across K partitions. The reconciliation scan then reads K buckets and merges, which is bounded and acceptable because that job is not latency-critical.

I would use a wide-column store (Cassandra/ScyllaDB or DynamoDB) whose native partition-key plus clustering-key model expresses exactly this. The committed tradeoff: I optimize the frequent merchant range scan and even write spread, and I pay for point reads with a global index hop and for whales with explicit sub-partitioning, rather than pretending one flat key serves both patterns for free.

### sd-l3-consistent-hashing: Consistent Hashing, Virtual Nodes & Rebalancing

- **id:** `sd-l3-consistent-hashing`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** consistent-hashing, rebalancing

#### Learn

The naive way to place keys across N nodes is `node = hash(key) mod N`. It spreads load evenly, and it is a disaster the moment N changes. Go from 10 nodes to 11 and the modulus changes for almost every key, so roughly **10 of 11 keys map to a different node**. For a cache that means a near-total miss storm that stampedes the database; for a database it means moving nearly the whole dataset to add one machine. Since adding and removing nodes is the entire point of horizontal scale, `mod N` is the wrong primitive.

**Consistent hashing** fixes the remap cost. Imagine a ring of hash values from 0 to 2^32 - 1. Hash each **node** to a position on the ring, and hash each **key** to a position too. A key is owned by the **first node clockwise** from its position. Now add a node: it lands somewhere on the ring and takes over only the keys between it and its counter-clockwise neighbor. Remove a node: its keys pass to the next node clockwise. Either way you move only about **1/N of the keys**, and only between adjacent nodes, instead of remapping the world. This is why Dynamo, Cassandra, Riak, and most distributed caches are built on it.

Plain consistent hashing has two problems. First, with few nodes the ring is lumpy: random placement means some nodes own huge arcs and others tiny ones, so load is uneven (you can easily see a 2x imbalance). Second, when a node leaves, all its load dumps onto a single neighbor rather than spreading.

**Virtual nodes (vnodes)** solve both. Instead of one point per physical node, give each physical node **many tokens** (say 128 or 256) hashed to many ring positions. Now each physical node owns many small arcs scattered around the ring, so load smooths out toward even, and when a node fails its many arcs are inherited by **many different neighbors**, spreading the rebalance rather than crushing one node. Vnodes also give you **weighting**: a machine with 2x the RAM simply gets 2x the tokens, so heterogeneous hardware is handled naturally.

**Bounded-load consistent hashing** adds a cap: each node may hold at most `(1 + epsilon)` times the average load. When a key's target node is already at its cap, placement spills to the next node clockwise. This bounds hotspots (a single node cannot be swamped by a skewed key distribution) at the cost of some keys not living on their "natural" node, which slightly complicates lookup. It is what you reach for when even vnodes leave a hot node.

**Rendezvous hashing (highest-random-weight, HRW)** is a simpler alternative for some jobs: to place a key, compute `hash(key, node)` for every node and pick the highest. It gives the same minimal-movement property without maintaining a ring, and it makes selecting the top-k replicas trivial (take the k highest). The tradeoff is O(N) per lookup, so it suits smaller or bounded node sets, like choosing replicas or a load-balancer backend, rather than a thousand-node ring.

**Interview nuance:** the phrase to earn is "only ~1/N keys move." If you are asked how a cache cluster survives a node loss and you say `hash mod N`, you have just described the failure. Say consistent hashing with vnodes, quantify the movement, and note that replicas are placed on the next distinct physical nodes clockwise.

```
hash mod N: add node -> ~all keys remap  (miss storm / full reshuffle)

consistent hash ring (with vnodes):
      [n2]···[n1]
     /            \      key -> first node clockwise
  [n3]    o key    [n1]  add node: steals ~1/N keys from one arc
     \            /      vnodes: many small arcs -> even load, spread rebalance
      [n2]···[n3]
```

Recap: `hash mod N` remaps nearly every key on resize; consistent hashing moves only ~1/N and only between neighbors; virtual nodes smooth load, spread rebalancing, and enable weighting; bounded-load caps hotspots; and rendezvous hashing is a ring-free alternative for small replica-selection cases.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design node-membership handling for a distributed cache cluster so that losing 1 of 10 nodes does not invalidate the whole keyspace.

**Think about:**
- Why does hash-mod-N remap nearly all keys on resize?
- How do virtual nodes smooth load and speed rebalancing?
- How does bounded-load consistent hashing cap hotspots?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 10 cache nodes fronting a database, serving say 1M ops/sec at a 95% hit ratio, so the DB sees ~50k ops/sec. If a large fraction of keys suddenly miss, the DB is asked for a multiple of what it can serve and it falls over. So the design goal is: a single node loss should invalidate only ~1/10 of keys, keeping the DB within ~2x of its normal miss load, not 10x.

I place keys with **consistent hashing on a ring**, not `hash mod N`. Under `mod N`, dropping to 9 nodes changes the modulus and remaps about 90% of keys, so 90% miss at once and the DB is hit with roughly 10x its normal read load: a cascading outage. Under consistent hashing, the dead node's arc passes to its clockwise neighbor, so **only ~10% of keys move** and only those miss. The DB sees about 2x normal miss traffic briefly while the cache refills, which is survivable.

I give each physical node **~200 virtual nodes** (tokens scattered around the ring). This does two things: load is even to within a few percent instead of the lumpy imbalance you get with 10 single points, and when a node dies its ~200 arcs are inherited by **many different survivors** rather than dumping all its load on one unlucky neighbor. Vnodes also let me add a bigger machine later by giving it more tokens.

Membership itself: nodes register in a coordination service (etcd/ZooKeeper) or gossip membership (as Cassandra does). Clients or a routing proxy watch the membership list and rebuild the ring on change, with a short grace/failure-detection window so a brief network blip does not trigger a needless remap. On a genuinely skewed workload where one node still runs hot, I enable **bounded-load consistent hashing**: cap each node at `(1 + epsilon)` times average and spill overflow to the next node clockwise, which prevents a single vnode-unlucky hot node from being swamped.

**Common wrong turn:** using `hash mod N` (or restarting all clients with a new node count), which reshuffles the whole keyspace and turns a routine node replacement into a database-melting miss storm.

**Self-check rubric:**
- [ ] I explained why `hash mod N` remaps ~all keys and quantified the resulting DB load spike.
- [ ] I used a hash ring and quantified movement as ~1/N on a node change.
- [ ] I added virtual nodes and gave both reasons (even load + spread rebalancing).
- [ ] I described how membership changes are detected and how the ring is rebuilt.
- [ ] I named bounded-load hashing (or replication) as the hotspot backstop.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the key placement and rebalancing for a DynamoDB-style storage cluster that runs replication factor 3 and must autoscale from 30 to 300 nodes during a Black Friday ramp without a read-availability dip or a thundering rebalance. Explain token assignment, replica placement, and how you throttle data movement.

**Model answer (revealed on demand):**

Assumptions: durable storage (not a disposable cache), RF=3, and the cluster must grow 10x over hours while serving traffic. I cannot tolerate either lost data or a rebalance that saturates the network and starves live requests.

**Placement:** consistent hashing on a ring with **virtual nodes**, each physical node owning a few hundred tokens. A key maps to its position; its **3 replicas** are the next 3 *distinct physical* nodes clockwise (skipping additional vnodes of a node already chosen), ideally spread across availability zones so one AZ loss does not take all 3. This is the Dynamo replica model.

**Scaling out:** when new nodes join, they claim tokens and take over the corresponding arcs from current owners. With vnodes, each newcomer pulls small arcs from **many** existing nodes in parallel rather than draining one, so no single source node is hammered. Only ~1/N of keys per added node move.

**Throttling the rebalance** is the crux: this is the "thundering rebalance" risk. I rate-limit streaming (a bytes/sec cap per node pair), bootstrap new nodes in **batches** rather than all at once, and prioritize live read/write traffic over background streaming so p99 latency holds. New nodes serve reads only after their range is fully streamed and verified (Merkle-tree anti-entropy to confirm consistency), so I never route reads to a partially-filled replica. During the ramp, reads still have 3 replicas available on the old owners until handoff completes, so there is no availability dip.

**Removal/shrink** after the peak reverses the process, gradually, with the same throttle. The committed tradeoff: I accept a slower, throttled rebalance (hours, not minutes) to protect live-traffic latency and correctness, rather than a fast reshuffle that would spike p99 and risk serving stale or missing replicas.

### sd-l3-shard-key-hotspots: Shard-Key Selection, Hotspots & the Celebrity Problem

- **id:** `sd-l3-shard-key-hotspots`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** shard-key, hot-key, celebrity

#### Learn

Consistent hashing spreads keys evenly *given* good keys. The shard key itself is the higher-leverage decision, and it is the one you cannot cheaply undo. A bad shard key silently rebuilds a single-node bottleneck inside your distributed system, and changing it later means migrating the whole dataset. Get this one right up front.

A good shard key has three properties. **High cardinality:** many distinct values, so load can actually spread. Sharding by `country` or `status` (a handful of values) means a handful of partitions, and one value (`US`, `active`) dominates. **Even access distribution:** not just many values, but roughly uniform *traffic* per value. A high-cardinality key where 1% of values get 99% of reads is still a hotspot. **Alignment to the dominant query:** the key the most frequent/critical query filters on, so that query hits one partition instead of scatter-gathering across all of them.

These pull against each other, which is the whole difficulty. `user_id` gives high cardinality and even spread but forces "all posts in this group" to scatter-gather. `group_id` co-locates a group's posts for cheap reads but hotspots a giant group. Naming the tension and committing to a side (usually: align to the dominant query, then mitigate the resulting hotspot) is the senior move.

**The celebrity / hot-key problem** is the sharpest case. Shard a social graph by `user_id` and one celebrity with 100M followers and 1000x normal traffic maps to **one** partition, which then owns 1000x the load of its peers. No amount of consistent hashing helps: it is one key, so it is one node. Mitigations, roughly in order of reach:

- **Salting / key-splitting:** append a bucket suffix to spread one logical key across K physical partitions (`celebrity_id:0..K-1`). Writes pick a random bucket; reads fan out to all K and merge. It trades a bounded K-way read fan-out for killing the single-node hotspot. Use it for the few known whales, not everyone.
- **Sub-partitioning:** split a hot partition's range into finer ranges dynamically when it exceeds a load threshold (DynamoDB adaptive capacity and automatic split-for-heat do this for you).
- **Dedicated shards for whales:** route known celebrities/mega-tenants to their own isolated nodes so their traffic cannot starve normal users. Common in multi-tenant SaaS.
- **Caching + fan-out-on-read:** for a celebrity's timeline, cache aggressively and read the celebrity's posts at read time rather than fanning out writes to 100M follower inboxes (the classic Twitter hybrid: fan-out-on-write for normal users, fan-out-on-read for celebrities).

**Entity groups / co-location:** deliberately put data that is transacted together on the same partition so common operations stay single-shard (Google Megastore's entity groups, and the reason you shard an e-commerce order and its line items together by `order_id`). This is how you keep transactions cheap while sharding.

**Compound keys** serve multi-tenancy: `(tenant_id, entity_id)` isolates tenants (a tenant's data is co-located and one tenant cannot scatter across the fleet) while entity_id preserves cardinality within a tenant. Combine with dedicated shards for the biggest tenants.

**Interview nuance:** always say resharding is expensive and must be planned *before* you need it. Pre-split into more logical partitions than nodes (e.g. 1024 logical shards on 16 physical nodes) so growth is a cheap remap of logical-to-physical, not a re-key. And design **online migration**: double-write to old and new, backfill, verify, then cut over reads, so you never take downtime to reshard.

Recap: a good shard key is high-cardinality, evenly accessed, and aligned to the dominant query; the celebrity problem defeats plain hashing because one key is one node, so mitigate with salting, sub-partitioning, or dedicated shards; use entity groups and compound keys to keep transactions single-shard; and plan resharding and online migration early because the shard key is costly to change.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose the shard key for a social feed where one celebrity account has 100M followers and 1000x normal traffic; prevent a single hot shard.

**Think about:**
- What makes a good shard key (cardinality, even access, aligned to query)?
- How do you mitigate a hot key (salting, dedicated shards, sub-partitioning)?
- Why plan resharding and online migration early?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: the store holds posts and the follow graph; dominant reads are "load user U's home feed" and "load account A's posts"; writes are "A posts" and "U follows A." The stated pathology is one celebrity at 1000x traffic.

**Base shard key:** hash of `user_id` (the author) for the posts table. It is high-cardinality and, for the 99.9% of normal accounts, evenly accessed, and it co-locates an account's own posts on one partition so "load A's posts" is a single-partition scan. For the follow graph I shard the "followers of A" edges by `A` and "who U follows" edges by `U`, so both directions have a single-partition lookup.

**The celebrity hotspot** is unavoidable under plain `hash(user_id)`: the celebrity is one key on one node at 1000x load. I apply two mitigations. First, **salting/key-splitting** for the handful of detected whales: store the celebrity's posts under `celebrity_id:bucket` for K buckets (say K=32), writes round-robin buckets, reads fan out to 32 buckets and merge. That converts a 1000x single-node hotspot into ~30x spread across 32 partitions, plus a bounded 32-way read. Second, and more importantly, I change the **read pattern**: normal accounts use fan-out-on-write (push a new post into each follower's inbox), but celebrities use **fan-out-on-read**. I do not write 100M inbox rows per celebrity post; instead a follower's feed is assembled by merging their fan-out-on-write inbox with a read-time pull of the (heavily cached) celebrity posts they follow. This is the Twitter hybrid, and it is what actually tames the 100M-follower case.

I also **dedicate shards** to the top handful of celebrities so their traffic is physically isolated from normal users and cannot starve them.

**Planning:** I pre-split into ~1024 logical shards mapped onto far fewer physical nodes so I can grow by remapping logical to physical rather than re-keying. And I design online resharding (double-write, backfill, verify, cutover) up front, because discovering the shard key is wrong under load is a migration I never want to do reactively.

**Common wrong turn:** sharding by a low-cardinality key like `country` or `account_status`, or assuming `hash(user_id)` alone handles the celebrity. Hashing spreads *keys*, but a celebrity is a single key, so it stays a single hot node until you split the key or change the read pattern.

**Self-check rubric:**
- [ ] I picked a high-cardinality key aligned to the dominant query and justified all three properties.
- [ ] I explicitly said plain hashing does not fix the celebrity (one key = one node).
- [ ] I gave concrete hot-key mitigations (salting/split, dedicated shards) with the read fan-out cost.
- [ ] I addressed the 100M-follower fan-out with fan-out-on-read / hybrid, not just key salting.
- [ ] I mentioned pre-splitting into logical shards and online-migration planning.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose the shard key for a multi-tenant B2B SaaS analytics platform (think Datadog or a Segment-style event store) where 10,000 tenants share the cluster, the largest tenant generates 40% of all events, and every query is scoped to a single tenant. Prevent both the whale-tenant hotspot and the noisy-neighbor problem.

**Model answer (revealed on demand):**

Assumptions: every query filters by tenant, so tenant isolation is both a performance and a correctness/security concern; event volume per tenant spans many orders of magnitude; one whale tenant is 40% of the load.

**Shard key:** a **compound key `(tenant_id, entity_id)`**, hashed. Scoping placement by tenant means a tenant's data co-locates and every tenant-scoped query hits a bounded set of partitions rather than the whole fleet, and it enforces isolation. The entity_id component preserves cardinality *within* a tenant so a single large tenant still spreads across partitions instead of one row-key.

The **whale at 40%** cannot share a partition scheme with 3-event/day tenants, so I tier tenants:

- **Whales / large tenants** get **dedicated shards** (their own physical nodes or a dedicated cluster). This isolates their load so they cannot starve small tenants (the noisy-neighbor fix) and lets me scale their capacity independently. Within a whale I sub-partition by `(tenant_id:bucket, entity)` to spread their 40% across many partitions.
- **The long tail** of small tenants is **packed** many-to-a-partition by `hash(tenant_id)`, which is efficient because none of them individually is hot.
- I keep a **directory/routing table** (tenant to shard-tier mapping) so I can promote a growing tenant from the shared pool to a dedicated shard online, via double-write and backfill, when it crosses a load threshold.

The committed tradeoff: I run two placement regimes (dedicated for whales, packed for the tail) and pay the complexity of a routing directory and tenant-promotion migrations, in exchange for hard noisy-neighbor isolation and independent scaling of the tenants that actually drive cost. A single uniform `hash(tenant_id)` would either waste a whole node on tiny tenants or let the whale dominate whatever partition it lands on.

### sd-l3-cross-shard-ops: Cross-Shard Operations & Distributed Transactions

- **id:** `sd-l3-cross-shard-ops`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** cross-shard, saga, transactions

#### Learn

Sharding buys scale by breaking two things you took for granted on a single database: **joins** and **atomic multi-key writes**. Once related rows can live on different nodes, a query that spans them is a distributed operation, and a write that must change both is a distributed transaction. This lesson is how you cope.

**Cross-shard reads (scatter-gather).** A query that is not scoped to one shard key must fan out to every partition, and it is bounded by the **slowest shard**, not the average. This is **tail latency amplification**: if each shard's p99 is 10ms and you hit 50 shards, the chance that *at least one* is slow approaches certainty, so the overall p99 is far worse than 10ms. Mitigations: avoid the fan-out by choosing the shard key to match the query (previous lesson), **denormalize** so the data you need is co-located, cap the fan-out width, and use hedged/speculative requests to blunt single-shard tail latency. The senior instinct is to design most reads to touch one shard and treat scatter-gather as the rare, budgeted case.

**Cross-shard writes.** The textbook answer is **two-phase commit (2PC)**: a coordinator asks all participants to *prepare* (lock and promise), and if all vote yes, tells them to *commit*. It gives atomicity, and you should know it, but **avoid it on the hot path**. 2PC holds locks across a network round trip, so it kills throughput, and it is **blocking**: if the coordinator dies after prepare, participants sit holding locks indefinitely, unsure whether to commit or abort. In a high-QPS sharded system 2PC is a latency and availability liability. It is defensible only for low-frequency, must-be-atomic operations, and modern systems (Spanner, CockroachDB) make it viable only by pairing it with tight clock/consensus machinery you do not want to hand-roll.

**Sagas** are the standard replacement for cross-shard *business* transactions. A saga breaks the operation into a sequence of **local** transactions, each on one shard, and for every step defines a **compensating action** that semantically undoes it. If a later step fails, you run the compensations for the completed steps in reverse. A money transfer becomes: debit A (local), credit B (local); if credit fails, compensate by re-crediting A. You give up isolation (intermediate states are visible, so you design for them, e.g. a "pending" balance) in exchange for no distributed locks and independent, available shards. Sagas are **orchestrated** (a central coordinator drives steps, easier to reason about and monitor) or **choreographed** (each step emits an event the next reacts to, more decoupled but harder to trace).

Two patterns make sagas safe under real-world **at-least-once** delivery:

- **Idempotency keys.** Every step carries a unique key; the receiving shard records processed keys and **dedups retries**, so replaying "credit B" after a timeout does not double-credit. Without this, retries corrupt data.
- **The outbox pattern.** The problem: you must both write the DB row *and* publish an event, but they are separate systems, so a crash between them loses one. The fix: in the **same local transaction**, write the business row and an "outbox" row; a separate relay reads the outbox and publishes to Kafka, marking rows sent. Now the DB write and the intent-to-publish are atomic, and the relay retries publishing idempotently. This is how you drive a saga's next step reliably.

**Interview nuance:** the failure mode interviewers hunt for is hand-waving cross-shard joins and multi-key writes as if they were free. When the design crosses shards, say it: "this is now a distributed transaction; I will use a saga with compensations and idempotency keys, not 2PC on the hot path, and I will denormalize to keep the frequent reads single-shard." Naming the mechanism (and its cost) is the whole answer.

Recap: sharding breaks joins (scatter-gather, bounded by the slowest shard and prone to tail amplification) and atomic multi-key writes; avoid 2PC on the hot path because it locks and blocks on coordinator failure; use a saga of local transactions with compensating actions, make retries safe with idempotency keys, publish events atomically with the outbox pattern, and denormalize to avoid cross-shard joins.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a money-transfer or order-checkout flow that must update two records living on different shards without losing consistency.

**Think about:**
- Why avoid 2PC on the hot path, and what does it cost?
- How does a saga with compensations replace a cross-shard transaction?
- How do the outbox pattern and idempotency keys make it safe?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a money transfer of amount X from account A to account B, where A and B are sharded by account_id and live on different shards. Requirements: no money created or destroyed, no double-debit under retries, and it must stay available and fast at scale.

**Why not 2PC:** a two-phase commit across A's and B's shards would lock both rows across network round trips and, worse, block holding those locks if the coordinator crashes between prepare and commit, exactly on the highest-value hot path. That is a throughput and availability liability I will not accept for the common case.

**Saga design.** I model the transfer as a sequence of local transactions with compensations, driven by an **orchestrator** (a transfer service) for traceability:

1. Create a transfer record in `PENDING` with a unique **transfer_id** (the idempotency key).
2. Local txn on A's shard: debit A by X, tagged with transfer_id (dedup table rejects a replayed debit).
3. Local txn on B's shard: credit B by X, tagged with transfer_id (same dedup).
4. Mark the transfer `COMPLETED`.

If step 3 fails permanently, run the **compensation**: a local txn on A's shard that re-credits X (again keyed by transfer_id so it runs once) and marks the transfer `FAILED`. Intermediate isolation is relaxed: the debit is visible before the credit, so I model A's balance as available vs pending and never let the same funds be spent twice.

**Making it reliable.** Each step uses the **outbox pattern**: the local DB write and the event that triggers the next step are written in one local transaction to an outbox table, and a relay publishes to Kafka and retries idempotently, so a crash between "debit A" and "emit credit-B event" cannot lose the step. Delivery is at-least-once, so **idempotency keys (transfer_id + step)** and per-shard dedup tables make every retry safe: replaying "credit B" after a timeout is a no-op.

**Common wrong turn:** reaching for 2PC (or an ambient distributed transaction) on the hot path, or waving away the two-shard write as atomic. It is not atomic; it is a saga, and the honest answer names the compensations and the idempotency/outbox machinery that keep it correct under retries and crashes.

**Self-check rubric:**
- [ ] I stated why 2PC is wrong here (locks + blocks on coordinator failure on the hot path).
- [ ] I laid out a saga of local per-shard transactions with an explicit compensating action.
- [ ] I used idempotency keys + dedup so at-least-once retries do not double-apply.
- [ ] I used the outbox pattern to make the DB write and event publish atomic.
- [ ] I addressed the relaxed isolation (pending/available state) rather than assuming ACID isolation.

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the order-placement flow for an Amazon-scale checkout that must, as one logical operation, reserve inventory (inventory service/shard), charge payment (payment service/shard), and create the order (order service/shard), each on a different data store, at tens of thousands of orders/sec. Guarantee no oversell and no double-charge, and keep it available if any one service is briefly down.

**Model answer (revealed on demand):**

Assumptions: three independent services with their own sharded stores; the operation spans all three; peak is high; the hard invariants are no overselling inventory and no double-charging a customer, while staying available under partial failures.

This is a textbook **orchestrated saga**, not a distributed transaction. An **order orchestrator** drives an `order_id`-keyed state machine:

1. **Reserve inventory** (local txn on the inventory shard: decrement available, create a reservation keyed by order_id). Compensation: release the reservation.
2. **Authorize payment** (local txn on the payment shard, keyed by order_id). Compensation: void/refund the authorization.
3. **Create order** as `CONFIRMED` and capture payment.

If step 2 fails (card declined) I compensate step 1 (release inventory) and mark the order `FAILED`. If step 3 fails I compensate payment (void) and inventory (release). No 2PC: each step is a local transaction, so no cross-service locks and each service stays independently available.

**No oversell:** inventory reservation is a local atomic decrement with a floor at zero, so two concurrent orders for the last unit cannot both succeed; the loser's saga fails and compensates. **No double-charge:** payment authorization is idempotent on order_id, so a retried "authorize" after a timeout returns the existing authorization instead of charging again.

**Reliability under partial failure:** every step uses the **outbox pattern** (business write + next-step event in one local txn, relayed to Kafka), so a crash mid-saga does not lose a step. If a service is briefly down, the orchestrator retries with backoff; the order sits in its pending state (customer sees "processing"), and the saga resumes when the service recovers, rather than failing the whole checkout. A timeout policy eventually compensates and releases the inventory hold so stock is not stranded.

The committed tradeoff: I accept eventual consistency and visible intermediate states (a brief inventory hold, a pending order) plus the orchestration/idempotency/outbox complexity, in exchange for high availability and throughput that 2PC across three services could never sustain at tens of thousands of orders/sec.
