# Case Labs — Build Loop (`/loop` file)

> This file is meant to be run with the **`/loop`** skill in a Claude Code session on your laptop.
> Each iteration, Claude does one coherent increment, verifies it, commits it (as you), updates the
> progress ledger, and stops the loop when the whole feature is done.

---

## Setup (one time)

```bash
# From inside MockmateWebsite — pull the ingredient repo in as a sibling dir:
git clone https://github.com/Nikayel/workbook-palantir-decomp.git ../workbook-palantir-decomp
```

Then open Claude Code in `MockmateWebsite` and start the loop (10-minute cadence; it auto-resumes
across iterations and will stop itself when done):

```
/loop 10m <paste THE LOOP BODY below>
```

> Authorship: the loop commits using your laptop's existing git identity. It is instructed **not** to add
> any "Co-Authored-By" / AI-attribution trailer and **not** to mention Claude in commit messages — so every
> commit is authored as **you**. (Optional: verify `git config user.name` / `user.email` are yours first.)

---

## THE LOOP BODY (paste this after `/loop 10m`)

```
You are an autonomous build loop shipping the "Case Labs" feature in this repo (MockmateWebsite, CodeSparring).
This prompt runs repeatedly. Each run = ONE coherent, committed increment. Resume cleanly from where the last run left off.

EVERY ITERATION, DO THIS:
1. ORIENT (cheap): read docs/case-labs/BUILD_PROGRESS.md (the ledger) to find the first unchecked task. If it's missing, create it from the phase list below. Also skim recent `git log --oneline -15` to confirm state. Use `graphify query "<question>"` / `graphify explain "<concept>"` to orient in code before reading raw files.
2. PICK the next single unchecked task (smallest meaningful increment — one type file, one component, one station, one wiring step). Do NOT batch multiple tasks.
3. IMPLEMENT it, matching nearby code conventions and CLAUDE.md. Reuse existing systems; do not reinvent.
4. VERIFY: run `pnpm typecheck` and `pnpm lint` (and `pnpm test` if logic changed). Fix until clean. If you changed code, run `graphify update .`.
5. COMMIT IMMEDIATELY (see COMMIT RULES). One commit per increment — commit very frequently.
6. UPDATE the ledger: check off the task, add a one-line note. Commit the ledger update too (can be same commit as the work).
7. If ALL phases are complete and the Definition of Done is met: write "CASE LABS BUILD COMPLETE" in the ledger, do a final commit, and END THE LOOP (do not schedule another iteration). Otherwise, end the turn — the next iteration continues.

COMMIT RULES (important — commits must look authored by the human, not an AI):
- Use the repo's existing local git identity. Do NOT pass --author. Do NOT change git config.
- Do NOT add "Co-Authored-By", "Generated with Claude", "Claude-Session", or any AI/model mention anywhere in the commit message.
- Write plain, conventional messages, e.g. "feat(case-labs): add CaseLab + milestone types", "feat(case-labs): milestone rail stepper".
- Commit very frequently: after every new file, working component, or passing test. Never leave more than ~20 minutes of work uncommitted. Prefer many small commits over few big ones.
- Do NOT push unless I tell you to (or push to the current feature branch only if that's already the workflow). Never open a PR unless asked.

SOURCES OF TRUTH (read before coding; re-skim as needed):
- Spec: docs/case-labs/CASE_LABS.md (architecture, milestones §7, data model §9, design principles §4, build checklist §12).
- Project rules: CLAUDE.md (follow exactly).
- Ledger: docs/case-labs/BUILD_PROGRESS.md (your task tracker — keep it current).
- Ingredient repo (read-only, content source): ../workbook-palantir-decomp. If you cannot read it, STOP and tell me — do not invent lab content.

THE CORE RULE — never "just copy" the ingredient repo:
- The feature is net-new engineering here; it is not in either repo.
- When porting a lab, the Build milestone MUST be a MULTI-FILE CODEBASE DROP (extend/fix a partial system using the existing bugfix/add-functionality + workspace-execution surface), NEVER a single-file from-scratch DSA task. Reshape the ingredient's starter.py accordingly (spec §1, §7.4).

REUSE (confirm real APIs before wiring): the /interview 3-column shell and _components; lib/scenarios/types.ts (BugFixScenario, AddFunctionalityScenario); workspace-execution + /api/execute; /api/chat + lib/interview phase engine; lib/feedback pipeline; lib/spaced-repetition; lib/stores/interview-store.ts; components/ui/*.

DEFAULTS for open spec decisions (§13) — don't stall on these: dedicated /labs surface reusing the interview shell; soft/open gating with Onsite as opt-in; separate case-lab-store. If a NEW ambiguity appears that these don't cover, make the smallest reasonable choice, note it in the ledger, and keep going.

PHASES (build in order; details in spec §12):
- Phase 0 — Scaffolding & types: lib/labs/types.ts (CaseLab, CaseLabMilestone, MilestoneKind; buildScenarioType is bugfix|add-functionality|system-design, never DSA); Firestore caseLabRuns shape documented in docs/FIREBASE_STRUCTURE.md; case-lab-store.ts.
- Phase 1 — Shell & milestone rail (no AI): MilestoneRail (where-am-I/what's-next/why, spec P3); StationSwitcher + stub stations; 3-column layout reusing /interview shell, center morphs per milestone; soft navigation.
- Phase 2 — Form stations: ClarifyStation (ghost example + progressive disclosure, P2), DecomposeStation, DesignStation (spec §7.1-7.3); persist answers to the Run; save/resume across reload.
- Phase 3 — Build & Review: Build station embeds the MULTI-FILE workspace editor + /api/execute (codebase drop, not DSA editor, §7.4); ReviewStation calls the existing feedback pipeline, renders structured_feedback, updates mastery, marks Run completed (§7.5).
- Phase 4 — Port Palantir 911 Dispatch: read ../workbook-palantir-decomp/labs/lab_01_911_dispatch; map Clarify/Decompose/Design/Review content into the CaseLab; RESHAPE the Build into a multi-file bugfix/add-functionality scenario wired via buildScenarioId (do NOT port starter.py as a blank single-file task). Lab fully playable through all 5 milestones.
- Phase 5 — AI spine + browse + polish (only after 0-4 solid): pass currentMilestone into /api/chat, map milestones->phases, milestone-aware reactions + company persona (§7,§8,P4/P6); /labs gallery (filter by company/skill, show progress); CaseLabIntro start screen + Practice/Onsite toggle; handle loading/empty/error/unauthorized states everywhere; analytics events.

DEFINITION OF DONE (v1): the Palantir 911 Dispatch Case Lab is fully playable Clarify->Decompose->Design->Build(multi-file codebase drop)->Review, AI engaged across milestones, structured feedback at the end; pnpm typecheck/lint/test pass; new surfaces handle loading/empty/error/unauthorized; graph updated; every increment was committed separately with clean human-authored messages.

Begin this iteration now: orient via the ledger, pick the next task, implement, verify, commit, update the ledger.
```

---

## Notes for you (the human)

- **It self-resumes.** State lives in `docs/case-labs/BUILD_PROGRESS.md` + git history, so each loop iteration knows where to pick up even if context was compacted.
- **It self-terminates.** When the Definition of Done is met, it writes "CASE LABS BUILD COMPLETE" and stops scheduling.
- **Commits are yours.** No AI trailers, no Claude mentions — they use your laptop's git identity. (Double-check `git config user.name`/`user.email` are you before starting.)
- **Watch the first iteration.** Make sure it reads the ingredient repo and starts Phase 0 (types), not Phase 4 (porting). If it drifts toward "copying," stop it and point it back at the core rule.
- **One lab first.** It's scoped to 911 Dispatch only. The other labs and the `curriculum_creator_playbook` engine are separate follow-on runs.
