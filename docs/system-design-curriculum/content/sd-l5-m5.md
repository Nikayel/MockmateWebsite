> Module **sd-l5-m5** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l5-m4](./sd-l5-m4.md) · Next: [sd-l6-m1](./sd-l6-m1.md)

# L5 · Membership & Failure Handling

After this module you can design replicas that converge without coordination using CRDTs and anti-entropy, detect real crashes in seconds without falsely evicting slow nodes, prevent two active leaders and stale lock holders from corrupting shared state with leases and fencing tokens, and decide when a system genuinely needs Byzantine fault tolerance versus when crash-stop consensus is the cheaper correct answer.

### sd-l5-crdts: CRDTs, Strong Eventual Consistency & Anti-Entropy

- **id:** `sd-l5-crdts`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** crdt, anti-entropy, gossip

#### Learn

When you go AP (available under partition) you accept that replicas diverge, and you need a story for how they come back together. The naive story is last-write-wins with a timestamp, which silently discards concurrent edits. CRDTs (Conflict-free Replicated Data Types) are the disciplined answer: data structures whose merge function is defined so that any two replicas that have seen the same set of updates are byte-for-byte identical, with no conflict resolution and no coordination. That property is **Strong Eventual Consistency (SEC)**: eventual consistency plus a guarantee that convergence is deterministic, not "whoever the app picks."

The property that makes it work: the merge operation must be **commutative, associative, and idempotent**. Commutative means order does not matter (A then B equals B then A). Associative means grouping does not matter. Idempotent means applying the same update twice is harmless. Together these mean you can deliver updates in any order, duplicated, across an unreliable network, and every replica lands in the same state. That is why merge is often a mathematical **join** on a lattice (for a counter, element-wise max; for a set, union).

The workhorse types you should be able to name:

- **G-Counter / PN-Counter**: a grow-only counter is a vector of per-replica counts; the value is the sum, merge is element-wise max. A PN-Counter is two G-Counters (increments and decrements) so it supports subtraction.
- **OR-Set (Observed-Remove Set)**: tags each add with a unique id so a concurrent add and remove resolve to "add wins" correctly, instead of an element flickering out. This is the set most people actually want.
- **LWW-Register**: a single value with a timestamp; simple, but it still *loses* concurrent writes by design.
- **RGA / sequence CRDTs**: ordered lists for collaborative text (the basis of tools like Yjs and Automerge).

Costs are real and interviewers probe them. Every OR-Set element carries add/remove tags, and removed elements often leave **tombstones** so a late-arriving add does not resurrect deleted data. Metadata and tombstones grow, so you need **garbage collection**, which itself needs some coordination or a causal-stability threshold. And CRDTs **cannot enforce global invariants**: you cannot express "this username is globally unique" or "the balance never goes negative" as a CRDT, because those require agreement, and agreement is exactly what CRDTs avoid. For invariants you need consensus.

Convergence does not happen by magic. Replicas must actually exchange the updates they missed during a partition. That is **anti-entropy**, and it has three parts. **Gossip**: each node periodically pushes/pulls state with a few random peers, so updates spread epidemically in O(log n) rounds. **Merkle trees**: to compare a huge key range cheaply, each replica hashes its data into a tree; two replicas swap root hashes, and only descend into subtrees whose hashes differ, so they find the diverged ranges in log time instead of shipping everything. Dynamo and Cassandra use exactly this. Two more mechanisms fill gaps: **read repair** (a read that sees stale replicas writes the fresh value back) and **hinted handoff** (a temporarily-down node's writes are held by a neighbor and replayed when it returns).

Interview nuance: the classic wrong turn is describing CRDTs and stopping. Without anti-entropy, a write that lands on replica A during a partition never reaches replica B, so they never converge. CRDTs give you a *safe merge*; gossip plus Merkle-tree reconciliation is what actually *delivers the updates to merge*.

Recap: CRDTs give Strong Eventual Consistency because their merges are commutative, associative, and idempotent, they cost metadata and tombstones and cannot enforce global invariants, and they only converge if paired with anti-entropy (gossip, Merkle trees, read repair, hinted handoff) to deliver the writes each replica missed.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design the merge logic for a collaboratively-edited counter and set that converge with no coordination under concurrent offline edits, and the background mechanism that reconciles missed writes.

**Think about:**
- What operation properties make CRDTs converge without conflict resolution?
- What do CRDTs cost (metadata, tombstones), and where can they not help?
- How do gossip and Merkle trees reconcile divergent replicas cheaply?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: N replicas (mobile clients plus servers), each can edit while offline, no central coordinator, and we need deterministic convergence once connectivity returns. Every replica has a stable id.

**Counter.** I use a **PN-Counter**: two maps keyed by replica id, one for total increments (P) and one for decrements (N). A local increment bumps `P[myId]`; the observable value is `sum(P) - sum(N)`. **Merge** is element-wise max on both maps: `P[k] = max(a.P[k], b.P[k])`. Max is commutative, associative, and idempotent, so applying merges in any order, duplicated, from any peer, always lands on the same state. Because each replica only ever increases its own slot, concurrent increments on different devices both survive (no lost update), which last-write-wins would not guarantee.

**Set.** I use an **OR-Set**. Each `add(x)` attaches a unique tag (replica id plus a monotonic counter), stored as `{x: set-of-tags}`. `remove(x)` records the tags it observed into a removed/tombstone set. An element is present if it has at least one add-tag not in the removed set. This gives **add-wins** semantics: a concurrent add and remove on different replicas resolves to present, because the new add carries a tag the remover never saw. Merge is union of add-tags and union of removed-tags. Cost: tags and tombstones accumulate, so I GC tombstones once an update is **causally stable** (every replica has acknowledged it), typically tracked with a version vector.

**Anti-entropy (the part people forget).** Convergence requires actually shipping missed writes. Each node runs **gossip**: every second it picks a few random peers and push/pulls state, so updates spread epidemically. To reconcile large state cheaply, replicas build a **Merkle tree** over their keyspace, exchange root hashes, and recurse only into subtrees whose hashes differ, finding divergent ranges in log time rather than streaming everything. I add **read repair** and **hinted handoff** so reads heal stale replicas and writes to a briefly-down node are replayed on its return.

Tradeoff and wrong turn: CRDTs cannot enforce "unique username" or "balance >= 0"; those need consensus, so I would not model them as CRDTs. And the common wrong turn is defining the merge but omitting anti-entropy, leaving post-partition replicas permanently divergent.

**Self-check rubric:**
- [ ] Named commutativity, associativity, idempotence as the convergence conditions
- [ ] Chose PN-Counter (element-wise max) and OR-Set (add-wins via tags) with correct merges
- [ ] Called out tombstone/metadata growth and a GC/causal-stability plan
- [ ] Stated a global-invariant limitation (uniqueness, no-overdraft need consensus)
- [ ] Included anti-entropy: gossip plus Merkle-tree range comparison (and read repair / hinted handoff)

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the sync and conflict model for a Notion-style collaborative document editor supporting real-time co-editing by up to 50 users plus fully offline edits that merge on reconnect, targeting sub-100ms local edit latency and no lost keystrokes.

**Model answer (revealed on demand):**

Assumptions: rich-text documents (nested blocks, formatting), 50 concurrent editors, offline clients that may reconnect hours later, and correctness means every client converges to the same document with no dropped edits.

For the document body I use a **sequence CRDT** (RGA or an Automerge/Yjs-style structure). Each character or block gets a globally unique, densely-orderable position id (a fractional index or a tree-path id) rather than an array index, so a concurrent insert at "position 5" on two clients does not collide: both ids are unique and totally ordered, so the merged order is deterministic. Deletes leave **tombstones** so a concurrent insert next to a deleted character still lands correctly. This is what lets an offline client type for an hour and merge cleanly on reconnect, with no operational-transform server needed to rewrite operations.

Formatting (bold, colors) I model as an **OR-Set of marks** over character ranges so concurrent formatting is add-wins and never flickers. Block-level metadata (which block is a child of which) uses a **move-aware tree CRDT** to avoid cycles when two users reparent concurrently.

Transport: while online, clients send small **op deltas** over a WebSocket relay (Yjs `y-websocket` style) for sub-100ms echo; the server is a dumb fan-out and durability layer, not an arbiter, since the CRDT merge is associative and idempotent. Offline edits queue locally in IndexedDB and replay on reconnect. **Anti-entropy** on reconnect: the client and server exchange **state vectors** (per-replica clocks) and ship only the missing ops, the practical equivalent of a Merkle-diff for op logs.

Costs and mitigations: tombstones and position metadata bloat long-lived docs, so I periodically **compact** once history is causally stable across all live replicas, and snapshot the materialized doc so new joiners do not replay the full op log. Tradeoff: CRDT metadata makes the on-wire and at-rest size larger than the visible text, which is the price of coordination-free offline merge. The wrong turn here is reaching for array-index operational transform with a central server: it breaks under long offline windows and is far harder to make correct than a sequence CRDT.

### sd-l5-failure-detection: Failure Detection: Heartbeats, Phi-Accrual & SWIM

- **id:** `sd-l5-failure-detection`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** failure-detection, swim, gossip

#### Learn

Every distributed system has to answer "is that node dead?" and the uncomfortable truth is that you can never know for sure. A dead node and a node that is merely slow (GC pause, network blip, overloaded NIC) look identical from the outside: both go quiet. This is the **impossibility at the heart of failure detection**, and it forces a tradeoff you must be able to name.

That tradeoff is **completeness vs accuracy**. Completeness means you eventually detect every real crash. Accuracy means you never wrongly declare a live node dead (a false positive). You cannot maximize both. Set your timeout aggressively (say 500ms) and you detect crashes fast but you **flap**: a routine 800ms GC pause evicts a healthy node, triggering a needless failover, rebalance, or re-replication storm that can cascade. Set it conservatively (30s) and you never false-positive but you carry dead nodes for half a minute, sending traffic into a black hole. There is no timeout that is simultaneously fast and never-wrong, because slow and dead are genuinely indistinguishable.

The classic mechanism is a **fixed-timeout heartbeat**: node A pings B every second, and if A misses, say, three in a row, it declares B dead. Simple, but the fixed threshold is exactly the flapping problem: a threshold tuned for a quiet datacenter false-positives the moment latency rises under load, precisely when you least want spurious failovers.

**Phi-accrual failure detection** (from the Cassandra/Akka lineage) fixes the rigidity. Instead of a boolean dead/alive, it outputs a continuous **suspicion level phi**. It records the recent **inter-arrival times** of heartbeats and fits a distribution (typically normal over the recent window). When a heartbeat is overdue, phi is the negative log of the probability that a heartbeat this late is still normal for *this* link. If a link normally jitters by 50ms, a 2-second gap yields a huge phi; if the link is normally bursty, the same gap yields a modest phi. You act at a threshold (phi > 8 means roughly a 1-in-10^8 chance this is normal). The win: it **adapts to each link's actual behavior**, so a consistently jittery WAN link and a rock-steady LAN link get appropriately different thresholds without hand-tuning.

Neither of those scales the *membership* problem. All-to-all heartbeats are O(n^2): 500 nodes each pinging 499 others is ~250k messages per interval, saturating the network before it does anything useful, and the load grows quadratically as you add nodes.

**SWIM** (Scalable Weakly-consistent Infection-style process group Membership) makes per-node load **O(1)** regardless of cluster size. Each period, a node **directly probes one random peer**. If that peer does not ack in time, the node asks **k other random members to probe it indirectly** (the target might be fine but the direct path congested; indirect probes distinguish a network path problem from a dead node, cutting false positives). Only if both direct and indirect fail does it act. Crucially, SWIM adds a **suspicion sub-protocol**: a non-responsive node is marked **suspect**, not dead, and gossiped as suspect; it gets a window to refute ("I'm alive") before being confirmed dead, which sharply cuts false positives from transient blips. Membership changes (join, suspect, confirm, leave) **piggyback on the probe messages** and spread **infection-style** (gossip), so the whole cluster learns in O(log n) rounds with no dedicated broadcast. This is what **HashiCorp memberlist** (Consul, Nomad) and Serf implement, and it is why they scale to thousands of nodes where heartbeat matrices cannot.

Interview nuance: the tell of a weak answer is tuning a single timeout as if slow and dead were distinguishable. The strong framing is: pick an *adaptive* detector (phi-accrual), add a *suspicion* window to buy accuracy, and use *gossip-based* membership (SWIM) so detection load stays flat as the cluster grows.

```
  all-to-all heartbeat:  n=500 -> ~250,000 msgs/interval  (O(n^2))
  SWIM per node/interval: 1 direct probe + k indirect on miss (O(1))
  suspect -> (refute window) -> confirm dead, gossiped on probe traffic
```

Recap: dead and slow are indistinguishable, so failure detection is a completeness-vs-accuracy tradeoff; use phi-accrual to adapt the threshold to each link's inter-arrival distribution, a suspicion window to cut false positives, and SWIM's random direct/indirect probes plus infection-style gossip to keep per-node load O(1) at 500-plus nodes.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design failure detection for a 500-node cluster that detects real crashes within a few seconds without falsely evicting nodes during latency spikes.

**Think about:**
- Why is the completeness-vs-accuracy tradeoff fundamental?
- How does phi-accrual adapt to the inter-arrival distribution?
- Why does SWIM scale where all-to-all heartbeats do not?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 500 nodes in one or two datacenters, occasional latency spikes (GC pauses, load bursts) of up to ~1s, and the cost of a false eviction is high (it triggers re-replication and failover). Target: detect real crashes within a few seconds, keep false positives near zero.

I would not use all-to-all heartbeats. At 500 nodes that is ~250k messages per interval and it grows quadratically, so it saturates the network and gets *worse* as we scale. I use a **SWIM-style gossip membership protocol** (memberlist, as in Consul/Serf), which makes per-node detection load **O(1)**: each period a node directly probes one random peer.

To avoid evicting slow-but-alive nodes, I lean on two SWIM mechanisms plus an adaptive detector. First, **indirect probes**: if a direct probe to node X times out, the prober asks k (say 3) other random members to probe X. If any indirect probe succeeds, X is alive and the direct path was just congested. This alone kills most false positives from transient network blips. Second, a **suspicion window**: a node that fails direct and indirect probes is marked **suspect**, gossiped as suspect, and given a refutation window (a couple of probe periods) to broadcast "I'm alive" before it is confirmed dead. That window is what absorbs a 1-second GC pause without evicting the node.

For the timeout itself I use **phi-accrual** rather than a fixed value, so the threshold adapts to each link's recent inter-arrival distribution: a jittery link gets a looser effective timeout than a steady one, without hand-tuning per link. I act on suspicion at a phi threshold (around 8) rather than a hard boolean.

Membership state (join, suspect, confirm, leave) **piggybacks on probe messages** and spreads infection-style, so with a ~1s probe period the cluster converges on a membership change in O(log 500), a handful of rounds, giving few-second detection.

Tradeoff: the suspicion window and indirect probes add a small delay to confirming a *real* crash (a second or two) in exchange for far fewer false evictions, which is the right trade when a false positive triggers expensive re-replication. The wrong turn is tuning one aggressive timeout: it will flap the instant latency rises under load, exactly when spurious failovers hurt most.

**Self-check rubric:**
- [ ] Explained why dead and slow are indistinguishable (completeness vs accuracy)
- [ ] Rejected O(n^2) all-to-all heartbeats and chose SWIM/gossip for O(1) load
- [ ] Used indirect probes to distinguish path congestion from a dead node
- [ ] Included a suspect state / refutation window to absorb GC pauses
- [ ] Chose an adaptive detector (phi-accrual) over a single fixed timeout

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design membership and failure detection for a 100,000-node edge fleet spread across 300 points of presence on flaky WAN links, where a false eviction re-shards traffic and a missed crash black-holes user requests. Keep control-plane traffic bounded and detection under ~10 seconds.

**Model answer (revealed on demand):**

Assumptions: 100k nodes across 300 PoPs, high and variable WAN latency between PoPs, low latency within a PoP, and both false positives (needless re-shard) and false negatives (black-holed requests) are costly.

Flat SWIM over 100k nodes on WAN links would still gossip cross-PoP too aggressively, so I make membership **hierarchical / locality-aware**. Within each PoP, nodes run SWIM with a short probe period (sub-second LAN), so intra-PoP crashes are detected in 1 to 2 seconds. Across PoPs, a small set of **gateway/seed nodes per PoP** gossip PoP-level membership summaries at a slower cadence, so cross-WAN traffic is O(PoPs), not O(nodes). This bounds control-plane traffic: per-node load stays O(1) and cross-PoP load scales with 300, not 100k.

On the flaky WAN links, **phi-accrual is essential**: a fixed timeout tuned for a LAN would false-positive constantly across the WAN. Phi-accrual learns each cross-PoP link's inter-arrival distribution, so a normally-1s-jittery link is not evicted at 1.2s. I widen the **suspicion window** for cross-PoP suspicions specifically, and require both direct and **indirect probes routed through a different PoP** before confirming a remote node dead, so a single bad WAN path cannot evict a healthy remote node.

Because false negatives black-hole requests, I do not rely on membership alone at the data path: the load balancer also does **active health checks** and **passive outlier detection** (Envoy-style: eject an endpoint after N consecutive 5xx/timeouts) so even before membership confirms a crash, traffic drains from a bad node in a couple of seconds. Membership drives *placement/re-sharding*; data-path health checks drive *request routing*, and the two together give fast request-level protection with conservative, low-false-positive membership changes.

Tradeoff: hierarchy and wider cross-PoP suspicion windows add a second or two to confirming remote crashes, accepted because a WAN false positive re-shards 300 PoPs' worth of traffic. The wrong turn is one flat gossip mesh with one global timeout: it floods the WAN and flaps endlessly on jittery links.

### sd-l5-leader-election-fencing: Leader Election, Leases, Fencing & Split-Brain

- **id:** `sd-l5-leader-election-fencing`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** leader-election, fencing, split-brain

#### Learn

Many systems need a **single active primary**: one node that owns writes, holds a lock, or coordinates work. The hard part is not electing one, it is guaranteeing there is *never* a second one acting at the same time, because the asynchronous network gives you no reliable way to tell a dead primary from a slow one (the same impossibility as failure detection).

**Electing** a leader is the easy half. You run it through a consensus system: **etcd, ZooKeeper, or Consul**, or a Raft/Paxos group directly. The primary holds a **lease**: a time-bounded grant ("you are leader until T+10s") that it must renew. If it stops renewing, the lease expires and a new election runs. Leases are attractive because they need no per-request coordination, but they carry a hidden assumption: **bounded clocks and bounded pauses**. The lease is only safe if every node's clock advances at roughly the same rate and no node freezes past the lease duration.

That assumption breaks, and here is the canonical failure. Leader L holds a 10-second lease and is happily processing a write. Right in the middle, L suffers a **stop-the-world GC pause** (or the VM is descheduled, or a disk stall) for 15 seconds. From everyone else's view, L went silent, its lease expired, and a new leader L2 was elected and started writing. Then L **wakes up**. L does not know time passed. It believes it still holds the lease and completes its in-flight write to shared storage. Now **two leaders** have both written: split-brain, and the data is corrupted. Note that no clock was "wrong" and no bug was hit; a legal pause alone produced two active leaders.

Leases alone cannot fix this, because the paused leader's problem is that its own view of "do I still hold the lease" is stale. The fix lives at the **resource**, not the leader. **Fencing tokens**: every time leadership is granted, the coordinator hands out a **monotonically increasing number** (etcd revision, ZooKeeper zxid, a Raft term). The leader must attach that token to **every write** to shared storage. The storage layer **remembers the highest token it has seen and rejects any write with a lower token**. So when paused L wakes up and tries to write with token 33, the storage has already accepted L2's writes with token 34 and **rejects L's stale write**. L is fenced off. This is the piece a distributed lock *must* have: a lock that only tells the client "you have it" is unsafe, because the client can be paused between acquiring and using it. This is exactly Martin Kleppmann's **critique of Redlock**: without a fencing token enforced at the resource, no distributed lock is safe against a paused holder.

```
  L holds lease, token=33 ----GC pause 15s---------------> writes(token=33) -> REJECTED
                        lease expires, elect L2, token=34 -> writes(token=34) -> accepted
  storage rule: accept iff token > highest_seen
```

Now the **split-brain / partition** question. Take a 5-node cluster split **3-2**. Any consensus-based leadership requires a **majority quorum (3 of 5)**. The **majority side (3)** can elect and keep a leader and stays **writable**; the **minority side (2)** cannot reach quorum, so it steps down and refuses writes. This is the **CP** choice (Raft/etcd/ZooKeeper): the minority sacrifices availability to guarantee one leader. The **AP** alternative (Dynamo-style) lets *both* sides keep accepting writes and reconciles later with CRDTs/version vectors, trading a single-writer guarantee for availability. Either way, **fence the minority**: the losing side must be provably unable to affect shared state, whether by stepping down (CP) or by having its writes rejected via tokens and reconciled (AP). A 2-2 split of 4 nodes has no majority on either side, which is why consensus clusters use **odd numbers**.

Interview nuance: the answer that gets you hired names *both* halves: consensus/lease for who leads, and a **fencing token enforced at the storage layer** for why a paused old leader cannot corrupt state. Stopping at "etcd elects a leader" fails the follow-up "what happens during a GC pause?"

Recap: elect one leader via consensus and a lease, but because a GC pause can make a live leader look dead and briefly create two leaders, enforce **fencing tokens** (monotonic numbers the storage rejects if stale) so the paused old leader is fenced off; on a 3-2 split the majority stays writable (CP) or both sides reconcile (AP), and either way the minority is fenced.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Design a single-active-primary system so that when the primary is wrongly suspected and a new one is elected, the old primary cannot corrupt shared state, and specify behavior on a 3-2 partition.

**Think about:**
- How can a GC pause make a live leader look dead and cause two leaders?
- What do fencing tokens do that leases alone cannot?
- How does a 5-node cluster behave when split 3-2?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a 5-node control group coordinating writes to a shared storage backend (a database or object store), one active primary at a time, and correctness means shared state is never corrupted by two concurrent writers. I care more about safety than about brief unavailability.

**Election and lease.** I elect the primary through a consensus system (**etcd** or **ZooKeeper**, or a Raft group). The primary holds a **lease**, say 10 seconds, that it must renew, e.g. by keeping a session/lock key alive. If renewals stop, the lease expires and the group elects a new primary. This needs no per-write coordination, which keeps the hot path fast.

**Why leases are not enough.** A lease assumes bounded pauses, and that assumption fails. If the primary hits a 15-second **stop-the-world GC pause**, its lease expires, a new primary is elected, and then the old primary wakes up still believing it is leader and completes an in-flight write. That is two writers: split-brain, from a perfectly legal pause, no bug required.

**Fencing (the core of the answer).** I make the storage layer the enforcer. Each leadership grant carries a **monotonically increasing fencing token** (the etcd key revision, ZooKeeper zxid, or Raft term). The primary must stamp that token on **every write**. Storage **tracks the highest token it has accepted and rejects any write with a lower token**. So when the paused old primary wakes and writes with token 33, storage has already taken the new primary's token-34 writes and rejects 33. The old primary is fenced, and it cannot corrupt state no matter how stale its own belief is. This is precisely what a lease alone cannot do, since the paused leader's view of "do I hold the lease" is itself stale; only the resource, remembering the newest token, can catch it.

**3-2 partition.** Consensus needs a **majority (3 of 5)**. The 3-node side keeps or elects a leader and stays **writable**; the 2-node side cannot reach quorum, steps down, and **refuses writes** (the CP choice). When the partition heals, the minority rejoins and catches up from the log. Its stale writes, if any were attempted, are rejected by the token rule. I use an **odd** cluster size so there is always a majority side (a 2-2 split would stall both).

Tradeoff: the CP choice makes the minority unavailable during the partition, which I accept to guarantee a single writer. The wrong turn is a distributed lock with no fencing token (the Redlock trap): a paused holder silently corrupts state.

**Self-check rubric:**
- [ ] Elected via consensus/lease (etcd/ZooKeeper/Raft) and named the lease's bounded-pause assumption
- [ ] Walked the GC-pause -> two-leaders scenario concretely
- [ ] Specified fencing tokens as monotonic numbers **enforced at the storage layer**
- [ ] Called out that a bare lock without fencing is unsafe (Redlock critique)
- [ ] Gave concrete 3-2 behavior: majority writable, minority fenced/steps down; odd cluster size

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design leader election and fencing for a distributed job scheduler like a Kubernetes controller-manager or a cron system where exactly one active scheduler may assign jobs, running 5 replicas across 3 availability zones, so that a network partition or a 30-second scheduler pause can never cause a job to run twice.

**Model answer (revealed on demand):**

Assumptions: 5 scheduler replicas across 3 AZs, jobs are assigned by writing to a shared datastore (etcd or a SQL table), and "runs twice" (double-charging, duplicate side effects) is the failure I must prevent. Brief scheduling delay is acceptable.

**Leader lease.** I use **leader election on etcd** (this is literally how the Kubernetes controller-manager works: a `Lease` object renewed every few seconds, with a leader-elect duration and renew deadline). One replica holds the lease and does all scheduling; the others idle and watch. If the leader stops renewing (crash, partition, pause), its lease lapses and a standby acquires it. Placing 5 replicas across 3 AZs means a single-AZ failure still leaves a majority for etcd quorum and a live standby.

**Fencing at the effect, not just the lock.** The lease is not sufficient, because a **30-second pause** on the leader can let a standby take over while the paused leader still thinks it is scheduling. So I fence at the point of effect. Each leadership term carries a monotonic token (the etcd lease revision / a term counter). Job **claims** are written with that token using a **compare-and-set / conditional write**: assigning job J succeeds only if J is unclaimed *and* the token is the highest seen. When the paused old leader wakes and tries to claim J with a stale token, the CAS fails because a newer term already owns the scheduler, so it cannot double-assign.

**Idempotent execution as the second net.** Even one scheduler can retry, so each job carries a stable **idempotency key** (job id plus scheduled-time bucket). Workers do a conditional insert on that key, so a duplicate assignment is deduplicated at execution and the job runs **at most once** for its scheduled tick. Fencing prevents two schedulers from competing; the idempotency key prevents any residual duplicate from actually executing twice.

**Partition behavior.** etcd requires majority, so only the side with quorum can hold the lease and schedule; the minority side's schedulers cannot renew and go passive. On heal, stale claim attempts are rejected by the token CAS.

Tradeoff: I accept a few seconds of no-scheduling during a failover (lease timeout plus acquire) in exchange for never double-running a job. The wrong turn is trusting the lease alone: a bare leader lock without a fencing token plus idempotent claims will double-schedule the instant the leader pauses past its lease.

### sd-l5-byzantine-fault-tolerance: Byzantine Fault Tolerance & BFT Consensus

- **id:** `sd-l5-byzantine-fault-tolerance`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** consensus, distributed-systems, fault-tolerance

#### Learn

Most consensus you will design assumes the **crash-stop** (or crash-recovery) failure model: a faulty node either follows the protocol correctly or halts. It never *lies*. Under that model, **Raft and Paxos** tolerate `f` failures with **2f+1** nodes, because any two majority quorums of `f+1` overlap in at least one node, and that overlap carries the committed truth forward. Every node is assumed honest, just possibly silent.

The **Byzantine** model drops the honesty assumption. A Byzantine node can do anything: send **wrong** values, **equivocate** (tell node A "the value is X" and node B "the value is Y" in the same round), forge or replay messages, selectively drop, or **collude** with other faulty nodes to actively steer the system to an inconsistent state. The name comes from the Byzantine Generals Problem: generals who must agree to attack or retreat while some are traitors sending contradictory orders. The crucial difference from crash-stop is that a crash is *detectable-ish* (the node is silent) whereas a lie is **actively deceptive**: the node participates, so you cannot just wait it out.

This is why BFT needs **3f+1** nodes to tolerate `f` faulty ones, not 2f+1. The intuition: to make a decision you need a quorum that (a) still forms even if the `f` liars refuse to participate, and (b) is large enough that the honest members in any two quorums overlap despite the liars. With **3f+1** total, a quorum of **2f+1** always contains at least **f+1 honest** nodes, so any two quorums share at least one honest node, and honest nodes always **outvote** the `f` liars. Concretely, to tolerate 1 Byzantine node you need **4** nodes, not 3; to tolerate 2 you need **7**. You are paying `f` extra nodes purely to survive lies rather than silence.

The other cost is **messages**. Because a node cannot trust a single report (the sender might be lying, or might be equivocating), classic BFT protocols make everyone cross-check everyone, which is **O(n^2)** messages per decision, versus the near-linear cost of Raft. Protocols to name:

- **PBFT** (Practical Byzantine Fault Tolerance, Castro-Liskov 1999): the classic. Three phases (pre-prepare, prepare, commit), a primary that proposes, and a **view-change** protocol to replace the primary when it is faulty or equivocating. O(n^2) messages.
- **Tendermint** (Cosmos): BFT consensus with a rotating proposer, well suited to proof-of-stake blockchains.
- **HotStuff** (used in Meta's former Diem/Libra): reduces message complexity to **linear O(n)** via threshold signatures and adds **pipelining** so consecutive decisions overlap, making BFT far more scalable. This is the modern reference.

When is BFT actually justified? When participants are **mutually distrusting or potentially compromised** and there is no single operator you can trust: **public blockchains** (anyone can run a node, some are adversarial), some **cross-organization financial settlement**, and **hardware fault domains** where silent data corruption is undetectable. In those, tolerating lies is the whole point.

When is it **over-engineering**? When all nodes sit **inside one trusted datacenter under one operator**. There, the realistic failures are crashes, disk faults, and network partitions, not malice. **Raft** plus **checksums** (to catch bit rot), **TLS** (to stop tampering in transit), and **authentication** (to stop unauthorized actors) already cover the plausible threats, at a fraction of BFT's node count and latency. Reaching for BFT or a blockchain inside a single org means paying `f` extra nodes and O(n^2) messaging (or a whole consensus chain) for a threat you do not face.

Interview nuance: the sophisticated answer is not "BFT is more robust so use it." It is a **threat-model decision**. State who the participants are and whether any could be adversarial or compromised. If yes, BFT (name HotStuff for scale). If they are one trusted operator, say so and pick Raft plus checksums/TLS/auth, and explain that BFT's cost buys protection against a threat that trust boundary already excludes.

Recap: crash-stop consensus (Raft/Paxos, 2f+1) assumes nodes may halt but never lie; the Byzantine model allows lying, equivocation, and collusion, which forces **3f+1** nodes and often **O(n^2)** messages (PBFT, or linear HotStuff); use BFT only across real trust boundaries (public blockchains, cross-org settlement) and use Raft plus checksums/TLS/auth inside one trusted operator.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain how you would decide whether a system needs Byzantine fault tolerance, contrast the crash-stop and Byzantine failure models, and describe how BFT consensus tolerates malicious nodes.

**Think about:**
- What can a Byzantine node do that a crash-stopped node cannot?
- Why does BFT need 3f+1 nodes where crash-tolerant consensus needs only 2f+1?
- When is BFT justified, and when is it expensive over-engineering?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a replicated state machine that must agree on an **ordered log of operations** across some set of participants. The design question is entirely about **who those participants are** and whether any could be adversarial or compromised.

**The two models.** In the **crash-stop** model a node either follows the protocol or halts; it never lies. Raft and Paxos target this: they tolerate `f` failures with **2f+1** nodes, because any two majority quorums overlap in at least one node that carries the committed value. A crash is essentially silence, so a majority of honest survivors can proceed. In the **Byzantine** model a faulty node can **lie, equivocate** (send different values to different peers in the same round), forge messages, or **collude**. The difference that matters: a crash is passive and detectable by absence, while a Byzantine fault is *active deception*, the node keeps talking, so you cannot wait it out and cannot trust any single report.

**How BFT tolerates lies, and the 3f+1 math.** Because a single message might be a lie or an equivocation, honest nodes must cross-check each other and vote. To tolerate `f` liars you need **3f+1** total nodes and quorums of **2f+1**. That size guarantees every quorum contains at least **f+1 honest** nodes, so (a) a quorum still forms even if the `f` liars withhold votes, and (b) any two quorums overlap in at least one honest node, so honest nodes always outvote the liars and the system cannot be split into two inconsistent decisions. That is why tolerating 1 Byzantine fault needs **4** nodes, not the 3 Raft would use, and it is why BFT costs more nodes and, classically, **O(n^2)** messages. **PBFT** implements this with pre-prepare/prepare/commit phases and a view-change to depose a faulty primary; **HotStuff** cuts messaging to **linear** with threshold signatures and pipelines decisions.

**The decision.** It is a threat model call. If participants span a **trust boundary**, mutually distrusting orgs, a public network where anyone can run a node, or hardware domains with undetectable corruption, then a node can be adversarial and BFT is justified (I would reach for HotStuff for scale). If all nodes run **inside one datacenter under one operator**, the real failures are crashes, disk faults, and partitions, not malice, so **Raft plus checksums (bit rot), TLS (tampering in transit), and authentication (unauthorized actors)** covers the actual threats far more cheaply.

**Wrong turn.** Reaching for BFT or a blockchain inside a single trusted org: you pay `f` extra nodes and O(n^2) messaging (huge latency and throughput cost) to defend against malicious insiders that your trust boundary already excludes.

**Self-check rubric:**
- [ ] Contrasted crash-stop (halts, never lies) with Byzantine (lies, equivocates, colludes)
- [ ] Explained 3f+1 / 2f+1 quorums so honest nodes always overlap and outvote liars
- [ ] Gave the concrete count (4 nodes to tolerate 1) and O(n^2) message cost
- [ ] Named real protocols (PBFT view-change, HotStuff linear/pipelined)
- [ ] Framed adoption as a threat-model decision; said Raft + checksums/TLS/auth suffices in one trusted org

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose a consensus/fault-tolerance approach for a consortium payment network where 10 competing banks each run a node, must agree on a shared ledger, no single bank is trusted to be honest, and a compromised or cheating bank must not be able to forge or reorder settled transactions. Justify the node count and protocol, and contrast with what you would use if one bank operated all 10 nodes.

**Model answer (revealed on demand):**

Assumptions: 10 nodes, one per competing bank, mutually distrusting, agreeing on a shared settlement ledger, where a cheating or compromised bank must not be able to forge, double-spend, or reorder committed transactions. Finality matters (settlement must not roll back) and throughput is modest (financial settlement, not web-scale).

This is a genuine **Byzantine** setting: the participants are adversarial by construction (competitors), so any node might lie or equivocate. Crash-tolerant consensus (Raft) is disqualified because it assumes honesty; a single cheating bank could equivocate and break agreement. I use a **BFT consensus** protocol, specifically a **permissioned BFT** design like **HotStuff** (as in Diem) or Tendermint, so I get linear message complexity and pipelined, **immediate finality** (no probabilistic rollback like Nakamoto proof-of-work).

**Node count.** BFT tolerates `f` faulty nodes with `3f+1`. With 10 nodes, `3f+1 <= 10` gives `f = 3`: the network stays safe and live as long as **at most 3 of the 10 banks** are Byzantine (compromised or cheating) and at least 7 are honest. If I wanted to tolerate 3 faults with margin I would ideally run **10 or more** (10 gives exactly f=3). Quorums are `2f+1 = 7`, so every commit requires 7 signatures, guaranteeing at least 4 honest nodes in any quorum and overlap across quorums. Transactions are **signed** and hash-chained, so no node can forge another's transaction or reorder a committed block without breaking signatures/hashes.

**Why not proof-of-work?** A public blockchain's PoW gives only probabilistic finality and wastes energy; a **permissioned** consortium already knows its 10 members, so identity-based BFT with signatures is faster, cheaper, and gives instant finality, which settlement needs.

**The single-operator contrast.** If one bank owned all 10 nodes in its own datacenter, there is no adversarial trust boundary: the threat is crashes and hardware faults, not lies. I would drop BFT entirely and use **Raft (or a 5-node etcd/Spanner-style group)** plus **checksums, TLS, and authentication**, tolerating `f` crashes with `2f+1`. That is dramatically cheaper in nodes, latency, and messaging. The wrong turn is running BFT or a blockchain for a single trusted operator: paying for Byzantine resilience against a threat that operator boundary already excludes.
