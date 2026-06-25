# Case Labs — Build Progress Ledger

> Operational task tracker for the `/loop` build (see `BUILD_LOOP_PROMPT.md`).
> The loop reads this each iteration to find the next unchecked task, and checks items off as it ships them.
> Spec detail lives in `CASE_LABS.md` (§ references below). Keep notes terse.

**Status:** in progress
**Current phase:** Phase 1
**Last updated by loop:** Phase 0 complete — `case-lab-store.ts` shipped

---

## Phase 0 — Scaffolding & types (spec §9, §12)
- [x] `lib/labs/types.ts` — `CaseLab`, `CaseLabMilestone`, `MilestoneKind` (buildScenarioType = bugfix|add-functionality|system-design, never DSA)
- [x] Firestore `caseLabRuns` shape documented in `docs/FIREBASE_STRUCTURE.md`
- [x] `lib/stores/case-lab-store.ts` — milestone + answers state

## Phase 1 — Shell & milestone rail, no AI (spec §6, P1/P3)
- [ ] `MilestoneRail` (where-am-I / what's-next / why)
- [ ] `StationSwitcher` + stub stations
- [ ] 3-column layout reusing the `/interview` shell; center morphs per milestone
- [ ] Soft navigation between milestones

## Phase 2 — Form stations (spec §7.1–7.3, P2)
- [ ] `ClarifyStation` (ghost example + progressive disclosure)
- [ ] `DecomposeStation` (workflow / entities / state machine)
- [ ] `DesignStation` (API contract + tradeoff table)
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
