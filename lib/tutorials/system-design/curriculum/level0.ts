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
not start drawing. They start **scoping** — turning a vague ask into a small, agreed problem they can
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
      ],
    },
  ],
}
