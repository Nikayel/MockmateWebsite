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
      ],
    },
  ],
}
