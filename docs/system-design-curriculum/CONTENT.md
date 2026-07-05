# Learn System Design: CONTENT (the authoring hub)

> Part of the **[Learn System Design curriculum pack](./README.md)**.
> Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [RESEARCH](./RESEARCH.md) · [AGENT-1 (engineer)](./AGENT-1-engineer.md) · [AGENT-2 (content /loop)](./AGENT-2-curriculum-developer.md)

This file is the **content hub**. It does three jobs:

1. Defines the **lesson format contract** every authored lesson follows (so 208 lessons read as one course).
2. Indexes **every module to its authored content file** under [`content/`](./content/) — one file per module, named by the stable module id (`content/<moduleId>.md`).
3. Tells the shipping loop (**AGENT 2**) the exact **read order** and where each lesson's source text lives vs. where the `DesignLesson` TypeScript object gets written.

The full authored prose for each lesson (Learn write-up, Apply/Practice prompts, and model answers) lives in the per-module files under `content/`, not inline here — this file stays a navigable index so the loop agent can jump straight to the module it is authoring.

---

## How the pack files connect (read this first)

```
README.md ─────────────── entry point: overview, level table, build plan
   │
   ├── ARCHITECTURE.md ──► the engine to BUILD (DesignExercise type, DesignAnswerPanel,
   │                        answer persistence, routes/registry wiring, Definition of Done)
   │                        AGENT-1 implements this.
   │
   ├── CURRICULUM-MAP.md ─► the TAXONOMY: every level → module → lesson with learnFocus,
   │      │                 applyPrompt, thinkAbout, modelAnswerOutline. The authoritative
   │      └── curriculum-map.json  (same map, machine-readable — the field-level contract)
   │
   ├── CONTENT.md (this file) ─► the HUB: format contract + index into content/
   │      └── content/<moduleId>.md × 56 ─► the FULL authored lessons (Learn + Apply +
   │                                        Practice + model answers) for that module
   │
   ├── RESEARCH.md ───────► the web-grounded research the curriculum was built from
   │
   ├── AGENT-1-engineer.md ──► "read ARCHITECTURE.md, build the machinery + 1 proof lesson"
   └── AGENT-2-curriculum-developer.md ──► "read CONTENT.md + content/<moduleId>.md +
                                            CURRICULUM-MAP.md, author lessons continuously (no waiting)"
```

**Dependency direction:** `ARCHITECTURE` defines the shape the content must fit → `CURRICULUM-MAP` fixes the scope, ids, prompts, and model-answer outlines → `CONTENT` + `content/*.md` expand that map into full teaching prose → `AGENT-2` turns each `content/*.md` lesson into a `DesignLesson` object in code. Each `content/<moduleId>.md` file also carries a nav header linking back up to this file, to `CURRICULUM-MAP.md`, and to its previous/next module, so from any file you can reach the whole graph.

---

## Course shape

- **208 lessons · 56 modules · 12 levels (L0–L11).** Zero-to-hero, dual-purpose: real engineering knowledge for building modern systems **and** interview readiness for SWE / senior / staff and DE/infra rounds.
- **No code execution, no auto-grading.** Every lesson is **Learn then Apply**: read the concept, then answer a free-response design prompt, **save** the answer, then **reveal** the model answer to self-compare. This is the entire graded surface — there is no runner, no test marker, no score.
- The `content/` files are the **source of truth for the prose**; `curriculum-map.json` is the source of truth for the **structure** (ids, ordering, `thinkAbout`, `modelAnswerOutline`). When authoring, the two must agree: never invent, rename, or reorder a lesson id — copy it verbatim from the map.

---

## Lesson format contract (every lesson in `content/` follows this exactly)

Author each lesson as one section in its module's `content/<moduleId>.md` file, in the map's lesson order:

```markdown
### <lessonId>: <Lesson Title>

- **id:** `<lessonId>`  ·  **difficulty:** easy|medium|hard  ·  **est:** N min  ·  **skills:** a, b, c

#### Learn
<A self-contained, senior-engineer write-up that expands the map's `learnFocus`. Real systems, real
numbers, real tradeoffs. A learner who read ONLY this should be able to attempt the Apply. Use short
"Interview nuance:" asides where a concept is commonly probed. Dependency-free ASCII diagrams are fine.
End with a one-line recap.>

#### Apply: think, then answer (save, then reveal)
**Prompt:** <the map's `applyPrompt`, verbatim in spirit — leads with the deliverable: "Design…",
"Explain how you would…", "Choose … and justify …".>

**Think about:**
- <thinkAbout[0]>
- <thinkAbout[1]>
- <...>

> The learner writes their design answer here, saves it, then reveals the model answer below.

**Model answer (revealed on demand):**
<A genuinely strong reference answer built from the map's `modelAnswerOutline`. It must: state
assumptions, give the high-level design, name concrete technologies/patterns, quantify where sensible,
call out the key TRADEOFFS, and flag at least one common wrong turn.>

**Self-check rubric:** <3-6 checkboxes the learner grades their own answer against.>

#### Practice: real-world variant (save, then reveal)
**Prompt:** <a harder or higher-scale twist on the same skill, framed as a real-world scenario. Same
free-response shape.>

**Model answer (revealed on demand):**
<A strong reference answer for the variant, same quality bar as Apply.>
```

### Style rules (enforced on every lesson)
- **Lead with the deliverable** in every prompt. Not "In this exercise you will explore caching." Instead "Design the caching layer for …".
- **No em dashes** in learner-facing prose (Learn, prompts, model answers, rubrics). Use commas, colons, periods, parentheses.
- **Concrete senior-engineer voice.** Prefer named systems (Kafka, DynamoDB, Envoy, Redis, S3), real numbers (p99, QPS, GB), and committed tradeoffs over hand-waving.
- **Apply** stays a direct design question; **Practice** uses real-world scenario framing (a named product, a scale number, a constraint).
- Model answers must **stand on their own** as the thing a learner self-compares against — never a generic checklist.

---

## The 208-lesson index (module → authored content file)

Every module below links to its authored file under `content/`. Lesson ids, `thinkAbout`, and `modelAnswerOutline` for each module live in [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) and [`curriculum-map.json`](./curriculum-map.json). Author files in this order.

### L0 · Interview & Communication Method: 4 modules · 15 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l0-m1` Requirements & Scoping | 4 | [content/sd-l0-m1.md](./content/sd-l0-m1.md) |
| `sd-l0-m2` Back-of-the-Envelope Estimation | 4 | [content/sd-l0-m2.md](./content/sd-l0-m2.md) |
| `sd-l0-m3` The Structured Walkthrough | 3 | [content/sd-l0-m3.md](./content/sd-l0-m3.md) |
| `sd-l0-m4` Driving the Conversation & Tradeoffs | 4 | [content/sd-l0-m4.md](./content/sd-l0-m4.md) |

### L1 · Foundations & Mental Models: 4 modules · 21 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l1-m1` Networking & the Request Lifecycle | 6 | [content/sd-l1-m1.md](./content/sd-l1-m1.md) |
| `sd-l1-m2` API Design & Contracts | 8 | [content/sd-l1-m2.md](./content/sd-l1-m2.md) |
| `sd-l1-m3` Edge, Proxies & Caching Foundations | 3 | [content/sd-l1-m3.md](./content/sd-l1-m3.md) |
| `sd-l1-m4` Performance & Resilience Fundamentals | 4 | [content/sd-l1-m4.md](./content/sd-l1-m4.md) |

### L2 · Data Storage & Modeling: 5 modules · 17 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l2-m1` Relational & Transactions | 3 | [content/sd-l2-m1.md](./content/sd-l2-m1.md) |
| `sd-l2-m2` Storage Engines & Indexing | 3 | [content/sd-l2-m2.md](./content/sd-l2-m2.md) |
| `sd-l2-m3` NoSQL Families | 6 | [content/sd-l2-m3.md](./content/sd-l2-m3.md) |
| `sd-l2-m4` Data Modeling | 3 | [content/sd-l2-m4.md](./content/sd-l2-m4.md) |
| `sd-l2-m5` Blob Storage & Choosing a Store | 2 | [content/sd-l2-m5.md](./content/sd-l2-m5.md) |

### L3 · Scaling the Data Tier: 5 modules · 16 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l3-m1` Replication | 3 | [content/sd-l3-m1.md](./content/sd-l3-m1.md) |
| `sd-l3-m2` Partitioning & Sharding | 4 | [content/sd-l3-m2.md](./content/sd-l3-m2.md) |
| `sd-l3-m3` Caching at Scale | 3 | [content/sd-l3-m3.md](./content/sd-l3-m3.md) |
| `sd-l3-m4` CDN, Search & Geo | 4 | [content/sd-l3-m4.md](./content/sd-l3-m4.md) |
| `sd-l3-m5` Derived Data & Sync | 2 | [content/sd-l3-m5.md](./content/sd-l3-m5.md) |

### L4 · Scaling Compute & Traffic: 4 modules · 14 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l4-m1` Horizontal Scaling & Load Balancing | 5 | [content/sd-l4-m1.md](./content/sd-l4-m1.md) |
| `sd-l4-m2` Global Traffic & Gateway | 3 | [content/sd-l4-m2.md](./content/sd-l4-m2.md) |
| `sd-l4-m3` Rate Limiting & Overload | 3 | [content/sd-l4-m3.md](./content/sd-l4-m3.md) |
| `sd-l4-m4` Autoscaling & Isolation | 3 | [content/sd-l4-m4.md](./content/sd-l4-m4.md) |

### L5 · Distributed Systems Core: 5 modules · 18 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l5-m1` Failure Models & CAP | 3 | [content/sd-l5-m1.md](./content/sd-l5-m1.md) |
| `sd-l5-m2` Consistency & Time | 4 | [content/sd-l5-m2.md](./content/sd-l5-m2.md) |
| `sd-l5-m3` Consensus & Coordination | 3 | [content/sd-l5-m3.md](./content/sd-l5-m3.md) |
| `sd-l5-m4` Distributed Transactions | 4 | [content/sd-l5-m4.md](./content/sd-l5-m4.md) |
| `sd-l5-m5` Membership & Failure Handling | 4 | [content/sd-l5-m5.md](./content/sd-l5-m5.md) |

### L6 · Asynchronous & Event-Driven Systems: 5 modules · 15 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l6-m1` Messaging Foundations | 3 | [content/sd-l6-m1.md](./content/sd-l6-m1.md) |
| `sd-l6-m2` Kafka & the Log | 4 | [content/sd-l6-m2.md](./content/sd-l6-m2.md) |
| `sd-l6-m3` Delivery Guarantees | 3 | [content/sd-l6-m3.md](./content/sd-l6-m3.md) |
| `sd-l6-m4` Stream Processing & Event Patterns | 3 | [content/sd-l6-m4.md](./content/sd-l6-m4.md) |
| `sd-l6-m5` Schema Governance & Ops | 2 | [content/sd-l6-m5.md](./content/sd-l6-m5.md) |

### L7 · Reliability, Resilience & Operations: 5 modules · 17 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l7-m1` SLOs & Error Budgets | 4 | [content/sd-l7-m1.md](./content/sd-l7-m1.md) |
| `sd-l7-m2` Observability | 2 | [content/sd-l7-m2.md](./content/sd-l7-m2.md) |
| `sd-l7-m3` Resilience Patterns | 3 | [content/sd-l7-m3.md](./content/sd-l7-m3.md) |
| `sd-l7-m4` Redundancy, DR & Multi-Region | 4 | [content/sd-l7-m4.md](./content/sd-l7-m4.md) |
| `sd-l7-m5` Deploy, Release & Chaos | 4 | [content/sd-l7-m5.md](./content/sd-l7-m5.md) |

### L8 · Security, Privacy & Multi-tenancy: 5 modules · 16 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l8-m1` Authentication & Identity | 4 | [content/sd-l8-m1.md](./content/sd-l8-m1.md) |
| `sd-l8-m2` Authorization & Tenancy | 2 | [content/sd-l8-m2.md](./content/sd-l8-m2.md) |
| `sd-l8-m3` Encryption & Secrets | 3 | [content/sd-l8-m3.md](./content/sd-l8-m3.md) |
| `sd-l8-m4` Abuse & Perimeter Defense | 3 | [content/sd-l8-m4.md](./content/sd-l8-m4.md) |
| `sd-l8-m5` Privacy, Compliance & Audit | 4 | [content/sd-l8-m5.md](./content/sd-l8-m5.md) |

### L9 · Modern Architecture & Delivery: 5 modules · 16 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l9-m1` Service Architecture | 3 | [content/sd-l9-m1.md](./content/sd-l9-m1.md) |
| `sd-l9-m2` Containers & Orchestration | 4 | [content/sd-l9-m2.md](./content/sd-l9-m2.md) |
| `sd-l9-m3` Serverless & Edge | 2 | [content/sd-l9-m3.md](./content/sd-l9-m3.md) |
| `sd-l9-m4` Delivery & FinOps | 3 | [content/sd-l9-m4.md](./content/sd-l9-m4.md) |
| `sd-l9-m5` Data-Intensive & Analytics | 4 | [content/sd-l9-m5.md](./content/sd-l9-m5.md) |

### L10 · Applied Case Studies: 5 modules · 28 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l10-m1` Foundational Building Blocks | 4 | [content/sd-l10-m1.md](./content/sd-l10-m1.md) |
| `sd-l10-m2` Social, Feed & Messaging | 4 | [content/sd-l10-m2.md](./content/sd-l10-m2.md) |
| `sd-l10-m3` Geo, Media & Collaboration | 5 | [content/sd-l10-m3.md](./content/sd-l10-m3.md) |
| `sd-l10-m4` Storage & Infrastructure Systems | 8 | [content/sd-l10-m4.md](./content/sd-l10-m4.md) |
| `sd-l10-m5` Commerce, Money & Analytics | 7 | [content/sd-l10-m5.md](./content/sd-l10-m5.md) |

### L11 · Modern & Specialized Systems: 4 modules · 15 lessons
| Module | Lessons | Authored content |
|--------|--------:|------------------|
| `sd-l11-m1` ML Systems Design | 4 | [content/sd-l11-m1.md](./content/sd-l11-m1.md) |
| `sd-l11-m2` LLM / GenAI Infrastructure | 7 | [content/sd-l11-m2.md](./content/sd-l11-m2.md) |
| `sd-l11-m3` Real-Time Analytics & Global Data | 2 | [content/sd-l11-m3.md](./content/sd-l11-m3.md) |
| `sd-l11-m4` IoT, Edge & Time-Series | 2 | [content/sd-l11-m4.md](./content/sd-l11-m4.md) |

---

## For AGENT 2 (the shipping `/loop`): where each thing lives

- **Structure / ids / ordering / thinkAbout / modelAnswerOutline:** [`curriculum-map.json`](./curriculum-map.json) (machine) and [`CURRICULUM-MAP.md`](./CURRICULUM-MAP.md) (human). Copy lesson ids verbatim; never renumber.
- **Full authored prose for a lesson (Learn + Apply + Practice + model answers):** `content/<moduleId>.md` for the module that lesson belongs to (see the index above).
- **The type + player + persistence the object must satisfy:** built by AGENT 1 per [`ARCHITECTURE.md`](./ARCHITECTURE.md) — `DesignLesson` in `lib/tutorials/types.ts`, rendered by `SystemDesignLessonPlayer`, answers persisted via the `user_design_answers` store.
- **Where the compiled lesson objects go:** `lib/tutorials/system-design/curriculum/levelN/`, one `DesignLesson` per lesson, registered through `lib/tutorials/system-design/registry.ts`.

Author lessons **continuously, back to back with no waiting between them**, in curriculum order: for each lesson verify it renders and the save/reveal flow works with a high-quality model answer, commit, then immediately continue to the next in the same turn. `/loop` only re-enters when a turn ends (context running low) and resumes at the next unwritten lesson. Stop when every lesson in this index has a rendering `DesignLesson`.
