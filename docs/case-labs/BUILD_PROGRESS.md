# Case Labs — Build Progress Ledger

> Operational task tracker for the `/loop` build (see `BUILD_LOOP_PROMPT.md`).
> The loop reads this each iteration to find the next unchecked task, and checks items off as it ships them.
> Spec detail lives in `CASE_LABS.md` (§ references below). Keep notes terse.

**Status:** in progress
**Current phase:** Phase 2
**Last updated by loop:** Phase 2 — `DesignStation` shipped

---

## Phase 0 — Scaffolding & types (spec §9, §12)
- [x] `lib/labs/types.ts` — `CaseLab`, `CaseLabMilestone`, `MilestoneKind` (buildScenarioType = bugfix|add-functionality|system-design, never DSA)
- [x] Firestore `caseLabRuns` shape documented in `docs/FIREBASE_STRUCTURE.md`
- [x] `lib/stores/case-lab-store.ts` — milestone + answers state

## Phase 1 — Shell & milestone rail, no AI (spec §6, P1/P3)
- [x] `MilestoneRail` (where-am-I / what's-next / why)
- [x] `StationSwitcher` + stub stations
- [x] 3-column layout reusing the `/interview` shell; center morphs per milestone
- [x] Soft navigation between milestones

## Phase 2 — Form stations (spec §7.1–7.3, P2)
- [x] `ClarifyStation` (ghost example + progressive disclosure)
- [x] `DecomposeStation` (workflow / entities / state machine)
- [x] `DesignStation` (API contract + tradeoff table)
- [ ] Answers persist to the Run; save/resume across reload

## Phase 3 — Build & Review (spec §7.4–7.5)
- [ ] Build station embeds multi-file workspace editor + `/api/execute` (codebase drop, NOT DSA editor)
- [ ] `ReviewStation` → existing feedback pipeline → render `structured_feedback`
- [ ] On complete: update mastery + mark Run `completed`

## Phase 4 — Port Palantir 911 Dispatch (spec §1, §7.4; ingredient: ../workbook-palantir-decomp/labs/lab_01_911_dispatch)
- [ ] Map Clarify/Decompose/Design/Review content into the `CaseLab` definition
- [ ] RESHAPE Build into a multi-file bugfix/add-functionality scenario (no blank single-file starter)
- [ ] Lab fully playable through all 5 milestones

## Phase 5 — AI spine + browse + polish (spec §7, §8; only after 0–4 solid)
- [ ] Pass `currentMilestone` into `/api/chat`; map milestones → phases; milestone-aware reactions + company persona
- [ ] `/labs` gallery (filter by company/skill; show progress)
- [ ] `CaseLabIntro` start screen + Practice/Onsite mode toggle
- [ ] Loading / empty / error / unauthorized states on all new surfaces
- [ ] Analytics events (lab started, milestone completed, lab completed, mode used)

---

## Definition of Done (v1)
- [ ] 911 Dispatch lab fully playable: Clarify → Decompose → Design → Build (multi-file codebase drop) → Review
- [ ] AI interviewer engaged across milestones; structured feedback at the end
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` pass
- [ ] New surfaces handle loading/empty/error/unauthorized
- [ ] `graphify update .` run; graph current

---

## Decision log (loop appends new choices here)
- `lib/labs/types.ts` is the single home for all Case Labs domain types (lab definition + milestone answers + `CaseLabRun`). The Firestore-shape task (next) documents the same `CaseLabRun` in `FIREBASE_STRUCTURE.md`; the store imports these types rather than redefining them.

## Iteration notes (loop appends one line per increment)
- Phase 0: `lib/labs/types.ts` — full Case Labs type module (CaseLab/CaseLabMilestone/MilestoneKind, per-milestone answer shapes, resumable `CaseLabRun`). Reuses `DifficultyLevel`, `WorkspaceScenarioLanguage`, and `InterviewSession.structured_feedback` to stay DRY. typecheck + lint clean.
- Phase 0: documented `caseLabRuns` collection in `docs/FIREBASE_STRUCTURE.md` (annotated shape mirroring `CaseLabRun`, noted as the source-of-truth contract to keep in sync). Docs-only, no code change.
- Phase 0 (complete): `lib/stores/case-lab-store.ts` — zustand store (devtools, no persist → Run loads fresh from Firebase like roadmap-store to avoid cross-user leaks). Soft navigation, per-milestone answer setters, progress/complete helpers, `MILESTONE_ORDER`, selector hooks. Firebase save/resume wiring deferred to a later phase. typecheck + lint clean; graph updated.
- Phase 1: `components/labs/MilestoneRail.tsx` — vertical stepper on `progress` + `collapsible`, reads the store, soft navigation via `goToMilestone`. P3 baked in (active highlight, ✓ done markers, "Next: …" label, per-row purpose line). Falls back to default milestone labels when no lab is loaded; collapsible on small screens, always-open on lg. typecheck + lint clean; graph updated.
- Phase 1: `components/labs/StationSwitcher.tsx` — center column that morphs per `currentMilestone` (P2), with a stub station + empty state ("start a lab to begin"). Extracted shared `lib/labs/milestones.ts` (`DEFAULT_MILESTONE_META`) so the rail and switcher share one source of milestone copy (DRY); rail now imports it. Real stations replace stubs in Phases 2–3. typecheck + lint clean; graph updated.
- Phase 1: `components/labs/CaseLabShell.tsx` — 3-column layout reusing the `/interview` grid (`lg:grid-cols-[320px_minmax(0,1fr)_240px]` …): rail | StationSwitcher | chat. Right column takes a `chatSlot` prop (defaults to a placeholder) so Phase 5 drops in the real `InterviewerChat` without changing the shell. typecheck + lint clean; graph updated.
- Phase 1 (complete): soft navigation — added `goToNextMilestone`/`goToPreviousMilestone` to the store (clamped via `MILESTONE_ORDER`) and `components/labs/MilestoneNav.tsx` (Back/Next, disabled at ends), wired as the StationSwitcher footer. No hard gating (P1). typecheck + lint clean; graph updated.
- Phase 2: `components/labs/stations/ClarifyStation.tsx` — 5 guided dimensions (Question + Assumption each) as progressive-disclosure collapsibles (one open at a time); first row shows a ghost example as placeholder (P2, no blank wall); per-dimension answered dot; persists to the run via `setClarify`; soft "3+ recommended" hint. Wired into `StationSwitcher` (clarify → real station, rest → stub). typecheck + lint clean; graph updated.
- Phase 2: `components/labs/stations/DecomposeStation.tsx` — three progressive-disclosure panels (legacy workflow ordered steps, core entities name+role, state machine with states + from/on/to transitions), add/remove rows, persists to the run via `setDecompose` (state machine omitted until non-empty). Wired into `StationSwitcher`. typecheck + lint clean; graph updated.
- Phase 2: `components/labs/stations/DesignStation.tsx` — API contract (named endpoint + input/output `{name,type}` field lists), tradeoff table (Decision/Option A/Option B/Choice/Why per row), and a ranking/fallback textarea; persists via `setDesign`. Extracted shared `station-kit.tsx` (`CollapsiblePanel`, `RemoveRowButton`) and refactored DecomposeStation onto it (DRY). Wired into `StationSwitcher`. typecheck + lint clean; graph updated.
