# Data Engineering Course — Restructure & Expansion Plan

**Status: BINDING for the restructure + authoring waves. 2026-08-02.**

## Shipped so far

| Piece | State |
| --- | --- |
| Course restructure (id, routes, 308s, sections, branding) | shipped |
| `RESEARCH.md`, `CURRICULUM-MAP.md` | shipped |
| L7 Warehouses, Lakehouse & Dimensional Modeling (13 lessons) | shipped |
| L8 Batch Pipelines & Orchestration (13 lessons) | shipped |
| L9 Streaming & Change Data Capture (12 lessons) | shipped |
| L10 Distributed Compute & Data Operations | in progress |
| L11 Data Engineering for AI | queued |

The course is at **102 lessons** with L7 to L9 registered (77 SQL + 25 new), heading for ~141.

### What the reviewer waves keep catching

Worth knowing before authoring the remaining levels, because it recurs in every single module:

1. **Exercises a wrong answer still passes.** By far the most common defect. The verifier proves the
   reference reproduces the expected set; it cannot prove a *different* query fails. Every module
   needed seed rows added so each graded predicate is load-bearing (a partition the raw table can no
   longer reproduce, a key the change batch never mentions, a row exactly on the window boundary).
   Authors should write the adversarial cases themselves, not wait for review.
2. **Confidently-stated wrong vendor facts**, usually in the lesson whose whole job is that vendor
   (a misdefined Debezium tombstone, dbt's default materialization, BigQuery syntax that does not
   exist). Anything not in `RESEARCH.md` needs checking before it ships.
3. **Duplication with SQL L4/L5**, which already teach upsert mechanics, the watermark control
   table, and write-audit-publish. New levels cite them and grade what they leave out.

The "Learn SQL" course becomes the **Data Engineering** course. SQL stays as a section of it,
and the course grows a hands-on Data Engineering arc (cloud, warehouses/lakehouse, pipelines,
streaming, quality/cost, data for AI) to 100+ lessons. Everything stays browser-executable
(sql.js), graded, and interview-prep focused.

Companion docs in this folder:

- `RESEARCH.md` — the 2026 research brief (cloud/AWS, AI-era DE, pipelines, interview signal,
  pedagogy). Authored by a multi-lens research pass; the curriculum map cites it.
- `CURRICULUM-MAP.md` — the lesson-by-lesson map for the new levels. Binding for authoring
  agents; every lesson lists its module, seeds, exercise device, and interview rationale.

## 1. What exists today (verified against the code, 2026-08-02)

- Course ids: `CourseId = "python" | "sql" | "system-design"` (`lib/tutorials/types.ts:24`);
  ordered list `COURSE_IDS` (`lib/tutorials/course-catalog.ts:24`); the only id→registry switch
  is `listCourseLevels` (`course-catalog.ts:45`).
- URL + label authority: `lib/tutorials/lesson-routes.ts` (`LEARN_BASE_PATH`,
  `LEARN_COURSE_LABEL`, path builders). Client-safe, registry-free.
- SQL course: 6 levels, 77 lessons, `lib/tutorials/sql/curriculum/level{1..6}.ts`, registered in
  `curriculum/index.ts` (`SQL_LEVELS`), read by `sql/registry.ts`.
- Level 6 (`cloud-data-foundations`) already proves the device this plan scales: module-scoped
  seed constants simulate platform metadata (S3 inventory, Glue catalog, Parquet stats,
  partition catalog, Spark task metrics, pipeline run log) and every exercise is an ordinary
  graded single-file SQL query over that catalog.
- Progress is keyed by **lesson id**, not course id (`user_tutorial_progress/${uid}__${lessonId}`,
  `lib/tutorials/progress.ts`). `courseId` on progress/telemetry rows is derived from the lesson-id
  prefix in exactly two places: `progress.ts:26` and `item-responses.ts:104`.
- There is **no redirect infrastructure** (`next.config.mjs` has no `redirects()`), and the public
  lesson pages are statically generated with `dynamicParams = false` — an un-redirected URL change
  hard-404s every indexed page.
- `TutorialLevelId` spans 0..11 (`types.ts:35`) with a matching hand-written `z.union` in
  `progress.ts:43` — level ids 7-11 are free without widening anything.

## 2. Restructure decisions (the forced moves)

### D1. Course id renames to `data-engineering`; lesson ids are FROZEN

- `CourseId` member `"sql"` → `"data-engineering"` — every `Record<CourseId, …>` map
  (`lesson-routes.ts`, `learn-tracks.tsx`, `app/learn/page.tsx` COURSE_PITCH,
  `components/footer.tsx`) is a deliberate compile tripwire; `pnpm typecheck` enumerates the
  edit list.
- **Lesson ids keep the `sql-` prefix forever** (`sql-l1-*` … `sql-l6-*`). Renaming them would
  strand every `user_tutorial_progress` and `learn_item_responses` row with no migration path.
- New DE lessons (levels 7+) use the **`de-` prefix** (`de-l7-warehouse-loading`, …). Both
  prefix-inference functions (`progress.ts:26`, `item-responses.ts:104`) map
  `sql-` OR `de-` → `"data-engineering"`; `sd-` and the python fallback are untouched.
- Analytics reads tolerate the legacy stored tag: anywhere a stored `courseId`/`course_id`
  string is compared, `"sql"` is treated as `"data-engineering"` (read-time mapping, no
  backfill). Currently that is `learn-analytics.ts` only.

### D2. URLs move to `/learn/data-engineering` with 308s from `/learn/sql`

- `LEARN_BASE_PATH["data-engineering"] = "/learn/data-engineering"`,
  `LEARN_COURSE_LABEL["data-engineering"] = "Data Engineering"`.
- `git mv app/learn/sql app/learn/data-engineering`; update the per-route `COURSE_ID` literals
  (5 files inside the tree).
- Add `async redirects()` to `next.config.mjs`: `/learn/sql/:path*` → `/learn/data-engineering/:path*`
  (permanent) plus the bare `/learn/sql` → `/learn/data-engineering`. This is the FIRST redirect in
  the config; keep it minimal.
- Hardcoded `/learn/sql` links to update: `lib/labs/case-labs/palantir-911-dispatch.ts`,
  `app/codesparring-vs-leetcode/page.tsx`, `app/free-ai-coding-interview/page.tsx` (grep before
  the burst; the redirect makes stragglers safe but links should be canonical).

### D3. New levels are new files in the SAME registry (SqlExercise payload)

- Levels 7-11 live at `lib/tutorials/sql/curriculum/level{7..11}.ts`, exported and pushed into
  `SQL_LEVELS`. The directory keeps its `sql/` name (it is the data-engineering course's
  curriculum dir; renaming the dir buys nothing and risks the concurrent workstream).
- Exercise payload stays `SqlExercise`. The DE arc is taught through the L6 device (graded SQL
  over simulated platform metadata) plus `SqlWorkspaceGrading` script exercises — `checkIdempotency`
  exists already and is *the* grading device for pipeline lessons (run the learner's script twice,
  assert stable results).
- `DesignExercise` (free-response) is NOT wired into this course in v1: `SqlLessonPlayer` types
  `lesson: SqlLesson`, and the design-answers API allowlists only `sd-` ids. Where a lesson wants
  a "design this pipeline" moment, it goes in `teach` markdown + a `check` widget, not a new
  engine. (Future work, recorded, not planned.)
- Level ids 7-11 fit the existing `TutorialLevelId` 0..11 ceiling. **Do not exceed 11** without
  widening `types.ts:35` + `progress.ts:43` in lockstep.

### D4. "SQL is a section": named section grouping over levels

The course's levels are grouped into named sections on the track landing page and level
selector. Grouping is data: a `DE_SECTIONS` constant (section title + level ids) that lives
beside the curriculum index, consumed by `app/learn/data-engineering/page.tsx` and the level
selector. No progress or routing semantics change — sections are presentation.

| Section | Levels |
| --- | --- |
| SQL | L1 foundations, L2 aggregation, L3 modeling, L4 engineering, L5 advanced-company-sql |
| Cloud & Data Platforms | L6 cloud-data-foundations, L7 (warehouse & lakehouse) |
| Pipelines & Reliability | L8 (batch pipelines & orchestration), L9 (streaming & CDC) |
| Data Engineering in the AI Era | L10 (quality, governance & cost), L11 (data for AI) |

(Names for L7-L11 are finalized in `CURRICULUM-MAP.md` once research lands.)

### D5. Sequencing around the concurrent workstream

A parallel session is actively editing shared Learn files (header, footer, `app/learn/page.tsx`,
sitemap, JsonLd, players) with ~2k uncommitted lines. Therefore:

1. **Content first** (zero-conflict): docs, then new level files + the 22-line
   `curriculum/index.ts` registration, committed per module with precise pathspecs.
2. **Rename burst last**: wait for the concurrent session's edits to land in a commit, pull,
   then do D1+D2+D4 in one focused burst and commit immediately.
3. Every commit: check `git log`/`git status` first (a parallel committer sweeps files), commit
   with `-c commit.gpgsign=false`, pathspec-scoped, as the user (no co-author).

## 3. Authoring pipeline (writer → reviewer, per module)

Every new module ships through a three-stage agent pipeline:

1. **Writer** authors the module's lessons against `CURRICULUM-MAP.md` + the L6 house style.
2. **Reviewer** reviews the authored file for: technical accuracy against `RESEARCH.md`;
   expected-set integrity (reference SELECT reproduces `expected` via sql.js); prompt standards
   (deliverable-first, no em dashes — `prompt-standards.test.ts` enforces); seed realism
   (column names mirror the real AWS artifact); difficulty ramp; interview-nuance callouts.
3. **Fixer** applies the reviewer's findings; the module's tests must pass before commit.

Verification gate per module (the same gates L6 shipped under):

```bash
pnpm vitest run lib/tutorials/sql/__tests__ lib/tutorials/__tests__ app/learn/__tests__
pnpm typecheck
```

`single-file-reference-solutions.test.ts` re-derives every `expected` from the reference
solution through the real sql.js WASM — expected sets are still GENERATED (scratchpad
harness), never hand-typed.

## 4. Content rules (unchanged, binding)

- Every Apply/Practice/Drill prompt leads with the deliverable ("Write a query that returns…").
- No em dashes in learner-facing prose.
- Every lesson: `teach` (with `demoSeedSql` + live demo where possible, `csdiagram` where a
  mechanism benefits), graded `apply`, graded `practice`, optional `extraPractice` drills.
- Seeds are named after the real artifact they simulate (`s3_inventory`, `glue_catalog`,
  `pipeline_runs`) so the learner recognizes the real thing later.
- Each lesson closes teach with an "On a real platform this differs" note and an
  "Interview nuance" callout where transferable.
