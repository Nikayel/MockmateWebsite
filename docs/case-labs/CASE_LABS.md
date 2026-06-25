# Case Labs

> Engineering spec & build guide for the **Case Labs** feature on CodeSparring.
>
> Status: Proposal / v1 design. Owner: TBD. Last updated: 2026-06-25.

---

## 1. What Case Labs is (in one line)

**Case Labs turns a real-world, company-flavored engineering problem into a guided, milestone-driven build** — the user clarifies ambiguity, decomposes the system, designs the contract, **works inside a real (messy) codebase**, and reviews their work, with an AI interviewer as a constant companion through every step.

It is the deep, "this feels like a real SWE/internship onsite" format that sits above the everyday DSA practice loop.

### Critical scope decision: Case Labs are codebase work, NOT DSA

DSA does **not** belong in a Case Lab, and the workbook arc would be redundant around it. Your daily practice loop + spaced repetition already train DSA perfectly, and a LeetCode problem statement **is** its own spec — there is no ambiguity to clarify, no system to decompose. Wrapping a workbook around "implement two-sum" adds friction without value.

SWE and internship interviews (Palantir FDSE, Stripe, Linear, etc.) are **codebase-drop** problems: you are dropped into a partial, messy system and asked to find what's broken, extend it, or redesign a piece. The Clarify → Decompose → Design → Build → Review arc only earns its keep when the thing you build into has **existing context to read and reason about**. So the **Build** milestone embeds a multi-file codebase task (your existing `bugfix` / `add-functionality` scenarios + `workspace-execution`), never a blank DSA editor. The earlier milestones are literally *why* the codebase task makes sense — the user decomposed and designed that system themselves first.

| Format | Build milestone | Skill trained | Use case |
|---|---|---|---|
| Daily DSA practice | Blank editor, one algorithm | Pattern recall, coding speed | Daily gym |
| **Case Labs** | **Multi-file codebase drop** (extend / fix / redesign) | Decomposition, systems thinking, reading real code | SWE/internship onsite prep |

The two formats do not overlap.

### Market validation (2026 research) — three commitments this locks in

External research (2025-2026 hiring signal) strongly validates the format and sharpens three product commitments. Sources in §16.6.

- **The format matches where elite hiring is actually going.** Palantir's real loop has a named **"Decomposition round"** (vague real-world problem, no scope, break into testable subproblems) and a **"Learning/Re-engineering round"** (orient inside a 200-500 line *messy codebase*) — a 1:1 match to this spec. Meta/Google added AI-assisted **"code comprehension"** rounds (analyze + debug an existing codebase). System design is now ~30% of hiring decisions, judged on "scope ambiguous requirements, articulate tradeoffs, handle pushback" — verbatim what the milestones train.
- **Commitment 1 — complement, never replacement.** LeetCode is *not* dead; Google/Meta doubled down on harder DSA. Position Case Labs as the **premium complement** to the daily DSA loop, not a replacement. (Already reflected in §1.)
- **Commitment 2 — depth-first launch on ONE company (Palantir).** Real-world labs are company/role specific and expensive to author. Ship **one excellent Palantir lab** before any breadth. Palantir is the ideal launch because its real loop *is* this format.
- **Commitment 3 — the lab-generation engine is core, not "v2 nice-to-have."** Per-lab authoring cost is the real business risk. The `curriculum_creator_playbook` (auto-generating labs per company/role) is what makes unit economics survivable — treat it as a first-class roadmap item (see §14).

### The mental model we are selling

The user is **not** "solving a problem." They are **designing and building a system**, one milestone at a time. That reframe — construction over a sequence of stations — is the entire product. Every UI and copy decision should reinforce it.

---

## 2. Why it exists (the strategic case)

| | Everyday DSA practice | **Case Labs** |
|---|---|---|
| Frequency | Many per day | 1–2 per week |
| Length | 15–45 min | Multi-session (1–3 hrs) |
| Skill tested | Pattern recall, coding speed | Ambiguity handling, decomposition, systems thinking, communication |
| Mental model | "Solve this question" | "Build this system" |
| When used | Daily gym | "I have an onsite in 2 weeks" |

DSA scenarios + spaced repetition are the daily gym. Case Labs are the **dress rehearsal for a real onsite** — the format that practices the things candidates actually fail on: scoping ambiguous requirements, choosing entities, defending tradeoffs, and explaining themselves out loud. They map directly to how companies like Palantir (FDSE/SWE), Stripe, and Google run real interviews.

Each Case Lab is an **artifact the user returns to**, not a disposable problem. That single fact drives most of the design (save/resume, progress persistence, roadmap placement).

---

## 3. Core concepts & vocabulary

Use these terms consistently in code, UI copy, and analytics.

- **Case Lab** — one real-world scenario the user builds (e.g. "911 Dispatch Triage", "Fraud Investigation"). The top-level unit.
- **Milestone** — an ordered stage inside a Case Lab. The default five: **Clarify → Decompose → Design → Build → Review**.
- **Station** — the workspace for the active milestone (a guided form, the code editor, or the review panel). The center column "morphs" between stations.
- **Company Context** — the framing that answers *"why am I doing this, and why this company?"* Surfaced at the start and referenced throughout.
- **Run** — a single user's attempt/session at a Case Lab. Persisted, resumable.
- **Curveball** — an injected mid-build constraint change (onsite mode only), e.g. "GPS feed is now delayed 30s — how does your design hold up?"

---

## 4. Design principles

These are the non-negotiables. The biggest product risk is that this format reads as **paperwork / homework**. Every principle below exists to prevent that. The research backing these principles — and the visual-hierarchy and wizard-vs-disclosure tradeoffs — is in **§16 (Appendix A)**.

### P1 — Open, not boxed-in
Default to **freedom with a nudge**, not mandatory gates. The user can move between milestones, jump ahead to code, or skip a stage. The AI *notices* and the Review reflects it — but the platform never says "you may not proceed." (Strict sequential unlock is reserved for **Onsite Mode**, an opt-in intensity.)

### P2 — Low cognitive load: one thing at a time
- Never show a blank wall. Every form opens with a **ghost example** and an AI "want help starting?" nudge.
- **Progressive disclosure** — one section expands at a time, not six empty fields at once.
- The active station is the only busy zone. The milestone rail and chat stay calm and consistent.

### P3 — Always answer "where am I, what's next, and why"
The milestone rail is always visible and always answers three questions at a glance:
- **Where am I?** (current milestone highlighted)
- **What's next?** (next milestone labeled, with a one-line "what you'll do here")
- **Why this?** (each milestone has a short purpose line; the Case Lab header carries the company framing)

### P4 — The AI is the spine, not a sidebar
The chat column is constant across every milestone. Today it only discusses code; here it reacts to **whatever station you are on** — critiquing clarifying questions, poking holes in a data model, challenging a tradeoff. Real-time, in-character reaction is what makes a form feel like an interview instead of a Google Doc.

### P5 — Momentum is a feature
Every completed milestone lands a **visible win**: a checkmark + a one-line AI verdict ("Solid decomposition — you caught the concurrency risk most people miss"). The long format survives on dopamine.

### P6 — "Why this company" is explicit
The user should always understand they are practicing *this company's actual interview style*. Surface it in the header, the AI's persona, and the Review ("This is exactly the kind of ambiguity Palantir FDSE interviews open with").

---

## 5. The end-to-end user flow

```
BROWSE                 START                 RUN (milestones)                      FINISH
┌─────────┐   ┌──────────────────┐   ┌──────────────────────────────┐   ┌──────────────┐
│ /labs   │ → │ Lab intro card   │ → │ Clarify → Decompose → Design │ → │ Review +     │
│ gallery │   │ (why this co.,   │   │  → Build → Review            │   │ score +      │
│ by co./ │   │  what you'll     │   │ (resumable, AI throughout)   │   │ roadmap/     │
│ skill   │   │  build, time)    │   │                              │   │ spaced-rep   │
└─────────┘   └──────────────────┘   └──────────────────────────────┘   └──────────────┘
                                              ↑ save & resume anytime
```

### 5.1 Browse — `/labs`
A gallery of Case Labs grouped by **company** and **skill**. Each card shows: scenario title, company badge, estimated time, difficulty, the skills it trains, and progress (Not started / In progress / Completed). Filtering by company answers "why this" before they even start.

### 5.2 Start — the intro
Before any work, a single calm screen that sets context:
- **Why this company** — 2–3 lines on how this company actually interviews and why this scenario mirrors it.
- **What you'll build** — the outcome in plain language.
- **The milestones** — the 5-station path shown up front so there are no surprises.
- **Mode toggle** — Practice (soft, open) vs Onsite (strict, timed, curveballs).
- One primary button: **Start build**.

### 5.3 Run — the milestones
The core experience (screen architecture in §6, milestone specs in §7). The user works station by station, chats with the AI throughout, and can pause/resume at any point.

### 5.4 Finish — Review
Structured feedback + score, fed into the existing feedback pipeline, mastery, and roadmap. Clear "what worked / fix next / do this next" output, plus a prompt to schedule a related Case Lab or review.

---

## 6. Screen architecture

Reuse the existing `/interview` 3-column shell. Evolve it so the **center morphs per milestone** and **chat is the spine**.

```
┌────────────┬────────────────────────────────────┬─────────────────┐
│ MILESTONE  │      ACTIVE STATION (morphs)        │  AI INTERVIEWER │
│   RAIL     │                                     │   (constant)    │
│            │  Clarify   → guided Q/assumption    │                 │
│ ✓ Clarify  │  Decompose → entities + flow + state│  reacts to      │
│ ✓ Decompose│  Design    → API contract +tradeoffs│  whatever is    │
│ ▸ Design   │  Build     → CODE EDITOR + tests    │  in the center  │
│ ○ Build    │  Review    → rubric + AI recap      │  right now      │
│ ○ Review   │                                     │                 │
│            │                                     │                 │
│ [why this  │                                     │  [voice toggle, │
│  milestone]│                                     │   hints]        │
└────────────┴────────────────────────────────────┴─────────────────┘
```

- **Left rail** — vertical stepper. Current milestone highlighted, completed ones checked, next one labeled with a one-line "what you'll do." Each item carries its purpose line (P3). Collapsible on small screens.
- **Center station** — the only busy zone. Renders a different component per milestone. For **Build**, this is the existing CodeMirror editor + test runner — i.e. the code editor is **one station in the journey**, not the whole app.
- **Right chat** — the existing AI interviewer, unchanged in placement, extended to be milestone-aware.

The code editor being just one of five stations is the single biggest UX upgrade, and it reuses your chat + phase-detection engine almost directly.

---

## 7. Milestone-by-milestone spec

Each milestone defines: **purpose**, **what the station shows**, **user inputs**, **AI behavior**, and **completion signal**. All inputs persist to the Run document (§9).

### 7.1 Clarify
- **Purpose:** Surface ambiguity before building. ("What would you ask before writing a line?")
- **Station:** A guided list of dimensions (business outcome, key users/bottlenecks, data freshness, latency/safety/legal, scale). Each row = a **Question** field + an **Assumption** field. Opens with one ghost example filled in.
- **Inputs:** `clarify: { dimension, question, assumption }[]`
- **AI behavior:** Reacts in-character to each question ("Good — that's the one that changes your whole data model"). Can answer as the interviewer if asked.
- **Completion:** ≥ N (e.g. 3) dimensions filled, or user explicitly marks done. Soft.

### 7.2 Decompose
- **Purpose:** Map the system into parts.
- **Station:** Three light sub-panels: **Legacy workflow** (ordered steps), **Core entities** (name + 1-line role), **State transitions** (for one key entity). Progressive disclosure — one panel at a time.
- **Inputs:** `decompose: { workflow: string[], entities: {name, role}[], stateMachine: {...} }`
- **AI behavior:** Challenges missing entities or unhandled states ("What happens to a Responder mid-dispatch if the call is cancelled?").
- **Completion:** Entities + at least one state machine present. Soft.

### 7.3 Design
- **Purpose:** Commit to a contract and defend tradeoffs.
- **Station:** **API contract** (inputs/outputs as concrete types), **Tradeoff table** (Decision / Option A / Option B / Choice / Why), and a ranking/fallback decision.
- **Inputs:** `design: { api: {...}, tradeoffs: {...}[], fallback: string }`
- **AI behavior:** Pushes on every "Choice" cell — "Why A over B here? What breaks at scale?"
- **Completion:** API + ≥1 tradeoff with a justified choice. Soft.

### 7.4 Build — the codebase drop
- **Purpose:** Work inside the real system the user just designed — extend it, fix it, or redesign a piece. **Not** a from-scratch algorithm.
- **Station:** The **existing multi-file workspace editor + test runner** (`workspace-execution` + `/api/execute` + Piston), the same surface that powers `bugfix` / `add-functionality` scenarios. The codebase is a partial implementation of the system from the Clarify/Decompose/Design milestones, with editable files + read-only reference files and visible logs/repro steps.
- **Inputs:** `build: { touchedFiles, code, language, testResults }` (reuses workspace + interview-store fields)
- **AI behavior:** Existing coding-phase interviewer behavior, now able to reference the user's own Design decisions ("you said you'd rank by ETA — does your code actually do that?"). **Onsite mode:** inject a curveball partway through.
- **Completion:** Tests passing and/or expected files touched (or user marks done). Partial credit is fine.

### 7.5 Review
- **Purpose:** Close the loop and convert effort into a score + next step.
- **Station:** A read-only recap of all prior milestones, the AI's structured feedback, and a self-grade rubric (handling ambiguity, decomposition, design, code correctness, communication).
- **Inputs:** `review: { selfScores: {...}, aiFeedback: structured_feedback }`
- **AI behavior:** Generates structured feedback via the **existing feedback pipeline**, then frames it in company terms (P6).
- **Completion:** Feedback generated → Run marked complete → mastery + roadmap updated.

---

## 8. The "why this company" framing

This is what differentiates Case Labs from a generic workbook. Surface company context in three places:

1. **Lab intro** — "Palantir FDSE interviews open with a vague real-world operational problem and watch how you scope it. This lab mirrors that."
2. **AI persona** — the interviewer adopts the company's known style (reuse company-specific interviewer styles already in the RAG/`interviewer-prompts` layer).
3. **Review** — feedback explicitly maps performance to that company's bar ("This is exactly the ambiguity Palantir wants you to chase down — you did, here's where to sharpen").

---

## 9. Data model

### 9.1 TypeScript — the Case Lab definition
Add a new scenario family alongside the existing `ScenarioType` union in `lib/scenarios/types.ts`.

```ts
// lib/labs/types.ts
export type MilestoneKind = "clarify" | "decompose" | "design" | "build" | "review";

export interface CaseLabMilestone {
  kind: MilestoneKind;
  title: string;
  purpose: string;            // P3: the "why" line for the rail
  ghostExample?: unknown;     // P2: pre-filled example to avoid blank wall
  required?: boolean;         // false by default (P1: open)
}

export interface CaseLab {
  id: string;
  title: string;
  company: string;            // "palantir" | "google" | ...
  role: string;               // "FDSE" | "SWE" | ...
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  whyThisCompany: string;     // P6 framing copy
  skills: string[];           // for browse filtering
  milestones: CaseLabMilestone[];
  // Build milestone reuses an existing CODEBASE scenario — never DSA.
  // Must point at a BugFixScenario or AddFunctionalityScenario (multi-file).
  buildScenarioId: string;
  buildScenarioType: "bugfix" | "add-functionality" | "system-design";
}
```

### 9.2 Firestore — the Run (per user, resumable)
Follow the conventions in `docs/FIREBASE_STRUCTURE.md`. Treat document shapes as contracts.

```
caseLabRuns/{runId}
  userId: string
  caseLabId: string
  mode: "practice" | "onsite"
  status: "in_progress" | "completed" | "abandoned"
  currentMilestone: MilestoneKind
  startedAt, updatedAt, completedAt
  answers: {
    clarify: {...}[]
    decompose: {...}
    design: {...}
    build: { code, language, testResults }
    review: { selfScores, aiFeedback }
  }
  milestoneStatus: { clarify: "done", decompose: "done", design: "active", ... }
```

Reuse `InterviewSession.structured_feedback` shape for the Review output so the feedback pipeline and analytics work unchanged.

---

## 10. Integration map — reuse, don't rebuild

| Capability | Existing system to reuse | What's new |
|---|---|---|
| Session shell (3-col) | `app/interview/page.tsx`, `_components/*` | Milestone rail; station switcher in center |
| AI interviewer chat | `/api/chat`, `lib/interview/chat/*`, phase engine | Make chat **milestone-aware** (pass `currentMilestone`) |
| Phase detection | `lib/interview/interview-phases/*` | Map milestones → existing phases (clarify→understanding, design→approach, build→implementation) |
| Multi-file codebase editor + tests | `workspace-execution`, `/api/execute`, `lib/piston.ts` | Nothing — Build station embeds the codebase-drop surface as-is |
| Feedback & scoring | `lib/feedback/*`, `/api/generate-feedback` | Feed multi-milestone transcript in; reuse output shape |
| Mastery / spaced rep | `lib/spaced-repetition/*` | Each completed lab updates mastery like a problem |
| Roadmap placement | `lib/roadmap/*` | Add Case Labs as roadmap milestones |
| State management | `lib/stores/interview-store.ts` | Extend (or new `case-lab-store.ts`) for milestone + answers state |
| UI primitives | `progress`, `tabs`, `collapsible`, `card`, `badge`, `dialog`, `resizable` | Milestone rail (stepper) component |

**Principle:** net-new surfaces are only the **milestone rail** and the **per-milestone form stations**. Everything else is reuse.

---

## 11. Component inventory

**Reuse as-is:** `EditorColumn`, `ChatColumn`/`InterviewerChat`, `TestResultsPanel`, `HintsPanel`, `InterviewTopBar`, `PostInterviewView`, all `components/ui/*`.

**New components:**
- `MilestoneRail` — vertical stepper (built on `progress` + `collapsible`).
- `StationSwitcher` — renders the active milestone's station in the center column.
- `ClarifyStation`, `DecomposeStation`, `DesignStation` — the three guided form stations (`card` + `collapsible` + `input`/`textarea`).
- `ReviewStation` — recap + rubric (`card` + `badge` + existing feedback display).
- `CaseLabIntro` — the start screen (why-this-company, milestones, mode toggle).
- `CaseLabCard` + `/labs` gallery page.

---

## 12. Build checklist

Phased so an engineer can ship incrementally and demo at each phase.

### Phase 0 — Scaffolding & types
- [ ] Create `lib/labs/types.ts` (`CaseLab`, `CaseLabMilestone`, `MilestoneKind`).
- [ ] Define Firestore `caseLabRuns` shape; document it in `docs/FIREBASE_STRUCTURE.md`.
- [ ] Author **one** seed Case Lab (Palantir "911 Dispatch") whose `buildScenarioId` points at a **multi-file `bugfix`/`add-functionality` scenario** (never DSA).
- [ ] Add `case-lab-store.ts` (or extend `interview-store`) for milestone + answers state.

### Phase 1 — The shell & rail (no AI yet)
- [ ] Build `MilestoneRail` (where am I / what's next / why — P3).
- [ ] Build `StationSwitcher` and stub stations.
- [ ] Wire the 3-column layout reusing the `/interview` shell; center morphs per milestone.
- [ ] Soft navigation between milestones (P1: open).

### Phase 2 — The form stations
- [ ] `ClarifyStation` with ghost example + progressive disclosure (P2).
- [ ] `DecomposeStation` (workflow / entities / state machine).
- [ ] `DesignStation` (API contract + tradeoff table).
- [ ] Persist all answers to the Run; save/resume works across reloads.

### Phase 3 — Build & Review (reuse existing engines)
- [ ] Embed the **multi-file workspace editor** (`workspace-execution`) + `/api/execute` as the **Build** station — the codebase-drop surface, not the DSA editor.
- [ ] `ReviewStation` → call existing feedback pipeline; render `structured_feedback`.
- [ ] On complete: update mastery + write Run as `completed`.

### Phase 4 — AI as the spine
- [ ] Pass `currentMilestone` into `/api/chat`; map milestones → existing phases.
- [ ] Milestone-aware interviewer reactions (P4) for Clarify/Decompose/Design.
- [ ] Company persona framing in chat + Review (P6).
- [ ] Per-milestone completion verdict (P5: momentum).

### Phase 5 — Browse, modes, polish
- [ ] `/labs` gallery (filter by company/skill; show progress).
- [ ] `CaseLabIntro` start screen + Practice/Onsite mode toggle.
- [ ] **Onsite mode:** strict sequential unlock, timer, curveball injection.
- [ ] Roadmap integration (Case Labs as roadmap milestones).
- [ ] Empty/loading/error/unauthorized states for all new surfaces.
- [ ] Analytics events (lab started, milestone completed, lab completed, mode used).

---

## 13. Open decisions

1. **Surface:** dedicated `/labs` browse page reusing the `/interview` session shell (recommended) vs a mode flag inside `/interview`.
2. **Gating default:** soft/open with Onsite as opt-in strict (recommended) vs always-mandatory structure.
3. **Store:** extend `interview-store` vs a separate `case-lab-store` (recommended for separation of concerns).
4. ~~Build scenario coupling~~ **RESOLVED:** Build always embeds a multi-file `bugfix`/`add-functionality` codebase scenario, never DSA (see §1). Open sub-question: reuse existing codebase scenario IDs for v1 (recommended) vs author bespoke ones per lab.
5. **Voice mode:** include the existing `VoiceModeToggle` in Case Labs v1, or defer?

---

## 14. Out of scope for v1

- User-authored / community Case Labs.
- Multi-user / pair sessions.
- Per-milestone spaced repetition (v1: the whole lab is the unit of mastery).

> **Note (post-research):** Auto-generation of labs via the `curriculum_creator_playbook` is **out of v1 build scope but explicitly NOT a "someday" item** — it is the core lever on per-lab authoring cost (Commitment 3, §1). Stub the lab-content schema in v1 so the generator has a target to emit into, and prioritize the engine immediately after the first Palantir lab proves the format.

---

## 15. North star

A user opens a Case Lab two weeks before a Palantir onsite, immediately understands **why this company interviews this way**, moves calmly through five milestones that each tell them **where they are and what's next**, never faces a blank wall, talks to an AI interviewer the whole time, drops into a **real codebase they designed themselves**, and walks out with a score and a clear "do this next." It should feel **open and guided** — never like filling out a form.

---

## 16. Appendix A — UX research & design rationale

This section backs the design principles (§4) and screen architecture (§6) with external UX research, and resolves the core layout tradeoff.

### 16.1 The core tradeoff: wizard vs. progressive disclosure → use BOTH

The literature frames this as a binary, but the right answer for Case Labs is a **hybrid**, and the two techniques operate at different scales:

| Technique | Best for | Where we use it |
|---|---|---|
| **Multi-step wizard** (distinct steps, progress shown) | Lengthy, intricate, multi-stage processes; first-time users; "increase perceived ability — each step looks easy" | **The milestone journey** (Clarify→Decompose→Design→Build→Review) — the macro structure |
| **Progressive disclosure** (reveal fields as needed on one surface) | Reducing overwhelm within a step; showing only what's needed *now* | **Inside each station** — one form section expands at a time, not six empty fields at once |

NN/G's guidance — *"keep steps short (ideally 1–3 fields per step), show progress indicators, and allow easy back navigation without data loss"* — maps directly onto our milestone rail + per-station progressive forms. NN/G also reports progressive disclosure can **reduce cognitive load by up to ~55%**, which is the entire bet of P2.

**Decision:** Case Labs is a wizard at the milestone level and progressive-disclosure at the station level. This is exactly the "wizard for lengthy/intricate processes" recommendation, with disclosure preventing the per-step forms from becoming walls.

### 16.2 NN/G's four cognitive-load principles → mapped to Case Labs

NN/G's four principles for reducing cognitive load in multi-step flows map cleanly onto our design:

| NN/G principle | What it means | Where Case Labs delivers it |
|---|---|---|
| **Structure** | Break the process into clear stages | The 5 milestones; one station active at a time (P2) |
| **Transparency** | Always show progress and what remains | Milestone rail answers "where am I / what's next" (P3) |
| **Clarity** | Each step's ask is unambiguous | Per-milestone purpose line + ghost example (P2/P3) |
| **Support** | Help the user when stuck | AI interviewer as constant spine; "want help starting?" nudge (P4) |

### 16.3 Visual hierarchy — concrete rules for the three zones

NN/G: *"visual hierarchy controls the delivery of information... it lets users know where to focus."* Translate that into hard rules so the screen never overwhelms:

- **One primary focus at a time.** The active **station** (center) is the visual hero — highest contrast, most space, the only zone with active inputs. The rail and chat are secondary/supporting and must stay visually quieter (muted, lower contrast, less motion).
- **The rail is an orientation device, not a workspace.** It should read at a glance: current milestone high-contrast + accent; completed = checked + de-emphasized; upcoming = muted with a one-line "what you'll do." Never let it compete with the station for attention.
- **Predictable placement (anti-overwhelm).** Rail always left, station always center, AI always right — across every milestone. *"Put things in predictable places"* is how we prevent the morphing center from feeling like the screen is jumping around.
- **Progress is persistent and ambient.** Visibility-of-system-status: the rail's progress is always on screen so users never have to remember their place. Completion lands a checkmark + one-line verdict (P5) as a small, satisfying state change — not a modal that interrupts.
- **Reduce clutter aggressively.** *"Eliminate any UI component that doesn't have a justifiable purpose."* In a station, collapse everything except the section in focus. In Build, the codebase file tree is the secondary element; the active file is primary.

### 16.4 Mobile / small-screen note
Wizards beat single long pages on small screens (single pages force excessive scrolling). The milestone rail should **collapse to a horizontal progress strip** on narrow viewports, and the three zones become tabs (Station / AI / Files) rather than columns.

### 16.5 Sources
- [Few Guesses, More Success: 4 Principles to Reduce Cognitive Load in Forms — NN/G](https://www.nngroup.com/articles/4-principles-reduce-cognitive-load/)
- [Visual Hierarchy in UX: Definition — NN/G](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)
- [3 Strategies for Managing Visual Complexity — NN/G](https://www.nngroup.com/videos/managing-visual-complexity/)
- [What Is Progressive Disclosure in UX? — UXPin](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure/)
- [What is Progressive Disclosure? — Interaction Design Foundation](https://ixdf.org/literature/topics/progressive-disclosure)
- [Wizard UI Pattern: When to Use It and How to Get It Right — Eleken](https://www.eleken.co/blog-posts/wizard-ui-pattern-explained)
- [Beyond the Progress Bar: The Art of Stepper UI Design — Lollypop](https://lollypop.design/blog/2026/february/beyond-the-progress-bar-the-art-of-stepper-ui-design/)
- [Multi-Step Forms vs Single-Step Forms — IvyForms](https://ivyforms.com/blog/multi-step-forms-single-step-forms/)

### 16.6 Market-research sources (demand & format-trend validation)
- [Will AI Replace LeetCode Interviews? — SpaceComplexity](https://spacecomplexity.ai/blog/will-ai-replace-coding-interviews) (Google/Meta AI-assisted rounds; LeetCode hardened not abandoned)
- [Is LeetCode Dead? How AI Startups Are Changing Technical Interviews — Recruiting from Scratch](https://www.recruitingfromscratch.com/blog/is-leetcode-dead-how-ai-startups-are-changing-technical-interviews) (62% of AI-native startups dropped/reduced LeetCode; code-comprehension rounds)
- [LeetCode is Dead: How to Test Candidates in 2026 — DistantJob](https://distantjob.com/blog/leetcode-is-dead/) (system design ~30% of hiring decisions; scope/tradeoffs/pushback as the signal)
- [My 2025 Palantir Interview Process — LinkJob](https://www.linkjob.ai/interview-questions/palantir-interview-process-questions/) (Decomposition round + Learning/Re-engineering 200-500 line codebase round)
- [Palantir Software Engineer Interview Guide — Prepfully](https://prepfully.com/interview-guides/palantir-software-engineer)
- [Best Coding Interview Prep Platforms 2026 — Scrimba](https://scrimba.com/articles/best-coding-interview-prep-platforms-2026/) (the real-world/codebase-navigation gap; "clone Kubernetes" as the only workaround)
- [LeetCode Alternatives — CodeSignal](https://codesignal.com/blog/leetcode-alternatives-best-options-for-hiring-interview-prep/) (closest competitor: simulates real dev work)
- [Interview Preparation Tool Market — Verified Market Reports](https://www.verifiedmarketreports.com/product/interview-preparation-tool-market/) ($1.2-2.5B market, subscription-dominant)
- [Interview Coaching Service Market — OpenPR](https://www.openpr.com/news/4535258/interview-coaching-service-market-size-propelled-by-11-2-cagr) (~11% CAGR)
- [Is LeetCode Enough to Pass SWE Interviews in 2026? — Beyz](https://beyz.ai/blog/is-leetcode-enough-to-pass-swe-interviews-2026) (internship/new-grad practical shift)

### 16.7 Adversarial counter-points (read before over-committing)
- **LeetCode is not dead.** Google/Meta doubled down on harder DSA to fight AI cheating → Case Labs is a complement, not a replacement. Keep the DSA loop primary.
- **Content cost / standardization is the real risk.** Real-world labs are company- and role-specific ("infra at Stripe tests idempotency; frontend at Vercel tests INP") and expensive to author/maintain → depth-first launch + the generation engine (Commitments 2 & 3).
- **Candidate fairness critiques of real-world/take-home tasks** (unstandardized, biased, time-consuming) apply to *real interviews* — for a *prep product* they are the moat (you make the un-preppable preppable with a rubric the real interview never gives).
- **What would kill it:** interviews *homogenizing* (back to pure DSA, or forward to pure unstructured AI-pairing). Evidence shows the opposite — formats are **splintering/diversifying**, which favors a structured prep layer. Low risk on a 5-10yr horizon.

---

## 17. Appendix B — Curriculum sourcing & the open-source workbook

**The question:** can we use the `workbook-palantir-decomp` GitHub repo as curriculum source material for Case Labs?

**Short answer: yes — it's your own repository** (same owner, `Nikayel`), so you already hold the copyright and can use the content however you want in CodeSparring. The repo is the natural curriculum backbone for Case Labs. A few practical notes:

### 17.1 Licensing reality
- The repo currently has **no `LICENSE` file**, which for a public repo means default *"all rights reserved"* to **you, the owner**. That restricts *others* from reusing it — it does **not** restrict you. You can ingest it into CodeSparring freely.
- The README's *"feel free to fork / submit PRs"* line is an informal invitation, not a formal license. If you ever want outside contributors or to make the reuse terms explicit, add a real license (e.g. MIT for permissive, or keep it closed). **For pulling it into your own commercial platform, do nothing — you already have the rights.**

### 17.2 What maps cleanly from the repo → Case Labs

| Repo asset | Case Labs use |
|---|---|
| `labs/lab_0X_*` scenarios (911 dispatch, fraud, supply chain…) | One Case Lab each — the scenario + company framing |
| `templates/blank_*` (decomposition, API design, tradeoff, state machine) | The **station forms** for Clarify / Decompose / Design milestones |
| `labs/*/workbook.md` structure (clarify→decompose→design→code→review) | Validates the 5-milestone arc — it's the same flow |
| `labs/*/starter.py` + `tests.py` | **Caveat below** — needs reshaping into codebase-drop tasks |
| Self-grade rubric (50-pt, 5 dimensions) | The Review milestone rubric |
| `curriculum_creator_playbook/` | The v2 auto-generation engine (out of scope for v1, but the roadmap) |

### 17.3 One adaptation required (ties back to §1)
The repo's Build artifacts are mostly **single-file `starter.py` + `tests.py`** — i.e. closer to DSA-style "implement from scratch." Per the core scope decision (§1), Case Labs Build milestones must be **multi-file codebase drops**. So when porting a lab, the Build step needs reshaping: instead of an empty `starter.py`, ship a **partial multi-file implementation of that system** with a bug to fix or a feature to add, wired into your `bugfix`/`add-functionality` scenario format. The Clarify/Decompose/Design/Review content ports almost directly; the Build content is the part you re-author.

### 17.4 Recommended ingestion path
1. Treat the repo as a **content source of truth**, not a runtime dependency — copy/adapt content into your scenario format rather than importing the repo.
2. Port **one** lab end-to-end first (911 Dispatch) to validate the pipeline, including reshaping its Build into a codebase drop.
3. Add a `LICENSE` to the source repo only if you want to clarify external reuse — not required for your own use.
4. Long-term, the `curriculum_creator_playbook` is your engine for generating new labs per company/role (v2).
