> Module **sd-l0-m3** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l0-m2](./sd-l0-m2.md) · Next: [sd-l0-m4](./sd-l0-m4.md)

# L0 · The Structured Walkthrough

After this module you can run a system-design round on a fixed clock: open with a repeatable 6-phase plan, draw a boxes-and-arrows architecture and trace one real request through it, then let the tightest non-functional requirement drive a deep dive and close with an operational wrap-up. The goal is to always reach a complete, defensible design and never run out of time mid-diagram.

### sd-l0-phased-delivery-clock: Phased Delivery & the Interview Clock

- **id:** `sd-l0-phased-delivery-clock`  ·  **difficulty:** easy  ·  **est:** 25 min  ·  **skills:** framework, time-management

#### Learn

A system-design round is a time-boxed delivery problem. You have roughly 45 minutes, one interviewer, and one goal: end with a working design plus enough depth to prove you can build it. The single biggest reason strong engineers fail this round is not weak knowledge, it is pacing. They spend 15 minutes perfecting requirements, draw half a diagram, and the timer ends before there is anything to deep-dive on. A repeatable phase structure with an explicit minute budget prevents that.

Here is the canonical 6-phase clock for a 45-minute round:

```
Phase                        Budget   Exit criterion
1 Clarify + scope + NFRs     ~5 min   You have functional + non-functional reqs and the constraint that matters
2 Estimation (entities/QPS)  ~2 min   You have a read/write QPS and rough storage number to size with
3 API surface                ~5 min   The 3-5 core endpoints (or events) are named with inputs/outputs
4 High-level design          ~15 min  A complete boxes-and-arrows design where every functional req is satisfied
5 Deep dive(s)               ~10 min  The tightest NFR bottleneck is addressed with a committed choice
6 Wrap-up                    ~3 min   Top remaining bottleneck, failure mode, monitoring, cost driver stated
```

Notice that phases 1 and 2 together take only about 5 to 7 minutes. Requirements and estimation are the setup, not the main event. The bulk of the clock, phases 4 and 5, goes to design and depth, because that is what the interviewer is actually scoring.

The prime directive that governs the whole clock: reach a COMPLETE working design before you add any complexity. A simple design that satisfies every functional requirement beats an elaborate half-design every time. Do not shard, add Kafka, or optimize the cache until the plain version works end to end.

Two skills make the clock work in practice. First, exit criteria. Each phase has a concrete condition that tells you it is done and you may move on. Without one you drift. When you have a read QPS and a storage estimate, estimation is over, stop refining the number. Second, narrated transitions. You say the phase change out loud so the interviewer follows your lead: "I have a working design now, so let me harden the availability, which is the tightest requirement here." This keeps you visibly in control and signals seniority.

Interview nuance: treat the framework as a scaffold, not a script. If the interviewer jumps you to the data model in minute 3, follow them, then loop back to fill the gaps. Reordering on their cue is a strength. Rigidly reciting phases while they try to steer is the tell of a memorized answer.

Interview nuance: if you are running long, say so and cut. "I am watching the clock, so I will lock the high-level design and move straight to the delivery bottleneck." Interviewers reward candidates who self-correct pacing over ones who need rescuing.

Recap: budget about 5 to 7 minutes for requirements and estimation, spend the bulk on design and deep dives, use an exit criterion to leave each phase, and narrate every transition so you visibly lead the round to a complete design.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Produce a labeled 6-phase walkthrough plan for a 45-minute "Design a URL shortener" round, with a minute budget per phase and the exit criterion for each.

**Think about:**
- How much time goes to requirements+estimation vs design+deep dives?
- What is the exit criterion that lets you move to the next phase?
- How do you narrate transitions so the interviewer follows your lead?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumption: 45-minute round, a URL shortener like Bitly, one interviewer scoring me on completeness and depth.

- **Phase 1, Clarify and NFRs (~5 min).** Confirm the two features: create a short link, redirect a short link to the long URL. Confirm scale (say 100M new URLs per month, 10:1 read:write on redirects) and the tightest NFR: redirect latency and high read availability, since a slow or down redirect breaks every embedded link. Exit criterion: I can state the functional reqs and name latency plus availability as the constraint that matters.
- **Phase 2, Estimation (~2 min).** 100M writes/month is about 40 writes/sec; at 10:1 that is about 400 reads/sec, with peaks maybe 5x. Storage: 100M/month times 12 months times 5 years times ~500 bytes is roughly 3 TB over 5 years. Exit criterion: I have a QPS and a storage number to size the datastore and cache.
- **Phase 3, API (~5 min).** `POST /urls {longUrl} -> {shortCode}` and `GET /{shortCode} -> 301/302 redirect`. Exit criterion: the two core endpoints are named with inputs and outputs.
- **Phase 4, High-level design (~15 min).** Client, load balancer, stateless app servers, a key-generation strategy (base62 of a counter or a hash), a primary datastore keyed by shortCode (DynamoDB or a KV store), and a Redis cache in front of reads. Trace a create and a redirect end to end. Exit criterion: a complete diagram where both features work.
- **Phase 5, Deep dive (~10 min).** Attack the tightest NFR: redirect read latency and availability. Cache hot codes in Redis, use 301 vs 302 deliberately, and discuss key generation collisions. Exit criterion: the read-path bottleneck has a committed solution.
- **Phase 6, Wrap-up (~3 min).** Name the top remaining bottleneck (cache stampede on a viral link), the main failure mode (datastore hot partition), what I would monitor (redirect p99, cache hit rate), and the cost driver (read QPS and storage). Exit criterion: all four stated.

Common wrong turn: spending 12 minutes debating base62 vs hashing in phase 3 and never finishing the diagram. Lock a good-enough key scheme and move on.

**Self-check rubric:**
- [ ] Requirements plus estimation total roughly 5 to 7 minutes, not more.
- [ ] Design plus deep dive get the majority of the clock.
- [ ] Every phase has a concrete exit criterion, not just a time box.
- [ ] There is at least one narrated transition line the interviewer would hear.
- [ ] The plan reaches a complete design before any deep dive begins.

#### Practice: real-world variant (save, then reveal)
**Prompt:** Produce a labeled phase plan for a compressed 35-minute "Design Twitter/X home timeline" round where the interviewer has told you up front they care most about read fanout at 500M daily active users. Show how you re-budget the shortened clock and where you cut.

**Model answer (revealed on demand):**

Assumption: 35 minutes, not 45, and the interviewer pre-declared the scoring focus is read fanout at 500M DAU. That changes the budget: I spend less on breadth and reserve more time for the fanout deep dive.

- **Clarify and NFRs (~4 min).** Confirm scope: post a tweet, view home timeline. NFR that matters is already given, timeline read latency at massive fanout, plus eventual consistency being acceptable (a tweet appearing a few seconds late is fine). Exit: focus is confirmed as read-path fanout.
- **Estimation (~2 min).** 500M DAU, say each reads timelines a few times a day, that is on the order of 100k+ timeline reads/sec at peak, far more reads than writes. This number is the whole reason fanout matters. Exit: I have the read QPS that justifies precomputation.
- **API (~3 min).** `POST /tweets` and `GET /timeline?userId`. Keep it to two. Exit: endpoints named.
- **High-level design (~9 min).** Clients, gateway, write service, fanout service, a timeline cache (Redis) per user, and a tweet store. Trace a post and a timeline read. Exit: complete design where a tweet reaches followers' cached timelines.
- **Deep dive, fanout (~14 min).** This is where the extra time goes. Compare fanout-on-write (precompute each follower's timeline) vs fanout-on-read (assemble at query time). Commit to a hybrid: fanout-on-write for normal users, fanout-on-read for celebrity accounts with millions of followers to avoid write amplification. Quantify the celebrity write storm.
- **Wrap-up (~3 min).** Remaining bottleneck (hot celebrity accounts), failure mode (fanout queue backlog), monitoring (timeline read p99, fanout lag), cost driver (Redis timeline storage across 500M users).

The cut: I compress API and breadth of components so the fanout dive, the thing being scored, gets nearly half the round. Matching depth to the stated focus is the point.

### sd-l0-high-level-dataflow: High-Level Architecture & Data-Flow

- **id:** `sd-l0-high-level-dataflow`  ·  **difficulty:** medium  ·  **est:** 30 min  ·  **skills:** architecture, diagramming

#### Learn

The high-level design phase is where you draw the system and prove it works by tracing one concrete request through it. Two failure modes bracket this phase. Some candidates draw a beautiful diagram with 15 boxes and never show how a single request flows, so nobody knows if it actually works. Others draw so little that the design is ambiguous. The fix for both is the same discipline: start with the simplest set of boxes that satisfies the requirements, then evolve it by introducing each new component with an explicit justification, and finally walk one request end to end.

Start simple. Almost every system begins as the same skeleton:

```
[Client] --> [Load Balancer] --> [App Servers] --> [Database]
                                       |
                                    [Cache]
```

That is a complete, working system for a huge class of problems. Only now do you add components, and only with a reason tied to a requirement:

- A **gateway / reverse proxy** (Envoy, NGINX) when you need auth, rate limiting, or TLS termination in one place.
- A **cache** (Redis) when reads dominate and repeat, to cut datastore load and tail latency.
- A **message queue** (Kafka, SQS) when work is async, spiky, or must survive a consumer being down.
- A **CDN** (CloudFront) when you serve static or geographically distributed content.
- An **object store** (S3) for large blobs (images, video, files) that do not belong in a row.
- A **search index** (Elasticsearch) when you need full-text or faceted queries the primary store cannot serve.

The discipline is that you say why each box exists. "I am adding Redis here because reads are 10x writes and the same hot keys repeat, so caching cuts p99 and datastore QPS." A box without a justification is the single most common wrong turn: adding Kafka or sharding you cannot yet defend makes you look like you are pattern-matching, not designing.

Now the part that separates a strong answer: trace a concrete request. Pick one real operation and follow it through every box, both the write path and the read or delivery path. For a chat message the write path is client to gateway to chat service, persist to the message store, enqueue for delivery. The read path is the recipient's connection receiving a push, or the recipient client pulling on reconnect. Tracing forces you to notice gaps: where is the message stored before delivery, what happens if the recipient is offline, how does the sender get an ack.

Interview nuance: label your arrows. An arrow should carry what flows and how: "WebSocket frame," "gRPC call," "async event on Kafka topic `messages`." Unlabeled arrows hide the exact decisions interviewers probe. Group boxes into tiers (edge, service, data) so the diagram stays legible as it grows.

Interview nuance: explicitly point at where each functional requirement is satisfied. "Requirement 1, send a message, happens on this write path; requirement 2, delivery, happens on this arrow." This is how you prove completeness before you move to deep dives, and it is what lets you honestly say "I have a working design now."

Recap: start with the minimal client-LB-app-DB-cache skeleton, add each component only with a requirement-tied justification, label arrows with data and protocol, and prove the design by tracing one concrete request through both its write and its read or delivery path.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Draw the boxes-and-arrows for a chat app and narrate a single message's full path from sender client to recipient device, including the write and the delivery.

**Think about:**
- What is the simplest set of components that satisfies the requirements?
- Can you trace both the write path and the read/delivery path concretely?
- Where is each functional requirement satisfied in the picture?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: 1:1 chat, messages must persist and be delivered even if the recipient is briefly offline, ordering per conversation matters, near-real-time delivery.

High-level design:

```
[Sender] --WSS--> [Gateway/LB] --> [Chat Service] --> [Message Store (Cassandra)]
                                         |                     ^
                                         v                     |
                                 [Delivery Queue] --> [Presence/Connection Mgr] --WSS--> [Recipient]
```

Components and why: clients hold a persistent WebSocket to a **connection manager** so the server can push. A **gateway** terminates TLS and authenticates. The **chat service** owns write logic. **Cassandra** as the message store because writes are heavy and we shard by conversation ID for per-conversation ordering with a clustering key on timestamp. A **presence / connection manager** tracks which server holds each user's live socket. A **delivery queue** (Kafka) decouples persistence from delivery so a slow or offline recipient never blocks the write.

Trace one message, write path: sender sends a WebSocket frame to the gateway, chat service assigns a message ID and sequence number, persists it to Cassandra partitioned by conversation ID (this satisfies "send and store"), then publishes a delivery event to Kafka and returns an ack to the sender so their UI shows "sent."

Delivery path: a delivery worker consumes the event, asks the presence service which server holds the recipient's socket. If online, it forwards the message over that server's WebSocket to the recipient device (this satisfies "deliver in real time") and marks delivered. If offline, the message simply stays in Cassandra; on reconnect the recipient's client pulls all messages with sequence greater than its last-seen, which satisfies "deliver even after being offline."

Key tradeoff: persisting before delivering (write then async fanout) costs a little latency but guarantees no message is lost if delivery fails, which is the right call for chat. Common wrong turn: adding sharding, read replicas, and a search cluster before proving the basic send-store-deliver loop works.

**Self-check rubric:**
- [ ] The diagram starts from a minimal skeleton and adds boxes with stated reasons.
- [ ] Both the write path and the delivery path are traced concretely.
- [ ] The offline-recipient case is handled, not just the happy path.
- [ ] Arrows are labeled with protocol or data (WebSocket, Kafka event, etc).
- [ ] Each functional requirement is pointed to a specific place in the picture.

#### Practice: real-world variant (save, then reveal)
**Prompt:** Draw the boxes-and-arrows for Uber-style ride matching and trace one request from a rider tapping "request ride" to a nearby driver's phone ringing, at 1M concurrent riders. Handle both the write (request) and the delivery (dispatch to driver) paths and show where geospatial matching lives.

**Model answer (revealed on demand):**

Assumptions: riders and drivers both run apps that stream location; a request must be matched to a nearby available driver within a couple of seconds; 1M concurrent riders means location updates and matching dominate.

```
[Rider App] --> [Gateway] --> [Trip Service] --> [Trip Store (Postgres/Dynamo)]
                                    |
                                    v
                         [Matching Service] <--> [Geo Index (Redis geohash / QuadTree)]
                                    |
                                    v
                         [Dispatch Queue] --> [Driver Connection Mgr] --push--> [Driver App]
```

Why these boxes: driver apps continuously push location to a **location ingest** path that updates a **geospatial index** (Redis with geohash buckets, or an in-memory QuadTree sharded by region). The **matching service** queries that index for available drivers near the rider. A **trip store** records trip state. A **dispatch queue** decouples matching from notifying drivers.

Write path: rider taps request, gateway authenticates, trip service creates a trip row in state `REQUESTED` (this is the durable write), then calls the matching service. Matching queries the geo index for the N nearest available drivers in the rider's geohash cell and neighbors, ranks by ETA, and picks a candidate.

Delivery/dispatch path: the match is published to the dispatch queue; the driver connection manager finds the chosen driver's live connection and pushes an offer, ringing their phone. If the driver declines or times out (say 15 seconds), matching falls back to the next candidate. On accept, the trip transitions to `MATCHED` and both apps are notified.

Scale note at 1M concurrent: the geo index is the hot component, so shard it by city or geohash region and keep it in memory for sub-100ms lookups. Common wrong turn: putting matching directly on Postgres with a `SELECT ... ORDER BY distance`, which cannot serve the query rate; geospatial matching needs a purpose-built in-memory index.

### sd-l0-deep-dives-wrapup: Deep Dives & the Operational Wrap-Up

- **id:** `sd-l0-deep-dives-wrapup`  ·  **difficulty:** hard  ·  **est:** 35 min  ·  **skills:** deep-dive, operations, cost

#### Learn

Once you have a complete design, the interviewer wants to see depth. But depth chosen at random reads as a data dump. The skill is to let the non-functional requirements and the traffic model point you at the real bottleneck, dive there, compare two viable options, commit to one, and then close with a short operational wrap-up. This is the phase that most separates senior from junior signal, and it is also the phase most often skipped because candidates monologue their favorite topic until the clock runs out.

Step one, find the bottleneck from the NFRs. Look at what the requirements and your QPS numbers stress:

- Tight **read latency** with hot keys points to caching and a possible hot-partition problem.
- High **availability** with a single primary points to a single point of failure that needs replication or failover.
- **Write-heavy** load past one node's capacity points to sharding and its partition-key choice.
- **Tail latency** (p99) under fanout points to precomputation, async work, or backpressure.

You name the bottleneck out loud: "My tightest NFR is redirect availability, and my design has the datastore as a single point of failure, so that is where I will dive."

Step two, use the standard levers deliberately: sharding (and the partition key), replication (and sync vs async), caching (and the invalidation rule), async and queues (to absorb spikes), and indexing (to serve a query the primary store cannot). You are not listing all of them, you are reaching for the one that removes this bottleneck.

Step three, compare two options and commit. This is the heart of the dive. For a hot partition you might compare "add read replicas" vs "add a cache with request coalescing" and recommend the cache because reads repeat and replicas add replication lag. The recommendation, with a reason, is what earns the grade. Listing options without a stance is the classic senior-level miss.

Interview nuance: quantify the tradeoff. "Fanout-on-write costs one write per follower, so a 10M-follower account is a 10M-write storm, which is why I use fanout-on-read for celebrities." A number turns an opinion into an argument.

Step four, the operational wrap-up. Reserve the last 2 to 3 minutes and deliver four things crisply: where it breaks first at 10x scale, the main failure mode, what you would monitor (specific metrics and alerts), and the dominant cost driver. Add any unaddressed security or privacy gap as a prioritized next step. This wrap-up is what makes you sound like someone who has run systems in production, not just drawn them.

Interview nuance: the wrap-up is where you volunteer what you did not have time to cover. "I did not address abuse or rate limiting; at this scale I would put that behind the gateway as the next step." Naming your own gaps is a seniority signal, not a weakness.

Recap: let the NFRs and traffic model pick the bottleneck, dive with the right lever, compare two options and commit with a quantified reason, then close in 2 to 3 minutes on the top remaining bottleneck, failure mode, monitoring, and cost driver.

#### Apply: think, then answer (save, then reveal)
**Prompt:** Pick the tightest non-functional requirement from a completed design and do a deep dive that removes the bottleneck it exposes, then deliver a 2-minute wrap-up naming the top remaining bottleneck, failure mode, what you would monitor, and the biggest cost driver.

**Think about:**
- Which NFR points to the real bottleneck (hot partition, SPOF, tail latency)?
- What two viable approaches can you compare with an explicit recommendation?
- What breaks first at 10x scale, and what is the dominant cost driver?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

I will use the URL shortener from earlier as the completed design. Its tightest NFR is redirect read latency and availability: every embedded short link breaks if redirects are slow or down, and reads are about 10x writes with a small hot set of viral links.

The bottleneck: at read peak, the datastore serves the redirect lookup on every hit, and a viral link concentrates traffic on one partition, so I face both datastore load and a hot-partition risk.

Deep dive, two options compared. Option A: add read replicas to the datastore so reads spread across nodes. Option B: put Redis in front, cache shortCode to longUrl with a long TTL, and add request coalescing so a cache miss on a hot key triggers exactly one datastore read while other requests wait. I recommend Option B. Redirect reads are highly repetitive and the working set of hot links is small, so a cache gives a >95% hit rate and sub-millisecond p99, whereas replicas still pay full datastore latency and add replication lag. I keep the datastore for the long tail and cache misses. To handle a link going viral (cache stampede), request coalescing plus a short jittered lock prevents a thundering herd hammering the partition on first miss.

Wrap-up (about 2 minutes):
- **Top remaining bottleneck at 10x:** a single viral link overwhelming one Redis shard; I would shard the cache by shortCode hash so even hot keys spread, and consider a local in-process cache on app servers for the very hottest.
- **Main failure mode:** Redis node loss causing a cache-miss flood onto the datastore hot partition; mitigate with a replica and coalescing so the miss storm is bounded.
- **Monitoring:** redirect p99 latency, cache hit rate, datastore read QPS per partition, and 5xx rate on `GET /{code}`, with an alert if hit rate drops below 90%.
- **Cost driver:** read QPS (drives cache and compute) and long-term storage (3 TB over 5 years growing with new links).

Common wrong turn: diving into fancy key generation or analytics while the read path, which is the actual NFR at risk, goes unaddressed and the wrap-up gets skipped.

**Self-check rubric:**
- [ ] The chosen bottleneck is derived from a named NFR, not picked at random.
- [ ] Two viable options are compared with an explicit, reasoned recommendation.
- [ ] The tradeoff is quantified (hit rate, latency, write count) at least once.
- [ ] The wrap-up names all four: 10x break point, failure mode, monitoring, cost driver.
- [ ] At least one unaddressed gap or next step is volunteered.

#### Practice: real-world variant (save, then reveal)
**Prompt:** Pick the tightest NFR for a completed Instagram-style photo feed design serving 500M users, run a deep dive that removes the bottleneck, and deliver a wrap-up. The hard constraint: feed load p99 must stay under 200ms even for users following 5,000 accounts, and photos are stored as large blobs.

**Model answer (revealed on demand):**

Tightest NFR: feed read p99 under 200ms at 500M users, with heavy read fanout (a user following 5,000 accounts). Assembling a feed by querying every followed account at read time cannot hit 200ms, so feed assembly is the bottleneck.

Deep dive, two options. Option A, fanout-on-read: at request time, query recent posts from all followed accounts and merge. Simple and storage-cheap, but a 5,000-follow user triggers thousands of lookups per feed load, blowing the 200ms budget. Option B, fanout-on-write: when someone posts, push the post ID into each follower's precomputed feed list in Redis, so a feed read is a single fast range read of an already-sorted list. I recommend a hybrid: fanout-on-write for normal accounts so reads are cheap, and fanout-on-read for celebrity accounts with millions of followers, because writing one post to 50M feeds is a write storm and wasteful for users who may never open the app. At read time I merge the precomputed feed with a live pull of the handful of celebrities the user follows. Photos themselves live in S3 and are served via CloudFront CDN; the feed carries only IDs and CDN URLs, never blob bytes, so blob size never touches the 200ms path.

Wrap-up:
- **10x break point:** the fanout write pipeline backing up when many mid-size accounts post simultaneously; absorb it with a Kafka fanout queue and autoscaled workers.
- **Failure mode:** Redis feed store loss; rebuild lazily from the post store on miss, accepting a slower first load for affected users.
- **Monitoring:** feed p99, fanout lag (post time to feed-visible time), CDN hit rate, and Redis memory per shard.
- **Cost driver:** Redis memory for 500M precomputed feeds and CDN egress for photo delivery; the precomputed feeds are the main spend, which is exactly why celebrities are excluded from write fanout.

Common wrong turn: trying to serve photo bytes through the app tier, which couples blob bandwidth to the latency-critical feed path instead of offloading to S3 and a CDN.
