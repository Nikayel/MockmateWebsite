# Learn System Design — curriculum pack

A **zero-to-hero system-design course** for CodeSparring, dual-purpose by design: real engineering
knowledge for building modern systems, and interview readiness for SWE / senior / staff and DE/infra
rounds. It runs on the **existing Learn engine** (same content tree, registry, progress collection,
3-column Lesson Player, and lesson-player routing) — system design is *another course plugged into that
engine*, not a second engine. This folder is the planning + authoring pack; it mirrors
`docs/sql-curriculum/` so the courses read the same way.

> **Design thesis: reuse, don't rebuild.** The Learn engine already knows how to render a course,
> track progress, and walk a learner Read → Apply through a level tree. System design reuses all of
> it. The **one** genuinely new subsystem is a **free-response answer panel + answer persistence**:
> unlike Python and SQL, system design is *not code-graded* — there is no runner, no test marker, no
> auto-scoring. The learner reads, thinks, writes a design answer, saves it, then reveals a model
> answer to self-compare. That answer panel (input + save + reveal) and its persistence are the new
> code; everything else — level/module/lesson types, registry, progress writes, Lesson Player shell,
> routing, auth-gating — is the same machinery the other courses use. See [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## What's in this folder

| File | What it is |
|------|------------|
| [`README.md`](./README.md) | This file — the pack overview, level table, interaction model, and build plan. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | **Technical spec** — the reuse-vs-build map, the new free-response answer panel + answer-persistence subsystem, the `DesignLesson` shape, UI/persistence/route reuse, build order, and Definition of Done. Mirrors `docs/sql-curriculum/SPEC.md`. |
| [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) | The authoritative **content contract** — every level → module → lesson with `learnFocus`, `applyPrompt`, `thinkAbout`, and `modelAnswerOutline`. Lesson ids are stable and must not change. |
| [`curriculum-map.json`](./curriculum-map.json) | The machine-readable form of the map — the same taxonomy as a JSON the content author iterates over one lesson at a time. |
| [`RESEARCH.md`](./RESEARCH.md) | The web-grounded research behind the curriculum: the system-design interview rubric across levels (junior/senior/staff), the topic taxonomy (networking, storage, distributed systems, reliability, security), and the canon of "design X" case studies. |
| [`CONTENT.md`](./CONTENT.md) | **The course content** — every lesson authored as Learn + Apply free-response design reasoning with a concrete senior-engineer voice. This is what a content author ships into the course tree as `DesignLesson` objects. |
| [`content/`](./content/) | Per-level authored content as it is expanded from `CONTENT.md` / the map into shippable `DesignLesson` objects. Populated by the curriculum author. |
| [`AGENT-1-engineer.md`](./AGENT-1-engineer.md) | **Ship-the-spec prompt** — a copy-paste runbook for the engineering agent that builds the free-response answer panel + persistence, wiring, routes, and two proof lessons from `ARCHITECTURE.md`. |
| [`AGENT-2-curriculum-developer.md`](./AGENT-2-curriculum-developer.md) | **Curriculum-author prompt** — a `/loop` runbook that authors all lessons from `CONTENT.md` / the map into `DesignLesson` objects, one per iteration. Run after AGENT 1. |

## The twelve levels (same Learn → Apply spine at increasing depth)

| Lvl | Title | Modules | Lessons | What a learner can do after it |
|----:|-------|--------:|--------:|--------------------------------|
| L0 | **Interview & Communication Method** | 4 | 15 | Run the interview clock: scope, estimate, structure a walkthrough, and drive tradeoffs at the right level. |
| L1 | **Foundations & Mental Models** | 4 | 21 | Reason about networking, API contracts, real-time comms, and the performance/resilience fundamentals every design assumes. |
| L2 | **Data Storage & Modeling** | 5 | 17 | Pick a datastore and model data for its access patterns, understanding engines, indexing, and transactions. |
| L3 | **Scaling the Data Tier** | 5 | 16 | Scale a data tier with replication, sharding, caching, CDN/search/geo, and keep derived data in sync. |
| L4 | **Scaling Compute & Traffic** | 4 | 14 | Scale a compute tier: stateless services, load balancing, service discovery, gateways, rate limiting, autoscaling. |
| L5 | **Distributed Systems Core** | 5 | 18 | Reason rigorously about consistency, consensus, clocks, distributed transactions, and failure handling. |
| L6 | **Asynchronous & Event-Driven Systems** | 5 | 15 | Design event-driven systems with correct delivery semantics, stream processing, and event sourcing/CQRS. |
| L7 | **Reliability, Resilience & Operations** | 5 | 17 | Make a system reliable: SLOs/error budgets, observability, resilience patterns, DR, and safe delivery. |
| L8 | **Security, Privacy & Multi-tenancy** | 5 | 16 | Secure a system: authn/authz, encryption/secrets, abuse defense, compliance/PII, tenant isolation, breach response. |
| L9 | **Modern Architecture & Delivery** | 5 | 16 | Choose modern architecture and delivery: services, containers/mesh, serverless/edge, FinOps, OLTP vs OLAP. |
| L10 | **Applied Case Studies** | 5 | 28 | Design complete end-to-end systems (the canon of "design X" problems) integrating every prior level. |
| L11 | **Modern & Specialized Systems** | 4 | 15 | Design modern specialized systems: ML platforms, LLM/GenAI infra, real-time analytics, global data, IoT. |

**12 levels, 56 modules, 208 lessons total.** Every module carries both real engineering knowledge and
interview readiness. There is no code execution and no auto-grading anywhere in the course — the whole
course is Learn → Apply free-response design reasoning.

## Interaction model — "Learn then Apply"

Every lesson is Learn (read the concept in a senior-engineer voice with real systems and numbers) then
Apply (a free-response design prompt). The Apply loop is deliberately un-graded and self-directed:

1. **Think** — the learner reads the `applyPrompt` (which leads with the deliverable: "Design…",
   "Explain how you would…", "Choose and justify…") and works through the `thinkAbout` questions.
2. **Answer** — the learner writes their design answer in the free-response panel.
3. **Save** — the answer is persisted (so it survives reload and can be revisited), the same progress
   collection the other courses write to.
4. **Reveal** — the learner reveals the model answer (built from `modelAnswerOutline`) and
   self-compares: did they state assumptions, give the high-level design, name concrete technologies,
   quantify where sensible, call out tradeoffs, and avoid the common wrong turn?

This mirrors how a real system-design round works: there is no single right answer, so the value is in
the learner's reasoning and an honest self-compare against a strong reference — not a pass/fail grade.

## How to build it — two agents

Mirrors how the SQL and Python courses were built (an engineer, then a curriculum author):

1. **Engineer** — paste [`AGENT-1-engineer.md`](./AGENT-1-engineer.md)'s prompt into a fresh Claude
   Code session. It follows `ARCHITECTURE.md` (answer-panel-first thin slice → generalize the
   `DesignLesson` type → registry/routes/auth → answer persistence → UI polish) and ships the
   free-response answer panel + persistence with two proof lessons end-to-end. The new code is one
   answer-panel component + its persistence hook + the `DesignLesson` type and a few lines of
   union/dispatch widening — everything else is reuse.
2. **Curriculum author** — once AGENT 1 is green, run
   [`AGENT-2-curriculum-developer.md`](./AGENT-2-curriculum-developer.md) with `/loop` to author all
   lessons from `CONTENT.md` / the map into `DesignLesson` objects, one per iteration, each rendering
   correctly through the Lesson Player and reveal flow.

## Status

Planning + authored-content pack (docs only — no application code changed yet). The `CURRICULUM-MAP.md`
and `curriculum-map.json` define the full 208-lesson contract; the remaining pack files
(`ARCHITECTURE.md`, `RESEARCH.md`, `CONTENT.md`, the two AGENT runbooks) are the plan for shipping it.
Before the course is live, the engineer must build the answer panel + persistence, and each lesson must
be authored into a `DesignLesson` and verified to render Learn → Apply → reveal correctly on the Learn
engine.
