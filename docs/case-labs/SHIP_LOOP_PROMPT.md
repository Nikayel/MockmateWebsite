# Case Labs — Ship Loop (`/loop` file)

> Run this **after** the build loop writes "CASE LABS BUILD COMPLETE".
> Each iteration does one coherent shipping increment, verifies it, commits it (as you), updates the progress ledger, and stops when everything is live-ready.

---

## Setup (one time)

Make sure the build loop has fully completed — `docs/case-labs/BUILD_PROGRESS.md` should say "CASE LABS BUILD COMPLETE" before you start this loop.

Then open Claude Code in `MockmateWebsite` and start the loop:

```
/loop Read docs/case-labs/SHIP_LOOP_PROMPT.md and follow its "THE LOOP BODY" section — do exactly ONE committed increment this iteration, then stop.
```

---

## THE LOOP BODY

```
You are an autonomous ship loop making Case Labs production-ready in this repo (MockmateWebsite, CodeSparring).
This prompt runs repeatedly. Each run = ONE coherent, committed increment. Resume cleanly from where the last run left off.

EVERY ITERATION, DO THIS:
1. ORIENT (cheap): read docs/case-labs/SHIP_PROGRESS.md (the ledger) to find the first unchecked task. If it's missing, create it from the phase list below. Also skim recent `git log --oneline -15` to confirm state.
2. PICK the next single unchecked task. Do NOT batch.
3. IMPLEMENT it, matching nearby code conventions and CLAUDE.md. Reuse existing systems; do not reinvent.
4. VERIFY: run `pnpm typecheck` and `pnpm lint` (and `pnpm test` if logic changed). Fix until clean. If you changed code, run `graphify update .`.
5. COMMIT IMMEDIATELY (see COMMIT RULES). One commit per increment.
6. UPDATE the ledger: check off the task, add a one-line note. Commit the ledger update in the same commit as the work.
7. If ALL tasks are done and the Definition of Done is met: write "CASE LABS SHIP COMPLETE" in the ledger, do a final commit, END THE LOOP (do not schedule another wakeup), and tell the user the feature is live-ready. Otherwise, schedule the next iteration using ScheduleWakeup with delaySeconds=60.

COMMIT RULES (important — commits must look authored by the human, not an AI):
- Use the repo's existing local git identity. Do NOT pass --author. Do NOT change git config.
- Do NOT add "Co-Authored-By", "Generated with Claude", "Claude-Session", or any AI/model mention anywhere in the commit message.
- Write plain, conventional messages, e.g. "feat(case-labs): add pro paywall before Decompose station".
- Commit very frequently: one working change = one commit. Never leave more than ~20 minutes of work uncommitted.
- Do NOT push unless I tell you to. Never open a PR unless asked.

SOURCES OF TRUTH (read before coding; re-skim as needed):
- Spec: docs/case-labs/CASE_LABS.md
- Build output: the shipped Case Labs components in app/labs/, lib/labs/, lib/stores/case-lab-store.ts
- Project rules: CLAUDE.md (follow exactly)
- Ledger: docs/case-labs/SHIP_PROGRESS.md
- Entitlements: read lib/entitlements/ or lib/billing/ to find how Pro gating works in the existing codebase before writing new gates
- Nav: read app/layout.tsx or the main nav component before adding the nav item
- Analytics: read lib/analytics/ or existing track() calls to match naming convention before adding new events
- Firestore rules: read firestore.rules before editing

ARCHITECTURAL DECISIONS (locked — do not reopen):
- PRO GATING: Case Labs is Pro-only. Free users may complete Clarify (including AI chat) interactively, then hit an upgrade wall before Decompose. Match the existing upgrade-wall component and entitlement check pattern exactly.
- NAV: Add "Case Labs" to the main header nav. Follow the existing nav item pattern (icon, label, active state, route = /labs).
- ROLLOUT: No feature flag. Ship to all users.
- FIRESTORE RULES: users can read/write their own caseLabRuns (userId == request.auth.uid). Admins can read all. Match the existing rule style in firestore.rules.
- MOBILE: Desktop-first. Do not break mobile but do not add responsive redesign. Test at 375px that nothing overflows or is unclickable; fix any overflow/layout bugs found.
- HERO: Do NOT touch the landing page hero. That is out of scope for this loop.

PHASES (ship in order):

Phase S0 — Firestore rules:
- Add caseLabRuns read/write rules to firestore.rules (own-user read/write; admin read-all). Keep existing rule style.

Phase S1 — Pro gating:
- Read the existing entitlement/billing pattern (find how other features gate on Pro).
- Wrap the Decompose, Design, Build, and Review stations behind the entitlement check.
- Free users on Clarify: fully interactive including AI chat, no restrictions.
- When a free user tries to advance past Clarify: render the existing upgrade wall component (do not build a new one).
- Ensure the gate is server-checked, not just client-checked, if the existing pattern does that.

Phase S2 — Navigation:
- Add a "Case Labs" nav item to the main header/sidebar nav.
- Route: /labs. Icon: match the style of other nav items (look at what icon set is in use). Active state matching existing pattern.
- Do not change any other nav items.

Phase S3 — Analytics:
- Read existing track() / analytics calls in the codebase to find the naming convention (snake_case vs camelCase, prefixes, etc.).
- Instrument these events: lab_started (labId, mode), milestone_completed (labId, milestoneKind), lab_completed (labId, mode, durationMs), upgrade_wall_shown (source: "case_labs", milestone: milestoneKind).
- Fire events from the case-lab-store or station components — wherever the existing pattern fires events.
- Do not add events that already fire elsewhere (avoid duplicates).

Phase S4 — Mobile overflow check:
- Open each new Case Labs page/component and check for CSS overflow at narrow widths (375px).
- Fix any overflow, unclickable buttons, or illegible text — minimum viable fix only, not a redesign.
- Verify MilestoneRail, each Station, and the /labs gallery at narrow widths.

Phase S5 — Loading / empty / error / unauthorized hardening:
- /labs gallery: loading skeleton, empty state (no labs yet), error state (Firestore read failed).
- /labs/[id]: unauthorized state (not Pro, no active run), error state (lab not found).
- CaseLabIntro: loading state while the lab definition loads.
- All states must be user-readable — no raw error objects in UI.

Phase S6 — End-to-end smoke test & cleanup:
- Manually trace the happy path in a dev server: /labs gallery → pick Palantir 911 Dispatch → Intro → Clarify (with AI) → upgrade wall (free user) → (simulate Pro) Decompose → Design → Build → Review → structured feedback.
- Fix any broken wiring found.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test` to final green.
- Run `graphify update .`.

DEFINITION OF DONE (ship loop):
- [ ] Firestore rules updated and reviewed
- [ ] Pro gate: Clarify free, rest Pro-only, upgrade wall matches existing UX
- [ ] "Case Labs" in main nav, routes to /labs
- [ ] Analytics events fired matching existing naming convention
- [ ] No mobile overflow at 375px on any new surface
- [ ] Loading/empty/error/unauthorized states on all new surfaces
- [ ] pnpm typecheck, lint, test pass
- [ ] graphify updated
- [ ] E2E happy path tested in dev server

Begin this iteration now: orient via the ledger, pick the next task, implement, verify, commit, update the ledger.
```

---

## Notes for you (the human)

- **Run after the build loop finishes.** The build loop self-terminates with "CASE LABS BUILD COMPLETE" in `docs/case-labs/BUILD_PROGRESS.md`. Start this loop only after that.
- **Runs back-to-back.** Same as the build loop — no interval prefix, ~60s between iterations.
- **Self-terminates.** Writes "CASE LABS SHIP COMPLETE", stops scheduling, tells you the feature is live-ready.
- **Commits are yours.** No AI trailers — uses your laptop's git identity.
- **Hero is not touched.** Landing page hero changes are a separate task after this loop.
