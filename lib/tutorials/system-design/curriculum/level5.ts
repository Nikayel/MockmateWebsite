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

One more axis people conflate. **Replication consistency** (this spectrum: how up-to-date are the
copies) is *not* the same as **ACID isolation** (serializable, snapshot, read-committed: how
concurrent transactions interleave). Spanner is linearizable *and* serializable; a system can be one
without the other. Naming which axis you mean is a fast credibility signal.

Recap: name the specific model (linearizable, sequential, causal, eventual) and its coordination
cost, remember causal is the strongest model available under partition, keep replication consistency
separate from ACID isolation, and always reach for the weakest model that is still correct.
`.trim()

const sessionGuaranteesTeach = `
## Most "the app feels broken" bugs are not deep

A user updates their profile photo, the page reloads, and the old photo is back. They post a comment,
refresh, and it is gone. Nothing is corrupted; a read hit a replica that had not caught up. The fix
is not global linearizability. It is the four **client-centric session guarantees** (from the Bayou
system), which promise consistency *relative to one client's own view* rather than globally. That is
usually exactly what the product needs, and it is far cheaper.

The setup that causes the pain: writes go to a **primary**, reads are served from **asynchronous read
replicas** that lag by anywhere from a few milliseconds to seconds. Each guarantee patches one
symptom of that lag.

- **Read-your-writes (read-after-write):** once you have written a value, your later reads never
  return an *older* value. Symptom without it: you edit your bio, reload, and see the old bio.
- **Monotonic reads:** if you read a value, later reads never show you an *earlier* state. Symptom
  without it: you refresh a thread, see 10 comments, refresh again and see 8. Time goes backward.
- **Monotonic writes:** your writes are applied in the order you issued them. Symptom without it: you
  set status to "away" then "online," but a replica applies them out of order.
- **Writes-follow-reads (causal on your session):** if you read X and then write Y in response,
  everyone sees X before Y. Symptom without it: your reply shows up on a replica that has not yet
  received the comment it answers.

### How you actually implement them

1. **Sticky routing.** After a user writes, pin their reads to the primary (or to the specific
   replica that has the write) for a short window, via a cookie or a "read from primary for N
   seconds" flag. Simple; delivers read-your-writes and monotonic reads for a single session on a
   single device.
2. **Version tokens.** On each write, return a **logical version** (a WAL position / LSN, a commit
   timestamp, an opaque "consistency token"). The client sends it back on reads, and the read path
   either routes to a replica that has caught up to that version or waits until it has.

**Interview nuance:** the sharp follow-up is the **cross-device** case. Sticky sessions live in one
client's cookie, so they do nothing when you write on your phone and read on your laptop. Only a
**shared version token** carried per user (or a read-from-primary window keyed on the user, not the
connection) fixes cross-device read-your-writes. If you only mention stickiness, expect "what about
my other device?"

These guarantees are strictly weaker than linearizability (they say nothing about what *other* users
see relative to each other), which is the whole point: user-visible correctness for a fraction of the
coordination cost.

Recap: the four session guarantees fix the common lag symptoms per client, implement them with sticky
routing or version/LSN tokens, remember tokens are required for cross-device, and never promise
read-your-writes off async replicas with neither routing nor a token.
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
              "Add read-your-writes and monotonic-reads guarantees to a read-replica architecture where a user writes to the primary and reads from lagging replicas.",
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
              "**Member placement:** a 5-member cluster spread so no single region holds a majority: 2 in A, 2 in B, 1 in C. Majority is 3, so losing any one region still leaves at least 3 reachable members and the cluster stays writable. Putting 3 members in region A means an A failure loses the majority and the control plane goes read-only: the placement mistake to avoid. Five members (not 3) tolerates a full region loss plus one more node.",
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
      ],
    },
  ],
}
