/**
 * System Design — Level 0: Interview & Communication Method.
 *
 * Fully authored: 15 lessons across 4 modules (sd-l0-m1..m4), compiled from
 * `docs/system-design-curriculum/content/sd-l0-m*.md` with ids verbatim from
 * `docs/system-design-curriculum/curriculum-map.json`.
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "You get three to five questions for 'Design Twitter'. Sort these candidates: which answers eliminate whole branches of the design tree, and which just burn the clock?",
  "buckets": [
    "Eliminates design branches",
    "Burns the clock"
  ],
  "items": [
    {
      "label": "Roughly how many daily active users are we designing for?",
      "bucket": "Eliminates design branches",
      "feedback": "Scale decides one database versus a sharded fleet. Whole branches fall away with one answer."
    },
    {
      "label": "Is the workload read-heavy or write-heavy?",
      "bucket": "Eliminates design branches",
      "feedback": "The read/write mix decides whether you reach for caches and fan-out or for write batching. Few answers move the design more."
    },
    {
      "label": "Which cloud provider does the company prefer?",
      "bucket": "Burns the clock",
      "feedback": "Tempting because it sounds practical, but the architecture has the same shape on any provider. Nothing is eliminated."
    },
    {
      "label": "Should search and ads be out of scope?",
      "bucket": "Eliminates design branches",
      "feedback": "Naming what you are not building is how you protect the time budget. A yes here shrinks the problem to something finishable."
    },
    {
      "label": "What language will the services be written in?",
      "bucket": "Burns the clock",
      "feedback": "Feels like an engineering question, but no design branch in this round depends on the implementation language."
    }
  ]
}
\`\`\`

### 3. Restate, then commit

Play the interviewer back their own problem in one sentence ("So: a home-timeline service for tens of
millions of daily users, read-heavy, eventual consistency is fine for the feed"). If they agree, you
have a shared contract and you move. If they correct you, you just avoided designing the wrong system.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You ask 'How many users should I design for?' and the interviewer shrugs: 'You tell me.' What is the strongest response?",
  "options": [
    {
      "label": "Ask a narrower follow-up, like whether it is more or less than a million users",
      "feedback": "Tempting, a narrower question feels safer. But you are still waiting for the oracle to hand you an answer, and the clock keeps running."
    },
    {
      "label": "Propose a number out loud: 'I will assume 100 million DAU and a 100:1 read to write ratio, is that reasonable?'",
      "correct": true,
      "feedback": "Right. Treat the interviewer as a collaborator: a proposed assumption gets a yes or a correction in seconds, and either way it signals seniority."
    },
    {
      "label": "Skip scale for now and start on the data model; you can size things later",
      "feedback": "Tempting because it feels like progress, but scale decides one database versus a sharded fleet. Sizing later can mean redesigning later."
    }
  ]
}
\`\`\`

### The mindset that makes this work

Treat the interviewer as a **collaborator, not an oracle.** You are allowed to propose an assumption
("I will assume 100 million DAU and a 100:1 read/write ratio, is that reasonable?") instead of asking
an open question and waiting. Proposing assumptions is faster, and it signals seniority.

The two failure modes to avoid: **interrogating** the interviewer with a dozen questions until the
clock is gone, and **jumping to boxes and arrows** before anyone has agreed on what the system is.
Three to five questions, a restated scope, then draw.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "The interviewer says 'design a photo-sharing app' and goes quiet. What is the strongest opening move?",
  "options": [
    {
      "label": "Start drawing the load balancer and services so the whiteboard fills early",
      "feedback": "Tempting, because momentum feels like progress. But you are now designing an unagreed system: this is the jumping-to-boxes failure mode the lesson names."
    },
    {
      "label": "Ask a dozen clarifying questions until every requirement is pinned down",
      "feedback": "Half right: clarifying matters, but interrogation burns the clock. The lesson's bar is three to five questions, not a checklist recital."
    },
    {
      "label": "Propose scoped assumptions out loud (users, scale, read/write mix), get a nod, restate, then draw",
      "correct": true,
      "feedback": "Right. Proposing assumptions instead of open-ended asking is faster and signals seniority, and the restated scope becomes your shared contract."
    }
  ],
  "reveal": "In your design write below, open exactly this way: propose the scale and consistency assumptions, restate the scope in one sentence, and only then name components."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort these statements for a photo-sharing app: which are functional requirements, and which are implementation details leaking in too early?",
  "buckets": [
    "Functional requirement",
    "Implementation detail"
  ],
  "items": [
    {
      "label": "Users can post a photo with a caption",
      "bucket": "Functional requirement",
      "feedback": "A user capability: it hands you the noun Photo and the verb post, which becomes 'POST /photos'."
    },
    {
      "label": "The system stores photos in S3",
      "bucket": "Implementation detail",
      "feedback": "Tempting because it sounds concrete and technical, but where the bytes live is a design decision you make after scoping and estimating, not a requirement."
    },
    {
      "label": "Users can follow other users",
      "bucket": "Functional requirement",
      "feedback": "A capability that seeds the Follow entity. Without the graph, a feed has no meaning."
    },
    {
      "label": "The feed is precomputed into a Redis cache",
      "bucket": "Implementation detail",
      "feedback": "That is a fan-out strategy, a choice your estimates should drive later. Committing to it now is premature."
    },
    {
      "label": "Users can view a feed of photos from people they follow",
      "bucket": "Functional requirement",
      "feedback": "The consumption capability, and the one that will force the fan-out decision when you design the read path."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your three requirements for a video site are: users can upload a video, users can subscribe to a channel, users can view a feed of new videos. What should fall out of them almost mechanically?",
  "options": [
    {
      "label": "Three entities (Video, Subscription, Feed) and one endpoint per verb",
      "correct": true,
      "feedback": "Right. Nouns become entities and verbs become endpoints: upload becomes 'POST /videos', subscribe becomes 'POST /subscriptions', view feed becomes 'GET /feed'. Well-phrased requirements seed the whole design."
    },
    {
      "label": "A fully normalized schema with every column and index",
      "feedback": "Tempting, it feels rigorous. But enumerating columns now burns time without revealing systems thinking. At this stage you only need the nouns and their shape."
    },
    {
      "label": "Nothing yet; requirements are throwaway context and the real design starts with boxes",
      "feedback": "This is the trap the lesson closes: requirements phrased as 'users can X' are the seed of the data model and the API, not throwaway prose."
    }
  ],
  "reveal": "In your design write below, state exactly three 'users can X' requirements, pull the nouns into entities and the verbs into endpoints, and defer the rest with one sentence on why deferral is safe."
}
\`\`\`
`.trim()

const nonfunctionalRequirementsTeach = `
## NFRs are where the architecture is decided

Functional requirements say what the system does; non-functional requirements (NFRs) say how well it
must do it, and they are where most of the architecture is actually decided. The trap is that NFRs are
easy to fake. "The system should be scalable and reliable" is filler: it is true of every system and
changes no decision. A real NFR is quantified and testable. Compare "the feed should be fast" with
"p99 feed load latency under 200ms." Only the second one tells you whether you need a cache, and only
the second one can be verified against a dashboard.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort these candidate NFRs: which could you put on a dashboard and alert on, and which are filler that changes no decision?",
  "buckets": [
    "Testable, drives a decision",
    "Filler"
  ],
  "items": [
    {
      "label": "p99 feed load latency under 200ms",
      "bucket": "Testable, drives a decision",
      "feedback": "A percentile with a number: it tells you whether you need a cache, and a Grafana panel can verify it."
    },
    {
      "label": "The system should be scalable and reliable",
      "bucket": "Filler",
      "feedback": "True of every system ever built, so it changes nothing. This is the classic faked NFR."
    },
    {
      "label": "Average latency should stay low",
      "bucket": "Filler",
      "feedback": "Tempting because it mentions a metric, but 'low' is not a number, and averages hide the tail latency users actually feel. The next paragraph explains why percentiles win."
    },
    {
      "label": "99.99% availability on the read path",
      "bucket": "Testable, drives a decision",
      "feedback": "A specific count of nines: about 52 minutes of downtime a year, which forces the multi-region conversation."
    },
    {
      "label": "Sustain 50k peak QPS at 100M DAU",
      "bucket": "Testable, drives a decision",
      "feedback": "Concrete scale you can load-test against, and the number that forces sharding."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "For the feed you promise both strong consistency and 99.99% availability. Then a network partition splits your replicas. What are your options?",
  "options": [
    {
      "label": "Keep both promises; that is what replication is for",
      "feedback": "Tempting, replication solves many things. But during a partition the replicas cannot talk: serving reads risks stale data, and refusing them sacrifices availability. There is no third door."
    },
    {
      "label": "Pick one: serve possibly stale data (availability) or refuse requests (consistency)",
      "correct": true,
      "feedback": "Right. Under a partition it is availability or consistency, never both. For a feed, a few seconds of staleness beats an error page, which is the AP stance the next paragraph defends."
    },
    {
      "label": "Invest in better network hardware so partitions never happen",
      "feedback": "Partitions are a when, not an if, in any distributed system. A design that assumes they never happen has no answer when the interviewer forces the choice."
    }
  ]
}
\`\`\`

### Take a consistency stance out loud

The consistency stance is the one interviewers probe hardest. For a feed, take an explicit position:
"I favor availability over strong consistency. If a follower sees a new tweet a few seconds late, that
is fine; if the feed is unavailable, that is not. So per PACELC, I choose AP during a partition and,
even without a partition, I trade consistency for latency by serving from replicas and caches." That is
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You are about to write NFRs for your own design below. You write 'p99 feed read under 200ms'. What must the very next sentence do?",
  "options": [
    {
      "label": "Name the lever it forces: a cache tier and CDN on the read path",
      "correct": true,
      "feedback": "Right. NFR then lever is the habit that separates a candidate who lists requirements from one who uses them to drive the architecture."
    },
    {
      "label": "Add more NFRs so the list looks thorough",
      "feedback": "Tempting, coverage feels safe. But an NFR that forces no lever is filler, and a long list of them reads as padding rather than rigor."
    },
    {
      "label": "Soften it to 'reads should generally be fast' in case you miss the target",
      "feedback": "That un-quantifies the requirement: no dashboard can verify 'generally fast', so it can no longer drive or defend any decision."
    }
  ],
  "reveal": "In your design write, give each NFR three parts: a number (a percentile, nines, or QPS), the lever it forces, and, for consistency, an explicit AP or CP stance with the reason your system tolerates staleness or cannot."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A stakeholder pushes for 301 redirects on your shortener because browsers cache them and repeat visits get faster. What does that speed cost you?",
  "options": [
    {
      "label": "Nothing; a permanent redirect is strictly better for a link that never changes",
      "feedback": "Tempting, the latency win is real. But 'never changes' hides the catch: once browsers cache the 301 they stop calling you, so you can never repoint the link or count another click."
    },
    {
      "label": "Click analytics and the ability to ever repoint the link",
      "correct": true,
      "feedback": "Right. Cached 301s mean requests stop flowing through your service. Most shorteners accept the extra request of a 302 to keep control and the click data."
    },
    {
      "label": "A bit of extra storage for the cached entries",
      "feedback": "Storage is not the issue: the browser holds the mapping, not you. The real loss is that traffic bypasses your service entirely."
    }
  ]
}
\`\`\`

### Choose the protocol deliberately

REST over HTTP is the right default for a public-facing API: it is cacheable, universally understood,
and works through any client. Use gRPC for internal service-to-service calls where you control both
ends and want lower latency and typed contracts (a Protobuf schema, binary framing, HTTP/2
multiplexing). Use a streaming protocol (WebSocket, Server-Sent Events, or gRPC streaming) when the
server must push, like a live location feed or a chat. State which and why: "REST for the public create
and redirect endpoints, gRPC between the API gateway and the internal link service."

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Pick the right protocol for each call in a ride-sharing system.",
  "buckets": [
    "REST",
    "gRPC",
    "Streaming"
  ],
  "items": [
    {
      "label": "Public endpoint where a rider requests a trip",
      "bucket": "REST",
      "feedback": "Public-facing, cacheable, callable from any client: the REST default earns its place here."
    },
    {
      "label": "API gateway calling the internal pricing service, both ends owned by you",
      "bucket": "gRPC",
      "feedback": "You control both ends, so typed Protobuf contracts, binary framing, and HTTP/2 multiplexing beat REST's universality."
    },
    {
      "label": "Pushing the driver's live location to the rider's map every second",
      "bucket": "Streaming",
      "feedback": "The server must push without being asked: WebSocket, SSE, or gRPC streaming, not request-response polling."
    },
    {
      "label": "A third-party partner API for booking trips from another app",
      "bucket": "REST",
      "feedback": "Tempting to reuse gRPC everywhere, but you do not control the partner's stack. REST is the universal boundary."
    },
    {
      "label": "Trip-status updates like 'driver arriving' pushed to the rider",
      "bucket": "Streaming",
      "feedback": "Another server-push case: polling a REST endpoint would waste requests and still feel laggy."
    }
  ]
}
\`\`\`

Two boundary concerns belong in the API sketch because they are easy to forget and interviewers look
for them. **Idempotency:** for creates, an idempotency key makes retries safe (the client can retry a
timed-out \`POST /links\` without creating duplicate codes for the same URL). **Pagination and auth:**
any endpoint returning a list needs cursor-based pagination (\`?cursor=...&limit=25\`), and any write or
private read needs an auth token at the boundary. Mentioning where these live shows you have designed
real APIs, not just toy ones.

Recap: Turn requirement nouns into entities with only the design-relevant fields, define one endpoint
per requirement with concrete request/response shapes, choose REST vs gRPC vs streaming deliberately,
and place idempotency, pagination, and auth at the boundary.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "A client calls 'POST /links', the response times out, and the client retries. Without an idempotency key, what does your design risk?",
  "options": [
    {
      "label": "Nothing; the second request fails because the URL already exists",
      "feedback": "Tempting, but nothing in a plain 'POST /links' deduplicates. The server cannot tell the retry is the same logical request, so it happily creates a second code."
    },
    {
      "label": "Two different short codes for the same long URL",
      "correct": true,
      "feedback": "Right. The timeout is ambiguous, so the first request may have succeeded. An idempotency key lets the server recognize the retry and return the original code."
    },
    {
      "label": "The retry is rejected automatically because HTTP forbids duplicate POSTs",
      "feedback": "HTTP has no such rule: POST is explicitly non-idempotent, which is exactly why the key must be designed in at the boundary."
    }
  ],
  "reveal": "In your design write, name the entities with only their design-relevant fields, sketch one endpoint per requirement with concrete shapes, state your protocol choice with a reason, and mark where idempotency, pagination, and auth live."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "calc",
  "title": "Fermi engine: from assumptions to peak QPS",
  "predictPrompt": {
    "question": "50M users each do 10 reads per day. Roughly what average read QPS is that?",
    "options": [
      "About 50 QPS",
      "About 500 QPS",
      "About 5,000 QPS",
      "About 50,000 QPS"
    ]
  },
  "workedExample": "With the initial 50M DAU doing 10 reads and 1 write per user per day, the arithmetic gives 5,000 average read QPS and 500 average write QPS, and the 3x peak multiplier lifts those to 15,000 and 1,500. Drag DAU up to 500M and watch every number in the chain shift one power of ten.",
  "inputs": [
    {
      "kind": "slider",
      "id": "dau",
      "label": "Daily active users",
      "min": 100000,
      "max": 1000000000,
      "scale": "log",
      "initial": 50000000,
      "unit": "users"
    },
    {
      "kind": "slider",
      "id": "reads_per_user",
      "label": "Reads per user per day",
      "min": 1,
      "max": 100,
      "scale": "linear",
      "step": 1,
      "initial": 10
    },
    {
      "kind": "slider",
      "id": "writes_per_user",
      "label": "Writes per user per day",
      "min": 0.5,
      "max": 20,
      "scale": "linear",
      "step": 0.5,
      "initial": 1
    },
    {
      "kind": "slider",
      "id": "peak_multiplier",
      "label": "Peak-to-average multiplier",
      "min": 1,
      "max": 5,
      "scale": "linear",
      "step": 0.5,
      "initial": 3,
      "unit": "x"
    }
  ],
  "outputs": [
    {
      "id": "avg_read_qps",
      "label": "Average read QPS",
      "expr": "dau * reads_per_user / 100000",
      "format": "compact",
      "unit": "QPS"
    },
    {
      "id": "avg_write_qps",
      "label": "Average write QPS",
      "expr": "dau * writes_per_user / 100000",
      "format": "compact",
      "unit": "QPS"
    },
    {
      "id": "peak_read_qps",
      "label": "Peak read QPS",
      "expr": "avg_read_qps * peak_multiplier",
      "format": "compact",
      "unit": "QPS",
      "sparkline": {
        "over": "dau"
      }
    },
    {
      "id": "peak_write_qps",
      "label": "Peak write QPS",
      "expr": "avg_write_qps * peak_multiplier",
      "format": "compact",
      "unit": "QPS"
    }
  ],
  "caption": "The chain the lesson teaches: users x actions per day, divided by roughly 10^5 seconds per day, then converted from average to peak."
}
\`\`\`

**Interview nuance:** interviewers do not care whether you land on 5,000 or 6,200 QPS. They care that
you can defend the shape of the calculation and that you convert average to peak. Saying "I will assume
a 3x peak multiplier because of the daily traffic curve" scores; a single unexplained number does not.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You have peak read and write QPS on the board and eight minutes of estimation time left. What do you do with it?",
  "options": [
    {
      "label": "Derive storage, bandwidth, and memory for every entity to show rigor",
      "feedback": "Tempting, thoroughness feels safe. But this is analysis paralysis: minutes spent on numbers that move no decision while the design goes untouched."
    },
    {
      "label": "Compute a number only if it would change a design decision, then move to the design",
      "correct": true,
      "feedback": "Right. Peak write QPS tells you whether to shard; read QPS tells you whether you need a cache tier. If a calculation cannot move the architecture, skip it."
    },
    {
      "label": "Recompute the QPS with exact seconds per day to tighten the estimate",
      "feedback": "Precision is not the product: 86,400 versus 10^5 changes nothing you will decide. The interviewer cares about the shape of the calculation, not the third digit."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your Fermi chain lands on 5,000 average read QPS. The interviewer asks what the system must be built to survive. Your answer?",
  "options": [
    {
      "label": "5,000 QPS; that is what the arithmetic says",
      "feedback": "Tempting, it is the number you just derived. But it is a daily average, and real traffic is peaky: a system built to the mean falls over at the evening peak."
    },
    {
      "label": "About 15,000 QPS, stating a 3x peak multiplier for the diurnal curve",
      "correct": true,
      "feedback": "Right. A stated 2 to 3x peak-to-average multiplier is the defensible move: the interviewer can challenge the multiplier instead of the whole result."
    },
    {
      "label": "50,000 QPS, just to be safe",
      "feedback": "An unexplained 10x is just a different unjustified number. What scores is the assumption said out loud, not the padding."
    }
  ],
  "reveal": "In your design write, run this exact chain: state assumptions, label units, round to powers of ten, convert average to peak out loud, and let each number you compute justify one design decision."
}
\`\`\`
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

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Before reading the comparison, commit: which delivery strategy does each property belong to?",
  "buckets": [
    "Fan-out on write (push)",
    "Fan-out on read (pull)"
  ],
  "items": [
    {
      "label": "Reading a feed is one cheap cache lookup",
      "bucket": "Fan-out on write (push)",
      "feedback": "Push pays at write time so the read is precomputed: one cache GET and done."
    },
    {
      "label": "One post triggers an insert into every follower's feed",
      "bucket": "Fan-out on write (push)",
      "feedback": "The cost side of push: the write amplifies by the follower count."
    },
    {
      "label": "Posting is a single cheap append",
      "bucket": "Fan-out on read (pull)",
      "feedback": "Pull defers the work: the write path stays light because nobody's feed is touched yet."
    },
    {
      "label": "Opening the feed means fetching from every followee and merging",
      "bucket": "Fan-out on read (pull)",
      "feedback": "The deferred cost lands here: N fetches plus a merge and sort at query time."
    },
    {
      "label": "The better fit for a celebrity with 10 million followers",
      "bucket": "Fan-out on read (pull)",
      "feedback": "Tempting to say push since feed reads dominate, but pushing one celebrity post means 10 million inserts. Pulling their posts at read time caps the blast radius."
    }
  ]
}
\`\`\`

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

\`\`\`cswidget
{
  "type": "calc",
  "title": "Fan-out: what the delivery strategy does to write QPS",
  "predictPrompt": {
    "question": "50M DAU post 0.5 times a day with 200 followers each. With push (fan-out on write), what is the effective feed-insert QPS?",
    "options": [
      "About 250",
      "About 5,000",
      "About 50,000",
      "About 500,000"
    ]
  },
  "workedExample": "At the initial values (50M DAU, 0.5 posts per user per day, 200 followers, push delivery) the posts table sees only 250 average write QPS, but push fan-out multiplies that into 50,000 feed inserts per second, while feed reads at 20 opens per user per day run 10,000 QPS for a 40:1 read:write ratio. Switch the strategy to pull to collapse the fan-out back to 250, then drag followers toward 10M to see why celebrities break pure push and why the hybrid caps the damage.",
  "inputs": [
    {
      "kind": "slider",
      "id": "dau",
      "label": "Daily active users",
      "min": 1000000,
      "max": 2000000000,
      "scale": "log",
      "initial": 50000000,
      "unit": "users"
    },
    {
      "kind": "slider",
      "id": "posts_per_user",
      "label": "Posts per user per day",
      "min": 0.1,
      "max": 5,
      "scale": "linear",
      "step": 0.1,
      "initial": 0.5
    },
    {
      "kind": "slider",
      "id": "followers",
      "label": "Average followers per user",
      "min": 1,
      "max": 10000000,
      "scale": "log",
      "initial": 200,
      "unit": "followers"
    },
    {
      "kind": "select",
      "id": "strategy_cap",
      "label": "Delivery strategy",
      "options": [
        {
          "label": "Push: fan out on write to every follower",
          "value": 100000000
        },
        {
          "label": "Pull: write once, merge at read time",
          "value": 1
        },
        {
          "label": "Hybrid: push, capped at a 100k-follower celebrity cutoff",
          "value": 100000
        }
      ],
      "initial": 0
    }
  ],
  "outputs": [
    {
      "id": "write_qps",
      "label": "Average post write QPS",
      "expr": "dau * posts_per_user / 100000",
      "format": "compact",
      "unit": "QPS"
    },
    {
      "id": "fanout_write_qps",
      "label": "Effective fan-out write QPS",
      "expr": "write_qps * min(followers, strategy_cap)",
      "format": "compact",
      "unit": "QPS",
      "sparkline": {
        "over": "followers"
      }
    },
    {
      "id": "read_qps",
      "label": "Average feed read QPS (20 opens per user per day)",
      "expr": "dau * 20 / 100000",
      "format": "compact",
      "unit": "QPS"
    },
    {
      "id": "rw_ratio",
      "label": "Read:write ratio",
      "expr": "read_qps / write_qps",
      "format": "number",
      "unit": ":1"
    }
  ],
  "caption": "The naive write QPS understates the real load: the strategy multiplier decides where the fan-out cost lands."
}
\`\`\`

### Averages lie: design for the hot key

Access is Zipfian: a small number of hot keys (viral posts, celebrity accounts, trending products)
take a hugely disproportionate share of traffic. Your design must survive the hot key, not just the
average. A hot key can saturate a single cache node or shard even when the fleet-wide average looks
fine, so you plan for replication of hot keys or request coalescing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your cache fleet averages 15% utilization with plenty of headroom. A post goes viral. Is the fleet safe?",
  "options": [
    {
      "label": "Yes; 15% average leaves more than 6x headroom before saturation",
      "feedback": "Tempting, the fleet-wide math checks out. But a viral post is one hot key living on one node: that single node can saturate while the average still reads 15%."
    },
    {
      "label": "No; the one node that owns the hot key can saturate",
      "correct": true,
      "feedback": "Right. Access is Zipfian, so a few keys take a wildly disproportionate share. You survive it by replicating hot keys or coalescing requests, not by trusting the average."
    },
    {
      "label": "Only if total traffic more than doubles",
      "feedback": "Total volume barely needs to move: the danger is distribution, not volume. One key's share can crush its shard while fleet totals look calm."
    }
  ]
}
\`\`\`

Finally, translate QPS into a first-order server count. If a tuned application server handles ~10k
QPS, then 30k peak read QPS needs at least 3 to 4 app servers behind the load balancer plus headroom,
and a cache handling 100k+ ops/sec covers the feed reads.

Recap: derive read and write QPS separately, take the ratio to decide read-optimized versus
write-optimized, model where fan-out happens (write vs read, and a celebrity hybrid), and design for
the hot key rather than the average.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your estimate says 40:1 read-heavy, and you chose push fan-out with an average of 200 followers per user. Which conclusion is right?",
  "options": [
    {
      "label": "The write path is safe; put all your effort into the read path",
      "feedback": "Tempting, 40:1 sounds decisive. But push multiplies every post by 200 followers: 250 QPS of posts becomes 50,000 QPS of feed inserts, and that amplified write load is now your biggest number."
    },
    {
      "label": "Model the fan-out: effective feed-insert QPS is the post rate times followers, so the write side needs real design work",
      "correct": true,
      "feedback": "Right. The ratio alone is not enough; you must model where the fan-out happens. 250 x 200 is 50k inserts per second, larger than the 10k read QPS."
    },
    {
      "label": "Switch everything to pull so the write amplification disappears",
      "feedback": "Pull fixes the celebrity problem but gives every ordinary feed load N fetches and a merge. The senior answer is the hybrid: push for normal users, pull for celebrities."
    }
  ],
  "reveal": "In your design write, derive read and write QPS separately, state the ratio, show where fan-out multiplies which path, name your push, pull, or hybrid choice, and say how you survive the hot key rather than the average."
}
\`\`\`
`.trim()

const storageBandwidthCacheTeach = `
## Three capacity numbers, three formulas, three classic mistakes

Storage, bandwidth, and cache are the three capacity numbers that decide your datastore, your CDN
strategy, and your cache tier. Each has a formula and a classic mistake.

### Storage: metadata and blobs are different systems

The base formula is:

\`\`\`
storage = objects/day  x  object size  x  retention (days)
\`\`\`

The critical discipline is to separate metadata from blobs. A photo is 2 MB of blob but only ~1 KB of
metadata (id, owner, timestamps, storage key, caption). These belong in different systems: blobs in an
object store (S3), metadata in a sharded database. Estimating them together hides the fact that your
database only needs to hold gigabytes while your object store holds petabytes.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your raw math says 12 TB of photos over the retention window, stored in a durable RF=3 object store. What number do you quote as provisioned storage?",
  "options": [
    {
      "label": "12 TB, the number the formula gave",
      "feedback": "Tempting because the formula really did produce it, but that is raw payload only. Durable stores keep 3 copies, so quoting 12 TB understates the real footprint by 3x."
    },
    {
      "label": "About 36 TB, plus a bit more once index overhead is counted",
      "correct": true,
      "feedback": "Right. RF=3 triples raw storage, and on the database side secondary indexes and overhead add another 20 to 50 percent. Provisioned storage is raw times replication plus overhead."
    },
    {
      "label": "About 120 TB, since replication is usually 10x",
      "feedback": "Replication is expensive but not that expensive. Standard durable replication is 3 copies, and erasure coding for cold blobs pulls the multiplier down toward 1.3x to 1.5x, not up."
    }
  ]
}
\`\`\`

Two multipliers people forget, both of which change the answer materially:

- **Replication factor.** Durable stores keep 3 copies (RF=3), so multiply raw storage by 3. Erasure
  coding can bring this down to ~1.3x to 1.5x for cold blobs, a real cost lever worth naming.
- **Index and overhead.** Secondary indexes, B-tree overhead, and free space commonly add 20 to 50% on
  top of raw row size for databases.

### Bandwidth: ingress and egress separately

\`\`\`
bandwidth = QPS  x  payload size
ingress = write QPS x write payload      (upload path)
egress  = read QPS  x read payload       (download/serve path)
\`\`\`

Egress is usually the larger and more expensive number, and in cloud pricing egress leaves your
provider's network at real dollar cost. A read-heavy media service serving 2 MB objects at 250k QPS is
pushing 500 GB/s of egress, which is a "you must use a CDN" signal, not a "size your app servers"
signal, because the CDN serves it from the edge and shields the origin.

### Cache sizing with the 80/20 rule

You do not cache the whole corpus; you cache the hot working set. The Pareto assumption is that ~20%
of data serves ~80% of requests, and often it is far more skewed (the recent and the viral). Size the
cache from that hot fraction:

\`\`\`
cache size ~= hot fraction (~20%) of the actively-read dataset
\`\`\`

For a service with a 4.5 TB actively-read dataset, an 80/20 cut suggests roughly 900 GB of hot data,
but in practice the truly hot set is the last few days plus trending items, often a much smaller
absolute number like tens to low hundreds of GB. Verify the hit rate assumption: if 100 GB of cache
yields a 90%+ hit rate, you have removed 90% of read load from the datastore, which is what justifies
the cache economically.

\`\`\`cswidget
{
  "type": "calc",
  "title": "Storage, ingress, and the 80/20 cache in one chain",
  "predictPrompt": {
    "question": "50M records a day at 1 KB each, kept for 90 days. Roughly how much raw storage is that?",
    "options": [
      "About 45 GB",
      "About 450 GB",
      "About 4.5 TB",
      "About 45 TB"
    ]
  },
  "workedExample": "At the initial 50M records per day, 1,000 bytes each, and 90 days of retention, raw storage lands at 4.5 TB and ingress is a modest 500 KB/s, while the 80/20 cut sizes the hot cache at roughly 900 GB for the 80% hit target. Push bytes per record up to 2 MB (a photo instead of a row) and watch storage jump three orders of magnitude toward petabytes.",
  "inputs": [
    {
      "kind": "slider",
      "id": "records_per_day",
      "label": "New records per day",
      "min": 100000,
      "max": 10000000000,
      "scale": "log",
      "initial": 50000000,
      "unit": "records"
    },
    {
      "kind": "slider",
      "id": "bytes_per_record",
      "label": "Bytes per record",
      "min": 100,
      "max": 10000000,
      "scale": "log",
      "initial": 1000,
      "unit": "bytes"
    },
    {
      "kind": "slider",
      "id": "retention_days",
      "label": "Retention",
      "min": 1,
      "max": 1825,
      "scale": "linear",
      "step": 1,
      "initial": 90,
      "unit": "days"
    },
    {
      "kind": "slider",
      "id": "cache_hit_target",
      "label": "Cache hit target",
      "min": 50,
      "max": 99,
      "scale": "linear",
      "step": 1,
      "initial": 80,
      "unit": "%"
    }
  ],
  "outputs": [
    {
      "id": "storage_total",
      "label": "Raw storage over retention",
      "expr": "records_per_day * bytes_per_record * retention_days",
      "format": "bytes",
      "sparkline": {
        "over": "retention_days"
      }
    },
    {
      "id": "ingress_bandwidth",
      "label": "Ingress bandwidth",
      "expr": "records_per_day * bytes_per_record / 100000",
      "format": "bytes",
      "unit": "/s"
    },
    {
      "id": "cache_size",
      "label": "Hot cache size (80/20 rule)",
      "expr": "storage_total * 0.2 * cache_hit_target / 80",
      "format": "bytes"
    }
  ],
  "caption": "Raw storage before replication and index overhead; the hot 20% scales up as you chase a hit rate above 80."
}
\`\`\`

**Interview nuance:** interviewers probe "how big is your cache and why that size." The winning answer
ties cache size to a target hit rate and to the read load removed from the origin, not to a fraction of
total storage pulled from thin air.

\`\`\`
raw payload -> x replication -> + index/overhead = provisioned storage
hot 20% of reads -> cache size -> target hit rate -> read load removed
\`\`\`

Recap: size storage as objects x size x retention with metadata and blobs kept separate, multiply by
replication factor and add index overhead, compute ingress and egress bandwidth separately (egress
drives CDN), and size the cache from the hot ~20% against a target hit rate.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Sort each piece of a media service's data into the tier where it belongs.",
  "buckets": [
    "Object store",
    "Sharded database",
    "Cache tier"
  ],
  "items": [
    {
      "label": "The 2 MB photo blobs themselves",
      "bucket": "Object store",
      "feedback": "Blobs live in S3-class object storage, never in database rows. This split is what keeps the database at gigabytes while the object store holds petabytes."
    },
    {
      "label": "The 1 KB per-photo metadata rows",
      "bucket": "Sharded database",
      "feedback": "Metadata (id, owner, timestamps, storage key) is small and query-heavy, so it belongs in a sharded database."
    },
    {
      "label": "The hot 20 percent of actively read data",
      "bucket": "Cache tier",
      "feedback": "The Pareto cut: the recent and the viral serve most reads, and this slice is what you size the cache from, against a target hit rate."
    },
    {
      "label": "Secondary indexes and B-tree overhead",
      "bucket": "Sharded database",
      "feedback": "Index overhead adds 20 to 50 percent on top of raw row size, which is why it belongs in the database sizing, not the blob math."
    },
    {
      "label": "Five-year-old blobs almost nobody opens",
      "bucket": "Object store",
      "feedback": "Cold blobs stay in the object store, ideally erasure coded at roughly 1.4x instead of RF=3, a real cost lever worth naming."
    }
  ],
  "reveal": "In the design write, run the whole chain: objects x size x retention with metadata and blobs kept separate, multiply by replication and add index overhead, compute ingress and egress separately (egress is the CDN signal), then size the cache from the hot fraction against a target hit rate."
}
\`\`\`
`.trim()

const latencyNumbersTeach = `
## The constants that make your math credible

Fast, credible estimation rests on a small set of memorized constants. If you quote a same-datacenter
round trip as 50 ms or a memory read as 1 ms, every downstream number is wrong by orders of magnitude
and the interviewer stops trusting your math. This lesson is the cheat-sheet.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Before you open the ladder, commit to a number: roughly how long is a network round trip between two servers in the same datacenter?",
  "options": [
    {
      "label": "About 0.5 ms",
      "correct": true,
      "feedback": "Right. Same-DC round trips cost about half a millisecond, which is why a handful of sequential in-region calls is cheap but a chatty sequence of dozens is not."
    },
    {
      "label": "About 10 ms",
      "feedback": "Tempting because 10 ms feels like a fair price for any network hop, but 10 ms is disk-seek territory. Same-DC networking is about 20x faster than that."
    },
    {
      "label": "About 50 ms",
      "feedback": "That is a cross-region round trip, like US to EU. Quoting it for same-DC inflates every downstream estimate by about 100x, and the interviewer stops trusting the math."
    }
  ]
}
\`\`\`

<details>
<summary>The latency ladder</summary>

Rounded, order-of-magnitude, the numbers that matter:

\`\`\`
L1 cache reference            ~1 ns
Main memory (RAM) read        ~100 ns        (0.1 us)
Read 1 MB sequentially/RAM    ~10 us
SSD random read              ~100 us        (0.1 ms)
Round trip within same DC     ~0.5 ms
Read 1 MB from SSD            ~1 ms
Disk (HDD) seek               ~10 ms
Round trip cross-region       ~50-150 ms     (e.g. US-EU)
\`\`\`

</details>

The key ratios to internalize: memory is roughly 1,000x faster than an SSD random read, an SSD is
roughly 100x faster than an HDD seek, a same-datacenter round trip (~0.5 ms) is roughly 100x to 300x
faster than a cross-region round trip. These ratios are why you cache in memory, why you avoid random
disk seeks, and why you keep chatty request sequences within one region.

**Interview nuance:** the practical takeaway interviewers want is not the exact nanoseconds but the
design consequence. "Cross-region is ~100 ms, so a synchronous read-your-writes across regions will
feel slow; I will serve reads from a regional replica and replicate asynchronously" is the sentence
that earns the point.

<details>
<summary>Units, time, and object sizes</summary>

\`\`\`
1 KB ~= 10^3 bytes      1 MB ~= 10^6      1 GB ~= 10^9      1 TB ~= 10^12

1 day   ~= 86,400 s      ~= ~10^5 s
1 month ~= 2.5M s        ~= 2.5 x 10^6 s
1 year  ~= 31.5M s       ~= ~3 x 10^7 s

a text message / tweet      ~ 100s of bytes to ~1 KB
a database row (metadata)   ~ 1 KB
a compressed web page       ~ 100s of KB
a photo (post-compression)  ~ 1-2 MB
a minute of video (SD/HD)   ~ 5-15 MB
\`\`\`

</details>

<details>
<summary>Single-machine ceilings</summary>

The rough capacities you assume before proving otherwise:

\`\`\`
Tuned app server (stateless)   ~ 10k-50k QPS
Redis / in-memory cache node   ~ 100k+ ops/sec
Single relational DB primary   ~ few k writes/sec, tens of k reads/sec
One server's live connections  ~ 100k+ WebSockets (tuned)
\`\`\`

</details>

These ceilings turn a QPS number into a server count in one step: 30k peak read QPS at ~10k QPS/server
means 3 to 4 servers plus headroom; 1M write QPS against a ~5k-writes/sec DB node means you need ~200
shards, which immediately justifies a horizontally sharded datastore.

**Interview nuance:** you will not be graded on decimal precision. You will be graded on whether your
quoted numbers are within an order of magnitude and whether you convert them into a decision (cache
here, shard there, replicate this way). Being off by 1000x on a single constant can invalidate an
otherwise good design.

Recap: memorize the latency ladder (memory ~100 ns, SSD ~100 us, same-DC ~0.5 ms, cross-region ~50 to
150 ms), the day/month-to-seconds conversions, typical object sizes, and single-machine ceilings, then
always translate a number into a design decision.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "From memory, place each operation on its rung of the latency ladder.",
  "buckets": [
    "Nanoseconds",
    "Microseconds",
    "Milliseconds or more"
  ],
  "items": [
    {
      "label": "L1 cache reference",
      "bucket": "Nanoseconds",
      "feedback": "About 1 ns, the fastest rung on the ladder."
    },
    {
      "label": "Main memory (RAM) read",
      "bucket": "Nanoseconds",
      "feedback": "About 100 ns. Memory is roughly 1,000x faster than an SSD random read, which is the entire case for in-memory caching."
    },
    {
      "label": "SSD random read",
      "bucket": "Microseconds",
      "feedback": "About 100 us. It feels fast, but it is three orders of magnitude slower than RAM."
    },
    {
      "label": "Read 1 MB sequentially from RAM",
      "bucket": "Microseconds",
      "feedback": "About 10 us. Sequential access is far cheaper than the same bytes fetched randomly."
    },
    {
      "label": "Disk (HDD) seek",
      "bucket": "Milliseconds or more",
      "feedback": "About 10 ms per seek, which is why random disk access patterns are a design smell."
    },
    {
      "label": "Cross-region round trip",
      "bucket": "Milliseconds or more",
      "feedback": "50 to 150 ms. This is the constant that rules out chatty synchronous cross-region calls and argues for regional replicas."
    }
  ],
  "reveal": "In the design write, quote each constant within an order of magnitude and immediately convert it into a decision: cache hot reads in memory, avoid random seeks, keep chatty sequences inside one region, and turn QPS into a server or shard count using the single-machine ceilings."
}
\`\`\`
`.trim()

const phasedDeliveryClockTeach = `
## A system-design round is a time-boxed delivery problem

You have roughly 45 minutes, one interviewer, and one goal: end with a working design plus enough
depth to prove you can build it. The single biggest reason strong engineers fail this round is not
weak knowledge, it is pacing. They spend 15 minutes perfecting requirements, draw half a diagram, and
the timer ends before there is anything to deep-dive on. A repeatable phase structure with an explicit
minute budget prevents that.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You have 45 minutes. How much of the clock do requirements plus estimation together deserve?",
  "options": [
    {
      "label": "About 15 to 20 minutes, since a design built on wrong requirements is worthless",
      "feedback": "Tempting, and it is exactly how strong engineers fail this round: 15 minutes of polished requirements leaves no time to design or dive. Requirements are the setup, not the main event."
    },
    {
      "label": "About 5 to 7 minutes",
      "correct": true,
      "feedback": "Right. Phases 1 and 2 together get about 5 to 7 minutes: enough for the functional and non-functional reqs, the constraint that matters, and a QPS and storage number. The bulk of the clock goes to design and deep dives, which is what is actually scored."
    },
    {
      "label": "Almost none, jump straight to the diagram",
      "feedback": "Skipping scope entirely means designing the wrong system. You still need the requirements and the binding constraint before drawing, it just takes minutes, not a quarter of the round."
    }
  ]
}
\`\`\`

### The canonical 6-phase clock for a 45-minute round

\`\`\`
Phase                        Budget   Exit criterion
1 Clarify + scope + NFRs     ~5 min   You have functional + non-functional reqs and the constraint that matters
2 Estimation (entities/QPS)  ~2 min   You have a read/write QPS and rough storage number to size with
3 API surface                ~5 min   The 3-5 core endpoints (or events) are named with inputs/outputs
4 High-level design          ~15 min  A complete boxes-and-arrows design where every functional req is satisfied
5 Deep dive(s)               ~10 min  The tightest NFR bottleneck is addressed with a committed choice
6 Wrap-up                    ~3 min   Top remaining bottleneck, failure mode, monitoring, cost driver stated
\`\`\`

Notice that phases 1 and 2 together take only about 5 to 7 minutes. Requirements and estimation are
the setup, not the main event. The bulk of the clock, phases 4 and 5, goes to design and depth,
because that is what the interviewer is actually scoring.

### The prime directive

Reach a COMPLETE working design before you add any complexity. A simple design that satisfies every
functional requirement beats an elaborate half-design every time. Do not shard, add Kafka, or optimize
the cache until the plain version works end to end.

Two skills make the clock work in practice. First, **exit criteria**. Each phase has a concrete
condition that tells you it is done and you may move on. Without one you drift. When you have a read
QPS and a storage estimate, estimation is over, stop refining the number. Second, **narrated
transitions**. You say the phase change out loud so the interviewer follows your lead: "I have a
working design now, so let me harden the availability, which is the tightest requirement here." This
keeps you visibly in control and signals seniority.

**Interview nuance:** treat the framework as a scaffold, not a script. If the interviewer jumps you to
the data model in minute 3, follow them, then loop back to fill the gaps. Reordering on their cue is a
strength. Rigidly reciting phases while they try to steer is the tell of a memorized answer.

**Interview nuance:** if you are running long, say so and cut. "I am watching the clock, so I will
lock the high-level design and move straight to the delivery bottleneck." Interviewers reward
candidates who self-correct pacing over ones who need rescuing.

Recap: budget about 5 to 7 minutes for requirements and estimation, spend the bulk on design and deep
dives, use an exit criterion to leave each phase, and narrate every transition so you visibly lead the
round to a complete design.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Minute 25: your simple design satisfies every functional requirement, and you just spotted a clever caching optimization. What does the prime directive say to do?",
  "options": [
    {
      "label": "Add the optimization now while it is fresh",
      "feedback": "Tempting, but bolting on complexity before declaring completeness is how elaborate half-designs happen. The optimization is only worth considering once the plain version works end to end."
    },
    {
      "label": "Narrate the transition, lock the complete design, then dive where the tightest NFR points",
      "correct": true,
      "feedback": "Right. A complete working design comes first. Then you say the phase change out loud and spend the depth budget where the NFRs point, which may or may not be that cache."
    },
    {
      "label": "Go back and re-check the estimation numbers",
      "feedback": "Estimation ended the moment you had a read/write QPS and a storage number. Re-refining numbers at minute 25 is drift, exactly what exit criteria exist to prevent."
    }
  ],
  "reveal": "In the design write, budget the six phases before you start, name each exit criterion as you hit it, and narrate every transition so you visibly lead the round to a complete design plus one committed deep dive."
}
\`\`\`
`.trim()

const highLevelDataflowTeach = `
## Draw the system, then prove it works

The high-level design phase is where you draw the system and prove it works by tracing one concrete
request through it. Two failure modes bracket this phase. Some candidates draw a beautiful diagram
with 15 boxes and never show how a single request flows, so nobody knows if it actually works. Others
draw so little that the design is ambiguous. The fix for both is the same discipline: start with the
simplest set of boxes that satisfies the requirements, then evolve it by introducing each new
component with an explicit justification, and finally walk one request end to end.

### Start simple

Almost every system begins as the same skeleton:

\`\`\`
[Client] --> [Load Balancer] --> [App Servers] --> [Database]
                                       |
                                    [Cache]
\`\`\`

That is a complete, working system for a huge class of problems. Only now do you add components, and
only with a reason tied to a requirement:

- A **gateway / reverse proxy** (Envoy, NGINX) when you need auth, rate limiting, or TLS termination
  in one place.
- A **cache** (Redis) when reads dominate and repeat, to cut datastore load and tail latency.
- A **message queue** (Kafka, SQS) when work is async, spiky, or must survive a consumer being down.
- A **CDN** (CloudFront) when you serve static or geographically distributed content.
- An **object store** (S3) for large blobs (images, video, files) that do not belong in a row.
- A **search index** (Elasticsearch) when you need full-text or faceted queries the primary store
  cannot serve.

The discipline is that you say why each box exists. "I am adding Redis here because reads are 10x
writes and the same hot keys repeat, so caching cuts p99 and datastore QPS." A box without a
justification is the single most common wrong turn: adding Kafka or sharding you cannot yet defend
makes you look like you are pattern-matching, not designing.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Each situation justifies exactly one added box. Which component earns its place on the diagram?",
  "buckets": [
    "Message queue",
    "Cache",
    "Object store"
  ],
  "items": [
    {
      "label": "Work is spiky and must survive a consumer being down",
      "bucket": "Message queue",
      "feedback": "Queues (Kafka, SQS) buffer async work so a burst or a dead consumer does not lose requests."
    },
    {
      "label": "Reads are 10x writes and the same hot keys repeat",
      "bucket": "Cache",
      "feedback": "Repeated hot reads are the cache case: Redis cuts datastore QPS and 'p99'."
    },
    {
      "label": "User-uploaded videos that do not belong in a database row",
      "bucket": "Object store",
      "feedback": "Large blobs go to S3-class storage; the database keeps only the metadata and the storage key."
    },
    {
      "label": "Thumbnail generation the upload response should not wait for",
      "bucket": "Message queue",
      "feedback": "Async work the caller does not block on is queue work: accept the upload, enqueue the job, return."
    },
    {
      "label": "Cutting tail latency on a read-heavy product page",
      "bucket": "Cache",
      "feedback": "Serving repeats from memory is the standard tail-latency lever on read-heavy paths."
    }
  ]
}
\`\`\`

### Trace a concrete request

Now the part that separates a strong answer: pick one real operation and follow it through every box,
both the write path and the read or delivery path. For a chat message the write path is client to
gateway to chat service, persist to the message store, enqueue for delivery. The read path is the
recipient's connection receiving a push, or the recipient client pulling on reconnect. Tracing forces
you to notice gaps: where is the message stored before delivery, what happens if the recipient is
offline, how does the sender get an ack.

**Interview nuance:** label your arrows. An arrow should carry what flows and how: "WebSocket frame,"
"gRPC call," "async event on Kafka topic \`messages\`." Unlabeled arrows hide the exact decisions
interviewers probe. Group boxes into tiers (edge, service, data) so the diagram stays legible as it
grows.

**Interview nuance:** explicitly point at where each functional requirement is satisfied. "Requirement
1, send a message, happens on this write path; requirement 2, delivery, happens on this arrow." This
is how you prove completeness before you move to deep dives, and it is what lets you honestly say "I
have a working design now."

Recap: start with the minimal client-LB-app-DB-cache skeleton, add each component only with a
requirement-tied justification, label arrows with data and protocol, and prove the design by tracing
one concrete request through both its write and its read or delivery path.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "Your diagram has 12 labeled boxes and covers every requirement on paper. What proves the design actually works before you move to deep dives?",
  "options": [
    {
      "label": "Add one more layer of detail inside each box",
      "feedback": "Tempting because detail feels like rigor, but 15 detailed boxes with no flow shown is the classic failure: nobody knows whether a single request survives the trip."
    },
    {
      "label": "Trace one concrete request end to end through the write path and the read or delivery path",
      "correct": true,
      "feedback": "Right. Walking a real operation box by box exposes the gaps: where data waits, what happens when the recipient is offline, how the sender gets an ack. Then point at where each functional requirement is satisfied."
    },
    {
      "label": "List the specific technologies you would use for each box",
      "feedback": "Naming Kafka and Redis proves nothing by itself. A box or a brand name without a traced flow and a requirement-tied justification reads as pattern-matching."
    }
  ],
  "reveal": "In the design write, start from the client-LB-app-DB-cache skeleton, justify every added box against a requirement, label arrows with what flows and how, then walk one request end to end before you claim the design is complete."
}
\`\`\`
`.trim()

const deepDivesWrapupTeach = `
## Depth on purpose, not a data dump

Once you have a complete design, the interviewer wants to see depth. But depth chosen at random reads
as a data dump. The skill is to let the non-functional requirements and the traffic model point you at
the real bottleneck, dive there, compare two viable options, commit to one, and then close with a
short operational wrap-up. This is the phase that most separates senior from junior signal, and it is
also the phase most often skipped because candidates monologue their favorite topic until the clock
runs out.

### Step one: find the bottleneck from the NFRs

Look at what the requirements and your QPS numbers stress:

- Tight **read latency** with hot keys points to caching and a possible hot-partition problem.
- High **availability** with a single primary points to a single point of failure that needs
  replication or failover.
- **Write-heavy** load past one node's capacity points to sharding and its partition-key choice.
- **Tail latency** (p99) under fanout points to precomputation, async work, or backpressure.

You name the bottleneck out loud: "My tightest NFR is redirect availability, and my design has the
datastore as a single point of failure, so that is where I will dive."

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "New scenario: a read-heavy feed with a tight 'p99' target and a handful of celebrity keys everyone requests. Where does the dive go?",
  "options": [
    {
      "label": "Sharding, since the datastore will not scale",
      "feedback": "Tempting default, but this load is read-heavy, not write-heavy past a node's capacity. Sharding is the lever for write volume, and it does not fix a hot key that lands on one shard anyway."
    },
    {
      "label": "Caching and the hot-partition problem",
      "correct": true,
      "feedback": "Right. Tight read latency plus hot keys is exactly the caching branch: repeated reads of the same keys are what caches remove, and the celebrity keys are the hot partitions to call out."
    },
    {
      "label": "Replication and failover for the primary",
      "feedback": "That branch answers a high-availability requirement built on a single point of failure. Nothing here says availability is the tightest NFR, so diving there is depth chosen at random."
    }
  ]
}
\`\`\`

### Step two: reach for the right lever

Use the standard levers deliberately: sharding (and the partition key), replication (and sync vs
async), caching (and the invalidation rule), async and queues (to absorb spikes), and indexing (to
serve a query the primary store cannot). You are not listing all of them, you are reaching for the one
that removes this bottleneck.

### Step three: compare two options and commit

This is the heart of the dive. For a hot partition you might compare "add read replicas" vs "add a
cache with request coalescing" and recommend the cache because reads repeat and replicas add
replication lag. The recommendation, with a reason, is what earns the grade. Listing options without a
stance is the classic senior-level miss.

**Interview nuance:** quantify the tradeoff. "Fanout-on-write costs one write per follower, so a
10M-follower account is a 10M-write storm, which is why I use fanout-on-read for celebrities." A
number turns an opinion into an argument.

### Step four: the operational wrap-up

Reserve the last 2 to 3 minutes and deliver four things crisply: where it breaks first at 10x scale,
the main failure mode, what you would monitor (specific metrics and alerts), and the dominant cost
driver. Add any unaddressed security or privacy gap as a prioritized next step. This wrap-up is what
makes you sound like someone who has run systems in production, not just drawn them.

**Interview nuance:** the wrap-up is where you volunteer what you did not have time to cover. "I did
not address abuse or rate limiting; at this scale I would put that behind the gateway as the next
step." Naming your own gaps is a seniority signal, not a weakness.

Recap: let the NFRs and traffic model pick the bottleneck, dive with the right lever, compare two
options and commit with a quantified reason, then close in 2 to 3 minutes on the top remaining
bottleneck, failure mode, monitoring, and cost driver.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "1M write QPS against a single primary that handles a few thousand writes per second, and reads are light. Pick the dive and the lever.",
  "options": [
    {
      "label": "Add a cache in front of the primary",
      "feedback": "Tempting reflex, but caches absorb reads and this load is writes. Every one of the 1M writes still lands on the primary."
    },
    {
      "label": "Add read replicas",
      "feedback": "Replicas scale reads and availability, but all writes still funnel through one primary. The write ceiling is untouched."
    },
    {
      "label": "Shard the datastore, defend the partition key, compare one alternative, and commit",
      "correct": true,
      "feedback": "Right. Write-heavy load past one node's capacity is the sharding branch, roughly 200 shards at these numbers. Compare two viable options, commit with a quantified reason, and keep 2 to 3 minutes for the operational wrap-up."
    }
  ],
  "reveal": "In the design write, let the NFRs and traffic model pick the bottleneck, compare two options and commit with a number, then close on where it breaks at 10x, the main failure mode, what you would monitor, and the dominant cost driver, naming any gap you did not cover."
}
\`\`\`
`.trim()

const tradeoffArticulationTeach = `
## A fact is not a decision

The single fastest way to sound junior is to name a technology without naming what you gave up to get
it. "I'll use Cassandra" is a fact. "I'll use Cassandra because I need multi-region writes and can
tolerate read-repair latency, which costs me easy cross-partition transactions" is a decision.
Staff-level interviewers grade the second sentence, not the first.

\`\`\`cswidget
{
  "type": "check",
  "kind": "classify",
  "prompt": "Which of these interview sentences are facts, and which are decisions?",
  "buckets": [
    "Fact",
    "Decision"
  ],
  "items": [
    {
      "label": "I'll use Cassandra",
      "bucket": "Fact",
      "feedback": "Naming a technology is a fact. Nothing was weighed and nothing was given up."
    },
    {
      "label": "I'll use Cassandra for multi-region writes, accepting read-repair latency and giving up easy cross-partition transactions",
      "bucket": "Decision",
      "feedback": "A lens, a commitment, and a named cost. This is the sentence staff-level interviewers grade."
    },
    {
      "label": "We should add Redis here",
      "bucket": "Fact",
      "feedback": "Tempting to count as a decision because it sounds decisive, but there is no assumption, no trade, and no cost named. It is a brand name, not a choice."
    },
    {
      "label": "Assuming reads outnumber writes 100 to 1, I'll denormalize the counter into the post row, doubling write cost to make reads a single-key lookup",
      "bucket": "Decision",
      "feedback": "Assumption stated, option picked, cost quantified. The interviewer can push on any part of it, which is exactly what you want."
    }
  ]
}
\`\`\`

### Reach for the lens before the answer

Every real choice in a design is a tradeoff, and there is almost always a principled lens that frames
it:

- **CAP / PACELC**: under a partition, do you keep serving (AP) or refuse to serve stale data (CP)?
  PACELC adds the case with no partition: even then, do you favor latency or consistency? A payment
  ledger is CP/consistency. A social feed is AP/latency.
- **Push vs pull**: do you compute work at write time (fan-out on write, fast reads, expensive writes)
  or read time (fan-out on read, cheap writes, slow reads)? Celebrity followers break naive push.
- **Sync vs async**: does the caller block for the result, or do you accept the request, return a 202,
  and finish on a queue? Async buys throughput and resilience at the cost of end-to-end visibility.
- **SQL vs NoSQL, normalize vs denormalize, cache vs recompute**: each is a spend-here-to-save-there
  trade.

### Commit, with the assumption stated

The move that separates strong candidates is committing. Weak candidates enumerate ("we could do A, or
B, or C") and stall, waiting for the interviewer to choose. That reads as indecision. State the
assumption the decision rests on, pick, and say what you are giving up: "Assuming reads dominate
writes 100 to 1 and we can tolerate a few seconds of staleness, I'll denormalize the counter into the
post row. This doubles write cost but turns a JOIN-and-aggregate read into a single-key lookup. If
writes ever approach reads, I would revisit."

Quantify whenever a number is available, even a rough one. "This doubles storage but halves p99 read
latency" is a sentence an interviewer can push on, which is exactly what you want.

**Interview nuance:** Interviewers often probe with "why not the other option?" They are not
disagreeing; they are checking whether you understood the tradeoff or got lucky. Have the losing
option's one real advantage ready, and re-state the assumption that made you overrule it.

**Interview nuance:** Tie every decision to an assumption that can be revisited, so your design has a
documented seam for scale. "At 10x traffic this assumption breaks, and then I'd shard by user" shows
evolution-over-time thinking without you having to build the sharded version now.

\`\`\`
Choice --> pick the lens --> state the assumption --> commit --> name what you gave up
 (SQL?)    (CAP / push-pull)   (reads >> writes)      (NoSQL)    (cross-entity txns)
\`\`\`

Recap: Frame every major choice through a principled lens, commit to one option on a stated
assumption, quantify the trade, and name what you gave up.

\`\`\`cswidget
{
  "type": "check",
  "kind": "predict",
  "prompt": "You committed to Cassandra and the interviewer asks 'why not Postgres?' What is happening, and what is the strong reply?",
  "options": [
    {
      "label": "They disagree with the pick, so walk it back and switch to Postgres",
      "feedback": "Tempting read, but the probe is usually not disagreement. Reversing instantly signals you never understood why you chose, which is worse than the original pick being debatable."
    },
    {
      "label": "They are checking you understood the trade: name the losing option's one real advantage, then re-state the assumption that overruled it",
      "correct": true,
      "feedback": "Right. Postgres offers easy transactions and mature SQL; your multi-region write requirement is what overruled it. Holding the position with the trade visible is exactly what is being graded."
    },
    {
      "label": "They want an exhaustive list of every alternative database",
      "feedback": "Enumerating options without a stance is the stall that reads as indecision. One committed choice with the losing option's advantage acknowledged beats a catalog."
    }
  ],
  "reveal": "In the design write, run the chain on every major choice: pick the lens, state the assumption, commit, quantify the trade, and name what you gave up, plus the seam where 10x traffic would make you revisit."
}
\`\`\`
`.trim()

const levelCalibrationTeach = `
## The same prompt, graded three different ways

The same prompt, "Design a rate limiter," is a pass or a fail depending on the level you are
interviewing for, and the difference is not "more" but "aimed differently." A staff-depth answer to a
junior loop can fail if it never finishes, and a junior-depth answer to a staff loop fails for lack of
proactive depth. Calibration is knowing which one you are in and steering to that rubric.

Most companies grade a system-design round on roughly four axes:

- **Problem navigation**: scoping, requirements, handling ambiguity.
- **Technical excellence**: correct components, sound data model, working design.
- **Communication**: narration, structure, responsiveness.
- **Proactive depth**: finding bottlenecks and going deep without being asked.

### What "complete" means per level

- **Junior**: a correct high-level design. Core components (LB, app tier, database, cache), a basic
  path from request to response, and awareness that scale exists. Completeness beats depth. Finishing
  a clean, correct end-to-end design is a strong junior answer. You are not expected to derive novel
  tradeoffs; you are expected to not have holes.
- **Senior**: everything junior, plus you find the bottlenecks yourself and quantify the tradeoffs.
  You do one or two real deep dives (the hot partition, the cache invalidation strategy, the fan-out)
  unprompted. You drive the round without the interviewer pulling you along. Estimation is not
  decoration; it justifies a design decision.
- **Staff+**: everything senior, plus you own the ambiguity. You frame an under-specified prompt into
  a crisp problem, and your tradeoffs extend past the technical into org, cost, and reliability ("this
  doubles our on-call surface," "this triples storage spend at our scale"). You reason about how the
  system evolves over two years, and you make the call on what not to build.

For "Design a rate limiter," concretely: a junior nails token-bucket in a single service plus Redis
for shared state. A senior adds the distributed-counter race, the sliding-window-vs-token-bucket
tradeoff, and what happens when Redis is down (fail-open vs fail-closed). A staff candidate
additionally frames whose traffic and which tier, argues the cost of per-user vs per-IP granularity,
and picks a degradation policy tied to a business risk.

**Interview nuance:** Match estimation depth and deep-dive count to the level. A junior doing three
deep dives runs out of time on the basics. A senior who does zero looks shallow. Budget roughly one
deep dive for senior, two for staff, in a 45-minute round.

**Interview nuance:** If you do not know the level, ask, or infer it from the recruiter's title and
the interviewer's follow-ups. When in doubt, deliver a complete junior-plus backbone first, then go
deep, so you always have a finished answer before you gamble time on depth.

Recap: Aim depth and breadth at the target rubric; junior wants a complete correct design, senior
wants unaided bottleneck-finding and quantified tradeoffs, staff wants ambiguity-framing plus
org/cost/reliability and evolution thinking.
`.trim()

const templatePitfallsTeach = `
## A backbone you can reproduce in 60 seconds

Under interview pressure, working memory shrinks. The fix is a one-page template you have internalized
so well you can reproduce it in the first 60 seconds of any round, without it sounding like a recited
script. The template is a backbone you hang the specific prompt on, not a monologue you deliver.

<details>
<summary>The phase backbone (45-minute budget)</summary>

\`\`\`
1. Scope & requirements      ~5 min   functional + non-functional, clarify
2. Estimation (back-of-env)  ~2 min   QPS, storage, bandwidth
3. API + data model          ~5 min   the contract and the schema
4. High-level design         ~15 min  box-and-arrow, request path
5. Deep dive(s)              ~10 min  the 1-2 hard parts
6. Bottlenecks & wrap-up     ~3 min   scale, failure, tradeoffs, what next
\`\`\`

</details>

<details>
<summary>Stock clarifying and NFR prompts</summary>

Open with: who are the users and how many, read-heavy or write-heavy, what is the consistency
requirement, what latency is acceptable, what is the scale (DAU, QPS), and what is explicitly out of
scope. Asking these is problem navigation points on the rubric.

</details>

<details>
<summary>The estimation checklist</summary>

So you never freeze on numbers: DAU to QPS (DAU x actions/day / 86,400, then x2 or x3 for peak),
storage (records/day x bytes/record x retention), bandwidth (QPS x payload size), cache size (hot
set, often the 20% that serves 80%), and server count (QPS / per-box throughput).

</details>

<details>
<summary>The component palette</summary>

Pull from these without inventing: load balancer, API gateway, app/service tier, cache (Redis),
message queue (Kafka), CDN, object store (S3), search index (Elasticsearch), and database with
replicas and shards. When you need a box, it is almost always one of these.

</details>

<details>
<summary>Trade-off lenses</summary>

Reach for: CAP/PACELC, push vs pull, sync vs async, SQL vs NoSQL, normalize vs denormalize.

</details>

<details>
<summary>The top pitfalls, each with its counter</summary>

- **Solutioning before scoping**: naming Kafka before you know the requirements. Counter: spend the
  first 5 minutes on requirements, always.
- **Unbounded feature list**: trying to design everything. Counter: pick the core 2 to 3 features and
  defer the rest out loud.
- **Generic NFRs**: "it should be scalable and fast." Counter: attach numbers (100K QPS, p99 under
  200ms).
- **Designing in silence**: thinking without narrating. Counter: talk continuously.
- **No wrap-up**: running out of time with no summary. Counter: reserve the last 2 to 3 minutes to name
  bottlenecks and next steps.

</details>

**Interview nuance:** The template must bend to the prompt. If the interviewer says "assume you know
the requirements, go straight to the storage design," skip phases 1 and 2 and say so. Rigidly marching
through a memorized order when the prompt does not want it is itself a red flag.

Recap: Carry a phase-and-time backbone, stock clarifying/NFR prompts, an estimation checklist, a
component palette, and trade-off lenses, and actively counter the five classic pitfalls, adapting the
template to the actual prompt.
`.trim()

const communicationWhiteboardingTeach = `
## The interviewer's attention is the scarce resource

In a system-design round the interviewer is not a passive grader watching from behind glass. They are
one person, usually with about 45 minutes, who is simultaneously your collaborator and your scoring
signal. Their attention is the scarce resource you manage. Everything below is about keeping them
inside your head and using their input as a steering wheel rather than a distraction.

### Narrate continuously

Silent thinking is invisible, and invisible thinking reads as being stuck. The habit to build is
saying the assumption, the option set, and the pick, out loud, in that order: "I am assuming reads
dominate, so I have two options for the timeline, fan-out on write or on read, and I am going to start
with fan-out on write because reads are the hot path; I will revisit for celebrity accounts." Now the
interviewer can follow, agree, or redirect. A pause to think is fine if you announce it: "let me think
for a few seconds about the write path" is night-and-day better than ten silent seconds.

### Organize the board into fixed zones

A layout that always works:

\`\`\`
+-----------------------------+------------------+
| Requirements & numbers      |  Parking lot     |
| - 10M DAU, 4K QPS peak      |  - analytics     |
| - p99 < 100ms, read-heavy   |  - custom alias  |
+-----------------------------+------------------+
|                                                |
|      [Client]->[LB]->[API]->[Cache]->[DB]      |
|                          box-and-arrow         |
|                                                |
+------------------------------------------------+
\`\`\`

Requirements and estimates pinned top-left so you and the interviewer share a reference. The
box-and-arrow diagram in the center where it can grow. A parking lot on the side for topics you
deliberately defer, which both shows discipline and reassures the interviewer you did not forget them.

### Treat every interviewer comment as a hint with intent

When they ask "what happens if two writes hit the same counter?" they are almost never curious in the
abstract; they are steering you toward a deep dive they want to see. Follow it, and confirm the intent
out loud: "sounds like you want me to focus on the concurrency there, let me do that." The skill is
telling a hint (follow now) from a rabbit hole (defer to the parking lot). A hint from the
interviewer: follow it. A tangent you generated yourself that is not on the critical path: park it and
move on.

### Lead without steamrolling

Leading is proposing a path and checking in: "I will cover the data model, then scaling, does that
order work for you?" Steamrolling is marching through a rehearsed outline and ignoring interjections.
The first reads as senior and collaborative; the second reads as not listening, which tanks the
communication axis even when the design is correct.

**Interview nuance:** Remote and shared-whiteboard rounds (Excalidraw, a Google Doc, CoderPad's
diagram tool) change the physics. You lose body-language signal and drawing is slower, so pre-learn
the tool's shortcuts before the interview, keep shapes to plain boxes and labeled arrows, and talk a
little more to compensate for the interviewer's reduced ability to read your face. Do not burn two
minutes making a box pretty.

**Interview nuance:** The two most common self-inflicted wounds are going silent to think and ignoring
a hint because it was not in your planned outline. Both read as not listening. Announce every pause,
and treat every hint as a course correction you welcome.

Recap: Narrate assumption-option-choice continuously, lay the board out in fixed zones with a parking
lot, follow interviewer hints as intentional steering while parking your own tangents, and lead by
proposing and checking rather than steamrolling.
`.trim()

export const systemDesignLevel0: DesignLevel = {
  id: 0,
  slug: "interview-method",
  title: "Level 0: Interview & Communication Method",
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
              "Write the 3 to 5 clarifying questions you would ask for the bare prompt 'Design Twitter', and for each one show how a likely answer narrows the design.",
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
              "**QPS.** Uploads/day = 500M x 2 = 10^9; views/day = 2.5 x 10^10. Dividing by ~10^5 s/day: avg upload QPS ~10,000 and avg view QPS ~250,000; with a 3x peak, ~30k peak upload QPS and ~750k peak view QPS. The 25:1 read:write skew screams CDN plus object store, not database-served images.",
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
              "Estimate send QPS vs delivery QPS for WhatsApp-scale group messaging assuming 2B users, 40 messages sent per user per day, and an average group size of 8. Decide whether the delivery path or the send path is the scaling bottleneck and justify the fan-out strategy.",
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
        {
          id: "sd-l0-storage-bandwidth-cache",
          title: "Storage, Bandwidth & Cache Sizing",
          summary:
            "Size storage with replication and overhead multipliers, compute ingress and egress separately, and size the cache from the hot working set.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["estimation", "storage", "cache"],
          teach: {
            markdown: storageBandwidthCacheTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l0-storage-bandwidth-cache-apply",
            prompt:
              "Size 5-year storage and the hot-cache tier for a media service, applying the 80/20 rule to decide what lives in cache vs cold storage.",
            thinkAbout: [
              "How do you separate metadata size from blob size in the storage estimate?",
              "What working-set fraction belongs in the hot cache tier?",
              "How does replication factor multiply your storage number?",
            ],
            modelAnswerOutline: [
              "Assumptions: 10M new media objects/day, average blob 2 MB, metadata ~1 KB/object, 5-year retention (~1,825 days), replication factor 3 for blobs, and RF 3 plus ~30% index overhead for metadata.",
              "**Blob storage.** 10^7 objects/day x 2 MB = 20 TB/day of raw blobs. Over 5 years: ~36.5 PB raw; with RF=3 about 110 PB provisioned. Tier it: recent data on RF=3, archival on erasure coding (~1.4x instead of 3x) to cut the older tail's cost. Blobs live in an object store (S3-class), never in the database.",
              "**Metadata storage.** 10^7 objects/day x 1 KB = 10 GB/day. Over 5 years: ~18 TB raw; with RF=3 and ~30% index overhead about 70 TB, in a sharded database (DynamoDB or sharded Postgres/Cassandra) sharded by object id. Note the 1000x gap between blobs (110 PB) and metadata (70 TB): keeping them separate is what keeps the database tractable.",
              "**Cache tier.** Cache the hot working set, not 36 PB. The hot set is dominated by recency and virality: the last few days of uploads plus trending older items. Put a modest hot tier (a few hundred GB to a few TB of the hottest objects plus all hot metadata) in Redis, and rely primarily on a CDN for blob egress. The CDN edge cache, sized to the hot ~20% by request volume, is what actually absorbs read traffic; the origin cache handles metadata and cache-miss coalescing.",
              "**What lives where:** hot metadata and hottest blobs in cache; recent blobs on RF=3 object store behind a CDN; archival blobs on erasure-coded cold storage; all metadata in the sharded DB.",
              "Common wrong turn: forgetting the RF=3 multiplier (understating storage 3x), lumping blobs into the database, or sizing the cache as a fixed fraction of 36 PB rather than from the hot request distribution.",
            ],
          },
          practice: {
            id: "sd-l0-storage-bandwidth-cache-practice",
            prompt:
              "Size storage, egress bandwidth, and the cache/CDN tier for Netflix-scale video streaming: assume 250M subscribers, each streaming 2 hours/day at an average 5 Mbps bitrate, and a catalog of 100k titles at an average 15 GB per title (summed across encodings). Decide where the real capacity problem is.",
            thinkAbout: [
              "Is the catalog's total storage actually large by modern standards, or is it a fixed and modest number?",
              "Why is bandwidth about peak concurrency rather than daily totals, and what does the peak egress number force?",
              "How skewed is title popularity, and what does that mean an edge cache needs to hold?",
            ],
            modelAnswerOutline: [
              "Assumptions: 250M subscribers, 2 hours/day each, 5 Mbps average delivered bitrate, catalog 100k titles x 15 GB/title across encodings, and a ~1.2x peak multiplier on concurrent viewing, below the usual 2x to 3x band because the subscriber base spans time zones and flattens the global concurrency curve.",
              "**Catalog storage.** 100k x 15 GB = 1.5 PB raw; with RF=3 plus geo-distribution a few PB. A fixed, modest number: the catalog is small and mostly static. Storage is not the hard problem.",
              "**Egress bandwidth is the real problem.** Bandwidth is about concurrency, not daily totals: 250M x 2 h / 24 h = ~21M average concurrent streams, about 8% of subscribers. Applying the 1.2x peak multiplier gives ~25M concurrent streams at peak, roughly 10% of subscribers, x 5 Mbps = 125 Tbps of peak egress. That number is the entire design constraint. You cannot serve 125 Tbps from central origins; it must come from a CDN deployed deep into ISP networks (Netflix's Open Connect model), caching popular titles inside or adjacent to ISPs.",
              "**Cache/CDN tier.** Apply the 80/20 rule hard: a small fraction of titles (new releases, trending shows) drives the overwhelming majority of streams. Each edge appliance caches the hot terabytes (a few thousand popular titles) and serves them locally; misses fall back to regional caches then origin. Because the catalog is only ~1.5 PB, a full copy fits in a regional cache. Fill happens off-peak overnight.",
              "**Verdict:** not storage (1.5 PB is small), not control-plane QPS (playback starts are modest), but sustained peak egress at 125 Tbps, which forces a purpose-built edge CDN rather than a centralized serving tier.",
              "Common wrong turn: sizing central data-center bandwidth for 125 Tbps, or fixating on catalog storage when the binding constraint is peak concurrent egress served from the edge.",
            ],
          },
        },
        {
          id: "sd-l0-latency-numbers",
          title: "Latency Numbers Every Engineer Should Know",
          summary:
            "Memorize the latency ladder, unit conversions, object sizes, and single-machine ceilings, and turn each constant into a design decision.",
          estimatedMinutes: 20,
          difficulty: "easy",
          skills: ["estimation", "latency"],
          teach: {
            markdown: latencyNumbersTeach,
            estimatedMinutes: 8,
          },
          apply: {
            id: "sd-l0-latency-numbers-apply",
            prompt:
              "Order these by latency from memory and give rough magnitudes: L1/RAM read, SSD read, same-datacenter round trip, cross-region round trip, disk seek.",
            thinkAbout: [
              "What is the rough order of magnitude at each rung of the latency ladder?",
              "How do you convert one day and one month into seconds for QPS math?",
              "What single-machine ceilings (QPS, connections) do you assume?",
            ],
            modelAnswerOutline: [
              "Ordered fastest to slowest: RAM read ~100 ns (L1 cache even faster at ~1 ns); SSD random read ~100 us, roughly 1,000x slower than RAM; same-datacenter round trip ~0.5 ms, in the same ballpark as an SSD read; disk (HDD) seek ~10 ms, about 100x slower than SSD; cross-region round trip ~50 to 150 ms, roughly 100x to 300x a same-DC round trip.",
              "The full order: RAM (100 ns) < SSD (100 us) < same-DC RTT (0.5 ms) < HDD seek (10 ms) < cross-region RTT (50 to 150 ms). The big cliffs are RAM-to-SSD (1,000x) and same-DC-to-cross-region (100x+).",
              "**Design consequences:** memory is ~1,000x faster than SSD, so hot data belongs in an in-memory cache. A disk seek is ~10 ms, so avoid random access on spinning disk and prefer sequential I/O or SSDs. Cross-region is ~100 ms, so never make synchronous cross-region calls on the request path; serve from a regional replica and replicate asynchronously, accepting eventual consistency.",
              "**Time and unit conversions:** 1 day ~= 86,400 s ~= 10^5 s; 1 month ~= 2.5M s; 1 year ~= 3 x 10^7 s. Data units: 1 KB ~= 10^3, 1 MB ~= 10^6, 1 GB ~= 10^9, 1 TB ~= 10^12 bytes.",
              "**Single-machine ceilings:** a tuned stateless app server ~10k to 50k QPS; a Redis node ~100k+ ops/sec; a single relational primary a few thousand writes/sec and tens of thousands of reads/sec; one tuned server ~100k+ live WebSocket connections. These turn any QPS number into a server or shard count in one step.",
              "Common wrong turn: quoting a same-DC round trip as tens of milliseconds or a memory read as microseconds, which throws every downstream latency budget off by orders of magnitude.",
            ],
          },
          practice: {
            id: "sd-l0-latency-numbers-practice",
            prompt:
              "Explain how you would use the latency ladder to justify a design decision in a global e-commerce checkout with users in the US, EU, and Asia, where inventory is the source of truth in a single US region. Give a concrete latency budget and the tradeoff you accept.",
            thinkAbout: [
              "How many cross-region round trips can a sub-second checkout afford, and what does each one cost from Asia?",
              "Which reads can move to regional replicas and caches, and which single write must stay authoritative?",
              "What consistency tradeoff do you accept on inventory, and what compensating action covers the edge case?",
            ],
            modelAnswerOutline: [
              "The binding constant is the cross-region round trip: US to EU is ~80 to 100 ms and US to Asia ~150 to 200 ms. A checkout making 4 sequential cross-region calls from Asia at ~150 ms each stacks ~600 ms of pure network latency before any processing, blowing a sub-200 ms p99 budget.",
              "**Latency budget for a 200 ms checkout:** DNS/TLS amortized by connection reuse, edge/CDN termination ~10 ms, regional app processing ~20 ms, in-region cache reads (~100 us each) negligible, and at most ONE cross-region call to the authoritative inventory. Spend the budget on making it exactly one, issued asynchronously or optimistically where possible.",
              "**The ladder justifies:** serve product browsing and cart from regional read replicas and in-region caches (memory reads at ~100 ns and same-DC round trips at ~0.5 ms are effectively free against the budget). Keep the single US region as the source of truth for the final inventory decrement, done as an optimistic reservation: the regional service tentatively reserves stock and confirms with one asynchronous cross-region write, reconciling on conflict.",
              "**Tradeoff accepted:** eventual consistency on inventory. Two shoppers in different regions might both reserve the last unit within the replication window, so accept a small oversell risk resolved by a compensating action (cancel and refund, or backorder) rather than paying a ~150 ms synchronous cross-region lock on every checkout.",
              "For extremely scarce, high-value inventory, invert the trade: route those SKUs' checkout to the US region and accept the higher latency for correctness.",
              "Common wrong turn: making checkout synchronously consistent across regions (correct but 600 ms+ from Asia), or ignoring the cross-region constant entirely and being surprised by tail latency.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l0-m3",
      title: "The Structured Walkthrough",
      description:
        "Run the round on a fixed clock: a repeatable 6-phase plan, a boxes-and-arrows design proven by tracing one real request, then an NFR-driven deep dive and an operational wrap-up.",
      lessons: [
        {
          id: "sd-l0-phased-delivery-clock",
          title: "Phased Delivery & the Interview Clock",
          summary:
            "Budget the 45 minutes across six phases with exit criteria, reach a complete simple design before adding complexity, and narrate every transition.",
          estimatedMinutes: 25,
          difficulty: "easy",
          skills: ["framework", "time-management"],
          teach: {
            markdown: phasedDeliveryClockTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l0-phased-delivery-clock-apply",
            prompt:
              "Produce a labeled 6-phase walkthrough plan for a 45-minute 'Design a URL shortener' round, with a minute budget per phase and the exit criterion for each.",
            thinkAbout: [
              "How much time goes to requirements+estimation vs design+deep dives?",
              "What is the exit criterion that lets you move to the next phase?",
              "How do you narrate transitions so the interviewer follows your lead?",
            ],
            modelAnswerOutline: [
              "Assumption: 45-minute round, a URL shortener like Bitly, one interviewer scoring completeness and depth.",
              "**Phase 1, Clarify and NFRs (~5 min).** Confirm the two features: create a short link, redirect to the long URL. Confirm scale (say 100M new URLs/month, 10:1 read:write on redirects) and the tightest NFR: redirect latency and high read availability, since a slow or down redirect breaks every embedded link. Exit: functional reqs stated and latency plus availability named as the constraint that matters.",
              "**Phase 2, Estimation (~2 min).** 100M writes/month is ~40 writes/sec; at 10:1 about 400 reads/sec, peaks maybe 5x. Storage: 100M/month x 12 x 5 years x ~500 bytes is roughly 3 TB over 5 years. Exit: a QPS and a storage number to size the datastore and cache.",
              "**Phase 3, API (~5 min).** `POST /urls {longUrl} -> {shortCode}` and `GET /{shortCode} -> 301/302 redirect`. Exit: the two core endpoints named with inputs and outputs.",
              "**Phase 4, High-level design (~15 min).** Client, load balancer, stateless app servers, a key-generation strategy (base62 of a counter or a hash), a primary datastore keyed by shortCode (DynamoDB or a KV store), and a Redis cache in front of reads. Trace a create and a redirect end to end. Exit: a complete diagram where both features work.",
              "**Phase 5, Deep dive (~10 min).** Attack the tightest NFR: redirect read latency and availability. Cache hot codes in Redis, use 301 vs 302 deliberately, discuss key-generation collisions. Exit: the read-path bottleneck has a committed solution.",
              "**Phase 6, Wrap-up (~3 min).** Top remaining bottleneck (cache stampede on a viral link), main failure mode (datastore hot partition), monitoring (redirect p99, cache hit rate), cost driver (read QPS and storage). Exit: all four stated.",
              "Common wrong turn: spending 12 minutes debating base62 vs hashing in phase 3 and never finishing the diagram. Lock a good-enough key scheme and move on.",
            ],
          },
          practice: {
            id: "sd-l0-phased-delivery-clock-practice",
            prompt:
              "Produce a labeled phase plan for a compressed 35-minute 'Design Twitter/X home timeline' round where the interviewer has told you up front they care most about read fanout at 500M daily active users. Show how you re-budget the shortened clock and where you cut.",
            thinkAbout: [
              "When the interviewer pre-declares the scoring focus, which phases shrink and which grow?",
              "What is the minimum breadth you still need before the deep dive is credible?",
              "How do you quantify why fanout is the thing that matters at 500M DAU?",
            ],
            modelAnswerOutline: [
              "Assumption: 35 minutes, and the interviewer pre-declared the scoring focus is read fanout at 500M DAU. That changes the budget: less breadth, more time reserved for the fanout deep dive.",
              "**Clarify and NFRs (~4 min).** Scope: post a tweet, view home timeline. The NFR that matters is given: timeline read latency at massive fanout, with eventual consistency acceptable (a tweet appearing a few seconds late is fine). Exit: focus confirmed as read-path fanout.",
              "**Estimation (~2 min).** 500M DAU reading timelines a few times a day is on the order of 100k+ timeline reads/sec at peak, far more reads than writes. This number is the whole reason fanout matters. Exit: the read QPS that justifies precomputation.",
              "**API (~3 min).** `POST /tweets` and `GET /timeline?userId`. Keep it to two.",
              "**High-level design (~9 min).** Clients, gateway, write service, fanout service, a per-user timeline cache (Redis), and a tweet store. Trace a post and a timeline read. Exit: a complete design where a tweet reaches followers' cached timelines.",
              "**Deep dive, fanout (~14 min).** Where the extra time goes: compare fanout-on-write (precompute each follower's timeline) vs fanout-on-read (assemble at query time). Commit to a hybrid: fanout-on-write for normal users, fanout-on-read for celebrity accounts with millions of followers to avoid write amplification. Quantify the celebrity write storm.",
              "**Wrap-up (~3 min).** Remaining bottleneck (hot celebrity accounts), failure mode (fanout queue backlog), monitoring (timeline read p99, fanout lag), cost driver (Redis timeline storage across 500M users).",
              "The cut: compress API and component breadth so the fanout dive, the thing being scored, gets nearly half the round. Matching depth to the stated focus is the point.",
            ],
          },
        },
        {
          id: "sd-l0-high-level-dataflow",
          title: "High-Level Architecture & Data-Flow",
          summary:
            "Start from the minimal skeleton, justify every added box against a requirement, label arrows, and prove the design by tracing one request end to end.",
          estimatedMinutes: 30,
          difficulty: "medium",
          skills: ["architecture", "diagramming"],
          teach: {
            markdown: highLevelDataflowTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l0-high-level-dataflow-apply",
            prompt:
              "Draw the boxes-and-arrows for a chat app and narrate a single message's full path from sender client to recipient device, including the write and the delivery.",
            thinkAbout: [
              "What is the simplest set of components that satisfies the requirements?",
              "Can you trace both the write path and the read/delivery path concretely?",
              "Where is each functional requirement satisfied in the picture?",
            ],
            modelAnswerOutline: [
              "Assumptions: 1:1 chat, messages must persist and be delivered even if the recipient is briefly offline, ordering per conversation matters, near-real-time delivery.",
              "**The diagram:** Sender --WSS--> Gateway/LB --> Chat Service --> Message Store (Cassandra); Chat Service --> Delivery Queue (Kafka) --> Presence/Connection Manager --WSS--> Recipient.",
              "**Why each box:** clients hold a persistent WebSocket to a connection manager so the server can push; a gateway terminates TLS and authenticates; the chat service owns write logic; Cassandra as the message store because writes are heavy, sharded by conversation ID with a clustering key on timestamp for per-conversation ordering; a presence/connection manager tracks which server holds each user's live socket; a delivery queue (Kafka) decouples persistence from delivery so a slow or offline recipient never blocks the write.",
              "**Write path traced:** sender sends a WebSocket frame to the gateway; the chat service assigns a message ID and sequence number, persists to Cassandra partitioned by conversation ID (satisfies 'send and store'), publishes a delivery event to Kafka, and returns an ack so the sender's UI shows 'sent.'",
              "**Delivery path traced:** a delivery worker consumes the event and asks presence which server holds the recipient's socket. If online, it forwards the message over that WebSocket (satisfies 'deliver in real time') and marks delivered. If offline, the message stays in Cassandra; on reconnect the client pulls all messages with sequence greater than its last-seen (satisfies 'deliver after being offline').",
              "**Key tradeoff:** persisting before delivering (write then async fanout) costs a little latency but guarantees no message is lost if delivery fails, the right call for chat.",
              "Common wrong turn: adding sharding, read replicas, and a search cluster before proving the basic send-store-deliver loop works.",
            ],
          },
          practice: {
            id: "sd-l0-high-level-dataflow-practice",
            prompt:
              "Draw the boxes-and-arrows for Uber-style ride matching and trace one request from a rider tapping 'request ride' to a nearby driver's phone ringing, at 1M concurrent riders. Handle both the write (request) and the delivery (dispatch to driver) paths and show where geospatial matching lives.",
            thinkAbout: [
              "Where do continuous driver location updates land, and why can that not be the primary database?",
              "What happens between 'trip row created' and 'driver phone rings', box by box?",
              "How does the design handle a driver declining or timing out on the offer?",
            ],
            modelAnswerOutline: [
              "Assumptions: riders and drivers both stream location; a request must match to a nearby available driver within a couple of seconds; at 1M concurrent riders, location updates and matching dominate.",
              "**The diagram:** Rider App --> Gateway --> Trip Service --> Trip Store (Postgres/Dynamo); Trip Service --> Matching Service <--> Geo Index (Redis geohash / QuadTree); Matching Service --> Dispatch Queue --> Driver Connection Manager --push--> Driver App.",
              "**Why these boxes:** driver apps continuously push location into an ingest path updating a geospatial index (Redis with geohash buckets, or an in-memory QuadTree sharded by region); the matching service queries that index for nearby available drivers; a trip store records trip state; a dispatch queue decouples matching from notifying drivers.",
              "**Write path traced:** rider taps request, gateway authenticates, trip service creates a trip row in state REQUESTED (the durable write), then calls matching. Matching queries the geo index for the N nearest available drivers in the rider's geohash cell and neighbors, ranks by ETA, picks a candidate.",
              "**Dispatch path traced:** the match is published to the dispatch queue; the driver connection manager finds the chosen driver's live connection and pushes an offer, ringing their phone. On decline or a ~15s timeout, matching falls back to the next candidate. On accept, the trip transitions to MATCHED and both apps are notified.",
              "**Scale note at 1M concurrent:** the geo index is the hot component; shard it by city or geohash region and keep it in memory for sub-100ms lookups.",
              "Common wrong turn: putting matching directly on Postgres with a `SELECT ... ORDER BY distance`, which cannot serve the query rate; geospatial matching needs a purpose-built in-memory index.",
            ],
          },
        },
        {
          id: "sd-l0-deep-dives-wrapup",
          title: "Deep Dives & the Operational Wrap-Up",
          summary:
            "Let the tightest NFR pick the bottleneck, compare two options and commit with a quantified reason, then close on break point, failure mode, monitoring, and cost.",
          estimatedMinutes: 35,
          difficulty: "hard",
          skills: ["deep-dive", "operations", "cost"],
          teach: {
            markdown: deepDivesWrapupTeach,
            estimatedMinutes: 12,
          },
          apply: {
            id: "sd-l0-deep-dives-wrapup-apply",
            prompt:
              "Pick the tightest non-functional requirement from a completed design and do a deep dive that removes the bottleneck it exposes, then deliver a 2-minute wrap-up naming the top remaining bottleneck, failure mode, what you would monitor, and the biggest cost driver.",
            thinkAbout: [
              "Which NFR points to the real bottleneck (hot partition, SPOF, tail latency)?",
              "What two viable approaches can you compare with an explicit recommendation?",
              "What breaks first at 10x scale, and what is the dominant cost driver?",
            ],
            modelAnswerOutline: [
              "Using the URL shortener as the completed design: its tightest NFR is redirect read latency and availability. Every embedded short link breaks if redirects are slow or down, reads are ~10x writes, and a small hot set of viral links concentrates traffic.",
              "**The bottleneck named:** at read peak the datastore serves the redirect lookup on every hit, and a viral link concentrates traffic on one partition, so there is both datastore load and a hot-partition risk.",
              "**Two options compared.** Option A: add read replicas so reads spread across nodes. Option B: put Redis in front, cache shortCode to longUrl with a long TTL, and add request coalescing so a cache miss on a hot key triggers exactly one datastore read while other requests wait.",
              "**Commit with a reason:** Option B. Redirect reads are highly repetitive and the hot working set is small, so a cache gives a >95% hit rate and sub-millisecond p99, whereas replicas still pay full datastore latency and add replication lag. Keep the datastore for the long tail and misses. For a link going viral, request coalescing plus a short jittered lock prevents a thundering herd on first miss.",
              "**Wrap-up, 10x break point:** a single viral link overwhelming one Redis shard; shard the cache by shortCode hash so hot keys spread, and consider an in-process cache on app servers for the very hottest.",
              "**Wrap-up, failure mode:** Redis node loss causing a cache-miss flood onto the datastore hot partition; mitigate with a replica and coalescing so the miss storm is bounded.",
              "**Wrap-up, monitoring and cost:** redirect p99, cache hit rate, datastore read QPS per partition, 5xx rate on `GET /{code}`, alert if hit rate drops below 90%. Cost drivers: read QPS (cache and compute) and long-term storage (~3 TB over 5 years, growing).",
              "Common wrong turn: diving into fancy key generation or analytics while the read path, the actual NFR at risk, goes unaddressed and the wrap-up gets skipped.",
            ],
          },
          practice: {
            id: "sd-l0-deep-dives-wrapup-practice",
            prompt:
              "Pick the tightest NFR for a completed Instagram-style photo feed design serving 500M users, run a deep dive that removes the bottleneck, and deliver a wrap-up. The hard constraint: feed load p99 must stay under 200ms even for users following 5,000 accounts, and photos are stored as large blobs.",
            thinkAbout: [
              "Why can assembling the feed at read time not hit 200ms for a 5,000-follow user?",
              "Where does the fanout-on-write approach itself break, and which accounts break it?",
              "How do you keep multi-megabyte photo blobs off the latency-critical feed path entirely?",
            ],
            modelAnswerOutline: [
              "**Tightest NFR:** feed read p99 under 200ms at 500M users with heavy read fanout (a user following 5,000 accounts). Assembling a feed by querying every followed account at read time cannot hit 200ms, so feed assembly is the bottleneck.",
              "**Option A, fanout-on-read:** query recent posts from all followed accounts at request time and merge. Simple and storage-cheap, but a 5,000-follow user triggers thousands of lookups per feed load, blowing the 200ms budget.",
              "**Option B, fanout-on-write:** on post, push the post ID into each follower's precomputed feed list in Redis, so a feed read is a single fast range read of an already-sorted list.",
              "**Commit to a hybrid:** fanout-on-write for normal accounts so reads are cheap; fanout-on-read for celebrity accounts with millions of followers, because writing one post into 50M feeds is a write storm and wasteful for users who may never open the app. At read time, merge the precomputed feed with a live pull of the handful of celebrities the user follows.",
              "**Blobs off the hot path:** photos live in S3 and are served via CloudFront CDN; the feed carries only IDs and CDN URLs, never blob bytes, so blob size never touches the 200ms path.",
              "**Wrap-up:** 10x break point is the fanout write pipeline backing up when many mid-size accounts post simultaneously (absorb with a Kafka fanout queue and autoscaled workers). Failure mode: Redis feed-store loss, rebuilt lazily from the post store on miss, accepting a slower first load. Monitoring: feed p99, fanout lag (post time to feed-visible time), CDN hit rate, Redis memory per shard. Cost driver: Redis memory for 500M precomputed feeds and CDN egress, which is exactly why celebrities are excluded from write fanout.",
              "Common wrong turn: serving photo bytes through the app tier, which couples blob bandwidth to the latency-critical feed path instead of offloading to S3 and a CDN.",
            ],
          },
        },
      ],
    },
    {
      id: "sd-l0-m4",
      title: "Driving the Conversation & Tradeoffs",
      description:
        "Frame every major choice as an explicit committed tradeoff, calibrate depth to the level you are interviewing for, run the round from a reusable template, and narrate so the interviewer stays inside your head.",
      lessons: [
        {
          id: "sd-l0-tradeoff-articulation",
          title: "Trade-off Articulation & Decision Framing",
          summary:
            "Frame choices through a principled lens (CAP/PACELC, push/pull, sync/async), commit on a stated assumption, quantify, and name what you gave up.",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["tradeoffs", "decision-framing"],
          teach: {
            markdown: tradeoffArticulationTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l0-tradeoff-articulation-apply",
            prompt:
              "Choose a datastore for a social feed system: compare SQL versus NoSQL against your specific consistency, scale, and query requirements, and commit to one with justification.",
            thinkAbout: [
              "Which principled lens (CAP/PACELC, push/pull, sync/async) frames this choice?",
              "What assumptions does the decision depend on, so it can be revisited at scale?",
              "What are you giving up, not just gaining?",
            ],
            modelAnswerOutline: [
              "Assumptions: feed storage for a Twitter-scale product, reads dominate writes ~100:1, a post is immutable once created, users tolerate a feed a few seconds stale. Target scale: tens of millions of DAU, hundreds of thousands of feed reads/sec at peak.",
              "**The lens: PACELC plus push versus pull.** The feed is an availability-and-latency problem, not a consistency problem: showing a post 3 seconds late is fine, a 500ms feed load is not. That pushes toward the AP/latency corner, where wide-column and key-value stores live.",
              "**Decision:** store posts and the per-user materialized timeline in a NoSQL wide-column store (Cassandra or DynamoDB), keyed by user id with the timeline as a partition sorted by time. Reads become a single-partition range scan, exactly what these stores are built for: single-digit-millisecond reads at scale with tunable consistency (quorum settings favoring availability).",
              "**What is given up by not choosing SQL:** easy multi-row ACID transactions and ad hoc JOINs. A social feed does not need them; the relational strengths are exactly the things a feed does not exercise, so paying their scaling cost (a single primary write node, harder horizontal sharding) buys nothing here.",
              "**Where SQL would win, and the revisit seam:** the user graph and account/billing data are relational and need consistency, so they belong in Postgres. If this were an analytics feed needing arbitrary slice-and-dice, or if writes ever approached reads, revisit: the denormalized fan-out-on-write timeline is a write-amplification bet that only pays off while reads dominate.",
              "Common wrong turn: listing 'SQL is consistent, NoSQL is scalable' and refusing to pick, or picking NoSQL for scale while ignoring that the social graph itself still wants a relational or graph store.",
            ],
          },
          practice: {
            id: "sd-l0-tradeoff-articulation-practice",
            prompt:
              "Choose the primary datastore for Uber's real-time driver-location and trip-matching service (hundreds of thousands of location updates per second, sub-second match queries over 'drivers near this point'), and justify the pick against the tradeoff you are accepting.",
            thinkAbout: [
              "Does every location ping actually need durability, or does staleness make old pings worthless anyway?",
              "What query shape (proximity search) must the store answer fast, and which stores are built for it?",
              "Which data in this system must never be lost, and does it belong in the same store as live location?",
            ],
            modelAnswerOutline: [
              "Assumptions: 1 to 5 million active drivers, each pinging location every 4 seconds, so on the order of 250K to 1M writes/sec; matching queries are geospatial ('nearest available drivers to a rider') and must return well under a second; a driver's location is disposable (a 4-second-stale ping is worthless anyway).",
              "**The lens:** PACELC latency-favoring with a heavy write and geospatial-query workload, plus a freshness-not-durability angle: no need to durably persist every ping, only the current location, queryable by proximity, fast.",
              "**Decision:** keep live location in an in-memory geospatial store, Redis with geospatial commands (GEOADD/GEOSEARCH) sharded by geographic cell, as the hot serving layer. Redis absorbs the write rate in memory and answers radius queries in single-digit milliseconds. Partition the world into cells (an S2 or geohash grid) so each shard owns a region and matching is a bounded local search, not a global scan.",
              "**What is given up:** durability and rich secondary querying. The correct trade, because a lost location ping self-heals in 4 seconds and location is only ever queried by proximity.",
              "**The data that must never be lost goes elsewhere:** trip records (fares, receipts, dispute history) go to a separate durable store, sharded SQL or a durable document store, written asynchronously off the hot path.",
              "**Revisit seam:** if match quality needs richer filters (driver rating, vehicle type) at query time, enrich from a cache alongside Redis rather than moving the hot geo query into a heavier store.",
              "Common wrong turn: putting live location in Postgres with PostGIS 'because it does geo.' It does, but a single relational primary cannot absorb 1M writes/sec of ephemeral data, and you would pay for durability on exactly the data that does not need it.",
            ],
          },
        },
        {
          id: "sd-l0-level-calibration",
          title: "Level Calibration: Junior vs Senior vs Staff",
          summary:
            "Know the four rubric axes and aim your depth at the target level: complete design (junior), unaided deep dives (senior), ambiguity plus org/cost/evolution (staff).",
          estimatedMinutes: 25,
          difficulty: "medium",
          skills: ["calibration", "rubric"],
          teach: {
            markdown: levelCalibrationTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l0-level-calibration-apply",
            prompt:
              "Take 'Design a rate limiter' and describe how a passing answer differs at junior, senior, and staff level on scope, depth, and trade-off sophistication.",
            thinkAbout: [
              "What does 'complete' look like at each level?",
              "How many deep dives and how much estimation depth fit each level?",
              "What are the graded rubric axes?",
            ],
            modelAnswerOutline: [
              "Grade against four axes: problem navigation, technical excellence, communication, proactive depth. The prompt is the same; the aim differs.",
              "**Junior (completeness over depth):** define the goal (cap requests per user per window), pick token bucket, place the limiter as middleware in the API gateway backed by a shared Redis counter so multiple app instances agree, draw the request path, and state the response (HTTP 429 with Retry-After). No holes, correct components, end to end. Zero to one estimation, no unprompted deep dives expected. Finishing cleanly is the win.",
              "**Senior (unaided depth and quantified tradeoffs):** everything above, plus proactively raising the concurrency problem: two instances read-modify-write the same Redis counter and race, so reach for atomic INCR with expiry or a Lua script. Compare fixed window (cheap, allows a 2x burst at the boundary) vs sliding-window-log (accurate, more memory) vs token bucket (smooth, tunable) and commit with a reason. Ask what happens when Redis is unavailable and pick fail-open or fail-closed on purpose. One solid deep dive, estimation that sizes the Redis memory. Drive without prompting.",
              "**Staff+ (ambiguity, org, cost, evolution):** first frame the under-specified prompt: rate limiting for what, external API abuse, internal service protection, or fairness? Who is the key: user, IP, or API token, and what does each choice cost? Extend tradeoffs past the technical: a per-user distributed limiter adds a Redis dependency to every request, expanding the on-call and failure surface, so an approximate local limiter with periodic sync may be worth the accuracy loss. Reason about evolution (start centralized, move to a sidecar/local-token design as QPS grows) and make an explicit call on what not to build now.",
              "Budget roughly one deep dive for senior, two for staff, in a 45-minute round; a junior spending the clock on three dives never finishes the basics.",
              "Common wrong turn: giving a staff-depth, never-finished answer to a junior prompt, or a bare token-bucket sketch with no bottleneck-finding to a staff loop.",
            ],
          },
          practice: {
            id: "sd-l0-level-calibration-practice",
            prompt:
              "Describe what specifically lifts your answer from a strong senior answer to a staff answer in a Staff Engineer interview at Stripe where the prompt is 'Design a rate limiter for our public payments API,' given that this is real money and real merchants.",
            thinkAbout: [
              "What is the real business requirement behind rate limiting a payments API: abuse, fairness, or blast radius?",
              "Which degradation policy decisions are business decisions rather than technical defaults?",
              "What two-year evolution and deliberate deferrals would a staff answer name?",
            ],
            modelAnswerOutline: [
              "A strong senior answer is already good: token bucket per API key, atomic counters in a Redis cluster, tiered limits by plan, 429 with Retry-After, a deep dive on the distributed-counter race, and a fail-open-vs-fail-closed decision. Staff means making it specific to Stripe's business.",
              "**First, frame the ambiguity as a product question:** rate limiting a payments API is not primarily abuse prevention, it is fairness and blast-radius control. One merchant's runaway retry loop must not exhaust capacity for everyone else, so the real requirement is per-merchant isolation with global protection underneath. That reframing is the staff move.",
              "**Second, org and cost tradeoffs:** a hard fail-closed limiter that wrongly blocks a legitimate merchant during a Black Friday spike is lost revenue and a support escalation, so the degradation policy is a business decision. Fail-open on the limiter's own infrastructure failure (never block a real payment because Redis blinked) while keeping the per-key ceiling enforced, and separate the idempotency layer so retries stay safe even when limits are loose.",
              "**Also flag the money-path dependency:** a synchronous Redis call on every payment adds latency to the money path and a dependency to on-call, which argues for a local token cache synced asynchronously, trading a little accuracy for a smaller failure surface on the critical path.",
              "**Third, evolution and what not to build:** start with centralized counters, plan the migration to a cell-based or sidecar limiter as QPS grows, and explicitly defer ML-based anomaly limiting as out of scope for v1. Naming the two-year path and the deliberate cut is what a staff interviewer listens for.",
              "Common wrong turn: adding more algorithms and more Redis tuning (deeper senior) instead of reframing the problem in business terms (staff): isolation, revenue risk, failure surface, and evolution.",
            ],
          },
        },
        {
          id: "sd-l0-template-pitfalls",
          title: "A Reusable Template & the Top Pitfalls",
          summary:
            "Carry a phase backbone, stock questions, an estimation checklist, a component palette, and tradeoff lenses, and actively counter the five classic pitfalls.",
          estimatedMinutes: 25,
          difficulty: "easy",
          skills: ["template", "pitfalls"],
          teach: {
            markdown: templatePitfallsTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l0-template-pitfalls-apply",
            prompt:
              "Write a one-page personal cheat template (phases, clarifying questions, estimation checklist, component palette, trade-off lenses) you could reproduce in the first minute of any round, and list the 5 pitfalls you will actively avoid.",
            thinkAbout: [
              "What is the minimal template that starts any round without sounding scripted?",
              "Which pitfalls most commonly cause failure, and how do you counter each?",
              "How do you adapt the template to the actual prompt's constraints?",
            ],
            modelAnswerOutline: [
              "**Phase backbone (45-min budget):** (1) Scope and requirements, 5 min: functional plus non-functional, clarify before designing. (2) Estimation, 2 min: QPS, storage, bandwidth. (3) API and data model, 5 min. (4) High-level design, 15 min: box-and-arrow request path. (5) Deep dive on the 1 to 2 hard parts, 10 min. (6) Bottlenecks and wrap-up, 3 min.",
              "**Clarifying and NFR questions to open with:** How many users (DAU) and what QPS? Read-heavy or write-heavy? Consistency requirement (strong or eventual)? Latency target (p99)? What is explicitly out of scope? Any hard constraints (regions, compliance, budget)?",
              "**Estimation checklist:** DAU x actions/day / 86,400 = average QPS, then x2 to x3 for peak. Storage = writes/day x bytes/record x retention. Bandwidth = QPS x payload. Cache = hot 20% of the data. Servers = peak QPS / per-box throughput.",
              "**Component palette:** load balancer, API gateway, stateless app tier, Redis cache, Kafka queue, CDN, S3 object store, Elasticsearch, primary DB with read replicas and shards.",
              "**Trade-off lenses:** CAP/PACELC, push vs pull, sync vs async, SQL vs NoSQL, normalize vs denormalize.",
              "**The 5 pitfalls and counters:** (1) Solutioning before scoping: force the first 5 minutes onto requirements. (2) Unbounded feature list: pick 2 to 3 core features and defer the rest out loud. (3) Generic NFRs: attach real numbers to every 'scalable/fast.' (4) Designing in silence: narrate every assumption and choice continuously. (5) No wrap-up: reserve the last 2 to 3 minutes for bottlenecks, failure modes, and next steps.",
              "**Adapting it:** the template is a backbone, not a script. If the interviewer hands over the requirements and says 'go to storage,' skip phases 1 and 2, say so, and jump in.",
              "Common wrong turn: memorizing this as a monologue and delivering it verbatim regardless of the actual prompt, which reads as not listening.",
            ],
          },
          practice: {
            id: "sd-l0-template-pitfalls-practice",
            prompt:
              "Adapt your one-page template to a 35-minute clock (a compressed onsite slot, not 45) for the prompt 'Design a URL shortener like Bitly,' and show the running order and time budget you would actually use, including where you cut.",
            thinkAbout: [
              "Which phases are cheap to lose but expensive to miss, and which can safely compress?",
              "Which two estimation numbers actually drive a design decision for a URL shortener?",
              "Where does the single deep dive belong for this specific system?",
            ],
            modelAnswerOutline: [
              "With 35 minutes, compress rather than skip. The rubric axes are the same, so protect scoping and wrap-up (cheap to lose, expensive to miss) and compress the middle.",
              "**(1) Scope, 4 min:** core features are create-short-URL and redirect; name and defer analytics and custom aliases. NFRs: read-heavy (redirects outnumber creations roughly 100:1), redirect p99 under 100ms, high availability (a dead link is a broken product).",
              "**(2) Estimation, 3 min:** assume 100M new URLs/month, about 40 writes/sec on average, and at 100:1 about 4K redirects/sec on average, so 8K to 12K/sec at peak with the 2x to 3x multiplier; 100M/month x 500 bytes x 5 years is low terabytes, small enough that the interesting problem is read latency, not storage.",
              "**(3) API and key generation, 5 min:** `POST /shorten`, `GET /{code}` redirecting with 301/302; the code is base62 of a counter or a hash. Commit to a distributed counter (or pre-generated key ranges per host) to avoid collision-checking on the write path.",
              "**(4) High-level design, 9 min:** LB, stateless app tier, a KV store (DynamoDB or Cassandra) keyed by short code, and an aggressive cache (Redis plus CDN) in front because reads dominate and the hot set is small.",
              "**(5) One deep dive, 8 min:** read scaling and cache strategy, since that is where this design lives, not the write path.",
              "**(6) Wrap-up, 6 min:** the bottleneck is the redirect read path, so cache heavily and consider read replicas; call out the counter as a single point of contention and how key-range pre-allocation fixes it.",
              "**Where the cut lands:** a single deep dive instead of two, and estimation kept to the two numbers that drive a decision (read:write ratio and total storage class). Refuse to cut scoping or wrap-up, the phases whose absence a grader notices most.",
            ],
          },
        },
        {
          id: "sd-l0-communication-whiteboarding",
          title: "Communication, Whiteboarding & Reading the Interviewer",
          summary:
            "Narrate assumption-option-choice continuously, keep the board in fixed zones with a parking lot, and treat interviewer hints as intentional steering.",
          estimatedMinutes: 25,
          difficulty: "easy",
          skills: ["communication", "whiteboarding", "interview-technique"],
          teach: {
            markdown: communicationWhiteboardingTeach,
            estimatedMinutes: 10,
          },
          apply: {
            id: "sd-l0-communication-whiteboarding-apply",
            prompt:
              "Explain how you would run the first 20 minutes of a system-design round out loud: how you narrate your thinking, lay out the diagram, and respond when the interviewer nudges you toward a topic you had not planned to cover.",
            thinkAbout: [
              "How do you keep the interviewer inside your head instead of leaving them to guess what you are thinking silently?",
              "What is the difference between a hint you should follow and a rabbit hole you should defer?",
              "How do you lay out a diagram so it stays readable as the design grows?",
              "What changes when the whiteboard is a shared remote tool instead of a physical wall?",
            ],
            modelAnswerOutline: [
              "Assume a 45-minute round, one interviewer, whose attention is both collaborator and score. The first 20 minutes: scope, estimate, and get a high-level design on the board, narrating throughout.",
              "**Minutes 0 to 5, requirements, narrated:** say what you are doing before doing it ('Before I design anything I want to nail requirements, so let me ask a few questions'). Ask users/DAU, read vs write, consistency, latency, scope, and write the answers top-left on the board as the shared reference. State assumptions out loud: 'I will assume eventual consistency is fine for the feed, tell me if that is wrong.'",
              "**Minutes 5 to 10, estimation, narrated:** derive QPS and storage out loud so the interviewer sees the reasoning, not just the number, and pin the results next to the requirements. If you need a moment, announce it: 'give me a few seconds to size the write rate.'",
              "**Minutes 10 to 20, high-level design:** propose an order and check in ('I will lay out the request path first, then go deep on the hot spot, does that work?'), then draw in the center zone, plain boxes and labeled arrows, client to LB to API to cache to DB, saying each component's job and the one assumption it rests on as you add it.",
              "**Handling an unplanned nudge:** treat it as intentional steering, not a distraction. Confirm the intent ('sounds like you want me to go deep on durability, happy to, let me do that now') and follow it. A self-generated tangent gets parked instead: write it in the parking-lot zone, say 'I will come back to analytics later,' and move on. A hint from them you follow; a tangent from you, you park.",
              "**Remote variant:** on a shared tool like Excalidraw, pre-learn shortcuts, keep shapes minimal, narrate a bit more because they cannot read your face, and never spend time beautifying boxes.",
              "Common wrong turn: going silent to think (announce the pause instead) or ignoring the nudge because it was not in the outline (reads as not listening).",
            ],
          },
          practice: {
            id: "sd-l0-communication-whiteboarding-practice",
            prompt:
              "Explain out loud how you read the signal and adjust when, 30 minutes into a fully remote round on Excalidraw designing a chat system, the interviewer has gone mostly quiet then interrupts with 'I am a bit worried about message ordering,' given you cannot see their face and had planned to talk about storage next.",
            thinkAbout: [
              "What does a long silence followed by a specific interruption tell you about where the interviewer thinks your gap is?",
              "How do you verbally re-sync when you cannot read body language?",
              "What is the technically rigorous answer to per-conversation message ordering?",
            ],
            modelAnswerOutline: [
              "**Reading the signal:** a mostly-silent remote interviewer who suddenly interrupts with a specific concern is giving a high-value signal, and remote makes it higher-value because you get fewer of them. 'I am a bit worried about message ordering' is not idle curiosity; it says exactly where they want depth and probably where they suspect the design has a gap. Drop the planned storage detour without resistance.",
              "**Confirm intent out loud** because on a shared tool you cannot nod and read a reaction: 'Good flag, sounds like you want me to make ordering rigorous before I move on to storage. Let me do that now.' That sentence shows you heard them and verbally re-syncs the two of you.",
              "**Then actually go deep, narrating and drawing:** within a single conversation you need a total order; across conversations you do not. Commit to a per-conversation sequence number assigned by the owning partition (the conversation is the partition key), so all messages in a chat get a monotonic sequence from one authority, avoiding cross-node clock disagreement.",
              "**Cover the edges:** client send-time cannot be trusted for ordering, so order by server-assigned sequence and use client timestamps only for display. Handle out-of-order delivery (a client receives seq 5 before seq 4) by having the client buffer and reorder by sequence.",
              "**Board hygiene for remote:** plain boxes and labeled arrows, write 'ordering: per-conversation seq #' directly on the diagram so the decision is visible without re-explaining, and talk a little more to fill the missing body-language channel.",
              "**Close the loop:** check in ('does that resolve the ordering concern, or should I go further?') before returning to storage, confirming you actually closed their worry rather than assuming it from silence.",
            ],
          },
        },
      ],
    },
  ],
}
