/**
 * System Design — Level 5: Distributed Systems Core.
 *
 * Authored by AGENT-2 from `docs/system-design-curriculum/content/sd-l5-m*.md` with lesson ids
 * verbatim from `docs/system-design-curriculum/curriculum-map.json` §L5. 18 lessons across 5
 * modules (sd-l5-m1..m5). Same lesson shape as the earlier levels: `apply` and `practice` are
 * both required by `TutorialLesson<E>`; the player completes them together (one design write per
 * lesson), with `practice` authored as a harder real-world variant.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const partialFailureTeach = `
## No global off switch

A single program has one failure mode a programmer really cares about: it crashes, and everything
stops together. A distributed system does not have an off switch. Some nodes and links fail while the
rest keep running, and that is **partial failure**. Node A is healthy, node B is on fire, the network
between them is dropping 3% of packets, and no component has a global view of any of this. Every hard
result in distributed systems descends from this one fact.

### The ambiguity of a timeout

When service A sends a request to service B and starts a timer, exactly one of these happened when
the timer expires, and **A cannot tell which**:

1. The request never reached B (lost on the way out). B did nothing.
2. B received it, did the work, and the response was lost on the way back. B did the work.
3. B is just slow (GC pause, overloaded, 200ms of queueing) and the response is still coming.
4. B crashed before, during, or after the work.

A timeout is not "B failed." It is "I have no idea what B did." If A retries after case 2, B performs
the side effect twice. If A gives up after case 1 when the write actually needed to happen, data is
lost.

### The fallacies of distributed computing

The fallacies (Deutsch, Gosling, at Sun) are the false assumptions that make people write code that
ignores the four outcomes above. The load-bearing ones: the network is reliable (it is not), latency
is zero (a cross-region round trip is 60 to 150ms), bandwidth is infinite (fan-out saturates links),
topology is static (nodes and routes change constantly), and transport cost is zero (serialization
and TLS are real CPU). Believing any of these produces a system that works in the demo and falls over
in production.

Theory pins this down. In a fully **asynchronous** model (unbounded message delay, no clocks) you
cannot even reliably tell a dead node from a slow one, which is why consensus is impossible there
(FLP). Real systems assume **partial synchrony**: delays are usually bounded but occasionally are
not, and clocks drift. That "occasionally not" is exactly where split-brain and lost writes hide.

**Interview nuance:** the single most common junior mistake is treating a timeout as a definite
failure and re-issuing a side effect, causing a double charge or duplicate order. The senior answer:
make the operation **idempotent** (idempotency key, dedup on the receiver) so a retry is safe
regardless of which of the four outcomes actually happened. Then retries become a
correctness-preserving tool instead of a bug.

The design implication: every remote interaction must assume the worst. Requests get retried (so
handle **duplicates**), messages arrive out of order (so handle **reordering**), and reads can be
**stale**. This is the baseline contract of talking over a network, not something you sprinkle in
later.

\`\`\`
   A ---- request ----> B      timeout fires. which one?
   A <--- response ---- B      (1) req lost   (2) resp lost
                               (3) B slow     (4) B dead
   A cannot distinguish them from A's side.
\`\`\`

Recap: partial failure means parts fail independently with no global off switch, a timeout is
fundamentally ambiguous (lost request, lost response, slow peer, or dead peer), the fallacies of
distributed computing are the false assumptions that ignore this, and the fix is to design every call
for retries, reordering, duplication, and stale reads, made safe by idempotency.
`.trim()

const capCorrectTeach = `
## The most misquoted result in system design

The folklore version of CAP, "pick 2 of Consistency, Availability, Partition-tolerance," is wrong in
a way that will sink an interview. The correct statement, from Gilbert and Lynch's proof of Brewer's
conjecture, is much narrower: **when a network partition occurs, a system must choose between
consistency and availability.** That is it. CAP says nothing about normal operation, and it is not a
permanent three-way menu.

### What the letters actually mean

- **C (Consistency)** in CAP is **linearizability**: there is a single, up-to-date copy of the data,
  and every read sees the most recent completed write in real-time order. Far stronger than "the
  database doesn't corrupt data." It means no stale reads, ever.
- **A (Availability)** means **every request to a non-failing node gets a non-error response**,
  eventually. A node that returns "try again later" or refuses the write is not available in the CAP
  sense, even though the process is up.
- **P (Partition tolerance)** means the system keeps operating when the network drops or delays
  messages between nodes.

Here is why "pick 2" is nonsense: **P is not optional.** Networks partition. Cables get cut, switches
reboot, a cross-region link saturates. You do not get to choose a world without partitions, so you
cannot "give up P" to keep C and A. That means **CA is not a real operating point** for any system
that spans more than one machine. A single-node database is trivially "CA" only because it has no
network to partition, and calling it CA is the tell that someone learned CAP from a slide, not the
proof.

### The real decision, during a partition

Two nodes that cannot talk each get a write. They cannot both accept it and stay consistent, because
their copies would diverge. So:

- A **CP** system sacrifices availability during the partition: the minority side (or both sides)
  **refuses** writes it cannot safely coordinate, returning errors, to guarantee it never serves or
  accepts inconsistent data. Examples: ZooKeeper, etcd, HBase, a leader-based store where the
  minority steps down.
- An **AP** system sacrifices consistency: **both sides accept** the write and reconcile later
  (last-writer-wins, CRDTs, or surfacing siblings). Examples: DynamoDB, Cassandra, Riak in their
  default modes.

**Interview nuance:** the strongest candidates immediately add that real systems are **not globally
CP or AP.** Consistency is usually **tunable per operation or per key.** Cassandra lets you pick
consistency level ONE (AP-ish) or QUORUM/ALL (CP-ish) on each query. DynamoDB offers eventually
consistent reads (cheap) or strongly consistent reads (a leader round trip). So "is X CP or AP?" is
often the wrong question; the right one is "what does X do to *this* operation during a partition?"

\`\`\`
             partition!
   client -> [ node1 ] --X-- [ node2 ] <- client
                 |                 |
   CP: node2 (minority) refuses -> availability lost, C kept
   AP: both accept, reconcile later -> A kept, C lost
   CA: not an option; P is a fact of nature
\`\`\`

Recap: CAP is a forced choice **only during a partition** between linearizable consistency and
availability, P is non-negotiable so CA is not a real operating point, C means linearizability and A
means every non-failing node answers, and most production systems are tunable per operation rather
than globally CP or AP.
`.trim()

const pacelcTeach = `
## CAP's blind spot: the other 99.99% of the time

CAP only describes behavior **during a partition**, which is a rare event. It says nothing about the
tradeoff you pay on every single request when the network is fine. **PACELC** (Abadi) fills that
hole. Read it as: **if Partition (P), choose Availability or Consistency (A/C); Else (E), choose
Latency or Consistency (L/C).** The first half is just CAP. The second half, the **ELC** part, is the
one that actually shapes your latency budget day to day.

### The else-case insight: strong consistency is never free

To guarantee a linearizable read or write, a system must coordinate, and coordination is round trips:

- A **linearizable write** must reach a majority **quorum** (or a single leader that then replicates
  to a quorum) before acknowledging. In a 3-region deployment, that quorum round trip can add **tens
  to over a hundred milliseconds** to every write, because you wait for the second-fastest region.
- A **linearizable read** cannot just read the nearest replica, because that replica might be stale.
  It must either go to the **leader** (a round trip, possibly cross-region) or read from a **quorum**
  and take the newest value.

That is the ELC tax. A system that chooses **EL** (latency over consistency in the normal case)
answers from the nearest replica immediately and risks a stale read. A system that chooses **EC**
pays the coordination round trip on every strongly-consistent operation. A real, measurable
tail-latency cost, not a philosophical one.

### The major stores on the spectrum

- **DynamoDB: PA/EL.** Available under partition; normally favors latency, serving
  eventually-consistent reads from the nearest copy, with an opt-in strongly-consistent read as the
  per-operation EC lever.
- **Cassandra: PA/EL.** Available under partition, low-latency by default, with per-query tunable
  consistency (ONE is EL, QUORUM/ALL push toward EC).
- **Spanner: PC/EC.** Consistent during a partition (minority steps down), and even normally it pays
  for consistency: TrueTime commit-wait and Paxos quorum round trips on every commit.
- **CockroachDB: PC/EC.** Same posture via Raft per-range and hybrid logical clocks: strongly
  consistent, paying quorum latency to be so.
- **PA/EC** also exists (some tunable stores): available under partition but preferring consistency
  when healthy.

**Interview nuance:** the mistake that reads as junior is reasoning **only about partitions**. If you
say "we'll use strong consistency, partitions are rare so it's cheap," you have missed that strong
consistency taxes **every** request. The staff-level move ties it to an **SLO**: "our read p99 budget
is 20ms and we serve from three regions, so I cannot afford a cross-region quorum on the read path; I
choose EL (nearest-replica reads) and layer session guarantees for the cases that need
read-your-writes."

\`\`\`
   PACELC:  if P -> (A or C)   |   else E -> (L or C)
   ------------------------------------------------
   DynamoDB    PA / EL     nearest-copy read, may be stale
   Cassandra   PA / EL     tunable: ONE=EL, QUORUM=EC
   Spanner     PC / EC     quorum + commit-wait on every commit
   CockroachDB PC / EC     Raft quorum per range
\`\`\`

Recap: PACELC extends CAP with the else-case, the latency-vs-consistency tax paid on every request
even with no partition, because linearizable reads and writes need leader or quorum round trips;
DynamoDB and Cassandra are PA/EL while Spanner and CockroachDB are PC/EC, and the senior move is
tying the L-vs-C choice to a concrete latency SLO.
`.trim()

export const systemDesignLevel5: DesignLevel = {
  id: 5,
  slug: "distributed-core",
  title: "Level 5 — Distributed Systems Core",
  tagline:
    "CAP/PACELC, consistency, clocks, consensus, distributed transactions, and failure handling.",
  estimatedHours: 9,
  modules: [
    {
      id: "sd-l5-m1",
      title: "Failure Models & CAP",
      description:
        "Reason like a staff engineer: why a timeout tells you almost nothing, CAP as a per-partition choice rather than pick-2-of-3, and real databases placed on the PACELC spectrum with their latency tax named.",
      lessons: [
        {
          id: "sd-l5-partial-failure",
          title: "Partial Failure & the Fallacies of Distributed Computing",
          summary:
            "A timeout is fundamentally ambiguous across four physical outcomes, so every call must be designed for retries, reordering, duplication, and stale reads via idempotency.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["fallacies", "partial-failure"],
          teach: {
            markdown: partialFailureTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-partial-failure-apply",
            prompt:
              "Write a failure-mode analysis for a service A calling service B over the network: enumerate every outcome A can observe and how A should react to each.",
            thinkAbout: [
              "Why can A not distinguish a lost request from a slow or dead peer?",
              "Which fallacies of distributed computing bite here?",
              "What must every call handle: retries, reordering, duplication, stale reads?",
            ],
            modelAnswerOutline: [
              "Assumptions: A calls B synchronously over HTTP/gRPC, B performs a side effect ('charge $20'), A has a 500ms timeout, and the network is partially synchronous: usually fast, occasionally not.",
              "**Three observable results, with the failure ones ambiguous.** Success: a 2xx before the timeout, A knows B did the work. Explicit error: a 5xx or connection refused, honest but still not always telling A whether the side effect ran (a 500 can fire after the charge committed). Timeout / no response: the hard case, collapsing four physically distinct events into one observation: request lost (B did nothing), response lost (B did the work), B slow (work in flight), or B dead. A genuinely cannot distinguish them: absence of a reply looks identical in all four.",
              "**The reaction cannot be 'assume failure' or 'assume success': it is retry with idempotency.** A attaches an idempotency key; on timeout or 5xx it retries the same key; B deduplicates so a replayed 'charge $20' charges once. Safe under all four outcomes: if the first attempt succeeded, the retry is a no-op; if it failed, the retry does the work. Bound retries (say 3 attempts) with exponential backoff plus jitter, and after exhaustion route to a dead-letter queue or compensating action rather than looping forever.",
              "**The fallacies that bite:** the network is reliable (drops cause outcomes 1 and 2), latency is zero (slowness causes outcome 3 and forces the timeout choice), topology is static (B's instances come and go behind a load balancer).",
              "**Beyond retries:** handle reordering (retry N+1 can land before a delayed attempt N, so B orders by key/sequence, not arrival), duplication (the dedup above), and stale reads (replication lag means A must not treat a read of B's state as confirmation of its own write).",
              "Common wrong turn: treating the timeout as a definite failure and re-charging, producing a double charge. The whole discipline: ambiguous outcome plus idempotent retry equals correctness.",
            ],
          },
          practice: {
            id: "sd-l5-partial-failure-practice",
            prompt:
              "Design the client-side failure handling for a mobile checkout calling Stripe's payment API at 2,000 requests/second, where the app is on flaky cellular networks and a duplicate charge is a Sev-1 incident. Enumerate the outcomes the app observes and the exact mechanism that prevents a second charge.",
            thinkAbout: [
              "What must be stable across retries for the idempotency mechanism to work at all?",
              "How does the app behave when fully offline mid-checkout?",
              "Where does your own backend add a second line of dedup defense?",
            ],
            modelAnswerOutline: [
              "Assumptions: cellular RTT swings from 80ms to seconds, connections drop mid-request, users tap 'Pay' again when a spinner hangs. At 2,000 rps a 1% ambiguous-timeout rate is 20 potential double-charge events per second, so this must be structurally safe.",
              "**Mechanism:** generate an idempotency key per checkout attempt on the client (a UUID tied to the cart, NOT regenerated on retry) and send it as Stripe's Idempotency-Key header. Stripe stores the first request's result under that key for 24 hours and returns the identical response to any replay, so a lost-response retry and a user double-tap both collapse to a single charge. Regenerating the key per attempt defeats the entire mechanism: the classic wrong turn.",
              "**Outcomes and reactions:** 2xx: persist the charge id locally, done. 4xx (card declined, bad key): terminal, show the user, do not retry. Timeout / connection dropped: ambiguous, retry the same key with exponential backoff and jitter, capped (~4 attempts over ~30s). Network offline: queue the attempt durably on device and replay when connectivity returns, still with the same key, so offline-then-online cannot double charge.",
              "**Reordering:** because the key is per checkout, out-of-order retries are harmless; Stripe resolves them to one outcome.",
              "**The backend's second line of defense:** record the Stripe charge id under the cart id with a unique constraint, so even an application-level replay cannot create two orders.",
              "The load-bearing insight: correctness comes from the idempotency key end to end (client generates, Stripe dedups, your DB uniquely constrains), not from trying to make the flaky network reliable, which is impossible.",
            ],
          },
        },
        {
          id: "sd-l5-cap-correct",
          title: "CAP Theorem (Correct Framing)",
          summary:
            "CAP forces a choice only during a partition: linearizability or availability. P is non-negotiable, CA is not real, and production systems tune the choice per operation.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["cap", "consistency", "partition"],
          teach: {
            markdown: capCorrectTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-cap-correct-apply",
            prompt:
              "Decide CP vs AP behavior for a globally-replicated shopping cart during a cross-region partition and justify the user-visible consequence of each choice.",
            thinkAbout: [
              "Why is CA not a real operating point?",
              "What exactly do C and A mean in CAP?",
              "Why are most systems tunable/mixed rather than globally CP or AP?",
            ],
            modelAnswerOutline: [
              "Assumptions: a shopping cart replicated across US and EU regions. During a partition, the replicas cannot exchange writes, and the cart may be touched from multiple devices. Decide what the cart does while the link is down.",
              "**CA is off the table first:** the system spans two regions connected by a network that will partition (transatlantic links degrade, BGP flaps), so P is a fact, not a dial. The only real choice is CP or AP during the partition.",
              "**Choose AP for the cart, defended hard.** C means linearizability, A means every non-failing region still answers. Going CP would mean the minority region rejects writes during the partition: the user clicks 'Add to cart' and gets an error. For a cart that directly costs conversion, and the data is not safety-critical. So keep the cart available: both regions accept 'add item' writes locally and reconcile when the partition heals. The user-visible consequence of AP: a stale or divergent cart that must merge after healing.",
              "**The reconciliation is the real design work:** a cart is close to an add/remove set, so model it as a CRDT (an OR-Set) or track per-item add/remove with causal metadata, so a concurrent 'add socks' in the US and 'add shoes' in the EU merge to a union rather than one clobbering the other via naive last-writer-wins.",
              "**Flip to stronger guarantees at checkout/payment:** route to a single authoritative region or use a CP path (quorum write) so there is never a double-charge or oversell, accepting that checkout can fail during a partition where cart edits do not. Exactly the 'tunable per operation' point: the cart is AP, the purchase is CP, in the same product.",
              "Common wrong turn: calling this system 'CA,' or claiming a global 'the cart is a CP system.' The honest framing is per-operation, naming linearizability vs availability precisely rather than hand-waving 'consistency.'",
            ],
          },
          practice: {
            id: "sd-l5-cap-correct-practice",
            prompt:
              "Choose CP or AP for a hotel-booking inventory system (like Booking.com) holding the last room in a hotel during a partition between the booking service's two data centers, and justify the choice against the cart decision you just made.",
            thinkAbout: [
              "How does the business cost structure here invert the cart's?",
              "What mechanism guarantees two data centers cannot both sell the last room?",
              "Does all inventory deserve the CP tax, or only the scarce tail?",
            ],
            modelAnswerOutline: [
              "Assumptions: inventory tracks a finite, oversell-sensitive resource (the last available room). Two data centers each receive a booking request for that room during a partition. The cost structure is the opposite of a cart: a rejected booking is a lost sale (recoverable), but an oversell is a real-world failure (a guest arrives to no room, compensation, brand damage).",
              "**Choose CP for 'commit the last unit.'** C here is linearizability on the room count: a single authoritative decrement so two data centers cannot both sell unit number one. During the partition, the side that cannot reach the authority (or form a quorum) refuses to confirm the booking, sacrificing availability for that operation. The user-visible consequence: some booking attempts fail or fall back to 'on request' during the partition: acceptable because a failed booking is far cheaper than an oversell. The deliberate inverse of the cart: same CAP machinery, opposite choice, because the cost of inconsistency flipped.",
              "**Mechanics:** hold inventory in a CP store (a consensus-backed row in Spanner/CockroachDB, or a single-leader Postgres behind a quorum) and perform the decrement as a conditional compare-and-set (`UPDATE rooms SET available = available - 1 WHERE available > 0`). During a partition, only the majority/leader side can commit; the minority returns 'unavailable' rather than risk a phantom sale.",
              "**The nuance that scores points: not all inventory is scarce.** For a hotel with 200 rooms and 3 booked, run AP and reconcile, because the odds of a true conflict are negligible and availability is worth more. Apply the CP tax only to the scarce tail (near-sold-out inventory). The mature design is tunable by scarcity: AP when plentiful, CP when down to the last few units, optimizing availability without ever overselling the resource that matters.",
            ],
          },
        },
        {
          id: "sd-l5-pacelc",
          title: "PACELC & the Steady-State Tradeoff",
          summary:
            "The else-case tax: linearizable reads and writes cost leader or quorum round trips on every request, so place stores on PA/EL vs PC/EC and tie the choice to a latency SLO.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["pacelc", "consistency", "latency"],
          teach: {
            markdown: pacelcTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-pacelc-apply",
            prompt:
              "Classify DynamoDB, Cassandra, Spanner, and CockroachDB on the PACELC spectrum and explain what each choice costs a request in the no-partition case.",
            thinkAbout: [
              "What does the else-case (no partition) tradeoff cost per request?",
              "Why do linearizable reads need a leader round-trip or read quorum?",
              "How is consistency often per-operation tunable?",
            ],
            modelAnswerOutline: [
              "Assumptions: all four run multi-region or multi-AZ, so coordination has real network cost, and the concern is read/write p99, not just the partition edge case.",
              "**DynamoDB: PA/EL.** Available under partition. Normally favors latency: a default read is eventually consistent, served from the nearest replica (one local hop, single-digit ms) but possibly stale. The per-operation lever: a strongly-consistent read flips that call to EC, paying a round trip to the item's leader replica, roughly doubling read latency for freshness.",
              "**Cassandra: PA/EL.** Available under partition, low latency by default, with the ELC cost fully tunable per query: ONE reads/writes a single replica (EL, fastest, may be stale), QUORUM waits for a majority (EC-leaning, higher latency), ALL waits for every replica (strongest, worst tail, fragile to one slow node). One cluster spans the spectrum; the cost is however many replicas the request blocks on.",
              "**Spanner: PC/EC.** Consistent under partition (the minority loses the ability to commit). Normally it still chooses consistency over latency: every read-write transaction goes through Paxos to a majority and then does TrueTime commit-wait, deliberately waiting out the clock-uncertainty epsilon so timestamps are externally consistent. Per-request cost: a quorum round trip (cross-region if spread) plus commit-wait, which is why Spanner writes are tens of ms. Stale/bounded-staleness reads are the escape hatch.",
              "**CockroachDB: PC/EC.** Same posture, different plumbing: each range replicated by Raft, writes need a quorum ack, and hybrid logical clocks (no atomic-clock hardware) mean it sometimes restarts transactions under uncertainty instead of commit-waiting. Cost: the Raft quorum round trip to the range leaseholder.",
              "**Why a linearizable read costs a round trip:** the nearest replica may not have applied the latest committed write, so reading it locally can return the past. To be linearizable you must confirm you have the newest value: go to the leader/leaseholder or read a quorum and take the max: a coordination hop you cannot skip.",
              "Common wrong turn: reasoning only about the partition column and ignoring the ELC tax, then being surprised that a 'strongly consistent' store has 40ms writes when the network is perfectly healthy.",
            ],
          },
          practice: {
            id: "sd-l5-pacelc-practice",
            prompt:
              "Design the datastore choice for a multi-region social feed's two hardest operations, the write of a new post and the read of a user's home timeline, at 50,000 writes/second with a 30ms read p99 SLO across US, EU, and APAC. Pick the PACELC posture for each operation and justify it against the SLO.",
            thinkAbout: [
              "Is a cross-region quorum read physically possible under a 30ms budget?",
              "Which single user-visible staleness case must be patched, and how?",
              "Which rare operation might genuinely deserve a PC/EC store?",
            ],
            modelAnswerOutline: [
              "Assumptions: 3 regions, users read mostly their own region, a 30ms read p99 budget, the product tolerates a timeline a second or two stale but not a post silently vanishing.",
              "**The read path is SLO-binding.** A cross-region quorum read is physically impossible under 30ms when US-to-EU RTT alone is ~80ms. The timeline read must be EL: serve from the nearest regional replica, accepting eventual consistency. Back the fan-out/timeline store with a PA/EL store (Cassandra or DynamoDB) replicated per region, so a Tokyo user reads from the APAC replica in single-digit ms.",
              "**Patch the one staleness case users notice:** their own new post missing from their own timeline. Add a read-your-writes session guarantee: route the author's timeline read through their home region or merge their recent writes client-side, rather than making the whole feed strongly consistent.",
              "**The write path (create post):** durability and no lost writes matter more than raw latency, and 50k writes/s must not bottleneck on a global quorum. Make the post write local-region durable first (quorum within the author's region: a few ms), replicating asynchronously to other regions. Still PA/EL globally: the user's post is not blocked on an APAC ack.",
              "**Carve out the rare truly-global operation:** if something genuinely needs global linearizability (username uniqueness at signup), put THAT operation on a PC/EC store (Spanner or a CockroachDB table) and let it eat the cross-region quorum latency, because it is rare and correctness-critical.",
              "**The load-bearing point:** pick a PACELC posture per operation, not one database for the product: EL for hot feed reads and regional writes to hit the SLO, EC only for the rare global-uniqueness case. Exactly how real multi-region systems reconcile a tight latency budget with correctness where it counts.",
            ],
          },
        },
      ],
    },
  ],
}
