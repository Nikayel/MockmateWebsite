# AGENT 2 — Curriculum Developer (run with `/loop`)

> **HOW TO RUN THIS.** This spec is a self-paced **loop runbook**, started only AFTER Agent 1's
> Definition of Done is green and merged. In Claude Code:
>
> ```
> /loop author the next Python lesson by following docs/python-curriculum/AGENT-2-curriculum-developer.md
> ```
>
> `/loop` (no interval → dynamic, self-paced mode) re-enters this runbook each iteration. Every
> iteration authors **one lesson** (the next unchecked ticket), verifies it runs green, ticks the
> ticket, commits, and stops the loop only when **all tickets in CONTENT-TICKETS.md are checked**.

---

## LOOP CONTRACT — do this every iteration

1. **Re-orient.** Read this file, `ARCHITECTURE.md` (§1,4,5,10), and `CONTENT-TICKETS.md`. The
   ticket checkboxes in `CONTENT-TICKETS.md` are the shared progress tracker — state is derived
   from there + the curriculum files, so the loop is safe to re-enter anytime.
2. **Pick the next ticket.** The FIRST unchecked ticket, working a level top-to-bottom (L1→L4) so
   earlier topics exist before later ones depend on them.
3. **Author one lesson** for that ticket: `teach.markdown` (+ optional `demoCode`), the guided
   `apply` exercise, and the combined `practice` exercise — against the schema in ARCHITECTURE §10.
4. **Register + verify.** Add the `PythonLesson` to the right module in
   `lib/tutorials/curriculum/levelN/index.ts`. Run `pnpm typecheck`, then open the lesson in the
   Lesson Player and confirm Apply + Practice run **green** via `/api/execute` (the
   `referenceSolution`/reference files must pass). Fix until green in this same iteration.
5. **Commit + record.** Commit and push to the feature branch
   `claude/interactive-python-tutorial-levels-m2f3cc`, then tick the ticket's checkbox in
   `CONTENT-TICKETS.md` and commit that too.
6. **Decide continuation (the loop's control flow):**
   - Unchecked tickets remain → **continue looping**.
   - All tickets checked AND each level's lessons run green → **STOP THE LOOP** (terminal state).
   - Genuinely ambiguous scope on a ticket → **STOP and ask the user**.
7. **Idempotency.** Never re-author a checked ticket. Keep lesson/exercise ids globally unique
   (`py-l{N}-{slug}` / `-apply` / `-practice`).

### Terminal condition (when `/loop` ends)
Stop scheduling iterations when every ticket in `CONTENT-TICKETS.md` is checked, `pnpm typecheck
&& pnpm lint` are clean, and every lesson's Apply + Practice run green. Final report: lessons
authored per level, hours vs. target, and any tickets deferred (with why).

---

## Mission

Author the full ~40h Python curriculum — ~44 lessons across 4 levels — against the fixed schema,
and ship each through the existing Lesson Player. The machine already works (Agent 1 built it);
you fill it with great teaching. Study Agent 1's two sample lessons (single-file
`lib/tutorials/curriculum/level1/index.ts`, workspace `level3/index.ts`) as canonical examples.

## Quality bar (the product's whole value)

- **Modern Python:** f-strings, `pathlib`, comprehensions, `dataclasses`, type hints (L2+),
  `match` where natural; L3–L4 reflect real tooling — `pytest`, `pyproject.toml`, `uv`, `ruff`,
  `mypy`/`ty`, `pydantic`, `httpx`/`typer`, `asyncio`.
- **Solvable from Teach:** a learner who read only this lesson's Teach can pass its Apply.
- **Progressive difficulty:** match the ticket's `difficulty` and the level's audience (L1 =
  absolute beginners, tiny steps; L4 = senior-track depth).
- **Real-world framing for L3–L4:** "build/extend this module in a small project", not toy puzzles.
- **No dead ends:** working `hints[]` and a `referenceSolution`/reference files that actually pass.

## Authoring contract — single-file (L1, L2)
- Learner implements a **named function**; state the exact signature in `prompt`.
- `testCases[].input` is a **keyed object** (arg name → value); `expected` is the return value.
- Use `orderMatters:false` / `compareAsSet:true` when output order is irrelevant.
- Always include `referenceSolution` + 2–4 progressive `hints`. (Graded function = first `def`;
  avoid param names like `head/root/node/list` that auto-coerce to ListNode/TreeNode.)

## Authoring contract — workspace (L3, L4)
- Provide a complete `WorkspaceScenarioConfig`: editable `primaryFilePath`, ≥1 readonly support
  file, ≥1 visible test, ≥1 hidden test, and a `testRunnerPath`.
- The Python runner prints `print("__WORKSPACE_TEST_RESULTS__:" + json.dumps(results))` with each
  result `{ "suite", "name", "passed", "error", "isHidden"? }`. **Copy the runner** from an existing
  Python workspace scenario (e.g. `bugfix-bookclub-reading-streak-workspace.ts`,
  `bugfix-feature-pipeline-nan-workspace.ts`) — do not invent it. Re-frame "fix the bug" →
  "build/extend the module". Give it a `docs` README like a real ticket.

## Per-level Definition of Done
A level is done when every one of its tickets is checked + registered, `pnpm typecheck && pnpm
lint` are clean, every lesson's Apply + Practice run green, and the level's actual hours land
within ~15% of the `CONTENT-TICKETS.md` target. Finish a level before starting the next so the
designer can polish completed levels in parallel.

## Git rules (every iteration)
Work only on `claude/interactive-python-tutorial-levels-m2f3cc`; commit one lesson per iteration;
push to that branch (retry 4x); no `main`, no PR. Commit trailers (never mention model identity):
`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
`Claude-Session: https://claude.ai/code/session_01UpM3oBzVLsUZKSZ3B8doSt`
