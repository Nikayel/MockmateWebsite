> Module **sd-l0-m1** of the [Learn System Design curriculum pack](../README.md).
> Up: [CONTENT hub](../CONTENT.md) · [CURRICULUM-MAP](../CURRICULUM-MAP.md) · build spec [ARCHITECTURE](../ARCHITECTURE.md).
> Next: [sd-l0-m2](./sd-l0-m2.md)

# L0 · Requirements & Scoping

After this module you can take a one-line prompt like "Design Twitter" and, in the first five minutes of an interview, turn it into a scoped problem: a confirmed feature slice, three functional requirements, four or five quantified non-functional targets, and a first API sketch. This is the phase that decides whether the rest of the round is a coherent design or a pile of disconnected boxes.

### sd-l0-clarify-scope: Clarifying a Vague Prompt

- **id:** `sd-l0-clarify-scope`  ·  **difficulty:** easy  ·  **est:** 25 min  ·  **skills:** scoping, requirements, communication

#### Learn

A system design prompt is deliberately underspecified. "Design Twitter" is not a spec, it is an invitation to show that you can impose structure on ambiguity. The single biggest scoring signal in the first five minutes is not what boxes you draw, it is whether you scope before you draw. Interviewers routinely fail strong coders here because they hear "Twitter" and immediately start sketching a fan-out service, never having confirmed which slice of Twitter they are building.

Treat the interviewer as a collaborator, not an oracle. You are not extracting a hidden answer key. You propose assumptions and get buy-in: "I am going to assume we care about the home timeline and posting tweets, and I will treat search, ads, and DMs as out of scope. Does that match what you want to see?" This does two things: it moves fast, and it signals seniority, because senior engineers drive scope rather than wait to be told.

Separate the product ask from the system ask. The product ask is "what can a user do." The system ask is "what does that cost at scale." You need both, but confirm the product slice first. Full Twitter is a hundred services; the home timeline plus tweet creation is one designable system in 45 minutes.

Then ask a tight set of questions, three to five, each of which actually narrows the design. Good clarifying questions fall into a few buckets:

- **Actors and use cases:** Who uses this and for what? (Readers vs posters, human vs API clients.)
- **Scale:** How many daily active users? This sets your QPS and storage math.
- **Read/write mix:** Is this read-heavy? Twitter is roughly 100:1 reads to writes, which is the fact that later justifies fan-out-on-write and heavy caching.
- **Geography:** Single region or global? Global forces multi-region replication and a CAP conversation.
- **Freshness:** Must a new tweet appear in followers' timelines instantly, or is a few seconds of lag fine?

Each answer changes a real decision. If the interviewer says 300M DAU and global, you now know you need sharding and multi-region, so you should not waste time on a single-box design. If they say "a few seconds of lag is fine," you have license to use eventual consistency and async fan-out.

**Interview nuance:** The failure mode on both ends is real. Ask fifteen questions and you look like you are stalling and cannot prioritize. Ask zero and jump to boxes and you look junior. The senior move is three to five sharp questions, then explicitly negotiate out-of-scope items ("I will skip search and ads to protect our time"), then restate the problem back in one sentence to confirm shared understanding, then commit and move on.

```
Prompt: "Design Twitter"
  |
  v  (3-5 questions)
Slice? -> home timeline + post tweet     (defer: search, ads, DMs)
Scale? -> ~300M DAU, global
R:W?   -> ~100:1 read heavy
Fresh? -> seconds of lag OK
  |
  v
Restate -> "Read-heavy, global timeline; eventual consistency OK. Building fan-out + read path."
```

Recap: Scope the prompt in three to five sharp questions, negotiate what is out, restate the problem, then commit, instead of interrogating or jumping straight to boxes.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write the 3 to 5 clarifying questions you would ask for the bare prompt "Design Twitter," and show how each answer narrows the design.

**Think about:**
- Which product slice is actually in scope, and what will you explicitly defer?
- What do you need to know about actors, scale, and read/write mix before drawing anything?
- How do you avoid analysis paralysis and move within 3-5 questions?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

I start by stating my working assumption so the interviewer can correct me instead of me guessing silently: "I will assume we are building the home timeline and tweet creation, and I will treat search, ads, DMs, and trends as out of scope to protect our 45 minutes. Correct me if you want a different slice." Then six questions, each tied to a decision:

1. **"Which use cases matter most: reading the home timeline, posting, or both?"** This confirms the slice. If reading dominates, I will spend my design budget on the read path and caching.
2. **"How many daily active users are we targeting?"** Say 300M DAU. This sets my QPS and storage math and immediately tells me a single database will not do, so I plan for sharding.
3. **"What is the read-to-write ratio?"** If it is roughly 100:1 read-heavy, that justifies fan-out-on-write (precompute timelines) plus a Redis cache tier, rather than merging tweets on every read.
4. **"Is this global or single region?"** Global forces multi-region replication and a consistency stance, because a user in Tokyo cannot wait on a write to Virginia.
5. **"How fresh must the timeline be: instant, or is a few seconds of lag acceptable?"** A few seconds of lag lets me use asynchronous fan-out through a queue like Kafka and eventual consistency, which is far cheaper than synchronous updates.
6. **"Do we need to handle celebrity accounts with tens of millions of followers?"** If yes, pure fan-out-on-write explodes on those accounts, so I will need a hybrid where celebrity tweets are pulled on read.

I close by restating: "So: a global, read-heavy home timeline, eventual consistency acceptable, with a hybrid fan-out for celebrities. I will design the write path, fan-out, and read path, and skip search and ads." Then I move to estimation.

The common wrong turn is asking a scattershot list of fifteen questions with no visible link to design decisions, or skipping questions entirely and drawing boxes. Every question above changes a specific later choice, and I cap it at six then commit.

**Self-check rubric:**
- [ ] Did I state an assumption and confirm the feature slice before questioning?
- [ ] Are my questions capped at roughly 6 and each tied to a concrete design decision?
- [ ] Did I cover actors, scale (DAU), read/write mix, and geography?
- [ ] Did I explicitly name what is out of scope?
- [ ] Did I restate the problem in one sentence before moving on?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Scope down the interview prompt "Design Uber" to a designable system in 5 questions or fewer, showing how each answer changes your architecture and what you explicitly defer.

**Model answer (revealed on demand):**

I open with the assumption: "I will focus on the core rider-driver matching and live trip tracking flow, and defer pricing surge modeling, payments, ratings, and Uber Eats. That keeps us to one designable system." Then, five questions:

1. **"Are we building rider-to-driver matching, or the whole marketplace including pricing and payments?"** Confirms the slice. Matching plus live location is one coherent system; the full marketplace is not.
2. **"What is the scale: roughly how many concurrent active riders and drivers in a city?"** Uber peaks around low millions of concurrent trips globally, but the design is per-city sharded, so the real number I care about is a few hundred thousand active drivers in a hot city. This tells me to geo-shard by city or region rather than run one global index.
3. **"How fresh must driver locations be?"** Drivers ping location every 4 to 5 seconds. That is a high write volume (hundreds of thousands of location updates per second in aggregate), which pushes me toward an in-memory geospatial index like Redis with geohashing rather than a relational table.
4. **"Is matching latency critical: do we need a driver assigned within seconds?"** Yes, sub-second to a few seconds. That means the matching service queries a hot geospatial index of nearby drivers, not a cold database scan.
5. **"Single city launch or global?"** Global but naturally partitioned by geography, so I shard by city and never need cross-region matching, which sidesteps the hardest consistency problems.

I restate: "Per-city sharded matching, Redis geospatial index for driver locations updated every few seconds, sub-second matching, deferring pricing and payments." The wrong turn here is treating driver location as a normal database write; at hundreds of thousands of updates per second, that requires an in-memory geo index, and scoping the location freshness question is what surfaces that constraint early.

### sd-l0-functional-requirements: Functional Requirements

- **id:** `sd-l0-functional-requirements`  ·  **difficulty:** easy  ·  **est:** 20 min  ·  **skills:** requirements, product-thinking

#### Learn

A functional requirement is a statement of what a user can do, phrased so concretely that it maps to code. The template is "users should be able to X." The discipline is ruthless prioritization: pick the three capabilities that define the primary journey and defer the rest out loud. Three is not a magic number, but it is the practical ceiling for what you can design well in 45 minutes, and stating exactly three signals that you understand the product's core rather than trying to boil the ocean.

Why three and not fifteen? Because every functional requirement you accept becomes an endpoint, a data path, and a chunk of your time budget. An unbounded feature list guarantees an incomplete design: you will draw ten half-boxes and finish none. Interviewers read a long list as an inability to prioritize, which is the opposite of the signal you want. The best candidates say "There are dozens of features in this product. The three that define the core loop are these, and I am deferring the rest deliberately."

The mechanical trick that makes this phase pay off later: pull the nouns and verbs out of your requirements. The nouns become your core entities (the data model), and the verbs become your endpoints (the API). For a photo app, "users can post a photo" gives you the noun Photo and the verb post, which becomes `POST /photos`. This is why functional requirements are not throwaway; they are the seed of the entire design. If you phrase them well, your data model and API almost write themselves.

Consider a photo-sharing app like Instagram. The dozens of possible features include stories, reels, DMs, explore, shopping, and comments. But the core loop is:

```
Requirement                         Noun(s)        Verb -> Endpoint
------------------------------------------------------------------
Users can post a photo              Photo, User    POST /photos
Users can follow other users        Follow         POST /follows
Users can view a feed of photos     Feed, Photo    GET  /feed
       from people they follow
```

Three requirements, three nouns, three endpoints. Notice that everything else (search, notifications, likes, stories) is a variation or an add-on that assumes these three exist. Post, follow, feed is the irreducible core. Deferring the rest is safe precisely because they do not change the shape of the core system: adding likes later is a new table and endpoint, not a redesign.

**Interview nuance:** Phrase requirements as user capabilities, not system features. "The system stores photos in S3" is not a functional requirement, it is an implementation detail leaking in too early. "Users can post a photo" is the requirement; where the bytes live is a design decision you make later. Keeping the requirement at the user-capability level keeps you from prematurely committing to a design before you have scoped and estimated.

One more nuance: when you defer, say why it is safe. "I am deferring likes and comments because they are additive: they do not change the post, follow, or feed data paths, so we can bolt them on without redesigning." That sentence shows you understand the architecture well enough to know what is core versus peripheral.

Recap: State exactly the three user capabilities that define the core loop as "users can X," extract nouns as entities and verbs as endpoints, and defer everything else out loud with a reason it is safe.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Write the top 3 functional requirements for a photo-sharing app as "users should be able to..." statements and justify why you deferred the rest.

**Think about:**
- Which 3 capabilities define the primary user journey?
- How does each requirement later become an endpoint and a data-flow path?
- What secondary features are you deferring and why is that safe?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

The core loop of a photo-sharing app is create content, build a social graph, and consume content. Everything else assumes those three exist. So my top three functional requirements are:

1. **Users should be able to post a photo (with a caption).** This is the content-creation path. It gives me the entity Photo and the endpoint `POST /photos`, and a data flow of client to upload service to blob store (S3) plus a metadata write.
2. **Users should be able to follow other users.** This builds the social graph, the entity Follow, and the endpoint `POST /follows`. Without the graph, a feed has no meaning, so this is not optional.
3. **Users should be able to view a feed of recent photos from people they follow.** This is the consumption path, the highest-traffic one, and the reason the whole system exists. It gives the endpoint `GET /feed` and forces the fan-out design decision later.

These three map cleanly to three core entities (User, Photo, Follow) and three endpoints, which keeps the design coherent: every box I draw later traces back to one of these.

I explicitly defer likes, comments, stories, direct messages, search, notifications, and the explore page. The justification is that they are additive rather than structural. Likes and comments are new tables keyed on photo id with their own endpoints; they do not alter how a photo is posted or how a feed is assembled. Stories are a time-boxed variant of posting. Search is a separate read path over an index. None of them change the post, follow, or feed data flows, so bolting them on later is incremental work, not a redesign. That is what makes deferring them safe rather than a gap.

The common wrong turn is listing ten requirements including likes, comments, stories, DMs, and search, then running out of time having designed none of them properly. Three well-chosen requirements that cover the full create-graph-consume loop beat ten shallow ones.

**Self-check rubric:**
- [ ] Are there exactly ~3 requirements, each phrased as a user capability ("users can X")?
- [ ] Do the three cover the full core loop (create, social graph, consume) rather than three variations of one thing?
- [ ] Does each requirement clearly imply an entity and an endpoint?
- [ ] Did I name what I am deferring?
- [ ] Did I justify why deferral is safe (additive, not structural)?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Write the top 3 functional requirements for Spotify that define the core listening experience as user-capability statements, map each to an entity and an endpoint, and justify why you defer the rest.

**Model answer (revealed on demand):**

Spotify has an enormous surface: playlists, social sharing, podcasts, recommendations, offline downloads, collaborative playlists, and Wrapped. The irreducible core, the thing that makes it Spotify rather than a social app, is search and play a track, so my three requirements are:

1. **Users should be able to search for a track or artist.** Entity Track and Artist, endpoint `GET /search?q=`. Discovery is the entry point; without it there is nothing to play. This maps to a search index (Elasticsearch) over the catalog, a read path.
2. **Users should be able to stream a track on demand.** Entity Track plus AudioFile, endpoint `GET /tracks/{id}/stream`. This is the heart of the product and the hard part: it forces a CDN, adaptive bitrate, and chunked delivery, so it must be in scope. The data flow is client to CDN edge to origin blob store, with the metadata service authorizing and returning a manifest.
3. **Users should be able to create and play a playlist.** Entity Playlist (an ordered list of track ids), endpoints `POST /playlists` and `GET /playlists/{id}`. Playlists are how users actually organize listening, so they define the repeat-usage loop.

Search, stream, playlist covers discover, consume, and organize, the full listening loop. I defer recommendations, social features, podcasts, offline downloads, and Wrapped. The justification is structural: recommendations are a separate ML-driven read path that consumes the same catalog and play-history data without changing the streaming design; social sharing is additive metadata; offline is a client caching concern layered on the same stream endpoint. None of them alter how a track is searched, streamed, or grouped, so they are safe to add incrementally. The wrong turn would be putting recommendations in the top three, since it is a whole subsystem that assumes streaming and history already work.

### sd-l0-nonfunctional-requirements: Non-Functional Requirements, Quantified

- **id:** `sd-l0-nonfunctional-requirements`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** nfr, slo, capacity

#### Learn

Functional requirements say what the system does; non-functional requirements (NFRs) say how well it must do it, and they are where most of the architecture is actually decided. The trap is that NFRs are easy to fake. "The system should be scalable and reliable" is filler: it is true of every system and changes no decision. A real NFR is quantified and testable. Compare "the feed should be fast" with "p99 feed load latency under 200ms." Only the second one tells you whether you need a cache, and only the second one can be verified against a dashboard.

The rule: every NFR must be a number you could put on a Grafana panel and alert on. That means percentiles, not averages (p99, not "average latency"), because tail latency is what users feel and averages hide it. It means specific availability targets (99.99%, which is about 52 minutes of downtime per year, versus 99.9% which is about 8.7 hours) because the extra nine changes whether you need multi-region failover. It means concrete scale (100M DAU, 50k peak QPS) because that is what forces sharding.

The NFR categories worth walking every time:

- **Scalability:** target DAU and peak QPS. Lever: horizontal sharding, stateless services behind a load balancer.
- **Latency:** p99 targets, split by read and write path. Lever: caching and CDN for reads, async processing for writes.
- **Availability:** the number of nines. Lever: replication, multi-region, no single points of failure.
- **Durability:** can you ever lose committed data? Lever: replication factor, write-ahead logs, quorum writes.
- **Consistency:** strong or eventual, and where. Lever: this is your CAP/PACELC stance.

The consistency stance is the one interviewers probe hardest. For a feed, take an explicit position: "I favor availability over strong consistency. If a follower sees a new tweet a few seconds late, that is fine; if the feed is unavailable, that is not. So per PACELC, I choose AP during a partition and, even without a partition, I trade consistency for latency by serving from replicas and caches." That is a defensible stance with a reason, which is what scores. Saying "it should be consistent and available" fails, because CAP says you cannot have both under a partition and the interviewer will make you pick.

Split read-path and write-path SLAs, because they are genuinely different systems. The read path (loading a feed) must be fast and is cacheable, so p99 under 200ms is reasonable. The write path (posting a tweet) must be durable and ordered but can be slower, so "the write is acknowledged in under 500ms and the tweet is durably stored" is the goal, with fan-out happening asynchronously afterward. Conflating them leads you to either make writes too slow or reads not durable enough.

```
NFR                          -> forces
------------------------------------------------
p99 read < 200ms             -> Redis cache + CDN
100M DAU, ~50k peak QPS      -> shard datastore, stateless app tier
99.99% availability          -> multi-region replication, failover
No data loss on ack          -> quorum/replicated writes, WAL
Feed eventual consistency OK  -> AP stance, async fan-out via Kafka
```

**Interview nuance:** When you state an NFR, immediately name the design lever it forces. That single habit, NFR then lever, is what separates a candidate who lists requirements from one who uses them to drive architecture. If an NFR does not force a lever, it is filler and you should drop it.

Recap: Write NFRs as quantified, testable numbers (percentiles, nines, QPS), take an explicit consistency stance, split read and write SLAs, and tie each NFR to the specific design lever it forces.

#### Apply: think, then answer (save, then reveal)

**Prompt:** List 4-5 non-functional requirements for a 100M-DAU feed system as quantified, testable statements and name the design lever each one forces.

**Think about:**
- Which NFRs actually change your architecture, and which are generic filler?
- What is your explicit CAP/PACELC stance for this system and why?
- How do read-path and write-path SLAs differ here?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

First my assumptions: 100M DAU, read-heavy at roughly 100:1, global, and a few seconds of feed staleness is acceptable. From a rough estimate, 100M DAU making tens of feed loads per day is on the order of 50k peak read QPS and maybe 500 write QPS. With that, here are five quantified NFRs, each with the lever it forces:

1. **p99 feed-load latency under 200ms.** Forces a read-through cache (Redis) holding precomputed timelines plus a CDN for media, because a database query per feed load cannot hit that tail at 50k QPS.
2. **Sustain 50k peak read QPS (2-3x the average).** Forces horizontal sharding of the timeline store and a stateless app tier behind a load balancer so I can scale reads independently of writes.
3. **99.99% availability (about 52 minutes of downtime per year).** Forces multi-region deployment with replication and automatic failover, and eliminating single points of failure. 99.9% would be 8.7 hours, which is unacceptable for a global consumer feed.
4. **Durability: a tweet, once acknowledged, is never lost.** Forces replicated, quorum writes to the tweet store (for example a write to Cassandra with replication factor 3) plus a write-ahead log, so a single node failure cannot drop a committed post.
5. **Eventual consistency for the feed is acceptable (bounded staleness of a few seconds).** This is my explicit PACELC stance: AP during a partition, and even without one I favor latency over consistency by serving replicas and caches. Forces asynchronous fan-out through a queue like Kafka rather than synchronous timeline updates.

I split the paths deliberately. Read path: p99 under 200ms, heavily cached. Write path: acknowledge the post durably in under 500ms, then fan out asynchronously; the writer does not wait for millions of follower timelines to update.

The common wrong turn is listing "scalable, reliable, fast, consistent" with no numbers, which forces no decisions, or claiming strong consistency and high availability together, which CAP forbids under partition. Quantifying and taking a consistency stance is the whole point.

**Self-check rubric:**
- [ ] Is every NFR a specific number (percentile, nines, or QPS), not an adjective?
- [ ] Did I take an explicit consistency stance (AP/CP or PACELC) with a reason?
- [ ] Did I split read-path and write-path SLAs?
- [ ] Does each NFR name the concrete design lever it forces?
- [ ] Did I state the DAU/QPS assumptions the numbers rest on?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Write 4-5 quantified non-functional requirements for a payment processing system like Stripe handling 5,000 transactions per second, and the lever each forces. Note where your consistency stance differs from a social feed and why.

**Model answer (revealed on demand):**

Payments invert the priorities of a feed: here correctness beats availability, and a lost or double-charged transaction is a business-ending failure, not a cosmetic glitch. Assumptions: 5,000 TPS peak, global, money movement, strict regulatory and audit requirements. Five NFRs:

1. **Strong consistency and exactly-once semantics on every charge.** This is the opposite of the feed's AP stance. Per PACELC I choose CP: during a partition I would rather reject a payment than risk a double charge. Forces a transactional store (a relational database like PostgreSQL or Spanner) with idempotency keys on every charge request so retries never double-charge.
2. **Durability: zero tolerance for losing a committed transaction.** Forces synchronous replication with quorum acknowledgement and a durable write-ahead log before returning success. I never acknowledge a charge that is not persisted on multiple replicas.
3. **p99 charge latency under 500ms.** Payments can be slower than a feed read because correctness dominates, but users still abandon slow checkouts. Forces an efficient synchronous write path and connection pooling, not caching (you cannot cache a money movement).
4. **Sustain 5,000 TPS with headroom to 15,000 for peaks (Black Friday).** Forces horizontal partitioning by merchant or account and careful hot-partition handling, since large merchants concentrate volume.
5. **99.99%+ availability with a full audit trail.** Forces multi-region active-passive failover (not active-active, to preserve the single source of truth for consistency) plus an append-only ledger for every state transition to satisfy compliance and reconciliation.

The key difference from a feed: a feed favors availability and eventual consistency because stale data is harmless, so it fans out asynchronously and caches aggressively. A payment system favors consistency and durability because incorrect data is catastrophic, so it uses synchronous transactional writes, idempotency, and an immutable ledger, and it accepts higher latency and a stricter availability model to get there. Naming that inversion explicitly is the senior signal.

### sd-l0-core-entities-api: Core Entities & the API Sketch

- **id:** `sd-l0-core-entities-api`  ·  **difficulty:** medium  ·  **est:** 25 min  ·  **skills:** api-design, data-modeling

#### Learn

Once the problem is scoped, estimated, and its NFRs are set, the abstract problem becomes concrete in two artifacts: the core entities (the nouns your system stores) and the API sketch (the interface clients call). Doing these two before you draw any boxes anchors the whole design, because every service, cache, and datastore you add later exists to serve some entity through some endpoint.

**Core entities** come straight from the nouns in your functional requirements. For a URL shortener, "users can create a short link" and "users can be redirected" give you the entity ShortLink, and if you support accounts, User. The discipline here is to list only the fields that matter for the design, not a fully normalized schema. A ShortLink needs `code` (the short slug), `long_url`, `created_at`, maybe `owner_id` and `expires_at`. It does not need you to enumerate every column and index up front; that is a rabbit hole that burns time and reveals nothing about your systems thinking. You are naming entities to establish the data model's shape, not writing a migration.

**Interview nuance:** Resist fully normalizing the schema at this stage. Interviewers read a candidate who spends five minutes on third-normal-form column design as someone who cannot tell the load-bearing decisions from the details. Name the entity, list the three or four fields that drive the design (the ones that get indexed, sharded, or looked up), and move on.

**The API sketch** is one endpoint per functional requirement, with request and response shapes concrete enough to reveal the data flow. For a URL shortener:

```
POST /links
  req:  { "long_url": "https://...", "custom_alias?": "promo" }
  resp: { "code": "aZ3xK", "short_url": "https://sho.rt/aZ3xK" }
  (idempotency-key header so retrying the same long_url is stable)

GET /{code}
  resp: 302 redirect, Location: <long_url>
  (302 not 301, so you keep control of the link and can gather analytics;
   301 is cached by browsers and you lose the redirect and the click data)
```

The 301-versus-302 choice is a classic probe: 301 (permanent) is cached hard by browsers and CDNs, which is great for read latency but means the browser stops asking your service, so you lose click analytics and can never repoint the link. 302 (temporary) keeps every redirect flowing through you. Most shorteners choose 302 to retain control and analytics, accepting the extra request. Knowing that tradeoff is the point.

**Choose the protocol deliberately.** REST over HTTP is the right default for a public-facing API: it is cacheable, universally understood, and works through any client. Use gRPC for internal service-to-service calls where you control both ends and want lower latency and typed contracts (a Protobuf schema, binary framing, HTTP/2 multiplexing). Use a streaming protocol (WebSocket, Server-Sent Events, or gRPC streaming) when the server must push, like a live location feed or a chat. State which and why: "REST for the public create and redirect endpoints, gRPC between the API gateway and the internal link service."

Two boundary concerns belong in the API sketch because they are easy to forget and interviewers look for them. **Idempotency:** for creates, an idempotency key makes retries safe (the client can retry a timed-out `POST /links` without creating duplicate codes for the same URL). **Pagination and auth:** any endpoint returning a list needs cursor-based pagination (`?cursor=...&limit=25`), and any write or private read needs an auth token at the boundary. Mentioning where these live shows you have designed real APIs, not just toy ones.

Recap: Turn requirement nouns into entities with only the design-relevant fields, define one endpoint per requirement with concrete request/response shapes, choose REST vs gRPC vs streaming deliberately, and place idempotency, pagination, and auth at the boundary.

#### Apply: think, then answer (save, then reveal)

**Prompt:** Define the core entities and the REST/RPC endpoints (create, redirect) for a URL shortener with request/response shapes, and note where you would choose REST vs gRPC vs a stream.

**Think about:**
- Which nouns in the requirements become entities, and which fields actually matter?
- What is the minimal endpoint set, one per functional requirement?
- Where do idempotency keys, pagination, and auth belong at the boundary?

> Write your design answer, save it, then reveal the model answer below to self-compare.

**Model answer (revealed on demand):**

Assumptions: the two functional requirements are create a short link and redirect from a short code, with optional user accounts and custom aliases. That gives two core entities.

**Core entities** (design-relevant fields only):

```
ShortLink
  code        string   PK, the short slug (e.g. "aZ3xK"), indexed for O(1) lookup
  long_url    string   the destination
  owner_id    string?  nullable, for logged-in users
  created_at  timestamp
  expires_at  timestamp?  optional TTL

User (only if accounts are in scope)
  id, email, created_at
```

I deliberately do not normalize further or add every analytics column; `code` is the field that matters because it is the sharding and lookup key.

**API sketch**, one endpoint per requirement:

```
POST /links                          (create)
  headers: Authorization, Idempotency-Key
  req:  { "long_url": "...", "custom_alias?": "promo", "expires_at?": "..." }
  resp: 201 { "code": "aZ3xK", "short_url": "https://sho.rt/aZ3xK" }

GET /{code}                          (redirect)
  resp: 302 Found, Location: <long_url>   (404 if missing, 410 if expired)

GET /links?cursor=...&limit=25       (list my links, needs auth + pagination)
```

I use an **Idempotency-Key** on create so a client retrying a timed-out request gets the same `code` back instead of minting a duplicate; server-side I map the key to the created link for a short window. I choose **302** over 301 so every click flows through my service, preserving analytics and the ability to repoint or expire links, accepting one extra hop per redirect.

**Protocol choice:** REST over HTTPS for the public create and redirect endpoints, because clients are browsers and arbitrary HTTP callers and I want cacheability and universality. Internally, gRPC between the API gateway and the link service for lower latency and typed Protobuf contracts. No streaming is needed here; there is nothing to push. Auth (a bearer token) sits at the gateway for writes and private reads; the public redirect needs no auth. Cursor pagination covers the list endpoint.

The common wrong turn is fully normalizing the schema with a dozen columns and indexes, or forgetting idempotency and the 301/302 decision, both of which are exactly what a senior interviewer probes.

**Self-check rubric:**
- [ ] Did I derive entities from requirement nouns and list only design-relevant fields (not a full schema)?
- [ ] Is there one endpoint per functional requirement with concrete request/response shapes?
- [ ] Did I make and justify the 301 vs 302 redirect choice?
- [ ] Did I place an idempotency key on create and pagination/auth where needed?
- [ ] Did I choose REST vs gRPC vs streaming deliberately with a reason?

#### Practice: real-world variant (save, then reveal)

**Prompt:** Sketch the core entities and the API for requesting a ride and streaming live driver location to the rider in a ride-hailing app like Lyft. Specify where you use REST, where you use a streaming protocol, and why.

**Model answer (revealed on demand):**

Assumptions: the flow in scope is a rider requests a ride, gets matched to a driver, and watches the driver approach on a live map. Core entities:

```
Ride
  id          PK
  rider_id, driver_id?      driver null until matched
  status      enum(requested, matched, enroute, arrived, completed, cancelled)
  pickup      { lat, lng }
  dropoff     { lat, lng }
  requested_at
Driver
  id, status(available/ontrip), current_location { lat, lng }, updated_at
```

Only the fields that drive the design: `status` (the state machine that governs the flow), `current_location` (updated every few seconds), and the foreign keys for matching.

**API sketch.** The request-a-ride flow is a normal request/response and uses **REST**:

```
POST /rides
  headers: Authorization, Idempotency-Key
  req:  { "pickup": {lat,lng}, "dropoff": {lat,lng} }
  resp: 201 { "ride_id": "...", "status": "requested" }
GET /rides/{id}          -> current ride status and matched driver
```

The idempotency key matters here: a rider double-tapping request over a flaky mobile network must not create two rides or two charges.

The **live driver location** is fundamentally different: the server must push a new position every 4 to 5 seconds without the client polling. Polling `GET /rides/{id}` every second would be wasteful and laggy at scale. So I use a **streaming protocol**, a WebSocket (or SSE) connection the rider opens after matching:

```
WS /rides/{id}/track   -> server pushes { driver_location: {lat,lng}, eta_seconds } every ~4s
```

Internally, drivers publish location updates that land in a geospatial index (Redis with geohashing), and a location service pushes the relevant driver's position down the rider's WebSocket. Between internal services I use gRPC for the low-latency matching and location calls.

So: REST for the transactional request-a-ride actions (create, status, cancel) where request/response fits and idempotency protects money movement, and a streaming protocol (WebSocket/SSE) for the continuous live-tracking push where polling would not scale. The wrong turn is trying to serve live location over repeated REST polls, which wastes QPS and gives a choppy map, or opening a WebSocket for the one-shot ride request where plain REST is simpler and cacheable at the edge.

