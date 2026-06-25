# Case Labs — Build Loop Prompt

> **How to use this:** Start a fresh Claude Code session with **two repositories available locally**:
> 1. **Target repo** (where you build): `MockmateWebsite` (CodeSparring).
> 2. **Ingredient repo** (content source, read-only): `workbook-palantir-decomp`.
>
> Then paste the **"PROMPT TO PASTE"** block below as your first message. Everything above it is context for you (the human).

---

## Before you start — give the session access to BOTH repos

The build session must be able to read the ingredient repo. Pick one:

- **Easiest:** clone the ingredient repo next to the target repo so both are on disk:
  ```
  git clone https://github.com/Nikayel/workbook-palantir-decomp.git ../workbook-palantir-decomp
  ```
  Then tell the session the path (`../workbook-palantir-decomp`).
- **Claude Code on web:** add `Nikayel/workbook-palantir-decomp` to the session's repo scope when you create it (this current session could not, due to scope — a new one can).

If the session cannot read the ingredient repo, it should **stop and ask you** rather than guessing the lab content.

---

## The one rule that prevents the expensive mistake

**DO NOT "just copy" the ingredient repo.** Copying produces the exact thing the spec rejects. There are two distinct jobs:

1. **Build the Case Labs *feature*** — it does not exist in either repo; it is net-new engineering in `MockmateWebsite`.
2. **Port the *content*** — transform markdown → typed scenario objects, and **reshape the Build step from a single-file `starter.py` into a multi-file codebase drop** (a partial system with a bug to fix or a feature to add). A workbook wrapped around a blank DSA editor is the wrong product (see spec §1).

The spec is the source of truth: **`docs/case-labs/CASE_LABS.md`**. Read it fully before writing any code.

---

## PROMPT TO PASTE

```
You are building the "Case Labs" feature in the CodeSparring platform (this repo, MockmateWebsite).

SOURCES OF TRUTH (read fully before any code):
- Spec: docs/case-labs/CASE_LABS.md  (architecture, milestones, data model, design principles, build checklist §12)
- Project rules: CLAUDE.md  (engineering standards — follow exactly)
- Content ingredient repo (read-only): the workbook-palantir-decomp repo I've made available. If you cannot read it, STOP and ask me for access — do not invent lab content.

THE CORE RULE — do not "just copy" the ingredient repo:
- The feature itself is net-new engineering here; it is not in either repo.
- When porting a lab, the Build milestone must be a MULTI-FILE CODEBASE DROP (extend/fix a partial system using the existing bugfix/add-functionality + workspace-execution surface), NEVER a single-file from-scratch DSA task. Reshape the ingredient repo's starter.py accordingly (spec §1, §7.4).

HOW TO ORIENT (this repo requires it):
- graphify-out/graph.json exists. Before reading source files, run `graphify query "<question>"`, `graphify explain "<concept>"`, or `graphify path "<A>" "<B>"` to get a scoped subgraph. Only read raw files after graphify orients you. After modifying code, run `graphify update .`.
- Reuse what exists. Confirm the real APIs before wiring to them: the /interview 3-column shell and its _components, lib/scenarios/types.ts (ScenarioType, BugFixScenario, AddFunctionalityScenario), the workspace-execution + /api/execute path, /api/chat + lib/interview phase engine, lib/feedback pipeline, lib/spaced-repetition, lib/stores/interview-store.ts, and components/ui/*. Match existing patterns; do not introduce new abstractions where one exists.

WORK IN A LOOP — one phase at a time, verify before advancing:
For each phase below:
  1. Plan the phase against the spec; list the files you will add/change.
  2. Implement it, matching nearby code conventions.
  3. VERIFY: run `pnpm typecheck` and `pnpm lint` (and `pnpm test` when logic is involved). Fix until clean.
  4. Run `graphify update .` if you changed code.
  5. Commit with a clear message scoped to the phase.
  6. Briefly report what you did + verification result, then continue to the next phase.
Do NOT batch all phases into one giant change. Stop and ask me if a spec decision is ambiguous (the open decisions are spec §13 — defaults: dedicated /labs surface reusing the interview shell; soft/open gating with Onsite as opt-in; separate case-lab-store).

PHASES (from spec §12 — build in order):

Phase 0 — Scaffolding & types
- lib/labs/types.ts: CaseLab, CaseLabMilestone, MilestoneKind (per spec §9.1). buildScenarioType is "bugfix" | "add-functionality" | "system-design" — never DSA.
- Define the Firestore caseLabRuns shape (spec §9.2); document it in docs/FIREBASE_STRUCTURE.md.
- Add case-lab-store.ts for milestone + answers state (separate from interview-store).
- Acceptance: types compile; no UI yet.

Phase 1 — Shell & milestone rail (no AI yet)
- MilestoneRail (vertical stepper; answers where-am-I / what's-next / why — spec P3) built on components/ui progress + collapsible.
- StationSwitcher + stub stations; 3-column layout reusing the /interview shell; center morphs per milestone.
- Soft navigation between milestones (spec P1: open, not gated).
- Acceptance: can click through milestones; rail reflects state; typecheck/lint clean.

Phase 2 — Form stations
- ClarifyStation (ghost example + progressive disclosure — spec P2), DecomposeStation, DesignStation (spec §7.1–7.3).
- Persist all answers to the Run; save/resume works across reload.
- Acceptance: answers survive reload; one section expands at a time (no blank wall).

Phase 3 — Build & Review (reuse existing engines)
- Build station: embed the MULTI-FILE workspace editor (workspace-execution) + /api/execute — codebase drop, not the DSA editor (spec §7.4).
- ReviewStation: call the existing feedback pipeline; render structured_feedback; on complete update mastery and mark Run completed (spec §7.5).
- Acceptance: a run can go Clarify→Review end to end and produce feedback + a completed Run.

Phase 4 — Port the first real lab (Palantir 911 Dispatch)
- Read labs/lab_01_911_dispatch from the ingredient repo.
- Map Clarify/Decompose/Design/Review content into the CaseLab definition (purpose lines, ghost examples, rubric).
- RESHAPE the Build step into a multi-file bugfix/add-functionality scenario (a partial 911-dispatch system with a real task), wired via buildScenarioId. Do NOT port starter.py as a blank single-file task.
- Acceptance: the 911 Dispatch lab is fully playable through all 5 milestones.

Phase 5 — AI spine + browse + polish (only after 0–4 are solid)
- Pass currentMilestone into /api/chat; map milestones → existing phases; milestone-aware interviewer reactions + company persona framing (spec §7, §8, P4/P6).
- /labs gallery (filter by company/skill; show progress); CaseLabIntro start screen + Practice/Onsite mode toggle.
- Handle empty/loading/error/unauthorized states everywhere; add analytics events.
- Acceptance: a user can browse to /labs, start the Palantir lab, and complete it with the AI engaged throughout.

DEFINITION OF DONE (v1):
- The Palantir 911 Dispatch Case Lab is fully playable: Clarify → Decompose → Design → Build (multi-file codebase drop) → Review, with the AI interviewer engaged across milestones and structured feedback at the end.
- pnpm typecheck, pnpm lint, and pnpm test pass.
- New surfaces handle loading/empty/error/unauthorized states.
- The graph is updated (graphify update .).
- Each phase was committed separately with a clear message.

Start by reading docs/case-labs/CASE_LABS.md in full and confirming you can read the ingredient repo. Then propose your Phase 0 file list and begin.
```

---

## Notes for you (the human)

- **Sequencing matters.** The prompt forces Phase 0-3 (the feature) before Phase 4 (porting the lab). If you let Claude port content first, it has nowhere to put it and will drift toward "copy the markdown."
- **The defaults are baked in** (dedicated `/labs` surface, soft gating, separate store) so the session doesn't stall on spec §13. Override them in your paste if you've changed your mind.
- **One lab first.** Per the research (Commitment 2), resist asking it to port all eight labs. Get 911 Dispatch excellent, then the rest are mechanical.
- **Next after v1:** the `curriculum_creator_playbook` generation engine (Commitment 3) — that's the real cost lever, and worth its own build session.
