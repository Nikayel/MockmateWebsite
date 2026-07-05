/**
 * System Design — Level 0: Interview & Communication Method.
 *
 * Skeleton level for the vertical slice: it holds the ONE proof lesson (`sd-l0-clarify-scope`,
 * Module sd-l0-m1) authored verbatim from `docs/system-design-curriculum/CURRICULUM-MAP.md` §L0.
 * AGENT-2 authors the remaining lessons/modules/levels from the same map.
 *
 * Each lesson carries both `apply` and `practice` because `TutorialLesson<E>` requires both. The
 * System-Design player renders the Read + Design (apply) spine and completes `apply` and `practice`
 * together (system design has one design write per lesson); `practice` is authored as a harder
 * variant so the content contract stays honest and future-renderable. See
 * `components/tutorials/SystemDesignLessonPlayer.tsx`.
 */
import type { DesignLevel } from "@/lib/tutorials/types"

const clarifyScopeTeach = `
## Turn a one-line prompt into a scoped problem

"Design Twitter." Four seconds in, and you already have everything you need to lose the round: a
prompt so broad that any two engineers would build two different systems. The strongest candidates do
not start drawing. They start **scoping**: turning a vague ask into a small, agreed problem they can
actually finish in the time on the clock.

Scoping has three moves, and it should take three to five sharp questions, not fifteen.

### 1. Separate the product ask from the system ask

"Twitter" is a product with search, ads, direct messages, trends, and a home timeline. You are not
designing all of it. Confirm the **one slice** the interviewer cares about ("Let us focus on posting
a tweet and loading a home timeline, and treat search and ads as out of scope") and get a nod before
you go further. Naming what you are *not* building is how you protect your time budget.

### 2. Pin down actors, scale, and the read/write mix

Three facts change the architecture more than anything else you will ask:

- **Actors and use cases:** who uses this, and what are the two or three things they do?
- **Scale:** roughly how many daily active users? This sets whether you need one database or a
  sharded fleet.
- **Read/write ratio:** a feed is read-heavy (you load far more than you post), which pushes you
  toward caching and fan-out on write. A logging system is the opposite.

You are not gathering trivia. Each answer eliminates whole branches of the design tree.

### 3. Restate, then commit

Play the interviewer back their own problem in one sentence ("So: a home-timeline service for tens of
millions of daily users, read-heavy, eventual consistency is fine for the feed"). If they agree, you
have a shared contract and you move. If they correct you, you just avoided designing the wrong system.

### The mindset that makes this work

Treat the interviewer as a **collaborator, not an oracle.** You are allowed to propose an assumption
("I will assume 100 million DAU and a 100:1 read/write ratio, is that reasonable?") instead of asking
an open question and waiting. Proposing assumptions is faster, and it signals seniority.

The two failure modes to avoid: **interrogating** the interviewer with a dozen questions until the
clock is gone, and **jumping to boxes and arrows** before anyone has agreed on what the system is.
Three to five questions, a restated scope, then draw.
`.trim()

const functionalRequirementsTeach = `
## The top three capabilities, phrased so they map to code

A functional requirement is a statement of what a user can do, phrased so concretely that it maps to
code. The template is "users should be able to X." The discipline is ruthless prioritization: pick the
three capabilities that define the primary journey and defer the rest out loud. Three is not a magic
number, but it is the practical ceiling for what you can design well in 45 minutes, and stating exactly
three signals that you understand the product's core rather than trying to boil the ocean.

### Why three and not fifteen

Every functional requirement you accept becomes an endpoint, a data path, and a chunk of your time
budget. An unbounded feature list guarantees an incomplete design: you will draw ten half-boxes and
finish none. Interviewers read a long list as an inability to prioritize, which is the opposite of the
signal you want. The best candidates say "There are dozens of features in this product. The three that
define the core loop are these, and I am deferring the rest deliberately."

### Nouns become entities, verbs become endpoints

The mechanical trick that makes this phase pay off later: pull the nouns and verbs out of your
requirements. The nouns become your core entities (the data model), and the verbs become your endpoints
(the API). For a photo app, "users can post a photo" gives you the noun Photo and the verb post, which
becomes \`POST /photos\`. This is why functional requirements are not throwaway; they are the seed of
the entire design. If you phrase them well, your data model and API almost write themselves.

Consider a photo-sharing app like Instagram. The dozens of possible features include stories, reels,
DMs, explore, shopping, and comments. But the core loop is:

\`\`\`
Requirement                         Noun(s)        Verb -> Endpoint
------------------------------------------------------------------
Users can post a photo              Photo, User    POST /photos
Users can follow other users        Follow         POST /follows
Users can view a feed of photos     Feed, Photo    GET  /feed
       from people they follow
\`\`\`

Three requirements, three nouns, three endpoints. Everything else (search, notifications, likes,
stories) is a variation or an add-on that assumes these three exist. Post, follow, feed is the
irreducible core. Deferring the rest is safe precisely because they do not change the shape of the
core system: adding likes later is a new table and endpoint, not a redesign.

**Interview nuance:** Phrase requirements as user capabilities, not system features. "The system stores
photos in S3" is not a functional requirement, it is an implementation detail leaking in too early.
"Users can post a photo" is the requirement; where the bytes live is a design decision you make later.
Keeping the requirement at the user-capability level keeps you from prematurely committing to a design
before you have scoped and estimated.

One more nuance: when you defer, say why it is safe. "I am deferring likes and comments because they
are additive: they do not change the post, follow, or feed data paths, so we can bolt them on without
redesigning." That sentence shows you understand the architecture well enough to know what is core
versus peripheral.

Recap: State exactly the three user capabilities that define the core loop as "users can X," extract
nouns as entities and verbs as endpoints, and defer everything else out loud with a reason it is safe.
`.trim()

const nonfunctionalRequirementsTeach = `
## NFRs are where the architecture is decided

Functional requirements say what the system does; non-functional requirements (NFRs) say how well it
must do it, and they are where most of the architecture is actually decided. The trap is that NFRs are
easy to fake. "The system should be scalable and reliable" is filler: it is true of every system and
changes no decision. A real NFR is quantified and testable. Compare "the feed should be fast" with
"p99 feed load latency under 200ms." Only the second one tells you whether you need a cache, and only
the second one can be verified against a dashboard.

The rule: every NFR must be a number you could put on a Grafana panel and alert on. That means
percentiles, not averages (p99, not "average latency"), because tail latency is what users feel and
averages hide it. It means specific availability targets (99.99%, which is about 52 minutes of downtime
per year, versus 99.9% which is about 8.7 hours) because the extra nine changes whether you need
multi-region failover. It means concrete scale (100M DAU, 50k peak QPS) because that is what forces
sharding.

### The categories worth walking every time

- **Scalability:** target DAU and peak QPS. Lever: horizontal sharding, stateless services behind a
  load balancer.
- **Latency:** p99 targets, split by read and write path. Lever: caching and CDN for reads, async
  processing for writes.
- **Availability:** the number of nines. Lever: replication, multi-region, no single points of failure.
- **Durability:** can you ever lose committed data? Lever: replication factor, write-ahead logs,
  quorum writes.
- **Consistency:** strong or eventual, and where. Lever: this is your CAP/PACELC stance.

### Take a consistency stance out loud

The consistency stance is the one interviewers probe hardest. For a feed, take an explicit position:
"I favor availability over strong consistency. If a follower sees a new tweet a few seconds late, that
is fine; if the feed is unavailable, that is not. So per PACELC, I choose AP during a partition and,
even without a partition, I trade latency for consistency by serving from replicas and caches." That is
a defensible stance with a reason, which is what scores. Saying "it should be consistent and available"
fails, because CAP says you cannot have both under a partition and the interviewer will make you pick.

Split read-path and write-path SLAs, because they are genuinely different systems. The read path
(loading a feed) must be fast and is cacheable, so p99 under 200ms is reasonable. The write path
(posting a tweet) must be durable and ordered but can be slower, so "the write is acknowledged in under
500ms and the tweet is durably stored" is the goal, with fan-out happening asynchronously afterward.
Conflating them leads you to either make writes too slow or reads not durable enough.

\`\`\`
NFR                          -> forces
------------------------------------------------
p99 read < 200ms             -> Redis cache + CDN
100M DAU, ~50k peak QPS      -> shard datastore, stateless app tier
99.99% availability          -> multi-region replication, failover
No data loss on ack          -> quorum/replicated writes, WAL
Feed eventual consistency OK -> AP stance, async fan-out via Kafka
\`\`\`

**Interview nuance:** When you state an NFR, immediately name the design lever it forces. That single
habit, NFR then lever, is what separates a candidate who lists requirements from one who uses them to
drive architecture. If an NFR does not force a lever, it is filler and you should drop it.

Recap: Write NFRs as quantified, testable numbers (percentiles, nines, QPS), take an explicit
consistency stance, split read and write SLAs, and tie each NFR to the specific design lever it forces.
`.trim()

const coreEntitiesApiTeach = `
## Two artifacts that anchor the whole design

Once the problem is scoped, estimated, and its NFRs are set, the abstract problem becomes concrete in
two artifacts: the core entities (the nouns your system stores) and the API sketch (the interface
clients call). Doing these two before you draw any boxes anchors the whole design, because every
service, cache, and datastore you add later exists to serve some entity through some endpoint.

### Core entities: nouns, not schemas

Core entities come straight from the nouns in your functional requirements. For a URL shortener, "users
can create a short link" and "users can be redirected" give you the entity ShortLink, and if you support
accounts, User. The discipline here is to list only the fields that matter for the design, not a fully
normalized schema. A ShortLink needs \`code\` (the short slug), \`long_url\`, \`created_at\`, maybe
\`owner_id\` and \`expires_at\`. It does not need you to enumerate every column and index up front; that
is a rabbit hole that burns time and reveals nothing about your systems thinking. You are naming
entities to establish the data model's shape, not writing a migration.

**Interview nuance:** Resist fully normalizing the schema at this stage. Interviewers read a candidate
who spends five minutes on third-normal-form column design as someone who cannot tell the load-bearing
decisions from the details. Name the entity, list the three or four fields that drive the design (the
ones that get indexed, sharded, or looked up), and move on.

### The API sketch: one endpoint per requirement

The API sketch is one endpoint per functional requirement, with request and response shapes concrete
enough to reveal the data flow. For a URL shortener:

\`\`\`
POST /links
  req:  { "long_url": "https://...", "custom_alias?": "promo" }
  resp: { "code": "aZ3xK", "short_url": "https://sho.rt/aZ3xK" }
  (idempotency-key header so retrying the same long_url is stable)

GET /{code}
  resp: 302 redirect, Location: <long_url>
  (302 not 301, so you keep control of the link and can gather analytics;
   301 is cached by browsers and you lose the redirect and the click data)
\`\`\`

The 301-versus-302 choice is a classic probe: 301 (permanent) is cached hard by browsers and CDNs,
which is great for read latency but means the browser stops asking your service, so you lose click
analytics and can never repoint the link. 302 (temporary) keeps every redirect flowing through you.
Most shorteners choose 302 to retain control and analytics, accepting the extra request. Knowing that
tradeoff is the point.

### Choose the protocol deliberately

REST over HTTP is the right default for a public-facing API: it is cacheable, universally understood,
and works through any client. Use gRPC for internal service-to-service calls where you control both
ends and want lower latency and typed contracts (a Protobuf schema, binary framing, HTTP/2
multiplexing). Use a streaming protocol (WebSocket, Server-Sent Events, or gRPC streaming) when the
server must push, like a live location feed or a chat. State which and why: "REST for the public create
and redirect endpoints, gRPC between the API gateway and the internal link service."

Two boundary concerns belong in the API sketch because they are easy to forget and interviewers look
for them. **Idempotency:** for creates, an idempotency key makes retries safe (the client can retry a
timed-out \`POST /links\` without creating duplicate codes for the same URL). **Pagination and auth:**
any endpoint returning a list needs cursor-based pagination (\`?cursor=...&limit=25\`), and any write or
private read needs an auth token at the boundary. Mentioning where these live shows you have designed
real APIs, not just toy ones.

Recap: Turn requirement nouns into entities with only the design-relevant fields, define one endpoint
per requirement with concrete request/response shapes, choose REST vs gRPC vs streaming deliberately,
and place idempotency, pagination, and auth at the boundary.
`.trim()

const fermiEstimationTeach = `
## Get to a defensible number in under five minutes

Fermi estimation is the skill of getting a number that is right to within one order of magnitude,
fast, by decomposing a big unknown into small quantities you are willing to assume. The physicist
Enrico Fermi famously estimated the yield of a nuclear test by dropping bits of paper and watching how
far the blast pushed them. In a system design interview the same move applies: you never actually know
the QPS, so you build it out of assumptions you state out loud.

The process matters more than the precision. Four rules:

1. Decompose the unknown into things you can assume (users, actions per user, object sizes).
2. Write down every assumption explicitly so the interviewer can challenge one number, not the whole
   result.
3. Label units on every line (requests/day, bytes/object, seconds). Most estimation mistakes are unit
   mistakes.
4. Round aggressively to powers of ten. 86,400 seconds/day becomes 10^5. You are choosing a sharding
   strategy, not filing taxes.

### Worked example

Suppose 50M daily active users, each doing 10 reads and 1 write per day.

\`\`\`
reads/day  = 50M x 10 = 500M   = 5 x 10^8
writes/day = 50M x 1  =  50M   = 5 x 10^7
seconds/day ~= 86,400          ~= 10^5

avg read QPS  = 5 x 10^8 / 10^5 = 5,000
avg write QPS = 5 x 10^7 / 10^5 =   500
\`\`\`

Average is not what your capacity must survive. Real traffic is peaky: a diurnal curve plus launch
spikes. A 2x to 3x peak multiplier over the daily average is the standard defensible assumption. So
plan for roughly 15k peak read QPS and 1.5k peak write QPS.

**Interview nuance:** interviewers do not care whether you land on 5,000 or 6,200 QPS. They care that
you can defend the shape of the calculation and that you convert average to peak. Saying "I will assume
a 3x peak multiplier because of the daily traffic curve" scores; a single unexplained number does not.

### Only compute what changes a decision

The last rule is the one that separates a senior answer: only compute a number if it changes a
decision. Peak write QPS of 1.5k tells you a single well-tuned Postgres primary can likely absorb
writes, so you may not need to shard yet. A read QPS of 15k tells you that you want a cache tier and
read replicas. A daily storage number tells you whether you need object storage plus a sharded metadata
DB. If a calculation cannot move the architecture, skip it.

\`\`\`
assumptions  ->  arithmetic  ->  a number  ->  a design decision
   (state)        (round)        (label)         (justify)
\`\`\`

**Interview nuance:** the classic failure here is analysis paralysis, spending eight minutes deriving
storage to three significant figures while the design goes untouched. Estimate only enough to unblock
the next decision, then move.

Recap: decompose into stated assumptions, label units, round to powers of ten, convert average to peak
with a 2 to 3x multiplier, and compute only the numbers that change the architecture.
`.trim()

const qpsReadWriteTeach = `
## The most decision-shaping number: the read:write ratio

The single most decision-shaping number in an estimate is the read:write ratio. It tells you which
path to optimize, and optimizing the wrong path is one of the most common ways to lose a design round.
A 100:1 read-heavy system (a social feed, a product catalog) wants caches, read replicas, and
denormalized read models. A write-heavy or balanced system (an analytics ingest pipeline, a metrics
store) wants write batching, append-only logs, and horizontally sharded write paths.

Start by converting DAU to QPS with explicit arithmetic, exactly as in Fermi estimation. Then compute
reads and writes separately and take the ratio.

### Fan-out: where one write becomes many

The subtlety in feed-like systems is fan-out: one write can generate many logical reads, or one read
can require merging many sources. This is the fan-out-on-write versus fan-out-on-read decision.

\`\`\`
Fan-out on WRITE (precompute):        Fan-out on READ (merge at query time):
user posts -> push into each              user opens feed -> pull recent posts
follower's feed cache                     from each followee -> merge/sort
- read is cheap (one cache GET)           - write is cheap (one append)
- write is expensive (N inserts)          - read is expensive (N fetches + merge)
- great when reads >> writes              - great for celebrities / huge fan-out
\`\`\`

Worked example: a feed with 50M DAU, each user reads their feed 20 times/day and posts 0.5 times/day,
average 200 followers.

\`\`\`
reads/day  = 50M x 20  = 10^9       -> avg  ~10k QPS,  peak ~30k QPS
writes/day = 50M x 0.5 = 2.5 x 10^7 -> avg ~250 QPS,  peak ~750 QPS
read:write ratio ~= 40:1  (read-heavy)
\`\`\`

But if you fan out on write, each post writes into ~200 follower feeds. Effective feed-insert QPS =
250 x 200 = 50k QPS of cache writes. So the naive write QPS (250) understates the real write cost by
the fan-out factor. This is why the ratio alone is not enough; you must model where the fan-out
happens.

**Interview nuance:** the strong answer usually picks a hybrid. Fan out on write for normal users
(cheap reads), but for celebrities with millions of followers, fan out on read (pull their posts at
query time) so a single tweet does not trigger tens of millions of feed inserts. Naming this hybrid is
a senior signal.

### Averages lie: design for the hot key

Access is Zipfian: a small number of hot keys (viral posts, celebrity accounts, trending products)
take a hugely disproportionate share of traffic. Your design must survive the hot key, not just the
average. A hot key can saturate a single cache node or shard even when the fleet-wide average looks
fine, so you plan for replication of hot keys or request coalescing.

Finally, translate QPS into a first-order server count. If a tuned application server handles ~10k
QPS, then 30k peak read QPS needs at least 3 to 4 app servers behind the load balancer plus headroom,
and a cache handling 100k+ ops/sec covers the feed reads.

Recap: derive read and write QPS separately, take the ratio to decide read-optimized versus
write-optimized, model where fan-out happens (write vs read, and a celebrity hybrid), and design for
the hot key rather than the average.
`.trim()

export const systemDesignLevel0: DesignLevel = {
  id: 0,
  slug: "interview-method",
  title: "Level 0 — Interview & Communication Method",
  tagline:
    "Run a system-design round like a senior: scope, estimate, structure the walkthrough, and drive tradeoffs.",
  estimatedHours: 6,
  modules: [
    {
      id: "sd-l0-m1",
      title: "Requirements & Scoping",
      description:
        "Turn a vague one-line prompt into an agreed, finishable problem: scope, functional and non-functional requirements, and the API sketch.",
      lessons: [
        {
          id: "sd-l0-clarify-scope",
          title: "Clarifying a Vague Prompt",
          summary:
            "Turn a one-line prompt into a scoped problem with three to five sharp questions and explicit out-of-scope.",
          estimatedMinutes: 25,
          difficulty: "easy",
          skills: ["scoping", "requirements", "communication"],
          teach: {
            markdown: clarifyScopeTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l0-clarify-scope-apply",
            prompt:
              "Write the first 6 clarifying questions you would ask for the bare prompt 'Design Twitter', and for each one show how a likely answer narrows the design.",
            thinkAbout: [
              "Which product slice is actually in scope, and what will you explicitly defer?",
              "What do you need to know about actors, scale, and read/write mix before drawing anything?",
              "How do you avoid analysis paralysis and move within three to five questions?",
            ],
            modelAnswerOutline: [
              "Assume the interviewer is a collaborator, not an oracle: propose assumptions and get buy-in.",
              "Separate the product ask from the system ask; confirm the feature slice (home timeline vs full Twitter).",
              "Ask about users and actors, primary use cases, scale (DAU), read:write ratio, and geo distribution.",
              "Explicitly negotiate out-of-scope items (search, ads, DMs) to protect the time budget.",
              "Restate the problem back to confirm shared understanding, then commit and move on.",
              "Common wrong turn: interrogating with 15 questions or jumping to boxes before scoping.",
            ],
          },
          practice: {
            id: "sd-l0-clarify-scope-practice",
            prompt:
              "The interviewer answers 'Assume a global user base and design for whatever scale you think is right.' Write how you would scope 'Design a ride-sharing dispatch service' under that vague answer: state the assumptions you would commit to, the one slice you would build, and the two things you would defer, all in under a minute of talking.",
            thinkAbout: [
              "When the interviewer refuses to constrain scope, how do you constrain it yourself without stalling?",
              "Which single assumption (scale, consistency, geography) most changes this design, and what value do you commit to?",
              "How do you name the deferred pieces so the interviewer can pull one back in if they want it?",
            ],
            modelAnswerOutline: [
              "Convert the non-answer into committed assumptions out loud: state DAU, region count, and consistency needs and ask for a quick nod.",
              "Pick the load-bearing slice: match a rider to a nearby driver and track the trip; defer pricing, ratings, and payments.",
              "Name the assumption that dominates the design (real-time location updates at high write volume) and design to it.",
              "Restate the self-imposed scope in one sentence so the interviewer can redirect cheaply if it is wrong.",
              "Common wrong turn: treating 'design for any scale' as permission to skip scoping and start drawing boxes.",
            ],
          },
        },
        {
          id: "sd-l0-functional-requirements",
          title: "Functional Requirements",
          summary:
            "Pick the three user capabilities that define the core loop, phrase them as 'users can X', and defer the rest with a reason.",
          estimatedMinutes: 20,
          difficulty: "easy",
          skills: ["requirements", "product-thinking"],
          teach: {
            markdown: functionalRequirementsTeach,
            estimatedMinutes: 8,
          },
          apply: {
            id: "sd-l0-functional-requirements-apply",
            prompt:
              "Write the top 3 functional requirements for a photo-sharing app as 'users should be able to...' statements and justify why you deferred the rest.",
            thinkAbout: [
              "Which 3 capabilities define the primary user journey?",
              "How does each requirement later become an endpoint and a data-flow path?",
              "What secondary features are you deferring and why is that safe?",
            ],
            modelAnswerOutline: [
              "Frame the core loop first: create content, build a social graph, consume content. Everything else in a photo-sharing app assumes those three exist.",
              "**Users should be able to post a photo (with a caption).** The content-creation path: entity Photo, endpoint `POST /photos`, data flow of client to upload service to blob store (S3) plus a metadata write.",
              "**Users should be able to follow other users.** Builds the social graph: entity Follow, endpoint `POST /follows`. Without the graph a feed has no meaning, so this is not optional.",
              "**Users should be able to view a feed of recent photos from people they follow.** The consumption path, the highest-traffic one, and the reason the system exists: endpoint `GET /feed`, and the requirement that forces the fan-out design decision later.",
              "The three map cleanly to three core entities (User, Photo, Follow) and three endpoints, which keeps the design coherent: every box drawn later traces back to one of these.",
              "Explicitly defer likes, comments, stories, DMs, search, notifications, and explore because they are additive rather than structural: new tables and endpoints keyed on existing entities that do not alter how a photo is posted or a feed is assembled, so bolting them on later is incremental work, not a redesign.",
              "Common wrong turn: listing ten requirements including likes, comments, stories, DMs, and search, then running out of time having designed none of them properly. Three well-chosen requirements covering the full create-graph-consume loop beat ten shallow ones.",
            ],
          },
          practice: {
            id: "sd-l0-functional-requirements-practice",
            prompt:
              "Write the top 3 functional requirements for Spotify that define the core listening experience as user-capability statements, map each to an entity and an endpoint, and justify why you defer the rest.",
            thinkAbout: [
              "Which capability makes Spotify a music service rather than a social app, and what minimal loop (discover, consume, organize) surrounds it?",
              "Which requirement forces the hardest infrastructure (CDN, adaptive bitrate), and why must it stay in scope?",
              "Why is recommendations, despite being iconic, safe to defer from the top three?",
            ],
            modelAnswerOutline: [
              "State the irreducible core: search and play a track is what makes Spotify Spotify, so the three requirements cover discover, consume, and organize.",
              "**Users should be able to search for a track or artist.** Entities Track and Artist, endpoint `GET /search?q=`, backed by a search index (Elasticsearch) over the catalog. Discovery is the entry point; without it there is nothing to play.",
              "**Users should be able to stream a track on demand.** Entity Track plus AudioFile, endpoint `GET /tracks/{id}/stream`. The heart of the product and the hard part: it forces a CDN, adaptive bitrate, and chunked delivery, with a data flow of client to CDN edge to origin blob store and a metadata service authorizing and returning a manifest.",
              "**Users should be able to create and play a playlist.** Entity Playlist (an ordered list of track ids), endpoints `POST /playlists` and `GET /playlists/{id}`. Playlists define the repeat-usage loop.",
              "Defer recommendations, social features, podcasts, offline downloads, and Wrapped, with a structural justification: recommendations are a separate ML-driven read path over the same catalog and play history; social sharing is additive metadata; offline is client-side caching layered on the same stream endpoint. None alter how a track is searched, streamed, or grouped.",
              "Common wrong turn: putting recommendations in the top three. It is a whole subsystem that assumes streaming and play history already work, so it cannot be part of the irreducible core.",
            ],
          },
        },
        {
          id: "sd-l0-nonfunctional-requirements",
          title: "Non-Functional Requirements, Quantified",
          summary:
            "Turn 'scalable and reliable' into quantified, testable targets (p99, nines, QPS) and name the design lever each one forces.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["nfr", "slo", "capacity"],
          teach: {
            markdown: nonfunctionalRequirementsTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l0-nonfunctional-requirements-apply",
            prompt:
              "List 4-5 non-functional requirements for a 100M-DAU feed system as quantified, testable statements and name the design lever each one forces.",
            thinkAbout: [
              "Which NFRs actually change your architecture, and which are generic filler?",
              "What is your explicit CAP/PACELC stance for this system and why?",
              "How do read-path and write-path SLAs differ here?",
            ],
            modelAnswerOutline: [
              "State assumptions first: 100M DAU, read-heavy at roughly 100:1, global, a few seconds of feed staleness acceptable. Rough math: tens of feed loads per user per day is on the order of 50k peak read QPS and maybe 500 write QPS.",
              "**p99 feed-load latency under 200ms.** Forces a read-through cache (Redis) holding precomputed timelines plus a CDN for media, because a database query per feed load cannot hit that tail at 50k QPS.",
              "**Sustain 50k peak read QPS (2-3x the average).** Forces horizontal sharding of the timeline store and a stateless app tier behind a load balancer so reads scale independently of writes.",
              "**99.99% availability (about 52 minutes of downtime per year).** Forces multi-region deployment with replication and automatic failover, and eliminating single points of failure. 99.9% would be 8.7 hours, unacceptable for a global consumer feed.",
              "**Durability: a post, once acknowledged, is never lost.** Forces replicated quorum writes (for example Cassandra with replication factor 3) plus a write-ahead log, so a single node failure cannot drop a committed post.",
              "**Eventual consistency for the feed with bounded staleness of a few seconds.** The explicit PACELC stance: AP during a partition, and even without one favor latency over consistency by serving replicas and caches. Forces asynchronous fan-out through a queue like Kafka rather than synchronous timeline updates.",
              "Split the paths deliberately: read path p99 under 200ms and heavily cached; write path acknowledges the post durably in under 500ms, then fans out asynchronously so the writer never waits on millions of follower timelines.",
              "Common wrong turn: listing 'scalable, reliable, fast, consistent' with no numbers (forces no decisions), or claiming strong consistency and high availability together, which CAP forbids under partition.",
            ],
          },
          practice: {
            id: "sd-l0-nonfunctional-requirements-practice",
            prompt:
              "Write 4-5 quantified non-functional requirements for a payment processing system like Stripe handling 5,000 transactions per second, and the lever each forces. Note where your consistency stance differs from a social feed and why.",
            thinkAbout: [
              "Which failure is catastrophic here: stale data, lost data, or a double charge? How does that invert the feed's priorities?",
              "What makes retries dangerous in a payment API, and which mechanism makes them safe?",
              "Why might you choose active-passive failover over active-active for money movement?",
            ],
            modelAnswerOutline: [
              "Open by naming the inversion: payments flip a feed's priorities. Correctness beats availability, and a lost or double-charged transaction is a business-ending failure, not a cosmetic glitch. Assumptions: 5,000 TPS peak, global, strict regulatory and audit requirements.",
              "**Strong consistency and exactly-once semantics on every charge.** The opposite of the feed's AP stance: per PACELC choose CP, rejecting a payment during a partition rather than risking a double charge. Forces a transactional store (PostgreSQL or Spanner) with idempotency keys on every charge request so retries never double-charge.",
              "**Zero tolerance for losing a committed transaction.** Forces synchronous replication with quorum acknowledgement and a durable write-ahead log before returning success. Never acknowledge a charge that is not persisted on multiple replicas.",
              "**p99 charge latency under 500ms.** Payments can be slower than a feed read because correctness dominates, but users still abandon slow checkouts. Forces an efficient synchronous write path and connection pooling, not caching (you cannot cache a money movement).",
              "**Sustain 5,000 TPS with headroom to 15,000 for peaks (Black Friday).** Forces horizontal partitioning by merchant or account and careful hot-partition handling, since large merchants concentrate volume.",
              "**99.99%+ availability with a full audit trail.** Forces multi-region active-passive failover (not active-active, to preserve a single source of truth for consistency) plus an append-only ledger of every state transition for compliance and reconciliation.",
              "Name the contrast explicitly: a feed favors availability and eventual consistency because stale data is harmless, so it fans out asynchronously and caches aggressively. Payments favor consistency and durability because incorrect data is catastrophic, so they use synchronous transactional writes, idempotency, and an immutable ledger, accepting higher latency to get there.",
              "Common wrong turn: importing feed habits (aggressive caching, eventual consistency, fire-and-forget writes) into a money path, or promising strong consistency and active-active availability at once without saying what a partition does to charges.",
            ],
          },
        },
        {
          id: "sd-l0-core-entities-api",
          title: "Core Entities & the API Sketch",
          summary:
            "Turn requirement nouns into design-relevant entities and one endpoint per requirement, with protocol, idempotency, and auth chosen deliberately.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["api-design", "data-modeling"],
          teach: {
            markdown: coreEntitiesApiTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l0-core-entities-api-apply",
            prompt:
              "Define the core entities and the REST/RPC endpoints (create, redirect) for a URL shortener with request/response shapes, and note where you would choose REST vs gRPC vs a stream.",
            thinkAbout: [
              "Which nouns in the requirements become entities, and which fields actually matter?",
              "What is the minimal endpoint set, one per functional requirement?",
              "Where do idempotency keys, pagination, and auth belong at the boundary?",
            ],
            modelAnswerOutline: [
              "Assumptions: two functional requirements, create a short link and redirect from a short code, with optional user accounts and custom aliases. That gives two core entities.",
              "**Entities with design-relevant fields only.** ShortLink: `code` (PK, the short slug, indexed for O(1) lookup), `long_url`, nullable `owner_id`, `created_at`, optional `expires_at`. User (only if accounts are in scope): id, email, created_at. Deliberately no further normalization; `code` is the field that matters because it is the sharding and lookup key.",
              "**`POST /links` (create).** Headers: Authorization, Idempotency-Key. Request { long_url, custom_alias?, expires_at? }, response 201 { code, short_url }. The idempotency key means a client retrying a timed-out request gets the same code back instead of minting a duplicate; server-side the key maps to the created link for a short window.",
              "**`GET /{code}` (redirect).** Responds 302 Found with Location: long_url (404 if missing, 410 if expired). Choose 302 over 301 so every click flows through the service, preserving analytics and the ability to repoint or expire links, accepting one extra hop per redirect. 301 is cached hard by browsers and CDNs, so you lose the click data and control.",
              "**`GET /links?cursor=...&limit=25`** for listing a user's links: needs auth and cursor-based pagination.",
              "**Protocol choice with reasons.** REST over HTTPS for the public create and redirect endpoints (clients are browsers and arbitrary HTTP callers; cacheable, universal). gRPC internally between the API gateway and the link service for lower latency and typed Protobuf contracts. No streaming needed; nothing is pushed. Auth (bearer token) sits at the gateway for writes and private reads; the public redirect needs none.",
              "Common wrong turn: fully normalizing the schema with a dozen columns and indexes, or forgetting idempotency and the 301 vs 302 decision, which are exactly what a senior interviewer probes.",
            ],
          },
          practice: {
            id: "sd-l0-core-entities-api-practice",
            prompt:
              "Sketch the core entities and the API for requesting a ride and streaming live driver location to the rider in a ride-hailing app like Lyft. Specify where you use REST, where you use a streaming protocol, and why.",
            thinkAbout: [
              "Which fields on Ride and Driver actually drive the design (state machine, location freshness, matching keys)?",
              "Which interaction is request/response and which is a continuous server push, and what protocol fits each?",
              "Where does an idempotency key protect the rider from double-charging over a flaky mobile network?",
            ],
            modelAnswerOutline: [
              "Assumptions: the flow in scope is a rider requests a ride, gets matched to a driver, and watches the driver approach on a live map.",
              "**Entities with only the design-driving fields.** Ride: id (PK), rider_id, nullable driver_id (null until matched), `status` enum(requested, matched, enroute, arrived, completed, cancelled), pickup {lat, lng}, dropoff {lat, lng}, requested_at. Driver: id, status (available/ontrip), current_location {lat, lng}, updated_at. The `status` state machine governs the flow; `current_location` updates every few seconds.",
              "**REST for the transactional flow.** `POST /rides` with Authorization and Idempotency-Key headers, request { pickup, dropoff }, response 201 { ride_id, status: requested }; `GET /rides/{id}` for current status and matched driver. The idempotency key matters: a rider double-tapping request on a flaky mobile network must not create two rides or two charges.",
              "**Streaming for live driver location.** The server must push a new position every 4 to 5 seconds; polling `GET /rides/{id}` every second would be wasteful and laggy at scale. Open a WebSocket (or SSE) after matching: `WS /rides/{id}/track` pushing { driver_location, eta_seconds } every ~4s.",
              "**Behind the scenes:** drivers publish location updates into a geospatial index (Redis with geohashing); a location service pushes the matched driver's position down the rider's WebSocket. Internal services talk gRPC for the low-latency matching and location calls.",
              "The split, stated as a rule: REST for one-shot transactional actions (create, status, cancel) where request/response fits and idempotency protects money movement; a streaming protocol for continuous server push where polling would not scale.",
              "Common wrong turn: serving live location over repeated REST polls (wastes QPS, choppy map), or opening a WebSocket for the one-shot ride request where plain REST is simpler and cacheable at the edge.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l0-m2",
      title: "Back-of-the-Envelope Estimation",
      description:
        "Turn a vague prompt into defensible numbers for QPS, storage, bandwidth, and cache size in under five minutes, and use each number to justify a concrete architecture decision.",
      lessons: [
        {
          id: "sd-l0-fermi-estimation",
          title: "The Fermi Estimation Method",
          summary:
            "Decompose an unknown into stated assumptions, round to powers of ten, convert average to peak, and compute only numbers that change a decision.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["estimation", "capacity"],
          teach: {
            markdown: fermiEstimationTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l0-fermi-estimation-apply",
            prompt:
              "Estimate peak QPS, daily storage, and cache size for a service with 50M DAU averaging 10 reads and 1 write per day, showing every assumption and unit.",
            thinkAbout: [
              "What assumptions must you state so the numbers are defensible?",
              "How do you get from average to peak, and what spike multiplier is reasonable?",
              "Which computed number actually changes a design decision?",
            ],
            modelAnswerOutline: [
              "State assumptions up front: 50M DAU, 10 reads and 1 write per user per day, average object size 1 KB (a row of structured data plus metadata), 90-day retention for the hot dataset, and a 3x peak-to-average multiplier for the diurnal curve.",
              "**QPS.** Reads/day = 50M x 10 = 5 x 10^8; writes/day = 5 x 10^7. Dividing by ~10^5 seconds/day gives avg 5,000 read QPS and 500 write QPS; a 3x peak multiplier gives ~15k peak read QPS and ~1,500 peak write QPS.",
              "**QPS design implication:** 15k read QPS wants a cache tier plus a few read replicas; 1,500 write QPS is comfortably inside a single tuned primary, so no write sharding on day one.",
              "**Storage.** New objects/day = writes/day = 5 x 10^7. At 1 KB each that is 50 GB/day; over 90 days about 4.5 TB, and with replication factor 3 for durability roughly 13 to 14 TB provisioned. Implication: beyond a single node's comfortable working set, so a sharded or managed store (DynamoDB, Cassandra) is justified, with blobs kept out of the primary DB.",
              "**Cache.** Size from the hot working set, not the full corpus: assume the hot ~20% of recent objects serves ~80% of reads. The truly hot set (last few days of writes plus popular older items) is tens of GB, so a 50 to 100 GB Redis cluster captures the bulk of read traffic, cheap relative to the read-replica load it removes.",
              "The number that most changes the design is peak read vs peak write QPS: read-heavy by 10:1 pushes toward caching and replication rather than write sharding.",
              "Common wrong turn: computing storage to three significant figures while never stating the peak multiplier, then optimizing a write path that was never the bottleneck.",
            ],
          },
          practice: {
            id: "sd-l0-fermi-estimation-practice",
            prompt:
              "Estimate peak ingest QPS and daily storage for Instagram-scale photo uploads: assume 500M DAU, each uploading 2 photos per day and viewing 50, average photo 2 MB after server-side compression. State assumptions and call out which number forces a specific storage choice.",
            thinkAbout: [
              "What does the read:write skew tell you about where the serving load actually lands?",
              "Which storage number rules out a relational database for the blobs, and what does it force instead?",
              "Where do thumbnails and metadata live, and how much smaller is metadata than the blobs?",
            ],
            modelAnswerOutline: [
              "Assumptions: 500M DAU, 2 uploads/day and 50 views/day per user, 2 MB per stored photo (post-compression, before thumbnails), 3x peak multiplier, replication factor 3.",
              "**QPS.** Uploads/day = 500M x 2 = 10^9; views/day = 2.5 x 10^10. Dividing by ~10^5 s/day: avg upload QPS ~10,000 and avg view QPS ~250,000; with a 3x peak, ~30k peak upload QPS and ~750k peak view QPS. The 75:1 read:write skew screams CDN plus object store, not database-served images.",
              "**Storage.** New photos/day = 10^9 at 2 MB each = 2 PB/day of raw blobs; with RF=3 about 6 PB/day provisioned, plus 10 to 20% for thumbnails. Over a year the blob footprint is on the order of an exabyte.",
              "That single number forces the storage choice: photos must live in an object store (S3-class) fronted by a CDN, with only compact metadata (photo id, owner, S3 key, timestamps, ~1 KB/photo, so ~1 TB/day) in a sharded database. You cannot put multi-petabyte-per-day blobs in Postgres.",
              "**Serving implications:** 750k peak view QPS is served almost entirely from the CDN edge, so origin QPS is a small fraction. 30k peak upload QPS goes through an ingest tier that writes blobs to the object store and enqueues thumbnail generation (Kafka or SQS plus workers). Metadata writes at 30k QPS need sharding by photo id or user id.",
              "Common wrong turn: sizing a database to hold the images themselves, or forgetting that egress at this view volume is a CDN and bandwidth-cost problem, not a database problem.",
            ],
          },
        },
        {
          id: "sd-l0-qps-read-write",
          title: "QPS and Read-vs-Write Modeling",
          summary:
            "Derive read and write QPS separately, use the ratio to pick which path to optimize, and model where fan-out multiplies the real load.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["estimation", "read-write-ratio"],
          teach: {
            markdown: qpsReadWriteTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l0-qps-read-write-apply",
            prompt:
              "Derive read QPS vs write QPS for a social feed from DAU and a fan-out assumption, then state whether you would optimize the read or write path.",
            thinkAbout: [
              "What is the read:write ratio, and does it point you to cache-heavy or write-optimized design?",
              "Is fan-out done on read or on write, and how does that change QPS?",
              "How do hotspots and Zipfian access change the averages?",
            ],
            modelAnswerOutline: [
              "Assumptions: 50M DAU, each opens the feed 20 times/day (reads) and posts 0.5 times/day (writes), average 200 followers, 3x peak multiplier.",
              "**Base QPS.** Reads/day = 50M x 20 = 10^9, so avg ~10k and peak ~30k read QPS. Writes/day = 50M x 0.5 = 2.5 x 10^7, so avg ~250 and peak ~750 post QPS. The base read:write ratio is about 40:1, firmly read-heavy.",
              "**The ratio says optimize the read path.** Reads must be a cheap cache lookup, not a live merge across hundreds of followees. So fan out on write: when a user posts, push the post id into each follower's precomputed feed (a per-user list in Redis). A feed read becomes a single cache range-read.",
              "**But fan-out changes the real write cost.** Each post touches ~200 follower feeds, so effective feed-insert QPS = 250 x 200 = 50k avg (150k peak) cache writes. The dominant write load now lives in the cache/feed-store tier, not the source-of-truth posts table (still only ~750 peak QPS). Size the fan-out workers and cache write throughput for 150k peak inserts.",
              "**Hotspots force a hybrid.** A celebrity with 10M followers would trigger 10M feed inserts per post, a write storm fan-out-on-write cannot absorb. Users above a follower threshold (say 100k) are fan-out-on-read: their posts are pulled and merged at read time. Zipfian access also makes viral posts hot keys, so replicate hot feed entries across cache nodes and coalesce duplicate reads.",
              "**Server count:** 30k peak read QPS at ~10k QPS/server is ~4 app servers plus headroom; a Redis cluster sized for 150k+ writes/sec handles fan-out.",
              "Common wrong turn: reporting the 40:1 ratio, declaring 'read-heavy, add a cache,' and never noticing that fan-out-on-write made the system write-bound in the cache tier.",
            ],
          },
          practice: {
            id: "sd-l0-qps-read-write-practice",
            prompt:
              "Model send QPS vs delivery QPS for WhatsApp-scale group messaging assuming 2B users, 40 messages sent per user per day, and an average group size of 8. Decide whether the delivery path or the send path is the scaling bottleneck and justify the fan-out strategy.",
            thinkAbout: [
              "How does group size turn one send into many deliveries, and what multiplier does that put on QPS?",
              "Is messaging read-heavy like a feed, or delivery/write-heavy, and what does that flip in your design?",
              "How does the online-vs-offline split of recipients change the delivery mechanism?",
            ],
            modelAnswerOutline: [
              "Assumptions: 2B users, 40 sends/user/day, average group size 8 (each sent message fans out to ~7 other recipients), 3x peak multiplier.",
              "**Send QPS.** Messages sent/day = 2B x 40 = 8 x 10^10. Divided by ~10^5 s/day: avg ~800k send QPS, peak ~2.4M send QPS.",
              "**Delivery QPS.** Each send delivers to ~7 recipients, so deliveries/day = 5.6 x 10^11: avg ~5.6M and peak ~17M delivery QPS. The delivery path is roughly 7x the send path and is clearly the bottleneck. Messaging is write/delivery-heavy, the opposite of a read-heavy feed.",
              "**Fan-out strategy.** On send, write the message once to a durable per-conversation log (Cassandra-class store), then fan out delivery per recipient: push over an existing persistent connection (WebSocket) if the device is online, or write to a per-user pending queue and trigger a push notification (APNs/FCM) if offline. Delivery is fan-out-on-write into per-recipient inboxes.",
              "**Bottleneck handling.** 17M peak delivery QPS demands a large fleet of connection servers, each holding hundreds of thousands of live WebSockets, sharded by user id, with a pub/sub or routing layer to find which connection server holds a given recipient. Large groups are the hot spots: a 1,000-member group turns one send into 1,000 deliveries, so cap group size and treat very large groups closer to a broadcast/read model.",
              "Common wrong turn: optimizing the send write (only 2.4M QPS) and under-provisioning the delivery fan-out (the 17M-QPS reality), or forgetting the online-vs-offline split that decides push-vs-queue.",
            ],
          },
        },
      ],
    },
  ],
}
