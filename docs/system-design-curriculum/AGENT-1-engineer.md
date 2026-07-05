# AGENT 1 — System-design course engineer ("ship the machinery")

> Part of the **[Learn System Design curriculum pack](./README.md)**. Connected files: [README](./README.md) · [ARCHITECTURE](./ARCHITECTURE.md) · [CURRICULUM-MAP](./CURRICULUM-MAP.md) · [curriculum-map.json](./curriculum-map.json) · [CONTENT](./CONTENT.md) · [RESEARCH](./RESEARCH.md) · [AGENT-1](./AGENT-1-engineer.md) · [AGENT-2](./AGENT-2-curriculum-developer.md)
> **You (AGENT 1) build the machinery from [`ARCHITECTURE.md`](./ARCHITECTURE.md).** When your Definition of Done is green and merged, [`AGENT-2`](./AGENT-2-curriculum-developer.md) authors the content from [`CONTENT.md`](./CONTENT.md).

The build-agent runbook: turn `docs/system-design-curriculum/ARCHITECTURE.md` into a working **Learn
System Design** feature on the existing Learn-Python/Learn-SQL machinery. Mirrors the SQL course's
`docs/sql-curriculum/AGENT-1-engineer.md`. Its job is the **engine + a thin vertical slice + wiring**
so the curriculum agent (AGENT 2) can then pour in all 208 lessons from
`docs/system-design-curriculum/CURRICULUM-MAP.md`. **Reuse, don't rebuild.**

The one genuinely new thing here is the **opposite** of the SQL course: there is **no code execution
and no test runner**. A lesson's graded core is a free-response *design answer* the learner writes,
saves, and self-compares against a revealed *model answer*. So the only new subsystem is
**answer persistence** (a small Firestore collection + API route + auth) plus the
`DesignAnswerPanel` that replaces the SQL/Python runner. The Read → Apply lesson spine, the
progress store, the routes/auth pattern, and the level-path projection are all reused.

New course id: **`"system-design"`**. Levels are numbered **L0–L11** (twelve levels), unlike Python
(1–4) and SQL (1–5), so a level-id widening is part of the wiring.

---

## Copy-paste prompt (paste into a fresh Claude Code session at the repo root)

```
You are the system-design-course engineer. Ship the "Learn System Design" feature by implementing
docs/system-design-curriculum/ARCHITECTURE.md on top of the existing Learn-Python / Learn-SQL
machinery. Read first, in order:
  1. docs/system-design-curriculum/ARCHITECTURE.md   (the plan — follow its build order)
  2. docs/system-design-curriculum/CURRICULUM-MAP.md  §"L0" (the exact content shape you must render:
     learnFocus, applyPrompt, thinkAbout[], modelAnswerOutline[] — no code, no tests)
  3. docs/sql-curriculum/AGENT-1-engineer.md          (the sibling runbook this mirrors)
  4. lib/tutorials/types.ts                           (the GENERIC TutorialLevel<E>/Module/Lesson spine
     and the concrete PythonExercise / SqlExercise you parallel with a new DesignExercise)
  5. lib/tutorials/progress.ts, lib/tutorials/progress-client.ts,
     app/api/tutorials/progress/route.ts             (the section-status persistence you REUSE, and the
     exact service/route/client shape you CLONE for the new design-answer store)
  6. components/tutorials/SqlLessonPlayer.tsx, SqlExerciseRunner.tsx, SectionDoneButton.tsx,
     TeachPanel.tsx, useTutorialProgressSync.ts       (the player + "Mark as done" pattern; the
     DesignAnswerPanel replaces the runner, and its "answer saved" gate replaces the runner's onPass)
  7. lib/tutorials/sql/registry.ts, app/learn/sql/* and proxy.ts  (registry + routes + auth to mirror)

NON-NEGOTIABLE CONSTRAINTS:
- Reuse, don't rebuild. NO execution engine, NO test runner, NO useExerciseRun, NO results marker.
  Grading does not exist here — an "answer" is free text the learner writes, saves, and self-checks
  against a revealed model answer. Do not import or fork any executor / sql-sandbox / python-sandbox.
- The ONLY new subsystem is design-answer persistence: one small Firestore collection, one service,
  one client wrapper, one API route. Clone the SHAPE of lib/tutorials/progress.ts +
  progress-client.ts + app/api/tutorials/progress/route.ts exactly (Zod input that omits server-owned
  fields, withAuth on the route, ownership check, omit-undefined before write, server-owned
  timestamps, best-effort client that no-ops when signed out).
- SECTION-STATUS progress is REUSED unchanged: same user_tutorial_progress collection, same
  useTutorialProgressSync, same tutorial store, same /api/tutorials/progress route — namespaced by
  the sd- lessonId prefix. Do NOT fork the progress store or its route. The design ANSWER text is a
  SEPARATE concern in a SEPARATE collection.
- Execution-free but still auth-gated: /learn/system-design is added to proxy.ts PROTECTED_ROUTES
  (progress + saved answers require a real user), plus LearnAuthGuard in the layout, exactly like SQL.
- Keep server/client boundaries identical to SQL: server-component Path/Level pages project via
  toLevelListModel (no answers/model-answers ship to the client on the list pages); the lesson page
  is the client player.

BUILD IN THIS ORDER, committing after each step (commit as the user, no Claude co-author, use
`git -c commit.gpgsign=false commit`):
  1. Types (lib/tutorials/types.ts): add CourseId "system-design"; widen TutorialLevelId to 0..11
     (leave PythonLevelId pinned 1-4, SqlLevel at 1-5) so L0 exists; make TutorialLevel's
     `defaultExecutionMode` OPTIONAL (design levels have no execution mode) rather than forcing a
     bogus value. Add DesignExercise { id; prompt; thinkAbout: string[]; modelAnswerOutline: string[];
     starterAnswer?: string } — NO executionMode / starterCode-grading / testCases. Add
     SystemDesignLevelSlug and the aliases DesignLesson = TutorialLesson<DesignExercise>,
     DesignModule, DesignLevel = TutorialLevel<DesignExercise>. Reuse TeachSection for the "Learn"
     read phase. Python/SQL call sites must not churn (verify a clean typecheck).
  2. Answer persistence: lib/tutorials/design-answers.ts (server, Admin SDK) — collection
     `user_design_answers`, doc id `${uid}__${exerciseId}`, a DesignAnswer { userId; exerciseId;
     lessonId; answer; updatedAt } shape, a Zod input schema that omits userId/timestamps,
     getDesignAnswer (ownership-checked), listUserDesignAnswers, upsertDesignAnswer (throws
     "UNAUTHORIZED" on foreign doc). lib/tutorials/design-answers-client.ts mirroring
     progress-client.ts (auth token, timeout, degrade to null/[] when signed out).
     app/api/tutorials/design-answers/route.ts with withAuth GET (?exerciseId → one, else all) and
     PUT (validate → upsert → 403 on UNAUTHORIZED). ALSO widen the levelId Zod union in progress.ts
     to accept 0..11 so L0 section-progress persists through the reused route.
  3. Registry + content skeleton: lib/tutorials/system-design/registry.ts over SYSTEM_DESIGN_LEVELS
     (parallel to sql/registry.ts: listSystemDesignLevels, getSystemDesignLevelBySlug,
     getSystemDesignLessonLocation, getNext...InLevel, getFirstLessonOfNext...Level,
     getDesignExerciseById). lib/tutorials/system-design/curriculum/ holding ONE proof lesson —
     sd-l0-clarify-scope (Module sd-l0-m1, level 0 "interview-method") authored verbatim from
     CURRICULUM-MAP.md §L0: teach markdown from learnFocus, apply DesignExercise from
     applyPrompt/thinkAbout/modelAnswerOutline.
  4. DesignAnswerPanel + SystemDesignLessonPlayer:
     - components/tutorials/DesignAnswerPanel.tsx: renders the prompt + a "Think about" checklist
       (thinkAbout), a textarea seeded from starterAnswer/the saved answer, a Save button that
       persists via design-answers-client (a non-empty saved answer flips an `onSaved` gate), and a
       "Reveal model answer" button that renders modelAnswerOutline as a bullet list (gated until an
       answer is saved, so the learner commits before comparing). No auto-grading.
     - components/tutorials/SystemDesignLessonPlayer.tsx forked from SqlLessonPlayer: teach (Learn) +
       apply (Design) sections only, REUSING useTutorialProgressSync, the tutorial store, TeachPanel,
       LessonHeader, LessonRail, SableTutor, and SectionDoneButton (its `passed` gate driven by
       "answer saved" instead of a runner's onPass). On mount, load the saved answer for the Apply
       exercise so a returning learner resumes their own text. Because the shared store keys
       lessonStatus off the `practice` section, complete the lesson when the Design (Apply) answer is
       marked done — the minimal adapter is to complete `apply` AND `practice` together in this player
       (system-design has one design write per lesson, not a separate practice). Note this deviation.
  5. Routes + auth: app/learn/system-design/{page.tsx, layout.tsx, [levelSlug]/page.tsx,
     [levelSlug]/[lessonId]/page.tsx} mirroring app/learn/sql/* (server Path + Level pages via
     toLevelListModel + LevelPathView with basePath="/learn/system-design"; client lesson page with
     key={lesson.id}); LearnAuthGuard in the layout; add "/learn/system-design" to proxy.ts
     PROTECTED_ROUTES. Tag writes with courseId "system-design" where the progress model carries it.
  6. Leave SYSTEM_DESIGN_LEVELS a skeleton with the single proof lesson; AGENT 2 authors the rest
     from CURRICULUM-MAP.md.

VERIFY and report: `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green; the REUSED
files show NO diff (SqlLessonPlayer.tsx, LessonPlayer.tsx, the tutorial store, useTutorialProgressSync,
and the /api/tutorials/progress route — you widened only the progress levelId Zod union, nothing else);
a manual `pnpm dev` run of the L0 proof lesson: Learn renders, the Design section accepts a written
answer, Save persists it (confirm a doc at user_design_answers/${uid}__sd-l0-clarify-scope-apply),
reloading the lesson resumes that text, "Reveal model answer" shows the modelAnswerOutline, "Mark as
done" completes the section, and progress persists to user_tutorial_progress/${uid}__sd-l0-clarify-scope
(lessonStatus completed). Python and SQL courses unregressed. Add unit tests for the design-answer
service (ownership check, omit-undefined, foreign-doc → UNAUTHORIZED) mirroring
lib/tutorials/__tests__/progress.test.ts.

STOP when the one proof lesson runs end-to-end (write → save → reveal → complete → persist) through
the reused progress pipeline and all four verification commands pass. Do not author the remaining
lessons — that is AGENT 2's job. If ARCHITECTURE.md and reality disagree on a file path or a type
(e.g. whether defaultExecutionMode is required, or the exact section→lesson-status mapping), trust
the code, fix the adapter minimally, and note the deviation in your final report.
```

---

## Definition of Done (what "shipped" means for this agent)
- `lib/tutorials/types.ts` carries `CourseId "system-design"`, `TutorialLevelId` widened to `0..11`,
  an optional `defaultExecutionMode`, a `DesignExercise` (prompt + `thinkAbout` + `modelAnswerOutline`,
  no execution/testing fields), and `DesignLesson`/`DesignModule`/`DesignLevel` aliases — with Python
  and SQL call sites unchanged (clean typecheck).
- Design-answer persistence exists as its OWN subsystem: `user_design_answers` collection,
  `lib/tutorials/design-answers.ts` (Zod input, ownership-checked, omit-undefined, server timestamps),
  `design-answers-client.ts` (best-effort, no-ops when signed out), and
  `app/api/tutorials/design-answers/route.ts` (`withAuth` GET/PUT, 403 on foreign doc).
- Section-status progress is **reused unchanged**: same `user_tutorial_progress` collection, same
  `useTutorialProgressSync`, same tutorial store, same `/api/tutorials/progress` route (only its
  `levelId` Zod union widened to accept 0). Progress persists to
  `user_tutorial_progress/${uid}__sd-l0-{slug}` with no new progress collection.
- `components/tutorials/DesignAnswerPanel.tsx` (write → Save → gated Reveal model answer) and
  `components/tutorials/SystemDesignLessonPlayer.tsx` (Learn + Design spine) drive the loop, reusing
  `SectionDoneButton`, `TeachPanel`, `SableTutor`, `LessonRail`, and `LessonHeader`.
- Parallel `system-design/registry.ts`; `app/learn/system-design/*` routes gated by `proxy.ts`
  PROTECTED_ROUTES + `LearnAuthGuard`; server list pages project via `toLevelListModel` so no model
  answers ship to the client.
- One L0 proof lesson (`sd-l0-clarify-scope`) runs end-to-end: **save answer → reveal model answer →
  section completes → progress persists** on reload.
- `pnpm typecheck && pnpm lint && pnpm test && pnpm build` green; `SqlLessonPlayer.tsx`, the tutorial
  store, `useTutorialProgressSync`, and the progress route show **no diff** (beyond the one-line
  `levelId` union widening).
- Hand-off note for AGENT 2: the finalized `DesignExercise` shape and the `user_design_answers`
  document shape (so authored lessons and any dashboard read the same contract).
