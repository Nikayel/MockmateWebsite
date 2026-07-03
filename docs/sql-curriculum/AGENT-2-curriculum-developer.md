# AGENT 2 — SQL curriculum developer (run with `/loop`)

The content-author runbook: turn `docs/sql-curriculum/CONTENT.md` into real `SqlLesson` objects in
`lib/tutorials/sql/curriculum/levelN/`, one lesson per iteration, verified green. Mirrors the Python
course's `AGENT-2-curriculum-developer.md`. **Start only after AGENT 1's Definition of Done is green
and merged** (the sql.js runner + `SqlExercise` type + registry + one L1 & one L3 proof lesson exist).

---

## How to run it

```
/loop author the next SQL lesson by following docs/sql-curriculum/AGENT-2-curriculum-developer.md
```

`/loop` (no interval → dynamic, self-paced) re-enters this runbook each iteration. Each iteration
authors **one lesson** (the next unwritten one in `CONTENT.md`), verifies it runs green on the sql.js
runner, commits, and stops the loop only when **every lesson in CONTENT.md is authored and green**.

---

## Copy-paste prompt (alternative to `/loop`, for a single fresh session)

```
You are the SQL curriculum author. Author the "Learn SQL & Databases" lessons from
docs/sql-curriculum/CONTENT.md into code, working Level 1 → Level 4, top to bottom. Read first:
  1. docs/sql-curriculum/CONTENT.md         (the authored content — your source of truth per lesson)
  2. docs/sql-curriculum/SPEC.md §1,§3,§4    (the SqlExercise schema + both grading contracts)
  3. lib/tutorials/sql/curriculum/level*/index.ts   (AGENT 1's proof lessons — copy their shape)
  4. lib/tutorials/sql/registry.ts + the SQL_LEVELS assembly

LOOP CONTRACT — each iteration:
  1. Re-orient: read this file + SPEC §1/§3/§4 + the CONTENT.md section for the lesson you're on. The
     set of already-authored lesson ids in lib/tutorials/sql/curriculum/* IS the progress tracker.
  2. Pick the next lesson: the first CONTENT.md lesson (in level→module→lesson order) not yet present
     in the curriculum files. Author L1→L4 so earlier topics/seed tables exist before later ones use them.
  3. Author ONE SqlLesson: teach.markdown (+ optional demoCode), the guided `apply`, and the combined
     `practice`, against the SPEC §1 schema. Ids: lesson sql-l{N}-{slug}, exercises -apply / -practice
     (globally unique — the registry test enforces it).
  4. Grading contract:
       - L1/L2 (single-query): singleFile = { seedSql, expected: {columns, rows}, orderMatters?,
         caseInsensitive? }. The learner writes ONE SELECT. Default orderMatters:false (multiset)
         unless the lesson teaches ORDER BY. Include a referenceSolution SELECT + 2–4 hints.
       - L3/L4 (workspace): workspace = { seedSql, assertions: [{suite,name,sql,isHidden?}],
         checkIdempotency? }. Each assertion query returns the OFFENDING rows — zero rows = pass
         (dbt convention). Provide reference SQL that makes every assertion return 0 rows. Mark the
         tougher assertions isHidden:true.
  5. Register + verify: add the lesson to the right module in lib/tutorials/sql/curriculum/levelN/,
     run `pnpm typecheck`, then run it on the sql.js runner and confirm apply + practice are GREEN —
     the reference solution passes; a deliberately-wrong query fails; an empty-result answer grades
     right. Fix until green in this same iteration.
  6. Commit ONE lesson per iteration (commit as the user, no Claude co-author,
     `git -c commit.gpgsign=false commit`). Never re-author an existing lesson.

QUALITY BAR:
  - ANSI-portable SQLite-runnable SQL; every warehouse-only divergence flagged inline in the Read as
    an "In the warehouse this differs…" callout (per CONTENT.md).
  - Solvable-from-Read: a learner who read only this lesson's Read can pass its Apply.
  - Real data-engineering framing (raw_events, orders, customers, dim_date, staging/mart tables) —
    not toy pet-shop data. Reuse the shared seed-DB constant AGENT 1 handed off; keep seeds small.
  - No dead ends: working hints and a reference that actually passes.

STOP when every CONTENT.md lesson is authored, registered, and green, and `pnpm typecheck && pnpm
lint && pnpm test` are clean. Final report: lessons authored per level, and any deferred with why.
```

---

## Per-level Definition of Done
A level is done when every one of its lessons in `CONTENT.md` is authored + registered, `pnpm
typecheck && pnpm lint` are clean, and every lesson's Apply + Practice run **green** on the sql.js
runner (reference passes; wrong answer fails; empty-result grades correctly). Finish a level before
starting the next so the seed tables later levels depend on already exist.

## Terminal condition (when `/loop` ends)
Stop scheduling iterations when all 46 `CONTENT.md` lessons are authored + green and the three verify
commands are clean. Genuinely ambiguous scope on a lesson → STOP and ask the user.
