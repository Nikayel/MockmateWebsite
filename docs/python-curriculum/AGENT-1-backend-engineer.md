# AGENT 1 — Backend "Loop Engineer"

> **You are an autonomous engineering agent. Your job is to ship the Python-curriculum scaffold and
> backend until it works end-to-end, then stop. You run in a loop: build → verify → fix → repeat
> until every item in the Definition of Done is green. Do not hand off until DoD passes.**

Read [`ARCHITECTURE.md`](./ARCHITECTURE.md) fully before writing any code. It is the source of truth
for every type, file path, and reuse seam referenced here.

## Mission

Build the framework that makes the **Teach → Apply → Practice** loop run for real:
- Content types + registry + curriculum shell.
- The one-line execution integration so tutorial exercises grade on the existing `/api/execute`.
- The Lesson Player UI (editor + run + results) and the level/module navigation.
- Firestore progress persistence (logged-in only) with an authed API and security rules.
- **Two real sample lessons** (one single-file L1, one workspace L3) wired end-to-end — these are
  your proof and become Agent 2's reference examples.

You do **not** author the ~44-lesson curriculum — that is Agent 2. You build the machine and prove it
with two lessons.

## Operating rules

- Follow `CLAUDE.md`: thin route handlers, no duplicated business logic, `unknown` over `any` at
  trust boundaries, Zod at input boundaries, handle loading/empty/error/unauthorized states.
- **Reuse, don't rebuild.** Mirror the Case Labs files named in ARCHITECTURE. If you find yourself
  writing a second execution path, a forked results panel, or copied streak math — stop and reuse.
- Keep each file cohesive. Match the conventions of the file you are mirroring.
- After each meaningful change, run the smallest useful check (typecheck the touched area), then
  broaden.

## Build order (smallest vertical slice first)

Ship in this order so you have a runnable proof as early as possible.

**Slice A — prove single-file grading works (the core loop):**
1. `lib/tutorials/types.ts` — enough for the single-file path (`PythonLesson`, `PythonExercise`,
   `TeachSection`, level/module types).
2. `lib/tutorials/curriculum/level1/index.ts` — ONE real single-file lesson (see "Sample lessons").
   `curriculum/index.ts` + `registry.ts` (`getExerciseById`, `getLesson`, `listLevels`).
3. `lib/tutorials/exercise-scenarios.ts` + the **1-line** edit at `app/api/execute/route.ts:334`.
4. `components/tutorials/ExerciseRunner.tsx` (adapt `BuildStation`) + reuse `TestResultsPanel`; a
   minimal `app/learn/python/[levelSlug]/[lessonId]/page.tsx` rendering Teach → Apply → Practice.
   → **Proof checkpoint:** a logged-in user can read the Teach text, write Python, click Run, and see
   real graded pass/fail from Piston. Verify with `/run` or the verify skill before continuing.

**Slice B — persistence:**
5. `lib/tutorials/types.ts` progress types; `lib/tutorials/progress.ts` (mirror `case-lab-runs.ts`);
   `app/api/tutorials/progress/route.ts` (`withAuth`, GET/GET-all/PUT); `firestore.rules` block;
   `lib/tutorials/progress-client.ts`; `lib/stores/tutorial-store.ts`; `useTutorialProgressSync`.
   → completion persists and resumes on reload; a doc appears in `user_tutorial_progress`.

**Slice C — navigation & gating:**
6. `app/learn/python/page.tsx` (level selector) + `[levelSlug]/page.tsx` (module list) +
   `components/tutorials/{LevelSelector,LevelCard,ModuleList,LessonRow,ProgressSidebar}.tsx`.
7. Auth hard-gate: middleware matcher entry for `/learn/python/:path*` + in-page `useAuth` redirect.

**Slice D — workspace path (real files):**
8. Add ONE workspace sample lesson at `lib/tutorials/curriculum/level3/index.ts` (port a Python
   runner from an existing `*-workspace.ts` scenario). Confirm `ExerciseRunner` renders file-tabs and
   `executeWorkspaceScenario` returns pass/fail through `/api/execute`.

**Slice E — shells, tests, docs:**
9. Empty `level2/index.ts` and `level4/index.ts` shells so the curriculum compiles.
10. Unit tests (see Testing). Confirm `pnpm typecheck && pnpm lint && pnpm test` clean.

## Definition of Done (the loop exit condition)

Keep iterating until ALL of these are true:

**Wiring**
- [ ] `app/learn/python` renders the 4-level selector; selecting a level lists its modules/lessons.
- [ ] The Lesson Player renders Teach (markdown), Apply, and Practice and runs code via `/api/execute`.
- [ ] Single-file AND workspace sample lessons both execute and grade correctly through Piston.
- [ ] Completing Practice persists progress; reloading the lesson resumes saved state.

**Types & quality**
- [ ] `pnpm typecheck` clean (no `any` at boundaries; `unknown` + narrowing/Zod for inputs).
- [ ] `pnpm lint` clean.
- [ ] No duplicated execution/validation/results logic; the only `/api/execute` change is the 1-line resolver.

**Grading correctness**
- [ ] Single-file: keyed `input` is passed to the named function; pass/fail matches expected; the
      `referenceSolution` actually passes its own tests.
- [ ] Workspace: visible AND hidden tests run; the runner's `__WORKSPACE_TEST_RESULTS__:` JSON maps to
      pass/fail rows; an all-green submission reports success.

**Edge cases handled**
- [ ] Signed-out access to `/learn/python/*` → redirect to `/login` (and `/api/execute` already 401s
      signed-out callers — confirm the UI surfaces "please sign in").
- [ ] Empty submission / no code → friendly validation, not a 500.
- [ ] Piston **service error** (busy/timeout/network) is shown as "try again", NOT counted as a wrong
      answer (the route already flags `serviceError`; ensure the UI distinguishes it).
- [ ] User **code error** (syntax/runtime) shows the traceback/message clearly.
- [ ] Hidden-test failure is reported without leaking hidden test source.
- [ ] Progress write failure degrades gracefully (best-effort autosave; never blocks the UI).
- [ ] Re-running an already-completed lesson does not corrupt or downgrade saved progress.

**Tests**
- [ ] `pnpm test` clean, including the new unit tests below.

## Iteration protocol

1. Implement the next unchecked slice/item.
2. Run the narrowest check that covers it (typecheck touched files → unit test → `pnpm dev` /verify).
3. If it fails, diagnose and fix in place; re-run. Repeat until green.
4. Re-run the full `pnpm typecheck && pnpm lint && pnpm test` before checking a DoD box.
5. When ALL DoD boxes are green, stop and report: what shipped, how you verified, and any
   fast-follows you deliberately deferred. Only escalate to a human if you are genuinely blocked
   (ambiguous product decision, missing capability) — otherwise keep looping.

This document is structured so it can be driven by `/loop` (re-run with "continue until DoD is green")
or an autonomous runner. Treat one failing check as "not done", not as "report and wait".

## Tests to write (CLAUDE.md §Testing — auth/scheduling-sensitive)

- `registry.test.ts` — id uniqueness across all lessons/exercises; `getLesson`/`getExerciseById`/
  `getNextLesson` resolution; unknown id → undefined.
- `exercise-scenarios.test.ts` — single-file exercise adapts to a `type:"dsa"` scenario with
  `testCases`; workspace exercise adapts to an object for which `isWorkspaceScenario` is true.
- `progress.test.ts` — `upsertLessonProgress` stamps timestamps and omits undefined; ownership is
  enforced (another user's doc is not returned/overwritten); `completedAt` set only when completed.

## Sample lessons you must build (proof + Agent 2 references)

1. **Single-file (L1)** — e.g. "Temperature conversion": Teach explains functions + arithmetic;
   `apply`/`practice` ask the learner to implement `def to_celsius(f): ...`; `testCases` like
   `{ input: { f: 212 }, expected: 100, description: "boiling" }`; include `referenceSolution`.
2. **Workspace (L3)** — a small multi-file task (e.g. "implement a `parse_config` module") with an
   editable primary file, a readonly helper, a visible test, a hidden test, and a Python
   `testRunnerPath` that prints `__WORKSPACE_TEST_RESULTS__:` JSON. Port the runner shape from
   `lib/scenarios/real-world/bugfix/bugfix-bookclub-reading-streak-workspace.ts`.

Both samples must run green in the Lesson Player. They are the canonical examples Agent 2 copies, so
make them clean and idiomatic.

## Verification (end-to-end)

- `pnpm typecheck && pnpm lint && pnpm test` all clean.
- `pnpm dev` → sign in → `/learn/python` → Level 1 → open the single-file sample → read Teach, solve
  Apply (see green), solve Practice → reload and confirm progress resumed; confirm a
  `user_tutorial_progress` doc exists.
- Open the L3 workspace sample → edit files → Run → confirm visible+hidden tests report via
  `/api/execute`.
- Sign out → visit `/learn/python/...` → confirm redirect to `/login`.
