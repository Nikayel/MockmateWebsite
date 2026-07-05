> Module **sd-l5-m1** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l4-m4](./sd-l4-m4.md) · Next: [sd-l5-m2](./sd-l5-m2.md)

# L5 · Failure Models & CAP

After this module you can reason about a distributed system the way a staff engineer does: you know why a timeout tells you almost nothing, you can frame CAP correctly as a per-partition choice instead of a permanent pick-2-of-3, and you can place real databases (DynamoDB, Cassandra, Spanner, CockroachDB) on the PACELC spectrum and name the latency tax each consistency choice charges on every request.

### sd-l5-partial-failure: Partial Failure & the Fallacies of Distributed Computing

- **id:** `sd-l5-partial-failure`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** fallacies, partial-failure

#### Learn

A single program has one failure mode a programmer really cares about: it crashes, and everything stops together. A distributed system does not have an off switch. Some nodes and links fail while the rest keep running, and that is **partial failure**. Node A is healthy, node B is on fire, the network between them is dropping 3% of packets, and no component has a global view of any of this. Every hard result in distributed systems descends from this one fact.

The sharpest consequence lives in a single primitive: the network call. When service A sends a request to service B and starts a timer, exactly one of these happened when the timer expires, and **A cannot tell which**:

1. The request never reached B (lost on the way out). B did nothing.
2. B received it, did the work, and the response was lost on the way back. B did the work.
3. B is just slow (GC pause, overloaded, 200ms of queueing) and the response is still coming.
4. B crashed before, during, or after the work.

This is the ambiguity of a timeout. It is the whole reason distributed systems are hard. A timeout is not "B failed." It is "I have no idea what B did." If A retries after case 2, B performs the side effect twice. If A gives up after case 1 when the write actually needed to happen, data is lost.

The **fallacies of distributed computing** (Deutsch, Gosling, at Sun) are the false assumptions that make people write code that ignores the four outcomes above. The load-bearing ones: the network is reliable (it is not, packets drop), latency is zero (a cross-region round trip is 60 to 150ms), bandwidth is infinite (fan-out saturates links), topology is static (nodes and routes change constantly), and transport cost is zero (serialization and TLS are real CPU). Believing any of these produces a system that works in the demo and falls over in production.

Theory pins this down. In a fully **asynchronous** model (unbounded message delay, no clocks) you cannot even reliably tell a dead node from a slow one, which is why consensus is impossible there (FLP). Real systems assume **partial synchrony**: delays are usually bounded but occasionally are not, and clocks drift. That "occasionally not" is exactly where split-brain and lost writes hide.

**Interview nuance:** the single most common junior mistake is treating a timeout as a definite failure and re-issuing a side effect, causing a double charge or duplicate order. The senior answer is: make the operation **idempotent** (idempotency key, dedup on the receiver) so a retry is safe regardless of which of the four outcomes actually happened. Then retries become a correctness-preserving tool instead of a bug.

The design implication is that every remote interaction must assume the worst: requests get retried (so handle **duplicates**), messages arrive out of order (so handle **reordering**), and reads can be **stale**. You do not sprinkle this in later; it is the baseline contract of talking over a network.

```
   A ---- request ----> B      timeout fires. which one?
   A <--- response ---- B      (1) req lost   (2) resp lost
                               (3) B slow     (4) B dead
   A cannot distinguish them from A's side.
```

Recap: partial failure means parts fail independently with no global off switch, a timeout is fundamentally ambiguous (lost request, lost response, slow peer, or dead peer, indistinguishable to the caller), the fallacies of distributed computing are the false assumptions that ignore this, and the fix is to design every call for retries, reordering, duplication, and stale reads, made safe by idempotency.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write a failure-mode analysis for a service A calling service B over the network: enumerate every outcome A can observe and how A should react to each.

**Think about:**
- Why can A not distinguish a lost request from a slow or dead peer?
- Which fallacies of distributed computing bite here?
- What must every call handle: retries, reordering, duplication, stale reads?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: A calls B synchronously over HTTP/gRPC, B performs a side effect (say, "charge $20"), and A has a request timeout of, say, 500ms. The network is partially synchronous: usually fast, occasionally not.

From A's vantage point there are exactly three observable results, and the failure ones are ambiguous. **Success:** A gets a 2xx before the timeout, and A knows B did the work. **Explicit error:** A gets a 5xx or a connection refused, which is honest but still does not always tell A whether the side effect ran (a 500 can fire after the charge committed). **Timeout / no response:** the hard case. This collapses four physically distinct events into one observation, request lost (B did nothing), response lost (B did the work), B slow (work still in flight), or B dead. A genuinely cannot distinguish them, because the only signal A has is the absence of a reply, and absence looks identical in all four.

So the reaction cannot be "assume failure" or "assume success." It has to be **retry with idempotency**. A attaches an idempotency key to the request. On timeout or 5xx, A retries the same key. B deduplicates on that key so a replayed "charge $20" charges once. This makes A safe under all four outcomes: if the first attempt actually succeeded, the retry is a no-op; if it failed, the retry does the work. A bounds retries (say 3 attempts) with exponential backoff plus jitter to avoid stampeding B, and after exhaustion routes to a dead-letter queue or a compensating action rather than looping forever.

The fallacies that bite here: **network is reliable** (drops cause outcomes 1 and 2), **latency is zero** (slowness causes outcome 3 and forces the timeout choice), and **topology is static** (B's instances come and go, so "B" is really a changing set behind a load balancer). Beyond retries, A must handle **reordering** (retry N+1 can land before a delayed attempt N, so B orders by key/sequence, not arrival), **duplication** (the dedup above), and **stale reads** (if A reads B's state right after, replication lag can show old data, so A does not treat a read as confirmation of its own write).

Common wrong turn: treating the timeout as a definite failure and re-charging, producing a double charge. The whole discipline is: ambiguous outcome plus idempotent retry equals correctness.

**Self-check rubric:**
- [ ] Did you enumerate success, explicit error, and timeout, and call the timeout ambiguous across 4 physical causes?
- [ ] Did you prescribe idempotency keys plus bounded retries with backoff and jitter, not just "retry"?
- [ ] Did you name at least three specific fallacies and tie each to a concrete outcome?
- [ ] Did you address reordering, duplication, and stale reads explicitly?
- [ ] Did you flag the double-side-effect wrong turn?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the client-side failure handling for a mobile checkout calling Stripe's payment API at 2,000 requests/second, where the app is on flaky cellular networks and a duplicate charge is a Sev-1 incident. Enumerate the outcomes the app observes and the exact mechanism that prevents a second charge.

**Model answer (revealed on demand):**

Assumptions: the mobile client submits a payment, cellular RTT swings from 80ms to several seconds, connections drop mid-request, and the app aggressively retries because users tap "Pay" again when a spinner hangs. At 2,000 rps a 1% ambiguous-timeout rate is 20 potential double-charge events per second, so this must be structurally safe, not best-effort.

Mechanism: generate an **idempotency key** per checkout attempt on the client (a UUID tied to the cart, not regenerated on retry), and send it as Stripe's `Idempotency-Key` header. Stripe stores the result of the first request under that key for 24 hours and returns the identical response to any replay, so a lost-response retry (outcome 2) and a user double-tap both collapse to a single charge. The key must be stable across retries; regenerating it per attempt defeats the entire mechanism and is the classic wrong turn here.

Observable outcomes and reactions. **2xx:** persist the charge id locally, done. **4xx (card declined, bad key):** terminal, show the user, do not retry. **Timeout / connection dropped:** ambiguous, retry the same idempotency key with exponential backoff and jitter, capped at maybe 4 attempts over ~30s, keeping the spinner honest. **Network offline:** queue the attempt durably on device and replay when connectivity returns, still with the same key, so an offline-then-online transition cannot double charge.

On reordering: because the key is per checkout, out-of-order retries are harmless; Stripe resolves them to one outcome. On the server side of your own backend, record the Stripe charge id under the cart id with a unique constraint so even an application-level replay cannot create two orders. The load-bearing insight is that correctness comes from the idempotency key end to end (client generates, Stripe dedups, your DB uniquely constrains), not from trying to make the flaky network reliable, which is impossible.

### sd-l5-cap-correct: CAP Theorem (Correct Framing)

- **id:** `sd-l5-cap-correct`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** cap, consistency, partition

#### Learn

CAP is the most misquoted result in system design. The folklore version, "pick 2 of Consistency, Availability, Partition-tolerance," is wrong in a way that will sink an interview. The correct statement, from Gilbert and Lynch's proof of Brewer's conjecture, is much narrower: **when a network partition occurs, a system must choose between consistency and availability.** That is it. CAP says nothing about normal operation, and it is not a permanent three-way menu.

Start with what the letters actually mean, because the folklore blurs them.

- **C (Consistency)** in CAP is **linearizability**: there is a single, up-to-date copy of the data, and every read sees the most recent completed write in real-time order. This is far stronger than "the database doesn't corrupt data." It means no stale reads, ever.
- **A (Availability)** means **every request to a non-failing node gets a non-error response**, eventually. A node that returns "try again later" or refuses the write is not available in the CAP sense, even though the process is up.
- **P (Partition tolerance)** means the system keeps operating when the network drops or delays messages between nodes.

Here is why "pick 2" is nonsense: **P is not optional.** Networks partition. Cables get cut, switches reboot, a cross-region link saturates, a security group changes. You do not get to choose a world without partitions, so you cannot "give up P" to keep C and A. That means **CA is not a real operating point** for any system that spans more than one machine. A single-node database is trivially "CA" only because it has no network to partition, and calling it CA is the tell that someone learned CAP from a slide, not the proof.

So the real decision, and the only one CAP forces, happens **during a partition.** Two nodes that cannot talk each get a write. They cannot both accept it and stay consistent, because their copies would diverge. So:

- A **CP** system sacrifices availability during the partition: the minority side (or both sides) **refuses** writes it cannot safely coordinate, returning errors, to guarantee it never serves or accepts inconsistent data. Examples: ZooKeeper, etcd, HBase, a leader-based store where the minority steps down.
- An **AP** system sacrifices consistency: **both sides accept** the write and reconcile later (last-writer-wins, CRDTs, or surfacing siblings). Examples: DynamoDB, Cassandra, Riak in their default modes.

**Interview nuance:** the strongest candidates immediately add that real systems are **not globally CP or AP.** Consistency is usually **tunable per operation or per key.** Cassandra lets you pick consistency level `ONE` (AP-ish) or `QUORUM`/`ALL` (CP-ish) on each query. DynamoDB offers eventually consistent reads (cheap, AP-flavored) or strongly consistent reads (a leader round trip, CP-flavored). So "is X CP or AP?" is often the wrong question; the right one is "what does X do to *this* operation during a partition?"

```
             partition!
   client -> [ node1 ] --X-- [ node2 ] <- client
                 |                 |
   CP: node2 (minority) refuses -> availability lost, C kept
   AP: both accept, reconcile later -> A kept, C lost
   CA: not an option; P is a fact of nature
```

Recap: CAP is a forced choice **only during a partition** between linearizable consistency and availability, P is non-negotiable so CA is not a real operating point, C means linearizability and A means every non-failing node answers, and most production systems are tunable per operation rather than globally CP or AP.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Decide CP vs AP behavior for a globally-replicated shopping cart during a cross-region partition and justify the user-visible consequence of each choice.

**Think about:**
- Why is CA not a real operating point?
- What exactly do C and A mean in CAP?
- Why are most systems tunable/mixed rather than globally CP or AP?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: a shopping cart replicated across US and EU regions for latency and durability. A user in the US adds items; the cart may also be touched from another device or a background sync. During a partition, the US and EU replicas cannot exchange writes. I must decide what the cart does while the link is down.

First, CA is off the table. The system spans two regions connected by a network that will partition (transatlantic links degrade, BGP flaps happen), so P is a fact, not a dial. The only real choice is CP or AP during the partition.

For a cart, I choose **AP**, and I would defend it hard. C in CAP means linearizability (a single up-to-date copy, no stale reads), and A means every non-failing region still answers. If I went **CP**, the minority region would **reject writes** during the partition: the user clicks "Add to cart" and gets an error or a spinner. For a cart, that is a terrible outcome, it directly costs conversion, and the data is not safety-critical the way a bank ledger is. So I keep the cart **available**: both regions accept "add item" writes locally and reconcile when the partition heals. The user-visible consequence of AP is a **stale or divergent cart**: the same cart edited on two sides may temporarily show different contents, and after healing the merge must resolve them.

The reconciliation is the real design work. A cart is close to an **add/remove set**, so I model it as a CRDT (an OR-Set) or track per-item add/remove with causal metadata, so a concurrent "add socks" in the US and "add shoes" in the EU **merge to a union** rather than one clobbering the other via naive last-writer-wins. The one place I flip to stronger guarantees is **checkout/payment**: there I do not want AP. At checkout I route to a single authoritative region or use a CP path (quorum write) so I never double-charge or oversell, accepting that checkout can fail during a partition where cart edits do not. This is exactly the "tunable per operation" point: the cart is AP, the purchase is CP, in the same product.

Common wrong turn: calling this system "CA," or claiming a global "the cart is a CP system." The honest framing is per-operation, and it names linearizability vs availability precisely rather than hand-waving "consistency."

**Self-check rubric:**
- [ ] Did you rule out CA by arguing P is unavoidable across regions?
- [ ] Did you define C as linearizability and A as every non-failing node answering?
- [ ] Did you pick AP for cart edits with a concrete conversion/UX justification?
- [ ] Did you specify reconciliation (CRDT / OR-Set / union merge), not just "merge later"?
- [ ] Did you flip to CP for checkout, showing per-operation tunability?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose CP or AP for a hotel-booking inventory system (like Booking.com) holding the last room in a hotel during a partition between the booking service's two data centers, and justify the choice against the cart decision you just made.

**Model answer (revealed on demand):**

Assumptions: inventory tracks a finite, oversell-sensitive resource (the last available room). Two data centers each receive a booking request for that room during a partition. The business cost structure is the opposite of a cart: a rejected booking is a lost sale (recoverable, the user tries another hotel), but an **oversell** is a real-world failure (a guest arrives to no room, a refund, a compensation, brand damage, possibly legal).

I choose **CP** for the "commit the last unit" operation. C here is linearizability on the seat/room count: there must be a single authoritative decrement so two data centers cannot both sell unit-of-inventory number one. During the partition, the side that cannot reach the authority (or cannot form a quorum) **refuses to confirm** the booking, sacrificing availability for that operation. The user-visible consequence is that some booking attempts fail or fall back to "on request" during the partition, which is acceptable because a failed booking is far cheaper than an oversell. This is the deliberate inverse of the cart: same CAP machinery, opposite choice, because the cost of inconsistency flipped.

Mechanics: hold inventory in a **CP store** (a leader-based or consensus-backed system such as a Spanner/CockroachDB row, or a single-leader Postgres with the count behind a quorum) and perform the decrement as a **conditional/compare-and-set** write (`UPDATE rooms SET available = available - 1 WHERE available > 0`). During a partition, only the majority/leader side can commit; the minority side returns "unavailable" rather than risk a phantom sale.

Nuance that scores points: not all inventory is scarce. For a hotel with 200 rooms and 3 booked, I can run **AP** and reconcile, because the odds of a true conflict are negligible and availability is worth more. The CP tax should apply only to the **scarce tail** (near-sold-out inventory). So the mature design is tunable by scarcity: AP when plentiful, CP when down to the last few units, which optimizes availability without ever overselling the resource that actually matters.

### sd-l5-pacelc: PACELC & the Steady-State Tradeoff

- **id:** `sd-l5-pacelc`  ·  **difficulty:** hard  ·  **est:** 30 min  ·  **skills:** pacelc, consistency, latency

#### Learn

CAP has a blind spot: it only describes behavior **during a partition**, which is a rare event. It says nothing about the tradeoff you pay on every single request in the 99.99% of time when the network is fine. **PACELC** (Abadi) fills that hole. Read it as: **if Partition (P), choose Availability or Consistency (A/C); Else (E), choose Latency or Consistency (L/C).** The first half is just CAP. The second half, the **ELC** part, is the one that actually shapes your latency budget day to day.

The else-case insight: **strong consistency is not free even when nothing is broken.** To guarantee a linearizable read or write, a system must coordinate, and coordination is round trips. Concretely:

- A **linearizable write** must reach a majority **quorum** (or a single leader that then replicates to a quorum) before acknowledging. In a 3-region deployment, that quorum round trip can add **tens to over a hundred milliseconds** to every write, because you wait for the second-fastest region to confirm.
- A **linearizable read** cannot just read the nearest replica, because that replica might be stale. It must either go to the **leader** (a round trip, possibly cross-region) or read from a **quorum** and take the newest value. Either way you pay latency to be sure you are not reading the past.

That is the ELC tax. A system that chooses **EL** (latency over consistency in the normal case) answers from the nearest replica immediately and risks a stale read. A system that chooses **EC** (consistency over latency) pays the coordination round trip on every strongly-consistent operation. This is a real, measurable tail-latency cost, not a philosophical one.

Placing the major stores on the full PACELC spectrum:

- **DynamoDB: PA/EL.** During a partition it favors availability; normally it favors latency, serving eventually-consistent reads from the nearest copy. (It offers an opt-in strongly-consistent read, which is the per-operation EC lever.)
- **Cassandra: PA/EL.** Available under partition, low-latency by default, with **per-query tunable consistency** (`ONE` is EL, `QUORUM`/`ALL` push toward EC). Its "any" default is the classic PA/EL posture.
- **Spanner: PC/EC.** During a partition it stays consistent (minority steps down), and even normally it pays the price of consistency: TrueTime commit-wait and Paxos quorum round trips add latency to every commit to guarantee external consistency.
- **CockroachDB: PC/EC.** Same posture as Spanner via Raft per-range and a hybrid-logical-clock scheme: strongly consistent, and it pays quorum latency to be so.
- **PA/EC** also exists (some tunable stores): available under partition but preferring consistency when healthy.

**Interview nuance:** the mistake that reads as junior is reasoning **only about partitions** and forgetting the else-case. If you say "we'll use strong consistency, partitions are rare so it's cheap," you have missed that strong consistency taxes **every** request, partition or not. The staff-level move is to connect it to an **SLO**: "our read p99 budget is 20ms and we serve from three regions, so I cannot afford a cross-region quorum on the read path; I choose EL (nearest-replica reads) and layer session guarantees for the cases that need read-your-writes." That sentence ties a latency budget to a consistency choice, which is exactly what PACELC is for.

```
   PACELC:  if P -> (A or C)   |   else E -> (L or C)
   ------------------------------------------------
   DynamoDB    PA / EL     nearest-copy read, may be stale
   Cassandra   PA / EL     tunable: ONE=EL, QUORUM=EC
   Spanner     PC / EC     quorum + commit-wait on every commit
   CockroachDB PC / EC     Raft quorum per range
```

Recap: PACELC extends CAP with the else-case, the latency-vs-consistency tax you pay on every request even with no partition, because linearizable reads and writes need leader or quorum round trips (tens of ms cross-region); DynamoDB and Cassandra are PA/EL (fast, may be stale, tunable per operation) while Spanner and CockroachDB are PC/EC (consistent, and they pay quorum latency to be so), and the senior move is tying the L-vs-C choice to a concrete latency SLO.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Classify DynamoDB, Cassandra, Spanner, and CockroachDB on the PACELC spectrum and explain what each choice costs a request in the no-partition case.

**Think about:**
- What does the else-case (no partition) tradeoff cost per request?
- Why do linearizable reads need a leader round-trip or read quorum?
- How is consistency often per-operation tunable?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: all four run multi-region or at least multi-AZ, so coordination has real network cost, and I care about read/write p99, not just the partition edge case.

**DynamoDB: PA/EL.** Under partition it favors availability. In the normal case (Else) it favors Latency: a default read is eventually consistent and served from the nearest replica, so it costs one local hop (single-digit ms) but can return a stale value. The lever is per-operation: request a **strongly-consistent read** and you flip that operation to EC, paying a round trip to the item's leader replica, roughly doubling read latency, in exchange for freshness. So the ELC cost is explicit and chosen per call.

**Cassandra: PA/EL.** Available under partition, and low latency by default. The ELC cost is fully **tunable per query** via consistency level. `ONE` reads/writes from a single replica (EL, fastest, may be stale) while `QUORUM` waits for a majority of replicas across the ring (EC-leaning, higher latency), and `ALL` waits for every replica (strongest, worst tail, fragile to one slow node). So a single cluster spans the ELC spectrum, and the cost is however many replicas you make the request block on.

**Spanner: PC/EC.** Under partition it keeps consistency (the minority loses the ability to commit). In the normal case it still chooses Consistency over Latency: every read-write transaction goes through **Paxos** to a majority of replicas and then does **TrueTime commit-wait**, deliberately waiting out the clock-uncertainty epsilon (a few ms) so timestamps are externally consistent. The per-request cost is a quorum round trip (cross-region if replicas are spread) plus commit-wait on writes, which is why Spanner writes are tens of ms, not sub-ms. It offers stale/bounded-staleness reads as the escape hatch when you want to trade freshness for latency.

**CockroachDB: PC/EC.** Same posture, different plumbing: each range is replicated by **Raft**, writes need a quorum ack, and it uses hybrid logical clocks (no atomic-clock hardware) so it sometimes restarts transactions under uncertainty instead of commit-waiting. Cost per strongly-consistent request is the Raft quorum round trip to the range leaseholder, again tens of ms cross-region.

Why linearizable reads cost a round trip: the nearest replica may not have applied the latest committed write yet, so reading it locally can return the past. To be linearizable you must confirm you have the newest value, which means going to the leader/leaseholder (which knows the latest) or reading a quorum and taking the max, and either one is a coordination hop you cannot skip.

Common wrong turn: reasoning only about the partition column and ignoring the ELC tax, then being surprised that a "strongly consistent" store has 40ms writes when the network is perfectly healthy.

**Self-check rubric:**
- [ ] Did you give both letters for each system (Dynamo PA/EL, Cassandra PA/EL, Spanner PC/EC, Cockroach PC/EC)?
- [ ] Did you quantify the else-case cost (local hop vs quorum/leader round trip, tens of ms cross-region)?
- [ ] Did you explain why a linearizable read cannot just read the nearest replica?
- [ ] Did you show per-operation tunability (Dynamo strong read, Cassandra ONE/QUORUM/ALL)?
- [ ] Did you name the mechanisms (Paxos + commit-wait for Spanner, Raft for Cockroach)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Design the datastore choice for a multi-region social feed's two hardest operations, the write of a new post and the read of a user's home timeline, at 50,000 writes/second with a 30ms read p99 SLO across US, EU, and APAC. Pick the PACELC posture for each operation and justify it against the SLO.

**Model answer (revealed on demand):**

Assumptions: 3 regions, users read mostly their own region, a 30ms read p99 budget, and the product tolerates a home timeline being a second or two stale but does not tolerate a post silently vanishing.

The read path (home timeline) is the SLO-binding one. A cross-region quorum read is physically impossible under 30ms when US-to-EU RTT alone is ~80ms. So the timeline read must be **EL**: serve from the nearest regional replica, accepting eventual consistency. I would back the fan-out/timeline store with a **PA/EL** store (Cassandra or DynamoDB) replicated per region, so a Tokyo user reads from the APAC replica in single-digit ms. The cost, occasional staleness (a just-posted item missing for a second), is acceptable for a feed, and I patch the one case users notice (their own new post not appearing) with a **read-your-writes** session guarantee: route the author's own timeline read through their home region or merge their recent writes client-side, rather than making the whole feed strongly consistent.

The write path (create post) has a different priority: durability and no lost writes matter more than raw latency, and 50k writes/s must not bottleneck on a global quorum. I make the post write **local-region durable first** (quorum within the author's region, which is a few ms, not cross-continent) and replicate asynchronously to the other regions. That is still PA/EL globally: I do not block the user's post on an APAC ack. If the product had an operation that truly needed global linearizability (say, username uniqueness at signup), I would carve **that** operation out to a PC/EC store (Spanner or a CockroachDB table) and let it eat the cross-region quorum latency, because it is rare and correctness-critical, while keeping the high-volume feed on the PA/EL path.

The load-bearing point: I did not pick one database for the product. I picked a **PACELC posture per operation**, EL for the hot feed reads and regional writes to hit the SLO, EC only for the rare global-uniqueness case, which is exactly how real multi-region systems reconcile a tight latency budget with correctness where it counts.
