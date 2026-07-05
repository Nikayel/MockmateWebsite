> Module **sd-l5-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l5-m2](./sd-l5-m2.md) · Next: [sd-l5-m4](./sd-l5-m4.md)

# L5 · Consensus & Coordination

After this module you can explain why replicating a service correctly reduces to agreeing on an ordered log, reason through how Raft keeps a cluster consistent across a leader crash, and pick concrete N/R/W quorum settings for a real store while stating the exact consistency you get and the consistency you do not.

### sd-l5-smr-total-order: State-Machine Replication & Total-Order Broadcast

- **id:** `sd-l5-smr-total-order`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** smr, total-order-broadcast

#### Learn

Almost every strongly consistent distributed system, etcd, ZooKeeper, Kafka's controller, CockroachDB, Spanner, is secretly the same machine underneath. That machine is **state-machine replication (SMR)**, and understanding it collapses a dozen scary systems into one idea.

Start with a deterministic state machine: a program whose next state depends only on its current state and the next input. A key-value store is a perfect example. `SET x=5`, `DELETE y`, `INCR z` are commands, and if you apply the same commands in the same order starting from the same empty state, you land in exactly the same final state, every time, on every machine. That is the whole trick. If you can get N replicas to apply the **same sequence of commands in the same order**, they will all hold identical state, with no further coordination needed.

So the replication problem reduces to one thing: getting every replica to agree on a single ordered log of commands. This ordering primitive has a name, **total-order broadcast** (also called atomic broadcast): every correct node delivers the same set of messages in the same order. The deep result, and the sentence that impresses interviewers, is that **total-order broadcast is equivalent to consensus**. You can build one from the other. If you can solve consensus, you can order a log; if you can order a log, you have solved consensus. This is why "how do I keep my replicas consistent" and "I need a consensus algorithm" are the same question wearing different clothes.

```
  clients ->  [ append ]  ->  replicated ordered log
                              idx:  1     2     3     4
                              cmd: SET   INCR  DEL   SET
                                    |     |     |     |
              replica A  apply ---> same order ---> state S
              replica B  apply ---> same order ---> state S
              replica C  apply ---> same order ---> state S
```

Two preconditions are non-negotiable. First, **apply must be deterministic**. If a command reads the wall clock, a random number, a map's iteration order, or calls out to an external service, two replicas fed the identical log will diverge, and now your replicas silently disagree while the log looks perfectly healthy. This is the number one wrong turn. The fix is to move all nondeterminism into the command before it enters the log: the leader stamps the timestamp or random seed, writes it into the entry, and every replica applies that recorded value. Second, apply should be idempotent enough that replaying an entry twice (after a crash, mid-apply) is safe.

The remaining practical problem is that the log grows forever. You bound it with **snapshots (log compaction)**: periodically serialize the full state machine to disk, record the log index it covers, and truncate everything at or below that index. A recovering or newly added replica installs the latest snapshot and then replays only the tail of the log, instead of the entire history since genesis. Raft, Kafka, and etcd all do exactly this.

**Interview nuance:** if asked "how do you keep replicas consistent," do not jump to gossip or last-write-wins. Say "I model each replica as a deterministic state machine and feed them one agreed ordered log via a consensus protocol; consistency then falls out for free," then mention snapshots for log growth. That framing signals you understand the primitive rather than a specific product.

Recap: identical replicas come from applying the same deterministic commands in the same order, achieving that order is total-order broadcast which is equivalent to consensus, nondeterministic apply is the classic silent-divergence bug, and snapshots bound otherwise-unbounded log growth.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a replicated state machine for a key-value store and explain why an ordered replicated log is the core primitive.

**Think about:**
- Why do deterministic, ordered ops give identical replicas?
- Why is atomic broadcast equivalent to consensus?
- How do snapshots bound log growth?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a 3-replica or 5-replica KV store that must survive node crashes and serve linearizable reads/writes, running on commodity hosts in one region, with a few thousand writes per second.

I model each replica as a **deterministic state machine**: the state is the key-value map, and the commands are `SET k v`, `DELETE k`, and conditional ops like compare-and-swap. The core design decision is that replicas never talk about state directly. Instead they agree on a single **ordered log of commands**, and each replica applies that log in index order. Because the state machine is deterministic, applying the same commands in the same order from the same starting state produces byte-identical maps on all replicas, so consistency is a consequence of ordering, not something I maintain separately.

Getting that agreed order is the hard part, and it is exactly **total-order broadcast**: every replica delivers the same commands in the same sequence. Total-order broadcast is equivalent in power to consensus, so I implement the log with a consensus protocol (Raft in practice). A leader assigns each incoming command a monotonically increasing index, replicates it to a majority, and only then marks it committed; replicas apply committed entries in index order.

Two correctness rules. **Determinism:** any nondeterministic input (timestamps, random values, TTL expiry moments) must be resolved by the leader and written *into* the log entry, so every replica uses the recorded value. If apply reads the local clock or map iteration order, replicas silently diverge despite an identical log, which is the classic wrong turn. **Idempotent replay:** applying an entry twice after a crash must be safe, so I track the last-applied index durably.

To stop the log growing without bound, I take periodic **snapshots**: serialize the entire map plus the covered log index, persist it, and truncate the log up to that index. A restarting or newly joined replica installs the latest snapshot and replays only the tail, instead of the full history.

Tradeoffs: writes cost a round trip to a majority (higher latency than a single node), reads can be served from the leader for linearizability or from followers for stale-but-cheap reads. The payoff is that node crashes never lose committed data and replicas cannot disagree.

**Self-check rubric:**
- [ ] Modeled replicas as deterministic state machines applying an ordered log
- [ ] Stated that identical order + determinism yields identical state
- [ ] Named total-order/atomic broadcast and its equivalence to consensus
- [ ] Called out nondeterministic apply as the silent-divergence trap and how to fix it
- [ ] Used snapshots/compaction to bound log growth and speed recovery

#### Practice: real-world variant (save, then reveal)

**Prompt:** Explain how Apache Kafka replicates a partition and why its design is state-machine replication in disguise, then identify the one place Kafka deliberately trades away strict SMR semantics for throughput.

**Model answer (revealed on demand):**

Assumptions: a Kafka topic partition with replication factor 3, one leader and two followers, high write throughput (hundreds of MB/s).

A Kafka partition *is* an ordered, append-only log, which is the SMR primitive made explicit. The leader assigns each record a monotonically increasing **offset** (the log index). Followers pull records in order and append them, and the leader advances the **high-water mark** only once records are replicated to the **in-sync replica (ISR)** set. Consumers can only read up to the high-water mark, so every replica and every consumer observes the same records in the same offset order: total-order broadcast over that partition. The "state machine" here is trivial (append the byte record), which is why Kafka does not need per-record consensus like Raft; it needs agreement on the log and on who the leader is. Historically that leader/ISR metadata lived in ZooKeeper (Raft-like coordination); KRaft now runs an actual Raft log for it.

The deliberate trade: Kafka does not use a strict majority quorum for data. With `acks=all` a write is acknowledged once all *current ISR* members have it, and ISR can shrink to just the leader under failures. If you leave `min.insync.replicas=1` and allow **unclean leader election**, a lagging replica can become leader and truncate acknowledged records, sacrificing durability for availability and throughput. The safe configuration is `acks=all` with `min.insync.replicas=2` on RF=3 and unclean election disabled, which restores majority-like overlap. Kafka also bounds log growth with **retention and log compaction**, the streaming analog of SMR snapshots (compaction keeps the latest value per key).

The nuance: Kafka separates *metadata* consensus (KRaft/Raft, strict) from *data* replication (leader + tunable ISR acks). That split is exactly how it gets both correctness where it matters and multi-GB/s throughput where strict consensus per record would be too slow.

### sd-l5-raft-paxos: Consensus in Depth: Raft (and the Paxos Family)

- **id:** `sd-l5-raft-paxos`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** raft, paxos, consensus

#### Learn

Raft is the coordination primitive you will actually name in interviews, because it powers etcd (and therefore Kubernetes), Consul, CockroachDB, TiKV, and countless internal control planes. Its whole selling point over Paxos is that it was designed to be *understandable*, by decomposing consensus into three separable problems: leader election, log replication, and safety.

**Leader election.** Raft time is divided into **terms**, each a monotonically increasing integer that acts as a logical clock. At most one leader exists per term. Every node is follower, candidate, or leader. If a follower hears nothing from a leader within its **election timeout**, it becomes a candidate, increments the term, votes for itself, and requests votes. A candidate that collects votes from a **majority** wins and becomes leader. The clever bit that avoids endless split votes is that each node's election timeout is **randomized** (say 150 to 300ms), so nodes rarely time out simultaneously; one usually starts first, gathers a majority, and shuts the others down before they compete. A node only grants its vote to a candidate whose log is **at least as up to date** as its own, which is what prevents a stale node from ever becoming leader and clobbering committed data.

**Log replication.** Clients send commands to the leader. The leader appends the entry to its log and sends `AppendEntries` to followers. Once an entry is stored on a **majority** of nodes, the leader marks it **committed** and applies it to its state machine, then followers apply it too. The **commit rule** is the heart of it: an entry is durable the instant a majority has it. Majority quorums work because any two majorities of N nodes must **overlap in at least one node** (a 3-node cluster needs 2; any two sets of 2 share a member). That overlapping node carries committed entries forward into any future leader's election, so committed data is never lost.

```
  5-node cluster, leader crashes:
    term 4 leader (S1) dies
    S2..S5 election timeouts fire (randomized) -> S3 first
    S3 (up-to-date log) requests votes -> S2,S4 grant -> majority 3/5
    S3 becomes leader for term 5, resumes AppendEntries
    an uncommitted term-4 entry only on S1 is overwritten, never was committed
```

**Safety.** Raft guarantees: *election safety* (one leader per term), *leader append-only* (a leader never overwrites its own entries), *log matching* (if two logs share an entry at an index/term, all prior entries match), and *leader completeness* (a leader for a new term contains every committed entry from prior terms). Together these mean an entry, once committed, survives every future leader change. An entry that was replicated but **not yet committed** when the old leader crashed can be safely overwritten by the new leader, and that is correct precisely because no client was ever told it committed.

A **minority partition** cannot make progress: a partitioned old leader with only 2 of 5 nodes can append to its local log but can never reach a majority, so it never commits, and when the partition heals it discovers a higher term and steps down, discarding its uncommitted tail. **Membership changes** use **joint consensus** (a transitional configuration requiring majorities of both old and new sets) so you never create two disjoint majorities mid-reconfiguration.

**Interview nuance on cluster size:** always use an **odd** number. A 5-node cluster tolerates 2 failures (majority 3); a 4-node cluster *also* tolerates only 1 failure (majority still 3) while costing an extra machine and an extra vote to collect. Even sizes buy no extra fault tolerance and add latency. The classic wrong turn is a 2-node cluster: majority is 2, so a single failure leaves you with no majority and a hung, unwritable system.

**Paxos family.** Basic Paxos solves single-value consensus; Multi-Paxos chains it for a log and underlies Google's Chubby and Spanner. Paxos is more flexible but famously hard to implement correctly, which is why Raft constrains leadership (only up-to-date logs win, single leader at a time) to trade some flexibility for a protocol engineers can actually get right. The **FLP impossibility** result says no deterministic consensus can guarantee termination in a fully asynchronous network with even one crash; real systems dodge it by assuming **partial synchrony** (eventually messages arrive within some bound), which is what randomized timeouts operationalize.

Recap: Raft splits consensus into randomized-timeout leader election, majority-quorum log replication with commit-on-majority, and four safety properties that make committed entries immortal; minority partitions stall safely, membership changes use joint consensus, and clusters should be odd-sized because even sizes and 2-node clusters waste nodes or deadlock.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Walk through how Raft keeps a 5-node cluster consistent across a leader crash: cover election, log replication, and what happens to an uncommitted entry.

**Think about:**
- How does randomized-timeout election avoid split votes?
- What is the commit rule, and why do majority quorums guarantee overlap?
- How does a minority partition behave, and why is an even cluster wasteful?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 5 nodes (S1 to S5), S1 is the term-4 leader, clients write through the leader, majority is 3.

**Normal replication.** A client sends `SET x=5` to S1. S1 appends it at the next log index in term 4 and sends `AppendEntries` to S2 to S5. When at least 3 nodes (including S1) have persisted the entry, S1 marks it **committed**, applies it, and returns success to the client. The commit rule is "durable once a majority holds it." Majority quorums are safe because any two majorities of 5 must share at least one node: any future leader election also needs 3 votes, and at least one of those voters held the committed entry and had an up-to-date log, so the entry propagates forward and can never be lost.

**Leader crash and election.** S1 dies. S2 to S5 stop hearing heartbeats and, after their **randomized** election timeouts, one (say S3) fires first, increments the term to 5, votes for itself, and requests votes. Randomizing the timeouts means the nodes rarely become candidates at the same instant, so split votes are rare; if one happens, nobody reaches 3 and the nodes retry with fresh random timeouts until one wins. Critically, S2/S4/S5 only grant their vote if S3's log is **at least as up to date** as theirs, so a node missing committed entries can never win. S3 collects 3 votes, becomes term-5 leader, and resumes replication.

**The uncommitted entry.** Suppose S1 had appended `SET y=9` in term 4 but crashed before a majority stored it, so it was **never committed** and the client was never told it succeeded. When S3 becomes leader, its `AppendEntries` consistency check detects the mismatch and **overwrites** that dangling entry on any follower that has it. This is correct precisely because the entry was never committed, no client observed it as durable. A *committed* entry, by contrast, survives because leader completeness guarantees the new leader already holds it.

**Minority partition.** If S1 comes back but is partitioned with only S2 (2 nodes), it cannot reach a majority of 3, so it can append locally but never commits anything. When the partition heals it sees term 5 > term 4, steps down to follower, and truncates its uncommitted tail. **Cluster size:** 5 is odd and tolerates 2 failures; a 4-node cluster tolerates only 1 (majority still 3) while wasting a machine, so even sizes are strictly worse. A 2-node cluster is the trap: one failure leaves no majority and the system hangs.

**Self-check rubric:**
- [ ] Explained randomized election timeouts preventing split votes and the up-to-date-log vote condition
- [ ] Stated the commit rule (majority) and the quorum-overlap argument
- [ ] Correctly said an uncommitted entry is safely overwritten and a committed one survives
- [ ] Described a minority partition stalling and stepping down on heal
- [ ] Justified odd cluster sizes and flagged the 2-node deadlock

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the coordination layer for a Kubernetes-style control plane storing cluster state in etcd across three regions with 80ms inter-region round-trip latency. Explain how you place the Raft members, what write latency you should expect, and how you avoid the split-brain and stale-read pitfalls.

**Model answer (revealed on demand):**

Assumptions: etcd runs a single Raft group holding all control-plane state (objects, leases), read-heavy but writes must be strongly consistent, three regions A/B/C with ~80ms RTT between them, ~40ms each way.

**Member placement.** I run a 5-member etcd cluster and spread it so **no single region holds a majority**: for example 2 in region A, 2 in region B, 1 in region C. Majority is 3, so losing any one region still leaves at least 3 reachable members and the cluster stays writable. If I put 3 members in region A and A fails, I lose the majority and the whole control plane goes read-only, which is the placement mistake to avoid. Five members (not 3) means I tolerate a full region loss *plus* one more node.

**Write latency.** Every committed write needs the leader plus a majority to persist the entry. Because members are cross-region, a commit typically costs one inter-region round trip to the nearest quorum member, so expect **tens of milliseconds per write** (order of 40 to 80ms), far higher than a single-region cluster's sub-millisecond fsync round trip. I keep the leader pinned to the region with the most members (A) to minimize the hops it needs, and I use etcd leases and batching so the write rate the control plane demands stays within that budget. If write latency is unacceptable, the honest answer is that strong consensus across 80ms links has a floor, and the fix is fewer cross-region hops (regional clusters federated) rather than pretending Raft is free.

**Split-brain.** Raft makes classic split-brain impossible: a partitioned minority (say region C's single member, or a 2-member island) can never reach majority 3, so it cannot elect a leader or commit, and it steps down when it sees a higher term on heal. I disable any unclean/forced reconfiguration that could manufacture a second majority.

**Stale reads.** Follower reads can lag the committed state. For linearizable reads I route reads through the leader with a **ReadIndex** confirmation (leader verifies it is still leader via a heartbeat quorum before serving), accepting the latency. Where staleness is tolerable (dashboards, watches), I allow serializable follower reads for speed. The wrong turn is serving follower reads and calling them consistent.

### sd-l5-quorums-tunable: Quorums & Dynamo-Style Tunable Consistency

- **id:** `sd-l5-quorums-tunable`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** quorums, tunable-consistency, dynamo

#### Learn

Raft gives you one fixed answer: a majority, every time. Dynamo-style systems (DynamoDB's underpinnings, Cassandra, Riak, ScyllaDB) instead hand you a **dial**. You choose three numbers per operation, and they trade durability, consistency, and latency against each other. Knowing the dial and its exact guarantee is a staple of every senior interview.

The three knobs:
- **N**: the replication factor, how many nodes store each key (say 3).
- **W**: how many replicas must acknowledge a **write** before the client is told it succeeded.
- **R**: how many replicas must respond to a **read** before the client gets an answer.

The one rule to memorize is **R + W > N**. When that holds, the set of nodes a read touches and the set a write touched must **overlap in at least one node** (pigeonhole: two subsets of N whose sizes sum to more than N cannot be disjoint). That overlapping node has seen the latest write, so a read is guaranteed to observe at least one copy of the freshest value. With N=3, W=2, R=2, any read hits at least one of the two nodes that acked the write.

```
  N=3 nodes: [1][2][3]
  W=2 write acked by {1,2}
  R=2 read from {2,3}   -> overlap = node 2 -> sees latest
  since 2+2 > 3, no read/write pair can miss each other
```

**What R+W>N does NOT give you.** This is the number-one trap. Quorum overlap guarantees a read sees the latest *acknowledged* write, but it does **not** give you **linearizability** (real-time ordering). Concurrent writes to different quorums can produce conflicting versions that must be reconciled with **vector clocks / version vectors** (Dynamo returns siblings for the app to merge) or **last-write-wins** by timestamp (Cassandra, which silently drops the loser). A read during an in-flight write may see the old or new value depending on timing, and there is no guarantee about the order two clients observe events in. If you need true linearizability, you need consensus (Raft/Paxos), not quorums. Claiming "R+W>N gives strong consistency" is the classic wrong turn; it gives **quorum consistency**, which is weaker.

**Latency is bounded by the slowest node in the quorum.** A write with W=2 out of N=3 waits for the 2nd-fastest replica, not the average. As you raise W or R toward N you wait on more replicas, so your latency tracks a higher tail percentile. This is **tail amplification**: with N=3, R=3, a single slow node (GC pause, hot disk) drags every read to that node's p99. Systems mitigate with **speculative/hedged reads** (send to R+1, take the first R) and by keeping W and R as low as the consistency requirement allows.

**Sloppy quorum and hinted handoff** trade consistency for availability. In a strict quorum, if the W "home" replicas for a key are unreachable, the write fails. A **sloppy quorum** instead writes to the next W healthy nodes on the ring, even if they are not the key's usual owners, and stores a **hint** so those temporary holders forward the data back to the rightful replicas once they recover (**hinted handoff**). This keeps writes accepted during partitions (favoring the A in CAP) at the cost of a window where a strict-quorum read might miss the value.

**Interview nuance:** map the numbers to intent. **W=N** maximizes durability but breaks writes if any replica is down. **R=1, W=N** gives fast reads and slow, fragile writes. **R=N, W=1** gives fast durable-ish writes and slow reads. **W=1, R=1** is fastest and weakest (no overlap guarantee). Also mention cost-cutters: **flexible quorums** let the write and read quorum sets be defined so they still intersect without both being majorities, and **witness / logless replicas** vote for quorum and fault tolerance without storing full data, cutting storage cost while preserving overlap.

Recap: N/R/W is a per-operation dial, R+W>N forces read/write overlap so a read sees the latest acknowledged write, but that is quorum consistency not linearizability (concurrent writes still need version vectors or LWW), quorum latency tracks the slowest node in the set, and sloppy quorum plus hinted handoff buy availability during partitions at the cost of consistency.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose N/R/W for a session store that must survive one AZ loss and still serve fast reads, and state the consistency you actually get.

**Think about:**
- What does R+W>N guarantee, and what does it NOT guarantee?
- Why is quorum latency bounded by the slowest node?
- How do sloppy quorum and hinted handoff trade consistency for availability?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a session/token store on a Dynamo-style system (DynamoDB or Cassandra) across 3 AZs, read-heavy (every request validates a session), writes on login/refresh, must tolerate losing one full AZ, and reads must be fast (single-digit ms). Sessions are small and can tolerate rare, briefly stale reads (a just-refreshed token seen a beat late is acceptable).

I choose **N=3, one replica per AZ, W=2, R=2**. R+W = 4 > N = 3, so every read quorum overlaps every write quorum in at least one node, and a read is guaranteed to see at least one copy of the latest acknowledged write.

**AZ-loss survival.** With one replica in each of 3 AZs, losing an AZ removes exactly one replica. W=2 still succeeds (two AZs remain), and R=2 still succeeds, so both reads and writes keep working through a full AZ outage. If I had chosen W=3 I would maximize durability but a single AZ loss would **halt all writes**, which fails the requirement; that is the tradeoff I am consciously avoiding.

**What I actually get.** This is **quorum consistency**, not linearizability. A read sees the latest write that was acknowledged, but concurrent writes to the same session (a login racing a refresh) can create conflicting versions reconciled by last-write-wins timestamp or version vectors, and two clients are not guaranteed a single real-time order. For a session store that is fine, tokens are effectively immutable per issuance. If I needed linearizable semantics I would have to move to a consensus-backed store, which I explicitly do not, to keep reads fast.

**Latency.** Both R and W wait on the **2nd-fastest** of 3 replicas, so latency tracks a moderate tail, not the slowest node (which R=3 would). To protect read p99 I use hedged reads (query all 3, take the first 2) so one slow AZ does not drag every read.

**Availability under partition.** I enable **sloppy quorum + hinted handoff** so that if two home replicas are briefly unreachable, writes still land on the next healthy nodes and get forwarded back on recovery. This favors availability (a login should not fail because of a transient blip) at the cost of a small window where a strict read might miss the newest value, an acceptable trade for sessions.

**Self-check rubric:**
- [ ] Picked concrete N/R/W (e.g. 3/2/2) with one replica per AZ and showed R+W>N
- [ ] Verified writes and reads both survive one AZ loss with those numbers
- [ ] Stated the guarantee is quorum consistency, explicitly NOT linearizability
- [ ] Addressed latency tracking the slowest node in the quorum and a mitigation
- [ ] Made a conscious sloppy-quorum/availability tradeoff appropriate to sessions

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the replication settings for a Cassandra-backed IoT telemetry store ingesting 500k writes/sec from sensors across two regions, where writes must almost never be rejected but analytics reads can tolerate seconds of staleness. Choose consistency levels and explain what breaks if a region is partitioned.

**Model answer (revealed on demand):**

Assumptions: Cassandra, time-series telemetry keyed by sensor+time, extreme write volume (500k/sec), append-mostly, reads are batch analytics that tolerate staleness. Two regions, each a datacenter, with per-region replication factor 3 (N=6 total).

**Write path.** Writes must almost never be rejected, so I optimize the dial for write availability: consistency level **LOCAL_QUORUM** (2 of the 3 local replicas) rather than a global quorum. LOCAL_QUORUM keeps writes fast and confined to one region's replicas, so cross-region latency never sits in the write path, and a write survives one local replica being down. I avoid `EACH_QUORUM` (which needs a quorum in *both* regions) because a single-region blip would then reject writes, violating the requirement. For the absolute highest ingest with weakest guarantees I could drop to CL=ONE, but LOCAL_QUORUM is the right balance of durability and availability.

**Read path.** Analytics tolerate seconds of staleness, so I read at **LOCAL_QUORUM** or even **LOCAL_ONE** for speed. Because writes are LOCAL_QUORUM and reads are LOCAL_QUORUM within the same region, R+W>N holds *within a region* (2+2>3), so intra-region reads see the latest local write; cross-region propagation is asynchronous and lags by the replication delay, which is fine for batch analytics.

**Partition behavior.** If the two regions are partitioned, each region keeps accepting LOCAL_QUORUM writes independently (this is the deliberate AP choice: never reject telemetry). The cost is that the regions diverge for the partition's duration. Cassandra reconciles later via **hinted handoff** (hints stored for the unreachable region and replayed on heal), **read repair**, and anti-entropy repair, with **last-write-wins by timestamp** resolving conflicts. For append-only telemetry keyed by time, conflicts are rare and LWW is safe. The thing that "breaks" is cross-region read consistency during the partition: a global query would miss the other region's just-written points until the partition heals, which the seconds-of-staleness tolerance absorbs. The wrong turn would be demanding EACH_QUORUM or SERIAL (lightweight-transaction) consistency here, which would tank throughput and reject writes during exactly the partition we most need to keep ingesting through.

