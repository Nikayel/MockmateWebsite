> Module **sd-l0-m4** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Prev: [sd-l0-m3](./sd-l0-m3.md) · Next: [sd-l1-m1](./sd-l1-m1.md)

# L0 · Driving the Conversation & Tradeoffs

By the end of this module you can frame any major design choice as an explicit, committed tradeoff, calibrate the depth of your answer to the level you are interviewing for, run a round from a reusable one-page template that never sounds scripted, and narrate and whiteboard so the interviewer stays inside your head and their hints steer you instead of derailing you.

### sd-l0-tradeoff-articulation: Trade-off Articulation & Decision Framing

- **id:** `sd-l0-tradeoff-articulation`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** tradeoffs, decision-framing

#### Learn

The single fastest way to sound junior is to name a technology without naming what you gave up to get it. "I'll use Cassandra" is a fact. "I'll use Cassandra because I need multi-region writes and can tolerate read-repair latency, which costs me easy cross-partition transactions" is a decision. Staff-level interviewers grade the second sentence, not the first.

Every real choice in a design is a tradeoff, and there is almost always a principled lens that frames it. Reach for the lens before the answer:

- **CAP / PACELC**: under a partition, do you keep serving (AP) or refuse to serve stale data (CP)? PACELC adds the case with no partition: even then, do you favor latency or consistency? A payment ledger is CP/consistency. A social feed is AP/latency.
- **Push vs pull**: do you compute work at write time (fan-out on write, fast reads, expensive writes) or read time (fan-out on read, cheap writes, slow reads)? Celebrity followers break naive push.
- **Sync vs async**: does the caller block for the result, or do you accept the request, return a 202, and finish on a queue? Async buys throughput and resilience at the cost of end-to-end visibility.
- **SQL vs NoSQL, normalize vs denormalize, cache vs recompute**: each is a spend-here-to-save-there trade.

The move that separates strong candidates is committing. Weak candidates enumerate ("we could do A, or B, or C") and stall, waiting for the interviewer to choose. That reads as indecision. State the assumption the decision rests on, pick, and say what you are giving up: "Assuming reads dominate writes 100 to 1 and we can tolerate a few seconds of staleness, I'll denormalize the counter into the post row. This doubles write cost but turns a JOIN-and-aggregate read into a single-key lookup. If writes ever approach reads, I would revisit."

Quantify whenever a number is available, even a rough one. "This doubles storage but halves p99 read latency" is a sentence an interviewer can push on, which is exactly what you want.

**Interview nuance:** Interviewers often probe with "why not the other option?" They are not disagreeing; they are checking whether you understood the tradeoff or got lucky. Have the losing option's one real advantage ready, and re-state the assumption that made you overrule it.

**Interview nuance:** Tie every decision to an assumption that can be revisited, so your design has a documented seam for scale. "At 10x traffic this assumption breaks, and then I'd shard by user" shows evolution-over-time thinking without you having to build the sharded version now.

```
Choice ──► pick the lens ──► state the assumption ──► commit ──► name what you gave up
 (SQL?)     (CAP / push-pull)   (reads >> writes)      (NoSQL)    (cross-entity txns)
```

Recap: Frame every major choice through a principled lens, commit to one option on a stated assumption, quantify the trade, and name what you gave up.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Choose a datastore for a social feed system: compare SQL versus NoSQL against your specific consistency, scale, and query requirements, and commit to one with justification.

**Think about:**
- Which principled lens (CAP/PACELC, push/pull, sync/async) frames this choice?
- What assumptions does the decision depend on, so it can be revisited at scale?
- What are you giving up, not just gaining?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: this is the feed storage for a Twitter-scale product, reads dominate writes roughly 100 to 1, a post is immutable once created, and users tolerate a feed that is a few seconds stale. Target scale is tens of millions of daily active users, hundreds of thousands of feed reads per second at peak.

The framing lens is PACELC plus push versus pull. The feed is an availability-and-latency problem, not a consistency problem: showing a post 3 seconds late is fine, but a 500ms feed load is not. That pushes me toward the AP/latency corner, which is where wide-column and key-value stores live.

Decision: store posts and the per-user materialized timeline in a NoSQL wide-column store like Cassandra or DynamoDB, keyed by user id with the timeline as a partition sorted by time. Reads become a single-partition range scan, which is exactly what these stores are built for and what lets them hit single-digit-millisecond reads at scale with tunable consistency (read/write quorum set to favor availability).

What I give up by not choosing SQL: easy multi-row ACID transactions and ad hoc JOINs. A social feed does not need them. The relational strengths (cross-entity transactions, flexible querying, strong consistency) are exactly the things a feed does not exercise, so paying their scaling cost (a single primary write node, harder horizontal sharding) buys nothing here.

Where SQL would win, and my revisit seam: the user graph and account/billing data, which are relational and need consistency, belong in Postgres. And if this were an analytics feed needing arbitrary slice-and-dice queries, or if writes ever approached reads, I would revisit, because the denormalized fan-out-on-write timeline is a write-amplification bet that only pays off while reads dominate.

Common wrong turn: listing "SQL is consistent, NoSQL is scalable" and refusing to pick, or picking NoSQL for scale while ignoring that the social graph itself still wants a relational or graph store.

**Self-check rubric:**
- [ ] Did I state concrete assumptions (read/write ratio, staleness tolerance, scale) before choosing?
- [ ] Did I name a principled lens (PACELC and/or push-pull) rather than gut feel?
- [ ] Did I commit to one store instead of listing options?
- [ ] Did I name what I gave up (transactions, JOINs) and confirm the feed does not need it?
- [ ] Did I leave a revisit seam (graph/billing in SQL, or reconsider if writes approach reads)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Choose the primary datastore for Uber's real-time driver-location and trip-matching service (hundreds of thousands of location updates per second, sub-second match queries over "drivers near this point"), and justify the pick against the tradeoff you are accepting.

**Model answer (revealed on demand):**

Assumptions: 1 to 5 million active drivers, each pinging location every 4 seconds, so on the order of 250K to 1M writes per second; matching queries are geospatial ("nearest available drivers to a rider") and must return in well under a second; a driver's location is disposable (a 4-second-stale ping is worthless anyway).

Lens: this is PACELC latency-favoring with a heavy write and geospatial-query workload, plus a freshness-not-durability angle. I do not need to durably persist every ping; I need the current location queryable by proximity, fast.

Decision: keep live location in an in-memory geospatial store, Redis with geospatial commands (GEOADD/GEOSEARCH) sharded by geographic cell, as the hot serving layer. Redis handles the write rate in memory and answers radius queries in single-digit milliseconds. Partition the world into cells (an S2 or geohash grid) so each shard owns a region and matching is a bounded local search, not a global scan.

What I give up: durability and rich secondary querying. That is the correct trade, because a lost location ping self-heals in 4 seconds and I do not query location by anything but proximity. Trip records themselves (the thing I must never lose: fares, receipts, dispute history) go to a separate durable store, a sharded SQL or a durable NoSQL like a document store, written asynchronously off the hot path.

Common wrong turn: putting live location in Postgres with PostGIS "because it does geo." It does, but a single relational primary cannot absorb 1M writes/sec of ephemeral data, and you would be paying for durability you do not need on the exact data that does not need it. The revisit seam: if match quality needs richer filters (driver rating, vehicle type) at query time, enrich from a cache alongside Redis rather than moving the hot geo query into a heavier store.

### sd-l0-level-calibration: Level Calibration: Junior vs Senior vs Staff

- **id:** `sd-l0-level-calibration`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** calibration, rubric

#### Learn

The same prompt, "Design a rate limiter," is a pass or a fail depending on the level you are interviewing for, and the difference is not "more" but "aimed differently." A staff-depth answer to a junior loop can fail if it never finishes, and a junior-depth answer to a staff loop fails for lack of proactive depth. Calibration is knowing which one you are in and steering to that rubric.

Most companies grade a system-design round on roughly four axes:

- **Problem navigation**: scoping, requirements, handling ambiguity.
- **Technical excellence**: correct components, sound data model, working design.
- **Communication**: narration, structure, responsiveness.
- **Proactive depth**: finding bottlenecks and going deep without being asked.

What "complete" means per level:

- **Junior**: a correct high-level design. Core components (LB, app tier, database, cache), a basic path from request to response, and awareness that scale exists. Completeness beats depth. Finishing a clean, correct end-to-end design is a strong junior answer. You are not expected to derive novel tradeoffs; you are expected to not have holes.
- **Senior**: everything junior, plus you find the bottlenecks yourself and quantify the tradeoffs. You do one or two real deep dives (the hot partition, the cache invalidation strategy, the fan-out) unprompted. You drive the round without the interviewer pulling you along. Estimation is not decoration; it justifies a design decision.
- **Staff+**: everything senior, plus you own the ambiguity. You frame an under-specified prompt into a crisp problem, and your tradeoffs extend past the technical into org, cost, and reliability ("this doubles our on-call surface," "this triples storage spend at our scale"). You reason about how the system evolves over two years, and you make the call on what not to build.

For "Design a rate limiter," concretely: a junior nails token-bucket in a single service plus Redis for shared state. A senior adds the distributed-counter race, the sliding-window-vs-token-bucket tradeoff, and what happens when Redis is down (fail-open vs fail-closed). A staff candidate additionally frames whose traffic and which tier, argues the cost of per-user vs per-IP granularity, and picks a degradation policy tied to a business risk.

**Interview nuance:** Match estimation depth and deep-dive count to the level. A junior doing three deep dives runs out of time on the basics. A senior who does zero looks shallow. Budget roughly one deep dive for senior, two for staff, in a 45-minute round.

**Interview nuance:** If you do not know the level, ask, or infer it from the recruiter's title and the interviewer's follow-ups. When in doubt, deliver a complete junior-plus backbone first, then go deep, so you always have a finished answer before you gamble time on depth.

Recap: Aim depth and breadth at the target rubric; junior wants a complete correct design, senior wants unaided bottleneck-finding and quantified tradeoffs, staff wants ambiguity-framing plus org/cost/reliability and evolution thinking.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Take "Design a rate limiter" and describe how a passing answer differs at junior, senior, and staff level on scope, depth, and trade-off sophistication.

**Think about:**
- What does "complete" look like at each level?
- How many deep dives and how much estimation depth fit each level?
- What are the graded rubric axes?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

I will grade against four axes: problem navigation, technical excellence, communication, proactive depth. The prompt is the same; the aim differs.

Junior (completeness over depth): a passing answer defines the goal (cap requests per user per window), picks token bucket as the algorithm, and places the limiter as middleware in the API gateway backed by a shared Redis counter so multiple app instances agree. It draws the request path and states the response (HTTP 429 with a Retry-After header). No holes, correct components, end to end. Zero to one estimation, no unprompted deep dives expected. Finishing cleanly is the win.

Senior (unaided depth and quantified tradeoffs): everything above, and the candidate proactively raises the concurrency problem: two instances read-modify-write the same Redis counter and race, so they reach for an atomic INCR with expiry or a Lua script. They compare fixed window (cheap, but allows a 2x burst at the boundary) against sliding-window-log (accurate, more memory) against token bucket (smooth, tunable) and commit with a reason. They ask what happens when Redis is unavailable and pick fail-open or fail-closed on purpose. One solid deep dive, estimation that sizes the Redis memory. They drive without prompting.

Staff+ (ambiguity, org, cost, evolution): the candidate first frames the under-specified prompt: rate limiting for what, external API abuse, internal service protection, or fairness? Who is the key, user, IP, or API token, and what is the cost of each choice? They extend tradeoffs past the technical: a per-user distributed limiter adds a Redis dependency to every request, expanding the on-call and failure surface, so maybe an approximate local limiter with periodic sync is worth the accuracy loss. They reason about evolution (start centralized, move to a sidecar/local-token design as QPS grows) and make an explicit call on what not to build now.

Common wrong turn: giving a staff-depth, never-finished answer to a junior prompt, or a bare token-bucket sketch with no bottleneck-finding to a staff loop.

**Self-check rubric:**
- [ ] Did I name the graded rubric axes rather than just "harder"?
- [ ] Is the junior answer a complete, correct, finished design?
- [ ] Does the senior answer add unaided bottleneck-finding and a committed algorithm tradeoff?
- [ ] Does the staff answer add ambiguity-framing plus org/cost/reliability and evolution-over-time?
- [ ] Did I match deep-dive count and estimation depth to each level?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Describe what specifically lifts your answer from a strong senior answer to a staff answer in a Staff Engineer interview at Stripe where the prompt is "Design a rate limiter for our public payments API," given that this is real money and real merchants.

**Model answer (revealed on demand):**

A strong senior answer here is already good: token bucket per API key, atomic counters in a Redis cluster, tiered limits by plan, 429 with Retry-After, a deep dive on the distributed-counter race and a fail-open-vs-fail-closed decision. To reach staff, I have to make this specific to Stripe's business, not a generic limiter.

First, framing the ambiguity as a product question: rate limiting a payments API is not primarily abuse prevention, it is fairness and blast-radius control. One merchant's runaway retry loop must not exhaust capacity for everyone else, so the real requirement is per-merchant isolation with global protection underneath. That reframing is the staff move.

Second, org and cost tradeoffs. A hard fail-closed limiter that wrongly blocks a legitimate merchant during a Black Friday spike is lost revenue and a support escalation, so the degradation policy is a business decision, not a technical default: I would fail-open on the limiter's own infrastructure failure (never block a real payment because Redis blinked) while keeping the per-key ceiling enforced, and separate the idempotency layer so retries stay safe even when limits are loose. I would also flag that a synchronous Redis call on every payment adds latency to the money path and a dependency to on-call, which argues for a local token cache synced asynchronously, trading a little accuracy for a smaller failure surface on the critical path.

Third, evolution and what not to build: start with centralized counters, plan the migration to a cell-based or sidecar limiter as QPS grows, and explicitly defer ML-based anomaly limiting as out of scope for v1. Naming the two-year path and the deliberate cut is what a staff interviewer is listening for.

### sd-l0-template-pitfalls: A Reusable Template & the Top Pitfalls

- **id:** `sd-l0-template-pitfalls`  ·  **difficulty:** easy  ·  **est:** 25 min  ·  **skills:** template, pitfalls

#### Learn

Under interview pressure, working memory shrinks. The fix is a one-page template you have internalized so well you can reproduce it in the first 60 seconds of any round, without it sounding like a recited script. The template is a backbone you hang the specific prompt on, not a monologue you deliver.

The phase backbone with a rough time budget for a 45-minute round:

```
1. Scope & requirements      ~5 min   functional + non-functional, clarify
2. Estimation (back-of-env)  ~5 min   QPS, storage, bandwidth
3. API + data model          ~5 min   the contract and the schema
4. High-level design         ~10 min  box-and-arrow, request path
5. Deep dive(s)              ~10 min  the 1-2 hard parts
6. Bottlenecks & wrap-up     ~5 min   scale, failure, tradeoffs, what next
```

Stock clarifying and NFR prompts to open with: who are the users and how many, read-heavy or write-heavy, what is the consistency requirement, what latency is acceptable, what is the scale (DAU, QPS), and what is explicitly out of scope. Asking these is problem navigation points on the rubric.

An estimation checklist so you never freeze on numbers: DAU to QPS (DAU × actions/day ÷ 86,400, then ×2 or ×3 for peak), storage (records/day × bytes/record × retention), bandwidth (QPS × payload size), cache size (hot set, often the 20% that serves 80%), and server count (QPS ÷ per-box throughput).

A component palette you can pull from without inventing: load balancer, API gateway, app/service tier, cache (Redis), message queue (Kafka), CDN, object store (S3), search index (Elasticsearch), and database with replicas and shards. When you need a box, it is almost always one of these.

Trade-off lenses to reach for (from the first lesson): CAP/PACELC, push vs pull, sync vs async, SQL vs NoSQL, normalize vs denormalize.

The top pitfalls that sink most candidates, and the counter for each:

- **Solutioning before scoping**: naming Kafka before you know the requirements. Counter: spend the first 5 minutes on requirements, always.
- **Unbounded feature list**: trying to design everything. Counter: pick the core 2 to 3 features and defer the rest out loud.
- **Generic NFRs**: "it should be scalable and fast." Counter: attach numbers (100K QPS, p99 under 200ms).
- **Designing in silence**: thinking without narrating. Counter: talk continuously (next lesson).
- **No wrap-up**: running out of time with no summary. Counter: reserve the last 2 to 3 minutes to name bottlenecks and next steps.

**Interview nuance:** The template must bend to the prompt. If the interviewer says "assume you know the requirements, go straight to the storage design," skip phases 1 and 2 and say so. Rigidly marching through a memorized order when the prompt does not want it is itself a red flag.

Recap: Carry a phase-and-time backbone, stock clarifying/NFR prompts, an estimation checklist, a component palette, and trade-off lenses, and actively counter the five classic pitfalls, adapting the template to the actual prompt.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write a one-page personal cheat template (phases, clarifying questions, estimation checklist, component palette, trade-off lenses) you could reproduce in the first minute of any round, and list the 5 pitfalls you will actively avoid.

**Think about:**
- What is the minimal template that starts any round without sounding scripted?
- Which pitfalls most commonly cause failure, and how do you counter each?
- How do you adapt the template to the actual prompt's constraints?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Phase backbone (45-min budget): (1) Scope and requirements, 5 min: functional plus non-functional, clarify before designing. (2) Estimation, 5 min: QPS, storage, bandwidth. (3) API and data model, 5 min. (4) High-level design, 10 min: box-and-arrow request path. (5) Deep dive on the 1 to 2 hard parts, 10 min. (6) Bottlenecks and wrap-up, 5 min.

Clarifying and NFR questions to open with: How many users (DAU) and what QPS? Read-heavy or write-heavy? Consistency requirement (strong or eventual)? Latency target (p99)? What is explicitly out of scope? Any hard constraints (regions, compliance, budget)?

Estimation checklist: DAU × actions/day ÷ 86,400 = average QPS, then ×2 to ×3 for peak. Storage = writes/day × bytes/record × retention. Bandwidth = QPS × payload. Cache = hot 20% of the data. Servers = peak QPS ÷ per-box throughput.

Component palette: load balancer, API gateway, stateless app tier, Redis cache, Kafka queue, CDN, S3 object store, Elasticsearch, primary DB with read replicas and shards.

Trade-off lenses: CAP/PACELC, push vs pull, sync vs async, SQL vs NoSQL, normalize vs denormalize.

The 5 pitfalls I will avoid and how: (1) Solutioning before scoping: I force the first 5 minutes onto requirements. (2) Unbounded feature list: I pick 2 to 3 core features and defer the rest out loud. (3) Generic NFRs: I attach real numbers to every "scalable/fast." (4) Designing in silence: I narrate every assumption and choice continuously. (5) No wrap-up: I reserve the last 5 minutes for bottlenecks, failure modes, and next steps.

Adapting it: the template is a backbone, not a script. If the interviewer hands me the requirements and says "go to storage," I skip phases 1 and 2, say I am doing so, and jump in. I never recite the whole thing when the prompt does not want it.

Common wrong turn: memorizing this as a monologue and delivering it verbatim regardless of the actual prompt, which reads as not listening.

**Self-check rubric:**
- [ ] Does my template have all six phases with a time budget?
- [ ] Do I have stock clarifying/NFR questions and a numeric estimation checklist?
- [ ] Is there a component palette and a list of trade-off lenses?
- [ ] Did I list all 5 pitfalls with a concrete counter for each?
- [ ] Did I say explicitly how I bend the template to the prompt instead of reciting it?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Adapt your one-page template to a 35-minute clock (a compressed onsite slot, not 45) for the prompt "Design a URL shortener like Bitly," and show the running order and time budget you would actually use, including where you cut.

**Model answer (revealed on demand):**

With 35 minutes I compress, I do not skip. The rubric axes are the same, so I protect scoping and wrap-up (the cheap-to-lose, expensive-to-miss phases) and compress the middle.

Time budget: (1) Scope, 4 min: core features are create-short-URL and redirect; analytics and custom aliases I name and defer. NFRs: read-heavy (redirects vastly outnumber creations, roughly 100:1), redirect p99 under 100ms, high availability (a dead link is a broken product). (2) Estimation, 3 min: assume 100M new URLs/month, so about 40 writes/sec on average, and at 100:1 about 4K redirects/sec on average, so 8K to 12K/sec at peak with the 2x to 3x multiplier; 100M/month × 500 bytes × 5 years is on the order of low terabytes, small enough that the interesting problem is read latency, not storage. (3) API and key generation, 5 min: POST /shorten, GET /{code} redirects with a 301/302; the code is a base62 encoding of a counter or a hash, and I commit to a distributed counter (or a pre-generated key range per host) to avoid collision-checking on the write path. (4) High-level design, 9 min: LB, stateless app tier, a KV store (DynamoDB or Cassandra) keyed by short code, and an aggressive cache (Redis, plus CDN) in front because reads dominate and the hot set is small. (5) One deep dive, 8 min: read scaling and cache strategy, since that is where this design lives, not the write path. (6) Wrap-up, 6 min: bottleneck is the redirect read path, so cache heavily and consider read replicas; call out the counter as a single point of contention and how key-range pre-allocation fixes it.

Where I cut: I do a single deep dive instead of two, and I keep estimation to the two numbers that drive a decision (read:write ratio and total storage class) rather than a full derivation. I still refuse to cut scoping or wrap-up, because those are the phases whose absence a grader notices most.

### sd-l0-communication-whiteboarding: Communication, Whiteboarding & Reading the Interviewer

- **id:** `sd-l0-communication-whiteboarding`  ·  **difficulty:** easy  ·  **est:** 25 min  ·  **skills:** communication, whiteboarding, interview-technique

#### Learn

In a system-design round the interviewer is not a passive grader watching from behind glass. They are one person, usually with about 45 minutes, who is simultaneously your collaborator and your scoring signal. Their attention is the scarce resource you manage. Everything below is about keeping them inside your head and using their input as a steering wheel rather than a distraction.

**Narrate continuously.** Silent thinking is invisible, and invisible thinking reads as being stuck. The habit to build is saying the assumption, the option set, and the pick, out loud, in that order: "I am assuming reads dominate, so I have two options for the timeline, fan-out on write or on read, and I am going to start with fan-out on write because reads are the hot path; I will revisit for celebrity accounts." Now the interviewer can follow, agree, or redirect. A pause to think is fine if you announce it: "let me think for a few seconds about the write path" is night-and-day better than ten silent seconds.

**Organize the board into fixed zones** so it stays readable as the design grows. A layout that always works:

```
+-----------------------------+------------------+
| Requirements & numbers      |  Parking lot     |
| - 10M DAU, 4K QPS peak      |  - analytics     |
| - p99 < 100ms, read-heavy   |  - custom alias  |
+-----------------------------+------------------+
|                                                |
|      [Client]->[LB]->[API]->[Cache]->[DB]      |
|                          box-and-arrow          |
|                                                |
+------------------------------------------------+
```

Requirements and estimates pinned top-left so you and the interviewer share a reference. The box-and-arrow diagram in the center where it can grow. A parking lot on the side for topics you deliberately defer, which both shows discipline and reassures the interviewer you did not forget them.

**Treat every interviewer comment as a hint with intent.** When they ask "what happens if two writes hit the same counter?" they are almost never curious in the abstract; they are steering you toward a deep dive they want to see. Follow it, and confirm the intent out loud: "sounds like you want me to focus on the concurrency there, let me do that." The skill is telling a hint (follow now) from a rabbit hole (defer to the parking lot). A hint from the interviewer: follow it. A tangent you generated yourself that is not on the critical path: park it and move on.

**Lead without steamrolling.** Leading is proposing a path and checking in: "I will cover the data model, then scaling, does that order work for you?" Steamrolling is marching through a rehearsed outline and ignoring interjections. The first reads as senior and collaborative; the second reads as not listening, which tanks the communication axis even when the design is correct.

**Interview nuance:** Remote and shared-whiteboard rounds (Excalidraw, a Google Doc, CoderPad's diagram tool) change the physics. You lose body-language signal and drawing is slower, so pre-learn the tool's shortcuts before the interview, keep shapes to plain boxes and labeled arrows, and talk a little more to compensate for the interviewer's reduced ability to read your face. Do not burn two minutes making a box pretty.

**Interview nuance:** The two most common self-inflicted wounds are going silent to think and ignoring a hint because it was not in your planned outline. Both read as not listening. Announce every pause, and treat every hint as a course correction you welcome.

Recap: Narrate assumption-option-choice continuously, lay the board out in fixed zones with a parking lot, follow interviewer hints as intentional steering while parking your own tangents, and lead by proposing and checking rather than steamrolling.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Explain how you would run the first 20 minutes of a system-design round out loud: how you narrate your thinking, lay out the diagram, and respond when the interviewer nudges you toward a topic you had not planned to cover.

**Think about:**
- How do you keep the interviewer inside your head instead of leaving them to guess what you are thinking silently?
- What is the difference between a hint you should follow and a rabbit hole you should defer?
- How do you lay out a diagram so it stays readable as the design grows?
- What changes when the whiteboard is a shared remote tool instead of a physical wall?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assume a 45-minute round, one interviewer, whose attention is both my collaborator and my score. In the first 20 minutes my job is to scope, estimate, and get a high-level design on the board, narrating throughout.

Minutes 0 to 5, requirements, narrated: I say what I am doing before I do it. "Before I design anything I want to nail requirements, so let me ask a few questions." I ask users/DAU, read vs write, consistency, latency, and scope, and I write the answers top-left on the board as our shared reference. I state assumptions out loud where I make them: "I will assume eventual consistency is fine for the feed, tell me if that is wrong."

Minutes 5 to 10, estimation, narrated: I derive QPS and storage out loud so the interviewer sees the reasoning, not just the number, and I pin the results next to the requirements. If I need a moment I announce it: "give me a few seconds to size the write rate."

Minutes 10 to 20, high-level design: I propose an order and check in, "I will lay out the request path first, then go deep on the hot spot, does that work?" Then I draw in the center zone, plain boxes and labeled arrows, client to LB to API to cache to DB, saying each component's job and the one assumption it rests on as I add it.

Handling an unplanned nudge: when the interviewer asks about, say, the write path when I was heading for reads, I treat it as intentional steering, not a distraction. I confirm the intent, "sounds like you want me to go deep on durability, happy to, let me do that now," and I follow it. If instead I catch myself wandering into a tangent I generated, I park it: I write it in the parking-lot zone and say "I will come back to analytics later," and move on. A hint from them I follow; a tangent from me I park.

Remote variant: on a shared tool like Excalidraw I pre-learn the shortcuts, keep shapes minimal, and narrate a bit more because they cannot read my face, and I never spend time beautifying boxes.

Common wrong turn: going silent to think (announce the pause instead) or ignoring the nudge because it was not in my outline (that reads as not listening).

**Self-check rubric:**
- [ ] Did I narrate assumptions, options, and my pick out loud rather than think silently?
- [ ] Did I lay the board out in fixed zones (requirements/numbers, diagram, parking lot)?
- [ ] Did I distinguish an interviewer hint (follow it, confirm intent) from my own tangent (park it)?
- [ ] Did I lead by proposing an order and checking in, not steamroll a script?
- [ ] Did I address how the remote/shared-tool case changes my behavior?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Explain out loud how you read the signal and adjust when, 30 minutes into a fully remote round on Excalidraw designing a chat system, the interviewer has gone mostly quiet then interrupts with "I am a bit worried about message ordering," given you cannot see their face and had planned to talk about storage next.

**Model answer (revealed on demand):**

First, how I read it. A mostly-silent remote interviewer who suddenly interrupts with a specific concern is giving me a high-value signal, and remote makes it higher-value because I get fewer of them. "I am a bit worried about message ordering" is not idle curiosity; it is telling me exactly where they want depth and, probably, where they suspect my design has a gap. I treat it as a course correction and drop my planned storage detour without resistance.

I confirm the intent out loud, because on a shared tool I cannot nod and read their reaction: "Good flag, sounds like you want me to make ordering rigorous before I move on to storage. Let me do that now." That single sentence does two things: it shows I heard them, and it verbally re-syncs us since I cannot rely on body language.

Then I actually go deep, narrating and drawing in the center zone. I lay out the ordering problem plainly: within a single conversation I need a total order, across conversations I do not. I commit to a per-conversation sequence number assigned by the owning partition (the conversation is the partition key), so all messages in a chat get a monotonic sequence from one authority, avoiding cross-node clock disagreement. I note that client send-time cannot be trusted for ordering and that I will order by server-assigned sequence, using client timestamps only for display. I mention the out-of-order-delivery case (a client receives seq 5 before seq 4) and how the client buffers and reorders by sequence.

On board hygiene for remote: I keep it to boxes and labeled arrows, I write "ordering: per-conversation seq #" right on the diagram so the decision is visible without me re-explaining, and I talk a little more than I would in person to fill the missing body-language channel. When I finish, I check in ("does that resolve the ordering concern, or should I go further?") before returning to storage, so I confirm I actually closed their worry rather than assuming it from silence.
