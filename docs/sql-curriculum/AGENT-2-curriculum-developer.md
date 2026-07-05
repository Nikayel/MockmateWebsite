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
Dont forget to commit frequently maybe 20 to 40 commits are normal for this whole loop if you do more that still fine

---

