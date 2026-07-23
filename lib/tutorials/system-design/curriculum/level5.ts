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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Service A sent 'charge 20 dollars' to B and its timer just expired. Which of the four outcomes can A rule out from its side?",
  "options": [
    {
      "label": "Outcome 3: B is just slow, because the timer already expired",
      "feedback": "Tempting, but a timer expiring is exactly what a slow B looks like. The response may still be in flight, and a retry could land right alongside the original."
    },
    {
      "label": "Outcome 2: B did the work, because no response arrived",
      "feedback": "A missing response does not mean missing work. The response itself can be lost after B commits the charge, which is the outcome that makes blind retries dangerous."
    },
    {
      "label": "None of them",
      "correct": true,
      "feedback": "Right. All four outcomes look identical from A: silence. Whatever reaction A picks has to be safe under all four at once."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "A postmortem describes each incident below. Match each one to the fallacy the design believed.",
  "buckets": [
    "The network is reliable",
    "Latency is zero",
    "Topology is static"
  ],
  "items": [
    {
      "label": "Checkout falls over when a flaky link starts dropping 3 percent of requests",
      "bucket": "The network is reliable",
      "feedback": "The design assumed sends always arrive, so there was no retry or idempotency plan for lost messages."
    },
    {
      "label": "A cross-region call budgeted at 5ms actually takes 120ms and blows the SLO",
      "bucket": "Latency is zero",
      "feedback": "Cross-region round trips run 60 to 150ms. A 5ms budget was written for a network with no latency, which does not exist."
    },
    {
      "label": "Hardcoded replica addresses break when autoscaling replaces the instances",
      "bucket": "Topology is static",
      "feedback": "Nodes and routes change constantly. Anything pinned to a specific address will eventually point at nothing."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are about to write the failure-mode analysis for A calling B. A retry policy is only safe if one property holds. Which one?",
  "options": [
    {
      "label": "The network guarantees exactly-once delivery",
      "feedback": "No network can promise that. Exactly-once behavior is built at the application layer, not the transport, which is why the burden falls on how B processes requests."
    },
    {
      "label": "Timeouts are tuned long enough that slow responses always arrive",
      "feedback": "Tempting, but no timeout value removes the ambiguity. However long you wait, silence still collapses lost request, lost response, slow peer, and dead peer into one observation."
    },
    {
      "label": "The operation is idempotent, so a duplicate attempt changes nothing",
      "correct": true,
      "feedback": "Right. With an idempotency key and dedup on the receiver, a retry is a no-op if the first attempt succeeded and does the work if it did not. Safe under all four outcomes."
    }
  ],
  "reveal": "Carry this into the write-up: enumerate the four timeout outcomes, show why A cannot tell them apart from its side, and make idempotent retry the one reaction that is correct under every outcome."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A vendor pitches a two-region database as CA: consistent and available, they simply did not choose partition tolerance. What should you conclude?",
  "options": [
    {
      "label": "Reasonable: CAP says pick two, and they picked C and A",
      "feedback": "That is the folklore version. P is not a menu item you can decline: the network between two regions will partition whether the vendor likes it or not."
    },
    {
      "label": "It can work if they buy a very reliable inter-region link",
      "feedback": "Tempting, but no link is partition-proof. Cables get cut, switches reboot, routes flap. Reliability lowers the frequency; it does not remove the forced choice."
    },
    {
      "label": "The claim is a red flag: for a multi-node system, CA is not a real operating point",
      "correct": true,
      "feedback": "Right. Partitions are a fact of nature for anything spanning a network, so the only honest question is what the system does, CP or AP, when one happens."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "A partition splits a cluster and writes keep arriving on both sides. Classify each behavior.",
  "buckets": [
    "CP behavior",
    "AP behavior"
  ],
  "items": [
    {
      "label": "The minority side returns errors for writes it cannot coordinate",
      "bucket": "CP behavior",
      "feedback": "Refusing the write keeps the copies from diverging. Availability is sacrificed on that side to preserve linearizability."
    },
    {
      "label": "Both sides accept the write and reconcile siblings after healing",
      "bucket": "AP behavior",
      "feedback": "Every non-failing node keeps answering, and the price is divergent copies that must be merged later."
    },
    {
      "label": "ZooKeeper rejecting requests after losing quorum",
      "bucket": "CP behavior",
      "feedback": "Coordination stores choose consistency: a node that cannot reach a majority steps back rather than serve possibly stale answers."
    },
    {
      "label": "A Cassandra query at consistency level ONE succeeding on either side",
      "bucket": "AP behavior",
      "feedback": "At level ONE a single replica suffices, so both sides keep taking writes. The same cluster at QUORUM would act CP-ish for that query, which is the tunability point."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The design write asks you to pick partition behavior for a cross-region shopping cart. What shape should a strong answer take?",
  "options": [
    {
      "label": "Declare the whole product CP: carts are user data, so never risk inconsistency",
      "feedback": "Sounds rigorous, but it means 'add to cart' returns errors during a partition, trading real conversions to protect data that can safely merge later."
    },
    {
      "label": "Declare it CA and argue partitions are too rare to design for",
      "feedback": "CA is the one answer that sinks the interview. Cross-region partitions are guaranteed eventually, so the choice cannot be dodged."
    },
    {
      "label": "Choose per operation: keep cart edits available and reconcile, make checkout consistent",
      "correct": true,
      "feedback": "Right. Real systems tune the choice per operation. The cart tolerates divergence and merging; the payment path is where you refuse to proceed without coordination."
    }
  ],
  "reveal": "In your write-up, define C as linearizability and A as every non-failing node answering, rule out CA explicitly, then defend the per-operation split by naming the user-visible consequence of each side."
}
\`\`\`
`.trim()

const pacelcTeach = `
## CAP's blind spot: the other 99.99% of the time

CAP only describes behavior **during a partition**, which is a rare event. It says nothing about the
tradeoff you pay on every single request when the network is fine. **PACELC** (Abadi) fills that
hole. Read it as: **if Partition (P), choose Availability or Consistency (A/C); Else (E), choose
Latency or Consistency (L/C).** The first half is just CAP. The second half, the **ELC** part, is the
one that actually shapes your latency budget day to day.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A 3-region store promises linearizable writes. The network is perfectly healthy this week, not a partition in sight. What does each write cost?",
  "options": [
    {
      "label": "Nothing extra: the consistency price is only paid during a partition",
      "feedback": "That is CAP-only thinking, the exact junior tell this lesson names. The coordination that makes a write linearizable happens on every write, healthy network or not."
    },
    {
      "label": "A round trip to a quorum of regions before the write is acknowledged, tens of milliseconds",
      "correct": true,
      "feedback": "Right. The write waits on the second-fastest region every single time. That steady-state tax is the ELC half of PACELC."
    },
    {
      "label": "Only reads pay a cost; writes commit locally and replicate in the background",
      "feedback": "Backwards for linearizability: a write acknowledged before reaching a quorum could be lost or invisible to the next reader, so writes are precisely what must wait for coordination."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Place each behavior on the PACELC spectrum.",
  "buckets": [
    "PA/EL",
    "PC/EC"
  ],
  "items": [
    {
      "label": "DynamoDB default reads served from the nearest copy, possibly stale",
      "bucket": "PA/EL",
      "feedback": "Available under partition, latency-first when healthy. The opt-in strongly consistent read is the per-operation lever toward EC."
    },
    {
      "label": "Cassandra at consistency level ONE",
      "bucket": "PA/EL",
      "feedback": "One replica answers: fastest, possibly stale. Cranking the same query to QUORUM or ALL pushes it toward EC, one cluster spanning the spectrum."
    },
    {
      "label": "Spanner paying a Paxos quorum plus TrueTime commit-wait on every commit",
      "bucket": "PC/EC",
      "feedback": "Consistent during partitions, and it still pays coordination when healthy. That is why Spanner writes cost tens of milliseconds on a perfect network."
    },
    {
      "label": "CockroachDB waiting on a Raft quorum ack for the range",
      "bucket": "PC/EC",
      "feedback": "Same posture as Spanner with different plumbing: Raft per range and hybrid logical clocks instead of atomic-clock hardware."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your feed serves three regions with a 20ms read p99 SLO, and the US-to-EU round trip alone is about 80ms. Which posture can hit the SLO on the hot read path?",
  "options": [
    {
      "label": "EC with quorum reads, since correctness comes first",
      "feedback": "Physically impossible: one cross-region round trip already blows the 20ms budget four times over. An SLO is a constraint the consistency choice must obey."
    },
    {
      "label": "EL nearest-replica reads, with session guarantees patching the cases that need read-your-writes",
      "correct": true,
      "feedback": "Right. Serve locally in single-digit milliseconds, accept eventual consistency, and cure the one staleness users notice with a targeted guarantee instead of global coordination."
    },
    {
      "label": "EC, but only switched on when a partition is detected",
      "feedback": "This inverts PACELC: EC is the else case, the price paid when the network is healthy. Partitions are where the PA-versus-PC half applies instead."
    }
  ],
  "reveal": "That is the staff-level move to reuse in the design write: place each store on the spectrum, name the round trips behind its posture, and tie the L-versus-C choice to a concrete latency number."
}
\`\`\`
`.trim()

const consistencySpectrumTeach = `
## Name the exact point, not the ends

"Strongly consistent" and "eventually consistent" are the two phrases most people know, and they are
not enough. Between them sits a spectrum, and a senior engineer names the exact point rather than
waving at the ends.

**Linearizability** is the strong end. Every operation appears to take effect instantaneously at some
point between its invocation and its response, and that single point respects real-time order: if
write B started after write A returned, every reader sees them in that order. The system behaves as
if there is one copy of the data. This is what lets you build a unique-username check, a distributed
lock, or a leader election, because "did anyone already take this?" has a single global answer. The
cost is coordination: a leader or a quorum, and round trips to agree on order.

**Sequential consistency** relaxes the real-time part. All clients agree on one total order, and each
client's own operations keep their program order, but that global order need not match wall-clock
reality. Cheaper than linearizable, and enough for many caches, but it can surprise you when two
users compare notes out of band ("I posted first, why is mine below yours?").

**Causal consistency** keeps only the orderings that matter: if event A *causally influenced* B (you
read a post, then reply to it), everyone sees A before B. Operations with no causal link can appear
in different orders on different replicas. The crucial property, from the COPS and Bayou research
lines: **causal consistency is the strongest model you can provide while staying available under a
network partition**. Anything stronger forces you to block or reject writes when the network splits.

**Eventual consistency** promises only that if writes stop, replicas converge. Along the way you see
stale reads, reordered updates, and (without conflict handling) lost writes. Cheapest to run, highest
availability: shopping-cart-scale and like-count-scale systems live here.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Pick the weakest model that is still correct for each piece of data.",
  "buckets": [
    "Linearizable",
    "Causal",
    "Eventual"
  ],
  "items": [
    {
      "label": "Claiming a unique username at signup",
      "bucket": "Linearizable",
      "feedback": "'Did anyone already take this?' needs a single global answer, and only the strong end provides one."
    },
    {
      "label": "A reply must never appear before the comment it answers",
      "bucket": "Causal",
      "feedback": "Reading a comment and replying is a causal link, and causal is the strongest model that stays available under partition, so paying more here buys nothing."
    },
    {
      "label": "A like count that may lag a few seconds behind",
      "bucket": "Eventual",
      "feedback": "Nobody can verify a like count is instantaneously right, so convergence is enough and buys the highest availability."
    },
    {
      "label": "A distributed lock guarding a migration job",
      "bucket": "Linearizable",
      "feedback": "Two holders of one lock is a correctness disaster, so this needs the single-copy illusion with real-time order."
    }
  ]
}
\`\`\`

\`\`\`
strong <--------------------------------------------------> weak
linearizable   sequential   causal   |   eventual
(real-time)    (total ord)  (cause)  |   (converges)
      more coordination  <-----  |  ----->  more availability
                          partition line
\`\`\`

**Interview nuance:** the coordination cost rises monotonically to the left. Stronger models need
leaders, quorums, or waiting, which costs latency and availability. The design skill is picking the
*weakest* model that is still correct for the specific data.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Spanner advertises serializable transactions. Does that alone tell you its replicas never serve stale reads?",
  "options": [
    {
      "label": "Yes: serializable is the strongest level, so reads must be fresh too",
      "feedback": "Tempting because both sound like 'the strongest', but serializability is an isolation property about how concurrent transactions interleave. By itself it says nothing about replica freshness."
    },
    {
      "label": "No: transaction isolation and replication consistency are different axes",
      "correct": true,
      "feedback": "Right. One axis governs interleaving transactions, the other governs how up-to-date the copies are. Spanner happens to provide both, but neither implies the other."
    }
  ]
}
\`\`\`

One more axis people conflate. **Replication consistency** (this spectrum: how up-to-date are the
copies) is *not* the same as **ACID isolation** (serializable, snapshot, read-committed: how
concurrent transactions interleave). Spanner is linearizable *and* serializable; a system can be one
without the other. Naming which axis you mean is a fast credibility signal.

Recap: name the specific model (linearizable, sequential, causal, eventual) and its coordination
cost, remember causal is the strongest model available under partition, keep replication consistency
separate from ACID isolation, and always reach for the weakest model that is still correct.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A candidate designs every data path in their system as linearizable 'to be safe'. What is the main flaw?",
  "options": [
    {
      "label": "Nothing: stronger is always safer",
      "feedback": "Safer against staleness, but every operation now pays leader or quorum coordination in latency and availability, including data like counters that never needed it."
    },
    {
      "label": "Every operation pays coordination it may not need, and availability drops under partition",
      "correct": true,
      "feedback": "Right. Coordination cost rises monotonically toward the strong end, and anything stronger than causal must block or reject during a partition. The graded skill is matching each piece of data to the weakest model that keeps it correct."
    },
    {
      "label": "Linearizability cannot actually be built in practice",
      "feedback": "It can, and systems like Spanner and etcd do. The objection is cost and blast radius, not feasibility."
    }
  ],
  "reveal": "In the design write, name the exact point per data item: linearizable for the uniqueness check or lock, causal for reply threads, eventual for counters, and say which axis, replication consistency or ACID isolation, each claim lives on."
}
\`\`\`
`.trim()

const sessionGuaranteesTeach = `
## Placing session guarantees on the consistency spectrum

Level 3's "Replication Lag & Session Guarantees" lesson introduced the four **client-centric session
guarantees** (from the Bayou system) and how to implement them. This lesson credits that treatment and
adds the theory frame the interview rewards: where these per-client promises sit on the consistency
spectrum from the previous lesson, and why they are the pragmatic default for user-facing reads.

A self-contained recap of the four, since nothing here is corrupted (a read just hit a replica that
lags the primary, and each guarantee cures one symptom of that lag):

- **Read-your-writes:** after you write a value, your own later reads never return an *older* one.
- **Monotonic reads:** once you have seen a value, later reads never show an *earlier* state.
- **Monotonic writes:** your writes are applied in the order you issued them.
- **Writes-follow-reads:** if you read X and then write Y in response, everyone sees X before Y.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Match each bug report to the session guarantee it violates.",
  "buckets": [
    "Read-your-writes",
    "Monotonic reads",
    "Writes-follow-reads"
  ],
  "items": [
    {
      "label": "You save a new bio, refresh, and the old bio is back",
      "bucket": "Read-your-writes",
      "feedback": "Your own later read returned something older than your own write: the refresh hit a replica lagging the primary."
    },
    {
      "label": "A thread shows 10 comments, then a refresh shows 8",
      "bucket": "Monotonic reads",
      "feedback": "You saw a state and a later read showed an earlier one. Time went backwards because the second read hit a staler replica than the first."
    },
    {
      "label": "Some users see your answer to a question before the question itself",
      "bucket": "Writes-follow-reads",
      "feedback": "You read the question and wrote the answer in response, so everyone should observe them in that order. This one constrains what other observers see of your causal chain."
    }
  ]
}
\`\`\`

Implementation was covered in depth in Level 3, so one line here: pin a user's reads to the primary or
a caught-up replica for a short window after a write (**sticky routing**, single-device), or return a
**logical version token** (an LSN or commit timestamp) that later reads carry so the read path waits
for a replica caught up past it (**version tokens**, the only option that survives the phone-write then
laptop-read cross-device case, because a cookie-scoped sticky session does not travel).

### Where they land, and why that is the point

The previous lesson lined up the *global* models: linearizable, sequential, causal, eventual, ordered
by how much they constrain what **all** clients observe. Session guarantees are a different cut of the
same problem. They are **client-centric**: each one constrains only what a *single* client sees of its
*own* actions, and says nothing about how two different users are ordered relative to each other. That
is exactly why they are cheap, and why they do not sit as one point on that global line.

Two framings worth carrying into an interview:

- **Relative strength.** For one client's own view the guarantees are real, but globally they are
  **weaker than causal consistency**: causal ordering holds across all observers, session guarantees
  hold only within your own session. Taken together, the four compose to *per-client* causal
  consistency, not the global causal consistency of the spectrum lesson.
- **Why they win in practice.** Almost every "the app feels broken" report (you edit your bio and the
  old one returns, a thread flickers between 8 and 10 comments) is a per-user staleness bug, not a
  cross-user ordering bug. Session guarantees kill exactly that class for the cost of a token compare
  while leaving the read fleet unpinned. The senior move is refusing to reach for linearizability when
  the product only needs "the user sees their own action," and reserving the strong end for genuinely
  global invariants (a uniqueness check, a lock, "claim this seat").

Recap: session guarantees are the client-centric cut of the consistency spectrum, weaker than global
causal because they bind only one client's own view (though the four together give per-client causal);
implement them with sticky routing or version tokens (Level 3 has the depth), and prefer them over
linearizability for user-facing reads, escalating only for truly global invariants.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The stale-bio bug must be fixed cross-device: the user edits on their phone, then reads on their laptop. Which fix actually works?",
  "options": [
    {
      "label": "Sticky routing: pin the user's reads to the primary via a session cookie",
      "feedback": "Tempting, and it works single-device, but a cookie-scoped sticky session does not travel from the phone to the laptop. The laptop's read path never learns a write happened."
    },
    {
      "label": "A logical version token from the write that the user's later reads carry",
      "correct": true,
      "feedback": "Right. The token travels with the user's account rather than one device, so the laptop's read can wait for a replica caught up past that commit point."
    },
    {
      "label": "Make all reads linearizable so staleness is impossible",
      "feedback": "It would fix the bug, but at global coordination cost on every read for every user, to cure a per-client symptom. That is exactly the escalation this lesson tells you to refuse."
    }
  ],
  "reveal": "That is the frame to carry into the design write: session guarantees are per-client promises, cheaper than any global model, so spend them on user-facing reads and reserve linearizability for genuinely global invariants like uniqueness checks and locks."
}
\`\`\`
`.trim()

const logicalClocksTeach = `
## Ordering events without a shared clock

In a distributed system you cannot trust wall clocks to order events, and there is no shared clock at
all. Yet you constantly need to answer "did A happen before B, or were they concurrent?" **Logical
clocks** answer that using only message passing, via Lamport's **happens-before** relation (written
A -> B):

- If A and B are on the same node and A came first, then A -> B.
- If A is a *send* and B is the matching *receive*, then A -> B.
- Transitivity: if A -> B and B -> C then A -> C.
- If neither A -> B nor B -> A, the events are **concurrent** (A || B). Concurrency is the
  interesting case: it is where two clients may have independently updated the same thing.

### Lamport clocks

Each node keeps an integer counter. Increment it on every local event; stamp outgoing messages; on
receive, set your counter to \`max(local, received) + 1\`. The guarantee: if A -> B then
\`L(A) < L(B)\`. This gives a **total order** (break ties by node id) that never contradicts
causality: enough to agree on a single order for a replicated log.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Event A has Lamport timestamp 4 and event B has timestamp 9, on different nodes. What do the stamps prove?",
  "options": [
    {
      "label": "A happened before B",
      "feedback": "Tempting: the guarantee reads that way, but it only runs in one direction. Causality forces the timestamps; the timestamps do not prove causality."
    },
    {
      "label": "Nothing about causality: A and B may be concurrent",
      "correct": true,
      "feedback": "Right. Two concurrent events on different nodes can carry any pair of Lamport values, so 4 versus 9 says nothing about whether either influenced the other."
    },
    {
      "label": "B happened before A, since larger stamps mean later on the wall clock",
      "feedback": "Lamport counters are not wall clocks. A causally earlier event can never carry the larger stamp, but these two events may simply be unrelated."
    }
  ]
}
\`\`\`

The catch, and the single most-probed point here: the implication only goes one way. \`L(A) < L(B)\`
does **not** imply A -> B. Two concurrent events on different nodes can have any Lamport values, so a
smaller timestamp tells you nothing about causation. **Lamport clocks cannot detect concurrency.**
They can order everything; they cannot tell you *which orderings were forced by causality and which
were arbitrary*.

### Vector clocks

Each node keeps a vector with one counter per node. On a local event, increment your own slot. On
send, attach your whole vector. On receive, take the element-wise max, then increment your own slot.
Compare two vectors:

- V(A) < V(B) (every element <=, at least one <) means **A -> B**.
- V(B) < V(A) means B -> A.
- Neither dominates means **A || B, concurrent**, and if they touched the same key, a **conflict**.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "V(A) is [2,1,0] and V(B) is [1,2,0]. What is the relationship?",
  "options": [
    {
      "label": "A happened before B, because A leads in the first slot",
      "feedback": "Dominance must hold element-wise: every slot less-or-equal and at least one strictly less. B leads in the second slot, so A does not dominate."
    },
    {
      "label": "B happened before A, because B leads in the second slot",
      "feedback": "The same trap mirrored: A leads in the first slot, so B does not dominate either."
    },
    {
      "label": "Neither dominates: they are concurrent, and a conflict if they touched the same key",
      "correct": true,
      "feedback": "Right. Each vector leads somewhere, so no causal order exists between them. This detection is exactly what Lamport clocks cannot do."
    }
  ]
}
\`\`\`

\`\`\`
node A: [1,0,0] --send--> node B receives, takes max, bumps self -> [1,1,0]
meanwhile node C, no contact: [0,0,1]
compare [1,1,0] vs [0,0,1]: A-slot 1>0 but C-slot 0<1 -> neither dominates -> CONCURRENT
\`\`\`

That detection is why **Dynamo and Riak use vector clocks (technically version vectors, one entry per
replica) to surface *siblings***: when a read finds two concurrent versions, it returns both to the
application (or a merge function / LWW / CRDT) rather than silently picking one and losing a write.

**Interview nuance, the costs.** Vector clocks are **O(N)** in the number of participants. Worse, in
a system with many transient actors (mobile clients writing directly), the vector grows without bound
because each new writer adds a slot, and you cannot easily garbage-collect entries for actors that
may still return. This **GC / unbounded-growth problem** is why Dynamo keys version vectors on the
small fixed set of storage nodes rather than per-client, and why pruning old entries risks
false-concurrent readings.

Recap: Lamport clocks give a causality-respecting total order but cannot detect concurrency;
vector/version clocks do detect concurrency and let leaderless stores surface conflict siblings, at
O(N) size and a real garbage-collection problem when actors churn.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Last pass before the design write: which clock does each job describe?",
  "buckets": [
    "Lamport clock",
    "Vector clock"
  ],
  "items": [
    {
      "label": "Agree on one total order of entries for a replicated log",
      "bucket": "Lamport clock",
      "feedback": "A single integer plus a node-id tiebreak yields a total order that never contradicts causality, which is all a log needs."
    },
    {
      "label": "Detect that two writes to a key were concurrent and surface both as siblings",
      "bucket": "Vector clock",
      "feedback": "Only element-wise comparison can prove concurrency, which is why Dynamo-style stores use version vectors instead of silently dropping a write."
    },
    {
      "label": "Stay constant-size no matter how many writers show up",
      "bucket": "Lamport clock",
      "feedback": "One counter per node, one integer per stamp. The price is blindness to concurrency."
    },
    {
      "label": "Risks unbounded growth, and false concurrency if old entries are pruned",
      "bucket": "Vector clock",
      "feedback": "One slot per participant means churny writers grow the vector without bound, the GC problem that pushes systems to key vectors on a small fixed replica set."
    }
  ],
  "reveal": "In the design write, pick the clock by the question you must answer: 'give me one order' is Lamport territory, while 'tell me whether these conflicted' demands a vector, paid for in O(N) size and GC care."
}
\`\`\`
`.trim()

const physicalTimeHlcTeach = `
## Wall-clock ordering silently destroys data

Stamping each write with \`now()\` and letting the highest timestamp win (last-writer-wins) feels
obvious and is wrong in a way that silently destroys data. Knowing exactly why is a staff-level
distinguisher.

**Clocks drift, and drift is not small.** Machine clocks are quartz oscillators that run fast or slow
with temperature. **NTP** disciplines them over the network but leaves them off by anywhere from a
few milliseconds to tens or even hundreds of milliseconds, and NTP can step a clock *backward* when
it corrects. **PTP** does better (sub-microsecond in a datacenter) but needs special hardware. So at
any instant, two nodes can disagree about "now" by tens of milliseconds.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Node A's clock runs 50 ms ahead of node B's. A user writes a fresh value on node B at real time T. A stale retry of an older write then lands on node A. Under last-writer-wins on wall-clock timestamps, which write survives?",
  "options": [
    {
      "label": "Node B's write: it happened later in real time, so LWW keeps it",
      "feedback": "Tempting, because LWW is supposed to keep the latest write. But LWW compares timestamps, not real time: node A stamps the stale retry T plus 50 ms, which is higher than B's stamp."
    },
    {
      "label": "Node A's stale retry: its timestamp reads T plus 50 ms, so it wins and B's newer write is discarded",
      "correct": true,
      "feedback": "Right. The skewed clock hands the older write the higher timestamp, and LWW drops the genuinely newer value with no error and no log entry. Clock skew is a correctness input, not just a dashboard metric."
    },
    {
      "label": "Neither: LWW detects the conflict and keeps both versions",
      "feedback": "Keeping both versions is what version vectors and sibling values do. Plain LWW detects nothing: it keeps the higher timestamp and silently throws the other write away."
    }
  ]
}
\`\`\`

**Now run last-writer-wins on wall-clock timestamps.** Node A's clock is 50 ms ahead. A user writes X
on node B (correct value, real time T). A stale retry lands on node A, whose clock reads T+50 ms even
though it happened *first* in real causal terms. LWW keeps the higher timestamp, so node A's write
wins and node B's newer, correct write is **silently discarded**. No error, no log, just a lost
update. This is the classic Cassandra LWW-under-skew data-loss story. **Clock skew is a correctness
input, not just a dashboard metric.**

### Hybrid Logical Clocks (HLC)

An HLC timestamp combines a **physical component** (kept close to NTP wall time) with a **logical
counter** that breaks ties and preserves causality. On an event, HLC takes
\`max(local physical clock, physical part of last seen timestamp)\` and, if the physical part did not
advance, bumps the logical counter. The result: timestamps stay within a bounded distance of real NTP
time (human-meaningful, roughly sortable), and they *also* guarantee that if A -> B then
HLC(A) < HLC(B), which pure wall clocks do not. HLC needs **no special hardware**, just NTP, which is
why **CockroachDB and MongoDB use it**. Its limit: HLC gives causal ordering and monotonicity, but it
cannot by itself give *external* (linearizable) consistency across nodes.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Google built TrueTime on GPS receivers and atomic clocks in every datacenter. When Spanner asks TrueTime for the current time, what does the API return?",
  "options": [
    {
      "label": "A single exact timestamp: atomic clocks engineer the uncertainty away",
      "feedback": "Tempting, because the hardware is exotic. But no clock infrastructure can eliminate uncertainty, it can only shrink it, and pretending it is zero would reintroduce the LWW bug at a smaller scale."
    },
    {
      "label": "An interval from earliest to latest that is guaranteed to contain the true time",
      "correct": true,
      "feedback": "Right. TrueTime is honest about uncertainty: it returns a bounded interval a few milliseconds wide, and Spanner turns that bound into a safety guarantee by waiting it out before acknowledging commits."
    },
    {
      "label": "A physical timestamp plus a logical counter for breaking ties",
      "feedback": "That is HLC, the commodity-hardware approach. TrueTime does not need a logical counter because it exposes uncertainty directly as an interval and handles it with commit-wait."
    }
  ]
}
\`\`\`

### Google TrueTime

TrueTime attacks the problem from the hardware side. Every datacenter has **GPS receivers and atomic
clocks**, and the TrueTime API returns an **interval** \`[earliest, latest]\` with a guaranteed
bound: \`now()\` is somewhere in that window, and the uncertainty (epsilon) is typically a few
milliseconds. Spanner uses this for **commit-wait**: when a transaction commits at timestamp \`t\`,
Spanner *waits out epsilon* (until \`TT.now().earliest > t\`) before releasing locks and
acknowledging. That deliberate wait guarantees any transaction that starts later gets a strictly
higher timestamp, giving Spanner **external consistency (linearizability) globally**. The price: a
couple of milliseconds of added commit latency on every write, plus GPS and atomic clocks in every
datacenter.

\`\`\`
LWW wall clock: highest ts wins  ->  under skew, older write can win -> DATA LOSS
HLC:  physical(~NTP) + logical counter  ->  causal + monotonic, no special HW
TrueTime: [earliest, latest] + commit-wait epsilon -> external consistency, needs GPS/atomic clocks
\`\`\`

**Interview nuance:** the choice is HLC versus TrueTime, and it is a hardware-versus-guarantee trade.
If you control your datacenters and need global linearizable transactions, TrueTime-style bounded
uncertainty plus commit-wait is worth the hardware cost. If you run on commodity cloud with only NTP,
HLC gets you causal, monotonic timestamps for free, and you accept that you are not externally
consistent without an extra coordination step. Saying "just use timestamps" without addressing skew
is the tell that someone has not built this.

Recap: NTP/PTP drift is tens of milliseconds and real, LWW on wall-clock timestamps silently drops
writes under skew, HLC gives causal + monotonic timestamps on plain NTP hardware, and TrueTime's
bounded interval plus commit-wait buys global external consistency at the cost of GPS/atomic-clock
infrastructure and a few ms per commit.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Before you design timestamp ordering for the multi-region database, match each property to the approach it describes.",
  "buckets": [
    "Wall-clock LWW",
    "HLC",
    "TrueTime plus commit-wait"
  ],
  "items": [
    {
      "label": "Can silently discard a newer write when one clock runs tens of ms ahead",
      "bucket": "Wall-clock LWW",
      "feedback": "Under skew the older write carries the higher timestamp, so the newer value is dropped with no error."
    },
    {
      "label": "Causal, monotonic timestamps on plain NTP hardware, nothing special to install",
      "bucket": "HLC",
      "feedback": "The physical part tracks NTP and the logical counter preserves causality, which is why CockroachDB and MongoDB use it."
    },
    {
      "label": "Global external consistency, paid for with GPS and atomic clocks plus a few ms of commit latency",
      "bucket": "TrueTime plus commit-wait",
      "feedback": "Waiting out epsilon before acknowledging guarantees every later transaction gets a strictly higher timestamp."
    },
    {
      "label": "Preserves causal order but cannot alone guarantee external consistency across nodes",
      "bucket": "HLC",
      "feedback": "Two causally unrelated writes can still order in a surprising way; linearizability needs an extra coordination step on top."
    }
  ],
  "reveal": "This is your decision axis for the design write: HLC by default on commodity cloud, a TrueTime-style bounded interval plus commit-wait when you own the hardware and need global external consistency, and never bare wall-clock LWW."
}
\`\`\`
`.trim()

const smrTotalOrderTeach = `
## One machine underneath them all

Almost every strongly consistent distributed system (etcd, ZooKeeper, Kafka's controller,
CockroachDB, Spanner) is secretly the same machine underneath. That machine is **state-machine
replication (SMR)**, and understanding it collapses a dozen scary systems into one idea.

Start with a deterministic state machine: a program whose next state depends only on its current
state and the next input. A key-value store is a perfect example. \`SET x=5\`, \`DELETE y\`,
\`INCR z\` are commands, and if you apply the same commands in the same order starting from the same
empty state, you land in exactly the same final state, every time, on every machine. That is the
whole trick. If you can get N replicas to apply the **same sequence of commands in the same order**,
they will all hold identical state, with no further coordination needed.

So the replication problem reduces to one thing: getting every replica to agree on a single ordered
log of commands. This ordering primitive has a name, **total-order broadcast** (atomic broadcast):
every correct node delivers the same set of messages in the same order. The deep result:
**total-order broadcast is equivalent to consensus**. You can build one from the other. This is why
"how do I keep my replicas consistent" and "I need a consensus algorithm" are the same question
wearing different clothes.

\`\`\`
  clients ->  [ append ]  ->  replicated ordered log
                              idx:  1     2     3     4
                              cmd: SET   INCR  DEL   SET
                                    |     |     |     |
              replica A  apply ---> same order ---> state S
              replica B  apply ---> same order ---> state S
              replica C  apply ---> same order ---> state S
\`\`\`

### The two non-negotiable preconditions

First, **apply must be deterministic**. If a command reads the wall clock, a random number, a map's
iteration order, or calls an external service, two replicas fed the identical log will diverge, and
your replicas silently disagree while the log looks perfectly healthy. This is the number one wrong
turn. The fix: move all nondeterminism into the command before it enters the log: the leader stamps
the timestamp or random seed into the entry, and every replica applies that recorded value. Second,
apply should be idempotent enough that replaying an entry twice (after a crash mid-apply) is safe.

The remaining practical problem is that the log grows forever. Bound it with **snapshots (log
compaction)**: periodically serialize the full state machine to disk, record the log index it
covers, and truncate everything at or below. A recovering or newly added replica installs the latest
snapshot and replays only the tail. Raft, Kafka, and etcd all do exactly this.

**Interview nuance:** if asked "how do you keep replicas consistent," do not jump to gossip or
last-write-wins. Say "I model each replica as a deterministic state machine and feed them one agreed
ordered log via a consensus protocol; consistency then falls out for free," then mention snapshots
for log growth. That framing signals you understand the primitive rather than a specific product.

Recap: identical replicas come from applying the same deterministic commands in the same order,
achieving that order is total-order broadcast which is equivalent to consensus, nondeterministic
apply is the classic silent-divergence bug, and snapshots bound otherwise-unbounded log growth.
`.trim()

const raftPaxosTeach = `
## The consensus protocol you will actually name

Raft powers etcd (and therefore Kubernetes), Consul, CockroachDB, TiKV, and countless control planes.
Its selling point over Paxos is that it was designed to be *understandable*, by decomposing consensus
into three separable problems: leader election, log replication, and safety.

### Leader election

Raft time is divided into **terms**, each a monotonically increasing integer acting as a logical
clock. At most one leader exists per term. Every node is follower, candidate, or leader. If a
follower hears nothing from a leader within its **election timeout**, it becomes a candidate,
increments the term, votes for itself, and requests votes. A candidate that collects votes from a
**majority** wins. The clever bit that avoids endless split votes: each node's election timeout is
**randomized** (say 150 to 300ms), so nodes rarely time out simultaneously; one usually starts first,
gathers a majority, and shuts the others down. A node only grants its vote to a candidate whose log
is **at least as up to date** as its own, which prevents a stale node from ever becoming leader and
clobbering committed data.

### Log replication

Clients send commands to the leader. The leader appends the entry and sends \`AppendEntries\` to
followers. Once an entry is stored on a **majority**, the leader marks it **committed** and applies
it. The **commit rule** is the heart: an entry is durable the instant a majority has it. Majority
quorums work because any two majorities of N nodes must **overlap in at least one node**. That
overlapping node carries committed entries forward into any future leader's election, so committed
data is never lost.

\`\`\`
  5-node cluster, leader crashes:
    term 4 leader (S1) dies
    S2..S5 election timeouts fire (randomized) -> S3 first
    S3 (up-to-date log) requests votes -> S2,S4 grant -> majority 3/5
    S3 becomes leader for term 5, resumes AppendEntries
    an uncommitted term-4 entry only on S1 is overwritten, never was committed
\`\`\`

### Safety

Raft guarantees: *election safety* (one leader per term), *leader append-only*, *log matching* (if
two logs share an entry at an index/term, all prior entries match), and *leader completeness* (a new
leader contains every committed entry from prior terms). Together: an entry, once committed, survives
every future leader change. An entry replicated but **not yet committed** when the old leader crashed
can be safely overwritten, and that is correct precisely because no client was ever told it
committed.

A **minority partition** cannot make progress: a partitioned old leader with 2 of 5 nodes can append
locally but never commits, and on heal it discovers a higher term and steps down, discarding its
uncommitted tail. **Membership changes** use **joint consensus** (a transitional configuration
requiring majorities of both old and new sets) so two disjoint majorities can never exist
mid-reconfiguration.

**Interview nuance on cluster size:** always use an **odd** number. A 5-node cluster tolerates 2
failures (majority 3); a 4-node cluster *also* tolerates only 1 failure (majority still 3) while
costing an extra machine and an extra vote to collect. The classic wrong turn is a 2-node cluster:
majority is 2, so a single failure leaves no majority and a hung, unwritable system.

**Paxos family.** Basic Paxos solves single-value consensus; Multi-Paxos chains it for a log and
underlies Chubby and Spanner. Paxos is more flexible but famously hard to implement correctly, which
is why Raft constrains leadership to trade flexibility for a protocol engineers can get right. The
**FLP impossibility** result says no deterministic consensus can guarantee termination in a fully
asynchronous network with even one crash; real systems dodge it by assuming **partial synchrony**,
which randomized timeouts operationalize.

Recap: Raft splits consensus into randomized-timeout leader election, majority-quorum log replication
with commit-on-majority, and four safety properties that make committed entries immortal; minority
partitions stall safely, membership changes use joint consensus, and clusters should be odd-sized.
`.trim()

const quorumsTunableTeach = `
## Raft gives one fixed answer; Dynamo hands you a dial

Dynamo-style systems (DynamoDB's underpinnings, Cassandra, Riak, ScyllaDB) let you choose three
numbers per operation, trading durability, consistency, and latency against each other.

The three knobs:

- **N**: the replication factor, how many nodes store each key (say 3).
- **W**: how many replicas must acknowledge a **write** before the client is told it succeeded.
- **R**: how many replicas must respond to a **read** before the client gets an answer.

The one rule to memorize is **R + W > N**. When that holds, the set of nodes a read touches and the
set a write touched must **overlap in at least one node** (pigeonhole: two subsets of N whose sizes
sum to more than N cannot be disjoint). That overlapping node has seen the latest write, so a read is
guaranteed to observe at least one copy of the freshest value.

\`\`\`
  N=3 nodes: [1][2][3]
  W=2 write acked by {1,2}
  R=2 read from {2,3}   -> overlap = node 2 -> sees latest
  since 2+2 > 3, no read/write pair can miss each other
\`\`\`

### What R+W>N does NOT give you

This is the number-one trap. Quorum overlap guarantees a read sees the latest *acknowledged* write,
but it does **not** give you **linearizability**. Concurrent writes to different quorums can produce
conflicting versions that must be reconciled with **version vectors** (Dynamo returns siblings) or
**last-write-wins** by timestamp (Cassandra, which silently drops the loser). A read during an
in-flight write may see the old or new value depending on timing, and there is no guarantee about the
order two clients observe events in. If you need true linearizability, you need consensus
(Raft/Paxos), not quorums. Claiming "R+W>N gives strong consistency" is the classic wrong turn; it
gives **quorum consistency**, which is weaker.

### Latency, sloppy quorums, and intent

**Latency is bounded by the slowest node in the quorum.** A write with W=2 of N=3 waits for the
2nd-fastest replica. Raising W or R toward N makes latency track a higher tail percentile: with N=3,
R=3, one slow node (GC pause, hot disk) drags every read to its p99. Mitigate with
**speculative/hedged reads** (send to R+1, take the first R) and keep W and R as low as the
consistency requirement allows.

**Sloppy quorum and hinted handoff** trade consistency for availability. In a strict quorum, if the W
home replicas are unreachable, the write fails. A **sloppy quorum** writes to the next W healthy
nodes on the ring even if they are not the key's usual owners, storing a **hint** so those temporary
holders forward the data back once the rightful replicas recover. Writes stay accepted during
partitions at the cost of a window where a strict-quorum read might miss the value.

**Interview nuance, map numbers to intent:** W=N maximizes durability but breaks writes if any
replica is down. R=1, W=N gives fast reads and slow fragile writes. R=N, W=1 the reverse. W=1, R=1 is
fastest and weakest (no overlap). Also mention **flexible quorums** (write and read sets defined to
intersect without both being majorities) and **witness replicas** (vote for quorum without storing
full data, cutting storage cost while preserving overlap).

Recap: N/R/W is a per-operation dial, R+W>N forces read/write overlap so a read sees the latest
acknowledged write, but that is quorum consistency not linearizability, quorum latency tracks the
slowest node in the set, and sloppy quorum plus hinted handoff buy availability during partitions at
the cost of consistency.
`.trim()

const twoPcThreePcTeach = `
## No shared log, no single owner

A single-node database transaction is atomic because one process owns the commit decision and one
write-ahead log records it. The moment your transaction spans two independently-owned services or two
databases, there is no shared log and no single owner, so you need a protocol to make N participants
agree to commit or abort together. Two-phase commit (2PC) is that baseline, and every alternative in
this module is defined against it.

2PC has a **coordinator** and **participants**. Phase 1 (prepare/vote): the coordinator asks every
participant "can you commit?" Each participant does the work, writes it durably in a *prepared*
state, locks the affected rows, and votes yes or no. A yes vote is a binding promise: "I will commit
if you tell me to, even if I crash and restart." Phase 2 (commit/abort): if all voted yes, the
coordinator writes a commit record and tells everyone to commit; if any voted no, it broadcasts
abort. This guarantees atomicity: all commit or all abort.

### The fatal flaw: blocking

Between voting yes and hearing the decision, a participant holds locks and cannot unilaterally
decide. If the coordinator crashes *after* participants voted yes but *before* broadcasting the
decision, every participant is stuck: it cannot commit (maybe someone voted no) and cannot abort
(maybe everyone voted yes and the coordinator already told others to commit). They hold their locks
and wait. This is the classic in-doubt window, and it lasts as long as the coordinator is down.

\`\`\`
Coordinator          P1            P2
   |---- prepare ---->|             |
   |---- prepare ------------------>|
   |<---- yes --------|             |
   |<---- yes ----------------------|
   X (crash here)                       <- P1, P2 now BLOCKED holding locks
   |                 (wait...)     (wait...)
\`\`\`

The second problem is **throughput**. Locks are held across the *entire* protocol: multiple network
round trips plus disk forces. A single-node commit holds a lock for microseconds; a 2PC lock is held
for milliseconds to seconds across the fleet. Contended rows serialize behind it, so 2PC caps
concurrency hard. This is why it does not survive at internet scale.

**3PC** inserts a pre-commit phase so participants can time out and make progress if the coordinator
vanishes, reducing blocking. But it assumes a synchronous network with bounded delays; under a real
partition it can violate atomicity (different sides decide differently), so it is almost never used
in production.

**Interview nuance:** modern systems do not abandon 2PC, they *harden the coordinator*. Spanner and
CockroachDB run 2PC but replicate the coordinator's state via Paxos/Raft, so a coordinator crash is
just a failover to a replica that knows the decision, and the in-doubt window closes in seconds. XA
(the classic 2PC standard) is acceptable *within one cluster or trust domain* where the coordinator
is HA and latencies are bounded. It is a poor fit *across* independently-deployed microservices,
which is exactly why sagas exist.

Recap: 2PC guarantees cross-participant atomicity via prepare-then-commit, but a coordinator crash
after the vote leaves participants blocked holding locks, and lock-holding across the whole protocol
throttles throughput, so at scale you either replicate the coordinator with consensus or switch to
sagas.
`.trim()

const sagasTeach = `
## Local transactions, compensating undos

When a business transaction spans services and 2PC is too blocking, the standard answer is a
**saga**: a sequence of *local* transactions, one per service, where each step has a **compensating
action** that semantically undoes it. There is no global lock and no global commit. You make forward
progress step by step, and if a later step fails you run the compensations for the steps that already
succeeded, in reverse. A saga gives you **atomicity of outcome** (fully done or fully undone) but
crucially *not* isolation.

### Orchestration vs choreography

- **Orchestration:** a central orchestrator (a Temporal/Cadence workflow, an AWS Step Functions state
  machine) explicitly calls step 1, step 2, step 3, and on failure invokes the compensations. Pros:
  the flow lives in one place, easy to reason about, trace, and add timeouts/retries. Cons: the
  orchestrator is a component you must run and make reliable.
- **Choreography:** no central brain. Each service listens for events and reacts: Order emits
  \`OrderCreated\`, Inventory reacts and emits \`InventoryReserved\`, Payment reacts, and so on.
  Pros: highly decoupled. Cons: the end-to-end flow is *implicit*, scattered across services, hard to
  trace and debug, especially for compensations. Cyclic event dependencies sneak in.

Rule of thumb: choose **orchestration** for anything with more than a couple of steps, non-trivial
compensation logic, or where on-call must be able to see "where is this order stuck?" Choose
choreography only for short, simple, truly decoupled flows.

### The interview-critical property: no isolation

Between steps, intermediate states are *visible* to other transactions. In an order saga, inventory
is reserved (visible) before payment succeeds; another request can observe "reserved but unpaid."
This is a real anomaly a single ACID transaction would never expose. Manage it with
**countermeasures**:

- **Semantic lock:** mark a record with a pending/in-saga flag (order status \`PENDING\`) so others
  treat it as tentative.
- **Commutative updates:** design operations so order does not matter (increment/decrement rather
  than absolute set).
- **Reread / version check:** verify a version/state before compensating, so you compensate against
  current reality, not a stale snapshot.

### Compensations are their own hazard

A compensation **must be idempotent** (it may be retried) and it **may itself fail**. "Un-charge a
card" is fine as a refund, but "un-send an email" or "un-ship a package" is not truly reversible, so
you compensate *semantically* (issue a recall, send an apology, restock on return). For compensations
that fail: retries with backoff, a dead-letter queue, and ultimately operator escalation. This
durability and retry machinery is exactly what Temporal / Step Functions give you for free.

**Interview nuance:** the two things interviewers probe are (1) "sagas give atomicity but not
isolation, what anomaly does that allow and how do you contain it?" and (2) "what happens when a
compensation fails?" Concrete answers to both put you ahead of most candidates.

Recap: a saga chains local transactions each with a compensating undo, coordinated centrally
(orchestration, preferred for anything non-trivial) or via events (choreography); it guarantees the
outcome is all-or-nothing but exposes intermediate state, so you add semantic locks and version
checks, and make compensations idempotent with retries, DLQ, and escalation.
`.trim()

const outboxMessagingTeach = `
## The dual-write problem

Sagas and event-driven systems depend on a step that looks trivial and is not: "update my database
*and* publish an event." Doing both is the **dual-write problem**, and it has no atomic solution
across two independent systems without a distributed transaction.

Consider the naive code: write the order row to Postgres, then publish \`OrderCreated\` to Kafka. Two
failure orderings break you. If the service crashes *after* the DB commit but *before* the Kafka
publish, the order exists but no event was ever sent: downstream systems never hear about it, a
**lost event**. Flip the order (publish first, then write the DB) and a failed DB write leaves an
event for an order that does not exist: a **phantom event**. You cannot wrap a Postgres commit and a
Kafka publish in one atomic transaction, because they are separate systems with separate logs.

### The transactional outbox

Make the event part of the *same local database transaction* as the business data:

\`\`\`
BEGIN;
  INSERT INTO orders (...);                          -- business write
  INSERT INTO outbox (event_type, payload, ...);     -- event, SAME txn
COMMIT;                                              -- both or neither
\`\`\`

The order row and the "there is an event to publish" fact commit atomically, in one local transaction
in one database. A separate **relay** process reads unpublished outbox rows and publishes them to
Kafka, marking them sent after the broker acknowledges.

Two ways to run the relay:

- **Polling:** periodically \`SELECT ... FROM outbox WHERE published = false\` and publish. Simple,
  works anywhere, but adds polling latency and query load, and needs \`FOR UPDATE SKIP LOCKED\` to
  avoid double-scanning under concurrency.
- **Change Data Capture (CDC):** **Debezium** tails the database's write-ahead log and streams
  committed changes to Kafka directly. No polling, low latency, low DB load, more infrastructure.
  The production default at scale.

### At-least-once plus the inbox

The relay guarantees the event is published **at least once**: if it crashes after publishing but
before marking the row sent, it republishes on restart. So consumers can receive duplicates. The
**inbox** pattern closes this: the consumer records each processed event id in an inbox/dedup table
inside the same transaction as its side effect, and skips any id it has already seen. At-least-once
delivery plus an idempotent (inbox-backed) consumer equals **effectively-once** end-to-end
processing: the strongest realistic guarantee.

**Interview nuance:** be precise that the outbox does *not* give exactly-once *delivery*. It converts
"atomically write DB and publish" (impossible) into "atomically write DB and *record intent to
publish*" (a single local transaction), then relies on at-least-once relay plus consumer idempotency.
Interviewers love to hear the ordering-of-failures argument for why the naive dual write is broken.

Recap: writing the DB then publishing to Kafka is not atomic and either loses or fabricates events,
so write the event into an outbox table in the same local transaction and let a relay (polling or
Debezium CDC) publish it at least once, with a consumer-side inbox/dedup table making the end-to-end
result effectively-once.
`.trim()

const deliveryIdempotencyTeach = `
## The most misunderstood phrase in distributed systems

The correct mental model: **exactly-once delivery over an unreliable network is impossible;
exactly-once *effect* is achievable by combining at-least-once delivery with idempotency.**

The three delivery semantics:

- **At-most-once:** send and forget. No duplicates, but possible loss. Fine for a metric sample,
  fatal for a payment.
- **At-least-once:** send and retry until acknowledged. No loss, but if the ack is lost the sender
  retries and the receiver may process twice: **duplicates possible**.
- **Exactly-once (delivery):** each message delivered and processed once, no loss, no duplicates.
  Over a real network you cannot have this at the delivery layer.

Why impossible? Because acknowledgements can be lost too. Sender sends, receiver processes,
receiver's ack is dropped. The sender cannot distinguish "message lost" from "ack lost," so to avoid
loss it must retry, and retrying risks a duplicate. A consequence of the two-generals problem: no
finite exchange over a lossy channel makes both sides certain. So every real system that "cannot lose
data" runs **at-least-once** and deduplicates.

### The idempotency key

The client attaches a unique key to a request (\`Idempotency-Key: a1b2...\`, as Stripe does). The
server, on first receipt, does the work and **stores the result keyed by that idempotency key** (with
a TTL). On any retry with the same key, the server returns the stored result instead of redoing the
work. The effect happened exactly once even though the request arrived multiple times. The critical
detail: recording the key and performing the side effect must be **atomic** (same transaction), or a
crash between them reopens the double-execution window.

Distinguish the operation types:

- **Naturally idempotent:** \`SET balance = 5\`, \`PUT user.email = x\`, delete by id. Applying
  twice yields the same state: safe to retry with no machinery.
- **Non-idempotent:** \`balance = balance + 100\`, "charge $50," "append to list." Applying twice
  doubles the effect. Make them safe with an idempotency key plus stored result, or convert to
  conditional/versioned updates (compare-and-set, or a unique constraint on the operation id).

### Fencing tokens (Kafka EOS lives in Level 6)

One boundary to name and then hand off: **Kafka's "exactly-once semantics" (EOS)** convert
at-least-once into effectively-once, but only *within a Kafka-to-Kafka pipeline*, never for external
side effects like charging a card. Level 6's Kafka material owns that scoping in depth, so this lesson
states it in one line and keeps its own distinct ground: fencing tokens.

**Fencing tokens** protect against a different failure: a *stale* operation from a delayed or paused
actor. A process pauses (long GC), is presumed dead, a new one takes over, then the old one wakes and
issues a now-stale write. A monotonically increasing **fencing token** attached to each operation,
rejected by the storage layer if lower than the highest seen, neutralizes the zombie write.
Idempotency keys stop *duplicates of the same intent*; fencing tokens stop *stale operations from a
superseded actor*. Different problems, both needed.

**Interview nuance:** if you say "we use exactly-once delivery" you will get pushed. Say instead
"at-least-once delivery plus idempotent processing gives exactly-once *effect*," and name where the
dedup state lives and how it is made atomic with the side effect.

Recap: networks force at-most-once (may lose) or at-least-once (may duplicate); build exactly-once
*effect* with an idempotency key whose stored result is written atomically with the side effect; and
fencing tokens separately reject stale writes from a superseded actor (Kafka's own EOS scoping is
covered in Level 6's Kafka material).
`.trim()

const crdtsTeach = `
## How diverged replicas come back together

When you go AP you accept that replicas diverge, and you need a story for how they come back
together. The naive story is last-write-wins with a timestamp, which silently discards concurrent
edits. CRDTs (Conflict-free Replicated Data Types) are the disciplined answer: data structures whose
merge function is defined so that any two replicas that have seen the same set of updates are
byte-for-byte identical, with no conflict resolution and no coordination. That property is **Strong
Eventual Consistency (SEC)**: eventual consistency plus a guarantee that convergence is
deterministic.

The property that makes it work: the merge operation must be **commutative, associative, and
idempotent**. Order does not matter, grouping does not matter, and applying the same update twice is
harmless. Together these mean you can deliver updates in any order, duplicated, across an unreliable
network, and every replica lands in the same state. Merge is often a mathematical **join** on a
lattice (for a counter, element-wise max; for a set, union).

### The workhorse types

- **G-Counter / PN-Counter**: a grow-only counter is a vector of per-replica counts; the value is the
  sum, merge is element-wise max. A PN-Counter is two G-Counters (increments and decrements).
- **OR-Set (Observed-Remove Set)**: tags each add with a unique id so a concurrent add and remove
  resolve to "add wins" correctly. The set most people actually want.
- **LWW-Register**: a single value with a timestamp; simple, but it still *loses* concurrent writes
  by design.
- **RGA / sequence CRDTs**: ordered lists for collaborative text (the basis of Yjs and Automerge).

Costs are real and interviewers probe them. OR-Set elements carry add/remove tags, and removed
elements leave **tombstones** so a late-arriving add does not resurrect deleted data. Metadata and
tombstones grow, so you need **garbage collection**, which itself needs some coordination or a
causal-stability threshold. And CRDTs **cannot enforce global invariants**: "this username is
globally unique" or "the balance never goes negative" require agreement, and agreement is exactly
what CRDTs avoid. For invariants you need consensus.

### Anti-entropy: the part people forget

Convergence does not happen by magic. Replicas must actually exchange the updates they missed.
**Gossip**: each node periodically pushes/pulls state with a few random peers, so updates spread
epidemically in O(log n) rounds. **Merkle trees**: to compare a huge key range cheaply, each replica
hashes its data into a tree; two replicas swap root hashes and only descend into subtrees whose
hashes differ, finding the diverged ranges in log time. Dynamo and Cassandra use exactly this. Two
more mechanisms fill gaps: **read repair** (a read that sees stale replicas writes the fresh value
back) and **hinted handoff** (a down node's writes are held by a neighbor and replayed on return).

**Interview nuance:** the classic wrong turn is describing CRDTs and stopping. Without anti-entropy,
a write that lands on replica A during a partition never reaches replica B, so they never converge.
CRDTs give you a *safe merge*; gossip plus Merkle-tree reconciliation is what actually *delivers the
updates to merge*.

Recap: CRDTs give Strong Eventual Consistency because their merges are commutative, associative, and
idempotent, they cost metadata and tombstones and cannot enforce global invariants, and they only
converge if paired with anti-entropy (gossip, Merkle trees, read repair, hinted handoff).
`.trim()

const failureDetectionTeach = `
## "Is that node dead?" You can never know for sure

A dead node and a node that is merely slow (GC pause, network blip, overloaded NIC) look identical
from the outside: both go quiet. This is the **impossibility at the heart of failure detection**, and
it forces a tradeoff you must be able to name.

That tradeoff is **completeness vs accuracy**. Completeness means you eventually detect every real
crash. Accuracy means you never wrongly declare a live node dead. You cannot maximize both. Set your
timeout aggressively (500ms) and you detect crashes fast but you **flap**: a routine 800ms GC pause
evicts a healthy node, triggering a needless failover or re-replication storm. Set it conservatively
(30s) and you never false-positive but you carry dead nodes for half a minute, sending traffic into a
black hole.

The classic mechanism is a **fixed-timeout heartbeat**: node A pings B every second; three misses in
a row and B is declared dead. Simple, but the fixed threshold is exactly the flapping problem: a
threshold tuned for a quiet datacenter false-positives the moment latency rises under load, precisely
when you least want spurious failovers.

### Phi-accrual: adapt to the link

**Phi-accrual failure detection** (the Cassandra/Akka lineage) outputs a continuous **suspicion level
phi** instead of a boolean. It records the recent **inter-arrival times** of heartbeats and fits a
distribution. When a heartbeat is overdue, phi is the negative log of the probability that a
heartbeat this late is still normal for *this* link. A link that normally jitters by 50ms yields a
huge phi at a 2-second gap; a normally-bursty link yields a modest one. You act at a threshold (phi >
8 is roughly a 1-in-10^8 chance this is normal). The win: it adapts to each link's actual behavior
with no hand-tuning.

### SWIM: membership at scale

All-to-all heartbeats are O(n^2): 500 nodes each pinging 499 others is ~250k messages per interval.
**SWIM** makes per-node load **O(1)**. Each period, a node **directly probes one random peer**. If
that peer does not ack, the node asks **k other random members to probe it indirectly** (the target
might be fine but the direct path congested; indirect probes distinguish a path problem from a dead
node). Only if both fail does it act. Crucially, SWIM adds a **suspicion sub-protocol**: a
non-responsive node is marked **suspect**, not dead, gossiped as suspect, and given a window to
refute ("I'm alive") before being confirmed dead: sharply cutting false positives from transient
blips. Membership changes **piggyback on probe messages** and spread infection-style, so the whole
cluster learns in O(log n) rounds. This is what HashiCorp memberlist (Consul, Serf) implements.

\`\`\`
  all-to-all heartbeat:  n=500 -> ~250,000 msgs/interval  (O(n^2))
  SWIM per node/interval: 1 direct probe + k indirect on miss (O(1))
  suspect -> (refute window) -> confirm dead, gossiped on probe traffic
\`\`\`

**Interview nuance:** the tell of a weak answer is tuning a single timeout as if slow and dead were
distinguishable. The strong framing: pick an *adaptive* detector (phi-accrual), add a *suspicion*
window to buy accuracy, and use *gossip-based* membership (SWIM) so detection load stays flat as the
cluster grows.

Recap: dead and slow are indistinguishable, so failure detection is a completeness-vs-accuracy
tradeoff; use phi-accrual to adapt the threshold per link, a suspicion window to cut false positives,
and SWIM's random direct/indirect probes plus infection-style gossip to keep per-node load O(1).
`.trim()

const leaderElectionFencingTeach = `
## One leader, guaranteed, even when the network lies

Many systems need a **single active primary**: one node that owns writes, holds a lock, or
coordinates work. The hard part is not electing one, it is guaranteeing there is *never* a second one
acting at the same time, because the asynchronous network gives you no reliable way to tell a dead
primary from a slow one.

**Electing** is the easy half. Run it through a consensus system: **etcd, ZooKeeper, or Consul**, or
a Raft/Paxos group directly. The primary holds a **lease**: a time-bounded grant ("you are leader
until T+10s") it must renew. If renewals stop, the lease expires and a new election runs. Leases need
no per-request coordination, but they carry a hidden assumption: **bounded clocks and bounded
pauses**.

### The canonical failure

Leader L holds a 10-second lease and is mid-write. L suffers a **stop-the-world GC pause** (or the VM
is descheduled, or a disk stall) for 15 seconds. From everyone else's view, L went silent, its lease
expired, and a new leader L2 was elected and started writing. Then L **wakes up**. L does not know
time passed. It believes it still holds the lease and completes its in-flight write. Now **two
leaders** have both written: split-brain, and the data is corrupted. No clock was "wrong" and no bug
was hit; a legal pause alone produced two active leaders.

### Fencing tokens: enforce at the resource

Leases alone cannot fix this, because the paused leader's problem is that its own view of "do I still
hold the lease" is stale. The fix lives at the **resource**. Every time leadership is granted, the
coordinator hands out a **monotonically increasing number** (etcd revision, ZooKeeper zxid, a Raft
term). The leader attaches that token to **every write**. The storage layer **remembers the highest
token it has seen and rejects any write with a lower token**. When paused L wakes and writes with
token 33, storage has already accepted L2's token-34 writes and rejects L. This is the piece a
distributed lock *must* have: a lock that only tells the client "you have it" is unsafe, because the
client can be paused between acquiring and using it. This is exactly Martin Kleppmann's **critique of
Redlock**.

\`\`\`
  L holds lease, token=33 ----GC pause 15s---------------> writes(token=33) -> REJECTED
                        lease expires, elect L2, token=34 -> writes(token=34) -> accepted
  storage rule: accept iff token > highest_seen
\`\`\`

### Split-brain and partitions

Take a 5-node cluster split **3-2**. Consensus-based leadership requires a **majority quorum (3 of
5)**. The majority side can elect and keep a leader and stays **writable**; the minority side cannot
reach quorum, steps down, and refuses writes. This is the **CP** choice (Raft/etcd/ZooKeeper). The
**AP** alternative (Dynamo-style) lets both sides keep accepting writes and reconciles later with
CRDTs/version vectors. Either way, **fence the minority**: the losing side must be provably unable to
affect shared state. A 2-2 split of 4 nodes has no majority on either side, which is why consensus
clusters use **odd numbers**.

**Interview nuance:** the answer that gets you hired names *both* halves: consensus/lease for who
leads, and a **fencing token enforced at the storage layer** for why a paused old leader cannot
corrupt state. Stopping at "etcd elects a leader" fails the follow-up "what happens during a GC
pause?"

Recap: elect one leader via consensus and a lease, but because a GC pause can briefly create two
leaders, enforce fencing tokens (monotonic numbers the storage rejects if stale); on a 3-2 split the
majority stays writable (CP) or both sides reconcile (AP), and either way the minority is fenced.
`.trim()

const byzantineFaultToleranceTeach = `
## When nodes can lie

Most consensus you will design assumes the **crash-stop** failure model: a faulty node either follows
the protocol correctly or halts. It never *lies*. Under that model, **Raft and Paxos** tolerate f
failures with **2f+1** nodes, because any two majority quorums of f+1 overlap in at least one node
carrying the committed truth forward.

The **Byzantine** model drops the honesty assumption. A Byzantine node can send **wrong** values,
**equivocate** (tell node A "the value is X" and node B "the value is Y" in the same round), forge or
replay messages, selectively drop, or **collude** with other faulty nodes. The name comes from the
Byzantine Generals Problem: generals agreeing to attack or retreat while traitors send contradictory
orders. The crucial difference: a crash is *detectable-ish* (silence) whereas a lie is **actively
deceptive**: the node participates, so you cannot wait it out.

### Why 3f+1

To make a decision you need a quorum that (a) still forms even if the f liars refuse to participate,
and (b) is large enough that the honest members of any two quorums overlap despite the liars. With
**3f+1** total, a quorum of **2f+1** always contains at least **f+1 honest** nodes, so any two
quorums share at least one honest node, and honest nodes always **outvote** the f liars. Concretely:
tolerating 1 Byzantine node needs **4** nodes, not 3; tolerating 2 needs **7**. You pay f extra nodes
purely to survive lies rather than silence.

The other cost is **messages**. Because a node cannot trust a single report, classic BFT makes
everyone cross-check everyone: **O(n^2)** messages per decision, versus Raft's near-linear cost.
Protocols to name:

- **PBFT** (Castro-Liskov 1999): the classic. Three phases (pre-prepare, prepare, commit), a primary
  that proposes, and a **view-change** protocol to depose a faulty primary. O(n^2) messages.
- **Tendermint** (Cosmos): BFT with a rotating proposer, suited to proof-of-stake chains.
- **HotStuff** (Meta's former Diem): reduces message complexity to **linear O(n)** via threshold
  signatures and adds **pipelining**. The modern reference.

### The threat-model decision

BFT is justified when participants are **mutually distrusting or potentially compromised**: public
blockchains, some cross-organization financial settlement, hardware fault domains with undetectable
silent corruption. It is **over-engineering** when all nodes sit inside one trusted datacenter under
one operator: there, the realistic failures are crashes, disk faults, and partitions, not malice.
**Raft plus checksums (bit rot), TLS (tampering in transit), and authentication (unauthorized
actors)** covers the plausible threats at a fraction of BFT's node count and latency.

**Interview nuance:** the sophisticated answer is not "BFT is more robust so use it." It is a
threat-model decision: state who the participants are and whether any could be adversarial. If yes,
BFT (name HotStuff for scale). If one trusted operator, say so and pick Raft plus
checksums/TLS/auth.

Recap: crash-stop consensus (2f+1) assumes nodes may halt but never lie; the Byzantine model allows
lying, equivocation, and collusion, forcing 3f+1 nodes and often O(n^2) messages (PBFT, or linear
HotStuff); use BFT only across real trust boundaries and Raft plus checksums/TLS/auth inside one
trusted operator.
`.trim()

export const systemDesignLevel5: DesignLevel = {
  id: 5,
  slug: "distributed-core",
  title: "Level 5: Distributed Systems Core",
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
    {
      id: "sd-l5-m2",
      title: "Consistency & Time",
      description:
        "Place any system precisely on the consistency spectrum with its coordination cost, fix staleness bugs with the four session guarantees, order events without a shared clock, and treat clock drift as a correctness input.",
      lessons: [
        {
          id: "sd-l5-consistency-spectrum",
          title: "Consistency Models Spectrum",
          summary:
            "Linearizable, sequential, causal, eventual: name the exact model and its coordination cost, and always pick the weakest model that is still correct for the data.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["consistency-models", "linearizability"],
          teach: {
            markdown: consistencySpectrumTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l5-consistency-spectrum-apply",
            prompt:
              "Design the read path for a bank balance versus a social like-count, and for each pick the weakest consistency model that is still correct, justifying the choice.",
            thinkAbout: [
              "What separates linearizable, sequential, causal, and eventual?",
              "Why is causal the strongest model available under partition?",
              "Why is replication consistency a different axis from ACID isolation?",
            ],
            modelAnswerOutline: [
              "Assumptions: the bank balance drives overdraft decisions and is legally binding; the like-count is engagement UI that tolerates being off by a few for a few seconds.",
              "**Bank balance: linearizable reads.** The read a withdrawal or overdraft check depends on must reflect every committed write in real-time order, because two concurrent withdrawals both reading a stale positive balance is exactly how you double-spend. Serve balance reads from the leader (or a quorum read with R+W>N plus read-repair): a Spanner/CockroachDB-style or single-leader Postgres primary read. The price: leader-round-trip latency and lost availability on the minority side during a partition: correct, because a bank prefers rejecting a request over authorizing an overdraft.",
              "**The separate axis, stated:** that was the *replication* choice; on top of it the transfer still needs serializable *isolation* so the read-modify-write does not interleave. A system can have either without the other.",
              "**Like-count: eventual consistency.** A like is commutative (an increment), the exact value is not safety-critical, and users cannot tell 4,207 from 4,209 for a second. Serve from local replicas or an edge cache, accept per-replica counters that merge (a G-Counter CRDT or periodic aggregation), and let the number converge. Buys single-digit-ms local reads and full availability under partition. If 'did *I* like this?' must feel instant, that is a read-your-writes session guarantee on top, not linearizability for the global count.",
              "**Where causal fits:** threaded comments (a reply must not appear before the comment it answers): the strongest model that stays available under partition, sitting between the two examples.",
              "Common wrong turn: treating consistency as a binary and making the like-count linearizable 'to be safe,' forcing global coordination on the hottest write path for correctness nobody needs.",
            ],
          },
          practice: {
            id: "sd-l5-consistency-spectrum-practice",
            prompt:
              "Choose consistency models for Amazon's checkout flow at Prime Day scale (tens of thousands of orders/sec) across three surfaces: the shopping cart, the 'only 2 left in stock' inventory badge, and the final 'place order' decrement of real inventory. Justify the weakest correct model for each and name the anomaly you are accepting.",
            thinkAbout: [
              "Which surface is advisory UI and which holds a hard invariant?",
              "How do you scope the expensive coordination to a single hot key?",
              "What spreads contention when one SKU becomes the doorbuster?",
            ],
            modelAnswerOutline: [
              "Assumptions: cart is per-user, the stock badge is advisory UI, and final inventory must not oversell beyond a small tolerable margin.",
              "**Cart: eventual + causal per user.** The cart is Dynamo's canonical case: availability wins, writes accepted on any replica and merged. The accepted anomaly: temporary divergence and even a resurrected deleted item (Dynamo's add-to-cart bias), resolved by conflict merge (union add-to-cart, or vector-clock siblings). Within one user's session, add read-your-writes so their own add is instantly visible.",
              "**Stock badge ('only 2 left'): eventual.** Advisory. Serving from a cache that lags a few seconds is fine; the accepted anomaly is showing '2 left' when there is really 1 or 3. Making it linearizable would put a coordinated read on every product-page view at Prime Day scale: absurd.",
              "**Place-order decrement: linearizable, single-key.** The actual 'reserve one unit' must be a linearizable conditional decrement on the item's stock key (compare-and-set: decrement only if remaining > 0), so the (N+1)th sale of an N-stock item is never authorized. Scope the coordination to the single hot key (a per-item leader/partition or an atomic counter in a strongly consistent store): per-SKU coordination, not global.",
              "**The hot-SKU mitigation:** a doorbuster becomes a serialization point, so pre-allocate stock into per-shard buckets (sell 1000 units as 10 buckets of 100) to spread contention.",
              "**The through-line:** each surface gets the weakest model that keeps *its* invariant, with the anomaly named (stale badge, resurrected cart item) and real coordination spent only where overselling is unacceptable.",
            ],
          },
        },
        {
          id: "sd-l5-session-guarantees",
          title: "Client-Centric Session Guarantees",
          summary:
            "Fix per-client staleness bugs with the four Bayou session guarantees, implemented via sticky routing or version tokens, with tokens required for cross-device correctness.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["session-guarantees", "consistency"],
          teach: {
            markdown: sessionGuaranteesTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-session-guarantees-apply",
            prompt:
              "Add read-your-writes and monotonic-reads guarantees for a user who writes on their phone and moments later reads on their laptop, where writes go to the primary and reads are load-balanced across lagging replicas. Explain why sticky routing cannot deliver either guarantee across the two devices, and what has to change.",
            thinkAbout: [
              "Which guarantee does each user-visible symptom violate?",
              "How do sticky routing and version tokens implement them?",
              "Where do cross-device cases break sticky sessions?",
            ],
            modelAnswerOutline: [
              "Assumptions: a single primary handling writes, async read replicas lagging tens of ms normally and seconds under load, reads load-balanced across the pool. Bug reports: 'I saved it but it shows the old value' (read-your-writes violation) and 'I refreshed and my item count went down' (monotonic-reads violation).",
              "**Design with version tokens:** on every write, the primary returns the commit position (replication log LSN / commit timestamp). The client stores this token per user and sends it on every read; the read router picks a replica whose applied-LSN is at least the token's, waiting briefly or falling back to the primary if none has caught up. This gives read-your-writes, and because the token only moves forward, monotonic reads too. Advance the client's stored token to the max LSN seen on reads, not just writes, so monotonic-reads holds even for read-only sessions.",
              "**The cheaper, coarser alternative: sticky routing.** For N seconds after a write, route that user's reads to the primary via a signed cookie. One flag, no per-request LSN bookkeeping, covers most single-device cases. Ship stickiness first; add tokens where the guarantee must survive replica changes or long sessions.",
              "**Cross-device:** sticky-session state lives in one browser's cookie, so a write on the phone does nothing for a read on the laptop. Fix: carry the version token server-side, keyed on the user ('user U has committed up to LSN L' in Redis, checked on every read for U), converting a per-connection guarantee into a per-user one.",
              "Common wrong turn: promising read-your-writes while reading off async replicas with neither sticky routing nor a token. Replica lag guarantees a stale read some fraction of the time; 'we have replicas' does not fix it.",
            ],
          },
          practice: {
            id: "sd-l5-session-guarantees-practice",
            prompt:
              "Design session-guarantee handling for Twitter/X's 'compose tweet then land on your profile timeline' flow at read-replica scale (a fan-out timeline served from many geo-distributed cache and DB replicas), where a user commonly composes on mobile and immediately opens the web app, and must see their own new tweet at the top.",
            thinkAbout: [
              "Where must the 'user U wrote up to T' fact live for the phone-then-web case to work?",
              "How do you avoid making the whole timeline linearizable for one UX requirement?",
              "What keeps refresh and paging from revealing an earlier state?",
            ],
            modelAnswerOutline: [
              "Assumptions: writes go to a primary and fan out to timeline caches and geo replicas lagging ms to seconds; the user's own new tweet appearing instantly on their profile is a hard product requirement, cross-device.",
              "**Design:** the moment the tweet commits, the write path returns a commit token (tweet id plus commit timestamp/LSN) and, critically, records 'user U wrote up to token T' in a shared per-user marker in a fast global store (Redis / edge KV replicated to regions), not just the client. Any device opening U's profile reads the marker and requires its timeline read to reflect at least T; if the local replica or cache has not caught up, the read waits a bounded few hundred ms or falls back to the authoritative store for U's own tweets. Because the marker is per-user and server-side, the phone-then-web case works.",
              "**Monotonic reads across scrolling:** carry the highest observed token so paging and refresh never reveal an earlier state (no tweets vanishing on refresh).",
              "**Deliberately stay eventual for everyone else:** other users seeing the tweet a second or two later is fine and buys full availability and cheap fan-out.",
              "**The scale trick:** do not make the whole timeline linearizable. Special-case the author's own recent writes: prepend the just-written tweet from a small 'my recent tweets' authoritative read merged over the eventually-consistent fanned-out timeline. Read-your-writes only for your own content gives the instant-feedback UX while keeping the hot fan-out path eventually consistent.",
              "Common wrong turn: relying on client-side stickiness, which cannot survive the mobile-to-web device switch and leaves the user staring at a timeline missing the tweet they just posted.",
            ],
          },
        },
        {
          id: "sd-l5-logical-clocks",
          title: "Logical Time: Lamport & Vector Clocks",
          summary:
            "Lamport clocks give a causality-respecting total order but cannot detect concurrency; vector clocks detect it and surface siblings, at O(N) size with a GC problem.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["logical-clocks", "vector-clocks", "causality"],
          teach: {
            markdown: logicalClocksTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-logical-clocks-apply",
            prompt:
              "Use vector clocks to detect concurrent conflicting writes in a leaderless key-value store, and specify how the read path surfaces siblings.",
            thinkAbout: [
              "Why can Lamport clocks give a total order but not detect concurrency?",
              "What do vector clocks capture that Lamport clocks cannot?",
              "What is the O(N) cost and GC problem of vector clocks?",
            ],
            modelAnswerOutline: [
              "Assumptions: a Dynamo-style leaderless store, N replicas per key, writes accepted on any replica, clients that may write the same key from different replicas concurrently.",
              "**Why not Lamport:** a Lamport timestamp puts all writes in one total order, but it forces an order even between genuinely concurrent writes, and picking the 'later' value silently discards the other write. Since L(A) < L(B) does not imply A -> B, Lamport cannot even tell that two writes were concurrent, so the conflict cannot be detected, let alone resolved. The need is to distinguish 'B is an update built on A' from 'A and B are rival updates.'",
              "**Design with version vectors** keyed on the replica nodes (a small fixed set, not clients, to bound size). Every write bumps its replica's slot and carries the vector it derived from. When a write W with V_w arrives against stored V_s: if V_w dominates V_s, W is a strict successor: overwrite. If V_s dominates V_w, W is stale: drop. If neither dominates, W is concurrent: keep **both** as siblings under the same key.",
              "**Read path surfacing siblings:** on a read with multiple concurrent versions, return all siblings plus a context (the combined causal metadata). The application resolves (a merge function, an OR-Set CRDT for a cart, or LWW if truly acceptable) and writes back the merged value carrying the context, which dominates the siblings and collapses the conflict. Read-repair and hinted handoff propagate the resolution. Amazon's cart is the canonical example: concurrent add/remove become siblings merged by union so an item is never silently lost.",
              "**Costs acknowledged:** the vector is O(replica count) per key. The dangerous version keys the vector on clients, which grows unbounded as devices churn and cannot be safely garbage-collected (an actor might return), so key on the fixed replica set and prune with care.",
              "Common wrong turn: a Lamport total order (or a wall-clock timestamp) declaring the higher value the winner, claiming causality it cannot prove and silently dropping one of two concurrent writes.",
            ],
          },
          practice: {
            id: "sd-l5-logical-clocks-practice",
            prompt:
              "Design conflict detection and resolution for a collaborative note-taking app like Notion or Apple Notes syncing across a laptop, phone, and tablet that all edit the same note offline and reconnect, at a scale of millions of devices. Explain why plain vector clocks keyed on devices are a trap here and what you use instead.",
            thinkAbout: [
              "What happens to a device-keyed vector when the device population is huge and churning?",
              "What converts 'concurrent edit' into automatic convergence instead of a sibling to reconcile?",
              "Where can a small version vector still be used safely?",
            ],
            modelAnswerOutline: [
              "Assumptions: each device edits offline then syncs; the same note can be edited concurrently on multiple devices; users must never silently lose text; the device population is huge and churning.",
              "**The trap:** keying a version vector on devices is exactly the unbounded-growth failure. With millions of devices constantly added/reinstalled/retired, the vector per note grows without bound, every sync ships and compares a giant vector, and a retired device's slot cannot be safely garbage-collected because it might sync again. Pruning risks two later edits looking causally ordered when they were concurrent, corrupting merges.",
              "**What to use instead: make the data structure converge automatically with CRDTs.** Text becomes a sequence CRDT (RGA / Yjs / Automerge-style), where each character/block gets a unique, causally-stamped id and concurrent inserts merge by a deterministic total order, so all devices converge to the same document without a central coordinator and without losing anyone's text.",
              "**Causality inside the CRDT** is tracked with compact per-replica clocks and Lamport-style timestamps, and the CRDT's own GC (tombstone compaction after all peers acknowledge) bounds growth: no ever-growing device vector at the note level.",
              "**Where a small vector survives:** coarse whole-note metadata (title, last-edited) can use a small version vector keyed on a fixed server-side sync layer plus LWW, keeping the unbounded client set from ever becoming the ordering key.",
              "**The through-line:** vector clocks are the right idea (detect concurrency by causality, not wall clock), but at device-churn scale conflict handling moves into a CRDT that merges deterministically, so 'concurrent edit' becomes 'automatic convergence' instead of a sibling a human reconciles.",
            ],
          },
        },
        {
          id: "sd-l5-physical-time-hlc",
          title: "Physical Time, Clock Uncertainty, HLC & TrueTime",
          summary:
            "Wall-clock LWW silently drops writes under NTP skew; HLC gives causal, monotonic timestamps on commodity hardware, TrueTime's bounded interval plus commit-wait buys external consistency.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["hlc", "truetime", "clocks"],
          teach: {
            markdown: physicalTimeHlcTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l5-physical-time-hlc-apply",
            prompt:
              "Design correct timestamp ordering for a multi-region database where node clocks can drift, choosing between HLC and a TrueTime-style bounded-uncertainty approach.",
            thinkAbout: [
              "Why does last-writer-wins on wall-clock timestamps lose data?",
              "How do Hybrid Logical Clocks preserve causality near NTP time?",
              "What does TrueTime's commit-wait buy, and at what infra cost?",
            ],
            modelAnswerOutline: [
              "Assumptions: a multi-region OLTP database, nodes synced by NTP with tens of milliseconds of skew, and a requirement that concurrent writes to the same row are ordered correctly and no committed write is silently lost.",
              "**Naive wall-clock LWW is disqualified:** with tens of ms of skew, a node whose clock runs ahead can stamp a logically-stale write with a *higher* timestamp than a genuinely newer write on another node. LWW keeps the higher timestamp, so the newer write is discarded with no error. Any ordering scheme trusting a raw now() comparison across nodes is unsafe.",
              "**Default choice: HLC** for a system on commodity cloud (NTP only). Each timestamp is (physical, logical): physical tracks NTP, logical breaks ties. On every send/receive, take the max of local and incoming, bumping the logical counter if the physical part did not move. Guarantees that if A causally precedes B then HLC(A) < HLC(B), so causally related writes never invert, and timestamps stay near real time for MVCC snapshot reads. The CockroachDB/Mongo approach, no special hardware.",
              "**What HLC alone lacks:** external consistency. Two causally unrelated writes in different regions can still order in a way a wall-clock observer finds surprising, so where strict serial order is needed, add explicit coordination (a Raft commit on the range plus an uncertainty-interval read-retry, as CockroachDB does).",
              "**When to pay for TrueTime:** if you own the datacenters and genuinely need global external consistency, deploy GPS + atomic clocks, expose time as a bounded interval [earliest, latest] with a few-ms epsilon, and use commit-wait: hold locks and delay the commit ack until the timestamp is guaranteed past everywhere. Converts uncertainty into a small bounded latency and buys linearizability, at the cost of specialized hardware in every datacenter.",
              "**Decision:** HLC by default (no hardware, causal + monotonic, with a small coordination add-on); TrueTime-style bounded uncertainty + commit-wait only when you control the hardware and require global external consistency. Common wrong turn: plain LWW on wall-clock timestamps, which under realistic NTP skew silently drops writes.",
            ],
          },
          practice: {
            id: "sd-l5-physical-time-hlc-practice",
            prompt:
              "Choose a clock/timestamp strategy for a globally distributed ledger like a payment-transaction store spanning us-east, eu-west, and ap-south at ~50K writes/sec, where transactions must be totally ordered for audit and a lost or misordered write is a financial correctness bug. Justify HLC versus TrueTime and address the residual skew window.",
            thinkAbout: [
              "Where does the authoritative total order come from when clocks cannot be trusted?",
              "What closes the residual skew window on reads in the commodity-cloud design?",
              "What makes commit-wait the natural fit for a ledger?",
            ],
            modelAnswerOutline: [
              "Assumptions: append-heavy ledger, cross-region, strict audit requirement (a globally agreed order of transactions), zero tolerance for dropped or inverted writes. The stakes rule out naive LWW immediately: at 50K writes/sec across three regions with NTP skew, wall-clock LWW would misorder and drop writes constantly, each one a financial bug.",
              "**On a major cloud (NTP only):** use HLC for causal/monotonic timestamps, but HLC alone does not give the external total order auditors want, so layer ordering on consensus: each ledger shard is a Raft/Paxos group, writes go through the leader, and the replicated log IS the authoritative total order (HLC rides along for MVCC and human-readable ordering, not as the source of truth). Cross-shard atomicity uses a coordinated commit.",
              "**Close the residual skew window on reads** with CockroachDB's trick: an uncertainty interval around each read timestamp; if a read encounters a value written within the interval it cannot safely order, it restarts at a higher timestamp, never returning a result that violates the real order. Correctness on commodity hardware, paying consensus latency rather than clock hardware.",
              "**On owned datacenters:** deploy TrueTime-style GPS + atomic clocks and use commit-wait: stamp each committed transaction and wait out epsilon (a few ms) before acknowledging, so any later transaction gets a strictly higher timestamp and the timestamp order IS the true global order: no read-restart dance. What Spanner does, and the natural fit for a ledger, at the cost of clock hardware in every region and ~epsilon per commit.",
              "**Decision:** for a financial ledger the external total order is worth the most robust available option: TrueTime + commit-wait on owned hardware; HLC + per-shard consensus + uncertainty-interval read restarts on commodity cloud. Either way the total order comes from a bounded-uncertainty clock or from consensus, never from a bare wall-clock comparison.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l5-m3",
      title: "Consensus & Coordination",
      description:
        "Replicating a service correctly reduces to agreeing on an ordered log; reason through Raft across a leader crash, and pick concrete N/R/W quorum settings while naming exactly what consistency you get.",
      lessons: [
        {
          id: "sd-l5-smr-total-order",
          title: "State-Machine Replication & Total-Order Broadcast",
          summary:
            "Identical replicas come from deterministic commands applied in one agreed order; that order is total-order broadcast, equivalent to consensus, with snapshots bounding the log.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["smr", "total-order-broadcast"],
          teach: {
            markdown: smrTotalOrderTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-smr-total-order-apply",
            prompt:
              "Design a replicated state machine for a key-value store and explain why an ordered replicated log is the core primitive.",
            thinkAbout: [
              "Why do deterministic, ordered ops give identical replicas?",
              "Why is atomic broadcast equivalent to consensus?",
              "How do snapshots bound log growth?",
            ],
            modelAnswerOutline: [
              "Assumptions: a 3- or 5-replica KV store that must survive node crashes and serve linearizable reads/writes, commodity hosts in one region, a few thousand writes per second.",
              "**Model each replica as a deterministic state machine:** state is the key-value map, commands are SET/DELETE/compare-and-swap. The core decision: replicas never talk about state directly. They agree on a single ordered log of commands and apply it in index order. Because the state machine is deterministic, applying the same commands in the same order from the same start produces byte-identical maps: consistency is a consequence of ordering, not something maintained separately.",
              "**Getting the agreed order IS total-order broadcast**, which is equivalent in power to consensus, so implement the log with a consensus protocol (Raft in practice): a leader assigns each command a monotonically increasing index, replicates to a majority, and only then marks it committed; replicas apply committed entries in index order.",
              "**Correctness rule 1, determinism:** any nondeterministic input (timestamps, random values, TTL expiry moments) must be resolved by the leader and written INTO the log entry, so every replica uses the recorded value. Apply that reads the local clock or map iteration order silently diverges despite an identical log: the classic wrong turn. **Rule 2, idempotent replay:** applying an entry twice after a crash must be safe, so track the last-applied index durably.",
              "**Snapshots stop unbounded log growth:** periodically serialize the entire map plus the covered log index, persist, truncate the log up to that index. A restarting or newly joined replica installs the latest snapshot and replays only the tail.",
              "**Tradeoffs:** writes cost a round trip to a majority (higher latency than a single node); reads come from the leader for linearizability or followers for stale-but-cheap. The payoff: node crashes never lose committed data and replicas cannot disagree.",
            ],
          },
          practice: {
            id: "sd-l5-smr-total-order-practice",
            prompt:
              "Explain how Apache Kafka replicates a partition and why its design is state-machine replication in disguise, then identify the one place Kafka deliberately trades away strict SMR semantics for throughput.",
            thinkAbout: [
              "What plays the role of the log index and the commit point in a Kafka partition?",
              "Why does Kafka not need per-record consensus like Raft?",
              "Which configuration combination can lose acknowledged records?",
            ],
            modelAnswerOutline: [
              "Assumptions: a topic partition with replication factor 3, one leader and two followers, high write throughput (hundreds of MB/s).",
              "**A Kafka partition IS an ordered, append-only log: the SMR primitive made explicit.** The leader assigns each record a monotonically increasing offset (the log index). Followers pull records in order and append; the leader advances the high-water mark only once records are replicated to the in-sync replica (ISR) set. Consumers read only up to the high-water mark, so every replica and consumer observes the same records in the same offset order: total-order broadcast over that partition.",
              "**Why no per-record consensus:** the 'state machine' is trivial (append the byte record), so Kafka needs agreement on the log and on who the leader is, not Raft per record. Leader/ISR metadata historically lived in ZooKeeper; KRaft now runs an actual Raft log for it. The split: metadata consensus is strict (Raft), data replication is leader + tunable ISR acks: exactly how Kafka gets correctness where it matters and multi-GB/s throughput where strict consensus per record would be too slow.",
              "**The deliberate trade:** Kafka does not use a strict majority quorum for data. With acks=all, a write is acknowledged once all *current ISR* members have it, and ISR can shrink to just the leader under failures. Leaving min.insync.replicas=1 and allowing unclean leader election means a lagging replica can become leader and truncate acknowledged records: durability sacrificed for availability and throughput.",
              "**The safe configuration:** acks=all with min.insync.replicas=2 on RF=3 and unclean election disabled, restoring majority-like overlap. Log growth is bounded with retention and log compaction: the streaming analog of SMR snapshots (compaction keeps the latest value per key).",
            ],
          },
        },
        {
          id: "sd-l5-raft-paxos",
          title: "Consensus in Depth: Raft (and the Paxos Family)",
          summary:
            "Randomized-timeout election, majority-quorum commit, and four safety properties make committed entries immortal; minority partitions stall safely and clusters should be odd-sized.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["raft", "paxos", "consensus"],
          teach: {
            markdown: raftPaxosTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l5-raft-paxos-apply",
            prompt:
              "Walk through how Raft keeps a 5-node cluster consistent across a leader crash: cover election, log replication, and what happens to an uncommitted entry.",
            thinkAbout: [
              "How does randomized-timeout election avoid split votes?",
              "What is the commit rule, and why do majority quorums guarantee overlap?",
              "How does a minority partition behave, and why is an even cluster wasteful?",
            ],
            modelAnswerOutline: [
              "Assumptions: 5 nodes (S1 to S5), S1 is the term-4 leader, clients write through the leader, majority is 3.",
              "**Normal replication:** a client sends SET x=5 to S1, which appends it at the next log index in term 4 and sends AppendEntries to S2-S5. When at least 3 nodes (including S1) have persisted it, S1 marks it committed, applies it, and returns success. The commit rule: durable once a majority holds it. Any two majorities of 5 share at least one node, and any future leader election also needs 3 votes: at least one voter held the committed entry with an up-to-date log, so the entry propagates forward and cannot be lost.",
              "**Leader crash and election:** S1 dies. S2-S5 stop hearing heartbeats; after randomized election timeouts, one (say S3) fires first, increments the term to 5, votes for itself, and requests votes. Randomized timeouts mean nodes rarely become candidates simultaneously, so split votes are rare; when one happens, nobody reaches 3 and nodes retry with fresh random timeouts. Critically, votes are granted only to a candidate whose log is at least as up to date, so a node missing committed entries can never win. S3 collects 3 votes and resumes replication as term-5 leader.",
              "**The uncommitted entry:** S1 had appended SET y=9 in term 4 but crashed before a majority stored it: never committed, client never told it succeeded. S3's AppendEntries consistency check detects the mismatch and overwrites the dangling entry on any follower holding it. Correct precisely because no client observed it as durable; a *committed* entry, by contrast, survives via leader completeness.",
              "**Minority partition:** if S1 returns but is partitioned with only S2, it cannot reach majority 3, so it appends locally but never commits. On heal it sees term 5 > 4, steps down, truncates its uncommitted tail.",
              "**Cluster size:** 5 is odd and tolerates 2 failures; a 4-node cluster tolerates only 1 (majority still 3) while wasting a machine. The 2-node trap: one failure leaves no majority and the system hangs.",
            ],
          },
          practice: {
            id: "sd-l5-raft-paxos-practice",
            prompt:
              "Design the coordination layer for a Kubernetes-style control plane storing cluster state in etcd across three regions with 80ms inter-region round-trip latency. Explain how you place the Raft members, what write latency you should expect, and how you avoid the split-brain and stale-read pitfalls.",
            thinkAbout: [
              "Which member placement guarantees no single region holds a majority?",
              "What is the physical floor on write latency across 80ms links?",
              "How do you serve a linearizable read without trusting a possibly-deposed leader?",
            ],
            modelAnswerOutline: [
              "Assumptions: etcd runs a single Raft group holding all control-plane state, read-heavy but writes must be strongly consistent, three regions A/B/C with ~80ms RTT.",
              "**Member placement:** a 5-member cluster spread so no single region holds a majority: 2 in A, 2 in B, 1 in C. Majority is 3, so losing any one region still leaves at least 3 reachable members and the cluster stays writable. Putting 3 members in region A means an A failure loses the majority and the control plane goes read-only: the placement mistake to avoid. Be precise about the budget, because interviewers push here: five members tolerate 2 failures total, so losing a 2-member region leaves exactly the majority of 3 with zero margin, and one more node going down (a crash, or a routine restart during the outage) takes the control plane read-only. Five members (not 3) buys tolerance of 2 independent node failures instead of 1; it does not buy slack once a 2-member region is gone. If the requirement is genuinely 'survive a region loss and still tolerate a node failure', no 5-member layout over 3 regions delivers it: that needs a wider spread, such as 5 members across 5 regions or 9 members as 3/3/3.",
              "**Write latency:** every committed write needs the leader plus a majority to persist, and members are cross-region, so a commit costs one inter-region round trip to the nearest quorum member: expect tens of milliseconds per write (order 40-80ms), far above a single-region cluster. Pin the leader to the region with the most members, use etcd leases and batching, and if that latency is unacceptable, the honest answer is that strong consensus across 80ms links has a floor: the fix is fewer cross-region hops (regional clusters federated), not pretending Raft is free.",
              "**Split-brain:** Raft makes it impossible: a partitioned minority (region C's single member, or a 2-member island) can never reach majority 3, so it cannot elect a leader or commit, and it steps down on heal. Disable any unclean/forced reconfiguration that could manufacture a second majority.",
              "**Stale reads:** follower reads can lag committed state. For linearizable reads, route through the leader with a ReadIndex confirmation (the leader verifies it is still leader via a heartbeat quorum before serving), accepting the latency. Where staleness is tolerable (dashboards, watches), allow serializable follower reads for speed. The wrong turn: serving follower reads and calling them consistent.",
            ],
          },
        },
        {
          id: "sd-l5-quorums-tunable",
          title: "Quorums & Dynamo-Style Tunable Consistency",
          summary:
            "R+W>N forces read/write overlap (quorum consistency, NOT linearizability); latency tracks the slowest quorum member, and sloppy quorums buy availability during partitions.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["quorums", "tunable-consistency", "dynamo"],
          teach: {
            markdown: quorumsTunableTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-quorums-tunable-apply",
            prompt:
              "Choose N/R/W for a session store that must survive one AZ loss and still serve fast reads, and state the consistency you actually get.",
            thinkAbout: [
              "What does R+W>N guarantee, and what does it NOT guarantee?",
              "Why is quorum latency bounded by the slowest node?",
              "How do sloppy quorum and hinted handoff trade consistency for availability?",
            ],
            modelAnswerOutline: [
              "Assumptions: a session/token store on a Dynamo-style system across 3 AZs, read-heavy (every request validates a session), writes on login/refresh, must tolerate losing one full AZ, reads must be single-digit ms, and rare briefly-stale reads are acceptable.",
              "**Choose N=3, one replica per AZ, W=2, R=2.** R+W = 4 > N = 3, so every read quorum overlaps every write quorum in at least one node: a read is guaranteed to see at least one copy of the latest acknowledged write.",
              "**AZ-loss survival:** losing an AZ removes exactly one replica. W=2 still succeeds (two AZs remain) and R=2 still succeeds, so reads and writes keep working through a full AZ outage. W=3 would maximize durability but a single AZ loss would halt all writes: the tradeoff consciously avoided.",
              "**What you actually get: quorum consistency, not linearizability.** A read sees the latest acknowledged write, but concurrent writes to the same session (a login racing a refresh) can create conflicting versions reconciled by LWW timestamp or version vectors, and two clients are not guaranteed a single real-time order. Fine for a session store where tokens are effectively immutable per issuance. Linearizable semantics would require a consensus-backed store, deliberately not chosen to keep reads fast.",
              "**Latency:** both R and W wait on the 2nd-fastest of 3 replicas, so latency tracks a moderate tail, not the slowest node (which R=3 would). Protect read p99 with hedged reads (query all 3, take the first 2).",
              "**Availability under partition:** enable sloppy quorum + hinted handoff so that if two home replicas are briefly unreachable, writes land on the next healthy nodes and forward back on recovery: favoring availability (a login should not fail on a transient blip) at the cost of a small window where a strict read might miss the newest value.",
            ],
          },
          practice: {
            id: "sd-l5-quorums-tunable-practice",
            prompt:
              "Design the replication settings for a Cassandra-backed IoT telemetry store ingesting 500k writes/sec from sensors across two regions, where writes must almost never be rejected but analytics reads can tolerate seconds of staleness. Choose consistency levels and explain what breaks if a region is partitioned.",
            thinkAbout: [
              "Why does LOCAL_QUORUM beat EACH_QUORUM for the never-reject-writes requirement?",
              "Where does R+W>N hold in this design, and where deliberately not?",
              "What reconciles the regions after a partition heals?",
            ],
            modelAnswerOutline: [
              "Assumptions: Cassandra, time-series telemetry keyed by sensor+time, 500k writes/sec, append-mostly, batch analytics reads tolerating staleness. Two regions, each a datacenter with per-region replication factor 3 (N=6 total).",
              "**Write path: LOCAL_QUORUM** (2 of the 3 local replicas), optimizing for write availability. Writes stay fast and confined to one region's replicas (no cross-region latency on the write path) and survive one local replica being down. Avoid EACH_QUORUM (needing a quorum in both regions): a single-region blip would reject writes, violating the requirement. CL=ONE would be even faster but LOCAL_QUORUM is the right durability/availability balance.",
              "**Read path: LOCAL_QUORUM or LOCAL_ONE** for speed. Because writes and reads are both LOCAL_QUORUM within a region, R+W>N holds *within the region* (2+2>3), so intra-region reads see the latest local write. Cross-region propagation is asynchronous and lags by replication delay: fine for batch analytics.",
              "**Partition behavior:** if the regions partition, each keeps accepting LOCAL_QUORUM writes independently (the deliberate AP choice: never reject telemetry), and the regions diverge for the duration. Cassandra reconciles on heal via hinted handoff (hints stored for the unreachable region, replayed later), read repair, and anti-entropy repair, with last-write-wins by timestamp resolving conflicts. For append-only telemetry keyed by time, conflicts are rare and LWW is safe.",
              "**What 'breaks':** cross-region read consistency during the partition: a global query misses the other region's just-written points until heal, absorbed by the seconds-of-staleness tolerance.",
              "Common wrong turn: demanding EACH_QUORUM or SERIAL (lightweight-transaction) consistency here, tanking throughput and rejecting writes during exactly the partition you most need to keep ingesting through.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l5-m4",
      title: "Distributed Transactions",
      description:
        "Atomicity across independently-owned services: why 2PC blocks at scale, how sagas trade isolation for progress, how the outbox kills the dual-write problem, and why exactly-once is an application property.",
      lessons: [
        {
          id: "sd-l5-2pc-3pc",
          title: "Distributed Transactions: 2PC / 3PC & Their Limits",
          summary:
            "2PC gives atomicity via prepare-then-commit, but a coordinator crash after the vote blocks participants holding locks; harden the coordinator with consensus or use sagas.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["2pc", "distributed-transactions"],
          teach: {
            markdown: twoPcThreePcTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-2pc-3pc-apply",
            prompt:
              "Design an atomic transfer of $100 across two independently-owned services (an Accounts service and a Ledger service, each with its own database) and explain why classic 2PC is a poor fit, including the exact failure that blocks it.",
            thinkAbout: [
              "What blocks participants when the coordinator crashes after prepare?",
              "Why is holding locks across the protocol a throughput killer?",
              "How do modern systems harden the coordinator?",
            ],
            modelAnswerOutline: [
              "Assumptions: two services, two databases, separately deployed and possibly separately owned. The transfer must be atomic. Show the 2PC design first, then argue it is the wrong tool.",
              "**The 2PC version:** a coordinator runs the transfer. Phase 1: 'prepare: debit $100 from A' to Accounts and 'prepare: credit $100 to B' to Ledger. Each performs the write in a prepared state, locks the affected rows, and votes yes only if it can durably guarantee the commit. Phase 2: on all-yes, the coordinator writes a commit record and broadcasts commit; on any no, abort and both roll back. True atomicity.",
              "**The exact blocking failure:** both vote yes, then the coordinator crashes before broadcasting the decision. Both services are in-doubt: they hold row locks and cannot decide alone. Accounts cannot commit (Ledger might have been told to abort) and cannot abort (the coordinator may have durably decided commit and told others). Account A's balance is locked until the coordinator recovers: an unbounded in-doubt window.",
              "**Throughput cost:** balance-row locks are held across two full round trips plus disk forces (milliseconds to seconds, not microseconds). Any other transfer touching account A serializes behind it; for a hot account this collapses concurrency.",
              "**Hardening, if 2PC were insisted upon:** replicate the coordinator's log via Raft/Paxos so a crash is a fast failover to a replica that already knows the decision (the Spanner/CockroachDB approach). Keep XA only inside one cluster with bounded latency.",
              "**What to actually build across independently-owned services: a saga.** Accounts commits the debit locally and emits an event, Ledger commits the credit locally, and if the credit fails a compensating transaction re-credits A. No cross-service locks, no coordinator in-doubt blocking. The trade: strict isolation (a brief window where the debit is visible without the credit) for availability and throughput: right across service boundaries.",
              "Common wrong turn: proposing 2PC across microservices and stopping there, without naming the coordinator-crash blocking window or the lock-held-across-the-protocol throughput hit.",
            ],
          },
          practice: {
            id: "sd-l5-2pc-3pc-practice",
            prompt:
              "Explain how a system like Google Spanner or CockroachDB runs 2PC across shards at global scale without the classic coordinator-blocking problem crippling it, and quantify roughly where the latency goes. Lead with the mechanism that removes the blocking.",
            thinkAbout: [
              "What makes the coordinator's decision survive its own crash?",
              "How long is the in-doubt window after the fix, and why?",
              "Why do architects still keep transactions single-shard when possible?",
            ],
            modelAnswerOutline: [
              "Assumptions: a horizontally-sharded SQL database where one transaction can touch rows on multiple shards, each shard replicated across zones/regions.",
              "**The mechanism: consensus under the 2PC.** Each shard is a Raft/Paxos group. The 2PC coordinator is not a single process: it is one of the participant groups, and its transaction record is written through Raft, replicated to a majority before the protocol proceeds. When the leader coordinating the commit crashes, a new leader elected in that Raft group *already has the committed transaction record in its log*, knows the decision, and finishes the protocol. The in-doubt window shrinks from 'until a single coordinator recovers' to one leader-election round (single-digit seconds), and correctness is never lost because the decision was durable in a majority before anyone acted on it.",
              "**Locks and isolation:** participants still take write locks during prepare, but each shard's writes are replicated via its own consensus group, so a prepared state survives replica failure. Spanner adds TrueTime commit-wait to order transactions globally: a deliberate few-ms wait for clock uncertainty.",
              "**Where the latency goes:** a multi-shard commit pays one WAN round trip for prepare to reach each participant leader, a Raft majority-replication round trip inside each shard to make prepare durable, then the commit phase and its replication. Cross-region, each consensus round trip is tens of ms, so a global multi-shard write is often 50-150 ms versus sub-millisecond for a single-shard local write. The price of strict serializability at global scale.",
              "**The tradeoff:** atomic, strongly-consistent, non-blocking distributed transactions, paying extra WAN round trips and consensus replication on every distributed commit. The wrong turn: assuming Spanner 'solved' 2PC for free. It made every role consensus-backed and accepted higher commit latency, which is why architects keep transactions single-shard whenever possible.",
            ],
          },
        },
        {
          id: "sd-l5-sagas",
          title: "Sagas: Orchestration vs Choreography & Compensation",
          summary:
            "Chain local transactions with compensating undos: atomicity of outcome without isolation, contained by semantic locks, with idempotent compensations backed by retries and a DLQ.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["saga", "compensation", "orchestration"],
          teach: {
            markdown: sagasTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l5-sagas-apply",
            prompt:
              "Design an order-checkout saga that reserves inventory, charges payment, and books shipping across three services, with compensations, and specify the exact behavior when payment fails after inventory has already been reserved.",
            thinkAbout: [
              "What does a saga give (atomicity of outcome) and NOT give (isolation)?",
              "Orchestration vs choreography: which do you pick and why?",
              "How do you handle non-idempotent or failing compensations?",
            ],
            modelAnswerOutline: [
              "Assumptions: three services (Inventory, Payment, Shipping), each with its own database; the checkout must not double-charge, must not sell inventory it cannot ship, and must release held stock on failure. Strict cross-service ACID is off the table.",
              "**Coordination: orchestration** with a durable workflow engine (Temporal or Step Functions). Checkout has multiple steps, real compensation logic, and on-call needs 'where is this order?' A central orchestrator makes the flow explicit with built-in retries, timeouts, and durable state. Choreography would scatter this across event handlers and make the failure path hard to trace.",
              "**Forward path:** (1) Inventory reserves the items (local txn, stock marked reserved for this order); (2) Payment charges the card (local txn with an idempotency key so retries do not double-charge); (3) Shipping books the delivery. Each step commits locally; the orchestrator advances on success.",
              "**The specified failure, payment fails after inventory reserved:** the orchestrator catches it and runs compensation for the one completed step: Inventory.release(orderId) un-reserves the stock, and the order is marked FAILED. Payment never succeeded, so nothing to refund. The compensation is idempotent (releasing an already-released reservation is a no-op keyed on orderId), so a retry is safe.",
              "**The missing isolation:** between step 1 and the failure, inventory is reserved-but-unpaid and visible. Contain it with a semantic lock: the order sits in PENDING, the reservation is explicitly a hold with a TTL, not a sale; a stalled saga auto-releases via the TTL so stock is not stranded, and availability counts treat reserved-pending as tentative.",
              "**Failing / non-reversible compensations:** if Inventory.release fails, retry with backoff; persistent failure goes to a DLQ and pages an operator, with durable workflow state guaranteeing the owed release is never forgotten. Refunds are semantic compensations (idempotent by key). Shipping, once a label prints, may not be reversible, so its compensation is a cancellation/recall, and charge-then-ship sequencing ensures shipping never precedes cleared payment.",
              "Common wrong turn: treating the saga as if it had isolation (exposing reserved-but-unpaid inventory as sold), or ignoring that a compensation can fail with no retry/DLQ/escalation path.",
            ],
          },
          practice: {
            id: "sd-l5-sagas-practice",
            prompt:
              "Design the booking saga for a service like Expedia or Booking.com that reserves a flight, a hotel, and a rental car from three independent third-party suppliers in one trip, where any supplier can be slow or reject the booking and some confirmations are effectively non-reversible. Lead with the deliverable, then walk the compensation and isolation strategy.",
            thinkAbout: [
              "How do hold-then-confirm APIs change the compensation story?",
              "Where do you sequence the non-reversible step, and why?",
              "What do you do when a supplier call times out ambiguously?",
            ],
            modelAnswerOutline: [
              "Assumptions: three external suppliers, each its own API with its own latency and failure behavior, no shared transaction, some confirmations (a non-refundable fare) that cannot be cleanly undone. Goal: a trip books fully or the customer is left in a clean, refunded state.",
              "**Deliverable: an orchestrated saga with a durable workflow per trip** (Temporal or equivalent), one workflow instance per booking, calling each supplier as an activity with per-supplier timeouts and retries. Durable state is essential because a trip can span minutes and the process must survive orchestrator restarts.",
              "**Ordering to minimize irreversible exposure:** sequence the hardest-to-reverse or most-likely-to-fail step so failures are cheap. Prefer suppliers that support two-step hold-then-confirm: hold all three (reversible), then confirm. Holds are semantic locks with supplier-side TTLs: the isolation mechanism, since an expired hold auto-releases and a stalled saga does not strand supplier inventory.",
              "**Compensation:** if the car fails after flight and hotel are held, cancel the flight and hotel holds (idempotent, keyed on booking id). If a supplier only supports confirm (no hold) and the fare is non-refundable, place that step last; if an earlier reversible step later fails after this non-reversible confirm, compensate semantically (rebook the failed leg, offer credit, escalate to an agent) and never silently drop the customer's money.",
              "**Slow/uncertain suppliers:** timeouts are ambiguous (did the booking happen?), so every call carries an idempotency key, and on timeout QUERY the supplier for booking status rather than blindly retrying, avoiding a double-booking. Failed compensations retry with backoff, then DLQ and page ops.",
              "**The trade:** no isolation across suppliers means a customer can briefly see a partially-booked trip: contained with holds/TTLs and a PENDING trip status. Wrong turn: firing all three confirmations in parallel with no holds, so a single rejection leaves confirmed, non-refundable bookings you cannot cleanly undo.",
            ],
          },
        },
        {
          id: "sd-l5-outbox-messaging",
          title: "Transactional Messaging: Outbox, Inbox & CDC",
          summary:
            "The dual write either loses or fabricates events; write the event to an outbox in the same local transaction, relay it at-least-once, and dedupe with a consumer inbox.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["outbox", "cdc", "messaging"],
          teach: {
            markdown: outboxMessagingTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-outbox-messaging-apply",
            prompt:
              "Guarantee that an OrderCreated event is published if and only if the order row commits, without using a distributed transaction between the database and the message broker.",
            thinkAbout: [
              "Why is writing to the DB then to Kafka not atomic?",
              "How does the outbox table make it atomic?",
              "Why is at-least-once + idempotent consumers the realistic end-to-end guarantee?",
            ],
            modelAnswerOutline: [
              "Assumptions: an Order service on Postgres publishing to Kafka, downstream consumers (fulfillment, email, analytics) that must react to every real order and never a phantom one, no XA/2PC between Postgres and Kafka.",
              "**Why the naive dual write is broken:** commit the order then publish, and a crash in between commits the order but loses the event (fulfillment never runs). Publish first then commit, and a failed DB commit fabricates an event for a nonexistent order. Postgres and Kafka have separate logs: no atomic 'commit both.'",
              "**The outbox design:** in the SAME Postgres transaction that inserts the order, insert a row into an `outbox` table with the event type, payload, aggregate id, and a unique event id. The transaction commits both or neither, so 'an event exists to be published iff the order committed' holds atomically in one local transaction.",
              "**Publishing:** a relay ships outbox rows to Kafka. At scale, Debezium CDC tailing the Postgres WAL turns committed outbox inserts into Kafka records with low latency and no polling load; the simpler alternative is a polling relay using `SELECT ... FOR UPDATE SKIP LOCKED` to claim rows. Either way the relay is at-least-once: a crash after Kafka acks but before marking the row published means a republish on restart.",
              "**Effectively-once end to end:** consumers can see duplicates, so each is idempotent. Every event has a stable event_id, and each consumer keeps an inbox/dedup table: within the same transaction as its side effect, it checks whether the event_id was already processed and skips if so.",
              "**Tradeoffs:** an extra table, a relay to operate, a little publish latency. Partition Kafka by aggregate id (order id) so per-order events stay ordered. Prune published outbox rows.",
              "Common wrong turn: publishing to Kafka and committing the DB as if that pair were atomic, or claiming the outbox gives exactly-once *delivery*: it gives an atomic local write plus at-least-once delivery, and idempotent consumers finish the job.",
            ],
          },
          practice: {
            id: "sd-l5-outbox-messaging-practice",
            prompt:
              "Design the change-propagation pipeline for a service like Shopify or an e-commerce platform that must reliably fan out every product/inventory change from its OLTP database to a search index (Elasticsearch), a cache (Redis), and an analytics warehouse, at tens of thousands of writes per second, with no lost or fabricated updates. Lead with the deliverable.",
            thinkAbout: [
              "Why does tailing the WAL structurally eliminate both lost and fabricated updates?",
              "How do three sinks of very different speeds stay independent?",
              "What makes replays and duplicates harmless at every sink?",
            ],
            modelAnswerOutline: [
              "Assumptions: a Postgres/MySQL OLTP store as the source of truth, three async downstream consumers (search, cache, warehouse), 10k-50k writes/sec peak, and a hard requirement that every committed change reaches all three and no rolled-back change ever does.",
              "**Deliverable: CDC-driven propagation with idempotent consumers.** Make the OLTP database's committed WAL the single source of change truth and stream it with Debezium, rather than asking application code to dual-write to four systems (four dual-write problems at once). Debezium emits exactly the committed changes in commit order: a rolled-back transaction never reaches the WAL, and a committed one always does: structurally eliminating both lost and fabricated updates.",
              "**Topology:** Debezium publishes change events into Kafka, one topic per table (or an outbox topic for curated event shapes), partitioned by product id so all changes to one product stay ordered on one partition. Three independent consumer groups: an Elasticsearch sink (idempotent upserts), a Redis updater, and a warehouse loader (micro-batched sink). Independent consumers mean a slow warehouse never blocks search.",
              "**Correctness under at-least-once:** on restarts, events replay. Every consumer is idempotent: use the change's LSN/offset or a per-row version, applying an event only if newer than what was last applied for that key (upsert with a version guard). Replays and duplicates become harmless and per-product ordering is preserved.",
              "**Scale and lag:** scale Kafka partitions and consumer instances horizontally; CDC keeps DB overhead low (reads the WAL, not the tables). Monitor replication lag (WAL-to-consumer delay) as the key freshness SLO. Backfills use a Debezium snapshot then switch to streaming.",
              "Common wrong turn: the app writing to Postgres, then Elasticsearch, then Redis, then the warehouse in sequence, where any crash between writes silently desynchronizes the systems.",
            ],
          },
        },
        {
          id: "sd-l5-delivery-idempotency",
          title: "Delivery Semantics, Idempotency & Exactly-Once Reality",
          summary:
            "Exactly-once delivery is impossible; build exactly-once effect from at-least-once plus idempotency keys stored atomically with the side effect, with fencing tokens for stale actors.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["delivery-semantics", "idempotency", "exactly-once"],
          teach: {
            markdown: deliveryIdempotencyTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-delivery-idempotency-apply",
            prompt:
              "Make a payment-charge API safe to retry, so that a client which times out and retries the same charge never double-charges the customer.",
            thinkAbout: [
              "Why is true network exactly-once impossible?",
              "How do idempotency keys with a stored result achieve effectively-once?",
              "What do fencing tokens protect against?",
            ],
            modelAnswerOutline: [
              "Assumptions: a `POST /charges` API over HTTP, clients that time out and retry, and a hard requirement of at most one actual charge per intended payment.",
              "**Why exactly-once delivery is off the table:** a timed-out client cannot tell whether the charge succeeded and the response was lost, or the request never landed. To avoid losing a legitimate charge it must retry, and retrying risks a duplicate: acks can be lost like requests, and no protocol makes both sides certain in finite messages. So: at-least-once transport, dedup at the application.",
              "**Idempotency-key design:** the client generates a unique key per payment intent (a UUID reused across retries of the SAME charge). Server logic: (1) look up the key; (2) if present and completed, return the stored response verbatim: no second charge; (3) if present but in-flight (a concurrent retry), return 409/'processing' or block on a lock so two retries do not both execute; (4) if absent, insert the key in PENDING state (a unique constraint makes concurrent first-requests race-safe: exactly one wins), perform the charge, and store the result under the key in the same transaction that records completion.",
              "**The crux is the atomicity in step 4:** recording the key and committing the charge must be one transaction, or a crash between them lets a retry re-charge. Also validate that a reused key carries the same request parameters, rejecting a key reused for a different amount (Stripe does this).",
              "**TTL and storage:** keys live in a durable store with a TTL covering realistic client retry windows (24h).",
              "**Fencing, a different risk:** idempotency keys stop duplicate submissions of the same intent, not a stale actor. A worker that pauses (GC), is presumed dead, is replaced, then wakes and tries to finalize is a zombie write: attach a monotonically increasing fencing token and have the ledger reject any token lower than the highest seen. Also idempotency-key the downstream processor call so the retry to *them* is deduped too.",
              "Common wrong turn: claiming 'exactly-once delivery' as a network guarantee, or recording the idempotency key in a separate step from the charge so a crash in between still double-charges.",
            ],
          },
          practice: {
            id: "sd-l5-delivery-idempotency-practice",
            prompt:
              "Design end-to-end effectively-once processing for a service like Uber's payment pipeline, where a trip-completed event flows through Kafka to a billing consumer that charges the rider's card and credits the driver, at high throughput, and neither the rider double-charge nor the driver double-credit is acceptable even under consumer restarts and Kafka rebalances. Lead with the guarantee you actually provide.",
            thinkAbout: [
              "Where exactly does Kafka EOS stop covering you in this pipeline?",
              "What makes a redelivered event a no-op at the billing consumer?",
              "How does the external processor call survive a consumer crash mid-charge?",
            ],
            modelAnswerOutline: [
              "Assumptions: TripCompleted events in Kafka, a billing consumer performing *external* side effects (charge the rider via a payment processor, credit the driver's ledger), high volume, inevitable consumer crashes and rebalances causing redelivery.",
              "**The guarantee provided:** not 'exactly-once delivery' but at-least-once delivery plus idempotent processing = exactly-once effect. Kafka EOS covers the pipeline (idempotent producer + transactional offset commits), but the moment the consumer charges an external processor, EOS no longer covers the side effect: application idempotency handles the money movements.",
              "**Producer side:** the trip service produces TripCompleted with a stable event id = trip id and Kafka's idempotent producer, so producer retries do not duplicate records within Kafka. Partition by rider id (or trip id) for ordering.",
              "**Consumer side (the real protection):** treat every event as possibly-redelivered (a rebalance can reprocess a handled-but-uncommitted offset). For each event, run an idempotent transaction against the billing DB: check an inbox/dedup table for trip_id; if already processed, skip and commit the offset; if not, perform the charge and driver credit and record trip_id as processed in the SAME database transaction. Redelivery after a crash finds the trip processed and does nothing.",
              "**External call idempotency:** the processor charge carries idempotency key = trip_id, so a consumer crash after calling the processor but before recording completion is safe: the retry hits the processor with the same key and is deduped: the card is charged once. The driver credit is a ledger append guarded by a unique constraint on trip_id.",
              "**The trade:** a dedup-table lookup and a durable idempotency store on the hot path, accepting that ordering plus idempotency, not magic delivery, makes it safe. Wrong turn: trusting Kafka 'exactly-once' to cover the external card charge and driver credit, which it does not, so a rebalance re-runs the side effects and someone gets double-charged.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l5-m5",
      title: "Membership & Failure Handling",
      description:
        "Converge replicas without coordination via CRDTs and anti-entropy, detect crashes without falsely evicting slow nodes, prevent split-brain with leases and fencing tokens, and know when BFT is justified.",
      lessons: [
        {
          id: "sd-l5-crdts",
          title: "CRDTs, Strong Eventual Consistency & Anti-Entropy",
          summary:
            "Commutative, associative, idempotent merges give deterministic convergence, at the cost of tombstones and no global invariants, and only with anti-entropy delivering the missed writes.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["crdt", "anti-entropy", "gossip"],
          teach: {
            markdown: crdtsTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l5-crdts-apply",
            prompt:
              "Design the merge logic for a collaboratively-edited counter and set that converge with no coordination under concurrent offline edits, and the background mechanism that reconciles missed writes.",
            thinkAbout: [
              "What operation properties make CRDTs converge without conflict resolution?",
              "What do CRDTs cost (metadata, tombstones), and where can they not help?",
              "How do gossip and Merkle trees reconcile divergent replicas cheaply?",
            ],
            modelAnswerOutline: [
              "Assumptions: N replicas (mobile clients plus servers), each editing offline, no central coordinator, deterministic convergence required on reconnect. Every replica has a stable id.",
              "**Counter: a PN-Counter.** Two maps keyed by replica id, one for increments (P), one for decrements (N); the value is sum(P) - sum(N). Merge is element-wise max on both maps. Max is commutative, associative, and idempotent, so merges apply in any order, duplicated, from any peer, and always land on the same state. Each replica only increases its own slot, so concurrent increments on different devices both survive: no lost update, which LWW would not guarantee.",
              "**Set: an OR-Set.** Each add(x) attaches a unique tag (replica id + monotonic counter); remove(x) records the tags it observed into a tombstone set. An element is present if it has at least one add-tag not in the removed set: add-wins semantics, so a concurrent add and remove resolves to present because the new add carries a tag the remover never saw. Merge is union of add-tags and union of removed-tags.",
              "**The cost and its GC plan:** tags and tombstones accumulate, so GC tombstones once an update is causally stable (every replica has acknowledged it), tracked with a version vector.",
              "**Anti-entropy (the part people forget):** each node gossips every second with a few random peers (push/pull), spreading updates epidemically. For large state, replicas build a Merkle tree over the keyspace, exchange root hashes, and recurse only into differing subtrees, finding divergent ranges in log time. Add read repair and hinted handoff so reads heal stale replicas and writes to a briefly-down node replay on return.",
              "**The limitation stated:** CRDTs cannot enforce 'unique username' or 'balance >= 0': those need consensus. And the common wrong turn: defining the merge but omitting anti-entropy, leaving post-partition replicas permanently divergent.",
            ],
          },
          practice: {
            id: "sd-l5-crdts-practice",
            prompt:
              "Design the sync and conflict model for a Notion-style collaborative document editor supporting real-time co-editing by up to 50 users plus fully offline edits that merge on reconnect, targeting sub-100ms local edit latency and no lost keystrokes.",
            thinkAbout: [
              "Why do array indices fail for concurrent inserts, and what replaces them?",
              "What role does the server play when the CRDT merge is the arbiter?",
              "What bounds metadata growth in a long-lived document?",
            ],
            modelAnswerOutline: [
              "Assumptions: rich-text documents (nested blocks, formatting), 50 concurrent editors, offline clients reconnecting hours later, and correctness means every client converges with no dropped edits.",
              "**Document body: a sequence CRDT** (RGA or Automerge/Yjs-style). Each character or block gets a globally unique, densely-orderable position id (a fractional index or tree-path id) rather than an array index, so concurrent inserts at 'position 5' on two clients do not collide: both ids are unique and totally ordered, so the merged order is deterministic. Deletes leave tombstones so a concurrent insert next to a deleted character still lands correctly. This is what lets an offline client type for an hour and merge cleanly, with no operational-transform server rewriting operations.",
              "**Formatting:** an OR-Set of marks over character ranges, so concurrent formatting is add-wins and never flickers. **Block structure:** a move-aware tree CRDT to avoid cycles when two users reparent concurrently.",
              "**Transport:** while online, clients send small op deltas over a WebSocket relay for sub-100ms echo; the server is a dumb fan-out and durability layer, not an arbiter, since the CRDT merge is associative and idempotent. Offline edits queue in IndexedDB and replay on reconnect. Anti-entropy on reconnect: client and server exchange state vectors (per-replica clocks) and ship only missing ops: the practical Merkle-diff for op logs.",
              "**Costs and mitigations:** tombstones and position metadata bloat long-lived docs, so compact periodically once history is causally stable across live replicas, and snapshot the materialized doc so new joiners do not replay the full op log. The trade: CRDT metadata makes on-wire and at-rest size larger than the visible text: the price of coordination-free offline merge.",
              "Common wrong turn: array-index operational transform with a central server: it breaks under long offline windows and is far harder to make correct than a sequence CRDT.",
            ],
          },
        },
        {
          id: "sd-l5-failure-detection",
          title: "Failure Detection: Heartbeats, Phi-Accrual & SWIM",
          summary:
            "Dead and slow are indistinguishable, so use phi-accrual's adaptive suspicion, a refutation window, and SWIM's O(1) probes with gossip instead of one fixed timeout.",
          estimatedMinutes: 30,
          difficulty: "hard",
          skills: ["failure-detection", "swim", "gossip"],
          teach: {
            markdown: failureDetectionTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l5-failure-detection-apply",
            prompt:
              "Design failure detection for a 500-node cluster that detects real crashes within a few seconds without falsely evicting nodes during latency spikes.",
            thinkAbout: [
              "Why is the completeness-vs-accuracy tradeoff fundamental?",
              "How does phi-accrual adapt to the inter-arrival distribution?",
              "Why does SWIM scale where all-to-all heartbeats do not?",
            ],
            modelAnswerOutline: [
              "Assumptions: 500 nodes, occasional latency spikes (GC pauses, load bursts) up to ~1s, and a high cost for false eviction (re-replication and failover). Target: detect real crashes within a few seconds with near-zero false positives.",
              "**Reject all-to-all heartbeats:** at 500 nodes that is ~250k messages per interval, growing quadratically. Use a SWIM-style gossip membership protocol (memberlist, as in Consul/Serf): per-node detection load is O(1), each period a node directly probes one random peer.",
              "**Avoid evicting slow-but-alive nodes with two SWIM mechanisms:** (1) indirect probes: if a direct probe to X times out, ask k (say 3) other random members to probe X; if any succeeds, X is alive and the direct path was congested: kills most false positives from transient blips. (2) A suspicion window: a node failing direct and indirect probes is marked suspect, gossiped as suspect, and given a refutation window (a couple of probe periods) to broadcast 'I'm alive' before confirmation: absorbing a 1-second GC pause without eviction.",
              "**The timeout itself is phi-accrual,** not fixed: the threshold adapts to each link's recent inter-arrival distribution (a jittery link gets a looser effective timeout than a steady one) with no hand-tuning. Act on suspicion at phi ~8.",
              "**Membership state** (join, suspect, confirm, leave) piggybacks on probe messages and spreads infection-style, so with a ~1s probe period the cluster converges on a change in O(log 500): a handful of rounds, giving few-second detection.",
              "**The trade:** the suspicion window and indirect probes add a second or two to confirming a real crash, in exchange for far fewer false evictions: right when a false positive triggers expensive re-replication. Common wrong turn: tuning one aggressive timeout, which flaps the instant latency rises under load.",
            ],
          },
          practice: {
            id: "sd-l5-failure-detection-practice",
            prompt:
              "Design membership and failure detection for a 100,000-node edge fleet spread across 300 points of presence on flaky WAN links, where a false eviction re-shards traffic and a missed crash black-holes user requests. Keep control-plane traffic bounded and detection under ~10 seconds.",
            thinkAbout: [
              "Why does flat gossip over 100k nodes on WAN links fail, and what bounds it?",
              "What distinguishes membership-driven re-sharding from data-path request routing?",
              "How do you stop one bad WAN path from evicting a healthy remote node?",
            ],
            modelAnswerOutline: [
              "Assumptions: 100k nodes across 300 PoPs, high and variable WAN latency between PoPs, low latency within a PoP, and both false positives (needless re-shard) and false negatives (black-holed requests) costly.",
              "**Hierarchical, locality-aware membership:** flat SWIM over 100k nodes would gossip cross-PoP too aggressively. Within each PoP, nodes run SWIM with a short probe period (sub-second LAN), so intra-PoP crashes are detected in 1-2 seconds. Across PoPs, a small set of gateway/seed nodes per PoP gossip PoP-level membership summaries at a slower cadence: cross-WAN traffic is O(PoPs), not O(nodes). Per-node load stays O(1); cross-PoP load scales with 300, not 100k.",
              "**Phi-accrual is essential on flaky WAN links:** a fixed LAN-tuned timeout would false-positive constantly. Phi-accrual learns each cross-PoP link's inter-arrival distribution, so a normally-1s-jittery link is not evicted at 1.2s. Widen the suspicion window for cross-PoP suspicions specifically, and require both direct and indirect probes routed through a *different PoP* before confirming a remote node dead, so a single bad WAN path cannot evict a healthy remote node.",
              "**Do not rely on membership alone at the data path:** because false negatives black-hole requests, the load balancer also runs active health checks and passive outlier detection (Envoy-style ejection after N consecutive 5xx/timeouts), draining traffic from a bad node in a couple of seconds even before membership confirms the crash. Membership drives placement/re-sharding; data-path health checks drive request routing: together, fast request-level protection with conservative membership changes.",
              "**The trade:** hierarchy and wider cross-PoP suspicion windows add a second or two to confirming remote crashes, accepted because a WAN false positive re-shards 300 PoPs' worth of traffic. Common wrong turn: one flat gossip mesh with one global timeout: it floods the WAN and flaps endlessly on jittery links.",
            ],
          },
        },
        {
          id: "sd-l5-leader-election-fencing",
          title: "Leader Election, Leases, Fencing & Split-Brain",
          summary:
            "A GC pause can create two leaders despite a valid lease, so enforce monotonic fencing tokens at the storage layer; on a 3-2 split the majority leads and the minority is fenced.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["leader-election", "fencing", "split-brain"],
          teach: {
            markdown: leaderElectionFencingTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l5-leader-election-fencing-apply",
            prompt:
              "Design a single-active-primary system so that when the primary is wrongly suspected and a new one is elected, the old primary cannot corrupt shared state, and specify behavior on a 3-2 partition.",
            thinkAbout: [
              "How can a GC pause make a live leader look dead and cause two leaders?",
              "What do fencing tokens do that leases alone cannot?",
              "How does a 5-node cluster behave when split 3-2?",
            ],
            modelAnswerOutline: [
              "Assumptions: a 5-node control group coordinating writes to shared storage, one active primary at a time, and correctness means shared state is never corrupted by two concurrent writers. Safety outranks brief unavailability.",
              "**Election and lease:** elect the primary through etcd/ZooKeeper or a Raft group. The primary holds a ~10s lease it must renew (a session/lock key kept alive). If renewals stop, the lease expires and a new primary is elected. No per-write coordination: the hot path stays fast.",
              "**Why leases are not enough:** a lease assumes bounded pauses, and that fails. A 15-second stop-the-world GC pause expires the lease, a new primary is elected, and then the old one wakes still believing it is leader and completes an in-flight write: two writers, split-brain, from a perfectly legal pause.",
              "**Fencing, the core of the answer:** make the storage layer the enforcer. Each leadership grant carries a monotonically increasing fencing token (etcd revision, ZooKeeper zxid, Raft term). The primary stamps it on every write; storage tracks the highest token accepted and rejects anything lower. The paused old primary wakes, writes with token 33, and is rejected because token-34 writes already landed. Only the resource, remembering the newest token, can catch a leader whose own view is stale. A lock without this is unsafe: the Redlock trap.",
              "**3-2 partition:** consensus needs a majority (3 of 5). The 3-node side keeps or elects a leader and stays writable; the 2-node side cannot reach quorum, steps down, refuses writes (the CP choice). On heal, the minority rejoins and catches up; any stale write attempts are rejected by the token rule. Odd cluster size guarantees a majority side exists.",
              "**The trade:** the minority is unavailable during the partition, accepted to guarantee a single writer.",
            ],
          },
          practice: {
            id: "sd-l5-leader-election-fencing-practice",
            prompt:
              "Design leader election and fencing for a distributed job scheduler like a Kubernetes controller-manager or a cron system where exactly one active scheduler may assign jobs, running 5 replicas across 3 availability zones, so that a network partition or a 30-second scheduler pause can never cause a job to run twice.",
            thinkAbout: [
              "Where must fencing be enforced so a paused scheduler's stale claim fails?",
              "What second net catches a duplicate even after fencing?",
              "How does the AZ layout interact with etcd quorum?",
            ],
            modelAnswerOutline: [
              "Assumptions: 5 scheduler replicas across 3 AZs, jobs assigned by writing to a shared datastore (etcd or SQL), and 'runs twice' is the failure to prevent. Brief scheduling delay is acceptable.",
              "**Leader lease:** leader election on etcd, literally how the Kubernetes controller-manager works: a Lease object renewed every few seconds with a leader-elect duration and renew deadline. One replica schedules; others idle and watch. If the leader stops renewing (crash, partition, pause), a standby acquires the lease. 5 replicas across 3 AZs means a single-AZ failure still leaves an etcd majority and a live standby.",
              "**Fencing at the effect, not just the lock:** a 30-second pause can let a standby take over while the paused leader still thinks it is scheduling. Each leadership term carries a monotonic token (etcd lease revision / term counter), and job claims are written with a compare-and-set conditional write: assigning job J succeeds only if J is unclaimed AND the token is the highest seen. The woken old leader's stale-token CAS fails, so it cannot double-assign.",
              "**Idempotent execution as the second net:** each job carries a stable idempotency key (job id + scheduled-time bucket); workers do a conditional insert on that key, so any residual duplicate assignment is deduplicated at execution and the job runs at most once per tick. Fencing prevents two schedulers competing; the idempotency key prevents any residual duplicate from executing.",
              "**Partition behavior:** etcd requires majority, so only the quorum side can hold the lease and schedule; the minority's schedulers cannot renew and go passive. On heal, stale claim attempts are rejected by the token CAS.",
              "**The trade:** a few seconds of no-scheduling during failover (lease timeout plus acquire) in exchange for never double-running a job. Common wrong turn: trusting the lease alone: a bare leader lock without fencing plus idempotent claims will double-schedule the instant the leader pauses past its lease.",
            ],
          },
        },
        {
          id: "sd-l5-byzantine-fault-tolerance",
          title: "Byzantine Fault Tolerance & BFT Consensus",
          summary:
            "Byzantine nodes lie and equivocate, forcing 3f+1 nodes and heavier messaging (PBFT, linear HotStuff); use BFT only across real trust boundaries, Raft plus checksums/TLS inside one.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["consensus", "distributed-systems", "fault-tolerance"],
          teach: {
            markdown: byzantineFaultToleranceTeach,
            estimatedMinutes: 14,
          },
          apply: {
            id: "sd-l5-byzantine-fault-tolerance-apply",
            prompt:
              "Explain how you would decide whether a system needs Byzantine fault tolerance, contrast the crash-stop and Byzantine failure models, and describe how BFT consensus tolerates malicious nodes.",
            thinkAbout: [
              "What can a Byzantine node do that a crash-stopped node cannot?",
              "Why does BFT need 3f+1 nodes where crash-tolerant consensus needs only 2f+1?",
              "When is BFT justified, and when is it expensive over-engineering?",
            ],
            modelAnswerOutline: [
              "Assumptions: a replicated state machine agreeing on an ordered log of operations. The design question is entirely about who the participants are and whether any could be adversarial or compromised.",
              "**The two models:** crash-stop means a node follows the protocol or halts, never lies: Raft/Paxos tolerate f failures with 2f+1 nodes because any two majority quorums overlap in a node carrying the committed value. Byzantine means a faulty node can lie, equivocate (different values to different peers in the same round), forge messages, or collude. The difference that matters: a crash is passive and detectable by absence; a Byzantine fault is active deception: the node keeps talking, so you cannot wait it out and cannot trust any single report.",
              "**How BFT tolerates lies, the 3f+1 math:** honest nodes must cross-check and vote. To tolerate f liars you need 3f+1 total and quorums of 2f+1: every quorum contains at least f+1 honest nodes, so (a) a quorum still forms if the liars withhold votes, and (b) any two quorums overlap in at least one honest node, so honest nodes always outvote the liars and the system cannot split into two inconsistent decisions. Tolerating 1 Byzantine fault needs 4 nodes, not Raft's 3, and classically O(n^2) messages. PBFT implements this with pre-prepare/prepare/commit and a view-change to depose a faulty primary; HotStuff cuts messaging to linear with threshold signatures and pipelines decisions.",
              "**The decision is a threat-model call:** participants spanning a trust boundary (mutually distrusting orgs, a public network, hardware domains with undetectable corruption) justify BFT (HotStuff for scale). All nodes inside one datacenter under one operator face crashes, disk faults, and partitions, not malice: Raft plus checksums (bit rot), TLS (tampering in transit), and authentication covers the actual threats far more cheaply.",
              "Common wrong turn: reaching for BFT or a blockchain inside a single trusted org: paying f extra nodes and O(n^2) messaging to defend against malicious insiders the trust boundary already excludes.",
            ],
          },
          practice: {
            id: "sd-l5-byzantine-fault-tolerance-practice",
            prompt:
              "Choose a consensus/fault-tolerance approach for a consortium payment network where 10 competing banks each run a node, must agree on a shared ledger, no single bank is trusted to be honest, and a compromised or cheating bank must not be able to forge or reorder settled transactions. Justify the node count and protocol, and contrast with what you would use if one bank operated all 10 nodes.",
            thinkAbout: [
              "How many Byzantine banks can 10 nodes tolerate, and what quorum size follows?",
              "Why permissioned BFT over proof-of-work for settlement?",
              "What changes the moment one operator owns every node?",
            ],
            modelAnswerOutline: [
              "Assumptions: 10 nodes, one per competing bank, mutually distrusting, agreeing on a shared settlement ledger; a cheating or compromised bank must not forge, double-spend, or reorder committed transactions; finality matters and throughput is modest.",
              "**A genuine Byzantine setting:** the participants are adversarial by construction (competitors), so any node might lie or equivocate. Crash-tolerant consensus (Raft) is disqualified because it assumes honesty: a single cheating bank could equivocate and break agreement. Use permissioned BFT: HotStuff (as in Diem) or Tendermint, for linear message complexity, pipelining, and immediate finality (no probabilistic rollback).",
              "**Node count:** BFT tolerates f faults with 3f+1. With 10 nodes, 3f+1 <= 10 gives f = 3: safe and live as long as at most 3 of the 10 banks are Byzantine. Quorums are 2f+1 = 7, so every commit requires 7 signatures, guaranteeing at least 4 honest nodes in any quorum and overlap across quorums. Transactions are signed and hash-chained, so no node can forge another's transaction or reorder a committed block without breaking signatures.",
              "**Why not proof-of-work:** PoW gives only probabilistic finality and wastes energy; a permissioned consortium knows its 10 members, so identity-based BFT with signatures is faster, cheaper, and gives the instant finality settlement needs.",
              "**The single-operator contrast:** if one bank owned all 10 nodes in its own datacenter, there is no adversarial trust boundary: the threat is crashes and hardware faults. Drop BFT entirely: Raft (or a 5-node etcd/Spanner-style group) plus checksums, TLS, and authentication, tolerating f crashes with 2f+1: dramatically cheaper in nodes, latency, and messaging.",
              "Common wrong turn: running BFT or a blockchain for a single trusted operator: paying for Byzantine resilience against a threat that operator boundary already excludes.",
            ],
          },
        },
      ],
    },
  ],
}
