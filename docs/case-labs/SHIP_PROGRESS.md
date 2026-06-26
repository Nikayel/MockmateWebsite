# Case Labs — Ship Progress Ledger

> Operational task tracker for the ship `/loop` (see `SHIP_LOOP_PROMPT.md`).
> The loop reads this each iteration to find the next unchecked task.
> Start this loop only after `BUILD_PROGRESS.md` says "CASE LABS BUILD COMPLETE".

**Status:** not started
**Current phase:** Phase S0
**Last updated by loop:** —

---

## Phase S0 — Firestore rules
- [ ] Add `caseLabRuns` read/write rules (own-user read/write; admin read-all) to `firestore.rules`

## Phase S1 — Pro gating
- [ ] Read existing entitlement/billing pattern (find how other features gate on Pro)
- [ ] Wrap Decompose, Design, Build, Review stations behind Pro entitlement check
- [ ] Free users: Clarify fully interactive (including AI), no restriction
- [ ] Free users advancing past Clarify: render existing upgrade wall component
- [ ] Confirm gate is consistent with existing server-side check pattern

## Phase S2 — Navigation
- [ ] Add "Case Labs" nav item to main header/sidebar nav (route: /labs, icon matches existing set, active state correct)

## Phase S3 — Analytics
- [ ] Read existing track() / analytics calls to identify naming convention
- [ ] `lab_started` event (labId, mode)
- [ ] `milestone_completed` event (labId, milestoneKind)
- [ ] `lab_completed` event (labId, mode, durationMs)
- [ ] `upgrade_wall_shown` event (source: "case_labs", milestone: milestoneKind)

## Phase S4 — Mobile overflow check
- [ ] MilestoneRail at 375px — no overflow or unclickable elements
- [ ] Each Station (Clarify/Decompose/Design/Build/Review) at 375px
- [ ] /labs gallery at 375px
- [ ] Fix any overflow/layout bugs found (minimum viable, not a redesign)

## Phase S5 — Loading / empty / error / unauthorized states
- [ ] /labs gallery: loading skeleton, empty state, error state
- [ ] /labs/[id]: unauthorized state, error state (lab not found)
- [ ] CaseLabIntro: loading state while lab definition loads
- [ ] All states render user-readable messages (no raw error objects)

## Phase S6 — End-to-end smoke test & cleanup
- [ ] Happy-path smoke: /labs → pick 911 Dispatch → Intro → Clarify (AI) → upgrade wall → (Pro) Decompose → Design → Build → Review → feedback
- [ ] Fix any wiring issues found
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `graphify update .` run

---

## Definition of Done

- [ ] Firestore rules updated
- [ ] Pro gate: Clarify free, rest Pro-only, upgrade wall matches existing UX
- [ ] "Case Labs" in main nav
- [ ] Analytics events fired matching naming convention
- [ ] No mobile overflow at 375px on new surfaces
- [ ] Loading/empty/error/unauthorized states on all new surfaces
- [ ] pnpm typecheck, lint, test pass
- [ ] graphify updated
- [ ] E2E happy path verified in dev

---

## Decision log
- Pro gating: Clarify milestone fully interactive (including AI) for free users; upgrade wall before Decompose
- Hero: out of scope for ship loop
- Rollout: no feature flag, ship to all users
- Mobile: desktop-first, fix overflows only, no responsive redesign
- Nav: add to main header nav at /labs

## Iteration notes (loop appends one line per increment)
- _(none yet)_
