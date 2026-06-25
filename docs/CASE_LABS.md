# Case Labs

> Engineering spec & build guide for the **Case Labs** feature on CodeSparring.
>
> Status: Proposal / v1 design. Owner: TBD. Last updated: 2026-06-25.

---

## 1. What Case Labs is (in one line)

**Case Labs turns a real-world, company-flavored engineering problem into a guided, milestone-driven build** — the user clarifies ambiguity, decomposes the system, designs the contract, writes the code, and reviews their work, with an AI interviewer as a constant companion through every step.

It is the deep, "this feels like a real onsite" format that sits above the everyday DSA practice loop.

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

These are the non-negotiables. The biggest product risk is that this format reads as **paperwork / homework**. Every principle below exists to prevent that.

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

### 7.4 Build
- **Purpose:** Implement against tests.
- **Station:** The **existing code editor + test runner** (`EditorColumn` + `/api/execute` + Piston). Starter code and tests come from the Case Lab definition, exactly like a DSA scenario.
- **Inputs:** `build: { code, language, testResults }` (reuses interview-store fields)
- **AI behavior:** Existing coding-phase interviewer behavior. **Onsite mode:** inject a curveball partway through.
- **Completion:** Tests passing (or user marks done). This milestone can hard-require nothing — partial credit is fine.

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
  // Build milestone reuses the existing scenario shape:
  buildScenarioId: string;    // points at a DSAScenario/BugFixScenario etc.
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
| Code editor + tests | `EditorColumn`, `/api/execute`, `lib/piston.ts` | Nothing — Build station embeds it as-is |
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
- [ ] Author **one** seed Case Lab (Palantir "911 Dispatch") reusing an existing build scenario as `buildScenarioId`.
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
- [ ] Embed `EditorColumn` + `/api/execute` as the **Build** station.
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
4. **Build scenario coupling:** reuse existing scenario IDs (recommended for v1) vs author bespoke build tasks per lab.
5. **Voice mode:** include the existing `VoiceModeToggle` in Case Labs v1, or defer?

---

## 14. Out of scope for v1

- User-authored / community Case Labs.
- Multi-user / pair sessions.
- Auto-generation of new labs from a company name (the `curriculum_creator_playbook` direction — great v2).
- Per-milestone spaced repetition (v1: the whole lab is the unit of mastery).

---

## 15. North star

A user opens a Case Lab two weeks before a Palantir onsite, immediately understands **why this company interviews this way**, moves calmly through five milestones that each tell them **where they are and what's next**, never faces a blank wall, talks to an AI interviewer the whole time, and walks out with a score and a clear "do this next." It should feel **open and guided** — never like filling out a form.
