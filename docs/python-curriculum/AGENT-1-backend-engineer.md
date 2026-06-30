# AGENT 1 — Backend "Loop Engineer" (run with `/loop`)

> **HOW TO RUN THIS.** This spec is a self-paced **loop runbook**. In Claude Code:
>
> ```
> /loop implement the Python curriculum backend by following docs/python-curriculum/AGENT-1-backend-engineer.md
> ```
>
> `/loop` (no interval → dynamic, self-paced mode) will re-enter this runbook each
> iteration. Every iteration does **one unit of work**, verifies it, commits, ticks the
> checklist below, and stops the loop only when the **Definition of Done** is fully green.
> Treat one failing check as "not done — keep looping", never as "report and wait".

---

## LOOP CONTRACT — do this every iteration

1. **Re-orient.** Read this file. Run `pnpm typecheck && pnpm lint && pnpm test` and
   `git log --oneline -5` to see the real current state. State is derived from the repo +
   the Build Checklist below, so the loop is safe to re-enter at any time.
2. **Pick the next item.** Take the FIRST unchecked box in the Build Checklist.
3. **Do only that item** — one small, cohesive change (follow ARCHITECTURE.md exactly).
4. **Verify.** Run the narrowest useful check, then `pnpm typecheck && pnpm lint && pnpm test`.
   If anything fails, fix it in this same iteration and re-run until green.
5. **Commit + record.** Commit and push to the feature branch
   `claude/interactive-python-tutorial-levels-m2f3cc`, then tick the checklist box in THIS
   file and commit that too (the file is the shared progress tracker).
6. **Decide continuation (the loop's control flow):**
   - Unchecked items remain → **continue looping** (next iteration).
   - All Definition-of-Done boxes green AND `typecheck && lint && test` clean →
     **STOP THE LOOP.** Report done. This is the terminal state.
   - Blocked on an ambiguous *product* decision → **STOP and ask the user** (do not guess).
7. **Idempotency.** Never redo a green item. Always recompute "what's next" from the repo so
   re-running an iteration is harmless.

### Terminal condition (when `/loop` ends)
Stop scheduling iterations the moment **every** Definition-of-Done box is checked and the full
`pnpm typecheck && pnpm lint && pnpm test` is clean. Final report: green DoD, files changed,
how the two sample lessons were verified, and the pushed commit hashes.

---

## Mission

Build the framework that makes the **Teach → Apply → Practice** loop run for real: content
types + registry + curriculum shell; the one-line `/api/execute` integration so tutorial
exercises grade on existing infra; the Lesson Player UI; Firestore progress (logged-in only)
with an authed API + rules; and **two real sample lessons** (single-file L1, workspace L3) as
proof. You do NOT author the ~44-lesson curriculum — that is Agent 2.

Read **ARCHITECTURE.md** fully before the first code change. Follow `CLAUDE.md` (thin route
handlers, no duplicated business logic, no `any` at boundaries, Zod at inputs, handle
loading/empty/error/unauthorized states). Reuse, don't rebuild — mirror the Case Labs files.

---

## BUILD CHECKLIST (the loop walks this top-to-bottom)

Each box is roughly one iteration. Tick boxes as you complete + verify them.

**Slice A — prove single-file grading (the core loop)**
- [ ] `lib/tutorials/types.ts` — content tree + exercise + progress types (single-file path first).
- [ ] One real single-file sample lesson in `lib/tutorials/curriculum/level1/index.ts` + `curriculum/index.ts` + `registry.ts` (incl. `getExerciseById`).
- [ ] `lib/tutorials/exercise-scenarios.ts` + the 1-line resolver edit in `app/api/execute/route.ts`.
- [ ] `components/tutorials/ExerciseRunner.tsx` (adapt `BuildStation`) + a minimal `app/learn/python/[levelSlug]/[lessonId]/page.tsx` rendering Teach → Apply → Practice. **Proof checkpoint:** a logged-in user reads, writes Python, runs, and sees real graded results.

**Slice B — persistence**
- [ ] Progress types; `lib/tutorials/progress.ts` (mirror `case-lab-runs.ts`, doc id `${uid}__${lessonId}`).
- [ ] `app/api/tutorials/progress/route.ts` (`verifyAuth`, GET one / GET all / PUT) + `firestore.rules` block (mirror `caseLabRuns`).
- [ ] `lib/tutorials/progress-client.ts`, `lib/stores/tutorial-store.ts`, `components/tutorials/useTutorialProgressSync.ts` → completion persists + resumes.

**Slice C — navigation & gating**
- [ ] `app/learn/python/page.tsx` (level selector) + `[levelSlug]/page.tsx` (module list) + `components/tutorials/{LevelSelector,LevelCard,ModuleList,LessonRow,ProgressSidebar}.tsx`.
- [ ] Auth hard-gate: add `/learn/python` to `PROTECTED_ROUTES` in `proxy.ts` + in-page `useAuth` redirect to `/login`.

**Slice D — workspace path (real files)**
- [ ] One workspace sample lesson in `lib/tutorials/curriculum/level3/index.ts` (port a Python `__WORKSPACE_TEST_RESULTS__` runner) + confirm `ExerciseRunner` file-tabs + `executeWorkspaceScenario` run green via `/api/execute`.

**Slice E — shells, tests, docs**
- [ ] Empty `level2/index.ts` + `level4/index.ts` shells so the curriculum compiles.
- [ ] `registry.test.ts`, `exercise-scenarios.test.ts`, `progress.test.ts` (vitest).

---

## DEFINITION OF DONE (the loop's exit gate)

**Wiring** — [ ] level selector renders 4 levels; [ ] selecting a level lists modules/lessons;
[ ] Lesson Player runs Teach/Apply/Practice via `/api/execute`; [ ] single-file AND workspace
samples grade correctly; [ ] completing Practice persists + reload resumes.

**Types & quality** — [ ] `pnpm typecheck` clean; [ ] `pnpm lint` clean; [ ] only the 1-line
change to `app/api/execute/route.ts`; no duplicated execution/validation/results logic.

**Grading correctness** — [ ] single-file passes keyed `input` to the named function and the
`referenceSolution` passes its own tests; [ ] workspace runs visible AND hidden tests and maps
`__WORKSPACE_TEST_RESULTS__` to pass/fail rows.

**Edge cases** — [ ] signed-out `/learn/python/*` → `/login`; [ ] empty submission → friendly
validation, not 500; [ ] Piston **service error** shown as "try again", not a wrong answer;
[ ] user **code error** shows the traceback; [ ] hidden-test failure reported without leaking
hidden source; [ ] progress write failure degrades gracefully; [ ] re-running a completed lesson
doesn't corrupt progress.

**Tests** — [ ] `pnpm test` clean incl. the 3 new suites.

---

## Git rules (every iteration)
- Work only on `claude/interactive-python-tutorial-levels-m2f3cc`. Commit incrementally; push to
  that branch (retry 4x with backoff). DO NOT push to `main`. DO NOT open a PR.
- Commit trailers (and never mention model identity anywhere):
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
  `Claude-Session: https://claude.ai/code/session_01UpM3oBzVLsUZKSZ3B8doSt`

## Sample lessons you must build (proof + Agent 2 references)
1. **Single-file (L1)** — e.g. `to_celsius(f)` / `to_fahrenheit(c)`: keyed `input` like
   `{ input: { f: 212 }, expected: 100 }`, a passing `referenceSolution`. (The graded function is
   the FIRST `def`; avoid param names like `head/root/node` that auto-coerce to ListNode/TreeNode.)
2. **Workspace (L3)** — a small multi-file task (e.g. `parse_config`) with an editable primary
   file, a readonly helper, a visible test, a hidden test, and a Python `testRunnerPath` that
   prints `__WORKSPACE_TEST_RESULTS__:` JSON. Port the runner shape from
   `lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace.ts`.

## Verification (end-to-end, before declaring the loop done)
- `pnpm typecheck && pnpm lint && pnpm test` all clean.
- `pnpm dev` → sign in → `/learn/python` → Level 1 → single-file sample → read, solve Apply
  (green), solve Practice → reload resumes; a `user_tutorial_progress` doc exists.
- L3 workspace sample → edit files → Run → visible+hidden tests report via `/api/execute`.
- Signed out → `/learn/python/...` → redirect to `/login`.
